'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { supabase } from '@/lib/supabase';

interface User {
  id: string;
  wallet_address: string;
  username?: string;
  profile_pic_url?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isConnected: boolean;
  address: string | undefined;
  connect: () => void;
  disconnect: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();

  useEffect(() => {
    if (isConnected && address) {
      handleWalletConnection(address);
    } else {
      setUser(null);
      setLoading(false);
    }
  }, [isConnected, address]);

  const handleWalletConnection = async (walletAddress: string) => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Get or create user in Supabase
      let { data: existingUser } = await supabase
        .from('users')
        .select('*')
        .eq('wallet_address', walletAddress)
        .single();

      if (!existingUser) {
        // Create new user
        const { data: newUser, error } = await supabase
          .from('users')
          .insert({
            wallet_address: walletAddress,
            username: `user_${walletAddress.slice(-6)}`,
          })
          .select()
          .single();

        if (error) {
          console.error('Error creating user:', error);
          return;
        }

        // Create initial wallet balance
        if (newUser) {
          await supabase
            .from('wallet_balances')
            .insert({
              user_id: newUser.id,
              balance: 100, // $100 signup bonus
            });
          
          existingUser = newUser;
        }
      }

      setUser(existingUser);
    } catch (error) {
      console.error('Wallet connection error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = () => {
    if (connectors[0]) {
      connect({ connector: connectors[0] });
    }
  };

  const handleDisconnect = () => {
    disconnect();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      isConnected, 
      address,
      connect: handleConnect, 
      disconnect: handleDisconnect 
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