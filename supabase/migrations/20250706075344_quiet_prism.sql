-- GOBEX Database Schema for Supabase
-- Version: 2.0.1
-- Description: Improved schema for GOBEX cloud synchronization with error fixes

/*
# Complete GOBEX Database Schema

1. New Tables
   - `user_lots`: Stores pairs of users (manager + employee) that share a license
   - `licenses`: Stores license information linked to user lots
   - `users`: Individual users linked to user lots
   - `user_data`: Stores synchronized application data for each user

2. Security
   - Enable RLS on all tables
   - Add policies for anonymous access for testing
   - Fix UUID to TEXT comparison in RLS policies

3. Changes
   - Use TEXT type for all ID fields for consistency
   - Add proper indexes for performance
   - Include owner user creation
*/

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- User Lots Table
-- Stores pairs of users (gestionnaire + employé) that share a license
CREATE TABLE IF NOT EXISTS user_lots (
    id TEXT PRIMARY KEY,
    gestionnaire_username TEXT NOT NULL,
    gestionnaire_password TEXT NOT NULL,
    employe_username TEXT NOT NULL,
    employe_password TEXT NOT NULL,
    date_creation TIMESTAMPTZ DEFAULT NOW(),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Licenses Table
-- Stores license information linked to user lots
CREATE TABLE IF NOT EXISTS licenses (
    id TEXT PRIMARY KEY,
    license_type TEXT NOT NULL CHECK (license_type IN ('Kpêvi', 'Kléoun', 'Agbon', 'Baba')),
    duree INTEGER NOT NULL, -- Duration in months
    prix DECIMAL(10,2) NOT NULL,
    date_debut DATE NOT NULL,
    date_fin DATE NOT NULL,
    cle TEXT NOT NULL UNIQUE, -- License key
    active BOOLEAN DEFAULT true,
    user_lot_id TEXT REFERENCES user_lots(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users Table
-- Individual users linked to user lots
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('Gestionnaire', 'Employé', 'Propriétaire')),
    date_creation TIMESTAMPTZ DEFAULT NOW(),
    user_lot_id TEXT REFERENCES user_lots(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Data Table
-- Stores synchronized application data for each user
CREATE TABLE IF NOT EXISTS user_data (
    user_id TEXT PRIMARY KEY,
    data JSONB NOT NULL, -- All application data stored as JSON
    last_sync TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_lots_usernames ON user_lots(gestionnaire_username, employe_username);
CREATE INDEX IF NOT EXISTS idx_licenses_user_lot_id ON licenses(user_lot_id);
CREATE INDEX IF NOT EXISTS idx_licenses_active ON licenses(active);
CREATE INDEX IF NOT EXISTS idx_licenses_date_fin ON licenses(date_fin);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_user_lot_id ON users(user_lot_id);
CREATE INDEX IF NOT EXISTS idx_user_data_user_id ON user_data(user_id);
CREATE INDEX IF NOT EXISTS idx_user_data_last_sync ON user_data(last_sync);

-- Trigger to automatically update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_lots_updated_at BEFORE UPDATE ON user_lots FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_licenses_updated_at BEFORE UPDATE ON licenses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_data_updated_at BEFORE UPDATE ON user_data FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to get all tables (for diagnostic purposes)
CREATE OR REPLACE FUNCTION get_tables()
RETURNS TABLE (table_name TEXT) AS $$
BEGIN
    RETURN QUERY
    SELECT t.table_name::TEXT
    FROM information_schema.tables t
    WHERE t.table_schema = 'public';
END;
$$ LANGUAGE plpgsql;

-- Enable Row Level Security (RLS)
ALTER TABLE user_lots ENABLE ROW LEVEL SECURITY;
ALTER TABLE licenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_data ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Allow anonymous access for testing
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

CREATE POLICY "Allow anonymous read access to user_data" ON user_data
    FOR SELECT TO anon USING (true);

CREATE POLICY "Allow anonymous insert to user_data" ON user_data
    FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow anonymous update to user_data" ON user_data
    FOR UPDATE TO anon USING (true);

-- Allow authenticated users to read all data
CREATE POLICY "Allow authenticated users to read user_lots" ON user_lots
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to read licenses" ON licenses
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to read users" ON users
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to read user_data" ON user_data
    FOR SELECT TO authenticated USING (true);

-- Allow authenticated users to insert/update their own data
-- Note the type casting to fix the UUID comparison issue
CREATE POLICY "Allow authenticated users to insert user_data" ON user_data
    FOR INSERT TO authenticated WITH CHECK ((auth.uid())::text = user_id);

CREATE POLICY "Allow authenticated users to update user_data" ON user_data
    FOR UPDATE TO authenticated USING ((auth.uid())::text = user_id);

-- Allow service role to manage all data
CREATE POLICY "Allow service role to manage user_lots" ON user_lots
    FOR ALL TO service_role USING (true);

CREATE POLICY "Allow service role to manage licenses" ON licenses
    FOR ALL TO service_role USING (true);

CREATE POLICY "Allow service role to manage users" ON users
    FOR ALL TO service_role USING (true);

CREATE POLICY "Allow service role to manage user_data" ON user_data
    FOR ALL TO service_role USING (true);

-- Function to clean up expired data
CREATE OR REPLACE FUNCTION cleanup_expired_data()
RETURNS void AS $$
BEGIN
    -- Disable expired licenses
    UPDATE licenses 
    SET active = false 
    WHERE date_fin < CURRENT_DATE AND active = true;
    
    -- Suspend user lots with expired licenses
    UPDATE user_lots 
    SET status = 'suspended' 
    WHERE id IN (
        SELECT user_lot_id 
        FROM licenses 
        WHERE date_fin < CURRENT_DATE
    ) AND status = 'active';
    
    -- Log cleanup
    RAISE NOTICE 'Expired data cleanup performed at %', NOW();
END;
$$ LANGUAGE plpgsql;

-- Insert owner user for initial access
INSERT INTO users (id, username, password, type)
VALUES ('owner-001', 'gobexpropriétaire', 'Ffreddy75@@7575xyzDistribpro2025', 'Propriétaire')
ON CONFLICT (id) DO NOTHING;

-- Finalization
SELECT 'GOBEX Database Schema created successfully!' as status;