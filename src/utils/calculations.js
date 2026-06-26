/**
 * Utilitaires de calculs budgétaires
 */

/**
 * Calcule le budget disponible
 * @param {number} budget - Budget total
 * @param {number} depense - Montant dépensé
 * @param {number} engagement - Montant engagé
 * @returns {number} Budget disponible
 */
export const calculateAvailable = (budget, depense, engagement) => {
  return (Number(budget) || 0) - (Number(depense) || 0) - (Number(engagement) || 0);
};

/**
 * Calcule le taux d'utilisation
 * @param {number} budget - Budget total
 * @param {number} depense - Montant dépensé
 * @param {number} engagement - Montant engagé
 * @returns {number} Taux d'utilisation en pourcentage
 */
export const calculateUsageRate = (budget, depense, engagement) => {
  const b = Number(budget) || 0;
  const d = Number(depense) || 0;
  const e = Number(engagement) || 0;
  if (b === 0) return 0;
  return ((d + e) / b) * 100;
};

/**
 * Calcule les totaux pour une liste d'items, avec impact optionnel des commandes
 * @param {Array} items - Liste d'items (OPEX ou CAPEX)
 * @param {Object} keys - Clés pour budget, depense, engagement
 * @param {Object} orderImpact - Impact des commandes { engagement, depense } (optionnel)
 * @returns {Object} Totaux calculés
 */
// Accumulation en centimes entiers pour éviter la dérive de flottants (BUG-003)
const toCents = (v) => Math.round((Number(v) || 0) * 100);
const fromCents = (c) => c / 100;

export const calculateTotals = (items, keys = {
  budget: 'budgetAnnuel',
  depense: 'depenseActuelle',
  engagement: 'engagement'
}, orderImpact = null) => {
  const budgetC    = items.reduce((s, i) => s + toCents(i[keys.budget]),   0);
  let   depenseC   = items.reduce((s, i) => s + toCents(i[keys.depense]),   0);
  let   engagementC = items.reduce((s, i) => s + toCents(i[keys.engagement]), 0);

  if (orderImpact) {
    depenseC    += toCents(orderImpact.depense);
    engagementC += toCents(orderImpact.engagement);
  }

  const budget     = fromCents(budgetC);
  const depense    = fromCents(depenseC);
  const engagement = fromCents(engagementC);

  return {
    budget,
    depense,
    engagement,
    disponible:      calculateAvailable(budget, depense, engagement),
    tauxUtilisation: calculateUsageRate(budget, depense, engagement),
  };
};

/**
 * Détermine le niveau d'alerte selon le taux d'utilisation
 * @param {number} rate - Taux d'utilisation
 * @param {number} warningThreshold - Seuil d'avertissement (défaut 75)
 * @param {number} criticalThreshold - Seuil critique (défaut 90)
 * @returns {string} Niveau d'alerte (critical, warning, safe)
 */
export const getAlertLevel = (rate, warningThreshold = 75, criticalThreshold = 90) => {
  if (rate > criticalThreshold) return 'critical';
  if (rate > warningThreshold) return 'warning';
  return 'safe';
};

// ─── Calculs DSI ──────────────────────────────────────────────────────

export const calculateChargeEngagee = (depenseActuelle, engagement) =>
  (Number(depenseActuelle) || 0) + (Number(engagement) || 0);

export const calculateTauxRealisation = (chargeEngagee, budgetEPRD) => {
  if (!budgetEPRD || budgetEPRD === 0) return 0;
  return (chargeEngagee / budgetEPRD) * 100;
};

export const calculateResteAEngager = (budgetEPRD, chargeEngagee) =>
  (Number(budgetEPRD) || 0) - (Number(chargeEngagee) || 0);

export const getAlertLevelDSI = (tauxRealisation) => {
  if (tauxRealisation >= 85) return 'critique';
  if (tauxRealisation >= 50) return 'surveiller';
  return 'normal';
};

export const calculateProjections = (chargeEngagee, budgetEPRD, nbMoisRealises = 5) => {
  const mois = Math.max(1, nbMoisRealises);
  // Projection linéaire = rythme actuel extrapolé sur 12 mois
  const lineaire  = chargeEngagee * (12 / mois);
  // Les scénarios appliquent un % de correction sur la projection linéaire
  const bestCase  = lineaire * 0.95;   // -5 % du rythme annualisé
  const central   = lineaire * 1.05;   // +5 % du rythme annualisé
  const worstCase = lineaire * 1.15;   // +15 % du rythme annualisé
  return {
    lineaire,
    bestCase,
    central,
    worstCase,
    resteAEngager:        calculateResteAEngager(budgetEPRD, chargeEngagee),
    depassementWorstCase: worstCase - (Number(budgetEPRD) || 0),
  };
};
