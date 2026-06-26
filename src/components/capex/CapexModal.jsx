/**
 * Composant CapexModal - Formulaire d'ajout/modification CAPEX
 */

import { useState, useEffect } from 'react';
import { Save } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Input, TextArea, Select } from '../common/Input';
import { PROJECT_STATUS } from '../../constants/budgetConstants';
import { useSettings } from '../../contexts/SettingsContext';

const EMPTY_FORM = {
  enveloppe: 'Autre',
  project: '',
  budgetTotal: '',
  depense: '',
  engagement: '',
  dateDebut: '',
  dateFin: '',
  status: 'Planifié',
  notes: ''
};

const STATUS_OPTIONS = Object.values(PROJECT_STATUS).map((status) => ({
  value: status,
  label: status
}));

export const CapexModal = ({ isOpen, onClose, onSave, editingProject }) => {
  const { settings } = useSettings();
  const enveloppes = settings.capexEnveloppes || [];
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  // Colonnes personnalisées pour CAPEX
  const customColumns = settings.customColumns?.capex || [];
  const customColumnsKey = JSON.stringify(customColumns);

  useEffect(() => {
    if (editingProject) {
      // Mapper vers le format formulaire : strings pour les numériques, exclure champs parasites
      const mapped = {
        enveloppe:   editingProject.enveloppe ?? EMPTY_FORM.enveloppe,
        project:     editingProject.project ?? '',
        budgetTotal: editingProject.budgetTotal != null ? String(editingProject.budgetTotal) : '',
        depense:     editingProject.depense != null ? String(editingProject.depense) : '',
        engagement:  editingProject.engagement != null ? String(editingProject.engagement) : '',
        dateDebut:   editingProject.dateDebut ?? '',
        dateFin:     editingProject.dateFin ?? '',
        status:      editingProject.status ?? 'Planifié',
        notes:       editingProject.notes ?? '',
      };
      // Inclure les champs custom
      customColumns.forEach(col => {
        mapped[col.id] = editingProject[col.id] != null ? String(editingProject[col.id]) : '';
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
  }, [editingProject, isOpen, customColumnsKey]);

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
      title={editingProject ? 'Modifier le projet' : 'Nouveau projet CAPEX'}
      size="md"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Annuler
          </Button>
          <Button variant="success" icon={<Save size={16} />} onClick={handleSubmit} disabled={saving}>
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Select
          label="Enveloppe budgétaire"
          required
          value={formData.enveloppe}
          onChange={(e) => handleChange('enveloppe', e.target.value)}
          options={enveloppes.map(env => ({ value: env, label: env }))}
        />

        <Input
          label="Nom du projet"
          required
          value={formData.project}
          onChange={(e) => handleChange('project', e.target.value)}
          placeholder="Ex: Renouvellement Datacenter"
        />

        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Statut"
            value={formData.status}
            onChange={(e) => handleChange('status', e.target.value)}
            options={STATUS_OPTIONS}
          />
          <Input
            label="Budget total (€)"
            type="number"
            required
            value={formData.budgetTotal}
            onChange={(e) => handleChange('budgetTotal', e.target.value)}
            placeholder="2000000"
            min="0"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Dépense (€)"
            type="number"
            value={formData.depense}
            onChange={(e) => handleChange('depense', e.target.value)}
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

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Date de début"
            type="date"
            value={formData.dateDebut}
            onChange={(e) => handleChange('dateDebut', e.target.value)}
          />
          <Input
            label="Date de fin"
            type="date"
            value={formData.dateFin}
            onChange={(e) => handleChange('dateFin', e.target.value)}
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
