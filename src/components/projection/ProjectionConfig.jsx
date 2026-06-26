import { Settings, RefreshCw, Download } from 'lucide-react';
import { ALGO_MODES } from '../../utils/projectionEngine';

const ALGO_LABELS = {
  PROFIL_FOURNISSEUR: 'Profil fournisseur (recommandé)',
  HYBRIDE_ADAPTATIF:  'Hybride adaptatif',
  SAISONNIERE_GLOBALE:'Saisonnière globale',
  LINEAIRE:           'Linéaire (référence)',
};

const NOM_MOIS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

export default function ProjectionConfig({ config, onChange, onRecalcul, onExport, loading }) {
  const update = (key, val) => onChange({ ...config, [key]: val });
  const updateScenario = (k, val) =>
    onChange({ ...config, scenarios: { ...config.scenarios, [k]: val } });

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
      <div className="flex items-center gap-2 mb-4">
        <Settings size={16} className="text-indigo-600" />
        <h2 className="text-sm font-semibold text-gray-800">Configuration projection budgétaire</h2>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">

        {/* Algorithme */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Algorithme</label>
          <select
            value={config.algoMode}
            onChange={e => update('algoMode', e.target.value)}
            className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-400"
          >
            {ALGO_MODES.map(m => (
              <option key={m} value={m}>{ALGO_LABELS[m]}</option>
            ))}
          </select>
        </div>

        {/* Mois de situation */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Mois de situation</label>
          <select
            value={config.moisSituation}
            onChange={e => update('moisSituation', Number(e.target.value))}
            className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-400"
          >
            {NOM_MOIS.map((nom, i) => (
              <option key={i + 1} value={i + 1}>{nom} {config.anneeProjection}</option>
            ))}
          </select>
        </div>

        {/* Années historique */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Années historique</label>
          <select
            value={config.nbAnneesHistorique}
            onChange={e => update('nbAnneesHistorique', Number(e.target.value))}
            className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-400"
          >
            {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n} an{n > 1 ? 's' : ''}</option>)}
          </select>
        </div>

        {/* Taux annulation ENR */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Taux annulation ENR</label>
          <div className="flex items-center gap-1">
            <input
              type="number"
              min="0" max="100" step="5"
              value={Math.round(config.tauxAnnulationEnr * 100)}
              onChange={e => update('tauxAnnulationEnr', Number(e.target.value) / 100)}
              className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-400"
            />
            <span className="text-xs text-gray-400">%</span>
          </div>
        </div>

        {/* OPEX hors-import */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">OPEX hors-import (€)</label>
          <div className="flex items-center gap-1">
            <input
              type="checkbox"
              checked={config.inclureHorsImport}
              onChange={e => update('inclureHorsImport', e.target.checked)}
              className="rounded text-indigo-600"
            />
            <input
              type="number"
              min="0" step="1000"
              value={config.opexHorsImport}
              onChange={e => update('opexHorsImport', Number(e.target.value))}
              disabled={!config.inclureHorsImport}
              className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-400 disabled:bg-gray-50 disabled:text-gray-400"
            />
          </div>
        </div>

        {/* ENR */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Inclure ENR</label>
          <label className="flex items-center gap-2 mt-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={config.inclureEnr}
              onChange={e => update('inclureEnr', e.target.checked)}
              className="rounded text-indigo-600"
            />
            <span className="text-xs text-gray-600">Méthode B (flux + ENR net)</span>
          </label>
        </div>

        {/* Multiplicateurs scénarios */}
        <div className="col-span-2 md:col-span-1">
          <label className="block text-xs font-medium text-gray-600 mb-1">Multiplicateurs scénarios</label>
          <div className="flex gap-2">
            {[
              { k: 'best',    color: 'text-green-600',  label: 'Best'    },
              { k: 'central', color: 'text-amber-600',  label: 'Central' },
              { k: 'worst',   color: 'text-red-600',    label: 'Worst'   },
            ].map(({ k, color, label }) => (
              <div key={k} className="flex-1">
                <span className={`block text-[10px] ${color} font-semibold mb-0.5`}>{label}</span>
                <input
                  type="number"
                  min="0.5" max="2" step="0.05"
                  value={config.scenarios[k]}
                  onChange={e => updateScenario(k, Number(e.target.value))}
                  className="w-full text-xs border border-gray-200 rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100">
        <button
          onClick={onRecalcul}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-xs font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          Recalculer
        </button>
        <button
          onClick={onExport}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 text-xs font-medium rounded-lg hover:bg-gray-50 transition-colors"
        >
          <Download size={13} />
          Exporter Excel
        </button>
      </div>
    </div>
  );
}
