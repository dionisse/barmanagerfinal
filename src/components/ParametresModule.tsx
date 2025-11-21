import React, { useState, useEffect } from 'react';
import { User, Settings, License } from '../types';
import { Settings as SettingsIcon, Building, FileText, Bell, Database, Save, Package, Activity, Download, Upload, CheckCircle, AlertTriangle, HeadphonesIcon, Mail, Phone, RefreshCw, Lock, Key, Eye, EyeOff } from 'lucide-react';
import { getSettings, updateSettings, defaultSettings } from '../utils/dataService';
import PackageInfo from './PackageInfo';
import DiagnosticPanel from './DiagnosticPanel';
import { packageManager } from '../utils/packageManager';
import { supabase } from '../utils/supabaseService';

interface ParametresModuleProps {
  user: User;
}

const ParametresModule: React.FC<ParametresModuleProps> = ({ user }) => {
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [userLicense, setUserLicense] = useState<License | null>(null);
  const [daysRemaining, setDaysRemaining] = useState<number>(0);

  const [activeTab, setActiveTab] = useState('general');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [managerPassword, setManagerPassword] = useState({ current: '', new: '', confirm: '' });
  const [employeePassword, setEmployeePassword] = useState({ new: '', confirm: '' });
  const [showPasswords, setShowPasswords] = useState({ managerCurrent: false, managerNew: false, managerConfirm: false, employeeNew: false, employeeConfirm: false });
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  useEffect(() => {
    loadSettings();
    loadUserLicense();
  }, [user]);

  const loadSettings = async () => {
    try {
      const loadedSettings = await getSettings();
      if (loadedSettings) {
        setSettings(loadedSettings);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des paramètres:', error);
    }
  };

  const loadUserLicense = async () => {
    try {
      if (user.type === 'Propriétaire') {
        console.log('⚠️ Utilisateur Propriétaire, pas de licence à charger');
        return;
      }

      console.log('📝 Chargement licence pour:', user.username);

      // Méthode 1: Chercher dans gestionnaire_username
      let { data: userLotData, error: lotError } = await supabase
        .from('user_lots')
        .select('id')
        .eq('gestionnaire_username', user.username)
        .maybeSingle();

      // Si pas trouvé, chercher dans employe_username
      if (!userLotData) {
        console.log('🔍 Recherche dans employe_username...');
        const result = await supabase
          .from('user_lots')
          .select('id')
          .eq('employe_username', user.username)
          .maybeSingle();

        userLotData = result.data;
        lotError = result.error;
      }

      if (lotError) {
        console.error('❌ Erreur lors de la recherche du lot:', lotError);
        return;
      }

      if (!userLotData) {
        console.log('❌ Pas de lot trouvé pour:', user.username);
        return;
      }

      console.log('✅ User lot trouvé:', userLotData.id);

      // Charger la licence active pour ce lot
      const { data: licenseData, error: licenseError } = await supabase
        .from('licenses')
        .select('*')
        .eq('user_lot_id', userLotData.id)
        .eq('active', true)
        .maybeSingle();

      if (licenseError) {
        console.error('❌ Erreur lors du chargement de la licence:', licenseError);
        return;
      }

      if (!licenseData) {
        console.log('❌ Pas de licence active pour le lot:', userLotData.id);
        return;
      }

      console.log('✅ Licence trouvée:', licenseData);

      const license: License = {
        id: licenseData.id,
        type: licenseData.license_type,
        duree: licenseData.duree,
        prix: licenseData.prix,
        dateDebut: licenseData.date_debut,
        dateFin: licenseData.date_fin,
        cle: licenseData.cle,
        active: licenseData.active,
        userLotId: licenseData.user_lot_id
      };

      // Calculer les jours restants
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const endDate = new Date(license.dateFin);
      endDate.setHours(23, 59, 59, 999);
      const days = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      console.log('✅ Licence chargée:', {
        type: license.type,
        dateFin: license.dateFin,
        joursRestants: days
      });

      setUserLicense(license);
      setDaysRemaining(days);
    } catch (error) {
      console.error('❌ Erreur inattendue lors du chargement de la licence:', error);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveSuccess(false);
    
    try {
      await updateSettings(settings);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleNestedInputChange = (parent: string, field: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [parent]: {
        ...prev[parent as keyof Settings],
        [field]: value
      }
    }));
  };

  const handleChangeManagerPassword = async () => {
    setPasswordError('');
    setPasswordSuccess('');

    if (!managerPassword.current || !managerPassword.new || !managerPassword.confirm) {
      setPasswordError('Veuillez remplir tous les champs');
      return;
    }

    if (managerPassword.new.length < 8) {
      setPasswordError('Le nouveau mot de passe doit contenir au moins 8 caractères');
      return;
    }

    if (managerPassword.new !== managerPassword.confirm) {
      setPasswordError('Les nouveaux mots de passe ne correspondent pas');
      return;
    }

    try {
      const { getUserLots, updateUserLot } = await import('../utils/dataService');
      const userLots = await getUserLots();

      const userLot = userLots.find(lot => lot.gestionnaire.username === user.username);

      if (!userLot) {
        setPasswordError('Lot d\'utilisateurs non trouvé');
        return;
      }

      if (userLot.gestionnaire.password !== managerPassword.current) {
        setPasswordError('Mot de passe actuel incorrect');
        return;
      }

      const updatedLot = {
        ...userLot,
        gestionnaire: {
          ...userLot.gestionnaire,
          password: managerPassword.new
        }
      };

      await updateUserLot(updatedLot);

      setPasswordSuccess('Votre mot de passe a été changé avec succès');
      setManagerPassword({ current: '', new: '', confirm: '' });

      setTimeout(() => {
        setPasswordSuccess('');
      }, 3000);
    } catch (error) {
      console.error('Erreur lors du changement de mot de passe:', error);
      setPasswordError('Erreur lors du changement de mot de passe. Veuillez réessayer.');
    }
  };

  const handleChangeEmployeePassword = async () => {
    setPasswordError('');
    setPasswordSuccess('');

    if (!employeePassword.new || !employeePassword.confirm) {
      setPasswordError('Veuillez remplir tous les champs');
      return;
    }

    if (employeePassword.new.length < 8) {
      setPasswordError('Le nouveau mot de passe doit contenir au moins 8 caractères');
      return;
    }

    if (employeePassword.new !== employeePassword.confirm) {
      setPasswordError('Les mots de passe ne correspondent pas');
      return;
    }

    try {
      const { getUserLots, updateUserLot } = await import('../utils/dataService');
      const userLots = await getUserLots();

      const userLot = userLots.find(lot => lot.gestionnaire.username === user.username);

      if (!userLot) {
        setPasswordError('Lot d\'utilisateurs non trouvé');
        return;
      }

      const updatedLot = {
        ...userLot,
        employe: {
          ...userLot.employe,
          password: employeePassword.new
        }
      };

      await updateUserLot(updatedLot);

      setPasswordSuccess('Le mot de passe de l\'employé a été changé avec succès');
      setEmployeePassword({ new: '', confirm: '' });

      setTimeout(() => {
        setPasswordSuccess('');
      }, 3000);
    } catch (error) {
      console.error('Erreur lors du changement de mot de passe:', error);
      setPasswordError('Erreur lors du changement de mot de passe. Veuillez réessayer.');
    }
  };

  const tabs = [
    { id: 'general', name: 'Général', icon: SettingsIcon },
    { id: 'company', name: 'Entreprise', icon: Building },
    { id: 'fiscal', name: 'Fiscalité', icon: FileText },
    { id: 'notifications', name: 'Notifications', icon: Bell },
    { id: 'backup', name: 'Sauvegarde', icon: Database },
    ...(user.type === 'Gestionnaire' ? [{ id: 'security', name: 'Sécurité', icon: Lock }] : []),
    { id: 'support', name: 'Support', icon: HeadphonesIcon },
    { id: 'package', name: 'Package', icon: Package },
    { id: 'diagnostic', name: 'Diagnostic', icon: Activity }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Paramètres</h1>
          <p className="text-gray-600 mt-2">Configurez votre application GOBEX</p>
          <p className="text-xs text-gray-500 mt-1">Version 2.0.1</p>
        </div>
        {activeTab !== 'package' && activeTab !== 'diagnostic' && activeTab !== 'support' && activeTab !== 'security' && (
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2 disabled:opacity-50 shadow-md"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>Sauvegarde en cours...</span>
              </>
            ) : (
              <>
                <Save className="h-5 w-5" />
                <span>Sauvegarder les paramètres</span>
              </>
            )}
          </button>
        )}
      </div>

      {saveSuccess && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-center space-x-3">
          <CheckCircle className="h-5 w-5 text-green-600" />
          <span className="text-green-800">Paramètres sauvegardés avec succès!</span>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.name}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'general' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">Paramètres généraux</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    TVA (%)
                  </label>
                  <input
                    type="number"
                    value={settings.facturation.tva}
                    onChange={(e) => handleNestedInputChange('facturation', 'tva', parseFloat(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    min="0"
                    max="100"
                    step="0.1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Préfixe facture
                  </label>
                  <input
                    type="text"
                    value={settings.facturation.prefixeFacture}
                    onChange={(e) => handleNestedInputChange('facturation', 'prefixeFacture', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="FAC"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Mentions légales
                  </label>
                  <textarea
                    value={settings.facturation.mentionsLegales}
                    onChange={(e) => handleNestedInputChange('facturation', 'mentionsLegales', e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Mentions légales à afficher sur les factures"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'fiscal' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Paramètres Fiscaux - eMecef Bénin</h3>
                <div className="flex items-center space-x-2">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.fiscalite.emecefEnabled}
                      onChange={(e) => handleNestedInputChange('fiscalite', 'emecefEnabled', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                  <span className="text-sm font-medium text-gray-700">
                    {settings.fiscalite.emecefEnabled ? 'Activé' : 'Désactivé'}
                  </span>
                </div>
              </div>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <FileText className="h-5 w-5 text-blue-600" />
                  <h4 className="font-semibold text-blue-800">À propos d'eMecef</h4>
                </div>
                <p className="text-blue-700 text-sm">
                  eMecef est le système de facturation électronique obligatoire au Bénin. 
                  Activez cette fonctionnalité pour générer automatiquement les codes fiscaux 
                  sur vos factures conformément à la réglementation de la DGI.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    NIF (Numéro d'Identification Fiscale) *
                  </label>
                  <input
                    type="text"
                    value={settings.fiscalite.nif}
                    onChange={(e) => handleNestedInputChange('fiscalite', 'nif', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Ex: 3202300000000"
                    required={settings.fiscalite.emecefEnabled}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    RCCM (Registre du Commerce) *
                  </label>
                  <input
                    type="text"
                    value={settings.fiscalite.rccm}
                    onChange={(e) => handleNestedInputChange('fiscalite', 'rccm', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Ex: RB/COT/23/B/123"
                    required={settings.fiscalite.emecefEnabled}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Adresse Fiscale *
                  </label>
                  <textarea
                    value={settings.fiscalite.adresseFiscale}
                    onChange={(e) => handleNestedInputChange('fiscalite', 'adresseFiscale', e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Adresse fiscale complète de l'entreprise"
                    required={settings.fiscalite.emecefEnabled}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Activité Principale
                  </label>
                  <input
                    type="text"
                    value={settings.fiscalite.activitePrincipale}
                    onChange={(e) => handleNestedInputChange('fiscalite', 'activitePrincipale', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Ex: Commerce de détail"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Régime Fiscal
                  </label>
                  <select
                    value={settings.fiscalite.regimeFiscal}
                    onChange={(e) => handleNestedInputChange('fiscalite', 'regimeFiscal', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="Réel Normal">Réel Normal</option>
                    <option value="Réel Simplifié">Réel Simplifié</option>
                    <option value="Synthèse">Synthèse</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Centre des Impôts
                  </label>
                  <input
                    type="text"
                    value={settings.fiscalite.centreImpot}
                    onChange={(e) => handleNestedInputChange('fiscalite', 'centreImpot', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Ex: Centre des Impôts de Cotonou"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    URL de l'API eMecef *
                  </label>
                  <input
                    type="url"
                    value={settings.fiscalite.emecefApiUrl}
                    onChange={(e) => handleNestedInputChange('fiscalite', 'emecefApiUrl', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="https://votre-api-emecef.netlify.app"
                    required={settings.fiscalite.emecefEnabled}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    URL de votre API standardizedInvoice déployée
                  </p>
                </div>
              </div>

              {settings.fiscalite.emecefEnabled && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <AlertTriangle className="h-5 w-5 text-amber-600" />
                    <h4 className="font-semibold text-amber-800">Important</h4>
                  </div>
                  <ul className="text-amber-700 text-sm space-y-1">
                    <li>• Assurez-vous que votre API standardizedInvoice est déployée et accessible</li>
                    <li>• Vérifiez que vos informations fiscales sont correctes</li>
                    <li>• Les codes eMecef seront générés automatiquement lors des ventes</li>
                    <li>• En cas d'échec, la vente sera enregistrée sans code eMecef</li>
                  </ul>
                </div>
              )}
            </div>
          )}

          {activeTab === 'company' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">Informations de l'entreprise</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nom de l'entreprise
                  </label>
                  <input
                    type="text"
                    value={settings.entreprise.nom}
                    onChange={(e) => handleNestedInputChange('entreprise', 'nom', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Nom de votre entreprise"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Adresse
                  </label>
                  <textarea
                    value={settings.entreprise.adresse}
                    onChange={(e) => handleNestedInputChange('entreprise', 'adresse', e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Adresse complète de l'entreprise"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Téléphone
                  </label>
                  <input
                    type="tel"
                    value={settings.entreprise.telephone}
                    onChange={(e) => handleNestedInputChange('entreprise', 'telephone', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="+33 1 23 45 67 89"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={settings.entreprise.email}
                    onChange={(e) => handleNestedInputChange('entreprise', 'email', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="contact@entreprise.com"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h4 className="font-medium text-gray-900">Stock faible</h4>
                    <p className="text-sm text-gray-600">Recevoir des alertes quand le stock est bas</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.notifications.stockFaible}
                      onChange={(e) => handleNestedInputChange('notifications', 'stockFaible', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h4 className="font-medium text-gray-900">Expiration de licence</h4>
                    <p className="text-sm text-gray-600">Recevoir des alertes d'expiration de licence</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.notifications.licenceExpiration}
                      onChange={(e) => handleNestedInputChange('notifications', 'licenceExpiration', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h4 className="font-medium text-gray-900">Rapports automatiques</h4>
                    <p className="text-sm text-gray-600">Recevoir des rapports automatiques</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.notifications.rapportsAutomatiques}
                      onChange={(e) => handleNestedInputChange('notifications', 'rapportsAutomatiques', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'backup' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">Sauvegarde et synchronisation</h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h4 className="font-medium text-gray-900">Sauvegarde automatique</h4>
                    <p className="text-sm text-gray-600">Sauvegarder automatiquement vos données</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.sauvegarde.automatique}
                      onChange={(e) => handleNestedInputChange('sauvegarde', 'automatique', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                {settings.sauvegarde.automatique && (
                  <div className="ml-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Fréquence de sauvegarde
                    </label>
                    <select
                      value={settings.sauvegarde.frequence}
                      onChange={(e) => handleNestedInputChange('sauvegarde', 'frequence', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="horaire">Toutes les heures</option>
                      <option value="quotidienne">Quotidienne</option>
                      <option value="hebdomadaire">Hebdomadaire</option>
                    </select>
                  </div>
                )}

                <div className="flex space-x-4 mt-6">
                  <button className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                    <Download className="h-4 w-4" />
                    <span>Exporter les données</span>
                  </button>
                  <button className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                    <Upload className="h-4 w-4" />
                    <span>Importer les données</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'package' && (
            <PackageInfo />
          )}

          {activeTab === 'diagnostic' && (
            <DiagnosticPanel />
          )}

          {activeTab === 'support' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">Support et Assistance</h3>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Contact Support */}
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="bg-blue-600 p-3 rounded-lg">
                      <HeadphonesIcon className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900">Contacter le Support</h4>
                      <p className="text-sm text-gray-600">Nous sommes là pour vous aider</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="bg-white rounded-lg p-4 shadow-sm">
                      <div className="flex items-center space-x-3 mb-2">
                        <Phone className="h-5 w-5 text-blue-600" />
                        <span className="font-medium text-gray-900">Téléphone</span>
                      </div>
                      <a href="tel:+22997123456" className="text-blue-600 hover:text-blue-700 font-semibold">
                        +229 97 12 34 56
                      </a>
                      <p className="text-xs text-gray-500 mt-1">Disponible 24/7</p>
                    </div>

                    <div className="bg-white rounded-lg p-4 shadow-sm">
                      <div className="flex items-center space-x-3 mb-2">
                        <Mail className="h-5 w-5 text-blue-600" />
                        <span className="font-medium text-gray-900">Email</span>
                      </div>
                      <a href="mailto:support@gobex.app" className="text-blue-600 hover:text-blue-700 font-semibold">
                        support@gobex.app
                      </a>
                      <p className="text-xs text-gray-500 mt-1">Réponse sous 24h</p>
                    </div>

                    <div className="bg-white rounded-lg p-4 shadow-sm">
                      <div className="flex items-center space-x-3 mb-2">
                        <Package className="h-5 w-5 text-blue-600" />
                        <span className="font-medium text-gray-900">WhatsApp</span>
                      </div>
                      <a
                        href="https://wa.me/22997123456"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-700 font-semibold"
                      >
                        +229 97 12 34 56
                      </a>
                      <p className="text-xs text-gray-500 mt-1">Chat instantané</p>
                    </div>
                  </div>
                </div>

                {/* Renouvellement de Licence */}
                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="bg-green-600 p-3 rounded-lg">
                      <RefreshCw className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900">Renouveler ma Licence</h4>
                      <p className="text-sm text-gray-600">Prolongez votre abonnement</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {userLicense && (
                      <div className="bg-white rounded-lg p-4 shadow-sm">
                        <div className="flex justify-between items-center mb-3">
                          <span className="text-sm font-medium text-gray-700">Licence actuelle</span>
                          <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                            {userLicense.type}
                          </span>
                        </div>
                        <div className="space-y-2 text-sm text-gray-600">
                          <p>Expire le: <span className="font-semibold text-gray-900">{new Date(userLicense.dateFin).toLocaleDateString('fr-FR')}</span></p>
                          <p>Jours restants: <span className={`font-semibold ${daysRemaining < 7 ? 'text-red-600' : 'text-green-600'}`}>
                            {daysRemaining > 0 ? daysRemaining : 0} jour{daysRemaining > 1 ? 's' : ''}
                          </span></p>
                        </div>
                      </div>
                    )}

                    {!userLicense && user.type !== 'Propriétaire' && (
                      <div className="bg-amber-50 rounded-lg p-4 shadow-sm border border-amber-200">
                        <p className="text-sm text-amber-800">
                          Aucune licence active trouvée. Contactez le propriétaire.
                        </p>
                      </div>
                    )}

                    <div className="bg-white rounded-lg p-4 shadow-sm">
                      <h5 className="font-semibold text-gray-900 mb-3">Formules disponibles</h5>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Kpêvi (1 mois)</span>
                          <span className="font-semibold text-gray-900">15,000 FCFA</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Kléoun (3 mois)</span>
                          <span className="font-semibold text-gray-900">40,000 FCFA</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Agbon (6 mois)</span>
                          <span className="font-semibold text-gray-900">70,000 FCFA</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Baba (12 mois)</span>
                          <span className="font-semibold text-green-600 font-bold">120,000 FCFA</span>
                        </div>
                      </div>
                    </div>

                    <button className="w-full bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center space-x-2 font-semibold shadow-md">
                      <RefreshCw className="h-5 w-5" />
                      <span>Renouveler maintenant</span>
                    </button>

                    <p className="text-xs text-gray-500 text-center">
                      Contactez-nous pour renouveler votre licence
                    </p>
                  </div>
                </div>
              </div>

              {/* Informations Complémentaires */}
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 text-white">
                <h4 className="text-lg font-semibold mb-3">Besoin d'aide ?</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-blue-100 mb-1">Support technique</p>
                    <p className="font-semibold">Assistance complète</p>
                  </div>
                  <div>
                    <p className="text-blue-100 mb-1">Formation</p>
                    <p className="font-semibold">Prise en main rapide</p>
                  </div>
                  <div>
                    <p className="text-blue-100 mb-1">Mises à jour</p>
                    <p className="font-semibold">Gratuites à vie</p>
                  </div>
                </div>
              </div>

              {/* FAQ Rapide */}
              <div className="bg-white border border-gray-200 rounded-xl p-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Questions fréquentes</h4>
                <div className="space-y-4">
                  <div>
                    <h5 className="font-medium text-gray-900 mb-1">Comment renouveler ma licence ?</h5>
                    <p className="text-sm text-gray-600">
                      Contactez notre support par téléphone ou WhatsApp. Nous vous guiderons dans le processus de renouvellement.
                    </p>
                  </div>
                  <div>
                    <h5 className="font-medium text-gray-900 mb-1">Que se passe-t-il si ma licence expire ?</h5>
                    <p className="text-sm text-gray-600">
                      Vous perdrez l'accès à l'application. Vos données restent sauvegardées et seront accessibles après renouvellement.
                    </p>
                  </div>
                  <div>
                    <h5 className="font-medium text-gray-900 mb-1">Puis-je changer de formule ?</h5>
                    <p className="text-sm text-gray-600">
                      Oui, contactez le support pour passer à une formule supérieure ou inférieure selon vos besoins.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'security' && user.type === 'Gestionnaire' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">Sécurité et Mots de Passe</h3>

              {passwordError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center space-x-3">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  <span className="text-red-800">{passwordError}</span>
                </div>
              )}

              {passwordSuccess && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center space-x-3">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="text-green-800">{passwordSuccess}</span>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="bg-blue-600 p-3 rounded-lg">
                      <Key className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900">Mon Mot de Passe</h4>
                      <p className="text-sm text-gray-600">Changer votre mot de passe</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Mot de passe actuel *
                      </label>
                      <div className="relative">
                        <input
                          type={showPasswords.managerCurrent ? 'text' : 'password'}
                          value={managerPassword.current}
                          onChange={(e) => setManagerPassword({ ...managerPassword, current: e.target.value })}
                          className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Entrez votre mot de passe actuel"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPasswords({ ...showPasswords, managerCurrent: !showPasswords.managerCurrent })}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                        >
                          {showPasswords.managerCurrent ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Nouveau mot de passe *
                      </label>
                      <div className="relative">
                        <input
                          type={showPasswords.managerNew ? 'text' : 'password'}
                          value={managerPassword.new}
                          onChange={(e) => setManagerPassword({ ...managerPassword, new: e.target.value })}
                          className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Entrez votre nouveau mot de passe"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPasswords({ ...showPasswords, managerNew: !showPasswords.managerNew })}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                        >
                          {showPasswords.managerNew ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Confirmer le nouveau mot de passe *
                      </label>
                      <div className="relative">
                        <input
                          type={showPasswords.managerConfirm ? 'text' : 'password'}
                          value={managerPassword.confirm}
                          onChange={(e) => setManagerPassword({ ...managerPassword, confirm: e.target.value })}
                          className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Confirmez votre nouveau mot de passe"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPasswords({ ...showPasswords, managerConfirm: !showPasswords.managerConfirm })}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                        >
                          {showPasswords.managerConfirm ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                      </div>
                    </div>

                    <button
                      onClick={() => handleChangeManagerPassword()}
                      className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2 font-semibold shadow-md"
                    >
                      <Lock className="h-5 w-5" />
                      <span>Changer mon mot de passe</span>
                    </button>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="bg-green-600 p-3 rounded-lg">
                      <Key className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900">Mot de Passe Employé</h4>
                      <p className="text-sm text-gray-600">Changer le mot de passe de l'employé</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                      <p className="text-sm text-amber-800">
                        En tant que gestionnaire, vous pouvez définir un nouveau mot de passe pour votre employé associé.
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Nouveau mot de passe employé *
                      </label>
                      <div className="relative">
                        <input
                          type={showPasswords.employeeNew ? 'text' : 'password'}
                          value={employeePassword.new}
                          onChange={(e) => setEmployeePassword({ ...employeePassword, new: e.target.value })}
                          className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                          placeholder="Entrez le nouveau mot de passe"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPasswords({ ...showPasswords, employeeNew: !showPasswords.employeeNew })}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                        >
                          {showPasswords.employeeNew ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Confirmer le mot de passe employé *
                      </label>
                      <div className="relative">
                        <input
                          type={showPasswords.employeeConfirm ? 'text' : 'password'}
                          value={employeePassword.confirm}
                          onChange={(e) => setEmployeePassword({ ...employeePassword, confirm: e.target.value })}
                          className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                          placeholder="Confirmez le nouveau mot de passe"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPasswords({ ...showPasswords, employeeConfirm: !showPasswords.employeeConfirm })}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                        >
                          {showPasswords.employeeConfirm ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                      </div>
                    </div>

                    <button
                      onClick={() => handleChangeEmployeePassword()}
                      className="w-full bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center space-x-2 font-semibold shadow-md"
                    >
                      <Lock className="h-5 w-5" />
                      <span>Changer le mot de passe employé</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <p className="font-semibold mb-1">Conseils de sécurité</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>Utilisez un mot de passe d'au moins 8 caractères</li>
                      <li>Mélangez lettres majuscules, minuscules, chiffres et symboles</li>
                      <li>Ne partagez jamais votre mot de passe</li>
                      <li>Changez régulièrement vos mots de passe</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mt-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl p-6 text-white">
        <h3 className="text-lg font-semibold mb-3">Informations Système</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-blue-100">Version GOBEX</p>
            <p className="font-semibold">v2.0.1</p>
          </div>
          <div>
            <p className="text-blue-100">Dernière mise à jour</p>
            <p className="font-semibold">{new Date().toLocaleDateString('fr-FR')}</p>
          </div>
          <div>
            <p className="text-blue-100">Utilisateur connecté</p>
            <p className="font-semibold">{user.username} ({user.type})</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ParametresModule;