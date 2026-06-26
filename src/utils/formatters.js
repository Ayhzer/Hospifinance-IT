/**
 * Utilitaires de formatage
 */

/**
 * Formate un nombre en devise EUR
 * @param {number} value - Montant à formater
 * @returns {string} Montant formaté en euros
 */
export const formatCurrency = (value) => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
};

/**
 * Formate une date en format français
 * @param {string|Date} date - Date à formater
 * @returns {string} Date formatée
 */
export const formatDate = (date) => {
  if (!date) return '';
  return new Date(date).toLocaleDateString('fr-FR');
};

/**
 * Formate un pourcentage
 * @param {number} value - Valeur à formater
 * @param {number} decimals - Nombre de décimales
 * @returns {string} Pourcentage formaté
 */
export const formatPercentage = (value, decimals = 1) => {
  return `${value.toFixed(decimals)}%`;
};

/**
 * Génère un nom de fichier avec timestamp
 * @param {string} prefix - Préfixe du fichier
 * @param {string} extension - Extension du fichier
 * @returns {string} Nom de fichier
 */
export const generateFilename = (prefix, extension) => {
  const date = new Date().toISOString().split('T')[0];
  return `${prefix}_${date}.${extension}`;
};
