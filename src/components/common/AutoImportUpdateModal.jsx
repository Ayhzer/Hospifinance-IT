/**
 * AutoImportUpdateModal — proposée au lancement quand une nouvelle version du
 * fichier source est détectée. Récupère le fichier via le serveur local, le
 * parse avec le circuit d'import canonique et applique les données.
 */

import { useState } from 'react';
import { RefreshCw, Database, AlertCircle, CheckCircle } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';
import { AlertBanner } from './AlertBanner';
import { fetchAutoImportFile } from '../../services/apiService';
import { importCommandes } from '../../services/xlsxImportService';

export default function AutoImportUpdateModal({
  status,            // { fileName, logTimestamp, lineCount, size, signature }
  exercice = '',
  convertHT = false,
  moteur = null,
  lastImport = null, // dernier import enregistré (pour affichage)
  onCommandesImport, // (parsed) => Promise — applique les données
  onConfirmed,       // (signature) => void — enregistre lastImport + lastSeen
  onLater,           // (signature) => void — enregistre lastSeen seulement
}) {
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);

  const sig = { signature: status.signature, fileName: status.fileName };

  const handleUpdate = async () => {
    setImporting(true);
    setResult(null);
    try {
      const blob = await fetchAutoImportFile();
      const parsed = await importCommandes(blob, { exercice: exercice || null, convertHT, moteur });

      if (parsed.errors.length > 0 && parsed.opexSuppliers.length === 0 && parsed.capexProjects.length === 0) {
        setResult({ success: false, errors: parsed.errors.map(e => `Ligne ${e.ligne}: ${e.erreur}`) });
        return;
      }

      await onCommandesImport(parsed);

      const htNote = convertHT ? ' (montants TTC→HT)' : '';
      setResult({
        success: true,
        message: `Données mises à jour${exercice ? ` (${exercice})` : ''}${htNote} : ${parsed.opexSuppliers.length} fournisseurs OPEX, ${parsed.capexProjects.length} projets CAPEX`,
      });
      onConfirmed({ ...sig, importedAt: new Date().toISOString() });
      setTimeout(() => onLater(sig), 2500); // ferme via reset du pending
    } catch (error) {
      setResult({ success: false, errors: [`Erreur inattendue : ${error.message}`] });
    } finally {
      setImporting(false);
    }
  };

  const handleLater = () => onLater(sig);

  return (
    <Modal
      isOpen={true}
      onClose={handleLater}
      closeOnOverlayClick={false}
      title={
        <div className="flex items-center gap-2">
          <Database size={20} className="text-indigo-600" />
          <span>Nouvelle version du fichier source disponible</span>
        </div>
      }
      size="md"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={handleLater} disabled={importing}>Plus tard</Button>
          <Button
            variant="primary"
            onClick={handleUpdate}
            disabled={importing}
            icon={<RefreshCw size={16} className={importing ? 'animate-spin' : ''} />}
          >
            {importing ? 'Mise à jour...' : 'Mettre à jour les données'}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-gray-600">
          Une version plus récente du fichier source a été détectée. Vous pouvez
          mettre à jour les données OPEX / CAPEX de l'outil à partir de cette extraction.
        </p>

        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 text-sm space-y-1">
          <div className="flex items-center gap-2 font-medium text-indigo-900">
            <CheckCircle size={16} /> {status.fileName}
          </div>
          <ul className="text-xs text-indigo-800 ml-6 list-disc space-y-0.5">
            {status.logTimestamp && (
              <li>Extraction du {status.logTimestamp.replace('T', ' ')}{status.lineCount != null ? ` — ${status.lineCount} lignes` : ''}</li>
            )}
            <li>Taille : {(status.size / 1024 / 1024).toFixed(2)} Mo</li>
            {exercice && <li>Exercice : {exercice}{convertHT ? ' — TTC converti en HT' : ''}</li>}
          </ul>
        </div>

        {lastImport?.importedAt && (
          <p className="text-xs text-gray-500">
            Dernier import : {lastImport.fileName || ''} ({new Date(lastImport.importedAt).toLocaleString('fr-FR')})
          </p>
        )}

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-start gap-2 text-xs text-yellow-800">
          <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
          <span>La mise à jour remplace l'intégralité des données OPEX et CAPEX existantes par celles de l'extraction.</span>
        </div>

        {result && (
          result.success ? (
            <AlertBanner type="success">
              <p className="font-semibold">{result.message}</p>
            </AlertBanner>
          ) : (
            <AlertBanner type="error">
              <div>
                <p className="font-semibold mb-2">Erreur lors de la mise à jour</p>
                {result.errors?.length > 0 && (
                  <ul className="text-sm space-y-1 list-disc list-inside max-h-40 overflow-y-auto">
                    {result.errors.map((e, i) => <li key={i}>{e}</li>)}
                  </ul>
                )}
              </div>
            </AlertBanner>
          )
        )}
      </div>
    </Modal>
  );
}
