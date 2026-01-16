import React, { useState, useEffect } from 'react';
import { Cloud, CloudOff, RefreshCw, Wifi, WifiOff, CheckCircle, AlertTriangle } from 'lucide-react';
import { syncService } from '../utils/syncService';

interface SyncStatusProps {
  user: any;
}

const SyncStatus: React.FC<SyncStatusProps> = ({ user }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Charger la dernière synchronisation
    setLastSync(syncService.getLastSyncTime());

    // Mettre à jour la dernière synchronisation toutes les minutes
    const interval = setInterval(() => {
      setLastSync(syncService.getLastSyncTime());
    }, 60000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  const handleManualSync = async () => {
    const syncId = user?.userLotId || user?.id;
    if (!syncId || syncing) return;

    setSyncing(true);
    try {
      const result = await syncService.manualSync(syncId);
      if (result.success) {
        setLastSync(new Date().toISOString());
      }
    } catch (error) {
      console.error('Erreur lors de la synchronisation manuelle:', error);
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
    if (diffMins < 60) return `Il y a ${diffMins} min`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `Il y a ${diffDays} jour(s)`;
  };

  const getSyncStatusColor = () => {
    if (!isOnline) return 'text-gray-500';
    if (!lastSync) return 'text-amber-500';
    
    const now = new Date();
    const sync = new Date(lastSync);
    const diffMs = now.getTime() - sync.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 10) return 'text-green-500';
    if (diffMins < 60) return 'text-amber-500';
    return 'text-red-500';
  };

  const getSyncIcon = () => {
    if (syncing) return <RefreshCw className="h-4 w-4 animate-spin" />;
    if (!isOnline) return <CloudOff className="h-4 w-4" />;
    if (!lastSync) return <AlertTriangle className="h-4 w-4" />;
    
    const now = new Date();
    const sync = new Date(lastSync);
    const diffMs = now.getTime() - sync.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 10) return <CheckCircle className="h-4 w-4" />;
    return <Cloud className="h-4 w-4" />;
  };

  if (user?.type === 'Propriétaire') {
    return null; // Le propriétaire n'a pas besoin de synchronisation
  }

  return (
    <div className="flex items-center space-x-2 px-3 py-1 bg-white rounded-lg shadow-sm border">
      {/* Statut de connexion */}
      <div className="flex items-center space-x-1">
        {isOnline ? (
          <Wifi className="h-3 w-3 text-green-500" />
        ) : (
          <WifiOff className="h-3 w-3 text-red-500" />
        )}
        <span className="text-xs text-gray-600">
          {isOnline ? 'En ligne' : 'Hors ligne'}
        </span>
      </div>

      <div className="w-px h-4 bg-gray-300" />

      {/* Statut de synchronisation */}
      <div className="flex items-center space-x-1">
        <div className={getSyncStatusColor()}>
          {getSyncIcon()}
        </div>
        <span className="text-xs text-gray-600">
          {formatLastSync(lastSync)}
        </span>
      </div>

      {/* Bouton de synchronisation manuelle */}
      {isOnline && (
        <button
          onClick={handleManualSync}
          disabled={syncing}
          className="text-blue-600 hover:text-blue-800 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Synchroniser maintenant"
        >
          <RefreshCw className={`h-3 w-3 ${syncing ? 'animate-spin' : ''}`} />
        </button>
      )}
    </div>
  );
};

export default SyncStatus;