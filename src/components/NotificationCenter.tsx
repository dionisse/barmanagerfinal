import React, { useState, useEffect, useRef } from 'react';
import { Bell, TriangleAlert as AlertTriangle, Package, Key, X, Search, TrendingUp } from 'lucide-react';
import { getProducts, getSales, getMultiPurchases } from '../utils/dataService';
import { Product, Sale, MultiPurchase } from '../types';

interface NotificationCenterProps {
  onNavigate: (module: string) => void;
  licenseDaysRemaining?: number;
  licenseExpired?: boolean;
}

interface Notification {
  id: string;
  type: 'stock' | 'license' | 'out-of-stock';
  title: string;
  message: string;
  severity: 'warning' | 'error' | 'info';
  module: string;
}

const NotificationCenter: React.FC<NotificationCenterProps> = ({
  onNavigate,
  licenseDaysRemaining,
  licenseExpired
}) => {
  const [showPanel, setShowPanel] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 60000);
    return () => clearInterval(interval);
  }, [licenseDaysRemaining, licenseExpired]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        buttonRef.current && !buttonRef.current.contains(e.target as Node)
      ) {
        setShowPanel(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadNotifications = async () => {
    const notifs: Notification[] = [];

    try {
      const products = await getProducts();

      products.forEach(product => {
        if (product.stockActuel === 0) {
          notifs.push({
            id: `oos-${product.id}`,
            type: 'out-of-stock',
            title: 'Rupture de stock',
            message: `${product.nom} est en rupture de stock`,
            severity: 'error',
            module: 'stocks'
          });
        } else if (product.seuilAlerte && product.stockActuel <= product.seuilAlerte) {
          notifs.push({
            id: `low-${product.id}`,
            type: 'stock',
            title: 'Stock faible',
            message: `${product.nom}: ${product.stockActuel} restants (seuil: ${product.seuilAlerte})`,
            severity: 'warning',
            module: 'stocks'
          });
        }
      });

      if (licenseExpired) {
        notifs.push({
          id: 'license-expired',
          type: 'license',
          title: 'Licence expirée',
          message: 'Votre licence a expiré. Contactez le propriétaire pour renouveler.',
          severity: 'error',
          module: 'parametres'
        });
      } else if (licenseDaysRemaining !== undefined && licenseDaysRemaining <= 7 && licenseDaysRemaining > 0) {
        notifs.push({
          id: 'license-expiring',
          type: 'license',
          title: 'Licence bientôt expirée',
          message: `Il reste ${licenseDaysRemaining} jour(s) avant l'expiration de la licence.`,
          severity: 'warning',
          module: 'parametres'
        });
      }
    } catch (error) {
      console.error('Erreur lors du chargement des notifications:', error);
    }

    setNotifications(notifs);
  };

  const errorCount = notifications.filter(n => n.severity === 'error').length;
  const warningCount = notifications.filter(n => n.severity === 'warning').length;
  const totalCount = notifications.length;

  const getIcon = (notif: Notification) => {
    switch (notif.type) {
      case 'out-of-stock':
        return <Package className="h-4 w-4 text-red-600" />;
      case 'stock':
        return <AlertTriangle className="h-4 w-4 text-amber-600" />;
      case 'license':
        return <Key className="h-4 w-4 text-red-600" />;
      default:
        return <Bell className="h-4 w-4 text-gray-600" />;
    }
  };

  const handleNotifClick = (notif: Notification) => {
    onNavigate(notif.module);
    setShowPanel(false);
  };

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => setShowPanel(!showPanel)}
        className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5 text-gray-600" />
        {totalCount > 0 && (
          <span className={`absolute -top-0.5 -right-0.5 w-4 h-4 text-xs font-bold text-white rounded-full flex items-center justify-center ${
            errorCount > 0 ? 'bg-red-500' : 'bg-amber-500'
          }`}>
            {totalCount > 9 ? '9+' : totalCount}
          </span>
        )}
      </button>

      {showPanel && (
        <div
          ref={panelRef}
          className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 max-h-96 overflow-y-auto"
        >
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 flex items-center space-x-2">
              <Bell className="h-4 w-4 text-gray-600" />
              <span>Notifications</span>
              {totalCount > 0 && (
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  errorCount > 0 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                }`}>
                  {totalCount}
                </span>
              )}
            </h3>
            <button
              onClick={() => setShowPanel(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="divide-y divide-gray-100">
            {notifications.length === 0 ? (
              <div className="p-8 text-center">
                <Bell className="mx-auto h-8 w-8 text-gray-300 mb-2" />
                <p className="text-sm text-gray-500">Aucune notification</p>
              </div>
            ) : (
              notifications.map(notif => (
                <button
                  key={notif.id}
                  onClick={() => handleNotifClick(notif)}
                  className={`w-full p-4 text-left hover:bg-gray-50 transition-colors flex items-start space-x-3 ${
                    notif.severity === 'error' ? 'bg-red-50' : notif.severity === 'warning' ? 'bg-amber-50' : ''
                  }`}
                >
                  <div className="flex-shrink-0 mt-0.5">
                    {getIcon(notif)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{notif.title}</p>
                    <p className="text-xs text-gray-600 mt-0.5">{notif.message}</p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Global search component
interface GlobalSearchProps {
  onNavigate: (module: string) => void;
}

export const GlobalSearch: React.FC<GlobalSearchProps> = ({ onNavigate }) => {
  const [query, setQuery] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [purchases, setPurchases] = useState<MultiPurchase[]>([]);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const load = async () => {
      const [p, s, pu] = await Promise.all([
        getProducts(),
        getSales(),
        getMultiPurchases()
      ]);
      setProducts(p);
      setSales(s);
      setPurchases(pu);
    };
    load();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const results = query.length >= 2 ? [
    ...products
      .filter(p => p.nom.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 3)
      .map(p => ({
        id: `prod-${p.id}`,
        label: p.nom,
        sub: `Stock: ${p.stockActuel} · ${p.categorie}`,
        module: 'stocks',
        icon: <Package className="h-4 w-4 text-blue-600" />
      })),
    ...sales
      .filter(s =>
        s.produitNom.toLowerCase().includes(query.toLowerCase()) ||
        s.client.toLowerCase().includes(query.toLowerCase())
      )
      .slice(0, 3)
      .map(s => ({
        id: `sale-${s.id}`,
        label: s.produitNom,
        sub: `Vente · ${s.client} · ${s.total.toLocaleString()} FCFA`,
        module: 'ventes',
        icon: <TrendingUp className="h-4 w-4 text-green-600" />
      })),
    ...purchases
      .filter(p =>
        p.fournisseur.toLowerCase().includes(query.toLowerCase()) ||
        p.numeroCommande.toLowerCase().includes(query.toLowerCase())
      )
      .slice(0, 3)
      .map(p => ({
        id: `purch-${p.id}`,
        label: p.fournisseur,
        sub: `Achat · ${p.numeroCommande} · ${p.totalGeneral.toLocaleString()} FCFA`,
        module: 'achats',
        icon: <Package className="h-4 w-4 text-purple-600" />
      })),
  ] : [];

  return (
    <div ref={searchRef} className="relative hidden md:block w-56">
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
      <input
        type="text"
        placeholder="Rechercher..."
        value={query}
        onChange={(e) => { setQuery(e.target.value); setShowResults(true); }}
        onFocus={() => setShowResults(true)}
        className="w-full pl-9 pr-3 py-1.5 text-sm bg-gray-100 border border-transparent rounded-lg focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all outline-none"
      />
      {showResults && results.length > 0 && (
        <div className="absolute top-full mt-1 w-72 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-72 overflow-y-auto">
          {results.map(r => (
            <button
              key={r.id}
              onClick={() => {
                onNavigate(r.module);
                setShowResults(false);
                setQuery('');
              }}
              className="w-full p-3 text-left hover:bg-gray-50 transition-colors flex items-center space-x-3 border-b border-gray-100 last:border-0"
            >
              <div className="flex-shrink-0">{r.icon}</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{r.label}</p>
                <p className="text-xs text-gray-500 truncate">{r.sub}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default NotificationCenter;
