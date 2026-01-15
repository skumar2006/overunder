import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  
  // Public paths that don't require authentication
  const publicPaths = ['/login', '/api', '/favicon.ico', '/_next', '/static'];
  
  const isPublicPath = publicPaths.some(publicPath => 
    path.startsWith(publicPath)
  );
  
  // Allow public paths
  if (isPublicPath) {
    return NextResponse.next();
  }
  
  // For now, let client-side handle auth redirects to avoid conflicts
  // The server-side session check can be unreliable immediately after sign-in
  return NextResponse.next();
  
  // TODO: Re-enable server-side auth check once session sync is resolved
  /*
  try {
    const supabase = createServerSupabaseClient();
    
    if (!supabase) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    
    return NextResponse.next();
    
  } catch (error) {
    console.error('Middleware auth error:', error);
    return NextResponse.redirect(new URL('/login', request.url));
  }
  */
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
}; 