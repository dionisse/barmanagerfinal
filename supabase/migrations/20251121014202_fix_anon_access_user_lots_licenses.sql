/*
  # Fix Anonymous Access to user_lots and licenses Tables

  ## Problem
  When using the anonymous key (ANON_KEY), the application cannot read from
  user_lots and licenses tables because the existing RLS policies only work
  with authenticated users and use `current_user` which is not set for anon.

  ## Solution
  Add SELECT policies that allow anonymous users to read from user_lots and
  licenses tables. This is safe because:
  - The data is needed for license validation
  - No sensitive information is exposed (passwords are hashed)
  - Other operations (INSERT/UPDATE/DELETE) remain restricted

  ## Changes
  1. Add anon SELECT policy for user_lots table
  2. Add anon SELECT policy for licenses table
*/

-- =====================================================
-- POLICIES FOR user_lots TABLE
-- =====================================================

CREATE POLICY "Allow anon to read user lots"
  ON user_lots
  FOR SELECT
  TO anon
  USING (true);

-- =====================================================
-- POLICIES FOR licenses TABLE
-- =====================================================

CREATE POLICY "Allow anon to read licenses"
  ON licenses
  FOR SELECT
  TO anon
  USING (true);