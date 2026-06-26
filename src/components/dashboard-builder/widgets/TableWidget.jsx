import { formatCurrency } from '../../../utils/formatters';

export const TableWidget = ({ data }) => {
  const rows = data?.rows;

  if (!rows?.length) return <p className="text-gray-400 text-sm text-center mt-4">Aucune donnée</p>;

  // Colonnes = toutes les clés sauf "name"
  const allKeys = Object.keys(rows[0]).filter(k => k !== 'name');

  // Labels pour les colonnes
  const colLabels = {
    budget: 'Budget', budgetAnnuel: 'Budget', budgetTotal: 'Budget',
    depense: 'Dépense', depenseActuelle: 'Dépense',
    engagement: 'Engagement',
    disponible: 'Disponible',
    count: 'Nombre',
    amount: 'Montant',
    value: 'Valeur'
  };

  return (
    <div className="overflow-auto max-h-full">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-2 px-2 font-semibold text-gray-700">Nom</th>
            {allKeys.map(k => (
              <th key={k} className="text-right py-2 px-2 font-semibold text-gray-700">
                {colLabels[k] || k}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
              <td className="py-1.5 px-2 text-gray-800">{row.name}</td>
              {allKeys.map(k => (
                <td key={k} className="text-right py-1.5 px-2 text-gray-600">
                  {typeof row[k] === 'number' && k !== 'count'
                    ? formatCurrency(row[k])
                    : row[k]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
