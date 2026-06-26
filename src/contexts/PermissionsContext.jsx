/**
 * Contexte de gestion des permissions par rôle
 */

import { createContext, useContext, useMemo } from 'react';
import { useAuth } from './AuthContext';

const PermissionsContext = createContext(null);

/**
 * Matrice de permissions par rôle
 * Définit ce que chaque rôle peut faire dans l'application
 */
const PERMISSIONS_MATRIX = {
  superadmin: {
    // Permissions de consultation
    canView: {
      dashboard: true,
      opex: true,
      capex: true,
      orders: true,
      settings: true
    },
    // Permissions de modification des données
    canAdd: {
      opex: true,
      capex: true,
      orders: true
    },
    canEdit: {
      opex: true,
      capex: true,
      orders: true
    },
    canDelete: {
      opex: true,
      capex: true,
      orders: true
    },
    // Permissions import/export
    canImport: {
      opex: true,
      capex: true
    },
    canExport: {
      opex: true,
      capex: true
    },
    canDownloadTemplate: true,

    // Permissions administration
    canManageUsers: true,
    canManageColumns: true,
    canAccessSettings: true,

    // Permissions de sécurité
    canChangeOwnPassword: true,
    canChangeOthersPassword: true  // Tous les utilisateurs y compris admins
  },

  admin: {
    // Permissions de consultation
    canView: {
      dashboard: true,
      opex: true,
      capex: true,
      orders: true,
      settings: true
    },
    // Permissions de modification des données
    canAdd: {
      opex: true,
      capex: true,
      orders: true
    },
    canEdit: {
      opex: true,
      capex: true,
      orders: true
    },
    canDelete: {
      opex: true,
      capex: true,
      orders: true
    },
    // Permissions import/export
    canImport: {
      opex: true,
      capex: true
    },
    canExport: {
      opex: true,
      capex: true
    },
    canDownloadTemplate: true,

    // Permissions administration
    canManageUsers: true,  // Limité : ne peut pas gérer les admins
    canManageColumns: true,
    canAccessSettings: true,

    // Permissions de sécurité
    canChangeOwnPassword: true,
    canChangeOthersPassword: true  // Limité : pas le superadmin
  },

  user: {
    // Permissions de consultation
    canView: {
      dashboard: true,
      opex: true,
      capex: true,
      orders: true,
      settings: false  // Pas d'accès au panneau Settings
    },
    // Permissions de modification des données (saisie uniquement)
    canAdd: {
      opex: true,
      capex: true,
      orders: true
    },
    canEdit: {
      opex: true,
      capex: true,
      orders: true
    },
    canDelete: {
      opex: false,
      capex: false,
      orders: false
    },
    // Permissions import/export
    canImport: {
      opex: false,
      capex: false
    },
    canExport: {
      opex: false,
      capex: false
    },
    canDownloadTemplate: false,

    // Permissions administration
    canManageUsers: false,
    canManageColumns: false,
    canAccessSettings: false,

    // Permissions de sécurité
    canChangeOwnPassword: true,
    canChangeOthersPassword: false
  }
};

/**
 * Provider de permissions
 * Calcule et fournit les permissions basées sur le rôle de l'utilisateur connecté
 */
export const PermissionsProvider = ({ children }) => {
  const { user } = useAuth();

  // Calcul des permissions basé sur le rôle
  const permissions = useMemo(() => {
    if (!user || !user.role) {
      // Utilisateur non connecté : aucune permission
      return {
        canView: {},
        canAdd: {},
        canEdit: {},
        canDelete: {},
        canImport: {},
        canExport: {},
        canDownloadTemplate: false,
        canManageUsers: false,
        canManageColumns: false,
        canAccessSettings: false,
        canChangeOwnPassword: false,
        canChangeOthersPassword: false,
        role: null
      };
    }

    const rolePermissions = PERMISSIONS_MATRIX[user.role] || PERMISSIONS_MATRIX.user;

    return {
      ...rolePermissions,
      role: user.role,
      userId: user.id,
      username: user.username
    };
  }, [user]);

  // Helpers pour vérifier les permissions
  const value = useMemo(() => ({
    ...permissions,

    /**
     * Vérifie si l'utilisateur peut effectuer une action sur une entité
     * @param {string} action - L'action (view, add, edit, delete, import, export)
     * @param {string} entity - L'entité (opex, capex, orders, dashboard, settings)
     * @returns {boolean}
     */
    can: (action, entity) => {
      const actionMap = {
        view: permissions.canView,
        add: permissions.canAdd,
        edit: permissions.canEdit,
        delete: permissions.canDelete,
        import: permissions.canImport,
        export: permissions.canExport
      };

      const permissionGroup = actionMap[action];
      if (!permissionGroup) return false;

      return permissionGroup[entity] === true;
    },

    /**
     * Vérifie si l'utilisateur est un administrateur (admin ou superadmin)
     * @returns {boolean}
     */
    isAdmin: () => {
      return permissions.role === 'admin' || permissions.role === 'superadmin';
    },

    /**
     * Vérifie si l'utilisateur est le superadministrateur
     * @returns {boolean}
     */
    isSuperAdmin: () => {
      return permissions.role === 'superadmin';
    },

    /**
     * Vérifie si l'utilisateur peut gérer un autre utilisateur
     * @param {object} targetUser - L'utilisateur cible
     * @returns {boolean}
     */
    canManageUser: (targetUser) => {
      if (!permissions.canManageUsers) return false;
      if (permissions.role === 'superadmin') return true;

      // Un admin ne peut pas gérer d'autres admins ou le superadmin
      if (targetUser.role === 'admin' || targetUser.role === 'superadmin') {
        return false;
      }

      return true;
    },

    /**
     * Vérifie si l'utilisateur peut changer le mot de passe d'un utilisateur
     * @param {object} targetUser - L'utilisateur cible
     * @returns {boolean}
     */
    canChangePasswordOf: (targetUser) => {
      // Peut toujours changer son propre mot de passe
      if (targetUser.id === permissions.userId) {
        return permissions.canChangeOwnPassword;
      }

      // Sinon, vérifier les permissions de changement de mot de passe des autres
      if (!permissions.canChangeOthersPassword) return false;

      // Un admin ne peut pas changer le mot de passe du superadmin
      if (permissions.role === 'admin' && targetUser.role === 'superadmin') {
        return false;
      }

      return true;
    }
  }), [permissions]);

  return (
    <PermissionsContext.Provider value={value}>
      {children}
    </PermissionsContext.Provider>
  );
};

/**
 * Hook pour accéder aux permissions
 * @returns {object} Objet contenant les permissions et les helpers
 */
export const usePermissions = () => {
  const context = useContext(PermissionsContext);

  if (!context) {
    throw new Error('usePermissions doit être utilisé dans un PermissionsProvider');
  }

  return context;
};

export default PermissionsContext;
