/**
 * Couche d'accueil & d'aide — Hospifinance-IT
 * ---------------------------------------------------------------------------
 * Orchestration de l'accompagnement post-initialisation :
 *  - affiche la fenêtre de bienvenue une seule fois (juste après l'assistant) ;
 *  - expose un bouton d'aide flottant permanent rouvrant le guide « Premiers pas ».
 */

import { useState } from 'react';
import { HelpCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { isWelcomePending, markWelcomeSeen } from '../../config/runtimeConfig';
import WelcomeModal from './WelcomeModal';
import GuidePremiersPas from './GuidePremiersPas';

export default function OnboardingLayer() {
  const { user } = useAuth();
  const [showWelcome, setShowWelcome] = useState(() => isWelcomePending());
  const [showGuide, setShowGuide] = useState(false);

  // L'accompagnement n'a de sens qu'une fois l'utilisateur connecté.
  if (!user) return null;

  const closeWelcome = () => { markWelcomeSeen(); setShowWelcome(false); };
  const openGuideFromWelcome = () => { markWelcomeSeen(); setShowWelcome(false); setShowGuide(true); };

  return (
    <>
      {showWelcome && (
        <WelcomeModal onClose={closeWelcome} onOpenGuide={openGuideFromWelcome} />
      )}
      {showGuide && <GuidePremiersPas onClose={() => setShowGuide(false)} />}

      {/* Bouton d'aide permanent */}
      {!showWelcome && !showGuide && (
        <button
          onClick={() => setShowGuide(true)}
          title="Guide de démarrage — Premiers pas"
          aria-label="Ouvrir le guide de démarrage"
          className="fixed bottom-5 right-5 z-40 inline-flex items-center justify-center w-11 h-11 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg"
        >
          <HelpCircle size={22} />
        </button>
      )}
    </>
  );
}
