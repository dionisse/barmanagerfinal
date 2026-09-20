import React, { useState, useEffect, useRef } from 'react';
import { User } from '../types';
import {
  Chrome as Home, ShoppingCart, TrendingUp, Package, ChartBar as BarChart3,
  Shield, LogOut, Package2, DollarSign, Settings,
  Key, Users, Menu, X
} from 'lucide-react';
import SyncStatusIndicator from './SyncStatusIndicator';
import NotificationCenter, { GlobalSearch } from './NotificationCenter';
import { Brand } from './Brand';

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
      <nav className="fixed top-0 left-0 right-0 z-50 bg-cream-50/95 backdrop-blur-md shadow-[0_1px_0_rgba(36,23,17,0.06)]">
        {/* liseré kente — signature de la marque */}
        <div className="kente-strip h-[3px]" aria-hidden="true" />

        {/* Row 1: logo + contrôles à droite */}
        <div className="w-full px-3 sm:px-4 lg:px-6">
          <div className="flex items-center justify-between gap-2 h-14">
            {/* Logo */}
            <Brand compact className="flex-shrink-0" />

            {/* Contrôles à droite */}
            <div className="flex items-center space-x-2 sm:space-x-3">
              <div className="hidden md:block">
                <SyncStatusIndicator user={user} />
              </div>

              {licenseInfo && (
                <div className={`hidden lg:flex items-center space-x-1.5 px-2.5 py-1 rounded-lg ${
                  licenseInfo.isExpired
                    ? 'bg-red-100 text-red-700'
                    : licenseInfo.isExpiring
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-green-100 text-green-700'
                }`}>
                  <Key className="h-3.5 w-3.5" />
                  <span className="text-xs font-medium whitespace-nowrap">
                    {licenseInfo.type} - {
                      licenseInfo.isExpired
                        ? 'Expirée'
                        : `${licenseInfo.daysRemaining}j`
                    }
                  </span>
                </div>
              )}

              <div className="hidden sm:flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-clay-500 to-gold-500 flex items-center justify-center flex-shrink-0 shadow-warm">
                  <span className="text-sm font-bold text-white">
                    {user.username.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-espresso-900 leading-tight">{user.username}</p>
                  <p className="text-xs text-espresso-400 leading-tight">{user.type}</p>
                </div>
              </div>

              <button
                onClick={onLogout}
                className="flex items-center space-x-1.5 px-2.5 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors duration-200"
                title="Déconnexion"
              >
                <LogOut className="h-4 w-4" />
                <span className="font-medium text-sm hidden sm:inline">Déconnexion</span>
              </button>

              {/* Hamburger - mobile uniquement */}
              <button
                onClick={() => setMobileOpen(true)}
                className="md:hidden p-2 rounded-lg hover:bg-cream-200 transition-colors text-espresso-700"
                aria-label="Ouvrir le menu"
              >
                <Menu className="h-6 w-6" />
              </button>
            </div>
          </div>
        </div>

        {/* Row 2: recherche + menu centré + notifications (desktop/tablette) */}
        <div className="hidden md:block border-t border-espresso-900/8 bg-cream-100/60">
          <div className="w-full px-3 lg:px-6">
            <div className="flex items-center gap-3 py-1.5">
              {/* Menu centré */}
              <div className="flex-1 flex justify-center overflow-x-auto scrollbar-thin">
                <div className="flex items-center gap-1">
                  {menuItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = currentModule === item.id;
                    const disabled = isDisabled(item.id);
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleModuleChange(item.id)}
                        disabled={disabled}
                        title={item.label}
                        className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition-all duration-200 whitespace-nowrap flex-shrink-0 ${
                          isActive
                            ? 'bg-clay-600 text-white shadow-warm'
                            : disabled
                            ? 'text-gray-400 cursor-not-allowed'
                            : 'text-espresso-600 hover:text-espresso-900 hover:bg-cream-200'
                        }`}
                      >
                        <Icon className="h-4 w-4 flex-shrink-0" />
                        <span className="font-medium text-sm">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Notifications + Recherche - à droite */}
              <div className="flex-shrink-0 flex items-center gap-2">
                <NotificationCenter
                  onNavigate={handleModuleChange}
                  licenseDaysRemaining={licenseInfo?.daysRemaining}
                  licenseExpired={licenseInfo?.isExpired}
                />
                <GlobalSearch onNavigate={handleModuleChange} />
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Drawer mobile */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-50 lg:hidden"
          onClick={() => setMobileOpen(false)}
        >
          <div
            ref={drawerRef}
            className="absolute right-0 top-0 bottom-0 w-72 max-w-[80vw] bg-cream-50 shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* En-tête du drawer */}
            <div className="relative flex items-center justify-between p-4 border-b border-espresso-900/10">
              <div className="kente-strip absolute top-0 inset-x-0 h-[3px]" aria-hidden="true" />
              <Brand compact />
              <button
                onClick={() => setMobileOpen(false)}
                className="p-2 rounded-lg hover:bg-cream-200 transition-colors text-espresso-600"
                aria-label="Fermer le menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Infos utilisateur */}
            <div className="px-4 py-3 border-b border-espresso-900/10 bg-cream-100">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-clay-500 to-gold-500 flex items-center justify-center flex-shrink-0 shadow-warm">
                  <span className="text-sm font-bold text-white">
                    {user.username.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-espresso-900 truncate">{user.username}</p>
                  <p className="text-xs text-espresso-400">{user.type}</p>
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

            {/* Recherche */}
            <div className="p-4 border-b border-espresso-900/10">
              <GlobalSearch onNavigate={handleModuleChange} />
            </div>

            {/* Éléments de menu - TOUS visibles */}
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
                        ? 'bg-clay-100 text-clay-700 border-r-2 border-clay-600'
                        : disabled
                        ? 'text-gray-400 cursor-not-allowed'
                        : 'text-espresso-700 hover:bg-cream-200'
                    }`}
                  >
                    <Icon className="h-5 w-5 flex-shrink-0" />
                    <span className="font-medium text-sm">{item.label}</span>
                    {currentModule === item.id && (
                      <span className="ml-auto w-2 h-2 bg-clay-600 rounded-full" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Statut de synchronisation */}
            <div className="px-4 py-3 border-t border-espresso-900/10">
              <SyncStatusIndicator user={user} />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Navigation;
