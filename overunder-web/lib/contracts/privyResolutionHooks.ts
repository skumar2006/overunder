'use client';

import { usePrivy, useWallets } from '@privy-io/react-auth';
import { ethers } from 'ethers';
import { Address } from 'viem';
import { getContractConfig, NETWORKS, getEnvironmentConfig } from './config';
import contractData from './OverunderUpgradeable.json';

const FRESH_ABI = contractData.abi as any;

export interface TxResult {
  success: boolean;
  transactionHash?: `0x${string}`;
  error?: string;
}

export function usePrivyResolveBet() {
  const { authenticated, sendTransaction } = usePrivy();
  const { wallets } = useWallets();

  const { defaultChainId } = getEnvironmentConfig();
  const contractConfig = getContractConfig(defaultChainId);
  const selectedNetwork = NETWORKS[defaultChainId === 31337 ? 'localhost' : 'baseSepolia'];
  const OVERUNDER_CONTRACT_ADDRESS = contractConfig.overunderAddress as Address;

  const resolveBet = async (betId: number, winningOption: number): Promise<TxResult> => {
    try {
      if (process.env.NEXT_PUBLIC_DEV_NO_FUNDS === 'true') {
        const mockHash = `0x${Math.random().toString(16).slice(2).padEnd(64, '0')}` as `0x${string}`;
        return { success: true, transactionHash: mockHash };
      }

      if (!authenticated) return { success: false, error: 'Not authenticated.' };

      // Get the first available wallet (should be the embedded wallet)
      const wallet = wallets[0];
      if (!wallet) {
        return { success: false, error: 'No wallet available. Please ensure you have a wallet connected.' };
      }

      console.log('🔗 Using wallet:', wallet.address, wallet.walletClientType);

      // Create contract interface for encoding
      const contract = new ethers.Interface(FRESH_ABI);
      const data = contract.encodeFunctionData('resolveBet', [betId, winningOption]);

      // Use Privy's sendTransaction method
      const txResponse = await sendTransaction({
        to: OVERUNDER_CONTRACT_ADDRESS,
        data: data as `0x${string}`,
        value: '0x0', // No ETH being sent
      });

      console.log('✅ Transaction sent:', txResponse.transactionHash);
      return { success: true, transactionHash: txResponse.transactionHash };
      
    } catch (error: any) {
      console.error('❌ Error resolving bet:', error);
      return { success: false, error: error.message || 'Transaction failed' };
    }
  };

  return { resolveBet, selectedNetwork };
}

export function usePrivyClaimWinnings() {
  const { authenticated, sendTransaction } = usePrivy();
  const { wallets } = useWallets();

  const { defaultChainId } = getEnvironmentConfig();
  const contractConfig = getContractConfig(defaultChainId);
  const OVERUNDER_CONTRACT_ADDRESS = contractConfig.overunderAddress as Address;

  const claimWinnings = async (betId: number): Promise<TxResult> => {
    try {
      if (process.env.NEXT_PUBLIC_DEV_NO_FUNDS === 'true') {
        const mockHash = `0x${Math.random().toString(16).slice(2).padEnd(64, '0')}` as `0x${string}`;
        return { success: true, transactionHash: mockHash };
      }

      if (!authenticated) return { success: false, error: 'Not authenticated.' };

      // Get the first available wallet (should be the embedded wallet)
      const wallet = wallets[0];
      if (!wallet) {
        return { success: false, error: 'No wallet available. Please ensure you have a wallet connected.' };
      }

      console.log('🔗 Using wallet for claim:', wallet.address, wallet.walletClientType);

      // Create contract interface for encoding
      const contract = new ethers.Interface(FRESH_ABI);
      const data = contract.encodeFunctionData('claimWinnings', [betId]);

      // Use Privy's sendTransaction method
      const txResponse = await sendTransaction({
        to: OVERUNDER_CONTRACT_ADDRESS,
        data: data as `0x${string}`,
        value: '0x0', // No ETH being sent
      });

      console.log('✅ Claim transaction sent:', txResponse.transactionHash);
      return { success: true, transactionHash: txResponse.transactionHash };
      
    } catch (error: any) {
      console.error('❌ Error claiming winnings:', error);
      return { success: false, error: error.message || 'Transaction failed' };
    }
  };

  return { claimWinnings };
}

