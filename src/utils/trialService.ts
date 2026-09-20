/**
 * ============================================================================
 * SERVICE DE GESTION D'ESSAI 7 JOURS — AHANDJO
 * ============================================================================
 * - Création d'une licence d'essai de 7 jours à l'inscription
 * - Vérification si l'essai est expiré
 * - Mode lecture seule après expiration
 * - Notifications J-2, J-1, J-0
 * - Reprise automatique après achat de licence
 * ============================================================================
 */
import { License, UserLot } from '../types';
import { supabase } from './supabaseService';
import { computeLicenseStatus } from './licenseService';
import { sendNotification } from './notificationService';

const TRIAL_DAYS = 7;
const TRIAL_NOTIFICATION_KEY = 'ahandjo_trial_notif_';

export interface TrialStatus {
  isTrial: boolean;
  isExpired: boolean;
  daysRemaining: number;
  trialEndsAt: string | null;
  isReadOnly: boolean;
  message?: string;
}

/* ---------------------------------------------------------------------------
 * Calcul du statut d'essai
 * ------------------------------------------------------------------------- */
export function computeTrialStatus(userLot: UserLot | null, license: License | null): TrialStatus {
  if (!userLot) {
    return {
      isTrial: false,
      isExpired: false,
      daysRemaining: 0,
      trialEndsAt: null,
      isReadOnly: false
    };
  }

  // Si le lot a une licence payante active qui couvre aujourd'hui, pas d'essai
  if (license && !license.isTrial) {
    const status = computeLicenseStatus(license);
    if (status.status !== 'expired') {
      return {
        isTrial: false,
        isExpired: false,
        daysRemaining: status.daysRemaining,
        trialEndsAt: null,
        isReadOnly: false
      };
    }
  }

  // Vérifie l'essai
  const trialEndsAt = userLot.trialEndsAt || null;
  if (!trialEndsAt || !userLot.isTrial) {
    // Pas d'essai configuré, mais licence expirée -> lecture seule
    if (license) {
      const status = computeLicenseStatus(license);
      if (status.status === 'expired') {
        return {
          isTrial: false,
          isExpired: true,
          daysRemaining: status.daysRemaining,
          trialEndsAt: null,
          isReadOnly: true,
          message: "Votre licence a expiré. Renouvelez pour réactiver l'écriture."
        };
      }
    }
    return {
      isTrial: false,
      isExpired: false,
      daysRemaining: 0,
      trialEndsAt: null,
      isReadOnly: false
    };
  }

  const now = new Date();
  const endsAt = new Date(trialEndsAt);
  const diffMs = endsAt.getTime() - now.getTime();
  const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  const isExpired = diffMs < 0;

  return {
    isTrial: true,
    isExpired,
    daysRemaining: Math.max(0, daysRemaining),
    trialEndsAt,
    isReadOnly: isExpired,
    message: isExpired
      ? "Votre période d'essai de 7 jours a expiré. Votre logiciel est en lecture seule. Achetez une licence pour réactiver."
      : `Essai gratuit : ${daysRemaining} jour(s) restant(s) jusqu'au ${endsAt.toLocaleDateString('fr-FR')}`
  };
}

export function isReadOnlyMode(userLot: UserLot | null, license: License | null): boolean {
  const status = computeTrialStatus(userLot, license);
  return status.isReadOnly;
}

/* ---------------------------------------------------------------------------
 * Création d'une licence d'essai
 * ------------------------------------------------------------------------- */
export function createTrialLicense(userLotId: string): License {
  const now = new Date();
  const trialEnd = new Date(now);
  trialEnd.setDate(trialEnd.getDate() + TRIAL_DAYS);

  const toLocalISO = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const generateKey = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const block = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    return `ESSAI-${block()}-${block()}`;
  };

  return {
    id: `LIC-TRIAL-${userLotId}-${Date.now()}`,
    type: 'Essai',
    duree: 0, // 7 jours, pas en mois
    prix: 0,
    dateDebut: toLocalISO(now),
    dateFin: toLocalISO(trialEnd),
    cle: generateKey(),
    active: true,
    userLotId,
    isTrial: true
  };
}

/* ---------------------------------------------------------------------------
 * Notifications d'expiration d'essai (J-2, J-1, J-0)
 * ------------------------------------------------------------------------- */
function shouldNotifyTrial(userLotId: string, daysRemaining: number): boolean {
  const key = `${TRIAL_NOTIFICATION_KEY}${userLotId}_${daysRemaining}`;
  if (localStorage.getItem(key)) return false;
  localStorage.setItem(key, '1');
  return true;
}

export async function checkAndNotifyTrialExpiry(userLot: UserLot, license: License | null): Promise<void> {
  const status = computeTrialStatus(userLot, license);

  if (!status.isTrial) return;

  // J-2, J-1, J-0 et expiré
  if ([2, 1, 0].includes(status.daysRemaining) || status.isExpired) {
    if (!shouldNotifyTrial(userLot.id, status.daysRemaining)) return;

    const template = status.isExpired ? 'trial_expired' : 'trial_expiring';

    try {
      if (userLot.email) {
        await sendNotification({
          to: userLot.email,
          type: 'email',
          template,
          data: {
            barName: userLot.barName,
            managerName: userLot.managerFullName,
            daysRemaining: status.daysRemaining,
            expiresAt: status.trialEndsAt,
            loginUrl: window.location.origin
          }
        });
      }

      if (userLot.whatsapp) {
        await sendNotification({
          to: userLot.whatsapp,
          type: 'whatsapp',
          template,
          data: {
            barName: userLot.barName,
            managerName: userLot.managerFullName,
            daysRemaining: status.daysRemaining,
            expiresAt: status.trialEndsAt,
            loginUrl: window.location.origin
          }
        });
      }
    } catch (e) {
      console.warn('⚠️ Notification essai échouée:', e);
    }
  }
}

/* ---------------------------------------------------------------------------
 * Vérification côté Supabase si l'essai est encore valide
 * ------------------------------------------------------------------------- */
export async function getTrialInfoFromSupabase(userLotId: string): Promise<{ isTrial: boolean; trialEndsAt: string | null; isExpired: boolean } | null> {
  try {
    const { data, error } = await supabase
      .from('user_lots')
      .select('is_trial, trial_ends_at, bar_name, manager_fullname, email, whatsapp')
      .eq('id', userLotId)
      .maybeSingle();

    if (error || !data) return null;

    const trialEndsAt = data.trial_ends_at;
    if (!trialEndsAt) return { isTrial: !!data.is_trial, trialEndsAt: null, isExpired: false };

    const isExpired = new Date(trialEndsAt) < new Date();

    return {
      isTrial: !!data.is_trial,
      trialEndsAt,
      isExpired
    };
  } catch {
    return null;
  }
}
