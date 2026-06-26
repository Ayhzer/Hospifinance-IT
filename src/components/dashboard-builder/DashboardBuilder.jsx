import { useState, useCallback, useMemo } from 'react';
import { Plus, Trash2, Pencil } from 'lucide-react';
import { useSettings } from '../../contexts/SettingsContext';
import { WidgetRenderer } from './WidgetRenderer';
import { DashboardEmptyState } from './DashboardEmptyState';
import { AddWidgetModal } from './AddWidgetModal';
import { CreateDashboardModal } from './CreateDashboardModal';
import { ConfirmDialog } from '../common/ConfirmDialog';

export const DashboardBuilder = ({ dashboardId, dashboardData, onDeleteDashboard }) => {
  const { settings, updateDashboard, removeDashboard } = useSettings();
  const [showAddWidget, setShowAddWidget] = useState(false);
  const [editingWidget, setEditingWidget] = useState(null);
  const [showRename, setShowRename] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const dashboard = (settings.customDashboards || []).find(d => d.id === dashboardId);
  // useMemo : référence stable + déclaré avant les hooks pour respecter les rules-of-hooks
  const widgets = useMemo(() => dashboard?.widgets || [], [dashboard]);

  const saveWidget = useCallback((widget) => {
    const existing = widgets.find(w => w.id === widget.id);
    const updatedWidgets = existing
      ? widgets.map(w => w.id === widget.id ? widget : w)
      : [...widgets, widget];
    updateDashboard(dashboardId, { widgets: updatedWidgets });
    setEditingWidget(null);
  }, [widgets, dashboardId, updateDashboard]);

  const deleteWidget = useCallback((widgetId) => {
    updateDashboard(dashboardId, { widgets: widgets.filter(w => w.id !== widgetId) });
  }, [widgets, dashboardId, updateDashboard]);

  const moveWidget = useCallback((fromIdx, toIdx) => {
    const arr = [...widgets];
    const [moved] = arr.splice(fromIdx, 1);
    arr.splice(toIdx, 0, moved);
    updateDashboard(dashboardId, { widgets: arr });
  }, [widgets, dashboardId, updateDashboard]);

  const handleRename = useCallback((name) => {
    updateDashboard(dashboardId, { name });
  }, [dashboardId, updateDashboard]);

  if (!dashboard) return null;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between bg-white rounded-lg shadow-md px-4 py-3">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-gray-800">{dashboard.name}</h2>
          <button onClick={() => setShowRename(true)} className="p-1 hover:bg-gray-100 rounded" title="Renommer">
            <Pencil size={14} className="text-gray-400" />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setEditingWidget(null); setShowAddWidget(true); }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus size={16} />
            Widget
          </button>
          <button
            onClick={() => setConfirmDelete(true)}
            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            title="Supprimer ce tableau de bord"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* Grid */}
      {widgets.length === 0 ? (
        <DashboardEmptyState onAdd={() => setShowAddWidget(true)} />
      ) : (
        <div className="grid grid-cols-4 gap-4">
          {widgets.map((widget, i) => (
            <WidgetRenderer
              key={widget.id}
              widget={widget}
              data={dashboardData}
              index={i}
              total={widgets.length}
              onEdit={(w) => { setEditingWidget(w); setShowAddWidget(true); }}
              onDelete={deleteWidget}
              onMove={moveWidget}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      <AddWidgetModal
        isOpen={showAddWidget}
        onClose={() => { setShowAddWidget(false); setEditingWidget(null); }}
        onSave={saveWidget}
        editingWidget={editingWidget}
      />

      <CreateDashboardModal
        isOpen={showRename}
        onClose={() => setShowRename(false)}
        onSave={handleRename}
        initialName={dashboard.name}
      />

      <ConfirmDialog
        isOpen={confirmDelete}
        title="Supprimer le tableau de bord"
        message={`Voulez-vous vraiment supprimer "${dashboard.name}" et tous ses widgets ?`}
        onConfirm={() => { removeDashboard(dashboardId); setConfirmDelete(false); onDeleteDashboard?.(); }}
        onClose={() => setConfirmDelete(false)}
      />
    </div>
  );
};
