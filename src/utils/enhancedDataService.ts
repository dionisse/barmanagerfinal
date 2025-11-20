import { cloudSyncService } from './cloudSyncService';
import { storageService } from './storageService';

// Service de données amélioré avec synchronisation automatique
export class EnhancedDataService {
  private autoSyncEnabled: boolean = true;

  // Wrapper pour les opérations de données avec auto-sync
  private async performDataOperation<T>(
    operation: () => Promise<T>,
    syncTrigger: boolean = true
  ): Promise<T> {
    const result = await operation();
    
    // Déclencher la synchronisation si activée et utilisateur connecté
    if (syncTrigger && this.autoSyncEnabled) {
      const currentUser = this.getCurrentUser();
      if (currentUser && currentUser.type !== 'Propriétaire') {
        // Synchroniser après un court délai pour éviter les conflits
        // Utiliser userLotId pour isolation des données entre groupes
        const syncId = currentUser.userLotId || currentUser.id;
        setTimeout(() => {
          cloudSyncService.manualSync(syncId);
        }, 1000);
      }
    }
    
    return result;
  }

  private getCurrentUser() {
    const userData = localStorage.getItem('gobex_current_user');
    return userData ? JSON.parse(userData) : null;
  }

  // Méthodes de données avec synchronisation automatique
  async addProduct(product: any): Promise<void> {
    return this.performDataOperation(async () => {
      const products = storageService.getJSON<any[]>('products', []);
      products.push(product);
      storageService.setJSON('products', products);
    });
  }

  async updateProduct(product: any): Promise<void> {
    return this.performDataOperation(async () => {
      const products = storageService.getJSON<any[]>('products', []);
      const index = products.findIndex((p: any) => p.id === product.id);
      if (index !== -1) {
        products[index] = product;
        storageService.setJSON('products', products);
      }
    });
  }

  async addSale(sale: any): Promise<void> {
    return this.performDataOperation(async () => {
      const sales = storageService.getJSON<any[]>('sales', []);
      sales.push(sale);
      storageService.setJSON('sales', sales);
    });
  }

  async addPurchase(purchase: any): Promise<void> {
    return this.performDataOperation(async () => {
      const purchases = storageService.getJSON<any[]>('purchases', []);
      purchases.push(purchase);
      storageService.setJSON('purchases', purchases);
    });
  }

  async addMultiPurchase(purchase: any): Promise<void> {
    return this.performDataOperation(async () => {
      const purchases = storageService.getJSON<any[]>('multi_purchases', []);
      purchases.push(purchase);
      storageService.setJSON('multi_purchases', purchases);
    });
  }

  async addExpense(expense: any): Promise<void> {
    return this.performDataOperation(async () => {
      const expenses = storageService.getJSON<any[]>('expenses', []);
      expenses.push(expense);
      storageService.setJSON('expenses', expenses);
    });
  }

  async updateSettings(settings: any): Promise<void> {
    return this.performDataOperation(async () => {
      storageService.setJSON('settings', settings);
    });
  }

  // Activer/désactiver la synchronisation automatique
  setAutoSync(enabled: boolean): void {
    this.autoSyncEnabled = enabled;
  }

  // Forcer la synchronisation manuelle
  async forcSync(): Promise<void> {
    const currentUser = this.getCurrentUser();
    if (currentUser && currentUser.type !== 'Propriétaire') {
      const syncId = currentUser.userLotId || currentUser.id;
      await cloudSyncService.manualSync(syncId);
    }
  }
}

export const enhancedDataService = new EnhancedDataService();