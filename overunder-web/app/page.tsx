'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { usePrivyAuth } from '@/hooks/usePrivyAuth';
import { 
  useGetAllBets, 
  useGetBet, 
  BetData, 
  formatTimeRemaining, 
  getBetStatus 
} from '@/lib/contracts/custodialHooks';
import { BetModalV2 } from '@/components/bets/BetModalV2';
import { Navbar } from '@/components/navigation/navbar';

import { Plus, TrendingUp, Users, Clock, Trophy } from 'lucide-react';

export default function HomePage() {
  const { user, loading: authLoading, isConnected, address } = usePrivyAuth();
  const [selectedTab, setSelectedTab] = useState('live-bets');
  const [selectedBet, setSelectedBet] = useState<BetData | null>(null);
  const [betSide, setBetSide] = useState<'yes' | 'no'>('yes');
  const router = useRouter();

  // Do not redirect; render homepage even if not authenticated

  // Fetch all bet IDs from contract
  const { data: betIds, loading: betsLoading, error: betsError } = useGetAllBets();

  const openBetModal = (bet: BetData, side: 'yes' | 'no') => {
    setSelectedBet(bet);
    setBetSide(side);
  };

  const closeBetModal = () => {
    setSelectedBet(null);
  };

  // Render even when not authenticated; components below handle empty user state

  // Don't block on bets loading - show UI with mock data immediately

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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
        {/* Header - Responsive */}
        <div className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-4xl font-bold text-gray-900 mb-2">Prediction Markets</h1>
          <p className="text-sm md:text-base text-gray-600">Bet on future events with your community</p>
          

        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-8">
          <div className="bg-white rounded-xl p-4 md:p-6 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900 text-sm md:text-base">Total Bets</h3>
                <p className="text-xl md:text-2xl font-bold text-blue-600">{betIds?.length || 0}</p>
              </div>
              <TrendingUp className="h-6 w-6 md:h-8 md:w-8 text-blue-600 flex-shrink-0" />
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 md:p-6 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900 text-sm md:text-base">Active Markets</h3>
                <p className="text-xl md:text-2xl font-bold text-green-600">
                  {betIds?.length || 0}
                </p>
              </div>
              <Clock className="h-6 w-6 md:h-8 md:w-8 text-green-600 flex-shrink-0" />
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 md:p-6 border border-gray-200 shadow-sm hover:shadow-md transition-shadow sm:col-span-2 lg:col-span-1">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900 text-sm md:text-base">Your Account</h3>
                <p className="text-xs md:text-sm text-gray-600">
                  {user ? user.username : 'Not signed in'}
                </p>
              </div>
              <Users className="h-6 w-6 md:h-8 md:w-8 text-purple-600 flex-shrink-0" />
            </div>
          </div>
        </div>

        {/* Tab Navigation - Responsive */}
        <div className="bg-white rounded-xl border border-gray-200 mb-6 shadow-sm">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-4 md:space-x-8 px-4 md:px-6 overflow-x-auto">
              <button
                onClick={() => setSelectedTab('live-bets')}
                className={`py-3 md:py-4 border-b-2 font-medium text-sm whitespace-nowrap ${
                  selectedTab === 'live-bets'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Live Bets
              </button>
              <button
                onClick={() => setSelectedTab('trending')}
                className={`py-3 md:py-4 border-b-2 font-medium text-sm whitespace-nowrap ${
                  selectedTab === 'trending'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Trending
              </button>
              <button
                onClick={() => setSelectedTab('resolved')}
                className={`py-3 md:py-4 border-b-2 font-medium text-sm whitespace-nowrap ${
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
          <div className="p-4 md:p-6">
            {betIds && betIds.length > 0 ? (
              <BetList betIds={betIds} selectedTab={selectedTab} onBetClick={openBetModal} />
            ) : (
              <EmptyState selectedTab={selectedTab} user={user} />
            )}
          </div>
        </div>

        {/* Create Bet Button - Mobile FAB */}
        {isConnected && (
          <div className="fixed bottom-4 right-4 md:bottom-6 md:right-6 z-30">
            <Link href="/bets/new">
              <button className="bg-blue-600 hover:bg-blue-700 text-white rounded-full p-3 md:p-4 shadow-lg transition-all duration-200 hover:scale-105 active:scale-95">
                <Plus className="h-5 w-5 md:h-6 md:w-6" />
                <span className="sr-only">Create new bet</span>
              </button>
            </Link>
          </div>
        )}
      </div>

      {/* Bet Modal */}
      <BetModalV2
        bet={selectedBet!}
        isOpen={!!selectedBet}
        onClose={closeBetModal}
      />
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
    <div className="space-y-4 md:space-y-6">
      {betIds.slice(0, 10).map((betId) => (
        <BetItem key={betId} betId={betId} selectedTab={selectedTab} onBetClick={onBetClick} />
      ))}

      {betIds.length > 10 && (
        <div className="text-center py-4">
          <p className="text-gray-500 text-sm md:text-base">Showing first 10 bets. Load more coming soon...</p>
        </div>
      )}
    </div>
  );
}

// Individual bet item component
function BetItem({
  betId,
  selectedTab,
  onBetClick
}: {
  betId: number,
  selectedTab: string,
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
      bettingOptions: bet.options
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
    console.log(`ℹ️ Loading mock data for bet ${betId}`);
    // Don't render error UI in development - mock data will load
    return null;
  }

  const status = getBetStatus(bet.deadline);
  const timeRemaining = formatTimeRemaining(bet.deadline);

  // Filter bets based on selected tab and status
  const shouldHide = 
    (selectedTab === 'live-bets' && (status === 'expired' || bet.isResolved)) ||
    (selectedTab === 'trending' && (status === 'expired' || bet.isResolved)) ||
    (selectedTab === 'resolved' && !bet.isResolved);

  if (shouldHide) {
    return null;
  }

  // We need to find the database UUID for this onchain bet ID
  // For now, let's log what we're trying to link to
  console.log('🔗 Bet Link Debug:', {
    onchainBetId: bet.id,
    betData: bet,
    linkHref: `/bets/${bet.id}`
  });

  return (
    <Link href={`/bets/${bet.id}`}>
      <div className="bg-white border border-gray-200 rounded-lg p-4 md:p-6 hover:shadow-md transition-shadow w-full cursor-pointer">
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold text-gray-900 mb-2 text-base md:text-lg leading-tight">{bet.question}</h3>
            {bet.description && (
              <p className="text-gray-600 text-sm mb-3">{bet.description}</p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
            <span className="flex items-center">
              <Clock className="h-4 w-4 mr-1" />
              {status === 'active' ? timeRemaining : status === 'resolved' ? 'RESOLVED' : 'Expired'}
            </span>
            <span className="flex items-center">
              <TrendingUp className="h-4 w-4 mr-1" />
              ${bet.totalPool} Pool
            </span>
            {status === 'resolved' && bet.resolved_outcome && (
              <span className="flex items-center bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-medium">
                Winner: {bet.resolved_outcome.toUpperCase()}
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3 text-sm">
            {bet.options.map((option, index) => (
              <span key={index} className={`px-3 py-1 rounded-full text-xs font-medium ${
                index === 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}>
                {option}
                {bet.odds && ` (${bet.odds[index].toFixed(1)}%)`}
              </span>
            ))}
          </div>
        </div>
      </div>
    </Link>
  );
}

// Empty state component
function EmptyState({ selectedTab, user }: { selectedTab: string, user: any }) {
  // User should always be authenticated at this point due to middleware protection

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
