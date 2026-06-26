import { useState } from 'react';
import { X, Users, GitBranch, Key, Map, ChevronDown, ChevronRight, Lightbulb, AlertTriangle, CheckCircle, PlayCircle } from 'lucide-react';

const Section = ({ icon: Icon, title, level, color, children }) => {
  const [open, setOpen] = useState(true);
  const colors = {
    green:  { border: 'border-green-300',  bg: 'bg-green-50',  badge: 'bg-green-100 text-green-800 border-green-300',  icon: 'text-green-700' },
    blue:   { border: 'border-blue-300',   bg: 'bg-blue-50',   badge: 'bg-blue-100 text-blue-800 border-blue-300',     icon: 'text-blue-700'  },
    yellow: { border: 'border-yellow-300', bg: 'bg-yellow-50', badge: 'bg-yellow-100 text-yellow-800 border-yellow-300', icon: 'text-yellow-700' },
    gray:   { border: 'border-gray-300',   bg: 'bg-gray-50',   badge: 'bg-gray-100 text-gray-700 border-gray-300',     icon: 'text-gray-600'  },
  };
  const c = colors[color];
  return (
    <div className={`border ${c.border} rounded-lg overflow-hidden`}>
      <button
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center gap-3 px-4 py-3 ${c.bg} text-left`}
      >
        <Icon size={18} className={c.icon} />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            {level && <span className={`text-xs font-bold px-2 py-0.5 rounded border ${c.badge}`}>{level}</span>}
            <span className="font-semibold text-gray-800 text-sm">{title}</span>
          </div>
        </div>
        {open ? <ChevronDown size={16} className="text-gray-400" /> : <ChevronRight size={16} className="text-gray-400" />}
      </button>
      {open && <div className="px-5 py-4 text-sm text-gray-700 space-y-3 bg-white">{children}</div>}
    </div>
  );
};

const Code = ({ children }) => (
  <code className="bg-gray-100 text-indigo-700 px-1.5 py-0.5 rounded text-xs font-mono">{children}</code>
);

const Tip = ({ children }) => (
  <div className="flex gap-2 bg-amber-50 border border-amber-200 rounded p-2.5 text-xs text-amber-800">
    <Lightbulb size={14} className="text-amber-500 flex-shrink-0 mt-0.5" />
    <span>{children}</span>
  </div>
);

const Warn = ({ children }) => (
  <div className="flex gap-2 bg-red-50 border border-red-200 rounded p-2.5 text-xs text-red-800">
    <AlertTriangle size={14} className="text-red-500 flex-shrink-0 mt-0.5" />
    <span>{children}</span>
  </div>
);

const Ok = ({ children }) => (
  <div className="flex gap-2 bg-green-50 border border-green-200 rounded p-2.5 text-xs text-green-800">
    <CheckCircle size={14} className="text-green-500 flex-shrink-0 mt-0.5" />
    <span>{children}</span>
  </div>
);

export default function NoticeReclassement({ onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 overflow-y-auto py-6 px-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl">
        {/* En-tête */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-indigo-700 rounded-t-xl">
          <div>
            <h2 className="text-lg font-bold text-white">Notice d&apos;utilisation — Moteur de reclassement</h2>
            <p className="text-xs text-indigo-200 mt-0.5">Comment configurer le moteur pour un reclassement analytique optimal</p>
          </div>
          <button onClick={onClose} className="text-indigo-200 hover:text-white p-1 rounded transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4 max-h-[80vh] overflow-y-auto">

          {/* Principe général */}
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 text-sm text-indigo-900">
            <p className="font-semibold mb-2">Principe du pipeline à 4 niveaux</p>
            <p className="text-xs leading-relaxed">
              Chaque ligne importée depuis le logiciel source est soumise au pipeline dans l&apos;ordre ci-dessous.
              <strong> Dès qu&apos;une règle correspond, la famille est attribuée et les niveaux suivants sont ignorés.</strong>
              Configurez les niveaux du plus spécifique (Niveau 1) au plus générique (Niveau 4).
            </p>
            <div className="flex flex-wrap gap-2 mt-3 text-xs">
              <span className="bg-green-100 text-green-800 border border-green-300 px-2 py-1 rounded">1 — Référentiel fournisseurs</span>
              <span className="text-gray-400">→</span>
              <span className="bg-blue-100 text-blue-800 border border-blue-300 px-2 py-1 rounded">2 — Règles contextuelles</span>
              <span className="text-gray-400">→</span>
              <span className="bg-yellow-100 text-yellow-800 border border-yellow-300 px-2 py-1 rounded">3 — Mots-clés</span>
              <span className="text-gray-400">→</span>
              <span className="bg-gray-100 text-gray-700 border border-gray-300 px-2 py-1 rounded">4 — Mapping comptes</span>
            </div>
          </div>

          {/* Niveau 1 */}
          <Section icon={Users} title="Référentiel fournisseurs" level="Niveau 1 — Prioritaire" color="green">
            <p>Associe un fournisseur à une famille analytique de façon permanente. C&apos;est le niveau le plus fiable car il s&apos;appuie sur l&apos;identité exacte du fournisseur.</p>

            <div className="space-y-1.5">
              <p className="font-medium text-gray-900">Champs à renseigner :</p>
              <ul className="space-y-1 ml-3 text-xs list-disc">
                <li><Code>Nom fournisseur</Code> — Nom exact tel qu&apos;il apparaît dans la comptabilité source (ex. <Code>CISCO SYSTEMS</Code>). La casse est ignorée.</li>
                <li><Code>Famille</Code> — La famille analytique à attribuer (ex. <Code>Infrastructures</Code>, <Code>Applications</Code>).</li>
                <li><Code>Sous-catégorie</Code> — Optionnel, pour affiner (ex. <Code>Réseau</Code>, <Code>Sécurité</Code>).</li>
                <li><Code>Multi-nature</Code> — Cocher si le fournisseur est partiellement OPEX et partiellement CAPEX. Définir ensuite les pourcentages par nature.</li>
              </ul>
            </div>

            <Tip>Commencez par les fournisseurs récurrents (maintenance, licences). Un référentiel complet minimise le recours aux niveaux suivants.</Tip>
            <Ok>Un fournisseur dans le référentiel sera toujours classé de la même façon, quelle que soit sa désignation.</Ok>
          </Section>

          {/* Niveau 2 */}
          <Section icon={GitBranch} title="Règles contextuelles" level="Niveau 2" color="blue">
            <p>Applique une famille selon des <strong>conditions</strong> sur les champs de la ligne (compte ordonnateur, fournisseur, désignation, famille déjà attribuée). Utile quand un même fournisseur doit être classé différemment selon le contexte.</p>

            <div className="space-y-1.5">
              <p className="font-medium text-gray-900">Format des conditions :</p>
              <ul className="space-y-1.5 ml-3 text-xs list-disc">
                <li><Code>COMPTE=H62610000</Code> — La ligne doit avoir exactement ce compte ordonnateur.</li>
                <li><Code>FOURNISSEUR CONTIENT=ORANGE</Code> — Le nom du fournisseur doit contenir &quot;ORANGE&quot;.</li>
                <li><Code>DESIGNATION CONTIENT=MAINTENANCE</Code> — La désignation doit contenir ce mot.</li>
                <li>Plusieurs conditions séparées par <Code>|</Code> = logique <strong>OU</strong>.</li>
              </ul>
              <p className="font-medium text-gray-900 mt-2">Priorité :</p>
              <p className="text-xs">Les règles sont évaluées du numéro de priorité le plus bas au plus élevé. En cas de conflit, la règle de priorité inférieure l&apos;emporte.</p>
            </div>

            <Tip>Utiliser ce niveau pour les fournisseurs mixtes : ex. ORANGE facture à la fois des abonnements télécom (Infrastructures) et des prestations projet (Prestations externes).</Tip>
            <Warn>Une règle sans condition (DEFAUT) s&apos;applique à toutes les lignes — à éviter ou placer en dernière priorité.</Warn>
          </Section>

          {/* Niveau 3 */}
          <Section icon={Key} title="Règles mots-clés" level="Niveau 3" color="yellow">
            <p>Recherche un ou plusieurs mots-clés dans la <strong>désignation</strong> de la commande. Utile pour les fournisseurs inconnus ou ponctuels.</p>

            <div className="space-y-1.5">
              <p className="font-medium text-gray-900">Exemples :</p>
              <ul className="space-y-1 ml-3 text-xs list-disc">
                <li>Mots-clés <Code>LICENCE</Code>, <Code>ABONNEMENT</Code> → Famille <Code>Applications</Code></li>
                <li>Mots-clés <Code>FORMATION</Code>, <Code>STAGE</Code> → Famille <Code>Formation</Code></li>
                <li>Mots-clés <Code>MAINTENANCE</Code>, <Code>SUPPORT</Code> → Famille <Code>Infrastructures</Code></li>
                <li>Mots-clé <Code>CONSEIL</Code> → Famille <Code>Prestations externes récurrentes</Code></li>
              </ul>
              <p className="font-medium text-gray-900 mt-2">Priorité :</p>
              <p className="text-xs">Même logique qu&apos;au niveau 2 : priorité numérique croissante. Les mots-clés plus spécifiques doivent avoir une priorité plus basse.</p>
            </div>

            <Tip>La recherche est insensible à la casse. <Code>LICENCE</Code> trouve &quot;Licence&quot;, &quot;licence&quot;, &quot;LICENCE LOGICIELLE&quot;.</Tip>
            <Warn>Évitez les mots trop génériques (<Code>INFO</Code>, <Code>SER</Code>) qui créeraient des faux positifs.</Warn>
          </Section>

          {/* Niveau 4 */}
          <Section icon={Map} title="Mapping comptes ordonnateurs" level="Niveau 4 — Fallback" color="gray">
            <p>Dernier recours : associe un compte ordonnateur à une famille par défaut. S&apos;applique si les niveaux 1, 2 et 3 n&apos;ont rien trouvé.</p>

            <div className="space-y-1.5">
              <p className="font-medium text-gray-900">Champs :</p>
              <ul className="space-y-1 ml-3 text-xs list-disc">
                <li><Code>Compte ordonnateur</Code> — Le numéro de compte comptable (ex. <Code>H62610000</Code>).</li>
                <li><Code>Famille par défaut</Code> — La famille à attribuer en l&apos;absence de toute autre correspondance.</li>
                <li><Code>Sous-catégorie par défaut</Code> — Optionnel.</li>
              </ul>
            </div>

            <Ok>Renseigner tous les comptes H6x et H2x présents dans votre plan comptable garantit qu&apos;aucune ligne ne finit en &quot;Non classé&quot;.</Ok>
            <Tip>Exportez votre plan comptable et importez les lignes en masse via le bouton prévu dans cet onglet.</Tip>
          </Section>

          {/* Simuler & appliquer */}
          <Section icon={PlayCircle} title="Simuler & appliquer" level="Test & application" color="blue">
            <p>Avant d&apos;appliquer le reclassement à vos données réelles, utilisez la simulation pour vérifier le résultat sur un échantillon ou la totalité de vos lignes.</p>

            <div className="space-y-1.5 text-xs">
              <p className="font-medium text-gray-900">Étapes recommandées :</p>
              <ol className="list-decimal ml-4 space-y-1">
                <li>Importez votre fichier de commandes via le bouton &quot;Importer un fichier de commandes&quot; sur la page d&apos;accueil.</li>
                <li>Configurez le Référentiel fournisseurs (Niveau 1) pour vos fournisseurs récurrents.</li>
                <li>Ajoutez les règles contextuelles (Niveau 2) pour les cas particuliers.</li>
                <li>Complétez avec des mots-clés (Niveau 3) pour les désignations typiques.</li>
                <li>Renseignez le Mapping comptes (Niveau 4) comme filet de sécurité.</li>
                <li>Ouvrez <strong>Simuler &amp; appliquer</strong>, lancez la simulation, vérifiez que le taux de &quot;Non classé&quot; est minimal.</li>
                <li>Si satisfaisant, cliquez &quot;Appliquer&quot; pour mettre à jour toutes vos lignes OPEX.</li>
              </ol>
            </div>

            <Warn>L&apos;application du reclassement modifie la famille analytique de toutes les lignes OPEX. Cette action est réversible en relançant le moteur avec une configuration différente.</Warn>
            <Tip>La vue &quot;Vue analytique&quot; et la vue &quot;Matrice&quot; se mettent à jour immédiatement après chaque application.</Tip>
          </Section>

          {/* Bonnes pratiques */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-xs text-gray-700 space-y-2">
            <p className="font-semibold text-gray-900 text-sm">Bonnes pratiques</p>
            <ul className="space-y-1.5 list-disc ml-4">
              <li>Choisir des <strong>noms de familles stables</strong> dans le temps pour garantir la comparabilité inter-exercices.</li>
              <li>Relancer le moteur après chaque import des commandes pour que les nouvelles lignes soient classées.</li>
              <li>La colonne <strong>source</strong> dans la simulation indique quel niveau a classé chaque ligne (<Code>referentiel</Code>, <Code>regle_multinature</Code>, <Code>mots_cles</Code>, <Code>mapping_compte</Code>, <Code>non_classe</Code>).</li>
              <li>Viser moins de <strong>5% de lignes &quot;Non classé&quot;</strong> en valeur pour une vue analytique exploitable.</li>
            </ul>
          </div>

        </div>

        <div className="px-6 py-4 border-t flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
