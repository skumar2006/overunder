-- Fix RLS policies for bets table
-- Run this in your Supabase SQL editor if bets are not being stored

-- Check if RLS is enabled on bets table
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'bets';

-- Check existing policies on bets table
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'bets';

-- If RLS is enabled but no policies exist, create basic policies
-- (You may need to adjust these based on your specific requirements)

-- Allow authenticated users to view all bets
CREATE POLICY IF NOT EXISTS "Bets are viewable by everyone" ON bets
  FOR SELECT USING (true);

-- Allow authenticated users to create bets
CREATE POLICY IF NOT EXISTS "Users can create bets" ON bets
  FOR INSERT WITH CHECK (auth.uid() = creator_id);

-- Allow bet creators to update their own bets
CREATE POLICY IF NOT EXISTS "Users can update their own bets" ON bets
  FOR UPDATE USING (auth.uid() = creator_id);

-- Allow bet creators to delete their own bets (optional)
CREATE POLICY IF NOT EXISTS "Users can delete their own bets" ON bets
  FOR DELETE USING (auth.uid() = creator_id);

-- If you want to temporarily disable RLS for testing (NOT RECOMMENDED FOR PRODUCTION):
-- ALTER TABLE bets DISABLE ROW LEVEL SECURITY;

-- Check the users table to ensure it exists and has proper structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'users' AND table_schema = 'public'
ORDER BY ordinal_position;