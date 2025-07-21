import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Web3Provider from '@/providers/Web3Provider';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'OverUnder - Decentralized Prediction Markets',
  description: 'Create and trade on prediction markets with AMM pricing on Base Sepolia',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-gray-900 min-h-screen`}>
        <Web3Provider>
          {children}
        </Web3Provider>
      </body>
    </html>
  );
}
