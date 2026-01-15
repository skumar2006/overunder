import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { useState } from 'react';
import contractData from './OverunderUpgradeable.json';
import { getEnvironmentConfig } from './config';

const { CONTRACT_ADDRESS } = getEnvironmentConfig();

/**
 * Hook to propose a bet resolution (creator only)
 */
export function useProposeBetResolution() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const proposeBetResolution = async (betId: number, outcome: number) => {
    try {
      await writeContract({
        address: CONTRACT_ADDRESS as `0x${string}`,
        abi: contractData.abi,
        functionName: 'proposeBetResolution',
        args: [betId, outcome],
      });
    } catch (err) {
      console.error('Error proposing resolution:', err);
      throw err;
    }
  };

  return {
    proposeBetResolution,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  };
}

/**
 * Hook to initiate a dispute
 */
export function useInitiateDispute() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const initiateDispute = async (betId: number, proposedOutcome: number, stakeAmount: string = '0.01') => {
    try {
      await writeContract({
        address: CONTRACT_ADDRESS as `0x${string}`,
        abi: contractData.abi,
        functionName: 'initiateDispute',
        args: [betId, proposedOutcome],
        value: BigInt(Math.floor(parseFloat(stakeAmount) * 1e18)), // Convert ETH to wei
      });
    } catch (err) {
      console.error('Error initiating dispute:', err);
      throw err;
    }
  };

  return {
    initiateDispute,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  };
}

/**
 * Hook to vote on a dispute
 */
export function useVoteOnDispute() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const voteOnDispute = async (betId: number, outcome: number) => {
    try {
      await writeContract({
        address: CONTRACT_ADDRESS as `0x${string}`,
        abi: contractData.abi,
        functionName: 'voteOnDispute',
        args: [betId, outcome],
      });
    } catch (err) {
      console.error('Error voting on dispute:', err);
      throw err;
    }
  };

  return {
    voteOnDispute,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  };
}

/**
 * Hook to resolve a dispute after voting period
 */
export function useResolveDispute() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const resolveDispute = async (betId: number) => {
    try {
      await writeContract({
        address: CONTRACT_ADDRESS as `0x${string}`,
        abi: contractData.abi,
        functionName: 'resolveDispute',
        args: [betId],
      });
    } catch (err) {
      console.error('Error resolving dispute:', err);
      throw err;
    }
  };

  return {
    resolveDispute,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  };
}

/**
 * Hook to get dispute status
 */
export function useGetDisputeStatus(betId: number) {
  const { data, isError, isLoading, refetch } = useReadContract({
    address: CONTRACT_ADDRESS as `0x${string}`,
    abi: contractData.abi,
    functionName: 'getDisputeStatus',
    args: [betId],
  });

  return {
    disputeStatus: data ? {
      isDisputed: data[0] as boolean,
      proposedByCreator: Number(data[1]),
      proposedByDisputer: Number(data[2]),
      votingEndsAt: Number(data[3]),
      totalVotes: Number(data[4]),
      outcomesVoteCounts: (data[5] as bigint[]).map(count => Number(count)),
    } : null,
    isError,
    isLoading,
    refetch,
  };
}

/**
 * Hook to check if user can vote
 */
export function useCanVote(betId: number, voterAddress: `0x${string}`) {
  const { data, isError, isLoading } = useReadContract({
    address: CONTRACT_ADDRESS as `0x${string}`,
    abi: contractData.abi,
    functionName: 'canVote',
    args: [betId, voterAddress],
  });

  return {
    canVote: data as boolean,
    isError,
    isLoading,
  };
}

/**
 * Hook to get vote weight for a user
 */
export function useGetVoteWeight(betId: number, voterAddress: `0x${string}`) {
  const { data, isError, isLoading } = useReadContract({
    address: CONTRACT_ADDRESS as `0x${string}`,
    abi: contractData.abi,
    functionName: 'getVoteWeight',
    args: [betId, voterAddress],
  });

  return {
    voteWeight: data ? Number(data) : 0,
    isError,
    isLoading,
  };
}

/**
 * Hook to get dispute constants
 */
export function useDisputeConstants() {
  const { data: disputePeriod } = useReadContract({
    address: CONTRACT_ADDRESS as `0x${string}`,
    abi: contractData.abi,
    functionName: 'DISPUTE_PERIOD',
  });

  const { data: votingPeriod } = useReadContract({
    address: CONTRACT_ADDRESS as `0x${string}`,
    abi: contractData.abi,
    functionName: 'VOTING_PERIOD',
  });

  const { data: minDisputeStake } = useReadContract({
    address: CONTRACT_ADDRESS as `0x${string}`,
    abi: contractData.abi,
    functionName: 'MIN_DISPUTE_STAKE',
  });

  return {
    disputePeriod: disputePeriod ? Number(disputePeriod) : 86400, // 24 hours default
    votingPeriod: votingPeriod ? Number(votingPeriod) : 172800, // 48 hours default
    minDisputeStake: minDisputeStake ? minDisputeStake.toString() : '10000000000000000', // 0.01 ETH in wei
  };
}