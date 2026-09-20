// ============================================================================
// Edge Function : fedapay-verify (verify_jwt = false)
// ============================================================================
// Vérifie le statut réel d'une transaction FEDAPAY. Si elle est approuvée et
// que le paiement n'a pas encore été consommé, active/prolonge la licence du
// lot concerné côté serveur (idempotence via license_payments).
//
// Déploiement :
//   supabase secrets set FEDAPAY_SECRET_KEY=sk_live_xxx FEDAPAY_MODE=live
//   supabase functions deploy fedapay-verify --no-verify-jwt
//
// Entrée  : { transactionId: string }
// Sortie  : { status: 'approved'|'pending'|'declined'|..., renewed?: boolean }
// ============================================================================
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const FEDAPAY_SECRET_KEY = Deno.env.get('FEDAPAY_SECRET_KEY') ?? '';
const FEDAPAY_MODE = Deno.env.get('FEDAPAY_MODE') ?? 'sandbox';
const API_BASE = FEDAPAY_MODE === 'live'
  ? 'https://api.fedapay.com/v1'
  : 'https://sandbox-api.fedapay.com/v1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
// Clé service_role : accès complet, contourne la RLS (usage serveur uniquement)
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function getTransactionStatus(transactionId: string): Promise<{ status: string; metadata?: any }> {
  const res = await fetch(`${API_BASE}/transactions/${transactionId}`, {
    headers: {
      'Authorization': `Bearer ${FEDAPAY_SECRET_KEY}`,
      'Accept': 'application/json',
    },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body?.message || `FEDAPAY HTTP ${res.status}`);
  }
  const tx = body?.transaction ?? body;
  return { status: String(tx?.status ?? ''), metadata: tx?.custom_metadata ?? {} };
}

/** Génère une clé de licence XXXX-XXXX-XXXX-XXXX */
function generateLicenseKey(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const block = () =>
    Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `${block()}-${block()}-${block()}-${block()}`;
}

function toLocalISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  const day = d.getDate();
  d.setMonth(d.getMonth() + months);
  if (d.getDate() < day) d.setDate(0);
  return d;
}

/** Active/prolonge la licence du lot après paiement approuvé (idempotent) */
async function activateLicense(supabaseAdmin: any, transactionId: string, metadata: any) {
  const userLotId = metadata?.user_lot_id;
  const licenseType = metadata?.license_type;
  const duree = Number(metadata?.duree ?? 0);
  const montant = Number(metadata?.montant ?? 0);
  const payer = metadata?.payer ?? 'fedapay-webhook';

  if (!userLotId || !licenseType || !duree) {
    return { renewed: false, message: 'Métadonnées de paiement incomplètes' };
  }

  // 1. Verrou d'idempotence : pending → completed (une seule fois)
  const { data: claimed, error: claimError } = await supabaseAdmin
    .from('license_payments')
    .update({ status: 'completed', completed_at: new Date().toISOString() })
    .eq('fedapay_transaction_id', transactionId)
    .eq('status', 'pending')
    .select('id');

  if (claimError) throw claimError;

  // Paiement déjà enregistré complet → déjà activé (par le client ou le webhook)
  if (!claimed || claimed.length === 0) {
    // S'assure quand même qu'une ligne d'audit existe
    const { data: existing } = await supabaseAdmin
      .from('license_payments')
      .select('id, status')
      .eq('fedapay_transaction_id', transactionId)
      .maybeSingle();

    if (existing?.status === 'completed') {
      return { renewed: false, message: 'Paiement déjà traité' };
    }
    // Ligne absente : la créer directement en completed
    await supabaseAdmin.from('license_payments').upsert({
      fedapay_transaction_id: transactionId,
      user_lot_id: userLotId,
      license_type: licenseType,
      duree,
      montant,
      status: 'completed',
      payer_username: payer,
      created_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
    }, { onConflict: 'fedapay_transaction_id' });
  }

  // 2. Calcul de la période : prolonger la licence courante si encore valide
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { data: currentLicenses } = await supabaseAdmin
    .from('licenses')
    .select('*')
    .eq('user_lot_id', userLotId)
    .eq('active', true)
    .order('date_fin', { ascending: false })
    .limit(1);

  let dateDebut = today;
  if (currentLicenses && currentLicenses.length > 0) {
    const currentEnd = new Date(currentLicenses[0].date_fin);
    currentEnd.setHours(23, 59, 59, 999);
    if (currentEnd >= today) dateDebut = new Date(currentLicenses[0].date_fin);
  }
  const dateFin = addMonths(dateDebut, duree);

  // 3. Insertion de la nouvelle licence
  const { error: insertError } = await supabaseAdmin.from('licenses').insert({
    id: `LIC-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
    license_type: licenseType,
    duree,
    prix: montant,
    date_debut: toLocalISODate(dateDebut),
    date_fin: toLocalISODate(dateFin),
    cle: generateLicenseKey(),
    active: true,
    user_lot_id: userLotId,
  });

  if (insertError) throw insertError;

  console.log(`✅ Licence ${licenseType} activée pour le lot ${userLotId} (paiement ${transactionId})`);
  return { renewed: true, dateFin: toLocalISODate(dateFin) };
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { transactionId } = await req.json();
    if (!transactionId) return json({ error: 'transactionId requis' }, 400);

    const { status, metadata } = await getTransactionStatus(String(transactionId));

    if (status !== 'approved') {
      return json({ status, renewed: false });
    }

    // Vérification + activation serveur
    if (SERVICE_ROLE_KEY && SUPABASE_URL) {
      const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
      const result = await activateLicense(supabaseAdmin, String(transactionId), metadata);
      return json({ status, ...result });
    }

    // Sans clé service_role : renvoyer le statut, le client activera
    return json({ status, renewed: false, message: 'Vérifiée — activation côté client' });
  } catch (error) {
    return json({ error: error?.message ?? 'Erreur inconnue' }, 500);
  }
});
