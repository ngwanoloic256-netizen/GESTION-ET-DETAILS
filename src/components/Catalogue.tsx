import React, { useState } from 'react';
import { AppState, SecretariatArticle, BoissonProduit } from '../types';
import { formatFCFA } from '../utils';
import { 
  FolderPlus, 
  Trash2, 
  Edit, 
  PlusCircle, 
  AlertTriangle, 
  BookOpen, 
  Wine, 
  Layers, 
  HelpCircle,
  X,
  Search,
  Sparkles
} from 'lucide-react';

interface CatalogueProps {
  state: AppState;
  onAddSecretariatArticle: (article: Omit<SecretariatArticle, 'id' | 'createdAt'>) => void;
  onUpdateSecretariatArticle: (id: string, updated: Partial<Omit<SecretariatArticle, 'id' | 'createdAt'>>) => void;
  onDeleteSecretariatArticle: (id: string) => void;
  onAddBoissonProduit: (product: Omit<BoissonProduit, 'id' | 'createdAt'>) => void;
  onUpdateBoissonProduit: (id: string, updated: Partial<Omit<BoissonProduit, 'id' | 'createdAt'>>) => void;
  onDeleteBoissonProduit: (id: string) => void;
}

export default function Catalogue({
  state,
  onAddSecretariatArticle,
  onUpdateSecretariatArticle,
  onDeleteSecretariatArticle,
  onAddBoissonProduit,
  onUpdateBoissonProduit,
  onDeleteBoissonProduit,
}: CatalogueProps) {
  const [activeCatalogue, setActiveCatalogue] = useState<'secretariat' | 'boissons'>('secretariat');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Saisie/Édition Secrétariat
  const [secFormMode, setSecFormMode] = useState<'closed' | 'add' | 'edit'>('closed');
  const [editingSecId, setEditingSecId] = useState<string>('');
  const [secNom, setSecNom] = useState<string>('');
  const [secCategorie, setSecCategorie] = useState<'Cahier' | 'Fourniture' | 'Prestation' | 'Autre'>('Cahier');
  const [secTypeCahier, setSecTypeCahier] = useState<'anglophone' | 'francophone' | null>(null);
  const [secPagination, setSecPagination] = useState<string>('');
  const [secPrixActuel, setSecPrixActuel] = useState<string>('');
  const [secStock, setSecStock] = useState<string>('0');
  const [secSeuil, setSecSeuil] = useState<string>('5');

  // Saisie/Édition Boissons
  const [boissonFormMode, setBoissonFormMode] = useState<'closed' | 'add' | 'edit'>('closed');
  const [editingBoissonId, setEditingBoissonId] = useState<string>('');
  const [bNom, setBNom] = useState<string>('');
  const [bPrixAchat, setBPrixAchat] = useState<string>('');
  const [bPrixVente, setBPrixVente] = useState<string>('');
  const [bStock, setBStock] = useState<string>('0');
  const [bSeuil, setBSeuil] = useState<string>('5');

  // Modal de confirmation
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  // --- ACTIONS SECRETARIAT ---

  const handleOpenAddSec = () => {
    setSecFormMode('add');
    setSecNom('');
    setSecCategorie('Cahier');
    setSecTypeCahier('anglophone');
    setSecPagination('32 pages');
    setSecPrixActuel('');
    setSecStock('0');
    setSecSeuil('5');
  };

  const handleOpenEditSec = (art: SecretariatArticle) => {
    setSecFormMode('edit');
    setEditingSecId(art.id);
    setSecNom(art.nom);
    setSecCategorie(art.categorie);
    setSecTypeCahier(art.typeCahier || null);
    setSecPagination(art.pagination || '');
    setSecPrixActuel(art.prixActuel.toString());
    setSecStock(art.quantiteEnStock.toString());
    setSecSeuil(art.seuilAlerte.toString());
  };

  const handleSaveSec = (e: React.FormEvent) => {
    e.preventDefault();
    if (!secNom.trim()) return alert('Le nom est requis.');
    const prix = parseFloat(secPrixActuel);
    const stockVal = parseInt(secStock);
    const seuilVal = parseInt(secSeuil);

    if (isNaN(prix) || prix < 0) return alert('Le prix doit être un nombre valide.');
    if (isNaN(stockVal) || stockVal < 0) return alert('Le stock doit être un nombre valide.');
    if (isNaN(seuilVal) || seuilVal < 0) return alert('Le seuil doit être un nombre valide.');

    // Construire le nom final automatiquement pour les cahiers si non customisé
    let nomFinal = secNom;
    if (secCategorie === 'Cahier' && secTypeCahier && secPagination) {
      const typeStr = secTypeCahier === 'anglophone' ? 'Anglophone' : 'Francophone';
      nomFinal = `Cahier ${typeStr} ${secPagination}`;
    }

    const payload = {
      nom: nomFinal,
      categorie: secCategorie,
      typeCahier: secCategorie === 'Cahier' ? secTypeCahier : null,
      pagination: secCategorie === 'Cahier' ? secPagination : null,
      prixActuel: prix,
      quantiteEnStock: stockVal,
      seuilAlerte: seuilVal,
    };

    if (secFormMode === 'add') {
      onAddSecretariatArticle(payload);
      alert('Article ajouté avec succès !');
    } else {
      onUpdateSecretariatArticle(editingSecId, payload);
      alert('Article mis à jour avec succès !');
    }

    setSecFormMode('closed');
  };

  // --- ACTIONS BOISSONS ---

  const handleOpenAddBoisson = () => {
    setBoissonFormMode('add');
    setBNom('');
    setBPrixAchat('');
    setBPrixVente('');
    setBStock('0');
    setBSeuil('5');
  };

  const handleOpenEditBoisson = (prod: BoissonProduit) => {
    setBoissonFormMode('edit');
    setEditingBoissonId(prod.id);
    setBNom(prod.nom);
    setBPrixAchat(prod.prixAchatActuel.toString());
    setBPrixVente(prod.prixVenteActuel.toString());
    setBStock(prod.quantiteEnStock.toString());
    setBSeuil(prod.seuilAlerte.toString());
  };

  const handleSaveBoisson = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bNom.trim()) return alert('Le nom est requis.');
    const pAchat = parseFloat(bPrixAchat);
    const pVente = parseFloat(bPrixVente);
    const stockVal = parseInt(bStock);
    const seuilVal = parseInt(bSeuil);

    if (isNaN(pAchat) || pAchat < 0) return alert("Le prix d'achat doit être valide.");
    if (isNaN(pVente) || pVente < 0) return alert('Le prix de vente doit être valide.');
    if (isNaN(stockVal) || stockVal < 0) return alert('Le stock doit être un nombre.');
    if (isNaN(seuilVal) || seuilVal < 0) return alert('Le seuil doit être un nombre.');

    const payload = {
      nom: bNom,
      prixAchatActuel: pAchat,
      prixVenteActuel: pVente,
      quantiteEnStock: stockVal,
      seuilAlerte: seuilVal,
    };

    if (boissonFormMode === 'add') {
      onAddBoissonProduit(payload);
      alert('Boisson ajoutée au catalogue !');
    } else {
      onUpdateBoissonProduit(editingBoissonId, payload);
      alert('Fiche boisson mise à jour !');
    }

    setBoissonFormMode('closed');
  };

  // --- FILTRES ---
  const filteredSecCatalogue = state.secretariatCatalogue.filter(art => 
    art.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
    art.categorie.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredBoissonsCatalogue = state.boissonsCatalogue.filter(prod =>
    prod.nom.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6" id="catalogue-section">
      
      {/* En-tête de section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-100 shadow-xs">
        <div>
          <h2 className="text-xl font-semibold text-slate-800">Gestion des Catalogues de Produits</h2>
          <p className="text-sm text-slate-500 font-normal">Ajoutez librement de nouvelles fournitures, cahiers, prestations ou types de boissons</p>
        </div>
        
        {/* Toggle Catalogues */}
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            onClick={() => { setActiveCatalogue('secretariat'); setSearchTerm(''); }}
            className={`px-4 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center gap-1.5 ${
              activeCatalogue === 'secretariat' 
                ? 'bg-white text-slate-800 shadow-xs font-semibold' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <BookOpen size={14} />
            Catalogue Secrétariat
          </button>
          <button
            onClick={() => { setActiveCatalogue('boissons'); setSearchTerm(''); }}
            className={`px-4 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center gap-1.5 ${
              activeCatalogue === 'boissons' 
                ? 'bg-white text-slate-800 shadow-xs font-semibold' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Wine size={14} />
            Catalogue Boissons
          </button>
        </div>
      </div>

      {/* Barre de recherche et Bouton d'ajout */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white p-4 rounded-xl border border-slate-100">
        <div className="relative w-full sm:w-80">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder={`Rechercher dans ${activeCatalogue === 'secretariat' ? 'les fournitures/cahiers' : 'les boissons'}...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:border-blue-500 bg-slate-50"
          />
        </div>

        <button
          onClick={activeCatalogue === 'secretariat' ? handleOpenAddSec : handleOpenAddBoisson}
          className={`w-full sm:w-auto px-4 py-2 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 shadow-2xs transition-all cursor-pointer ${
            activeCatalogue === 'secretariat' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-amber-600 hover:bg-amber-700'
          }`}
          id="add-to-catalogue-btn"
        >
          <PlusCircle size={14} />
          {activeCatalogue === 'secretariat' ? 'Ajouter Article Secrétariat' : 'Ajouter une Boisson'}
        </button>
      </div>

      {/* --- FORMULAIRE MODAL SECRÉTARIAT --- */}
      {secFormMode !== 'closed' && (
        <div className="bg-slate-50 p-6 rounded-2xl border-2 border-dashed border-blue-200">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
              <FolderPlus size={16} className="text-blue-500" />
              {secFormMode === 'add' ? 'Création d\'un nouvel article secrétariat' : 'Édition d\'article secrétariat'}
            </h3>
            <button onClick={() => setSecFormMode('closed')} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
              <X size={16} />
            </button>
          </div>

          <form onSubmit={handleSaveSec} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Categorie */}
            <div>
              <label className="block text-2xs font-semibold text-slate-500 mb-1">Catégorie</label>
              <select
                value={secCategorie}
                onChange={(e) => {
                  const cat = e.target.value as any;
                  setSecCategorie(cat);
                  if (cat === 'Cahier') {
                    setSecTypeCahier('anglophone');
                    setSecPagination('32 pages');
                  } else {
                    setSecTypeCahier(null);
                    setSecPagination('');
                  }
                }}
                className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
              >
                <option value="Cahier">📚 Cahier</option>
                <option value="Fourniture">✏️ Fourniture physique (stylo, etc.)</option>
                <option value="Prestation">💼 Prestation administrative pure</option>
                <option value="Autre">📦 Autre</option>
              </select>
            </div>

            {/* Nom */}
            <div className={secCategorie === 'Cahier' ? 'md:col-span-1' : 'md:col-span-2'}>
              <label className="block text-2xs font-semibold text-slate-500 mb-1">Désignation / Nom</label>
              <input 
                type="text"
                placeholder={secCategorie === 'Cahier' ? 'Automatique (Type + Pages)' : 'Ex: Stylo Bleu, Reliure spirale...'}
                value={secNom}
                onChange={(e) => setSecNom(e.target.value)}
                className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg"
                disabled={secCategorie === 'Cahier'}
                required={secCategorie !== 'Cahier'}
              />
            </div>

            {/* Configuration Spécifique Cahier */}
            {secCategorie === 'Cahier' && (
              <>
                {/* Type de cahier */}
                <div>
                  <label className="block text-2xs font-semibold text-slate-500 mb-1">Type de Cahier</label>
                  <select
                    value={secTypeCahier || 'anglophone'}
                    onChange={(e) => setSecTypeCahier(e.target.value as any)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
                  >
                    <option value="anglophone">Anglophone</option>
                    <option value="francophone">Francophone</option>
                  </select>
                </div>

                {/* Pagination */}
                <div>
                  <label className="block text-2xs font-semibold text-slate-500 mb-1">Pagination</label>
                  <select
                    value={secPagination}
                    onChange={(e) => setSecPagination(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
                  >
                    <option value="32 pages">32 pages</option>
                    <option value="48 pages">48 pages</option>
                    <option value="96 pages">96 pages</option>
                    <option value="192 pages">192 pages</option>
                    <option value="288 pages">288 pages</option>
                  </select>
                </div>
              </>
            )}

            {/* Prix actuel */}
            <div>
              <label className="block text-2xs font-semibold text-slate-500 mb-1">Prix de vente actuel (FCFA)</label>
              <input 
                type="number"
                min="0"
                placeholder="Ex: 200"
                value={secPrixActuel}
                onChange={(e) => setSecPrixActuel(e.target.value)}
                className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg"
                required
                id="sec-price-input"
              />
            </div>

            {/* Quantite stock (Sauf si Prestation pure) */}
            <div>
              <label className="block text-2xs font-semibold text-slate-500 mb-1">Stock Initial</label>
              <input 
                type="number"
                min="0"
                value={secStock}
                onChange={(e) => setSecStock(e.target.value)}
                className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg"
                disabled={secCategorie === 'Prestation'}
              />
            </div>

            {/* Seuil alerte */}
            <div>
              <label className="block text-2xs font-semibold text-slate-500 mb-1">Seuil Alerte Stock Bas</label>
              <input 
                type="number"
                min="0"
                value={secSeuil}
                onChange={(e) => setSecSeuil(e.target.value)}
                className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg"
                disabled={secCategorie === 'Prestation'}
              />
            </div>

            {/* Validation */}
            <div className="md:col-span-3 flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSecFormMode('closed')}
                className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-2xs font-bold rounded-lg"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-2xs font-bold rounded-lg"
              >
                Enregistrer Article
              </button>
            </div>

          </form>
        </div>
      )}

      {/* --- FORMULAIRE MODAL BOISSONS --- */}
      {boissonFormMode !== 'closed' && (
        <div className="bg-slate-50 p-6 rounded-2xl border-2 border-dashed border-amber-200">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
              <Wine size={16} className="text-amber-500" />
              {boissonFormMode === 'add' ? 'Ajouter une nouvelle boisson' : 'Modifier la fiche boisson'}
            </h3>
            <button onClick={() => setBoissonFormMode('closed')} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
              <X size={16} />
            </button>
          </div>

          <form onSubmit={handleSaveBoisson} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            
            {/* Nom */}
            <div className="lg:col-span-2">
              <label className="block text-2xs font-semibold text-slate-500 mb-1">Nom / Description de la boisson</label>
              <input 
                type="text"
                placeholder="Ex: Coca-Cola Canette 33cl, Jus de Gingembre Maison..."
                value={bNom}
                onChange={(e) => setBNom(e.target.value)}
                className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg"
                required
              />
            </div>

            {/* Prix d'achat */}
            <div>
              <label className="block text-2xs font-semibold text-slate-500 mb-1">Prix d'Achat Actuel (FCFA)</label>
              <input 
                type="number"
                min="0"
                placeholder="Ex: 350"
                value={bPrixAchat}
                onChange={(e) => setBPrixAchat(e.target.value)}
                className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg"
                required
                id="drink-buy-price"
              />
            </div>

            {/* Prix de vente */}
            <div>
              <label className="block text-2xs font-semibold text-slate-500 mb-1">Prix de Vente Actuel (FCFA)</label>
              <input 
                type="number"
                min="0"
                placeholder="Ex: 500"
                value={bPrixVente}
                onChange={(e) => setBPrixVente(e.target.value)}
                className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg"
                required
                id="drink-sell-price"
              />
            </div>

            {/* Stock Initial */}
            <div>
              <label className="block text-2xs font-semibold text-slate-500 mb-1">Stock Initial (Quantité)</label>
              <input 
                type="number"
                min="0"
                value={bStock}
                onChange={(e) => setBStock(e.target.value)}
                className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg"
              />
            </div>

            {/* Seuil alerte */}
            <div>
              <label className="block text-2xs font-semibold text-slate-500 mb-1">Seuil Alerte Stock Bas</label>
              <input 
                type="number"
                min="0"
                value={bSeuil}
                onChange={(e) => setBSeuil(e.target.value)}
                className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg"
              />
            </div>

            {/* Validation */}
            <div className="lg:col-span-3 flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setBoissonFormMode('closed')}
                className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-2xs font-bold rounded-lg"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-2xs font-bold rounded-lg"
              >
                Enregistrer la Boisson
              </button>
            </div>

          </form>
        </div>
      )}

      {/* --- GRID / LISTING DES PRODUITS --- */}
      {activeCatalogue === 'secretariat' ? (
        
        /* Catalogue Secrétariat */
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs">
          {filteredSecCatalogue.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-sm">
              Aucun article présent dans le catalogue secrétariat. Utilisez le bouton "Ajouter Article Secrétariat".
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredSecCatalogue.map(art => {
                const stockAlerte = art.categorie !== 'Prestation' && art.quantiteEnStock <= art.seuilAlerte;
                return (
                  <div 
                    key={art.id} 
                    className={`p-4 rounded-xl border flex flex-col justify-between hover:shadow-xs transition-all bg-white relative ${
                      stockAlerte ? 'border-amber-200 bg-amber-50/5' : 'border-slate-100'
                    }`}
                  >
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <span className={`px-2 py-0.5 rounded text-3xs font-bold uppercase tracking-wider ${
                          art.categorie === 'Cahier' 
                            ? 'bg-blue-100 text-blue-700' 
                            : art.categorie === 'Fourniture' 
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-purple-100 text-purple-700'
                        }`}>
                          {art.categorie}
                        </span>
                        
                        {/* Actions */}
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleOpenEditSec(art)}
                            className="p-1 text-slate-400 hover:text-blue-600 hover:bg-slate-50 rounded-lg transition-all cursor-pointer"
                          >
                            <Edit size={12} />
                          </button>
                          <button
                            onClick={() => {
                              setConfirmModal({
                                isOpen: true,
                                title: "Supprimer l'article",
                                message: `Voulez-vous vraiment supprimer "${art.nom}" du catalogue ? Cette action est irréversible.`,
                                onConfirm: () => {
                                  onDeleteSecretariatArticle(art.id);
                                  setConfirmModal(prev => ({ ...prev, isOpen: false }));
                                }
                              });
                            }}
                            className="p-1 text-slate-400 hover:text-red-500 hover:bg-slate-50 rounded-lg transition-all cursor-pointer"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>

                      <h4 className="text-xs font-bold text-slate-700 mb-1">{art.nom}</h4>
                      
                      {art.categorie === 'Cahier' && (
                        <p className="text-3xs text-slate-400 mb-2">
                          Type : <b>{art.typeCahier}</b> | Pagination : <b>{art.pagination}</b>
                        </p>
                      )}
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-50 flex justify-between items-end">
                      <div>
                        <span className="text-3xs text-slate-400 uppercase font-semibold">Tarif public</span>
                        <p className="text-sm font-black text-slate-800">{formatFCFA(art.prixActuel)}</p>
                      </div>

                      {art.categorie !== 'Prestation' ? (
                        <div className="text-right">
                          <span className="text-3xs text-slate-400 uppercase font-semibold">Stock dispo</span>
                          <p className={`text-xs font-bold ${stockAlerte ? 'text-amber-600' : 'text-slate-700'}`}>
                            {art.quantiteEnStock} unités
                          </p>
                        </div>
                      ) : (
                        <div className="text-right">
                          <span className="text-3xs text-emerald-600 font-bold uppercase">Prestation administrative</span>
                        </div>
                      )}
                    </div>

                    {stockAlerte && (
                      <div className="absolute bottom-2.5 left-4 flex items-center gap-1 text-3xs text-amber-600 font-black animate-pulse">
                        <AlertTriangle size={10} />
                        STOCK CRITIQUE !
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

      ) : (
        
        /* Catalogue Boissons */
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs">
          {filteredBoissonsCatalogue.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-sm">
              Aucun produit n'est enregistré dans votre catalogue de boissons.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredBoissonsCatalogue.map(prod => {
                const stockAlerte = prod.quantiteEnStock <= prod.seuilAlerte;
                const marge = prod.prixVenteActuel - prod.prixAchatActuel;
                return (
                  <div 
                    key={prod.id} 
                    className={`p-4 rounded-xl border flex flex-col justify-between hover:shadow-xs transition-all bg-white relative ${
                      stockAlerte ? 'border-amber-250 bg-amber-50/5' : 'border-slate-100'
                    }`}
                  >
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-100 rounded text-3xs font-bold uppercase tracking-wider">
                          Boisson / Jus
                        </span>
                        
                        {/* Actions */}
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleOpenEditBoisson(prod)}
                            className="p-1 text-slate-400 hover:text-amber-600 hover:bg-slate-50 rounded-lg transition-all cursor-pointer"
                          >
                            <Edit size={12} />
                          </button>
                          <button
                            onClick={() => {
                              setConfirmModal({
                                isOpen: true,
                                title: "Retirer la boisson",
                                message: `Voulez-vous vraiment retirer "${prod.nom}" du catalogue des boissons ? Cette action est irréversible.`,
                                onConfirm: () => {
                                  onDeleteBoissonProduit(prod.id);
                                  setConfirmModal(prev => ({ ...prev, isOpen: false }));
                                }
                              });
                            }}
                            className="p-1 text-slate-400 hover:text-red-500 hover:bg-slate-50 rounded-lg transition-all cursor-pointer"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>

                      <h4 className="text-xs font-bold text-slate-700 mb-1">{prod.nom}</h4>
                      <p className="text-3xs text-emerald-600 font-bold flex items-center gap-0.5">
                        <Sparkles size={10} /> Marge estimée : +{formatFCFA(marge)} / unité
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-50 grid grid-cols-3 gap-2">
                      <div>
                        <span className="text-3xs text-slate-400 uppercase font-semibold block">Prix Achat</span>
                        <span className="text-2xs font-bold text-slate-600">{prod.prixAchatActuel} F</span>
                      </div>
                      <div>
                        <span className="text-3xs text-slate-400 uppercase font-semibold block">Prix Vente</span>
                        <span className="text-xs font-black text-slate-800">{prod.prixVenteActuel} F</span>
                      </div>
                      <div className="text-right">
                        <span className="text-3xs text-slate-400 uppercase font-semibold block">En Stock</span>
                        <span className={`text-xs font-black ${stockAlerte ? 'text-amber-600' : 'text-slate-700'}`}>
                          {prod.quantiteEnStock}
                        </span>
                      </div>
                    </div>

                    {stockAlerte && (
                      <div className="absolute bottom-2.5 left-4 flex items-center gap-1 text-3xs text-amber-600 font-black animate-pulse">
                        <AlertTriangle size={10} />
                        STOCK CRITIQUE !
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

      )}

      {/* Boîte de dialogue de confirmation (Modal) */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-red-50 text-red-600">
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
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-xl transition-all cursor-pointer"
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
