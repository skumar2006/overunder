'use client';

import { useState } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { CONTRACTS, OVERUNDER_ABI } from '@/lib/wagmi';

export default function ProfileSetup() {
  const { isConnected } = useAccount();
  const [username, setUsername] = useState('');

  const { 
    writeContract, 
    data: hash, 
    isPending, 
    error 
  } = useWriteContract();

  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isConnected) {
      alert('Please connect your wallet first');
      return;
    }

    if (!username.trim()) {
      alert('Please enter a username');
      return;
    }

    if (username.length > 32) {
      alert('Username must be 32 characters or less');
      return;
    }

    try {
      writeContract({
        address: CONTRACTS.OVERUNDER,
        abi: OVERUNDER_ABI,
        functionName: 'updateProfile',
        args: [username.trim()],
      });
    } catch (err) {
      console.error('Error updating profile:', err);
    }
  };

  // Reset form after success
  if (isConfirmed) {
    setUsername('');
  }

  if (!isConnected) {
    return null;
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
        👤 Set Up Your Profile
      </h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Choose a Username
          </label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter your username..."
            maxLength={32}
            className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isPending || isConfirming}
          />
          <p className="text-xs text-gray-400 mt-1">
            Maximum 32 characters
          </p>
        </div>

        <button
          type="submit"
          disabled={!isConnected || isPending || isConfirming || !username.trim()}
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
              Updating profile...
            </>
          ) : (
            'Update Profile'
          )}
        </button>

        {error && (
          <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded-lg text-sm">
            <strong>Error:</strong> {error.message}
          </div>
        )}

        {isConfirmed && hash && (
          <div className="bg-green-900/50 border border-green-500 text-green-200 px-4 py-3 rounded-lg text-sm">
            <strong>Success!</strong> Profile updated successfully!
            <div className="mt-2">
              <a 
                href={`https://sepolia.basescan.org/tx/${hash}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-green-300 hover:text-green-100 underline"
              >
                View Transaction →
              </a>
            </div>
          </div>
        )}
      </form>
    </div>
  );
} 