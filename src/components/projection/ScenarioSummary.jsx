import { TrendingUp, TrendingDown, Minus, Info } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

const fmt = formatCurrency;

const MetriqueChip = ({ label, value, alertValue, alertDir = 'above', unit = '' }) => {
  const numeric = typeof value === 'number' ? value : null;
  const isAlert = numeric !== null && alertValue !== undefined
    ? (alertDir === 'above' ? numeric > alertValue : numeric < alertValue)
    : false;

  return (
    <div className={`flex flex-col px-3 py-2 rounded-lg border text-xs ${
      isAlert ? 'border-amber-200 bg-amber-50' : 'border-gray-100 bg-gray-50'
    }`}>
      <span className="text-gray-500 font-medium mb-0.5">{label}</span>
      <span className={`font-bold ${isAlert ? 'text-amber-700' : 'text-gray-800'}`}>
        {numeric !== null
          ? `${typeof numeric === 'number' && numeric < 1 && unit === '%'
              ? (numeric * 100).toFixed(0)
              : numeric.toFixed(numeric < 10 ? 1 : 0)}${unit}`
          : String(value)}
      </span>
    </div>
  );
};

const ScenarioRow = ({ icon: Icon, color, label, scenario, eprdTotal }) => {
  const ecart = scenario.projBAvecRisques - eprdTotal;
  const ecartPct = eprdTotal > 0 ? (ecart / eprdTotal * 100) : 0;
  const ecartColor = ecart > 0 ? 'text-red-600 font-semibold' : 'text-green-600 font-semibold';

  return (
    <tr className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors">
      <td className="py-3 px-4">
        <div className="flex items-center gap-2">
          <Icon size={14} className={color} />
          <span className="text-sm font-medium text-gray-800">{label}</span>
          <span className="text-[10px] text-gray-400 ml-1">×{scenario.multiplicateur.toFixed(2)}</span>
        </div>
      </td>
      <td className="py-3 px-4 text-right text-sm text-gray-700">{fmt(scenario.projA)}</td>
      <td className="py-3 px-4 text-right text-sm text-gray-500">{fmt(scenario.projAAvecRisques)}</td>
      <td className="py-3 px-4 text-right text-sm text-gray-700">{fmt(scenario.projB)}</td>
      <td className="py-3 px-4 text-right text-sm font-medium text-gray-800">{fmt(scenario.projBAvecRisques)}</td>
      <td className="py-3 px-4 text-right text-sm">
        {eprdTotal > 0 ? (
          <div className="flex flex-col items-end">
            <span className={ecartColor}>{ecart > 0 ? '+' : ''}{fmt(ecart)}</span>
            <span className={`text-[10px] ${ecartColor}`}>{ecart > 0 ? '+' : ''}{ecartPct.toFixed(1)} %</span>
          </div>
        ) : '—'}
      </td>
    </tr>
  );
};

export default function ScenarioSummary({ result, eprdTotal = 0 }) {
  if (!result) return null;
  const { scenarios, metriques, moisSituation, anneeProjection, config } = result;

  const NOM_MOIS_FULL = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

  const ALGO_LABELS = {
    PROFIL_FOURNISSEUR: 'Profil fournisseur',
    HYBRIDE_ADAPTATIF:  'Hybride adaptatif',
    SAISONNIERE_GLOBALE:'Saisonnière globale',
    LINEAIRE:           'Linéaire',
  };

  return (
    <div className="space-y-4">
      {/* En-tête situation */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <TrendingUp size={16} className="text-indigo-600" />
          <span className="text-sm font-semibold text-gray-800">
            Projection au {NOM_MOIS_FULL[(moisSituation || 1) - 1]} {anneeProjection}
          </span>
          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
            {ALGO_LABELS[config?.algoMode] || config?.algoMode}
          </span>
        </div>
      </div>

      {/* Métriques qualité */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
        <MetriqueChip
          label="Couverture profil"
          value={metriques.couvertureProfil}
          unit="%"
          alertValue={0.70}
          alertDir="below"
        />
        <MetriqueChip
          label="Sans historique"
          value={metriques.nbSansHistorique}
          unit=" fourn."
          alertValue={20}
          alertDir="above"
        />
        <MetriqueChip
          label="Indice confiance"
          value={metriques.indiceConfiance}
          unit=""
          alertValue={0.60}
          alertDir="below"
        />
        {metriques.backTestN1 !== null && metriques.backTestN1 !== undefined && (
          <MetriqueChip
            label="Back-test N-1"
            value={metriques.backTestN1 * 100}
            unit="%"
            alertValue={15}
            alertDir="above"
          />
        )}
        <MetriqueChip
          label="Fournisseurs"
          value={metriques.nbFournisseurs}
          unit=""
        />
      </div>

      {/* Tableau scénarios */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left py-2.5 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Scénario</th>
                <th className="text-right py-2.5 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Proj. A flux</th>
                <th className="text-right py-2.5 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">A + Risques</th>
                <th className="text-right py-2.5 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Proj. B (+ENR)</th>
                <th className="text-right py-2.5 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">B + Risques</th>
                <th className="text-right py-2.5 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Écart EPRD</th>
              </tr>
            </thead>
            <tbody>
              <ScenarioRow
                icon={TrendingDown}
                color="text-green-600"
                label="Best"
                scenario={scenarios.best}
                eprdTotal={eprdTotal}
              />
              <ScenarioRow
                icon={Minus}
                color="text-amber-500"
                label="Central"
                scenario={scenarios.central}
                eprdTotal={eprdTotal}
              />
              <ScenarioRow
                icon={TrendingUp}
                color="text-red-600"
                label="Worst"
                scenario={scenarios.worst}
                eprdTotal={eprdTotal}
              />
              {/* Ligne EPRD */}
              {eprdTotal > 0 && (
                <tr className="bg-indigo-50 border-t border-indigo-100">
                  <td colSpan={4} className="py-2.5 px-4 text-xs text-indigo-600 font-medium">EPRD 2026 (référence)</td>
                  <td className="py-2.5 px-4 text-right text-sm font-bold text-indigo-700">{fmt(eprdTotal)}</td>
                  <td className="py-2.5 px-4 text-right text-xs text-gray-400">—</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Note ENR */}
      {config?.inclureEnr && (
        <div className="flex items-start gap-2 text-xs text-gray-500 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
          <Info size={12} className="text-blue-400 mt-0.5 flex-shrink-0" />
          <span>
            {"Méthode B : ENR net = ENR brut × "}{((1 - (config?.tauxAnnulationEnr || 0.6)) * 100).toFixed(0)} %
            {" (taux d’annulation "}{((config?.tauxAnnulationEnr || 0.6) * 100).toFixed(0)} {"%). "}
            {"Scénario Worst utilise l’ENR brut (0 % d’annulation)."}
            {config?.inclureHorsImport && ` OPEX hors-import inclus : ${fmt(config.opexHorsImport)}.`}
          </span>
        </div>
      )}
    </div>
  );
}
