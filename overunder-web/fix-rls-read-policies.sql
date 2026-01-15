-- Fix RLS policies to allow users to read bets and users
-- Run this in your Supabase SQL Editor

-- Drop existing restrictive policies on bets
DROP POLICY IF EXISTS "Users can only see their own bets" ON bets;
DROP POLICY IF EXISTS "Users can view bets" ON bets;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON bets;

-- Drop existing restrictive policies on users  
DROP POLICY IF EXISTS "Users can view users" ON users;
DROP POLICY IF EXISTS "Enable read access for users" ON users;

-- Create permissive read policies
CREATE POLICY "Anyone can read bets" ON bets
  FOR SELECT USING (true);

CREATE POLICY "Anyone can read users" ON users
  FOR SELECT USING (true);

-- Verify policies are working
SELECT 
  schemaname,
  tablename, 
  policyname,
  cmd,
  qual
FROM pg_policies 
WHERE tablename IN ('bets', 'users')
ORDER BY tablename, policyname;