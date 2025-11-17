-- GOBEX Database Schema for Supabase
-- This file contains the complete database schema for the GOBEX application

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

-- Enable Row Level Security (RLS)
ALTER TABLE user_lots ENABLE ROW LEVEL SECURITY;
ALTER TABLE licenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_data ENABLE ROW LEVEL SECURITY;

-- RLS Policies
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
CREATE POLICY "Allow authenticated users to insert user_data" ON user_data
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow authenticated users to update user_data" ON user_data
    FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Allow service role to manage all data
CREATE POLICY "Allow service role to manage user_lots" ON user_lots
    FOR ALL TO service_role USING (true);

CREATE POLICY "Allow service role to manage licenses" ON licenses
    FOR ALL TO service_role USING (true);

CREATE POLICY "Allow service role to manage users" ON users
    FOR ALL TO service_role USING (true);

CREATE POLICY "Allow service role to manage user_data" ON user_data
    FOR ALL TO service_role USING (true);

-- Insert owner user for initial access
INSERT INTO users (id, username, password, type)
VALUES ('owner-001', 'gobexpropriétaire', 'Ffreddy75@@7575xyzDistribpro2025', 'Propriétaire')
ON CONFLICT (id) DO NOTHING;