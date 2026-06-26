import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine, ComposedChart,
} from 'recharts';
import {
  ChevronDown, ChevronRight, TrendingUp, TrendingDown,
  Building2, Calendar, Tag, BarChart2, Layers,
  Clock, Info, Search, X, HelpCircle, Upload,
  AlertTriangle, RefreshCw,
} from 'lucide-react';
import { useEditeurData } from '../../hooks/useEditeurData';
import { formatCurrency } from '../../utils/formatters';

const fmt     = (n) => formatCurrency(n ?? 0);
const fmtPct  = (n) => n !== null && n !== undefined ? `${(n * 100).toFixed(1)} %` : '—';
const fmtSign = (n) => n !== null && n !== undefined
  ? `${n >= 0 ? '+' : ''}${(n * 100).toFixed(1)} %`
  : '—';

const MOIS  = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#84cc16'];

// ── Tooltip recharts formatté ─────────────────────────────────────────────────

const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded shadow-lg p-2 text-xs">
      <div className="font-semibold text-gray-700 mb-1">{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color }} className="flex justify-between gap-4">
          <span>{p.name}</span>
          <span className="font-semibold">{fmt(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

// ── Notice d'aide ────────────────────────────────────────────────────────────

const GLOSSAIRE = [
  {
    terme: 'OPEX',
    acronyme: 'Operating Expenditure',
    def: 'Dépenses opérationnelles courantes — comptes ordonnateurs H6x et I6x dans la comptabilité source. Licences logicielles, maintenance, abonnements, prestations récurrentes.',
  },
  {
    terme: 'CAPEX',
    acronyme: 'Capital Expenditure',
    def: 'Dépenses d\'investissement — comptes H2x dans la comptabilité source. Acquisitions matérielles ou logicielles portées en immobilisation (serveurs, équipements réseau, projets pluriannuels).',
  },
  {
    terme: 'CAGR',
    acronyme: 'Compound Annual Growth Rate',
    def: 'Taux de croissance annuel composé. Mesure l\'évolution moyenne d\'un éditeur sur N années : (Dernier exercice / Premier exercice)^(1/N) − 1. Un CAGR > 15 % déclenche une alerte — renégocier ou mettre en concurrence.',
    color: 'red',
  },
  {
    terme: 'Score de dépendance',
    def: 'Pourcentage du budget IT total que représente cet éditeur. Seuils : > 15 % = dépendance critique (risque fournisseur), 8–15 % = à surveiller, < 8 % = acceptable.',
    color: 'orange',
  },
  {
    terme: 'Pareto 80/20',
    def: 'Principe de Pareto appliqué aux achats : les éditeurs surlignés en bleu dans la liste représentent cumulativement 80 % du budget total. Ce sont les leviers prioritaires pour négocier des économies.',
    color: 'indigo',
  },
  {
    terme: 'Récurrence',
    def: 'Commandes détectées comme récurrentes : un même éditeur a des dépenses d\'un montant similaire (±20 %) au même trimestre sur au moins deux années consécutives. Indique un coût fixe annuel à anticiper.',
    color: 'blue',
  },
  {
    terme: 'Alerte renouvellement',
    def: 'Si des commandes récurrentes sont détectées, la date probable de prochain renouvellement est calculée (dernière commande + 1 an). L\'alerte s\'affiche si ce délai est inférieur à 120 jours ou déjà dépassé.',
    color: 'orange',
  },
  {
    terme: 'Multi-comptes',
    def: 'L\'éditeur apparaît sur plusieurs comptes ordonnateurs différents dans la comptabilité source. Peut indiquer plusieurs contrats non consolidés, ou une mauvaise classification comptable à vérifier.',
    color: 'purple',
  },
  {
    terme: 'Heatmap',
    def: 'Grille mois × année colorée par intensité. Plus la cellule est sombre, plus les dépenses ce mois-là sont élevées par rapport au mois le plus chargé de l\'historique. Révèle instantanément les patterns de facturation (ex. pic de décembre, renouvellements de janvier).',
  },
  {
    terme: 'Saisonnalité',
    def: 'Répartition des dépenses sur les 12 mois, agrégée sur toutes les années importées. La ligne jaune représente la moyenne mensuelle annualisée. Un pic fort par rapport à la ligne rouge (moyenne globale) indique une saisonnalité marquée pouvant impacter la trésorerie.',
  },
  {
    terme: 'Ratio mandaté',
    def: 'Rapport entre le montant réellement mandaté (payé) et le montant total engagé. Un ratio faible indique des engagements non consommés — risque de sur-engagement ou de livraisons partielles non suivies.',
  },
];

const COLOR_MAP = {
  red:    'bg-red-50 border-red-200 text-red-700',
  orange: 'bg-orange-50 border-orange-200 text-orange-700',
  indigo: 'bg-indigo-50 border-indigo-200 text-indigo-700',
  blue:   'bg-blue-50 border-blue-200 text-blue-700',
  purple: 'bg-purple-50 border-purple-200 text-purple-700',
};

const NoticeAide = () => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Ferme le panneau si clic extérieur
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(p => !p)}
        title="Aide & glossaire"
        className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded border transition-colors
          ${open
            ? 'bg-indigo-100 border-indigo-300 text-indigo-700'
            : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50 hover:border-gray-300'}`}
      >
        <HelpCircle size={12} />
        Aide & glossaire
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-[520px] max-h-[70vh] overflow-y-auto
          bg-white border border-gray-200 rounded-xl shadow-xl z-50">
          {/* En-tête */}
          <div className="sticky top-0 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HelpCircle size={14} className="text-indigo-500" />
              <span className="text-sm font-semibold text-gray-800">Aide & glossaire</span>
            </div>
            <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600">
              <X size={14} />
            </button>
          </div>

          {/* Contenu */}
          <div className="p-4 space-y-3">
            {/* Intro */}
            <p className="text-xs text-gray-500 italic">
              Indicateurs calculés à partir des commandes du fichier de commandes importé.
              Les seuils d'alerte sont configurés pour le contexte hospitalier public (DSI).
            </p>

            {GLOSSAIRE.map(g => (
              <div key={g.terme}
                className={`rounded-lg border p-3 ${g.color ? COLOR_MAP[g.color] : 'bg-gray-50 border-gray-200 text-gray-700'}`}>
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-xs font-bold">{g.terme}</span>
                  {g.acronyme && (
                    <span className="text-[10px] opacity-60 italic">{g.acronyme}</span>
                  )}
                </div>
                <p className="text-[11px] leading-relaxed opacity-90">{g.def}</p>
              </div>
            ))}

            {/* Légende badges liste */}
            <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
              <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-wide mb-2">
                Icônes dans la liste des éditeurs
              </p>
              <div className="grid grid-cols-2 gap-1.5 text-[10px] text-gray-600">
                <div className="flex items-center gap-1.5"><TrendingUp size={10} className="text-red-400 flex-shrink-0" /> CAGR &gt; 15 % (croissance rapide)</div>
                <div className="flex items-center gap-1.5"><AlertTriangle size={10} className="text-red-500 flex-shrink-0" /> Dépendance critique (&gt; 15 %)</div>
                <div className="flex items-center gap-1.5"><RefreshCw size={10} className="text-blue-400 flex-shrink-0" /> Commandes récurrentes détectées</div>
                <div className="flex items-center gap-1.5"><Clock size={10} className="text-orange-500 flex-shrink-0" /> Renouvellement imminent</div>
                <div className="flex items-center gap-1.5"><Layers size={10} className="text-purple-400 flex-shrink-0" /> Plusieurs comptes ordonnateurs</div>
                <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-indigo-400 flex-shrink-0" /> Dans le Pareto 80 %</div>
              </div>
            </div>

            {/* Format fichier */}
            <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
              <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-wide mb-1.5">
                Format de fichier supporté
              </p>
              <div className="space-y-1 text-[10px] text-gray-600">
                <div><span className="font-medium text-indigo-700">Modèle canonique</span> — fichier XLSX/CSV dont les colonnes sont reconnues par leur nom (cf. fichier exemple téléchargeable). Chargement multi-années automatique via la colonne "Exercice".</div>
                <div className="text-gray-400 italic">L'import remplace les données existantes par le contenu du fichier.</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Liste éditeurs (panel gauche) ─────────────────────────────────────────────

const ListeEditeurs = ({
  editeurs, selected, onSelect, totalGlobal,
  checkedKeys, onToggleCheck, onClearChecks,
}) => {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() =>
    editeurs.filter(e => e.nom.toLowerCase().includes(search.toLowerCase())),
  [editeurs, search]);

  const pareto80count  = editeurs.filter(e => e.inPareto80).length;
  const checkedCount   = checkedKeys.size;
  const allFilteredChecked = filtered.length > 0 && filtered.every(e => checkedKeys.has(e.key));

  const toggleAllFiltered = () => {
    if (allFilteredChecked) {
      filtered.forEach(e => onToggleCheck(e.key, false));
    } else {
      filtered.forEach(e => onToggleCheck(e.key, true));
    }
  };

  return (
    <div className="flex flex-col h-full border-r border-gray-200">
      {/* Header */}
      <div className="p-3 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
            Éditeurs ({editeurs.length})
          </span>
          <span className="text-[10px] text-gray-400 bg-gray-100 rounded px-1.5 py-0.5">
            {pareto80count} → 80% budget
          </span>
        </div>
        <div className="relative">
          <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-6 pr-6 py-1.5 text-xs border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-400"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X size={10} />
            </button>
          )}
        </div>
      </div>

      {/* Bandeau groupe actif */}
      {checkedCount > 0 && (
        <div className="px-3 py-1.5 bg-violet-50 border-b border-violet-200 flex items-center justify-between">
          <span className="text-[10px] font-semibold text-violet-700">
            {checkedCount} éditeur{checkedCount > 1 ? 's' : ''} dans le groupe
          </span>
          <button onClick={onClearChecks}
            className="text-[10px] text-violet-500 hover:text-violet-700 flex items-center gap-0.5 transition-colors">
            <X size={9} /> Tout désélectionner
          </button>
        </div>
      )}

      {/* Liste scrollable */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 && (
          <div className="text-xs text-gray-400 italic text-center py-8">Aucun éditeur trouvé</div>
        )}

        {/* Tout cocher/décocher (apparaît si recherche active ou >1 résultat) */}
        {filtered.length > 1 && (
          <div className="px-3 py-1 border-b border-gray-100 bg-gray-50 flex items-center gap-1.5">
            <input type="checkbox"
              checked={allFilteredChecked}
              onChange={toggleAllFiltered}
              className="w-3 h-3 accent-violet-600 cursor-pointer"
              title={allFilteredChecked ? 'Tout décocher' : 'Tout cocher'}
            />
            <span className="text-[10px] text-gray-500">
              {allFilteredChecked ? 'Tout décocher' : `Tout cocher (${filtered.length})`}
            </span>
          </div>
        )}

        {filtered.map((e, i) => {
          const isSelected = selected?.key === e.key;
          const isChecked  = checkedKeys.has(e.key);
          const barWidth   = totalGlobal > 0 ? (e.total / totalGlobal) * 100 : 0;
          const depLevel   = e.scoreDep >= 15 ? 'critical' : e.scoreDep >= 8 ? 'watch' : 'ok';

          return (
            <div
              key={e.key}
              className={`flex items-start border-b border-gray-100 transition-colors group
                ${isChecked  ? 'bg-violet-50 border-l-2 border-l-violet-400'
                : isSelected ? 'bg-indigo-50 border-l-2 border-l-indigo-500'
                : 'hover:bg-gray-50'}`}
            >
              {/* Case à cocher */}
              <div className="flex-shrink-0 flex items-center justify-center w-7 pt-3">
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={(ev) => {
                    ev.stopPropagation();
                    onToggleCheck(e.key, ev.target.checked);
                  }}
                  className="w-3 h-3 accent-violet-600 cursor-pointer"
                  title="Ajouter au groupe"
                />
              </div>

              {/* Contenu cliquable */}
              <button
                onClick={() => onSelect(e)}
                className="flex-1 text-left py-2.5 pr-3 min-w-0"
              >
                <div className="flex items-center justify-between gap-1 mb-1">
                  <div className="flex items-center gap-1 min-w-0">
                    <span className={`text-[10px] font-bold w-4 text-center flex-shrink-0
                      ${i < 3 ? 'text-amber-500' : 'text-gray-400'}`}>
                      #{i + 1}
                    </span>
                    <span className={`text-xs font-medium truncate
                      ${isChecked ? 'text-violet-700' : isSelected ? 'text-indigo-700' : 'text-gray-800'}`}
                      title={e.nom}>
                      {e.nom}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {e.hasRecurrence && <span title="Récurrent" className="text-blue-400"><RefreshCw size={9} /></span>}
                    {e.alerteRenouvellement && <span title={`Renouvellement dans ${e.alerteRenouvellement.daysLeft}j`} className="text-orange-500"><Clock size={9} /></span>}
                    {depLevel === 'critical' && <span title="Dépendance critique" className="text-red-500"><AlertTriangle size={9} /></span>}
                    {e.cagr !== null && e.cagr > 0.15 && <span title={`CAGR +${(e.cagr*100).toFixed(0)}%`} className="text-red-400"><TrendingUp size={9} /></span>}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex-1 h-1 bg-gray-100 rounded-full mr-2">
                    <div
                      className={`h-1 rounded-full ${isChecked ? 'bg-violet-400' : e.inPareto80 ? 'bg-indigo-400' : 'bg-gray-300'}`}
                      style={{ width: `${Math.min(barWidth, 100)}%` }}
                    />
                  </div>
                  <span className={`text-[10px] font-semibold
                    ${isChecked ? 'text-violet-600' : isSelected ? 'text-indigo-600' : 'text-gray-500'}`}>
                    {fmt(e.total)}
                  </span>
                </div>
                <div className="flex gap-1 mt-0.5">
                  {e.types.includes('opex') && <span className="text-[9px] bg-indigo-100 text-indigo-600 rounded px-1">OPEX</span>}
                  {e.types.includes('capex') && <span className="text-[9px] bg-emerald-100 text-emerald-600 rounded px-1">CAPEX</span>}
                  <span className="text-[9px] text-gray-400">{e.pctTotal.toFixed(1)}%</span>
                  {e.cagr !== null && (
                    <span className={`text-[9px] font-medium ${e.cagr > 0.1 ? 'text-red-500' : e.cagr < -0.05 ? 'text-green-600' : 'text-gray-500'}`}>
                      CAGR {fmtSign(e.cagr)}
                    </span>
                  )}
                </div>
              </button>
            </div>
          );
        })}
      </div>

      {/* Pareto résumé */}
      {totalGlobal > 0 && (
        <div className="p-2 border-t border-gray-200 bg-gray-50 text-[10px] text-gray-500">
          Pareto : <strong className="text-indigo-600">{pareto80count} éditeurs</strong> = 80% du budget
          <span className="ml-1 text-gray-400">({fmt(totalGlobal)} total)</span>
        </div>
      )}
    </div>
  );
};

// ── Cartes KPI éditeur ────────────────────────────────────────────────────────

const KPICard = ({ label, value, sub, color = 'indigo', icon: Icon, alert }) => (
  <div className={`bg-white border rounded-lg p-3 ${alert ? 'border-red-200 bg-red-50' : 'border-gray-200'}`}>
    <div className="flex items-start justify-between mb-1">
      <span className="text-[10px] text-gray-500 uppercase tracking-wide font-medium">{label}</span>
      {Icon && <Icon size={14} className={`text-${color}-400`} />}
    </div>
    <div className={`text-sm font-bold ${alert ? 'text-red-700' : `text-${color}-700`}`}>{value}</div>
    {sub && <div className="text-[10px] text-gray-400 mt-0.5">{sub}</div>}
  </div>
);

const EditeurKPIs = ({ editeur }) => {
  if (!editeur) return null;
  const { total, opexMontant, capexMontant, orderCount, cagr, scoreDep, alerteRenouvellement, years, ratioEngagement } = editeur;

  const lastYear  = years[years.length - 1];
  const firstYear = years[0];
  const lastTotal = lastYear ? editeur.byYear[lastYear]?.montant : null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
      <KPICard label="Total global" value={fmt(total)}
        sub={`${orderCount} commande${orderCount > 1 ? 's' : ''}`}
        icon={BarChart2} color="indigo" />
      <KPICard label="OPEX" value={fmt(opexMontant)}
        sub={total > 0 ? `${((opexMontant / total) * 100).toFixed(0)} %` : '—'}
        icon={Tag} color="blue" />
      <KPICard label="CAPEX" value={fmt(capexMontant)}
        sub={total > 0 ? `${((capexMontant / total) * 100).toFixed(0)} %` : '—'}
        icon={Layers} color="emerald" />
      <KPICard
        label="CAGR"
        value={cagr !== null ? fmtSign(cagr) : '—'}
        sub={years.length >= 2 ? `${firstYear} → ${lastYear}` : 'Données insuffisantes'}
        icon={cagr > 0.1 ? TrendingUp : TrendingDown}
        color={cagr > 0.15 ? 'red' : cagr > 0.05 ? 'orange' : 'green'}
        alert={cagr > 0.15}
      />
      <KPICard
        label="Dépendance"
        value={`${scoreDep?.toFixed(1)} %`}
        sub={scoreDep >= 15 ? 'Critique !' : scoreDep >= 8 ? 'À surveiller' : 'Acceptable'}
        icon={AlertTriangle}
        color={scoreDep >= 15 ? 'red' : scoreDep >= 8 ? 'orange' : 'green'}
        alert={scoreDep >= 15}
      />
      <KPICard
        label={alerteRenouvellement ? 'Renouvellement' : lastYear ? `Dernier exercice (${lastYear})` : 'Exercice N'}
        value={alerteRenouvellement
          ? (alerteRenouvellement.daysLeft <= 0 ? 'Dépassé !' : `Dans ${alerteRenouvellement.daysLeft}j`)
          : fmt(lastTotal ?? 0)}
        sub={alerteRenouvellement ? alerteRenouvellement.date : (ratioEngagement !== null ? `Ratio mandaté : ${fmtPct(ratioEngagement)}` : undefined)}
        icon={alerteRenouvellement ? Clock : Calendar}
        color={alerteRenouvellement ? 'orange' : 'gray'}
        alert={alerteRenouvellement?.daysLeft <= 0}
      />
    </div>
  );
};

// ── Graphique Saisonnalité ────────────────────────────────────────────────────

const ChartSaisonnalite = ({ editeur }) => {
  const data = editeur.seasonality.map(s => ({
    label: s.label,
    total: Math.round(s.montant),
    moyen: Math.round(s.montantMoyen),
  }));

  const maxVal = Math.max(...data.map(d => d.total), 1);

  return (
    <div>
      <p className="text-[10px] text-gray-400 mb-2 italic">
        Cumul sur toutes les années importées — barres : total, trait : moyenne annuelle
      </p>
      <ResponsiveContainer width="100%" height={200}>
        <ComposedChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="label" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
          <Tooltip content={<ChartTooltip />} />
          <Bar dataKey="total" name="Total cumulé" fill="#6366f1" opacity={0.7} radius={[2, 2, 0, 0]} />
          <Line dataKey="moyen" name="Moy. annuelle" stroke="#f59e0b" strokeWidth={2} dot={false} />
          {/* Ligne moy globale */}
          <ReferenceLine y={Math.round(data.reduce((s, d) => s + d.moyen, 0) / 12)}
            stroke="#ef4444" strokeDasharray="4 2" strokeWidth={1} />
        </ComposedChart>
      </ResponsiveContainer>
      {/* Mois dominant */}
      {(() => {
        const peak = [...data].sort((a, b) => b.total - a.total)[0];
        return peak && peak.total > 0 ? (
          <p className="text-[10px] text-indigo-600 mt-1">
            Pic de dépense : <strong>{peak.label}</strong> ({fmt(peak.total)})
            {peak.total / (maxVal || 1) > 0.4 && <span className="text-orange-500 ml-1">— forte saisonnalité</span>}
          </p>
        ) : null;
      })()}
    </div>
  );
};

// ── Graphique Évolution (T/S/A) ───────────────────────────────────────────────

const ChartEvolution = ({ editeur }) => {
  const [granularity, setGranularity] = useState('A');

  const data = useMemo(() => {
    if (granularity === 'A') {
      return editeur.years.map(y => ({
        label: String(y),
        opex:  Math.round(editeur.byYear[y]?.opex  ?? 0),
        capex: Math.round(editeur.byYear[y]?.capex ?? 0),
        total: Math.round(editeur.byYear[y]?.montant ?? 0),
      }));
    }
    if (granularity === 'S') {
      return Object.values(editeur.bySemester)
        .sort((a, b) => a.year - b.year || a.sem - b.sem)
        .map(s => ({
          label: s.label,
          opex:  Math.round(s.opex ?? 0),
          capex: Math.round(s.capex ?? 0),
          total: Math.round(s.montant ?? 0),
        }));
    }
    // Trimestres
    return Object.values(editeur.byQuarter)
      .sort((a, b) => a.year - b.year || a.quarter - b.quarter)
      .map(q => ({
        label: q.label,
        opex:  Math.round(q.opex ?? 0),
        capex: Math.round(q.capex ?? 0),
        total: Math.round(q.montant ?? 0),
      }));
  }, [editeur, granularity]);

  return (
    <div>
      <div className="flex gap-1 mb-2">
        {[['A', 'Années'], ['S', 'Semestres'], ['T', 'Trimestres']].map(([k, l]) => (
          <button key={k} onClick={() => setGranularity(k)}
            className={`text-xs px-2 py-0.5 rounded border transition-colors
              ${granularity === k ? 'bg-indigo-100 border-indigo-300 text-indigo-700 font-medium' : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'}`}>
            {l}
          </button>
        ))}
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <ComposedChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="label" tick={{ fontSize: 9 }} interval={0} angle={data.length > 8 ? -30 : 0} textAnchor={data.length > 8 ? 'end' : 'middle'} height={data.length > 8 ? 40 : 20} />
          <YAxis tick={{ fontSize: 10 }} tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
          <Tooltip content={<ChartTooltip />} />
          <Legend wrapperStyle={{ fontSize: 10 }} />
          <Bar dataKey="opex"  name="OPEX"  stackId="a" fill="#6366f1" radius={[0, 0, 0, 0]} />
          <Bar dataKey="capex" name="CAPEX" stackId="a" fill="#10b981" radius={[2, 2, 0, 0]} />
          <Line dataKey="total" name="Total" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

// ── Heatmap mois × année ──────────────────────────────────────────────────────

const ChartHeatmap = ({ editeur }) => {
  const { heatmap } = editeur;
  if (heatmap.length === 0) return <div className="text-xs text-gray-400 italic py-4">Aucune donnée.</div>;

  const allValues = heatmap.flatMap(row => row.months);
  const maxVal    = Math.max(...allValues, 1);

  const intensity = (v) => {
    const ratio = v / maxVal;
    if (ratio === 0) return 'bg-gray-50 text-gray-300';
    if (ratio < 0.15) return 'bg-indigo-100 text-indigo-600';
    if (ratio < 0.35) return 'bg-indigo-200 text-indigo-700';
    if (ratio < 0.60) return 'bg-indigo-400 text-white';
    return 'bg-indigo-700 text-white';
  };

  return (
    <div className="overflow-x-auto">
      <table className="text-[10px] border-collapse min-w-full">
        <thead>
          <tr>
            <th className="text-left px-2 py-1 text-gray-400 font-medium w-12">Année</th>
            {MOIS.map(m => (
              <th key={m} className="px-1 py-1 text-gray-400 font-medium text-center w-10">{m}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {heatmap.map(row => (
            <tr key={row.year}>
              <td className="px-2 py-0.5 font-semibold text-gray-600">{row.year}</td>
              {row.months.map((v, m) => (
                <td key={m} className={`px-1 py-0.5 text-center rounded transition-colors ${intensity(v)}`}
                  title={`${MOIS[m]} ${row.year} : ${fmt(v)}`}>
                  {v > 0 ? (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v.toFixed(0)) : '·'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-[10px] text-gray-400 mt-1 italic">
        Intensité = % du mois le plus chargé ({fmt(maxVal)})
      </p>
    </div>
  );
};

// ── Pareto global ─────────────────────────────────────────────────────────────

const ChartPareto = ({ editeurs }) => {
  const top20 = editeurs.slice(0, 20);
  const data  = top20.map(e => ({
    label:   e.nom.length > 16 ? e.nom.slice(0, 15) + '…' : e.nom,
    montant: Math.round(e.total),
    cumul:   Math.round(e.cumulPct),
  }));

  return (
    <div>
      <p className="text-[10px] text-gray-400 mb-2 italic">
        Top 20 éditeurs — barres : montant, trait : % cumulé du budget total
      </p>
      <ResponsiveContainer width="100%" height={220}>
        <ComposedChart data={data} margin={{ top: 4, right: 40, left: 0, bottom: 40 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="label" tick={{ fontSize: 8 }} angle={-40} textAnchor="end" interval={0} height={55} />
          <YAxis yAxisId="left"  tick={{ fontSize: 10 }} tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
          <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} domain={[0, 100]} tickFormatter={v => `${v}%`} />
          <Tooltip content={<ChartTooltip />} />
          <Bar yAxisId="left" dataKey="montant" name="Montant" fill="#6366f1" opacity={0.8} />
          <Line yAxisId="right" dataKey="cumul" name="% cumulé" stroke="#ef4444" strokeWidth={2} dot={false} />
          <ReferenceLine yAxisId="right" y={80} stroke="#ef4444" strokeDasharray="4 2" />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

// ── Drill Commandes ───────────────────────────────────────────────────────────

const DrillCommandes = ({ orders }) => {
  if (!orders.length) return <div className="px-4 py-3 text-xs text-gray-400 italic">Aucune commande.</div>;
  const sorted = [...orders].sort((a, b) => (b.dateCommande || '').localeCompare(a.dateCommande || ''));
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="bg-gray-50 text-gray-500">
            <th className="text-left px-3 py-1.5 border-b">Date</th>
            <th className="text-left px-3 py-1.5 border-b">Référence</th>
            <th className="text-left px-3 py-1.5 border-b">Désignation</th>
            <th className="text-left px-3 py-1.5 border-b">Type</th>
            <th className="text-left px-3 py-1.5 border-b">État</th>
            <th className="text-right px-3 py-1.5 border-b">Montant</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map(o => (
            <tr key={o.id} className="border-b hover:bg-gray-50">
              <td className="px-3 py-1.5 text-gray-500 whitespace-nowrap">{o.dateCommande || '—'}</td>
              <td className="px-3 py-1.5 font-mono text-gray-600 text-[10px]">{o.reference || o.numeroMarche || '—'}</td>
              <td className="px-3 py-1.5 text-gray-800 max-w-xs truncate" title={o.description}>{o.description || '—'}</td>
              <td className="px-3 py-1.5">
                <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium
                  ${o._type === 'opex' ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'}`}>
                  {o._type?.toUpperCase()}
                </span>
              </td>
              <td className="px-3 py-1.5 text-gray-500 text-[10px]">{o.etatSage || o.status || '—'}</td>
              <td className="px-3 py-1.5 text-right font-semibold text-indigo-700">{fmt(o.montant || 0)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// ── Drill complet Année → Semestre → Trimestre → Commandes ───────────────────

const DrillEditeur = ({ editeur }) => {
  const [openYear, setOpenYear]       = useState(null);
  const [openSem, setOpenSem]         = useState(null);
  const [openQuarter, setOpenQuarter] = useState(null);

  const toggleYear = (y) => {
    setOpenYear(p => p === y ? null : y);
    setOpenSem(null);
    setOpenQuarter(null);
  };
  const toggleSem = (k) => {
    setOpenSem(p => p === k ? null : k);
    setOpenQuarter(null);
  };

  const years = [...editeur.years].sort((a, b) => b - a);

  // Semestres ayant réellement des données pour cette année
  const semsForYear = (y) =>
    [1, 2]
      .map(s => editeur.bySemester[`${y}-S${s}`])
      .filter(Boolean)
      .filter(sem => sem.montant > 0);

  // Trimestres d'un semestre ayant des données
  const quartersForSem = (y, semNum) =>
    (semNum === 1 ? [1, 2] : [3, 4])
      .map(q => editeur.byQuarter[`${y}-Q${q}`])
      .filter(Boolean)
      .filter(q => q.orders.length > 0);

  if (years.length === 0) {
    return <div className="text-xs text-gray-400 italic py-4 text-center">Aucune donnée temporelle.</div>;
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gray-100 grid grid-cols-[1fr_1fr_1fr_1fr_24px] text-xs font-medium text-gray-500 border-b">
        <div className="px-3 py-2">Période</div>
        <div className="px-3 py-2 text-right">Total</div>
        <div className="px-3 py-2 text-right">OPEX</div>
        <div className="px-3 py-2 text-right">CAPEX</div>
        <div className="px-3 py-2 text-right" />
      </div>

      {years.map(y => {
        const yd      = editeur.byYear[y] || { montant: 0, opex: 0, capex: 0, orders: [] };
        const isOpenY = openYear === y;
        const sems    = semsForYear(y);
        // Commandes sans ventilation semestrielle (exercice renseigné mais date absente)
        const ordersWithoutSem = yd.orders?.filter(o => {
          const d = o.dateCommande || o.datePassation || o.dateImputation || '';
          return !d;
        }) ?? [];

        return (
          <div key={y} className="border-b last:border-b-0">
            {/* Ligne Année */}
            <button
              onClick={() => toggleYear(y)}
              className="w-full grid grid-cols-[1fr_1fr_1fr_1fr_24px] text-xs items-center hover:bg-indigo-50 bg-white transition-colors"
            >
              <div className="px-3 py-2.5 font-bold text-gray-700 flex items-center gap-1.5">
                {isOpenY ? <ChevronDown size={12} className="text-indigo-500" /> : <ChevronRight size={12} className="text-gray-400" />}
                {y}
              </div>
              <div className="px-3 py-2.5 text-right font-semibold text-indigo-700">{fmt(yd.montant)}</div>
              <div className="px-3 py-2.5 text-right text-blue-600">{fmt(yd.opex ?? 0)}</div>
              <div className="px-3 py-2.5 text-right text-emerald-600">{fmt(yd.capex ?? 0)}</div>
              <div className="px-3 py-2.5 text-right text-gray-400 text-[10px]">{yd.orders?.length ?? 0}</div>
            </button>

            {isOpenY && (
              <div className="bg-indigo-50 border-t border-indigo-100">

                {/* ── Cas normal : semestres avec données ── */}
                {sems.map(sem => {
                  const semKey  = `${y}-S${sem.sem}`;
                  const isOpenS = openSem === semKey;

                  return (
                    <div key={semKey} className="border-b border-indigo-100 last:border-b-0">
                      <button
                        onClick={() => toggleSem(semKey)}
                        className="w-full grid grid-cols-[1fr_1fr_1fr_1fr_24px] text-xs items-center hover:bg-indigo-100 transition-colors"
                      >
                        <div className="px-3 py-2 pl-7 text-gray-700 flex items-center gap-1">
                          {isOpenS ? <ChevronDown size={11} className="text-indigo-400" /> : <ChevronRight size={11} className="text-gray-400" />}
                          <Calendar size={10} className="text-indigo-400" />
                          {sem.label}
                        </div>
                        <div className="px-3 py-2 text-right font-semibold text-indigo-600">{fmt(sem.montant)}</div>
                        <div className="px-3 py-2 text-right text-blue-500">{fmt(sem.opex ?? 0)}</div>
                        <div className="px-3 py-2 text-right text-emerald-500">{fmt(sem.capex ?? 0)}</div>
                        <div className="px-3 py-2 text-right text-gray-400 text-[10px]">{sem.orders?.length ?? 0}</div>
                      </button>

                      {isOpenS && (() => {
                        const quarters = quartersForSem(y, sem.sem);
                        return (
                          <div className="bg-white border-t border-indigo-100">
                            {quarters.length === 0 ? (
                              /* Pas de trimestres → commandes directement */
                              <div className="ml-8">
                                <DrillCommandes orders={sem.orders ?? []} />
                              </div>
                            ) : quarters.map(q => {
                              const qKey       = `${y}-Q${q.quarter}`;
                              const isOpenQ    = openQuarter === qKey;
                              const isRecurring = editeur.recurringQuarterKeys?.has(qKey);

                              return (
                                <div key={qKey} className="border-b border-gray-100 last:border-b-0">
                                  <button
                                    onClick={() => setOpenQuarter(p => p === qKey ? null : qKey)}
                                    className="w-full grid grid-cols-[1fr_1fr_1fr_1fr_24px] text-xs items-center hover:bg-gray-50 transition-colors"
                                  >
                                    <div className="px-3 py-1.5 pl-12 text-gray-600 flex items-center gap-1">
                                      {isOpenQ ? <ChevronDown size={10} className="text-blue-400" /> : <ChevronRight size={10} className="text-gray-300" />}
                                      {q.label}
                                      {isRecurring && (
                                        <span className="ml-1 text-[9px] bg-blue-100 text-blue-600 rounded px-1 flex items-center gap-0.5">
                                          <RefreshCw size={8} /> récurrent
                                        </span>
                                      )}
                                    </div>
                                    <div className="px-3 py-1.5 text-right font-medium text-gray-700">{fmt(q.montant)}</div>
                                    <div className="px-3 py-1.5 text-right text-blue-500">{fmt(q.opex ?? 0)}</div>
                                    <div className="px-3 py-1.5 text-right text-emerald-500">{fmt(q.capex ?? 0)}</div>
                                    <div className="px-3 py-1.5 text-right text-gray-400 text-[10px]">{q.orders.length}</div>
                                  </button>

                                  {isOpenQ && (
                                    <div className="ml-12 border-t border-gray-100">
                                      <DrillCommandes orders={q.orders} />
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()}
                    </div>
                  );
                })}

                {/* ── Fallback : aucun semestre → commandes directement ── */}
                {sems.length === 0 && yd.orders?.length > 0 && (
                  <div className="bg-white border-t border-indigo-100">
                    <div className="px-4 py-1.5 text-[10px] text-gray-400 italic border-b border-gray-100 flex items-center gap-1">
                      <Info size={10} />
                      Dates de commande absentes dans la comptabilité source — affichage direct des {yd.orders.length} commande(s)
                    </div>
                    <DrillCommandes orders={yd.orders} />
                  </div>
                )}

                {/* ── Commandes sans date rattachées à cette année via l'exercice ── */}
                {sems.length > 0 && ordersWithoutSem.length > 0 && (
                  <div className="border-t border-indigo-100">
                    <details className="group">
                      <summary className="px-4 py-1.5 text-[10px] text-gray-400 italic cursor-pointer hover:bg-indigo-100 list-none flex items-center gap-1">
                        <ChevronRight size={9} className="group-open:rotate-90 transition-transform" />
                        {ordersWithoutSem.length} commande(s) sans date (exercice {y} uniquement)
                      </summary>
                      <div className="bg-white border-t border-indigo-100">
                        <DrillCommandes orders={ordersWithoutSem} />
                      </div>
                    </details>
                  </div>
                )}

              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

// ── Panel par nature de dépense ───────────────────────────────────────────────

// ── Détail éditeur (panel droit) ──────────────────────────────────────────────

const CHART_TABS = [
  { id: 'saisonnalite', label: 'Saisonnalité', icon: Calendar },
  { id: 'evolution',    label: 'Évolution',    icon: TrendingUp },
  { id: 'heatmap',      label: 'Heatmap',      icon: BarChart2 },
];

const DETAIL_TABS = [
  { id: 'drill',     label: 'Drill temporel' },
  { id: 'commandes', label: 'Toutes les commandes' },
];

const EditeurDetail = ({ editeur, totalGlobal }) => {
  const [activeChart,  setActiveChart]  = useState('saisonnalite');
  const [activeDetail, setActiveDetail] = useState('drill');

  if (!editeur) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3 py-20">
        <Building2 size={48} className="text-gray-200" />
        <span className="text-sm">Sélectionnez un éditeur dans la liste</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4 overflow-y-auto h-full">
      {/* Titre éditeur */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-800">{editeur.nom}</h2>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            {editeur.types.includes('opex') && <span className="text-xs bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-full px-2 py-0.5">OPEX</span>}
            {editeur.types.includes('capex') && <span className="text-xs bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-full px-2 py-0.5">CAPEX</span>}
            <span className="text-xs text-gray-400">{editeur.years.join(', ')}</span>
          </div>
        </div>
        {editeur.alerteRenouvellement && (
          <div className="flex-shrink-0 bg-orange-50 border border-orange-200 rounded-lg px-3 py-2 text-xs text-orange-700 flex items-center gap-1.5">
            <Clock size={12} />
            <span>
              Renouvellement {editeur.alerteRenouvellement.daysLeft <= 0
                ? 'dépassé'
                : `dans ${editeur.alerteRenouvellement.daysLeft} j`}
              {' '}({editeur.alerteRenouvellement.date})
            </span>
          </div>
        )}
      </div>

      {/* KPIs */}
      <EditeurKPIs editeur={editeur} totalGlobal={totalGlobal} />

      {/* Graphiques */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <div className="flex gap-1 mb-3 border-b border-gray-100 pb-2">
          {CHART_TABS.map(t => (
            <button key={t.id} onClick={() => setActiveChart(t.id)}
              className={`flex items-center gap-1.5 text-xs px-3 py-1 rounded transition-colors
                ${activeChart === t.id ? 'bg-indigo-100 text-indigo-700 font-medium' : 'text-gray-500 hover:bg-gray-100'}`}>
              <t.icon size={11} />
              {t.label}
            </button>
          ))}
        </div>
        {activeChart === 'saisonnalite' && <ChartSaisonnalite editeur={editeur} />}
        {activeChart === 'evolution'    && <ChartEvolution    editeur={editeur} />}
        {activeChart === 'heatmap'      && <ChartHeatmap      editeur={editeur} />}
      </div>

      {/* Drill + Nature */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <div className="flex gap-1 mb-3 border-b border-gray-100 pb-2">
          {DETAIL_TABS.map(t => (
            <button key={t.id} onClick={() => setActiveDetail(t.id)}
              className={`text-xs px-3 py-1 rounded transition-colors
                ${activeDetail === t.id ? 'bg-indigo-100 text-indigo-700 font-medium' : 'text-gray-500 hover:bg-gray-100'}`}>
              {t.label}
            </button>
          ))}
        </div>
        {activeDetail === 'drill'     && <DrillEditeur  editeur={editeur} />}
        {activeDetail === 'commandes' && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-gray-400">
                {editeur.allOrders.length} commande(s) au total — toutes années confondues
              </span>
            </div>
            <DrillCommandes orders={editeur.allOrders} />
          </div>
        )}
      </div>
    </div>
  );
};

// ── Vue globale (aucun éditeur sélectionné) ───────────────────────────────────

const VueGlobale = ({ editeurs, totalGlobal, years = [] }) => {
  const [selectedYear, setSelectedYear] = useState('all');

  const paretoEditeurs = useMemo(() => {
    if (selectedYear === 'all') return editeurs;
    const yr = Number(selectedYear);
    const withYear = editeurs
      .map(e => ({ ...e, total: e.byYear?.[yr]?.montant ?? 0 }))
      .filter(e => e.total > 0)
      .sort((a, b) => b.total - a.total);
    const sum = withYear.reduce((s, e) => s + e.total, 0);
    let cumul = 0;
    return withYear.map(e => {
      cumul += e.total;
      return { ...e, cumulPct: sum > 0 ? (cumul / sum) * 100 : 0 };
    });
  }, [editeurs, selectedYear]);

  const paretoTotal = selectedYear === 'all' ? totalGlobal : paretoEditeurs.reduce((s, e) => s + e.total, 0);
  const sortedYears = [...years].sort((a, b) => b - a);

  if (editeurs.length === 0) return null;

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-3">
        <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          <BarChart2 size={14} className="text-indigo-500" />
          Vue globale — Pareto éditeurs
        </h3>
        <div className="ml-auto flex items-center gap-2 text-xs text-gray-500">
          <Calendar size={12} className="text-gray-400" />
          <span className="text-gray-400">Année :</span>
          <div className="flex gap-1">
            <button
              onClick={() => setSelectedYear('all')}
              className={`px-2.5 py-1 rounded border text-xs font-medium transition-colors ${
                selectedYear === 'all' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}
            >
              Toutes
            </button>
            {sortedYears.map(y => (
              <button
                key={y}
                onClick={() => setSelectedYear(String(y))}
                className={`px-2.5 py-1 rounded border text-xs font-medium transition-colors ${
                  selectedYear === String(y) ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                }`}
              >
                {y}
              </button>
            ))}
          </div>
        </div>
      </div>
      <ChartPareto editeurs={paretoEditeurs} totalGlobal={paretoTotal} />
      <div className="grid grid-cols-3 gap-3 text-xs">
        <KPICard label="Éditeurs total" value={editeurs.length}
          sub={`${editeurs.filter(e => e.inPareto80).length} dans le Pareto 80%`}
          icon={Building2} color="indigo" />
        <KPICard label="Budget total" value={fmt(totalGlobal)}
          sub={`${editeurs.filter(e => e.types.includes('opex') && e.types.includes('capex')).length} éditeurs OPEX+CAPEX`}
          icon={BarChart2} color="blue" />
        <KPICard label="Alertes" value={
          editeurs.filter(e => e.scoreDep >= 15 || (e.cagr && e.cagr > 0.15)).length
        }
          sub={`${editeurs.filter(e => e.alerteRenouvellement).length} renouvellement(s) à venir`}
          icon={AlertTriangle} color="red"
          alert={editeurs.some(e => e.scoreDep >= 15)}
        />
      </div>
    </div>
  );
};

// ── Drill avec onglet "Toutes les commandes" (réutilisé dans groupe) ──────────

const DrillTabsGroup = ({ editeur }) => {
  const [tab, setTab] = useState('drill');
  return (
    <div>
      <div className="flex gap-1 mb-2">
        {[['drill', 'Drill temporel'], ['commandes', 'Toutes les commandes']].map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`text-xs px-2.5 py-1 rounded border transition-colors
              ${tab === k ? 'bg-violet-100 border-violet-300 text-violet-700 font-medium' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
            {l}
          </button>
        ))}
        <span className="ml-auto text-[10px] text-gray-400 self-center">
          {editeur.allOrders.length} commande(s)
        </span>
      </div>
      {tab === 'drill' && <DrillEditeur editeur={editeur} />}
      {tab === 'commandes' && <DrillCommandes orders={editeur.allOrders} />}
    </div>
  );
};

// ── Vue groupée (multi-sélection) ─────────────────────────────────────────────

const EditeurGroupDetail = ({ editeurs: group, totalGlobal, onRemove }) => {
  const [drillEditeur, setDrillEditeur] = useState(group[0] ?? null);
  const [activeChart, setActiveChart]   = useState('comparaison');

  // Synchronise drillEditeur si le groupe change
  useEffect(() => {
    setDrillEditeur(prev => group.find(e => e.key === prev?.key) ?? group[0] ?? null);
  }, [group]);

  // Agréger les données du groupe
  const agg = useMemo(() => {
    const total       = group.reduce((s, e) => s + e.total, 0);
    const opexMontant = group.reduce((s, e) => s + e.opexMontant, 0);
    const capexMontant= group.reduce((s, e) => s + e.capexMontant, 0);
    const orderCount  = group.reduce((s, e) => s + e.orderCount, 0);
    const years       = [...new Set(group.flatMap(e => e.years))].sort();

    // byYear agrégé
    const byYear = {};
    group.forEach(e => {
      Object.entries(e.byYear).forEach(([y, data]) => {
        if (!byYear[y]) byYear[y] = { montant: 0, opex: 0, capex: 0 };
        byYear[y].montant += data.montant ?? 0;
        byYear[y].opex    += data.opex ?? 0;
        byYear[y].capex   += data.capex ?? 0;
      });
    });

    // Saisonnalité agrégée
    const seasonality = Array(12).fill(0).map((_, i) => ({
      label: ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'][i],
      montant: group.reduce((s, e) => s + (e.seasonality[i]?.montant ?? 0), 0),
    }));

    return { total, opexMontant, capexMontant, orderCount, years, byYear, seasonality };
  }, [group]);

  // Données graphique comparaison : une ligne par éditeur sur les années communes
  const allYears = agg.years;
  const comparisonData = allYears.map(y => {
    const point = { label: String(y) };
    group.forEach(e => { point[e.key] = Math.round(e.byYear[y]?.montant ?? 0); });
    return point;
  });

  // Données graphique saisonnalité agrégée
  const saisonnaliteData = agg.seasonality;

  const groupTotal = agg.total;
  const pctDuBudget = totalGlobal > 0 ? (groupTotal / totalGlobal) * 100 : 0;

  const CHART_TABS_GRP = [
    { id: 'comparaison', label: 'Comparaison' },
    { id: 'saisonnalite', label: 'Saisonnalité groupe' },
  ];

  return (
    <div className="flex flex-col gap-4 p-4 overflow-y-auto h-full">
      {/* En-tête groupe */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-violet-100 border border-violet-300 rounded-lg">
            <Layers size={13} className="text-violet-600" />
            <span className="text-xs font-bold text-violet-700">Groupe — {group.length} éditeurs</span>
          </div>
          <span className="text-xs text-gray-400">{fmt(groupTotal)} · {pctDuBudget.toFixed(1)} % du budget IT</span>
        </div>

        {/* Pills des éditeurs cochés */}
        <div className="flex flex-wrap gap-1.5">
          {group.map((e, i) => (
            <div key={e.key}
              className="flex items-center gap-1 text-[10px] font-medium rounded-full px-2 py-0.5 border"
              style={{
                backgroundColor: COLORS[i % COLORS.length] + '18',
                borderColor:     COLORS[i % COLORS.length] + '60',
                color:           COLORS[i % COLORS.length],
              }}>
              <span className="truncate max-w-[140px]" title={e.nom}>{e.nom}</span>
              <button onClick={() => onRemove(e.key)}
                className="opacity-60 hover:opacity-100 transition-opacity ml-0.5">
                <X size={9} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* KPIs agrégés */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <KPICard label="Total groupe" value={fmt(groupTotal)}
          sub={`${agg.orderCount} commandes`} icon={BarChart2} color="indigo" />
        <KPICard label="OPEX groupe" value={fmt(agg.opexMontant)}
          sub={groupTotal > 0 ? `${((agg.opexMontant / groupTotal) * 100).toFixed(0)} %` : '—'}
          icon={Tag} color="blue" />
        <KPICard label="CAPEX groupe" value={fmt(agg.capexMontant)}
          sub={groupTotal > 0 ? `${((agg.capexMontant / groupTotal) * 100).toFixed(0)} %` : '—'}
          icon={Layers} color="emerald" />
        <KPICard label="% du budget IT" value={`${pctDuBudget.toFixed(1)} %`}
          sub={`Sur ${agg.years.join(', ')}`}
          icon={AlertTriangle} color={pctDuBudget >= 30 ? 'red' : 'orange'}
          alert={pctDuBudget >= 30} />
      </div>

      {/* Tableau de comparaison côte à côte */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-4 py-2 bg-violet-50 border-b border-violet-100 text-xs font-semibold text-violet-700 flex items-center gap-1.5">
          <BarChart2 size={12} /> Comparaison éditeur par éditeur
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 border-b text-gray-500">
                <th className="text-left px-3 py-2">Éditeur</th>
                <th className="text-right px-3 py-2">Total</th>
                <th className="text-right px-3 py-2">OPEX</th>
                <th className="text-right px-3 py-2">CAPEX</th>
                <th className="text-right px-3 py-2">% du groupe</th>
                <th className="text-right px-3 py-2">CAGR</th>
                <th className="text-right px-3 py-2">Cmdes</th>
                <th className="px-3 py-2 w-20">Part</th>
              </tr>
            </thead>
            <tbody>
              {[...group].sort((a, b) => b.total - a.total).map((e, i) => {
                const pctGroupe = groupTotal > 0 ? (e.total / groupTotal) * 100 : 0;
                return (
                  <tr key={e.key} className="border-b hover:bg-gray-50 transition-colors">
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                        <span className="font-medium text-gray-800 truncate max-w-[160px]" title={e.nom}>
                          {e.nom}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right font-semibold text-indigo-700">{fmt(e.total)}</td>
                    <td className="px-3 py-2 text-right text-blue-600">{fmt(e.opexMontant)}</td>
                    <td className="px-3 py-2 text-right text-emerald-600">{fmt(e.capexMontant)}</td>
                    <td className="px-3 py-2 text-right text-gray-600">{pctGroupe.toFixed(1)} %</td>
                    <td className={`px-3 py-2 text-right font-medium
                      ${e.cagr === null ? 'text-gray-400'
                      : e.cagr > 0.15 ? 'text-red-600'
                      : e.cagr > 0.05 ? 'text-orange-500'
                      : e.cagr < -0.05 ? 'text-green-600' : 'text-gray-500'}`}>
                      {e.cagr !== null ? fmtSign(e.cagr) : '—'}
                    </td>
                    <td className="px-3 py-2 text-right text-gray-500">{e.orderCount}</td>
                    <td className="px-3 py-2">
                      <div className="h-1.5 bg-gray-100 rounded-full">
                        <div className="h-1.5 rounded-full" style={{
                          width: `${Math.min(pctGroupe, 100)}%`,
                          backgroundColor: COLORS[i % COLORS.length],
                        }} />
                      </div>
                    </td>
                  </tr>
                );
              })}
              {/* Ligne total */}
              <tr className="bg-gray-50 font-bold text-xs border-t-2 border-gray-300">
                <td className="px-3 py-2 text-gray-700">TOTAL GROUPE</td>
                <td className="px-3 py-2 text-right text-indigo-700">{fmt(groupTotal)}</td>
                <td className="px-3 py-2 text-right text-blue-600">{fmt(agg.opexMontant)}</td>
                <td className="px-3 py-2 text-right text-emerald-600">{fmt(agg.capexMontant)}</td>
                <td className="px-3 py-2 text-right text-gray-600">100 %</td>
                <td className="px-3 py-2 text-right text-gray-400">—</td>
                <td className="px-3 py-2 text-right text-gray-500">{agg.orderCount}</td>
                <td />
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Graphiques */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <div className="flex gap-1 mb-3 border-b border-gray-100 pb-2">
          {CHART_TABS_GRP.map(t => (
            <button key={t.id} onClick={() => setActiveChart(t.id)}
              className={`text-xs px-3 py-1 rounded transition-colors
                ${activeChart === t.id ? 'bg-violet-100 text-violet-700 font-medium' : 'text-gray-500 hover:bg-gray-100'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {activeChart === 'comparaison' && (
          <div>
            <p className="text-[10px] text-gray-400 mb-2 italic">Évolution annuelle — une courbe par éditeur</p>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={comparisonData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
                <Tooltip content={<ChartTooltip />} />
                <Legend wrapperStyle={{ fontSize: 10 }} formatter={(v) => {
                  const e = group.find(ed => ed.key === v);
                  return e ? (e.nom.length > 20 ? e.nom.slice(0, 19) + '…' : e.nom) : v;
                }} />
                {group.map((e, i) => (
                  <Line key={e.key} dataKey={e.key}
                    name={e.key}
                    stroke={COLORS[i % COLORS.length]}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    connectNulls
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {activeChart === 'saisonnalite' && (
          <div>
            <p className="text-[10px] text-gray-400 mb-2 italic">Saisonnalité agrégée de tous les éditeurs du groupe</p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={saisonnaliteData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="montant" name="Total" fill="#7c3aed" opacity={0.75} radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Drill individuel */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3 border-b border-gray-100 pb-2">
          <span className="text-xs font-semibold text-gray-600">Drill détaillé — éditeur :</span>
          <div className="flex flex-wrap gap-1">
            {group.map((e, i) => (
              <button key={e.key}
                onClick={() => setDrillEditeur(e)}
                className={`text-[10px] px-2 py-0.5 rounded-full border font-medium transition-colors
                  ${drillEditeur?.key === e.key
                    ? 'text-white border-transparent'
                    : 'bg-white hover:opacity-80'}`}
                style={drillEditeur?.key === e.key
                  ? { backgroundColor: COLORS[i % COLORS.length], borderColor: COLORS[i % COLORS.length] }
                  : { borderColor: COLORS[i % COLORS.length] + '80', color: COLORS[i % COLORS.length] }}>
                {e.nom.length > 22 ? e.nom.slice(0, 21) + '…' : e.nom}
              </button>
            ))}
          </div>
        </div>
        {drillEditeur && <DrillTabsGroup editeur={drillEditeur} />}
      </div>
    </div>
  );
};

// ── Composant principal ───────────────────────────────────────────────────────

export default function AnalyseEditeurs({ suppliers = [], opexOrders = [], projects = [], capexOrders = [] }) {
  const { editeurs, totalGlobal, years } = useEditeurData(suppliers, opexOrders, projects, capexOrders);

  const [selectedEditeur, setSelectedEditeur] = useState(null);
  const [checkedKeys, setCheckedKeys]         = useState(new Set());
  const [showGlobal, setShowGlobal]           = useState(false);
  const [selectedYear, setSelectedYear]       = useState(null);

  const hasData    = editeurs.length > 0;
  const groupMode  = checkedKeys.size >= 1;

  // Éditeurs et total filtrés par année sélectionnée
  const { displayEditeurs, displayTotalGlobal } = useMemo(() => {
    if (!selectedYear) return { displayEditeurs: editeurs, displayTotalGlobal: totalGlobal };
    const filtered = editeurs
      .filter(e => e.byYear?.[selectedYear]?.montant > 0)
      .map(e => ({
        ...e,
        total:        e.byYear[selectedYear].montant,
        opexMontant:  e.byYear[selectedYear].opex  || 0,
        capexMontant: e.byYear[selectedYear].capex || 0,
      }))
      .sort((a, b) => b.total - a.total);
    const tot = filtered.reduce((s, e) => s + e.total, 0);
    let cumul = 0;
    filtered.forEach(e => {
      cumul += e.total;
      e.pctTotal   = tot > 0 ? (e.total / tot) * 100 : 0;
      e.cumulPct   = tot > 0 ? (cumul / tot) * 100 : 0;
      e.inPareto80 = e.cumulPct <= 80;
    });
    return { displayEditeurs: filtered, displayTotalGlobal: tot };
  }, [editeurs, totalGlobal, selectedYear]);

  // Groupe courant (éditeurs cochés, dans l'ordre du classement)
  const groupEditeurs = useMemo(() =>
    displayEditeurs.filter(e => checkedKeys.has(e.key)),
  [displayEditeurs, checkedKeys]);

  // Synchronise la sélection unitaire si les données changent (depuis editeurs original pour conserver toutes les données)
  const syncedEditeur = useMemo(() => {
    if (!selectedEditeur) return null;
    return editeurs.find(e => e.key === selectedEditeur.key) ?? null;
  }, [editeurs, selectedEditeur]);

  const handleToggleCheck = useCallback((key, checked) => {
    setCheckedKeys(prev => {
      const next = new Set(prev);
      if (checked) next.add(key); else next.delete(key);
      return next;
    });
  }, []);

  const handleClearChecks = useCallback(() => setCheckedKeys(new Set()), []);

  const handleRemoveFromGroup = useCallback((key) => {
    setCheckedKeys(prev => { const n = new Set(prev); n.delete(key); return n; });
  }, []);

  const handleSelectSingle = useCallback((e) => {
    setSelectedEditeur(e);
    setShowGlobal(false);
  }, []);

  return (
    <div className="flex flex-col" style={{ minHeight: 'calc(100vh - 160px)' }}>
      {/* En-tête */}
      <div className="p-4 border-b border-gray-200 bg-white flex-shrink-0">
        <div className="flex items-center gap-3 flex-wrap">
          <h2 className="text-base font-bold text-gray-800 flex items-center gap-2">
            <Building2 size={16} className="text-indigo-500" />
            Analyse détaillée par éditeur
          </h2>
          {hasData && (
            <button
              onClick={() => { setSelectedEditeur(null); setShowGlobal(p => !p); }}
              className={`text-xs px-2.5 py-1 rounded border transition-colors flex items-center gap-1
                ${showGlobal && !groupMode ? 'bg-indigo-100 border-indigo-300 text-indigo-700' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}
            >
              <BarChart2 size={10} /> Vue Pareto
            </button>
          )}
          {groupMode && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-violet-100 border border-violet-300 rounded-lg">
              <Layers size={11} className="text-violet-600" />
              <span className="text-xs font-semibold text-violet-700">
                Groupe : {checkedKeys.size} éditeur{checkedKeys.size > 1 ? 's' : ''}
              </span>
              <button onClick={handleClearChecks} className="text-violet-400 hover:text-violet-700 ml-1 transition-colors">
                <X size={10} />
              </button>
            </div>
          )}
          <div className="ml-auto flex items-center gap-2">
            {hasData && years.length > 0 && (
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wide mr-1">Année</span>
                <button
                  onClick={() => setSelectedYear(null)}
                  className={`px-2.5 py-1 text-xs rounded border transition-colors font-medium ${selectedYear === null ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}
                >
                  Toutes
                </button>
                {[...years].sort().map(y => (
                  <button key={y} onClick={() => setSelectedYear(selectedYear === y ? null : y)}
                    className={`px-2.5 py-1 text-xs rounded border transition-colors font-medium ${selectedYear === y ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}
                  >
                    {y}
                  </button>
                ))}
              </div>
            )}
            <NoticeAide />
          </div>
        </div>
      </div>

      {/* Corps */}
      {!hasData && (
        <div className="flex flex-col items-center justify-center flex-1 gap-4 text-gray-400 py-20">
          <Upload size={48} className="text-gray-200" />
          <div className="text-center">
            <p className="text-sm font-medium text-gray-500 mb-1">Aucune donnée chargée</p>
            <p className="text-xs text-gray-400 max-w-sm">
              Utilisez le bouton <strong className="text-gray-500">«&nbsp;Importer un fichier de commandes&nbsp;»</strong> en haut de l&apos;écran pour charger vos données.
              Toutes les vues seront alimentées automatiquement.
            </p>
          </div>
        </div>
      )}

      {hasData && showGlobal && !groupMode && !selectedEditeur && (
        <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 200px)' }}>
          <VueGlobale editeurs={displayEditeurs} totalGlobal={displayTotalGlobal} years={years} />
        </div>
      )}

      {hasData && (!showGlobal || groupMode || selectedEditeur) && (
        <div className="flex" style={{ height: 'calc(100vh - 240px)', minHeight: '400px' }}>
          {/* Panel gauche — liste */}
          <div className="w-64 flex-shrink-0 flex flex-col overflow-hidden">
            <ListeEditeurs
              editeurs={displayEditeurs}
              selected={groupMode ? null : syncedEditeur}
              onSelect={handleSelectSingle}
              totalGlobal={displayTotalGlobal}
              checkedKeys={checkedKeys}
              onToggleCheck={handleToggleCheck}
              onClearChecks={handleClearChecks}
            />
          </div>

          {/* Panel droit — groupe ou détail unitaire */}
          <div className="flex-1 overflow-hidden">
            {groupMode ? (
              <EditeurGroupDetail
                editeurs={groupEditeurs}
                totalGlobal={displayTotalGlobal}
                onRemove={handleRemoveFromGroup}
              />
            ) : (
              <EditeurDetail editeur={syncedEditeur} totalGlobal={displayTotalGlobal} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
