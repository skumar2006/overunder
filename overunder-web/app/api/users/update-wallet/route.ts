import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(req: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Server not configured for admin Supabase access' }, { status: 500 });
    }

    const body = await req.json();
    const { userId, walletAddress } = body;

    if (!userId || !walletAddress) {
      return NextResponse.json({ error: 'Missing required fields: userId, walletAddress' }, { status: 400 });
    }

    // Update wallet address with service role to bypass RLS
    const { data, error } = await supabaseAdmin
      .from('users')
      .update({ wallet_address: walletAddress })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating wallet address:', error);
      return NextResponse.json({ error: error }, { status: 400 });
    }

    return NextResponse.json({ data }, { status: 200 });
  } catch (err: any) {
    console.error('Error in /api/users/update-wallet:', err);
    return NextResponse.json({ error: err?.message || 'Unknown error' }, { status: 500 });
  }
}