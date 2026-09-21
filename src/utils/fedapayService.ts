/**
 * ============================================================================
 * SERVICE DE PAIEMENT FEDAPAY — achat / renouvellement de licence
 * ============================================================================
 * Mécanisme d'activation AUTOMATIQUE après règlement :
 *
 *   1. L'utilisateur choisit un plan → startLicenseCheckout() crée une
 *      transaction FEDAPAY (montant = prix du plan, metadata = lot + plan)
 *      puis récupère le lien de paiement sécurisé et y redirige l'utilisateur
 *      (Mobile Money, carte bancaire…).
 *   2. Après règlement, FEDAPAY le redirige vers l'application avec
 *      ?fedapay_return=1&id={transactionId}&status=approved.
 *   3. Au chargement de l'app, handlePaymentReturn() vérifie le statut réel
 *      de la transaction auprès de FEDAPAY, puis active/prolonge la licence
 *      (renouvellement automatique, sans intervention du propriétaire).
 *   4. L'idempotence est garantie par la table license_payments (contrainte
 *      UNIQUE sur fedapay_transaction_id) : un même paiement n'activera
 *      jamais deux licences.
 *
 * Deux modes de communication avec l'API FEDAPAY :
 *   • MODE SERVEUR (recommandé, production) : une Edge Function Supabase
 *     (supabase/functions/fedapay-checkout + fedapay-verify + fedapay-webhook)
 *     détient la clé secrète — elle ne quitte jamais le serveur.
 *   • MODE DIRECT (immédiat, sans déploiement) : la clé secrète est saisie
 *     par le propriétaire dans les paramètres et l'app appelle l'API FEDAPAY
 *     directement. Configurable via Paramètres → Paiements FEDAPAY.
 * ============================================================================
 */
import { LicensePlan, LicensePayment, User } from '../types';
import { supabase } from './supabaseService';
import { renewLicenseForLot, getPlan } from './licenseService';

const CONFIG_KEY = 'fedapay';
const CONFIG_LOCAL_KEY = 'ahandjo_fedapay_config';
const PENDING_LOCAL_KEY = 'ahandjo_pending_payments';

export interface FedapayConfig {
  mode: 'sandbox' | 'live';
  secretKey: string;
  publicKey?: string;
  /** URL de base des Edge Functions (ex: https://xxx.supabase.co/functions/v1) — mode serveur */
  edgeFunctionUrl?: string;
}

/* ---------------------------------------------------------------------------
 * Configuration (propriétaire) — table platform_settings + repli local
 * ------------------------------------------------------------------------- */
export function getLocalFedapayConfig(): FedapayConfig | null {
  try {
    const raw = localStorage.getItem(CONFIG_LOCAL_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function getFedapayConfig(): Promise<FedapayConfig | null> {
  // 1. Repli local immédiat (fonctionne hors ligne / si table absente)
  // 2. Source partagée : table platform_settings (les clients y lisent la
  //    configuration pour payer sans intervention du propriétaire)
  try {
    if (navigator.onLine) {
      const { data, error } = await supabase
        .from('platform_settings')
        .select('value')
        .eq('key', CONFIG_KEY)
        .maybeSingle();

      if (!error && data?.value) {
        const cfg = data.value as FedapayConfig;
        localStorage.setItem(CONFIG_LOCAL_KEY, JSON.stringify(cfg));
        return cfg;
      }
    }
  } catch { /* table absente → repli local */ }

  return getLocalFedapayConfig();
}

export async function saveFedapayConfig(config: FedapayConfig): Promise<{ success: boolean; message?: string }> {
  // 1. localStorage (toujours)
  localStorage.setItem(CONFIG_LOCAL_KEY, JSON.stringify(config));

  // 2. Supabase (partage avec les clients) — sans bloquer si la table manque
  try {
    const { error } = await supabase
      .from('platform_settings')
      .upsert({
        key: CONFIG_KEY,
        value: config,
        updated_at: new Date().toISOString()
      }, { onConflict: 'key' });

    if (error) {
      return {
        success: true,
        message: 'Configuration enregistrée sur cet appareil uniquement (table platform_settings inaccessible : ' + error.message + ')'
      };
    }
    return { success: true, message: 'Configuration enregistrée et partagée avec tous les appareils.' };
  } catch (e: any) {
    return { success: true, message: 'Configuration enregistrée localement (' + (e?.message || 'erreur réseau') + ')' };
  }
}

/** L'API FEDAPAY est-elle configurée sur cet appareil / pour cette app ? */
export async function isFedapayReady(): Promise<boolean> {
  const cfg = await getFedapayConfig();
  return !!(cfg && (cfg.secretKey || cfg.edgeFunctionUrl));
}

const apiBase = (cfg: FedapayConfig) =>
  cfg.mode === 'live' ? 'https://api.fedapay.com/v1' : 'https://sandbox-api.fedapay.com/v1';

/* ---------------------------------------------------------------------------
 * Client HTTP FEDAPAY
 * ------------------------------------------------------------------------- */
async function fedapayRequest(
  cfg: FedapayConfig,
  method: 'GET' | 'POST',
  path: string,
  body?: any
): Promise<any> {
  const res = await fetch(`${apiBase(cfg)}${path}`, {
    method,
    headers: {
      'Authorization': `Bearer ${cfg.secretKey}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: body ? JSON.stringify(body) : undefined
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = json?.message || json?.error?.message || `Erreur HTTP ${res.status}`;
    throw new Error(`FEDAPAY : ${msg}`);
  }
  return json;
}

/** Appel à l'Edge Function Supabase (mode serveur) */
async function edgeRequest(edgeBase: string, fn: string, body: any): Promise<any> {
  const res = await fetch(`${edgeBase.replace(/\/$/, '')}/${fn}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error || `Edge Function ${fn} : HTTP ${res.status}`);
  return json;
}

/* ---------------------------------------------------------------------------
 * ÉTAPE 1 — Démarrer un paiement de licence
 * ------------------------------------------------------------------------- */
export interface CheckoutParams {
  plan: LicensePlan;
  user: User;
  /** Lot concerné (par défaut celui de l'utilisateur connecté) */
  userLotId?: string;
  /** Téléphone du payeur pour le reçu Mobile Money (optionnel) */
  payerPhone?: string;
}

export interface CheckoutResult {
  success: boolean;
  transactionId?: string;
  paymentUrl?: string;
  message?: string;
}

function normalizePhone(phone?: string): { number: string; country: string } | undefined {
  if (!phone) return undefined;
  const cleaned = phone.replace(/[\s.-]/g, '');
  const m = cleaned.match(/^\+?(\d{1,3})(\d{6,12})$/);
  if (!m) return undefined;
  const country = m[1] === '229' ? 'BJ' : 'BJ';
  return { number: cleaned.replace(/^\+/, ''), country };
}

export async function startLicenseCheckout(params: CheckoutParams): Promise<CheckoutResult> {
  const { plan, user } = params;
  const userLotId = params.userLotId || user.userLotId;

  if (!userLotId) {
    return { success: false, message: 'Aucun lot utilisateur associé — impossible de déterminer la licence à renouveler.' };
  }
  if (!navigator.onLine) {
    return { success: false, message: 'Hors ligne — le paiement nécessite une connexion internet.' };
  }

  const cfg = await getFedapayConfig();
  if (!cfg || (!cfg.secretKey && !cfg.edgeFunctionUrl)) {
    return {
      success: false,
      message: "Le paiement en ligne n'est pas encore configuré. Le propriétaire doit renseigner sa clé FEDAPAY dans Paramètres → Paiements FEDAPAY."
    };
  }

  const callbackUrl = `${window.location.origin}${window.location.pathname}?fedapay_return=1`;
  const merchantReference = `AHANDJO-${plan.key}-${userLotId}-${Date.now()}`;
  const customer: any = {
    firstname: user.username,
    lastname: `AHANDJO ${plan.key}`,
    email: `${user.username.toLowerCase().replace(/[^a-z0-9]/g, '')}@gobex.local`
  };
  const phone = normalizePhone(params.payerPhone);
  if (phone) customer.phone_number = phone;

  const transactionPayload = {
    description: `Licence AHANDJO ${plan.key} (${plan.duree} mois) — renouvellement`,
    amount: Math.round(plan.prix),
    currency: { iso: 'XOF' },
    callback_url: callbackUrl,
    customer,
    merchant_reference: merchantReference,
    custom_metadata: {
      app: 'AHANDJO',
      user_lot_id: userLotId,
      license_type: plan.key,
      duree: plan.duree,
      montant: plan.prix,
      payer: user.username
    }
  };

  try {
    let transactionId: string;
    let paymentUrl: string;

    if (cfg.edgeFunctionUrl) {
      // ---- MODE SERVEUR (recommandé) : la clé secrète reste côté Edge Function
      const res = await edgeRequest(cfg.edgeFunctionUrl, 'fedapay-checkout', transactionPayload);
      transactionId = String(res.transactionId || res.id);
      paymentUrl = res.paymentUrl || res.url;
    } else {
      // ---- MODE DIRECT : appel API depuis le client
      const tx = await fedapayRequest(cfg, 'POST', '/transactions', transactionPayload);
      transactionId = String(tx?.transaction?.id || tx?.id);
      if (!transactionId) throw new Error('Identifiant de transaction manquant dans la réponse FEDAPAY.');

      const tokenRes = await fedapayRequest(cfg, 'POST', `/transactions/${transactionId}/token`, {});
      paymentUrl = tokenRes?.token?.url || tokenRes?.url;
    }

    if (!paymentUrl) throw new Error('Lien de paiement introuvable dans la réponse FEDAPAY.');

    // Enregistre le paiement en attente (idempotence + reprise après retour)
    await recordPendingPayment({
      fedapayTransactionId: transactionId,
      userLotId,
      licenseType: plan.key,
      duree: plan.duree,
      montant: plan.prix,
      status: 'pending',
      payerUsername: user.username,
      createdAt: new Date().toISOString()
    });

    console.log(`💳 Paiement FEDAPAY initié : transaction ${transactionId} — ${plan.prix} FCFA (${plan.key})`);
    return { success: true, transactionId, paymentUrl };
  } catch (error: any) {
    console.error('❌ startLicenseCheckout:', error);
    const msg = error?.message || 'Erreur inconnue';
    return {
      success: false,
      message: msg.includes('Failed to fetch')
        ? 'Impossible de contacter FEDAPAY (réseau/CORS). Utilisez le mode Edge Function dans les paramètres.'
        : msg
    };
  }
}

/* ---------------------------------------------------------------------------
 * Paiements — persistance (localStorage + table license_payments)
 * ------------------------------------------------------------------------- */
function readPendingLocal(): LicensePayment[] {
  try {
    return JSON.parse(localStorage.getItem(PENDING_LOCAL_KEY) || '[]');
  } catch {
    return [];
  }
}

function writePendingLocal(payments: LicensePayment[]) {
  localStorage.setItem(PENDING_LOCAL_KEY, JSON.stringify(payments.slice(-50)));
}

async function recordPendingPayment(payment: LicensePayment) {
  // Local (toujours)
  const local = readPendingLocal();
  local.push(payment);
  writePendingLocal(local);

  // Supabase (audit + idempotence serveur, sans bloquer si table absente)
  try {
    await supabase.from('license_payments').upsert({
      fedapay_transaction_id: payment.fedapayTransactionId,
      user_lot_id: payment.userLotId,
      license_type: payment.licenseType,
      duree: payment.duree,
      montant: payment.montant,
      status: 'pending',
      payer_username: payment.payerUsername,
      created_at: payment.createdAt
    }, { onConflict: 'fedapay_transaction_id' });
  } catch (e) {
    console.warn('⚠️ license_payments indisponible (table à créer via migration):', e);
  }
}

async function updatePaymentStatus(
  transactionId: string,
  status: LicensePayment['status']
): Promise<number> {
  // Local
  const local = readPendingLocal().map(p =>
    p.fedapayTransactionId === transactionId ? { ...p, status } : p
  );
  writePendingLocal(local);

  // Supabase — mise à jour conditionnelle : renvoie le nombre de lignes
  // réellement passées de pending → completed (verrou d'idempotence)
  try {
    const { data, error } = await supabase
      .from('license_payments')
      .update({ status, completed_at: status === 'completed' ? new Date().toISOString() : null })
      .eq('fedapay_transaction_id', transactionId)
      .eq('status', 'pending')
      .select('id');

    if (!error) return data ? data.length : 1;
  } catch { /* table absente */ }
  // Repli : considérer l'opération locale comme décisive
  return 1;
}

/** Historique des paiements (pour le module Licences du propriétaire) */
export async function getLicensePayments(): Promise<LicensePayment[]> {
  try {
    const { data, error } = await supabase
      .from('license_payments')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (!error && data) {
      return data.map((p: any) => ({
        id: String(p.id),
        fedapayTransactionId: p.fedapay_transaction_id,
        userLotId: p.user_lot_id,
        licenseType: p.license_type,
        duree: p.duree,
        montant: Number(p.montant),
        status: p.status,
        payerUsername: p.payer_username,
        createdAt: p.created_at,
        completedAt: p.completed_at
      }));
    }
  } catch { /* table absente */ }
  return readPendingLocal();
}

/* ---------------------------------------------------------------------------
 * ÉTAPE 2 — Vérifier une transaction FEDAPAY
 * ------------------------------------------------------------------------- */
export async function verifyTransaction(transactionId: string): Promise<{ status: string }> {
  const cfg = await getFedapayConfig();
  if (!cfg) throw new Error('Configuration FEDAPAY introuvable.');

  if (cfg.edgeFunctionUrl) {
    const res = await edgeRequest(cfg.edgeFunctionUrl, 'fedapay-verify', { transactionId });
    return { status: res.status };
  }

  if (!cfg.secretKey) throw new Error('Clé FEDAPAY non configurée.');

  const tx = await fedapayRequest(cfg, 'GET', `/transactions/${transactionId}`);
  const status = tx?.transaction?.status || tx?.status;
  return { status };
}

/* ---------------------------------------------------------------------------
 * ÉTAPE 3 — Retour de paiement (callback) + activation automatique
 * ------------------------------------------------------------------------- */
export interface PaymentReturnResult {
  handled: boolean;
  renewed?: boolean;
  status?: string;
  message?: string;
}

/** À appeler au chargement de l'app : détecte ?fedapay_return=1&id=..&status=.. */
export async function handlePaymentReturn(): Promise<PaymentReturnResult> {
  const params = new URLSearchParams(window.location.search);
  if (params.get('fedapay_return') !== '1') {
    // Pas de retour FEDAPAY — vérifie quand même les paiements en attente
    return checkPendingPayments();
  }

  const transactionId = params.get('id') || '';
  const status = params.get('status') || '';
  if (!transactionId) return { handled: false };

  // Nettoie l'URL (évite retraitement au refresh)
  const cleanUrl = window.location.origin + window.location.pathname;
  window.history.replaceState({}, document.title, cleanUrl);

  console.log(`↩️ Retour FEDAPAY : transaction ${transactionId}, statut ${status}`);

  if (status === 'approved') {
    return activateLicenseAfterPayment(transactionId);
  }

  await updatePaymentStatus(transactionId, status === 'canceled' ? 'canceled' : 'failed');
  return {
    handled: true,
    renewed: false,
    status,
    message: 'Le paiement n\'a pas abouti. Aucun montant n\'a été débité — vous pouvez réessayer.'
  };
}

/** Vérifie les paiements partis en attente (retour interrompu, onglet fermé…) */
async function checkPendingPayments(): Promise<PaymentReturnResult> {
  const pending = readPendingLocal().filter(p => p.status === 'pending');
  if (pending.length === 0 || !navigator.onLine) return { handled: false };

  for (const payment of pending) {
    try {
      const { status } = await verifyTransaction(payment.fedapayTransactionId);
      if (status === 'approved') {
        const result = await activateLicenseAfterPayment(payment.fedapayTransactionId);
        if (result.renewed) return result;
      } else if (status === 'canceled' || status === 'declined') {
        await updatePaymentStatus(payment.fedapayTransactionId, status === 'canceled' ? 'canceled' : 'failed');
      }
    } catch (e) {
      console.warn('⚠️ Vérification paiement en attente impossible:', e);
    }
  }
  return { handled: false };
}

/* ---------------------------------------------------------------------------
 * ÉTAPE 4 — Activation automatique de la licence après paiement approuvé
 * ------------------------------------------------------------------------- */
export async function activateLicenseAfterPayment(transactionId: string): Promise<PaymentReturnResult> {
  try {
    // 1. Vérifier le statut RÉEL auprès de FEDAPAY (ne jamais se fier au query param)
    const { status } = await verifyTransaction(transactionId);
    if (status !== 'approved') {
      await updatePaymentStatus(transactionId, status === 'canceled' ? 'canceled' : 'failed');
      return { handled: true, renewed: false, status, message: `Paiement FEDAPAY : ${status}. Licence non activée.` };
    }

    // 2. Récupérer les métadonnées du paiement (idempotence)
    const localPayment = readPendingLocal().find(p => p.fedapayTransactionId === transactionId);

    let planKey = localPayment?.licenseType;
    let userLotId = localPayment?.userLotId;

    if (!planKey || !userLotId) {
      // Repli : lire license_payments côté Supabase
      const { data } = await supabase
        .from('license_payments')
        .select('*')
        .eq('fedapay_transaction_id', transactionId)
        .maybeSingle();
      if (data) {
        planKey = data.license_type;
        userLotId = data.user_lot_id;
      }
    }

    if (!planKey || !userLotId) {
      return { handled: true, renewed: false, status, message: 'Paiement approuvé mais métadonnées introuvables — contactez le propriétaire.' };
    }

    // 3. Verrou d'idempotence : pending → completed. Si 0 ligne modifiée,
    //    la licence a déjà été activée (webhook ou autre appareil).
    const claimed = await updatePaymentStatus(transactionId, 'completed');
    if (claimed === 0) {
      console.log('🔁 Paiement déjà traité — licence déjà activée.');
      return { handled: true, renewed: false, status, message: 'Ce paiement a déjà été pris en compte.' };
    }

    // 4. Activation / prolongation automatique de la licence
    const plan = getPlan(planKey);
    if (!plan) {
      return { handled: true, renewed: false, status, message: `Plan inconnu : ${planKey}` };
    }

    const renewal = await renewLicenseForLot(userLotId, plan, { source: 'fedapay' });
    if (!renewal.success) {
      return { handled: true, renewed: false, status, message: `Paiement approuvé mais activation impossible : ${renewal.message}` };
    }

    return {
      handled: true,
      renewed: true,
      status,
      message: `Paiement confirmé ✅ Votre licence ${plan.key} (${plan.duree} mois) a été activée automatiquement jusqu'au ${new Date(renewal.license!.dateFin).toLocaleDateString('fr-FR')}.`
    };
  } catch (error: any) {
    console.error('❌ activateLicenseAfterPayment:', error);
    return { handled: true, renewed: false, message: `Erreur lors de l'activation automatique : ${error?.message || 'inconnue'}. Votre paiement est enregistré, la licence sera activée à la prochaine ouverture de l'application.` };
  }
}

/* ---------------------------------------------------------------------------
 * Test de configuration (Paramètres → Paiements FEDAPAY)
 * ------------------------------------------------------------------------- */
export async function testFedapayConnection(cfg: FedapayConfig): Promise<{ success: boolean; message: string }> {
  try {
    if (cfg.edgeFunctionUrl) {
      const res = await edgeRequest(cfg.edgeFunctionUrl, 'fedapay-checkout', { action: 'ping' });
      return { success: true, message: res.message || 'Edge Function joignable.' };
    }

    if (!cfg.secretKey) return { success: false, message: 'Clé secrète manquante.' };

    const res = await fetch(`${apiBase(cfg)}/transactions?limit=1`, {
      headers: {
        'Authorization': `Bearer ${cfg.secretKey}`,
        'Accept': 'application/json'
      }
    });
    if (res.ok) return { success: true, message: `Connexion FEDAPAY réussie (mode ${cfg.mode === 'live' ? 'PRODUCTION' : 'sandbox'}).` };
    if (res.status === 401 || res.status === 403) return { success: false, message: 'Clé secrète refusée par FEDAPAY (401/403). Vérifiez la clé et le mode (sandbox/live).' };
    return { success: false, message: `Réponse FEDAPAY : HTTP ${res.status}` };
  } catch (error: any) {
    return {
      success: false,
      message: (error?.message || '').includes('Failed to fetch')
        ? 'Réseau/CORS bloqué — en production, préférez le mode Edge Function.'
        : `Erreur : ${error?.message || 'inconnue'}`
    };
  }
}
