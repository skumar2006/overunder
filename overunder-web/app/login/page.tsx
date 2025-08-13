'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usePrivyAuth } from '@/hooks/usePrivyAuth';
import { Shield, Gift, TrendingUp, Wallet, Mail } from 'lucide-react';

export default function LoginPage() {
  const { user, loading, login, authenticated, ready } = usePrivyAuth();
  const router = useRouter();

  useEffect(() => {
    if (authenticated && user && !loading) {
      console.log('User authenticated, redirecting to dashboard...');
      router.push('/');
    }
  }, [authenticated, user, loading, router]);

  // Always render the login UI; redirect effect will navigate when authenticated

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          {/* Logo */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">OverUnder</h1>
            <p className="text-gray-600">
              Sign in to create and bet on prediction markets
            </p>
          </div>

          {/* Login Options */}
          <div className="space-y-4">
            <button
              type="button"
              onClick={async () => {
                console.log('Login: email clicked', { ready });
                const invoke = () => login({ loginMethods: ['email'] }).catch((e: any) => console.error('Privy login error', e));
                if (!ready) {
                  // Retry shortly if SDK not yet ready
                  setTimeout(invoke, 300);
                } else {
                  await invoke();
                }
              }}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-xl font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 transition-colors flex items-center justify-center space-x-2"
            >
              <Mail className="w-5 h-5" />
              <span>Continue with Email</span>
            </button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-gray-500">
                  Or continue with
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={async () => {
                console.log('Login: wallet clicked', { ready });
                const invoke = () => login().catch((e: any) => console.error('Privy login error', e));
                if (!ready) {
                  setTimeout(invoke, 300);
                } else {
                  await invoke();
                }
              }}
              className="w-full bg-white text-gray-700 py-3 px-4 rounded-xl font-medium border border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 transition-colors flex items-center justify-center space-x-2"
            >
              <Wallet className="w-5 h-5" />
              <span>Connect Wallet</span>
            </button>
          </div>

          {/* Features */}
          <div className="mt-8 space-y-4">
            <div className="flex items-center space-x-3 text-sm text-gray-600">
              <Shield className="w-5 h-5 text-green-500" />
              <span>Secure embedded wallet system</span>
            </div>
            <div className="flex items-center space-x-3 text-sm text-gray-600">
              <TrendingUp className="w-5 h-5 text-blue-500" />
              <span>Create and bet on prediction markets</span>
            </div>
            <div className="flex items-center space-x-3 text-sm text-gray-600">
              <Gift className="w-5 h-5 text-purple-500" />
              <span>$1000 bonus credits to start betting</span>
            </div>
          </div>

          {/* Info */}
          <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-xl">
            <p className="text-xs text-blue-800 text-center">
              <strong>Powered by Privy:</strong> We'll create a secure embedded wallet for you automatically. 
              No MetaMask required! You can also connect your existing wallet.
            </p>
          </div>

          {/* New User Info */}
          <div className="mt-6 text-center text-sm text-gray-500">
            <p>
              New to OverUnder? Don't worry! 
              <br />
              We'll create your account automatically when you sign in.
            </p>
          </div>

          {/* Back to Home */}
          <div className="mt-6 text-center">
            <button
              onClick={() => router.push('/')}
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              ← Back to Homepage
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}