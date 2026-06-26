import { useState, useMemo } from 'react';
import { Users, Key, GitBranch, Map as MapIcon, PlayCircle, Loader2, BookOpen, Search, X, AlertTriangle, CheckCircle, Zap, ChevronRight, Lightbulb } from 'lucide-react';
import NoticeReclassement from './NoticeReclassement';
import ReferentielFournisseurs from './ReferentielFournisseurs';
import ReglesMultiNature from './ReglesMultiNature';
import ReglesMosCles from './ReglesMosCles';
import MappingComptes from './MappingComptes';
import PreviewReclassement from './PreviewReclassement';
import { reclasser } from '../../utils/reclassementEngine';
import { suggererClassement } from '../../utils/suggestionEngine';
import { FAMILLE_ANALYTIQUE } from '../../constants/analytiqueConstants';
import { formatCurrency } from '../../utils/formatters';

const FAMILLES_LIST = Object.values(FAMILLE_ANALYTIQUE);

// ── Moteur de recherche multi-niveaux ─────────────────────────────────────────

function SearchMoteur({ moteur }) {
  const [query, setQuery] = useState('');

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return null;

    const n1Matches = (moteur.referentielFournisseurs || []).filter(f => {
      const nom = String(f.nom || f.fournisseur || f.supplier || '').toLowerCase();
      return nom.includes(q);
    });

    const n2Matches = (moteur.reglesMultiNature || []).filter(r => {
      const cond = typeof r.conditions === 'string'
        ? r.conditions.toLowerCase()
        : Array.isArray(r.conditions)
          ? r.conditions.map(c => String(c.valeur || '')).join(' ').toLowerCase()
          : '';
      return cond.includes(q);
    });

    const n3Matches = (moteur.reglesMosCles || []).filter(r => {
      const mots = String(r.motsCles || r.motCle || '').toLowerCase();
      return mots.includes(q);
    });

    const n4Matches = (moteur.mappingComptes || []).filter(c => {
      const compte = String(c.compte || '').toLowerCase();
      const famille = String(c.famille || c.familleN1 || '').toLowerCase();
      return compte.includes(q) || famille.includes(q);
    });

    return { n1Matches, n2Matches, n3Matches, n4Matches };
  }, [query, moteur]);

  const hasResults = results && (
    results.n1Matches.length + results.n2Matches.length +
    results.n3Matches.length + results.n4Matches.length > 0
  );

  const Section = ({ level, label, color, items, renderItem }) => {
    if (!items || items.length === 0) return null;
    return (
      <div className={`border rounded-lg overflow-hidden ${color}`}>
        <div className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide flex items-center gap-1.5`}>
          <span className="w-4 h-4 rounded-full bg-current opacity-20 flex items-center justify-center text-[9px] font-black">{level}</span>
          {label} — {items.length} correspondance{items.length > 1 ? 's' : ''}
        </div>
        <div className="divide-y divide-current divide-opacity-10 bg-white">
          {items.slice(0, 8).map((item, i) => (
            <div key={i} className="px-3 py-1.5 text-xs text-gray-700">
              {renderItem(item)}
            </div>
          ))}
          {items.length > 8 && (
            <div className="px-3 py-1.5 text-[10px] text-gray-400 italic">
              +{items.length - 8} résultat{items.length - 8 > 1 ? 's' : ''} non affichés
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="border border-indigo-200 rounded-xl bg-indigo-50 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Search size={14} className="text-indigo-500 shrink-0" />
        <span className="text-xs font-semibold text-indigo-700">Recherche multi-niveaux</span>
        <span className="text-[10px] text-indigo-400">Cherchez un fournisseur, mot-clé ou compte dans les 4 niveaux simultanément</span>
      </div>
      <div className="relative">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Nom de fournisseur, mot-clé, compte ordonnateur…"
          className="w-full pl-9 pr-9 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
        />
        {query && (
          <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            <X size={13} />
          </button>
        )}
      </div>

      {query && !hasResults && (
        <p className="text-xs text-gray-400 italic">Aucune correspondance trouvée dans les 4 niveaux.</p>
      )}

      {results && hasResults && (
        <div className="space-y-2">
          <Section
            level="N1" label="Référentiel fournisseurs" color="text-green-700 bg-green-50 border-green-200"
            items={results.n1Matches}
            renderItem={f => (
              <div className="flex items-center justify-between">
                <span className="font-medium">{f.nom || f.fournisseur || f.supplier}</span>
                <span className="text-gray-500">{f.familleN1 || f.famille} {f.sousCatN2 || f.sousCategorie ? `/ ${f.sousCatN2 || f.sousCategorie}` : ''}</span>
              </div>
            )}
          />
          <Section
            level="N2" label="Règles contextuelles" color="text-blue-700 bg-blue-50 border-blue-200"
            items={results.n2Matches}
            renderItem={r => (
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] text-gray-500 truncate max-w-[260px]">
                  {typeof r.conditions === 'string' ? r.conditions : JSON.stringify(r.conditions).slice(0, 60)}
                </span>
                <span className="text-gray-600 shrink-0 ml-2">{r.familleN1 || r.famille} {r.sousCatN2 || r.sousCategorie ? `/ ${r.sousCatN2 || r.sousCategorie}` : ''}</span>
              </div>
            )}
          />
          <Section
            level="N3" label="Mots-clés" color="text-yellow-700 bg-yellow-50 border-yellow-200"
            items={results.n3Matches}
            renderItem={r => (
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-600">{r.motsCles || r.motCle}</span>
                <span className="text-gray-500">{r.familleN1 || r.famille} {r.sousCatN2 || r.sousCategorie ? `/ ${r.sousCatN2 || r.sousCategorie}` : ''}</span>
              </div>
            )}
          />
          <Section
            level="N4" label="Mapping comptes" color="text-gray-600 bg-gray-50 border-gray-200"
            items={results.n4Matches}
            renderItem={c => (
              <div className="flex items-center justify-between">
                <span className="font-mono">{c.compte}</span>
                <span className="text-gray-500">{c.familleN1 || c.famille} {c.sousCatN2 || c.sousCategorie ? `/ ${c.sousCatN2 || c.sousCategorie}` : ''}</span>
              </div>
            )}
          />
        </div>
      )}
    </div>
  );
}

// ── Panel Non classés ─────────────────────────────────────────────────────────

const NIVEAUX_CREATION = [
  { id: 'referentiel', short: 'N1', label: 'N1 · Référentiel fournisseur', desc: 'Correspondance exacte sur le nom du fournisseur' },
  { id: 'multinature', short: 'N2', label: 'N2 · Règle contextuelle',      desc: 'Condition « fournisseur contient »' },
  { id: 'moscles',     short: 'N3', label: 'N3 · Mot-clé',                 desc: 'Mot-clé sur la désignation des commandes' },
  { id: 'mapping',     short: 'N4', label: 'N4 · Compte ordonnateur',      desc: 'Famille par défaut du compte (fallback)' },
];

function NonClassesPanel({ moteur, suppliers, projects, opexOrders = [], capexOrders = [], nomenclature = [], onAddFournisseur, onAddRegleMultiNature, onAddRegleMosCles, onUpdateMappingCompte }) {
  const [selections, setSelections] = useState({});
  const [mapped, setMapped]         = useState(new Set());
  const [pending, setPending]       = useState(new Set());
  const [success, setSuccess]       = useState(new Set());
  const [expanded, setExpanded]     = useState(null);

  const nonClasses = useMemo(() => {
    if (!moteur?.referentielFournisseurs) return [];
    const grouped = new Map();

    const tryReclasser = (nom, designation, compte) => {
      try {
        return reclasser({ fournisseur: nom, supplier: nom, designation, compteOrdonnateur: compte }, moteur);
      } catch {
        return { famille: 'Non classé' };
      }
    };

    for (const sup of (suppliers || [])) {
      const nom = sup.supplier;
      if (!nom) continue;
      const result = tryReclasser(nom, nom, sup.compteOrdonnateur);
      if (result.famille !== 'Non classé') continue;
      if (!grouped.has(nom)) grouped.set(nom, { nom, compte: sup.compteOrdonnateur || '', charge: 0, type: 'OPEX', parentIds: [] });
      const g = grouped.get(nom);
      g.charge += (Number(sup.depenseActuelle) || 0) + (Number(sup.engagement) || 0);
      if (sup.id) g.parentIds.push(String(sup.id));
    }

    for (const p of (projects || [])) {
      const nom = p.fournisseur || p.project;
      if (!nom || nom === '—') continue;
      const result = tryReclasser(nom, nom, p.compteOrdonnateur);
      if (result.famille !== 'Non classé') continue;
      if (!grouped.has(nom)) grouped.set(nom, { nom, compte: p.compteOrdonnateur || '', charge: 0, type: 'CAPEX', parentIds: [] });
      const g = grouped.get(nom);
      g.charge += (Number(p.depense) || 0) + (Number(p.engagement) || 0);
      if (p.id) g.parentIds.push(String(p.id));
    }

    return [...grouped.values()]
      .filter(e => !mapped.has(e.nom))
      .sort((a, b) => b.charge - a.charge);
  }, [suppliers, projects, moteur, mapped]);

  // Commandes visibles pour le fournisseur déplié
  const expandedOrders = useMemo(() => {
    if (!expanded) return [];
    const entry = nonClasses.find(e => e.nom === expanded) || [...nonClasses, ...([...mapped].map(n => ({ nom: n, type: 'OPEX', parentIds: [] })))].find(e => e.nom === expanded);
    if (!entry) return [];
    const ids = new Set(entry.parentIds);
    const orders = entry.type === 'CAPEX'
      ? capexOrders.filter(o => ids.has(String(o.parentId)))
      : opexOrders.filter(o => ids.has(String(o.parentId)));
    return orders
      .map(o => ({
        libelle:  o.description || o.designation || o.libelle || '—',
        montant:  o.montant || 0,
        date:     o.dateCommande || o.datePassation || '',
        reference: o.reference || o.numeroMarche || '',
      }))
      .sort((a, b) => b.montant - a.montant);
  }, [expanded, nonClasses, opexOrders, capexOrders, mapped]);

  // Commandes par fournisseur (pour alimenter le moteur de suggestion)
  const ordersByNom = useMemo(() => {
    const map = new Map();
    for (const e of nonClasses) {
      const ids = new Set(e.parentIds);
      const src = e.type === 'CAPEX' ? capexOrders : opexOrders;
      map.set(e.nom, src.filter(o => ids.has(String(o.parentId))));
    }
    return map;
  }, [nonClasses, opexOrders, capexOrders]);

  // Suggestion automatique de classement par analyse des commandes (vote pondéré)
  const suggestions = useMemo(() => {
    const map = new Map();
    for (const e of nonClasses) {
      const sug = suggererClassement(e.nom, ordersByNom.get(e.nom) || [], moteur);
      if (sug) map.set(e.nom, sug);
    }
    return map;
  }, [nonClasses, ordersByNom, moteur]);

  // Comptes déjà présents dans le mapping (niveau 4 applicable uniquement sur ceux-ci)
  const mappedComptes = useMemo(
    () => new Set((moteur?.mappingComptes || []).map(m => String(m.compte))),
    [moteur?.mappingComptes]
  );

  const sousCatsPour = (famille) => {
    const raw = nomenclature.find(n => n.famille === famille)?.sousCategoriesDisponibles || [];
    return raw.map(s => (typeof s === 'string' ? s : s.label));
  };

  // Sélection par défaut : pré-remplie depuis la suggestion si disponible (niveau N1 = fournisseur entier)
  const defaultSelFor = (nom) => {
    const sug = suggestions.get(nom);
    if (sug) return { niveau: 'referentiel', famille: sug.famille, sousCategorie: sug.sousCategorie };
    return { niveau: 'moscles', famille: FAMILLES_LIST[0], sousCategorie: '' };
  };

  const getSel = (nom) => selections[nom] || defaultSelFor(nom);
  const setSel = (nom, patch) => setSelections(prev => ({ ...prev, [nom]: { ...getSel(nom), ...patch } }));
  const applySuggestion = (nom) => {
    const sug = suggestions.get(nom);
    if (sug) setSelections(prev => ({ ...prev, [nom]: { niveau: 'referentiel', famille: sug.famille, sousCategorie: sug.sousCategorie } }));
  };

  const handleMap = async (nom) => {
    const sel = getSel(nom);
    const entry = nonClasses.find(e => e.nom === nom);
    setPending(prev => new Set([...prev, nom]));
    try {
      switch (sel.niveau) {
        case 'referentiel':
          await onAddFournisseur({ nom: nom.trim(), famille: sel.famille, sousCategorie: sel.sousCategorie });
          break;
        case 'multinature':
          await onAddRegleMultiNature({
            label:         `Auto: ${nom}`,
            conditions:    `FOURNISSEUR CONTIENT=${nom.trim()}`,
            famille:       sel.famille,
            sousCategorie: sel.sousCategorie,
          });
          break;
        case 'mapping':
          // Le mapping ne stocke qu'une famille par défaut (pas de sous-catégorie)
          await onUpdateMappingCompte(entry?.compte, sel.famille);
          break;
        case 'moscles':
        default:
          await onAddRegleMosCles({
            label:         `Auto: ${nom}`,
            motsCles:      [nom.trim()],
            famille:       sel.famille,
            sousCategorie: sel.sousCategorie,
          });
      }
      // Affiche brièvement la coche verte avant de masquer la ligne
      setSuccess(prev => new Set([...prev, nom]));
      setTimeout(() => {
        setMapped(prev => new Set([...prev, nom]));
        setSuccess(prev => { const s = new Set(prev); s.delete(nom); return s; });
      }, 800);
    } catch {
      // En cas d'erreur : retire juste le pending, laisse la ligne visible
    } finally {
      setPending(prev => { const s = new Set(prev); s.delete(nom); return s; });
    }
  };

  const handleMapAll = async () => {
    for (const e of nonClasses) {
      await handleMap(e.nom);
    }
  };

  if (!nonClasses.length) {
    return (
      <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
        <CheckCircle size={18} />
        <span className="text-sm font-medium">Tous les fournisseurs sont classés dans une famille analytique.</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-gray-800 flex items-center gap-2">
            <AlertTriangle size={15} className="text-amber-500" />
            {nonClasses.length} fournisseur{nonClasses.length > 1 ? 's' : ''} non classé{nonClasses.length > 1 ? 's' : ''}
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Un classement est <strong>pré-proposé</strong> 💡 par analyse des commandes (vote pondéré). Ajustez si besoin le <strong>niveau</strong>, la <strong>famille</strong> et la <strong>sous-catégorie</strong>, puis cliquez sur <strong>Créer règle</strong>.
            {suggestions.size > 0 && <span className="text-emerald-600 font-medium"> · {suggestions.size} suggestion{suggestions.size > 1 ? 's' : ''} disponible{suggestions.size > 1 ? 's' : ''}.</span>}
          </p>
        </div>
        <button
          onClick={handleMapAll}
          className="flex items-center gap-2 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-medium rounded-lg transition-colors flex-shrink-0"
        >
          <Zap size={13} />
          Tout mapper avec les niveaux et familles sélectionnés
        </button>
      </div>

      <div className="rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-amber-50 text-xs text-gray-500 uppercase tracking-wide border-b border-amber-100">
              <th className="text-left px-4 py-2">Fournisseur</th>
              <th className="text-left px-3 py-2">Compte</th>
              <th className="text-right px-3 py-2">Charge</th>
              <th className="text-left px-3 py-2 w-44">Niveau de règle</th>
              <th className="text-left px-3 py-2 w-64">Famille / Sous-catégorie cible</th>
              <th className="px-3 py-2 w-28" />
            </tr>
          </thead>
          <tbody>
            {nonClasses.map(e => (
              <>
                <tr
                  key={e.nom}
                  className={`border-b border-gray-100 transition-colors cursor-pointer
                    ${expanded === e.nom ? 'bg-indigo-50' : 'hover:bg-amber-50/40'}`}
                >
                  {/* Fournisseur cliquable pour drill-down */}
                  <td
                    className="px-4 py-2.5 font-medium text-gray-800 max-w-[240px]"
                    onClick={() => setExpanded(p => p === e.nom ? null : e.nom)}
                  >
                    <div className="flex items-center gap-1.5" title={e.nom}>
                      <span className={`inline-block shrink-0 px-1 py-0.5 text-[9px] font-bold rounded ${e.type === 'CAPEX' ? 'bg-emerald-100 text-emerald-700' : 'bg-indigo-100 text-indigo-700'}`}>{e.type}</span>
                      <ChevronRight size={12} className={`shrink-0 text-gray-400 transition-transform ${expanded === e.nom ? 'rotate-90' : ''}`} />
                      <span className="truncate">{e.nom}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 font-mono text-xs text-gray-400">{e.compte || '—'}</td>
                  <td className="px-3 py-2.5 text-right text-xs font-semibold text-gray-600">
                    {formatCurrency(e.charge)}
                  </td>
                  {/* Niveau du pipeline auquel créer la règle */}
                  <td className="px-3 py-2.5" onClick={ev => ev.stopPropagation()}>
                    <select
                      value={getSel(e.nom).niveau}
                      onChange={ev => setSel(e.nom, { niveau: ev.target.value })}
                      title={NIVEAUX_CREATION.find(n => n.id === getSel(e.nom).niveau)?.desc}
                      className="w-full text-xs border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-amber-400 bg-white"
                    >
                      {NIVEAUX_CREATION.map(n => {
                        const disabled = n.id === 'mapping' && !mappedComptes.has(String(e.compte));
                        return (
                          <option key={n.id} value={n.id} disabled={disabled}>
                            {n.label}{disabled ? ' (compte non mappé)' : ''}
                          </option>
                        );
                      })}
                    </select>
                  </td>
                  {/* Famille + sous-catégorie cible */}
                  <td className="px-3 py-2.5 space-y-1" onClick={ev => ev.stopPropagation()}>
                    {(() => {
                      const sug = suggestions.get(e.nom);
                      if (!sug) return null;
                      const pct = Math.round(sug.confidence * 100);
                      const strong = sug.confidence >= 0.7 && sug.nClassees >= 2;
                      const sel = getSel(e.nom);
                      const applied = sel.famille === sug.famille && (sel.sousCategorie || '') === (sug.sousCategorie || '');
                      const tip = `Basé sur ${sug.nClassees}/${sug.nOrders} commande(s) classée(s) — ${sug.sources.map(s => `${s.n}× ${s.label}`).join(', ')}`
                        + (sug.alternative ? `\nAlternative : ${sug.alternative.famille} (${Math.round(sug.alternative.confidence * 100)} %)` : '');
                      return (
                        <button
                          type="button"
                          onClick={() => applySuggestion(e.nom)}
                          title={tip}
                          className={`w-full flex items-center gap-1 px-1.5 py-1 rounded text-[10px] font-medium border transition
                            ${strong ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-amber-50 border-amber-200 text-amber-700'}
                            ${applied ? 'ring-1 ring-current' : 'hover:brightness-95'}`}
                        >
                          <Lightbulb size={11} className="shrink-0" />
                          <span className="truncate">Suggéré : {sug.famille}{sug.sousCategorie ? ` › ${sug.sousCategorie}` : ''}</span>
                          <span className="ml-auto shrink-0 opacity-80">{pct}%{applied ? ' ✓' : ''}</span>
                        </button>
                      );
                    })()}
                    <select
                      value={getSel(e.nom).famille}
                      onChange={ev => setSel(e.nom, { famille: ev.target.value, sousCategorie: '' })}
                      className="w-full text-xs border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-amber-400 bg-white"
                    >
                      {FAMILLES_LIST.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                    {getSel(e.nom).niveau === 'mapping' ? (
                      <p className="text-[10px] text-gray-400 italic px-0.5">Sous-catégorie non gérée au niveau compte.</p>
                    ) : (
                      <select
                        value={getSel(e.nom).sousCategorie}
                        onChange={ev => setSel(e.nom, { sousCategorie: ev.target.value })}
                        className="w-full text-xs border border-gray-200 rounded px-2 py-1.5 text-gray-600 focus:outline-none focus:ring-1 focus:ring-amber-400 bg-white"
                      >
                        <option value="">— Sous-catégorie : aucune —</option>
                        {sousCatsPour(getSel(e.nom).famille).map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    {success.has(e.nom) ? (
                      <span className="flex items-center gap-1 px-2.5 py-1.5 bg-green-100 text-green-700 text-xs font-medium rounded-lg">
                        <CheckCircle size={11} /> Créée !
                      </span>
                    ) : (
                      <button
                        onClick={() => handleMap(e.nom)}
                        disabled={pending.has(e.nom)}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-medium rounded-lg transition-colors"
                      >
                        <Zap size={11} />
                        {pending.has(e.nom) ? '…' : 'Créer règle'}
                      </button>
                    )}
                  </td>
                </tr>

                {/* Drill-down : commandes du fournisseur */}
                {expanded === e.nom && (
                  <tr key={`${e.nom}-drill`} className="bg-indigo-50/60 border-b border-indigo-100">
                    <td colSpan={6} className="px-6 py-3">
                      {expandedOrders.length === 0 ? (
                        <p className="text-xs text-gray-400 italic">Aucune commande disponible pour ce fournisseur.</p>
                      ) : (
                        <div className="space-y-1">
                          <p className="text-[10px] text-indigo-600 font-semibold uppercase tracking-wide mb-2">
                            {expandedOrders.length} commande{expandedOrders.length > 1 ? 's' : ''} — libellés pour créer la règle
                          </p>
                          <div className="max-h-48 overflow-y-auto rounded border border-indigo-100 bg-white">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="text-[10px] text-gray-400 uppercase border-b border-gray-100 bg-gray-50">
                                  <th className="text-left px-3 py-1.5">Libellé / Désignation</th>
                                  <th className="text-left px-2 py-1.5 w-24">Référence</th>
                                  <th className="text-left px-2 py-1.5 w-24">Date</th>
                                  <th className="text-right px-3 py-1.5 w-28">Montant</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-50">
                                {expandedOrders.map((o, i) => (
                                  <tr key={i} className="hover:bg-indigo-50/30">
                                    <td className="px-3 py-1.5 text-gray-700 max-w-[320px]">
                                      <span className="block truncate" title={o.libelle}>{o.libelle}</span>
                                    </td>
                                    <td className="px-2 py-1.5 font-mono text-gray-400 text-[10px]">{o.reference || '—'}</td>
                                    <td className="px-2 py-1.5 text-gray-400">{o.date ? o.date.slice(0, 10) : '—'}</td>
                                    <td className="px-3 py-1.5 text-right font-semibold text-indigo-700">{formatCurrency(o.montant)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-gray-400 italic">
        Selon le niveau choisi, la règle est ajoutée au <strong>Référentiel fournisseurs</strong> (N1), aux <strong>Règles contextuelles</strong> (N2),
        aux <strong>Mots-clés</strong> (N3) ou met à jour la famille par défaut du <strong>Mapping comptes</strong> (N4).
        Vous pouvez ensuite l'affiner dans l'onglet correspondant.
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'nonclasses',   label: 'Non classés',               icon: AlertTriangle, desc: 'À mapper en priorité' },
  { id: 'referentiel',  label: 'Référentiel fournisseurs',  icon: Users,         desc: 'Niveau 1 — Prioritaire' },
  { id: 'multinature',  label: 'Règles contextuelles',      icon: GitBranch,     desc: 'Niveau 2' },
  { id: 'moscles',      label: 'Mots-clés',                 icon: Key,           desc: 'Niveau 3' },
  { id: 'mapping',      label: 'Mapping comptes',            icon: MapIcon,       desc: 'Niveau 4 — Fallback' },
  { id: 'preview',      label: 'Simuler & appliquer',        icon: PlayCircle,    desc: 'Test & application' },
];

export default function ReclassementPage({
  moteur,
  loading,
  error,
  suppliers,
  projects,
  opexOrders = [],
  capexOrders = [],
  onAddFournisseur,
  onUpdateFournisseur,
  onDeleteFournisseur,
  onAddRegleMultiNature,
  onUpdateRegleMultiNature,
  onDeleteRegleMultiNature,
  onReorderReglesMultiNature,
  onAddRegleMosCles,
  onUpdateRegleMosCles,
  onDeleteRegleMosCles,
  onReorderReglesMosCles,
  onUpdateMappingCompte,
  onApplyReclassement,
  onApplyReclassementCapex,
}) {
  const [activeTab, setActiveTab] = useState('nonclasses');
  const [showNotice, setShowNotice] = useState(false);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-gray-400">
        <Loader2 size={20} className="animate-spin mr-2" />
        Chargement du moteur de reclassement…
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">{error}</div>
    );
  }

  return (
    <>
    <div className="space-y-4">
      {/* En-tête */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-gray-800">Moteur de reclassement analytique</h2>
          <button
            onClick={() => setShowNotice(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors flex-shrink-0"
          >
            <BookOpen size={14} />
            Notice d&apos;utilisation
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Pipeline à 4 niveaux : Référentiel fournisseurs → Règles contextuelles → Mots-clés → Mapping compte ordonnateur.
          La première correspondance trouvée est utilisée.
        </p>
        <div className="flex flex-wrap gap-3 mt-3">
          <span className="text-xs bg-green-50 border border-green-200 text-green-700 px-2 py-1 rounded">
            📋 {moteur.referentielFournisseurs?.length || 0} fournisseur{(moteur.referentielFournisseurs?.length || 0) > 1 ? 's' : ''}
          </span>
          <span className="text-xs bg-blue-50 border border-blue-200 text-blue-700 px-2 py-1 rounded">
            ⚙️ {moteur.reglesMultiNature?.length || 0} règle{(moteur.reglesMultiNature?.length || 0) > 1 ? 's' : ''} contextuelles
          </span>
          <span className="text-xs bg-yellow-50 border border-yellow-200 text-yellow-700 px-2 py-1 rounded">
            🔑 {moteur.reglesMosCles?.length || 0} règle{(moteur.reglesMosCles?.length || 0) > 1 ? 's' : ''} mots-clés
          </span>
          <span className="text-xs bg-gray-50 border border-gray-200 text-gray-600 px-2 py-1 rounded">
            🗂️ {moteur.mappingComptes?.length || 0} compte{(moteur.mappingComptes?.length || 0) > 1 ? 's' : ''} mappés
          </span>
        </div>

        <SearchMoteur moteur={moteur} />
      </div>

      {/* Navigation secondaire */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex overflow-x-auto -mb-px">
            {TABS.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 sm:px-4 py-3 text-xs font-medium border-b-2 flex-shrink-0 whitespace-nowrap transition-colors ${
                    isActive ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon size={13} />
                  <span>{tab.label}</span>
                  <span className={`hidden sm:inline text-xs opacity-60 ${isActive ? 'text-blue-500' : 'text-gray-400'}`}>— {tab.desc}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Contenu */}
        <div className="p-4 sm:p-6">
          {activeTab === 'nonclasses' && (
            <NonClassesPanel
              moteur={moteur}
              suppliers={suppliers}
              projects={projects}
              opexOrders={opexOrders}
              capexOrders={capexOrders}
              nomenclature={moteur.nomenclature || []}
              onAddFournisseur={onAddFournisseur}
              onAddRegleMultiNature={onAddRegleMultiNature}
              onAddRegleMosCles={onAddRegleMosCles}
              onUpdateMappingCompte={onUpdateMappingCompte}
            />
          )}
          {activeTab === 'referentiel' && (
            <ReferentielFournisseurs
              referentiel={moteur.referentielFournisseurs || []}
              nomenclature={moteur.nomenclature || []}
              onAdd={onAddFournisseur}
              onUpdate={onUpdateFournisseur}
              onDelete={onDeleteFournisseur}
            />
          )}
          {activeTab === 'multinature' && (
            <ReglesMultiNature
              regles={moteur.reglesMultiNature || []}
              nomenclature={moteur.nomenclature || []}
              onAdd={onAddRegleMultiNature}
              onUpdate={onUpdateRegleMultiNature}
              onDelete={onDeleteRegleMultiNature}
              onReorder={onReorderReglesMultiNature}
            />
          )}
          {activeTab === 'moscles' && (
            <ReglesMosCles
              regles={moteur.reglesMosCles || []}
              nomenclature={moteur.nomenclature || []}
              onAdd={onAddRegleMosCles}
              onUpdate={onUpdateRegleMosCles}
              onDelete={onDeleteRegleMosCles}
              onReorder={onReorderReglesMosCles}
            />
          )}
          {activeTab === 'mapping' && (
            <MappingComptes
              mappingComptes={moteur.mappingComptes || []}
              onUpdate={onUpdateMappingCompte}
            />
          )}
          {activeTab === 'preview' && (
            <PreviewReclassement
              moteur={moteur}
              suppliers={suppliers}
              onApply={onApplyReclassement}
              projects={projects}
              onApplyCapex={onApplyReclassementCapex}
            />
          )}
        </div>
      </div>
    </div>

    {showNotice && <NoticeReclassement onClose={() => setShowNotice(false)} />}
    </>
  );
}
