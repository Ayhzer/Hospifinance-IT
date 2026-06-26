import { LayoutDashboard, Plus } from 'lucide-react';

export const DashboardEmptyState = ({ onAdd }) => (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    <LayoutDashboard size={48} className="text-gray-300 mb-4" />
    <h3 className="text-lg font-semibold text-gray-600 mb-2">Tableau de bord vide</h3>
    <p className="text-sm text-gray-400 mb-6 max-w-sm">
      Commencez par ajouter un widget pour construire votre tableau de bord personnalisé.
    </p>
    <button
      onClick={onAdd}
      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
    >
      <Plus size={18} />
      Ajouter un widget
    </button>
  </div>
);
