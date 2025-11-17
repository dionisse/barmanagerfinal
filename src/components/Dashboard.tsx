import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { 
  TrendingUp, 
  Package, 
  DollarSign, 
  Percent,
  ArrowUp,
  ArrowDown,
  Calendar
} from 'lucide-react';
import { getDashboardStats } from '../utils/dataService';

interface DashboardProps {
  user: User;
}

const Dashboard: React.FC<DashboardProps> = ({ user }) => {
  const [stats, setStats] = useState({
    ventesJour: 0,
    stockTotal: 0,
    beneficeNet: 0,
    roi: 0
  });

  useEffect(() => {
    const loadStats = async () => {
      const dashboardStats = await getDashboardStats();
      setStats(dashboardStats);
    };
    loadStats();
  }, []);

  const statCards = [
    {
      title: 'Ventes du Jour',
      value: `${stats.ventesJour.toLocaleString()} FCFA`,
      icon: TrendingUp,
      color: 'bg-gradient-to-br from-blue-500 to-blue-600',
      change: '+12%',
      changeType: 'positive'
    },
    {
      title: 'Stock Total',
      value: `${stats.stockTotal} Articles`,
      icon: Package,
      color: 'bg-gradient-to-br from-green-500 to-green-600',
      change: '+5%',
      changeType: 'positive'
    },
    {
      title: 'Bénéfice Net',
      value: `${stats.beneficeNet.toLocaleString()} FCFA`,
      icon: DollarSign,
      color: 'bg-gradient-to-br from-indigo-500 to-indigo-600',
      change: '+18%',
      changeType: 'positive'
    },
    {
      title: 'ROI',
      value: `${stats.roi.toFixed(1)}%`,
      icon: Percent,
      color: 'bg-gradient-to-br from-amber-500 to-amber-600',
      change: '-2%',
      changeType: 'negative'
    }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Tableau de Bord - {user.type}
        </h1>
        <p className="text-gray-600 mt-2">
          Bienvenue, {user.username}. Voici un aperçu de votre activité.
        </p>
      </div>

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
                  <span className="text-sm text-gray-600">Vs. période précédente</span>
                  <div className={`flex items-center space-x-1 ${
                    card.changeType === 'positive' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {card.changeType === 'positive' ? (
                      <ArrowUp className="h-4 w-4" />
                    ) : (
                      <ArrowDown className="h-4 w-4" />
                    )}
                    <span className="text-sm font-semibold">{card.change}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Ventes Récentes</h2>
            <Calendar className="h-5 w-5 text-gray-400" />
          </div>
          
          <div className="space-y-4">
            {[1, 2, 3, 4].map((item) => (
              <div key={item} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <TrendingUp className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Vente #{1000 + item}</p>
                    <p className="text-sm text-gray-500">Il y a {item} heure(s)</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">{(2500 * item).toLocaleString()} FCFA</p>
                  <p className="text-sm text-green-600">Terminée</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Alertes Stock</h2>
            <Package className="h-5 w-5 text-gray-400" />
          </div>
          
          <div className="space-y-4">
            {[
              { nom: 'Coca-Cola 33cl', stock: 5, seuil: 20 },
              { nom: 'Bière Castel', stock: 12, seuil: 30 },
              { nom: 'Eau minérale', stock: 8, seuil: 25 }
            ].map((product, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                    <Package className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{product.nom}</p>
                    <p className="text-sm text-gray-500">Stock faible</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-amber-700">{product.stock} restants</p>
                  <p className="text-sm text-gray-500">Seuil: {product.seuil}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;