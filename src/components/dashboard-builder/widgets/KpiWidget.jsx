import { formatCurrency } from '../../../utils/formatters';

export const KpiWidget = ({ data, config }) => {
  if (!data) return <p className="text-gray-400 text-sm">Aucune donnée</p>;

  const { field } = config || {};
  const single = data.single;

  if (!single || !field) return <p className="text-gray-400 text-sm">Configuration incomplète</p>;

  const value = single[field] ?? 0;
  const budget = single.budget ?? 1;
  const pct = budget > 0 ? ((value / budget) * 100).toFixed(1) : 0;

  const colorClass = field === 'disponible'
    ? 'text-green-600'
    : field === 'depense'
      ? 'text-orange-600'
      : 'text-blue-600';

  return (
    <div className="flex flex-col items-center justify-center h-full py-4">
      <span className={`text-3xl font-bold ${colorClass}`}>{formatCurrency(value)}</span>
      {field !== 'budget' && (
        <span className="text-sm text-gray-500 mt-1">{pct}% du budget</span>
      )}
    </div>
  );
};
