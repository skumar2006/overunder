'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { usePrivyAuth } from '@/hooks/usePrivyAuth';
import { Navbar } from '@/components/navigation/navbar';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { BetModalV2 } from '@/components/bets/BetModalV2';
import { ResolutionModal } from '@/components/bets/ResolutionModal';
import { DisputePanel } from '@/components/bets/DisputePanel';
import { supabase } from '@/lib/supabase';
import { Line, LineChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import { 
  Clock, 
  Users, 
  TrendingUp, 
  DollarSign, 
  Loader2,
  Calendar,
  BarChart3
} from 'lucide-react';
import { format } from 'date-fns';
import { usePrivyResolveBet, usePrivyClaimWinnings } from '@/lib/contracts/privyResolutionHooks';

interface BetDetail {
  id: string;
  description: string;
  bet_type: 'binary' | 'overunder';
  creator: {
    id: string;
    username: string;
    profile_pic_url?: string;
  };
  community?: {
    id: string;
    name: string;
  };
  deadline: string;
  fixed_share_price: number;
  resolution_status: 'open' | 'resolved';
  resolved_outcome?: string;
  created_at: string;
  stats: {
    yes_shares: number;
    no_shares: number;
    total_participants: number;
    total_pool: number;
    price_history: Array<{
      date: string;
      price: number;
    }>;
  };
  user_position?: {
    yes_shares: number;
    no_shares: number;
    total_invested: number;
  };
}

export default function BetDetailPage() {
  const params = useParams();
  const { user, loading: authLoading } = usePrivyAuth();
  const router = useRouter();
  const [bet, setBet] = useState<BetDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showBetModal, setShowBetModal] = useState(false);
  const [showResolutionModal, setShowResolutionModal] = useState(false);
  const [betSide, setBetSide] = useState<'yes' | 'no'>('yes');
  const [userBalance, setUserBalance] = useState(100);
  const { resolveBet } = usePrivyResolveBet();
  const { claimWinnings } = usePrivyClaimWinnings();
  
  const betId = params.id as string;

  useEffect(() => {
    console.log('🔍 Auth Debug:', { authLoading, user: !!user, userId: user?.id });
    if (!authLoading && !user) {
      console.log('❌ No user, redirecting to login');
      router.push('/login');
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (betId && user) {
      fetchBetDetails();
      fetchUserBalance();
    }
  }, [betId, user]);

  const fetchBetDetails = async () => {
    try {
      // Check if betId is a number (onchain ID) or UUID (database ID)
      const isOnchainId = !isNaN(Number(betId));
      
      console.log('🔍 Bet ID Analysis:', {
        betId,
        isOnchainId,
        parsedNumber: Number(betId)
      });

      // Fetch bet data using appropriate field
      const { data: betData, error: betError } = await supabase
        .from('bets')
        .select(`
          *,
          creator:users!creator_id(id, username, profile_pic_url),
          community:communities(id, name)
        `)
        .eq(isOnchainId ? 'onchain_bet_id' : 'id', isOnchainId ? Number(betId) : betId)
        .single();

      console.log('🔍 Bet Query Debug:', {
        betId,
        betIdType: typeof betId,
        betIdLength: betId?.length,
        query: `SELECT * FROM bets WHERE id = '${betId}'`,
        betData,
        betError,
        onchain_bet_id: betData?.onchain_bet_id,
        creator_id: betData?.creator_id,
        current_user_id: user?.id,
        resolution_status: betData?.resolution_status
      });

      if (betError || !betData) {
        console.error('❌ Bet fetch failed:', { betError, betData, betId });
        // Temporarily comment out redirect to debug
        // router.push('/');
        return;
      }

      // Fetch shares data
      const { data: sharesData } = await supabase
        .from('shares_owned')
        .select('side, shares_owned, user_id')
        .eq('bet_id', betId);

      // Calculate stats
      const yesShares = sharesData?.filter(s => s.side === 'yes')
        .reduce((sum, s) => sum + s.shares_owned, 0) || 0;
      const noShares = sharesData?.filter(s => s.side === 'no')
        .reduce((sum, s) => sum + s.shares_owned, 0) || 0;
      
      const uniqueParticipants = new Set(sharesData?.map(s => s.user_id) || []);
      
      // Convert ETH to USD for pool calculation
      const ETH_TO_USD = 3000;
      const totalPoolETH = (yesShares + noShares) * betData.fixed_share_price;
      const totalPool = totalPoolETH * ETH_TO_USD; // Convert to USD for display

      console.log('📊 Stats Debug:', {
        yesShares,
        noShares,
        totalShares: yesShares + noShares,
        fixedSharePrice: betData.fixed_share_price,
        totalPoolETH,
        totalPoolUSD: totalPool,
        participants: uniqueParticipants.size
      });

      // Get user's position
      let userPosition = { yes_shares: 0, no_shares: 0, total_invested: 0 };
      if (user) {
        const userShares = sharesData?.filter(s => s.user_id === user.id) || [];
        userPosition.yes_shares = userShares.filter(s => s.side === 'yes')
          .reduce((sum, s) => sum + s.shares_owned, 0);
        userPosition.no_shares = userShares.filter(s => s.side === 'no')
          .reduce((sum, s) => sum + s.shares_owned, 0);
        userPosition.total_invested = (userPosition.yes_shares + userPosition.no_shares) * betData.fixed_share_price * ETH_TO_USD;
      }

      // Mock price history
      const totalShares = yesShares + noShares;
      const currentPrice = totalShares > 0 ? Math.round((yesShares / totalShares) * 100) : 50;
      const priceHistory = [
        { date: 'Start', price: 50 },
        { date: 'Week 1', price: 55 },
        { date: 'Week 2', price: 48 },
        { date: 'Now', price: currentPrice },
      ];

      setBet({
        ...betData,
        stats: {
          yes_shares: yesShares,
          no_shares: noShares,
          total_participants: uniqueParticipants.size,
          total_pool: totalPool,
          price_history: priceHistory,
        },
        user_position: userPosition,
      });
    } catch (error) {
      console.error('Error fetching bet details:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserBalance = async () => {
    // No longer using custodial balance - real ETH balance is shown in navbar
    setUserBalance(0);
  };

  const handleBet = (side: 'yes' | 'no') => {
    setBetSide(side);
    setShowBetModal(true);
  };

  const handleResolve = async (outcomeIndex: number) => {
    try {
      if (!bet) return;
      
      // Use the actual onchain_bet_id from the database
      const onchainId = (bet as any).onchain_bet_id;
      if (!onchainId) {
        console.error('❌ No onchain_bet_id found for bet:', bet.id);
        return;
      }
      
      console.log('🔧 Resolving bet:', {
        betId: bet.id,
        onchainId,
        outcomeIndex
      });
      
      const res = await resolveBet(onchainId, outcomeIndex);
      if (!res.success) throw new Error(res.error || 'Failed to resolve');
      
      // Update the database
      await fetch('/api/bets/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          betId: bet.id, 
          resolution_status: 'resolved', 
          resolved_outcome: outcomeIndex === 0 ? 'yes' : 'no',
          resolution_timestamp: new Date().toISOString()
        })
      });
      
      fetchBetDetails();
    } catch (e: any) {
      console.error('❌ Error resolving bet:', e);
    }
  };

  const handleClaim = async () => {
    try {
      if (!bet) return;
      const onchainId = (bet as any).onchain_bet_id ?? parseInt(bet.id);
      const res = await claimWinnings(onchainId);
      if (!res.success) throw new Error(res.error || 'Failed to claim');
      fetchBetDetails();
    } catch (e: any) {
      console.error(e);
    }
  };

  const handleConfirmBet = async (amount: number) => {
    if (!user || !bet) return;

    const totalCost = amount * bet.fixed_share_price;

    // Create or update shares
    const { data: existingShares } = await supabase
      .from('shares_owned')
      .select('shares_owned')
      .eq('user_id', user.id)
      .eq('bet_id', bet.id)
      .eq('side', betSide)
      .single();

    if (existingShares) {
      await supabase
        .from('shares_owned')
        .update({ shares_owned: existingShares.shares_owned + amount })
        .eq('user_id', user.id)
        .eq('bet_id', bet.id)
        .eq('side', betSide);
    } else {
      await supabase
        .from('shares_owned')
        .insert({
          user_id: user.id,
          bet_id: bet.id,
          side: betSide,
          shares_owned: amount,
        });
    }

    // Update wallet balance
    await supabase
      .from('wallet_balances')
      .update({ balance: userBalance - totalCost })
      .eq('user_id', user.id);

    // Refresh data
    fetchBetDetails();
    fetchUserBalance();
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Not authenticated</p>
          <button onClick={() => router.push('/login')} className="mt-2 px-4 py-2 bg-blue-600 text-white rounded">
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  if (!bet) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Bet not found or failed to load</p>
          <p className="text-sm text-gray-500 mt-1">Check console for errors</p>
          <button onClick={() => router.push('/')} className="mt-2 px-4 py-2 bg-blue-600 text-white rounded">
            Go Back Home
          </button>
        </div>
      </div>
    );
  }

  const totalShares = bet.stats.yes_shares + bet.stats.no_shares;
  const yesPercentage = totalShares > 0 ? Math.round((bet.stats.yes_shares / totalShares) * 100) : 50;
  
  console.log('🎯 Percentage Debug:', {
    yesShares: bet.stats.yes_shares,
    noShares: bet.stats.no_shares,
    totalShares,
    yesPercentage,
    noPercentage: 100 - yesPercentage
  });
  const daysLeft = Math.ceil((new Date(bet.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
  const isOpen = bet.resolution_status === 'open' && daysLeft > 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Bet Header */}
            <Card className="p-6">
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h1 className="text-2xl font-bold mb-2">{bet.description}</h1>
                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      <div className="flex items-center space-x-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={bet.creator.profile_pic_url} alt={bet.creator.username} />
                          <AvatarFallback>{bet.creator.username[0].toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <span>Created by {bet.creator.username}</span>
                      </div>
                      {bet.community && (
                        <span>in {bet.community.name}</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Badge variant={isOpen ? 'default' : 'secondary'}>
                      {bet.resolution_status === 'resolved' ? 'RESOLVED' : isOpen ? 'Open' : 'Closed'}
                    </Badge>
                    {bet.resolution_status === 'resolved' && bet.resolved_outcome && (
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        Winner: {bet.resolved_outcome.toUpperCase()}
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-6 text-sm">
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-1 text-gray-500" />
                    Created {format(new Date(bet.created_at), 'MMM d, yyyy')}
                  </div>
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 mr-1 text-gray-500" />
                    {isOpen ? `${daysLeft} days left` : 'Betting closed'}
                  </div>
                </div>
                {/* Resolve/Claim Actions */}
                <div className="mt-4 flex gap-3">
                  {/* Show resolve button if creator and not resolved and has onchain bet */}
                  {user && bet.creator.id === user.id && bet.resolution_status !== 'resolved' && (bet as any).onchain_bet_id && (
                    <Button 
                      onClick={() => {
                        console.log('🔘 Resolve Market button clicked!');
                        console.log('📊 Modal state before:', showResolutionModal);
                        setShowResolutionModal(true);
                        console.log('📊 Modal state after:', true);
                      }} 
                      className="bg-blue-600 text-white"
                    >
                      Resolve Market
                    </Button>
                  )}
                  {/* Debug info for resolution */}
                  {user && bet.creator.id === user.id && bet.resolution_status !== 'resolved' && !(bet as any).onchain_bet_id && (
                    <div className="text-xs text-red-500 bg-red-50 p-2 rounded">
                      ⚠️ Cannot resolve: Missing onchain_bet_id (bet not deployed to blockchain)
                    </div>
                  )}
                  {/* Show claim button if resolved */}
                  {bet.resolution_status === 'resolved' && (
                    <Button variant="outline" onClick={handleClaim}>Claim Winnings</Button>
                  )}
                </div>
              </div>
            </Card>

            {/* Betting Options */}
            {isOpen && (
              <Card className="p-6">
                <h2 className="text-lg font-semibold mb-4">Place Your Bet</h2>
                <div className="grid grid-cols-2 gap-4">
                  <Button
                    onClick={() => handleBet('yes')}
                    variant="outline"
                    className="h-24 flex flex-col items-center justify-center space-y-2 border-green-200 hover:bg-green-50"
                  >
                    <span className="text-2xl font-bold text-green-600">YES</span>
                    <span className="text-sm text-gray-600">${(bet.fixed_share_price * 3000).toFixed(0)} per share</span>
                    <span className="text-xs text-gray-500">{yesPercentage}% chance</span>
                  </Button>
                  
                  <Button
                    onClick={() => handleBet('no')}
                    variant="outline"
                    className="h-24 flex flex-col items-center justify-center space-y-2 border-red-200 hover:bg-red-50"
                  >
                    <span className="text-2xl font-bold text-red-600">NO</span>
                    <span className="text-sm text-gray-600">${(bet.fixed_share_price * 3000).toFixed(0)} per share</span>
                    <span className="text-xs text-gray-500">{100 - yesPercentage}% chance</span>
                  </Button>
                </div>
              </Card>
            )}

            {/* Price Chart */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4">Price History</h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={bet.stats.price_history}>
                    <XAxis 
                      dataKey="date"
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis 
                      domain={[0, 100]}
                      tick={{ fontSize: 12 }}
                      label={{ value: 'YES %', angle: -90, position: 'insideLeft' }}
                    />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="price"
                      stroke="#8B5CF6"
                      strokeWidth={2}
                      dot={{ fill: '#8B5CF6' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Stats */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4">Market Stats</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <BarChart3 className="h-5 w-5 text-gray-500" />
                    <span className="text-sm text-gray-600">Total Pool</span>
                  </div>
                  <span className="font-semibold">${bet.stats.total_pool}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Users className="h-5 w-5 text-gray-500" />
                    <span className="text-sm text-gray-600">Participants</span>
                  </div>
                  <span className="font-semibold">{bet.stats.total_participants}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <TrendingUp className="h-5 w-5 text-gray-500" />
                    <span className="text-sm text-gray-600">YES Shares</span>
                  </div>
                  <span className="font-semibold text-green-600">{bet.stats.yes_shares}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <TrendingUp className="h-5 w-5 text-gray-500 rotate-180" />
                    <span className="text-sm text-gray-600">NO Shares</span>
                  </div>
                  <span className="font-semibold text-red-600">{bet.stats.no_shares}</span>
                </div>
              </div>
            </Card>

            {/* User Position */}
            {bet.user_position && (bet.user_position.yes_shares > 0 || bet.user_position.no_shares > 0) && (
              <Card className="p-6">
                <h2 className="text-lg font-semibold mb-4">Your Position</h2>
                <div className="space-y-3">
                  {bet.user_position.yes_shares > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">YES Shares</span>
                      <span className="font-semibold text-green-600">
                        {bet.user_position.yes_shares}
                      </span>
                    </div>
                  )}
                  
                  {bet.user_position.no_shares > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">NO Shares</span>
                      <span className="font-semibold text-red-600">
                        {bet.user_position.no_shares}
                      </span>
                    </div>
                  )}
                  
                  <div className="pt-3 border-t">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Total Invested</span>
                      <span className="font-semibold">${bet.user_position.total_invested}</span>
                    </div>
                  </div>
                </div>
              </Card>
            )}
          </div>
        </div>
      </main>

      {showBetModal && bet && (
        <BetModalV2
          isOpen={showBetModal}
          onClose={() => setShowBetModal(false)}
          bet={{
            id: parseInt(bet.id),
            betId: parseInt(bet.id),
            question: bet.description,
            description: bet.description,
            creator: bet.creator.username,
            options: ['Yes', 'No'],
            deadline: new Date(bet.deadline),
            timeRemaining: Math.max(0, Math.floor((new Date(bet.deadline).getTime() - Date.now()) / 1000)),
            totalPayout: bet.stats.total_pool.toString(),
            status: bet.resolution_status === 'resolved' ? 'resolved' : 'active',
            winningOption: bet.resolved_outcome ? (bet.resolved_outcome === 'yes' ? 0 : 1) : undefined,
            category: 'prediction',
            yesPool: bet.stats.yes_shares.toString(),
            noPool: bet.stats.no_shares.toString(),
            totalPool: bet.stats.total_pool.toString(),
            totalPoolAmount: bet.stats.total_pool.toString(),
            odds: [
              (bet.stats.yes_shares / Math.max(bet.stats.yes_shares + bet.stats.no_shares, 1)) * 100,
              (bet.stats.no_shares / Math.max(bet.stats.yes_shares + bet.stats.no_shares, 1)) * 100
            ],
            isResolved: bet.resolution_status === 'resolved'
          }}
        />
      )}

      {/* Debug modal state */}
      {console.log('🔍 Modal Render Debug:', { showResolutionModal, hasBet: !!bet, hasUser: !!user })}
      
      {showResolutionModal && bet && user && (
        <ResolutionModal
          bet={{
            id: bet.id,
            creator_id: bet.creator.id,
            onchain_bet_id: (bet as any).onchain_bet_id,
            question: bet.description,
            description: bet.description,
            options: bet.bet_type === 'binary' ? ['Yes', 'No'] : ['Over', 'Under'],
            deadline: bet.deadline,
            isResolved: bet.resolution_status === 'resolved',
            totalPool: bet.stats.total_pool,
            odds: bet.bet_type === 'binary' 
              ? [(bet.stats.yes_shares / Math.max(bet.stats.yes_shares + bet.stats.no_shares, 1)) * 100,
                 (bet.stats.no_shares / Math.max(bet.stats.yes_shares + bet.stats.no_shares, 1)) * 100]
              : [50, 50]
          }}
          onClose={() => setShowResolutionModal(false)}
          onResolutionProposed={() => {
            setShowResolutionModal(false);
            fetchBetDetails();
          }}
          userId={user.id}
        />
      )}
    </div>
  );
} 