-- Final RLS fix - Remove all policies and disable RLS temporarily for testing
-- Run this in your Supabase SQL Editor

-- 1. Drop ALL policies on bets table
DROP POLICY IF EXISTS "Anyone can delete bets" ON bets;
DROP POLICY IF EXISTS "Anyone can update bets" ON bets;
DROP POLICY IF EXISTS "Bets are publicly readable" ON bets;
DROP POLICY IF EXISTS "Bets are viewable by everyone" ON bets;
DROP POLICY IF EXISTS "Creators can update bets" ON bets;
DROP POLICY IF EXISTS "bets_select_all" ON bets;

-- 2. Drop ALL policies on users table
DROP POLICY IF EXISTS "Users can view all users" ON users;
DROP POLICY IF EXISTS "users_select_all" ON users;

-- 3. Temporarily disable RLS entirely for testing
ALTER TABLE bets DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- 4. Verify RLS is disabled
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename IN ('bets', 'users') 
    AND schemaname = 'public';

-- 5. Check that no policies remain
SELECT 
  tablename, 
  policyname
FROM pg_policies 
WHERE tablename IN ('bets', 'users')
ORDER BY tablename, policyname;