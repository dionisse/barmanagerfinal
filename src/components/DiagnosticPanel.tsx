import React, { useState, useEffect } from 'react';
import { Activity, AlertTriangle, CheckCircle, XCircle, RefreshCw, Database, Wifi, Server, Flame, FileText } from 'lucide-react';
import { supabaseService } from '../utils/supabaseService';
import { indexedDBService } from '../utils/indexedDBService'; 
import { enhancedSyncService } from '../utils/enhancedSyncService';

const DiagnosticPanel: React.FC = () => {
  const [diagnostics, setDiagnostics] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [authTest, setAuthTest] = useState<any>(null);
  const [storageStats, setStorageStats] = useState<any>(null);

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
        <div className="flex space-x-3">
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