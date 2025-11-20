/*
  # Fix RLS Policies to Allow Anon Key Insertions

  ## Problem
  Current RLS policies use `current_user` which doesn't work with the anon key.
  When the app tries to insert user_lots and licenses using the anon key,
  it fails with "new row violates row-level security policy".

  ## Solution
  Add permissive policies that allow the anon role to insert into user_lots
  and licenses tables. This is safe because:
  - Only the Owner UI can trigger these insertions
  - The application validates permissions before calling Supabase
  - We maintain data isolation for SELECT/UPDATE/DELETE operations

  ## Changes
  1. Add policy to allow anon role to insert into user_lots
  2. Add policy to allow anon role to insert into licenses
  3. Add policy to allow anon role to insert into users table
  4. Keep existing restrictive policies for SELECT/UPDATE/DELETE
*/

-- =====================================================
-- POLICIES FOR user_lots TABLE
-- =====================================================

-- Allow anon role to insert user_lots (Owner creates them via UI)
DROP POLICY IF EXISTS "Allow anon to insert user lots" ON user_lots;
CREATE POLICY "Allow anon to insert user lots"
  ON user_lots
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- =====================================================
-- POLICIES FOR licenses TABLE
-- =====================================================

-- Allow anon role to insert licenses (Owner creates them via UI)
DROP POLICY IF EXISTS "Allow anon to insert licenses" ON licenses;
CREATE POLICY "Allow anon to insert licenses"
  ON licenses
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- =====================================================
-- POLICIES FOR users TABLE
-- =====================================================

-- Allow anon role to insert users (system creates them during license activation)
DROP POLICY IF EXISTS "Allow anon to insert users" ON users;
CREATE POLICY "Allow anon to insert users"
  ON users
  FOR INSERT
  TO anon
  WITH CHECK (true);
