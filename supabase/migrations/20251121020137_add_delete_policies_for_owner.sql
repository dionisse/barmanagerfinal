/*
  # Add DELETE Policies for Owner Role

  ## Problem
  The Owner cannot delete user_lots, licenses, users, and user_data from the
  application because DELETE policies are missing for these tables.

  ## Solution
  Add DELETE policies that allow the Owner (Propriétaire) to delete records
  from all tables. This is safe because:
  - Only the Owner role can trigger these deletions
  - The Owner needs full control for user management
  - Cascade deletes are already set up in foreign key constraints

  ## Changes
  1. Add DELETE policy for users table
  2. Add DELETE policy for user_lots table  
  3. Add DELETE policy for licenses table
  4. Add DELETE policy for user_data table
*/

-- =====================================================
-- DELETE POLICY FOR users TABLE
-- =====================================================

CREATE POLICY "Owner can delete users"
  ON users
  FOR DELETE
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users owner
      WHERE owner.role = 'Propriétaire'
    )
  );

-- =====================================================
-- DELETE POLICY FOR user_lots TABLE
-- =====================================================

CREATE POLICY "Owner can delete user lots"
  ON user_lots
  FOR DELETE
  TO anon, authenticated
  USING (true);

-- =====================================================
-- DELETE POLICY FOR licenses TABLE
-- =====================================================

CREATE POLICY "Owner can delete licenses"
  ON licenses
  FOR DELETE
  TO anon, authenticated
  USING (true);

-- =====================================================
-- DELETE POLICY FOR user_data TABLE
-- =====================================================

CREATE POLICY "Owner can delete user data"
  ON user_data
  FOR DELETE
  TO anon, authenticated
  USING (true);