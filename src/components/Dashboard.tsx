import React, { useState } from 'react';
import { AppState } from '../types';
import { formatFCFA, isDateInPeriod, formatDateLabel } from '../utils';
import { 
  Briefcase, 
  TrendingUp, 
  AlertTriangle, 
  Smartphone, 
  Wine, 
  FileText, 
  ArrowUpRight, 
  ArrowDownLeft, 
  RotateCw,
  ShoppingBag,
  Coins
} from 'lucide-react';

interface DashboardProps {
  state: AppState;
  onNavigate: (tab: 'secretariat' | 'mobile_money' | 'boissons' | 'catalogue' | 'reports') => void;
  onRestockSecretariat: (id: string, qty: number) => void;
  onRestockBoisson: (id: string, qty: number) => void;
}

export default function Dashboard({ state, onNavigate, onRestockSecretariat, onRestockBoisson }: DashboardProps) {
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('day');
  const [restockQty, setRestockQty] = useState<{ [key: string]: number }>({});
  const [criticalThreshold, setCriticalThreshold] = useState<number>(5);

  // Objectif de chiffre d'affaires quotidien
  const [dailyGoal, setDailyGoal] = useState<number>(() => {
    const saved = localStorage.getItem('daily_revenue_goal');
    return saved ? parseInt(saved, 10) : 50000; // default 50 000 FCFA
  });

  const handleGoalChange = (val: number) => {
    const newVal = Math.max(0, val);
    setDailyGoal(newVal);
    localStorage.setItem('daily_revenue_goal', newVal.toString());
  };

  // Calcul du CA spécifique à la journée en cours
  const isToday = (dateStr: string) => isDateInPeriod(dateStr, 'day');

  const todaySecretariatRecette = state.secretariatMouvements
    .filter(m => isToday(m.date) && m.typeMouvement !== 'entree_stock')
    .reduce((sum, m) => sum + m.montant, 0);

  const todayMobileMoneyVolume = state.mobileMoneyTransactions
    .filter(t => isToday(t.date))
    .reduce((sum, t) => sum + t.montant, 0);

  const todayBoissonsRecette = state.boissonsMouvements
    .filter(m => isToday(m.date) && m.typeMouvement === 'vente')
    .reduce((sum, m) => sum + m.montant, 0);

  const todayChiffreAffaires = todaySecretariatRecette + todayMobileMoneyVolume + todayBoissonsRecette;
  const rawPercentage = dailyGoal > 0 ? (todayChiffreAffaires / dailyGoal) * 100 : 0;

  const filterFn = (dateStr: string) => isDateInPeriod(dateStr, period);

  // --- CALCUL DES STATS CONSOLIDEES ---
  
  // 1. Secrétariat
  const secretariatMouvementsPeriod = state.secretariatMouvements.filter(m => filterFn(m.date));
  const secretariatRecette = secretariatMouvementsPeriod
    .filter(m => m.typeMouvement !== 'entree_stock')
    .reduce((sum, m) => sum + m.montant, 0);
  const secretariatPrestationsCount = secretariatMouvementsPeriod
    .filter(m => m.typeMouvement === 'prestation_service').length;
  const secretariatVentesCount = secretariatMouvementsPeriod
    .filter(m => m.typeMouvement === 'vente_article').length;

  // 2. Mobile Money
  const mobileMoneyTransactionsPeriod = state.mobileMoneyTransactions.filter(t => filterFn(t.date));
  const mobileMoneyVolume = mobileMoneyTransactionsPeriod.reduce((sum, t) => sum + t.montant, 0);
  const mobileMoneyCommissions = mobileMoneyTransactionsPeriod.reduce((sum, t) => sum + t.commission, 0);
  const mobileMoneyCount = mobileMoneyTransactionsPeriod.length;

  // 3. Boissons
  const boissonsMouvementsPeriod = state.boissonsMouvements.filter(m => filterFn(m.date));
  const boissonsVentes = boissonsMouvementsPeriod.filter(m => m.typeMouvement === 'vente');
  const boissonsRecette = boissonsVentes.reduce((sum, m) => sum + m.montant, 0);
  
  // Calcul de la marge boissons
  const boissonsMarge = boissonsVentes.reduce((sum, m) => {
    const prod = state.boissonsCatalogue.find(p => p.id === m.idProduit);
    if (prod) {
      const margeUnitaire = prod.prixVenteActuel - prod.prixAchatActuel;
      return sum + (margeUnitaire * m.quantite);
    }
    return sum;
  }, 0);

  // --- STATS GLOBALES ---
  const totalChiffreAffaires = secretariatRecette + mobileMoneyVolume + boissonsRecette;
  const totalBeneficeNet = secretariatRecette + mobileMoneyCommissions + boissonsMarge; // Secrétariat = 100% marge (prestation/fourniture revente marge ~ brut car pas de prix d'achat strict dans le catalogue simplifié, ou considéré brute)

  // --- ALERTES DE STOCK BAS ---
  const alertesSecretariat = state.secretariatCatalogue.filter(
    art => art.categorie !== 'Prestation' && art.quantiteEnStock <= art.seuilAlerte
  );
  const alertesBoissons = state.boissonsCatalogue.filter(
    prod => prod.quantiteEnStock <= prod.seuilAlerte
  );
  const totalAlertes = alertesSecretariat.length + alertesBoissons.length;

  // --- ALERTES DE STOCK CRITIQUE PERSONNALISABLES (JUS & CAHIERS) ---
  const criticalCahiers = state.secretariatCatalogue.filter(
    art => art.categorie === 'Cahier' && art.quantiteEnStock <= criticalThreshold
  );
  const criticalJus = state.boissonsCatalogue.filter(
    prod => prod.quantiteEnStock <= criticalThreshold
  );
  const totalCriticalAlerts = criticalCahiers.length + criticalJus.length;

  // --- RECENT TRANSACTIONS CONSOLIDEES (TOP 8) ---
  const recentItems: {
    id: string;
    date: string;
    module: 'secretariat' | 'mobile_money' | 'boissons';
    description: string;
    type: string;
    montant: number;
    extra?: string;
  }[] = [];

  state.secretariatMouvements.slice(0, 15).forEach(m => {
    recentItems.push({
      id: m.id,
      date: m.date,
      module: 'secretariat',
      description: m.nomPrestationOuArticle,
      type: m.typeMouvement === 'vente_article' ? 'Vente Article' : m.typeMouvement === 'entree_stock' ? 'Entrée de Stock' : 'Prestation',
      montant: m.montant,
    });
  });

  state.mobileMoneyTransactions.slice(0, 15).forEach(t => {
    recentItems.push({
      id: t.id,
      date: t.date,
      module: 'mobile_money',
      description: `${t.typeOperation.toUpperCase()} - ${t.reseau}`,
      type: 'Commission: ' + formatFCFA(t.commission),
      montant: t.montant,
      extra: `Comm: +${t.commission} F`
    });
  });

  state.boissonsMouvements.slice(0, 15).forEach(m => {
    recentItems.push({
      id: m.id,
      date: m.date,
      module: 'boissons',
      description: m.nomProduit,
      type: m.typeMouvement === 'vente' ? 'Vente' : 'Approvisionnement',
      montant: m.montant,
      extra: `Quantité: ${m.quantite}`
    });
  });

  // Tri par date décroissante
  const recentTransactions = recentItems
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 6);

  // --- GESTION RAPIDE DU REAPPROVISIONNEMENT DEPUIS LES ALERTES ---
  const handleQuickRestock = (id: string, module: 'secretariat' | 'boisson') => {
    const qty = restockQty[id] || 10;
    if (qty <= 0) return;

    if (module === 'secretariat') {
      onRestockSecretariat(id, qty);
    } else {
      onRestockBoisson(id, qty);
    }
    setRestockQty(prev => ({ ...prev, [id]: 0 }));
  };

  // --- GRAPHIQUE D'ACTIVITE (REVENUE PAR MODULE) ---
  const maxVal = Math.max(secretariatRecette, mobileMoneyCommissions, boissonsRecette, 100);
  const getBarHeight = (val: number) => {
    return `${(val / maxVal) * 120}px`;
  };

  return (
    <div className="space-y-6" id="dashboard-section">
      {/* En-tête du Dashboard */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-100 shadow-xs">
        <div>
          <h2 className="text-xl font-semibold text-slate-800">Tableau de bord principal</h2>
          <p className="text-sm text-slate-500">Aperçu en temps réel des performances de votre structure</p>
        </div>
        
        {/* Filtres par période */}
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            id="period-day-btn"
            onClick={() => setPeriod('day')}
            className={`px-4 py-1.5 text-xs font-medium rounded-lg transition-all ${
              period === 'day' 
                ? 'bg-white text-slate-800 shadow-xs font-semibold' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Aujourd'hui
          </button>
          <button
            id="period-week-btn"
            onClick={() => setPeriod('week')}
            className={`px-4 py-1.5 text-xs font-medium rounded-lg transition-all ${
              period === 'week' 
                ? 'bg-white text-slate-800 shadow-xs font-semibold' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Cette Semaine
          </button>
          <button
            id="period-month-btn"
            onClick={() => setPeriod('month')}
            className={`px-4 py-1.5 text-xs font-medium rounded-lg transition-all ${
              period === 'month' 
                ? 'bg-white text-slate-800 shadow-xs font-semibold' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Ce Mois
          </button>
        </div>
      </div>

      {/* Cartes KPI Principales */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Chiffre d'Affaires */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs relative overflow-hidden group hover:border-blue-200 transition-all">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50/50 rounded-full translate-x-12 -translate-y-12 transition-transform group-hover:scale-110" />
          <div className="flex justify-between items-center relative">
            <span className="text-xs font-semibold tracking-wider text-slate-400 uppercase">Volume Global d'Affaires</span>
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
              <TrendingUp size={20} />
            </div>
          </div>
          <div className="mt-4 relative">
            <h3 className="text-2xl font-bold text-slate-800">{formatFCFA(totalChiffreAffaires)}</h3>
            <p className="text-xs text-slate-500 mt-1">
              {period === 'day' ? "Cumul des encaissements ce jour" : period === 'week' ? "Encaissements des 7 derniers jours" : "Encaissements des 30 derniers jours"}
            </p>
          </div>
        </div>

        {/* Bénéfice Net (Gains / Marges / Commissions) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs relative overflow-hidden group hover:border-emerald-200 transition-all">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50/50 rounded-full translate-x-12 -translate-y-12 transition-transform group-hover:scale-110" />
          <div className="flex justify-between items-center relative">
            <span className="text-xs font-semibold tracking-wider text-slate-400 uppercase">Gains Nets Estimés</span>
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
              <Coins size={20} />
            </div>
          </div>
          <div className="mt-4 relative">
            <h3 className="text-2xl font-bold text-slate-800">{formatFCFA(totalBeneficeNet)}</h3>
            <p className="text-xs text-slate-500 mt-1">
              Secrétariat + Commissions MM + Marge Boissons
            </p>
          </div>
        </div>

        {/* Alertes Stock */}
        <div className={`p-6 rounded-2xl border shadow-xs relative overflow-hidden group transition-all ${
          totalAlertes > 0 
            ? 'bg-amber-50/40 border-amber-100 hover:border-amber-300' 
            : 'bg-white border-slate-100 hover:border-slate-200'
        }`}>
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-50/80 rounded-full translate-x-12 -translate-y-12 transition-transform" />
          <div className="flex justify-between items-center relative">
            <span className="text-xs font-semibold tracking-wider text-slate-400 uppercase">Alertes de Stock Bas</span>
            <div className={`p-2.5 rounded-xl ${totalAlertes > 0 ? 'bg-amber-100 text-amber-700' : 'bg-slate-50 text-slate-500'}`}>
              <AlertTriangle size={20} />
            </div>
          </div>
          <div className="mt-4 relative">
            <h3 className="text-2xl font-bold text-slate-800">{totalAlertes} {totalAlertes === 1 ? 'article' : 'articles'}</h3>
            <p className="text-xs text-slate-500 mt-1">
              {totalAlertes > 0 ? "Nécessite votre attention" : "Tous les stocks sont à flot"}
            </p>
          </div>
        </div>
      </div>

      {/* Objectif de Chiffre d'Affaires Quotidien */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs relative overflow-hidden" id="daily-revenue-goal-card">
        {/* Subtle decorative background circle */}
        <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-50/20 rounded-full translate-x-12 -translate-y-12 pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-1 flex-1">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                <TrendingUp size={18} />
              </div>
              <h3 className="text-base font-bold text-slate-800">Objectif de Chiffre d'Affaires Quotidien</h3>
            </div>
            <p className="text-xs text-slate-500 max-w-2xl">
              Définissez votre objectif de ventes pour motiver votre journée et suivez votre taux de réalisation en temps réel (Secrétariat + Mobile Money + Boissons).
            </p>
          </div>
          
          {/* Champ de saisie pour l'objectif */}
          <div className="flex items-center gap-3 bg-slate-50 p-2.5 rounded-xl border border-slate-200/60 self-start md:self-center">
            <label htmlFor="daily-goal-input" className="text-xs font-bold text-slate-600 whitespace-nowrap">
              Objectif (FCFA) :
            </label>
            <input 
              id="daily-goal-input"
              type="number" 
              min="0"
              step="1000"
              value={dailyGoal === 0 ? '' : dailyGoal} 
              onChange={(e) => handleGoalChange(parseInt(e.target.value) || 0)}
              placeholder="Ex: 50000"
              className="w-36 px-3 py-1.5 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-right"
            />
          </div>
        </div>

        {/* Barre de progression visuelle */}
        <div className="mt-6 space-y-2.5 relative z-10">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-1 text-xs font-medium text-slate-500">
            <span>
              Progression : <strong className="text-slate-800 font-bold text-sm">{formatFCFA(todayChiffreAffaires)}</strong> réalisés sur aujourd'hui
            </span>
            <span className={`font-extrabold text-sm flex items-center gap-1 ${rawPercentage >= 100 ? 'text-emerald-600' : 'text-indigo-600'}`}>
              Taux de réussite : {rawPercentage.toFixed(1)}% {rawPercentage >= 100 && <span className="animate-bounce">🎉 Bravo !</span>}
            </span>
          </div>
          
          <div className="w-full h-3.5 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200/40">
            <div 
              style={{ width: `${Math.min(100, rawPercentage)}%` }}
              className={`h-full transition-all duration-700 ease-out rounded-full ${
                rawPercentage >= 100 
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500' 
                  : rawPercentage >= 75 
                    ? 'bg-gradient-to-r from-indigo-500 to-blue-500' 
                    : rawPercentage >= 50 
                      ? 'bg-gradient-to-r from-amber-500 to-indigo-500' 
                      : 'bg-gradient-to-r from-rose-500 to-amber-500'
              }`}
            />
          </div>

          <div className="flex justify-between text-3xs text-slate-400 font-medium pt-0.5">
            <span>Début (0 FCFA)</span>
            <span className="font-bold text-slate-500">Objectif : {formatFCFA(dailyGoal)}</span>
          </div>
        </div>
      </div>

      {/* SECTION : ALERTES DE STOCK CRITIQUE CONFIGURABLES */}
      <div className="bg-white p-5 rounded-2xl border border-red-100 shadow-xs space-y-4" id="configurable-critical-alerts">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-red-50 text-red-600 rounded-xl animate-pulse flex items-center justify-center">
              <AlertTriangle size={20} className="stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">Alertes de Stock Critique (Personnalisable)</h3>
              <p className="text-xs text-slate-500 font-normal">
                Suivi en temps réel des produits (jus et cahiers) dont la quantité disponible est inférieure à votre seuil critique personnalisé
              </p>
            </div>
          </div>

          {/* Configuration du seuil */}
          <div className="flex items-center gap-3 bg-slate-100 p-2 rounded-xl border border-slate-200/60 w-full md:w-auto">
            <span className="text-2xs font-bold text-slate-600 whitespace-nowrap">Seuil critique :</span>
            <input 
              type="range" 
              min="1" 
              max="50" 
              value={criticalThreshold} 
              onChange={(e) => setCriticalThreshold(parseInt(e.target.value) || 1)}
              className="w-24 sm:w-32 accent-red-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
              id="critical-threshold-slider"
            />
            <input 
              type="number" 
              min="1" 
              max="150" 
              value={criticalThreshold} 
              onChange={(e) => setCriticalThreshold(parseInt(e.target.value) || 1)}
              className="w-14 px-2 py-1 text-center text-xs font-bold text-slate-700 bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:border-red-500"
              id="critical-threshold-input"
            />
            <span className="text-3xs font-extrabold uppercase bg-red-100 text-red-700 px-2 py-0.5 rounded">Unités</span>
          </div>
        </div>

        {totalCriticalAlerts === 0 ? (
          <div className="bg-emerald-50/20 border border-emerald-100 text-emerald-800 p-5 rounded-xl flex items-center gap-3 justify-center py-8 text-xs font-medium">
            <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping" />
            Aucun produit (jus ou cahier) n'est sous le seuil critique de <span className="font-extrabold text-emerald-700">{criticalThreshold}</span> unités. Vos stocks sont sécurisés !
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {/* Les Cahiers sous le seuil */}
            {criticalCahiers.map(art => (
              <div 
                key={art.id} 
                className="bg-red-50/5 hover:bg-red-50/10 border border-red-100 p-4 rounded-xl flex flex-col justify-between transition-all hover:shadow-xs group relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-16 h-16 bg-red-50/20 rounded-full translate-x-4 -translate-y-4 group-hover:scale-110 transition-transform" />
                <div className="relative space-y-2">
                  <div className="flex justify-between items-start">
                    <span className="text-4xs font-extrabold uppercase bg-blue-100 text-blue-700 px-2 py-0.5 rounded tracking-wider">
                      Cahier {art.pagination ? `• ${art.pagination}` : ''}
                    </span>
                    <span className={`text-2xs font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                      art.quantiteEnStock === 0 ? 'bg-red-200 text-red-800 animate-pulse' : 'bg-red-100 text-red-800'
                    }`}>
                      <AlertTriangle size={10} className="text-red-600" />
                      {art.quantiteEnStock} u.
                    </span>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 line-clamp-1 group-hover:text-red-700 transition-colors" title={art.nom}>
                      {art.nom}
                    </h4>
                    <p className="text-3xs text-slate-400 mt-0.5 flex items-center gap-1">
                      {art.quantiteEnStock === 0 ? (
                        <span className="text-red-600 font-bold flex items-center gap-0.5">⚠️ En rupture !</span>
                      ) : (
                        <span className="text-amber-600 font-medium flex items-center gap-0.5">⚠️ Stock bas (&le; {criticalThreshold})</span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex gap-2 items-center relative">
                  <input 
                    type="number" 
                    min="1"
                    placeholder="Qté"
                    value={restockQty[art.id] || ''}
                    onChange={(e) => setRestockQty(prev => ({ ...prev, [art.id]: parseInt(e.target.value) || 0 }))}
                    className="w-14 px-2 py-1.5 text-xs text-center border border-slate-200 bg-white rounded-lg focus:outline-hidden focus:border-red-400 font-bold"
                    id={`input-restock-critical-${art.id}`}
                  />
                  <button 
                    onClick={() => handleQuickRestock(art.id, 'secretariat')}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white text-3xs font-bold py-1.5 px-2 rounded-lg transition-all shadow-2xs hover:shadow-xs cursor-pointer flex items-center justify-center gap-1"
                    id={`btn-restock-critical-${art.id}`}
                  >
                    Réapprovisionner
                  </button>
                </div>
              </div>
            ))}

            {/* Les Jus sous le seuil */}
            {criticalJus.map(prod => (
              <div 
                key={prod.id} 
                className="bg-red-50/5 hover:bg-red-50/10 border border-red-100 p-4 rounded-xl flex flex-col justify-between transition-all hover:shadow-xs group relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-16 h-16 bg-amber-50/20 rounded-full translate-x-4 -translate-y-4 group-hover:scale-110 transition-transform" />
                <div className="relative space-y-2">
                  <div className="flex justify-between items-start">
                    <span className="text-4xs font-extrabold uppercase bg-amber-100 text-amber-700 px-2 py-0.5 rounded tracking-wider">
                      Jus / Boisson
                    </span>
                    <span className={`text-2xs font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                      prod.quantiteEnStock === 0 ? 'bg-red-200 text-red-800 animate-pulse' : 'bg-red-100 text-red-800'
                    }`}>
                      <AlertTriangle size={10} className="text-red-600" />
                      {prod.quantiteEnStock} u.
                    </span>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 line-clamp-1 group-hover:text-red-700 transition-colors" title={prod.nom}>
                      {prod.nom}
                    </h4>
                    <p className="text-3xs text-slate-400 mt-0.5 flex items-center gap-1">
                      {prod.quantiteEnStock === 0 ? (
                        <span className="text-red-600 font-bold flex items-center gap-0.5">⚠️ En rupture !</span>
                      ) : (
                        <span className="text-amber-600 font-medium flex items-center gap-0.5">⚠️ Stock bas (&le; {criticalThreshold})</span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex gap-2 items-center relative">
                  <input 
                    type="number" 
                    min="1"
                    placeholder="Qté"
                    value={restockQty[prod.id] || ''}
                    onChange={(e) => setRestockQty(prev => ({ ...prev, [prod.id]: parseInt(e.target.value) || 0 }))}
                    className="w-14 px-2 py-1.5 text-xs text-center border border-slate-200 bg-white rounded-lg focus:outline-hidden focus:border-red-400 font-bold"
                    id={`input-restock-critical-${prod.id}`}
                  />
                  <button 
                    onClick={() => handleQuickRestock(prod.id, 'boisson')}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white text-3xs font-bold py-1.5 px-2 rounded-lg transition-all shadow-2xs hover:shadow-xs cursor-pointer flex items-center justify-center gap-1"
                    id={`btn-restock-critical-${prod.id}`}
                  >
                    Réapprovisionner
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Section interactive : Synthèse par activité et Graphique d'activité */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Synthèse par activité */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs lg:col-span-2">
          <h3 className="text-base font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <Briefcase size={18} className="text-blue-500" />
            Performance détaillée des activités
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Secrétariat Card */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col justify-between hover:shadow-xs transition-all">
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs font-semibold text-slate-500">Secrétariat</span>
                <div className="p-1.5 bg-blue-100 text-blue-700 rounded-lg">
                  <FileText size={14} />
                </div>
              </div>
              <div>
                <span className="text-lg font-bold text-slate-800">{formatFCFA(secretariatRecette)}</span>
                <div className="flex flex-col gap-0.5 mt-1 text-2xs text-slate-500">
                  <span>Prestations : <b>{secretariatPrestationsCount}</b></span>
                  <span>Ventes d'articles : <b>{secretariatVentesCount}</b></span>
                </div>
              </div>
              <button 
                onClick={() => onNavigate('secretariat')}
                className="mt-4 w-full py-1.5 px-3 bg-white hover:bg-blue-50 text-blue-600 text-xs font-medium rounded-lg border border-slate-200 hover:border-blue-200 transition-all flex items-center justify-center gap-1"
              >
                Accéder au Secrétariat
                <ArrowUpRight size={12} />
              </button>
            </div>

            {/* Mobile Money Card */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col justify-between hover:shadow-xs transition-all">
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs font-semibold text-slate-500">Mobile Money</span>
                <div className="p-1.5 bg-purple-100 text-purple-700 rounded-lg">
                  <Smartphone size={14} />
                </div>
              </div>
              <div>
                <span className="text-lg font-bold text-slate-800">{formatFCFA(mobileMoneyCommissions)}</span>
                <div className="flex flex-col gap-0.5 mt-1 text-2xs text-slate-500">
                  <span>Commissions perçues</span>
                  <span>Transactions : <b>{mobileMoneyCount}</b> ({formatFCFA(mobileMoneyVolume)} vol)</span>
                </div>
              </div>
              <button 
                onClick={() => onNavigate('mobile_money')}
                className="mt-4 w-full py-1.5 px-3 bg-white hover:bg-purple-50 text-purple-600 text-xs font-medium rounded-lg border border-slate-200 hover:border-purple-200 transition-all flex items-center justify-center gap-1"
              >
                Accéder aux Transactions
                <ArrowUpRight size={12} />
              </button>
            </div>

            {/* Boissons Card */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col justify-between hover:shadow-xs transition-all">
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs font-semibold text-slate-500">Jus & Boissons</span>
                <div className="p-1.5 bg-amber-100 text-amber-700 rounded-lg">
                  <Wine size={14} />
                </div>
              </div>
              <div>
                <span className="text-lg font-bold text-slate-800">{formatFCFA(boissonsRecette)}</span>
                <div className="flex flex-col gap-0.5 mt-1 text-2xs text-slate-500">
                  <span>Marge nette : <b>{formatFCFA(boissonsMarge)}</b></span>
                  <span>Ventes : <b>{boissonsVentes.length}</b></span>
                </div>
              </div>
              <button 
                onClick={() => onNavigate('boissons')}
                className="mt-4 w-full py-1.5 px-3 bg-white hover:bg-amber-50 text-amber-600 text-xs font-medium rounded-lg border border-slate-200 hover:border-amber-200 transition-all flex items-center justify-center gap-1"
              >
                Accéder aux Jus
                <ArrowUpRight size={12} />
              </button>
            </div>
          </div>
        </div>

        {/* Graphique de comparaison SVG */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-base font-semibold text-slate-800 mb-1">Répartition des Recettes</h3>
            <p className="text-2xs text-slate-400">Comparatif brut par type d'activité</p>
          </div>

          <div className="my-6 flex justify-around items-end h-[140px] px-2 relative border-b border-slate-100 pb-2">
            {/* Secretariat Bar */}
            <div className="flex flex-col items-center gap-2 group cursor-pointer">
              <div className="text-3xs font-semibold text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 text-white px-1.5 py-0.5 rounded absolute -top-4">
                {formatFCFA(secretariatRecette)}
              </div>
              <div 
                className="w-12 bg-blue-500 rounded-t-lg transition-all duration-500 hover:bg-blue-600 shadow-sm" 
                style={{ height: getBarHeight(secretariatRecette) }} 
              />
              <span className="text-2xs font-medium text-slate-500">Secrétariat</span>
            </div>

            {/* Mobile Money Commission Bar */}
            <div className="flex flex-col items-center gap-2 group cursor-pointer">
              <div className="text-3xs font-semibold text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 text-white px-1.5 py-0.5 rounded absolute -top-4">
                {formatFCFA(mobileMoneyCommissions)}
              </div>
              <div 
                className="w-12 bg-purple-500 rounded-t-lg transition-all duration-500 hover:bg-purple-600 shadow-sm" 
                style={{ height: getBarHeight(mobileMoneyCommissions) }} 
              />
              <span className="text-2xs font-medium text-slate-500">MM Comm.</span>
            </div>

            {/* Boissons Bar */}
            <div className="flex flex-col items-center gap-2 group cursor-pointer">
              <div className="text-3xs font-semibold text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 text-white px-1.5 py-0.5 rounded absolute -top-4">
                {formatFCFA(boissonsRecette)}
              </div>
              <div 
                className="w-12 bg-amber-500 rounded-t-lg transition-all duration-500 hover:bg-amber-600 shadow-sm" 
                style={{ height: getBarHeight(boissonsRecette) }} 
              />
              <span className="text-2xs font-medium text-slate-500">Boissons</span>
            </div>
          </div>

          <div className="text-2xs text-slate-500 border-t border-slate-50 pt-3 flex justify-between">
            <span>Total Recettes :</span>
            <span className="font-bold text-slate-700">{formatFCFA(secretariatRecette + boissonsRecette)}</span>
          </div>
        </div>

      </div>

      {/* Section double colonnes : Alertes et Récents */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Timeline des transactions récentes */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs lg:col-span-2">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-base font-semibold text-slate-800 flex items-center gap-2">
              <RotateCw size={18} className="text-blue-500 animate-spin-slow" />
              Dernières opérations (Consolidées)
            </h3>
            <button 
              onClick={() => onNavigate('reports')}
              className="text-xs text-blue-600 font-semibold hover:underline flex items-center gap-0.5"
            >
              Historique complet
              <ArrowUpRight size={12} />
            </button>
          </div>

          {recentTransactions.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-sm">
              Aucune opération enregistrée pour le moment.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {recentTransactions.map((tx) => (
                <div key={tx.id} className="py-3 flex items-center justify-between group hover:bg-slate-50/50 px-2 rounded-xl transition-all">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl ${
                      tx.module === 'secretariat' 
                        ? 'bg-blue-50 text-blue-600' 
                        : tx.module === 'mobile_money' 
                        ? 'bg-purple-50 text-purple-600' 
                        : 'bg-amber-50 text-amber-600'
                    }`}>
                      {tx.module === 'secretariat' ? <FileText size={16} /> : tx.module === 'mobile_money' ? <Smartphone size={16} /> : <Wine size={16} />}
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold text-slate-700">{tx.description}</h4>
                      <p className="text-2xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                        <span className="font-medium text-slate-500">{tx.type}</span>
                        <span>•</span>
                        <span>{formatDateLabel(tx.date, true)}</span>
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs font-bold ${
                      tx.type.includes('Entrée') || tx.type.includes('Approvisionnement')
                        ? 'text-slate-500' 
                        : 'text-slate-800'
                    }`}>
                      {tx.type.includes('Entrée') || tx.type.includes('Approvisionnement') ? '+' : ''}
                      {formatFCFA(tx.montant)}
                    </span>
                    {tx.extra && (
                      <p className="text-3xs text-emerald-600 font-bold mt-0.5">
                        {tx.extra}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Panneau d'alertes & Réapprovisionnement rapide */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-base font-semibold text-slate-800 mb-1 flex items-center gap-1.5">
              <AlertTriangle size={18} className="text-amber-500" />
              Alertes de Stock Bas
            </h3>
            <p className="text-2xs text-slate-400">Ravitaillement rapide des références critiques</p>
          </div>

          <div className="my-4 overflow-y-auto max-h-[240px] pr-1 space-y-3">
            {alertesSecretariat.length === 0 && alertesBoissons.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs">
                Aucun produit en rupture ou stock bas. Super ! 👍
              </div>
            ) : (
              <>
                {/* Alertes Secrétariat */}
                {alertesSecretariat.map(art => (
                  <div key={art.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex flex-col gap-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-3xs font-bold uppercase bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">Secrétariat</span>
                        <h4 className="text-xs font-semibold text-slate-700 mt-1">{art.nom}</h4>
                        <p className="text-3xs text-slate-400 mt-0.5">En stock : <span className="text-amber-600 font-bold">{art.quantiteEnStock}</span> (Seuil : {art.seuilAlerte})</p>
                      </div>
                    </div>
                    <div className="flex gap-2 items-center">
                      <input 
                        type="number" 
                        min="1"
                        placeholder="Qté"
                        value={restockQty[art.id] || ''}
                        onChange={(e) => setRestockQty(prev => ({ ...prev, [art.id]: parseInt(e.target.value) || 0 }))}
                        className="w-16 px-2 py-1 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:border-blue-400"
                      />
                      <button 
                        onClick={() => handleQuickRestock(art.id, 'secretariat')}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium py-1 px-2.5 rounded-lg transition-all"
                      >
                        Approvisionner
                      </button>
                    </div>
                  </div>
                ))}

                {/* Alertes Boissons */}
                {alertesBoissons.map(prod => (
                  <div key={prod.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex flex-col gap-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-3xs font-bold uppercase bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">Jus / Boissons</span>
                        <h4 className="text-xs font-semibold text-slate-700 mt-1">{prod.nom}</h4>
                        <p className="text-3xs text-slate-400 mt-0.5">En stock : <span className="text-amber-600 font-bold">{prod.quantiteEnStock}</span> (Seuil : {prod.seuilAlerte})</p>
                      </div>
                    </div>
                    <div className="flex gap-2 items-center">
                      <input 
                        type="number" 
                        min="1"
                        placeholder="Qté"
                        value={restockQty[prod.id] || ''}
                        onChange={(e) => setRestockQty(prev => ({ ...prev, [prod.id]: parseInt(e.target.value) || 0 }))}
                        className="w-16 px-2 py-1 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:border-amber-400"
                      />
                      <button 
                        onClick={() => handleQuickRestock(prod.id, 'boisson')}
                        className="flex-1 bg-amber-600 hover:bg-amber-700 text-white text-xs font-medium py-1 px-2.5 rounded-lg transition-all"
                      >
                        Approvisionner
                      </button>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>

          <button 
            onClick={() => onNavigate('catalogue')}
            className="w-full text-center py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold rounded-xl transition-all"
          >
            Gérer les catalogues complets
          </button>
        </div>

      </div>
    </div>
  );
}
