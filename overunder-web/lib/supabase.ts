import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('🔍 Supabase Debug - Environment variables:', {
  url: supabaseUrl ? supabaseUrl.slice(0, 30) + '...' : 'MISSING',
  key: supabaseAnonKey ? supabaseAnonKey.slice(0, 30) + '...' : 'MISSING',
  hasUrl: !!supabaseUrl,
  hasKey: !!supabaseAnonKey
});

let supabaseClient = null;

try {
  if (supabaseUrl && supabaseAnonKey) {
    console.log('🔍 Supabase Debug - Attempting to create client...');
    supabaseClient = createClient<Database>(supabaseUrl, supabaseAnonKey);
    console.log('🔍 Supabase Debug - Client created successfully');
  } else {
    console.log('🔍 Supabase Debug - Missing environment variables, client not created');
  }
} catch (error) {
  console.error('🔍 Supabase Debug - Error creating client:', error);
}

export const supabase = supabaseClient;

// Server-side client for server components
export const createServerSupabaseClient = () => {
  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }
  return createClient<Database>(supabaseUrl, supabaseAnonKey);
}; 