'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usePrivyAuth } from '@/hooks/usePrivyAuth';

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { authenticated, loading, ready, user, privyUser } = usePrivyAuth();
  const router = useRouter();

  useEffect(() => {
    // Wait for Privy to be ready and user loading to complete
    if (!ready || loading) return;

    // If not authenticated OR no user created yet, redirect to login
    if (!authenticated || !user) {
      router.replace('/login');
      return;
    }
  }, [authenticated, loading, ready, user, privyUser, router]);

  // Show loading while checking auth
  if (!ready || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show loading while redirecting unauthenticated users or users without user object
  if (!authenticated || !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">
            {!authenticated ? 'Redirecting to login...' : 'Setting up your account...'}
          </p>
        </div>
      </div>
    );
  }

  // User is authenticated, render the protected content
  return <>{children}</>;
}