import { useState, useRef, useEffect } from 'react';
import { HelpCircle, X } from 'lucide-react';

const GLOSSAIRE = [
  {
    terme: 'Budget',
    color: 'blue',
    def: 'Dotation budgétaire initiale de l\'exercice. Pour l\'OPEX, c\'est le budget EPRD voté (comptes H6x / I6x). Pour le CAPEX, c\'est l\'enveloppe d\'investissement validée (comptes H2x). Saisie manuellement ou importée depuis le référentiel EPRD.',
  },
  {
    terme: 'Dépensé (Mandaté)',
    color: 'orange',
    def: 'Montants réellement mandatés et payés dans la comptabilité source — colonne "Mandaté net" de l\'extraction. Correspond aux dépenses effectives, après liquidation et ordonnancement. Pour le CAPEX, il s\'agit des dépenses directes sur les projets d\'investissement.',
  },
  {
    terme: 'Engagé (non reçu)',
    color: 'yellow',
    def: 'Engagements juridiquement fermes mais non encore reçus / non encore facturés : commandes en cours de livraison, marchés notifiés non soldés. Colonne "Engagé non reçu" dans la comptabilité source. Ces montants sont déjà consommés budgétairement même si le paiement n\'est pas intervenu.',
  },
  {
    terme: 'Disponible',
    color: 'green',
    def: 'Budget restant mobilisable : Budget − Mandaté − Engagé. Un disponible négatif signifie que le budget est dépassé (sur-engagement). C\'est l\'indicateur de pilotage principal pour le contrôleur de gestion.',
  },
  {
    terme: 'Charge engagée',
    color: 'indigo',
    def: 'Consommation totale prévisible = Mandaté + Engagé non reçu. Représente l\'intégralité des ressources budgétaires déjà mobilisées ou en cours de mobilisation. Utilisé dans les projections annuelles pour estimer l\'atterrissage fin d\'exercice.',
  },
  {
    terme: 'Taux d\'utilisation',
    def: '(Mandaté + Engagé) / Budget × 100. Seuil orange (avertissement) : 75 %. Seuil rouge (critique) : 90 %. Ces seuils sont configurables dans les paramètres de l\'application. Au-delà de 100 %, le budget est formellement dépassé.',
  },
  {
    terme: 'Budget consolidé DSI',
    def: 'Synthèse OPEX + CAPEX. Additionne l\'ensemble des dotations et consommations, tous types de dépenses confondus. Donne une vision macro de la capacité financière totale de la DSI sur l\'exercice en cours.',
  },
];

const COLOR_MAP = {
  blue:   'bg-blue-50 border-blue-200 text-blue-800',
  orange: 'bg-orange-50 border-orange-200 text-orange-800',
  yellow: 'bg-yellow-50 border-yellow-200 text-yellow-800',
  green:  'bg-green-50 border-green-200 text-green-800',
  indigo: 'bg-indigo-50 border-indigo-200 text-indigo-800',
};

export default function NoticeVueEnsemble() {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(p => !p)}
        title="Notice — explication des montants"
        className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded border transition-colors
          ${open
            ? 'bg-blue-100 border-blue-300 text-blue-700'
            : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50 hover:border-gray-300'}`}
      >
        <HelpCircle size={13} />
        Notice
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-[480px] max-h-[70vh] overflow-y-auto
          bg-white border border-gray-200 rounded-xl shadow-xl z-50">
          <div className="sticky top-0 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HelpCircle size={14} className="text-blue-500" />
              <span className="text-sm font-semibold text-gray-800">Explication des montants — Vue d&apos;ensemble</span>
            </div>
            <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600">
              <X size={14} />
            </button>
          </div>

          <div className="p-4 space-y-3">
            <p className="text-xs text-gray-500 italic">
              Tous les montants sont calculés à partir des données OPEX/CAPEX saisies ou importées
              depuis l&apos;fichier de commandes.
            </p>

            {GLOSSAIRE.map(g => (
              <div
                key={g.terme}
                className={`rounded-lg border p-3 ${g.color ? COLOR_MAP[g.color] : 'bg-gray-50 border-gray-200 text-gray-700'}`}
              >
                <div className="text-xs font-bold mb-1">{g.terme}</div>
                <p className="text-[11px] leading-relaxed opacity-90">{g.def}</p>
              </div>
            ))}

            <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
              <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-wide mb-2">
                Formules de calcul
              </p>
              <div className="space-y-1 text-[11px] text-gray-600 font-mono">
                <div>Disponible = Budget − Mandaté − Engagé</div>
                <div>Charge engagée = Mandaté + Engagé</div>
                <div>Taux = Charge engagée / Budget × 100</div>
                <div>Consolidé = OPEX + CAPEX (somme directe)</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
