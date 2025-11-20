import React, { useState, useEffect } from 'react';
import LoginForm from './components/LoginForm';
import Dashboard from './components/Dashboard';
import Navigation from './components/Navigation';
import AchatsModule from './components/AchatsModule';
import VentesModule from './components/VentesModule';
import StocksModule from './components/StocksModule';
import RapportsModule from './components/RapportsModule';
import LicencesModule from './components/LicencesModule';
import EmballagesModule from './components/EmbballagesModule';
import DepensesModule from './components/DepensesModule';
import ParametresModule from './components/ParametresModule';
import PWAInstallPrompt from './components/PWAInstallPrompt';
import { User, UserType } from './types';
import { checkLicenseExpiration, checkUserLicenseAccess } from './utils/dataService';
import { enhancedSyncService } from './utils/enhancedSyncService';
import { storageService } from './utils/storageService';

function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentModule, setCurrentModule] = useState<string>('dashboard');
  const [licenseExpired, setLicenseExpired] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing session
    const savedUser = localStorage.getItem('gobex_current_user');
    if (savedUser) {
      const user = JSON.parse(savedUser);
      // Vérifier que la session est toujours valide
      validateUserSession(user);
    } else {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Check license status when user logs in
    if (currentUser) {
      checkLicenseStatus();
    }
  }, [currentUser]);

  const validateUserSession = async (user: User) => {
    setIsLoading(true);
    
    // Pour le propriétaire, la session est toujours valide
    if (user.type === 'Propriétaire') {
      setCurrentUser(user);
      setIsLoading(false);
      return;
    }

    // Pour les autres utilisateurs, vérifier la licence
    try {
      const licenseCheck = await checkUserLicenseAccess(user.username);
      if (licenseCheck.hasAccess) {
        // Reconstruire l'ID utilisateur pour s'assurer qu'il est au format correct
        const userLotId = licenseCheck.userLot?.id;
        const userType = user.type.toLowerCase();
        // Convertir "Employé" en "employe" pour éviter les problèmes d'encodage
        const normalizedUserType = userType === 'employé' ? 'employe' : userType;
        const correctUserId = `${userLotId}_${normalizedUserType}`;
        
        // Mettre à jour les informations de licence dans l'objet utilisateur
        const updatedUser = {
          ...user,
          id: correctUserId, // Utiliser l'ID correctement formaté
          license: licenseCheck.license,
          userLotId: licenseCheck.userLot?.id
        };
        setCurrentUser(updatedUser);
        
        // Set storage service user_lot_id for data isolation
        storageService.setUserLotId(userLotId);

        // Mettre à jour l'utilisateur dans le localStorage
        localStorage.setItem('gobex_current_user', JSON.stringify(updatedUser));

        // Démarrer la synchronisation automatique avec user_lot_id pour isolation
        enhancedSyncService.startAutoSync(userLotId);
      } else {
        // Session invalide, déconnecter l'utilisateur
        handleLogout();
      }
    } catch (error) {
      console.error("Erreur lors de la validation de session:", error);
      // En cas d'erreur, on garde l'utilisateur connecté mais on affiche un avertissement
      setCurrentUser(user);
    } finally {
      setIsLoading(false);
    }
  };

  const checkLicenseStatus = async () => {
    if (currentUser?.type === 'Propriétaire') {
      // Pour le propriétaire, vérifier l'état général des licences
      const { expired } = await checkLicenseExpiration();
      setLicenseExpired(expired);
    } else if (currentUser) {
      // Pour les autres utilisateurs, vérifier leur licence spécifique
      const licenseCheck = await checkUserLicenseAccess(currentUser.username);
      setLicenseExpired(!licenseCheck.hasAccess);
    }
  };

  const handleLogin = async (user: User) => {
    setIsLoading(true);
    
    try {
      // Si ce n'est pas le propriétaire, vérifier et enrichir les données utilisateur
      if (user.type !== 'Propriétaire') {
        const licenseCheck = await checkUserLicenseAccess(user.username);
        if (licenseCheck.hasAccess) {
          // Reconstruire l'ID utilisateur pour s'assurer qu'il est au format correct
          const userLotId = licenseCheck.userLot?.id;
          const userType = user.type.toLowerCase();
          // Convertir "Employé" en "employe" pour éviter les problèmes d'encodage
          const normalizedUserType = userType === 'employé' ? 'employe' : userType;
          const correctUserId = `${userLotId}_${normalizedUserType}`;
          
          user = {
            ...user,
            id: correctUserId, // Utiliser l'ID correctement formaté
            license: licenseCheck.license,
            userLotId: licenseCheck.userLot?.id
          };
          
          // Set storage service user_lot_id for data isolation
          storageService.setUserLotId(userLotId);

          // Démarrer la synchronisation automatique avec user_lot_id pour isolation
          enhancedSyncService.startAutoSync(userLotId);

          // Essayer de récupérer les données depuis le cloud avec user_lot_id
          await enhancedSyncService.forceDownloadFromCloud(userLotId);
        }
      }
      
      // Set storage service user_lot_id (for owner, use null)
      if (user.type === 'Propriétaire') {
        storageService.setUserLotId(null);
      }

      setCurrentUser(user);
      localStorage.setItem('gobex_current_user', JSON.stringify(user));
    } catch (error) {
      console.error("Erreur lors de la connexion:", error);
      // Afficher un message d'erreur à l'utilisateur
      alert("Erreur lors de la connexion. Vérifiez votre connexion internet ou réessayez plus tard.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    // Arrêter la synchronisation automatique
    enhancedSyncService.stopAutoSync();

    // Reset storage service
    storageService.setUserLotId(null);

    setCurrentUser(null);
    localStorage.removeItem('gobex_current_user');
    setCurrentModule('dashboard');
    setLicenseExpired(false);
  };

  const renderModule = () => {
    if (!currentUser) return null;

    // Restrict access to modules if license expired (except for owner)
    if (licenseExpired && currentUser.type !== 'Propriétaire' && currentModule !== 'dashboard') {
      return <Dashboard user={currentUser} />;
    }

    switch (currentModule) {
      case 'dashboard':
        return <Dashboard user={currentUser} />;
      case 'achats':
        return <AchatsModule user={currentUser} />;
      case 'ventes':
        return <VentesModule user={currentUser} />;
      case 'stocks':
        return <StocksModule user={currentUser} />;
      case 'rapports':
        return <RapportsModule user={currentUser} />;
      case 'licences':
        return currentUser.type === 'Propriétaire' ? <LicencesModule user={currentUser} /> : <Dashboard user={currentUser} />;
      case 'emballages':
        return <EmballagesModule user={currentUser} />;
      case 'depenses':
        return <DepensesModule user={currentUser} />;
      case 'parametres':
        return <ParametresModule user={currentUser} />;
      default:
        return <Dashboard user={currentUser} />;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement de GOBEX...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <>
        <LoginForm onLogin={handleLogin} />
        <PWAInstallPrompt />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation 
        user={currentUser} 
        currentModule={currentModule}
        onModuleChange={setCurrentModule}
        onLogout={handleLogout}
        licenseExpired={licenseExpired}
      />
      <div className="pt-16">
        {renderModule()}
      </div>
      <PWAInstallPrompt />
    </div>
  );
}

export default App;