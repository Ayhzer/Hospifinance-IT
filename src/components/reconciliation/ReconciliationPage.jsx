/**
 * ReconciliationPage — Rapprochement Commandes / Comptabilité
 * Charge un fichier de comptabilité_BI.xlsx et compare avec les données de commandes en mémoire.
 */

import { useState, useMemo, useCallback, useRef } from 'react';
import {
  Upload, FileCheck, AlertTriangle, CheckCircle, XCircle,
  Download, RefreshCw, Scale, TrendingDown, Info,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { useReconciliationData } from '../../hooks/useReconciliationData';
import { formatCurrency } from '../../utils/formatters';

// ── Helpers ───────────────────────────────────────────────────────────────────

const pct = (n) => `${(n * 100).toFixed(1)} %`;

const SEVERITE_STYLE = {
  OK:        { bg: 'bg-green-50',  border: 'border-green-200', text: 'text-green-700',  badge: 'bg-green-100 text-green-700' },
  ATTENTION: { bg: 'bg-amber-50',  border: 'border-amber-200', text: 'text-amber-700',  badge: 'bg-amber-100 text-amber-700' },
  CRITIQUE:  { bg: 'bg-red-50',    border: 'border-red-200',   text: 'text-red-700',    badge: 'bg-red-100 text-red-700' },
};

const KPI_SEUILS = {
  pct_hors_circuit: (v) => v < 0.05 ? 'OK' : v < 0.15 ? 'ATTENTION' : 'CRITIQUE',
  ecart_charge:     (v) => Math.abs(v) < 50_000 ? 'OK' : Math.abs(v) < 150_000 ? 'ATTENTION' : 'CRITIQUE',
  nb_critique:      (v) => v === 0 ? 'OK' : v <= 2 ? 'ATTENTION' : 'CRITIQUE',
};

const KpiCard = ({ title, value, sub, seuil, icon: Icon }) => {
  const s = SEVERITE_STYLE[seuil] || SEVERITE_STYLE.OK;
  return (
    <div className={`rounded-xl border p-4 ${s.bg} ${s.border}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{title}</span>
        <Icon size={16} className={s.text} />
      </div>
      <div className={`text-2xl font-bold ${s.text}`}>{value}</div>
      {sub && <div className="text-xs text-gray-500 mt-1">{sub}</div>}
    </div>
  );
};

const SeveriteBadge = ({ severite }) => {
  const s = SEVERITE_STYLE[severite] || SEVERITE_STYLE.OK;
  const labels = { OK: '✓ OK', ATTENTION: '⚠ Attention', CRITIQUE: '✕ Critique' };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${s.badge}`}>
      {labels[severite] ?? severite}
    </span>
  );
};

// ── Zone de dépôt ─────────────────────────────────────────────────────────────

const DropZone = ({ onFile, loading }) => {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);

  const handle = useCallback((file) => {
    if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xls'))) onFile(file);
  }, [onFile]);

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handle(e.dataTransfer.files[0]);
  };

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={onDrop}
      onClick={() => !loading && inputRef.current?.click()}
      className={`
        cursor-pointer border-2 border-dashed rounded-xl p-12 text-center transition-colors
        ${dragOver ? 'border-indigo-400 bg-indigo-50' : 'border-gray-300 bg-gray-50 hover:border-indigo-300 hover:bg-indigo-50'}
        ${loading ? 'opacity-60 cursor-not-allowed' : ''}
      `}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls"
        className="hidden"
        onChange={(e) => handle(e.target.files[0])}
      />
      {loading ? (
        <div className="flex flex-col items-center gap-3 text-indigo-600">
          <RefreshCw size={40} className="animate-spin" />
          <span className="text-sm font-medium">Chargement du fichier de comptabilité…</span>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 text-gray-400">
          <Upload size={40} />
          <div>
            <p className="text-sm font-medium text-gray-600">Déposer le fichier de comptabilité ici</p>
            <p className="text-xs text-gray-400 mt-1">ou cliquer pour parcourir — format Excel (.xlsx)</p>
            <p className="text-xs text-gray-400 mt-1">Onglet attendu : <code className="bg-gray-100 px-1 rounded">Export</code></p>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Composant principal ───────────────────────────────────────────────────────

export default function ReconciliationPage({ suppliers }) {
  const {
    sageRows, sageAnnee, loading, error, warnings,
    fileName, ecarts, rapportOd, kpis,
    handleSageFileUpload, reset,
  } = useReconciliationData(suppliers);

  const [filtreSeverite, setFiltreSeverite] = useState('TOUS');

  const ecartsFiltrés = useMemo(
    () => filtreSeverite === 'TOUS' ? ecarts : ecarts.filter(e => e.severite === filtreSeverite),
    [ecarts, filtreSeverite],
  );

  const exportExcel = useCallback(() => {
    const wb = XLSX.utils.book_new();

    const ws1 = XLSX.utils.json_to_sheet(ecarts.map(e => ({
      'Compte':              e.compte,
      'Libellé':             e.libelle,
      'Compta FF (€)':         Math.round(e.sage_ff),
      'Compta OD (€)':         Math.round(e.sage_od),
      'Compta NDF (€)':        Math.round(e.sage_ndf),
      'Commandes Mandaté (€)':   Math.round(e.magh2_mandate),
      'Commandes ENR (€)':       Math.round(e.magh2_enr),
      'Écart Mandaté (€)':   Math.round(e.ecart_mandate),
      'Écart Charge (€)':    Math.round(e.ecart_charge),
      'Écart %':             `${(e.ecart_charge_pct * 100).toFixed(1)}%`,
      'Catégorie':           e.categorie,
      'Sévérité':            e.severite,
      'Action recommandée':  e.action,
    })));
    XLSX.utils.book_append_sheet(wb, ws1, 'Écarts Commandes-Comptabilité');

    const ws2 = XLSX.utils.json_to_sheet(rapportOd.map(r => ({
      'Compte':          r.compte,
      'Libellé':         r.libelle_compte,
      'Type':            r.type_piece,
      'Montant (€)':     Math.round(r.montant_total),
      'Nb écritures':    r.nb_ecritures,
      'UF':              `${r.uf_code} — ${r.uf_libelle}`,
      'Motif probable':  r.motif_probable,
    })));
    XLSX.utils.book_append_sheet(wb, ws2, 'OD hors circuit');

    const dateStr = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `Rapprochement_Commandes_Comptabilite_${dateStr}.xlsx`);
  }, [ecarts, rapportOd]);

  // ── État vide ──────────────────────────────────────────────────────────────

  if (!sageRows.length && !loading) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Rapprochement Commandes / Comptabilité</h1>
          <p className="text-sm text-gray-500 mt-1">
            Comparez les données de commandes (chargées dans l'application) avec une export comptable.
          </p>
        </div>

        {error && (
          <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            <XCircle size={18} className="flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Scale size={18} className="text-indigo-600" />
            <h2 className="font-semibold text-gray-700">Charger le fichier de comptabilité</h2>
          </div>
          <DropZone onFile={handleSageFileUpload} loading={loading} />

          <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-lg flex items-start gap-2 text-xs text-blue-700">
            <Info size={14} className="flex-shrink-0 mt-0.5" />
            <span>
              Export comptable — filtre : <strong>Responsable = Informatique</strong>, Année = {new Date().getFullYear()}.
              Les données de commandes ({suppliers.filter(s => s.compteOrdonnateur).length} fournisseurs chargés) servent de référence.
            </span>
          </div>
        </div>
      </div>
    );
  }

  // ── Résultats ──────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Rapprochement Commandes / Comptabilité</h1>
          <div className="flex items-center gap-2 mt-1">
            <FileCheck size={14} className="text-green-600" />
            <span className="text-sm text-gray-500">{fileName} · Année {sageAnnee} · {sageRows.length} écritures</span>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={exportExcel}
            className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 text-gray-600 hover:text-indigo-700 text-sm font-medium rounded-lg transition-colors"
          >
            <Download size={15} />
            Exporter Excel
          </button>
          <button
            onClick={reset}
            className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 hover:border-gray-300 text-gray-500 hover:text-gray-700 text-sm font-medium rounded-lg transition-colors"
          >
            <RefreshCw size={15} />
            Changer de fichier
          </button>
        </div>
      </div>

      {/* Avertissements de parsing */}
      {warnings.length > 0 && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg space-y-1">
          {warnings.map((w, i) => (
            <div key={i} className="flex items-start gap-2 text-xs text-amber-700">
              <AlertTriangle size={13} className="flex-shrink-0 mt-0.5" />
              <span>{w}</span>
            </div>
          ))}
        </div>
      )}

      {/* KPIs gouvernance */}
      {kpis && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <KpiCard
            title="% hors circuit de commandes"
            value={pct(kpis.pct_hors_circuit)}
            sub={`OD ${formatCurrency(kpis.total_od)} + NDF ${formatCurrency(kpis.total_ndf)}`}
            seuil={KPI_SEUILS.pct_hors_circuit(kpis.pct_hors_circuit)}
            icon={Scale}
          />
          <KpiCard
            title="Écart charge total"
            value={formatCurrency(kpis.ecart_charge_total)}
            sub={`Commandes − Comptabilité (positif = Commandes supérieur)`}
            seuil={KPI_SEUILS.ecart_charge(kpis.ecart_charge_total)}
            icon={TrendingDown}
          />
          <KpiCard
            title="Comptes en alerte"
            value={`${kpis.nb_comptes_critique} critique${kpis.nb_comptes_critique !== 1 ? 's' : ''}, ${kpis.nb_comptes_attention} attention`}
            sub={`sur ${ecarts.length} comptes analysés`}
            seuil={KPI_SEUILS.nb_critique(kpis.nb_comptes_critique)}
            icon={AlertTriangle}
          />
        </div>
      )}

      {/* Tableau des écarts */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <h2 className="font-semibold text-gray-700">Écarts par compte</h2>
          <div className="flex gap-1">
            {['TOUS', 'CRITIQUE', 'ATTENTION', 'OK'].map((f) => (
              <button
                key={f}
                onClick={() => setFiltreSeverite(f)}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                  filtreSeverite === f
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                {f === 'TOUS'
                  ? `Tous (${ecarts.length})`
                  : `${f} (${ecarts.filter(e => e.severite === f).length})`}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-xs text-gray-500 uppercase tracking-wide">
                <th className="px-4 py-2 text-left">Compte</th>
                <th className="px-4 py-2 text-right">Compta FF</th>
                <th className="px-4 py-2 text-right">Compta OD</th>
                <th className="px-4 py-2 text-right">Commandes Mandaté</th>
                <th className="px-4 py-2 text-right">Écart Mandaté</th>
                <th className="px-4 py-2 text-right">Écart Charge</th>
                <th className="px-4 py-2 text-center">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {ecartsFiltrés.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-400 text-sm">
                    Aucun compte pour ce filtre
                  </td>
                </tr>
              ) : (
                ecartsFiltrés.map((e) => {
                  const s = SEVERITE_STYLE[e.severite] || SEVERITE_STYLE.OK;
                  return (
                    <tr
                      key={e.compte}
                      className={`${e.severite !== 'OK' ? s.bg : ''} hover:bg-gray-50 transition-colors`}
                      title={e.action}
                    >
                      <td className="px-4 py-2.5">
                        <div className="font-mono text-xs text-gray-500">{e.compte}</div>
                        <div className="text-xs text-gray-700 truncate max-w-[200px]">{e.libelle}</div>
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-xs text-gray-700">
                        {formatCurrency(e.sage_ff)}
                      </td>
                      <td className={`px-4 py-2.5 text-right font-mono text-xs ${e.sage_od > 10000 ? 'text-amber-700 font-semibold' : 'text-gray-500'}`}>
                        {e.sage_od > 0 ? formatCurrency(e.sage_od) : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-xs text-gray-700">
                        {formatCurrency(e.magh2_mandate)}
                      </td>
                      <td className={`px-4 py-2.5 text-right font-mono text-xs font-semibold ${
                        e.ecart_mandate < -10000 ? 'text-red-600' :
                        e.ecart_mandate > 10000  ? 'text-amber-600' : 'text-gray-500'
                      }`}>
                        {e.ecart_mandate >= 0 ? '+' : ''}{formatCurrency(e.ecart_mandate)}
                      </td>
                      <td className={`px-4 py-2.5 text-right font-mono text-xs font-semibold ${
                        Math.abs(e.ecart_charge) >= 30000 ? 'text-red-600' :
                        Math.abs(e.ecart_charge) >= 2000  ? 'text-amber-600' : 'text-green-600'
                      }`}>
                        {e.ecart_charge >= 0 ? '+' : ''}{formatCurrency(e.ecart_charge)}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <SeveriteBadge severite={e.severite} />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tableau OD hors circuit */}
      {rapportOd.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <div>
              <h2 className="font-semibold text-gray-700">Dépenses hors circuit de commandes (OD / NDF)</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                {formatCurrency(rapportOd.reduce((s, r) => s + r.montant_total, 0))} total
                · {rapportOd.length} lignes
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs text-gray-500 uppercase tracking-wide">
                  <th className="px-4 py-2 text-left">Compte</th>
                  <th className="px-4 py-2 text-center">Type</th>
                  <th className="px-4 py-2 text-right">Montant</th>
                  <th className="px-4 py-2 text-center">Écritures</th>
                  <th className="px-4 py-2 text-left">UF</th>
                  <th className="px-4 py-2 text-left">Motif probable</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {rapportOd.map((r, i) => (
                  <tr key={i} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-2.5">
                      <div className="font-mono text-xs text-gray-500">{r.compte}</div>
                      <div className="text-xs text-gray-700 truncate max-w-[180px]">{r.libelle_compte}</div>
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                        r.type_piece === 'NDF' ? 'bg-purple-100 text-purple-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {r.type_piece}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-xs font-semibold text-amber-700">
                      {formatCurrency(r.montant_total)}
                    </td>
                    <td className="px-4 py-2.5 text-center text-xs text-gray-500">
                      {r.nb_ecritures}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-gray-600">
                      <span className="font-mono">{r.uf_code}</span>
                      {r.uf_libelle && r.uf_libelle !== r.uf_code && (
                        <span className="text-gray-400"> · {r.uf_libelle}</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-gray-600 max-w-[260px]">
                      {r.motif_probable}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* État concordant vide */}
      {ecarts.length > 0 && ecarts.every(e => e.severite === 'OK') && (
        <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl text-green-700">
          <CheckCircle size={20} />
          <span className="text-sm font-medium">Tous les comptes sont concordants entre les commandes et la comptabilité.</span>
        </div>
      )}
    </div>
  );
}
