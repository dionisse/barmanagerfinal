/*
  # Add Period fields to Stock Sales Calculations

  1. Changes
    - Add `period_start` column to `stock_sales_calculations` table
      - Type: date with default value of CURRENT_DATE
      - Represents the start date of the calculation period
    - Add `period_end` column to `stock_sales_calculations` table
      - Type: date with default value of CURRENT_DATE
      - Represents the end date of the calculation period
    
  2. Purpose
    - Allows tracking of specific time periods for inventory calculations
    - Enables better analysis of sales trends over defined periods
    - Provides context for stock movements between two dates
  
  3. Notes
    - Uses conditional logic to prevent errors if columns already exist
    - Default values set to current date for backward compatibility
    - Both fields are required for new records
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stock_sales_calculations' AND column_name = 'period_start'
  ) THEN
    ALTER TABLE stock_sales_calculations 
    ADD COLUMN period_start date DEFAULT CURRENT_DATE NOT NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stock_sales_calculations' AND column_name = 'period_end'
  ) THEN
    ALTER TABLE stock_sales_calculations 
    ADD COLUMN period_end date DEFAULT CURRENT_DATE NOT NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_stock_sales_period ON stock_sales_calculations(period_start, period_end);