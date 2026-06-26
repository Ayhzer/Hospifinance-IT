import { useState, useEffect } from 'react';
import { Save, X, Pencil } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

const API_URL = import.meta.env.VITE_API_URL;
const LS_KEY  = 'hospifinance_eprd';

const loadLocal = () => {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]'); } catch { return []; }
};

const saveLocal = (data) => {
  try { localStorage.setItem(LS_KEY, JSON.stringify(data)); } catch {}
};

export default function EprdBudgetEditor({ eprd, onUpdated, onClose }) {
  const [rows, setRows]         = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving]     = useState(false);
  const [msg, setMsg]           = useState(null);

  useEffect(() => {
    setRows(eprd.map(e => ({ ...e })));
  }, [eprd]);

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
      if (API_URL) {
        const token = localStorage.getItem('authToken');
        const res = await fetch(`${API_URL}/eprd/${encodeURIComponent(compte)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ budgetEPRD: budget }),
        });
        if (!res.ok) throw new Error(`Erreur serveur: ${res.status}`);
      } else {
        const stored = loadLocal();
        const updated = stored.map(e => e.compteOrdonnateur === compte ? { ...e, budgetEPRD: budget } : e);
        saveLocal(updated);
      }
      setRows(prev => prev.map(r => r.compteOrdonnateur === compte ? { ...r, budgetEPRD: budget } : r));
      setMsg({ type: 'ok', text: 'Budget sauvegardé' });
      if (onUpdated) onUpdated(compte, budget);
      setEditingId(null);
    } catch (err) {
      setMsg({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  };

  const total = rows.reduce((s, r) => s + (r.budgetEPRD || 0), 0);

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-bold text-gray-800">Budgets EPRD par compte ordonnateur</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

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
                <th className="text-left px-3 py-2 border">Famille</th>
                <th className="text-right px-3 py-2 border w-44">Budget EPRD 2026</th>
                <th className="text-center px-3 py-2 border w-16"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.compteOrdonnateur} className="border-b hover:bg-gray-50">
                  <td className="px-3 py-2 border font-mono text-xs text-gray-600">{r.compteOrdonnateur}</td>
                  <td className="px-3 py-2 border text-gray-800 text-xs">{r.libelleCompte}</td>
                  <td className="px-3 py-2 border text-gray-600 text-xs">{r.familleAnalytique}</td>
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
                      <button onClick={() => startEdit(r.compteOrdonnateur, r.budgetEPRD || 0)} className="text-gray-400 hover:text-blue-500">
                        <Pencil size={14} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-100 font-bold border-t-2">
                <td className="px-3 py-2 border" colSpan={3}>TOTAL DSI</td>
                <td className="px-3 py-2 border text-right text-blue-800">{formatCurrency(total)}</td>
                <td className="px-3 py-2 border"></td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="px-6 py-3 border-t flex justify-end">
          <button onClick={onClose} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium">
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
