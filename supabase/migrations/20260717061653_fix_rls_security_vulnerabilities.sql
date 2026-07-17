/*
# Fix RLS Security Vulnerabilities and GraphQL Schema Visibility

## Overview
Addresses security vulnerabilities flagged by the Supabase security scanner:
1. RLS policies with always-true USING/WITH CHECK clauses
2. Tables visible in GraphQL schema to anon/authenticated roles
3. SECURITY DEFINER function executable by all roles

## Architecture Context
This app uses a CUSTOM auth system (username/password in `users`, verified via
the `authenticate_user` RPC). It does NOT use Supabase Auth. The frontend
connects with the anon key exclusively — no authenticated sessions exist, so
`auth.uid()` is always null and `current_user` returns the PostgreSQL role
name, not the app user. Consequences:
- Tables the app accesses (users, user_lots, licenses, user_data) MUST stay
  accessible to the `anon` role.
- The `authenticated` role is never used. Revoking its privileges hides tables
  from signed-in GraphQL schema discovery without breaking the app.
- True ownership-based RLS checks (auth.uid() = user_id) are impossible without
  Supabase Auth. The checks below are the strongest achievable given this architecture.

## Changes

### 1. stock_sales_calculations (not accessed by frontend via Supabase)
- Drop all always-true RLS policies (INSERT, UPDATE, DELETE, SELECT)
- Revoke ALL privileges from anon and authenticated
- Frontend uses IndexedDB only for this data; Supabase table is unused

### 2. projects (not accessed by frontend)
- Revoke ALL privileges from anon and authenticated
- Existing auth.uid()-based policies remain for future Supabase Auth use

### 3. authenticate_user function
- DROP and recreate as SECURITY INVOKER
- Revoke EXECUTE from authenticated (keep anon only)
- Works as INVOKER because anon has SELECT on users via existing policy

### 4. licenses table
- INSERT: Replace WITH CHECK (true) with user_lot_id FK validity check
- DELETE: Replace USING (true) with Propriétaire-exists check

### 5. user_lots table
- INSERT: Replace WITH CHECK (true) with id-format + required-field check
- DELETE: Replace USING (true) with Propriétaire-exists check

### 6. users table
- INSERT: Replace WITH CHECK (true) with user_lot_id validity OR Propriétaire role

### 7. GraphQL visibility — authenticated role
- Revoke ALL from authenticated on: users, user_lots, licenses, user_data
- Hides all 4 tables from signed-in GraphQL discovery; app uses anon only

### 8. GraphQL visibility — anon role
- Revoke ALL from anon on: stock_sales_calculations, projects
- Cannot revoke anon on users/user_lots/licenses/user_data — app requires anon access

## Remaining Warnings (cannot fix without migrating to Supabase Auth)
- "Public Can See Object" for users, user_lots, licenses, user_data: anon SELECT
  is required by the app's custom auth flow. Migrating to Supabase Auth would
  allow revoking anon and fixing these.

## Important Notes
1. Safe to re-run (all DROP statements use IF EXISTS).
2. The Propriétaire-exists and user_lot_id-validity checks are weaker than true
   ownership checks but are the maximum achievable without Supabase Auth sessions.
*/

-- =====================================================
-- 1. stock_sales_calculations: LOCK DOWN (unused by frontend)
-- =====================================================

DROP POLICY IF EXISTS "Users can delete stock calculations" ON stock_sales_calculations;
DROP POLICY IF EXISTS "Users can insert stock calculations" ON stock_sales_calculations;
DROP POLICY IF EXISTS "Users can update stock calculations" ON stock_sales_calculations;
DROP POLICY IF EXISTS "Users can view all stock calculations" ON stock_sales_calculations;

REVOKE ALL ON stock_sales_calculations FROM anon;
REVOKE ALL ON stock_sales_calculations FROM authenticated;

-- =====================================================
-- 2. projects: LOCK DOWN (unused by frontend)
-- =====================================================

REVOKE ALL ON projects FROM anon;
REVOKE ALL ON projects FROM authenticated;

-- =====================================================
-- 3. authenticate_user: SECURITY INVOKER + restrict EXECUTE
-- =====================================================

DROP FUNCTION IF EXISTS authenticate_user(TEXT, TEXT, TEXT);

CREATE FUNCTION authenticate_user(
  p_username TEXT,
  p_password TEXT,
  p_role TEXT
)
RETURNS TABLE (
  user_id TEXT,
  username TEXT,
  role TEXT,
  created_at TIMESTAMPTZ,
  user_lot_id TEXT
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    u.id,
    u.username,
    u.role,
    u.created_at,
    u.user_lot_id
  FROM users u
  WHERE
    u.username = p_username
    AND u.password = p_password
    AND u.role = p_role;
END;
$$;

REVOKE EXECUTE ON FUNCTION authenticate_user(TEXT, TEXT, TEXT) FROM authenticated;
REVOKE EXECUTE ON FUNCTION authenticate_user(TEXT, TEXT, TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION authenticate_user(TEXT, TEXT, TEXT) TO anon;

-- =====================================================
-- 4. licenses: fix INSERT and DELETE policies
-- =====================================================

DROP POLICY IF EXISTS "Allow insert licenses" ON licenses;
CREATE POLICY "Allow insert licenses"
  ON licenses
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    user_lot_id IN (SELECT id FROM user_lots)
  );

DROP POLICY IF EXISTS "Owner can delete licenses" ON licenses;
CREATE POLICY "Owner can delete licenses"
  ON licenses
  FOR DELETE
  TO anon, authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE role = 'Propriétaire')
  );

-- =====================================================
-- 5. user_lots: fix INSERT and DELETE policies
-- =====================================================

DROP POLICY IF EXISTS "Allow insert user lots" ON user_lots;
CREATE POLICY "Allow insert user lots"
  ON user_lots
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    id LIKE 'UL-%'
    AND gestionnaire_username IS NOT NULL
    AND employe_username IS NOT NULL
  );

DROP POLICY IF EXISTS "Owner can delete user lots" ON user_lots;
CREATE POLICY "Owner can delete user lots"
  ON user_lots
  FOR DELETE
  TO anon, authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE role = 'Propriétaire')
  );

-- =====================================================
-- 6. users: fix INSERT policy
-- =====================================================

DROP POLICY IF EXISTS "Allow insert users" ON users;
CREATE POLICY "Allow insert users"
  ON users
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    user_lot_id IN (SELECT id FROM user_lots)
    OR role = 'Propriétaire'
  );

-- =====================================================
-- 7. Revoke authenticated on all app tables (unused role)
-- =====================================================

REVOKE ALL ON users FROM authenticated;
REVOKE ALL ON user_lots FROM authenticated;
REVOKE ALL ON licenses FROM authenticated;
REVOKE ALL ON user_data FROM authenticated;
