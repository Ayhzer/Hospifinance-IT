/**
 * Composant CapexTable - Tableau des projets CAPEX
 */

import { useState, useCallback, useMemo } from 'react';
import { Edit2, Trash2, Download, Plus, FileUp, FileDown, RotateCcw, FilterX, GripVertical } from 'lucide-react';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { calculateAvailable, calculateUsageRate } from '../../utils/calculations';
import { computeOrderImpactByParent } from '../../utils/orderCalculations';
import { exportToCSV, exportToJSON, exportCapexTemplate } from '../../utils/exportUtils';
import { importCapexFromCSV } from '../../utils/importUtils';
import { usePermissions } from '../../contexts/PermissionsContext';
import { useSettings } from '../../contexts/SettingsContext';
import { useColumnResize } from '../../hooks/useColumnResize.jsx';
import { useTableControls, FilterInput } from '../../hooks/useTableControls.jsx';
import { useColumnOrder } from '../../hooks/useColumnOrder';
import { STATUS_COLORS, ENVELOPPE_COLORS } from '../../constants/budgetConstants';
import { Button } from '../common/Button';
import { ProgressBar } from '../common/ProgressBar';
import { ConfirmDialog } from '../common/ConfirmDialog';
import ImportModal from '../common/ImportModal';
import EnveloppesSummary from './EnveloppesSummary';

const CAPEX_DEFAULT_WIDTHS = {
  enveloppe: 110,
  projet: 200,
  statut: 100,
  budget: 120,
  depense: 110,
  engagement: 110,
  disponible: 120,
  utilisation: 110,
  periode: 100,
  notes: 150,
  actions: 80,
};

const CAPEX_COL_KEYS = ['enveloppe', 'projet', 'statut', 'budget', 'depense', 'engagement', 'disponible', 'utilisation', 'periode', 'notes'];

export const CapexTable = ({ projects, totals, orders = [], onEdit, onDelete, onAdd, onImport, calculateEnveloppeTotal, getUsedEnveloppes }) => {
  const permissions = usePermissions();
  const { settings, addCapexEnveloppe } = useSettings();
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, project: null });
  const [importModalOpen, setImportModalOpen] = useState(false);

  const { getHeaderProps, getCellProps, ResizeHandle, resetAll: resetWidths } = useColumnResize('capex', CAPEX_DEFAULT_WIDTHS);
  const { order: colOrder, resetOrder, getDragSourceProps, getDropProps, dropTarget } = useColumnOrder('capex', CAPEX_COL_KEYS);

  const resetAll = useCallback(() => {
    resetWidths();
    resetOrder();
  }, [resetWidths, resetOrder]);

  // Colonnes personnalisées pour CAPEX
  const customColumns = settings.customColumns?.capex || [];

  // Impact des commandes par projet
  const orderImpactByProject = computeOrderImpactByParent(orders);

  // Enrichir les données avec les calculs pour permettre le tri sur colonnes calculées
  const enrichedProjects = useMemo(() => {
    return projects.map(project => {
      const impact = orderImpactByProject[String(project.id)] || { engagement: 0, depense: 0 };
      const totalDepense = (Number(project.depense) || 0) + impact.depense;
      const totalEngagement = (Number(project.engagement) || 0) + impact.engagement;
      const disponible = calculateAvailable(project.budgetTotal, totalDepense, totalEngagement);
      const utilisation = calculateUsageRate(project.budgetTotal, totalDepense, totalEngagement);
      return { ...project, _totalDepense: totalDepense, _totalEngagement: totalEngagement, _disponible: disponible, _utilisation: utilisation };
    });
  }, [projects, orderImpactByProject]);

  // Tri et filtrage
  const { processedData, toggleSort, SortIcon, getFilterProps, hasActiveFilters, clearFilters } = useTableControls(enrichedProjects, {
    numericColumns: ['budgetTotal', 'depense', 'engagement', '_disponible', '_utilisation', '_totalDepense', '_totalEngagement'],
    dateColumns: ['dateDebut', 'dateFin'],
  });

  const handleDeleteClick = useCallback((project) => {
    setDeleteConfirm({ isOpen: true, project });
  }, []);

  const handleDeleteConfirm = useCallback(() => {
    if (deleteConfirm.project) {
      onDelete(deleteConfirm.project.id);
    }
    setDeleteConfirm({ isOpen: false, project: null });
  }, [deleteConfirm, onDelete]);

  const handleImport = useCallback(async (file) => {
    const result = await importCapexFromCSV(file, projects);
    if (result.success && result.data) {
      result.data.forEach(project => {
        onImport(project);
        // Mettre à jour le référentiel des enveloppes avec les nouvelles valeurs importées
        if (project.enveloppe) addCapexEnveloppe(project.enveloppe);
      });
    }
    return result;
  }, [projects, onImport, addCapexEnveloppe]);

  const thBase = "px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-semibold text-gray-700 whitespace-nowrap relative";
  const tdBase = "px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm whitespace-nowrap overflow-hidden text-ellipsis";

  // Grip drag handle
  const grip = (k) => (
    <span
      {...getDragSourceProps(k)}
      onClick={e => e.stopPropagation()}
      className="cursor-grab mr-1 inline-flex items-center text-gray-300 hover:text-gray-500"
      title="Glisser pour déplacer"
    >
      <GripVertical size={14} />
    </span>
  );

  // Blue drop indicator on the left edge of the target th
  const dropIndicator = (k) =>
    dropTarget === k ? <span className="absolute inset-y-1 left-0 w-0.5 bg-blue-500 rounded-full" /> : null;

  // Header cell per column key
  const renderTh = (k) => {
    switch (k) {
      case 'enveloppe': return (
        <th key={k} className={`${thBase} text-left cursor-pointer select-none`} {...getHeaderProps('enveloppe')} {...getDropProps(k)} onClick={() => toggleSort('enveloppe')}>
          {dropIndicator(k)}{grip(k)}Enveloppe<SortIcon columnKey="enveloppe" /><ResizeHandle columnKey="enveloppe" />
        </th>
      );
      case 'projet': return (
        <th key={k} className={`${thBase} text-left cursor-pointer select-none`} {...getHeaderProps('projet')} {...getDropProps(k)} onClick={() => toggleSort('project')}>
          {dropIndicator(k)}{grip(k)}Projet<SortIcon columnKey="project" /><ResizeHandle columnKey="projet" />
        </th>
      );
      case 'statut': return (
        <th key={k} className={`${thBase} text-center cursor-pointer select-none`} {...getHeaderProps('statut')} {...getDropProps(k)} onClick={() => toggleSort('status')}>
          {dropIndicator(k)}{grip(k)}Statut<SortIcon columnKey="status" /><ResizeHandle columnKey="statut" />
        </th>
      );
      case 'budget': return (
        <th key={k} className={`${thBase} text-right cursor-pointer select-none`} {...getHeaderProps('budget')} {...getDropProps(k)} onClick={() => toggleSort('budgetTotal')}>
          {dropIndicator(k)}{grip(k)}Budget total<SortIcon columnKey="budgetTotal" /><ResizeHandle columnKey="budget" />
        </th>
      );
      case 'depense': return (
        <th key={k} className={`${thBase} text-right cursor-pointer select-none`} {...getHeaderProps('depense')} {...getDropProps(k)} onClick={() => toggleSort('_totalDepense')}>
          {dropIndicator(k)}{grip(k)}Dépensé<SortIcon columnKey="_totalDepense" /><ResizeHandle columnKey="depense" />
        </th>
      );
      case 'engagement': return (
        <th key={k} className={`${thBase} text-right cursor-pointer select-none`} {...getHeaderProps('engagement')} {...getDropProps(k)} onClick={() => toggleSort('_totalEngagement')}>
          {dropIndicator(k)}{grip(k)}Engagé<SortIcon columnKey="_totalEngagement" /><ResizeHandle columnKey="engagement" />
        </th>
      );
      case 'disponible': return (
        <th key={k} className={`${thBase} text-right cursor-pointer select-none`} {...getHeaderProps('disponible')} {...getDropProps(k)} onClick={() => toggleSort('_disponible')}>
          {dropIndicator(k)}{grip(k)}Disponible<SortIcon columnKey="_disponible" /><ResizeHandle columnKey="disponible" />
        </th>
      );
      case 'utilisation': return (
        <th key={k} className={`${thBase} text-center cursor-pointer select-none`} {...getHeaderProps('utilisation')} {...getDropProps(k)} onClick={() => toggleSort('_utilisation')}>
          {dropIndicator(k)}{grip(k)}Utilisation<SortIcon columnKey="_utilisation" /><ResizeHandle columnKey="utilisation" />
        </th>
      );
      case 'periode': return (
        <th key={k} className={`${thBase} text-center cursor-pointer select-none`} {...getHeaderProps('periode')} {...getDropProps(k)} onClick={() => toggleSort('dateDebut')}>
          {dropIndicator(k)}{grip(k)}Période<SortIcon columnKey="dateDebut" /><ResizeHandle columnKey="periode" />
        </th>
      );
      case 'notes': return (
        <th key={k} className={`${thBase} text-left cursor-pointer select-none`} {...getHeaderProps('notes')} {...getDropProps(k)} onClick={() => toggleSort('notes')}>
          {dropIndicator(k)}{grip(k)}Notes<SortIcon columnKey="notes" /><ResizeHandle columnKey="notes" />
        </th>
      );
      default: return null;
    }
  };

  // Filter row cell per column key
  const renderFilterTh = (k) => {
    switch (k) {
      case 'enveloppe': return <th key={k} className="px-1 py-1" {...getCellProps('enveloppe')}><FilterInput {...getFilterProps('enveloppe', 'Enveloppe...')} /></th>;
      case 'projet':    return <th key={k} className="px-1 py-1" {...getCellProps('projet')}><FilterInput {...getFilterProps('project', 'Projet...')} /></th>;
      case 'statut':    return <th key={k} className="px-1 py-1" {...getCellProps('statut')}><FilterInput {...getFilterProps('status', 'Statut...')} /></th>;
      case 'notes':     return <th key={k} className="px-1 py-1" {...getCellProps('notes')}><FilterInput {...getFilterProps('notes', 'Notes...')} /></th>;
      case 'budget':    return <th key={k} className="px-1 py-1" {...getCellProps('budget')}></th>;
      case 'depense':   return <th key={k} className="px-1 py-1" {...getCellProps('depense')}></th>;
      case 'engagement':return <th key={k} className="px-1 py-1" {...getCellProps('engagement')}></th>;
      case 'disponible':return <th key={k} className="px-1 py-1" {...getCellProps('disponible')}></th>;
      case 'utilisation':return <th key={k} className="px-1 py-1" {...getCellProps('utilisation')}></th>;
      case 'periode':   return <th key={k} className="px-1 py-1" {...getCellProps('periode')}></th>;
      default: return null;
    }
  };

  // Body cell per column key
  const renderTd = (k, project) => {
    switch (k) {
      case 'enveloppe': return (
        <td key={k} className={tdBase} {...getCellProps('enveloppe')}>
          <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${ENVELOPPE_COLORS[project.enveloppe] || ENVELOPPE_COLORS['Autre']}`}>
            {project.enveloppe || 'Autre'}
          </span>
        </td>
      );
      case 'projet': return (
        <td key={k} className={`${tdBase} font-medium text-gray-900`} {...getCellProps('projet')}>{project.project}</td>
      );
      case 'statut': return (
        <td key={k} className={tdBase} {...getCellProps('statut')}>
          <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${STATUS_COLORS[project.status] || STATUS_COLORS.Planifié}`}>
            {project.status}
          </span>
        </td>
      );
      case 'budget': return (
        <td key={k} className={`${tdBase} text-right text-gray-900`} {...getCellProps('budget')}>{formatCurrency(project.budgetTotal)}</td>
      );
      case 'depense': return (
        <td key={k} className={`${tdBase} text-right text-orange-600`} {...getCellProps('depense')}>{formatCurrency(project._totalDepense)}</td>
      );
      case 'engagement': return (
        <td key={k} className={`${tdBase} text-right text-yellow-600`} {...getCellProps('engagement')}>{formatCurrency(project._totalEngagement)}</td>
      );
      case 'disponible': return (
        <td key={k} className={`${tdBase} text-right font-semibold ${project._disponible < 0 ? 'text-red-600' : 'text-green-600'}`} {...getCellProps('disponible')}>
          {formatCurrency(project._disponible)}
        </td>
      );
      case 'utilisation': return (
        <td key={k} className={tdBase} {...getCellProps('utilisation')}>
          <div className="flex flex-col items-center">
            <span className="text-xs sm:text-sm font-semibold mb-1">{project._utilisation.toFixed(1)}%</span>
            <ProgressBar value={project._utilisation} showLabel={false} size="sm" warningThreshold={settings.rules.warningThreshold} criticalThreshold={settings.rules.criticalThreshold} />
          </div>
        </td>
      );
      case 'periode': return (
        <td key={k} className={`${tdBase} text-center text-gray-700`} {...getCellProps('periode')}>
          {project.dateDebut && project.dateFin && (
            <div className="text-xs">
              <div>{formatDate(project.dateDebut)}</div>
              <div className="text-gray-500">→</div>
              <div>{formatDate(project.dateFin)}</div>
            </div>
          )}
        </td>
      );
      case 'notes': return (
        <td key={k} className={`${tdBase} text-gray-600`} {...getCellProps('notes')}>{project.notes}</td>
      );
      default: return null;
    }
  };

  // Footer cell per column key
  const renderFooterTd = (k) => {
    switch (k) {
      case 'enveloppe': return <td key={k} className={`${tdBase} text-gray-900`}>TOTAL</td>;
      case 'projet':    return <td key={k}></td>;
      case 'statut':    return <td key={k}></td>;
      case 'budget':    return <td key={k} className={`${tdBase} text-right text-gray-900`}>{formatCurrency(totals.budget)}</td>;
      case 'depense':   return <td key={k} className={`${tdBase} text-right text-orange-600`}>{formatCurrency(totals.depense)}</td>;
      case 'engagement':return <td key={k} className={`${tdBase} text-right text-yellow-600`}>{formatCurrency(totals.engagement)}</td>;
      case 'disponible':return <td key={k} className={`${tdBase} text-right ${totals.disponible < 0 ? 'text-red-600' : 'text-green-600'}`}>{formatCurrency(totals.disponible)}</td>;
      case 'utilisation':return <td key={k} className={`${tdBase} text-center`}>{totals.tauxUtilisation.toFixed(1)}%</td>;
      case 'periode':   return <td key={k}></td>;
      case 'notes':     return <td key={k}></td>;
      default: return null;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-3 sm:p-4 md:p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-6 gap-3">
        <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-800">Gestion CAPEX - Projets</h2>
        <div className="flex flex-wrap gap-2 sm:gap-3 w-full sm:w-auto">
          <Button
            variant="outline"
            size="sm"
            icon={<RotateCcw size={14} />}
            onClick={resetAll}
            className="flex-1 sm:flex-none"
            title="Réinitialiser la largeur et l'ordre des colonnes"
          >
            <span className="hidden sm:inline">Colonnes</span>
          </Button>
          {hasActiveFilters && (
            <Button
              variant="outline"
              size="sm"
              icon={<FilterX size={14} />}
              onClick={clearFilters}
              className="flex-1 sm:flex-none"
              title="Effacer tous les filtres"
            >
              <span className="hidden sm:inline">Effacer filtres</span>
            </Button>
          )}
          {permissions.canDownloadTemplate && (
            <Button
              variant="secondary"
              icon={<FileDown size={16} />}
              size="sm"
              onClick={exportCapexTemplate}
              className="flex-1 sm:flex-none"
              title="Télécharger un modèle CSV vierge"
            >
              <span className="hidden sm:inline">Modèle</span>
              <span className="sm:hidden">📄</span>
            </Button>
          )}
          {permissions.can('import', 'capex') && (
            <Button
              variant="secondary"
              icon={<FileUp size={16} />}
              size="sm"
              onClick={() => setImportModalOpen(true)}
              className="flex-1 sm:flex-none"
              title="Importer des projets depuis CSV"
            >
              <span className="hidden sm:inline">Importer</span>
              <span className="sm:hidden">📥</span>
            </Button>
          )}
          {permissions.can('export', 'capex') && (
            <>
              <Button
                variant="secondary"
                icon={<Download size={16} />}
                size="sm"
                onClick={() => exportToCSV(projects, 'capex_projets')}
                className="flex-1 sm:flex-none"
              >
                <span className="hidden sm:inline">CSV</span>
                <span className="sm:hidden">CSV</span>
              </Button>
              <Button
                variant="secondary"
                icon={<Download size={16} />}
                size="sm"
                onClick={() => exportToJSON(projects, 'capex_projets')}
                className="flex-1 sm:flex-none"
              >
                <span className="hidden sm:inline">JSON</span>
                <span className="sm:hidden">JSON</span>
              </Button>
            </>
          )}
          {permissions.can('add', 'capex') && (
            <Button variant="success" icon={<Plus size={16} />} size="sm" onClick={onAdd} className="w-full sm:w-auto">
              <span className="hidden sm:inline">Nouveau projet</span>
              <span className="sm:hidden">Nouveau</span>
            </Button>
          )}
        </div>
      </div>

      {/* Bandeau de synthèse */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-4 sm:mb-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="text-xs text-blue-600 font-medium">Budget total</div>
          <div className="text-base sm:text-lg font-bold text-blue-800">{formatCurrency(totals.budget)}</div>
        </div>
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
          <div className="text-xs text-orange-600 font-medium">Dépensé</div>
          <div className="text-base sm:text-lg font-bold text-orange-700">{formatCurrency(totals.depense)}</div>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <div className="text-xs text-yellow-600 font-medium">Engagé</div>
          <div className="text-base sm:text-lg font-bold text-yellow-700">{formatCurrency(totals.engagement)}</div>
        </div>
        <div className={`rounded-lg p-3 border ${totals.disponible < 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
          <div className={`text-xs font-medium ${totals.disponible < 0 ? 'text-red-600' : 'text-green-600'}`}>Disponible</div>
          <div className={`text-base sm:text-lg font-bold ${totals.disponible < 0 ? 'text-red-700' : 'text-green-700'}`}>{formatCurrency(totals.disponible)}</div>
        </div>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 col-span-2 sm:col-span-1">
          <div className="text-xs text-gray-600 font-medium mb-1">Utilisation</div>
          <div className="text-base sm:text-lg font-bold text-gray-800 mb-1">{totals.tauxUtilisation.toFixed(1)}%</div>
          <ProgressBar value={totals.tauxUtilisation} showLabel={false} size="sm" warningThreshold={settings.rules.warningThreshold} criticalThreshold={settings.rules.criticalThreshold} />
        </div>
      </div>

      {/* Synthèse par enveloppe */}
      {calculateEnveloppeTotal && getUsedEnveloppes && (
        <EnveloppesSummary
          projects={projects}
          calculateEnveloppeTotal={calculateEnveloppeTotal}
          getUsedEnveloppes={getUsedEnveloppes}
        />
      )}

      <div className="overflow-x-auto -mx-3 sm:mx-0">
        <div className="inline-block min-w-full align-middle">
          <div className="overflow-hidden">
            <table className="w-full" style={{ tableLayout: 'fixed' }}>
              <thead>
                <tr className="bg-gray-50 border-b">
                  {colOrder.map(k => renderTh(k))}
                  {customColumns.map(column => (
                    <th key={column.id} className={`${thBase} text-left cursor-pointer select-none`} {...getHeaderProps(column.id)} onClick={() => toggleSort(column.id)}>
                      {column.name}<SortIcon columnKey={column.id} />
                      <ResizeHandle columnKey={column.id} />
                    </th>
                  ))}
                  <th className={`${thBase} text-center`} {...getHeaderProps('actions')}>Actions</th>
                </tr>
                <tr className="bg-white border-b">
                  {colOrder.map(k => renderFilterTh(k))}
                  {customColumns.map(column => (
                    <th key={column.id} className="px-1 py-1" {...getCellProps(column.id)}><FilterInput {...getFilterProps(column.id, `${column.name}...`)} /></th>
                  ))}
                  <th className="px-1 py-1" {...getCellProps('actions')}></th>
                </tr>
              </thead>
              <tbody>
                {processedData.map((project) => (
                  <tr key={project.id} className="border-b hover:bg-gray-50">
                    {colOrder.map(k => renderTd(k, project))}
                    {customColumns.map(column => (
                      <td key={column.id} className={`${tdBase} text-gray-700`} {...getCellProps(column.id)}>
                        {project[column.id] || '-'}
                      </td>
                    ))}
                    <td className={tdBase} {...getCellProps('actions')}>
                      <div className="flex gap-1 sm:gap-2 justify-center">
                        {permissions.can('edit', 'capex') && (
                          <button onClick={() => onEdit(project)} className="p-1 text-blue-600 hover:bg-blue-50 rounded touch-manipulation" title="Modifier">
                            <Edit2 size={16} />
                          </button>
                        )}
                        {permissions.can('delete', 'capex') && (
                          <button onClick={() => handleDeleteClick(project)} className="p-1 text-red-600 hover:bg-red-50 rounded touch-manipulation" title="Supprimer">
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-100 font-semibold">
                <tr>
                  {colOrder.map(k => renderFooterTd(k))}
                  {customColumns.map(column => <td key={column.id}></td>)}
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, project: null })}
        onConfirm={handleDeleteConfirm}
        title="Supprimer le projet"
        message={`Êtes-vous sûr de vouloir supprimer le projet "${deleteConfirm.project?.project}" ? Cette action est irréversible.`}
        confirmText="Supprimer"
        variant="danger"
      />

      <ImportModal
        isOpen={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        onImport={handleImport}
        title="Importer des Projets CAPEX"
        type="capex"
      />
    </div>
  );
};
