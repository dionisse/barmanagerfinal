-- Fix RLS policies for Supabase
-- This migration corrects the UUID to TEXT comparison issue in RLS policies

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Allow authenticated users to insert user_data" ON user_data;
DROP POLICY IF EXISTS "Allow authenticated users to update user_data" ON user_data;

-- Create new policies with proper type casting
CREATE POLICY "Allow authenticated users to insert user_data" ON user_data
    FOR INSERT TO authenticated WITH CHECK ((auth.uid())::text = user_id);

CREATE POLICY "Allow authenticated users to update user_data" ON user_data
    FOR UPDATE TO authenticated USING ((auth.uid())::text = user_id);

-- Add anon policies for testing
CREATE POLICY "Allow anonymous read access to user_data" ON user_data
    FOR SELECT TO anon USING (true);

CREATE POLICY "Allow anonymous insert to user_data" ON user_data
    FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow anonymous update to user_data" ON user_data
    FOR UPDATE TO anon USING (true);

-- Add anon policies for other tables
CREATE POLICY "Allow anonymous read access to user_lots" ON user_lots
    FOR SELECT TO anon USING (true);

CREATE POLICY "Allow anonymous insert to user_lots" ON user_lots
    FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow anonymous update to user_lots" ON user_lots
    FOR UPDATE TO anon USING (true);

CREATE POLICY "Allow anonymous read access to licenses" ON licenses
    FOR SELECT TO anon USING (true);

CREATE POLICY "Allow anonymous insert to licenses" ON licenses
    FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow anonymous update to licenses" ON licenses
    FOR UPDATE TO anon USING (true);

CREATE POLICY "Allow anonymous read access to users" ON users
    FOR SELECT TO anon USING (true);

CREATE POLICY "Allow anonymous insert to users" ON users
    FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow anonymous update to users" ON users
    FOR UPDATE TO anon USING (true);

-- Ensure owner user exists
INSERT INTO users (id, username, password, type)
VALUES ('owner-001', 'gobexpropriétaire', 'Ffreddy75@@7575xyzDistribpro2025', 'Propriétaire')
ON CONFLICT (id) DO NOTHING;