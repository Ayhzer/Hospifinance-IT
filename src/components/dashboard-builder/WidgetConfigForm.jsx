import { DATA_SOURCES, WIDGET_SIZES, DEFAULT_WIDGET_SIZE } from '../../constants/dashboardConstants';

export const WidgetConfigForm = ({ widgetType, dataSource, config, onChange }) => {
  const source = DATA_SOURCES[dataSource];
  if (!source) return null;

  const fields = source.fields || {};
  const defaultSize = DEFAULT_WIDGET_SIZE[widgetType] || 'md';

  return (
    <div className="space-y-4">
      {/* Titre */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Titre du widget</label>
        <input
          type="text"
          value={config.title || ''}
          onChange={e => onChange({ ...config, title: e.target.value })}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Ex: Budget OPEX"
        />
      </div>

      {/* Champ à afficher (pour KPI, bar, pie, line) */}
      {widgetType !== 'table' && Object.keys(fields).length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Donnée à afficher</label>
          <select
            value={config.field || ''}
            onChange={e => onChange({ ...config, field: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">-- Choisir --</option>
            {Object.entries(fields).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>
      )}

      {/* Taille */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Taille</label>
        <select
          value={config.size || defaultSize}
          onChange={e => onChange({ ...config, size: e.target.value })}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          {Object.entries(WIDGET_SIZES).map(([key, s]) => (
            <option key={key} value={key}>{s.label}</option>
          ))}
        </select>
      </div>
    </div>
  );
};
