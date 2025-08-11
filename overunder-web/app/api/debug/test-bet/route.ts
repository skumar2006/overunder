import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET() {
  try {
    // Check if supabaseAdmin is configured
    if (!supabaseAdmin) {
      return NextResponse.json({
        error: 'supabaseAdmin not configured',
        details: 'SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL missing'
      }, { status: 500 });
    }

    // Test connection by trying to read from users table
    const { data: users, error: usersError } = await supabaseAdmin
      .from('users')
      .select('id')
      .limit(1);

    if (usersError) {
      return NextResponse.json({
        error: 'Database connection failed',
        details: usersError
      }, { status: 500 });
    }

    // Test connection to bets table
    const { data: bets, error: betsError } = await supabaseAdmin
      .from('bets')
      .select('id')
      .limit(1);

    if (betsError) {
      return NextResponse.json({
        error: 'Bets table access failed',
        details: betsError
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Database connection working',
      usersCount: users?.length || 0,
      betsCount: bets?.length || 0
    });

  } catch (error: unknown) {
    return NextResponse.json({
      error: 'Unexpected error',
      details: (error as Error)?.message
    }, { status: 500 });
  }
}