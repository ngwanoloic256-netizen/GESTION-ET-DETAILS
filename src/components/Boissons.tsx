import React, { useState } from 'react';
import { AppState, BoissonProduit, BoissonMouvement } from '../types';
import { formatFCFA, formatDateLabel, exportBoissonsMouvements } from '../utils';
import { 
  Wine, 
  PlusCircle, 
  Download, 
  Trash2, 
  Search, 
  Calendar, 
  ShoppingBag, 
  TrendingUp, 
  ArrowUpRight, 
  ArrowDownLeft, 
  AlertTriangle,
  Award
} from 'lucide-react';

interface BoissonsProps {
  state: AppState;
  onAddMouvement: (mouvement: Omit<BoissonMouvement, 'id' | 'date'> & { date?: string }) => void;
}

export default function Boissons({ state, onAddMouvement }: BoissonsProps) {
  const [activeTab, setActiveTab] = useState<'record' | 'history'>('record');

  // Form States
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [typeMouvement, setTypeMouvement] = useState<'vente' | 'entree'>('vente');
  const [quantite, setQuantite] = useState<number>(1);
  const [customPrice, setCustomPrice] = useState<string>(''); // For over-the-counter price bargaining
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

  // Produit actif
  const selectedProduct = state.boissonsCatalogue.find(p => p.id === selectedProductId);
  
  // Prix de référence selon vente ou entrée
  const referencePrice = selectedProduct 
    ? (typeMouvement === 'vente' ? selectedProduct.prixVenteActuel : selectedProduct.prixAchatActuel) 
    : 0;

  const finalUnitPrice = customPrice ? parseFloat(customPrice) : referencePrice;
  const totalAmount = finalUnitPrice * quantite;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedProductId) {
      alert('Veuillez sélectionner un produit.');
      return;
    }
    if (!selectedProduct) return;
    if (quantite <= 0) {
      alert('Veuillez spécifier une quantité supérieure à 0.');
      return;
    }

    const movDate = customDate ? new Date(customDate).toISOString() : new Date().toISOString();

    const executeAddMouvement = () => {
      onAddMouvement({
        idProduit: selectedProductId,
        nomProduit: selectedProduct.nom,
        quantite,
        typeMouvement,
        montant: totalAmount,
        date: movDate
      });

      // Reset Form
      setSelectedProductId('');
      setQuantite(1);
      setCustomPrice('');
      setCustomDate('');
      setConfirmModal(prev => ({ ...prev, isOpen: false }));
      alert(typeMouvement === 'vente' ? 'Vente enregistrée ! Stock décrémenté.' : 'Réapprovisionnement enregistré ! Stock incrémenté.');
    };

    if (typeMouvement === 'vente' && quantite > selectedProduct.quantiteEnStock) {
      setConfirmModal({
        isOpen: true,
        title: "Attention : Stock insuffisant",
        message: `Le stock disponible (${selectedProduct.quantiteEnStock}) est inférieur à la quantité demandée (${quantite}). Voulez-vous forcer la vente de ${quantite} × "${selectedProduct.nom}" pour un montant total de ${formatFCFA(totalAmount)} ?`,
        type: 'warning',
        onConfirm: executeAddMouvement
      });
    } else {
      setConfirmModal({
        isOpen: true,
        title: typeMouvement === 'vente' ? "Confirmer la vente" : "Confirmer l'approvisionnement",
        message: typeMouvement === 'vente'
          ? `Voulez-vous enregistrer la vente de ${quantite} × "${selectedProduct.nom}" pour un montant total de ${formatFCFA(totalAmount)} ?`
          : `Voulez-vous enregistrer l'approvisionnement de ${quantite} × "${selectedProduct.nom}" pour un montant de ${formatFCFA(totalAmount)} ?`,
        type: 'info',
        onConfirm: executeAddMouvement
      });
    }
  };

  // --- ANALYSTICS / STATS DU MODULE BOISSONS ---
  
  // 1. Valeur totale du stock restant (Valorisé au prix d'achat)
  const totalStockValue = state.boissonsCatalogue.reduce(
    (sum, prod) => sum + (prod.quantiteEnStock * prod.prixAchatActuel), 0
  );

  // 2. Chiffre d'affaires global de boissons
  const totalBoissonsSales = state.boissonsMouvements
    .filter(m => m.typeMouvement === 'vente')
    .reduce((sum, m) => sum + m.montant, 0);

  // 3. Produits les plus vendus (top-sellers)
  const productSalesMap: { [key: string]: { name: string, qty: number } } = {};
  state.boissonsMouvements
    .filter(m => m.typeMouvement === 'vente')
    .forEach(m => {
      if (!productSalesMap[m.idProduit]) {
        productSalesMap[m.idProduit] = { name: m.nomProduit, qty: 0 };
      }
      productSalesMap[m.idProduit].qty += m.quantite;
    });

  const topSellers = Object.values(productSalesMap)
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 3);

  // Filtrer l'historique
  const filteredMouvements = state.boissonsMouvements.filter(m => {
    const matchesSearch = m.nomProduit.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || m.typeMouvement === filterType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6" id="boissons-section">
      
      {/* En-tête de section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-100 shadow-xs">
        <div>
          <h2 className="text-xl font-semibold text-slate-800">Module Jus & Boissons</h2>
          <p className="text-sm text-slate-500 font-normal">Gestion combinée des ventes de boissons, réapprovisionnements et de la marge commerciale</p>
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
            Saisie Ventes / Entrées
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'history' 
                ? 'bg-white text-slate-800 shadow-xs font-semibold' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <ShoppingBag size={14} />
            Journal & Catalogue
          </button>
        </div>
      </div>

      {activeTab === 'record' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Formulaire Vente / Approvisionnement Boissons */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs lg:col-span-2">
            <h3 className="text-base font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <Wine size={18} className="text-amber-500" />
              Saisie d'un mouvement de stock
            </h3>

            {/* Toggle Vente vs Approvisionnement */}
            <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl border border-slate-200 mb-6">
              <button
                type="button"
                onClick={() => {
                  setTypeMouvement('vente');
                  setCustomPrice('');
                }}
                className={`py-2 text-xs font-medium rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  typeMouvement === 'vente'
                    ? 'bg-white text-amber-600 shadow-xs font-bold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <ArrowUpRight size={14} />
                Enregistrer une Vente (Sortie)
              </button>
              <button
                type="button"
                onClick={() => {
                  setTypeMouvement('entree');
                  setCustomPrice('');
                }}
                className={`py-2 text-xs font-medium rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  typeMouvement === 'entree'
                    ? 'bg-white text-amber-600 shadow-xs font-bold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <ArrowDownLeft size={14} />
                Approvisionnement (Entrée)
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Sélection Produit */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">Sélectionner la boisson</label>
                  <select
                    id="select-boisson"
                    value={selectedProductId}
                    onChange={(e) => {
                      setSelectedProductId(e.target.value);
                      setCustomPrice('');
                    }}
                    className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:border-amber-500 focus:ring-2 focus:ring-amber-100 bg-white"
                  >
                    <option value="">-- Choisir une boisson --</option>
                    {state.boissonsCatalogue.map(prod => (
                      <option key={prod.id} value={prod.id}>
                        {prod.nom} ({prod.quantiteEnStock} dispo) — Vente: {prod.prixVenteActuel} F / Achat: {prod.prixAchatActuel} F
                      </option>
                    ))}
                  </select>
                </div>

                {/* Prix Unitaire Ajusté */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                    {typeMouvement === 'vente' ? "Prix de vente unitaire ajusté (Optionnel)" : "Prix d'achat unitaire ajusté (Optionnel)"}
                  </label>
                  <input 
                    type="number"
                    min="0"
                    placeholder={selectedProduct ? `Par défaut : ${referencePrice} F` : "Ex: 500"}
                    value={customPrice}
                    onChange={(e) => setCustomPrice(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
                    disabled={!selectedProductId}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Quantité */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">Quantité</label>
                  <input 
                    type="number"
                    min="1"
                    value={quantite}
                    onChange={(e) => setQuantite(parseInt(e.target.value) || 1)}
                    className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
                    disabled={!selectedProductId}
                  />
                </div>

                {/* Date */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">Date personnalisée (Laisser vide si aujourd'hui)</label>
                  <input 
                    type="datetime-local"
                    value={customDate}
                    onChange={(e) => setCustomDate(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
                  />
                </div>
              </div>

              {/* Fiche d'alerte ou résumé financier en temps réel */}
              {selectedProduct && (
                <div className={`p-4 rounded-xl border flex justify-between items-center ${
                  typeMouvement === 'vente' && selectedProduct.quantiteEnStock <= selectedProduct.seuilAlerte
                    ? 'bg-amber-50/50 border-amber-200 text-amber-800'
                    : 'bg-emerald-50/30 border-emerald-100 text-emerald-800'
                }`}>
                  <div className="space-y-0.5">
                    <span className="text-3xs font-bold uppercase tracking-wider">État actuel du stock</span>
                    <h4 className="text-xs font-bold text-slate-700">{selectedProduct.nom}</h4>
                    <div className="flex gap-4 text-2xs font-medium text-slate-500">
                      <span>Stock dispo : <b className="text-slate-700">{selectedProduct.quantiteEnStock}</b></span>
                      {typeMouvement === 'vente' && (
                        <span>Marge unitaire : <b className="text-emerald-600">+{selectedProduct.prixVenteActuel - selectedProduct.prixAchatActuel} F</b></span>
                      )}
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <span className="text-2xs font-semibold text-slate-400">Montant total {typeMouvement === 'vente' ? 'reçu' : 'payé'} :</span>
                    <h3 className="text-base font-black text-amber-600">{formatFCFA(totalAmount)}</h3>
                  </div>
                </div>
              )}

              {/* Bouton de validation */}
              <div className="pt-4 border-t border-slate-100 flex justify-end">
                <button
                  type="submit"
                  id="submit-drink-op-btn"
                  className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold py-2.5 px-6 rounded-xl shadow-xs hover:shadow-md transition-all cursor-pointer"
                >
                  Enregistrer le mouvement
                </button>
              </div>

            </form>
          </div>

          {/* Synthèse latérale : Statistiques Boissons */}
          <div className="space-y-6">
            
            {/* Valorisation du Stock */}
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-amber-50/40 rounded-full translate-x-8 -translate-y-8" />
              <div className="flex justify-between items-center relative mb-4">
                <span className="text-3xs font-bold uppercase tracking-wider text-slate-400">Valeur d'Actif en Stock</span>
                <span className="p-1 bg-amber-50 text-amber-600 rounded-lg">
                  <Wine size={14} />
                </span>
              </div>
              <div className="relative">
                <h3 className="text-lg font-black text-slate-800">{formatFCFA(totalStockValue)}</h3>
                <p className="text-3xs text-slate-400 mt-1">
                  Valeur totale du stock restant valorisée au prix d'achat
                </p>
              </div>
            </div>

            {/* Produits les plus vendus (Top Sellers) */}
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex flex-col justify-between">
              <div>
                <h3 className="text-xs font-bold text-slate-800 mb-3 flex items-center gap-1.5 uppercase tracking-wide">
                  <Award size={14} className="text-amber-500" />
                  Top des Ventes de Jus
                </h3>
                
                {topSellers.length === 0 ? (
                  <p className="text-2xs text-slate-400 text-center py-6">Aucune vente enregistrée actuellement.</p>
                ) : (
                  <div className="space-y-3">
                    {topSellers.map((s, idx) => (
                      <div key={idx} className="flex justify-between items-center bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 bg-amber-100 text-amber-700 font-bold text-3xs flex items-center justify-center rounded-md">{idx + 1}</span>
                          <h4 className="text-2xs font-bold text-slate-600 truncate max-w-[150px]">{s.name}</h4>
                        </div>
                        <span className="text-2xs font-black text-slate-800">{s.qty} vendus</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

          </div>

        </div>
      ) : (
        /* Journal historique */
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs">
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <h3 className="text-base font-semibold text-slate-800">Journal des mouvements de boissons</h3>
            
            <div className="flex flex-wrap gap-2 w-full md:w-auto">
              {/* Recherche */}
              <div className="relative flex-1 md:w-64">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Rechercher une boisson..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-1.5 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:border-amber-500 bg-slate-50"
                />
              </div>

              {/* Filtre Type */}
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-3 py-1.5 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:outline-hidden"
              >
                <option value="all">Tous les mouvements</option>
                <option value="vente">Ventes uniquement</option>
                <option value="entree">Approvisionnements</option>
              </select>

              {/* Bouton Export */}
              <button
                onClick={() => exportBoissonsMouvements(filteredMouvements)}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded-xl flex items-center gap-1.5 shadow-2xs hover:shadow-md transition-all cursor-pointer"
              >
                <Download size={14} />
                Exporter CSV
              </button>
            </div>
          </div>

          {filteredMouvements.length === 0 ? (
            <div className="text-center py-16 text-slate-400 text-sm">
              Aucun mouvement enregistré ou correspondant.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 text-3xs font-bold uppercase tracking-wider">
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Mouvement</th>
                    <th className="py-3 px-4">Produit</th>
                    <th className="py-3 px-4 text-center">Quantité</th>
                    <th className="py-3 px-4 text-right">Montant Total</th>
                    <th className="py-3 px-4 text-right text-emerald-700">Marge Estimée</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-xs">
                  {filteredMouvements.map((m) => {
                    const prod = state.boissonsCatalogue.find(p => p.id === m.idProduit);
                    const margeUnitaire = prod ? (prod.prixVenteActuel - prod.prixAchatActuel) : 0;
                    const totalMarge = m.typeMouvement === 'vente' ? margeUnitaire * m.quantite : 0;

                    return (
                      <tr key={m.id} className="hover:bg-slate-50/50 transition-all text-slate-600">
                        <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                          <span className="flex items-center gap-1">
                            <Calendar size={12} />
                            {formatDateLabel(m.date, true)}
                          </span>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded-full text-3xs font-bold uppercase tracking-wide ${
                            m.typeMouvement === 'vente' 
                              ? 'bg-amber-50 text-amber-700 border border-amber-100' 
                              : 'bg-blue-50 text-blue-700 border border-blue-100'
                          }`}>
                            {m.typeMouvement === 'vente' ? 'Vente' : 'Entrée Stock'}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-700">
                          {m.nomProduit}
                        </td>
                        <td className="py-3 px-4 text-center font-bold">
                          {m.quantite}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-slate-800">
                          {formatFCFA(m.montant)}
                        </td>
                        <td className="py-3 px-4 text-right font-black text-emerald-600 bg-emerald-50/10">
                          {m.typeMouvement === 'vente' ? `+${formatFCFA(totalMarge)}` : '-'}
                        </td>
                      </tr>
                    );
                  })}
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
              <div className={`p-2.5 rounded-xl ${
                confirmModal.type === 'warning' ? 'bg-amber-50 text-amber-600' : 'bg-amber-50 text-amber-600'
              }`}>
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
                className={`px-4 py-2 text-white text-xs font-semibold rounded-xl transition-all cursor-pointer ${
                  confirmModal.type === 'warning' ? 'bg-amber-600 hover:bg-amber-700' : 'bg-amber-600 hover:bg-amber-700'
                }`}
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
