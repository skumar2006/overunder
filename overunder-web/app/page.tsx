'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAccount } from 'wagmi';
import { useAuth } from '@/contexts/AuthContext';
import { 
  useGetAllBets, 
  useGetBet, 
  BetData, 
  formatTimeRemaining, 
  getBetStatus 
} from '@/lib/contracts';
import { BetModal } from '@/components/bets/bet-modal';
import { Navbar } from '@/components/navigation/navbar';
import { Plus, TrendingUp, Users, Clock, Trophy } from 'lucide-react';

// Type declaration for MetaMask
declare global {
  interface Window {
    ethereum?: {
      request: (params: { method: string; params?: any[] }) => Promise<any>;
    };
  }
}

export default function HomePage() {
  const { user, loading: authLoading } = useAuth();
  const { address, isConnected, chain } = useAccount();
  const [selectedTab, setSelectedTab] = useState('live-bets');
  const [selectedBet, setSelectedBet] = useState<BetData | null>(null);
  const [betSide, setBetSide] = useState<'yes' | 'no'>('yes');

  // Debug logging
  console.log('🔍 Homepage Debug:', {
    user,
    address,
    isConnected,
    chain,
    chainId: chain?.id,
    expectedChainId: 31337
  });

  // Fetch all bet IDs from contract
  const { data: betIds, loading: betsLoading, error: betsError } = useGetAllBets();

  // Enhanced debugging for bet loading
  console.log('📊 Bet Loading Debug:', {
    betIds,
    betsLoading,
    betsError,
    betIdsLength: betIds?.length
  });

  const openBetModal = (bet: BetData, side: 'yes' | 'no') => {
    console.log('🎯 Opening bet modal:', { bet, side });
    setSelectedBet(bet);
    setBetSide(side);
  };

  const closeBetModal = () => {
    setSelectedBet(null);
  };

  // Show loading state
  if (authLoading || betsLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  // Show error state
  if (betsError) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Bets</h2>
            <p className="text-gray-600 mb-4">{betsError}</p>

            {/* Network troubleshooting */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-6 max-w-md mx-auto">
              <h3 className="font-semibold text-yellow-800 mb-2">Troubleshooting:</h3>
              <div className="text-sm text-yellow-700 space-y-2">
                <p>• Make sure MetaMask is connected</p>
                <p>• Switch to localhost:8545 network (Chain ID: 31337)</p>
                <p>• Ensure Hardhat node is running</p>
                <p>• Current chain: {chain?.name || 'Not connected'} ({chain?.id || 'N/A'})</p>
              </div>

              {chain?.id !== 31337 && isConnected && (
                <button
                  onClick={() => {
                    if (window.ethereum) {
                      window.ethereum.request({
                        method: 'wallet_addEthereumChain',
                        params: [{
                          chainId: '0x7a69', // 31337 in hex
                          chainName: 'Localhost 8545',
                          rpcUrls: ['http://127.0.0.1:8545'],
                          nativeCurrency: {
                            name: 'ETH',
                            symbol: 'ETH',
                            decimals: 18
                          }
                        }]
                      });
                    }
                  }}
                  className="mt-3 bg-yellow-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-yellow-700 transition-colors"
                >
                  Switch to Localhost Network
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Prediction Markets</h1>
          <p className="text-gray-600">Bet on future events with your community</p>
          
          {/* Debug info in development */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg text-sm">
              <strong>Debug Info:</strong> Found {betIds?.length || 0} bet IDs: {betIds?.join(', ') || 'None'}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900">Total Bets</h3>
                <p className="text-2xl font-bold text-blue-600">{betIds?.length || 0}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-600" />
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900">Active Markets</h3>
                <p className="text-2xl font-bold text-green-600">
                  {betIds?.length || 0}
                </p>
              </div>
              <Clock className="h-8 w-8 text-green-600" />
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900">Your Wallet</h3>
                <p className="text-sm text-gray-600">
                  {isConnected ? `${address?.slice(0, 6)}...${address?.slice(-4)}` : 'Not connected'}
                </p>
              </div>
              <Users className="h-8 w-8 text-purple-600" />
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-xl border border-gray-200 mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              <button
                onClick={() => setSelectedTab('live-bets')}
                className={`py-4 border-b-2 font-medium text-sm ${
                  selectedTab === 'live-bets'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Live Bets
              </button>
              <button
                onClick={() => setSelectedTab('trending')}
                className={`py-4 border-b-2 font-medium text-sm ${
                  selectedTab === 'trending'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Trending
              </button>
              <button
                onClick={() => setSelectedTab('resolved')}
                className={`py-4 border-b-2 font-medium text-sm ${
                  selectedTab === 'resolved'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Resolved
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {betIds && betIds.length > 0 ? (
              <BetList betIds={betIds} selectedTab={selectedTab} onBetClick={openBetModal} />
            ) : (
              <EmptyState selectedTab={selectedTab} isConnected={isConnected} />
            )}
          </div>
        </div>

        {/* Create Bet Button */}
        {isConnected && (
          <div className="fixed bottom-6 right-6">
            <Link href="/bets/new">
              <button className="bg-blue-600 hover:bg-blue-700 text-white rounded-full p-4 shadow-lg transition-all duration-200 hover:scale-105">
                <Plus className="h-6 w-6" />
              </button>
            </Link>
          </div>
        )}
      </div>

      {/* Bet Modal */}
      {selectedBet && (
        <BetModal
          bet={selectedBet}
          side={betSide}
          onClose={closeBetModal}
        />
      )}
    </div>
  );
}

// Component to render individual bet items
function BetList({
  betIds,
  selectedTab,
  onBetClick
}: {
  betIds: number[],
  selectedTab: string,
  onBetClick: (bet: BetData, side: 'yes' | 'no') => void
}) {
  return (
    <div className="space-y-4">
      {betIds.slice(0, 10).map((betId) => (
        <BetItem key={betId} betId={betId} onBetClick={onBetClick} />
      ))}

      {betIds.length > 10 && (
        <div className="text-center py-4">
          <p className="text-gray-500">Showing first 10 bets. Load more coming soon...</p>
        </div>
      )}
    </div>
  );
}

// Individual bet item component
function BetItem({
  betId,
  onBetClick
}: {
  betId: number,
  onBetClick: (bet: BetData, side: 'yes' | 'no') => void
}) {
  const { data: bet, loading, error } = useGetBet(betId);

  // Enhanced debugging for individual bet loading
  console.log(`📈 Bet ${betId} Debug:`, {
    betId,
    bet,
    loading,
    error,
    hasValidBet: !!bet,
    betData: bet ? {
      id: bet.id,
      question: bet.question,
      isResolved: bet.isResolved,
      timeRemaining: bet.timeRemaining,
      bettingOptions: bet.bettingOptions
    } : null
  });

  if (loading) {
    return (
      <div className="bg-gray-50 rounded-lg p-6 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
      </div>
    );
  }

  if (error || !bet) {
    console.error(`❌ Failed to load bet ${betId}:`, error);
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-600 text-sm">
          Failed to load bet #{betId}: {error || 'Unknown error'}
        </p>
        {process.env.NODE_ENV === 'development' && (
          <p className="text-xs text-red-500 mt-1">
            Check contract deployment and ABI compatibility
          </p>
        )}
      </div>
    );
  }

  const status = getBetStatus(bet);
  const timeRemaining = formatTimeRemaining(bet.timeRemaining || 0);

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 mb-2">{bet.question}</h3>
          {bet.description && (
            <p className="text-gray-600 text-sm mb-3">{bet.description}</p>
          )}

          <div className="flex items-center space-x-4 text-sm text-gray-500">
            <span className="flex items-center">
              <Clock className="h-4 w-4 mr-1" />
              {status === 'active' ? timeRemaining : status === 'resolved' ? 'Resolved' : 'Expired'}
            </span>
            <span className="flex items-center">
              <TrendingUp className="h-4 w-4 mr-1" />
              {bet.totalPoolAmount} ETH Pool
            </span>
            {bet.odds && (
              <span className="flex items-center">
                <Trophy className="h-4 w-4 mr-1" />
                {bet.odds.map((odd, index) =>
                  `${bet.bettingOptions[index]}: ${odd.toFixed(1)}%`
                ).join(' | ')}
              </span>
            )}
          </div>

          {/* Debug info for development */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-2 text-xs text-gray-500">
              ID: {bet.id} | Resolved: {bet.isResolved ? 'Yes' : 'No'} | Time: {bet.timeRemaining}s
            </div>
          )}
        </div>

        <div className="flex space-x-2 ml-4">
          {bet.bettingOptions.map((option, index) => (
            <button
              key={index}
              onClick={() => {
                console.log(`🎯 Clicking ${option} for bet ${bet.id}`);
                onBetClick(bet, index === 0 ? 'yes' : 'no');
              }}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                index === 0
                  ? 'bg-green-100 text-green-700 hover:bg-green-200'
                  : 'bg-red-100 text-red-700 hover:bg-red-200'
              } ${status !== 'active' ? 'opacity-50 cursor-not-allowed' : ''}`}
              disabled={status !== 'active'}
            >
              {option}
              {bet.odds && (
                <span className="block text-xs opacity-75">
                  {bet.odds[index].toFixed(1)}%
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// Empty state component
function EmptyState({ selectedTab, isConnected }: { selectedTab: string, isConnected: boolean }) {
  if (!isConnected) {
    return (
      <div className="text-center py-12">
        <div className="mx-auto h-12 w-12 text-gray-400 mb-4">
          <Users className="h-12 w-12" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Connect Your Wallet</h3>
        <p className="text-gray-500 mb-6">Connect your wallet to view and participate in prediction markets.</p>
      </div>
    );
  }

  return (
    <div className="text-center py-12">
      <div className="mx-auto h-12 w-12 text-gray-400 mb-4">
        <TrendingUp className="h-12 w-12" />
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">
        {selectedTab === 'live-bets' ? 'No Live Bets' :
         selectedTab === 'trending' ? 'No Trending Bets' : 'No Resolved Bets'}
      </h3>
      <p className="text-gray-500 mb-6">
        {selectedTab === 'live-bets' ? 'Be the first to create a prediction market!' :
         selectedTab === 'trending' ? 'No trending bets right now.' : 'No resolved bets yet.'}
      </p>
      {selectedTab === 'live-bets' && (
        <Link href="/bets/new">
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors">
            Create Your First Bet
          </button>
        </Link>
      )}
    </div>
  );
}
