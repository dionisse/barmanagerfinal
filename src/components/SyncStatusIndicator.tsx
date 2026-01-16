import React, { useState, useEffect } from 'react';
import { Cloud, CloudOff, RefreshCw, Wifi, WifiOff, CheckCircle, AlertTriangle, Clock } from 'lucide-react';
import { enhancedSyncService } from '../utils/enhancedSyncService';
import { supabaseService } from '../utils/supabaseService';

interface SyncStatusIndicatorProps {
  user: any;
}

const SyncStatusIndicator: React.FC<SyncStatusIndicatorProps> = ({ user }) => {
  const [syncStatus, setSyncStatus] = useState<any>({
    isActive: false,
    isOnline: navigator.onLine,
    lastSync: null,
    userId: null,
    lastAttempt: null,
    status: null
  });
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    // Vérifier la connectivité Supabase au chargement
    const checkSupabaseConnection = async () => {
      try {
        await supabaseService.testConnection();
      } catch (error) {
        console.error('Erreur de connexion Supabase:', error);
      }
    };
    
    checkSupabaseConnection();
    
    const updateStatus = async () => {
      const status = await enhancedSyncService.getSyncStatus();
      setSyncStatus(status);
    };
    
    // Mettre à jour le statut immédiatement
    updateStatus();
    
    // Puis mettre à jour périodiquement
    const interval = setInterval(() => {
      updateStatus();
    }, 5000); // Mettre à jour toutes les 5 secondes

    return () => clearInterval(interval);
  }, []);

  const handleManualSync = async () => {
    if (!user?.id || syncing) return;

    setSyncing(true);
    console.log('Tentative de synchronisation manuelle depuis l\'indicateur...');

    try {
      const connected = await supabaseService.testConnection();
      if (!connected) {
        console.error('Impossible de se connecter à Supabase');
        alert('Erreur de connexion à Supabase. Vérifiez votre configuration.');
        return;
      }

      const result = await enhancedSyncService.manualSync(user.id);

      const status = await enhancedSyncService.getSyncStatus();
      setSyncStatus(status);

      if (!result.success) {
        console.error('Échec de la synchronisation:', result.message);
        alert(`Erreur de synchronisation: ${result.message}`);
      }
    } catch (error) {
      console.error('Erreur lors de la synchronisation manuelle:', error);
      alert(`Erreur de synchronisation: ${error.message}`);
    } finally {
      setSyncing(false);
    }
  };

  const formatLastSync = (syncTime: string | null) => {
    if (!syncTime) return 'Jamais';
    
    const now = new Date();
    const sync = new Date(syncTime);
    const diffMs = now.getTime() - sync.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'À l\'instant';
    if (diffMins < 60) return `${diffMins}min`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}j`;
  };

  const getSyncStatusColor = () => {
    if (!syncStatus.isOnline) return 'text-gray-500';
    if (!syncStatus.lastSync) return 'text-amber-500';
    if (syncStatus.status === 'error') return 'text-red-500';
    if (syncStatus.status === 'pending') return 'text-blue-500';
    
    const now = new Date();
    const sync = new Date(syncStatus.lastSync);
    const diffMs = now.getTime() - sync.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 5) return 'text-green-500';
    if (diffMins < 30) return 'text-amber-500';
    return 'text-red-500';
  };

  const getSyncIcon = () => {
    if (syncing) return <RefreshCw className="h-4 w-4 animate-spin" />;
    if (!syncStatus.isOnline) return <CloudOff className="h-4 w-4" />;
    if (syncStatus.status === 'error') return <AlertTriangle className="h-4 w-4" />;
    if (syncStatus.status === 'pending') return <RefreshCw className="h-4 w-4" />;
    if (!syncStatus.lastSync) return <AlertTriangle className="h-4 w-4" />;
    
    const now = new Date();
    const sync = new Date(syncStatus.lastSync);
    const diffMs = now.getTime() - sync.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 10) return <CheckCircle className="h-4 w-4" />;
    return <Clock className="h-4 w-4" />;
  };

  return (
    <div className="flex items-center space-x-3">
      {/* Statut de connexion */}
      <div className="flex items-center space-x-1 px-2 py-1 bg-white rounded-lg shadow-sm border">
        {syncStatus.isOnline ? (
          <Wifi className="h-3 w-3 text-green-500" />
        ) : (
          <WifiOff className="h-3 w-3 text-red-500" />
        )}
        <span className="text-xs text-gray-600">
          {syncStatus.isOnline ? 'En ligne' : 'Hors ligne'}
        </span>
      </div>

      {/* Statut de synchronisation */}
      <div className="flex items-center space-x-2 px-3 py-1 bg-white rounded-lg shadow-sm border">
        <div className={getSyncStatusColor()}>
          {getSyncIcon()}
        </div>
        <div className="flex flex-col">
          <span className="text-xs text-gray-600">
            Sync: {formatLastSync(syncStatus.lastSync)}
          </span>
          <div className="flex items-center space-x-1">
            <div className={`w-2 h-2 rounded-full ${
              syncStatus.isActive ? 'bg-green-400' : 'bg-gray-400'
            }`} />
            <span className="text-xs text-gray-500">
              {syncStatus.isActive ? 'Auto' : 'Manuel'}
            </span>
          </div>
        </div>
        
        {/* Bouton de synchronisation manuelle */}
        {syncStatus.isOnline && (
          <button
            onClick={handleManualSync}
            disabled={syncing}
            className="text-blue-600 hover:text-blue-800 disabled:opacity-50 disabled:cursor-not-allowed p-1 rounded hover:bg-blue-50 transition-colors"
            title="Synchroniser maintenant"
          >
            <RefreshCw className={`h-3 w-3 ${syncing ? 'animate-spin' : ''}`} />
          </button>
        )}
      </div>
    </div>
  );
};

export default SyncStatusIndicator;