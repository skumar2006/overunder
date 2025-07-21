'use client';

import { useAccount, useReadContract } from 'wagmi';
import { CONTRACTS, OVERUNDER_ABI } from '@/lib/wagmi';

export default function Dashboard() {
  const { address, isConnected } = useAccount();

  // Read user profile
  const { data: userProfile } = useReadContract({
    address: CONTRACTS.OVERUNDER,
    abi: OVERUNDER_ABI,
    functionName: 'userProfiles',
    args: address ? [address] : undefined,
  });

  // Read contract status
  const { data: contractStatus } = useReadContract({
    address: CONTRACTS.OVERUNDER,
    abi: OVERUNDER_ABI,
    functionName: 'getContractStatus',
  });

  // Read contract version
  const { data: version } = useReadContract({
    address: CONTRACTS.OVERUNDER,
    abi: OVERUNDER_ABI,
    functionName: 'getVersion',
  });

  if (!isConnected) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 text-center">
        <h2 className="text-xl font-semibold text-white mb-2">
          Connect Wallet to View Dashboard
        </h2>
        <p className="text-gray-400">
          Connect your wallet to see your betting profile and platform stats.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* User Profile Card */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
          👤 Your Profile
        </h2>
        
        {userProfile ? (
          <div className="space-y-3">
            <div>
              <span className="text-gray-400">Username:</span>
              <span className="text-white ml-2 font-medium">
                {userProfile[0] || 'Not set'}
              </span>
            </div>
            <div>
              <span className="text-gray-400">Total Bets:</span>
              <span className="text-white ml-2 font-medium">
                {userProfile[1]?.toString() || '0'} ETH
              </span>
            </div>
            <div>
              <span className="text-gray-400">Total Winnings:</span>
              <span className="text-green-400 ml-2 font-medium">
                {userProfile[2]?.toString() || '0'} ETH
              </span>
            </div>
            <div>
              <span className="text-gray-400">Win Rate:</span>
              <span className="text-blue-400 ml-2 font-medium">
                {userProfile[3] ? (Number(userProfile[3]) / 100).toFixed(1) : '0'}%
              </span>
            </div>
            <div>
              <span className="text-gray-400">Reputation:</span>
              <span className="text-yellow-400 ml-2 font-medium">
                {userProfile[4]?.toString() || '0'} points
              </span>
            </div>
            <div>
              <span className="text-gray-400">Status:</span>
              <span className={`ml-2 font-medium ${userProfile[5] ? 'text-green-400' : 'text-red-400'}`}>
                {userProfile[5] ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
        ) : (
          <div className="text-gray-400">
            Loading profile...
          </div>
        )}
      </div>

      {/* Platform Stats Card */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
          📊 Platform Stats
        </h2>
        
        {contractStatus && version ? (
          <div className="space-y-3">
            <div>
              <span className="text-gray-400">Contract Version:</span>
              <span className="text-white ml-2 font-medium">
                v{version.toString()}
              </span>
            </div>
            <div>
              <span className="text-gray-400">Platform Status:</span>
              <span className={`ml-2 font-medium ${!contractStatus[1] ? 'text-green-400' : 'text-red-400'}`}>
                {!contractStatus[1] ? 'Active' : 'Paused'}
              </span>
            </div>
            <div>
              <span className="text-gray-400">Total Markets:</span>
              <span className="text-white ml-2 font-medium">
                {contractStatus[2]?.toString() || '0'}
              </span>
            </div>
            <div>
              <span className="text-gray-400">Min Duration:</span>
              <span className="text-white ml-2 font-medium">
                {contractStatus[3] ? (Number(contractStatus[3]) / 3600).toFixed(0) : '0'} hours
              </span>
            </div>
            <div>
              <span className="text-gray-400">Max Duration:</span>
              <span className="text-white ml-2 font-medium">
                {contractStatus[4] ? (Number(contractStatus[4]) / (3600 * 24)).toFixed(0) : '0'} days
              </span>
            </div>
            <div className="pt-2">
              <div className="text-xs text-gray-500">
                Network: Base Sepolia Testnet
              </div>
              <div className="text-xs text-gray-500 break-all">
                Contract: {CONTRACTS.OVERUNDER}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-gray-400">
            Loading platform stats...
          </div>
        )}
      </div>
    </div>
  );
} 