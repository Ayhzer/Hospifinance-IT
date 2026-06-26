import { useState, useMemo, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { Search, X, SlidersHorizontal, ChevronDown, ChevronUp, Download } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

const fmt = formatCurrency;

// ── Colonnes disponibles ───────────────────────────────────────────────────────

const ALL_COLUMNS = [
  { id: 'type',              label: 'Type',             always: true },
  { id: 'reference',         label: 'Référence',        always: false },
  { id: 'parent',            label: 'Fourn. / Projet',  always: true },
  { id: 'compte',            label: 'Compte',           always: false },
  { id: 'dateCommande',      label: 'Date commande',    always: false },
  { id: 'dateReception',     label: 'Date réception',   always: false },
  { id: 'description',       label: 'Désignation',      always: true },
  { id: 'montant',           label: 'Montant',          always: true },
  { id: 'montantRealise',    label: 'Mandaté',          always: false },
  { id: 'engagement',        label: 'Engagé',           always: false },
  { id: 'engagementNonRecu', label: 'ENR',              always: false },
  { id: 'status',            label: 'Statut',           always: false },
  { id: 'annee',             label: 'Année',            always: false },
];

const DEFAULT_VISIBLE = ['type','reference','parent','compte','dateCommande','description','montant','montantRealise','status'];
const LS_KEY = 'hospifinance_details_columns';

function loadVisibleCols() {
  try {
    const saved = JSON.parse(localStorage.getItem(LS_KEY));
    if (Array.isArray(saved)) return new Set(saved);
  } catch { /* noop */ }
  return new Set(DEFAULT_VISIBLE);
}

// ── Champ de recherche ─────────────────────────────────────────────────────────

const SEARCH_FIELDS = [
  { id: 'all',         label: 'Tous les champs' },
  { id: 'reference',   label: 'Référence' },
  { id: 'parent',      label: 'Fourn. / Projet' },
  { id: 'compte',      label: 'Compte' },
  { id: 'description', label: 'Désignation' },
  { id: 'status',      label: 'Statut' },
];

// ── Composant principal ───────────────────────────────────────────────────────

export default function DetailsCommandes({
  opexOrders = [],
  capexOrders = [],
  suppliers = [],
  projects = [],
}) {
  const [typeFilter, setTypeFilter]     = useState('all'); // 'all' | 'opex' | 'capex'
  const [searchQuery, setSearchQuery]   = useState('');
  const [searchField, setSearchField]   = useState('all');
  const [visibleCols, setVisibleCols]   = useState(loadVisibleCols);
  const [showColMenu, setShowColMenu]   = useState(false);
  const [sortField, setSortField]       = useState('dateCommande');
  const [sortDir, setSortDir]           = useState('desc');
  const [page, setPage]                 = useState(0);
  const PAGE_SIZE = 100;

  // Build parent maps
  const supplierById = useMemo(() => {
    const m = {};
    suppliers.forEach(s => { m[String(s.id)] = s.supplier || s.nom || '—'; });
    return m;
  }, [suppliers]);

  const projectById = useMemo(() => {
    const m = {};
    projects.forEach(p => { m[String(p.id)] = p.project || p.name || '—'; });
    return m;
  }, [projects]);

  // Merge orders
  const allOrders = useMemo(() => {
    const opex = opexOrders.map(o => ({
      ...o,
      _type: 'OPEX',
      _parent: o._supplierName || supplierById[String(o.parentId)] || '—',
    }));
    const capex = capexOrders.map(o => ({
      ...o,
      _type: 'CAPEX',
      _parent: o._supplierName || projectById[String(o.parentId)] || '—',
    }));
    return [...opex, ...capex];
  }, [opexOrders, capexOrders, supplierById, projectById]);

  const searchInOrder = useCallback((o, q, field) => {
    const lq = q.toLowerCase();
    const check = (v) => String(v || '').toLowerCase().includes(lq);
    if (field === 'reference')   return check(o.reference) || check(o.numeroMarche);
    if (field === 'parent')      return check(o._parent);
    if (field === 'compte')      return check(o.compteOrdonnateur);
    if (field === 'description') return check(o.description) || check(o.designation);
    if (field === 'status')      return check(o.status) || check(o.etatSage);
    // all
    return check(o.reference) || check(o.numeroMarche) || check(o._parent)
        || check(o.compteOrdonnateur) || check(o.description) || check(o.designation)
        || check(o.status) || check(o.etatSage) || check(o.montant);
  }, []);

  const filtered = useMemo(() => {
    let rows = allOrders;
    if (typeFilter !== 'all') {
      rows = rows.filter(o => o._type.toLowerCase() === typeFilter);
    }
    if (searchQuery.trim()) {
      rows = rows.filter(o => searchInOrder(o, searchQuery.trim(), searchField));
    }
    // Sort
    rows = [...rows].sort((a, b) => {
      let va, vb;
      if (sortField === 'parent')      { va = a._parent;              vb = b._parent; }
      else if (sortField === 'type')   { va = a._type;                vb = b._type; }
      else                             { va = a[sortField] ?? '';     vb = b[sortField] ?? ''; }
      const cmp = typeof va === 'number'
        ? va - vb
        : String(va).localeCompare(String(vb));
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return rows;
  }, [allOrders, typeFilter, searchQuery, searchField, sortField, sortDir, searchInOrder]);

  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  const toggleCol = (id) => {
    setVisibleCols(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      localStorage.setItem(LS_KEY, JSON.stringify([...next]));
      return next;
    });
  };

  const sortHeader = (field, label) => {
    const active = sortField === field;
    return (
      <th
        key={field}
        className="px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer hover:text-gray-700 select-none whitespace-nowrap"
        onClick={() => { setSortField(field); setSortDir(d => active ? (d === 'asc' ? 'desc' : 'asc') : 'asc'); setPage(0); }}
      >
        <span className="flex items-center gap-0.5">
          {label}
          {active && (sortDir === 'asc' ? <ChevronUp size={10} /> : <ChevronDown size={10} />)}
        </span>
      </th>
    );
  };

  const colVisible = (id) => {
    const col = ALL_COLUMNS.find(c => c.id === id);
    return col?.always || visibleCols.has(id);
  };

  const countOpex  = opexOrders.length;
  const countCapex = capexOrders.length;

  const exportToExcel = useCallback(() => {
    const rows = filtered.map(o => ({
      'Type':           o._type,
      'Fourn. / Projet': o._parent,
      'Compte':         o.compteOrdonnateur || '',
      'Référence':      o.reference || o.numeroMarche || '',
      'Date commande':  o.dateCommande || '',
      'Date réception': o.dateReception || '',
      'Désignation':    o.description || o.designation || '',
      'Montant':        o.montant || 0,
      'Mandaté':        o.montantRealise || 0,
      'Engagé':         o.engagement || 0,
      'ENR':            o.engagementNonRecu || 0,
      'Statut':         o.etatSage || o.status || '',
      'Année':          o.annee || '',
    }));
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, 'Commandes');
    const date = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `commandes_${date}.xlsx`);
  }, [filtered]);

  return (
    <div className="space-y-4">
      {/* Barre d'outils */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Filtres OPEX / CAPEX */}
          <div className="flex items-center gap-1">
            {[
              { id: 'all',   label: `Tout (${allOrders.length})` },
              { id: 'opex',  label: `OPEX (${countOpex})`,  color: 'indigo' },
              { id: 'capex', label: `CAPEX (${countCapex})`, color: 'emerald' },
            ].map(f => (
              <button
                key={f.id}
                onClick={() => { setTypeFilter(f.id); setPage(0); }}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                  typeFilter === f.id
                    ? f.id === 'opex'  ? 'bg-indigo-600 text-white border-indigo-600'
                    : f.id === 'capex' ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-gray-800 text-white border-gray-800'
                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Recherche */}
          <div className="flex items-center gap-1.5 flex-1 min-w-[280px]">
            <select
              value={searchField}
              onChange={e => { setSearchField(e.target.value); setPage(0); }}
              className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-400 shrink-0"
            >
              {SEARCH_FIELDS.map(f => (
                <option key={f.id} value={f.id}>{f.label}</option>
              ))}
            </select>
            <div className="relative flex-1">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); setPage(0); }}
                placeholder="Rechercher…"
                className="w-full pl-8 pr-7 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-400"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X size={11} />
                </button>
              )}
            </div>
          </div>

          {/* Export Excel */}
          <button
            onClick={exportToExcel}
            title={`Exporter ${filtered.length} ligne(s) en Excel`}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 border border-emerald-200 bg-white text-emerald-700 rounded-lg hover:bg-emerald-50 transition-colors"
          >
            <Download size={12} />
            Export Excel
          </button>

          {/* Colonnes */}
          <div className="relative ml-auto">
            <button
              onClick={() => setShowColMenu(v => !v)}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 border rounded-lg transition-colors ${
                showColMenu ? 'bg-gray-100 border-gray-300' : 'bg-white border-gray-200 hover:bg-gray-50'
              }`}
            >
              <SlidersHorizontal size={12} />
              Colonnes
            </button>
            {showColMenu && (
              <div className="absolute right-0 top-full mt-1 w-52 bg-white border border-gray-200 rounded-xl shadow-xl z-20 p-3 space-y-1">
                <p className="text-[10px] font-semibold text-gray-500 uppercase mb-2">Afficher / masquer</p>
                {ALL_COLUMNS.filter(c => !c.always).map(col => (
                  <label key={col.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 rounded px-1 py-0.5">
                    <input
                      type="checkbox"
                      checked={visibleCols.has(col.id)}
                      onChange={() => toggleCol(col.id)}
                      className="accent-indigo-600"
                    />
                    <span className="text-xs text-gray-700">{col.label}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Résumé */}
        <div className="text-xs text-gray-500">
          {filtered.length} ligne{filtered.length !== 1 ? 's' : ''} affichée{filtered.length !== 1 ? 's' : ''}
          {searchQuery && ` pour « ${searchQuery} »`}
          {filtered.length > PAGE_SIZE && ` — page ${page + 1} / ${totalPages}`}
        </div>
      </div>

      {/* Tableau */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-left">
                {colVisible('type')              && sortHeader('type',              'Type')}
                {colVisible('reference')         && sortHeader('reference',         'Référence')}
                {colVisible('parent')            && sortHeader('parent',            'Fourn. / Projet')}
                {colVisible('compte')            && sortHeader('compte',            'Compte')}
                {colVisible('dateCommande')      && sortHeader('dateCommande',      'Date cmd')}
                {colVisible('dateReception')     && sortHeader('dateReception',     'Date réc.')}
                {colVisible('annee')             && sortHeader('annee',             'Année')}
                {colVisible('description')       && <th className="px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Désignation</th>}
                {colVisible('montant')           && sortHeader('montant',           'Montant')}
                {colVisible('montantRealise')    && sortHeader('montantRealise',    'Mandaté')}
                {colVisible('engagement')        && sortHeader('engagement',        'Engagé')}
                {colVisible('engagementNonRecu') && sortHeader('engagementNonRecu', 'ENR')}
                {colVisible('status')            && sortHeader('status',            'Statut')}
              </tr>
            </thead>
            <tbody>
              {paged.length === 0 && (
                <tr>
                  <td colSpan={ALL_COLUMNS.length} className="py-12 text-center text-gray-400 text-sm italic">
                    Aucune commande ne correspond aux filtres sélectionnés.
                  </td>
                </tr>
              )}
              {paged.map((o, i) => (
                <tr key={`${o._type}-${o.id}-${i}`} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  {colVisible('type') && (
                    <td className="px-3 py-2">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        o._type === 'OPEX' ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'
                      }`}>{o._type}</span>
                    </td>
                  )}
                  {colVisible('reference') && (
                    <td className="px-3 py-2 font-mono text-gray-500 whitespace-nowrap">
                      {o.reference || o.numeroMarche || '—'}
                    </td>
                  )}
                  {colVisible('parent') && (
                    <td className="px-3 py-2 text-gray-800 font-medium max-w-[180px] truncate" title={o._parent}>
                      {o._parent}
                    </td>
                  )}
                  {colVisible('compte') && (
                    <td className="px-3 py-2 font-mono text-gray-500 text-[10px] whitespace-nowrap">
                      {o.compteOrdonnateur || '—'}
                    </td>
                  )}
                  {colVisible('dateCommande') && (
                    <td className="px-3 py-2 text-gray-500 whitespace-nowrap">
                      {o.dateCommande || o.datePassation || '—'}
                    </td>
                  )}
                  {colVisible('dateReception') && (
                    <td className="px-3 py-2 text-gray-500 whitespace-nowrap">
                      {o.dateReception || o.dateImputation || '—'}
                    </td>
                  )}
                  {colVisible('annee') && (
                    <td className="px-3 py-2 text-gray-500 text-center">
                      {o.annee || (o.dateReception ? o.dateReception.slice(0, 4) : '—')}
                    </td>
                  )}
                  {colVisible('description') && (
                    <td className="px-3 py-2 text-gray-700 max-w-[240px] truncate" title={o.description || o.designation}>
                      {o.description || o.designation || '—'}
                    </td>
                  )}
                  {colVisible('montant') && (
                    <td className="px-3 py-2 text-right font-semibold text-gray-800 whitespace-nowrap">
                      {o.montant != null ? fmt(o.montant) : '—'}
                    </td>
                  )}
                  {colVisible('montantRealise') && (
                    <td className="px-3 py-2 text-right text-indigo-700 whitespace-nowrap">
                      {o.montantRealise != null ? fmt(o.montantRealise) : '—'}
                    </td>
                  )}
                  {colVisible('engagement') && (
                    <td className="px-3 py-2 text-right text-amber-700 whitespace-nowrap">
                      {(o.engagement ?? o.engagementNonRecu) != null && (o.engagement ?? o.engagementNonRecu) !== 0
                        ? fmt(o.engagement ?? o.engagementNonRecu) : '—'}
                    </td>
                  )}
                  {colVisible('engagementNonRecu') && (
                    <td className="px-3 py-2 text-right text-orange-700 whitespace-nowrap">
                      {o.engagementNonRecu != null ? fmt(o.engagementNonRecu) : '—'}
                    </td>
                  )}
                  {colVisible('status') && (
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-medium">
                        {o.status || o.etatSage || '—'}
                      </span>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50">
            <span className="text-xs text-gray-500">
              {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} sur {filtered.length}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className="px-2.5 py-1 text-xs border border-gray-200 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                ← Préc.
              </button>
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                const p = page <= 3 ? i : page >= totalPages - 4 ? totalPages - 7 + i : page - 3 + i;
                if (p < 0 || p >= totalPages) return null;
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`px-2.5 py-1 text-xs border rounded-lg ${
                      p === page ? 'bg-indigo-600 text-white border-indigo-600' : 'border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    {p + 1}
                  </button>
                );
              })}
              <button
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="px-2.5 py-1 text-xs border border-gray-200 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Suiv. →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
