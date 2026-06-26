/**
 * Constantes pour le Dashboard Builder
 */

export const WIDGET_TYPES = {
  kpi: { id: 'kpi', label: 'Indicateur (KPI)', icon: 'Hash' },
  bar: { id: 'bar', label: 'Graphique en barres', icon: 'BarChart3' },
  pie: { id: 'pie', label: 'Camembert / Donut', icon: 'PieChart' },
  line: { id: 'line', label: 'Courbe', icon: 'TrendingUp' },
  table: { id: 'table', label: 'Tableau', icon: 'Table' }
};

export const WIDGET_SIZES = {
  sm: { label: 'Petit (1 col)', cols: 1 },
  md: { label: 'Moyen (2 col)', cols: 2 },
  lg: { label: 'Large (3 col)', cols: 3 },
  full: { label: 'Pleine largeur', cols: 4 }
};

export const DATA_SOURCES = {
  opex_totals: {
    label: 'Totaux OPEX',
    compatibleWidgets: ['kpi', 'bar', 'pie'],
    fields: {
      budget: 'Budget',
      depense: 'Dépense',
      engagement: 'Engagement',
      disponible: 'Disponible'
    }
  },
  capex_totals: {
    label: 'Totaux CAPEX',
    compatibleWidgets: ['kpi', 'bar', 'pie'],
    fields: {
      budget: 'Budget',
      depense: 'Dépense',
      engagement: 'Engagement',
      disponible: 'Disponible'
    }
  },
  consolidated_totals: {
    label: 'Consolidé OPEX + CAPEX',
    compatibleWidgets: ['kpi', 'bar', 'pie'],
    fields: {
      budget: 'Budget',
      depense: 'Dépense',
      engagement: 'Engagement',
      disponible: 'Disponible'
    }
  },
  opex_by_category: {
    label: 'OPEX par catégorie',
    compatibleWidgets: ['bar', 'pie', 'table'],
    fields: {
      budget: 'Budget',
      depense: 'Dépense',
      engagement: 'Engagement'
    }
  },
  opex_by_supplier: {
    label: 'OPEX par fournisseur',
    compatibleWidgets: ['bar', 'pie', 'table'],
    fields: {
      budget: 'Budget',
      depense: 'Dépense',
      engagement: 'Engagement'
    }
  },
  capex_by_envelope: {
    label: 'CAPEX par enveloppe',
    compatibleWidgets: ['bar', 'pie', 'table'],
    fields: {
      budget: 'Budget',
      depense: 'Dépense',
      engagement: 'Engagement'
    }
  },
  capex_by_project: {
    label: 'CAPEX par projet',
    compatibleWidgets: ['bar', 'table'],
    fields: {
      budget: 'Budget',
      depense: 'Dépense',
      engagement: 'Engagement'
    }
  },
  capex_by_status: {
    label: 'CAPEX par statut',
    compatibleWidgets: ['bar', 'pie', 'table'],
    fields: {
      count: 'Nombre',
      budget: 'Budget'
    }
  },
  orders_by_status: {
    label: 'Commandes par statut',
    compatibleWidgets: ['bar', 'pie', 'table'],
    fields: {
      count: 'Nombre',
      amount: 'Montant'
    }
  },
  monthly_trends: {
    label: 'Tendances mensuelles',
    compatibleWidgets: ['line', 'bar', 'table'],
    fields: {
      depense: 'Dépense',
      engagement: 'Engagement'
    }
  }
};

export const DEFAULT_WIDGET_SIZE = {
  kpi: 'sm',
  bar: 'md',
  pie: 'md',
  line: 'lg',
  table: 'full'
};
