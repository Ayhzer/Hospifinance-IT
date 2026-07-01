# Changelog — Hospifinance-IT

Toutes les modifications notables sont documentées ici.
Format : [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/) · Versioning : [Semantic Versioning](https://semver.org/lang/fr/)

---

## [1.2.0] — 2026-07-01 — Mise à jour automatique, budget unifié & nomenclature éditable

### ✨ Nouveautés

#### 🔄 Mise à jour automatique depuis un fichier source
- **Surveillance d'une source d'import** (`hooks/useAutoImportWatcher.js`) : au lancement,
  l'outil interroge le serveur local pour détecter une **nouvelle version** du fichier
  source configuré (comparaison de signature : nom, horodatage, taille).
- **Fenêtre de mise à jour** (`components/common/AutoImportUpdateModal.jsx`) proposée
  automatiquement quand une version plus récente est disponible : récupération du
  fichier via le serveur local, parsing par le **circuit d'import canonique**, puis
  application des données en un clic.
- **Configuration dans Paramètres → « Source automatique »** : activation, chemin du
  dossier (ou fichier) source et nom de fichier attendu (vide = `.xlsx` le plus récent).
- **Endpoints serveur** (`local-server.js`) : `GET /auto-import/status` (état de la
  source) et `GET /auto-import/file` (contenu du fichier). Fonctionne **uniquement en
  mode serveur local** (`VITE_API_URL` défini / `npm start`) ; inerte en navigateur seul.

#### 💶 Éditeur de budget unifié (OPEX + CAPEX)
- **Modal budget à deux onglets** (`components/analytique/BudgetEditorModal.jsx`) ouvert
  par le bouton « Renseigner le budget » :
  - **OPEX** — budget EPRD par compte ordonnateur (éditeur existant intégré) ;
  - **CAPEX** — nouvel éditeur (`CapexBudgetEditor.jsx`) : budget **global par exercice**
    et budget **par enveloppe (projet)**, avec **contrôle d'équilibre** (avertissement non
    bloquant si Σ enveloppes ≠ global, et bouton d'alignement du global sur la somme).

#### 🗂️ Nomenclature analytique éditable
- **Gestion des catégories & sous-catégories** (`components/reclassement/GestionNomenclature.jsx`)
  directement dans le module Reclassement : ajout, renommage, suppression des **familles
  analytiques** et de leurs **sous-catégories**, avec **périmètre** (Run / Build / Run + Build).
- La **nomenclature est la source de vérité** : celle du dépôt de données prime, sinon une
  nomenclature de référence intégrée est utilisée (`DEFAULT_NOMENCLATURE`).
- **Renommage / suppression en cascade** : les règles du moteur et les données associées
  (fournisseurs, projets, EPRD) sont mises à jour de façon cohérente ; la suppression
  bascule vers un libellé de repli (« Hors périmètre » par défaut).

#### 🔁 Refonte du module de reclassement
- **Aperçu des commandes concernées** (`components/reclassement/OrdersPreview.jsx`),
  dépliable dans les 4 niveaux de règles (Référentiel fournisseurs, Règles contextuelles,
  Mots-clés, Mapping comptes).
- Refonte de l'aperçu global (`PreviewReclassement.jsx`) et des éditeurs de règles
  (multi-nature, mots-clés, mapping) pour s'appuyer sur la nomenclature éditable.

#### 🔐 Authentification optionnelle
- Nouvelle bascule **« Authentification requise »** (Paramètres → Sécurité) :
  - **activée** — connexion par login / mot de passe imposée (comportement historique) ;
  - **désactivée** — accès direct en administrateur, sans écran de connexion (poste de
    confiance / usage mono-utilisateur).
- Préférence persistée via `config/runtimeConfig.js` (`isAuthRequired` / `setAuthRequired`).

### 🛠️ Divers
- Script Windows **`START_IT.bat`** : lance le frontend seul sur le **port 5174**
  (`--strictPort`) pour cohabiter sans conflit avec Hospifinance HFAR (5173 / 3001), et
  ouvre le navigateur automatiquement.
- Rapport exécutif PDF, calculs multi-exercice (`utils/yearCalculations.js`) et analyses
  (VueAnalytique IT/CAPEX, Éditeurs, Matrice) ajustés en cohérence avec la nomenclature.

---

## [1.1.0] — 2026-06-26 — Assistant de premier lancement & accompagnement

### ✨ Nouveautés
- **Assistant de configuration initiale** (`components/setup/SetupWizard.jsx`) affiché
  automatiquement au premier démarrage d'une installation autonome : identité de
  l'établissement, libellés des logiciels sources, mode de données (base locale ou
  synchronisation GitHub) et changement du mot de passe administrateur — **sans éditer
  le code**.
- **Fenêtre de bienvenue** (`components/onboarding/WelcomeModal.jsx`) affichée une fois
  après l'assistant, guidant la première utilisation (importer, budgéter, piloter).
- **Guide « Premiers pas » complet** (`components/onboarding/GuidePremiersPas.jsx` +
  `GUIDE_PREMIERS_PAS.md`), rouvrable à tout moment via un **bouton d'aide flottant**.
- **Bouton « Renseigner le budget »** en haut de la Vue d'ensemble ouvrant l'éditeur
  EPRD (jusqu'ici inaccessible depuis l'UI). L'éditeur permet désormais d'**ajouter /
  supprimer** des comptes, avec **persistance localStorage corrigée**.

### 🔗 Réconciliation des comptes (réel ↔ budget EPRD)
- **Clé compte normalisée** partout (`utils/compte.js` : trim + MAJUSCULES + extraction
  du code avant un éventuel `CODE|LIBELLÉ`), appliquée à l'import, à la saisie EPRD et à
  toutes les jointures — élimine les doublons/orphelins dus à un simple écart de casse.
- **Garde-fou dans l'éditeur EPRD** : autocomplétion des comptes issus de l'import,
  pré-remplissage du libellé, et alerte si le compte saisi n'existe dans aucun réel.
- **Détection des comptes orphelins** (anomalies B1/B2) : activité sans budget EPRD,
  budget EPRD sans activité.
- **Bandeau de réconciliation** dans « Par comptes » listant les comptes non appariés
  avec accès direct à la saisie du budget.

### 🐛 Données de démonstration
- Le budget EPRD de démonstration (`EPRD_STATIC`) n'est plus chargé pour une vraie
  installation neuve (initialisée via l'assistant) : l'EPRD démarre **vierge**.
- **Configuration runtime** (`config/runtimeConfig.js`) : surcouche localStorage
  (`hospifinance_app_config`) fusionnée au chargement par `config/establishment.js` et
  `config/sources.js` (nouveaux exports `DEFAULT_ESTABLISHMENT` / `DEFAULT_SOURCE_SOFTWARE`).
- Garde `components/setup/SetupGate.jsx` montée dans `main.jsx`. L'assistant est ignoré
  si un backend est configuré par variables d'environnement ou si des données existent déjà.

### 📝 Documentation
- README, CLAUDE.md et CHANGELOG mis à jour ; correction d'incohérences mineures
  (prérequis Node ≥ 18, chemin `services/importTemplates.js`).

---

## [1.0.0] — 2026-06-26 — Version générique réutilisable (fork d'Hospifinance HFAR)

Première version **générique** dérivée d'Hospifinance HFAR, adaptable à n'importe quel
établissement et n'importe quel logiciel source.

### ✨ Généralisation
- **Configuration externalisée** dans `src/config/` : `establishment.js` (établissement,
  direction, devise, année), `sources.js` (noms des logiciels métier), `accounting.js`
  (règles OPEX/CAPEX par préfixe de compte + filtre de périmètre).
- **Suppression de tout le spécifique HFAR** : nom d'établissement, comptes ordonnateurs,
  budgets EPRD, profil saisonnier et références « MAGH2 » / « SAGE » remplacés par des
  libellés configurables et des valeurs de démonstration éditables.

### 📥 Import générique par modèle canonique
- Nouveau **schéma de colonnes canonique** (`services/importSchema.js`) lu **par nom de
  colonne** (accents/casse ignorés, ordre libre, alias acceptés) — fini le parsing par
  position propre à un logiciel.
- Parser unifié `importCommandes` (`services/xlsxImportService.js`) remplaçant les
  parseurs MAGH2 / SAGE spécifiques.
- **Générateur de fichier exemple** téléchargeable (`services/importTemplates.js`) :
  colonnes attendues + lignes de démonstration + onglet « Notice ».
- Bandeau d'import refondu avec bouton **« Télécharger le fichier exemple »**.

### 🧪 Données
- Dépôt `hospifinance-it-data` fourni avec un **jeu de données de démonstration fictif**
  (fournisseurs, commandes, projets, EPRD, nomenclature) au lieu des données réelles.

### 🔁 Renommages
- Module de rapprochement : « MAGH2 / SAGE » → **« Commandes / Comptabilité »**.
- Rapport exécutif PDF : en-tête et nom de fichier dérivés de `config/establishment.js`.

---

## [4.0.0] — 2026-06-26 — Refonte Analytique & Pilotage Multi-exercice

### ✨ Nouveautés majeures

#### Navigation — Sidebar verticale avec sections dépliables
- Remplacement de la barre d'onglets horizontale par une **sidebar gauche** avec 3 sections dépliables
  - **Analyse** : Vue analytique, Par comptes, Matrice, Anomalies, Éditeurs, Rapprochement
  - **Détails** : OPEX, CAPEX, Détails commandes, Commandes OPEX, Commandes CAPEX
  - **Référentiel & recalculs** : Reclassement, Projection
- Sidebar **réductible** en icônes seules (bouton Réduire)
- Sidebar **redimensionnable** par drag du bord droit (180–400 px, persisté)
- **Renommage inline** de chaque section et de chaque item (crayon au survol, persisté)
- Ouverture automatique de la section contenant l'onglet actif
- Sections dépliables indépendamment, état persisté en localStorage

#### Pilotage budgétaire multi-exercice
- **Sélecteur d'exercice** dans la Vue d'ensemble — filtre tous les KPIs sur l'année sélectionnée
- **Sélecteur de mois réalisés** (1–12) — pilote les projections et les badges « au Mois AAAA »
- Budget CAPEX **par exercice** — saisie mémorisée par année (`hospifinance_capex_budgets`)
  - Migration automatique depuis l'ancienne clé `hospifinance_capex_budget_global`
- EPRD **filtré par exercice** — seules les lignes de l'année sélectionnée alimentent les KPIs
- Calculs distincts : `opexTotalsYear` / `capexTotalsYear` / `consolidatedTotalsYear`

#### Vue Pilotage — deux modes
- **Vue Stratégique** : KPIs synthèse, graphique d'atterrissage, répartition par catégorie (treemap), pipeline commandes, liste d'actions, comparaison pluriannuelle, cartes OPEX/CAPEX avec projections
- **Vue Opérationnelle** : suivi mensuel des dépenses, courbe de consommation budgétaire, détail par fournisseur

#### Modules analytiques (absents de v3.2)
- **Vue analytique OPEX/CAPEX** — drill-down 4 niveaux : Exercice → Fournisseur → Compte → Commandes ; graphiques barres, camemberts, courbe mensuelle ; filtrage multi-exercice
- **Vue Par comptes** — tableau croisé par compte ordonnateur SAGE (H6x / I6x) avec EPRD comparé
- **Matrice Familles × Comptes** — grille famille analytique × compte ordonnateur, exportable
- **Anomalies** — détection automatique : dépassements EPRD, commandes bloquées, engagements > budget
- **Analyse Éditeurs** — regroupement fournisseurs par éditeur logiciel, récapitulatif coûts de licences
- **Rapprochement MAGH2/SAGE** — comparaison extraction MAGH2 vs SAGE, identification des écarts
- **Reclassement analytique** — moteur de règles : mapping fournisseur → famille analytique, règles multi-nature, règles mot-clé ; application en masse sur OPEX et CAPEX
- **Projection** — extrapolation linéaire / optimiste / centrale / pessimiste par compte EPRD, visualisation graphique
- **Comparaison pluriannuelle** — histogramme N / N-1 / N-2 pour OPEX et CAPEX

#### Import SAGE / MAGH2 unifié
- Bouton **Importer extraction SAGE / MAGH2** directement depuis la Vue d'ensemble
- Remplacement complet des données (mode REPLACE) : OPEX suppliers + orders + CAPEX projects + orders en une seule opération

#### Treemap répartition catégories
- Graphique **treemap hiérarchique** catégorie → sous-catégorie remplace les barres de répartition

#### Rapport exécutif PDF
- Export PDF de la vue de pilotage (bouton « Rapport exécutif ») depuis la Vue Stratégique

#### Dashboards personnalisés (Dashboard Builder)
- Création de tableaux de bord custom avec widgets configurables
- Accès depuis le bouton « + Nouveau tableau… » en bas de la sidebar

### 🐛 Corrections

- **clearAll OPEX/CAPEX en mode API** : l'effacement n'appelait pas l'API → les données revenaient après F5 (fix : `api.replaceAllOpex([])`/`api.replaceAllCapex([])` avant `setState`)
- **BUG-01** : Donuts CAPEX disparaissaient en revenant sur la vue (Recharts StrictMode remount) — fix : `isAnimationActive={false}` sur `<Pie>`
- **BUG-02** : En-tête affichait l'année système au lieu de l'exercice sélectionné — fix : `{anneeSelectionnee}` au lieu de `{new Date().getFullYear()}`
- **BUG-04** : Budget CAPEX identique sur toutes les années — fix : stockage map `{année: budget}` au lieu d'une valeur unique
- **Donuts centre** : affichage `—%` quand budget = 0 après import → remplacé par « Budget non défini » en gris + message d'invite en amber

### 🗑️ Suppressions

- Barre de navigation horizontale (onglets drag-and-drop) supprimée — remplacée par la sidebar
- L'ordre des onglets par drag-and-drop horizontal (`hospifinance_tab_order`) n'est plus utilisé
- `TabNavigation.jsx` retiré du flux principal (remplacé par `SidebarNavigation.jsx`)

### 📦 Données — périmètre versionné

Fichiers **exclus** du dépôt Git (données opérationnelles SAGE/MAGH2) :
- `hospifinance-hfar-data/data/opex.json`
- `hospifinance-hfar-data/data/capex.json`
- `hospifinance-hfar-data/data/opex-orders.json`
- `hospifinance-hfar-data/data/capex-orders.json`

---

## [3.2.0] — 2026-02-20 — Référentiels Paramétrables & UX

### ✨ Nouveautés

- **Listes de choix paramétrables** (onglet Paramètres → Listes de choix) :
  - Référentiel Fournisseurs OPEX
  - Référentiel Catégories OPEX
  - Référentiel Enveloppes CAPEX (déplacé depuis l'onglet Enveloppes)
  - Composant `ListEditor` réutilisable (ajout, édition inline, suppression, déduplication)
- **Import CSV → référentiels** : les valeurs importées s'ajoutent automatiquement aux listes
- **Tous les onglets déplaçables** par drag-and-drop, ordre persisté (`hospifinance_tab_order`)
- **Gestion des comptes renforcée** : superadmin peut changer le rôle et réinitialiser le MDP

### 🐛 Corrections

- Perte de focus lors de la saisie dans les filtres de colonnes (`FilterInput` extrait en `React.memo`)
- Sélection de texte disparaissait si la souris quittait la fenêtre en redimensionnant (`useColumnResize`)

---

## [3.1.0] — 2026-02-09 — Pilotage Budgétaire Renforcé

- Synthèse OPEX/CAPEX optimisée
- Protection anti-écrasement (`hospifinance_initialized`)
- Stabilité et correction de bugs mineurs

---

## [3.0.0] — 2026-02-08 — Solution Professionnelle Complète

### ✨ Majeures

- Authentification multi-rôles (superadmin / admin / user), mots de passe encodés en base64 (⚠️ à durcir : hachage salé côté serveur pour une exposition réseau)
- Système de commandes 6 statuts avec impact budgétaire automatique
- Panneau de paramétrage : Apparence, Colonnes, Règles, Utilisateurs, Logs
- Journal d'audit complet
- Synchronisation GitHub (push automatique des données JSON)
- Raccourcis clavier : `Ctrl+Shift+P` ouvre les paramètres

---

## [2.0.0] — 2025 — Refonte Modulaire

- Architecture React modulaire (25+ fichiers, hooks, services, utils)
- Persistance automatique localStorage
- Graphiques Recharts
- Export CSV/JSON

---

## [1.0.0] — 2024 — Version Initiale

- Dashboard OPEX/CAPEX monolithique (867 lignes)
- Calculs basiques, export CSV
