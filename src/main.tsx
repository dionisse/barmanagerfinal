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
  
  // Tester la connectivité Firebase
  if (navigator.onLine) {
    supabaseService.testConnection()
      .then(connected => {
        console.log(`🔷 Supabase ${connected ? 'connecté' : 'non connecté'}`);
      })
      .catch(error => {
        console.error('❌ Erreur de connexion Supabase:', error);
      });
  } else {
    console.log('📴 Appareil hors ligne - test de connectivité Supabase ignoré');
  }
}).catch((error) => {
  console.error('❌ Erreur lors de l\'initialisation du package:', error);
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);