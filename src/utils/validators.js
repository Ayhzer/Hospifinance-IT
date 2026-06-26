/**
 * Utilitaires de validation
 */

/**
 * Valide les données d'un fournisseur OPEX
 * @param {Object} data - Données du fournisseur
 * @returns {Object} Résultat de validation {isValid, errors}
 */
export const validateOpexData = (data) => {
  const errors = [];

  if (!data.supplier || data.supplier.trim() === '') {
    errors.push('Le nom du fournisseur est requis');
  }

  if (data.budgetAnnuel && parseFloat(data.budgetAnnuel) < 0) {
    errors.push('Le budget annuel ne peut pas être négatif');
  }

  if (data.depenseActuelle && parseFloat(data.depenseActuelle) < 0) {
    errors.push('La dépense actuelle ne peut pas être négative');
  }

  if (data.engagement && parseFloat(data.engagement) < 0) {
    errors.push('L\'engagement ne peut pas être négatif');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Valide les données d'un projet CAPEX
 * @param {Object} data - Données du projet
 * @returns {Object} Résultat de validation {isValid, errors}
 */
export const validateCapexData = (data) => {
  const errors = [];

  if (!data.project || data.project.trim() === '') {
    errors.push('Le nom du projet est requis');
  }

  if (data.budgetTotal && parseFloat(data.budgetTotal) < 0) {
    errors.push('Le budget total ne peut pas être négatif');
  }

  if (data.depense && parseFloat(data.depense) < 0) {
    errors.push('La dépense ne peut pas être négative');
  }

  if (data.engagement && parseFloat(data.engagement) < 0) {
    errors.push('L\'engagement ne peut pas être négatif');
  }

  if (data.dateDebut && data.dateFin) {
    const debut = new Date(data.dateDebut);
    const fin = new Date(data.dateFin);
    if (debut > fin) {
      errors.push('La date de début doit être antérieure à la date de fin');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Sanitize une chaîne de caractères
 * @param {string} str - Chaîne à nettoyer
 * @returns {string} Chaîne nettoyée
 */
export const sanitizeString = (str) => {
  if (!str) return '';
  return str.trim().replace(/[<>]/g, '');
};

/**
 * Valide les données d'une commande
 * @param {Object} data - Données de la commande
 * @returns {Object} Résultat de validation {isValid, errors}
 */
export const validateOrderData = (data) => {
  const errors = [];

  if (!data.parentId) {
    errors.push('Le fournisseur/projet parent est requis');
  }

  if (!data.description || data.description.trim() === '') {
    errors.push('La description est requise');
  }

  if (!data.montant || parseFloat(data.montant) <= 0) {
    errors.push('Le montant doit être supérieur à 0');
  }

  if (!data.status) {
    errors.push('Le statut est requis');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Parse un nombre de manière sécurisée
 * @param {string|number} value - Valeur à parser
 * @param {number} defaultValue - Valeur par défaut
 * @returns {number} Nombre parsé
 */
export const parseNumber = (value, defaultValue = 0) => {
  const parsed = parseFloat(value);
  return isNaN(parsed) ? defaultValue : parsed;
};
