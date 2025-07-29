-- OverUnder Database Schema
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  email VARCHAR UNIQUE NOT NULL,
  wallet_address VARCHAR UNIQUE NOT NULL,
  username VARCHAR UNIQUE NOT NULL,
  bio TEXT,
  profile_pic_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

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

-- Wallet balances table
CREATE TABLE wallet_balances (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  balance DECIMAL(10,2) DEFAULT 0.00,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_bets_creator ON bets(creator_id);
CREATE INDEX idx_bets_community ON bets(community_id);
CREATE INDEX idx_bets_deadline ON bets(deadline);
CREATE INDEX idx_shares_user_bet ON shares_owned(user_id, bet_id);
CREATE INDEX idx_community_members_user ON community_members(user_id);
CREATE INDEX idx_community_members_community ON community_members(community_id);

-- Row Level Security (RLS) policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE communities ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE bets ENABLE ROW LEVEL SECURITY;
ALTER TABLE shares_owned ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_balances ENABLE ROW LEVEL SECURITY;

-- Users can read all users but only update their own
CREATE POLICY "Users can view all users" ON users FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid()::text = id::text);
CREATE POLICY "Users can insert own profile" ON users FOR INSERT WITH CHECK (auth.uid()::text = id::text);

-- Communities are publicly readable
CREATE POLICY "Communities are publicly readable" ON communities FOR SELECT USING (true);
CREATE POLICY "Users can create communities" ON communities FOR INSERT WITH CHECK (auth.uid()::text = creator_id::text);
CREATE POLICY "Creators can update communities" ON communities FOR UPDATE USING (auth.uid()::text = creator_id::text);

-- Community members policies
CREATE POLICY "Community members are publicly readable" ON community_members FOR SELECT USING (true);
CREATE POLICY "Users can join communities" ON community_members FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);
CREATE POLICY "Users can leave communities" ON community_members FOR DELETE USING (auth.uid()::text = user_id::text);

-- Bets are publicly readable
CREATE POLICY "Bets are publicly readable" ON bets FOR SELECT USING (true);
CREATE POLICY "Users can create bets" ON bets FOR INSERT WITH CHECK (auth.uid()::text = creator_id::text);
CREATE POLICY "Creators can update bets" ON bets FOR UPDATE USING (auth.uid()::text = creator_id::text);

-- Shares are publicly readable but users can only modify their own
CREATE POLICY "Shares are publicly readable" ON shares_owned FOR SELECT USING (true);
CREATE POLICY "Users can manage own shares" ON shares_owned FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);
CREATE POLICY "Users can update own shares" ON shares_owned FOR UPDATE USING (auth.uid()::text = user_id::text);

-- Wallet balances are private to the user
CREATE POLICY "Users can view own balance" ON wallet_balances FOR SELECT USING (auth.uid()::text = user_id::text);
CREATE POLICY "Users can update own balance" ON wallet_balances FOR UPDATE USING (auth.uid()::text = user_id::text);
CREATE POLICY "Users can create own balance" ON wallet_balances FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

-- Insert some sample data
INSERT INTO communities (name, description, creator_id) VALUES 
  ('Tech Predictions', 'Predictions about technology and startups', uuid_generate_v4()),
  ('Sports Betting', 'Sports outcomes and predictions', uuid_generate_v4()),
  ('Entertainment', 'Movies, music, and celebrity predictions', uuid_generate_v4()); 