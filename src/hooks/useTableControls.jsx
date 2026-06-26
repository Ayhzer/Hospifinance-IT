/**
 * Hook useTableControls - Tri et filtrage pour les tableaux
 * Réutilisable pour OpexTable et CapexTable
 */

import React, { useState, useMemo, useCallback } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown, X } from 'lucide-react';

/**
 * Composant FilterInput stable — défini au niveau module pour éviter
 * les re-montages (et donc la perte de focus) lors des changements de filtres.
 * Usage : <FilterInput {...getFilterProps(columnKey, placeholder)} />
 */
export const FilterInput = React.memo(({ value, onChange, onClear, placeholder }) => (
  <div className="relative">
    <input
      type="text"
      value={value || ''}
      onChange={onChange}
      placeholder={placeholder || 'Filtrer...'}
      className="w-full px-1.5 py-1 text-xs border border-gray-200 rounded bg-white focus:ring-1 focus:ring-blue-400 focus:border-blue-400 outline-none"
      onClick={(e) => e.stopPropagation()}
    />
    {value && (
      <button
        onClick={onClear}
        className="absolute right-1 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
      >
        <X size={10} />
      </button>
    )}
  </div>
));
FilterInput.displayName = 'FilterInput';

/**
 * @param {Array} data - Les données à trier/filtrer
 * @param {Object} options - { numericColumns: string[], dateColumns: string[] }
 */
export const useTableControls = (data, options = {}) => {
  const { numericColumns = [], dateColumns = [] } = options;

  // État du tri : { key: string, direction: 'asc' | 'desc' } | null
  const [sort, setSort] = useState(null);

  // État des filtres : { [columnKey]: string }
  const [filters, setFilters] = useState({});

  // Indique si au moins un filtre est actif
  const hasActiveFilters = useMemo(
    () => Object.values(filters).some(v => v && v.trim() !== ''),
    [filters]
  );

  // Toggle le tri sur une colonne
  const toggleSort = useCallback((key) => {
    setSort(prev => {
      if (!prev || prev.key !== key) return { key, direction: 'asc' };
      if (prev.direction === 'asc') return { key, direction: 'desc' };
      return null; // 3ème clic → pas de tri
    });
  }, []);

  // Met à jour un filtre
  const setFilter = useCallback((key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  // Réinitialise tous les filtres
  const clearFilters = useCallback(() => {
    setFilters({});
  }, []);

  /**
   * Retourne les props à passer à <FilterInput> pour une colonne donnée.
   * Utiliser : <FilterInput {...getFilterProps('colKey', 'Placeholder...')} />
   */
  const getFilterProps = useCallback((columnKey, placeholder = 'Filtrer...') => ({
    value: filters[columnKey] || '',
    onChange: (e) => setFilter(columnKey, e.target.value),
    onClear: (e) => { e.stopPropagation(); setFilter(columnKey, ''); },
    placeholder
  }), [filters, setFilter]);

  // Données filtrées puis triées
  const processedData = useMemo(() => {
    let result = [...data];

    // Filtrage
    const activeFilters = Object.entries(filters).filter(([, v]) => v && v.trim() !== '');
    if (activeFilters.length > 0) {
      result = result.filter(item => {
        return activeFilters.every(([key, filterValue]) => {
          const cellValue = item[key];
          if (cellValue == null) return false;
          return String(cellValue).toLowerCase().includes(filterValue.toLowerCase().trim());
        });
      });
    }

    // Tri
    if (sort) {
      const { key, direction } = sort;
      const isNumeric = numericColumns.includes(key);
      const isDate = dateColumns.includes(key);

      result.sort((a, b) => {
        let valA = a[key];
        let valB = b[key];

        if (valA == null) valA = '';
        if (valB == null) valB = '';

        let comparison;
        if (isNumeric) {
          comparison = (Number(valA) || 0) - (Number(valB) || 0);
        } else if (isDate) {
          comparison = new Date(valA || 0) - new Date(valB || 0);
        } else {
          comparison = String(valA).localeCompare(String(valB), 'fr', { sensitivity: 'base' });
        }

        return direction === 'desc' ? -comparison : comparison;
      });
    }

    return result;
  }, [data, filters, sort, numericColumns, dateColumns]);

  // Composant icône de tri pour les en-têtes
  const SortIcon = useCallback(({ columnKey }) => {
    const isActive = sort?.key === columnKey;
    if (!isActive) {
      return <ChevronsUpDown size={12} className="inline ml-1 text-gray-400" />;
    }
    return sort.direction === 'asc'
      ? <ChevronUp size={12} className="inline ml-1 text-blue-600" />
      : <ChevronDown size={12} className="inline ml-1 text-blue-600" />;
  }, [sort]);

  return {
    sort,
    filters,
    hasActiveFilters,
    toggleSort,
    setFilter,
    clearFilters,
    processedData,
    SortIcon,
    getFilterProps,
  };
};
