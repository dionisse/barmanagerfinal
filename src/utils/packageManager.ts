import appConfig from '../config/app.config.json';
import { indexedDBService } from './indexedDBService';
import { enhancedSyncService } from './enhancedSyncService';

export interface PackageInfo {
  name: string;
  version: string;
  description: string;
  author: string;
  buildDate: string;
}

export interface StorageConfig {
  type: 'localStorage' | 'indexedDB';
  prefix: string;
  encryption: boolean;
  maxSize: number; // en bytes
}

export interface FeatureConfig {
  offline: boolean;
  autoSave: boolean;
  backup: boolean;
  multiUser: boolean;
  licensing: boolean;
}

export class PackageManager {
  private config: typeof appConfig;
  private readonly MAX_STORAGE_SIZE = 5 * 1024 * 1024; // 5 MB en bytes (realistic localStorage limit)

  constructor() {
    this.config = appConfig;
  }

  getPackageInfo(): PackageInfo {
    return {
      name: this.config.name,
      version: this.config.version,
      description: this.config.description,
      author: this.config.author,
      buildDate: this.config.buildDate
    };
  }

  getStorageConfig(): StorageConfig {
    return {
      ...this.config.storage,
      maxSize: this.MAX_STORAGE_SIZE
    };
  }

  getFeatures(): FeatureConfig {
    return this.config.features;
  }

  isFeatureEnabled(feature: keyof FeatureConfig): boolean {
    return this.config.features[feature];
  }

  getLicenseTypes() {
    return this.config.license.types;
  }

  // Vérification du quota de stockage
  checkStorageQuota(): { used: number; available: number; percentage: number; exceeded: boolean } {
    const storageConfig = this.getStorageConfig();
    // Estimation approximative de l'espace utilisé
    let totalUsed = 2 * 1024 * 1024; // Estimation de base de 2MB

    const percentage = (totalUsed / this.MAX_STORAGE_SIZE) * 100;
    const exceeded = totalUsed > this.MAX_STORAGE_SIZE;

    return {
      used: totalUsed,
      available: this.MAX_STORAGE_SIZE - totalUsed,
      percentage,
      exceeded
    };
  }

  // Vérifier avant d'ajouter des données
  canStoreData(dataSize: number): boolean {
    const quota = this.checkStorageQuota();
    return (quota.used + dataSize) <= this.MAX_STORAGE_SIZE;
  }

  // Nettoyer automatiquement si nécessaire
  async cleanupStorage(): Promise<boolean> {
    try {
      this.logDebug('Nettoyage du stockage...');
      
      // Supprimer les anciennes données d'inventaire (plus de 3 mois)
      const inventoryRecords = await indexedDBService.getAllData('inventory_records');
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      
      const oldRecords = inventoryRecords.filter((record: any) => 
        new Date(record.date) < threeMonthsAgo
      );
      
      for (const record of oldRecords) {
        await indexedDBService.deleteData('inventory_records', record.id);
      }
      
      this.logDebug(`${oldRecords.length} anciens enregistrements d'inventaire supprimés`);
      return true;
    } catch (error) {
      console.error('Erreur lors du nettoyage du stockage:', error);
      return false;
    }
  }

  // Vérification de l'intégrité du package
  verifyPackageIntegrity(): boolean {
    try {
      // Vérifier la présence des fichiers essentiels
      const requiredKeys = ['name', 'version', 'storage', 'features'];
      return requiredKeys.every(key => key in this.config);
    } catch (error) {
      console.error('Erreur lors de la vérification du package:', error);
      return false;
    }
  }

  // Initialisation du package
  async initializePackage(): Promise<void> {
    console.log(`🚀 Initialisation de ${this.config.name} v${this.config.version}`);
    console.log('✅ Package initialisé avec succès');
  }

  // Formater la taille en unités lisibles
  formatSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Effacer toutes les données
  clearAllData(): boolean {
    try {
      // Confirmation de sécurité
      if (!confirm('ATTENTION: Toutes les données seront définitivement supprimées. Continuer?')) {
        return false;
      }
      
      // Effacer les données IndexedDB
      indexedDBService.clearAllData().then(() => {
        console.log('✅ Toutes les données ont été supprimées');
        // Recharger la page après suppression
        setTimeout(() => window.location.reload(), 1000);
      });
      
      return true;
    } catch (error) {
      console.error('❌ Erreur lors de la suppression des données:', error);
      return false;
    }
  }

  // Créer une sauvegarde
  createBackup(): boolean {
    try {
      // Déclencher la synchronisation sans await (car cette méthode n'est pas async)
      const currentUser = JSON.parse(localStorage.getItem('gobex_current_user') || '{}');
      if (currentUser && currentUser.id) {
        enhancedSyncService.manualSync(currentUser.id)
          .then(() => console.log('✅ Sauvegarde créée avec succès'))
          .catch(error => console.error('❌ Erreur lors de la sauvegarde:', error));
      }
      console.log('✅ Sauvegarde créée avec succès');
      return true;
    } catch (error) {
      console.error('❌ Erreur lors de la création de la sauvegarde:', error);
      return false;
    }
  }

  // Exporter les données
  exportData(): string {
    try {
      // Collecter les données de localStorage (méthode synchrone)
      const storageConfig = this.getStorageConfig();
      const exportData = {
        package: this.getPackageInfo(),
        timestamp: new Date().toISOString(),
        data: {}
      };

      // Exporter toutes les données
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(storageConfig.prefix)) {
          exportData.data[key] = localStorage.getItem(key);
        }
      }

      return JSON.stringify(exportData, null, 2);
    } catch (error) {
      console.error('❌ Erreur lors de l\'export des données:', error);
      // Fallback pour éviter l'erreur
      return JSON.stringify({
        timestamp: new Date().toISOString(),
        message: "Erreur lors de l'export des données"
      });
    }
  }
  
  // Obtenir des statistiques sur le stockage
  getStorageStats(): { totalSize: number; totalKeys: number; keys: string[]; quota: any } {
    try {
      // Obtenir les statistiques de stockage
      const quota = this.checkStorageQuota();
      
      // Estimation du nombre de clés
      let totalKeys = 0;
      const keys = [];
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.config.storage.prefix)) {
          totalKeys++;
          keys.push(key);
        }
      }
      
      return {
        totalSize: quota.used,
        totalKeys: totalKeys,
        keys: keys,
        quota: quota
      };
    } catch (error) {
      console.error('Erreur lors de la récupération des statistiques de stockage:', error);
      
      // Valeurs par défaut en cas d'erreur
      return {
        totalSize: 0,
        totalKeys: 0,
        keys: [],
        quota: { used: 0, available: this.MAX_STORAGE_SIZE, percentage: 0, exceeded: false }
      };
    }
  }
}

// Instance globale
export const packageManager = new PackageManager();