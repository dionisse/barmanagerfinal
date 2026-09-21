import React, { useState, useEffect } from 'react';
import { User, License, LicenseSettings, UserLot, LicensePayment } from '../types';
import { Shield, Users, Calendar, Key, AlertTriangle, Clock, CheckCircle, XCircle, UserPlus, Package, Zap, CreditCard, TrendingUp, Receipt } from 'lucide-react';
import { getLicenses, addLicense, updateLicense, checkLicenseExpiration, getUserLots, addUserLot, updateUserLot, deleteUserLot } from '../utils/dataService';
import { simpleAuth } from '../utils/simpleAuthService';
import { supabase } from '../utils/supabaseService';
import { LICENSE_PLANS, computeLicenseStatus } from '../utils/licenseService';
import { getLicensePayments } from '../utils/fedapayService';
import LicenseCheckoutModal from './LicenseCheckoutModal';

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
  const [payments, setPayments] = useState<LicensePayment[]>([]);
  const [renewalTarget, setRenewalTarget] = useState<{ lot: UserLot; license: License | null } | null>(null);

  // Tarifs centralisés — source unique : licenseService.LICENSE_PLANS
  const licenseSettings = Object.fromEntries(
    LICENSE_PLANS.map(p => [p.key, { duree: p.duree, prix: p.prix }])
  ) as unknown as LicenseSettings;

  useEffect(() => {
    if (user.type === 'Propriétaire') {
      loadData();
      checkLicenseStatus();
    }

    // Écouter l'événement de restauration des données
    const handleDataRestored = () => {
      console.log('Données restaurées, rechargement du module Licences...');
      if (user.type === 'Propriétaire') {
        loadData();
        checkLicenseStatus();
      }
    };

    window.addEventListener('dataRestored', handleDataRestored);
    // Recharge quand une licence est renouvelée (paiement FEDAPAY accepté)
    const handleLicenseRenewed = () => loadData();
    window.addEventListener('licenseRenewed', handleLicenseRenewed);

    return () => {
      window.removeEventListener('dataRestored', handleDataRestored);
      window.removeEventListener('licenseRenewed', handleLicenseRenewed);
    };
  }, [user]);

  const loadData = async () => {
    try {
      console.log('📊 Chargement données Licences depuis Supabase');

      const { data: userLotsData, error: lotsError } = await supabase
        .from('user_lots')
        .select('*')
        .order('date_creation', { ascending: false });

      if (lotsError) {
        console.error('❌ Erreur chargement user_lots:', lotsError);
        return;
      }

      const { data: licensesData, error: licensesError } = await supabase
        .from('licenses')
        .select('*')
        .order('date_debut', { ascending: false });

      if (licensesError) {
        console.error('❌ Erreur chargement licenses:', licensesError);
        return;
      }

      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('*')
        .neq('role', 'Propriétaire');

      if (usersError) {
        console.error('❌ Erreur chargement users:', usersError);
      }

      const formattedUserLots = userLotsData?.map(lot => ({
        id: lot.id,
        gestionnaire: {
          username: lot.gestionnaire_username,
          password: '***'
        },
        employe: {
          username: lot.employe_username,
          password: '***'
        },
        dateCreation: lot.date_creation,
        status: lot.status
      })) || [];

      const formattedLicenses = licensesData?.map(lic => ({
        id: lic.id,
        type: lic.license_type,
        duree: lic.duree,
        prix: lic.prix,
        dateDebut: lic.date_debut,
        dateFin: lic.date_fin,
        cle: lic.cle,
        active: lic.active,
        userLotId: lic.user_lot_id,
        userLot: formattedUserLots.find(lot => lot.id === lic.user_lot_id)
      })) || [];

      console.log('✅ Données chargées:', {
        userLots: formattedUserLots.length,
        licenses: formattedLicenses.length,
        users: usersData?.length || 0
      });

      setUserLots(formattedUserLots);
      setLicenses(formattedLicenses);

      // Historique des paiements FEDAPAY (renouvellements en ligne)
      getLicensePayments()
        .then(setPayments)
        .catch(() => setPayments([]));
    } catch (error) {
      console.error('❌ Erreur loadData:', error);
    }
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
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce lot d\'utilisateurs ? Cela supprimera aussi leurs comptes utilisateur et toutes leurs données.')) {
      return;
    }

    try {
      const userLot = userLots.find(lot => lot.id === userLotId);
      if (!userLot) return;

      console.log('🗑️ Suppression du lot:', userLotId);

      // 1. Supprimer les utilisateurs de la table users
      const { error: usersError } = await supabase
        .from('users')
        .delete()
        .in('username', [userLot.gestionnaire.username, userLot.employe.username]);

      if (usersError) {
        console.error('❌ Erreur suppression users:', usersError);
        alert('Erreur lors de la suppression des utilisateurs: ' + usersError.message);
        return;
      }

      // 2. Supprimer les licences associées
      const { error: licensesError } = await supabase
        .from('licenses')
        .delete()
        .eq('user_lot_id', userLotId);

      if (licensesError) {
        console.error('❌ Erreur suppression licenses:', licensesError);
      }

      // 3. Supprimer les données utilisateur
      const { error: userDataError } = await supabase
        .from('user_data')
        .delete()
        .eq('user_lot_id', userLotId);

      if (userDataError) {
        console.error('❌ Erreur suppression user_data:', userDataError);
      }

      // 4. Supprimer le lot d'utilisateurs (CASCADE supprimera automatiquement les relations)
      const { error: userLotError } = await supabase
        .from('user_lots')
        .delete()
        .eq('id', userLotId);

      if (userLotError) {
        console.error('❌ Erreur suppression user_lot:', userLotError);
        alert('Erreur lors de la suppression du lot: ' + userLotError.message);
        return;
      }

      console.log('✅ Lot supprimé avec succès');
      alert('✅ Lot d\'utilisateurs supprimé avec succès');

      loadData();
    } catch (error) {
      console.error('❌ Erreur lors de la suppression:', error);
      alert('Erreur: ' + error.message);
    }
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
    // Délégué au service central (jours calendaires, jalons J-7/J-3/J-0)
    return computeLicenseStatus(license).status;
  };

  const activeLicenses = licenses.filter(l => l.active && getLicenseStatus(l) !== 'expired');
  const availableUserLots = userLots.filter(lot => 
    !licenses.some(l => l.userLotId === lot.id && l.active && getLicenseStatus(l) !== 'expired')
  );

  /** Licence courante d'un lot : celle couvrant aujourd'hui (ou la plus récente expirée) */
  const getLotCurrentLicense = (userLotId: string): License | null => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const byLot = licenses
      .filter(l => l.userLotId === userLotId)
      .sort((a, b) => new Date(b.dateFin).getTime() - new Date(a.dateFin).getTime());
    const valid = byLot.find(l => {
      if (!l.active) return false;
      const end = new Date(l.dateFin);
      end.setHours(23, 59, 59, 999);
      return end >= today;
    });
    return valid || byLot[0] || null;
  };

  /* Statistiques du tableau de bord licences */
  const lotsActifs = userLots.filter(l => l.status === 'active').length;
  const expiringSoon = activeLicenses.filter(l => {
    const s = computeLicenseStatus(l);
    return s.status === 'warning';
  }).length;
  const expiredCount = licenses.filter(l => getLicenseStatus(l) === 'expired').length;
  const now = new Date();
  const monthPayments = payments.filter(p => {
    const d = new Date(p.createdAt);
    return p.status === 'completed' && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const monthRevenue = monthPayments.reduce((sum, p) => sum + p.montant, 0);

  // Restrict access if license expired and user is not owner
  if (licenseExpired && user.type !== 'Propriétaire') {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center">
          <XCircle className="mx-auto h-16 w-16 text-red-600 mb-4" />
          <h2 className="text-2xl font-bold text-red-800 mb-4">Licence Expirée</h2>
          <p className="text-red-700 mb-6">
            Votre licence AHANDJO a expiré. Renouvelez-la en ligne en quelques secondes depuis le tableau de bord.
          </p>
          <div className="bg-white p-4 rounded-lg border border-red-200">
            <p className="text-sm text-gray-600">
              Rendez-vous sur le Tableau de bord puis cliquez sur « Renouveler maintenant » (paiement
              sécurisé FEDAPAY — Mobile Money ou carte bancaire), ou contactez le propriétaire du système.
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

      {/* ---------- Statistiques ---------- */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl shadow-lg p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Lots actifs</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{lotsActifs}</p>
            </div>
            <div className="p-2.5 rounded-lg bg-blue-100">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-lg p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Licences actives</p>
              <p className="text-2xl font-bold text-green-600 mt-1">{activeLicenses.length}</p>
            </div>
            <div className="p-2.5 rounded-lg bg-green-100">
              <Key className="h-5 w-5 text-green-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-lg p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Expirent sous 7j</p>
              <p className="text-2xl font-bold text-amber-600 mt-1">{expiringSoon}</p>
              <p className="text-xs text-gray-400">{expiredCount} expirée(s)</p>
            </div>
            <div className="p-2.5 rounded-lg bg-amber-100">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-lg p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Encaissé ce mois</p>
              <p className="text-2xl font-bold text-clay-700 mt-1">
                {monthRevenue.toLocaleString('fr-FR')} <span className="text-sm font-medium text-gray-500">F</span>
              </p>
              <p className="text-xs text-gray-400">{monthPayments.length} paiement(s) FEDAPAY</p>
            </div>
            <div className="p-2.5 rounded-lg bg-clay-100">
              <TrendingUp className="h-5 w-5 text-clay-600" />
            </div>
          </div>
        </div>
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

      {/* ---------- Alertes d'échéance détaillées (J-7 / J-3 / J-0) ---------- */}
      {expiringSoon + expiredCount > 0 && (
        <div className="bg-white border-l-4 border-amber-500 rounded-xl shadow p-5 mb-8">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-3">
            <Clock className="h-5 w-5 text-amber-600" />
            Échéances de licences — alertes automatiques
          </h3>
          <div className="space-y-2">
            {activeLicenses
              .filter(l => computeLicenseStatus(l).status === 'warning')
              .map(l => {
                const st = computeLicenseStatus(l);
                return (
                  <div key={l.id} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                      st.daysRemaining <= 3 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {st.daysRemaining === 0 ? "J-0 aujourd'hui" : `J-${st.daysRemaining}`}
                    </span>
                    <span className="text-gray-700 flex-1">
                      {l.userLot?.gestionnaire?.username || l.userLotId} — licence {l.type}, expire le{' '}
                      {new Date(l.dateFin).toLocaleDateString('fr-FR')}
                    </span>
                    <button
                      onClick={() => {
                        const lot = userLots.find(lot => lot.id === l.userLotId);
                        if (lot) setRenewalTarget({ lot, license: l });
                      }}
                      className="text-clay-700 hover:text-clay-900 font-semibold text-left"
                    >
                      Renouveler en ligne →
                    </button>
                  </div>
                );
              })}
            {licenses
              .filter(l => getLicenseStatus(l) === 'expired' && l.active)
              .slice(0, 5)
              .map(l => (
                <div key={l.id} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm">
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">Expirée</span>
                  <span className="text-gray-700 flex-1">
                    {l.userLot?.gestionnaire?.username || l.userLotId} — licence {l.type}, expirée le{' '}
                    {new Date(l.dateFin).toLocaleDateString('fr-FR')}
                  </span>
                  <button
                    onClick={() => {
                      const lot = userLots.find(lot => lot.id === l.userLotId);
                      if (lot) setRenewalTarget({ lot, license: l });
                    }}
                    className="text-clay-700 hover:text-clay-900 font-semibold text-left"
                  >
                    Renouveler en ligne →
                  </button>
                </div>
              ))}
          </div>
          <p className="text-xs text-gray-400 mt-3">
            Des notifications push (J-7, J-3 et jour d'expiration) sont envoyées automatiquement aux clients concernés.
          </p>
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
                          
                          {/* Afficher la licence associée + échéance */}
                          {(() => {
                            const current = getLotCurrentLicense(userLot.id);
                            if (!current) {
                              return (
                                <div className="flex items-center space-x-2">
                                  <Key className="h-4 w-4 text-gray-400" />
                                  <span className="text-sm text-gray-500 font-medium">Aucune licence</span>
                                </div>
                              );
                            }
                            const st = computeLicenseStatus(current);
                            return (
                              <div className="flex items-center space-x-2 flex-wrap">
                                <Key className="h-4 w-4 text-blue-400" />
                                <span className="text-sm text-blue-600 font-medium">
                                  Licence : {current.type}
                                </span>
                                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                                  st.status === 'expired'
                                    ? 'bg-red-100 text-red-700'
                                    : st.status === 'warning'
                                      ? 'bg-amber-100 text-amber-700'
                                      : 'bg-green-100 text-green-700'
                                }`}>
                                  {st.status === 'expired'
                                    ? 'Expirée'
                                    : st.daysRemaining === 0
                                      ? "Dernier jour"
                                      : `${st.daysRemaining} j restants`}
                                </span>
                                <span className="text-xs text-gray-500">
                                  jusqu'au {new Date(current.dateFin).toLocaleDateString('fr-FR')}
                                </span>
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                      
                      <div className="flex flex-col items-end space-y-2">
                        <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getStatusColor(userLot.status)}`}>
                          {userLot.status === 'active' ? 'Actif' : 'Suspendu'}
                        </span>
                        
                        <div className="flex flex-col items-end gap-2">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => {
                                const current = getLotCurrentLicense(userLot.id);
                                setRenewalTarget({ lot: userLot, license: current });
                              }}
                              className="px-3 py-1 rounded text-xs font-semibold bg-clay-600 text-white hover:bg-clay-700 flex items-center gap-1.5"
                              title="Renouveler la licence de ce lot et payer via FEDAPAY"
                            >
                              <CreditCard className="h-3.5 w-3.5" />
                              Renouveler en ligne
                            </button>
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
                              {(() => {
                                const st = computeLicenseStatus(license);
                                if (st.status === 'active') return null;
                                return (
                                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                                    st.status === 'expired' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                                  }`}>
                                    {st.status === 'expired'
                                      ? `Expirée depuis ${Math.abs(st.daysRemaining)} j`
                                      : st.daysRemaining === 0
                                        ? "Expire aujourd'hui"
                                        : `J-${st.daysRemaining}`}
                                  </span>
                                );
                              })()}
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
              {LICENSE_PLANS.map((plan) => (
                <div key={plan.key} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="font-semibold text-gray-900">{plan.key}</h4>
                      <p className="text-sm text-gray-600">{plan.duree} mois · {plan.description}</p>
                      <p className="text-xs text-gray-500 mt-1">1 Gestionnaire + 1 Employé</p>
                      {plan.economie && (
                        <p className="text-xs font-semibold text-emerald-600 mt-0.5">{plan.economie}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-blue-600">{plan.prix.toLocaleString('fr-FR')} FCFA</p>
                      <p className="text-xs text-gray-400">{Math.round(plan.prix / plan.duree).toLocaleString('fr-FR')} F/mois</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Paiements FEDAPAY — historique des renouvellements en ligne */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Receipt className="h-5 w-5 text-clay-600" />
              Paiements FEDAPAY
            </h3>
            {payments.length === 0 ? (
              <div className="text-center py-6">
                <CreditCard className="mx-auto h-10 w-10 text-gray-300 mb-3" />
                <p className="text-sm text-gray-500">Aucun paiement en ligne enregistré pour l'instant.</p>
                <p className="text-xs text-gray-400 mt-1">
                  Les renouvellements payés via FEDAPAY apparaîtront ici automatiquement.
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {payments.map((p) => {
                  const lot = userLots.find(l => l.id === p.userLotId);
                  return (
                    <div key={p.id || p.fedapayTransactionId} className="flex items-center justify-between border border-gray-100 rounded-lg px-3 py-2.5">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {lot?.gestionnaire?.username || p.payerUsername} — {p.licenseType} ({p.duree} mois)
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(p.createdAt).toLocaleString('fr-FR')} · tx {p.fedapayTransactionId}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-sm font-bold text-gray-900">{p.montant.toLocaleString('fr-FR')} F</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                          p.status === 'completed'
                            ? 'bg-green-100 text-green-700'
                            : p.status === 'pending'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-red-100 text-red-700'
                        }`}>
                          {p.status === 'completed' ? 'Payé' : p.status === 'pending' ? 'En attente' : p.status === 'canceled' ? 'Annulé' : 'Échoué'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Informations Système</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Version:</span>
                <span className="font-semibold">AHANDJO v2.0.1</span>
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

      {/* Modale de renouvellement en ligne (paiement FEDAPAY) */}
      {renewalTarget && (
        <LicenseCheckoutModal
          user={user}
          userLotId={renewalTarget.lot.id}
          lotLabel={renewalTarget.lot.gestionnaire.username}
          currentLicense={renewalTarget.license}
          onClose={() => setRenewalTarget(null)}
          onRenewed={() => loadData()}
        />
      )}
    </div>
  );
};

export default LicencesModule;