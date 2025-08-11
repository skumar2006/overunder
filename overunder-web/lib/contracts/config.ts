import { Address } from 'viem';
import { ContractConfig } from './types';

// Network configurations
export const NETWORKS = {
  localhost: {
    id: 31337,
    name: 'Localhost',
    rpcUrl: 'http://127.0.0.1:8545',
    blockExplorer: '',
  },
  baseSepolia: {
    id: 84532,
    name: 'Base Sepolia',
    rpcUrl: 'https://sepolia.base.org',
    blockExplorer: 'https://sepolia.basescan.org',
  },
  baseMainnet: {
    id: 8453,
    name: 'Base Mainnet',
    rpcUrl: 'https://mainnet.base.org',
    blockExplorer: 'https://basescan.org',
  }
} as const;

// Contract addresses by network
export const CONTRACT_ADDRESSES: Record<number, ContractConfig> = {
  // Localhost (updated with your actual deployed addresses)
  31337: {
    overunderAddress: '0x5FC8d32690cc91D4c39d9d3abcBD16989F875707' as Address, // Your deployed proxy
    treasuryAddress: '0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9' as Address, // Your deployed treasury
    chainId: 31337,
  },
  // Base Sepolia (testnet) - DEPLOYED!
  84532: {
    overunderAddress: '0x8cEAae1cD5a22503D9EA7407Ca017377A5710BC7' as Address, // Your deployed OverunderUpgradeable proxy
    treasuryAddress: '0x207EDC09e33cff25DeD000285587Fd99937b0689' as Address, // Your deployed Treasury
    chainId: 84532,
  },
  // Base Mainnet (production)
  8453: {
    overunderAddress: '0x0000000000000000000000000000000000000000' as Address, // Update after deployment
    treasuryAddress: '0x0000000000000000000000000000000000000000' as Address, // Update after deployment
    chainId: 8453,
  }
};

// Get contract config for current network
export function getContractConfig(chainId?: number): ContractConfig {
  const networkId = chainId || 31337; // Default to localhost
  const config = CONTRACT_ADDRESSES[networkId];
  
  if (!config) {
    throw new Error(`Unsupported network: ${chainId}`);
  }
  
  return config;
}

// Contract settings
export const CONTRACT_SETTINGS = {
  // Gas limits for different operations
  gasLimits: {
    createBet: 500000n,
    placeWager: 200000n,
    resolveBet: 150000n,
    claimWinnings: 200000n,
    updateProfile: 100000n,
  },
  
  // Minimum values
  minimums: {
    betAmount: '0.001', // ETH
    betDuration: 3600, // 1 hour in seconds
  },
  
  // Maximum values
  maximums: {
    betOptions: 10,
    betDuration: 365 * 24 * 3600, // 1 year in seconds
    usernameLength: 32,
  },
  
  // Platform settings
  platform: {
    feeRate: 200, // 2% in basis points
    categories: [
      'Sports',
      'Crypto', 
      'Politics',
      'Weather',
      'Entertainment',
      'Technology',
      'Other'
    ] as const,
  }
} as const;

// Update contract addresses (call this after deployment)
export function updateContractAddresses(
  chainId: number, 
  overunderAddress: Address, 
  treasuryAddress: Address
) {
  CONTRACT_ADDRESSES[chainId] = {
    overunderAddress,
    treasuryAddress,
    chainId,
  };
}

// Environment-specific config
export function getEnvironmentConfig() {
  const isDevelopment = process.env.NODE_ENV === 'development';
  // Always use Base Sepolia for this project
  const chainId = 84532; // Base Sepolia
  
  return {
    isDevelopment,
    defaultChainId: chainId,
    enableTestFeatures: isDevelopment,
    logLevel: isDevelopment ? 'debug' : 'info',
  };
} 