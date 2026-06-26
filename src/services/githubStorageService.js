/**
 * Service de synchronisation GitHub
 * Stocke les données comme fichiers JSON dans un dépôt GitHub.
 * localStorage sert de cache local rapide (écriture immédiate).
 * GitHub est la source de vérité partagée (sync asynchrone).
 *
 * Configuration :
 * 1) Variables d'environnement Vite (VITE_GITHUB_*) — configuration automatique au build
 * 2) localStorage (GITHUB_CONFIG_KEY) — surcharge manuelle via l'UI (optionnel)
 */

const GITHUB_CONFIG_KEY = 'hospifinance_github_config';

/**
 * Configuration par défaut depuis les variables d'environnement Vite.
 * Injectées au build time → disponibles automatiquement dans tous les navigateurs.
 */
const getEnvConfig = () => {
  const token    = import.meta.env.VITE_GITHUB_TOKEN;
  const owner    = import.meta.env.VITE_GITHUB_OWNER;
  const repo     = import.meta.env.VITE_GITHUB_REPO;
  if (!token || !owner || !repo) return null;
  return {
    enabled:  true,
    token,
    owner,
    repo,
    branch:   import.meta.env.VITE_GITHUB_BRANCH   || 'main',
    dataPath: import.meta.env.VITE_GITHUB_DATA_PATH || 'data',
  };
};

const FILES = {
  opex:        'opex.json',
  capex:       'capex.json',
  opexOrders:  'opex-orders.json',
  capexOrders: 'capex-orders.json',
  users:       'users.json',
  settings:    'settings.json',
};

// Cache en mémoire des SHA (requis par l'API GitHub pour les mises à jour)
const shaCache = {};

// ==================== Configuration ====================

export const loadGithubConfig = () => {
  // 1) Variables d'environnement Vite (priorité — config uniforme sur tous les navigateurs)
  const envConfig = getEnvConfig();
  if (envConfig) return envConfig;

  // 2) localStorage (fallback — uniquement si pas d'env vars)
  try {
    const raw = localStorage.getItem(GITHUB_CONFIG_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.enabled && parsed?.token && parsed?.owner && parsed?.repo) {
        return parsed;
      }
    }
  } catch { /* ignore */ }

  return null;
};

export const saveGithubConfig = (config) => {
  try {
    localStorage.setItem(GITHUB_CONFIG_KEY, JSON.stringify(config));
    return true;
  } catch {
    return false;
  }
};

export const clearGithubConfig = () => {
  localStorage.removeItem(GITHUB_CONFIG_KEY);
};

export const isGitHubEnabled = () => {
  const config = loadGithubConfig();
  return !!(config?.enabled && config?.token && config?.owner && config?.repo);
};

// ==================== API interne ====================

const buildUrl = (config, filename) => {
  const dataPath = (config.dataPath || 'data').replace(/\/$/, '');
  return `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${dataPath}/${filename}`;
};

const authHeaders = (config) => ({
  'Authorization': `Bearer ${config.token}`,
  'Accept': 'application/vnd.github.v3+json',
  'Content-Type': 'application/json',
});

/**
 * Lit un fichier JSON depuis GitHub.
 * Retourne { data, sha } ou { data: null, sha: null } si 404.
 */
async function fetchFile(filename, config) {
  const branch = config.branch || 'main';
  const url = `${buildUrl(config, filename)}?ref=${branch}`;
  const res = await fetch(url, { headers: authHeaders(config) });

  if (res.status === 404) return { data: null, sha: null };
  if (!res.ok) throw new Error(`GitHub API ${res.status}: ${res.statusText}`);

  const json = await res.json();
  shaCache[filename] = json.sha;

  // Le contenu est encodé en base64 (avec retours à la ligne)
  const decoded = decodeURIComponent(escape(atob(json.content.replace(/\n/g, ''))));
  return { data: JSON.parse(decoded), sha: json.sha };
}

/**
 * Écrit un fichier JSON dans GitHub (crée ou met à jour).
 */
async function pushFile(filename, data, config, commitMessage) {
  const branch = config.branch || 'main';
  const url = buildUrl(config, filename);

  // Toujours refetch le SHA courant avant chaque push
  // (évite les SHA périmés et les conflits de commits parallèles)
  try {
    const current = await fetchFile(filename, config);
    if (current.sha) shaCache[filename] = current.sha;
    else delete shaCache[filename]; // Fichier inexistant → création
  } catch {
    delete shaCache[filename];
  }

  const content = btoa(unescape(encodeURIComponent(JSON.stringify(data, null, 2))));

  const body = {
    message: commitMessage || `Update ${filename} [hospifinance]`,
    content,
    branch,
    ...(shaCache[filename] ? { sha: shaCache[filename] } : {}),
  };

  const res = await fetch(url, {
    method: 'PUT',
    headers: authHeaders(config),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`GitHub push échoué (${filename}): ${err.message || res.statusText}`);
  }

  const result = await res.json();
  if (result.content?.sha) shaCache[filename] = result.content.sha;
  return result;
}

// ==================== Interface publique ====================

/**
 * Teste la connexion GitHub avec la configuration fournie.
 * Retourne { success, message, private }
 */
export const testConnection = async (config) => {
  try {
    const url = `https://api.github.com/repos/${config.owner}/${config.repo}`;
    const res = await fetch(url, { headers: authHeaders(config) });
    if (res.status === 401) return { success: false, message: 'Token invalide ou expiré' };
    if (res.status === 404) return { success: false, message: 'Dépôt introuvable (vérifiez owner/repo et les droits du token)' };
    if (!res.ok) return { success: false, message: `Erreur ${res.status}: ${res.statusText}` };
    const repo = await res.json();
    return {
      success: true,
      message: `Connecté à "${repo.full_name}" (${repo.private ? 'privé' : 'public'})`,
      private: repo.private,
    };
  } catch (err) {
    return { success: false, message: `Erreur réseau: ${err.message}` };
  }
};

// ---- Lecture individuelle ----

export const fetchOpex         = async (cfg) => { const c = cfg || loadGithubConfig(); if (!c) return null; const r = await fetchFile(FILES.opex, c);        return r.data; };
export const fetchCapex        = async (cfg) => { const c = cfg || loadGithubConfig(); if (!c) return null; const r = await fetchFile(FILES.capex, c);       return r.data; };
export const fetchOpexOrders   = async (cfg) => { const c = cfg || loadGithubConfig(); if (!c) return null; const r = await fetchFile(FILES.opexOrders, c);   return r.data; };
export const fetchCapexOrders  = async (cfg) => { const c = cfg || loadGithubConfig(); if (!c) return null; const r = await fetchFile(FILES.capexOrders, c);  return r.data; };
export const fetchUsers        = async (cfg) => { const c = cfg || loadGithubConfig(); if (!c) return null; const r = await fetchFile(FILES.users, c);        return r.data; };
export const fetchSettings     = async (cfg) => { const c = cfg || loadGithubConfig(); if (!c) return null; const r = await fetchFile(FILES.settings, c);     return r.data; };

// ---- Écriture individuelle ----

export const pushOpex        = async (data, cfg) => { const c = cfg || loadGithubConfig(); if (!c) return; return pushFile(FILES.opex,        data, c, 'Update OPEX fournisseurs'); };
export const pushCapex       = async (data, cfg) => { const c = cfg || loadGithubConfig(); if (!c) return; return pushFile(FILES.capex,       data, c, 'Update CAPEX projets'); };
export const pushOpexOrders  = async (data, cfg) => { const c = cfg || loadGithubConfig(); if (!c) return; return pushFile(FILES.opexOrders,  data, c, 'Update commandes OPEX'); };
export const pushCapexOrders = async (data, cfg) => { const c = cfg || loadGithubConfig(); if (!c) return; return pushFile(FILES.capexOrders, data, c, 'Update commandes CAPEX'); };
export const pushUsers       = async (data, cfg) => { const c = cfg || loadGithubConfig(); if (!c) return; return pushFile(FILES.users,       data, c, 'Update utilisateurs'); };
export const pushSettings    = async (data, cfg) => { const c = cfg || loadGithubConfig(); if (!c) return; return pushFile(FILES.settings,    data, c, 'Update paramètres'); };

/**
 * Lecture de toutes les données depuis GitHub en parallèle.
 * Les fichiers manquants (null) sont ignorés silencieusement.
 */
export const fetchAllData = async (config) => {
  const cfg = config || loadGithubConfig();
  if (!cfg) return null;

  const [opex, capex, opexOrders, capexOrders, users, settings] = await Promise.all([
    fetchFile(FILES.opex,        cfg).then(r => r.data).catch(() => null),
    fetchFile(FILES.capex,       cfg).then(r => r.data).catch(() => null),
    fetchFile(FILES.opexOrders,  cfg).then(r => r.data).catch(() => null),
    fetchFile(FILES.capexOrders, cfg).then(r => r.data).catch(() => null),
    fetchFile(FILES.users,       cfg).then(r => r.data).catch(() => null),
    fetchFile(FILES.settings,    cfg).then(r => r.data).catch(() => null),
  ]);

  return { opex, capex, opexOrders, capexOrders, users, settings };
};

/**
 * Pousse toutes les données vers GitHub de façon SÉQUENTIELLE (synchronisation initiale).
 * Les pushes parallèles causent des conflits de référence de branche sur GitHub.
 */
export const pushAllData = async (payload, config) => {
  const cfg = config || loadGithubConfig();
  if (!cfg) throw new Error('GitHub non configuré');

  const files = [
    payload.opex        !== undefined ? [FILES.opex,        payload.opex,        'Sync initial: OPEX']           : null,
    payload.capex       !== undefined ? [FILES.capex,       payload.capex,       'Sync initial: CAPEX']          : null,
    payload.opexOrders  !== undefined ? [FILES.opexOrders,  payload.opexOrders,  'Sync initial: commandes OPEX'] : null,
    payload.capexOrders !== undefined ? [FILES.capexOrders, payload.capexOrders, 'Sync initial: commandes CAPEX']: null,
    payload.users       !== undefined ? [FILES.users,       payload.users,       'Sync initial: utilisateurs']   : null,
    payload.settings    !== undefined ? [FILES.settings,    payload.settings,    'Sync initial: paramètres']     : null,
  ].filter(Boolean);

  const errors = [];
  let pushed = 0;

  // Séquentiel : chaque push attend que le précédent soit terminé
  for (const [filename, data, message] of files) {
    try {
      await pushFile(filename, data, cfg, message);
      pushed++;
    } catch (err) {
      errors.push(err.message);
    }
  }

  if (errors.length > 0) {
    throw new Error(`${errors.length} fichier(s) non synchronisé(s) : ${errors.join(' | ')}`);
  }
  return { success: true, pushed };
};
