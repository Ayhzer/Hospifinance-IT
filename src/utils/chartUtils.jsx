/**
 * Utilitaires partagés pour les graphiques (recharts)
 */

import { formatCurrency } from './formatters';

export const COLORS = {
  opex: '#3b82f6',
  capex: '#10b981',
  depense: '#f97316',
  engagement: '#eab308',
  disponible: '#22c55e',
  budget: '#6366f1',
  forecast: '#ec4899',
  danger: '#ef4444',
  warning: '#f59e0b',
  safe: '#22c55e',
  gray: '#9ca3af'
};

export const CATEGORY_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16'
];

/** Formate un montant en K€ ou M€ */
export const formatK = (value) => {
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M€`;
  if (Math.abs(value) >= 1_000) return `${(value / 1_000).toFixed(0)}K€`;
  return `${value.toFixed(0)}€`;
};

/** Tooltip personnalisé pour recharts */
export const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm">
      <p className="font-semibold text-gray-800 mb-1">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} style={{ color: entry.color || entry.fill }}>
          {entry.name}: {formatCurrency(entry.value)}
        </p>
      ))}
    </div>
  );
};
