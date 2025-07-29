'use client';

import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { useState, useEffect } from 'react';
import { parseEther, formatEther } from 'viem';
import { CONTRACTS, OVERUNDER_ABI, MARKET_ABI } from '@/lib/wagmi';

interface MarketCardProps {
  marketAddress: string;
}

function MarketCard({ marketAddress }: MarketCardProps) {
  const { address: userAddress, isConnected } = useAccount();
  const [betAmount, setBetAmount] = useState('0.01');
  const [selectedOutcome, setSelectedOutcome] = useState<boolean | null>(null);

  // Read market info with 2-second polling and manual refresh capability
  const { data: marketInfo, refetch: refetchMarketInfo } = useReadContract({
    address: marketAddress as `0x${string}`,
    abi: MARKET_ABI,
    functionName: 'getMarketInfo',
    query: {
      refetchInterval: 2000, // 2 seconds for faster updates
      refetchOnMount: true,
      refetchOnReconnect: true,
    },
  });

  // Read current odds with 2-second polling for real-time prices
  const { data: odds, refetch: refetchOdds } = useReadContract({
    address: marketAddress as `0x${string}`,
    abi: MARKET_ABI,
    functionName: 'getCurrentOdds',
    query: {
      refetchInterval: 2000, // 2 seconds
      refetchOnMount: true,
      refetchOnReconnect: true,
    },
  });

  // Write contract for betting
  const { 
    writeContract, 
    data: hash, 
    isPending, 
    error 
  } = useWriteContract();

  const { 
    isLoading: isConfirming, 
    isSuccess: isConfirmed,
    error: receiptError 
  } = useWaitForTransactionReceipt({
    hash,
    timeout: 120_000, // 2 minutes timeout
    confirmations: 1, // Wait for 1 confirmation
    query: {
      enabled: !!hash,
      retry: 3,
      refetchInterval: (data) => data ? false : 2000, // Poll every 2s until confirmed
    },
  });

  // 🔥 FORCE DATA REFRESH after transactions
  useEffect(() => {
    if (hash) {
      console.log(`⏳ Transaction hash received: ${hash}`);
      console.log(`🔗 Check status: https://sepolia.basescan.org/tx/${hash}`);
      
      // Immediately start refreshing data more aggressively
      const forceRefresh = () => {
        console.log('🔄 Force refreshing market data...');
        refetchMarketInfo();
        refetchOdds();
      };
      
      // Refresh immediately when hash appears
      forceRefresh();
      
      // Then refresh every 1 second for 30 seconds after transaction
      const refreshInterval = setInterval(forceRefresh, 1000);
      const timeout = setTimeout(() => {
        clearInterval(refreshInterval);
        console.log('⏰ Stopped aggressive refresh');
      }, 30000); // Stop after 30 seconds
      
      return () => {
        clearInterval(refreshInterval);
        clearTimeout(timeout);
      };
    }
  }, [hash, refetchMarketInfo, refetchOdds]);

  // 🎯 BINARY MARKET CALCULATIONS (working with current contract but fixed logic)
  
  // Get binary market prices that add up to 1 ETH
  const getBinaryPrices = (): { yesPrice: number, noPrice: number } => {
    if (!marketInfo) return { yesPrice: 0.5, noPrice: 0.5 };
    
    const totalYesShares = Number(marketInfo.totalYesShares);
    const totalNoShares = Number(marketInfo.totalNoShares);
    const totalShares = totalYesShares + totalNoShares;
    
    if (totalShares === 0) {
      // No bets yet - 50/50 probability  
      return { yesPrice: 0.5, noPrice: 0.5 };
    }
    
    // Price = implied probability based on betting volume
    const yesPrice = totalYesShares / totalShares;
    const noPrice = totalNoShares / totalShares;
    
    return { yesPrice, noPrice };
  };

  // Calculate shares user can buy for their budget (working with contract pricing)
  const calculateSharesForCost = (buyYes: boolean, costEth: number): number => {
    if (!marketInfo || costEth <= 0 || !odds) return 0;
    
    const [contractYesPrice, contractNoPrice] = odds;
    const currentPriceWei = buyYes ? contractYesPrice : contractNoPrice;
    const currentPriceEth = parseFloat(formatEther(currentPriceWei || 0n));
    
    // Simple estimation: shares = budget / current_price
    if (currentPriceEth === 0) return Math.floor(costEth * 100); // If no price data, rough estimate
    
    const maxShares = Math.floor(costEth / currentPriceEth);
    return Math.max(1, Math.min(maxShares, 1000)); // Cap at reasonable limits
  };

  // Handle transaction status updates
  useEffect(() => {
    console.log('📊 Transaction states:', {
      hash: hash || 'none',
      isPending,
      isConfirming, 
      isConfirmed,
      error: error?.message || 'none',
    });

    if (isPending) {
      console.log('⏳ Transaction pending (waiting for wallet)...');
    } else if (isConfirming) {
      console.log('⏳ Transaction confirming on network...');
      console.log(`📊 Status: pending=${isPending}, confirming=${isConfirming}, confirmed=${isConfirmed}`);
    } else if (isConfirmed) {
      console.log('✅ TRANSACTION CONFIRMED! Refreshing data...');
      // Force immediate refresh when confirmed
      refetchMarketInfo();
      refetchOdds();
      alert('🎉 Bet confirmed! Values should update now.');
    } else if (error) {
      console.error('❌ Transaction error:', error.message);
    } else if (receiptError) {
      console.error('❌ Receipt error:', receiptError.message);  
    }
  }, [isPending, isConfirming, isConfirmed, error, receiptError, refetchMarketInfo, refetchOdds]);

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
      const betAmountEth = parseFloat(betAmount);
      
      // Calculate shares for this bet amount
      const sharesToBuy = calculateSharesForCost(outcome, betAmountEth);
      
      if (sharesToBuy <= 0) {
        alert(`❌ Cannot place bet!\n\nBet amount too small.\n\nTry betting more ETH.`);
        return;
      }
      
      console.log(`🎯 Betting ${betAmount} ETH`);
      console.log(`📊 Getting ~${sharesToBuy} ${outcome ? 'YES' : 'NO'} shares`);
      
      writeContract({
        address: marketAddress as `0x${string}`,
        abi: MARKET_ABI,
        functionName: 'buyShares',
        args: [outcome, BigInt(sharesToBuy)],
        value: parseEther(betAmount), // Send exactly what user specified
      });
      
      setSelectedOutcome(outcome);
    } catch (err: any) {
      console.error('❌ Error placing bet:', err);
      alert(`Error: ${err.message}`);
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
  
  // Calculate betting volume from current data
  const totalBetVolume = Number(totalYesShares) + Number(totalNoShares);
  const yesBetVolume = Number(totalYesShares);
  const noBetVolume = Number(totalNoShares);

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
              Total Bets: {totalBetVolume} shares
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
          {/* Current Odds - Polymarket Style USD Display */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            {(() => {
              // Use calculated binary prices (convert ETH values to USD display)
              const { yesPrice: binaryYes, noPrice: binaryNo } = getBinaryPrices();
              const yesUSD = binaryYes; // 1 ETH = $1 USD in our display
              const noUSD = binaryNo;
              const yesPercent = (binaryYes * 100).toFixed(1);
              const noPercent = (binaryNo * 100).toFixed(1);
              
              return (
                <>
                  <div className="bg-green-900/30 border border-green-500/30 rounded-lg p-4 text-center">
                    <div className="text-green-400 font-semibold text-lg">YES</div>
                    <div className="text-white text-2xl font-bold">
                      ${yesUSD.toFixed(2)}
                    </div>
                    <div className="text-gray-400 text-sm">
                      {yesPercent}% chance
                    </div>
                  </div>
                  
                  <div className="bg-red-900/30 border border-red-500/30 rounded-lg p-4 text-center">
                    <div className="text-red-400 font-semibold text-lg">NO</div>
                    <div className="text-white text-2xl font-bold">
                      ${noUSD.toFixed(2)}
                    </div>
                    <div className="text-gray-400 text-sm">
                      {noPercent}% chance
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
          
          {/* Polymarket Status */}
          <div className="bg-blue-900/20 border border-blue-500/30 rounded p-2 mb-4 text-center text-xs text-blue-300">
            ✅ Polymarket Style: ${(getBinaryPrices().yesPrice + getBinaryPrices().noPrice).toFixed(2)} total
            <span className="text-green-400 ml-2">✅ Always equals $1.00</span>
          </div>

          {/* Market Stats - Fixed Display */}
          <div className="bg-gray-700/50 rounded-lg p-3 mb-4">
            <div className="text-sm text-gray-300 mb-2">Market Statistics:</div>
            <div className="flex justify-between text-sm">
              <span>YES Bets: <span className="text-green-400">{yesBetVolume} shares</span></span>
              <span>NO Bets: <span className="text-red-400">{noBetVolume} shares</span></span>
            </div>
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>Total Volume: {totalBetVolume} shares</span>
              <span>Initial Pool: {Number(initialLiquidity) / 1e18} ETH</span>
            </div>
          </div>

          {/* Betting Interface */}
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                💰 How much do you want to bet? (USD)
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
              
              {/* Real-time shares preview */}
              {betAmount && parseFloat(betAmount) > 0 && (
                <div className="mt-2 text-sm text-gray-400">
                  {(() => {
                    const betEth = parseFloat(betAmount);
                    const { yesPrice: binaryYes, noPrice: binaryNo } = getBinaryPrices();
                    
                    // Calculate shares using fixed binary prices
                    const yesShares = binaryYes > 0 ? Math.floor(betEth / binaryYes) : Math.floor(betEth * 2);
                    const noShares = binaryNo > 0 ? Math.floor(betEth / binaryNo) : Math.floor(betEth * 2);
                    
                    const yesPercent = (binaryYes * 100).toFixed(1);
                    const noPercent = (binaryNo * 100).toFixed(1);
                    
                    return (
                      <div className="space-y-1">
                        <div className="grid grid-cols-2 gap-2 text-center">
                          <div className="text-green-400">
                            YES: ~{yesShares} shares
                          </div>
                          <div className="text-red-400">
                            NO: ~{noShares} shares
                          </div>
                        </div>
                        <div className="text-xs text-gray-500 text-center">
                          @ {yesPercent}% / {noPercent}% odds
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
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
                  `Bet $${betAmount} on YES`
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
                  `Bet $${betAmount} on NO`
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
  // Get all markets with 5-second polling and manual refresh
  const { data: markets, isLoading, refetch: refetchMarkets } = useReadContract({
    address: CONTRACTS.OVERUNDER,
    abi: OVERUNDER_ABI,
    functionName: 'getAllMarkets',
    query: {
      refetchInterval: 5000, // 5 seconds for faster market list updates
      refetchOnMount: true,
      refetchOnReconnect: true,
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
          Auto-updating every 2-5s + Force refresh after bets
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