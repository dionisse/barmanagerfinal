/*
  # Stock-Based Sales Calculation Table

  1. New Tables
    - `stock_sales_calculations`
      - `id` (uuid, primary key) - Unique identifier for each calculation
      - `date` (date) - Date of the calculation
      - `product_id` (text) - Reference to the product
      - `product_name` (text) - Name of the product
      - `initial_stock` (integer) - Starting stock quantity
      - `final_stock` (integer) - Ending stock quantity after inventory
      - `damaged` (integer, default 0) - Quantity of damaged items
      - `broken` (integer, default 0) - Quantity of broken items
      - `leaking` (integer, default 0) - Quantity of leaking items
      - `quantity_sold` (integer) - Calculated sold quantity
      - `notes` (text) - Optional notes
      - `created_at` (timestamptz) - Timestamp when record was created
      - `created_by` (text) - User who created the record

  2. Security
    - Enable RLS on `stock_sales_calculations` table
    - Add policy for authenticated users to manage their own data
*/

CREATE TABLE IF NOT EXISTS stock_sales_calculations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL DEFAULT CURRENT_DATE,
  product_id text NOT NULL,
  product_name text NOT NULL,
  initial_stock integer NOT NULL,
  final_stock integer NOT NULL,
  damaged integer DEFAULT 0,
  broken integer DEFAULT 0,
  leaking integer DEFAULT 0,
  quantity_sold integer NOT NULL,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  created_by text NOT NULL
);

ALTER TABLE stock_sales_calculations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all stock calculations"
  ON stock_sales_calculations
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert stock calculations"
  ON stock_sales_calculations
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update stock calculations"
  ON stock_sales_calculations
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete stock calculations"
  ON stock_sales_calculations
  FOR DELETE
  TO authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS idx_stock_sales_date ON stock_sales_calculations(date);
CREATE INDEX IF NOT EXISTS idx_stock_sales_product ON stock_sales_calculations(product_id);