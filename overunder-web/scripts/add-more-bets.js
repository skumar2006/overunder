const { ethers } = require('ethers');

// Contract configuration
const CONTRACT_ADDRESS = '0x5FC8d32690cc91D4c39d9d3abcBD16989F875707';
const RPC_URL = 'http://127.0.0.1:8545';

// Contract ABI (simplified)
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
  }
];

async function addMoreBets() {
  try {
    console.log('🚀 Adding more test bets...');
    
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = await provider.getSigner(0);
    const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
    
    const moreBets = [
      {
        question: "Will Bitcoin reach $100k by end of year?",
        description: "A prediction market about Bitcoin's price reaching $100,000 USD by December 31st, 2024.",
        options: ["YES", "NO"],
        category: "Crypto",
        durationHours: 720 // 30 days
      },
      {
        question: "Will the Lakers win their next game?",
        description: "Prediction about the LA Lakers winning their upcoming basketball game in the NBA season.",
        options: ["YES", "NO"],
        category: "Sports",
        durationHours: 168 // 7 days
      }
    ];
    
    for (let i = 0; i < moreBets.length; i++) {
      const bet = moreBets[i];
      const deadline = Math.floor(Date.now() / 1000) + (bet.durationHours * 3600);
      
      console.log(`\n🎯 Creating bet: "${bet.question}"`);
      
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
      await tx.wait();
      console.log('✅ Transaction confirmed');
    }
    
    console.log('\n🎉 All additional bets created successfully!');
    
  } catch (error) {
    console.error('❌ Error adding bets:', error);
    process.exit(1);
  }
}

addMoreBets()
  .then(() => {
    console.log('\n✨ Script completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });