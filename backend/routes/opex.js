/**
 * Routes de gestion des données OPEX
 */

import express from 'express';
import { getCollection } from '../config/database.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Toutes les routes nécessitent authentification
router.use(authenticate);

/**
 * GET /api/opex
 * Récupérer tous les fournisseurs OPEX
 */
router.get('/', async (req, res) => {
  try {
    const opex = getCollection('opex');
    const suppliers = await opex.find({}).sort({ id: 1 }).toArray();
    res.json(suppliers);
  } catch (error) {
    console.error('Erreur récupération OPEX:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des données OPEX' });
  }
});

/**
 * POST /api/opex
 * Créer un nouveau fournisseur OPEX
 */
router.post('/', async (req, res) => {
  try {
    const supplierData = req.body;

    // Validation basique
    if (!supplierData.supplier || !supplierData.category) {
      return res.status(400).json({ error: 'Fournisseur et catégorie requis' });
    }

    const opex = getCollection('opex');

    // Générer un ID unique
    const maxSupplier = await opex.find().sort({ id: -1 }).limit(1).toArray();
    const newId = maxSupplier.length > 0 ? maxSupplier[0].id + 1 : Date.now();

    const newSupplier = {
      ...supplierData,
      id: newId,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await opex.insertOne(newSupplier);
    res.status(201).json(newSupplier);
  } catch (error) {
    console.error('Erreur création OPEX:', error);
    res.status(500).json({ error: 'Erreur lors de la création du fournisseur' });
  }
});

/**
 * PUT /api/opex/:id
 * Modifier un fournisseur OPEX
 */
router.put('/:id', async (req, res) => {
  try {
    const supplierId = parseFloat(req.params.id);
    const supplierData = req.body;

    const opex = getCollection('opex');
    const supplier = await opex.findOne({ id: supplierId });

    if (!supplier) {
      return res.status(404).json({ error: 'Fournisseur non trouvé' });
    }

    const updates = {
      ...supplierData,
      id: supplierId,
      updatedAt: new Date()
    };

    await opex.updateOne({ id: supplierId }, { $set: updates });

    const updatedSupplier = await opex.findOne({ id: supplierId });
    res.json(updatedSupplier);
  } catch (error) {
    console.error('Erreur modification OPEX:', error);
    res.status(500).json({ error: 'Erreur lors de la modification du fournisseur' });
  }
});

/**
 * DELETE /api/opex/:id
 * Supprimer un fournisseur OPEX
 */
router.delete('/:id', async (req, res) => {
  try {
    const supplierId = parseFloat(req.params.id);

    const opex = getCollection('opex');
    const result = await opex.deleteOne({ id: supplierId });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Fournisseur non trouvé' });
    }

    res.json({ message: 'Fournisseur supprimé avec succès' });
  } catch (error) {
    console.error('Erreur suppression OPEX:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression du fournisseur' });
  }
});

export default router;
