import { ethers, upgrades } from "hardhat";
import fs from "fs";

async function main() {
  console.log("🚀 Deploying upgradeable OverUnder betting platform...\n");

  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  console.log("Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH\n");

  // 1. Deploy Treasury (non-upgradeable, simple contract)
  console.log("📋 1. Deploying Treasury...");
  const Treasury = await ethers.getContractFactory("Treasury");
  const treasury = await Treasury.deploy();
  await treasury.waitForDeployment();
  const treasuryAddress = await treasury.getAddress();
  console.log("✅ Treasury deployed to:", treasuryAddress);
  console.log("   Treasury owner:", await treasury.owner(), "\n");

  // 2. Deploy upgradeable OverUnder contract using UUPS proxy
  console.log("📋 2. Deploying OverUnder (Upgradeable) with UUPS proxy...");
  const OverunderUpgradeable = await ethers.getContractFactory("OverunderUpgradeable");
  
  const overunder = await upgrades.deployProxy(
    OverunderUpgradeable,
    [treasuryAddress], // initialization parameters
    { 
      initializer: 'initialize',
      kind: 'uups' // Use UUPS proxy pattern
    }
  );
  await overunder.waitForDeployment();
  
  const proxyAddress = await overunder.getAddress();
  const implementationAddress = await upgrades.erc1967.getImplementationAddress(proxyAddress);
  const adminAddress = await upgrades.erc1967.getAdminAddress(proxyAddress);
  
  console.log("✅ OverUnder Proxy deployed to:", proxyAddress);
  console.log("   Implementation address:", implementationAddress);
  console.log("   Admin address:", adminAddress);
  console.log("   Owner:", await overunder.owner());
  console.log("   Version:", await overunder.getVersion(), "\n");

  // 3. Deploy MarketFactory separately
  console.log("📋 3. Deploying MarketFactory (Upgradeable)...");
  const MarketFactoryUpgradeable = await ethers.getContractFactory("MarketFactoryUpgradeable");
  const marketFactory = await upgrades.deployProxy(
    MarketFactoryUpgradeable,
    [proxyAddress, treasuryAddress],
    {
      initializer: 'initialize',
      kind: 'uups'
    }
  );
  await marketFactory.waitForDeployment();
  
  const marketFactoryAddress = await marketFactory.getAddress();
  const marketFactoryImplementation = await upgrades.erc1967.getImplementationAddress(marketFactoryAddress);
  
  console.log("✅ MarketFactory Proxy deployed to:", marketFactoryAddress);
  console.log("   MarketFactory Implementation:", marketFactoryImplementation);
  console.log("   MarketFactory owner:", await marketFactory.owner());
  
  // 4. Connect OverUnder with MarketFactory
  console.log("📋 4. Connecting OverUnder with MarketFactory...");
  await overunder.setMarketFactory(marketFactoryAddress);
  console.log("✅ Contracts connected successfully!");
  
  const [totalMarkets, totalCategories, filterEnabled, defaultFee] = await marketFactory.getMarketStats();
  console.log("   Total markets:", totalMarkets.toString());
  console.log("   Total categories:", totalCategories.toString());
  console.log("   Category filter enabled:", filterEnabled);
  console.log("   Default creation fee:", ethers.formatEther(defaultFee), "ETH\n");

  // 5. Test basic functionality
  console.log("📋 5. Testing basic functionality...");
  
  // Test profile update
  await overunder.updateProfile("TestDeployer");
  const profile = await overunder.userProfiles(deployer.address);
  console.log("✅ Profile updated. Username:", profile.username);
  
  // Test contract status
  const [version, paused, totalMarketsCount, minDuration, maxDuration] = await overunder.getContractStatus();
  console.log("✅ Contract status:");
  console.log("   Version:", version.toString());
  console.log("   Paused:", paused);
  console.log("   Total markets:", totalMarketsCount.toString());
  console.log("   Min duration:", (Number(minDuration) / 3600).toString(), "hours");
  console.log("   Max duration:", (Number(maxDuration) / (3600 * 24)).toString(), "days\n");

  // 6. Save deployment info to file
  const deploymentInfo = {
    network: "localhost", // Change this based on your network
    deployedAt: new Date().toISOString(),
    deployer: deployer.address,
    contracts: {
      treasury: {
        address: treasuryAddress,
        name: "Treasury"
      },
      overunder: {
        proxy: proxyAddress,
        implementation: implementationAddress,
        admin: adminAddress,
        name: "OverunderUpgradeable",
        version: version.toString()
      },
      marketFactory: {
        proxy: marketFactoryAddress,
        implementation: marketFactoryImplementation,
        name: "MarketFactoryUpgradeable"
      }
    }
  };

  fs.writeFileSync("deployments.json", JSON.stringify(deploymentInfo, null, 2));
  console.log("📄 Deployment info saved to deployments.json\n");

  console.log("🎉 Deployment completed successfully!");
  console.log("🔧 To upgrade later, use: npx hardhat run scripts/upgrade.ts");
  console.log("💡 Proxy address for frontend:", proxyAddress);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  }); 