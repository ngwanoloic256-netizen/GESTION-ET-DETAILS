import { useEffect, useState } from 'react';
import { collection, deleteDoc, doc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { Campagne } from '../platform/types';

export type SaisieCampagne = Omit<Campagne, 'id' | 'creePar' | 'createdAt' | 'updatedAt'>;

/** Campagnes publicitaires d'une organisation. */
export function useCampagnes(orgId: string) {
  const [campagnes, setCampagnes] = useState<Campagne[]>([]);
  const [loading, setLoading] = useState(true);

  const ref = (id: string) => doc(db, 'organisations', orgId, 'campagnes', id);

  useEffect(() => {
    setLoading(true);
    return onSnapshot(
      collection(db, 'organisations', orgId, 'campagnes'),
      (snap) => {
        const list = snap.docs.map((d) => d.data() as Campagne);
        list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        setCampagnes(list);
        setLoading(false);
      },
      (err) => {
        console.error('Lecture des campagnes impossible :', err);
        setLoading(false);
      },
    );
  }, [orgId]);

  const enregistrer = async (saisie: SaisieCampagne, id?: string) => {
    const now = new Date().toISOString();
    if (id) {
      await updateDoc(ref(id), { ...saisie, updatedAt: now });
      return id;
    }
    const nouvelId = doc(collection(db, '_')).id;
    const campagne: Campagne = {
      ...saisie,
      id: nouvelId,
      creePar: auth.currentUser?.displayName || auth.currentUser?.email || '',
      createdAt: now,
      updatedAt: now,
    };
    await setDoc(ref(nouvelId), campagne);
    return nouvelId;
  };

  const modifier = (id: string, changements: Partial<Campagne>) => updateDoc(ref(id), { ...changements, updatedAt: new Date().toISOString() });

  const supprimer = (id: string) => deleteDoc(ref(id));

  return { campagnes, loading, enregistrer, modifier, supprimer };
}

export type Campagnes = ReturnType<typeof useCampagnes>;

// ---------- Indicateurs ----------
// Calculés uniquement à partir de ce qui a été mesuré ; `null` quand la donnée manque,
// pour ne jamais afficher un chiffre inventé.
export function indicateurs(c: Campagne) {
  const r = c.resultats;
  const budgetTotal = c.budgetJour * c.dureeJours;
  if (!r) return { budgetTotal, coutParMessage: null, coutParCommande: null, tauxConversion: null, roas: null };
  return {
    budgetTotal,
    coutParMessage: r.messages > 0 ? r.depense / r.messages : null,
    coutParCommande: r.commandes > 0 ? r.depense / r.commandes : null,
    tauxConversion: r.messages > 0 ? r.commandes / r.messages : null,
    roas: r.depense > 0 && r.chiffreAffaires > 0 ? r.chiffreAffaires / r.depense : null,
  };
}
