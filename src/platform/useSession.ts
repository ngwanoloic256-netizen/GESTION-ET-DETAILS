import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  User,
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { auth, db } from '../firebase';
import {
  COLLECTIONS_METIER,
  Invitation,
  JournalEntry,
  Member,
  NouvelleOrganisation,
  Organisation,
  Role,
  isAdminRole,
} from './types';

const newId = () => doc(collection(db, '_')).id;
const activeOrgKey = (uid: string) => `activeOrg:${uid}`;

/** Firestore limite un lot à 500 écritures : on découpe. */
async function commitInChunks(ops: { path: string[]; data: any }[]) {
  for (let i = 0; i < ops.length; i += 400) {
    const batch = writeBatch(db);
    ops.slice(i, i + 400).forEach((op) => {
      batch.set(doc(db, op.path[0], ...op.path.slice(1)), op.data);
    });
    await batch.commit();
  }
}

/**
 * Session de la plateforme : compte connecté, organisations dont il est membre,
 * organisation active, rôle, équipe, invitations et journal d'activité.
 */
export function useSession() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const [orgIds, setOrgIds] = useState<string[] | null>(null);
  const [organisations, setOrganisations] = useState<Organisation[]>([]);
  const [orgsLoading, setOrgsLoading] = useState(true);
  const [activeOrgId, setActiveOrgId] = useState<string | null>(null);

  const [members, setMembers] = useState<Member[]>([]);
  const [orgInvitations, setOrgInvitations] = useState<Invitation[]>([]);
  const [myInvitations, setMyInvitations] = useState<Invitation[]>([]);
  const [journal, setJournal] = useState<JournalEntry[]>([]);
  const [legacyCount, setLegacyCount] = useState(0);

  // ---------- Authentification ----------
  useEffect(() => {
    return onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
      if (!currentUser) {
        setOrgIds(null);
        setOrganisations([]);
        setActiveOrgId(null);
        setOrgsLoading(true);
        return;
      }
      // Profil : créé à la première connexion, rafraîchi ensuite.
      const now = new Date().toISOString();
      setDoc(
        doc(db, 'users', currentUser.uid),
        {
          uid: currentUser.uid,
          email: (currentUser.email || '').toLowerCase(),
          displayName: currentUser.displayName || '',
          photoURL: currentUser.photoURL || '',
          lastLoginAt: now,
        },
        { merge: true },
      ).catch((err) => console.error('Profil utilisateur non enregistré :', err));
    });
  }, []);

  const loginWithGoogle = async () => {
    setAuthError(null);
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch (err: any) {
      if (err?.code === 'auth/popup-closed-by-user' || err?.code === 'auth/cancelled-popup-request') return;
      console.error('Connexion Google échouée :', err);
      setAuthError(err?.message || 'Échec de la connexion avec Google.');
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  // ---------- Mes organisations ----------
  useEffect(() => {
    if (!user) return;
    // On attend la confirmation du serveur : une organisation en cours de création
    // n'est pas encore lisible tant que son lot d'écriture n'est pas validé.
    return onSnapshot(
      collection(db, 'users', user.uid, 'memberships'),
      { includeMetadataChanges: true },
      (snap) => {
        if (snap.metadata.hasPendingWrites) return;
        setOrgIds(snap.docs.map((d) => d.id));
      },
      (err) => {
        console.error('Lecture des organisations impossible :', err);
        setOrgIds([]);
      },
    );
  }, [user]);

  useEffect(() => {
    if (!user || orgIds === null) return;
    let cancelled = false;
    (async () => {
      const loaded: Organisation[] = [];
      for (const id of orgIds) {
        try {
          const snap = await getDoc(doc(db, 'organisations', id));
          if (snap.exists()) loaded.push(snap.data() as Organisation);
        } catch (err: any) {
          // Accès retiré par un administrateur : on nettoie l'entrée devenue inutile.
          // Une simple coupure réseau ne doit rien supprimer.
          if (err?.code === 'permission-denied') {
            deleteDoc(doc(db, 'users', user.uid, 'memberships', id)).catch(() => {});
          }
        }
      }
      if (cancelled) return;
      loaded.sort((a, b) => a.nom.localeCompare(b.nom));
      setOrganisations(loaded);
      setActiveOrgId((current) => {
        if (current && loaded.some((o) => o.id === current)) return current;
        const stored = localStorage.getItem(activeOrgKey(user.uid));
        if (stored && loaded.some((o) => o.id === stored)) return stored;
        return loaded[0]?.id ?? null;
      });
      setOrgsLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user, orgIds]);

  const switchOrganisation = (orgId: string) => {
    if (user) localStorage.setItem(activeOrgKey(user.uid), orgId);
    setActiveOrgId(orgId);
  };

  // L'organisation active reste synchronisée en direct.
  useEffect(() => {
    if (!user || !activeOrgId) return;
    return onSnapshot(
      doc(db, 'organisations', activeOrgId),
      (snap) => {
        if (!snap.exists()) return;
        const fresh = snap.data() as Organisation;
        setOrganisations((prev) => prev.map((o) => (o.id === fresh.id ? fresh : o)));
      },
      (err) => {
        // Accès perdu : on retire l'entrée, la liste se recharge toute seule.
        if (err.code === 'permission-denied') {
          deleteDoc(doc(db, 'users', user.uid, 'memberships', activeOrgId)).catch(() => {});
        }
      },
    );
  }, [user, activeOrgId]);

  // ---------- Équipe de l'organisation active ----------
  useEffect(() => {
    setMembers([]);
    if (!user || !activeOrgId) return;
    return onSnapshot(
      collection(db, 'organisations', activeOrgId, 'members'),
      (snap) => {
        const list = snap.docs.map((d) => d.data() as Member);
        const order: Record<Role, number> = { owner: 0, admin: 1, member: 2 };
        list.sort((a, b) => order[a.role] - order[b.role] || a.email.localeCompare(b.email));
        setMembers(list);
      },
      (err) => console.error('Lecture de l’équipe impossible :', err),
    );
  }, [user, activeOrgId]);

  const organisation = useMemo(
    () => organisations.find((o) => o.id === activeOrgId) ?? null,
    [organisations, activeOrgId],
  );
  const role: Role | null = useMemo(
    () => members.find((m) => m.uid === user?.uid)?.role ?? null,
    [members, user],
  );
  const isAdmin = isAdminRole(role);

  // Invitations envoyées et journal : réservés aux administrateurs.
  useEffect(() => {
    setOrgInvitations([]);
    setJournal([]);
    if (!user || !activeOrgId || !isAdmin) return;
    const unsubInv = onSnapshot(
      query(collection(db, 'invitations'), where('orgId', '==', activeOrgId)),
      (snap) => setOrgInvitations(snap.docs.map((d) => d.data() as Invitation)),
      (err) => console.error('Lecture des invitations impossible :', err),
    );
    const unsubJournal = onSnapshot(
      query(collection(db, 'organisations', activeOrgId, 'journal'), orderBy('date', 'desc'), limit(100)),
      (snap) => setJournal(snap.docs.map((d) => d.data() as JournalEntry)),
      (err) => console.error('Lecture du journal impossible :', err),
    );
    return () => {
      unsubInv();
      unsubJournal();
    };
  }, [user, activeOrgId, isAdmin]);

  // ---------- Invitations reçues ----------
  useEffect(() => {
    setMyInvitations([]);
    const email = user?.email?.toLowerCase();
    if (!user || !email) return;
    return onSnapshot(
      query(collection(db, 'invitations'), where('email', '==', email)),
      (snap) => setMyInvitations(snap.docs.map((d) => d.data() as Invitation)),
      (err) => console.error('Lecture des invitations reçues impossible :', err),
    );
  }, [user]);

  // ---------- Données d'avant le multi-organisations ----------
  // Seul le compte d'origine peut lire les anciennes collections racine ;
  // pour tous les autres, les règles refusent et le compteur reste à zéro.
  useEffect(() => {
    setLegacyCount(0);
    if (!user) return;
    let cancelled = false;
    (async () => {
      let total = 0;
      for (const col of COLLECTIONS_METIER) {
        try {
          total += (await getDocs(collection(db, col))).size;
        } catch {
          return;
        }
      }
      if (!cancelled) setLegacyCount(total);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  // ---------- Journal ----------
  const logEvent = useCallback(
    async (action: string, description: string, orgId?: string) => {
      const target = orgId ?? activeOrgId;
      if (!user || !target) return;
      const id = newId();
      const entry: JournalEntry = {
        id,
        date: new Date().toISOString(),
        uid: user.uid,
        acteur: user.displayName || user.email || 'Utilisateur',
        action,
        description,
      };
      try {
        await setDoc(doc(db, 'organisations', target, 'journal', id), entry);
      } catch (err) {
        console.error('Écriture du journal impossible :', err);
      }
    },
    [user, activeOrgId],
  );

  // ---------- Actions ----------
  const importLegacyData = async (orgId: string) => {
    const ops: { path: string[]; data: any }[] = [];
    for (const col of COLLECTIONS_METIER) {
      const snap = await getDocs(collection(db, col));
      snap.forEach((d) => ops.push({ path: ['organisations', orgId, col, d.id], data: d.data() }));
    }
    await commitInChunks(ops);
    await logEvent('donnees.import_historique', `${ops.length} enregistrements historiques importés`, orgId);
    return ops.length;
  };

  const createOrganisation = async (input: NouvelleOrganisation, importLegacy: boolean) => {
    if (!user) throw new Error('Connexion requise.');
    const id = newId();
    const now = new Date().toISOString();
    const org: Organisation = {
      id,
      nom: input.nom.trim(),
      type: input.type,
      secteur: input.secteur,
      pays: input.pays,
      ville: input.ville.trim(),
      devise: input.devise,
      langue: input.langue,
      whatsapp: input.whatsapp.trim(),
      plan: 'free',
      modules: { gestionMultiService: input.gestionMultiService || importLegacy },
      ownerUid: user.uid,
      createdAt: now,
      updatedAt: now,
    };
    const member: Member = {
      uid: user.uid,
      email: (user.email || '').toLowerCase(),
      displayName: user.displayName || '',
      role: 'owner',
      joinedAt: now,
    };
    const batch = writeBatch(db);
    batch.set(doc(db, 'organisations', id), org);
    batch.set(doc(db, 'organisations', id, 'members', user.uid), member);
    batch.set(doc(db, 'users', user.uid, 'memberships', id), { orgId: id, joinedAt: now });
    await batch.commit();
    await logEvent('organisation.creation', `Espace « ${org.nom} » créé`, id);
    if (importLegacy) await importLegacyData(id);
    switchOrganisation(id);
  };

  const updateOrganisation = async (
    changes: Partial<Pick<Organisation, 'nom' | 'type' | 'secteur' | 'pays' | 'ville' | 'devise' | 'langue' | 'whatsapp' | 'modules'>>,
    description = 'Paramètres de l’espace modifiés',
  ) => {
    if (!activeOrgId) return;
    await updateDoc(doc(db, 'organisations', activeOrgId), { ...changes, updatedAt: new Date().toISOString() });
    await logEvent('organisation.modification', description);
  };

  const inviteMember = async (rawEmail: string, inviteRole: 'admin' | 'member') => {
    if (!user || !organisation) return;
    const email = rawEmail.trim().toLowerCase();
    if (!/^[^\s@/]+@[^\s@/]+\.[^\s@/]+$/.test(email)) throw new Error('Adresse e-mail invalide.');
    if (members.some((m) => m.email === email)) throw new Error('Cette personne fait déjà partie de l’équipe.');
    const id = `${organisation.id}_${email}`;
    const invitation: Invitation = {
      id,
      orgId: organisation.id,
      orgName: organisation.nom,
      email,
      role: inviteRole,
      invitedBy: user.uid,
      invitedByName: user.displayName || user.email || '',
      createdAt: new Date().toISOString(),
    };
    await setDoc(doc(db, 'invitations', id), invitation);
    await logEvent('equipe.invitation', `${email} invité(e) comme ${inviteRole === 'admin' ? 'administrateur' : 'collaborateur'}`);
  };

  const cancelInvitation = async (invitation: Invitation) => {
    await deleteDoc(doc(db, 'invitations', invitation.id));
    await logEvent('equipe.invitation_annulee', `Invitation de ${invitation.email} annulée`);
  };

  const acceptInvitation = async (invitation: Invitation) => {
    if (!user) return;
    const now = new Date().toISOString();
    const member: Member = {
      uid: user.uid,
      email: (user.email || '').toLowerCase(),
      displayName: user.displayName || '',
      role: invitation.role,
      joinedAt: now,
    };
    const batch = writeBatch(db);
    batch.set(doc(db, 'organisations', invitation.orgId, 'members', user.uid), member);
    batch.set(doc(db, 'users', user.uid, 'memberships', invitation.orgId), { orgId: invitation.orgId, joinedAt: now });
    batch.delete(doc(db, 'invitations', invitation.id));
    await batch.commit();
    await logEvent('equipe.arrivee', `${member.email} a rejoint l’équipe`, invitation.orgId);
    switchOrganisation(invitation.orgId);
  };

  const declineInvitation = async (invitation: Invitation) => {
    await deleteDoc(doc(db, 'invitations', invitation.id));
  };

  const changeMemberRole = async (member: Member, newRole: 'admin' | 'member') => {
    if (!activeOrgId) return;
    await updateDoc(doc(db, 'organisations', activeOrgId, 'members', member.uid), { role: newRole });
    await logEvent('equipe.role', `${member.email} devient ${newRole === 'admin' ? 'administrateur' : 'collaborateur'}`);
  };

  const removeMember = async (member: Member) => {
    if (!activeOrgId) return;
    await deleteDoc(doc(db, 'organisations', activeOrgId, 'members', member.uid));
    await deleteDoc(doc(db, 'users', member.uid, 'memberships', activeOrgId)).catch(() => {});
    await logEvent('equipe.retrait', `${member.email} retiré(e) de l’équipe`);
  };

  const leaveOrganisation = async () => {
    if (!user || !activeOrgId) return;
    const orgId = activeOrgId;
    await logEvent('equipe.depart', `${user.email} a quitté l’équipe`);
    await deleteDoc(doc(db, 'organisations', orgId, 'members', user.uid));
    await deleteDoc(doc(db, 'users', user.uid, 'memberships', orgId));
    localStorage.removeItem(activeOrgKey(user.uid));
    setActiveOrgId(null);
  };

  return {
    user,
    authLoading,
    authError,
    loginWithGoogle,
    logout,
    orgsLoading: !!user && orgsLoading,
    organisations,
    organisation,
    role,
    isAdmin,
    members,
    orgInvitations,
    myInvitations,
    journal,
    legacyCount,
    switchOrganisation,
    createOrganisation,
    updateOrganisation,
    importLegacyData,
    inviteMember,
    cancelInvitation,
    acceptInvitation,
    declineInvitation,
    changeMemberRole,
    removeMember,
    leaveOrganisation,
    logEvent,
  };
}

export type Session = ReturnType<typeof useSession>;
