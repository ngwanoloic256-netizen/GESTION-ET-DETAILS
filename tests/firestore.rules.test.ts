// Tests des règles Firestore : isolation entre organisations, rôles, invitations, journal.
// Lancer avec `npm run test:rules` (démarre l'émulateur Firestore, Java requis).
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';

let env: RulesTestEnvironment;

const as = (uid: string, email: string, verified = true) =>
  env.authenticatedContext(uid, { email, email_verified: verified }).firestore();

const orgData = (id: string, ownerUid: string, extra: Record<string, unknown> = {}) => ({
  id,
  nom: 'Boutique ' + id,
  plan: 'free',
  ownerUid,
  createdAt: '2026-01-01T00:00:00.000Z',
  modules: { gestionMultiService: true },
  ...extra,
});

const memberData = (uid: string, email: string, role: string) => ({ uid, email, displayName: uid, role, joinedAt: 'x' });

/** Crée une organisation comme le fait l'application (un seul lot). */
function createOrg(uid: string, email: string, orgId: string, extra: Record<string, unknown> = {}) {
  const db = as(uid, email);
  const batch = writeBatch(db);
  batch.set(doc(db, 'organisations', orgId), orgData(orgId, uid, extra));
  batch.set(doc(db, 'organisations', orgId, 'members', uid), memberData(uid, email, 'owner'));
  batch.set(doc(db, 'users', uid, 'memberships', orgId), { orgId, joinedAt: 'x' });
  return batch.commit();
}

const invitation = (orgId: string, email: string, role: string, invitedBy: string) => ({
  id: `${orgId}_${email}`,
  orgId,
  orgName: 'Boutique',
  email,
  role,
  invitedBy,
  invitedByName: 'Awa',
  createdAt: 'x',
});

/** Awa possède orgA ; Bob en est collaborateur ; Chloé possède orgC. */
async function seed() {
  await createOrg('awa', 'awa@example.com', 'orgA');
  await createOrg('chloe', 'chloe@example.com', 'orgC');
  await setDoc(doc(as('awa', 'awa@example.com'), 'invitations', 'orgA_bob@example.com'), invitation('orgA', 'bob@example.com', 'member', 'awa'));
  const bob = as('bob', 'bob@example.com');
  const batch = writeBatch(bob);
  batch.set(doc(bob, 'organisations', 'orgA', 'members', 'bob'), memberData('bob', 'bob@example.com', 'member'));
  batch.set(doc(bob, 'users', 'bob', 'memberships', 'orgA'), { orgId: 'orgA', joinedAt: 'x' });
  batch.delete(doc(bob, 'invitations', 'orgA_bob@example.com'));
  await batch.commit();
  await setDoc(doc(as('awa', 'awa@example.com'), 'organisations', 'orgA', 'boissonsCatalogue', 'p1'), { id: 'p1', nom: 'Jus' });
}

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-test',
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
  });
});

afterAll(() => env.cleanup());

beforeEach(async () => {
  await env.clearFirestore();
  await seed();
});

describe('création d’organisation', () => {
  it('un utilisateur connecté crée son espace et en devient propriétaire', async () => {
    await assertSucceeds(createOrg('dina', 'dina@example.com', 'orgD'));
  });

  it('refuse un plan payant choisi par le client', async () => {
    await assertFails(createOrg('dina', 'dina@example.com', 'orgD', { plan: 'agency' }));
  });

  it('refuse une organisation sans fiche propriétaire', async () => {
    const db = as('dina', 'dina@example.com');
    await assertFails(setDoc(doc(db, 'organisations', 'orgD'), orgData('orgD', 'dina')));
  });

  it('refuse de se déclarer propriétaire d’un espace existant', async () => {
    const db = as('dina', 'dina@example.com');
    await assertFails(setDoc(doc(db, 'organisations', 'orgA', 'members', 'dina'), memberData('dina', 'dina@example.com', 'owner')));
  });

  it('refuse un visiteur non connecté', async () => {
    const db = env.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(db, 'organisations', 'orgA')));
  });
});

describe('isolation des données', () => {
  it('un membre lit et écrit les données de son espace', async () => {
    const bob = as('bob', 'bob@example.com');
    await assertSucceeds(getDocs(collection(bob, 'organisations', 'orgA', 'boissonsCatalogue')));
    await assertSucceeds(setDoc(doc(bob, 'organisations', 'orgA', 'boissonsMouvements', 'm1'), { id: 'm1' }));
  });

  it('une autre organisation ne lit ni n’écrit rien', async () => {
    const chloe = as('chloe', 'chloe@example.com');
    await assertFails(getDoc(doc(chloe, 'organisations', 'orgA')));
    await assertFails(getDocs(collection(chloe, 'organisations', 'orgA', 'boissonsCatalogue')));
    await assertFails(getDocs(collection(chloe, 'organisations', 'orgA', 'members')));
    await assertFails(setDoc(doc(chloe, 'organisations', 'orgA', 'boissonsCatalogue', 'p2'), { id: 'p2' }));
    await assertFails(deleteDoc(doc(chloe, 'organisations', 'orgA', 'boissonsCatalogue', 'p1')));
  });

  it('le catalogue et les créations du studio suivent les mêmes règles', async () => {
    const bob = as('bob', 'bob@example.com');
    for (const col of ['produits', 'medias', 'creations']) {
      await assertSucceeds(setDoc(doc(bob, 'organisations', 'orgA', col, 'x1'), { id: 'x1' }));
      await assertFails(getDocs(collection(as('chloe', 'chloe@example.com'), 'organisations', 'orgA', col)));
      await assertFails(deleteDoc(doc(bob, 'organisations', 'orgA', col, 'x1')));
      await assertSucceeds(deleteDoc(doc(as('awa', 'awa@example.com'), 'organisations', 'orgA', col, 'x1')));
    }
  });

  it('une collection inconnue est refusée même pour un membre', async () => {
    const awa = as('awa', 'awa@example.com');
    await assertFails(setDoc(doc(awa, 'organisations', 'orgA', 'secrets', 's1'), { a: 1 }));
  });

  it('les anciennes collections racine sont fermées aux nouveaux comptes', async () => {
    const awa = as('awa', 'awa@example.com');
    await assertFails(getDocs(collection(awa, 'boissonsCatalogue')));
    const origine = as('legacy', 'ngwanoloic256@gmail.com');
    await assertSucceeds(getDocs(collection(origine, 'boissonsCatalogue')));
  });

  it('le profil d’un utilisateur n’est lisible que par lui', async () => {
    const awa = as('awa', 'awa@example.com');
    await assertSucceeds(setDoc(doc(awa, 'users', 'awa'), { uid: 'awa', email: 'awa@example.com' }));
    await assertFails(getDoc(doc(as('bob', 'bob@example.com'), 'users', 'awa')));
    await assertFails(getDocs(collection(as('bob', 'bob@example.com'), 'users', 'awa', 'memberships')));
  });
});

describe('rôles', () => {
  it('seul un administrateur supprime des données', async () => {
    await assertFails(deleteDoc(doc(as('bob', 'bob@example.com'), 'organisations', 'orgA', 'boissonsCatalogue', 'p1')));
    await assertSucceeds(deleteDoc(doc(as('awa', 'awa@example.com'), 'organisations', 'orgA', 'boissonsCatalogue', 'p1')));
  });

  it('seul un administrateur modifie l’espace, sans toucher au plan ni au propriétaire', async () => {
    const orgRef = (db: any) => doc(db, 'organisations', 'orgA');
    await assertFails(updateDoc(orgRef(as('bob', 'bob@example.com')), { nom: 'Piraté' }));
    const awa = as('awa', 'awa@example.com');
    await assertSucceeds(updateDoc(orgRef(awa), { nom: 'Nouveau nom', ville: 'Douala' }));
    await assertFails(updateDoc(orgRef(awa), { plan: 'agency' }));
    await assertFails(updateDoc(orgRef(awa), { ownerUid: 'bob' }));
    await assertFails(deleteDoc(orgRef(awa)));
  });

  it('un collaborateur ne se promeut pas lui-même', async () => {
    const bob = as('bob', 'bob@example.com');
    await assertFails(updateDoc(doc(bob, 'organisations', 'orgA', 'members', 'bob'), { role: 'admin' }));
  });

  it('un administrateur change un rôle mais ne peut ni rétrograder ni retirer le propriétaire', async () => {
    const awa = as('awa', 'awa@example.com');
    await assertSucceeds(updateDoc(doc(awa, 'organisations', 'orgA', 'members', 'bob'), { role: 'admin' }));
    await assertFails(updateDoc(doc(awa, 'organisations', 'orgA', 'members', 'bob'), { role: 'owner' }));
    const bob = as('bob', 'bob@example.com'); // désormais administrateur
    await assertFails(updateDoc(doc(bob, 'organisations', 'orgA', 'members', 'awa'), { role: 'member' }));
    await assertFails(deleteDoc(doc(bob, 'organisations', 'orgA', 'members', 'awa')));
  });

  it('un administrateur retire un membre, qui perd aussitôt l’accès', async () => {
    const awa = as('awa', 'awa@example.com');
    await assertSucceeds(deleteDoc(doc(awa, 'organisations', 'orgA', 'members', 'bob')));
    await assertSucceeds(deleteDoc(doc(awa, 'users', 'bob', 'memberships', 'orgA')));
    await assertFails(getDocs(collection(as('bob', 'bob@example.com'), 'organisations', 'orgA', 'boissonsCatalogue')));
  });

  it('un membre peut quitter l’espace, pas le propriétaire', async () => {
    await assertSucceeds(deleteDoc(doc(as('bob', 'bob@example.com'), 'organisations', 'orgA', 'members', 'bob')));
    await assertFails(deleteDoc(doc(as('awa', 'awa@example.com'), 'organisations', 'orgA', 'members', 'awa')));
  });
});

describe('invitations', () => {
  const inviteId = 'orgA_dina@example.com';

  it('seul un administrateur invite, uniquement pour son espace', async () => {
    const inv = invitation('orgA', 'dina@example.com', 'member', 'bob');
    await assertFails(setDoc(doc(as('bob', 'bob@example.com'), 'invitations', inviteId), inv));
    await assertFails(setDoc(doc(as('chloe', 'chloe@example.com'), 'invitations', inviteId), { ...inv, invitedBy: 'chloe' }));
    await assertSucceeds(setDoc(doc(as('awa', 'awa@example.com'), 'invitations', inviteId), { ...inv, invitedBy: 'awa' }));
  });

  it('on ne peut pas inviter quelqu’un comme propriétaire', async () => {
    const awa = as('awa', 'awa@example.com');
    await assertFails(setDoc(doc(awa, 'invitations', inviteId), invitation('orgA', 'dina@example.com', 'owner', 'awa')));
  });

  it('l’invité voit son invitation et rejoint avec le rôle prévu, pas un autre', async () => {
    await setDoc(doc(as('awa', 'awa@example.com'), 'invitations', inviteId), invitation('orgA', 'dina@example.com', 'member', 'awa'));
    const dina = as('dina', 'dina@example.com');
    await assertSucceeds(getDocs(query(collection(dina, 'invitations'), where('email', '==', 'dina@example.com'))));
    await assertFails(setDoc(doc(dina, 'organisations', 'orgA', 'members', 'dina'), memberData('dina', 'dina@example.com', 'admin')));
    await assertSucceeds(setDoc(doc(dina, 'organisations', 'orgA', 'members', 'dina'), memberData('dina', 'dina@example.com', 'member')));
    await assertSucceeds(getDocs(collection(dina, 'organisations', 'orgA', 'boissonsCatalogue')));
  });

  it('une invitation ne sert ni à un autre compte ni à une adresse non vérifiée', async () => {
    await setDoc(doc(as('awa', 'awa@example.com'), 'invitations', inviteId), invitation('orgA', 'dina@example.com', 'member', 'awa'));
    const eve = as('eve', 'eve@example.com');
    await assertFails(getDoc(doc(eve, 'invitations', inviteId)));
    await assertFails(setDoc(doc(eve, 'organisations', 'orgA', 'members', 'eve'), memberData('eve', 'eve@example.com', 'member')));
    const fausseDina = as('dina2', 'dina@example.com', false);
    await assertFails(setDoc(doc(fausseDina, 'organisations', 'orgA', 'members', 'dina2'), memberData('dina2', 'dina@example.com', 'member')));
  });

  it('un administrateur liste et annule les invitations de son espace', async () => {
    const awa = as('awa', 'awa@example.com');
    await setDoc(doc(awa, 'invitations', inviteId), invitation('orgA', 'dina@example.com', 'member', 'awa'));
    await assertSucceeds(getDocs(query(collection(awa, 'invitations'), where('orgId', '==', 'orgA'))));
    await assertFails(getDocs(query(collection(as('chloe', 'chloe@example.com'), 'invitations'), where('orgId', '==', 'orgA'))));
    await assertSucceeds(deleteDoc(doc(awa, 'invitations', inviteId)));
  });
});

describe('journal d’activité', () => {
  const entry = (uid: string) => ({ id: 'j1', date: 'x', uid, acteur: uid, action: 'test', description: 'test' });

  it('tout membre écrit en son nom ; seuls les administrateurs lisent', async () => {
    const bob = as('bob', 'bob@example.com');
    await assertSucceeds(setDoc(doc(bob, 'organisations', 'orgA', 'journal', 'j1'), entry('bob')));
    await assertFails(setDoc(doc(bob, 'organisations', 'orgA', 'journal', 'j2'), entry('awa')));
    await assertFails(getDocs(collection(bob, 'organisations', 'orgA', 'journal')));
    await assertSucceeds(getDocs(collection(as('awa', 'awa@example.com'), 'organisations', 'orgA', 'journal')));
  });

  it('une entrée ne peut être ni modifiée ni supprimée, même par le propriétaire', async () => {
    const awa = as('awa', 'awa@example.com');
    await setDoc(doc(awa, 'organisations', 'orgA', 'journal', 'j1'), entry('awa'));
    await assertFails(updateDoc(doc(awa, 'organisations', 'orgA', 'journal', 'j1'), { description: 'réécrit' }));
    await assertFails(deleteDoc(doc(awa, 'organisations', 'orgA', 'journal', 'j1')));
  });
});
