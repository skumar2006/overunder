import { Address } from 'viem';

// Contract data types
export interface Bet {
  betId: bigint;
  creator: Address;
  stakeAmount: bigint;
  bettingOptions: string[];
  deadlineTimestamp: bigint;
  resolutionTimestamp: bigint;
  resolvedOutcome: bigint;
  isResolved: boolean;
  question: string;
  description: string;
  category: string;
  createdAt: bigint;
  totalPoolAmount: bigint;
}

export interface Wager {
  bettor: Address;
  betId: bigint;
  optionChosen: bigint;
  amountStaked: bigint;
  timestamp: bigint;
  claimed: boolean;
}

export interface UserProfile {
  username: string;
  totalBets: bigint;
  totalWinnings: bigint;
  winRate: bigint; // Basis points (10000 = 100%)
  reputation: bigint;
  isActive: boolean;
}

export interface ContractStatus {
  version: bigint;
  paused: boolean;
  totalBets: bigint;
  minDuration: bigint;
  maxDuration: bigint;
  feeRate: bigint;
}

// Frontend-friendly types (with converted bigints)
export interface BetData {
  betId: number;
  creator: Address;
  stakeAmount: string; // ETH string
  bettingOptions: string[];
  deadlineTimestamp: number; // Unix timestamp
  resolutionTimestamp: number;
  resolvedOutcome: number;
  isResolved: boolean;
  question: string;
  description: string;
  category: string;
  createdAt: number;
  totalPoolAmount: string; // ETH string
  odds?: number[]; // Calculated odds in percentages
  timeRemaining?: number; // Calculated time remaining in seconds
}

export interface WagerData {
  bettor: Address;
  betId: number;
  optionChosen: number;
  amountStaked: string; // ETH string
  timestamp: number;
  claimed: boolean;
}

export interface UserStats {
  username: string;
  totalBets: string; // ETH string
  totalWinnings: string; // ETH string
  winRate: number; // Percentage (0-100)
  reputation: number;
  isActive: boolean;
}

// Form types for creating bets
export interface CreateBetForm {
  question: string;
  description: string;
  bettingOptions: string[];
  deadline: Date;
  category: string;
  stakeAmount: string; // ETH amount
}

export interface PlaceWagerForm {
  betId: number;
  optionChosen: number;
  amount: string; // ETH amount
}

// Contract configuration
export interface ContractConfig {
  overunderAddress: Address;
  treasuryAddress: Address;
  chainId: number;
}

// Event data types
export interface BetCreatedEvent {
  betId: bigint;
  creator: Address;
  question: string;
  options: string[];
  deadline: bigint;
  stakeAmount: bigint;
}

export interface WagerPlacedEvent {
  betId: bigint;
  bettor: Address;
  optionChosen: bigint;
  amount: bigint;
}

export interface BetResolvedEvent {
  betId: bigint;
  winningOption: bigint;
  totalPool: bigint;
}

export interface WinningsClaimedEvent {
  betId: bigint;
  winner: Address;
  amount: bigint;
}

// Utility types
export type BetStatus = 'active' | 'resolved' | 'expired';
export type BetCategory = 'Sports' | 'Crypto' | 'Politics' | 'Weather' | 'Entertainment' | 'Technology' | 'Other';

// Error types
export interface ContractError {
  name: string;
  message: string;
  cause?: unknown;
}

// Contract interaction results
export interface TransactionResult {
  hash: string;
  success: boolean;
  error?: string;
}

export interface ContractCallResult<T> {
  data?: T;
  error?: string;
  loading: boolean;
} 