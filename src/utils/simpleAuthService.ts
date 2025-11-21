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
}

export const simpleAuth = SimpleAuthService.getInstance();
