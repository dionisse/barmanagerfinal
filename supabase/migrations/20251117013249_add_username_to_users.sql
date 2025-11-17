/*
  # Add Username Column to Users Table

  ## Overview
  This migration adds a username column to the users table to support
  username-based authentication and identification.

  ## Changes
  1. Add `username` column to users table
    - `username` (text, unique, not null) - Unique username for each user
  
  2. Add index for performance
    - Index on username for faster lookups

  ## Important Notes
  - Username is unique across all users
  - Username is required (not null)
  - Index added for optimal query performance
*/

-- Add username column to users table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'username'
  ) THEN
    ALTER TABLE users ADD COLUMN username text UNIQUE NOT NULL DEFAULT '';
  END IF;
END $$;

-- Create index on username for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- Update the default value constraint to allow empty string temporarily
-- This is for existing rows, new rows should have proper usernames
ALTER TABLE users ALTER COLUMN username DROP DEFAULT;
