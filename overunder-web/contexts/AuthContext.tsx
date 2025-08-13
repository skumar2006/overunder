'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import type { User as SupabaseUser } from '@supabase/supabase-js';

interface User {
  id: string;
  email: string;
  wallet_address?: string;
  username: string;
  bio?: string;
  profile_pic_url?: string;
  created_at: string;
  updated_at: string;
  balance?: number;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string, username: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  isConnected: boolean;
  address: string | undefined;
  balance: number;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState(0);

  useEffect(() => {
    // Check if user is already logged in
    checkUser();

    // Listen for auth changes
    const { data: { subscription } } = supabase?.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.id);
        if (event === 'SIGNED_IN' && session?.user) {
          await handleUserSession(session.user);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setBalance(0);
          // Redirect to login on sign out
          if (typeof window !== 'undefined') {
            window.location.href = '/login';
          }
        }
        setLoading(false);
      }
    ) || { data: { subscription: null } };

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const checkUser = async () => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await handleUserSession(session.user);
      } else {
        // No session; still end loading so UI can render sign-in prompts
        setUser(null);
        setBalance(0);
      }
    } catch (error) {
      console.error('Error checking user session:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUserSession = async (authUser: SupabaseUser) => {
    if (!supabase) return;

    try {
      // Get user profile from database
      const { data: userProfile } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (userProfile) {
        // Get wallet balance
        const { data: walletBalance } = await supabase
          .from('wallet_balances')
          .select('balance')
          .eq('user_id', userProfile.id)
          .single();

        setUser({
          ...userProfile,
          email: authUser.email || userProfile.email
        });
        setBalance(walletBalance?.balance || 0);
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  };

  const signUp = async (email: string, password: string, username: string): Promise<{ error?: string }> => {
    if (!supabase) {
      return { error: 'Authentication service not available' };
    }

    try {
      setLoading(true);

      // Check if username is already taken
      const { data: existingUsername } = await supabase
        .from('users')
        .select('id')
        .eq('username', username)
        .single();

      if (existingUsername) {
        return { error: 'Username is already taken' };
      }

      // Sign up with Supabase Auth - disable email confirmation for development
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username: username // Store username in auth metadata
          }
        }
      });

      if (signUpError) {
        return { error: signUpError.message };
      }

      if (data.user) {
        // For development: Auto-confirm email by updating the auth.users table
        // This is safe since we control the database
        try {
          await supabase.rpc('confirm_user_email', { user_id: data.user.id });
        } catch (confirmError) {
          console.log('Could not auto-confirm email, proceeding anyway');
        }

        // Wait a moment for email confirmation to process
        await new Promise(resolve => setTimeout(resolve, 500));

        // Generate a simple mock wallet address for now
        const mockWalletAddress = '0x' + Math.random().toString(16).substr(2, 40);

        // Create user profile
        const { error: profileError } = await supabase
          .from('users')
          .insert({
            id: data.user.id,
            email,
            username,
            wallet_address: mockWalletAddress,
          });

        if (profileError) {
          console.error('Profile creation error:', profileError);
          return { error: `Failed to create user profile: ${profileError.message}` };
        }

        // Create initial wallet balance
        const { error: balanceError } = await supabase
          .from('wallet_balances')
          .insert({
            user_id: data.user.id,
            balance: 1000, // $1000 signup bonus for testing
          });

        if (balanceError) {
          console.error('Balance creation error:', balanceError);
        }

        return { error: undefined };
      }

      return { error: 'Failed to create account' };
    } catch (error) {
      console.error('Sign up error:', error);
      return { error: 'An unexpected error occurred' };
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string): Promise<{ error?: string }> => {
    if (!supabase) {
      return { error: 'Authentication service not available' };
    }

    try {
      setLoading(true);

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { error: error.message };
      }

      return { error: undefined };
    } catch (error) {
      console.error('Sign in error:', error);
      return { error: 'An unexpected error occurred' };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    if (!supabase) return;

    try {
      await supabase.auth.signOut();
      setUser(null);
      setBalance(0);
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      signIn,
      signUp,
      signOut,
      isConnected: !!user,
      address: user?.wallet_address,
      balance
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}