import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface GobexDB extends DBSchema {
  products: {
    key: string;
    value: any;
    indexes: { 'by-id': string };
  };
  sales: {
    key: string;
    value: any;
    indexes: { 'by-id': string };
  };
  purchases: {
    key: string;
    value: any;
    indexes: { 'by-id': string };
  };
  multi_purchases: {
    key: string;
    value: any;
    indexes: { 'by-id': string };
  };
  packaging: {
    key: string;
    value: any;
    indexes: { 'by-id': string };
  };
  packaging_purchases: {
    key: string;
    value: any;
    indexes: { 'by-id': string };
  };
  expenses: {
    key: string;
    value: any;
    indexes: { 'by-id': string };
  };
  inventory_records: {
    key: string;
    value: any;
    indexes: { 'by-id': string };
  };
  settings: {
    key: string;
    value: any;
  };
  sync_metadata: {
    key: string;
    value: {
      lastSync: string;
      userId: string;
      status: 'success' | 'error' | 'pending';
      message?: string;
    };
  };
  user_lots: {
    key: string;
    value: any;
    indexes: { 'by-id': string };
  };
  licenses: {
    key: string;
    value: any;
    indexes: { 'by-id': string };
  };
  users: {
    key: string;
    value: any;
    indexes: { 'by-id': string, 'by-username': string };
  };
  stock_sales_calculations: {
    key: string;
    value: any;
    indexes: { 'by-id': string };
  };
}

export class IndexedDBService {
  private baseDbName = 'gobex-db';
  private dbVersion = 4;
  private db: IDBPDatabase<GobexDB> | null = null;
  private debugMode = true;
  private currentUserLotId: string | null = null;

  constructor() {
    // Don't initialize DB in constructor - wait for user_lot_id
  }

  // Set user lot ID and initialize appropriate database
  async setUserLotId(userLotId: string | null): Promise<void> {
    this.currentUserLotId = userLotId;
    await this.initDB();
    this.logDebug(`💾 IndexedDB: Switched to database for user lot ${userLotId || 'owner'}`);
  }

  // Get database name with user_lot_id prefix for isolation
  private getDbName(): string {
    if (!this.currentUserLotId) {
      return `${this.baseDbName}-owner`;
    }
    return `${this.baseDbName}-${this.currentUserLotId}`;
  }

  private async initDB(): Promise<void> {
    try {
      const dbName = this.getDbName();
      this.db = await openDB<GobexDB>(dbName, this.dbVersion, {
        upgrade: (db, oldVersion, newVersion, transaction) => {
          this.logDebug(`Mise à niveau de la base de données de la version ${oldVersion} vers ${newVersion}`);
          
          // Créer les stores d'objets s'ils n'existent pas
          if (!db.objectStoreNames.contains('products')) {
            const productStore = db.createObjectStore('products', { keyPath: 'id' });
            productStore.createIndex('by-id', 'id');
          }

          if (!db.objectStoreNames.contains('sales')) {
            const salesStore = db.createObjectStore('sales', { keyPath: 'id' });
            salesStore.createIndex('by-id', 'id');
          }

          if (!db.objectStoreNames.contains('purchases')) {
            const purchasesStore = db.createObjectStore('purchases', { keyPath: 'id' });
            purchasesStore.createIndex('by-id', 'id');
          }

          if (!db.objectStoreNames.contains('multi_purchases')) {
            const multiPurchasesStore = db.createObjectStore('multi_purchases', { keyPath: 'id' });
            multiPurchasesStore.createIndex('by-id', 'id');
          }

          if (!db.objectStoreNames.contains('packaging')) {
            const packagingStore = db.createObjectStore('packaging', { keyPath: 'id' });
            packagingStore.createIndex('by-id', 'id');
          }

          if (!db.objectStoreNames.contains('packaging_purchases')) {
            const packagingPurchasesStore = db.createObjectStore('packaging_purchases', { keyPath: 'id' });
            packagingPurchasesStore.createIndex('by-id', 'id');
          }

          if (!db.objectStoreNames.contains('expenses')) {
            const expensesStore = db.createObjectStore('expenses', { keyPath: 'id' });
            expensesStore.createIndex('by-id', 'id');
          }

          if (!db.objectStoreNames.contains('inventory_records')) {
            const inventoryRecordsStore = db.createObjectStore('inventory_records', { keyPath: 'id' });
            inventoryRecordsStore.createIndex('by-id', 'id');
          }

          if (!db.objectStoreNames.contains('settings')) {
            db.createObjectStore('settings', { keyPath: 'key' });
          }

          if (!db.objectStoreNames.contains('sync_metadata')) {
            db.createObjectStore('sync_metadata', { keyPath: 'key' });
          }
          
          // Nouveaux stores pour la version 2
          if (oldVersion < 2) {
            // Recréer le store sync_metadata avec la bonne configuration si nécessaire
            if (db.objectStoreNames.contains('sync_metadata')) {
              db.deleteObjectStore('sync_metadata');
            }
            db.createObjectStore('sync_metadata', { keyPath: 'key' });
            
            if (!db.objectStoreNames.contains('user_lots')) {
              const userLotsStore = db.createObjectStore('user_lots', { keyPath: 'id' });
              userLotsStore.createIndex('by-id', 'id');
            }
            
            if (!db.objectStoreNames.contains('licenses')) {
              const licensesStore = db.createObjectStore('licenses', { keyPath: 'id' });
              licensesStore.createIndex('by-id', 'id');
            }
            
            if (!db.objectStoreNames.contains('users')) {
              const usersStore = db.createObjectStore('users', { keyPath: 'id' });
              usersStore.createIndex('by-id', 'id');
              usersStore.createIndex('by-username', 'username', { unique: true });
            }
            
            // Migrer les données du localStorage vers IndexedDB
            this.migrateFromLocalStorage(transaction);
          }
          
          // Correction pour la version 3 - Recréer le store settings
          if (oldVersion < 3) {
            // Supprimer et recréer le store settings pour corriger la configuration des clés
            if (db.objectStoreNames.contains('settings')) {
              db.deleteObjectStore('settings');
            }
            db.createObjectStore('settings', { keyPath: 'key' });

            this.logDebug('Store settings recréé avec keyPath correct');
          }

          // Version 4 - Ajouter le store pour les calculs de ventes basés sur le stock
          if (oldVersion < 4) {
            if (!db.objectStoreNames.contains('stock_sales_calculations')) {
              const stockSalesStore = db.createObjectStore('stock_sales_calculations', { keyPath: 'id' });
              stockSalesStore.createIndex('by-id', 'id');
              this.logDebug('Store stock_sales_calculations créé');
            }
          }
        },
      });

      this.logDebug('IndexedDB initialisée avec succès');
    } catch (error) {
      console.error('Erreur lors de l\'initialisation d\'IndexedDB:', error);
    }
  }
  
  // Méthode pour migrer les données du localStorage vers IndexedDB
  private migrateFromLocalStorage(transaction: any): void {
    try {
      this.logDebug('Migration des données depuis localStorage vers IndexedDB');
      
      // Liste des clés à migrer
      const keysToMigrate = [
        { localKey: 'gobex_products', store: 'products' },
        { localKey: 'gobex_sales', store: 'sales' },
        { localKey: 'gobex_purchases', store: 'purchases' },
        { localKey: 'gobex_multi_purchases', store: 'multi_purchases' },
        { localKey: 'gobex_packaging', store: 'packaging' },
        { localKey: 'gobex_packaging_purchases', store: 'packaging_purchases' },
        { localKey: 'gobex_expenses', store: 'expenses' },
        { localKey: 'gobex_inventory_records', store: 'inventory_records' },
        { localKey: 'gobex_settings', store: 'settings', isObject: true },
        { localKey: 'gobex_user_lots', store: 'user_lots' },
        { localKey: 'gobex_licenses', store: 'licenses' },
        { localKey: 'gobex_users', store: 'users' }
      ];
      
      for (const { localKey, store, isObject } of keysToMigrate) {
        const data = localStorage.getItem(localKey);
        if (data) {
          const parsedData = JSON.parse(data);
          
          if (isObject) {
            // Pour les objets simples comme les paramètres
            transaction.objectStore(store).put({ key: 'app_settings', value: parsedData });
          } else if (Array.isArray(parsedData)) {
            // Pour les tableaux d'objets
            for (const item of parsedData) {
              if (item && item.id) {
                transaction.objectStore(store).put(item);
              }
            }
          }
          
          this.logDebug(`Migré ${localKey} vers ${store}`);
        }
      }
      
      // Migrer les métadonnées de synchronisation
      const lastSync = localStorage.getItem('gobex_last_sync');
      if (lastSync) {
        transaction.objectStore('sync_metadata').put({
          key: 'last_sync',
          lastSync: lastSync,
          userId: localStorage.getItem('gobex_current_user_id') || null,
          status: 'success'
        });
      }
      
      this.logDebug('Migration terminée');
    } catch (error) {
      console.error('Erreur lors de la migration depuis localStorage:', error);
    }
  }

  // Méthode générique pour ajouter ou mettre à jour des données
  async saveData<T extends { id: string } | { key: string }>(storeName: keyof GobexDB, data: T): Promise<void> {
    if (!this.db) {
      await this.initDB();
      if (!this.db) {
        throw new Error('IndexedDB non disponible');
      }
    }

    try {
      const tx = this.db.transaction(storeName, 'readwrite');
      await tx.store.put(data);
      await tx.done;
      const key = 'id' in data ? data.id : 'key' in data ? data.key : 'unknown';
      this.logDebug(`Données sauvegardées dans ${storeName}:`, key);
    } catch (error) {
      console.error(`Erreur lors de la sauvegarde dans ${storeName}:`, error);
      throw error;
    }
  }

  // Méthode générique pour récupérer toutes les données d'un store
  async getAllData<T>(storeName: keyof GobexDB): Promise<T[]> {
    if (!this.db) {
      await this.initDB();
      if (!this.db) {
        throw new Error('IndexedDB non disponible');
      }
    }

    try {
      const tx = this.db.transaction(storeName, 'readonly');
      const allData = await tx.store.getAll();
      return allData as T[];
    } catch (error) {
      console.error(`Erreur lors de la récupération depuis ${storeName}:`, error);
      throw error;
    }
  }

  // Méthode générique pour récupérer un élément par ID
  async getDataById<T>(storeName: keyof GobexDB, id: string): Promise<T | undefined> {
    if (!this.db) {
      await this.initDB();
      if (!this.db) {
        throw new Error('IndexedDB non disponible');
      }
    }

    try {
      const tx = this.db.transaction(storeName, 'readonly');
      const data = await tx.store.get(id);
      return data as T;
    } catch (error) {
      console.error(`Erreur lors de la récupération de l'ID ${id} depuis ${storeName}:`, error);
      throw error;
    }
  }

  // Méthode générique pour supprimer un élément par ID
  async deleteData(storeName: keyof GobexDB, id: string): Promise<void> {
    if (!this.db) {
      await this.initDB();
      if (!this.db) {
        throw new Error('IndexedDB non disponible');
      }
    }

    try {
      const tx = this.db.transaction(storeName, 'readwrite');
      await tx.store.delete(id);
      await tx.done;
      this.logDebug(`Données supprimées de ${storeName}:`, id);
    } catch (error) {
      console.error(`Erreur lors de la suppression de l'ID ${id} depuis ${storeName}:`, error);
      throw error;
    }
  }

  // Méthode pour sauvegarder les métadonnées de synchronisation
  async saveSyncMetadata(metadata: { lastSync: string; userId: string; status: 'success' | 'error' | 'pending'; message?: string }): Promise<void> {
    if (!this.db) {
      await this.initDB();
      if (!this.db) {
        throw new Error('IndexedDB non disponible');
      }
    }

    try {
      const tx = this.db.transaction('sync_metadata', 'readwrite');
      await tx.store.put({...metadata, key: 'last_sync'});
      await tx.done;
      this.logDebug('Métadonnées de synchronisation sauvegardées');
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des métadonnées de synchronisation:', error);
      throw error;
    }
  }

  // Méthode pour récupérer les métadonnées de synchronisation
  async getSyncMetadata(): Promise<{ lastSync: string; userId: string; status: 'success' | 'error' | 'pending'; message?: string } | null> {
    if (!this.db) {
      await this.initDB();
      if (!this.db) {
        throw new Error('IndexedDB non disponible');
      }
    }

    try {
      const tx = this.db.transaction('sync_metadata', 'readonly');
      const metadata = await tx.store.get('last_sync');
      return metadata || null;
    } catch (error) {
      console.error('Erreur lors de la récupération des métadonnées de synchronisation:', error);
      throw error;
    }
  }

  // Méthode pour forcer la migration depuis localStorage
  async forceMigrationFromLocalStorage(): Promise<void> {
    if (!this.db) {
      await this.initDB();
      if (!this.db) {
        throw new Error('IndexedDB non disponible');
      }
    }

    try {
      this.logDebug('Vérification et migration des données depuis localStorage');

      // Liste des clés à migrer
      const keysToMigrate = [
        { localKey: 'gobex_products', store: 'products' as keyof GobexDB },
        { localKey: 'gobex_sales', store: 'sales' as keyof GobexDB },
        { localKey: 'gobex_purchases', store: 'purchases' as keyof GobexDB },
        { localKey: 'gobex_multi_purchases', store: 'multi_purchases' as keyof GobexDB },
        { localKey: 'gobex_packaging', store: 'packaging' as keyof GobexDB },
        { localKey: 'gobex_packaging_purchases', store: 'packaging_purchases' as keyof GobexDB },
        { localKey: 'gobex_expenses', store: 'expenses' as keyof GobexDB },
        { localKey: 'gobex_inventory_records', store: 'inventory_records' as keyof GobexDB },
        { localKey: 'gobex_user_lots', store: 'user_lots' as keyof GobexDB },
        { localKey: 'gobex_licenses', store: 'licenses' as keyof GobexDB },
        { localKey: 'gobex_users', store: 'users' as keyof GobexDB }
      ];

      for (const { localKey, store } of keysToMigrate) {
        const data = localStorage.getItem(localKey);
        if (data) {
          try {
            const parsedData = JSON.parse(data);

            if (Array.isArray(parsedData) && parsedData.length > 0) {
              // Vérifier combien d'éléments sont déjà dans IndexedDB
              const existingData = await this.getAllData(store);
              const existingIds = new Set(existingData.map((item: any) => item.id));

              // Migrer seulement les éléments qui n'existent pas encore
              let migratedCount = 0;
              for (const item of parsedData) {
                if (item && item.id && !existingIds.has(item.id)) {
                  await this.saveData(store, item);
                  migratedCount++;
                }
              }

              if (migratedCount > 0) {
                this.logDebug(`Migré ${migratedCount} nouveaux éléments de ${localKey} vers ${store}`);
              }
            }
          } catch (err) {
            console.error(`Erreur lors de la migration de ${localKey}:`, err);
          }
        }
      }

      // Migrer les paramètres si nécessaire
      const settingsData = localStorage.getItem('gobex_settings');
      if (settingsData) {
        try {
          const parsedSettings = JSON.parse(settingsData);
          const existingSettings = await this.getDataById('settings', 'app_settings');
          if (!existingSettings) {
            await this.saveData('settings', { key: 'app_settings', value: parsedSettings });
            this.logDebug('Paramètres migrés depuis localStorage');
          }
        } catch (err) {
          console.error('Erreur lors de la migration des paramètres:', err);
        }
      }

      this.logDebug('Migration depuis localStorage terminée');
    } catch (error) {
      console.error('Erreur lors de la migration forcée depuis localStorage:', error);
    }
  }

  // Méthode pour collecter toutes les données pour la synchronisation
  async collectAllData(): Promise<any> {
    const data: any = {};

    try {
      if (!this.db) {
        await this.initDB();
        if (!this.db) {
          throw new Error('IndexedDB non disponible');
        }
      }

      // Forcer la migration depuis localStorage avant la collecte
      await this.forceMigrationFromLocalStorage();

      data.products = await this.getAllData('products');
      data.sales = await this.getAllData('sales');
      data.purchases = await this.getAllData('purchases');
      data.multiPurchases = await this.getAllData('multi_purchases');
      data.packaging = await this.getAllData('packaging');
      data.packagingPurchases = await this.getAllData('packaging_purchases');
      data.expenses = await this.getAllData('expenses');
      data.inventoryRecords = await this.getAllData('inventory_records');
      data.userLots = await this.getAllData('user_lots');
      data.licenses = await this.getAllData('licenses');
      data.users = await this.getAllData('users');

      // Récupérer les paramètres
      const settings = await this.getDataById('settings', 'app_settings');
      data.settings = settings?.value || {}; // Utiliser un objet vide si settings est undefined

      this.logDebug('Collecte terminée:', {
        products: data.products.length,
        sales: data.sales.length,
        purchases: data.purchases.length,
        users: data.users.length,
        userLots: data.userLots.length
      });

      return data;
    } catch (error) {
      console.error('Erreur lors de la collecte des données:', error);
      throw error;
    }
  }

  // Méthode pour restaurer toutes les données depuis la synchronisation
  async restoreAllData(data: any): Promise<void> {
    if (!this.db) {
      await this.initDB();
      if (!this.db) {
        throw new Error('IndexedDB non disponible');
      }
    }

    try {
      // Fonction helper pour valider et filtrer les objets avec ID
      const validateItems = (items: any[], storeName: string): any[] => {
        if (!Array.isArray(items)) return [];
        const validItems = items.filter(item => item && item.id);
        const invalidCount = items.length - validItems.length;
        if (invalidCount > 0) {
          this.logDebug(`${storeName}: ${invalidCount} objets sans ID ignorés`);
        }
        return validItems;
      };

      // Produits
      if (data.products && Array.isArray(data.products)) {
        const validProducts = validateItems(data.products, 'products');
        if (validProducts.length > 0) {
          const productsTx = this.db.transaction('products', 'readwrite');
          await Promise.all(validProducts.map((product: any) => productsTx.store.put(product)));
          await productsTx.done;
        }
      }

      // Ventes
      if (data.sales && Array.isArray(data.sales)) {
        const validSales = validateItems(data.sales, 'sales');
        if (validSales.length > 0) {
          const salesTx = this.db.transaction('sales', 'readwrite');
          await Promise.all(validSales.map((sale: any) => salesTx.store.put(sale)));
          await salesTx.done;
        }
      }

      // Achats
      if (data.purchases && Array.isArray(data.purchases)) {
        const validPurchases = validateItems(data.purchases, 'purchases');
        if (validPurchases.length > 0) {
          const purchasesTx = this.db.transaction('purchases', 'readwrite');
          await Promise.all(validPurchases.map((purchase: any) => purchasesTx.store.put(purchase)));
          await purchasesTx.done;
        }
      }

      // Achats multiples
      if (data.multiPurchases && Array.isArray(data.multiPurchases)) {
        const validMultiPurchases = validateItems(data.multiPurchases, 'multi_purchases');
        if (validMultiPurchases.length > 0) {
          const multiPurchasesTx = this.db.transaction('multi_purchases', 'readwrite');
          await Promise.all(validMultiPurchases.map((purchase: any) => multiPurchasesTx.store.put(purchase)));
          await multiPurchasesTx.done;
        }
      }

      // Emballages
      if (data.packaging && Array.isArray(data.packaging)) {
        const validPackaging = validateItems(data.packaging, 'packaging');
        if (validPackaging.length > 0) {
          const packagingTx = this.db.transaction('packaging', 'readwrite');
          await Promise.all(validPackaging.map((pkg: any) => packagingTx.store.put(pkg)));
          await packagingTx.done;
        }
      }

      // Achats d'emballages
      if (data.packagingPurchases && Array.isArray(data.packagingPurchases)) {
        const validPackagingPurchases = validateItems(data.packagingPurchases, 'packaging_purchases');
        if (validPackagingPurchases.length > 0) {
          const packagingPurchasesTx = this.db.transaction('packaging_purchases', 'readwrite');
          await Promise.all(validPackagingPurchases.map((purchase: any) => packagingPurchasesTx.store.put(purchase)));
          await packagingPurchasesTx.done;
        }
      }

      // Dépenses
      if (data.expenses && Array.isArray(data.expenses)) {
        const validExpenses = validateItems(data.expenses, 'expenses');
        if (validExpenses.length > 0) {
          const expensesTx = this.db.transaction('expenses', 'readwrite');
          await Promise.all(validExpenses.map((expense: any) => expensesTx.store.put(expense)));
          await expensesTx.done;
        }
      }

      // Inventaires
      if (data.inventoryRecords && Array.isArray(data.inventoryRecords)) {
        const validInventory = validateItems(data.inventoryRecords, 'inventory_records');
        if (validInventory.length > 0) {
          const inventoryTx = this.db.transaction('inventory_records', 'readwrite');
          await Promise.all(validInventory.map((record: any) => inventoryTx.store.put(record)));
          await inventoryTx.done;
        }
      }

      // Lots d'utilisateurs
      if (data.userLots && Array.isArray(data.userLots)) {
        const validUserLots = validateItems(data.userLots, 'user_lots');
        if (validUserLots.length > 0) {
          const userLotsTx = this.db.transaction('user_lots', 'readwrite');
          await Promise.all(validUserLots.map((lot: any) => userLotsTx.store.put(lot)));
          await userLotsTx.done;
        }
      }

      // Licences
      if (data.licenses && Array.isArray(data.licenses)) {
        const validLicenses = validateItems(data.licenses, 'licenses');
        if (validLicenses.length > 0) {
          const licensesTx = this.db.transaction('licenses', 'readwrite');
          await Promise.all(validLicenses.map((license: any) => licensesTx.store.put(license)));
          await licensesTx.done;
        }
      }

      // Utilisateurs
      if (data.users && Array.isArray(data.users)) {
        const validUsers = validateItems(data.users, 'users');
        if (validUsers.length > 0) {
          const usersTx = this.db.transaction('users', 'readwrite');
          await Promise.all(validUsers.map((user: any) => usersTx.store.put(user)));
          await usersTx.done;
        }
      }

      // Paramètres - structure spéciale pour settings
      if (data.settings) {
        const settingsTx = this.db.transaction('settings', 'readwrite');
        // S'assurer que settings a la structure correcte avec key
        const settingsToSave = data.settings.key
          ? data.settings
          : { key: 'app_settings', value: data.settings };
        await settingsTx.store.put(settingsToSave);
        await settingsTx.done;
      }

      this.logDebug('Toutes les données ont été restaurées avec succès');

      // Émettre un événement pour notifier l'application du changement de données
      window.dispatchEvent(new CustomEvent('dataRestored', {
        detail: {
          timestamp: new Date().toISOString(),
          productsCount: data.products?.length || 0,
          salesCount: data.sales?.length || 0,
          purchasesCount: data.purchases?.length || 0
        }
      }));

    } catch (error) {
      console.error('Erreur lors de la restauration des données:', error);
      throw error;
    }
  }
  
  // Méthode pour effacer toutes les données
  async clearAllData(): Promise<void> {
    if (!this.db) {
      await this.initDB();
      if (!this.db) {
        throw new Error('IndexedDB non disponible');
      }
    }
    
    try {
      const stores = [
        'products', 'sales', 'purchases', 'multi_purchases',
        'packaging', 'packaging_purchases', 'expenses',
        'inventory_records', 'user_lots', 'licenses', 'users'
      ];
      
      for (const store of stores) {
        const tx = this.db.transaction(store as keyof GobexDB, 'readwrite');
        await tx.objectStore(store as keyof GobexDB).clear();
        await tx.done;
      }
      
      this.logDebug('Toutes les données ont été effacées');
    } catch (error) {
      console.error('Erreur lors de l\'effacement des données:', error);
      throw error;
    }
  }
  
  // Méthode pour vérifier si IndexedDB est disponible
  async isAvailable(): Promise<boolean> {
    try {
      if (!window.indexedDB) {
        return false;
      }
      
      if (!this.db) {
        await this.initDB();
      }
      
      return !!this.db;
    } catch (error) {
      console.error('Erreur lors de la vérification de disponibilité d\'IndexedDB:', error);
      return false;
    }
  }
  
  // Méthode pour obtenir des statistiques sur la base de données
  async getStats(): Promise<{ stores: { name: string; count: number }[]; totalItems: number }> {
    if (!this.db) {
      await this.initDB();
      if (!this.db) {
        throw new Error('IndexedDB non disponible');
      }
    }
    
    try {
      const stores = [
        'products', 'sales', 'purchases', 'multi_purchases',
        'packaging', 'packaging_purchases', 'expenses',
        'inventory_records', 'user_lots', 'licenses', 'users'
      ];
      
      const stats = {
        stores: [],
        totalItems: 0
      };
      
      for (const store of stores) {
        const tx = this.db.transaction(store as keyof GobexDB, 'readonly');
        const count = await tx.objectStore(store as keyof GobexDB).count();
        stats.stores.push({ name: store, count });
        stats.totalItems += count;
        await tx.done;
      }
      
      return stats;
    } catch (error) {
      console.error('Erreur lors de la récupération des statistiques:', error);
      throw error;
    }
  }

  // Méthode pour les logs de debug
  private logDebug(...args: any[]): void {
    if (this.debugMode) {
      const timestamp = new Date().toISOString().split('T')[1].split('.')[0]; // Format HH:MM:SS
      console.log(`🗄️ [IndexedDB ${timestamp}]`, ...args);
    }
  }

  // Activer/désactiver le mode debug
  setDebugMode(enabled: boolean): void {
    this.debugMode = enabled;
  }
}

export const indexedDBService = new IndexedDBService();