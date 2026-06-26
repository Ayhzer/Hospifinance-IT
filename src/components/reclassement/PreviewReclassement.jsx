import { useState, useMemo } from 'react';
import { Play, CheckCircle, AlertCircle, Zap } from 'lucide-react';
import { reclasser, reclasserToutes } from '../../utils/reclassementEngine';

const SOURCE_LABELS = {
  referentiel:       '📋 Référentiel',
  regle_multinature: '⚙️ Règle contextuelle',
  mots_cles:         '🔑 Mots-clés',
  mapping_compte:    '🗂️ Mapping compte',
  non_classe:        '❓ Non classé',
};

const SOURCE_CLASS = {
  referentiel:       'bg-green-50 text-green-700 border-green-200',
  regle_multinature: 'bg-blue-50 text-blue-700 border-blue-200',
  mots_cles:         'bg-yellow-50 text-yellow-700 border-yellow-200',
  mapping_compte:    'bg-gray-50 text-gray-600 border-gray-200',
  non_classe:        'bg-red-50 text-red-700 border-red-200',
};

export default function PreviewReclassement({ moteur, suppliers = [], onApply, projects = [], onApplyCapex }) {
  const [testLigne, setTestLigne] = useState({ fournisseur: '', designation: '', compteOrdonnateur: '' });
  const [testResult, setTestResult] = useState(null);
  const [showApplyConfirm, setShowApplyConfirm] = useState(false);
  const [showApplyCapexConfirm, setShowApplyCapexConfirm] = useState(false);
  const [applied, setApplied] = useState(false);
  const [appliedCapex, setAppliedCapex] = useState(false);

  // Statistiques OPEX
  const stats = useMemo(() => {
    if (!suppliers.length) return null;
    const resultats = suppliers.map(s => ({
      ...s,
      _rc: reclasser({ fournisseur: s.supplier || s.nom || '', designation: '', compteOrdonnateur: s.compteOrdonnateur }, moteur),
    }));
    const bySource = {};
    const byFamille = {};
    resultats.forEach(s => {
      bySource[s._rc.source] = (bySource[s._rc.source] || 0) + 1;
      byFamille[s._rc.famille] = (byFamille[s._rc.famille] || 0) + 1;
    });
    return { total: suppliers.length, bySource, byFamille };
  }, [suppliers, moteur]);

  // Statistiques CAPEX
  const statsCapex = useMemo(() => {
    if (!projects.length) return null;
    const resultats = projects.map(p => ({
      ...p,
      _rc: reclasser({ fournisseur: p.fournisseur || p.project || '', designation: '', compteOrdonnateur: p.compteOrdonnateur }, moteur),
    }));
    const bySource = {};
    const byFamille = {};
    resultats.forEach(p => {
      bySource[p._rc.source] = (bySource[p._rc.source] || 0) + 1;
      byFamille[p._rc.famille] = (byFamille[p._rc.famille] || 0) + 1;
    });
    return { total: projects.length, bySource, byFamille };
  }, [projects, moteur]);

  const handleTest = () => {
    const result = reclasser(testLigne, moteur);
    setTestResult(result);
  };

  const handleApply = async () => {
    const enriched = reclasserToutes(suppliers, moteur);
    await onApply(enriched);
    setApplied(true);
    setShowApplyConfirm(false);
  };

  const handleApplyCapex = async () => {
    const enriched = reclasserToutes(
      projects.map(p => ({ ...p, supplier: p.fournisseur || p.project })),
      moteur
    );
    await onApplyCapex(enriched);
    setAppliedCapex(true);
    setShowApplyCapexConfirm(false);
  };

  return (
    <div className="space-y-6">
      {/* Section test unitaire */}
      <div className="bg-gray-50 border rounded-lg p-4 space-y-3">
        <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
          <Play size={14} /> Tester le moteur sur une ligne
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Fournisseur</label>
            <input
              type="text"
              placeholder="Ex: SOPHOS LIMITED"
              value={testLigne.fournisseur}
              onChange={e => setTestLigne(l => ({ ...l, fournisseur: e.target.value }))}
              className="w-full text-xs border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Désignation</label>
            <input
              type="text"
              placeholder="Ex: Licence antivirus endpoint"
              value={testLigne.designation}
              onChange={e => setTestLigne(l => ({ ...l, designation: e.target.value }))}
              className="w-full text-xs border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Compte ordonnateur</label>
            <input
              type="text"
              placeholder="Ex: H65100000"
              value={testLigne.compteOrdonnateur}
              onChange={e => setTestLigne(l => ({ ...l, compteOrdonnateur: e.target.value }))}
              className="w-full text-xs border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
        <button
          onClick={handleTest}
          className="flex items-center gap-2 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-lg"
        >
          <Play size={12} /> Reclasser
        </button>

        {testResult && (
          <div className={`border rounded-lg p-3 flex items-center gap-4 ${SOURCE_CLASS[testResult.source] || 'bg-gray-50 border-gray-200'}`}>
            {testResult.source === 'non_classe' ? <AlertCircle size={16} /> : <CheckCircle size={16} />}
            <div>
              <div className="text-sm font-semibold">{testResult.famille}</div>
              {testResult.sousCategorie && <div className="text-xs opacity-80">{testResult.sousCategorie}</div>}
              <div className="text-xs mt-0.5 opacity-70">{SOURCE_LABELS[testResult.source] || testResult.source}</div>
            </div>
          </div>
        )}
      </div>

      {/* Statistiques sur les fournisseurs chargés */}
      {stats && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-800">Simulation sur {stats.total} fournisseur{stats.total > 1 ? 's' : ''} chargés</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {Object.entries(stats.bySource).map(([src, cnt]) => (
              <div key={src} className={`border rounded-lg p-3 ${SOURCE_CLASS[src] || 'bg-gray-50 border-gray-200'}`}>
                <div className="text-xs font-medium">{SOURCE_LABELS[src] || src}</div>
                <div className="text-xl font-bold mt-1">{cnt}</div>
                <div className="text-xs opacity-70">{((cnt / stats.total) * 100).toFixed(0)}%</div>
              </div>
            ))}
          </div>
          <div className="bg-white border rounded-lg p-3">
            <h4 className="text-xs font-semibold text-gray-700 mb-2">Répartition par famille</h4>
            <div className="space-y-1">
              {Object.entries(stats.byFamille).sort(([, a], [, b]) => b - a).map(([famille, cnt]) => (
                <div key={famille} className="flex items-center gap-2">
                  <div className="flex-1 text-xs text-gray-700 truncate">{famille}</div>
                  <div className="text-xs font-medium text-gray-800 w-8 text-right">{cnt}</div>
                  <div className="w-24 bg-gray-100 rounded-full h-1.5 flex-shrink-0">
                    <div
                      className="bg-blue-500 h-1.5 rounded-full"
                      style={{ width: `${(cnt / stats.total) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Bouton d'application */}
      {suppliers.length > 0 && (
        <div className="border-t pt-4">
          {!showApplyConfirm ? (
            <button
              onClick={() => setShowApplyConfirm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg font-medium"
            >
              <Zap size={14} /> Appliquer le reclassement sur tous les fournisseurs
            </button>
          ) : (
            <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4 space-y-3">
              <p className="text-sm font-medium text-yellow-800">
                Cette action va mettre à jour la famille analytique de {suppliers.length} fournisseur{suppliers.length > 1 ? 's' : ''}.
                Cette opération est irréversible. Continuer ?
              </p>
              <div className="flex gap-3">
                <button onClick={handleApply} className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg font-medium">
                  Confirmer
                </button>
                <button onClick={() => setShowApplyConfirm(false)} className="px-4 py-2 bg-white border border-gray-300 text-gray-600 text-sm rounded-lg">
                  Annuler
                </button>
              </div>
            </div>
          )}
          {applied && (
            <p className="text-sm text-green-700 mt-2 flex items-center gap-1">
              <CheckCircle size={14} /> Reclassement appliqué avec succès.
            </p>
          )}
        </div>
      )}

      {suppliers.length === 0 && projects.length === 0 && (
        <div className="text-center py-8 text-gray-400 text-sm">
          Importez d'abord des données de commandes pour simuler et appliquer le reclassement.
        </div>
      )}

      {/* Séparateur CAPEX */}
      {(statsCapex || projects.length > 0) && (
        <div className="border-t-2 border-emerald-200 pt-4 mt-4">
          <h3 className="text-sm font-semibold text-emerald-700 mb-3 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
            Reclassement CAPEX — {statsCapex ? statsCapex.total : 0} projet{statsCapex?.total > 1 ? 's' : ''}
          </h3>

          {statsCapex && (
            <div className="space-y-3 mb-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {Object.entries(statsCapex.bySource).map(([src, cnt]) => (
                  <div key={src} className={`border rounded-lg p-3 ${SOURCE_CLASS[src] || 'bg-gray-50 border-gray-200'}`}>
                    <div className="text-xs font-medium">{SOURCE_LABELS[src] || src}</div>
                    <div className="text-xl font-bold mt-1">{cnt}</div>
                    <div className="text-xs opacity-70">{((cnt / statsCapex.total) * 100).toFixed(0)}%</div>
                  </div>
                ))}
              </div>
              <div className="bg-white border rounded-lg p-3">
                <h4 className="text-xs font-semibold text-gray-700 mb-2">Répartition CAPEX par famille</h4>
                <div className="space-y-1">
                  {Object.entries(statsCapex.byFamille).sort(([, a], [, b]) => b - a).map(([famille, cnt]) => (
                    <div key={famille} className="flex items-center gap-2">
                      <div className="flex-1 text-xs text-gray-700 truncate">{famille}</div>
                      <div className="text-xs font-medium text-gray-800 w-8 text-right">{cnt}</div>
                      <div className="w-24 bg-gray-100 rounded-full h-1.5 flex-shrink-0">
                        <div
                          className="bg-emerald-500 h-1.5 rounded-full"
                          style={{ width: `${(cnt / statsCapex.total) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {projects.length > 0 && onApplyCapex && (
            <div>
              {!showApplyCapexConfirm ? (
                <button
                  onClick={() => setShowApplyCapexConfirm(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm rounded-lg font-medium"
                >
                  <Zap size={14} /> Appliquer le reclassement sur tous les projets CAPEX
                </button>
              ) : (
                <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4 space-y-3">
                  <p className="text-sm font-medium text-yellow-800">
                    Cette action va mettre à jour la famille analytique de {projects.length} projet{projects.length > 1 ? 's' : ''} CAPEX.
                    Cette opération est irréversible. Continuer ?
                  </p>
                  <div className="flex gap-3">
                    <button onClick={handleApplyCapex} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm rounded-lg font-medium">
                      Confirmer
                    </button>
                    <button onClick={() => setShowApplyCapexConfirm(false)} className="px-4 py-2 bg-white border border-gray-300 text-gray-600 text-sm rounded-lg">
                      Annuler
                    </button>
                  </div>
                </div>
              )}
              {appliedCapex && (
                <p className="text-sm text-emerald-700 mt-2 flex items-center gap-1">
                  <CheckCircle size={14} /> Reclassement CAPEX appliqué avec succès.
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
