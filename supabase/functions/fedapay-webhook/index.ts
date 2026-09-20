// ============================================================================
// Edge Function : fedapay-webhook
// ============================================================================
// Reçoit les webhooks FEDAPAY (événement transaction.approved) et active la
// licence du lot concerné côté serveur, en temps réel et sans action du client.
//
// Déploiement :
//   supabase secrets set FEDAPAY_SECRET_KEY=sk_live_xxx FEDAPAY_MODE=live
//   supabase functions deploy fedapay-webhook --no-verify-jwt
//   → Dans le dashboard FEDAPAY : Réglages → Webhooks → URL =
//     https://VOTRE-PROJET.supabase.co/functions/v1/fedapay-webhook
//     Événement : transaction.approved
//
// NOTE : configurez également le secret du webhook (FEDAPAY_WEBHOOK_SECRET)
// pour vérifier la signature X-FEDAPAY-SIGNATURE si votre offre le permet.
// ============================================================================
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const FEDAPAY_SECRET_KEY = Deno.env.get('FEDAPAY_SECRET_KEY') ?? '';
const FEDAPAY_MODE = Deno.env.get('FEDAPAY_MODE') ?? 'sandbox';
const API_BASE = FEDAPAY_MODE === 'live'
  ? 'https://api.fedapay.com/v1'
  : 'https://sandbox-api.fedapay.com/v1';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function getTransaction(transactionId: string): Promise<any> {
  const res = await fetch(`${API_BASE}/transactions/${transactionId}`, {
    headers: {
      'Authorization': `Bearer ${FEDAPAY_SECRET_KEY}`,
      'Accept': 'application/json',
    },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body?.message || `FEDAPAY HTTP ${res.status}`);
  return body?.transaction ?? body;
}

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

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    // Format webhook FEDAPAY : { name: 'transaction.approved', entity: { id, ... } }
    const eventName = payload?.name ?? '';
    const entity = payload?.entity ?? {};

    if (eventName !== 'transaction.approved') {
      return json({ received: true, ignored: eventName || 'unknown' });
    }

    const transactionId = String(entity?.id ?? '');
    if (!transactionId) return json({ received: true, ignored: 'no transaction id' });

    // 1. Statut + métadonnées vérifiés AUPRÈS de FEDAPAY (ne jamais faire
    //    confiance au corps du webhook seul)
    const tx = await getTransaction(transactionId);
    if (String(tx?.status) !== 'approved') {
      return json({ received: true, ignored: `status=${tx?.status}` });
    }
    const metadata = tx?.custom_metadata ?? {};
    const userLotId = metadata?.user_lot_id;
    const licenseType = metadata?.license_type;
    const duree = Number(metadata?.duree ?? 0);
    const montant = Number(metadata?.montant ?? 0);

    if (!userLotId || !licenseType || !duree) {
      return json({ received: true, ignored: 'metadata incomplètes' });
    }

    if (!SERVICE_ROLE_KEY || !SUPABASE_URL) {
      return json({ received: true, error: 'SUPABASE_SERVICE_ROLE_KEY absente' }, 500);
    }
    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // 2. Verrou d'idempotence : pending → completed (une seule activation)
    const { data: claimed } = await supabaseAdmin
      .from('license_payments')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('fedapay_transaction_id', transactionId)
      .eq('status', 'pending')
      .select('id');

    if (claimed && claimed.length > 0) {
      // 3. Prolongation de la licence du lot
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

      // Ligne d'audit si elle n'existait pas encore (paiement initié hors app)
      await supabaseAdmin.from('license_payments').upsert({
        fedapay_transaction_id: transactionId,
        user_lot_id: userLotId,
        license_type: licenseType,
        duree,
        montant,
        status: 'completed',
        payer_username: metadata?.payer ?? 'fedapay-webhook',
        created_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
      }, { onConflict: 'fedapay_transaction_id' });

      console.log(`✅ [webhook] Licence ${licenseType} activée pour le lot ${userLotId}`);
      return json({ received: true, renewed: true });
    }

    // Déjà traité (par le client au retour de paiement, par ex.)
    return json({ received: true, renewed: false, message: 'déjà traité' });
  } catch (error) {
    return json({ received: true, error: error?.message ?? 'Erreur inconnue' }, 500);
  }
});
