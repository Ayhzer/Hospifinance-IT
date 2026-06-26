/**
 * ProjectionEngine — Moteur de projection budgétaire saisonnière
 * Hospifinance-IT
 *
 * Algorithmes : LINEAIRE | SAISONNIERE_GLOBALE | PROFIL_FOURNISSEUR | HYBRIDE_ADAPTATIF
 */

import { COMPTE_TO_FAMILLE } from '../constants/analytiqueConstants';

// ── Constantes ────────────────────────────────────────────────────────────────

// Comptes OPEX suivis — dérivés du mapping analytique (éditable via « Reclassement »).
export const COMPTES_OPEX_DSI = Object.keys(COMPTE_TO_FAMILLE);

// Profil mensuel saisonnier par DÉFAUT (somme = 1). Sert de répartition de
// référence pour la projection « saisonnière globale ». À ajuster selon
// l'historique réel de votre établissement. Par défaut : profil quasi linéaire
// avec légère montée en charge de fin d'année.
export const POIDS_SAISONNIERS_DEFAUT = {
  1: 0.032, 2: 0.039, 3: 0.053, 4: 0.091, 5: 0.041, 6: 0.070,
  7: 0.078, 8: 0.032, 9: 0.117, 10: 0.088, 11: 0.136, 12: 0.224,
};

export const ALGO_MODES = ['PROFIL_FOURNISSEUR', 'HYBRIDE_ADAPTATIF', 'SAISONNIERE_GLOBALE', 'LINEAIRE'];

export const DEFAULT_CONFIG = {
  algoMode:                     'PROFIL_FOURNISSEUR',
  nbAnneesHistorique:           3,
  seuilHistoriqueFournisseur:   2,
  comptesInclus:                COMPTES_OPEX_DSI,
  inclureEnr:                   true,
  tauxAnnulationEnr:            0.60,
  scenarios:                    { best: 0.95, central: 1.10, worst: 1.25 },
  opexHorsImport:                0,
  inclureHorsImport:             false,
};

// ── Statistiques ──────────────────────────────────────────────────────────────

const median = (arr) => {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
};

const mean = (arr) => arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : 0;

const stdDev = (arr) => {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  return Math.sqrt(arr.reduce((s, v) => s + (v - m) ** 2, 0) / arr.length);
};

const cv = (arr) => {
  const m = mean(arr);
  return m > 0 ? stdDev(arr) / m : 0;
};

// ── DataLoader ────────────────────────────────────────────────────────────────

/**
 * Construit le dataset normalisé à partir des suppliers et orders React.
 * Renvoie un tableau de lignes { fournisseur, compte, annee, mois, montant_recu, enr }.
 */
export const buildDataset = (suppliers, orders, comptesInclus = COMPTES_OPEX_DSI) => {
  // Index suppliers par id (normalisé string) pour join robuste
  const supplierById = new Map(suppliers.map(s => [String(s.id), s]));

  const rows = [];
  for (const order of orders) {
    if (!order.dateReception) continue;

    const dateStr = order.dateReception;
    const year = parseInt(dateStr.slice(0, 4), 10);
    const month = parseInt(dateStr.slice(5, 7), 10);
    if (!year || !month || month < 1 || month > 12) continue;

    // Compte depuis l'ordre ou depuis le supplier parent
    const sup = supplierById.get(String(order.parentId));
    const compte = order.compteOrdonnateur
      || sup?.compteOrdonnateur
      || '';

    if (!comptesInclus.includes(compte)) continue;

    const fournisseur = sup?.supplier || order.fournisseur || order.description || `Fournisseur inconnu (${compte})`;

    const montant_recu = Number(order.montantRealise ?? order.montant ?? 0);
    const enr = Number(order.engagementNonRecu ?? order.engagement ?? 0);

    rows.push({ fournisseur, compte, annee: year, mois: month, montant_recu, enr });
  }
  return rows;
};

// ── Profiler ──────────────────────────────────────────────────────────────────

/**
 * Calcule les coefficients mensuels médians par couple (fournisseur, compte)
 * sur les N années historiques précédant anneeProjection.
 */
export const buildProfiles = (rows, anneeProjection, nbAnneesHistorique) => {
  const anneesHisto = Array.from(
    { length: nbAnneesHistorique },
    (_, i) => anneeProjection - 1 - i
  );

  // Grouper par (fournisseur, compte, annee, mois)
  const grouped = new Map();
  for (const row of rows) {
    if (!anneesHisto.includes(row.annee)) continue;
    const key = `${row.fournisseur}||${row.compte}`;
    if (!grouped.has(key)) grouped.set(key, {});
    const byYear = grouped.get(key);
    if (!byYear[row.annee]) byYear[row.annee] = {};
    byYear[row.annee][row.mois] = (byYear[row.annee][row.mois] || 0) + row.montant_recu;
  }

  const profiles = new Map();

  for (const [key, byYear] of grouped) {
    const [fournisseur, compte] = key.split('||');
    const anneesPresentes = Object.keys(byYear).map(Number);

    // Coefficients mensuels par année
    const coeffParAnnee = [];
    const totauxAnnuels = [];

    for (const annee of anneesPresentes) {
      const parMois = byYear[annee];
      const total = Object.values(parMois).reduce((s, v) => s + v, 0);
      if (total <= 0) continue;
      totauxAnnuels.push(total);
      const coeffAnnee = {};
      for (let m = 1; m <= 12; m++) {
        coeffAnnee[m] = (parMois[m] || 0) / total;
      }
      coeffParAnnee.push(coeffAnnee);
    }

    if (!coeffParAnnee.length) continue;

    // Médiane par mois
    const coefficients_mensuels = {};
    for (let m = 1; m <= 12; m++) {
      const vals = coeffParAnnee.map(c => c[m]);
      coefficients_mensuels[m] = median(vals);
    }

    // Normaliser pour que la somme = 1
    const somme = Object.values(coefficients_mensuels).reduce((s, v) => s + v, 0);
    if (somme > 0) {
      for (let m = 1; m <= 12; m++) coefficients_mensuels[m] /= somme;
    }

    const total_moyen_annuel = mean(totauxAnnuels);
    const cvVal = cv(totauxAnnuels.length > 1 ? totauxAnnuels : [total_moyen_annuel]);
    const cvMensuel = cv(Object.values(coefficients_mensuels));

    const pattern = classifyPattern(coefficients_mensuels, cvMensuel);
    const mois_pic = Object.entries(coefficients_mensuels).reduce(
      (best, [m, v]) => v > best.v ? { m: Number(m), v } : best,
      { m: 1, v: -Infinity }
    ).m;
    const pct_pic = coefficients_mensuels[mois_pic];

    const fiabilite =
      anneesPresentes.length >= 3 && cvVal < 1.5 ? 'HAUTE' :
      anneesPresentes.length >= 2 || (cvVal >= 1.5 && cvVal < 2.5) ? 'MOYENNE' :
      'FAIBLE';

    // Montant moyen du mois pic (pour PIC_CALENDRIER)
    const montants_pic = anneesPresentes.map(annee => byYear[annee]?.[mois_pic] || 0);
    const montant_moyen_pic = median(montants_pic);

    profiles.set(key, {
      fournisseur,
      compte,
      nb_annees_historique: anneesPresentes.length,
      total_moyen_annuel,
      coefficients_mensuels,
      pattern,
      mois_pic,
      pct_pic,
      cv: cvVal,
      cv_mensuel: cvMensuel,
      fiabilite,
      montant_moyen_pic,
    });
  }

  return profiles;
};

// ── Classificateur de patterns ────────────────────────────────────────────────

export const classifyPattern = (coefficients_mensuels, cvMensuel) => {
  const vals = Object.values(coefficients_mensuels);
  const max_pct = Math.max(...vals);
  const sorted = [...vals].sort((a, b) => b - a);
  const top3_pct = sorted.slice(0, 3).reduce((s, v) => s + v, 0);
  const nb_mois_actifs = vals.filter(v => v > 0.02).length;
  const mois_pic = Object.entries(coefficients_mensuels).reduce(
    (best, [m, v]) => v > best.v ? { m: Number(m), v } : best,
    { m: 1, v: -Infinity }
  ).m;
  const c11 = coefficients_mensuels[11] || 0;
  const c12 = coefficients_mensuels[12] || 0;

  if (max_pct > 0.60)                              return 'PIC_UNIQUE';
  if (nb_mois_actifs <= 3)                         return 'PONCTUEL';
  if (top3_pct > 0.80)                             return 'TRIMESTRIEL';
  if (mois_pic >= 11 && (c11 + c12) > 0.35)       return 'PIC_FIN_ANNEE';
  if (cvMensuel < 0.50)                            return 'UNIFORME';
  return 'IRREGULIER';
};

// ── Sélecteur d'algorithme (HYBRIDE_ADAPTATIF) ────────────────────────────────

const selectAlgo = (profil, seuilHistorique) => {
  if (!profil || profil.nb_annees_historique < seuilHistorique) return 'SAISONNIERE_GLOBALE';
  switch (profil.pattern) {
    case 'UNIFORME':    return 'LINEAIRE';
    case 'PIC_UNIQUE':  return 'PIC_CALENDRIER';
    case 'PONCTUEL':    return 'PIC_CALENDRIER';
    default:            return 'PROFIL_FOURNISSEUR';
  }
};

// ── Projector ─────────────────────────────────────────────────────────────────

const projeterFournisseur = (key, fournisseur, compte, balanceRealisee, moisSituation, profil, config) => {
  const { algoMode, seuilHistoriqueFournisseur } = config;

  // Déterminer algo effectif
  let algo = algoMode;
  if (algoMode === 'HYBRIDE_ADAPTATIF') {
    algo = selectAlgo(profil, seuilHistoriqueFournisseur);
  } else if (algoMode === 'PROFIL_FOURNISSEUR') {
    if (!profil || profil.nb_annees_historique < seuilHistoriqueFournisseur) {
      algo = 'SAISONNIERE_GLOBALE';
    }
  }

  const n = moisSituation;
  let projectionRestante = 0;
  let algoEffectif = algo;

  switch (algo) {
    case 'LINEAIRE': {
      const annualise = balanceRealisee * (12 / Math.max(1, n));
      projectionRestante = annualise - balanceRealisee;
      break;
    }

    case 'SAISONNIERE_GLOBALE': {
      const poidsRealise = Array.from({ length: n }, (_, i) => POIDS_SAISONNIERS_DEFAUT[i + 1] || 0)
        .reduce((s, v) => s + v, 0);
      const poidsRestant = Array.from({ length: 12 - n }, (_, i) => POIDS_SAISONNIERS_DEFAUT[n + i + 1] || 0)
        .reduce((s, v) => s + v, 0);
      if (poidsRealise > 0) {
        const baseAnnuelle = balanceRealisee / poidsRealise;
        projectionRestante = baseAnnuelle * poidsRestant;
      } else {
        projectionRestante = balanceRealisee * ((12 - n) / Math.max(1, n));
      }
      break;
    }

    case 'PROFIL_FOURNISSEUR': {
      const c = profil.coefficients_mensuels;
      const poidsRealise = Array.from({ length: n }, (_, i) => c[i + 1] || 0).reduce((s, v) => s + v, 0);
      const poidsRestant = Array.from({ length: 12 - n }, (_, i) => c[n + i + 1] || 0).reduce((s, v) => s + v, 0);

      if (poidsRealise > 0) {
        const baseAnnuelle = balanceRealisee / poidsRealise;
        projectionRestante = baseAnnuelle * poidsRestant;
      } else {
        // Aucun réalisé à date : utiliser la moyenne historique
        const baseAnnuelle = profil.total_moyen_annuel || 0;
        projectionRestante = baseAnnuelle * poidsRestant;
      }
      break;
    }

    case 'PIC_CALENDRIER': {
      const moisPic = profil?.mois_pic || 12;
      if (moisPic > n) {
        // Le pic n'est pas encore passé
        projectionRestante = profil?.montant_moyen_pic || 0;
      } else {
        // Le pic est déjà dans l'année : rien à ajouter
        projectionRestante = 0;
      }
      break;
    }

    default: {
      algoEffectif = 'LINEAIRE';
      const annualise = balanceRealisee * (12 / Math.max(1, n));
      projectionRestante = annualise - balanceRealisee;
    }
  }

  // Cas décembre : projection = réalisé
  if (n >= 12) projectionRestante = 0;

  const projectionTotale = balanceRealisee + projectionRestante;

  return {
    fournisseur,
    compte,
    balanceRealisee,
    projectionRestante,
    projectionTotale,
    algo: algoEffectif,
    fiabilite:           profil?.fiabilite    || 'FAIBLE',
    pattern:             profil?.pattern      || 'INCONNU',
    nb_annees_historique: profil?.nb_annees_historique || 0,
  };
};

// ── Fonction principale ───────────────────────────────────────────────────────

/**
 * Lance la projection complète.
 * @param {Array}  suppliers  - liste des suppliers OPEX (useOpexData)
 * @param {Array}  orders     - liste des commandes OPEX (useOrderData)
 * @param {Array}  eprd       - données EPRD [{compteOrdonnateur, budgetEPRD}]
 * @param {Object} config     - paramètres (DEFAULT_CONFIG + overrides)
 * @returns {Object} résultat complet
 */
export const runProjection = (suppliers, orders, eprd = [], config = {}) => {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const {
    algoMode, nbAnneesHistorique, seuilHistoriqueFournisseur,
    comptesInclus, inclureEnr, tauxAnnulationEnr, scenarios,
    opexHorsImport, inclureHorsImport,
  } = cfg;

  // ── 1. Déterminer l'année et le mois de situation ──────────────────────────

  let anneeProjection = cfg.anneeProjection;
  let moisSituation   = cfg.moisSituation;

  // Auto-détecter depuis les orders si non forcé
  if (!anneeProjection || !moisSituation) {
    let maxDate = null;
    for (const o of orders) {
      if (!o.dateReception) continue;
      const d = o.dateReception.slice(0, 7); // YYYY-MM
      if (!maxDate || d > maxDate) maxDate = d;
    }
    if (maxDate) {
      anneeProjection = anneeProjection || parseInt(maxDate.slice(0, 4), 10);
      moisSituation   = moisSituation   || parseInt(maxDate.slice(5, 7), 10);
    } else {
      anneeProjection = anneeProjection || new Date().getFullYear();
      moisSituation   = moisSituation   || new Date().getMonth() + 1;
    }
  }

  // ── 2. Construire le dataset normalisé ─────────────────────────────────────

  const rows = buildDataset(suppliers, orders, comptesInclus);

  // ── 3. Calculer les profils historiques ────────────────────────────────────

  const profiles = buildProfiles(rows, anneeProjection, nbAnneesHistorique);

  // ── 4. Données de l'année en cours par (fournisseur, compte) ──────────────

  const currentYearData = new Map();
  for (const row of rows) {
    if (row.annee !== anneeProjection || row.mois > moisSituation) continue;
    const key = `${row.fournisseur}||${row.compte}`;
    currentYearData.set(key, (currentYearData.get(key) || 0) + row.montant_recu);
  }

  // ENR par (fournisseur, compte) depuis les suppliers
  const enrByKey = new Map();
  for (const sup of suppliers) {
    if (!comptesInclus.includes(sup.compteOrdonnateur)) continue;
    const key = `${sup.supplier}||${sup.compteOrdonnateur}`;
    const enrBrut = Number(sup.engagement || 0);
    enrByKey.set(key, enrBrut);
  }

  // ── 5. Projeter chaque couple (fournisseur, compte) ────────────────────────

  // Réunir toutes les clés connues : profils historiques + réalisé année courante
  const allKeys = new Set([...profiles.keys(), ...currentYearData.keys()]);

  const parFournisseur = [];
  let montantAvecProfil = 0;
  let montantTotal      = 0;
  let nbSansHistorique  = 0;
  let sommeConfiancePonderee = 0;

  for (const key of allKeys) {
    const [fournisseur, compte] = key.split('||');
    const balanceRealisee = currentYearData.get(key) || 0;
    const profil = profiles.get(key);

    const resultat = projeterFournisseur(
      key, fournisseur, compte, balanceRealisee, moisSituation, profil,
      { algoMode, seuilHistoriqueFournisseur }
    );

    const enrBrut = enrByKey.get(key) || 0;
    const enrNet  = inclureEnr ? enrBrut * (1 - tauxAnnulationEnr) : 0;

    resultat.enrBrut = enrBrut;
    resultat.enrNet  = enrNet;

    parFournisseur.push(resultat);

    montantTotal += resultat.projectionTotale;
    if (resultat.algo === 'PROFIL_FOURNISSEUR' || resultat.algo === 'PIC_CALENDRIER') {
      montantAvecProfil += resultat.projectionTotale;
    }
    if (!profil || profil.nb_annees_historique < seuilHistoriqueFournisseur) {
      nbSansHistorique++;
    }

    // Pondération pour l'indice de confiance
    const fiabiliteScore = resultat.fiabilite === 'HAUTE' ? 1 : resultat.fiabilite === 'MOYENNE' ? 0.6 : 0.3;
    sommeConfiancePonderee += fiabiliteScore * resultat.projectionTotale;
  }

  // ── 6. Agrégation par compte ───────────────────────────────────────────────

  const parCompteMap = new Map();
  for (const row of parFournisseur) {
    if (!parCompteMap.has(row.compte)) {
      const eprdRow = eprd.find(e => e.compteOrdonnateur === row.compte);
      parCompteMap.set(row.compte, {
        compte: row.compte,
        libelleCompte: eprdRow?.libelleCompte || row.compte,
        balanceRealisee: 0,
        projectionTotale: 0,
        enrBrut: 0,
        enrNet: 0,
        budgetEPRD: eprdRow?.budgetEPRD || 0,
        nbFournisseurs: 0,
      });
    }
    const g = parCompteMap.get(row.compte);
    g.balanceRealisee  += row.balanceRealisee;
    g.projectionTotale += row.projectionTotale;
    g.enrBrut          += row.enrBrut;
    g.enrNet           += row.enrNet;
    g.nbFournisseurs   += 1;
  }
  const parCompte = [...parCompteMap.values()];

  // ── 7. Scénarios Best / Central / Worst ────────────────────────────────────

  const enrNetTotal  = inclureEnr ? parFournisseur.reduce((s, r) => s + r.enrNet,  0) : 0;
  const enrBrutTotal =              parFournisseur.reduce((s, r) => s + r.enrBrut, 0);
  const horsMagh2    = inclureHorsImport ? (opexHorsImport || 0) : 0;
  const eprdTotal    = eprd.reduce((s, e) => s + (e.budgetEPRD || 0), 0);

  const buildScenario = (mult, isWorst = false) => {
    const projA = montantTotal * mult;
    const projAAvecRisques = projA + horsMagh2;
    const enrScenario = inclureEnr ? (isWorst ? enrBrutTotal : enrNetTotal) : 0;
    const projB = projA + enrScenario;
    const projBAvecRisques = projB + horsMagh2;
    return {
      projA,
      projAAvecRisques,
      projB,
      projBAvecRisques,
      ecartEprd: projBAvecRisques - eprdTotal,
      enrApplique: enrScenario,
      multiplicateur: mult,
    };
  };

  const scenariosResult = {
    best:    buildScenario(scenarios.best,    false),
    central: buildScenario(scenarios.central, false),
    worst:   buildScenario(scenarios.worst,   true),
  };

  // ── 8. Métriques qualité ───────────────────────────────────────────────────

  const couvertureProfil = montantTotal > 0 ? montantAvecProfil / montantTotal : 0;
  const indiceConfiance  = montantTotal > 0 ? sommeConfiancePonderee / montantTotal : 0;

  // Back-test N-1 : si on a des données N-1, calculer l'écart
  let backTestN1 = null;
  const anneeN1 = anneeProjection - 1;
  const rowsN1  = rows.filter(r => r.annee === anneeN1);
  if (rowsN1.length) {
    const realN1 = rowsN1.reduce((s, r) => s + r.montant_recu, 0);
    // Recalculer la projection qu'on aurait faite à fin mai N-1
    const moisSimul = Math.min(moisSituation, 12);
    const balN1 = rowsN1
      .filter(r => r.mois <= moisSimul)
      .reduce((s, r) => s + r.montant_recu, 0);
    const poidsRealise = Array.from({ length: moisSimul }, (_, i) => POIDS_SAISONNIERS_DEFAUT[i + 1] || 0)
      .reduce((s, v) => s + v, 0);
    const projSimulN1 = poidsRealise > 0 ? balN1 / poidsRealise : balN1 * (12 / moisSimul);
    backTestN1 = realN1 > 0 ? Math.abs(projSimulN1 - realN1) / realN1 : null;
  }

  const metriques = {
    couvertureProfil,
    nbSansHistorique,
    indiceConfiance,
    backTestN1,
    nbFournisseurs: allKeys.size,
    nbAvecProfil: [...profiles.values()].filter(p => p.nb_annees_historique >= seuilHistoriqueFournisseur).length,
  };

  // ── 9. Profils pour l'affichage ────────────────────────────────────────────

  const profilsList = [...profiles.values()].map(p => ({
    ...p,
    key: `${p.fournisseur}||${p.compte}`,
    balanceRealisee: currentYearData.get(`${p.fournisseur}||${p.compte}`) || 0,
    enrBrut: enrByKey.get(`${p.fournisseur}||${p.compte}`) || 0,
  }));

  return {
    parFournisseur,
    parCompte,
    scenarios: scenariosResult,
    metriques,
    profils: profilsList,
    dateSituation: `${anneeProjection}-${String(moisSituation).padStart(2, '0')}-01`,
    moisSituation,
    anneeProjection,
    config: cfg,
  };
};
