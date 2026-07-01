import { useState, useMemo } from 'react';
import { Plus, Pencil, Trash2, Check, Search } from 'lucide-react';
import { listFamilles } from '../../constants/analytiqueConstants';
import { lineMatchesRule } from '../../utils/reclassementEngine';
import OrdersPreview from './OrdersPreview';

const EMPTY_FORM = { nom: '', famille: '', sousCategorie: '' };

export default function ReferentielFournisseurs({ referentiel = [], nomenclature = [], orders = [], onAdd, onUpdate, onDelete }) {
  const FAMILLES = useMemo(() => listFamilles(nomenclature), [nomenclature]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [search, setSearch] = useState('');

  const sousCats = (famille) => {
    const raw = nomenclature.find(n => n.famille === famille)?.sousCategoriesDisponibles || [];
    return raw.map(s => (typeof s === 'string' ? s : s.label));
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return referentiel.filter(f =>
      !q || f.nom.toLowerCase().includes(q) || (f.famille || '').toLowerCase().includes(q)
    );
  }, [referentiel, search]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nom.trim()) return;
    await onAdd({ nom: form.nom.trim(), famille: form.famille || FAMILLES[0], sousCategorie: form.sousCategorie });
    setForm(EMPTY_FORM);
    setShowForm(false);
  };

  const startEdit = (f) => {
    setEditingId(f.id);
    setEditForm({ nom: f.nom, famille: f.famille, sousCategorie: f.sousCategorie || '' });
  };

  const saveEdit = async (id) => {
    await onUpdate(id, {
      nom: editForm.nom.trim(),
      famille: editForm.famille,
      sousCategorie: editForm.sousCategorie,
    });
    setEditingId(null);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-gray-800">Référentiel fournisseurs</h3>
          <p className="text-xs text-gray-500 mt-0.5">Niveau 1 — Reclassement prioritaire par correspondance exacte sur le nom du fournisseur.</p>
        </div>
        <button
          onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-lg"
        >
          <Plus size={13} /> Ajouter fournisseur
        </button>
      </div>

      {/* Recherche */}
      <div className="relative">
        <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Rechercher un fournisseur..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Nom exact du fournisseur (tel qu&apos;il apparaît dans la comptabilité source)
            </label>
            <input
              type="text"
              required
              placeholder="Ex: MICROSOFT FRANCE SAS"
              value={form.nom}
              onChange={e => setForm(f => ({ ...f, nom: e.target.value }))}
              className="w-full text-xs border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Famille analytique</label>
              <select
                value={form.famille || FAMILLES[0]}
                onChange={e => setForm(f => ({ ...f, famille: e.target.value, sousCategorie: '' }))}
                className="w-full text-xs border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {FAMILLES.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Sous-catégorie</label>
              <select
                value={form.sousCategorie}
                onChange={e => setForm(f => ({ ...f, sousCategorie: e.target.value }))}
                className="w-full text-xs border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">— Aucune —</option>
                {sousCats(form.famille).map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-lg flex items-center gap-1">
              <Check size={13} /> Ajouter
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="px-3 py-1.5 bg-white border border-gray-300 text-gray-600 text-xs rounded-lg">
              Annuler
            </button>
          </div>
        </form>
      )}

      {filtered.length === 0 && (
        <div className="text-center py-8 text-gray-400 text-sm">
          {referentiel.length === 0
            ? 'Référentiel vide — ajoutez des fournisseurs pour activer le niveau 1 du moteur.'
            : 'Aucun résultat pour cette recherche.'}
        </div>
      )}

      <div className="space-y-1">
        {filtered.map(f => {
          const isEditing = editingId === f.id;
          return (
            <div key={f.id} className={`border rounded-lg p-3 ${isEditing ? 'bg-yellow-50 border-yellow-300' : 'bg-white border-gray-200 hover:border-blue-200'}`}>
              {isEditing && editForm ? (
                <div className="space-y-3">
                  <input
                    type="text"
                    value={editForm.nom}
                    onChange={e => setEditForm(f2 => ({ ...f2, nom: e.target.value }))}
                    className="w-full text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={editForm.famille}
                      onChange={e => setEditForm(f2 => ({ ...f2, famille: e.target.value, sousCategorie: '' }))}
                      className="text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      {FAMILLES.map(fa => <option key={fa} value={fa}>{fa}</option>)}
                    </select>
                    <select
                      value={editForm.sousCategorie}
                      onChange={e => setEditForm(f2 => ({ ...f2, sousCategorie: e.target.value }))}
                      className="text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="">— Aucune —</option>
                      {sousCats(editForm.famille).map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => saveEdit(f.id)} className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded flex items-center gap-1">
                      <Check size={11} /> Enregistrer
                    </button>
                    <button onClick={() => setEditingId(null)} className="px-2 py-1 bg-white border border-gray-300 text-gray-600 text-xs rounded">
                      Annuler
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-semibold text-gray-800 truncate block">{f.nom}</span>
                      <span className="text-xs text-gray-500">
                        {f.famille}{f.sousCategorie ? ` › ${f.sousCategorie}` : ''}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button onClick={() => startEdit(f)} className="p-1 text-gray-400 hover:text-blue-600">
                        <Pencil size={13} />
                      </button>
                      <button onClick={() => onDelete(f.id)} className="p-1 text-gray-400 hover:text-red-600">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                  <OrdersPreview orders={orders.filter(o => lineMatchesRule(o, 'referentiel', f))} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-xs text-gray-400">
        {filtered.length} fournisseur{filtered.length > 1 ? 's' : ''}{search ? ` sur ${referentiel.length}` : ''}
      </p>
    </div>
  );
}
