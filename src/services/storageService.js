/**
 * Service de persistence des données (LocalStorage)
 */

const STORAGE_KEYS = {
  OPEX: 'hospifinance_opex_suppliers',
  CAPEX: 'hospifinance_capex_projects',
  OPEX_ORDERS: 'hospifinance_opex_orders',
  CAPEX_ORDERS: 'hospifinance_capex_orders',
  TAB_NAMES: 'hospifinance_tab_names',
  AUTH_USERS: 'hospifinance_auth_users',
  AUTH_SESSION: 'hospifinance_auth_session',
  AUTH_LOGS: 'hospifinance_auth_logs',
  SETTINGS: 'hospifinance_settings',
  VERSION: 'hospifinance_version',
  INITIALIZED: 'hospifinance_initialized' // Flag pour éviter écrasement données
};

const CURRENT_VERSION = __APP_VERSION__;

// ==================== Fonctions génériques ====================

const saveData = (key, data) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error(`Erreur sauvegarde [${key}]:`, error);
    return false;
  }
};

const loadData = (key) => {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error(`Erreur chargement [${key}]:`, error);
    return null;
  }
};

// ==================== OPEX ====================

export const saveOpexData = (data) => {
  saveData(STORAGE_KEYS.VERSION, CURRENT_VERSION);
  return saveData(STORAGE_KEYS.OPEX, data);
};

export const loadOpexData = () => loadData(STORAGE_KEYS.OPEX);

// ==================== CAPEX ====================

export const saveCapexData = (data) => {
  saveData(STORAGE_KEYS.VERSION, CURRENT_VERSION);
  return saveData(STORAGE_KEYS.CAPEX, data);
};

export const loadCapexData = () => loadData(STORAGE_KEYS.CAPEX);

// ==================== Commandes OPEX ====================

export const saveOpexOrders = (data) => saveData(STORAGE_KEYS.OPEX_ORDERS, data);
export const loadOpexOrders = () => loadData(STORAGE_KEYS.OPEX_ORDERS);

// ==================== Commandes CAPEX ====================

export const saveCapexOrders = (data) => saveData(STORAGE_KEYS.CAPEX_ORDERS, data);
export const loadCapexOrders = () => loadData(STORAGE_KEYS.CAPEX_ORDERS);

// ==================== Noms d'onglets ====================

export const saveTabNames = (data) => saveData(STORAGE_KEYS.TAB_NAMES, data);
export const loadTabNames = () => loadData(STORAGE_KEYS.TAB_NAMES);

// ==================== Authentification ====================

export const saveAuthUsers = (data) => saveData(STORAGE_KEYS.AUTH_USERS, data);
export const loadAuthUsers = () => loadData(STORAGE_KEYS.AUTH_USERS);
export const saveAuthSession = (data) => saveData(STORAGE_KEYS.AUTH_SESSION, data);
export const loadAuthSession = () => loadData(STORAGE_KEYS.AUTH_SESSION);
export const clearAuthSession = () => {
  try {
    localStorage.removeItem(STORAGE_KEYS.AUTH_SESSION);
    return true;
  } catch (error) {
    return false;
  }
};

// ==================== Logs de connexion ====================

const MAX_AUTH_LOGS = 200;

export const saveAuthLog = (entry) => {
  const logs = loadData(STORAGE_KEYS.AUTH_LOGS) || [];
  logs.unshift(entry);
  // Garder seulement les N derniers logs
  if (logs.length > MAX_AUTH_LOGS) logs.length = MAX_AUTH_LOGS;
  return saveData(STORAGE_KEYS.AUTH_LOGS, logs);
};

export const loadAuthLogs = () => loadData(STORAGE_KEYS.AUTH_LOGS) || [];

export const clearAuthLogs = () => saveData(STORAGE_KEYS.AUTH_LOGS, []);

// ==================== Paramétrage ====================

export const saveSettings = (data) => saveData(STORAGE_KEYS.SETTINGS, data);
export const loadSettings = () => loadData(STORAGE_KEYS.SETTINGS);

// ==================== Utilitaires ====================

export const clearAllData = () => {
  try {
    Object.values(STORAGE_KEYS).forEach(key => localStorage.removeItem(key));
    return true;
  } catch (error) {
    console.error('Erreur lors de la suppression des données:', error);
    return false;
  }
};

export const hasStoredData = () => {
  return localStorage.getItem(STORAGE_KEYS.OPEX) !== null ||
         localStorage.getItem(STORAGE_KEYS.CAPEX) !== null;
};

export const getStoredVersion = () => {
  return localStorage.getItem(STORAGE_KEYS.VERSION) || '0.0.0';
};

// ==================== Protection des données de production ====================

/**
 * Vérifie si l'application a déjà été initialisée avec des données
 * Retourne true si des données utilisateur existent (pas de données par défaut)
 */
export const isInitialized = () => {
  return localStorage.getItem(STORAGE_KEYS.INITIALIZED) === 'true';
};

/**
 * Marque l'application comme initialisée
 * Appeler après le premier chargement des données par défaut
 */
export const markAsInitialized = () => {
  saveData(STORAGE_KEYS.INITIALIZED, 'true');
  saveData(STORAGE_KEYS.VERSION, CURRENT_VERSION);
};

/**
 * Vérifie si des données OPEX existent (production ou défaut)
 */
export const hasOpexData = () => {
  return localStorage.getItem(STORAGE_KEYS.OPEX) !== null;
};

/**
 * Vérifie si des données CAPEX existent (production ou défaut)
 */
export const hasCapexData = () => {
  return localStorage.getItem(STORAGE_KEYS.CAPEX) !== null;
};
