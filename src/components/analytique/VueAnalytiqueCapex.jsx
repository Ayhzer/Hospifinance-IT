import { useMemo, useState, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell,
  ComposedChart, Line,
} from 'recharts';
import {
  ChevronDown, ChevronRight, Folder, Layers,
  TrendingUp, BarChart2, PieChart as PieIcon, GitBranch,
} from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';
import { calculateChargeEngagee } from '../../utils/calculations';
import { reclasserToutes } from '../../utils/reclassementEngine';

const fmt  = formatCurrency;
const fmtK = (v) => v >= 1000000 ? `${(v / 1000000).toFixed(2)} M€` : v >= 1000 ? `${Math.round(v / 1000)} k€` : `${Math.round(v)} €`;
const pct  = (n, total) => total > 0 ? `${((n / total) * 100).toFixed(1)} %` : '—';
const pctN = (n, total) => total > 0 ? (n / total) * 100 : 0;

const PALETTE = [
  '#10b981','#06b6d4','#6366f1','#8b5cf6','#f59e0b',
  '#ef4444','#ec4899','#84cc16','#f97316','#3b82f6',
];
const MONTHS_SHORT = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];

const STATUS_STYLE = {
  Payée:     'text-green-700 bg-green-50',
  Facturée:  'text-blue-700 bg-blue-50',
  Commandée: 'text-amber-700 bg-amber-50',
  Livrée:    'text-indigo-700 bg-indigo-50',
  Annulée:   'text-gray-400 bg-gray-50 line-through',
  Soldée:    'text-green-700 bg-green-50',
};

// ── Niveau 4 : commandes ──────────────────────────────────────────────────────

const CommandesList = ({ orders }) => {
  if (!orders.length) {
    return <div className="px-8 py-3 text-xs text-gray-400 italic">Aucune commande trouvée pour ce projet.</div>;
  }
  const sorted = [...orders].sort((a, b) => (b.dateCommande || '').localeCompare(a.dateCommande || ''));
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="bg-gray-100 text-gray-500">
            <th className="text-left px-4 py-1.5 border-b">Référence</th>
            <th className="text-left px-3 py-1.5 border-b">Désignation</th>
            <th className="text-left px-3 py-1.5 border-b">Date cmd</th>
            <th className="text-left px-3 py-1.5 border-b">Date réception</th>
            <th className="text-center px-3 py-1.5 border-b">Statut</th>
            <th className="text-right px-3 py-1.5 border-b">Montant</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((o, idx) => (
            <tr key={o.id || idx} className="border-b border-gray-100 hover:bg-gray-50">
              <td className="px-4 py-1.5 font-mono text-gray-500">{o.reference || '—'}</td>
              <td className="px-3 py-1.5 text-gray-700 max-w-[220px] truncate" title={o.description}>{o.description || '—'}</td>
              <td className="px-3 py-1.5 text-gray-500">{o.dateCommande || '—'}</td>
              <td className="px-3 py-1.5 text-gray-500">{o.dateReception || '—'}</td>
              <td className="px-3 py-1.5 text-center">
                <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${STATUS_STYLE[o.status] || 'text-gray-500 bg-gray-50'}`}>
                  {o.status || '—'}
                </span>
              </td>
              <td className="px-3 py-1.5 text-right font-semibold text-gray-700">{fmt(Math.abs(o.montant || 0))}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-gray-50 font-semibold border-t">
            <td colSpan={5} className="px-4 py-1.5 text-xs text-gray-600">Total ({sorted.length} commande{sorted.length > 1 ? 's' : ''})</td>
            <td className="px-3 py-1.5 text-right text-xs text-emerald-700">
              {fmt(sorted.reduce((s, o) => s + Math.abs(o.montant || 0), 0))}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
};

// ── Niveau 3 : projets ────────────────────────────────────────────────────────

const ProjetDrill = ({ projets, sfTotal, ordersByProjId }) => {
  const [openProj, setOpenProj] = useState(null);
  return (
    <div className="divide-y divide-gray-100">
      {projets.map(p => {
        const isOpen = openProj === p.projId;
        const orders = ordersByProjId[p.projId] || [];
        return (
          <div key={p.projId}>
            <button
              onClick={() => setOpenProj(isOpen ? null : p.projId)}
              className="w-full flex items-center gap-2 px-4 py-2 text-xs hover:bg-emerald-50 transition-colors text-left"
            >
              {isOpen
                ? <ChevronDown  size={11} className="text-emerald-400 flex-shrink-0 ml-12" />
                : <ChevronRight size={11} className="text-gray-300 flex-shrink-0 ml-12" />}
              <Folder size={11} className="text-emerald-400 flex-shrink-0" />
              <span className="flex-1 text-gray-700 truncate font-medium" title={p.nom}>{p.nom}</span>
              <span className="text-gray-400 w-16 text-right">{pct(p.chargeEngagee, sfTotal)}</span>
              <span className="font-semibold text-emerald-600 w-28 text-right">{fmt(p.chargeEngagee)}</span>
            </button>
            {isOpen && (
              <div className="bg-emerald-50/30 border-t border-emerald-100">
                <CommandesList orders={orders} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

// ── Niveau 2 : sous-familles ──────────────────────────────────────────────────

const SousFamilleDrill = ({ sousFamilles, familleTotal, ordersByProjId }) => {
  const [openSF, setOpenSF] = useState(null);
  return (
    <div className="divide-y divide-gray-100">
      {sousFamilles.map(sf => {
        const isOpen = openSF === sf.sousFamille;
        return (
          <div key={sf.sousFamille}>
            <button
              onClick={() => setOpenSF(isOpen ? null : sf.sousFamille)}
              className="w-full flex items-center gap-2 px-4 py-2 text-xs hover:bg-teal-50 transition-colors text-left"
            >
              {isOpen
                ? <ChevronDown  size={12} className="text-teal-500 flex-shrink-0 ml-4" />
                : <ChevronRight size={12} className="text-gray-300 flex-shrink-0 ml-4" />}
              <Layers size={11} className="text-teal-400 flex-shrink-0" />
              <span className="flex-1 font-medium text-gray-700 truncate" title={sf.sousFamille}>{sf.sousFamille}</span>
              <span className="text-gray-400 w-20 text-right mr-2">{sf.projets.length} projet{sf.projets.length > 1 ? 's' : ''}</span>
              <span className="text-gray-400 w-16 text-right">{pct(sf.chargeEngagee, familleTotal)}</span>
              <span className="font-semibold text-teal-600 w-28 text-right">{fmt(sf.chargeEngagee)}</span>
            </button>
            {isOpen && (
              <div className="bg-teal-50/40 border-t border-teal-100">
                <ProjetDrill
                  projets={sf.projets}
                  sfTotal={sf.chargeEngagee}
                  ordersByProjId={ordersByProjId}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

// ── Niveau 1 : familles ───────────────────────────────────────────────────────

const DrillTableCapex = ({ byFamille, totalCharge, ordersByProjId }) => {
  const [openFamille, setOpenFamille] = useState(null);
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 shadow-sm">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-emerald-700 text-white text-xs">
            <th className="w-8 py-2.5" />
            <th className="text-left px-3 py-2.5">Famille analytique</th>
            <th className="text-right px-3 py-2.5">Charge engagée</th>
            <th className="text-right px-3 py-2.5">% total</th>
            <th className="text-right px-3 py-2.5">Sous-familles</th>
            <th className="text-right px-3 py-2.5">Projets</th>
          </tr>
        </thead>
        <tbody>
          {byFamille.map((f, i) => {
            const isOpen = openFamille === f.famille;
            const nbProjets = f.sousFamilles.reduce((s, sf) => s + sf.projets.length, 0);
            return [
              <tr
                key={f.famille}
                className={`border-b cursor-pointer select-none transition-colors ${
                  isOpen ? 'bg-emerald-50' : i % 2 === 0 ? 'bg-white hover:bg-emerald-50' : 'bg-gray-50/60 hover:bg-emerald-50'
                }`}
                onClick={() => setOpenFamille(isOpen ? null : f.famille)}
              >
                <td className="py-2.5 text-center">
                  {isOpen
                    ? <ChevronDown  size={14} className="text-emerald-500 mx-auto" />
                    : <ChevronRight size={14} className="text-gray-400 mx-auto" />}
                </td>
                <td className="px-3 py-2.5 font-medium text-gray-800">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: PALETTE[i % PALETTE.length] }} />
                    {f.famille}
                  </div>
                </td>
                <td className="px-3 py-2.5 text-right font-semibold text-emerald-700">{fmt(f.chargeEngagee)}</td>
                <td className="px-3 py-2.5 text-right text-gray-600">{pct(f.chargeEngagee, totalCharge)}</td>
                <td className="px-3 py-2.5 text-right text-gray-500">{f.sousFamilles.length}</td>
                <td className="px-3 py-2.5 text-right text-gray-500">{nbProjets}</td>
              </tr>,
              isOpen && (
                <tr key={`${f.famille}_drill`}>
                  <td colSpan={6} className="p-0 border-b">
                    <div className="bg-emerald-50/60 border-t border-emerald-100">
                      <SousFamilleDrill
                        sousFamilles={f.sousFamilles}
                        familleTotal={f.chargeEngagee}
                        ordersByProjId={ordersByProjId}
                      />
                    </div>
                  </td>
                </tr>
              ),
            ];
          })}
          <tr className="bg-emerald-100 font-bold border-t-2 border-emerald-300">
            <td />
            <td className="px-3 py-2.5 text-emerald-800">TOTAL</td>
            <td className="px-3 py-2.5 text-right text-emerald-900">{fmt(totalCharge)}</td>
            <td className="px-3 py-2.5 text-right">100 %</td>
            <td className="px-3 py-2.5 text-right text-emerald-700">{byFamille.reduce((s, f) => s + f.sousFamilles.length, 0)}</td>
            <td className="px-3 py-2.5 text-right text-emerald-700">
              {byFamille.reduce((s, f) => s + f.sousFamilles.reduce((sf, n) => sf + n.projets.length, 0), 0)}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

// ── Graphiques ────────────────────────────────────────────────────────────────

const CustomPieLabel = ({ cx, cy, midAngle, outerRadius, percent, name }) => {
  if (percent < 0.04) return null;
  const rad = Math.PI / 180;
  const r = outerRadius + 22;
  const x = cx + r * Math.cos(-midAngle * rad);
  const y = cy + r * Math.sin(-midAngle * rad);
  const short = name.length > 16 ? name.slice(0, 14) + '…' : name;
  return (
    <text x={x} y={y} fill="#374151" textAnchor={x > cx ? 'start' : 'end'} fontSize={10} dominantBaseline="central">
      {short} {(percent * 100).toFixed(0)}%
    </text>
  );
};

const ChartsFamillesCapex = ({ byFamille, onFamilleClick, selectedFamille }) => {
  const pieData = byFamille.map((f, i) => ({ name: f.famille, value: Math.round(f.chargeEngagee), color: PALETTE[i % PALETTE.length] }));

  const selectedData  = selectedFamille ? byFamille.find(f => f.famille === selectedFamille) : null;
  const selectedColor = selectedData ? PALETTE[byFamille.findIndex(f => f.famille === selectedFamille) % PALETTE.length] : '#10b981';

  const sfBarData = selectedData
    ? [...selectedData.sousFamilles]
        .sort((a, b) => b.chargeEngagee - a.chargeEngagee)
        .map(sf => {
          const fullLabel = `${selectedFamille} › ${sf.sousFamille}`;
          const name = fullLabel.length > 36 ? fullLabel.slice(0, 34) + '…' : fullLabel;
          return { name, full: fullLabel, sfName: sf.sousFamille, Charge: Math.round(sf.chargeEngagee) };
        })
    : [];

  const barSortedDesc = [...byFamille]
    .sort((a, b) => b.chargeEngagee - a.chargeEngagee)
    .map(f => ({
      name: f.famille.length > 20 ? f.famille.slice(0, 18) + '…' : f.famille,
      full: f.famille,
      Charge: Math.round(f.chargeEngagee),
      colorIdx: byFamille.findIndex(x => x.famille === f.famille),
    }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-700 mb-0.5">Répartition par famille</h3>
        <p className="text-xs text-gray-400 mb-3">Cliquer sur un secteur → sous-familles</p>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={pieData}
              cx="50%" cy="50%"
              innerRadius={70} outerRadius={110}
              paddingAngle={2}
              dataKey="value"
              labelLine={false}
              label={CustomPieLabel}
              onClick={(d) => onFamilleClick && onFamilleClick(d.name)}
              style={{ cursor: 'pointer' }}
            >
              {pieData.map((entry, i) => (
                <Cell
                  key={i}
                  fill={entry.color}
                  opacity={selectedFamille && selectedFamille !== entry.name ? 0.35 : 1}
                  stroke={selectedFamille === entry.name ? '#1d4ed8' : 'none'}
                  strokeWidth={selectedFamille === entry.name ? 2 : 0}
                />
              ))}
            </Pie>
            <Tooltip formatter={(v) => fmt(v)} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
        {selectedData ? (
          <>
            <h3 className="text-sm font-semibold text-gray-700 mb-0.5">
              Sous-familles — <span style={{ color: selectedColor }}>{selectedFamille}</span>
            </h3>
            <p className="text-xs text-gray-400 mb-3">Ordre décroissant — cliquer sur le camembert pour changer de famille</p>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={sfBarData} layout="vertical" margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tickFormatter={fmtK} tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 9 }} width={140} />
                <Tooltip
                  labelFormatter={(_, p) => p?.[0]?.payload?.full || ''}
                  formatter={(v) => [fmt(v), 'Charge engagée']}
                />
                <Bar dataKey="Charge" fill={selectedColor} radius={[0, 3, 3, 0]} name="Charge engagée" />
              </BarChart>
            </ResponsiveContainer>
          </>
        ) : (
          <>
            <h3 className="text-sm font-semibold text-gray-700 mb-0.5">Familles comparées</h3>
            <p className="text-xs text-gray-400 mb-3">Ordre décroissant — cliquer pour voir les sous-familles</p>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={barSortedDesc} layout="vertical" margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tickFormatter={fmtK} tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 9 }} width={140} />
                <Tooltip
                  labelFormatter={(_, p) => p?.[0]?.payload?.full || ''}
                  formatter={(v) => [fmt(v), 'Charge engagée']}
                />
                <Bar dataKey="Charge" radius={[0, 3, 3, 0]} name="Charge engagée" onClick={(d) => onFamilleClick && onFamilleClick(d.full)}>
                  {barSortedDesc.map((d, i) => <Cell key={i} fill={PALETTE[d.colorIdx % PALETTE.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </>
        )}
      </div>
    </div>
  );
};

const ChartTop10Capex = ({ allProjets }) => {
  const top10 = [...allProjets]
    .sort((a, b) => b.chargeEngagee - a.chargeEngagee)
    .slice(0, 10)
    .map(p => ({
      name: p.nom.length > 18 ? p.nom.slice(0, 16) + '…' : p.nom,
      full: p.nom,
      famille: p.famille,
      Charge: Math.round(p.chargeEngagee),
    }));

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-gray-700 mb-0.5">Top 10 projets</h3>
      <p className="text-xs text-gray-400 mb-3">Par charge engagée décroissante</p>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={top10} layout="vertical" margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
          <XAxis type="number" tickFormatter={fmtK} tick={{ fontSize: 10 }} />
          <YAxis type="category" dataKey="name" tick={{ fontSize: 9 }} width={150} />
          <Tooltip
            labelFormatter={(_, p) => p?.[0]?.payload?.full || ''}
            formatter={(v, _, p) => [fmt(v), p?.payload?.famille || 'Charge']}
          />
          <Bar dataKey="Charge" fill="#10b981" radius={[0, 3, 3, 0]} name="Charge engagée">
            {top10.map((d, i) => (
              <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

const ChartParetoCapex = ({ allProjets, totalCharge }) => {
  const sorted = [...allProjets].sort((a, b) => b.chargeEngagee - a.chargeEngagee);
  let cumul = 0;
  const data = sorted.slice(0, Math.min(20, sorted.length)).map(p => {
    cumul += p.chargeEngagee;
    const shortName = p.nom.length > 14 ? p.nom.slice(0, 12) + '…' : p.nom;
    return { name: shortName, full: p.nom, Charge: Math.round(p.chargeEngagee), Cumulé: Math.round(pctN(cumul, totalCharge) * 10) / 10 };
  });
  const threshold80 = data.findIndex(d => d.Cumulé >= 80);

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-gray-700 mb-0.5">Pareto — Concentration des dépenses</h3>
      <p className="text-xs text-gray-400 mb-3">
        Top {data.length} projets
        {threshold80 >= 0 && (
          <span className="ml-2 font-semibold text-emerald-600">
            → {threshold80 + 1} projet{threshold80 > 0 ? 's' : ''} représentent 80 % de la charge totale
          </span>
        )}
      </p>
      <ResponsiveContainer width="100%" height={340}>
        <ComposedChart data={data} margin={{ top: 4, right: 40, left: 0, bottom: 90 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 9, angle: -55, textAnchor: 'end' }}
            interval={0}
            height={90}
          />
          <YAxis yAxisId="left" tickFormatter={fmtK} tick={{ fontSize: 10 }} />
          <YAxis yAxisId="right" orientation="right" tickFormatter={v => `${v}%`} tick={{ fontSize: 10 }} domain={[0, 100]} />
          <Tooltip
            labelFormatter={(_, p) => p?.[0]?.payload?.full || ''}
            formatter={(v, name) => name === 'Cumulé %' ? [`${v} %`, name] : [fmt(v), name]}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Bar yAxisId="left" dataKey="Charge" fill="#10b981" opacity={0.85} radius={[2, 2, 0, 0]} name="Charge" />
          <Line yAxisId="right" type="monotone" dataKey="Cumulé" stroke="#ef4444" strokeWidth={2.5} dot={{ r: 2 }} name="Cumulé %" />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

const ChartMensuelCapex = ({ orders, projReclasseById, byFamille }) => {
  const currentYear = String(new Date().getFullYear());
  const monthlyByFamille = useMemo(() => {
    const map = {};
    orders.forEach(o => {
      const dr = String(o.dateReception || '');
      if (!dr.startsWith(currentYear)) return;
      const m = parseInt(dr.slice(5, 7), 10) - 1;
      if (m < 0 || m > 11) return;
      const proj = projReclasseById[String(o.parentId)];
      const famille = proj?.familleAnalytique || 'Non classé';
      if (!map[famille]) map[famille] = {};
      map[famille][m] = (map[famille][m] || 0) + Math.abs(o.montant || 0);
    });
    return map;
  }, [orders, projReclasseById, currentYear]);

  const hasData = Object.keys(monthlyByFamille).length > 0;

  if (!hasData) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm flex items-center justify-center h-48">
        <p className="text-sm text-gray-400 italic text-center">Données mensuelles non disponibles.<br />Les commandes doivent avoir une dateReception renseignée.</p>
      </div>
    );
  }

  const familles = byFamille.map(f => f.famille).filter(f => monthlyByFamille[f]);
  const barData = MONTHS_SHORT.map((name, i) => {
    const row = { name };
    familles.forEach(f => { row[f] = Math.round(monthlyByFamille[f]?.[i] || 0); });
    return row;
  });

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-gray-700 mb-0.5">Évolution mensuelle par famille</h3>
      <p className="text-xs text-gray-400 mb-3">Charges engagées par mois de réception — {currentYear}</p>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={barData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" tick={{ fontSize: 10 }} />
          <YAxis tickFormatter={fmtK} tick={{ fontSize: 10 }} />
          <Tooltip formatter={(v) => fmt(v)} />
          <Legend wrapperStyle={{ fontSize: 10 }} />
          {familles.map((f, i) => (
            <Bar key={f} dataKey={f} stackId="a" fill={PALETTE[i % PALETTE.length]} name={f} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

// ── Onglets graphiques ────────────────────────────────────────────────────────

const GRAPH_TABS = [
  { id: 'familles', label: 'Familles',         icon: PieIcon    },
  { id: 'top10',    label: 'Top 10 projets',   icon: BarChart2  },
  { id: 'pareto',   label: 'Pareto 80/20',     icon: TrendingUp },
  { id: 'mensuel',  label: 'Mensuel / Famille',icon: GitBranch  },
];

// ── Composant principal ───────────────────────────────────────────────────────

export default function VueAnalytiqueCapex({
  projects   = [],
  capexOrders = [],
  moteur     = {},
}) {
  const [selectedFamille, setSelectedFamille] = useState(null);
  const [graphTab, setGraphTab] = useState('familles');

  const handleFamilleClick = useCallback((famille) => {
    setSelectedFamille(prev => prev === famille ? null : famille);
    if (famille) setGraphTab('familles');
  }, []);

  // Index commandes CAPEX par parentId
  const ordersByProjId = useMemo(() => {
    const map = {};
    capexOrders.forEach(o => {
      if (o.parentId == null) return;
      const key = String(o.parentId);
      if (!map[key]) map[key] = [];
      map[key].push(o);
    });
    return map;
  }, [capexOrders]);

  // Reclassement CAPEX via le moteur
  const projetsReclasses = useMemo(() => {
    const lignes = projects.map(p => {
      const projOrds = ordersByProjId[String(p.id)] || [];
      const charge   = projOrds.reduce((s, o) => s + Math.abs(o.montant || 0), 0)
                    || calculateChargeEngagee(p.depense || p.depenseActuelle || 0, p.engagement || 0);
      return {
        ...p,
        supplier: p.fournisseur || p.project || '—',
        chargeEngagee: charge,
      };
    });
    return reclasserToutes(lignes, moteur);
  }, [projects, moteur, ordersByProjId]);

  // Index par id pour le graphe mensuel
  const projReclasseById = useMemo(() => {
    const map = {};
    projetsReclasses.forEach(p => { if (p.id != null) map[String(p.id)] = p; });
    return map;
  }, [projetsReclasses]);

  // Construction byFamille (CAPEX uniquement)
  const { byFamille, totalCharge, allProjets } = useMemo(() => {
    const familleMap = new Map();

    projetsReclasses.forEach(proj => {
      const famille  = proj.familleAnalytique || 'Non classé';
      const sousFam  = proj.sousCategorie || proj.enveloppe || '—';
      const nomProj  = proj.project || proj.supplier || '—';
      const charge   = proj.chargeEngagee || 0;
      const projId   = String(proj.id);

      if (!familleMap.has(famille)) familleMap.set(famille, { famille, chargeEngagee: 0, sfMap: new Map() });
      const fGrp = familleMap.get(famille);
      fGrp.chargeEngagee += charge;

      if (!fGrp.sfMap.has(sousFam)) fGrp.sfMap.set(sousFam, { sousFamille: sousFam, chargeEngagee: 0, projMap: new Map() });
      const sfGrp = fGrp.sfMap.get(sousFam);
      sfGrp.chargeEngagee += charge;

      if (!sfGrp.projMap.has(projId)) {
        sfGrp.projMap.set(projId, { nom: nomProj, chargeEngagee: 0, projId, famille });
      }
      sfGrp.projMap.get(projId).chargeEngagee += charge;
    });

    const allProj = [];
    const result = [...familleMap.values()]
      .map(f => {
        const sousFamilles = [...f.sfMap.values()]
          .map(sf => ({
            ...sf,
            projets: [...sf.projMap.values()].sort((a, b) => b.chargeEngagee - a.chargeEngagee),
          }))
          .sort((a, b) => b.chargeEngagee - a.chargeEngagee);
        sousFamilles.forEach(sf => sf.projets.forEach(p => allProj.push(p)));
        return { famille: f.famille, chargeEngagee: f.chargeEngagee, sousFamilles };
      })
      .sort((a, b) => b.chargeEngagee - a.chargeEngagee);

    return { byFamille: result, totalCharge: result.reduce((s, f) => s + f.chargeEngagee, 0), allProjets: allProj };
  }, [projetsReclasses]);

  const moteurActif = Object.values(moteur).some(v => Array.isArray(v) && v.length > 0);

  if (projects.length === 0) {
    return (
      <div className="p-8 text-center text-gray-400 text-sm">
        Aucune donnée CAPEX — importez d&apos;abord un fichier de commandes ou ajoutez des projets.
      </div>
    );
  }

  return (
    <div className="space-y-5 p-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-xl font-bold text-gray-800">Vue analytique CAPEX — DSI</h2>
        {!moteurActif && (
          <span className="text-xs bg-amber-50 border border-amber-300 text-amber-700 px-3 py-1 rounded-full">
            Moteur vide — configurez le Reclassement pour activer les sous-familles CAPEX
          </span>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Charge engagée totale', val: fmt(totalCharge),   c: 'emerald' },
          { label: 'Familles',              val: String(byFamille.length), c: 'teal' },
          { label: 'Sous-familles',         val: String(byFamille.reduce((s, f) => s + f.sousFamilles.length, 0)), c: 'cyan' },
          { label: 'Projets',               val: String(allProjets.length), c: 'green' },
        ].map(k => (
          <div key={k.label} className={`bg-${k.c}-50 border border-${k.c}-200 rounded-xl p-3`}>
            <div className={`text-xs text-${k.c}-600 font-medium`}>{k.label}</div>
            <div className={`text-lg font-bold text-${k.c}-800`}>{k.val}</div>
          </div>
        ))}
      </div>

      {/* Onglets graphiques */}
      <div>
        <div className="flex gap-1 border-b border-gray-200 mb-4">
          {GRAPH_TABS.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setGraphTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium border-b-2 transition-colors ${
                  graphTab === tab.id
                    ? 'border-emerald-600 text-emerald-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon size={13} />
                {tab.label}
              </button>
            );
          })}
          {capexOrders.length > 0 && (
            <span className="ml-auto self-center text-xs text-gray-400">{capexOrders.length} commandes</span>
          )}
        </div>

        {graphTab === 'familles' && (
          <ChartsFamillesCapex byFamille={byFamille} onFamilleClick={handleFamilleClick} selectedFamille={selectedFamille} />
        )}
        {graphTab === 'top10'   && <ChartTop10Capex allProjets={allProjets} />}
        {graphTab === 'pareto'  && <ChartParetoCapex allProjets={allProjets} totalCharge={totalCharge} />}
        {graphTab === 'mensuel' && (
          <ChartMensuelCapex orders={capexOrders} projReclasseById={projReclasseById} byFamille={byFamille} />
        )}
      </div>

      {/* Drill-down */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <h3 className="text-sm font-semibold text-gray-700">Détail hiérarchique</h3>
          <span className="text-xs text-gray-400 italic">Famille → Sous-famille → Projet → Commandes</span>
        </div>
        <DrillTableCapex
          byFamille={byFamille}
          totalCharge={totalCharge}
          ordersByProjId={ordersByProjId}
        />
      </div>
    </div>
  );
}
