'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Navbar } from '@/components/navigation/navbar';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { BetModal } from '@/components/bets/bet-modal';
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
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [bet, setBet] = useState<BetDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showBetModal, setShowBetModal] = useState(false);
  const [betSide, setBetSide] = useState<'yes' | 'no'>('yes');
  const [userBalance, setUserBalance] = useState(100);
  
  const betId = params.id as string;

  useEffect(() => {
    if (!authLoading && !user) {
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
      // Fetch bet data
      const { data: betData, error: betError } = await supabase
        .from('bets')
        .select(`
          *,
          creator:users!creator_id(id, username, profile_pic_url),
          community:communities(id, name)
        `)
        .eq('id', betId)
        .single();

      if (betError || !betData) {
        router.push('/');
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
      const totalPool = (yesShares + noShares) * betData.fixed_share_price;

      // Get user's position
      let userPosition = { yes_shares: 0, no_shares: 0, total_invested: 0 };
      if (user) {
        const userShares = sharesData?.filter(s => s.user_id === user.id) || [];
        userPosition.yes_shares = userShares.filter(s => s.side === 'yes')
          .reduce((sum, s) => sum + s.shares_owned, 0);
        userPosition.no_shares = userShares.filter(s => s.side === 'no')
          .reduce((sum, s) => sum + s.shares_owned, 0);
        userPosition.total_invested = (userPosition.yes_shares + userPosition.no_shares) * betData.fixed_share_price;
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
    if (!user) return;

    const { data } = await supabase
      .from('wallet_balances')
      .select('balance')
      .eq('user_id', user.id)
      .single();

    if (data) {
      setUserBalance(data.balance);
    }
  };

  const handleBet = (side: 'yes' | 'no') => {
    setBetSide(side);
    setShowBetModal(true);
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

  if (!user || !bet) return null;

  const totalShares = bet.stats.yes_shares + bet.stats.no_shares;
  const yesPercentage = totalShares > 0 ? Math.round((bet.stats.yes_shares / totalShares) * 100) : 50;
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
                  
                  <Badge variant={isOpen ? 'default' : 'secondary'}>
                    {isOpen ? 'Open' : 'Closed'}
                  </Badge>
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
                    <span className="text-sm text-gray-600">${bet.fixed_share_price} per share</span>
                    <span className="text-xs text-gray-500">{yesPercentage}% chance</span>
                  </Button>
                  
                  <Button
                    onClick={() => handleBet('no')}
                    variant="outline"
                    className="h-24 flex flex-col items-center justify-center space-y-2 border-red-200 hover:bg-red-50"
                  >
                    <span className="text-2xl font-bold text-red-600">NO</span>
                    <span className="text-sm text-gray-600">${bet.fixed_share_price} per share</span>
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

      {showBetModal && (
        <BetModal
          isOpen={showBetModal}
          onClose={() => setShowBetModal(false)}
          bet={{
            id: bet.id,
            description: bet.description,
            creator: bet.creator,
            fixed_share_price: bet.fixed_share_price,
            yes_shares: bet.stats.yes_shares,
            no_shares: bet.stats.no_shares,
          }}
          side={betSide}
          userBalance={userBalance}
          onConfirm={handleConfirmBet}
        />
      )}
    </div>
  );
} 