-- Fix users.id column to auto-generate UUIDs
-- This migration ensures the users table has proper UUID generation

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Alternatively, use the newer pgcrypto extension for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Update the users.id column to have a default UUID value
-- This will fix the "null value in column id violates not-null constraint" error
ALTER TABLE users 
  ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- Ensure the privy_user_id column exists (should already be there from previous migration)
ALTER TABLE users ADD COLUMN IF NOT EXISTS privy_user_id TEXT UNIQUE;

-- Create index for better performance on privy_user_id lookups
CREATE INDEX IF NOT EXISTS idx_users_privy_user_id ON users(privy_user_id);

-- Optional: Update any existing users that might have null IDs
-- (This should not be needed if the table was created properly, but just in case)
UPDATE users SET id = gen_random_uuid() WHERE id IS NULL;
