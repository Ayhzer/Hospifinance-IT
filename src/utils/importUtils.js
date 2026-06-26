/**
 * Utilitaires d'import de données avec validation
 */

import { validateOpexData, validateCapexData, validateOrderData, parseNumber, sanitizeString } from './validators';
import { PROJECT_STATUS } from '../constants/budgetConstants';
import { ORDER_STATUS } from '../constants/orderConstants';

/**
 * Parse un fichier CSV en tableau d'objets
 * @param {string} csvText - Contenu du fichier CSV
 * @returns {Array} Tableau d'objets
 */
const parseCSV = (csvText) => {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) {
    throw new Error('Le fichier CSV doit contenir au moins une ligne d\'en-tête et une ligne de données');
  }

  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  const data = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue; // Ignorer les lignes vides

    // Parser la ligne en gérant les guillemets
    const values = [];
    let currentValue = '';
    let insideQuotes = false;

    for (let j = 0; j < line.length; j++) {
      const char = line[j];

      if (char === '"') {
        if (insideQuotes && line[j + 1] === '"') {
          currentValue += '"';
          j++; // Skip next quote
        } else {
          insideQuotes = !insideQuotes;
        }
      } else if (char === ',' && !insideQuotes) {
        values.push(currentValue.trim());
        currentValue = '';
      } else {
        currentValue += char;
      }
    }
    values.push(currentValue.trim()); // Dernier élément

    const row = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    data.push(row);
  }

  return data;
};

/**
 * Importe des données OPEX depuis un fichier CSV
 * @param {File} file - Fichier CSV
 * @param {Array} existingSuppliers - Fournisseurs existants
 * @returns {Promise<{success: boolean, data?: Array, errors?: Array}>}
 */
export const importOpexFromCSV = async (file, existingSuppliers = []) => {
  try {
    const text = await file.text();
    const rawData = parseCSV(text);

    const errors = [];
    const validData = [];
    const existingNames = existingSuppliers.map(s => s.supplier.toLowerCase());

    rawData.forEach((row, index) => {
      const lineNumber = index + 2; // +2 car ligne 1 = header

      // Vérifier les champs requis
      const requiredFields = ['supplier', 'category', 'budgetAnnuel'];
      const missingFields = requiredFields.filter(field => !row[field] || row[field].trim() === '');

      if (missingFields.length > 0) {
        errors.push(`Ligne ${lineNumber}: Champs requis manquants - ${missingFields.join(', ')}`);
        return;
      }

      // Construire l'objet fournisseur
      const supplierData = {
        supplier: sanitizeString(row.supplier),
        category: sanitizeString(row.category),
        budgetAnnuel: parseNumber(row.budgetAnnuel, 0),
        depenseActuelle: parseNumber(row.depenseActuelle, 0),
        engagement: parseNumber(row.engagement, 0),
        notes: sanitizeString(row.notes)
      };

      // Valider avec validateOpexData
      const validation = validateOpexData(supplierData);
      if (!validation.isValid) {
        errors.push(`Ligne ${lineNumber}: ${validation.errors.join(', ')}`);
        return;
      }

      // Vérifier les doublons
      if (existingNames.includes(supplierData.supplier.toLowerCase())) {
        errors.push(`Ligne ${lineNumber}: Le fournisseur "${supplierData.supplier}" existe déjà`);
        return;
      }

      // Vérifier cohérence des montants
      if (supplierData.depenseActuelle + supplierData.engagement > supplierData.budgetAnnuel) {
        errors.push(`Ligne ${lineNumber}: Dépense (${supplierData.depenseActuelle}) + Engagement (${supplierData.engagement}) dépasse le budget (${supplierData.budgetAnnuel})`);
        return;
      }

      // Ajouter aux données valides
      validData.push({
        id: Date.now() + Math.random() + index,
        ...supplierData
      });

      // Ajouter aux noms existants pour éviter doublons dans le même fichier
      existingNames.push(supplierData.supplier.toLowerCase());
    });

    if (errors.length > 0) {
      return {
        success: false,
        errors,
        partialData: validData.length > 0 ? validData : undefined
      };
    }

    return {
      success: true,
      data: validData,
      message: `${validData.length} fournisseur(s) importé(s) avec succès`
    };

  } catch (error) {
    return {
      success: false,
      errors: [`Erreur lors de la lecture du fichier: ${error.message}`]
    };
  }
};

/**
 * Importe des données CAPEX depuis un fichier CSV
 * @param {File} file - Fichier CSV
 * @param {Array} existingProjects - Projets existants
 * @returns {Promise<{success: boolean, data?: Array, errors?: Array}>}
 */
export const importCapexFromCSV = async (file, existingProjects = []) => {
  try {
    const text = await file.text();
    const rawData = parseCSV(text);

    const errors = [];
    const validData = [];
    const existingNames = existingProjects.map(p => p.project.toLowerCase());
    const validStatuses = Object.values(PROJECT_STATUS);

    rawData.forEach((row, index) => {
      const lineNumber = index + 2;

      // Vérifier les champs requis
      const requiredFields = ['project', 'budgetTotal'];
      const missingFields = requiredFields.filter(field => !row[field] || row[field].trim() === '');

      if (missingFields.length > 0) {
        errors.push(`Ligne ${lineNumber}: Champs requis manquants - ${missingFields.join(', ')}`);
        return;
      }

      // Construire l'objet projet
      const projectData = {
        enveloppe: sanitizeString(row.enveloppe),
        project: sanitizeString(row.project),
        budgetTotal: parseNumber(row.budgetTotal, 0),
        depense: parseNumber(row.depense, 0),
        engagement: parseNumber(row.engagement, 0),
        dateDebut: row.dateDebut || '',
        dateFin: row.dateFin || '',
        status: row.status || 'Planifié',
        notes: sanitizeString(row.notes)
      };

      // Vérifier le statut
      if (!validStatuses.includes(projectData.status)) {
        errors.push(`Ligne ${lineNumber}: Statut invalide "${projectData.status}". Valeurs acceptées: ${validStatuses.join(', ')}`);
        return;
      }

      // Valider avec validateCapexData
      const validation = validateCapexData(projectData);
      if (!validation.isValid) {
        errors.push(`Ligne ${lineNumber}: ${validation.errors.join(', ')}`);
        return;
      }

      // Vérifier les doublons
      if (existingNames.includes(projectData.project.toLowerCase())) {
        errors.push(`Ligne ${lineNumber}: Le projet "${projectData.project}" existe déjà`);
        return;
      }

      // Vérifier cohérence des montants
      if (projectData.depense + projectData.engagement > projectData.budgetTotal) {
        errors.push(`Ligne ${lineNumber}: Dépense (${projectData.depense}) + Engagement (${projectData.engagement}) dépasse le budget (${projectData.budgetTotal})`);
        return;
      }

      // Vérifier cohérence des dates
      if (projectData.dateDebut && projectData.dateFin) {
        const debut = new Date(projectData.dateDebut);
        const fin = new Date(projectData.dateFin);
        if (debut > fin) {
          errors.push(`Ligne ${lineNumber}: La date de début (${projectData.dateDebut}) est postérieure à la date de fin (${projectData.dateFin})`);
          return;
        }
      }

      // Ajouter aux données valides
      validData.push({
        id: Date.now() + Math.random() + index,
        ...projectData
      });

      existingNames.push(projectData.project.toLowerCase());
    });

    if (errors.length > 0) {
      return {
        success: false,
        errors,
        partialData: validData.length > 0 ? validData : undefined
      };
    }

    return {
      success: true,
      data: validData,
      message: `${validData.length} projet(s) importé(s) avec succès`
    };

  } catch (error) {
    return {
      success: false,
      errors: [`Erreur lors de la lecture du fichier: ${error.message}`]
    };
  }
};

/**
 * Importe des commandes OPEX depuis un fichier CSV
 * @param {File} file - Fichier CSV
 * @param {Array} existingSuppliers - Fournisseurs existants pour vérifier les liens
 * @returns {Promise<{success: boolean, data?: Array, errors?: Array}>}
 */
export const importOpexOrdersFromCSV = async (file, existingSuppliers = []) => {
  try {
    const text = await file.text();
    const rawData = parseCSV(text);

    const errors = [];
    const validData = [];
    const validStatuses = Object.values(ORDER_STATUS);
    const supplierMap = {};
    existingSuppliers.forEach(s => {
      supplierMap[s.supplier.toLowerCase()] = s.id;
    });

    rawData.forEach((row, index) => {
      const lineNumber = index + 2;

      // Vérifier les champs requis
      const requiredFields = ['supplierName', 'description', 'montant', 'status'];
      const missingFields = requiredFields.filter(field => !row[field] || row[field].trim() === '');

      if (missingFields.length > 0) {
        errors.push(`Ligne ${lineNumber}: Champs requis manquants - ${missingFields.join(', ')}`);
        return;
      }

      // Trouver le fournisseur parent
      const supplierName = sanitizeString(row.supplierName);
      const parentId = supplierMap[supplierName.toLowerCase()];

      if (!parentId) {
        errors.push(`Ligne ${lineNumber}: Fournisseur "${supplierName}" introuvable. Créez d'abord le fournisseur.`);
        return;
      }

      // Construire l'objet commande
      const orderData = {
        parentId,
        description: sanitizeString(row.description),
        montant: parseNumber(row.montant, 0),
        status: row.status.trim(),
        dateCommande: row.dateCommande || '',
        dateFacture: row.dateFacture || '',
        reference: sanitizeString(row.reference),
        notes: sanitizeString(row.notes)
      };

      // Vérifier le statut
      if (!validStatuses.includes(orderData.status)) {
        errors.push(`Ligne ${lineNumber}: Statut invalide "${orderData.status}". Valeurs acceptées: ${validStatuses.join(', ')}`);
        return;
      }

      // Valider avec validateOrderData
      const validation = validateOrderData(orderData);
      if (!validation.isValid) {
        errors.push(`Ligne ${lineNumber}: ${validation.errors.join(', ')}`);
        return;
      }

      // Ajouter aux données valides
      validData.push({
        id: `${Date.now()}-${Math.random()}-${index}`,
        ...orderData
      });
    });

    if (errors.length > 0) {
      return {
        success: false,
        errors,
        partialData: validData.length > 0 ? validData : undefined
      };
    }

    return {
      success: true,
      data: validData,
      message: `${validData.length} commande(s) OPEX importée(s) avec succès`
    };

  } catch (error) {
    return {
      success: false,
      errors: [`Erreur lors de la lecture du fichier: ${error.message}`]
    };
  }
};

/**
 * Importe des commandes CAPEX depuis un fichier CSV
 * @param {File} file - Fichier CSV
 * @param {Array} existingProjects - Projets existants pour vérifier les liens
 * @returns {Promise<{success: boolean, data?: Array, errors?: Array}>}
 */
export const importCapexOrdersFromCSV = async (file, existingProjects = []) => {
  try {
    const text = await file.text();
    const rawData = parseCSV(text);

    const errors = [];
    const validData = [];
    const validStatuses = Object.values(ORDER_STATUS);
    const projectMap = {};
    existingProjects.forEach(p => {
      projectMap[p.project.toLowerCase()] = p.id;
    });

    rawData.forEach((row, index) => {
      const lineNumber = index + 2;

      // Vérifier les champs requis
      const requiredFields = ['projectName', 'description', 'montant', 'status'];
      const missingFields = requiredFields.filter(field => !row[field] || row[field].trim() === '');

      if (missingFields.length > 0) {
        errors.push(`Ligne ${lineNumber}: Champs requis manquants - ${missingFields.join(', ')}`);
        return;
      }

      // Trouver le projet parent
      const projectName = sanitizeString(row.projectName);
      const parentId = projectMap[projectName.toLowerCase()];

      if (!parentId) {
        errors.push(`Ligne ${lineNumber}: Projet "${projectName}" introuvable. Créez d'abord le projet.`);
        return;
      }

      // Construire l'objet commande
      const orderData = {
        parentId,
        description: sanitizeString(row.description),
        montant: parseNumber(row.montant, 0),
        status: row.status.trim(),
        dateCommande: row.dateCommande || '',
        dateFacture: row.dateFacture || '',
        reference: sanitizeString(row.reference),
        notes: sanitizeString(row.notes)
      };

      // Vérifier le statut
      if (!validStatuses.includes(orderData.status)) {
        errors.push(`Ligne ${lineNumber}: Statut invalide "${orderData.status}". Valeurs acceptées: ${validStatuses.join(', ')}`);
        return;
      }

      // Valider avec validateOrderData
      const validation = validateOrderData(orderData);
      if (!validation.isValid) {
        errors.push(`Ligne ${lineNumber}: ${validation.errors.join(', ')}`);
        return;
      }

      // Ajouter aux données valides
      validData.push({
        id: `${Date.now()}-${Math.random()}-${index}`,
        ...orderData
      });
    });

    if (errors.length > 0) {
      return {
        success: false,
        errors,
        partialData: validData.length > 0 ? validData : undefined
      };
    }

    return {
      success: true,
      data: validData,
      message: `${validData.length} commande(s) CAPEX importée(s) avec succès`
    };

  } catch (error) {
    return {
      success: false,
      errors: [`Erreur lors de la lecture du fichier: ${error.message}`]
    };
  }
};
