/**
 * Utilitaires d'export de données
 */

import { generateFilename } from './formatters';

/**
 * Exporte des données en CSV
 * @param {Array} data - Données à exporter
 * @param {string} filename - Nom du fichier
 */
export const exportToCSV = (data, filename) => {
  if (!data || data.length === 0) {
    console.warn('Aucune donnée à exporter');
    return;
  }

  const headers = Object.keys(data[0]).filter(key => key !== 'id');
  const csvContent = [
    headers.join(','),
    ...data.map(row => headers.map(header => {
      const value = row[header];
      // Échapper les virgules et guillemets
      if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value ?? '';
    }).join(','))
  ].join('\n');

  downloadFile(csvContent, generateFilename(filename, 'csv'), 'text/csv;charset=utf-8;');
};

/**
 * Exporte des données en JSON
 * @param {Array} data - Données à exporter
 * @param {string} filename - Nom du fichier
 */
export const exportToJSON = (data, filename) => {
  if (!data || data.length === 0) {
    console.warn('Aucune donnée à exporter');
    return;
  }

  const jsonContent = JSON.stringify(data, null, 2);
  downloadFile(jsonContent, generateFilename(filename, 'json'), 'application/json');
};

/**
 * Télécharge un fichier
 * @param {string} content - Contenu du fichier
 * @param {string} filename - Nom du fichier
 * @param {string} mimeType - Type MIME
 */
const downloadFile = (content, filename, mimeType) => {
  const blob = new Blob([content], { type: mimeType });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
};

/**
 * Exporte un modèle vierge OPEX en CSV
 */
export const exportOpexTemplate = () => {
  const template = [
    {
      supplier: 'Exemple Fournisseur',
      category: 'Logiciels',
      budgetAnnuel: 100000,
      depenseActuelle: 0,
      engagement: 0,
      notes: 'Notes optionnelles'
    }
  ];

  const headers = ['supplier', 'category', 'budgetAnnuel', 'depenseActuelle', 'engagement', 'notes'];
  const csvContent = [
    headers.join(','),
    ...template.map(row => headers.map(header => {
      const value = row[header];
      if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value ?? '';
    }).join(','))
  ].join('\n');

  downloadFile(csvContent, 'modele_opex.csv', 'text/csv;charset=utf-8;');
};

/**
 * Exporte un modèle vierge CAPEX en CSV
 */
export const exportCapexTemplate = () => {
  const template = [
    {
      enveloppe: 'Infrastructure',
      project: 'Exemple Projet',
      budgetTotal: 500000,
      depense: 0,
      engagement: 0,
      dateDebut: '2026-01-01',
      dateFin: '2026-12-31',
      status: 'Planifié',
      notes: 'Notes optionnelles'
    }
  ];

  const headers = ['enveloppe', 'project', 'budgetTotal', 'depense', 'engagement', 'dateDebut', 'dateFin', 'status', 'notes'];
  const csvContent = [
    headers.join(','),
    ...template.map(row => headers.map(header => {
      const value = row[header];
      if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value ?? '';
    }).join(','))
  ].join('\n');

  downloadFile(csvContent, 'modele_capex.csv', 'text/csv;charset=utf-8;');
};

/**
 * Exporte un modèle vierge OPEX Orders en CSV
 */
export const exportOpexOrdersTemplate = () => {
  const template = [
    {
      supplierName: 'Nom du Fournisseur',
      description: 'Description de la commande',
      montant: 10000,
      status: 'En attente',
      dateCommande: '2026-02-09',
      dateFacture: '',
      reference: 'BC-2026-001',
      notes: 'Notes optionnelles'
    }
  ];

  const headers = ['supplierName', 'description', 'montant', 'status', 'dateCommande', 'dateFacture', 'reference', 'notes'];
  const csvContent = [
    headers.join(','),
    ...template.map(row => headers.map(header => {
      const value = row[header];
      if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value ?? '';
    }).join(','))
  ].join('\n');

  downloadFile(csvContent, 'modele_commandes_opex.csv', 'text/csv;charset=utf-8;');
};

/**
 * Exporte un modèle vierge CAPEX Orders en CSV
 */
export const exportCapexOrdersTemplate = () => {
  const template = [
    {
      projectName: 'Nom du Projet',
      description: 'Description de la commande',
      montant: 10000,
      status: 'En attente',
      dateCommande: '2026-02-09',
      dateFacture: '',
      reference: 'BC-2026-001',
      notes: 'Notes optionnelles'
    }
  ];

  const headers = ['projectName', 'description', 'montant', 'status', 'dateCommande', 'dateFacture', 'reference', 'notes'];
  const csvContent = [
    headers.join(','),
    ...template.map(row => headers.map(header => {
      const value = row[header];
      if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value ?? '';
    }).join(','))
  ].join('\n');

  downloadFile(csvContent, 'modele_commandes_capex.csv', 'text/csv;charset=utf-8;');
};
