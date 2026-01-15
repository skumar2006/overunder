-- Migration: Add Privy User ID support
-- Run this in your Supabase SQL Editor

-- Add privy_user_id column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS privy_user_id TEXT UNIQUE;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_users_privy_user_id ON users(privy_user_id);

-- Update RLS policies to work with privy_user_id
-- Note: You'll need to update your auth logic to use privy_user_id instead of auth.uid()

-- Optional: If you want to migrate existing data, you can run:
-- UPDATE users SET privy_user_id = id::text WHERE privy_user_id IS NULL;
