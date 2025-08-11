const { ethers } = require('ethers');

// Contract configuration
const CONTRACT_ADDRESS = '0x5FC8d32690cc91D4c39d9d3abcBD16989F875707';
const RPC_URL = 'http://127.0.0.1:8545';

// Contract ABI (simplified for createBet function)
const CONTRACT_ABI = [
  {
    "type": "function",
    "name": "createBet",
    "stateMutability": "payable",
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
    "name": "getAllBets",
    "stateMutability": "view",
    "inputs": [],
    "outputs": [{ "type": "uint256[]", "name": "" }]
  },
  {
    "type": "function",
    "name": "nextBetId",
    "stateMutability": "view",
    "inputs": [],
    "outputs": [{ "type": "uint256", "name": "" }]
  }
];

async function createTestBets() {
  try {
    console.log('🚀 Connecting to Hardhat node...');
    
    // Connect to Hardhat node
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    
    // Use the first account (pre-funded)
    const signer = await provider.getSigner(0);
    const signerAddress = await signer.getAddress();
    console.log('📝 Using account:', signerAddress);
    
    // Connect to contract
    const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
    
    // Check current bet count
    try {
      const currentBets = await contract.getAllBets();
      console.log('📊 Current bets on contract:', currentBets.length);
      
      if (currentBets.length > 0) {
        console.log('✅ Contract already has bets! Bet IDs:', currentBets.map(id => Number(id)));
        return;
      }
    } catch (err) {
      console.log('ℹ️ Could not get current bets, proceeding to create new ones...');
    }
    
    // Define test bets
    const testBets = [
      {
        question: "Will Bitcoin reach $100k by end of year?",
        description: "A prediction market about Bitcoin's price reaching $100,000 USD by December 31st, 2024.",
        options: ["YES", "NO"],
        category: "Crypto",
        durationHours: 720 // 30 days
      },
      {
        question: "Will it rain tomorrow in San Francisco?",
        description: "Weather prediction for San Francisco tomorrow based on current forecasts and meteorological data.",
        options: ["YES", "NO"],
        category: "Weather",
        durationHours: 24 // 1 day
      },
      {
        question: "Will the Lakers win their next game?",
        description: "Prediction about the LA Lakers winning their upcoming basketball game in the NBA season.",
        options: ["YES", "NO"],
        category: "Sports",
        durationHours: 168 // 7 days
      }
    ];
    
    console.log('📝 Creating test bets...');
    
    for (let i = 0; i < testBets.length; i++) {
      const bet = testBets[i];
      const deadline = Math.floor(Date.now() / 1000) + (bet.durationHours * 3600);
      
      console.log(`\n🎯 Creating bet ${i + 1}: "${bet.question}"`);
      
      const tx = await contract.createBet(
        bet.question,
        bet.description,
        bet.options,
        deadline,
        bet.category,
        {
          value: ethers.parseEther("0.01") // 0.01 ETH minimum stake
        }
      );
      
      console.log('⏳ Transaction sent:', tx.hash);
      const receipt = await tx.wait();
      console.log('✅ Transaction confirmed, block:', receipt.blockNumber);
    }
    
    console.log('\n🎉 All test bets created successfully!');
    
    // Verify bets were created
    const finalBets = await contract.getAllBets();
    console.log('📊 Final bet count:', finalBets.length);
    console.log('📋 Bet IDs:', finalBets.map(id => Number(id)));
    
  } catch (error) {
    console.error('❌ Error creating test bets:', error);
    process.exit(1);
  }
}

// Run the script
createTestBets()
  .then(() => {
    console.log('\n✨ Script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });