/**
 * TreemapCategories — treemap hiérarchique catégorie analytique → sous-catégorie.
 * Bascule OPEX / CAPEX. Présentationnel : reçoit des groupes déjà agrégés.
 *
 * groups: [{ name, total, children: [{ name, size, fill }] }]
 */

import { useState, useMemo } from 'react';
import { Treemap, ResponsiveContainer, Tooltip } from 'recharts';
import { formatCurrency } from '../../utils/formatters';
import { formatK } from '../../utils/chartUtils';

// Palette de catégories (niveau 1)
const CAT_PALETTE = [
  '#4f46e5', '#0891b2', '#059669', '#d97706', '#db2777',
  '#7c3aed', '#0d9488', '#ca8a04', '#dc2626', '#2563eb',
];

/** Cellule personnalisée : feuilles colorées + libellé sous-catégorie */
const truncate = (str, max) => {
  const s = String(str ?? '');
  return s.length > max ? s.slice(0, Math.max(1, max - 1)) + '…' : s;
};

const TreemapCell = (props) => {
  const { x, y, width, height, depth, name, fill, size } = props;

  // Nœud racine (depth 0) : rien à dessiner
  if (depth === 0 || width <= 0 || height <= 0) return null;

  // Niveau 1 (catégorie) : juste un cadre + nom en haut à gauche si assez large
  if (depth === 1) {
    return (
      <g>
        <rect x={x} y={y} width={width} height={height} fill="none" stroke="#ffffff" strokeWidth={3} />
        {width > 70 && height > 24 && (
          <text x={x + 5} y={y + 14} fontSize={11} fontWeight={700} fill="#111827">
            {truncate(name, Math.floor(width / 7))}
          </text>
        )}
      </g>
    );
  }

  // Niveau 2 (sous-catégorie) : rectangle plein
  const showLabel = width > 46 && height > 26;
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} fill={fill || '#94a3b8'} stroke="#ffffff" strokeWidth={1} opacity={0.92} />
      {showLabel && (
        <>
          <text x={x + 4} y={y + 14} fontSize={9.5} fill="#ffffff" fontWeight={600}>
            {truncate(name, Math.floor(width / 6))}
          </text>
          {height > 40 && (
            <text x={x + 4} y={y + 27} fontSize={9} fill="#ffffff" opacity={0.85}>
              {formatK(size || 0)}
            </text>
          )}
        </>
      )}
    </g>
  );
};

const TreemapTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const node = payload[0]?.payload;
  if (!node || node.children) return null; // n'afficher que les feuilles
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-2.5 text-xs">
      <p className="text-gray-400">{node.catName}</p>
      <p className="font-semibold text-gray-800">{node.name}</p>
      <p className="text-indigo-600 font-bold mt-0.5">{formatCurrency(node.size)}</p>
    </div>
  );
};

export const TreemapCategories = ({ opexGroups = [], capexGroups = [] }) => {
  const [type, setType] = useState('opex');
  const groups = type === 'opex' ? opexGroups : capexGroups;

  // Légende des catégories (niveau 1) triées par montant
  const legend = useMemo(
    () => groups.map((g, i) => ({ name: g.name, total: g.total, color: CAT_PALETTE[i % CAT_PALETTE.length] })),
    [groups]
  );

  const isEmpty = groups.length === 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
        <div>
          <h3 className="text-sm font-semibold text-gray-700">Répartition par catégorie analytique</h3>
          <p className="text-xs text-gray-400">Blocs = catégories · sous-blocs = sous-catégories (taille ∝ charge engagée)</p>
        </div>
        <div className="flex bg-gray-100 rounded-lg p-1 text-sm font-medium">
          <button
            onClick={() => setType('opex')}
            className={`px-3 py-1 rounded-md transition-all ${type === 'opex' ? 'bg-white shadow text-blue-700' : 'text-gray-500 hover:text-gray-700'}`}
          >OPEX</button>
          <button
            onClick={() => setType('capex')}
            className={`px-3 py-1 rounded-md transition-all ${type === 'capex' ? 'bg-white shadow text-emerald-700' : 'text-gray-500 hover:text-gray-700'}`}
          >CAPEX</button>
        </div>
      </div>

      {isEmpty ? (
        <p className="text-sm text-gray-400 italic py-10 text-center">
          Aucune donnée {type === 'opex' ? 'OPEX' : 'CAPEX'} pour cet exercice.
        </p>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={340}>
            <Treemap
              data={groups}
              dataKey="size"
              stroke="#fff"
              isAnimationActive={false}
              content={<TreemapCell />}
            >
              <Tooltip content={<TreemapTooltip />} />
            </Treemap>
          </ResponsiveContainer>

          {/* Légende catégories */}
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3">
            {legend.map(l => (
              <div key={l.name} className="flex items-center gap-1.5 text-xs">
                <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: l.color }} />
                <span className="text-gray-600">{l.name}</span>
                <span className="text-gray-400">{formatK(l.total)}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export { CAT_PALETTE };
export default TreemapCategories;
