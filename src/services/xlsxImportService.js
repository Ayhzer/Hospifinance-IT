/**
 * Service d'import — Hospifinance-IT
 * ---------------------------------------------------------------------------
 * Import GÉNÉRIQUE par modèle canonique : le fichier est lu PAR NOM DE COLONNE
 * (cf. importSchema.js), indépendamment du logiciel d'origine. N'importe quel
 * hôpital peut donc importer ses commandes après les avoir mises au format du
 * fichier exemple téléchargeable (cf. importTemplates.js).
 */
import * as XLSX from 'xlsx';
import { COMPTE_TO_FAMILLE, HORS_PERIMETRE_LABEL } from '../constants/analytiqueConstants';
import { reclasser, normaliseFournisseur } from '../utils/reclassementEngine';
import { ACCOUNTING, getLineType } from '../config/accounting';
import { CANONICAL_ORDERS_COLUMNS, buildHeaderResolver } from './importSchema';

const num = (val) => {
  if (val === '-' || val === undefined || val === null || val === '') return 0;
  return Number(val) || 0;
};

const normaliseStr = (val) =>
  val === '-' || val === undefined || val === null ? '' : String(val).trim();

/** Convertit une valeur de date (Excel, ISO, FR) en 'AAAA-MM-JJ'. */
const parseDate = (val) => {
  if (!val || val === '-') return '';
  if (val instanceof Date) return val.toISOString().split('T')[0];
  if (typeof val === 'number') {
    const date = XLSX.SSF.parse_date_code(val);
    if (date) return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
  }
  if (typeof val === 'string') {
    const isoMatch = val.match(/^(\d{4}-\d{2}-\d{2})/);
    if (isoMatch) return isoMatch[1];
    const frMatch = val.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
    if (frMatch) return `${frMatch[3]}-${frMatch[2]}-${frMatch[1]}`;
  }
  return '';
};

/** Mappe un état source libre vers le statut interne (cycle de vie commande). */
const mapStatus = (etat, montantEngageNonRecu) => {
  const e = String(etat).trim().toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '');
  if (e === 'annulee' || e === 'annule')   return 'Annulée';
  if (e === 'soldee'  || e === 'mandate' || e === 'paye' || e === 'payee') return 'Payée';
  if (e === 'liquide' || e === 'facturee') return 'Facturée';
  return num(montantEngageNonRecu) > 0 ? 'Commandée' : 'Livrée';
};

const normaliseTypeCommande = (t) => {
  const map = {
    'bon de commande':           'BC',
    'marche a bons de commande': 'MBC',
    'marche':                    'Marché',
    'accord cadre':              'Accord-cadre',
  };
  return map[String(t).toLowerCase()] || t;
};

const genId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

/**
 * Détecte, parmi les onglets, celui qui contient les en-têtes du modèle
 * « Commandes ». Retourne le nom d'onglet, ou null si aucun ne correspond.
 */
export const detectCommandesSheet = (workbook) => {
  for (const name of workbook.SheetNames) {
    const ws = workbook.Sheets[name];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, range: 0 });
    const headerRow = rows[0] || [];
    const { missingRequired } = buildHeaderResolver(headerRow, CANONICAL_ORDERS_COLUMNS);
    if (missingRequired.length === 0) return name;
  }
  return null;
};

/**
 * Importe un fichier de COMMANDES au format canonique.
 *
 * @param {File}    file       Fichier XLSX/CSV uploadé.
 * @param {object}  options
 * @param {string}  options.exercice   Exercice à filtrer pour les agrégats (null = tous).
 * @param {boolean} options.convertHT  Convertir TTC→HT via le taux de TVA (défaut false).
 * @param {object}  options.moteur     Moteur de reclassement (optionnel).
 * @param {string}  options.sheetName  Onglet cible (auto-détecté si absent).
 * @returns {Promise<{opexSuppliers, opexOrders, capexProjects, capexOrders, errors, stats, exercice, convertHT}>}
 */
export const importCommandes = async (file, options = {}) => {
  const { exercice = null, convertHT = false, moteur = null, sheetName = null } = options;

  const buffer   = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { cellDates: false, raw: false });

  const targetSheet = sheetName || detectCommandesSheet(workbook) || workbook.SheetNames[0];
  const sheet = workbook.Sheets[targetSheet];
  if (!sheet) {
    throw new Error(`Onglet introuvable. Onglets disponibles : ${workbook.SheetNames.join(', ')}`);
  }

  const rowsRaw   = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });
  const headerRow = rowsRaw[0] || [];
  const dataRows  = rowsRaw.slice(1);

  const { get, missingRequired } = buildHeaderResolver(headerRow, CANONICAL_ORDERS_COLUMNS);
  if (missingRequired.length > 0) {
    throw new Error(
      `Colonnes obligatoires manquantes : ${missingRequired.join(', ')}. ` +
      `Téléchargez le fichier exemple pour connaître le format attendu.`
    );
  }

  const opexGroups  = new Map();
  const capexGroups = new Map();
  const opexOrders  = [];
  const capexOrders = [];
  const errors      = [];
  const stats       = { total: dataRows.length, filtered: 0, opex: 0, capex: 0, skipped: 0, historique: 0 };

  const managerFilter = String(ACCOUNTING.managerFilter || '').trim().toUpperCase();

  for (let i = 0; i < dataRows.length; i++) {
    const r = dataRows[i];
    if (!r || r.every((c) => c === null || c === '')) continue;
    try {
      // Filtre de périmètre (code gestionnaire) si configuré
      if (managerFilter) {
        const gestionnaire = String(get(r, 'codeGestionnaire') ?? '').trim().toUpperCase();
        if (gestionnaire !== managerFilter) { stats.skipped++; continue; }
      }

      const compte = normaliseStr(get(r, 'compteOrdonnateur'));
      const lineType = getLineType(compte);
      if (!lineType) { stats.skipped++; continue; }

      const rowExercice   = normaliseStr(get(r, 'exercice'));
      const isCurrentYear = !exercice || rowExercice === String(exercice) || rowExercice === '';
      if (isCurrentYear) stats.filtered++; else stats.historique++;

      const tauxTVA = num(get(r, 'tauxTVA'));
      const div     = convertHT && tauxTVA > 0 ? (1 + tauxTVA / 100) : 1;
      const toHT    = (v) => Math.round((num(v) / div) * 100) / 100;

      const fournisseur   = normaliseStr(get(r, 'fournisseur'));
      const libelleCompte = normaliseStr(get(r, 'libelleCompte'));
      const designation   = normaliseStr(get(r, 'designation'));
      const datePassation = parseDate(get(r, 'datePassation'));
      const dateImputation= parseDate(get(r, 'dateImputation'));
      const dateReception = parseDate(get(r, 'dateReception'));
      const noCommande    = normaliseStr(get(r, 'numeroCommande'));
      const noLigne       = normaliseStr(get(r, 'numeroLigne'));
      const reference     = noLigne ? `${noCommande}/${noLigne}` : noCommande;
      const etat          = normaliseStr(get(r, 'etat'));
      const typeCommande  = normaliseTypeCommande(normaliseStr(get(r, 'typeCommande')));
      const noMarche      = num(get(r, 'numeroMarche'));
      const codeUF        = num(get(r, 'codeUF'));

      const montant           = toHT(get(r, 'montantEngage'));
      const engagementNonRecu = toHT(get(r, 'engagementNonRecu'));
      const mandateNet        = toHT(get(r, 'mandateNet'));
      const montantRealise    = toHT(get(r, 'montantRealise'));

      const groupKey = `${normaliseFournisseur(fournisseur)}||${compte}`;
      const famille  = moteur
        ? reclasser({ fournisseur, designation, compteOrdonnateur: compte }, moteur).famille
        : (COMPTE_TO_FAMILLE[compte] || HORS_PERIMETRE_LABEL);
      const status   = mapStatus(etat, engagementNonRecu);

      const orderObj = {
        id:                genId(),
        _supplierName:     fournisseur,
        description:       designation,
        montant,
        montantRealise,
        engagementNonRecu,
        mandateNet,
        status,
        dateCommande:      datePassation,
        dateFacture:       dateImputation,
        dateReception,
        reference,
        numeroMarche:      noMarche,
        typeCommande,
        etatSage:          etat,            // statut brut du logiciel source
        compteOrdonnateur: compte,
        exercice:          rowExercice,
        notes:             '',
      };

      if (lineType === 'OPEX') {
        if (isCurrentYear) stats.opex++;
        if (!opexGroups.has(groupKey)) {
          opexGroups.set(groupKey, {
            id: genId(), supplier: fournisseur, category: libelleCompte,
            compteOrdonnateur: compte, familleAnalytique: famille,
            budgetAnnuel: 0, depenseActuelle: 0, engagement: 0, montantRealise: 0,
            nbCommandes: 0, codeUF: codeUF || 0, notes: '',
          });
        }
        const grp = opexGroups.get(groupKey);
        if (isCurrentYear) {
          grp.depenseActuelle += mandateNet;
          grp.engagement      += engagementNonRecu;
          grp.montantRealise  += montantRealise;
          grp.nbCommandes     += 1;
        }
        opexOrders.push({ ...orderObj, parentId: grp.id });
      } else {
        if (isCurrentYear) stats.capex++;
        if (!capexGroups.has(groupKey)) {
          capexGroups.set(groupKey, {
            id: genId(), fournisseur, project: `${fournisseur} — ${libelleCompte}`,
            enveloppe: famille, familleAnalytique: '', sousCategorie: '',
            libelleCompte, compteOrdonnateur: compte,
            budgetTotal: 0, depense: 0, engagement: 0, montantRealise: 0,
            status: 'En cours', startDate: datePassation, endDate: '', notes: '',
          });
        }
        const grpC = capexGroups.get(groupKey);
        if (isCurrentYear) {
          grpC.depense        += mandateNet;
          grpC.engagement     += engagementNonRecu;
          grpC.montantRealise += montantRealise;
        }
        capexOrders.push({ ...orderObj, parentId: grpC.id });
      }
    } catch (err) {
      errors.push({ ligne: i + 2, erreur: err.message });
    }
  }

  const round2 = (v) => Math.round(v * 100) / 100;

  const opexSuppliers = [...opexGroups.values()].map((s) => ({
    ...s,
    depenseActuelle: round2(s.depenseActuelle),
    engagement:      round2(s.engagement),
    montantRealise:  round2(s.montantRealise),
  }));

  const capexProjects = [...capexGroups.values()].map((p) => ({
    ...p,
    depense:        round2(p.depense),
    engagement:     round2(p.engagement),
    montantRealise: round2(p.montantRealise),
  }));

  return { opexSuppliers, opexOrders, capexProjects, capexOrders, errors, stats, exercice, convertHT };
};
