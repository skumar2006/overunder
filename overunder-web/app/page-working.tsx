'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function HomePage() {
  const [selectedTab, setSelectedTab] = useState('trending');

  const mockBets = [
    {
      id: '1',
      description: 'Will Bitcoin reach $100,000 by end of 2024?',
      creator: { name: 'CryptoEnthusiast' },
      community: { name: 'Crypto Predictions' },
      deadline: '2024-12-31',
      sharePrice: 1.00,
      yesShares: 450,
      noShares: 320
    },
    {
      id: '2', 
      description: 'Will Taylor Swift win a Grammy in 2024?',
      creator: { name: 'MusicFan' },
      community: { name: 'Entertainment' },
      deadline: '2024-02-04',
      sharePrice: 1.00,
      yesShares: 890,
      noShares: 120
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Simple Navbar */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-purple-600">OverUnder</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/demo" className="text-gray-600 hover:text-gray-900">Demo</Link>
              <div className="bg-green-100 px-3 py-1 rounded-full text-sm">
                $100.00 Balance
              </div>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Prediction Markets
          </h2>
          <p className="text-gray-600">
            Join communities and bet on future events with your friends
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {['trending', 'new', 'ending-soon', 'my-bets'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setSelectedTab(tab)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    selectedTab === tab
                      ? 'border-purple-500 text-purple-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Bet Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {mockBets.map((bet) => (
            <div key={bet.id} className="bg-white rounded-lg shadow p-6">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {bet.description}
                </h3>
                <div className="flex items-center text-sm text-gray-500 space-x-4">
                  <span>{bet.creator.name}</span>
                  <span>{bet.community.name}</span>
                </div>
              </div>

              <div className="mb-4">
                <div className="flex justify-between text-sm text-gray-600 mb-2">
                  <span>Yes: {bet.yesShares}</span>
                  <span>No: {bet.noShares}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full" 
                    style={{ 
                      width: `${(bet.yesShares / (bet.yesShares + bet.noShares)) * 100}%` 
                    }}
                  ></div>
                </div>
              </div>

              <div className="flex space-x-2">
                <button className="flex-1 bg-green-500 text-white py-2 px-4 rounded hover:bg-green-600">
                  Yes ${bet.sharePrice}
                </button>
                <button className="flex-1 bg-red-500 text-white py-2 px-4 rounded hover:bg-red-600">
                  No ${bet.sharePrice}
                </button>
              </div>

              <div className="mt-3 text-xs text-gray-500">
                Ends: {bet.deadline}
              </div>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="mt-12 bg-purple-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link href="/bets/new" className="bg-white p-4 rounded-lg shadow hover:shadow-md transition-shadow">
              <div className="text-purple-600 font-semibold">Create New Bet</div>
              <div className="text-sm text-gray-600">Start a prediction market</div>
            </Link>
            <Link href="/communities" className="bg-white p-4 rounded-lg shadow hover:shadow-md transition-shadow">
              <div className="text-purple-600 font-semibold">Browse Communities</div>
              <div className="text-sm text-gray-600">Find betting groups</div>
            </Link>
            <Link href="/profile" className="bg-white p-4 rounded-lg shadow hover:shadow-md transition-shadow">
              <div className="text-purple-600 font-semibold">View Profile</div>
              <div className="text-sm text-gray-600">Check your stats</div>
            </Link>
          </div>
        </div>

        {/* Status Message */}
        <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="text-yellow-800 font-semibold">⚠️ Demo Mode Active</div>
          <div className="text-yellow-700 text-sm">
            External services (Supabase, Magic SDK) need configuration. 
            This is a working demo with mock data.
          </div>
        </div>
      </main>
    </div>
  );
} 