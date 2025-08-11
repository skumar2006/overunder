import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(req: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const { resolutionId, betId, userId, proposedOutcome, disputeStake } = await req.json();

    if (!resolutionId || !betId || !userId || proposedOutcome === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check if user participated in the bet
    const { data: shares, error: sharesError } = await supabaseAdmin
      .from('shares_owned')
      .select('*')
      .eq('bet_id', betId)
      .eq('user_id', userId);

    if (sharesError || !shares || shares.length === 0) {
      return NextResponse.json({ error: 'Only participants can dispute' }, { status: 403 });
    }

    // Check if resolution exists and is within dispute period
    const { data: resolution, error: resError } = await supabaseAdmin
      .from('dispute_resolutions')
      .select('*')
      .eq('id', resolutionId)
      .single();

    if (resError || !resolution) {
      return NextResponse.json({ error: 'Resolution not found' }, { status: 404 });
    }

    if (new Date(resolution.dispute_deadline) < new Date()) {
      return NextResponse.json({ error: 'Dispute period has ended' }, { status: 400 });
    }

    if (resolution.status !== 'pending') {
      return NextResponse.json({ error: 'Resolution already disputed or resolved' }, { status: 400 });
    }

    // Calculate voting deadline (48 hours from now)
    const votingDeadline = new Date();
    votingDeadline.setHours(votingDeadline.getHours() + 48);

    // Create dispute record
    const { data: dispute, error: disputeError } = await supabaseAdmin
      .from('disputes')
      .insert({
        resolution_id: resolutionId,
        bet_id: betId,
        onchain_bet_id: resolution.onchain_bet_id,
        initiator_id: userId,
        proposed_outcome: proposedOutcome,
        dispute_stake: disputeStake || 0.01,
        voting_deadline: votingDeadline.toISOString(),
        status: 'active'
      })
      .select()
      .single();

    if (disputeError) {
      console.error('Error creating dispute:', disputeError);
      return NextResponse.json({ error: disputeError }, { status: 400 });
    }

    // Update resolution status
    await supabaseAdmin
      .from('dispute_resolutions')
      .update({ status: 'disputed' })
      .eq('id', resolutionId);

    // Update bet status
    await supabaseAdmin
      .from('bets')
      .update({
        resolution_status: 'disputed',
        dispute_count: resolution.dispute_count + 1
      })
      .eq('id', betId);

    // Calculate initiator's vote weight
    const totalStake = shares.reduce((sum, s) => sum + parseFloat(s.shares_owned.toString()), 0);

    // Auto-cast initiator's vote
    const { data: vote } = await supabaseAdmin
      .from('dispute_votes')
      .insert({
        dispute_id: dispute.id,
        voter_id: userId,
        outcome_choice: proposedOutcome,
        vote_weight: totalStake
      })
      .select()
      .single();

    return NextResponse.json({
      success: true,
      dispute,
      vote,
      votingDeadline: votingDeadline.toISOString()
    }, { status: 200 });

  } catch (error: unknown) {
    console.error('Error in /api/bets/dispute:', error);
    return NextResponse.json({ error: (error as Error)?.message || 'Unknown error' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const { searchParams } = new URL(req.url);
    const betId = searchParams.get('betId');

    if (!betId) {
      return NextResponse.json({ error: 'Bet ID required' }, { status: 400 });
    }

    // Get resolution and dispute info
    const { data: resolution } = await supabaseAdmin
      .from('dispute_resolutions')
      .select(`
        *,
        disputes (
          *,
          dispute_votes (
            *,
            voter:users (
              id,
              username,
              wallet_address
            )
          )
        )
      `)
      .eq('bet_id', betId)
      .single();

    if (!resolution) {
      return NextResponse.json({ 
        hasResolution: false,
        hasDispute: false 
      }, { status: 200 });
    }

    const dispute = resolution.disputes?.[0];
    
    // Calculate vote tallies
    const voteTallies: Record<string, number> = {};
    if (dispute?.dispute_votes) {
      dispute.dispute_votes.forEach(vote => {
        if (!voteTallies[vote.outcome_choice]) {
          voteTallies[vote.outcome_choice] = 0;
        }
        voteTallies[vote.outcome_choice] += parseFloat(vote.vote_weight);
      });
    }

    return NextResponse.json({
      hasResolution: true,
      resolution,
      hasDispute: !!dispute,
      dispute,
      voteTallies,
      canVote: dispute && new Date(dispute.voting_deadline) > new Date()
    }, { status: 200 });

  } catch (error: unknown) {
    console.error('Error fetching dispute info:', error);
    return NextResponse.json({ error: (error as Error)?.message || 'Unknown error' }, { status: 500 });
  }
}