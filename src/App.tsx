import React, { useState } from 'react';
import { useAppState } from './useAppState';
import Dashboard from './components/Dashboard';
import Secretariat from './components/Secretariat';
import MobileMoney from './components/MobileMoney';
import Boissons from './components/Boissons';
import Catalogue from './components/Catalogue';
import Rapports from './components/Rapports';
import { 
  LayoutDashboard, 
  FileText, 
  Smartphone, 
  Wine, 
  FolderLock, 
  BarChart3, 
  Briefcase,
  AlertTriangle
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'secretariat' | 'mobile_money' | 'boissons' | 'catalogue' | 'reports'>('dashboard');
  
  const {
    state,
    loading,
    clearAllData,
    resetToSampleData,
    importData,
    addSecretariatArticle,
    updateSecretariatArticle,
    deleteSecretariatArticle,
    addSecretariatMouvement,
    addMobileMoneyTransaction,
    deleteMobileMoneyTransaction,
    addBoissonProduit,
    updateBoissonProduit,
    deleteBoissonProduit,
    addBoissonMouvement,
  } = useAppState();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4 max-w-sm text-center">
          <div className="w-12 h-12 rounded-2xl bg-blue-600/10 flex items-center justify-center animate-pulse">
            <Briefcase size={24} className="text-blue-600 stroke-[2.5]" />
          </div>
          <div className="w-8 h-8 rounded-full border-3 border-blue-600 border-t-transparent animate-spin" />
          <div>
            <h2 className="text-sm font-bold text-slate-800">Chargement...</h2>
            <p className="text-xs text-slate-400 mt-1">Connexion sécurisée et synchronisation avec Firebase Firestore</p>
          </div>
        </div>
      </div>
    );
  }

  // --- ACTIONS GLOBALES ASSIGNÉES DU DASHBOARD ---
  const handleRestockSecretariat = (id: string, qty: number) => {
    const art = state.secretariatCatalogue.find(a => a.id === id);
    if (!art) return;
    
    // Ajoute un mouvement d'entrée
    addSecretariatMouvement({
      idArticle: id,
      nomPrestationOuArticle: art.nom,
      typeMouvement: 'entree_stock',
      quantite: qty,
      montant: art.prixActuel * qty // Évaluation au prix de vente théorique ou valeur estimée
    });
    alert(`Ravitaillement de ${qty} unités pour "${art.nom}" enregistré !`);
  };

  const handleRestockBoisson = (id: string, qty: number) => {
    const prod = state.boissonsCatalogue.find(p => p.id === id);
    if (!prod) return;

    // Ajoute un mouvement d'entrée
    addBoissonMouvement({
      idProduit: id,
      nomProduit: prod.nom,
      quantite: qty,
      typeMouvement: 'entree',
      montant: prod.prixAchatActuel * qty // Prix d'achat total
    });
    alert(`Ravitaillement de ${qty} unités pour "${prod.nom}" enregistré !`);
  };

  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col font-sans" id="app-container">
      
      {/* Barre de navigation principale */}
      <header className="sticky top-0 z-40 bg-slate-900 text-white shadow-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            
            {/* Logo et titre de structure */}
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-600 rounded-xl shadow-inner text-white flex items-center justify-center">
                <Briefcase size={20} className="stroke-[2.5]" />
              </div>
              <div>
                <h1 className="text-sm font-black tracking-wide uppercase">Multi-Service Pro</h1>
                <p className="text-3xs text-blue-400 font-bold tracking-widest uppercase">Gestion de Stock & Activités</p>
              </div>
            </div>

            {/* Menu Desktop */}
            <nav className="hidden lg:flex items-center gap-1.5">
              {[
                { id: 'dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
                { id: 'secretariat', label: 'Secrétariat', icon: FileText },
                { id: 'mobile_money', label: 'Mobile Money', icon: Smartphone },
                { id: 'boissons', label: 'Jus & Boissons', icon: Wine },
                { id: 'catalogue', label: 'Catalogues', icon: FolderLock },
                { id: 'reports', label: 'Rapports & Outils', icon: BarChart3 },
              ].map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    id={`nav-${tab.id}-btn`}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`px-3 py-2 text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5 border-b-2 cursor-pointer ${
                      activeTab === tab.id
                        ? 'bg-blue-600/15 text-blue-400 border-blue-500 font-black'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800 border-transparent'
                    }`}
                  >
                    <Icon size={15} />
                    {tab.label}
                  </button>
                );
              })}
            </nav>

            {/* Utilisateur unique Badge */}
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-3xs text-slate-400 font-bold uppercase tracking-wider hidden sm:inline">Session Opérateur</span>
            </div>

          </div>
        </div>
      </header>

      {/* Barre de navigation mobile compacte */}
      <div className="lg:hidden bg-slate-800 text-white border-b border-slate-700 py-1 sticky top-16 z-30 overflow-x-auto whitespace-nowrap flex gap-1 px-4 scrollbar-none">
        {[
          { id: 'dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
          { id: 'secretariat', label: 'Secrétariat', icon: FileText },
          { id: 'mobile_money', label: 'Mobile Money', icon: Smartphone },
          { id: 'boissons', label: 'Jus & Boissons', icon: Wine },
          { id: 'catalogue', label: 'Catalogues', icon: FolderLock },
          { id: 'reports', label: 'Rapports', icon: BarChart3 },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 py-1.5 text-2xs font-bold rounded-lg transition-all flex items-center gap-1 ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white font-extrabold'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Icon size={12} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Zone de contenu principale */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'dashboard' && (
          <Dashboard 
            state={state} 
            onNavigate={setActiveTab}
            onRestockSecretariat={handleRestockSecretariat}
            onRestockBoisson={handleRestockBoisson}
          />
        )}
        
        {activeTab === 'secretariat' && (
          <Secretariat 
            state={state} 
            onAddMouvement={addSecretariatMouvement}
          />
        )}

        {activeTab === 'mobile_money' && (
          <MobileMoney 
            state={state} 
            onAddTransaction={addMobileMoneyTransaction}
            onDeleteTransaction={deleteMobileMoneyTransaction}
          />
        )}

        {activeTab === 'boissons' && (
          <Boissons 
            state={state} 
            onAddMouvement={addBoissonMouvement}
          />
        )}

        {activeTab === 'catalogue' && (
          <Catalogue 
            state={state}
            onAddSecretariatArticle={addSecretariatArticle}
            onUpdateSecretariatArticle={updateSecretariatArticle}
            onDeleteSecretariatArticle={deleteSecretariatArticle}
            onAddBoissonProduit={addBoissonProduit}
            onUpdateBoissonProduit={updateBoissonProduit}
            onDeleteBoissonProduit={deleteBoissonProduit}
          />
        )}

        {activeTab === 'reports' && (
          <Rapports 
            state={state}
            clearAllData={clearAllData}
            resetToSampleData={resetToSampleData}
            importData={importData}
          />
        )}
      </main>

      {/* Pied de page */}
      <footer className="bg-white border-t border-slate-100 py-4 mt-12 text-center text-3xs text-slate-400 font-medium">
        <div className="max-w-7xl mx-auto px-4">
          © 2026 Multi-Service Pro • Gestion Interne & Suivi de Stock • Usage Personnel et Autonome
        </div>
      </footer>

    </div>
  );
}
