-- Migration: Add custodial wallet support
-- Run this in Supabase SQL Editor

-- Add user_wallets table for storing encrypted private keys
CREATE TABLE IF NOT EXISTS user_wallets (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  wallet_address VARCHAR NOT NULL UNIQUE,
  encrypted_private_key TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Modify users table to work with Supabase Auth
-- Drop the old table if it exists and recreate with proper structure
DROP TABLE IF EXISTS users CASCADE;

CREATE TABLE users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email VARCHAR,
  wallet_address VARCHAR UNIQUE,
  username VARCHAR UNIQUE NOT NULL,
  bio TEXT,
  profile_pic_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Recreate dependent tables with proper references
DROP TABLE IF EXISTS communities CASCADE;
DROP TABLE IF EXISTS community_members CASCADE;
DROP TABLE IF EXISTS bets CASCADE;
DROP TABLE IF EXISTS shares_owned CASCADE;
DROP TABLE IF EXISTS wallet_balances CASCADE;

-- Communities table
CREATE TABLE communities (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name VARCHAR NOT NULL,
  description TEXT,
  image_url TEXT,
  creator_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Community members join table
CREATE TABLE community_members (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  community_id UUID REFERENCES communities(id) ON DELETE CASCADE,
  role VARCHAR DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, community_id)
);

-- Bets table
CREATE TABLE bets (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  description TEXT NOT NULL,
  bet_type VARCHAR DEFAULT 'binary' CHECK (bet_type IN ('binary', 'overunder')),
  community_id UUID REFERENCES communities(id) ON DELETE SET NULL,
  creator_id UUID REFERENCES users(id) ON DELETE CASCADE,
  deadline TIMESTAMP WITH TIME ZONE NOT NULL,
  fixed_share_price DECIMAL(10,2) DEFAULT 1.00,
  resolution_status VARCHAR DEFAULT 'open' CHECK (resolution_status IN ('open', 'resolved')),
  resolved_outcome VARCHAR CHECK (resolved_outcome IN ('yes', 'no', 'over', 'under')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Shares owned table
CREATE TABLE shares_owned (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  bet_id UUID REFERENCES bets(id) ON DELETE CASCADE,
  side VARCHAR NOT NULL CHECK (side IN ('yes', 'no', 'over', 'under')),
  shares_owned INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, bet_id, side)
);

-- Wallet balances table (virtual balances for custodial system)
CREATE TABLE wallet_balances (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  balance DECIMAL(10,2) DEFAULT 0.00,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_user_wallets_user ON user_wallets(user_id);
CREATE INDEX idx_user_wallets_address ON user_wallets(wallet_address);
CREATE INDEX idx_bets_creator ON bets(creator_id);
CREATE INDEX idx_bets_community ON bets(community_id);
CREATE INDEX idx_bets_deadline ON bets(deadline);
CREATE INDEX idx_shares_user_bet ON shares_owned(user_id, bet_id);
CREATE INDEX idx_community_members_user ON community_members(user_id);
CREATE INDEX idx_community_members_community ON community_members(community_id);

-- Row Level Security (RLS) policies
ALTER TABLE user_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE communities ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE bets ENABLE ROW LEVEL SECURITY;
ALTER TABLE shares_owned ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_balances ENABLE ROW LEVEL SECURITY;

-- User wallets policies (users can only access their own wallet data)
CREATE POLICY "Users can view own wallet" ON user_wallets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own wallet" ON user_wallets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own wallet" ON user_wallets FOR UPDATE USING (auth.uid() = user_id);

-- Users policies
CREATE POLICY "Users can view all users" ON users FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON users FOR INSERT WITH CHECK (auth.uid() = id);

-- Communities policies
CREATE POLICY "Communities are publicly readable" ON communities FOR SELECT USING (true);
CREATE POLICY "Users can create communities" ON communities FOR INSERT WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "Creators can update communities" ON communities FOR UPDATE USING (auth.uid() = creator_id);

-- Community members policies
CREATE POLICY "Community members can view memberships" ON community_members FOR SELECT USING (true);
CREATE POLICY "Users can join communities" ON community_members FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can leave communities" ON community_members FOR DELETE USING (auth.uid() = user_id);

-- Bets policies
CREATE POLICY "Bets are publicly readable" ON bets FOR SELECT USING (true);
CREATE POLICY "Users can create bets" ON bets FOR INSERT WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "Creators can update bets" ON bets FOR UPDATE USING (auth.uid() = creator_id);

-- Shares policies
CREATE POLICY "Users can view all shares" ON shares_owned FOR SELECT USING (true);
CREATE POLICY "Users can manage own shares" ON shares_owned FOR ALL USING (auth.uid() = user_id);

-- Wallet balances policies
CREATE POLICY "Users can view own balance" ON wallet_balances FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own balance" ON wallet_balances FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own balance" ON wallet_balances FOR UPDATE USING (auth.uid() = user_id);

-- Function to automatically create user profile on auth signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- This will be handled by the application instead
  RETURN NEW;
END;
$$;

-- Trigger for new user signup (disabled for now, handled by app)
-- CREATE TRIGGER on_auth_user_created
--   AFTER INSERT ON auth.users
--   FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();