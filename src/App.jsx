/**
 * Composant principal de l'application Hospifinance-IT
 * Tableau de bord financier DSI générique — v1.0
 */

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { DollarSign, Server, FileUp, Wallet } from 'lucide-react';
import { useDashboardData } from './hooks/useDashboardData';
import { DashboardBuilder } from './components/dashboard-builder/DashboardBuilder';
import { CreateDashboardModal } from './components/dashboard-builder/CreateDashboardModal';

// Contextes
import { useAuth } from './contexts/AuthContext';
import { usePermissions } from './contexts/PermissionsContext';
import { useSettings } from './contexts/SettingsContext';

// Hooks
import { useOpexData } from './hooks/useOpexData';
import { useCapexData } from './hooks/useCapexData';
import { useOrderData } from './hooks/useOrderData';
import { useSettingsShortcut } from './hooks/useSettingsShortcut';
import {
  useOpexTotals,
  useCapexTotals,
  useConsolidatedTotals
} from './hooks/useBudgetCalculations';

// Composants
import { LoginPage } from './components/auth/LoginPage';
import { ChangePasswordButton } from './components/auth/ChangePasswordButton';
import { SettingsPanel } from './components/settings/SettingsPanel';
import SidebarNavigation from './components/dashboard/SidebarNavigation';
import { BudgetCharts } from './components/dashboard/BudgetCharts';
import { BudgetCard } from './components/dashboard/BudgetCard';
import { OpexTable } from './components/opex/OpexTable';
import { OpexModal } from './components/opex/OpexModal';
import { CapexTable } from './components/capex/CapexTable';
import { CapexModal } from './components/capex/CapexModal';
import { OrderTable } from './components/orders/OrderTable';
import DetailsCommandes from './components/orders/DetailsCommandes';
import { OrderModal } from './components/orders/OrderModal';
import { AlertBanner } from './components/common/AlertBanner';
import ImportModal from './components/common/ImportModal';
import VueAnalytiqueIT from './components/analytique/VueAnalytiqueIT';
import AnomaliesPanel from './components/analytique/AnomaliesPanel';
import ProjectionPage from './components/projection/ProjectionPage';
import VueComptes from './components/analytique/VueComptes';
import MatriceFamillesComptes from './components/analytique/MatriceFamillesComptes';
import EprdBudgetEditor from './components/analytique/EprdBudgetEditor';
import ReclassementPage from './components/reclassement/ReclassementPage';
import ReconciliationPage from './components/reconciliation/ReconciliationPage';
import AnalyseEditeurs from './components/editeurs/AnalyseEditeurs';
import NoticeVueEnsemble from './components/dashboard/NoticeVueEnsemble';
import ComparaisonAnnuelle from './components/dashboard/ComparaisonAnnuelle';
import { EPRD_STATIC } from './constants/analytiqueConstants';
import { wasSetupViaWizard } from './config/runtimeConfig';
import { useReclassementData } from './hooks/useReclassementData';
import { listExercices, suppliersForYear, projectsForYear, ordersForYear } from './utils/yearCalculations';
import { normalizeCompte } from './utils/compte';

const HospitalITFinanceDashboard = () => {
  const { user, logout, loading: authLoading } = useAuth();
  const permissions = usePermissions();
  const { settings, setIsSettingsOpen, addDashboard, addOpexSupplier, addOpexCategory } = useSettings();
  const { handleTitleClick } = useSettingsShortcut();

  // États pour les onglets
  const [activeTab, setActiveTab] = useState('overview');

  // États pour les modales OPEX
  const [showOpexModal, setShowOpexModal] = useState(false);
  const [editingOpex, setEditingOpex] = useState(null);

  // États pour les modales CAPEX
  const [showCapexModal, setShowCapexModal] = useState(false);
  const [editingCapex, setEditingCapex] = useState(null);

  // États pour les modales Commandes
  const [showOpexOrderModal, setShowOpexOrderModal] = useState(false);
  const [editingOpexOrder, setEditingOpexOrder] = useState(null);
  const [showCapexOrderModal, setShowCapexOrderModal] = useState(false);
  const [editingCapexOrder, setEditingCapexOrder] = useState(null);

  // Refs pour éviter les closures stale dans les handlers async
  // Synchronisés immédiatement dans les handlers add/edit (pas via useEffect)
  const editingOpexRef = useRef(null);
  const editingCapexRef = useRef(null);
  const editingOpexOrderRef = useRef(null);
  const editingCapexOrderRef = useRef(null);

  // Hooks de données OPEX
  const {
    suppliers,
    loading: opexLoading,
    error: opexError,
    addSupplier,
    updateSupplier,
    deleteSupplier,
    clearAll: clearAllOpex,
    replaceAllSuppliers,
    setError: setOpexError
  } = useOpexData();

  // Hooks de données CAPEX
  const {
    projects,
    loading: capexLoading,
    error: capexError,
    addProject,
    updateProject,
    deleteProject,
    calculateEnveloppeTotal,
    getUsedEnveloppes,
    clearAll: clearAllCapex,
    replaceAllProjects,
    setError: setCapexError
  } = useCapexData();

  // Hooks de données Commandes
  const {
    orders: opexOrders,
    loading: opexOrdersLoading,
    error: opexOrdersError,
    addOrder: addOpexOrder,
    updateOrder: updateOpexOrder,
    deleteOrder: deleteOpexOrder,
    clearAll: clearAllOpexOrders,
    replaceAllOrders: replaceAllOpexOrders,
    setError: setOpexOrdersError
  } = useOrderData('opex');

  const {
    orders: capexOrders,
    loading: capexOrdersLoading,
    error: capexOrdersError,
    addOrder: addCapexOrder,
    updateOrder: updateCapexOrder,
    deleteOrder: deleteCapexOrder,
    clearAll: clearAllCapexOrders,
    replaceAllOrders: replaceAllCapexOrders,
    setError: setCapexOrdersError
  } = useOrderData('capex');

  // Données EPRD — vierges si l'app a été initialisée via l'assistant (vraie
  // install neuve), sinon données de démonstration (mode API / découverte).
  const [eprdData, setEprdData] = useState(() => (wasSetupViaWizard() ? [] : EPRD_STATIC));

  // Persistance centralisée de l'EPRD (corrige la persistance localStorage et
  // permet l'ajout de comptes depuis l'éditeur).
  const persistEprd = useCallback((rows) => {
    setEprdData(rows);
    try { localStorage.setItem('hospifinance_eprd', JSON.stringify(rows)); } catch (_e) { /* storage indisponible */ }
  }, []);

  // Comptes présents dans les données importées (réel) — sert de garde-fou à la
  // saisie EPRD : autocomplétion + alerte si un compte saisi n'a aucun réel.
  const knownComptes = useMemo(() => {
    const m = new Map();
    const add = (compte, libelle) => {
      const c = normalizeCompte(compte);
      if (!c) return;
      const cur = m.get(c);
      if (!cur) m.set(c, { compte: c, libelle: libelle || '' });
      else if (libelle && !cur.libelle) cur.libelle = libelle;
    };
    suppliers.forEach(s => add(s.compteOrdonnateur, s.libelleCompte || s.category));
    projects.forEach(p => add(p.compteOrdonnateur, p.libelleCompte));
    return [...m.values()];
  }, [suppliers, projects]);

  // Mois réalisés — état global partagé entre overview et projection (défaut : année complète)
  const [nbMoisRealises, setNbMoisRealises] = useState(12);

  // Budget CAPEX par exercice (le logiciel source n'exporte pas le budget) — saisi manuellement.
  // Migration automatique depuis l'ancienne clé unique `hospifinance_capex_budget_global`.
  const [capexBudgets, setCapexBudgets] = useState(() => {
    try {
      const stored = localStorage.getItem('hospifinance_capex_budgets');
      if (stored) return JSON.parse(stored) || {};
      const legacy = Number(localStorage.getItem('hospifinance_capex_budget_global')) || 0;
      if (legacy > 0) {
        const migrated = { [String(new Date().getFullYear())]: legacy };
        localStorage.setItem('hospifinance_capex_budgets', JSON.stringify(migrated));
        return migrated;
      }
      return {};
    } catch { return {}; }
  });

  // Budget CAPEX consolidé (toutes années) — pour les vues non filtrées par exercice
  const capexBudgetTotal = useMemo(
    () => Object.values(capexBudgets).reduce((s, v) => s + (Number(v) || 0), 0),
    [capexBudgets]
  );

  // Vue de pilotage (Stratégique / Opérationnel) — remontée pour conditionner les blocs ci-dessous
  const [pilotageView, setPilotageView] = useState('strategic');

  // Calculs mémorisés avec impact des commandes (toutes données — autres onglets)
  const opexTotals = useOpexTotals(suppliers, opexOrders, eprdData);
  const capexTotals = useCapexTotals(projects, capexOrders, capexBudgetTotal);
  const consolidatedTotals = useConsolidatedTotals(opexTotals, capexTotals);

  // ── Vue d'ensemble : sélection d'exercice + comparaison N / N-1 / N-2 ──────
  // Liste des exercices présents dans les commandes (+ année courante garantie)
  const exercices = useMemo(() => {
    const found = listExercices(opexOrders, capexOrders);
    const current = String(new Date().getFullYear());
    return found.includes(current) ? found : [current, ...found];
  }, [opexOrders, capexOrders]);

  const [anneeSelectionnee, setAnneeSelectionnee] = useState(() => String(new Date().getFullYear()));

  // Budget CAPEX de l'exercice sélectionné + saisie qui écrit sur cette année
  const capexBudgetYear = Number(capexBudgets[anneeSelectionnee]) || 0;
  const handleCapexBudgetChange = (val) => {
    setCapexBudgets(prev => {
      const next = { ...prev, [anneeSelectionnee]: val };
      try { localStorage.setItem('hospifinance_capex_budgets', JSON.stringify(next)); } catch (_e) { /* storage indisponible */ }
      return next;
    });
  };

  // Budget EPRD restreint à l'exercice sélectionné (lignes sans `annee` = valables pour tous)
  const eprdForYear = useMemo(
    () => eprdData.filter(e => !e.annee || String(e.annee) === String(anneeSelectionnee)),
    [eprdData, anneeSelectionnee]
  );

  // Si l'année sélectionnée n'existe plus dans les données, revenir à la plus récente
  useEffect(() => {
    if (exercices.length > 0 && !exercices.includes(anneeSelectionnee)) {
      setAnneeSelectionnee(exercices[0]);
    }
  }, [exercices, anneeSelectionnee]);

  // Agrégats recalculés pour l'année sélectionnée (à partir des commandes)
  const suppliersYear = useMemo(
    () => suppliersForYear(suppliers, opexOrders, anneeSelectionnee),
    [suppliers, opexOrders, anneeSelectionnee]
  );
  const projectsYear = useMemo(
    () => projectsForYear(projects, capexOrders, anneeSelectionnee),
    [projects, capexOrders, anneeSelectionnee]
  );
  const opexOrdersYear = useMemo(
    () => ordersForYear(opexOrders, anneeSelectionnee),
    [opexOrders, anneeSelectionnee]
  );
  const capexOrdersYear = useMemo(
    () => ordersForYear(capexOrders, anneeSelectionnee),
    [capexOrders, anneeSelectionnee]
  );

  const opexTotalsYear = useOpexTotals(suppliersYear, opexOrdersYear, eprdForYear);
  const capexTotalsYear = useCapexTotals(projectsYear, capexOrdersYear, capexBudgetYear);
  const consolidatedTotalsYear = useConsolidatedTotals(opexTotalsYear, capexTotalsYear);

  // Moteur de reclassement analytique
  const {
    moteur,
    loading: reclassementLoading,
    error: reclassementError,
    addFournisseur,
    updateFournisseur,
    deleteFournisseur,
    addRegleMultiNature,
    updateRegleMultiNature,
    deleteRegleMultiNature,
    reorderReglesMultiNature,
    addRegleMosCles,
    updateRegleMosCles,
    deleteRegleMosCles,
    reorderReglesMosCles,
    updateMappingCompte,
  } = useReclassementData();
  useEffect(() => {
    const apiUrl = import.meta.env.VITE_API_URL;
    if (apiUrl) {
      fetch(`${apiUrl}/eprd`)
        .then(r => r.ok ? r.json() : null)
        .then(data => { if (Array.isArray(data) && data.length > 0) setEprdData(data); })
        .catch(() => {});
    } else {
      try {
        const stored = localStorage.getItem('hospifinance_eprd');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) setEprdData(parsed);
        }
      } catch (_e) { /* données EPRD localStorage invalides */ }
    }
  }, []);

  // Handler reclassement bulk OPEX — met à jour familleAnalytique sur l'objet complet (pas de patch partiel)
  const handleApplyReclassement = useCallback(async (enrichedSuppliers) => {
    for (const s of enrichedSuppliers) {
      await updateSupplier(s.id, { ...s });
    }
  }, [updateSupplier]);

  // Handler reclassement bulk CAPEX — même moteur, appliqué aux projets
  const handleApplyReclassementCapex = useCallback(async (enrichedProjects) => {
    for (const p of enrichedProjects) {
      await updateProject(p.id, { ...p });
    }
  }, [updateProject]);

  // Handler import des commandes (XLSX/CSV) (reçu depuis ImportModal via OpexTable)
  // MODE REPLACE : remplace toutes les données existantes (pas d'accumulation)
  const handleSageImport = useCallback(async (parsed) => {
    const { opexSuppliers = [], opexOrders = [], capexProjects = [], capexOrders = [] } = parsed;

    // OPEX : remplacement complet (suppliers + orders)
    await replaceAllSuppliers(opexSuppliers);
    opexSuppliers.forEach(s => {
      if (s.supplier) addOpexSupplier(s.supplier);
      if (s.category) addOpexCategory(s.category);
    });
    replaceAllOpexOrders(opexOrders);

    // CAPEX : remplacement complet
    if (capexProjects.length > 0) {
      await replaceAllProjects(capexProjects);
      replaceAllCapexOrders(capexOrders);
    }
  }, [replaceAllSuppliers, replaceAllOpexOrders, replaceAllProjects, replaceAllCapexOrders, addOpexSupplier, addOpexCategory]);

  // Dashboard builder data
  const dashboardData = useDashboardData({
    suppliers, projects, opexOrders, capexOrders,
    opexTotals, capexTotals, consolidatedTotals
  });

  // État pour la modale de création de dashboard
  const [showCreateDashboard, setShowCreateDashboard] = useState(false);

  // État pour l'éditeur EPRD
  const [showEprdEditor, setShowEprdEditor] = useState(false);

  // Ouverture de l'éditeur de budget EPRD déclenchée depuis l'extérieur
  // (fenêtre de bienvenue, accompagnement…) via un événement global.
  useEffect(() => {
    const openBudget = () => { setActiveTab('overview'); setShowEprdEditor(true); };
    window.addEventListener('hospifinance:open-budget', openBudget);
    return () => window.removeEventListener('hospifinance:open-budget', openBudget);
  }, []);

  // État pour l'import des commandes global (page d'accueil)
  const [showSageImport, setShowSageImport] = useState(false);

  const handleCreateDashboard = useCallback((name) => {
    const id = `dash_${Date.now()}`;
    addDashboard({ id, name, widgets: [] });
    setActiveTab(`custom_${id}`);
  }, [addDashboard]);

  // Handlers OPEX
  const handleAddOpex = useCallback(() => {
    editingOpexRef.current = null;
    setEditingOpex(null);
    setShowOpexModal(true);
  }, []);

  const handleEditOpex = useCallback((supplier) => {
    editingOpexRef.current = supplier;
    setEditingOpex(supplier);
    setShowOpexModal(true);
  }, []);

  const handleSaveOpex = useCallback(
    async (data) => {
      const current = editingOpexRef.current;
      const result = current
        ? await updateSupplier(current.id, data)
        : await addSupplier(data);

      if (result.success) {
        setShowOpexModal(false);
        setEditingOpex(null);
      } else {
        setOpexError(result.errors ? result.errors.join(', ') : 'Erreur lors de la sauvegarde');
      }
    },
    [addSupplier, updateSupplier, setOpexError]
  );

  const handleDeleteOpex = useCallback(
    (id) => { deleteSupplier(id); },
    [deleteSupplier]
  );

  const handleImportOpex = useCallback(
    (supplierData) => {
      addSupplier(supplierData);
    },
    [addSupplier]
  );

  // Handlers CAPEX
  const handleAddCapex = useCallback(() => {
    editingCapexRef.current = null;
    setEditingCapex(null);
    setShowCapexModal(true);
  }, []);

  const handleEditCapex = useCallback((project) => {
    editingCapexRef.current = project;
    setEditingCapex(project);
    setShowCapexModal(true);
  }, []);

  const handleSaveCapex = useCallback(
    async (data) => {
      const current = editingCapexRef.current;
      const result = current
        ? await updateProject(current.id, data)
        : await addProject(data);

      if (result.success) {
        setShowCapexModal(false);
        setEditingCapex(null);
      } else {
        setCapexError(result.errors ? result.errors.join(', ') : 'Erreur lors de la sauvegarde');
      }
    },
    [addProject, updateProject, setCapexError]
  );

  const handleDeleteCapex = useCallback(
    (id) => { deleteProject(id); },
    [deleteProject]
  );

  const handleImportCapex = useCallback(
    (projectData) => {
      addProject(projectData);
    },
    [addProject]
  );

  // Handlers Commandes OPEX
  const handleAddOpexOrder = useCallback(() => {
    editingOpexOrderRef.current = null;
    setEditingOpexOrder(null);
    setShowOpexOrderModal(true);
  }, []);

  const handleEditOpexOrder = useCallback((order) => {
    editingOpexOrderRef.current = order;
    setEditingOpexOrder(order);
    setShowOpexOrderModal(true);
  }, []);

  const handleSaveOpexOrder = useCallback(
    async (data) => {
      const current = editingOpexOrderRef.current;
      const result = current
        ? await updateOpexOrder(current.id, data)
        : await addOpexOrder(data);

      if (result.success) {
        setShowOpexOrderModal(false);
        setEditingOpexOrder(null);
      } else {
        setOpexOrdersError(result.errors ? result.errors.join(', ') : 'Erreur lors de la sauvegarde');
      }
    },
    [addOpexOrder, updateOpexOrder, setOpexOrdersError]
  );

  const handleDeleteOpexOrder = useCallback(
    (id) => { deleteOpexOrder(id); },
    [deleteOpexOrder]
  );

  // Handlers Commandes CAPEX
  const handleAddCapexOrder = useCallback(() => {
    editingCapexOrderRef.current = null;
    setEditingCapexOrder(null);
    setShowCapexOrderModal(true);
  }, []);

  const handleEditCapexOrder = useCallback((order) => {
    editingCapexOrderRef.current = order;
    setEditingCapexOrder(order);
    setShowCapexOrderModal(true);
  }, []);

  const handleSaveCapexOrder = useCallback(
    async (data) => {
      const current = editingCapexOrderRef.current;
      const result = current
        ? await updateCapexOrder(current.id, data)
        : await addCapexOrder(data);

      if (result.success) {
        setShowCapexOrderModal(false);
        setEditingCapexOrder(null);
      } else {
        setCapexOrdersError(result.errors ? result.errors.join(', ') : 'Erreur lors de la sauvegarde');
      }
    },
    [addCapexOrder, updateCapexOrder, setCapexOrdersError]
  );

  const handleDeleteCapexOrder = useCallback(
    (id) => { deleteCapexOrder(id); },
    [deleteCapexOrder]
  );

  // Chargement auth
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Initialisation...</p>
        </div>
      </div>
    );
  }

  // Page de login si non connecté
  if (!user) {
    return <LoginPage />;
  }

  // Chargement des données
  if (opexLoading || capexLoading || opexOrdersLoading || capexOrdersLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement des données...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar navigation */}
      <SidebarNavigation
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onCreateDashboard={() => setShowCreateDashboard(true)}
        appName={settings.appName}
        username={user.username}
        onSettings={() => setIsSettingsOpen(true)}
        onLogout={logout}
        canAccessSettings={permissions.canAccessSettings}
      />

      {/* Contenu principal */}
      <div className="flex-1 min-w-0 overflow-auto">
        <div className="p-3 sm:p-4 md:p-6">
          {/* En-tête compact */}
          <div className="mb-4 sm:mb-6 flex items-center justify-between gap-3">
            <div onClick={handleTitleClick} className="cursor-default select-none">
              <p className="text-xs text-gray-500">
                Suivi budgétaire OPEX &amp; CAPEX — {anneeSelectionnee}
              </p>
            </div>
            <ChangePasswordButton />
          </div>

          {/* Alertes d'erreur */}
          {opexError && (
            <AlertBanner type="error" message={opexError} className="mb-4" />
          )}
          {capexError && (
            <AlertBanner type="error" message={capexError} className="mb-4" />
          )}
          {opexOrdersError && (
            <AlertBanner type="error" message={opexOrdersError} className="mb-4" />
          )}
          {capexOrdersError && (
            <AlertBanner type="error" message={capexOrdersError} className="mb-4" />
          )}

          {/* Vue d'ensemble */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Barre de contrôle : exercice + mois réalisés + Notice + Import */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3 flex-wrap">
                {/* Sélecteur d'exercice */}
                <div className="flex items-center gap-3 bg-white border-2 border-indigo-300 rounded-xl px-4 py-2.5 shadow-sm">
                  <span className="text-sm font-semibold text-indigo-700 whitespace-nowrap">Exercice :</span>
                  <select
                    value={anneeSelectionnee}
                    onChange={e => setAnneeSelectionnee(e.target.value)}
                    className="bg-transparent text-sm font-bold text-indigo-800 focus:outline-none cursor-pointer"
                  >
                    {exercices.map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
                {/* Sélecteur de mois réalisés */}
                <div className="flex items-center gap-3 bg-white border-2 border-blue-300 rounded-xl px-4 py-2.5 shadow-sm">
                  <span className="text-sm font-semibold text-blue-700 whitespace-nowrap">Mois réalisés :</span>
                  <select
                    value={nbMoisRealises}
                    onChange={e => setNbMoisRealises(Number(e.target.value))}
                    className="bg-transparent text-sm font-bold text-blue-800 focus:outline-none cursor-pointer"
                  >
                    {['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'].map((m, i) => (
                      <option key={i + 1} value={i + 1}>{i + 1} — Jan → {m}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <NoticeVueEnsemble />
                <button
                  onClick={() => setShowEprdEditor(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg shadow-sm transition-colors"
                >
                  <Wallet size={16} />
                  Renseigner le budget
                </button>
                <button
                  onClick={() => setShowSageImport(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg shadow-sm transition-colors"
                >
                  <FileUp size={16} />
                  Importer un fichier de commandes
                </button>
              </div>
            </div>

            {/* Pilotage budgétaire en premier — données de l'exercice sélectionné */}
            <BudgetCharts
              opexTotals={opexTotalsYear}
              capexTotals={capexTotalsYear}
              consolidatedTotals={consolidatedTotalsYear}
              suppliers={suppliersYear}
              projects={projectsYear}
              opexOrders={opexOrdersYear}
              capexOrders={capexOrdersYear}
              nbMoisRealises={nbMoisRealises}
              annee={anneeSelectionnee}
              eprd={eprdForYear}
              view={pilotageView}
              onViewChange={setPilotageView}
            />

            {/* Blocs réservés à la vue Stratégique */}
            {pilotageView === 'strategic' && (
              <>
                {/* Comparaison pluriannuelle */}
                <ComparaisonAnnuelle
                  annee={anneeSelectionnee}
                  opexOrders={opexOrders}
                  capexOrders={capexOrders}
                />
                {/* Détail OPEX / CAPEX sous le pilotage */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <BudgetCard
                    title="OPEX - Dépenses d'exploitation"
                    icon={DollarSign}
                    totals={opexTotalsYear}
                    iconColor="text-blue-500"
                    warningThreshold={settings.rules.warningThreshold}
                    criticalThreshold={settings.rules.criticalThreshold}
                    nbMoisRealises={nbMoisRealises}
                  />
                  <BudgetCard
                    title="CAPEX - Investissements"
                    icon={Server}
                    totals={capexTotalsYear}
                    iconColor="text-green-500"
                    warningThreshold={settings.rules.warningThreshold}
                    criticalThreshold={settings.rules.criticalThreshold}
                    nbMoisRealises={nbMoisRealises}
                    budgetGlobal={capexBudgetYear}
                    onBudgetGlobalChange={handleCapexBudgetChange}
                  />
                </div>
              </>
            )}
          </div>
        )}

        {/* Onglet OPEX */}
        {activeTab === 'opex' && (
          <OpexTable
            suppliers={suppliers}
            totals={opexTotals}
            orders={opexOrders}
            onEdit={handleEditOpex}
            onDelete={handleDeleteOpex}
            onAdd={handleAddOpex}
            onImport={handleImportOpex}
            onSageImport={handleSageImport}
            moteur={moteur}
            columnVisibility={settings.opexColumns}
          />
        )}

        {/* Onglet CAPEX */}
        {activeTab === 'capex' && (
          <CapexTable
            projects={projects}
            totals={capexTotals}
            orders={capexOrders}
            onEdit={handleEditCapex}
            onDelete={handleDeleteCapex}
            onAdd={handleAddCapex}
            onImport={handleImportCapex}
            calculateEnveloppeTotal={calculateEnveloppeTotal}
            getUsedEnveloppes={getUsedEnveloppes}
            columnVisibility={settings.capexColumns}
          />
        )}

        {/* Onglet Détails commandes (vue unifiée) */}
        {activeTab === 'commandes' && (
          <DetailsCommandes
            opexOrders={opexOrders}
            capexOrders={capexOrders}
            suppliers={suppliers}
            projects={projects}
          />
        )}

        {/* Onglet Commandes OPEX */}
        {activeTab === 'ordersOpex' && (
          <OrderTable
            orders={opexOrders}
            parentItems={suppliers}
            parentLabel="Fournisseur"
            parentNameKey="supplier"
            type="opex"
            onEdit={handleEditOpexOrder}
            onDelete={handleDeleteOpexOrder}
            onAdd={handleAddOpexOrder}
          />
        )}

        {/* Onglet Commandes CAPEX */}
        {activeTab === 'ordersCapex' && (
          <OrderTable
            orders={capexOrders}
            parentItems={projects}
            parentLabel="Projet"
            parentNameKey="project"
            type="capex"
            onEdit={handleEditCapexOrder}
            onDelete={handleDeleteCapexOrder}
            onAdd={handleAddCapexOrder}
          />
        )}

        {/* Onglet Vue analytique OPEX */}
        {activeTab === 'analytique' && (
          <VueAnalytiqueIT suppliers={suppliers} orders={opexOrders} capexOrders={capexOrders} projects={projects} moteur={moteur} />
        )}

        {/* Onglet Anomalies */}
        {activeTab === 'anomalies' && (
          <AnomaliesPanel suppliers={suppliers} orders={opexOrders} eprd={eprdData} projects={projects} />
        )}

        {/* Onglet Projection */}
        {activeTab === 'projection' && (
          <ProjectionPage suppliers={suppliers} orders={opexOrders} eprd={eprdData} />
        )}

        {/* Onglet Vue par comptes */}
        {activeTab === 'comptes' && (
          <VueComptes suppliers={suppliers} projects={projects} eprd={eprdData} opexOrders={opexOrders} capexOrders={capexOrders} capexBudgetGlobal={capexBudgetTotal} />
        )}

        {/* Onglet Matrice Familles × Comptes */}
        {activeTab === 'matrice' && (
          <MatriceFamillesComptes suppliers={suppliers} moteur={moteur} eprd={eprdData} orders={opexOrders} projects={projects} capexOrders={capexOrders} />
        )}

        {/* Onglet Reclassement analytique */}
        {activeTab === 'reclassement' && (
          <ReclassementPage
            moteur={moteur}
            loading={reclassementLoading}
            error={reclassementError}
            suppliers={suppliers}
            projects={projects}
            opexOrders={opexOrders}
            capexOrders={capexOrders}
            onAddFournisseur={addFournisseur}
            onUpdateFournisseur={updateFournisseur}
            onDeleteFournisseur={deleteFournisseur}
            onAddRegleMultiNature={addRegleMultiNature}
            onUpdateRegleMultiNature={updateRegleMultiNature}
            onDeleteRegleMultiNature={deleteRegleMultiNature}
            onReorderReglesMultiNature={reorderReglesMultiNature}
            onAddRegleMosCles={addRegleMosCles}
            onUpdateRegleMosCles={updateRegleMosCles}
            onDeleteRegleMosCles={deleteRegleMosCles}
            onReorderReglesMosCles={reorderReglesMosCles}
            onUpdateMappingCompte={updateMappingCompte}
            onApplyReclassement={handleApplyReclassement}
            onApplyReclassementCapex={handleApplyReclassementCapex}
          />
        )}

        {/* Onglet Analyse éditeurs */}
        {activeTab === 'editeurs' && (
          <AnalyseEditeurs
            suppliers={suppliers}
            opexOrders={opexOrders}
            projects={projects}
            capexOrders={capexOrders}
          />
        )}

        {/* Onglet Rapprochement Commandes / Comptabilité */}
        {activeTab === 'reconciliation' && (
          <ReconciliationPage suppliers={suppliers} />
        )}

        {/* Dashboards custom */}
        {activeTab.startsWith('custom_') && (
          <DashboardBuilder
            dashboardId={activeTab.replace('custom_', '')}
            dashboardData={dashboardData}
            onDeleteDashboard={() => setActiveTab('overview')}
          />
        )}

        {/* Modales OPEX */}
        <OpexModal
          isOpen={showOpexModal}
          onClose={() => {
            setShowOpexModal(false);
            setEditingOpex(null);
            setOpexError(null);
          }}
          onSave={handleSaveOpex}
          editingSupplier={editingOpex}
        />

        {/* Modales CAPEX */}
        <CapexModal
          isOpen={showCapexModal}
          onClose={() => {
            setShowCapexModal(false);
            setEditingCapex(null);
            setCapexError(null);
          }}
          onSave={handleSaveCapex}
          editingProject={editingCapex}
        />

        {/* Modale Commandes OPEX */}
        <OrderModal
          isOpen={showOpexOrderModal}
          onClose={() => {
            setShowOpexOrderModal(false);
            setEditingOpexOrder(null);
            setOpexOrdersError(null);
          }}
          onSave={handleSaveOpexOrder}
          editingOrder={editingOpexOrder}
          parentItems={suppliers}
          parentLabel="Fournisseur"
          parentNameKey="supplier"
        />

        {/* Modale Commandes CAPEX */}
        <OrderModal
          isOpen={showCapexOrderModal}
          onClose={() => {
            setShowCapexOrderModal(false);
            setEditingCapexOrder(null);
            setCapexOrdersError(null);
          }}
          onSave={handleSaveCapexOrder}
          editingOrder={editingCapexOrder}
          parentItems={projects}
          parentLabel="Projet"
          parentNameKey="project"
        />

        {/* Import des commandes — page d'accueil */}
        <ImportModal
          isOpen={showSageImport}
          onClose={() => setShowSageImport(false)}
          onCommandesImport={handleSageImport}
          title="Importer un fichier de commandes"
          type="opex"
          moteur={moteur}
        />

        {/* Éditeur EPRD */}
        {showEprdEditor && (
          <EprdBudgetEditor
            eprd={eprdData}
            annee={anneeSelectionnee}
            knownComptes={knownComptes}
            onChange={persistEprd}
            onClose={() => setShowEprdEditor(false)}
          />
        )}

        {/* Modale création de dashboard */}
        <CreateDashboardModal
          isOpen={showCreateDashboard}
          onClose={() => setShowCreateDashboard(false)}
          onSave={handleCreateDashboard}
        />

        {/* Panneau de paramétrage */}
        <SettingsPanel
          onClearOpex={() => { clearAllOpex(); clearAllOpexOrders(); }}
          onClearCapex={() => { clearAllCapex(); clearAllCapexOrders(); }}
          onRenameEnveloppe={(oldName, newName) => {
            projects.forEach(p => {
              if (p.enveloppe === oldName) updateProject(p.id, { ...p, enveloppe: newName });
            });
          }}
          onRenameOpexSupplier={(oldName, newName) => {
            suppliers.forEach(s => {
              if (s.supplier === oldName) updateSupplier(s.id, { ...s, supplier: newName });
            });
          }}
          onRenameOpexCategory={(oldName, newName) => {
            suppliers.forEach(s => {
              if (s.category === oldName) updateSupplier(s.id, { ...s, category: newName });
            });
          }}
        />
      </div>
    </div>
  </div>
  );
};

export default HospitalITFinanceDashboard;
