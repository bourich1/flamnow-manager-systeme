/*
  # Money Management System Database Schema

  ## Overview
  This migration creates the complete database structure for a money management system
  with client tracking, revenue management, and balance adjustments.

  ## New Tables

  ### 1. `clients`
  - `id` (uuid, primary key) - Unique identifier for each client
  - `user_id` (uuid, foreign key) - References auth.users, links client to owner
  - `name` (text) - Client's name
  - `total_amount` (decimal) - Total amount due from client
  - `paid_amount` (decimal) - Amount already paid by client
  - `subscription_type` (text) - Either 'monthly' or 'one-time'
  - `start_date` (date, nullable) - Start date for monthly subscriptions
  - `next_payment_date` (date, nullable) - Next payment due date for monthly subscriptions
  - `created_at` (timestamptz) - Record creation timestamp
  - `updated_at` (timestamptz) - Record update timestamp

  ### 2. `balance_adjustments`
  - `id` (uuid, primary key) - Unique identifier for each adjustment
  - `user_id` (uuid, foreign key) - References auth.users, links adjustment to owner
  - `amount` (decimal) - Adjustment amount (positive for increase, negative for decrease)
  - `reason` (text) - Explanation for the adjustment
  - `created_at` (timestamptz) - Record creation timestamp
  - `updated_at` (timestamptz) - Record update timestamp

  ## Security
  - Enable RLS on all tables
  - Users can only access their own data
  - Policies enforce authentication and ownership checks
*/

-- Create clients table
CREATE TABLE IF NOT EXISTS clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  total_amount decimal(15, 2) NOT NULL DEFAULT 0,
  paid_amount decimal(15, 2) NOT NULL DEFAULT 0,
  subscription_type text NOT NULL CHECK (subscription_type IN ('monthly', 'one-time')),
  start_date date,
  next_payment_date date,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create balance_adjustments table
CREATE TABLE IF NOT EXISTS balance_adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount decimal(15, 2) NOT NULL,
  reason text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Enable Row Level Security
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE balance_adjustments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for clients table
CREATE POLICY "Users can view own clients"
  ON clients FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own clients"
  ON clients FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own clients"
  ON clients FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own clients"
  ON clients FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for balance_adjustments table
CREATE POLICY "Users can view own balance adjustments"
  ON balance_adjustments FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own balance adjustments"
  ON balance_adjustments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own balance adjustments"
  ON balance_adjustments FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own balance adjustments"
  ON balance_adjustments FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_clients_user_id ON clients(user_id);
CREATE INDEX IF NOT EXISTS idx_balance_adjustments_user_id ON balance_adjustments(user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers to auto-update updated_at
CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON clients
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_balance_adjustments_updated_at
  BEFORE UPDATE ON balance_adjustments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();