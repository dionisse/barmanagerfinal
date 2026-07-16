import { supabaseService } from './supabaseService';
import { indexedDBService } from './indexedDBService';

export interface SyncResult {
  success: boolean;
  message: string;
  timestamp: string;
  dataCount?: number;
  errors?: string[];
}

export class EnhancedSyncService {
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
    if (!userId) {
      this.logDebug('❌ Impossible de démarrer la synchronisation: userId invalide');
      return;
    }
    
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
    if (!userId) {
      return {
        success: false,
        message: 'ID utilisateur invalide',
        timestamp: new Date().toISOString()
      };
    }

    this.currentUserId = userId;
    return await this.performSync(true);
  }

  // Upload uniquement (sans download) - utilisé après modifications locales
  async uploadOnly(userId: string): Promise<SyncResult> {
    if (!userId) {
      return {
        success: false,
        message: 'ID utilisateur invalide',
        timestamp: new Date().toISOString()
      };
    }

    this.currentUserId = userId;

    if (!this.isOnline) {
      console.log('[SYNC] Hors ligne - upload reporté');
      return {
        success: false,
        message: 'Hors ligne - upload reporté',
        timestamp: new Date().toISOString()
      };
    }

    try {
      console.log('[SYNC] Upload seulement vers le cloud...');
      const uploadResult = await this.uploadLocalData();

      if (uploadResult.success) {
        await indexedDBService.saveSyncMetadata({
          lastSync: new Date().toISOString(),
          userId: this.currentUserId,
          status: 'success'
        });
        console.log('[SYNC] Upload réussi');
      }

      return uploadResult;
    } catch (error) {
      console.error('[SYNC] Erreur lors de l\'upload:', error);
      return {
        success: false,
        message: `Erreur: ${error.message}`,
        timestamp: new Date().toISOString()
      };
    }
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
    
    // Mettre à jour le statut de synchronisation
    await indexedDBService.saveSyncMetadata({
      lastSync: new Date().toISOString(),
      userId: this.currentUserId,
      status: 'pending'
    });
    
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
        await indexedDBService.saveSyncMetadata({
          lastSync: new Date().toISOString(),
          userId: this.currentUserId,
          status: 'success'
        });
        
        if (isManual) {
          this.showSyncNotification('✅ Synchronisation réussie');
        }
        this.logDebug('Synchronisation réussie');
      } else {
        await indexedDBService.saveSyncMetadata({
          lastSync: new Date().toISOString(),
          userId: this.currentUserId,
          status: 'error',
          message: result.message
        });
        
        this.logDebug('⚠️ Synchronisation partielle:', result.message);
      }

      return result;
    } catch (error) {
      await indexedDBService.saveSyncMetadata({
        lastSync: new Date().toISOString(),
        userId: this.currentUserId,
        status: 'error',
        message: error.message
      });
      
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
    let connectionError = false;
    
    if (!navigator.onLine) {
      return {
        success: false,
        message: 'Hors ligne - impossible de synchroniser',
        timestamp: new Date().toISOString()
      };
    }
    
    for (let attempt = 0; attempt < this.retryCount; attempt++) {
      try {
        // Collecter toutes les données depuis IndexedDB
        const localData = await indexedDBService.collectAllData();

        // Vérifier la connectivité Supabase avant de tenter l'upload
        const isConnected = await supabaseService.testConnection();
        if (!isConnected) {
          connectionError = true;
          throw new Error('Impossible de se connecter à Supabase');
        }
        
        // Vérifier que les données sont valides avant l'envoi
        if (!localData || Object.keys(localData).length === 0) {
          this.logDebug('Aucune donnée locale à synchroniser');
          return {
            success: true,
            message: 'Aucune donnée locale à synchroniser',
            timestamp: new Date().toISOString(),
            dataCount: 0
          };
        }
        
        this.logDebug(`Tentative d'upload #${attempt + 1} - Données collectées:`, Object.keys(localData).length, 'éléments');
        
        // Vérifier que l'ID utilisateur est au bon format
        if (!this.currentUserId || !this.isValidUserId(this.currentUserId)) {
          throw new Error(`ID utilisateur invalide: ${this.currentUserId}`);
        }
        
        const result = await supabaseService.saveUserData(this.currentUserId, localData);
        
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

    // Si c'est une erreur de connexion et qu'on a fait toutes les tentatives,
    // on retourne un message plus explicite
    if (connectionError) {
      return {
        success: false,
        message: `Erreur de connexion à Supabase - vérifiez votre configuration`,
        timestamp: new Date().toISOString()
      };
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
    let connectionError = false;
    
    if (!navigator.onLine) {
      return {
        success: false,
        message: 'Hors ligne - impossible de télécharger',
        timestamp: new Date().toISOString()
      };
    }
    
    for (let attempt = 0; attempt < this.retryCount; attempt++) {
      try {
        this.logDebug(`Tentative de download #${attempt + 1}`);
        
        // Vérifier la connectivité Supabase avant de tenter le download
        const isConnected = await supabaseService.testConnection();
        if (!isConnected) {
          connectionError = true;
          throw new Error('Impossible de se connecter à Supabase');
        }
        
        // Vérifier que l'ID utilisateur est au bon format
        if (!this.currentUserId || !this.isValidUserId(this.currentUserId)) {
          throw new Error(`ID utilisateur invalide: ${this.currentUserId}`);
        }
        
        const result = await supabaseService.getUserData(this.currentUserId);
        
        if (result.success && result.data) {
          // Obtenir la dernière synchronisation locale
          const syncMetadata = await indexedDBService.getSyncMetadata();
          const localLastSync = syncMetadata?.lastSync ? new Date(syncMetadata.lastSync) : new Date(0);
          const cloudLastSync = result.lastSync ? new Date(result.lastSync) : new Date(0);
          
          // Seulement restaurer si les données cloud sont plus récentes
          this.logDebug(`Comparaison timestamps - Local: ${localLastSync.toISOString()}, Cloud: ${cloudLastSync.toISOString()}`);

          if (cloudLastSync > localLastSync) {
            this.logDebug(`📥 Les données cloud sont plus récentes - Restauration...`);
            await indexedDBService.restoreAllData(result.data);
            this.logDebug(`✅ Download réussi - Données plus récentes restaurées`);
            return {
              success: true,
              message: 'Données restaurées depuis le cloud',
              timestamp: new Date().toISOString()
            };
          } else {
            this.logDebug(`✓ Download réussi - Données locales déjà à jour (pas de restauration nécessaire)`);
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

    // Si c'est une erreur de connexion et qu'on a fait toutes les tentatives,
    // on retourne un message plus explicite
    if (connectionError) {
      return {
        success: false,
        message: `Erreur de connexion à Supabase - vérifiez votre configuration`,
        timestamp: new Date().toISOString()
      };
    }
    
    return {
      success: false,
      message: `Erreur download après ${this.retryCount} tentatives: ${lastError.message}`,
      timestamp: new Date().toISOString()
    };
  }

  // Gérer les changements de statut en ligne/hors ligne
  private handleOnlineStatusChange(): void {
    if (this.isOnline && this.currentUserId) {
      this.logDebug('🌐 Connexion internet rétablie - synchronisation...');
      this.performSync();
    } else {
      this.logDebug('📴 Hors ligne - synchronisation suspendue');
    }
  }

  // Forcer la synchronisation depuis le cloud (pour la première connexion)
  async forceDownloadFromCloud(userId: string): Promise<SyncResult> {
    if (!userId || !this.isValidUserId(userId)) {
      this.logDebug(`ID utilisateur invalide pour téléchargement forcé: ${userId}`);
      return {
        success: false,
        message: `ID utilisateur invalide: ${userId}`,
        timestamp: new Date().toISOString()
      };
    }

    try {
      if (!navigator.onLine) {
        this.logDebug(`Appareil hors ligne - téléchargement forcé impossible`);
        return {
          success: false,
          message: 'Hors ligne - impossible de télécharger les données',
          timestamp: new Date().toISOString()
        };
      }

      this.logDebug(`🔄 Synchronisation intelligente pour l'utilisateur ${userId}`);

      // Vérifier la connexion Supabase
      const isConnected = await supabaseService.testConnection();
      if (!isConnected) {
        this.logDebug(`❌ Impossible de se connecter à Supabase`);
        return {
          success: false,
          message: 'Impossible de se connecter à Supabase',
          timestamp: new Date().toISOString()
        };
      }

      // Récupérer les données locales avant de tout effacer
      const localData = await indexedDBService.collectAllData();
      const localMetadata = await indexedDBService.getSyncMetadata();
      const localDataCount = this.countDataItems(localData);

      // Récupérer les données du cloud
      const result = await supabaseService.getUserData(userId);

      if (result.success && result.data) {
        const cloudDataCount = this.countDataItems(result.data);
        const cloudLastSync = result.lastSync ? new Date(result.lastSync) : new Date(0);
        const localLastSync = localMetadata?.lastSync ? new Date(localMetadata.lastSync) : new Date(0);

        this.logDebug(`📊 Comparaison - Local: ${localLastSync.toISOString()} (${localDataCount} items), Cloud: ${cloudLastSync.toISOString()} (${cloudDataCount} items)`);

        // PROTECTION: Ne jamais écraser des données locales par des données cloud vides
        if (cloudDataCount === 0 && localDataCount > 0) {
          this.logDebug(`🛡️ Données cloud vides mais ${localDataCount} données locales - Conservation et upload vers le cloud`);
          await this.uploadCloudData();
          return {
            success: true,
            message: 'Données locales conservées et synchronisées vers le cloud (cloud était vide)',
            timestamp: new Date().toISOString()
          };
        }

        // Si les données cloud sont plus récentes ET non vides, les restaurer
        if (cloudLastSync > localLastSync && cloudDataCount > 0) {
          this.logDebug(`📥 Données cloud plus récentes et non vides - Restauration complète`);
          await indexedDBService.clearAllData();
          await indexedDBService.restoreAllData(result.data);

          await indexedDBService.saveSyncMetadata({
            lastSync: result.lastSync || new Date().toISOString(),
            userId: userId,
            status: 'success'
          });

          return {
            success: true,
            message: 'Données cloud restaurées (plus récentes)',
            timestamp: new Date().toISOString()
          };
        } else {
          // Données locales plus récentes - fusionner intelligemment
          this.logDebug(`💾 Données locales plus récentes - Conservation et fusion`);

          // Fusionner en gardant les données les plus complètes
          const mergedData = this.mergeData(localData, result.data);

          // Restaurer les données fusionnées
          await indexedDBService.clearAllData();
          await indexedDBService.restoreAllData(mergedData);

          // Synchroniser vers le cloud immédiatement
          await this.uploadCloudData();

          return {
            success: true,
            message: 'Données locales conservées et synchronisées',
            timestamp: new Date().toISOString()
          };
        }
      }

      // Pas de données cloud - conserver les données locales et les synchroniser
      this.logDebug(`⚠️  Aucune donnée cloud - Conservation des données locales`);

      // Synchroniser les données locales vers le cloud
      await this.uploadCloudData();

      return {
        success: true,
        message: 'Données locales conservées et synchronisées vers le cloud',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      this.logDebug(`❌ Erreur lors de la synchronisation:`, error.message);
      return {
        success: false,
        message: `Erreur lors de la synchronisation: ${error.message}`,
        timestamp: new Date().toISOString()
      };
    }
  }

  // Fusionner les données locales et cloud en gardant les plus complètes
  private countDataItems(data: any): number {
    if (!data) return 0;
    const keys = ['products', 'sales', 'purchases', 'multiPurchases', 'packaging',
                  'packagingPurchases', 'expenses', 'inventoryRecords', 'userLots', 'licenses', 'users'];
    let total = 0;
    for (const key of keys) {
      if (Array.isArray(data[key])) total += data[key].length;
    }
    return total;
  }

  private mergeData(localData: any, cloudData: any): any {
    const merged = { ...cloudData };

    // Pour chaque clé de données, garder celle qui a le plus d'éléments
    const keys = ['products', 'sales', 'purchases', 'multiPurchases', 'packaging',
                  'packagingPurchases', 'expenses', 'inventoryRecords', 'userLots', 'licenses', 'users'];

    for (const key of keys) {
      const localArray = Array.isArray(localData[key]) ? localData[key] : [];
      const cloudArray = Array.isArray(cloudData[key]) ? cloudData[key] : [];

      // Garder le tableau le plus long (plus de données)
      if (localArray.length > cloudArray.length) {
        this.logDebug(`📦 ${key}: Conservation des données locales (${localArray.length} vs ${cloudArray.length})`);
        merged[key] = localArray;
      } else if (cloudArray.length > 0) {
        this.logDebug(`☁️  ${key}: Utilisation des données cloud (${cloudArray.length} vs ${localArray.length})`);
        merged[key] = cloudArray;
      } else {
        merged[key] = localArray;
      }
    }

    // Pour les settings, fusionner les objets
    merged.settings = {
      ...(cloudData.settings || {}),
      ...(localData.settings || {})
    };

    return merged;
  }

  // Méthode pour upload avec gestion d'erreurs améliorée
  private async uploadCloudData(): Promise<SyncResult> {
    try {
      const localData = await indexedDBService.collectAllData();

      if (!this.currentUserId || !this.isValidUserId(this.currentUserId)) {
        throw new Error(`ID utilisateur invalide: ${this.currentUserId}`);
      }

      const result = await supabaseService.saveUserData(this.currentUserId, localData);

      await indexedDBService.saveSyncMetadata({
        lastSync: new Date().toISOString(),
        userId: this.currentUserId,
        status: 'success'
      });

      this.logDebug(`✅ Upload vers le cloud réussi`);

      return {
        success: result.success,
        message: result.success ? 'Données sauvées dans le cloud' : result.message,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      this.logDebug(`❌ Erreur lors de l'upload vers le cloud:`, error.message);
      return {
        success: false,
        message: `Erreur upload: ${error.message}`,
        timestamp: new Date().toISOString()
      };
    }
  }

  // Obtenir le statut de synchronisation
  async getSyncStatus(): Promise<{
    isActive: boolean;
    isOnline: boolean;
    lastSync: string | null;
    userId: string | null;
    lastAttempt: Date | null;
    status: 'success' | 'error' | 'pending' | null;
    message?: string;
  }> {
    const syncMetadata = await indexedDBService.getSyncMetadata();
    
    return {
      isActive: !!this.intervalId,
      isOnline: this.isOnline,
      lastSync: syncMetadata?.lastSync || null,
      userId: this.currentUserId,
      lastAttempt: this.lastSyncAttempt,
      status: syncMetadata?.status || null,
      message: syncMetadata?.message
    };
  }

  // Vérifier si l'ID utilisateur est au format valide
  private isValidUserId(userId: string): boolean {
    // Format propriétaire: owner-001
    if (userId === 'owner-001') return true;

    // Format user_lot_id: UL-XXXXXX (format actuel)
    if (userId.startsWith('UL-') && userId.length > 3) return true;

    // Format legacy: userLotId_userType (ex: 1750741015407_gestionnaire)
    const parts = userId.split('_');
    return parts.length === 2 &&
           parts[0].length > 0 &&
           (parts[1] === 'gestionnaire' || parts[1] === 'employe' || parts[1] === 'employé');
  }

  // Méthode pour les logs de debug
  private logDebug(...args: any[]): void {
    if (this.debugMode) {
      const timestamp = new Date().toISOString().split('T')[1].split('.')[0]; // Format HH:MM:SS
      console.log(`🔄 [EnhancedSyncService ${timestamp}]`, ...args);
    }
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
        if (document.body.contains(notification)) {
          document.body.removeChild(notification);
        }
      }, 300);
    }, 3000);
  }

  // Activer/désactiver le mode debug
  setDebugMode(enabled: boolean): void {
    this.debugMode = enabled;
  }
}

// Instance globale
export const enhancedSyncService = new EnhancedSyncService();