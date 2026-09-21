/**
 * ============================================================================
 * SERVICE WHATSAPP SUPPORT — AHANDJO
 * ============================================================================
 * Pas d'API WhatsApp payante pour le moment (0€).
 * On utilise des liens wa.me qui ouvrent WhatsApp avec un message pré-rempli.
 * Le support écrit aux clients depuis son numéro personnel/pro.
 *
 * - getWhatsappLink : génère https://wa.me/22997000000?text=...
 * - openWhatsappChat : ouvre l'app
 * - Support central : numéro support configurable dans platform_settings
 * ============================================================================
 */

const SUPPORT_PHONE_KEY = 'ahandjo_support_phone';
const DEFAULT_SUPPORT_PHONE = '+229 97 00 00 00'; // à remplacer dans Paramètres → Entreprise ou platform_settings

/** Nettoie un numéro pour wa.me : garde chiffres, enlève +, espaces, tirets */
export function cleanPhoneForWaMe(phone: string): string {
  if (!phone) return '';
  // Garde uniquement chiffres
  let cleaned = phone.replace(/\D/g, '');
  // Si commence par 0 et pas indicatif, on suppose Bénin 229 pour l'exemple - mais on laisse tel quel
  // wa.me exige indicatif sans + ni 00
  if (cleaned.startsWith('00')) cleaned = cleaned.substring(2);
  if (cleaned.startsWith('0') && cleaned.length === 10) {
    // 10 chiffres français/Bénin local -> on ne peut pas deviner, on laisse
    // Pour Bénin, on pourrait préfixer 229 si 8 chiffres
  }
  return cleaned;
}

/** Génère un lien wa.me */
export function getWhatsappLink(phone: string, message?: string): string {
  const cleaned = cleanPhoneForWaMe(phone);
  if (!cleaned) return '';
  const base = `https://wa.me/${cleaned}`;
  if (message) {
    return `${base}?text=${encodeURIComponent(message)}`;
  }
  return base;
}

/** Ouvre WhatsApp */
export function openWhatsappChat(phone: string, message?: string) {
  const link = getWhatsappLink(phone, message);
  if (link) {
    window.open(link, '_blank', 'noopener,noreferrer');
  }
}

/** Récupère le numéro support depuis localStorage / settings */
export function getSupportPhone(): string {
  try {
    const local = localStorage.getItem(SUPPORT_PHONE_KEY);
    if (local) return local;
    // Essaie depuis settings entreprise
    const settingsRaw = localStorage.getItem('ahandjo_entreprise_settings');
    if (settingsRaw) {
      const s = JSON.parse(settingsRaw);
      if (s.phone) return s.phone;
    }
  } catch {}
  return DEFAULT_SUPPORT_PHONE;
}

export function setSupportPhone(phone: string) {
  localStorage.setItem(SUPPORT_PHONE_KEY, phone);
}

/** Messages pré-remplis pour le support */
export const WhatsappTemplates = {
  /** Support contacte un nouveau bar inscrit */
  welcomeNewBar: (barName: string, managerName: string) =>
    `Bonjour ${managerName} 👋\n\nBienvenue sur AHANDJO ! Votre bar "${barName}" est bien créé avec 7 jours d'essai gratuit.\n\nJe suis le support AHANDJO. Besoin d'aide pour démarrer ?`,

  /** Support envoie un code de vérification manuellement */
  verificationCode: (code: string, barName?: string) =>
    `Bonjour ${barName ? `pour ${barName}` : ''} 👋\n\nVotre code de vérification AHANDJO est : *${code}*\n\nIl expire dans 10 minutes. Ne le partagez pas.\n\n- L'équipe AHANDJO`,

  /** Support relance essai qui expire */
  trialExpiring: (barName: string, daysLeft: number) =>
    `Bonjour 👋\n\nVotre essai gratuit pour "${barName}" expire dans ${daysLeft} jour(s).\n\nPour éviter le passage en lecture seule, vous pouvez choisir votre licence directement dans l'app : Kpêvi (15k), Kléoun (40k), Agbon (70k), Baba (120k).\n\nBesoin d'aide pour payer via Mobile Money ?`,

  /** Support relance essai expiré */
  trialExpired: (barName: string) =>
    `Bonjour 👋\n\nVotre essai pour "${barName}" a expiré. Votre app est en lecture seule (consultation OK, mais plus d'ajout).\n\nDès que vous payez une licence dans l'app, tout se réactive automatiquement. Je peux vous guider si besoin.`,

  /** Support envoie lien de paiement ou aide */
  paymentHelp: (barName: string) =>
    `Bonjour pour "${barName}" 👋\n\nPour activer votre licence :\n1. Ouvrez AHANDJO\n2. Allez dans le bandeau orange en haut\n3. Cliquez sur "Acheter une licence"\n4. Payez via MoMo ou carte\n\nActivation automatique en 30 secondes.\n\n- Support AHANDJO`,

  /** Client contacte le support */
  clientToSupport: (barName: string, message: string) =>
    `Bonjour Support AHANDJO 👋\n\nBar : ${barName}\nMessage : ${message}`,

  /** Reset password manuel */
  passwordReset: (code: string) =>
    `Bonjour 👋\n\nVotre code de réinitialisation AHANDJO est : *${code}*\n\nExpire dans 15 minutes.\n\n- Support AHANDJO`,
};

/** Génère un lien pour que le support contacte un client */
export function getSupportToClientLink(clientPhone: string, template: keyof typeof WhatsappTemplates, ...args: any[]): string {
  const message = (WhatsappTemplates as any)[template]?.(...args) || '';
  return getWhatsappLink(clientPhone, message);
}

/** Génère un lien pour que le client contacte le support */
export function getClientToSupportLink(supportPhone: string = getSupportPhone(), barName?: string, customMessage?: string): string {
  const message = customMessage || (barName ? `Bonjour, je gère ${barName}, j'ai besoin d'aide sur AHANDJO.` : `Bonjour, j'ai besoin d'aide sur AHANDJO.`);
  return getWhatsappLink(supportPhone, message);
}
