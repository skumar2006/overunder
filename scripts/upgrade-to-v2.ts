import { ethers, upgrades } from "hardhat";

async function main() {
  console.log("🔄 Starting contract upgrade to V2...");

  // Get the current proxy address from your deployment
  const PROXY_ADDRESS = process.env.PROXY_ADDRESS || "0x8cEAae1cD5a22503D9EA7407Ca017377A5710BC7";
  
  console.log("📍 Proxy Address:", PROXY_ADDRESS);

  // Get the V2 contract factory
  const OverunderV2 = await ethers.getContractFactory("OverunderUpgradeableV2");
  
  console.log("📦 Upgrading to OverunderUpgradeableV2...");
  
  try {
    // Perform the upgrade
    const upgraded = await upgrades.upgradeProxy(PROXY_ADDRESS, OverunderV2);
    await upgraded.waitForDeployment();
    
    const upgradedAddress = await upgraded.getAddress();
    console.log("✅ Contract upgraded successfully!");
    console.log("🏠 Proxy Address (unchanged):", PROXY_ADDRESS);
    console.log("🆕 New Implementation Address:", upgradedAddress);
    
    // Verify the upgrade worked
    console.log("🔍 Verifying upgrade...");
    const contract = OverunderV2.attach(PROXY_ADDRESS);
    
    // Test a new V2 function
    try {
      const disputePeriod = await contract.DISPUTE_PERIOD();
      console.log("⏰ Dispute Period:", disputePeriod.toString(), "seconds");
      
      const votingPeriod = await contract.VOTING_PERIOD();
      console.log("🗳️  Voting Period:", votingPeriod.toString(), "seconds");
      
      const minDisputeStake = await contract.MIN_DISPUTE_STAKE();
      console.log("💰 Min Dispute Stake:", ethers.formatEther(minDisputeStake), "ETH");
      
      console.log("✅ V2 functions working correctly!");
    } catch (error) {
      console.error("❌ Error testing V2 functions:", error);
    }
    
    console.log("\n🎉 Upgrade completed successfully!");
    console.log("📝 Next steps:");
    console.log("1. Update your frontend NEXT_PUBLIC_CONTRACT_ADDRESS to:", PROXY_ADDRESS);
    console.log("2. Update the ABI files with the new V2 ABI");
    console.log("3. Run the database migration: dispute_system.sql");
    
  } catch (error) {
    console.error("❌ Upgrade failed:", error);
    process.exit(1);
  }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error("💥 Script failed:", error);
  process.exitCode = 1;
});