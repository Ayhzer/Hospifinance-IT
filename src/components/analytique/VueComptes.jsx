import { useMemo, useState, useEffect } from 'react';
import { ChevronRight, ChevronDown, Table2, Layers, Calendar, TrendingUp, TrendingDown, Minus, BarChart3, LineChart as LineIcon } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { formatCurrency } from '../../utils/formatters';
import { calculateChargeEngagee, getAlertLevelDSI } from '../../utils/calculations';
import { normalizeCompte, buildEprdMap } from '../../utils/compte';
import { detectComptesOrphelins } from '../../utils/anomaliesUtils';
import {
  listExercices, suppliersForYear, projectsForYear, ordersForYear, getOrderYear, orderAmounts,
} from '../../utils/yearCalculations';

const fmt = (n) => formatCurrency(n ?? 0);
const pct = (n) => n === 0 ? '—' : `${n.toFixed(1)} %`;

// Une ligne de compte est « vide » si aucune activité ni budget
const isCompteVide = (r) =>
  (r.charge || 0) === 0 && (r.mandaté || 0) === 0 && (r.engNonRec || 0) === 0 && (r.budgetEPRD || 0) === 0;

// Détermine semestre + trimestre à partir d'une date "YYYY-MM-DD"
const getTrimestre = (dateStr) => {
  const m = parseInt((dateStr || '').slice(5, 7), 10);
  if (!m) return null;
  if (m <= 3)  return { sem: 'S1', tri: 'T1', triLabel: 'Jan – Mar' };
  if (m <= 6)  return { sem: 'S1', tri: 'T2', triLabel: 'Avr – Jun' };
  if (m <= 9)  return { sem: 'S2', tri: 'T3', triLabel: 'Jul – Sep' };
  return       { sem: 'S2', tri: 'T4', triLabel: 'Oct – Déc' };
};

// Construit l'arbre semestres à partir d'une liste de commandes
const buildSemestres = (orders) => {
  const s = { S1: { T1: [], T2: [] }, S2: { T3: [], T4: [] } };
  orders.forEach(o => {
    const date = o.dateCommande || o.dateReception || '';
    const info = getTrimestre(date);
    if (info) s[info.sem][info.tri].push(o);
  });
  return s;
};

const STATUS_STYLE = {
  Payée:     'bg-green-100 text-green-700',
  Facturée:  'bg-blue-100 text-blue-700',
  Commandée: 'bg-amber-100 text-amber-700',
  Livrée:    'bg-indigo-100 text-indigo-700',
  Annulée:   'bg-gray-100 text-gray-400',
  Soldée:    'bg-green-100 text-green-700',
};

// ── Niveau 4 : commandes ──────────────────────────────────────────────────────

const CommandesList = ({ orders }) => {
  if (!orders.length) return (
    <div className="px-6 py-2 text-xs text-gray-400 italic">Aucune commande.</div>
  );
  const sorted = [...orders].sort((a, b) =>
    (b.dateCommande || b.dateReception || '').localeCompare(a.dateCommande || a.dateReception || '')
  );
  const total = sorted.reduce((s, o) => s + Math.abs(o.montant || 0), 0);
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="bg-gray-100 text-gray-500">
            <th className="px-4 py-1.5 text-left border-b font-medium">Référence</th>
            <th className="px-3 py-1.5 text-left border-b font-medium">Désignation</th>
            <th className="px-3 py-1.5 text-left border-b font-medium">Date</th>
            <th className="px-3 py-1.5 text-center border-b font-medium">Statut</th>
            <th className="px-3 py-1.5 text-right border-b font-medium">Montant</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((o, i) => (
            <tr key={o.id || i} className="border-b border-gray-100 hover:bg-gray-50">
              <td className="px-4 py-1.5 font-mono text-gray-400">{o.reference || '—'}</td>
              <td className="px-3 py-1.5 text-gray-700 max-w-[220px] truncate" title={o.description}>{o.description || '—'}</td>
              <td className="px-3 py-1.5 text-gray-500">{o.dateCommande || o.dateReception || '—'}</td>
              <td className="px-3 py-1.5 text-center">
                <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-medium ${STATUS_STYLE[o.status] || 'bg-gray-100 text-gray-500'}`}>
                  {o.status || '—'}
                </span>
              </td>
              <td className="px-3 py-1.5 text-right font-semibold text-gray-700">{fmt(Math.abs(o.montant || 0))}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-gray-50 border-t font-semibold">
            <td colSpan={4} className="px-4 py-1.5 text-xs text-gray-600">
              {sorted.length} commande{sorted.length > 1 ? 's' : ''}
            </td>
            <td className="px-3 py-1.5 text-right text-xs text-indigo-700">{fmt(total)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
};

// ── Niveau 3 : trimestre ──────────────────────────────────────────────────────

const TrimestreSection = ({ tri, triLabel, orders, color }) => {
  const [open, setOpen] = useState(false);
  const total = orders.reduce((s, o) => s + Math.abs(o.montant || 0), 0);
  if (!orders.length) return null;
  return (
    <div>
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-gray-50 transition-colors text-left"
      >
        {open
          ? <ChevronDown  size={10} className={`ml-10 flex-shrink-0 ${color.accent}`} />
          : <ChevronRight size={10} className="ml-10 flex-shrink-0 text-gray-300" />}
        <Calendar size={10} className={`${color.accent} flex-shrink-0`} />
        <span className={`font-bold text-[11px] ${color.accent}`}>{tri}</span>
        <span className="text-gray-400">{triLabel}</span>
        <span className="ml-auto text-gray-400 text-[10px] mr-2">{orders.length} cmd</span>
        <span className={`w-28 text-right font-semibold text-[11px] ${color.accent}`}>{fmt(total)}</span>
      </button>
      {open && (
        <div className="ml-8 border-l border-dashed border-gray-200">
          <CommandesList orders={orders} />
        </div>
      )}
    </div>
  );
};

// ── Niveau 2 : semestre ───────────────────────────────────────────────────────

const SemestreSection = ({ sem, trimesters, color }) => {
  const [open, setOpen] = useState(false);
  const TRI_META = { T1: 'Jan – Mar', T2: 'Avr – Jun', T3: 'Jul – Sep', T4: 'Oct – Déc' };
  const triKeys = sem === 'S1' ? ['T1', 'T2'] : ['T3', 'T4'];
  const allOrders = triKeys.flatMap(t => trimesters[t] || []);
  if (!allOrders.length) return null;
  const total = allOrders.reduce((s, o) => s + Math.abs(o.montant || 0), 0);
  return (
    <div className="border-t border-gray-100">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-indigo-50/30 transition-colors text-left"
      >
        {open
          ? <ChevronDown  size={11} className={`ml-4 flex-shrink-0 ${color.accent}`} />
          : <ChevronRight size={11} className="ml-4 flex-shrink-0 text-gray-300" />}
        <span className={`font-bold ${color.accent}`}>{sem}</span>
        <span className="text-gray-400">{sem === 'S1' ? 'Jan – Jun' : 'Jul – Déc'}</span>
        <span className="ml-auto text-gray-400 text-[10px] mr-2">{allOrders.length} cmd</span>
        <span className={`w-28 text-right font-semibold ${color.accent}`}>{fmt(total)}</span>
      </button>
      {open && (
        <div className="ml-2">
          {triKeys.map(tri => (
            <TrimestreSection
              key={tri}
              tri={tri}
              triLabel={TRI_META[tri]}
              orders={trimesters[tri] || []}
              color={color}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// ── Couleurs thématiques ──────────────────────────────────────────────────────

const OPEX_COLOR  = { accent: 'text-indigo-600' };

// ── Tableau OPEX avec drilldown ───────────────────────────────────────────────

function TableauOPEX({ suppliers, eprd, opexOrders }) {
  const [sortField, setSortField] = useState('compte');
  const [sortDir,   setSortDir]   = useState('asc');
  const [openCompte, setOpenCompte] = useState(null);

  const eprdMap = useMemo(() => buildEprdMap(eprd), [eprd]);

  const ordersBySupplier = useMemo(() => {
    const map = {};
    opexOrders.forEach(o => {
      if (o.parentId == null) return;
      const k = String(o.parentId);
      if (!map[k]) map[k] = [];
      map[k].push(o);
    });
    return map;
  }, [opexOrders]);

  const rows = useMemo(() => {
    const map = new Map();
    suppliers.forEach(s => {
      const compte = normalizeCompte(s.compteOrdonnateur);
      if (!compte) return;
      const eprdEntry  = eprdMap[compte];
      const budgetEPRD = eprdEntry?.budgetEPRD || s.budgetAnnuel || 0;
      const libelle    = eprdEntry?.libelleCompte || s.category || compte;
      const mandaté    = s.depenseActuelle || 0;
      const engNonRec  = s.engagement || 0;
      const charge     = calculateChargeEngagee(mandaté, engNonRec);
      const sOrders    = ordersBySupplier[String(s.id)] || [];

      if (!map.has(compte)) {
        map.set(compte, { compte, libelle, budgetEPRD, mandaté: 0, engNonRec: 0, charge: 0, nbFourn: 0, orders: [] });
      }
      const grp = map.get(compte);
      grp.budgetEPRD = Math.max(grp.budgetEPRD, budgetEPRD);
      grp.mandaté   += mandaté;
      grp.engNonRec += engNonRec;
      grp.charge    += charge;
      grp.nbFourn   += 1;
      grp.orders.push(...sOrders);
    });

    return [...map.values()]
      .map(r => ({
        ...r,
        semestres: buildSemestres(r.orders),
        taux:  r.budgetEPRD > 0 ? (r.charge / r.budgetEPRD) * 100 : 0,
        reste: r.budgetEPRD - r.charge,
      }))
      .filter(r => !isCompteVide(r))
      .sort((a, b) => {
        const va = a[sortField] ?? '', vb = b[sortField] ?? '';
        const c = typeof va === 'string' ? va.localeCompare(vb) : va - vb;
        return sortDir === 'asc' ? c : -c;
      });
  }, [suppliers, eprdMap, ordersBySupplier, sortField, sortDir]);

  const totaux = useMemo(() => ({
    budgetEPRD: rows.reduce((s, r) => s + r.budgetEPRD, 0),
    mandaté:    rows.reduce((s, r) => s + r.mandaté, 0),
    engNonRec:  rows.reduce((s, r) => s + r.engNonRec, 0),
    charge:     rows.reduce((s, r) => s + r.charge, 0),
  }), [rows]);

  const sortHeader = (field, label, align = 'text-right') => (
    <span
      className={`${align} cursor-pointer select-none hover:text-indigo-700 whitespace-nowrap`}
      onClick={() => { setSortField(field); setSortDir(d => field === sortField ? (d === 'asc' ? 'desc' : 'asc') : 'desc'); }}
    >
      {label}{sortField === field ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''}
    </span>
  );

  if (rows.length === 0) return <p className="text-xs text-gray-400 italic">Aucun compte OPEX.</p>;

  // Grid columns: expand | compte | libellé | EPRD | mandaté | engagé n.r. | charge | taux | reste
  const grid = 'grid gap-x-3 text-xs items-center';
  const cols = 'grid-cols-[16px_120px_1fr_96px_96px_84px_96px_60px_96px]';

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
      {/* Header */}
      <div className={`${grid} ${cols} px-3 py-2.5 bg-gray-50 border-b border-gray-200 font-semibold text-gray-500 uppercase tracking-wide text-[10px]`}>
        <span />
        {sortHeader('compte',    'Compte',    'text-left')}
        <span>Libellé</span>
        {sortHeader('budgetEPRD','EPRD')}
        {sortHeader('mandaté',   'Mandaté')}
        {sortHeader('engNonRec', 'Engagé n.r.')}
        {sortHeader('charge',    'Charge')}
        {sortHeader('taux',      'Taux')}
        {sortHeader('reste',     'Reste')}
      </div>

      {/* Lignes */}
      {rows.map(r => {
        const taux   = r.budgetEPRD > 0 ? r.charge / r.budgetEPRD * 100 : 0;
        const reste  = r.budgetEPRD - r.charge;
        const alerte = getAlertLevelDSI(taux);
        const isOpen = openCompte === r.compte;
        const hasOrders = r.orders.length > 0;
        return (
          <div key={r.compte} className="border-b border-gray-100 last:border-0">
            <div
              className={`${grid} ${cols} px-3 py-2 cursor-pointer hover:bg-indigo-50/30 transition-colors ${
                alerte === 'critique' ? 'bg-red-50' : alerte === 'surveiller' ? 'bg-orange-50/50' : ''
              }`}
              onClick={() => hasOrders && setOpenCompte(isOpen ? null : r.compte)}
            >
              <span className="flex items-center">
                {hasOrders
                  ? isOpen
                    ? <ChevronDown  size={12} className="text-indigo-500" />
                    : <ChevronRight size={12} className="text-gray-300" />
                  : null}
              </span>
              <span className="font-mono text-gray-500 font-medium truncate" title={r.compte}>{r.compte}</span>
              <span className="text-gray-700 truncate" title={r.libelle}>{r.libelle}</span>
              <span className="text-right text-gray-600">{r.budgetEPRD > 0 ? fmt(r.budgetEPRD) : '—'}</span>
              <span className="text-right text-indigo-700 font-semibold">{fmt(r.mandaté)}</span>
              <span className="text-right text-amber-700">{fmt(r.engNonRec)}</span>
              <span className="text-right font-bold text-gray-800">{fmt(r.charge)}</span>
              <span className={`text-right ${
                taux >= 100 ? 'text-red-700 font-bold' : taux >= 85 ? 'text-red-500 font-semibold' : taux >= 50 ? 'text-orange-500' : 'text-green-600'
              }`}>{r.budgetEPRD > 0 ? pct(taux) : '—'}</span>
              <span className={`text-right ${reste < 0 ? 'text-red-600 font-bold' : 'text-green-700'}`}>
                {r.budgetEPRD > 0 ? fmt(reste) : '—'}
              </span>
            </div>
            {isOpen && hasOrders && (
              <div className="border-t border-indigo-100 ml-4 bg-indigo-50/20">
                {['S1', 'S2'].map(sem => (
                  <SemestreSection key={sem} sem={sem} trimesters={r.semestres[sem]} color={OPEX_COLOR} />
                ))}
              </div>
            )}
          </div>
        );
      })}

      {/* Total */}
      <div className={`${grid} ${cols} px-3 py-3 bg-indigo-600 text-white font-bold text-xs`}>
        <span /><span className="col-span-2">TOTAL OPEX</span>
        <span className="text-right">{totaux.budgetEPRD > 0 ? fmt(totaux.budgetEPRD) : '—'}</span>
        <span className="text-right">{fmt(totaux.mandaté)}</span>
        <span className="text-right">{fmt(totaux.engNonRec)}</span>
        <span className="text-right">{fmt(totaux.charge)}</span>
        <span className="text-right">{totaux.budgetEPRD > 0 ? pct(totaux.charge / totaux.budgetEPRD * 100) : '—'}</span>
        <span className="text-right">{totaux.budgetEPRD > 0 ? fmt(totaux.budgetEPRD - totaux.charge) : '—'}</span>
      </div>
    </div>
  );
}

// ── Tableau CAPEX avec drilldown par compte ordonnateur ──────────────────────

function TableauCAPEX({ projects, capexOrders, eprd, capexBudgetGlobal = 0 }) {
  const [sortField, setSortField] = useState('compte');
  const [sortDir,   setSortDir]   = useState('asc');
  const [openCompte, setOpenCompte] = useState(null);

  const eprdMap = useMemo(() => buildEprdMap(eprd), [eprd]);

  const ordersByProject = useMemo(() => {
    const map = {};
    capexOrders.forEach(o => {
      if (o.parentId == null) return;
      const k = String(o.parentId);
      if (!map[k]) map[k] = [];
      map[k].push(o);
    });
    return map;
  }, [capexOrders]);

  const rows = useMemo(() => {
    const map = new Map();
    projects.forEach(p => {
      const compte = normalizeCompte(p.compteOrdonnateur);
      if (!compte) return;
      const eprdEntry  = eprdMap[compte];
      const budgetEPRD = eprdEntry?.budgetEPRD || p.budgetTotal || p.budgetAlloue || 0;
      const mandaté    = p.depense || 0;
      const engNonRec  = p.engagement || 0;
      const charge     = calculateChargeEngagee(mandaté, engNonRec);
      const pOrders    = ordersByProject[String(p.id)] || [];

      if (!map.has(compte)) {
        // Libellé : EPRD > libelleCompte du projet > compte code
        const libelleCompte = eprdEntry?.libelleCompte || p.libelleCompte || compte;
        map.set(compte, { compte, libelle: libelleCompte, budgetEPRD: 0, budgetProjets: 0, mandaté: 0, engNonRec: 0, charge: 0, nbProjets: 0, orders: [], projets: [] });
      }
      const grp = map.get(compte);
      if (eprdEntry && budgetEPRD > grp.budgetEPRD) {
        grp.budgetEPRD = budgetEPRD;
      } else {
        grp.budgetProjets += (p.budgetTotal || p.budgetAlloue || 0);
      }
      grp.mandaté   += mandaté;
      grp.engNonRec += engNonRec;
      grp.charge    += charge;
      grp.nbProjets += 1;
      grp.orders.push(...pOrders);
      grp.projets.push({ id: p.id, nom: p.fournisseur || p.project || compte, mandaté, engNonRec, charge });
    });

    const rawRows = [...map.values()].map(r => ({
      ...r,
      budgetEPRD: r.budgetEPRD > 0 ? r.budgetEPRD : r.budgetProjets,
      semestres: buildSemestres(r.orders),
    })).filter(r => (r.charge || 0) !== 0 || (r.mandaté || 0) !== 0 || (r.engNonRec || 0) !== 0 || (r.budgetEPRD || 0) > 0);

    // Fallback : si aucun budget par compte, distribuer capexBudgetGlobal pro rata de la charge
    const totalBudgetRows = rawRows.reduce((s, r) => s + r.budgetEPRD, 0);
    if (totalBudgetRows === 0 && capexBudgetGlobal > 0) {
      const totalCharge = rawRows.reduce((s, r) => s + r.charge, 0);
      rawRows.forEach(r => {
        r.budgetEPRD = totalCharge > 0
          ? Math.round(r.charge / totalCharge * capexBudgetGlobal)
          : Math.round(capexBudgetGlobal / rawRows.length);
      });
    }

    return rawRows
      .map(r => ({
        ...r,
        taux:  r.budgetEPRD > 0 ? (r.charge / r.budgetEPRD) * 100 : 0,
        reste: r.budgetEPRD - r.charge,
      }))
      .sort((a, b) => {
        const va = a[sortField] ?? '', vb = b[sortField] ?? '';
        const c = typeof va === 'string' ? va.localeCompare(vb) : va - vb;
        return sortDir === 'asc' ? c : -c;
      });
  }, [projects, eprdMap, ordersByProject, sortField, sortDir, capexBudgetGlobal]);

  const totaux = useMemo(() => ({
    budgetEPRD: rows.reduce((s, r) => s + r.budgetEPRD, 0),
    mandaté:    rows.reduce((s, r) => s + r.mandaté, 0),
    engNonRec:  rows.reduce((s, r) => s + r.engNonRec, 0),
    charge:     rows.reduce((s, r) => s + r.charge, 0),
  }), [rows]);

  const sortHeader = (field, label, align = 'text-right') => (
    <span
      className={`${align} cursor-pointer select-none hover:text-emerald-700 whitespace-nowrap`}
      onClick={() => { setSortField(field); setSortDir(d => field === sortField ? (d === 'asc' ? 'desc' : 'asc') : 'desc'); }}
    >
      {label}{sortField === field ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''}
    </span>
  );

  if (rows.length === 0) return <p className="text-xs text-gray-400 italic">Aucun compte CAPEX.</p>;

  // Grid columns: expand | compte | libellé | EPRD | mandaté | engagé n.r. | charge | taux | reste
  const grid = 'grid gap-x-3 text-xs items-center';
  const cols = 'grid-cols-[16px_120px_1fr_96px_96px_84px_96px_60px_96px]';

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
      {/* Header */}
      <div className={`${grid} ${cols} px-3 py-2.5 bg-gray-50 border-b border-gray-200 font-semibold text-gray-500 uppercase tracking-wide text-[10px]`}>
        <span />
        {sortHeader('compte',    'Compte',    'text-left')}
        <span>Libellé</span>
        {sortHeader('budgetEPRD','Budget')}
        {sortHeader('mandaté',   'Mandaté')}
        {sortHeader('engNonRec', 'Engagé n.r.')}
        {sortHeader('charge',    'Charge')}
        {sortHeader('taux',      'Taux')}
        {sortHeader('reste',     'Reste')}
      </div>

      {/* Lignes */}
      {rows.map(r => {
        const taux   = r.budgetEPRD > 0 ? r.charge / r.budgetEPRD * 100 : 0;
        const reste  = r.budgetEPRD - r.charge;
        const alerte = getAlertLevelDSI(taux);
        const isOpen    = openCompte === r.compte;
        const canExpand = r.projets.length > 0;
        return (
          <div key={r.compte} className="border-b border-gray-100 last:border-0">
            <div
              className={`${grid} ${cols} px-3 py-2 cursor-pointer hover:bg-emerald-50/30 transition-colors ${
                alerte === 'critique' ? 'bg-red-50' : alerte === 'surveiller' ? 'bg-orange-50/50' : ''
              }`}
              onClick={() => canExpand && setOpenCompte(isOpen ? null : r.compte)}
            >
              <span className="flex items-center">
                {canExpand
                  ? isOpen
                    ? <ChevronDown  size={12} className="text-emerald-500" />
                    : <ChevronRight size={12} className="text-gray-300" />
                  : null}
              </span>
              <span className="font-mono text-gray-500 font-medium truncate" title={r.compte}>{r.compte}</span>
              <span className="text-gray-700 truncate" title={r.libelle}>{r.libelle}</span>
              <span className="text-right text-gray-600">{r.budgetEPRD > 0 ? fmt(r.budgetEPRD) : '—'}</span>
              <span className="text-right text-emerald-700 font-semibold">{fmt(r.mandaté)}</span>
              <span className="text-right text-amber-700">{fmt(r.engNonRec)}</span>
              <span className="text-right font-bold text-gray-800">{fmt(r.charge)}</span>
              <span className={`text-right ${
                taux >= 100 ? 'text-red-700 font-bold' : taux >= 85 ? 'text-red-500 font-semibold' : taux >= 50 ? 'text-orange-500' : 'text-green-600'
              }`}>{r.budgetEPRD > 0 ? pct(taux) : '—'}</span>
              <span className={`text-right ${reste < 0 ? 'text-red-600 font-bold' : 'text-green-700'}`}>
                {r.budgetEPRD > 0 ? fmt(reste) : '—'}
              </span>
            </div>
            {isOpen && canExpand && (
              <div className="border-t border-emerald-100 bg-emerald-50/20">
                <table className="w-full text-xs border-collapse ml-4">
                  <thead>
                    <tr className="text-[10px] text-gray-400 uppercase tracking-wide border-b border-emerald-100">
                      <th className="text-left px-4 py-1.5 pl-8">Fournisseur / Projet</th>
                      <th className="text-right px-3 py-1.5">Mandaté</th>
                      <th className="text-right px-3 py-1.5">Engagé n.r.</th>
                      <th className="text-right px-3 py-1.5">Charge</th>
                    </tr>
                  </thead>
                  <tbody>
                    {r.projets.sort((a, b) => b.charge - a.charge).map(p => (
                      <tr key={p.id} className="border-b border-emerald-50 hover:bg-emerald-50/40">
                        <td className="px-4 py-1.5 pl-8 text-gray-700 truncate max-w-[300px]" title={p.nom}>{p.nom}</td>
                        <td className="px-3 py-1.5 text-right text-emerald-700">{fmt(p.mandaté)}</td>
                        <td className="px-3 py-1.5 text-right text-amber-600">{fmt(p.engNonRec)}</td>
                        <td className="px-3 py-1.5 text-right font-semibold text-gray-700">{fmt(p.charge)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}

      {/* Total */}
      <div className={`${grid} ${cols} px-3 py-3 bg-emerald-700 text-white font-bold text-xs`}>
        <span /><span className="col-span-2">TOTAL CAPEX</span>
        <span className="text-right">{totaux.budgetEPRD > 0 ? fmt(totaux.budgetEPRD) : '—'}</span>
        <span className="text-right">{fmt(totaux.mandaté)}</span>
        <span className="text-right">{fmt(totaux.engNonRec)}</span>
        <span className="text-right">{fmt(totaux.charge)}</span>
        <span className="text-right">{totaux.budgetEPRD > 0 ? pct(totaux.charge / totaux.budgetEPRD * 100) : '—'}</span>
        <span className="text-right">{totaux.budgetEPRD > 0 ? fmt(totaux.budgetEPRD - totaux.charge) : '—'}</span>
      </div>
    </div>
  );
}

// ── Évolution annuelle par compte ─────────────────────────────────────────────

/**
 * Construit l'évolution de la charge engagée par compte et par exercice.
 * charge = mandateNet + engagementNonRecu (cohérent avec aggregateByParentForYear).
 */
const buildEvolution = (entities, orders, exercices, eprdMap) => {
  const compteById = {};
  entities.forEach(e => { if (e.id != null) compteById[String(e.id)] = normalizeCompte(e.compteOrdonnateur); });

  const map = new Map();
  orders.forEach(o => {
    const compte = compteById[String(o.parentId)];
    if (!compte) return;
    const y = getOrderYear(o);
    if (!y) return;
    const a = orderAmounts(o);
    const charge = a.depense + a.engagement;
    if (!map.has(compte)) map.set(compte, { compte, byYear: {} });
    const g = map.get(compte);
    g.byYear[y] = (g.byYear[y] || 0) + charge;
  });

  return [...map.values()]
    .map(g => ({
      ...g,
      libelle: eprdMap[g.compte]?.libelleCompte || g.compte,
      total: exercices.reduce((s, y) => s + (g.byYear[y] || 0), 0),
    }))
    .filter(g => g.total !== 0)
    .sort((a, b) => b.total - a.total);
};

const VarBadge = ({ value }) => {
  if (value == null) return <span className="text-gray-300">—</span>;
  const flat = Math.abs(value) < 0.5;
  const up = value > 0;
  const Icon = flat ? Minus : up ? TrendingUp : TrendingDown;
  // Hausse de charge = défavorable (rouge), baisse = favorable (vert)
  const color = flat ? 'text-gray-400' : up ? 'text-red-600' : 'text-green-600';
  return (
    <span className={`inline-flex items-center gap-0.5 font-semibold ${color}`}>
      <Icon size={11} />{up ? '+' : ''}{value.toFixed(0)}%
    </span>
  );
};

const fmtKc = (v) => {
  const a = Math.abs(v);
  if (a >= 1_000_000) return `${(v / 1_000_000).toFixed(1)} M€`;
  if (a >= 1_000) return `${Math.round(v / 1_000)} k€`;
  return `${Math.round(v)} €`;
};

const EVO_PALETTE = [
  '#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b',
  '#ef4444', '#ec4899', '#84cc16', '#f97316', '#3b82f6', '#9ca3af',
];

function EvolutionChart({ rows, exercices, topN = 8 }) {
  const { data, series } = useMemo(() => {
    const top  = rows.slice(0, topN);
    const rest = rows.slice(topN);
    const restByYear = exercices.reduce((acc, y) => {
      acc[y] = rest.reduce((s, r) => s + (r.byYear[y] || 0), 0);
      return acc;
    }, {});
    const d = exercices.map(y => {
      const row = { annee: y };
      top.forEach(r => { row[r.compte] = Math.round(r.byYear[y] || 0); });
      if (rest.length) row._autres = Math.round(restByYear[y] || 0);
      return row;
    });
    const s = top.map(r => ({ key: r.compte, name: `${r.compte} · ${r.libelle}` }));
    if (rest.length) s.push({ key: '_autres', name: `Autres (${rest.length} comptes)` });
    return { data: d, series: s };
  }, [rows, exercices, topN]);

  if (!rows.length) return <p className="text-xs text-gray-400 italic">Aucune donnée pluriannuelle pour ce flux.</p>;

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
      <ResponsiveContainer width="100%" height={380}>
        <LineChart data={data} margin={{ top: 8, right: 16, left: 8, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="annee" tick={{ fontSize: 11 }} />
          <YAxis tickFormatter={fmtKc} tick={{ fontSize: 10 }} />
          <Tooltip formatter={(v, name) => [fmt(v), name]} wrapperStyle={{ fontSize: 11 }} itemSorter={(i) => -i.value} />
          <Legend wrapperStyle={{ fontSize: 10 }} />
          {series.map((s, i) => (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.name}
              stroke={EVO_PALETTE[i % EVO_PALETTE.length]}
              strokeWidth={s.key === '_autres' ? 1.5 : 2}
              strokeDasharray={s.key === '_autres' ? '5 4' : undefined}
              dot={{ r: 2 }}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
      <p className="mt-1 text-[11px] text-gray-400 italic">
        Charge engagée par exercice — {topN} comptes les plus importants{rows.length > topN ? ' + agrégat « Autres »' : ''}.
      </p>
    </div>
  );
}

function EvolutionTable({ rows, exercices, accent }) {
  if (!rows.length) return <p className="text-xs text-gray-400 italic">Aucune donnée pluriannuelle pour ce flux.</p>;

  const headBg   = accent === 'emerald' ? 'bg-emerald-700' : 'bg-indigo-700';
  const totalBg  = accent === 'emerald' ? 'bg-emerald-700' : 'bg-indigo-700';
  const valColor = accent === 'emerald' ? 'text-emerald-700' : 'text-indigo-700';
  const last = exercices[exercices.length - 1];
  const prev = exercices[exercices.length - 2];

  const totalsByYear = exercices.map(y => rows.reduce((s, r) => s + (r.byYear[y] || 0), 0));
  const variation = (cur, pre) => (pre ? ((cur - pre) / pre) * 100 : null);

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm overflow-x-auto">
      <table className="w-full text-xs border-collapse min-w-[640px]">
        <thead>
          <tr className={`${headBg} text-white text-[11px]`}>
            <th className="text-left px-3 py-2.5">Compte</th>
            <th className="text-left px-3 py-2.5">Libellé</th>
            {exercices.map(y => <th key={y} className="text-right px-3 py-2.5 whitespace-nowrap">{y}</th>)}
            <th className="text-right px-3 py-2.5 whitespace-nowrap">{prev ? `${prev}→${last}` : 'Var.'}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.compte} className={`border-b border-gray-100 ${i % 2 ? 'bg-gray-50/60' : 'bg-white'} hover:bg-indigo-50/40`}>
              <td className="px-3 py-2 font-mono text-gray-500 whitespace-nowrap">{r.compte}</td>
              <td className="px-3 py-2 text-gray-700 truncate max-w-[220px]" title={r.libelle}>{r.libelle}</td>
              {exercices.map(y => (
                <td key={y} className={`px-3 py-2 text-right ${r.byYear[y] ? 'text-gray-700' : 'text-gray-300'}`}>
                  {r.byYear[y] ? fmt(r.byYear[y]) : '—'}
                </td>
              ))}
              <td className="px-3 py-2 text-right">
                <VarBadge value={variation(r.byYear[last] || 0, r.byYear[prev] || 0)} />
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className={`${totalBg} text-white font-bold`}>
            <td className="px-3 py-2.5" colSpan={2}>TOTAL ({rows.length} comptes)</td>
            {totalsByYear.map((t, i) => <td key={i} className="px-3 py-2.5 text-right">{fmt(t)}</td>)}
            <td className="px-3 py-2.5 text-right">
              <VarBadge value={variation(totalsByYear[exercices.length - 1], totalsByYear[exercices.length - 2])} />
            </td>
          </tr>
        </tfoot>
      </table>
      <p className="px-3 py-2 bg-gray-50 border-t border-gray-100 text-[11px] text-gray-500">
        Charge engagée (mandaté + engagé non reçu) par exercice. Variation = {prev || 'N-1'} → {last}. Comptes vides masqués. <span className={valColor}>↑</span> hausse de charge.
      </p>
    </div>
  );
}

// ── Composant principal ───────────────────────────────────────────────────────

export default function VueComptes({ suppliers = [], projects = [], eprd = [], opexOrders = [], capexOrders = [], capexBudgetGlobal = 0 }) {
  const [subTab, setSubTab] = useState('detail'); // 'detail' | 'evolution'
  const [evolView, setEvolView] = useState('graph'); // 'graph' | 'table'

  // ── Exercices disponibles + sélecteur d'année ──────────────────────────────
  const exercices = useMemo(() => {
    const found = listExercices(opexOrders, capexOrders);
    const current = String(new Date().getFullYear());
    return found.length ? found : [current];
  }, [opexOrders, capexOrders]);
  const exercicesAsc = useMemo(() => [...exercices].sort((a, b) => a.localeCompare(b)), [exercices]);

  const [annee, setAnnee] = useState(() => exercices[0] || String(new Date().getFullYear()));
  useEffect(() => {
    if (exercices.length > 0 && !exercices.includes(annee)) setAnnee(exercices[0]);
  }, [exercices, annee]);

  // ── Données recalculées pour l'exercice sélectionné (onglet Détail) ────────
  const suppliersF   = useMemo(() => suppliersForYear(suppliers, opexOrders, annee),   [suppliers, opexOrders, annee]);
  const projectsF    = useMemo(() => projectsForYear(projects, capexOrders, annee),    [projects, capexOrders, annee]);
  const opexOrdersF  = useMemo(() => ordersForYear(opexOrders, annee),  [opexOrders, annee]);
  const capexOrdersF = useMemo(() => ordersForYear(capexOrders, annee), [capexOrders, annee]);

  const eprdMap = useMemo(() => buildEprdMap(eprd), [eprd]);

  // Nombre de comptes NON vides pour l'exercice
  const countComptesNonVides = (entities, getDep, getEng) => {
    const m = new Map();
    entities.forEach(e => {
      const c = normalizeCompte(e.compteOrdonnateur); if (!c) return;
      const charge = calculateChargeEngagee(getDep(e), getEng(e));
      const prevv = m.get(c) || { charge: 0, budget: 0 };
      prevv.charge += charge;
      prevv.budget = Math.max(prevv.budget, eprdMap[c]?.budgetEPRD || 0);
      m.set(c, prevv);
    });
    return [...m.values()].filter(v => v.charge !== 0 || v.budget > 0).length;
  };

  const opexCount  = useMemo(() => countComptesNonVides(suppliersF, s => s.depenseActuelle || 0, s => s.engagement || 0), [suppliersF, eprdMap]); // eslint-disable-line react-hooks/exhaustive-deps
  const capexCount = useMemo(() => countComptesNonVides(projectsF, p => p.depense || 0, p => p.engagement || 0), [projectsF, eprdMap]); // eslint-disable-line react-hooks/exhaustive-deps
  const opexTotal  = useMemo(() => suppliersF.reduce((s, r) => s + calculateChargeEngagee(r.depenseActuelle || 0, r.engagement || 0), 0), [suppliersF]);
  const capexTotal = useMemo(() => projectsF.reduce((s, p) => s + calculateChargeEngagee(p.depense || 0, p.engagement || 0), 0), [projectsF]);

  // ── Évolution annuelle par compte (onglet Évolution) ───────────────────────
  const opexEvolution  = useMemo(() => buildEvolution(suppliers, opexOrders, exercicesAsc, eprdMap),  [suppliers, opexOrders, exercicesAsc, eprdMap]);
  const capexEvolution = useMemo(() => buildEvolution(projects, capexOrders, exercicesAsc, eprdMap),  [projects, capexOrders, exercicesAsc, eprdMap]);

  const SUB_TABS = [
    { id: 'detail',    label: 'Détail par compte', icon: Table2 },
    { id: 'evolution', label: 'Évolution annuelle', icon: TrendingUp },
  ];

  // ── Réconciliation : comptes non appariés réel ↔ budget EPRD ───────────────
  const orphelins = useMemo(
    () => detectComptesOrphelins(suppliers, projects, eprd),
    [suppliers, projects, eprd]
  );
  const sansBudget = orphelins.filter(o => o.regle === 'B1');
  const sansActivite = orphelins.filter(o => o.regle === 'B2');

  return (
    <div className="space-y-6 p-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-xl font-bold text-gray-800">Par comptes ordonnateurs</h2>
        <div className="flex items-center gap-2">
          {/* Sélecteur d'exercice (onglet Détail) */}
          {subTab === 'detail' && (
            <div className="flex items-center gap-2 bg-white border border-indigo-300 rounded-lg px-3 py-1.5">
              <Calendar size={13} className="text-indigo-500" />
              <span className="text-xs font-semibold text-indigo-700">Exercice</span>
              <select
                value={annee}
                onChange={e => setAnnee(e.target.value)}
                className="bg-transparent text-xs font-bold text-indigo-800 focus:outline-none cursor-pointer"
              >
                {exercices.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          )}
          <span className="text-xs bg-gray-100 text-gray-600 border border-gray-200 px-3 py-1 rounded-full">
            {opexCount} comptes OPEX · {capexCount} comptes CAPEX
          </span>
        </div>
      </div>

      {/* Bandeau de réconciliation des comptes */}
      {orphelins.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="text-amber-800">
              <p className="font-semibold mb-1">Réconciliation des comptes à vérifier</p>
              <ul className="list-disc pl-5 space-y-0.5 text-xs">
                {sansBudget.length > 0 && (
                  <li>
                    <strong>{sansBudget.length}</strong> compte(s) avec activité <strong>sans budget EPRD</strong> :{' '}
                    <span className="font-mono">{sansBudget.slice(0, 6).map(o => o.compte).join(', ')}{sansBudget.length > 6 ? '…' : ''}</span>
                  </li>
                )}
                {sansActivite.length > 0 && (
                  <li>
                    <strong>{sansActivite.length}</strong> budget(s) EPRD <strong>sans activité</strong> :{' '}
                    <span className="font-mono">{sansActivite.slice(0, 6).map(o => o.compte).join(', ')}{sansActivite.length > 6 ? '…' : ''}</span>
                  </li>
                )}
              </ul>
            </div>
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('hospifinance:open-budget'))}
              className="shrink-0 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded-lg"
            >
              Renseigner le budget
            </button>
          </div>
        </div>
      )}

      {/* Sous-onglets */}
      <div className="inline-flex flex-wrap gap-1 bg-gray-100 p-1 rounded-xl">
        {SUB_TABS.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setSubTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${
                subTab === tab.id ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-600 hover:bg-white hover:text-gray-900'
              }`}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {subTab === 'detail' ? (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 flex items-center gap-4">
              <Table2 size={22} className="text-indigo-500 shrink-0" />
              <div>
                <div className="text-xs text-indigo-600 font-medium uppercase tracking-wide">Total OPEX engagé — {annee}</div>
                <div className="text-xl font-bold text-indigo-800">{fmt(opexTotal)}</div>
              </div>
            </div>
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-4">
              <Layers size={22} className="text-emerald-500 shrink-0" />
              <div>
                <div className="text-xs text-emerald-600 font-medium uppercase tracking-wide">Total CAPEX engagé — {annee}</div>
                <div className="text-xl font-bold text-emerald-800">{fmt(capexTotal)}</div>
              </div>
            </div>
          </div>

          {/* Tableau OPEX */}
          <section>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-0.5 rounded text-xs font-bold bg-indigo-100 text-indigo-700">OPEX</span>
              <h3 className="text-sm font-semibold text-gray-700">Comptes comptables OPEX</h3>
              <span className="text-xs text-gray-400">({opexCount} compte{opexCount > 1 ? 's' : ''} actif{opexCount > 1 ? 's' : ''})</span>
            </div>
            <TableauOPEX suppliers={suppliersF} eprd={eprd} opexOrders={opexOrdersF} />
          </section>

          {/* Tableau CAPEX */}
          <section>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-0.5 rounded text-xs font-bold bg-emerald-100 text-emerald-700">CAPEX</span>
              <h3 className="text-sm font-semibold text-gray-700">Comptes comptables CAPEX</h3>
              <span className="text-xs text-gray-400">({capexCount} compte{capexCount > 1 ? 's' : ''} actif{capexCount > 1 ? 's' : ''})</span>
            </div>
            <TableauCAPEX projects={projectsF} capexOrders={capexOrdersF} eprd={eprd} capexBudgetGlobal={capexBudgetGlobal} />
          </section>

          {/* Légende */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs text-gray-500 flex flex-wrap gap-4">
            <span><span className="font-semibold text-indigo-700">Mandaté</span> = montant mandaté net</span>
            <span><span className="font-semibold text-amber-700">Engagé n.r.</span> = engagé non reçu</span>
            <span><span className="font-semibold">Charge</span> = mandaté + engagé n.r.</span>
            <span className="text-gray-400">Comptes vides masqués · cliquer sur une ligne → détail semestre / trimestre / commandes</span>
          </div>
        </>
      ) : (
        <>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className="text-xs text-gray-500">
              Évolution de la charge engagée par compte sur {exercicesAsc[0]} → {exercicesAsc[exercicesAsc.length - 1]}.
            </p>
            {/* Bascule Graphique / Tableau */}
            <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs font-medium">
              {[
                { key: 'graph', label: 'Graphique', icon: LineIcon },
                { key: 'table', label: 'Tableau',   icon: BarChart3 },
              ].map(opt => {
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.key}
                    onClick={() => setEvolView(opt.key)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 transition-colors border-l border-gray-200 first:border-l-0 ${
                      evolView === opt.key ? 'bg-indigo-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    <Icon size={13} />{opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Évolution OPEX */}
          <section>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-0.5 rounded text-xs font-bold bg-indigo-100 text-indigo-700">OPEX</span>
              <h3 className="text-sm font-semibold text-gray-700">Évolution annuelle — comptes OPEX</h3>
            </div>
            {evolView === 'graph'
              ? <EvolutionChart rows={opexEvolution} exercices={exercicesAsc} />
              : <EvolutionTable rows={opexEvolution} exercices={exercicesAsc} accent="indigo" />}
          </section>

          {/* Évolution CAPEX */}
          <section>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-0.5 rounded text-xs font-bold bg-emerald-100 text-emerald-700">CAPEX</span>
              <h3 className="text-sm font-semibold text-gray-700">Évolution annuelle — comptes CAPEX</h3>
            </div>
            {evolView === 'graph'
              ? <EvolutionChart rows={capexEvolution} exercices={exercicesAsc} />
              : <EvolutionTable rows={capexEvolution} exercices={exercicesAsc} accent="emerald" />}
          </section>
        </>
      )}
    </div>
  );
}
