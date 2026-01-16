/*
  # Add Stock Entry field to Stock Sales Calculations

  1. Changes
    - Add `stock_entry` column to `stock_sales_calculations` table
      - Type: integer with default value of 0
      - Represents the quantity of stock added during the period
    
  2. Updated Formula
    - New formula: Stock Final - Stock Initial - (Damaged + Broken + Leaking) + Stock Entry = Quantity Sold
    - The stock_entry field accounts for inventory received during the calculation period
  
  3. Notes
    - Uses conditional logic to prevent errors if column already exists
    - Default value of 0 ensures backward compatibility with existing records
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stock_sales_calculations' AND column_name = 'stock_entry'
  ) THEN
    ALTER TABLE stock_sales_calculations 
    ADD COLUMN stock_entry integer DEFAULT 0;
  END IF;
END $$;