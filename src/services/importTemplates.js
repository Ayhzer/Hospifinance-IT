/**
 * Générateur de fichiers exemple — Hospifinance-IT
 * ---------------------------------------------------------------------------
 * Produit un fichier .xlsx d'exemple au format canonique, avec :
 *   - un onglet de données (en-têtes + quelques lignes de démonstration),
 *   - un onglet « Notice » décrivant chaque colonne.
 * L'utilisateur télécharge ce fichier, remplace les lignes de démo par les
 * données réelles exportées de SON logiciel, puis le réimporte.
 */
import * as XLSX from 'xlsx';
import { CANONICAL_ORDERS_COLUMNS, CANONICAL_PAYMENTS_COLUMNS } from './importSchema';
import { SOURCE_SOFTWARE } from '../config/sources';

/** Quelques lignes de démonstration cohérentes pour le modèle « Commandes ». */
const ORDERS_DEMO_ROWS = [
  {
    numeroCommande: 'CMD-2026-0001', numeroLigne: '1', typeCommande: 'Bon de commande', etat: 'Soldee',
    exercice: '2026', datePassation: '2026-01-15', dateImputation: '2026-02-10', dateReception: '2026-02-05',
    compteOrdonnateur: 'H61526100', libelleCompte: 'MAINTENANCE INFORMATIQUE', fournisseur: 'ACME INFORMATIQUE',
    designation: 'Maintenance annuelle serveurs', codeGestionnaire: 'IT', codeUF: '250', numeroMarche: '',
    tauxTVA: '20', montantEngage: '12000', engagementNonRecu: '0', mandateNet: '12000', montantRealise: '12000',
  },
  {
    numeroCommande: 'CMD-2026-0002', numeroLigne: '1', typeCommande: 'Marche', etat: 'En cours',
    exercice: '2026', datePassation: '2026-03-02', dateImputation: '', dateReception: '',
    compteOrdonnateur: 'H65100000', libelleCompte: 'LICENCES & REDEVANCES', fournisseur: 'SOFTEDITION SAS',
    designation: 'Licences bureautiques (renouvellement)', codeGestionnaire: 'IT', codeUF: '250', numeroMarche: '2025-IT-014',
    tauxTVA: '20', montantEngage: '45000', engagementNonRecu: '45000', mandateNet: '0', montantRealise: '0',
  },
  {
    numeroCommande: 'CMD-2026-0003', numeroLigne: '1', typeCommande: 'Bon de commande', etat: 'Mandate',
    exercice: '2026', datePassation: '2026-02-20', dateImputation: '2026-04-01', dateReception: '2026-03-28',
    compteOrdonnateur: 'H21830000', libelleCompte: 'MATERIEL INFORMATIQUE (IMMO)', fournisseur: 'NETWORK PRO',
    designation: 'Commutateurs réseau cœur (investissement)', codeGestionnaire: 'IT', codeUF: '250', numeroMarche: '',
    tauxTVA: '20', montantEngage: '38000', engagementNonRecu: '0', mandateNet: '38000', montantRealise: '38000',
  },
];

/** Lignes de démonstration pour le modèle « Comptabilité / Paiements ». */
const PAYMENTS_DEMO_ROWS = [
  { compte: 'H61526100', uf: '250', typePiece: 'FF', datePiece: '2026-02-10', montantDebit: '12000', montantCredit: '0', libelle: 'Facture maintenance serveurs' },
  { compte: 'H65100000', uf: '250', typePiece: 'FF', datePiece: '2026-04-15', montantDebit: '45000', montantCredit: '0', libelle: 'Facture licences bureautiques' },
  { compte: 'H62610000', uf: '250', typePiece: 'OD', datePiece: '2026-03-31', montantDebit: '5200',  montantCredit: '0', libelle: 'Régularisation liaison réseau' },
];

const buildSheetFromColumns = (columns, demoRows) => {
  const header = columns.map((c) => c.header);
  const data = demoRows.map((row) => columns.map((c) => row[c.key] ?? ''));
  return XLSX.utils.aoa_to_sheet([header, ...data]);
};

const buildNoticeSheet = (columns, sourceLabel) => {
  const rows = [
    [`MODÈLE D'IMPORT — Hospifinance-IT`],
    [`Source : ${sourceLabel}`],
    [],
    ['Remplacez les lignes de démonstration de l\'onglet de données par vos données réelles,'],
    ['exportées depuis votre logiciel puis mises au format des colonnes ci-dessous.'],
    ['Le matching se fait par NOM de colonne (accents/casse ignorés) — l\'ordre est libre.'],
    [],
    ['Colonne', 'Obligatoire', 'Description', 'Exemple'],
    ...columns.map((c) => [c.header, c.required ? 'Oui' : 'Non', c.description, String(c.example ?? '')]),
  ];
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [{ wch: 22 }, { wch: 12 }, { wch: 70 }, { wch: 26 }];
  return ws;
};

const triggerDownload = (workbook, filename) => {
  XLSX.writeFile(workbook, filename);
};

/** Génère et télécharge le fichier exemple « Commandes ». */
export const downloadOrdersTemplate = () => {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, buildSheetFromColumns(CANONICAL_ORDERS_COLUMNS, ORDERS_DEMO_ROWS), 'Commandes');
  XLSX.utils.book_append_sheet(wb, buildNoticeSheet(CANONICAL_ORDERS_COLUMNS, SOURCE_SOFTWARE.orders), 'Notice');
  triggerDownload(wb, 'Hospifinance-IT_modele_commandes.xlsx');
};

/** Génère et télécharge le fichier exemple « Comptabilité / Paiements ». */
export const downloadPaymentsTemplate = () => {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, buildSheetFromColumns(CANONICAL_PAYMENTS_COLUMNS, PAYMENTS_DEMO_ROWS), 'Comptabilite');
  XLSX.utils.book_append_sheet(wb, buildNoticeSheet(CANONICAL_PAYMENTS_COLUMNS, SOURCE_SOFTWARE.payments), 'Notice');
  triggerDownload(wb, 'Hospifinance-IT_modele_paiements.xlsx');
};
