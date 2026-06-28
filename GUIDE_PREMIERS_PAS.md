# Guide de démarrage — Premiers pas

Ce guide accompagne la première utilisation d'Hospifinance-IT après l'assistant
de configuration initiale. Il est aussi consultable **dans l'application** : une
fenêtre de bienvenue s'affiche au premier lancement, et le bouton d'aide flottant
(en bas à droite) rouvre ce guide à tout moment.

---

## 1. Importer vos données

1. Depuis la **Vue d'ensemble**, cliquez sur **« Importer un fichier de commandes »**.
2. Dans la fenêtre d'import, **téléchargez le fichier exemple** : un classeur Excel
   avec les colonnes attendues, des lignes de démonstration et un onglet « Notice ».
3. Remplacez les lignes de démo par vos données réelles, exportées depuis **votre**
   logiciel (MAGH2, EPSILON, CPAGE, SAGE, Qualiac…) puis mises à ce format canonique.
4. Réimportez le fichier : la classification OPEX / CAPEX, le regroupement par
   fournisseur et le reclassement analytique sont **automatiques**.

## 2. Définir vos budgets

- Cliquez sur **« Renseigner le budget »** en haut de la Vue d'ensemble pour saisir le
  **budget EPRD** par compte ordonnateur (également accessible via le module
  **« Par comptes »**).
- Le **budget CAPEX** se saisit **par exercice** — chaque année conserve son enveloppe.
- Les **seuils d'alerte** (taux d'utilisation orange / rouge) se règlent dans
  **Paramètres → Règles**.

## 3. Affiner le reclassement analytique

- Le module **« Reclassement »** associe chaque fournisseur ou nature à une **famille
  analytique**.
- Définissez des **règles** (par fournisseur, par nature ou par mot-clé) ; elles
  s'appliquent en masse sur l'OPEX et le CAPEX.

## 4. Piloter et analyser

- La **Vue d'ensemble** propose deux modes : **Stratégique** (KPIs, atterrissage,
  treemap, comparaison pluriannuelle) et **Opérationnel** (suivi mensuel).
- Utilisez le **sélecteur d'exercice** et le **sélecteur de mois réalisés** pour cadrer
  les projections.
- Modules d'analyse : Vue analytique (drill-down), Par comptes vs EPRD, Matrice
  Familles × Comptes, Anomalies, Éditeurs, Rapprochement Commandes / Comptabilité,
  Projection fin d'année.
- Le bouton **« Rapport exécutif »** génère une synthèse **PDF**.

## 5. Personnaliser l'application

- Ouvrez les **Paramètres** (icône en bas de la barre latérale, ou raccourci
  **Ctrl + Shift + P**).
- Vous y gérez : apparence et couleurs, colonnes affichées, listes de choix
  (fournisseurs, catégories, enveloppes), règles d'alerte, comptes utilisateurs,
  synchronisation GitHub et journal d'audit.
- La barre latérale est réorganisable, repliable, et chaque section / onglet est
  renommable (crayon au survol).

## 6. Sécurité & données réelles

- **Changez les mots de passe par défaut** (`admin` / `user`) dès la mise en service.
- Pour des **données réelles** d'établissement, utilisez un **dépôt de données privé**
  (jamais public).
- Rôles disponibles : **superadmin**, **admin**, **user** — chacun avec ses permissions.

---

> Pour adapter l'identité de l'établissement, les logiciels sources ou le mode de
> données après coup, voir le `README.md` (section « Adapter l'application »).
