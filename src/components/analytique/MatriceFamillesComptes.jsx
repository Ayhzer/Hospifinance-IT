import { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, X, Building2, FileText, Package } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';
import { calculateChargeEngagee } from '../../utils/calculations';
import { reclasserAvecCommandes } from '../../utils/reclassementEngine';
import { FAMILLE_ANALYTIQUE } from '../../constants/analytiqueConstants';

const fmt = (n) => n > 0 ? formatCurrency(n) : '—';
const fmtAbs = (n) => formatCurrency(n ?? 0);

// ── Niveau 3 : liste de commandes ─────────────────────────────────────────────

const OrdersTable = ({ orders }) => {
  if (!orders.length) return (
    <p className="px-4 py-2 text-xs text-gray-400 italic">Aucune commande associée.</p>
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="bg-gray-50 text-gray-500 border-b">
            <th className="text-left px-3 py-1.5">Référence</th>
            <th className="text-left px-3 py-1.5">Date</th>
            <th className="text-left px-3 py-1.5 max-w-xs">Désignation</th>
            <th className="text-left px-3 py-1.5">Statut</th>
            <th className="text-left px-3 py-1.5">Type</th>
            <th className="text-right px-3 py-1.5">Montant</th>
          </tr>
        </thead>
        <tbody>
          {[...orders]
            .sort((a, b) => (b.dateCommande || '').localeCompare(a.dateCommande || ''))
            .map(o => (
              <tr key={o.id} className="border-b hover:bg-gray-50">
                <td className="px-3 py-1.5 font-mono text-gray-500 whitespace-nowrap">{o.reference || '—'}</td>
                <td className="px-3 py-1.5 text-gray-500 whitespace-nowrap">{o.dateCommande || '—'}</td>
                <td className="px-3 py-1.5 text-gray-700 max-w-xs truncate" title={o.description}>{o.description || '—'}</td>
                <td className="px-3 py-1.5 text-gray-500 whitespace-nowrap">{o.etatSage || o.status || '—'}</td>
                <td className="px-3 py-1.5 text-gray-400 whitespace-nowrap">{o.typeCommande || '—'}</td>
                <td className="px-3 py-1.5 text-right font-semibold text-indigo-700 whitespace-nowrap">{fmtAbs(o.montant)}</td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
};

// ── Niveau 2 : liste fournisseurs avec commandes dépliables ───────────────────

const DrillFournisseurs = ({ fournisseurs, ordersByParent }) => {
  const [open, setOpen] = useState(null);
  const [sortDir, setSortDir] = useState('desc');
  const totalCharge = fournisseurs.reduce((s, f) => s + f.chargeEngagee, 0);

  const sorted = [...fournisseurs].sort((a, b) =>
    sortDir === 'desc' ? b.chargeEngagee - a.chargeEngagee : a.chargeEngagee - b.chargeEngagee
  );

  return (
    <div>
      {/* En-tête tri */}
      <div className="flex items-center justify-between px-4 py-1.5 bg-gray-50 border-b text-xs text-gray-500">
        <span>{fournisseurs.length} fournisseur{fournisseurs.length > 1 ? 's' : ''}</span>
        <button
          onClick={() => setSortDir(d => d === 'desc' ? 'asc' : 'desc')}
          className="flex items-center gap-1 hover:text-indigo-600 font-medium"
        >
          Montant {sortDir === 'desc' ? '↓' : '↑'}
        </button>
      </div>
      <div className="divide-y divide-gray-100">
        {sorted.map(f => {
          const orders = ordersByParent[String(f.id)] || [];
          const isOpen = open === f.id;

        return (
          <div key={f.id}>
            <button
              onClick={() => setOpen(isOpen ? null : f.id)}
              className="w-full flex items-center gap-2 px-4 py-2.5 text-xs hover:bg-indigo-50 transition-colors text-left"
            >
              {orders.length > 0
                ? (isOpen
                    ? <ChevronDown size={13} className="text-indigo-500 flex-shrink-0" />
                    : <ChevronRight size={13} className="text-indigo-400 flex-shrink-0" />)
                : <span className="w-[13px] flex-shrink-0" />}
              <Building2 size={12} className="text-indigo-300 flex-shrink-0" />
              <span className="flex-1 font-medium text-gray-800 truncate" title={f.supplier}>
                {f.supplier || '—'}
              </span>
              <span className="text-gray-400 mr-3 whitespace-nowrap">{orders.length} cmd</span>
              <span className="text-gray-500 w-14 text-right">
                {totalCharge > 0 ? `${((f.chargeEngagee / totalCharge) * 100).toFixed(1)} %` : '—'}
              </span>
              <span className="font-semibold text-indigo-700 w-28 text-right whitespace-nowrap">
                {fmtAbs(f.chargeEngagee)}
              </span>
            </button>

            {isOpen && (
              <div className="bg-white border-t border-indigo-100 ml-6">
                <OrdersTable orders={orders} />
              </div>
            )}
          </div>
        );
        })}
      </div>
    </div>
  );
};

// ── Panneau de drill-down ─────────────────────────────────────────────────────

const DRILL_COLORS = {
  indigo:  { header: 'bg-indigo-700',  badge: 'bg-indigo-600 text-indigo-100',  sub: 'text-indigo-200',  hint: 'text-indigo-400' },
  emerald: { header: 'bg-emerald-700', badge: 'bg-emerald-600 text-emerald-100', sub: 'text-emerald-200', hint: 'text-emerald-400' },
};

const DrillPanel = ({ selection, lignesReclassees, ordersByParent, eprdMap, onClose, color = 'indigo', libelleByCompte = {} }) => {
  const { compte, famille } = selection;
  const c = DRILL_COLORS[color] || DRILL_COLORS.indigo;

  const fournisseurs = useMemo(() =>
    lignesReclassees
      .filter(l =>
        l.compteOrdonnateur === compte &&
        (famille === null || l.familleAnalytique === famille || (!l.familleAnalytique && famille === 'Non classé'))
      )
      .sort((a, b) => b.chargeEngagee - a.chargeEngagee),
  [lignesReclassees, compte, famille]);

  const totalCharge = fournisseurs.reduce((s, f) => s + f.chargeEngagee, 0);
  const totalOrders = fournisseurs.reduce((s, f) => s + (ordersByParent[f.id]?.length || 0), 0);
  const libelle = eprdMap[compte]?.libelleCompte || libelleByCompte[compte] || compte;

  return (
    <div className="bg-white border rounded-xl shadow-lg overflow-hidden">
      <div className={`flex items-center justify-between px-4 py-3 ${c.header} text-white`}>
        <div className="flex items-center gap-3 min-w-0">
          <div className="min-w-0">
            <div className="text-xs font-bold flex items-center gap-2 flex-wrap">
              <span className={`font-mono ${c.badge} px-2 py-0.5 rounded`}>{compte}</span>
              <span className={c.sub}>{libelle}</span>
              {famille && (<><span className={c.hint}>›</span><span>{famille}</span></>)}
            </div>
            <div className={`${c.sub} text-[11px] mt-0.5 flex gap-3`}>
              <span>{fournisseurs.length} fournisseur{fournisseurs.length > 1 ? 's' : ''}</span>
              <span>{totalOrders} commande{totalOrders > 1 ? 's' : ''}</span>
              <span className="font-semibold text-white">{fmtAbs(totalCharge)}</span>
            </div>
          </div>
        </div>
        <button onClick={onClose} className={`ml-4 ${c.sub} hover:text-white flex-shrink-0`}>
          <X size={16} />
        </button>
      </div>
      <div className="divide-y divide-gray-100">
        {fournisseurs.length === 0 ? (
          <p className="px-4 py-6 text-sm text-gray-400 text-center italic">Aucun fournisseur trouvé.</p>
        ) : (
          <DrillFournisseurs fournisseurs={fournisseurs} ordersByParent={ordersByParent} />
        )}
      </div>
    </div>
  );
};

// ── Section matrice (OPEX ou CAPEX) ──────────────────────────────────────────

const MATRICE_COLORS = {
  indigo: {
    th:         'bg-indigo-700 border-indigo-600',
    thHover:    'hover:bg-indigo-600',
    thDark:     'bg-indigo-800 hover:bg-indigo-700',
    cellColor:  'text-indigo-700',
    cellHover:  'hover:bg-indigo-100 active:bg-indigo-200',
    cellSel:    'bg-indigo-100 ring-indigo-400',
    rowHover:   'hover:bg-indigo-50',
    rowSel:     'ring-indigo-400',
    stickyHov:  'hover:bg-indigo-50',
    totalSel:   'bg-indigo-200 text-indigo-900',
    totalHov:   'hover:bg-indigo-100',
    foot:       'bg-indigo-50 border-indigo-300',
    footText:   'text-indigo-800',
    footGrand:  'bg-indigo-100 text-indigo-900',
    hint:       'text-indigo-500',
    title:      'text-indigo-800',
    badge:      'bg-indigo-100 text-indigo-700 border-indigo-200',
  },
  emerald: {
    th:         'bg-emerald-700 border-emerald-600',
    thHover:    'hover:bg-emerald-600',
    thDark:     'bg-emerald-800 hover:bg-emerald-700',
    cellColor:  'text-emerald-700',
    cellHover:  'hover:bg-emerald-100 active:bg-emerald-200',
    cellSel:    'bg-emerald-100 ring-emerald-400',
    rowHover:   'hover:bg-emerald-50',
    rowSel:     'ring-emerald-400',
    stickyHov:  'hover:bg-emerald-50',
    totalSel:   'bg-emerald-200 text-emerald-900',
    totalHov:   'hover:bg-emerald-100',
    foot:       'bg-emerald-50 border-emerald-300',
    footText:   'text-emerald-800',
    footGrand:  'bg-emerald-100 text-emerald-900',
    hint:       'text-emerald-600',
    title:      'text-emerald-800',
    badge:      'bg-emerald-100 text-emerald-700 border-emerald-200',
  },
};

const MatriceSection = ({ lignes, ordersMap, eprdMap, title, color = 'indigo', panelId, alwaysFamilles = [] }) => {
  const [selection, setSelection] = useState(null);
  const [sortBy, setSortBy] = useState({ col: null, dir: 'desc' });
  const c = MATRICE_COLORS[color] || MATRICE_COLORS.indigo;

  const handleColSort = (col) => setSortBy(prev =>
    prev.col === col ? { col, dir: prev.dir === 'desc' ? 'asc' : 'desc' } : { col, dir: 'desc' }
  );

  const { comptes, familles, matrix, totalParCompte, totalParFamille, grandTotal, libelleByCompte } = useMemo(() => {
    const cellMap = new Map();
    const comptesSet  = new Set();
    const famillesSet = new Set();
    const libelleByCompte = {};
    lignes.forEach(ligne => {
      const compte  = ligne.compteOrdonnateur;
      const famille = ligne.familleAnalytique || 'Non classé';
      if (!compte) return;
      comptesSet.add(compte);
      famillesSet.add(famille);
      // Libellé comptable porté par la donnée source (plan comptable du fichier importé)
      if (ligne.libelleCompte && !libelleByCompte[compte]) libelleByCompte[compte] = ligne.libelleCompte;
      const key = `${compte}|||${famille}`;
      cellMap.set(key, (cellMap.get(key) || 0) + (ligne.chargeEngagee || 0));
    });
    // Familles à toujours afficher, même sans charge (ex. « Hors périmètre DSI »)
    alwaysFamilles.forEach(f => famillesSet.add(f));
    const comptesArr  = [...comptesSet].sort();
    const famillesArr = [...famillesSet].sort();
    const totalParCompte = {};
    const totalParFamille = {};
    let grandTotal = 0;
    const matrix = {};
    comptesArr.forEach(c => {
      matrix[c] = {};
      totalParCompte[c] = 0;
      famillesArr.forEach(f => {
        const val = cellMap.get(`${c}|||${f}`) || 0;
        matrix[c][f] = val;
        totalParCompte[c] += val;
        totalParFamille[f] = (totalParFamille[f] || 0) + val;
        grandTotal += val;
      });
    });
    // Masquer les comptes entièrement vides (aucune charge sur aucune famille)
    const comptesNonVides = comptesArr.filter(cpt => (totalParCompte[cpt] || 0) > 0);
    return { comptes: comptesNonVides, familles: famillesArr, matrix, totalParCompte, totalParFamille, grandTotal, libelleByCompte };
  }, [lignes, alwaysFamilles]);

  const sortedComptes = useMemo(() => {
    if (!sortBy.col) return comptes;
    return [...comptes].sort((a, b) => {
      const va = sortBy.col === 'total' ? (totalParCompte[a] || 0) : (matrix[a]?.[sortBy.col] || 0);
      const vb = sortBy.col === 'total' ? (totalParCompte[b] || 0) : (matrix[b]?.[sortBy.col] || 0);
      return sortBy.dir === 'desc' ? vb - va : va - vb;
    });
  }, [comptes, sortBy, matrix, totalParCompte]);

  const select = (compte, famille) => {
    if (selection?.compte === compte && selection?.famille === famille) {
      setSelection(null);
    } else {
      setSelection({ compte, famille });
      setTimeout(() => document.getElementById(panelId)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
    }
  };

  if (lignes.length === 0) {
    return (
      <div className="p-6 text-center text-gray-400 text-sm border rounded-lg">
        Aucune donnée {title} — importez d&apos;abord un fichier de commandes.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Titre section */}
      <div className="flex items-center justify-between">
        <h3 className={`text-sm font-bold ${c.title} flex items-center gap-2`}>
          <span className={`px-2 py-0.5 rounded border text-xs font-bold ${c.badge}`}>{title}</span>
          Matrice Familles × Comptes
        </h3>
        <div className="text-xs text-gray-400 flex gap-4">
          <span className="flex items-center gap-1"><FileText size={10} />{comptes.length} compte{comptes.length > 1 ? 's' : ''}</span>
          <span className="flex items-center gap-1"><Package size={10} />{familles.length} famille{familles.length > 1 ? 's' : ''}</span>
          <span>Total : <strong>{formatCurrency(grandTotal)}</strong></span>
        </div>
      </div>

      {/* Tableau */}
      <div className="overflow-x-auto rounded-lg border">
        <table className="text-xs border-collapse" style={{ minWidth: `${(familles.length + 3) * 120}px` }}>
          <thead>
            <tr className={`${c.th} text-white`}>
              <th className={`text-left px-3 py-2 border-b ${c.th} w-28 sticky left-0 z-10`}>Compte</th>
              <th className={`text-left px-3 py-2 border-b ${c.th} w-48 sticky left-28 z-10`}>Libellé</th>
              {familles.map(f => (
                <th key={f} onClick={() => handleColSort(f)}
                  className={`text-right px-2 py-2 border-b font-medium whitespace-nowrap max-w-[140px] cursor-pointer ${c.thHover} transition-colors select-none`}
                  title={`Trier par ${f}`}
                >
                  <span className="block truncate max-w-[120px] ml-auto">
                    {f}{sortBy.col === f ? (sortBy.dir === 'desc' ? ' ↓' : ' ↑') : ''}
                  </span>
                </th>
              ))}
              <th onClick={() => handleColSort('total')}
                className={`text-right px-3 py-2 border-b font-bold whitespace-nowrap cursor-pointer ${c.thDark} transition-colors select-none`}
              >
                Total compte{sortBy.col === 'total' ? (sortBy.dir === 'desc' ? ' ↓' : ' ↑') : ''}
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedComptes.map((compte, idx) => {
              const libelle = eprdMap[compte]?.libelleCompte || libelleByCompte[compte] || compte;
              const rowBg   = idx % 2 === 0 ? 'bg-white' : 'bg-gray-50';
              const isRowSelected = selection?.compte === compte && selection?.famille === null;
              return (
                <tr key={compte} className={`${isRowSelected ? `ring-2 ring-inset ${c.rowSel}` : ''} ${c.rowHover} transition-colors`}>
                  <td className={`px-3 py-2 font-mono text-gray-500 border-b sticky left-0 z-10 ${rowBg} ${c.stickyHov}`}>{compte}</td>
                  <td className={`px-3 py-2 text-gray-700 border-b sticky left-28 z-10 truncate max-w-[180px] ${rowBg} ${c.stickyHov}`} title={libelle}>{libelle}</td>
                  {familles.map(f => {
                    const val = matrix[compte][f];
                    const isCellSel = selection?.compte === compte && selection?.famille === f;
                    return (
                      <td key={f} onClick={() => val > 0 && select(compte, f)}
                        className={`px-2 py-2 text-right border-b transition-colors
                          ${val > 0 ? `${c.cellColor} font-medium cursor-pointer ${c.cellHover}` : 'text-gray-300 cursor-default'}
                          ${isCellSel ? `${c.cellSel} ring-2 ring-inset` : ''}`}
                        title={val > 0 ? `${compte} × ${f} — ${formatCurrency(val)}` : undefined}
                      >
                        {fmt(val)}
                      </td>
                    );
                  })}
                  <td onClick={() => select(compte, null)}
                    className={`px-3 py-2 text-right border-b font-bold cursor-pointer transition-colors
                      ${isRowSelected ? c.totalSel : `bg-gray-100 text-gray-800 ${c.totalHov}`}`}
                    title={`Voir tous les fournisseurs du compte ${compte}`}
                  >
                    {fmt(totalParCompte[compte])}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className={`${c.foot} border-t-2 font-bold text-xs`}>
              <td className={`px-3 py-2 border-t sticky left-0 ${c.foot} z-10`} colSpan={2}>Total famille</td>
              {familles.map(f => (
                <td key={f} className={`px-2 py-2 text-right border-t ${c.footText}`}>{fmt(totalParFamille[f] || 0)}</td>
              ))}
              <td className={`px-3 py-2 text-right border-t font-black ${c.footGrand}`}>{fmt(grandTotal)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Panneau drill-down */}
      {selection && (
        <div id={panelId}>
          <DrillPanel
            selection={selection}
            lignesReclassees={lignes}
            ordersByParent={ordersMap}
            eprdMap={eprdMap}
            onClose={() => setSelection(null)}
            color={color}
            libelleByCompte={libelleByCompte}
          />
        </div>
      )}
    </div>
  );
};

// ── Composant principal ───────────────────────────────────────────────────────

// Familles toujours visibles dans la matrice CAPEX, même sans charge (référence stable)
const CAPEX_ALWAYS_FAMILLES = [FAMILLE_ANALYTIQUE.HORS_PERIMETRE];

export default function MatriceFamillesComptes({ suppliers = [], moteur = {}, eprd = [], orders = [], projects = [], capexOrders = [] }) {
  const eprdMap = useMemo(() =>
    Object.fromEntries(eprd.map(e => [e.compteOrdonnateur, e])),
  [eprd]);

  const ordersByParent = useMemo(() => {
    const map = {};
    orders.forEach(o => { const k = String(o.parentId ?? ''); if (k) { if (!map[k]) map[k] = []; map[k].push(o); } });
    return map;
  }, [orders]);

  const capexOrdersByParent = useMemo(() => {
    const map = {};
    capexOrders.forEach(o => { const k = String(o.parentId ?? ''); if (k) { if (!map[k]) map[k] = []; map[k].push(o); } });
    return map;
  }, [capexOrders]);

  const lignesOpex = useMemo(() =>
    reclasserAvecCommandes(
      suppliers.map(s => ({ ...s, chargeEngagee: calculateChargeEngagee(s.depenseActuelle || 0, s.engagement || 0) })),
      orders,
      moteur
    ),
  [suppliers, orders, moteur]);

  const lignesCapex = useMemo(() =>
    reclasserAvecCommandes(
      projects.map(p => ({
        ...p,
        supplier: p.fournisseur || p.project || '—',
        chargeEngagee: calculateChargeEngagee(p.depense || 0, p.engagement || 0),
      })),
      capexOrders,
      moteur
    ),
  [projects, capexOrders, moteur]);

  const moteurActif = Object.values(moteur).some(v => Array.isArray(v) && v.length > 0);

  if (suppliers.length === 0 && projects.length === 0) {
    return (
      <div className="p-8 text-center text-gray-400 text-sm">
        Aucune donnée — importez d&apos;abord un fichier de commandes.
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Matrice Familles × Comptes — DSI</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Charge engagée par compte (lignes) × famille analytique (colonnes).
            <span className="ml-2 text-indigo-500 font-medium">Cliquer sur une cellule ou un total pour voir le détail.</span>
          </p>
        </div>
        {!moteurActif && (
          <span className="text-xs bg-amber-50 border border-amber-300 text-amber-700 px-3 py-1 rounded-full">
            Moteur vide — toutes les lignes en «&nbsp;Non classé&nbsp;»
          </span>
        )}
      </div>

      <MatriceSection
        lignes={lignesOpex}
        ordersMap={ordersByParent}
        eprdMap={eprdMap}
        title="OPEX"
        color="indigo"
        panelId="matrice-drill-opex"
      />

      <MatriceSection
        lignes={lignesCapex}
        ordersMap={capexOrdersByParent}
        eprdMap={eprdMap}
        title="CAPEX"
        color="emerald"
        panelId="matrice-drill-capex"
        alwaysFamilles={CAPEX_ALWAYS_FAMILLES}
      />
    </div>
  );
}
