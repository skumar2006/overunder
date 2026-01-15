import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(req: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Server not configured for admin Supabase access' }, { status: 500 });
    }

    const body = await req.json();

    // Ensure creator exists to satisfy FK constraint
    const creatorId: string | undefined = body?.creator_id;
    if (!creatorId) {
      return NextResponse.json({ error: 'creator_id is required' }, { status: 400 });
    }

    const { data: existingUser, error: userCheckError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('id', creatorId)
      .maybeSingle();
    if (userCheckError) {
      return NextResponse.json({ error: userCheckError }, { status: 400 });
    }

    if (!existingUser) {
      // Create minimal user record; username required in some schemas
      const fallbackUsername = `user-${creatorId.slice(0, 8)}`;
      const { error: createUserError } = await supabaseAdmin
        .from('users')
        .insert({ id: creatorId, username: fallbackUsername })
        .single();
      if (createUserError) {
        return NextResponse.json({ error: createUserError }, { status: 400 });
      }
    }

    // Insert bet
    const { data, error } = await supabaseAdmin
      .from('bets')
      .insert(body)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }

    return NextResponse.json({ data }, { status: 200 });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error)?.message || 'Unknown error' }, { status: 500 });
  }
}

