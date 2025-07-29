'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Navbar } from '@/components/navigation/navbar';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { 
  Edit, 
  Loader2, 
  Trophy, 
  Target, 
  TrendingUp, 
  DollarSign,
  Calendar,
  Users
} from 'lucide-react';
import { format } from 'date-fns';

interface UserProfile {
  id: string;
  username: string;
  bio: string | null;
  profile_pic_url: string | null;
  created_at: string;
  stats: {
    totalBets: number;
    wonBets: number;
    totalInvested: number;
    totalWon: number;
    winRate: number;
  };
  communities: Array<{
    id: string;
    name: string;
    member_count: number;
  }>;
  recentBets: Array<{
    id: string;
    description: string;
    side: string;
    shares_owned: number;
    status: 'pending' | 'won' | 'lost';
    created_at: string;
  }>;
}

export default function ProfilePage() {
  const params = useParams();
  const { user: currentUser, loading: authLoading } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const userId = params.id as string;
  const isOwnProfile = currentUser?.id === userId;

  useEffect(() => {
    if (!authLoading && !currentUser) {
      router.push('/login');
    }
  }, [authLoading, currentUser, router]);

  useEffect(() => {
    if (userId && currentUser) {
      fetchProfile();
    }
  }, [userId, currentUser]);

  const fetchProfile = async () => {
    try {
      // Fetch user data
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (userError || !userData) {
        router.push('/');
        return;
      }

      // Fetch user's communities
      const { data: communityData } = await supabase
        .from('community_members')
        .select(`
          community:communities(
            id,
            name
          )
        `)
        .eq('user_id', userId);

      // Fetch community member counts
      const communities = await Promise.all(
        (communityData || []).map(async (item) => {
          const { count } = await supabase
            .from('community_members')
            .select('*', { count: 'exact', head: true })
            .eq('community_id', item.community.id);

          return {
            ...item.community,
            member_count: count || 0,
          };
        })
      );

      // Fetch user's bets
      const { data: sharesData } = await supabase
        .from('shares_owned')
        .select(`
          *,
          bet:bets(
            id,
            description,
            resolution_status,
            resolved_outcome,
            fixed_share_price
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      // Calculate stats
      let totalBets = 0;
      let wonBets = 0;
      let totalInvested = 0;
      let totalWon = 0;

      const recentBets = (sharesData || []).map(share => {
        totalBets++;
        const invested = share.shares_owned * share.bet.fixed_share_price;
        totalInvested += invested;

        let status: 'pending' | 'won' | 'lost' = 'pending';
        if (share.bet.resolution_status === 'resolved') {
          if (share.side === share.bet.resolved_outcome) {
            status = 'won';
            wonBets++;
            totalWon += invested * 2; // 2x payout
          } else {
            status = 'lost';
          }
        }

        return {
          id: share.bet.id,
          description: share.bet.description,
          side: share.side,
          shares_owned: share.shares_owned,
          status,
          created_at: share.created_at,
        };
      });

      const winRate = totalBets > 0 ? Math.round((wonBets / totalBets) * 100) : 0;

      setProfile({
        ...userData,
        stats: {
          totalBets,
          wonBets,
          totalInvested,
          totalWon,
          winRate,
        },
        communities,
        recentBets: recentBets.slice(0, 10), // Show only recent 10
      });
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    );
  }

  if (!currentUser || !profile) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Profile Header */}
        <Card className="p-8 mb-8">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-6">
              <Avatar className="h-24 w-24">
                <AvatarImage src={profile.profile_pic_url || ''} alt={profile.username} />
                <AvatarFallback className="text-2xl">
                  {profile.username[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
              
              <div>
                <h1 className="text-3xl font-bold mb-2">{profile.username}</h1>
                {profile.bio && (
                  <p className="text-gray-600 mb-3">{profile.bio}</p>
                )}
                <p className="text-sm text-gray-500">
                  <Calendar className="inline h-4 w-4 mr-1" />
                  Joined {format(new Date(profile.created_at), 'MMMM yyyy')}
                </p>
              </div>
            </div>

            {isOwnProfile && (
              <Button variant="outline" size="sm">
                <Edit className="h-4 w-4 mr-2" />
                Edit Profile
              </Button>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-8">
            <div className="text-center">
              <div className="flex items-center justify-center space-x-1">
                <Target className="h-5 w-5 text-purple-600" />
                <span className="text-2xl font-bold">{profile.stats.totalBets}</span>
              </div>
              <p className="text-sm text-gray-500">Total Bets</p>
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center space-x-1">
                <Trophy className="h-5 w-5 text-yellow-600" />
                <span className="text-2xl font-bold">{profile.stats.wonBets}</span>
              </div>
              <p className="text-sm text-gray-500">Won</p>
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center space-x-1">
                <TrendingUp className="h-5 w-5 text-green-600" />
                <span className="text-2xl font-bold">{profile.stats.winRate}%</span>
              </div>
              <p className="text-sm text-gray-500">Win Rate</p>
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center space-x-1">
                <DollarSign className="h-5 w-5 text-blue-600" />
                <span className="text-2xl font-bold">${profile.stats.totalInvested}</span>
              </div>
              <p className="text-sm text-gray-500">Invested</p>
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center space-x-1">
                <DollarSign className="h-5 w-5 text-green-600" />
                <span className="text-2xl font-bold text-green-600">
                  ${profile.stats.totalWon}
                </span>
              </div>
              <p className="text-sm text-gray-500">Total Won</p>
            </div>
          </div>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="bets" className="space-y-4">
          <TabsList>
            <TabsTrigger value="bets">Betting History</TabsTrigger>
            <TabsTrigger value="communities">Communities</TabsTrigger>
          </TabsList>

          <TabsContent value="bets" className="space-y-4">
            {profile.recentBets.length > 0 ? (
              profile.recentBets.map((bet) => (
                <Card key={bet.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold mb-1">{bet.description}</h3>
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <span>Bet: {bet.side.toUpperCase()}</span>
                        <span>{bet.shares_owned} shares</span>
                        <span>{format(new Date(bet.created_at), 'MMM d, yyyy')}</span>
                      </div>
                    </div>
                    
                    <Badge
                      variant={
                        bet.status === 'won' 
                          ? 'default' 
                          : bet.status === 'lost' 
                          ? 'destructive' 
                          : 'secondary'
                      }
                    >
                      {bet.status === 'pending' && 'Pending'}
                      {bet.status === 'won' && 'Won'}
                      {bet.status === 'lost' && 'Lost'}
                    </Badge>
                  </div>
                </Card>
              ))
            ) : (
              <p className="text-center text-gray-500 py-8">
                No betting history yet
              </p>
            )}
          </TabsContent>

          <TabsContent value="communities" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {profile.communities.map((community) => (
                <Card key={community.id} className="p-4">
                  <div className="flex items-center space-x-3">
                    <div className="bg-purple-100 rounded-full p-2">
                      <Users className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{community.name}</h3>
                      <p className="text-sm text-gray-500">
                        {community.member_count} members
                      </p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
            
            {profile.communities.length === 0 && (
              <p className="text-center text-gray-500 py-8">
                Not a member of any communities yet
              </p>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
} 