import React, { useState, useEffect } from 'react';
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
  AlertTriangle,
  Cloud,
  RefreshCw,
  LogOut,
  Lock,
  Sun,
  Moon
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'secretariat' | 'mobile_money' | 'boissons' | 'catalogue' | 'reports'>('dashboard');
  
  // Gestion du mode sombre / clair
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('theme') as 'light' | 'dark') || 'light';
  });

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);
  
  const {
    state,
    loading,
    syncStatus,
    clearAllData,
    resetToSampleData,
    resetExceptLastThreeSecretariat,
    importData,
    // Auth fields
    user,
    authLoading,
    authError,
    loginWithGoogle,
    logout,
    // Operations
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

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4 max-w-sm text-center">
          <div className="w-12 h-12 rounded-2xl bg-blue-600/10 flex items-center justify-center animate-pulse">
            <Briefcase size={24} className="text-blue-600 stroke-[2.5]" />
          </div>
          <div className="w-8 h-8 rounded-full border-3 border-blue-600 border-t-transparent animate-spin" />
          <div>
            <h2 className="text-sm font-bold text-slate-800">Initialisation de la session...</h2>
            <p className="text-xs text-slate-400 mt-1">Vérification de votre compte administrateur sécurisé</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 relative">
        {/* Bouton bascule du thème sur la page de connexion */}
        <button
          onClick={() => setTheme(prev => prev === 'light' ? 'dark' : 'light')}
          className="absolute top-4 right-4 p-2.5 bg-white border border-slate-100 rounded-xl shadow-xs text-slate-400 hover:text-yellow-400 cursor-pointer transition-all flex items-center justify-center"
          title={theme === 'light' ? 'Activer le mode sombre' : 'Activer le mode clair'}
        >
          {theme === 'light' ? <Moon size={16} /> : <Sun size={16} className="text-yellow-400" />}
        </button>

        <div className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-md w-full p-8 relative overflow-hidden">
          {/* Top colored accent line */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-blue-600" />

          <div className="flex flex-col items-center text-center">
            {/* App Icon / Logo */}
            <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20 mb-5">
              <Briefcase size={32} className="stroke-[2.5]" />
            </div>

            <h1 className="text-xl font-black text-slate-800 tracking-tight">Gestionnaire Multi-Service</h1>
            <p className="text-xs text-blue-600 font-bold uppercase tracking-wider mt-1">Espace d'Administration Privé</p>
            
            <p className="text-xs text-slate-500 mt-4 leading-relaxed">
              Cette application contient des informations sensibles d'inventaire, de ventes et de transactions financières. Seul l'administrateur unique est autorisé à y accéder.
            </p>

            {/* Warning Info box */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-left w-full mt-5">
              <div className="flex gap-2 text-amber-800 font-bold text-xs items-center">
                <Lock size={14} className="text-amber-600" />
                <span>Sécurité & Accès Restreint</span>
              </div>
              <p className="text-3xs text-amber-700/90 mt-1.5 leading-relaxed font-medium">
                Veuillez vous connecter avec votre compte Google autorisé (<strong className="text-amber-900 font-black">ngwanoloic256@gmail.com</strong>) pour synchroniser et accéder à vos données.
              </p>
            </div>

            {/* Error alerts */}
            {authError && (
              <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-xl p-4 text-left w-full mt-4 flex gap-3 animate-pulse">
                <AlertTriangle size={18} className="text-rose-500 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="text-xs font-bold">Erreur de connexion</h3>
                  <p className="text-3xs text-rose-700 mt-1 leading-relaxed">{authError}</p>
                </div>
              </div>
            )}

            {/* Login button */}
            <button
              onClick={loginWithGoogle}
              className="mt-6 w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-3 shadow-md hover:shadow-lg transition-all cursor-pointer border border-slate-800"
            >
              {/* Custom SVG Google Icon */}
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Continuer avec Google</span>
            </button>

            {/* Footer notice */}
            <div className="mt-8 text-4xs text-slate-400 font-bold tracking-widest uppercase">
              Multi-Service Pro • Usage Interne
            </div>
          </div>
        </div>
      </div>
    );
  }

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

            {/* Indicateur de Statut de Synchronisation & Session */}
            <div className="flex items-center gap-3 bg-slate-800/60 px-3 py-1.5 rounded-xl border border-slate-700/50">
              <div className="flex items-center gap-1.5">
                {syncStatus === 'saving' && (
                  <>
                    <RefreshCw size={13} className="text-blue-400 animate-spin" />
                    <span className="text-3xs text-blue-400 font-bold uppercase tracking-wider">Sauvegarde...</span>
                  </>
                )}
                {syncStatus === 'saved' && (
                  <>
                    <Cloud size={13} className="text-emerald-400" />
                    <span className="text-3xs text-emerald-400 font-bold uppercase tracking-wider">Sauvegardé</span>
                  </>
                )}
                {syncStatus === 'error' && (
                  <>
                    <AlertTriangle size={13} className="text-rose-500" />
                    <span className="text-3xs text-rose-500 font-bold uppercase tracking-wider">Erreur Synchro</span>
                  </>
                )}
              </div>
              
              <div className="h-3 w-px bg-slate-700" />

              {/* Utilisateur unique Badge */}
              <div className="flex items-center gap-2">
                {user.photoURL ? (
                  <img src={user.photoURL} alt="" className="w-6 h-6 rounded-full border border-slate-700" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-xs uppercase">
                    {(user.displayName || user.email || 'A')[0]}
                  </div>
                )}
                <div className="hidden sm:flex flex-col text-left">
                  <span className="text-3xs text-slate-200 font-bold tracking-wide max-w-[120px] truncate">{user.displayName || 'Administrateur'}</span>
                  <span className="text-4xs text-slate-400 font-medium max-w-[120px] truncate">{user.email}</span>
                </div>
                <button
                  onClick={() => setTheme(prev => prev === 'light' ? 'dark' : 'light')}
                  className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-yellow-400 transition-colors cursor-pointer ml-1"
                  title={theme === 'light' ? 'Activer le mode sombre' : 'Activer le mode clair'}
                  id="theme-toggle-btn"
                >
                  {theme === 'light' ? <Moon size={13} /> : <Sun size={13} className="text-yellow-400" />}
                </button>

                <button
                  onClick={logout}
                  className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-rose-400 transition-colors cursor-pointer ml-1"
                  title="Se déconnecter"
                >
                  <LogOut size={13} />
                </button>
              </div>
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
            resetExceptLastThreeSecretariat={resetExceptLastThreeSecretariat}
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
