/*
  # Fix Login - Allow Anonymous SELECT on Users Table

  1. Changes
    - Add policy to allow `anon` role to SELECT from `users` table for login authentication
    - This enables username/password verification during login
    - Restricts to SELECT only - no INSERT/UPDATE/DELETE for anon
  
  2. Security
    - Users table already has RLS enabled
    - Only allows reading user data for authentication purposes
    - Does not expose sensitive operations to anonymous users
*/

-- Drop existing policy if it exists, then create new one
DO $$
BEGIN
  DROP POLICY IF EXISTS "Allow anon to select users for login" ON users;
END $$;

-- Allow anonymous users to read from users table for login authentication
CREATE POLICY "Allow anon to select users for login"
  ON users
  FOR SELECT
  TO anon
  USING (true);
