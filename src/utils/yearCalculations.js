/**
 * Utilitaires de calcul budgétaire par exercice (année).
 *
 * Les commandes issues de l'import des commandes portent un champ `exercice` et toutes
 * les années sont conservées. Les agrégats fournisseurs/projets stockés ne
 * reflètent en revanche que l'année d'import. Ces helpers permettent de
 * recalculer les agrégats pour n'importe quelle année directement à partir des
 * commandes, ce qui rend la Vue d'ensemble sélectionnable et comparable par année.
 */

const round2 = (v) => Math.round((Number(v) || 0) * 100) / 100;

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
    byParent[key].depense    += Number(o.mandateNet) || 0;
    byParent[key].engagement += Number(o.engagementNonRecu) || 0;
    byParent[key].realise    += Number(o.montantRealise) || 0;
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
    depense    += Number(o.mandateNet) || 0;
    engagement += Number(o.engagementNonRecu) || 0;
    realise    += Number(o.montantRealise) || 0;
  });
  return {
    depense:    round2(depense),
    engagement: round2(engagement),
    realise:    round2(realise),
    consomme:   round2(depense + engagement),
  };
};
