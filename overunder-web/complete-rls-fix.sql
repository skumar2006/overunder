-- Complete RLS Fix for OverUnder MVP
-- Run this in Supabase SQL Editor

-- Option 1: Temporarily disable RLS entirely (easiest for development)
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE communities DISABLE ROW LEVEL SECURITY;
ALTER TABLE community_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE bets DISABLE ROW LEVEL SECURITY;
ALTER TABLE shares_owned DISABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_balances DISABLE ROW LEVEL SECURITY;

-- Option 2: If you want to keep RLS enabled but make policies very permissive
-- Uncomment the section below if you prefer this approach:

/*
-- Drop all existing policies
DROP POLICY IF EXISTS "Users can view all users" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Users can insert own profile" ON users;
DROP POLICY IF EXISTS "Users are publicly readable" ON users;
DROP POLICY IF EXISTS "Anyone can insert users" ON users;
DROP POLICY IF EXISTS "Users can update by email" ON users;

DROP POLICY IF EXISTS "Communities are publicly readable" ON communities;
DROP POLICY IF EXISTS "Users can create communities" ON communities;
DROP POLICY IF EXISTS "Creators can update communities" ON communities;
DROP POLICY IF EXISTS "Anyone can create communities" ON communities;
DROP POLICY IF EXISTS "Anyone can update communities" ON communities;

DROP POLICY IF EXISTS "Community members are publicly readable" ON community_members;
DROP POLICY IF EXISTS "Users can join communities" ON community_members;
DROP POLICY IF EXISTS "Users can leave communities" ON community_members;
DROP POLICY IF EXISTS "Anyone can join communities" ON community_members;
DROP POLICY IF EXISTS "Anyone can leave communities" ON community_members;

DROP POLICY IF EXISTS "Bets are publicly readable" ON bets;
DROP POLICY IF EXISTS "Users can create bets" ON bets;
DROP POLICY IF EXISTS "Creators can update bets" ON bets;
DROP POLICY IF EXISTS "Anyone can create bets" ON bets;
DROP POLICY IF EXISTS "Anyone can update bets" ON bets;

DROP POLICY IF EXISTS "Shares are publicly readable" ON shares_owned;
DROP POLICY IF EXISTS "Users can manage own shares" ON shares_owned;
DROP POLICY IF EXISTS "Users can update own shares" ON shares_owned;
DROP POLICY IF EXISTS "Anyone can manage shares" ON shares_owned;
DROP POLICY IF EXISTS "Anyone can update shares" ON shares_owned;

DROP POLICY IF EXISTS "Users can view own balance" ON wallet_balances;
DROP POLICY IF EXISTS "Users can update own balance" ON wallet_balances;
DROP POLICY IF EXISTS "Users can create own balance" ON wallet_balances;
DROP POLICY IF EXISTS "Wallet balances readable by owner" ON wallet_balances;
DROP POLICY IF EXISTS "Anyone can create wallet balance" ON wallet_balances;
DROP POLICY IF EXISTS "Anyone can update wallet balance" ON wallet_balances;

-- Create completely open policies
CREATE POLICY "Allow all operations" ON users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations" ON communities FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations" ON community_members FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations" ON bets FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations" ON shares_owned FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations" ON wallet_balances FOR ALL USING (true) WITH CHECK (true);
*/ 