'use client';

import { useState, useEffect, useMemo } from 'react';
import { ethers } from 'ethers';
// Import fresh ABI and network configuration
import contractData from './OverunderUpgradeable.json';
import { CURRENT_NETWORK } from './config';
const FRESH_ABI = JSON.parse(contractData.abi);

// Types
export interface ContractCallResult<T> {
  data: T | undefined;
  error: string | undefined;
  loading: boolean;
}

export interface BetData {
  id: number;
  betId: number;
  question: string;
  description: string;
  creator: string;
  options: string[];
  deadline: Date;
  timeRemaining: number; // in seconds
  totalPayout: string;
  status: 'active' | 'resolved' | 'expired';
  winningOption?: number;
  category: string;
  yesPool: string;
  noPool: string;
  totalPool: string;
  totalPoolAmount: string; // For compatibility
  odds: number[]; // Array of odds for each option
  isResolved: boolean;
}

// Contract configuration from network config
const CONTRACT_ADDRESS = CURRENT_NETWORK.contractAddress;
const RPC_URL = CURRENT_NETWORK.rpcUrl;

// Create ethers provider for read-only operations
const provider = new ethers.JsonRpcProvider(RPC_URL);

// Contract instance for reading
const contract = new ethers.Contract(CONTRACT_ADDRESS, FRESH_ABI, provider);

// Debug contract setup
console.log('🔧 Contract setup:', {
  network: CURRENT_NETWORK.name,
  chainId: CURRENT_NETWORK.chainId,
  address: CONTRACT_ADDRESS,
  rpcUrl: RPC_URL,
  explorer: CURRENT_NETWORK.explorer,
  abiLoaded: !!FRESH_ABI,
  abiLength: FRESH_ABI?.length
});

// Utility functions
export function formatTimeRemaining(deadline: Date | string | number): string {
  const now = new Date();
  
  // Convert deadline to Date object if it's not already
  let deadlineDate: Date;
  if (deadline instanceof Date) {
    deadlineDate = deadline;
  } else if (typeof deadline === 'string' || typeof deadline === 'number') {
    deadlineDate = new Date(deadline);
  } else {
    return 'Invalid date';
  }
  
  // Check if the date is valid
  if (isNaN(deadlineDate.getTime())) {
    return 'Invalid date';
  }
  
  const timeLeft = deadlineDate.getTime() - now.getTime();
  
  if (timeLeft <= 0) return 'Expired';
  
  const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
  const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
  
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export function getBetStatus(deadline: Date | string | number): 'active' | 'expired' {
  // Convert deadline to Date object if it's not already
  let deadlineDate: Date;
  if (deadline instanceof Date) {
    deadlineDate = deadline;
  } else if (typeof deadline === 'string' || typeof deadline === 'number') {
    deadlineDate = new Date(deadline);
  } else {
    return 'expired'; // Default to expired if invalid
  }
  
  // Check if the date is valid
  if (isNaN(deadlineDate.getTime())) {
    return 'expired'; // Default to expired if invalid date
  }
  
  return new Date() > deadlineDate ? 'expired' : 'active';
}

// Hook to get all bet IDs
export function useGetAllBets(): ContractCallResult<number[]> {
  const [data, setData] = useState<number[] | undefined>(undefined);
  const [error, setError] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchBets() {
      try {
        setLoading(true);
        setError(undefined);
        
        console.log('📊 Fetching bet IDs from contract...');
        console.log('📊 Contract instance:', contract);
        console.log('📊 Contract address:', await contract.getAddress());
        
        // Test if contract is responsive
        try {
          const version = await contract.getVersion();
          console.log('📊 Contract version:', version.toString());
        } catch (versionErr) {
          console.log('📊 Could not get version:', versionErr);
        }
        
        // Call the actual contract
        console.log('📊 Calling getAllBets()...');
        const result = await contract.getAllBets();
        console.log('📊 Raw getAllBets result:', result);
        
        const betIds = result.map((id: bigint) => Number(id));
        console.log('📊 Parsed bet IDs:', betIds);
        setData(betIds);
      } catch (err) {
        console.error('❌ Error fetching bets from contract:', err);
        console.error('Network:', CURRENT_NETWORK.name);
        console.error('RPC URL:', RPC_URL);
        console.error('Contract Address:', CONTRACT_ADDRESS);
        
        // Provide helpful error messages based on network
        let errorMessage = 'Failed to connect to blockchain';
        if (CURRENT_NETWORK.name === 'Hardhat Local') {
          errorMessage = 'Local Hardhat node not running. Start with: npx hardhat node';
        } else if (CURRENT_NETWORK.name === 'Base Sepolia') {
          errorMessage = 'Unable to connect to Base Sepolia testnet. Check internet connection.';
        }
        
        // Fallback to mock data if contract call fails
        console.log('📊 Falling back to mock data...');
        const mockBetIds = [1, 2, 3];
        setData(mockBetIds);
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    }

    fetchBets();
  }, []);

  return { data, error, loading };
}

// Hook to get individual bet data
export function useGetBet(betId: number | undefined): ContractCallResult<BetData> {
  const [data, setData] = useState<BetData | undefined>(undefined);
  const [error, setError] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (betId === undefined || betId === null) {
      setData(undefined);
      setError(undefined);
      setLoading(false);
      return;
    }

    async function fetchBet() {
      try {
        setLoading(true);
        setError(undefined);
        
        console.log(`🔍 Loading bet ${betId} from contract...`);
        
        // Get bet data from contract
        const contractBet = await contract.getBet(betId);
        console.log(`📊 Contract bet ${betId}:`, contractBet);
        
        // Get bet odds from contract
        let odds: number[] = [50, 50]; // Default 50/50
        try {
          const contractOdds = await contract.getBetOdds(betId);
          odds = contractOdds.map((odd: bigint) => Number(odd));
        } catch (oddsErr) {
          console.log(`ℹ️ Could not get odds for bet ${betId}, using defaults`);
        }
        
        // Get option pools (for YES/NO bets, options 0 and 1)
        let yesPool = '0';
        let noPool = '0';
        try {
          const yesPoolBigInt = await contract.getOptionPool(betId, 0);
          const noPoolBigInt = await contract.getOptionPool(betId, 1);
          yesPool = ethers.formatEther(yesPoolBigInt);
          noPool = ethers.formatEther(noPoolBigInt);
        } catch (poolErr) {
          console.log(`ℹ️ Could not get pools for bet ${betId}`);
        }
        
        // Convert contract data to our BetData format
        const deadline = new Date(Number(contractBet.deadlineTimestamp) * 1000);
        const timeRemainingMs = deadline.getTime() - Date.now();
        const timeRemaining = Math.max(0, Math.floor(timeRemainingMs / 1000));
        const totalPool = (parseFloat(yesPool) + parseFloat(noPool)).toString();
        
        const betData: BetData = {
          id: betId,
          betId: Number(contractBet.betId),
          question: contractBet.question,
          description: contractBet.description,
          creator: contractBet.creator,
          options: contractBet.bettingOptions,
          deadline: deadline,
          timeRemaining: timeRemaining,
          totalPayout: totalPool,
          totalPoolAmount: ethers.formatEther(contractBet.totalPoolAmount),
          status: contractBet.isResolved ? 'resolved' : (timeRemaining > 0 ? 'active' : 'expired'),
          category: contractBet.category,
          yesPool: yesPool,
          noPool: noPool,
          totalPool: totalPool,
          odds: odds,
          isResolved: contractBet.isResolved
        };
        
        console.log(`✅ Contract bet ${betId} data loaded:`, betData);
        setData(betData);
      } catch (err) {
        console.error('Error fetching bet from contract:', err);
        
        // Fallback to mock data if contract call fails
        console.log(`📊 Falling back to mock data for bet ${betId}...`);
        
        const deadline = new Date(Date.now() + (betId * 12 + 24) * 60 * 60 * 1000);
        const mockBets = [
          {
            question: "Will Bitcoin reach $100k by end of year?",
            description: "A prediction market about Bitcoin's price reaching $100,000 USD by December 31st.",
            category: "Crypto",
            yesPool: "0.75",
            noPool: "0.25",
            totalPool: "1.0",
            odds: [25, 75]
          },
          {
            question: "Will it rain tomorrow in San Francisco?",
            description: "Weather prediction for San Francisco tomorrow based on current forecasts.",
            category: "Weather", 
            yesPool: "0.12",
            noPool: "0.18",
            totalPool: "0.3",
            odds: [40, 60]
          },
          {
            question: "Will the Lakers win their next game?",
            description: "Prediction about the LA Lakers winning their upcoming basketball game.",
            category: "Sports",
            yesPool: "0.4",
            noPool: "0.6", 
            totalPool: "1.0",
            odds: [40, 60]
          }
        ];
        
        const betIndex = ((betId - 1) % mockBets.length);
        const betTemplate = mockBets[betIndex];
        const timeRemainingMs = deadline.getTime() - Date.now();
        const timeRemaining = Math.max(0, Math.floor(timeRemainingMs / 1000));
        
        const mockBetData: BetData = {
          id: betId,
          betId: betId,
          question: betTemplate.question,
          description: betTemplate.description,
          creator: '0x' + Math.random().toString(16).substr(2, 40),
          options: ['YES', 'NO'],
          deadline: deadline,
          timeRemaining: timeRemaining,
          totalPayout: betTemplate.totalPool,
          totalPoolAmount: betTemplate.totalPool,
          status: timeRemaining > 0 ? 'active' : 'expired',
          category: betTemplate.category,
          yesPool: betTemplate.yesPool,
          noPool: betTemplate.noPool,
          totalPool: betTemplate.totalPool,
          odds: betTemplate.odds,
          isResolved: false
        };
        
        setData(mockBetData);
        setError('Using mock data - contract call failed');
      } finally {
        setLoading(false);
      }
    }

    fetchBet();
  }, [betId]);

  return { data, error, loading };
}

// Hook to get user's bets (for custodial system, we'd get this from our database)
export function useGetUserBets(userId?: string): ContractCallResult<number[]> {
  const [data, setData] = useState<number[] | undefined>(undefined);
  const [error, setError] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userId) return;

    async function fetchUserBets() {
      try {
        setLoading(true);
        setError(undefined);
        
        // In a real custodial system, this would query our database
        // For now, return empty array
        setData([]);
      } catch (err) {
        console.error('Error fetching user bets:', err);
        setError('Failed to fetch user bets');
      } finally {
        setLoading(false);
      }
    }

    fetchUserBets();
  }, [userId]);

  return { data, error, loading };
}