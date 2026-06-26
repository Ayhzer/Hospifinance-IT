/**
 * Hook personnalisé pour la gestion des commandes (OPEX ou CAPEX)
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  saveOpexOrders, loadOpexOrders,
  saveCapexOrders, loadCapexOrders
} from '../services/storageService';
import { validateOrderData, parseNumber, sanitizeString } from '../utils/validators';
import { ORDER_STATUS } from '../constants/orderConstants';
import * as api from '../services/apiService';
import * as github from '../services/githubStorageService';

const USE_API = !!import.meta.env.VITE_API_URL;

const saveFunctions = {
  opex: saveOpexOrders,
  capex: saveCapexOrders
};

const loadFunctions = {
  opex: loadOpexOrders,
  capex: loadCapexOrders
};

const githubFetchFns = {
  opex:  () => github.fetchOpexOrders(),
  capex: () => github.fetchCapexOrders(),
};

const githubPushFns = {
  opex:  (data) => github.pushOpexOrders(data),
  capex: (data) => github.pushCapexOrders(data),
};

const apiFetchFns = {
  opex:  () => api.getOpexOrders(),
  capex: () => api.getCapexOrders(),
};

const apiPushFns = {
  opex:  (data) => api.replaceAllOpexOrders(data),
  capex: (data) => api.replaceAllCapexOrders(data),
};

export const useOrderData = (type = 'opex') => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const githubPushTimer = useRef(null);
  const skipNextGithubPush = useRef(false);
  const apiPushTimer = useRef(null);
  const skipNextApiPush = useRef(false);

  const saveFn   = saveFunctions[type];
  const loadFn   = loadFunctions[type];
  const ghFetch  = githubFetchFns[type];
  const ghPush   = githubPushFns[type];
  const apiFetch = apiFetchFns[type];
  const apiPush  = apiPushFns[type];

  // Chargement initial : API si VITE_API_URL, sinon GitHub (bloquant) puis localStorage
  useEffect(() => {
    const loadData = async () => {
      // Mode API — source de vérité unique (cohérent avec useOpexData/useCapexData)
      if (USE_API) {
        try {
          const token = localStorage.getItem('authToken');
          if (!token) { setLoading(false); return; }
          const data = await apiFetch();
          skipNextApiPush.current = true;
          setOrders(data || []);
        } catch (err) {
          if (!err.message?.includes('Token') && !err.message?.includes('401')) {
            setError(err.message);
          }
          setOrders([]);
        } finally {
          setLoading(false);
        }
        return;
      }

      let loaded = false;

      // 1) GitHub d'abord (source de vérité)
      if (github.isGitHubEnabled()) {
        try {
          const ghData = await ghFetch();
          if (ghData !== null && ghData.length > 0) {
            skipNextGithubPush.current = true;
            setOrders(ghData);
            saveFn(ghData);
            loaded = true;
          }
        } catch (err) {
          console.warn(`[GitHub] Sync commandes ${type} échoué:`, err.message);
        }
      }

      // 2) Sinon localStorage
      if (!loaded) {
        const storedData = loadFn();
        setOrders(storedData || []);
      }

      setLoading(false);
    };
    loadData();
  }, [loadFn, saveFn, ghFetch, apiFetch, type]);

  // Sauvegarde automatique : API (replace-all débouncé) ou localStorage + push GitHub
  useEffect(() => {
    if (loading) return;

    if (USE_API) {
      if (skipNextApiPush.current) {
        skipNextApiPush.current = false;
        return;
      }
      clearTimeout(apiPushTimer.current);
      apiPushTimer.current = setTimeout(() => {
        apiPush(orders).catch(err => console.warn(`[API] Push commandes ${type} échoué:`, err.message));
      }, 800);
      return;
    }

    saveFn(orders);
    if (github.isGitHubEnabled()) {
      if (skipNextGithubPush.current) {
        skipNextGithubPush.current = false;
        return;
      }
      clearTimeout(githubPushTimer.current);
      githubPushTimer.current = setTimeout(() => {
        ghPush(orders).catch(err => console.warn(`[GitHub] Push commandes ${type} échoué:`, err.message));
      }, 800);
    }
  }, [orders, loading, saveFn, ghPush, apiPush, type]);

  const addOrder = useCallback((orderData) => {
    const validation = validateOrderData(orderData);
    if (!validation.isValid) {
      setError(validation.errors.join(', '));
      return { success: false, errors: validation.errors };
    }

    const newOrder = {
      id: Date.now() + Math.random(),
      parentId:          orderData.parentId,
      description:       sanitizeString(orderData.description),
      montant:           parseNumber(orderData.montant, 0),
      status:            orderData.status || ORDER_STATUS.PENDING,
      dateCommande:      orderData.dateCommande || '',
      dateFacture:       orderData.dateFacture || '',
      dateReception:     orderData.dateReception || '',
      reference:         sanitizeString(orderData.reference),
      numeroMarche:      orderData.numeroMarche !== undefined ? Number(orderData.numeroMarche) : 0,
      typeCommande:      sanitizeString(orderData.typeCommande || ''),
      etatSage:          sanitizeString(orderData.etatSage || ''),
      compteOrdonnateur: sanitizeString(orderData.compteOrdonnateur || ''),
      notes:             sanitizeString(orderData.notes)
    };

    setOrders(prev => {
      if (prev.some(o => String(o.id) === String(newOrder.id))) return prev;
      return [...prev, newOrder];
    });
    setError(null);
    return { success: true, data: newOrder };
  }, []);

  const updateOrder = useCallback((id, orderData) => {
    const validation = validateOrderData(orderData);
    if (!validation.isValid) {
      setError(validation.errors.join(', '));
      return { success: false, errors: validation.errors };
    }

    const updatedOrder = {
      id,
      parentId:          orderData.parentId,
      description:       sanitizeString(orderData.description),
      montant:           parseNumber(orderData.montant, 0),
      status:            orderData.status,
      dateCommande:      orderData.dateCommande || '',
      dateFacture:       orderData.dateFacture || '',
      dateReception:     orderData.dateReception || '',
      reference:         sanitizeString(orderData.reference),
      numeroMarche:      orderData.numeroMarche !== undefined ? Number(orderData.numeroMarche) : 0,
      typeCommande:      sanitizeString(orderData.typeCommande || ''),
      etatSage:          sanitizeString(orderData.etatSage || ''),
      compteOrdonnateur: sanitizeString(orderData.compteOrdonnateur || ''),
      notes:             sanitizeString(orderData.notes)
    };

    setOrders(prev => {
      const deduped = prev.filter((o, i, arr) => arr.findIndex(x => String(x.id) === String(o.id)) === i);
      return deduped.map(o => String(o.id) === String(id) ? updatedOrder : o);
    });
    setError(null);
    return { success: true, data: updatedOrder };
  }, []);

  const deleteOrder = useCallback((id) => {
    setOrders(prev => prev.filter(o => o.id !== id));
    setError(null);
    return { success: true };
  }, []);

  const clearAll = useCallback(() => {
    setOrders([]);
    setError(null);
  }, []);

  const replaceAllOrders = useCallback((newOrders) => {
    setOrders(newOrders);
    setError(null);
    return { success: true };
  }, []);

  return {
    orders,
    loading,
    error,
    addOrder,
    updateOrder,
    deleteOrder,
    clearAll,
    replaceAllOrders,
    setError
  };
};
