'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePrivyAuth } from '@/hooks/usePrivyAuth';
import { Menu, X, User, LogOut, Plus, Wallet } from 'lucide-react';

export function Navbar() {
  const { user, loading, logout, balance } = usePrivyAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Prevent hydration errors by only rendering user-dependent UI after mount
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleSignOut = async () => {
    await logout();
    setIsMenuOpen(false);
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
            ) : user ? (
              <>
                {/* Balance */}
                <div className="bg-green-50 border border-green-200 px-3 py-1 rounded-full">
                  <span className="text-sm font-medium text-green-800">
                    ${balance.toFixed(0)}
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
                    <User className="h-4 w-4 text-gray-600" />
                    <span className="text-sm font-medium text-gray-700">
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
                            <p className="text-xs text-gray-400 font-mono mt-1">
                              Balance: ${balance.toFixed(0)}
                            </p>
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
        {/* Custodial System Notice - Only show after mount */}
        {isMounted && user && (
          <div className="bg-blue-50 border-b border-blue-200 px-4 py-2">
            <p className="text-xs text-blue-800 text-center">
              <strong>Custodial Wallet:</strong> Your funds are managed securely. No MetaMask required!
            </p>
          </div>
        )}
      </div>
    </nav>
  );
} 