/**
 * Constantes pour le suivi des commandes
 */

// Statuts des commandes
export const ORDER_STATUS = {
  PENDING: 'En attente',
  ORDERED: 'Commandée',
  DELIVERED: 'Livrée',
  INVOICED: 'Facturée',
  PAID: 'Payée',
  CANCELLED: 'Annulée'
};

// Couleurs des statuts de commande
export const ORDER_STATUS_COLORS = {
  [ORDER_STATUS.PENDING]: 'bg-gray-100 text-gray-800',
  [ORDER_STATUS.ORDERED]: 'bg-blue-100 text-blue-800',
  [ORDER_STATUS.DELIVERED]: 'bg-indigo-100 text-indigo-800',
  [ORDER_STATUS.INVOICED]: 'bg-orange-100 text-orange-800',
  [ORDER_STATUS.PAID]: 'bg-green-100 text-green-800',
  [ORDER_STATUS.CANCELLED]: 'bg-red-100 text-red-800'
};

// Mapping statut → impact budgétaire
// Commandée/Livrée = engagement, Facturée/Payée = dépense
export const ORDER_IMPACT = {
  [ORDER_STATUS.PENDING]: null,
  [ORDER_STATUS.ORDERED]: 'engagement',
  [ORDER_STATUS.DELIVERED]: 'engagement',
  [ORDER_STATUS.INVOICED]: 'depense',
  [ORDER_STATUS.PAID]: 'depense',
  [ORDER_STATUS.CANCELLED]: null
};

// Liste des statuts pour les selects
export const ORDER_STATUS_LIST = Object.values(ORDER_STATUS);
