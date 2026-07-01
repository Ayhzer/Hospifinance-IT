/**
 * Banc d'essai du moteur de reclassement (« Simuler & appliquer »).
 * ---------------------------------------------------------------------------
 * Logique : on choisit une COMMANDE RÉELLE, on voit comment les 4 niveaux du
 * moteur la classent, et on peut SAISIR des règles (par niveau, pré-remplies
 * depuis la ligne) dans un BAC À SABLE — la simulation se recalcule en direct.
 * Les règles brouillon ne sont pas persistées tant qu'on ne clique pas sur
 * « Promouvoir au moteur » (qui les ajoute réellement via les onglets N1–N4).
 */

import { useState, useMemo } from 'react';
import { Play, CheckCircle, AlertCircle, Zap, Plus, Trash2, Upload, FlaskConical } from 'lucide-react';
import { lineMatchesRule, reclasserToutes, reclasserAvecCommandes, buildDesignationsByParent } from '../../utils/reclassementEngine';
import { listFamilles } from '../../constants/analytiqueConstants';
import { normalizeCompte } from '../../utils/compte';
import { listExercices, getOrderYear } from '../../utils/yearCalculations';

const SOURCE_LABELS = {
  referentiel: '📋 Référentiel (N1)', regle_multinature: '⚙️ Règle contextuelle (N2)',
  mots_cles: '🔑 Mots-clés (N3)', mapping_compte: '🗂️ Mapping compte (N4)', non_classe: '❓ Non classé',
};
const SOURCE_CLASS = {
  referentiel: 'bg-green-50 text-green-700 border-green-200', regle_multinature: 'bg-blue-50 text-blue-700 border-blue-200',
  mots_cles: 'bg-yellow-50 text-yellow-700 border-yellow-200', mapping_compte: 'bg-gray-50 text-gray-600 border-gray-200',
  non_classe: 'bg-red-50 text-red-700 border-red-200',
};
const SOURCE_BY_LEVEL = { referentiel: 'referentiel', multinature: 'regle_multinature', moscles: 'mots_cles', mapping: 'mapping_compte' };

const EMPTY_SANDBOX = { referentielFournisseurs: [], reglesMultiNature: [], reglesMosCles: [], mappingComptes: [] };

const sousCatsFor = (famille, nomenclature) => {
  const raw = (nomenclature || []).find(n => n.famille === famille)?.sousCategoriesDisponibles || [];
  return raw.map(s => (typeof s === 'string' ? s : s.label));
};

const byPrio = (arr) => [...(arr || [])].sort((a, b) => (a.priority ?? 999) - (b.priority ?? 999));

/** Évalue chaque niveau pour une ligne ; retient la 1re correspondance parmi les niveaux activés. */
const buildTrace = (ligne, enabled, mtr) => {
  const levels = [
    { id: 'referentiel', label: 'N1 · Référentiel fournisseurs', rules: mtr.referentielFournisseurs || [], fam: r => r.famille,       sc: r => r.sousCategorie, name: r => r.nom },
    { id: 'multinature', label: 'N2 · Règles contextuelles',     rules: byPrio(mtr.reglesMultiNature),       fam: r => r.famille,       sc: r => r.sousCategorie, name: r => r.label },
    { id: 'moscles',     label: 'N3 · Mots-clés',                rules: byPrio(mtr.reglesMosCles),           fam: r => r.famille,       sc: r => r.sousCategorie, name: r => r.label },
    { id: 'mapping',     label: 'N4 · Mapping comptes',          rules: mtr.mappingComptes || [],            fam: r => r.familleDefaut, sc: () => '',             name: r => r.compte },
  ];
  let winner = null;
  const rows = levels.map(lv => {
    const match = lv.rules.find(r => lineMatchesRule(ligne, lv.id, r));
    const on = enabled[lv.id] !== false;
    const isWinner = on && !winner && !!match;
    if (isWinner) winner = { id: lv.id, famille: lv.fam(match), sousCategorie: lv.sc(match) };
    return {
      id: lv.id, label: lv.label, enabled: on, isWinner,
      match: match ? { famille: lv.fam(match), sousCategorie: lv.sc(match), name: lv.name(match), draft: !!match._draft } : null,
    };
  });
  return { rows, winner };
};

const classify = (ligne, mtr) => {
  const { winner } = buildTrace(ligne, { referentiel: true, multinature: true, moscles: true, mapping: true }, mtr);
  return winner ? { famille: winner.famille, source: SOURCE_BY_LEVEL[winner.id] } : { famille: 'Non classé', source: 'non_classe' };
};

// Sélecteur famille + sous-catégorie réutilisé par les encarts d'ajout.
const FamilleSousCat = ({ famille, sousCategorie, onFamille, onSousCat, nomenclature }) => {
  const familles = listFamilles(nomenclature);
  return (
    <div className="grid grid-cols-2 gap-2">
      <select value={famille || familles[0]} onChange={e => { onFamille(e.target.value); onSousCat(''); }}
        className="text-xs border border-gray-300 rounded px-2 py-1.5 bg-white">
        {familles.map(f => <option key={f} value={f}>{f}</option>)}
      </select>
      <select value={sousCategorie} onChange={e => onSousCat(e.target.value)}
        className="text-xs border border-gray-300 rounded px-2 py-1.5 bg-white">
        <option value="">— Sous-catégorie : aucune —</option>
        {sousCatsFor(famille || familles[0], nomenclature).map(s => <option key={s} value={s}>{s}</option>)}
      </select>
    </div>
  );
};

export default function PreviewReclassement({
  moteur, suppliers = [], orders = [], nomenclature = [], projects = [],
  onApply, onApplyCapex,
  onAddFournisseur, onAddRegleMultiNature, onAddRegleMosCles, onUpdateMappingCompte,
}) {
  const [ligne, setLigne] = useState({ fournisseur: '', designation: '', compteOrdonnateur: '' });
  const [enabledLevels, setEnabledLevels] = useState({ referentiel: true, multinature: true, moscles: true, mapping: true });
  const [sandbox, setSandbox] = useState(EMPTY_SANDBOX);
  const [showApplyConfirm, setShowApplyConfirm] = useState(false);
  const [showApplyCapexConfirm, setShowApplyCapexConfirm] = useState(false);
  const [applied, setApplied] = useState(false);
  const [appliedCapex, setAppliedCapex] = useState(false);
  const [anneeFiltre, setAnneeFiltre] = useState('all'); // exercice des commandes proposées

  // Exercices disponibles dans les commandes (les plus récents d'abord)
  const exercices = useMemo(() => listExercices(orders), [orders]);

  // Cas réels sélectionnables (commandes en priorité, sinon fournisseurs),
  // filtrés sur l'exercice choisi le cas échéant.
  const cases = useMemo(() => {
    const src = orders.length ? orders : suppliers;
    const filtered = orders.length && anneeFiltre !== 'all'
      ? src.filter(o => getOrderYear(o) === anneeFiltre)
      : src;
    return filtered.slice(0, 1000).map((o, i) => {
      const fournisseur = o.fournisseur || o.supplier || o.nom || '';
      const designation = o.designation || o.description || '';
      const compteOrdonnateur = o.compteOrdonnateur || '';
      const ref = o.reference || o.numeroMarche || '';
      const annee = getOrderYear(o);
      const label = [annee, fournisseur, designation || ref, compteOrdonnateur].filter(Boolean).join(' · ') || `Ligne ${i + 1}`;
      return { fournisseur, designation, compteOrdonnateur, label };
    });
  }, [orders, suppliers, anneeFiltre]);

  // Moteur effectif = moteur réel + brouillon (bac à sable).
  const effectiveMoteur = useMemo(() => {
    const mapById = new Map();
    (moteur.mappingComptes || []).forEach(m => mapById.set(normalizeCompte(m.compte), m));
    sandbox.mappingComptes.forEach(m => mapById.set(normalizeCompte(m.compte), m));
    return {
      ...moteur,
      referentielFournisseurs: [...(moteur.referentielFournisseurs || []), ...sandbox.referentielFournisseurs],
      reglesMultiNature: [...(moteur.reglesMultiNature || []), ...sandbox.reglesMultiNature],
      reglesMosCles: [...(moteur.reglesMosCles || []), ...sandbox.reglesMosCles],
      mappingComptes: [...mapById.values()],
      nomenclature,
    };
  }, [moteur, sandbox, nomenclature]);

  const hasLigne = ligne.fournisseur || ligne.designation || ligne.compteOrdonnateur;
  const sim = useMemo(() => buildTrace(ligne, enabledLevels, effectiveMoteur), [ligne, enabledLevels, effectiveMoteur]);
  const result = sim.winner
    ? { famille: sim.winner.famille, sousCategorie: sim.winner.sousCategorie, source: SOURCE_BY_LEVEL[sim.winner.id] }
    : { famille: 'Non classé', sousCategorie: '', source: 'non_classe' };

  const draftCount = sandbox.referentielFournisseurs.length + sandbox.reglesMultiNature.length + sandbox.reglesMosCles.length + sandbox.mappingComptes.length;

  // Statistiques (sur le moteur effectif → inclut le brouillon).
  const buildStats = (items, toLigne) => {
    if (!items.length) return null;
    const bySource = {}; const byFamille = {};
    items.forEach(it => {
      const rc = classify(toLigne(it), effectiveMoteur);
      bySource[rc.source] = (bySource[rc.source] || 0) + 1;
      byFamille[rc.famille] = (byFamille[rc.famille] || 0) + 1;
    });
    return { total: items.length, bySource, byFamille };
  };
  const designationsBySupplier = useMemo(() => buildDesignationsByParent(orders), [orders]);
  const stats = useMemo(() => buildStats(suppliers, s => ({ fournisseur: s.supplier || s.nom || '', designation: designationsBySupplier[String(s.id)] || '', compteOrdonnateur: s.compteOrdonnateur })), [suppliers, designationsBySupplier, effectiveMoteur]); // eslint-disable-line react-hooks/exhaustive-deps
  const statsCapex = useMemo(() => buildStats(projects, p => ({ fournisseur: p.fournisseur || p.project || '', designation: '', compteOrdonnateur: p.compteOrdonnateur })), [projects, effectiveMoteur]); // eslint-disable-line react-hooks/exhaustive-deps

  const pickCase = (idx) => {
    const c = cases[idx];
    if (c) setLigne({ fournisseur: c.fournisseur, designation: c.designation, compteOrdonnateur: c.compteOrdonnateur });
  };
  const toggleLevel = (id) => setEnabledLevels(prev => ({ ...prev, [id]: !prev[id] }));

  // Suggestion de mot-clé depuis la désignation.
  const suggestKeyword = () => {
    const words = (ligne.designation || '').split(/\s+/).filter(w => w.length > 3);
    return words[0] || ligne.designation || '';
  };

  const addDraft = (key, entry) => setSandbox(prev => ({ ...prev, [key]: [...prev[key], { ...entry, _draft: true, id: `draft-${Date.now()}-${Math.random().toString(36).slice(2, 6)}` }] }));
  const removeDraft = (key, id) => setSandbox(prev => ({ ...prev, [key]: prev[key].filter(r => r.id !== id && r.compte !== id) }));

  const promote = async () => {
    for (const r of sandbox.referentielFournisseurs) await onAddFournisseur?.({ nom: r.nom, famille: r.famille, sousCategorie: r.sousCategorie });
    for (const r of sandbox.reglesMultiNature) await onAddRegleMultiNature?.({ label: r.label, conditions: r.conditions, famille: r.famille, sousCategorie: r.sousCategorie });
    for (const r of sandbox.reglesMosCles) await onAddRegleMosCles?.({ label: r.label, motsCles: r.motsCles, famille: r.famille, sousCategorie: r.sousCategorie });
    for (const r of sandbox.mappingComptes) await onUpdateMappingCompte?.(r.compte, r.familleDefaut, r.libelleCompte);
    setSandbox(EMPTY_SANDBOX);
  };

  const handleApply = async () => { await onApply(reclasserAvecCommandes(suppliers, orders, effectiveMoteur)); setApplied(true); setShowApplyConfirm(false); };
  const handleApplyCapex = async () => { await onApplyCapex(reclasserToutes(projects.map(p => ({ ...p, supplier: p.fournisseur || p.project })), effectiveMoteur)); setAppliedCapex(true); setShowApplyCapexConfirm(false); };

  return (
    <div className="space-y-6">
      {/* 1. Sélection de la ligne */}
      <div className="bg-gray-50 border rounded-lg p-4 space-y-3">
        <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2"><Play size={14} /> Tester sur une commande réelle</h3>
        {(cases.length > 0 || exercices.length > 0) && (
          <div className="flex flex-col sm:flex-row gap-3">
            {exercices.length > 0 && (
              <div className="sm:w-44 shrink-0">
                <label className="block text-xs font-medium text-gray-700 mb-1">Exercice</label>
                <select value={anneeFiltre} onChange={e => setAnneeFiltre(e.target.value)}
                  className="w-full text-xs border border-gray-300 rounded px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500">
                  <option value="all">Toutes les années</option>
                  {exercices.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            )}
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Choisir une commande
                {orders.length > 0 && (
                  <span className="ml-1 font-normal text-gray-400">
                    ({cases.length}{anneeFiltre !== 'all' ? ` en ${anneeFiltre}` : ''})
                  </span>
                )}
              </label>
              <select defaultValue="" onChange={e => pickCase(Number(e.target.value))}
                className="w-full text-xs border border-gray-300 rounded px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500">
                <option value="" disabled>— Sélectionner une commande / un fournisseur réel… —</option>
                {cases.map((c, i) => <option key={i} value={i}>{c.label}</option>)}
              </select>
            </div>
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[['fournisseur', 'Fournisseur', 'Ex: SOPHOS LIMITED'], ['designation', 'Désignation', 'Ex: Licence antivirus'], ['compteOrdonnateur', 'Compte ordonnateur', 'Ex: H65100000']].map(([k, lab, ph]) => (
            <div key={k}>
              <label className="block text-xs font-medium text-gray-700 mb-1">{lab}</label>
              <input type="text" placeholder={ph} value={ligne[k]}
                onChange={e => setLigne(l => ({ ...l, [k]: e.target.value }))}
                className="w-full text-xs border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500" />
            </div>
          ))}
        </div>

        {/* Niveaux activés */}
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs font-medium text-gray-600">Niveaux à simuler :</span>
          {[['referentiel', 'N1'], ['multinature', 'N2'], ['moscles', 'N3'], ['mapping', 'N4']].map(([id, short]) => (
            <label key={id} className="flex items-center gap-1 text-xs text-gray-700 cursor-pointer">
              <input type="checkbox" checked={enabledLevels[id]} onChange={() => toggleLevel(id)} /> {short}
            </label>
          ))}
        </div>

        {/* 2. Résultat + trace */}
        {hasLigne && (
          <>
            <div className={`border rounded-lg p-3 flex items-center gap-4 ${SOURCE_CLASS[result.source]}`}>
              {result.source === 'non_classe' ? <AlertCircle size={16} /> : <CheckCircle size={16} />}
              <div>
                <div className="text-sm font-semibold">{result.famille}</div>
                {result.sousCategorie && <div className="text-xs opacity-80">{result.sousCategorie}</div>}
                <div className="text-xs mt-0.5 opacity-70">{SOURCE_LABELS[result.source] || result.source}</div>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-gray-600">Détail par niveau (la 1re correspondance activée est retenue) :</p>
              {sim.rows.map(t => (
                <div key={t.id} className={`flex items-center gap-3 text-xs px-3 py-1.5 rounded border ${
                  !t.enabled ? 'bg-white border-gray-100 text-gray-300'
                  : t.isWinner ? 'bg-green-50 border-green-300 text-green-800'
                  : t.match ? 'bg-gray-50 border-gray-200 text-gray-600' : 'bg-white border-gray-100 text-gray-400'}`}>
                  <label className="flex items-center gap-2 w-52 shrink-0 cursor-pointer">
                    <input type="checkbox" checked={t.enabled} onChange={() => toggleLevel(t.id)} />
                    <span className="font-medium">{t.label}</span>
                  </label>
                  {t.match ? (
                    <span className={`flex-1 min-w-0 truncate ${!t.enabled ? 'line-through' : ''}`}>
                      {t.isWinner && <span className="font-bold mr-1">→ retenu :</span>}
                      {t.match.draft && <span className="mr-1 px-1 rounded bg-amber-100 text-amber-700 border border-amber-200 not-italic">brouillon</span>}
                      {t.match.famille}{t.match.sousCategorie ? ` › ${t.match.sousCategorie}` : ''}
                      {t.match.name ? <span className="opacity-60"> ({t.match.name})</span> : null}
                    </span>
                  ) : <span className="flex-1 italic">aucune correspondance</span>}
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* 3. Encarts d'ajout de règle (bac à sable) */}
      {hasLigne && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2"><FlaskConical size={14} /> Construire une règle (brouillon) à partir de cette ligne</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <DraftReferentiel ligne={ligne} nomenclature={nomenclature} onAdd={e => addDraft('referentielFournisseurs', e)} />
            <DraftMultiNature ligne={ligne} nomenclature={nomenclature} suggest={suggestKeyword} onAdd={e => addDraft('reglesMultiNature', e)} />
            <DraftMosCles ligne={ligne} nomenclature={nomenclature} suggest={suggestKeyword} onAdd={e => addDraft('reglesMosCles', e)} />
            <DraftMapping ligne={ligne} nomenclature={nomenclature} onAdd={e => addDraft('mappingComptes', e)} />
          </div>
        </div>
      )}

      {/* Bac à sable : liste + promotion */}
      {draftCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-2">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <span className="text-sm font-semibold text-amber-800">Brouillon — {draftCount} règle{draftCount > 1 ? 's' : ''} non promue{draftCount > 1 ? 's' : ''}</span>
            <div className="flex gap-2">
              <button onClick={() => setSandbox(EMPTY_SANDBOX)} className="px-3 py-1.5 bg-white border border-gray-300 text-gray-600 text-xs rounded-lg">Tout vider</button>
              <button onClick={promote} className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs rounded-lg font-medium">
                <Upload size={13} /> Promouvoir au moteur
              </button>
            </div>
          </div>
          <ul className="space-y-1 text-xs">
            {sandbox.referentielFournisseurs.map(r => <DraftRow key={r.id} label={`N1 · ${r.nom} → ${r.famille}${r.sousCategorie ? ' › ' + r.sousCategorie : ''}`} onRemove={() => removeDraft('referentielFournisseurs', r.id)} />)}
            {sandbox.reglesMultiNature.map(r => <DraftRow key={r.id} label={`N2 · ${r.label} [${r.conditions}] → ${r.famille}`} onRemove={() => removeDraft('reglesMultiNature', r.id)} />)}
            {sandbox.reglesMosCles.map(r => <DraftRow key={r.id} label={`N3 · ${(r.motsCles || []).join(', ')} → ${r.famille}`} onRemove={() => removeDraft('reglesMosCles', r.id)} />)}
            {sandbox.mappingComptes.map(r => <DraftRow key={r.compte} label={`N4 · ${r.compte} → ${r.familleDefaut}`} onRemove={() => removeDraft('mappingComptes', r.compte)} />)}
          </ul>
        </div>
      )}

      {/* 4. Statistiques + application */}
      {stats && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-800">Impact sur {stats.total} fournisseur{stats.total > 1 ? 's' : ''}{draftCount > 0 ? ' (brouillon inclus)' : ''}</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {Object.entries(stats.bySource).map(([src, cnt]) => (
              <div key={src} className={`border rounded-lg p-3 ${SOURCE_CLASS[src] || 'bg-gray-50 border-gray-200'}`}>
                <div className="text-xs font-medium">{SOURCE_LABELS[src] || src}</div>
                <div className="text-xl font-bold mt-1">{cnt}</div>
                <div className="text-xs opacity-70">{((cnt / stats.total) * 100).toFixed(0)}%</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {suppliers.length > 0 && (
        <div className="border-t pt-4">
          {draftCount > 0 && <p className="text-xs text-amber-700 mb-2">Astuce : « Promouvoir au moteur » pour rendre vos règles brouillon permanentes avant ou après application.</p>}
          {!showApplyConfirm ? (
            <button onClick={() => setShowApplyConfirm(true)} className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg font-medium">
              <Zap size={14} /> Appliquer le reclassement sur tous les fournisseurs
            </button>
          ) : (
            <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4 space-y-3">
              <p className="text-sm font-medium text-yellow-800">
                Met à jour la famille de {suppliers.length} fournisseur{suppliers.length > 1 ? 's' : ''}{draftCount > 0 ? `, en incluant ${draftCount} règle(s) brouillon` : ''}. Irréversible. Continuer ?
              </p>
              <div className="flex gap-3">
                <button onClick={handleApply} className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg font-medium">Confirmer</button>
                <button onClick={() => setShowApplyConfirm(false)} className="px-4 py-2 bg-white border border-gray-300 text-gray-600 text-sm rounded-lg">Annuler</button>
              </div>
            </div>
          )}
          {applied && <p className="text-sm text-green-700 mt-2 flex items-center gap-1"><CheckCircle size={14} /> Reclassement appliqué.</p>}
        </div>
      )}

      {suppliers.length === 0 && projects.length === 0 && (
        <div className="text-center py-8 text-gray-400 text-sm">Importez d'abord des commandes pour simuler et appliquer le reclassement.</div>
      )}

      {projects.length > 0 && onApplyCapex && (
        <div className="border-t-2 border-emerald-200 pt-4 mt-4">
          <h3 className="text-sm font-semibold text-emerald-700 mb-3 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> Reclassement CAPEX — {statsCapex ? statsCapex.total : 0} projet{statsCapex?.total > 1 ? 's' : ''}
          </h3>
          {!showApplyCapexConfirm ? (
            <button onClick={() => setShowApplyCapexConfirm(true)} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm rounded-lg font-medium">
              <Zap size={14} /> Appliquer sur tous les projets CAPEX
            </button>
          ) : (
            <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4 space-y-3">
              <p className="text-sm font-medium text-yellow-800">Met à jour la famille de {projects.length} projet{projects.length > 1 ? 's' : ''} CAPEX. Irréversible. Continuer ?</p>
              <div className="flex gap-3">
                <button onClick={handleApplyCapex} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm rounded-lg font-medium">Confirmer</button>
                <button onClick={() => setShowApplyCapexConfirm(false)} className="px-4 py-2 bg-white border border-gray-300 text-gray-600 text-sm rounded-lg">Annuler</button>
              </div>
            </div>
          )}
          {appliedCapex && <p className="text-sm text-emerald-700 mt-2 flex items-center gap-1"><CheckCircle size={14} /> Reclassement CAPEX appliqué.</p>}
        </div>
      )}
    </div>
  );
}

// ── Encarts d'ajout de règle (compacts, pré-remplis) ──────────────────────────

const DraftShell = ({ title, hint, children, onAdd, disabled }) => (
  <div className="border border-gray-200 rounded-lg p-3 bg-white space-y-2">
    <p className="text-xs font-semibold text-gray-700">{title}</p>
    {hint && <p className="text-[11px] text-gray-400">{hint}</p>}
    {children}
    <button onClick={onAdd} disabled={disabled}
      className="flex items-center gap-1 px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white text-xs rounded">
      <Plus size={12} /> Ajouter au brouillon
    </button>
  </div>
);

const DraftRow = ({ label, onRemove }) => (
  <li className="flex items-center justify-between gap-2 bg-white border border-amber-100 rounded px-2 py-1">
    <span className="truncate text-gray-700">{label}</span>
    <button onClick={onRemove} className="text-gray-400 hover:text-red-600 shrink-0"><Trash2 size={12} /></button>
  </li>
);

function DraftReferentiel({ ligne, nomenclature, onAdd }) {
  const familles = listFamilles(nomenclature);
  const [nom, setNom] = useState('');
  const [famille, setFamille] = useState('');
  const [sc, setSc] = useState('');
  const eff = nom || ligne.fournisseur;
  return (
    <DraftShell title="N1 · Référentiel fournisseurs" hint="Classe par nom de fournisseur exact." onAdd={() => eff && onAdd({ nom: eff, famille: famille || familles[0], sousCategorie: sc })} disabled={!eff}>
      <input className="w-full text-xs border border-gray-300 rounded px-2 py-1.5" placeholder={ligne.fournisseur || 'Fournisseur'} value={nom} onChange={e => setNom(e.target.value)} />
      <FamilleSousCat famille={famille} sousCategorie={sc} onFamille={setFamille} onSousCat={setSc} nomenclature={nomenclature} />
    </DraftShell>
  );
}

function DraftMultiNature({ nomenclature, suggest, onAdd }) {
  const familles = listFamilles(nomenclature);
  const [champ, setChamp] = useState('DESIGNATION');
  const [valeur, setValeur] = useState('');
  const [famille, setFamille] = useState('');
  const [sc, setSc] = useState('');
  const eff = valeur || suggest();
  const conditions = `${champ} CONTIENT=${eff}`;
  return (
    <DraftShell title="N2 · Règle contextuelle" hint="Condition « contient » sur un champ." onAdd={() => eff && onAdd({ label: `Test: ${eff}`, conditions, famille: famille || familles[0], sousCategorie: sc })} disabled={!eff}>
      <div className="flex gap-2">
        <select value={champ} onChange={e => setChamp(e.target.value)} className="text-xs border border-gray-300 rounded px-2 py-1.5 bg-white">
          {['DESIGNATION', 'FOURNISSEUR', 'COMPTE'].map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <input className="flex-1 text-xs border border-gray-300 rounded px-2 py-1.5" placeholder={suggest() || 'valeur contient…'} value={valeur} onChange={e => setValeur(e.target.value)} />
      </div>
      <FamilleSousCat famille={famille} sousCategorie={sc} onFamille={setFamille} onSousCat={setSc} nomenclature={nomenclature} />
    </DraftShell>
  );
}

function DraftMosCles({ nomenclature, suggest, onAdd }) {
  const familles = listFamilles(nomenclature);
  const [mots, setMots] = useState('');
  const [famille, setFamille] = useState('');
  const [sc, setSc] = useState('');
  const eff = (mots || suggest()).split(',').map(m => m.trim()).filter(Boolean);
  return (
    <DraftShell title="N3 · Mots-clés" hint="Mot(s)-clé(s) recherché(s) dans la désignation ou le nom du fournisseur." onAdd={() => eff.length && onAdd({ label: `Test: ${eff.join(', ')}`, motsCles: eff, famille: famille || familles[0], sousCategorie: sc })} disabled={!eff.length}>
      <input className="w-full text-xs border border-gray-300 rounded px-2 py-1.5" placeholder={suggest() || 'antivirus, edr…'} value={mots} onChange={e => setMots(e.target.value)} />
      <FamilleSousCat famille={famille} sousCategorie={sc} onFamille={setFamille} onSousCat={setSc} nomenclature={nomenclature} />
    </DraftShell>
  );
}

function DraftMapping({ ligne, nomenclature, onAdd }) {
  const familles = listFamilles(nomenclature);
  const [compte, setCompte] = useState('');
  const [famille, setFamille] = useState('');
  const eff = normalizeCompte(compte || ligne.compteOrdonnateur);
  return (
    <DraftShell title="N4 · Mapping compte" hint="Famille par défaut d'un compte (fallback)." onAdd={() => eff && onAdd({ compte: eff, familleDefaut: famille || familles[0] })} disabled={!eff}>
      <input className="w-full text-xs border border-gray-300 rounded px-2 py-1.5 font-mono" placeholder={ligne.compteOrdonnateur || 'Compte'} value={compte} onChange={e => setCompte(e.target.value)} />
      <select value={famille || familles[0]} onChange={e => setFamille(e.target.value)} className="w-full text-xs border border-gray-300 rounded px-2 py-1.5 bg-white">
        {familles.map(f => <option key={f} value={f}>{f}</option>)}
      </select>
    </DraftShell>
  );
}
