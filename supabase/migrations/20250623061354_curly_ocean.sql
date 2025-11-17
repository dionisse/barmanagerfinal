-- GOBEX Database Schema for Neon PostgreSQL
-- This file contains the complete database schema for the GOBEX application

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- User Lots Table
-- Stores pairs of users (gestionnaire + employé) that share a license
CREATE TABLE IF NOT EXISTS user_lots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    gestionnaire_username VARCHAR(255) NOT NULL,
    gestionnaire_password VARCHAR(255) NOT NULL,
    employe_username VARCHAR(255) NOT NULL,
    employe_password VARCHAR(255) NOT NULL,
    date_creation TIMESTAMPTZ DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Licenses Table
-- Stores license information linked to user lots
CREATE TABLE IF NOT EXISTS licenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    license_type VARCHAR(20) NOT NULL CHECK (license_type IN ('Kpêvi', 'Kléoun', 'Agbon', 'Baba')),
    duree INTEGER NOT NULL, -- Duration in months
    prix DECIMAL(10,2) NOT NULL,
    date_debut DATE NOT NULL,
    date_fin DATE NOT NULL,
    cle VARCHAR(255) NOT NULL UNIQUE, -- License key
    active BOOLEAN DEFAULT true,
    user_lot_id UUID REFERENCES user_lots(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users Table
-- Individual users linked to user lots
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('Gestionnaire', 'Employé')),
    date_creation TIMESTAMPTZ DEFAULT NOW(),
    user_lot_id UUID REFERENCES user_lots(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Data Table
-- Stores synchronized application data for each user
CREATE TABLE IF NOT EXISTS user_data (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE,
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

-- Row Level Security (RLS) Policies
ALTER TABLE user_lots ENABLE ROW LEVEL SECURITY;
ALTER TABLE licenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_data ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_lots
CREATE POLICY "Users can read their own user lot"
    ON user_lots FOR SELECT
    USING (
        gestionnaire_username = current_setting('app.current_user', true) OR
        employe_username = current_setting('app.current_user', true)
    );

CREATE POLICY "Service role can manage user lots"
    ON user_lots FOR ALL
    USING (current_setting('role') = 'service_role');

-- RLS Policies for licenses
CREATE POLICY "Users can read licenses for their user lot"
    ON licenses FOR SELECT
    USING (
        user_lot_id IN (
            SELECT id FROM user_lots 
            WHERE gestionnaire_username = current_setting('app.current_user', true) 
               OR employe_username = current_setting('app.current_user', true)
        )
    );

CREATE POLICY "Service role can manage licenses"
    ON licenses FOR ALL
    USING (current_setting('role') = 'service_role');

-- RLS Policies for users
CREATE POLICY "Users can read their own data"
    ON users FOR SELECT
    USING (username = current_setting('app.current_user', true));

CREATE POLICY "Service role can manage users"
    ON users FOR ALL
    USING (current_setting('role') = 'service_role');

-- RLS Policies for user_data
CREATE POLICY "Users can access their own data"
    ON user_data FOR ALL
    USING (
        user_id::text IN (
            SELECT id::text FROM users 
            WHERE username = current_setting('app.current_user', true)
        )
    );

CREATE POLICY "Service role can manage user data"
    ON user_data FOR ALL
    USING (current_setting('role') = 'service_role');

-- Functions for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for automatic timestamp updates
CREATE TRIGGER update_user_lots_updated_at BEFORE UPDATE ON user_lots
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_licenses_updated_at BEFORE UPDATE ON licenses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_data_updated_at BEFORE UPDATE ON user_data
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to check license expiration
CREATE OR REPLACE FUNCTION check_license_expiration()
RETURNS TABLE (
    user_lot_id UUID,
    license_type VARCHAR,
    days_remaining INTEGER,
    is_expired BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        l.user_lot_id,
        l.license_type,
        EXTRACT(DAY FROM l.date_fin - CURRENT_DATE)::INTEGER as days_remaining,
        (l.date_fin < CURRENT_DATE) as is_expired
    FROM licenses l
    WHERE l.active = true;
END;
$$ LANGUAGE plpgsql;

-- Function to get user license status
CREATE OR REPLACE FUNCTION get_user_license_status(p_username VARCHAR)
RETURNS TABLE (
    has_access BOOLEAN,
    license_type VARCHAR,
    date_fin DATE,
    days_remaining INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (l.active = true AND l.date_fin >= CURRENT_DATE) as has_access,
        l.license_type,
        l.date_fin,
        EXTRACT(DAY FROM l.date_fin - CURRENT_DATE)::INTEGER as days_remaining
    FROM users u
    JOIN user_lots ul ON u.user_lot_id = ul.id
    JOIN licenses l ON ul.id = l.user_lot_id
    WHERE u.username = p_username AND l.active = true
    ORDER BY l.date_fin DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Sample data for testing (optional)
-- Uncomment the following lines if you want to insert sample data

/*
-- Insert sample user lot
INSERT INTO user_lots (id, gestionnaire_username, gestionnaire_password, employe_username, employe_password)
VALUES (
    uuid_generate_v4(),
    'gestionnaire_test',
    'password123',
    'employe_test',
    'password123'
);

-- Insert sample license
INSERT INTO licenses (license_type, duree, prix, date_debut, date_fin, cle, user_lot_id)
SELECT 
    'Kpêvi',
    1,
    15000,
    CURRENT_DATE,
    CURRENT_DATE + INTERVAL '1 month',
    'KPEV-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 12)),
    id
FROM user_lots
WHERE gestionnaire_username = 'gestionnaire_test';

-- Insert sample users
INSERT INTO users (username, password, type, user_lot_id)
SELECT 
    'gestionnaire_test',
    'password123',
    'Gestionnaire',
    id
FROM user_lots
WHERE gestionnaire_username = 'gestionnaire_test';

INSERT INTO users (username, password, type, user_lot_id)
SELECT 
    'employe_test',
    'password123',
    'Employé',
    id
FROM user_lots
WHERE employe_username = 'employe_test';
*/