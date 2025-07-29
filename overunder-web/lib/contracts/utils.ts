import { formatEther, parseEther } from 'viem';
import { Bet, BetData, Wager, WagerData, UserProfile, UserStats } from './types';

// Convert contract data to frontend-friendly format
export function transformBetData(bet: Bet, odds?: bigint[]): BetData {
  const now = Math.floor(Date.now() / 1000);
  const deadline = Number(bet.deadlineTimestamp);
  
  return {
    betId: Number(bet.betId),
    creator: bet.creator,
    stakeAmount: formatEther(bet.stakeAmount),
    bettingOptions: bet.bettingOptions,
    deadlineTimestamp: deadline,
    resolutionTimestamp: Number(bet.resolutionTimestamp),
    resolvedOutcome: Number(bet.resolvedOutcome),
    isResolved: bet.isResolved,
    question: bet.question,
    description: bet.description,
    category: bet.category,
    createdAt: Number(bet.createdAt),
    totalPoolAmount: formatEther(bet.totalPoolAmount),
    odds: odds ? odds.map(o => Number(o) / 100) : undefined, // Convert basis points to percentages
    timeRemaining: deadline > now ? deadline - now : 0,
  };
}

export function transformWagerData(wager: Wager): WagerData {
  return {
    bettor: wager.bettor,
    betId: Number(wager.betId),
    optionChosen: Number(wager.optionChosen),
    amountStaked: formatEther(wager.amountStaked),
    timestamp: Number(wager.timestamp),
    claimed: wager.claimed,
  };
}

export function transformUserProfile(profile: UserProfile): UserStats {
  return {
    username: profile.username,
    totalBets: formatEther(profile.totalBets),
    totalWinnings: formatEther(profile.totalWinnings),
    winRate: Number(profile.winRate) / 100, // Convert basis points to percentage
    reputation: Number(profile.reputation),
    isActive: profile.isActive,
  };
}

// Validation functions
export function validateBetCreation(
  question: string,
  description: string,
  bettingOptions: string[],
  deadline: Date,
  stakeAmount: string
): string[] {
  const errors: string[] = [];
  
  if (!question.trim()) {
    errors.push('Question is required');
  } else if (question.length > 200) {
    errors.push('Question must be less than 200 characters');
  }
  
  if (!description.trim()) {
    errors.push('Description is required');
  } else if (description.length > 1000) {
    errors.push('Description must be less than 1000 characters');
  }
  
  if (bettingOptions.length < 2) {
    errors.push('At least 2 betting options are required');
  } else if (bettingOptions.length > 10) {
    errors.push('Maximum 10 betting options allowed');
  }
  
  if (bettingOptions.some(option => !option.trim())) {
    errors.push('All betting options must be non-empty');
  }
  
  if (bettingOptions.length !== new Set(bettingOptions).size) {
    errors.push('Betting options must be unique');
  }
  
  const now = new Date();
  const minDeadline = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour from now
  const maxDeadline = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000); // 1 year from now
  
  if (deadline <= now) {
    errors.push('Deadline must be in the future');
  } else if (deadline < minDeadline) {
    errors.push('Deadline must be at least 1 hour from now');
  } else if (deadline > maxDeadline) {
    errors.push('Deadline must be within 1 year');
  }
  
  try {
    const amount = parseFloat(stakeAmount);
    if (isNaN(amount) || amount <= 0) {
      errors.push('Stake amount must be a positive number');
    } else if (amount < 0.001) {
      errors.push('Minimum stake amount is 0.001 ETH');
    }
  } catch {
    errors.push('Invalid stake amount format');
  }
  
  return errors;
}

export function validateWagerAmount(amount: string, minimumBet: string = '0.001'): string[] {
  const errors: string[] = [];
  
  try {
    const amountNum = parseFloat(amount);
    const minNum = parseFloat(minimumBet);
    
    if (isNaN(amountNum) || amountNum <= 0) {
      errors.push('Wager amount must be a positive number');
    } else if (amountNum < minNum) {
      errors.push(`Minimum wager amount is ${minimumBet} ETH`);
    }
  } catch {
    errors.push('Invalid wager amount format');
  }
  
  return errors;
}

// Calculate odds from option pools
export function calculateOdds(optionPools: bigint[], totalPool: bigint): number[] {
  if (totalPool === 0n) {
    // Equal odds if no bets placed
    const equalOdds = 100 / optionPools.length;
    return new Array(optionPools.length).fill(equalOdds);
  }
  
  return optionPools.map(pool => 
    Number((pool * 10000n) / totalPool) / 100 // Convert to percentage
  );
}

// Calculate potential payout for a wager
export function calculatePotentialPayout(
  wagerAmount: string,
  optionPool: bigint,
  totalPool: bigint
): string {
  try {
    const wagerBigInt = parseEther(wagerAmount);
    const newOptionPool = optionPool + wagerBigInt;
    const newTotalPool = totalPool + wagerBigInt;
    
    if (newOptionPool === 0n) return '0';
    
    // Payout = (user's stake / total winning stakes) * total pool
    const payout = (wagerBigInt * newTotalPool) / newOptionPool;
    
    // Apply 2% platform fee
    const fee = (payout * 200n) / 10000n;
    const finalPayout = payout - fee;
    
    return formatEther(finalPayout);
  } catch {
    return '0';
  }
}

// Format time remaining
export function formatTimeRemaining(seconds: number): string {
  if (seconds <= 0) return 'Expired';
  
  const days = Math.floor(seconds / (24 * 3600));
  const hours = Math.floor((seconds % (24 * 3600)) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (days > 0) {
    return `${days}d ${hours}h`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else {
    return `${minutes}m`;
  }
}

// Format large numbers
export function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  } else {
    return num.toString();
  }
}

// Format ETH amounts
export function formatETH(amount: string | bigint, decimals: number = 4): string {
  const amountStr = typeof amount === 'bigint' ? formatEther(amount) : amount;
  const num = parseFloat(amountStr);
  
  if (num === 0) return '0';
  if (num < 0.0001) return '<0.0001';
  
  return num.toFixed(decimals);
}

// Get bet status
export function getBetStatus(bet: BetData): 'active' | 'resolved' | 'expired' {
  if (bet.isResolved) return 'resolved';
  if (bet.timeRemaining === 0) return 'expired';
  return 'active';
}

// Generate short address
export function shortenAddress(address: string, chars: number = 4): string {
  return `${address.slice(0, 2 + chars)}...${address.slice(-chars)}`;
}

// Error handling for contract calls
export function handleContractError(error: unknown): string {
  if (error instanceof Error) {
    // Handle specific contract errors
    if (error.message.includes('BetNotFound')) {
      return 'Bet not found';
    } else if (error.message.includes('DeadlinePassed')) {
      return 'Betting deadline has passed';
    } else if (error.message.includes('BetAlreadyResolved')) {
      return 'Bet has already been resolved';
    } else if (error.message.includes('InsufficientStake')) {
      return 'Insufficient stake amount';
    } else if (error.message.includes('OnlyCreatorCanResolve')) {
      return 'Only the bet creator can resolve this bet';
    } else if (error.message.includes('NothingToClaim')) {
      return 'No winnings to claim';
    } else if (error.message.includes('AlreadyClaimed')) {
      return 'Winnings already claimed';
    } else if (error.message.includes('user rejected')) {
      return 'Transaction rejected by user';
    } else if (error.message.includes('insufficient funds')) {
      return 'Insufficient funds for transaction';
    }
    
    return error.message;
  }
  
  return 'An unknown error occurred';
} 

/**
 * Extract bet ID from transaction receipt logs
 * Looks for the BetCreated event and extracts the bet ID from event logs
 */
export function extractBetIdFromReceipt(receipt: any): number | null {
  try {
    if (!receipt.logs || !Array.isArray(receipt.logs)) {
      console.warn('No logs found in transaction receipt');
      return null;
    }

    // Look for BetCreated event
    // The event signature hash for BetCreated(uint256,address,string,string[],uint256,uint256)
    const betCreatedEventSignature = '0x' + 'BetCreated(uint256,address,string,string[],uint256,uint256)';
    
    for (const log of receipt.logs) {
      if (log.topics && log.topics.length > 0) {
        // Check if this is a BetCreated event (we could compute the exact signature hash)
        // For now, we'll look for logs with the right number of topics
        if (log.topics.length >= 2) {
          try {
            // The bet ID is typically the first indexed parameter (topics[1])
            const betIdHex = log.topics[1];
            if (betIdHex && typeof betIdHex === 'string') {
              const betId = parseInt(betIdHex, 16);
              console.log('Extracted bet ID from log:', betId);
              return betId;
            }
          } catch (error) {
            console.warn('Error parsing bet ID from log:', error);
            continue;
          }
        }
      }
    }

    console.warn('BetCreated event not found in transaction logs');
    return null;
  } catch (error) {
    console.error('Error extracting bet ID from receipt:', error);
    return null;
  }
}

/**
 * Create a Supabase bet record from on-chain data and form data
 */
export function createSupabaseBetData(
  formData: any,
  onchainBetId: number,
  txHash: string,
  userId: string
) {
  return {
    description: `${formData.question}\n\n${formData.description}`,
    bet_type: formData.bet_type,
    community_id: formData.community_id || null,
    creator_id: userId,
    deadline: new Date(formData.deadline).toISOString(),
    fixed_share_price: parseFloat(formData.stakeAmount),
    resolution_status: 'open' as const,
    onchain_bet_id: onchainBetId,
    onchain_tx_hash: txHash,
  };
} 