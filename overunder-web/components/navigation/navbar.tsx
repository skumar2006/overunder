'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePrivyAuth } from '@/hooks/usePrivyAuth';
import { useBalance } from 'wagmi';
import { formatEther } from 'viem';
import { Menu, X, User, LogOut, Plus, Wallet } from 'lucide-react';

export function Navbar() {
  const { user, loading, logout, address } = usePrivyAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Get on-chain ETH balance
  const { data: ethBalance, isLoading: balanceLoading, error: balanceError } = useBalance({
    address: address as `0x${string}` | undefined,
    chainId: 84532, // Base Sepolia
    query: {
      enabled: !!address, // Only fetch when address is available
      refetchInterval: 10000, // Refetch every 10 seconds
    },
  });

  // Debug balance (only in development)
  if (process.env.NODE_ENV === 'development') {
    console.log('💰 Balance Debug:', {
      address,
      hasAddress: !!address,
      ethBalance: ethBalance ? formatEther(ethBalance.value) : 'null',
      ethBalanceRaw: ethBalance?.value?.toString(),
      balanceLoading,
      balanceError: balanceError?.message,
      chainId: 84532,
      isMounted
    });
  }



  // Prevent hydration errors by only rendering user-dependent UI after mount
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleSignOut = async () => {
    await logout();
    setIsMenuOpen(false);
  };



  return (
    <nav className="bg-white border-b border-gray-100 sticky top-0 z-40 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 md:h-16">
          {/* Logo */}
          <Link href="/" className="text-lg md:text-xl font-bold text-gray-900 flex-shrink-0">
            OverUnder
          </Link>

          {/* Navigation Links - Desktop */}
          <div className="hidden md:flex items-center space-x-6 lg:space-x-8">
            <Link
              href="/"
              className="text-gray-600 hover:text-gray-900 font-medium text-sm lg:text-base transition-colors"
            >
              Markets
            </Link>
            <Link
              href="/communities"
              className="text-gray-600 hover:text-gray-900 font-medium text-sm lg:text-base transition-colors"
            >
              Communities
            </Link>
          </div>

          {/* Right side - Only render after mount to prevent hydration errors */}
          <div className="flex items-center space-x-2 md:space-x-4">
            {!isMounted ? (
              // Skeleton loader while mounting
              <div className="bg-gray-200 animate-pulse h-8 md:h-10 w-24 md:w-32 rounded-lg"></div>
            ) : user ? (
              <>
                {/* ETH Balance - Responsive */}
                {balanceLoading ? (
                  <div className="bg-gray-100 border border-gray-200 px-2 md:px-3 py-1 rounded-full animate-pulse">
                    <span className="text-xs md:text-sm font-medium text-gray-500">Loading...</span>
                  </div>
                ) : ethBalance ? (
                  <div className="bg-blue-50 border border-blue-200 px-2 md:px-3 py-1 rounded-full">
                    <div className="flex items-center space-x-1">
                      <Wallet className="h-3 w-3 md:h-4 md:w-4 text-blue-600" />
                      <span className="text-xs md:text-sm font-medium text-blue-800">
                        {parseFloat(formatEther(ethBalance.value)).toFixed(4)} ETH
                      </span>
                    </div>
                  </div>
                ) : balanceError ? (
                  <div className="bg-red-50 border border-red-200 px-2 md:px-3 py-1 rounded-full">
                    <span className="text-xs md:text-sm font-medium text-red-800">Balance Error</span>
                  </div>
                ) : address ? (
                  <div className="bg-gray-50 border border-gray-200 px-3 py-1 rounded-full">
                    <span className="text-sm font-medium text-gray-600">0.0000 ETH</span>
                  </div>
                ) : null}

                {/* Create Button - Desktop */}
                <Link
                  href="/bets/new"
                  className="hidden lg:inline-flex items-center px-3 lg:px-4 py-2 bg-gray-900 text-white rounded-lg text-xs lg:text-sm font-medium hover:bg-gray-800 transition-colors"
                >
                  <Plus className="h-3 w-3 lg:h-4 lg:w-4 mr-1 lg:mr-2" />
                  Create Bet
                </Link>

                {/* Create Button - Mobile/Tablet */}
                <Link
                  href="/bets/new"
                  className="lg:hidden bg-gray-900 text-white p-2 rounded-full hover:bg-gray-800 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                </Link>

                {/* Profile Menu */}
                <div className="relative">
                  <button
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    className="flex items-center space-x-1 md:space-x-2 bg-gray-100 px-2 md:px-3 py-2 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    <User className="h-4 w-4 text-gray-600" />
                    <span className="hidden sm:block text-xs md:text-sm font-medium text-gray-700 max-w-20 truncate">
                      {user.username}
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
                            <p className="text-sm font-medium text-gray-900">{user.username}</p>
                            <p className="text-xs text-gray-500">{user.email}</p>
                            {ethBalance && (
                              <p className="text-xs text-gray-400 font-mono mt-1">
                                ETH: {parseFloat(formatEther(ethBalance.value)).toFixed(4)}
                              </p>
                            )}
                          </div>
                          
                          <Link
                            href="/profile"
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
                            onClick={handleSignOut}
                            className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                          >
                            <LogOut className="h-4 w-4 mr-2" />
                            Sign Out
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </>
            ) : (
              <Link
                href="/login"
                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center space-x-2"
              >
                <User className="h-4 w-4" />
                <span>Sign In</span>
              </Link>
            )}
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        <div className="md:hidden border-t border-gray-100">
          <div className="px-4 py-3 space-y-1">
            <Link
              href="/"
              className="block px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-md font-medium text-sm transition-colors"
            >
              Markets
            </Link>
            <Link
              href="/communities"
              className="block px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-md font-medium text-sm transition-colors"
            >
              Communities
            </Link>
          </div>
        </div>


      </div>
    </nav>
  );
} 