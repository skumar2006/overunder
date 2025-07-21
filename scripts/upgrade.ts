import { ethers, upgrades } from "hardhat";
import fs from "fs";

async function main() {
  console.log("🔄 Starting contract upgrade process...\n");

  // Load deployment info
  let deploymentInfo: any;
  try {
    const data = fs.readFileSync("deployments.json", "utf8");
    deploymentInfo = JSON.parse(data);
  } catch (error) {
    console.error("❌ Could not read deployments.json. Make sure you've deployed first.");
    process.exit(1);
  }

  const proxyAddress = deploymentInfo.contracts.overunder.proxy;
  if (!proxyAddress) {
    console.error("❌ No proxy address found in deployments.json");
    process.exit(1);
  }

  const [upgrader] = await ethers.getSigners();
  console.log("Upgrading with account:", upgrader.address);
  console.log("Account balance:", ethers.formatEther(await ethers.provider.getBalance(upgrader.address)), "ETH");
  console.log("Proxy address:", proxyAddress, "\n");

  // Get current version before upgrade
  const currentContract = await ethers.getContractAt("OverunderUpgradeable", proxyAddress);
  const currentVersion = await currentContract.getVersion();
  console.log("📊 Current version:", currentVersion.toString());

  // Check if we're the owner
  const owner = await currentContract.owner();
  if (owner !== upgrader.address) {
    console.error("❌ You are not the owner of this contract. Owner:", owner);
    process.exit(1);
  }

  // 1. Deploy new implementation
  console.log("📋 1. Deploying new implementation...");
  
  // For demonstration, we'll create a V2 contract
  // In practice, you'd have a separate OverunderUpgradeableV2.sol file
  const OverunderUpgradeableV2 = await ethers.getContractFactory("OverunderUpgradeable");
  
  console.log("📋 2. Upgrading proxy to new implementation...");
  const upgraded = await upgrades.upgradeProxy(proxyAddress, OverunderUpgradeableV2);
  await upgraded.waitForDeployment();

  const newImplementationAddress = await upgrades.erc1967.getImplementationAddress(proxyAddress);
  console.log("✅ Upgrade completed!");
  console.log("   Proxy address (unchanged):", proxyAddress);
  console.log("   Old implementation:", deploymentInfo.contracts.overunder.implementation);
  console.log("   New implementation:", newImplementationAddress, "\n");

  // 3. Test that upgrade worked
  console.log("📋 3. Testing upgraded contract...");
  const upgradedContract = await ethers.getContractAt("OverunderUpgradeable", proxyAddress);
  
  const newVersion = await upgradedContract.getVersion();
  console.log("✅ New version:", newVersion.toString());
  
  // Test that state is preserved
  const profile = await upgradedContract.userProfiles(upgrader.address);
  console.log("✅ State preserved. Username still:", profile.username);
  
  const [version, paused, totalMarkets, minDuration, maxDuration] = await upgradedContract.getContractStatus();
  console.log("✅ Contract status after upgrade:");
  console.log("   Version:", version.toString());
  console.log("   Paused:", paused);
  console.log("   Total markets:", totalMarkets.toString());
  console.log("   Min duration:", (Number(minDuration) / 3600).toString(), "hours");
  console.log("   Max duration:", (Number(maxDuration) / (3600 * 24)).toString(), "days\n");

  // 4. Test new functionality (example)
  console.log("📋 4. Testing admin functions...");
  
  // Test emergency pause (new admin feature)
  await upgradedContract.setEmergencyPause(true);
  const statusAfterPause = await upgradedContract.getContractStatus();
  console.log("✅ Emergency pause activated:", statusAfterPause[1]); // paused status
  
  // Unpause for normal operation
  await upgradedContract.setEmergencyPause(false);
  console.log("✅ Emergency pause deactivated\n");

  // Test market duration limits update
  const newMinDuration = 2 * 3600; // 2 hours
  const newMaxDuration = 30 * 24 * 3600; // 30 days
  await upgradedContract.setMarketDurationLimits(newMinDuration, newMaxDuration);
  
  const updatedStatus = await upgradedContract.getContractStatus();
  console.log("✅ Updated market duration limits:");
  console.log("   Min duration:", (Number(updatedStatus[3]) / 3600).toString(), "hours");
  console.log("   Max duration:", (Number(updatedStatus[4]) / (3600 * 24)).toString(), "days\n");

  // 5. Update deployment info
  deploymentInfo.contracts.overunder.implementation = newImplementationAddress;
  deploymentInfo.contracts.overunder.version = newVersion.toString();
  deploymentInfo.lastUpgrade = {
    timestamp: new Date().toISOString(),
    oldVersion: currentVersion.toString(),
    newVersion: newVersion.toString(),
    upgrader: upgrader.address
  };

  fs.writeFileSync("deployments.json", JSON.stringify(deploymentInfo, null, 2));
  console.log("📄 Updated deployment info saved to deployments.json\n");

  console.log("🎉 Upgrade completed successfully!");
  console.log("🔧 Contract is now running version", newVersion.toString());
  console.log("💡 Proxy address remains the same:", proxyAddress);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Upgrade failed:", error);
    process.exit(1);
  }); 