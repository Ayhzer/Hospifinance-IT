/**
 * Composant OrderModal - Formulaire d'ajout/modification de commande
 */

import { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Input, TextArea, Select } from '../common/Input';
import { ORDER_STATUS_LIST } from '../../constants/orderConstants';

export const OrderModal = ({ isOpen, onClose, onSave, editingOrder, parentItems, parentLabel, parentNameKey }) => {
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    parentId: '',
    description: '',
    montant: '',
    status: 'En attente',
    dateCommande: '',
    dateFacture: '',
    reference: '',
    notes: ''
  });

  useEffect(() => {
    if (editingOrder) {
      setFormData({
        parentId: editingOrder.parentId || '',
        description: editingOrder.description || '',
        montant: editingOrder.montant || '',
        status: editingOrder.status || 'En attente',
        dateCommande: editingOrder.dateCommande || '',
        dateFacture: editingOrder.dateFacture || '',
        reference: editingOrder.reference || '',
        notes: editingOrder.notes || ''
      });
    } else {
      setFormData({
        parentId: '',
        description: '',
        montant: '',
        status: 'En attente',
        dateCommande: new Date().toISOString().split('T')[0],
        dateFacture: '',
        reference: '',
        notes: ''
      });
    }
  }, [editingOrder, isOpen]);

  const handleChange = (field) => (e) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      await onSave(formData);
    } finally {
      setSaving(false);
    }
  };

  const statusOptions = ORDER_STATUS_LIST.map(s => ({ value: s, label: s }));
  const parentOptions = parentItems.map(p => ({ value: p.id, label: p[parentNameKey] }));

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingOrder ? 'Modifier la commande' : 'Nouvelle commande'}
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>Annuler</Button>
          <Button variant="primary" onClick={handleSubmit} disabled={saving}>
            {saving ? 'Enregistrement...' : (editingOrder ? 'Modifier' : 'Ajouter')}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label={parentLabel}
            value={formData.parentId}
            onChange={handleChange('parentId')}
            required
            options={[
              { value: '', label: `-- Sélectionner --` },
              ...parentOptions
            ]}
          />
          <Select
            label="Statut"
            value={formData.status}
            onChange={handleChange('status')}
            required
            options={statusOptions}
          />
        </div>

        <Input
          label="Description"
          value={formData.description}
          onChange={handleChange('description')}
          required
          placeholder="Description de la commande"
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Montant (€)"
            type="number"
            value={formData.montant}
            onChange={handleChange('montant')}
            required
            min="0"
            step="0.01"
            placeholder="0.00"
          />
          <Input
            label="Référence"
            value={formData.reference}
            onChange={handleChange('reference')}
            placeholder="N° BC, PO..."
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Date de commande"
            type="date"
            value={formData.dateCommande}
            onChange={handleChange('dateCommande')}
          />
          <Input
            label="Date de facture"
            type="date"
            value={formData.dateFacture}
            onChange={handleChange('dateFacture')}
          />
        </div>

        <TextArea
          label="Notes"
          value={formData.notes}
          onChange={handleChange('notes')}
          placeholder="Notes additionnelles..."
          rows={2}
        />
      </form>
    </Modal>
  );
};
