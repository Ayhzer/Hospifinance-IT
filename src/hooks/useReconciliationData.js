import { useState, useMemo, useCallback } from 'react';
import { loadSAGE } from '../utils/sageLoader';
import { computeReconciliation, getRapportOdHorsCircuit, computeKPIs } from '../utils/reconciliationEngine';

export const useReconciliationData = (suppliers) => {
  const [sageRows, setSageRows]   = useState([]);
  const [sageAnnee, setSageAnnee] = useState(null);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState(null);
  const [warnings, setWarnings]   = useState([]);
  const [fileName, setFileName]   = useState(null);

  const handleSageFileUpload = useCallback(async (file) => {
    setLoading(true);
    setError(null);
    setWarnings([]);
    try {
      const { rows, warnings: w } = await loadSAGE(file);
      if (rows.length === 0) throw new Error('Aucune ligne de données trouvée. Vérifiez que le fichier contient un onglet "Export" avec les colonnes de comptabilité attendues.');

      // Auto-détection de l'année (max des années présentes)
      const annees = [...new Set(rows.map(r => r.annee).filter(Boolean))];
      const annee  = annees.length ? Math.max(...annees) : null;

      setSageRows(rows);
      setSageAnnee(annee);
      setWarnings(w);
      setFileName(file.name);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const ecarts = useMemo(
    () => sageRows.length ? computeReconciliation(suppliers, sageRows, sageAnnee) : [],
    [suppliers, sageRows, sageAnnee],
  );

  const rapportOd = useMemo(
    () => sageRows.length ? getRapportOdHorsCircuit(sageRows, sageAnnee) : [],
    [sageRows, sageAnnee],
  );

  const kpis = useMemo(
    () => sageRows.length ? computeKPIs(sageRows, ecarts, sageAnnee) : null,
    [sageRows, ecarts, sageAnnee],
  );

  const reset = useCallback(() => {
    setSageRows([]);
    setSageAnnee(null);
    setWarnings([]);
    setFileName(null);
    setError(null);
  }, []);

  return {
    sageRows,
    sageAnnee,
    loading,
    error,
    warnings,
    fileName,
    ecarts,
    rapportOd,
    kpis,
    handleSageFileUpload,
    reset,
  };
};
