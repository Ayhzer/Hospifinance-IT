import { useState, useEffect } from 'react';
import { Save, X, Pencil, Plus, Trash2, AlertTriangle } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';
import { normalizeCompte } from '../../utils/compte';

const API_URL = import.meta.env.VITE_API_URL;

/** Pousse un budget vers l'API (mode serveur). Best-effort : upsert par compte. */
const putBudget = async (compte, budget) => {
  if (!API_URL) return;
  const token = localStorage.getItem('authToken');
  const res = await fetch(`${API_URL}/eprd/${encodeURIComponent(compte)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ budgetEPRD: budget }),
  });
  if (!res.ok) throw new Error(`Erreur serveur: ${res.status}`);
};

export default function EprdBudgetEditor({ eprd, annee, knownComptes = [], embedded = false, onChange, onClose }) {
  const knownMap = new Map(knownComptes.map(k => [normalizeCompte(k.compte), k]));
  const [rows, setRows]           = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving]       = useState(false);
  const [msg, setMsg]             = useState(null);

  // Formulaire d'ajout de compte (budget par compte uniquement — la nature/famille
  // relève du moteur de reclassement, pas de l'EPRD).
  const [newCompte, setNewCompte]   = useState('');
  const [newLibelle, setNewLibelle] = useState('');
  const [newBudget, setNewBudget]   = useState('');

  useEffect(() => {
    setRows(eprd.map(e => ({ ...e })));
  }, [eprd]);

  const commit = (updated) => {
    setRows(updated);
    onChange?.(updated);
  };

  const startEdit = (compte, current) => {
    setEditingId(compte);
    setEditValue(String(current));
    setMsg(null);
  };
  const cancelEdit = () => { setEditingId(null); setEditValue(''); };

  const saveRow = async (compte) => {
    const budget = parseFloat(editValue);
    if (isNaN(budget) || budget < 0) {
      setMsg({ type: 'error', text: 'Montant invalide' });
      return;
    }
    setSaving(true);
    try {
      await putBudget(compte, budget);
      commit(rows.map(r => r.compteOrdonnateur === compte ? { ...r, budgetEPRD: budget } : r));
      setMsg({ type: 'ok', text: 'Budget sauvegardé' });
      setEditingId(null);
    } catch (err) {
      setMsg({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  };

  const addRow = async () => {
    const compte = normalizeCompte(newCompte);
    const budget = parseFloat(newBudget);
    if (!compte) { setMsg({ type: 'error', text: 'Le compte ordonnateur est obligatoire' }); return; }
    if (rows.some(r => normalizeCompte(r.compteOrdonnateur) === compte)) {
      setMsg({ type: 'error', text: 'Ce compte existe déjà' });
      return;
    }
    if (isNaN(budget) || budget < 0) { setMsg({ type: 'error', text: 'Montant invalide' }); return; }
    setSaving(true);
    try {
      await putBudget(compte, budget);
      const row = {
        compteOrdonnateur: compte,
        libelleCompte: newLibelle.trim() || knownMap.get(compte)?.libelle || compte,
        budgetEPRD: budget,
        annee: annee ? Number(annee) : undefined,
      };
      commit([...rows, row]);
      setNewCompte(''); setNewLibelle(''); setNewBudget('');
      setMsg({ type: 'ok', text: 'Compte ajouté' });
    } catch (err) {
      setMsg({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  };

  const removeRow = (compte) => {
    commit(rows.filter(r => r.compteOrdonnateur !== compte));
  };

  const total = rows.reduce((s, r) => s + (r.budgetEPRD || 0), 0);

  const body = (
    <>
      {msg && (
        <div className={`mx-6 mt-3 px-4 py-2 rounded text-sm font-medium ${msg.type === 'ok' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {msg.text}
        </div>
      )}

      <div className="overflow-y-auto flex-1 px-6 py-4">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-100 text-gray-700 text-xs">
                <th className="text-left px-3 py-2 border">Compte</th>
                <th className="text-left px-3 py-2 border">Libellé</th>
                <th className="text-right px-3 py-2 border w-44">Budget EPRD{annee ? ` ${annee}` : ''}</th>
                <th className="text-center px-3 py-2 border w-20"></th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-3 py-6 text-center text-gray-400 text-sm border">
                    Aucun budget renseigné. Ajoutez vos comptes ci-dessous.
                  </td>
                </tr>
              )}
              {rows.map(r => (
                <tr key={r.compteOrdonnateur} className="border-b hover:bg-gray-50">
                  <td className="px-3 py-2 border font-mono text-xs text-gray-600">{r.compteOrdonnateur}</td>
                  <td className="px-3 py-2 border text-gray-800 text-xs">{r.libelleCompte}</td>
                  <td className="px-3 py-2 border text-right">
                    {editingId === r.compteOrdonnateur ? (
                      <div className="flex items-center gap-1 justify-end">
                        <input
                          type="number"
                          value={editValue}
                          onChange={e => setEditValue(e.target.value)}
                          className="w-32 text-right px-2 py-1 border border-blue-400 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                          autoFocus
                          onKeyDown={e => { if (e.key === 'Enter') saveRow(r.compteOrdonnateur); if (e.key === 'Escape') cancelEdit(); }}
                        />
                        <button onClick={() => saveRow(r.compteOrdonnateur)} disabled={saving} className="text-green-600 hover:text-green-800">
                          <Save size={14} />
                        </button>
                        <button onClick={cancelEdit} className="text-gray-400 hover:text-gray-600">
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <span className="font-semibold text-blue-700">{formatCurrency(r.budgetEPRD || 0)}</span>
                    )}
                  </td>
                  <td className="px-3 py-2 border text-center">
                    {editingId !== r.compteOrdonnateur && (
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => startEdit(r.compteOrdonnateur, r.budgetEPRD || 0)} className="text-gray-400 hover:text-blue-500" title="Modifier">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => removeRow(r.compteOrdonnateur)} className="text-gray-400 hover:text-red-500" title="Supprimer">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-100 font-bold border-t-2">
                <td className="px-3 py-2 border" colSpan={2}>TOTAL DSI</td>
                <td className="px-3 py-2 border text-right text-blue-800">{formatCurrency(total)}</td>
                <td className="px-3 py-2 border"></td>
              </tr>
            </tfoot>
          </table>

          {/* Ajout d'un compte */}
          <div className="mt-5 border-t pt-4">
            <p className="text-xs font-semibold text-gray-600 mb-2">Ajouter un compte</p>
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
              <input list="known-comptes" className="sm:col-span-4 px-2 py-1.5 border border-gray-300 rounded text-sm" placeholder="Compte (ex. H61526100)"
                value={newCompte}
                onChange={e => {
                  const v = e.target.value;
                  setNewCompte(v);
                  const k = knownMap.get(normalizeCompte(v));
                  if (k && !newLibelle.trim()) setNewLibelle(k.libelle || '');
                }} />
              <datalist id="known-comptes">
                {knownComptes.map(k => (
                  <option key={k.compte} value={k.compte}>{k.libelle}</option>
                ))}
              </datalist>
              <input className="sm:col-span-4 px-2 py-1.5 border border-gray-300 rounded text-sm" placeholder="Libellé"
                value={newLibelle} onChange={e => setNewLibelle(e.target.value)} />
              <input type="number" className="sm:col-span-3 px-2 py-1.5 border border-gray-300 rounded text-sm text-right" placeholder="Budget"
                value={newBudget} onChange={e => setNewBudget(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') addRow(); }} />
              <button onClick={addRow} disabled={saving}
                className="sm:col-span-1 flex items-center justify-center gap-1 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white rounded px-2 py-1.5 text-sm">
                <Plus size={16} />
              </button>
            </div>
            {newCompte.trim() && knownComptes.length > 0 && !knownMap.has(normalizeCompte(newCompte)) && (
              <p className="mt-2 flex items-center gap-1.5 text-xs text-amber-700">
                <AlertTriangle size={13} />
                Ce compte n’apparaît dans aucune donnée importée — vérifiez le code pour garantir la réconciliation.
              </p>
            )}
          </div>
        </div>
    </>
  );

  if (embedded) return body;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-bold text-gray-800">Budgets EPRD par compte ordonnateur</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        {body}
        <div className="px-6 py-3 border-t flex justify-end">
          <button onClick={onClose} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium">
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
