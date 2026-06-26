import { useState } from 'react';
import { ChevronDown, ChevronRight, Table2 } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

const fmt = formatCurrency;

const pctBar = (val, max) => {
  if (!max) return 0;
  return Math.min(100, (val / max) * 100);
};

const EcartBadge = ({ proj, budget }) => {
  if (!budget || budget === 0) return <span className="text-gray-400 text-xs">—</span>;
  const ecart = proj - budget;
  const pct = (ecart / budget * 100).toFixed(1);
  const color = ecart > budget * 0.10 ? 'text-red-600 bg-red-50 border-red-200'
    : ecart > 0 ? 'text-amber-600 bg-amber-50 border-amber-200'
    : 'text-green-700 bg-green-50 border-green-200';
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold border ${color}`}>
      {ecart > 0 ? '+' : ''}{pct} %
    </span>
  );
};

export default function ProjectionByCompte({ result }) {
  const [expandedCompte, setExpandedCompte] = useState(null);

  if (!result) return null;
  const { parCompte, parFournisseur } = result;

  const sorted = [...parCompte].sort((a, b) => b.projectionTotale - a.projectionTotale);
  const maxProj = sorted[0]?.projectionTotale || 1;

  const toggle = (compte) => setExpandedCompte(prev => prev === compte ? null : compte);

  // Grouper les fournisseurs par compte
  const fosByCompte = new Map();
  for (const f of parFournisseur) {
    if (!fosByCompte.has(f.compte)) fosByCompte.set(f.compte, []);
    fosByCompte.get(f.compte).push(f);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Table2 size={15} className="text-indigo-600" />
        <h3 className="text-sm font-semibold text-gray-800">Détail par compte comptable</h3>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left py-2.5 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide w-8"></th>
              <th className="text-left py-2.5 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Compte</th>
              <th className="text-right py-2.5 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Réalisé YTD</th>
              <th className="text-right py-2.5 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">ENR net</th>
              <th className="text-right py-2.5 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Projection</th>
              <th className="text-right py-2.5 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">EPRD</th>
              <th className="text-right py-2.5 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Écart</th>
              <th className="py-2.5 px-4 w-32 text-xs font-semibold text-gray-500 uppercase tracking-wide">Répartition</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(row => {
              const isOpen = expandedCompte === row.compte;
              const fournisseurs = (fosByCompte.get(row.compte) || [])
                .sort((a, b) => b.projectionTotale - a.projectionTotale);

              return [
                <tr
                  key={row.compte}
                  onClick={() => toggle(row.compte)}
                  className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <td className="py-3 px-4">
                    {isOpen
                      ? <ChevronDown size={13} className="text-gray-400" />
                      : <ChevronRight size={13} className="text-gray-400" />}
                  </td>
                  <td className="py-3 px-4">
                    <div className="text-xs font-semibold text-gray-800">{row.compte}</div>
                    <div className="text-[11px] text-gray-500 truncate max-w-[180px]">{row.libelleCompte}</div>
                  </td>
                  <td className="py-3 px-4 text-right text-xs text-gray-600">{fmt(row.balanceRealisee)}</td>
                  <td className="py-3 px-4 text-right text-xs text-blue-600">{fmt(row.enrNet)}</td>
                  <td className="py-3 px-4 text-right text-sm font-semibold text-gray-800">{fmt(row.projectionTotale)}</td>
                  <td className="py-3 px-4 text-right text-xs text-gray-500">{row.budgetEPRD ? fmt(row.budgetEPRD) : '—'}</td>
                  <td className="py-3 px-4 text-right">
                    <EcartBadge proj={row.projectionTotale} budget={row.budgetEPRD} />
                  </td>
                  <td className="py-3 px-4">
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-500 rounded-full"
                        style={{ width: `${pctBar(row.projectionTotale, maxProj)}%` }}
                      />
                    </div>
                  </td>
                </tr>,

                isOpen && fournisseurs.length > 0 && (
                  <tr key={`${row.compte}-detail`}>
                    <td colSpan={8} className="bg-indigo-50/40 px-0 py-0">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-indigo-50 border-y border-indigo-100">
                            <th className="text-left py-1.5 px-8 text-[10px] font-semibold text-indigo-500 uppercase tracking-wide w-8"></th>
                            <th className="text-left py-1.5 px-4 text-[10px] font-semibold text-indigo-500 uppercase tracking-wide">Fournisseur</th>
                            <th className="text-right py-1.5 px-4 text-[10px] font-semibold text-indigo-500 uppercase tracking-wide">Réalisé YTD</th>
                            <th className="text-right py-1.5 px-4 text-[10px] font-semibold text-indigo-500 uppercase tracking-wide">ENR net</th>
                            <th className="text-right py-1.5 px-4 text-[10px] font-semibold text-indigo-500 uppercase tracking-wide">Projection</th>
                            <th className="text-center py-1.5 px-4 text-[10px] font-semibold text-indigo-500 uppercase tracking-wide">Algo</th>
                            <th className="text-center py-1.5 px-4 text-[10px] font-semibold text-indigo-500 uppercase tracking-wide">Pattern</th>
                            <th className="text-center py-1.5 px-4 text-[10px] font-semibold text-indigo-500 uppercase tracking-wide">Fiabilité</th>
                          </tr>
                        </thead>
                        <tbody>
                          {fournisseurs.map(f => (
                            <tr key={`${f.fournisseur}--${f.compte}`} className="border-b border-indigo-100 last:border-0 hover:bg-indigo-50/60">
                              <td className="py-2 px-8" />
                              <td className="py-2 px-4 font-medium text-gray-700 max-w-[200px] truncate">{f.fournisseur}</td>
                              <td className="py-2 px-4 text-right text-gray-600">{fmt(f.balanceRealisee)}</td>
                              <td className="py-2 px-4 text-right text-blue-600">{fmt(f.enrNet)}</td>
                              <td className="py-2 px-4 text-right font-semibold text-gray-800">{fmt(f.projectionTotale)}</td>
                              <td className="py-2 px-4 text-center">
                                <AlgoBadge algo={f.algo} />
                              </td>
                              <td className="py-2 px-4 text-center">
                                <PatternBadge pattern={f.pattern} />
                              </td>
                              <td className="py-2 px-4 text-center">
                                <FiabiliteBadge fiabilite={f.fiabilite} />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </td>
                  </tr>
                ),
              ];
            })}
          </tbody>
          <tfoot>
            <tr className="bg-indigo-600 text-white">
              <td colSpan={2} className="py-3 px-4 text-sm font-bold">TOTAL OPEX DSI</td>
              <td className="py-3 px-4 text-right text-sm font-semibold">
                {fmt(parCompte.reduce((s, r) => s + r.balanceRealisee, 0))}
              </td>
              <td className="py-3 px-4 text-right text-sm font-semibold">
                {fmt(parCompte.reduce((s, r) => s + r.enrNet, 0))}
              </td>
              <td className="py-3 px-4 text-right text-sm font-bold">
                {fmt(parCompte.reduce((s, r) => s + r.projectionTotale, 0))}
              </td>
              <td className="py-3 px-4 text-right text-sm font-semibold">
                {fmt(parCompte.reduce((s, r) => s + r.budgetEPRD, 0)) || '—'}
              </td>
              <td colSpan={2} />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

const ALGO_STYLE = {
  PROFIL_FOURNISSEUR: 'bg-green-100 text-green-700',
  PIC_CALENDRIER:     'bg-teal-100 text-teal-700',
  HYBRIDE_ADAPTATIF:  'bg-purple-100 text-purple-700',
  SAISONNIERE_GLOBALE:'bg-amber-100 text-amber-700',
  LINEAIRE:           'bg-gray-100 text-gray-600',
};
const ALGO_SHORT = {
  PROFIL_FOURNISSEUR: 'Profil',
  PIC_CALENDRIER:     'Pic cal.',
  SAISONNIERE_GLOBALE:'Saison.',
  LINEAIRE:           'Linéaire',
};
const AlgoBadge = ({ algo }) => (
  <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${ALGO_STYLE[algo] || 'bg-gray-100 text-gray-500'}`}>
    {ALGO_SHORT[algo] || algo}
  </span>
);

const PATTERN_STYLE = {
  PIC_UNIQUE:     'bg-red-100 text-red-700',
  TRIMESTRIEL:    'bg-blue-100 text-blue-700',
  PIC_FIN_ANNEE:  'bg-orange-100 text-orange-700',
  UNIFORME:       'bg-green-100 text-green-700',
  IRREGULIER:     'bg-gray-100 text-gray-600',
  PONCTUEL:       'bg-purple-100 text-purple-700',
  INCONNU:        'bg-gray-100 text-gray-400',
};
const PatternBadge = ({ pattern }) => (
  <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${PATTERN_STYLE[pattern] || 'bg-gray-100 text-gray-500'}`}>
    {pattern?.replace('_', ' ') || '—'}
  </span>
);

const FIAB_STYLE = {
  HAUTE:   'bg-green-100 text-green-700',
  MOYENNE: 'bg-amber-100 text-amber-700',
  FAIBLE:  'bg-red-100 text-red-700',
};
const FiabiliteBadge = ({ fiabilite }) => (
  <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${FIAB_STYLE[fiabilite] || 'bg-gray-100 text-gray-400'}`}>
    {fiabilite || '—'}
  </span>
);
