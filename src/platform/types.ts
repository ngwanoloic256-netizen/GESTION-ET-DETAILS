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
  /** Identité de marque utilisée par le studio de création. */
  marque?: Marque;
  ownerUid: string;
  createdAt: string;
  updatedAt: string;
}

export interface Marque {
  couleurPrimaire: string;
  couleurSecondaire: string;
  ton: string;
  slogan: string;
  /** Logo en data URL (PNG réduit), ou chaîne vide. */
  logo: string;
}

export const MARQUE_PAR_DEFAUT: Marque = {
  couleurPrimaire: '#1d4ed8',
  couleurSecondaire: '#f59e0b',
  ton: 'Chaleureux et direct',
  slogan: '',
  logo: '',
};

export const TONS = ['Chaleureux et direct', 'Professionnel', 'Dynamique et jeune', 'Haut de gamme'];

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

// ---------- Catalogue et studio de création (phase 2) ----------

export interface Produit {
  id: string;
  nom: string;
  prix: number;
  /** Prix promotionnel ; null hors promotion. */
  prixPromo: number | null;
  description: string;
  /** Tailles, couleurs, variantes : texte libre. */
  variantes: string;
  /** Zones et conditions de livraison : texte libre. */
  livraison: string;
  /** Identifiants des photos (documents de la collection medias). */
  photos: string[];
  /** Miniature de la première photo, en data URL, pour les listes. */
  vignette: string;
  createdAt: string;
  updatedAt: string;
}

export interface Media {
  id: string;
  dataUrl: string;
  largeur: number;
  hauteur: number;
  createdAt: string;
}

export type ModeleId = 'affiche' | 'promo' | 'epure';

export interface TextesCreation {
  accroche: string;
  sousTitre: string;
  cta: string;
  badge: string;
  afficherPrix: boolean;
  legende: string;
}

export interface Creation extends TextesCreation {
  id: string;
  produitId: string;
  nomProduit: string;
  photoId: string | null;
  modele: ModeleId;
  creePar: string;
  createdAt: string;
}

export interface PropositionIA {
  angle: string;
  accroche: string;
  sousTitre: string;
  cta: string;
  legende: string;
  hashtags: string[];
}
