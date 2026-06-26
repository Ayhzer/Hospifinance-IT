/**
 * BudgetCard — Carte budgétaire avec contexte temporel, projections et infobulles
 */

import { useState } from 'react';
import { Pencil, Check, X, HelpCircle } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';
import { ProgressBar } from '../common/ProgressBar';
import { AlertBanner } from '../common/AlertBanner';
import { BUDGET_THRESHOLDS } from '../../constants/budgetConstants';
import { calculateProjections } from '../../utils/calculations';

const MOIS_LABELS = ['','Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];
const pctFmt = (v) => `${v.toFixed(1)} %`;

// ── Infobulle ─────────────────────────────────────────────────────────────────

const Tip = ({ text, side = 'top' }) => {
  const [show, setShow] = useState(false);

  const bubblePos = side === 'bottom'
    ? 'top-full mt-2 left-0'
    : 'bottom-full mb-2 left-0';

  const arrowPos = side === 'bottom'
    ? 'bottom-full left-4 border-b-gray-900'
    : 'top-full left-4 border-t-gray-900';

  return (
    <span
      className="relative inline-flex items-center cursor-help ml-1 align-middle"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      onFocus={() => setShow(true)}
      onBlur={() => setShow(false)}
    >
      <HelpCircle
        size={12}
        className={`flex-shrink-0 transition-colors duration-100 ${show ? 'text-blue-400' : 'text-gray-300'}`}
      />
      {show && (
        <span
          className={`absolute ${bubblePos} z-50 w-56 text-[11px] leading-relaxed bg-gray-900 text-white rounded-lg px-3 py-2 shadow-xl pointer-events-none select-none`}
        >
          {text}
          <span className={`absolute ${arrowPos} border-4 border-transparent`} />
        </span>
      )}
    </span>
  );
};

// ── Ligne de montant avec infobulle ──────────────────────────────────────────

const AmountRow = ({ label, tip, value, valueClass = '', bold = false, border = false, children }) => (
  <div className={`flex justify-between items-center ${border ? 'border-t pt-2 sm:pt-2.5' : ''}`}>
    <span className={`text-sm flex items-center ${bold ? 'font-semibold text-gray-700' : 'text-gray-500'}`}>
      {label}
      {tip && <Tip text={tip} />}
    </span>
    {children || (
      <span className={`font-semibold text-base text-right ${valueClass}`}>{value}</span>
    )}
  </div>
);

// ── Badge de projection ───────────────────────────────────────────────────────

const ProjectionBadge = ({ label, tip, value, budget, colorClass }) => {
  if (!budget || budget === 0) return null;
  const taux = (value / budget) * 100;
  const over = taux > 100;
  return (
    <div className="flex justify-between items-center text-xs">
      <span className={`flex items-center ${colorClass}`}>
        {label}
        {tip && <Tip text={tip} side="bottom" />}
      </span>
      <div className="flex items-center gap-2">
        <span className="text-gray-500">{formatCurrency(value)}</span>
        <span className={`font-semibold tabular-nums ${over ? 'text-red-600' : 'text-gray-600'}`}>
          {pctFmt(taux)}
        </span>
      </div>
    </div>
  );
};

// ── Composant principal ───────────────────────────────────────────────────────

export const BudgetCard = ({
  title, icon: Icon, totals, iconColor,
  warningThreshold, criticalThreshold,
  nbMoisRealises = 5,
  onBudgetGlobalChange,
}) => {
  const [editingBudget, setEditingBudget] = useState(false);
  const [budgetDraft, setBudgetDraft] = useState('');

  const critAt       = criticalThreshold ?? BUDGET_THRESHOLDS.CRITICAL;
  const isOverBudget = totals.tauxUtilisation >= critAt;

  const chargeEngagee = (totals.depense || 0) + (totals.engagement || 0);
  const budget        = totals.budget || 0;
  const mois          = Math.max(1, nbMoisRealises);
  const moisLabel     = MOIS_LABELS[mois] || '';
  const annee         = new Date().getFullYear();
  const tauxPct       = budget > 0 ? (chargeEngagee / budget * 100).toFixed(1) : null;

  const proj = budget > 0
    ? calculateProjections(chargeEngagee, budget, mois)
    : null;

  const commitBudget = () => {
    const v = parseFloat(String(budgetDraft).replace(/\s/g, '').replace(',', '.'));
    if (!isNaN(v) && v >= 0) onBudgetGlobalChange(v);
    setEditingBudget(false);
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">

      {/* En-tête */}
      <div className="flex items-start justify-between mb-3 sm:mb-4 gap-2">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-gray-800 leading-tight">{title}</h2>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="text-[11px] bg-blue-50 text-blue-600 border border-blue-100 rounded-full px-2 py-0.5 font-medium">
              au {moisLabel} {annee}
            </span>
            <span className="text-[11px] text-gray-400">{mois} / 12 mois réalisés</span>
          </div>
        </div>
        {Icon && <Icon className={`${iconColor} flex-shrink-0 mt-1`} size={20} />}
      </div>

      {/* Montants */}
      <div className="space-y-2 sm:space-y-2.5">

        {/* Budget */}
        <div className="flex justify-between items-center group">
          <span className="text-sm text-gray-500 flex items-center">
            Budget
            <Tip text={
              onBudgetGlobalChange
                ? `Enveloppe d'investissement CAPEX de l'exercice sélectionné. Le logiciel de gestion des paiements n'exporte pas ce montant — saisissez-le manuellement (mémorisé par année). Cliquez sur le crayon pour le modifier.`
                : `Dotation budgétaire annuelle issue de l'EPRD (Exercice Prévisionnel des Recettes et Dépenses). Chargée automatiquement depuis le référentiel EPRD pour les comptes ordonnateurs H6x / I6x.`
            } />
          </span>
          {editingBudget ? (
            <div className="flex items-center gap-1">
              <input
                autoFocus
                type="text"
                value={budgetDraft}
                onChange={e => setBudgetDraft(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') commitBudget(); if (e.key === 'Escape') setEditingBudget(false); }}
                className="w-32 text-right text-sm border border-blue-300 rounded px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-400"
                placeholder="ex : 2 500 000"
              />
              <button onClick={commitBudget} className="text-green-600 hover:text-green-800"><Check size={14} /></button>
              <button onClick={() => setEditingBudget(false)} className="text-gray-400 hover:text-gray-600"><X size={14} /></button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-base text-right">
                {budget > 0
                  ? formatCurrency(budget)
                  : <span className="text-gray-300 italic text-sm">non renseigné</span>}
              </span>
              {onBudgetGlobalChange && (
                <button
                  onClick={() => { setBudgetDraft(budget > 0 ? String(budget) : ''); setEditingBudget(true); }}
                  className="opacity-0 group-hover:opacity-60 hover:!opacity-100 text-gray-400 hover:text-blue-600 transition-opacity"
                  title="Saisir le budget"
                ><Pencil size={12} /></button>
              )}
            </div>
          )}
        </div>

        {/* Dépensé */}
        <AmountRow
          label="Dépensé (mandaté)"
          tip="Montants réellement mandatés et payés dans la comptabilité source — colonne « Mandaté net » de l'extraction. Ces dépenses ont fait l'objet d'un ordonnancement de paiement effectif."
          value={formatCurrency(totals.depense)}
          valueClass="text-orange-600"
        />

        {/* Engagé non reçu */}
        <AmountRow
          label="Engagé non reçu"
          tip="Commandes juridiquement fermes en cours de livraison : fournisseurs notifiés mais prestations non encore reçues ou facturées. Ces montants sont déjà consommés budgétairement même si le paiement n'est pas intervenu."
          value={formatCurrency(totals.engagement)}
          valueClass="text-yellow-600"
        />

        {/* Charge engagée */}
        <AmountRow
          label="Charge engagée"
          tip={`Mandaté + Engagé non reçu = consommation totale prévisible à ce jour. C'est l'indicateur de pilotage principal. Actuellement ${tauxPct ? tauxPct + ' %' : '—'} du budget.`}
          value={formatCurrency(chargeEngagee)}
          valueClass="text-gray-800"
          bold
          border
        />

        {/* Disponible */}
        <AmountRow
          label="Disponible"
          tip="Budget − Mandaté − Engagé. Marge restante mobilisable pour de nouvelles commandes. Un montant négatif signifie un dépassement budgétaire formel."
          value={formatCurrency(totals.disponible)}
          valueClass={totals.disponible < 0 ? 'text-red-600 text-lg' : 'text-green-600 text-lg'}
          bold
        />

        {/* Barre de progression */}
        {budget > 0 && (
          <div className="mt-3">
            <div className="flex justify-between text-[11px] text-gray-400 mb-1">
              <span className="flex items-center">
                Taux d&apos;utilisation
                <Tip text={`(Mandaté + Engagé) / Budget × 100. Seuil orange : ${warningThreshold ?? 75} %. Seuil rouge : ${criticalThreshold ?? 90} %. Au-delà de 100 %, le budget est formellement dépassé.`} />
              </span>
              <span className="font-semibold text-gray-600">{pctFmt(totals.tauxUtilisation)}</span>
            </div>
            <ProgressBar
              value={totals.tauxUtilisation}
              warningThreshold={warningThreshold}
              criticalThreshold={criticalThreshold}
            />
          </div>
        )}

        {isOverBudget && (
          <AlertBanner type="error" message="Budget presque épuisé" className="mt-2" />
        )}

        {/* Projections fin d'année */}
        {proj && (
          <div className="mt-3 pt-3 border-t border-dashed border-gray-200">
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">
              Projection fin {annee}
            </div>
            <div className="space-y-1.5">
              <ProjectionBadge
                label={`Linéaire (×12/${mois})`}
                tip={`Extrapolation à rythme constant : Charge actuelle × 12 / ${mois} mois. Hypothèse neutre : on dépense autant chaque mois jusqu'en décembre.`}
                value={proj.lineaire}
                budget={budget}
                colorClass="text-blue-600"
              />
              <ProjectionBadge
                label="Optimiste (−5 %)"
                tip="Projection linéaire × 0,95 : hypothèse d'une légère décélération des dépenses sur les mois restants (retards de livraison, économies réalisées)."
                value={proj.bestCase}
                budget={budget}
                colorClass="text-green-600"
              />
              <ProjectionBadge
                label="Central (+5 %)"
                tip="Projection linéaire × 1,05 : hypothèse d'une légère accélération en fin d'année (commandes supplémentaires, facturations tardives). Scénario le plus probable."
                value={proj.central}
                budget={budget}
                colorClass="text-orange-500"
              />
              <ProjectionBadge
                label="Pessimiste (+15 %)"
                tip="Projection linéaire × 1,15 : hypothèse de commandes imprévues ou de rattrapage en fin d'exercice. Scénario à surveiller si le taux actuel dépasse déjà 70 %."
                value={proj.worstCase}
                budget={budget}
                colorClass="text-red-500"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
