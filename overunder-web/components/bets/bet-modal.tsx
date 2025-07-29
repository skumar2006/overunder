'use client';

import { useState } from 'react';
import { X, Clock, TrendingUp, DollarSign, Loader2 } from 'lucide-react';
import { useAccount } from 'wagmi';
import { usePlaceWager, BetData } from '@/lib/contracts';
import { toast } from '@/components/ui/toaster';

interface BetModalProps {
  bet: BetData;
  side: 'yes' | 'no';
  onClose: () => void;
}

export function BetModal({ bet, side, onClose }: BetModalProps) {
  const { isConnected, address } = useAccount();
  const [amount, setAmount] = useState(0.1); // Amount in ETH
  const [isLoading, setIsLoading] = useState(false);

  const { placeWager } = usePlaceWager();

  // Calculate option index (0 for first option, 1 for second option, etc.)
  const optionIndex = side === 'yes' ? 0 : 1;
  
  // Calculate potential payout based on current odds
  const currentOdds = bet.odds?.[optionIndex] || 50;
  const potentialPayout = amount * (100 / currentOdds);
  
  // Check if betting is still allowed
  const isActive = !bet.isResolved && bet.timeRemaining > 0;
  const canBet = isConnected && isActive && amount > 0;

  // Comprehensive debugging
  console.log('🔍 BetModal Debug:', {
    bet: {
      betId: bet.betId,
      id: bet.id,
      question: bet.question,
      isResolved: bet.isResolved,
      timeRemaining: bet.timeRemaining,
      bettingOptions: bet.bettingOptions,
      odds: bet.odds
    },
    isConnected,
    address,
    amount,
    isActive,
    canBet,
    hasPlaceWager: !!placeWager,
    side,
    optionIndex
  });

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAmount(parseFloat(e.target.value));
  };

  const handlePlaceBet = async () => {
    console.log('🎯 Attempting to place bet:', {
      canBet,
      placeWager: !!placeWager,
      isConnected,
      isActive,
      amount,
      bet: {
        betId: bet.betId,
        id: bet.id,
        isResolved: bet.isResolved,
        timeRemaining: bet.timeRemaining
      }
    });

    if (!isConnected) {
      toast('Please connect your wallet first', 'error');
      return;
    }

    if (!bet || bet.betId === undefined || bet.betId === null) {
      toast('Bet data not loaded. Please try again.', 'error');
      console.error('❌ Bet data missing:', bet);
      return;
    }

    if (!isActive) {
      toast(`Betting is closed. Resolved: ${bet.isResolved}, Time remaining: ${bet.timeRemaining}`, 'error');
      return;
    }

    if (amount <= 0) {
      toast('Please enter a valid bet amount', 'error');
      return;
    }

    if (!placeWager) {
      toast('Betting function not available. Try refreshing the page.', 'error');
      return;
    }

    if (amount < 0.001) {
      toast('Minimum bet amount is 0.001 ETH', 'error');
      return;
    }

    // Additional validation for bet ID - use betId as the primary field
    const betIdToUse = bet.betId || bet.id;
    if (typeof betIdToUse !== 'number' || betIdToUse < 0) {
      toast('Invalid bet ID. Please refresh and try again.', 'error');
      console.error('❌ Invalid bet ID:', { betId: bet.betId, id: bet.id, betIdToUse, type: typeof betIdToUse });
      return;
    }

    setIsLoading(true);
    
    try {
      console.log('📝 Calling placeWager with:', {
        betId: betIdToUse,
        optionIndex,
        amount: amount.toString()
      });

      // Place wager on-chain
      const result = await placeWager(betIdToUse, optionIndex, amount.toString());

      if (result.success && result.hash) {
        toast(`Transaction submitted! Hash: ${result.hash.slice(0, 10)}...`, 'success');
        console.log('✅ Wager placed successfully:', result);
        
        // Wait a moment then close modal
        setTimeout(() => {
          toast(`Successfully placed ${amount} ETH on ${side.toUpperCase()}!`, 'success');
          onClose();
        }, 2000);
      } else {
        throw new Error(result.error || 'Transaction failed');
      }
    } catch (error: any) {
      console.error('Error placing wager:', error);
      toast(error.message || 'Failed to place wager', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-auto relative">
        {/* Close Button */}
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 z-10"
        >
          <X className="h-6 w-6" />
        </button>

        <div className="p-6">
          {/* Header */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2 pr-8">
              Place Your Bet
            </h2>
            <p className="text-gray-600">
              Betting <span className="font-semibold text-gray-900">{side.toUpperCase()}</span> on this prediction market
            </p>
          </div>

          {/* Debug Info (visible in development) */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mb-4 p-3 bg-gray-100 rounded-lg text-xs">
              <div><strong>Debug:</strong></div>
              <div>Connected: {isConnected ? 'Yes' : 'No'}</div>
              <div>Active: {isActive ? 'Yes' : 'No'}</div>
              <div>Resolved: {bet.isResolved ? 'Yes' : 'No'}</div>
              <div>Time Left: {bet.timeRemaining}</div>
              <div>Amount: {amount}</div>
              <div>Can Bet: {canBet ? 'Yes' : 'No'}</div>
              <div>Place Wager: {placeWager ? 'Available' : 'Not Available'}</div>
              <div>Bet ID: {bet.betId}</div>
              <div>Options: {bet.bettingOptions?.join(', ')}</div>
            </div>
          )}

          {/* Question */}
          <div className="bg-gray-50 rounded-xl p-4 mb-6">
            <h3 className="font-semibold text-gray-900 mb-2 leading-tight">
              {bet.question}
            </h3>
            {bet.description && (
              <p className="text-sm text-gray-600">
                {bet.description}
              </p>
            )}
          </div>

          {/* Bet Info */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-blue-50 rounded-lg p-3">
              <div className="flex items-center text-blue-600 mb-1">
                <Clock className="h-4 w-4 mr-1" />
                <span className="text-xs font-medium">Time Left</span>
              </div>
              <p className="text-sm font-semibold text-blue-900">
                {bet.timeRemaining > 0 ? `${Math.floor(bet.timeRemaining / 3600)}h remaining` : 'Ended'}
              </p>
            </div>
            
            <div className="bg-green-50 rounded-lg p-3">
              <div className="flex items-center text-green-600 mb-1">
                <TrendingUp className="h-4 w-4 mr-1" />
                <span className="text-xs font-medium">Pool Size</span>
              </div>
              <p className="text-sm font-semibold text-green-900">
                {bet.totalPoolAmount} ETH
              </p>
            </div>
          </div>

          {/* Option Buttons */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            {bet.bettingOptions.map((option, index) => (
              <button
                key={index}
                className={`p-4 rounded-xl border-2 transition-all ${
                  (side === 'yes' && index === 0) || (side === 'no' && index === 1)
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-200 bg-gray-50'
                }`}
              >
                <div className="text-sm font-medium text-gray-900 mb-1">{option}</div>
                <div className="text-lg font-bold text-gray-900">
                  {bet.odds?.[index]?.toFixed(1) || '50.0'}%
                </div>
              </button>
            ))}
          </div>

          {/* Amount Input */}
          <div className="mb-6">
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-gray-700">Bet Amount</span>
                <div className="flex items-center text-gray-900">
                  <DollarSign className="h-4 w-4 mr-1" />
                  <span className="text-lg font-bold">{amount.toFixed(3)} ETH</span>
                </div>
              </div>
              
              <input
                type="range"
                min="0.001"
                max="1"
                step="0.001"
                value={amount}
                onChange={handleSliderChange}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #3B82F6 0%, #3B82F6 ${(amount / 1) * 100}%, #E5E7EB ${(amount / 1) * 100}%, #E5E7EB 100%)`
                }}
              />
              
              <div className="flex justify-between text-xs text-gray-500 mt-2">
                <span>0.001 ETH</span>
                <span>1.0 ETH</span>
              </div>
            </div>
          </div>

          {/* Payout Calculation */}
          <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-xl p-4 mb-6">
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-1">
                Potential Payout if {side.toUpperCase()} wins
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {potentialPayout.toFixed(3)} ETH
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {((potentialPayout / amount - 1) * 100).toFixed(0)}% profit
              </p>
            </div>
          </div>

          {/* Place Bet Button */}
          <button
            onClick={handlePlaceBet}
            disabled={!canBet || isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:text-gray-500 text-white font-semibold py-4 px-6 rounded-xl transition-colors disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Placing Bet...
              </>
            ) : !isConnected ? (
              'Connect Wallet to Bet'
            ) : !isActive ? (
              'Betting Closed'
            ) : (
              `Place ${amount.toFixed(3)} ETH Bet`
            )}
          </button>
          
          {/* Status Messages */}
          {!isConnected && (
            <div className="text-center mt-4">
              <p className="text-sm text-orange-600">
                Connect your wallet to place bets
              </p>
            </div>
          )}
          
          {!isActive && isConnected && (
            <div className="text-center mt-4">
              <p className="text-sm text-red-600">
                {bet.isResolved ? 'This bet has been resolved' : 'Betting deadline has passed'}
              </p>
            </div>
          )}

          {isConnected && isActive && (
            <div className="text-center mt-4">
              <p className="text-xs text-gray-500">
                Connected: {address?.slice(0, 6)}...{address?.slice(-4)}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 