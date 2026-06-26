/**
 * PaiementsLoader — Parseur d'export comptable (logiciel de paiements)
 * Format attendu : onglet "Export", colonnes définies dans la spec ReconciliationEngine
 */

import * as XLSX from 'xlsx';

const TYPES_PIECES_VALIDES = new Set(['FF', 'OD', 'NDF']);

// Cherche une valeur dans un objet avec plusieurs variantes de clé possibles
const getCol = (row, ...variants) => {
  for (const v of variants) {
    if (row[v] !== undefined && row[v] !== null) return row[v];
  }
  return undefined;
};

const parseDate = (raw) => {
  if (!raw) return null;
  if (raw instanceof Date) return isNaN(raw.getTime()) ? null : raw;
  if (typeof raw === 'number') {
    // Numéro de série Excel
    const d = XLSX.SSF.parse_date_code(raw);
    if (d) return new Date(d.y, d.m - 1, d.d);
  }
  const d = new Date(raw);
  return isNaN(d.getTime()) ? null : d;
};

export const loadSAGE = async (file) => {
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: 'array', cellDates: true });

  const sheetName = wb.SheetNames.includes('Export') ? 'Export' : wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  const raw = XLSX.utils.sheet_to_json(ws, { defval: null });

  const rows = [];
  const warnings = [];

  for (const r of raw) {
    // Filtrer les lignes parasites : seules les lignes dont "Compte" commence par 8 chiffres
    const compteRaw = String(getCol(r, 'Compte') ?? '');
    if (!/^\d{8}/.test(compteRaw)) continue;

    const compteParts = compteRaw.split('|');
    const compte = compteParts[0].trim();
    const libelle_compte = compteParts[1]?.trim() || compte;

    const ufRaw = String(getCol(r, 'UF') ?? '');
    const ufParts = ufRaw.split('|');
    const uf_code = ufParts[0]?.trim() || '';
    const uf_libelle = ufParts[1]?.trim() || uf_code;

    const type_piece = String(getCol(r, 'codeTypePiece') ?? '').trim().toUpperCase();

    const date_piece = parseDate(getCol(r, 'Date pièce', 'Date pièce', 'Date piece'));
    const mois = date_piece ? date_piece.getMonth() + 1 : null;
    const annee = date_piece ? date_piece.getFullYear() : null;

    const debit  = Number(getCol(r, 'Montant debit',  'Montant débit')  ?? 0) || 0;
    const credit = Number(getCol(r, 'Montant credit', 'Montant crédit') ?? 0) || 0;
    const soldeRaw = getCol(r, 'Solde');
    const solde = soldeRaw !== undefined && soldeRaw !== null ? Number(soldeRaw) || 0 : debit - credit;

    if (Math.abs(debit - credit - solde) > 0.02) {
      warnings.push(`Solde incohérent sur écriture ${getCol(r, 'N° Ecriture', 'N° Ecriture') ?? '?'} (compte ${compte})`);
    }

    if (!TYPES_PIECES_VALIDES.has(type_piece) && type_piece !== '') {
      warnings.push(`Type de pièce inconnu "${type_piece}" — écriture ignorée`);
      continue;
    }

    rows.push({
      n_ecriture: getCol(r, 'N° Ecriture', 'N° Ecriture'),
      compte,
      libelle_compte,
      uf_code,
      uf_libelle,
      type_piece,
      date_piece,
      mois,
      annee,
      debit,
      credit,
      solde,
      est_hors_circuit: type_piece === 'OD' || type_piece === 'NDF',
    });
  }

  return { rows, warnings };
};

export const getTotauxParCompte = (rows) => {
  const map = new Map();
  for (const row of rows) {
    if (!map.has(row.compte)) {
      map.set(row.compte, {
        compte: row.compte,
        libelle: row.libelle_compte,
        solde_ff: 0, solde_od: 0, solde_ndf: 0, solde_total: 0, nb_lignes: 0,
      });
    }
    const e = map.get(row.compte);
    if      (row.type_piece === 'FF')  e.solde_ff  += row.solde;
    else if (row.type_piece === 'OD')  e.solde_od  += row.solde;
    else if (row.type_piece === 'NDF') e.solde_ndf += row.solde;
    e.solde_total += row.solde;
    e.nb_lignes++;
  }
  return [...map.values()].sort((a, b) => b.solde_total - a.solde_total);
};
