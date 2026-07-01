/**
 * Utilitaires de calcul budgétaire par exercice (année).
 *
 * Les commandes issues de l'import des commandes portent un champ `exercice` et toutes
 * les années sont conservées. Les agrégats fournisseurs/projets stockés ne
 * reflètent en revanche que l'année d'import. Ces helpers permettent de
 * recalculer les agrégats pour n'importe quelle année directement à partir des
 * commandes, ce qui rend la Vue d'ensemble sélectionnable et comparable par année.
 */

import { ORDER_IMPACT } from '../constants/orderConstants';

const round2 = (v) => Math.round((Number(v) || 0) * 100) / 100;

/**
 * Détermine si une commande porte le détail issu de l'import des commandes
 * (mandateNet / engagementNonRecu / montantRealise). Les commandes saisies
 * manuellement ne possèdent pas ces champs : seuls `montant` et `status` sont
 * renseignés.
 */
const hasImportBreakdown = (o) =>
  o && (o.mandateNet !== undefined || o.engagementNonRecu !== undefined || o.montantRealise !== undefined);

/**
 * Renvoie les montants { depense, engagement, realise } d'une commande.
 * - Commandes importées : on lit le détail (mandaté / engagement non reçu / réalisé).
 * - Commandes saisies manuellement : on dérive du couple montant + statut via ORDER_IMPACT
 *   (Commandée/Livrée = engagement, Facturée/Payée = dépense réalisée).
 */
export const orderAmounts = (o) => {
  if (hasImportBreakdown(o)) {
    return {
      depense:    Number(o.mandateNet) || 0,
      engagement: Number(o.engagementNonRecu) || 0,
      realise:    Number(o.montantRealise) || 0,
    };
  }
  const montant = Number(o?.montant) || 0;
  const impact = ORDER_IMPACT[o?.status];
  if (impact === 'depense')    return { depense: montant, engagement: 0, realise: montant };
  if (impact === 'engagement') return { depense: 0, engagement: montant, realise: 0 };
  return { depense: 0, engagement: 0, realise: 0 };
};

/**
 * Détermine l'année (exercice) d'une commande.
 * Priorité au champ `exercice` (champ Exercice du fichier importé), sinon dérivé des dates ISO.
 * @returns {string} année "YYYY" ou '' si indéterminable
 */
export const getOrderYear = (order) => {
  if (order?.exercice) return String(order.exercice).trim();
  const d = order?.dateReception || order?.dateFacture || order?.dateCommande || '';
  const m = String(d).match(/^(\d{4})/);
  return m ? m[1] : '';
};

/**
 * Liste les exercices présents dans une ou plusieurs listes de commandes.
 * @returns {string[]} années triées en ordre décroissant (la plus récente d'abord)
 */
export const listExercices = (...orderLists) => {
  const years = new Set();
  orderLists.forEach(list => (list || []).forEach(o => {
    const y = getOrderYear(o);
    if (y) years.add(y);
  }));
  return [...years].sort((a, b) => b.localeCompare(a));
};

/**
 * Agrège les commandes d'une année par parent (fournisseur/projet).
 * Réplique la logique d'agrégation de l'import : mandateNet → dépense,
 * engagementNonRecu → engagement, montantRealise → réalisé.
 * @returns {Object} { [parentId]: { depense, engagement, realise } }
 */
export const aggregateByParentForYear = (orders, year) => {
  const byParent = {};
  const target = String(year);
  (orders || []).forEach(o => {
    if (getOrderYear(o) !== target) return;
    const key = String(o.parentId);
    if (!byParent[key]) byParent[key] = { depense: 0, engagement: 0, realise: 0 };
    const a = orderAmounts(o);
    byParent[key].depense    += a.depense;
    byParent[key].engagement += a.engagement;
    byParent[key].realise    += a.realise;
  });
  return byParent;
};

/**
 * Recalcule des fournisseurs OPEX pour une année donnée.
 * Conserve les métadonnées (budget, compte, famille…) et remplace les montants
 * par les agrégats de l'année.
 */
export const suppliersForYear = (suppliers, opexOrders, year) => {
  const agg = aggregateByParentForYear(opexOrders, year);
  return (suppliers || []).map(s => {
    const a = agg[String(s.id)] || { depense: 0, engagement: 0, realise: 0 };
    return {
      ...s,
      depenseActuelle: round2(a.depense),
      engagement:      round2(a.engagement),
      montantRealise:  round2(a.realise),
    };
  });
};

/**
 * Recalcule des projets CAPEX pour une année donnée.
 */
export const projectsForYear = (projects, capexOrders, year) => {
  const agg = aggregateByParentForYear(capexOrders, year);
  return (projects || []).map(p => {
    const a = agg[String(p.id)] || { depense: 0, engagement: 0, realise: 0 };
    return {
      ...p,
      depense:        round2(a.depense),
      engagement:     round2(a.engagement),
      montantRealise: round2(a.realise),
    };
  });
};

/**
 * Filtre une liste de commandes sur une année.
 */
export const ordersForYear = (orders, year) => {
  const target = String(year);
  return (orders || []).filter(o => getOrderYear(o) === target);
};

/**
 * Consommation totale (dépense + engagement) d'une année, OPEX et CAPEX confondus
 * ou par flux selon les listes passées.
 * @returns {{ depense, engagement, realise, consomme }}
 */
export const computeYearConsumption = (orders, year) => {
  let depense = 0, engagement = 0, realise = 0;
  const target = String(year);
  (orders || []).forEach(o => {
    if (getOrderYear(o) !== target) return;
    const a = orderAmounts(o);
    depense    += a.depense;
    engagement += a.engagement;
    realise    += a.realise;
  });
  return {
    depense:    round2(depense),
    engagement: round2(engagement),
    realise:    round2(realise),
    consomme:   round2(depense + engagement),
  };
};
