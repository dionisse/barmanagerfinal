import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { packageManager } from './utils/packageManager';
import { supabaseService } from './utils/supabaseService';
import { indexedDBService } from './utils/indexedDBService';

// Initialiser le package au démarrage
packageManager.initializePackage().then(() => {
  console.log('📦 GOBEX Package initialisé');
  
  // Vérifier la disponibilité d'IndexedDB
  indexedDBService.isAvailable().then(available => {
    console.log(`🗄️ IndexedDB ${available ? 'disponible' : 'non disponible'}`);

    if (!available) {
      alert('Attention: IndexedDB n\'est pas disponible dans ce navigateur. L\'application pourrait ne pas fonctionner correctement.');
    }
  });

  // Supabase est prêt à être utilisé
  console.log('🔷 Supabase initialisé et prêt');
}).catch((error) => {
  console.error('❌ Erreur lors de l\'initialisation du package:', error);
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);