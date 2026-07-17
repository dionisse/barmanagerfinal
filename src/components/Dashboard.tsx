import React, { useState, useEffect, useMemo } from 'react';
import { User, Sale, Product, Expense, Versement } from '../types';
import { TrendingUp, Package, DollarSign, Percent, ArrowUp, ArrowDown, Calendar, TriangleAlert as AlertTriangle, ChartBar as BarChart3, Wallet, Download, ShoppingCart } from 'lucide-react';
import { getDashboardStats, getSales, getProducts, getExpenses, getVersements, getSettings } from '../utils/dataService';
import { generateDailyClosingPDF } from '../utils/pdfService';

interface DashboardProps {
  user: User;
}

type PeriodKey = 'today' | 'week' | 'month' | 'all';

const Dashboard: React.FC<DashboardProps> = ({ user }) => {
  const [stats, setStats] = useState({
    ventesJour: 0,
    stockTotal: 0,
    beneficeNet: 0,
    roi: 0
  });
  const [recentSales, setRecentSales] = useState<Sale[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([]);
  const [allSales, setAllSales] = useState<Sale[]>([]);
  const [allProducts, setProductData] = useState<Product[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [versements, setVersements] = useState<Versement[]>([]);
  const [period, setPeriod] = useState<PeriodKey>('today');
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      const [dashboardStats, sales, products, exp, vers] = await Promise.all([
        getDashboardStats(),
        getSales(),
        getProducts(),
        getExpenses(),
        getVersements()
      ]);

      setStats(dashboardStats);
      setAllSales(sales);
      setProductData(products);
      setExpenses(exp);
      setVersements(vers);

      const sorted = [...sales].sort((a, b) =>
        new Date(b.dateVente).getTime() - new Date(a.dateVente).getTime()
      );
      setRecentSales(sorted.slice(0, 5));

      const lowStock = products.filter(p => p.seuilAlerte && p.stockActuel <= p.seuilAlerte);
      setLowStockProducts(lowStock.slice(0, 5));
    };

    loadData();

    const handleDataRestored = () => loadData();
    const handleStockUpdated = () => loadData();

    window.addEventListener('dataRestored', handleDataRestored);
    window.addEventListener('stockUpdated', handleStockUpdated);

    return () => {
      window.removeEventListener('dataRestored', handleDataRestored);
      window.removeEventListener('stockUpdated', handleStockUpdated);
    };
  }, []);

  const getPeriodRange = (key: PeriodKey): { start: string; end: string } => {
    const today = new Date();
    const end = today.toISOString().split('T')[0];
    switch (key) {
      case 'today':
        return { start: end, end };
      case 'week': {
        const first = new Date(today);
        first.setDate(today.getDate() - today.getDay());
        return { start: first.toISOString().split('T')[0], end };
      }
      case 'month': {
        const first = new Date(today.getFullYear(), today.getMonth(), 1);
        return { start: first.toISOString().split('T')[0], end };
      }
      default:
        return { start: '2000-01-01', end };
    }
  };

  const periodFilteredSales = useMemo(() => {
    const { start, end } = getPeriodRange(period);
    return allSales.filter(s => s.dateVente >= start && s.dateVente <= end);
  }, [allSales, period]);

  const periodFilteredExpenses = useMemo(() => {
    const { start, end } = getPeriodRange(period);
    return expenses.filter(e => e.date >= start && e.date <= end);
  }, [expenses, period]);

  const periodFilteredVersements = useMemo(() => {
    const { start, end } = getPeriodRange(period);
    return versements.filter(v => v.date >= start && v.date <= end);
  }, [versements, period]);

  const periodStats = useMemo(() => {
    const totalVentes = periodFilteredSales.reduce((sum, s) => sum + s.total, 0);
    const totalDepenses = periodFilteredExpenses.reduce((sum, e) => sum + e.montant, 0);
    const totalVersements = periodFilteredVersements.reduce((sum, v) => sum + v.montant, 0);
    const coutAchats = periodFilteredSales.reduce((sum, s) => {
      const product = allProducts.find(p => p.id === s.produitId);
      return sum + (product ? product.prixAchat * s.quantite : 0);
    }, 0);
    const margeBrute = totalVentes - coutAchats;
    const beneficeNet = margeBrute - totalDepenses;
    return { totalVentes, totalDepenses, totalVersements, margeBrute, beneficeNet, coutAchats };
  }, [periodFilteredSales, periodFilteredExpenses, periodFilteredVersements, allProducts]);

  // Sales by day for bar chart (last 7 days)
  const salesByDay = useMemo(() => {
    const last7: { date: string; total: number; label: string }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const total = allSales
        .filter(s => s.dateVente === dateStr)
        .reduce((sum, s) => sum + s.total, 0);
      last7.push({
        date: dateStr,
        total,
        label: d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' })
      });
    }
    return last7;
  }, [allSales]);

  const maxSalesDay = Math.max(...salesByDay.map(d => d.total), 1);

  // Top 5 products by revenue
  const topProducts = useMemo(() => {
    const productRevenue: Record<string, { nom: string; revenu: number; quantite: number }> = {};
    periodFilteredSales.forEach(s => {
      if (!productRevenue[s.produitId]) {
        productRevenue[s.produitId] = { nom: s.produitNom, revenu: 0, quantite: 0 };
      }
      productRevenue[s.produitId].revenu += s.total;
      productRevenue[s.produitId].quantite += s.quantite;
    });
    return Object.values(productRevenue)
      .sort((a, b) => b.revenu - a.revenu)
      .slice(0, 5);
  }, [periodFilteredSales]);

  const maxProductRevenue = Math.max(...topProducts.map(p => p.revenu), 1);

  const handleDailyClosing = async () => {
    setIsClosing(true);
    try {
      await generateDailyClosingPDF({
        date: new Date().toLocaleDateString('fr-FR'),
        ventes: periodFilteredSales,
        depenses: periodFilteredExpenses,
        versements: periodFilteredVersements,
        totalVentes: periodStats.totalVentes,
        totalDepenses: periodStats.totalDepenses,
        totalVersements: periodStats.totalVersements,
        margeBrute: periodStats.margeBrute,
        beneficeNet: periodStats.beneficeNet
      });
    } catch (error) {
      console.error('Erreur lors de la génération de la clôture:', error);
      alert('Erreur lors de la génération de la clôture de caisse');
    } finally {
      setIsClosing(false);
    }
  };

  const periodLabels: Record<PeriodKey, string> = {
    today: 'Aujourd\'hui',
    week: 'Cette semaine',
    month: 'Ce mois',
    all: 'Tout'
  };

  const statCards = [
    {
      title: 'Ventes',
      value: `${periodStats.totalVentes.toLocaleString()} FCFA`,
      icon: TrendingUp,
      color: 'bg-gradient-to-br from-blue-500 to-blue-600',
      sub: `${periodFilteredSales.length} vente(s)`
    },
    {
      title: 'Stock Total',
      value: `${stats.stockTotal} Articles`,
      icon: Package,
      color: 'bg-gradient-to-br from-green-500 to-green-600',
      sub: `${allProducts.length} produit(s)`
    },
    {
      title: 'Bénéfice Net',
      value: `${periodStats.beneficeNet.toLocaleString()} FCFA`,
      icon: DollarSign,
      color: periodStats.beneficeNet >= 0
        ? 'bg-gradient-to-br from-teal-500 to-teal-600'
        : 'bg-gradient-to-br from-red-500 to-red-600',
      sub: `Marge: ${periodStats.margeBrute.toLocaleString()} FCFA`
    },
    {
      title: 'ROI',
      value: `${stats.roi.toFixed(1)}%`,
      icon: Percent,
      color: 'bg-gradient-to-br from-amber-500 to-amber-600',
      sub: stats.roi >= 0 ? 'Positif' : 'Négatif'
    }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Tableau de Bord - {user.type}
          </h1>
          <p className="text-gray-600 mt-2">
            Bienvenue, {user.username}. Voici un aperçu de votre activité.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            {(Object.keys(periodLabels) as PeriodKey[]).map(key => (
              <button
                key={key}
                onClick={() => setPeriod(key)}
                className={`px-3 py-2 text-sm font-medium transition-colors ${
                  period === key
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {periodLabels[key]}
              </button>
            ))}
          </div>
          <button
            onClick={handleDailyClosing}
            disabled={isClosing}
            className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors flex items-center space-x-2 shadow-sm disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            <span>{isClosing ? 'Génération...' : 'Clôture de Caisse'}</span>
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <div key={index} className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300">
              <div className={`${card.color} px-6 py-4`}>
                <div className="flex items-center justify-between">
                  <div className="text-white">
                    <p className="text-sm opacity-90">{card.title}</p>
                    <p className="text-2xl font-bold mt-1">{card.value}</p>
                  </div>
                  <Icon className="h-8 w-8 text-white opacity-80" />
                </div>
              </div>
              <div className="px-6 py-3 bg-gray-50">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">{card.sub}</span>
                  <div className={`flex items-center space-x-1 ${
                    card.title === 'Bénéfice Net' && periodStats.beneficeNet < 0
                      ? 'text-red-600' : 'text-green-600'
                  }`}>
                    {card.title === 'Bénéfice Net' && periodStats.beneficeNet < 0
                      ? <ArrowDown className="h-4 w-4" />
                      : <ArrowUp className="h-4 w-4" />
                    }
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Sales Chart - Last 7 days */}
      <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2">
            <BarChart3 className="h-5 w-5 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">Ventes des 7 derniers jours</h2>
          </div>
        </div>
        <div className="flex items-end justify-between gap-2 h-48">
          {salesByDay.map((day, i) => (
            <div key={i} className="flex-1 flex flex-col items-center group">
              <div className="text-xs font-semibold text-gray-700 mb-2 opacity-0 group-hover:opacity-100 transition-opacity">
                {day.total.toLocaleString()} FCFA
              </div>
              <div className="w-full bg-gray-100 rounded-t-lg relative flex-1 flex items-end overflow-hidden">
                <div
                  className="w-full bg-gradient-to-t from-blue-600 to-blue-400 rounded-t-lg transition-all duration-500 hover:from-blue-700 hover:to-blue-500"
                  style={{ height: `${(day.total / maxSalesDay) * 100}%` }}
                />
              </div>
              <span className="text-xs text-gray-500 mt-2 capitalize">{day.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Top Products */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Top 5 Produits</h2>
            <TrendingUp className="h-5 w-5 text-gray-400" />
          </div>
          <div className="space-y-4">
            {topProducts.length === 0 ? (
              <div className="text-center py-8">
                <TrendingUp className="mx-auto h-10 w-10 text-gray-300 mb-3" />
                <p className="text-gray-500 text-sm">Aucune vente sur cette période</p>
              </div>
            ) : (
              topProducts.map((product, index) => (
                <div key={index} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-2">
                      <span className="w-5 h-5 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold">
                        {index + 1}
                      </span>
                      <span className="font-medium text-gray-900">{product.nom}</span>
                      <span className="text-xs text-gray-400">{product.quantite} vendus</span>
                    </div>
                    <span className="font-semibold text-green-600">{product.revenu.toLocaleString()} FCFA</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-blue-400 rounded-full h-2 transition-all duration-500"
                      style={{ width: `${(product.revenu / maxProductRevenue) * 100}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Sales */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Ventes Récentes</h2>
            <Calendar className="h-5 w-5 text-gray-400" />
          </div>
          <div className="space-y-4">
            {recentSales.length === 0 ? (
              <div className="text-center py-8">
                <TrendingUp className="mx-auto h-10 w-10 text-gray-300 mb-3" />
                <p className="text-gray-500 text-sm">Aucune vente enregistrée</p>
              </div>
            ) : (
              recentSales.map((sale) => (
                <div key={sale.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <ShoppingCart className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{sale.produitNom}</p>
                      <p className="text-xs text-gray-500">
                        {sale.client} · {new Date(sale.dateVente).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900 text-sm">{sale.total.toLocaleString()} FCFA</p>
                    <p className="text-xs text-green-600">Qté: {sale.quantite}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Low Stock + Period Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Alertes Stock</h2>
            <AlertTriangle className="h-5 w-5 text-gray-400" />
          </div>
          <div className="space-y-4">
            {lowStockProducts.length === 0 ? (
              <div className="text-center py-8">
                <Package className="mx-auto h-10 w-10 text-gray-300 mb-3" />
                <p className="text-gray-500 text-sm">Aucune alerte de stock</p>
              </div>
            ) : (
              lowStockProducts.map((product) => (
                <div key={product.id} className="flex items-center justify-between p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                      <AlertTriangle className="h-5 w-5 text-amber-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{product.nom}</p>
                      <p className="text-xs text-gray-500">Seuil: {product.seuilAlerte}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-semibold text-sm ${product.stockActuel === 0 ? 'text-red-600' : 'text-amber-700'}`}>
                      {product.stockActuel} restants
                    </p>
                    <p className="text-xs text-gray-500">{product.categorie}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Period Financial Summary */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              Résumé {periodLabels[period]}
            </h2>
            <Wallet className="h-5 w-5 text-gray-400" />
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
              <span className="text-sm font-medium text-green-800">Total Ventes</span>
              <span className="font-bold text-green-600">{periodStats.totalVentes.toLocaleString()} FCFA</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg">
              <span className="text-sm font-medium text-orange-800">Coût Marchandises</span>
              <span className="font-bold text-orange-600">-{periodStats.coutAchats.toLocaleString()} FCFA</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
              <span className="text-sm font-medium text-blue-800">Marge Brute</span>
              <span className="font-bold text-blue-600">{periodStats.margeBrute.toLocaleString()} FCFA</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
              <span className="text-sm font-medium text-red-800">Dépenses</span>
              <span className="font-bold text-red-600">-{periodStats.totalDepenses.toLocaleString()} FCFA</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-emerald-50 rounded-lg">
              <span className="text-sm font-medium text-emerald-800">Versements</span>
              <span className="font-bold text-emerald-600">{periodStats.totalVersements.toLocaleString()} FCFA</span>
            </div>
            <div className={`flex justify-between items-center p-4 rounded-lg border-t-2 ${
              periodStats.beneficeNet >= 0
                ? 'bg-green-50 border-green-200'
                : 'bg-red-50 border-red-200'
            }`}>
              <span className={`font-medium ${periodStats.beneficeNet >= 0 ? 'text-green-800' : 'text-red-800'}`}>
                Bénéfice Net
              </span>
              <span className={`text-lg font-bold ${periodStats.beneficeNet >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {periodStats.beneficeNet.toLocaleString()} FCFA
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
