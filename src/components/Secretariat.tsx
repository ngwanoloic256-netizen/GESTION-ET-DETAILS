import React, { useState } from 'react';
import { AppState, SecretariatArticle, SecretariatMouvement } from '../types';
import { formatFCFA, formatDateLabel, exportSecretariatMouvements } from '../utils';
import { 
  FileText, 
  PlusCircle, 
  Download, 
  BookOpen, 
  Wrench, 
  ShoppingCart, 
  Trash2, 
  Layers,
  Search,
  Calendar,
  AlertCircle,
  AlertTriangle
} from 'lucide-react';

interface SecretariatProps {
  state: AppState;
  onAddMouvement: (mouvement: Omit<SecretariatMouvement, 'id' | 'date'> & { date?: string }) => void;
}

export default function Secretariat({ state, onAddMouvement }: SecretariatProps) {
  const [activeTab, setActiveTab] = useState<'record' | 'history'>('record');
  
  // Form States
  const [typeMouvement, setTypeMouvement] = useState<'prestation_service' | 'vente_article'>('prestation_service');
  
  // Vente Article Form
  const [selectedArticleId, setSelectedArticleId] = useState<string>('');
  const [venteQuantite, setVenteQuantite] = useState<number>(1);
  const [venteCustomPrice, setVenteCustomPrice] = useState<string>(''); // Si le gérant veut modifier le prix à la volée
  
  // Prestation Service Form
  const [nomPrestation, setNomPrestation] = useState<string>('');
  const [prestationQuantite, setPrestationQuantite] = useState<number>(1);
  const [prestationMontant, setPrestationMontant] = useState<string>('');
  
  // Commun
  const [customDate, setCustomDate] = useState<string>('');

  // Filtre Historique
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('all');

  // Modal de confirmation
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type: 'warning' | 'info';
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    type: 'info'
  });

  // Suggestion de prestations courantes pour saisie en 1 clic !
  const PRESTATIONS_PREDEFINIES = [
    { nom: 'Photocopie Couleur', prix: 50 },
    { nom: 'Photocopie Recto Verso Couleur', prix: 100 },
    { nom: 'Photocopie Noir sur Blanc', prix: 50 },
    { nom: 'Reliure de Document', prix: 500 },
    { nom: 'Saisie de Texte / page', prix: 500 },
    { nom: 'Plastification A4', prix: 500 },
  ];

  // Article actuellement sélectionné
  const selectedArticle = state.secretariatCatalogue.find(art => art.id === selectedArticleId);
  const unitPrice = selectedArticle ? selectedArticle.prixActuel : 0;
  const currentStock = selectedArticle ? selectedArticle.quantiteEnStock : 0;
  
  // Calcul montant vente total
  const finalVenteUnitPrice = venteCustomPrice ? parseFloat(venteCustomPrice) : unitPrice;
  const venteTotal = finalVenteUnitPrice * venteQuantite;

  const handlePredefSelect = (p: { nom: string, prix: number }) => {
    setNomPrestation(p.nom);
    setPrestationMontant(p.prix.toString());
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const movementDate = customDate ? new Date(customDate).toISOString() : new Date().toISOString();

    if (typeMouvement === 'vente_article') {
      if (!selectedArticleId) {
        alert('Veuillez sélectionner un article.');
        return;
      }
      if (!selectedArticle) return;
      if (venteQuantite <= 0) {
        alert('Veuillez spécifier une quantité supérieure à 0.');
        return;
      }

      const executeVenteArticle = () => {
        onAddMouvement({
          idArticle: selectedArticleId,
          nomPrestationOuArticle: selectedArticle.nom,
          typeMouvement: 'vente_article',
          quantite: venteQuantite,
          montant: venteTotal,
          date: movementDate
        });

        // Reset
        setSelectedArticleId('');
        setVenteQuantite(1);
        setVenteCustomPrice('');
        setCustomDate('');
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        alert('Vente enregistrée avec succès ! Stock mis à jour.');
      };

      if (venteQuantite > selectedArticle.quantiteEnStock) {
        setConfirmModal({
          isOpen: true,
          title: "Attention : Stock insuffisant",
          message: `Le stock disponible (${selectedArticle.quantiteEnStock}) est inférieur à la quantité demandée (${venteQuantite}). Voulez-vous quand même forcer et enregistrer cette vente pour un montant total de ${formatFCFA(venteTotal)} ?`,
          type: 'warning',
          onConfirm: executeVenteArticle
        });
      } else {
        setConfirmModal({
          isOpen: true,
          title: "Confirmer la vente",
          message: `Voulez-vous enregistrer la vente de ${venteQuantite} × "${selectedArticle.nom}" pour un montant total de ${formatFCFA(venteTotal)} ?`,
          type: 'info',
          onConfirm: executeVenteArticle
        });
      }
    } else {
      if (!nomPrestation.trim()) {
        alert('Veuillez spécifier le nom de la prestation.');
        return;
      }
      const montant = parseFloat(prestationMontant);
      if (isNaN(montant) || montant < 0) {
        alert('Veuillez entrer un montant valide.');
        return;
      }
      if (prestationQuantite <= 0) {
        alert('Veuillez spécifier une quantité supérieure à 0.');
        return;
      }

      const executePrestation = () => {
        onAddMouvement({
          nomPrestationOuArticle: nomPrestation,
          typeMouvement: 'prestation_service',
          quantite: prestationQuantite,
          montant: montant * prestationQuantite,
          date: movementDate
        });

        // Reset
        setNomPrestation('');
        setPrestationQuantite(1);
        setPrestationMontant('');
        setCustomDate('');
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        alert('Prestation de service enregistrée avec succès !');
      };

      setConfirmModal({
        isOpen: true,
        title: "Confirmer la prestation",
        message: `Voulez-vous enregistrer la prestation administrative "${nomPrestation}" (Quantité : ${prestationQuantite}) pour un montant de ${formatFCFA(montant * prestationQuantite)} ?`,
        type: 'info',
        onConfirm: executePrestation
      });
    }
  };

  // --- RENDU FICHE DES CAHIERS (TRIÉ PAR TYPE ET PAGES) ---
  const cahiers = state.secretariatCatalogue.filter(art => art.categorie === 'Cahier');
  
  const getCahierStateColor = (stock: number, seuil: number) => {
    if (stock === 0) return 'bg-red-50 text-red-700 border-red-150';
    if (stock <= seuil) return 'bg-amber-50 text-amber-700 border-amber-150 animate-pulse';
    return 'bg-emerald-50 text-emerald-700 border-emerald-100';
  };

  // Filtrer l'historique
  const filteredMouvements = state.secretariatMouvements.filter(m => {
    const matchesSearch = m.nomPrestationOuArticle.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || m.typeMouvement === filterType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6" id="secretariat-section">
      
      {/* En-tête de section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-100 shadow-xs">
        <div>
          <h2 className="text-xl font-semibold text-slate-800">Module Secrétariat & Prestations</h2>
          <p className="text-sm text-slate-500 font-normal">Saisie des prestations de service et vente de fournitures / cahiers</p>
        </div>
        
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            onClick={() => setActiveTab('record')}
            className={`px-4 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'record' 
                ? 'bg-white text-slate-800 shadow-xs font-semibold' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <PlusCircle size={14} />
            Saisie Opérations
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'history' 
                ? 'bg-white text-slate-800 shadow-xs font-semibold' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Layers size={14} />
            Journal & Stocks
          </button>
        </div>
      </div>

      {activeTab === 'record' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Formulaire de saisie d'opérations */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs lg:col-span-2">
            <h3 className="text-base font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <FileText size={18} className="text-blue-500" />
              Nouvel enregistrement secrétariat
            </h3>

            {/* Toggle Prestation vs Vente */}
            <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl border border-slate-200 mb-6">
              <button
                type="button"
                onClick={() => setTypeMouvement('prestation_service')}
                className={`py-2 text-xs font-medium rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  typeMouvement === 'prestation_service'
                    ? 'bg-white text-blue-600 shadow-xs font-bold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Wrench size={14} />
                Prestation administrative
              </button>
              <button
                type="button"
                onClick={() => setTypeMouvement('vente_article')}
                className={`py-2 text-xs font-medium rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  typeMouvement === 'vente_article'
                    ? 'bg-white text-blue-600 shadow-xs font-bold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <ShoppingCart size={14} />
                Vente d'article du stock
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* --- CAS 1: PRESTATION DE SERVICE --- */}
              {typeMouvement === 'prestation_service' && (
                <div className="space-y-4">
                  
                  {/* Saisie Directe */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-xs font-semibold text-slate-500 mb-1.5">Désignation du service</label>
                      <input 
                        type="text"
                        placeholder="Ex: Photocopie CNI, Saisie de mémoire..."
                        value={nomPrestation}
                        onChange={(e) => setNomPrestation(e.target.value)}
                        className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1.5">Prix unitaire (FCFA)</label>
                      <input 
                        type="number"
                        min="0"
                        placeholder="Ex: 100"
                        value={prestationMontant}
                        onChange={(e) => setPrestationMontant(e.target.value)}
                        className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      />
                    </div>
                  </div>

                  {/* Boutons Raccourcis / Saisie 1-clic */}
                  <div>
                    <span className="block text-2xs font-semibold text-slate-400 mb-2 uppercase">Modèles de prestations fréquentes</span>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {PRESTATIONS_PREDEFINIES.map((p, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handlePredefSelect(p)}
                          className="p-2.5 bg-slate-50 hover:bg-blue-50/70 border border-slate-100 hover:border-blue-200 rounded-xl text-left transition-all group"
                        >
                          <h4 className="text-2xs font-bold text-slate-600 group-hover:text-blue-600">{p.nom}</h4>
                          <span className="text-3xs font-semibold text-slate-400 mt-1 block">{p.prix} FCFA</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1.5">Quantité (Nombre d'unités ou pages)</label>
                      <input 
                        type="number"
                        min="1"
                        value={prestationQuantite}
                        onChange={(e) => setPrestationQuantite(parseInt(e.target.value) || 1)}
                        className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1.5">Date personnalisée (Laisser vide si aujourd'hui)</label>
                      <input 
                        type="datetime-local"
                        value={customDate}
                        onChange={(e) => setCustomDate(e.target.value)}
                        className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      />
                    </div>
                  </div>

                  {/* Récapitulatif prestation */}
                  {nomPrestation && prestationMontant && (
                    <div className="bg-blue-50/60 p-4 rounded-xl border border-blue-100/50 flex justify-between items-center mt-2">
                      <div>
                        <h4 className="text-xs font-bold text-slate-700">{nomPrestation}</h4>
                        <p className="text-3xs text-slate-400 mt-0.5">{prestationQuantite} × {prestationMontant} FCFA</p>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-semibold text-slate-400">Total :</span>
                        <h3 className="text-base font-black text-blue-600">{formatFCFA((parseFloat(prestationMontant) || 0) * prestationQuantite)}</h3>
                      </div>
                    </div>
                  )}

                </div>
              )}

              {/* --- CAS 2: VENTE D'UN ARTICLE DU STOCK --- */}
              {typeMouvement === 'vente_article' && (
                <div className="space-y-4">
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1.5">Sélectionner l'article en stock</label>
                      <select
                        id="select-article"
                        value={selectedArticleId}
                        onChange={(e) => {
                          setSelectedArticleId(e.target.value);
                          setVenteCustomPrice(''); // Reset prix personnalisé
                        }}
                        className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:border-blue-500 focus:ring-2 focus:ring-blue-100 bg-white"
                      >
                        <option value="">-- Choisir un article --</option>
                        {state.secretariatCatalogue.map(art => (
                          <option key={art.id} value={art.id} disabled={art.quantiteEnStock <= 0}>
                            {art.nom} ({art.quantiteEnStock} restants) — {art.prixActuel} F
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1.5">Modifier le prix unitaire si négociation (Optionnel)</label>
                      <input 
                        type="number"
                        min="0"
                        placeholder={selectedArticle ? `Prix actuel : ${selectedArticle.prixActuel} F` : "Ex: 200"}
                        value={venteCustomPrice}
                        onChange={(e) => setVenteCustomPrice(e.target.value)}
                        className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                        disabled={!selectedArticleId}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1.5">Quantité vendue</label>
                      <input 
                        type="number"
                        min="1"
                        value={venteQuantite}
                        onChange={(e) => setVenteQuantite(parseInt(e.target.value) || 1)}
                        className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                        disabled={!selectedArticleId}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1.5">Date personnalisée (Laisser vide si aujourd'hui)</label>
                      <input 
                        type="datetime-local"
                        value={customDate}
                        onChange={(e) => setCustomDate(e.target.value)}
                        className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      />
                    </div>
                  </div>

                  {/* Fiche d'alerte ou résumé de stock */}
                  {selectedArticle && (
                    <div className={`p-4 rounded-xl border flex justify-between items-center ${
                      selectedArticle.quantiteEnStock <= selectedArticle.seuilAlerte 
                        ? 'bg-amber-50/50 border-amber-200 text-amber-800' 
                        : 'bg-emerald-50/30 border-emerald-100 text-emerald-800'
                    }`}>
                      <div className="space-y-1">
                        <span className="text-3xs font-bold uppercase tracking-wider">État actuel du stock</span>
                        <h4 className="text-xs font-bold">{selectedArticle.nom}</h4>
                        <div className="flex gap-4 text-2xs font-medium text-slate-500">
                          <span>Stock dispo : <b className="text-slate-700">{selectedArticle.quantiteEnStock}</b></span>
                          <span>Seuil bas : <b className="text-slate-700">{selectedArticle.seuilAlerte}</b></span>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <span className="text-2xs font-semibold">Total vente :</span>
                        <h3 className="text-base font-black text-blue-600">{formatFCFA(venteTotal)}</h3>
                      </div>
                    </div>
                  )}

                </div>
              )}

              {/* Bouton de validation */}
              <div className="pt-4 border-t border-slate-100 flex justify-end">
                <button
                  type="submit"
                  id="submit-sec-op-btn"
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold py-2.5 px-6 rounded-xl shadow-xs hover:shadow-md transition-all cursor-pointer"
                >
                  Valider l'enregistrement
                </button>
              </div>

            </form>
          </div>

          {/* Synthèse latérale : Fiche de stocks de cahiers */}
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex flex-col justify-between">
            <div>
              <h3 className="text-base font-semibold text-slate-800 mb-1 flex items-center gap-1.5">
                <BookOpen size={18} className="text-blue-500" />
                Stocks des Cahiers
              </h3>
              <p className="text-2xs text-slate-400">Fiche par référence distincte (Type + Pagination)</p>
            </div>

            <div className="my-4 space-y-4 overflow-y-auto max-h-[360px] pr-1">
              {cahiers.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-xs">
                  Aucun cahier dans le catalogue actuellement. Créez-en un dans l'onglet 'Catalogues'.
                </div>
              ) : (
                <>
                  {/* Cahiers Anglophones */}
                  <div>
                    <h4 className="text-2xs font-bold text-slate-400 mb-2 uppercase tracking-wide">📚 Anglophones</h4>
                    <div className="grid grid-cols-1 gap-2">
                      {cahiers
                        .filter(c => c.typeCahier === 'anglophone')
                        .map(c => (
                          <div 
                            key={c.id} 
                            className={`p-2.5 rounded-xl border flex justify-between items-center ${getCahierStateColor(c.quantiteEnStock, c.seuilAlerte)}`}
                          >
                            <div>
                              <h5 className="text-2xs font-bold">{c.pagination || 'N/A'}</h5>
                              <span className="text-3xs opacity-80">{c.prixActuel} F / unité</span>
                            </div>
                            <div className="text-right">
                              <span className="text-xs font-black">{c.quantiteEnStock} en stock</span>
                              {c.quantiteEnStock <= c.seuilAlerte && (
                                <span className="block text-3xs text-amber-600 font-bold mt-0.5 animate-pulse">Alerte</span>
                              )}
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>

                  {/* Cahiers Francophones */}
                  <div className="pt-2">
                    <h4 className="text-2xs font-bold text-slate-400 mb-2 uppercase tracking-wide">📖 Francophones</h4>
                    <div className="grid grid-cols-1 gap-2">
                      {cahiers
                        .filter(c => c.typeCahier === 'francophone')
                        .map(c => (
                          <div 
                            key={c.id} 
                            className={`p-2.5 rounded-xl border flex justify-between items-center ${getCahierStateColor(c.quantiteEnStock, c.seuilAlerte)}`}
                          >
                            <div>
                              <h5 className="text-2xs font-bold">{c.pagination || 'N/A'}</h5>
                              <span className="text-3xs opacity-80">{c.prixActuel} F / unité</span>
                            </div>
                            <div className="text-right">
                              <span className="text-xs font-black">{c.quantiteEnStock} en stock</span>
                              {c.quantiteEnStock <= c.seuilAlerte && (
                                <span className="block text-3xs text-amber-600 font-bold mt-0.5 animate-pulse">Alerte</span>
                              )}
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            <p className="text-3xs text-slate-400 border-t border-slate-50 pt-3 text-center">
              Configurez les alertes et pagination dans "Gestion des catalogues"
            </p>
          </div>

        </div>
      ) : (
        /* Journal historique */
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs">
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <h3 className="text-base font-semibold text-slate-800">Journal des transactions de secrétariat</h3>
            
            <div className="flex flex-wrap gap-2 w-full md:w-auto">
              {/* Recherche */}
              <div className="relative flex-1 md:w-64">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Rechercher une opération..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-1.5 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:border-blue-500 bg-slate-50"
                />
              </div>

              {/* Filtre Type */}
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-3 py-1.5 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:outline-hidden"
              >
                <option value="all">Tous les types</option>
                <option value="prestation_service">Prestations</option>
                <option value="vente_article">Ventes articles</option>
                <option value="entree_stock">Entrées stock</option>
              </select>

              {/* Bouton Export */}
              <button
                onClick={() => exportSecretariatMouvements(filteredMouvements)}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded-xl flex items-center gap-1.5 shadow-2xs hover:shadow-md transition-all cursor-pointer"
              >
                <Download size={14} />
                Exporter CSV
              </button>
            </div>
          </div>

          {filteredMouvements.length === 0 ? (
            <div className="text-center py-16 text-slate-400 text-sm">
              Aucune opération ne correspond à vos critères de recherche.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 text-3xs font-bold uppercase tracking-wider">
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Désignation / Article</th>
                    <th className="py-3 px-4 text-center">Quantité</th>
                    <th className="py-3 px-4 text-right">Montant Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-xs">
                  {filteredMouvements.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50/50 transition-all text-slate-600">
                      <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                        <span className="flex items-center gap-1">
                          <Calendar size={12} />
                          {formatDateLabel(m.date, true)}
                        </span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-full text-3xs font-bold uppercase tracking-wide ${
                          m.typeMouvement === 'vente_article' 
                            ? 'bg-blue-50 text-blue-700 border border-blue-100' 
                            : m.typeMouvement === 'entree_stock'
                            ? 'bg-purple-50 text-purple-700 border border-purple-100'
                            : 'bg-teal-50 text-teal-700 border border-teal-100'
                        }`}>
                          {m.typeMouvement === 'vente_article' ? 'Vente Article' : m.typeMouvement === 'entree_stock' ? 'Entrée' : 'Prestation'}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-700">
                        {m.nomPrestationOuArticle}
                      </td>
                      <td className="py-3 px-4 text-center font-bold">
                        {m.quantite}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-slate-800">
                        {formatFCFA(m.montant)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

        </div>
      )}

      {/* Boîte de dialogue de confirmation (Modal) */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
                <AlertTriangle size={20} className="stroke-[2.5]" />
              </div>
              <h3 className="text-base font-bold text-slate-800">{confirmModal.title}</h3>
            </div>
            <p className="text-sm text-slate-600 mb-6 font-normal">
              {confirmModal.message}
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-all cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => {
                  confirmModal.onConfirm();
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition-all cursor-pointer"
              >
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
