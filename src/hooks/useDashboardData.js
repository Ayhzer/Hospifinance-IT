/**
 * Hook pour transformer les données brutes en format consommable par les widgets du dashboard builder
 */

import { useMemo } from 'react';

const MONTHS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

/**
 * Regroupe un tableau d'objets par une clé et somme les champs numériques
 */
const groupBy = (items, key, fields) => {
  const map = {};
  items.forEach(item => {
    const k = item[key] || 'Autre';
    if (!map[k]) map[k] = { name: k };
    fields.forEach(f => {
      map[k][f] = (map[k][f] || 0) + (Number(item[f]) || 0);
    });
  });
  return Object.values(map);
};

/**
 * Retourne les données pour une source donnée
 */
export const useDashboardData = ({ suppliers, projects, opexOrders, capexOrders, opexTotals, capexTotals, consolidatedTotals }) => {
  return useMemo(() => {
    const allOrders = [...(opexOrders || []), ...(capexOrders || [])];

    const sources = {
      opex_totals: {
        single: opexTotals,
        chart: [
          { name: 'Budget', value: opexTotals.budget },
          { name: 'Dépense', value: opexTotals.depense },
          { name: 'Engagement', value: opexTotals.engagement },
          { name: 'Disponible', value: opexTotals.disponible }
        ]
      },
      capex_totals: {
        single: capexTotals,
        chart: [
          { name: 'Budget', value: capexTotals.budget },
          { name: 'Dépense', value: capexTotals.depense },
          { name: 'Engagement', value: capexTotals.engagement },
          { name: 'Disponible', value: capexTotals.disponible }
        ]
      },
      consolidated_totals: {
        single: consolidatedTotals,
        chart: [
          { name: 'Budget', value: consolidatedTotals.budget },
          { name: 'Dépense', value: consolidatedTotals.depense },
          { name: 'Engagement', value: consolidatedTotals.engagement },
          { name: 'Disponible', value: consolidatedTotals.disponible }
        ]
      },
      opex_by_category: {
        rows: groupBy(suppliers, 'category', ['budgetAnnuel', 'depenseActuelle', 'engagement']),
        fieldMap: { budget: 'budgetAnnuel', depense: 'depenseActuelle', engagement: 'engagement' }
      },
      opex_by_supplier: {
        rows: (suppliers || []).map(s => ({
          name: s.supplier,
          budget: s.budgetAnnuel,
          depense: s.depenseActuelle,
          engagement: s.engagement
        }))
      },
      capex_by_envelope: {
        rows: groupBy(projects, 'enveloppe', ['budgetTotal', 'depense', 'engagement']),
        fieldMap: { budget: 'budgetTotal', depense: 'depense', engagement: 'engagement' }
      },
      capex_by_project: {
        rows: (projects || []).map(p => ({
          name: p.project,
          budget: p.budgetTotal,
          depense: p.depense,
          engagement: p.engagement
        }))
      },
      capex_by_status: {
        rows: (() => {
          const map = {};
          (projects || []).forEach(p => {
            const s = p.status || 'Inconnu';
            if (!map[s]) map[s] = { name: s, count: 0, budget: 0 };
            map[s].count++;
            map[s].budget += Number(p.budgetTotal) || 0;
          });
          return Object.values(map);
        })()
      },
      orders_by_status: {
        rows: (() => {
          const map = {};
          allOrders.forEach(o => {
            const s = o.status || 'Inconnu';
            if (!map[s]) map[s] = { name: s, count: 0, amount: 0 };
            map[s].count++;
            map[s].amount += Number(o.montant) || 0;
          });
          return Object.values(map);
        })()
      },
      monthly_trends: {
        rows: MONTHS.map((m, i) => {
          let depense = 0;
          let engagement = 0;
          // Simple approximation: répartir les dépenses de manière proportionnelle au mois courant
          const currentMonth = new Date().getMonth();
          (suppliers || []).forEach(s => {
            if (i <= currentMonth) {
              depense += (Number(s.depenseActuelle) || 0) / (currentMonth + 1);
            }
          });
          (projects || []).forEach(p => {
            if (i <= currentMonth) {
              depense += (Number(p.depense) || 0) / (currentMonth + 1);
            }
          });
          return { name: m, depense: Math.round(depense), engagement: Math.round(engagement) };
        })
      }
    };

    return sources;
  }, [suppliers, projects, opexOrders, capexOrders, opexTotals, capexTotals, consolidatedTotals]);
};
