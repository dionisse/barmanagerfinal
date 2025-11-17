import React from 'react';
import { User } from '../types';
import { 
  Home, 
  ShoppingCart, 
  TrendingUp, 
  Package, 
  BarChart3, 
  Shield, 
  LogOut,
  Building,
  Package2,
  DollarSign,
  Settings,
  AlertTriangle,
  Key
} from 'lucide-react';
import SyncStatusIndicator from './SyncStatusIndicator';

interface NavigationProps {
  user: User;
  currentModule: string;
  onModuleChange: (module: string) => void;
  onLogout: () => void;
  licenseExpired?: boolean;
}

const Navigation: React.FC<NavigationProps> = ({ 
  user, 
  currentModule, 
  onModuleChange, 
  onLogout,
  licenseExpired = false
}) => {
  const menuItems = [
    { id: 'dashboard', label: 'Accueil', icon: Home },
    { id: 'achats', label: 'Achats', icon: ShoppingCart },
    { id: 'ventes', label: 'Ventes', icon: TrendingUp },
    { id: 'stocks', label: 'Stocks', icon: Package },
    { id: 'emballages', label: 'Emballages', icon: Package2 },
    { id: 'depenses', label: 'Dépenses', icon: DollarSign },
    { id: 'rapports', label: 'Rapports', icon: BarChart3 },
    { id: 'parametres', label: 'Paramètres', icon: Settings },
  ];

  if (user.type === 'Propriétaire') {
    menuItems.splice(-1, 0, { id: 'licences', label: 'Licences', icon: Shield });
  }

  const handleModuleChange = (moduleId: string) => {
    // Restrict access if license expired and user is not owner
    if (licenseExpired && user.type !== 'Propriétaire' && moduleId !== 'dashboard') {
      alert('Votre licence a expiré. Contactez le propriétaire pour renouveler.');
      return;
    }
    onModuleChange(moduleId);
  };

  // Afficher les informations de licence pour les utilisateurs non-propriétaires
  const getLicenseInfo = () => {
    if (user.type === 'Propriétaire') return null;
    
    const userLicense = (user as any).license;
    if (!userLicense) return null;
    
    const endDate = new Date(userLicense.dateFin);
    const today = new Date();
    const daysRemaining = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    return {
      type: userLicense.type,
      daysRemaining,
      isExpiring: daysRemaining <= 7,
      isExpired: daysRemaining < 0
    };
  };

  const licenseInfo = getLicenseInfo();

  return (
    <nav className="bg-white shadow-lg border-b border-gray-200 fixed top-0 left-0 right-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-8">
            <div className="flex items-center space-x-3">
              <Building className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">GOBEX</h1>
                <p className="text-xs text-gray-500">Gestion de Bar</p>
              </div>
            </div>
            
            <div className="hidden lg:flex items-center space-x-1">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isDisabled = licenseExpired && user.type !== 'Propriétaire' && item.id !== 'dashboard';
                return (
                  <button
                    key={item.id}
                    onClick={() => handleModuleChange(item.id)}
                    disabled={isDisabled}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-all duration-200 ${
                      currentModule === item.id
                        ? 'bg-blue-100 text-blue-700 shadow-sm'
                        : isDisabled
                        ? 'text-gray-400 cursor-not-allowed'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="font-medium text-sm">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* Affichage des informations de licence */}
            {licenseInfo && (
              <div className={`flex items-center space-x-2 px-3 py-1 rounded-lg ${
                licenseInfo.isExpired 
                  ? 'bg-red-100 text-red-700' 
                  : licenseInfo.isExpiring 
                  ? 'bg-amber-100 text-amber-700' 
                  : 'bg-green-100 text-green-700'
              }`}>
                <Key className="h-4 w-4" />
                <span className="text-sm font-medium">
                  {licenseInfo.type} - {
                    licenseInfo.isExpired 
                      ? 'Expirée' 
                      : `${licenseInfo.daysRemaining}j restants`
                  }
                </span>
              </div>
            )}

            {licenseExpired && user.type !== 'Propriétaire' && (
              <div className="flex items-center space-x-2 px-3 py-1 bg-red-100 text-red-700 rounded-lg">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm font-medium">Licence Expirée</span>
              </div>
            )}
            
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-gray-900">{user.username}</p>
              <div className="flex items-center space-x-1">
                <p className="text-xs text-gray-500">{user.type}</p>
                {user.type !== 'Propriétaire' && licenseInfo && (
                  <>
                    <span className="text-xs text-gray-400">•</span>
                    <span className="text-xs text-blue-600">{licenseInfo.type}</span>
                  </>
                )}
              </div>
            </div>
            <button
              onClick={onLogout}
              className="flex items-center space-x-2 px-4 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors duration-200"
            >
              <LogOut className="h-4 w-4" />
              <span className="font-medium">Déconnexion</span>
            </button>
          </div>
        </div>
      </div>
      
      {/* Mobile menu */}
      <div className="lg:hidden border-t border-gray-200 bg-gray-50">
        <div className="px-4 py-2">
          <div className="flex space-x-1 overflow-x-auto">
            {menuItems.slice(0, 6).map((item) => {
              const Icon = item.icon;
              const isDisabled = licenseExpired && user.type !== 'Propriétaire' && item.id !== 'dashboard';
              return (
                <button
                  key={item.id}
                  onClick={() => handleModuleChange(item.id)}
                  disabled={isDisabled}
                  className={`flex flex-col items-center space-y-1 px-3 py-2 rounded-lg transition-all duration-200 min-w-0 ${
                    currentModule === item.id
                      ? 'bg-blue-100 text-blue-700'
                      : isDisabled
                      ? 'text-gray-400 cursor-not-allowed'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="text-xs font-medium truncate">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;