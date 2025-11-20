/*
  # Create User Group Data Isolation System

  ## Overview
  This migration creates a complete data isolation system where each user group 
  (Manager-Employee pair) has completely isolated data. User group A/B cannot 
  access or view data from user group C/D.

  ## New Tables

  ### 1. `user_lots` Table
  Represents a Manager-Employee user group pair
  - `id` (text, primary key) - Unique identifier for the user lot/group
  - `gestionnaire_username` (text, unique, not null) - Manager username
  - `gestionnaire_password` (text, not null) - Manager password (should be hashed)
  - `employe_username` (text, unique, not null) - Employee username
  - `employe_password` (text, not null) - Employee password (should be hashed)
  - `date_creation` (timestamptz, default now()) - Creation date
  - `status` (text, default 'active') - Status (active/suspended)

  ### 2. `licenses` Table
  Manages licenses for each user group
  - `id` (text, primary key) - Unique license identifier
  - `license_type` (text, not null) - Type of license (monthly/quarterly/annual)
  - `duree` (integer, not null) - Duration in months
  - `prix` (numeric, not null) - Price
  - `date_debut` (timestamptz, not null) - Start date
  - `date_fin` (timestamptz, not null) - End date
  - `cle` (text, unique, not null) - License key
  - `active` (boolean, default true) - Active status
  - `user_lot_id` (text, foreign key) - References user_lots.id
  - `created_at` (timestamptz, default now())

  ### 3. `user_data` Table
  Stores all business data for each user group (completely isolated)
  - `id` (uuid, primary key) - Unique identifier
  - `user_lot_id` (text, not null, foreign key) - References user_lots.id
  - `data` (jsonb, not null) - All business data (stocks, sales, purchases, etc.)
  - `last_sync` (timestamptz, default now()) - Last synchronization timestamp
  - `created_at` (timestamptz, default now())

  ## Security Implementation (CRITICAL)

  ### RLS Policies - user_lots table
  - Owner can view/manage ALL user lots (for administration)
  - Manager can only view their own user lot
  - Employee can only view their own user lot
  - No cross-group access allowed

  ### RLS Policies - licenses table
  - Owner can view/manage ALL licenses (for administration)
  - Manager/Employee can only view their own group's license
  - No cross-group license access

  ### RLS Policies - user_data table (MOST CRITICAL)
  - Owner: NO ACCESS to user_data (owner doesn't have business data)
  - Manager/Employee: Can ONLY access data where user_lot_id matches their group
  - STRICT ISOLATION: User group A cannot see user group B's data
  - All operations (SELECT, INSERT, UPDATE, DELETE) are restricted by user_lot_id

  ## Important Security Notes
  - Each user belongs to exactly ONE user_lot_id (their group)
  - All data operations MUST filter by user_lot_id
  - The system enforces complete data isolation at the database level
  - Even if application code has bugs, RLS prevents cross-group data access
*/

-- =====================================================
-- CREATE TABLES
-- =====================================================

-- Create user_lots table (Manager-Employee groups)
CREATE TABLE IF NOT EXISTS user_lots (
  id text PRIMARY KEY,
  gestionnaire_username text UNIQUE NOT NULL,
  gestionnaire_password text NOT NULL,
  employe_username text UNIQUE NOT NULL,
  employe_password text NOT NULL,
  date_creation timestamptz DEFAULT now(),
  status text DEFAULT 'active' CHECK (status IN ('active', 'suspended'))
);

-- Create licenses table
CREATE TABLE IF NOT EXISTS licenses (
  id text PRIMARY KEY,
  license_type text NOT NULL CHECK (license_type IN ('monthly', 'quarterly', 'annual')),
  duree integer NOT NULL CHECK (duree > 0),
  prix numeric NOT NULL CHECK (prix >= 0),
  date_debut timestamptz NOT NULL,
  date_fin timestamptz NOT NULL,
  cle text UNIQUE NOT NULL,
  active boolean DEFAULT true,
  user_lot_id text NOT NULL REFERENCES user_lots(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT valid_dates CHECK (date_fin > date_debut)
);

-- Create user_data table (stores all business data per user group)
CREATE TABLE IF NOT EXISTS user_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_lot_id text NOT NULL REFERENCES user_lots(id) ON DELETE CASCADE,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_sync timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_lot_id)
);

-- Add user_lot_id column to existing users table if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'user_lot_id'
  ) THEN
    ALTER TABLE users ADD COLUMN user_lot_id text REFERENCES user_lots(id);
  END IF;
END $$;

-- =====================================================
-- ENABLE ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE user_lots ENABLE ROW LEVEL SECURITY;
ALTER TABLE licenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_data ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES FOR user_lots TABLE
-- =====================================================

-- Owner can manage all user lots (for license management)
CREATE POLICY "Owner can manage all user lots"
  ON user_lots
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.username = current_user
      AND users.role = 'Propriétaire'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.username = current_user
      AND users.role = 'Propriétaire'
    )
  );

-- Manager can view own user lot only
CREATE POLICY "Manager can view own user lot"
  ON user_lots
  FOR SELECT
  TO authenticated
  USING (
    gestionnaire_username = current_user
    OR employe_username = current_user
  );

-- =====================================================
-- RLS POLICIES FOR licenses TABLE
-- =====================================================

-- Owner can manage all licenses
CREATE POLICY "Owner can manage all licenses"
  ON licenses
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.username = current_user
      AND users.role = 'Propriétaire'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.username = current_user
      AND users.role = 'Propriétaire'
    )
  );

-- Manager/Employee can view their own group's license
CREATE POLICY "Users can view own group license"
  ON licenses
  FOR SELECT
  TO authenticated
  USING (
    user_lot_id IN (
      SELECT id FROM user_lots
      WHERE gestionnaire_username = current_user
      OR employe_username = current_user
    )
  );

-- =====================================================
-- RLS POLICIES FOR user_data TABLE (CRITICAL)
-- =====================================================

-- Manager/Employee can SELECT their own group's data ONLY
CREATE POLICY "Users can view own group data"
  ON user_data
  FOR SELECT
  TO authenticated
  USING (
    user_lot_id IN (
      SELECT id FROM user_lots
      WHERE gestionnaire_username = current_user
      OR employe_username = current_user
    )
  );

-- Manager/Employee can INSERT for their own group ONLY
CREATE POLICY "Users can insert own group data"
  ON user_data
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_lot_id IN (
      SELECT id FROM user_lots
      WHERE gestionnaire_username = current_user
      OR employe_username = current_user
    )
  );

-- Manager/Employee can UPDATE their own group's data ONLY
CREATE POLICY "Users can update own group data"
  ON user_data
  FOR UPDATE
  TO authenticated
  USING (
    user_lot_id IN (
      SELECT id FROM user_lots
      WHERE gestionnaire_username = current_user
      OR employe_username = current_user
    )
  )
  WITH CHECK (
    user_lot_id IN (
      SELECT id FROM user_lots
      WHERE gestionnaire_username = current_user
      OR employe_username = current_user
    )
  );

-- Manager/Employee can DELETE their own group's data ONLY
CREATE POLICY "Users can delete own group data"
  ON user_data
  FOR DELETE
  TO authenticated
  USING (
    user_lot_id IN (
      SELECT id FROM user_lots
      WHERE gestionnaire_username = current_user
      OR employe_username = current_user
    )
  );

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_user_lots_gestionnaire ON user_lots(gestionnaire_username);
CREATE INDEX IF NOT EXISTS idx_user_lots_employe ON user_lots(employe_username);
CREATE INDEX IF NOT EXISTS idx_user_lots_status ON user_lots(status);

CREATE INDEX IF NOT EXISTS idx_licenses_user_lot_id ON licenses(user_lot_id);
CREATE INDEX IF NOT EXISTS idx_licenses_active ON licenses(active);
CREATE INDEX IF NOT EXISTS idx_licenses_date_fin ON licenses(date_fin);

CREATE INDEX IF NOT EXISTS idx_user_data_user_lot_id ON user_data(user_lot_id);
CREATE INDEX IF NOT EXISTS idx_user_data_last_sync ON user_data(last_sync);

CREATE INDEX IF NOT EXISTS idx_users_user_lot_id ON users(user_lot_id);
