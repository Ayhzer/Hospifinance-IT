/**
 * Aperçu dépliable des commandes concernées par une règle de reclassement.
 * Utilisé dans les 4 niveaux (Référentiel, Règles contextuelles, Mots-clés, Mapping).
 */

import { useState } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

export default function OrdersPreview({ orders = [], limit = 50 }) {
  const [open, setOpen] = useState(false);
  const n = orders.length;

  return (
    <div className="mt-1">
      <button
        type="button"
        onClick={() => n > 0 && setOpen(o => !o)}
        className={`flex items-center gap-1 text-[11px] ${n === 0 ? 'text-gray-300 cursor-default' : 'text-indigo-600 hover:text-indigo-800'}`}
      >
        {n > 0 && (open ? <ChevronDown size={12} /> : <ChevronRight size={12} />)}
        {n === 0 ? 'Aucune commande concernée' : `Voir les commandes (${n})`}
      </button>

      {open && n > 0 && (
        <div className="mt-1 border border-gray-200 rounded overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="bg-gray-50 text-gray-500">
                <th className="text-left px-2 py-1 font-medium">Référence</th>
                <th className="text-left px-2 py-1 font-medium">Désignation</th>
                <th className="text-left px-2 py-1 font-medium">Fournisseur</th>
                <th className="text-left px-2 py-1 font-medium">Compte</th>
                <th className="text-right px-2 py-1 font-medium">Montant</th>
              </tr>
            </thead>
            <tbody>
              {orders.slice(0, limit).map((o, i) => (
                <tr key={o.id ?? i} className="border-t border-gray-100">
                  <td className="px-2 py-1 font-mono text-gray-500">{o.reference || o.numeroMarche || '—'}</td>
                  <td className="px-2 py-1 text-gray-700 max-w-[200px] truncate" title={o.designation || o.description}>{o.designation || o.description || '—'}</td>
                  <td className="px-2 py-1 text-gray-600 max-w-[140px] truncate" title={o.fournisseur}>{o.fournisseur || '—'}</td>
                  <td className="px-2 py-1 font-mono text-gray-500">{o.compteOrdonnateur || '—'}</td>
                  <td className="px-2 py-1 text-right text-gray-700 whitespace-nowrap">{formatCurrency(Number(o.montant) || 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {n > limit && <p className="text-[10px] text-gray-400 px-2 py-1">… {n - limit} commande(s) de plus</p>}
        </div>
      )}
    </div>
  );
}
