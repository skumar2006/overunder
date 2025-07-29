'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Wallet, Shield, Gift, TrendingUp } from 'lucide-react';

export default function LoginPage() {
  const { user, isConnected, connect } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user && isConnected) {
      router.push('/');
    }
  }, [user, isConnected, router]);

  const handleConnect = () => {
    connect();
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          {/* Logo */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">OverUnder</h1>
            <p className="text-gray-600">Connect your wallet to join prediction markets</p>
          </div>

          {/* Wallet Connection */}
          <div className="space-y-6">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                <Wallet className="w-8 h-8 text-blue-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Connect Your Wallet</h2>
              <p className="text-sm text-gray-600 mb-6">
                Connect your Ethereum wallet to start betting on prediction markets
              </p>
            </div>

            <button
              onClick={handleConnect}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-xl font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 transition-colors flex items-center justify-center space-x-2"
            >
              <Wallet className="w-5 h-5" />
              <span>Connect Wallet</span>
            </button>
          </div>

          {/* Features */}
          <div className="mt-8 space-y-4">
            <div className="flex items-center space-x-3 text-sm text-gray-600">
              <Shield className="w-5 h-5 text-green-500" />
              <span>Secure wallet-based authentication</span>
            </div>
            <div className="flex items-center space-x-3 text-sm text-gray-600">
              <TrendingUp className="w-5 h-5 text-blue-500" />
              <span>Create and bet on prediction markets</span>
            </div>
            <div className="flex items-center space-x-3 text-sm text-gray-600">
              <Gift className="w-5 h-5 text-purple-500" />
              <span>Earn rewards for accurate predictions</span>
            </div>
          </div>

          {/* Network Info */}
          <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-xl">
            <p className="text-xs text-blue-800 text-center">
              <strong>Local Development:</strong> Make sure MetaMask is connected to localhost:8545 (Chain ID: 31337)
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