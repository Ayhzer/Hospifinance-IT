/**
 * Composant EnveloppesSummary - Agrégation des projets CAPEX par enveloppe budgétaire
 */

import { useState, useMemo } from 'react';
import { ChevronDown, ChevronUp, Package } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';
import { calculateAvailable, calculateUsageRate } from '../../utils/calculations';
import { getEnveloppeColor } from '../../constants/budgetConstants';
import { ProgressBar } from '../common/ProgressBar';

export const EnveloppesSummary = ({ projects, calculateEnveloppeTotal, getUsedEnveloppes }) => {
  const [isOpen, setIsOpen] = useState(true);
  const [expandedEnveloppes, setExpandedEnveloppes] = useState(new Set());

  // Récupérer les enveloppes utilisées
  const usedEnveloppes = useMemo(() => getUsedEnveloppes(), [getUsedEnveloppes]);

  // Basculer l'expansion d'une enveloppe
  const toggleEnveloppe = (enveloppe) => {
    setExpandedEnveloppes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(enveloppe)) {
        newSet.delete(enveloppe);
      } else {
        newSet.add(enveloppe);
      }
      return newSet;
    });
  };

  // Obtenir les projets d'une enveloppe
  const getEnveloppeProjects = (enveloppe) => {
    return projects.filter(p => p.enveloppe === enveloppe);
  };

  if (usedEnveloppes.length === 0) {
    return null;
  }

  return (
    <div className="mb-6">
      <button
        onClick={() => setIsOpen(prev => !prev)}
        className="w-full flex items-center justify-between gap-2 mb-3 group"
      >
        <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
          <Package size={20} className="text-blue-600" />
          Synthèse par Enveloppe Budgétaire
        </h3>
        <span className="flex items-center gap-1 text-xs text-gray-400 group-hover:text-gray-600 transition-colors flex-shrink-0">
          {isOpen ? 'Réduire' : 'Afficher'}
          {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </span>
      </button>

      {isOpen && <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {usedEnveloppes.map((enveloppe) => {
          const totals = calculateEnveloppeTotal(enveloppe);
          const disponible = calculateAvailable(totals.budget, totals.depense, totals.engagement);
          const tauxUtilisation = calculateUsageRate(totals.budget, totals.depense, totals.engagement);
          const isExpanded = expandedEnveloppes.has(enveloppe);
          const enveloppeProjects = getEnveloppeProjects(enveloppe);
          const colorClass = getEnveloppeColor(enveloppe, usedEnveloppes);

          return (
            <div
              key={enveloppe}
              className={`border rounded-lg overflow-hidden ${colorClass} shadow-sm hover:shadow-md transition-shadow`}
            >
              {/* En-tête de l'enveloppe */}
              <button
                onClick={() => toggleEnveloppe(enveloppe)}
                className="w-full p-4 text-left flex items-center justify-between hover:opacity-80 transition-opacity"
              >
                <div className="flex-1">
                  <h4 className="font-semibold text-sm mb-1">{enveloppe}</h4>
                  <p className="text-xs opacity-75">{totals.count} projet{totals.count > 1 ? 's' : ''}</p>
                </div>
                {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </button>

              {/* Détails de l'enveloppe */}
              <div className="px-4 pb-4 bg-white space-y-2">
                {/* Totaux */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <div className="text-gray-500">Budget</div>
                    <div className="font-semibold">{formatCurrency(totals.budget)}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Dépensé</div>
                    <div className="font-semibold text-orange-600">{formatCurrency(totals.depense)}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Engagé</div>
                    <div className="font-semibold text-yellow-600">{formatCurrency(totals.engagement)}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Disponible</div>
                    <div className={`font-semibold ${disponible < 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {formatCurrency(disponible)}
                    </div>
                  </div>
                </div>

                {/* Barre de progression */}
                <div>
                  <ProgressBar value={tauxUtilisation} showLabel={true} size="sm" />
                </div>

                {/* Liste des projets (si développé) */}
                {isExpanded && enveloppeProjects.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <div className="space-y-1">
                      {enveloppeProjects.map((project) => {
                        const projectDisponible = calculateAvailable(
                          project.budgetTotal,
                          project.depense,
                          project.engagement
                        );
                        const projectTaux = calculateUsageRate(
                          project.budgetTotal,
                          project.depense,
                          project.engagement
                        );

                        return (
                          <div key={project.id} className="text-xs bg-gray-50 rounded p-2">
                            <div className="font-medium text-gray-800 mb-1">{project.project}</div>
                            <div className="grid grid-cols-2 gap-1 text-gray-600">
                              <div>Budget: {formatCurrency(project.budgetTotal)}</div>
                              <div className={projectDisponible < 0 ? 'text-red-600' : 'text-green-600'}>
                                Dispo: {formatCurrency(projectDisponible)}
                              </div>
                            </div>
                            <div className="mt-1">
                              <ProgressBar value={projectTaux} showLabel={false} size="xs" />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>}
    </div>
  );
};

export default EnveloppesSummary;
