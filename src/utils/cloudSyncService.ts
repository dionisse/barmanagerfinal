import { supabaseService } from './supabaseService';

export interface SyncResult {
  success: boolean;
  message: string;
  timestamp: string;
  dataCount?: number;
  errors?: string[];
}

export interface UserData {
  products: any[];
  sales: any[];
  purchases: any[];
  multiPurchases: any[];
  packaging: any[];
  packagingPurchases: any[];
  expenses: any[];
  inventoryRecords: any[];
  settings: any;
}

export class CloudSyncService {
  private syncInterval: number = 2 * 60 * 1000; // 2 minutes
  private intervalId: NodeJS.Timeout | null = null;
  private currentUserId: string | null = null;
  private isOnline: boolean = navigator.onLine;
  private pendingSync: boolean = false;
  private lastSyncAttempt: Date | null = null;
  private retryCount: number = 3;
  private retryDelay: number = 5000; // 5 secondes
  private debugMode: boolean = true;

  constructor() {
    // Écouter les changements de connectivité
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.handleOnlineStatusChange();
    });
    
    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.handleOnlineStatusChange();
    });
  }

  // Démarrer la synchronisation automatique
  startAutoSync(userId: string): void {
    this.currentUserId = userId;
    this.stopAutoSync();
    
    this.logDebug('🔄 Démarrage de la synchronisation automatique pour:', userId);
    
    // Synchroniser immédiatement
    this.performSync();
    
    // Puis synchroniser périodiquement
    this.intervalId = setInterval(() => {
      this.performSync();
    }, this.syncInterval);
  }

  // Arrêter la synchronisation automatique
  stopAutoSync(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.currentUserId = null;
    this.logDebug('⏹️ Synchronisation automatique arrêtée');
  }

  // Synchronisation manuelle
  async manualSync(userId: string): Promise<SyncResult> {
    this.currentUserId = userId;
    return await this.performSync(true);
  }

  // Effectuer la synchronisation
  private async performSync(isManual: boolean = false): Promise<SyncResult> {
    if (!this.currentUserId || this.pendingSync) {
      return {
        success: false,
        message: 'Synchronisation déjà en cours ou utilisateur non défini',
        timestamp: new Date().toISOString()
      };
    }

    if (!this.isOnline) {
      return {
        success: false,
        message: 'Hors ligne - synchronisation reportée',
        timestamp: new Date().toISOString()
      };
    }

    this.pendingSync = true;
    this.lastSyncAttempt = new Date();
    this.logDebug(`Début de synchronisation pour l'utilisateur ${this.currentUserId}`);

    try {
      // 1. Sauvegarder les données locales vers le cloud
      const uploadResult = await this.uploadLocalData();
      
      // 2. Récupérer les données du cloud (si plus récentes)
      const downloadResult = await this.downloadCloudData();

      const result: SyncResult = {
        success: uploadResult.success && downloadResult.success,
        message: `Upload: ${uploadResult.message}, Download: ${downloadResult.message}`,
        timestamp: new Date().toISOString(),
        dataCount: uploadResult.dataCount
      };

      if (result.success) {
        this.updateLastSyncTime();
        if (isManual) {
          this.showSyncNotification('✅ Synchronisation réussie');
        }
        this.logDebug('Synchronisation réussie');
      } else {
        this.logDebug('⚠️ Synchronisation partielle:', result.message);
      }

      return result;
    } catch (error) {
      this.logDebug('❌ Erreur de synchronisation:', error);
      return {
        success: false,
        message: `Erreur: ${error.message}`,
        timestamp: new Date().toISOString()
      };
    } finally {
      this.pendingSync = false;
    }
  }

  // Sauvegarder les données locales vers le cloud avec retry
  private async uploadLocalData(): Promise<SyncResult> {
    let lastError;
    
    for (let attempt = 0; attempt < this.retryCount; attempt++) {
      try {
        const localData = this.collectLocalData();
        this.logDebug(`Tentative d'upload #${attempt + 1} - Données collectées:`, Object.keys(localData).length, 'éléments');
        
        const result = await supabaseService.saveUserData(this.currentUserId!, localData);
        
        this.logDebug(`Upload réussi à la tentative #${attempt + 1}`);
        return {
          success: result.success,
          message: result.success ? 'Données sauvées dans le cloud' : result.message,
          timestamp: new Date().toISOString(),
          dataCount: Object.keys(localData).length
        };
      } catch (error) {
        this.logDebug(`Tentative ${attempt + 1}/${this.retryCount} échouée:`, error.message);
        lastError = error;
        
        if (attempt < this.retryCount - 1) {
          // Attendre avant de réessayer
          await new Promise(resolve => setTimeout(resolve, this.retryDelay));
        }
      }
    }
    
    return {
      success: false,
      message: `Erreur upload après ${this.retryCount} tentatives: ${lastError.message}`,
      timestamp: new Date().toISOString()
    };
  }

  // Télécharger les données du cloud avec retry
  private async downloadCloudData(): Promise<SyncResult> {
    let lastError;
    
    for (let attempt = 0; attempt < this.retryCount; attempt++) {
      try {
        this.logDebug(`Tentative de download #${attempt + 1}`);
        const result = await supabaseService.getUserData(this.currentUserId!);
        
        if (result.success && result.data) {
          const cloudLastSync = new Date(result.lastSync || 0);
          const localLastSync = new Date(this.getLastSyncTime() || 0);
          
          // Seulement restaurer si les données cloud sont plus récentes
          if (cloudLastSync > localLastSync) {
            this.restoreLocalData(result.data);
            this.logDebug(`Download réussi - Données plus récentes restaurées`);
            return {
              success: true,
              message: 'Données restaurées depuis le cloud',
              timestamp: new Date().toISOString()
            };
          } else {
            this.logDebug(`Download réussi - Données locales déjà à jour`);
            return {
              success: true,
              message: 'Données locales à jour',
              timestamp: new Date().toISOString()
            };
          }
        }
        
        this.logDebug(`Download réussi - Aucune donnée trouvée`);
        return {
          success: true,
          message: 'Aucune donnée cloud trouvée',
          timestamp: new Date().toISOString()
        };
      } catch (error) {
        this.logDebug(`Tentative de téléchargement ${attempt + 1}/${this.retryCount} échouée:`, error.message);
        lastError = error;
        
        if (attempt < this.retryCount - 1) {
          // Attendre avant de réessayer
          await new Promise(resolve => setTimeout(resolve, this.retryDelay));
        }
      }
    }
    
    return {
      success: false,
      message: `Erreur download après ${this.retryCount} tentatives: ${lastError.message}`,
      timestamp: new Date().toISOString()
    };
  }

  // Collecter toutes les données locales
  private collectLocalData(): UserData {
    const getData = (key: string) => {
      const data = localStorage.getItem(`gobex_${key}`);
      return data ? JSON.parse(data) : [];
    };

    const getSettings = () => {
      const data = localStorage.getItem('gobex_settings');
      return data ? JSON.parse(data) : {};
    };

    return {
      products: getData('products'),
      sales: getData('sales'),
      purchases: getData('purchases'),
      multiPurchases: getData('multi_purchases'),
      packaging: getData('packaging'),
      packagingPurchases: getData('packaging_purchases'),
      expenses: getData('expenses'),
      inventoryRecords: getData('inventory_records'),
      settings: getSettings()
    };
  }

  // Restaurer les données dans le localStorage
  private restoreLocalData(data: UserData): void {
    const setData = (key: string, value: any) => {
      localStorage.setItem(`gobex_${key}`, JSON.stringify(value));
    };

    if (data.products) setData('products', data.products);
    if (data.sales) setData('sales', data.sales);
    if (data.purchases) setData('purchases', data.purchases);
    if (data.multiPurchases) setData('multi_purchases', data.multiPurchases);
    if (data.packaging) setData('packaging', data.packaging);
    if (data.packagingPurchases) setData('packaging_purchases', data.packagingPurchases);
    if (data.expenses) setData('expenses', data.expenses);
    if (data.inventoryRecords) setData('inventory_records', data.inventoryRecords);
    if (data.settings) setData('settings', data.settings);

    this.logDebug('📥 Données restaurées depuis le cloud');
  }

  // Gérer les changements de statut en ligne/hors ligne
  private handleOnlineStatusChange(): void {
    if (this.isOnline && this.currentUserId) {
      this.logDebug('🌐 Connexion rétablie - synchronisation...');
      this.performSync();
    } else {
      this.logDebug('📴 Hors ligne - synchronisation suspendue');
    }
  }

  // Mettre à jour l'heure de dernière synchronisation
  private updateLastSyncTime(): void {
    localStorage.setItem('gobex_last_sync', new Date().toISOString());
  }

  // Obtenir l'heure de dernière synchronisation
  getLastSyncTime(): string | null {
    return localStorage.getItem('gobex_last_sync');
  }

  // Vérifier si en ligne
  isOnlineStatus(): boolean {
    return this.isOnline;
  }

  // Afficher une notification de synchronisation
  private showSyncNotification(message: string): void {
    // Créer une notification temporaire
    const notification = document.createElement('div');
    notification.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 transition-opacity duration-300';
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.style.opacity = '0';
      setTimeout(() => {
        document.body.removeChild(notification);
      }, 300);
    }, 3000);
  }

  // Forcer la synchronisation depuis le cloud (pour la première connexion)
  async forceDownloadFromCloud(userId: string): Promise<SyncResult> {
    try {
      this.logDebug(`Forçage du téléchargement des données pour l'utilisateur ${userId}`);
      const result = await supabaseService.getUserData(userId);
      
      if (result.success && result.data) {
        this.restoreLocalData(result.data);
        this.updateLastSyncTime();
        this.logDebug(`Téléchargement forcé réussi`);
        
        return {
          success: true,
          message: 'Données initiales récupérées depuis le cloud',
          timestamp: new Date().toISOString()
        };
      }
      
      this.logDebug(`Téléchargement forcé - aucune donnée trouvée`);
      return {
        success: true,
        message: 'Aucune donnée cloud trouvée - utilisation des données locales',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      this.logDebug(`Erreur lors du téléchargement forcé:`, error.message);
      return {
        success: false,
        message: `Erreur lors de la récupération: ${error.message}`,
        timestamp: new Date().toISOString()
      };
    }
  }

  // Obtenir le statut de synchronisation
  getSyncStatus(): {
    isActive: boolean;
    isOnline: boolean;
    lastSync: string | null;
    userId: string | null;
    lastAttempt: Date | null;
  } {
    return {
      isActive: !!this.intervalId,
      isOnline: this.isOnline,
      lastSync: this.getLastSyncTime(),
      userId: this.currentUserId,
      lastAttempt: this.lastSyncAttempt
    };
  }

  // Méthode pour les logs de debug
  private logDebug(...args: any[]): void {
    if (this.debugMode) {
      const timestamp = new Date().toISOString().split('T')[1].split('.')[0]; // Format HH:MM:SS
      console.log(`🔄 [CloudSyncService ${timestamp}]`, ...args);
    }
  }

  // Activer/désactiver le mode debug
  setDebugMode(enabled: boolean): void {
    this.debugMode = enabled;
  }
}

// Instance globale
export const cloudSyncService = new CloudSyncService();