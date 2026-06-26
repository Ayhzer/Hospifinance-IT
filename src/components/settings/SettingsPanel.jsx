/**
 * Panneau de paramétrage caché - Accessible via Ctrl+Shift+P
 */

import { useState } from 'react';
import { Settings, Palette, Columns, Shield, Users, RotateCcw, Save, FileText, Trash2, Github, RefreshCw, Upload, CheckCircle, XCircle, Database, AlertTriangle, Pencil, Plus, X, Eye, EyeOff, PanelLeft } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { useSettings } from '../../contexts/SettingsContext';
import { useAuth } from '../../contexts/AuthContext';
import { usePermissions } from '../../contexts/PermissionsContext';
import CustomColumnsManager from './CustomColumnsManager';
import { NAV_TABS } from '../dashboard/SidebarNavigation';
import * as github from '../../services/githubStorageService';
import { loadOpexData, loadCapexData, loadOpexOrders, loadCapexOrders, loadAuthUsers, loadSettings } from '../../services/storageService';

const SETTINGS_TABS = [
  { id: 'appearance', label: 'Apparence', icon: Palette },
  { id: 'navigation', label: 'Navigation', icon: PanelLeft },
  { id: 'columns', label: 'Colonnes', icon: Columns },
  { id: 'customColumns', label: 'Colonnes personnalisées', icon: Columns },
  { id: 'rules', label: 'Règles', icon: Shield },
  { id: 'listes', label: 'Listes de choix', icon: Shield },
  { id: 'users', label: 'Utilisateurs', icon: Users },
  { id: 'logs', label: 'Logs', icon: FileText },
  { id: 'github', label: 'GitHub', icon: Github },
  { id: 'data', label: 'Données', icon: Database },
];

const COLOR_LABELS = {
  primary: 'Couleur principale',
  success: 'Succès / Disponible',
  warning: 'Avertissement',
  danger: 'Danger / Critique',
  info: 'Information',
  accent: 'Accent'
};

const OPEX_COLUMN_LABELS = {
  supplier: 'Fournisseur',
  category: 'Catégorie',
  budgetAnnuel: 'Budget annuel',
  depenseActuelle: 'Dépensé',
  engagement: 'Engagé',
  disponible: 'Disponible',
  utilisation: 'Utilisation',
  notes: 'Notes',
  actions: 'Actions'
};

const CAPEX_COLUMN_LABELS = {
  project: 'Projet',
  budgetTotal: 'Budget total',
  depense: 'Dépensé',
  engagement: 'Engagé',
  disponible: 'Disponible',
  utilisation: 'Utilisation',
  status: 'Statut',
  period: 'Période',
  notes: 'Notes',
  actions: 'Actions'
};

const ROLE_LABELS = {
  superadmin: 'Superadministrateur',
  admin: 'Administrateur',
  user: 'Utilisateur'
};

const ROLE_BADGES = {
  superadmin: 'bg-purple-100 text-purple-800',
  admin: 'bg-blue-100 text-blue-800',
  user: 'bg-gray-100 text-gray-700'
};

const LOG_TYPE_LABELS = {
  login_success: { label: 'Connexion', color: 'text-green-600', bg: 'bg-green-50' },
  login_failed: { label: 'Échec connexion', color: 'text-red-600', bg: 'bg-red-50' },
  logout: { label: 'Déconnexion', color: 'text-gray-600', bg: 'bg-gray-50' },
  account_disabled: { label: 'Compte désactivé', color: 'text-orange-600', bg: 'bg-orange-50' },
  account_enabled: { label: 'Compte réactivé', color: 'text-blue-600', bg: 'bg-blue-50' }
};

// Éditeur de liste réutilisable
const ListEditor = ({ title, description, items = [], onAdd, onRename, onRemove, checkUsed }) => {
  const [newItem, setNewItem] = useState('');
  const [editingItem, setEditingItem] = useState(null); // { original, value }
  const [error, setError] = useState('');

  const handleAdd = () => {
    const trimmed = newItem.trim();
    if (!trimmed) return;
    if (items.includes(trimmed)) {
      setError('Cet élément existe déjà');
      setTimeout(() => setError(''), 3000);
      return;
    }
    onAdd(trimmed);
    setNewItem('');
  };

  return (
    <div className="space-y-3">
      <div>
        <h4 className="text-sm font-semibold text-gray-700">{title}</h4>
        {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
      </div>
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-xs">
          {error}
        </div>
      )}
      <div className="flex gap-2">
        <input
          type="text"
          placeholder={`Nouvel élément...`}
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
        />
        <button
          onClick={handleAdd}
          className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={14} /> Ajouter
        </button>
      </div>
      <div className="space-y-1">
        {items.map(item => (
          <div key={item} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
            {editingItem?.original === item ? (
              <>
                <input
                  type="text"
                  value={editingItem.value}
                  onChange={(e) => setEditingItem(prev => ({ ...prev, value: e.target.value }))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') { onRename(item, editingItem.value); setEditingItem(null); }
                    else if (e.key === 'Escape') setEditingItem(null);
                  }}
                  className="flex-1 px-2 py-1 border border-blue-300 rounded text-sm"
                  autoFocus
                />
                <button
                  onClick={() => { onRename(item, editingItem.value); setEditingItem(null); }}
                  className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                >OK</button>
                <button
                  onClick={() => setEditingItem(null)}
                  className="p-1 text-gray-500 hover:bg-gray-200 rounded"
                ><X size={12} /></button>
              </>
            ) : (
              <>
                <span className="flex-1 text-sm text-gray-800">{item}</span>
                <button
                  onClick={() => setEditingItem({ original: item, value: item })}
                  className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                  title="Renommer"
                ><Pencil size={14} /></button>
                <button
                  onClick={() => {
                    if (checkUsed && checkUsed(item)) {
                      setError(`"${item}" est utilisé dans des données existantes et ne peut pas être supprimé.`);
                      setTimeout(() => setError(''), 4000);
                      return;
                    }
                    onRemove(item);
                  }}
                  className="p-1 text-red-500 hover:bg-red-50 rounded"
                  title="Supprimer"
                ><Trash2 size={14} /></button>
              </>
            )}
          </div>
        ))}
        {items.length === 0 && (
          <p className="text-sm text-gray-400 italic text-center py-2">Aucun élément défini</p>
        )}
      </div>
    </div>
  );
};

export const SettingsPanel = ({ onClearOpex, onClearCapex, onRenameEnveloppe, onRenameOpexSupplier, onRenameOpexCategory }) => {
  const { settings, isSettingsOpen, setIsSettingsOpen, updateColors, updateSettings, toggleOpexColumn, toggleCapexColumn, updateRules, toggleTabVisibility, resetSettings, addCapexEnveloppe, renameCapexEnveloppe, removeCapexEnveloppe, addOpexSupplier, renameOpexSupplier, removeOpexSupplier, addOpexCategory, renameOpexCategory, removeOpexCategory } = useSettings();
  const { users, addUser, deleteUser, toggleUserDisabled, changePassword, updateUserRole, isAdmin, isSuperAdmin, authLogs, clearLogs } = useAuth();
  const { canManageColumns } = usePermissions();
  const [activeSettingsTab, setActiveSettingsTab] = useState('appearance');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('user');
  const [userError, setUserError] = useState('');
  const [changePasswordId, setChangePasswordId] = useState(null);
  const [changePasswordValue, setChangePasswordValue] = useState('');
  const [changeRoleId, setChangeRoleId] = useState(null);
  const [confirmPurge, setConfirmPurge] = useState(false);
  const [confirmClearOpex, setConfirmClearOpex] = useState(false);
  const [confirmClearCapex, setConfirmClearCapex] = useState(false);
  const [confirmDeleteUser, setConfirmDeleteUser] = useState({ isOpen: false, userId: null, username: '' });
  // ---- État GitHub ----
  const [ghConfig, setGhConfig] = useState(() => github.loadGithubConfig() || { enabled: false, token: '', owner: '', repo: '', branch: 'main', dataPath: 'data' });
  const [ghTestStatus, setGhTestStatus] = useState(null); // { success, message }
  const [ghSyncing, setGhSyncing] = useState(false);
  const [ghPushing, setGhPushing] = useState(false);

  const handleAddUser = async () => {
    if (!newUsername || !newPassword) {
      setUserError('Identifiant et mot de passe requis');
      return;
    }
    const result = await addUser(newUsername, newPassword, newRole);
    if (result.success) {
      setNewUsername('');
      setNewPassword('');
      setNewRole('user');
      setUserError('');
    } else {
      setUserError(result.error);
    }
  };

  const handleChangePassword = async (userId) => {
    if (!changePasswordValue) return;
    await changePassword(userId, changePasswordValue);
    setChangePasswordId(null);
    setChangePasswordValue('');
  };

  const handleChangeRole = async (userId, newRole) => {
    if (!updateUserRole) return;
    const result = await updateUserRole(userId, newRole);
    if (!result.success) {
      setUserError(result.error);
      setTimeout(() => setUserError(''), 3000);
    }
    setChangeRoleId(null);
  };

  const handleDeleteUser = (userId, username) => {
    setConfirmDeleteUser({ isOpen: true, userId, username });
  };

  const handleDeleteUserConfirm = () => {
    const result = deleteUser(confirmDeleteUser.userId);
    if (!result.success) {
      setUserError(result.error);
      setTimeout(() => setUserError(''), 3000);
    }
    setConfirmDeleteUser({ isOpen: false, userId: null, username: '' });
  };

  // ---- Handlers GitHub ----
  const handleGhSave = () => {
    github.saveGithubConfig(ghConfig);
    setGhTestStatus({ success: true, message: 'Configuration sauvegardée. Rechargez la page pour activer la synchronisation.' });
  };

  const handleGhTest = async () => {
    setGhTestStatus(null);
    const result = await github.testConnection(ghConfig);
    setGhTestStatus(result);
  };

  const handleGhSyncNow = async () => {
    setGhSyncing(true);
    setGhTestStatus(null);
    try {
      const data = await github.fetchAllData(ghConfig);
      setGhTestStatus({ success: true, message: `Synchronisation OK — données récupérées depuis GitHub. Rechargez la page pour les appliquer.` });
      // Mettre à jour le localStorage pour que le reload charge les bonnes données
      if (data?.opex)        localStorage.setItem('hospifinance_opex_suppliers',  JSON.stringify(data.opex));
      if (data?.capex)       localStorage.setItem('hospifinance_capex_projects',   JSON.stringify(data.capex));
      if (data?.opexOrders)  localStorage.setItem('hospifinance_opex_orders',      JSON.stringify(data.opexOrders));
      if (data?.capexOrders) localStorage.setItem('hospifinance_capex_orders',     JSON.stringify(data.capexOrders));
      if (data?.users)       localStorage.setItem('hospifinance_auth_users',       JSON.stringify(data.users));
      if (data?.settings)    localStorage.setItem('hospifinance_settings',         JSON.stringify(data.settings));
    } catch (err) {
      setGhTestStatus({ success: false, message: `Erreur: ${err.message}` });
    } finally {
      setGhSyncing(false);
    }
  };

  const handleGhPushAll = async () => {
    setGhPushing(true);
    setGhTestStatus(null);
    try {
      await github.pushAllData({
        opex:        loadOpexData()     || [],
        capex:       loadCapexData()    || [],
        opexOrders:  loadOpexOrders()   || [],
        capexOrders: loadCapexOrders()  || [],
        users:       loadAuthUsers()    || [],
        settings:    loadSettings()     || {},
      }, ghConfig);
      setGhTestStatus({ success: true, message: 'Toutes les données ont été poussées vers GitHub avec succès.' });
    } catch (err) {
      setGhTestStatus({ success: false, message: `Erreur: ${err.message}` });
    } finally {
      setGhPushing(false);
    }
  };

  const handleToggleDisabled = (userId) => {
    const result = toggleUserDisabled(userId);
    if (!result.success) {
      setUserError(result.error);
      setTimeout(() => setUserError(''), 3000);
    }
  };

  return (
    <Modal
      isOpen={isSettingsOpen}
      onClose={() => setIsSettingsOpen(false)}
      title={
        <div className="flex items-center gap-2">
          <Settings size={20} />
          <span>Paramétrage</span>
        </div>
      }
      size="lg"
    >
      {/* Onglets internes */}
      <div className="flex border-b border-gray-200 mb-4 -mx-1 overflow-x-auto">
        {SETTINGS_TABS.filter(tab => {
          // Filtrer l'onglet colonnes personnalisées selon permissions
          if (tab.id === 'customColumns' && !canManageColumns) return false;
          // Filtrer enveloppes, users et logs pour admins uniquement
          if ((tab.id === 'users' || tab.id === 'logs' || tab.id === 'listes') && !isAdmin) return false;
          // Filtrer données pour superadmin uniquement
          if (tab.id === 'data' && !isSuperAdmin) return false;
          return true;
        }).map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSettingsTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap mx-1 ${
                activeSettingsTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Contenu des onglets */}
      <div className="min-h-[300px]">
        {/* Apparence */}
        {activeSettingsTab === 'appearance' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom de l'application</label>
              <input
                type="text"
                value={settings.appName}
                onChange={(e) => updateSettings({ appName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-base focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Couleurs</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {Object.entries(COLOR_LABELS).map(([key, label]) => (
                  <div key={key} className="flex items-center gap-3">
                    <input
                      type="color"
                      value={settings.colors[key]}
                      onChange={(e) => updateColors(key, e.target.value)}
                      className="w-10 h-10 rounded cursor-pointer border border-gray-300"
                    />
                    <div>
                      <p className="text-sm font-medium text-gray-700">{label}</p>
                      <p className="text-xs text-gray-400">{settings.colors[key]}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Navigation — afficher / masquer les onglets du menu */}
        {activeSettingsTab === 'navigation' && (
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-700">Onglets du menu latéral</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Décochez un onglet pour le masquer dans la navigation. La «&nbsp;Vue d&apos;ensemble&nbsp;» reste toujours visible.
              </p>
            </div>
            <div className="space-y-1">
              {NAV_TABS.map(tab => {
                const visible = !(settings.hiddenTabs || []).includes(tab.id);
                return (
                  <div key={tab.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                    <div className="flex flex-col">
                      <span className={`text-sm ${visible ? 'text-gray-800' : 'text-gray-400'}`}>{tab.label}</span>
                      <span className="text-[10px] uppercase tracking-wide text-gray-400">{tab.section}</span>
                    </div>
                    <button
                      onClick={() => toggleTabVisibility(tab.id)}
                      title={visible ? 'Masquer cet onglet' : 'Afficher cet onglet'}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                        visible
                          ? 'bg-green-50 text-green-700 hover:bg-green-100'
                          : 'bg-gray-200 text-gray-500 hover:bg-gray-300'
                      }`}
                    >
                      {visible ? <Eye size={14} /> : <EyeOff size={14} />}
                      {visible ? 'Affiché' : 'Masqué'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Colonnes */}
        {activeSettingsTab === 'columns' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Colonnes OPEX</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {Object.entries(OPEX_COLUMN_LABELS).map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.opexColumns[key]}
                      onChange={() => toggleOpexColumn(key)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Colonnes CAPEX</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {Object.entries(CAPEX_COLUMN_LABELS).map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.capexColumns[key]}
                      onChange={() => toggleCapexColumn(key)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Règles de gestion */}
        {activeSettingsTab === 'rules' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Seuil d'avertissement (%)
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="50"
                  max="95"
                  value={settings.rules.warningThreshold}
                  onChange={(e) => updateRules('warningThreshold', parseInt(e.target.value))}
                  className="flex-1"
                />
                <span className="text-sm font-semibold text-yellow-600 w-12 text-right">
                  {settings.rules.warningThreshold}%
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Les budgets au-dessus de ce seuil afficheront un avertissement jaune
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Seuil critique (%)
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="60"
                  max="100"
                  value={settings.rules.criticalThreshold}
                  onChange={(e) => updateRules('criticalThreshold', parseInt(e.target.value))}
                  className="flex-1"
                />
                <span className="text-sm font-semibold text-red-600 w-12 text-right">
                  {settings.rules.criticalThreshold}%
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Les budgets au-dessus de ce seuil afficheront une alerte rouge
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 mt-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Prévisualisation</h4>
              <div className="flex gap-2">
                <div className="flex-1 h-4 bg-green-500 rounded-l" style={{ width: `${settings.rules.warningThreshold}%` }}></div>
                <div className="flex-1 h-4 bg-yellow-500" style={{ width: `${settings.rules.criticalThreshold - settings.rules.warningThreshold}%` }}></div>
                <div className="flex-1 h-4 bg-red-500 rounded-r" style={{ width: `${100 - settings.rules.criticalThreshold}%` }}></div>
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>0%</span>
                <span>{settings.rules.warningThreshold}%</span>
                <span>{settings.rules.criticalThreshold}%</span>
                <span>100%</span>
              </div>
            </div>
          </div>
        )}

        {/* Listes de choix (admin) */}
        {activeSettingsTab === 'listes' && (
          <div className="space-y-6">
            <ListEditor
              title="Fournisseurs OPEX"
              description="Liste des fournisseurs disponibles dans le formulaire OPEX."
              items={settings.opexSuppliers || []}
              onAdd={addOpexSupplier}
              onRename={(old, newName) => { renameOpexSupplier(old, newName); onRenameOpexSupplier?.(old, newName); }}
              onRemove={removeOpexSupplier}
              checkUsed={(name) => (loadOpexData() || []).some(s => s.supplier === name)}
            />
            <div className="border-t border-gray-200" />
            <ListEditor
              title="Catégories OPEX"
              description="Liste des catégories disponibles dans le formulaire OPEX."
              items={settings.opexCategories || []}
              onAdd={addOpexCategory}
              onRename={(old, newName) => { renameOpexCategory(old, newName); onRenameOpexCategory?.(old, newName); }}
              onRemove={removeOpexCategory}
              checkUsed={(name) => (loadOpexData() || []).some(s => s.category === name)}
            />
            <div className="border-t border-gray-200" />
            <ListEditor
              title="Enveloppes CAPEX"
              description="Liste des enveloppes budgétaires disponibles dans le formulaire CAPEX."
              items={settings.capexEnveloppes || []}
              onAdd={addCapexEnveloppe}
              onRename={(old, newName) => { renameCapexEnveloppe(old, newName); onRenameEnveloppe?.(old, newName); }}
              onRemove={removeCapexEnveloppe}
              checkUsed={(name) => (loadCapexData() || []).some(p => p.enveloppe === name)}
            />
          </div>
        )}

        {/* Colonnes personnalisées */}
        {activeSettingsTab === 'customColumns' && (
          <CustomColumnsManager />
        )}

        {/* Gestion des utilisateurs */}
        {activeSettingsTab === 'users' && (
          <div className="space-y-4">
            {userError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
                {userError}
              </div>
            )}

            {isAdmin && (
              <div className="bg-blue-50 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Ajouter un utilisateur</h3>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                  <input
                    type="text"
                    placeholder="Identifiant"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                  <input
                    type="password"
                    placeholder="Mot de passe"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  >
                    <option value="user">Utilisateur</option>
                    <option value="admin">Administrateur</option>
                  </select>
                  <Button variant="primary" size="sm" onClick={handleAddUser}>
                    Ajouter
                  </Button>
                </div>
              </div>
            )}

            <div className="space-y-2">
              {users.map(u => {
                const isSuperAdminUser = u.username === 'admin';
                const canDelete = isSuperAdmin && !isSuperAdminUser;
                const canChangePassword = isSuperAdmin || (isAdmin && !isSuperAdminUser);

                return (
                  <div
                    key={u.id}
                    className={`flex items-center justify-between rounded-lg p-3 ${
                      u.disabled ? 'bg-red-50 border border-red-200' : 'bg-gray-50'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className={`text-sm font-medium ${u.disabled ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                          {u.username}
                        </p>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${ROLE_BADGES[u.role] || ROLE_BADGES.user}`}>
                          {ROLE_LABELS[u.role] || 'Utilisateur'}
                        </span>
                        {u.disabled && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-red-100 text-red-700">
                            Désactivé
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500">
                        {u.createdAt && `Créé le ${new Date(u.createdAt).toLocaleDateString('fr-FR')}`}
                      </p>
                    </div>
                    {isAdmin && (
                      <div className="flex gap-1 flex-shrink-0 ml-2">
                        {changePasswordId === u.id ? (
                          <div className="flex gap-1">
                            <input
                              type="password"
                              placeholder="Nouveau MDP"
                              value={changePasswordValue}
                              onChange={(e) => setChangePasswordValue(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && handleChangePassword(u.id)}
                              className="px-2 py-1 border border-gray-300 rounded text-sm w-28"
                              autoFocus
                            />
                            <Button variant="success" size="sm" onClick={() => handleChangePassword(u.id)}>OK</Button>
                            <Button variant="secondary" size="sm" onClick={() => { setChangePasswordId(null); setChangePasswordValue(''); }}>X</Button>
                          </div>
                        ) : changeRoleId === u.id ? (
                          <div className="flex gap-1 items-center">
                            <select
                              defaultValue={u.role}
                              onChange={(e) => handleChangeRole(u.id, e.target.value)}
                              className="px-2 py-1 border border-gray-300 rounded text-sm"
                            >
                              <option value="user">Utilisateur</option>
                              <option value="admin">Administrateur</option>
                            </select>
                            <Button variant="secondary" size="sm" onClick={() => setChangeRoleId(null)}>X</Button>
                          </div>
                        ) : (
                          <>
                            {canChangePassword && (
                              <Button variant="secondary" size="sm" onClick={() => { setChangePasswordId(u.id); setChangeRoleId(null); }}>
                                MDP
                              </Button>
                            )}
                            {/* Modifier le rôle - superadmin uniquement, pas sur lui-même */}
                            {isSuperAdmin && !isSuperAdminUser && (
                              <Button variant="secondary" size="sm" onClick={() => { setChangeRoleId(u.id); setChangePasswordId(null); }}>
                                Rôle
                              </Button>
                            )}
                            {/* Bouton activer/désactiver - pas sur le superadmin */}
                            {!isSuperAdminUser && (
                              <Button
                                variant={u.disabled ? 'success' : 'warning'}
                                size="sm"
                                onClick={() => handleToggleDisabled(u.id)}
                              >
                                {u.disabled ? 'Activer' : 'Désact.'}
                              </Button>
                            )}
                            {/* Bouton supprimer - seulement superadmin, jamais sur lui-même */}
                            {canDelete && (
                              <Button
                                variant="danger"
                                size="sm"
                                onClick={() => handleDeleteUser(u.id, u.username)}
                              >
                                Suppr.
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Logs de connexion */}
        {activeSettingsTab === 'logs' && (
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-semibold text-gray-700">
                Journal des connexions
                <span className="text-xs font-normal text-gray-500 ml-1">
                  ({authLogs.length} entrée{authLogs.length > 1 ? 's' : ''})
                </span>
              </h3>
              {isAdmin && authLogs.length > 0 && (
                <Button variant="secondary" size="sm" icon={<Trash2 size={16} />} onClick={() => setConfirmPurge(true)}>
                  Purger
                </Button>
              )}
            </div>

            {authLogs.length === 0 ? (
              <p className="text-sm text-gray-500 italic text-center py-8">Aucun log de connexion</p>
            ) : (
              <div className="max-h-[350px] overflow-y-auto space-y-1">
                {authLogs.map(log => {
                  const typeInfo = LOG_TYPE_LABELS[log.type] || { label: log.type, color: 'text-gray-600', bg: 'bg-gray-50' };
                  return (
                    <div key={log.id} className={`flex items-start gap-3 rounded-lg p-2.5 ${typeInfo.bg}`}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-xs font-semibold ${typeInfo.color}`}>
                            {typeInfo.label}
                          </span>
                          <span className="text-xs font-medium text-gray-800">
                            {log.username}
                          </span>
                        </div>
                        {log.detail && (
                          <p className="text-xs text-gray-500 mt-0.5">{log.detail}</p>
                        )}
                      </div>
                      <span className="text-[10px] text-gray-400 whitespace-nowrap flex-shrink-0">
                        {new Date(log.timestamp).toLocaleDateString('fr-FR')}{' '}
                        {new Date(log.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Gestion des données (superadmin) */}
        {activeSettingsTab === 'data' && (
          <div className="space-y-5">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-start gap-2">
              <AlertTriangle size={18} className="text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-yellow-800">
                <strong>Attention :</strong> Ces actions suppriment définitivement toutes les données du tableau sélectionné,
                y compris les commandes associées. Cette opération est irréversible.
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-gray-800 mb-2">Tableau OPEX</h3>
                <p className="text-xs text-gray-500 mb-3">
                  Supprime tous les fournisseurs OPEX et leurs commandes associées.
                </p>
                <Button
                  variant="danger"
                  size="sm"
                  icon={<Trash2 size={14} />}
                  onClick={() => setConfirmClearOpex(true)}
                >
                  Vider le tableau OPEX
                </Button>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-gray-800 mb-2">Tableau CAPEX</h3>
                <p className="text-xs text-gray-500 mb-3">
                  Supprime tous les projets CAPEX et leurs commandes associées.
                </p>
                <Button
                  variant="danger"
                  size="sm"
                  icon={<Trash2 size={14} />}
                  onClick={() => setConfirmClearCapex(true)}
                >
                  Vider le tableau CAPEX
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* GitHub Sync */}
        {activeSettingsTab === 'github' && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-gray-800">Synchronisation GitHub</h3>
                <p className="text-xs text-gray-500 mt-0.5">Les données sont stockées comme fichiers JSON dans votre dépôt Git</p>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <span className="text-xs text-gray-600">Activer</span>
                <input type="checkbox" checked={!!ghConfig.enabled} onChange={e => setGhConfig(c => ({ ...c, enabled: e.target.checked }))} className="w-4 h-4" />
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Personal Access Token *</label>
                <input type="password" value={ghConfig.token} onChange={e => setGhConfig(c => ({ ...c, token: e.target.value }))}
                  placeholder="ghp_xxxxxxxxxxxx"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
                <p className="text-[10px] text-gray-400 mt-0.5">Droits requis : Contents (read & write)</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Owner (user ou org) *</label>
                <input type="text" value={ghConfig.owner} onChange={e => setGhConfig(c => ({ ...c, owner: e.target.value }))}
                  placeholder="mon-org"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Nom du dépôt *</label>
                <input type="text" value={ghConfig.repo} onChange={e => setGhConfig(c => ({ ...c, repo: e.target.value }))}
                  placeholder="hospifinance"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Branche</label>
                <input type="text" value={ghConfig.branch} onChange={e => setGhConfig(c => ({ ...c, branch: e.target.value }))}
                  placeholder="main"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">Dossier données</label>
                <input type="text" value={ghConfig.dataPath} onChange={e => setGhConfig(c => ({ ...c, dataPath: e.target.value }))}
                  placeholder="data"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
                <p className="text-[10px] text-gray-400 mt-0.5">Les fichiers JSON seront créés dans ce dossier (ex: data/opex.json)</p>
              </div>
            </div>

            {/* Feedback */}
            {ghTestStatus && (
              <div className={`flex items-start gap-2 p-3 rounded-lg text-sm ${ghTestStatus.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                {ghTestStatus.success ? <CheckCircle size={16} className="flex-shrink-0 mt-0.5" /> : <XCircle size={16} className="flex-shrink-0 mt-0.5" />}
                <span>{ghTestStatus.message}</span>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-wrap gap-2 pt-1">
              <Button variant="primary" size="sm" icon={<Save size={14} />} onClick={handleGhSave}>
                Sauvegarder
              </Button>
              <Button variant="secondary" size="sm" icon={<CheckCircle size={14} />} onClick={handleGhTest}>
                Tester la connexion
              </Button>
              <Button variant="secondary" size="sm" icon={<RefreshCw size={14} className={ghSyncing ? 'animate-spin' : ''} />}
                onClick={handleGhSyncNow} disabled={ghSyncing}>
                {ghSyncing ? 'Syncing...' : 'Récupérer depuis GitHub'}
              </Button>
              <Button variant="warning" size="sm" icon={<Upload size={14} />}
                onClick={handleGhPushAll} disabled={ghPushing}>
                {ghPushing ? 'Envoi...' : 'Pousser tout vers GitHub'}
              </Button>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800">
              <strong>Fonctionnement :</strong>
              <ul className="mt-1 space-y-0.5 list-disc list-inside">
                <li>Au démarrage, les données locales sont chargées instantanément, puis synchronisées depuis GitHub</li>
                <li>Chaque modification est automatiquement poussée vers GitHub (délai 800ms)</li>
                <li>Utilisez <strong>«&nbsp;Pousser tout&nbsp;»</strong> lors de la première configuration pour uploader vos données existantes</li>
                <li>Le token est stocké localement dans votre navigateur (jamais transmis ailleurs)</li>
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-200">
        <Button variant="secondary" icon={<RotateCcw size={16} />} size="sm" onClick={resetSettings}>
          Réinitialiser
        </Button>
        <Button variant="primary" icon={<Save size={16} />} size="sm" onClick={() => setIsSettingsOpen(false)}>
          Fermer
        </Button>
      </div>

      <ConfirmDialog
        isOpen={confirmDeleteUser.isOpen}
        onClose={() => setConfirmDeleteUser({ isOpen: false, userId: null, username: '' })}
        onConfirm={handleDeleteUserConfirm}
        title="Supprimer l'utilisateur"
        message={`Êtes-vous sûr de vouloir supprimer le compte "${confirmDeleteUser.username}" ? Cette action est irréversible.`}
        confirmText="Supprimer"
        variant="danger"
      />

      <ConfirmDialog
        isOpen={confirmPurge}
        onClose={() => setConfirmPurge(false)}
        onConfirm={() => { clearLogs(); setConfirmPurge(false); }}
        title="Purger les logs"
        message="Êtes-vous sûr de vouloir supprimer tous les logs de connexion ? Cette action est irréversible."
        confirmText="Purger"
        variant="danger"
      />

      <ConfirmDialog
        isOpen={confirmClearOpex}
        onClose={() => setConfirmClearOpex(false)}
        onConfirm={() => { onClearOpex?.(); setConfirmClearOpex(false); }}
        title="Vider le tableau OPEX"
        message="Êtes-vous sûr de vouloir supprimer TOUS les fournisseurs OPEX et leurs commandes ? Cette action est irréversible et sera synchronisée sur GitHub."
        confirmText="Tout supprimer"
        variant="danger"
      />

      <ConfirmDialog
        isOpen={confirmClearCapex}
        onClose={() => setConfirmClearCapex(false)}
        onConfirm={() => { onClearCapex?.(); setConfirmClearCapex(false); }}
        title="Vider le tableau CAPEX"
        message="Êtes-vous sûr de vouloir supprimer TOUS les projets CAPEX et leurs commandes ? Cette action est irréversible et sera synchronisée sur GitHub."
        confirmText="Tout supprimer"
        variant="danger"
      />
    </Modal>
  );
};
