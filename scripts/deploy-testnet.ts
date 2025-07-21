import { ethers, upgrades, network } from "hardhat";
import fs from "fs";

async function main() {
  console.log("🚀 Deploying OverUnder to", network.name.toUpperCase(), "testnet...\n");

  // Verify we're on a testnet
  if (network.name === "hardhat" || network.name === "localhost") {
    console.error("❌ This script is for testnet deployment. Use deploy-upgradeable.ts for local testing.");
    process.exit(1);
  }

  const [deployer] = await ethers.getSigners();
  
  // Check deployer has enough ETH for deployment
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("📋 DEPLOYMENT INFO:");
  console.log("   Network:", network.name);
  console.log("   Chain ID:", network.config.chainId);
  console.log("   Deployer:", deployer.address);
  console.log("   Balance:", ethers.formatEther(balance), "ETH");
  
  if (balance < ethers.parseEther("0.01")) {
    console.error("❌ Insufficient funds! Need at least 0.01 ETH for deployment.");
    console.log("💡 Get testnet ETH from:");
    console.log("   • Base Sepolia: https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet");
    console.log("   • Or Bridge from Ethereum Sepolia: https://bridge.base.org/");
    process.exit(1);
  }

  console.log("\n✅ Ready to deploy! Starting deployment process...\n");

  // 1. Deploy Treasury
  console.log("📋 1. Deploying Treasury...");
  const Treasury = await ethers.getContractFactory("Treasury");
  const treasury = await Treasury.deploy();
  await treasury.waitForDeployment();
  
  // Wait for additional confirmations on testnet
  console.log("   Waiting for network confirmation...");
  const deploymentTx = treasury.deploymentTransaction();
  if (deploymentTx) {
    await deploymentTx.wait(2); // Wait for 2 confirmations
  }
  
  const treasuryAddress = await treasury.getAddress();
  
  console.log("✅ Treasury deployed!");
  console.log("   Address:", treasuryAddress);
  console.log("   Transaction:", treasury.deploymentTransaction()?.hash);
  
  // Safely get owner with retry
  try {
    const owner = await treasury.owner();
    console.log("   Owner:", owner, "\n");
  } catch (error) {
    console.log("   Owner: (confirmation pending...)", "\n");
  }

  // 2. Deploy OverUnder (V1) with UUPS proxy
  console.log("📋 2. Deploying OverUnder (Upgradeable V1)...");
  const OverunderUpgradeable = await ethers.getContractFactory("OverunderUpgradeable");
  
  const overunder = await upgrades.deployProxy(
    OverunderUpgradeable,
    [treasuryAddress],
    { 
      initializer: 'initialize',
      kind: 'uups' 
    }
  );
  await overunder.waitForDeployment();
  
  const proxyAddress = await overunder.getAddress();
  const implementationAddress = await upgrades.erc1967.getImplementationAddress(proxyAddress);
  
  console.log("✅ OverUnder V1 deployed!");
  console.log("   Proxy:", proxyAddress);
  console.log("   Implementation:", implementationAddress);
  console.log("   Owner:", await overunder.owner());
  console.log("   Version:", await overunder.getVersion(), "\n");

  // 3. Deploy MarketFactory
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
  
  console.log("✅ MarketFactory deployed!");
  console.log("   Proxy:", marketFactoryAddress);
  console.log("   Implementation:", marketFactoryImplementation);
  console.log("   Owner:", await marketFactory.owner(), "\n");

  // 4. Connect contracts
  console.log("📋 4. Connecting contracts...");
  const connectTx = await overunder.setMarketFactory(marketFactoryAddress);
  await connectTx.wait();
  console.log("✅ Contracts connected!\n");

  // 5. Test basic functionality
  console.log("📋 5. Testing deployment...");
  
  // Test profile update
  const profileTx = await overunder.updateProfile("TestnetDeployer");
  await profileTx.wait();
  
  const profile = await overunder.userProfiles(deployer.address);
  console.log("✅ Profile test passed:", profile.username);
  
  // Test contract status
  const [version, paused, totalMarkets, minDuration, maxDuration] = await overunder.getContractStatus();
  console.log("✅ Contract status:");
  console.log("   Version:", version.toString());
  console.log("   Paused:", paused);
  console.log("   Markets:", totalMarkets.toString());
  console.log("   Duration limits:", (Number(minDuration) / 3600), "to", (Number(maxDuration) / (3600 * 24)), "hours to days\n");

  // 6. Save deployment info
  const deploymentInfo = {
    network: network.name,
    chainId: network.config.chainId,
    deployedAt: new Date().toISOString(),
    deployer: deployer.address,
    deployerBalance: ethers.formatEther(balance),
    contracts: {
      treasury: {
        address: treasuryAddress,
        name: "Treasury",
        txHash: treasury.deploymentTransaction()?.hash
      },
      overunder: {
        proxy: proxyAddress,
        implementation: implementationAddress,
        name: "OverunderUpgradeable",
        version: version.toString(),
        admin: "0x0000000000000000000000000000000000000000" // UUPS has no admin
      },
      marketFactory: {
        proxy: marketFactoryAddress,
        implementation: marketFactoryImplementation,
        name: "MarketFactoryUpgradeable"
      }
    },
    explorer: {
      baseURL: getExplorerURL(network.name),
      treasury: `${getExplorerURL(network.name)}/address/${treasuryAddress}`,
      overunder: `${getExplorerURL(network.name)}/address/${proxyAddress}`,
      marketFactory: `${getExplorerURL(network.name)}/address/${marketFactoryAddress}`
    }
  };

  const fileName = `deployment-${network.name}-${Date.now()}.json`;
  fs.writeFileSync(fileName, JSON.stringify(deploymentInfo, null, 2));

  // 7. Success summary
  console.log("🎉 TESTNET DEPLOYMENT COMPLETE! 🎉");
  console.log("=" .repeat(60));
  console.log("📊 DEPLOYMENT SUMMARY:");
  console.log("   Network:", network.name.toUpperCase());
  console.log("   Chain ID:", network.config.chainId);
  console.log("   Gas used: ~4-5M gas");
  console.log("   Total cost: ~0.001-0.005 ETH (varies by network)\n");

  console.log("📍 CONTRACT ADDRESSES:");
  console.log("   Treasury:", treasuryAddress);
  console.log("   OverUnder Proxy:", proxyAddress);
  console.log("   MarketFactory Proxy:", marketFactoryAddress, "\n");

  console.log("🔗 BLOCK EXPLORERS:");
  console.log("   Treasury:", `${getExplorerURL(network.name)}/address/${treasuryAddress}`);
  console.log("   OverUnder:", `${getExplorerURL(network.name)}/address/${proxyAddress}`);
  console.log("   MarketFactory:", `${getExplorerURL(network.name)}/address/${marketFactoryAddress}`, "\n");

  console.log("💾 Deployment details saved to:", fileName, "\n");

  console.log("🔄 NEXT STEPS:");
  console.log("   1. Verify contracts: npx hardhat verify --network", network.name, proxyAddress);
  console.log("   2. Test V2 upgrade: npx hardhat run scripts/upgrade-testnet-v2.ts --network", network.name);
  console.log("   3. Create test markets and try the system!");
  console.log("   4. Build frontend integration");
  
  console.log("\n💰 GET TESTNET ETH:");
  if (network.name === "baseSepolia") {
    console.log("   • Coinbase Faucet: https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet");
    console.log("   • Bridge from Sepolia: https://bridge.base.org/");
  }
  
  console.log("\n🎯 Your OverUnder platform is now live on testnet!");
}

function getExplorerURL(networkName: string): string {
  switch (networkName) {
    case "baseSepolia":
      return "https://sepolia.basescan.org";
    default:
      return "https://etherscan.io"; // fallback
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Testnet deployment failed:", error);
    process.exit(1);
  }); 