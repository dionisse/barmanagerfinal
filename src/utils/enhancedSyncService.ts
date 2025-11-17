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
          if (cloudLastSync > localLastSync) {
            await indexedDBService.restoreAllData(result.data);
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
      
      this.logDebug(`Forçage du téléchargement des données pour l'utilisateur ${userId}`);
      const result = await supabaseService.getUserData(userId);
      
      if (result.success && result.data) {
        await indexedDBService.restoreAllData(result.data);
        await indexedDBService.saveSyncMetadata({
          lastSync: new Date().toISOString(),
          userId: userId,
          status: 'success'
        });
        
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

  // Vérifier si l'ID utilisateur est au format valide (userLotId_userType)
  private isValidUserId(userId: string): boolean {
    // Format attendu: userLotId_userType (ex: 1750741015407_gestionnaire)
    // Ou format propriétaire: owner-001
    if (userId === 'owner-001') return true;
    
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