/**
 * SidebarNavigation — Menu latéral gauche avec sections dépliables
 * Sections renommables, items renommables, redimensionnable par drag
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  TrendingUp, DollarSign, Server, ShoppingCart, BarChart2, AlertTriangle,
  Table2, Tag, LayoutGrid, Building2, Plus, LayoutDashboard, ChevronDown,
  ChevronRight, PanelLeftClose, PanelLeftOpen, Settings, LogOut, Pencil, Scale,
} from 'lucide-react';
import { loadTabNames, saveTabNames } from '../../services/storageService';
import { useSettings } from '../../contexts/SettingsContext';

// ── Définition — Analyse d'abord, Détails ensuite ────────────────────────────

export const SECTIONS = [
  {
    id: 'analyse',
    label: 'Analyse',
    color: 'indigo',
    items: [
      { id: 'analytique', label: 'Vue analytique', icon: BarChart2 },
      { id: 'comptes',    label: 'Par comptes',       icon: Table2 },
      { id: 'matrice',    label: 'Matrice',           icon: LayoutGrid },
      { id: 'anomalies',       label: 'Anomalies',         icon: AlertTriangle },
      { id: 'editeurs',        label: 'Éditeurs',          icon: Building2 },
      { id: 'reconciliation',  label: 'Rapprochement',     icon: Scale },
    ],
  },
  {
    id: 'saisie',
    label: 'Détails',
    color: 'blue',
    items: [
      { id: 'opex',        label: 'Liste OPEX par fournisseur', icon: DollarSign },
      { id: 'capex',       label: 'Liste CAPEX par Enveloppe',  icon: Server },
      { id: 'commandes',   label: 'Détails commandes',          icon: ShoppingCart },
      { id: 'ordersOpex',  label: 'Saisie des commandes OPEX (si saisie manuelle)',  icon: ShoppingCart },
      { id: 'ordersCapex', label: 'Saisie des commandes CAPEX (si saisie manuelle)', icon: ShoppingCart },
    ],
  },
  {
    id: 'referentiel',
    label: 'Référentiel et recalculs',
    color: 'violet',
    items: [
      { id: 'reclassement', label: 'Reclassement', icon: Tag },
      { id: 'projection',   label: 'Projection',   icon: TrendingUp },
    ],
  },
];

// Liste à plat des onglets navigables (pour le paramétrage d'affichage)
export const NAV_TABS = SECTIONS.flatMap(s =>
  s.items.map(i => ({ id: i.id, label: i.label, section: s.label }))
);

const SECTION_COLOR = {
  blue:   { text: 'text-blue-600',   bg: 'bg-blue-50',   border: 'border-blue-200' },
  indigo: { text: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-200' },
  violet: { text: 'text-violet-600', bg: 'bg-violet-50', border: 'border-violet-200' },
};

const STORAGE_KEY_COLLAPSED = 'hospifinance_sidebar_collapsed';
const STORAGE_KEY_SECTIONS   = 'hospifinance_sidebar_sections';
const STORAGE_KEY_WIDTH      = 'hospifinance_sidebar_width';
const WIDTH_MIN = 180;
const WIDTH_MAX = 400;
const WIDTH_DEFAULT = 224; // w-56

// ── NavItem — défini HORS du composant parent pour éviter le remount ──────────

function NavItem({
  id, label, icon: Icon, indent,
  activeTab, collapsed,
  editingId, editingValue, inputRef,
  onTabChange, startEdit, setEditingValue, commitEdit, cancelEdit,
  getName,
}) {
  const active = activeTab === id;
  const displayLabel = getName(id, label);
  const isEditing = editingId === id;

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') commitEdit();
    if (e.key === 'Escape') cancelEdit();
  };

  return (
    <div className="group/item relative">
      <button
        onClick={() => !isEditing && onTabChange(id)}
        title={collapsed ? displayLabel : undefined}
        className={`
          w-full flex items-center gap-3 rounded-lg transition-colors
          ${collapsed ? 'justify-center px-2 py-2.5' : `px-3 py-2 ${indent ? 'pl-9' : ''}`}
          ${active
            ? 'bg-indigo-600 text-white shadow-sm'
            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}
        `}
      >
        <Icon size={16} className={`flex-shrink-0 ${active ? 'text-white' : 'text-gray-400'}`} />
        {!collapsed && (
          isEditing ? (
            <input
              ref={inputRef}
              value={editingValue}
              onChange={e => setEditingValue(e.target.value)}
              onBlur={commitEdit}
              onKeyDown={handleKeyDown}
              onClick={e => e.stopPropagation()}
              className="flex-1 text-sm bg-white border border-indigo-400 rounded px-1 py-0.5 text-gray-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 min-w-0"
              maxLength={32}
            />
          ) : (
            <span className="text-sm font-medium truncate flex-1 text-left">{displayLabel}</span>
          )
        )}
      </button>

      {!collapsed && !isEditing && (
        <button
          onClick={(e) => startEdit(id, label, e)}
          title="Renommer"
          className={`
            absolute right-2 top-1/2 -translate-y-1/2
            opacity-0 group-hover/item:opacity-100 transition-opacity
            p-0.5 rounded hover:bg-white/80
            ${active ? 'text-white/70 hover:text-white' : 'text-gray-400 hover:text-indigo-600'}
          `}
        >
          <Pencil size={11} />
        </button>
      )}
    </div>
  );
}

// ── SectionHeader — défini HORS du composant parent ──────────────────────────

function SectionHeader({
  id, label, color, collapsed, openSections, toggleSection,
  editingId, editingValue, inputRef,
  startEdit, setEditingValue, commitEdit, cancelEdit,
  getName,
}) {
  const c = SECTION_COLOR[color];
  const isOpen = openSections[id];
  const groupKey = `__group__${id}`;
  const isEditing = editingId === groupKey;
  const displayLabel = getName(groupKey, label);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') commitEdit();
    if (e.key === 'Escape') cancelEdit();
  };

  if (collapsed) {
    return <div className={`mx-2 my-1 h-px ${c.bg} border-t ${c.border}`} title={displayLabel} />;
  }

  return (
    <div className="group/section flex items-center justify-between px-3 py-1.5 mt-1">
      <button
        onClick={() => !isEditing && toggleSection(id)}
        className="flex items-center gap-1 flex-1 min-w-0"
      >
        {isEditing ? (
          <input
            ref={inputRef}
            value={editingValue}
            onChange={e => setEditingValue(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={handleKeyDown}
            onClick={e => e.stopPropagation()}
            className="w-full text-[10px] font-bold uppercase tracking-widest bg-white border border-indigo-400 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            maxLength={24}
          />
        ) : (
          <span className={`text-[10px] font-bold uppercase tracking-widest ${c.text}`}>
            {displayLabel}
          </span>
        )}
      </button>

      <div className="flex items-center gap-1 flex-shrink-0">
        {!isEditing && (
          <button
            onClick={(e) => startEdit(groupKey, label, e)}
            title="Renommer le groupe"
            className="opacity-0 group-hover/section:opacity-100 transition-opacity p-0.5 rounded text-gray-300 hover:text-indigo-500"
          >
            <Pencil size={10} />
          </button>
        )}
        <button onClick={() => toggleSection(id)} className="text-gray-300 hover:text-gray-500">
          {isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        </button>
      </div>
    </div>
  );
}

// ── Composant principal ───────────────────────────────────────────────────────

export default function SidebarNavigation({
  activeTab,
  onTabChange,
  onCreateDashboard,
  appName,
  username,
  onSettings,
  onLogout,
  canAccessSettings,
}) {
  const { settings } = useSettings();
  const customDashboards = settings.customDashboards || [];
  const hiddenTabs = settings.hiddenTabs || [];

  const [collapsed, setCollapsed] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY_COLLAPSED)) ?? false; } catch { return false; }
  });

  const [sidebarWidth, setSidebarWidth] = useState(() => {
    try { return parseInt(localStorage.getItem(STORAGE_KEY_WIDTH), 10) || WIDTH_DEFAULT; } catch { return WIDTH_DEFAULT; }
  });

  const [openSections, setOpenSections] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY_SECTIONS));
      return saved ?? { saisie: true, analyse: true, referentiel: true, dashboards: true };
    } catch {
      return { saisie: true, analyse: true, referentiel: true, dashboards: true };
    }
  });

  const [customNames, setCustomNames] = useState(() => loadTabNames() || {});
  const [editingId, setEditingId] = useState(null);
  const [editingValue, setEditingValue] = useState('');
  const inputRef = useRef(null);

  // Drag resize state
  const isDragging = useRef(false);
  const dragStartX = useRef(0);
  const dragStartWidth = useRef(0);

  // Focus automatique à l'ouverture de l'édition
  useEffect(() => {
    if (editingId && inputRef.current) inputRef.current.focus();
  }, [editingId]);

  // Ouvrir automatiquement la section contenant l'onglet actif
  useEffect(() => {
    const section = SECTIONS.find(s => s.items.some(i => i.id === activeTab));
    if (section) setOpenSections(prev => ({ ...prev, [section.id]: true }));
  }, [activeTab]);

  const toggleCollapsed = useCallback(() => {
    setCollapsed(prev => {
      const next = !prev;
      try { localStorage.setItem(STORAGE_KEY_COLLAPSED, JSON.stringify(next)); } catch { /* noop */ }
      return next;
    });
  }, []);

  const toggleSection = useCallback((id) => {
    setOpenSections(prev => {
      const next = { ...prev, [id]: !prev[id] };
      try { localStorage.setItem(STORAGE_KEY_SECTIONS, JSON.stringify(next)); } catch { /* noop */ }
      return next;
    });
  }, []);

  // ── Renommage ─────────────────────────────────────────────────────────────

  const startEdit = useCallback((id, currentLabel, e) => {
    e.stopPropagation();
    setEditingId(id);
    setEditingValue(customNames[id] || currentLabel);
  }, [customNames]);

  const commitEdit = useCallback(() => {
    if (!editingId) return;
    const trimmed = editingValue.trim();
    const updated = { ...customNames };
    if (trimmed) updated[editingId] = trimmed;
    else delete updated[editingId];
    setCustomNames(updated);
    saveTabNames(updated);
    setEditingId(null);
  }, [editingId, editingValue, customNames]);

  const cancelEdit = useCallback(() => setEditingId(null), []);

  const getName = useCallback((id, fallback) => customNames[id] || fallback, [customNames]);

  // ── Drag resize ───────────────────────────────────────────────────────────

  const onDragStart = useCallback((e) => {
    e.preventDefault();
    isDragging.current = true;
    dragStartX.current = e.clientX;
    dragStartWidth.current = sidebarWidth;

    const onMove = (ev) => {
      if (!isDragging.current) return;
      const delta = ev.clientX - dragStartX.current;
      const newW = Math.min(WIDTH_MAX, Math.max(WIDTH_MIN, dragStartWidth.current + delta));
      setSidebarWidth(newW);
    };
    const onUp = () => {
      isDragging.current = false;
      setSidebarWidth(w => {
        try { localStorage.setItem(STORAGE_KEY_WIDTH, String(w)); } catch { /* noop */ }
        return w;
      });
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [sidebarWidth]);

  // Props partagées transmises aux sous-composants
  const sharedProps = {
    activeTab, collapsed,
    editingId, editingValue, inputRef,
    onTabChange, startEdit, setEditingValue, commitEdit, cancelEdit,
    getName,
  };

  const sectionProps = {
    collapsed, openSections, toggleSection,
    editingId, editingValue, inputRef,
    startEdit, setEditingValue, commitEdit, cancelEdit,
    getName,
  };

  // ── Rendu ─────────────────────────────────────────────────────────────────

  return (
    <aside
      style={collapsed ? undefined : { width: sidebarWidth }}
      className={`
        relative flex flex-col bg-white border-r border-gray-200 h-screen sticky top-0 flex-shrink-0
        transition-[width] duration-200 ease-in-out
        ${collapsed ? 'w-14' : ''}
      `}
    >
      {/* Logo / App name */}
      <div className={`flex items-center gap-2 px-3 py-4 border-b border-gray-100 flex-shrink-0 ${collapsed ? 'justify-center' : ''}`}>
        <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
          <span className="text-white text-xs font-bold">HF</span>
        </div>
        {!collapsed && (
          <span className="text-sm font-bold text-gray-800 truncate leading-tight">{appName}</span>
        )}
      </div>

      {/* Scroll area */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-2 space-y-0.5 px-2">

        <NavItem id="overview" label="Vue d'ensemble" icon={TrendingUp} {...sharedProps} />

        {SECTIONS.map(section => {
          const visibleItems = section.items.filter(item => !hiddenTabs.includes(item.id));
          if (visibleItems.length === 0) return null;
          return (
            <div key={section.id}>
              <SectionHeader id={section.id} label={section.label} color={section.color} {...sectionProps} />
              {(openSections[section.id] || collapsed) && (
                <div className="space-y-0.5">
                  {visibleItems.map(item => (
                    <NavItem key={item.id} id={item.id} label={item.label} icon={item.icon} indent {...sharedProps} />
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {customDashboards.length > 0 && (
          <div>
            <SectionHeader id="dashboards" label="Tableaux de bord" color="blue" {...sectionProps} />
            {(openSections.dashboards || collapsed) && (
              <div className="space-y-0.5">
                {customDashboards.map(d => (
                  <NavItem
                    key={d.id}
                    id={`custom_${d.id}`}
                    label={d.name}
                    icon={LayoutDashboard}
                    indent
                    {...sharedProps}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        <button
          onClick={onCreateDashboard}
          title={collapsed ? 'Nouveau tableau de bord' : undefined}
          className={`
            w-full flex items-center gap-3 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors mt-1
            ${collapsed ? 'justify-center px-2 py-2.5' : 'px-3 py-2 pl-9'}
          `}
        >
          <Plus size={15} className="flex-shrink-0" />
          {!collapsed && <span className="text-sm">Nouveau tableau…</span>}
        </button>
      </nav>

      {/* Pied : utilisateur + actions */}
      <div className="flex-shrink-0 border-t border-gray-100 p-2 space-y-1">
        {!collapsed && username && (
          <div className="px-3 py-1.5 text-xs text-gray-500 truncate font-medium">{username}</div>
        )}
        {canAccessSettings && (
          <button
            onClick={onSettings}
            title={collapsed ? 'Paramètres' : undefined}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors text-sm ${collapsed ? 'justify-center' : ''}`}
          >
            <Settings size={15} className="flex-shrink-0" />
            {!collapsed && 'Paramètres'}
          </button>
        )}
        <button
          onClick={onLogout}
          title={collapsed ? 'Déconnexion' : undefined}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors text-sm ${collapsed ? 'justify-center' : ''}`}
        >
          <LogOut size={15} className="flex-shrink-0" />
          {!collapsed && 'Déconnexion'}
        </button>
        <button
          onClick={toggleCollapsed}
          title={collapsed ? 'Développer le menu' : 'Réduire le menu'}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors text-sm ${collapsed ? 'justify-center' : ''}`}
        >
          {collapsed
            ? <PanelLeftOpen size={15} className="flex-shrink-0" />
            : <><PanelLeftClose size={15} className="flex-shrink-0" /><span>Réduire</span></>}
        </button>
      </div>

      {/* Drag handle — bord droit, visible au survol */}
      {!collapsed && (
        <div
          onMouseDown={onDragStart}
          className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-indigo-400 transition-colors group z-10"
          title="Redimensionner le menu"
        >
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-12 bg-indigo-300 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      )}
    </aside>
  );
}
