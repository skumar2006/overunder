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
  // Localhost (updated with deployed addresses)
  31337: {
    overunderAddress: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0' as Address,
    treasuryAddress: '0x5FbDB2315678afecb367f032d93F642f64180aa3' as Address,
    chainId: 31337,
  },
  // Base Sepolia (testnet)
  84532: {
    overunderAddress: '0x0000000000000000000000000000000000000000' as Address, // Update after deployment
    treasuryAddress: '0x0000000000000000000000000000000000000000' as Address, // Update after deployment
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
  const chainId = isDevelopment ? 31337 : 84532; // localhost or Base Sepolia
  
  return {
    isDevelopment,
    defaultChainId: chainId,
    enableTestFeatures: isDevelopment,
    logLevel: isDevelopment ? 'debug' : 'info',
  };
} 