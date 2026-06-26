import { useMemo, useState } from 'react';
import { TrendingUp, AlertTriangle, ChevronRight, ChevronDown, Calendar, Building2, Pencil, X, Check } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';
import { calculateChargeEngagee, calculateProjections } from '../../utils/calculations';
import { NB_MOIS_REALISES } from '../../constants/analytiqueConstants';

const fmt = (n) => formatCurrency(n);
const pct = (n, total) => total > 0 ? `${((n / total) * 100).toFixed(0)} %` : '—';

// Montant + % du budget sur deux lignes
const FmtPct = ({ value, budget, colorClass = '' }) => {
  if (!budget || budget === 0) return <span>{fmt(value)}</span>;
  const ratio = (value / budget) * 100;
  const pctColor = ratio > 110 ? 'text-red-600 font-bold'
    : ratio > 100 ? 'text-red-500 font-semibold'
    : ratio > 90  ? 'text-orange-500'
    : 'text-gray-400';
  return (
    <div className="leading-tight">
      <div className={colorClass || undefined}>{fmt(value)}</div>
      <div className={`text-[10px] ${pctColor}`}>{ratio.toFixed(1)} %</div>
    </div>
  );
};

const TRIMESTRES = [
  { id: 'Q1', label: 'Q1 — Jan · Fév · Mar', months: [0, 1, 2] },
  { id: 'Q2', label: 'Q2 — Avr · Mai · Jun', months: [3, 4, 5] },
  { id: 'Q3', label: 'Q3 — Jul · Aoû · Sep', months: [6, 7, 8] },
  { id: 'Q4', label: 'Q4 — Oct · Nov · Déc', months: [9, 10, 11] },
];

const getQuarter = (dateStr) => {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d)) return null;
  const m = d.getMonth();
  return TRIMESTRES.find(q => q.months.includes(m))?.id ?? null;
};

// ── Niveau 4 : commandes ────────────────────────────────────────────────────

const DrillCommandes = ({ orders }) => {
  if (!orders.length) {
    return <div className="px-4 py-3 text-xs text-gray-400 italic">Aucune commande trouvée.</div>;
  }
  const sorted = [...orders].sort((a, b) => (b.dateCommande || '').localeCompare(a.dateCommande || ''));
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="bg-gray-50 text-gray-500">
            <th className="text-left px-3 py-1.5 border-b">Date cmd</th>
            <th className="text-left px-3 py-1.5 border-b">Référence</th>
            <th className="text-left px-3 py-1.5 border-b">Désignation</th>
            <th className="text-left px-3 py-1.5 border-b">Statut</th>
            <th className="text-right px-3 py-1.5 border-b">Montant</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map(o => (
            <tr key={o.id} className="border-b hover:bg-gray-50">
              <td className="px-3 py-1.5 text-gray-500 whitespace-nowrap">{o.dateCommande || '—'}</td>
              <td className="px-3 py-1.5 font-mono text-gray-600">{o.reference || o.numeroMarche || '—'}</td>
              <td className="px-3 py-1.5 text-gray-800 max-w-xs truncate" title={o.description}>{o.description || '—'}</td>
              <td className="px-3 py-1.5 text-gray-500">{o.etatSage || o.status || '—'}</td>
              <td className="px-3 py-1.5 text-right font-semibold text-indigo-700">{fmt(o.montant || 0)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// ── Niveau 3 : fournisseurs / éditeurs ─────────────────────────────────────

const DrillFournisseurs = ({ orders, suppliers }) => {
  const [openFourn, setOpenFourn] = useState(null);

  const supplierMap = useMemo(() =>
    Object.fromEntries(suppliers.map(s => [String(s.id), s.nom || s.project || s.supplier || s.fournisseur || s.name || s.designation || ''])),
  [suppliers]);

  const byFourn = useMemo(() => {
    const map = new Map();
    orders.forEach(o => {
      const key = String(o.parentId ?? '');
      const nom = supplierMap[key] || o.fournisseur || `Fournisseur #${key}`;
      if (!map.has(key)) map.set(key, { key, nom, montant: 0, orders: [] });
      const g = map.get(key);
      g.montant += o.montant || 0;
      g.orders.push(o);
    });
    return [...map.values()].sort((a, b) => b.montant - a.montant);
  }, [orders, supplierMap]);

  const total = byFourn.reduce((s, f) => s + f.montant, 0);

  return (
    <div className="divide-y divide-gray-100">
      {byFourn.map(f => {
        const isOpen = openFourn === f.key;
        return (
          <div key={f.key}>
            <button
              onClick={() => setOpenFourn(isOpen ? null : f.key)}
              className="w-full flex items-center gap-2 px-4 py-2 text-xs hover:bg-violet-50 transition-colors text-left"
            >
              {isOpen
                ? <ChevronDown size={12} className="text-violet-500 flex-shrink-0" />
                : <ChevronRight size={12} className="text-violet-400 flex-shrink-0" />}
              <Building2 size={12} className="text-violet-400 flex-shrink-0" />
              <span className="flex-1 font-medium text-gray-800">{f.nom}</span>
              <span className="text-gray-400 mr-4">{f.orders.length} cmd</span>
              <span className="text-gray-500 w-16 text-right">{pct(f.montant, total)}</span>
              <span className="font-semibold text-violet-700 w-28 text-right">{fmt(f.montant)}</span>
            </button>
            {isOpen && (
              <div className="bg-white border-t border-violet-100 ml-8">
                <DrillCommandes orders={f.orders} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

// ── Niveau 2 : trimestres ───────────────────────────────────────────────────

const DrillTrimestres = ({ compteOrders, suppliers, nbMoisRealises }) => {
  const [openQ, setOpenQ] = useState(null);

  const moisRealises = useMemo(() => {
    const set = new Set();
    for (let i = 0; i < nbMoisRealises; i++) set.add(i);
    return set;
  }, [nbMoisRealises]);

  const byQ = useMemo(() => {
    const map = new Map(TRIMESTRES.map(q => [q.id, { ...q, montant: 0, orders: [] }]));
    compteOrders.forEach(o => {
      const q = getQuarter(o.dateCommande);
      if (q && map.has(q)) {
        map.get(q).montant += o.montant || 0;
        map.get(q).orders.push(o);
      }
    });
    return TRIMESTRES.map(q => map.get(q.id));
  }, [compteOrders]);

  const total = byQ.reduce((s, q) => s + q.montant, 0);
  const isRealise = (q) => q.months.some(m => moisRealises.has(m));

  return (
    <div className="divide-y divide-gray-100">
      {byQ.map(q => {
        const realise = isRealise(q);
        const isOpen = openQ === q.id;
        const hasData = q.orders.length > 0;

        return (
          <div key={q.id}>
            <button
              disabled={!realise || !hasData}
              onClick={() => realise && hasData && setOpenQ(isOpen ? null : q.id)}
              className={`w-full flex items-center gap-2 px-4 py-2 text-xs text-left transition-colors
                ${realise && hasData ? 'hover:bg-blue-50 cursor-pointer' : 'cursor-default opacity-50'}`}
            >
              {realise && hasData
                ? (isOpen
                    ? <ChevronDown size={12} className="text-blue-500 flex-shrink-0" />
                    : <ChevronRight size={12} className="text-blue-400 flex-shrink-0" />)
                : <span className="w-3 flex-shrink-0" />}
              <Calendar size={12} className={`flex-shrink-0 ${realise ? 'text-blue-400' : 'text-gray-300'}`} />
              <span className={`flex-1 font-medium ${realise ? 'text-gray-800' : 'text-gray-400'}`}>{q.label}</span>
              {realise
                ? <>
                    <span className="text-gray-400 mr-4">{q.orders.length} cmd</span>
                    <span className="text-gray-500 w-16 text-right">{pct(q.montant, total)}</span>
                    <span className="font-semibold text-blue-700 w-28 text-right">{fmt(q.montant)}</span>
                  </>
                : <span className="text-gray-300 text-xs italic">Non réalisé</span>}
            </button>
            {isOpen && (
              <div className="bg-white border-t border-blue-100 ml-8">
                {q.orders.length === 0
                  ? <p className="px-4 py-3 text-xs text-gray-400 italic">Aucune commande pour ce trimestre.</p>
                  : <DrillFournisseurs orders={q.orders} suppliers={suppliers} />}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

// ── Cellule budget éditable ─────────────────────────────────────────────────

const BudgetCell = ({ original, override, onSave, onReset }) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');

  const hasOverride = override !== undefined && override !== original;
  const displayed = override !== undefined ? override : original;

  const startEdit = (e) => {
    e.stopPropagation();
    setDraft(String(displayed === 0 ? '' : displayed));
    setEditing(true);
  };

  const commit = (e) => {
    e.stopPropagation();
    const val = parseFloat(String(draft).replace(/\s/g, '').replace(',', '.'));
    if (!isNaN(val) && val >= 0) onSave(val);
    setEditing(false);
  };

  const cancel = (e) => {
    e.stopPropagation();
    setEditing(false);
  };

  const reset = (e) => {
    e.stopPropagation();
    onReset();
  };

  if (editing) {
    return (
      <div className="flex items-center gap-1 justify-end" onClick={e => e.stopPropagation()}>
        <input
          autoFocus
          type="text"
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') commit(e); if (e.key === 'Escape') cancel(e); }}
          className="w-28 text-right text-xs border border-blue-400 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white"
        />
        <button onClick={commit} className="text-green-600 hover:text-green-800"><Check size={12} /></button>
        <button onClick={cancel} className="text-gray-400 hover:text-gray-600"><X size={12} /></button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 justify-end group">
      <div className="flex flex-col items-end leading-tight">
        {hasOverride && original > 0 && (
          <span className="line-through text-gray-400 text-[10px]">{fmt(original)}</span>
        )}
        <span className={hasOverride ? 'font-semibold text-blue-700' : 'text-gray-600'}>
          {displayed > 0 ? fmt(displayed) : '—'}
        </span>
      </div>
      <button
        onClick={startEdit}
        className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-blue-600 transition-opacity ml-1"
        title="Modifier le budget"
      >
        <Pencil size={11} />
      </button>
      {hasOverride && (
        <button
          onClick={reset}
          className="text-gray-300 hover:text-red-500 transition-colors"
          title="Annuler la modification"
        >
          <X size={10} />
        </button>
      )}
    </div>
  );
};

// ── Tableau générique de projection ────────────────────────────────────────

const MOIS_LABELS = ['','Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];

const TableauProjection = ({
  label,
  colorAccent = 'indigo',
  rows,            // [{ id, compte, libelle, budgetBase, chargeEngagee, compteOrders, hasOrders }]
  budgetOverrides,
  onBudgetSave,
  onBudgetReset,
  nbMoisRealises,
  suppliers,
  showDrilldown = true,
}) => {
  const [openRow, setOpenRow] = useState(null);

  const accentMap = {
    indigo: { header: 'bg-indigo-600 text-white', badge: 'bg-indigo-100 text-indigo-700 border-indigo-200', charge: 'text-indigo-700', total: 'bg-indigo-50 border-indigo-200', rowOpen: 'bg-indigo-50', drillBg: 'bg-indigo-50', drillBorder: 'border-indigo-100', drillText: 'text-indigo-600', chevron: 'text-indigo-500' },
    emerald: { header: 'bg-emerald-600 text-white', badge: 'bg-emerald-100 text-emerald-700 border-emerald-200', charge: 'text-emerald-700', total: 'bg-emerald-50 border-emerald-200', rowOpen: 'bg-emerald-50', drillBg: 'bg-emerald-50', drillBorder: 'border-emerald-100', drillText: 'text-emerald-600', chevron: 'text-emerald-500' },
  };
  const accent = accentMap[colorAccent] || accentMap.indigo;

  const rowsWithBudget = rows.map(r => ({
    ...r,
    budget: budgetOverrides[r.id] !== undefined ? budgetOverrides[r.id] : r.budgetBase,
  }));

  const totaux = useMemo(() => ({
    budget: rowsWithBudget.reduce((s, r) => s + r.budget, 0),
    charge: rowsWithBudget.reduce((s, r) => s + r.chargeEngagee, 0),
  }), [rowsWithBudget]);

  const totalProj = calculateProjections(totaux.charge, totaux.budget, nbMoisRealises);

  const depassements = rowsWithBudget.filter(r => {
    const p = calculateProjections(r.chargeEngagee, r.budget, nbMoisRealises);
    return p.worstCase > r.budget && r.budget > 0;
  });

  return (
    <div className="space-y-3">
      {/* En-tête de section */}
      <div className="flex items-center gap-3">
        <span className={`text-xs font-bold px-3 py-1 rounded-full border ${accent.badge}`}>{label}</span>
        {depassements.length > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-red-700 bg-red-50 border border-red-200 rounded-full px-2.5 py-0.5">
            <AlertTriangle size={11} />
            {depassements.length} dépassement{depassements.length > 1 ? 's' : ''} (worst case)
          </div>
        )}
      </div>

      <div className="border rounded-lg overflow-hidden">
        {/* En-têtes colonnes */}
        <div className={`${accent.header} grid grid-cols-[1fr_2fr_1fr_1fr_1fr_1fr_1fr_1fr_1fr_32px] text-xs font-medium`}>
          <div className="px-3 py-2">Compte</div>
          <div className="px-3 py-2">Libellé</div>
          <div className="px-3 py-2 text-right">Budget</div>
          <div className="px-3 py-2 text-right leading-tight">Charge {nbMoisRealises}M<div className="font-normal opacity-75 text-[10px]">% budget</div></div>
          <div className="px-3 py-2 text-right leading-tight">Linéaire<div className="font-normal opacity-75 text-[10px]">% budget</div></div>
          <div className="px-3 py-2 text-right leading-tight">Optimiste −5%<div className="font-normal opacity-75 text-[10px]">% budget</div></div>
          <div className="px-3 py-2 text-right leading-tight">Central +5%<div className="font-normal opacity-75 text-[10px]">% budget</div></div>
          <div className="px-3 py-2 text-right leading-tight">Pessimiste +15%<div className="font-normal opacity-75 text-[10px]">% budget</div></div>
          <div className="px-3 py-2 text-right">Reste</div>
          <div />
        </div>

        {rows.length === 0 && (
          <div className="text-center py-8 text-gray-400 text-xs italic">
            Aucune donnée — importez ou saisissez des données.
          </div>
        )}

        {rowsWithBudget.map(r => {
          const p = calculateProjections(r.chargeEngagee, r.budget, nbMoisRealises);
          const worstOver = p.worstCase > r.budget && r.budget > 0;
          const isOpen = openRow === r.id;
          const hasOrders = r.hasOrders;

          return (
            <div key={r.id} className="border-t">
              <div
                role="button"
                tabIndex={showDrilldown && hasOrders ? 0 : -1}
                onClick={() => showDrilldown && hasOrders && setOpenRow(isOpen ? null : r.id)}
                onKeyDown={e => e.key === 'Enter' && showDrilldown && hasOrders && setOpenRow(isOpen ? null : r.id)}
                className={`grid grid-cols-[1fr_2fr_1fr_1fr_1fr_1fr_1fr_1fr_1fr_32px] text-xs items-center
                  ${isOpen ? accent.rowOpen : worstOver ? 'bg-red-50 hover:bg-red-100' : 'bg-white hover:bg-gray-50'}
                  ${showDrilldown && hasOrders ? 'cursor-pointer' : 'cursor-default'} select-none transition-colors`}
              >
                <div className="px-3 py-2.5 font-mono text-gray-500">{r.compte}</div>
                <div className="px-3 py-2.5 text-gray-800 truncate" title={r.libelle}>{r.libelle}</div>
                <div className="px-3 py-2.5" onClick={e => e.stopPropagation()}>
                  <BudgetCell
                    original={r.budgetBase}
                    override={budgetOverrides[r.id]}
                    onSave={val => onBudgetSave(r.id, val)}
                    onReset={() => onBudgetReset(r.id)}
                  />
                </div>
                <div className={`px-3 py-2 text-right font-semibold ${accent.charge}`}>
                  <FmtPct value={r.chargeEngagee} budget={r.budget} />
                </div>
                <div className="px-3 py-2 text-right text-blue-700">
                  <FmtPct value={p.lineaire} budget={r.budget} />
                </div>
                <div className="px-3 py-2 text-right text-green-700">
                  <FmtPct value={p.bestCase} budget={r.budget} />
                </div>
                <div className="px-3 py-2 text-right text-orange-600">
                  <FmtPct value={p.central} budget={r.budget} />
                </div>
                <div className={`px-3 py-2 text-right font-semibold ${worstOver ? 'text-red-700' : 'text-gray-600'}`}>
                  <FmtPct value={p.worstCase} budget={r.budget} />
                </div>
                <div className={`px-3 py-2.5 text-right ${p.resteAEngager < 0 ? 'text-red-600 font-semibold' : 'text-green-700'}`}>
                  {r.budget > 0 ? fmt(p.resteAEngager) : '—'}
                </div>
                <div className="flex items-center justify-center">
                  {showDrilldown && hasOrders
                    ? (isOpen
                        ? <ChevronDown size={14} className={accent.chevron} />
                        : <ChevronRight size={14} className="text-gray-400" />)
                    : null}
                </div>
              </div>

              {isOpen && showDrilldown && (
                <div className={`${accent.drillBg} border-t ${accent.drillBorder}`}>
                  <div className={`flex items-center gap-2 px-4 py-1.5 text-xs ${accent.drillText} font-medium border-b ${accent.drillBorder}`}>
                    <TrendingUp size={11} />
                    <span>Répartition trimestrielle — {r.compteOrders.length} commande(s)</span>
                  </div>
                  <DrillTrimestres
                    compteOrders={r.compteOrders}
                    suppliers={suppliers}
                    nbMoisRealises={nbMoisRealises}
                  />
                </div>
              )}
            </div>
          );
        })}

        {/* Ligne total */}
        <div className="bg-gray-100 border-t-2 border-gray-300 grid grid-cols-[1fr_2fr_1fr_1fr_1fr_1fr_1fr_1fr_1fr_32px] text-xs font-bold">
          <div className="px-3 py-2 col-span-2">TOTAL {label}</div>
          <div className="px-3 py-2 text-right">{fmt(totaux.budget)}</div>
          <div className={`px-3 py-2 text-right ${accent.charge}`}>
            <FmtPct value={totaux.charge} budget={totaux.budget} />
          </div>
          <div className="px-3 py-2 text-right text-blue-700">
            <FmtPct value={totalProj.lineaire} budget={totaux.budget} />
          </div>
          <div className="px-3 py-2 text-right text-green-700">
            <FmtPct value={totalProj.bestCase} budget={totaux.budget} />
          </div>
          <div className="px-3 py-2 text-right text-orange-600">
            <FmtPct value={totalProj.central} budget={totaux.budget} />
          </div>
          <div className={`px-3 py-2 text-right ${totalProj.depassementWorstCase > 0 ? 'text-red-700' : 'text-gray-700'}`}>
            <FmtPct value={totalProj.worstCase} budget={totaux.budget} />
          </div>
          <div className={`px-3 py-2 text-right ${totalProj.resteAEngager < 0 ? 'text-red-600' : 'text-green-700'}`}>{fmt(totalProj.resteAEngager)}</div>
          <div />
        </div>
      </div>
    </div>
  );
};

// ── Composant principal ────────────────────────────────────────────────────

export default function ProjectionAnnuelle({
  suppliers = [],
  orders = [],
  eprd = [],
  capexProjects = [],
  capexOrders = [],
  nbMoisRealises = NB_MOIS_REALISES,
  onNbMoisChange,
}) {
  // Pas de state local : nbMoisRealises vient du parent (App.jsx)
  const [opexBudgetOverrides, setOpexBudgetOverrides] = useState({});
  const [capexBudgetOverrides, setCapexBudgetOverrides] = useState({});

  // ── Données OPEX ───────────────────────────────────────────────────────────

  const eprdMap = useMemo(() =>
    Object.fromEntries(eprd.map(e => [e.compteOrdonnateur, e])),
  [eprd]);

  const ordersByCompte = useMemo(() => {
    const map = new Map();
    orders.forEach(o => {
      const c = o.compteOrdonnateur;
      if (!c) return;
      if (!map.has(c)) map.set(c, []);
      map.get(c).push(o);
    });
    return map;
  }, [orders]);

  const opexRows = useMemo(() => {
    const map = new Map();

    eprd.forEach(e => {
      map.set(e.compteOrdonnateur, {
        id:           e.compteOrdonnateur,
        compte:       e.compteOrdonnateur,
        libelle:      e.libelleCompte || e.compteOrdonnateur,
        budgetBase:   e.budgetEPRD || 0,
        chargeEngagee: 0,
      });
    });

    suppliers.forEach(s => {
      const compte = s.compteOrdonnateur || '__hors_perimetre__';
      const eprdEntry = eprdMap[compte];
      const charge    = calculateChargeEngagee(s.depenseActuelle || 0, s.engagement || 0);

      if (!map.has(compte)) {
        map.set(compte, {
          id:           compte,
          compte:       compte === '__hors_perimetre__' ? '—' : compte,
          libelle:      compte === '__hors_perimetre__'
            ? 'Hors périmètre / compte non mappé'
            : (s.category || eprdEntry?.libelleCompte || compte),
          budgetBase:   eprdEntry?.budgetEPRD || 0,
          chargeEngagee: 0,
        });
      }
      map.get(compte).chargeEngagee += charge;
    });

    return [...map.values()]
      .sort((a, b) => b.chargeEngagee - a.chargeEngagee)
      .map(r => ({
        ...r,
        compteOrders: ordersByCompte.get(r.compte) || [],
        hasOrders:    (ordersByCompte.get(r.compte) || []).length > 0,
      }));
  }, [suppliers, eprd, eprdMap, ordersByCompte]);

  // ── Données CAPEX ──────────────────────────────────────────────────────────

  const capexOrdersByProject = useMemo(() => {
    const map = new Map();
    capexOrders.forEach(o => {
      const key = String(o.parentId ?? o.projectId ?? '');
      if (!key) return;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(o);
    });
    return map;
  }, [capexOrders]);

  // CAPEX : regroupement par compteOrdonnateur (un compte = une ligne)
  const capexRows = useMemo(() => {
    const map = new Map();

    capexProjects.forEach(p => {
      const compte = p.compteOrdonnateur || p.code || String(p.id);
      const id     = String(p.id);
      const projectOrders = capexOrdersByProject.get(id) || [];
      const charge = (p.depense || 0) + (p.engagement || 0);

      // Libellé de compte = partie après "FOURNISSEUR — " dans le champ project
      const libelleCompte = p.project?.includes(' — ')
        ? p.project.split(' — ').slice(1).join(' — ')
        : (p.project || compte);

      if (!map.has(compte)) {
        map.set(compte, {
          id:           compte,
          compte,
          libelle:      libelleCompte,
          budgetBase:   0,
          chargeEngagee: 0,
          compteOrders: [],
          hasOrders:    false,
        });
      }

      const grp = map.get(compte);
      grp.budgetBase    += p.budgetTotal || 0;
      grp.chargeEngagee += charge;
      grp.compteOrders.push(...projectOrders);
      if (projectOrders.length > 0) grp.hasOrders = true;
    });

    return [...map.values()].sort((a, b) => b.chargeEngagee - a.chargeEngagee);
  }, [capexProjects, capexOrdersByProject]);

  // ── Handlers budgets ───────────────────────────────────────────────────────

  const saveOpexBudget   = (id, val) => setOpexBudgetOverrides(prev => ({ ...prev, [id]: val }));
  const resetOpexBudget  = (id) => setOpexBudgetOverrides(prev => { const n = { ...prev }; delete n[id]; return n; });
  const saveCapexBudget  = (id, val) => setCapexBudgetOverrides(prev => ({ ...prev, [id]: val }));
  const resetCapexBudget = (id) => setCapexBudgetOverrides(prev => { const n = { ...prev }; delete n[id]; return n; });

  return (
    <div className="space-y-8 p-4">
      {/* En-tête */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-xl font-bold text-gray-800">Projection annuelle — DSI</h2>
        <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-1.5 text-xs text-blue-700">
          <span className="font-medium">Mois réalisés :</span>
          <select
            value={nbMoisRealises}
            onChange={e => onNbMoisChange ? onNbMoisChange(Number(e.target.value)) : undefined}
            className="bg-transparent font-semibold focus:outline-none cursor-pointer"
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
              <option key={m} value={m}>{m} — Jan–{MOIS_LABELS[m]}</option>
            ))}
          </select>
          <span className="text-blue-400 text-[10px]">(synchronisé avec la vue d&apos;ensemble)</span>
        </div>
      </div>

      {/* Tableau OPEX */}
      <TableauProjection
        label="OPEX"
        colorAccent="indigo"
        rows={opexRows}
        budgetOverrides={opexBudgetOverrides}
        onBudgetSave={saveOpexBudget}
        onBudgetReset={resetOpexBudget}
        nbMoisRealises={nbMoisRealises}
        suppliers={suppliers}
        showDrilldown={true}
      />

      {/* Tableau CAPEX */}
      <TableauProjection
        label="CAPEX"
        colorAccent="emerald"
        rows={capexRows}
        budgetOverrides={capexBudgetOverrides}
        onBudgetSave={saveCapexBudget}
        onBudgetReset={resetCapexBudget}
        nbMoisRealises={nbMoisRealises}
        suppliers={capexProjects}
        showDrilldown={true}
      />

      {/* Légende */}
      <div className="bg-gray-50 border rounded-lg p-4 text-xs text-gray-600 grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div><span className="font-semibold text-blue-700">Linéaire</span> — Charge × 12 / {nbMoisRealises} (extrapolation à rythme constant)</div>
        <div><span className="font-semibold text-green-700">Optimiste −5 %</span> — Linéaire × 0,95 (légère décélération des dépenses)</div>
        <div><span className="font-semibold text-orange-600">Central +5 %</span> — Linéaire × 1,05 (légère accélération)</div>
        <div><span className="font-semibold text-red-700">Pessimiste +15 %</span> — Linéaire × 1,15 (commandes tardives / imprévus)</div>
      </div>

      {opexRows.length === 0 && capexRows.length === 0 && (
        <div className="text-center py-12 text-gray-400 text-sm">
          Aucune donnée — importez un fichier de commandes ou ajoutez des fournisseurs / projets CAPEX.
        </div>
      )}
    </div>
  );
}
