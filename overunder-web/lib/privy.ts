import { PrivyProvider } from '@privy-io/react-auth';
import { WagmiProvider } from '@privy-io/wagmi';
import { QueryClient } from '@tanstack/react-query';
import { http } from 'viem';
import { base, baseSepolia, mainnet } from 'viem/chains';
import { createConfig } from 'wagmi';

// Create wagmi config for Privy
export const wagmiConfig = createConfig({
  chains: [baseSepolia, base, mainnet],
  transports: {
    [baseSepolia.id]: http('https://sepolia.base.org'),
    [base.id]: http('https://mainnet.base.org'),
    [mainnet.id]: http(),
  },
});

// Query client for React Query
export const queryClient = new QueryClient();

// Privy configuration
export const privyConfig = {
  appId: process.env.NEXT_PUBLIC_PRIVY_APP_ID || 'your-privy-app-id', // You'll need to set this
  config: {
    // Appearance
    appearance: {
      theme: 'light',
      accentColor: '#676FFF',
      logo: 'https://your-app.com/logo.png', // Optional: your app logo
    },
    // Login methods
    loginMethods: ['email', 'wallet'],
    // Wallet configuration  
    defaultChain: baseSepolia,
    supportedChains: [baseSepolia, base, mainnet],
    // Embedded wallet configuration
    embeddedWallets: {
      createOnLogin: 'users-without-wallets', // Auto-create embedded wallets
      requireUserPasswordOnCreate: false,
      noPromptOnSignature: false,
    },
    // MFA configuration
    mfa: {
      noPromptOnMfaRequired: false,
    },
  },
};