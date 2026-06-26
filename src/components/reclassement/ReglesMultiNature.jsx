import { useState, useMemo } from 'react';
import { Plus, Pencil, Trash2, GripVertical, Check, ChevronUp, ChevronDown, Search } from 'lucide-react';
import { FAMILLE_ANALYTIQUE } from '../../constants/analytiqueConstants';

const FAMILLES = Object.values(FAMILLE_ANALYTIQUE);
const CHAMPS = ['COMPTE', 'FOURNISSEUR', 'DESIGNATION'];
const OPERATEURS = ['=', 'CONTIENT='];

const EMPTY_FORM = { label: '', conditions: '', famille: FAMILLES[0], sousCategorie: '' };

const ConditionBuilder = ({ value, onChange }) => {
  const [clauses, setClauses] = useState(() => {
    if (!value) return [{ champ: 'DESIGNATION', operateur: 'CONTIENT=', valeur: '' }];
    return value.split('|').map(c => {
      const m = c.trim().match(/^([A-Z_]+)\s+(CONTIENT=|=)(.+)$/i);
      return m ? { champ: m[1].toUpperCase(), operateur: m[2].toUpperCase(), valeur: m[3].trim() } : { champ: 'DESIGNATION', operateur: 'CONTIENT=', valeur: c.trim() };
    });
  });

  const update = (newClauses) => {
    setClauses(newClauses);
    const str = newClauses.map(c => `${c.champ} ${c.operateur}${c.valeur}`).join(' | ');
    onChange(str);
  };

  const addClause = () => update([...clauses, { champ: 'DESIGNATION', operateur: 'CONTIENT=', valeur: '' }]);
  const removeClause = (i) => update(clauses.filter((_, idx) => idx !== i));
  const setClause = (i, patch) => update(clauses.map((c, idx) => idx === i ? { ...c, ...patch } : c));

  return (
    <div className="space-y-2">
      {clauses.map((c, i) => (
        <div key={i} className="flex items-center gap-1.5 flex-wrap">
          {i > 0 && <span className="text-xs font-bold text-orange-600 px-1">OU</span>}
          <select value={c.champ} onChange={e => setClause(i, { champ: e.target.value })}
            className="text-xs border border-gray-300 rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500">
            {CHAMPS.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
          <select value={c.operateur} onChange={e => setClause(i, { operateur: e.target.value })}
            className="text-xs border border-gray-300 rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500">
            {OPERATEURS.map(o => <option key={o} value={o}>{o === '=' ? 'égal à' : 'contient'}</option>)}
          </select>
          <input type="text" value={c.valeur} onChange={e => setClause(i, { valeur: e.target.value })}
            placeholder="valeur"
            className="text-xs border border-gray-300 rounded px-2 py-1 w-32 focus:outline-none focus:ring-1 focus:ring-blue-500" />
          {clauses.length > 1 && (
            <button type="button" onClick={() => removeClause(i)} className="text-red-400 hover:text-red-600 text-xs">✕</button>
          )}
        </div>
      ))}
      <button type="button" onClick={addClause} className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1">
        <Plus size={11} /> Ajouter condition (OU)
      </button>
    </div>
  );
};

export default function ReglesMultiNature({ regles = [], nomenclature = [], onAdd, onUpdate, onDelete, onReorder }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [search, setSearch] = useState('');

  const sousCategoriesPour = (famille) => {
    const entry = nomenclature.find(n => n.famille === famille);
    const raw = entry?.sousCategoriesDisponibles || [];
    return raw.map(s => (typeof s === 'string' ? s : s.label));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.conditions.trim()) return;
    await onAdd({ label: form.label, conditions: form.conditions, famille: form.famille, sousCategorie: form.sousCategorie });
    setForm(EMPTY_FORM);
    setShowForm(false);
  };

  const startEdit = (regle) => {
    setEditingId(regle.id);
    setEditForm({ label: regle.label, conditions: regle.conditions || '', famille: regle.famille, sousCategorie: regle.sousCategorie || '' });
  };

  const saveEdit = async (id) => {
    await onUpdate(id, editForm);
    setEditingId(null);
  };

  const sorted = useMemo(() => {
    const q = search.toLowerCase();
    return [...regles]
      .filter(r => !q ||
        (r.label || '').toLowerCase().includes(q) ||
        (r.conditions || '').toLowerCase().includes(q) ||
        (r.famille || '').toLowerCase().includes(q))
      .sort((a, b) => (a.priority ?? 999) - (b.priority ?? 999));
  }, [regles, search]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-gray-800">Règles multi-nature (contextuelles)</h3>
          <p className="text-xs text-gray-500 mt-0.5">Niveau 2 — Conditions sur le compte, fournisseur ou désignation (évaluées par priorité).</p>
        </div>
        <button
          onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-lg"
        >
          <Plus size={13} /> Nouvelle règle
        </button>
      </div>

      <div className="relative">
        <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Rechercher par libellé, condition, famille..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Libellé de la règle</label>
            <input
              type="text"
              required
              placeholder="Ex: HON Informatique → Cybersécurité si SOC"
              value={form.label}
              onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
              className="w-full text-xs border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Conditions (SI l'une de ces conditions est vraie)</label>
            <ConditionBuilder
              value={form.conditions}
              onChange={val => setForm(f => ({ ...f, conditions: val }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Famille analytique</label>
              <select
                value={form.famille}
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
                {sousCategoriesPour(form.famille).map(s => <option key={s} value={s}>{s}</option>)}
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

      {sorted.length === 0 && (
        <div className="text-center py-8 text-gray-400 text-sm">Aucune règle contextuelle — cliquez sur "Nouvelle règle" pour en créer une.</div>
      )}

      <div className="space-y-1">
        {sorted.map((regle, index) => {
          const isEditing = editingId === regle.id;
          return (
            <div key={regle.id} className={`border rounded-lg p-3 ${isEditing ? 'bg-yellow-50 border-yellow-300' : 'bg-white border-gray-200 hover:border-blue-200'}`}>
              {isEditing && editForm ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={editForm.label}
                    onChange={e => setEditForm(f => ({ ...f, label: e.target.value }))}
                    className="w-full text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="Libellé"
                  />
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Conditions :</p>
                    <ConditionBuilder
                      value={editForm.conditions}
                      onChange={val => setEditForm(f => ({ ...f, conditions: val }))}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={editForm.famille}
                      onChange={e => setEditForm(f => ({ ...f, famille: e.target.value, sousCategorie: '' }))}
                      className="text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      {FAMILLES.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                    <select
                      value={editForm.sousCategorie}
                      onChange={e => setEditForm(f => ({ ...f, sousCategorie: e.target.value }))}
                      className="text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="">— Aucune —</option>
                      {sousCategoriesPour(editForm.famille).map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => saveEdit(regle.id)} className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded flex items-center gap-1">
                      <Check size={11} /> Enregistrer
                    </button>
                    <button onClick={() => setEditingId(null)} className="px-2 py-1 bg-white border border-gray-300 text-gray-600 text-xs rounded">Annuler</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3">
                  <GripVertical size={14} className="text-gray-300 flex-shrink-0 mt-0.5 cursor-grab" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-xs font-medium text-gray-700">{regle.label}</span>
                      <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-100 text-xs rounded">
                        {regle.famille}{regle.sousCategorie ? ` › ${regle.sousCategorie}` : ''}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 font-mono truncate" title={regle.conditions}>{regle.conditions}</p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => index > 0 && onReorder(index, index - 1)} disabled={index === 0} className="p-1 text-gray-300 hover:text-gray-600 disabled:opacity-30">
                      <ChevronUp size={13} />
                    </button>
                    <button onClick={() => index < sorted.length - 1 && onReorder(index, index + 1)} disabled={index === sorted.length - 1} className="p-1 text-gray-300 hover:text-gray-600 disabled:opacity-30">
                      <ChevronDown size={13} />
                    </button>
                    <button onClick={() => startEdit(regle)} className="p-1 text-gray-400 hover:text-blue-600">
                      <Pencil size={13} />
                    </button>
                    <button onClick={() => onDelete(regle.id)} className="p-1 text-gray-400 hover:text-red-600">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
