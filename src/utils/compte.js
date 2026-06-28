/**
 * Normalisation de la clé « compte ordonnateur » — Hospifinance-IT
 * ---------------------------------------------------------------------------
 * Les budgets EPRD (saisie manuelle) et les données réelles (import des
 * commandes) sont réconciliés par jointure sur le compte. Pour que les deux
 * côtés produisent EXACTEMENT la même clé, tout compte doit passer par cette
 * fonction — à l'écriture (import + éditeur EPRD) comme à la lecture (jointures).
 *
 *  - extrait le code avant un éventuel format « CODE|LIBELLÉ »
 *  - supprime les espaces de bord
 *  - met en MAJUSCULES (les codes comptables sont insensibles à la casse)
 */
export const normalizeCompte = (raw) => {
  if (raw === undefined || raw === null) return '';
  let s = String(raw).trim();
  if (s === '-') return '';
  if (s.includes('|')) s = s.split('|')[0].trim();
  return s.toUpperCase();
};

/** Indexe une liste EPRD par compte normalisé → entrée EPRD. */
export const buildEprdMap = (eprd = []) =>
  Object.fromEntries(eprd.map((e) => [normalizeCompte(e.compteOrdonnateur), e]));
