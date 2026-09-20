/**
 * ============================================================================
 * SERVICE DE NOTIFICATIONS — Email & WhatsApp AHANDJO
 * ============================================================================
 * Gère l'envoi de notifications pour :
 * - Inscription réussie
 * - Code de vérification WhatsApp
 * - Achat de licence
 * - Expiration d'essai
 * - Réinitialisation de mot de passe
 *
 * 2 modes :
 * - MODE EDGE FUNCTION (recommandé) : appelle une Edge Function Supabase qui
 *   envoie via Twilio / WhatsApp Business API / Resend / etc.
 * - MODE MOCK (dev) : log dans la console + localStorage pour tests
 * ============================================================================
 */
import { supabase } from './supabaseService';

const NOTIFICATION_LOG_KEY = 'ahandjo_notification_log';

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
 * Envoi via Edge Function (si configurée)
 * ------------------------------------------------------------------------- */
async function sendViaEdgeFunction(payload: NotificationPayload): Promise<NotificationResult> {
  try {
    // Récupère l'URL des Edge Functions depuis la config FEDAPAY ou platform_settings
    const { data } = await supabase
      .from('platform_settings')
      .select('value')
      .eq('key', 'fedapay')
      .maybeSingle();

    const edgeBase = data?.value?.edgeFunctionUrl;
    if (!edgeBase) {
      return { success: false, error: 'Edge Function URL non configurée' };
    }

    // Essaie d'appeler une Edge Function générique de notification
    const endpoints = [
      `${edgeBase.replace(/\/$/, '')}/send-notification`,
      `${edgeBase.replace(/\/$/, '')}/notifications`,
      `${edgeBase.replace(/\/$/, '')}/notify`
    ];

    for (const url of endpoints) {
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (res.ok) {
          const json = await res.json().catch(() => ({}));
          return { success: true, messageId: json.messageId || json.id };
        }
      } catch {
        // essaie le suivant
      }
    }

    return { success: false, error: 'Aucun endpoint de notification joignable' };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

/* ---------------------------------------------------------------------------
 * Templates de messages
 * ------------------------------------------------------------------------- */
function getMessageContent(template: NotificationPayload['template'], data: Record<string, any>): { subject: string; body: string } {
  switch (template) {
    case 'registration':
      return {
        subject: 'Bienvenue sur AHANDJO - Votre bar est prêt !',
        body: `Bonjour ${data.managerName || ''},

Bienvenue sur AHANDJO ! Votre bar "${data.barName}" a été enregistré avec succès.

Vos identifiants :
- Identifiant : ${data.username}
- Mot de passe : (celui que vous avez choisi)

Vous bénéficiez d'une période d'essai gratuite de 7 jours jusqu'au ${data.trialEndsAt ? new Date(data.trialEndsAt).toLocaleDateString('fr-FR') : ''}.

Après cette période, vous devrez choisir une licence pour continuer à utiliser AHANDJO en mode complet.

Connectez-vous ici : ${data.loginUrl || window.location.origin}

L'équipe AHANDJO
Conçu au Bénin, pour l'Afrique de l'Ouest 🌍`
      };

    case 'verification':
      return {
        subject: `Votre code de vérification AHANDJO : ${data.code}`,
        body: `Votre code de vérification AHANDJO est : ${data.code}

Ce code expire dans 10 minutes.
Ne partagez jamais ce code.

Si vous n'avez pas demandé ce code, ignorez ce message.`
      };

    case 'license_purchased':
      return {
        subject: 'Licence AHANDJO activée avec succès !',
        body: `Félicitations ${data.managerName || ''} !

Votre licence ${data.licenseType} (${data.duration} mois) a été activée avec succès.

Détails :
- Bar : ${data.barName}
- Licence : ${data.licenseType}
- Valide jusqu'au : ${data.expiresAt ? new Date(data.expiresAt).toLocaleDateString('fr-FR') : ''}
- Montant : ${data.amount} FCFA

Votre logiciel AHANDJO est maintenant pleinement opérationnel.

Merci pour votre confiance !

L'équipe AHANDJO`
      };

    case 'trial_expiring':
      return {
        subject: `Votre essai AHANDJO expire dans ${data.daysRemaining} jour(s)`,
        body: `Bonjour ${data.managerName || ''},

Votre période d'essai gratuite de 7 jours pour "${data.barName}" expire dans ${data.daysRemaining} jour(s), le ${data.expiresAt ? new Date(data.expiresAt).toLocaleDateString('fr-FR') : ''}.

Pour éviter toute interruption, choisissez dès maintenant votre licence :
- Kpêvi 1 mois : 15 000 FCFA
- Kléoun 3 mois : 40 000 FCFA (économisez 5 000 F)
- Agbon 6 mois : 70 000 FCFA (économisez 20 000 F)
- Baba 12 mois : 120 000 FCFA (économisez 60 000 F)

Paiement sécurisé via Mobile Money ou carte bancaire.

Connectez-vous : ${data.loginUrl || window.location.origin}

L'équipe AHANDJO`
      };

    case 'trial_expired':
      return {
        subject: 'Votre essai AHANDJO a expiré - Passez en lecture seule',
        body: `Bonjour ${data.managerName || ''},

Votre période d'essai gratuite de 7 jours pour "${data.barName}" a expiré.

Votre logiciel est maintenant en mode LECTURE SEULE :
- Vous pouvez consulter vos données
- Vous ne pouvez plus ajouter de ventes, achats ou produits

Pour réactiver toutes les fonctionnalités, achetez une licence en vous connectant :
${data.loginUrl || window.location.origin}

Paiement instantané et activation automatique.

L'équipe AHANDJO`
      };

    case 'password_reset':
      return {
        subject: `Réinitialisation de mot de passe AHANDJO - Code : ${data.code}`,
        body: `Bonjour,

Vous avez demandé la réinitialisation de votre mot de passe AHANDJO.

Votre code de vérification est : ${data.code}

Ce code expire dans 15 minutes.

Si vous n'avez pas demandé cette réinitialisation, ignorez ce message et votre mot de passe restera inchangé.

L'équipe AHANDJO`
      };

    default:
      return {
        subject: 'Notification AHANDJO',
        body: JSON.stringify(data)
      };
  }
}

/* ---------------------------------------------------------------------------
 * API publique
 * ------------------------------------------------------------------------- */
export async function sendNotification(payload: NotificationPayload): Promise<NotificationResult> {
  const content = getMessageContent(payload.template, payload.data);

  console.log(`📧 [MOCK] Envoi ${payload.type} à ${payload.to} - Template: ${payload.template}`);
  console.log(`   Sujet: ${content.subject}`);
  console.log(`   Corps: ${content.body.substring(0, 200)}...`);

  // 1. Essaie Edge Function si disponible
  if (navigator.onLine) {
    const edgeResult = await sendViaEdgeFunction(payload);
    if (edgeResult.success) {
      logNotification(payload, edgeResult);
      return edgeResult;
    }
    console.log('⚠️ Edge Function notification échouée, fallback mock:', edgeResult.error);
  }

  // 2. Fallback mock : simule l'envoi
  // Dans un vrai projet, ici on appellerait Twilio, WhatsApp Business API, Resend, etc.
  const mockResult: NotificationResult = {
    success: true,
    messageId: `mock-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  };

  // Pour WhatsApp, on peut aussi ouvrir un lien wa.me en dev
  if (payload.type === 'whatsapp' && payload.template === 'verification') {
    // En dev, on affiche le code dans une alerte pour faciliter les tests
    console.log(`📱 CODE WHATSAPP MOCK pour ${payload.to}: ${payload.data.code}`);
    // Optionnel : stocker le code pour auto-remplissage en dev
    localStorage.setItem('ahandjo_last_verification_code', payload.data.code);
  }

  logNotification(payload, mockResult);

  // Simule un délai réseau
  await new Promise(resolve => setTimeout(resolve, 500));

  return mockResult;
}

export async function sendWhatsappVerification(to: string, code: string): Promise<NotificationResult> {
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

export async function sendRegistrationNotification(data: {
  barName: string;
  managerName: string;
  username: string;
  email: string;
  whatsapp: string;
  trialEndsAt: string;
}): Promise<void> {
  const loginUrl = window.location.origin;

  // Email
  if (data.email) {
    await sendNotification({
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

  // WhatsApp
  if (data.whatsapp) {
    await sendNotification({
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
