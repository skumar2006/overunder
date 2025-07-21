'use client';

import { useState } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther } from 'viem';
import { CONTRACTS, OVERUNDER_ABI } from '@/lib/wagmi';

export default function CreateMarket() {
  const { address, isConnected } = useAccount();
  
  const [question, setQuestion] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Other');
  const [duration, setDuration] = useState('24'); // hours
  const [initialLiquidity, setInitialLiquidity] = useState('0.01');
  
  const { 
    writeContract, 
    data: hash, 
    isPending, 
    error 
  } = useWriteContract();

  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  const categories = [
    'Sports', 'Crypto', 'Politics', 'Weather', 'Entertainment', 'Technology', 'Other'
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isConnected) {
      alert('Please connect your wallet first');
      return;
    }

    if (!question.trim() || !description.trim()) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      const resolutionTime = Math.floor(Date.now() / 1000) + (parseInt(duration) * 3600);
      
      writeContract({
        address: CONTRACTS.OVERUNDER,
        abi: OVERUNDER_ABI,
        functionName: 'createMarket',
        args: [question, description, BigInt(resolutionTime), category],
        value: parseEther(initialLiquidity),
      });
    } catch (err) {
      console.error('Error creating market:', err);
    }
  };

  // Reset form after successful creation
  if (isConfirmed && hash) {
    setQuestion('');
    setDescription('');
    setCategory('Other');
    setDuration('24');
    setInitialLiquidity('0.01');
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h2 className="text-2xl font-semibold text-white mb-6 flex items-center gap-2">
        🎯 Create Prediction Market
      </h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Question */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Market Question *
          </label>
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="e.g., Will Bitcoin reach $100k by end of year?"
            className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Description *
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Provide more details about the market conditions and resolution criteria..."
            rows={3}
            className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Duration */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Duration (hours)
            </label>
            <input
              type="number"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              min="1"
              max="8760"
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-400 mt-1">
              Minimum: 1 hour, Maximum: 365 days
            </p>
          </div>

          {/* Initial Liquidity */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Initial Liquidity (ETH)
            </label>
            <input
              type="number"
              value={initialLiquidity}
              onChange={(e) => setInitialLiquidity(e.target.value)}
              min="0.01"
              step="0.01"
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-400 mt-1">
              Minimum: 0.01 ETH
            </p>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={!isConnected || isPending || isConfirming}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
        >
          {isPending ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              Waiting for approval...
            </>
          ) : isConfirming ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              Creating market...
            </>
          ) : (
            <>
              🚀 Create Market
            </>
          )}
        </button>

        {/* Status Messages */}
        {error && (
          <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded-lg">
            <strong>Error:</strong> {error.message}
          </div>
        )}

        {isConfirmed && (
          <div className="bg-green-900/50 border border-green-500 text-green-200 px-4 py-3 rounded-lg">
            <strong>Success!</strong> Market created successfully! 
            {hash && (
              <div className="mt-2 text-sm">
                <a 
                  href={`https://sepolia.basescan.org/tx/${hash}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-green-300 hover:text-green-100 underline"
                >
                  View on BaseScan →
                </a>
              </div>
            )}
          </div>
        )}

        {/* Info Box */}
        <div className="bg-blue-900/30 border border-blue-500/30 text-blue-200 px-4 py-3 rounded-lg text-sm">
          <h4 className="font-medium mb-2">💡 Market Creation Tips:</h4>
          <ul className="space-y-1 text-xs">
            <li>• Markets resolve as YES or NO based on the question</li>
            <li>• Users buy YES or NO shares using AMM pricing</li>
            <li>• Initial liquidity helps bootstrap trading</li>
            <li>• 2% fee is collected on all trades</li>
            <li>• You can create multiple markets per account</li>
          </ul>
        </div>
      </form>
    </div>
  );
} 