/**
 * ComparaisonAnnuelle — compare la consommation budgétaire sur tous les exercices
 * disponibles dans les commandes (champ exercice ou dates), tous flux confondus.
 */

import { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  LabelList, ResponsiveContainer,
} from 'recharts';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';
import { formatK, CustomTooltip, COLORS } from '../../utils/chartUtils';
import { computeYearConsumption, listExercices } from '../../utils/yearCalculations';

/** Variation en % entre deux valeurs */
const variation = (current, previous) => {
  if (!previous) return null;
  return ((current - previous) / previous) * 100;
};

const TrendBadge = ({ value }) => {
  if (value == null) return <span className="text-gray-400 text-xs">—</span>;
  const up = value > 0;
  const flat = Math.abs(value) < 0.5;
  const Icon = flat ? Minus : up ? TrendingUp : TrendingDown;
  // Hausse de dépense = défavorable (rouge), baisse = favorable (vert)
  const color = flat ? 'text-gray-400' : up ? 'text-red-600' : 'text-green-600';
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-semibold ${color}`}>
      <Icon size={12} />
      {up ? '+' : ''}{value.toFixed(1)}%
    </span>
  );
};

/** Étiquette de variation % vs N-1 au-dessus d'une barre */
const makeVariationLabel = (variations) => {
  const VariationLabel = ({ x, y, width, index }) => {
    const v = variations[index];
    if (v == null) return null;
    const up = v > 0;
    const flat = Math.abs(v) < 0.5;
    // Hausse de dépense = défavorable (rouge), baisse = favorable (vert)
    const color = flat ? '#9ca3af' : up ? '#dc2626' : '#16a34a';
    const text = `${flat ? '' : up ? '▲ +' : '▼ '}${v.toFixed(1)}%`;
    return (
      <text
        x={x + width / 2}
        y={y - 6}
        fill={color}
        fontSize={10}
        fontWeight={600}
        textAnchor="middle"
      >
        {text}
      </text>
    );
  };
  return VariationLabel;
};

export const ComparaisonAnnuelle = ({ annee, opexOrders = [], capexOrders = [] }) => {
  const annees = useMemo(() => {
    const n = parseInt(annee, 10);
    // Tous les exercices présents dans les commandes, jusqu'à l'année sélectionnée
    const disponibles = listExercices(opexOrders, capexOrders)
      .filter(y => parseInt(y, 10) <= n);
    if (disponibles.length) {
      return [...disponibles].sort((a, b) => a.localeCompare(b)); // chronologique croissant
    }
    // Repli : N-2 → N si aucune donnée d'exercice détectée
    return [n - 2, n - 1, n].map(String);
  }, [annee, opexOrders, capexOrders]);

  const data = useMemo(() => annees.map((y, i, arr) => {
    const opex  = computeYearConsumption(opexOrders, y);
    const capex = computeYearConsumption(capexOrders, y);
    return {
      annee: y,
      opex:  opex.consomme,
      capex: capex.consomme,
      total: Math.round((opex.consomme + capex.consomme) * 100) / 100,
      _prevYear: arr[i - 1] || null,
    };
  }), [annees, opexOrders, capexOrders]);

  // Variations vs N-1 par flux (alignées sur l'index de `data`)
  const opexVariations  = useMemo(
    () => data.map((d, i) => (i === 0 ? null : variation(d.opex, data[i - 1].opex))),
    [data],
  );
  const capexVariations = useMemo(
    () => data.map((d, i) => (i === 0 ? null : variation(d.capex, data[i - 1].capex))),
    [data],
  );

  const first = data[0];
  const last = data[data.length - 1];
  const hasData = data.some(d => d.total > 0);

  return (
    <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
      <div className="mb-4">
        <h2 className="text-lg sm:text-xl font-bold text-gray-800">Comparaison annuelle</h2>
        <p className="text-xs text-gray-400 mt-0.5">
          Consommation (dépensé + engagé) — {first.annee} → {last.annee}
          <span className="ml-1">· variation % vs N-1 sur chaque barre</span>
        </p>
      </div>

      {!hasData ? (
        <p className="text-sm text-gray-400 italic py-6 text-center">
          Aucune donnée pluriannuelle disponible. Importez une fichier de commandes contenant plusieurs exercices.
        </p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Graphe barres groupées */}
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data} barCategoryGap="25%" margin={{ top: 20, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="annee" style={{ fontSize: '12px' }} />
              <YAxis tickFormatter={formatK} style={{ fontSize: '11px' }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
              <Bar dataKey="opex"  name="OPEX"  fill={COLORS.opex}  radius={[3, 3, 0, 0]}>
                <LabelList dataKey="opex" content={makeVariationLabel(opexVariations)} />
              </Bar>
              <Bar dataKey="capex" name="CAPEX" fill={COLORS.capex} radius={[3, 3, 0, 0]}>
                <LabelList dataKey="capex" content={makeVariationLabel(capexVariations)} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          {/* Tableau récapitulatif avec variations */}
          <div className="overflow-hidden rounded-xl border border-gray-200 self-start">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-left text-xs">
                  <th className="px-3 py-2 font-semibold">Exercice</th>
                  <th className="px-2 py-2 font-semibold text-right">OPEX</th>
                  <th className="px-2 py-2 font-semibold text-right">CAPEX</th>
                  <th className="px-2 py-2 font-semibold text-right">Total</th>
                  <th className="px-2 py-2 font-semibold text-right">vs N-1</th>
                </tr>
              </thead>
              <tbody>
                {[...data].reverse().map((row) => {
                  const idx = data.indexOf(row);
                  const prev = idx > 0 ? data[idx - 1] : null;
                  const isCurrent = row.annee === String(annee);
                  return (
                    <tr key={row.annee} className={`border-t border-gray-100 ${isCurrent ? 'bg-indigo-50/50 font-medium' : ''}`}>
                      <td className="px-3 py-2 text-gray-800">
                        {row.annee}
                        {isCurrent && <span className="ml-1 text-[10px] text-indigo-600">(sélectionné)</span>}
                      </td>
                      <td className="px-2 py-2 text-right text-gray-600">{formatK(row.opex)}</td>
                      <td className="px-2 py-2 text-right text-gray-600">{formatK(row.capex)}</td>
                      <td className="px-2 py-2 text-right font-semibold text-gray-800">{formatK(row.total)}</td>
                      <td className="px-2 py-2 text-right">
                        <TrendBadge value={prev ? variation(row.total, prev.total) : null} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="px-3 py-2 bg-gray-50 border-t border-gray-100 text-[11px] text-gray-500">
              Total cumulé {first.annee}-{last.annee} :{' '}
              <strong className="text-gray-700">{formatCurrency(data.reduce((s, d) => s + d.total, 0))}</strong>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ComparaisonAnnuelle;
