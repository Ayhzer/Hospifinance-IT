import { ESTABLISHMENT } from '../config/establishment';

/**
 * Familles analytiques DSI — Hospifinance-IT
 * Regroupements métier génériques applicables à toute DSI hospitalière.
 * Vous pouvez renommer/étendre ces familles selon votre organisation.
 */
export const FAMILLE_ANALYTIQUE = {
  INFRASTRUCTURE:  'Infrastructures',
  APPLICATIONS:    'Applications',
  SUPPORT_USERS:   'Support et services utilisateurs',
  CYBERSECURITE:   'Cybersécurité',
  DATA_PILOTAGE:   'Data et pilotage',
  PRESTATIONS:     'Prestations externes récurrentes',
  HORS_PERIMETRE:  `Hors périmètre ${ESTABLISHMENT.department}`,
};

/** Libellé "hors périmètre" réutilisable comme fallback de classification. */
export const HORS_PERIMETRE_LABEL = FAMILLE_ANALYTIQUE.HORS_PERIMETRE;

/**
 * Liste des familles analytiques disponibles dans les listes déroulantes.
 * Source de vérité = la NOMENCLATURE (éditable), complétée par les valeurs déjà
 * présentes dans les données (`extra`, anti-orphelin) et toujours « Hors
 * périmètre » en dernier recours. Garantit qu'aucune famille affectée ne
 * disparaît d'un menu même si elle n'est plus dans la nomenclature.
 */
export const listFamilles = (nomenclature = [], extra = []) => {
  const out = [];
  const seen = new Set();
  const push = (f) => {
    const v = String(f || '').trim();
    if (v && !seen.has(v)) { seen.add(v); out.push(v); }
  };
  (nomenclature || []).forEach(n => push(n.famille));
  (extra || []).forEach(push);
  push(HORS_PERIMETRE_LABEL);
  return out;
};

/** Sous-catégories disponibles pour une famille (depuis la nomenclature). */
export const sousCategoriesFor = (famille, nomenclature = []) => {
  const raw = (nomenclature || []).find(n => n.famille === famille)?.sousCategoriesDisponibles || [];
  return raw.map(s => (typeof s === 'string' ? s : s.label));
};

/**
 * Nomenclature par défaut — sous-catégories (N2) par famille analytique (N1).
 * ---------------------------------------------------------------------------
 * Taxonomie de DÉMARRAGE issue des bonnes pratiques de benchmark IT (santé et
 * hors santé). Sert à alimenter les listes de sous-familles du moteur de
 * reclassement (Référentiel fournisseurs, règles…) dès une installation neuve,
 * sans dépendre du dépôt de données. Entièrement éditable dans l'application ;
 * une nomenclature fournie par le dépôt de données (reclassement.json) la
 * remplace si elle existe.
 *
 * `perimetre` : Run (exploitation récurrente) / Build (investissement, projet).
 */
export const DEFAULT_NOMENCLATURE = [
  {
    famille: FAMILLE_ANALYTIQUE.INFRASTRUCTURE,
    sousCategoriesDisponibles: [
      { label: 'Serveurs / virtualisation', perimetre: 'Run + Build', description: 'Serveurs physiques et virtuels, hyperviseurs.' },
      { label: 'Réseau / liaisons',         perimetre: 'Run',         description: 'Liaisons opérateurs, équipements réseau, WAN/LAN.' },
      { label: 'Stockage / sauvegarde',     perimetre: 'Run + Build', description: 'Baies de stockage, sauvegarde, archivage.' },
    ],
  },
  {
    famille: FAMILLE_ANALYTIQUE.APPLICATIONS,
    sousCategoriesDisponibles: [
      { label: 'Licences / abonnements',  perimetre: 'Run', description: 'Licences logicielles et abonnements applicatifs.' },
      { label: 'Maintenance applicative', perimetre: 'Run', description: 'Contrats de maintenance et TMA.' },
    ],
  },
  {
    famille: FAMILLE_ANALYTIQUE.SUPPORT_USERS,
    sousCategoriesDisponibles: [
      { label: 'Poste de travail', perimetre: 'Run', description: 'Matériel et logiciels du poste de travail.' },
    ],
  },
  {
    famille: FAMILLE_ANALYTIQUE.CYBERSECURITE,
    sousCategoriesDisponibles: [
      { label: 'Sécurité / audits', perimetre: 'Run + Build', description: "Outils de sécurité, SOC, audits et tests d'intrusion." },
    ],
  },
  {
    famille: FAMILLE_ANALYTIQUE.DATA_PILOTAGE,
    sousCategoriesDisponibles: [
      { label: 'BI / décisionnel', perimetre: 'Build', description: 'Outils décisionnels et de pilotage de la donnée.' },
    ],
  },
  {
    famille: FAMILLE_ANALYTIQUE.PRESTATIONS,
    sousCategoriesDisponibles: [
      { label: 'Infogérance / prestations', perimetre: 'Run', description: 'Prestations récurrentes externalisées.' },
    ],
  },
];

/**
 * Mapping compte ordonnateur → famille analytique.
 * ---------------------------------------------------------------------------
 * VALEURS DE DÉMONSTRATION. Ce mapping n'est qu'un point de départ (fallback) :
 * il est entièrement éditable dans l'application via le module « Reclassement ».
 * Remplacez ces comptes par ceux de VOTRE plan comptable.
 */
export const COMPTE_TO_FAMILLE = {
  'H60625100': FAMILLE_ANALYTIQUE.SUPPORT_USERS,
  'H61325100': FAMILLE_ANALYTIQUE.INFRASTRUCTURE,
  'H61526100': FAMILLE_ANALYTIQUE.APPLICATIONS,
  'H62226000': FAMILLE_ANALYTIQUE.CYBERSECURITE,
  'H62281000': FAMILLE_ANALYTIQUE.PRESTATIONS,
  'H62610000': FAMILLE_ANALYTIQUE.INFRASTRUCTURE,
  'H62881100': FAMILLE_ANALYTIQUE.APPLICATIONS,
  'H65100000': FAMILLE_ANALYTIQUE.APPLICATIONS,
};

/**
 * Budgets EPRD par compte — VALEURS DE DÉMONSTRATION.
 * ---------------------------------------------------------------------------
 * Éditables dans l'application via le module « Budget EPRD ». À remplacer par
 * les dotations réelles de votre établissement pour l'exercice de pilotage.
 */
export const BUDGET_EPRD_DEMO = {
  'H61526100': 1200000,
  'H65100000': 450000,
  'H62610000': 500000,
  'H61325100': 300000,
  'H62881100': 200000,
  'H62281000': 210000,
  'H62226000': 140000,
  'H60625100': 150000,
};

export const BUDGET_EPRD_TOTAL_OPEX_SI = Object.values(BUDGET_EPRD_DEMO)
  .reduce((sum, v) => sum + v, 0);

/**
 * Données EPRD statiques (fallback si l'API ne répond pas) — DÉMONSTRATION.
 * Reflète eprd.json du dépôt de données. À adapter à votre établissement.
 */
export const EPRD_STATIC = [
  { compteOrdonnateur: 'H61526100', libelleCompte: 'MAINTENANCE INFORMATIQUE',        familleAnalytique: 'Applications',                    budgetEPRD: 1200000, annee: ESTABLISHMENT.defaultYear },
  { compteOrdonnateur: 'H65100000', libelleCompte: 'LICENCES & REDEVANCES',           familleAnalytique: 'Applications',                    budgetEPRD: 450000,  annee: ESTABLISHMENT.defaultYear },
  { compteOrdonnateur: 'H62610000', libelleCompte: 'LIAISONS / RÉSEAUX',              familleAnalytique: 'Infrastructures',                  budgetEPRD: 500000,  annee: ESTABLISHMENT.defaultYear },
  { compteOrdonnateur: 'H61325100', libelleCompte: 'LOCATION MATÉRIEL INFORMATIQUE',  familleAnalytique: 'Infrastructures',                  budgetEPRD: 300000,  annee: ESTABLISHMENT.defaultYear },
  { compteOrdonnateur: 'H62881100', libelleCompte: 'ABONNEMENTS APPLICATIFS',         familleAnalytique: 'Applications',                    budgetEPRD: 200000,  annee: ESTABLISHMENT.defaultYear },
  { compteOrdonnateur: 'H62281000', libelleCompte: 'PRESTATIONS INFORMATIQUES',       familleAnalytique: 'Prestations externes récurrentes', budgetEPRD: 210000,  annee: ESTABLISHMENT.defaultYear },
  { compteOrdonnateur: 'H62226000', libelleCompte: 'CYBERSÉCURITÉ / AUDITS',          familleAnalytique: 'Cybersécurité',                   budgetEPRD: 140000,  annee: ESTABLISHMENT.defaultYear },
  { compteOrdonnateur: 'H60625100', libelleCompte: 'PETIT MATÉRIEL INFORMATIQUE',     familleAnalytique: 'Support et services utilisateurs', budgetEPRD: 150000,  annee: ESTABLISHMENT.defaultYear },
];

// Nombre de mois réalisés à date — à mettre à jour à chaque extraction.
export const NB_MOIS_REALISES = 5;

// Seuils d'alerte budgétaire (% de consommation).
export const SEUILS_ALERTE_DSI = {
  CRITIQUE:   85,
  SURVEILLER: 50,
  NORMAL:      0,
};
