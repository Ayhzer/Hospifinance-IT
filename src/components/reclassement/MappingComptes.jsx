import { useState, useMemo, Fragment } from 'react';
import { Check, X, Search } from 'lucide-react';
import { listFamilles } from '../../constants/analytiqueConstants';
import { lineMatchesRule } from '../../utils/reclassementEngine';
import OrdersPreview from './OrdersPreview';

export default function MappingComptes({ mappingComptes = [], orders = [], nomenclature = [], onUpdate }) {
  const FAMILLES = useMemo(() => listFamilles(nomenclature), [nomenclature]);
  const [editing, setEditing] = useState(null); // { compte, value }
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return !q ? mappingComptes : mappingComptes.filter(m =>
      m.compte.toLowerCase().includes(q) ||
      (m.libelleCompte || '').toLowerCase().includes(q) ||
      (m.familleDefaut || '').toLowerCase().includes(q)
    );
  }, [mappingComptes, search]);

  const startEdit = (compte, current, libelle) => setEditing({ compte, value: current, libelle });
  const cancelEdit = () => setEditing(null);

  const saveEdit = async () => {
    if (!editing) return;
    await onUpdate(editing.compte, editing.value, editing.libelle);
    setEditing(null);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-base font-semibold text-gray-800">Mapping comptes ordonnateurs</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Famille analytique affectée par défaut à chaque compte comptable (niveau 4 — dernier recours avant «&nbsp;Non classé&nbsp;»).
          </p>
        </div>
        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
          {mappingComptes.length} compte{mappingComptes.length > 1 ? 's' : ''}
        </span>
      </div>

      <div className="relative">
        <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Rechercher par compte, libellé, famille..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-50 text-gray-600 text-xs">
              <th className="text-left px-3 py-2 border w-36">Compte</th>
              <th className="text-left px-3 py-2 border">Libellé comptable</th>
              <th className="text-left px-3 py-2 border w-64">Famille analytique par défaut</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(m => {
              const isEditing = editing?.compte === m.compte;
              const matched = orders.filter(o => lineMatchesRule(o, 'mapping', m));
              return (
                <Fragment key={m.compte}>
                <tr className="border-b hover:bg-gray-50">
                  <td className="px-3 py-2 border font-mono text-xs text-gray-500">{m.compte}</td>
                  <td className="px-3 py-2 border text-xs text-gray-700">{m.libelleCompte}</td>
                  <td className="px-3 py-2 border">
                    {isEditing ? (
                      <div className="flex items-center gap-2">
                        <select
                          className="flex-1 text-xs border border-blue-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          value={editing.value}
                          onChange={e => setEditing(prev => ({ ...prev, value: e.target.value }))}
                        >
                          {FAMILLES.map(f => (
                            <option key={f} value={f}>{f}</option>
                          ))}
                        </select>
                        <button onClick={saveEdit} className="text-green-600 hover:text-green-800" title="Enregistrer">
                          <Check size={14} />
                        </button>
                        <button onClick={cancelEdit} className="text-gray-400 hover:text-gray-600" title="Annuler">
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <button
                        className="text-xs text-left w-full px-2 py-1 rounded hover:bg-blue-50 hover:text-blue-700 transition-colors"
                        onClick={() => startEdit(m.compte, m.familleDefaut, m.libelleCompte)}
                      >
                        <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded text-xs">
                          {m.familleDefaut}
                        </span>
                      </button>
                    )}
                  </td>
                </tr>
                <tr>
                  <td colSpan={3} className="border-b border-gray-100 px-3 py-1 bg-gray-50/40">
                    <OrdersPreview orders={matched} />
                  </td>
                </tr>
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-gray-400 italic">
        Cliquez sur une famille pour la modifier. Les comptes et libellés sont en lecture seule (issus du fichier importé).
      </p>
    </div>
  );
}
