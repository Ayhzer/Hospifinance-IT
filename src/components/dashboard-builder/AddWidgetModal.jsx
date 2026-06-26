import React, { useState, useEffect } from 'react';
import { X, ChevronRight, ChevronLeft, Hash, BarChart3, PieChart as PieIcon, TrendingUp, Table } from 'lucide-react';
import { WIDGET_TYPES, DATA_SOURCES, DEFAULT_WIDGET_SIZE } from '../../constants/dashboardConstants';
import { WidgetConfigForm } from './WidgetConfigForm';

const ICONS = { Hash, BarChart3, PieChart: PieIcon, TrendingUp, Table };

export const AddWidgetModal = ({ isOpen, onClose, onSave, editingWidget }) => {
  const [step, setStep] = useState(1);
  const [widgetType, setWidgetType] = useState('');
  const [dataSource, setDataSource] = useState('');
  const [config, setConfig] = useState({ title: '', field: '', size: '' });

  // Réinitialiser l'état à chaque ouverture
  useEffect(() => {
    if (isOpen) {
      if (editingWidget) {
        setStep(3);
        setWidgetType(editingWidget.type);
        setDataSource(editingWidget.dataSource);
        setConfig({
          title: editingWidget.title,
          field: editingWidget.config?.field || '',
          size: editingWidget.size
        });
      } else {
        setStep(1);
        setWidgetType('');
        setDataSource('');
        setConfig({ title: '', field: '', size: '' });
      }
    }
  }, [isOpen, editingWidget]);

  if (!isOpen) return null;

  const compatibleSources = Object.entries(DATA_SOURCES).filter(
    ([, src]) => src.compatibleWidgets.includes(widgetType)
  );

  const canNext = () => {
    if (step === 1) return !!widgetType;
    if (step === 2) return !!dataSource;
    if (step === 3) return !!config.title;
    return false;
  };

  const handleSave = () => {
    const id = editingWidget?.id || `w_${Date.now()}`;
    onSave({
      id,
      type: widgetType,
      title: config.title,
      size: config.size || DEFAULT_WIDGET_SIZE[widgetType] || 'md',
      dataSource,
      config: { field: config.field }
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">
            {editingWidget ? 'Modifier le widget' : 'Ajouter un widget'}
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Steps indicator */}
        <div className="flex items-center gap-2 px-5 py-3 bg-gray-50 text-sm">
          {['Type', 'Source', 'Configuration'].map((label, i) => (
            <React.Fragment key={i}>
              {i > 0 && <ChevronRight size={14} className="text-gray-300" />}
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                i + 1 === step ? 'bg-blue-100 text-blue-700' :
                i + 1 < step ? 'bg-green-100 text-green-700' :
                'bg-gray-100 text-gray-400'
              }`}>
                {label}
              </span>
            </React.Fragment>
          ))}
        </div>

        {/* Content */}
        <div className="px-5 py-4">
          {/* Step 1: Widget type */}
          {step === 1 && (
            <div className="grid grid-cols-2 gap-3">
              {Object.values(WIDGET_TYPES).map(wt => {
                const Icon = ICONS[wt.icon] || Hash;
                return (
                  <button
                    key={wt.id}
                    onClick={() => { setWidgetType(wt.id); setDataSource(''); }}
                    className={`flex items-center gap-3 p-3 rounded-lg border-2 text-left transition-colors ${
                      widgetType === wt.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Icon size={20} className={widgetType === wt.id ? 'text-blue-600' : 'text-gray-400'} />
                    <span className="text-sm font-medium text-gray-700">{wt.label}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Step 2: Data source */}
          {step === 2 && (
            <div className="space-y-2">
              {compatibleSources.map(([key, src]) => (
                <button
                  key={key}
                  onClick={() => setDataSource(key)}
                  className={`w-full text-left p-3 rounded-lg border-2 transition-colors ${
                    dataSource === key
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span className="text-sm font-medium text-gray-700">{src.label}</span>
                </button>
              ))}
            </div>
          )}

          {/* Step 3: Configuration */}
          {step === 3 && (
            <WidgetConfigForm
              widgetType={widgetType}
              dataSource={dataSource}
              config={config}
              onChange={setConfig}
            />
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-gray-200">
          <button
            onClick={() => step > 1 ? setStep(step - 1) : onClose()}
            className="flex items-center gap-1 px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
          >
            <ChevronLeft size={16} />
            {step > 1 ? 'Retour' : 'Annuler'}
          </button>
          {step < 3 ? (
            <button
              onClick={() => setStep(step + 1)}
              disabled={!canNext()}
              className="flex items-center gap-1 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Suivant <ChevronRight size={16} />
            </button>
          ) : (
            <button
              onClick={handleSave}
              disabled={!canNext()}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {editingWidget ? 'Enregistrer' : 'Ajouter'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
