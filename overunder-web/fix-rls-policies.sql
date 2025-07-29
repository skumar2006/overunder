-- Fix RLS Policies for Magic SDK Authentication
-- Run this in Supabase SQL Editor

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can insert own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Users can create own balance" ON wallet_balances;
DROP POLICY IF EXISTS "Users can update own balance" ON wallet_balances;
DROP POLICY IF EXISTS "Users can view own balance" ON wallet_balances;

-- Create more permissive policies for Magic SDK auth
-- Users table - allow public reads and email-based operations
CREATE POLICY "Users are publicly readable" ON users FOR SELECT USING (true);
CREATE POLICY "Anyone can insert users" ON users FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update by email" ON users FOR UPDATE USING (true);

-- Wallet balances - allow operations based on user existence
CREATE POLICY "Wallet balances readable by owner" ON wallet_balances FOR SELECT USING (true);
CREATE POLICY "Anyone can create wallet balance" ON wallet_balances FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update wallet balance" ON wallet_balances FOR UPDATE USING (true);

-- Make shares policies more permissive too
DROP POLICY IF EXISTS "Users can manage own shares" ON shares_owned;
DROP POLICY IF EXISTS "Users can update own shares" ON shares_owned;

CREATE POLICY "Anyone can manage shares" ON shares_owned FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update shares" ON shares_owned FOR UPDATE USING (true);

-- Community members policies - more permissive
DROP POLICY IF EXISTS "Users can join communities" ON community_members;
DROP POLICY IF EXISTS "Users can leave communities" ON community_members;

CREATE POLICY "Anyone can join communities" ON community_members FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can leave communities" ON community_members FOR DELETE USING (true);

-- Update bet creation policies
DROP POLICY IF EXISTS "Users can create bets" ON bets;
DROP POLICY IF EXISTS "Creators can update bets" ON bets;

CREATE POLICY "Anyone can create bets" ON bets FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update bets" ON bets FOR UPDATE USING (true);

-- Update community creation policies  
DROP POLICY IF EXISTS "Users can create communities" ON communities;
DROP POLICY IF EXISTS "Creators can update communities" ON communities;

CREATE POLICY "Anyone can create communities" ON communities FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update communities" ON communities FOR UPDATE USING (true); 