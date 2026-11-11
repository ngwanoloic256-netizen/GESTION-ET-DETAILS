import React, { useEffect, useState } from 'react';
import { useAppState } from './useAppState';
import { useSession, Session } from './platform/useSession';
import { AppState } from './types';
import { APP_NAME } from './config';
import Dashboard from './components/Dashboard';
import Secretariat from './components/Secretariat';
import MobileMoney from './components/MobileMoney';
import Boissons from './components/Boissons';
import Catalogue from './components/Catalogue';
import Rapports from './components/Rapports';
import Login from './components/platform/Login';
import Onboarding from './components/platform/Onboarding';
import Accueil from './components/platform/Accueil';
import Parametres, { SettingsTab } from './components/platform/Parametres';
import Produits from './components/studio/Produits';
import Studio from './components/studio/Studio';
import { useCatalogue } from './studio/useCatalogue';
import Campagnes from './components/ads/Campagnes';
import { useCampagnes } from './ads/useCampagnes';
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
  Sun,
  Moon,
  Home,
  Settings,
  Package,
  Sparkles,
  Megaphone,
} from 'lucide-react';

type GestionTab = 'dashboard' | 'secretariat' | 'mobile_money' | 'boissons' | 'catalogue' | 'reports';
type Tab = 'accueil' | 'produits' | 'studio' | 'campagnes' | 'parametres' | GestionTab;
const PLATFORM_TABS: Tab[] = ['accueil', 'produits', 'studio', 'campagnes', 'parametres'];

const NEW_ORG = '__new__';

function Splash({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="flex flex-col items-center gap-4 max-w-sm text-center">
        <div className="w-12 h-12 rounded-2xl bg-blue-600/10 flex items-center justify-center animate-pulse">
          <Briefcase size={24} className="text-blue-600 stroke-[2.5]" />
        </div>
        <div className="w-8 h-8 rounded-full border-3 border-blue-600 border-t-transparent animate-spin" />
        <div>
          <h2 className="text-sm font-bold text-slate-800">{title}</h2>
          <p className="text-xs text-slate-400 mt-1">{subtitle}</p>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('theme') as 'light' | 'dark') || 'light';
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  const session = useSession();
  const [creatingOrg, setCreatingOrg] = useState(false);

  if (session.authLoading) {
    return <Splash title="Initialisation de la session…" subtitle="Vérification de votre compte" />;
  }

  if (!session.user) {
    return <Login theme={theme} onToggleTheme={toggleTheme} authError={session.authError} onLogin={session.loginWithGoogle} />;
  }

  if (session.orgsLoading) {
    return <Splash title="Chargement…" subtitle="Récupération de vos espaces" />;
  }

  if (session.organisations.length === 0) {
    return <Onboarding session={session} />;
  }

  if (creatingOrg) {
    return <Onboarding session={session} additional onCancel={() => setCreatingOrg(false)} />;
  }

  if (!session.organisation) {
    return <Splash title="Chargement…" subtitle="Ouverture de votre espace" />;
  }

  return (
    <Workspace
      key={session.organisation.id}
      session={session}
      theme={theme}
      onToggleTheme={toggleTheme}
      onCreateOrg={() => setCreatingOrg(true)}
    />
  );
}

interface WorkspaceProps {
  session: Session;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onCreateOrg: () => void;
}

function Workspace({ session, theme, onToggleTheme, onCreateOrg }: WorkspaceProps) {
  const { user, isAdmin, logEvent } = session;
  const organisation = session.organisation!;
  const gestion = organisation.modules.gestionMultiService;

  const [activeTab, setActiveTab] = useState<Tab>('accueil');
  const [settingsTab, setSettingsTab] = useState<SettingsTab>('espace');
  const [produitStudio, setProduitStudio] = useState<string | null>(null);
  const catalogue = useCatalogue(organisation.id);
  const campagnes = useCampagnes(organisation.id);

  const {
    state,
    loading,
    syncStatus,
    clearAllData,
    resetToSampleData,
    resetExceptLastThreeSecretariat,
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
  } = useAppState(gestion ? organisation.id : null);

  // Un onglet de gestion ne reste pas ouvert si le module vient d'être désactivé.
  const tab: Tab = !gestion && !PLATFORM_TABS.includes(activeTab) ? 'accueil' : activeTab;

  const tabs: { id: Tab; label: string; short: string; icon: typeof Home }[] = [
    { id: 'accueil', label: 'Accueil', short: 'Accueil', icon: Home },
    { id: 'produits', label: 'Produits', short: 'Produits', icon: Package },
    { id: 'studio', label: 'Studio', short: 'Studio', icon: Sparkles },
    { id: 'campagnes', label: 'Campagnes', short: 'Campagnes', icon: Megaphone },
    ...(gestion
      ? ([
          { id: 'dashboard', label: 'Tableau de bord', short: 'Tableau de bord', icon: LayoutDashboard },
          { id: 'secretariat', label: 'Secrétariat', short: 'Secrétariat', icon: FileText },
          { id: 'mobile_money', label: 'Mobile Money', short: 'Mobile Money', icon: Smartphone },
          { id: 'boissons', label: 'Jus & Boissons', short: 'Boissons', icon: Wine },
          { id: 'catalogue', label: 'Catalogues', short: 'Catalogues', icon: FolderLock },
          { id: 'reports', label: 'Rapports & Outils', short: 'Rapports', icon: BarChart3 },
        ] as const)
      : []),
    { id: 'parametres', label: 'Paramètres', short: 'Paramètres', icon: Settings },
  ];

  // Les suppressions et les outils de masse sont réservés aux administrateurs
  // (les règles Firestore l'imposent aussi) et laissent une trace au journal.
  const adminOnly = <A extends unknown[]>(
    fn: (...args: A) => Promise<void> | void,
    journal: (...args: A) => [action: string, description: string],
  ) => {
    return async (...args: A) => {
      if (!isAdmin) {
        alert('Action réservée aux administrateurs de cet espace.');
        return;
      }
      const [action, description] = journal(...args);
      await fn(...args);
      await logEvent(action, description);
    };
  };

  const nomArticle = (id: string) => state.secretariatCatalogue.find((a) => a.id === id)?.nom ?? id;
  const nomBoisson = (id: string) => state.boissonsCatalogue.find((p) => p.id === id)?.nom ?? id;

  const guardedDeleteSecretariatArticle = adminOnly(deleteSecretariatArticle, (id: string) => [
    'catalogue.suppression',
    `Article « ${nomArticle(id)} » supprimé du catalogue secrétariat`,
  ]);
  const guardedDeleteBoissonProduit = adminOnly(deleteBoissonProduit, (id: string) => [
    'catalogue.suppression',
    `Produit « ${nomBoisson(id)} » supprimé du catalogue boissons`,
  ]);
  const guardedDeleteMobileMoney = adminOnly(deleteMobileMoneyTransaction, (id: string) => {
    const tx = state.mobileMoneyTransactions.find((t) => t.id === id);
    return ['mobile_money.suppression', `Transaction Mobile Money supprimée${tx ? ` (${tx.typeOperation} ${tx.reseau}, ${tx.montant} FCFA)` : ''}`];
  });
  const guardedClearAll = adminOnly(clearAllData, () => ['donnees.effacement', 'Toutes les données de gestion ont été effacées']);
  const guardedResetSample = adminOnly(resetToSampleData, () => ['donnees.demo', 'Données remplacées par le jeu de démonstration']);
  const guardedResetExcept = adminOnly(resetExceptLastThreeSecretariat, () => [
    'donnees.remise_a_zero',
    'Remise à zéro sélective (3 dernières opérations secrétariat conservées)',
  ]);
  const guardedImport = adminOnly(importData, (_imported: Partial<AppState>) => ['donnees.import', 'Données importées depuis un fichier de sauvegarde']);

  const handleRestockSecretariat = (id: string, qty: number) => {
    const art = state.secretariatCatalogue.find((a) => a.id === id);
    if (!art) return;
    addSecretariatMouvement({
      idArticle: id,
      nomPrestationOuArticle: art.nom,
      typeMouvement: 'entree_stock',
      quantite: qty,
      montant: art.prixActuel * qty,
    });
    alert(`Ravitaillement de ${qty} unités pour "${art.nom}" enregistré !`);
  };

  const handleRestockBoisson = (id: string, qty: number) => {
    const prod = state.boissonsCatalogue.find((p) => p.id === id);
    if (!prod) return;
    addBoissonMouvement({
      idProduit: id,
      nomProduit: prod.nom,
      quantite: qty,
      typeMouvement: 'entree',
      montant: prod.prixAchatActuel * qty,
    });
    alert(`Ravitaillement de ${qty} unités pour "${prod.nom}" enregistré !`);
  };

  const openSettings = (target: SettingsTab) => {
    setSettingsTab(target);
    setActiveTab('parametres');
  };

  const gestionTabActive = !PLATFORM_TABS.includes(tab);

  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col font-sans" id="app-container">
      <header className="sticky top-0 z-40 bg-slate-900 text-white shadow-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-3">
            {/* Marque + sélecteur d'espace */}
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2.5 bg-blue-600 rounded-xl shadow-inner text-white flex items-center justify-center shrink-0">
                <Briefcase size={20} className="stroke-[2.5]" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-blue-400 font-bold tracking-widest uppercase truncate">{APP_NAME}</p>
                <select
                  aria-label="Espace actif"
                  value={organisation.id}
                  onChange={(e) => (e.target.value === NEW_ORG ? onCreateOrg() : session.switchOrganisation(e.target.value))}
                  className="bg-transparent text-sm font-black tracking-wide max-w-[11rem] sm:max-w-[14rem] truncate cursor-pointer focus:outline-none"
                >
                  {session.organisations.map((o) => (
                    <option key={o.id} value={o.id} className="text-slate-900">
                      {o.nom}
                    </option>
                  ))}
                  <option value={NEW_ORG} className="text-slate-900">
                    + Nouvel espace…
                  </option>
                </select>
              </div>
            </div>

            {/* Menu bureau */}
            <nav className="hidden xl:flex items-center gap-1">
              {tabs.map((t) => {
                const Icon = t.icon;
                return (
                  <button
                    key={t.id}
                    id={`nav-${t.id}-btn`}
                    onClick={() => setActiveTab(t.id)}
                    className={`px-2.5 py-2 text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5 border-b-2 cursor-pointer ${
                      tab === t.id
                        ? 'bg-blue-600/15 text-blue-400 border-blue-500 font-black'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800 border-transparent'
                    }`}
                  >
                    <Icon size={15} />
                    {t.label}
                  </button>
                );
              })}
            </nav>

            {/* Synchronisation + session */}
            <div className="flex items-center gap-3 bg-slate-800/60 px-3 py-1.5 rounded-xl border border-slate-700/50 shrink-0">
              {gestion && (
                <>
                  <div className="flex items-center gap-1.5" title={syncStatus === 'saved' ? 'Sauvegardé' : syncStatus === 'saving' ? 'Sauvegarde…' : 'Erreur de synchronisation'}>
                    {syncStatus === 'saving' && <RefreshCw size={13} className="text-blue-400 animate-spin" />}
                    {syncStatus === 'saved' && <Cloud size={13} className="text-emerald-400" />}
                    {syncStatus === 'error' && <AlertTriangle size={13} className="text-rose-500" />}
                    <span
                      className={`hidden sm:inline text-[10px] font-bold uppercase tracking-wider ${
                        syncStatus === 'saving' ? 'text-blue-400' : syncStatus === 'saved' ? 'text-emerald-400' : 'text-rose-500'
                      }`}
                    >
                      {syncStatus === 'saving' ? 'Sauvegarde…' : syncStatus === 'saved' ? 'Sauvegardé' : 'Erreur synchro'}
                    </span>
                  </div>
                  <div className="h-3 w-px bg-slate-700" />
                </>
              )}

              <div className="flex items-center gap-2">
                {user?.photoURL ? (
                  <img src={user.photoURL} alt="" className="w-6 h-6 rounded-full border border-slate-700" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-[10px] font-bold text-white uppercase">
                    {user?.email?.charAt(0) || 'U'}
                  </div>
                )}
                <button
                  onClick={onToggleTheme}
                  className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-yellow-400 transition-colors cursor-pointer"
                  title={theme === 'light' ? 'Activer le mode sombre' : 'Activer le mode clair'}
                >
                  {theme === 'light' ? <Moon size={13} /> : <Sun size={13} className="text-yellow-400" />}
                </button>
                <button
                  onClick={session.logout}
                  className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                  title={`Se déconnecter (${user?.email ?? ''})`}
                >
                  <LogOut size={13} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation mobile */}
      <div className="xl:hidden bg-slate-800 text-white border-b border-slate-700 py-1 sticky top-16 z-30 overflow-x-auto whitespace-nowrap flex gap-1 px-4 scrollbar-none">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1 shrink-0 ${
                tab === t.id ? 'bg-blue-600 text-white font-extrabold' : 'text-slate-300 hover:text-white'
              }`}
            >
              <Icon size={12} />
              {t.short}
            </button>
          );
        })}
      </div>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
        {tab === 'accueil' && (
          <Accueil
            session={session}
            nbProduits={catalogue.produits.length}
            nbCreations={catalogue.creations.length}
            onOpenSettings={openSettings}
            onOpenGestion={() => setActiveTab('dashboard')}
            onOpenTab={setActiveTab}
          />
        )}

        {tab === 'produits' && (
          <Produits
            catalogue={catalogue}
            isAdmin={isAdmin}
            onJournal={logEvent}
            onCreerVisuel={(id) => {
              setProduitStudio(id);
              setActiveTab('studio');
            }}
          />
        )}

        {tab === 'studio' && (
          <Studio
            key={produitStudio ?? 'studio'}
            organisation={organisation}
            catalogue={catalogue}
            isAdmin={isAdmin}
            produitInitial={produitStudio}
            onOuvrirProduits={() => setActiveTab('produits')}
            onOuvrirMarque={() => openSettings('marque')}
          />
        )}

        {tab === 'campagnes' && (
          <Campagnes
            organisation={organisation}
            catalogue={catalogue}
            data={campagnes}
            isAdmin={isAdmin}
            onOuvrirStudio={() => setActiveTab('studio')}
            onJournal={logEvent}
          />
        )}

        {tab === 'parametres' && <Parametres session={session} tab={settingsTab} onTabChange={setSettingsTab} />}

        {gestionTabActive && loading && (
          <div className="py-16 flex justify-center">
            <div className="w-8 h-8 rounded-full border-3 border-blue-600 border-t-transparent animate-spin" />
          </div>
        )}

        {gestionTabActive && !loading && (
          <>
            {tab === 'dashboard' && (
              <Dashboard
                state={state}
                onNavigate={setActiveTab}
                onRestockSecretariat={handleRestockSecretariat}
                onRestockBoisson={handleRestockBoisson}
              />
            )}

            {tab === 'secretariat' && <Secretariat state={state} onAddMouvement={addSecretariatMouvement} />}

            {tab === 'mobile_money' && (
              <MobileMoney state={state} onAddTransaction={addMobileMoneyTransaction} onDeleteTransaction={guardedDeleteMobileMoney} />
            )}

            {tab === 'boissons' && <Boissons state={state} onAddMouvement={addBoissonMouvement} />}

            {tab === 'catalogue' && (
              <Catalogue
                state={state}
                onAddSecretariatArticle={addSecretariatArticle}
                onUpdateSecretariatArticle={updateSecretariatArticle}
                onDeleteSecretariatArticle={guardedDeleteSecretariatArticle}
                onAddBoissonProduit={addBoissonProduit}
                onUpdateBoissonProduit={updateBoissonProduit}
                onDeleteBoissonProduit={guardedDeleteBoissonProduit}
              />
            )}

            {tab === 'reports' && (
              <Rapports
                state={state}
                clearAllData={guardedClearAll}
                resetToSampleData={guardedResetSample}
                resetExceptLastThreeSecretariat={guardedResetExcept}
                importData={guardedImport}
              />
            )}
          </>
        )}
      </main>

      <footer className="bg-white border-t border-slate-100 py-4 mt-12 text-center text-xs text-slate-400 font-medium">
        <div className="max-w-7xl mx-auto px-4">
          © 2026 {APP_NAME} · {organisation.nom}
        </div>
      </footer>
    </div>
  );
}
