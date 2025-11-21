import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

// Initialize Supabase client
// Use environment variables if available (for production), otherwise use hardcoded values (for development)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://jtzshtopthamkqpgixcq.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0enNodG9wdGhhbWtxcGdpeGNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE3ODE2NTcsImV4cCI6MjA2NzM1NzY1N30.jlJ3NW_91M_zMLqZ5BTS-ud6meL3gEqN-tYjlFUsrm8';
const supabase = createClient(supabaseUrl, supabaseKey);

export class SupabaseService {
  private debugMode: boolean = true;

  // Méthode pour sauvegarder les données utilisateur (par user_lot_id)
  async saveUserData(userLotId: string, data: any): Promise<{ success: boolean; message: string }> {
    try {
      if (!navigator.onLine) {
        return {
          success: false,
          message: 'Hors ligne - impossible de sauvegarder les données'
        };
      }

      this.logDebug('Sauvegarde des données pour le groupe:', userLotId);

      // Vérifier que l'ID du lot utilisateur est valide
      if (!userLotId) {
        throw new Error('ID du groupe utilisateur manquant');
      }

      // Vérifier si les données du groupe existent déjà
      const { data: existingData, error: checkError } = await supabase
        .from('user_data')
        .select('id')
        .eq('user_lot_id', userLotId)
        .maybeSingle();

      let result;

      if (existingData) {
        // Mettre à jour les données existantes du groupe
        result = await supabase
          .from('user_data')
          .update({
            data: data,
            last_sync: new Date().toISOString()
          })
          .eq('user_lot_id', userLotId);
      } else {
        // Insérer de nouvelles données pour le groupe
        result = await supabase
          .from('user_data')
          .insert([{
            user_lot_id: userLotId,
            data: data,
            last_sync: new Date().toISOString()
          }]);
      }
      
      if (result.error) {
        throw result.error;
      }
      
      this.logDebug('Données sauvegardées avec succès pour le groupe:', userLotId);
      return {
        success: true,
        message: 'Données synchronisées avec succès'
      };
    } catch (error) {
      this.logDebug('Erreur lors de la sauvegarde des données:', error);
      return {
        success: false,
        message: `Erreur: ${error.message}`
      };
    }
  }

  // Méthode pour récupérer les données utilisateur (par user_lot_id)
  async getUserData(userLotId: string): Promise<{ success: boolean; data?: any; lastSync?: string; message?: string }> {
    try {
      if (!navigator.onLine) {
        return {
          success: false,
          message: 'Hors ligne - impossible de récupérer les données'
        };
      }

      this.logDebug('Récupération des données pour le groupe:', userLotId);

      // Vérifier que l'ID du lot utilisateur est valide
      if (!userLotId) {
        throw new Error('ID du groupe utilisateur manquant');
      }

      const { data, error } = await supabase
        .from('user_data')
        .select('*')
        .eq('user_lot_id', userLotId)
        .maybeSingle();
      
      if (error) {
        if (error.code === 'PGRST116') {
          // Aucune donnée trouvée
          return {
            success: true,
            data: null,
            message: 'Aucune donnée trouvée'
          };
        }
        throw error;
      }
      
      this.logDebug('Données récupérées avec succès pour le groupe:', userLotId);
      return {
        success: true,
        data: data.data,
        lastSync: data.last_sync
      };
    } catch (error) {
      this.logDebug('Erreur lors de la récupération des données:', error);
      return {
        success: false,
        message: `Erreur: ${error.message}`
      };
    }
  }

  // Méthode pour authentifier un utilisateur
  async authenticateUser(username: string, password: string, userType: string): Promise<{ success: boolean; user?: any; message?: string }> {
    try {
      if (!navigator.onLine) {
        return {
          success: false,
          message: 'Hors ligne - impossible de s\'authentifier'
        };
      }

      this.logDebug('Tentative d\'authentification pour:', username, userType);

      // Query users table to get user with user_lot_id
      const { data: users, error } = await supabase
        .rpc('authenticate_user', {
          p_username: username,
          p_password: password,
          p_role: userType
        });
      
      if (error) {
        throw error;
      }
      
      if (!users || users.length === 0) {
        return {
          success: false,
          message: 'Identifiants incorrects'
        };
      }

      const userData = users[0];

      // Le propriétaire a un accès illimité sans vérification de licence
      if (userData.role === 'Propriétaire') {
        this.logDebug('Authentification du propriétaire réussie - accès illimité');
        return {
          success: true,
          user: {
            id: userData.user_id,
            username: userData.username,
            type: 'Propriétaire',
            dateCreation: userData.created_at,
            userLotId: null
          }
        };
      }

      // Pour les autres utilisateurs (Gestionnaire et Employé), vérifier la licence
      if (userData.user_lot_id) {
        const { data: licenses, error: licenseError } = await supabase
          .from('licenses')
          .select('*')
          .eq('user_lot_id', userData.user_lot_id)
          .eq('active', true);

        if (licenseError) {
          throw licenseError;
        }

        if (!licenses || licenses.length === 0) {
          return {
            success: false,
            message: 'Aucune licence active trouvée pour cet utilisateur'
          };
        }

        const licenseData = licenses[0];
        const dateFin = new Date(licenseData.date_fin);

        if (dateFin < new Date()) {
          return {
            success: false,
            message: 'Licence expirée. Contactez le propriétaire.'
          };
        }

        // Vérifier le statut du lot d'utilisateurs
        const { data: userLot, error: userLotError } = await supabase
          .from('user_lots')
          .select('*')
          .eq('id', userData.user_lot_id)
          .single();

        if (userLotError) {
          throw userLotError;
        }

        if (userLot.status !== 'active') {
          return {
            success: false,
            message: 'Compte suspendu. Contactez l\'administrateur.'
          };
        }

        // Construire l'objet utilisateur avec les informations de licence
        return {
          success: true,
          user: {
            id: userData.user_id,
            username: userData.username,
            type: userData.role,
            dateCreation: userData.created_at,
            userLotId: userData.user_lot_id,
            license: {
              type: licenseData.license_type,
              dateFin: licenseData.date_fin
            }
          }
        };
      }

      // Utilisateur sans licence ni rôle propriétaire - refuser l'accès
      return {
        success: false,
        message: 'Aucune licence associée à ce compte'
      };
    } catch (error) {
      this.logDebug('Erreur lors de l\'authentification:', error);
      return {
        success: false,
        message: `Erreur: ${error.message}`
      };
    }
  }

  // Méthode pour vérifier la licence d'un utilisateur
  async checkUserLicense(username: string): Promise<{ hasAccess: boolean; license?: any; userLot?: any; message?: string }> {
    try {
      if (!navigator.onLine) {
        return { hasAccess: false, message: 'Hors ligne - impossible de vérifier la licence' };
      }

      this.logDebug('Vérification de licence pour:', username);

      // Trouver l'utilisateur
      const { data: users, error } = await supabase
        .from('users')
        .select('*')
        .eq('username', username);

      if (error) {
        throw error;
      }

      if (!users || users.length === 0) {
        return { hasAccess: false };
      }

      const userData = users[0];

      // Le propriétaire a toujours accès sans vérification de licence
      if (userData.role === 'Propriétaire') {
        this.logDebug('Propriétaire détecté - accès illimité accordé');
        return {
          hasAccess: true,
          message: 'Accès illimité - Propriétaire'
        };
      }

      const userLotId = userData.user_lot_id;

      if (!userLotId) {
        return { hasAccess: false };
      }
      
      // Récupérer le lot d'utilisateurs
      const { data: userLot, error: userLotError } = await supabase
        .from('user_lots')
        .select('*')
        .eq('id', userLotId)
        .single();
      
      if (userLotError) {
        throw userLotError;
      }
      
      if (userLot.status !== 'active') {
        return { hasAccess: false };
      }
      
      // Vérifier la licence
      const { data: licenses, error: licenseError } = await supabase
        .from('licenses')
        .select('*')
        .eq('user_lot_id', userLotId)
        .eq('active', true);
      
      if (licenseError) {
        throw licenseError;
      }
      
      if (!licenses || licenses.length === 0) {
        return { hasAccess: false, userLot };
      }
      
      const licenseData = licenses[0];

      // Normaliser les dates pour comparer uniquement les jours
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const dateFin = new Date(licenseData.date_fin);
      dateFin.setHours(23, 59, 59, 999);

      if (dateFin < today) {
        return { hasAccess: false, userLot };
      }
      
      return {
        hasAccess: true,
        license: licenseData,
        userLot
      };
    } catch (error) {
      this.logDebug('Erreur lors de la vérification de licence:', error);
      return { hasAccess: false, message: error.message };
    }
  }

  // Méthode pour enregistrer un lot d'utilisateurs et une licence
  async registerUserLotAndLicense(userLot: any, license: any): Promise<{ success: boolean; message?: string }> {
    try {
      if (!navigator.onLine) {
        return {
          success: false,
          message: 'Hors ligne - impossible d\'enregistrer'
        };
      }
      
      this.logDebug('Enregistrement d\'un lot d\'utilisateurs et licence');
      
      // Vérifier si les noms d'utilisateurs existent déjà
      const { data: existingUsers, error: checkError } = await supabase
        .from('users')
        .select('username')
        .in('username', [userLot.gestionnaire.username, userLot.employe.username]);
      
      if (checkError) {
        throw checkError;
      }
      
      if (existingUsers && existingUsers.length > 0) {
        const existingUsername = existingUsers[0].username;
        return {
          success: false,
          message: `Le nom d'utilisateur "${existingUsername}" existe déjà`
        };
      }
      
      // Créer le lot d'utilisateurs
      const { error: userLotError } = await supabase
        .from('user_lots')
        .insert([{
          id: userLot.id,
          gestionnaire_username: userLot.gestionnaire.username,
          gestionnaire_password: userLot.gestionnaire.password,
          employe_username: userLot.employe.username,
          employe_password: userLot.employe.password,
          date_creation: userLot.dateCreation,
          status: userLot.status
        }]);
      
      if (userLotError) {
        throw userLotError;
      }
      
      // Créer la licence
      const { error: licenseError } = await supabase
        .from('licenses')
        .insert([{
          id: license.id,
          license_type: license.type,
          duree: license.duree,
          prix: license.prix,
          date_debut: license.dateDebut,
          date_fin: license.dateFin,
          cle: license.cle,
          active: license.active,
          user_lot_id: userLot.id
        }]);
      
      if (licenseError) {
        throw licenseError;
      }
      
      // Créer les utilisateurs dans la table users
      const { error: usersError } = await supabase
        .from('users')
        .insert([
          {
            email: `${userLot.gestionnaire.username}@gobex.local`,
            username: userLot.gestionnaire.username,
            password: userLot.gestionnaire.password,
            role: 'Gestionnaire',
            user_lot_id: userLot.id
          },
          {
            email: `${userLot.employe.username}@gobex.local`,
            username: userLot.employe.username,
            password: userLot.employe.password,
            role: 'Employé',
            user_lot_id: userLot.id
          }
        ]);
      
      if (usersError) {
        throw usersError;
      }
      
      return {
        success: true
      };
    } catch (error) {
      this.logDebug('Erreur lors de l\'enregistrement:', error);
      return {
        success: false,
        message: `Erreur: ${error.message || 'Erreur inconnue lors de l\'enregistrement'}`
      };
    }
  }

  // Méthode pour tester la connectivité
  async testConnection(): Promise<boolean> {
    try {
      this.logDebug('Test de connectivité Supabase...');
      
      if (!navigator.onLine) {
        this.logDebug('Appareil hors ligne - test de connexion échoué');
        return false;
      }
      
      // Tester la connexion en faisant une requête simple
      const { data, error } = await supabase
        .from('users')
        .select('id')
        .limit(1);
      
      if (error) {
        this.logDebug('Erreur de connexion Supabase:', error);
        return false;
      }
      
      this.logDebug('Connexion Supabase réussie');
      return true;
    } catch (error) {
      this.logDebug('Test de connexion échoué:', error);
      return false;
    }
  }

  // Méthode pour les logs de debug
  private logDebug(...args: any[]): void {
    if (this.debugMode) {
      const timestamp = new Date().toISOString().split('T')[1].split('.')[0]; // Format HH:MM:SS
      console.log(`🔷 [SupabaseService ${timestamp}]`, ...args);
    }
  }

  // Activer/désactiver le mode debug
  setDebugMode(enabled: boolean): void {
    this.debugMode = enabled;
    this.logDebug(`Mode debug ${enabled ? 'activé' : 'désactivé'}`);
  }
}

export const supabaseService = new SupabaseService();
export { supabase };