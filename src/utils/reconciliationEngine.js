/**
 * ReconciliationEngine — Rapprochement Commandes / Comptabilité
 * Opère au niveau du compte comptable.
 * Les comptes des commandes ont un préfixe alphabétique (ex: "H61526100") ; le plan comptable source n.en a pas forcément.
 */

const SEUIL_CONCORDANCE = 2_000;
const SEUIL_ATTENTION   = 10_000;
const SEUIL_CRITIQUE    = 30_000;

// Normalise un compte de commandes en retirant le préfixe alphabétique éventuel
const normaliserCompte = (compte) => String(compte ?? '').replace(/^[A-Za-z]+/, '').trim();

// ── Rapprochement principal ───────────────────────────────────────────────────

export const computeReconciliation = (suppliers, sageRows, annee) => {
  // 1. Agréger les commandes par compte normalisé
  const magh2Map = new Map();
  for (const sup of suppliers) {
    if (!sup.compteOrdonnateur) continue;
    const compte = normaliserCompte(sup.compteOrdonnateur);
    if (!/^\d{8}$/.test(compte)) continue;
    if (!magh2Map.has(compte)) magh2Map.set(compte, { mandate: 0, enr: 0 });
    const e = magh2Map.get(compte);
    e.mandate += Number(sup.depenseActuelle ?? 0) || 0;
    e.enr     += Number(sup.engagement      ?? 0) || 0;
  }

  // 2. Agréger la comptabilité par type de pièce et par compte
  const rows = annee ? sageRows.filter(r => r.annee === annee) : sageRows;

  const sageFfMap  = new Map();
  const sageOdMap  = new Map();
  const sageNdfMap = new Map();
  const libellesMap = new Map();

  for (const row of rows) {
    if (!libellesMap.has(row.compte)) libellesMap.set(row.compte, row.libelle_compte);
    if      (row.type_piece === 'FF')  sageFfMap.set(row.compte,  (sageFfMap.get(row.compte)  || 0) + row.solde);
    else if (row.type_piece === 'OD')  sageOdMap.set(row.compte,  (sageOdMap.get(row.compte)  || 0) + row.solde);
    else if (row.type_piece === 'NDF') sageNdfMap.set(row.compte, (sageNdfMap.get(row.compte) || 0) + row.solde);
  }

  // 3. Union de tous les comptes présents dans l'une ou l'autre source
  const allComptes = new Set([...magh2Map.keys(), ...libellesMap.keys()]);

  return [...allComptes].sort().map((compte) => {
    const m    = magh2Map.get(compte) || { mandate: 0, enr: 0 };
    const s_ff  = sageFfMap.get(compte)  || 0;
    const s_od  = sageOdMap.get(compte)  || 0;
    const s_ndf = sageNdfMap.get(compte) || 0;

    // ENR comptable non disponible dans l'export standard → on utilise ENR commandes (pas de correction ENR)
    const s_enr = m.enr;

    const sage_charge  = s_ff + s_enr;
    const magh2_charge = m.mandate + m.enr;

    const ecart_mandate     = m.mandate - s_ff;
    const ecart_charge      = magh2_charge - sage_charge;
    const ecart_charge_pct  = sage_charge !== 0 ? ecart_charge / sage_charge : 0;

    const { categorie, severite, action } = classifierEcart(ecart_mandate, ecart_charge, s_od, s_ndf);

    return {
      compte,
      libelle:          libellesMap.get(compte) || compte,
      sage_ff:          s_ff,
      sage_od:          s_od,
      sage_ndf:         s_ndf,
      sage_enr:         s_enr,
      sage_charge,
      magh2_mandate:    m.mandate,
      magh2_enr:        m.enr,
      magh2_charge,
      ecart_mandate,
      ecart_charge,
      ecart_charge_pct,
      categorie,
      severite,
      action,
    };
  });
};

// ── Classification des écarts ─────────────────────────────────────────────────

const classifierEcart = (ecart_mandate, ecart_charge, sage_od) => {
  const abs = Math.abs(ecart_charge);

  if (abs <= SEUIL_CONCORDANCE) {
    return { categorie: 'CONCORDANT', severite: 'OK', action: 'Aucune action requise' };
  }
  if (ecart_mandate < -SEUIL_ATTENTION) {
    return {
      categorie: 'DEPENSE_HORS_BC',
      severite: abs >= SEUIL_CRITIQUE ? 'CRITIQUE' : 'ATTENTION',
      action: 'Créer les BCs rétroactifs dans le logiciel de commandes ou réformer le circuit de commande',
    };
  }
  if (ecart_mandate > SEUIL_ATTENTION) {
    return {
      categorie: 'COMMANDE_NON_LIQUIDE',
      severite: 'ATTENTION',
      action: 'Relancer la liquidation comptable des réceptions de commandes en attente de mandat',
    };
  }
  if (sage_od > SEUIL_ATTENTION) {
    return {
      categorie: 'OD_SIGNIFICATIVES',
      severite: 'ATTENTION',
      action: `OD significatives (${sage_od.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €) sans bon de commande — identifier les contrats sous-jacents`,
    };
  }
  return {
    categorie: 'ECART_MODERE',
    severite: 'ATTENTION',
    action: 'Surveiller — peut refléter un décalage de comptabilisation (5-15 jours)',
  };
};

// ── Rapport OD hors circuit ───────────────────────────────────────────────────

export const getRapportOdHorsCircuit = (sageRows, annee) => {
  const rows = annee ? sageRows.filter(r => r.annee === annee) : sageRows;

  const map = new Map();
  for (const row of rows.filter(r => r.est_hors_circuit)) {
    const key = `${row.compte}||${row.uf_code}||${row.type_piece}`;
    if (!map.has(key)) {
      map.set(key, {
        compte:         row.compte,
        libelle_compte: row.libelle_compte,
        uf_code:        row.uf_code,
        uf_libelle:     row.uf_libelle,
        type_piece:     row.type_piece,
        montant_total:  0,
        nb_ecritures:   0,
        date_premiere:  row.date_piece,
        date_derniere:  row.date_piece,
      });
    }
    const e = map.get(key);
    e.montant_total += row.solde;
    e.nb_ecritures++;
    if (row.date_piece && row.date_piece < e.date_premiere) e.date_premiere = row.date_piece;
    if (row.date_piece && row.date_piece > e.date_derniere) e.date_derniere = row.date_piece;
  }

  return [...map.values()]
    .map(e => ({ ...e, motif_probable: motifOd(e) }))
    .sort((a, b) => b.montant_total - a.montant_total);
};

const motifOd = (row) => {
  if (row.type_piece === 'NDF') return 'Note de frais — hors circuit BC par nature';
  if (row.nb_ecritures >= 4 && row.montant_total / row.nb_ecritures < 5000) {
    return 'Abonnement/contrat récurrent — créer BC annuel ouvert';
  }
  if (row.nb_ecritures <= 2 && row.montant_total > 10000) {
    return 'Dépense ponctuelle significative — créer BC rétroactif';
  }
  return 'OD diverse — à analyser';
};

// ── KPIs de gouvernance ───────────────────────────────────────────────────────

export const computeKPIs = (sageRows, ecarts, annee) => {
  const rows = annee ? sageRows.filter(r => r.annee === annee) : sageRows;

  const total_ff  = rows.filter(r => r.type_piece === 'FF').reduce((s, r) => s + r.solde, 0);
  const total_od  = rows.filter(r => r.type_piece === 'OD').reduce((s, r) => s + r.solde, 0);
  const total_ndf = rows.filter(r => r.type_piece === 'NDF').reduce((s, r) => s + r.solde, 0);
  const total_sage = total_ff + total_od + total_ndf;

  return {
    total_sage_realise:   total_sage,
    total_ff,
    total_od,
    total_ndf,
    pct_hors_circuit:     total_sage > 0 ? (total_od + total_ndf) / total_sage : 0,
    pct_ff:               total_sage > 0 ? total_ff / total_sage : 0,
    ecart_mandate_total:  ecarts.reduce((s, e) => s + e.ecart_mandate, 0),
    ecart_charge_total:   ecarts.reduce((s, e) => s + e.ecart_charge,  0),
    nb_comptes_critique:  ecarts.filter(e => e.severite === 'CRITIQUE').length,
    nb_comptes_attention: ecarts.filter(e => e.severite === 'ATTENTION').length,
    montant_od_sans_bc:   total_od,
  };
};

// ── Enrichissement de la base réalisée pour ProjectionEngine ─────────────────

export const enrichMagh2WithSage = (suppliers, sageRows, annee) => {
  const rows = annee ? sageRows.filter(r => r.annee === annee) : sageRows;

  const sageParCompte = new Map();
  for (const row of rows) {
    sageParCompte.set(row.compte, (sageParCompte.get(row.compte) || 0) + row.solde);
  }

  return suppliers.map(sup => {
    const compte = normaliserCompte(sup.compteOrdonnateur);
    const realise_sage = sageParCompte.get(compte) || 0;
    return {
      ...sup,
      realise_sage,
      // Priorité comptabilité si disponible, sinon commandes
      realise_ref: realise_sage > 0 ? realise_sage : (Number(sup.depenseActuelle) || 0),
    };
  });
};
