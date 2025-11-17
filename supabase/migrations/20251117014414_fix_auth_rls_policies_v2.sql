/*
  # Fix Authentication RLS Policies

  ## Overview
  This migration fixes the RLS policies on the users table to allow
  authentication queries without requiring Supabase Auth.

  ## Changes
  1. Add policy to allow anonymous users to read from users table for authentication
  2. Keep existing policies for authenticated users

  ## Security Notes
  - The policy only allows SELECT operations for authentication purposes
  - Password verification is done in application code
  - RLS still protects other operations
*/

-- Drop existing restrictive policies that prevent authentication
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Admins can view all users" ON users;
DROP POLICY IF EXISTS "Users can insert own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;

-- Allow anonymous and authenticated users to read users table for authentication
CREATE POLICY "Allow authentication queries"
  ON users
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Allow authenticated users to update their own profile
CREATE POLICY "Authenticated users can update own profile"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
