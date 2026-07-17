/*
# Create clients and suppliers tables

1. New Tables
- `clients` — Stores customer information for reuse during sales and debt tracking.
  - id (text, primary key)
  - nom (text, not null) — Customer name
  - telephone (text) — Phone number
  - adresse (text) — Address
  - solde_dette (numeric, default 0) — Outstanding debt amount in FCFA
  - notes (text) — Free-form notes
  - date_creation (timestamptz) — Creation date
  - user_lot_id (text) — For multi-tenant data isolation
- `suppliers` — Stores supplier contacts for reuse during purchases.
  - id (text, primary key)
  - nom (text, not null) — Supplier name
  - telephone (text) — Phone number
  - adresse (text) — Address
  - contact_personne (text) — Contact person name
  - notes (text) — Free-form notes
  - date_creation (timestamptz) — Creation date
  - user_lot_id (text) — For multi-tenant data isolation

2. Security
- Enable RLS on both tables.
- Allow anon + authenticated full CRUD (the app uses a custom auth system with
  the anon key, and data is isolated via user_lot_id at the application level).
*/

CREATE TABLE IF NOT EXISTS clients (
  id text PRIMARY KEY,
  nom text NOT NULL,
  telephone text DEFAULT '',
  adresse text DEFAULT '',
  solde_dette numeric DEFAULT 0,
  notes text DEFAULT '',
  date_creation timestamptz DEFAULT now(),
  user_lot_id text
);

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_clients" ON clients;
CREATE POLICY "anon_select_clients" ON clients FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_clients" ON clients;
CREATE POLICY "anon_insert_clients" ON clients FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_clients" ON clients;
CREATE POLICY "anon_update_clients" ON clients FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_clients" ON clients;
CREATE POLICY "anon_delete_clients" ON clients FOR DELETE
  TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS suppliers (
  id text PRIMARY KEY,
  nom text NOT NULL,
  telephone text DEFAULT '',
  adresse text DEFAULT '',
  contact_personne text DEFAULT '',
  notes text DEFAULT '',
  date_creation timestamptz DEFAULT now(),
  user_lot_id text
);

ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_suppliers" ON suppliers;
CREATE POLICY "anon_select_suppliers" ON suppliers FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_suppliers" ON suppliers;
CREATE POLICY "anon_insert_suppliers" ON suppliers FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_suppliers" ON suppliers;
CREATE POLICY "anon_update_suppliers" ON suppliers FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_suppliers" ON suppliers;
CREATE POLICY "anon_delete_suppliers" ON suppliers FOR DELETE
  TO anon, authenticated USING (true);
