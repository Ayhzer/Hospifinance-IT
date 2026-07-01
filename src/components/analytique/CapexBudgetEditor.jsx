/**
 * Éditeur de budget CAPEX (contenu encastrable d'un onglet du modal budget).
 * ---------------------------------------------------------------------------
 * Deux saisies indépendantes mais corrélées :
 *   1) un budget GLOBAL par exercice ;
 *   2) un budget par ENVELOPPE (projet).
 * Règle de contrôle (avertissement, non bloquant) : Σ enveloppes doit égaler le
 * budget global. Un bouton permet d'aligner le global sur la somme.
 */

import { AlertTriangle, CheckCircle } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

export default function CapexBudgetEditor({
  annee,
  enveloppes = [],
  global = 0,
  onGlobalChange,
  envBudgets = {},
  onEnvBudgetChange,
}) {
  const sumEnv = enveloppes.reduce((s, e) => s + (Number(envBudgets[e]) || 0), 0);
  const g = Number(global) || 0;
  const ecart = g - sumEnv;
  const aligned = Math.abs(ecart) < 0.5;
  const hasEnv = sumEnv > 0 || g > 0;

  const inputCls = 'px-3 py-2 border border-gray-300 rounded-lg text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500';

  return (
    <div className="overflow-y-auto flex-1 px-6 py-4 space-y-5">
      {/* Budget global */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Budget global CAPEX{annee ? ` ${annee}` : ''}
        </label>
        <input
          type="number"
          value={global || ''}
          onChange={e => onGlobalChange(parseFloat(e.target.value) || 0)}
          className={`${inputCls} w-full sm:w-64`}
          placeholder="0"
        />
        <p className="text-xs text-gray-400 mt-1">Montant total d’investissement prévu pour l’exercice.</p>
      </div>

      {/* Bandeau de contrôle d'équilibre */}
      {hasEnv && (
        <div className={`flex items-center justify-between gap-3 flex-wrap px-4 py-2.5 rounded-lg text-sm border ${aligned ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
          <div className="flex items-center gap-2">
            {aligned ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
            <span>
              Σ enveloppes <strong>{formatCurrency(sumEnv)}</strong> · Global <strong>{formatCurrency(g)}</strong>
              {aligned ? ' — équilibré' : ` — écart ${formatCurrency(Math.abs(ecart))}`}
            </span>
          </div>
          {!aligned && (
            <button
              onClick={() => onGlobalChange(sumEnv)}
              className="px-3 py-1 bg-white border border-current rounded text-xs font-medium hover:bg-white/60"
            >
              Aligner le global sur Σ enveloppes
            </button>
          )}
        </div>
      )}

      {/* Détail par enveloppe */}
      <div>
        <p className="text-sm font-medium text-gray-700 mb-2">Détail par enveloppe</p>
        {enveloppes.length === 0 ? (
          <p className="text-xs text-gray-400 italic">
            Aucune enveloppe définie. Ajoutez-en dans Paramètres → Listes de choix → Enveloppes CAPEX.
          </p>
        ) : (
          <div className="space-y-2">
            {enveloppes.map(env => (
              <div key={env} className="flex items-center justify-between gap-3">
                <span className="text-sm text-gray-700 truncate" title={env}>{env}</span>
                <input
                  type="number"
                  value={envBudgets[env] ?? ''}
                  onChange={e => onEnvBudgetChange(env, parseFloat(e.target.value) || 0)}
                  className={`${inputCls} w-40`}
                  placeholder="0"
                />
              </div>
            ))}
            <div className="flex items-center justify-between gap-3 border-t pt-2 font-semibold text-gray-800">
              <span className="text-sm">Total enveloppes</span>
              <span className="text-sm">{formatCurrency(sumEnv)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
