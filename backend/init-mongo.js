// Script d'initialisation MongoDB pour Hospifinance

db = db.getSiblingDB('hospifinance');

// Créer les collections
db.createCollection('users');
db.createCollection('opex');
db.createCollection('capex');
db.createCollection('opex_orders');
db.createCollection('capex_orders');
db.createCollection('settings');

// Créer les index
db.users.createIndex({ username: 1 }, { unique: true });
db.opex.createIndex({ id: 1 }, { unique: true });
db.capex.createIndex({ id: 1 }, { unique: true });
db.opex_orders.createIndex({ id: 1 }, { unique: true });
db.capex_orders.createIndex({ id: 1 }, { unique: true });

// Insérer l'utilisateur superadmin par défaut
// Mot de passe: admin (hash SHA-256)
db.users.insertOne({
  id: 1,
  username: 'admin',
  passwordHash: '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918',
  role: 'superadmin',
  createdAt: new Date(),
  updatedAt: new Date()
});

// Insérer les paramètres par défaut
db.settings.insertOne({
  _id: 'global',
  customColumns: {
    opex: [],
    capex: []
  },
  columnVisibility: {},
  createdAt: new Date(),
  updatedAt: new Date()
});

print('Database initialized successfully!');
