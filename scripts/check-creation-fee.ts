import { ethers } from "hardhat";

async function main() {
  // Get the deployed contract address for Base Sepolia
  const contractAddress = "0x8cEAae1cD5a22503D9EA7407Ca017377A5710BC7";
  
  // Get the contract instance
  const OverunderUpgradeable = await ethers.getContractFactory("OverunderUpgradeable");
  const contract = OverunderUpgradeable.attach(contractAddress);

  // Check current creation fee
  const currentFee = await contract.creationFee();
  const currentFeeETH = ethers.formatEther(currentFee);
  const currentFeeUSD = parseFloat(currentFeeETH) * 3000;
  
  console.log("📊 Current creation fee on contract:");
  console.log("  ETH:", currentFeeETH);
  console.log("  Wei:", currentFee.toString());
  console.log("  USD (approx):", `$${currentFeeUSD.toFixed(2)}`);
  
  // Also check minimum bet amount for comparison
  const minBet = await contract.minimumBetAmount();
  console.log("\n📊 Minimum bet amount:");
  console.log("  ETH:", ethers.formatEther(minBet));
  console.log("  Wei:", minBet.toString());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  });