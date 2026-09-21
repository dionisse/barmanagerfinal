-- ============================================================================
-- FIX_MISSING_COLUMNS.sql - Correction erreur bar_address manquant
-- Erreur: Could not find the 'bar_address' column of 'user_lots' in schema cache
-- À exécuter dans Supabase > SQL Editor > New Query > Run
-- ============================================================================

-- 1. Ajoute les colonnes manquantes à user_lots (idempotent)
ALTER TABLE user_lots ADD COLUMN IF NOT EXISTS bar_name TEXT;
ALTER TABLE user_lots ADD COLUMN IF NOT EXISTS bar_address TEXT;
ALTER TABLE user_lots ADD COLUMN IF NOT EXISTS manager_fullname TEXT;
ALTER TABLE user_lots ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE user_lots ADD COLUMN IF NOT EXISTS whatsapp TEXT;
ALTER TABLE user_lots ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE user_lots ADD COLUMN IF NOT EXISTS is_trial BOOLEAN DEFAULT false;
ALTER TABLE user_lots ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;
ALTER TABLE user_lots ADD COLUMN IF NOT EXISTS registration_status TEXT DEFAULT 'active';

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_user_lots_bar_name ON user_lots(bar_name);
CREATE INDEX IF NOT EXISTS idx_user_lots_email ON user_lots(email);
CREATE INDEX IF NOT EXISTS idx_user_lots_phone ON user_lots(phone);
CREATE INDEX IF NOT EXISTS idx_user_lots_whatsapp ON user_lots(whatsapp);
CREATE INDEX IF NOT EXISTS idx_user_lots_is_trial ON user_lots(is_trial);

-- 2. Licenses : autorise type Essai + ajoute is_trial
ALTER TABLE licenses DROP CONSTRAINT IF EXISTS licenses_license_type_check;
ALTER TABLE licenses ADD CONSTRAINT licenses_license_type_check 
  CHECK (license_type IN ('Kpêvi', 'Kléoun', 'Agbon', 'Baba', 'Essai'));

ALTER TABLE licenses ADD COLUMN IF NOT EXISTS is_trial BOOLEAN DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_licenses_is_trial ON licenses(is_trial);

-- 3. Users : ajoute colonnes modernes si ancien schéma
ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS user_lot_id UUID REFERENCES user_lots(id) ON DELETE CASCADE;

-- Si ancien schéma utilise 'type' au lieu de 'role', on garde les deux
-- Pour compatibilité, on crée une vue ou on laisse les deux colonnes

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_user_lot_id ON users(user_lot_id);

-- 4. Tables manquantes pour inscription complète
CREATE TABLE IF NOT EXISTS bar_profiles (
  id TEXT PRIMARY KEY,
  user_lot_id UUID REFERENCES user_lots(id) ON DELETE CASCADE,
  bar_name TEXT NOT NULL,
  bar_address TEXT NOT NULL,
  manager_fullname TEXT NOT NULL,
  phone TEXT NOT NULL,
  whatsapp TEXT NOT NULL,
  email TEXT NOT NULL,
  username TEXT NOT NULL,
  is_trial BOOLEAN DEFAULT true,
  trial_ends_at TIMESTAMPTZ,
  registration_status TEXT DEFAULT 'active',
  verified_at TIMESTAMPTZ,
  date_creation TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bar_profiles_user_lot_id ON bar_profiles(user_lot_id);

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

CREATE TABLE IF NOT EXISTS login_attempts (
  username TEXT PRIMARY KEY,
  attempts INTEGER DEFAULT 0,
  last_attempt TIMESTAMPTZ DEFAULT NOW(),
  locked_until TIMESTAMPTZ,
  lock_count INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS password_resets (
  id TEXT PRIMARY KEY,
  identifier TEXT NOT NULL,
  code TEXT NOT NULL,
  token TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. RLS permissif pour anon (nécessaire pour inscription directe sans auth)
ALTER TABLE user_lots ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_user_lots" ON user_lots;
CREATE POLICY "allow_all_user_lots" ON user_lots FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

ALTER TABLE licenses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_licenses" ON licenses;
CREATE POLICY "allow_all_licenses" ON licenses FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_users" ON users;
CREATE POLICY "allow_all_users" ON users FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

ALTER TABLE bar_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_bar_profiles" ON bar_profiles;
CREATE POLICY "allow_all_bar_profiles" ON bar_profiles FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

ALTER TABLE verification_codes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_verification_codes" ON verification_codes;
CREATE POLICY "allow_all_verification_codes" ON verification_codes FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

ALTER TABLE login_attempts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_login_attempts" ON login_attempts;
CREATE POLICY "allow_all_login_attempts" ON login_attempts FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

ALTER TABLE password_resets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_password_resets" ON password_resets;
CREATE POLICY "allow_all_password_resets" ON password_resets FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 6. Rafraîchit le cache PostgREST (important après ALTER)
NOTIFY pgrst, 'reload schema';

-- Vérification finale
SELECT 'user_lots columns' as table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'user_lots' 
ORDER BY column_name;

SELECT 'licenses constraints' as check_name, conname, pg_get_constraintdef(oid)
FROM pg_constraint 
WHERE conrelid = 'licenses'::regclass;

SELECT 'Fix terminé - vous pouvez maintenant créer un compte' as status;
