/**
 * Composant OpexModal - Formulaire d'ajout/modification OPEX
 */

import { useState, useEffect } from 'react';
import { Save } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Input, TextArea, Select } from '../common/Input';
import { useSettings } from '../../contexts/SettingsContext';

const EMPTY_FORM = {
  supplier: '',
  category: '',
  budgetAnnuel: '',
  depenseActuelle: '',
  engagement: '',
  notes: ''
};

export const OpexModal = ({ isOpen, onClose, onSave, editingSupplier }) => {
  const { settings } = useSettings();
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  // Colonnes personnalisées pour OPEX
  const customColumns = settings.customColumns?.opex || [];
  const customColumnsKey = JSON.stringify(customColumns);

  useEffect(() => {
    if (editingSupplier) {
      // Mapper vers le format formulaire : strings pour les numériques, exclure champs parasites
      const mapped = {
        supplier:        editingSupplier.supplier ?? '',
        category:        editingSupplier.category ?? '',
        budgetAnnuel:    editingSupplier.budgetAnnuel != null ? String(editingSupplier.budgetAnnuel) : '',
        depenseActuelle: editingSupplier.depenseActuelle != null ? String(editingSupplier.depenseActuelle) : '',
        engagement:      editingSupplier.engagement != null ? String(editingSupplier.engagement) : '',
        notes:           editingSupplier.notes ?? '',
      };
      // Inclure les champs custom
      customColumns.forEach(col => {
        mapped[col.id] = editingSupplier[col.id] != null ? String(editingSupplier[col.id]) : '';
      });
      setFormData(mapped);
    } else {
      const emptyForm = { ...EMPTY_FORM };
      customColumns.forEach(col => {
        emptyForm[col.id] = '';
      });
      setFormData(emptyForm);
    }
    // customColumnsKey = clé sérialisée stable de customColumns (réf. instable à chaque render)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingSupplier, isOpen, customColumnsKey]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await onSave(formData);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingSupplier ? 'Modifier le fournisseur' : 'Nouveau fournisseur OPEX'}
      size="md"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Annuler
          </Button>
          <Button variant="primary" icon={<Save size={16} />} onClick={handleSubmit} disabled={saving}>
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Fournisseur"
            required
            value={formData.supplier}
            onChange={(e) => handleChange('supplier', e.target.value)}
            options={[
              { value: '', label: '-- Sélectionner --' },
              ...(settings.opexSuppliers || []).map(s => ({ value: s, label: s }))
            ]}
          />
          <Select
            label="Catégorie"
            required
            value={formData.category}
            onChange={(e) => handleChange('category', e.target.value)}
            options={[
              { value: '', label: '-- Sélectionner --' },
              ...(settings.opexCategories || []).map(c => ({ value: c, label: c }))
            ]}
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Input
            label="Budget annuel (€)"
            type="number"
            required
            value={formData.budgetAnnuel}
            onChange={(e) => handleChange('budgetAnnuel', e.target.value)}
            placeholder="500000"
            min="0"
          />
          <Input
            label="Dépense actuelle (€)"
            type="number"
            value={formData.depenseActuelle}
            onChange={(e) => handleChange('depenseActuelle', e.target.value)}
            placeholder="0"
            min="0"
          />
          <Input
            label="Engagement (€)"
            type="number"
            value={formData.engagement}
            onChange={(e) => handleChange('engagement', e.target.value)}
            placeholder="0"
            min="0"
          />
        </div>

        <TextArea
          label="Notes"
          value={formData.notes}
          onChange={(e) => handleChange('notes', e.target.value)}
          placeholder="Informations complémentaires..."
          rows={3}
        />

        {/* Colonnes personnalisées */}
        {customColumns.length > 0 && (
          <div className="border-t pt-4 space-y-4">
            <h4 className="text-sm font-semibold text-gray-700">Champs personnalisés</h4>
            <div className="grid grid-cols-2 gap-4">
              {customColumns.map((column) => (
                <div key={column.id}>
                  {column.type === 'text' && (
                    <Input
                      label={column.name}
                      required={column.required}
                      value={formData[column.id] || ''}
                      onChange={(e) => handleChange(column.id, e.target.value)}
                      placeholder={`Entrez ${column.name.toLowerCase()}`}
                    />
                  )}
                  {column.type === 'number' && (
                    <Input
                      label={column.name}
                      type="number"
                      required={column.required}
                      value={formData[column.id] || ''}
                      onChange={(e) => handleChange(column.id, e.target.value)}
                      placeholder="0"
                    />
                  )}
                  {column.type === 'date' && (
                    <Input
                      label={column.name}
                      type="date"
                      required={column.required}
                      value={formData[column.id] || ''}
                      onChange={(e) => handleChange(column.id, e.target.value)}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
