import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET() {
  try {
    // Test if communities table exists
    const { data: communitiesTest, error: communitiesError } = await supabaseAdmin
      .from('communities')
      .select('count(*)', { count: 'exact', head: true });

    // Test if community_members table exists  
    const { data: membersTest, error: membersError } = await supabaseAdmin
      .from('community_members')
      .select('count(*)', { count: 'exact', head: true });

    // Test if bets table exists
    const { data: betsTest, error: betsError } = await supabaseAdmin
      .from('bets')
      .select('count(*)', { count: 'exact', head: true });

    // Test if users table exists
    const { data: usersTest, error: usersError } = await supabaseAdmin
      .from('users')
      .select('count(*)', { count: 'exact', head: true });

    return NextResponse.json({
      success: true,
      tables: {
        communities: {
          exists: !communitiesError,
          error: communitiesError?.message || null,
          count: communitiesTest?.length || 0
        },
        community_members: {
          exists: !membersError,
          error: membersError?.message || null,
          count: membersTest?.length || 0
        },
        bets: {
          exists: !betsError,
          error: betsError?.message || null,
          count: betsTest?.length || 0
        },
        users: {
          exists: !usersError,
          error: usersError?.message || null,
          count: usersTest?.length || 0
        }
      }
    });
  } catch (err: any) {
    console.error('Error checking tables:', err);
    return NextResponse.json({ 
      success: false, 
      error: err?.message || 'Unknown error',
      details: err
    }, { status: 500 });
  }
}