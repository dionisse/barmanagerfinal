import React, { useState, useEffect } from 'react';
import { packageManager } from '../utils/packageManager';
import { indexedDBService } from '../utils/indexedDBService';
import { Download, Upload, Info, Package, HardDrive, Trash2, AlertTriangle, Save, CheckCircle, Database } from 'lucide-react';

const PackageInfo: React.FC = () => {
  const [packageInfo, setPackageInfo] = useState(packageManager.getPackageInfo());
  const [storageInfo, setStorageInfo] = useState<any>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [backupStatus, setBackupStatus] = useState<'idle' | 'creating' | 'success' | 'error'>('idle');

  useEffect(() => {
    loadStorageInfo();
  }, []);

  const loadStorageInfo = async () => {
    try {
      const quota = packageManager.checkStorageQuota();
      const stats = await indexedDBService.getStats();
    
      setStorageInfo({
        totalSize: packageManager.formatSize(quota.used),
        totalSizeBytes: quota.used,
        itemCount: stats.totalItems || 0,
        maxSize: packageManager.formatSize(quota.used + quota.available),
        usagePercent: quota.percentage.toFixed(1),
        quotaExceeded: quota.exceeded,
        availableSpace: packageManager.formatSize(quota.available)
      });
    } catch (error) {
      console.error('Error loading storage info:', error);
      // Set default values if there's an error
      setStorageInfo({
        totalSize: '0 B',
        totalSizeBytes: 0,
        itemCount: 0,
        maxSize: '100 MB',
        usagePercent: '0.0',
        quotaExceeded: false,
        availableSpace: '100 MB'
      });
    }
  };

  const handleExportData = () => {
    const data = packageManager.exportData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gobex-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        if (packageManager.importData(content)) {
          alert('Données importées avec succès !');
          window.location.reload();
        } else {
          alert('Erreur lors de l\'importation des données');
        }
      };
      reader.readAsText(file);
    }
  };

  const createBackup = async () => {
    setBackupStatus('creating');
    try {
      if (!navigator.onLine) {
        throw new Error('Impossible de créer une sauvegarde - Appareil hors ligne');
      }
      
      // Vérifier le quota avant de créer la sauvegarde
      const quota = packageManager.checkStorageQuota();
      if (quota.exceeded) {
        await packageManager.cleanupStorage();
      }

      const success = packageManager.createBackup();
      if (!success) {
        throw new Error('Échec de la création de la sauvegarde');
      }

      setBackupStatus('success');
      loadStorageInfo();
      
      // Reset status after 3 seconds
      setTimeout(() => {
        setBackupStatus('idle');
      }, 3000);
    } catch (error) {
      console.error('Erreur lors de la création de la sauvegarde:', error);
      setBackupStatus('error');
      
      // Reset status after 3 seconds
      setTimeout(() => {
        setBackupStatus('idle');
      }, 3000);
    }
  };

  const handleClearAllData = () => {
    try {
      // Confirmation supplémentaire
      if (confirm('ATTENTION: Toutes les données seront définitivement supprimées. Cette action est irréversible. Continuer?')) {
        // Appeler la méthode de nettoyage
        indexedDBService.clearAllData().then(() => {
          alert('Toutes les données ont été supprimées avec succès !');
          // Recharger la page après suppression
          setTimeout(() => window.location.reload(), 1000);
        }).catch(error => {
          console.error('Erreur lors de la suppression des données:', error);
          alert(`Erreur lors de la suppression des données: ${error.message}`);
        });
      }
    } catch (error) {
      console.error('Erreur lors de la suppression des données:', error);
      alert(`Erreur lors de la suppression des données: ${error.message}`);
    }
    setShowClearConfirm(false);
  };

  const confirmClearData = () => {
    setShowClearConfirm(true);
  };

  const getBackupButtonContent = () => {
    switch (backupStatus) {
      case 'creating':
        return (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            <span>Création...</span>
          </>
        );
      case 'success':
        return (
          <>
            <CheckCircle className="h-4 w-4" />
            <span>Sauvegarde Créée !</span>
          </>
        );
      case 'error':
        return (
          <>
            <AlertTriangle className="h-4 w-4" />
            <span>Erreur</span>
          </>
        );
      default:
        return (
          <>
            <Save className="h-4 w-4" />
            <span>Créer Sauvegarde</span>
          </>
        );
    }
  };

  const getBackupButtonClass = () => {
    switch (backupStatus) {
      case 'creating':
        return 'bg-blue-400 cursor-not-allowed';
      case 'success':
        return 'bg-green-600 hover:bg-green-700';
      case 'error':
        return 'bg-red-600 hover:bg-red-700';
      default:
        return 'bg-purple-600 hover:bg-purple-700';
    }
  };

  const getStorageColor = () => {
    if (!storageInfo) return 'bg-gray-400';
    const usage = parseFloat(storageInfo.usagePercent);
    if (usage >= 90) return 'bg-red-500';
    if (usage >= 75) return 'bg-amber-500';
    if (usage >= 50) return 'bg-blue-500';
    return 'bg-green-500';
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center space-x-3 mb-6">
        <Package className="h-6 w-6 text-blue-600" />
        <h2 className="text-xl font-semibold text-gray-900">Informations du Package</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Informations du package */}
        <div className="space-y-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-3 flex items-center">
              <Info className="h-5 w-5 mr-2" />
              Package
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Nom:</span>
                <span className="font-medium">{packageInfo.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Version:</span>
                <span className="font-medium">{packageInfo.version}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Auteur:</span>
                <span className="font-medium">{packageInfo.author}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Build:</span>
                <span className="font-medium">
                  {new Date(packageInfo.buildDate).toLocaleDateString('fr-FR')}
                </span>
              </div>
            </div>
          </div>

          {/* Fonctionnalités */}
          <div className="bg-green-50 p-4 rounded-lg">
            <h3 className="font-semibold text-green-900 mb-3">Fonctionnalités</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {Object.entries(packageManager.getFeatures()).map(([feature, enabled]) => (
                <div key={feature} className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${enabled ? 'bg-green-500' : 'bg-gray-300'}`} />
                  <span className={enabled ? 'text-green-700' : 'text-gray-500'}>
                    {feature.charAt(0).toUpperCase() + feature.slice(1)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Stockage et sauvegarde */}
        <div className="space-y-4">
          {storageInfo && (
            <div className="bg-purple-50 p-4 rounded-lg">
              <h3 className="font-semibold text-purple-900 mb-3 flex items-center">
                <HardDrive className="h-5 w-5 mr-2" />
                Stockage Local
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Utilisé:</span>
                  <span className="font-medium">{storageInfo.totalSize}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Quota max:</span>
                  <span className="font-medium">100 MB</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Disponible:</span>
                  <span className="font-medium">{storageInfo.availableSpace}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Éléments:</span>
                  <span className="font-medium">{storageInfo.itemCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Utilisation:</span>
                  <span className={`font-medium ${parseFloat(storageInfo.usagePercent) >= 90 ? 'text-red-600' : parseFloat(storageInfo.usagePercent) >= 75 ? 'text-amber-600' : 'text-green-600'}`}>
                    {storageInfo.usagePercent}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3 mt-2">
                  <div 
                    className={`h-3 rounded-full transition-all duration-300 ${getStorageColor()}`}
                    style={{ width: `${Math.min(parseFloat(storageInfo.usagePercent), 100)}%` }}
                  />
                </div>
                {storageInfo.quotaExceeded && (
                  <div className="flex items-center space-x-2 mt-2 p-2 bg-red-100 rounded-lg">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    <span className="text-red-700 text-xs font-medium">Quota dépassé ! Nettoyage automatique activé.</span>
                  </div>
                )}
                {parseFloat(storageInfo.usagePercent) >= 75 && !storageInfo.quotaExceeded && (
                  <div className="flex items-center space-x-2 mt-2 p-2 bg-amber-100 rounded-lg">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    <span className="text-amber-700 text-xs font-medium">Espace de stockage bientôt plein.</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
              <Database className="h-5 w-5 mr-2" />
              Actions
            </h3>
            <div className="space-y-3">
              <button
                onClick={handleExportData}
                className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
              >
                <Download className="h-4 w-4" />
                <span>Exporter les Données</span>
              </button>
              
              <label className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center space-x-2 cursor-pointer">
                <Upload className="h-4 w-4" />
                <span>Importer les Données</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportData}
                  className="hidden"
                />
              </label>
              
              <button
                onClick={createBackup}
                disabled={backupStatus === 'creating'}
                className={`w-full text-white px-4 py-2 rounded-lg transition-colors flex items-center justify-center space-x-2 ${getBackupButtonClass()}`}
              >
                {getBackupButtonContent()}
              </button>

              <button
                onClick={confirmClearData}
                className="w-full bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center space-x-2"
              >
                <Trash2 className="h-4 w-4" />
                <span>Vider Toutes les Données</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de confirmation pour vider les données */}
      {showClearConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center space-x-3 mb-4">
                <AlertTriangle className="h-8 w-8 text-red-600" />
                <h3 className="text-xl font-semibold text-gray-900">Confirmation</h3>
              </div>
              
              <div className="mb-6">
                <p className="text-gray-700 mb-3">
                  <strong>Attention !</strong> Cette action va supprimer définitivement toutes les données de l'application :
                </p>
                <ul className="text-sm text-gray-600 space-y-1 ml-4">
                  <li>• Tous les produits</li>
                  <li>• Toutes les ventes</li>
                  <li>• Tous les achats</li>
                  <li>• Tous les stocks</li>
                  <li>• Toutes les dépenses</li>
                  <li>• Tous les emballages</li>
                  <li>• Toutes les licences</li>
                  <li>• Tous les paramètres</li>
                  <li>• Tous les utilisateurs (sauf le propriétaire)</li>
                </ul>
                <p className="text-red-600 font-semibold mt-3">
                  Cette action est irréversible !
                </p>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowClearConfirm(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleClearAllData}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center space-x-2"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>Confirmer la Suppression</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PackageInfo;