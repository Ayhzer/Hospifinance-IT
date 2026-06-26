/**
 * Générateur de rapport exécutif PDF — Hospifinance-IT
 * Format A4 portrait, 2 pages, usage CODIR / DGA / DAF
 *
 * Page 1 : Synthèse exécutive (KPIs, consommation, atterrissage, alertes)
 * Page 2 : Détail par compte comptable
 */

import { jsPDF } from 'jspdf';
import { ESTABLISHMENT } from '../config/establishment';

// ── Palette ─────────────────────────────────────────────────────────────────
const C = {
  indigo:       [55, 48, 163],   // header fond
  indigoLight:  [99, 102, 241],  // accents
  indigoPale:   [238, 242, 255], // cartes fond
  blue:         [59, 130, 246],
  bluePale:     [239, 246, 255],
  green:        [22, 163, 74],
  greenPale:    [240, 253, 244],
  orange:       [234, 88, 12],
  orangePale:   [255, 247, 237],
  red:          [220, 38, 38],
  redPale:      [254, 242, 242],
  dark:         [17, 24, 39],    // texte principal
  mid:          [75, 85, 99],    // texte secondaire
  muted:        [156, 163, 175], // texte faible
  border:       [209, 213, 219], // bordures
  bg:           [249, 250, 251], // fond tableau
  white:        [255, 255, 255],
  black:        [0, 0, 0],
};

// ── Helpers ───────────────────────────────────────────────────────────────────

// Formateurs PDF-safe : évite Intl.NumberFormat (insère U+202F espace fin insécable
// que l'encodage WinAnsi de jsPDF ne supporte pas) et tout caractère hors Latin-1.
const _sep = (n) => Math.round(Math.abs(n)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

const fmtK = (v) => {
  if (!v && v !== 0) return '-';
  const abs = Math.abs(v);
  const sign = v < 0 ? '-' : '';
  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(2).replace('.', ',')} M EUR`;
  if (abs >= 1_000)     return `${sign}${_sep(abs / 1_000)} k EUR`;
  return `${sign}${_sep(abs)} EUR`;
};

const fmtEur = (v) => {
  if (!v && v !== 0) return '-';
  const sign = v < 0 ? '-' : '';
  return `${sign}${_sep(v)} EUR`;
};

const fmtPct = (v) => `${(v || 0).toFixed(1)} %`;

const statusColor = (taux) => {
  if (taux > 100) return C.red;
  if (taux > 90)  return C.red;
  if (taux > 75)  return C.orange;
  return C.green;
};

const statusLabel = (taux) => {
  if (taux > 100) return 'DÉPASSEMENT';
  if (taux > 90)  return 'CRITIQUE';
  if (taux > 75)  return 'ALERTE';
  return 'OK';
};

// ── Primitives jsPDF ──────────────────────────────────────────────────────────

const fill = (doc, color) => doc.setFillColor(...color);
const stroke = (doc, color) => doc.setDrawColor(...color);
const textColor = (doc, color) => doc.setTextColor(...color);
const bold = (doc, size) => { doc.setFont('helvetica', 'bold');   doc.setFontSize(size); };
const normal = (doc, size) => { doc.setFont('helvetica', 'normal'); doc.setFontSize(size); };
const italic = (doc, size) => { doc.setFont('helvetica', 'italic'); doc.setFontSize(size); };

const rect = (doc, x, y, w, h, mode = 'F') => doc.rect(x, y, w, h, mode);

const progressBar = (doc, x, y, w, h, pct, colorFill) => {
  fill(doc, C.border);
  rect(doc, x, y, w, h);
  const fillW = Math.min(Math.max(w * Math.min(pct, 100) / 100, 0), w);
  if (fillW > 0) {
    fill(doc, colorFill);
    rect(doc, x, y, fillW, h);
  }
};

// ── Header commun ─────────────────────────────────────────────────────────────

const drawHeader = (doc, moisLabel, annee, nbMois) => {
  // Fond header
  fill(doc, C.indigo);
  rect(doc, 0, 0, 210, 28);

  // Bande décorative gauche
  fill(doc, C.indigoLight);
  rect(doc, 0, 0, 5, 28);

  // Titre principal
  textColor(doc, C.white);
  bold(doc, 16);
  doc.text('RAPPORT BUDGÉTAIRE DSI', 14, 11);

  bold(doc, 8.5);
  doc.text(`${ESTABLISHMENT.name} — ${ESTABLISHMENT.department}`, 14, 17.5);

  normal(doc, 8);
  doc.text(`Situation au ${moisLabel} ${annee}  ·  ${nbMois} mois réalisés sur 12  ·  Confidentiel — Usage CODIR`, 14, 23);

  // Étiquette en haut à droite
  fill(doc, C.indigoLight);
  rect(doc, 160, 4, 40, 8);
  textColor(doc, C.white);
  bold(doc, 7);
  doc.text('PILOTAGE BUDGÉTAIRE', 180, 9, { align: 'center' });
};

// ── Titre de section ──────────────────────────────────────────────────────────

const sectionTitle = (doc, text, y) => {
  fill(doc, C.bg);
  rect(doc, 14, y - 1, 182, 7);
  fill(doc, C.indigo);
  rect(doc, 14, y - 1, 3, 7);
  textColor(doc, C.dark);
  bold(doc, 10);
  doc.text(text, 20, y + 3.5);
};

// ── KPI Card ──────────────────────────────────────────────────────────────────

const kpiCard = (doc, x, y, w, h, label, value, sub, valueColor) => {
  // Fond
  fill(doc, C.white);
  stroke(doc, C.border);
  doc.setLineWidth(0.3);
  rect(doc, x, y, w, h, 'FD');

  // Label
  textColor(doc, C.mid);
  normal(doc, 7);
  doc.text(label, x + 3, y + 5);

  // Valeur
  textColor(doc, valueColor || C.dark);
  bold(doc, 13);
  doc.text(value, x + 3, y + 13);

  // Sous-titre
  textColor(doc, C.muted);
  normal(doc, 6.5);
  doc.text(sub, x + 3, y + 18.5, { maxWidth: w - 6 });
};

// ── Mini box OPEX ou CAPEX ────────────────────────────────────────────────────

const budgetBox = (doc, x, y, w, h, title, depense, engagement, budget, color) => {
  fill(doc, C.white);
  stroke(doc, color === 'blue' ? C.blue : C.green);
  doc.setLineWidth(0.5);
  rect(doc, x, y, w, h, 'FD');

  // Accent couleur top
  fill(doc, color === 'blue' ? C.blue : C.green);
  rect(doc, x, y, w, 2.5);

  // Titre
  textColor(doc, color === 'blue' ? C.blue : C.green);
  bold(doc, 9);
  doc.text(title, x + 3, y + 8);

  const charge = depense + engagement;
  const disponible = budget - charge;
  const taux = budget > 0 ? (charge / budget) * 100 : 0;

  // Lignes métriques
  const rows = [
    { label: 'Budget EPRD',      val: fmtEur(budget),     vc: C.dark },
    { label: 'Dépensé',          val: fmtEur(depense),    vc: C.blue },
    { label: 'Engagé non reçu',  val: fmtEur(engagement), vc: C.orange },
    { label: 'Charge engagée',   val: fmtEur(charge),     vc: C.dark },
    { label: 'Disponible',       val: fmtEur(disponible), vc: disponible < 0 ? C.red : C.green },
  ];

  rows.forEach((r, i) => {
    const ry = y + 14 + i * 8;
    textColor(doc, C.mid);
    normal(doc, 7.5);
    doc.text(r.label, x + 3, ry);
    textColor(doc, r.vc);
    bold(doc, 7.5);
    doc.text(r.val, x + w - 3, ry, { align: 'right' });
  });

  // Séparateur
  doc.setLineWidth(0.3);
  stroke(doc, C.border);
  doc.line(x + 3, y + h - 16, x + w - 3, y + h - 16);

  // Taux + barre
  textColor(doc, C.mid);
  normal(doc, 7);
  doc.text('Taux de consommation', x + 3, y + h - 11);
  textColor(doc, statusColor(taux));
  bold(doc, 8);
  doc.text(fmtPct(taux), x + w - 3, y + h - 11, { align: 'right' });

  progressBar(doc, x + 3, y + h - 7.5, w - 6, 3, taux, statusColor(taux));
};

// ── Tableau générique ─────────────────────────────────────────────────────────

const tableHeader = (doc, x, y, cols) => {
  fill(doc, C.indigo);
  rect(doc, x, y, cols.reduce((s, c) => s + c.w, 0), 7);
  textColor(doc, C.white);
  bold(doc, 7.5);
  let cx = x;
  cols.forEach(col => {
    const tx = col.align === 'right' ? cx + col.w - 2 : cx + 2;
    doc.text(col.label, tx, y + 4.8, { align: col.align || 'left' });
    cx += col.w;
  });
};

const tableRow = (doc, x, y, cols, data, isAlt, textColors) => {
  fill(doc, isAlt ? C.bg : C.white);
  const totalW = cols.reduce((s, c) => s + c.w, 0);
  rect(doc, x, y, totalW, 6.5);

  let cx = x;
  cols.forEach((col, i) => {
    const val = data[i] ?? '';
    const color = (textColors && textColors[i]) ? textColors[i] : C.dark;
    textColor(doc, color);
    const isBold = textColors && textColors[i] && JSON.stringify(textColors[i]) !== JSON.stringify(C.mid);
    if (isBold) bold(doc, 7.5); else normal(doc, 7.5);
    const tx = col.align === 'right' ? cx + col.w - 2 : cx + 2;
    doc.text(String(val), tx, y + 4.5, { align: col.align || 'left', maxWidth: col.w - 3 });
    cx += col.w;
  });

  // Ligne de séparation
  stroke(doc, C.border);
  doc.setLineWidth(0.15);
  doc.line(x, y + 6.5, x + totalW, y + 6.5);
};

const tableTotalRow = (doc, x, y, cols, data) => {
  fill(doc, C.indigoPale);
  const totalW = cols.reduce((s, c) => s + c.w, 0);
  rect(doc, x, y, totalW, 7);
  fill(doc, C.indigo);
  rect(doc, x, y, 3, 7);

  let cx = x;
  cols.forEach((col, i) => {
    const val = data[i] ?? '';
    textColor(doc, C.indigo);
    bold(doc, 7.5);
    const tx = col.align === 'right' ? cx + col.w - 2 : cx + 2;
    doc.text(String(val), tx, y + 4.8, { align: col.align || 'left' });
    cx += col.w;
  });
};

// ── Pied de page ──────────────────────────────────────────────────────────────

const drawFooter = (doc, pageNum, total) => {
  stroke(doc, C.border);
  doc.setLineWidth(0.3);
  doc.line(14, 284, 196, 284);
  textColor(doc, C.muted);
  normal(doc, 6.5);
  doc.text('CONFIDENTIEL — Réservé au CODIR, DGA et DAF — Ne pas diffuser', 14, 290);
  doc.text(`Page ${pageNum} / ${total}`, 196, 290, { align: 'right' });
  doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR')} par Hospifinance-IT`, 105, 290, { align: 'center' });
};

// ── Rapport complet ───────────────────────────────────────────────────────────

export const generateExecutiveReport = ({
  opexTotals,
  capexTotals,
  suppliers = [],
  projects = [],
  eprd = [],
  nbMoisRealises = 12,
  riskItems = [],
}) => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const MONTHS_FULL = [
    'Janvier','Février','Mars','Avril','Mai','Juin',
    'Juillet','Août','Septembre','Octobre','Novembre','Décembre',
  ];
  const annee       = new Date().getFullYear();
  const moisLabel   = MONTHS_FULL[Math.max(0, nbMoisRealises - 1)];
  const monthsElap  = Math.max(1, nbMoisRealises);

  const totalBudget   = opexTotals.budget    + capexTotals.budget;
  const totalDepense  = opexTotals.depense   + capexTotals.depense;
  const totalEngage   = opexTotals.engagement + capexTotals.engagement;
  const totalCharge   = totalDepense + totalEngage;
  const totalDispo    = totalBudget - totalCharge;
  const tauxGlobal    = totalBudget > 0 ? (totalCharge / totalBudget) * 100 : 0;

  const atterrissageOpex  = (opexTotals.depense / monthsElap) * 12 + opexTotals.engagement;
  const atterrissageCapex = (capexTotals.depense / monthsElap) * 12 + capexTotals.engagement;
  const atterrissageTotal = atterrissageOpex + atterrissageCapex;

  // ════════════════════════════════════════════════════════════════
  // PAGE 1 — SYNTHÈSE EXÉCUTIVE
  // ════════════════════════════════════════════════════════════════

  drawHeader(doc, moisLabel, annee, nbMoisRealises);

  // ── Section KPIs (y=32) ──────────────────────────────────────

  sectionTitle(doc, 'Indicateurs clés', 32);

  const cardW = 43.5;
  const cardH = 24;
  const cardY = 41;
  const cards = [
    {
      label: 'Budget Total',
      value: fmtK(totalBudget),
      sub:   `OPEX ${fmtK(opexTotals.budget)}  +  CAPEX ${fmtK(capexTotals.budget)}`,
      vc:    C.dark,
    },
    {
      label: 'Consommé (Dép. + Eng.)',
      value: fmtPct(tauxGlobal),
      sub:   fmtEur(totalCharge),
      vc:    statusColor(tauxGlobal),
    },
    {
      label: 'Atterrissage annuel',
      value: fmtK(atterrissageTotal),
      sub:   `${atterrissageTotal > totalBudget ? '(+) Depassement' : '(-) Sous budget'} ${fmtK(Math.abs(atterrissageTotal - totalBudget))}`,
      vc:    atterrissageTotal > totalBudget ? C.red : C.green,
    },
    {
      label: 'Disponible',
      value: fmtK(totalDispo),
      sub:   `${fmtPct(Math.max(100 - tauxGlobal, 0))} de marge restante`,
      vc:    totalDispo < 0 ? C.red : C.green,
    },
  ];

  cards.forEach((c, i) => {
    kpiCard(doc, 14 + i * (cardW + 1), cardY, cardW, cardH, c.label, c.value, c.sub, c.vc);
  });

  // ── Barre consommation globale (y=68) ────────────────────────

  sectionTitle(doc, 'Consommation globale', 68);

  const barY = 77;
  const barW = 120;

  textColor(doc, C.mid);
  normal(doc, 7.5);
  doc.text('Charge engagée vs Budget EPRD', 14, barY);
  textColor(doc, statusColor(tauxGlobal));
  bold(doc, 9);
  doc.text(fmtPct(tauxGlobal), 136, barY, { align: 'right' });

  progressBar(doc, 14, barY + 2, barW, 5, tauxGlobal, statusColor(tauxGlobal));

  // Légende barre
  const barCols = [
    { label: 'Dépensé (mandaté)',  val: fmtEur(totalDepense), color: C.blue },
    { label: 'Engagé non reçu',    val: fmtEur(totalEngage),  color: C.orange },
    { label: 'Disponible',          val: fmtEur(totalDispo),   color: totalDispo < 0 ? C.red : C.green },
  ];
  barCols.forEach((bc, i) => {
    const bx = 14 + i * 60;
    fill(doc, bc.color);
    rect(doc, bx, barY + 9.5, 3, 3);
    textColor(doc, C.mid);
    normal(doc, 6.5);
    doc.text(bc.label, bx + 5, barY + 12);
    textColor(doc, C.dark);
    bold(doc, 6.5);
    doc.text(bc.val, bx + 5, barY + 16);
  });

  // ── OPEX / CAPEX boxes (y=97) ────────────────────────────────

  sectionTitle(doc, 'Répartition OPEX / CAPEX', 97);

  const boxW = 87;
  const boxH = 65;
  budgetBox(doc, 14,       107, boxW, boxH, 'OPEX — Dépenses d\'exploitation',
    opexTotals.depense, opexTotals.engagement, opexTotals.budget, 'blue');
  budgetBox(doc, 14 + boxW + 4, 107, boxW, boxH, 'CAPEX — Investissements',
    capexTotals.depense, capexTotals.engagement, capexTotals.budget, 'green');

  // ── Atterrissage scenarios (y=176) ───────────────────────────

  sectionTitle(doc, 'Atterrissage budgétaire — Scénarios', 176);

  const SCENARIOS = [
    { name: 'Projection linéaire', mult: 1.00 },
    { name: 'Optimiste (-5 %)',    mult: 0.95 },
    { name: 'Central (+10 %)',     mult: 1.10 },
    { name: 'Pessimiste (+25 %)',  mult: 1.25 },
  ];

  const attCols = [
    { label: 'Scénario',     w: 48 },
    { label: 'OPEX',         w: 32, align: 'right' },
    { label: 'CAPEX',        w: 32, align: 'right' },
    { label: 'Total',        w: 36, align: 'right' },
    { label: 'Écart EPRD',   w: 34, align: 'right' },
  ];

  tableHeader(doc, 14, 184, attCols);
  SCENARIOS.forEach((s, i) => {
    const aOpex  = atterrissageOpex  * s.mult;
    const aCapex = atterrissageCapex * s.mult;
    const aTotal = aOpex + aCapex;
    const ecart  = aTotal - totalBudget;
    const isOver = ecart > 0;
    const ecartColor = isOver ? C.red : C.green;
    tableRow(doc, 14, 191 + i * 6.5, attCols, [
      s.name,
      fmtEur(aOpex),
      fmtEur(aCapex),
      fmtEur(aTotal),
      `${isOver ? '+' : ''}${fmtEur(ecart)}`,
    ], i % 2 === 1, [C.dark, C.mid, C.mid, C.dark, ecartColor]);
  });

  // ── Alertes (y=220) ──────────────────────────────────────────

  sectionTitle(doc, 'Lignes à surveiller (taux > 75 %)', 222);

  const alertItems = riskItems.filter(r => r.taux >= 0).slice(0, 6);

  if (alertItems.length === 0) {
    textColor(doc, C.mid);
    italic(doc, 8);
    doc.text('Aucune ligne en alerte — tous les taux sont dans les normes.', 14, 234);
  } else {
    const alCols = [
      { label: 'Fournisseur / Projet', w: 60 },
      { label: 'Type',                  w: 16 },
      { label: 'Budget',                w: 30, align: 'right' },
      { label: 'Consommé',              w: 30, align: 'right' },
      { label: 'Taux',                  w: 20, align: 'right' },
      { label: 'Statut',                w: 26 },
    ];
    tableHeader(doc, 14, 230, alCols);
    alertItems.forEach((item, i) => {
      const sc = statusColor(item.taux);
      tableRow(doc, 14, 237 + i * 6.5, alCols, [
        item.name,
        item.type,
        fmtEur(item.budget),
        fmtEur(item.consomme),
        fmtPct(item.taux),
        statusLabel(item.taux),
      ], i % 2 === 1, [C.dark, C.mid, C.mid, C.dark, sc, sc]);
    });
  }

  drawFooter(doc, 1, 2);

  // ════════════════════════════════════════════════════════════════
  // PAGE 2 — DÉTAIL PAR COMPTE COMPTABLE
  // ════════════════════════════════════════════════════════════════

  doc.addPage();
  drawHeader(doc, moisLabel, annee, nbMoisRealises);

  // Sous-titre page 2
  fill(doc, C.indigoPale);
  rect(doc, 14, 31, 182, 7);
  textColor(doc, C.indigo);
  bold(doc, 9);
  doc.text('DÉTAIL PAR COMPTE COMPTABLE OPEX', 105, 36, { align: 'center' });

  sectionTitle(doc, 'Situation par compte EPRD au ' + moisLabel + ' ' + annee, 42);

  // Agréger par compte
  const eprdMap = {};
  eprd.forEach(e => {
    eprdMap[e.compteOrdonnateur] = {
      libelle: e.libelleCompte || '',
      budget: e.budgetEPRD || 0,
    };
  });

  const compteAgg = {};
  suppliers.forEach(s => {
    const c = s.compteOrdonnateur || 'INCONNU';
    if (!compteAgg[c]) {
      compteAgg[c] = {
        compte: c,
        libelle: eprdMap[c]?.libelle || s.category || c,
        budget: eprdMap[c]?.budget || 0,
        depense: 0,
        engagement: 0,
      };
    }
    compteAgg[c].depense    += s.depenseActuelle || 0;
    compteAgg[c].engagement += s.engagement || 0;
  });

  // Ajouter comptes EPRD sans fournisseurs
  eprd.forEach(e => {
    const c = e.compteOrdonnateur;
    if (!compteAgg[c]) {
      compteAgg[c] = {
        compte: c,
        libelle: e.libelleCompte || '',
        budget: e.budgetEPRD || 0,
        depense: 0,
        engagement: 0,
      };
    }
  });

  const compteRows = Object.values(compteAgg)
    .map(r => ({
      ...r,
      charge:   r.depense + r.engagement,
      taux:     r.budget > 0 ? (r.depense + r.engagement) / r.budget * 100 : 0,
      dispo:    r.budget - r.depense - r.engagement,
      proj:     monthsElap > 0 ? (r.depense / monthsElap) * 12 + r.engagement : r.engagement,
    }))
    .sort((a, b) => b.taux - a.taux);

  const cptCols = [
    { label: 'Compte',          w: 22 },
    { label: 'Libellé',         w: 46 },
    { label: 'Budget EPRD',     w: 26, align: 'right' },
    { label: 'Dépensé',         w: 26, align: 'right' },
    { label: 'Engagé',          w: 23, align: 'right' },
    { label: 'Taux',            w: 14, align: 'right' },
    { label: 'Disponible',      w: 25, align: 'right' },
  ];

  tableHeader(doc, 14, 51, cptCols);

  const ROW_H = 7.5; // hauteur de ligne plus aérée
  let yRow = 59;
  compteRows.forEach((r, i) => {
    if (yRow > 268) return;
    const sc      = r.budget === 0 ? C.muted : statusColor(r.taux);
    const libTrunc = r.libelle.length > 30 ? r.libelle.slice(0, 28) + '..' : r.libelle;
    tableRow(doc, 14, yRow, cptCols, [
      r.compte,
      libTrunc,
      r.budget > 0 ? fmtEur(r.budget)   : '-',
      fmtEur(r.depense),
      fmtEur(r.engagement),
      r.budget > 0 ? fmtPct(r.taux) : '-',
      r.budget > 0 ? fmtEur(r.dispo) : '-',
    ], i % 2 === 1, [C.dark, C.mid, C.mid, C.blue, C.orange, sc, r.dispo < 0 ? C.red : C.green]);
    yRow += ROW_H;
  });

  // Ligne total OPEX
  const totDepense = compteRows.reduce((s, r) => s + r.depense, 0);
  const totEngage  = compteRows.reduce((s, r) => s + r.engagement, 0);
  const totBudget  = compteRows.reduce((s, r) => s + r.budget, 0);
  const totTaux    = totBudget > 0 ? (totDepense + totEngage) / totBudget * 100 : 0;
  const totDispo   = totBudget - totDepense - totEngage;

  tableTotalRow(doc, 14, yRow + 1, cptCols, [
    'TOTAL OPEX',
    '',
    fmtEur(totBudget),
    fmtEur(totDepense),
    fmtEur(totEngage),
    fmtPct(totTaux),
    fmtEur(totDispo),
  ]);

  // Note méthodologique
  const noteY = yRow + 13;
  if (noteY < 278) {
    textColor(doc, C.muted);
    italic(doc, 6.5);
    doc.text(
      `Note : Dépensé = mandaté net. Engagé = Engagé Non Reçu (ENR). Taux = Charge engagée / Budget EPRD. ` +
      `Données issues du fichier de commandes importé — ${nbMoisRealises} mois réalisés.`,
      14, noteY, { maxWidth: 182 }
    );
  }

  drawFooter(doc, 2, 3);

  // ════════════════════════════════════════════════════════════════
  // PAGE 3 — DÉTAIL CAPEX PAR ENVELOPPE
  // ════════════════════════════════════════════════════════════════

  doc.addPage();
  drawHeader(doc, moisLabel, annee, nbMoisRealises);

  // Sous-titre page 3
  fill(doc, C.greenPale);
  rect(doc, 14, 31, 182, 7);
  textColor(doc, C.green);
  bold(doc, 9);
  doc.text('DÉTAIL CAPEX PAR ENVELOPPE', 105, 36, { align: 'center' });

  sectionTitle(doc, 'Investissements par enveloppe au ' + moisLabel + ' ' + annee, 42);

  // Agréger projets CAPEX par enveloppe
  const enveloppeAgg = {};
  projects.forEach(p => {
    const env     = p.enveloppe || p.category || 'Sans enveloppe';
    const budget  = p.budgetAlloue || p.budget || p.budgetTotal || 0;
    const depense = p.depenseActuelle || 0;
    const engage  = p.engagement || 0;
    if (!enveloppeAgg[env]) {
      enveloppeAgg[env] = { env, budget: 0, depense: 0, engagement: 0, nbProjets: 0 };
    }
    enveloppeAgg[env].budget     += budget;
    enveloppeAgg[env].depense    += depense;
    enveloppeAgg[env].engagement += engage;
    enveloppeAgg[env].nbProjets  += 1;
  });

  const envRows = Object.values(enveloppeAgg)
    .map(r => ({
      ...r,
      charge: r.depense + r.engagement,
      taux:   r.budget > 0 ? (r.depense + r.engagement) / r.budget * 100 : 0,
      dispo:  r.budget - r.depense - r.engagement,
    }))
    .sort((a, b) => b.charge - a.charge);

  const capCols = [
    { label: 'Enveloppe',    w: 52 },
    { label: 'Projets',      w: 18, align: 'right' },
    { label: 'Budget',       w: 26, align: 'right' },
    { label: 'Dépensé',      w: 26, align: 'right' },
    { label: 'Engagé',       w: 24, align: 'right' },
    { label: 'Taux',         w: 14, align: 'right' },
    { label: 'Disponible',   w: 22, align: 'right' },
  ];

  tableHeader(doc, 14, 51, capCols);

  let yCap = 59;
  envRows.forEach((r, i) => {
    if (yCap > 268) return;
    const sc      = r.budget === 0 ? C.muted : statusColor(r.taux);
    const envTrunc = r.env.length > 30 ? r.env.slice(0, 28) + '..' : r.env;
    tableRow(doc, 14, yCap, capCols, [
      envTrunc,
      String(r.nbProjets),
      r.budget > 0 ? fmtEur(r.budget)    : '-',
      fmtEur(r.depense),
      fmtEur(r.engagement),
      r.budget > 0 ? fmtPct(r.taux) : '-',
      r.budget > 0 ? fmtEur(r.dispo) : '-',
    ], i % 2 === 1, [C.dark, C.muted, C.mid, C.green, C.orange, sc, r.dispo < 0 ? C.red : C.green]);
    yCap += ROW_H;
  });

  // Total CAPEX
  const capTotBudget  = envRows.reduce((s, r) => s + r.budget, 0);
  const capTotDepense = envRows.reduce((s, r) => s + r.depense, 0);
  const capTotEngage  = envRows.reduce((s, r) => s + r.engagement, 0);
  const capTotTaux    = capTotBudget > 0 ? (capTotDepense + capTotEngage) / capTotBudget * 100 : 0;
  const capTotDispo   = capTotBudget - capTotDepense - capTotEngage;

  tableTotalRow(doc, 14, yCap + 1, capCols, [
    'TOTAL CAPEX',
    String(projects.length),
    fmtEur(capTotBudget),
    fmtEur(capTotDepense),
    fmtEur(capTotEngage),
    fmtPct(capTotTaux),
    fmtEur(capTotDispo),
  ]);

  // Note CAPEX
  const noteCapY = yCap + 13;
  if (noteCapY < 278) {
    textColor(doc, C.muted);
    italic(doc, 6.5);
    doc.text(
      `Note : Dépensé = mandaté net. Engagé = Engagé Non Reçu (ENR). Budget = budgetAlloue par projet. ` +
      `Taux = Charge engagée / Budget. ${projects.length} projet${projects.length > 1 ? 's' : ''} CAPEX au total.`,
      14, noteCapY, { maxWidth: 182 }
    );
  }

  drawFooter(doc, 3, 3);

  // ── Sauvegarde ────────────────────────────────────────────────────────────
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  doc.save(`Rapport_Executif_${ESTABLISHMENT.shortName}_${annee}_${date}.pdf`);
};
