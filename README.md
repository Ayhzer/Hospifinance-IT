# Hospifinance-IT — Tableau de Bord Budgétaire DSI (générique)

Application React de pilotage financier pour la Direction des Systèmes d'Information
hospitalière : suivi OPEX/CAPEX, gestion des commandes, analyse multi-exercice,
projection budgétaire et rapprochement comptable.

**Version 1.0 · 2026**

> **Version générique et réutilisable.** Hospifinance-IT est conçu pour être adapté
> à **n'importe quel établissement** et à **n'importe quel logiciel source**. Tout le
> spécifique (nom de l'établissement, plan comptable, logiciels métier, budgets) est
> externalisé dans la configuration et dans les données — il n'y a aucune donnée
> d'hôpital codée en dur.

---

## Adapter l'application à votre établissement

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

---

## Fonctionnalités

- **Pilotage budgétaire** — sélecteur d'exercice, atterrissage, KPIs, treemap, pipeline de commandes, comparaison N/N-1/N-2, rapport exécutif PDF.
- **OPEX / CAPEX** — fournisseurs, projets et commandes (6 statuts avec impact budgétaire automatique).
- **Modules analytiques** — vue analytique (drill-down), par comptes vs EPRD, matrice Familles × Comptes, anomalies, analyse par éditeur, **rapprochement Commandes / Comptabilité**, projection fin d'année, reclassement analytique.
- **Administration** — authentification multi-rôles (superadmin / admin / user), référentiels paramétrables, colonnes personnalisables, seuils d'alerte, tableaux de bord personnalisés, synchronisation GitHub optionnelle, journal d'audit.

---

## Installation locale

**Prérequis** : Node.js ≥ 16, npm

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

Sous Windows, le script `START-HOSPIFINANCE-IT.bat` lance les deux serveurs.

### Première connexion (démo)

Identifiants par défaut : **admin** / **Admin2024!** — à changer immédiatement.

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

## Technologies

React 18 · Vite 5 · Tailwind CSS 3 · Recharts 2 · Lucide React · XLSX (SheetJS) · jsPDF

---

## Licence

MIT.
