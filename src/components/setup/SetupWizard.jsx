/**
 * Assistant de premier lancement — Hospifinance-IT
 * ---------------------------------------------------------------------------
 * S'affiche une seule fois, au tout premier démarrage d'une installation
 * autonome (localStorage), pour configurer sans toucher au code :
 *   1. l'identité de l'établissement   → config/runtimeConfig (establishment)
 *   2. les logiciels sources           → config/runtimeConfig (sources)
 *   3. le mode de données              → localStorage vierge ou sync GitHub
 *   4. le mot de passe administrateur  → AuthContext.changePassword
 *
 * Conditions d'affichage : voir `config/runtimeConfig.isSetupDone()`.
 * À la fin, la page est rechargée pour propager la configuration partout
 * (les constantes lues à l'import sont alors recalculées).
 */

import { useState } from 'react';
import {
  Building2, AppWindow, Database, ShieldCheck,
  ChevronLeft, ChevronRight, Check, Github, AlertTriangle,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { DEFAULT_ESTABLISHMENT } from '../../config/establishment';
import { DEFAULT_SOURCE_SOFTWARE } from '../../config/sources';
import { saveAppConfig, markSetupDone, loadAppConfig } from '../../config/runtimeConfig';
import { saveGithubConfig } from '../../services/githubStorageService';

const STEPS = [
  { id: 'identite', label: 'Établissement', icon: Building2 },
  { id: 'sources', label: 'Logiciels sources', icon: AppWindow },
  { id: 'donnees', label: 'Données', icon: Database },
  { id: 'securite', label: 'Sécurité', icon: ShieldCheck },
];

const Field = ({ label, hint, children }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
    {children}
    {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
  </div>
);

const inputClass =
  'w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm';

export default function SetupWizard({ onComplete }) {
  const { users, changePassword } = useAuth();
  const saved = loadAppConfig();

  const [step, setStep] = useState(0);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Étape 1 — Identité
  const e0 = { ...DEFAULT_ESTABLISHMENT, ...(saved.establishment || {}) };
  const [name, setName] = useState(e0.name === DEFAULT_ESTABLISHMENT.name ? '' : e0.name);
  const [shortName, setShortName] = useState(e0.shortName === DEFAULT_ESTABLISHMENT.shortName ? '' : e0.shortName);
  const [department, setDepartment] = useState(e0.department);
  const [departmentLong, setDepartmentLong] = useState(e0.departmentLong);
  const [currency, setCurrency] = useState(e0.currency);
  const [defaultYear, setDefaultYear] = useState(String(e0.defaultYear));

  // Étape 2 — Logiciels sources
  const s0 = { ...DEFAULT_SOURCE_SOFTWARE, ...(saved.sources || {}) };
  const [ordersLabel, setOrdersLabel] = useState(s0.orders);
  const [paymentsLabel, setPaymentsLabel] = useState(s0.payments);

  // Étape 3 — Données
  const [dataMode, setDataMode] = useState('local'); // 'local' | 'github'
  const [ghToken, setGhToken] = useState('');
  const [ghOwner, setGhOwner] = useState('');
  const [ghRepo, setGhRepo] = useState('hospifinance-it-data');
  const [ghBranch, setGhBranch] = useState('main');
  const [ghPath, setGhPath] = useState('data');

  // Étape 4 — Sécurité
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [skipPassword, setSkipPassword] = useState(false);

  const validateStep = () => {
    setError('');
    if (step === 0) {
      if (!name.trim()) return 'Le nom de l’établissement est obligatoire.';
      if (!shortName.trim()) return 'Le sigle (nom court) est obligatoire.';
      const y = parseInt(defaultYear, 10);
      if (!Number.isInteger(y) || y < 2000 || y > 2100) return 'L’année de pilotage doit être comprise entre 2000 et 2100.';
    }
    if (step === 1) {
      if (!ordersLabel.trim() || !paymentsLabel.trim()) return 'Les deux libellés de logiciels sont obligatoires.';
    }
    if (step === 2 && dataMode === 'github') {
      if (!ghToken.trim() || !ghOwner.trim() || !ghRepo.trim()) {
        return 'Token, propriétaire et nom du dépôt sont requis pour la synchronisation GitHub.';
      }
    }
    if (step === 3 && !skipPassword) {
      if (newPassword.length < 8) return 'Le nouveau mot de passe doit contenir au moins 8 caractères.';
      if (newPassword !== confirmPassword) return 'Les deux mots de passe ne correspondent pas.';
    }
    return '';
  };

  const next = () => {
    const err = validateStep();
    if (err) { setError(err); return; }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const back = () => { setError(''); setStep((s) => Math.max(s - 1, 0)); };

  const finish = async () => {
    const err = validateStep();
    if (err) { setError(err); return; }
    setSubmitting(true);
    try {
      // 1 & 2 — Identité + logiciels sources (config runtime)
      saveAppConfig({
        establishment: {
          name: name.trim(),
          shortName: shortName.trim(),
          department: department.trim() || DEFAULT_ESTABLISHMENT.department,
          departmentLong: departmentLong.trim() || DEFAULT_ESTABLISHMENT.departmentLong,
          currency: currency.trim() || DEFAULT_ESTABLISHMENT.currency,
          defaultYear: parseInt(defaultYear, 10),
        },
        sources: {
          orders: ordersLabel.trim(),
          payments: paymentsLabel.trim(),
        },
      });

      // 3 — Mode de données
      if (dataMode === 'github') {
        saveGithubConfig({
          enabled: true,
          token: ghToken.trim(),
          owner: ghOwner.trim(),
          repo: ghRepo.trim(),
          branch: ghBranch.trim() || 'main',
          dataPath: ghPath.trim() || 'data',
        });
      }

      // 4 — Mot de passe administrateur
      if (!skipPassword && newPassword) {
        const admin = (users || []).find((u) => u.role === 'superadmin') || (users || [])[0];
        if (admin) await changePassword(admin.id, newPassword);
      }

      markSetupDone();
      onComplete?.();
      // Rechargement : propage la config runtime à TOUS les modules (constantes
      // évaluées à l'import comprises).
      window.location.reload();
    } catch (err) {
      setError(err?.message || 'Une erreur est survenue lors de l’enregistrement.');
      setSubmitting(false);
    }
  };

  const isLast = step === STEPS.length - 1;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl p-6 sm:p-8">
        {/* En-tête */}
        <div className="text-center mb-6">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Bienvenue dans Hospifinance-IT</h1>
          <p className="text-sm text-gray-500 mt-1">Configuration initiale — quelques étapes pour démarrer</p>
        </div>

        {/* Indicateur d'étapes */}
        <div className="flex items-center justify-between mb-8">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const active = i === step;
            const done = i < step;
            return (
              <div key={s.id} className="flex-1 flex flex-col items-center relative">
                {i > 0 && (
                  <div className={`absolute top-5 right-1/2 w-full h-0.5 ${done || active ? 'bg-blue-500' : 'bg-gray-200'}`} />
                )}
                <div className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                  done ? 'bg-blue-600 border-blue-600 text-white'
                  : active ? 'bg-blue-100 border-blue-500 text-blue-600'
                  : 'bg-white border-gray-300 text-gray-400'}`}>
                  {done ? <Check size={18} /> : <Icon size={18} />}
                </div>
                <span className={`mt-2 text-xs text-center ${active ? 'text-blue-600 font-medium' : 'text-gray-400'}`}>
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-4 flex items-start gap-2">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Contenu de l'étape */}
        <div className="space-y-4 min-h-[260px]">
          {step === 0 && (
            <>
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Nom de l’établissement *">
                  <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)}
                    placeholder="Centre Hospitalier de…" autoFocus />
                </Field>
                <Field label="Sigle / nom court *" hint="Utilisé dans les noms de fichiers PDF.">
                  <input className={inputClass} value={shortName} onChange={(e) => setShortName(e.target.value)}
                    placeholder="CH…" />
                </Field>
                <Field label="Direction (sigle)">
                  <input className={inputClass} value={department} onChange={(e) => setDepartment(e.target.value)} />
                </Field>
                <Field label="Direction (libellé long)">
                  <input className={inputClass} value={departmentLong} onChange={(e) => setDepartmentLong(e.target.value)} />
                </Field>
                <Field label="Devise">
                  <input className={inputClass} value={currency} onChange={(e) => setCurrency(e.target.value)} />
                </Field>
                <Field label="Année de pilotage par défaut">
                  <input type="number" className={inputClass} value={defaultYear}
                    onChange={(e) => setDefaultYear(e.target.value)} />
                </Field>
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <p className="text-sm text-gray-500">
                Libellés affichés dans l’application et les modèles d’import. Le format d’import reste
                un modèle canonique commun, indépendant du logiciel.
              </p>
              <Field label="Nom du logiciel source des commandes" hint="Ex. : MAGH2, EPSILON, CPAGE…">
                <input className={inputClass} value={ordersLabel} onChange={(e) => setOrdersLabel(e.target.value)} />
              </Field>
              <Field label="Nom du logiciel de gestion des paiements" hint="Ex. : SAGE, Qualiac, GEF…">
                <input className={inputClass} value={paymentsLabel} onChange={(e) => setPaymentsLabel(e.target.value)} />
              </Field>
            </>
          )}

          {step === 2 && (
            <>
              <p className="text-sm text-gray-500">Où les données seront-elles stockées ?</p>
              <label className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer ${dataMode === 'local' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
                <input type="radio" className="mt-1" checked={dataMode === 'local'} onChange={() => setDataMode('local')} />
                <span>
                  <span className="block text-sm font-medium text-gray-800">Base locale (ce navigateur)</span>
                  <span className="block text-xs text-gray-500">
                    Démarrage avec une base vierge. Importez vos commandes via le fichier exemple
                    téléchargeable. Idéal pour évaluer l’outil ou un poste unique.
                  </span>
                </span>
              </label>
              <label className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer ${dataMode === 'github' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
                <input type="radio" className="mt-1" checked={dataMode === 'github'} onChange={() => setDataMode('github')} />
                <span className="flex-1">
                  <span className="text-sm font-medium text-gray-800 flex items-center gap-1.5"><Github size={14} /> Synchronisation GitHub</span>
                  <span className="block text-xs text-gray-500 mb-2">
                    Partage des données entre plusieurs postes via un dépôt. Utilisez un dépôt
                    <strong> privé</strong> pour des données réelles.
                  </span>
                  {dataMode === 'github' && (
                    <div className="grid sm:grid-cols-2 gap-2 mt-2" onClick={(e) => e.preventDefault()}>
                      <input className={inputClass} placeholder="Token (ghp_…)" value={ghToken} onChange={(e) => setGhToken(e.target.value)} />
                      <input className={inputClass} placeholder="Propriétaire (owner)" value={ghOwner} onChange={(e) => setGhOwner(e.target.value)} />
                      <input className={inputClass} placeholder="Dépôt (repo)" value={ghRepo} onChange={(e) => setGhRepo(e.target.value)} />
                      <input className={inputClass} placeholder="Branche" value={ghBranch} onChange={(e) => setGhBranch(e.target.value)} />
                      <input className={inputClass} placeholder="Dossier des JSON" value={ghPath} onChange={(e) => setGhPath(e.target.value)} />
                    </div>
                  )}
                </span>
              </label>
              <p className="text-xs text-gray-400">
                Le mode « Serveur API local » se configure via <code>.env.local</code> (variable <code>VITE_API_URL</code>),
                puis <code>npm start</code>.
              </p>
            </>
          )}

          {step === 3 && (
            <>
              <p className="text-sm text-gray-500">
                Le compte administrateur par défaut est <strong>admin</strong> / <strong>Admin2024!</strong>.
                Changez ce mot de passe maintenant.
              </p>
              <Field label="Nouveau mot de passe administrateur" hint="8 caractères minimum.">
                <input type="password" className={inputClass} value={newPassword} disabled={skipPassword}
                  onChange={(e) => setNewPassword(e.target.value)} autoComplete="new-password" />
              </Field>
              <Field label="Confirmer le mot de passe">
                <input type="password" className={inputClass} value={confirmPassword} disabled={skipPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)} autoComplete="new-password" />
              </Field>
              <label className="flex items-center gap-2 text-xs text-gray-500">
                <input type="checkbox" checked={skipPassword} onChange={(e) => setSkipPassword(e.target.checked)} />
                Conserver le mot de passe par défaut (déconseillé — à changer plus tard dans les paramètres)
              </label>
            </>
          )}
        </div>

        {/* Pied — navigation */}
        <div className="flex items-center justify-between mt-8 pt-4 border-t border-gray-100">
          <button onClick={back} disabled={step === 0 || submitting}
            className="flex items-center gap-1 px-4 py-2 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-40">
            <ChevronLeft size={16} /> Retour
          </button>
          <span className="text-xs text-gray-400">Étape {step + 1} / {STEPS.length}</span>
          {isLast ? (
            <button onClick={finish} disabled={submitting}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-medium px-5 py-2 rounded-lg text-sm">
              {submitting ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> : <Check size={16} />}
              Terminer
            </button>
          ) : (
            <button onClick={next} disabled={submitting}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-medium px-5 py-2 rounded-lg text-sm">
              Suivant <ChevronRight size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
