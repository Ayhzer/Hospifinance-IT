/**
 * Logiciels sources — Hospifinance-IT
 * ---------------------------------------------------------------------------
 * Renseignez ici le nom des logiciels métier de VOTRE établissement.
 *
 * Ces libellés sont purement cosmétiques (affichage dans l'UI, les bandeaux
 * d'import, les rapports de rapprochement). Le FORMAT d'import lui-même est un
 * modèle canonique commun, indépendant du logiciel d'origine — voir
 * `src/services/importTemplates.js`. N'importe quel hôpital exporte ses données
 * depuis son propre logiciel puis les met au format canonique avant import.
 *
 * Ces libellés peuvent aussi être renseignés à chaud via l'ASSISTANT DE
 * PREMIER LANCEMENT (stockés en localStorage, fusionnés ci-dessous).
 */
import { loadAppConfig } from './runtimeConfig';

/** Valeurs par défaut (génériques). */
export const DEFAULT_SOURCE_SOFTWARE = {
  /**
   * Logiciel d'où proviennent les COMMANDES / engagements.
   * Exemples réels : MAGH2, EPSILON, CPAGE, etc.
   */
  orders: 'Logiciel source des commandes',

  /**
   * Logiciel de gestion comptable / des PAIEMENTS (mandatement).
   * Exemples réels : SAGE, Qualiac, GEF, etc.
   */
  payments: 'Logiciel de gestion des paiements',
};

// Fusion avec l'éventuelle personnalisation de l'assistant de premier lancement.
export const SOURCE_SOFTWARE = {
  ...DEFAULT_SOURCE_SOFTWARE,
  ...(loadAppConfig().sources || {}),
};
