import React, { useState, useEffect } from 'react';
import { User, License, LicenseSettings, UserLot } from '../types';
import { Shield, Users, Calendar, Key, AlertTriangle, Clock, CheckCircle, XCircle, UserPlus, Package, Zap } from 'lucide-react';
import { getLicenses, addLicense, updateLicense, checkLicenseExpiration, getUserLots, addUserLot, updateUserLot, deleteUserLot } from '../utils/dataService';
import { simpleAuth } from '../utils/simpleAuthService';

interface LicencesModuleProps {
  user: User;
}

const LicencesModule: React.FC<LicencesModuleProps> = ({ user }) => {
  const [licenses, setLicenses] = useState<License[]>([]);
  const [userLots, setUserLots] = useState<UserLot[]>([]);
  const [showAddUserLot, setShowAddUserLot] = useState(false);
  const [showLicenseForm, setShowLicenseForm] = useState(false);
  const [licenseExpired, setLicenseExpired] = useState(false);
  const [expirationWarning, setExpirationWarning] = useState<string | null>(null);
  const [newUserLot, setNewUserLot] = useState({
    gestionnaire: { username: '', password: '' },
    employe: { username: '', password: '' }
  });
  const [newLicense, setNewLicense] = useState({
    type: 'Kpêvi' as 'Kpêvi' | 'Kléoun' | 'Agbon' | 'Baba',
    userLotId: ''
  });
  const [showQuickCreate, setShowQuickCreate] = useState(false);
  const [quickCreate, setQuickCreate] = useState({
    gestionnaireUsername: '',
    gestionnairePassword: '',
    employeUsername: '',
    employePassword: '',
    licenseType: 'Kpêvi' as 'Kpêvi' | 'Kléoun' | 'Agbon' | 'Baba'
  });
  const [creating, setCreating] = useState(false);

  const licenseSettings: LicenseSettings = {
    Kpêvi: { duree: 1, prix: 15000 },
    Kléoun: { duree: 3, prix: 40000 },
    Agbon: { duree: 6, prix: 70000 },
    Baba: { duree: 12, prix: 120000 }
  };

  useEffect(() => {
    if (user.type === 'Propriétaire') {
      loadData();
      checkLicenseStatus();
    }
  }, [user]);

  const loadData = async () => {
    const licensesData = await getLicenses();
    const userLotsData = await getUserLots();
    
    // Associer les lots d'utilisateurs aux licences
    const licensesWithUserLots = licensesData.map(license => ({
      ...license,
      userLot: userLotsData.find(lot => lot.id === license.userLotId)
    }));
    
    setLicenses(licensesWithUserLots);
    setUserLots(userLotsData);
  };

  const checkLicenseStatus = async () => {
    const { expired, warning } = await checkLicenseExpiration();
    setLicenseExpired(expired);
    setExpirationWarning(warning);
  };

  const generateLicenseKey = (): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 16; i++) {
      if (i > 0 && i % 4 === 0) result += '-';
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const handleAddUserLot = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Vérifier que les noms d'utilisateur sont uniques
    const existingUsers = JSON.parse(localStorage.getItem('gobex_users') || '[]');
    const allUsernames = [
      ...existingUsers.map((u: any) => u.username),
      ...userLots.flatMap(lot => [lot.gestionnaire.username, lot.employe.username])
    ];
    
    if (allUsernames.includes(newUserLot.gestionnaire.username)) {
      alert('Le nom d\'utilisateur du gestionnaire existe déjà');
      return;
    }
    
    if (allUsernames.includes(newUserLot.employe.username)) {
      alert('Le nom d\'utilisateur de l\'employé existe déjà');
      return;
    }

    const userLot: UserLot = {
      id: Date.now().toString(),
      gestionnaire: newUserLot.gestionnaire,
      employe: newUserLot.employe,
      dateCreation: new Date().toISOString(),
      status: 'active'
    };

    await addUserLot(userLot);
    setNewUserLot({
      gestionnaire: { username: '', password: '' },
      employe: { username: '', password: '' }
    });
    setShowAddUserLot(false);
    loadData();
  };

  const handleQuickCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);

    try {
      const settings = licenseSettings[quickCreate.licenseType];

      const result = await simpleAuth.createUserLotWithLicense(
        quickCreate.gestionnaireUsername,
        quickCreate.gestionnairePassword,
        quickCreate.employeUsername,
        quickCreate.employePassword,
        quickCreate.licenseType,
        settings.duree,
        settings.prix
      );

      if (result.success) {
        alert('✅ Utilisateurs et licence créés avec succès!');
        setQuickCreate({
          gestionnaireUsername: '',
          gestionnairePassword: '',
          employeUsername: '',
          employePassword: '',
          licenseType: 'Kpêvi'
        });
        setShowQuickCreate(false);
        loadData();
      } else {
        alert('❌ Erreur: ' + (result.message || 'Échec de la création'));
      }
    } catch (error) {
      alert('❌ Erreur: ' + error.message);
    } finally {
      setCreating(false);
    }
  };

  const handleAddLicense = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newLicense.userLotId) {
      alert('Veuillez sélectionner un lot d\'utilisateurs');
      return;
    }

    // Vérifier qu'aucune licence active n'est déjà associée à ce lot
    const existingLicense = licenses.find(l => 
      l.userLotId === newLicense.userLotId && 
      l.active && 
      getLicenseStatus(l) !== 'expired'
    );
    
    if (existingLicense) {
      alert('Ce lot d\'utilisateurs a déjà une licence active');
      return;
    }
    
    const settings = licenseSettings[newLicense.type];
    const dateDebut = new Date();
    const dateFin = new Date();
    dateFin.setMonth(dateFin.getMonth() + settings.duree);

    const license: License = {
      id: Date.now().toString(),
      type: newLicense.type,
      duree: settings.duree,
      prix: settings.prix,
      dateDebut: dateDebut.toISOString().split('T')[0],
      dateFin: dateFin.toISOString().split('T')[0],
      cle: generateLicenseKey(),
      active: true,
      userLotId: newLicense.userLotId
    };

    console.log('🔑 Création licence:', {
      type: license.type,
      dateDebut: license.dateDebut,
      dateFin: license.dateFin,
      duree: settings.duree + ' mois',
      dateDebutObj: dateDebut,
      dateFinObj: dateFin
    });

    await addLicense(license);
    
    // Activer les utilisateurs du lot dans le système
    const selectedUserLot = userLots.find(lot => lot.id === newLicense.userLotId);
    if (selectedUserLot) {
      const existingUsers = JSON.parse(localStorage.getItem('gobex_users') || '[]');
      
      const gestionnaireUser = {
        id: Date.now().toString() + '_gestionnaire',
        username: selectedUserLot.gestionnaire.username,
        password: selectedUserLot.gestionnaire.password,
        type: 'Gestionnaire',
        dateCreation: new Date().toISOString(),
        status: 'active'
      };
      
      const employeUser = {
        id: Date.now().toString() + '_employe',
        username: selectedUserLot.employe.username,
        password: selectedUserLot.employe.password,
        type: 'Employé',
        dateCreation: new Date().toISOString(),
        status: 'active'
      };
      
      const updatedUsers = [...existingUsers, gestionnaireUser, employeUser];
      localStorage.setItem('gobex_users', JSON.stringify(updatedUsers));
    }

    setNewLicense({ type: 'Kpêvi', userLotId: '' });
    setShowLicenseForm(false);
    loadData();
    checkLicenseStatus();
  };

  const toggleUserLotStatus = async (userLotId: string) => {
    const userLot = userLots.find(lot => lot.id === userLotId);
    if (!userLot) return;

    const updatedUserLot = {
      ...userLot,
      status: userLot.status === 'active' ? 'suspended' : 'active'
    };

    await updateUserLot(updatedUserLot);
    
    // Mettre à jour le statut des utilisateurs dans le système
    const existingUsers = JSON.parse(localStorage.getItem('gobex_users') || '[]');
    const updatedUsers = existingUsers.map((u: any) => {
      if (u.username === userLot.gestionnaire.username || u.username === userLot.employe.username) {
        return { ...u, status: updatedUserLot.status };
      }
      return u;
    });
    localStorage.setItem('gobex_users', JSON.stringify(updatedUsers));
    
    loadData();
  };

  const deleteUserLotAndUsers = async (userLotId: string) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce lot d\'utilisateurs ? Cela supprimera aussi leurs comptes utilisateur.')) {
      return;
    }

    const userLot = userLots.find(lot => lot.id === userLotId);
    if (!userLot) return;

    // Supprimer les utilisateurs du système
    const existingUsers = JSON.parse(localStorage.getItem('gobex_users') || '[]');
    const updatedUsers = existingUsers.filter((u: any) => 
      u.username !== userLot.gestionnaire.username && 
      u.username !== userLot.employe.username
    );
    localStorage.setItem('gobex_users', JSON.stringify(updatedUsers));

    // Désactiver les licences associées
    const associatedLicenses = licenses.filter(l => l.userLotId === userLotId);
    for (const license of associatedLicenses) {
      await updateLicense({ ...license, active: false });
    }

    // Supprimer le lot d'utilisateurs
    await deleteUserLot(userLotId);
    loadData();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-100';
      case 'expired': return 'text-red-600 bg-red-100';
      case 'warning': return 'text-amber-600 bg-amber-100';
      case 'suspended': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'expired': return <XCircle className="h-5 w-5 text-red-600" />;
      case 'warning': return <AlertTriangle className="h-5 w-5 text-amber-600" />;
      case 'suspended': return <XCircle className="h-5 w-5 text-gray-600" />;
      default: return <Shield className="h-5 w-5 text-gray-600" />;
    }
  };

  const getLicenseStatus = (license: License) => {
    // Normaliser les dates à minuit pour comparer uniquement les jours
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const endDate = new Date(license.dateFin);
    endDate.setHours(23, 59, 59, 999); // Fin de journée pour la date de fin

    const daysUntilExpiry = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    console.log(`🔍 Vérification licence ${license.type}:`, {
      dateFin: license.dateFin,
      today: today.toISOString(),
      endDate: endDate.toISOString(),
      daysUntilExpiry,
      status: daysUntilExpiry < 0 ? 'expired' : daysUntilExpiry <= 7 ? 'warning' : 'active'
    });

    if (daysUntilExpiry < 0) return 'expired';
    if (daysUntilExpiry <= 7) return 'warning';
    return 'active';
  };

  const activeLicenses = licenses.filter(l => l.active && getLicenseStatus(l) !== 'expired');
  const availableUserLots = userLots.filter(lot => 
    !licenses.some(l => l.userLotId === lot.id && l.active && getLicenseStatus(l) !== 'expired')
  );

  // Restrict access if license expired and user is not owner
  if (licenseExpired && user.type !== 'Propriétaire') {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center">
          <XCircle className="mx-auto h-16 w-16 text-red-600 mb-4" />
          <h2 className="text-2xl font-bold text-red-800 mb-4">Licence Expirée</h2>
          <p className="text-red-700 mb-6">
            Votre licence GOBEX a expiré. Veuillez contacter le propriétaire pour renouveler votre abonnement.
          </p>
          <div className="bg-white p-4 rounded-lg border border-red-200">
            <p className="text-sm text-gray-600">
              Pour renouveler votre licence, contactez le propriétaire du système.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Only allow owner to access this module
  if (user.type !== 'Propriétaire') {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-8 text-center">
          <Shield className="mx-auto h-16 w-16 text-amber-600 mb-4" />
          <h2 className="text-2xl font-bold text-amber-800 mb-4">Accès Restreint</h2>
          <p className="text-amber-700">
            Seul le propriétaire peut accéder à la gestion des licences.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Gestion des Licences</h1>
        <p className="text-gray-600 mt-2">Gérez les licences système et les lots d'utilisateurs</p>
      </div>

      {expirationWarning && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 mb-8">
          <div className="flex items-center space-x-3">
            <AlertTriangle className="h-6 w-6 text-amber-600" />
            <div>
              <h3 className="text-lg font-semibold text-amber-800">Attention</h3>
              <p className="text-amber-700">{expirationWarning}</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          {/* User Lots Section */}
          <div className="bg-white rounded-xl shadow-lg mb-8">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <UserPlus className="h-6 w-6 text-purple-600" />
                  <h2 className="text-xl font-semibold text-gray-900">Lots d'Utilisateurs</h2>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowQuickCreate(true)}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm flex items-center gap-2"
                  >
                    <Zap className="h-4 w-4" />
                    Création Rapide
                  </button>
                  <button
                    onClick={() => setShowAddUserLot(true)}
                    className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors text-sm"
                  >
                    Nouveau Lot
                  </button>
                </div>
              </div>
            </div>

            <div className="p-6">
              <div className="space-y-4">
                {userLots.map((userLot) => (
                  <div key={userLot.id} className="border border-gray-200 rounded-lg p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="bg-blue-50 p-4 rounded-lg">
                            <h4 className="font-semibold text-blue-900 mb-2">👨‍💼 Gestionnaire</h4>
                            <p className="text-blue-800">
                              <strong>Utilisateur:</strong> {userLot.gestionnaire.username}
                            </p>
                            <p className="text-blue-700 text-sm mt-1">
                              Accès complet aux modules de gestion
                            </p>
                          </div>
                          
                          <div className="bg-green-50 p-4 rounded-lg">
                            <h4 className="font-semibold text-green-900 mb-2">👤 Employé</h4>
                            <p className="text-green-800">
                              <strong>Utilisateur:</strong> {userLot.employe.username}
                            </p>
                            <p className="text-green-700 text-sm mt-1">
                              Accès aux ventes et stocks
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-4 mt-4">
                          <div className="flex items-center space-x-2">
                            <Calendar className="h-4 w-4 text-gray-400" />
                            <span className="text-sm text-gray-600">
                              Créé le {new Date(userLot.dateCreation).toLocaleDateString('fr-FR')}
                            </span>
                          </div>
                          
                          {/* Afficher la licence associée */}
                          {licenses.find(l => l.userLotId === userLot.id && l.active) && (
                            <div className="flex items-center space-x-2">
                              <Key className="h-4 w-4 text-blue-400" />
                              <span className="text-sm text-blue-600 font-medium">
                                Licence: {licenses.find(l => l.userLotId === userLot.id && l.active)?.type}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex flex-col items-end space-y-2">
                        <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getStatusColor(userLot.status)}`}>
                          {userLot.status === 'active' ? 'Actif' : 'Suspendu'}
                        </span>
                        
                        <div className="flex space-x-2">
                          <button
                            onClick={() => toggleUserLotStatus(userLot.id)}
                            className={`px-3 py-1 rounded text-xs font-medium ${
                              userLot.status === 'active' 
                                ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' 
                                : 'bg-green-100 text-green-700 hover:bg-green-200'
                            }`}
                          >
                            {userLot.status === 'active' ? 'Suspendre' : 'Activer'}
                          </button>
                          <button
                            onClick={() => deleteUserLotAndUsers(userLot.id)}
                            className="px-3 py-1 bg-red-100 text-red-700 rounded text-xs font-medium hover:bg-red-200"
                          >
                            Supprimer
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                
                {userLots.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <UserPlus className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <p>Aucun lot d'utilisateurs créé</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Licenses Section */}
          <div className="bg-white rounded-xl shadow-lg">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Key className="h-6 w-6 text-blue-600" />
                  <h2 className="text-xl font-semibold text-gray-900">Licences Actives</h2>
                </div>
                <button
                  onClick={() => setShowLicenseForm(true)}
                  disabled={availableUserLots.length === 0}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Nouvelle Licence
                </button>
              </div>
            </div>
            
            <div className="p-6">
              <div className="space-y-6">
                {licenses.map((license) => {
                  const status = getLicenseStatus(license);
                  return (
                    <div key={license.id} className="border border-gray-200 rounded-lg p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-4">
                          {getStatusIcon(status)}
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <h3 className="text-lg font-semibold text-gray-900">{license.type}</h3>
                              <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getStatusColor(status)}`}>
                                {status === 'active' && 'Actif'}
                                {status === 'expired' && 'Expiré'}
                                {status === 'warning' && 'Expire Bientôt'}
                              </span>
                            </div>
                            
                            <p className="text-gray-600 mb-3">
                              Durée: {license.duree} mois - Prix: {license.prix.toLocaleString()} FCFA
                            </p>
                            
                            {/* Afficher les utilisateurs associés */}
                            {license.userLot && (
                              <div className="bg-gray-50 p-4 rounded-lg mb-3">
                                <h4 className="font-medium text-gray-900 mb-2">👥 Utilisateurs associés:</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  <div className="flex items-center space-x-2">
                                    <span className="text-blue-600 font-medium">Gestionnaire:</span>
                                    <span className="text-gray-800">{license.userLot.gestionnaire.username}</span>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <span className="text-green-600 font-medium">Employé:</span>
                                    <span className="text-gray-800">{license.userLot.employe.username}</span>
                                  </div>
                                </div>
                              </div>
                            )}
                            
                            <div className="flex items-center space-x-4 mb-3">
                              <div className="flex items-center space-x-2">
                                <Calendar className="h-4 w-4 text-gray-400" />
                                <span className="text-sm text-gray-600">
                                  Du {new Date(license.dateDebut).toLocaleDateString('fr-FR')} au {new Date(license.dateFin).toLocaleDateString('fr-FR')}
                                </span>
                              </div>
                            </div>
                            
                            <div>
                              <span className="text-xs text-gray-500">Clé: </span>
                              <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono">
                                {license.cle}
                              </code>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                
                {licenses.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Key className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <p>Aucune licence générée</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Tarifs des Licences</h3>
            <div className="space-y-4">
              {Object.entries(licenseSettings).map(([type, settings]) => (
                <div key={type} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="font-semibold text-gray-900">{type}</h4>
                      <p className="text-sm text-gray-600">{settings.duree} mois</p>
                      <p className="text-xs text-gray-500 mt-1">1 Gestionnaire + 1 Employé</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-blue-600">{settings.prix.toLocaleString()} FCFA</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Informations Système</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Version:</span>
                <span className="font-semibold">GOBEX v2.0.1</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Licences Actives:</span>
                <span className="font-semibold text-green-600">
                  {activeLicenses.length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Lots d'Utilisateurs:</span>
                <span className="font-semibold">{userLots.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Utilisateurs Actifs:</span>
                <span className="font-semibold">{userLots.filter(lot => lot.status === 'active').length * 2}</span>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl p-6 text-white">
            <h3 className="text-lg font-semibold mb-3">💡 Comment ça marche</h3>
            <div className="space-y-2 text-blue-100 text-sm">
              <p><strong>1.</strong> Créez un lot d'utilisateurs (1 gestionnaire + 1 employé)</p>
              <p><strong>2.</strong> Générez une licence et associez-la au lot</p>
              <p><strong>3.</strong> Les utilisateurs peuvent se connecter avec leurs identifiants</p>
              <p><strong>4.</strong> La licence contrôle l'accès selon sa durée</p>
            </div>
          </div>
        </div>
      </div>

      {/* Add User Lot Modal */}
      {showQuickCreate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-green-600 to-emerald-600">
              <div className="flex items-center gap-3">
                <Zap className="h-8 w-8 text-white" />
                <div>
                  <h2 className="text-2xl font-bold text-white">Création Rapide</h2>
                  <p className="text-green-100 text-sm">Créez 2 utilisateurs + licence en une seule étape</p>
                </div>
              </div>
            </div>
            <form onSubmit={handleQuickCreate} className="p-6 space-y-6">
              <div className="bg-blue-50 p-5 rounded-lg border-2 border-blue-200">
                <h3 className="font-bold text-blue-900 mb-4 flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Gestionnaire
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nom d'utilisateur
                    </label>
                    <input
                      type="text"
                      value={quickCreate.gestionnaireUsername}
                      onChange={(e) => setQuickCreate({ ...quickCreate, gestionnaireUsername: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                      placeholder="Ex: manager1"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Mot de passe
                    </label>
                    <input
                      type="password"
                      value={quickCreate.gestionnairePassword}
                      onChange={(e) => setQuickCreate({ ...quickCreate, gestionnairePassword: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                      placeholder="Mot de passe sécurisé"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-green-50 p-5 rounded-lg border-2 border-green-200">
                <h3 className="font-bold text-green-900 mb-4 flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Employé
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nom d'utilisateur
                    </label>
                    <input
                      type="text"
                      value={quickCreate.employeUsername}
                      onChange={(e) => setQuickCreate({ ...quickCreate, employeUsername: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      required
                      placeholder="Ex: employe1"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Mot de passe
                    </label>
                    <input
                      type="password"
                      value={quickCreate.employePassword}
                      onChange={(e) => setQuickCreate({ ...quickCreate, employePassword: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      required
                      placeholder="Mot de passe sécurisé"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-5 rounded-lg border-2 border-purple-200">
                <h3 className="font-bold text-purple-900 mb-4 flex items-center gap-2">
                  <Key className="h-5 w-5" />
                  Type de Licence
                </h3>
                <select
                  value={quickCreate.licenseType}
                  onChange={(e) => setQuickCreate({ ...quickCreate, licenseType: e.target.value as any })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent font-medium"
                >
                  <option value="Kpêvi">Kpêvi - 1 mois - 15,000 FCFA</option>
                  <option value="Kléoun">Kléoun - 3 mois - 40,000 FCFA</option>
                  <option value="Agbon">Agbon - 6 mois - 70,000 FCFA</option>
                  <option value="Baba">Baba - 12 mois - 120,000 FCFA</option>
                </select>
                <p className="text-xs text-gray-600 mt-2">
                  ✨ La licence sera automatiquement activée pour ces utilisateurs
                </p>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowQuickCreate(false)}
                  className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  disabled={creating}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-8 py-2 rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all font-semibold flex items-center gap-2 disabled:opacity-50"
                  disabled={creating}
                >
                  {creating ? (
                    <>
                      <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                      Création...
                    </>
                  ) : (
                    <>
                      <Zap className="h-4 w-4" />
                      Créer Tout
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAddUserLot && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Nouveau Lot d'Utilisateurs</h2>
              <p className="text-sm text-gray-600 mt-1">Créez un gestionnaire et un employé</p>
            </div>
            <form onSubmit={handleAddUserLot} className="p-6 space-y-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-semibold text-blue-900 mb-3">👨‍💼 Gestionnaire</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nom d'utilisateur
                    </label>
                    <input
                      type="text"
                      value={newUserLot.gestionnaire.username}
                      onChange={(e) => setNewUserLot({
                        ...newUserLot,
                        gestionnaire: { ...newUserLot.gestionnaire, username: e.target.value }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Mot de passe
                    </label>
                    <input
                      type="password"
                      value={newUserLot.gestionnaire.password}
                      onChange={(e) => setNewUserLot({
                        ...newUserLot,
                        gestionnaire: { ...newUserLot.gestionnaire, password: e.target.value }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="font-semibold text-green-900 mb-3">👤 Employé</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nom d'utilisateur
                    </label>
                    <input
                      type="text"
                      value={newUserLot.employe.username}
                      onChange={(e) => setNewUserLot({
                        ...newUserLot,
                        employe: { ...newUserLot.employe, username: e.target.value }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Mot de passe
                    </label>
                    <input
                      type="password"
                      value={newUserLot.employe.password}
                      onChange={(e) => setNewUserLot({
                        ...newUserLot,
                        employe: { ...newUserLot.employe, password: e.target.value }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddUserLot(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  Créer le Lot
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add License Modal */}
      {showLicenseForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Nouvelle Licence</h2>
            </div>
            <form onSubmit={handleAddLicense} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Lot d'utilisateurs
                </label>
                <select
                  value={newLicense.userLotId}
                  onChange={(e) => setNewLicense({ ...newLicense, userLotId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Sélectionner un lot</option>
                  {availableUserLots.map(lot => (
                    <option key={lot.id} value={lot.id}>
                      {lot.gestionnaire.username} + {lot.employe.username}
                    </option>
                  ))}
                </select>
                {availableUserLots.length === 0 && (
                  <p className="text-sm text-amber-600 mt-1">
                    Tous les lots ont déjà une licence active
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Type de licence
                </label>
                <select
                  value={newLicense.type}
                  onChange={(e) => setNewLicense({ ...newLicense, type: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {Object.entries(licenseSettings).map(([type, settings]) => (
                    <option key={type} value={type}>
                      {type} - {settings.duree} mois - {settings.prix.toLocaleString()} FCFA
                    </option>
                  ))}
                </select>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-semibold text-blue-800 mb-2">Détails de la licence:</h4>
                <div className="space-y-1 text-sm text-blue-700">
                  <p>Durée: {licenseSettings[newLicense.type].duree} mois</p>
                  <p>Prix: {licenseSettings[newLicense.type].prix.toLocaleString()} FCFA</p>
                  <p>Utilisateurs: 1 Gestionnaire + 1 Employé</p>
                  <p>Clé générée automatiquement</p>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowLicenseForm(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={!newLicense.userLotId}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Générer Licence
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LicencesModule;