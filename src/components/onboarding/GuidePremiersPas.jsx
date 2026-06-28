/**
 * Guide « Premiers pas » — Hospifinance-IT
 * ---------------------------------------------------------------------------
 * Documentation complète de prise en main, affichée dans une modale in-app
 * (accessible depuis la fenêtre de bienvenue et le bouton d'aide flottant).
 */

import {
  X, FileUp, Target, Shuffle, BarChart3, Settings, ShieldCheck, BookOpen,
} from 'lucide-react';

const SECTIONS = [
  {
    icon: FileUp,
    title: '1. Importer vos données',
    body: [
      'Depuis la Vue d’ensemble, cliquez sur « Importer un fichier de commandes ».',
      'Dans la fenêtre d’import, téléchargez d’abord le « fichier exemple » : un classeur Excel avec les colonnes attendues, des lignes de démonstration et un onglet « Notice ».',
      'Remplacez les lignes de démo par vos données réelles (exportées depuis votre logiciel : MAGH2, EPSILON, CPAGE, SAGE…), puis réimportez le fichier.',
      'La classification OPEX / CAPEX, le regroupement par fournisseur et le reclassement analytique sont automatiques.',
    ],
  },
  {
    icon: Target,
    title: '2. Définir vos budgets',
    body: [
      'Cliquez sur « Renseigner le budget » en haut de la Vue d’ensemble pour saisir le budget EPRD par compte ordonnateur (également accessible via le module « Par comptes »).',
      'Le budget CAPEX se saisit par exercice — chaque année conserve sa propre enveloppe.',
      'Les seuils d’alerte (taux d’utilisation orange / rouge) se règlent dans Paramètres → Règles.',
    ],
  },
  {
    icon: Shuffle,
    title: '3. Affiner le reclassement analytique',
    body: [
      'Le module « Reclassement » associe chaque fournisseur ou nature à une famille analytique.',
      'Définissez des règles (par fournisseur, par nature ou par mot-clé) ; elles s’appliquent en masse sur l’OPEX et le CAPEX.',
    ],
  },
  {
    icon: BarChart3,
    title: '4. Piloter et analyser',
    body: [
      'La Vue d’ensemble propose deux modes : « Stratégique » (KPIs, atterrissage, treemap, comparaison pluriannuelle) et « Opérationnel » (suivi mensuel).',
      'Utilisez le sélecteur d’exercice et le sélecteur de mois réalisés pour cadrer les projections.',
      'Modules d’analyse : Vue analytique (drill-down), Par comptes vs EPRD, Matrice Familles × Comptes, Anomalies, Éditeurs, Rapprochement Commandes / Comptabilité, Projection fin d’année.',
      'Le bouton « Rapport exécutif » génère une synthèse PDF.',
    ],
  },
  {
    icon: Settings,
    title: '5. Personnaliser l’application',
    body: [
      'Ouvrez les Paramètres (icône en bas de la barre latérale, ou raccourci Ctrl + Shift + P).',
      'Vous y gérez : apparence et couleurs, colonnes affichées, listes de choix (fournisseurs, catégories, enveloppes), règles d’alerte, comptes utilisateurs, synchronisation GitHub et journal d’audit.',
      'La barre latérale est réorganisable, repliable et chaque section/onglet est renommable (crayon au survol).',
    ],
  },
  {
    icon: ShieldCheck,
    title: '6. Sécurité & données réelles',
    body: [
      'Changez les mots de passe par défaut (admin / user) dès la mise en service.',
      'Pour des données réelles d’établissement, utilisez un dépôt de données privé (jamais public).',
      'Les rôles disponibles : superadmin, admin, user — chacun avec ses permissions.',
    ],
  },
];

export default function GuidePremiersPas({ onClose }) {
  return (
    <div className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col">
        {/* En-tête */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <BookOpen size={20} className="text-blue-600" />
            <h2 className="text-lg font-bold text-gray-800">Guide de démarrage — Premiers pas</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700" aria-label="Fermer">
            <X size={20} />
          </button>
        </div>

        {/* Contenu défilant */}
        <div className="overflow-y-auto px-6 py-5 space-y-6">
          {SECTIONS.map((s) => {
            const Icon = s.icon;
            return (
              <section key={s.title}>
                <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-800 mb-2">
                  <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-blue-50 text-blue-600">
                    <Icon size={16} />
                  </span>
                  {s.title}
                </h3>
                <ul className="list-disc pl-9 space-y-1.5 text-sm text-gray-600">
                  {s.body.map((line, i) => <li key={i}>{line}</li>)}
                </ul>
              </section>
            );
          })}
        </div>

        {/* Pied */}
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end">
          <button onClick={onClose}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-5 py-2 rounded-lg text-sm">
            J’ai compris
          </button>
        </div>
      </div>
    </div>
  );
}
