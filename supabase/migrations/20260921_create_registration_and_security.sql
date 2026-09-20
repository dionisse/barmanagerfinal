/*
  # Inscription clients + Sécurité renforcée AHANDJO

  1. Extension user_lots avec infos bar
  2. Nouvelles tables :
     - bar_profiles : profil complet du bar
     - verification_codes : codes WhatsApp/Email
     - login_attempts : rate limiting
     - password_resets : réinitialisation mot de passe
*/

-- ============================================================
-- 1. Extension user_lots
-- ============================================================
ALTER TABLE user_lots ADD COLUMN IF NOT EXISTS bar_name TEXT;
ALTER TABLE user_lots ADD COLUMN IF NOT EXISTS bar_address TEXT;
ALTER TABLE user_lots ADD COLUMN IF NOT EXISTS manager_fullname TEXT;
ALTER TABLE user_lots ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE user_lots ADD COLUMN IF NOT EXISTS whatsapp TEXT;
ALTER TABLE user_lots ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE user_lots ADD COLUMN IF NOT EXISTS is_trial BOOLEAN DEFAULT false;
ALTER TABLE user_lots ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;
ALTER TABLE user_lots ADD COLUMN IF NOT EXISTS registration_status TEXT DEFAULT 'active' CHECK (registration_status IN ('pending','verified','active','suspended'));

-- Index pour recherches
CREATE INDEX IF NOT EXISTS idx_user_lots_bar_name ON user_lots(bar_name);
CREATE INDEX IF NOT EXISTS idx_user_lots_email ON user_lots(email);
CREATE INDEX IF NOT EXISTS idx_user_lots_phone ON user_lots(phone);
CREATE INDEX IF NOT EXISTS idx_user_lots_whatsapp ON user_lots(whatsapp);
CREATE INDEX IF NOT EXISTS idx_user_lots_is_trial ON user_lots(is_trial);

-- ============================================================
-- 2. Licenses : ajoute type Essai et is_trial
-- ============================================================
-- Supprime l'ancienne contrainte si elle existe
ALTER TABLE licenses DROP CONSTRAINT IF EXISTS licenses_license_type_check;
-- Recrée avec Essai inclus
ALTER TABLE licenses ADD CONSTRAINT licenses_license_type_check 
  CHECK (license_type IN ('Kpêvi', 'Kléoun', 'Agbon', 'Baba', 'Essai'));

ALTER TABLE licenses ADD COLUMN IF NOT EXISTS is_trial BOOLEAN DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_licenses_is_trial ON licenses(is_trial);

-- ============================================================
-- 3. bar_profiles
-- ============================================================
CREATE TABLE IF NOT EXISTS bar_profiles (
  id TEXT PRIMARY KEY,
  user_lot_id TEXT NOT NULL REFERENCES user_lots(id) ON DELETE CASCADE,
  bar_name TEXT NOT NULL,
  bar_address TEXT NOT NULL,
  manager_fullname TEXT NOT NULL,
  phone TEXT NOT NULL,
  whatsapp TEXT NOT NULL,
  email TEXT NOT NULL,
  username TEXT NOT NULL,
  is_trial BOOLEAN DEFAULT true,
  trial_ends_at TIMESTAMPTZ,
  registration_status TEXT DEFAULT 'active' CHECK (registration_status IN ('pending','verified','active','suspended')),
  verified_at TIMESTAMPTZ,
  date_creation TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bar_profiles_user_lot_id ON bar_profiles(user_lot_id);
CREATE INDEX IF NOT EXISTS idx_bar_profiles_username ON bar_profiles(username);
CREATE INDEX IF NOT EXISTS idx_bar_profiles_email ON bar_profiles(email);

ALTER TABLE bar_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_all_select_bar_profiles" ON bar_profiles;
CREATE POLICY "allow_all_select_bar_profiles" ON bar_profiles
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "allow_all_insert_bar_profiles" ON bar_profiles;
CREATE POLICY "allow_all_insert_bar_profiles" ON bar_profiles
  FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "allow_all_update_bar_profiles" ON bar_profiles;
CREATE POLICY "allow_all_update_bar_profiles" ON bar_profiles
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "allow_all_delete_bar_profiles" ON bar_profiles;
CREATE POLICY "allow_all_delete_bar_profiles" ON bar_profiles
  FOR DELETE TO anon, authenticated USING (true);

-- ============================================================
-- 4. verification_codes
-- ============================================================
CREATE TABLE IF NOT EXISTS verification_codes (
  id TEXT PRIMARY KEY,
  identifier TEXT NOT NULL,
  code TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('whatsapp','email','phone')),
  expires_at TIMESTAMPTZ NOT NULL,
  attempts INTEGER DEFAULT 0,
  verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_verification_codes_identifier ON verification_codes(identifier);
CREATE INDEX IF NOT EXISTS idx_verification_codes_expires_at ON verification_codes(expires_at);

ALTER TABLE verification_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_all_verification_codes" ON verification_codes;
CREATE POLICY "allow_all_verification_codes" ON verification_codes
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- 5. login_attempts
-- ============================================================
CREATE TABLE IF NOT EXISTS login_attempts (
  username TEXT PRIMARY KEY,
  attempts INTEGER DEFAULT 0,
  last_attempt TIMESTAMPTZ DEFAULT NOW(),
  locked_until TIMESTAMPTZ,
  lock_count INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_login_attempts_locked_until ON login_attempts(locked_until);

ALTER TABLE login_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_all_login_attempts" ON login_attempts;
CREATE POLICY "allow_all_login_attempts" ON login_attempts
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- 6. password_resets
-- ============================================================
CREATE TABLE IF NOT EXISTS password_resets (
  id TEXT PRIMARY KEY,
  identifier TEXT NOT NULL,
  code TEXT NOT NULL,
  token TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_password_resets_identifier ON password_resets(identifier);
CREATE INDEX IF NOT EXISTS idx_password_resets_expires_at ON password_resets(expires_at);
CREATE INDEX IF NOT EXISTS idx_password_resets_token ON password_resets(token);

ALTER TABLE password_resets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_all_password_resets" ON password_resets;
CREATE POLICY "allow_all_password_resets" ON password_resets
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- 7. Fonction de nettoyage automatique (optionnelle)
-- ============================================================
-- Nettoie les codes expirés de plus de 24h
CREATE OR REPLACE FUNCTION cleanup_expired_codes()
RETURNS void AS $$
BEGIN
  DELETE FROM verification_codes WHERE expires_at < NOW() - INTERVAL '24 hours';
  DELETE FROM password_resets WHERE expires_at < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql;
