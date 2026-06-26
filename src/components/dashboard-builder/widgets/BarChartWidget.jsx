import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { CATEGORY_COLORS, formatK, CustomTooltip } from '../../../utils/chartUtils';

export const BarChartWidget = ({ data, config }) => {
  const { field } = config || {};
  const rows = data?.chart || data?.rows;

  if (!rows?.length) return <p className="text-gray-400 text-sm text-center mt-4">Aucune donnée</p>;

  // Déterminer le champ à afficher
  const fieldMap = data?.fieldMap || {};
  const dataKey = fieldMap[field] || field || 'value';

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={rows} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-25} textAnchor="end" height={50} />
        <YAxis tickFormatter={formatK} tick={{ fontSize: 11 }} width={55} />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey={dataKey} radius={[4, 4, 0, 0]}>
          {rows.map((_, i) => (
            <rect key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};
