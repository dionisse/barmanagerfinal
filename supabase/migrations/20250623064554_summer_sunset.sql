-- GOBEX Database Schema for Neon PostgreSQL
-- Version: 2.0.1
-- Description: Schema pour la synchronisation cloud des données GOBEX

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table pour les lots d'utilisateurs (gestionnaire + employé)
CREATE TABLE IF NOT EXISTS user_lots (
    id VARCHAR(255) PRIMARY KEY,
    gestionnaire_username VARCHAR(255) NOT NULL,
    gestionnaire_password VARCHAR(255) NOT NULL,
    employe_username VARCHAR(255) NOT NULL,
    employe_password VARCHAR(255) NOT NULL,
    date_creation TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table pour les licences
CREATE TABLE IF NOT EXISTS licenses (
    id VARCHAR(255) PRIMARY KEY,
    license_type VARCHAR(50) NOT NULL CHECK (license_type IN ('Kpêvi', 'Kléoun', 'Agbon', 'Baba')),
    duree INTEGER NOT NULL, -- en mois
    prix DECIMAL(10,2) NOT NULL,
    date_debut DATE NOT NULL,
    date_fin DATE NOT NULL,
    cle VARCHAR(255) NOT NULL UNIQUE,
    active BOOLEAN DEFAULT true,
    user_lot_id VARCHAR(255) REFERENCES user_lots(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table pour les utilisateurs individuels
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(255) PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('Gestionnaire', 'Employé')),
    date_creation TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_lot_id VARCHAR(255) REFERENCES user_lots(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table pour les données utilisateur synchronisées
CREATE TABLE IF NOT EXISTS user_data (
    user_id VARCHAR(255) PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    data JSONB NOT NULL,
    last_sync TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_user_lots_status ON user_lots(status);
CREATE INDEX IF NOT EXISTS idx_licenses_active ON licenses(active);
CREATE INDEX IF NOT EXISTS idx_licenses_user_lot_id ON licenses(user_lot_id);
CREATE INDEX IF NOT EXISTS idx_licenses_date_fin ON licenses(date_fin);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_user_lot_id ON users(user_lot_id);
CREATE INDEX IF NOT EXISTS idx_user_data_last_sync ON user_data(last_sync);

-- Triggers pour mettre à jour updated_at automatiquement
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

-- Enable Row Level Security (RLS)
ALTER TABLE user_lots ENABLE ROW LEVEL SECURITY;
ALTER TABLE licenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_data ENABLE ROW LEVEL SECURITY;

-- RLS Policies pour user_lots
CREATE POLICY "Users can read their own user lot" ON user_lots
    FOR SELECT USING (
        gestionnaire_username = current_setting('app.current_user', true) OR
        employe_username = current_setting('app.current_user', true)
    );

CREATE POLICY "Service role can manage user lots" ON user_lots
    FOR ALL USING (current_setting('role') = 'service_role');

-- RLS Policies pour licenses
CREATE POLICY "Users can read licenses for their user lot" ON licenses
    FOR SELECT USING (
        user_lot_id IN (
            SELECT id FROM user_lots 
            WHERE gestionnaire_username = current_setting('app.current_user', true) 
               OR employe_username = current_setting('app.current_user', true)
        )
    );

CREATE POLICY "Service role can manage licenses" ON licenses
    FOR ALL USING (current_setting('role') = 'service_role');

-- RLS Policies pour users
CREATE POLICY "Users can read their own data" ON users
    FOR SELECT USING (username = current_setting('app.current_user', true));

CREATE POLICY "Service role can manage users" ON users
    FOR ALL USING (current_setting('role') = 'service_role');

-- RLS Policies pour user_data
CREATE POLICY "Users can manage their own data" ON user_data
    FOR ALL USING (
        user_id IN (
            SELECT id FROM users 
            WHERE username = current_setting('app.current_user', true)
        )
    );

CREATE POLICY "Service role can manage user data" ON user_data
    FOR ALL USING (current_setting('role') = 'service_role');

-- Fonction pour nettoyer les données expirées
CREATE OR REPLACE FUNCTION cleanup_expired_data()
RETURNS void AS $$
BEGIN
    -- Désactiver les licences expirées
    UPDATE licenses 
    SET active = false 
    WHERE date_fin < CURRENT_DATE AND active = true;
    
    -- Suspendre les lots d'utilisateurs avec licences expirées
    UPDATE user_lots 
    SET status = 'suspended' 
    WHERE id IN (
        SELECT user_lot_id 
        FROM licenses 
        WHERE date_fin < CURRENT_DATE
    ) AND status = 'active';
    
    -- Log de nettoyage
    RAISE NOTICE 'Nettoyage des données expirées effectué à %', NOW();
END;
$$ LANGUAGE plpgsql;

-- Commentaires pour documentation
COMMENT ON TABLE user_lots IS 'Lots d''utilisateurs contenant un gestionnaire et un employé';
COMMENT ON TABLE licenses IS 'Licences GOBEX avec types et durées';
COMMENT ON TABLE users IS 'Utilisateurs individuels liés aux lots';
COMMENT ON TABLE user_data IS 'Données applicatives synchronisées des utilisateurs';

COMMENT ON COLUMN licenses.license_type IS 'Type de licence: Kpêvi (1 mois), Kléoun (3 mois), Agbon (6 mois), Baba (12 mois)';
COMMENT ON COLUMN user_data.data IS 'Données JSON contenant tous les éléments de l''application (produits, ventes, etc.)';

-- Insertion de données de test (optionnel)
-- Décommentez les lignes suivantes pour insérer des données de test

/*
-- Lot d'utilisateurs de test
INSERT INTO user_lots (id, gestionnaire_username, gestionnaire_password, employe_username, employe_password, status)
VALUES ('test-lot-001', 'gestionnaire_test', 'password123', 'employe_test', 'password123', 'active')
ON CONFLICT (id) DO NOTHING;

-- Licence de test
INSERT INTO licenses (id, license_type, duree, prix, date_debut, date_fin, cle, active, user_lot_id)
VALUES (
    'test-license-001', 
    'Kpêvi', 
    1, 
    15000, 
    CURRENT_DATE, 
    CURRENT_DATE + INTERVAL '1 month', 
    'TEST-XXXX-XXXX-XXXX', 
    true, 
    'test-lot-001'
) ON CONFLICT (id) DO NOTHING;

-- Utilisateurs de test
INSERT INTO users (id, username, password, type, user_lot_id)
VALUES 
    ('test-user-001', 'gestionnaire_test', 'password123', 'Gestionnaire', 'test-lot-001'),
    ('test-user-002', 'employe_test', 'password123', 'Employé', 'test-lot-001')
ON CONFLICT (id) DO NOTHING;
*/

-- Finalisation
SELECT 'GOBEX Database Schema créé avec succès!' as status;