// ============================================================================
// Edge Function : send-notification
// ============================================================================
// Envoi d'emails via Resend (gratuit 100/jour, 3000/mois) + simulation WhatsApp
// via lien wa.me pour le support (0€).
//
// Déploiement :
//   supabase secrets set RESEND_API_KEY=re_xxx FROM_EMAIL="AHANDJO <noreply@tondomaine.com>"
//   supabase functions deploy send-notification --no-verify-jwt
//
// Entrée (JSON) :
//   {
//     to: "client@email.com" | "+22997000000",
//     type: "email" | "whatsapp",
//     template: "registration" | "verification" | "license_purchased" | "trial_expiring" | "trial_expired" | "password_reset",
//     data: { barName, managerName, username, code, trialEndsAt, loginUrl, ... }
//   }
//
// Sortie : { success, messageId, waLink? }
//
// Pour WhatsApp (type=whatsapp) : on ne peut pas envoyer gratuitement via API
// officielle sans coût. On retourne donc un lien wa.me que le support peut
// utiliser manuellement. L'email reste le canal réel gratuit.
// ============================================================================
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? '';
const FROM_EMAIL = Deno.env.get('FROM_EMAIL') ?? 'AHANDJO <onboarding@resend.dev>';
const SUPPORT_PHONE = Deno.env.get('SUPPORT_PHONE') ?? '';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function cleanPhone(phone: string): string {
  return phone.replace(/\D/g, '').replace(/^00/, '');
}

function getMessageContent(template: string, data: Record<string, any>): { subject: string; body: string; html?: string } {
  const loginUrl = data.loginUrl || 'https://tonapp.com';
  switch (template) {
    case 'registration':
      return {
        subject: `Bienvenue sur AHANDJO - ${data.barName} est prêt !`,
        body: `Bonjour ${data.managerName || ''},\n\nBienvenue sur AHANDJO ! Votre bar "${data.barName}" a été enregistré.\n\nIdentifiant : ${data.username}\nEssai gratuit jusqu'au ${data.trialEndsAt ? new Date(data.trialEndsAt).toLocaleDateString('fr-FR') : '7 jours'}\n\nConnectez-vous : ${loginUrl}\n\nSupport WhatsApp : ${SUPPORT_PHONE ? `https://wa.me/${cleanPhone(SUPPORT_PHONE)}` : ''}\n\nL'équipe AHANDJO - Conçu au Bénin 🌍`,
        html: `<div style="font-family: sans-serif; max-width: 600px;">
          <h2>Bienvenue sur AHANDJO 👋</h2>
          <p>Bonjour <strong>${data.managerName || ''}</strong>,</p>
          <p>Votre bar <strong>"${data.barName}"</strong> est prêt !</p>
          <p><strong>Identifiant :</strong> ${data.username}<br/>
          <strong>Essai gratuit :</strong> jusqu'au ${data.trialEndsAt ? new Date(data.trialEndsAt).toLocaleDateString('fr-FR') : '7 jours'}</p>
          <p><a href="${loginUrl}" style="background:#C25E1E;color:white;padding:10px 20px;border-radius:8px;text-decoration:none;">Se connecter</a></p>
          <p style="font-size:12px;color:#666;">Support WhatsApp : ${SUPPORT_PHONE || ''}</p>
          <p>L'équipe AHANDJO - Conçu au Bénin 🌍</p>
        </div>`
      };
    case 'verification':
      return {
        subject: `Code AHANDJO : ${data.code}`,
        body: `Votre code de vérification AHANDJO est : ${data.code}\n\nExpire dans 10 minutes. Ne partagez jamais ce code.\n\nSi vous n'avez pas demandé ce code, ignorez ce message.`,
        html: `<div style="font-family:sans-serif;">
          <h2>Votre code AHANDJO</h2>
          <p style="font-size:24px;letter-spacing:4px;font-weight:bold;">${data.code}</p>
          <p>Expire dans 10 minutes.</p>
          <p style="font-size:12px;color:#666;">Ne partagez jamais ce code.</p>
        </div>`
      };
    case 'license_purchased':
      return {
        subject: `Licence ${data.licenseType} activée - ${data.barName}`,
        body: `Félicitations ${data.managerName || ''} !\n\nLicence ${data.licenseType} (${data.duration} mois) activée jusqu'au ${data.expiresAt ? new Date(data.expiresAt).toLocaleDateString('fr-FR') : ''}\nMontant : ${data.amount} FCFA\n\nMerci !\nAHANDJO`,
        html: `<div style="font-family:sans-serif;"><h2>Licence activée ✅</h2><p>Licence <strong>${data.licenseType}</strong> activée jusqu'au ${data.expiresAt ? new Date(data.expiresAt).toLocaleDateString('fr-FR') : ''}</p><p>Montant : ${data.amount} FCFA</p></div>`
      };
    case 'trial_expiring':
      return {
        subject: `Essai AHANDJO expire dans ${data.daysRemaining}j - ${data.barName}`,
        body: `Bonjour ${data.managerName || ''},\n\nVotre essai pour "${data.barName}" expire dans ${data.daysRemaining} jour(s) le ${data.expiresAt ? new Date(data.expiresAt).toLocaleDateString('fr-FR') : ''}.\n\nChoisissez votre licence : Kpêvi 15k, Kléoun 40k, Agbon 70k, Baba 120k.\n\n${loginUrl}`,
        html: `<div style="font-family:sans-serif;"><h2>Essai expire dans ${data.daysRemaining} jour(s) ⏳</h2><p>Bar : ${data.barName}</p><p><a href="${loginUrl}">Choisir ma licence</a></p></div>`
      };
    case 'trial_expired':
      return {
        subject: `Essai expiré - ${data.barName} en lecture seule`,
        body: `Bonjour ${data.managerName || ''},\n\nVotre essai pour "${data.barName}" a expiré. Lecture seule activée.\n\nAchetez une licence pour réactiver : ${loginUrl}\n\nSupport : ${SUPPORT_PHONE ? `https://wa.me/${cleanPhone(SUPPORT_PHONE)}` : ''}`,
        html: `<div style="font-family:sans-serif;"><h2>Essai expiré - Lecture seule 🔒</h2><p>Bar : ${data.barName}</p><p><a href="${loginUrl}">Acheter une licence</a></p></div>`
      };
    case 'password_reset':
      return {
        subject: `Reset MDP AHANDJO - Code : ${data.code}`,
        body: `Bonjour,\n\nCode de réinitialisation : ${data.code}\nExpire dans 15 minutes.\n\nSi vous n'avez pas demandé, ignorez.`,
        html: `<div style="font-family:sans-serif;"><h2>Reset mot de passe</h2><p style="font-size:24px;letter-spacing:4px;font-weight:bold;">${data.code}</p><p>Expire dans 15 minutes.</p></div>`
      };
    default:
      return { subject: 'Notification AHANDJO', body: JSON.stringify(data) };
  }
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    const { to, type, template, data } = payload as {
      to: string;
      type: 'email' | 'whatsapp';
      template: string;
      data: Record<string, any>;
    };

    if (!to || !template) {
      return new Response(JSON.stringify({ error: 'to et template requis' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const content = getMessageContent(template, data || {});

    // --- WHATSAPP : pas d'envoi auto gratuit, on retourne un lien wa.me pour support ---
    if (type === 'whatsapp') {
      const waLink = `https://wa.me/${cleanPhone(to)}?text=${encodeURIComponent(content.body)}`;
      console.log(`[WHATSAPP MOCK] to=${to} template=${template} waLink=${waLink}`);
      return new Response(
        JSON.stringify({
          success: true,
          messageId: `wa-mock-${Date.now()}`,
          waLink,
          note: 'WhatsApp non envoyé automatiquement (0€). Utilisez le waLink côté support pour écrire manuellement. Email envoyé si disponible.'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // --- EMAIL via Resend (gratuit) ---
    if (!RESEND_API_KEY) {
      console.log(`[EMAIL MOCK] Pas de RESEND_API_KEY, mode mock. to=${to} subject=${content.subject}`);
      return new Response(
        JSON.stringify({
          success: true,
          messageId: `mock-${Date.now()}`,
          note: 'RESEND_API_KEY manquante, email mocké. Configurez supabase secrets set RESEND_API_KEY=re_xxx'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [to],
        subject: content.subject,
        text: content.body,
        html: content.html || undefined,
      }),
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(json?.message || `Resend HTTP ${res.status}`);
    }

    return new Response(
      JSON.stringify({ success: true, messageId: json.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('send-notification error:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Erreur inconnue' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
