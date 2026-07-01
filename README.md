# Hospifinance-IT — Tableau de Bord Budgétaire DSI (générique)

Application React de pilotage financier pour la Direction des Systèmes d'Information
hospitalière : suivi OPEX/CAPEX, gestion des commandes, analyse multi-exercice,
projection budgétaire et rapprochement comptable.

**Version 1.2 · 2026**

> 🚀 **Au premier lancement, un assistant de paramétrage vous guide.** Aucune
> configuration technique n'est nécessaire pour démarrer : dès le tout premier démarrage
> d'une installation neuve, un **assistant s'affiche automatiquement** et vous permet de
> tout régler **sans toucher au code** — identité de l'établissement, libellés des
> logiciels sources, mode de stockage des données (base locale ou synchronisation GitHub)
> et mot de passe administrateur. Les choix sont appliqués immédiatement ; l'assistant ne
> réapparaît plus ensuite.

> **Version générique et réutilisable.** Hospifinance-IT est conçu pour être adapté
> à **n'importe quel établissement** et à **n'importe quel logiciel source**. Tout le
> spécifique (nom de l'établissement, plan comptable, logiciels métier, budgets) est
> externalisé dans la configuration et dans les données — il n'y a aucune donnée
> d'hôpital codée en dur.

---

## Adapter l'application à votre établissement

### Le plus simple : l'assistant de premier lancement

Au **tout premier démarrage** d'une installation autonome (`npm run dev`), un
**assistant de configuration** s'affiche automatiquement et permet de tout régler
sans toucher au code : identité de l'établissement, libellés des logiciels sources,
mode de stockage (base locale ou synchronisation GitHub) et mot de passe
administrateur. Les choix sont enregistrés et appliqués immédiatement (la page se
recharge une fois). L'assistant ne réapparaît plus ensuite.

> L'assistant est ignoré lorsqu'un backend est déjà configuré par variables
> d'environnement (mode API ou GitHub) ou si des données existent déjà.

### Manuellement (ou pour modifier les valeurs par défaut au build)

Tout se configure dans **`src/config/`** :

| Fichier | Rôle |
|---|---|
| `config/establishment.js` | Nom de l'établissement, direction (DSI), devise, année de pilotage. |
| `config/sources.js` | Noms des logiciels métier affichés (« Logiciel source des commandes », « Logiciel de gestion des paiements »…). |
| `config/accounting.js` | Règles de classification OPEX/CAPEX par préfixe de compte, filtre de périmètre (service gestionnaire). |

Les **comptes, familles analytiques et budgets EPRD** de démonstration sont dans
`src/constants/analytiqueConstants.js`, mais ils sont surtout **éditables directement
dans l'application** (modules « Reclassement » et « Budget EPRD ») et stockés dans le
dépôt de données.

---

## Import générique par modèle canonique

L'application n'est liée à **aucun format propriétaire**. Elle définit un **modèle de
colonnes canonique** (cf. `src/services/importSchema.js`), lu **par nom de colonne**
(accents et casse ignorés, ordre libre, alias courants acceptés).

Parcours utilisateur :

1. Dans l'écran d'import, cliquez sur **« Télécharger le fichier exemple »**.
2. Vous obtenez un `.xlsx` avec les colonnes attendues, **quelques lignes de
   démonstration** et un onglet **« Notice »** décrivant chaque colonne.
3. Remplacez les lignes de démo par vos données réelles, exportées depuis **votre**
   logiciel (MAGH2, EPSILON, CPAGE, SAGE, Qualiac…) puis mises à ce format.
4. Réimportez le fichier : classification OPEX/CAPEX, regroupement par fournisseur et
   reclassement analytique sont automatiques.

### Mise à jour automatique (optionnelle)

En **mode serveur local** (`npm start`), l'application peut **surveiller un fichier source**
et proposer sa mise à jour au lancement. Dans **Paramètres → Source automatique**, indiquez
le chemin du dossier (ou fichier) et le nom de fichier attendu : dès qu'une version plus
récente est détectée, une fenêtre propose de réimporter les données en un clic (via le même
modèle canonique).

---

## Fonctionnalités

- **Pilotage budgétaire** — sélecteur d'exercice, atterrissage, KPIs, treemap, pipeline de commandes, comparaison N/N-1/N-2, rapport exécutif PDF.
- **Budget unifié** — bouton « Renseigner le budget » ouvrant un éditeur à deux onglets : **OPEX** (EPRD par compte) et **CAPEX** (budget global par exercice + par enveloppe, avec contrôle d'équilibre).
- **OPEX / CAPEX** — fournisseurs, projets et commandes (6 statuts avec impact budgétaire automatique).
- **Modules analytiques** — vue analytique (drill-down), par comptes vs EPRD, matrice Familles × Comptes, anomalies, analyse par éditeur, **rapprochement Commandes / Comptabilité**, projection fin d'année, reclassement analytique.
- **Reclassement & nomenclature** — nomenclature analytique **éditable** (familles / sous-catégories, périmètre Run/Build), règles par fournisseur, nature ou mot-clé, avec **aperçu des commandes concernées** et application en masse.
- **Import automatique** — surveillance d'un fichier source et mise à jour proposée au lancement (mode serveur local).
- **Administration** — authentification **optionnelle** multi-rôles (superadmin / admin / user), référentiels paramétrables, colonnes personnalisables, seuils d'alerte, tableaux de bord personnalisés, synchronisation GitHub optionnelle, journal d'audit.

---

## Installation locale

**Prérequis** : Node.js ≥ 18, npm

```bash
git clone https://github.com/Ayhzer/Hospifinance-IT.git
cd Hospifinance-IT/hospifinance-it
npm install
npm run dev          # Frontend uniquement — http://localhost:5173
```

Mode API (données servies depuis le dépôt `hospifinance-it-data`) :

```bash
npm start            # Frontend + serveur API local (port 3001)
```

Sous Windows :
- `START-HOSPIFINANCE-IT.bat` lance les deux serveurs (frontend + API locale) ;
- `START_IT.bat` lance le frontend seul sur le **port 5174** (mode localStorage, sans
  conflit de port avec Hospifinance HFAR).

### Première connexion (démo)

Identifiants par défaut : **admin** / **Admin2024!** — à changer immédiatement.

> L'authentification est **optionnelle** : elle peut être désactivée dans
> **Paramètres → Sécurité** (accès direct en administrateur, pour un poste de confiance).

---

## Variables d'environnement

Copier `.env.example` → `.env.local` et adapter :

| Variable | Description |
|---|---|
| `VITE_API_URL` | URL du serveur API local (active le mode API, ex : `http://localhost:3001/api`) |
| `VITE_GITHUB_TOKEN` | Token GitHub pour la synchronisation des données |
| `VITE_GITHUB_OWNER` | Propriétaire du dépôt de données |
| `VITE_GITHUB_REPO` | Nom du dépôt de données (ex : `hospifinance-it-data`) |
| `VITE_GITHUB_BRANCH` | Branche (ex : `main`) |
| `VITE_GITHUB_DATA_PATH` | Dossier des fichiers JSON (ex : `data`) |

---

## Scripts disponibles

| Commande | Action |
|---|---|
| `npm run dev` | Serveur de développement Vite |
| `npm run server` | API locale (port 3001) lisant `../hospifinance-it-data/data` |
| `npm start` | Dev + API en parallèle |
| `npm run build` | Build production → `dist/` |
| `npm run preview` | Prévisualiser le build |
| `npm run lint` | ESLint (0 avertissement toléré) |
| `npm run deploy` | Déploiement GitHub Pages |

---

## Données sensibles — périmètre Git

Le dépôt `hospifinance-it-data` fourni contient un **jeu de démonstration fictif**,
entièrement versionné. **Pour des données réelles**, créez un dépôt **privé** dédié et
excluez-y les extractions opérationnelles (`data/opex.json`, `data/capex.json`,
`data/opex-orders.json`, `data/capex-orders.json`).

---

## Sécurité

- **Changez les mots de passe par défaut** (`admin` / `user`) dès la mise en service, et
  n'exposez jamais des données réelles dans un dépôt public.
- **⚠️ Mots de passe — à durcir avant tout déploiement réseau.** Dans le mode navigateur /
  localStorage, les mots de passe sont actuellement **encodés en base64** (réversible), et
  non hachés. C'est acceptable pour une démo locale mono-poste, **mais insuffisant dès que
  l'application est accessible sur un réseau**. Recommandation pour une mise en production
  réseau : brancher le **backend Express/MongoDB** (dossier `backend/`) et y implémenter un
  **hachage salé** (par ex. `bcrypt`/`argon2`) côté serveur, avec transport **HTTPS** — cf.
  la section « Sécurité » de `backend/README.md`.
- L'**authentification peut être désactivée** (Paramètres → Sécurité) : ne le faites que
  sur un **poste de confiance**, jamais sur un déploiement partagé.

---

## Documentation

- [GUIDE_PREMIERS_PAS.md](GUIDE_PREMIERS_PAS.md) — prise en main rapide en 6 étapes.
- [GUIDE_UTILISATION.md](GUIDE_UTILISATION.md) — **manuel complet** d'utilisation et
  d'administration (tous les modules, cas d'usage, FAQ).
- [CHANGELOG.md](CHANGELOG.md) — historique des versions.
- [backend/README.md](backend/README.md) — API Express/MongoDB optionnelle.

---

## Technologies

React 18 · Vite 5 · Tailwind CSS 3 · Recharts 2 · Lucide React · XLSX (SheetJS) · jsPDF

---

## Licence

MIT.
