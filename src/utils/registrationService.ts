/**
 * ============================================================================
 * SERVICE D'INSCRIPTION CLIENT — AHANDJO
 * ============================================================================
 * - Génération d'identifiant à partir du nom du bar
 * - Vérification de disponibilité
 * - Envoi de code WhatsApp avant approbation
 * - Création du lot + utilisateurs + licence d'essai 7 jours
 * - Notifications Email / WhatsApp
 * ============================================================================
 */
import { supabase } from './supabaseService';
import { RegistrationData, BarProfile, License } from '../types';
import { generateUniqueUsername, isUsernameAvailable, hashPassword, generateVerificationCode } from './securityService';
import { sendWhatsappVerification, sendRegistrationNotification } from './notificationService';
import { createTrialLicense } from './trialService';

const VERIFICATION_KEY_PREFIX = 'ahandjo_verif_';
const PENDING_REG_KEY = 'ahandjo_pending_registration';

export interface RegistrationResult {
  success: boolean;
  message?: string;
  userLotId?: string;
  username?: string;
  requiresVerification?: boolean;
  verificationId?: string;
}

/* ---------------------------------------------------------------------------
 * Gestion des codes de vérification (local + Supabase)
 * ------------------------------------------------------------------------- */
interface StoredVerification {
  id: string;
  identifier: string;
  code: string;
  expiresAt: string;
  attempts: number;
  verified: boolean;
}

function storeVerificationLocal(verification: StoredVerification) {
  localStorage.setItem(`${VERIFICATION_KEY_PREFIX}${verification.id}`, JSON.stringify(verification));
  // Pour dev : dernier code en clair
  localStorage.setItem('ahandjo_last_verification_code', verification.code);
}

function getVerificationLocal(id: string): StoredVerification | null {
  try {
    const raw = localStorage.getItem(`${VERIFICATION_KEY_PREFIX}${id}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function removeVerificationLocal(id: string) {
  localStorage.removeItem(`${VERIFICATION_KEY_PREFIX}${id}`);
}

export async function createVerificationCode(identifier: string, type: 'whatsapp' | 'email' | 'phone' = 'whatsapp'): Promise<{ success: boolean; verificationId?: string; code?: string; message?: string }> {
  try {
    const code = generateVerificationCode();
    const verificationId = `VERIF-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 min

    const verification: StoredVerification = {
      id: verificationId,
      identifier,
      code,
      expiresAt,
      attempts: 0,
      verified: false
    };

    storeVerificationLocal(verification);

    // Supabase (si table existe)
    try {
      if (navigator.onLine) {
        await supabase.from('verification_codes').upsert({
          id: verificationId,
          identifier,
          code,
          type,
          expires_at: expiresAt,
          attempts: 0,
          verified: false,
          created_at: new Date().toISOString()
        }, { onConflict: 'id' });
      }
    } catch (e) {
      console.warn('⚠️ verification_codes table indisponible, fallback local:', e);
    }

    // Envoi via WhatsApp / Email
    const { sendNotification } = await import('./notificationService');
    await sendNotification({
      to: identifier,
      type: type === 'email' ? 'email' : 'whatsapp',
      template: 'verification',
      data: { code }
    });

    console.log(`📱 Code vérification pour ${identifier}: ${code} (ID: ${verificationId})`);

    return { success: true, verificationId, code }; // code retourné pour dev, en prod on ne le retournerait pas
  } catch (e: any) {
    return { success: false, message: e.message || 'Erreur création code' };
  }
}

export async function verifyCode(verificationId: string, inputCode: string): Promise<{ success: boolean; message?: string }> {
  try {
    let verification = getVerificationLocal(verificationId);

    // Fallback Supabase si local non trouvé
    if (!verification && navigator.onLine) {
      try {
        const { data } = await supabase
          .from('verification_codes')
          .select('*')
          .eq('id', verificationId)
          .maybeSingle();

        if (data) {
          verification = {
            id: data.id,
            identifier: data.identifier,
            code: data.code,
            expiresAt: data.expires_at,
            attempts: data.attempts,
            verified: data.verified
          };
        }
      } catch {}
    }

    if (!verification) {
      return { success: false, message: 'Code de vérification introuvable ou expiré' };
    }

    if (verification.verified) {
      return { success: true };
    }

    if (new Date(verification.expiresAt) < new Date()) {
      removeVerificationLocal(verificationId);
      return { success: false, message: 'Code expiré, demandez un nouveau code' };
    }

    if (verification.attempts >= 5) {
      removeVerificationLocal(verificationId);
      return { success: false, message: 'Trop de tentatives, demandez un nouveau code' };
    }

    verification.attempts += 1;

    if (verification.code !== inputCode.trim()) {
      storeVerificationLocal(verification);
      // Update Supabase
      try {
        await supabase.from('verification_codes').update({ attempts: verification.attempts }).eq('id', verificationId);
      } catch {}
      return { success: false, message: `Code incorrect (${verification.attempts}/5 tentatives)` };
    }

    // Code correct
    verification.verified = true;
    storeVerificationLocal(verification);

    try {
      await supabase.from('verification_codes').update({ verified: true }).eq('id', verificationId);
    } catch {}

    return { success: true };
  } catch (e: any) {
    return { success: false, message: e.message || 'Erreur vérification' };
  }
}

/* ---------------------------------------------------------------------------
 * Génération d'identifiant et vérification
 * ------------------------------------------------------------------------- */
export async function suggestUsername(barName: string): Promise<string> {
  return await generateUniqueUsername(barName);
}

export async function checkUsername(username: string): Promise<{ available: boolean; message?: string }> {
  const available = await isUsernameAvailable(username);
  return {
    available,
    message: available ? 'Identifiant disponible' : 'Cet identifiant est déjà pris'
  };
}

/* ---------------------------------------------------------------------------
 * Inscription complète
 * ------------------------------------------------------------------------- */
export async function registerNewClient(data: RegistrationData, verificationId?: string): Promise<RegistrationResult> {
  try {
    // 1. Validations de base
    if (!data.barName || !data.managerFullName || !data.phone || !data.whatsapp || !data.email || !data.username || !data.password) {
      return { success: false, message: 'Tous les champs sont requis' };
    }

    if (data.password !== data.confirmPassword) {
      return { success: false, message: 'Les mots de passe ne correspondent pas' };
    }

    // 2. Vérifie que le code WhatsApp a été vérifié si fourni
    if (verificationId) {
      const verif = getVerificationLocal(verificationId);
      if (!verif || !verif.verified) {
        return { success: false, message: 'Veuillez vérifier votre numéro WhatsApp avant de continuer' };
      }
    }

    // 3. Vérifie disponibilité username
    const available = await isUsernameAvailable(data.username);
    if (!available) {
      return { success: false, message: `L'identifiant "${data.username}" est déjà pris, choisissez-en un autre` };
    }

    // 4. Vérifie email/phone déjà utilisés
    if (navigator.onLine) {
      try {
        const { data: existingLots } = await supabase
          .from('user_lots')
          .select('email, phone, whatsapp')
          .or(`email.eq.${data.email},phone.eq.${data.phone},whatsapp.eq.${data.whatsapp}`)
          .limit(1);

        if (existingLots && existingLots.length > 0) {
          const existing = existingLots[0];
          if (existing.email === data.email) {
            return { success: false, message: 'Cet email est déjà utilisé' };
          }
          if (existing.phone === data.phone || existing.whatsapp === data.whatsapp) {
            return { success: false, message: 'Ce numéro est déjà utilisé' };
          }
        }
      } catch (e) {
        console.warn('⚠️ Vérification doublon échouée (non bloquant):', e);
      }
    }

    // 5. Hache le mot de passe
    const hashedPassword = await hashPassword(data.password);

    // 6. Crée le lot d'utilisateurs avec infos bar
    const userLotId = `UL-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const now = new Date();
    const trialEndsAt = new Date(now);
    trialEndsAt.setDate(trialEndsAt.getDate() + 7);

    const userLotData = {
      id: userLotId,
      gestionnaire_username: data.username,
      gestionnaire_password: hashedPassword,
      employe_username: `${data.username}_emp`,
      employe_password: hashedPassword,
      date_creation: now.toISOString(),
      status: 'active',
      bar_name: data.barName,
      bar_address: data.barAddress,
      manager_fullname: data.managerFullName,
      phone: data.phone,
      whatsapp: data.whatsapp,
      email: data.email,
      is_trial: true,
      trial_ends_at: trialEndsAt.toISOString(),
      registration_status: 'active'
    };

    // 7. Insertion Supabase
    if (navigator.onLine) {
      const { error: lotError } = await supabase.from('user_lots').insert([userLotData]);

      if (lotError) {
        console.error('❌ Erreur création user_lot:', lotError);
        return { success: false, message: `Erreur création compte: ${lotError.message}` };
      }

      // 8. Crée la licence d'essai 7 jours
      const trialLicense = createTrialLicense(userLotId);

      const { error: licenseError } = await supabase.from('licenses').insert([{
        id: trialLicense.id,
        license_type: 'Essai',
        duree: 0,
        prix: 0,
        date_debut: trialLicense.dateDebut,
        date_fin: trialLicense.dateFin,
        cle: trialLicense.cle,
        active: true,
        user_lot_id: userLotId,
        is_trial: true
      }]);

      if (licenseError) {
        console.error('❌ Erreur création licence essai:', licenseError);
        // Rollback lot
        await supabase.from('user_lots').delete().eq('id', userLotId);
        return { success: false, message: `Erreur création licence: ${licenseError.message}` };
      }

      // 9. Crée les utilisateurs
      const employeUsername = `${data.username}_emp`;
      const { error: usersError } = await supabase.from('users').insert([
        {
          username: data.username,
          password: hashedPassword,
          email: data.email,
          role: 'Gestionnaire',
          user_lot_id: userLotId
        },
        {
          username: employeUsername,
          password: hashedPassword,
          email: `${employeUsername}@gobex.local`,
          role: 'Employé',
          user_lot_id: userLotId
        }
      ]);

      if (usersError) {
        console.error('❌ Erreur création users:', usersError);
        await supabase.from('licenses').delete().eq('user_lot_id', userLotId);
        await supabase.from('user_lots').delete().eq('id', userLotId);
        return { success: false, message: `Erreur création utilisateurs: ${usersError.message}` };
      }

      // 10. Crée le profil bar (si table existe)
      try {
        await supabase.from('bar_profiles').insert([{
          id: `BP-${userLotId}`,
          user_lot_id: userLotId,
          bar_name: data.barName,
          bar_address: data.barAddress,
          manager_fullname: data.managerFullName,
          phone: data.phone,
          whatsapp: data.whatsapp,
          email: data.email,
          username: data.username,
          is_trial: true,
          trial_ends_at: trialEndsAt.toISOString(),
          registration_status: 'active',
          date_creation: now.toISOString()
        }]);
      } catch (e) {
        console.warn('⚠️ bar_profiles non créée (table manquante, non bloquant):', e);
      }
    } else {
      // Hors ligne : sauvegarde locale pour sync plus tard
      const pending = JSON.parse(localStorage.getItem(PENDING_REG_KEY) || '[]');
      pending.push({ ...userLotData, password_plain: data.password }); // plain pour dev offline
      localStorage.setItem(PENDING_REG_KEY, JSON.stringify(pending));
      console.log('📴 Hors ligne - inscription mise en attente');
    }

    // 11. Notifications Email / WhatsApp
    try {
      await sendRegistrationNotification({
        barName: data.barName,
        managerName: data.managerFullName,
        username: data.username,
        email: data.email,
        whatsapp: data.whatsapp,
        trialEndsAt: trialEndsAt.toISOString()
      });
    } catch (e) {
      console.warn('⚠️ Notification inscription échouée (non bloquant):', e);
    }

    // 12. Sauvegarde locale des usernames pour vérification rapide
    try {
      const localUsers = JSON.parse(localStorage.getItem('ahandjo_local_usernames') || '[]');
      localUsers.push(data.username, `${data.username}_emp`);
      localStorage.setItem('ahandjo_local_usernames', JSON.stringify(localUsers));
    } catch {}

    // Nettoie la vérification
    if (verificationId) {
      removeVerificationLocal(verificationId);
    }

    console.log(`✅ Inscription réussie: ${data.username} - Bar: ${data.barName} - Essai jusqu'au ${trialEndsAt.toLocaleDateString('fr-FR')}`);

    return {
      success: true,
      message: `Bienvenue ${data.managerFullName} ! Votre bar "${data.barName}" est créé. Vous avez 7 jours d'essai gratuit.`,
      userLotId,
      username: data.username
    };
  } catch (e: any) {
    console.error('❌ registerNewClient error:', e);
    return { success: false, message: e.message || 'Erreur lors de l\'inscription' };
  }
}

/* ---------------------------------------------------------------------------
 * Réinitialisation de mot de passe
 * ------------------------------------------------------------------------- */
export async function requestPasswordReset(identifier: string): Promise<{ success: boolean; resetId?: string; message?: string }> {
  try {
    // identifier peut être username, email, phone ou whatsapp
    let userLot: any = null;
    let user: any = null;

    if (navigator.onLine) {
      // Cherche dans user_lots par email/phone/whatsapp
      const { data: lots } = await supabase
        .from('user_lots')
        .select('*')
        .or(`email.eq.${identifier},phone.eq.${identifier},whatsapp.eq.${identifier},gestionnaire_username.eq.${identifier}`)
        .maybeSingle();

      if (lots) userLot = lots;

      // Cherche aussi dans users
      const { data: users } = await supabase
        .from('users')
        .select('*')
        .or(`username.eq.${identifier},email.eq.${identifier}`)
        .maybeSingle();

      if (users) user = users;
    }

    if (!userLot && !user) {
      // Ne révèle pas si l'utilisateur existe ou non (sécurité)
      return { success: true, message: 'Si ce compte existe, un code a été envoyé' };
    }

    const targetWhatsapp = userLot?.whatsapp || userLot?.phone;
    const targetEmail = userLot?.email || user?.email;

    const code = generateVerificationCode();
    const resetId = `RST-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 min

    // Stocke localement
    localStorage.setItem(`ahandjo_reset_${resetId}`, JSON.stringify({
      id: resetId,
      identifier,
      code,
      expiresAt,
      used: false
    }));
    localStorage.setItem('ahandjo_last_reset_code', code);

    // Supabase
    try {
      await supabase.from('password_resets').upsert({
        id: resetId,
        identifier,
        code,
        token: resetId,
        expires_at: expiresAt,
        used: false,
        created_at: new Date().toISOString()
      }, { onConflict: 'id' });
    } catch (e) {
      console.warn('⚠️ password_resets table indisponible:', e);
    }

    // Envoi code via WhatsApp prioritaire, sinon Email
    const { sendNotification } = await import('./notificationService');

    if (targetWhatsapp) {
      await sendNotification({
        to: targetWhatsapp,
        type: 'whatsapp',
        template: 'password_reset',
        data: { code }
      });
    } else if (targetEmail) {
      await sendNotification({
        to: targetEmail,
        type: 'email',
        template: 'password_reset',
        data: { code }
      });
    }

    console.log(`🔑 Code reset pour ${identifier}: ${code} (ID: ${resetId})`);

    return { success: true, resetId, message: 'Code envoyé via WhatsApp / Email' };
  } catch (e: any) {
    return { success: false, message: e.message || 'Erreur' };
  }
}

export async function verifyPasswordResetCode(resetId: string, code: string): Promise<{ success: boolean; message?: string }> {
  try {
    const raw = localStorage.getItem(`ahandjo_reset_${resetId}`);
    let stored: any = null;

    if (raw) {
      stored = JSON.parse(raw);
    } else if (navigator.onLine) {
      const { data } = await supabase.from('password_resets').select('*').eq('id', resetId).maybeSingle();
      if (data) {
        stored = {
          id: data.id,
          identifier: data.identifier,
          code: data.code,
          expiresAt: data.expires_at,
          used: data.used
        };
      }
    }

    if (!stored) {
      return { success: false, message: 'Code introuvable ou expiré' };
    }

    if (stored.used) {
      return { success: false, message: 'Ce code a déjà été utilisé' };
    }

    if (new Date(stored.expiresAt) < new Date()) {
      return { success: false, message: 'Code expiré' };
    }

    if (stored.code !== code.trim()) {
      return { success: false, message: 'Code incorrect' };
    }

    return { success: true };
  } catch (e: any) {
    return { success: false, message: e.message };
  }
}

export async function resetPassword(resetId: string, code: string, newPassword: string): Promise<{ success: boolean; message?: string }> {
  try {
    const verify = await verifyPasswordResetCode(resetId, code);
    if (!verify.success) return verify;

    const raw = localStorage.getItem(`ahandjo_reset_${resetId}`);
    if (!raw) return { success: false, message: 'Session de réinitialisation introuvable' };

    const stored = JSON.parse(raw);
    const identifier = stored.identifier;

    const hashedPassword = await hashPassword(newPassword);

    if (navigator.onLine) {
      // Met à jour dans user_lots
      await supabase.from('user_lots')
        .update({ gestionnaire_password: hashedPassword })
        .or(`gestionnaire_username.eq.${identifier},email.eq.${identifier},phone.eq.${identifier},whatsapp.eq.${identifier}`);

      // Met à jour dans users
      await supabase.from('users')
        .update({ password: hashedPassword })
        .or(`username.eq.${identifier},email.eq.${identifier}`);

      // Marque le token comme utilisé
      await supabase.from('password_resets').update({ used: true }).eq('id', resetId);
    }

    // Marque local comme utilisé
    stored.used = true;
    localStorage.setItem(`ahandjo_reset_${resetId}`, JSON.stringify(stored));

    // Nettoie les tentatives de login bloquées
    try {
      const { recordSuccessfulLogin } = await import('./securityService');
      recordSuccessfulLogin(identifier);
    } catch {}

    return { success: true, message: 'Mot de passe réinitialisé avec succès' };
  } catch (e: any) {
    return { success: false, message: e.message || 'Erreur réinitialisation' };
  }
}
