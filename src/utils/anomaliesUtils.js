export const SEVERITE = {
  CRITIQUE: 'CRITIQUE',
  ELEVEE:   'ÉLEVÉE',
  MOYENNE:  'MOYENNE',
};

const SEVERITE_ORDER = { CRITIQUE: 0, 'ÉLEVÉE': 1, MOYENNE: 2 };

/**
 * Applique les règles A1, A2, A5 sur les entités OPEX.
 * @param {Array}  suppliers - Fournisseurs OPEX
 * @param {Object} eprdMap   - { compteOrdonnateur: budgetEPRD }
 */
export const detectAnomalies = (suppliers, eprdMap = {}) => {
  const anomalies = [];

  suppliers.forEach(s => {
    const budget = (s.budgetAnnuel || 0) || (eprdMap[s.compteOrdonnateur] || 0);
    const charge = (Number(s.depenseActuelle) || 0) + (Number(s.engagement) || 0);
    const tx = budget > 0 ? charge / budget : 0;

    // A1 — Taux réalisation > 150%
    if (tx > 1.5) {
      anomalies.push({
        regle:       'A1',
        severite:    SEVERITE.CRITIQUE,
        compte:      s.compteOrdonnateur || '',
        fournisseur: s.supplier,
        constat:     `Taux réalisation ${(tx * 100).toFixed(0)}% — budget ${budget.toLocaleString('fr-FR')} €`,
        action:      'Révision EPRD ou gel compensatoire urgent',
      });
    }

    // A2 — Sous-consommation atypique < 20%
    if (budget > 0 && tx < 0.2) {
      anomalies.push({
        regle:       'A2',
        severite:    SEVERITE.ELEVEE,
        compte:      s.compteOrdonnateur || '',
        fournisseur: s.supplier,
        constat:     `Sous-consommation atypique : ${(tx * 100).toFixed(0)}% engagé`,
        action:      'Vérifier contrat non renouvelé ou dépense non imputée',
      });
    }

    // A5 — Engagé non reçu > 80% du budget annuel
    const eng = Number(s.engagement) || 0;
    if (budget > 0 && eng > budget * 0.8) {
      anomalies.push({
        regle:       'A5',
        severite:    SEVERITE.CRITIQUE,
        compte:      s.compteOrdonnateur || '',
        fournisseur: s.supplier,
        constat:     `Engagé non reçu ${eng.toLocaleString('fr-FR')} € = ${((eng / budget) * 100).toFixed(0)}% du budget`,
        action:      'Anticiper la réception — risque de dépassement dès livraison',
      });
    }
  });

  return anomalies.sort((a, b) =>
    (SEVERITE_ORDER[a.severite] ?? 99) - (SEVERITE_ORDER[b.severite] ?? 99)
  );
};

/**
 * Règle A7 — Achats hors marché (N° marché = 0) avec montant > seuil.
 * @param {Array}  orders - Commandes OPEX
 * @param {number} seuil  - Montant minimum (défaut 5 000 €)
 */
export const detectAchatsHorsMarche = (orders, seuil = 5000) =>
  orders
    .filter(o => (!o.numeroMarche || o.numeroMarche === 0) && (Number(o.montant) || 0) > seuil)
    .map(o => ({
      regle:       'A7',
      severite:    SEVERITE.MOYENNE,
      compte:      o.compteOrdonnateur || '',
      fournisseur: o.description || o.reference || '',
      constat:     `Achat hors marché ${(Number(o.montant) || 0).toLocaleString('fr-FR')} € (réf: ${o.reference || '-'})`,
      action:      'Vérifier la procédure de mise en concurrence',
    }));

/**
 * Combine toutes les règles en une seule liste triée.
 */
export const detectAllAnomalies = (suppliers, orders, eprdMap = {}) => {
  const a1a2a5 = detectAnomalies(suppliers, eprdMap);
  const a7     = detectAchatsHorsMarche(orders);
  return [...a1a2a5, ...a7].sort((a, b) =>
    (SEVERITE_ORDER[a.severite] ?? 99) - (SEVERITE_ORDER[b.severite] ?? 99)
  );
};
