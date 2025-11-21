import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://jtzshtopthamkqpgixcq.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0enNodG9wdGhhbWtxcGdpeGNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE3ODE2NTcsImV4cCI6MjA2NzM1NzY1N30.jlJ3NW_91M_zMLqZ5BTS-ud6meL3gEqN-tYjlFUsrm8';
const supabase = createClient(supabaseUrl, supabaseKey);

export interface AuthResult {
  success: boolean;
  user?: {
    username: string;
    role: string;
    email: string;
  };
  hasLicenseAccess?: boolean;
  licenseInfo?: {
    type: string;
    dateDebut: string;
    dateFin: string;
  };
  message?: string;
}

export class SimpleAuthService {
  private static instance: SimpleAuthService;

  private constructor() {}

  static getInstance(): SimpleAuthService {
    if (!this.instance) {
      this.instance = new SimpleAuthService();
    }
    return this.instance;
  }

  async login(username: string, password: string): Promise<AuthResult> {
    try {
      console.log('🔐 SimpleAuth - Tentative de connexion:', username);
      console.log('🔐 SimpleAuth - Longueur mot de passe:', password.length);

      if (!navigator.onLine) {
        return {
          success: false,
          message: 'Aucune connexion Internet. Connexion impossible.'
        };
      }

      console.log('🔐 SimpleAuth - Envoi requête Supabase...');
      const { data: users, error } = await supabase
        .from('users')
        .select('*')
        .eq('username', username)
        .eq('password', password);

      console.log('🔐 SimpleAuth - Réponse reçue. Erreur:', error, 'Utilisateurs:', users?.length);

      if (error) {
        console.error('❌ Erreur Supabase:', error);
        return {
          success: false,
          message: 'Erreur de connexion à la base de données'
        };
      }

      if (!users || users.length === 0) {
        console.warn('⚠️ Utilisateur non trouvé ou mot de passe incorrect');
        return {
          success: false,
          message: 'Nom d\'utilisateur ou mot de passe incorrect'
        };
      }

      const user = users[0];
      console.log('✅ Utilisateur trouvé:', user.username, 'Role:', user.role);

      if (user.role === 'Propriétaire') {
        console.log('👑 Propriétaire - Accès illimité');
        return {
          success: true,
          user: {
            username: user.username,
            role: user.role,
            email: user.email
          },
          hasLicenseAccess: true,
          message: 'Accès illimité - Propriétaire'
        };
      }

      if (!user.user_lot_id) {
        console.warn('⚠️ Utilisateur sans user_lot_id');
        return {
          success: true,
          user: {
            username: user.username,
            role: user.role,
            email: user.email
          },
          hasLicenseAccess: false,
          message: 'Utilisateur sans licence associée'
        };
      }

      const { data: userLot, error: lotError } = await supabase
        .from('user_lots')
        .select('*')
        .eq('id', user.user_lot_id)
        .single();

      if (lotError || !userLot) {
        console.error('❌ UserLot non trouvé:', lotError);
        return {
          success: true,
          user: {
            username: user.username,
            role: user.role,
            email: user.email
          },
          hasLicenseAccess: false,
          message: 'Lot d\'utilisateurs non trouvé'
        };
      }

      if (userLot.status !== 'active') {
        console.warn('⚠️ UserLot inactif');
        return {
          success: true,
          user: {
            username: user.username,
            role: user.role,
            email: user.email
          },
          hasLicenseAccess: false,
          message: 'Lot d\'utilisateurs inactif'
        };
      }

      const { data: licenses, error: licenseError } = await supabase
        .from('licenses')
        .select('*')
        .eq('user_lot_id', user.user_lot_id)
        .eq('active', true);

      if (licenseError) {
        console.error('❌ Erreur licence:', licenseError);
        return {
          success: true,
          user: {
            username: user.username,
            role: user.role,
            email: user.email
          },
          hasLicenseAccess: false,
          message: 'Erreur lors de la vérification de la licence'
        };
      }

      if (!licenses || licenses.length === 0) {
        console.warn('⚠️ Aucune licence active');
        return {
          success: true,
          user: {
            username: user.username,
            role: user.role,
            email: user.email
          },
          hasLicenseAccess: false,
          message: 'Aucune licence active trouvée'
        };
      }

      const license = licenses[0];
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const dateFin = new Date(license.date_fin);
      dateFin.setHours(23, 59, 59, 999);

      if (dateFin < today) {
        console.warn('⚠️ Licence expirée:', dateFin);
        return {
          success: true,
          user: {
            username: user.username,
            role: user.role,
            email: user.email
          },
          hasLicenseAccess: false,
          licenseInfo: {
            type: license.license_type,
            dateDebut: license.date_debut,
            dateFin: license.date_fin
          },
          message: 'Licence expirée'
        };
      }

      console.log('✅ Licence valide jusqu\'au:', dateFin);
      return {
        success: true,
        user: {
          username: user.username,
          role: user.role,
          email: user.email
        },
        hasLicenseAccess: true,
        licenseInfo: {
          type: license.license_type,
          dateDebut: license.date_debut,
          dateFin: license.date_fin
        },
        message: 'Connexion réussie'
      };

    } catch (error) {
      console.error('❌ Erreur inattendue:', error);
      return {
        success: false,
        message: `Erreur: ${error.message}`
      };
    }
  }

  async createOwner(username: string, password: string): Promise<{ success: boolean; message?: string }> {
    try {
      const { data: existing, error: checkError } = await supabase
        .from('users')
        .select('username')
        .eq('role', 'Propriétaire');

      if (checkError) {
        throw checkError;
      }

      if (existing && existing.length > 0) {
        return {
          success: false,
          message: 'Un propriétaire existe déjà'
        };
      }

      const { error: insertError } = await supabase
        .from('users')
        .insert([{
          username,
          password,
          email: `${username}@gobex.local`,
          role: 'Propriétaire',
          user_lot_id: null
        }]);

      if (insertError) {
        throw insertError;
      }

      return { success: true };
    } catch (error) {
      console.error('❌ Erreur création propriétaire:', error);
      return {
        success: false,
        message: error.message
      };
    }
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

      const userLotId = Date.now().toString();
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
