/**
 * Configuration "runtime" — Hospifinance-IT
 * ---------------------------------------------------------------------------
 * Surcouche optionnelle permettant à l'ASSISTANT DE PREMIER LANCEMENT
 * (`components/setup/SetupWizard.jsx`) de personnaliser l'identité de
 * l'établissement et les libellés des logiciels sources SANS modifier le code
 * source ni reconstruire l'application.
 *
 * Les valeurs sont relues SYNCHRONEMENT depuis localStorage au chargement des
 * modules `config/establishment.js` et `config/sources.js`, de sorte que même
 * les constantes évaluées à l'import (ANNEE_PILOTAGE, EPRD de démonstration…)
 * reflètent le choix de l'utilisateur. C'est pourquoi l'assistant recharge la
 * page une fois la configuration enregistrée : cela propage les valeurs partout
 * de façon cohérente.
 *
 * Ce module n'importe RIEN (pas de dépendance vers establishment/sources) afin
 * d'éviter tout cycle d'import.
 */

export const APP_CONFIG_KEY = 'hospifinance_app_config';
export const SETUP_DONE_KEY = 'hospifinance_setup_done';
export const WELCOME_SEEN_KEY = 'hospifinance_welcome_seen';

/** Lit la configuration runtime ({ establishment?, sources? }). Toujours un objet. */
export const loadAppConfig = () => {
  try {
    const raw = localStorage.getItem(APP_CONFIG_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

/** Fusionne et persiste une partie de la configuration runtime. */
export const saveAppConfig = (partial) => {
  try {
    const next = { ...loadAppConfig(), ...partial };
    localStorage.setItem(APP_CONFIG_KEY, JSON.stringify(next));
    return next;
  } catch {
    return null;
  }
};

/** Marque l'assistant de premier lancement comme terminé. */
export const markSetupDone = () => {
  try { localStorage.setItem(SETUP_DONE_KEY, 'true'); } catch { /* ignore */ }
};

/**
 * L'installation a-t-elle été initialisée via l'assistant (vraie install neuve) ?
 * Sert à démarrer sans les données de démonstration (budget EPRD vierge).
 */
export const wasSetupViaWizard = () => {
  try { return localStorage.getItem(SETUP_DONE_KEY) === 'true'; }
  catch { return false; }
};

/** Réinitialise le marqueur (utile pour re-tester l'assistant). */
export const resetSetup = () => {
  try {
    localStorage.removeItem(SETUP_DONE_KEY);
    localStorage.removeItem(APP_CONFIG_KEY);
    localStorage.removeItem(WELCOME_SEEN_KEY);
  } catch { /* ignore */ }
};

/**
 * La fenêtre de bienvenue doit-elle s'afficher ?
 * Oui uniquement juste après l'assistant de premier lancement (le marqueur
 * SETUP_DONE est posé par l'assistant, jamais par une installation legacy) et
 * tant que l'utilisateur ne l'a pas vue.
 */
export const isWelcomePending = () => {
  try {
    return (
      localStorage.getItem(SETUP_DONE_KEY) === 'true' &&
      localStorage.getItem(WELCOME_SEEN_KEY) !== 'true'
    );
  } catch {
    return false;
  }
};

/** Marque la fenêtre de bienvenue comme vue (ne se rouvrira plus seule). */
export const markWelcomeSeen = () => {
  try { localStorage.setItem(WELCOME_SEEN_KEY, 'true'); } catch { /* ignore */ }
};

/**
 * L'application exige-t-elle une connexion (login / mot de passe) ?
 * Par défaut OUI. Mettre à false désactive l'authentification (accès direct).
 */
export const isAuthRequired = () => {
  try { return loadAppConfig().authRequired !== false; } catch { return true; }
};

/** Active (true) ou désactive (false) l'exigence de connexion. */
export const setAuthRequired = (required) => { saveAppConfig({ authRequired: !!required }); };

/**
 * L'assistant doit-il s'afficher ?
 * Non si : déjà terminé, OU un backend est configuré par variables
 * d'environnement (déploiement « managé » : API locale / GitHub), OU des
 * données d'une installation antérieure existent déjà (ne pas perturber).
 * En cas de doute, on NE bloque PAS l'application (retourne true).
 */
export const isSetupDone = () => {
  try {
    if (localStorage.getItem(SETUP_DONE_KEY) === 'true') return true;

    // Déploiement piloté par l'environnement → ne pas afficher l'assistant.
    if (import.meta.env.VITE_API_URL || import.meta.env.VITE_GITHUB_TOKEN) return true;

    // Installation existante (antérieure à l'assistant) → ne pas perturber.
    const legacyKeys = [
      'hospifinance_initialized',
      'hospifinance_opex_suppliers',
      'hospifinance_capex_projects',
      APP_CONFIG_KEY,
    ];
    return legacyKeys.some((k) => localStorage.getItem(k) != null);
  } catch {
    return true;
  }
};
