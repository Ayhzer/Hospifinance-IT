/**
 * useAutoImportWatcher — surveille la source d'import configurée.
 *
 * Au montage (lancement de l'outil), interroge le serveur local pour connaître
 * la version courante du fichier source. Si une version plus récente que celle
 * déjà vue / importée est disponible (et prête), expose `pending` afin de
 * déclencher la popup de mise à jour.
 *
 * Ne fonctionne qu'en mode serveur local (VITE_API_URL défini) : c'est lui qui
 * lit le système de fichiers. En navigateur seul, le hook reste inerte.
 */

import { useState, useEffect, useCallback } from 'react';
import { getAutoImportStatus } from '../services/apiService';

const USE_API = !!import.meta.env.VITE_API_URL;

// Une version est « nouvelle » si sa signature diffère de la dernière vue
// (lastSeen) et de la dernière importée (lastImport).
const isNewVersion = (status, cfg) => {
  if (!status?.exists || !status.ready) return false;
  const signature = status.signature;
  if (!signature) return false;
  const seen = cfg.lastSeen?.signature ?? null;
  const imported = cfg.lastImport?.signature ?? null;
  return signature !== seen && signature !== imported;
};

export const useAutoImportWatcher = (autoImportConfig) => {
  const [pending, setPending] = useState(null); // status du fichier à proposer
  const [checked, setChecked] = useState(false);

  const check = useCallback(async () => {
    if (!USE_API || !autoImportConfig?.enabled || !autoImportConfig?.path) return;
    try {
      const status = await getAutoImportStatus();
      if (isNewVersion(status, autoImportConfig)) {
        setPending(status);
      }
    } catch {
      /* serveur indisponible ou chemin invalide — silencieux au démarrage */
    }
  }, [autoImportConfig]);

  // Vérification unique au lancement (une fois la config chargée).
  useEffect(() => {
    if (checked || !autoImportConfig?.enabled) return;
    setChecked(true);
    check();
  }, [checked, autoImportConfig, check]);

  const dismiss = useCallback(() => setPending(null), []);

  return { pending, dismiss, recheck: check };
};
