/**
 * Composant ConsolidatedBudget - Vue budgétaire consolidée
 */

import { formatCurrency } from '../../utils/formatters';

export const ConsolidatedBudget = ({ consolidatedTotals }) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
      <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-3 sm:mb-4">Budget Consolidé DSI</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-3 sm:p-4 bg-blue-50 rounded-lg">
          <p className="text-xs sm:text-sm text-gray-600 mb-1">Budget Total</p>
          <p className="text-lg sm:text-xl md:text-2xl font-bold text-blue-700 break-words">
            {formatCurrency(consolidatedTotals.budget)}
          </p>
        </div>
        <div className="p-3 sm:p-4 bg-orange-50 rounded-lg">
          <p className="text-xs sm:text-sm text-gray-600 mb-1">Total Dépensé</p>
          <p className="text-lg sm:text-xl md:text-2xl font-bold text-orange-700 break-words">
            {formatCurrency(consolidatedTotals.depense)}
          </p>
        </div>
        <div className="p-3 sm:p-4 bg-yellow-50 rounded-lg">
          <p className="text-xs sm:text-sm text-gray-600 mb-1">Total Engagé</p>
          <p className="text-lg sm:text-xl md:text-2xl font-bold text-yellow-700 break-words">
            {formatCurrency(consolidatedTotals.engagement)}
          </p>
        </div>
        <div className="p-3 sm:p-4 bg-green-50 rounded-lg">
          <p className="text-xs sm:text-sm text-gray-600 mb-1">Total Disponible</p>
          <p className="text-lg sm:text-xl md:text-2xl font-bold text-green-700 break-words">
            {formatCurrency(consolidatedTotals.disponible)}
          </p>
        </div>
      </div>
    </div>
  );
};
