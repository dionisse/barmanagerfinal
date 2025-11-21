import { createClient } from '@supabase/supabase-js';
import { User } from '../types';

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

      const { data: dbUser, error } = await supabase
        .from('users')
        .select('*')
        .eq('username', username)
        .eq('password', password)
        .maybeSingle();

      console.log('🔐 Supabase:', error ? 'Erreur' : (dbUser ? 'Utilisateur trouvé' : 'Pas trouvé'));

      if (error) {
        console.error('❌', error);
        return { success: false, message: 'Erreur de connexion' };
      }

      if (!dbUser) {
        return { success: false, message: 'Identifiants incorrects' };
      }

      const user: User = {
        id: dbUser.id,
        username: dbUser.username,
        type: dbUser.role,
        dateCreation: dbUser.created_at || new Date().toISOString()
      };

      console.log('✅ Connecté:', user.username, '- Type:', user.type);

      return {
        success: true,
        user: user,
        message: 'Connexion réussie'
      };

    } catch (error) {
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

      const { data: existingUsers, error: checkError } = await supabase
        .from('users')
        .select('username')
        .in('username', [gestionnaireUsername, employeUsername]);

      if (checkError) throw checkError;

      if (existingUsers && existingUsers.length > 0) {
        return {
          success: false,
          message: `Le nom d'utilisateur "${existingUsers[0].username}" existe déjà`
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
          gestionnaire_password: gestionnairePassword,
          employe_username: employeUsername,
          employe_password: employePassword,
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
            password: gestionnairePassword,
            email: `${gestionnaireUsername}@gobex.local`,
            role: 'Gestionnaire',
            user_lot_id: userLotId
          },
          {
            username: employeUsername,
            password: employePassword,
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

    } catch (error) {
      console.error('❌ Erreur création complète:', error);
      return {
        success: false,
        message: error.message || 'Erreur lors de la création'
      };
    }
  }
}

export const simpleAuth = SimpleAuthService.getInstance();
