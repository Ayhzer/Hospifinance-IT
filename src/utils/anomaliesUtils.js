import { normalizeCompte } from './compte';

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
    const budget = (s.budgetAnnuel || 0) || (eprdMap[normalizeCompte(s.compteOrdonnateur)] || 0);
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
 * Règles de RÉCONCILIATION B1 / B2 — comptes non appariés entre le réel
 * (import) et le budget EPRD (saisie manuelle).
 *  - B1 : activité (OPEX/CAPEX) sur un compte SANS budget EPRD défini.
 *  - B2 : budget EPRD défini sur un compte SANS aucune activité.
 * @param {Array} suppliers - Fournisseurs OPEX
 * @param {Array} projects  - Projets CAPEX
 * @param {Array} eprd      - Lignes EPRD (budget par compte)
 */
export const detectComptesOrphelins = (suppliers = [], projects = [], eprd = []) => {
  const out = [];

  const budgetByCompte = {};
  eprd.forEach(e => {
    const c = normalizeCompte(e.compteOrdonnateur);
    if (c) budgetByCompte[c] = (budgetByCompte[c] || 0) + (Number(e.budgetEPRD) || 0);
  });

  // Comptes avec activité réelle (OPEX + CAPEX)
  const activite = new Map(); // compte normalisé → { charge, label }
  const addActivite = (compte, charge, label) => {
    const c = normalizeCompte(compte);
    if (!c) return;
    const cur = activite.get(c) || { charge: 0, label };
    cur.charge += charge;
    if (!cur.label) cur.label = label;
    activite.set(c, cur);
  };
  suppliers.forEach(s => addActivite(s.compteOrdonnateur, (Number(s.depenseActuelle) || 0) + (Number(s.engagement) || 0), s.supplier));
  projects.forEach(p => addActivite(p.compteOrdonnateur, (Number(p.depense) || 0) + (Number(p.engagement) || 0), p.project || p.fournisseur));

  // B1 — activité sans budget EPRD
  activite.forEach((v, c) => {
    if ((budgetByCompte[c] || 0) <= 0 && v.charge > 0) {
      out.push({
        regle:    'B1',
        severite: SEVERITE.ELEVEE,
        compte:   c,
        fournisseur: v.label || '',
        constat:  `Activité ${v.charge.toLocaleString('fr-FR')} € sur un compte sans budget EPRD`,
        action:   'Renseigner le budget EPRD de ce compte (réconciliation)',
      });
    }
  });

  // B2 — budget EPRD sans activité
  Object.entries(budgetByCompte).forEach(([c, b]) => {
    if (b > 0 && !activite.has(c)) {
      out.push({
        regle:    'B2',
        severite: SEVERITE.MOYENNE,
        compte:   c,
        fournisseur: '',
        constat:  `Budget EPRD ${b.toLocaleString('fr-FR')} € sans aucune activité rattachée`,
        action:   'Vérifier le code compte ou rattacher les dépenses correspondantes',
      });
    }
  });

  return out;
};

/**
 * Combine toutes les règles en une seule liste triée.
 * @param {Array} eprd     - Lignes EPRD (liste, pas une map)
 * @param {Array} projects - Projets CAPEX (pour la réconciliation)
 */
export const detectAllAnomalies = (suppliers, orders, eprd = [], projects = []) => {
  const budgetByCompte = {};
  eprd.forEach(e => {
    const c = normalizeCompte(e.compteOrdonnateur);
    if (c) budgetByCompte[c] = (Number(e.budgetEPRD) || 0);
  });
  const a1a2a5 = detectAnomalies(suppliers, budgetByCompte);
  const a7     = detectAchatsHorsMarche(orders);
  const orph   = detectComptesOrphelins(suppliers, projects, eprd);
  return [...a1a2a5, ...a7, ...orph].sort((a, b) =>
    (SEVERITE_ORDER[a.severite] ?? 99) - (SEVERITE_ORDER[b.severite] ?? 99)
  );
};
