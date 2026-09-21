import { createClient } from '@supabase/supabase-js';
import { User } from '../types';
import { verifyPassword } from './securityService';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export interface AuthResult {
  success: boolean;
  user?: User;
  message?: string;
}

class SimpleAuthService {
  private static instance: SimpleAuthService;

  private constructor() {}

  static getInstance(): SimpleAuthService {
    if (!SimpleAuthService.instance) {
      SimpleAuthService.instance = new SimpleAuthService();
    }
    return SimpleAuthService.instance;
  }

  async login(username: string, password: string): Promise<AuthResult> {
    try {
      console.log('🔐 Connexion:', username);

      // Récupère l'utilisateur sans filtrer sur password (car hash)
      const { data: dbUser, error } = await supabase
        .from('users')
        .select('*')
        .eq('username', username)
        .maybeSingle();

      console.log('🔐 Supabase:', error ? 'Erreur' : (dbUser ? 'Utilisateur trouvé' : 'Pas trouvé'));

      if (error) {
        console.error('❌', error);
        return { success: false, message: 'Erreur de connexion' };
      }

      if (!dbUser) {
        return { success: false, message: 'Identifiants incorrects' };
      }

      // Vérification mot de passe avec support hash + legacy plain
      const isPasswordValid = await verifyPassword(password, dbUser.password);
      if (!isPasswordValid) {
        // Fallback : vérifie aussi dans user_lots (ancien système)
        try {
          const { data: lot } = await supabase
            .from('user_lots')
            .select('gestionnaire_password, employe_password, gestionnaire_username, employe_username')
            .or(`gestionnaire_username.eq.${username},employe_username.eq.${username}`)
            .maybeSingle();

          if (lot) {
            const lotPass = lot.gestionnaire_username === username ? lot.gestionnaire_password : lot.employe_password;
            const lotValid = await verifyPassword(password, lotPass);
            if (!lotValid) {
              return { success: false, message: 'Identifiants incorrects' };
            }
          } else {
            return { success: false, message: 'Identifiants incorrects' };
          }
        } catch {
          return { success: false, message: 'Identifiants incorrects' };
        }
      }

      // Vérifie si user_lot est en essai expiré -> on laisse passer mais flag read-only sera géré par TrialBanner + dataService
      // Vérifie licence active
      let userLotId = dbUser.user_lot_id;
      let licenseInfo: any = null;

      if (userLotId) {
        try {
          const { data: licenses } = await supabase
            .from('licenses')
            .select('*')
            .eq('user_lot_id', userLotId)
            .eq('active', true)
            .order('date_fin', { ascending: false });

          if (licenses && licenses.length > 0) {
            // Trouve licence couvrant aujourd'hui ou la plus récente
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const valid = licenses.find(l => new Date(l.date_fin) >= today);
            licenseInfo = valid || licenses[0];
          }

          // Vérifie statut user_lot
          const { data: ul } = await supabase
            .from('user_lots')
            .select('is_trial, trial_ends_at, status')
            .eq('id', userLotId)
            .maybeSingle();

          if (ul) {
            if (ul.status === 'suspended') {
              return { success: false, message: 'Compte suspendu. Contactez le support.' };
            }
            // Si essai expiré et pas de licence valide, on autorise quand même en lecture seule (bloqué dans dataService)
          }
        } catch (e) {
          console.warn('⚠️ Vérif licence échouée (non bloquant):', e);
        }
      }

      // Propriétaire : accès illimité
      if (dbUser.role === 'Propriétaire' || username === 'gobexpropriétaire') {
        const user: User = {
          id: dbUser.id || 'owner-001',
          username: dbUser.username,
          type: dbUser.role || 'Propriétaire',
          dateCreation: dbUser.created_at || new Date().toISOString(),
          userLotId: null
        };
        console.log('👑 Propriétaire connecté');
        return { success: true, user, message: 'Connexion réussie' };
      }

      const user: User = {
        id: dbUser.id,
        username: dbUser.username,
        type: dbUser.role,
        dateCreation: dbUser.created_at || new Date().toISOString(),
        userLotId: userLotId,
        license: licenseInfo ? {
          id: licenseInfo.id,
          type: licenseInfo.license_type,
          duree: licenseInfo.duree,
          prix: licenseInfo.prix,
          dateDebut: licenseInfo.date_debut,
          dateFin: licenseInfo.date_fin,
          cle: licenseInfo.cle,
          active: licenseInfo.active,
          userLotId: licenseInfo.user_lot_id,
          isTrial: !!licenseInfo.is_trial
        } as any : undefined
      };

      console.log('✅ Connecté:', user.username, '- Type:', user.type);

      return {
        success: true,
        user: user,
        message: 'Connexion réussie'
      };

    } catch (error: any) {
      console.error('❌ Erreur:', error);
      return { success: false, message: 'Erreur inattendue' };
    }
  }

  logout(): void {
    console.log('👋 Déconnexion');
  }

  async createUserLotWithLicense(
    gestionnaireUsername: string,
    gestionnairePassword: string,
    employeUsername: string,
    employePassword: string,
    licenseType: string,
    duree: number,
    prix: number
  ): Promise<{ success: boolean; message?: string }> {
    try {
      console.log('📝 Création lot utilisateurs + licence');

      const { hashPassword } = await import('./securityService');
      const hashedGestionnaire = await hashPassword(gestionnairePassword);
      const hashedEmploye = await hashPassword(employePassword);

      const { data: existingUsers, error: checkError } = await supabase
        .from('users')
        .select('username')
        .in('username', [gestionnaireUsername, employeUsername]);

      if (checkError) throw checkError;

      if (existingUsers && existingUsers.length > 0) {
        return {
          success: false,
          message: `Le nom d'utilisateur "${existingUsers[0].username}" existe déjà dans users`
        };
      }

      const { data: existingLots, error: lotsCheckError } = await supabase
        .from('user_lots')
        .select('gestionnaire_username, employe_username')
        .or(`gestionnaire_username.eq.${gestionnaireUsername},employe_username.eq.${employeUsername},gestionnaire_username.eq.${gestionnaireUsername},employe_username.eq.${employeUsername}`);

      if (lotsCheckError) throw lotsCheckError;

      if (existingLots && existingLots.length > 0) {
        const existingUsername = existingLots[0].gestionnaire_username === gestionnaireUsername ||
                                 existingLots[0].gestionnaire_username === employeUsername
          ? existingLots[0].gestionnaire_username
          : existingLots[0].employe_username;
        return {
          success: false,
          message: `Le nom d'utilisateur "${existingUsername}" existe déjà dans user_lots`
        };
      }

      const userLotId = `UL-${Date.now()}`;
      const dateDebut = new Date();
      const dateFin = new Date(dateDebut);
      dateFin.setMonth(dateFin.getMonth() + duree);

      const { error: lotError } = await supabase
        .from('user_lots')
        .insert([{
          id: userLotId,
          gestionnaire_username: gestionnaireUsername,
          gestionnaire_password: hashedGestionnaire,
          employe_username: employeUsername,
          employe_password: hashedEmploye,
          date_creation: dateDebut.toISOString(),
          status: 'active'
        }]);

      if (lotError) {
        console.error('❌ Erreur création user_lot:', lotError);
        throw lotError;
      }

      console.log('✅ UserLot créé:', userLotId);

      const licenseKey = `${licenseType.substring(0, 3).toUpperCase()}-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

      const { error: licenseError } = await supabase
        .from('licenses')
        .insert([{
          id: `LIC-${userLotId}`,
          license_type: licenseType,
          duree,
          prix,
          date_debut: dateDebut.toISOString(),
          date_fin: dateFin.toISOString(),
          cle: licenseKey,
          active: true,
          user_lot_id: userLotId
        }]);

      if (licenseError) {
        console.error('❌ Erreur création licence:', licenseError);
        await supabase.from('user_lots').delete().eq('id', userLotId);
        throw licenseError;
      }

      console.log('✅ Licence créée');

      const { error: usersError } = await supabase
        .from('users')
        .insert([
          {
            username: gestionnaireUsername,
            password: hashedGestionnaire,
            email: `${gestionnaireUsername}@gobex.local`,
            role: 'Gestionnaire',
            user_lot_id: userLotId
          },
          {
            username: employeUsername,
            password: hashedEmploye,
            email: `${employeUsername}@gobex.local`,
            role: 'Employé',
            user_lot_id: userLotId
          }
        ]);

      if (usersError) {
        console.error('❌ Erreur création users:', usersError);
        await supabase.from('licenses').delete().eq('user_lot_id', userLotId);
        await supabase.from('user_lots').delete().eq('id', userLotId);
        throw usersError;
      }

      console.log('✅ Utilisateurs créés');

      return {
        success: true,
        message: 'Lot d\'utilisateurs et licence créés avec succès'
      };

    } catch (error: any) {
      console.error('❌ Erreur création complète:', error);
      return {
        success: false,
        message: error.message || 'Erreur lors de la création'
      };
    }
  }
}

export const simpleAuth = SimpleAuthService.getInstance();
