import React, { useState, useEffect, useMemo } from 'react';
import { User, Sale, Product, Expense, Versement } from '../types';
import { TrendingUp, Package, DollarSign, Percent, ArrowUp, ArrowDown, Calendar, TriangleAlert as AlertTriangle, ChartBar as BarChart3, Wallet, Download, ShoppingCart, CreditCard, BellRing, Users } from 'lucide-react';
import { getDashboardStats, getSales, getProducts, getExpenses, getVersements, getSettings } from '../utils/dataService';
import { generateDailyClosingPDF } from '../utils/pdfService';
import LicenseCheckoutModal from './LicenseCheckoutModal';
import { computeLicenseStatus, milestoneLabel } from '../utils/licenseService';
import {
  getNotificationPermission,
  requestNotificationPermission,
  getLicenseInbox
} from '../utils/licenseNotificationService';

interface DashboardProps {
  user: User;
  onNavigate?: (module: string) => void;
}

type PeriodKey = 'today' | 'week' | 'month' | 'all';

const Dashboard: React.FC<DashboardProps> = ({ user, onNavigate }) => {
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

  /* ----- Bandeau licence : utilisateur rafraîchi en direct ----- */
  const [liveUser, setLiveUser] = useState<User>(user);
  const [showCheckout, setShowCheckout] = useState(false);
  const [notifPermission, setNotifPermission] = useState(getNotificationPermission());
  const [ownerAlerts, setOwnerAlerts] = useState(0);

  useEffect(() => {
    const refreshUser = () => {
      try {
        const raw = localStorage.getItem('gobex_current_user');
        if (raw) setLiveUser(JSON.parse(raw));
      } catch { /* ignore */ }
    };
    const refreshOwnerAlerts = () => {
      setOwnerAlerts(getLicenseInbox().filter(n => !n.read).length);
    };
    refreshUser();
    refreshOwnerAlerts();

    window.addEventListener('userDataUpdated', refreshUser);
    window.addEventListener('licenseRenewed', refreshUser);
    window.addEventListener('licenseInboxUpdated', refreshOwnerAlerts);
    return () => {
      window.removeEventListener('userDataUpdated', refreshUser);
      window.removeEventListener('licenseRenewed', refreshUser);
      window.removeEventListener('licenseInboxUpdated', refreshOwnerAlerts);
    };
  }, []);

  const licenseStatus =
    liveUser.type !== 'Propriétaire' && liveUser.license
      ? computeLicenseStatus(liveUser.license)
      : null;

  const enableNotifications = async () => {
    const perm = await requestNotificationPermission();
    setNotifPermission(perm);
  };

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
      tile: 'bg-clay-100 text-clay-600',
      sub: `${periodFilteredSales.length} vente(s)`
    },
    {
      title: 'Stock Total',
      value: `${stats.stockTotal} Articles`,
      icon: Package,
      tile: 'bg-kente-green/10 text-kente-green',
      sub: `${allProducts.length} produit(s)`
    },
    {
      title: 'Bénéfice Net',
      value: `${periodStats.beneficeNet.toLocaleString()} FCFA`,
      icon: DollarSign,
      tile: periodStats.beneficeNet >= 0
        ? 'bg-kente-green/10 text-kente-green'
        : 'bg-red-100 text-red-600',
      sub: `Marge: ${periodStats.margeBrute.toLocaleString()} FCFA`
    },
    {
      title: 'ROI',
      value: `${stats.roi.toFixed(1)}%`,
      icon: Percent,
      tile: 'bg-gold-100 text-gold-700',
      sub: stats.roi >= 0 ? 'Positif' : 'Négatif'
    }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* ---------- Bandeau licence : expiration / renouvellement ---------- */}
      {licenseStatus && licenseStatus.status !== 'active' && (
        <div className={`mb-8 rounded-xl border-2 p-5 sm:p-6 ${
          licenseStatus.status === 'expired'
            ? 'bg-red-50 border-red-300'
            : 'bg-amber-50 border-amber-300'
        }`}>
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className={`p-3 rounded-xl flex-shrink-0 ${
              licenseStatus.status === 'expired' ? 'bg-red-100' : 'bg-amber-100'
            }`}>
              <AlertTriangle className={`h-6 w-6 ${
                licenseStatus.status === 'expired' ? 'text-red-600' : 'text-amber-600'
              }`} />
            </div>
            <div className="flex-1">
              <h3 className={`font-display font-bold text-lg ${
                licenseStatus.status === 'expired' ? 'text-red-800' : 'text-amber-800'
              }`}>
                {milestoneLabel(licenseStatus.daysRemaining)}
              </h3>
              <p className={`text-sm mt-1 ${
                licenseStatus.status === 'expired' ? 'text-red-700' : 'text-amber-700'
              }`}>
                {licenseStatus.status === 'expired'
                  ? "Votre accès aux modules de gestion est suspendu jusqu'au renouvellement. Renouvelez en ligne en quelques secondes (Mobile Money ou carte) — votre activité reprend immédiatement."
                  : `Licence ${liveUser.license!.type} — échéance le ${new Date(liveUser.license!.dateFin).toLocaleDateString('fr-FR')}. Renouvelez maintenant pour éviter toute interruption : le temps restant est ajouté à votre nouvelle période.`}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 flex-shrink-0">
              {notifPermission === 'default' && (
                <button
                  onClick={enableNotifications}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border-2 border-espresso-900/15 bg-white text-espresso-700 text-sm font-semibold hover:bg-cream-200 transition-colors"
                >
                  <BellRing className="h-4 w-4" />
                  Activer les rappels
                </button>
              )}
              <button
                onClick={() => setShowCheckout(true)}
                className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-clay-600 hover:bg-clay-700 text-cream-50 text-sm font-bold shadow-card transition-colors"
              >
                <CreditCard className="h-4 w-4" />
                {licenseStatus.status === 'expired' ? 'Renouveler maintenant' : 'Renouveler en ligne'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------- Bandeau propriétaire : licences clients à échéance ---------- */}
      {user.type === 'Propriétaire' && ownerAlerts > 0 && (
        <div className="mb-8 rounded-xl border-2 border-amber-300 bg-amber-50 p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="p-3 rounded-xl bg-amber-100 flex-shrink-0">
              <Users className="h-6 w-6 text-amber-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-display font-bold text-lg text-amber-800">
                {ownerAlerts} licence{ownerAlerts > 1 ? 's' : ''} client{ownerAlerts > 1 ? 's' : ''} à échéance
              </h3>
              <p className="text-sm text-amber-700 mt-1">
                Des licences de vos clients expirent sous 7 jours, sous 3 jours ou aujourd'hui.
                Consultez le module Licences pour les relancer ou les renouveler.
              </p>
            </div>
            <button
              onClick={() => onNavigate?.('licences')}
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-clay-600 hover:bg-clay-700 text-cream-50 text-sm font-bold shadow-card transition-colors flex-shrink-0"
            >
              <CreditCard className="h-4 w-4" />
              Gérer les licences
            </button>
          </div>
        </div>
      )}

      {showCheckout && (
        <LicenseCheckoutModal
          user={liveUser}
          currentLicense={liveUser.license || null}
          onClose={() => setShowCheckout(false)}
          onRenewed={() => setLiveUser(JSON.parse(localStorage.getItem('gobex_current_user') || 'null') || liveUser)}
        />
      )}

      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-clay-600 mb-1.5">
            Tableau de bord · {user.type}
          </p>
          <h1 className="text-3xl font-semibold text-espresso-900">
            Bonjour, {user.username} 👋
          </h1>
          <p className="text-espresso-500 mt-1.5">
            Voici un aperçu de votre activité.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex bg-white rounded-xl border border-espresso-900/10 shadow-card overflow-hidden">
            {(Object.keys(periodLabels) as PeriodKey[]).map(key => (
              <button
                key={key}
                onClick={() => setPeriod(key)}
                className={`px-3 py-2 text-sm font-medium transition-colors ${
                  period === key
                    ? 'bg-clay-600 text-white'
                    : 'text-espresso-600 hover:bg-cream-200'
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
            <div key={index} className="bg-white rounded-2xl border border-espresso-900/8 shadow-card overflow-hidden hover:shadow-lift transition-shadow duration-300">
              <div className="p-5">
                <div className="flex items-center justify-between">
                  <span className={`grid place-items-center h-11 w-11 rounded-xl ${card.tile}`}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="text-xs font-bold uppercase tracking-wider text-espresso-400">
                    {card.title}
                  </span>
                </div>
                <p className="mt-4 text-2xl font-bold text-espresso-900">{card.value}</p>
              </div>
              <div className="px-5 py-2.5 bg-cream-100 border-t border-espresso-900/5">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-espresso-500">{card.sub}</span>
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
      <div className="bg-white rounded-2xl border border-espresso-900/8 shadow-card p-6 mb-8">
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
                  className="w-full bg-gradient-to-t from-clay-600 to-gold-400 rounded-t-lg transition-all duration-500 hover:from-clay-700 hover:to-gold-500"
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
        <div className="bg-white rounded-2xl border border-espresso-900/8 shadow-card p-6">
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
                      className="bg-gradient-to-r from-clay-500 to-gold-400 rounded-full h-2 transition-all duration-500"
                      style={{ width: `${(product.revenu / maxProductRevenue) * 100}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Sales */}
        <div className="bg-white rounded-2xl border border-espresso-900/8 shadow-card p-6">
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
        <div className="bg-white rounded-2xl border border-espresso-900/8 shadow-card p-6">
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
        <div className="bg-white rounded-2xl border border-espresso-900/8 shadow-card p-6">
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
