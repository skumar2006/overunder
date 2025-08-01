import { ethers, upgrades } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);

  // Deploy Treasury
  const Treasury = await ethers.getContractFactory("Treasury");
  const treasury = await Treasury.deploy();
  await treasury.waitForDeployment();

  const treasuryAddress = await treasury.getAddress();
  console.log("Treasury deployed to:", treasuryAddress);

  // Deploy OverunderUpgradeable
  const OverunderUpgradeable = await ethers.getContractFactory("OverunderUpgradeable");
  const overunder = await upgrades.deployProxy(OverunderUpgradeable, [treasuryAddress], {
    initializer: "initialize",
  });
  await overunder.waitForDeployment();

  const overunderAddress = await overunder.getAddress();
  console.log("OverunderUpgradeable proxy deployed to:", overunderAddress);
  
  const implementationAddress = await upgrades.getImplementationAddress(overunder.getAddress());
  console.log("OverunderUpgradeable implementation deployed to:", implementationAddress);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
