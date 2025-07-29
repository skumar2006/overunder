// Contract ABIs for OverUnder V2 - Extracted from compiled contracts
export const OVERUNDER_ABI = [
  {
    "type": "constructor",
    "stateMutability": "undefined",
    "payable": false,
    "inputs": []
  },
  {
    "type": "function",
    "name": "createBet",
    "constant": false,
    "stateMutability": "payable",
    "payable": true,
    "inputs": [
      { "type": "string", "name": "_question" },
      { "type": "string", "name": "_description" },
      { "type": "string[]", "name": "_bettingOptions" },
      { "type": "uint256", "name": "_deadlineTimestamp" },
      { "type": "string", "name": "_category" }
    ],
    "outputs": [{ "type": "uint256", "name": "" }]
  },
  {
    "type": "function",
    "name": "placeWager",
    "constant": false,
    "stateMutability": "payable",
    "payable": true,
    "inputs": [
      { "type": "uint256", "name": "_betId" },
      { "type": "uint256", "name": "_optionChosen" }
    ],
    "outputs": []
  },
  {
    "type": "function",
    "name": "resolveBet",
    "constant": false,
    "payable": false,
    "inputs": [
      { "type": "uint256", "name": "_betId" },
      { "type": "uint256", "name": "_winningOption" }
    ],
    "outputs": []
  },
  {
    "type": "function",
    "name": "claimWinnings",
    "constant": false,
    "payable": false,
    "inputs": [{ "type": "uint256", "name": "_betId" }],
    "outputs": []
  },
  {
    "type": "function",
    "name": "updateProfile",
    "constant": false,
    "payable": false,
    "inputs": [{ "type": "string", "name": "_username" }],
    "outputs": []
  },
  {
    "type": "function",
    "name": "getBet",
    "constant": true,
    "stateMutability": "view",
    "payable": false,
    "inputs": [{ "type": "uint256", "name": "_betId" }],
    "outputs": [{
      "type": "tuple",
      "name": "",
      "components": [
        { "type": "uint256", "name": "betId" },
        { "type": "address", "name": "creator" },
        { "type": "uint256", "name": "stakeAmount" },
        { "type": "string[]", "name": "bettingOptions" },
        { "type": "uint256", "name": "deadlineTimestamp" },
        { "type": "uint256", "name": "resolutionTimestamp" },
        { "type": "uint256", "name": "resolvedOutcome" },
        { "type": "bool", "name": "isResolved" },
        { "type": "string", "name": "question" },
        { "type": "string", "name": "description" },
        { "type": "string", "name": "category" },
        { "type": "uint256", "name": "createdAt" },
        { "type": "uint256", "name": "totalPoolAmount" }
      ]
    }]
  },
  {
    "type": "function",
    "name": "getBetWagers",
    "constant": true,
    "stateMutability": "view",
    "payable": false,
    "inputs": [{ "type": "uint256", "name": "_betId" }],
    "outputs": [{
      "type": "tuple[]",
      "name": "",
      "components": [
        { "type": "address", "name": "bettor" },
        { "type": "uint256", "name": "betId" },
        { "type": "uint256", "name": "optionChosen" },
        { "type": "uint256", "name": "amountStaked" },
        { "type": "uint256", "name": "timestamp" },
        { "type": "bool", "name": "claimed" }
      ]
    }]
  },
  {
    "type": "function",
    "name": "getUserBets",
    "constant": true,
    "stateMutability": "view",
    "payable": false,
    "inputs": [{ "type": "address", "name": "_user" }],
    "outputs": [{ "type": "uint256[]", "name": "" }]
  },
  {
    "type": "function",
    "name": "getUserWagers",
    "constant": true,
    "stateMutability": "view",
    "payable": false,
    "inputs": [{ "type": "address", "name": "_user" }],
    "outputs": [{ "type": "uint256[]", "name": "" }]
  },
  {
    "type": "function",
    "name": "getAllBets",
    "constant": true,
    "stateMutability": "view",
    "payable": false,
    "inputs": [],
    "outputs": [{ "type": "uint256[]", "name": "" }]
  },
  {
    "type": "function",
    "name": "getOptionPool",
    "constant": true,
    "stateMutability": "view",
    "payable": false,
    "inputs": [
      { "type": "uint256", "name": "_betId" },
      { "type": "uint256", "name": "_option" }
    ],
    "outputs": [{ "type": "uint256", "name": "" }]
  },
  {
    "type": "function",
    "name": "getUserPosition",
    "constant": true,
    "stateMutability": "view",
    "payable": false,
    "inputs": [
      { "type": "uint256", "name": "_betId" },
      { "type": "address", "name": "_user" },
      { "type": "uint256", "name": "_option" }
    ],
    "outputs": [{ "type": "uint256", "name": "" }]
  },
  {
    "type": "function",
    "name": "getBetOdds",
    "constant": true,
    "stateMutability": "view",
    "payable": false,
    "inputs": [{ "type": "uint256", "name": "_betId" }],
    "outputs": [{ "type": "uint256[]", "name": "odds" }]
  },
  {
    "type": "function",
    "name": "userProfiles",
    "constant": true,
    "stateMutability": "view",
    "payable": false,
    "inputs": [{ "type": "address", "name": "" }],
    "outputs": [
      { "type": "string", "name": "username" },
      { "type": "uint256", "name": "totalBets" },
      { "type": "uint256", "name": "totalWinnings" },
      { "type": "uint256", "name": "winRate" },
      { "type": "uint256", "name": "reputation" },
      { "type": "bool", "name": "isActive" }
    ]
  },
  {
    "type": "function",
    "name": "getVersion",
    "constant": true,
    "stateMutability": "view",
    "payable": false,
    "inputs": [],
    "outputs": [{ "type": "uint256", "name": "" }]
  },
  {
    "type": "function",
    "name": "getContractStatus",
    "constant": true,
    "stateMutability": "view",
    "payable": false,
    "inputs": [],
    "outputs": [
      { "type": "uint256", "name": "version" },
      { "type": "bool", "name": "paused" },
      { "type": "uint256", "name": "totalBets" },
      { "type": "uint256", "name": "minDuration" },
      { "type": "uint256", "name": "maxDuration" },
      { "type": "uint256", "name": "feeRate" }
    ]
  },
  {
    "type": "function",
    "name": "nextBetId",
    "constant": true,
    "stateMutability": "view",
    "payable": false,
    "inputs": [],
    "outputs": [{ "type": "uint256", "name": "" }]
  },
  {
    "type": "function",
    "name": "minimumBetAmount",
    "constant": true,
    "stateMutability": "view",
    "payable": false,
    "inputs": [],
    "outputs": [{ "type": "uint256", "name": "" }]
  },
  {
    "type": "function",
    "name": "platformFeeRate",
    "constant": true,
    "stateMutability": "view",
    "payable": false,
    "inputs": [],
    "outputs": [{ "type": "uint256", "name": "" }]
  },
  {
    "type": "function",
    "name": "owner",
    "constant": true,
    "stateMutability": "view",
    "payable": false,
    "inputs": [],
    "outputs": [{ "type": "address", "name": "" }]
  },
  {
    "type": "event",
    "anonymous": false,
    "name": "BetCreated",
    "inputs": [
      { "type": "uint256", "name": "betId", "indexed": true },
      { "type": "address", "name": "creator", "indexed": true },
      { "type": "string", "name": "question", "indexed": false },
      { "type": "string[]", "name": "options" },
      { "type": "uint256", "name": "deadline", "indexed": false },
      { "type": "uint256", "name": "stakeAmount", "indexed": false }
    ]
  },
  {
    "type": "event",
    "anonymous": false,
    "name": "WagerPlaced",
    "inputs": [
      { "type": "uint256", "name": "betId", "indexed": true },
      { "type": "address", "name": "bettor", "indexed": true },
      { "type": "uint256", "name": "optionChosen", "indexed": false },
      { "type": "uint256", "name": "amount", "indexed": false }
    ]
  },
  {
    "type": "event",
    "anonymous": false,
    "name": "BetResolved",
    "inputs": [
      { "type": "uint256", "name": "betId", "indexed": true },
      { "type": "uint256", "name": "winningOption", "indexed": false },
      { "type": "uint256", "name": "totalPool", "indexed": false }
    ]
  },
  {
    "type": "event",
    "anonymous": false,
    "name": "WinningsClaimed",
    "inputs": [
      { "type": "uint256", "name": "betId", "indexed": true },
      { "type": "address", "name": "winner", "indexed": true },
      { "type": "uint256", "name": "amount", "indexed": false }
    ]
  },
  {
    "type": "event",
    "anonymous": false,
    "name": "ProfileUpdated",
    "inputs": [
      { "type": "address", "name": "user", "indexed": true },
      { "type": "string", "name": "username", "indexed": false }
    ]
  }
] as const;

export const TREASURY_ABI = [
  {
    "type": "function",
    "name": "collectFee",
    "constant": false,
    "stateMutability": "payable",
    "payable": true,
    "inputs": [],
    "outputs": []
  },
  {
    "type": "function",
    "name": "withdraw",
    "constant": false,
    "payable": false,
    "inputs": [{ "type": "uint256", "name": "_amount" }],
    "outputs": []
  },
  {
    "type": "function",
    "name": "getBalance",
    "constant": true,
    "stateMutability": "view",
    "payable": false,
    "inputs": [],
    "outputs": [{ "type": "uint256", "name": "" }]
  },
  {
    "type": "function",
    "name": "totalFeesCollected",
    "constant": true,
    "stateMutability": "view",
    "payable": false,
    "inputs": [],
    "outputs": [{ "type": "uint256", "name": "" }]
  },
  {
    "type": "function",
    "name": "owner",
    "constant": true,
    "stateMutability": "view",
    "payable": false,
    "inputs": [],
    "outputs": [{ "type": "address", "name": "" }]
  },
  {
    "type": "event",
    "anonymous": false,
    "name": "FeeCollected",
    "inputs": [
      { "type": "address", "name": "source", "indexed": true },
      { "type": "uint256", "name": "amount", "indexed": false }
    ]
  },
  {
    "type": "event",
    "anonymous": false,
    "name": "Withdrawal",
    "inputs": [
      { "type": "address", "name": "to", "indexed": true },
      { "type": "uint256", "name": "amount", "indexed": false }
    ]
  }
] as const; 