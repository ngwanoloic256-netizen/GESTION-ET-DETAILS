export type ModuleType = 'secretariat' | 'mobile_money' | 'boissons' | 'reports';

// --- SECRETARIAT TYPES ---
export interface SecretariatArticle {
  id: string;
  nom: string;
  categorie: 'Cahier' | 'Fourniture' | 'Prestation' | 'Autre';
  typeCahier?: 'anglophone' | 'francophone' | null; // Pour les cahiers
  pagination?: string | null;                      // Ex. "32 pages", "96 pages"
  prixActuel: number;
  quantiteEnStock: number;
  seuilAlerte: number;
  createdAt: string;
}

export interface SecretariatMouvement {
  id: string;
  date: string; // ISO string
  idArticle?: string | null; // Optionnel (ex: si prestation de service pure sans article)
  nomPrestationOuArticle: string;
  typeMouvement: 'vente_article' | 'prestation_service' | 'entree_stock';
  quantite: number;
  montant: number;
}

// --- MOBILE MONEY TYPES ---
export type MobileMoneyReseau = 'Orange Money' | 'MTN Mobile Money' | 'Transfert de crédit';
export type MobileMoneyTypeOperation = 'dépôt' | 'retrait' | 'transfert';

export interface MobileMoneyTransaction {
  id: string;
  date: string; // ISO string
  reseau: MobileMoneyReseau;
  typeOperation: MobileMoneyTypeOperation;
  montant: number;
  commission: number;
}

// --- BOISSONS TYPES ---
export interface BoissonProduit {
  id: string;
  nom: string;
  prixAchatActuel: number;
  prixVenteActuel: number;
  quantiteEnStock: number;
  seuilAlerte: number;
  createdAt: string;
}

export interface BoissonMouvement {
  id: string;
  date: string; // ISO string
  idProduit: string;
  nomProduit: string;
  quantite: number;
  typeMouvement: 'vente' | 'entree'; // 'vente' pour sortie, 'entree' pour réapprovisionnement
  montant: number; // Prix d'achat total (pour entree) ou Prix de vente total (pour vente)
}

// --- HISTORIQUE DES PRIX ---
export interface HistoriquePrix {
  id: string;
  idArticleOuProduit: string;
  nomArticleOuProduit: string;
  typeModule: 'secretariat' | 'boissons';
  typePrix: 'prix_vente' | 'prix_achat'; // Pour les boissons, on suit l'achat et la vente
  ancienPrix: number;
  nouveauPrix: number;
  dateChangement: string; // ISO string
}

// --- APP STATE FOR PERSISTENCE ---
export interface AppState {
  secretariatCatalogue: SecretariatArticle[];
  secretariatMouvements: SecretariatMouvement[];
  mobileMoneyTransactions: MobileMoneyTransaction[];
  boissonsCatalogue: BoissonProduit[];
  boissonsMouvements: BoissonMouvement[];
  historiquePrix: HistoriquePrix[];
}
