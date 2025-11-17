/*
  # Add Password Column to Users Table

  ## Overview
  This migration adds a password column to the users table to support
  password-based authentication for the application.

  ## Changes
  1. Add `password` column to users table
    - `password` (text, not null) - Stores user passwords
  
  ## Important Notes
  - Password is required (not null)
  - In production, passwords should be hashed before storage
  - This is a basic implementation for the GOBEX application
*/

-- Add password column to users table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'password'
  ) THEN
    ALTER TABLE users ADD COLUMN password text NOT NULL DEFAULT '';
  END IF;
END $$;

-- Remove the default after adding the column
ALTER TABLE users ALTER COLUMN password DROP DEFAULT;

-- Update the owner account with the correct password
UPDATE users 
SET password = 'Ffreddy75@@7575xyzDistribpro2025'
WHERE username = 'gobexpropriétaire';
