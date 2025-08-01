// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "./Treasury.sol";

/**
 * @title OverUnder Betting Platform (Upgradeable V2)
 * @dev Centralized betting platform with balanced liquidity and UUPS proxy pattern
 * @author OverUnder Protocol
 */
contract OverunderUpgradeable is 
    Initializable, 
    UUPSUpgradeable, 
    OwnableUpgradeable, 
    ReentrancyGuardUpgradeable 
{
    struct UserProfile {
        string username;
        uint256 totalBets;
        uint256 totalWinnings;
        uint256 winRate; // Basis points (10000 = 100%)
        uint256 reputation; // Reputation score
        bool isActive;
    }

    // 1. Bets (Basic Info + Financials)
    struct Bet {
        uint256 betId;
        address creator;
        uint256 stakeAmount;
        string[] bettingOptions; // e.g., ["over", "under"] or ["yes", "no"]
        uint256 deadlineTimestamp;
        uint256 resolutionTimestamp;
        uint256 resolvedOutcome; // Index of winning option (0, 1, etc.)
        bool isResolved;
        string question;
        string description;
        string category;
        uint256 createdAt;
        uint256 totalPoolAmount; // Total amount wagered across all options
    }

    // 2. Wagers
    struct Wager {
        address bettor;
        uint256 betId;
        uint256 optionChosen; // Index of the chosen option
        uint256 amountStaked;
        uint256 timestamp;
        bool claimed; // Whether winnings have been claimed
    }

    // Core state variables
    Treasury public treasury;
    uint256 public protocolVersion;
    bool public emergencyPaused;
    
    mapping(address => UserProfile) public userProfiles;
    mapping(address => bool) public blacklistedUsers;
    uint256 public minMarketDuration;
    uint256 public maxMarketDuration;
    
    // Centralized bet and wager storage
    uint256 public nextBetId;
    mapping(uint256 => Bet) public bets;
    mapping(uint256 => Wager[]) public betWagers; // betId -> array of wagers
    mapping(address => uint256[]) public userBets; // user -> array of bet IDs they created
    mapping(address => uint256[]) public userWagers; // user -> array of bet IDs they wagered on
    uint256[] public allBetIds;
    
    // Option pools: betId -> optionIndex -> total amount staked on that option
    mapping(uint256 => mapping(uint256 => uint256)) public optionPools;
    
    // Bettor positions: betId -> user -> optionIndex -> amount staked (only for directional bets)
    mapping(uint256 => mapping(address => mapping(uint256 => uint256))) public bettorPositions;
    
    // LP positions: betId -> user -> optionIndex -> liquidity provided (balanced across options)
    mapping(uint256 => mapping(address => mapping(uint256 => uint256))) public lpPositions;
    
    // LP system for market makers
    mapping(uint256 => uint256) public totalLPShares; // betId -> total LP shares
    mapping(uint256 => mapping(address => uint256)) public userLPShares; // betId -> user -> LP shares
    mapping(uint256 => uint256) public accruedFees; // betId -> total fees collected
    uint256 public lpFeeRate; // Basis points (50 = 0.5%)
    

    // Platform settings
    uint256 public platformFeeRate; // Basis points (200 = 2%)
    uint256 public minimumBetAmount;
    uint256 public minimumLiquidityAmount;
    uint256 public creationFee; // Fee to create a market (becomes initial liquidity)
    
    // Reserve storage slots for future variables
    uint256[30] private __gap;
    
    //per bet claim flag
    mapping(uint256 => mapping(address => bool)) private betClaimed;

    // Events
    event ProfileUpdated(address indexed user, string username);
    event ContractUpgraded(address indexed newImplementation, uint256 newVersion);
    event EmergencyPause(bool paused);
    event UserBlacklisted(address indexed user, bool blacklisted);
    
    // Bet and Wager events
    event BetCreated(
        uint256 indexed betId,
        address indexed creator,
        string question,
        string[] options,
        uint256 deadline,
        uint256 stakeAmount
    );
    event WagerPlaced(
        uint256 indexed betId,
        address indexed bettor,
        uint256 optionChosen,
        uint256 amount
    );
    event BetResolved(
        uint256 indexed betId,
        uint256 winningOption,
        uint256 totalPool
    );
    event WinningsClaimed(
        uint256 indexed betId,
        address indexed winner,
        uint256 amount
    );
    event LiquidityProvided(
        uint256 indexed betId,
        address indexed provider,
        uint256 amount,
        uint256 lpShares
    );
    event LiquidityRemoved(
        uint256 indexed betId,
        address indexed provider,
        uint256 lpShares,
        uint256 amount
    );
    event LPFeesCollected(
        uint256 indexed betId,
        address indexed lpProvider,
        uint256 amount
    );

    // Custom errors
    error ContractPaused();
    error UserBlacklistedError();
    error InvalidMarketDuration();
    error BetNotFound();
    error BetAlreadyResolved();
    error BetNotResolved();
    error DeadlinePassed();
    error InvalidOption();
    error InsufficientStake();
    error OnlyCreatorCanResolve();
    error NothingToClaim();
    error AlreadyClaimed();
    error InvalidBettingOptions();
    error TooEarlyToResolve();
    error LPMustUseLiquidityFunctions();
    error NoActualBetsPlaced();

    modifier notPaused() {
        if (emergencyPaused) revert ContractPaused();
        _;
    }

    modifier notBlacklisted() {
        if (blacklistedUsers[msg.sender]) revert UserBlacklistedError();
        _;
    }

    modifier betExists(uint256 _betId) {
        if (_betId == 0 || _betId >= nextBetId) revert BetNotFound();
        _;
    }

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers(); // Prevent initialization of implementation
    }

    /**
     * @dev Initializer function (replaces constructor for upgradeable contracts)
     */
    function initialize(address _treasury) public initializer {
        __Ownable_init(msg.sender);
        __UUPSUpgradeable_init();
        __ReentrancyGuard_init();
        
        require(_treasury != address(0), "Treasury cannot be zero address");
        require(_treasury.code.length > 0, "Treasury must be contract");
        treasury = Treasury(_treasury);
        protocolVersion = 2; // V2 with centralized betting
        emergencyPaused = false;
        minMarketDuration = 1 hours;
        maxMarketDuration = 365 days;
        nextBetId = 1; // Start bet IDs from 1
        platformFeeRate = 200; // 2%
        minimumBetAmount = 0.001 ether; // 0.001 ETH minimum
        minimumLiquidityAmount = 0.01 ether; // 0.01 ETH minimum liquidity
        lpFeeRate = 50; // 0.5% LP fee
        creationFee = 0.01 ether; // 0.01 ETH creation fee (becomes initial LP stake)
    }

    /**
     * @dev Required by UUPS - only owner can upgrade
     */
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {
        protocolVersion++;
        emit ContractUpgraded(newImplementation, protocolVersion);
    }

    /**
     * @dev Create a new market with creator as neutral liquidity provider
     */
    function createBet(
        string memory _question,
        string memory _description,
        string[] memory _bettingOptions,
        uint256 _deadlineTimestamp,
        string memory _category
    ) external payable nonReentrant notPaused notBlacklisted returns (uint256) {
        require(msg.value >= creationFee, "Insufficient creation fee");
        require(_bettingOptions.length >= 2, "Need at least 2 options");
        require(_bettingOptions.length <= 10, "Too many options");
        
        // Validate bet duration
        uint256 duration = _deadlineTimestamp - block.timestamp;
        if (duration < minMarketDuration || duration > maxMarketDuration) {
            revert InvalidMarketDuration();
        }
        
        // Validate options
        for (uint256 i = 0; i < _bettingOptions.length; i++) {
            if (bytes(_bettingOptions[i]).length == 0) revert InvalidBettingOptions();
        }
        
        uint256 betId = nextBetId++;
        uint256 numOptions = _bettingOptions.length;
        uint256 perOption = msg.value / numOptions;
        
        // Create the bet (creator has no betting position)
        bets[betId] = Bet({
            betId: betId,
            creator: msg.sender,
            stakeAmount: 0, // Creator takes no betting position
            bettingOptions: _bettingOptions,
            deadlineTimestamp: _deadlineTimestamp,
            resolutionTimestamp: 0,
            resolvedOutcome: 0,
            isResolved: false,
            question: _question,
            description: _description,
            category: _category,
            createdAt: block.timestamp,
            totalPoolAmount: msg.value
        });
        
        // Track bet
        allBetIds.push(betId);
        userBets[msg.sender].push(betId);
        
        // Creator becomes initial LP with balanced liquidity (NO BETTING POSITION)
        // This provides liquidity but doesn't favor any outcome
        for (uint256 i = 0; i < numOptions; i++) {
            optionPools[betId][i] = perOption;
            lpPositions[betId][msg.sender][i] = perOption;
            
            // Create LP wager records (not betting positions)
            betWagers[betId].push(Wager({
                bettor: msg.sender,
                betId: betId,
                optionChosen: i,
                amountStaked: perOption,
                timestamp: block.timestamp,
                claimed: false
            }));
        }
        
        // Initialize LP system - creator becomes first LP
        totalLPShares[betId] = msg.value;
        userLPShares[betId][msg.sender] = msg.value;
        
        // Creator is LP, not tracked as wagerer
        
        emit BetCreated(betId, msg.sender, _question, _bettingOptions, _deadlineTimestamp, msg.value);
        emit LiquidityProvided(betId, msg.sender, msg.value, msg.value);
        
        return betId;
    }

    /**
     * @dev Place a wager on an existing bet
     */
    function placeWager(
        uint256 _betId,
        uint256 _optionChosen
    ) external payable nonReentrant notPaused notBlacklisted betExists(_betId) {
        Bet storage bet = bets[_betId];
        
        if (block.timestamp >= bet.deadlineTimestamp) revert DeadlinePassed();
        if (bet.isResolved) revert BetAlreadyResolved();
        if (_optionChosen >= bet.bettingOptions.length) revert InvalidOption();
        if (msg.value < minimumBetAmount) revert InsufficientStake();
        
        // Calculate and collect LP fee
        uint256 lpFee = (msg.value * lpFeeRate) / 10000;
        uint256 netWager = msg.value - lpFee;
        
        if (lpFee > 0 && totalLPShares[_betId] > 0) {
            accruedFees[_betId] += lpFee;
        } else {
            // No LPs yet, add fee back to net wager
            netWager = msg.value;
        }
        
        // Update pools and bettor positions
        optionPools[_betId][_optionChosen] += netWager;
        bettorPositions[_betId][msg.sender][_optionChosen] += netWager;
        bet.totalPoolAmount += netWager;
        
        // Create wager record
        betWagers[_betId].push(Wager({
            bettor: msg.sender,
            betId: _betId,
            optionChosen: _optionChosen,
            amountStaked: netWager,
            timestamp: block.timestamp,
            claimed: false
        }));
        
        // Track user's wagers (only add betId once per user)
        bool userAlreadyWagered = false;
        uint256[] memory userWagersList = userWagers[msg.sender];
        for (uint256 i = 0; i < userWagersList.length; i++) {
            if (userWagersList[i] == _betId) {
                userAlreadyWagered = true;
                break;
            }
        }
        
        if (!userAlreadyWagered) {
            userWagers[msg.sender].push(_betId);
            userProfiles[msg.sender].totalBets++;
        }
        
        emit WagerPlaced(_betId, msg.sender, _optionChosen, netWager);
    }

    /**
     * @dev Check if a market has any actual betting positions (not just LP liquidity)
     */
    function hasActualBets(uint256 _betId) public view betExists(_betId) returns (bool) {
        Bet storage bet = bets[_betId];
        
        // Check all options for any betting positions
        for (uint256 i = 0; i < bet.bettingOptions.length; i++) {
            if (optionPools[_betId][i] > 0) {
                // Check if this option has any betting positions vs just LP liquidity
                // We can determine this by checking if the pool size differs from pure LP distribution
                uint256 expectedLPAmount = 0;
                
                // Calculate expected LP amount for this option based on total LP shares
                if (totalLPShares[_betId] > 0) {
                    // Sum up all LP positions for this option across all LPs
                    // This is a bit expensive but necessary for accuracy
                    
                    // Alternative approach: check if any option has disproportionate amount
                    // compared to what would be expected from balanced LP liquidity
                    uint256 totalLPLiquidity = 0;
                    for (uint256 j = 0; j < bet.bettingOptions.length; j++) {
                        totalLPLiquidity += optionPools[_betId][j];
                    }
                    
                    // If pools are significantly imbalanced, there must be actual bets
                    uint256 expectedPerOption = totalLPLiquidity / bet.bettingOptions.length;
                    uint256 tolerance = expectedPerOption / 100; // 1% tolerance for rounding
                    
                    if (optionPools[_betId][i] > expectedPerOption + tolerance ||
                        optionPools[_betId][i] < expectedPerOption - tolerance) {
                        return true; // Imbalanced pools indicate actual betting
                    }
                }
            }
        }
        
        return false;
    }
    
    /**
     * @dev Resolve a bet (only creator can resolve after deadline)
     * @param _betId The bet ID to resolve
     * @param _winningOption The winning option index (use type(uint256).max for no contest)
     */
    function resolveBet(
        uint256 _betId,
        uint256 _winningOption
    ) external betExists(_betId) {
        Bet storage bet = bets[_betId];
        
        if (msg.sender != bet.creator && msg.sender != owner()) revert OnlyCreatorCanResolve();
        if (bet.isResolved) revert BetAlreadyResolved();
        if (_winningOption != type(uint256).max && _winningOption >= bet.bettingOptions.length) revert InvalidOption();
        if (block.timestamp < bet.deadlineTimestamp && msg.sender != owner()) {
            revert TooEarlyToResolve();
        }
        
        // Check if market has any actual bets
        bool hasRealBets = hasActualBets(_betId);
        
        if (!hasRealBets && _winningOption != type(uint256).max) {
            // Market has only LP liquidity, cannot resolve to specific outcome
            revert NoActualBetsPlaced();
        }
        
        bet.isResolved = true;
        
        if (_winningOption == type(uint256).max) {
            // No contest resolution - special case for markets with no actual bets
            bet.resolvedOutcome = type(uint256).max;
        } else {
            bet.resolvedOutcome = _winningOption;
        }
        
        bet.resolutionTimestamp = block.timestamp;
        
        emit BetResolved(_betId, bet.resolvedOutcome, bet.totalPoolAmount);
    }

    /**
     * @dev Claim winnings from a resolved bet (only for bettors, not LPs)
     */
    function claimWinnings(uint256 _betId) external nonReentrant betExists(_betId) {
        Bet storage bet = bets[_betId];
        
        if (!bet.isResolved) revert BetNotResolved();
        if (betClaimed[_betId][msg.sender]) revert AlreadyClaimed();
        
        // Check if user is an LP - if so, they should use removeLiquidity instead
        if (userLPShares[_betId][msg.sender] > 0) {
            revert LPMustUseLiquidityFunctions();
        }
        
        // Handle no contest resolution - bettors get their original stake back
        if (bet.resolvedOutcome == type(uint256).max) {
            // No contest: return original stake across all options
            uint256 totalUserStake = 0;
            for (uint256 i = 0; i < bet.bettingOptions.length; i++) {
                totalUserStake += bettorPositions[_betId][msg.sender][i];
                bettorPositions[_betId][msg.sender][i] = 0; // Clear position
            }
            
            if (totalUserStake == 0) revert NothingToClaim();
            
            betClaimed[_betId][msg.sender] = true;
            payable(msg.sender).transfer(totalUserStake);
            
            emit WinningsClaimed(_betId, msg.sender, totalUserStake);
            return;
        }
        
        // Normal resolution: only winners of the resolved outcome get paid
        uint256 userStake = bettorPositions[_betId][msg.sender][bet.resolvedOutcome];
        if (userStake == 0) revert NothingToClaim();
        
        // Calculate payout
        uint256 winningPool = optionPools[_betId][bet.resolvedOutcome];
        if (winningPool == 0) revert NothingToClaim();
        uint256 payout = (userStake * bet.totalPoolAmount) / winningPool;
        
        // Take platform fee
        uint256 fee = (payout * platformFeeRate) / 10000;
        if (fee > 0) {
            treasury.collectFee{value: fee}();
        }

        betClaimed[_betId][msg.sender] = true;
        bettorPositions[_betId][msg.sender][bet.resolvedOutcome] = 0;
        
        // Update user stats
        userProfiles[msg.sender].totalWinnings += (payout - fee);
        payable(msg.sender).transfer(payout - fee);
        
        emit WinningsClaimed(_betId, msg.sender, payout - fee);
    }

    /**
     * @dev Add balanced liquidity to a bet (market maker function)
     */
    function provideLiquidity(uint256 _betId) 
        external payable nonReentrant notPaused notBlacklisted betExists(_betId) 
    {
        Bet storage bet = bets[_betId];
        require(msg.value >= minimumLiquidityAmount, "Insufficient liquidity amount");
        require(block.timestamp < bet.deadlineTimestamp, "Market closed");
        require(!bet.isResolved, "Market already resolved");
        
        uint256 numOptions = bet.bettingOptions.length;
        uint256 perOption = msg.value / numOptions;
        
        // Calculate LP shares to mint
        uint256 lpShares;
        if (totalLPShares[_betId] == 0) {
            // First LP - mint shares equal to liquidity amount
            lpShares = msg.value;
        } else {
            // Calculate proportional shares based on existing pool
            uint256 totalLiquidity = 0;
            for (uint256 i = 0; i < numOptions; i++) {
                totalLiquidity += optionPools[_betId][i];
            }
            if (totalLiquidity == 0) {
                lpShares = msg.value;
            } else {
                lpShares = (msg.value * totalLPShares[_betId]) / totalLiquidity;
            }
        }
        
        // Distribute liquidity equally across all options
        for (uint256 i = 0; i < numOptions; i++) {
            optionPools[_betId][i] += perOption;
            lpPositions[_betId][msg.sender][i] += perOption;
            
            // Create wager record for each option
            betWagers[_betId].push(Wager({
                bettor: msg.sender,
                betId: _betId,
                optionChosen: i,
                amountStaked: perOption,
                timestamp: block.timestamp,
                claimed: false
            }));
        }
        
        // Update LP accounting
        totalLPShares[_betId] += lpShares;
        userLPShares[_betId][msg.sender] += lpShares;
        bet.totalPoolAmount += msg.value;
        
        // LPs are not tracked as wagerers since they don't take betting positions
        // They provide liquidity and earn fees, but don't bet on outcomes
        
        emit LiquidityProvided(_betId, msg.sender, msg.value, lpShares);
    }

    /**
     * @dev Remove liquidity from a bet (works before and after resolution)
     */
    function removeLiquidity(uint256 _betId, uint256 _lpShares) 
        external nonReentrant betExists(_betId) 
    {
        require(_lpShares > 0, "Invalid LP shares");
        require(userLPShares[_betId][msg.sender] >= _lpShares, "Insufficient LP shares");
        require(totalLPShares[_betId] > 0, "No LP shares to remove");
        
        Bet storage bet = bets[_betId];
        uint256 shareRatio = (_lpShares * 10000) / totalLPShares[_betId];
        uint256 totalReturn = 0;
        
        if (!bet.isResolved) {
            // Before resolution: return proportional share from all pools
            for (uint256 i = 0; i < bet.bettingOptions.length; i++) {
                uint256 optionReturn = (optionPools[_betId][i] * shareRatio) / 10000;
                optionPools[_betId][i] -= optionReturn;
                lpPositions[_betId][msg.sender][i] -= optionReturn;
                totalReturn += optionReturn;
            }
            bet.totalPoolAmount -= totalReturn;
        } else {
            // After resolution: LPs get proportional share of total pool
            // This ensures LPs are protected regardless of outcome
            totalReturn = (bet.totalPoolAmount * shareRatio) / 10000;
            
            // Reduce from the winning pool (where the money actually is)
            optionPools[_betId][bet.resolvedOutcome] -= totalReturn;
            lpPositions[_betId][msg.sender][bet.resolvedOutcome] -= totalReturn;
            bet.totalPoolAmount -= totalReturn;
        }
        
        // Update LP accounting
        totalLPShares[_betId] -= _lpShares;
        userLPShares[_betId][msg.sender] -= _lpShares;
        
        // Include accrued fees
        uint256 lpFeeShare = (accruedFees[_betId] * shareRatio) / 10000;
        if (lpFeeShare > 0) {
            accruedFees[_betId] -= lpFeeShare;
            totalReturn += lpFeeShare;
        }
        
        payable(msg.sender).transfer(totalReturn);
        
        emit LiquidityRemoved(_betId, msg.sender, _lpShares, totalReturn);
    }

    /**
     * @dev Updates user profile information
     */
    function updateProfile(string memory _username) external notPaused notBlacklisted {
        require(bytes(_username).length > 0, "Username cannot be empty");
        require(bytes(_username).length <= 32, "Username too long");
        
        userProfiles[msg.sender].username = _username;
        userProfiles[msg.sender].isActive = true;
        
        emit ProfileUpdated(msg.sender, _username);
    }

    // Admin functions
    function setEmergencyPause(bool _paused) external onlyOwner {
        emergencyPaused = _paused;
        emit EmergencyPause(_paused);
    }

    function setUserBlacklist(address _user, bool _blacklisted) external onlyOwner {
        blacklistedUsers[_user] = _blacklisted;
        emit UserBlacklisted(_user, _blacklisted);
    }

    function setMarketDurationLimits(uint256 _minDuration, uint256 _maxDuration) external onlyOwner {
        require(_minDuration < _maxDuration, "Invalid duration range");
        require(_minDuration >= 1 hours, "Minimum too short");
        require(_maxDuration <= 365 days, "Maximum too long");
        
        minMarketDuration = _minDuration;
        maxMarketDuration = _maxDuration;
    }

    function setPlatformFeeRate(uint256 _feeRate) external onlyOwner {
        require(_feeRate <= 1000, "Fee too high"); // Max 10%
        platformFeeRate = _feeRate;
    }

    function setMinimumBetAmount(uint256 _amount) external onlyOwner {
        minimumBetAmount = _amount;
    }

    function setMinimumLiquidityAmount(uint256 _amount) external onlyOwner {
        minimumLiquidityAmount = _amount;
    }

    function setLPFeeRate(uint256 _feeRate) external onlyOwner {
        require(_feeRate <= 500, "LP fee too high"); // Max 5%
        lpFeeRate = _feeRate;
    }

    function setCreationFee(uint256 _amount) external onlyOwner {
        creationFee = _amount;
    }

    // View functions
    function getBet(uint256 _betId) external view betExists(_betId) returns (Bet memory) {
        return bets[_betId];
    }

    function getBetWagers(uint256 _betId) external view betExists(_betId) returns (Wager[] memory) {
        return betWagers[_betId];
    }

    function getUserBets(address _user) external view returns (uint256[] memory) {
        return userBets[_user];
    }

    function getUserWagers(address _user) external view returns (uint256[] memory) {
        return userWagers[_user];
    }

    function getAllBets() external view returns (uint256[] memory) {
        return allBetIds;
    }

    function getOptionPool(uint256 _betId, uint256 _option) external view returns (uint256) {
        return optionPools[_betId][_option];
    }

    function getBettorPosition(uint256 _betId, address _user, uint256 _option) external view returns (uint256) {
        return bettorPositions[_betId][_user][_option];
    }
    
    function getLPPosition(uint256 _betId, address _user, uint256 _option) external view returns (uint256) {
        return lpPositions[_betId][_user][_option];
    }
    
    // Backwards compatibility - returns combined position
    function getUserPosition(uint256 _betId, address _user, uint256 _option) external view returns (uint256) {
        return bettorPositions[_betId][_user][_option] + lpPositions[_betId][_user][_option];
    }

    function getUserLPShares(uint256 _betId, address _user) external view returns (uint256) {
        return userLPShares[_betId][_user];
    }

    function getTotalLPShares(uint256 _betId) external view returns (uint256) {
        return totalLPShares[_betId];
    }

    function getAccruedFees(uint256 _betId) external view returns (uint256) {
        return accruedFees[_betId];
    }

    function calculateLPValue(uint256 _betId, address _lpProvider) external view returns (uint256) {
        if (totalLPShares[_betId] == 0) return 0;
        
        uint256 userShares = userLPShares[_betId][_lpProvider];
        if (userShares == 0) return 0;
        
        uint256 shareRatio = (userShares * 10000) / totalLPShares[_betId];
        uint256 totalValue = 0;
        
        // Calculate proportional value from each option pool
        for (uint256 i = 0; i < bets[_betId].bettingOptions.length; i++) {
            totalValue += (optionPools[_betId][i] * shareRatio) / 10000;
        }
        
        // Add accrued fees
        totalValue += (accruedFees[_betId] * shareRatio) / 10000;
        
        return totalValue;
    }

    function getBetOdds(uint256 _betId) external view betExists(_betId) returns (uint256[] memory odds) {
        Bet storage bet = bets[_betId];
        odds = new uint256[](bet.bettingOptions.length);
        
        if (bet.totalPoolAmount == 0) {
            // Equal odds if no bets placed
            uint256 equalOdds = 10000 / bet.bettingOptions.length;
            for (uint256 i = 0; i < bet.bettingOptions.length; i++) {
                odds[i] = equalOdds;
            }
        } else {
            for (uint256 i = 0; i < bet.bettingOptions.length; i++) {
                odds[i] = (optionPools[_betId][i] * 10000) / bet.totalPoolAmount; // Basis points
            }
        }
    }

    function getVersion() external view returns (uint256) {
        return protocolVersion;
    }

    function getContractStatus() external view returns (
        uint256 version,
        bool paused,
        uint256 totalBets,
        uint256 minDuration,
        uint256 maxDuration,
        uint256 feeRate
    ) {
        return (
            protocolVersion,
            emergencyPaused,
            allBetIds.length,
            minMarketDuration,
            maxMarketDuration,
            platformFeeRate
        );
    }
    
    /**
     * @dev Get market resolution status - helps frontends determine resolution options
     */
    function getMarketResolutionStatus(uint256 _betId) external view betExists(_betId) returns (
        bool canResolve,
        bool hasActualBetting,
        bool requiresNoContest,
        string memory statusMessage
    ) {
        Bet storage bet = bets[_betId];
        
        if (bet.isResolved) {
            return (false, false, false, "Already resolved");
        }
        
        if (block.timestamp < bet.deadlineTimestamp) {
            return (false, false, false, "Market still active");
        }
        
        bool hasRealBets = hasActualBets(_betId);
        
        if (!hasRealBets) {
            return (true, false, true, "No bets placed - use no contest resolution");
        }
        
        return (true, true, false, "Ready for normal resolution");
    }

    // Backwards compatibility
    function getAllMarkets() external view returns (address[] memory) {
        // Return empty array for compatibility - we don't use separate market contracts anymore
        return new address[](0);
    }

    receive() external payable {}
} 