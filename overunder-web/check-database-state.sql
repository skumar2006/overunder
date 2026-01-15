-- Run this in your Supabase SQL Editor to check database state

-- 1. Check if onchain fields exist
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'bets' 
  AND table_schema = 'public'
  AND column_name IN ('onchain_bet_id', 'onchain_tx_hash')
ORDER BY column_name;

-- 2. Check recent bets
SELECT 
  id,
  LEFT(description, 50) as description_preview,
  creator_id,
  onchain_bet_id,
  onchain_tx_hash,
  resolution_status,
  created_at
FROM bets
ORDER BY created_at DESC
LIMIT 5;

-- 3. Check RLS policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'bets'
ORDER BY policyname;