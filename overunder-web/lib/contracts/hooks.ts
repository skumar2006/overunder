'use client';

import { useReadContract, useWriteContract, useWaitForTransactionReceipt, useAccount, useChainId } from 'wagmi';
import { parseEther } from 'viem';
import { useMemo, useCallback } from 'react';
import { OVERUNDER_ABI } from './abis';
import { getContractConfig, CONTRACT_ADDRESSES } from './config';
import { 
  Bet, 
  BetData, 
  Wager, 
  WagerData, 
  UserProfile, 
  UserStats, 
  CreateBetForm, 
  TransactionResult,
  ContractCallResult 
} from './types';
import { 
  transformBetData, 
  transformWagerData, 
  transformUserProfile,
  handleContractError 
} from './utils';

// Custom hook for contract configuration
export function useContractConfig() {
  const chainId = useChainId();
  
  return useMemo(() => {
    console.log('🔍 Contract Config Debug:', {
      chainId,
      hasChainId: !!chainId,
      configKeys: Object.keys(CONTRACT_ADDRESSES),
      selectedConfig: getContractConfig(chainId)
    });
    
    return getContractConfig(chainId);
  }, [chainId]);
}

// Bet-related hooks
export function useGetBet(betId: number | undefined): ContractCallResult<BetData> {
  const config = useContractConfig();
  
  const { data, error, isLoading } = useReadContract({
    address: config.overunderAddress,
    abi: OVERUNDER_ABI,
    functionName: 'getBet',
    args: betId !== undefined ? [BigInt(betId)] : undefined,
    query: {
      enabled: betId !== undefined,
    },
  });

  const { data: odds } = useReadContract({
    address: config.overunderAddress,
    abi: OVERUNDER_ABI,
    functionName: 'getBetOdds',
    args: betId !== undefined ? [BigInt(betId)] : undefined,
    query: {
      enabled: betId !== undefined,
    },
  });

  return useMemo(() => ({
    data: data ? transformBetData(data as Bet, odds as bigint[]) : undefined,
    error: error ? handleContractError(error) : undefined,
    loading: isLoading,
  }), [data, odds, error, isLoading]);
}

export function useGetAllBets(): ContractCallResult<number[]> {
  const config = useContractConfig();
  
  const { data: betIds, error: idsError, isLoading: idsLoading } = useReadContract({
    address: config.overunderAddress,
    abi: OVERUNDER_ABI,
    functionName: 'getAllBets',
  });

  // Return bet IDs as numbers
  return useMemo(() => ({
    data: betIds ? (betIds as bigint[]).map(id => Number(id)) : undefined,
    error: idsError ? handleContractError(idsError) : undefined,
    loading: idsLoading,
  }), [betIds, idsError, idsLoading]);
}

export function useGetUserBets(address?: string): ContractCallResult<number[]> {
  const config = useContractConfig();
  
  const { data, error, isLoading } = useReadContract({
    address: config.overunderAddress,
    abi: OVERUNDER_ABI,
    functionName: 'getUserBets',
    args: address ? [address as `0x${string}`] : undefined,
    query: {
      enabled: !!address,
    },
  });

  return useMemo(() => ({
    data: data ? (data as bigint[]).map(id => Number(id)) : undefined,
    error: error ? handleContractError(error) : undefined,
    loading: isLoading,
  }), [data, error, isLoading]);
}

export function useGetUserWagers(address?: string): ContractCallResult<number[]> {
  const config = useContractConfig();
  
  const { data, error, isLoading } = useReadContract({
    address: config.overunderAddress,
    abi: OVERUNDER_ABI,
    functionName: 'getUserWagers',
    args: address ? [address as `0x${string}`] : undefined,
    query: {
      enabled: !!address,
    },
  });

  return useMemo(() => ({
    data: data ? (data as bigint[]).map(id => Number(id)) : undefined,
    error: error ? handleContractError(error) : undefined,
    loading: isLoading,
  }), [data, error, isLoading]);
}

export function useGetBetWagers(betId: number | undefined): ContractCallResult<WagerData[]> {
  const config = useContractConfig();
  
  const { data, error, isLoading } = useReadContract({
    address: config.overunderAddress,
    abi: OVERUNDER_ABI,
    functionName: 'getBetWagers',
    args: betId !== undefined ? [BigInt(betId)] : undefined,
    query: {
      enabled: betId !== undefined,
    },
  });

  return useMemo(() => ({
    data: data ? (data as Wager[]).map(transformWagerData) : undefined,
    error: error ? handleContractError(error) : undefined,
    loading: isLoading,
  }), [data, error, isLoading]);
}

export function useGetUserProfile(address?: string): ContractCallResult<UserStats> {
  const config = useContractConfig();
  
  const { data, error, isLoading } = useReadContract({
    address: config.overunderAddress,
    abi: OVERUNDER_ABI,
    functionName: 'userProfiles',
    args: address ? [address as `0x${string}`] : undefined,
    query: {
      enabled: !!address,
    },
  });

  return useMemo(() => ({
    data: data ? transformUserProfile(data as UserProfile) : undefined,
    error: error ? handleContractError(error) : undefined,
    loading: isLoading,
  }), [data, error, isLoading]);
}

export function useGetUserPosition(betId: number | undefined, address?: string, option?: number): ContractCallResult<string> {
  const config = useContractConfig();
  
  const { data, error, isLoading } = useReadContract({
    address: config.overunderAddress,
    abi: OVERUNDER_ABI,
    functionName: 'getUserPosition',
    args: betId !== undefined && address && option !== undefined 
      ? [BigInt(betId), address as `0x${string}`, BigInt(option)] 
      : undefined,
    query: {
      enabled: betId !== undefined && !!address && option !== undefined,
    },
  });

  return useMemo(() => ({
    data: data ? (data as bigint).toString() : undefined,
    error: error ? handleContractError(error) : undefined,
    loading: isLoading,
  }), [data, error, isLoading]);
}

// Write hooks for contract interactions
export function useCreateBet() {
  const config = useContractConfig();
  const { writeContractAsync } = useWriteContract();

  const createBet = useCallback(async (formData: CreateBetForm): Promise<TransactionResult> => {
    try {
      const deadlineTimestamp = Math.floor(formData.deadline.getTime() / 1000);
      
      const hash = await writeContractAsync({
        address: config.overunderAddress,
        abi: OVERUNDER_ABI,
        functionName: 'createBet',
        args: [
          formData.question,
          formData.description,
          formData.bettingOptions,
          BigInt(deadlineTimestamp),
          formData.category,
        ],
        value: parseEther(formData.stakeAmount),
      });

      return { hash, success: true };
    } catch (error) {
      return { 
        hash: '', 
        success: false, 
        error: handleContractError(error) 
      };
    }
  }, [config.overunderAddress, writeContractAsync]);

  return { createBet };
}

export function usePlaceWager() {
  const config = useContractConfig();
  const { writeContractAsync } = useWriteContract();

  const placeWager = useCallback(async (
    betId: number, 
    optionChosen: number, 
    amount: string
  ): Promise<TransactionResult> => {
    try {
      const hash = await writeContractAsync({
        address: config.overunderAddress,
        abi: OVERUNDER_ABI,
        functionName: 'placeWager',
        args: [BigInt(betId), BigInt(optionChosen)],
        value: parseEther(amount),
      });

      return { hash, success: true };
    } catch (error) {
      return { 
        hash: '', 
        success: false, 
        error: handleContractError(error) 
      };
    }
  }, [config.overunderAddress, writeContractAsync]);

  return { placeWager };
}

export function useResolveBet() {
  const config = useContractConfig();
  const { writeContractAsync } = useWriteContract();

  const resolveBet = useCallback(async (
    betId: number, 
    winningOption: number
  ): Promise<TransactionResult> => {
    try {
      const hash = await writeContractAsync({
        address: config.overunderAddress,
        abi: OVERUNDER_ABI,
        functionName: 'resolveBet',
        args: [BigInt(betId), BigInt(winningOption)],
      });

      return { hash, success: true };
    } catch (error) {
      return { 
        hash: '', 
        success: false, 
        error: handleContractError(error) 
      };
    }
  }, [config.overunderAddress, writeContractAsync]);

  return { resolveBet };
}

export function useClaimWinnings() {
  const config = useContractConfig();
  const { writeContractAsync } = useWriteContract();

  const claimWinnings = useCallback(async (betId: number): Promise<TransactionResult> => {
    try {
      const hash = await writeContractAsync({
        address: config.overunderAddress,
        abi: OVERUNDER_ABI,
        functionName: 'claimWinnings',
        args: [BigInt(betId)],
      });

      return { hash, success: true };
    } catch (error) {
      return { 
        hash: '', 
        success: false, 
        error: handleContractError(error) 
      };
    }
  }, [config.overunderAddress, writeContractAsync]);

  return { claimWinnings };
}

export function useUpdateProfile() {
  const config = useContractConfig();
  const { writeContractAsync } = useWriteContract();

  const updateProfile = useCallback(async (username: string): Promise<TransactionResult> => {
    try {
      const hash = await writeContractAsync({
        address: config.overunderAddress,
        abi: OVERUNDER_ABI,
        functionName: 'updateProfile',
        args: [username],
      });

      return { hash, success: true };
    } catch (error) {
      return { 
        hash: '', 
        success: false, 
        error: handleContractError(error) 
      };
    }
  }, [config.overunderAddress, writeContractAsync]);

  return { updateProfile };
}

// Utility hooks
export function useWaitForTransaction(hash?: string) {
  return useWaitForTransactionReceipt({
    hash: hash as `0x${string}`,
    query: { enabled: !!hash },
  });
}

export function useContractStatus() {
  const config = useContractConfig();
  
  return useReadContract({
    address: config.overunderAddress,
    abi: OVERUNDER_ABI,
    functionName: 'getContractStatus',
  });
}

export function useMinimumBetAmount() {
  const config = useContractConfig();
  
  return useReadContract({
    address: config.overunderAddress,
    abi: OVERUNDER_ABI,
    functionName: 'minimumBetAmount',
  });
} 