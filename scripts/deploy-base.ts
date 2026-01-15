import { ethers, upgrades } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);

  // Deploy Treasury
  console.log("🏦 Deploying Treasury...");
  const Treasury = await ethers.getContractFactory("Treasury");
  const treasury = await Treasury.deploy();
  await treasury.waitForDeployment();

  const treasuryAddress = await treasury.getAddress();
  console.log("✅ Treasury deployed to:", treasuryAddress);
  
  // Wait for additional confirmations on testnet
  console.log("⏳ Waiting for Treasury confirmations...");
  await new Promise(resolve => setTimeout(resolve, 15000)); // Wait 15 seconds
  
  // Verify treasury is a contract
  const treasuryCode = await ethers.provider.getCode(treasuryAddress);
  if (treasuryCode === "0x") {
    throw new Error("Treasury deployment failed - no code at address");
  }
  console.log("✅ Treasury contract verified on chain");

  // Deploy OverunderUpgradeable
  console.log("🎯 Deploying OverunderUpgradeable with Treasury:", treasuryAddress);
  const OverunderUpgradeable = await ethers.getContractFactory("OverunderUpgradeable");
  const overunder = await upgrades.deployProxy(OverunderUpgradeable, [treasuryAddress], {
    initializer: "initialize",
  });
  await overunder.waitForDeployment();

  const overunderAddress = await overunder.getAddress();
  console.log("✅ OverunderUpgradeable proxy deployed to:", overunderAddress);

  try {
    // Get implementation address using the admin interface
    const adminAddress = await upgrades.erc1967.getAdminAddress(overunderAddress);
    const implementationAddress = await upgrades.erc1967.getImplementationAddress(overunderAddress);
    console.log("OverunderUpgradeable implementation deployed to:", implementationAddress);
    console.log("Proxy admin address:", adminAddress);
  } catch (error) {
    console.log("Could not retrieve implementation address:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
