/**
 * Moteur de reclassement analytique DSI
 * 4 niveaux : Référentiel fournisseurs → Règles multi-nature → Mots-clés → Mapping compte → Non classé
 *
 * Compatible avec les deux formats de données :
 *   - Format UI (créé dans l'app)  : famille / sousCategorie / nom / motsCles / priority / conditions (string)
 *   - Format script v6 (Excel)     : familleN1 / sousCatN2 / fournisseur / motCle / priorite / conditions (array)
 */

// ── Accesseurs normalisés ────────────────────────────────────────────────────

const getFamille   = (obj) => obj.familleN1   || obj.famille   || 'Non classé';
const getSousCat   = (obj) => obj.sousCatN2   || obj.sousCategorie || '';
const getPriorite  = (obj) => obj.priorite    ?? obj.priority   ?? 999;
/**
 * Supprime le préfixe numérique des noms fournisseurs (certains formats sources).
 * ex. "3127 2J PARTNERS" → "2J PARTNERS"  — sans effet si le nom n.a pas de préfixe.
 */
export const normaliseFournisseur = (nom) =>
  String(nom || '').replace(/^\d{3,6}\s+/, '').trim().toUpperCase();

const getNomFourn  = (obj) => {
  const raw = String(obj.fournisseur || obj.supplier || obj.nom || '');
  return raw.replace(/^\d{3,6}\s+/, '').trim().toLowerCase();
};

// ── getField : champ d'une ligne importée ───────────────────────────────────────

const getField = (ligne, champ) => {
  switch (champ.toUpperCase()) {
    case 'COMPTE':      return String(ligne.compteOrdonnateur || '');
    case 'FOURNISSEUR': return String(ligne.fournisseur || ligne.supplier || '');
    case 'DESIGNATION': return String(ligne.designation  || ligne.description || '');
    case 'FAMILLE':     return String(ligne.familleAnalytique || '');
    default:            return '';
  }
};

// ── Évaluation d'une condition atomique ─────────────────────────────────────

/** Condition objet : {champ, operateur, valeur} — format script v6 */
const evalConditionObj = (cond, ligne) => {
  if (!cond || cond.champ === 'DEFAUT') return true;
  const fieldVal = getField(ligne, cond.champ).toLowerCase();
  const val      = String(cond.valeur || '').toLowerCase().trim();
  if (cond.operateur === 'CONTIENT') return fieldVal.includes(val);
  if (cond.operateur === '=')        return fieldVal === val;
  return false;
};

/** Condition string : "CHAMP=valeur" ou "CHAMP CONTIENT=valeur" — format UI */
const evalConditionStr = (condition, ligne) => {
  const c = condition.trim();
  if (c === 'DEFAUT' || c === '') return true;

  const matchContient = c.match(/^([A-Z_]+)\s+CONTIENT=(.+)$/i);
  if (matchContient) {
    return getField(ligne, matchContient[1]).toLowerCase().includes(matchContient[2].trim().toLowerCase());
  }
  const matchEq = c.match(/^([A-Z_]+)=(.+)$/i);
  if (matchEq) {
    return getField(ligne, matchEq[1]).toLowerCase() === matchEq[2].trim().toLowerCase();
  }
  return false;
};

/**
 * Évalue les conditions d'une règle (supporte string pipe-séparée ET tableau d'objets).
 * Logique : OR — la règle s'applique si AU MOINS UNE condition est vraie.
 */
const matchesConditions = (ligne, conditions) => {
  if (!conditions) return false;
  if (typeof conditions === 'string') {
    return conditions.split('|').some(c => evalConditionStr(c.trim(), ligne));
  }
  if (Array.isArray(conditions)) {
    return conditions.some(c => evalConditionObj(c, ligne));
  }
  return false;
};

// ── Niveau 1 : Référentiel fournisseurs ─────────────────────────────────────

const applyReferentiel = (ligne, referentiel) => {
  const nom = String(ligne.fournisseur || ligne.supplier || '').toLowerCase().trim();
  if (!nom) return null;

  // Supporte f.nom (UI) et f.fournisseur (script v6)
  const entry = referentiel.find(f => getNomFourn(f) === nom);
  if (!entry) return null;

  return { famille: getFamille(entry), sousCategorie: getSousCat(entry), source: 'referentiel' };
};

// ── Niveau 2 : Règles contextuelles ─────────────────────────────────────────

const applyReglesMultiNature = (ligne, regles) => {
  const ligneFourn = String(ligne.fournisseur || ligne.supplier || '').toLowerCase().trim();

  const sorted = [...regles].sort((a, b) => getPriorite(a) - getPriorite(b));
  for (const regle of sorted) {
    // Si la règle précise un fournisseur, elle ne s'applique qu'à lui
    const regleFourn = getNomFourn(regle);
    if (regleFourn && ligneFourn && regleFourn !== ligneFourn) continue;

    if (matchesConditions(ligne, regle.conditions)) {
      return {
        famille:       getFamille(regle),
        sousCategorie: getSousCat(regle),
        source:        'regle_multinature',
        regleId:       regle.id,
      };
    }
  }
  return null;
};

// ── Niveau 3 : Mots-clés (désignation) ──────────────────────────────────────

// Texte recherché par les mots-clés (N3) : désignation de la commande + nom du
// fournisseur. Inclure le fournisseur permet aux règles générées automatiquement
// (« Auto: <fournisseur> », mot-clé = nom du fournisseur) de s'appliquer, le nom
// n'apparaissant pas dans la désignation des commandes.
const motsClesText = (ligne) =>
  [
    ligne.designation || ligne.description || '',
    ligne.fournisseur || ligne.supplier || '',
  ].filter(Boolean).join(' ').toLowerCase();

const applyReglesMosCles = (ligne, regles) => {
  const text = motsClesText(ligne);
  if (!text) return null;

  const sorted = [...regles].sort((a, b) => getPriorite(a) - getPriorite(b));
  for (const regle of sorted) {
    // Supporte motCle (string, script v6) et motsCles (array, UI)
    const mots = regle.motCle
      ? [String(regle.motCle)]
      : (Array.isArray(regle.motsCles) ? regle.motsCles : []);
    const motMatch = mots.find(m => text.includes(String(m).toLowerCase()));
    if (motMatch) {
      return {
        famille:       getFamille(regle),
        sousCategorie: getSousCat(regle),
        source:        'mots_cles',
        regleId:       regle.id,
        motCleMatch:   String(motMatch),
      };
    }
  }
  return null;
};

// ── Niveau 4 : Mapping compte ordonnateur (fallback) ────────────────────────

const applyMappingComptes = (ligne, mapping) => {
  const compte = String(ligne.compteOrdonnateur || ligne.compte || '');
  if (!compte) return null;

  const entry = mapping.find(m => m.compte === compte);
  if (!entry) return null;

  return {
    famille:       entry.familleDefaut || getFamille(entry),
    sousCategorie: entry.sousCatDefaut || getSousCat(entry),
    source:        'mapping_compte',
    compteMatch:   entry.compte,
    heterogene:    !!entry.heterogene,
  };
};

// ── API publique ─────────────────────────────────────────────────────────────

/**
 * Classe une seule ligne via le pipeline à 4 niveaux.
 * @param {object} ligne   - { fournisseur|supplier, designation|description, compteOrdonnateur }
 * @param {object} moteur  - { referentielFournisseurs, reglesMultiNature, reglesMosCles, mappingComptes }
 */
export const reclasser = (ligne, moteur) => {
  const {
    referentielFournisseurs = [],
    reglesMultiNature       = [],
    reglesMosCles           = [],
    mappingComptes          = [],
  } = moteur;

  return (
    applyReferentiel(ligne, referentielFournisseurs)      ||
    applyReglesMultiNature(ligne, reglesMultiNature)      ||
    applyReglesMosCles(ligne, reglesMosCles)              ||
    applyMappingComptes(ligne, mappingComptes)             ||
    { famille: 'Non classé', sousCategorie: '', source: 'non_classe' }
  );
};

/**
 * Une ligne (commande enrichie) correspond-elle à UNE règle d'un niveau donné ?
 * Sert à prévisualiser les commandes concernées par une règle, niveau par niveau.
 * @param {object} ligne - commande enrichie { fournisseur, designation|description, compteOrdonnateur }
 * @param {'referentiel'|'multinature'|'moscles'|'mapping'} level
 * @param {object} rule  - l'entrée/règle du niveau concerné
 */
export const lineMatchesRule = (ligne, level, rule) => {
  switch (level) {
    case 'referentiel': {
      const nom = getNomFourn(ligne);
      return !!nom && getNomFourn(rule) === nom;
    }
    case 'multinature': {
      const ligneFourn = String(ligne.fournisseur || ligne.supplier || '').toLowerCase().trim();
      const regleFourn = getNomFourn(rule);
      if (regleFourn && ligneFourn && regleFourn !== ligneFourn) return false;
      return matchesConditions(ligne, rule.conditions);
    }
    case 'moscles': {
      const text = motsClesText(ligne);
      if (!text) return false;
      const mots = rule.motCle
        ? [String(rule.motCle)]
        : (Array.isArray(rule.motsCles) ? rule.motsCles : []);
      return mots.some(m => m && text.includes(String(m).toLowerCase()));
    }
    case 'mapping': {
      const c = String(ligne.compteOrdonnateur || ligne.compte || '').split('|')[0].trim().toUpperCase();
      const ruleC = String(rule.compte || '').split('|')[0].trim().toUpperCase();
      return !!c && !!ruleC && c === ruleC;
    }
    default:
      return false;
  }
};

/**
 * Classe un tableau de lignes en masse.
 */
export const reclasserToutes = (lignes, moteur) =>
  lignes.map(ligne => {
    const result = reclasser(ligne, moteur);
    return {
      ...ligne,
      familleAnalytique:  result.famille,
      sousCategorie:      result.sousCategorie,
      sourceReclassement: result.source,
    };
  });

/**
 * Construit, par parent (fournisseur/projet), une désignation agrégée à partir
 * des désignations de ses commandes.
 *
 * Les lignes fournisseur/projet n'ont pas de désignation propre : sans cet
 * enrichissement, les règles de niveau 3 (mots-clés) et les conditions N2 sur
 * DESIGNATION ne peuvent jamais s'appliquer dans les vues qui reclassent au
 * niveau fournisseur (Vue analytique, Matrice, « Appliquer le reclassement »).
 * @returns {Object} { [parentId]: "désignation1 désignation2 …" }
 */
export const buildDesignationsByParent = (orders = []) => {
  const map = {};
  (orders || []).forEach(o => {
    if (!o || o.parentId == null) return;
    const txt = String(o.designation || o.description || '').trim();
    if (!txt) return;
    const key = String(o.parentId);
    map[key] = map[key] ? `${map[key]} ${txt}` : txt;
  });
  return map;
};

/**
 * Reclasse des lignes fournisseur/projet en les enrichissant au préalable de la
 * désignation agrégée de leurs commandes (cf. buildDesignationsByParent), afin
 * que les règles basées sur la désignation s'appliquent comme dans le simulateur.
 * Une `designation` déjà présente sur la ligne est préservée.
 */
export const reclasserAvecCommandes = (lignes, orders, moteur) => {
  const desByParent = buildDesignationsByParent(orders);
  return reclasserToutes(
    (lignes || []).map(l => ({
      ...l,
      designation: l.designation || desByParent[String(l.id)] || '',
    })),
    moteur
  );
};
