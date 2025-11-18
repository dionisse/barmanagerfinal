import { supabaseService } from './supabaseService';

export class SyncService {
  private syncInterval: number = 5 * 60 * 1000; // 5 minutes
  private intervalId: NodeJS.Timeout | null = null;
  private currentUserId: string | null = null;

  startAutoSync(userId: string) {
    this.currentUserId = userId;
    this.stopAutoSync(); // Arrêter toute synchronisation précédente
    
    // Synchroniser immédiatement
    this.syncToCloud();
    
    // Puis synchroniser périodiquement
    this.intervalId = setInterval(() => {
      this.syncToCloud();
    }, this.syncInterval);
    
    console.log('🔄 Synchronisation automatique activée');
  }

  stopAutoSync() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.currentUserId = null;
    console.log('⏹️ Synchronisation automatique arrêtée');
  }

  async syncToCloud() {
    if (!this.currentUserId) return;

    try {
      // Collecter toutes les données locales
      const localData = this.collectLocalData();
      
      // Envoyer vers le cloud
      const result = await supabaseService.saveUserData(this.currentUserId, localData);
      
      if (result.success) {
        console.log('☁️ Données synchronisées vers le cloud');
        // Marquer la dernière synchronisation
        localStorage.setItem('gobex_last_sync', new Date().toISOString());
      } else {
        console.warn('⚠️ Échec de la synchronisation:', result.message);
      }
    } catch (error) {
      console.error('❌ Erreur lors de la synchronisation:', error);
    }
  }

  async syncFromCloud(userId: string) {
    try {
      const result = await supabaseService.getUserData(userId);
      
      if (result.success && result.data) {
        // Restaurer les données depuis le cloud
        this.restoreLocalData(result.data);
        console.log('📥 Données restaurées depuis le cloud');
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('❌ Erreur lors de la restauration:', error);
      return false;
    }
  }

  private collectLocalData() {
    const data: any = {};
    
    // Collecter toutes les données GOBEX du localStorage
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('gobex_') && !key.includes('current_user') && !key.includes('last_sync')) {
        const value = localStorage.getItem(key);
        if (value) {
          data[key] = value;
        }
      }
    }
    
    return data;
  }

  private restoreLocalData(data: any) {
    // Restaurer les données dans le localStorage
    Object.entries(data).forEach(([key, value]) => {
      if (typeof value === 'string') {
        localStorage.setItem(key, value);
      }
    });
  }

  async manualSync(userId: string) {
    try {
      // Synchroniser vers le cloud
      await this.syncToCloud();
      
      // Puis récupérer les dernières données
      await this.syncFromCloud(userId);
      
      return { success: true, message: 'Synchronisation manuelle réussie' };
    } catch (error) {
      console.error('Erreur lors de la synchronisation manuelle:', error);
      return { success: false, message: 'Erreur lors de la synchronisation' };
    }
  }

  getLastSyncTime(): string | null {
    return localStorage.getItem('gobex_last_sync');
  }

  isOnline(): boolean {
    return navigator.onLine;
  }
}

export const syncService = new SyncService();