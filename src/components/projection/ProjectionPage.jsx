import { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { TrendingUp, Table2, Building2, History, AlertCircle, Database, BookOpen, X } from 'lucide-react';

import { runProjection, DEFAULT_CONFIG } from '../../utils/projectionEngine';
import ProjectionConfig from './ProjectionConfig';
import ScenarioSummary from './ScenarioSummary';
import ProjectionByCompte from './ProjectionByCompte';
import SupplierProfiles from './SupplierProfiles';
import { formatCurrency } from '../../utils/formatters';

const fmt = formatCurrency;

const TABS = [
  { id: 'synthese',  label: 'Synthèse scénarios', icon: TrendingUp },
  { id: 'comptes',   label: 'Par compte',          icon: Table2 },
  { id: 'profils',   label: 'Profils fournisseurs', icon: Building2 },
  { id: 'historique',label: 'Historique précision', icon: History },
];

// ── Export Excel ──────────────────────────────────────────────────────────────

const exportToExcel = (result) => {
  if (!result) return;
  const wb = XLSX.utils.book_new();

  // Onglet 1 — Scénarios
  const scenariosData = [
    ['Scénario', 'Multiplicateur', 'Proj. A flux', 'A + Risques', 'Proj. B (+ENR)', 'B + Risques', 'Écart EPRD'],
    ['Best',    result.config.scenarios.best,    result.scenarios.best.projA,    result.scenarios.best.projAAvecRisques,    result.scenarios.best.projB,    result.scenarios.best.projBAvecRisques,    result.scenarios.best.ecartEprd],
    ['Central', result.config.scenarios.central, result.scenarios.central.projA, result.scenarios.central.projAAvecRisques, result.scenarios.central.projB, result.scenarios.central.projBAvecRisques, result.scenarios.central.ecartEprd],
    ['Worst',   result.config.scenarios.worst,   result.scenarios.worst.projA,   result.scenarios.worst.projAAvecRisques,   result.scenarios.worst.projB,   result.scenarios.worst.projBAvecRisques,   result.scenarios.worst.ecartEprd],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(scenariosData), '0. Scénarios');

  // Onglet 2 — Par compte
  const comptesData = [
    ['Compte', 'Libellé', 'Réalisé YTD', 'ENR brut', 'ENR net', 'Projection', 'EPRD', 'Écart'],
    ...result.parCompte.map(r => [
      r.compte, r.libelleCompte, r.balanceRealisee, r.enrBrut, r.enrNet,
      r.projectionTotale, r.budgetEPRD || 0, (r.projectionTotale - (r.budgetEPRD || 0)),
    ]),
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(comptesData), '1. Par compte');

  // Onglet 3 — Par fournisseur
  const foData = [
    ['Fournisseur', 'Compte', 'Réalisé YTD', 'ENR brut', 'ENR net', 'Projection restante', 'Projection totale', 'Algo', 'Pattern', 'Fiabilité', 'Nb années histo'],
    ...result.parFournisseur.map(r => [
      r.fournisseur, r.compte, r.balanceRealisee, r.enrBrut, r.enrNet,
      r.projectionRestante, r.projectionTotale, r.algo, r.pattern, r.fiabilite, r.nb_annees_historique,
    ]),
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(foData), '2. Par fournisseur');

  // Onglet 4 — Profils
  const profilsData = [
    ['Fournisseur', 'Compte', 'Pattern', 'Fiabilité', 'Nb années', 'Mois pic', '% pic', 'CV annuel', 'Moy. annuelle',
     'Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'],
    ...result.profils.map(p => [
      p.fournisseur, p.compte, p.pattern, p.fiabilite, p.nb_annees_historique,
      p.mois_pic, p.pct_pic, p.cv, p.total_moyen_annuel,
      ...Array.from({ length: 12 }, (_, i) => p.coefficients_mensuels?.[i + 1] || 0),
    ]),
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(profilsData), '3. Profils saisonniers');

  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  XLSX.writeFile(wb, `Projection_Budgetaire_DSI_${result.anneeProjection}_${date}.xlsx`);
};

// ── Notice / Documentation ────────────────────────────────────────────────────

const NoticeModal = ({ onClose }) => (
  <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
    <div
      className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto"
      onClick={e => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 sticky top-0 bg-white z-10">
        <div className="flex items-center gap-2">
          <BookOpen size={16} className="text-indigo-600" />
          <h2 className="text-sm font-bold text-gray-800">Documentation — Module Projection budgétaire</h2>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
          <X size={15} className="text-gray-500" />
        </button>
      </div>

      <div className="px-6 py-5 space-y-7 text-xs text-gray-700">

        {/* Intro */}
        <section>
          <p className="text-gray-600 leading-relaxed">
            Le moteur de projection budgétaire calcule une estimation de dépense annuelle totale
            à partir des réalisations importées et des engagements non reçus (ENR).
            Il choisit automatiquement le meilleur algorithme par couple <strong>fournisseur × compte</strong> selon l&apos;historique disponible.
          </p>
        </section>

        {/* Algorithmes */}
        <section>
          <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-1.5">
            <span className="w-5 h-5 bg-indigo-600 text-white rounded-full flex items-center justify-center text-[10px] font-bold">1</span>
            Algorithmes de projection
          </h3>
          <div className="space-y-3">
            {[
              {
                name: 'PROFIL_FOURNISSEUR',
                color: 'bg-green-100 text-green-800 border-green-200',
                desc: "Utilise le profil saisonnier propre au fournisseur calculé sur N années d'historique (médiane des coefficients mensuels). C'est l'algorithme le plus précis — erreur back-test ~6,6 % vs 55 % pour le linéaire.",
                when: "Disponible dès 2 années d'historique complètes.",
              },
              {
                name: 'HYBRIDE_ADAPTATIF',
                color: 'bg-purple-100 text-purple-800 border-purple-200',
                desc: 'Combine le profil individuel du fournisseur (pondération 60 %) avec le profil saisonnier global (40 %). Adaptatif : si le fournisseur a un seul an d\'historique, la pondération bascule vers 30 % / 70 %.',
                when: "Utilisé quand l'historique est partiel (1 an complet).",
              },
              {
                name: 'SAISONNIERE_GLOBALE',
                color: 'bg-amber-100 text-amber-800 border-amber-200',
                desc: "Applique le profil mensuel agrégé de référence. Les pics de décembre (22,4 %) et novembre (13,6 %) reflètent les charges de fin d'exercice hospitalier.",
                when: "Fallback quand moins d'1 an d'historique fournisseur.",
              },
              {
                name: 'LINEAIRE',
                color: 'bg-gray-100 text-gray-700 border-gray-200',
                desc: 'Projection simple : réalisé YTD ÷ mois écoulés × 12. Aucune prise en compte de la saisonnalité. Utilisé uniquement en dernier recours, erreur typique > 40 %.',
                when: 'Fallback absolu — données insuffisantes pour tout autre algorithme.',
              },
            ].map(a => (
              <div key={a.name} className={`border rounded-lg p-3 ${a.color}`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${a.color}`}>{a.name}</span>
                </div>
                <p className="text-gray-700 leading-relaxed mb-1">{a.desc}</p>
                <p className="text-gray-500 italic">{a.when}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Profils saisonniers */}
        <section>
          <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-1.5">
            <span className="w-5 h-5 bg-indigo-600 text-white rounded-full flex items-center justify-center text-[10px] font-bold">2</span>
            Profils saisonniers détectés
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {[
              { pattern: 'PIC_UNIQUE',    style: 'bg-red-50 border-red-200 text-red-700',    desc: 'Charge concentrée sur 1–2 mois (ex. renouvellement annuel de licence).' },
              { pattern: 'PIC_FIN_ANNEE', style: 'bg-orange-50 border-orange-200 text-orange-700', desc: 'Pic concentré sur T4 (Oct–Déc), typique des abonnements renouvelés en fin d\'exercice.' },
              { pattern: 'TRIMESTRIEL',   style: 'bg-blue-50 border-blue-200 text-blue-700',  desc: 'Charges réparties sur 4 périodes trimestrielles (maintenance, SaaS trimestriel).' },
              { pattern: 'UNIFORME',      style: 'bg-green-50 border-green-200 text-green-700', desc: 'Charges régulières tout au long de l\'année (abonnements mensuels, loyers IT).' },
              { pattern: 'IRREGULIER',    style: 'bg-gray-50 border-gray-200 text-gray-600',  desc: 'Pas de motif détecté — projection par hybride ou saisonnière globale.' },
              { pattern: 'PONCTUEL',      style: 'bg-purple-50 border-purple-200 text-purple-700', desc: 'Apparaît rarement, 1 à 2 mois uniquement. Peut indiquer un achat exceptionnel.' },
            ].map(p => (
              <div key={p.pattern} className={`border rounded-lg p-2.5 ${p.style}`}>
                <div className="font-semibold mb-0.5 text-[11px]">{p.pattern.replace('_', ' ')}</div>
                <div className="text-gray-600 text-[10px] leading-relaxed">{p.desc}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Scénarios */}
        <section>
          <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-1.5">
            <span className="w-5 h-5 bg-indigo-600 text-white rounded-full flex items-center justify-center text-[10px] font-bold">3</span>
            Scénarios budgétaires
          </h3>
          <div className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-100 border-b border-gray-200">
                  <th className="text-left py-2 px-3 font-semibold text-gray-600">Scénario</th>
                  <th className="text-center py-2 px-3 font-semibold text-gray-600">Multiplicateur défaut</th>
                  <th className="text-left py-2 px-3 font-semibold text-gray-600">Interprétation</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { name: 'Best',    mult: '× 0,95', color: 'text-green-700', desc: 'Hypothèse optimiste : économies réalisées, pas de dépassement.' },
                  { name: 'Central', mult: '× 1,10', color: 'text-amber-700', desc: 'Hypothèse de référence : légère dérive (+10 %) intégrée.' },
                  { name: 'Worst',   mult: '× 1,25', color: 'text-red-700',   desc: 'Hypothèse pessimiste : dépassements et aléas (+25 %).' },
                ].map(s => (
                  <tr key={s.name} className="border-b border-gray-100 last:border-0">
                    <td className={`py-2 px-3 font-semibold ${s.color}`}>{s.name}</td>
                    <td className={`py-2 px-3 text-center font-mono font-bold ${s.color}`}>{s.mult}</td>
                    <td className="py-2 px-3 text-gray-600">{s.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-gray-500 leading-relaxed">
            Chaque scénario produit deux projections : <strong>Proj. A</strong> (flux de trésorerie extrapolé)
            et <strong>Proj. B</strong> (A + ENR net après taux d&apos;annulation configurable, défaut 60 %).
          </p>
        </section>

        {/* ENR */}
        <section>
          <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-1.5">
            <span className="w-5 h-5 bg-indigo-600 text-white rounded-full flex items-center justify-center text-[10px] font-bold">4</span>
            Engagements Non Reçus (ENR)
          </h3>
          <p className="text-gray-600 leading-relaxed mb-2">
            L&apos;ENR représente les commandes passées dont la facture n&apos;a pas encore été reçue (statut &laquo;&nbsp;engagé&nbsp;&raquo; dans le logiciel source des commandes).
            Une partie de ces engagements sera annulée (reports, corrections) — c&apos;est le <strong>taux d&apos;annulation ENR</strong> (défaut 60 %).
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 font-mono text-blue-800 text-[11px]">
            ENR net = ENR brut × (1 − taux_annulation)
            <br />
            Proj. B = Proj. A + ENR net
          </div>
        </section>

        {/* Fiabilité */}
        <section>
          <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-1.5">
            <span className="w-5 h-5 bg-indigo-600 text-white rounded-full flex items-center justify-center text-[10px] font-bold">5</span>
            Indicateurs de fiabilité
          </h3>
          <div className="space-y-2">
            {[
              { label: 'HAUTE',   color: 'bg-green-100 text-green-700',  desc: '≥ 2 ans d\'historique, coefficient de variation annuel < 30 %. Projection très fiable.' },
              { label: 'MOYENNE', color: 'bg-amber-100 text-amber-700',  desc: '1–2 ans d\'historique ou CV entre 30 % et 70 %. Projection indicative.' },
              { label: 'FAIBLE',  color: 'bg-red-100 text-red-700',     desc: '< 1 an d\'historique ou CV > 70 %. Projection à interpréter avec précaution.' },
            ].map(f => (
              <div key={f.label} className="flex items-start gap-3">
                <span className={`mt-0.5 shrink-0 px-2 py-0.5 rounded text-[10px] font-bold ${f.color}`}>{f.label}</span>
                <span className="text-gray-600 leading-relaxed">{f.desc}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Profil saisonnier */}
        <section>
          <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-1.5">
            <span className="w-5 h-5 bg-indigo-600 text-white rounded-full flex items-center justify-center text-[10px] font-bold">6</span>
            Profil mensuel global (référence saisonnière)
          </h3>
          <div className="grid grid-cols-6 gap-1 text-center">
            {[
              ['Jan','3,2%'],['Fév','3,9%'],['Mar','5,3%'],['Avr','9,1%'],['Mai','4,1%'],['Jun','7,0%'],
              ['Jul','7,8%'],['Aoû','3,2%'],['Sep','11,7%'],['Oct','8,8%'],['Nov','13,6%'],['Déc','22,4%'],
            ].map(([m, v]) => (
              <div key={m} className="bg-gray-50 border border-gray-200 rounded p-1.5">
                <div className="text-[10px] text-gray-500 font-medium">{m}</div>
                <div className="text-xs font-bold text-indigo-700">{v}</div>
              </div>
            ))}
          </div>
          <p className="mt-2 text-gray-500 italic">
            Source : consolidation de référence. Pic de décembre dû aux renouvellements en fin d&apos;exercice hospitalier.
          </p>
        </section>

      </div>
    </div>
  </div>
);

// ── Vue Historique précision ──────────────────────────────────────────────────

const HistoriqueView = ({ result }) => {
  if (!result) return null;
  const { metriques, anneeProjection } = result;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <History size={15} className="text-indigo-600" />
        <h3 className="text-sm font-semibold text-gray-800">Historique de précision</h3>
      </div>
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        {metriques.backTestN1 !== null && metriques.backTestN1 !== undefined ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className={`text-2xl font-bold ${metriques.backTestN1 > 0.15 ? 'text-amber-600' : 'text-green-600'}`}>
                {(metriques.backTestN1 * 100).toFixed(1)} %
              </div>
              <div className="text-sm text-gray-600">
                Écart projection vs réel {anneeProjection - 1}
              </div>
              {metriques.backTestN1 <= 0.15
                ? <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">Dans les seuils</span>
                : <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">Alerte &gt; 15 %</span>}
            </div>
            <div className="text-xs text-gray-500">
              Simulation : projection calculée avec les données {anneeProjection - 1} au même mois, comparée au réalisé annuel {anneeProjection - 1}.
              Méthode : saisonnière globale.
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 text-sm text-gray-500">
            <Database size={16} className="text-gray-300" />
            <span>Données historiques {anneeProjection - 1} insuffisantes pour calculer le back-test.</span>
          </div>
        )}

        {/* Référence validation empirique */}
        <div className="mt-6 pt-4 border-t border-gray-100">
          <p className="text-xs font-semibold text-gray-600 mb-3">Validation empirique de référence (back-test 2023 → 2024)</p>
          <table className="text-xs w-full max-w-lg">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-1.5 text-gray-500 font-medium">Méthode</th>
                <th className="text-right py-1.5 text-gray-500 font-medium">Projection estimée</th>
                <th className="text-right py-1.5 text-gray-500 font-medium">Réel 2024</th>
                <th className="text-right py-1.5 text-gray-500 font-medium">Erreur</th>
              </tr>
            </thead>
            <tbody>
              {[
                { methode: 'Linéaire (actuelle)', proj: 4071540, reel: 9133065, erreur: 55.4, color: 'text-red-600' },
                { methode: 'Saisonnière globale', proj: 5411828, reel: 9133065, erreur: 40.7, color: 'text-amber-600' },
                { methode: 'Profil fournisseur',  proj: 8532474, reel: 9133065, erreur: 6.6,  color: 'text-green-700' },
              ].map(r => (
                <tr key={r.methode} className="border-b border-gray-100">
                  <td className="py-1.5 text-gray-700">{r.methode}</td>
                  <td className="py-1.5 text-right text-gray-600">{fmt(r.proj)}</td>
                  <td className="py-1.5 text-right text-gray-600">{fmt(r.reel)}</td>
                  <td className={`py-1.5 text-right font-bold ${r.color}`}>{r.erreur} %</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// ── Composant principal ───────────────────────────────────────────────────────

export default function ProjectionPage({ suppliers, orders, eprd = [] }) {
  const [activeTab, setActiveTab] = useState('synthese');
  const [showNotice, setShowNotice] = useState(false);

  // Config initialisée avec le mois courant
  const currentYear  = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const [config, setConfig] = useState({
    ...DEFAULT_CONFIG,
    anneeProjection: currentYear,
    moisSituation:   currentMonth,
  });

  // Projection calculée (mémoïsée, recalcule quand config/données changent)
  const result = useMemo(() => {
    if (!suppliers?.length && !orders?.length) return null;
    try {
      return runProjection(suppliers || [], orders || [], eprd || [], config);
    } catch (e) {
      console.error('[ProjectionEngine] Erreur:', e);
      return null;
    }
  }, [suppliers, orders, eprd, config]);

  const eprdTotal = (eprd || []).reduce((s, e) => s + (e.budgetEPRD || 0), 0);

  const hasData = (suppliers?.length || 0) + (orders?.length || 0) > 0;

  if (!hasData) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center gap-3">
        <AlertCircle size={40} className="text-gray-200" />
        <p className="text-sm text-gray-500">Aucune donnée disponible.</p>
        <p className="text-xs text-gray-400">{"Importez d'abord un fichier de commandes importé via le bouton"} &laquo;&nbsp;Importer&nbsp;&raquo;.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Config */}
      <ProjectionConfig
        config={config}
        onChange={setConfig}
        onRecalcul={() => {}}
        onExport={() => exportToExcel(result)}
        loading={false}
      />

      {/* Onglets + bouton Notice */}
      <div className="border-b border-gray-200">
        <div className="flex items-center justify-between">
          <nav className="flex gap-1">
            {TABS.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors ${
                    isActive
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon size={13} />
                  {tab.label}
                </button>
              );
            })}
          </nav>
          <button
            onClick={() => setShowNotice(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 mb-1 text-xs font-medium text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50 transition-colors"
          >
            <BookOpen size={12} />
            Notice
          </button>
        </div>
      </div>

      {showNotice && <NoticeModal onClose={() => setShowNotice(false)} />}

      {/* Contenu */}
      {result ? (
        <>
          {activeTab === 'synthese'   && <ScenarioSummary   result={result} eprdTotal={eprdTotal} />}
          {activeTab === 'comptes'    && <ProjectionByCompte result={result} />}
          {activeTab === 'profils'    && <SupplierProfiles   result={result} />}
          {activeTab === 'historique' && <HistoriqueView     result={result} />}
        </>
      ) : (
        <div className="flex items-center justify-center h-32 text-sm text-gray-400">
          Calcul en cours…
        </div>
      )}
    </div>
  );
}
