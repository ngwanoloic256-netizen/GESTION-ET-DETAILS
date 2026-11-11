import { useEffect, useRef, useState } from 'react';
import { collection, deleteDoc, doc, getDoc, onSnapshot, setDoc, updateDoc, writeBatch } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { Creation, Media, Produit, PropositionIA } from '../platform/types';

const newId = () => doc(collection(db, '_')).id;

export interface NouvellePhoto {
  dataUrl: string;
  largeur: number;
  hauteur: number;
  vignette: string;
}

export type SaisieProduit = Pick<Produit, 'nom' | 'prix' | 'prixPromo' | 'description' | 'variantes' | 'livraison'>;

/** Catalogue de produits, photos et créations du studio d'une organisation. */
export function useCatalogue(orgId: string) {
  const [produits, setProduits] = useState<Produit[]>([]);
  const [creations, setCreations] = useState<Creation[]>([]);
  const [loading, setLoading] = useState(true);
  const cacheMedias = useRef(new Map<string, string>());

  const col = (name: string) => collection(db, 'organisations', orgId, name);
  const ref = (name: string, id: string) => doc(db, 'organisations', orgId, name, id);

  useEffect(() => {
    setLoading(true);
    const unsubProduits = onSnapshot(
      col('produits'),
      (snap) => {
        const list = snap.docs.map((d) => d.data() as Produit);
        list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        setProduits(list);
        setLoading(false);
      },
      (err) => {
        console.error('Lecture du catalogue impossible :', err);
        setLoading(false);
      },
    );
    const unsubCreations = onSnapshot(
      col('creations'),
      (snap) => {
        const list = snap.docs.map((d) => d.data() as Creation);
        list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        setCreations(list);
      },
      (err) => console.error('Lecture des créations impossible :', err),
    );
    return () => {
      unsubProduits();
      unsubCreations();
    };
  }, [orgId]);

  /** Photo en pleine définition (data URL), mise en cache pour la session. */
  const chargerMedia = async (id: string): Promise<string | null> => {
    const cached = cacheMedias.current.get(id);
    if (cached) return cached;
    const snap = await getDoc(ref('medias', id));
    if (!snap.exists()) return null;
    const { dataUrl } = snap.data() as Media;
    cacheMedias.current.set(id, dataUrl);
    return dataUrl;
  };

  const ajouterProduit = async (saisie: SaisieProduit, photos: NouvellePhoto[]) => {
    const id = newId();
    const now = new Date().toISOString();
    const batch = writeBatch(db);
    const photoIds = photos.map((p) => {
      const mediaId = newId();
      const media: Media = { id: mediaId, dataUrl: p.dataUrl, largeur: p.largeur, hauteur: p.hauteur, createdAt: now };
      batch.set(ref('medias', mediaId), media);
      cacheMedias.current.set(mediaId, p.dataUrl);
      return mediaId;
    });
    const produit: Produit = { ...saisie, id, photos: photoIds, vignette: photos[0]?.vignette ?? '', createdAt: now, updatedAt: now };
    batch.set(ref('produits', id), produit);
    await batch.commit();
    return produit;
  };

  const modifierProduit = async (produit: Produit, saisie: SaisieProduit, photosGardees: string[], nouvelles: NouvellePhoto[]) => {
    const now = new Date().toISOString();
    const batch = writeBatch(db);
    const ajoutees = nouvelles.map((p) => {
      const mediaId = newId();
      const media: Media = { id: mediaId, dataUrl: p.dataUrl, largeur: p.largeur, hauteur: p.hauteur, createdAt: now };
      batch.set(ref('medias', mediaId), media);
      cacheMedias.current.set(mediaId, p.dataUrl);
      return mediaId;
    });
    const photos = [...photosGardees, ...ajoutees];
    // La miniature suit la première photo : inchangée si elle est restée en tête.
    let vignette = produit.vignette;
    if (photos.length === 0) vignette = '';
    else if (photos[0] !== produit.photos[0]) {
      vignette = photosGardees.length === 0 ? nouvelles[0].vignette : await miniatureDepuisMedia(photos[0]);
    }
    batch.update(ref('produits', produit.id), { ...saisie, photos, vignette, updatedAt: now });
    await batch.commit();
    // Les photos retirées sont supprimées ensuite ; un échec ici (droits) ne casse pas la fiche.
    for (const ancien of produit.photos.filter((p) => !photos.includes(p))) {
      deleteDoc(ref('medias', ancien)).catch(() => {});
    }
  };

  const miniatureDepuisMedia = async (mediaId: string) => {
    const dataUrl = await chargerMedia(mediaId);
    if (!dataUrl) return '';
    const img = new Image();
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = dataUrl;
    });
    const ratio = Math.min(1, 200 / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.naturalWidth * ratio);
    canvas.height = Math.round(img.naturalHeight * ratio);
    canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.7);
  };

  const supprimerProduit = async (produit: Produit) => {
    const batch = writeBatch(db);
    batch.delete(ref('produits', produit.id));
    produit.photos.forEach((p) => batch.delete(ref('medias', p)));
    await batch.commit();
  };

  const enregistrerCreation = async (creation: Omit<Creation, 'id' | 'createdAt' | 'creePar'>, id?: string) => {
    const creationId = id ?? newId();
    if (id) {
      await updateDoc(ref('creations', id), { ...creation });
    } else {
      const complete: Creation = {
        ...creation,
        id: creationId,
        createdAt: new Date().toISOString(),
        creePar: auth.currentUser?.displayName || auth.currentUser?.email || '',
      };
      await setDoc(ref('creations', creationId), complete);
    }
    return creationId;
  };

  const supprimerCreation = (id: string) => deleteDoc(ref('creations', id));

  return {
    produits,
    creations,
    loading,
    chargerMedia,
    ajouterProduit,
    modifierProduit,
    supprimerProduit,
    enregistrerCreation,
    supprimerCreation,
  };
}

export type Catalogue = ReturnType<typeof useCatalogue>;

// ---------- Assistant IA ----------

export class ErreurIA extends Error {}

export async function genererTextes(fiche: Record<string, string>): Promise<PropositionIA[]> {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new ErreurIA('Connexion requise.');
  let res: Response;
  try {
    res = await fetch('/api/ai/textes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(fiche),
    });
  } catch {
    throw new ErreurIA('Connexion au serveur impossible. Vérifiez votre réseau.');
  }
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new ErreurIA(data?.erreur || "L'assistant IA est indisponible pour le moment.");
  return data.propositions as PropositionIA[];
}
