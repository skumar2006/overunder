'use client';

import { useState, useEffect } from 'react';
import { X, TrendingUp, Wallet, Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import { usePrivyAuth } from '@/hooks/usePrivyAuth';
import { useBalance } from 'wagmi';
import { formatEther, parseEther } from 'viem';
import { BetData } from '@/lib/contracts/custodialHooks';
import { useRealBetting } from '@/lib/contracts/realBettingHooks';
import { toast } from '@/components/ui/toaster';
import { Button } from '@/components/ui/button';

interface BetModalV2Props {
  bet: BetData;
  isOpen: boolean;
  onClose: () => void;
}

export function BetModalV2({ bet, isOpen, onClose }: BetModalV2Props) {
  const { user, address } = usePrivyAuth();
  const [selectedSide, setSelectedSide] = useState<'yes' | 'no'>('yes');
  const [amount, setAmount] = useState('0.01');
  const [isCustomAmount, setIsCustomAmount] = useState(false);

  // Real ETH balance
  const { data: ethBalance } = useBalance({
    address: address as `0x${string}` | undefined,
    chainId: 84532, // Base Sepolia
    query: {
      enabled: !!address,
      refetchInterval: 10000,
    },
  });

  // Real betting hook
  const { placeBet, isPending, isConfirming, isSuccess, error, reset } = useRealBetting();

  const ethBalanceFormatted = ethBalance ? parseFloat(formatEther(ethBalance.value)) : 0;
  const amountNum = parseFloat(amount);
  const optionIndex = selectedSide === 'yes' ? 0 : 1;
  
  // Calculate potential payout based on current odds
  const currentOdds = bet?.odds?.[optionIndex] || 50;
  const potentialPayout = amountNum * (100 / currentOdds);
  const profit = potentialPayout - amountNum;
  
  // Check if betting is allowed
  const isBetActive = bet && !bet.isResolved && bet.timeRemaining > 0;
  const canBet = user && address && isBetActive && amountNum > 0 && amountNum <= ethBalanceFormatted && amountNum >= 0.001;

  // Quick bet amounts
  const quickAmounts = ['0.001', '0.01', '0.05', '0.1'];

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedSide('yes');
      setAmount('0.01');
      setIsCustomAmount(false);
      // Reset betting state to allow new bets
      reset();
    }
  }, [isOpen, reset]);

  // Handle successful bet
  useEffect(() => {
    if (isSuccess) {
      toast(`Successfully placed ${amount} ETH on ${selectedSide.toUpperCase()}!`, 'success');
      onClose();
    }
  }, [isSuccess, amount, selectedSide, onClose]);

  // Handle errors
  useEffect(() => {
    if (error) {
      console.error('Betting error:', error);
      toast('Failed to place bet. Please try again.', 'error');
    }
  }, [error]);

  const handlePlaceBet = async () => {
    if (!canBet || !bet) return;

    try {
      await placeBet(bet.betId, optionIndex, amount);
    } catch (err) {
      console.error('Error placing bet:', err);
    }
  };

  const handleAmountSelect = (quickAmount: string) => {
    setAmount(quickAmount);
    setIsCustomAmount(false);
  };

  const handleCustomAmount = () => {
    setIsCustomAmount(true);
  };

  const formatTimeRemaining = (seconds?: number) => {
    if (!seconds || seconds <= 0) return 'Expired';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  if (!isOpen || !bet) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm md:max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-4 md:p-6 border-b border-gray-100">
          <div className="flex justify-between items-start">
            <div className="flex-1 pr-3 md:pr-4">
              <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-2">Place Your Bet</h2>
              <p className="text-xs md:text-sm text-gray-600 line-clamp-2">{bet?.question || 'Loading...'}</p>
            </div>
            <button 
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 p-1"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          
          {/* Time remaining */}
          <div className="flex items-center mt-3 text-sm text-gray-500">
            <Clock className="h-4 w-4 mr-1" />
            <span>{formatTimeRemaining(bet?.timeRemaining)} remaining</span>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 md:p-6">
          {/* Side Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Choose your prediction
            </label>
            <div className="grid grid-cols-2 gap-2 md:gap-3">
              <button
                onClick={() => setSelectedSide('yes')}
                className={`p-3 md:p-4 rounded-xl border-2 transition-all ${
                  selectedSide === 'yes'
                    ? 'border-green-500 bg-green-50 text-green-700'
                    : 'border-gray-200 hover:border-gray-300 text-gray-700'
                }`}
              >
                <div className="text-center">
                  <div className="font-semibold mb-1 text-sm md:text-base">YES</div>
                  <div className="text-xs md:text-sm opacity-75">
                    {bet?.odds?.[0]?.toFixed(1) || '50.0'}% odds
                  </div>
                </div>
              </button>
              
              <button
                onClick={() => setSelectedSide('no')}
                className={`p-3 md:p-4 rounded-xl border-2 transition-all ${
                  selectedSide === 'no'
                    ? 'border-red-500 bg-red-50 text-red-700'
                    : 'border-gray-200 hover:border-gray-300 text-gray-700'
                }`}
              >
                <div className="text-center">
                  <div className="font-semibold mb-1 text-sm md:text-base">NO</div>
                  <div className="text-xs md:text-sm opacity-75">
                    {bet?.odds?.[1]?.toFixed(1) || '50.0'}% odds
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Amount Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Bet amount (ETH)
            </label>
            
            {/* Quick amounts */}
            <div className="grid grid-cols-4 gap-2 mb-3">
              {quickAmounts.map((quickAmount) => (
                <button
                  key={quickAmount}
                  onClick={() => handleAmountSelect(quickAmount)}
                  className={`p-2 rounded-lg border text-sm font-medium transition-all ${
                    amount === quickAmount && !isCustomAmount
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-gray-300 text-gray-700'
                  }`}
                >
                  {quickAmount}
                </button>
              ))}
            </div>

            {/* Custom amount input */}
            <div className="relative">
              <input
                type="number"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  setIsCustomAmount(true);
                }}
                onFocus={handleCustomAmount}
                step="0.001"
                min="0.001"
                max={ethBalanceFormatted.toString()}
                placeholder="Enter custom amount"
                className={`w-full p-3 border rounded-lg text-right pr-12 ${
                  isCustomAmount
                    ? 'border-blue-500 ring-1 ring-blue-500 ring-opacity-20'
                    : 'border-gray-200'
                }`}
              />
              <span className="absolute right-3 top-3 text-gray-500 text-sm">ETH</span>
            </div>
          </div>

          {/* Balance info */}
          <div className="mb-6 p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center text-gray-600">
                <Wallet className="h-4 w-4 mr-2" />
                <span>Your balance</span>
              </div>
              <span className="font-medium text-gray-900">
                {ethBalanceFormatted.toFixed(4)} ETH
              </span>
            </div>
          </div>

          {/* Payout calculation */}
          <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-blue-700">Potential payout</span>
              <div className="text-right">
                <div className="font-bold text-blue-900">
                  {potentialPayout.toFixed(4)} ETH
                </div>
                <div className="text-xs text-blue-600">
                  +{profit.toFixed(4)} profit
                </div>
              </div>
            </div>
            <div className="flex items-center text-xs text-blue-600">
              <TrendingUp className="h-3 w-3 mr-1" />
              <span>
                {((profit / amountNum) * 100).toFixed(1)}% return if {selectedSide.toUpperCase()} wins
              </span>
            </div>
          </div>

          {/* Warnings */}
          {!isBetActive && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center text-red-700">
                <AlertTriangle className="h-4 w-4 mr-2" />
                <span className="text-sm">This market is no longer accepting bets</span>
              </div>
            </div>
          )}

          {amountNum > ethBalanceFormatted && (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center text-yellow-700">
                <AlertTriangle className="h-4 w-4 mr-2" />
                <span className="text-sm">Insufficient ETH balance</span>
              </div>
            </div>
          )}

          {amountNum < 0.001 && amountNum > 0 && (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center text-yellow-700">
                <AlertTriangle className="h-4 w-4 mr-2" />
                <span className="text-sm">Minimum bet amount is 0.001 ETH</span>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex space-x-3">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={isPending || isConfirming}
            >
              Cancel
            </Button>
            
            <Button
              onClick={handlePlaceBet}
              disabled={!canBet || isPending || isConfirming}
              className={`flex-1 font-semibold ${
                selectedSide === 'yes' 
                  ? 'bg-green-600 hover:bg-green-700' 
                  : 'bg-red-600 hover:bg-red-700'
              } text-white`}
            >
              {isPending || isConfirming ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                  {isPending ? 'Confirming...' : 'Processing...'}
                </div>
              ) : (
                <>
                  Bet {amount} ETH on {selectedSide.toUpperCase()}
                </>
              )}
            </Button>
          </div>

          {/* Transaction status */}
          {(isPending || isConfirming) && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center text-blue-700">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent mr-2" />
                <span className="text-sm">
                  {isPending 
                    ? 'Please confirm the transaction in your wallet...' 
                    : 'Transaction is being processed on the blockchain...'
                  }
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}