import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Check, ClipboardList, Copy, Download, Megaphone, Plus, Rocket, Trash2 } from 'lucide-react';
import { Campagnes as CampagnesData, indicateurs, SaisieCampagne } from '../../ads/useCampagnes';
import { Catalogue } from '../../studio/useCatalogue';
import { chargerImage } from '../../studio/images';
import { construireSpec, dessiner, exporterPng, FORMATS, policesPretes, Spec, telecharger } from '../../studio/render';
import { Campagne, Creation, OBJECTIFS, Organisation, Produit, StatutCampagne } from '../../platform/types';
import { formatFCFA } from '../../utils';

interface Props {
  organisation: Organisation;
  catalogue: Catalogue;
  data: CampagnesData;
  isAdmin: boolean;
  onOuvrirStudio: () => void;
  onJournal: (action: string, description: string) => void;
}

const inputClass =
  'w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 disabled:bg-slate-50 disabled:text-slate-500';
const labelClass = 'block text-xs font-bold text-slate-600 mb-1.5';
const cardClass = 'bg-white rounded-2xl border border-slate-100 shadow-sm p-5';

const STATUTS: Record<StatutCampagne, { label: string; classe: string }> = {
  brouillon: { label: 'Brouillon', classe: 'bg-slate-100 text-slate-600' },
  lancee: { label: 'En cours', classe: 'bg-emerald-100 text-emerald-700' },
  terminee: { label: 'Terminée', classe: 'bg-blue-100 text-blue-700' },
};

const GENRES = { tous: 'Tous', femmes: 'Femmes', hommes: 'Hommes' } as const;
const PLACEMENTS = {
  auto: 'Automatiques (Advantage+), recommandé',
  facebook: 'Facebook uniquement',
  instagram: 'Instagram uniquement',
} as const;

const slug = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'campagne';

const nombre = (v: string) => (v.trim() === '' ? 0 : Math.max(0, Math.round(Number(v) || 0)));

/** Texte à suivre pas à pas dans Meta Ads Manager. */
function ficheLancement(c: SaisieCampagne) {
  const objectif = OBJECTIFS.find((o) => o.id === c.objectif)!;
  return [
    `CAMPAGNE : ${c.nom}`,
    '',
    `Objectif dans Meta : ${objectif.meta}`,
    `Destination : ${c.destination || 'à renseigner'}`,
    '',
    `Budget quotidien : ${formatFCFA(c.budgetJour)}`,
    `Durée : ${c.dureeJours} jour${c.dureeJours > 1 ? 's' : ''}`,
    `Budget total maximum : ${formatFCFA(c.budgetJour * c.dureeJours)}`,
    '',
    `Zone : ${[c.villes, c.pays].filter(Boolean).join(' — ')}`,
    `Âge : ${c.ageMin} à ${c.ageMax} ans`,
    `Genre : ${GENRES[c.genre]}`,
    `Centres d'intérêt : ${c.interets || 'aucun (ciblage large)'}`,
    `Placements : ${PLACEMENTS[c.placements]}`,
    '',
    `Titre : ${c.titre}`,
    'Texte principal :',
    c.texte || '(à rédiger)',
    '',
    'Visuels : carré ou portrait pour le fil, story pour les stories et Reels.',
  ].join('\n');
}

export default function Campagnes({ organisation, catalogue, data, isAdmin, onOuvrirStudio, onJournal }: Props) {
  const [ouverte, setOuverte] = useState<string | 'nouvelle' | null>(null);
  const { campagnes, loading } = data;
  const { creations, produits } = catalogue;

  if (ouverte) {
    return (
      <Editeur
        key={ouverte}
        organisation={organisation}
        catalogue={catalogue}
        data={data}
        isAdmin={isAdmin}
        campagne={ouverte === 'nouvelle' ? null : campagnes.find((c) => c.id === ouverte) ?? null}
        onClose={() => setOuverte(null)}
        onSaved={setOuverte}
        onJournal={onJournal}
      />
    );
  }

  const creationsUtilisables = creations.filter((c) => produits.some((p) => p.id === c.produitId));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-slate-800">Campagnes</h2>
          <p className="text-sm text-slate-500">Préparez vos publicités Facebook et Instagram, puis suivez ce qu'elles rapportent.</p>
        </div>
        {creationsUtilisables.length > 0 && (
          <button onClick={() => setOuverte('nouvelle')} className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold flex items-center gap-2 cursor-pointer shrink-0">
            <Plus size={16} /> Nouvelle
          </button>
        )}
      </div>

      {loading || catalogue.loading ? (
        <div className="py-16 flex justify-center">
          <div className="w-8 h-8 rounded-full border-3 border-blue-600 border-t-transparent animate-spin" />
        </div>
      ) : creationsUtilisables.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-10 text-center">
          <Megaphone size={32} className="mx-auto text-slate-300" />
          <p className="text-sm font-bold text-slate-700 mt-3">Une campagne part d'une création</p>
          <p className="text-sm text-slate-500 mt-1">Créez et enregistrez d'abord un visuel dans le studio : il servira de publicité.</p>
          <button onClick={onOuvrirStudio} className="mt-4 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold cursor-pointer">
            Ouvrir le studio
          </button>
        </div>
      ) : campagnes.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-10 text-center">
          <Megaphone size={32} className="mx-auto text-slate-300" />
          <p className="text-sm font-bold text-slate-700 mt-3">Aucune campagne pour l'instant</p>
          <p className="text-sm text-slate-500 mt-1">Choisissez une création, une zone et un budget : la fiche de lancement est prête en deux minutes.</p>
          <button onClick={() => setOuverte('nouvelle')} className="mt-4 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold cursor-pointer">
            Préparer ma première campagne
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {campagnes.map((c) => {
            const ind = indicateurs(c);
            return (
              <button key={c.id} onClick={() => setOuverte(c.id)} className={`${cardClass} text-left cursor-pointer hover:border-blue-200 transition-colors`}>
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-bold text-slate-800">{c.nom}</p>
                  <span className={`text-xs font-bold rounded-lg px-2 py-1 shrink-0 ${STATUTS[c.statut].classe}`}>{STATUTS[c.statut].label}</span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {OBJECTIFS.find((o) => o.id === c.objectif)?.label} · {[c.villes, c.pays].filter(Boolean).join(', ')}
                </p>
                <div className="grid grid-cols-3 gap-2 mt-4">
                  <Chiffre label="Budget prévu" valeur={formatFCFA(ind.budgetTotal)} />
                  <Chiffre label="Dépensé" valeur={c.resultats ? formatFCFA(c.resultats.depense) : '—'} />
                  <Chiffre label="Coût / message" valeur={ind.coutParMessage !== null ? formatFCFA(Math.round(ind.coutParMessage)) : '—'} />
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Chiffre({ label, valeur, aide }: { label: string; valeur: string; aide?: string }) {
  return (
    <div className="bg-slate-50 rounded-xl p-3" title={aide}>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-sm font-black text-slate-800 mt-0.5">{valeur}</p>
    </div>
  );
}

interface EditeurProps {
  organisation: Organisation;
  catalogue: Catalogue;
  data: CampagnesData;
  isAdmin: boolean;
  campagne: Campagne | null;
  onClose: () => void;
  onSaved: (id: string) => void;
  onJournal: (action: string, description: string) => void;
}

function Editeur({ organisation, catalogue, data, isAdmin, campagne, onClose, onSaved, onJournal }: EditeurProps) {
  const { produits } = catalogue;
  const creations = useMemo(() => catalogue.creations.filter((c) => produits.some((p) => p.id === c.produitId)), [catalogue.creations, produits]);

  const depart = (): SaisieCampagne => {
    if (campagne) {
      const { id, creePar, createdAt, updatedAt, ...reste } = campagne;
      return reste;
    }
    const premiere = creations[0];
    return {
      nom: premiere ? `${premiere.nomProduit} — ${new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}` : '',
      statut: 'brouillon',
      creationId: premiere?.id ?? '',
      produitId: premiere?.produitId ?? '',
      objectif: 'messages',
      destination: organisation.whatsapp,
      pays: organisation.pays,
      villes: organisation.ville,
      ageMin: 18,
      ageMax: 45,
      genre: 'tous',
      interets: '',
      placements: 'auto',
      budgetJour: 2000,
      dureeJours: 5,
      titre: premiere?.accroche ?? '',
      texte: premiere?.legende ?? '',
      lanceeLe: null,
      termineeLe: null,
      resultats: null,
    };
  };

  const [form, setForm] = useState<SaisieCampagne>(depart);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [spec, setSpec] = useState<Spec | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [res, setRes] = useState(() => ({
    depense: campagne?.resultats ? String(campagne.resultats.depense) : '',
    messages: campagne?.resultats ? String(campagne.resultats.messages) : '',
    commandes: campagne?.resultats ? String(campagne.resultats.commandes) : '',
    chiffreAffaires: campagne?.resultats ? String(campagne.resultats.chiffreAffaires) : '',
  }));

  const verrouillee = form.statut !== 'brouillon';
  const creation: Creation | undefined = creations.find((c) => c.id === form.creationId);
  const produit: Produit | undefined = produits.find((p) => p.id === form.produitId);
  const budgetTotal = form.budgetJour * form.dureeJours;
  const set = <K extends keyof SaisieCampagne>(cle: K, valeur: SaisieCampagne[K]) => setForm((f) => ({ ...f, [cle]: valeur }));

  const flash = (texte: string) => {
    setMessage(texte);
    setTimeout(() => setMessage((m) => (m === texte ? null : m)), 2500);
  };

  // Le visuel de la campagne est celui de la création choisie.
  useEffect(() => {
    let annule = false;
    setSpec(null);
    if (!creation || !produit) return;
    (async () => {
      await policesPretes();
      const photoUrl = creation.photoId ? await catalogue.chargerMedia(creation.photoId).catch(() => null) : null;
      const photo = photoUrl ? await chargerImage(photoUrl).catch(() => null) : null;
      const logoUrl = organisation.marque?.logo;
      const logo = logoUrl ? await chargerImage(logoUrl).catch(() => null) : null;
      if (!annule) setSpec(construireSpec({ produit, textes: creation, modele: creation.modele, organisation, photo, logo }));
    })();
    return () => {
      annule = true;
    };
  }, [creation?.id, creation?.accroche, creation?.modele, produit?.id, produit?.prix, produit?.prixPromo]);

  useEffect(() => {
    if (spec && canvasRef.current) dessiner(canvasRef.current, FORMATS[0], spec);
  }, [spec]);

  const choisirCreation = (id: string) => {
    const c = creations.find((x) => x.id === id);
    if (!c) return;
    setForm((f) => ({ ...f, creationId: c.id, produitId: c.produitId, titre: c.accroche, texte: c.legende }));
  };

  const valider = (): string | null => {
    if (form.nom.trim().length < 2) return 'Donnez un nom à la campagne.';
    if (!creation || !produit) return 'Choisissez une création.';
    if (form.budgetJour <= 0) return 'Indiquez un budget quotidien.';
    if (form.dureeJours < 1) return 'La durée est d’au moins un jour.';
    if (form.ageMin < 18 || form.ageMax > 65 || form.ageMin > form.ageMax) return 'La tranche d’âge doit être comprise entre 18 et 65 ans.';
    return null;
  };

  const enregistrer = async (changements: Partial<SaisieCampagne> = {}) => {
    const probleme = valider();
    if (probleme) {
      setError(probleme);
      return null;
    }
    setBusy(true);
    setError(null);
    try {
      const saisie = { ...form, ...changements, nom: form.nom.trim() };
      const id = await data.enregistrer(saisie, campagne?.id);
      setForm(saisie);
      if (!campagne) onSaved(id);
      return id;
    } catch (err) {
      console.error(err);
      setError("L'enregistrement a échoué. Vérifiez votre connexion puis réessayez.");
      return null;
    } finally {
      setBusy(false);
    }
  };

  const sauver = async () => {
    if (await enregistrer()) flash('Campagne enregistrée');
  };

  const copierFiche = async () => {
    try {
      await navigator.clipboard.writeText(ficheLancement(form));
      flash('Fiche copiée');
    } catch {
      flash('Copie impossible : sélectionnez le texte à la main');
    }
  };

  const telechargerVisuels = async () => {
    if (!spec) return;
    for (const f of FORMATS) {
      telecharger(await exporterPng(f, spec), `${slug(form.nom)}-${f.id}.png`);
      await new Promise((r) => setTimeout(r, 350));
    }
    flash('Les 4 visuels ont été téléchargés');
  };

  const marquerLancee = async () => {
    const probleme = valider();
    if (probleme) return setError(probleme);
    const ok = window.confirm(
      `Confirmez-vous avoir lancé cette campagne dans Meta Ads Manager ?\n\nBudget : ${formatFCFA(form.budgetJour)} par jour pendant ${form.dureeJours} jour(s), soit ${formatFCFA(budgetTotal)} au maximum.\n\nLes réglages seront ensuite verrouillés.`,
    );
    if (!ok) return;
    if (await enregistrer({ statut: 'lancee', lanceeLe: new Date().toISOString() })) {
      onJournal('campagne.lancement', `Campagne « ${form.nom.trim()} » déclarée lancée (${formatFCFA(budgetTotal)} max.)`);
      flash('Campagne marquée comme lancée');
    }
  };

  const enregistrerResultats = async (terminer: boolean) => {
    if (!campagne) return;
    setBusy(true);
    setError(null);
    try {
      const resultats = {
        depense: nombre(res.depense),
        messages: nombre(res.messages),
        commandes: nombre(res.commandes),
        chiffreAffaires: nombre(res.chiffreAffaires),
        majLe: new Date().toISOString(),
      };
      const changements: Partial<Campagne> = { resultats };
      if (terminer) {
        changements.statut = 'terminee';
        changements.termineeLe = new Date().toISOString();
      }
      await data.modifier(campagne.id, changements);
      setForm((f) => ({ ...f, ...changements }));
      if (terminer) onJournal('campagne.fin', `Campagne « ${campagne.nom} » terminée (${formatFCFA(resultats.depense)} dépensés, ${resultats.commandes} commande(s))`);
      flash(terminer ? 'Campagne terminée' : 'Résultats enregistrés');
    } catch (err) {
      console.error(err);
      setError("L'enregistrement des résultats a échoué.");
    } finally {
      setBusy(false);
    }
  };

  const supprimer = async () => {
    if (!campagne || !window.confirm(`Supprimer la campagne « ${campagne.nom} » ?`)) return;
    try {
      await data.supprimer(campagne.id);
      onJournal('campagne.suppression', `Campagne « ${campagne.nom} » supprimée`);
      onClose();
    } catch {
      setError('La suppression a échoué.');
    }
  };

  const ind = indicateurs({ ...(campagne ?? ({} as Campagne)), ...form } as Campagne);
  const objectif = OBJECTIFS.find((o) => o.id === form.objectif)!;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <button onClick={onClose} className="text-sm font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1.5 cursor-pointer">
          <ArrowLeft size={16} /> Campagnes
        </button>
        <span className={`text-xs font-bold rounded-lg px-2 py-1 ${STATUTS[form.statut].classe}`}>{STATUTS[form.statut].label}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] gap-5 items-start">
        <div className="space-y-5">
          {verrouillee && (
            <div className={`${cardClass} space-y-4`}>
              <div>
                <h3 className="text-sm font-black text-slate-800">Résultats</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Reportez la dépense affichée par Meta et ce que vous avez réellement reçu. Un message n'est pas une vente : seules les commandes confirmées comptent.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass} htmlFor="res-depense">Dépensé (FCFA)</label>
                  <input id="res-depense" className={inputClass} inputMode="numeric" value={res.depense} onChange={(e) => setRes({ ...res, depense: e.target.value.replace(/[^\d]/g, '') })} />
                </div>
                <div>
                  <label className={labelClass} htmlFor="res-messages">Messages reçus</label>
                  <input id="res-messages" className={inputClass} inputMode="numeric" value={res.messages} onChange={(e) => setRes({ ...res, messages: e.target.value.replace(/[^\d]/g, '') })} />
                </div>
                <div>
                  <label className={labelClass} htmlFor="res-commandes">Commandes confirmées</label>
                  <input id="res-commandes" className={inputClass} inputMode="numeric" value={res.commandes} onChange={(e) => setRes({ ...res, commandes: e.target.value.replace(/[^\d]/g, '') })} />
                </div>
                <div>
                  <label className={labelClass} htmlFor="res-ca">Chiffre d'affaires (FCFA)</label>
                  <input id="res-ca" className={inputClass} inputMode="numeric" value={res.chiffreAffaires} onChange={(e) => setRes({ ...res, chiffreAffaires: e.target.value.replace(/[^\d]/g, '') })} />
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <Chiffre label="Coût par message" valeur={ind.coutParMessage !== null ? formatFCFA(Math.round(ind.coutParMessage)) : '—'} aide="Dépense ÷ messages reçus" />
                <Chiffre label="Coût par commande" valeur={ind.coutParCommande !== null ? formatFCFA(Math.round(ind.coutParCommande)) : '—'} aide="Dépense ÷ commandes confirmées" />
                <Chiffre label="Messages → commandes" valeur={ind.tauxConversion !== null ? `${Math.round(ind.tauxConversion * 100)} %` : '—'} aide="Commandes ÷ messages" />
                <Chiffre label="Retour sur dépense" valeur={ind.roas !== null ? `× ${ind.roas.toFixed(1).replace('.', ',')}` : '—'} aide="Chiffre d'affaires ÷ dépense" />
              </div>
              <p className="text-xs text-slate-500">Indicateurs calculés à partir des chiffres enregistrés. « — » signifie que la donnée manque pour conclure.</p>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => enregistrerResultats(false)} disabled={busy} className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-xl text-sm font-bold cursor-pointer">
                  Enregistrer les résultats
                </button>
                {form.statut === 'lancee' && (
                  <button onClick={() => enregistrerResultats(true)} disabled={busy} className="px-4 py-2.5 bg-white border border-slate-200 hover:border-slate-300 disabled:opacity-60 text-slate-700 rounded-xl text-sm font-bold cursor-pointer">
                    Enregistrer et terminer la campagne
                  </button>
                )}
              </div>
            </div>
          )}

          <fieldset disabled={verrouillee} className="space-y-5 min-w-0">
            <div className={`${cardClass} space-y-4`}>
              <h3 className="text-sm font-black text-slate-800">1. Publicité</h3>
              <div>
                <label className={labelClass} htmlFor="camp-nom">Nom de la campagne</label>
                <input id="camp-nom" className={inputClass} maxLength={100} value={form.nom} onChange={(e) => set('nom', e.target.value)} />
              </div>
              <div>
                <label className={labelClass} htmlFor="camp-creation">Création utilisée</label>
                <select id="camp-creation" className={inputClass} value={form.creationId} onChange={(e) => choisirCreation(e.target.value)}>
                  {!creation && <option value="">Création supprimée</option>}
                  {creations.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.accroche || c.nomProduit} — {c.nomProduit}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass} htmlFor="camp-titre">Titre</label>
                <input id="camp-titre" className={inputClass} maxLength={90} value={form.titre} onChange={(e) => set('titre', e.target.value)} />
              </div>
              <div>
                <label className={labelClass} htmlFor="camp-texte">Texte principal</label>
                <textarea id="camp-texte" className={`${inputClass} min-h-24`} maxLength={1200} value={form.texte} onChange={(e) => set('texte', e.target.value)} placeholder="Le texte affiché au-dessus du visuel dans la publicité." />
              </div>
            </div>

            <div className={`${cardClass} space-y-4`}>
              <h3 className="text-sm font-black text-slate-800">2. Objectif</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {OBJECTIFS.map((o) => (
                  <button
                    type="button"
                    key={o.id}
                    onClick={() => set('objectif', o.id)}
                    className={`p-3 rounded-xl border-2 text-left cursor-pointer transition-all disabled:cursor-default ${
                      form.objectif === o.id ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <span className="block text-sm font-bold text-slate-800">{o.label}</span>
                    <span className="block text-xs text-slate-500 mt-0.5">{o.description}</span>
                  </button>
                ))}
              </div>
              <div>
                <label className={labelClass} htmlFor="camp-dest">{form.objectif === 'messages' ? 'Numéro WhatsApp' : 'Lien ou numéro de destination'}</label>
                <input id="camp-dest" className={inputClass} maxLength={200} value={form.destination} onChange={(e) => set('destination', e.target.value)} placeholder={form.objectif === 'messages' ? '+237 6 XX XX XX XX' : 'https://…'} />
                {form.objectif === 'messages' && (
                  <p className="text-xs text-slate-500 mt-1.5">Ce numéro doit être un compte WhatsApp Business relié à votre page Facebook, sinon Meta ne proposera pas WhatsApp.</p>
                )}
              </div>
            </div>

            <div className={`${cardClass} space-y-4`}>
              <h3 className="text-sm font-black text-slate-800">3. Audience</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass} htmlFor="camp-pays">Pays</label>
                  <input id="camp-pays" className={inputClass} maxLength={60} value={form.pays} onChange={(e) => set('pays', e.target.value)} />
                </div>
                <div>
                  <label className={labelClass} htmlFor="camp-villes">Villes ou quartiers</label>
                  <input id="camp-villes" className={inputClass} maxLength={200} value={form.villes} onChange={(e) => set('villes', e.target.value)} placeholder="Douala, Yaoundé" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className={labelClass} htmlFor="camp-agemin">Âge min.</label>
                  <input id="camp-agemin" type="number" min={18} max={65} className={inputClass} value={form.ageMin} onChange={(e) => set('ageMin', Number(e.target.value))} />
                </div>
                <div>
                  <label className={labelClass} htmlFor="camp-agemax">Âge max.</label>
                  <input id="camp-agemax" type="number" min={18} max={65} className={inputClass} value={form.ageMax} onChange={(e) => set('ageMax', Number(e.target.value))} />
                </div>
                <div>
                  <label className={labelClass} htmlFor="camp-genre">Genre</label>
                  <select id="camp-genre" className={inputClass} value={form.genre} onChange={(e) => set('genre', e.target.value as SaisieCampagne['genre'])}>
                    {Object.entries(GENRES).map(([id, label]) => (
                      <option key={id} value={id}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className={labelClass} htmlFor="camp-interets">Centres d'intérêt (facultatif)</label>
                <input id="camp-interets" className={inputClass} maxLength={200} value={form.interets} onChange={(e) => set('interets', e.target.value)} placeholder="Mode, sneakers, sport" />
                <p className="text-xs text-slate-500 mt-1.5">Laissez vide pour un ciblage large : sur une ville, c'est souvent le plus efficace avec un petit budget.</p>
              </div>
              <div>
                <label className={labelClass} htmlFor="camp-placements">Placements</label>
                <select id="camp-placements" className={inputClass} value={form.placements} onChange={(e) => set('placements', e.target.value as SaisieCampagne['placements'])}>
                  {Object.entries(PLACEMENTS).map(([id, label]) => (
                    <option key={id} value={id}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className={`${cardClass} space-y-4`}>
              <h3 className="text-sm font-black text-slate-800">4. Budget</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass} htmlFor="camp-budget">Budget par jour (FCFA)</label>
                  <input id="camp-budget" className={inputClass} inputMode="numeric" value={form.budgetJour || ''} onChange={(e) => set('budgetJour', nombre(e.target.value.replace(/[^\d]/g, '')))} />
                </div>
                <div>
                  <label className={labelClass} htmlFor="camp-duree">Durée (jours)</label>
                  <input id="camp-duree" className={inputClass} inputMode="numeric" value={form.dureeJours || ''} onChange={(e) => set('dureeJours', Math.min(90, nombre(e.target.value.replace(/[^\d]/g, ''))))} />
                </div>
              </div>
              <p className="text-sm text-slate-700">
                Dépense maximale : <strong className="text-slate-900">{formatFCFA(budgetTotal)}</strong>
              </p>
              <p className="text-xs text-slate-500">
                Ce budget est payé directement à Meta avec le moyen de paiement de votre compte publicitaire. Aucun résultat n'est garanti : il dépend de l'offre, du visuel et du marché.
              </p>
            </div>
          </fieldset>
        </div>

        {/* Récapitulatif */}
        <div className={`${cardClass} lg:sticky lg:top-20 space-y-4`}>
          <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
            <ClipboardList size={16} className="text-blue-600" /> Récapitulatif
          </h3>
          <div className="bg-slate-100 rounded-xl p-3 flex justify-center">
            <canvas ref={canvasRef} aria-label="Visuel de la campagne" className="w-full max-w-[14rem] rounded-lg shadow-md aspect-square" />
          </div>
          <dl className="text-sm space-y-1.5">
            {[
              ['Objectif', objectif.label],
              ['Zone', [form.villes, form.pays].filter(Boolean).join(', ') || '—'],
              ['Audience', `${form.ageMin}–${form.ageMax} ans · ${GENRES[form.genre]}`],
              ['Budget', `${formatFCFA(form.budgetJour)} / jour × ${form.dureeJours} j`],
              ['Total maximum', formatFCFA(budgetTotal)],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-3">
                <dt className="text-slate-500 shrink-0">{k}</dt>
                <dd className="font-bold text-slate-800 text-right">{v}</dd>
              </div>
            ))}
          </dl>

          {error && <p className="text-sm text-rose-600 font-medium">{error}</p>}

          {!verrouillee && (
            <button onClick={sauver} disabled={busy} className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-xl text-sm font-bold cursor-pointer">
              {busy ? 'Enregistrement…' : campagne ? 'Enregistrer' : 'Enregistrer le brouillon'}
            </button>
          )}

          <div className="border-t border-slate-100 pt-4 space-y-2">
            <p className="text-xs text-slate-500">
              Le lancement direct depuis l'application n'est pas encore disponible. Pour l'instant, créez la publicité dans Meta Ads Manager en suivant la fiche, avec les visuels téléchargés.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={copierFiche} className="py-2.5 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 rounded-xl text-sm font-bold flex items-center justify-center gap-1.5 cursor-pointer">
                <Copy size={15} /> Copier la fiche
              </button>
              <button onClick={telechargerVisuels} disabled={!spec} className="py-2.5 bg-white border border-slate-200 hover:border-slate-300 disabled:opacity-50 text-slate-700 rounded-xl text-sm font-bold flex items-center justify-center gap-1.5 cursor-pointer">
                <Download size={15} /> Visuels
              </button>
            </div>
            {campagne && form.statut === 'brouillon' && (
              <button onClick={marquerLancee} disabled={busy} className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 cursor-pointer">
                <Rocket size={15} /> Je l'ai lancée dans Meta
              </button>
            )}
          </div>

          <p className="text-sm text-emerald-600 font-medium h-5 flex items-center gap-1.5" role="status">
            {message && (
              <>
                <Check size={14} /> {message}
              </>
            )}
          </p>

          {campagne && isAdmin && (
            <button onClick={supprimer} className="text-xs font-bold text-slate-400 hover:text-rose-600 flex items-center gap-1.5 cursor-pointer">
              <Trash2 size={13} /> Supprimer la campagne
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
