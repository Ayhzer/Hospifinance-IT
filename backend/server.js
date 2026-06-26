/**
 * Serveur Express pour Hospifinance API
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { connectDB, closeDB } from './config/database.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import opexRoutes from './routes/opex.js';
import capexRoutes from './routes/capex.js';
import settingsRoutes from './routes/settings.js';
import { errorHandler } from './middleware/errorHandler.js';

// Charger les variables d'environnement
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares de sécurité
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true
}));

// Middlewares de parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logger
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/opex', opexRoutes);
app.use('/api/capex', capexRoutes);
app.use('/api/settings', settingsRoutes);

// Route de santé
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Gestionnaire d'erreurs
app.use(errorHandler);

// Démarrage du serveur
const startServer = async () => {
  try {
    // Connexion à MongoDB
    await connectDB();
    console.log('✅ MongoDB connecté');

    // Démarrage du serveur Express
    app.listen(PORT, () => {
      console.log(`🚀 Serveur API démarré sur http://localhost:${PORT}`);
      console.log(`📊 Environnement: ${process.env.NODE_ENV}`);
      console.log(`🔒 CORS autorisé pour: ${process.env.CORS_ORIGIN}`);
    });
  } catch (error) {
    console.error('❌ Erreur au démarrage du serveur:', error);
    process.exit(1);
  }
};

// Gestion de l'arrêt propre
process.on('SIGINT', async () => {
  console.log('\n⏹️  Arrêt du serveur...');
  await closeDB();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n⏹️  Arrêt du serveur...');
  await closeDB();
  process.exit(0);
});

startServer();
