/**
 * ============================================================================
 * SERVICE D'INSCRIPTION CLIENT — AHANDJO (robuste ancien schéma)
 * ============================================================================
 * - Génération d'identifiant à partir du nom du bar
 * - Vérification de disponibilité
 * - Création du lot + utilisateurs + licence d'essai 7 jours
 * - Fallback si colonnes manquantes (bar_address, email, is_trial...)
 * - Notifications Email / WhatsApp
 * ============================================================================
 */
import { supabase } from './supabaseService';
import { RegistrationData } from '../types';
import { generateUniqueUsername, isUsernameAvailable, hashPassword, generateVerificationCode } from './securityService';
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
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    const verification: StoredVerification = {
      id: verificationId,
      identifier,
      code,
      expiresAt,
      attempts: 0,
      verified: false
    };

    storeVerificationLocal(verification);

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

    const { sendNotification } = await import('./notificationService');
    await sendNotification({
      to: identifier,
      type: type === 'email' ? 'email' : 'whatsapp',
      template: 'verification',
      data: { code }
    });

    console.log(`📱 Code vérification pour ${identifier}: ${code} (ID: ${verificationId})`);
    return { success: true, verificationId, code };
  } catch (e: any) {
    return { success: false, message: e.message || 'Erreur création code' };
  }
}

export async function verifyCode(verificationId: string, inputCode: string): Promise<{ success: boolean; message?: string }> {
  try {
    let verification = getVerificationLocal(verificationId);

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
      try {
        await supabase.from('verification_codes').update({ attempts: verification.attempts }).eq('id', verificationId);
      } catch {}
      return { success: false, message: `Code incorrect (${verification.attempts}/5 tentatives)` };
    }

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
 * Inscription complète - VERSION ROBUSTE
 * ------------------------------------------------------------------------- */
export async function registerNewClient(data: RegistrationData, verificationId?: string): Promise<RegistrationResult> {
  try {
    if (!data.barName || !data.managerFullName || !data.phone || !data.whatsapp || !data.email || !data.username || !data.password) {
      return { success: false, message: 'Tous les champs sont requis' };
    }

    if (data.password !== data.confirmPassword) {
      return { success: false, message: 'Les mots de passe ne correspondent pas' };
    }

    if (verificationId) {
      const verif = getVerificationLocal(verificationId);
      if (!verif || !verif.verified) {
        return { success: false, message: 'Veuillez vérifier votre numéro WhatsApp avant de continuer' };
      }
    }

    const available = await isUsernameAvailable(data.username);
    if (!available) {
      return { success: false, message: `L'identifiant "${data.username}" est déjà pris, choisissez-en un autre` };
    }

    // Vérifie doublons si possible (résilient ancien schéma)
    if (navigator.onLine) {
      try {
        const { data: existingLots } = await supabase
          .from('user_lots')
          .select('email, phone, whatsapp')
          .or(`email.eq.${data.email},phone.eq.${data.phone},whatsapp.eq.${data.whatsapp}`)
          .limit(1);

        if (existingLots && existingLots.length > 0) {
          const existing = existingLots[0] as any;
          if (existing.email === data.email) {
            return { success: false, message: 'Cet email est déjà utilisé' };
          }
          if (existing.phone === data.phone || existing.whatsapp === data.whatsapp) {
            return { success: false, message: 'Ce numéro est déjà utilisé' };
          }
        }
      } catch (e: any) {
        console.warn('⚠️ Vérif doublon étendue échouée (ancien schéma):', e?.message);
        try {
          const { data: existingByUsername } = await supabase
            .from('user_lots')
            .select('id')
            .or(`gestionnaire_username.eq.${data.username},employe_username.eq.${data.username}`)
            .limit(1);
          if (existingByUsername && existingByUsername.length > 0) {
            return { success: false, message: `L'identifiant "${data.username}" est déjà pris` };
          }
        } catch {}
      }
    }

    const hashedPassword = await hashPassword(data.password);

    // UUID pour compatibilité ancien schéma (id UUID)
    const generatedId = (typeof crypto !== 'undefined' && (crypto as any).randomUUID) ? (crypto as any).randomUUID() : `UL-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const now = new Date();
    const trialEndsAt = new Date(now);
    trialEndsAt.setDate(trialEndsAt.getDate() + 7);

    const fullLot = {
      id: generatedId,
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

    const minimalLot = {
      id: generatedId,
      gestionnaire_username: data.username,
      gestionnaire_password: hashedPassword,
      employe_username: `${data.username}_emp`,
      employe_password: hashedPassword,
      date_creation: now.toISOString(),
      status: 'active'
    };

    let effectiveLotId = generatedId;

    if (navigator.onLine) {
      let lotOk = false;

      // Tentative complète
      try {
        const { data: inserted, error } = await supabase.from('user_lots').insert([fullLot]).select('id').maybeSingle();
        if (error) throw error;
        effectiveLotId = inserted?.id || generatedId;
        lotOk = true;
        console.log('✅ user_lots complet OK');
      } catch (err: any) {
        const msg = err?.message || '';
        console.warn('⚠️ user_lots complet échoué:', msg);
        const isMissingColumn = msg.includes('bar_address') || msg.includes('bar_name') || msg.includes('Could not find') || msg.includes('column') || msg.includes('schema cache') || msg.includes('is_trial') || msg.includes('email') || msg.includes('phone') || msg.includes('whatsapp');

        if (isMissingColumn) {
          try {
            const { data: insertedMin, error: errMin } = await supabase.from('user_lots').insert([minimalLot]).select('id').maybeSingle();
            if (errMin) throw errMin;
            effectiveLotId = insertedMin?.id || generatedId;
            lotOk = true;
            console.log('✅ user_lots minimal OK (ancien schéma)');
            try {
              localStorage.setItem(`ahandjo_bar_info_${effectiveLotId}`, JSON.stringify({
                bar_name: data.barName,
                bar_address: data.barAddress,
                manager_fullname: data.managerFullName,
                phone: data.phone,
                whatsapp: data.whatsapp,
                email: data.email
              }));
            } catch {}
          } catch (err2: any) {
            console.warn('⚠️ user_lots minimal échoué, essai sans id:', err2.message);
            try {
              const { data: autoLot, error: autoErr } = await supabase.from('user_lots').insert([{
                gestionnaire_username: data.username,
                gestionnaire_password: hashedPassword,
                employe_username: `${data.username}_emp`,
                employe_password: hashedPassword,
                status: 'active'
              }]).select('id').single();
              if (autoErr) throw autoErr;
              effectiveLotId = autoLot.id;
              lotOk = true;
              console.log('✅ user_lots auto-id OK');
            } catch (err3: any) {
              return { success: false, message: `Erreur création compte: ${err3.message}. SOLUTION: Exécutez le fichier FIX_MISSING_COLUMNS.sql dans Supabase > SQL Editor` };
            }
          }
        } else {
          return { success: false, message: `Erreur création compte: ${msg}` };
        }
      }

      if (!lotOk) {
        return { success: false, message: 'Impossible de créer le compte (user_lots)' };
      }

      // Licence d'essai - résilient
      const trialLicense = createTrialLicense(effectiveLotId);
      let licOk = false;

      const licenseAttempts = [
        { id: trialLicense.id, license_type: 'Essai', duree: 0, prix: 0, date_debut: trialLicense.dateDebut, date_fin: trialLicense.dateFin, cle: trialLicense.cle, active: true, user_lot_id: effectiveLotId, is_trial: true },
        { id: trialLicense.id, license_type: 'Essai', duree: 0, prix: 0, date_debut: trialLicense.dateDebut, date_fin: trialLicense.dateFin, cle: trialLicense.cle, active: true, user_lot_id: effectiveLotId },
        { license_type: 'Kpêvi', duree: 1, prix: 0, date_debut: trialLicense.dateDebut, date_fin: trialLicense.dateFin, cle: trialLicense.cle, active: true, user_lot_id: effectiveLotId }
      ];

      for (const licPayload of licenseAttempts) {
        try {
          const { error } = await supabase.from('licenses').insert([licPayload as any]);
          if (error) throw error;
          licOk = true;
          console.log('✅ licence créée:', (licPayload as any).license_type);
          break;
        } catch (e: any) {
          console.warn('⚠️ licence échouée', (licPayload as any).license_type, e.message);
        }
      }

      if (!licOk) {
        await supabase.from('user_lots').delete().eq('id', effectiveLotId);
        return { success: false, message: 'Erreur création licence. Exécutez FIX_MISSING_COLUMNS.sql' };
      }

      // Users - résilient multi-schémas
      const empUsername = `${data.username}_emp`;
      const userAttempts = [
        [
          { username: data.username, password: hashedPassword, email: data.email, role: 'Gestionnaire', user_lot_id: effectiveLotId },
          { username: empUsername, password: hashedPassword, email: `${empUsername}@gobex.local`, role: 'Employé', user_lot_id: effectiveLotId }
        ],
        [
          { username: data.username, password: hashedPassword, role: 'Gestionnaire', user_lot_id: effectiveLotId },
          { username: empUsername, password: hashedPassword, role: 'Employé', user_lot_id: effectiveLotId }
        ],
        [
          { username: data.username, password: hashedPassword, type: 'Gestionnaire', user_lot_id: effectiveLotId },
          { username: empUsername, password: hashedPassword, type: 'Employé', user_lot_id: effectiveLotId }
        ],
        [
          { username: data.username, password: hashedPassword, email: data.email, type: 'Gestionnaire', user_lot_id: effectiveLotId },
          { username: empUsername, password: hashedPassword, email: `${empUsername}@gobex.local`, type: 'Employé', user_lot_id: effectiveLotId }
        ],
        [
          { username: data.username, password: hashedPassword, user_lot_id: effectiveLotId },
          { username: empUsername, password: hashedPassword, user_lot_id: effectiveLotId }
        ]
      ];

      let usersOk = false;
      for (const payload of userAttempts) {
        try {
          const { error } = await supabase.from('users').insert(payload as any);
          if (error) throw error;
          usersOk = true;
          console.log('✅ users OK avec', Object.keys(payload[0]));
          break;
        } catch (e: any) {
          console.warn('⚠️ users échoué avec', Object.keys(payload[0]), e.message);
        }
      }

      if (!usersOk) {
        await supabase.from('licenses').delete().eq('user_lot_id', effectiveLotId);
        await supabase.from('user_lots').delete().eq('id', effectiveLotId);
        return { success: false, message: 'Erreur création utilisateurs: schéma incompatible. Exécutez FIX_MISSING_COLUMNS.sql' };
      }

      // bar_profiles si table existe (non bloquant)
      try {
        await supabase.from('bar_profiles').insert([{
          id: `BP-${effectiveLotId}`,
          user_lot_id: effectiveLotId,
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
        console.warn('⚠️ bar_profiles non créée (non bloquant):', e);
      }

      // Notification bienvenue
      try {
        const { sendRegistrationNotification } = await import('./notificationService');
        await sendRegistrationNotification({
          barName: data.barName,
          managerName: data.managerFullName,
          username: data.username,
          email: data.email,
          whatsapp: data.whatsapp,
          trialEndsAt: trialEndsAt.toISOString()
        });
      } catch (e) {
        console.warn('⚠️ Notification échouée (non bloquant):', e);
      }

      try {
        const localUsers = JSON.parse(localStorage.getItem('ahandjo_local_usernames') || '[]');
        localUsers.push(data.username, `${data.username}_emp`);
        localStorage.setItem('ahandjo_local_usernames', JSON.stringify(localUsers));
      } catch {}

      if (verificationId) removeVerificationLocal(verificationId);

      console.log(`✅ Inscription réussie: ${data.username} - Bar: ${data.barName}`);

      return {
        success: true,
        message: `Bienvenue ${data.managerFullName} ! Votre bar "${data.barName}" est créé. 7 jours d'essai gratuit.`,
        userLotId: effectiveLotId,
        username: data.username
      };
    } else {
      const pending = JSON.parse(localStorage.getItem(PENDING_REG_KEY) || '[]');
      pending.push({ ...fullLot, password_plain: data.password });
      localStorage.setItem(PENDING_REG_KEY, JSON.stringify(pending));
      return {
        success: true,
        message: `Inscription hors ligne mise en attente pour "${data.barName}"`,
        userLotId: generatedId,
        username: data.username
      };
    }
  } catch (e: any) {
    console.error('❌ registerNewClient error:', e);
    return { success: false, message: e.message || 'Erreur lors de l\'inscription' };
  }
}

export async function requestPasswordReset(identifier: string): Promise<{ success: boolean; resetId?: string; message?: string }> {
  try {
    let userLot: any = null;
    let user: any = null;

    if (navigator.onLine) {
      try {
        const { data: lots } = await supabase
          .from('user_lots')
          .select('*')
          .or(`email.eq.${identifier},phone.eq.${identifier},whatsapp.eq.${identifier},gestionnaire_username.eq.${identifier}`)
          .maybeSingle();
        if (lots) userLot = lots;
      } catch {
        try {
          const { data: lots2 } = await supabase.from('user_lots').select('*').or(`gestionnaire_username.eq.${identifier},employe_username.eq.${identifier}`).maybeSingle();
          if (lots2) userLot = lots2;
        } catch {}
      }

      try {
        const { data: users } = await supabase
          .from('users')
          .select('*')
          .or(`username.eq.${identifier},email.eq.${identifier}`)
          .maybeSingle();
        if (users) user = users;
      } catch {}
    }

    if (!userLot && !user) {
      return { success: true, message: 'Si ce compte existe, un code a été envoyé' };
    }

    const targetWhatsapp = userLot?.whatsapp || userLot?.phone;
    const targetEmail = userLot?.email || user?.email;

    const code = generateVerificationCode();
    const resetId = `RST-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    localStorage.setItem(`ahandjo_reset_${resetId}`, JSON.stringify({
      id: resetId,
      identifier,
      code,
      expiresAt,
      used: false
    }));
    localStorage.setItem('ahandjo_last_reset_code', code);

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
      try {
        await supabase.from('user_lots')
          .update({ gestionnaire_password: hashedPassword } as any)
          .or(`gestionnaire_username.eq.${identifier},email.eq.${identifier},phone.eq.${identifier},whatsapp.eq.${identifier}`);
      } catch {
        try {
          await supabase.from('user_lots').update({ gestionnaire_password: hashedPassword } as any).or(`gestionnaire_username.eq.${identifier},employe_username.eq.${identifier}`);
        } catch {}
      }

      try {
        await supabase.from('users').update({ password: hashedPassword } as any).or(`username.eq.${identifier},email.eq.${identifier}`);
      } catch {}

      try {
        await supabase.from('password_resets').update({ used: true }).eq('id', resetId);
      } catch {}
    }

    stored.used = true;
    localStorage.setItem(`ahandjo_reset_${resetId}`, JSON.stringify(stored));

    try {
      const { recordSuccessfulLogin } = await import('./securityService');
      recordSuccessfulLogin(identifier);
    } catch {}

    return { success: true, message: 'Mot de passe réinitialisé avec succès' };
  } catch (e: any) {
    return { success: false, message: e.message || 'Erreur réinitialisation' };
  }
}
