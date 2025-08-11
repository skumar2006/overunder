import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(req: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Server not configured for admin Supabase access' }, { status: 500 });
    }

    const body = await req.json();
    const { id, email, username, wallet_address } = body;

    if (!id || !email) {
      return NextResponse.json({ error: 'Missing required fields: id, email' }, { status: 400 });
    }

    // First, try to get existing user
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    let user = existingUser;

    if (!existingUser) {
      // Create new user if doesn't exist
      const { data: newUser, error: userError } = await supabaseAdmin
        .from('users')
        .insert({
          id,
          email,
          username: username || email.split('@')[0],
          wallet_address,
        })
        .select()
        .single();

      if (userError) {
        // Check if it's a duplicate key error (race condition)
        if (userError.code === '23505') {
          console.log('User already exists (race condition), fetching existing user');
          const { data: raceUser } = await supabaseAdmin
            .from('users')
            .select('*')
            .eq('id', id)
            .single();
          user = raceUser;
        } else {
          console.error('Error creating user:', userError);
          return NextResponse.json({ error: userError }, { status: 400 });
        }
      } else {
        user = newUser;
      }
    } else {
      // Update existing user with new info if provided
      if (wallet_address && existingUser.wallet_address !== wallet_address) {
        const { data: updatedUser } = await supabaseAdmin
          .from('users')
          .update({ wallet_address })
          .eq('id', id)
          .select()
          .single();
        user = updatedUser || existingUser;
      }
    }

    // Create initial wallet balance if user was just created
    if (!existingUser && user) {
      const { error: balanceError } = await supabaseAdmin
        .from('wallet_balances')
        .insert({
          user_id: id,
          balance: 1000.00, // $1000 starting balance
        });

      if (balanceError && balanceError.code !== '23505') {
        // Ignore duplicate key errors (balance already exists)
        console.error('Error creating wallet balance:', balanceError);
        // Don't fail the user creation if balance creation fails
      }
    }

    return NextResponse.json({ data: user }, { status: 200 });
  } catch (err: any) {
    console.error('Error in /api/users:', err);
    return NextResponse.json({ error: err?.message || 'Unknown error' }, { status: 500 });
  }
}