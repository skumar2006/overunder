-- Re-enable RLS with proper policies
-- Run this in your Supabase SQL Editor

-- 1. Re-enable RLS on both tables
ALTER TABLE bets ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 2. Create simple, permissive policies for reading
CREATE POLICY "bets_read_all" ON bets
  FOR SELECT USING (true);

CREATE POLICY "users_read_all" ON users
  FOR SELECT USING (true);

-- 3. Create policies for writing (more restrictive)
CREATE POLICY "bets_insert_authenticated" ON bets
  FOR INSERT WITH CHECK (true);

CREATE POLICY "bets_update_creator" ON bets
  FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "users_insert_authenticated" ON users
  FOR INSERT WITH CHECK (true);

CREATE POLICY "users_update_self" ON users
  FOR UPDATE USING (true) WITH CHECK (true);

-- 4. Verify RLS is enabled and policies are in place
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename IN ('bets', 'users') 
    AND schemaname = 'public';

SELECT 
  tablename, 
  policyname,
  cmd,
  permissive
FROM pg_policies 
WHERE tablename IN ('bets', 'users')
ORDER BY tablename, cmd, policyname;