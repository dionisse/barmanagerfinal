import React, { useState, useEffect, useRef } from 'react';
import { User } from '../types';
import {
  Chrome as Home, ShoppingCart, TrendingUp, Package, ChartBar as BarChart3,
  Shield, LogOut, Building, Package2, DollarSign, Settings,
  TriangleAlert as AlertTriangle, Key, Users, Menu, X
} from 'lucide-react';
import SyncStatusIndicator from './SyncStatusIndicator';
import NotificationCenter, { GlobalSearch } from './NotificationCenter';

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
  const [mobileOpen, setMobileOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);

  const menuItems = [
    { id: 'dashboard', label: 'Accueil', icon: Home },
    { id: 'achats', label: 'Achats', icon: ShoppingCart },
    { id: 'ventes', label: 'Ventes', icon: TrendingUp },
    { id: 'stocks', label: 'Stocks', icon: Package },
    { id: 'emballages', label: 'Emballages', icon: Package2 },
    { id: 'clients', label: 'Clients', icon: Users },
    { id: 'depenses', label: 'Dépenses', icon: DollarSign },
    { id: 'rapports', label: 'Rapports', icon: BarChart3 },
    { id: 'parametres', label: 'Paramètres', icon: Settings },
  ];

  if (user.type === 'Propriétaire') {
    menuItems.splice(-1, 0, { id: 'licences', label: 'Licences', icon: Shield });
  }

  const handleModuleChange = (moduleId: string) => {
    if (licenseExpired && user.type !== 'Propriétaire' && moduleId !== 'dashboard') {
      alert('Votre licence a expiré. Contactez le propriétaire pour renouveler.');
      return;
    }
    onModuleChange(moduleId);
    setMobileOpen(false);
  };

  const getLicenseInfo = () => {
    if (user.type === 'Propriétaire') return null;

    const userLicense = user.license;
    if (!userLicense) return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endDate = new Date(userLicense.dateFin);
    endDate.setHours(23, 59, 59, 999);
    const daysRemaining = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    return {
      type: userLicense.type,
      daysRemaining: daysRemaining > 0 ? daysRemaining : 0,
      isExpiring: daysRemaining <= 7 && daysRemaining > 0,
      isExpired: daysRemaining <= 0
    };
  };

  const licenseInfo = getLicenseInfo();

  useEffect(() => {
    if (!mobileOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (drawerRef.current && !drawerRef.current.contains(e.target as Node)) {
        setMobileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [mobileOpen]);

  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  const isDisabled = (itemId: string) =>
    licenseExpired && user.type !== 'Propriétaire' && itemId !== 'dashboard';

  return (
    <>
      <nav className="bg-white shadow-lg border-b border-gray-200 fixed top-0 left-0 right-0 z-50">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo + Desktop menu */}
            <div className="flex items-center space-x-2 sm:space-x-8">
              <div className="flex items-center space-x-3">
                <Building className="h-7 w-7 sm:h-8 sm:w-8 text-blue-600 flex-shrink-0" />
                <div>
                  <h1 className="text-lg sm:text-xl font-bold text-gray-900">GOBEX</h1>
                  <p className="text-xs text-gray-500 hidden sm:block">Gestion de Bar</p>
                </div>
              </div>

              <div className="hidden lg:flex items-center space-x-1">
                {menuItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleModuleChange(item.id)}
                      disabled={isDisabled(item.id)}
                      className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-all duration-200 ${
                        currentModule === item.id
                          ? 'bg-blue-100 text-blue-700 shadow-sm'
                          : isDisabled(item.id)
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

            {/* Right controls */}
            <div className="flex items-center space-x-2 sm:space-x-4">
              <div className="hidden md:block">
                <GlobalSearch onNavigate={handleModuleChange} />
              </div>
              <NotificationCenter
                onNavigate={handleModuleChange}
                licenseDaysRemaining={licenseInfo?.daysRemaining}
                licenseExpired={licenseInfo?.isExpired}
              />
              <div className="hidden sm:block">
                <SyncStatusIndicator user={user} />
              </div>

              {licenseInfo && (
                <div className={`hidden xl:flex items-center space-x-2 px-3 py-1 rounded-lg ${
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
                <div className="hidden xl:flex items-center space-x-2 px-3 py-1 bg-red-100 text-red-700 rounded-lg">
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
                className="flex items-center space-x-2 px-3 sm:px-4 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors duration-200"
                title="Déconnexion"
              >
                <LogOut className="h-4 w-4" />
                <span className="font-medium hidden sm:inline">Déconnexion</span>
              </button>

              {/* Hamburger - mobile only */}
              <button
                onClick={() => setMobileOpen(true)}
                className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-700"
                aria-label="Ouvrir le menu"
              >
                <Menu className="h-6 w-6" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile drawer overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-50 lg:hidden"
          onClick={() => setMobileOpen(false)}
        >
          <div
            ref={drawerRef}
            className="absolute right-0 top-0 bottom-0 w-72 max-w-[80vw] bg-white shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <Building className="h-8 w-8 text-blue-600" />
                <div>
                  <h2 className="text-lg font-bold text-gray-900">GOBEX</h2>
                  <p className="text-xs text-gray-500">Gestion de Bar</p>
                </div>
              </div>
              <button
                onClick={() => setMobileOpen(false)}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-600"
                aria-label="Fermer le menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* User info */}
            <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-blue-700">
                    {user.username.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{user.username}</p>
                  <p className="text-xs text-gray-500">{user.type}</p>
                </div>
              </div>
              {licenseInfo && (
                <div className={`mt-2 flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-medium ${
                  licenseInfo.isExpired
                    ? 'bg-red-100 text-red-700'
                    : licenseInfo.isExpiring
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-green-100 text-green-700'
                }`}>
                  <Key className="h-3.5 w-3.5" />
                  <span>
                    {licenseInfo.type} - {licenseInfo.isExpired ? 'Expirée' : `${licenseInfo.daysRemaining}j restants`}
                  </span>
                </div>
              )}
            </div>

            {/* Search */}
            <div className="p-4 border-b border-gray-200">
              <GlobalSearch onNavigate={handleModuleChange} />
            </div>

            {/* Menu items - ALL items visible */}
            <div className="flex-1 overflow-y-auto py-2">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const disabled = isDisabled(item.id);
                return (
                  <button
                    key={item.id}
                    onClick={() => handleModuleChange(item.id)}
                    disabled={disabled}
                    className={`w-full flex items-center space-x-3 px-4 py-3 transition-all duration-200 ${
                      currentModule === item.id
                        ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-600'
                        : disabled
                        ? 'text-gray-400 cursor-not-allowed'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="h-5 w-5 flex-shrink-0" />
                    <span className="font-medium text-sm">{item.label}</span>
                    {currentModule === item.id && (
                      <span className="ml-auto w-2 h-2 bg-blue-600 rounded-full" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Sync status */}
            <div className="px-4 py-3 border-t border-gray-200">
              <SyncStatusIndicator user={user} />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Navigation;
