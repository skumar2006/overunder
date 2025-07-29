'use client';

import ConnectWallet from '@/components/ConnectWallet';
import Dashboard from '@/components/Dashboard';
import ProfileSetup from '@/components/ProfileSetup';
import CreateMarket from '@/components/CreateMarket';
import MarketsList from '@/components/MarketsList';
import { useAccount } from 'wagmi';

export default function Home() {
  const { isConnected } = useAccount();

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center gap-4">
              <div className="text-2xl font-bold text-white">
                🎯 OverUnder
              </div>
              <div className="text-sm text-gray-400 hidden sm:block">
                Decentralized Prediction Markets
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="hidden sm:block text-sm text-gray-400">
                Base Sepolia Testnet
              </div>
              <ConnectWallet />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!isConnected ? (
          /* Welcome Screen */
          <div className="text-center py-20">
            <div className="max-w-3xl mx-auto">
              <div className="text-8xl mb-8">🎯</div>
              <h1 className="text-4xl font-bold text-white mb-4">
                Welcome to OverUnder
              </h1>
              <p className="text-xl text-gray-400 mb-8">
                The decentralized prediction market platform powered by AMM pricing
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                <div className="bg-gray-800 rounded-lg p-6">
                  <div className="text-3xl mb-4">🚀</div>
                  <h3 className="text-lg font-semibold text-white mb-2">Create Markets</h3>
                  <p className="text-gray-400 text-sm">
                    Launch your own prediction markets on any topic with initial liquidity
                  </p>
                </div>
                
                <div className="bg-gray-800 rounded-lg p-6">
                  <div className="text-3xl mb-4">📊</div>
                  <h3 className="text-lg font-semibold text-white mb-2">AMM Pricing</h3>
                  <p className="text-gray-400 text-sm">
                    Dynamic pricing using Uniswap-style automated market makers
                  </p>
                </div>
                
                <div className="bg-gray-800 rounded-lg p-6">
                  <div className="text-3xl mb-4">🏆</div>
                  <h3 className="text-lg font-semibold text-white mb-2">Win Big</h3>
                  <p className="text-gray-400 text-sm">
                    Trade YES/NO shares and earn from correct predictions
                  </p>
                </div>
              </div>

              <div className="bg-blue-900/30 border border-blue-500/30 text-blue-200 px-6 py-4 rounded-lg mb-8">
                <h4 className="font-semibold mb-2">🏗️ Platform Features:</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>✅ Fully Upgradeable</div>
                  <div>🔒 Security First</div>
                  <div>⚡ Real-time Pricing</div>
                  <div>💰 2% Trading Fee</div>
                </div>
              </div>

              <ConnectWallet />
              
              <div className="mt-8 text-sm text-gray-500">
                <p>Connect your wallet to get started on Base Sepolia testnet</p>
                <p className="mt-2">
                  Contract: <code className="bg-gray-800 px-2 py-1 rounded text-xs">0xa3B126bcD467Af8c159FcA0f3c0667912Dc47f6B</code>
                </p>
              </div>
            </div>
          </div>
        ) : (
          /* Dashboard View */
          <div className="space-y-8">
            {/* Dashboard Cards */}
            <Dashboard />
            
            {/* Profile Setup */}
            <ProfileSetup />
            
            {/* Create Market */}
            <CreateMarket />
            
            {/* Markets List */}
            <MarketsList />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 border-t border-gray-700 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">OverUnder</h3>
              <p className="text-gray-400 text-sm">
                Decentralized prediction markets with upgradeable smart contracts and AMM pricing.
              </p>
            </div>
            
            <div>
              <h4 className="text-md font-semibold text-white mb-4">Features</h4>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li>• Create custom markets</li>
                <li>• AMM-based pricing</li>
                <li>• Upgradeable contracts</li>
                <li>• Low 2% fees</li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-md font-semibold text-white mb-4">Network</h4>
              <div className="space-y-2 text-gray-400 text-sm">
                <p>Base Sepolia Testnet</p>
                <p>Chain ID: 84532</p>
                <a 
                  href="https://sepolia.basescan.org/"
          target="_blank"
          rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 block"
                >
                  Block Explorer →
                </a>
              </div>
            </div>
          </div>
          
          <div className="border-t border-gray-700 mt-8 pt-8 text-center text-gray-500 text-sm">
            <p>Built with ❤️ using RainbowKit, wagmi, and Next.js</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
