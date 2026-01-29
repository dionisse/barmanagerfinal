import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { BarChart3, TrendingUp, DollarSign, Download, Calendar, Percent } from 'lucide-react';
import { getSales, getPurchases, getProducts, getMultiPurchases, getExpenses } from '../utils/dataService';

interface RapportsModuleProps {
  user: User;
}

const RapportsModule: React.FC<RapportsModuleProps> = ({ user }) => {
  const [reportData, setReportData] = useState({
    totalVentes: 0,
    totalAchats: 0,
    totalDepenses: 0,
    benefice: 0,
    margeBrute: 0,
    margeNette: 0,
    roi: 0,
    ventesParJour: [],
    topProduits: [],
    alertesStock: []
  });

  const [dateRange, setDateRange] = useState({
    debut: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    fin: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    loadReportData();

    // Écouter l'événement de mise à jour du stock (achats/ventes)
    const handleStockUpdated = () => {
      console.log('Stock mis à jour, rechargement des rapports...');
      loadReportData();
    };

    window.addEventListener('stockUpdated', handleStockUpdated);

    return () => {
      window.removeEventListener('stockUpdated', handleStockUpdated);
    };
  }, [dateRange]);

  const loadReportData = async () => {
    const sales = await getSales();
    const purchases = await getPurchases();
    const multiPurchases = await getMultiPurchases();
    const products = await getProducts();
    const expenses = await getExpenses();

    // Filter by date range
    const filteredSales = sales.filter(sale => 
      sale.dateVente >= dateRange.debut && sale.dateVente <= dateRange.fin
    );
    const filteredPurchases = purchases.filter(purchase => 
      purchase.dateAchat >= dateRange.debut && purchase.dateAchat <= dateRange.fin
    );
    const filteredMultiPurchases = multiPurchases.filter(purchase => 
      purchase.dateAchat >= dateRange.debut && purchase.dateAchat <= dateRange.fin
    );
    const filteredExpenses = expenses.filter(expense => 
      expense.date >= dateRange.debut && expense.date <= dateRange.fin
    );

    const totalVentes = filteredSales.reduce((sum, sale) => sum + sale.total, 0);
    const totalAchats = filteredPurchases.reduce((sum, purchase) => sum + purchase.total, 0);
    const totalMultiAchats = filteredMultiPurchases.reduce((sum, purchase) => sum + purchase.totalGeneral, 0);
    const totalDepenses = filteredExpenses.reduce((sum, expense) => sum + expense.montant, 0);
    
    const totalCoutAchats = totalAchats + totalMultiAchats;
    
    // Calcul de la marge brute (Ventes - Coût des marchandises vendues)
    const margeBrute = totalVentes - totalCoutAchats;
    const margeBrutePourcentage = totalVentes > 0 ? (margeBrute / totalVentes) * 100 : 0;
    
    // Calcul de la marge nette (Marge brute - Dépenses)
    const margeNette = margeBrute - totalDepenses;
    const margeNettePourcentage = totalVentes > 0 ? (margeNette / totalVentes) * 100 : 0;
    
    // ROI basé sur les investissements totaux
    const investissementTotal = totalCoutAchats + totalDepenses;
    const roi = investissementTotal > 0 ? (margeNette / investissementTotal) * 100 : 0;

    // Sales per day
    const salesByDay = filteredSales.reduce((acc, sale) => {
      const date = sale.dateVente;
      acc[date] = (acc[date] || 0) + sale.total;
      return acc;
    }, {} as Record<string, number>);

    const ventesParJour = Object.entries(salesByDay).map(([date, total]) => ({
      date,
      total
    }));

    // Top products by quantity sold
    const productSales = filteredSales.reduce((acc, sale) => {
      acc[sale.produitId] = (acc[sale.produitId] || 0) + sale.quantite;
      return acc;
    }, {} as Record<string, number>);

    const topProduits = Object.entries(productSales)
      .map(([produitId, quantite]) => {
        const product = products.find(p => p.id === produitId);
        const productSalesData = filteredSales.filter(s => s.produitId === produitId);
        const revenus = productSalesData.reduce((sum, s) => sum + s.total, 0);
        const coutVentes = quantite * (product?.prixAchat || 0);
        const margeProduit = revenus - coutVentes;
        
        return {
          nom: product?.nom || 'Produit inconnu',
          quantite,
          revenus,
          coutVentes,
          margeProduit,
          margePourcentage: revenus > 0 ? (margeProduit / revenus) * 100 : 0
        };
      })
      .sort((a, b) => b.quantite - a.quantite)
      .slice(0, 5);

    // Stock alerts
    const alertesStock = products.filter(product => 
      product.seuilAlerte && product.stockActuel <= product.seuilAlerte
    );

    setReportData({
      totalVentes,
      totalAchats: totalCoutAchats,
      totalDepenses,
      benefice: margeNette,
      margeBrute: margeBrutePourcentage,
      margeNette: margeNettePourcentage,
      roi,
      ventesParJour,
      topProduits,
      alertesStock
    });
  };

  const exportReport = () => {
    const reportContent = `
RAPPORT GOBEX - ${new Date().toLocaleDateString('fr-FR')}
Période: ${new Date(dateRange.debut).toLocaleDateString('fr-FR')} - ${new Date(dateRange.fin).toLocaleDateString('fr-FR')}

=== RÉSUMÉ FINANCIER ===
Total des Ventes: ${reportData.totalVentes.toLocaleString()} FCFA
Total des Achats: ${reportData.totalAchats.toLocaleString()} FCFA
Total des Dépenses: ${reportData.totalDepenses.toLocaleString()} FCFA

=== MARGES ET RENTABILITÉ ===
Marge Brute: ${reportData.margeBrute.toFixed(2)}%
Marge Nette: ${reportData.margeNette.toFixed(2)}%
Bénéfice Net: ${reportData.benefice.toLocaleString()} FCFA
ROI: ${reportData.roi.toFixed(2)}%

=== TOP PRODUITS ===
${reportData.topProduits.map((p, i) => 
  `${i + 1}. ${p.nom}: ${p.quantite} vendus - ${p.revenus.toLocaleString()} FCFA (Marge: ${p.margePourcentage.toFixed(1)}%)`
).join('\n')}

=== ALERTES STOCK ===
${reportData.alertesStock.map(p => 
  `- ${p.nom}: ${p.stockActuel} restants (seuil: ${p.seuilAlerte})`
).join('\n')}
    `;

    const blob = new Blob([reportContent], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rapport-gobex-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Rapports et Analyses</h1>
          <p className="text-gray-600 mt-2">Analysez vos performances commerciales et rentabilité</p>
        </div>
        <button
          onClick={exportReport}
          className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
        >
          <Download className="h-5 w-5" />
          <span>Exporter</span>
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
        <div className="flex items-center space-x-4 mb-6">
          <Calendar className="h-6 w-6 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">Période d'analyse</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date de début
            </label>
            <input
              type="date"
              value={dateRange.debut}
              onChange={(e) => setDateRange({ ...dateRange, debut: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date de fin
            </label>
            <input
              type="date"
              value={dateRange.fin}
              onChange={(e) => setDateRange({ ...dateRange, fin: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Ventes</p>
              <p className="text-2xl font-bold text-green-600">
                {reportData.totalVentes.toLocaleString()} FCFA
              </p>
            </div>
            <TrendingUp className="h-8 w-8 text-green-600" />
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Marge Brute</p>
              <p className="text-2xl font-bold text-blue-600">
                {reportData.margeBrute.toFixed(1)}%
              </p>
            </div>
            <Percent className="h-8 w-8 text-blue-600" />
          </div>
          <div className="mt-2">
            <p className="text-xs text-gray-500">
              Ventes - Coût des marchandises
            </p>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Marge Nette</p>
              <p className={`text-2xl font-bold ${reportData.margeNette >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {reportData.margeNette.toFixed(1)}%
              </p>
            </div>
            <BarChart3 className={`h-8 w-8 ${reportData.margeNette >= 0 ? 'text-green-600' : 'text-red-600'}`} />
          </div>
          <div className="mt-2">
            <p className="text-xs text-gray-500">
              Après déduction des dépenses
            </p>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">ROI</p>
              <p className={`text-2xl font-bold ${reportData.roi >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {reportData.roi.toFixed(1)}%
              </p>
            </div>
            <TrendingUp className={`h-8 w-8 ${reportData.roi >= 0 ? 'text-green-600' : 'text-red-600'}`} />
          </div>
          <div className="mt-2">
            <p className="text-xs text-gray-500">
              Retour sur investissement
            </p>
          </div>
        </div>
      </div>

      {/* Résumé financier détaillé */}
      <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Résumé Financier Détaillé</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <div className="flex justify-between items-center p-4 bg-green-50 rounded-lg">
              <span className="font-medium text-green-800">Total des Ventes</span>
              <span className="font-bold text-green-600">{reportData.totalVentes.toLocaleString()} FCFA</span>
            </div>
            <div className="flex justify-between items-center p-4 bg-red-50 rounded-lg">
              <span className="font-medium text-red-800">Coût des Achats</span>
              <span className="font-bold text-red-600">-{reportData.totalAchats.toLocaleString()} FCFA</span>
            </div>
            <div className="flex justify-between items-center p-4 bg-blue-50 rounded-lg border-t-2 border-blue-200">
              <span className="font-medium text-blue-800">Marge Brute</span>
              <span className="font-bold text-blue-600">
                {(reportData.totalVentes - reportData.totalAchats).toLocaleString()} FCFA
              </span>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center p-4 bg-blue-50 rounded-lg">
              <span className="font-medium text-blue-800">Marge Brute</span>
              <span className="font-bold text-blue-600">
                {(reportData.totalVentes - reportData.totalAchats).toLocaleString()} FCFA
              </span>
            </div>
            <div className="flex justify-between items-center p-4 bg-orange-50 rounded-lg">
              <span className="font-medium text-orange-800">Dépenses</span>
              <span className="font-bold text-orange-600">-{reportData.totalDepenses.toLocaleString()} FCFA</span>
            </div>
            <div className={`flex justify-between items-center p-4 rounded-lg border-t-2 ${
              reportData.benefice >= 0 
                ? 'bg-green-50 border-green-200' 
                : 'bg-red-50 border-red-200'
            }`}>
              <span className={`font-medium ${reportData.benefice >= 0 ? 'text-green-800' : 'text-red-800'}`}>
                Bénéfice Net
              </span>
              <span className={`font-bold ${reportData.benefice >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {reportData.benefice.toLocaleString()} FCFA
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="bg-white rounded-xl shadow-lg">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Top 5 Produits par Rentabilité</h2>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {reportData.topProduits.map((product, index) => (
                <div key={index} className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 font-semibold">{index + 1}</span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{product.nom}</p>
                        <p className="text-sm text-gray-500">{product.quantite} vendus</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-green-600">
                        {product.revenus.toLocaleString()} FCFA
                      </p>
                      <p className={`text-sm font-medium ${
                        product.margePourcentage >= 0 ? 'text-blue-600' : 'text-red-600'
                      }`}>
                        Marge: {product.margePourcentage.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                  <div className="flex justify-between text-xs text-gray-600">
                    <span>Coût: {product.coutVentes.toLocaleString()} FCFA</span>
                    <span className={product.margeProduit >= 0 ? 'text-green-600' : 'text-red-600'}>
                      Profit: {product.margeProduit.toLocaleString()} FCFA
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Ventes par Jour</h2>
          </div>
          <div className="p-6">
            <div className="space-y-3">
              {reportData.ventesParJour.slice(-7).map((day, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-600">
                    {new Date(day.date).toLocaleDateString('fr-FR')}
                  </span>
                  <span className="font-semibold text-green-600">
                    {day.total.toLocaleString()} FCFA
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {reportData.alertesStock.length > 0 && (
        <div className="bg-white rounded-xl shadow-lg">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Alertes de Stock</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {reportData.alertesStock.map((product, index) => (
                <div key={index} className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-amber-900">{product.nom}</p>
                      <p className="text-sm text-amber-700">{product.categorie}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-amber-800">
                        {product.stockActuel} restants
                      </p>
                      <p className="text-xs text-amber-600">
                        Seuil: {product.seuilAlerte}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RapportsModule;