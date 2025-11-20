import { cloudSyncService } from './cloudSyncService';

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
      const products = JSON.parse(localStorage.getItem('gobex_products') || '[]');
      products.push(product);
      localStorage.setItem('gobex_products', JSON.stringify(products));
    });
  }

  async updateProduct(product: any): Promise<void> {
    return this.performDataOperation(async () => {
      const products = JSON.parse(localStorage.getItem('gobex_products') || '[]');
      const index = products.findIndex((p: any) => p.id === product.id);
      if (index !== -1) {
        products[index] = product;
        localStorage.setItem('gobex_products', JSON.stringify(products));
      }
    });
  }

  async addSale(sale: any): Promise<void> {
    return this.performDataOperation(async () => {
      const sales = JSON.parse(localStorage.getItem('gobex_sales') || '[]');
      sales.push(sale);
      localStorage.setItem('gobex_sales', JSON.stringify(sales));
    });
  }

  async addPurchase(purchase: any): Promise<void> {
    return this.performDataOperation(async () => {
      const purchases = JSON.parse(localStorage.getItem('gobex_purchases') || '[]');
      purchases.push(purchase);
      localStorage.setItem('gobex_purchases', JSON.stringify(purchases));
    });
  }

  async addMultiPurchase(purchase: any): Promise<void> {
    return this.performDataOperation(async () => {
      const purchases = JSON.parse(localStorage.getItem('gobex_multi_purchases') || '[]');
      purchases.push(purchase);
      localStorage.setItem('gobex_multi_purchases', JSON.stringify(purchases));
    });
  }

  async addExpense(expense: any): Promise<void> {
    return this.performDataOperation(async () => {
      const expenses = JSON.parse(localStorage.getItem('gobex_expenses') || '[]');
      expenses.push(expense);
      localStorage.setItem('gobex_expenses', JSON.stringify(expenses));
    });
  }

  async updateSettings(settings: any): Promise<void> {
    return this.performDataOperation(async () => {
      localStorage.setItem('gobex_settings', JSON.stringify(settings));
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
      await cloudSyncService.manualSync(currentUser.id);
    }
  }
}

export const enhancedDataService = new EnhancedDataService();