/**
 * Contexte de paramétrage - dual-mode LocalStorage / API
 * LocalStorage si VITE_API_URL absent, API sinon
 */

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as api from '../services/apiService';
import { saveSettings, loadSettings } from '../services/storageService';
import * as github from '../services/githubStorageService';
import { ENVELOPPES_CAPEX, OPEX_CATEGORIES } from '../constants/budgetConstants';

const USE_API = !!import.meta.env.VITE_API_URL;

const SettingsContext = createContext(null);

const DEFAULT_SETTINGS = {
  appName: 'Tableau de Bord Financier DSI',
  colors: {
    primary: '#2563eb',
    success: '#16a34a',
    warning: '#d97706',
    danger: '#dc2626',
    info: '#0891b2',
    accent: '#7c3aed'
  },
  opexColumns: {
    supplier: true, category: true, budgetAnnuel: true,
    depenseActuelle: true, engagement: true, disponible: true,
    utilisation: true, notes: true, actions: true,
    compteOrdonnateur: false, familleAnalytique: true,
    chargeEngagee: true, tauxRealisation: true,
    resteEngager: false, alerte: true,
  },
  capexColumns: {
    project: true, budgetTotal: true, depense: true,
    engagement: true, disponible: true, utilisation: true,
    status: true, period: true, notes: true, actions: true
  },
  rules: { warningThreshold: 75, criticalThreshold: 90 },
  customColumns: { opex: [], capex: [] },
  customDashboards: [],
  capexEnveloppes: [...ENVELOPPES_CAPEX],
  opexSuppliers: [],
  opexCategories: [...OPEX_CATEGORIES],
  hiddenTabs: []
};

const mergeSettings = (stored) => ({
  ...DEFAULT_SETTINGS,
  ...stored,
  colors: { ...DEFAULT_SETTINGS.colors, ...(stored.colors || {}) },
  opexColumns: { ...DEFAULT_SETTINGS.opexColumns, ...(stored.opexColumns || {}) },
  capexColumns: { ...DEFAULT_SETTINGS.capexColumns, ...(stored.capexColumns || {}) },
  rules: { ...DEFAULT_SETTINGS.rules, ...(stored.rules || {}) },
  customColumns: {
    opex: stored.customColumns?.opex || [],
    capex: stored.customColumns?.capex || []
  },
  customDashboards: stored.customDashboards || [],
  capexEnveloppes: stored.capexEnveloppes || [...ENVELOPPES_CAPEX],
  opexSuppliers: stored.opexSuppliers || [],
  opexCategories: stored.opexCategories || [...OPEX_CATEGORIES],
  hiddenTabs: stored.hiddenTabs || []
});

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      if (USE_API) {
        try {
          const token = localStorage.getItem('authToken');
          if (token) {
            const apiSettings = await api.getSettings();
            setSettings(mergeSettings(apiSettings));
          }
        } catch (err) {
          if (!err.message?.includes('Token') && !err.message?.includes('401')) {
            console.error('Erreur chargement settings:', err);
          }
        } finally {
          setLoading(false);
        }
      } else {
        // Priorité : 1) GitHub (source de vérité), 2) localStorage, 3) defaults
        let loaded = false;

        if (github.isGitHubEnabled()) {
          try {
            const ghSettings = await github.fetchSettings();
            if (ghSettings) {
              const merged = mergeSettings(ghSettings);
              setSettings(merged);
              saveSettings(merged);
              loaded = true;
            }
          } catch (err) {
            console.warn('[GitHub] Sync paramètres échoué:', err.message);
          }
        }

        if (!loaded) {
          const stored = loadSettings();
          if (stored) setSettings(mergeSettings(stored));
        }

        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Appliquer les couleurs CSS custom properties
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--color-primary', settings.colors.primary);
    root.style.setProperty('--color-success', settings.colors.success);
    root.style.setProperty('--color-warning', settings.colors.warning);
    root.style.setProperty('--color-danger', settings.colors.danger);
    root.style.setProperty('--color-info', settings.colors.info);
    root.style.setProperty('--color-accent', settings.colors.accent);
  }, [settings.colors]);

  const persist = useCallback(async (updated) => {
    if (USE_API) {
      try {
        const token = localStorage.getItem('authToken');
        if (token) await api.updateSettings(updated);
      } catch { /* silence */ }
    } else {
      saveSettings(updated);
      if (github.isGitHubEnabled()) {
        github.pushSettings(updated).catch(err => console.warn('[GitHub] Push paramètres échoué:', err.message));
      }
    }
    return updated;
  }, []);

  const updateSettings = useCallback((newSettings) => {
    setSettings(prev => { const u = { ...prev, ...newSettings }; persist(u); return u; });
  }, [persist]);

  const updateColors = useCallback((colorKey, value) => {
    setSettings(prev => { const u = { ...prev, colors: { ...prev.colors, [colorKey]: value } }; persist(u); return u; });
  }, [persist]);

  const toggleOpexColumn = useCallback((columnKey) => {
    setSettings(prev => { const u = { ...prev, opexColumns: { ...prev.opexColumns, [columnKey]: !prev.opexColumns[columnKey] } }; persist(u); return u; });
  }, [persist]);

  const toggleCapexColumn = useCallback((columnKey) => {
    setSettings(prev => { const u = { ...prev, capexColumns: { ...prev.capexColumns, [columnKey]: !prev.capexColumns[columnKey] } }; persist(u); return u; });
  }, [persist]);

  const updateRules = useCallback((ruleKey, value) => {
    setSettings(prev => { const u = { ...prev, rules: { ...prev.rules, [ruleKey]: value } }; persist(u); return u; });
  }, [persist]);

  // Affiche / masque un onglet de navigation
  const toggleTabVisibility = useCallback((tabId) => {
    setSettings(prev => {
      const hidden = prev.hiddenTabs || [];
      const nextHidden = hidden.includes(tabId)
        ? hidden.filter(id => id !== tabId)
        : [...hidden, tabId];
      const u = { ...prev, hiddenTabs: nextHidden };
      persist(u);
      return u;
    });
  }, [persist]);

  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
    persist(DEFAULT_SETTINGS);
  }, [persist]);

  const addCustomColumn = useCallback(async (type, column) => {
    if (USE_API) {
      try {
        const updatedSettings = await api.addCustomColumn(type, column);
        setSettings(mergeSettings(updatedSettings));
      } catch { /* silence */ }
    } else {
      setSettings(prev => {
        const u = { ...prev, customColumns: { ...prev.customColumns, [type]: [...(prev.customColumns[type] || []), { ...column, id: Date.now().toString() }] } };
        saveSettings(u);
        return u;
      });
    }
  }, []);

  const removeCustomColumn = useCallback(async (type, columnId) => {
    if (USE_API) {
      try {
        const updatedSettings = await api.removeCustomColumn(type, columnId);
        setSettings(mergeSettings(updatedSettings));
      } catch { /* silence */ }
    } else {
      setSettings(prev => {
        const u = { ...prev, customColumns: { ...prev.customColumns, [type]: prev.customColumns[type].filter(col => col.id !== columnId) } };
        saveSettings(u);
        return u;
      });
    }
  }, []);

  const updateCustomColumn = useCallback((type, columnId, updates) => {
    setSettings(prev => {
      const u = { ...prev, customColumns: { ...prev.customColumns, [type]: prev.customColumns[type].map(col => col.id === columnId ? { ...col, ...updates } : col) } };
      persist(u);
      return u;
    });
  }, [persist]);

  // --- Custom Dashboards CRUD ---
  const addDashboard = useCallback((dashboard) => {
    setSettings(prev => {
      const u = { ...prev, customDashboards: [...(prev.customDashboards || []), dashboard] };
      persist(u);
      return u;
    });
  }, [persist]);

  const updateDashboard = useCallback((dashboardId, updates) => {
    setSettings(prev => {
      const u = {
        ...prev,
        customDashboards: (prev.customDashboards || []).map(d =>
          d.id === dashboardId ? { ...d, ...updates } : d
        )
      };
      persist(u);
      return u;
    });
  }, [persist]);

  const removeDashboard = useCallback((dashboardId) => {
    setSettings(prev => {
      const u = { ...prev, customDashboards: (prev.customDashboards || []).filter(d => d.id !== dashboardId) };
      persist(u);
      return u;
    });
  }, [persist]);

  // --- Gestion des enveloppes CAPEX (admin uniquement) ---
  const addCapexEnveloppe = useCallback((name) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setSettings(prev => {
      if (prev.capexEnveloppes.includes(trimmed)) return prev;
      const u = { ...prev, capexEnveloppes: [...prev.capexEnveloppes, trimmed] };
      persist(u);
      return u;
    });
  }, [persist]);

  const renameCapexEnveloppe = useCallback((oldName, newName) => {
    const trimmed = newName.trim();
    if (!trimmed || trimmed === oldName) return;
    setSettings(prev => {
      const u = {
        ...prev,
        capexEnveloppes: prev.capexEnveloppes.map(e => e === oldName ? trimmed : e)
      };
      persist(u);
      return u;
    });
  }, [persist]);

  const removeCapexEnveloppe = useCallback((name) => {
    setSettings(prev => {
      const u = { ...prev, capexEnveloppes: prev.capexEnveloppes.filter(e => e !== name) };
      persist(u);
      return u;
    });
  }, [persist]);

  const addOpexSupplier = useCallback((name) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setSettings(prev => {
      if ((prev.opexSuppliers || []).includes(trimmed)) return prev;
      const u = { ...prev, opexSuppliers: [...(prev.opexSuppliers || []), trimmed] };
      persist(u);
      return u;
    });
  }, [persist]);

  const renameOpexSupplier = useCallback((oldName, newName) => {
    const trimmed = newName.trim();
    if (!trimmed || trimmed === oldName) return;
    setSettings(prev => {
      const u = { ...prev, opexSuppliers: (prev.opexSuppliers || []).map(e => e === oldName ? trimmed : e) };
      persist(u);
      return u;
    });
  }, [persist]);

  const removeOpexSupplier = useCallback((name) => {
    setSettings(prev => {
      const u = { ...prev, opexSuppliers: (prev.opexSuppliers || []).filter(e => e !== name) };
      persist(u);
      return u;
    });
  }, [persist]);

  const addOpexCategory = useCallback((name) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setSettings(prev => {
      if ((prev.opexCategories || []).includes(trimmed)) return prev;
      const u = { ...prev, opexCategories: [...(prev.opexCategories || []), trimmed] };
      persist(u);
      return u;
    });
  }, [persist]);

  const renameOpexCategory = useCallback((oldName, newName) => {
    const trimmed = newName.trim();
    if (!trimmed || trimmed === oldName) return;
    setSettings(prev => {
      const u = { ...prev, opexCategories: (prev.opexCategories || []).map(e => e === oldName ? trimmed : e) };
      persist(u);
      return u;
    });
  }, [persist]);

  const removeOpexCategory = useCallback((name) => {
    setSettings(prev => {
      const u = { ...prev, opexCategories: (prev.opexCategories || []).filter(e => e !== name) };
      persist(u);
      return u;
    });
  }, [persist]);

  const reorderDashboards = useCallback((fromIndex, toIndex) => {
    setSettings(prev => {
      const arr = [...(prev.customDashboards || [])];
      const [moved] = arr.splice(fromIndex, 1);
      arr.splice(toIndex, 0, moved);
      const u = { ...prev, customDashboards: arr };
      persist(u);
      return u;
    });
  }, [persist]);

  return (
    <SettingsContext.Provider value={{
      settings, isSettingsOpen, setIsSettingsOpen, loading,
      updateSettings, updateColors, toggleOpexColumn, toggleCapexColumn,
      updateRules, toggleTabVisibility, resetSettings, addCustomColumn, removeCustomColumn, updateCustomColumn,
      addDashboard, updateDashboard, removeDashboard, reorderDashboards,
      addCapexEnveloppe, renameCapexEnveloppe, removeCapexEnveloppe,
      addOpexSupplier, renameOpexSupplier, removeOpexSupplier,
      addOpexCategory, renameOpexCategory, removeOpexCategory,
      DEFAULT_SETTINGS
    }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) throw new Error('useSettings doit être utilisé dans un SettingsProvider');
  return context;
};
