import { useMemo } from 'react';
import { AlertTriangle, AlertCircle, Info } from 'lucide-react';
import { detectAllAnomalies, SEVERITE } from '../../utils/anomaliesUtils';

const BADGE = {
  [SEVERITE.CRITIQUE]: { bg: 'bg-red-100 text-red-800 border border-red-300',    icon: <AlertCircle size={14} className="text-red-600" /> },
  [SEVERITE.ELEVEE]:   { bg: 'bg-orange-100 text-orange-800 border border-orange-300', icon: <AlertTriangle size={14} className="text-orange-500" /> },
  [SEVERITE.MOYENNE]:  { bg: 'bg-yellow-100 text-yellow-800 border border-yellow-300', icon: <Info size={14} className="text-yellow-600" /> },
};

const ROW_BG = {
  [SEVERITE.CRITIQUE]: 'bg-red-50',
  [SEVERITE.ELEVEE]:   'bg-orange-50',
  [SEVERITE.MOYENNE]:  '',
};

export default function AnomaliesPanel({ suppliers = [], orders = [], eprd = [], projects = [] }) {
  const anomalies = useMemo(() =>
    detectAllAnomalies(suppliers, orders, eprd, projects),
  [suppliers, orders, eprd, projects]);

  const counts = useMemo(() => ({
    [SEVERITE.CRITIQUE]: anomalies.filter(a => a.severite === SEVERITE.CRITIQUE).length,
    [SEVERITE.ELEVEE]:   anomalies.filter(a => a.severite === SEVERITE.ELEVEE).length,
    [SEVERITE.MOYENNE]:  anomalies.filter(a => a.severite === SEVERITE.MOYENNE).length,
  }), [anomalies]);

  return (
    <div className="space-y-6 p-4">
      <h2 className="text-xl font-bold text-gray-800">Détection d'anomalies budgétaires — DSI</h2>

      {/* Compteurs */}
      <div className="flex flex-wrap gap-3">
        {Object.values(SEVERITE).map(sev => (
          <div key={sev} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold ${BADGE[sev].bg}`}>
            {BADGE[sev].icon}
            {counts[sev]} {sev}
          </div>
        ))}
        {anomalies.length === 0 && (
          <div className="text-green-700 bg-green-50 border border-green-200 px-4 py-2 rounded-lg text-sm font-medium">
            ✅ Aucune anomalie détectée
          </div>
        )}
      </div>

      {/* Tableau */}
      {anomalies.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-100 text-gray-700 text-xs">
                <th className="text-left px-3 py-2 border w-16">Règle</th>
                <th className="text-left px-3 py-2 border w-28">Sévérité</th>
                <th className="text-left px-3 py-2 border w-28">Compte</th>
                <th className="text-left px-3 py-2 border">Fournisseur</th>
                <th className="text-left px-3 py-2 border">Constat</th>
                <th className="text-left px-3 py-2 border">Action suggérée</th>
              </tr>
            </thead>
            <tbody>
              {anomalies.map((a, i) => (
                <tr key={i} className={`border-b hover:opacity-90 ${ROW_BG[a.severite] || ''}`}>
                  <td className="px-3 py-2 border font-mono font-bold text-xs">{a.regle}</td>
                  <td className="px-3 py-2 border">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold ${BADGE[a.severite].bg}`}>
                      {BADGE[a.severite].icon}{a.severite}
                    </span>
                  </td>
                  <td className="px-3 py-2 border font-mono text-xs text-gray-600">{a.compte || '—'}</td>
                  <td className="px-3 py-2 border text-gray-800 max-w-xs truncate" title={a.fournisseur}>{a.fournisseur}</td>
                  <td className="px-3 py-2 border text-gray-700 max-w-xs" style={{ whiteSpace: 'normal' }}>{a.constat}</td>
                  <td className="px-3 py-2 border text-gray-600 italic max-w-xs" style={{ whiteSpace: 'normal' }}>{a.action}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Légende des règles */}
      <div className="bg-gray-50 border rounded-lg p-4 text-xs text-gray-600 space-y-1">
        <p className="font-semibold text-gray-700 mb-2">Légende des règles :</p>
        <p><strong>A1</strong> — Taux de réalisation &gt; 150% du budget EPRD → dépassement critique</p>
        <p><strong>A2</strong> — Taux de réalisation &lt; 20% du budget EPRD → sous-consommation atypique</p>
        <p><strong>A5</strong> — Engagé non reçu &gt; 80% du budget → risque de dépassement à la livraison</p>
        <p><strong>A7</strong> — Achat hors marché &gt; 5 000 € → vérification procédure mise en concurrence</p>
        <p><strong>B1</strong> — Activité sur un compte sans budget EPRD → réconciliation : budget à renseigner</p>
        <p><strong>B2</strong> — Budget EPRD sans aucune activité → compte erroné ou dépenses non rattachées</p>
      </div>
    </div>
  );
}
