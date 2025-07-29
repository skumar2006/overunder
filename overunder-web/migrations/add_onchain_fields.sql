-- Migration: Add on-chain connection fields to bets table
-- This connects Supabase bet records with on-chain smart contract data

-- Add columns for on-chain connection
ALTER TABLE bets 
ADD COLUMN onchain_bet_id INTEGER,
ADD COLUMN onchain_tx_hash TEXT;

-- Add comments for documentation
COMMENT ON COLUMN bets.onchain_bet_id IS 'The bet ID from the smart contract (returned by createBet function)';
COMMENT ON COLUMN bets.onchain_tx_hash IS 'Transaction hash of the on-chain bet creation';

-- Create index for efficient lookups by on-chain bet ID
CREATE INDEX idx_bets_onchain_bet_id ON bets(onchain_bet_id);

-- Create index for transaction hash lookups
CREATE INDEX idx_bets_onchain_tx_hash ON bets(onchain_tx_hash);

-- Update RLS policies if needed (existing policies should still work)
-- The existing RLS policies on bets table will apply to these new columns 