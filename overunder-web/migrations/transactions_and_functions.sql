-- Additional tables and functions for custodial system

-- Transactions table to track all user transactions
CREATE TABLE IF NOT EXISTS transactions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  transaction_type VARCHAR NOT NULL CHECK (transaction_type IN ('create_bet', 'place_bet', 'withdraw', 'deposit', 'reward')),
  amount DECIMAL(10,2) NOT NULL,
  transaction_hash VARCHAR,
  status VARCHAR DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);

-- Enable RLS for transactions
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Transactions policies (users can only see their own transactions)
CREATE POLICY "Users can view own transactions" ON transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own transactions" ON transactions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Function to safely deduct balance
CREATE OR REPLACE FUNCTION public.deduct_balance(user_id UUID, amount DECIMAL)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_balance DECIMAL;
BEGIN
  -- Get current balance with row lock
  SELECT balance INTO current_balance
  FROM wallet_balances 
  WHERE wallet_balances.user_id = deduct_balance.user_id
  FOR UPDATE;
  
  -- Check if sufficient balance
  IF current_balance IS NULL OR current_balance < amount THEN
    RETURN FALSE;
  END IF;
  
  -- Deduct the amount
  UPDATE wallet_balances 
  SET 
    balance = balance - amount,
    updated_at = NOW()
  WHERE wallet_balances.user_id = deduct_balance.user_id;
  
  RETURN TRUE;
END;
$$;

-- Function to add balance
CREATE OR REPLACE FUNCTION public.add_balance(user_id UUID, amount DECIMAL)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Add the amount to user's balance
  INSERT INTO wallet_balances (user_id, balance)
  VALUES (user_id, amount)
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    balance = wallet_balances.balance + amount,
    updated_at = NOW();
  
  RETURN TRUE;
END;
$$;

-- Function to get user's total betting activity
CREATE OR REPLACE FUNCTION public.get_user_stats(user_id UUID)
RETURNS TABLE(
  total_bets_created INTEGER,
  total_bets_placed INTEGER,
  total_amount_bet DECIMAL,
  total_winnings DECIMAL,
  current_balance DECIMAL
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE((SELECT COUNT(*)::INTEGER FROM bets WHERE creator_id = user_id), 0) as total_bets_created,
    COALESCE((SELECT COUNT(*)::INTEGER FROM transactions WHERE transactions.user_id = get_user_stats.user_id AND transaction_type = 'place_bet'), 0) as total_bets_placed,
    COALESCE((SELECT SUM(amount) FROM transactions WHERE transactions.user_id = get_user_stats.user_id AND transaction_type = 'place_bet'), 0) as total_amount_bet,
    COALESCE((SELECT SUM(amount) FROM transactions WHERE transactions.user_id = get_user_stats.user_id AND transaction_type = 'reward'), 0) as total_winnings,
    COALESCE((SELECT balance FROM wallet_balances WHERE wallet_balances.user_id = get_user_stats.user_id), 0) as current_balance;
END;
$$;