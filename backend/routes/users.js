/**
 * Routes de gestion des utilisateurs
 */

import express from 'express';
import crypto from 'crypto';
import { getCollection } from '../config/database.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// Toutes les routes nécessitent authentification
router.use(authenticate);

/**
 * Fonction de hashage SHA-256
 */
const hashPassword = (password) => {
  return crypto.createHash('sha256').update(password).digest('hex');
};

/**
 * GET /api/users
 * Récupérer tous les utilisateurs
 */
router.get('/', authorize('superadmin', 'admin'), async (req, res) => {
  try {
    const users = getCollection('users');
    const userList = await users.find({}, {
      projection: { passwordHash: 0 } // Ne pas retourner les mots de passe
    }).toArray();

    res.json(userList);
  } catch (error) {
    console.error('Erreur récupération utilisateurs:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des utilisateurs' });
  }
});

/**
 * POST /api/users
 * Créer un nouvel utilisateur
 */
router.post('/', authorize('superadmin', 'admin'), async (req, res) => {
  try {
    const { username, password, role } = req.body;

    if (!username || !password || !role) {
      return res.status(400).json({ error: 'Username, password et role requis' });
    }

    // Vérifier que seul superadmin peut créer des admins/superadmins
    if ((role === 'admin' || role === 'superadmin') && req.user.role !== 'superadmin') {
      return res.status(403).json({ error: 'Seul le superadmin peut créer des administrateurs' });
    }

    const users = getCollection('users');

    // Vérifier si l'utilisateur existe déjà
    const existingUser = await users.findOne({ username });
    if (existingUser) {
      return res.status(409).json({ error: 'Cet utilisateur existe déjà' });
    }

    // Générer un ID unique
    const maxUser = await users.find().sort({ id: -1 }).limit(1).toArray();
    const newId = maxUser.length > 0 ? maxUser[0].id + 1 : 1;

    const newUser = {
      id: newId,
      username,
      passwordHash: hashPassword(password),
      role,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await users.insertOne(newUser);

    // Retourner l'utilisateur sans le mot de passe
    const { passwordHash, ...userWithoutPassword } = newUser;
    res.status(201).json(userWithoutPassword);
  } catch (error) {
    console.error('Erreur création utilisateur:', error);
    res.status(500).json({ error: 'Erreur lors de la création de l\'utilisateur' });
  }
});

/**
 * PUT /api/users/:id
 * Modifier un utilisateur
 */
router.put('/:id', authorize('superadmin', 'admin'), async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { username, role } = req.body;

    const users = getCollection('users');
    const user = await users.findOne({ id: userId });

    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    // Empêcher modification du superadmin par un admin
    if (user.username === 'admin' && req.user.role !== 'superadmin') {
      return res.status(403).json({ error: 'Vous ne pouvez pas modifier le superadmin' });
    }

    const updates = { updatedAt: new Date() };
    if (username) updates.username = username;
    if (role) updates.role = role;

    await users.updateOne({ id: userId }, { $set: updates });

    const updatedUser = await users.findOne({ id: userId }, {
      projection: { passwordHash: 0 }
    });

    res.json(updatedUser);
  } catch (error) {
    console.error('Erreur modification utilisateur:', error);
    res.status(500).json({ error: 'Erreur lors de la modification de l\'utilisateur' });
  }
});

/**
 * PUT /api/users/:id/password
 * Changer le mot de passe d'un utilisateur
 */
router.put('/:id/password', async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { currentPassword, newPassword } = req.body;

    if (!newPassword) {
      return res.status(400).json({ error: 'Nouveau mot de passe requis' });
    }

    const users = getCollection('users');
    const user = await users.findOne({ id: userId });

    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    // Vérifier les permissions
    const isSuperAdmin = req.user.role === 'superadmin';
    const isTargetSuperAdmin = user.username === 'admin';
    const isOwnPassword = req.user.id === userId;

    // Seul le superadmin peut modifier son propre mot de passe
    if (isTargetSuperAdmin && !isSuperAdmin) {
      return res.status(403).json({ error: 'Vous ne pouvez pas modifier le mot de passe du superadmin' });
    }

    // Pour son propre mot de passe, vérifier l'ancien
    if (isOwnPassword && currentPassword) {
      const currentHash = hashPassword(currentPassword);
      if (currentHash !== user.passwordHash) {
        return res.status(401).json({ error: 'Mot de passe actuel incorrect' });
      }
    }

    // Mettre à jour le mot de passe
    const newPasswordHash = hashPassword(newPassword);
    await users.updateOne(
      { id: userId },
      { $set: { passwordHash: newPasswordHash, updatedAt: new Date() } }
    );

    res.json({ message: 'Mot de passe modifié avec succès' });
  } catch (error) {
    console.error('Erreur changement mot de passe:', error);
    res.status(500).json({ error: 'Erreur lors du changement de mot de passe' });
  }
});

/**
 * DELETE /api/users/:id
 * Supprimer un utilisateur
 */
router.delete('/:id', authorize('superadmin'), async (req, res) => {
  try {
    const userId = parseInt(req.params.id);

    const users = getCollection('users');
    const user = await users.findOne({ id: userId });

    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    // Empêcher la suppression du superadmin
    if (user.username === 'admin') {
      return res.status(403).json({ error: 'Impossible de supprimer le superadmin' });
    }

    await users.deleteOne({ id: userId });
    res.json({ message: 'Utilisateur supprimé avec succès' });
  } catch (error) {
    console.error('Erreur suppression utilisateur:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression de l\'utilisateur' });
  }
});

export default router;
