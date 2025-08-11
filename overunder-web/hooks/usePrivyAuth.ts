'use client';

import { usePrivy, useWallets } from '@privy-io/react-auth';
import { useAccount, useChainId } from 'wagmi';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';


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
        // Keep loading true while Privy bootstraps
        setLoading(true);
        return;
      }

      if (!authenticated || !privyUser) {
        setUser(null);
        setBalance(0);
        setLoading(false);
        return;
      }

      // Set loading true while creating/fetching user
      setLoading(true);

      console.log('🔍 Starting user initialization...', {
        hasPrivyUser: !!privyUser,
        privyUserId: privyUser?.id,
        authenticated,
        ready,
        address
      });

      try {
        // Extract UUID from Privy user - sometimes it's in id, sometimes in userId
        let userId = privyUser.id;
        
        // If the id is a DID format, look for the actual UUID in other fields
        if (userId.startsWith('did:privy:')) {
                  // Try to get the UUID from other fields or extract from DID
        userId = privyUser.userId || privyUser.sub || privyUser.id.replace('did:privy:', '');
        }
        
        console.log('🔍 Privy User Debug:', {
          originalId: privyUser.id,
          extractedUserId: userId,
          userId: privyUser.userId,
          sub: privyUser.sub,
          allFields: Object.keys(privyUser)
        });
        
        const email = privyUser.email?.address;
        
        // Get wallet address from Privy user object (embedded wallet) or wagmi
        let walletAddress = address; // From wagmi useAccount
        
        // If wagmi doesn't have address yet, try to get from Privy embedded wallet
        if (!walletAddress && privyUser.wallet) {
          walletAddress = privyUser.wallet.address;
        }
        
        // If still no address, try from wallets array
        if (!walletAddress && wallets && wallets.length > 0) {
          walletAddress = wallets[0].address;
        }



        console.log('🔍 Attempting to fetch user from Supabase with ID:', userId);
        
        // Try to fetch user from Supabase (may fail due to RLS)
        let { data: existingUser, error: fetchError } = await supabase
          .from('users')
          .select('*')
          .eq('id', userId)
          .single();
          
        console.log('🔍 Supabase fetch result:', {
          existingUser,
          fetchError,
          fetchErrorCode: fetchError?.code,
          fetchErrorMessage: fetchError?.message,
          fetchErrorDetails: fetchError?.details,
          fetchErrorHint: fetchError?.hint
        });



        if (!existingUser && email) {
          // Create user via server API to bypass RLS
          try {
            const response = await fetch('/api/users', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                id: userId,
                email,
                username: email.split('@')[0],
                wallet_address: walletAddress,
              }),
            });
            
            console.log('🔍 Server API response status:', response.status, response.statusText);
            
            if (response.ok) {
              const { data: userData } = await response.json();
              console.log('✅ User created via server API:', userData);
              existingUser = userData;
            } else {
              const errorData = await response.json().catch(() => ({}));
              console.error('❌ Server API error:', {
                status: response.status,
                statusText: response.statusText,
                errorData
              });
              throw new Error(`Server API error: ${response.status} - ${JSON.stringify(errorData)}`);
            }
          } catch (apiError) {
            // Fall back to direct Supabase insert
            const { data: newUser, error: insertError } = await supabase
              .from('users')
              .insert({
                id: userId,
                email,
                username: email.split('@')[0],
                wallet_address: walletAddress,
              })
              .select()
              .single();
            
            if (!insertError) {
              existingUser = newUser;
            } else {
              throw insertError;
            }
          }

          // Create initial balance for new users (handled by server API)
          // The /api/users endpoint already creates the wallet balance
        }

        // Update wallet address if it changed or was previously null
        if (existingUser && walletAddress && existingUser.wallet_address !== walletAddress) {
          try {
            await supabase
              .from('users')
              .update({ wallet_address: walletAddress })
              .eq('id', userId);
            existingUser.wallet_address = walletAddress;
          } catch (updateError) {
            // Try via server API if direct update fails
            try {
              await fetch('/api/users/update-wallet', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, walletAddress }),
              });
              existingUser.wallet_address = walletAddress;
            } catch (apiError) {
              // Silently fail - not critical
            }
          }
        }

        // No longer using custodial balance - using real on-chain ETH
        setUser({
          id: userId,
          email: existingUser?.email || email,
          username: existingUser?.username || email?.split('@')[0],
          wallet_address: walletAddress,
        });
        setBalance(0); // Not used anymore - real ETH balance is shown in navbar

      } catch (error) {
        console.error('Error initializing user:', error);
        console.error('Error details:', {
          message: error?.message || 'No message',
          code: error?.code || 'No code',
          details: error?.details || 'No details',
          stack: error?.stack || 'No stack',
          name: error?.name || 'No name',
          cause: error?.cause || 'No cause',
          toString: error?.toString?.() || 'Cannot stringify',
          keys: Object.keys(error || {}),
          errorType: typeof error,
          isError: error instanceof Error
        });
        
        // Fallback: Create a basic user object even if Supabase fails
        if (privyUser) {
          const userId = privyUser.id;
          const email = privyUser.email?.address;
          
          setUser({
            id: userId,
            email: email,
            username: email?.split('@')[0] || 'user',
            wallet_address: address,
          });
          setBalance(1000); // Default balance
        } else {
          setUser(null);
          setBalance(0);
        }
      } finally {
        setLoading(false);
      }
    }

    initializeUser();
  }, [ready, authenticated, privyUser?.id]);



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