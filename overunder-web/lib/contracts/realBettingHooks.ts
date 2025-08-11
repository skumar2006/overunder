'use client';

import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther } from 'viem';
import contractData from './OverunderUpgradeable.json';
import { getEnvironmentConfig, getContractConfig } from './config';

const { defaultChainId } = getEnvironmentConfig();
const { overunderAddress: CONTRACT_ADDRESS } = getContractConfig(defaultChainId);

// Fallback to environment variable if config doesn't work
const FINAL_CONTRACT_ADDRESS = CONTRACT_ADDRESS || (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as `0x${string}`);

/**
 * Hook for placing real on-chain bets with ETH
 */
export function useRealBetting() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const placeBet = async (betId: number, optionIndex: number, amountInEth: string) => {
    try {
      const amountInWei = parseEther(amountInEth);
      const minimumWei = parseEther('0.001'); // 0.001 ETH minimum
      
      console.log('🎯 Placing real on-chain bet:', {
        betId,
        optionIndex,
        amountInEth,
        amountInWei: amountInWei.toString(),
        contractAddress: FINAL_CONTRACT_ADDRESS,
        configAddress: CONTRACT_ADDRESS,
        envAddress: process.env.NEXT_PUBLIC_CONTRACT_ADDRESS,
        minimumRequired: minimumWei.toString()
      });

      // Validate minimum amount
      if (amountInWei < minimumWei) {
        throw new Error('Minimum bet amount is 0.001 ETH');
      }

      const txConfig = {
        address: FINAL_CONTRACT_ADDRESS,
        abi: contractData.abi,
        functionName: 'placeWager',
        args: [BigInt(betId), BigInt(optionIndex)],
        value: amountInWei,
        gas: BigInt(500000), // Explicit gas limit
      };

      console.log('📝 Transaction config:', txConfig);

      await writeContract(txConfig);
    } catch (err) {
      console.error('Error placing bet:', err);
      throw err;
    }
  };

  return {
    placeBet,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  };
}

/**
 * Hook for providing liquidity to markets (optional - for market makers)
 */
export function useProvideLiquidity() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const provideLiquidity = async (betId: number, amountInEth: string) => {
    try {
      console.log('💰 Providing liquidity to market:', {
        betId,
        amountInEth,
        contractAddress: CONTRACT_ADDRESS
      });

      await writeContract({
        address: CONTRACT_ADDRESS as `0x${string}`,
        abi: contractData.abi,
        functionName: 'provideLiquidity',
        args: [betId],
        value: parseEther(amountInEth),
      });
    } catch (err) {
      console.error('Error providing liquidity:', err);
      throw err;
    }
  };

  return {
    provideLiquidity,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  };
}