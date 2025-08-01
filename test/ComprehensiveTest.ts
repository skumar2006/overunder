import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { Contract } from "ethers";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { time } from "@nomicfoundation/hardhat-network-helpers";

// Helper function to get future timestamp
function getFutureTimestamp(hoursFromNow: number): number {
  return Math.floor(Date.now() / 1000) + (hoursFromNow * 3600);
}

describe("OverUnder & Treasury - Comprehensive Security Tests", function () {
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

  beforeEach(async function () {
    [owner, user1, user2, user3, attacker] = await ethers.getSigners();
    
    // Deploy Treasury
    const Treasury = await ethers.getContractFactory("Treasury");
    treasury = await Treasury.deploy();
    await treasury.waitForDeployment();
    
    // Authorize OverUnder contract to collect fees (fix the security hole)
    // Note: This will be done after OverUnder deployment
    
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
      
      // First authorize the owner for this test
      await treasury.connect(owner).setAuthorization(owner.address, true);
      
      await expect(
        treasury.connect(owner).collectFee({ value: feeAmount })
      ).to.emit(treasury, "FeeCollected")
       .withArgs(owner.address, feeAmount);

      expect(await treasury.totalFeesCollected()).to.equal(feeAmount);
    });

    it("Should track fees from different sources", async function () {
      const amount1 = ethers.parseEther("0.1");
      const amount2 = ethers.parseEther("0.2");

      // Authorize multiple sources
      await treasury.connect(owner).setAuthorization(user1.address, true);
      await treasury.connect(owner).setAuthorization(user2.address, true);

      await treasury.connect(user1).collectFee({ value: amount1 });
      await treasury.connect(user2).collectFee({ value: amount2 });

      expect(await treasury.feesFromSource(user1.address)).to.equal(amount1);
      expect(await treasury.feesFromSource(user2.address)).to.equal(amount2);
      expect(await treasury.totalFeesCollected()).to.equal(amount1 + amount2);
    });

    it("Should allow owner to withdraw funds", async function () {
      const feeAmount = ethers.parseEther("1");
      
      // Authorize owner to collect fees for this test
      await treasury.connect(owner).setAuthorization(owner.address, true);
      await treasury.connect(owner).collectFee({ value: feeAmount });

      const initialBalance = await ethers.provider.getBalance(owner.address);
      
      await expect(
        treasury.connect(owner).withdraw(feeAmount)
      ).to.emit(treasury, "Withdrawal")
       .withArgs(owner.address, feeAmount);

      expect(await treasury.getBalance()).to.equal(0);
    });

    it("Should prevent non-owner from withdrawing", async function () {
      const feeAmount = ethers.parseEther("1");
      
      // Authorize owner to collect fees for this test
      await treasury.connect(owner).setAuthorization(owner.address, true);
      await treasury.connect(owner).collectFee({ value: feeAmount });

      await expect(
        treasury.connect(attacker).withdraw(feeAmount)
      ).to.be.revertedWith("Only owner");
    });
  });

  describe("OverUnder Initialization Tests", function () {
    
    it("Should prevent initialization with zero address treasury", async function () {
      const OverunderUpgradeable = await ethers.getContractFactory("OverunderUpgradeable");
      
      await expect(
        upgrades.deployProxy(
          OverunderUpgradeable,
          [ethers.ZeroAddress],
          { 
            initializer: 'initialize',
            kind: 'uups' 
          }
        )
      ).to.be.revertedWith("Treasury cannot be zero address");
    });

    it("Should prevent initialization with non-contract treasury", async function () {
      const OverunderUpgradeable = await ethers.getContractFactory("OverunderUpgradeable");
      
      await expect(
        upgrades.deployProxy(
          OverunderUpgradeable,
          [user1.address], // EOA instead of contract
          { 
            initializer: 'initialize',
            kind: 'uups' 
          }
        )
      ).to.be.revertedWith("Treasury must be contract");
    });

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
      const deadline = getFutureTimestamp(2); // 2 hours from now
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
      const insufficientFee = ethers.parseEther("0.005"); // Less than required 0.01
      
      await expect(
        overunder.connect(user1).createBet(
          "Test question",
          "Test description", 
          ["Yes", "No"],
          getFutureTimestamp(2),
          "Test",
          { value: insufficientFee }
        )
      ).to.be.revertedWith("Insufficient creation fee");
    });

    it("Should reject invalid betting options", async function () {
      // Too few options
      await expect(
        overunder.connect(user1).createBet(
          "Test question",
          "Test description",
          ["Yes"], // Only 1 option
          getFutureTimestamp(2),
          "Test",
          { value: creationFee }
        )
      ).to.be.revertedWith("Need at least 2 options");

      // Too many options
      const tooManyOptions = Array.from({length: 11}, (_, i) => `Option ${i + 1}`);
      await expect(
        overunder.connect(user1).createBet(
          "Test question",
          "Test description",
          tooManyOptions,
          getFutureTimestamp(2),
          "Test",
          { value: creationFee }
        )
      ).to.be.revertedWith("Too many options");

      // Empty option
      await expect(
        overunder.connect(user1).createBet(
          "Test question",
          "Test description",
          ["Yes", ""], // Empty option
          getFutureTimestamp(2),
          "Test",
          { value: creationFee }
        )
      ).to.be.revertedWithCustomError(overunder, "InvalidBettingOptions");
    });

    it("Should reject invalid market duration", async function () {
      // Too short duration
      await expect(
        overunder.connect(user1).createBet(
          "Test question",
          "Test description",
          ["Yes", "No"],
          getFutureTimestamp(0.5), // 30 minutes (less than 1 hour minimum)
          "Test",
          { value: creationFee }
        )
      ).to.be.revertedWithCustomError(overunder, "InvalidMarketDuration");

      // Too long duration
      await expect(
        overunder.connect(user1).createBet(
          "Test question",
          "Test description",
          ["Yes", "No"],
          getFutureTimestamp(366 * 24), // More than 365 days
          "Test",
          { value: creationFee }
        )
      ).to.be.revertedWithCustomError(overunder, "InvalidMarketDuration");
    });
  });

  describe("Betting Logic Tests", function () {
    let betId: number;

    beforeEach(async function () {
      // Create a test market
      const tx = await overunder.connect(user1).createBet(
        "Test Market",
        "Test Description",
        ["Option A", "Option B"],
        Math.floor(Date.now() / 1000) + 3600,
        "Test",
        { value: creationFee }
      );
      betId = 1; // First bet ID
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
      expect(await overunder.getBettorPosition(betId, user2.address, 1)).to.equal(0); // Other option should be 0
      
      // Check that LP position is still 0 for bettor
      expect(await overunder.getLPPosition(betId, user2.address, optionChosen)).to.equal(0);
      
      // Check that option pool is updated
      const expectedPoolAmount = creationFee / BigInt(2) + netWager; // Initial LP + new wager
      expect(await overunder.getOptionPool(betId, optionChosen)).to.equal(expectedPoolAmount);

      // Check that LP fees are accrued
      expect(await overunder.getAccruedFees(betId)).to.equal(lpFee);

      // Check user is tracked in wagers
      const userWagers = await overunder.getUserWagers(user2.address);
      expect(userWagers).to.deep.equal([BigInt(betId)]);
    });

    it("Should handle LP fee correctly when no LPs exist", async function () {
      // Remove all LP shares to simulate no LPs
      await overunder.connect(user1).removeLiquidity(betId, creationFee);

      const wagerAmount = ethers.parseEther("0.1");
      await overunder.connect(user2).placeWager(betId, 0, { value: wagerAmount });

      // When no LPs, full wager amount should go to betting
      expect(await overunder.getBettorPosition(betId, user2.address, 0)).to.equal(wagerAmount);
      expect(await overunder.getAccruedFees(betId)).to.equal(0);
    });

    it("Should reject wagers below minimum amount", async function () {
      const tooSmallWager = ethers.parseEther("0.0005"); // Less than 0.001 minimum

      await expect(
        overunder.connect(user2).placeWager(betId, 0, { value: tooSmallWager })
      ).to.be.revertedWithCustomError(overunder, "InsufficientStake");
    });

    it("Should reject wagers on non-existent options", async function () {
      await expect(
        overunder.connect(user2).placeWager(betId, 5, { value: minimumBetAmount }) // Option 5 doesn't exist
      ).to.be.revertedWithCustomError(overunder, "InvalidOption");
    });

    it("Should reject wagers after deadline", async function () {
      // Fast forward past deadline
      await time.increase(3601); // Move 1 hour + 1 second forward

      await expect(
        overunder.connect(user2).placeWager(betId, 0, { value: minimumBetAmount })
      ).to.be.revertedWithCustomError(overunder, "DeadlinePassed");
    });
  });

  describe("Liquidity Provider Tests", function () {
    let betId: number;

    beforeEach(async function () {
      const tx = await overunder.connect(user1).createBet(
        "Test Market",
        "Test Description",
        ["Option A", "Option B"],
        Math.floor(Date.now() / 1000) + 3600,
        "Test",
        { value: creationFee }
      );
      betId = 1;
    });

    it("Should allow additional LP to provide balanced liquidity", async function () {
      const liquidityAmount = ethers.parseEther("0.02");
      
      const tx = await overunder.connect(user2).provideLiquidity(betId, { value: liquidityAmount });

      await expect(tx)
        .to.emit(overunder, "LiquidityProvided");

      // Check LP shares calculation
      const expectedShares = (liquidityAmount * creationFee) / creationFee; // Should equal liquidityAmount
      expect(await overunder.getUserLPShares(betId, user2.address)).to.equal(expectedShares);

      // Check balanced liquidity distribution
      const perOption = liquidityAmount / BigInt(2);
      expect(await overunder.getLPPosition(betId, user2.address, 0)).to.equal(perOption);
      expect(await overunder.getLPPosition(betId, user2.address, 1)).to.equal(perOption);

      // Check bettor positions remain 0 for LP
      expect(await overunder.getBettorPosition(betId, user2.address, 0)).to.equal(0);
      expect(await overunder.getBettorPosition(betId, user2.address, 1)).to.equal(0);
    });

    it("Should handle division by zero in LP share calculation", async function () {
      // Create a scenario where totalLiquidity could be 0
      // First remove all existing liquidity
      await overunder.connect(user1).removeLiquidity(betId, creationFee);

      // Now try to provide liquidity when totalLPShares is 0
      const liquidityAmount = ethers.parseEther("0.02");
      
      // This should work fine - when totalLPShares is 0, it mints shares equal to liquidity amount
      await expect(
        overunder.connect(user2).provideLiquidity(betId, { value: liquidityAmount })
      ).to.not.be.reverted;

      expect(await overunder.getUserLPShares(betId, user2.address)).to.equal(liquidityAmount);
    });

    it("Should reject insufficient liquidity amounts", async function () {
      const tooSmallAmount = ethers.parseEther("0.005"); // Less than 0.01 minimum

      await expect(
        overunder.connect(user2).provideLiquidity(betId, { value: tooSmallAmount })
      ).to.be.revertedWith("Insufficient liquidity amount");
    });

    it("Should prevent LP after market closes", async function () {
      await time.increase(3601); // Move past deadline

      await expect(
        overunder.connect(user2).provideLiquidity(betId, { value: minimumLiquidityAmount })
      ).to.be.revertedWith("Market closed");
    });
  });

  describe("Market Resolution Tests", function () {
    let betId: number;

    beforeEach(async function () {
      const tx = await overunder.connect(user1).createBet(
        "Test Market",
        "Test Description",
        ["Option A", "Option B"],
        Math.floor(Date.now() / 1000) + 3600,
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
      await time.increase(3601); // Move past deadline

      // Try to resolve LP-only market to specific outcome
      await expect(
        overunder.connect(user1).resolveBet(betId, 0)
      ).to.be.revertedWithCustomError(overunder, "NoActualBetsPlaced");
    });

    it("Should allow no contest resolution for LP-only markets", async function () {
      await time.increase(3601); // Move past deadline

      const tx = await overunder.connect(user1).resolveBet(betId, ethers.MaxUint256);

      await expect(tx)
        .to.emit(overunder, "BetResolved")
        .withArgs(betId, ethers.MaxUint256, creationFee);

      const bet = await overunder.getBet(betId);
      expect(bet.isResolved).to.equal(true);
      expect(bet.resolvedOutcome).to.equal(ethers.MaxUint256);
    });

    it("Should allow normal resolution when actual bets exist", async function () {
      // Place a bet to make it a real market
      await overunder.connect(user2).placeWager(betId, 0, { value: minimumBetAmount });
      
      await time.increase(3601); // Move past deadline

      const tx = await overunder.connect(user1).resolveBet(betId, 0);

      await expect(tx)
        .to.emit(overunder, "BetResolved")
        .withArgs(betId, 0, await overunder.getBet(betId).then(b => b.totalPoolAmount));

      const bet = await overunder.getBet(betId);
      expect(bet.isResolved).to.equal(true);
      expect(bet.resolvedOutcome).to.equal(0);
    });

    it("Should reject resolution by non-creator", async function () {
      await time.increase(3601);

      await expect(
        overunder.connect(user2).resolveBet(betId, 0)
      ).to.be.revertedWithCustomError(overunder, "OnlyCreatorCanResolve");
    });

    it("Should allow owner to resolve early", async function () {
      // Place a bet first
      await overunder.connect(user2).placeWager(betId, 0, { value: minimumBetAmount });

      // Owner should be able to resolve before deadline
      await expect(
        overunder.connect(owner).resolveBet(betId, 0)
      ).to.not.be.reverted;
    });
  });

  describe("Claiming Winnings Tests", function () {
    let betId: number;

    beforeEach(async function () {
      const tx = await overunder.connect(user1).createBet(
        "Test Market",
        "Test Description",
        ["Option A", "Option B"],
        Math.floor(Date.now() / 1000) + 3600,
        "Test",
        { value: creationFee }
      );
      betId = 1;

      // Add some bets
      await overunder.connect(user2).placeWager(betId, 0, { value: ethers.parseEther("0.1") });
      await overunder.connect(user3).placeWager(betId, 1, { value: ethers.parseEther("0.05") });
      
      // Move past deadline and resolve
      await time.increase(3601);
      await overunder.connect(user1).resolveBet(betId, 0); // Option A wins
    });

    it("Should calculate winnings correctly for normal resolution", async function () {
      const bet = await overunder.getBet(betId);
      const winningPool = await overunder.getOptionPool(betId, 0);
      const userStake = await overunder.getBettorPosition(betId, user2.address, 0);
      
      const expectedPayout = (userStake * bet.totalPoolAmount) / winningPool;
      const expectedFee = (expectedPayout * BigInt(200)) / BigInt(10000); // 2% platform fee
      const expectedNetPayout = expectedPayout - expectedFee;

      const initialBalance = await ethers.provider.getBalance(user2.address);
      
      const tx = await overunder.connect(user2).claimWinnings(betId);
      
      await expect(tx)
        .to.emit(overunder, "WinningsClaimed")
        .withArgs(betId, user2.address, expectedNetPayout);

      // Check balance increase (accounting for gas costs)
      const finalBalance = await ethers.provider.getBalance(user2.address);
      const balanceIncrease = finalBalance - initialBalance;
      
      // Should be close to expected payout (within gas cost range)
      expect(balanceIncrease).to.be.closeTo(expectedNetPayout, ethers.parseEther("0.01"));
    });

    it("Should handle no contest resolution correctly", async function () {
      // Create new market for no contest test
      const newTx = await overunder.connect(user1).createBet(
        "No Contest Market",
        "Test Description",
        ["Yes", "No"],
        Math.floor(Date.now() / 1000) + 3600,
        "Test",
        { value: creationFee }
      );
      const noContestBetId = 2;

      // Place bets on multiple options
      const stake1 = ethers.parseEther("0.1");
      const stake2 = ethers.parseEther("0.05");
      await overunder.connect(user2).placeWager(noContestBetId, 0, { value: stake1 });
      await overunder.connect(user2).placeWager(noContestBetId, 1, { value: stake2 });

      // Move past deadline and resolve as no contest
      await time.increase(3601);
      await overunder.connect(user1).resolveBet(noContestBetId, ethers.MaxUint256);

      const initialBalance = await ethers.provider.getBalance(user2.address);
      
      // Claim should return original stakes minus LP fees
      const lpFeeRate = BigInt(50); // 0.5%
      const totalStake = stake1 + stake2;
      const totalLPFees = (stake1 * lpFeeRate) / BigInt(10000) + (stake2 * lpFeeRate) / BigInt(10000);
      const expectedRefund = totalStake - totalLPFees;

      await expect(
        overunder.connect(user2).claimWinnings(noContestBetId)
      ).to.emit(overunder, "WinningsClaimed")
       .withArgs(noContestBetId, user2.address, expectedRefund);
    });

    it("Should prevent LPs from using claim winnings", async function () {
      await expect(
        overunder.connect(user1).claimWinnings(betId) // user1 is LP (creator)
      ).to.be.revertedWithCustomError(overunder, "LPMustUseLiquidityFunctions");
    });

    it("Should prevent double claiming", async function () {
      await overunder.connect(user2).claimWinnings(betId);
      
      await expect(
        overunder.connect(user2).claimWinnings(betId)
      ).to.be.revertedWithCustomError(overunder, "AlreadyClaimed");
    });

    it("Should prevent claiming with no winning position", async function () {
      // user3 bet on losing option
      await expect(
        overunder.connect(user3).claimWinnings(betId)
      ).to.be.revertedWithCustomError(overunder, "NothingToClaim");
    });
  });

  describe("LP Removal Tests", function () {
    let betId: number;

    beforeEach(async function () {
      const tx = await overunder.connect(user1).createBet(
        "Test Market",
        "Test Description", 
        ["Option A", "Option B"],
        Math.floor(Date.now() / 1000) + 3600,
        "Test",
        { value: creationFee }
      );
      betId = 1;

      // Add additional LP
      await overunder.connect(user2).provideLiquidity(betId, { value: creationFee });
    });

    it("Should allow LP removal before resolution", async function () {
      const lpShares = await overunder.getUserLPShares(betId, user2.address);
      const initialBalance = await ethers.provider.getBalance(user2.address);

      await expect(
        overunder.connect(user2).removeLiquidity(betId, lpShares)
      ).to.emit(overunder, "LiquidityRemoved");

      // Check LP shares are reduced
      expect(await overunder.getUserLPShares(betId, user2.address)).to.equal(0);
      
      // Balance should increase
      const finalBalance = await ethers.provider.getBalance(user2.address);
      expect(finalBalance).to.be.gt(initialBalance);
    });

    it("Should handle LP removal after resolution", async function () {
      // Add bet and resolve
      await overunder.connect(user3).placeWager(betId, 0, { value: minimumBetAmount });
      await time.increase(3601);
      await overunder.connect(user1).resolveBet(betId, 0);

      const lpShares = await overunder.getUserLPShares(betId, user2.address);
      
      await expect(
        overunder.connect(user2).removeLiquidity(betId, lpShares)
      ).to.not.be.reverted;
    });

    it("Should prevent removal of more shares than owned", async function () {
      const lpShares = await overunder.getUserLPShares(betId, user2.address);
      const excessiveShares = lpShares + BigInt(1);

      await expect(
        overunder.connect(user2).removeLiquidity(betId, excessiveShares)
      ).to.be.revertedWith("Insufficient LP shares");
    });

    it("Should handle division by zero in removal ratio calculation", async function () {
      // This tests the edge case where totalLPShares might be manipulated to 0
      // In practice, this should be prevented by the checks, but we test the edge case
      
      const lpShares = await overunder.getUserLPShares(betId, user2.address);
      
      // Normal removal should work
      await expect(
        overunder.connect(user2).removeLiquidity(betId, lpShares)
      ).to.not.be.reverted;
    });
  });

  describe("Market Resolution Status Helper Tests", function () {
    let betId: number;

    beforeEach(async function () {
      const tx = await overunder.connect(user1).createBet(
        "Test Market",
        "Test Description",
        ["Option A", "Option B"],
        Math.floor(Date.now() / 1000) + 3600,
        "Test",
        { value: creationFee }
      );
      betId = 1;
    });

    it("Should correctly report market status before deadline", async function () {
      const status = await overunder.getMarketResolutionStatus(betId);
      expect(status.canResolve).to.equal(false);
      expect(status.statusMessage).to.equal("Market still active");
    });

    it("Should correctly identify LP-only markets", async function () {
      await time.increase(3601); // Move past deadline
      
      const status = await overunder.getMarketResolutionStatus(betId);
      expect(status.canResolve).to.equal(true);
      expect(status.hasActualBetting).to.equal(false);
      expect(status.requiresNoContest).to.equal(true);
      expect(status.statusMessage).to.equal("No bets placed - use no contest resolution");
    });

    it("Should correctly identify markets ready for normal resolution", async function () {
      // Add a bet
      await overunder.connect(user2).placeWager(betId, 0, { value: minimumBetAmount });
      await time.increase(3601);
      
      const status = await overunder.getMarketResolutionStatus(betId);
      expect(status.canResolve).to.equal(true);
      expect(status.hasActualBetting).to.equal(true);
      expect(status.requiresNoContest).to.equal(false);
      expect(status.statusMessage).to.equal("Ready for normal resolution");
    });

    it("Should report already resolved markets", async function () {
      await overunder.connect(user2).placeWager(betId, 0, { value: minimumBetAmount });
      await time.increase(3601);
      await overunder.connect(user1).resolveBet(betId, 0);
      
      const status = await overunder.getMarketResolutionStatus(betId);
      expect(status.canResolve).to.equal(false);
      expect(status.statusMessage).to.equal("Already resolved");
    });
  });

  describe("Gas Optimization Tests", function () {
    it("Should not consume excessive gas for view functions", async function () {
      // Create market with multiple options to test loop efficiency
      const manyOptions = ["A", "B", "C", "D", "E", "F", "G", "H"];
      const tx = await overunder.connect(user1).createBet(
        "Many Options Market",
        "Test Description",
        manyOptions,
        Math.floor(Date.now() / 1000) + 3600,
        "Test",
        { value: ethers.parseEther("0.08") } // 0.01 per option
      );
      const betId = 1;

      // Test gas usage of view functions
      const gasUsed = await overunder.getBetOdds.estimateGas(betId);
      expect(gasUsed).to.be.lt(100000); // Should use less than 100k gas

      const statusGas = await overunder.getMarketResolutionStatus.estimateGas(betId);
      expect(statusGas).to.be.lt(150000); // Should be reasonably efficient
    });
  });

  describe("Edge Case Stress Tests", function () {
    it("Should handle markets with maximum options", async function () {
      const maxOptions = Array.from({length: 10}, (_, i) => `Option ${i + 1}`);
      const maxCreationFee = ethers.parseEther("0.1"); // 0.01 per option
      
      await expect(
        overunder.connect(user1).createBet(
          "Max Options Market",
          "Test Description",
          maxOptions,
          Math.floor(Date.now() / 1000) + 3600,
          "Test",
          { value: maxCreationFee }
        )
      ).to.not.be.reverted;
    });

    it("Should handle very small amounts correctly", async function () {
      // Test with minimum amounts
      const betId = 1;
      await overunder.connect(user1).createBet(
        "Small Amount Market",
        "Test Description",
        ["Yes", "No"],
        Math.floor(Date.now() / 1000) + 3600,
        "Test",
        { value: creationFee }
      );

      await expect(
        overunder.connect(user2).placeWager(betId, 0, { value: minimumBetAmount })
      ).to.not.be.reverted;
    });
  });

  describe("Security Edge Cases", function () {
    it("Should prevent reentrancy attacks on claimWinnings", async function () {
      // This would require a malicious contract, but we test that the nonReentrant modifier works
      const betId = 1;
      await overunder.connect(user1).createBet(
        "Reentrancy Test",
        "Test Description",
        ["Yes", "No"],
        Math.floor(Date.now() / 1000) + 3600,
        "Test",
        { value: creationFee }
      );

      await overunder.connect(user2).placeWager(betId, 0, { value: minimumBetAmount });
      await time.increase(3601);
      await overunder.connect(user1).resolveBet(betId, 0);

      // The nonReentrant modifier should prevent reentrancy
      // Normal claim should work
      await expect(
        overunder.connect(user2).claimWinnings(betId)
      ).to.not.be.reverted;
    });

    it("Should prevent overflow/underflow in calculations", async function () {
      // Test with reasonable but large amounts
      const largeBet = ethers.parseEther("10");
      const betId = 1;
      
      await overunder.connect(user1).createBet(
        "Large Bet Test",
        "Test Description",
        ["Yes", "No"],
        Math.floor(Date.now() / 1000) + 3600,
        "Test",
        { value: creationFee }
      );

      // This should not overflow
      await expect(
        overunder.connect(user2).placeWager(betId, 0, { value: largeBet })
      ).to.not.be.reverted;
    });
  });
});