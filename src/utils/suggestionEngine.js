/**
 * Moteur de suggestion de classement analytique
 * ------------------------------------------------------------------
 * Analyse les COMMANDES d'un fournisseur non classé et propose une
 * famille / sous-catégorie par « vote pondéré » des lignes.
 *
 * Le vote n'est pas un simple comptage : chaque ligne est pondérée par
 *   1. son montant (les grosses commandes pèsent davantage) ;
 *   2. la FIABILITÉ de la preuve qui l'a classée :
 *        - règle contextuelle (N2)            → 1.00  (spécifique au fournisseur)
 *        - mot-clé spécifique (N3)            → 0.80
 *        - mot-clé transverse (N3, ambigu)    → 0.30  (ex. MAINTENANCE, ABONNEMENT)
 *        - compte homogène (N4)               → 0.60
 *        - compte hétérogène (N4)             → 0.15  (compte « fourre-tout »)
 *
 * Cette pondération évite les faux positifs identifiés dans l'analyse :
 * comptes fourre-tout (H61526100 « MAINT INFORM DIVERSES », 2,4 M€) et
 * mots-clés au sens physique/IT ambigu (ARCHIVES, AFFRANCH, SMS…).
 */

import { reclasser } from './reclassementEngine';

/** Mots-clés transverses (même terme, sens physique ≠ sens IT) → preuve faible. */
const MOTS_CLES_TRANSVERSES = [
  'ARCHIVES', 'AFFRANCH', 'COURRIER', 'SMS', 'MAINTENANCE',
  'CONTRAT', 'ABONNEMENT', 'LOCATION', 'FORMATION', 'PRESTATION',
  'REGUL', 'AVOIR', 'REFACTURATION', 'SOLDE',
];

const POIDS = {
  regle_multinature: 1.0,
  referentiel:       1.0,
  mots_cles_fort:    0.8,
  mots_cles_faible:  0.3,
  mapping_homogene:  0.6,
  mapping_hetero:    0.15,
};

/** Détermine le poids de fiabilité d'un résultat de reclassement de ligne. */
const poidsResultat = (res) => {
  switch (res.source) {
    case 'regle_multinature': return POIDS.regle_multinature;
    case 'referentiel':       return POIDS.referentiel;
    case 'mots_cles': {
      const mot = String(res.motCleMatch || '').toUpperCase();
      const transverse = MOTS_CLES_TRANSVERSES.some(t => mot.includes(t));
      return transverse ? POIDS.mots_cles_faible : POIDS.mots_cles_fort;
    }
    case 'mapping_compte':
      return res.heterogene ? POIDS.mapping_hetero : POIDS.mapping_homogene;
    default:
      return 0;
  }
};

const SOURCE_LABEL = {
  regle_multinature: 'règle contextuelle',
  mots_cles:         'mot-clé',
  mapping_compte:    'compte',
  referentiel:       'référentiel',
};

/**
 * Analyse les commandes d'un fournisseur et renvoie une suggestion de classement.
 *
 * @param {string} nom      Nom du fournisseur (utilisé comme désignation de repli).
 * @param {Array}  orders   Commandes du fournisseur : { description|libelle, montant, compteOrdonnateur }.
 * @param {object} moteur   Le moteur de reclassement (référentiel, règles, mapping).
 * @returns {null | {
 *   famille, sousCategorie, confidence, couverture,
 *   nOrders, nClassees, montantTotal, montantClasse,
 *   sources, alternative
 * }}  null si aucune commande exploitable.
 */
export const suggererClassement = (nom, orders, moteur) => {
  if (!Array.isArray(orders) || orders.length === 0) return null;

  // Clé = "famille||sousCategorie" → score pondéré agrégé
  const tally = new Map();
  const sourcesParCle = new Map();   // clé → Set des libellés de sources
  let scoreTotal = 0;
  let montantTotal = 0;
  let montantClasse = 0;
  let nClassees = 0;

  for (const o of orders) {
    const montant = Math.abs(Number(o.montant) || 0);
    montantTotal += montant;

    const ligne = {
      fournisseur:       nom,
      supplier:          nom,
      designation:       o.description || o.designation || o.libelle || '',
      description:       o.description || o.designation || o.libelle || '',
      compteOrdonnateur: o.compteOrdonnateur || o.compte || '',
    };

    const res = reclasser(ligne, moteur);
    if (!res || res.famille === 'Non classé') continue;

    const poids = poidsResultat(res);
    if (poids <= 0) continue;

    const score = (montant + 1) * poids;     // +1 : les lignes à 0 € comptent un peu
    const cle = `${res.famille}||${res.sousCategorie || ''}`;
    tally.set(cle, (tally.get(cle) || 0) + score);
    scoreTotal += score;
    montantClasse += montant;
    nClassees += 1;

    if (!sourcesParCle.has(cle)) sourcesParCle.set(cle, new Map());
    const sm = sourcesParCle.get(cle);
    const lbl = SOURCE_LABEL[res.source] || res.source;
    sm.set(lbl, (sm.get(lbl) || 0) + 1);
  }

  if (tally.size === 0 || scoreTotal === 0) return null;

  const classement = [...tally.entries()].sort((a, b) => b[1] - a[1]);
  const [cle, score] = classement[0];
  const [famille, sousCategorie] = cle.split('||');

  const sources = [...(sourcesParCle.get(cle) || new Map()).entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([label, n]) => ({ label, n }));

  const alt = classement[1]
    ? (() => {
        const [k, s] = classement[1];
        const [f, sc] = k.split('||');
        return { famille: f, sousCategorie: sc, confidence: s / scoreTotal };
      })()
    : null;

  return {
    famille,
    sousCategorie:  sousCategorie || '',
    confidence:     score / scoreTotal,                 // part du score pondéré
    couverture:     montantTotal > 0 ? montantClasse / montantTotal : 0,
    nOrders:        orders.length,
    nClassees,
    montantTotal,
    montantClasse,
    sources,
    alternative:    alt,
  };
};
