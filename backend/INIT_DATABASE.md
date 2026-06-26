# 🔧 Initialisation de la base de données MongoDB Atlas

## Problème

Le compte admin (`admin/admin`) n'existe pas encore dans MongoDB Atlas. Il doit être créé manuellement.

## Solution 1 : Script d'initialisation (RECOMMANDÉ)

### Étape 1 : Configurer les variables d'environnement

Créez un fichier `backend/.env.production` avec vos credentials MongoDB Atlas :

```env
# Configuration MongoDB Atlas
MONGODB_URI=mongodb+srv://pottieralexandre01_db_user:uPtD80iUJPZeXn93@cluster0.xxxxx.mongodb.net/hospifinance?retryWrites=true&w=majority
MONGODB_DB_NAME=hospifinance

# Configuration serveur (pour Render)
PORT=3001
NODE_ENV=production

# Configuration JWT
JWT_SECRET=votre_secret_jwt_super_securise_genere_par_render
JWT_EXPIRES_IN=7d

# Configuration CORS
CORS_ORIGIN=https://ayhzer.github.io
```

⚠️ **Remplacez `cluster0.xxxxx` par votre vrai cluster MongoDB Atlas**

### Étape 2 : Installer les dépendances

```bash
cd backend
npm install
```

### Étape 3 : Exécuter le script d'initialisation

```bash
# En local avec vos credentials MongoDB Atlas
npm run init-db
```

Ce script va :
- ✅ Créer le compte admin (`admin/admin`)
- ✅ Créer toutes les collections (users, opex, capex, settings...)
- ✅ Créer les index nécessaires
- ✅ Insérer les paramètres par défaut

### Étape 4 : Vérifier

Testez le login :

```bash
curl -X POST https://hospifinance.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin"}'
```

Vous devriez recevoir un token JWT.

---

## Solution 2 : Via Render Dashboard (Si vous ne pouvez pas lancer le script localement)

### Option A : Depuis Render Shell

1. Allez sur https://dashboard.render.com
2. Sélectionnez votre service `hospifinance`
3. Cliquez sur **Shell** (onglet du haut)
4. Dans le shell, exécutez :

```bash
npm run init-db
```

### Option B : Via MongoDB Atlas UI

1. Allez sur https://cloud.mongodb.com
2. Connectez-vous à votre cluster
3. Allez dans **Collections**
4. Créez manuellement le document suivant dans la collection `users` :

```json
{
  "id": 1,
  "username": "admin",
  "passwordHash": "8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918",
  "role": "superadmin",
  "createdAt": {"$date": "2024-01-01T00:00:00.000Z"},
  "updatedAt": {"$date": "2024-01-01T00:00:00.000Z"}
}
```

**Note** : Le hash `8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918` correspond au mot de passe `admin` en SHA-256.

5. Créez aussi un document dans la collection `settings` :

```json
{
  "_id": "global",
  "customColumns": {
    "opex": [],
    "capex": []
  },
  "columnVisibility": {},
  "createdAt": {"$date": "2024-01-01T00:00:00.000Z"},
  "updatedAt": {"$date": "2024-01-01T00:00:00.000Z"}
}
```

---

## Vérification

Une fois le compte admin créé, testez :

### Test 1 : Login
```bash
curl -X POST https://hospifinance.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin"}'
```

Réponse attendue :
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "username": "admin",
    "role": "superadmin"
  }
}
```

### Test 2 : Récupérer les settings
```bash
# Remplacez YOUR_TOKEN par le token reçu
curl https://hospifinance.onrender.com/api/settings \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## ⚠️ Sécurité

**IMPORTANT** : Après avoir créé le compte admin, changez le mot de passe immédiatement !

1. Connectez-vous sur https://ayhzer.github.io/hospifinance/
2. Identifiants : `admin` / `admin`
3. Allez dans **Paramétrage** > **Utilisateurs**
4. Changez le mot de passe du compte admin

---

## 🐛 Dépannage

### Erreur : "Cannot connect to MongoDB"
- Vérifiez que l'IP de Render est whitelistée dans MongoDB Atlas (0.0.0.0/0)
- Vérifiez que le MONGODB_URI est correct

### Erreur : "Duplicate key error"
- Le compte admin existe déjà
- Essayez de vous connecter avec `admin/admin`

### Le script ne fait rien
- Vérifiez que le fichier `.env.production` existe
- Vérifiez que MONGODB_URI est correct
- Vérifiez les logs : `npm run init-db`
