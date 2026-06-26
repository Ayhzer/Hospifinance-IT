/**
 * Schéma canonique d'import — Hospifinance-IT
 * ---------------------------------------------------------------------------
 * Définit le format de fichier UNIQUE et générique attendu à l'import, quel que
 * soit le logiciel d'origine (MAGH2, EPSILON, CPAGE… → « logiciel source des
 * commandes »). L'utilisateur exporte ses données depuis son propre logiciel,
 * les met au format de colonnes ci-dessous (cf. fichier exemple téléchargeable),
 * puis les importe.
 *
 * Le parsing se fait PAR NOM DE COLONNE (et non par position), avec tolérance
 * aux accents, à la casse et à quelques alias courants. L'ordre des colonnes
 * dans le fichier n'a donc aucune importance.
 */

/**
 * Colonnes du modèle « Commandes » (engagements / lignes de commande).
 * - key         : nom du champ interne
 * - header      : intitulé de colonne recommandé (utilisé dans le fichier exemple)
 * - aliases     : autres intitulés acceptés
 * - required    : colonne obligatoire pour qu'une ligne soit exploitable
 * - example     : valeur de démonstration (fichier exemple)
 * - description : aide affichée dans l'onglet « Notice » du fichier exemple
 */
export const CANONICAL_ORDERS_COLUMNS = [
  { key: 'numeroCommande',    header: 'Numero commande',      aliases: ['No commande', 'N° commande', 'Commande'],          required: true,  example: 'CMD-2026-0001', description: "Identifiant de la commande / bon de commande." },
  { key: 'numeroLigne',       header: 'Numero ligne',         aliases: ['No ligne', 'Ligne'],                                required: false, example: '1',             description: "Numéro de ligne au sein de la commande." },
  { key: 'typeCommande',      header: 'Type commande',        aliases: ['Type', 'Type de commande'],                         required: false, example: 'Bon de commande', description: "Type : Bon de commande, Marché, Accord-cadre…" },
  { key: 'etat',              header: 'Etat',                 aliases: ['État', 'Statut', 'Etat commande'],                  required: false, example: 'Soldee',        description: "État dans le logiciel source (Soldée, En cours, Liquidé, Mandaté, Annulée…)." },
  { key: 'exercice',          header: 'Exercice',             aliases: ['Annee', 'Année', 'Year'],                           required: false, example: '2026',          description: "Exercice budgétaire (année) de la ligne." },
  { key: 'datePassation',     header: 'Date passation',       aliases: ['Date commande', 'Date de passation'],               required: false, example: '2026-01-15',    description: "Date de passation / commande (AAAA-MM-JJ ou date Excel)." },
  { key: 'dateImputation',    header: 'Date imputation',      aliases: ['Date facture', "Date d'imputation"],                required: false, example: '2026-02-10',    description: "Date d'imputation comptable / facture." },
  { key: 'dateReception',     header: 'Date reception',       aliases: ['Date réception', 'Date livraison'],                 required: false, example: '2026-02-05',    description: "Date de réception / livraison." },
  { key: 'compteOrdonnateur', header: 'Compte',               aliases: ['Compte ordonnateur', 'Compte comptable'],           required: true,  example: 'H61526100',     description: "Compte comptable. Préfixe → OPEX/CAPEX (cf. config/accounting.js)." },
  { key: 'libelleCompte',     header: 'Libelle compte',       aliases: ['Libellé compte', 'Intitule compte', 'Intitulé compte'], required: false, example: 'MAINTENANCE INFORMATIQUE', description: "Libellé du compte comptable." },
  { key: 'fournisseur',       header: 'Fournisseur',          aliases: ['Tiers', 'Editeur', 'Éditeur'],                      required: true,  example: 'ACME INFORMATIQUE', description: "Nom du fournisseur / tiers." },
  { key: 'designation',       header: 'Designation',          aliases: ['Désignation', 'Libelle', 'Libellé', 'Objet'],       required: false, example: 'Maintenance annuelle serveurs', description: "Désignation / objet de la commande." },
  { key: 'codeGestionnaire',  header: 'Code gestionnaire',    aliases: ['Gestionnaire', 'Service', 'Responsable'],           required: false, example: 'IT',            description: "Service gestionnaire. Sert au filtre de périmètre (cf. config/accounting.js)." },
  { key: 'codeUF',            header: 'Code UF',              aliases: ['UF', 'Unite fonctionnelle', 'Unité fonctionnelle'], required: false, example: '250',           description: "Code de l'unité fonctionnelle." },
  { key: 'numeroMarche',      header: 'Numero marche',        aliases: ['No marche', 'N° marché', 'Marche', 'Marché'],       required: false, example: '',              description: "Numéro de marché public (si applicable)." },
  { key: 'tauxTVA',           header: 'Taux TVA',             aliases: ['TVA', 'Taux de TVA'],                               required: false, example: '20',            description: "Taux de TVA en %. Utilisé pour la conversion TTC→HT optionnelle." },
  { key: 'montantEngage',     header: 'Montant engage',       aliases: ['Montant engagé', 'Montant', 'Montant HT'],          required: false, example: '12000',         description: "Montant engagé de la ligne." },
  { key: 'engagementNonRecu', header: 'Engagement non recu',  aliases: ['Engagement non reçu', 'ENR', 'Engage non recu'],    required: false, example: '0',             description: "Montant engagé non encore reçu / facturé (ENR)." },
  { key: 'mandateNet',        header: 'Mandate net',          aliases: ['Mandaté net', 'Mandate', 'Paye', 'Payé'],           required: false, example: '12000',         description: "Montant mandaté net (effectivement payé)." },
  { key: 'montantRealise',    header: 'Montant realise',      aliases: ['Montant réalisé', 'Realise', 'Réalisé'],            required: false, example: '12000',         description: "Montant réalisé (service fait)." },
];

/**
 * Colonnes du modèle « Comptabilité / Paiements » (écritures comptables),
 * utilisé par le module de rapprochement (ex-SAGE → « logiciel de gestion des
 * paiements »). Une ligne = une écriture comptable.
 */
export const CANONICAL_PAYMENTS_COLUMNS = [
  { key: 'compte',       header: 'Compte',       aliases: ['Compte comptable'],                 required: true,  example: 'H61526100', description: "Compte comptable (8 chiffres ou code interne). Peut être au format 'CODE|LIBELLÉ'." },
  { key: 'uf',           header: 'UF',           aliases: ['Code UF', 'Unite fonctionnelle'],   required: false, example: '250',       description: "Unité fonctionnelle. Peut être au format 'CODE|LIBELLÉ'." },
  { key: 'typePiece',    header: 'Type piece',   aliases: ['codeTypePiece', 'Type pièce', 'Type'], required: true, example: 'FF',     description: "Type de pièce : FF (facture fournisseur), OD (opération diverse), NDF (note de frais)." },
  { key: 'datePiece',    header: 'Date piece',   aliases: ['Date pièce', 'Date'],               required: false, example: '2026-02-10', description: "Date de la pièce comptable." },
  { key: 'montantDebit', header: 'Montant debit', aliases: ['Montant débit', 'Debit', 'Débit'], required: false, example: '12000',     description: "Montant au débit." },
  { key: 'montantCredit',header: 'Montant credit',aliases: ['Montant crédit', 'Credit', 'Crédit'], required: false, example: '0',     description: "Montant au crédit." },
  { key: 'libelle',      header: 'Libelle',      aliases: ['Libellé', 'Designation', 'Désignation'], required: false, example: 'Maintenance annuelle serveurs', description: "Libellé de l'écriture (optionnel)." },
];

/** Normalise un intitulé de colonne : minuscules, sans accents, espaces compactés. */
export const normalizeHeader = (h) =>
  String(h ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ');

/**
 * Construit une fonction d'accès `get(row, key)` à partir de la ligne d'en-têtes
 * d'un fichier et d'un schéma canonique. Le matching est insensible casse/accents
 * et accepte les alias déclarés dans le schéma.
 */
export const buildHeaderResolver = (headerRow, schema) => {
  // index normalisé -> position de colonne
  const headerIndex = new Map();
  headerRow.forEach((h, i) => {
    const n = normalizeHeader(h);
    if (n && !headerIndex.has(n)) headerIndex.set(n, i);
  });

  // key canonique -> position de colonne
  const keyToCol = new Map();
  for (const col of schema) {
    const candidates = [col.header, ...(col.aliases || [])].map(normalizeHeader);
    for (const c of candidates) {
      if (headerIndex.has(c)) { keyToCol.set(col.key, headerIndex.get(c)); break; }
    }
  }

  const missingRequired = schema
    .filter((c) => c.required && !keyToCol.has(c.key))
    .map((c) => c.header);

  const get = (row, key) => {
    const col = keyToCol.get(key);
    return col === undefined ? undefined : row[col];
  };

  return { get, keyToCol, missingRequired, headerIndex };
};
