import { AppState } from './types';

// Format currency to FCFA
export function formatFCFA(value: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'decimal',
  }).format(value) + ' FCFA';
}

// Check if a date is within "Today", "This Week" (last 7 days), or "This Month" (last 30 days)
export function isDateInPeriod(dateStr: string, period: 'day' | 'week' | 'month'): boolean {
  const date = new Date(dateStr);
  const now = new Date();
  
  // Set times to midnight to compare days
  const dMidnight = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const nowMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  
  const diffTime = nowMidnight - dMidnight;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (period === 'day') {
    return date.getFullYear() === now.getFullYear() &&
           date.getMonth() === now.getMonth() &&
           date.getDate() === now.getDate();
  } else if (period === 'week') {
    return diffDays >= 0 && diffDays < 7;
  } else if (period === 'month') {
    return diffDays >= 0 && diffDays < 30;
  }
  return true;
}

// Get clean date label for display (French)
export function formatDateLabel(dateStr: string, includeTime = false): string {
  const d = new Date(dateStr);
  const dateParts = d.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: '2-digit'
  });
  if (includeTime) {
    const timeParts = d.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    });
    return `${dateParts} à ${timeParts}`;
  }
  return dateParts;
}

// Export data to CSV
export function exportToCSV(filename: string, headers: string[], rows: string[][]) {
  const csvContent = "data:text/csv;charset=utf-8,\uFEFF" // Add UTF-8 BOM for Excel French support
    + headers.join(";") + "\n"
    + rows.map(e => e.map(val => {
        // Escape quotes and semi-colons
        const cleanVal = String(val).replace(/"/g, '""');
        return `"${cleanVal}"`;
      }).join(";")).join("\n");
  
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Generate CSV export for Secretariat
export function exportSecretariatMouvements(mouvements: AppState['secretariatMouvements']) {
  const headers = ["ID", "Date", "Article / Prestation", "Type", "Quantité", "Montant (FCFA)"];
  const rows = mouvements.map(m => [
    m.id,
    formatDateLabel(m.date, true),
    m.nomPrestationOuArticle,
    m.typeMouvement === 'vente_article' ? 'Vente Article' : m.typeMouvement === 'entree_stock' ? 'Entrée de Stock' : 'Prestation',
    m.quantite.toString(),
    m.montant.toString()
  ]);
  exportToCSV(`secretariat_transactions_${new Date().toISOString().split('T')[0]}.csv`, headers, rows);
}

// Generate CSV export for Mobile Money
export function exportMobileMoneyTransactions(transactions: AppState['mobileMoneyTransactions']) {
  const headers = ["ID", "Date", "Réseau", "Type Opération", "Montant (FCFA)", "Commission (FCFA)"];
  const rows = transactions.map(t => [
    t.id,
    formatDateLabel(t.date, true),
    t.reseau,
    t.typeOperation,
    t.montant.toString(),
    t.commission.toString()
  ]);
  exportToCSV(`mobile_money_transactions_${new Date().toISOString().split('T')[0]}.csv`, headers, rows);
}

// Generate CSV export for Boissons
export function exportBoissonsMouvements(mouvements: AppState['boissonsMouvements']) {
  const headers = ["ID", "Date", "Produit", "Type Mouvement", "Quantité", "Montant Total (FCFA)"];
  const rows = mouvements.map(m => [
    m.id,
    formatDateLabel(m.date, true),
    m.nomProduit,
    m.typeMouvement === 'vente' ? 'Vente' : 'Approvisionnement',
    m.quantite.toString(),
    m.montant.toString()
  ]);
  exportToCSV(`boissons_transactions_${new Date().toISOString().split('T')[0]}.csv`, headers, rows);
}

// Generate Consolidated Report CSV
export function exportConsolidatedReport(state: AppState, period: 'day' | 'week' | 'month' | 'all') {
  const filterFn = (dateStr: string) => {
    if (period === 'all') return true;
    return isDateInPeriod(dateStr, period);
  };

  const secMovs = state.secretariatMouvements.filter(m => filterFn(m.date));
  const mmTxs = state.mobileMoneyTransactions.filter(t => filterFn(t.date));
  const boissonMovs = state.boissonsMouvements.filter(m => filterFn(m.date));

  const headers = ["Activité / Module", "ID Transaction", "Date", "Description", "Type d'Opération", "Montant (FCFA)", "Commission / Marge (FCFA)"];
  const rows: string[][] = [];

  // 1. Secrétariat
  secMovs.forEach(m => {
    rows.push([
      "Secrétariat",
      m.id,
      formatDateLabel(m.date, true),
      m.nomPrestationOuArticle,
      m.typeMouvement === 'vente_article' ? 'Vente Article' : m.typeMouvement === 'entree_stock' ? 'Entrée Stock' : 'Prestation',
      m.montant.toString(),
      m.typeMouvement === 'entree_stock' ? "0" : m.montant.toString() // Recette brute assimilée à gain
    ]);
  });

  // 2. Mobile Money
  mmTxs.forEach(t => {
    rows.push([
      "Mobile Money",
      t.id,
      formatDateLabel(t.date, true),
      `${t.typeOperation} sur ${t.reseau}`,
      t.typeOperation,
      t.montant.toString(),
      t.commission.toString()
    ]);
  });

  // 3. Boissons
  boissonMovs.forEach(m => {
    // Calcul de la marge estimée si c'est une vente
    let marge = 0;
    if (m.typeMouvement === 'vente') {
      const prod = state.boissonsCatalogue.find(p => p.id === m.idProduit);
      if (prod) {
        marge = (prod.prixVenteActuel - prod.prixAchatActuel) * m.quantite;
      }
    }
    rows.push([
      "Boissons",
      m.id,
      formatDateLabel(m.date, true),
      m.nomProduit,
      m.typeMouvement === 'vente' ? 'Vente' : 'Approvisionnement',
      m.montant.toString(),
      marge.toString()
    ]);
  });

  exportToCSV(`rapport_consolide_${period}_${new Date().toISOString().split('T')[0]}.csv`, headers, rows);
}
