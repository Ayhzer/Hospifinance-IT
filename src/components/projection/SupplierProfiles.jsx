import { useState, useMemo } from 'react';
import { Building2, Search, ChevronDown, ChevronRight, ChevronUp } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

const fmt = formatCurrency;
const NOM_MOIS_SHORT = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];

const PATTERN_STYLE = {
  PIC_UNIQUE:    'bg-red-100 text-red-700 border-red-200',
  TRIMESTRIEL:   'bg-blue-100 text-blue-700 border-blue-200',
  PIC_FIN_ANNEE: 'bg-orange-100 text-orange-700 border-orange-200',
  UNIFORME:      'bg-green-100 text-green-700 border-green-200',
  IRREGULIER:    'bg-gray-100 text-gray-600 border-gray-200',
  PONCTUEL:      'bg-purple-100 text-purple-700 border-purple-200',
};

const FIAB_STYLE = {
  HAUTE:   { badge: 'bg-green-100 text-green-700', label: 'HAUTE' },
  MOYENNE: { badge: 'bg-amber-100 text-amber-700', label: 'MOYENNE' },
  FAIBLE:  { badge: 'bg-red-100 text-red-700',     label: 'FAIBLE' },
};

const CoeffBar = ({ coefficients }) => {
  const max = Math.max(...Object.values(coefficients), 0.01);
  return (
    <div className="flex items-end gap-[2px] h-8">
      {Array.from({ length: 12 }, (_, i) => {
        const m = i + 1;
        const v = coefficients[m] || 0;
        const h = Math.max(2, Math.round((v / max) * 28));
        const isPic = v === max;
        return (
          <div
            key={m}
            title={`${NOM_MOIS_SHORT[i]} : ${(v * 100).toFixed(1)} %`}
            className={`w-3 rounded-t transition-all ${isPic ? 'bg-indigo-500' : 'bg-indigo-200'}`}
            style={{ height: `${h}px` }}
          />
        );
      })}
    </div>
  );
};

const PatternDistrib = ({ profils }) => {
  const counts = {};
  for (const p of profils) counts[p.pattern] = (counts[p.pattern] || 0) + 1;
  const total = profils.length || 1;
  const ORDER = ['IRREGULIER', 'TRIMESTRIEL', 'PIC_FIN_ANNEE', 'PIC_UNIQUE', 'UNIFORME', 'PONCTUEL', 'INCONNU'];

  return (
    <div className="flex flex-wrap gap-2">
      {ORDER.filter(p => counts[p]).map(pattern => (
        <div
          key={pattern}
          className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border text-xs font-medium ${PATTERN_STYLE[pattern] || 'bg-gray-100 text-gray-500 border-gray-200'}`}
        >
          <span>{pattern.replace('_', ' ')}</span>
          <span className="font-bold">{counts[pattern]}</span>
          <span className="opacity-60">({((counts[pattern] / total) * 100).toFixed(0)} %)</span>
        </div>
      ))}
    </div>
  );
};

export default function SupplierProfiles({ result }) {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState('total_moyen_annuel');
  const [sortDir, setSortDir] = useState('desc');
  const [filterPattern, setFilterPattern] = useState('');
  const [filterFiabilite, setFilterFiabilite] = useState('');
  const [expandedRow, setExpandedRow] = useState(null);

  const handleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  const filtered = useMemo(() => {
    const profils = result?.profils || [];
    let list = [...profils];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(p => p.fournisseur.toLowerCase().includes(q) || p.compte.includes(q));
    }
    if (filterPattern) list = list.filter(p => p.pattern === filterPattern);
    if (filterFiabilite) list = list.filter(p => p.fiabilite === filterFiabilite);

    list.sort((a, b) => {
      const va = a[sortKey] ?? 0;
      const vb = b[sortKey] ?? 0;
      const cmp = typeof va === 'string' ? va.localeCompare(vb) : va - vb;
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [result, search, filterPattern, filterFiabilite, sortKey, sortDir]);

  if (!result) return null;

  const allProfils = result.profils || [];

  const SortHeader = ({ label, k, className = '' }) => (
    <th
      onClick={() => handleSort(k)}
      className={`py-2.5 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer hover:text-indigo-600 select-none ${className}`}
    >
      <span className="flex items-center gap-1 justify-end">
        {label}
        {sortKey === k
          ? sortDir === 'asc'
            ? <ChevronUp size={11} />
            : <ChevronDown size={11} />
          : null}
      </span>
    </th>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Building2 size={15} className="text-indigo-600" />
        <h3 className="text-sm font-semibold text-gray-800">Profils fournisseurs</h3>
        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{allProfils.length} profils</span>
      </div>

      {/* Distribution patterns */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
        <p className="text-xs font-medium text-gray-600 mb-2">Distribution des patterns</p>
        <PatternDistrib profils={allProfils} />
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[180px] max-w-[280px]">
          <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Chercher un fournisseur…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-400"
          />
        </div>
        <select
          value={filterPattern}
          onChange={e => setFilterPattern(e.target.value)}
          className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-400"
        >
          <option value="">Tous patterns</option>
          {['PIC_UNIQUE', 'TRIMESTRIEL', 'PIC_FIN_ANNEE', 'UNIFORME', 'IRREGULIER', 'PONCTUEL'].map(p => (
            <option key={p} value={p}>{p.replace('_', ' ')}</option>
          ))}
        </select>
        <select
          value={filterFiabilite}
          onChange={e => setFilterFiabilite(e.target.value)}
          className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-400"
        >
          <option value="">Toutes fiabilités</option>
          {['HAUTE', 'MOYENNE', 'FAIBLE'].map(f => (
            <option key={f} value={f}>{f}</option>
          ))}
        </select>
        <span className="text-xs text-gray-400 ml-auto">{filtered.length} résultat{filtered.length > 1 ? 's' : ''}</span>
      </div>

      {/* Tableau */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="py-2.5 px-4 w-8" />
                <th className="text-left py-2.5 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Fournisseur</th>
                <th className="text-left py-2.5 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Compte</th>
                <SortHeader label="Moy. annuelle" k="total_moyen_annuel" className="text-right" />
                <th className="text-center py-2.5 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Pattern</th>
                <th className="text-center py-2.5 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Fiabilité</th>
                <SortHeader label="Années" k="nb_annees_historique" className="text-right" />
                <th className="text-center py-2.5 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Mois pic</th>
                <th className="py-2.5 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Saisonnalité</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => {
                const isOpen = expandedRow === p.key;
                return [
                  <tr
                    key={p.key}
                    onClick={() => setExpandedRow(prev => prev === p.key ? null : p.key)}
                    className="border-b border-gray-100 last:border-0 hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <td className="py-2.5 px-4">
                      {isOpen
                        ? <ChevronDown size={12} className="text-gray-400" />
                        : <ChevronRight size={12} className="text-gray-400" />}
                    </td>
                    <td className="py-2.5 px-4 font-medium text-gray-800 max-w-[180px] truncate">{p.fournisseur}</td>
                    <td className="py-2.5 px-4 text-gray-500">{p.compte}</td>
                    <td className="py-2.5 px-4 text-right font-semibold text-gray-700">{fmt(p.total_moyen_annuel)}</td>
                    <td className="py-2.5 px-4 text-center">
                      <span className={`inline-block px-1.5 py-0.5 rounded border text-[10px] font-medium ${PATTERN_STYLE[p.pattern] || 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                        {p.pattern?.replace('_', ' ') || '—'}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${FIAB_STYLE[p.fiabilite]?.badge || 'bg-gray-100 text-gray-400'}`}>
                        {p.fiabilite || '—'}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-right text-gray-600">{p.nb_annees_historique}</td>
                    <td className="py-2.5 px-4 text-center text-gray-600">
                      {NOM_MOIS_SHORT[(p.mois_pic || 1) - 1]}
                      <span className="ml-1 text-gray-400">({((p.pct_pic || 0) * 100).toFixed(0)} %)</span>
                    </td>
                    <td className="py-2.5 px-4">
                      <CoeffBar coefficients={p.coefficients_mensuels || {}} />
                    </td>
                  </tr>,

                  isOpen && (
                    <tr key={`${p.key}-detail`}>
                      <td colSpan={9} className="bg-indigo-50/40 px-8 py-3">
                        <div className="flex flex-wrap gap-6">
                          {/* Tableau coefficients détaillés */}
                          <div>
                            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                              Coefficients mensuels
                            </p>
                            <div className="flex gap-1">
                              {Array.from({ length: 12 }, (_, i) => {
                                const m = i + 1;
                                const v = p.coefficients_mensuels?.[m] || 0;
                                const isPic = m === p.mois_pic;
                                return (
                                  <div key={m} className={`flex flex-col items-center px-1.5 py-1 rounded text-[9px] ${isPic ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-200 text-gray-600'}`}>
                                    <span className="font-medium">{NOM_MOIS_SHORT[i]}</span>
                                    <span className={`font-bold ${isPic ? 'text-white' : 'text-gray-800'}`}>
                                      {(v * 100).toFixed(0)} %
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* Métriques */}
                          <div className="flex flex-col gap-1 text-xs">
                            <div className="flex gap-2">
                              <span className="text-gray-500">CV mensuel :</span>
                              <span className="font-semibold text-gray-800">{(p.cv_mensuel || 0).toFixed(2)}</span>
                            </div>
                            <div className="flex gap-2">
                              <span className="text-gray-500">CV annuel :</span>
                              <span className="font-semibold text-gray-800">{(p.cv || 0).toFixed(2)}</span>
                            </div>
                            <div className="flex gap-2">
                              <span className="text-gray-500">Réalisé YTD :</span>
                              <span className="font-semibold text-gray-800">{fmt(p.balanceRealisee)}</span>
                            </div>
                            <div className="flex gap-2">
                              <span className="text-gray-500">ENR brut :</span>
                              <span className="font-semibold text-gray-800">{fmt(p.enrBrut)}</span>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ),
                ];
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
