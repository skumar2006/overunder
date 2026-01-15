-- Check current RLS policies and fix them
-- Run this in your Supabase SQL Editor

-- 1. First, let's see what policies currently exist
SELECT 
  schemaname,
  tablename, 
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename IN ('bets', 'users')
ORDER BY tablename, policyname;

-- 2. Drop ALL existing policies on bets table
DROP POLICY IF EXISTS "Anyone can read bets" ON bets;
DROP POLICY IF EXISTS "Users can only see their own bets" ON bets;
DROP POLICY IF EXISTS "Users can view bets" ON bets;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON bets;
DROP POLICY IF EXISTS "Users can create bets" ON bets;
DROP POLICY IF EXISTS "Anyone can create bets" ON bets;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON bets;

-- 3. Drop ALL existing policies on users table
DROP POLICY IF EXISTS "Anyone can read users" ON users;
DROP POLICY IF EXISTS "Users can view users" ON users;
DROP POLICY IF EXISTS "Enable read access for users" ON users;
DROP POLICY IF EXISTS "Users can view all profiles" ON users;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON users;

-- 4. Create simple, permissive policies
CREATE POLICY "bets_select_all" ON bets
  FOR SELECT USING (true);

CREATE POLICY "users_select_all" ON users
  FOR SELECT USING (true);

-- 5. Verify the new policies
SELECT 
  tablename, 
  policyname,
  cmd,
  qual
FROM pg_policies 
WHERE tablename IN ('bets', 'users')
ORDER BY tablename, policyname;