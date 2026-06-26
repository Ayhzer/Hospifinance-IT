# Hospifinance Backend API

Backend Node.js/Express avec MongoDB pour l'application Hospifinance.

## Prérequis

- Node.js 18+
- Docker et Docker Compose
- npm ou yarn

## Installation

### 1. Démarrer MongoDB avec Docker

```bash
# Depuis la racine du projet hospifinance
docker-compose up -d
```

Cela va démarrer :
- MongoDB sur le port `27017`
- Mongo Express (interface web) sur le port `8081`

Accès Mongo Express : http://localhost:8081
- Username: `admin`
- Password: `admin`

### 2. Installer les dépendances du backend

```bash
cd backend
npm install
```

### 3. Configurer les variables d'environnement

Le fichier `.env` est déjà créé. Modifiez-le si nécessaire pour changer :
- Les mots de passe
- Le secret JWT
- Les ports

### 4. Démarrer le serveur API

```bash
# Mode développement (avec auto-reload)
npm run dev

# Mode production
npm start
```

Le serveur API sera accessible sur : http://localhost:3001

## Structure de l'API

### Endpoints d'authentification
- `POST /api/auth/login` - Connexion
- `POST /api/auth/logout` - Déconnexion
- `GET /api/auth/me` - Informations utilisateur connecté

### Endpoints utilisateurs
- `GET /api/users` - Liste des utilisateurs
- `POST /api/users` - Créer un utilisateur
- `PUT /api/users/:id` - Modifier un utilisateur
- `DELETE /api/users/:id` - Supprimer un utilisateur
- `PUT /api/users/:id/password` - Changer le mot de passe

### Endpoints OPEX
- `GET /api/opex` - Liste des fournisseurs OPEX
- `POST /api/opex` - Créer un fournisseur
- `PUT /api/opex/:id` - Modifier un fournisseur
- `DELETE /api/opex/:id` - Supprimer un fournisseur

### Endpoints CAPEX
- `GET /api/capex` - Liste des projets CAPEX
- `POST /api/capex` - Créer un projet
- `PUT /api/capex/:id` - Modifier un projet
- `DELETE /api/capex/:id` - Supprimer un projet

### Endpoints Settings
- `GET /api/settings` - Récupérer les paramètres
- `PUT /api/settings` - Mettre à jour les paramètres
- `POST /api/settings/custom-columns` - Ajouter une colonne personnalisée
- `DELETE /api/settings/custom-columns/:type/:id` - Supprimer une colonne

## Commandes Docker utiles

```bash
# Voir les logs MongoDB
docker logs hospifinance-mongodb

# Arrêter les conteneurs
docker-compose down

# Arrêter et supprimer les volumes (⚠️ efface les données)
docker-compose down -v

# Redémarrer les conteneurs
docker-compose restart

# Se connecter au shell MongoDB
docker exec -it hospifinance-mongodb mongosh -u admin -p hospifinance2024 --authenticationDatabase admin
```

## Sécurité

⚠️ **IMPORTANT pour la production** :
1. Changez tous les mots de passe par défaut
2. Changez le `JWT_SECRET` dans `.env`
3. Utilisez HTTPS
4. Configurez correctement CORS
5. Ajoutez des rate limiters
6. Activez les logs d'audit

## Migration des données

Pour migrer les données existantes depuis localStorage vers MongoDB, utilisez le script de migration :

```bash
npm run migrate
```
