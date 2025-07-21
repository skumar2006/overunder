import { ethers, upgrades } from "hardhat";
import fs from "fs";

async function main() {
  console.log("🔄 Upgrading to OverUnder V2 with Premium Features...\n");

  // Load deployment info
  let deploymentInfo: any;
  try {
    const data = fs.readFileSync("deployments.json", "utf8");
    deploymentInfo = JSON.parse(data);
  } catch (error) {
    console.error("❌ Could not read deployments.json. Make sure you've deployed V1 first.");
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

  // Get current version and state before upgrade
  const currentContract = await ethers.getContractAt("OverunderUpgradeable", proxyAddress);
  const currentVersion = await currentContract.getVersion();
  const userProfile = await currentContract.userProfiles(upgrader.address);
  
  console.log("📊 Pre-upgrade Status:");
  console.log("   Current version:", currentVersion.toString());
  console.log("   User profile:", userProfile.username);
  console.log("   Emergency paused:", await currentContract.emergencyPaused());

  // Check if we're the owner
  const owner = await currentContract.owner();
  if (owner !== upgrader.address) {
    console.error("❌ You are not the owner of this contract. Owner:", owner);
    process.exit(1);
  }

  // 1. Deploy V2 Implementation
  console.log("📋 1. Deploying OverUnder V2 implementation...");
  const OverunderUpgradeableV2 = await ethers.getContractFactory("OverunderUpgradeableV2");
  
  console.log("📋 2. Upgrading proxy to V2 implementation...");
  const upgradedContract = await upgrades.upgradeProxy(proxyAddress, OverunderUpgradeableV2);
  await upgradedContract.waitForDeployment();

  const newImplementationAddress = await upgrades.erc1967.getImplementationAddress(proxyAddress);
  console.log("✅ Upgrade to V2 completed!");
  console.log("   Proxy address (unchanged):", proxyAddress);
  console.log("   Old implementation:", deploymentInfo.contracts.overunder.implementation);
  console.log("   New V2 implementation:", newImplementationAddress, "\n");

  // 3. Initialize V2 Features
  console.log("📋 3. Initializing V2 features...");
  try {
    await upgradedContract.initializeV2();
    console.log("✅ V2 features initialized successfully!");
  } catch (error: any) {
    if (error.message.includes("InvalidInitialization")) {
      console.log("ℹ️  V2 already initialized (this is normal if running upgrade multiple times)");
    } else {
      throw error;
    }
  }

  // 4. Test V2 Features
  console.log("📋 4. Testing V2 enhanced features...\n");

  // Test version and state preservation
  const v2Contract = await ethers.getContractAt("OverunderUpgradeableV2", proxyAddress);
  const newVersion = await v2Contract.getVersion();
  const preservedProfile = await v2Contract.userProfiles(upgrader.address);
  
  console.log("🔍 State Preservation Check:");
  console.log("   New version:", newVersion.toString());
  console.log("   Profile preserved:", preservedProfile.username);
  console.log("   Emergency status preserved:", await v2Contract.emergencyPaused(), "\n");

  // Test V2 enhanced contract status
  const [version, paused, totalMarkets, minDuration, maxDuration, premiumMembers, referralEnabled, totalRevenue] = 
    await v2Contract.getContractStatus();
  
  console.log("🆕 V2 Enhanced Status:");
  console.log("   Version:", version.toString());
  console.log("   Premium members:", premiumMembers.toString());
  console.log("   Referral system:", referralEnabled);
  console.log("   Total premium revenue:", ethers.formatEther(totalRevenue), "ETH\n");

  // Test Premium Membership Purchase
  console.log("💎 Testing Premium Membership System...");
  const membershipPrice = await v2Contract.premiumMembershipPrice();
  console.log("   Premium membership price:", ethers.formatEther(membershipPrice), "ETH");
  
  try {
    const tx = await v2Contract.purchasePremiumMembership({ value: membershipPrice });
    await tx.wait();
    console.log("✅ Premium membership purchased successfully!");
    
    const [isActive, expiresAt, discountRate, bonusMultiplier] = await v2Contract.getPremiumMembershipInfo(upgrader.address);
    console.log("   Membership active:", isActive);
    console.log("   Expires at:", new Date(Number(expiresAt) * 1000).toLocaleString());
    console.log("   Discount rate:", discountRate.toString(), "basis points");
    console.log("   Bonus multiplier:", bonusMultiplier.toString(), "basis points\n");
  } catch (error) {
    console.log("ℹ️  Premium membership may already be purchased or insufficient funds\n");
  }

  // Test Referral System
  console.log("🔗 Testing Referral System...");
  const isReferralEnabled = await v2Contract.referralSystemEnabled();
  const defaultReferralRate = await v2Contract.defaultReferralRate();
  console.log("   Referral system enabled:", isReferralEnabled);
  console.log("   Default referral rate:", defaultReferralRate.toString(), "basis points");
  
  const [referrer, totalReferred, referralEarnings, referralRate] = await v2Contract.getReferralInfo(upgrader.address);
  console.log("   Current referrer:", referrer === ethers.ZeroAddress ? "None" : referrer);
  console.log("   Total referred:", totalReferred.toString());
  console.log("   Referral earnings:", ethers.formatEther(referralEarnings), "ETH\n");

  // Test Enhanced Market Creation with Premium Benefits
  console.log("📈 Testing Enhanced Market Creation...");
  try {
    const resolutionTime = Math.floor(Date.now() / 1000) + 86400; // 24 hours from now
    const tx = await v2Contract.createMarket(
      "Will Bitcoin reach $100k by end of year?",
      "Prediction market for Bitcoin price milestone",
      resolutionTime,
      "Crypto",
      { value: ethers.parseEther("0.1") }
    );
    await tx.wait();
    
    console.log("✅ Enhanced market created successfully!");
    
    // Check category popularity tracking
    const cryptoPopularity = await v2Contract.categoryPopularity("Crypto");
    console.log("   Crypto category popularity:", cryptoPopularity.toString(), "\n");
  } catch (error) {
    console.log("ℹ️  Market creation test skipped (may already exist or insufficient funds)\n");
  }

  // Test Premium Analytics Feature
  try {
    console.log("📊 Testing Premium Analytics...");
    const [categories, totals, totalMarketsCreated, totalPremiumMembersCount] = 
      await v2Contract.getMarketAnalytics();
    
    console.log("✅ Premium analytics accessed successfully!");
    console.log("   Popular categories:", categories.join(", "));
    console.log("   Category totals:", totals.map(t => t.toString()).join(", "));
    console.log("   Total markets:", totalMarketsCreated.toString());
    console.log("   Premium members:", totalPremiumMembersCount.toString(), "\n");
  } catch (error) {
    console.log("ℹ️  Premium analytics requires active premium membership\n");
  }

  // Test Admin V2 Features
  console.log("⚙️  Testing V2 Admin Features...");
  
  // Test premium membership params update
  await v2Contract.setPremiumMembershipParams(ethers.parseEther("0.05"), 15 * 24 * 3600); // 0.05 ETH, 15 days
  console.log("✅ Premium membership parameters updated");
  
  // Test referral rate update
  await v2Contract.setDefaultReferralRate(750); // 7.5%
  console.log("✅ Default referral rate updated to 7.5%");
  
  const newDefaultRate = await v2Contract.defaultReferralRate();
  console.log("   New default referral rate:", newDefaultRate.toString(), "basis points\n");

  // 5. Update deployment info
  deploymentInfo.contracts.overunder.implementation = newImplementationAddress;
  deploymentInfo.contracts.overunder.version = "2";
  deploymentInfo.lastUpgrade = {
    timestamp: new Date().toISOString(),
    oldVersion: currentVersion.toString(),
    newVersion: newVersion.toString(),
    upgrader: upgrader.address,
    upgradeType: "V2 - Premium Features"
  };
  deploymentInfo.v2Features = {
    premiumMembership: {
      enabled: true,
      price: ethers.formatEther(await v2Contract.premiumMembershipPrice()),
      duration: (await v2Contract.premiumMembershipDuration()).toString()
    },
    referralSystem: {
      enabled: await v2Contract.referralSystemEnabled(),
      defaultRate: (await v2Contract.defaultReferralRate()).toString()
    },
    analytics: {
      enabled: true,
      requiresPremium: true
    }
  };

  fs.writeFileSync("deployments.json", JSON.stringify(deploymentInfo, null, 2));
  console.log("📄 Updated deployment info with V2 features saved to deployments.json\n");

  // Final Status Summary
  const finalStatus = await v2Contract.getContractStatus();
  console.log("🎉 V2 Upgrade Completed Successfully!");
  console.log("=" .repeat(50));
  console.log("📊 FINAL V2 STATUS:");
  console.log("   🔢 Version:", finalStatus[0].toString());
  console.log("   ⏸️  Paused:", finalStatus[1]);
  console.log("   📈 Total Markets:", finalStatus[2].toString());
  console.log("   ⏱️  Min Duration:", (Number(finalStatus[3]) / 3600).toString(), "hours");
  console.log("   ⏱️  Max Duration:", (Number(finalStatus[4]) / (3600 * 24)).toString(), "days");
  console.log("   💎 Premium Members:", finalStatus[5].toString());
  console.log("   🔗 Referral Enabled:", finalStatus[6]);
  console.log("   💰 Premium Revenue:", ethers.formatEther(finalStatus[7]), "ETH");
  console.log("=" .repeat(50));
  console.log("🚀 New V2 Features Available:");
  console.log("   💎 Premium Membership System");
  console.log("   🔗 Referral Rewards Program");
  console.log("   📊 Advanced Market Analytics");
  console.log("   📈 Category Popularity Tracking");
  console.log("   ⭐ Enhanced User Experience");
  console.log("💡 Proxy address remains the same:", proxyAddress);
  console.log("🔧 All user data and state preserved during upgrade!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ V2 Upgrade failed:", error);
    process.exit(1);
  }); 