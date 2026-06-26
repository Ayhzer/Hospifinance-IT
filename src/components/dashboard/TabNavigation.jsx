/**
 * TabNavigation — Navigation compacte par groupes déroulants
 * Vue d'ensemble toujours visible · 3 groupes (Saisie / Analyse / Référentiel) · Dashboards custom
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  TrendingUp, DollarSign, Server, ShoppingCart, Plus, LayoutDashboard,
  BarChart2, AlertTriangle, Table2, Tag, LayoutGrid, Building2,
  ChevronDown, Pencil,
} from 'lucide-react';
import { saveTabNames, loadTabNames } from '../../services/storageService';
import { useSettings } from '../../contexts/SettingsContext';

// ── Définition des onglets ────────────────────────────────────────────────────

const TAB_META = {
  overview:     { label: "Vue d'ensemble", icon: TrendingUp },
  opex:         { label: 'OPEX',            icon: DollarSign },
  capex:        { label: 'CAPEX',           icon: Server },
  ordersOpex:   { label: 'Cmd OPEX',        icon: ShoppingCart },
  ordersCapex:  { label: 'Cmd CAPEX',       icon: ShoppingCart },
  analytique:   { label: 'Vue analytique',  icon: BarChart2 },
  anomalies:    { label: 'Anomalies',       icon: AlertTriangle },
  projection:   { label: 'Projection',      icon: TrendingUp },
  comptes:      { label: 'Par comptes',     icon: Table2 },
  matrice:      { label: 'Matrice',         icon: LayoutGrid },
  editeurs:     { label: 'Éditeurs',        icon: Building2 },
  reclassement: { label: 'Reclassement',    icon: Tag },
};

const GROUPS = [
  {
    id: 'saisie',
    label: 'Saisie',
    tabs: ['opex', 'capex', 'ordersOpex', 'ordersCapex'],
    color: 'blue',
  },
  {
    id: 'analyse',
    label: 'Analyse',
    tabs: ['analytique', 'anomalies', 'projection', 'comptes', 'matrice', 'editeurs'],
    color: 'indigo',
  },
  {
    id: 'referentiel',
    label: 'Référentiel',
    tabs: ['reclassement'],
    color: 'violet',
  },
];

// Couleurs selon groupe
const GROUP_COLORS = {
  blue:   { active: 'border-blue-500 text-blue-700',    hover: 'hover:border-blue-300 hover:text-blue-600',    dot: 'bg-blue-500',   dropdown: 'border-blue-100', item: 'hover:bg-blue-50' },
  indigo: { active: 'border-indigo-500 text-indigo-700', hover: 'hover:border-indigo-300 hover:text-indigo-600', dot: 'bg-indigo-500', dropdown: 'border-indigo-100', item: 'hover:bg-indigo-50' },
  violet: { active: 'border-violet-500 text-violet-700', hover: 'hover:border-violet-300 hover:text-violet-600', dot: 'bg-violet-500', dropdown: 'border-violet-100', item: 'hover:bg-violet-50' },
};

// ── Composant GroupDropdown ───────────────────────────────────────────────────

const GroupDropdown = ({ group, activeTab, onTabChange, customNames }) => {
  const [open, setOpen] = useState(false);
  const [dropPos, setDropPos] = useState({ top: 0, left: 0 });
  const btnRef = useRef(null);
  const colors = GROUP_COLORS[group.color];

  const activeInGroup = group.tabs.find(id => id === activeTab);
  const activeMeta   = activeInGroup ? TAB_META[activeInGroup] : null;
  const groupIsActive = !!activeInGroup;

  // Fermeture au clic extérieur
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (btnRef.current && !btnRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Mise à jour position si scroll/resize pendant ouverture
  useEffect(() => {
    if (!open) return;
    const update = () => {
      if (btnRef.current) {
        const r = btnRef.current.getBoundingClientRect();
        setDropPos({ top: r.bottom + window.scrollY, left: r.left + window.scrollX });
      }
    };
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [open]);

  const handleToggle = () => {
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setDropPos({ top: r.bottom + window.scrollY, left: r.left + window.scrollX });
    }
    setOpen(p => !p);
  };

  const select = (tabId) => {
    onTabChange(tabId);
    setOpen(false);
  };

  const label = activeMeta
    ? (customNames[activeInGroup] || activeMeta.label)
    : group.label;

  const ActiveIcon = activeMeta?.icon;

  const dropdown = open && createPortal(
    <div
      style={{ position: 'absolute', top: dropPos.top + 2, left: dropPos.left, zIndex: 9999 }}
      className={`min-w-[180px] bg-white border ${colors.dropdown} rounded-lg shadow-xl py-1`}
    >
      {group.tabs.map(tabId => {
        const meta = TAB_META[tabId];
        const Icon = meta.icon;
        const displayLabel = customNames[tabId] || meta.label;
        const isActive = activeTab === tabId;
        return (
          <button
            key={tabId}
            onClick={() => select(tabId)}
            className={`
              w-full flex items-center gap-2.5 px-3 py-2 text-xs sm:text-sm text-left transition-colors
              ${isActive ? 'font-semibold' : `text-gray-700 ${colors.item}`}
            `}
            style={isActive ? { color: `var(--color-${group.color}-700, #3730a3)`, backgroundColor: `var(--color-${group.color}-50, #eef2ff)` } : {}}
          >
            <Icon size={14} className={`flex-shrink-0 ${isActive ? '' : 'text-gray-400'}`} />
            {displayLabel}
            {isActive && (
              <span className={`ml-auto w-1.5 h-1.5 rounded-full ${colors.dot}`} />
            )}
          </button>
        );
      })}
    </div>,
    document.body
  );

  return (
    <div className="flex-shrink-0" ref={btnRef}>
      <button
        onClick={handleToggle}
        className={`
          flex items-center gap-1.5 px-3 sm:px-4 py-3 sm:py-4 font-medium text-xs sm:text-sm border-b-2 transition-colors select-none
          ${groupIsActive
            ? `${colors.active} border-b-2`
            : `border-transparent text-gray-500 ${colors.hover}`}
          ${open ? 'bg-gray-50' : ''}
        `}
      >
        {ActiveIcon && <ActiveIcon size={14} className="flex-shrink-0 sm:w-4 sm:h-4" />}
        <span>{label}</span>
        <ChevronDown
          size={12}
          className={`flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''} text-gray-400`}
        />
      </button>
      {dropdown}
    </div>
  );
};

// ── Onglet standalone (Vue d'ensemble + dashboards custom) ────────────────────

const StandaloneTab = ({
  tabId, label, icon: Icon, isActive, onTabChange,
  draggable, dragHandlers, isDraggingOver,
  customNames, onRenameStart, isEditing, editValue, setEditValue, onRenameSave, onRenameKeyDown, inputRef,
}) => {
  const displayLabel = customNames?.[tabId] || label;

  return (
    <div
      className="flex items-center relative flex-shrink-0"
      draggable={draggable}
      {...(draggable ? dragHandlers : {})}
    >
      {isDraggingOver && (
        <span className="absolute left-0 top-2 bottom-2 w-0.5 bg-blue-500 rounded-full z-10" />
      )}
      <button
        onClick={() => !isEditing && onTabChange(tabId)}
        title={draggable ? 'Glisser pour réorganiser' : undefined}
        className={`
          flex items-center gap-1.5 px-3 sm:px-4 py-3 sm:py-4 font-medium text-xs sm:text-sm border-b-2 transition-colors
          ${draggable ? 'cursor-grab active:cursor-grabbing' : ''}
          select-none group
          ${isActive
            ? 'border-blue-500 text-blue-600'
            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
          ${isDraggingOver ? 'bg-blue-50' : ''}
        `}
      >
        {Icon && <Icon size={14} className="flex-shrink-0 sm:w-4 sm:h-4" />}
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            value={editValue}
            onChange={e => setEditValue(e.target.value)}
            onBlur={onRenameSave}
            onKeyDown={onRenameKeyDown}
            className="w-20 sm:w-28 px-1 py-0 text-xs sm:text-sm border border-blue-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            onClick={e => e.stopPropagation()}
          />
        ) : (
          <>
            <span className="truncate max-w-[8rem]">{displayLabel}</span>
            {onRenameStart && (
              <Pencil
                size={11}
                className="flex-shrink-0 opacity-0 group-hover:opacity-50 hover:!opacity-100 cursor-pointer transition-opacity"
                onClick={e => { e.stopPropagation(); onRenameStart(e, tabId, displayLabel); }}
              />
            )}
          </>
        )}
      </button>
    </div>
  );
};

// ── Composant principal ───────────────────────────────────────────────────────

export const TabNavigation = ({ activeTab, onTabChange, onCreateDashboard }) => {
  const { settings } = useSettings();
  const [customNames, setCustomNames] = useState({});
  const [editingTabId, setEditingTabId] = useState(null);
  const [editValue, setEditValue] = useState('');
  const inputRef = useRef(null);

  const customDashboards = settings.customDashboards || [];

  // Chargement des noms personnalisés
  useEffect(() => {
    const stored = loadTabNames();
    if (stored) setCustomNames(stored);
  }, []);

  useEffect(() => {
    if (editingTabId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingTabId]);

  const startEditing = (e, tabId, currentLabel) => {
    e.stopPropagation();
    setEditingTabId(tabId);
    setEditValue(customNames[tabId] || currentLabel);
  };

  const saveEdit = useCallback(() => {
    if (editingTabId && editValue.trim()) {
      const updated = { ...customNames, [editingTabId]: editValue.trim() };
      setCustomNames(updated);
      saveTabNames(updated);
    }
    setEditingTabId(null);
  }, [editingTabId, editValue, customNames]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') saveEdit();
    else if (e.key === 'Escape') setEditingTabId(null);
  };

  // Drag & drop pour les dashboards custom
  const dragIndexRef = useRef(null);
  const [dropIndex, setDropIndex] = useState(null);
  const [customOrder, setCustomOrder] = useState(() =>
    customDashboards.map(d => d.id)
  );

  // Sync si les dashboards custom changent
  useEffect(() => {
    setCustomOrder(prev => {
      const ids = customDashboards.map(d => d.id);
      const valid = prev.filter(id => ids.includes(id));
      const newIds = ids.filter(id => !prev.includes(id));
      return [...valid, ...newIds];
    });
  }, [customDashboards.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const makeDragHandlers = useCallback((index) => ({
    onDragStart: (e) => {
      dragIndexRef.current = index;
      e.dataTransfer.effectAllowed = 'move';
      e.currentTarget.style.opacity = '0.5';
    },
    onDragEnd: (e) => {
      e.currentTarget.style.opacity = '';
      setDropIndex(null);
      dragIndexRef.current = null;
    },
    onDragOver: (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      if (dragIndexRef.current !== null && dragIndexRef.current !== index) setDropIndex(index);
    },
    onDragLeave: () => setDropIndex(null),
    onDrop: (e) => {
      e.preventDefault();
      const from = dragIndexRef.current;
      if (from !== null && from !== index) {
        setCustomOrder(prev => {
          const arr = [...prev];
          const [moved] = arr.splice(from, 1);
          arr.splice(index, 0, moved);
          return arr;
        });
      }
      setDropIndex(null);
      dragIndexRef.current = null;
    },
  }), []);

  const orderedDashboards = customOrder
    .map(id => customDashboards.find(d => d.id === id))
    .filter(Boolean);

  return (
    <div className="bg-white rounded-lg shadow-md mb-4 sm:mb-6">
      <div className="border-b border-gray-200">
        <nav className="flex -mb-px overflow-x-auto">

          {/* Vue d'ensemble — standalone */}
          <StandaloneTab
            tabId="overview"
            label="Vue d'ensemble"
            icon={TrendingUp}
            isActive={activeTab === 'overview'}
            onTabChange={onTabChange}
            customNames={customNames}
            onRenameStart={startEditing}
            isEditing={editingTabId === 'overview'}
            editValue={editValue}
            setEditValue={setEditValue}
            onRenameSave={saveEdit}
            onRenameKeyDown={handleKeyDown}
            inputRef={inputRef}
          />

          {/* Séparateur */}
          <div className="flex items-center mx-1 flex-shrink-0">
            <div className="w-px h-5 bg-gray-200" />
          </div>

          {/* Groupes déroulants */}
          {GROUPS.map(group => (
            <GroupDropdown
              key={group.id}
              group={group}
              activeTab={activeTab}
              onTabChange={onTabChange}
              customNames={customNames}
            />
          ))}

          {/* Séparateur avant les dashboards custom */}
          {orderedDashboards.length > 0 && (
            <div className="flex items-center mx-1 flex-shrink-0">
              <div className="w-px h-5 bg-gray-200" />
            </div>
          )}

          {/* Dashboards custom — draggables */}
          {orderedDashboards.map((dashboard, index) => {
            const tabId = `custom_${dashboard.id}`;
            return (
              <StandaloneTab
                key={dashboard.id}
                tabId={tabId}
                label={dashboard.name}
                icon={LayoutDashboard}
                isActive={activeTab === tabId}
                onTabChange={onTabChange}
                draggable
                dragHandlers={makeDragHandlers(index)}
                isDraggingOver={dropIndex === index}
                customNames={{}}
              />
            );
          })}

          {/* Bouton "+" */}
          <button
            onClick={onCreateDashboard}
            className="flex items-center gap-1 px-3 py-3 sm:py-4 text-gray-400 hover:text-blue-500 border-b-2 border-transparent transition-colors flex-shrink-0"
            title="Créer un tableau de bord"
          >
            <Plus size={16} />
          </button>
        </nav>
      </div>
    </div>
  );
};
