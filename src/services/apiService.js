/**
 * Service API pour communiquer avec le backend
 * Remplace storageService pour utiliser MongoDB via l'API
 */

// URL de l'API — uniquement si VITE_API_URL est définie
// En production GitHub Pages, VITE_API_URL est vide → USE_API=false partout
const API_BASE_URL = import.meta.env.VITE_API_URL || '';

// Log de l'URL utilisée (seulement en développement)
if (import.meta.env.DEV) {
  console.log('🔌 API URL:', API_BASE_URL);
}

/**
 * Récupération du token JWT depuis localStorage
 */
const getAuthToken = () => {
  return localStorage.getItem('authToken');
};

/**
 * Sauvegarde du token JWT
 */
export const setAuthToken = (token) => {
  if (token) {
    localStorage.setItem('authToken', token);
  } else {
    localStorage.removeItem('authToken');
  }
};

/**
 * Configuration des headers avec authentification
 */
const getHeaders = () => {
  const headers = {
    'Content-Type': 'application/json'
  };

  const token = getAuthToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return headers;
};

/**
 * Gestion des erreurs API
 */
const handleResponse = async (response) => {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Erreur serveur' }));
    throw new Error(error.error || `Erreur HTTP ${response.status}`);
  }
  return response.json();
};

// ========================================
// AUTHENTIFICATION
// ========================================

export const login = async (username, password) => {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });

  const data = await handleResponse(response);
  setAuthToken(data.token);
  return data;
};

export const logout = async () => {
  try {
    await fetch(`${API_BASE_URL}/auth/logout`, {
      method: 'POST',
      headers: getHeaders()
    });
  } finally {
    setAuthToken(null);
  }
};

export const getCurrentUser = async () => {
  const response = await fetch(`${API_BASE_URL}/auth/me`, {
    headers: getHeaders()
  });
  return handleResponse(response);
};

// ========================================
// UTILISATEURS
// ========================================

export const getUsers = async () => {
  const response = await fetch(`${API_BASE_URL}/users`, {
    headers: getHeaders()
  });
  return handleResponse(response);
};

export const createUser = async (userData) => {
  const response = await fetch(`${API_BASE_URL}/users`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(userData)
  });
  return handleResponse(response);
};

export const updateUser = async (userId, userData) => {
  const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(userData)
  });
  return handleResponse(response);
};

export const deleteUser = async (userId) => {
  const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
    method: 'DELETE',
    headers: getHeaders()
  });
  return handleResponse(response);
};

export const changePassword = async (userId, currentPassword, newPassword) => {
  const response = await fetch(`${API_BASE_URL}/users/${userId}/password`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify({ currentPassword, newPassword })
  });
  return handleResponse(response);
};

// ========================================
// OPEX
// ========================================

export const getOpex = async () => {
  const response = await fetch(`${API_BASE_URL}/opex`, {
    headers: getHeaders()
  });
  return handleResponse(response);
};

export const createOpex = async (supplierData) => {
  const response = await fetch(`${API_BASE_URL}/opex`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(supplierData)
  });
  return handleResponse(response);
};

export const updateOpex = async (supplierId, supplierData) => {
  const response = await fetch(`${API_BASE_URL}/opex/${supplierId}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(supplierData)
  });
  return handleResponse(response);
};

export const deleteOpex = async (supplierId) => {
  const response = await fetch(`${API_BASE_URL}/opex/${supplierId}`, {
    method: 'DELETE',
    headers: getHeaders()
  });
  return handleResponse(response);
};

export const replaceAllOpex = async (suppliers) => {
  const response = await fetch(`${API_BASE_URL}/opex`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(suppliers)
  });
  return handleResponse(response);
};

// ========================================
// CAPEX
// ========================================

export const getCapex = async () => {
  const response = await fetch(`${API_BASE_URL}/capex`, {
    headers: getHeaders()
  });
  return handleResponse(response);
};

export const createCapex = async (projectData) => {
  const response = await fetch(`${API_BASE_URL}/capex`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(projectData)
  });
  return handleResponse(response);
};

export const updateCapex = async (projectId, projectData) => {
  const response = await fetch(`${API_BASE_URL}/capex/${projectId}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(projectData)
  });
  return handleResponse(response);
};

export const replaceAllCapex = async (projects) => {
  const response = await fetch(`${API_BASE_URL}/capex`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(projects)
  });
  return handleResponse(response);
};

export const deleteCapex = async (projectId) => {
  const response = await fetch(`${API_BASE_URL}/capex/${projectId}`, {
    method: 'DELETE',
    headers: getHeaders()
  });
  return handleResponse(response);
};

// ========================================
// COMMANDES (OPEX / CAPEX)
// Modèle bulk : le hook gère toujours le tableau complet → GET + PUT remplacement.
// ========================================

export const getOpexOrders = async () => {
  const response = await fetch(`${API_BASE_URL}/opex-orders`, {
    headers: getHeaders()
  });
  return handleResponse(response);
};

export const replaceAllOpexOrders = async (orders) => {
  const response = await fetch(`${API_BASE_URL}/opex-orders`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(orders)
  });
  return handleResponse(response);
};

export const getCapexOrders = async () => {
  const response = await fetch(`${API_BASE_URL}/capex-orders`, {
    headers: getHeaders()
  });
  return handleResponse(response);
};

export const replaceAllCapexOrders = async (orders) => {
  const response = await fetch(`${API_BASE_URL}/capex-orders`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(orders)
  });
  return handleResponse(response);
};

// ========================================
// SETTINGS
// ========================================

export const getSettings = async () => {
  const response = await fetch(`${API_BASE_URL}/settings`, {
    headers: getHeaders()
  });
  return handleResponse(response);
};

export const updateSettings = async (settings) => {
  const response = await fetch(`${API_BASE_URL}/settings`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(settings)
  });
  return handleResponse(response);
};

export const addCustomColumn = async (type, column) => {
  const response = await fetch(`${API_BASE_URL}/settings/custom-columns`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ type, column })
  });
  return handleResponse(response);
};

export const removeCustomColumn = async (type, columnId) => {
  const response = await fetch(`${API_BASE_URL}/settings/custom-columns/${type}/${columnId}`, {
    method: 'DELETE',
    headers: getHeaders()
  });
  return handleResponse(response);
};

// ========================================
// SOURCE D'IMPORT AUTOMATIQUE (serveur local uniquement)
// ========================================

/** Statut de la source configurée (chemin lu côté serveur dans settings.json). */
export const getAutoImportStatus = async () => {
  const response = await fetch(`${API_BASE_URL}/auto-import/status`, {
    method: 'GET',
    headers: getHeaders()
  });
  return handleResponse(response);
};

/** Télécharge le fichier source et le renvoie en Blob (parsable par importCommandes). */
export const fetchAutoImportFile = async () => {
  const response = await fetch(`${API_BASE_URL}/auto-import/file`, {
    method: 'GET',
    headers: getHeaders()
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Erreur serveur' }));
    throw new Error(error.error || `Erreur HTTP ${response.status}`);
  }
  return response.blob();
};
