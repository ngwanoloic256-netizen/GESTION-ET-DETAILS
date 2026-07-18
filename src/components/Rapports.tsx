import React, { useState } from 'react';
import { AppState, HistoriquePrix } from '../types';
import { formatFCFA, formatDateLabel, exportConsolidatedReport, isDateInPeriod } from '../utils';
import { 
  BarChart3, 
  Download, 
  Upload, 
  Trash2, 
  RefreshCw, 
  TrendingUp, 
  Calendar, 
  HelpCircle, 
  History, 
  Database,
  ArrowRight,
  ShieldAlert,
  Coins
} from 'lucide-react';

interface RapportsProps {
  state: AppState;
  clearAllData: () => void;
  resetToSampleData: () => void;
  importData: (imported: Partial<AppState>) => void;
}

export default function Rapports({
  state,
  clearAllData,
  resetToSampleData,
  importData,
}: RapportsProps) {
  const [reportPeriod, setReportPeriod] = useState<'day' | 'week' | 'month' | 'all'>('week');
  const [fileInputKey, setFileInputKey] = useState<number>(Date.now());

  // --- CALCUL DES METRIQUES PAR PERIODE ---
  const filterFn = (dateStr: string) => {
    if (reportPeriod === 'all') return true;
    return isDateInPeriod(dateStr, reportPeriod);
  };

  // 1. Secrétariat
  const secMouvements = state.secretariatMouvements.filter(m => filterFn(m.date));
  const secRevenue = secMouvements
    .filter(m => m.typeMouvement !== 'entree_stock')
    .reduce((sum, m) => sum + m.montant, 0);

  // 2. Mobile Money
  const mmTransactions = state.mobileMoneyTransactions.filter(t => filterFn(t.date));
  const mmVolume = mmTransactions.reduce((sum, t) => sum + t.montant, 0);
  const mmCommissions = mmTransactions.reduce((sum, t) => sum + t.commission, 0);

  // 3. Boissons
  const boissonMouvements = state.boissonsMouvements.filter(m => filterFn(m.date));
  const boissonVentes = boissonMouvements.filter(m => m.typeMouvement === 'vente');
  const boissonRevenue = boissonVentes.reduce((sum, m) => sum + m.montant, 0);
  
  const boissonCost = boissonVentes.reduce((sum, m) => {
    const prod = state.boissonsCatalogue.find(p => p.id === m.idProduit);
    return sum + (prod ? prod.prixAchatActuel * m.quantite : 0);
  }, 0);
  
  const boissonMarge = boissonRevenue - boissonCost;

  // Totaux Consolidés
  const consolidatedRevenue = secRevenue + mmVolume + boissonRevenue;
  const consolidatedEarnings = secRevenue + mmCommissions + boissonMarge;

  // --- LOGIQUE SAUVEGARDE & RESTAURATION ---

  // Exporter l'état complet vers un fichier JSON
  const handleExportState = () => {
    const stateStr = JSON.stringify(state, null, 2);
    const blob = new Blob([stateStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `gestion_stock_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    alert('Fichier de sauvegarde généré et téléchargé avec succès !');
  };

  // Importer l'état depuis un fichier JSON
  const handleImportState = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const importedData = JSON.parse(event.target?.result as string);
        // Validation basique des propriétés
        if (
          'secretariatCatalogue' in importedData &&
          'mobileMoneyTransactions' in importedData &&
          'boissonsCatalogue' in importedData
        ) {
          importData(importedData);
          alert('Fichier de sauvegarde importé et restauré avec succès !');
        } else {
          alert("Le fichier sélectionné ne semble pas être une sauvegarde valide de l'application.");
        }
      } catch (err) {
        alert("Erreur lors de la lecture du fichier de sauvegarde : " + err);
      }
    };
    reader.readAsText(file);
    setFileInputKey(Date.now()); // Reset input
  };

  return (
    <div className="space-y-6" id="reports-section">
      
      {/* En-tête de section */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs">
        <h2 className="text-xl font-semibold text-slate-800">Rapports Consolidés & Outils Globaux</h2>
        <p className="text-sm text-slate-500 font-normal">Analysez les performances combinées de vos 3 activités, visualisez l'historique des prix et gérez vos données de façon sécurisée</p>
      </div>

      {/* 1. Écrans Rapports & Statistiques par Période */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Panneau de configuration du rapport */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-base font-semibold text-slate-800 mb-2 flex items-center gap-1.5">
              <BarChart3 size={18} className="text-blue-500" />
              Générer un Rapport
            </h3>
            <p className="text-xs text-slate-400 mb-4">Sélectionnez la période temporelle pour filtrer l'activité consolidée.</p>
            
            <div className="space-y-2">
              {[
                { id: 'day', label: "Aujourd'hui uniquement" },
                { id: 'week', label: '7 derniers jours (Semaine)' },
                { id: 'month', label: '30 derniers jours (Mois)' },
                { id: 'all', label: 'Historique complet (Tout)' },
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => setReportPeriod(p.id as any)}
                  className={`w-full text-left px-4 py-3 rounded-xl border text-xs font-semibold flex justify-between items-center transition-all ${
                    reportPeriod === p.id 
                      ? 'border-blue-500 bg-blue-50/40 text-blue-700' 
                      : 'border-slate-100 hover:border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {p.label}
                  <ArrowRight size={14} />
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={() => exportConsolidatedReport(state, reportPeriod)}
            className="w-full mt-6 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold py-2.5 px-4 rounded-xl flex items-center justify-center gap-1.5 shadow-2xs hover:shadow-md transition-all cursor-pointer"
            id="export-consolidated-btn"
          >
            <Download size={14} />
            Exporter ce rapport en CSV
          </button>
        </div>

        {/* Tableau Récapitulatif Consolidé */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs lg:col-span-2 space-y-4">
          <div className="flex justify-between items-center pb-3 border-b border-slate-50">
            <h3 className="text-base font-semibold text-slate-800">Résumé Consolidé des activités</h3>
            <span className="text-3xs font-black uppercase bg-blue-50 text-blue-600 px-2.5 py-0.5 rounded">
              Période: {reportPeriod === 'day' ? "Jour" : reportPeriod === 'week' ? "Semaine" : reportPeriod === 'month' ? "Mois" : "Tout"}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Chiffre d'Affaires Brut */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
              <span className="text-3xs font-bold text-slate-400 uppercase tracking-wide">Recette brute cumulée</span>
              <h4 className="text-xl font-bold text-slate-700 mt-1">{formatFCFA(consolidatedRevenue)}</h4>
              <div className="mt-2 space-y-1 text-2xs text-slate-500 font-medium">
                <div className="flex justify-between"><span>Secrétariat :</span> <span>{formatFCFA(secRevenue)}</span></div>
                <div className="flex justify-between"><span>Mobile Money (Volume) :</span> <span>{formatFCFA(mmVolume)}</span></div>
                <div className="flex justify-between"><span>Boissons (Ventes) :</span> <span>{formatFCFA(boissonRevenue)}</span></div>
              </div>
            </div>

            {/* Bénéfice Net Réel */}
            <div className="bg-emerald-50/20 p-4 rounded-xl border border-emerald-100/50">
              <span className="text-3xs font-bold text-emerald-600 uppercase tracking-wide">Gains Nets Estimés</span>
              <h4 className="text-xl font-black text-emerald-700 mt-1">{formatFCFA(consolidatedEarnings)}</h4>
              <div className="mt-2 space-y-1 text-2xs text-slate-500 font-medium">
                <div className="flex justify-between"><span>Secrétariat (Prestations) :</span> <span>{formatFCFA(secRevenue)}</span></div>
                <div className="flex justify-between"><span>Mobile Money (Commissions) :</span> <span>{formatFCFA(mmCommissions)}</span></div>
                <div className="flex justify-between"><span>Boissons (Marge brute) :</span> <span>{formatFCFA(boissonMarge)}</span></div>
              </div>
            </div>

          </div>

          <p className="text-3xs text-slate-400 italic flex items-center gap-1">
            <Coins size={10} className="text-slate-400" />
            Remarque : la marge nette sur boissons est calculée d'après le coût d'achat unitaire renseigné au catalogue.
          </p>
        </div>

      </div>

      {/* 2. Historique des Prix */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs">
        <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-50">
          <div>
            <h3 className="text-base font-semibold text-slate-800 flex items-center gap-1.5">
              <History size={18} className="text-blue-500" />
              Historique des tarifs
            </h3>
            <p className="text-2xs text-slate-400 font-normal">Traces de chaque modification de tarif (pour le suivi de l'évolution des prix de vente & achat)</p>
          </div>
        </div>

        {state.historiquePrix.length === 0 ? (
          <div className="text-center py-10 text-slate-400 text-xs">
            Aucun historique de prix disponible pour le moment.
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[280px]">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 text-3xs font-bold uppercase tracking-wider">
                  <th className="py-2.5 px-4">Date de changement</th>
                  <th className="py-2.5 px-4">Activité</th>
                  <th className="py-2.5 px-4">Article / Produit</th>
                  <th className="py-2.5 px-4">Type de prix</th>
                  <th className="py-2.5 px-4 text-right">Ancien prix</th>
                  <th className="py-2.5 px-4 text-right text-slate-800">Nouveau prix</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-xs">
                {state.historiquePrix
                  .sort((a, b) => new Date(b.dateChangement).getTime() - new Date(a.dateChangement).getTime())
                  .map((hp) => (
                    <tr key={hp.id} className="hover:bg-slate-50/50 transition-all text-slate-600">
                      <td className="py-2 px-4 whitespace-nowrap text-slate-400">
                        <span className="flex items-center gap-1">
                          <Calendar size={12} />
                          {formatDateLabel(hp.dateChangement, true)}
                        </span>
                      </td>
                      <td className="py-2 px-4">
                        <span className={`px-2 py-0.5 rounded text-3xs font-bold uppercase ${
                          hp.typeModule === 'secretariat' ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'
                        }`}>
                          {hp.typeModule === 'secretariat' ? 'Secrétariat' : 'Boissons'}
                        </span>
                      </td>
                      <td className="py-2 px-4 font-semibold text-slate-700">
                        {hp.nomArticleOuProduit}
                      </td>
                      <td className="py-2 px-4 text-slate-500 font-medium">
                        {hp.typePrix === 'prix_vente' ? 'Vente' : "Achat (Coût)"}
                      </td>
                      <td className="py-2 px-4 text-right text-slate-400 line-through">
                        {formatFCFA(hp.ancienPrix)}
                      </td>
                      <td className="py-2 px-4 text-right font-black text-slate-800 bg-slate-50/50">
                        {formatFCFA(hp.nouveauPrix)}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 3. Sécurité de Données & Outils d'administration */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs">
        <h3 className="text-base font-semibold text-slate-800 mb-4 flex items-center gap-1.5">
          <Database size={18} className="text-blue-500" />
          Sauvegardes & Restauration (Usage Interne)
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Exporter */}
          <button
            onClick={handleExportState}
            className="p-4 bg-blue-50 hover:bg-blue-100/70 border border-blue-100 rounded-xl text-left transition-all flex flex-col justify-between h-32 group cursor-pointer"
          >
            <div className="p-2 bg-white text-blue-600 rounded-lg group-hover:scale-110 transition-transform">
              <Download size={16} />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-800">Exporter les données</h4>
              <p className="text-3xs text-slate-400 mt-1">Générez un fichier JSON de sauvegarde de tous vos stocks et transactions</p>
            </div>
          </button>

          {/* Importer */}
          <div className="relative p-4 bg-indigo-50/50 hover:bg-indigo-100/50 border border-indigo-100 rounded-xl transition-all flex flex-col justify-between h-32 group">
            <div className="p-2 bg-white text-indigo-600 rounded-lg group-hover:scale-110 transition-transform w-max">
              <Upload size={16} />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-800">Restaurer une sauvegarde</h4>
              <p className="text-3xs text-slate-400 mt-1">Sélectionnez un fichier .json précédemment exporté pour écraser/charger</p>
            </div>
            <input 
              key={fileInputKey}
              type="file" 
              accept=".json"
              onChange={handleImportState}
              className="absolute inset-0 opacity-0 cursor-pointer"
              title="Importer JSON de sauvegarde"
            />
          </div>

          {/* Réinitialiser avec démo */}
          <button
            onClick={() => {
              if (confirm("Voulez-vous réinitialiser l'application avec des données standards de démonstration ? Vos données actuelles seront remplacées.")) {
                resetToSampleData();
                alert('Données réinitialisées !');
              }
            }}
            className="p-4 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-xl text-left transition-all flex flex-col justify-between h-32 group cursor-pointer"
          >
            <div className="p-2 bg-white text-slate-600 rounded-lg group-hover:scale-110 transition-transform">
              <RefreshCw size={16} />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-800">Charger données démo</h4>
              <p className="text-3xs text-slate-400 mt-1">Insère des cahiers types, des boissons et quelques transactions exemples</p>
            </div>
          </button>

          {/* Vider tout */}
          <button
            onClick={() => {
              if (confirm("ATTENTION ! Êtes-vous sûr de vouloir effacer TOUTES les données (stocks, transactions, historique) ? Cette action est irréversible !")) {
                clearAllData();
                alert('Toutes les tables ont été vidées.');
              }
            }}
            className="p-4 bg-red-50/50 hover:bg-red-100/50 border border-red-100 rounded-xl text-left transition-all flex flex-col justify-between h-32 group cursor-pointer"
          >
            <div className="p-2 bg-white text-red-600 rounded-lg group-hover:scale-110 transition-transform">
              <Trash2 size={16} />
            </div>
            <div>
              <h4 className="text-xs font-bold text-red-700">Remettre à zéro (Vider)</h4>
              <p className="text-3xs text-red-400 mt-1">Supprime définitivement tout le contenu pour démarrer à blanc</p>
            </div>
          </button>

        </div>
      </div>

    </div>
  );
}
