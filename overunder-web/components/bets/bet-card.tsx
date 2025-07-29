'use client';

import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { Clock } from 'lucide-react';

interface BetCardProps {
  bet: {
    id: string;
    description: string;
    creator: { id: string; username: string; profile_pic_url?: string };
    community: { name: string } | null;
    deadline: string;
    fixed_share_price: number;
    yes_shares?: number;
    no_shares?: number;
  };
  onBetClick: (side: 'yes' | 'no') => void;
}

export function BetCard({ bet, onBetClick }: BetCardProps) {
  const yesShares = bet.yes_shares || 120;
  const noShares = bet.no_shares || 880;
  const totalShares = yesShares + noShares;
  const yesPercentage = Math.round((yesShares / totalShares) * 100);
  
  // Calculate days left
  const daysLeft = Math.max(0, Math.ceil((new Date(bet.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)));
  
  // Mock chart data showing percentage over time
  const chartData = [
    { value: yesPercentage + 15 },
    { value: yesPercentage + 8 },
    { value: yesPercentage - 5 },
    { value: yesPercentage - 2 },
    { value: yesPercentage + 3 },
    { value: yesPercentage },
  ];

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
      {/* Time Indicator */}
      <div className="flex justify-end mb-4">
        <div className="flex items-center text-gray-400 text-sm">
          <Clock className="h-4 w-4 mr-1" />
          {daysLeft} day{daysLeft !== 1 ? 's' : ''} left
        </div>
      </div>

      {/* User Avatar */}
      <div className="flex items-center mb-4">
        <img
          src={bet.creator.profile_pic_url || `https://i.pravatar.cc/40?img=${bet.creator.id}`}
          alt={bet.creator.username}
          className="w-12 h-12 rounded-full object-cover"
        />
        <div className="ml-3">
          <p className="font-medium text-gray-900">{bet.creator.username}</p>
          {bet.community && (
            <p className="text-sm text-gray-500">{bet.community.name}</p>
          )}
        </div>
      </div>

      {/* Question */}
      <h3 className="text-lg font-semibold text-gray-900 mb-6 leading-tight">
        {bet.description}
      </h3>

      {/* Bet Buttons */}
      <div className="flex space-x-3 mb-6">
        <button
          onClick={() => onBetClick('yes')}
          className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-900 font-medium py-3 px-4 rounded-xl transition-colors"
        >
          Yes ${bet.fixed_share_price.toFixed(0)}
        </button>
        <button
          onClick={() => onBetClick('no')}
          className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-900 font-medium py-3 px-4 rounded-xl transition-colors"
        >
          No ${(bet.fixed_share_price * (totalShares / yesShares)).toFixed(0)}
        </button>
      </div>

      {/* Chart */}
      <div className="mb-4 h-20">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <Line
              type="monotone"
              dataKey="value"
              stroke="#9CA3AF"
              strokeWidth={2}
              dot={false}
              strokeDasharray="none"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Probability */}
      <div className="flex items-center justify-center">
        <span className="text-2xl font-bold text-gray-900">{yesPercentage}% Chance</span>
        <div className="ml-2 flex items-center text-gray-400">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
          <span className="text-sm ml-1">15.4</span>
        </div>
      </div>

      {/* Pagination Dots */}
      <div className="flex justify-center mt-6 space-x-2">
        <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
        <div className="w-2 h-2 bg-gray-900 rounded-full"></div>
        <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
        <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
      </div>
    </div>
  );
} 