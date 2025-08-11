'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usePrivyAuth } from '@/hooks/usePrivyAuth';
import { usePrivy, useWallets } from '@privy-io/react-auth';
// import { useAccount, useWaitForTransactionReceipt } from 'wagmi'; // Disabled for custodial system
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Navbar } from '@/components/navigation/navbar';
import { AuthGuard } from '@/components/AuthGuard';
import { supabase } from '@/lib/supabase';
import { toast } from '@/components/ui/toaster';
import { extractBetIdFromReceipt, createSupabaseBetData } from '@/lib/contracts';
import { usePrivyCreateBet } from '@/lib/contracts/privyBetCreation';
import { Calendar, DollarSign, Loader2, Users, TrendingUp, Clock } from 'lucide-react';

interface Community {
  id: string;
  name: string;
}

export default function CreateBetPage() {
  const { user, loading: authLoading } = usePrivyAuth();
  const { authenticated, login, linkWallet } = usePrivy();
  const { wallets } = useWallets();
  const router = useRouter();
  const { createBet } = usePrivyCreateBet(); // Privy + Wagmi contract bet creation
  
  const [formData, setFormData] = useState({
    question: '',
    description: '',
    bet_type: 'binary' as 'binary' | 'overunder',
    community_id: null as string | null,
    deadline: '',
    stakeAmount: '0.1', // ETH amount for initial liquidity
    category: 'Other',
  });
  
  const [communities, setCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingBet, setCreatingBet] = useState(false);
  const [txHash, setTxHash] = useState<string>('');
  const [pendingBetId, setPendingBetId] = useState<number | null>(null);
  
  // Wait for transaction confirmation (disabled for custodial system)
  // const { data: txReceipt, isLoading: txLoading, isSuccess: txSuccess } = useWaitForTransactionReceipt({
  //   hash: txHash as `0x${string}`,
  //   query: {
  //     enabled: !!txHash,
  //   },
  // });
  
  // Mock transaction state for custodial system
  const txReceipt = null;
  const txLoading = false;
  const txSuccess = false;

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    } else if (user && !communities.length) {
      // Only fetch communities if we don't have them yet
      fetchUserCommunities();
    }
  }, [user?.id, authLoading]);

  // Handle successful transaction
  useEffect(() => {
    if (txSuccess && txReceipt) {
      handleTransactionSuccess(txReceipt);
    }
  }, [txSuccess, txReceipt]);

  const fetchUserCommunities = async () => {
    if (!supabase || !user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('community_members')
        .select(`
          community:communities(id, name)
        `)
        .eq('user_id', user.id);

      if (error) throw error;

      const userCommunities = data?.map(cm => cm.community).filter(Boolean) as Community[];
      setCommunities(userCommunities);
    } catch (error) {
      console.error('Error fetching user communities:', error);
      console.error('Communities error details:', {
        message: error?.message || 'No message',
        code: error?.code || 'No code',
        details: error?.details || 'No details',
        stack: error?.stack || 'No stack',
        name: error?.name || 'No name',
        toString: error?.toString?.() || 'Cannot stringify',
        keys: Object.keys(error || {}),
        errorType: typeof error,
        isError: error instanceof Error,
        hasSupabase: !!supabase,
        hasUser: !!user,
        userId: user?.id
      });
      toast('Failed to load communities', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleTransactionSuccess = async (receipt: any) => {
    try {
      console.log('Transaction receipt:', receipt);
      
      // Extract bet ID from transaction logs
      const onchainBetId = extractBetIdFromReceipt(receipt);
      
      if (!onchainBetId) {
        throw new Error('Could not extract bet ID from transaction receipt');
      }

      // Create Supabase bet data
      const betData = createSupabaseBetData(
        formData,
        onchainBetId,
        receipt.transactionHash,
        user!.id
      );

      console.log('Storing bet in Supabase:', betData);

      // First attempt: insert with on-chain fields
      let supabaseBet: any | null = null;
      try {
        const { data, error } = await supabase
          .from('bets')
          .insert(betData)
          .select()
          .single();
        if (error) throw error;
        supabaseBet = data;
      } catch (err: any) {
        // If the schema doesn't yet have onchain fields, retry without them to unblock UX
        const msg: string = err?.message || '';
        const code: string | undefined = err?.code;
        const details: string = err?.details || '';
        const hint: string = err?.hint || '';
        const missingOnchainFields =
          code === 'PGRST204' ||
          msg.includes('onchain_bet_id') ||
          msg.includes('onchain_tx_hash') ||
          details.includes('onchain_bet_id') ||
          details.includes('onchain_tx_hash') ||
          hint.includes('onchain_bet_id') ||
          hint.includes('onchain_tx_hash');

        if (missingOnchainFields) {
          console.warn('Missing on-chain columns in bets table. Retrying insert without on-chain fields. Error:', err, JSON.stringify(err));
          const { onchain_bet_id, onchain_tx_hash, ...fallbackData } = betData as any;
          const { data, error } = await supabase
            .from('bets')
            .insert(fallbackData)
            .select()
            .single();
          if (error) throw error;
          supabaseBet = data;
        } else if (code === '42501' || msg.toLowerCase().includes('row-level security') || (err?.message && err.message.includes('row-level security'))) {
          // RLS violation: call server API with service role
          console.warn('RLS prevented client insert. Falling back to server API. Error:', err);
          const res = await fetch('/api/bets', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(betData),
          });
          if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            throw new Error(`Server insert failed: ${body?.error?.message || body?.error || res.statusText}`);
          }
          const body = await res.json();
          supabaseBet = body?.data;
        } else {
          // Re-throw with best-available info
          const reason = msg || code || JSON.stringify(err) || 'Unknown error';
          throw new Error(`Database error: ${reason}`);
        }
      }

      console.log('Bet stored successfully:', supabaseBet);
      
      toast('Bet created successfully on-chain and stored!', 'success');
      router.push(`/bets/${supabaseBet.id}`);
      
    } catch (error: any) {
      console.error('Error storing bet in Supabase:', error, JSON.stringify(error));
      const message = error?.message || error?.code || 'Unknown database error';
      toast(`Bet created on-chain but failed to store: ${message}`, 'error');
    } finally {
      setCreatingBet(false);
      setTxHash('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast('Please sign in to create a bet', 'error');
      return;
    }

    // Validate form
    if (!formData.question.trim()) {
      toast('Please enter a bet question', 'error');
      return;
    }

    if (!formData.description.trim()) {
      toast('Please enter a bet description', 'error');
      return;
    }

    if (!formData.deadline) {
      toast('Please select a deadline', 'error');
      return;
    }

    const deadlineDate = new Date(formData.deadline);
    if (deadlineDate <= new Date()) {
      toast('Deadline must be in the future', 'error');
      return;
    }

    if (parseFloat(formData.stakeAmount) < 0.01) {
      toast('Minimum stake amount is 0.01 ETH', 'error');
      return;
    }

    setCreatingBet(true);

    try {
      // Ensure Privy session and an embedded wallet exist
      if (!authenticated) {
        await login({ loginMethods: ['email', 'wallet'] });
      }
      if (!wallets || wallets.length === 0) {
        await linkWallet();
      }
      // small delay for wagmi to pick up wallet client
      await new Promise((r) => setTimeout(r, 300));

      console.log('🚀 Creating bet on-chain with data:', formData);

      // Prepare data for smart contract
      const contractData = {
        question: formData.question.trim(),
        description: formData.description.trim(),
        bettingOptions: formData.bet_type === 'binary' ? ['Yes', 'No'] : ['Over', 'Under'],
        deadline: deadlineDate,
        category: formData.category,
        stakeAmount: formData.stakeAmount,
      };

      console.log('📋 Contract data:', contractData);
      
      toast('Creating bet on Base Sepolia blockchain...', 'info');
      
      // Create bet on-chain using real contract
      const result = await createBet(contractData, user.id);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to create bet on-chain');
      }

      console.log('✅ Bet created successfully!', result);
      setTxHash(result.transactionHash!);
      setPendingBetId(result.betId!);
      
      toast('Bet created on-chain! Storing in database...', 'success');
      
      // Store in Supabase database
      const betData = createSupabaseBetData(
        formData,
        result.betId!,
        result.transactionHash!,
        user.id
      );

      console.log('💾 Storing bet in Supabase:', betData);

      const { data: supabaseBet, error } = await supabase
        .from('bets')
        .insert(betData)
        .select()
        .single();

      if (error) {
        console.error('Supabase error:', error);
        throw new Error(`Database error: ${error.message}`);
      }

      console.log('✅ Bet stored successfully:', supabaseBet);
      
      toast('Bet created successfully! Redirecting...', 'success');
      
      // Redirect to the bet page
      setTimeout(() => {
        router.push(`/bets/${supabaseBet.id}`);
      }, 1500);
      
    } catch (error: any) {
      console.error('❌ Error creating bet:', error);
      setCreatingBet(false);
      
      const errorMessage = error.message || error.error_description || 'Failed to create bet';
      toast(errorMessage, 'error');
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-900" />
      </div>
    );
  }

  // If not authenticated, redirect will happen in useEffect, show nothing
  if (!user) {
    return null;
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50">
        <Navbar />
      
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Create New Bet</h1>
          <p className="text-gray-600">Set up a prediction market and let people bet on the outcome</p>
          <div className="mt-2 text-sm text-blue-600">Powered by Privy - Wallet connected</div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Bet Question */}
            <div className="space-y-2">
              <Label htmlFor="question" className="text-base font-semibold text-gray-900">
                Bet Question
              </Label>
              <Input
                id="question"
                placeholder="Will the Lakers win the championship this year?"
                value={formData.question}
                onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                className="text-base"
                required
              />
              <p className="text-sm text-gray-500">
                The main question people will bet on (stored on-chain).
              </p>
            </div>

            {/* Bet Description */}
            <div className="space-y-2">
              <Label htmlFor="description" className="text-base font-semibold text-gray-900">
                Detailed Description
              </Label>
              <Textarea
                id="description"
                placeholder="Provide more context about the bet, resolution criteria, etc."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="resize-none"
                required
              />
              <p className="text-sm text-gray-500">
                Additional details to help bettors understand the conditions.
              </p>
            </div>

            {/* Bet Type */}
            <div className="space-y-2">
              <Label htmlFor="bet_type" className="text-base font-semibold text-gray-900">
                Bet Type
              </Label>
              <Select
                value={formData.bet_type}
                onValueChange={(value: 'binary' | 'overunder') =>
                  setFormData({ ...formData, bet_type: value })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select bet type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="binary">
                    <div className="flex items-center">
                      <TrendingUp className="h-4 w-4 mr-2" />
                      <div>
                        <div className="font-medium">Yes/No (Binary)</div>
                        <div className="text-xs text-gray-500">Simple yes or no outcome</div>
                      </div>
                    </div>
                  </SelectItem>
                  <SelectItem value="overunder">
                    <div className="flex items-center">
                      <TrendingUp className="h-4 w-4 mr-2" />
                      <div>
                        <div className="font-medium">Over/Under</div>
                        <div className="text-xs text-gray-500">Predict if value will be above/below threshold</div>
                      </div>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label htmlFor="category" className="text-base font-semibold text-gray-900">
                Category
              </Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Sports">Sports</SelectItem>
                  <SelectItem value="Crypto">Crypto</SelectItem>
                  <SelectItem value="Politics">Politics</SelectItem>
                  <SelectItem value="Weather">Weather</SelectItem>
                  <SelectItem value="Entertainment">Entertainment</SelectItem>
                  <SelectItem value="Technology">Technology</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Community Selection */}
            <div className="space-y-2">
              <Label htmlFor="community" className="text-base font-semibold text-gray-900">
                <Users className="inline h-4 w-4 mr-1" />
                Community (Optional)
              </Label>
              <Select
                value={formData.community_id || 'public'}
                onValueChange={(value) => setFormData({
                  ...formData,
                  community_id: value === 'public' ? null : value
                })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a community or leave public" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">
                    <div className="flex items-center">
                      <TrendingUp className="h-4 w-4 mr-2" />
                      <div>
                        <div className="font-medium">Public</div>
                        <div className="text-xs text-gray-500">Anyone can bet</div>
                      </div>
                    </div>
                  </SelectItem>
                  {communities.map((community) => (
                    <SelectItem key={community.id} value={community.id}>
                      <div className="flex items-center">
                        <Users className="h-4 w-4 mr-2" />
                        <div>
                          <div className="font-medium">{community.name}</div>
                          <div className="text-xs text-gray-500">Community members only</div>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Deadline */}
            <div className="space-y-2">
              <Label htmlFor="deadline" className="text-base font-semibold text-gray-900">
                <Clock className="inline h-4 w-4 mr-1" />
                Betting Deadline
              </Label>
              <Input
                id="deadline"
                type="datetime-local"
                value={formData.deadline}
                onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                className="w-full"
                required
              />
              <p className="text-sm text-gray-500">
                Users cannot place bets after this time.
              </p>
            </div>

            {/* Initial Stake */}
            <div className="space-y-2">
              <Label htmlFor="stake" className="text-base font-semibold text-gray-900">
                <DollarSign className="inline h-4 w-4 mr-1" />
                Initial Stake (ETH)
              </Label>
              <div className="relative">
                <Input
                  id="stake"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={formData.stakeAmount}
                  onChange={(e) => setFormData({ ...formData, stakeAmount: e.target.value })}
                  className="pl-8"
                  required
                />
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">Ξ</span>
              </div>
              <p className="text-sm text-gray-500">
                Your initial stake will be distributed equally across all betting options for balanced liquidity.
              </p>
            </div>

            {/* Submit Button */}
            <div className="pt-6">
              <Button
                type="submit"
                className="w-full bg-gray-900 hover:bg-gray-800 text-white py-3 text-base font-semibold"
                disabled={creatingBet || txLoading}
              >
                {creatingBet ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {txHash ? 'Waiting for Confirmation...' : 'Creating Bet On-Chain...'}
                  </>
                ) : (
                  'Create Bet'
                )}
              </Button>
              
              {txHash && (
                <div className="mt-2 text-center text-sm text-gray-500">
                  Transaction: <span className="font-mono">{txHash.slice(0, 10)}...{txHash.slice(-8)}</span>
                </div>
              )}
            </div>
          </form>
        </div>

        {/* Help Section */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">How it works</h3>
          <div className="space-y-2 text-sm text-blue-800">
            <p>• Your bet is created on the Ethereum blockchain for transparency</p>
            <p>• Your initial stake provides balanced liquidity across all options</p>
            <p>• People buy "Yes/No" or "Over/Under" shares with ETH</p>
            <p>• When resolved, winning shares get the entire pool</p>
            <p>• All transactions are recorded on-chain and in our database</p>
          </div>
        </div>
      </main>
      </div>
    </AuthGuard>
  );
} 