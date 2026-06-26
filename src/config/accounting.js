/**
 * Plan comptable & règles de classification — Hospifinance-IT
 * ---------------------------------------------------------------------------
 * Règles génériques permettant de classer une ligne importée en OPEX
 * (charges / fonctionnement) ou CAPEX (investissement), et de filtrer le
 * périmètre du service concerné.
 *
 * Les valeurs par défaut suivent la nomenclature budgétaire hospitalière
 * française (instruction M21) : les comptes de classe 6 sont des charges
 * (OPEX) et les comptes de classe 2 des immobilisations (CAPEX). Adaptez si
 * votre établissement utilise un autre plan comptable.
 */
export const ACCOUNTING = {
  /**
   * Préfixes de comptes classés en OPEX (charges de fonctionnement).
   * La comparaison est insensible à la casse et se fait sur le DÉBUT du code compte.
   */
  opexPrefixes: ['H6', 'I6'],

  /** Préfixes de comptes classés en CAPEX (immobilisations / investissement). */
  capexPrefixes: ['H2'],

  /**
   * Filtre du périmètre : ne conserver que les lignes dont le code gestionnaire
   * correspond. Mettez une chaîne vide '' pour ne PAS filtrer (tout importer).
   * Exemple : 'IT' pour ne garder que les commandes du service informatique.
   */
  managerFilter: 'IT',
};

/**
 * Classe un code compte en 'OPEX', 'CAPEX' ou null (hors périmètre comptable).
 */
export const getLineType = (compte) => {
  if (!compte) return null;
  const c = String(compte).toUpperCase().trim();
  if (ACCOUNTING.opexPrefixes.some((p) => c.startsWith(p.toUpperCase()))) return 'OPEX';
  if (ACCOUNTING.capexPrefixes.some((p) => c.startsWith(p.toUpperCase()))) return 'CAPEX';
  return null;
};
