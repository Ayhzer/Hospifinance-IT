/**
 * Hook pour le raccourci clavier d'ouverture du panneau de paramétrage
 * Ctrl+Shift+P ou triple-clic sur le titre
 */

import { useEffect, useRef, useCallback } from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { usePermissions } from '../contexts/PermissionsContext';

export const useSettingsShortcut = () => {
  const { setIsSettingsOpen } = useSettings();
  const { canAccessSettings } = usePermissions();
  const clickCountRef = useRef(0);
  const clickTimerRef = useRef(null);

  // Raccourci clavier Ctrl+Shift+P (uniquement si autorisé)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.shiftKey && e.key.toUpperCase() === 'P') {
        e.preventDefault();

        // Vérifier les permissions avant d'ouvrir
        if (canAccessSettings) {
          setIsSettingsOpen(prev => !prev);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [setIsSettingsOpen, canAccessSettings]);

  // Triple-clic sur le titre (uniquement si autorisé)
  const handleTitleClick = useCallback(() => {
    // Bloquer si pas de permissions
    if (!canAccessSettings) {
      return;
    }

    clickCountRef.current += 1;

    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
    }

    if (clickCountRef.current >= 3) {
      clickCountRef.current = 0;
      setIsSettingsOpen(true);
    } else {
      clickTimerRef.current = setTimeout(() => {
        clickCountRef.current = 0;
      }, 500);
    }
  }, [setIsSettingsOpen, canAccessSettings]);

  return { handleTitleClick };
};
