import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'hospifinance_reclassement';

const EMPTY_MOTEUR = {
  nomenclature: [],
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

  const apiUrl = import.meta.env.VITE_API_URL;

  // Chargement initial
  useEffect(() => {
    setLoading(true);
    if (apiUrl) {
      fetch(`${apiUrl}/reclassement`)
        .then(r => r.ok ? r.json() : Promise.reject(r.status))
        .then(data => { setMoteur(normaliseMoteur(data)); setLoading(false); })
        .catch(() => {
          // Serveur non disponible ou route absente — fallback localStorage silencieux
          const local = readLocal();
          if (local) setMoteur(normaliseMoteur(local));
          setLoading(false);
        });
    } else {
      const local = readLocal();
      if (local) setMoteur(normaliseMoteur(local));
      setLoading(false);
    }
  }, [apiUrl]);

  // Persistance (API ou localStorage)
  const persist = useCallback(async (updated) => {
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
    setMoteur(updated);
  }, [apiUrl]);

  // ── Référentiel fournisseurs ────────────────────────────────────────────────

  const addFournisseur = useCallback(async (fournisseur) => {
    const entry = { ...fournisseur, id: fournisseur.id || genId() };
    const updated = { ...moteur, referentielFournisseurs: [...moteur.referentielFournisseurs, entry] };
    await persist(updated);
  }, [moteur, persist]);

  const updateFournisseur = useCallback(async (id, patch) => {
    const updated = {
      ...moteur,
      referentielFournisseurs: moteur.referentielFournisseurs.map(f => f.id === id ? { ...f, ...patch } : f),
    };
    await persist(updated);
  }, [moteur, persist]);

  const deleteFournisseur = useCallback(async (id) => {
    const updated = { ...moteur, referentielFournisseurs: moteur.referentielFournisseurs.filter(f => f.id !== id) };
    await persist(updated);
  }, [moteur, persist]);

  // ── Règles multi-nature ─────────────────────────────────────────────────────

  const addRegleMultiNature = useCallback(async (regle) => {
    const entry = { ...regle, id: regle.id || genId(), priority: regle.priority ?? (moteur.reglesMultiNature.length + 1) * 10 };
    const updated = { ...moteur, reglesMultiNature: [...moteur.reglesMultiNature, entry] };
    await persist(updated);
  }, [moteur, persist]);

  const updateRegleMultiNature = useCallback(async (id, patch) => {
    const updated = {
      ...moteur,
      reglesMultiNature: moteur.reglesMultiNature.map(r => r.id === id ? { ...r, ...patch } : r),
    };
    await persist(updated);
  }, [moteur, persist]);

  const deleteRegleMultiNature = useCallback(async (id) => {
    const updated = { ...moteur, reglesMultiNature: moteur.reglesMultiNature.filter(r => r.id !== id) };
    await persist(updated);
  }, [moteur, persist]);

  const reorderReglesMultiNature = useCallback(async (fromIndex, toIndex) => {
    const arr = [...moteur.reglesMultiNature];
    const [moved] = arr.splice(fromIndex, 1);
    arr.splice(toIndex, 0, moved);
    const reordered = arr.map((r, i) => ({ ...r, priority: (i + 1) * 10 }));
    await persist({ ...moteur, reglesMultiNature: reordered });
  }, [moteur, persist]);

  // ── Règles mots-clés ────────────────────────────────────────────────────────

  const addRegleMosCles = useCallback(async (regle) => {
    const entry = { ...regle, id: regle.id || genId(), priority: regle.priority ?? (moteur.reglesMosCles.length + 1) * 10 };
    const updated = { ...moteur, reglesMosCles: [...moteur.reglesMosCles, entry] };
    await persist(updated);
  }, [moteur, persist]);

  const updateRegleMosCles = useCallback(async (id, patch) => {
    const updated = {
      ...moteur,
      reglesMosCles: moteur.reglesMosCles.map(r => r.id === id ? { ...r, ...patch } : r),
    };
    await persist(updated);
  }, [moteur, persist]);

  const deleteRegleMosCles = useCallback(async (id) => {
    const updated = { ...moteur, reglesMosCles: moteur.reglesMosCles.filter(r => r.id !== id) };
    await persist(updated);
  }, [moteur, persist]);

  const reorderReglesMosCles = useCallback(async (fromIndex, toIndex) => {
    const arr = [...moteur.reglesMosCles];
    const [moved] = arr.splice(fromIndex, 1);
    arr.splice(toIndex, 0, moved);
    const reordered = arr.map((r, i) => ({ ...r, priority: (i + 1) * 10 }));
    await persist({ ...moteur, reglesMosCles: reordered });
  }, [moteur, persist]);

  // ── Mapping comptes (pas d'ajout/suppression — uniquement mise à jour famille) ──

  const updateMappingCompte = useCallback(async (compte, familleDefaut) => {
    const updated = {
      ...moteur,
      mappingComptes: moteur.mappingComptes.map(m => m.compte === compte ? { ...m, familleDefaut } : m),
    };
    await persist(updated);
  }, [moteur, persist]);

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
  };
};
