/**
 * Routes de gestion des données CAPEX
 */

import express from 'express';
import { getCollection } from '../config/database.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Toutes les routes nécessitent authentification
router.use(authenticate);

/**
 * GET /api/capex
 * Récupérer tous les projets CAPEX
 */
router.get('/', async (req, res) => {
  try {
    const capex = getCollection('capex');
    const projects = await capex.find({}).sort({ id: 1 }).toArray();
    res.json(projects);
  } catch (error) {
    console.error('Erreur récupération CAPEX:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des données CAPEX' });
  }
});

/**
 * POST /api/capex
 * Créer un nouveau projet CAPEX
 */
router.post('/', async (req, res) => {
  try {
    const projectData = req.body;

    // Validation basique
    if (!projectData.project) {
      return res.status(400).json({ error: 'Nom du projet requis' });
    }

    const capex = getCollection('capex');

    // Générer un ID unique
    const maxProject = await capex.find().sort({ id: -1 }).limit(1).toArray();
    const newId = maxProject.length > 0 ? maxProject[0].id + 1 : Date.now();

    const newProject = {
      ...projectData,
      id: newId,
      enveloppe: projectData.enveloppe || 'Autre',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await capex.insertOne(newProject);
    res.status(201).json(newProject);
  } catch (error) {
    console.error('Erreur création CAPEX:', error);
    res.status(500).json({ error: 'Erreur lors de la création du projet' });
  }
});

/**
 * PUT /api/capex/:id
 * Modifier un projet CAPEX
 */
router.put('/:id', async (req, res) => {
  try {
    const projectId = parseFloat(req.params.id);
    const projectData = req.body;

    const capex = getCollection('capex');
    const project = await capex.findOne({ id: projectId });

    if (!project) {
      return res.status(404).json({ error: 'Projet non trouvé' });
    }

    const updates = {
      ...projectData,
      id: projectId,
      updatedAt: new Date()
    };

    await capex.updateOne({ id: projectId }, { $set: updates });

    const updatedProject = await capex.findOne({ id: projectId });
    res.json(updatedProject);
  } catch (error) {
    console.error('Erreur modification CAPEX:', error);
    res.status(500).json({ error: 'Erreur lors de la modification du projet' });
  }
});

/**
 * DELETE /api/capex/:id
 * Supprimer un projet CAPEX
 */
router.delete('/:id', async (req, res) => {
  try {
    const projectId = parseFloat(req.params.id);

    const capex = getCollection('capex');
    const result = await capex.deleteOne({ id: projectId });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Projet non trouvé' });
    }

    res.json({ message: 'Projet supprimé avec succès' });
  } catch (error) {
    console.error('Erreur suppression CAPEX:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression du projet' });
  }
});

export default router;
