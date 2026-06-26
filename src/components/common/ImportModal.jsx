/**
 * Modal d'import — Hospifinance-IT
 * Import générique par modèle canonique (XLSX/CSV) ou import CSV simple.
 */

import { useState, useRef } from 'react';
import { FileUp, AlertCircle, CheckCircle, FileSpreadsheet, Download } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';
import { AlertBanner } from './AlertBanner';
import { importCommandes } from '../../services/xlsxImportService';
import { downloadOrdersTemplate } from '../../services/importTemplates';
import { SOURCE_SOFTWARE } from '../../config/sources';
import { ESTABLISHMENT } from '../../config/establishment';

const isXlsxFile = (file) =>
  file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xls'));

const ANNEES = (() => {
  const y = ESTABLISHMENT.defaultYear;
  return [y - 4, y - 3, y - 2, y - 1, y].map(String);
})();

export default function ImportModal({ isOpen, onClose, onImport, onCommandesImport, title, type, moteur = null }) {
  const [file, setFile]           = useState(null);
  const [xlsxFile, setXlsxFile]   = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult]       = useState(null);
  const [exercice, setExercice]   = useState(String(ESTABLISHMENT.defaultYear));
  const [convertHT, setConvertHT] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    const xlsx = isXlsxFile(selectedFile);
    const csv  = selectedFile.type === 'text/csv' || selectedFile.name.endsWith('.csv');

    if (!xlsx && !csv) {
      setResult({ success: false, errors: ['Veuillez sélectionner un fichier CSV ou XLSX valide'] });
      setFile(null);
      setXlsxFile(false);
      return;
    }

    setFile(selectedFile);
    setXlsxFile(xlsx);
    setResult(null);
  };

  const handleImport = async () => {
    if (!file) {
      setResult({ success: false, errors: ['Veuillez sélectionner un fichier'] });
      return;
    }

    setImporting(true);
    setResult(null);

    try {
      if (xlsxFile && type === 'opex') {
        const parsed = await importCommandes(file, { exercice, convertHT, moteur });

        if (parsed.errors.length > 0 && parsed.opexSuppliers.length === 0 && parsed.capexProjects.length === 0) {
          setResult({ success: false, errors: parsed.errors.map((e) => `Ligne ${e.ligne}: ${e.erreur}`) });
          return;
        }
        if (onCommandesImport) await onCommandesImport(parsed);

        const htNote = convertHT ? ' (montants TTC→HT)' : '';
        const nbCurrent    = (parsed.stats?.opex ?? 0) + (parsed.stats?.capex ?? 0);
        const nbHistorique = parsed.stats?.historique ?? 0;
        const historiqueNote = nbHistorique > 0
          ? ` + ${nbHistorique} commandes historiques (années antérieures)`
          : '';
        setResult({
          success: true,
          message: `Import réussi (${exercice})${htNote} : ${parsed.opexSuppliers.length} fournisseurs OPEX, ${parsed.capexProjects.length} projets CAPEX, ${nbCurrent} commandes${historiqueNote}`,
        });
        setTimeout(() => handleClose(), 3000);
      } else {
        // Import CSV classique
        const importResult = await onImport(file);
        setResult(importResult);
        if (importResult.success) setTimeout(() => handleClose(), 2000);
      }
    } catch (error) {
      setResult({ success: false, errors: [`Erreur inattendue: ${error.message}`] });
    } finally {
      setImporting(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setXlsxFile(false);
    setResult(null);
    setExercice(String(ESTABLISHMENT.defaultYear));
    setConvertHT(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
    onClose();
  };

  const renderInstructions = () => {
    if (type === 'opex') {
      return [
        `Fichier XLSX/CSV au format « ${SOURCE_SOFTWARE.orders} » (modèle canonique).`,
        'Les colonnes sont reconnues par leur NOM (accents/casse ignorés) — l\'ordre est libre.',
        'Comptes en préfixe charges → OPEX ; préfixe immobilisations → CAPEX (cf. configuration).',
        'Téléchargez le fichier exemple ci-dessous, remplissez-le avec vos données, puis importez.',
      ];
    }
    const instructions = {
      capex: [
        'Colonnes : project, enveloppe, budgetTotal, depense, engagement, dateDebut, dateFin, status, notes',
        'Statuts valides : Planifié, En cours, Terminé, Suspendu, Annulé',
      ],
      opexOrders: [
        'Colonnes : supplierName, description, montant, status, dateCommande, dateFacture, reference, notes',
      ],
      capexOrders: [
        'Colonnes : projectName, description, montant, status, dateCommande, dateFacture, reference, notes',
      ],
    };
    return instructions[type] || [];
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={title} size="lg"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={handleClose}>Annuler</Button>
          <Button variant="primary" onClick={handleImport} disabled={!file || importing} icon={<FileUp size={16} />}>
            {importing ? 'Import en cours...' : 'Importer'}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">

        {/* Bandeau modèle + téléchargement du fichier exemple */}
        {type === 'opex' && (
          <div className="border rounded-lg p-3 bg-blue-50 border-blue-300 space-y-3">
            <div className="flex items-center gap-3">
              <FileSpreadsheet size={20} className="text-blue-700" />
              <div>
                <p className="font-semibold text-sm text-blue-900">
                  Modèle d'import générique — « {SOURCE_SOFTWARE.orders} »
                </p>
                <p className="text-xs text-blue-700">
                  Import automatique OPEX + CAPEX par nom de colonne.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button variant="secondary" onClick={downloadOrdersTemplate} icon={<Download size={16} />}>
                Télécharger le fichier exemple
              </Button>

              <div className="flex items-center gap-2">
                <label className="text-xs font-medium text-gray-700">Exercice :</label>
                <select
                  value={exercice}
                  onChange={(e) => setExercice(e.target.value)}
                  className="border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  {ANNEES.map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>

              <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={convertHT}
                  onChange={(e) => setConvertHT(e.target.checked)}
                  className="accent-blue-600"
                />
                Convertir TTC → HT (via taux de TVA)
              </label>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
            <AlertCircle size={18} />
            Instructions d'import
          </h4>
          <ul className="text-sm text-blue-800 space-y-1 ml-6 list-disc">
            {renderInstructions().map((instruction, index) => (
              <li key={index}>{instruction}</li>
            ))}
          </ul>
        </div>

        {/* Sélection de fichier */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {type === 'opex' ? 'Fichier XLSX ou CSV à importer' : 'Fichier CSV à importer'}
          </label>
          <input
            ref={fileInputRef}
            type="file"
            accept={type === 'opex' ? '.csv,.xlsx,.xls' : '.csv'}
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-500
              file:mr-4 file:py-2 file:px-4
              file:rounded file:border-0
              file:text-sm file:font-semibold
              file:bg-blue-50 file:text-blue-700
              hover:file:bg-blue-100
              cursor-pointer"
          />
          {file && (
            <p className="mt-2 text-sm text-gray-600 flex items-center gap-2">
              <CheckCircle size={16} className="text-green-600" />
              Fichier sélectionné : <span className="font-medium">{file.name}</span>
            </p>
          )}
        </div>

        {/* Résultat */}
        {result && (
          <div className="mt-4">
            {result.success ? (
              <AlertBanner type="success" onClose={() => setResult(null)}>
                <div>
                  <p className="font-semibold">{result.message}</p>
                  <p className="text-sm mt-1">La fenêtre va se fermer automatiquement…</p>
                </div>
              </AlertBanner>
            ) : (
              <AlertBanner type="error" onClose={() => setResult(null)}>
                <div>
                  <p className="font-semibold mb-2">Erreurs lors de l'import</p>
                  {result.errors?.length > 0 && (
                    <div className="max-h-48 overflow-y-auto">
                      <ul className="text-sm space-y-1 list-disc list-inside">
                        {result.errors.map((error, index) => (
                          <li key={index}>{error}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </AlertBanner>
            )}
          </div>
        )}

        <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded">
          <strong>Note :</strong> L'import remplace toutes les données existantes.
        </div>
      </div>
    </Modal>
  );
}
