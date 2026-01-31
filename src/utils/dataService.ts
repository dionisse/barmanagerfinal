import { Product, Purchase, Sale, DashboardStats, MultiPurchase, Packaging, PackagingPurchase, Expense, License, InventoryRecord, Settings, UserLot, StockSalesCalculation } from '../types';
import { supabaseService } from './supabaseService';
import { indexedDBService } from './indexedDBService';
import { enhancedSyncService } from './enhancedSyncService';

// Default settings structure
export const defaultSettings: Settings = {
  entreprise: {
    nom: 'Mon Bar',
    adresse: 'Adresse de votre bar',
    telephone: 'Votre numéro de téléphone',
    email: 'votre@email.com'
  },
  fiscalite: {
    nif: '',
    rccm: '',
    adresseFiscale: '',
    activitePrincipale: 'Commerce de détail',
    regimeFiscal: 'Réel Normal',
    centreImpot: '',
    emecefApiUrl: import.meta.env.VITE_EMECEF_API_URL || '',
    emecefEnabled: false
  },
  facturation: {
    prefixeFacture: 'FAC',
    tva: 18,
    mentionsLegales: 'Merci pour votre visite !'
  },
  notifications: {
    stockFaible: true,
    licenceExpiration: true,
    rapportsAutomatiques: false
  },
  sauvegarde: {
    automatique: true,
    frequence: 'quotidienne'
  }
};

// Initialize default data for production
const initializeProductionData = async () => {
  // Production products - only essential items
  const productionProducts: Product[] = [
    {
      id: '1',
      nom: 'Coca-Cola 33cl',
      prixAchat: 200,
      prixVente: 350,
      categorie: 'Boissons',
      stockActuel: 0,
      seuilAlerte: 20
    },
    {
      id: '2',
      nom: 'Bière Castel',
      prixAchat: 300,
      prixVente: 500,
      categorie: 'Alcools',
      stockActuel: 0,
      seuilAlerte: 30
    },
    {
      id: '3',
      nom: 'Eau minérale 1.5L',
      prixAchat: 150,
      prixVente: 250,
      categorie: 'Boissons',
      stockActuel: 0,
      seuilAlerte: 25
    },
    {
      id: '4',
      nom: 'Chips Lay\'s',
      prixAchat: 100,
      prixVente: 200,
      categorie: 'Snacks',
      stockActuel: 0,
      seuilAlerte: 15
    },
    {
      id: '5',
      nom: 'Fanta Orange 33cl',
      prixAchat: 180,
      prixVente: 300,
      categorie: 'Boissons',
      stockActuel: 0,
      seuilAlerte: 20
    },
    {
      id: '6',
      nom: 'Sprite 33cl',
      prixAchat: 180,
      prixVente: 300,
      categorie: 'Boissons',
      stockActuel: 0,
      seuilAlerte: 20
    }
  ];

  // Production packaging - essential items only
  const productionPackaging: Packaging[] = [
    {
      id: '1',
      nom: 'Sac plastique petit',
      type: 'Sac',
      stockActuel: 0,
      prixUnitaire: 10,
      seuilAlerte: 50
    },
    {
      id: '2',
      nom: 'Sac plastique grand',
      type: 'Sac',
      stockActuel: 0,
      prixUnitaire: 25,
      seuilAlerte: 30
    }
  ];

  // Initialiser IndexedDB avec les données de production
  for (const product of productionProducts) {
    await indexedDBService.saveData('products', product);
  }
  
  for (const pkg of productionPackaging) {
    await indexedDBService.saveData('packaging', pkg);
  }
  
  // Sauvegarder les paramètres par défaut
  await indexedDBService.saveData('settings', { key: 'app_settings', value: defaultSettings });
  
  console.log('🚀 Application initialisée pour la production avec des données propres');
};

// Initialize data on first load - check if we need production initialization
const initializeData = async () => {
  try {
    // Vérifier si IndexedDB est disponible
    const isAvailable = await indexedDBService.isAvailable();
    if (!isAvailable) {
      console.error('IndexedDB n\'est pas disponible - impossible d\'initialiser les données');
      return;
    }
    
    // Vérifier si c'est une première installation
    const products = await indexedDBService.getAllData('products');
    const isFirstInstall = products.length === 0;
    
    if (isFirstInstall) {
      await initializeProductionData();
    }
  } catch (error) {
    console.error('Erreur lors de l\'initialisation des données:', error);
  }
};

// Initialize data on first load
initializeData().catch(console.error);

// Products
export const getProducts = async (): Promise<Product[]> => {
  const products = await indexedDBService.getAllData<Product>('products');
  console.log('[DATA SERVICE] getProducts retourne:', products.length, 'produits');
  return products;
};

export const addProduct = async (product: Product): Promise<void> => {
  await indexedDBService.saveData('products', product);
  
  // Trigger sync after data change
  triggerSync();
};

export const updateProduct = async (updatedProduct: Product): Promise<void> => {
  console.log('[DATA SERVICE] updateProduct appelé:', {
    id: updatedProduct.id,
    nom: updatedProduct.nom,
    stockActuel: updatedProduct.stockActuel
  });
  await indexedDBService.saveData('products', updatedProduct);
  console.log('[DATA SERVICE] Produit sauvegardé dans IndexedDB');

  // Trigger sync after data change
  triggerSync();
};

export const deleteProduct = async (productId: string): Promise<void> => {
  await indexedDBService.deleteData('products', productId);
  
  // Trigger sync after data change
  triggerSync();
};

// Purchases
export const getPurchases = async (): Promise<Purchase[]> => {
  return await indexedDBService.getAllData<Purchase>('purchases');
};

export const addPurchase = async (purchase: Purchase): Promise<void> => {
  await indexedDBService.saveData('purchases', purchase);
  
  // Trigger sync after data change
  triggerSync();
};

// Multi Purchases
export const getMultiPurchases = async (): Promise<MultiPurchase[]> => {
  return await indexedDBService.getAllData<MultiPurchase>('multi_purchases');
};

export const addMultiPurchase = async (purchase: MultiPurchase): Promise<void> => {
  await indexedDBService.saveData('multi_purchases', purchase);
  
  // Trigger sync after data change
  triggerSync();
};

export const updateMultiPurchase = async (updatedPurchase: MultiPurchase): Promise<void> => {
  await indexedDBService.saveData('multi_purchases', updatedPurchase);
  
  // Trigger sync after data change
  triggerSync();
};

export const deleteMultiPurchase = async (purchaseId: string): Promise<void> => {
  await indexedDBService.deleteData('multi_purchases', purchaseId);
  
  // Trigger sync after data change
  triggerSync();
};

// Sales
export const getSales = async (): Promise<Sale[]> => {
  return await indexedDBService.getAllData<Sale>('sales');
};

export const addSale = async (sale: Sale): Promise<void> => {
  await indexedDBService.saveData('sales', sale);
  
  // Trigger sync after data change
  triggerSync();
};

export const updateSale = async (updatedSale: Sale): Promise<void> => {
  await indexedDBService.saveData('sales', updatedSale);
  
  // Trigger sync after data change
  triggerSync();
};

export const deleteSale = async (saleId: string): Promise<void> => {
  await indexedDBService.deleteData('sales', saleId);
  
  // Trigger sync after data change
  triggerSync();
};

// Packaging
export const getPackaging = async (): Promise<Packaging[]> => {
  return await indexedDBService.getAllData<Packaging>('packaging');
};

export const addPackaging = async (packaging: Packaging): Promise<void> => {
  await indexedDBService.saveData('packaging', packaging);
  
  // Trigger sync after data change
  triggerSync();
};

export const updatePackaging = async (updatedPackaging: Packaging): Promise<void> => {
  await indexedDBService.saveData('packaging', updatedPackaging);
  
  // Trigger sync after data change
  triggerSync();
};

export const deletePackaging = async (packagingId: string): Promise<void> => {
  await indexedDBService.deleteData('packaging', packagingId);
  
  // Trigger sync after data change
  triggerSync();
};

// Packaging Purchases
export const getPackagingPurchases = async (): Promise<PackagingPurchase[]> => {
  return await indexedDBService.getAllData<PackagingPurchase>('packaging_purchases');
};

export const addPackagingPurchase = async (purchase: PackagingPurchase): Promise<void> => {
  await indexedDBService.saveData('packaging_purchases', purchase);
  
  // Trigger sync after data change
  triggerSync();
};

// Expenses
export const getExpenses = async (): Promise<Expense[]> => {
  return await indexedDBService.getAllData<Expense>('expenses');
};

export const addExpense = async (expense: Expense): Promise<void> => {
  await indexedDBService.saveData('expenses', expense);
  
  // Trigger sync after data change
  triggerSync();
};

export const updateExpense = async (updatedExpense: Expense): Promise<void> => {
  await indexedDBService.saveData('expenses', updatedExpense);
  
  // Trigger sync after data change
  triggerSync();
};

export const deleteExpense = async (expenseId: string): Promise<void> => {
  await indexedDBService.deleteData('expenses', expenseId);
  
  // Trigger sync after data change
  triggerSync();
};

// User Lots
export const getUserLots = async (): Promise<UserLot[]> => {
  return await indexedDBService.getAllData<UserLot>('user_lots');
};

export const addUserLot = async (userLot: UserLot): Promise<void> => {
  await indexedDBService.saveData('user_lots', userLot);
  
  // Trigger sync after data change
  triggerSync();
};

export const updateUserLot = async (updatedUserLot: UserLot): Promise<void> => {
  await indexedDBService.saveData('user_lots', updatedUserLot);
  
  // Trigger sync after data change
  triggerSync();
};

export const deleteUserLot = async (userLotId: string): Promise<void> => {
  await indexedDBService.deleteData('user_lots', userLotId);
  
  // Trigger sync after data change
  triggerSync();
};

// Licenses
export const getLicenses = async (): Promise<License[]> => {
  return await indexedDBService.getAllData<License>('licenses');
};

export const addLicense = async (license: License): Promise<void> => {
  await indexedDBService.saveData('licenses', license);
  
  // Synchroniser avec la base de données cloud
  const currentUser = JSON.parse(localStorage.getItem('gobex_current_user') || '{}');
  if (currentUser.id) {
    try {
      // Trouver le userLot associé
      const userLots = await getUserLots();
      console.log('☁️ addLicense - Synchronisation cloud:', {
        licenseId: license.id,
        userLotId: license.userLotId,
        userLotsFound: userLots.length,
        hasUserLot: userLots.some(ul => ul.id === license.userLotId)
      });

      const userLot = userLots.find(ul => ul.id === license.userLotId);

      if (userLot) {
        console.log('☁️ Envoi userLot et licence vers Supabase...');
        const result = await supabaseService.registerUserLotAndLicense(userLot, license);
        console.log('☁️ Résultat Supabase:', result);
      } else {
        console.warn('⚠️ UserLot non trouvé pour synchronisation cloud:', license.userLotId);
      }
    } catch (error) {
      console.warn('❌ Synchronisation cloud échouée:', error);
    }
  }
  
  // Trigger sync after data change
  triggerSync();
};

export const updateLicense = async (updatedLicense: License): Promise<void> => {
  await indexedDBService.saveData('licenses', updatedLicense);
  
  // Trigger sync after data change
  triggerSync();
};

// Vérification de l'accès utilisateur basé sur les licences (avec fallback cloud)
export const checkUserLicenseAccess = async (username: string): Promise<{ hasAccess: boolean; license?: License; userLot?: UserLot; message?: string }> => {
  try {
    // Le propriétaire a toujours accès sans vérification de licence
    if (username === 'gobexpropriétaire') {
      return {
        hasAccess: true,
        message: 'Accès illimité - Propriétaire'
      };
    }

    // Essayer d'abord localement
    const licenses = await getLicenses();
    const userLots = await getUserLots();

    // Trouver le lot d'utilisateurs contenant cet utilisateur
    const userLot = userLots.find(lot =>
      lot.gestionnaire.username === username ||
      lot.employe.username === username
    );

    console.log('🔍 checkUserLicenseAccess - Recherche userLot:', {
      username,
      userLotsCount: userLots.length,
      userLotFound: !!userLot,
      userLotId: userLot?.id
    });

    if (!userLot) {
      // Si pas trouvé localement, essayer dans le cloud UNIQUEMENT si en ligne
      // Mais continuer même si le cloud échoue
      try {
        if (navigator.onLine) {
          console.log('⚠️ UserLot non trouvé localement, tentative cloud pour:', username);
          const cloudResult = await supabaseService.checkUserLicense(username);
          console.log('☁️ Résultat cloud:', cloudResult);
          return cloudResult;
        } else {
          console.log('⚠️ Hors ligne et userLot non trouvé pour:', username);
          return { hasAccess: false, message: 'Hors ligne - impossible de vérifier la licence' };
        }
      } catch (error) {
        console.warn('❌ Vérification cloud échouée pour:', username, error);
        return { hasAccess: false, message: error.message };
      }
    }
    
    // Vérifier si le lot a une licence active
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const activeLicense = licenses.find(license => {
      if (license.userLotId !== userLot.id || !license.active) {
        return false;
      }

      const endDate = new Date(license.dateFin);
      endDate.setHours(23, 59, 59, 999);

      const isValid = endDate >= today;

      console.log('🔍 checkUserLicenseAccess - Vérification licence:', {
        type: license.type,
        dateFin: license.dateFin,
        today: today.toISOString(),
        endDate: endDate.toISOString(),
        isValid,
        comparison: `${endDate.getTime()} >= ${today.getTime()}`
      });

      return isValid;
    });
    
    if (!activeLicense) {
      return { hasAccess: false, userLot, message: 'Aucune licence active trouvée' };
    }
    
    return { 
      hasAccess: true, 
      license: activeLicense, 
      userLot 
    };
  } catch (error) {
    console.error('Erreur lors de la vérification de licence:', error);
    return { hasAccess: false, message: error.message };
  }
};

// Authentification intégrée avec vérification de licence et cloud
export const authenticateUser = async (username: string, password: string, userType: string): Promise<{ success: boolean; user?: any; message?: string }> => {
  // Essayer d'abord l'authentification cloud
  try {
    if (navigator.onLine) {
      const cloudResult = await supabaseService.authenticateUser(username, password, userType);
      
      if (cloudResult.success) {
        // Vérifier que l'ID utilisateur est au bon format
        const userId = cloudResult.user.id;
        if (!userId || (userId !== 'owner-001' && !userId.includes('_'))) {
          console.warn('Format d\'ID utilisateur incorrect depuis le cloud:', userId);
          
          // Reconstruire l'ID si possible
          if (cloudResult.user.userLotId && cloudResult.user.type) {
            const userType = cloudResult.user.type.toLowerCase();
            const correctUserId = `${cloudResult.user.userLotId}_${userType === 'employé' ? 'employe' : userType}`;
            cloudResult.user.id = correctUserId;
            console.log('ID utilisateur corrigé:', correctUserId);
          }
        }
        
        // Démarrer la synchronisation automatique avec user_lot_id pour isolation
        // Si c'est un Manager/Employé, utiliser userLotId; si Propriétaire, utiliser id
        const syncId = cloudResult.user.userLotId || cloudResult.user.id;
        enhancedSyncService.startAutoSync(syncId);

        // Essayer de récupérer les données depuis le cloud avec user_lot_id
        await enhancedSyncService.forceDownloadFromCloud(syncId);
        
        return cloudResult;
      }
    }
  } catch (error) {
    console.warn('Authentification cloud échouée, utilisation du mode local');
  }

  try {
    // Authentification du propriétaire (toujours autorisée)
    if (username === 'gobexpropriétaire' && password === 'Ffreddy75@@7575xyzDistribpro2025' && userType === 'Propriétaire') {
      return {
        success: true,
        user: {
          id: 'owner-001',
          username: 'gobexpropriétaire',
          type: 'Propriétaire',
          dateCreation: new Date().toISOString()
        }
      };
    }
    
    // Vérifier l'accès basé sur les licences pour les autres utilisateurs
    const licenseCheck = await checkUserLicenseAccess(username);
    
    if (!licenseCheck.hasAccess) {
      return {
        success: false,
        message: licenseCheck.message || 'Aucune licence active trouvée pour cet utilisateur'
      };
    }
    
    // Vérifier les identifiants dans le lot d'utilisateurs
    const userLot = licenseCheck.userLot!;
    let userData = null;
    
    if (userLot.gestionnaire.username === username && 
        userLot.gestionnaire.password === password && 
        userType === 'Gestionnaire') {
      userData = {
        id: `${userLot.id}_gestionnaire`,
        username: username,
        type: 'Gestionnaire',
        dateCreation: userLot.dateCreation,
        userLotId: userLot.id,
        license: licenseCheck.license
      };
    } else if (userLot.employe.username === username && 
               userLot.employe.password === password && 
               userType === 'Employé') {
      userData = {
        id: `${userLot.id}_employe`,
        username: username,
        type: 'Employé',
        dateCreation: userLot.dateCreation,
        userLotId: userLot.id,
        license: licenseCheck.license
      };
    }
    
    if (!userData) {
      return {
        success: false,
        message: 'Identifiants incorrects'
      };
    }
    
    // Vérifier que le lot d'utilisateurs est actif
    if (userLot.status !== 'active') {
      return {
        success: false,
        message: 'Compte suspendu. Contactez l\'administrateur.'
      };
    }
    
    // Démarrer la synchronisation automatique
    enhancedSyncService.startAutoSync(userData.id);
    
    return {
      success: true,
      user: userData
    };
  } catch (error) {
    console.error('Erreur lors de l\'authentification:', error);
    return {
      success: false,
      message: `Erreur d'authentification: ${error.message}`
    };
  }
};

export const checkLicenseExpiration = async (): Promise<{ expired: boolean; warning: string | null }> => {
  try {
    const licenses = await getLicenses();
    const activeLicenses = licenses.filter(l => l.active);
    
    if (activeLicenses.length === 0) {
      return { expired: false, warning: null }; // No license required for production start
    }

    const today = new Date();
    let hasExpired = false;
    let warningMessage = null;

    for (const license of activeLicenses) {
      const todayNormalized = new Date(today);
      todayNormalized.setHours(0, 0, 0, 0);

      const endDate = new Date(license.dateFin);
      endDate.setHours(23, 59, 59, 999);

      const daysUntilExpiry = Math.ceil((endDate.getTime() - todayNormalized.getTime()) / (1000 * 60 * 60 * 24));

      if (daysUntilExpiry < 0) {
        hasExpired = true;
      } else if (daysUntilExpiry <= 7) {
        warningMessage = `Votre licence ${license.type} expire dans ${daysUntilExpiry} jour(s).`;
      }
    }

    return { expired: hasExpired, warning: warningMessage };
  } catch (error) {
    console.error('Erreur lors de la vérification d\'expiration de licence:', error);
    return { expired: false, warning: 'Erreur lors de la vérification des licences' };
  }
};

// Inventory Records
export const getInventoryRecords = async (): Promise<InventoryRecord[]> => {
  return await indexedDBService.getAllData<InventoryRecord>('inventory_records');
};

export const addInventoryRecord = async (record: InventoryRecord): Promise<void> => {
  await indexedDBService.saveData('inventory_records', record);
  
  // Trigger sync after data change
  triggerSync();
};

// Settings - Fixed to return complete default settings structure
export const getSettings = async (): Promise<Settings> => {
  try {
    const settings = await indexedDBService.getDataById<{ key: string, value: Settings }>('settings', 'app_settings');
    
    // Return complete default settings if none found, or merge with defaults to ensure all properties exist
    if (!settings?.value) {
      return defaultSettings;
    }
    
    // Merge with defaults to ensure all nested properties exist
    return {
      entreprise: {
        ...defaultSettings.entreprise,
        ...settings.value.entreprise
      },
      fiscalite: {
        ...defaultSettings.fiscalite,
        ...settings.value.fiscalite
      },
      facturation: {
        ...defaultSettings.facturation,
        ...settings.value.facturation
      },
      notifications: {
        ...defaultSettings.notifications,
        ...settings.value.notifications
      },
      sauvegarde: {
        ...defaultSettings.sauvegarde,
        ...settings.value.sauvegarde
      }
    };
  } catch (error) {
    console.error('Erreur lors de la récupération des paramètres:', error);
    return defaultSettings;
  }
};

export const updateSettings = async (updatedSettings: Settings): Promise<void> => {
  await indexedDBService.saveData('settings', { key: 'app_settings', value: updatedSettings });
  
  // Trigger sync after data change
  triggerSync();
};

// Dashboard Stats - Modified to remove negative benefit display
export const getDashboardStats = async (): Promise<DashboardStats> => {
  try {
    const products = await getProducts();
    const sales = await getSales();
    const purchases = await getPurchases();
    const multiPurchases = await getMultiPurchases();
    const expenses = await getExpenses();
    
    const today = new Date().toISOString().split('T')[0];
    const todaySales = sales.filter(sale => sale.dateVente === today);
    const todayExpenses = expenses.filter(expense => expense.date === today);
    
    const ventesJour = todaySales.reduce((sum, sale) => sum + sale.total, 0);
    const depensesJour = todayExpenses.reduce((sum, expense) => sum + expense.montant, 0);
    const stockTotal = products.reduce((sum, product) => sum + product.stockActuel, 0);
    
    const totalSales = sales.reduce((sum, sale) => sum + sale.total, 0);
    const totalPurchases = purchases.reduce((sum, purchase) => sum + purchase.total, 0);
    const totalMultiPurchases = multiPurchases.reduce((sum, purchase) => sum + purchase.totalGeneral, 0);
    const totalExpenses = expenses.reduce((sum, expense) => sum + expense.montant, 0);
    
    const beneficeNet = totalSales - totalPurchases - totalMultiPurchases - totalExpenses;
    const totalCosts = totalPurchases + totalMultiPurchases + totalExpenses;
    const roi = totalCosts > 0 ? (beneficeNet / totalCosts) * 100 : 0;
    
    return {
      ventesJour: Math.max(0, ventesJour - depensesJour), // Ensure non-negative
      stockTotal,
      beneficeNet: Math.max(0, beneficeNet), // Hide negative benefit - show 0 instead
      roi: Math.max(0, roi) // Ensure non-negative ROI
    };
  } catch (error) {
    console.error('Erreur lors du calcul des statistiques:', error);
    return {
      ventesJour: 0,
      stockTotal: 0,
      beneficeNet: 0,
      roi: 0
    };
  }
};

// Function to reset application for production
export const resetForProduction = async (): Promise<void> => {
  try {
    // Effacer toutes les données
    await indexedDBService.clearAllData();
    
    // Réinitialiser avec les données de production
    await initializeProductionData();
    
    // Recharger la page
    window.location.reload();
  } catch (error) {
    console.error('Erreur lors de la réinitialisation:', error);
    throw error;
  }
};

// Fonction pour déclencher la synchronisation après modification des données
const triggerSync = (): void => {
  try {
    const currentUser = JSON.parse(localStorage.getItem('gobex_current_user') || '{}');
    if (currentUser.id && currentUser.type !== 'Propriétaire') {
      // Upload uniquement après modification locale (sans download pour éviter d'écraser les données)
      setTimeout(() => {
        console.log('[DATA SERVICE] Déclenchement upload vers cloud...');
        enhancedSyncService.uploadOnly(currentUser.id).catch(error => {
          console.warn('Erreur lors de l\'upload automatique:', error);
        });
      }, 1000);
    }
  } catch (error) {
    console.warn('Erreur lors du déclenchement de la synchronisation:', error);
  }
};

export const getStockSalesCalculations = async (): Promise<StockSalesCalculation[]> => {
  return await indexedDBService.getAllData<StockSalesCalculation>('stock_sales_calculations');
};

export const addStockSalesCalculation = async (calculation: StockSalesCalculation): Promise<void> => {
  await indexedDBService.saveData('stock_sales_calculations', calculation);
  triggerSync();
};

export const updateStockSalesCalculation = async (calculation: StockSalesCalculation): Promise<void> => {
  await indexedDBService.saveData('stock_sales_calculations', calculation);
  triggerSync();
};

export const deleteStockSalesCalculation = async (calculationId: string): Promise<void> => {
  await indexedDBService.deleteData('stock_sales_calculations', calculationId);
  triggerSync();
};

// Fonction pour recalculer le stock à partir de tous les achats historiques
export const recalculateStockFromPurchases = async (): Promise<{ success: boolean; message: string; details?: any }> => {
  try {
    console.log('[RECALCUL STOCK] Début du recalcul du stock à partir des achats...');

    // Récupérer tous les produits et achats
    const products = await getProducts();
    const multiPurchases = await getMultiPurchases();

    console.log('[RECALCUL STOCK] Données chargées:', {
      produits: products.length,
      achats: multiPurchases.length
    });

    if (multiPurchases.length === 0) {
      return {
        success: true,
        message: 'Aucun achat trouvé. Le stock reste inchangé.',
        details: { productsProcessed: 0, purchasesProcessed: 0 }
      };
    }

    // Créer un map pour accumuler les quantités par produit
    const stockAccumulator: { [productId: string]: { quantity: number; lastPrice: number } } = {};

    // Parcourir tous les achats et accumuler les quantités
    for (const purchase of multiPurchases) {
      console.log(`[RECALCUL STOCK] Traitement commande ${purchase.numeroCommande}:`, {
        date: purchase.dateAchat,
        fournisseur: purchase.fournisseur,
        items: purchase.items.length
      });

      for (const item of purchase.items) {
        if (!stockAccumulator[item.produitId]) {
          stockAccumulator[item.produitId] = {
            quantity: 0,
            lastPrice: item.prixUnitaire
          };
        }

        stockAccumulator[item.produitId].quantity += item.quantite;
        stockAccumulator[item.produitId].lastPrice = item.prixUnitaire;

        console.log(`[RECALCUL STOCK]   - ${item.produitNom}: +${item.quantite} unités (total accumulé: ${stockAccumulator[item.produitId].quantity})`);
      }
    }

    // Mettre à jour le stock de chaque produit
    let updatedCount = 0;
    let notFoundCount = 0;
    const updateDetails: any[] = [];

    for (const [productId, accumulation] of Object.entries(stockAccumulator)) {
      const product = products.find(p => p.id === productId);

      if (product) {
        const oldStock = product.stockActuel;
        const newStock = accumulation.quantity;

        console.log(`[RECALCUL STOCK] Mise à jour ${product.nom}:`, {
          stockAvant: oldStock,
          stockCalculé: newStock,
          différence: newStock - oldStock,
          prixAchat: accumulation.lastPrice
        });

        const updatedProduct = {
          ...product,
          stockActuel: newStock,
          prixAchat: accumulation.lastPrice
        };

        await updateProduct(updatedProduct);
        updatedCount++;

        updateDetails.push({
          nom: product.nom,
          stockAvant: oldStock,
          stockApres: newStock,
          différence: newStock - oldStock
        });

        console.log(`[RECALCUL STOCK] ✓ ${product.nom} mis à jour: ${oldStock} → ${newStock} unités`);
      } else {
        notFoundCount++;
        console.warn(`[RECALCUL STOCK] ✗ Produit non trouvé: ${productId}`);
      }
    }

    console.log('[RECALCUL STOCK] Recalcul terminé:', {
      produitsTraités: updatedCount,
      produitsNonTrouvés: notFoundCount,
      achatsAnalysés: multiPurchases.length
    });

    // Déclencher l'événement de mise à jour du stock
    window.dispatchEvent(new CustomEvent('stockUpdated'));

    return {
      success: true,
      message: `Stock recalculé avec succès!\n${updatedCount} produit(s) mis à jour sur ${Object.keys(stockAccumulator).length} trouvé(s).\n${multiPurchases.length} achat(s) analysé(s).`,
      details: {
        productsUpdated: updatedCount,
        productsNotFound: notFoundCount,
        purchasesProcessed: multiPurchases.length,
        updateDetails
      }
    };
  } catch (error) {
    console.error('[RECALCUL STOCK] Erreur lors du recalcul:', error);
    return {
      success: false,
      message: `Erreur lors du recalcul du stock: ${error instanceof Error ? error.message : 'Erreur inconnue'}`
    };
  }
};