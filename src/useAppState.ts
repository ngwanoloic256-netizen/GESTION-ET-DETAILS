import { useState, useEffect } from 'react';
import {
  AppState,
  SecretariatArticle,
  SecretariatMouvement,
  MobileMoneyTransaction,
  BoissonProduit,
  BoissonMouvement,
  HistoriquePrix,
} from './types';

// Helper to generate IDs
const generateId = () => Math.random().toString(36).substring(2, 9);

// Helper to get dates relative to today
const getRelativeDate = (daysAgo: number, hour = 10, minute = 0) => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
};

const INITIAL_STATE: AppState = {
  secretariatCatalogue: [
    {
      id: 'sec-cah-ang-32',
      nom: 'Cahier Anglophone 32 pages',
      categorie: 'Cahier',
      typeCahier: 'anglophone',
      pagination: '32 pages',
      prixActuel: 200,
      quantiteEnStock: 45,
      seuilAlerte: 10,
      createdAt: getRelativeDate(10),
    },
    {
      id: 'sec-cah-fra-32',
      nom: 'Cahier Francophone 32 pages',
      categorie: 'Cahier',
      typeCahier: 'francophone',
      pagination: '32 pages',
      prixActuel: 200,
      quantiteEnStock: 3, // Bas stock pour déclencher l'alerte
      seuilAlerte: 10,
      createdAt: getRelativeDate(10),
    },
    {
      id: 'sec-cah-ang-96',
      nom: 'Cahier Anglophone 96 pages',
      categorie: 'Cahier',
      typeCahier: 'anglophone',
      pagination: '96 pages',
      prixActuel: 450,
      quantiteEnStock: 25,
      seuilAlerte: 8,
      createdAt: getRelativeDate(10),
    },
    {
      id: 'sec-cah-fra-192',
      nom: 'Cahier Francophone 192 pages',
      categorie: 'Cahier',
      typeCahier: 'francophone',
      pagination: '192 pages',
      prixActuel: 800,
      quantiteEnStock: 12,
      seuilAlerte: 5,
      createdAt: getRelativeDate(10),
    },
    {
      id: 'sec-stylo-b',
      nom: 'Stylo à bille Bleu',
      categorie: 'Fourniture',
      prixActuel: 100,
      quantiteEnStock: 120,
      seuilAlerte: 20,
      createdAt: getRelativeDate(10),
    },
    {
      id: 'sec-rame-a4',
      nom: 'Rame de papier A4 80g',
      categorie: 'Fourniture',
      prixActuel: 3500,
      quantiteEnStock: 8,
      seuilAlerte: 3,
      createdAt: getRelativeDate(10),
    }
  ],
  secretariatMouvements: [
    // Prestations et ventes des jours passés
    {
      id: 'sec-mov-1',
      date: getRelativeDate(3, 9, 30),
      nomPrestationOuArticle: 'Photocopie A4 Simple',
      typeMouvement: 'prestation_service',
      quantite: 15,
      montant: 375, // 25 FCFA par page
    },
    {
      id: 'sec-mov-2',
      date: getRelativeDate(3, 11, 0),
      idArticle: 'sec-cah-ang-32',
      nomPrestationOuArticle: 'Cahier Anglophone 32 pages',
      typeMouvement: 'vente_article',
      quantite: 5,
      montant: 1000,
    },
    {
      id: 'sec-mov-3',
      date: getRelativeDate(2, 14, 15),
      nomPrestationOuArticle: 'Saisie + Impression Rapport',
      typeMouvement: 'prestation_service',
      quantite: 1,
      montant: 2500,
    },
    {
      id: 'sec-mov-4',
      date: getRelativeDate(2, 16, 45),
      idArticle: 'sec-rame-a4',
      nomPrestationOuArticle: 'Rame de papier A4 80g',
      typeMouvement: 'vente_article',
      quantite: 2,
      montant: 7000,
    },
    {
      id: 'sec-mov-5',
      date: getRelativeDate(1, 10, 0),
      nomPrestationOuArticle: 'Reliure de Document',
      typeMouvement: 'prestation_service',
      quantite: 3,
      montant: 1500,
    },
    {
      id: 'sec-mov-6',
      date: getRelativeDate(1, 15, 30),
      idArticle: 'sec-cah-fra-192',
      nomPrestationOuArticle: 'Cahier Francophone 192 pages',
      typeMouvement: 'vente_article',
      quantite: 2,
      montant: 1600,
    },
    // Aujourd'hui
    {
      id: 'sec-mov-7',
      date: getRelativeDate(0, 8, 45),
      nomPrestationOuArticle: 'Photocopie + Plastification',
      typeMouvement: 'prestation_service',
      quantite: 2,
      montant: 1000,
    },
    {
      id: 'sec-mov-8',
      date: getRelativeDate(0, 11, 20),
      idArticle: 'sec-cah-ang-96',
      nomPrestationOuArticle: 'Cahier Anglophone 96 pages',
      typeMouvement: 'vente_article',
      quantite: 4,
      montant: 1800,
    }
  ],
  mobileMoneyTransactions: [
    // Transactions jours passés
    {
      id: 'mm-tx-1',
      date: getRelativeDate(3, 9, 0),
      reseau: 'Orange Money',
      typeOperation: 'dépôt',
      montant: 15000,
      commission: 150,
    },
    {
      id: 'mm-tx-2',
      date: getRelativeDate(3, 13, 20),
      reseau: 'MTN Mobile Money',
      typeOperation: 'retrait',
      montant: 5000,
      commission: 100,
    },
    {
      id: 'mm-tx-3',
      date: getRelativeDate(2, 10, 15),
      reseau: 'Orange Money',
      typeOperation: 'retrait',
      montant: 25000,
      commission: 350,
    },
    {
      id: 'mm-tx-4',
      date: getRelativeDate(2, 15, 40),
      reseau: 'Transfert de crédit',
      typeOperation: 'transfert',
      montant: 2000,
      commission: 200,
    },
    {
      id: 'mm-tx-5',
      date: getRelativeDate(1, 11, 10),
      reseau: 'MTN Mobile Money',
      typeOperation: 'dépôt',
      montant: 50000,
      commission: 500,
    },
    {
      id: 'mm-tx-6',
      date: getRelativeDate(1, 16, 0),
      reseau: 'Transfert de crédit',
      typeOperation: 'transfert',
      montant: 1500,
      commission: 150,
    },
    // Aujourd'hui
    {
      id: 'mm-tx-7',
      date: getRelativeDate(0, 9, 15),
      reseau: 'Orange Money',
      typeOperation: 'dépôt',
      montant: 10000,
      commission: 100,
    },
    {
      id: 'mm-tx-8',
      date: getRelativeDate(0, 10, 30),
      reseau: 'MTN Mobile Money',
      typeOperation: 'retrait',
      montant: 8000,
      commission: 120,
    },
    {
      id: 'mm-tx-9',
      date: getRelativeDate(0, 14, 0),
      reseau: 'Transfert de crédit',
      typeOperation: 'transfert',
      montant: 3000,
      commission: 300,
    }
  ],
  boissonsCatalogue: [
    {
      id: 'b-coca',
      nom: 'Coca-Cola 33cl (Canette)',
      prixAchatActuel: 350,
      prixVenteActuel: 500,
      quantiteEnStock: 24,
      seuilAlerte: 6,
      createdAt: getRelativeDate(10),
    },
    {
      id: 'b-fanta',
      nom: 'Fanta Orange 33cl (Canette)',
      prixAchatActuel: 350,
      prixVenteActuel: 500,
      quantiteEnStock: 4, // Bas stock
      seuilAlerte: 6,
      createdAt: getRelativeDate(10),
    },
    {
      id: 'b-jus-mangue',
      nom: 'Jus de Mangue Naturel Maison',
      prixAchatActuel: 600,
      prixVenteActuel: 1000,
      quantiteEnStock: 15,
      seuilAlerte: 5,
      createdAt: getRelativeDate(10),
    },
    {
      id: 'b-eau-15',
      nom: 'Eau Minérale Tangui 1.5L',
      prixAchatActuel: 250,
      prixVenteActuel: 400,
      quantiteEnStock: 30,
      seuilAlerte: 8,
      createdAt: getRelativeDate(10),
    }
  ],
  boissonsMouvements: [
    // Ventes et approvisionnements passés
    {
      id: 'b-mov-1',
      date: getRelativeDate(3, 10, 0),
      idProduit: 'b-coca',
      nomProduit: 'Coca-Cola 33cl (Canette)',
      quantite: 6,
      typeMouvement: 'vente',
      montant: 3000,
    },
    {
      id: 'b-mov-2',
      date: getRelativeDate(3, 14, 0),
      idProduit: 'b-jus-mangue',
      nomProduit: 'Jus de Mangue Naturel Maison',
      quantite: 4,
      typeMouvement: 'vente',
      montant: 4000,
    },
    {
      id: 'b-mov-3',
      date: getRelativeDate(2, 0, 0), // Entrée de stock
      idProduit: 'b-eau-15',
      nomProduit: 'Eau Minérale Tangui 1.5L',
      quantite: 12,
      typeMouvement: 'entree',
      montant: 3000, // 12 * 250
    },
    {
      id: 'b-mov-4',
      date: getRelativeDate(2, 11, 30),
      idProduit: 'b-fanta',
      nomProduit: 'Fanta Orange 33cl (Canette)',
      quantite: 5,
      typeMouvement: 'vente',
      montant: 2500,
    },
    {
      id: 'b-mov-5',
      date: getRelativeDate(1, 16, 20),
      idProduit: 'b-eau-15',
      nomProduit: 'Eau Minérale Tangui 1.5L',
      quantite: 8,
      typeMouvement: 'vente',
      montant: 3200,
    },
    // Aujourd'hui
    {
      id: 'b-mov-6',
      date: getRelativeDate(0, 10, 10),
      idProduit: 'b-coca',
      nomProduit: 'Coca-Cola 33cl (Canette)',
      quantite: 3,
      typeMouvement: 'vente',
      montant: 1500,
    },
    {
      id: 'b-mov-7',
      date: getRelativeDate(0, 12, 15),
      idProduit: 'b-jus-mangue',
      nomProduit: 'Jus de Mangue Naturel Maison',
      quantite: 2,
      typeMouvement: 'vente',
      montant: 2000,
    }
  ],
  historiquePrix: [
    {
      id: 'hp-1',
      idArticleOuProduit: 'sec-cah-ang-32',
      nomArticleOuProduit: 'Cahier Anglophone 32 pages',
      typeModule: 'secretariat',
      typePrix: 'prix_vente',
      ancienPrix: 180,
      nouveauPrix: 200,
      dateChangement: getRelativeDate(8),
    },
    {
      id: 'hp-2',
      idArticleOuProduit: 'b-jus-mangue',
      nomArticleOuProduit: 'Jus de Mangue Naturel Maison',
      typeModule: 'boissons',
      typePrix: 'prix_vente',
      ancienPrix: 900,
      nouveauPrix: 1000,
      dateChangement: getRelativeDate(5),
    }
  ]
};

export function useAppState() {
  const [state, setState] = useState<AppState>(() => {
    const saved = localStorage.getItem('gestion_stock_state');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Échec du chargement de l'état sauvegardé, utilisation de l'état initial.", e);
        return INITIAL_STATE;
      }
    }
    return INITIAL_STATE;
  });

  useEffect(() => {
    localStorage.setItem('gestion_stock_state', JSON.stringify(state));
  }, [state]);

  // --- ACTIONS GLOBALES ---

  const clearAllData = () => {
    const emptyState: AppState = {
      secretariatCatalogue: [],
      secretariatMouvements: [],
      mobileMoneyTransactions: [],
      boissonsCatalogue: [],
      boissonsMouvements: [],
      historiquePrix: [],
    };
    setState(emptyState);
  };

  const resetToSampleData = () => {
    setState(INITIAL_STATE);
  };

  const importData = (imported: Partial<AppState>) => {
    setState((prev) => ({
      secretariatCatalogue: imported.secretariatCatalogue || prev.secretariatCatalogue,
      secretariatMouvements: imported.secretariatMouvements || prev.secretariatMouvements,
      mobileMoneyTransactions: imported.mobileMoneyTransactions || prev.mobileMoneyTransactions,
      boissonsCatalogue: imported.boissonsCatalogue || prev.boissonsCatalogue,
      boissonsMouvements: imported.boissonsMouvements || prev.boissonsMouvements,
      historiquePrix: imported.historiquePrix || prev.historiquePrix,
    }));
  };

  // --- MODULE 1: SECRETARIAT ACTIONS ---

  const addSecretariatArticle = (article: Omit<SecretariatArticle, 'id' | 'createdAt'>) => {
    const newArticle: SecretariatArticle = {
      ...article,
      id: 'sec-' + generateId(),
      createdAt: new Date().toISOString(),
    };
    setState((prev) => ({
      ...prev,
      secretariatCatalogue: [...prev.secretariatCatalogue, newArticle],
    }));
    return newArticle.id;
  };

  const updateSecretariatArticle = (id: string, updated: Partial<Omit<SecretariatArticle, 'id' | 'createdAt'>>) => {
    setState((prev) => {
      const updatedCatalogue = prev.secretariatCatalogue.map((art) => {
        if (art.id === id) {
          // Vérifier si le prix de vente a changé pour historiser
          const prixChange = updated.prixActuel !== undefined && updated.prixActuel !== art.prixActuel;
          let newPriceHistory: HistoriquePrix[] = [...prev.historiquePrix];

          if (prixChange && updated.prixActuel !== undefined) {
            newPriceHistory.push({
              id: 'hp-' + generateId(),
              idArticleOuProduit: art.id,
              nomArticleOuProduit: updated.nom || art.nom,
              typeModule: 'secretariat',
              typePrix: 'prix_vente',
              ancienPrix: art.prixActuel,
              nouveauPrix: updated.prixActuel,
              dateChangement: new Date().toISOString(),
            });
          }

          return { ...art, ...updated };
        }
        return art;
      });

      // Trouver l'article et s'il a changé de prix, appliquer l'historique
      const artOriginal = prev.secretariatCatalogue.find(a => a.id === id);
      const prixChange = artOriginal && updated.prixActuel !== undefined && updated.prixActuel !== artOriginal.prixActuel;

      if (prixChange && artOriginal && updated.prixActuel !== undefined) {
        return {
          ...prev,
          secretariatCatalogue: updatedCatalogue,
          historiquePrix: [
            ...prev.historiquePrix,
            {
              id: 'hp-' + generateId(),
              idArticleOuProduit: id,
              nomArticleOuProduit: updated.nom || artOriginal.nom,
              typeModule: 'secretariat',
              typePrix: 'prix_vente',
              ancienPrix: artOriginal.prixActuel,
              nouveauPrix: updated.prixActuel,
              dateChangement: new Date().toISOString(),
            }
          ]
        };
      }

      return {
        ...prev,
        secretariatCatalogue: updatedCatalogue,
      };
    });
  };

  const deleteSecretariatArticle = (id: string) => {
    setState((prev) => ({
      ...prev,
      secretariatCatalogue: prev.secretariatCatalogue.filter((art) => art.id !== id),
      // On conserve les mouvements historiques mais sans référence d'ID actif
      secretariatMouvements: prev.secretariatMouvements.map((mov) =>
        mov.idArticle === id ? { ...mov, idArticle: null } : mov
      ),
    }));
  };

  const addSecretariatMouvement = (mouvement: Omit<SecretariatMouvement, 'id' | 'date'> & { date?: string }) => {
    const id = 'sec-mov-' + generateId();
    const dateStr = mouvement.date || new Date().toISOString();
    const newMouvement: SecretariatMouvement = {
      ...mouvement,
      id,
      date: dateStr,
    };

    setState((prev) => {
      // Si c'est une vente ou entrée d'un article de stock, on ajuste le stock
      let updatedCatalogue = [...prev.secretariatCatalogue];
      if (mouvement.idArticle) {
        updatedCatalogue = prev.secretariatCatalogue.map((art) => {
          if (art.id === mouvement.idArticle) {
            let modStock = 0;
            if (mouvement.typeMouvement === 'vente_article') {
              modStock = -mouvement.quantite;
            } else if (mouvement.typeMouvement === 'entree_stock') {
              modStock = mouvement.quantite;
            }
            return {
              ...art,
              quantiteEnStock: Math.max(0, art.quantiteEnStock + modStock),
            };
          }
          return art;
        });
      }

      return {
        ...prev,
        secretariatCatalogue: updatedCatalogue,
        secretariatMouvements: [newMouvement, ...prev.secretariatMouvements],
      };
    });
  };

  // --- MODULE 2: MOBILE MONEY ACTIONS ---

  const addMobileMoneyTransaction = (tx: Omit<MobileMoneyTransaction, 'id' | 'date'> & { date?: string }) => {
    const newTx: MobileMoneyTransaction = {
      ...tx,
      id: 'mm-tx-' + generateId(),
      date: tx.date || new Date().toISOString(),
    };
    setState((prev) => ({
      ...prev,
      mobileMoneyTransactions: [newTx, ...prev.mobileMoneyTransactions],
    }));
  };

  const deleteMobileMoneyTransaction = (id: string) => {
    setState((prev) => ({
      ...prev,
      mobileMoneyTransactions: prev.mobileMoneyTransactions.filter((tx) => tx.id !== id),
    }));
  };

  // --- MODULE 3: BOISSONS ACTIONS ---

  const addBoissonProduit = (product: Omit<BoissonProduit, 'id' | 'createdAt'>) => {
    const newProduct: BoissonProduit = {
      ...product,
      id: 'b-' + generateId(),
      createdAt: new Date().toISOString(),
    };
    setState((prev) => ({
      ...prev,
      boissonsCatalogue: [...prev.boissonsCatalogue, newProduct],
    }));
    return newProduct.id;
  };

  const updateBoissonProduit = (id: string, updated: Partial<Omit<BoissonProduit, 'id' | 'createdAt'>>) => {
    setState((prev) => {
      const prodOriginal = prev.boissonsCatalogue.find(p => p.id === id);
      if (!prodOriginal) return prev;

      const newHistoryEntries: HistoriquePrix[] = [];

      // Vérifier changement prix de vente
      if (updated.prixVenteActuel !== undefined && updated.prixVenteActuel !== prodOriginal.prixVenteActuel) {
        newHistoryEntries.push({
          id: 'hp-' + generateId(),
          idArticleOuProduit: id,
          nomArticleOuProduit: updated.nom || prodOriginal.nom,
          typeModule: 'boissons',
          typePrix: 'prix_vente',
          ancienPrix: prodOriginal.prixVenteActuel,
          nouveauPrix: updated.prixVenteActuel,
          dateChangement: new Date().toISOString(),
        });
      }

      // Vérifier changement prix d'achat
      if (updated.prixAchatActuel !== undefined && updated.prixAchatActuel !== prodOriginal.prixAchatActuel) {
        newHistoryEntries.push({
          id: 'hp-' + generateId(),
          idArticleOuProduit: id,
          nomArticleOuProduit: updated.nom || prodOriginal.nom,
          typeModule: 'boissons',
          typePrix: 'prix_achat',
          ancienPrix: prodOriginal.prixAchatActuel,
          nouveauPrix: updated.prixAchatActuel,
          dateChangement: new Date().toISOString(),
        });
      }

      const updatedCatalogue = prev.boissonsCatalogue.map((prod) => {
        if (prod.id === id) {
          return { ...prod, ...updated };
        }
        return prod;
      });

      return {
        ...prev,
        boissonsCatalogue: updatedCatalogue,
        historiquePrix: [...prev.historiquePrix, ...newHistoryEntries],
      };
    });
  };

  const deleteBoissonProduit = (id: string) => {
    setState((prev) => ({
      ...prev,
      boissonsCatalogue: prev.boissonsCatalogue.filter((prod) => prod.id !== id),
      // On conserve les mouvements historiques mais on retire la liaison ID
      boissonsMouvements: prev.boissonsMouvements.map((mov) =>
        mov.idProduit === id ? { ...mov, idProduit: 'deleted' } : mov
      ),
    }));
  };

  const addBoissonMouvement = (mouvement: Omit<BoissonMouvement, 'id' | 'date'> & { date?: string }) => {
    const id = 'b-mov-' + generateId();
    const dateStr = mouvement.date || new Date().toISOString();
    const newMouvement: BoissonMouvement = {
      ...mouvement,
      id,
      date: dateStr,
    };

    setState((prev) => {
      // Ajustement automatique du stock
      const updatedCatalogue = prev.boissonsCatalogue.map((prod) => {
        if (prod.id === mouvement.idProduit) {
          let modStock = 0;
          if (mouvement.typeMouvement === 'vente') {
            modStock = -mouvement.quantite;
          } else if (mouvement.typeMouvement === 'entree') {
            modStock = mouvement.quantite;
          }
          return {
            ...prod,
            quantiteEnStock: Math.max(0, prod.quantiteEnStock + modStock),
          };
        }
        return prod;
      });

      return {
        ...prev,
        boissonsCatalogue: updatedCatalogue,
        boissonsMouvements: [newMouvement, ...prev.boissonsMouvements],
      };
    });
  };

  return {
    state,
    clearAllData,
    resetToSampleData,
    importData,
    // Secrétariat
    addSecretariatArticle,
    updateSecretariatArticle,
    deleteSecretariatArticle,
    addSecretariatMouvement,
    // Mobile Money
    addMobileMoneyTransaction,
    deleteMobileMoneyTransaction,
    // Boissons
    addBoissonProduit,
    updateBoissonProduit,
    deleteBoissonProduit,
    addBoissonMouvement,
  };
}
