'use client';

import { useState } from 'react';
import { useWalletClient, usePublicClient } from 'wagmi';
import { parseEther } from 'viem';
import { useWallets } from '@privy-io/react-auth';
import { ethers } from 'ethers';
import { supabase } from '@/lib/supabase';
import contractData from './OverunderUpgradeable.json';
import { getEnvironmentConfig, getContractConfig } from './config';

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

// Hook for creating bets on-chain using Privy + Wagmi
export function usePrivyCreateBet() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const { wallets } = useWallets();

  const createBet = async (params: CreateBetParams, userId: string): Promise<CreateBetResult> => {
    setLoading(true);
    setError(null);

    try {
      console.log('🚀 Creating bet on-chain with params:', params);

      // We will attempt wagmi first; if unavailable, fall back to Privy embedded wallet + ethers

      // Get network config
      const { defaultChainId } = getEnvironmentConfig();
      const contractConfig = getContractConfig(defaultChainId);

      console.log('📡 Network config:', {
        chainId: defaultChainId,
        contractAddress: contractConfig.overunderAddress,
      });

      // Ensure user exists in users table
      try {
        const { data: existingUser } = await supabase!
          .from('users')
          .select('id')
          .eq('id', userId)
          .single();

        if (!existingUser) {
          await supabase!
            .from('users')
            .insert({
              id: userId,
              username: `user_${userId.slice(0, 8)}`,
              wallet_address: walletClient.account.address,
            });
          console.log('👤 Created user profile');
        }
      } catch (userError) {
        console.log('ℹ️ User profile handling:', userError);
      }

      // Convert deadline to timestamp
      const deadlineTimestamp = BigInt(Math.floor(params.deadline.getTime() / 1000));

      // Convert stake amount to wei
      const stakeAmountWei = parseEther(params.stakeAmount);

      console.log('💰 Stake amount debug:', {
        ethString: params.stakeAmount,
        ethNumber: parseFloat(params.stakeAmount),
        wei: stakeAmountWei.toString(),
        weiNumber: Number(stakeAmountWei),
        requiredWei: '3300000000000000',
        meetsRequirement: Number(stakeAmountWei) >= 3300000000000000
      });

      let txHash: `0x${string}` | undefined;
      let receipt: any | undefined;

      // Optional dev mode: if no funds, short-circuit and simulate success
      const devNoFunds = process.env.NEXT_PUBLIC_DEV_NO_FUNDS === 'true';
      
      console.log('🔧 Dev mode check:', {
        devNoFunds,
        envVar: process.env.NEXT_PUBLIC_DEV_NO_FUNDS
      });

      if (walletClient && publicClient) {
        // Optional balance check
        try {
          const bal = await publicClient.getBalance({ address: walletClient.account.address });
          if (devNoFunds && bal < stakeAmountWei) {
            const mockId = Math.floor(Date.now() / 1000);
            const mockTx = `0xdevmock${mockId.toString(16)}` as `0x${string}`;
            return { success: true, transactionHash: mockTx, betId: mockId };
          }
        } catch {}
        // Wagmi path
        txHash = await walletClient.writeContract({
          address: contractConfig.overunderAddress,
          abi: FRESH_ABI,
          functionName: 'createBet',
          args: [
            params.question,
            params.description,
            params.bettingOptions,
            deadlineTimestamp,
            params.category
          ],
          value: stakeAmountWei,
        });
        receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
      } else {
        // Fallback to Privy embedded wallet + ethers signer
        const embedded = wallets && wallets.length > 0 ? wallets[0] : undefined;
        if (!embedded) {
          throw new Error('Wallet not connected. Please connect your wallet first.');
        }
        const ethProvider = await embedded.getEthereumProvider();
        const browserProvider = new ethers.BrowserProvider(ethProvider as any);
        const signer = await browserProvider.getSigner();
        // Optional balance check for dev
        try {
          const bal = await browserProvider.getBalance(await signer.getAddress());
          if (devNoFunds && bal < stakeAmountWei) {
            const mockId = Math.floor(Date.now() / 1000);
            const mockTx = `0xdevmock${mockId.toString(16)}` as `0x${string}`;
            return { success: true, transactionHash: mockTx, betId: mockId };
          }
        } catch {}
        const contract = new ethers.Contract(
          contractConfig.overunderAddress,
          FRESH_ABI,
          signer
        );
        const tx = await contract.createBet(
          params.question,
          params.description,
          params.bettingOptions,
          deadlineTimestamp,
          params.category,
          { value: stakeAmountWei }
        );
        const mined = await tx.wait();
        txHash = tx.hash as `0x${string}`;
        receipt = mined;
      }

      console.log('✅ Transaction submitted:', txHash);

      if (receipt.status !== 'success') {
        throw new Error('Transaction failed');
      }

      console.log('📋 Transaction receipt:', receipt);

      // Extract bet ID from logs
      let betId: number | undefined;

      // Parse logs to find BetCreated event
      for (const log of receipt.logs) {
        try {
          if (log.address.toLowerCase() === contractConfig.overunderAddress.toLowerCase()) {
            // Parse the log to extract bet ID
            const decodedLog = publicClient.parseEventLogs({
              abi: FRESH_ABI,
              logs: [log],
              eventName: 'BetCreated'
            })[0];
            
            if (decodedLog) {
              betId = Number(decodedLog.args.betId);
              console.log('🎯 Extracted bet ID from logs:', betId);
              break;
            }
          }
        } catch (e) {
          // Not the log we're looking for, continue
        }
      }

      if (!betId) {
        console.warn('⚠️ Could not extract bet ID from transaction logs');
        // Try to get the next bet ID by calling the contract
        try {
          const nextBetId = await publicClient.readContract({
            address: contractConfig.overunderAddress,
            abi: FRESH_ABI,
            functionName: 'nextBetId',
          });
          betId = Number(nextBetId) - 1; // The bet we just created
          console.log('🔍 Estimated bet ID:', betId);
        } catch (e) {
          console.error('Failed to get bet ID from contract:', e);
          throw new Error('Could not determine bet ID. Transaction succeeded but bet ID unknown.');
        }
      }

      return {
        success: true,
        transactionHash: txHash,
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