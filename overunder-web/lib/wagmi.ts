import { http, createConfig } from 'wagmi';
import { mainnet, base, baseSepolia, hardhat } from 'wagmi/chains';
import { injected, metaMask, walletConnect } from 'wagmi/connectors';

// Get project ID from environment
const projectId = process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || '';

// Define networks
const chains = [hardhat, baseSepolia, base] as const;

// Create wagmi config
export const config = createConfig({
  chains,
  connectors: [
    injected(),
    metaMask(),
    ...(projectId ? [walletConnect({ projectId })] : []),
  ],
  transports: {
    [hardhat.id]: http('http://127.0.0.1:8545'),
    [baseSepolia.id]: http('https://sepolia.base.org'),
    [base.id]: http('https://mainnet.base.org'),
  },
});

// Export types
declare module 'wagmi' {
  interface Register {
    config: typeof config;
  }
} 