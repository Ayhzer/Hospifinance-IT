/**
 * Configuration de l'établissement — Hospifinance-IT
 * ---------------------------------------------------------------------------
 * Adaptez ces valeurs à VOTRE hôpital. C'est le seul endroit où renseigner
 * l'identité de l'établissement : elle est ensuite réutilisée partout
 * (en-têtes, rapports PDF, titres de page, etc.).
 */
export const ESTABLISHMENT = {
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
