-- Comprehensive fix for all RLS policies to work with Privy authentication
-- This replaces all auth.uid() based policies with permissive ones
-- Security is handled at the application layer since we use custom authentication

-- =============================================================================
-- BETS TABLE
-- =============================================================================
DROP POLICY IF EXISTS "Users can create bets" ON bets;
DROP POLICY IF EXISTS "Creators can update bets" ON bets;
DROP POLICY IF EXISTS "Users can delete their own bets" ON bets;

CREATE POLICY IF NOT EXISTS "Bets are viewable by everyone" ON bets FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "Anyone can create bets" ON bets FOR INSERT WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Anyone can update bets" ON bets FOR UPDATE USING (true);
CREATE POLICY IF NOT EXISTS "Anyone can delete bets" ON bets FOR DELETE USING (true);

-- =============================================================================
-- USERS TABLE
-- =============================================================================
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Users can insert own profile" ON users;

CREATE POLICY IF NOT EXISTS "Users are viewable by everyone" ON users FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "Anyone can create user profiles" ON users FOR INSERT WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Anyone can update user profiles" ON users FOR UPDATE USING (true);

-- =============================================================================
-- WALLET_BALANCES TABLE
-- =============================================================================
DROP POLICY IF EXISTS "Users can view own balance" ON wallet_balances;
DROP POLICY IF EXISTS "Users can insert own balance" ON wallet_balances;
DROP POLICY IF EXISTS "Users can update own balance" ON wallet_balances;
DROP POLICY IF EXISTS "Users can create own balance" ON wallet_balances;

CREATE POLICY IF NOT EXISTS "Balances are viewable by everyone" ON wallet_balances FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "Anyone can create balances" ON wallet_balances FOR INSERT WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Anyone can update balances" ON wallet_balances FOR UPDATE USING (true);

-- =============================================================================
-- SHARES_OWNED TABLE
-- =============================================================================
DROP POLICY IF EXISTS "Users can manage own shares" ON shares_owned;
DROP POLICY IF EXISTS "Users can update own shares" ON shares_owned;

CREATE POLICY IF NOT EXISTS "Shares are viewable by everyone" ON shares_owned FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "Anyone can create shares" ON shares_owned FOR INSERT WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Anyone can update shares" ON shares_owned FOR UPDATE USING (true);
CREATE POLICY IF NOT EXISTS "Anyone can delete shares" ON shares_owned FOR DELETE USING (true);

-- =============================================================================
-- USER_WALLETS TABLE (if it exists)
-- =============================================================================
DROP POLICY IF EXISTS "Users can view own wallet" ON user_wallets;
DROP POLICY IF EXISTS "Users can insert own wallet" ON user_wallets;
DROP POLICY IF EXISTS "Users can update own wallet" ON user_wallets;

-- Only create policies if table exists
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_wallets') THEN
        EXECUTE 'CREATE POLICY IF NOT EXISTS "Wallets are viewable by everyone" ON user_wallets FOR SELECT USING (true)';
        EXECUTE 'CREATE POLICY IF NOT EXISTS "Anyone can create wallets" ON user_wallets FOR INSERT WITH CHECK (true)';
        EXECUTE 'CREATE POLICY IF NOT EXISTS "Anyone can update wallets" ON user_wallets FOR UPDATE USING (true)';
    END IF;
END $$;

-- =============================================================================
-- TRANSACTIONS TABLE (if it exists)
-- =============================================================================
DROP POLICY IF EXISTS "Users can view own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can insert own transactions" ON transactions;

-- Only create policies if table exists
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'transactions') THEN
        EXECUTE 'CREATE POLICY IF NOT EXISTS "Transactions are viewable by everyone" ON transactions FOR SELECT USING (true)';
        EXECUTE 'CREATE POLICY IF NOT EXISTS "Anyone can create transactions" ON transactions FOR INSERT WITH CHECK (true)';
    END IF;
END $$;

-- =============================================================================
-- COMMUNITIES TABLE (if it exists)
-- =============================================================================
DROP POLICY IF EXISTS "Users can create communities" ON communities;
DROP POLICY IF EXISTS "Creators can update communities" ON communities;

-- Only create policies if table exists
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'communities') THEN
        EXECUTE 'CREATE POLICY IF NOT EXISTS "Communities are viewable by everyone" ON communities FOR SELECT USING (true)';
        EXECUTE 'CREATE POLICY IF NOT EXISTS "Anyone can create communities" ON communities FOR INSERT WITH CHECK (true)';
        EXECUTE 'CREATE POLICY IF NOT EXISTS "Anyone can update communities" ON communities FOR UPDATE USING (true)';
    END IF;
END $$;

-- =============================================================================
-- COMMUNITY_MEMBERS TABLE (if it exists)
-- =============================================================================
DROP POLICY IF EXISTS "Users can join communities" ON community_members;
DROP POLICY IF EXISTS "Users can leave communities" ON community_members;

-- Only create policies if table exists
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'community_members') THEN
        EXECUTE 'CREATE POLICY IF NOT EXISTS "Community members are viewable by everyone" ON community_members FOR SELECT USING (true)';
        EXECUTE 'CREATE POLICY IF NOT EXISTS "Anyone can join communities" ON community_members FOR INSERT WITH CHECK (true)';
        EXECUTE 'CREATE POLICY IF NOT EXISTS "Anyone can leave communities" ON community_members FOR DELETE USING (true)';
    END IF;
END $$;

-- =============================================================================
-- VERIFICATION
-- =============================================================================

-- Check all policies are created correctly
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    permissive, 
    cmd,
    CASE 
        WHEN qual = 'true' THEN 'PERMISSIVE'
        WHEN with_check = 'true' THEN 'PERMISSIVE'
        ELSE 'RESTRICTED'
    END as policy_type
FROM pg_policies 
WHERE tablename IN ('bets', 'users', 'wallet_balances', 'shares_owned', 'user_wallets', 'transactions', 'communities', 'community_members')
ORDER BY tablename, policyname;

-- Check RLS status
SELECT 
    schemaname, 
    tablename, 
    rowsecurity,
    CASE WHEN rowsecurity THEN 'ENABLED' ELSE 'DISABLED' END as rls_status
FROM pg_tables 
WHERE tablename IN ('bets', 'users', 'wallet_balances', 'shares_owned', 'user_wallets', 'transactions', 'communities', 'community_members')
ORDER BY tablename;