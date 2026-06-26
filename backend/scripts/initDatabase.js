/**
 * Script d'initialisation de la base de données MongoDB Atlas
 * À exécuter une seule fois pour créer le compte admin et les collections
 */

import { MongoClient } from 'mongodb';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.MONGODB_DB_NAME || 'hospifinance';

// Hash SHA-256 pour le mot de passe (compatible avec le frontend actuel)
const hashPassword = (password) => {
  return crypto.createHash('sha256').update(password).digest('hex');
};

async function initializeDatabase() {
  const client = new MongoClient(MONGODB_URI);

  try {
    console.log('🔄 Connexion à MongoDB Atlas...');
    await client.connect();
    console.log('✅ Connecté à MongoDB Atlas');

    const db = client.db(DB_NAME);

    // Vérifier si le compte admin existe déjà
    const users = db.collection('users');
    const existingAdmin = await users.findOne({ username: 'admin' });

    if (existingAdmin) {
      console.log('ℹ️  Le compte admin existe déjà');
      console.log('   ID:', existingAdmin.id);
      console.log('   Role:', existingAdmin.role);
      return;
    }

    console.log('🔄 Création du compte superadmin...');

    // Créer le compte superadmin
    const adminUser = {
      id: 1,
      username: 'admin',
      passwordHash: hashPassword('admin'), // admin / admin
      role: 'superadmin',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await users.insertOne(adminUser);
    console.log('✅ Compte superadmin créé');
    console.log('   Username: admin');
    console.log('   Password: admin');
    console.log('   ⚠️  CHANGEZ CE MOT DE PASSE EN PRODUCTION !');

    // Créer les index
    console.log('🔄 Création des index...');
    await users.createIndex({ username: 1 }, { unique: true });
    await users.createIndex({ id: 1 }, { unique: true });

    // Créer les collections si elles n'existent pas
    console.log('🔄 Création des collections...');
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);

    const requiredCollections = ['opex', 'capex', 'opex_orders', 'capex_orders', 'settings'];

    for (const collName of requiredCollections) {
      if (!collectionNames.includes(collName)) {
        await db.createCollection(collName);
        console.log(`   ✅ Collection "${collName}" créée`);
      } else {
        console.log(`   ℹ️  Collection "${collName}" existe déjà`);
      }
    }

    // Créer les index pour les autres collections
    const opex = db.collection('opex');
    const capex = db.collection('capex');

    await opex.createIndex({ id: 1 }, { unique: true });
    await capex.createIndex({ id: 1 }, { unique: true });

    // Insérer les settings par défaut
    const settings = db.collection('settings');
    const existingSettings = await settings.findOne({ _id: 'global' });

    if (!existingSettings) {
      await settings.insertOne({
        _id: 'global',
        customColumns: {
          opex: [],
          capex: []
        },
        columnVisibility: {},
        createdAt: new Date(),
        updatedAt: new Date()
      });
      console.log('✅ Paramètres par défaut créés');
    } else {
      console.log('ℹ️  Les paramètres existent déjà');
    }

    console.log('\n🎉 Initialisation terminée avec succès !');
    console.log('\n📝 Résumé :');
    console.log('   - Base de données:', DB_NAME);
    console.log('   - Compte admin: admin / admin');
    console.log('   - Collections créées: users, opex, capex, opex_orders, capex_orders, settings');
    console.log('   - Index créés sur username et id');
    console.log('\n⚠️  N\'oubliez pas de changer le mot de passe admin !');

  } catch (error) {
    console.error('❌ Erreur lors de l\'initialisation:', error);
    throw error;
  } finally {
    await client.close();
    console.log('\n✅ Connexion fermée');
  }
}

// Exécution
initializeDatabase()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Erreur fatale:', error);
    process.exit(1);
  });
