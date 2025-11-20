/*
  # Fix authenticate_user Function to Return user_lot_id

  ## Overview
  Updates the authenticate_user function to return user_lot_id which is
  critical for data isolation between user groups.

  ## Changes
  - Modify authenticate_user function to return user_lot_id column
  - This ensures the application can properly isolate data by user group

  ## Security
  - Maintains secure authentication without exposing passwords
  - Returns user_lot_id for proper data filtering
*/

-- Drop the existing function
DROP FUNCTION IF EXISTS authenticate_user(TEXT, TEXT, TEXT);

-- Create updated function that returns user_lot_id
CREATE OR REPLACE FUNCTION authenticate_user(
  p_username TEXT,
  p_password TEXT,
  p_role TEXT
)
RETURNS TABLE (
  user_id uuid,
  username TEXT,
  role TEXT,
  created_at TIMESTAMPTZ,
  user_lot_id TEXT
) 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- This function allows authentication without exposing password column
  -- Password should be hashed in future implementation
  RETURN QUERY
  SELECT 
    u.id,
    u.username,
    u.role,
    u.created_at,
    u.user_lot_id
  FROM users u
  WHERE 
    u.username = p_username 
    AND u.password = p_password 
    AND u.role = p_role;
END;
$$;

-- Grant execute permission on the authentication function
GRANT EXECUTE ON FUNCTION authenticate_user(TEXT, TEXT, TEXT) TO anon, authenticated;
