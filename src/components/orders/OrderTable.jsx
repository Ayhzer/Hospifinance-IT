/**
 * Composant OrderTable - Tableau des commandes (réutilisable OPEX/CAPEX)
 * Tri par colonne + redimensionnement persistant
 */

import { useState, useCallback, useMemo } from 'react';
import { Edit2, Trash2, Download, Plus, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';
import { exportToCSV, exportToJSON } from '../../utils/exportUtils';
import { usePermissions } from '../../contexts/PermissionsContext';
import { useColumnResize } from '../../hooks/useColumnResize';
import { Button } from '../common/Button';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { ORDER_STATUS_COLORS } from '../../constants/orderConstants';

// Colonnes avec largeurs par défaut
const DEFAULT_WIDTHS = {
  reference:    130,
  parent:       160,
  description:  220,
  montant:      120,
  status:       120,
  dateCommande: 110,
  notes:        140,
  actions:       80,
};

const SortIcon = ({ column, sort }) => {
  if (sort.column !== column) return <ChevronsUpDown size={12} className="opacity-30 flex-shrink-0" />;
  return sort.direction === 'asc'
    ? <ChevronUp size={12} className="text-blue-400 flex-shrink-0" />
    : <ChevronDown size={12} className="text-blue-400 flex-shrink-0" />;
};

export const OrderTable = ({ orders, parentItems, parentLabel, parentNameKey, type, onEdit, onDelete, onAdd }) => {
  const permissions = usePermissions();
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, order: null });
  const [sort, setSort] = useState({ column: 'dateCommande', direction: 'desc' });

  const { getHeaderProps, getCellProps, ResizeHandle } = useColumnResize(
    `orders_${type}`,
    DEFAULT_WIDTHS
  );

  const toggleSort = useCallback((column) => {
    setSort(prev =>
      prev.column === column
        ? { column, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
        : { column, direction: 'asc' }
    );
  }, []);

  const getParentName = useCallback((parentId) => {
    const parent = parentItems.find(p => String(p.id) === String(parentId));
    return parent ? (parent[parentNameKey] || '') : 'Inconnu';
  }, [parentItems, parentNameKey]);

  const sortedOrders = useMemo(() => {
    const getValue = (o) => {
      switch (sort.column) {
        case 'reference':    return (o.reference || '').toLowerCase();
        case 'parent':       return getParentName(o.parentId).toLowerCase();
        case 'description':  return (o.description || '').toLowerCase();
        case 'montant':      return o.montant || 0;
        case 'status':       return (o.status || '').toLowerCase();
        case 'dateCommande': return o.dateCommande || '';
        case 'notes':        return (o.notes || '').toLowerCase();
        default:             return '';
      }
    };
    return [...orders].sort((a, b) => {
      const va = getValue(a);
      const vb = getValue(b);
      const cmp = typeof va === 'number' ? va - vb : va.localeCompare(vb);
      return sort.direction === 'asc' ? cmp : -cmp;
    });
  }, [orders, sort, getParentName]);

  const handleDeleteClick = useCallback((order) => {
    setDeleteConfirm({ isOpen: true, order });
  }, []);

  const handleDeleteConfirm = useCallback(() => {
    if (deleteConfirm.order) onDelete(deleteConfirm.order.id);
    setDeleteConfirm({ isOpen: false, order: null });
  }, [deleteConfirm, onDelete]);

  const exportData = orders.map(order => ({
    reference:       order.reference,
    [parentLabel]:   getParentName(order.parentId),
    description:     order.description,
    montant:         order.montant,
    statut:          order.status,
    dateCommande:    order.dateCommande,
    dateFacture:     order.dateFacture,
    notes:           order.notes,
  }));

  const Th = ({ col, label, align = 'left', children }) => (
    <th
      {...getHeaderProps(col)}
      className={`relative px-3 py-2.5 text-${align} text-xs font-semibold text-gray-700 whitespace-nowrap select-none bg-gray-50 border-b`}
    >
      <button
        onClick={() => toggleSort(col)}
        className={`flex items-center gap-1 w-full text-${align} hover:text-blue-600 transition-colors`}
      >
        {align === 'right' ? (
          <><SortIcon column={col} sort={sort} />{children || label}</>
        ) : (
          <>{children || label}<SortIcon column={col} sort={sort} /></>
        )}
      </button>
      <ResizeHandle columnKey={col} />
    </th>
  );

  return (
    <div className="bg-white rounded-lg shadow-md p-3 sm:p-4 md:p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-6 gap-3">
        <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-800">
          Commandes {type === 'opex' ? 'OPEX' : 'CAPEX'}
        </h2>
        <div className="flex flex-wrap gap-2 sm:gap-3 w-full sm:w-auto">
          {permissions.can('export', 'orders') && (
            <>
              <Button variant="secondary" icon={<Download size={16} />} size="sm"
                onClick={() => exportToCSV(exportData, `commandes_${type}`)} className="flex-1 sm:flex-none">
                CSV
              </Button>
              <Button variant="secondary" icon={<Download size={16} />} size="sm"
                onClick={() => exportToJSON(exportData, `commandes_${type}`)} className="flex-1 sm:flex-none">
                JSON
              </Button>
            </>
          )}
          {permissions.can('add', 'orders') && (
            <Button variant="primary" icon={<Plus size={16} />} size="sm"
              onClick={onAdd} className="w-full sm:w-auto">
              <span className="hidden sm:inline">Nouvelle commande</span>
              <span className="sm:hidden">Nouveau</span>
            </Button>
          )}
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p className="text-lg mb-2">Aucune commande</p>
          <p className="text-sm">Cliquez sur &quot;Nouvelle commande&quot; pour en ajouter une</p>
        </div>
      ) : (
        <div className="overflow-x-auto -mx-3 sm:mx-0">
          <div className="inline-block min-w-full align-middle">
            <table className="w-full border-collapse" style={{ tableLayout: 'fixed' }}>
              <colgroup>
                {Object.keys(DEFAULT_WIDTHS).map(col => (
                  <col key={col} {...getHeaderProps(col)} />
                ))}
              </colgroup>
              <thead>
                <tr>
                  <Th col="reference"    label="Référence" />
                  <Th col="parent"       label={parentLabel} />
                  <Th col="description"  label="Description" />
                  <Th col="montant"      label="Montant" align="right" />
                  <Th col="status"       label="Statut" align="center" />
                  <Th col="dateCommande" label="Date cmd" align="center" />
                  <Th col="notes"        label="Notes" />
                  <th
                    {...getHeaderProps('actions')}
                    className="relative px-3 py-2.5 text-center text-xs font-semibold text-gray-700 bg-gray-50 border-b"
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedOrders.map((order) => (
                  <tr key={order.id} className="border-b hover:bg-gray-50">
                    <td {...getCellProps('reference')} className="px-3 py-2.5 text-xs font-medium text-gray-900 whitespace-nowrap overflow-hidden text-ellipsis">
                      {order.reference || '-'}
                    </td>
                    <td {...getCellProps('parent')} className="px-3 py-2.5 text-xs text-gray-700 overflow-hidden text-ellipsis whitespace-nowrap">
                      {getParentName(order.parentId)}
                    </td>
                    <td {...getCellProps('description')} className="px-3 py-2.5 text-xs text-gray-700 overflow-hidden text-ellipsis whitespace-nowrap" title={order.description}>
                      {order.description}
                    </td>
                    <td {...getCellProps('montant')} className="px-3 py-2.5 text-xs text-right text-gray-900 whitespace-nowrap font-medium overflow-hidden">
                      {formatCurrency(order.montant)}
                    </td>
                    <td {...getCellProps('status')} className="px-3 py-2.5 text-center overflow-hidden">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${ORDER_STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-800'}`}>
                        {order.status}
                      </span>
                    </td>
                    <td {...getCellProps('dateCommande')} className="px-3 py-2.5 text-xs text-center text-gray-700 whitespace-nowrap overflow-hidden">
                      {order.dateCommande || '-'}
                    </td>
                    <td {...getCellProps('notes')} className="px-3 py-2.5 text-xs text-gray-600 overflow-hidden text-ellipsis whitespace-nowrap" title={order.notes}>
                      {order.notes || '-'}
                    </td>
                    <td {...getCellProps('actions')} className="px-3 py-2.5 overflow-hidden">
                      <div className="flex gap-1 justify-center">
                        {permissions.can('edit', 'orders') && (
                          <button onClick={() => onEdit(order)}
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded touch-manipulation" title="Modifier">
                            <Edit2 size={14} />
                          </button>
                        )}
                        {permissions.can('delete', 'orders') && (
                          <button onClick={() => handleDeleteClick(order)}
                            className="p-1 text-red-600 hover:bg-red-50 rounded touch-manipulation" title="Supprimer">
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-100 font-semibold">
                <tr>
                  <td colSpan={3} className="px-3 py-2.5 text-xs text-gray-900">
                    TOTAL ({orders.length} commande{orders.length > 1 ? 's' : ''})
                  </td>
                  <td className="px-3 py-2.5 text-xs text-right text-gray-900 whitespace-nowrap">
                    {formatCurrency(orders.reduce((sum, o) => sum + (o.montant || 0), 0))}
                  </td>
                  <td colSpan={4} />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, order: null })}
        onConfirm={handleDeleteConfirm}
        title="Supprimer la commande"
        message={`Êtes-vous sûr de vouloir supprimer la commande "${deleteConfirm.order?.description}" ? Cette action est irréversible.`}
        confirmText="Supprimer"
        variant="danger"
      />
    </div>
  );
};
