import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(req: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const { disputeId, userId, outcomeChoice } = await req.json();

    if (!disputeId || !userId || outcomeChoice === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get dispute details
    const { data: dispute, error: disputeError } = await supabaseAdmin
      .from('disputes')
      .select('*, dispute_resolutions!inner(*)')
      .eq('id', disputeId)
      .single();

    if (disputeError || !dispute) {
      return NextResponse.json({ error: 'Dispute not found' }, { status: 404 });
    }

    // Check if voting is still open
    if (new Date(dispute.voting_deadline) < new Date()) {
      return NextResponse.json({ error: 'Voting period has ended' }, { status: 400 });
    }

    // Check if user already voted
    const { data: existingVote } = await supabaseAdmin
      .from('dispute_votes')
      .select('*')
      .eq('dispute_id', disputeId)
      .eq('voter_id', userId)
      .single();

    if (existingVote) {
      return NextResponse.json({ error: 'Already voted' }, { status: 400 });
    }

    // Check if user participated in the bet
    const { data: shares, error: sharesError } = await supabaseAdmin
      .from('shares_owned')
      .select('*')
      .eq('bet_id', dispute.bet_id)
      .eq('user_id', userId);

    if (sharesError || !shares || shares.length === 0) {
      return NextResponse.json({ error: 'Only participants can vote' }, { status: 403 });
    }

    // Calculate vote weight based on shares owned
    const voteWeight = shares.reduce((sum, s) => sum + parseFloat(s.shares_owned.toString()), 0);

    // Cast vote
    const { data: vote, error: voteError } = await supabaseAdmin
      .from('dispute_votes')
      .insert({
        dispute_id: disputeId,
        voter_id: userId,
        outcome_choice: outcomeChoice,
        vote_weight: voteWeight
      })
      .select()
      .single();

    if (voteError) {
      console.error('Error casting vote:', voteError);
      return NextResponse.json({ error: voteError }, { status: 400 });
    }

    // Get updated vote tallies
    const { data: allVotes } = await supabaseAdmin
      .from('dispute_votes')
      .select('outcome_choice, vote_weight')
      .eq('dispute_id', disputeId);

    let voteTallies = {};
    allVotes?.forEach(v => {
      if (!voteTallies[v.outcome_choice]) {
        voteTallies[v.outcome_choice] = 0;
      }
      voteTallies[v.outcome_choice] += parseFloat(v.vote_weight);
    });

    return NextResponse.json({
      success: true,
      vote,
      voteTallies,
      totalVotes: allVotes?.length || 0
    }, { status: 200 });

  } catch (error: unknown) {
    console.error('Error in /api/bets/vote:', error);
    return NextResponse.json({ error: (error as Error)?.message || 'Unknown error' }, { status: 500 });
  }
}