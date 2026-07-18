import React, { useState } from 'react';
import { AppState, MobileMoneyTransaction, MobileMoneyReseau, MobileMoneyTypeOperation } from '../types';
import { formatFCFA, formatDateLabel, exportMobileMoneyTransactions } from '../utils';
import { 
  Smartphone, 
  PlusCircle, 
  Download, 
  Trash2, 
  Search, 
  Calendar, 
  TrendingUp, 
  ArrowUpRight, 
  ArrowDownLeft, 
  SmartphoneCharging,
  Sparkles,
  AlertTriangle
} from 'lucide-react';

interface MobileMoneyProps {
  state: AppState;
  onAddTransaction: (tx: Omit<MobileMoneyTransaction, 'id' | 'date'> & { date?: string }) => void;
  onDeleteTransaction: (id: string) => void;
}

export default function MobileMoney({ state, onAddTransaction, onDeleteTransaction }: MobileMoneyProps) {
  const [activeTab, setActiveTab] = useState<'record' | 'history'>('record');

  // Form States
  const [reseau, setReseau] = useState<MobileMoneyReseau>('Orange Money');
  const [typeOperation, setTypeOperation] = useState<MobileMoneyTypeOperation>('dépôt');
  const [montant, setMontant] = useState<string>('');
  const [commission, setCommission] = useState<string>('');
  const [customDate, setCustomDate] = useState<string>('');
  const [autoCalc, setAutoCalc] = useState<boolean>(true);

  // Filtre Historique
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterReseau, setFilterReseau] = useState<string>('all');
  const [filterOp, setFilterOp] = useState<string>('all');

  // Modal de confirmation
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type: 'delete' | 'info';
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    type: 'info'
  });

  // --- REGLES DE SUGGESTION DE COMMISSION (TIERS TYPIQUES AFRIQUE DE L'OUEST/CENTRALE) ---
  const suggestCommission = (amount: number, op: MobileMoneyTypeOperation, net: MobileMoneyReseau): number => {
    if (amount <= 0) return 0;
    
    // Transfert de crédit direct : typiquement 10% de marge ou commission directe
    if (net === 'Transfert de crédit') {
      return Math.round(amount * 0.10); // 10% par défaut
    }

    // MTN ou Orange Money
    if (op === 'dépôt') {
      // Les dépôts rapportent souvent une petite commission forfaitaire au point de vente
      if (amount <= 5000) return 50;
      if (amount <= 10000) return 100;
      if (amount <= 20000) return 150;
      if (amount <= 50000) return 250;
      if (amount <= 100000) return 500;
      return Math.round(amount * 0.005); // 0.5%
    } else if (op === 'retrait') {
      // Les retraits sont taxés et rapportent plus
      if (amount <= 5000) return 100;
      if (amount <= 10000) return 180;
      if (amount <= 20000) return 350;
      if (amount <= 50000) return 700;
      if (amount <= 100000) return 1200;
      return Math.round(amount * 0.012); // 1.2%
    }
    
    return Math.round(amount * 0.01); // 1% par défaut si autre
  };

  // Mise à jour de la commission automatique
  const handleMontantChange = (val: string) => {
    setMontant(val);
    const amt = parseFloat(val);
    if (!isNaN(amt) && autoCalc) {
      const suggested = suggestCommission(amt, typeOperation, reseau);
      setCommission(suggested.toString());
    } else if (!val) {
      setCommission('');
    }
  };

  // Ré-évaluation de la commission si le type d'opération ou le réseau change
  const handleTypeOrReseauChange = (newOp: MobileMoneyTypeOperation, newNet: MobileMoneyReseau) => {
    setTypeOperation(newOp);
    setReseau(newNet);
    const amt = parseFloat(montant);
    if (!isNaN(amt) && autoCalc) {
      const suggested = suggestCommission(amt, newOp, newNet);
      setCommission(suggested.toString());
    }
  };

  const handleToggleAutoCalc = (checked: boolean) => {
    setAutoCalc(checked);
    if (checked) {
      const amt = parseFloat(montant);
      if (!isNaN(amt)) {
        const suggested = suggestCommission(amt, typeOperation, reseau);
        setCommission(suggested.toString());
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(montant);
    const comm = parseFloat(commission);

    if (isNaN(amt) || amt <= 0) {
      alert('Veuillez entrer un montant de transaction valide.');
      return;
    }
    if (isNaN(comm) || comm < 0) {
      alert('Veuillez entrer une commission valide.');
      return;
    }

    const txDate = customDate ? new Date(customDate).toISOString() : new Date().toISOString();

    setConfirmModal({
      isOpen: true,
      title: "Confirmer la transaction",
      message: `Voulez-vous enregistrer cette opération de ${formatFCFA(amt)} (${reseau} - ${typeOperation.toUpperCase()}) avec une commission de ${formatFCFA(comm)} ?`,
      type: 'info',
      onConfirm: () => {
        onAddTransaction({
          reseau,
          typeOperation,
          montant: amt,
          commission: comm,
          date: txDate,
        });

        // Reset
        setMontant('');
        setCommission('');
        setCustomDate('');
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        alert('Transaction Mobile Money enregistrée avec succès !');
      }
    });
  };

  // --- STATS EN TEMPS REEL (AUJOURD'HUI) ---
  const isToday = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    return date.getFullYear() === today.getFullYear() &&
           date.getMonth() === today.getMonth() &&
           date.getDate() === today.getDate();
  };

  const transactionsAujourdhui = state.mobileMoneyTransactions.filter(t => isToday(t.date));

  // Orange Money
  const omTxs = transactionsAujourdhui.filter(t => t.reseau === 'Orange Money');
  const omVolume = omTxs.reduce((sum, t) => sum + t.montant, 0);
  const omCommissions = omTxs.reduce((sum, t) => sum + t.commission, 0);

  // MTN Mobile Money
  const mtnTxs = transactionsAujourdhui.filter(t => t.reseau === 'MTN Mobile Money');
  const mtnVolume = mtnTxs.reduce((sum, t) => sum + t.montant, 0);
  const mtnCommissions = mtnTxs.reduce((sum, t) => sum + t.commission, 0);

  // Transfert de crédit
  const creditTxs = transactionsAujourdhui.filter(t => t.reseau === 'Transfert de crédit');
  const creditVolume = creditTxs.reduce((sum, t) => sum + t.montant, 0);
  const creditCommissions = creditTxs.reduce((sum, t) => sum + t.commission, 0);

  // Filtrer l'historique
  const filteredTransactions = state.mobileMoneyTransactions.filter(t => {
    const matchesSearch = t.reseau.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          t.typeOperation.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          t.montant.toString().includes(searchTerm);
    const matchesReseau = filterReseau === 'all' || t.reseau === filterReseau;
    const matchesOp = filterOp === 'all' || t.typeOperation === filterOp;
    return matchesSearch && matchesReseau && matchesOp;
  });

  return (
    <div className="space-y-6" id="mobile-money-section">
      
      {/* En-tête de section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-100 shadow-xs">
        <div>
          <h2 className="text-xl font-semibold text-slate-800">Module Mobile Money & Transferts</h2>
          <p className="text-sm text-slate-500 font-normal">Enregistrement et suivi des transactions Orange, MTN et Transfert de crédit</p>
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
            Enregistrer Transaction
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'history' 
                ? 'bg-white text-slate-800 shadow-xs font-semibold' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <SmartphoneCharging size={14} />
            Journal & Analyses
          </button>
        </div>
      </div>

      {activeTab === 'record' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Formulaire Mobile Money */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs lg:col-span-2">
            <h3 className="text-base font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <Smartphone size={18} className="text-purple-500" />
              Saisie d'une transaction financière
            </h3>

            <form onSubmit={handleSubmit} className="space-y-5">
              
              {/* Choix Réseau */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-2">Opérateur / Type de service</label>
                <div className="grid grid-cols-3 gap-3">
                  {/* Orange Money Card */}
                  <button
                    type="button"
                    onClick={() => handleTypeOrReseauChange(typeOperation, 'Orange Money')}
                    className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                      reseau === 'Orange Money'
                        ? 'border-orange-500 bg-orange-50/40 text-orange-700 font-bold shadow-2xs'
                        : 'border-slate-100 hover:border-slate-200 text-slate-500 bg-slate-50'
                    }`}
                  >
                    <div className={`w-3 h-3 rounded-full ${reseau === 'Orange Money' ? 'bg-orange-500' : 'bg-slate-300'}`} />
                    <span className="text-xs">Orange Money</span>
                  </button>

                  {/* MTN Mobile Money Card */}
                  <button
                    type="button"
                    onClick={() => handleTypeOrReseauChange(typeOperation, 'MTN Mobile Money')}
                    className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                      reseau === 'MTN Mobile Money'
                        ? 'border-yellow-500 bg-yellow-50/40 text-yellow-800 font-bold shadow-2xs'
                        : 'border-slate-100 hover:border-slate-200 text-slate-500 bg-slate-50'
                    }`}
                  >
                    <div className={`w-3 h-3 rounded-full ${reseau === 'MTN Mobile Money' ? 'bg-yellow-500' : 'bg-slate-300'}`} />
                    <span className="text-xs">MTN MoMo</span>
                  </button>

                  {/* Transfert de Crédit */}
                  <button
                    type="button"
                    onClick={() => handleTypeOrReseauChange('transfert', 'Transfert de crédit')}
                    className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                      reseau === 'Transfert de crédit'
                        ? 'border-purple-500 bg-purple-50/40 text-purple-800 font-bold shadow-2xs'
                        : 'border-slate-100 hover:border-slate-200 text-slate-500 bg-slate-50'
                    }`}
                  >
                    <div className={`w-3 h-3 rounded-full ${reseau === 'Transfert de crédit' ? 'bg-purple-500' : 'bg-slate-300'}`} />
                    <span className="text-xs">Crédit Électronique</span>
                  </button>
                </div>
              </div>

              {/* Choix Type Opération (Dépôt / Retrait) - Désactivé si Crédit */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-2">Type d'opération</label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    disabled={reseau === 'Transfert de crédit'}
                    onClick={() => handleTypeOrReseauChange('dépôt', reseau)}
                    className={`py-2 text-xs font-medium rounded-xl border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      reseau === 'Transfert de crédit' 
                        ? 'opacity-40 cursor-not-allowed bg-slate-100 text-slate-400 border-transparent' 
                        : typeOperation === 'dépôt'
                        ? 'bg-blue-600 text-white border-blue-600 font-bold shadow-2xs'
                        : 'bg-white hover:bg-slate-50 text-slate-600 border-slate-200'
                    }`}
                  >
                    <ArrowUpRight size={14} />
                    Dépôt (Envoi)
                  </button>

                  <button
                    type="button"
                    disabled={reseau === 'Transfert de crédit'}
                    onClick={() => handleTypeOrReseauChange('retrait', reseau)}
                    className={`py-2 text-xs font-medium rounded-xl border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      reseau === 'Transfert de crédit' 
                        ? 'opacity-40 cursor-not-allowed bg-slate-100 text-slate-400 border-transparent' 
                        : typeOperation === 'retrait'
                        ? 'bg-emerald-600 text-white border-emerald-600 font-bold shadow-2xs'
                        : 'bg-white hover:bg-slate-50 text-slate-600 border-slate-200'
                    }`}
                  >
                    <ArrowDownLeft size={14} />
                    Retrait
                  </button>

                  <button
                    type="button"
                    disabled={reseau !== 'Transfert de crédit'}
                    className={`py-2 text-xs font-medium rounded-xl border transition-all flex items-center justify-center gap-1.5 ${
                      reseau === 'Transfert de crédit'
                        ? 'bg-purple-600 text-white border-purple-600 font-bold shadow-2xs'
                        : 'opacity-40 cursor-not-allowed bg-slate-100 text-slate-400 border-transparent'
                    }`}
                  >
                    <SmartphoneCharging size={14} />
                    Transfert Crédit
                  </button>
                </div>
              </div>

              {/* Montant & Commission */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">Montant de la transaction (FCFA)</label>
                  <input 
                    type="number"
                    min="1"
                    placeholder="Ex: 10000"
                    value={montant}
                    onChange={(e) => handleMontantChange(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:border-purple-500 focus:ring-2 focus:ring-purple-100 font-bold text-slate-700"
                    id="tx-amount-input"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="block text-xs font-semibold text-slate-500">Commission gagnée (FCFA)</label>
                    <div className="flex items-center gap-1">
                      <input 
                        type="checkbox" 
                        id="auto-calc"
                        checked={autoCalc}
                        onChange={(e) => handleToggleAutoCalc(e.target.checked)}
                        className="w-3.5 h-3.5 text-purple-600 border-slate-300 rounded-sm focus:ring-purple-500 bg-white"
                      />
                      <label htmlFor="auto-calc" className="text-3xs text-purple-600 font-bold flex items-center gap-0.5 cursor-pointer">
                        <Sparkles size={10} /> Auto-calcul
                      </label>
                    </div>
                  </div>
                  <input 
                    type="number"
                    min="0"
                    placeholder="Ex: 100"
                    value={commission}
                    onChange={(e) => setCommission(e.target.value)}
                    className={`w-full px-3.5 py-2 text-xs border rounded-xl focus:outline-hidden font-bold ${
                      autoCalc 
                        ? 'bg-purple-50/50 border-purple-100 text-purple-800' 
                        : 'bg-white border-slate-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-100 text-slate-700'
                    }`}
                    id="tx-commission-input"
                  />
                </div>
              </div>

              {/* Date */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Date et Heure personnalisées (Optionnel)</label>
                <input 
                  type="datetime-local"
                  value={customDate}
                  onChange={(e) => setCustomDate(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
                />
              </div>

              {/* Bouton validation */}
              <div className="pt-4 border-t border-slate-100 flex justify-end">
                <button
                  type="submit"
                  id="submit-mm-tx-btn"
                  className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold py-2.5 px-6 rounded-xl shadow-xs hover:shadow-md transition-all cursor-pointer"
                >
                  Enregistrer la transaction
                </button>
              </div>

            </form>
          </div>

          {/* Synthèse du jour Mobile Money */}
          <div className="space-y-6">
            
            {/* Orange Money Card */}
            <div className="bg-white p-5 rounded-2xl border border-orange-100 shadow-xs relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-orange-50/80 rounded-full translate-x-8 -translate-y-8" />
              <div className="flex justify-between items-center relative mb-4">
                <span className="text-3xs font-black uppercase tracking-wider text-orange-600 bg-orange-50 px-2 py-0.5 rounded">Orange Money</span>
                <span className="text-3xs text-slate-400 font-bold">Aujourd'hui</span>
              </div>
              <div className="relative space-y-2">
                <div className="flex justify-between items-baseline">
                  <span className="text-2xs text-slate-500">Volume Dépôts/Retraits :</span>
                  <span className="text-xs font-bold text-slate-700">{formatFCFA(omVolume)}</span>
                </div>
                <div className="flex justify-between items-baseline pt-2 border-t border-slate-50">
                  <span className="text-xs font-semibold text-slate-600">Commissions gagnées :</span>
                  <span className="text-sm font-black text-orange-600">{formatFCFA(omCommissions)}</span>
                </div>
                <p className="text-3xs text-slate-400">Nombre de transactions : <b>{omTxs.length}</b></p>
              </div>
            </div>

            {/* MTN Mobile Money Card */}
            <div className="bg-white p-5 rounded-2xl border border-yellow-150 shadow-xs relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-yellow-50/80 rounded-full translate-x-8 -translate-y-8" />
              <div className="flex justify-between items-center relative mb-4">
                <span className="text-3xs font-black uppercase tracking-wider text-yellow-700 bg-yellow-50 px-2 py-0.5 rounded">MTN Mobile Money</span>
                <span className="text-3xs text-slate-400 font-bold">Aujourd'hui</span>
              </div>
              <div className="relative space-y-2">
                <div className="flex justify-between items-baseline">
                  <span className="text-2xs text-slate-500">Volume Dépôts/Retraits :</span>
                  <span className="text-xs font-bold text-slate-700">{formatFCFA(mtnVolume)}</span>
                </div>
                <div className="flex justify-between items-baseline pt-2 border-t border-slate-50">
                  <span className="text-xs font-semibold text-slate-600">Commissions gagnées :</span>
                  <span className="text-sm font-black text-yellow-700">{formatFCFA(mtnCommissions)}</span>
                </div>
                <p className="text-3xs text-slate-400">Nombre de transactions : <b>{mtnTxs.length}</b></p>
              </div>
            </div>

            {/* Transfert de crédit Card */}
            <div className="bg-white p-5 rounded-2xl border border-purple-100 shadow-xs relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-purple-50/80 rounded-full translate-x-8 -translate-y-8" />
              <div className="flex justify-between items-center relative mb-4">
                <span className="text-3xs font-black uppercase tracking-wider text-purple-700 bg-purple-50 px-2 py-0.5 rounded">Crédit Électronique</span>
                <span className="text-3xs text-slate-400 font-bold">Aujourd'hui</span>
              </div>
              <div className="relative space-y-2">
                <div className="flex justify-between items-baseline">
                  <span className="text-2xs text-slate-500">Volume Recharges :</span>
                  <span className="text-xs font-bold text-slate-700">{formatFCFA(creditVolume)}</span>
                </div>
                <div className="flex justify-between items-baseline pt-2 border-t border-slate-50">
                  <span className="text-xs font-semibold text-slate-600">Bénéfice direct (10%) :</span>
                  <span className="text-sm font-black text-purple-700">{formatFCFA(creditCommissions)}</span>
                </div>
                <p className="text-3xs text-slate-400">Nombre de recharges : <b>{creditTxs.length}</b></p>
              </div>
            </div>

          </div>

        </div>
      ) : (
        /* Journal historique */
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs">
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <h3 className="text-base font-semibold text-slate-800">Journal complet des opérations financières</h3>
            
            <div className="flex flex-wrap gap-2 w-full md:w-auto">
              {/* Recherche */}
              <div className="relative flex-1 md:w-64">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Rechercher par montant ou op..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-1.5 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:border-purple-500 bg-slate-50"
                />
              </div>

              {/* Filtre Opérateur */}
              <select
                value={filterReseau}
                onChange={(e) => setFilterReseau(e.target.value)}
                className="px-3 py-1.5 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:outline-hidden"
              >
                <option value="all">Tous les réseaux</option>
                <option value="Orange Money">Orange Money</option>
                <option value="MTN Mobile Money">MTN Mobile Money</option>
                <option value="Transfert de crédit">Transfert de crédit</option>
              </select>

              {/* Filtre Opération */}
              <select
                value={filterOp}
                onChange={(e) => setFilterOp(e.target.value)}
                className="px-3 py-1.5 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:outline-hidden"
              >
                <option value="all">Toutes opérations</option>
                <option value="dépôt">Dépôt</option>
                <option value="retrait">Retrait</option>
                <option value="transfert">Transfert</option>
              </select>

              {/* Bouton Export */}
              <button
                onClick={() => exportMobileMoneyTransactions(filteredTransactions)}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded-xl flex items-center gap-1.5 shadow-2xs hover:shadow-md transition-all cursor-pointer"
              >
                <Download size={14} />
                Exporter CSV
              </button>
            </div>
          </div>

          {filteredTransactions.length === 0 ? (
            <div className="text-center py-16 text-slate-400 text-sm">
              Aucune transaction financière n'a été trouvée.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 text-3xs font-bold uppercase tracking-wider">
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Opérateur</th>
                    <th className="py-3 px-4">Opération</th>
                    <th className="py-3 px-4 text-right">Volume Transaction</th>
                    <th className="py-3 px-4 text-right text-emerald-700">Commission gagnée</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-xs">
                  {filteredTransactions.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50/50 transition-all text-slate-600">
                      <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                        <span className="flex items-center gap-1">
                          <Calendar size={12} />
                          {formatDateLabel(t.date, true)}
                        </span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className={`px-2.5 py-0.5 rounded-full text-3xs font-bold uppercase ${
                          t.reseau === 'Orange Money' 
                            ? 'bg-orange-50 text-orange-700 border border-orange-100' 
                            : t.reseau === 'MTN Mobile Money'
                            ? 'bg-yellow-50 text-yellow-800 border border-yellow-150'
                            : 'bg-purple-50 text-purple-700 border border-purple-100'
                        }`}>
                          {t.reseau}
                        </span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-sm text-3xs font-bold uppercase ${
                          t.typeOperation === 'dépôt' 
                            ? 'bg-blue-50 text-blue-700' 
                            : t.typeOperation === 'retrait'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-indigo-50 text-indigo-700'
                        }`}>
                          {t.typeOperation}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-slate-800">
                        {formatFCFA(t.montant)}
                      </td>
                      <td className="py-3 px-4 text-right font-black text-emerald-600 bg-emerald-50/20">
                        +{formatFCFA(t.commission)}
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <button
                          onClick={() => {
                            setConfirmModal({
                              isOpen: true,
                              title: "Supprimer la transaction",
                              message: `Voulez-vous vraiment supprimer cette transaction de ${formatFCFA(t.montant)} (${t.reseau} - ${t.typeOperation.toUpperCase()}) ? Cette action est irréversible.`,
                              type: 'delete',
                              onConfirm: () => {
                                onDeleteTransaction(t.id);
                                setConfirmModal(prev => ({ ...prev, isOpen: false }));
                                alert('Transaction supprimée.');
                              }
                            });
                          }}
                          className="p-1 text-slate-400 hover:text-red-500 rounded-lg hover:bg-slate-100 transition-all cursor-pointer"
                          title="Supprimer la transaction"
                        >
                          <Trash2 size={14} />
                        </button>
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
              <div className={`p-2.5 rounded-xl ${
                confirmModal.type === 'delete' ? 'bg-red-50 text-red-600' : 'bg-purple-50 text-purple-600'
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
                  confirmModal.type === 'delete' ? 'bg-red-600 hover:bg-red-700' : 'bg-purple-600 hover:bg-purple-700'
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
