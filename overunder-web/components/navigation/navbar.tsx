'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { useAuth } from '@/contexts/AuthContext';
import { Menu, X, User, LogOut, Plus, Wallet } from 'lucide-react';

export function Navbar() {
  const { user, loading } = useAuth();
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const [balance, setBalance] = useState(10000); // Default Hardhat balance
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Prevent hydration errors by only rendering wallet-dependent UI after mount
  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isConnected && address) {
      // In a real app, you'd fetch the actual balance here
      setBalance(10000); // Hardhat test account has 10k ETH
    }
  }, [isConnected, address]);

  const handleConnect = () => {
    const injectedConnector = connectors.find(
      (connector) => connector.name === 'MetaMask' || connector.name === 'Injected'
    );
    if (injectedConnector) {
      connect({ connector: injectedConnector });
    } else if (connectors[0]) {
      connect({ connector: connectors[0] });
    }
  };

  const handleDisconnect = () => {
    disconnect();
    setIsMenuOpen(false);
  };

  const shortenAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <nav className="bg-white border-b border-gray-100 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="text-xl font-bold text-gray-900">
            OverUnder
          </Link>

          {/* Navigation Links - Desktop */}
          <div className="hidden md:flex items-center space-x-8">
            <Link
              href="/"
              className="text-gray-600 hover:text-gray-900 font-medium"
            >
              Markets
            </Link>
            <Link
              href="/communities"
              className="text-gray-600 hover:text-gray-900 font-medium"
            >
              Communities
            </Link>
          </div>

          {/* Right side - Only render after mount to prevent hydration errors */}
          <div className="flex items-center space-x-4">
            {!isMounted ? (
              // Skeleton loader while mounting
              <div className="bg-gray-200 animate-pulse h-10 w-32 rounded-lg"></div>
            ) : isConnected && address ? (
              <>
                {/* Balance */}
                <div className="bg-green-50 border border-green-200 px-3 py-1 rounded-full">
                  <span className="text-sm font-medium text-green-800">
                    {balance.toFixed(0)} ETH
                  </span>
                </div>

                {/* Create Button - Desktop */}
                <Link
                  href="/bets/new"
                  className="hidden md:inline-flex items-center px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Bet
                </Link>

                {/* Create Button - Mobile */}
                <Link
                  href="/bets/new"
                  className="md:hidden bg-gray-900 text-white p-2 rounded-full hover:bg-gray-800 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                </Link>

                {/* Profile Menu */}
                <div className="relative">
                  <button
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    className="flex items-center space-x-2 bg-gray-100 px-3 py-2 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    <Wallet className="h-4 w-4 text-gray-600" />
                    <span className="text-sm font-medium text-gray-700">
                      {shortenAddress(address)}
                    </span>
                  </button>

                  {/* Dropdown Menu */}
                  {isMenuOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setIsMenuOpen(false)}
                      />
                      <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-100 z-20">
                        <div className="py-2">
                          <div className="px-4 py-2 border-b border-gray-100">
                            <p className="text-sm font-medium text-gray-900">Wallet Connected</p>
                            <p className="text-xs text-gray-500 font-mono">{shortenAddress(address)}</p>
                          </div>
                          
                          <Link
                            href={`/profile/${address}`}
                            className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                            onClick={() => setIsMenuOpen(false)}
                          >
                            <User className="h-4 w-4 mr-2" />
                            Profile
                          </Link>
                          
                          <Link
                            href="/communities"
                            className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 md:hidden"
                            onClick={() => setIsMenuOpen(false)}
                          >
                            <Menu className="h-4 w-4 mr-2" />
                            Communities
                          </Link>
                          
                          <button
                            onClick={handleDisconnect}
                            className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                          >
                            <LogOut className="h-4 w-4 mr-2" />
                            Disconnect
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </>
            ) : (
              <button
                onClick={handleConnect}
                disabled={loading}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
              >
                <Wallet className="h-4 w-4" />
                <span>{loading ? 'Connecting...' : 'Connect Wallet'}</span>
              </button>
            )}
          </div>
        </div>
        {/* Network Warning - Only show after mount */}
        {isMounted && isConnected && (
          <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-2">
            <p className="text-xs text-yellow-800 text-center">
              <strong>Development Mode:</strong> Connected to localhost:8545 (Chain ID: 31337)
            </p>
          </div>
        )}
      </div>
    </nav>
  );
} 