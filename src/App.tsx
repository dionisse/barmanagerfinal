import React, { useState, useEffect } from 'react';
import LandingPage from './components/LandingPage';
import LoginForm from './components/LoginForm';
import RegistrationForm from './components/RegistrationForm';
import PasswordResetForm from './components/PasswordResetForm';
import TrialBanner from './components/TrialBanner';
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
import ClientsModule from './components/ClientsModule';
import PWAInstallPrompt from './components/PWAInstallPrompt';
import { User, UserType, UserLot, License } from './types';
import { checkLicenseExpiration, checkUserLicenseAccess, getUserLots, getLicenses, setReadOnlyMode } from './utils/dataService';
import { enhancedSyncService } from './utils/enhancedSyncService';
import { storageService } from './utils/storageService';
import { indexedDBService } from './utils/indexedDBService';
import { handlePaymentReturn } from './utils/fedapayService';
import {
  startLicenseNotificationWatcher,
  stopLicenseNotificationWatcher
} from './utils/licenseNotificationService';
import { computeTrialStatus } from './utils/trialService';
import { simpleAuth } from './utils/simpleAuthService';

type AuthView = 'landing' | 'login' | 'register' | 'reset';

function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentModule, setCurrentModule] = useState<string>('dashboard');
  const [licenseExpired, setLicenseExpired] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [authView, setAuthView] = useState<AuthView>('landing');
  const [currentUserLot, setCurrentUserLot] = useState<UserLot | null>(null);
  const [currentLicense, setCurrentLicense] = useState<License | null>(null);
  const [isReadOnly, setIsReadOnly] = useState(false);

  useEffect(() => {
    // Retour de paiement FEDAPAY (?fedapay_return=1&id=..&status=..) :
    // vérifie le règlement puis active automatiquement la licence.
    handlePaymentReturn().then((result) => {
      if (result.handled && result.message) {
        console.log('💳 Retour FEDAPAY :', result.message);
        alert(result.message);
        // Recharge pour refléter la licence activée
        window.location.reload();
      }
    });

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
      // Surveillance des échéances de licence (notifications J-7 / J-3 / J-0)
      startLicenseNotificationWatcher(currentUser);
    } else {
      stopLicenseNotificationWatcher();
    }
    return () => stopLicenseNotificationWatcher();
  }, [currentUser]);

  const validateUserSession = async (user: User) => {
    setIsLoading(true);
    
    // Pour le propriétaire, la session est toujours valide
    if (user.type === 'Propriétaire') {
      const ownerUserId = 'owner-001';
      const updatedUser = {
        ...user,
        id: ownerUserId
      };
      setCurrentUser(updatedUser);
      localStorage.setItem('gobex_current_user', JSON.stringify(updatedUser));

      storageService.setUserLotId(null);
      await indexedDBService.setUserLotId(null);
      await indexedDBService.forceMigrationFromLocalStorage();
      enhancedSyncService.startAutoSync(ownerUserId);
      await enhancedSyncService.forceDownloadFromCloud(ownerUserId);
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
        setCurrentUserLot(licenseCheck.userLot as any || null);
        setCurrentLicense(licenseCheck.license as any || null);

        // Vérifie essai
        if (licenseCheck.userLot) {
          const trialStatus = computeTrialStatus(licenseCheck.userLot as any, licenseCheck.license as any);
          setIsReadOnly(trialStatus.isReadOnly);
          setReadOnlyMode(trialStatus.isReadOnly);
        }
        
        // Set storage service user_lot_id for data isolation
        storageService.setUserLotId(userLotId);
        await indexedDBService.setUserLotId(userLotId);
        await indexedDBService.forceMigrationFromLocalStorage();

        // Mettre à jour l'utilisateur dans le localStorage
        localStorage.setItem('gobex_current_user', JSON.stringify(updatedUser));

        // Démarrer la synchronisation automatique avec user_lot_id pour isolation
        enhancedSyncService.startAutoSync(userLotId);

        // Forcer le téléchargement des données depuis le cloud pour assurer la synchronisation
        await enhancedSyncService.forceDownloadFromCloud(userLotId);
      } else {
        // Session invalide, déconnecter l'utilisateur si pas d'essai expiré
        // Si essai expiré, on garde quand même en lecture seule
        const userLot = licenseCheck.userLot;
        if (userLot) {
          const trialStatus = computeTrialStatus(userLot as any, licenseCheck.license as any);
          if (trialStatus.isReadOnly) {
            // Garde session mais en lecture seule
            const updatedUser = {
              ...user,
              userLotId: userLot.id,
              license: licenseCheck.license
            };
            setCurrentUser(updatedUser as any);
            setCurrentUserLot(userLot as any);
            setCurrentLicense(licenseCheck.license as any || null);
            setIsReadOnly(true);
            setReadOnlyMode(true);
            setLicenseExpired(true);
            setIsLoading(false);
            return;
          }
        }
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
      console.log('🔒 App.tsx - Vérification licence propriétaire:', { expired });
      setLicenseExpired(expired);
      setIsReadOnly(false);
      setReadOnlyMode(false);
    } else if (currentUser) {
      // Pour les autres utilisateurs, vérifier leur licence spécifique
      const licenseCheck = await checkUserLicenseAccess(currentUser.username);
      console.log('🔒 App.tsx - Vérification licence utilisateur:', {
        username: currentUser.username,
        hasAccess: licenseCheck.hasAccess,
        message: licenseCheck.message,
        willSetExpiredTo: !licenseCheck.hasAccess
      });

      if (licenseCheck.userLot) {
        setCurrentUserLot(licenseCheck.userLot as any);
        setCurrentLicense(licenseCheck.license as any || null);
        const trialStatus = computeTrialStatus(licenseCheck.userLot as any, licenseCheck.license as any);
        setIsReadOnly(trialStatus.isReadOnly);
        setReadOnlyMode(trialStatus.isReadOnly);
        setLicenseExpired(!licenseCheck.hasAccess || trialStatus.isExpired);
      } else {
        setLicenseExpired(!licenseCheck.hasAccess);
        setIsReadOnly(!licenseCheck.hasAccess);
        setReadOnlyMode(!licenseCheck.hasAccess);
      }
    }
  };

  const handleLogin = async (user: User) => {
    setIsLoading(true);

    try {
      console.log('📝 handleLogin - User:', user);

      // Le propriétaire a un accès complet sans vérification de licence
      if (user.type === 'Propriétaire') {
        console.log('👑 Propriétaire connecté - Accès complet');

        const ownerUserId = 'owner-001';
        user = {
          ...user,
          id: ownerUserId
        };

        storageService.setUserLotId(null);
        await indexedDBService.setUserLotId(null);
        await indexedDBService.forceMigrationFromLocalStorage();
        enhancedSyncService.startAutoSync(ownerUserId);
        await enhancedSyncService.forceDownloadFromCloud(ownerUserId);
        setCurrentUserLot(null);
        setCurrentLicense(null);
        setIsReadOnly(false);
        setReadOnlyMode(false);
      } else {
        // Pour les autres utilisateurs, vérifier la licence
        const licenseCheck = await checkUserLicenseAccess(user.username);
        if (licenseCheck.hasAccess && licenseCheck.userLot) {
          const userLotId = licenseCheck.userLot.id;

          user = {
            ...user,
            license: licenseCheck.license,
            userLotId: userLotId
          };

          storageService.setUserLotId(userLotId);
          await indexedDBService.setUserLotId(userLotId);
          await indexedDBService.forceMigrationFromLocalStorage();
          enhancedSyncService.startAutoSync(userLotId);
          await enhancedSyncService.forceDownloadFromCloud(userLotId);

          setCurrentUserLot(licenseCheck.userLot as any);
          setCurrentLicense(licenseCheck.license as any);

          const trialStatus = computeTrialStatus(licenseCheck.userLot as any, licenseCheck.license as any);
          setIsReadOnly(trialStatus.isReadOnly);
          setReadOnlyMode(trialStatus.isReadOnly);
          setLicenseExpired(trialStatus.isExpired);
        } else if (licenseCheck.userLot) {
          // Essai expiré -> lecture seule
          const trialStatus = computeTrialStatus(licenseCheck.userLot as any, licenseCheck.license as any);
          user = {
            ...user,
            license: licenseCheck.license,
            userLotId: licenseCheck.userLot.id
          };
          setCurrentUserLot(licenseCheck.userLot as any);
          setCurrentLicense(licenseCheck.license as any);
          setIsReadOnly(true);
          setReadOnlyMode(true);
          setLicenseExpired(true);
        }
      }

      setCurrentUser(user);
      localStorage.setItem('gobex_current_user', JSON.stringify(user));
      setAuthView('landing');
    } catch (error) {
      console.error("Erreur lors de la connexion:", error);
      // Afficher un message d'erreur à l'utilisateur
      alert("Erreur lors de la connexion. Vérifiez votre connexion internet ou réessayez plus tard.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    // Arrêter la synchronisation automatique
    enhancedSyncService.stopAutoSync();

    // Reset storage services
    storageService.setUserLotId(null);
    await indexedDBService.setUserLotId(null);

    setCurrentUser(null);
    setCurrentUserLot(null);
    setCurrentLicense(null);
    localStorage.removeItem('gobex_current_user');
    setCurrentModule('dashboard');
    setLicenseExpired(false);
    setIsReadOnly(false);
    setReadOnlyMode(false);
    setAuthView('landing');
  };

  const handleRegistered = async (username: string) => {
    // Après inscription, auto-login
    try {
      // On tente de logger avec le username créé (le password est connu seulement du form, on ne peut pas auto-login sans le demander)
      // Donc on redirige vers login avec message
      setAuthView('login');
      // Petit toast
      setTimeout(() => {
        alert(`✅ Inscription réussie ! Votre identifiant : ${username}\nVous pouvez maintenant vous connecter. 7 jours d'essai gratuit activés.`);
      }, 300);
    } catch (e) {
      setAuthView('login');
    }
  };

  const renderModule = () => {
    if (!currentUser) return null;

    // Restrict access to modules if license expired (except for owner)
    if (licenseExpired && currentUser.type !== 'Propriétaire' && currentModule !== 'dashboard') {
      return <Dashboard user={currentUser} onNavigate={setCurrentModule} />;
    }

    switch (currentModule) {
      case 'dashboard':
        return <Dashboard user={currentUser} onNavigate={setCurrentModule} />;
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
      case 'clients':
        return <ClientsModule user={currentUser} />;
      case 'parametres':
        return <ParametresModule user={currentUser} />;
      default:
        return <Dashboard user={currentUser} onNavigate={setCurrentModule} />;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-cream-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-clay-600 mx-auto mb-4"></div>
          <p className="text-espresso-700 font-medium">Chargement d'AHANDJO…</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    if (authView === 'login') {
      return (
        <>
          <LoginForm
            onLogin={handleLogin}
            onBackToHome={() => setAuthView('landing')}
            onRegister={() => setAuthView('register')}
            onForgotPassword={() => setAuthView('reset')}
          />
          <PWAInstallPrompt />
        </>
      );
    }
    if (authView === 'register') {
      return (
        <>
          <RegistrationForm
            onBackToHome={() => setAuthView('landing')}
            onBackToLogin={() => setAuthView('login')}
            onRegistered={handleRegistered}
          />
          <PWAInstallPrompt />
        </>
      );
    }
    if (authView === 'reset') {
      return (
        <>
          <PasswordResetForm
            onBackToLogin={() => setAuthView('login')}
            onBackToHome={() => setAuthView('landing')}
          />
          <PWAInstallPrompt />
        </>
      );
    }
    return (
      <>
        <LandingPage
          onGetStarted={() => setAuthView('login')}
          onRegister={() => setAuthView('register')}
        />
        <PWAInstallPrompt />
      </>
    );
  }

  return (
    <div className="crm-root min-h-screen bg-cream-100 font-body">
      <Navigation 
        user={currentUser} 
        currentModule={currentModule}
        onModuleChange={setCurrentModule}
        onLogout={handleLogout}
        licenseExpired={licenseExpired}
      />
      <div className="pt-28 md:pt-[104px] px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        {/* Bandeau essai / lecture seule */}
        {currentUser.type !== 'Propriétaire' && (
          <TrialBanner
            user={currentUser}
            userLot={currentUserLot}
            license={currentLicense}
            onLicensePurchased={() => {
              checkLicenseStatus();
            }}
          />
        )}
        {isReadOnly && currentUser.type !== 'Propriétaire' && (
          <div className="mb-4 rounded-lg bg-amber-100 border border-amber-300 px-4 py-2 text-sm text-amber-800">
            🔒 Mode lecture seule actif — vos données sont consultables mais toute modification est bloquée jusqu'au renouvellement de licence. Le système se réactive automatiquement après paiement FEDAPAY.
          </div>
        )}
        {renderModule()}
      </div>
      <PWAInstallPrompt />
    </div>
  );
}

export default App;
