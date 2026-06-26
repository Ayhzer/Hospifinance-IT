import { useMemo, useState, useCallback, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell,
  ComposedChart, Line,
} from 'recharts';
import {
  ChevronDown, ChevronRight, Building2,
  ArrowLeft, TrendingUp, BarChart2, PieChart as PieIcon, GitBranch,
} from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';
import { calculateChargeEngagee } from '../../utils/calculations';
import { reclasserToutes } from '../../utils/reclassementEngine';
import { listExercices, suppliersForYear, projectsForYear, ordersForYear } from '../../utils/yearCalculations';

const fmt  = formatCurrency;
const fmtK = (v) => v >= 1000000 ? `${(v / 1000000).toFixed(2)} M€` : v >= 1000 ? `${Math.round(v / 1000)} k€` : `${Math.round(v)} €`;
const pct  = (n, total) => total > 0 ? `${((n / total) * 100).toFixed(1)} %` : '—';
const pctN = (n, total) => total > 0 ? (n / total) * 100 : 0;

const PALETTE = [
  '#6366f1','#8b5cf6','#06b6d4','#10b981','#f59e0b',
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
    return <div className="px-8 py-3 text-xs text-gray-400 italic">Aucune commande trouvée pour ce fournisseur.</div>;
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
            <td className="px-3 py-1.5 text-right text-xs text-indigo-700">
              {fmt(sorted.reduce((s, o) => s + Math.abs(o.montant || 0), 0))}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
};

// ── Niveau 3 : fournisseurs ───────────────────────────────────────────────────

const FournisseurDrill = ({ fournisseurs, sfTotal, ordersBySupplierId, capexOrdersByProjId }) => {
  const [openFourn, setOpenFourn] = useState(null);
  return (
    <div className="divide-y divide-gray-100">
      {fournisseurs.map(f => {
        const isOpen = openFourn === f.supplierId;
        const opexOrds  = ordersBySupplierId[f.supplierId]  || [];
        const capexOrds = capexOrdersByProjId[f.supplierId] || [];
        const allOrders = f.type === 'CAPEX' ? capexOrds : opexOrds;
        return (
          <div key={f.supplierId}>
            <button
              onClick={() => setOpenFourn(isOpen ? null : f.supplierId)}
              className="w-full flex items-center gap-2 px-4 py-2 text-xs hover:bg-purple-50 transition-colors text-left"
            >
              {isOpen
                ? <ChevronDown  size={11} className="text-purple-400 flex-shrink-0 ml-4" />
                : <ChevronRight size={11} className="text-gray-300 flex-shrink-0 ml-4" />}
              <Building2 size={11} className="text-purple-400 flex-shrink-0" />
              <span className="flex-1 text-gray-700 truncate font-medium" title={f.nom}>{f.nom}</span>
              {/* Badges OPEX / CAPEX */}
              {opexOrds.length > 0 && (
                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-100 text-blue-700 mr-1">
                  OPEX {opexOrds.length}
                </span>
              )}
              {capexOrds.length > 0 && (
                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 text-emerald-700 mr-1">
                  CAPEX {capexOrds.length}
                </span>
              )}
              <span className="text-gray-400 w-16 text-right">{pct(f.chargeEngagee, sfTotal)}</span>
              <span className="font-semibold text-purple-600 w-28 text-right">{fmt(f.chargeEngagee)}</span>
            </button>
            {isOpen && (
              <div className="bg-purple-50/30 border-t border-purple-100">
                <CommandesList orders={allOrders} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

// ── Niveau 2 : sous-familles ──────────────────────────────────────────────────

// ── Niveau 1 : familles ───────────────────────────────────────────────────────

const DrillTable = ({ byFamille, totalCharge, ordersBySupplierId, capexOrdersByProjId, autoOpenFamille }) => {
  const [openFamille, setOpenFamille] = useState(null);
  // Ouvre automatiquement la famille filtrée depuis le graphe
  useEffect(() => {
    if (autoOpenFamille) setOpenFamille(autoOpenFamille);
  }, [autoOpenFamille]);
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 shadow-sm">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-indigo-700 text-white text-xs">
            <th className="w-8 py-2.5" />
            <th className="text-left px-3 py-2.5">Famille analytique</th>
            <th className="text-right px-3 py-2.5">Charge engagée</th>
            <th className="text-right px-3 py-2.5">% total</th>
            <th className="text-right px-3 py-2.5">Fournisseurs</th>
          </tr>
        </thead>
        <tbody>
          {byFamille.map((f, i) => {
            const isOpen = openFamille === f.famille;
            const allFourn = f.sousFamilles.flatMap(sf => sf.fournisseurs);
            return [
              <tr
                key={f.famille}
                className={`border-b cursor-pointer select-none transition-colors ${
                  isOpen ? 'bg-indigo-50' : i % 2 === 0 ? 'bg-white hover:bg-indigo-50' : 'bg-gray-50/60 hover:bg-indigo-50'
                }`}
                onClick={() => setOpenFamille(isOpen ? null : f.famille)}
              >
                <td className="py-2.5 text-center">
                  {isOpen
                    ? <ChevronDown  size={14} className="text-indigo-500 mx-auto" />
                    : <ChevronRight size={14} className="text-gray-400 mx-auto" />}
                </td>
                <td className="px-3 py-2.5 font-medium text-gray-800">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: PALETTE[i % PALETTE.length] }} />
                    {f.famille}
                  </div>
                </td>
                <td className="px-3 py-2.5 text-right font-semibold text-indigo-700">{fmt(f.chargeEngagee)}</td>
                <td className="px-3 py-2.5 text-right text-gray-600">{pct(f.chargeEngagee, totalCharge)}</td>
                <td className="px-3 py-2.5 text-right text-gray-500">{allFourn.length}</td>
              </tr>,
              isOpen && (
                <tr key={`${f.famille}_drill`}>
                  <td colSpan={5} className="p-0 border-b">
                    <div className="bg-indigo-50/60 border-t border-indigo-100">
                      <FournisseurDrill
                        fournisseurs={allFourn}
                        sfTotal={f.chargeEngagee}
                        ordersBySupplierId={ordersBySupplierId}
                        capexOrdersByProjId={capexOrdersByProjId}
                      />
                    </div>
                  </td>
                </tr>
              ),
            ];
          })}
          <tr className="bg-indigo-100 font-bold border-t-2 border-indigo-300">
            <td />
            <td className="px-3 py-2.5 text-indigo-800">TOTAL</td>
            <td className="px-3 py-2.5 text-right text-indigo-900">{fmt(totalCharge)}</td>
            <td className="px-3 py-2.5 text-right">100 %</td>
            <td className="px-3 py-2.5 text-right text-indigo-700">
              {byFamille.reduce((s, f) => s + f.sousFamilles.reduce((sf, n) => sf + n.fournisseurs.length, 0), 0)}
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

// Familles : camembert + barres familles (décroissant) ou sous-familles après clic
const ChartsFamilles = ({ byFamille, onFamilleClick, selectedFamille, onSousFamilleClick, selectedSousFamille }) => {
  const pieData = byFamille.map((f, i) => ({ name: f.famille, value: Math.round(f.chargeEngagee), color: PALETTE[i % PALETTE.length] }));

  const selectedData  = selectedFamille ? byFamille.find(f => f.famille === selectedFamille) : null;
  const selectedColor = selectedData ? PALETTE[byFamille.findIndex(f => f.famille === selectedFamille) % PALETTE.length] : '#6366f1';

  // Sous-familles de la famille sélectionnée — ordre décroissant (plus grand en haut du graphe horizontal)
  const sfBarData = selectedData
    ? [...selectedData.sousFamilles]
        .sort((a, b) => b.chargeEngagee - a.chargeEngagee)
        .map(sf => {
          const sfLabel = sf.sousFamille || 'Non classé';
          const name = sfLabel.length > 36 ? sfLabel.slice(0, 34) + '…' : sfLabel;
          return { name, full: `${selectedFamille} › ${sfLabel}`, sfName: sfLabel, Charge: Math.round(sf.chargeEngagee) };
        })
    : [];

  // Familles comparées — ordre décroissant (plus grand en haut)
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
      {/* Camembert */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-700 mb-0.5">Répartition par famille</h3>
        <p className="text-xs text-gray-400 mb-3">Cliquer sur un secteur → sous-familles</p>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={pieData}
              dataKey="value" nameKey="name"
              cx="50%" cy="50%"
              outerRadius={100} innerRadius={32}
              paddingAngle={2}
              label={CustomPieLabel}
              labelLine
              onClick={(_, idx) => onFamilleClick(pieData[idx]?.name)}
              cursor="pointer"
            >
              {pieData.map(entry => (
                <Cell
                  key={entry.name}
                  fill={entry.color}
                  opacity={selectedFamille && selectedFamille !== entry.name ? 0.3 : 1}
                  stroke={selectedFamille === entry.name ? '#1e1b4b' : 'transparent'}
                  strokeWidth={selectedFamille === entry.name ? 2.5 : 0}
                />
              ))}
            </Pie>
            <Tooltip formatter={(v) => [fmt(v), 'Charge engagée']} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Barres sous-familles ou familles */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
        {selectedFamille ? (
          <>
            <div className="flex items-center gap-2 mb-0.5">
              <button onClick={() => onFamilleClick(null)} className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800">
                <ArrowLeft size={12} /> Retour
              </button>
              <span className="text-gray-300">•</span>
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: selectedColor }} />
              <h3 className="text-sm font-semibold text-gray-700 truncate">{selectedFamille}</h3>
            </div>
            <p className="text-xs text-gray-400 mb-3">
              Sous-familles par charge (décroissant)
              <span className="ml-1 text-indigo-400">— cliquer pour filtrer le détail ci-dessous</span>
            </p>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                data={sfBarData}
                layout="vertical"
                margin={{ left: 4, right: 60, top: 4, bottom: 4 }}
                onClick={d => d?.activePayload?.[0]?.payload?.sfName && onSousFamilleClick(d.activePayload[0].payload.sfName)}
                cursor="pointer"
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tickFormatter={fmtK} tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="name" width={200} tick={{ fontSize: 9 }} />
                <Tooltip labelFormatter={(_, p) => p?.[0]?.payload?.sfName || p?.[0]?.payload?.full || ''} formatter={(v) => [fmt(v), 'Charge']} />
                <Bar dataKey="Charge" radius={[0, 3, 3, 0]} name="Charge engagée">
                  {sfBarData.map((d, i) => (
                    <Cell
                      key={i}
                      fill={selectedColor}
                      opacity={selectedSousFamille && selectedSousFamille !== d.sfName ? 0.35 : 1}
                      stroke={selectedSousFamille === d.sfName ? '#1e1b4b' : 'transparent'}
                      strokeWidth={selectedSousFamille === d.sfName ? 2 : 0}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </>
        ) : (
          <>
            <h3 className="text-sm font-semibold text-gray-700 mb-0.5">Familles comparées</h3>
            <p className="text-xs text-gray-400 mb-3">Ordre décroissant — cliquer pour voir les sous-familles</p>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={barSortedDesc}
                layout="vertical"
                margin={{ left: 4, right: 60, top: 4, bottom: 4 }}
                onClick={d => d?.activePayload?.[0]?.payload?.full && onFamilleClick(d.activePayload[0].payload.full)}
                cursor="pointer"
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tickFormatter={fmtK} tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 10 }} />
                <Tooltip labelFormatter={(_, p) => p?.[0]?.payload?.full || ''} formatter={(v) => [fmt(v), 'Charge']} />
                <Bar dataKey="Charge" radius={[0, 3, 3, 0]} name="Charge engagée">
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

// TOP 10 — plus grand en haut (pas de reverse)
const ChartTop10 = ({ allFournisseurs }) => {
  const top10 = [...allFournisseurs]
    .sort((a, b) => b.chargeEngagee - a.chargeEngagee)
    .slice(0, 10)
    .map(f => ({
      name: f.nom.length > 24 ? f.nom.slice(0, 22) + '…' : f.nom,
      full: f.nom,
      famille: f.famille,
      type: f.type || 'OPEX',
      Charge: Math.round(f.chargeEngagee),
    }));

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-gray-700 mb-0.5">Top 10 fournisseurs</h3>
      <p className="text-xs text-gray-400 mb-3">Par charge engagée — du plus élevé au plus faible</p>
      <ResponsiveContainer width="100%" height={360}>
        <BarChart data={top10} layout="vertical" margin={{ left: 4, right: 80, top: 4, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
          <XAxis type="number" tickFormatter={fmtK} tick={{ fontSize: 10 }} />
          <YAxis type="category" dataKey="name" width={180} tick={{ fontSize: 10 }} />
          <Tooltip
            labelFormatter={(_, p) => p?.[0]?.payload?.full || ''}
            formatter={(v, _, p) => [fmt(v), p?.payload?.famille || 'Charge']}
          />
          <Bar dataKey="Charge" fill="#6366f1" radius={[0, 3, 3, 0]} name="Charge engagée">
            {top10.map((d, i) => (
              <Cell key={i} fill={d.type === 'CAPEX' ? '#10b981' : '#6366f1'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

// Pareto — noms fournisseurs en abscisse (vertical)
const ChartPareto = ({ allFournisseurs, totalCharge }) => {
  const sorted = [...allFournisseurs].sort((a, b) => b.chargeEngagee - a.chargeEngagee);
  let cumul = 0;
  const data = sorted.slice(0, Math.min(20, sorted.length)).map(f => {
    cumul += f.chargeEngagee;
    const shortName = f.nom.length > 14 ? f.nom.slice(0, 12) + '…' : f.nom;
    return { name: shortName, full: f.nom, Charge: Math.round(f.chargeEngagee), Cumulé: Math.round(pctN(cumul, totalCharge) * 10) / 10 };
  });
  const threshold80 = data.findIndex(d => d.Cumulé >= 80);

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-gray-700 mb-0.5">Pareto — Concentration des dépenses</h3>
      <p className="text-xs text-gray-400 mb-3">
        Top {data.length} fournisseurs
        {threshold80 >= 0 && (
          <span className="ml-2 font-semibold text-indigo-600">
            → {threshold80 + 1} fournisseur{threshold80 > 0 ? 's' : ''} représentent 80 % de la charge totale
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
          <Bar yAxisId="left" dataKey="Charge" fill="#6366f1" opacity={0.85} radius={[2, 2, 0, 0]} name="Charge" />
          <Line yAxisId="right" type="monotone" dataKey="Cumulé" stroke="#ef4444" strokeWidth={2.5} dot={{ r: 2 }} name="Cumulé %" />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

// Mensuel / Famille — utilise les fournisseurs reclassés pour la famille
const ChartMensuelFamille = ({ orders, supplierByIdReclasse, byFamille }) => {
  const currentYear = String(new Date().getFullYear());
  const monthlyByFamille = useMemo(() => {
    const map = {};
    orders.forEach(o => {
      const dr = String(o.dateReception || '');
      if (!dr.startsWith(currentYear)) return;
      const m = parseInt(dr.slice(5, 7), 10) - 1;
      if (m < 0 || m > 11) return;
      const sup = supplierByIdReclasse[String(o.parentId)];
      const famille = sup?.familleAnalytique || 'Non classé';
      if (!map[famille]) map[famille] = {};
      map[famille][m] = (map[famille][m] || 0) + Math.abs(o.montant || 0);
    });
    return map;
  }, [orders, supplierByIdReclasse, currentYear]);

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
  { id: 'familles', label: 'Familles',            icon: PieIcon    },
  { id: 'top10',    label: 'Top 10 fournisseurs', icon: BarChart2  },
  { id: 'pareto',   label: 'Pareto 80/20',        icon: TrendingUp },
  { id: 'mensuel',  label: 'Mensuel / Famille',   icon: GitBranch  },
];

// ── Composant principal ───────────────────────────────────────────────────────

export default function VueAnalytiqueIT({
  suppliers    = [],
  orders       = [],
  capexOrders  = [],
  projects     = [],
  moteur       = {},
}) {
  const [selectedFamille, setSelectedFamille] = useState(null);
  const [selectedSousFamille, setSelectedSousFamille] = useState(null);
  const [graphTab, setGraphTab] = useState('familles');
  const [typeFilter, setTypeFilter] = useState('both'); // 'both' | 'opex' | 'capex'

  // ── Sélecteur d'exercice ────────────────────────────────────────────────────
  const exercices = useMemo(() => {
    const found = listExercices(orders, capexOrders);
    const current = String(new Date().getFullYear());
    return found.includes(current) ? found : [current, ...found];
  }, [orders, capexOrders]);

  const [annee, setAnnee] = useState(() => String(new Date().getFullYear()));
  useEffect(() => {
    if (exercices.length > 0 && !exercices.includes(annee)) setAnnee(exercices[0]);
  }, [exercices, annee]);

  // Données recalculées pour l'exercice sélectionné
  const suppliersF   = useMemo(() => suppliersForYear(suppliers, orders, annee),   [suppliers, orders, annee]);
  const projectsF    = useMemo(() => projectsForYear(projects, capexOrders, annee), [projects, capexOrders, annee]);
  const ordersF      = useMemo(() => ordersForYear(orders, annee),      [orders, annee]);
  const capexOrdersF = useMemo(() => ordersForYear(capexOrders, annee), [capexOrders, annee]);

  const handleFamilleClick = useCallback((famille) => {
    setSelectedFamille(prev => prev === famille ? null : famille);
    setSelectedSousFamille(null); // changer de famille réinitialise le filtre sous-famille
    if (famille) setGraphTab('familles');
  }, []);

  const handleSousFamilleClick = useCallback((sf) => {
    setSelectedSousFamille(prev => prev === sf ? null : sf);
  }, []);

  // Index OPEX orders par parentId (string normalisé) — exercice sélectionné
  const ordersBySupplierId = useMemo(() => {
    const map = {};
    ordersF.forEach(o => {
      if (o.parentId == null) return;
      const key = String(o.parentId);
      if (!map[key]) map[key] = [];
      map[key].push(o);
    });
    return map;
  }, [ordersF]);

  // Index CAPEX orders par parentId (string normalisé) — exercice sélectionné
  const capexOrdersByProjId = useMemo(() => {
    const map = {};
    capexOrdersF.forEach(o => {
      if (o.parentId == null) return;
      const key = String(o.parentId);
      if (!map[key]) map[key] = [];
      map[key].push(o);
    });
    return map;
  }, [capexOrdersF]);

  // OPEX reclassés — exercice sélectionné
  const lignesReclassees = useMemo(() => {
    const lignes = suppliersF.map(s => ({
      ...s,
      chargeEngagee: calculateChargeEngagee(s.depenseActuelle || 0, s.engagement || 0),
    }));
    return reclasserToutes(lignes, moteur);
  }, [suppliersF, moteur]);

  // Index fournisseurs reclassés par id (pour ChartMensuelFamille)
  const supplierByIdReclasse = useMemo(() => {
    const map = {};
    lignesReclassees.forEach(s => { if (s.id != null) map[String(s.id)] = s; });
    return map;
  }, [lignesReclassees]);

  // CAPEX : projets → reclassement via le même moteur qu'OPEX
  const capexLignes = useMemo(() => {
    const lignes = projectsF.map(p => {
      const projOrds = capexOrdersByProjId[String(p.id)] || [];
      const charge   = projOrds.reduce((s, o) => s + Math.abs(o.montant || 0), 0)
                    || calculateChargeEngagee(p.depenseActuelle || 0, p.engagement || 0);
      const nomFourn = p.fournisseur || p.project || '—';
      return {
        ...p,
        supplier:    nomFourn,
        fournisseur: nomFourn,
        designation: nomFourn,   // permet au niveau 3 (mots-clés) de matcher le nom du projet/fournisseur
        chargeEngagee: charge,
      };
    });
    return reclasserToutes(lignes, moteur).map(l => ({ ...l, type: 'CAPEX' }));
  }, [projectsF, moteur, capexOrdersByProjId]);

  // Construction byFamille (OPEX + CAPEX fusionnés, filtrés par typeFilter)
  const { byFamille, totalCharge, allFournisseurs } = useMemo(() => {
    const toutes = [
      ...(typeFilter !== 'capex' ? lignesReclassees.map(l => ({ ...l, type: 'OPEX' })) : []),
      ...(typeFilter !== 'opex'  ? capexLignes : []),
    ];

    const familleMap = new Map();

    toutes.forEach(ligne => {
      const famille  = ligne.familleAnalytique       || 'Non classé';
      const sousFam  = ligne.sousCategorie || ligne.sousCategorieAnalytique || 'Non classé';
      const nomFourn = ligne.supplier || ligne.fournisseur || '—';
      const charge   = ligne.chargeEngagee || 0;
      const suppId   = String(ligne.id);

      if (!familleMap.has(famille)) familleMap.set(famille, { famille, chargeEngagee: 0, sfMap: new Map() });
      const fGrp = familleMap.get(famille);
      fGrp.chargeEngagee += charge;

      if (!fGrp.sfMap.has(sousFam)) fGrp.sfMap.set(sousFam, { sousFamille: sousFam, chargeEngagee: 0, fournMap: new Map() });
      const sfGrp = fGrp.sfMap.get(sousFam);
      sfGrp.chargeEngagee += charge;

      // Clé = suppId pour éviter la fusion de fournisseurs homonymes
      if (!sfGrp.fournMap.has(suppId)) {
        sfGrp.fournMap.set(suppId, { nom: nomFourn, chargeEngagee: 0, supplierId: suppId, famille, type: ligne.type || 'OPEX' });
      }
      sfGrp.fournMap.get(suppId).chargeEngagee += charge;
    });

    const allFourn = [];
    const result = [...familleMap.values()]
      .map(f => {
        const sousFamilles = [...f.sfMap.values()]
          .map(sf => ({
            ...sf,
            fournisseurs: [...sf.fournMap.values()].sort((a, b) => b.chargeEngagee - a.chargeEngagee),
          }))
          .sort((a, b) => b.chargeEngagee - a.chargeEngagee);
        sousFamilles.forEach(sf => sf.fournisseurs.forEach(fo => allFourn.push(fo)));
        return { famille: f.famille, chargeEngagee: f.chargeEngagee, sousFamilles };
      })
      .sort((a, b) => b.chargeEngagee - a.chargeEngagee);

    return { byFamille: result, totalCharge: result.reduce((s, f) => s + f.chargeEngagee, 0), allFournisseurs: allFourn };
  }, [lignesReclassees, capexLignes, typeFilter]);

  // Détail filtré sur la sous-famille sélectionnée dans le graphe de droite
  const { displayByFamille, displayTotal } = useMemo(() => {
    if (!selectedFamille || !selectedSousFamille) {
      return { displayByFamille: byFamille, displayTotal: totalCharge };
    }
    const fam = byFamille.find(f => f.famille === selectedFamille);
    const sf  = fam?.sousFamilles.find(s => (s.sousFamille || 'Non classé') === selectedSousFamille);
    if (!fam || !sf) return { displayByFamille: byFamille, displayTotal: totalCharge };
    return {
      displayByFamille: [{ ...fam, chargeEngagee: sf.chargeEngagee, sousFamilles: [sf] }],
      displayTotal: sf.chargeEngagee,
    };
  }, [byFamille, totalCharge, selectedFamille, selectedSousFamille]);

  const moteurActif = Object.values(moteur).some(v => Array.isArray(v) && v.length > 0);
  const totalOrders = ordersF.length + capexOrdersF.length;

  if (suppliers.length === 0 && projects.length === 0) {
    return (
      <div className="p-8 text-center text-gray-400 text-sm">
        Aucune donnée — importez d&apos;abord un fichier de commandes ou ajoutez des fournisseurs.
      </div>
    );
  }

  return (
    <div className="space-y-5 p-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-xl font-bold text-gray-800">Vue analytique — DSI {annee}</h2>
        <div className="flex items-center gap-2">
          {/* Sélecteur d'exercice */}
          <div className="flex items-center gap-2 bg-white border border-indigo-300 rounded-lg px-3 py-1.5">
            <span className="text-xs font-semibold text-indigo-700">Exercice</span>
            <select
              value={annee}
              onChange={e => { setAnnee(e.target.value); setSelectedFamille(null); setSelectedSousFamille(null); }}
              className="bg-transparent text-xs font-bold text-indigo-800 focus:outline-none cursor-pointer"
            >
              {exercices.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          {!moteurActif && (
            <span className="text-xs bg-amber-50 border border-amber-300 text-amber-700 px-3 py-1 rounded-full">
              Moteur vide — configurez le Reclassement pour activer les sous-familles
            </span>
          )}
          {/* Filtre OPEX / CAPEX */}
          <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs font-medium">
            {[
              { key: 'both',  label: 'OPEX + CAPEX' },
              { key: 'opex',  label: 'OPEX' },
              { key: 'capex', label: 'CAPEX' },
            ].map(opt => (
              <button
                key={opt.key}
                onClick={() => { setTypeFilter(opt.key); setSelectedFamille(null); setSelectedSousFamille(null); }}
                className={`px-3 py-1.5 transition-colors border-l border-gray-200 first:border-l-0 ${
                  typeFilter === opt.key
                    ? opt.key === 'capex'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-indigo-600 text-white'
                    : 'bg-white text-gray-500 hover:bg-gray-50'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Charge engagée totale', val: fmt(totalCharge),   c: 'indigo' },
          { label: 'Familles',              val: String(byFamille.length), c: 'violet' },
          { label: 'Sous-familles',         val: String(byFamille.reduce((s, f) => s + f.sousFamilles.length, 0)), c: 'blue' },
          { label: 'Fournisseurs',          val: String(allFournisseurs.length), c: 'cyan' },
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
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon size={13} />
                {tab.label}
              </button>
            );
          })}
          {totalOrders > 0 && (
            <span className="ml-auto self-center text-xs text-gray-400">{totalOrders} commandes</span>
          )}
        </div>

        {graphTab === 'familles' && (
          <ChartsFamilles
            byFamille={byFamille}
            onFamilleClick={handleFamilleClick}
            selectedFamille={selectedFamille}
            onSousFamilleClick={handleSousFamilleClick}
            selectedSousFamille={selectedSousFamille}
          />
        )}
        {graphTab === 'top10'   && <ChartTop10 allFournisseurs={allFournisseurs} />}
        {graphTab === 'pareto'  && <ChartPareto allFournisseurs={allFournisseurs} totalCharge={totalCharge} />}
        {graphTab === 'mensuel' && (
          <ChartMensuelFamille orders={ordersF} supplierByIdReclasse={supplierByIdReclasse} byFamille={byFamille} />
        )}
      </div>

      {/* Drill-down */}
      <div>
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <h3 className="text-sm font-semibold text-gray-700">Détail hiérarchique</h3>
          <span className="text-xs text-gray-400 italic">Famille → Fournisseur → Commandes</span>
          {selectedSousFamille && (
            <span className="inline-flex items-center gap-1.5 text-xs bg-indigo-50 border border-indigo-200 text-indigo-700 px-2.5 py-1 rounded-full">
              Filtré : {selectedFamille} › {selectedSousFamille}
              <button
                onClick={() => setSelectedSousFamille(null)}
                className="font-bold text-indigo-400 hover:text-indigo-700"
                title="Retirer le filtre"
              >
                ✕
              </button>
            </span>
          )}
        </div>
        <DrillTable
          byFamille={displayByFamille}
          totalCharge={displayTotal}
          ordersBySupplierId={ordersBySupplierId}
          capexOrdersByProjId={capexOrdersByProjId}
          autoOpenFamille={selectedSousFamille ? selectedFamille : null}
        />
      </div>
    </div>
  );
}
