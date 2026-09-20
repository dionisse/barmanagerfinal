import { createClient } from '@supabase/supabase-js';

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
    } catch (error: any) {
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
    } catch (error: any) {
      this.logDebug('Erreur lors de la récupération des données:', error);
      return {
        success: false,
        message: `Erreur: ${error.message}`
      };
    }
  }

  // Méthode pour authentifier un utilisateur — support hash bcrypt + essai
  async authenticateUser(username: string, password: string, userType: string): Promise<{ success: boolean; user?: any; message?: string }> {
    try {
      if (!navigator.onLine) {
        return {
          success: false,
          message: 'Hors ligne - impossible de s\'authentifier'
        };
      }

      this.logDebug('Tentative d\'authentification pour:', username, userType);

      // 1. Récupère l'utilisateur directement (pour gérer hash bcrypt)
      const { data: dbUser, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('username', username)
        .maybeSingle();

      if (userError) throw userError;

      if (!dbUser) {
        // Fallback RPC ancien système
        try {
          const { data: users, error } = await supabase
            .rpc('authenticate_user', {
              p_username: username,
              p_password: password,
              p_role: userType
            });
          if (!error && users && users.length > 0) {
            const userData = users[0];
            if (userData.role === 'Propriétaire') {
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
          }
        } catch {}
        return { success: false, message: 'Identifiants incorrects' };
      }

      // Vérifie mot de passe avec support hash + legacy plain
      const { verifyPassword } = await import('./securityService');
      const valid = await verifyPassword(password, dbUser.password);
      if (!valid) {
        return { success: false, message: 'Identifiants incorrects' };
      }

      if (dbUser.role && userType && dbUser.role !== userType && userType !== 'Propriétaire' && dbUser.role !== 'Propriétaire') {
        // Tolère si type différent mais laisse passer (pour compatibilité)
      }

      // Le propriétaire a un accès illimité sans vérification de licence
      if (dbUser.role === 'Propriétaire') {
        this.logDebug('Authentification du propriétaire réussie - accès illimité');
        return {
          success: true,
          user: {
            id: dbUser.id,
            username: dbUser.username,
            type: 'Propriétaire',
            dateCreation: dbUser.created_at,
            userLotId: null
          }
        };
      }

      // Pour les autres utilisateurs (Gestionnaire et Employé), vérifier la licence / essai
      if (dbUser.user_lot_id) {
        const { data: userLot } = await supabase
          .from('user_lots')
          .select('*')
          .eq('id', dbUser.user_lot_id)
          .maybeSingle();

        if (userLot && userLot.status !== 'active') {
          return { success: false, message: 'Compte suspendu. Contactez l\'administrateur.' };
        }

        const { data: licenses } = await supabase
          .from('licenses')
          .select('*')
          .eq('user_lot_id', dbUser.user_lot_id)
          .eq('active', true)
          .order('date_fin', { ascending: false });

        // Si essai et expiré, on autorise quand même en lecture seule (le blocage se fait dans dataService)
        if (userLot?.is_trial) {
          const trialEnds = userLot.trial_ends_at ? new Date(userLot.trial_ends_at) : null;
          const isTrialExpired = trialEnds ? trialEnds < new Date() : false;
          if (isTrialExpired && (!licenses || licenses.length === 0)) {
            // Retourne user mais flag essai expiré
            return {
              success: true,
              user: {
                id: dbUser.id,
                username: dbUser.username,
                type: dbUser.role,
                dateCreation: dbUser.created_at,
                userLotId: dbUser.user_lot_id,
                license: null,
                isTrialExpired: true
              }
            };
          }
        }

        if (!licenses || licenses.length === 0) {
          // Pas de licence mais peut être essai encore valide
          if (userLot?.is_trial) {
            const trialEnds = userLot.trial_ends_at ? new Date(userLot.trial_ends_at) : null;
            if (trialEnds && trialEnds >= new Date()) {
              return {
                success: true,
                user: {
                  id: dbUser.id,
                  username: dbUser.username,
                  type: dbUser.role,
                  dateCreation: dbUser.created_at,
                  userLotId: dbUser.user_lot_id,
                  license: null
                }
              };
            }
          }
          return { success: false, message: 'Aucune licence active trouvée pour cet utilisateur' };
        }

        // Cherche licence valide
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const sorted = licenses
          .map((l: any) => ({ license: l, dateFin: new Date(l.date_fin) }))
          .map(({ license, dateFin }: any) => {
            dateFin.setHours(23, 59, 59, 999);
            return { license, dateFin };
          })
          .filter(({ dateFin }: any) => dateFin >= today)
          .sort((a: any, b: any) => b.dateFin.getTime() - a.dateFin.getTime());

        // Si aucune licence ne couvre aujourd'hui mais essai expiré -> lecture seule
        if (sorted.length === 0) {
          // Vérifie si essai expiré
          if (userLot?.is_trial) {
            return {
              success: true,
              user: {
                id: dbUser.id,
                username: dbUser.username,
                type: dbUser.role,
                dateCreation: dbUser.created_at,
                userLotId: dbUser.user_lot_id,
                license: licenses[0],
                isExpired: true
              }
            };
          }
          return { success: false, message: 'Licence expirée. Contactez le propriétaire.' };
        }

        const licenseData = sorted[0].license;

        return {
          success: true,
          user: {
            id: dbUser.id,
            username: dbUser.username,
            type: dbUser.role,
            dateCreation: dbUser.created_at,
            userLotId: dbUser.user_lot_id,
            license: {
              type: licenseData.license_type,
              dateFin: licenseData.date_fin,
              id: licenseData.id,
              isTrial: !!licenseData.is_trial
            }
          }
        };
      }

      return { success: false, message: 'Aucune licence associée à ce compte' };
    } catch (error: any) {
      this.logDebug('Erreur lors de l\'authentification:', error);
      return { success: false, message: `Erreur: ${error.message}` };
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

      if (error) throw error;

      if (!users || users.length === 0) {
        return { hasAccess: false };
      }

      const userData = users[0];

      // Le propriétaire a toujours accès sans vérification de licence
      if (userData.role === 'Propriétaire') {
        this.logDebug('Propriétaire détecté - accès illimité accordé');
        return { hasAccess: true, message: 'Accès illimité - Propriétaire' };
      }

      const userLotId = userData.user_lot_id;
      if (!userLotId) return { hasAccess: false };
      
      // Récupérer le lot d'utilisateurs
      const { data: userLot, error: userLotError } = await supabase
        .from('user_lots')
        .select('*')
        .eq('id', userLotId)
        .maybeSingle();

      if (userLotError) {
        this.logDebug('Erreur lors de la récupération du user_lot:', userLotError);
        throw userLotError;
      }

      if (!userLot) {
        this.logDebug('UserLot non trouvé pour ID:', userLotId);
        return { hasAccess: false, message: 'Lot d\'utilisateurs introuvable' };
      }
      
      if (userLot.status !== 'active' && userLot.status !== 'suspended') {
        // 'suspended' peut quand même avoir accès lecture seule, on gère plus bas
      }
      if (userLot.status === 'suspended' && !userLot.is_trial) {
        return { hasAccess: false, userLot, message: 'Compte suspendu' };
      }
      
      // Vérifier la licence
      const { data: licenses, error: licenseError } = await supabase
        .from('licenses')
        .select('*')
        .eq('user_lot_id', userLotId)
        .eq('active', true);
      
      if (licenseError) throw licenseError;
      
      // Si pas de licence mais essai
      if (!licenses || licenses.length === 0) {
        if (userLot.is_trial && userLot.trial_ends_at) {
          const trialEnd = new Date(userLot.trial_ends_at);
          const now = new Date();
          if (trialEnd >= now) {
            return { hasAccess: true, userLot, license: null };
          } else {
            // Essai expiré -> lecture seule, pas d'accès écriture mais on retourne hasAccess false avec userLot pour banner
            return { hasAccess: false, userLot, license: null, message: 'Essai expiré' };
          }
        }
        return { hasAccess: false, userLot };
      }
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const sorted = (licenses || [])
        .map((l: any) => ({ license: l, dateFin: new Date(l.date_fin) }))
        .map(({ license, dateFin }: any) => {
          dateFin.setHours(23, 59, 59, 999);
          return { license, dateFin };
        })
        .filter(({ dateFin }: any) => dateFin >= today)
        .sort((a: any, b: any) => b.dateFin.getTime() - a.dateFin.getTime());

      if (sorted.length === 0) {
        // Toutes licences expirées mais si essai aussi expiré, on retourne expiré
        return { hasAccess: false, userLot, license: licenses[0], message: 'Licence expirée' };
      }

      const licenseData = sorted[0].license;
      
      return { hasAccess: true, license: licenseData, userLot };
    } catch (error: any) {
      this.logDebug('Erreur lors de la vérification de licence:', error);
      return { hasAccess: false, message: error.message };
    }
  }

  // Méthode pour enregistrer un lot d'utilisateurs et une licence
  async registerUserLotAndLicense(userLot: any, license: any): Promise<{ success: boolean; message?: string }> {
    try {
      if (!navigator.onLine) {
        return { success: false, message: 'Hors ligne - impossible d\'enregistrer' };
      }
      
      this.logDebug('Enregistrement d\'un lot d\'utilisateurs et licence');
      
      // Vérifier si les noms d'utilisateurs existent déjà
      const { data: existingUsers, error: checkError } = await supabase
        .from('users')
        .select('username')
        .in('username', [userLot.gestionnaire.username, userLot.employe.username]);
      
      if (checkError) throw checkError;
      
      if (existingUsers && existingUsers.length > 0) {
        const existingUsername = existingUsers[0].username;
        return { success: false, message: `Le nom d'utilisateur \"${existingUsername}\" existe déjà` };
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
      
      if (userLotError) throw userLotError;
      
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
      
      if (licenseError) throw licenseError;
      
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
      
      if (usersError) throw usersError;
      
      return { success: true };
    } catch (error: any) {
      this.logDebug('Erreur lors de l\'enregistrement:', error);
      return { success: false, message: `Erreur: ${error.message || 'Erreur inconnue lors de l\'enregistrement'}` };
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
