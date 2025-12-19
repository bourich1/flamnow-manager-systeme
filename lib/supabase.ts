import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Client = {
  id: string;
  user_id: string;
  name: string;
  total_amount: number;
  paid_amount: number;
  subscription_type: 'monthly' | 'one-time';
  start_date: string | null;
  next_payment_date: string | null;
  created_at: string;
  updated_at: string;
};

export type BalanceAdjustment = {
  id: string;
  user_id: string;
  amount: number;
  reason: string;
  created_at: string;
  updated_at: string;
};

export type PaymentTransaction = {
  id: string;
  user_id: string;
  client_id: string;
  client_name: string;
  amount: number;
  payment_date: string;
  created_at: string;
  updated_at: string;
};
