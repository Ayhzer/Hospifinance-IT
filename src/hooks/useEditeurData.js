import { useMemo } from 'react';
import { orderAmounts } from '../utils/yearCalculations';
const MOIS_LABELS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

const normalizeNom = (s) => (s || '').trim().toLowerCase().replace(/\s+/g, ' ');

const getYear = (o) => {
  if (o.exercice && /^\d{4}$/.test(String(o.exercice))) return Number(o.exercice);
  const d = o.dateCommande || o.datePassation || o.dateImputation || '';
  if (!d) return null;
  const m = String(d).match(/^(\d{4})/);
  return m ? Number(m[1]) : null;
};

const getQuarterNum = (o) => {
  const d = o.dateCommande || o.datePassation || o.dateImputation || '';
  if (!d) return null;
  const parsed = new Date(d);
  if (isNaN(parsed)) return null;
  return Math.floor(parsed.getMonth() / 3) + 1;
};

const getMonthIndex = (o) => {
  const d = o.dateCommande || o.datePassation || o.dateImputation || '';
  if (!d) return null;
  const parsed = new Date(d);
  return isNaN(parsed) ? null : parsed.getMonth();
};

const detectRecurrence = (orders) => {
  // Groupe par (année, trimestre) → liste des montants
  const byYearQ = new Map();
  orders.forEach(o => {
    const year = getYear(o);
    const q = getQuarterNum(o);
    if (!year || !q) return;
    const key = `${year}-Q${q}`;
    if (!byYearQ.has(key)) byYearQ.set(key, []);
    byYearQ.get(key).push(o.montant || 0);
  });

  // Pour chaque trimestre récurrent (même Q, montant ±15% sur 2+ années), marquer les commandes
  const recurringRefs = new Set();
  const quarterGroups = new Map(); // "Q1" → [{ year, montant }]
  byYearQ.forEach((_v, key) => {
    const [, q] = key.split('-');
    if (!quarterGroups.has(q)) quarterGroups.set(q, []);
  });

  // Cherche les montants similaires d'un même trimestre sur plusieurs années
  byYearQ.forEach((montants, key) => {
    const [yearStr, q] = key.split('-');
    const yearTotal = montants.reduce((s, m) => s + m, 0);
    if (!quarterGroups.has(q)) quarterGroups.set(q, []);
    quarterGroups.get(q).push({ year: Number(yearStr), total: yearTotal, key });
  });

  quarterGroups.forEach((yearEntries) => {
    if (yearEntries.length < 2) return;
    yearEntries.sort((a, b) => a.year - b.year);
    for (let i = 1; i < yearEntries.length; i++) {
      const prev = yearEntries[i - 1].total;
      const curr = yearEntries[i].total;
      if (prev > 0 && Math.abs(curr - prev) / prev <= 0.20) {
        recurringRefs.add(yearEntries[i - 1].key);
        recurringRefs.add(yearEntries[i].key);
      }
    }
  });

  return recurringRefs;
};

const buildEditeursFromData = (rawData) => {
  if (!rawData) return { editeurs: [], totalGlobal: 0 };

  const { opexSuppliers = [], opexOrders = [], capexProjects = [], capexOrders = [] } = rawData;

  // Lookup maps
  const supplierById = new Map(opexSuppliers.map(s => [String(s.id), s]));
  const projectById  = new Map(capexProjects.map(p => [String(p.id), p]));

  const map = new Map(); // normalizedNom → éditeur aggregate

  const getOrCreate = (nom) => {
    const key = normalizeNom(nom);
    if (!map.has(key)) {
      map.set(key, {
        key,
        nom: nom.trim(),
        types: new Set(),
        allOrders: [],
        compteSet: new Set(),
      });
    }
    return map.get(key);
  };

  opexOrders.forEach(o => {
    const sup = supplierById.get(String(o.parentId));
    const nom = sup?.supplier || `Fournisseur #${o.parentId}`;
    const e = getOrCreate(nom);
    e.types.add('opex');
    e.allOrders.push({ ...o, _type: 'opex' });
    if (o.compteOrdonnateur) e.compteSet.add(o.compteOrdonnateur);
  });

  capexOrders.forEach(o => {
    const proj = projectById.get(String(o.parentId));
    const nom = proj?.fournisseur || proj?.project || proj?.nom || `Projet #${o.parentId}`;
    const e = getOrCreate(nom);
    e.types.add('capex');
    e.allOrders.push({ ...o, _type: 'capex' });
    if (o.compteOrdonnateur) e.compteSet.add(o.compteOrdonnateur);
  });

  const editeurs = [];

  map.forEach((e) => {
    const orders = e.allOrders;
    const total  = orders.reduce((s, o) => s + (o.montant || 0), 0);
    if (total === 0 && orders.length === 0) return;

    // OPEX / CAPEX split
    const opexMontant  = orders.filter(o => o._type === 'opex').reduce((s, o) => s + (o.montant || 0), 0);
    const capexMontant = orders.filter(o => o._type === 'capex').reduce((s, o) => s + (o.montant || 0), 0);

    // By year
    const byYear = {};
    orders.forEach(o => {
      const y = getYear(o);
      if (!y) return;
      if (!byYear[y]) byYear[y] = { montant: 0, opex: 0, capex: 0, orders: [] };
      byYear[y].montant += o.montant || 0;
      byYear[y][o._type] += o.montant || 0;
      byYear[y].orders.push(o);
    });

    const years = Object.keys(byYear).map(Number).sort();

    // By quarter key "YYYY-QN"
    const byQuarter = {};
    orders.forEach(o => {
      const y = getYear(o);
      const q = getQuarterNum(o);
      if (!y || !q) return;
      const k = `${y}-Q${q}`;
      if (!byQuarter[k]) byQuarter[k] = { year: y, quarter: q, label: `Q${q} ${y}`, montant: 0, opex: 0, capex: 0, orders: [] };
      byQuarter[k].montant += o.montant || 0;
      byQuarter[k][o._type] += o.montant || 0;
      byQuarter[k].orders.push(o);
    });

    // By semester key "YYYY-SN"
    const bySemester = {};
    orders.forEach(o => {
      const y = getYear(o);
      const q = getQuarterNum(o);
      if (!y || !q) return;
      const s = q <= 2 ? 1 : 2;
      const k = `${y}-S${s}`;
      if (!bySemester[k]) bySemester[k] = { year: y, sem: s, label: `S${s} ${y}`, montant: 0, opex: 0, capex: 0, orders: [] };
      bySemester[k].montant += o.montant || 0;
      bySemester[k][o._type] += o.montant || 0;
      bySemester[k].orders.push(o);
    });

    // By compte
    const byCompte = {};
    orders.forEach(o => {
      const c = o.compteOrdonnateur || 'Inconnu';
      if (!byCompte[c]) byCompte[c] = {
        compte: c,
        libelle: o.libelleCompte || o.category || c,
        montant: 0, opex: 0, capex: 0, orders: [],
      };
      byCompte[c].montant += o.montant || 0;
      byCompte[c][o._type] += o.montant || 0;
      byCompte[c].orders.push(o);
    });

    // Monthly seasonality (aggregate across all years, normalized by nb years with data)
    const seasonalityRaw = Array(12).fill(0);
    const seasonalityYears = new Set();
    orders.forEach(o => {
      const m = getMonthIndex(o);
      const y = getYear(o);
      if (m !== null && y) {
        seasonalityRaw[m] += o.montant || 0;
        seasonalityYears.add(y);
      }
    });
    const nbYears = seasonalityYears.size || 1;
    const seasonality = seasonalityRaw.map((montant, i) => ({
      month: i + 1,
      label: MOIS_LABELS[i],
      montant,
      montantMoyen: montant / nbYears,
    }));

    // Heatmap: year × month
    const heatmapYears = [...years];
    const heatmap = heatmapYears.map(y => ({
      year: y,
      months: Array(12).fill(0).map((_, m) => {
        const monthOrders = orders.filter(o => getYear(o) === y && getMonthIndex(o) === m);
        return monthOrders.reduce((s, o) => s + (o.montant || 0), 0);
      }),
    }));

    // CAGR
    let cagr = null;
    if (years.length >= 2) {
      const first = byYear[years[0]].montant;
      const last  = byYear[years[years.length - 1]].montant;
      const n     = years[years.length - 1] - years[0];
      if (first > 0 && n > 0) cagr = Math.pow(last / first, 1 / n) - 1;
    }

    // Récurrence
    const recurringQuarterKeys = detectRecurrence(orders);

    // Alerte renouvellement: cherche la dernière occurrence récurrente et projette N+1 ans
    let alerteRenouvellement = null;
    if (recurringQuarterKeys.size > 0) {
      const lastYearData = byYear[years[years.length - 1]];
      if (lastYearData) {
        const lastOrder = [...lastYearData.orders]
          .filter(o => o.dateCommande)
          .sort((a, b) => (b.dateCommande || '').localeCompare(a.dateCommande || ''))[0];
        if (lastOrder?.dateCommande) {
          const renewal = new Date(lastOrder.dateCommande);
          renewal.setFullYear(renewal.getFullYear() + 1);
          const today  = new Date();
          const diffMs = renewal - today;
          const diffDays = Math.round(diffMs / 86400000);
          if (diffDays >= -30 && diffDays <= 120) {
            alerteRenouvellement = { date: renewal.toISOString().split('T')[0], daysLeft: diffDays };
          }
        }
      }
    }

    // Multi-comptes alerte
    const comptesArray = [...e.compteSet];
    const hasMultiComptes = comptesArray.length > 1;

    // Ratio engagement / mandaté
    const totalMandated  = orders.reduce((s, o) => s + (o.montantMandated ?? orderAmounts(o).realise), 0);
    const ratioEngagement = total > 0 && totalMandated > 0 ? totalMandated / total : null;

    editeurs.push({
      key:      e.key,
      nom:      e.nom,
      types:    [...e.types],
      comptes:  comptesArray,
      total,
      opexMontant,
      capexMontant,
      byYear,
      byQuarter,
      bySemester,
      byCompte,
      years,
      cagr,
      seasonality,
      heatmap,
      orderCount: orders.length,
      allOrders: orders,
      recurringQuarterKeys,
      hasRecurrence: recurringQuarterKeys.size > 0,
      alerteRenouvellement,
      hasMultiComptes,
      ratioEngagement,
    });
  });

  editeurs.sort((a, b) => b.total - a.total);

  const totalGlobal = editeurs.reduce((s, e) => s + e.total, 0);

  // Pareto
  let cumul = 0;
  editeurs.forEach(e => {
    cumul += e.total;
    e.pctTotal    = totalGlobal > 0 ? (e.total / totalGlobal) * 100 : 0;
    e.cumulPct    = totalGlobal > 0 ? (cumul / totalGlobal) * 100 : 0;
    e.scoreDep    = e.pctTotal;
    e.inPareto80  = e.cumulPct <= 80;
  });

  return { editeurs, totalGlobal };
};

// ── Hook principal ────────────────────────────────────────────────────────────
// Calcul pur — ne gère pas son propre import.
// Les données viennent de useOpexData / useCapexData / useOrderData via App.jsx.

export const useEditeurData = (suppliers = [], opexOrders = [], projects = [], capexOrders = []) => {
  const { editeurs, totalGlobal } = useMemo(
    () => buildEditeursFromData({
      opexSuppliers:  suppliers,
      opexOrders,
      capexProjects:  projects,
      capexOrders,
    }),
    [suppliers, opexOrders, projects, capexOrders]
  );

  const years = useMemo(() => {
    const set = new Set();
    [...opexOrders, ...capexOrders].forEach(o => { const y = getYear(o); if (y) set.add(y); });
    return [...set].sort();
  }, [opexOrders, capexOrders]);

  return { editeurs, totalGlobal, years };
};

