import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { ethers } from 'ethers';

// Import contract ABI
import OverunderV2ABI from '@/lib/contracts/OverunderUpgradeable.json';

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || '0x8cEAae1cD5a22503D9EA7407Ca017377A5710BC7';
const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || 'https://sepolia.base.org';

export async function POST(req: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const { betId, proposedOutcome, userId } = await req.json();

    if (!betId || proposedOutcome === undefined || !userId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check if user is the creator of the bet
    const { data: bet, error: betError } = await supabaseAdmin
      .from('bets')
      .select('*')
      .eq('id', betId)
      .single();

    if (betError || !bet) {
      return NextResponse.json({ error: 'Bet not found' }, { status: 404 });
    }

    if (bet.creator_id !== userId) {
      return NextResponse.json({ error: 'Only bet creator can propose resolution' }, { status: 403 });
    }

    // Calculate dispute deadline (24 hours from now)
    const disputeDeadline = new Date();
    disputeDeadline.setHours(disputeDeadline.getHours() + 24);

    // Create resolution record
    const { data: resolution, error: resolutionError } = await supabaseAdmin
      .from('dispute_resolutions')
      .insert({
        bet_id: betId,
        onchain_bet_id: bet.onchain_bet_id,
        creator_id: userId,
        proposed_outcome: proposedOutcome,
        dispute_deadline: disputeDeadline.toISOString(),
        status: 'pending'
      })
      .select()
      .single();

    if (resolutionError) {
      console.error('Error creating resolution:', resolutionError);
      return NextResponse.json({ error: resolutionError }, { status: 400 });
    }

    // Update bet status
    await supabaseAdmin
      .from('bets')
      .update({
        resolution_status: 'proposed',
        proposed_outcome: proposedOutcome
      })
      .eq('id', betId);

    // TODO: Call smart contract to propose resolution
    // This would require a server-side wallet with appropriate permissions
    // For now, we'll return the transaction data for the client to execute

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const contract = new ethers.Contract(CONTRACT_ADDRESS, OverunderV2ABI.abi, provider);
    
    // Encode the transaction data
    const txData = contract.interface.encodeFunctionData('proposeBetResolution', [
      bet.onchain_bet_id,
      proposedOutcome
    ]);

    return NextResponse.json({
      success: true,
      resolution,
      transactionData: {
        to: CONTRACT_ADDRESS,
        data: txData,
        value: '0x0'
      }
    }, { status: 200 });

  } catch (error: unknown) {
    console.error('Error in /api/bets/resolve:', error);
    return NextResponse.json({ error: (error as Error)?.message || 'Unknown error' }, { status: 500 });
  }
}