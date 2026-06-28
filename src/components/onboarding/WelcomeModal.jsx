/**
 * Fenêtre de bienvenue — Hospifinance-IT
 * ---------------------------------------------------------------------------
 * Affichée une seule fois, juste après l'assistant de premier lancement.
 * Guide la première utilisation et oriente vers le guide « Premiers pas »
 * complet.
 */

import { Sparkles, FileUp, Wallet, BarChart3, BookOpen } from 'lucide-react';
import { ESTABLISHMENT } from '../../config/establishment';

const QUICK_STEPS = [
  { icon: Wallet, title: 'Renseignez votre budget', text: 'Saisissez le budget EPRD par compte — bouton « Renseigner le budget » en haut de la Vue d’ensemble.' },
  { icon: FileUp, title: 'Importez vos commandes', text: 'Bouton « Importer un fichier de commandes » → téléchargez le fichier exemple, remplissez-le, réimportez.' },
  { icon: BarChart3, title: 'Pilotez & analysez', text: 'Explorez la Vue d’ensemble, les vues analytiques et le rapport exécutif PDF.' },
];

export default function WelcomeModal({ onClose, onOpenGuide }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 sm:p-8">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-100 rounded-full mb-3">
            <Sparkles className="w-7 h-7 text-blue-600" />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Bienvenue {ESTABLISHMENT.shortName} 👋</h1>
          <p className="text-sm text-gray-500 mt-1">
            Votre tableau de bord {ESTABLISHMENT.department} est configuré. Voici par où commencer.
          </p>
        </div>

        <div className="space-y-3 mb-6">
          {QUICK_STEPS.map((s, i) => {
            const Icon = s.icon;
            return (
              <div key={i} className="flex items-start gap-3 p-3 rounded-lg border border-gray-100 bg-gray-50">
                <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-white border border-gray-200 text-blue-600 shrink-0">
                  <Icon size={16} />
                </span>
                <div>
                  <p className="text-sm font-medium text-gray-800">{s.title}</p>
                  <p className="text-xs text-gray-500">{s.text}</p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <button onClick={onOpenGuide}
            className="flex-1 flex items-center justify-center gap-1.5 border border-blue-600 text-blue-600 hover:bg-blue-50 font-medium px-4 py-2.5 rounded-lg text-sm">
            <BookOpen size={16} /> Guide complet
          </button>
          <button onClick={onClose}
            className="flex-1 flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2.5 rounded-lg text-sm">
            Commencer
          </button>
        </div>
      </div>
    </div>
  );
}
