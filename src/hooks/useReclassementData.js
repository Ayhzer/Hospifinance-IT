import { useState, useEffect, useCallback, useRef } from 'react';
import { DEFAULT_NOMENCLATURE, HORS_PERIMETRE_LABEL } from '../constants/analytiqueConstants';
import { normalizeCompte } from '../utils/compte';

const STORAGE_KEY = 'hospifinance_reclassement';

const EMPTY_MOTEUR = {
  nomenclature: DEFAULT_NOMENCLATURE,
  referentielFournisseurs: [],
  reglesMultiNature: [],
  reglesMosCles: [],
  mappingComptes: [],
};

const genId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

/** Convertit un tableau de conditions [{champ,operateur,valeur}] en chaîne pipe-séparée */
const condArrayToStr = (conds) => {
  if (!conds) return '';
  if (typeof conds === 'string') return conds;
  if (!Array.isArray(conds)) return '';
  return conds.map(c => {
    if (c.champ === 'DEFAUT') return 'DEFAUT';
    if (c.operateur === 'CONTIENT' || c.operateur === 'CONTIENT=') return `${c.champ} CONTIENT=${c.valeur}`;
    return `${c.champ}=${c.valeur}`;
  }).join(' | ');
};

/** Normalise les champs v6 (script) vers les champs UI (composants React) */
const normaliseMoteur = (data) => ({
  ...data,
  // Nomenclature : celle du dépôt prime ; sinon, défaut benchmark intégré.
  nomenclature: (data.nomenclature && data.nomenclature.length)
    ? data.nomenclature
    : DEFAULT_NOMENCLATURE,
  referentielFournisseurs: (data.referentielFournisseurs || []).map(f => ({
    ...f,
    nom:           f.nom          ?? f.fournisseur   ?? '',
    famille:       f.famille      ?? f.familleN1     ?? '',
    sousCategorie: f.sousCategorie ?? f.sousCatN2    ?? '',
    multiNature:   f.multiNature  ?? false,
    natures:       f.natures      ?? [],
  })),
  reglesMultiNature: (data.reglesMultiNature || []).map((r, i) => ({
    ...r,
    id:            r.id           ?? String(r.id || i),
    label:         r.label        || (r.fournisseur ? `${r.fournisseur} — règle contextuelle` : `Règle ${i + 1}`),
    famille:       r.famille      ?? r.familleN1     ?? '',
    sousCategorie: r.sousCategorie ?? r.sousCatN2    ?? '',
    priority:      r.priority     ?? r.priorite      ?? (i + 1) * 10,
    conditions:    condArrayToStr(r.conditions),
  })),
  reglesMosCles: (data.reglesMosCles || []).map((r, i) => ({
    ...r,
    id:            r.id           ?? String(r.id || i),
    label:         r.label        || r.motCle        || `Mot-clé ${i + 1}`,
    famille:       r.famille      ?? r.familleN1     ?? '',
    sousCategorie: r.sousCategorie ?? r.sousCatN2    ?? '',
    priority:      r.priority     ?? r.priorite      ?? (i + 1) * 10,
    motsCles:      r.motsCles     ?? (r.motCle ? [r.motCle] : []),
  })),
  mappingComptes: (data.mappingComptes || []).map(m => ({
    ...m,
    familleDefaut: m.familleDefaut ?? m.familleN1    ?? '',
  })),
});

const readLocal = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
};

const writeLocal = (data) => {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {}
};

export const useReclassementData = () => {
  const [moteur, setMoteur] = useState(EMPTY_MOTEUR);
  const [loading, setLoading] = useState(true);
  const [error] = useState(null);

  // Référence toujours à jour vers le moteur courant : les mutateurs lisent
  // `moteurRef.current` (et non la closure `moteur`) afin que des écritures
  // ENCHAÎNÉES (ex. « Tout mapper » qui boucle sur N créations) se composent
  // correctement au lieu de repartir d'un état figé → seule la dernière gagnait.
  const moteurRef = useRef(EMPTY_MOTEUR);
  const setMoteurSynced = useCallback((next) => {
    moteurRef.current = next;
    setMoteur(next);
  }, []);

  const apiUrl = import.meta.env.VITE_API_URL;

  // Chargement initial
  useEffect(() => {
    setLoading(true);
    if (apiUrl) {
      fetch(`${apiUrl}/reclassement`)
        .then(r => r.ok ? r.json() : Promise.reject(r.status))
        .then(data => { setMoteurSynced(normaliseMoteur(data)); setLoading(false); })
        .catch(() => {
          // Serveur non disponible ou route absente — fallback localStorage silencieux
          const local = readLocal();
          if (local) setMoteurSynced(normaliseMoteur(local));
          setLoading(false);
        });
    } else {
      const local = readLocal();
      if (local) setMoteurSynced(normaliseMoteur(local));
      setLoading(false);
    }
  }, [apiUrl, setMoteurSynced]);

  // Persistance (API ou localStorage). Met à jour la ref + l'état AVANT le
  // réseau pour que les opérations enchaînées partent du dernier état.
  const persist = useCallback(async (updated) => {
    setMoteurSynced(updated);
    if (apiUrl) {
      const token = localStorage.getItem('authToken');
      await fetch(`${apiUrl}/reclassement`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(updated),
      });
    } else {
      writeLocal(updated);
    }
  }, [apiUrl, setMoteurSynced]);

  // ── Référentiel fournisseurs ────────────────────────────────────────────────

  const addFournisseur = useCallback(async (fournisseur) => {
    const cur = moteurRef.current;
    const entry = { ...fournisseur, id: fournisseur.id || genId() };
    await persist({ ...cur, referentielFournisseurs: [...cur.referentielFournisseurs, entry] });
  }, [persist]);

  const updateFournisseur = useCallback(async (id, patch) => {
    const cur = moteurRef.current;
    await persist({ ...cur, referentielFournisseurs: cur.referentielFournisseurs.map(f => f.id === id ? { ...f, ...patch } : f) });
  }, [persist]);

  const deleteFournisseur = useCallback(async (id) => {
    const cur = moteurRef.current;
    await persist({ ...cur, referentielFournisseurs: cur.referentielFournisseurs.filter(f => f.id !== id) });
  }, [persist]);

  // ── Règles multi-nature ─────────────────────────────────────────────────────

  const addRegleMultiNature = useCallback(async (regle) => {
    const cur = moteurRef.current;
    const entry = { ...regle, id: regle.id || genId(), priority: regle.priority ?? (cur.reglesMultiNature.length + 1) * 10 };
    await persist({ ...cur, reglesMultiNature: [...cur.reglesMultiNature, entry] });
  }, [persist]);

  const updateRegleMultiNature = useCallback(async (id, patch) => {
    const cur = moteurRef.current;
    await persist({ ...cur, reglesMultiNature: cur.reglesMultiNature.map(r => r.id === id ? { ...r, ...patch } : r) });
  }, [persist]);

  const deleteRegleMultiNature = useCallback(async (id) => {
    const cur = moteurRef.current;
    await persist({ ...cur, reglesMultiNature: cur.reglesMultiNature.filter(r => r.id !== id) });
  }, [persist]);

  const reorderReglesMultiNature = useCallback(async (fromIndex, toIndex) => {
    const cur = moteurRef.current;
    const arr = [...cur.reglesMultiNature];
    const [moved] = arr.splice(fromIndex, 1);
    arr.splice(toIndex, 0, moved);
    await persist({ ...cur, reglesMultiNature: arr.map((r, i) => ({ ...r, priority: (i + 1) * 10 })) });
  }, [persist]);

  // ── Règles mots-clés ────────────────────────────────────────────────────────

  const addRegleMosCles = useCallback(async (regle) => {
    const cur = moteurRef.current;
    const entry = { ...regle, id: regle.id || genId(), priority: regle.priority ?? (cur.reglesMosCles.length + 1) * 10 };
    await persist({ ...cur, reglesMosCles: [...cur.reglesMosCles, entry] });
  }, [persist]);

  const updateRegleMosCles = useCallback(async (id, patch) => {
    const cur = moteurRef.current;
    await persist({ ...cur, reglesMosCles: cur.reglesMosCles.map(r => r.id === id ? { ...r, ...patch } : r) });
  }, [persist]);

  const deleteRegleMosCles = useCallback(async (id) => {
    const cur = moteurRef.current;
    await persist({ ...cur, reglesMosCles: cur.reglesMosCles.filter(r => r.id !== id) });
  }, [persist]);

  const reorderReglesMosCles = useCallback(async (fromIndex, toIndex) => {
    const cur = moteurRef.current;
    const arr = [...cur.reglesMosCles];
    const [moved] = arr.splice(fromIndex, 1);
    arr.splice(toIndex, 0, moved);
    await persist({ ...cur, reglesMosCles: arr.map((r, i) => ({ ...r, priority: (i + 1) * 10 })) });
  }, [persist]);

  // ── Mapping comptes (pas d'ajout/suppression — uniquement mise à jour famille) ──

  const updateMappingCompte = useCallback(async (compte, familleDefaut, libelleCompte) => {
    const cur = moteurRef.current;
    const target = normalizeCompte(compte);
    if (!target) return;
    const exists = cur.mappingComptes.some(mp => normalizeCompte(mp.compte) === target);
    const mappingComptes = exists
      ? cur.mappingComptes.map(mp => normalizeCompte(mp.compte) === target ? { ...mp, familleDefaut } : mp)
      : [...cur.mappingComptes, { compte: target, familleDefaut, libelleCompte: libelleCompte || '' }];
    await persist({ ...cur, mappingComptes });
  }, [persist]);

  // ── Nomenclature : catégories (familles) & sous-catégories ──────────────────
  // Renommage/suppression cascadent sur les règles que le moteur possède. La
  // cascade vers les fournisseurs/projets/EPRD est orchestrée côté App.

  const addFamille = useCallback(async (nom) => {
    const cur = moteurRef.current;
    const f = String(nom || '').trim();
    if (!f || (cur.nomenclature || []).some(n => n.famille === f)) return;
    await persist({ ...cur, nomenclature: [...(cur.nomenclature || []), { famille: f, sousCategoriesDisponibles: [] }] });
  }, [persist]);

  const renameFamille = useCallback(async (oldName, newName) => {
    const cur = moteurRef.current;
    const nn = String(newName || '').trim();
    if (!nn || nn === oldName) return;
    const renF = (r) => r.famille === oldName ? { ...r, famille: nn } : r;
    await persist({
      ...cur,
      nomenclature: (cur.nomenclature || []).map(n => n.famille === oldName ? { ...n, famille: nn } : n),
      referentielFournisseurs: cur.referentielFournisseurs.map(renF),
      reglesMultiNature: cur.reglesMultiNature.map(renF),
      reglesMosCles: cur.reglesMosCles.map(renF),
      mappingComptes: cur.mappingComptes.map(m => m.familleDefaut === oldName ? { ...m, familleDefaut: nn } : m),
    });
  }, [persist]);

  const removeFamille = useCallback(async (nom, fallback = HORS_PERIMETRE_LABEL) => {
    const cur = moteurRef.current;
    const reF = (r) => r.famille === nom ? { ...r, famille: fallback } : r;
    await persist({
      ...cur,
      nomenclature: (cur.nomenclature || []).filter(n => n.famille !== nom),
      referentielFournisseurs: cur.referentielFournisseurs.map(reF),
      reglesMultiNature: cur.reglesMultiNature.map(reF),
      reglesMosCles: cur.reglesMosCles.map(reF),
      mappingComptes: cur.mappingComptes.map(m => m.familleDefaut === nom ? { ...m, familleDefaut: fallback } : m),
    });
  }, [persist]);

  const addSousCategorie = useCallback(async (famille, sousCat) => {
    const cur = moteurRef.current;
    const label = String((typeof sousCat === 'string' ? sousCat : sousCat?.label) || '').trim();
    if (!label) return;
    const nomenclature = (cur.nomenclature || []).map(n => {
      if (n.famille !== famille) return n;
      const list = n.sousCategoriesDisponibles || [];
      if (list.some(s => (typeof s === 'string' ? s : s.label) === label)) return n;
      const entry = typeof sousCat === 'string'
        ? { label }
        : { label, perimetre: sousCat.perimetre || '', description: sousCat.description || '' };
      return { ...n, sousCategoriesDisponibles: [...list, entry] };
    });
    await persist({ ...cur, nomenclature });
  }, [persist]);

  const renameSousCategorie = useCallback(async (famille, oldLabel, newLabel) => {
    const cur = moteurRef.current;
    const nn = String(newLabel || '').trim();
    if (!nn) return;
    const nomenclature = (cur.nomenclature || []).map(n => n.famille !== famille ? n : {
      ...n,
      sousCategoriesDisponibles: (n.sousCategoriesDisponibles || []).map(s => {
        const lbl = typeof s === 'string' ? s : s.label;
        if (lbl !== oldLabel) return s;
        return typeof s === 'string' ? nn : { ...s, label: nn };
      }),
    });
    const renSc = (r) => (r.famille === famille && r.sousCategorie === oldLabel) ? { ...r, sousCategorie: nn } : r;
    await persist({
      ...cur, nomenclature,
      referentielFournisseurs: cur.referentielFournisseurs.map(renSc),
      reglesMultiNature: cur.reglesMultiNature.map(renSc),
      reglesMosCles: cur.reglesMosCles.map(renSc),
    });
  }, [persist]);

  const removeSousCategorie = useCallback(async (famille, label) => {
    const cur = moteurRef.current;
    const nomenclature = (cur.nomenclature || []).map(n => n.famille !== famille ? n : {
      ...n,
      sousCategoriesDisponibles: (n.sousCategoriesDisponibles || []).filter(s => (typeof s === 'string' ? s : s.label) !== label),
    });
    const clrSc = (r) => (r.famille === famille && r.sousCategorie === label) ? { ...r, sousCategorie: '' } : r;
    await persist({
      ...cur, nomenclature,
      referentielFournisseurs: cur.referentielFournisseurs.map(clrSc),
      reglesMultiNature: cur.reglesMultiNature.map(clrSc),
      reglesMosCles: cur.reglesMosCles.map(clrSc),
    });
  }, [persist]);

  return {
    moteur,
    loading,
    error,
    // Fournisseurs
    addFournisseur,
    updateFournisseur,
    deleteFournisseur,
    // Multi-nature
    addRegleMultiNature,
    updateRegleMultiNature,
    deleteRegleMultiNature,
    reorderReglesMultiNature,
    // Mots-clés
    addRegleMosCles,
    updateRegleMosCles,
    deleteRegleMosCles,
    reorderReglesMosCles,
    // Comptes
    updateMappingCompte,
    // Nomenclature (catégories & sous-catégories)
    addFamille,
    renameFamille,
    removeFamille,
    addSousCategorie,
    renameSousCategorie,
    removeSousCategorie,
  };
};
