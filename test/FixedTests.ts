import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { Contract } from "ethers";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("OverUnder & Treasury - Core Functionality Tests", function () {
  let overunder: Contract;
  let treasury: Contract;
  
  let owner: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  let user3: SignerWithAddress;
  let attacker: SignerWithAddress;

  const creationFee = ethers.parseEther("0.01");
  const minimumBetAmount = ethers.parseEther("0.001");
  const minimumLiquidityAmount = ethers.parseEther("0.01");

  // Helper function to get future timestamp
  async function getFutureTimestamp(hoursFromNow: number): Promise<number> {
    const currentBlockTime = await time.latest();
    return currentBlockTime + (hoursFromNow * 3600);
  }

  beforeEach(async function () {
    [owner, user1, user2, user3, attacker] = await ethers.getSigners();
    
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

    // Authorize the OverUnder contract to collect fees
    await treasury.connect(owner).setAuthorization(await overunder.getAddress(), true);
  });

  describe("Treasury Security Tests", function () {
    
    it("Should prevent unauthorized fee collection", async function () {
      // Try to collect fees from unauthorized address
      await expect(
        treasury.connect(attacker).collectFee({ value: ethers.parseEther("1") })
      ).to.be.revertedWith("Unauthorized");
    });

    it("Should allow authorized contracts to collect fees", async function () {
      const feeAmount = ethers.parseEther("0.1");
      
      // Use the authorized OverUnder contract
      await expect(
        treasury.connect(owner).setAuthorization(owner.address, true)
      ).to.emit(treasury, "AuthorizationChanged");

      await expect(
        treasury.connect(owner).collectFee({ value: feeAmount })
      ).to.emit(treasury, "FeeCollected")
       .withArgs(owner.address, feeAmount);

      expect(await treasury.totalFeesCollected()).to.equal(feeAmount);
    });

    it("Should allow owner to withdraw funds", async function () {
      const feeAmount = ethers.parseEther("1");
      
      // Authorize owner and collect fees
      await treasury.connect(owner).setAuthorization(owner.address, true);
      await treasury.connect(owner).collectFee({ value: feeAmount });

      await expect(
        treasury.connect(owner).withdraw(feeAmount)
      ).to.emit(treasury, "Withdrawal")
       .withArgs(owner.address, feeAmount);

      expect(await treasury.getBalance()).to.equal(0);
    });
  });

  describe("OverUnder Initialization Tests", function () {
    
    it("Should initialize with correct default values", async function () {
      expect(await overunder.protocolVersion()).to.equal(2);
      expect(await overunder.emergencyPaused()).to.equal(false);
      expect(await overunder.minMarketDuration()).to.equal(3600); // 1 hour
      expect(await overunder.maxMarketDuration()).to.equal(31536000); // 365 days
      expect(await overunder.platformFeeRate()).to.equal(200); // 2%
      expect(await overunder.lpFeeRate()).to.equal(50); // 0.5%
      expect(await overunder.minimumBetAmount()).to.equal(minimumBetAmount);
      expect(await overunder.creationFee()).to.equal(creationFee);
    });
  });

  describe("Market Creation Tests", function () {
    
    it("Should create market with correct LP initialization", async function () {
      const question = "Will it rain tomorrow?";
      const description = "Weather prediction market";
      const options = ["Yes", "No"];
      const deadline = await getFutureTimestamp(2); // 2 hours from now
      const category = "Weather";

      const tx = await overunder.connect(user1).createBet(
        question,
        description,
        options,
        deadline,
        category,
        { value: creationFee }
      );

      await expect(tx)
        .to.emit(overunder, "BetCreated")
        .and.to.emit(overunder, "LiquidityProvided");

      // Check bet details
      const betId = 1;
      const bet = await overunder.getBet(betId);
      expect(bet.creator).to.equal(user1.address);
      expect(bet.question).to.equal(question);
      expect(bet.stakeAmount).to.equal(0); // Creator has no betting position
      expect(bet.totalPoolAmount).to.equal(creationFee);

      // Check LP positions (balanced across options)
      const perOption = creationFee / BigInt(options.length);
      for (let i = 0; i < options.length; i++) {
        expect(await overunder.getOptionPool(betId, i)).to.equal(perOption);
        expect(await overunder.getLPPosition(betId, user1.address, i)).to.equal(perOption);
        expect(await overunder.getBettorPosition(betId, user1.address, i)).to.equal(0);
      }

      // Check LP shares
      expect(await overunder.getUserLPShares(betId, user1.address)).to.equal(creationFee);
      expect(await overunder.getTotalLPShares(betId)).to.equal(creationFee);
    });

    it("Should reject insufficient creation fee", async function () {
      const insufficientFee = ethers.parseEther("0.005");
      
      await expect(
        overunder.connect(user1).createBet(
          "Test question",
          "Test description", 
          ["Yes", "No"],
          await getFutureTimestamp(2),
          "Test",
          { value: insufficientFee }
        )
      ).to.be.revertedWith("Insufficient creation fee");
    });

    it("Should reject invalid market duration", async function () {
      // Too short duration
      await expect(
        overunder.connect(user1).createBet(
          "Test question",
          "Test description",
          ["Yes", "No"],
          await getFutureTimestamp(0.5), // 30 minutes
          "Test",
          { value: creationFee }
        )
      ).to.be.revertedWithCustomError(overunder, "InvalidMarketDuration");
    });
  });

  describe("Betting and LP Separation Tests", function () {
    let betId: number;

    beforeEach(async function () {
      const tx = await overunder.connect(user1).createBet(
        "Test Market",
        "Test Description",
        ["Option A", "Option B"],
        await getFutureTimestamp(2),
        "Test",
        { value: creationFee }
      );
      betId = 1;
    });

    it("Should place wagers correctly and separate from LP positions", async function () {
      const wagerAmount = ethers.parseEther("0.1");
      const optionChosen = 0;

      // Calculate expected LP fee and net wager
      const lpFee = (wagerAmount * BigInt(50)) / BigInt(10000); // 0.5%
      const netWager = wagerAmount - lpFee;

      const tx = await overunder.connect(user2).placeWager(betId, optionChosen, { value: wagerAmount });

      await expect(tx)
        .to.emit(overunder, "WagerPlaced")
        .withArgs(betId, user2.address, optionChosen, netWager);

      // Check that bettor position is updated correctly
      expect(await overunder.getBettorPosition(betId, user2.address, optionChosen)).to.equal(netWager);
      expect(await overunder.getBettorPosition(betId, user2.address, 1)).to.equal(0);
      
      // Check that LP position is still 0 for bettor
      expect(await overunder.getLPPosition(betId, user2.address, optionChosen)).to.equal(0);
      
      // Check that LP fees are accrued
      expect(await overunder.getAccruedFees(betId)).to.equal(lpFee);
    });

    it("Should allow additional LP to provide balanced liquidity", async function () {
      const liquidityAmount = ethers.parseEther("0.02");
      
      const tx = await overunder.connect(user2).provideLiquidity(betId, { value: liquidityAmount });

      await expect(tx)
        .to.emit(overunder, "LiquidityProvided");

      // Check balanced liquidity distribution
      const perOption = liquidityAmount / BigInt(2);
      expect(await overunder.getLPPosition(betId, user2.address, 0)).to.equal(perOption);
      expect(await overunder.getLPPosition(betId, user2.address, 1)).to.equal(perOption);

      // Check bettor positions remain 0 for LP
      expect(await overunder.getBettorPosition(betId, user2.address, 0)).to.equal(0);
      expect(await overunder.getBettorPosition(betId, user2.address, 1)).to.equal(0);
    });

    it("Should prevent LPs from using claim winnings", async function () {
      // Place a bet and resolve
      await overunder.connect(user2).placeWager(betId, 0, { value: minimumBetAmount });
      await time.increase(7200); // Move past deadline
      await overunder.connect(user1).resolveBet(betId, 0);

      // LP (user1) should not be able to use claimWinnings
      await expect(
        overunder.connect(user1).claimWinnings(betId)
      ).to.be.revertedWithCustomError(overunder, "LPMustUseLiquidityFunctions");
    });
  });

  describe("Market Resolution Tests", function () {
    let betId: number;

    beforeEach(async function () {
      const tx = await overunder.connect(user1).createBet(
        "Test Market",
        "Test Description",
        ["Option A", "Option B"],
        await getFutureTimestamp(2),
        "Test",
        { value: creationFee }
      );
      betId = 1;
    });

    it("Should detect LP-only markets correctly", async function () {
      // Market with only LP liquidity (no bets)
      expect(await overunder.hasActualBets(betId)).to.equal(false);

      // Add a bet to make it imbalanced
      await overunder.connect(user2).placeWager(betId, 0, { value: minimumBetAmount });
      
      expect(await overunder.hasActualBets(betId)).to.equal(true);
    });

    it("Should prevent resolving LP-only markets to specific outcomes", async function () {
      await time.increase(7200); // Move past deadline

      // Try to resolve LP-only market to specific outcome
      await expect(
        overunder.connect(user1).resolveBet(betId, 0)
      ).to.be.revertedWithCustomError(overunder, "NoActualBetsPlaced");
    });

    it("Should allow no contest resolution for LP-only markets", async function () {
      await time.increase(7200); // Move past deadline

      const tx = await overunder.connect(user1).resolveBet(betId, ethers.MaxUint256);

      await expect(tx)
        .to.emit(overunder, "BetResolved")
        .withArgs(betId, ethers.MaxUint256, creationFee);

      const bet = await overunder.getBet(betId);
      expect(bet.isResolved).to.equal(true);
      expect(bet.resolvedOutcome).to.equal(ethers.MaxUint256);
    });

    it("Should provide correct market resolution status", async function () {
      // Before deadline
      let status = await overunder.getMarketResolutionStatus(betId);
      expect(status.canResolve).to.equal(false);
      expect(status.statusMessage).to.equal("Market still active");

      // After deadline, LP-only
      await time.increase(7200);
      status = await overunder.getMarketResolutionStatus(betId);
      expect(status.canResolve).to.equal(true);
      expect(status.hasActualBetting).to.equal(false);
      expect(status.requiresNoContest).to.equal(true);
      expect(status.statusMessage).to.equal("No bets placed - use no contest resolution");

      // With actual bets
      await overunder.connect(user2).placeWager(betId, 0, { value: minimumBetAmount });
      status = await overunder.getMarketResolutionStatus(betId);
      expect(status.hasActualBetting).to.equal(true);
      expect(status.requiresNoContest).to.equal(false);
    });
  });

  describe("Claiming and LP Removal Tests", function () {
    let betId: number;

    beforeEach(async function () {
      const tx = await overunder.connect(user1).createBet(
        "Test Market",
        "Test Description",
        ["Option A", "Option B"],
        await getFutureTimestamp(2),
        "Test",
        { value: creationFee }
      );
      betId = 1;

      // Add some bets
      await overunder.connect(user2).placeWager(betId, 0, { value: ethers.parseEther("0.1") });
      await overunder.connect(user3).placeWager(betId, 1, { value: ethers.parseEther("0.05") });
      
      // Move past deadline and resolve
      await time.increase(7200);
      await overunder.connect(user1).resolveBet(betId, 0); // Option A wins
    });

    it("Should calculate winnings correctly for normal resolution", async function () {
      const initialBalance = await ethers.provider.getBalance(user2.address);
      
      const tx = await overunder.connect(user2).claimWinnings(betId);
      
      await expect(tx)
        .to.emit(overunder, "WinningsClaimed");

      // Check balance increased (accounting for gas)
      const finalBalance = await ethers.provider.getBalance(user2.address);
      expect(finalBalance).to.be.gt(initialBalance);
    });

    it("Should allow LP removal after resolution", async function () {
      const lpShares = await overunder.getUserLPShares(betId, user1.address);
      
      await expect(
        overunder.connect(user1).removeLiquidity(betId, lpShares)
      ).to.emit(overunder, "LiquidityRemoved");

      // Check LP shares are reduced
      expect(await overunder.getUserLPShares(betId, user1.address)).to.equal(0);
    });

    it("Should handle no contest resolution correctly", async function () {
      // Create new market for no contest test
      const newTx = await overunder.connect(user1).createBet(
        "No Contest Market",
        "Test Description",
        ["Yes", "No"],
        await getFutureTimestamp(2),
        "Test",
        { value: creationFee }
      );
      const noContestBetId = 2;

      // Place bets on multiple options
      const stake1 = ethers.parseEther("0.1");
      await overunder.connect(user2).placeWager(noContestBetId, 0, { value: stake1 });

      // Move past deadline and resolve as no contest
      await time.increase(7200);
      await overunder.connect(user1).resolveBet(noContestBetId, ethers.MaxUint256);

      // Claim should return original stake minus LP fees
      const lpFeeRate = BigInt(50); // 0.5%
      const lpFee = (stake1 * lpFeeRate) / BigInt(10000);
      const expectedRefund = stake1 - lpFee;

      await expect(
        overunder.connect(user2).claimWinnings(noContestBetId)
      ).to.emit(overunder, "WinningsClaimed")
       .withArgs(noContestBetId, user2.address, expectedRefund);
    });
  });

  describe("Division by Zero Protection Tests", function () {
    
    it("Should handle edge case in provideLiquidity when totalLiquidity is 0", async function () {
      // Create market and remove all liquidity
      const tx = await overunder.connect(user1).createBet(
        "Edge Case Market",
        "Test Description",
        ["Yes", "No"],
        await getFutureTimestamp(2),
        "Test",
        { value: creationFee }
      );
      const betId = 1;

      // Remove all existing liquidity
      await overunder.connect(user1).removeLiquidity(betId, creationFee);

      // Try to provide liquidity when totalLPShares is 0
      const liquidityAmount = ethers.parseEther("0.02");
      
      // This should work - when totalLPShares is 0, it should mint shares equal to liquidity amount
      await expect(
        overunder.connect(user2).provideLiquidity(betId, { value: liquidityAmount })
      ).to.not.be.reverted;

      expect(await overunder.getUserLPShares(betId, user2.address)).to.equal(liquidityAmount);
    });
  });

  describe("Security Edge Cases", function () {
    
    it("Should prevent double claiming", async function () {
      const tx = await overunder.connect(user1).createBet(
        "Double Claim Test",
        "Test Description",
        ["Yes", "No"],
        await getFutureTimestamp(2),
        "Test",
        { value: creationFee }
      );
      const betId = 1;

      await overunder.connect(user2).placeWager(betId, 0, { value: minimumBetAmount });
      await time.increase(7200);
      await overunder.connect(user1).resolveBet(betId, 0);

      // First claim should work
      await overunder.connect(user2).claimWinnings(betId);
      
      // Second claim should fail
      await expect(
        overunder.connect(user2).claimWinnings(betId)
      ).to.be.revertedWithCustomError(overunder, "AlreadyClaimed");
    });

    it("Should prevent claiming with no winning position", async function () {
      const tx = await overunder.connect(user1).createBet(
        "No Win Test",
        "Test Description",
        ["Yes", "No"],
        await getFutureTimestamp(2),
        "Test",
        { value: creationFee }
      );
      const betId = 1;

      await overunder.connect(user2).placeWager(betId, 0, { value: minimumBetAmount });
      await overunder.connect(user3).placeWager(betId, 1, { value: minimumBetAmount });
      await time.increase(7200);
      await overunder.connect(user1).resolveBet(betId, 0); // Option 0 wins

      // user3 bet on losing option
      await expect(
        overunder.connect(user3).claimWinnings(betId)
      ).to.be.revertedWithCustomError(overunder, "NothingToClaim");
    });
  });
});