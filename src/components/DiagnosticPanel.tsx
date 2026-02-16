import React, { useState, useEffect } from 'react';
import { Activity, AlertTriangle, CheckCircle, XCircle, RefreshCw, Database, Wifi, Server, Flame, FileText, Package } from 'lucide-react';
import { supabaseService } from '../utils/supabaseService';
import { indexedDBService } from '../utils/indexedDBService';
import { enhancedSyncService } from '../utils/enhancedSyncService';
import { getProducts, getPurchases, getMultiPurchases, getSales, updateProduct } from '../utils/dataService';

const DiagnosticPanel: React.FC = () => {
  const [diagnostics, setDiagnostics] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [authTest, setAuthTest] = useState<any>(null);
  const [storageStats, setStorageStats] = useState<any>(null);
  const [stockRecalcResult, setStockRecalcResult] = useState<any>(null);

  const runDiagnostics = async () => {
    setLoading(true);
    try {
      // Tester la connexion Firebase
      const isOnline = navigator.onLine;
      const supabaseConnected = await supabaseService.testConnection();
      
      // Vérifier IndexedDB
      const indexedDBStats = await getIndexedDBStats();
      
      // Collecter les résultats
      const results = {
        environment: {
          url: window.location.href,
          userAgent: navigator.userAgent,
          online: isOnline,
          localStorage: testLocalStorage(),
          indexedDB: indexedDBStats.available
        },
        connectivity: {
          internet: isOnline,
          supabase: supabaseConnected
        },
        storage: indexedDBStats,
        timestamp: new Date().toISOString()
      };
      
      setDiagnostics(results);
    } catch (error) {
      console.error('Erreur lors du diagnostic:', error);
    } finally {
      setLoading(false);
    }
  };

  const testAuth = async () => {
    setLoading(true);
    try {
      setAuthTest({
        status: 'pending',
        message: 'Test en cours...'
      });
      
      // Vérifier la connexion internet
      if (!navigator.onLine) {
        setAuthTest({
          status: 'error',
          error: 'Appareil hors ligne - test impossible'
        });
        return;
      }
      
      // Tester d'abord la connexion Firebase
      try {
        console.log('Test de connexion Supabase...');
        const isConnected = await supabaseService.testConnection();
        
        if (!isConnected) {
          setAuthTest({
            status: 'error',
            error: 'Impossible de se connecter à Supabase'
          });
          return;
        }
      } catch (connectionError) {
        setAuthTest({
          status: 'error',
          error: `Erreur de connexion Supabase: ${connectionError.message}`
        });
        return;
      }
      
      // Tester l'authentification
      console.log('Test d\'authentification...');
      const result = await supabaseService.authenticateUser(
        'gobexpropriétaire', 
        'Ffreddy75@@7575xyzDistribpro2025', 
        'Propriétaire'
      );
      
      setAuthTest(result);
    } catch (error) {
      console.error('Erreur lors du test d\'authentification:', error);
      setAuthTest({
        status: 'error',
        error: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  const getIndexedDBStats = async () => {
    try {
      // Vérifier si IndexedDB est disponible
      const isAvailable = await indexedDBService.isAvailable();
      if (!isAvailable) {
        return {
          available: false,
          error: 'IndexedDB non supporté par ce navigateur'
        };
      }
      
      // Récupérer les statistiques de stockage
      const stats = {
        available: true,
        stores: [],
        totalItems: 0
      };
      
      // Récupérer les statistiques depuis le service
      const dbStats = await indexedDBService.getStats();
      stats.stores = dbStats.stores;
      stats.totalItems = dbStats.totalItems;
      
      return stats;
    } catch (error) {
      console.error('Erreur lors de la récupération des statistiques IndexedDB:', error);
      return {
        available: false,
        error: error.message
      };
    }
  };

  const testLocalStorage = () => {
    try {
      const testKey = 'test_storage';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      return { available: true };
    } catch (error) {
      return { available: false, error: error.message };
    }
  };

  const getStorageStats = async () => {
    setLoading(true);
    try {
      const stats = await getIndexedDBStats();
      setStorageStats(stats);
    } catch (error) {
      console.error('Erreur lors de la récupération des statistiques de stockage:', error);
      setStorageStats({
        available: false,
        error: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  const forceSyncNow = async () => {
    setLoading(true);
    try {
      console.log('Tentative de synchronisation forcée...');
      // Vérifier la connexion internet
      if (!navigator.onLine) {
        alert('Impossible de synchroniser - Appareil hors ligne');
        return;
      }

      const currentUser = JSON.parse(localStorage.getItem('gobex_current_user') || '{}');
      if (currentUser && currentUser.id) {
        console.log('Vérification de la connectivité Supabase...');
        // Vérifier d'abord la connectivité Supabase
        const isConnected = await supabaseService.testConnection();

        if (!isConnected) {
          alert('Impossible de se connecter à Supabase');
          return;
        }

        console.log('Lancement de la synchronisation manuelle...');
        const syncId = currentUser.userLotId || currentUser.id;
        const result = await enhancedSyncService.manualSync(syncId);
        alert(`Synchronisation forcée: ${result.success ? 'Réussie' : 'Échouée'}\n${result.message}`);
      } else {
        alert('Aucun utilisateur connecté pour la synchronisation');
      }
    } catch (error) {
      console.error('Erreur lors de la synchronisation forcée:', error);
      alert(`Erreur de synchronisation: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const recalculateStock = async () => {
    if (!window.confirm('Cette opération va recalculer le stock de tous les produits basé sur les achats et les ventes enregistrés. Continuer ?')) {
      return;
    }

    setLoading(true);
    try {
      console.log('Début du recalcul du stock...');

      const products = await getProducts();
      const purchases = await getPurchases();
      const multiPurchases = await getMultiPurchases();
      const sales = await getSales();

      const stockMap = new Map<string, {
        productName: string;
        totalPurchases: number;
        totalSales: number;
        calculatedStock: number;
        currentStock: number;
        difference: number;
      }>();

      products.forEach(product => {
        stockMap.set(product.id, {
          productName: product.nom,
          totalPurchases: 0,
          totalSales: 0,
          calculatedStock: 0,
          currentStock: product.stockActuel,
          difference: 0
        });
      });

      purchases.forEach(purchase => {
        const stock = stockMap.get(purchase.produitId);
        if (stock) {
          stock.totalPurchases += purchase.quantite;
        }
      });

      multiPurchases.forEach(multiPurchase => {
        multiPurchase.items.forEach(item => {
          const stock = stockMap.get(item.produitId);
          if (stock) {
            stock.totalPurchases += item.quantite;
          }
        });
      });

      sales.forEach(sale => {
        const stock = stockMap.get(sale.produitId);
        if (stock) {
          stock.totalSales += sale.quantite;
        }
      });

      const updates: Array<any> = [];
      const report: Array<any> = [];

      stockMap.forEach((data, productId) => {
        data.calculatedStock = data.totalPurchases - data.totalSales;
        data.difference = data.calculatedStock - data.currentStock;

        if (data.difference !== 0) {
          report.push({
            productId,
            productName: data.productName,
            currentStock: data.currentStock,
            calculatedStock: data.calculatedStock,
            totalPurchases: data.totalPurchases,
            totalSales: data.totalSales,
            difference: data.difference
          });
        }
      });

      if (report.length === 0) {
        setStockRecalcResult({
          status: 'success',
          message: 'Tous les stocks sont corrects. Aucune correction nécessaire.',
          report: []
        });
        setLoading(false);
        return;
      }

      if (window.confirm(`${report.length} produit(s) nécessitent une correction de stock. Voulez-vous appliquer les corrections ?`)) {
        for (const item of report) {
          const product = products.find(p => p.id === item.productId);
          if (product) {
            const updatedProduct = {
              ...product,
              stockActuel: item.calculatedStock
            };
            await updateProduct(updatedProduct);
            updates.push(item);
          }
        }

        window.dispatchEvent(new CustomEvent('stockUpdated'));

        setStockRecalcResult({
          status: 'success',
          message: `Stock recalculé avec succès pour ${updates.length} produit(s)`,
          report: updates
        });

        alert(`Stock recalculé avec succès !\n${updates.length} produit(s) mis à jour.`);
      } else {
        setStockRecalcResult({
          status: 'cancelled',
          message: 'Recalcul annulé par l\'utilisateur',
          report: report
        });
      }
    } catch (error) {
      console.error('Erreur lors du recalcul du stock:', error);
      setStockRecalcResult({
        status: 'error',
        message: `Erreur: ${error.message}`,
        report: []
      });
      alert(`Erreur lors du recalcul: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };


  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Activity className="h-6 w-6 text-blue-600" />
          <h2 className="text-xl font-semibold text-gray-900">Diagnostic de Synchronisation</h2>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={recalculateStock}
            disabled={loading}
            className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
          >
            {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Package className="h-4 w-4" />}
            <span>Recalculer Stock</span>
          </button>
          <button
            onClick={getStorageStats}
            disabled={loading}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
          >
            {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
            <span>Statistiques Stockage</span>
          </button>
          <button
            onClick={testAuth}
            disabled={loading}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
          >
            {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
            <span>Test Supabase</span>
          </button>
          <button
            onClick={forceSyncNow}
            disabled={loading}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
          >
            {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            <span>Forcer Sync</span>
          </button>
          <button
            onClick={runDiagnostics}
            disabled={loading}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
          >
            {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Activity className="h-4 w-4" />}
            <span>Diagnostic Complet</span>
          </button>
        </div>
      </div>

      {stockRecalcResult && (
        <div className="mb-6 p-4 bg-orange-50 rounded-lg">
          <div className="flex items-center space-x-2 mb-3">
            {getStatusIcon(stockRecalcResult.status)}
            <h3 className="font-semibold">Résultat du Recalcul de Stock</h3>
          </div>
          <div className="bg-white p-3 rounded border">
            <p className="text-sm mb-3">{stockRecalcResult.message}</p>
            {stockRecalcResult.report && stockRecalcResult.report.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700">Détails des corrections :</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-2 py-2 text-left">Produit</th>
                        <th className="px-2 py-2 text-right">Achats</th>
                        <th className="px-2 py-2 text-right">Ventes</th>
                        <th className="px-2 py-2 text-right">Stock Actuel</th>
                        <th className="px-2 py-2 text-right">Stock Calculé</th>
                        <th className="px-2 py-2 text-right">Différence</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stockRecalcResult.report.map((item: any, index: number) => (
                        <tr key={index} className="border-t">
                          <td className="px-2 py-2">{item.productName}</td>
                          <td className="px-2 py-2 text-right text-blue-600">{item.totalPurchases}</td>
                          <td className="px-2 py-2 text-right text-red-600">{item.totalSales}</td>
                          <td className="px-2 py-2 text-right">{item.currentStock}</td>
                          <td className="px-2 py-2 text-right font-medium">{item.calculatedStock}</td>
                          <td className={`px-2 py-2 text-right font-bold ${item.difference > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {item.difference > 0 ? '+' : ''}{item.difference}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {authTest && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center space-x-2 mb-3">
            {getStatusIcon(authTest.success ? 'success' : 'error')}
            <h3 className="font-semibold">Test d'Authentification Firebase</h3>
          </div>
          <pre className="text-xs bg-white p-3 rounded border overflow-auto">
            {JSON.stringify(authTest, null, 2)}
          </pre>
        </div>
      )}

      {storageStats && (
        <div className="mb-6 p-4 bg-purple-50 rounded-lg">
          <div className="flex items-center space-x-2 mb-3">
            {getStatusIcon(storageStats.available ? 'success' : 'error')}
            <h3 className="font-semibold">Statistiques de Stockage</h3>
          </div>
          {storageStats.available ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-3 rounded border">
                  <p className="text-sm font-medium text-gray-700">Total d'éléments</p>
                  <p className="text-xl font-bold text-blue-600">{storageStats.totalItems}</p>
                </div>
                <div className="bg-white p-3 rounded border">
                  <p className="text-sm font-medium text-gray-700">Stores</p>
                  <p className="text-xl font-bold text-blue-600">{storageStats.stores?.length || 0}</p>
                </div>
              </div>
              
              {storageStats.stores && storageStats.stores.length > 0 && (
                <div className="bg-white p-3 rounded border">
                  <p className="text-sm font-medium text-gray-700 mb-2">Détails par store</p>
                  <div className="space-y-2">
                    {storageStats.stores.map((store: any, index: number) => (
                      <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                        <span className="text-sm">{store.name}</span>
                        <span className="text-sm font-medium">{store.count} éléments</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-red-50 p-3 rounded border border-red-200">
              <p className="text-sm text-red-700">IndexedDB n'est pas disponible: {storageStats.error}</p>
            </div>
          )}
        </div>
      )}

      {diagnostics && (
        <div className="space-y-6">
          {/* Environment */}
          <div className="border rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-3">
              <Server className="h-5 w-5 text-blue-500" />
              <h3 className="font-semibold">Environnement</h3>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">URL:</span>
                <p className="font-mono text-xs">{diagnostics.environment.url}</p>
              </div>
              <div>
                <span className="text-gray-600">En ligne:</span>
                <p className={diagnostics.environment.online ? 'text-green-600' : 'text-red-600'}>
                  {diagnostics.environment.online ? 'Oui' : 'Non'}
                </p>
              </div>
              <div>
                <span className="text-gray-600">LocalStorage:</span>
                <p className={diagnostics.environment.localStorage.available ? 'text-green-600' : 'text-red-600'}>
                  {diagnostics.environment.localStorage.available ? 'Disponible' : 'Indisponible'}
                </p>
              </div>
              <div>
                <span className="text-gray-600">IndexedDB:</span>
                <p className={diagnostics.environment.indexedDB ? 'text-green-600' : 'text-red-600'}>
                  {diagnostics.environment.indexedDB ? 'Disponible' : 'Indisponible'}
                </p>
              </div>
            </div>
          </div>

          {/* Connectivity */}
          <div className="border rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-3">
              <Wifi className="h-5 w-5 text-green-500" />
              <h3 className="font-semibold">Connectivité</h3>
            </div>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                {getStatusIcon(diagnostics.connectivity.internet ? 'success' : 'error')}
                <span>Internet: {diagnostics.connectivity.internet ? 'Connecté' : 'Déconnecté'}</span>
              </div>
              <div className="flex items-center space-x-2">
                {getStatusIcon(diagnostics.connectivity.supabase ? 'success' : 'error')}
                <span>Supabase: {diagnostics.connectivity.supabase ? 'Connecté' : 'Déconnecté'}</span>
              </div>
            </div>
          </div>

          {/* Storage */}
          <div className="border rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-3">
              <Database className="h-5 w-5 text-purple-500" />
              <h3 className="font-semibold">Stockage</h3>
            </div>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                {getStatusIcon(diagnostics.storage.available ? 'success' : 'error')}
                <span>IndexedDB: {diagnostics.storage.available ? 'Disponible' : 'Indisponible'}</span>
              </div>
              {diagnostics.storage.available && (
                <div className="p-3 bg-gray-50 rounded">
                  <p className="text-sm font-medium text-gray-700 mb-2">Statistiques</p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-gray-600">Total d'éléments:</span>
                      <p className="font-medium">{diagnostics.storage.totalItems}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Stores:</span>
                      <p className="font-medium">{diagnostics.storage.stores?.length || 0}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Raw Data */}
          <details className="border rounded-lg p-4">
            <summary className="cursor-pointer font-semibold">Données Brutes</summary>
            <pre className="mt-3 text-xs bg-gray-100 p-3 rounded overflow-auto">
              {JSON.stringify(diagnostics, null, 2)}
            </pre>
          </details>
        </div>
      )}

      {!diagnostics && !loading && (
        <div className="text-center py-8 text-gray-500">
          <Activity className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <p>Cliquez sur "Diagnostic Complet" pour analyser la synchronisation</p>
        </div>
      )}
    </div>
  );
};

export default DiagnosticPanel;