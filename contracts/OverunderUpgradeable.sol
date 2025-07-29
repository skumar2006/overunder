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
    
    // User positions: betId -> user -> optionIndex -> amount staked
    mapping(uint256 => mapping(address => mapping(uint256 => uint256))) public userPositions;
    
    // Platform settings
    uint256 public platformFeeRate; // Basis points (200 = 2%)
    uint256 public minimumBetAmount;
    
    // Reserve storage slots for future variables
    uint256[35] private __gap;
    
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
        
        treasury = Treasury(_treasury);
        protocolVersion = 2; // V2 with centralized betting
        emergencyPaused = false;
        minMarketDuration = 1 hours;
        maxMarketDuration = 365 days;
        nextBetId = 1; // Start bet IDs from 1
        platformFeeRate = 200; // 2%
        minimumBetAmount = 0.001 ether; // 0.001 ETH minimum
    }

    /**
     * @dev Required by UUPS - only owner can upgrade
     */
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {
        protocolVersion++;
        emit ContractUpgraded(newImplementation, protocolVersion);
    }

    /**
     * @dev Create a new bet with balanced initial liquidity (Option 1)
     */
    function createBet(
        string memory _question,
        string memory _description,
        string[] memory _bettingOptions,
        uint256 _deadlineTimestamp,
        string memory _category
    ) external payable nonReentrant notPaused notBlacklisted returns (uint256) {
        require(msg.value >= minimumBetAmount * _bettingOptions.length, "Insufficient initial liquidity");
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
        uint256 perOption = msg.value / _bettingOptions.length;
        
        // Create the bet
        bets[betId] = Bet({
            betId: betId,
            creator: msg.sender,
            stakeAmount: msg.value,
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
        
        // Distribute creator's stake equally across all options (BALANCED LIQUIDITY)
        for (uint256 i = 0; i < _bettingOptions.length; i++) {
            optionPools[betId][i] = perOption;
            userPositions[betId][msg.sender][i] = perOption;
            
            // Create initial wager for each option
            betWagers[betId].push(Wager({
                bettor: msg.sender,
                betId: betId,
                optionChosen: i,
                amountStaked: perOption,
                timestamp: block.timestamp,
                claimed: false
            }));
        }
        
        userWagers[msg.sender].push(betId);
        
        emit BetCreated(betId, msg.sender, _question, _bettingOptions, _deadlineTimestamp, msg.value);
        
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
        
        // Update pools and user positions
        optionPools[_betId][_optionChosen] += msg.value;
        userPositions[_betId][msg.sender][_optionChosen] += msg.value;
        bet.totalPoolAmount += msg.value;
        
        // Create wager record
        betWagers[_betId].push(Wager({
            bettor: msg.sender,
            betId: _betId,
            optionChosen: _optionChosen,
            amountStaked: msg.value,
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
        }
        
        emit WagerPlaced(_betId, msg.sender, _optionChosen, msg.value);
    }

    /**
     * @dev Resolve a bet (only creator can resolve after deadline)
     */
    function resolveBet(
        uint256 _betId,
        uint256 _winningOption
    ) external betExists(_betId) {
        Bet storage bet = bets[_betId];
        
        if (msg.sender != bet.creator && msg.sender != owner()) revert OnlyCreatorCanResolve();
        if (bet.isResolved) revert BetAlreadyResolved();
        if (_winningOption >= bet.bettingOptions.length) revert InvalidOption();
        if (block.timestamp < bet.deadlineTimestamp && msg.sender != owner()) {
            revert TooEarlyToResolve();
        }
        
        bet.isResolved = true;
        bet.resolvedOutcome = _winningOption;
        bet.resolutionTimestamp = block.timestamp;
        
        emit BetResolved(_betId, _winningOption, bet.totalPoolAmount);
    }

    /**
     * @dev Claim winnings from a resolved bet
     */
    function claimWinnings(uint256 _betId) external nonReentrant betExists(_betId) {
        Bet storage bet = bets[_betId];
        
        if (!bet.isResolved) revert BetNotResolved();
        
        uint256 userStake = userPositions[_betId][msg.sender][bet.resolvedOutcome];
        if (userStake == 0) revert NothingToClaim();
        
        // Check if already claimed
        Wager[] storage wagers = betWagers[_betId];
        bool alreadyClaimed = false;
        uint256 wagerIndex = type(uint256).max;
        
        for (uint256 i = 0; i < wagers.length; i++) {
            if (wagers[i].bettor == msg.sender && 
                wagers[i].optionChosen == bet.resolvedOutcome &&
                !wagers[i].claimed &&
                wagers[i].amountStaked == userStake) {
                wagerIndex = i;
                break;
            }
        }
        
        if (wagerIndex == type(uint256).max) revert AlreadyClaimed();
        
        // Calculate payout
        uint256 winningPool = optionPools[_betId][bet.resolvedOutcome];
        uint256 totalPool = bet.totalPoolAmount;
        
        if (winningPool == 0) revert NothingToClaim();
        
        // Payout = (user's stake / total winning stakes) * total pool
        uint256 payout = (userStake * totalPool) / winningPool;
        
        // Take platform fee
        uint256 fee = (payout * platformFeeRate) / 10000;
        if (fee > 0) {
            treasury.collectFee{value: fee}();
        }
        
        uint256 finalPayout = payout - fee;
        
        // Mark as claimed
        wagers[wagerIndex].claimed = true;
        
        // Reset user position to prevent double claiming
        userPositions[_betId][msg.sender][bet.resolvedOutcome] = 0;
        
        // Update user stats
        userProfiles[msg.sender].totalWinnings += finalPayout;
        userProfiles[msg.sender].totalBets += userStake;
        
        payable(msg.sender).transfer(finalPayout);
        
        emit WinningsClaimed(_betId, msg.sender, finalPayout);
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

    function getUserPosition(uint256 _betId, address _user, uint256 _option) external view returns (uint256) {
        return userPositions[_betId][_user][_option];
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

    // Backwards compatibility
    function getAllMarkets() external view returns (address[] memory) {
        // Return empty array for compatibility - we don't use separate market contracts anymore
        return new address[](0);
    }

    receive() external payable {}
} 