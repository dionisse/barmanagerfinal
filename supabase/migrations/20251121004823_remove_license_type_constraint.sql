/*
  # Remove Restrictive License Type Constraint

  ## Problem
  The licenses table has a CHECK constraint that only allows 'monthly', 'quarterly', 
  and 'annual' as valid license types. However, the application uses custom license 
  types like 'Kpêvi', 'Novissi', and 'Zota'.

  This causes silent failures when trying to insert licenses with custom types.

  ## Solution
  Remove the restrictive CHECK constraint to allow any license type value.
  The application will handle validation at the UI level.

  ## Changes
  - Drop the licenses_license_type_check constraint
*/

-- Drop the restrictive license_type constraint
ALTER TABLE licenses DROP CONSTRAINT IF EXISTS licenses_license_type_check;
