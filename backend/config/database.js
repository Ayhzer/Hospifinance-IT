/**
 * Configuration et connexion MongoDB
 */

import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB_NAME || 'hospifinance';

let client;
let db;

/**
 * Connexion à MongoDB
 */
export const connectDB = async () => {
  try {
    client = new MongoClient(uri, {
      maxPoolSize: 10,
      minPoolSize: 2,
      serverSelectionTimeoutMS: 5000
    });

    await client.connect();
    db = client.db(dbName);

    // Vérifier la connexion
    await db.command({ ping: 1 });

    return db;
  } catch (error) {
    console.error('Erreur de connexion MongoDB:', error);
    throw error;
  }
};

/**
 * Fermeture de la connexion MongoDB
 */
export const closeDB = async () => {
  try {
    if (client) {
      await client.close();
      console.log('✅ Connexion MongoDB fermée');
    }
  } catch (error) {
    console.error('Erreur lors de la fermeture MongoDB:', error);
    throw error;
  }
};

/**
 * Récupération de la base de données
 */
export const getDB = () => {
  if (!db) {
    throw new Error('Base de données non initialisée. Appelez connectDB() d\'abord.');
  }
  return db;
};

/**
 * Récupération d'une collection
 */
export const getCollection = (collectionName) => {
  return getDB().collection(collectionName);
};
