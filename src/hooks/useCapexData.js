/**
 * Hook CAPEX - dual-mode LocalStorage / API
 * LocalStorage si VITE_API_URL absent, API sinon
 */

import { useState, useEffect, useCallback, useRef } from 'react';

const USE_API = !!import.meta.env.VITE_API_URL;

import { saveCapexData, loadCapexData, hasCapexData, markAsInitialized } from '../services/storageService';
import { validateCapexData, parseNumber, sanitizeString } from '../utils/validators';
import * as api from '../services/apiService';
import * as github from '../services/githubStorageService';

const DEFAULT_CAPEX_DATA = [
  { id: 1, enveloppe: 'Infrastructure', project: 'Renouvellement Datacenter', budgetTotal: 2000000, depense: 1200000, engagement: 300000, dateDebut: '2024-01-01', dateFin: '2024-12-31', status: 'En cours', notes: 'Phase 2 en cours' },
  { id: 2, enveloppe: 'Poste de travail', project: 'Déploiement VDI', budgetTotal: 800000, depense: 650000, engagement: 100000, dateDebut: '2024-03-01', dateFin: '2024-11-30', status: 'En cours', notes: '85% des postes déployés' },
  { id: 3, enveloppe: 'Cybersécurité', project: 'Cybersécurité - SIEM', budgetTotal: 500000, depense: 500000, engagement: 0, dateDebut: '2023-09-01', dateFin: '2024-02-28', status: 'Terminé', notes: 'Projet finalisé' }
];

export const useCapexData = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const githubPushTimer = useRef(null);
  const skipNextGithubPush = useRef(false);

  useEffect(() => {
    const loadData = async () => {
      if (USE_API) {
        try {
          const token = localStorage.getItem('authToken');
          if (!token) { setLoading(false); return; }
          const data = await api.getCapex();
          setProjects(data || []);
        } catch (err) {
          if (!err.message?.includes('Token') && !err.message?.includes('401')) {
            setError(err.message);
          }
          setProjects([]);
        } finally {
          setLoading(false);
        }
      } else {
        // Priorité : 1) GitHub (source de vérité), 2) localStorage, 3) defaults
        let loaded = false;

        // 1) Tenter GitHub d'abord (bloquant) pour préserver les données de production
        if (github.isGitHubEnabled()) {
          try {
            const ghData = await github.fetchCapex();
            if (ghData !== null && ghData.length > 0) {
              skipNextGithubPush.current = true;
              setProjects(ghData);
              saveCapexData(ghData);
              markAsInitialized();
              loaded = true;
            }
          } catch (err) {
            console.warn('[GitHub] Sync CAPEX échoué:', err.message);
          }
        }

        // 2) Sinon, localStorage
        if (!loaded) {
          const storedData = loadCapexData();
          if (storedData && storedData.length > 0) {
            setProjects(storedData);
            loaded = true;
          }
        }

        // 3) En dernier recours : données par défaut (uniquement si jamais initialisé)
        if (!loaded) {
          if (!hasCapexData()) {
            setProjects(DEFAULT_CAPEX_DATA);
            saveCapexData(DEFAULT_CAPEX_DATA);
            markAsInitialized();
          } else {
            setProjects([]);
          }
        }

        setLoading(false);
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    if (!USE_API && !loading) {
      saveCapexData(projects);
      if (github.isGitHubEnabled()) {
        if (skipNextGithubPush.current) {
          skipNextGithubPush.current = false;
          return;
        }
        clearTimeout(githubPushTimer.current);
        githubPushTimer.current = setTimeout(() => {
          github.pushCapex(projects).catch(err => console.warn('[GitHub] Push CAPEX échoué:', err.message));
        }, 800);
      }
    }
  }, [projects, loading]);

  const addProject = useCallback(async (projectData) => {
    const validation = validateCapexData(projectData);
    if (!validation.isValid) {
      setError(validation.errors.join(', '));
      return { success: false, errors: validation.errors };
    }

    if (USE_API) {
      try {
        const newProject = await api.createCapex(projectData);
        setProjects(prev => {
          // Guard anti-doublon : ne pas ajouter si l'id existe déjà
          if (prev.some(p => String(p.id) === String(newProject.id))) return prev;
          return [...prev, newProject];
        });
        setError(null);
        return { success: true, data: newProject };
      } catch (err) {
        setError(err.message);
        return { success: false, errors: [err.message] };
      }
    } else {
      const customFields = {};
      Object.keys(projectData).forEach(k => { if (k.startsWith('custom_')) customFields[k] = projectData[k]; });
      const newProject = {
        id: Date.now() + Math.random(),
        fournisseur: sanitizeString(projectData.fournisseur),
        enveloppe: projectData.enveloppe || 'Autre',
        familleAnalytique: projectData.familleAnalytique || '',
        sousCategorie: projectData.sousCategorie || '',
        project: sanitizeString(projectData.project),
        budgetTotal: parseNumber(projectData.budgetTotal, 0),
        depense: parseNumber(projectData.depense, 0),
        engagement: parseNumber(projectData.engagement, 0),
        dateDebut: projectData.dateDebut || '',
        dateFin: projectData.dateFin || '',
        status: projectData.status || 'Planifié',
        notes: sanitizeString(projectData.notes),
        ...customFields
      };
      setProjects(prev => {
        if (prev.some(p => String(p.id) === String(newProject.id))) return prev;
        return [...prev, newProject];
      });
      setError(null);
      return { success: true, data: newProject };
    }
  }, []);

  const updateProject = useCallback(async (id, projectData) => {
    const validation = validateCapexData(projectData);
    if (!validation.isValid) {
      setError(validation.errors.join(', '));
      return { success: false, errors: validation.errors };
    }

    if (USE_API) {
      try {
        const updated = await api.updateCapex(id, projectData);
        setProjects(prev => {
          const deduped = prev.filter((p, i, arr) => arr.findIndex(x => String(x.id) === String(p.id)) === i);
          return deduped.map(p => String(p.id) === String(id) ? updated : p);
        });
        setError(null);
        return { success: true, data: updated };
      } catch (err) {
        setError(err.message);
        return { success: false, errors: [err.message] };
      }
    } else {
      const customFields = {};
      Object.keys(projectData).forEach(k => { if (k.startsWith('custom_')) customFields[k] = projectData[k]; });
      const updated = {
        id,
        fournisseur: sanitizeString(projectData.fournisseur),
        enveloppe: projectData.enveloppe || 'Autre',
        familleAnalytique: projectData.familleAnalytique || '',
        sousCategorie: projectData.sousCategorie || '',
        project: sanitizeString(projectData.project),
        budgetTotal: parseNumber(projectData.budgetTotal, 0),
        depense: parseNumber(projectData.depense, 0),
        engagement: parseNumber(projectData.engagement, 0),
        dateDebut: projectData.dateDebut || '',
        dateFin: projectData.dateFin || '',
        status: projectData.status || 'Planifié',
        notes: sanitizeString(projectData.notes),
        ...customFields
      };
      setProjects(prev => {
        const deduped = prev.filter((p, i, arr) => arr.findIndex(x => String(x.id) === String(p.id)) === i);
        return deduped.map(p => String(p.id) === String(id) ? updated : p);
      });
      setError(null);
      return { success: true, data: updated };
    }
  }, []);

  const deleteProject = useCallback(async (id) => {
    if (USE_API) {
      try {
        await api.deleteCapex(id);
        setProjects(prev => prev.filter(p => p.id !== id));
        setError(null);
        return { success: true };
      } catch (err) {
        setError(err.message);
        return { success: false, errors: [err.message] };
      }
    } else {
      setProjects(prev => prev.filter(p => p.id !== id));
      setError(null);
      return { success: true };
    }
  }, []);

  const resetToDefaults = useCallback(() => {
    if (!USE_API) setProjects(DEFAULT_CAPEX_DATA);
    setError(null);
  }, []);

  const clearAll = useCallback(async () => {
    // Mode API : persister l'effacement côté serveur (replace-all []), sinon
    // les données reviennent au prochain chargement. Aligné sur replaceAllProjects.
    if (USE_API) {
      try {
        await api.replaceAllCapex([]);
      } catch (err) {
        setError(err.message);
        return { success: false, errors: [err.message] };
      }
    }
    setProjects([]);
    setError(null);
    return { success: true };
  }, []);

  const replaceAllProjects = useCallback(async (newProjects) => {
    if (USE_API) {
      try {
        await api.replaceAllCapex(newProjects);
        setProjects(newProjects);
        setError(null);
        return { success: true };
      } catch (err) {
        setError(err.message);
        return { success: false, errors: [err.message] };
      }
    } else {
      setProjects(newProjects);
      setError(null);
      return { success: true };
    }
  }, []);

  const calculateEnveloppeTotal = useCallback((enveloppe) => {
    return projects
      .filter(p => p.enveloppe === enveloppe)
      .reduce((acc, p) => ({
        budget: acc.budget + (Number(p.budgetTotal) || 0),
        depense: acc.depense + (Number(p.depense) || 0),
        engagement: acc.engagement + (Number(p.engagement) || 0),
        count: acc.count + 1
      }), { budget: 0, depense: 0, engagement: 0, count: 0 });
  }, [projects]);

  const getUsedEnveloppes = useCallback(() => {
    return Array.from(new Set(projects.map(p => p.enveloppe).filter(Boolean))).sort();
  }, [projects]);

  return { projects, loading, error, addProject, updateProject, deleteProject, resetToDefaults, clearAll, replaceAllProjects, setError, calculateEnveloppeTotal, getUsedEnveloppes };
};
