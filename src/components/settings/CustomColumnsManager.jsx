/**
 * Gestionnaire de colonnes personnalisées
 * Permet aux administrateurs d'ajouter des colonnes non calculées dans OPEX et CAPEX
 */

import { useState } from 'react';
import { Plus, Trash2, AlertCircle } from 'lucide-react';
import { useSettings } from '../../contexts/SettingsContext';
import { usePermissions } from '../../contexts/PermissionsContext';
import { Button } from '../common/Button';

export const CustomColumnsManager = () => {
  const { settings, addCustomColumn, removeCustomColumn } = useSettings();
  const { canManageColumns } = usePermissions();
  const [activeType, setActiveType] = useState('opex');
  const [showForm, setShowForm] = useState(false);
  const [newColumn, setNewColumn] = useState({
    name: '',
    type: 'text'
  });

  if (!canManageColumns) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-yellow-800">
        <div className="flex items-center gap-2">
          <AlertCircle size={20} />
          <p className="font-medium">Accès restreint</p>
        </div>
        <p className="text-sm mt-1">
          Seuls les administrateurs peuvent gérer les colonnes personnalisées.
        </p>
      </div>
    );
  }

  const handleAdd = () => {
    if (!newColumn.name.trim()) return;

    addCustomColumn(activeType, {
      name: newColumn.name,
      type: newColumn.type,
      required: false,
      order: 100
    });

    setNewColumn({ name: '', type: 'text' });
    setShowForm(false);
  };

  const handleRemove = (columnId) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette colonne ? Les données associées seront perdues.')) {
      removeCustomColumn(activeType, columnId);
    }
  };

  const customColumns = settings.customColumns[activeType] || [];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-2">Colonnes Personnalisées</h3>
        <p className="text-sm text-gray-600">
          Ajoutez des colonnes supplémentaires non calculées à vos tableaux OPEX et CAPEX.
        </p>
      </div>

      {/* Sélection du type */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveType('opex')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeType === 'opex'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          OPEX
        </button>
        <button
          onClick={() => setActiveType('capex')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeType === 'capex'
              ? 'bg-green-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          CAPEX
        </button>
      </div>

      {/* Liste des colonnes */}
      <div>
        {customColumns.length === 0 ? (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center text-gray-500">
            <p>Aucune colonne personnalisée pour {activeType.toUpperCase()}</p>
            <p className="text-sm mt-1">Cliquez sur "Ajouter une colonne" pour commencer</p>
          </div>
        ) : (
          <div className="space-y-2">
            {customColumns.map((column) => (
              <div
                key={column.id}
                className="flex items-center justify-between bg-white border border-gray-200 rounded-lg p-3"
              >
                <div>
                  <div className="font-medium text-gray-800">{column.name}</div>
                  <div className="text-sm text-gray-500">
                    Type: {column.type === 'text' ? 'Texte' : column.type === 'number' ? 'Nombre' : 'Date'}
                  </div>
                </div>
                <button
                  onClick={() => handleRemove(column.id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                  title="Supprimer"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Formulaire d'ajout */}
      {showForm ? (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
          <h4 className="font-semibold text-blue-900">Nouvelle Colonne</h4>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nom de la colonne *
            </label>
            <input
              type="text"
              value={newColumn.name}
              onChange={(e) => setNewColumn(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Ex: Référence SAP"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Type de données
            </label>
            <select
              value={newColumn.type}
              onChange={(e) => setNewColumn(prev => ({ ...prev, type: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="text">Texte</option>
              <option value="number">Nombre</option>
              <option value="date">Date</option>
            </select>
          </div>

          <div className="flex gap-2">
            <Button variant="primary" onClick={handleAdd} disabled={!newColumn.name.trim()}>
              Ajouter
            </Button>
            <Button variant="secondary" onClick={() => {
              setShowForm(false);
              setNewColumn({ name: '', type: 'text' });
            }}>
              Annuler
            </Button>
          </div>
        </div>
      ) : (
        <Button
          variant="primary"
          icon={<Plus size={16} />}
          onClick={() => setShowForm(true)}
        >
          Ajouter une colonne
        </Button>
      )}

      {/* Note informative */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm text-gray-600">
        <strong className="text-gray-800">Note :</strong>
        <ul className="list-disc ml-5 mt-2 space-y-1">
          <li>Les colonnes personnalisées apparaîtront à la fin des tableaux</li>
          <li>Les données sont stockées localement dans votre navigateur</li>
          <li>La suppression d'une colonne efface définitivement les données associées</li>
          <li>Maximum recommandé : 5 colonnes personnalisées par type</li>
        </ul>
      </div>
    </div>
  );
};

export default CustomColumnsManager;
