/**
 * Gestion des catégories (familles analytiques) & sous-catégories — référentiel
 * éditable du moteur de reclassement. Source de vérité = la nomenclature.
 * Renommage/suppression cascadent (règles + données) via les handlers fournis.
 */

import { useState } from 'react';
import { Plus, Pencil, Trash2, Check, X, ChevronRight, ChevronDown, AlertTriangle } from 'lucide-react';

const PERIMETRES = ['', 'Run', 'Build', 'Run + Build'];

const sousLabel = (s) => (typeof s === 'string' ? s : s.label);

export default function GestionNomenclature({
  nomenclature = [], usageByFamille = {},
  onAddFamille, onRenameFamille, onRemoveFamille,
  onAddSousCategorie, onRenameSousCategorie, onRemoveSousCategorie,
}) {
  const [newFamille, setNewFamille] = useState('');
  const [open, setOpen] = useState({});
  const [editFam, setEditFam] = useState(null);      // { old, value }
  const [editSc, setEditSc] = useState(null);        // { famille, old, value }
  const [newSc, setNewSc] = useState({});            // { [famille]: { label, perimetre } }

  const toggle = (f) => setOpen(o => ({ ...o, [f]: !o[f] }));

  const addFamille = () => { const v = newFamille.trim(); if (v) { onAddFamille?.(v); setNewFamille(''); } };
  const saveFam = () => { if (editFam?.value.trim()) onRenameFamille?.(editFam.old, editFam.value.trim()); setEditFam(null); };
  const removeFam = (f) => {
    const n = usageByFamille[f] || 0;
    const msg = n > 0
      ? `Supprimer « ${f} » ? ${n} élément(s) seront réaffectés à « Hors périmètre ».`
      : `Supprimer la catégorie « ${f} » ?`;
    if (window.confirm(msg)) onRemoveFamille?.(f);
  };
  const saveSc = () => { if (editSc?.value.trim()) onRenameSousCategorie?.(editSc.famille, editSc.old, editSc.value.trim()); setEditSc(null); };
  const addSc = (famille) => {
    const draft = newSc[famille];
    if (!draft?.label?.trim()) return;
    onAddSousCategorie?.(famille, { label: draft.label.trim(), perimetre: draft.perimetre || '' });
    setNewSc(s => ({ ...s, [famille]: { label: '', perimetre: '' } }));
  };

  const inputCls = 'text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500';

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold text-gray-800">Catégories & sous-catégories</h3>
        <p className="text-xs text-gray-500 mt-0.5">
          Référentiel des familles analytiques (catégories) et de leurs sous-catégories. Utilisé par tout le moteur.
          Renommer ou supprimer met à jour automatiquement les règles et les données affectées.
        </p>
      </div>

      {/* Ajout d'une catégorie */}
      <div className="flex items-center gap-2">
        <input className={`${inputCls} flex-1`} placeholder="Nouvelle catégorie (ex. Téléphonie)"
          value={newFamille} onChange={e => setNewFamille(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') addFamille(); }} />
        <button onClick={addFamille} className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-lg">
          <Plus size={13} /> Ajouter une catégorie
        </button>
      </div>

      {nomenclature.length === 0 && <p className="text-xs text-gray-400 italic">Aucune catégorie. Ajoutez-en une ci-dessus.</p>}

      <div className="space-y-2">
        {nomenclature.map(n => {
          const fam = n.famille;
          const sousCats = n.sousCategoriesDisponibles || [];
          const usage = usageByFamille[fam] || 0;
          const isOpen = !!open[fam];
          return (
            <div key={fam} className="border border-gray-200 rounded-lg">
              {/* Ligne catégorie */}
              <div className="flex items-center gap-2 px-3 py-2">
                <button onClick={() => toggle(fam)} className="text-gray-400 hover:text-gray-600">
                  {isOpen ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                </button>
                {editFam?.old === fam ? (
                  <>
                    <input className={`${inputCls} flex-1`} value={editFam.value} autoFocus
                      onChange={e => setEditFam(s => ({ ...s, value: e.target.value }))}
                      onKeyDown={e => { if (e.key === 'Enter') saveFam(); if (e.key === 'Escape') setEditFam(null); }} />
                    <button onClick={saveFam} className="text-green-600 hover:text-green-800"><Check size={14} /></button>
                    <button onClick={() => setEditFam(null)} className="text-gray-400 hover:text-gray-600"><X size={14} /></button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 text-sm font-medium text-gray-800">{fam}</span>
                    <span className="text-xs text-gray-400">{sousCats.length} sous-cat. · {usage} usage{usage > 1 ? 's' : ''}</span>
                    <button onClick={() => setEditFam({ old: fam, value: fam })} className="text-gray-400 hover:text-blue-600"><Pencil size={13} /></button>
                    <button onClick={() => removeFam(fam)} className="text-gray-400 hover:text-red-600"><Trash2 size={13} /></button>
                  </>
                )}
              </div>

              {/* Sous-catégories */}
              {isOpen && (
                <div className="px-3 pb-3 pl-9 space-y-1.5">
                  {sousCats.length === 0 && <p className="text-xs text-gray-400 italic">Aucune sous-catégorie.</p>}
                  {sousCats.map(s => {
                    const label = sousLabel(s);
                    const perim = typeof s === 'object' ? s.perimetre : '';
                    const editing = editSc && editSc.famille === fam && editSc.old === label;
                    return (
                      <div key={label} className="flex items-center gap-2">
                        {editing ? (
                          <>
                            <input className={`${inputCls} flex-1`} value={editSc.value} autoFocus
                              onChange={e => setEditSc(st => ({ ...st, value: e.target.value }))}
                              onKeyDown={e => { if (e.key === 'Enter') saveSc(); if (e.key === 'Escape') setEditSc(null); }} />
                            <button onClick={saveSc} className="text-green-600 hover:text-green-800"><Check size={13} /></button>
                            <button onClick={() => setEditSc(null)} className="text-gray-400 hover:text-gray-600"><X size={13} /></button>
                          </>
                        ) : (
                          <>
                            <span className="flex-1 text-xs text-gray-700">{label}{perim ? <span className="ml-1 text-[10px] text-gray-400">· {perim}</span> : null}</span>
                            <button onClick={() => setEditSc({ famille: fam, old: label, value: label })} className="text-gray-400 hover:text-blue-600"><Pencil size={12} /></button>
                            <button onClick={() => onRemoveSousCategorie?.(fam, label)} className="text-gray-400 hover:text-red-600"><Trash2 size={12} /></button>
                          </>
                        )}
                      </div>
                    );
                  })}

                  {/* Ajout sous-catégorie */}
                  <div className="flex items-center gap-2 pt-1">
                    <input className={`${inputCls} flex-1`} placeholder="Nouvelle sous-catégorie"
                      value={newSc[fam]?.label || ''}
                      onChange={e => setNewSc(s => ({ ...s, [fam]: { ...s[fam], label: e.target.value } }))}
                      onKeyDown={e => { if (e.key === 'Enter') addSc(fam); }} />
                    <select className={inputCls} value={newSc[fam]?.perimetre || ''}
                      onChange={e => setNewSc(s => ({ ...s, [fam]: { ...s[fam], perimetre: e.target.value } }))}>
                      {PERIMETRES.map(p => <option key={p} value={p}>{p || '— périmètre —'}</option>)}
                    </select>
                    <button onClick={() => addSc(fam)} className="flex items-center gap-1 px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs rounded">
                      <Plus size={12} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-xs text-gray-400 flex items-center gap-1">
        <AlertTriangle size={12} /> « Hors périmètre » reste disponible en repli et n'est pas géré ici.
      </p>
    </div>
  );
}
