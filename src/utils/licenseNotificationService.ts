/**
 * ============================================================================
 * SERVICE DE NOTIFICATIONS D'EXPIRATION DE LICENCE
 * ============================================================================
 * Règles métier demandées :
 *   • J-7  : première notification "expire dans 1 semaine"
 *   • J-3  : rappel "expire dans 3 jours"
 *   • J-0  : alerte "expire aujourd'hui" (+ expiration dépassée)
 *
 * Chaque jalon n'est émis QU'UNE SEULE fois par licence (déduplication
 * persistée dans localStorage). Deux canaux de diffusion :
 *   1. Notification navigateur (Notification API) — "push" visible même si
 *      l'application est en arrière-plan (onglet ouvert).
 *   2. Boîte de réception persistante lue par le NotificationCenter de l'app.
 *
 * Le propriétaire reçoit les alertes pour TOUTES les licences de ses clients ;
 * les gestionnaires/employés reçoivent celles de leur propre lot.
 * ============================================================================
 */
import { License, User } from '../types';
import { computeLicenseStatus, milestoneLabel, getValidLicenseForLot, getAllLicensesWithLots } from './licenseService';

const NOTIF_DEDUP_PREFIX = 'ahandjo_licnotif_';
const INBOX_KEY = 'ahandjo_license_inbox';
const MAX_INBOX = 20;

export interface LicenseNotificationItem {
  id: string;
  title: string;
  message: string;
  severity: 'warning' | 'error' | 'info';
  daysRemaining: number;
  licenseType: string;
  userLotId: string;
  lotLabel: string;
  createdAt: string;
  read: boolean;
}

/* ---------------------------------------------------------------------------
 * Permission des notifications navigateur
 * ------------------------------------------------------------------------- */
export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

function showBrowserNotification(title: string, body: string) {
  try {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: '/pwa-192x192.png',
        badge: '/pwa-192x192.png',
        tag: title // évite les doublons empilés
      });
    }
  } catch (e) {
    console.warn('⚠️ Notification navigateur impossible:', e);
  }
}

/* ---------------------------------------------------------------------------
 * Boîte de réception persistante (lue par NotificationCenter)
 * ------------------------------------------------------------------------- */
export function getLicenseInbox(): LicenseNotificationItem[] {
  try {
    const raw = localStorage.getItem(INBOX_KEY);
    const items: LicenseNotificationItem[] = raw ? JSON.parse(raw) : [];
    // Nettoyage : on supprime les notifs lues de plus de 7 jours
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return items.filter(n => !n.read || new Date(n.createdAt).getTime() > cutoff);
  } catch {
    return [];
  }
}

export function markLicenseInboxRead() {
  try {
    const items = getLicenseInbox().map(n => ({ ...n, read: true }));
    localStorage.setItem(INBOX_KEY, JSON.stringify(items));
  } catch { /* ignore */ }
}

function pushToInbox(item: LicenseNotificationItem) {
  try {
    const items = getLicenseInbox();
    // Évite le doublon même id
    if (items.some(n => n.id === item.id)) return;
    items.unshift(item);
    localStorage.setItem(INBOX_KEY, JSON.stringify(items.slice(0, MAX_INBOX)));
    window.dispatchEvent(new CustomEvent('licenseInboxUpdated'));
  } catch { /* ignore */ }
}

export function getUnreadLicenseCount(): number {
  return getLicenseInbox().filter(n => !n.read).length;
}

/**
 * Notifications actives, consolidées : par lot, seul le jalon le plus récent
 * est conservé (à J-3, la notification J-7 est remplacée par celle de J-3).
 */
export function getActiveLicenseNotifications(): LicenseNotificationItem[] {
  const items = getLicenseInbox();
  const byLot = new Map<string, LicenseNotificationItem>();
  for (const n of items) {
    const key = n.userLotId || n.lotLabel;
    const existing = byLot.get(key);
    if (!existing) {
      byLot.set(key, n);
      continue;
    }
    const nTime = new Date(n.createdAt).getTime();
    const eTime = new Date(existing.createdAt).getTime();
    // Plus récent gagne ; à égalité (même ms), la notification la plus
    // sévère (jours restants les plus faibles) est conservée.
    if (nTime > eTime || (nTime === eTime && n.daysRemaining < existing.daysRemaining)) {
      byLot.set(key, n);
    }
  }
  return Array.from(byLot.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

/* ---------------------------------------------------------------------------
 * Déduplication par jalon
 * ------------------------------------------------------------------------- */
function isMilestoneNotified(cle: string, dedupKey: string | number): boolean {
  const key = `${NOTIF_DEDUP_PREFIX}${cle}_${dedupKey}`;
  return localStorage.getItem(key) === '1';
}

function markMilestoneNotified(cle: string, dedupKey: string | number) {
  try {
    localStorage.setItem(`${NOTIF_DEDUP_PREFIX}${cle}_${dedupKey}`, '1');
  } catch { /* ignore */ }
}

/* ---------------------------------------------------------------------------
 * Émission des notifications pour une licence
 * ------------------------------------------------------------------------- */
function notifyMilestone(
  license: License,
  daysRemaining: number,
  lotLabel: string,
  isOwnerView: boolean
) {
  // Jalon atteint : 0 le jour même (et après), 3 jusqu'à J-3, 7 jusqu'à J-7.
  // L'ordre est crucial : J-0 doit produire le jalon 0 (dernier jour), pas 3.
  const milestone = daysRemaining <= 0 ? 0 : daysRemaining <= 3 ? 3 : 7;
  const keyId = license.cle || license.id;
  // Clé de déduplication : 'expired' est distinct de 0 — après l'expiration on
  // émet une notification « expirée » en plus du « dernier jour » de J-0.
  const dedupKey = daysRemaining < 0 ? 'expired' : milestone;

  if (isMilestoneNotified(keyId, dedupKey)) return;

  const label = milestoneLabel(daysRemaining);

  let title: string;
  let severity: 'warning' | 'error';
  let message: string;

  if (daysRemaining < 0) {
    title = isOwnerView ? `Licence expirée — ${lotLabel}` : '🔴 Licence expirée';
    severity = 'error';
    message = isOwnerView
      ? `La licence ${license.type} du client ${lotLabel} est expirée depuis le ${new Date(license.dateFin).toLocaleDateString('fr-FR')}. Contactez-le ou renouvelez-la.`
      : `Votre licence ${license.type} a expiré depuis le ${new Date(license.dateFin).toLocaleDateString('fr-FR')}. Renouvelez-la pour continuer à utiliser AHANDJO.`;
  } else if (daysRemaining === 0) {
    title = isOwnerView ? `Licence expire aujourd'hui — ${lotLabel}` : '⚠️ Dernier jour de licence';
    severity = 'error';
    message = isOwnerView
      ? `La licence ${license.type} du client ${lotLabel} expire aujourd'hui.`
      : `Votre licence ${license.type} expire aujourd'hui. Renouvelez-la maintenant pour éviter toute interruption.`;
  } else {
    title = isOwnerView ? `Licence ${license.type} — ${lotLabel}` : '⏳ Licence bientôt expirée';
    severity = 'warning';
    message = isOwnerView
      ? `${label.replace('Votre licence', 'La licence')} pour le client ${lotLabel} (type ${license.type}). Échéance : ${new Date(license.dateFin).toLocaleDateString('fr-FR')}.`
      : `${label} (${license.type}). Échéance : ${new Date(license.dateFin).toLocaleDateString('fr-FR')}. Renouvelez-la dès maintenant.`;
  }

  // 1. Notification navigateur
  showBrowserNotification(title, message);

  // 2. Boîte de réception persistante
  pushToInbox({
    id: `lic-${keyId}-${dedupKey}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    title,
    message,
    severity,
    daysRemaining,
    licenseType: license.type,
    userLotId: license.userLotId || '',
    lotLabel,
    createdAt: new Date().toISOString(),
    read: false
  });

  markMilestoneNotified(keyId, dedupKey);
  console.log(`🔔 Notification licence émise (J-${daysRemaining < 0 ? 'expirée' : daysRemaining}) : ${lotLabel}`);
}

/* ---------------------------------------------------------------------------
 * Point d'entrée principal — appelé au login, toutes les heures et au focus
 * ------------------------------------------------------------------------- */
export async function checkLicenseNotifications(user: User): Promise<number> {
  if (!user) return 0;
  let emitted = 0;

  try {
    if (!navigator.onLine) return 0;

    if (user.type === 'Propriétaire') {
      // Vue propriétaire : surveiller les licences de tous les clients
      const { licenses, userLots } = await getAllLicensesWithLots();
      for (const license of licenses) {
        if (!license.active || !license.userLotId) continue;
        const { daysRemaining, status } = computeLicenseStatus(license);
        const lot = userLots.find(l => l.id === license.userLotId);
        const lotLabel = lot ? lot.gestionnaire.username : license.userLotId;
        if (status !== 'active') {
          const before = getLicenseInbox().length;
          notifyMilestone(license, daysRemaining, lotLabel, true);
          if (getLicenseInbox().length > before) emitted++;
        }
      }
    } else {
      // Vue utilisateur : surveiller la licence de son propre lot
      const userLotId = user.userLotId;
      if (!userLotId) return 0;
      const license = await getValidLicenseForLot(userLotId);
      if (license) {
        const { daysRemaining, status } = computeLicenseStatus(license);
        if (status !== 'active') {
          const before = getLicenseInbox().length;
          notifyMilestone(license, daysRemaining, user.username, false);
          if (getLicenseInbox().length > before) emitted++;
        }
      }
    }
  } catch (error) {
    console.warn('⚠️ checkLicenseNotifications:', error);
  }

  return emitted;
}

/* ---------------------------------------------------------------------------
 * Initialisation : login + interval horaire + retour au premier plan
 * ------------------------------------------------------------------------- */
let intervalId: ReturnType<typeof setInterval> | null = null;
let focusHandler: (() => void) | null = null;

export function startLicenseNotificationWatcher(user: User) {
  stopLicenseNotificationWatcher();
  if (!user) return;

  // Premier contrôle immédiat (après un court délai laissant l'app s'installer)
  setTimeout(() => checkLicenseNotifications(user), 4000);

  // Contrôle toutes les heures
  intervalId = setInterval(() => checkLicenseNotifications(user), 60 * 60 * 1000);

  // Contrôle au retour au premier plan (mobile : reprise de l'app)
  focusHandler = () => checkLicenseNotifications(user);
  window.addEventListener('focus', focusHandler);
}

export function stopLicenseNotificationWatcher() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
  if (focusHandler) {
    window.removeEventListener('focus', focusHandler);
    focusHandler = null;
  }
}
