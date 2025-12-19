/*
  # Create Payment Transactions Table

  1. New Tables
    - `payment_transactions`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `client_id` (uuid, foreign key to clients)
      - `client_name` (text) - Stored for historical record even if client is deleted
      - `amount` (decimal) - The payment amount for this transaction
      - `payment_date` (timestamptz) - When the payment was recorded
      - `created_at` (timestamptz) - When the record was created
      - `updated_at` (timestamptz) - When the record was last updated

  2. Security
    - Enable RLS on `payment_transactions` table
    - Add policy for authenticated users to read their own transactions
    - Add policy for authenticated users to insert their own transactions
    - Add policy for authenticated users to update their own transactions
    - Add policy for authenticated users to delete their own transactions

  3. Indexes
    - Add index on user_id for faster queries
    - Add index on client_id for faster queries
    - Add index on payment_date for sorting
*/

CREATE TABLE IF NOT EXISTS payment_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  client_name text NOT NULL,
  amount decimal NOT NULL DEFAULT 0,
  payment_date timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own transactions"
  ON payment_transactions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transactions"
  ON payment_transactions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own transactions"
  ON payment_transactions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own transactions"
  ON payment_transactions
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_user_id ON payment_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_client_id ON payment_transactions(client_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_payment_date ON payment_transactions(payment_date DESC);
