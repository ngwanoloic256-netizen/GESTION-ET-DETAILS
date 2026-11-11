// Modèle de données de la plateforme (phase 1 « Fondations »).
// Tout ce qui appartient à un commerçant vit sous organisations/{orgId}/…

export type Role = 'owner' | 'admin' | 'member';
export type Plan = 'free' | 'business' | 'growth' | 'agency';
export type TypeOrganisation = 'commerce' | 'agence';

export interface OrganisationModules {
  /** Gestion de stock et de caisse (secrétariat, Mobile Money, boissons). */
  gestionMultiService: boolean;
}

export interface Organisation {
  id: string;
  nom: string;
  type: TypeOrganisation;
  secteur: string;
  pays: string;
  ville: string;
  devise: string;
  langue: 'fr' | 'en';
  whatsapp: string;
  /** Modifiable uniquement côté serveur (facturation) : les règles Firestore le verrouillent. */
  plan: Plan;
  modules: OrganisationModules;
  ownerUid: string;
  createdAt: string;
  updatedAt: string;
}

export interface Member {
  uid: string;
  email: string;
  displayName: string;
  role: Role;
  joinedAt: string;
}

export interface Invitation {
  id: string;
  orgId: string;
  orgName: string;
  email: string;
  role: Exclude<Role, 'owner'>;
  invitedBy: string;
  invitedByName: string;
  createdAt: string;
}

export interface JournalEntry {
  id: string;
  date: string;
  uid: string;
  acteur: string;
  action: string;
  description: string;
}

export interface NouvelleOrganisation {
  nom: string;
  type: TypeOrganisation;
  secteur: string;
  pays: string;
  ville: string;
  devise: string;
  langue: 'fr' | 'en';
  whatsapp: string;
  gestionMultiService: boolean;
}

export const ROLE_LABELS: Record<Role, string> = {
  owner: 'Propriétaire',
  admin: 'Administrateur',
  member: 'Collaborateur',
};

export const SECTEURS = [
  'Mode & vêtements',
  'Chaussures & accessoires',
  'Beauté & cosmétiques',
  'Électronique & téléphonie',
  'Alimentation & produits locaux',
  'Services & multi-services',
  'Agence marketing',
  'Autre',
];

export const PAYS: { nom: string; devise: string }[] = [
  { nom: 'Cameroun', devise: 'XAF' },
  { nom: 'Gabon', devise: 'XAF' },
  { nom: 'Congo', devise: 'XAF' },
  { nom: 'Tchad', devise: 'XAF' },
  { nom: 'Centrafrique', devise: 'XAF' },
  { nom: 'Guinée équatoriale', devise: 'XAF' },
  { nom: "Côte d'Ivoire", devise: 'XOF' },
  { nom: 'Sénégal', devise: 'XOF' },
  { nom: 'Bénin', devise: 'XOF' },
  { nom: 'Togo', devise: 'XOF' },
  { nom: 'Burkina Faso', devise: 'XOF' },
  { nom: 'Mali', devise: 'XOF' },
  { nom: 'Niger', devise: 'XOF' },
];

export const isAdminRole = (role: Role | null | undefined) => role === 'owner' || role === 'admin';

/** Collections métier rangées sous chaque organisation. */
export const COLLECTIONS_METIER = [
  'secretariatCatalogue',
  'secretariatMouvements',
  'mobileMoneyTransactions',
  'boissonsCatalogue',
  'boissonsMouvements',
  'historiquePrix',
] as const;
