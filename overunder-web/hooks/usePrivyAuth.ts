'use client';

import { usePrivy, useWallets } from '@privy-io/react-auth';
import { useAccount, useChainId } from 'wagmi';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import CryptoJS from 'crypto-js';

function uuidFromString(input: string): string {
  const hashHex = CryptoJS.SHA1(input).toString();
  // Take first 16 bytes (32 hex chars)
  let hex = hashHex.slice(0, 32).toLowerCase();
  // Ensure version (5) and variant (RFC4122)
  // Set the 13th hex char (index 12) to '5'
  hex = hex.slice(0, 12) + '5' + hex.slice(13);
  // Set the 17th hex char (index 16) high bits to 10xx -> 8,9,a,b; force to 'a'
  const variantNibble = 'a';
  hex = hex.slice(0, 16) + variantNibble + hex.slice(17);
  // Format as UUID: 8-4-4-4-12
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join('-');
}

export interface User {
  id: string;
  email?: string;
  username?: string;
  wallet_address?: string;
}

export function usePrivyAuth() {
  const {
    ready,
    authenticated,
    user: privyUser,
    login,
    logout,
    linkEmail,
    linkWallet,
    unlinkEmail,
    unlinkWallet,
  } = usePrivy();

  const { wallets } = useWallets();
  const { address, isConnected } = useAccount();
  const chainId = useChainId();

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState(0);

  // Initialize user data when Privy user changes
  useEffect(() => {
    async function initializeUser() {
      if (!ready) {
        // Do not block UI while Privy bootstraps; allow login button to be clickable
        setLoading(false);
        return;
      }

      if (!authenticated || !privyUser) {
        setUser(null);
        setBalance(0);
        setLoading(false);
        return;
      }

      try {
        // Map Privy DID to UUID for DB compatibility
        const privyDid = privyUser.id; // e.g., did:privy:xxxx
        const userId = uuidFromString(privyDid);
        const email = privyUser.email?.address;
        const walletAddress = address;

        // Check if user exists in Supabase
        let { data: existingUser } = await supabase
          .from('users')
          .select('*')
          .eq('id', userId)
          .single();

        if (!existingUser && email) {
          // Create user if doesn't exist
          const { data: newUser } = await supabase
            .from('users')
            .insert({
              id: userId,
              email,
              username: email.split('@')[0],
              wallet_address: walletAddress,
            })
            .select()
            .single();

          existingUser = newUser;

          // Create initial balance for new users
          if (newUser) {
            await supabase
              .from('wallet_balances')
              .insert({
                user_id: userId,
                balance: 1000.00, // $1000 starting balance
              });
          }
        }

        // Update wallet address if it changed
        if (existingUser && walletAddress && existingUser.wallet_address !== walletAddress) {
          await supabase
            .from('users')
            .update({ wallet_address: walletAddress })
            .eq('id', userId);
          existingUser.wallet_address = walletAddress;
        }

        // Get user balance
        const { data: balanceData } = await supabase
          .from('wallet_balances')
          .select('balance')
          .eq('user_id', userId)
          .single();

        setUser({
          id: userId,
          email: existingUser?.email || email,
          username: existingUser?.username || email?.split('@')[0],
          wallet_address: walletAddress,
        });
        setBalance(balanceData?.balance || 0);

      } catch (error) {
        console.error('Error initializing user:', error);
        setUser(null);
        setBalance(0);
      } finally {
        setLoading(false);
      }
    }

    initializeUser();
  }, [ready, authenticated, privyUser, address]);

  return {
    // User state
    user,
    loading,
    balance,
    
    // Wallet state
    isConnected: isConnected && authenticated,
    address,
    chainId,
    wallets,
    
    // Privy methods
    login,
    logout,
    linkEmail,
    linkWallet,
    unlinkEmail,
    unlinkWallet,
    
    // Auth state
    ready,
    authenticated,
    privyUser,
  };
}