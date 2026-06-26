/**
 * Composant BudgetCharts - Tableaux de bord de pilotage budgétaire
 * Vue Stratégique : KPIs, atterrissage, répartition
 * Vue Opérationnelle : suivi mensuel, courbe de consommation, risques
 */

import { useState, useMemo } from 'react';
import { generateExecutiveReport } from '../../utils/executiveReportPDF';
import {
  PieChart, Pie, Cell,
  BarChart, Bar,
  Line,
  ComposedChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine, LabelList
} from 'recharts';
import { TrendingUp, TrendingDown, Target, AlertTriangle, BarChart3, Activity, FileDown, Clock, ListChecks, Layers, Hourglass } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';
import { COLORS, formatK, CustomTooltip } from '../../utils/chartUtils';
import { ORDER_IMPACT, ORDER_STATUS } from '../../constants/orderConstants';
import TreemapCategories, { CAT_PALETTE } from './TreemapCategories';

const MONTHS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

// ── Cycle de vie des commandes (ordre opérationnel) ───────────────────────────
const LIFECYCLE = [
  ORDER_STATUS.PENDING, ORDER_STATUS.ORDERED, ORDER_STATUS.DELIVERED,
  ORDER_STATUS.INVOICED, ORDER_STATUS.PAID,
];

// Couleur par statut pour le funnel pipeline
const STATUS_COLOR = {
  [ORDER_STATUS.PENDING]:   '#9ca3af',
  [ORDER_STATUS.ORDERED]:   '#3b82f6',
  [ORDER_STATUS.DELIVERED]: '#6366f1',
  [ORDER_STATUS.INVOICED]:  '#f59e0b',
  [ORDER_STATUS.PAID]:      '#22c55e',
};

// Actions à mener selon le statut (worklist) — date de référence pour l'ancienneté
const ACTION_BY_STATUS = {
  [ORDER_STATUS.PENDING]:   { label: 'À commander',            dateField: 'dateCommande',  badge: 'bg-gray-100 text-gray-700' },
  [ORDER_STATUS.ORDERED]:   { label: 'En attente de livraison', dateField: 'dateCommande',  badge: 'bg-blue-100 text-blue-700' },
  [ORDER_STATUS.DELIVERED]: { label: 'À facturer',             dateField: 'dateReception', badge: 'bg-indigo-100 text-indigo-700' },
  [ORDER_STATUS.INVOICED]:  { label: 'À payer',                dateField: 'dateFacture',   badge: 'bg-orange-100 text-orange-700' },
};

const parseDate = (s) => {
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
};
const daysBetween = (a, b) => Math.round((b - a) / 86_400_000);

/** KPI Card */
const KpiCard = ({ label, value, subtitle, icon: Icon, color = 'blue', trend }) => {
  const colorClasses = {
    blue:   'bg-blue-50 text-blue-700 border-blue-200',
    green:  'bg-green-50 text-green-700 border-green-200',
    orange: 'bg-orange-50 text-orange-700 border-orange-200',
    red:    'bg-red-50 text-red-700 border-red-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
    gray:   'bg-gray-50 text-gray-700 border-gray-200',
  };
  return (
    <div className={`rounded-lg border p-3 sm:p-4 ${colorClasses[color] || colorClasses.blue}`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs sm:text-sm font-medium opacity-80">{label}</span>
        {Icon && <Icon size={16} className="opacity-60" />}
      </div>
      <div className="text-lg sm:text-xl md:text-2xl font-bold">{value}</div>
      {subtitle && (
        <div className="text-xs mt-1 opacity-70 flex items-center gap-1">
          {trend === 'up' && <TrendingUp size={12} />}
          {trend === 'down' && <TrendingDown size={12} />}
          {subtitle}
        </div>
      )}
    </div>
  );
};

/** Donut OPEX ou CAPEX — taille agrandie */
const BudgetDonut = ({ label, depense, engagement, budget, color }) => {
  const disponible = Math.max(budget - depense - engagement, 0);
  const data = [
    { name: 'Dépensé',    value: depense,    fill: color === 'blue' ? '#3b82f6' : '#10b981' },
    { name: 'Engagé',     value: engagement, fill: color === 'blue' ? '#93c5fd' : '#6ee7b7' },
    { name: 'Disponible', value: disponible, fill: '#e5e7eb' },
  ].filter(d => d.value > 0);

  const taux = budget > 0 ? ((depense + engagement) / budget * 100).toFixed(1) : '—';
  const tauxColor = parseFloat(taux) > 90 ? 'text-red-600'
    : parseFloat(taux) > 75 ? 'text-orange-500'
    : 'text-green-600';

  return (
    <div className="flex flex-col items-center flex-1 min-w-[200px]">
      <p className="text-sm font-semibold text-gray-700 mb-2">{label}</p>
      <div className="relative">
        <PieChart width={220} height={180}>
          <Pie data={data} cx={110} cy={90} innerRadius={58} outerRadius={84} paddingAngle={2} dataKey="value" isAnimationActive={false}>
            {data.map((d, i) => <Cell key={i} fill={d.fill} />)}
          </Pie>
          <Tooltip formatter={(v) => formatCurrency(v)} wrapperStyle={{ fontSize: 12 }} />
        </PieChart>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          {budget > 0 ? (
            <>
              <span className={`text-xl font-bold ${tauxColor}`}>{taux}%</span>
              <span className="text-[10px] text-gray-400 font-medium">consommé</span>
            </>
          ) : (
            <>
              <span className="text-sm font-bold text-gray-400">Budget</span>
              <span className="text-[10px] text-gray-400 font-medium">non défini</span>
            </>
          )}
        </div>
      </div>
      <div className="text-xs text-gray-600 space-y-1 mt-1 text-center">
        <div className="flex items-center gap-2 justify-center">
          <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: color === 'blue' ? '#3b82f6' : '#10b981' }} />
          <span>Dépensé : <strong>{formatK(depense)}</strong></span>
        </div>
        <div className="flex items-center gap-2 justify-center">
          <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: color === 'blue' ? '#93c5fd' : '#6ee7b7' }} />
          <span>Engagé : <strong>{formatK(engagement)}</strong></span>
        </div>
        <div className="flex items-center gap-2 justify-center">
          <span className="w-2.5 h-2.5 rounded-sm inline-block bg-gray-200" />
          <span>Disponible : <strong className={disponible < 0 ? 'text-red-600' : 'text-green-600'}>{formatK(disponible)}</strong></span>
        </div>
        <div className={`mt-1 text-[11px] ${budget > 0 ? 'text-gray-400' : 'text-amber-500 font-medium'}`}>
          {budget > 0 ? `Budget : ${formatK(budget)}` : 'Budget à saisir dans la carte ci-dessous'}
        </div>
      </div>
    </div>
  );
};



// ── Composant principal ───────────────────────────────────────────────────────

export const BudgetCharts = ({
  opexTotals, capexTotals,
  consolidatedTotals = {},
  suppliers = [], projects = [],
  opexOrders = [], capexOrders = [],
  nbMoisRealises = 5,
  annee,
  eprd = [],
  view: viewProp,
  onViewChange,
}) => {
  const [viewInternal, setViewInternal] = useState('strategic');
  const view = viewProp ?? viewInternal;
  const setView = onViewChange ?? setViewInternal;

  // Dériver depuis nbMoisRealises (réactif au sélecteur)
  const monthsElapsed = Math.max(1, nbMoisRealises);
  const currentMonth  = monthsElapsed - 1; // 0-indexed

  // ── Données calculées ──────────────────────────────
  const computed = useMemo(() => {
    const totalBudget     = opexTotals.budget + capexTotals.budget;
    const totalDepense    = opexTotals.depense + capexTotals.depense;
    const totalEngagement = opexTotals.engagement + capexTotals.engagement;
    const totalConsomme   = totalDepense + totalEngagement;
    const totalDisponible = totalBudget - totalConsomme;
    const tauxGlobal      = totalBudget > 0 ? (totalConsomme / totalBudget) * 100 : 0;

    // Atterrissage linéaire basé sur nbMoisRealises
    const rythme           = monthsElapsed > 0 ? totalDepense / monthsElapsed : 0;
    const atterrissageTotal = rythme * 12 + totalEngagement;
    const atterrissageOpex  = monthsElapsed > 0
      ? (opexTotals.depense / monthsElapsed) * 12 + opexTotals.engagement
      : opexTotals.engagement;
    const atterrissageCapex = monthsElapsed > 0
      ? (capexTotals.depense / monthsElapsed) * 12 + capexTotals.engagement
      : capexTotals.engagement;

    // Commandes actives
    const activeOrders = [...opexOrders, ...capexOrders].filter(o =>
      ORDER_IMPACT[o.status] !== null && o.status !== 'Payée'
    );

    // OPEX par catégorie — trié par montant consommé décroissant
    const categoryMap = {};
    suppliers.forEach(s => {
      const cat = s.category || 'Autre';
      if (!categoryMap[cat]) categoryMap[cat] = { budget: 0, depense: 0, engagement: 0 };
      categoryMap[cat].budget     += s.budgetAnnuel || 0;
      categoryMap[cat].depense    += s.depenseActuelle || 0;
      categoryMap[cat].engagement += s.engagement || 0;
    });
    const categoryData = Object.entries(categoryMap)
      .map(([name, data]) => ({ name, ...data, consomme: data.depense + data.engagement }))
      .sort((a, b) => b.consomme - a.consomme);

    // CAPEX par catégorie — trié par montant consommé décroissant
    const capexCategoryMap = {};
    projects.forEach(p => {
      const cat = p.enveloppe || 'Autre';
      if (!capexCategoryMap[cat]) capexCategoryMap[cat] = { budget: 0, depense: 0, engagement: 0 };
      capexCategoryMap[cat].budget     += p.budgetTotal || 0;
      capexCategoryMap[cat].depense    += p.depense || 0;
      capexCategoryMap[cat].engagement += p.engagement || 0;
    });
    const capexCategoryData = Object.entries(capexCategoryMap)
      .map(([name, data]) => ({ name, ...data, consomme: data.depense + data.engagement }))
      .sort((a, b) => b.consomme - a.consomme);

    // ── Treemap hiérarchique : catégorie analytique → sous-catégorie ──────────
    const buildTreemapGroups = (items, getCat, getSub, getVal) => {
      const map = new Map();
      items.forEach(it => {
        const v = getVal(it);
        if (!(v > 0)) return;
        const cat = getCat(it) || 'Non classé';
        const sub = getSub(it) || 'Non classé';
        if (!map.has(cat)) map.set(cat, { name: cat, total: 0, subs: new Map() });
        const g = map.get(cat);
        g.total += v;
        g.subs.set(sub, (g.subs.get(sub) || 0) + v);
      });
      return [...map.values()]
        .sort((a, b) => b.total - a.total)
        .map((g, i) => ({
          name: g.name,
          total: Math.round(g.total),
          children: [...g.subs.entries()]
            .map(([name, size]) => ({
              name, size: Math.round(size),
              catName: g.name, fill: CAT_PALETTE[i % CAT_PALETTE.length],
            }))
            .sort((a, b) => b.size - a.size),
        }));
    };

    const opexTreemap = buildTreemapGroups(
      suppliers,
      s => s.familleAnalytique || s.category,
      s => s.category,
      s => (s.depenseActuelle || 0) + (s.engagement || 0),
    );
    const capexTreemap = buildTreemapGroups(
      projects,
      p => p.enveloppe || p.familleAnalytique,
      p => p.sousCategorie || p.libelleCompte || p.project,
      p => (p.depense || 0) + (p.engagement || 0),
    );

    // ── Agrégation mensuelle réelle depuis les dateReception des orders ─────
    // Utilise les vraies dates de réception plutôt qu'une répartition linéaire
    const currentYear = String(annee || new Date().getFullYear());
    const opexByMonth  = {};
    const capexByMonth = {};

    opexOrders.forEach(o => {
      const dr = String(o.dateReception || '');
      if (!dr.startsWith(currentYear)) return;
      const m = parseInt(dr.slice(5, 7), 10) - 1;
      if (m >= 0 && m <= 11) opexByMonth[m]  = (opexByMonth[m]  || 0) + Math.abs(o.montant || 0);
    });
    capexOrders.forEach(o => {
      const dr = String(o.dateReception || '');
      if (!dr.startsWith(currentYear)) return;
      const m = parseInt(dr.slice(5, 7), 10) - 1;
      if (m >= 0 && m <= 11) capexByMonth[m] = (capexByMonth[m] || 0) + Math.abs(o.montant || 0);
    });

    const hasRealData = Object.keys(opexByMonth).length > 0 || Object.keys(capexByMonth).length > 0;

    // Dernier mois ayant des données réelles
    const allDataMonths = [...Object.keys(opexByMonth), ...Object.keys(capexByMonth)].map(Number);
    const lastDataMonth = hasRealData ? Math.max(...allDataMonths) : currentMonth;

    const budgetMensuelOpex  = opexTotals.budget  / 12;
    const budgetMensuelCapex = capexTotals.budget  / 12;

    const monthlyData = MONTHS.map((name, i) => {
      const isPast    = hasRealData ? i <= lastDataMonth : i < monthsElapsed;
      const isCurrent = i === (hasRealData ? lastDataMonth : currentMonth);

      // Valeur réelle si disponible, sinon 0 (pas de simulation linéaire)
      const opexVal  = hasRealData ? (opexByMonth[i]  || 0) : (i < monthsElapsed ? opexTotals.depense  / monthsElapsed : 0);
      const capexVal = hasRealData ? (capexByMonth[i] || 0) : (i < monthsElapsed ? capexTotals.depense / monthsElapsed : 0);

      return {
        name, month: i, isPast, isCurrent,
        opex:           Math.round(opexVal),
        capex:          Math.round(capexVal),
        total:          Math.round(opexVal + capexVal),
        budgetLineaire: Math.round(budgetMensuelOpex + budgetMensuelCapex),
        budgetOpex:     Math.round(budgetMensuelOpex),
        budgetCapex:    Math.round(budgetMensuelCapex),
      };
    });

    // Données cumulées — forecast depuis le dernier mois avec données
    let cumulDepense = 0;
    let cumulBudget  = 0;
    // L'atterrissage (dépense + engagement) est le point d'arrivée cohérent avec le KPI "Reste à consommer"
    const monthsFromLastToEnd = 11 - lastDataMonth;
    const cumulativeData = monthlyData.map((m, i) => {
      if (m.isPast) cumulDepense += m.total;
      cumulBudget += m.budgetLineaire;
      // Prévision : interpolation linéaire entre le cumul réel et l'atterrissage (dépense+engagement)
      const isFuture = i > lastDataMonth;
      const forecastCumul = isFuture && monthsFromLastToEnd > 0
        ? cumulDepense + (atterrissageTotal - cumulDepense) * (i - lastDataMonth) / monthsFromLastToEnd
        : null;
      return {
        ...m,
        cumulDepense:      m.isPast ? Math.round(cumulDepense) : null,
        cumulBudget:       Math.round(cumulBudget),
        cumulForecast:     forecastCumul != null ? Math.round(Math.max(forecastCumul, 0)) : null,
        cumulDepensePoint: m.isCurrent ? Math.round(cumulDepense) : null,
      };
    });

    // Top risques — utilise le budget EPRD comme fallback si budgetAnnuel = 0
    const eprdMap = {};
    (eprd || []).forEach(e => { eprdMap[e.compteOrdonnateur] = e.budgetEPRD || 0; });

    // Construire un map budget par fournisseur via compte → EPRD
    // On prend la part proportionnelle de l'EPRD pour ce fournisseur
    const compteSuppliersCount = {};
    suppliers.forEach(s => {
      const c = s.compteOrdonnateur;
      if (c) compteSuppliersCount[c] = (compteSuppliersCount[c] || 0) + 1;
    });

    const riskItems = [
      ...suppliers.map(s => {
        const budgetDirect = s.budgetAnnuel || 0;
        const eprdForCompte = eprdMap[s.compteOrdonnateur] || 0;
        const nbSuppliers = compteSuppliersCount[s.compteOrdonnateur] || 1;
        const budget = budgetDirect > 0 ? budgetDirect : Math.round(eprdForCompte / nbSuppliers);
        const consomme = (s.depenseActuelle || 0) + (s.engagement || 0);
        return {
          name: s.supplier,
          type: 'OPEX',
          budget,
          consomme,
          taux: budget > 0 ? (consomme / budget) * 100 : 0,
        };
      }),
      ...projects.map(p => ({
        name: p.project,
        type: 'CAPEX',
        budget: p.budgetTotal || 0,
        consomme: (p.depense || 0) + (p.engagement || 0),
        taux: p.budgetTotal > 0 ? ((p.depense || 0) + (p.engagement || 0)) / p.budgetTotal * 100 : 0,
      })),
    ]
      .filter(r => r.budget > 0)
      .sort((a, b) => b.taux - a.taux)
      .slice(0, 5);

    return {
      totalBudget, totalDepense, totalEngagement, totalConsomme, totalDisponible, tauxGlobal,
      rythme, atterrissageTotal, atterrissageOpex, atterrissageCapex,
      activeOrders, categoryData, capexCategoryData, opexTreemap, capexTreemap, monthlyData, cumulativeData, riskItems,
    };
  }, [opexTotals, capexTotals, suppliers, projects, opexOrders, capexOrders, monthsElapsed, currentMonth, annee, eprd]);

  // ── Données opérationnelles (cycle de vie des commandes) ───────────────────
  const operational = useMemo(() => {
    const tagged = [
      ...opexOrders.map(o => ({ ...o, _flux: 'OPEX' })),
      ...capexOrders.map(o => ({ ...o, _flux: 'CAPEX' })),
    ].filter(o => o.status !== ORDER_STATUS.CANCELLED);

    // Date de référence : le mouvement le plus récent (ou aujourd'hui), pour des
    // anciennetés toujours positives même sur un exercice clôturé.
    const allTimes = [];
    tagged.forEach(o => [o.dateCommande, o.dateReception, o.dateFacture].forEach(d => {
      const p = parseDate(d); if (p) allTimes.push(p.getTime());
    }));
    const asOf = new Date(allTimes.length ? Math.max(Date.now(), ...allTimes) : Date.now());

    // 1. Pipeline par statut (funnel)
    const pipeline = LIFECYCLE.map(status => {
      const items = tagged.filter(o => o.status === status);
      return {
        status,
        count: items.length,
        montant: items.reduce((s, o) => s + (o.montant || 0), 0),
      };
    });

    // 2. Worklist — commandes nécessitant une action (hors Payée)
    const worklist = tagged
      .filter(o => ACTION_BY_STATUS[o.status])
      .map(o => {
        const cfg = ACTION_BY_STATUS[o.status];
        const ref = parseDate(o[cfg.dateField]) || parseDate(o.dateCommande);
        const age = ref ? daysBetween(ref, asOf) : null;
        return {
          id: o.id,
          name: o.designation || o.libelle || o.fournisseur || o.supplier || o.numeroCommande || '—',
          flux: o._flux,
          action: cfg.label,
          badge: cfg.badge,
          montant: o.montant || 0,
          age,
        };
      })
      .sort((a, b) => (b.age ?? -1) - (a.age ?? -1));

    const worklistSummary = Object.values(ACTION_BY_STATUS).reduce((acc, cfg) => {
      const rows = worklist.filter(w => w.action === cfg.label);
      acc[cfg.label] = { count: rows.length, montant: rows.reduce((s, w) => s + w.montant, 0) };
      return acc;
    }, {});

    // 3. Aging de l'engagé non reçu (statut « Commandée »)
    const buckets = [
      { label: '0–30 j',  min: 0,  max: 30,       color: '#22c55e' },
      { label: '30–60 j', min: 30, max: 60,       color: '#f59e0b' },
      { label: '60–90 j', min: 60, max: 90,       color: '#f97316' },
      { label: '> 90 j',  min: 90, max: Infinity, color: '#ef4444' },
    ].map(b => ({ ...b, montant: 0, count: 0 }));
    tagged.filter(o => o.status === ORDER_STATUS.ORDERED).forEach(o => {
      const ref = parseDate(o.dateCommande);
      const age = ref ? daysBetween(ref, asOf) : 0;
      const b = buckets.find(bk => age >= bk.min && age < bk.max) || buckets[buckets.length - 1];
      b.montant += o.montant || 0;
      b.count += 1;
    });
    const agingTotal = buckets.reduce((s, b) => s + b.montant, 0);

    // 4. Délais de traitement (cycle time)
    const cmdToRecep = [];
    const recepToFact = [];
    tagged.forEach(o => {
      const c = parseDate(o.dateCommande);
      const r = parseDate(o.dateReception);
      const f = parseDate(o.dateFacture);
      if (c && r && r >= c) cmdToRecep.push(daysBetween(c, r));
      if (r && f && f >= r) recepToFact.push(daysBetween(r, f));
    });
    const avg = (arr) => (arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : null);
    const cycle = {
      cmdToRecep: avg(cmdToRecep),  nCmdToRecep: cmdToRecep.length,
      recepToFact: avg(recepToFact), nRecepToFact: recepToFact.length,
    };
    cycle.total = (cycle.cmdToRecep != null || cycle.recepToFact != null)
      ? (cycle.cmdToRecep || 0) + (cycle.recepToFact || 0)
      : null;

    return { asOf, pipeline, worklist, worklistSummary, buckets, agingTotal, cycle };
  }, [opexOrders, capexOrders]);

  // ── RENDU ──────────────────────────────
  return (
    <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-5 gap-3">
        <h2 className="text-lg sm:text-xl font-bold text-gray-800">Pilotage Budgétaire</h2>
        <div className="flex items-center gap-2">
          {/* Rapport exécutif */}
          <button
            onClick={() => generateExecutiveReport({ opexTotals, capexTotals, suppliers, projects, eprd, nbMoisRealises, riskItems: computed.riskItems })}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors"
            title="Rapport Excel 2 feuilles pour DGA / DAF"
          >
            <FileDown size={14} />
            <span className="hidden sm:inline">Rapport exécutif</span>
          </button>
          {/* Toggle vue */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setView('strategic')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                view === 'strategic' ? 'bg-white shadow text-blue-700' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <BarChart3 size={14} />
              <span className="hidden sm:inline">Stratégique</span>
            </button>
            <button
              onClick={() => setView('operational')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                view === 'operational' ? 'bg-white shadow text-blue-700' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Activity size={14} />
              <span className="hidden sm:inline">Opérationnel</span>
            </button>
          </div>
        </div>
      </div>

      {/* ═══════════════ VUE STRATÉGIQUE ═══════════════ */}
      {view === 'strategic' && (
        <div className="space-y-6">

          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiCard
              label="Budget Total"
              value={formatK(computed.totalBudget)}
              subtitle={`OPEX ${formatK(opexTotals.budget)} + CAPEX ${formatK(capexTotals.budget)}`}
              icon={Target}
              color="blue"
            />
            <KpiCard
              label="Consommé"
              value={`${computed.tauxGlobal.toFixed(1)}%`}
              subtitle={formatCurrency(computed.totalConsomme)}
              icon={computed.tauxGlobal > 90 ? AlertTriangle : TrendingUp}
              color={computed.tauxGlobal > 90 ? 'red' : computed.tauxGlobal > 75 ? 'orange' : 'green'}
            />
            <KpiCard
              label="Atterrissage annuel"
              value={formatK(computed.atterrissageTotal)}
              subtitle={computed.atterrissageTotal > computed.totalBudget
                ? `Dépassement ${formatK(computed.atterrissageTotal - computed.totalBudget)}`
                : `Sous budget de ${formatK(computed.totalBudget - computed.atterrissageTotal)}`}
              icon={computed.atterrissageTotal > computed.totalBudget ? TrendingUp : TrendingDown}
              color={computed.atterrissageTotal > computed.totalBudget ? 'red' : 'green'}
              trend={computed.atterrissageTotal > computed.totalBudget ? 'up' : 'down'}
            />
            <KpiCard
              label="Disponible"
              value={formatK(computed.totalDisponible)}
              subtitle={`${(100 - computed.tauxGlobal).toFixed(1)}% restant`}
              icon={TrendingDown}
              color={computed.totalDisponible < 0 ? 'red' : 'green'}
            />
          </div>

          {/* Répartition OPEX vs CAPEX — 2 donuts séparés */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Répartition OPEX vs CAPEX</h3>
            <div className="flex flex-wrap gap-6 justify-around bg-gray-50 rounded-xl p-4 border border-gray-100">
              <BudgetDonut
                label="OPEX — Exploitation"
                depense={opexTotals.depense}
                engagement={opexTotals.engagement}
                budget={opexTotals.budget}
                color="blue"
              />
              <BudgetDonut
                label="CAPEX — Investissements"
                depense={capexTotals.depense}
                engagement={capexTotals.engagement}
                budget={capexTotals.budget}
                color="green"
              />
              {/* Légende commune */}
              <div className="flex flex-col gap-2 justify-center text-xs">
                {[
                  { color: '#3b82f6', label: 'OPEX Dépensé' },
                  { color: '#93c5fd', label: 'OPEX Engagé' },
                  { color: '#10b981', label: 'CAPEX Dépensé' },
                  { color: '#6ee7b7', label: 'CAPEX Engagé' },
                  { color: '#e5e7eb', label: 'Disponible' },
                ].map(({ color, label }) => (
                  <div key={label} className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: color }} />
                    <span className="text-gray-600">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Répartition par catégorie analytique → sous-catégorie (treemap) */}
          <TreemapCategories
            opexGroups={computed.opexTreemap}
            capexGroups={computed.capexTreemap}
          />
        </div>
      )}

      {/* ═══════════════ VUE OPÉRATIONNELLE ═══════════════ */}
      {view === 'operational' && (
        <div className="space-y-6">

          {/* KPIs Opérationnels */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiCard
              label="Mois en cours"
              value={MONTHS[Math.min(currentMonth, 11)]}
              subtitle={`${monthsElapsed}/12 mois écoulés`}
              icon={Target}
              color="purple"
            />
            <KpiCard
              label="Rythme mensuel"
              value={formatK(computed.rythme)}
              subtitle={`Cible : ${formatK(computed.totalBudget / 12)}/mois`}
              icon={computed.rythme > computed.totalBudget / 12 ? TrendingUp : TrendingDown}
              color={computed.rythme > computed.totalBudget / 12 ? 'orange' : 'green'}
            />
            <KpiCard
              label="Reste à consommer"
              value={formatK(Math.max(computed.totalDisponible, 0))}
              subtitle={`Sur ${12 - monthsElapsed} mois restants`}
              icon={TrendingDown}
              color="blue"
            />
            <KpiCard
              label="Commandes actives"
              value={computed.activeOrders.length}
              subtitle={formatCurrency(computed.activeOrders.reduce((s, o) => s + (o.montant || 0), 0))}
              icon={Activity}
              color="gray"
            />
          </div>

          {/* Pipeline des commandes + Délais de traitement */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Pipeline par statut (funnel) */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-1.5">
                <Layers size={15} className="text-gray-400" /> Pipeline des commandes par statut
              </h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={operational.pipeline} layout="vertical" margin={{ top: 4, right: 48, left: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tickFormatter={formatK} style={{ fontSize: '11px' }} />
                  <YAxis type="category" dataKey="status" width={78} style={{ fontSize: '11px' }} />
                  <Tooltip
                    formatter={(v, _n, p) => [`${formatCurrency(v)} · ${p.payload.count} cmd`, p.payload.status]}
                    wrapperStyle={{ fontSize: 12 }}
                  />
                  <Bar dataKey="montant" radius={[0, 4, 4, 0]}>
                    {operational.pipeline.map((e, i) => <Cell key={i} fill={STATUS_COLOR[e.status]} />)}
                    <LabelList dataKey="count" position="right" formatter={(v) => `${v} cmd`} style={{ fontSize: 10, fill: '#6b7280' }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <p className="mt-1 text-[10px] text-gray-400 italic leading-relaxed">
                Montant et nombre de commandes à chaque étape du cycle de vie (hors annulées). Repère où la valeur reste « bloquée ».
              </p>
            </div>

            {/* Délais de traitement (cycle time) */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-1.5">
                <Clock size={15} className="text-gray-400" /> Délais de traitement moyens
              </h3>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Commande → Réception', value: operational.cycle.cmdToRecep, n: operational.cycle.nCmdToRecep, color: 'blue' },
                  { label: 'Réception → Facture',  value: operational.cycle.recepToFact, n: operational.cycle.nRecepToFact, color: 'orange' },
                  { label: 'Total commande → facture', value: operational.cycle.total, n: null, color: 'purple' },
                ].map((s) => (
                  <div key={s.label} className={`rounded-lg border p-3 flex flex-col ${
                    { blue: 'bg-blue-50 border-blue-200', orange: 'bg-orange-50 border-orange-200', purple: 'bg-purple-50 border-purple-200' }[s.color]
                  }`}>
                    <span className="text-[11px] font-medium text-gray-600 leading-tight">{s.label}</span>
                    <span className={`text-2xl font-bold mt-auto ${
                      { blue: 'text-blue-700', orange: 'text-orange-700', purple: 'text-purple-700' }[s.color]
                    }`}>
                      {s.value != null ? s.value : '—'}
                      {s.value != null && <span className="text-xs font-medium ml-0.5">j</span>}
                    </span>
                    {s.n != null && <span className="text-[10px] text-gray-400 mt-0.5">{s.n} commande{s.n > 1 ? 's' : ''}</span>}
                  </div>
                ))}
              </div>
              <p className="mt-2 text-[10px] text-gray-400 italic leading-relaxed">
                Moyenne du nombre de jours entre étapes, sur les commandes disposant des deux dates. Identifie les goulots du process achat.
              </p>
            </div>
          </div>

          {/* Courbe de consommation cumulée */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">
              Consommation cumulée vs Budget linéaire
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={computed.cumulativeData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" style={{ fontSize: '11px' }} />
                <YAxis tickFormatter={formatK} style={{ fontSize: '11px' }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <ReferenceLine
                  y={computed.totalBudget}
                  stroke={COLORS.danger}
                  strokeDasharray="8 4"
                  label={{ value: 'Budget total', position: 'right', fontSize: 10, fill: COLORS.danger }}
                />
                <Area
                  type="monotone"
                  dataKey="cumulBudget"
                  name="Budget linéaire"
                  stroke={COLORS.budget}
                  fill={COLORS.budget}
                  fillOpacity={0.08}
                  strokeWidth={2}
                  strokeDasharray="5 5"
                />
                <Line
                  type="monotone"
                  dataKey="cumulDepense"
                  name="Consommation réelle"
                  stroke={COLORS.opex}
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: COLORS.opex }}
                  connectNulls={false}
                />
                <Line
                  type="monotone"
                  dataKey="cumulForecast"
                  name="Prévision"
                  stroke={COLORS.forecast}
                  strokeWidth={2}
                  strokeDasharray="6 3"
                  dot={false}
                  connectNulls={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Barres mensuelles OPEX / CAPEX */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">
              Dépenses mensuelles OPEX / CAPEX
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={computed.monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" style={{ fontSize: '11px' }} />
                <YAxis tickFormatter={formatK} style={{ fontSize: '11px' }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Bar dataKey="opex" name="OPEX" stackId="a" fill={COLORS.opex}>
                  {computed.monthlyData.map((entry, i) => (
                    <Cell key={i} fill={entry.isPast ? COLORS.opex : '#dbeafe'} />
                  ))}
                </Bar>
                <Bar dataKey="capex" name="CAPEX" stackId="a" fill={COLORS.capex} radius={[2, 2, 0, 0]}>
                  {computed.monthlyData.map((entry, i) => (
                    <Cell key={i} fill={entry.isPast ? COLORS.capex : '#d1fae5'} />
                  ))}
                </Bar>
                <Line
                  type="monotone"
                  dataKey="budgetLineaire"
                  name="Budget mensuel cible"
                  stroke={COLORS.budget}
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Worklist actions requises + Aging engagé non reçu + Projection */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Worklist — actions requises */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-1.5">
                <ListChecks size={15} className="text-gray-400" /> Actions requises
                <span className="text-xs font-normal text-gray-400 ml-1">(commandes en attente d&apos;action)</span>
              </h3>
              {operational.worklist.length > 0 ? (
                <>
                  {/* Résumé par action */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                    {Object.entries(operational.worklistSummary).map(([label, s]) => (
                      <div key={label} className="rounded-lg border border-gray-200 bg-gray-50 p-2">
                        <div className="text-[10px] text-gray-500 leading-tight">{label}</div>
                        <div className="text-sm font-bold text-gray-800">{s.count}</div>
                        <div className="text-[10px] text-gray-400">{formatK(s.montant)}</div>
                      </div>
                    ))}
                  </div>
                  <div className="overflow-hidden rounded-xl border border-gray-200">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-gray-50 text-gray-500 text-left">
                          <th className="px-3 py-2 font-semibold">Commande</th>
                          <th className="px-2 py-2 font-semibold">Action</th>
                          <th className="px-2 py-2 font-semibold text-right">Montant</th>
                          <th className="px-2 py-2 font-semibold text-right">Ancienneté</th>
                        </tr>
                      </thead>
                      <tbody>
                        {operational.worklist.slice(0, 8).map((w, i) => (
                          <tr key={w.id ?? i} className="border-t border-gray-100 hover:bg-gray-50">
                            <td className="px-3 py-2">
                              <div className="font-medium text-gray-800 truncate max-w-[150px]" title={w.name}>{w.name}</div>
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                w.flux === 'OPEX' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'
                              }`}>{w.flux}</span>
                            </td>
                            <td className="px-2 py-2">
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${w.badge}`}>{w.action}</span>
                            </td>
                            <td className="px-2 py-2 text-right font-semibold text-gray-800">{formatK(w.montant)}</td>
                            <td className={`px-2 py-2 text-right font-semibold ${
                              w.age == null ? 'text-gray-400' : w.age > 90 ? 'text-red-600' : w.age > 60 ? 'text-orange-500' : 'text-gray-600'
                            }`}>
                              {w.age == null ? '—' : `${w.age} j`}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="mt-2 text-[10px] text-gray-400 italic leading-relaxed">
                    Commandes hors « Payée » / « Annulée », triées par ancienneté. Ancienneté = jours depuis la date de l&apos;étape en cours (commande, réception ou facture), au {operational.asOf.toLocaleDateString('fr-FR')}.
                  </p>
                </>
              ) : (
                <p className="text-sm text-gray-400 italic">Aucune commande en attente d&apos;action.</p>
              )}
            </div>

            {/* Aging de l'engagé non reçu */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-1.5">
                <Hourglass size={15} className="text-gray-400" /> Aging de l&apos;engagé non reçu
              </h3>
              {operational.agingTotal > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={210}>
                    <BarChart data={operational.buckets} margin={{ top: 18, right: 12, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="label" style={{ fontSize: '11px' }} />
                      <YAxis tickFormatter={formatK} style={{ fontSize: '11px' }} />
                      <Tooltip
                        formatter={(v, _n, p) => [`${formatCurrency(v)} · ${p.payload.count} cmd`, 'Engagé non reçu']}
                        wrapperStyle={{ fontSize: 12 }}
                      />
                      <Bar dataKey="montant" radius={[4, 4, 0, 0]}>
                        {operational.buckets.map((b, i) => <Cell key={i} fill={b.color} />)}
                        <LabelList dataKey="count" position="top" formatter={(v) => (v ? `${v} cmd` : '')} style={{ fontSize: 10, fill: '#6b7280' }} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                  <p className="mt-1 text-[10px] text-gray-400 italic leading-relaxed">
                    Montant des commandes « Commandée » (engagé non encore reçu) par ancienneté depuis la date de commande. Les tranches &gt; 60 j signalent des engagements à relancer ou solder. Total : <strong className="text-gray-600">{formatCurrency(operational.agingTotal)}</strong>.
                  </p>
                </>
              ) : (
                <p className="text-sm text-gray-400 italic">Aucun engagement non reçu en cours.</p>
              )}
            </div>

            {/* Projection des abonnements récurrents */}
            <div className="lg:col-span-2">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">
                Projection abonnements récurrents
                <span className="text-xs font-normal text-gray-400 ml-1">(Top 8 OPEX par rythme mensuel)</span>
              </h3>
              {(() => {
                const abonnements = [...suppliers]
                  .filter(s => (s.depenseActuelle || 0) > 0)
                  .map(s => {
                    const mensuel = (s.depenseActuelle || 0) / monthsElapsed;
                    const projecAnnuelle = mensuel * 12;
                    const eprdForCompte = (eprd || []).find(e => e.compteOrdonnateur === s.compteOrdonnateur)?.budgetEPRD || 0;
                    const nbSup = suppliers.filter(x => x.compteOrdonnateur === s.compteOrdonnateur).length || 1;
                    const budget = (s.budgetAnnuel || 0) > 0 ? s.budgetAnnuel : Math.round(eprdForCompte / nbSup);
                    const ecart = projecAnnuelle - budget;
                    return { name: s.supplier, mensuel, projecAnnuelle, budget, ecart };
                  })
                  .sort((a, b) => b.mensuel - a.mensuel)
                  .slice(0, 8);

                if (!abonnements.length) {
                  return <p className="text-sm text-gray-400 italic">Aucune donnée OPEX disponible.</p>;
                }

                return (
                  <>
                    <div className="overflow-hidden rounded-xl border border-gray-200">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-gray-50 text-gray-500 text-left">
                            <th className="px-3 py-2 font-semibold">Fournisseur</th>
                            <th className="px-2 py-2 font-semibold text-right">Rythme / mois</th>
                            <th className="px-2 py-2 font-semibold text-right">Projection 12 mois</th>
                            <th className="px-2 py-2 font-semibold text-right">Écart vs budget</th>
                          </tr>
                        </thead>
                        <tbody>
                          {abonnements.map((a, i) => (
                            <tr key={i} className="border-t border-gray-100 hover:bg-gray-50">
                              <td className="px-3 py-2 font-medium text-gray-800 truncate max-w-[150px]" title={a.name}>{a.name}</td>
                              <td className="px-2 py-2 text-right text-gray-600">{formatK(Math.round(a.mensuel))}</td>
                              <td className="px-2 py-2 text-right font-semibold text-gray-800">{formatK(Math.round(a.projecAnnuelle))}</td>
                              <td className={`px-2 py-2 text-right font-semibold ${
                                a.budget === 0 ? 'text-gray-400' : a.ecart > 0 ? 'text-red-600' : 'text-green-600'
                              }`}>
                                {a.budget === 0 ? '—' : `${a.ecart > 0 ? '+' : ''}${formatK(Math.round(a.ecart))}`}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <p className="mt-2 text-[10px] text-gray-400 italic leading-relaxed">
                      Rythme / mois = <span className="font-medium">dépense actuelle</span> du fournisseur divisée par le nombre de mois écoulés.
                      Projection 12 mois = rythme mensuel × 12. Écart vs budget = projection − <span className="font-medium">budgetAnnuel</span> du fournisseur,
                      ou budget EPRD du compte ordonnateur réparti équitablement entre ses fournisseurs s&apos;il n&apos;est pas renseigné.
                    </p>
                  </>
                );
              })()}
            </div>
          </div>

          {/* Consolidé DSI — résumé sous le pilotage */}
          <div className="border-t border-gray-100 pt-4">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Budget consolidé DSI</h3>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Total dépensé',   value: consolidatedTotals.depense    || 0, color: 'orange' },
                { label: 'Total engagé',    value: consolidatedTotals.engagement || 0, color: 'yellow' },
                { label: 'Total disponible',value: consolidatedTotals.disponible || 0, color: 'green'  },
              ].map(k => (
                <div key={k.label} className={`rounded-lg border p-3 bg-${k.color}-50 border-${k.color}-200`}>
                  <p className={`text-xs text-${k.color}-700 font-medium mb-0.5`}>{k.label}</p>
                  <p className={`text-base font-bold text-${k.color}-800`}>{formatK(k.value)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
