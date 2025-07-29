import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { baseSepolia } from 'wagmi/chains';

export const config = getDefaultConfig({
  appName: 'OverUnder Betting Platform',
  projectId: 'c4f79cc821944d9680842e34466bfb',
  chains: [baseSepolia], // Back to Base Sepolia
  ssr: true,
});

// Contract addresses (deployed on Base Sepolia)
export const CONTRACTS = {
  TREASURY: '0xd12Ac2BFEE8a2f1C83185B0210F6E8984c3b04C4' as const,
  OVERUNDER: '0xa3B126bcD467Af8c159FcA0f3c0667912Dc47f6B' as const,
  MARKET_FACTORY: '0x9d6a9f93dE1ae025eb8CB8A2a6E2c99e13C93c7e' as const, // Original working factory
};

// OverUnder Contract ABI (from compiled artifacts)
export const OVERUNDER_ABI = [
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "_question",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "_description",
        "type": "string"
      },
      {
        "internalType": "uint256",
        "name": "_resolutionTime",
        "type": "uint256"
      },
      {
        "internalType": "string",
        "name": "_category",
        "type": "string"
      }
    ],
    "name": "createMarket",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getAllMarkets",
    "outputs": [
      {
        "internalType": "address[]",
        "name": "",
        "type": "address[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getContractStatus",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "version",
        "type": "uint256"
      },
      {
        "internalType": "bool",
        "name": "paused",
        "type": "bool"
      },
      {
        "internalType": "uint256",
        "name": "totalMarkets",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "minDuration",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "maxDuration",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getVersion",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "_username",
        "type": "string"
      }
    ],
    "name": "updateProfile",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "name": "userProfiles",
    "outputs": [
      {
        "internalType": "string",
        "name": "username",
        "type": "string"
      },
      {
        "internalType": "uint256",
        "name": "totalBets",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "totalWinnings",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "winRate",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "reputation",
        "type": "uint256"
      },
      {
        "internalType": "bool",
        "name": "isActive",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "type": "event",
    "name": "ProfileUpdated",
    "inputs": [
      { "name": "user", "type": "address", "indexed": true },
      { "name": "username", "type": "string", "indexed": false }
    ]
  }
] as const;

// Market Contract ABI (from compiled artifacts)
export const MARKET_ABI = [
  {
    "inputs": [
      {
        "internalType": "bool",
        "name": "_buyYes",
        "type": "bool"
      },
      {
        "internalType": "uint256",
        "name": "_shares",
        "type": "uint256"
      }
    ],
    "name": "buyShares",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "claimWinnings",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getCurrentOdds",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "yesPrice",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "noPrice",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getMarketInfo",
    "outputs": [
      {
        "components": [
          {
            "internalType": "string",
            "name": "question",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "description",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "category",
            "type": "string"
          },
          {
            "internalType": "address",
            "name": "creator",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "createdAt",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "resolutionTime",
            "type": "uint256"
          },
          {
            "internalType": "enum Market.MarketState",
            "name": "state",
            "type": "uint8"
          },
          {
            "internalType": "bool",
            "name": "outcome",
            "type": "bool"
          },
          {
            "internalType": "uint256",
            "name": "totalYesShares",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "totalNoShares",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "initialLiquidity",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "k",
            "type": "uint256"
          }
        ],
        "internalType": "struct Market.MarketInfo",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
] as const; 