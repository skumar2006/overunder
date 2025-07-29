import { ethers, upgrades } from "hardhat";
import fs from "fs";

async function main() {
  console.log("🚀 Deploying upgradeable OverUnder betting platform V2...\n");

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
  console.log("📋 2. Deploying OverUnder V2 (Upgradeable) with UUPS proxy...");
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
  
  console.log("✅ OverUnder V2 Proxy deployed to:", proxyAddress);
  console.log("   Implementation address:", implementationAddress);
  console.log("   Admin address:", adminAddress);
  console.log("   Owner:", await overunder.owner());
  console.log("   Version:", await overunder.getVersion(), "\n");

  // 3. Test basic functionality
  console.log("📋 3. Testing basic functionality...");
  
  // Test profile update
  await overunder.updateProfile("TestDeployer");
  const profile = await overunder.userProfiles(deployer.address);
  console.log("✅ Profile updated. Username:", profile.username);
  
  // Test contract status
  const [version, paused, totalBets, minDuration, maxDuration, feeRate] = await overunder.getContractStatus();
  console.log("✅ Contract status:");
  console.log("   Version:", version.toString());
  console.log("   Paused:", paused);
  console.log("   Total bets:", totalBets.toString());
  console.log("   Min duration:", (Number(minDuration) / 3600).toString(), "hours");
  console.log("   Max duration:", (Number(maxDuration) / (3600 * 24)).toString(), "days");
  console.log("   Platform fee:", (Number(feeRate) / 100).toString(), "%\n");

  // 4. Test bet creation with balanced liquidity
  console.log("📋 4. Testing bet creation...");
  const betOptions = ["YES", "NO"];
  const deadline = Math.floor(Date.now() / 1000) + (24 * 60 * 60); // 24 hours from now
  
  const tx = await overunder.createBet(
    "Will it rain tomorrow?",
    "Weather prediction for testing",
    betOptions,
    deadline,
    "Weather",
    { value: ethers.parseEther("0.01") } // 0.01 ETH
  );
  
  const receipt = await tx.wait();
  console.log("✅ Test bet created in transaction:", receipt?.hash);
  
  // Get the bet details
  const bet = await overunder.getBet(1);
  console.log("   Bet ID:", bet.betId.toString());
  console.log("   Question:", bet.question);
  console.log("   Options:", bet.bettingOptions);
  console.log("   Total pool:", ethers.formatEther(bet.totalPoolAmount), "ETH");
  
  // Check balanced odds
  const odds = await overunder.getBetOdds(1);
  console.log("   Initial odds:");
  for (let i = 0; i < odds.length; i++) {
    console.log(`     ${bet.bettingOptions[i]}: ${odds[i].toString()} basis points (${(Number(odds[i]) / 100).toFixed(1)}%)`);
  }

  // 5. Save deployment info to file
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
      }
    },
    contractABI: {
      // This will be used by the frontend
      proxyAddress: proxyAddress,
      treasuryAddress: treasuryAddress
    }
  };

  fs.writeFileSync("deployments.json", JSON.stringify(deploymentInfo, null, 2));
  console.log("\n📄 Deployment info saved to deployments.json");

  // 6. Generate ABI files for frontend
  console.log("📋 5. Generating ABI files for frontend...");
  
  const overunderArtifact = await ethers.getContractFactory("OverunderUpgradeable");
  const treasuryArtifact = await ethers.getContractFactory("Treasury");
  
  const abiDir = "abis";
  if (!fs.existsSync(abiDir)) {
    fs.mkdirSync(abiDir);
  }
  
  fs.writeFileSync(
    `${abiDir}/OverunderUpgradeable.json`,
    JSON.stringify({
      contractName: "OverunderUpgradeable",
      abi: overunderArtifact.interface.formatJson(),
      address: proxyAddress
    }, null, 2)
  );
  
  fs.writeFileSync(
    `${abiDir}/Treasury.json`,
    JSON.stringify({
      contractName: "Treasury",
      abi: treasuryArtifact.interface.formatJson(),
      address: treasuryAddress
    }, null, 2)
  );
  
  console.log("✅ ABI files generated in ./abis/ directory\n");

  console.log("🎉 Deployment completed successfully!");
  console.log("🔧 To upgrade later, use: npx hardhat run scripts/upgrade.ts");
  console.log("💡 Proxy address for frontend:", proxyAddress);
  console.log("💰 Treasury address:", treasuryAddress);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  }); 