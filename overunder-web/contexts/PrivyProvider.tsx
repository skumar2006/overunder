'use client';

import { PrivyProvider } from '@privy-io/react-auth';
import { WagmiProvider } from '@privy-io/wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http } from 'viem';
import { base, baseSepolia, mainnet } from 'viem/chains';
import { createConfig } from 'wagmi';

// Create wagmi config for Privy
const wagmiConfig = createConfig({
  chains: [baseSepolia, base, mainnet],
  transports: {
    [baseSepolia.id]: http('https://sepolia.base.org'),
    [base.id]: http('https://mainnet.base.org'), 
    [mainnet.id]: http(),
  },
});

// Query client for React Query
const queryClient = new QueryClient();

interface PrivyProvidersProps {
  children: React.ReactNode;
}

export function PrivyProviders({ children }: PrivyProvidersProps) {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID as string | undefined;
  if (!appId) {
    // Surface a clear error in the console instead of using an invalid fallback ID
    // This prevents confusing "Invalid Privy app ID" runtime errors
    // Set NEXT_PUBLIC_PRIVY_APP_ID in .env.local to fix
    // eslint-disable-next-line no-console
    console.error('Privy: NEXT_PUBLIC_PRIVY_APP_ID is not set. Add it to .env.local.');
  }
  return (
    <PrivyProvider
      appId={appId ?? ''}
      config={{
        // Appearance
        appearance: {
          theme: 'light',
          accentColor: '#3b82f6',
          logo: undefined, // Add your logo URL here
        },
        // Login methods
        loginMethods: ['email', 'wallet', 'google'],
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
      }}
    >
      <QueryClientProvider client={queryClient}>
        <WagmiProvider config={wagmiConfig}>
          {children}
        </WagmiProvider>
      </QueryClientProvider>
    </PrivyProvider>
  );
}