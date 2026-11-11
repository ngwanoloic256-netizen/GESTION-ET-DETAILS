import React, { useEffect, useRef, useState } from 'react';
import { ImagePlus, Package, Pencil, Plus, Sparkles, Trash2, X } from 'lucide-react';
import { Catalogue, NouvellePhoto, SaisieProduit } from '../../studio/useCatalogue';
import { preparerPhoto } from '../../studio/images';
import { Produit } from '../../platform/types';
import { formatFCFA } from '../../utils';

interface Props {
  catalogue: Catalogue;
  isAdmin: boolean;
  onCreerVisuel: (produitId: string) => void;
  onJournal: (action: string, description: string) => void;
}

const PHOTOS_MAX = 4;
const inputClass =
  'w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500';
const labelClass = 'block text-xs font-bold text-slate-600 mb-1.5';

export default function Produits({ catalogue, isAdmin, onCreerVisuel, onJournal }: Props) {
  const { produits, loading } = catalogue;
  const [edition, setEdition] = useState<Produit | 'nouveau' | null>(null);

  const supprimer = async (p: Produit) => {
    if (!window.confirm(`Supprimer « ${p.nom} » et ses photos ?`)) return;
    try {
      await catalogue.supprimerProduit(p);
      onJournal('produit.suppression', `Produit « ${p.nom} » supprimé`);
    } catch (err) {
      console.error(err);
      alert('La suppression a échoué.');
    }
  };

  if (edition) {
    return <FicheProduit catalogue={catalogue} produit={edition === 'nouveau' ? null : edition} onClose={() => setEdition(null)} />;
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-slate-800">Produits</h2>
          <p className="text-sm text-slate-500">Le catalogue sert de base à vos visuels et à vos textes publicitaires.</p>
        </div>
        <button
          onClick={() => setEdition('nouveau')}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold flex items-center gap-2 cursor-pointer shrink-0"
        >
          <Plus size={16} /> Ajouter
        </button>
      </div>

      {loading ? (
        <div className="py-16 flex justify-center">
          <div className="w-8 h-8 rounded-full border-3 border-blue-600 border-t-transparent animate-spin" />
        </div>
      ) : produits.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-10 text-center">
          <Package size={32} className="mx-auto text-slate-300" />
          <p className="text-sm font-bold text-slate-700 mt-3">Aucun produit pour l'instant</p>
          <p className="text-sm text-slate-500 mt-1">Ajoutez un produit avec sa photo et son prix pour créer votre premier visuel.</p>
          <button onClick={() => setEdition('nouveau')} className="mt-4 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold cursor-pointer">
            Ajouter mon premier produit
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {produits.map((p) => (
            <div key={p.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
              <div className="aspect-[4/3] bg-slate-100 flex items-center justify-center">
                {p.vignette ? <img src={p.vignette} alt="" className="w-full h-full object-cover" /> : <Package size={36} className="text-slate-300" />}
              </div>
              <div className="p-4 flex-1 flex flex-col">
                <p className="text-sm font-bold text-slate-800 line-clamp-2">{p.nom}</p>
                <p className="text-sm mt-1">
                  <span className="font-black text-blue-600">{formatFCFA(p.prixPromo ?? p.prix)}</span>
                  {p.prixPromo !== null && <span className="ml-2 text-xs text-slate-400 line-through">{formatFCFA(p.prix)}</span>}
                </p>
                <div className="flex items-center gap-2 mt-4">
                  <button
                    onClick={() => onCreerVisuel(p.id)}
                    className="flex-1 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Sparkles size={14} /> Créer un visuel
                  </button>
                  <button onClick={() => setEdition(p)} title="Modifier" className="p-2 text-slate-400 hover:text-blue-600 cursor-pointer">
                    <Pencil size={16} />
                  </button>
                  {isAdmin && (
                    <button onClick={() => supprimer(p)} title="Supprimer" className="p-2 text-slate-400 hover:text-rose-600 cursor-pointer">
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

type PhotoFiche = { cle: string; apercu: string; existante?: string; nouvelle?: NouvellePhoto };

function FicheProduit({ catalogue, produit, onClose }: { catalogue: Catalogue; produit: Produit | null; onClose: () => void }) {
  const [nom, setNom] = useState(produit?.nom ?? '');
  const [prix, setPrix] = useState(produit ? String(produit.prix) : '');
  const [prixPromo, setPrixPromo] = useState(produit?.prixPromo != null ? String(produit.prixPromo) : '');
  const [description, setDescription] = useState(produit?.description ?? '');
  const [variantes, setVariantes] = useState(produit?.variantes ?? '');
  const [livraison, setLivraison] = useState(produit?.livraison ?? '');
  const [photos, setPhotos] = useState<PhotoFiche[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Photos déjà enregistrées : on charge leur aperçu.
  useEffect(() => {
    if (!produit) return;
    let annule = false;
    (async () => {
      const chargees: PhotoFiche[] = [];
      for (const id of produit.photos) {
        const dataUrl = await catalogue.chargerMedia(id).catch(() => null);
        if (dataUrl) chargees.push({ cle: id, apercu: dataUrl, existante: id });
      }
      if (!annule) setPhotos(chargees);
    })();
    return () => {
      annule = true;
    };
  }, [produit?.id]);

  const ajouterPhotos = async (files: FileList | null) => {
    if (!files) return;
    setError(null);
    const place = PHOTOS_MAX - photos.length;
    try {
      const ajoutees: PhotoFiche[] = [];
      for (const file of Array.from(files).slice(0, place)) {
        const p = await preparerPhoto(file);
        ajoutees.push({ cle: `${file.name}-${file.lastModified}-${Math.random()}`, apercu: p.dataUrl, nouvelle: p });
      }
      setPhotos((prev) => [...prev, ...ajoutees]);
    } catch (err: any) {
      setError(err?.message || 'Photo illisible.');
    }
    if (fileRef.current) fileRef.current.value = '';
  };

  const enregistrer = async (e: React.FormEvent) => {
    e.preventDefault();
    const prixNum = Number(prix);
    const promoNum = prixPromo.trim() === '' ? null : Number(prixPromo);
    if (nom.trim().length < 2) return setError('Donnez un nom au produit.');
    if (!Number.isFinite(prixNum) || prixNum <= 0) return setError('Indiquez un prix valide en FCFA.');
    if (promoNum !== null && (!Number.isFinite(promoNum) || promoNum <= 0 || promoNum >= prixNum)) {
      return setError('Le prix promotionnel doit être inférieur au prix normal.');
    }
    const saisie: SaisieProduit = {
      nom: nom.trim(),
      prix: Math.round(prixNum),
      prixPromo: promoNum === null ? null : Math.round(promoNum),
      description: description.trim(),
      variantes: variantes.trim(),
      livraison: livraison.trim(),
    };
    setBusy(true);
    setError(null);
    try {
      const nouvelles = photos.filter((p) => p.nouvelle).map((p) => p.nouvelle!);
      if (produit) {
        // Les photos conservées restent devant, les nouvelles s'ajoutent à la suite.
        await catalogue.modifierProduit(produit, saisie, photos.filter((p) => p.existante).map((p) => p.existante!), nouvelles);
      } else {
        await catalogue.ajouterProduit(saisie, nouvelles);
      }
      onClose();
    } catch (err) {
      console.error(err);
      setError("L'enregistrement a échoué. Vérifiez votre connexion puis réessayez.");
      setBusy(false);
    }
  };

  return (
    <form onSubmit={enregistrer} className="max-w-2xl mx-auto bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-black text-slate-800">{produit ? 'Modifier le produit' : 'Nouveau produit'}</h2>
        <button type="button" onClick={onClose} className="text-xs font-bold text-slate-500 hover:text-slate-800 cursor-pointer">
          Annuler
        </button>
      </div>

      <div>
        <span className={labelClass}>Photos ({photos.length}/{PHOTOS_MAX})</span>
        <div className="flex flex-wrap gap-3">
          {photos.map((p) => (
            <div key={p.cle} className="relative w-24 h-24 rounded-xl overflow-hidden border border-slate-200">
              <img src={p.apercu} alt="" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => setPhotos((prev) => prev.filter((x) => x.cle !== p.cle))}
                title="Retirer cette photo"
                className="absolute top-1 right-1 p-1 bg-black/60 hover:bg-black/80 text-white rounded-full cursor-pointer"
              >
                <X size={12} />
              </button>
            </div>
          ))}
          {photos.length < PHOTOS_MAX && (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="w-24 h-24 rounded-xl border-2 border-dashed border-slate-300 hover:border-blue-400 text-slate-400 hover:text-blue-600 flex flex-col items-center justify-center gap-1 cursor-pointer"
            >
              <ImagePlus size={20} />
              <span className="text-xs font-bold">Ajouter</span>
            </button>
          )}
        </div>
        <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => ajouterPhotos(e.target.files)} />
        <p className="text-xs text-slate-500 mt-2">Une photo nette, bien éclairée, produit entier visible. Elle est utilisée telle quelle dans vos visuels.</p>
      </div>

      <div>
        <label className={labelClass} htmlFor="prod-nom">Nom du produit</label>
        <input id="prod-nom" className={inputClass} maxLength={120} value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Ex. Baskets Air Runner" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass} htmlFor="prod-prix">Prix (FCFA)</label>
          <input id="prod-prix" className={inputClass} inputMode="numeric" value={prix} onChange={(e) => setPrix(e.target.value.replace(/[^\d]/g, ''))} placeholder="25000" />
        </div>
        <div>
          <label className={labelClass} htmlFor="prod-promo">Prix promo (facultatif)</label>
          <input id="prod-promo" className={inputClass} inputMode="numeric" value={prixPromo} onChange={(e) => setPrixPromo(e.target.value.replace(/[^\d]/g, ''))} placeholder="19900" />
        </div>
      </div>

      <div>
        <label className={labelClass} htmlFor="prod-desc">Description</label>
        <textarea
          id="prod-desc"
          className={`${inputClass} min-h-24`}
          maxLength={1500}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Matière, qualité, ce qui le distingue. L'assistant s'appuie uniquement sur ce que vous écrivez ici."
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelClass} htmlFor="prod-var">Tailles, couleurs, variantes</label>
          <input id="prod-var" className={inputClass} maxLength={300} value={variantes} onChange={(e) => setVariantes(e.target.value)} placeholder="Du 39 au 45 · noir, blanc" />
        </div>
        <div>
          <label className={labelClass} htmlFor="prod-liv">Livraison</label>
          <input id="prod-liv" className={inputClass} maxLength={300} value={livraison} onChange={(e) => setLivraison(e.target.value)} placeholder="Douala 1 000 FCFA · Yaoundé 48 h" />
        </div>
      </div>

      {error && <p className="text-sm text-rose-600 font-medium">{error}</p>}

      <button type="submit" disabled={busy} className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-xl font-bold text-sm cursor-pointer">
        {busy ? 'Enregistrement…' : 'Enregistrer le produit'}
      </button>
    </form>
  );
}
