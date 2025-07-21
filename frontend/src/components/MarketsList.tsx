'use client';

import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { useState } from 'react';
import { parseEther, formatEther } from 'viem';
import { CONTRACTS, OVERUNDER_ABI, MARKET_ABI } from '@/lib/wagmi';

interface MarketCardProps {
  marketAddress: string;
}

function MarketCard({ marketAddress }: MarketCardProps) {
  const { address: userAddress, isConnected } = useAccount();
  const [betAmount, setBetAmount] = useState('0.01');
  const [selectedOutcome, setSelectedOutcome] = useState<boolean | null>(null);

  // Read market info with 5-second polling
  const { data: marketInfo } = useReadContract({
    address: marketAddress as `0x${string}`,
    abi: MARKET_ABI,
    functionName: 'getMarketInfo',
    query: {
      refetchInterval: 5000, // 5 seconds
    },
  });

  // Read current odds with 3-second polling for real-time prices
  const { data: odds } = useReadContract({
    address: marketAddress as `0x${string}`,
    abi: MARKET_ABI,
    functionName: 'getCurrentOdds',
    query: {
      refetchInterval: 3000, // 3 seconds
    },
  });

  // Write contract for betting
  const { 
    writeContract, 
    data: hash, 
    isPending, 
    error 
  } = useWriteContract();

  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  const handleBet = async (outcome: boolean) => {
    if (!isConnected) {
      alert('Please connect your wallet');
      return;
    }

    if (!betAmount || parseFloat(betAmount) <= 0) {
      alert('Please enter a valid bet amount');
      return;
    }

    try {
      // Calculate shares based on bet amount (simplified)
      const shares = parseEther(betAmount);
      writeContract({
        address: marketAddress as `0x${string}`,
        abi: MARKET_ABI,
        functionName: 'buyShares',
        args: [outcome, shares],
        value: parseEther(betAmount),
      });
      setSelectedOutcome(outcome);
    } catch (err) {
      console.error('Error placing bet:', err);
    }
  };

  if (!marketInfo || !odds) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 animate-pulse">
        <div className="h-4 bg-gray-700 rounded w-3/4 mb-2"></div>
        <div className="h-4 bg-gray-700 rounded w-1/2"></div>
      </div>
    );
  }

  // Extract data from the tuple structure
  const {
    question,
    description, 
    category,
    creator,
    resolutionTime,
    state,
    outcome,
    totalYesShares,
    totalNoShares,
    initialLiquidity
  } = marketInfo;
  
  const [yesPrice, noPrice] = odds;
  
  const resolutionDate = new Date(Number(resolutionTime) * 1000);
  const isExpired = Date.now() > Number(resolutionTime) * 1000;
  const resolved = state === 2; // MarketState.Resolved = 2
  const totalVolume = totalYesShares + totalNoShares;

  // Format functions for proper display
  const formatShares = (shares: bigint) => {
    // Contract uses: 1 ETH = 1000 shares (not 1e18)
    return (Number(shares) / 1000).toFixed(4);
  };

  const formatPrice = (price: bigint) => {
    return formatEther(price || BigInt(0));
  };

  // Calculate actual betting volume (initial pool - remaining pool)  
  const initialLiquidityShares = Number(initialLiquidity) * 1000 / 1e18; // Convert ETH to shares scale
  const yesBetVolume = Math.max(0, initialLiquidityShares - Number(totalYesShares));
  const noBetVolume = Math.max(0, initialLiquidityShares - Number(totalNoShares));
  const totalBetVolume = yesBetVolume + noBetVolume;

  return (
    <div className="bg-gray-800 rounded-lg p-6 hover:bg-gray-750 transition-colors">
      {/* Market Header */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-white mb-2">{question}</h3>
          <p className="text-gray-400 text-sm mb-3">{description}</p>
          
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="bg-blue-600 text-white px-2 py-1 rounded">
              {category}
            </span>
            <span className="bg-gray-600 text-gray-300 px-2 py-1 rounded">
              Expires: {resolutionDate.toLocaleDateString()}
            </span>
            <span className="bg-purple-600 text-white px-2 py-1 rounded">
              Bet Volume: {(totalBetVolume / 1000).toFixed(4)} ETH
            </span>
          </div>
        </div>
      </div>

      {/* Resolution Status */}
      {resolved ? (
        <div className={`p-3 rounded-lg mb-4 ${outcome ? 'bg-green-900/50 border border-green-500' : 'bg-red-900/50 border border-red-500'}`}>
          <div className="text-center">
            <span className="text-lg font-semibold">
              ✅ RESOLVED: {outcome ? 'YES' : 'NO'}
            </span>
          </div>
        </div>
      ) : isExpired ? (
        <div className="bg-yellow-900/50 border border-yellow-500 text-yellow-200 p-3 rounded-lg mb-4 text-center">
          ⏰ Market Expired - Awaiting Resolution
        </div>
      ) : (
        <>
          {/* Current Odds */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-green-900/30 border border-green-500/30 rounded-lg p-4 text-center">
              <div className="text-green-400 font-semibold text-lg">YES</div>
              <div className="text-white text-2xl font-bold">
                {parseFloat(formatPrice(yesPrice)).toFixed(4)} ETH
              </div>
              <div className="text-gray-400 text-sm">per share</div>
            </div>
            
            <div className="bg-red-900/30 border border-red-500/30 rounded-lg p-4 text-center">
              <div className="text-red-400 font-semibold text-lg">NO</div>
              <div className="text-white text-2xl font-bold">
                {parseFloat(formatPrice(noPrice)).toFixed(4)} ETH
              </div>
              <div className="text-gray-400 text-sm">per share</div>
            </div>
          </div>

          {/* Market Stats */}
          <div className="bg-gray-700/50 rounded-lg p-3 mb-4">
            <div className="text-sm text-gray-300 mb-2">Liquidity Pools (AMM):</div>
            <div className="flex justify-between text-sm">
              <span>YES Pool: <span className="text-green-400">{formatShares(totalYesShares)} ETH</span></span>
              <span>NO Pool: <span className="text-red-400">{formatShares(totalNoShares)} ETH</span></span>
            </div>
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>YES Bets: {(yesBetVolume / 1000).toFixed(4)} ETH</span>
              <span>NO Bets: {(noBetVolume / 1000).toFixed(4)} ETH</span>
            </div>
          </div>

          {/* Betting Interface */}
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Bet Amount (ETH)
              </label>
              <input
                type="number"
                value={betAmount}
                onChange={(e) => setBetAmount(e.target.value)}
                min="0.001"
                step="0.001"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isPending || isConfirming}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleBet(true)}
                disabled={!isConnected || isPending || isConfirming}
                className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold py-2 px-4 rounded transition-colors"
              >
                {isPending && selectedOutcome === true ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Betting...
                  </div>
                ) : (
                  'Bet YES'
                )}
              </button>
              
              <button
                onClick={() => handleBet(false)}
                disabled={!isConnected || isPending || isConfirming}
                className="bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold py-2 px-4 rounded transition-colors"
              >
                {isPending && selectedOutcome === false ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Betting...
                  </div>
                ) : (
                  'Bet NO'
                )}
              </button>
            </div>

            {/* Transaction Status */}
            {error && (
              <div className="bg-red-900/50 border border-red-500 text-red-200 px-3 py-2 rounded text-sm">
                Error: {error.message}
              </div>
            )}

            {isConfirmed && hash && (
              <div className="bg-green-900/50 border border-green-500 text-green-200 px-3 py-2 rounded text-sm">
                Bet placed successfully! 
                <a 
                  href={`https://sepolia.basescan.org/tx/${hash}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-green-300 hover:text-green-100 underline ml-2"
                >
                  View →
                </a>
              </div>
            )}
          </div>
        </>
      )}

      {/* Market Details */}
      <div className="mt-4 pt-4 border-t border-gray-700">
        <div className="flex justify-between items-center text-xs text-gray-400">
          <span>Market: {marketAddress.slice(0, 8)}...{marketAddress.slice(-6)}</span>
          <span>Creator: {creator.slice(0, 6)}...{creator.slice(-4)}</span>
        </div>
      </div>
    </div>
  );
}

export default function MarketsList() {
  // Get all markets with 10-second polling
  const { data: markets, isLoading } = useReadContract({
    address: CONTRACTS.OVERUNDER,
    abi: OVERUNDER_ABI,
    functionName: 'getAllMarkets',
    query: {
      refetchInterval: 10000, // 10 seconds
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-semibold text-white flex items-center gap-2">
          📈 Active Markets
        </h2>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-gray-800 rounded-lg p-6 animate-pulse">
              <div className="h-4 bg-gray-700 rounded w-3/4 mb-2"></div>
              <div className="h-4 bg-gray-700 rounded w-1/2 mb-4"></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="h-16 bg-gray-700 rounded"></div>
                <div className="h-16 bg-gray-700 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!markets || markets.length === 0) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-semibold text-white mb-4">📈 Active Markets</h2>
        <div className="bg-gray-800 rounded-lg p-8">
          <div className="text-6xl mb-4">🎯</div>
          <h3 className="text-xl font-medium text-white mb-2">No Markets Yet</h3>
          <p className="text-gray-400 mb-4">
            Be the first to create a prediction market!
          </p>
          <p className="text-sm text-gray-500">
            Create a market above to start betting with friends.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold text-white flex items-center gap-2">
          📈 Active Markets ({markets.length})
        </h2>
        <div className="flex items-center gap-2 text-sm text-green-400">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          Auto-updating every 3-10s
        </div>
      </div>
      
      <div className="space-y-6">
        {markets.map((marketAddress, index) => (
          <MarketCard 
            key={marketAddress} 
            marketAddress={marketAddress} 
          />
        ))}
      </div>
    </div>
  );
} 