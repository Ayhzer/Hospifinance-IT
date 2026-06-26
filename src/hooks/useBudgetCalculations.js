/**
 * Hook personnalisé pour les calculs budgétaires avec mémorisation
 * Intègre l'impact des commandes sur les budgets
 */

import { useMemo } from 'react';
import { calculateTotals } from '../utils/calculations';
import { computeOrderImpact } from '../utils/orderCalculations';

/**
 * Hook pour calculer les totaux OPEX.
 * Les suppliers issus de l'import des commandes contiennent déjà depenseActuelle
 * et engagement agrégés — ne pas ajouter l'impact des commandes (double comptage).
 * Si budgetAnnuel est nul sur tous les suppliers, on utilise le total EPRD comme budget.
 */
export const useOpexTotals = (suppliers, opexOrders = [], eprd = []) => {
  return useMemo(() => {
    const hasSupplierAmounts = suppliers.some(
      s => (Number(s.depenseActuelle) || 0) + (Number(s.engagement) || 0) > 0
    );
    const orderImpact = hasSupplierAmounts ? null : computeOrderImpact(opexOrders);

    const totals = calculateTotals(suppliers, {
      budget: 'budgetAnnuel',
      depense: 'depenseActuelle',
      engagement: 'engagement'
    }, orderImpact);

    // Fallback budget EPRD quand budgetAnnuel n'est pas renseigné (import des commandes)
    if (totals.budget === 0 && eprd.length > 0) {
      const budgetEprd = eprd.reduce((s, e) => s + (Number(e.budgetEPRD) || 0), 0);
      if (budgetEprd > 0) {
        const depense    = totals.depense;
        const engagement = totals.engagement;
        const disponible = budgetEprd - depense - engagement;
        const tauxUtilisation = budgetEprd > 0
          ? ((depense + engagement) / budgetEprd) * 100
          : 0;
        return { ...totals, budget: budgetEprd, disponible, tauxUtilisation };
      }
    }

    return totals;
  }, [suppliers, opexOrders, eprd]);
};

/**
 * Hook pour calculer les totaux CAPEX.
 * Si budgetTotal est nul sur tous les projets, utilise capexBudgetGlobal comme budget d'enveloppe.
 */
export const useCapexTotals = (projects, capexOrders = [], capexBudgetGlobal = 0) => {
  return useMemo(() => {
    const hasProjectAmounts = projects.some(
      p => (Number(p.depense) || 0) + (Number(p.engagement) || 0) > 0
    );
    const orderImpact = hasProjectAmounts ? null : computeOrderImpact(capexOrders);

    const totals = calculateTotals(projects, {
      budget: 'budgetTotal',
      depense: 'depense',
      engagement: 'engagement'
    }, orderImpact);

    // Fallback budget global CAPEX saisi manuellement
    if (totals.budget === 0 && capexBudgetGlobal > 0) {
      const depense    = totals.depense;
      const engagement = totals.engagement;
      const disponible = capexBudgetGlobal - depense - engagement;
      const tauxUtilisation = ((depense + engagement) / capexBudgetGlobal) * 100;
      return { ...totals, budget: capexBudgetGlobal, disponible, tauxUtilisation };
    }

    return totals;
  }, [projects, capexOrders, capexBudgetGlobal]);
};

/**
 * Hook pour calculer les totaux consolidés
 */
export const useConsolidatedTotals = (opexTotals, capexTotals) => {
  return useMemo(() => ({
    budget: opexTotals.budget + capexTotals.budget,
    depense: opexTotals.depense + capexTotals.depense,
    engagement: opexTotals.engagement + capexTotals.engagement,
    disponible: opexTotals.disponible + capexTotals.disponible
  }), [opexTotals, capexTotals]);
};
