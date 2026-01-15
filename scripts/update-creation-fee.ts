import { ethers } from "hardhat";

async function main() {
  // Set creation fee to approximately $10 worth of ETH
  // $10 / $3000 per ETH = 0.00333... ETH
  const newCreationFee = ethers.parseEther("0.0033"); // 0.0033 ETH ≈ $10
  
  console.log("🔧 Updating creation fee to:", ethers.formatEther(newCreationFee), "ETH");
  console.log("💰 Approximate USD value: $10");

  // Get the deployed contract address for Base Sepolia
  const contractAddress = "0x8cEAae1cD5a22503D9EA7407Ca017377A5710BC7";
  
  // Get the contract instance
  const OverunderUpgradeable = await ethers.getContractFactory("OverunderUpgradeable");
  const contract = OverunderUpgradeable.attach(contractAddress);

  // Check current creation fee
  const currentFee = await contract.creationFee();
  console.log("📊 Current creation fee:", ethers.formatEther(currentFee), "ETH");

  // Update the creation fee
  console.log("🚀 Updating creation fee...");
  const tx = await contract.setCreationFee(newCreationFee);
  
  console.log("⏳ Transaction hash:", tx.hash);
  console.log("⏳ Waiting for confirmation...");
  
  await tx.wait();
  
  // Verify the change
  const updatedFee = await contract.creationFee();
  console.log("✅ Updated creation fee:", ethers.formatEther(updatedFee), "ETH");
  console.log("💰 Approximate USD value: $", (parseFloat(ethers.formatEther(updatedFee)) * 3000).toFixed(2));
  
  console.log("🎉 Creation fee updated successfully!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  });