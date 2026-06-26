import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { CATEGORY_COLORS, CustomTooltip } from '../../../utils/chartUtils';

export const PieChartWidget = ({ data, config }) => {
  const { field } = config || {};
  const rows = data?.chart || data?.rows;

  if (!rows?.length) return <p className="text-gray-400 text-sm text-center mt-4">Aucune donnée</p>;

  const fieldMap = data?.fieldMap || {};
  const dataKey = fieldMap[field] || field || 'value';

  // Filtrer les valeurs nulles/zéro
  const filtered = rows.filter(r => (r[dataKey] || 0) > 0);
  if (!filtered.length) return <p className="text-gray-400 text-sm text-center mt-4">Aucune donnée positive</p>;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={filtered}
          dataKey={dataKey}
          nameKey="name"
          cx="50%"
          cy="50%"
          innerRadius="40%"
          outerRadius="75%"
          paddingAngle={2}
          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
          labelLine={{ strokeWidth: 1 }}
        >
          {filtered.map((_, i) => (
            <Cell key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
      </PieChart>
    </ResponsiveContainer>
  );
};
