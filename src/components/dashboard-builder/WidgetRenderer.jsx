import { useState } from 'react';
import { Pencil, Trash2, ChevronUp, ChevronDown } from 'lucide-react';
import { WIDGET_SIZES, DATA_SOURCES } from '../../constants/dashboardConstants';
import { KpiWidget } from './widgets/KpiWidget';
import { BarChartWidget } from './widgets/BarChartWidget';
import { PieChartWidget } from './widgets/PieChartWidget';
import { LineChartWidget } from './widgets/LineChartWidget';
import { TableWidget } from './widgets/TableWidget';

const WIDGET_COMPONENTS = {
  kpi: KpiWidget,
  bar: BarChartWidget,
  pie: PieChartWidget,
  line: LineChartWidget,
  table: TableWidget
};

const SIZE_HEIGHTS = {
  kpi: 'h-32',
  bar: 'h-64',
  pie: 'h-64',
  line: 'h-64',
  table: 'h-72'
};

export const WidgetRenderer = ({ widget, data, onEdit, onDelete, onMove, index, total }) => {
  const [hovered, setHovered] = useState(false);

  const Component = WIDGET_COMPONENTS[widget.type];
  if (!Component) return null;

  const size = WIDGET_SIZES[widget.size] || WIDGET_SIZES.md;
  const colSpan = `col-span-${size.cols}`;
  const sourceData = data?.[widget.dataSource];
  const sourceLabel = DATA_SOURCES[widget.dataSource]?.label || widget.dataSource;
  const heightClass = SIZE_HEIGHTS[widget.type] || 'h-64';

  return (
    <div
      className={`${colSpan} bg-white rounded-lg shadow border border-gray-200 overflow-hidden relative`}
      style={{ gridColumn: `span ${size.cols}` }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100">
        <div>
          <h3 className="text-sm font-semibold text-gray-800">{widget.title}</h3>
          <span className="text-xs text-gray-400">{sourceLabel}</span>
        </div>
        {/* Controls on hover */}
        {hovered && (
          <div className="flex items-center gap-1">
            {index > 0 && (
              <button onClick={() => onMove(index, index - 1)} className="p-1 hover:bg-gray-100 rounded" title="Monter">
                <ChevronUp size={14} className="text-gray-500" />
              </button>
            )}
            {index < total - 1 && (
              <button onClick={() => onMove(index, index + 1)} className="p-1 hover:bg-gray-100 rounded" title="Descendre">
                <ChevronDown size={14} className="text-gray-500" />
              </button>
            )}
            <button onClick={() => onEdit(widget)} className="p-1 hover:bg-blue-50 rounded" title="Modifier">
              <Pencil size={14} className="text-blue-500" />
            </button>
            <button onClick={() => onDelete(widget.id)} className="p-1 hover:bg-red-50 rounded" title="Supprimer">
              <Trash2 size={14} className="text-red-500" />
            </button>
          </div>
        )}
      </div>

      {/* Widget content */}
      <div className={`px-3 py-2 ${heightClass}`}>
        <Component data={sourceData} config={widget.config} />
      </div>
    </div>
  );
};
