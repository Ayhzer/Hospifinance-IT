import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { CATEGORY_COLORS, formatK, CustomTooltip } from '../../../utils/chartUtils';

export const LineChartWidget = ({ data, config }) => {
  const { field } = config || {};
  const rows = data?.rows;

  if (!rows?.length) return <p className="text-gray-400 text-sm text-center mt-4">Aucune donnée</p>;

  const fieldMap = data?.fieldMap || {};
  const dataKey = fieldMap[field] || field || 'depense';

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={rows} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
        <YAxis tickFormatter={formatK} tick={{ fontSize: 11 }} width={55} />
        <Tooltip content={<CustomTooltip />} />
        <Line type="monotone" dataKey={dataKey} stroke={CATEGORY_COLORS[0]} strokeWidth={2} dot={{ r: 3 }} />
      </LineChart>
    </ResponsiveContainer>
  );
};
