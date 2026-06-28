/**
 * Configuration de l'établissement — Hospifinance-IT
 * ---------------------------------------------------------------------------
 * Adaptez ces valeurs à VOTRE hôpital. C'est le seul endroit où renseigner
 * l'identité de l'établissement : elle est ensuite réutilisée partout
 * (en-têtes, rapports PDF, titres de page, etc.).
 *
 * Deux façons de personnaliser :
 *  1. Éditer `DEFAULT_ESTABLISHMENT` ci-dessous (valeurs par défaut au build).
 *  2. Laisser l'ASSISTANT DE PREMIER LANCEMENT renseigner ces valeurs à chaud
 *     (stockées en localStorage, fusionnées ci-dessous au chargement). Aucune
 *     reconstruction nécessaire dans ce cas.
 */
import { loadAppConfig } from './runtimeConfig';

/** Valeurs par défaut (jeu de démonstration). */
export const DEFAULT_ESTABLISHMENT = {
  /** Nom complet (apparaît dans les rapports PDF et les en-têtes). */
  name: 'Établissement de démonstration',
  /** Sigle / nom court. */
  shortName: 'DEMO',
  /** Direction concernée. DSI = Direction des Systèmes d'Information. */
  department: 'DSI',
  /** Libellé long de la direction. */
  departmentLong: "Direction des Systèmes d'Information",
  /** Devise affichée. */
  currency: '€',
  /** Année de pilotage par défaut (exercice courant). */
  defaultYear: 2026,
};

// Fusion avec l'éventuelle personnalisation de l'assistant de premier lancement.
// Lue une seule fois, synchronement, au chargement du module.
export const ESTABLISHMENT = {
  ...DEFAULT_ESTABLISHMENT,
  ...(loadAppConfig().establishment || {}),
};
