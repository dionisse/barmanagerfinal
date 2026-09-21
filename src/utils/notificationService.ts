/**
 * ============================================================================
 * SERVICE DE NOTIFICATIONS — Email & WhatsApp AHANDJO (100% gratuit MVP)
 * ============================================================================
 * Stratégie 0€ :
 * - EMAIL = canal réel via Resend (100/jour gratuit) dans Edge Function
 *   supabase/functions/send-notification (RESEND_API_KEY)
 * - WHATSAPP = pas d'envoi auto (coûteux). On génère un lien wa.me que le
 *   support utilise pour écrire manuellement depuis son numéro.
 *   + log local + console pour dev.
 *
 * Le front n'a jamais besoin de clé secrète.
 * ============================================================================
 */
import { supabase } from './supabaseService';
import { getWhatsappLink, cleanPhoneForWaMe } from './whatsappService';

const NOTIFICATION_LOG_KEY = 'ahandjo_notification_log';
const NOTIFICATION_MODE_KEY = 'ahandjo_notification_mode'; // email_only | email_whatsapp

export interface NotificationPayload {
  to: string; // email ou numéro WhatsApp
  type: 'email' | 'whatsapp';
  template: 'registration' | 'verification' | 'license_purchased' | 'trial_expiring' | 'trial_expired' | 'password_reset';
  data: Record<string, any>;
}

export interface NotificationResult {
  success: boolean;
  messageId?: string;
  error?: string;
  waLink?: string; // lien wa.me généré pour support
  mode?: string;
}

/* ---------------------------------------------------------------------------
 * Config mode
 * ------------------------------------------------------------------------- */
export function getNotificationMode(): 'email_only' | 'email_whatsapp' {
  try {
    const m = localStorage.getItem(NOTIFICATION_MODE_KEY) as any;
    if (m === 'email_whatsapp') return 'email_whatsapp';
  } catch {}
  return 'email_only'; // par défaut 0€
}

export function setNotificationMode(mode: 'email_only' | 'email_whatsapp') {
  localStorage.setItem(NOTIFICATION_MODE_KEY, mode);
}

/* ---------------------------------------------------------------------------
 * Log local pour debug / mode mock
 * ------------------------------------------------------------------------- */
function logNotification(payload: NotificationPayload, result: NotificationResult) {
  try {
    const logs = JSON.parse(localStorage.getItem(NOTIFICATION_LOG_KEY) || '[]');
    logs.unshift({
      ...payload,
      result,
      timestamp: new Date().toISOString()
    });
    localStorage.setItem(NOTIFICATION_LOG_KEY, JSON.stringify(logs.slice(0, 100)));
  } catch {}
}

export function getNotificationLogs(): any[] {
  try {
    return JSON.parse(localStorage.getItem(NOTIFICATION_LOG_KEY) || '[]');
  } catch {
    return [];
  }
}

/* ---------------------------------------------------------------------------
 * Envoi via Edge Function send-notification (Resend gratuit)
 * ------------------------------------------------------------------------- */
async function sendViaEdgeFunction(payload: NotificationPayload): Promise<NotificationResult> {
  try {
    // 1. Essaie via supabase.functions.invoke si dispo, sinon fetch direct
    // On récupère l'URL de base depuis VITE_SUPABASE_URL
    const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || 'https://jtzshtopthamkqpgixcq.supabase.co';
    const anonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';
    const edgeUrl = `${supabaseUrl.replace(/\/$/, '')}/functions/v1/send-notification`;

    // Essaie aussi via platform_settings.fedapay.edgeFunctionUrl si configuré (compat ancien système)
    let customEdgeBase: string | null = null;
    try {
      const { data } = await supabase.from('platform_settings').select('value').eq('key', 'fedapay').maybeSingle();
      customEdgeBase = data?.value?.edgeFunctionUrl || null;
    } catch {}

    const urlsToTry = [
      edgeUrl,
      ...(customEdgeBase ? [`${customEdgeBase.replace(/\/$/, '')}/send-notification`] : [])
    ];

    for (const url of urlsToTry) {
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(anonKey ? { 'apikey': anonKey, 'Authorization': `Bearer ${anonKey}` } : {})
          },
          body: JSON.stringify(payload)
        });
        const json = await res.json().catch(() => ({}));
        if (res.ok) {
          return {
            success: true,
            messageId: json.messageId || json.id,
            waLink: json.waLink,
            mode: json.note || 'edge'
          };
        }
        // Si 401/404 on essaie suivant
      } catch {
        continue;
      }
    }

    return { success: false, error: 'Edge Function send-notification non joignable (déployez-la avec supabase functions deploy send-notification --no-verify-jwt et configurez RESEND_API_KEY)' };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

/* ---------------------------------------------------------------------------
 * Templates de messages (utilisés aussi côté Edge Function)
 * ------------------------------------------------------------------------- */
function getMessageContent(template: NotificationPayload['template'], data: Record<string, any>): { subject: string; body: string } {
  switch (template) {
    case 'registration':
      return {
        subject: 'Bienvenue sur AHANDJO - Votre bar est prêt !',
        body: `Bonjour ${data.managerName || ''},\n\nBienvenue sur AHANDJO ! Votre bar "${data.barName}" a été enregistré avec succès.\n\nVos identifiants :\n- Identifiant : ${data.username}\n- Mot de passe : (celui que vous avez choisi)\n\nVous bénéficiez d'une période d'essai gratuite de 7 jours jusqu'au ${data.trialEndsAt ? new Date(data.trialEndsAt).toLocaleDateString('fr-FR') : ''}.\n\nConnectez-vous ici : ${data.loginUrl || ''}\n\nSupport WhatsApp : https://wa.me/229XXXXXXXX (remplacez par votre numéro support)\n\nL'équipe AHANDJO - Conçu au Bénin 🌍`
      };
    case 'verification':
      return {
        subject: `Votre code de vérification AHANDJO : ${data.code}`,
        body: `Votre code de vérification AHANDJO est : ${data.code}\n\nCe code expire dans 10 minutes.\nNe partagez jamais ce code.\n\nSi vous n'avez pas demandé ce code, ignorez ce message.`
      };
    case 'license_purchased':
      return {
        subject: 'Licence AHANDJO activée avec succès !',
        body: `Félicitations ${data.managerName || ''} !\n\nVotre licence ${data.licenseType} (${data.duration} mois) a été activée.\nBar : ${data.barName}\nValide jusqu'au : ${data.expiresAt ? new Date(data.expiresAt).toLocaleDateString('fr-FR') : ''}\nMontant : ${data.amount} FCFA\n\nMerci !\nAHANDJO`
      };
    case 'trial_expiring':
      return {
        subject: `Votre essai AHANDJO expire dans ${data.daysRemaining} jour(s)`,
        body: `Bonjour ${data.managerName || ''},\n\nVotre essai pour "${data.barName}" expire dans ${data.daysRemaining} jour(s).\n\nLicences : Kpêvi 15k, Kléoun 40k, Agbon 70k, Baba 120k.\n\n${data.loginUrl || ''}`
      };
    case 'trial_expired':
      return {
        subject: 'Votre essai AHANDJO a expiré - Lecture seule',
        body: `Bonjour ${data.managerName || ''},\n\nVotre essai pour "${data.barName}" a expiré. Lecture seule.\n\nAchetez une licence : ${data.loginUrl || ''}\n\nSupport WhatsApp : wa.me`
      };
    case 'password_reset':
      return {
        subject: `Reset MDP AHANDJO - Code : ${data.code}`,
        body: `Bonjour,\n\nCode de réinitialisation : ${data.code}\nExpire dans 15 minutes.\n\nSi vous n'avez pas demandé, ignorez.`
      };
    default:
      return { subject: 'Notification AHANDJO', body: JSON.stringify(data) };
  }
}

/* ---------------------------------------------------------------------------
 * API publique — Email réel (Resend) + WhatsApp via wa.me (0€)
 * ------------------------------------------------------------------------- */
export async function sendNotification(payload: NotificationPayload): Promise<NotificationResult> {
  const content = getMessageContent(payload.template, payload.data);
  const mode = getNotificationMode();

  console.log(`📧 [AHANDJO NOTIF] type=${payload.type} to=${payload.to} template=${payload.template} mode=${mode}`);
  console.log(`   Sujet: ${content.subject}`);
  console.log(`   Corps: ${content.body.substring(0, 250)}...`);

  // --- CAS WHATSAPP : on ne tente pas d'API payante, on génère wa.me ---
  if (payload.type === 'whatsapp') {
    // En mode email_only, on ne "envoie" pas WhatsApp, on génère juste le lien pour le support
    const waLink = getWhatsappLink(payload.to, content.body);
    console.log(`📱 [WHATSAPP WA.ME] Lien support pour écrire au client : ${waLink}`);
    console.log(`   CODE si verification : ${payload.data.code || ''}`);

    // Stocke le code pour dev
    if (payload.template === 'verification' || payload.template === 'password_reset') {
      localStorage.setItem('ahandjo_last_verification_code', payload.data.code);
      localStorage.setItem('ahandjo_last_whatsapp_link', waLink);
    }

    // On essaie quand même l'Edge Function pour log côté serveur (elle retournera waLink)
    if (navigator.onLine) {
      const edgeResult = await sendViaEdgeFunction(payload);
      if (edgeResult.success) {
        logNotification(payload, edgeResult);
        return edgeResult;
      }
    }

    const mockResult: NotificationResult = {
      success: true,
      messageId: `wa-me-${Date.now()}`,
      waLink,
      mode: 'wa.me support (0€) - à envoyer manuellement depuis numéro support'
    };
    logNotification(payload, mockResult);
    await new Promise(r => setTimeout(r, 300));
    return mockResult;
  }

  // --- CAS EMAIL : envoi réel via Edge Function Resend (gratuit) ---
  if (navigator.onLine) {
    const edgeResult = await sendViaEdgeFunction(payload);
    if (edgeResult.success) {
      logNotification(payload, edgeResult);
      return edgeResult;
    }
    console.log('⚠️ Edge Function email échouée, fallback mock:', edgeResult.error);
  }

  // Fallback mock (dev / offline)
  const mockResult: NotificationResult = {
    success: true,
    messageId: `mock-email-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    mode: 'mock email (Resend non configuré)'
  };

  if (payload.template === 'verification' || payload.template === 'password_reset') {
    console.log(`📧 [EMAIL MOCK] CODE pour ${payload.to}: ${payload.data.code}`);
    localStorage.setItem('ahandjo_last_verification_code', payload.data.code);
  }

  logNotification(payload, mockResult);
  await new Promise(r => setTimeout(r, 500));
  return mockResult;
}

export async function sendWhatsappVerification(to: string, code: string): Promise<NotificationResult> {
  // En mode gratuit, on génère un lien wa.me pour que le support écrive
  return sendNotification({
    to,
    type: 'whatsapp',
    template: 'verification',
    data: { code }
  });
}

export async function sendEmailVerification(to: string, code: string): Promise<NotificationResult> {
  return sendNotification({
    to,
    type: 'email',
    template: 'verification',
    data: { code }
  });
}

/** Envoie notif inscription : Email réel + WhatsApp via wa.me */
export async function sendRegistrationNotification(data: {
  barName: string;
  managerName: string;
  username: string;
  email: string;
  whatsapp: string;
  trialEndsAt: string;
}): Promise<{ emailResult: NotificationResult; whatsappResult: NotificationResult; supportWaLink: string }> {
  const loginUrl = typeof window !== 'undefined' ? window.location.origin : '';

  // Email réel
  let emailResult: NotificationResult = { success: false };
  if (data.email) {
    emailResult = await sendNotification({
      to: data.email,
      type: 'email',
      template: 'registration',
      data: {
        barName: data.barName,
        managerName: data.managerName,
        username: data.username,
        trialEndsAt: data.trialEndsAt,
        loginUrl
      }
    });
  }

  // WhatsApp via wa.me (0€) - lien pour support
  const whatsappContent = `Bonjour ${data.managerName} 👋\n\nBienvenue sur AHANDJO ! Votre bar "${data.barName}" est créé.\n\nIdentifiant : ${data.username}\nEssai 7j jusqu'au ${new Date(data.trialEndsAt).toLocaleDateString('fr-FR')}\n\nConnectez-vous : ${loginUrl}\n\n- Support AHANDJO`;
  const supportWaLink = getWhatsappLink(data.whatsapp, whatsappContent);

  let whatsappResult: NotificationResult = { success: true, waLink: supportWaLink, mode: 'wa.me support' };
  if (data.whatsapp) {
    whatsappResult = await sendNotification({
      to: data.whatsapp,
      type: 'whatsapp',
      template: 'registration',
      data: {
        barName: data.barName,
        managerName: data.managerName,
        username: data.username,
        trialEndsAt: data.trialEndsAt,
        loginUrl
      }
    });
  }

  return { emailResult, whatsappResult, supportWaLink };
}

export async function sendLicensePurchasedNotification(data: {
  barName: string;
  managerName: string;
  licenseType: string;
  duration: number;
  amount: number;
  expiresAt: string;
  email: string;
  whatsapp: string;
}): Promise<void> {
  if (data.email) {
    await sendNotification({
      to: data.email,
      type: 'email',
      template: 'license_purchased',
      data
    });
  }
  if (data.whatsapp) {
    await sendNotification({
      to: data.whatsapp,
      type: 'whatsapp',
      template: 'license_purchased',
      data
    });
  }
}

/** Helper pour UI : lien support -> client */
export function getSupportWhatsappLinkForClient(clientPhone: string, message: string): string {
  return getWhatsappLink(clientPhone, message);
}
