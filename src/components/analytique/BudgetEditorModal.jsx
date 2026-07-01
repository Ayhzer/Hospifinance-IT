/**
 * Modal « Renseigner le budget » — deux onglets distincts :
 *   - OPEX  : budgets EPRD par compte ordonnateur ;
 *   - CAPEX : budget global et/ou par enveloppe (avec contrôle d'équilibre).
 */

import { useState } from 'react';
import { X } from 'lucide-react';
import EprdBudgetEditor from './EprdBudgetEditor';
import CapexBudgetEditor from './CapexBudgetEditor';

const TABS = [
  { id: 'opex',  label: 'OPEX — EPRD par compte' },
  { id: 'capex', label: 'CAPEX — global / enveloppes' },
];

export default function BudgetEditorModal({ opex, capex, initialTab = 'opex', onClose }) {
  const [tab, setTab] = useState(initialTab);

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-bold text-gray-800">Renseigner le budget</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        <div className="flex gap-1 px-6 border-b">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-3 py-2.5 text-xs font-medium border-b-2 -mb-px transition-colors ${
                tab === t.id ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'opex'
          ? <EprdBudgetEditor embedded {...opex} />
          : <CapexBudgetEditor {...capex} />}

        <div className="px-6 py-3 border-t flex justify-end">
          <button onClick={onClose} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium">
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
