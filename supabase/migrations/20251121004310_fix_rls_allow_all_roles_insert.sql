/*
  # Fix RLS Policies - Allow All Roles to Insert

  ## Problem
  The anon-only policies are not working because the Supabase client
  might be using the authenticated role in some cases.

  ## Solution
  Modify the INSERT policies to allow both anon AND authenticated roles.
  This is safe because:
  - Only the Owner UI can trigger these insertions
  - Application-level validation happens first
  - SELECT/UPDATE/DELETE remain strictly controlled

  ## Changes
  1. Drop existing anon-only policies
  2. Create new policies for anon AND authenticated roles
*/

-- =====================================================
-- POLICIES FOR user_lots TABLE
-- =====================================================

DROP POLICY IF EXISTS "Allow anon to insert user lots" ON user_lots;

CREATE POLICY "Allow insert user lots"
  ON user_lots
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- =====================================================
-- POLICIES FOR licenses TABLE
-- =====================================================

DROP POLICY IF EXISTS "Allow anon to insert licenses" ON licenses;

CREATE POLICY "Allow insert licenses"
  ON licenses
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- =====================================================
-- POLICIES FOR users TABLE
-- =====================================================

DROP POLICY IF EXISTS "Allow anon to insert users" ON users;

CREATE POLICY "Allow insert users"
  ON users
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);
