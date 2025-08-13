'use client';

import { useState } from 'react';
import { ethers } from 'ethers';
import { supabase } from '@/lib/supabase';
import { walletService } from '@/lib/walletService';
import contractData from './OverunderUpgradeable.json';
import { getEnvironmentConfig, getContractConfig, NETWORKS } from './config';

const FRESH_ABI = contractData.abi as any;

export interface CreateBetParams {
  question: string;
  description: string;
  bettingOptions: string[];
  deadline: Date;
  category: string;
  stakeAmount: string; // ETH amount
}

export interface CreateBetResult {
  success: boolean;
  transactionHash?: string;
  betId?: number;
  error?: string;
}

// Hook for creating bets on-chain
export function useCreateBet() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createBet = async (params: CreateBetParams, userId: string): Promise<CreateBetResult> => {
    setLoading(true);
    setError(null);

    try {
      console.log('🚀 Creating bet on-chain with params:', params);

      // Get network config
      const { defaultChainId } = getEnvironmentConfig();
      const contractConfig = getContractConfig(defaultChainId);
      const NETWORK_BY_CHAIN_ID = {
        31337: NETWORKS.localhost,
        84532: NETWORKS.baseSepolia,
        8453: NETWORKS.baseMainnet,
      } as const;
      const selectedNetwork = NETWORK_BY_CHAIN_ID[defaultChainId];

      console.log('📡 Network config:', {
        chainId: defaultChainId,
        contractAddress: contractConfig.overunderAddress,
        rpcUrl: selectedNetwork.rpcUrl
      });

      // Get user's custodial wallet or create one if it doesn't exist
      let { data: walletData } = await supabase!
        .from('user_wallets')
        .select('encrypted_private_key, wallet_address')
        .eq('user_id', userId)
        .single();

      if (!walletData) {
        console.log('🔑 No wallet found for user, creating one...');
        
        // First, ensure user exists in users table
        try {
          const { data: existingUser } = await supabase!
            .from('users')
            .select('id')
            .eq('id', userId)
            .single();

          if (!existingUser) {
            // Create user profile if it doesn't exist
            const { data: authUser } = await supabase!.auth.getUser();
            await supabase!
              .from('users')
              .insert({
                id: userId,
                email: authUser.user?.email,
                username: authUser.user?.email?.split('@')[0] || `user_${userId.slice(0, 8)}`,
              });
            console.log('👤 Created user profile');
          }
        } catch (userError) {
          console.log('ℹ️ User profile handling:', userError);
        }
        
        // Create a new custodial wallet for the user
        const newWallet = await walletService.generateWallet();
        
        // Store it in the database
        const { data: createdWallet, error: walletError } = await supabase!
          .from('user_wallets')
          .insert({
            user_id: userId,
            wallet_address: newWallet.address,
            encrypted_private_key: newWallet.encryptedPrivateKey,
            created_at: new Date().toISOString()
          })
          .select('encrypted_private_key, wallet_address')
          .single();

        if (walletError || !createdWallet) {
          throw new Error(`Failed to create user wallet: ${walletError?.message || 'Unknown error'}`);
        }

        walletData = createdWallet;
        console.log('✅ Created new custodial wallet:', walletData.wallet_address);

        // Also create a virtual balance entry for the user (with 1000 USD starting balance for testing)
        try {
          await supabase!
            .from('wallet_balances')
            .insert({
              user_id: userId,
              balance: 1000.00 // Starting balance for testing
            });
          console.log('💰 Created initial balance of $1000 for user');
        } catch (balanceError) {
          console.log('ℹ️ Balance already exists or failed to create:', balanceError);
        }
      }

      console.log('🔑 Using custodial wallet:', walletData.wallet_address);

      // Convert deadline to timestamp
      const deadlineTimestamp = Math.floor(params.deadline.getTime() / 1000);

      // Convert stake amount to wei
      const stakeAmountWei = ethers.parseEther(params.stakeAmount);

      console.log('💰 Stake amount:', {
        eth: params.stakeAmount,
        wei: stakeAmountWei.toString()
      });

      // Call the contract createBet function
      const txResult = await walletService.callContract(
        walletData.encrypted_private_key,
        contractConfig.overunderAddress,
        FRESH_ABI,
        'createBet',
        [
          params.question,
          params.description,
          params.bettingOptions,
          deadlineTimestamp,
          params.category
        ],
        params.stakeAmount // Value in ETH
      );

      console.log('✅ Transaction submitted:', txResult.hash);

      // Wait for transaction confirmation
      const provider = new ethers.JsonRpcProvider(selectedNetwork.rpcUrl);
      const receipt = await provider.waitForTransaction(txResult.hash);

      if (!receipt) {
        throw new Error('Transaction failed to confirm');
      }

      console.log('📋 Transaction receipt:', receipt);

      // Extract bet ID from logs
      const contract = new ethers.Contract(contractConfig.overunderAddress, FRESH_ABI, provider);
      let betId: number | undefined;

      // Parse logs to find BetCreated event
      for (const log of receipt.logs) {
        try {
          const parsedLog = contract.interface.parseLog(log);
          if (parsedLog?.name === 'BetCreated') {
            betId = Number(parsedLog.args.betId);
            console.log('🎯 Extracted bet ID from logs:', betId);
            break;
          }
        } catch (e) {
          // Not a log from our contract, continue
        }
      }

      if (!betId) {
        console.warn('⚠️ Could not extract bet ID from transaction logs');
        // Try to get the next bet ID by calling the contract
        try {
          const nextBetId = await contract.nextBetId();
          betId = Number(nextBetId) - 1; // The bet we just created
          console.log('🔍 Estimated bet ID:', betId);
        } catch (e) {
          console.error('Failed to get bet ID from contract:', e);
          throw new Error('Could not determine bet ID. Transaction succeeded but bet ID unknown.');
        }
      }

      return {
        success: true,
        transactionHash: txResult.hash,
        betId
      };

    } catch (error: any) {
      console.error('❌ Error creating bet:', error);
      const errorMessage = error.message || error.reason || 'Failed to create bet on-chain';
      setError(errorMessage);
      
      return {
        success: false,
        error: errorMessage
      };
    } finally {
      setLoading(false);
    }
  };

  return {
    createBet,
    loading,
    error
  };
}