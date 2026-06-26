/**
 * Constantes pour la gestion budgétaire
 */
import { ESTABLISHMENT } from '../config/establishment';

// Seuils d'alerte budgétaire — alignés sur SEUILS_ALERTE_DSI (analytiqueConstants)
export const BUDGET_THRESHOLDS = {
  CRITICAL: 85, // Alerte critique à 85%
  WARNING:  50, // Surveillance à 50%
  SAFE:      0  // Zone sûre
};

// Couleurs selon le taux d'utilisation
export const BUDGET_COLORS = {
  CRITICAL: 'bg-red-500',
  WARNING: 'bg-yellow-500',
  SAFE: 'bg-green-500'
};

// Statuts des projets CAPEX
export const PROJECT_STATUS = {
  PLANNED: 'Planifié',
  IN_PROGRESS: 'En cours',
  COMPLETED: 'Terminé',
  SUSPENDED: 'Suspendu',
  CANCELLED: 'Annulé'
};

// Couleurs des statuts
export const STATUS_COLORS = {
  [PROJECT_STATUS.PLANNED]: 'bg-gray-100 text-gray-800',
  [PROJECT_STATUS.IN_PROGRESS]: 'bg-blue-100 text-blue-800',
  [PROJECT_STATUS.COMPLETED]: 'bg-green-100 text-green-800',
  [PROJECT_STATUS.SUSPENDED]: 'bg-yellow-100 text-yellow-800',
  [PROJECT_STATUS.CANCELLED]: 'bg-red-100 text-red-800'
};

// Catégories OPEX — libellés de comptes ordonnateurs (VALEURS DE DÉMONSTRATION).
// Adaptez ces libellés aux intitulés de comptes de votre établissement.
export const OPEX_CATEGORIES = [
  'LOCATION MATÉRIEL INFORMATIQUE',
  'MAINTENANCE INFORMATIQUE',
  'LICENCES & REDEVANCES',
  'ABONNEMENTS APPLICATIFS',
  'LIAISONS / RÉSEAUX',
  'PRESTATIONS INFORMATIQUES',
  'CYBERSÉCURITÉ / AUDITS',
  'PETIT MATÉRIEL INFORMATIQUE',
  'FOURNITURES INFORMATIQUES',
];

export const ANNEE_PILOTAGE = ESTABLISHMENT.defaultYear;

// Enveloppes budgétaires CAPEX
export const ENVELOPPES_CAPEX = [
  'Infrastructure',
  'Applications métier',
  'Cybersécurité',
  'Poste de travail',
  'Télécom',
  'Autre'
];

// Couleurs des enveloppes (fixes pour les enveloppes par défaut)
export const ENVELOPPE_COLORS = {
  'Infrastructure': 'bg-blue-100 text-blue-800 border-blue-300',
  'Applications métier': 'bg-purple-100 text-purple-800 border-purple-300',
  'Cybersécurité': 'bg-red-100 text-red-800 border-red-300',
  'Poste de travail': 'bg-green-100 text-green-800 border-green-300',
  'Télécom': 'bg-orange-100 text-orange-800 border-orange-300',
  'Autre': 'bg-gray-100 text-gray-800 border-gray-300'
};

// Palette rotatoire pour les enveloppes personnalisées
export const ENVELOPPE_COLOR_PALETTE = [
  'bg-teal-100 text-teal-800 border-teal-300',
  'bg-indigo-100 text-indigo-800 border-indigo-300',
  'bg-pink-100 text-pink-800 border-pink-300',
  'bg-amber-100 text-amber-800 border-amber-300',
  'bg-cyan-100 text-cyan-800 border-cyan-300',
  'bg-lime-100 text-lime-800 border-lime-300',
  'bg-rose-100 text-rose-800 border-rose-300',
  'bg-sky-100 text-sky-800 border-sky-300',
];

/**
 * Retourne la couleur CSS d'une enveloppe.
 * - Utilise les couleurs fixes pour les enveloppes par défaut.
 * - Utilise la palette rotatoire (basée sur le nom) pour les enveloppes personnalisées.
 */
export const getEnveloppeColor = (enveloppe, allEnveloppes = []) => {
  if (ENVELOPPE_COLORS[enveloppe]) return ENVELOPPE_COLORS[enveloppe];
  // Palette rotatoire déterministe basée sur la position dans la liste
  const idx = allEnveloppes.indexOf(enveloppe);
  const paletteIdx = idx >= 0 ? idx % ENVELOPPE_COLOR_PALETTE.length : 0;
  return ENVELOPPE_COLOR_PALETTE[paletteIdx];
};

// Configuration pour les exports
export const EXPORT_CONFIG = {
  DATE_FORMAT: 'fr-FR',
  CSV_ENCODING: 'utf-8',
  JSON_INDENT: 2
};
