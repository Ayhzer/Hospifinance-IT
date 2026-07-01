/**
 * Contexte d'authentification - dual-mode LocalStorage / API
 * LocalStorage si VITE_API_URL absent, API sinon
 */

import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import * as api from '../services/apiService';
import {
  saveAuthUsers, loadAuthUsers,
  saveAuthSession, loadAuthSession, clearAuthSession,
  saveAuthLog, loadAuthLogs, clearAuthLogs
} from '../services/storageService';
import * as github from '../services/githubStorageService';
import { isAuthRequired, setAuthRequired as persistAuthRequired } from '../config/runtimeConfig';

const USE_API = !!import.meta.env.VITE_API_URL;
const DEV_TOKEN = 'dev-local-bypass-2026';

const AuthContext = createContext(null);

// ---- Mode LocalStorage : utilisateurs par défaut ----
const DEFAULT_USERS = [
  { id: 1, username: 'admin', password: btoa('Admin2024!'), role: 'superadmin', disabled: false },
  { id: 2, username: 'user', password: btoa('User2024!'), role: 'user', disabled: false }
];

const initUsers = () => {
  const stored = loadAuthUsers();
  if (stored && stored.length > 0) return stored;
  saveAuthUsers(DEFAULT_USERS);
  return DEFAULT_USERS;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [authLogs, setAuthLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [authRequired, setAuthRequired] = useState(() => isAuthRequired());
  const githubPushTimer = useRef(null);
  const skipNextGithubPush = useRef(false);

  useEffect(() => {
    const init = async () => {
      // Authentification désactivée → accès direct en administrateur (pas de login).
      if (!authRequired) {
        const allUsers = initUsers();
        const devAdmin = allUsers.find(u => u.role === 'superadmin' && !u.disabled) || allUsers[0];
        if (devAdmin) {
          setUsers(allUsers);
          if (USE_API) {
            localStorage.setItem('authToken', DEV_TOKEN);
            api.setAuthToken(DEV_TOKEN);
          }
          setUser({ id: devAdmin.id, username: devAdmin.username, role: devAdmin.role });
          setLoading(false);
          return;
        }
      }

      if (USE_API) {
        try {
          const token = localStorage.getItem('authToken');
          if (token) {
            const response = await api.getCurrentUser();
            setUser(response.user);
          }
        } catch {
          api.setAuthToken(null);
        } finally {
          setLoading(false);
        }
      } else {
        // Priorité : 1) GitHub (source de vérité), 2) localStorage, 3) defaults
        let allUsers;

        if (github.isGitHubEnabled()) {
          try {
            const ghUsers = await github.fetchUsers();
            if (ghUsers !== null && ghUsers.length > 0) {
              skipNextGithubPush.current = true;
              saveAuthUsers(ghUsers);
              allUsers = ghUsers;
            }
          } catch (err) {
            console.warn('[GitHub] Sync utilisateurs échoué:', err.message);
          }
        }

        if (!allUsers) {
          allUsers = initUsers();
        }

        setUsers(allUsers);
        setAuthLogs(loadAuthLogs());

        const session = loadAuthSession();
        if (session) {
          const found = allUsers.find(u => u.id === session.userId && !u.disabled);
          if (found) setUser({ id: found.id, username: found.username, role: found.role });
          else clearAuthSession();
        }
        setLoading(false);
      }
    };
    init();
    // Init au montage uniquement ; les bascules ultérieures passent par updateAuthRequired.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sauvegarde automatique localStorage + push GitHub quand users change
  useEffect(() => {
    if (!loading && !USE_API && users.length > 0) {
      saveAuthUsers(users);
      if (github.isGitHubEnabled()) {
        if (skipNextGithubPush.current) {
          skipNextGithubPush.current = false;
          return;
        }
        clearTimeout(githubPushTimer.current);
        githubPushTimer.current = setTimeout(() => {
          github.pushUsers(users).catch(err => console.warn('[GitHub] Push utilisateurs échoué:', err.message));
        }, 800);
      }
    }
  }, [users, loading]);

  // Charger la liste des utilisateurs (mode API, admins uniquement)
  const loadUsers = useCallback(async () => {
    if (!USE_API) return;
    try {
      const userList = await api.getUsers();
      setUsers(userList);
    } catch { /* silence */ }
  }, []);

  useEffect(() => {
    if (USE_API && user && (user.role === 'admin' || user.role === 'superadmin')) {
      loadUsers();
    }
  }, [user, loadUsers]);

  const login = useCallback(async (username, password) => {
    if (USE_API) {
      try {
        const response = await api.login(username, password);
        setUser(response.user);
        return { success: true };
      } catch (err) {
        return { success: false, error: err.message || 'Identifiants incorrects' };
      }
    } else {
      const allUsers = loadAuthUsers() || [];
      const found = allUsers.find(u => u.username === username && !u.disabled);
      if (!found || btoa(password) !== found.password) {
        saveAuthLog({ id: Date.now(), type: 'login_failed', username, timestamp: new Date().toISOString(), detail: 'Identifiants incorrects' });
        setAuthLogs(loadAuthLogs());
        return { success: false, error: 'Identifiants incorrects' };
      }
      setUser({ id: found.id, username: found.username, role: found.role });
      setUsers(allUsers);
      saveAuthSession({ userId: found.id });
      saveAuthLog({ id: Date.now(), type: 'login_success', username, timestamp: new Date().toISOString() });
      setAuthLogs(loadAuthLogs());
      return { success: true };
    }
  }, []);

  const logout = useCallback(async () => {
    if (USE_API) {
      try { await api.logout(); } catch { /* silence */ }
    } else if (user) {
      saveAuthLog({ id: Date.now(), type: 'logout', username: user.username, timestamp: new Date().toISOString() });
      setAuthLogs(loadAuthLogs());
      clearAuthSession();
    }
    setUser(null);
    setUsers([]);
  }, [user]);

  const addUser = useCallback(async (username, password, role = 'user') => {
    if (USE_API) {
      try {
        const newUser = await api.createUser({ username, password, role });
        setUsers(prev => [...prev, newUser]);
        return { success: true };
      } catch (err) {
        return { success: false, error: err.message };
      }
    } else {
      const allUsers = loadAuthUsers() || [];
      if (allUsers.find(u => u.username === username)) return { success: false, error: 'Ce nom d\'utilisateur existe déjà' };
      const newUser = { id: Date.now(), username, password: btoa(password), role, disabled: false };
      const updated = [...allUsers, newUser];
      saveAuthUsers(updated);
      setUsers(updated);
      return { success: true };
    }
  }, []);

  const deleteUser = useCallback(async (userId) => {
    if (USE_API) {
      try {
        await api.deleteUser(userId);
        setUsers(prev => prev.filter(u => u.id !== userId));
        return { success: true };
      } catch (err) {
        return { success: false, error: err.message };
      }
    } else {
      const updated = (loadAuthUsers() || []).filter(u => u.id !== userId);
      saveAuthUsers(updated);
      setUsers(updated);
      return { success: true };
    }
  }, []);

  const toggleUserDisabled = useCallback(async (userId) => {
    if (USE_API) {
      return { success: false, error: 'Fonctionnalité pas encore disponible avec l\'API' };
    } else {
      const updated = (loadAuthUsers() || []).map(u => u.id === userId ? { ...u, disabled: !u.disabled } : u);
      saveAuthUsers(updated);
      setUsers(updated);
      return { success: true };
    }
  }, []);

  const updateUserRole = useCallback(async (userId, newRole) => {
    if (USE_API) {
      try {
        await api.updateUser(userId, { role: newRole });
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
        return { success: true };
      } catch (err) {
        return { success: false, error: err.message };
      }
    } else {
      const allUsers = loadAuthUsers() || [];
      const target = allUsers.find(u => u.id === userId);
      if (!target) return { success: false, error: 'Utilisateur introuvable' };
      if (target.username === 'admin') return { success: false, error: 'Impossible de modifier le rôle du superadmin principal' };
      const updated = allUsers.map(u => u.id === userId ? { ...u, role: newRole } : u);
      saveAuthUsers(updated);
      setUsers(updated);
      return { success: true };
    }
  }, []);

  const changePassword = useCallback(async (userId, newPassword, currentPassword = null) => {
    if (USE_API) {
      try {
        await api.changePassword(userId, currentPassword, newPassword);
        return { success: true };
      } catch (err) {
        return { success: false, error: err.message };
      }
    } else {
      const allUsers = loadAuthUsers() || [];
      const found = allUsers.find(u => u.id === userId);
      if (!found) return { success: false, error: 'Utilisateur introuvable' };
      if (currentPassword && btoa(currentPassword) !== found.password) return { success: false, error: 'Mot de passe actuel incorrect' };
      const updated = allUsers.map(u => u.id === userId ? { ...u, password: btoa(newPassword) } : u);
      saveAuthUsers(updated);
      setUsers(updated);
      return { success: true };
    }
  }, []);

  const clearLogs = useCallback(() => {
    clearAuthLogs();
    setAuthLogs([]);
  }, []);

  // Active / désactive l'exigence de connexion (login / mot de passe).
  const updateAuthRequired = useCallback((required) => {
    persistAuthRequired(required);
    setAuthRequired(required);
    if (required) {
      // Exiger la connexion : fermer la session courante → écran de login.
      clearAuthSession();
      if (USE_API) { localStorage.removeItem('authToken'); api.setAuthToken(null); }
      setUser(null);
    } else {
      // Login désactivé : accès direct en administrateur.
      const allUsers = (users && users.length) ? users : initUsers();
      const admin = allUsers.find(u => u.role === 'superadmin' && !u.disabled) || allUsers[0];
      setUsers(allUsers);
      if (admin) {
        if (USE_API) { localStorage.setItem('authToken', DEV_TOKEN); api.setAuthToken(DEV_TOKEN); }
        setUser({ id: admin.id, username: admin.username, role: admin.role });
      }
    }
  }, [users]);

  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';
  const isSuperAdmin = user?.role === 'superadmin';

  return (
    <AuthContext.Provider value={{
      user, users, authLogs, loading,
      login, logout, addUser, deleteUser,
      toggleUserDisabled, changePassword, updateUserRole, clearLogs,
      authRequired, updateAuthRequired,
      isAdmin, isSuperAdmin
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth doit être utilisé dans un AuthProvider');
  return context;
};
