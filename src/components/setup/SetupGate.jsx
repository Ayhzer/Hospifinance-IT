/**
 * Garde de premier lancement — Hospifinance-IT
 * ---------------------------------------------------------------------------
 * Affiche l'assistant de configuration initiale tant qu'il n'a pas été
 * complété (et seulement pour une installation autonome — cf.
 * `config/runtimeConfig.isSetupDone()`). Sinon, rend l'application.
 */

import { useState } from 'react';
import { isSetupDone } from '../../config/runtimeConfig';
import SetupWizard from './SetupWizard';
import OnboardingLayer from '../onboarding/OnboardingLayer';

export default function SetupGate({ children }) {
  const [done, setDone] = useState(() => isSetupDone());
  if (!done) return <SetupWizard onComplete={() => setDone(true)} />;
  return (
    <>
      {children}
      <OnboardingLayer />
    </>
  );
}
