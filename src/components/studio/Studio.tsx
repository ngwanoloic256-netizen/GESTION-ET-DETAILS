import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Copy, Download, Package, Save, Sparkles, Trash2 } from 'lucide-react';
import { Catalogue, ErreurIA, genererTextes } from '../../studio/useCatalogue';
import { chargerImage } from '../../studio/images';
import { dessiner, exporterPng, FORMATS, MODELES, policesPretes, Spec, telecharger } from '../../studio/render';
import { Creation, MARQUE_PAR_DEFAUT, ModeleId, Organisation, Produit, PropositionIA, TextesCreation } from '../../platform/types';
import { formatFCFA } from '../../utils';

interface Props {
  organisation: Organisation;
  catalogue: Catalogue;
  isAdmin: boolean;
  /** Produit présélectionné depuis le catalogue. */
  produitInitial: string | null;
  onOuvrirProduits: () => void;
  onOuvrirMarque: () => void;
}

const inputClass =
  'w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500';
const labelClass = 'block text-xs font-bold text-slate-600 mb-1.5';
const cardClass = 'bg-white rounded-2xl border border-slate-100 shadow-sm p-5';

const textesParDefaut = (p: Produit): TextesCreation => ({
  accroche: p.nom,
  sousTitre: p.variantes,
  cta: 'Commandez sur WhatsApp',
  badge: p.prixPromo !== null ? `-${Math.round((1 - p.prixPromo / p.prix) * 100)}%` : '',
  afficherPrix: true,
  legende: '',
});

const slug = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'visuel';

export default function Studio({ organisation, catalogue, isAdmin, produitInitial, onOuvrirProduits, onOuvrirMarque }: Props) {
  const { produits, creations } = catalogue;
  const marque = organisation.marque ?? MARQUE_PAR_DEFAUT;

  const [produitId, setProduitId] = useState<string | null>(produitInitial);
  const [photoId, setPhotoId] = useState<string | null>(null);
  const [modele, setModele] = useState<ModeleId>('affiche');
  const [formatId, setFormatId] = useState(FORMATS[0].id);
  const [textes, setTextes] = useState<TextesCreation | null>(null);
  const [creationId, setCreationId] = useState<string | null>(null);

  const [photo, setPhoto] = useState<HTMLImageElement | null>(null);
  const [logo, setLogo] = useState<HTMLImageElement | null>(null);
  const [pret, setPret] = useState(false);

  const [propositions, setPropositions] = useState<PropositionIA[]>([]);
  const [iaEnCours, setIaEnCours] = useState(false);
  const [iaErreur, setIaErreur] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [exportEnCours, setExportEnCours] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  const produit = produits.find((p) => p.id === produitId) ?? null;
  const format = FORMATS.find((f) => f.id === formatId)!;

  // Premier produit par défaut, une fois le catalogue chargé.
  useEffect(() => {
    if (!produitId && produits.length > 0) setProduitId(produits[0].id);
  }, [produits, produitId]);

  // Changement de produit : textes de départ et première photo.
  // (Sauf si l'on vient de rouvrir une création enregistrée pour ce produit.)
  const creationRouverte = useRef(false);
  useEffect(() => {
    if (!produit) return;
    if (creationRouverte.current) {
      creationRouverte.current = false;
      return;
    }
    setTextes(textesParDefaut(produit));
    setPhotoId(produit.photos[0] ?? null);
    setCreationId(null);
    setPropositions([]);
    setIaErreur(null);
  }, [produit?.id]);

  useEffect(() => {
    policesPretes().then(() => setPret(true));
  }, []);

  useEffect(() => {
    let annule = false;
    setPhoto(null);
    if (!photoId) return;
    catalogue
      .chargerMedia(photoId)
      .then((dataUrl) => (dataUrl ? chargerImage(dataUrl) : null))
      .then((img) => !annule && setPhoto(img))
      .catch(() => {});
    return () => {
      annule = true;
    };
  }, [photoId]);

  useEffect(() => {
    let annule = false;
    setLogo(null);
    if (!marque.logo) return;
    chargerImage(marque.logo)
      .then((img) => !annule && setLogo(img))
      .catch(() => {});
    return () => {
      annule = true;
    };
  }, [marque.logo]);

  const spec: Spec | null = useMemo(() => {
    if (!produit || !textes) return null;
    return {
      modele,
      accroche: textes.accroche,
      sousTitre: textes.sousTitre,
      prix: textes.afficherPrix ? formatFCFA(produit.prixPromo ?? produit.prix) : '',
      ancienPrix: textes.afficherPrix && produit.prixPromo !== null ? formatFCFA(produit.prix) : '',
      badge: textes.badge,
      cta: textes.cta,
      contact: organisation.whatsapp,
      marque: organisation.nom,
      primaire: marque.couleurPrimaire,
      secondaire: marque.couleurSecondaire,
      photo,
      logo,
    };
  }, [produit, textes, modele, photo, logo, organisation.whatsapp, organisation.nom, marque.couleurPrimaire, marque.couleurSecondaire]);

  useEffect(() => {
    if (pret && spec && canvasRef.current) dessiner(canvasRef.current, format, spec);
  }, [pret, spec, format]);

  const flash = (texte: string) => {
    setMessage(texte);
    setTimeout(() => setMessage((m) => (m === texte ? null : m)), 2500);
  };

  const majTexte = <K extends keyof TextesCreation>(cle: K, valeur: TextesCreation[K]) => setTextes((t) => (t ? { ...t, [cle]: valeur } : t));

  const demanderIA = async () => {
    if (!produit) return;
    setIaEnCours(true);
    setIaErreur(null);
    try {
      const resultat = await genererTextes({
        nom: produit.nom,
        prix: formatFCFA(produit.prix),
        prixPromo: produit.prixPromo !== null ? formatFCFA(produit.prixPromo) : '',
        description: produit.description,
        variantes: produit.variantes,
        livraison: produit.livraison,
        commerce: organisation.nom,
        secteur: organisation.secteur,
        ville: organisation.ville,
        pays: organisation.pays,
        slogan: marque.slogan,
        ton: marque.ton,
        langue: organisation.langue,
      });
      setPropositions(resultat);
    } catch (err) {
      setIaErreur(err instanceof ErreurIA ? err.message : "L'assistant IA est indisponible pour le moment.");
    } finally {
      setIaEnCours(false);
    }
  };

  const appliquer = (p: PropositionIA) => {
    const hashtags = p.hashtags.map((h) => `#${h}`).join(' ');
    setTextes((t) => (t ? { ...t, accroche: p.accroche, sousTitre: p.sousTitre, cta: p.cta, legende: [p.legende, hashtags].filter(Boolean).join('\n\n') } : t));
  };

  const exporter = async (tous: boolean) => {
    if (!spec || !produit) return;
    setExportEnCours(true);
    try {
      for (const f of tous ? FORMATS : [format]) {
        telecharger(await exporterPng(f, spec), `${slug(produit.nom)}-${f.id}.png`);
        if (tous) await new Promise((r) => setTimeout(r, 350));
      }
      flash(tous ? 'Les 4 formats ont été téléchargés' : 'Visuel téléchargé');
    } catch {
      flash("L'export a échoué");
    } finally {
      setExportEnCours(false);
    }
  };

  const copierLegende = async () => {
    if (!textes?.legende) return;
    try {
      await navigator.clipboard.writeText(textes.legende);
      flash('Légende copiée');
    } catch {
      flash('Copie impossible : sélectionnez le texte à la main');
    }
  };

  const enregistrer = async () => {
    if (!produit || !textes) return;
    try {
      const id = await catalogue.enregistrerCreation({ ...textes, produitId: produit.id, nomProduit: produit.nom, photoId, modele }, creationId ?? undefined);
      setCreationId(id);
      flash('Création enregistrée');
    } catch (err) {
      console.error(err);
      flash("L'enregistrement a échoué");
    }
  };

  const rouvrir = (c: Creation) => {
    if (!produits.some((p) => p.id === c.produitId)) {
      flash("Le produit de cette création n'existe plus");
      return;
    }
    creationRouverte.current = c.produitId !== produitId;
    setProduitId(c.produitId);
    setPhotoId(c.photoId);
    setModele(c.modele);
    setTextes({ accroche: c.accroche, sousTitre: c.sousTitre, cta: c.cta, badge: c.badge, afficherPrix: c.afficherPrix, legende: c.legende });
    setCreationId(c.id);
    setPropositions([]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const supprimerCreation = async (c: Creation) => {
    if (!window.confirm('Supprimer cette création enregistrée ?')) return;
    try {
      await catalogue.supprimerCreation(c.id);
      if (creationId === c.id) setCreationId(null);
    } catch {
      flash('La suppression a échoué');
    }
  };

  if (!catalogue.loading && produits.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-10 text-center">
        <Package size={32} className="mx-auto text-slate-300" />
        <p className="text-sm font-bold text-slate-700 mt-3">Le studio part de vos produits</p>
        <p className="text-sm text-slate-500 mt-1">Ajoutez un produit avec sa photo et son prix, puis revenez créer vos visuels.</p>
        <button onClick={onOuvrirProduits} className="mt-4 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold cursor-pointer">
          Ajouter un produit
        </button>
      </div>
    );
  }

  if (!produit || !textes) {
    return (
      <div className="py-16 flex justify-center">
        <div className="w-8 h-8 rounded-full border-3 border-blue-600 border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] gap-5 items-start">
        {/* Réglages */}
        <div className="space-y-5 order-2 lg:order-1">
          <div className={`${cardClass} space-y-4`}>
            <div>
              <label className={labelClass} htmlFor="studio-produit">Produit</label>
              <select id="studio-produit" className={inputClass} value={produit.id} onChange={(e) => setProduitId(e.target.value)}>
                {produits.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nom}
                  </option>
                ))}
              </select>
            </div>

            {produit.photos.length > 1 && (
              <div>
                <span className={labelClass}>Photo</span>
                <div className="flex gap-2">
                  {produit.photos.map((id, i) => (
                    <button
                      key={id}
                      onClick={() => setPhotoId(id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold border cursor-pointer ${
                        photoId === id ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200'
                      }`}
                    >
                      Photo {i + 1}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <span className={labelClass}>Modèle</span>
              <div className="grid grid-cols-3 gap-2">
                {MODELES.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setModele(m.id)}
                    title={m.description}
                    className={`p-2.5 rounded-xl border-2 text-left cursor-pointer transition-all ${
                      modele === m.id ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <span className="block text-sm font-bold text-slate-800">{m.label}</span>
                    <span className="hidden sm:block text-xs text-slate-500 mt-0.5 leading-snug">{m.description}</span>
                  </button>
                ))}
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Couleurs et logo viennent de votre{' '}
                <button onClick={onOuvrirMarque} className="font-bold text-blue-600 hover:underline cursor-pointer">
                  identité de marque
                </button>
                .
              </p>
            </div>
          </div>

          <div className={`${cardClass} space-y-4`}>
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-black text-slate-800">Textes</h3>
              <button
                onClick={demanderIA}
                disabled={iaEnCours}
                className="px-3 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                {iaEnCours ? <span className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" /> : <Sparkles size={14} />}
                {iaEnCours ? 'Rédaction…' : propositions.length ? 'Autres propositions' : "Proposer des textes avec l'IA"}
              </button>
            </div>

            {iaErreur && <p className="text-sm text-rose-600 font-medium">{iaErreur}</p>}

            {propositions.length > 0 && (
              <div className="space-y-2">
                {propositions.map((p, i) => (
                  <div key={i} className="bg-slate-50 rounded-xl p-3 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-blue-600 uppercase tracking-wide">{p.angle}</p>
                      <p className="text-sm font-bold text-slate-800 mt-0.5">{p.accroche}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{p.sousTitre}</p>
                    </div>
                    <button onClick={() => appliquer(p)} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold cursor-pointer shrink-0">
                      Utiliser
                    </button>
                  </div>
                ))}
                <p className="text-xs text-slate-500">Relisez toujours avant de publier : vous restez responsable des promesses faites à vos clients.</p>
              </div>
            )}

            <div>
              <label className={labelClass} htmlFor="studio-accroche">Accroche</label>
              <input id="studio-accroche" className={inputClass} maxLength={90} value={textes.accroche} onChange={(e) => majTexte('accroche', e.target.value)} />
            </div>
            <div>
              <label className={labelClass} htmlFor="studio-sous">Sous-titre</label>
              <input id="studio-sous" className={inputClass} maxLength={140} value={textes.sousTitre} onChange={(e) => majTexte('sousTitre', e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass} htmlFor="studio-cta">Appel à l'action</label>
                <input id="studio-cta" className={inputClass} maxLength={50} value={textes.cta} onChange={(e) => majTexte('cta', e.target.value)} />
              </div>
              <div>
                <label className={labelClass} htmlFor="studio-badge">Pastille (facultatif)</label>
                <input id="studio-badge" className={inputClass} maxLength={18} value={textes.badge} onChange={(e) => majTexte('badge', e.target.value)} placeholder="-20%, Nouveau…" />
              </div>
            </div>
            <label className="flex items-center gap-2.5 text-sm text-slate-700 cursor-pointer">
              <input type="checkbox" checked={textes.afficherPrix} onChange={(e) => majTexte('afficherPrix', e.target.checked)} />
              Afficher le prix ({formatFCFA(produit.prixPromo ?? produit.prix)})
            </label>
            {!organisation.whatsapp && (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2.5">
                Aucun numéro WhatsApp n'est renseigné pour cet espace : il n'apparaîtra pas sur le visuel.
              </p>
            )}

            <div>
              <div className="flex items-center justify-between">
                <label className={labelClass} htmlFor="studio-legende">Légende de la publication</label>
                <button onClick={copierLegende} disabled={!textes.legende} className="text-xs font-bold text-blue-600 hover:underline disabled:opacity-40 disabled:no-underline flex items-center gap-1 cursor-pointer mb-1.5">
                  <Copy size={12} /> Copier
                </button>
              </div>
              <textarea
                id="studio-legende"
                className={`${inputClass} min-h-28`}
                maxLength={1200}
                value={textes.legende}
                onChange={(e) => majTexte('legende', e.target.value)}
                placeholder="Le texte qui accompagne le visuel sur Facebook, Instagram ou en statut WhatsApp."
              />
            </div>
          </div>
        </div>

        {/* Aperçu et export */}
        <div className={`${cardClass} order-1 lg:order-2 lg:sticky lg:top-20 space-y-4`}>
          <div className="grid grid-cols-4 gap-1.5">
            {FORMATS.map((f) => (
              <button
                key={f.id}
                onClick={() => setFormatId(f.id)}
                className={`py-2 rounded-lg text-xs font-bold cursor-pointer ${formatId === f.id ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-slate-500 -mt-2">
            {format.usage} · {format.w} × {format.h} px
          </p>

          <div className="bg-slate-100 rounded-xl p-3 flex justify-center">
            <canvas
              ref={canvasRef}
              aria-label={`Aperçu du visuel : ${textes.accroche}`}
              className="max-w-full max-h-[60vh] rounded-lg shadow-md"
              style={{ aspectRatio: `${format.w} / ${format.h}`, width: format.h > format.w ? 'auto' : '100%', height: format.h > format.w ? '60vh' : 'auto' }}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => exporter(false)}
              disabled={exportEnCours}
              className="py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 cursor-pointer"
            >
              <Download size={16} /> Télécharger
            </button>
            <button
              onClick={() => exporter(true)}
              disabled={exportEnCours}
              className="py-2.5 bg-white border border-slate-200 hover:border-slate-300 disabled:opacity-60 text-slate-700 rounded-xl text-sm font-bold cursor-pointer"
            >
              Les 4 formats
            </button>
          </div>
          <button onClick={enregistrer} className="w-full py-2.5 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 rounded-xl text-sm font-bold flex items-center justify-center gap-2 cursor-pointer">
            <Save size={16} /> {creationId ? 'Mettre à jour la création' : 'Enregistrer la création'}
          </button>
          <p className="text-sm text-emerald-600 font-medium h-5 flex items-center gap-1.5" role="status">
            {message && (
              <>
                <Check size={14} /> {message}
              </>
            )}
          </p>
        </div>
      </div>

      {creations.length > 0 && (
        <div className={cardClass}>
          <h3 className="text-sm font-black text-slate-800">Créations enregistrées ({creations.length})</h3>
          <ul className="mt-3 divide-y divide-slate-100">
            {creations.map((c) => (
              <li key={c.id} className="py-2.5 flex items-center justify-between gap-3">
                <button onClick={() => rouvrir(c)} className="min-w-0 text-left cursor-pointer group">
                  <p className="text-sm font-bold text-slate-800 truncate group-hover:text-blue-600">{c.accroche || c.nomProduit}</p>
                  <p className="text-xs text-slate-500 truncate">
                    {c.nomProduit} · {MODELES.find((m) => m.id === c.modele)?.label} · {new Date(c.createdAt).toLocaleDateString('fr-FR')}
                  </p>
                </button>
                {isAdmin && (
                  <button onClick={() => supprimerCreation(c)} title="Supprimer" className="p-1.5 text-slate-400 hover:text-rose-600 cursor-pointer shrink-0">
                    <Trash2 size={15} />
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
