/*
  # Paiements de licences FEDAPAY + configuration plateforme AHANDJO

  ## Tables
  1. license_payments : audit et idempotence des renouvellements payés en ligne.
     La contrainte UNIQUE sur fedapay_transaction_id garantit qu'un paiement
     FEDAPAY ne peut activer qu'une seule licence (verrou d'idempotence partagé
     entre le client et le webhook FEDAPAY).
  2. platform_settings : configuration clé/valeur partagée entre appareils
     (clé 'fedapay' → { mode, secretKey, publicKey, edgeFunctionUrl }).

  ## RLS
  Politiques permissives pour anon/authenticated, cohérentes avec le reste du
  projet (application client-only utilisant la clé anon Supabase).
  NOTE SÉCURITÉ : pour une sécurité maximale, ne pas stocker la clé secrète
  FEDAPAY ici — utiliser les Edge Functions (supabase/functions/) et laisser
  platform_settings vide. Voir FEDAPAY_SETUP.md.
*/

-- ============================================================
-- 1. Paiements de licences (FEDAPAY)
-- ============================================================
CREATE TABLE IF NOT EXISTS license_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fedapay_transaction_id VARCHAR(255) NOT NULL UNIQUE,
    user_lot_id VARCHAR(255) NOT NULL,
    license_type VARCHAR(50) NOT NULL,          -- Kpêvi / Kléoun / Agbon / Baba
    duree INTEGER NOT NULL,                     -- durée en mois
    montant DECIMAL(10,2) NOT NULL,             -- montant payé en FCFA
    status VARCHAR(20) NOT NULL DEFAULT 'pending',  -- pending | completed | failed | canceled
    payer_username VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    CONSTRAINT license_payments_status_check CHECK (status IN ('pending', 'completed', 'failed', 'canceled'))
);

-- Index pour les consultations par lot / statut
CREATE INDEX IF NOT EXISTS idx_license_payments_lot ON license_payments(user_lot_id);
CREATE INDEX IF NOT EXISTS idx_license_payments_status ON license_payments(status);
CREATE INDEX IF NOT EXISTS idx_license_payments_created_at ON license_payments(created_at DESC);

ALTER TABLE license_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_all_select_license_payments" ON license_payments
    FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "allow_all_insert_license_payments" ON license_payments
    FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "allow_all_update_license_payments" ON license_payments
    FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- 2. Configuration plateforme (clé/valeur)
-- ============================================================
CREATE TABLE IF NOT EXISTS platform_settings (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_all_select_platform_settings" ON platform_settings
    FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "allow_all_insert_platform_settings" ON platform_settings
    FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "allow_all_update_platform_settings" ON platform_settings
    FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);