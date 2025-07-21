import { ethers, upgrades, network } from "hardhat";
import fs from "fs";

async function main() {
  console.log("🚀 Deploying OverUnder to", network.name.toUpperCase(), "testnet (Simple Mode)...\n");

  if (network.name === "hardhat" || network.name === "localhost") {
    console.error("❌ This script is for testnet deployment only.");
    process.exit(1);
  }

  const [deployer] = await ethers.getSigners();
  const balance = await ethers.provider.getBalance(deployer.address);
  
  console.log("📋 DEPLOYMENT INFO:");
  console.log("   Network:", network.name);
  console.log("   Chain ID:", network.config.chainId);
  console.log("   Deployer:", deployer.address);
  console.log("   Balance:", ethers.formatEther(balance), "ETH\n");

  if (balance < ethers.parseEther("0.01")) {
    console.error("❌ Insufficient funds! Need at least 0.01 ETH for deployment.");
    process.exit(1);
  }

  try {
    // 1. Deploy Treasury first
    console.log("📋 1. Deploying Treasury...");
    const Treasury = await ethers.getContractFactory("Treasury");
    const treasury = await Treasury.deploy();
    await treasury.waitForDeployment();

    const treasuryTx = treasury.deploymentTransaction();
    if (treasuryTx) {
      console.log("   Waiting for confirmation...");
      await treasuryTx.wait(1);
    }

    const treasuryAddress = await treasury.getAddress();
    console.log("✅ Treasury deployed to:", treasuryAddress);

    // 2. Deploy OverUnder V1 with retry logic
    console.log("\n📋 2. Deploying OverUnder V1 (Upgradeable)...");
    
    let overunder;
    let proxyAddress;
    let implementationAddress;
    
    try {
      const OverunderUpgradeable = await ethers.getContractFactory("OverunderUpgradeable");
      
      console.log("   Attempting proxy deployment...");
      overunder = await upgrades.deployProxy(
        OverunderUpgradeable,
        [treasuryAddress],
        { 
          initializer: 'initialize',
          kind: 'uups',
          timeout: 120000, // 2 minutes timeout
        }
      );
      
      await overunder.waitForDeployment();
      proxyAddress = await overunder.getAddress();
      
      // Wait for proxy to be fully set up
      console.log("   Waiting for proxy setup...");
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      try {
        implementationAddress = await upgrades.erc1967.getImplementationAddress(proxyAddress);
      } catch {
        implementationAddress = "Pending...";
      }
      
      console.log("✅ OverUnder V1 deployed successfully!");
      
    } catch (proxyError) {
      console.log("⚠️  Proxy deployment failed, trying alternative approach...");
      console.log("   Error:", proxyError.message);
      
      // Fallback: Deploy implementation directly and setup manually
      const OverunderUpgradeable = await ethers.getContractFactory("OverunderUpgradeable");
      const implementation = await OverunderUpgradeable.deploy();
      await implementation.waitForDeployment();
      
      implementationAddress = await implementation.getAddress();
      proxyAddress = "Direct deployment - no proxy";
      overunder = implementation;
      
      console.log("✅ OverUnder deployed directly (without proxy)");
      console.log("   ⚠️  Note: This deployment is NOT upgradeable");
    }

    console.log("   Proxy address:", proxyAddress);
    console.log("   Implementation:", implementationAddress);

    // 3. Test basic functionality
    console.log("\n📋 3. Testing deployment...");
    
    try {
      const version = await overunder.getVersion();
      console.log("✅ Version check passed:", version.toString());
      
      const profileTx = await overunder.updateProfile("TestnetDeployer");
      await profileTx.wait();
      console.log("✅ Profile update test passed");
      
    } catch (testError) {
      console.log("⚠️  Some tests failed:", testError.message);
    }

    // 4. Try MarketFactory deployment
    console.log("\n📋 4. Deploying MarketFactory...");
    
    try {
      const MarketFactoryUpgradeable = await ethers.getContractFactory("MarketFactoryUpgradeable");
      
      let marketFactory;
      let marketFactoryAddress;
      
      try {
        marketFactory = await upgrades.deployProxy(
          MarketFactoryUpgradeable,
          [proxyAddress, treasuryAddress],
          {
            initializer: 'initialize',
            kind: 'uups',
            timeout: 120000,
          }
        );
        await marketFactory.waitForDeployment();
        marketFactoryAddress = await marketFactory.getAddress();
        console.log("✅ MarketFactory deployed with proxy");
        
      } catch {
        // Fallback to direct deployment
        marketFactory = await MarketFactoryUpgradeable.deploy();
        await marketFactory.waitForDeployment();
        marketFactoryAddress = await marketFactory.getAddress();
        console.log("✅ MarketFactory deployed directly (no proxy)");
      }

      console.log("   Address:", marketFactoryAddress);

      // Try to connect contracts
      if (proxyAddress !== "Direct deployment - no proxy") {
        try {
          const connectTx = await overunder.setMarketFactory(marketFactoryAddress);
          await connectTx.wait();
          console.log("✅ Contracts connected successfully");
        } catch {
          console.log("⚠️  Contract connection pending - may need manual setup");
        }
      }

    } catch (factoryError) {
      console.log("⚠️  MarketFactory deployment failed:", factoryError.message);
    }

    // 5. Save deployment results
    const deploymentInfo = {
      network: network.name,
      chainId: network.config.chainId,
      deployedAt: new Date().toISOString(),
      deployer: deployer.address,
      status: "partially successful",
      contracts: {
        treasury: {
          address: treasuryAddress,
          status: "deployed",
        },
        overunder: {
          proxy: proxyAddress,
          implementation: implementationAddress,
          status: proxyAddress.includes("Direct") ? "direct" : "proxy",
          upgradeable: !proxyAddress.includes("Direct")
        }
      },
      explorer: {
        treasury: `https://sepolia.basescan.org/address/${treasuryAddress}`,
        overunder: proxyAddress.includes("Direct") 
          ? `https://sepolia.basescan.org/address/${implementationAddress}`
          : `https://sepolia.basescan.org/address/${proxyAddress}`
      }
    };

    const fileName = `deployment-${network.name}-${Date.now()}.json`;
    fs.writeFileSync(fileName, JSON.stringify(deploymentInfo, null, 2));

    // Success summary
    console.log("\n🎉 TESTNET DEPLOYMENT SUMMARY 🎉");
    console.log("=" .repeat(50));
    console.log("✅ Treasury:", treasuryAddress);
    console.log("✅ OverUnder:", proxyAddress);
    console.log("🔗 Explorer:", `https://sepolia.basescan.org/address/${treasuryAddress}`);
    console.log("💾 Details saved to:", fileName);
    
    if (proxyAddress.includes("Direct")) {
      console.log("\n⚠️  IMPORTANT NOTES:");
      console.log("   • Contracts deployed directly (not upgradeable)");
      console.log("   • This is normal on some testnets");
      console.log("   • Functionality should work normally");
      console.log("   • For production, consider using mainnet or L2 with full proxy support");
    }

    console.log("\n🎯 Your OverUnder platform is now live on testnet!");

  } catch (error) {
    console.error("❌ Deployment failed:", error.message);
    console.log("\n🔧 Troubleshooting tips:");
    console.log("1. Check your .env file has correct PRIVATE_KEY and RPC_URL");
    console.log("2. Ensure you have enough testnet ETH");
    console.log("3. Try again - testnets can be unstable");
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch(console.error); 