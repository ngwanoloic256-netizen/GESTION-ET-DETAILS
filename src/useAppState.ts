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
import { db } from './firebase';
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  onSnapshot
} from 'firebase/firestore';
import { handleFirestoreError, OperationType } from './firebaseUtils';

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
    {
      id: 'sec-mov-1',
      date: getRelativeDate(3, 9, 30),
      nomPrestationOuArticle: 'Photocopie A4 Simple',
      typeMouvement: 'prestation_service',
      quantite: 15,
      montant: 375,
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
      quantiteEnStock: 4,
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
      date: getRelativeDate(2, 0, 0),
      idProduit: 'b-eau-15',
      nomProduit: 'Eau Minérale Tangui 1.5L',
      quantite: 12,
      typeMouvement: 'entree',
      montant: 3000,
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

const EMPTY_STATE: AppState = {
  secretariatCatalogue: [],
  secretariatMouvements: [],
  mobileMoneyTransactions: [],
  boissonsCatalogue: [],
  boissonsMouvements: [],
  historiquePrix: [],
};

/**
 * Données métier d'une organisation. Tout est lu et écrit sous
 * organisations/{orgId}/… ; passer `null` coupe la synchronisation
 * (module désactivé ou aucune organisation active).
 */
export function useAppState(orgId: string | null) {
  const [loading, setLoading] = useState<boolean>(true);
  const [state, setState] = useState<AppState>(EMPTY_STATE);
  const [syncStatus, setSyncStatus] = useState<'saved' | 'saving' | 'error'>('saved');

  const orgDoc = (col: string, id: string) => doc(db, 'organisations', orgId as string, col, id);

  // Helper to force synchronization and update status
  const runSync = async <T>(promise: Promise<T>): Promise<T> => {
    setSyncStatus('saving');
    try {
      const res = await promise;
      setSyncStatus('saved');
      return res;
    } catch (error) {
      setSyncStatus('error');
      throw error;
    }
  };

  // Remplit l'organisation avec le jeu de données de démonstration (action explicite uniquement)
  const seedInitialData = async () => {
    try {
      const batch = writeBatch(db);

      INITIAL_STATE.secretariatCatalogue.forEach((item) => {
        batch.set(orgDoc('secretariatCatalogue', item.id), item);
      });

      INITIAL_STATE.secretariatMouvements.forEach((item) => {
        batch.set(orgDoc('secretariatMouvements', item.id), item);
      });

      INITIAL_STATE.mobileMoneyTransactions.forEach((item) => {
        batch.set(orgDoc('mobileMoneyTransactions', item.id), item);
      });

      INITIAL_STATE.boissonsCatalogue.forEach((item) => {
        batch.set(orgDoc('boissonsCatalogue', item.id), item);
      });

      INITIAL_STATE.boissonsMouvements.forEach((item) => {
        batch.set(orgDoc('boissonsMouvements', item.id), item);
      });

      INITIAL_STATE.historiquePrix.forEach((item) => {
        batch.set(orgDoc('historiquePrix', item.id), item);
      });

      await runSync(batch.commit());
      console.log("Firestore initialized successfully with default template data.");
    } catch (err) {
      console.error("Auto-seeding Firestore failed: ", err);
    }
  };

  useEffect(() => {
    setState(EMPTY_STATE);

    if (!orgId) {
      setLoading(false);
      return;
    }

    const keys = Object.keys(EMPTY_STATE) as (keyof AppState)[];
    const loaded = new Set<keyof AppState>();
    setLoading(true);

    const unsubscribers = keys.map((key) => {
      return onSnapshot(collection(db, 'organisations', orgId, key), (snapshot) => {
        const items: any[] = [];
        snapshot.forEach((snapDoc) => {
          items.push(snapDoc.data());
        });

        setState((prev) => ({
          ...prev,
          [key]: items,
        }));

        loaded.add(key);
        if (loaded.size >= keys.length) setLoading(false);
      }, (error) => {
        console.error(`Error loading collection ${key}: `, error);
        // Ne pas rester bloqué sur l'écran de chargement en cas de refus des règles
        setLoading(false);
      });
    });

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [orgId]);

  // --- ACTIONS GLOBALES ---

  const clearAllData = async () => {
    try {
      const batch = writeBatch(db);
      state.secretariatCatalogue.forEach(item => batch.delete(orgDoc('secretariatCatalogue', item.id)));
      state.secretariatMouvements.forEach(item => batch.delete(orgDoc('secretariatMouvements', item.id)));
      state.mobileMoneyTransactions.forEach(item => batch.delete(orgDoc('mobileMoneyTransactions', item.id)));
      state.boissonsCatalogue.forEach(item => batch.delete(orgDoc('boissonsCatalogue', item.id)));
      state.boissonsMouvements.forEach(item => batch.delete(orgDoc('boissonsMouvements', item.id)));
      state.historiquePrix.forEach(item => batch.delete(orgDoc('historiquePrix', item.id)));
      await runSync(batch.commit());
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'clear_all_data');
    }
  };

  const resetToSampleData = async () => {
    try {
      await clearAllData();
      await seedInitialData();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'reset_to_sample_data');
    }
  };

  const resetExceptLastThreeSecretariat = async () => {
    try {
      const batch = writeBatch(db);

      // 1. Get secretariat movements sorted by date descending (most recent first)
      const sortedSecMovs = [...state.secretariatMouvements].sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );

      // Keep the 3 most recent, delete the rest
      const keptSecMovs = sortedSecMovs.slice(0, 3);
      const keepSecIds = new Set(keptSecMovs.map(m => m.id));

      sortedSecMovs.forEach(item => {
        if (!keepSecIds.has(item.id)) {
          batch.delete(orgDoc('secretariatMouvements', item.id));
        }
      });

      // 2. Delete all Mobile Money transactions
      state.mobileMoneyTransactions.forEach(item => {
        batch.delete(orgDoc('mobileMoneyTransactions', item.id));
      });

      // 3. Delete all Boissons movements
      state.boissonsMouvements.forEach(item => {
        batch.delete(orgDoc('boissonsMouvements', item.id));
      });

      // 4. Delete all Historique Prix
      state.historiquePrix.forEach(item => {
        batch.delete(orgDoc('historiquePrix', item.id));
      });

      // 5. Reset all stocks in Boissons Catalogue to 0
      state.boissonsCatalogue.forEach(item => {
        batch.update(orgDoc('boissonsCatalogue', item.id), { quantiteEnStock: 0 });
      });

      // 6. Reset all stocks in Secretariat Catalogue to 0
      state.secretariatCatalogue.forEach(item => {
        batch.update(orgDoc('secretariatCatalogue', item.id), { quantiteEnStock: 0 });
      });

      await runSync(batch.commit());
      console.log("Remise à zéro sélective réussie (excepté les 3 dernières transactions secrétariat).");
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'reset_except_last_three_secretariat');
    }
  };

  const importData = async (imported: Partial<AppState>) => {
    try {
      const batch = writeBatch(db);

      if (imported.secretariatCatalogue) {
        imported.secretariatCatalogue.forEach(item => batch.set(orgDoc('secretariatCatalogue', item.id), item));
      }
      if (imported.secretariatMouvements) {
        imported.secretariatMouvements.forEach(item => batch.set(orgDoc('secretariatMouvements', item.id), item));
      }
      if (imported.mobileMoneyTransactions) {
        imported.mobileMoneyTransactions.forEach(item => batch.set(orgDoc('mobileMoneyTransactions', item.id), item));
      }
      if (imported.boissonsCatalogue) {
        imported.boissonsCatalogue.forEach(item => batch.set(orgDoc('boissonsCatalogue', item.id), item));
      }
      if (imported.boissonsMouvements) {
        imported.boissonsMouvements.forEach(item => batch.set(orgDoc('boissonsMouvements', item.id), item));
      }
      if (imported.historiquePrix) {
        imported.historiquePrix.forEach(item => batch.set(orgDoc('historiquePrix', item.id), item));
      }

      await runSync(batch.commit());
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'import_data');
    }
  };

  // --- MODULE 1: SECRETARIAT ACTIONS ---

  const addSecretariatArticle = async (article: Omit<SecretariatArticle, 'id' | 'createdAt'>) => {
    const id = 'sec-' + generateId();
    const newArticle: SecretariatArticle = {
      ...article,
      id,
      createdAt: new Date().toISOString(),
    };
    try {
      await runSync(setDoc(orgDoc('secretariatCatalogue', id), newArticle));
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `secretariatCatalogue/${id}`);
    }
    return id;
  };

  const updateSecretariatArticle = async (id: string, updated: Partial<Omit<SecretariatArticle, 'id' | 'createdAt'>>) => {
    try {
      const artOriginal = state.secretariatCatalogue.find(a => a.id === id);
      if (!artOriginal) return;

      const prixChange = updated.prixActuel !== undefined && updated.prixActuel !== artOriginal.prixActuel;

      const batch = writeBatch(db);
      batch.update(orgDoc('secretariatCatalogue', id), updated);

      if (prixChange && updated.prixActuel !== undefined) {
        const histId = 'hp-' + generateId();
        const histEntry: HistoriquePrix = {
          id: histId,
          idArticleOuProduit: id,
          nomArticleOuProduit: updated.nom || artOriginal.nom,
          typeModule: 'secretariat',
          typePrix: 'prix_vente',
          ancienPrix: artOriginal.prixActuel,
          nouveauPrix: updated.prixActuel,
          dateChangement: new Date().toISOString(),
        };
        batch.set(orgDoc('historiquePrix', histId), histEntry);
      }

      await runSync(batch.commit());
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `secretariatCatalogue/${id}`);
    }
  };

  const deleteSecretariatArticle = async (id: string) => {
    try {
      const batch = writeBatch(db);
      batch.delete(orgDoc('secretariatCatalogue', id));

      state.secretariatMouvements.forEach((mov) => {
        if (mov.idArticle === id) {
          batch.update(orgDoc('secretariatMouvements', mov.id), { idArticle: null });
        }
      });

      await runSync(batch.commit());
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `secretariatCatalogue/${id}`);
    }
  };

  const addSecretariatMouvement = async (mouvement: Omit<SecretariatMouvement, 'id' | 'date'> & { date?: string }) => {
    const id = 'sec-mov-' + generateId();
    const dateStr = mouvement.date || new Date().toISOString();
    const newMouvement: SecretariatMouvement = {
      ...mouvement,
      id,
      date: dateStr,
    };

    try {
      const batch = writeBatch(db);
      batch.set(orgDoc('secretariatMouvements', id), newMouvement);

      if (mouvement.idArticle) {
        const art = state.secretariatCatalogue.find((a) => a.id === mouvement.idArticle);
        if (art) {
          let modStock = 0;
          if (mouvement.typeMouvement === 'vente_article') {
            modStock = -mouvement.quantite;
          } else if (mouvement.typeMouvement === 'entree_stock') {
            modStock = mouvement.quantite;
          }
          batch.update(orgDoc('secretariatCatalogue', mouvement.idArticle), {
            quantiteEnStock: Math.max(0, art.quantiteEnStock + modStock),
          });
        }
      }

      await runSync(batch.commit());
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `secretariatMouvements/${id}`);
    }
  };

  // --- MODULE 2: MOBILE MONEY ACTIONS ---

  const addMobileMoneyTransaction = async (tx: Omit<MobileMoneyTransaction, 'id' | 'date'> & { date?: string }) => {
    const id = 'mm-tx-' + generateId();
    const newTx: MobileMoneyTransaction = {
      ...tx,
      id,
      date: tx.date || new Date().toISOString(),
    };
    try {
      await runSync(setDoc(orgDoc('mobileMoneyTransactions', id), newTx));
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `mobileMoneyTransactions/${id}`);
    }
  };

  const deleteMobileMoneyTransaction = async (id: string) => {
    try {
      await runSync(deleteDoc(orgDoc('mobileMoneyTransactions', id)));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `mobileMoneyTransactions/${id}`);
    }
  };

  // --- MODULE 3: BOISSONS ACTIONS ---

  const addBoissonProduit = async (product: Omit<BoissonProduit, 'id' | 'createdAt'>) => {
    const id = 'b-' + generateId();
    const newProduct: BoissonProduit = {
      ...product,
      id,
      createdAt: new Date().toISOString(),
    };
    try {
      await runSync(setDoc(orgDoc('boissonsCatalogue', id), newProduct));
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `boissonsCatalogue/${id}`);
    }
    return id;
  };

  const updateBoissonProduit = async (id: string, updated: Partial<Omit<BoissonProduit, 'id' | 'createdAt'>>) => {
    try {
      const prodOriginal = state.boissonsCatalogue.find(p => p.id === id);
      if (!prodOriginal) return;

      const batch = writeBatch(db);
      batch.update(orgDoc('boissonsCatalogue', id), updated);

      if (updated.prixVenteActuel !== undefined && updated.prixVenteActuel !== prodOriginal.prixVenteActuel) {
        const histId = 'hp-' + generateId();
        batch.set(orgDoc('historiquePrix', histId), {
          id: histId,
          idArticleOuProduit: id,
          nomArticleOuProduit: updated.nom || prodOriginal.nom,
          typeModule: 'boissons',
          typePrix: 'prix_vente',
          ancienPrix: prodOriginal.prixVenteActuel,
          nouveauPrix: updated.prixVenteActuel,
          dateChangement: new Date().toISOString(),
        });
      }

      if (updated.prixAchatActuel !== undefined && updated.prixAchatActuel !== prodOriginal.prixAchatActuel) {
        const histId = 'hp-' + generateId();
        batch.set(orgDoc('historiquePrix', histId), {
          id: histId,
          idArticleOuProduit: id,
          nomArticleOuProduit: updated.nom || prodOriginal.nom,
          typeModule: 'boissons',
          typePrix: 'prix_achat',
          ancienPrix: prodOriginal.prixAchatActuel,
          nouveauPrix: updated.prixAchatActuel,
          dateChangement: new Date().toISOString(),
        });
      }

      await runSync(batch.commit());
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `boissonsCatalogue/${id}`);
    }
  };

  const deleteBoissonProduit = async (id: string) => {
    try {
      const batch = writeBatch(db);
      batch.delete(orgDoc('boissonsCatalogue', id));

      state.boissonsMouvements.forEach((mov) => {
        if (mov.idProduit === id) {
          batch.update(orgDoc('boissonsMouvements', mov.id), { idProduit: 'deleted' });
        }
      });

      await runSync(batch.commit());
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `boissonsCatalogue/${id}`);
    }
  };

  const addBoissonMouvement = async (mouvement: Omit<BoissonMouvement, 'id' | 'date'> & { date?: string }) => {
    const id = 'b-mov-' + generateId();
    const dateStr = mouvement.date || new Date().toISOString();
    const newMouvement: BoissonMouvement = {
      ...mouvement,
      id,
      date: dateStr,
    };

    try {
      const batch = writeBatch(db);
      batch.set(orgDoc('boissonsMouvements', id), newMouvement);

      const prod = state.boissonsCatalogue.find((p) => p.id === mouvement.idProduit);
      if (prod) {
        let modStock = 0;
        if (mouvement.typeMouvement === 'vente') {
          modStock = -mouvement.quantite;
        } else if (mouvement.typeMouvement === 'entree') {
          modStock = mouvement.quantite;
        }
        batch.update(orgDoc('boissonsCatalogue', mouvement.idProduit), {
          quantiteEnStock: Math.max(0, prod.quantiteEnStock + modStock),
        });
      }

      await runSync(batch.commit());
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `boissonsMouvements/${id}`);
    }
  };

  return {
    state,
    loading,
    syncStatus,
    clearAllData,
    resetToSampleData,
    resetExceptLastThreeSecretariat,
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
