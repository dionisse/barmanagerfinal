// ============================================================================
// Edge Function : fedapay-checkout
// ============================================================================
// Crée une transaction FEDAPAY et renvoie l'URL de paiement sécurisée.
// La clé secrète FEDAPAY reste côté serveur (variable d'environnement
// FEDAPAY_SECRET_KEY + FEDAPAY_MODE) — elle n'est jamais exposée au client.
//
// Déploiement :
//   supabase secrets set FEDAPAY_SECRET_KEY=sk_live_xxx FEDAPAY_MODE=live
//   supabase functions deploy fedapay-checkout --no-verify-jwt
//
// Entrée (JSON) : payload de transaction FEDAPAY
//   { description, amount, currency:{iso:'XOF'}, callback_url, customer,
//     merchant_reference, custom_metadata:{user_lot_id, license_type, ...} }
// Sortie : { transactionId, paymentUrl }
// Requête { action: 'ping' } → { ok: true, message } (test de connexion).
// ============================================================================
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

const FEDAPAY_SECRET_KEY = Deno.env.get('FEDAPAY_SECRET_KEY') ?? '';
const FEDAPAY_MODE = Deno.env.get('FEDAPAY_MODE') ?? 'sandbox';
const API_BASE = FEDAPAY_MODE === 'live'
  ? 'https://api.fedapay.com/v1'
  : 'https://sandbox-api.fedapay.com/v1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function fedapayRequest(method: string, path: string, body?: unknown): Promise<any> {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      'Authorization': `Bearer ${FEDAPAY_SECRET_KEY}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json?.message || json?.v1?.message || `FEDAPAY HTTP ${res.status}`);
  }
  return json;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const payload = await req.json();

    // Simple test de connexion (bouton « Tester » des paramètres)
    if (payload?.action === 'ping') {
      if (!FEDAPAY_SECRET_KEY) {
        return new Response(
          JSON.stringify({ error: 'FEDAPAY_SECRET_KEY manquante (supabase secrets set FEDAPAY_SECRET_KEY=…)' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      return new Response(
        JSON.stringify({ ok: true, message: `Edge Function opérationnelle (mode ${FEDAPAY_MODE}).` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!FEDAPAY_SECRET_KEY) {
      return new Response(
        JSON.stringify({ error: 'FEDAPAY_SECRET_KEY manquante côté serveur' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 1. Créer la transaction
    const tx = await fedapayRequest('POST', '/transactions', payload);
    const transactionId = String(tx?.transaction?.id ?? tx?.id ?? '');
    if (!transactionId) throw new Error('Identifiant de transaction manquant');

    // 2. Générer le lien de paiement
    const tokenRes = await fedapayRequest('POST', `/transactions/${transactionId}/token`, {});
    const paymentUrl = tokenRes?.token?.url ?? tokenRes?.url ?? '';
    if (!paymentUrl) throw new Error('Lien de paiement introuvable');

    return new Response(
      JSON.stringify({ transactionId, paymentUrl }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error?.message ?? 'Erreur inconnue' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
