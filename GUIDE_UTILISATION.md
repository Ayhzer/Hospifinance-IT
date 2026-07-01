# Guide d'utilisation — Hospifinance-IT

Manuel complet d'utilisation et d'administration de l'application de pilotage
budgétaire OPEX / CAPEX pour une Direction des Systèmes d'Information hospitalière.

**Version 1.2 · 2026**

> Pour une prise en main express, voir plutôt [GUIDE_PREMIERS_PAS.md](GUIDE_PREMIERS_PAS.md).
> Pour l'installation et la configuration technique, voir [README.md](README.md).

---

## Table des matières

1. [Concepts clés](#1-concepts-clés)
2. [Démarrer](#2-démarrer)
   - 2.1 [Assistant de premier lancement](#21-assistant-de-premier-lancement)
   - 2.2 [Connexion & rôles](#22-connexion--rôles)
   - 2.3 [L'interface : barre latérale et vues](#23-linterface--barre-latérale-et-vues)
3. [Importer ses données](#3-importer-ses-données)
   - 3.1 [Le modèle canonique](#31-le-modèle-canonique)
   - 3.2 [Import manuel](#32-import-manuel)
   - 3.3 [Mise à jour automatique](#33-mise-à-jour-automatique)
4. [Renseigner les budgets](#4-renseigner-les-budgets)
5. [Piloter — la Vue d'ensemble](#5-piloter--la-vue-densemble)
6. [Le suivi des commandes](#6-le-suivi-des-commandes)
7. [Les modules d'analyse](#7-les-modules-danalyse)
8. [Reclassement analytique & nomenclature](#8-reclassement-analytique--nomenclature)
9. [Projection de fin d'année](#9-projection-de-fin-dannée)
10. [Rapport exécutif PDF & exports](#10-rapport-exécutif-pdf--exports)
11. [Administration & paramètres](#11-administration--paramètres)
12. [Sécurité & bonnes pratiques](#12-sécurité--bonnes-pratiques)
13. [FAQ / dépannage](#13-faq--dépannage)

---

## 1. Concepts clés

| Terme | Signification |
|---|---|
| **OPEX** | Dépenses de fonctionnement (charges récurrentes : maintenance, licences, abonnements, prestations…). |
| **CAPEX** | Dépenses d'investissement, organisées en **enveloppes** (projets). |
| **EPRD** | Budget prévisionnel par **compte ordonnateur**, référence de comparaison au réel. |
| **Compte ordonnateur** | Code comptable (ex. `H61526100`) portant la dépense. |
| **Famille analytique** | Regroupement métier (Applications, Infrastructures, Cybersécurité…) issu de la **nomenclature**. |
| **Engagement** | Montant réservé mais non encore facturé (commande passée). |
| **Dépense / réalisé** | Montant facturé ou payé. |
| **Exercice** | Année budgétaire de pilotage. La plupart des vues se filtrent par exercice. |

**Chaîne budgétaire d'une dépense :** une commande passe par des statuts qui pèsent
automatiquement sur le budget — d'abord en **engagement**, puis en **dépense** (voir
[§6](#6-le-suivi-des-commandes)).

---

## 2. Démarrer

### 2.1 Assistant de premier lancement

Au **tout premier démarrage** d'une installation neuve, un assistant s'affiche
automatiquement et permet de tout régler **sans toucher au code** :

1. **Identité de l'établissement** — nom, direction (DSI), devise, année de pilotage.
2. **Libellés des logiciels sources** — noms affichés pour le logiciel des commandes et
   celui des paiements (ex. MAGH2, EPSILON, CPAGE…).
3. **Mode de données** — base locale (navigateur) ou synchronisation GitHub.
4. **Mot de passe administrateur**.

Les choix sont enregistrés et appliqués immédiatement (la page se recharge une fois).
L'assistant **ne réapparaît plus** ensuite, et il est **ignoré** si un backend est déjà
configuré par variables d'environnement ou si des données existent déjà.

> Une **fenêtre de bienvenue** s'affiche ensuite une fois, puis le **bouton d'aide
> flottant** (en bas à droite) rouvre le guide de démarrage à tout moment.

### 2.2 Connexion & rôles

Identifiants de démonstration par défaut : **admin / Admin2024!** — **à changer
immédiatement**.

| Rôle | Permissions |
|---|---|
| **superadmin** | Tout, y compris gestion des comptes (rôles, réinitialisation de mot de passe). |
| **admin** | Configuration, référentiels, import, budgets, paramètres. |
| **user** | Consultation et saisie courante, sans accès aux réglages sensibles. |

> **Authentification optionnelle** : elle peut être désactivée dans **Paramètres →
> Utilisateurs** (accès direct en administrateur). Réservez ce mode à un **poste de
> confiance**. En mode développement local, la connexion est automatiquement contournée.

### 2.3 L'interface : barre latérale et vues

La navigation se fait par une **barre latérale gauche** à sections dépliables :

- **Analyse** — Vue analytique · Par comptes · Matrice · Anomalies · Éditeurs · Rapprochement
- **Détails** — Liste OPEX par fournisseur · Liste CAPEX par enveloppe · Détails commandes ·
  Saisie des commandes OPEX · Saisie des commandes CAPEX
- **Référentiel et recalculs** — Reclassement · Projection
- **Tableaux de bord** — vos tableaux de bord personnalisés (bouton « + Nouveau tableau… »)

La barre latérale est **repliable** (icônes seules), **redimensionnable** (glisser le bord
droit) et chaque **section / onglet est renommable** (crayon au survol) ; l'ordre et les
noms sont mémorisés. La section contenant l'onglet actif s'ouvre automatiquement.

En haut de la barre, la **Vue d'ensemble** (pilotage) est le point d'entrée. En bas se
trouvent l'accès aux **Paramètres** (icône engrenage, ou raccourci **Ctrl + Shift + P**).

---

## 3. Importer ses données

### 3.1 Le modèle canonique

L'application n'est liée à **aucun format propriétaire**. Elle lit un **modèle de colonnes
canonique**, identifié **par nom de colonne** (accents et casse ignorés, ordre libre, alias
courants acceptés). Vos données, quel que soit le logiciel d'origine (MAGH2, EPSILON, CPAGE,
SAGE, Qualiac…), doivent simplement être remises à ce format.

À l'import, l'application effectue automatiquement :
- la **classification OPEX / CAPEX** (selon les préfixes de compte configurés) ;
- le **regroupement par fournisseur** ;
- le **reclassement analytique** selon vos règles.

### 3.2 Import manuel

1. Depuis la **Vue d'ensemble**, cliquez sur **« Importer un fichier de commandes »**.
2. Dans la fenêtre d'import, cliquez sur **« Télécharger le fichier exemple »** : vous
   obtenez un classeur `.xlsx` avec les colonnes attendues, quelques lignes de démonstration
   et un onglet **« Notice »** décrivant chaque colonne.
3. Remplacez les lignes de démo par vos données réelles.
4. Choisissez l'**exercice** cible et, si besoin, l'option de conversion HT.
5. Réimportez : l'import fonctionne en **remplacement** (les données de l'exercice concerné
   sont réécrites de façon cohérente : fournisseurs, commandes, projets).

### 3.3 Mise à jour automatique

En **mode serveur local** (`npm start`), l'application peut **surveiller un fichier source**
et proposer sa mise à jour au lancement :

1. Dans **Paramètres → Source automatique**, activez l'option et renseignez :
   - le **chemin du dossier (ou fichier) source** — accessible depuis le poste qui exécute
     le serveur local (ex. `\\serveur\partage\extraction` ou `D:\exports`) ;
   - le **nom de fichier attendu** (laisser vide = le `.xlsx` le plus récent du dossier).
2. À chaque lancement, si une **version plus récente** est détectée, une fenêtre propose de
   réimporter les données **en un clic**, via le même circuit canonique.

> Le fichier doit respecter le **format canonique**. Cette fonction est **inerte** en mode
> navigateur seul (sans serveur local) : c'est le serveur qui lit le système de fichiers.

---

## 4. Renseigner les budgets

Cliquez sur **« Renseigner le budget »** en haut de la Vue d'ensemble : un éditeur à
**deux onglets** s'ouvre.

**Onglet OPEX — EPRD par compte**
- Saisissez le **budget EPRD** compte ordonnateur par compte ordonnateur.
- L'éditeur propose l'**autocomplétion** des comptes issus de l'import et **pré-remplit le
  libellé** ; une **alerte** signale un compte saisi qui n'existe dans aucun réel.
- Vous pouvez **ajouter / supprimer** des comptes ; la saisie est persistée.

**Onglet CAPEX — global / enveloppes**
- Saisissez un **budget global par exercice** et/ou un **budget par enveloppe** (projet).
- Un **contrôle d'équilibre** (avertissement non bloquant) signale tout écart entre la
  somme des enveloppes et le budget global ; un bouton permet d'**aligner** le global sur la
  somme.

> Le budget CAPEX est mémorisé **par année** : chaque exercice conserve son enveloppe.
> Les **seuils d'alerte** (taux d'utilisation orange / rouge) se règlent dans
> **Paramètres → Règles**.

**Réconciliation réel ↔ EPRD.** Les clés de compte sont normalisées partout, ce qui évite
les doublons dus à un simple écart de casse. Le module **« Par comptes »** affiche un
bandeau listant les comptes non appariés (activité sans budget, ou budget sans activité) avec
un accès direct à la saisie.

---

## 5. Piloter — la Vue d'ensemble

La Vue d'ensemble propose **deux modes**, plus des sélecteurs de cadrage.

**Sélecteurs**
- **Exercice** — filtre l'ensemble des KPIs sur l'année choisie.
- **Mois réalisés (1–12)** — pilote les projections et les badges « au Mois AAAA ».

**Vue Stratégique**
- KPIs de synthèse OPEX / CAPEX / consolidé.
- Graphique d'**atterrissage** (projection de fin d'exercice).
- **Treemap** de répartition par catégorie → sous-catégorie.
- **Pipeline des commandes** (par statut) et liste d'actions.
- **Comparaison pluriannuelle** N / N-1 / N-2.
- Cartes OPEX / CAPEX avec projections ; bouton **« Rapport exécutif »** (PDF).

**Vue Opérationnelle**
- Suivi **mensuel** des dépenses et courbe de consommation budgétaire.
- Détail par fournisseur.

> Si un budget n'est pas défini après un import, les indicateurs concernés affichent
> « Budget non défini » et invitent à le renseigner plutôt qu'un pourcentage trompeur.

---

## 6. Le suivi des commandes

Chaque commande suit un cycle à **6 statuts**, avec un **impact budgétaire automatique** :

| Statut | Impact budgétaire |
|---|---|
| **En attente** | Aucun |
| **Commandée** | **Engagement** |
| **Livrée** | **Engagement** |
| **Facturée** | **Dépense** (réalisé) |
| **Payée** | **Dépense** (réalisé) |
| **Annulée** | Aucun |

Autrement dit : passer une commande en *Commandée/Livrée* réserve le montant en
**engagement** ; la passer en *Facturée/Payée* le bascule en **dépense**. *En attente* et
*Annulée* n'ont aucun effet sur le budget.

- **Détails commandes** — liste consolidée, filtrable et triable, de toutes les commandes.
- **Saisie des commandes OPEX / CAPEX** — écrans de saisie manuelle (utiles si vous ne
  passez pas par l'import de masse).

---

## 7. Les modules d'analyse

Tous ces modules se trouvent dans la section **Analyse** de la barre latérale et se filtrent
par exercice.

- **Vue analytique** — drill-down OPEX/CAPEX sur 4 niveaux : Exercice → Fournisseur →
  Compte → Commandes, avec graphiques (barres, camemberts, courbe mensuelle).
- **Par comptes** — tableau croisé par compte ordonnateur avec l'**EPRD comparé** au réel ;
  bandeau de réconciliation des comptes non appariés.
- **Matrice** — grille **Familles analytiques × Comptes ordonnateurs**, exportable.
- **Anomalies** — détection automatique : dépassements EPRD, commandes bloquées,
  engagements supérieurs au budget, comptes orphelins (activité sans budget / budget sans
  activité).
- **Éditeurs** — regroupement des fournisseurs par **éditeur logiciel**, récapitulatif des
  coûts de licences.
- **Rapprochement** — comparaison **Commandes / Comptabilité**, identification des écarts
  compte par compte.

---

## 8. Reclassement analytique & nomenclature

Le module **Reclassement** (section « Référentiel et recalculs ») associe chaque dépense à
une **famille analytique**, selon des règles que vous maîtrisez.

### La nomenclature (source de vérité)

La **nomenclature** — la liste des **familles** et de leurs **sous-catégories** (avec un
**périmètre** Run / Build / Run + Build) — est **éditable directement** dans le module :
ajout, renommage, suppression. Les modifications se **répercutent en cascade** sur les
règles et les données ; une suppression bascule les éléments concernés vers un libellé de
repli (« Hors périmètre » par défaut).

### Les règles de reclassement (4 niveaux)

1. **Référentiel fournisseurs** — associe un fournisseur à une famille par défaut.
2. **Règles contextuelles (multi-nature)** — affine selon la nature de la dépense.
3. **Règles mots-clés** — classe selon des mots présents dans le libellé.
4. **Mapping comptes** — associe un compte ordonnateur à une famille par défaut.

À chaque niveau, un **aperçu dépliable des commandes concernées** permet de vérifier
l'effet d'une règle avant de l'appliquer. Les règles s'appliquent **en masse** sur l'OPEX et
le CAPEX.

---

## 9. Projection de fin d'année

Le module **Projection** extrapole la consommation restante par compte EPRD selon plusieurs
scénarios (linéaire, optimiste, central, pessimiste) et les visualise graphiquement. Le
**sélecteur de mois réalisés** de la Vue d'ensemble détermine la base de calcul (nombre de
mois considérés comme réalisés).

---

## 10. Rapport exécutif PDF & exports

- **Rapport exécutif** — depuis la Vue Stratégique, le bouton « Rapport exécutif » génère
  une **synthèse PDF** de pilotage. L'en-tête et le nom du fichier sont dérivés de l'identité
  d'établissement configurée.
- **Exports tableaux** — les tableaux (matrice, comptes, commandes…) sont exportables
  (CSV / XLSX selon les vues) pour retraitement externe.

---

## 11. Administration & paramètres

Ouvrez les **Paramètres** (icône en bas de la barre latérale ou **Ctrl + Shift + P**). Les
onglets disponibles :

| Onglet | Contenu |
|---|---|
| **Apparence** | Couleurs et thème de l'application. |
| **Navigation** | Visibilité et organisation des onglets de la barre latérale. |
| **Colonnes** | Colonnes affichées dans les tableaux OPEX / CAPEX. |
| **Colonnes personnalisées** | Ajout de colonnes sur mesure. |
| **Règles** | Seuils d'alerte (taux d'utilisation orange / rouge). |
| **Listes de choix** | Référentiels paramétrables : fournisseurs OPEX, catégories OPEX, enveloppes CAPEX (éditeur avec ajout, édition inline, suppression, déduplication). |
| **Utilisateurs** | Gestion des comptes, rôles, réinitialisation de mot de passe, et **bascule « Authentification requise »**. |
| **Logs** | Journal d'audit des actions. |
| **GitHub** | Synchronisation des données vers le dépôt de données (token, dépôt, branche). |
| **Source automatique** | Configuration de la mise à jour automatique depuis un fichier source (voir [§3.3](#33-mise-à-jour-automatique)). |
| **Données** | Opérations sur les données (réinitialisation, purge). |

**Tableaux de bord personnalisés.** Le bouton « + Nouveau tableau… » (bas de la barre
latérale) ouvre un constructeur de tableaux de bord avec widgets configurables.

**Synchronisation GitHub.** En production, l'application peut lire/écrire les fichiers JSON
du dépôt de données via l'API GitHub (activée par les variables `VITE_GITHUB_*` ou depuis
l'onglet GitHub). Pour des **données réelles**, utilisez un **dépôt privé**.

---

## 12. Sécurité & bonnes pratiques

- **Changez les mots de passe par défaut** (`admin` / `user`) dès la mise en service.
- **Données réelles → dépôt privé uniquement.** Ne publiez jamais d'extractions réelles dans
  un dépôt public ; excluez au besoin les fichiers opérationnels du versioning.
- **N'activez la désactivation de l'authentification** que sur un poste de confiance,
  jamais sur un déploiement partagé ou exposé sur un réseau.
- **⚠️ Mots de passe — durcissement requis avant tout déploiement réseau.** En mode
  navigateur / localStorage, les mots de passe sont **encodés en base64** (réversible), non
  hachés : acceptable pour une démo locale mono-poste, **insuffisant sur un réseau**. Pour
  une mise en production réseau, branchez le **backend Express/MongoDB** et implémentez un
  **hachage salé** (`bcrypt` / `argon2`) côté serveur, avec transport **HTTPS**. Voir la
  section « Sécurité » de [README.md](README.md) et de [backend/README.md](backend/README.md).

---

## 13. FAQ / dépannage

**L'assistant de configuration ne s'affiche pas.**
Il est ignoré si un backend est déjà configuré (variables `VITE_API_URL` / `VITE_GITHUB_*`)
ou si des données existent déjà. Pour le rejouer, repartez d'une installation neuve.

**La mise à jour automatique ne détecte rien.**
Elle ne fonctionne qu'en **mode serveur local** (`npm start`, `VITE_API_URL` défini) et
suppose un **chemin accessible** depuis le poste qui exécute le serveur, ainsi qu'un fichier
au **format canonique**.

**Un compte apparaît en double / orphelin.**
Vérifiez la casse et le format du code compte. Les clés sont normalisées, mais un import
antérieur mal formé peut subsister — la vue « Par comptes » et les Anomalies (comptes
orphelins) vous aident à repérer et corriger.

**Un pourcentage d'utilisation affiche « Budget non défini ».**
Le budget de l'exercice n'a pas encore été saisi : cliquez sur « Renseigner le budget »
(voir [§4](#4-renseigner-les-budgets)).

**Les données disparaissent après actualisation (F5).**
Vérifiez le mode de persistance : localStorage (navigateur), API locale, ou GitHub. En mode
API/GitHub, assurez-vous que le serveur ou la synchronisation est bien actif.

**Rien ne se sauvegarde en équipe / entre postes.**
Le mode localStorage est **local au navigateur**. Pour un partage, utilisez la
synchronisation **GitHub** (données) ou le **backend API**.

---

> Ce guide décrit la version **1.2**. Voir [CHANGELOG.md](CHANGELOG.md) pour l'historique
> des évolutions.
