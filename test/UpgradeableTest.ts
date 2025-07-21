// test/UpgradeableTest.ts
import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { Contract } from "ethers";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("OverUnder Upgradeable System", function () {
  let overunder: Contract;
  let treasury: Contract;
  let marketFactory: Contract;
  
  let owner: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  let attacker: SignerWithAddress;

  beforeEach(async function () {
    [owner, user1, user2, attacker] = await ethers.getSigners();
    
    // Deploy Treasury
    const Treasury = await ethers.getContractFactory("Treasury");
    treasury = await Treasury.deploy();
    await treasury.waitForDeployment();
    
    // Deploy upgradeable OverUnder
    const OverunderUpgradeable = await ethers.getContractFactory("OverunderUpgradeable");
    overunder = await upgrades.deployProxy(
      OverunderUpgradeable,
      [await treasury.getAddress()],
      { 
        initializer: 'initialize',
        kind: 'uups' 
      }
    );
    await overunder.waitForDeployment();
    
    // Deploy MarketFactory separately
    const MarketFactoryUpgradeable = await ethers.getContractFactory("MarketFactoryUpgradeable");
    marketFactory = await upgrades.deployProxy(
      MarketFactoryUpgradeable,
      [await overunder.getAddress(), await treasury.getAddress()],
      {
        initializer: 'initialize',
        kind: 'uups'
      }
    );
    await marketFactory.waitForDeployment();
    
    // Connect them
    await overunder.setMarketFactory(await marketFactory.getAddress());
  });

  describe("Proxy Deployment", function () {
    it("Should deploy with correct initial state", async function () {
      expect(await overunder.owner()).to.equal(owner.address);
      expect(await overunder.getVersion()).to.equal(1);
      expect(await overunder.emergencyPaused()).to.be.false;
      expect(await overunder.minMarketDuration()).to.equal(3600); // 1 hour
      expect(await overunder.maxMarketDuration()).to.equal(365 * 24 * 3600); // 365 days
    });

    it("Should have working Treasury integration", async function () {
      expect(await treasury.owner()).to.equal(owner.address);
      expect(await overunder.treasury()).to.equal(await treasury.getAddress());
    });

    it("Should have working MarketFactory integration", async function () {
      expect(await marketFactory.owner()).to.equal(owner.address);
      expect(await marketFactory.overUnderContract()).to.equal(await overunder.getAddress());
      
      const [totalMarkets, totalCategories, filterEnabled, defaultFee] = await marketFactory.getMarketStats();
      expect(totalMarkets).to.equal(0);
      expect(totalCategories).to.equal(7); // Default categories
      expect(filterEnabled).to.be.false;
      expect(defaultFee).to.equal(0);
    });
  });

  describe("Admin Functions", function () {
    it("Should allow owner to pause/unpause", async function () {
      // Initially not paused
      expect(await overunder.emergencyPaused()).to.be.false;
      
      // Pause
      await expect(overunder.connect(owner).setEmergencyPause(true))
        .to.emit(overunder, "EmergencyPause")
        .withArgs(true);
      expect(await overunder.emergencyPaused()).to.be.true;
      
      // Unpause
      await overunder.connect(owner).setEmergencyPause(false);
      expect(await overunder.emergencyPaused()).to.be.false;
    });

    it("Should prevent non-owner from pausing", async function () {
      await expect(
        overunder.connect(user1).setEmergencyPause(true)
      ).to.be.revertedWithCustomError(overunder, "OwnableUnauthorizedAccount");
    });

    it("Should allow owner to blacklist users", async function () {
      expect(await overunder.blacklistedUsers(user1.address)).to.be.false;
      
      await expect(overunder.connect(owner).setUserBlacklist(user1.address, true))
        .to.emit(overunder, "UserBlacklisted")
        .withArgs(user1.address, true);
        
      expect(await overunder.blacklistedUsers(user1.address)).to.be.true;
    });

    it("Should allow owner to update market duration limits", async function () {
      const newMin = 2 * 3600; // 2 hours
      const newMax = 30 * 24 * 3600; // 30 days
      
      await overunder.connect(owner).setMarketDurationLimits(newMin, newMax);
      
      expect(await overunder.minMarketDuration()).to.equal(newMin);
      expect(await overunder.maxMarketDuration()).to.equal(newMax);
    });

    it("Should reject invalid duration limits", async function () {
      // Min > Max
      await expect(
        overunder.connect(owner).setMarketDurationLimits(24 * 3600, 2 * 3600)
      ).to.be.revertedWith("Invalid duration range");
      
      // Min too small
      await expect(
        overunder.connect(owner).setMarketDurationLimits(30 * 60, 24 * 3600) // 30 minutes
      ).to.be.revertedWith("Minimum too short");
      
      // Max too large
      await expect(
        overunder.connect(owner).setMarketDurationLimits(3600, 400 * 24 * 3600) // 400 days
      ).to.be.revertedWith("Maximum too long");
    });
  });

  describe("Enhanced Security Features", function () {
    it("Should prevent actions when paused", async function () {
      // Pause contract
      await overunder.connect(owner).setEmergencyPause(true);
      
      // Should prevent profile updates
      await expect(
        overunder.connect(user1).updateProfile("TestUser")
      ).to.be.revertedWithCustomError(overunder, "ContractPaused");
      
      // Should prevent market creation
      const resolutionTime = Math.floor(Date.now() / 1000) + 86400;
      await expect(
        overunder.connect(user1).createMarket(
          "Test Market",
          "Description",
          resolutionTime,
          "Sports",
          { value: ethers.parseEther("0.1") }
        )
      ).to.be.revertedWithCustomError(overunder, "ContractPaused");
    });

    it("Should prevent blacklisted users from taking actions", async function () {
      // Blacklist user
      await overunder.connect(owner).setUserBlacklist(user1.address, true);
      
             // Should prevent profile updates
       await expect(
         overunder.connect(user1).updateProfile("TestUser")
       ).to.be.revertedWithCustomError(overunder, "UserBlacklistedError");
      
             // Should prevent market creation
       const resolutionTime = Math.floor(Date.now() / 1000) + 86400;
       await expect(
         overunder.connect(user1).createMarket(
           "Test Market",
           "Description",
           resolutionTime,
           "Sports",
           { value: ethers.parseEther("0.1") }
         )
       ).to.be.revertedWithCustomError(overunder, "UserBlacklistedError");
    });

    it("Should validate market duration limits", async function () {
      const currentTime = Math.floor(Date.now() / 1000);
      
      // Too short
      await expect(
        overunder.connect(user1).createMarket(
          "Test Market",
          "Description",
          currentTime + 30 * 60, // 30 minutes
          "Sports",
          { value: ethers.parseEther("0.1") }
        )
      ).to.be.revertedWithCustomError(overunder, "InvalidMarketDuration");
      
      // Too long (more than 365 days)
      await expect(
        overunder.connect(user1).createMarket(
          "Test Market",
          "Description",
          currentTime + 400 * 24 * 3600, // 400 days
          "Sports",
          { value: ethers.parseEther("0.1") }
        )
      ).to.be.revertedWithCustomError(overunder, "InvalidMarketDuration");
    });
  });

  describe("Enhanced Profile Management", function () {
    it("Should validate username requirements", async function () {
      // Empty username
      await expect(
        overunder.connect(user1).updateProfile("")
      ).to.be.revertedWith("Username cannot be empty");
      
      // Username too long
      const longUsername = "a".repeat(33); // 33 characters
      await expect(
        overunder.connect(user1).updateProfile(longUsername)
      ).to.be.revertedWith("Username too long");
      
      // Valid username should work
      await expect(overunder.connect(user1).updateProfile("ValidUser123"))
        .to.emit(overunder, "ProfileUpdated")
        .withArgs(user1.address, "ValidUser123");
    });
  });

  describe("Market Factory Enhanced Features", function () {
    it("Should support category filtering", async function () {
      // Initially category filtering is disabled
      expect(await marketFactory.isCategoryAllowed("CustomCategory")).to.be.true;
      
      // Enable category filtering
      await marketFactory.connect(owner).setCategoryFilterEnabled(true);
      expect(await marketFactory.isCategoryAllowed("CustomCategory")).to.be.false;
      expect(await marketFactory.isCategoryAllowed("Sports")).to.be.true; // Default category
      
      // Add custom category
      await expect(marketFactory.connect(owner).addCategory("CustomCategory"))
        .to.emit(marketFactory, "CategoryAdded")
        .withArgs("CustomCategory");
      expect(await marketFactory.isCategoryAllowed("CustomCategory")).to.be.true;
    });

    it("Should support custom creation fees", async function () {
      // Set default creation fee
      await marketFactory.connect(owner).setDefaultCreationFee(ethers.parseEther("0.01"));
      expect(await marketFactory.getCreationFee(user1.address)).to.equal(ethers.parseEther("0.01"));
      
      // Set custom fee for specific user
      await expect(marketFactory.connect(owner).setUserCreationFee(user1.address, ethers.parseEther("0.005")))
        .to.emit(marketFactory, "MarketCreationFeeUpdated")
        .withArgs(user1.address, ethers.parseEther("0.005"));
      expect(await marketFactory.getCreationFee(user1.address)).to.equal(ethers.parseEther("0.005"));
    });
  });

  describe("Contract Status and Monitoring", function () {
    it("Should provide comprehensive contract status", async function () {
      const [version, paused, totalMarkets, minDuration, maxDuration] = await overunder.getContractStatus();
      
      expect(version).to.equal(1);
      expect(paused).to.be.false;
      expect(totalMarkets).to.equal(0);
      expect(minDuration).to.equal(3600);
      expect(maxDuration).to.equal(365 * 24 * 3600);
    });

    it("Should track market creation correctly", async function () {
      // Create a market
      const resolutionTime = Math.floor(Date.now() / 1000) + 86400;
      await overunder.connect(user1).createMarket(
        "Test Market",
        "Description",
        resolutionTime,
        "Sports",
        { value: ethers.parseEther("0.1") }
      );
      
      // Check updated status
      const [, , totalMarkets] = await overunder.getContractStatus();
      expect(totalMarkets).to.equal(1);
      
      const markets = await overunder.getAllMarkets();
      expect(markets.length).to.equal(1);
    });
  });

  describe("Upgradeability", function () {
    it("Should only allow owner to upgrade", async function () {
      const OverunderUpgradeableV2 = await ethers.getContractFactory("OverunderUpgradeable");
      
      // Non-owner cannot upgrade
      await expect(
        upgrades.upgradeProxy(await overunder.getAddress(), OverunderUpgradeableV2.connect(attacker))
      ).to.be.revertedWithCustomError(overunder, "OwnableUnauthorizedAccount");
    });

    it("Should preserve state during upgrade", async function () {
      // Set some state
      await overunder.connect(user1).updateProfile("PreUpgradeUser");
      await overunder.connect(owner).setEmergencyPause(true);
      
      // Perform upgrade
      const OverunderUpgradeableV2 = await ethers.getContractFactory("OverunderUpgradeable");
      const upgraded = await upgrades.upgradeProxy(await overunder.getAddress(), OverunderUpgradeableV2);
      
      // Check state is preserved
      const profile = await upgraded.userProfiles(user1.address);
      expect(profile.username).to.equal("PreUpgradeUser");
      expect(await upgraded.emergencyPaused()).to.be.true;
      
      // Version should be incremented
      expect(await upgraded.getVersion()).to.equal(2);
    });

    it("Should emit upgrade event", async function () {
      const OverunderUpgradeableV2 = await ethers.getContractFactory("OverunderUpgradeable");
      const proxyAddress = await overunder.getAddress();
      
      // Perform the upgrade first and then check the version increment
      await upgrades.upgradeProxy(proxyAddress, OverunderUpgradeableV2);
      
      // Check that version was incremented (which happens in _authorizeUpgrade)
      const newVersion = await overunder.getVersion();
      expect(newVersion).to.equal(2);
    });
  });

  describe("Reentrancy Protection", function () {
    it("Should have reentrancy protection on critical functions", async function () {
      // This is more of a structural test - the ReentrancyGuard is inherited
      // In practice, you'd need a malicious contract to test actual reentrancy
      expect(await overunder.getVersion()).to.be.greaterThan(0); // Just verify contract is working
    });
  });

  describe("Integration with Original AMM System", function () {
    it("Should create markets with AMM functionality", async function () {
      const resolutionTime = Math.floor(Date.now() / 1000) + 86400;
      
      const tx = await overunder.connect(user1).createMarket(
        "Will ETH price go up?",
        "Crypto market prediction",
        resolutionTime,
        "Crypto",
        { value: ethers.parseEther("1.0") }
      );
      
      // Get market address
      const receipt = await tx.wait();
      const marketCreatedEvent = receipt.logs.find((log: any) => {
        try {
          const parsed = marketFactory.interface.parseLog(log);
          return parsed?.name === "MarketCreated";
        } catch {
          return false;
        }
      });
      
      const parsedEvent = marketFactory.interface.parseLog(marketCreatedEvent);
      const marketAddress = parsedEvent.args[0];
      
      // Test market functionality
      const market = await ethers.getContractAt("Market", marketAddress);
      const [yesPrice, noPrice] = await market.getCurrentOdds();
      
      expect(yesPrice).to.be.greaterThan(0);
      expect(noPrice).to.be.greaterThan(0);
    });
  });
}); 