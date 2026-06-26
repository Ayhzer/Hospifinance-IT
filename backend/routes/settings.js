/**
 * Routes de gestion des paramètres (settings)
 */

import express from 'express';
import { getCollection } from '../config/database.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// Toutes les routes nécessitent authentification
router.use(authenticate);

/**
 * GET /api/settings
 * Récupérer les paramètres globaux
 */
router.get('/', async (req, res) => {
  try {
    const settings = getCollection('settings');
    let globalSettings = await settings.findOne({ _id: 'global' });

    // Si pas de settings, créer des settings par défaut
    if (!globalSettings) {
      globalSettings = {
        _id: 'global',
        customColumns: {
          opex: [],
          capex: []
        },
        columnVisibility: {},
        createdAt: new Date(),
        updatedAt: new Date()
      };
      await settings.insertOne(globalSettings);
    }

    res.json(globalSettings);
  } catch (error) {
    console.error('Erreur récupération settings:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des paramètres' });
  }
});

/**
 * PUT /api/settings
 * Mettre à jour les paramètres globaux
 */
router.put('/', authorize('superadmin', 'admin'), async (req, res) => {
  try {
    const updates = req.body;

    const settings = getCollection('settings');
    await settings.updateOne(
      { _id: 'global' },
      {
        $set: {
          ...updates,
          updatedAt: new Date()
        }
      },
      { upsert: true }
    );

    const updatedSettings = await settings.findOne({ _id: 'global' });
    res.json(updatedSettings);
  } catch (error) {
    console.error('Erreur mise à jour settings:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour des paramètres' });
  }
});

/**
 * POST /api/settings/custom-columns
 * Ajouter une colonne personnalisée
 */
router.post('/custom-columns', authorize('superadmin', 'admin'), async (req, res) => {
  try {
    const { type, column } = req.body; // type: 'opex' ou 'capex'

    if (!type || !column || !column.name) {
      return res.status(400).json({ error: 'Type et colonne requis' });
    }

    const settings = getCollection('settings');

    // Générer un ID unique pour la colonne
    const columnId = `custom_${Date.now()}`;
    const newColumn = {
      id: columnId,
      name: column.name,
      type: column.type || 'text',
      required: column.required || false,
      order: column.order || 100,
      createdAt: new Date()
    };

    // Ajouter la colonne
    const updatePath = `customColumns.${type}`;
    await settings.updateOne(
      { _id: 'global' },
      {
        $push: { [updatePath]: newColumn },
        $set: { updatedAt: new Date() }
      }
    );

    const updatedSettings = await settings.findOne({ _id: 'global' });
    res.status(201).json(updatedSettings);
  } catch (error) {
    console.error('Erreur ajout colonne personnalisée:', error);
    res.status(500).json({ error: 'Erreur lors de l\'ajout de la colonne' });
  }
});

/**
 * DELETE /api/settings/custom-columns/:type/:columnId
 * Supprimer une colonne personnalisée
 */
router.delete('/custom-columns/:type/:columnId', authorize('superadmin', 'admin'), async (req, res) => {
  try {
    const { type, columnId } = req.params;

    const settings = getCollection('settings');
    const updatePath = `customColumns.${type}`;

    await settings.updateOne(
      { _id: 'global' },
      {
        $pull: { [updatePath]: { id: columnId } },
        $set: { updatedAt: new Date() }
      }
    );

    const updatedSettings = await settings.findOne({ _id: 'global' });
    res.json(updatedSettings);
  } catch (error) {
    console.error('Erreur suppression colonne personnalisée:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression de la colonne' });
  }
});

export default router;
