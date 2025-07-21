// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "./MarketFactoryUpgradeable.sol";
import "./Treasury.sol";

/**
 * @title OverUnder Betting Platform (Upgradeable)
 * @dev Upgradeable betting platform using UUPS proxy pattern
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

    // State variables
    MarketFactoryUpgradeable public marketFactory;
    Treasury public treasury;
    uint256 public protocolVersion;
    bool public emergencyPaused;
    
    mapping(address => UserProfile) public userProfiles;
    
    // New state variables for future upgrades (always add at end)
    mapping(address => bool) public blacklistedUsers;
    uint256 public minMarketDuration;
    uint256 public maxMarketDuration;
    
    // Reserve storage slots for future variables (important for upgradeability)
    uint256[47] private __gap;
    
    // Events
    event ProfileUpdated(address indexed user, string username);
    event ContractUpgraded(address indexed newImplementation, uint256 newVersion);
    event EmergencyPause(bool paused);
    event UserBlacklisted(address indexed user, bool blacklisted);

    // Custom errors
    error ContractPaused();
    error UserBlacklistedError();
    error InvalidMarketDuration();

    modifier notPaused() {
        if (emergencyPaused) revert ContractPaused();
        _;
    }

    modifier notBlacklisted() {
        if (blacklistedUsers[msg.sender]) revert UserBlacklistedError();
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
        protocolVersion = 1;
        emergencyPaused = false;
        minMarketDuration = 1 hours;
        maxMarketDuration = 365 days;
    }

    /**
     * @dev Initialize MarketFactory (separate function to avoid circular dependency)
     */
    function setMarketFactory(address _marketFactory) external onlyOwner {
        require(address(marketFactory) == address(0), "MarketFactory already set");
        marketFactory = MarketFactoryUpgradeable(_marketFactory);
    }

    /**
     * @dev Required by UUPS - only owner can upgrade
     */
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {
        protocolVersion++;
        emit ContractUpgraded(newImplementation, protocolVersion);
    }

    /**
     * @dev Creates a market - anyone can create
     */
    function createMarket(
        string memory _question,
        string memory _description,
        uint256 _resolutionTime,
        string memory _category
    ) external payable nonReentrant notPaused notBlacklisted returns (address) {
        require(msg.value >= 0.01 ether, "Minimum initial liquidity required");
        
        // Validate market duration
        uint256 duration = _resolutionTime - block.timestamp;
        if (duration < minMarketDuration || duration > maxMarketDuration) {
            revert InvalidMarketDuration();
        }
        
        address marketAddress = marketFactory.createMarket{value: msg.value}(
            _question,
            _description,
            _resolutionTime,
            _category,
            msg.sender
        );
        
        return marketAddress;
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

    /**
     * @dev Updates user stats after market resolution (called by Market contract)
     */
    function updateUserStats(
        address _user,
        uint256 _betAmount,
        uint256 _winnings,
        bool _won
    ) external {
        require(marketFactory.isValidMarket(msg.sender), "Only valid markets can update stats");
        
        UserProfile storage profile = userProfiles[_user];
        profile.totalBets += _betAmount;
        profile.totalWinnings += _winnings;
        
        // Update win rate (simple calculation)
        if (profile.totalBets > 0) {
            profile.winRate = (profile.totalWinnings * 10000) / profile.totalBets;
        }
        
        // Update reputation based on performance
        if (_won) {
            profile.reputation += 1;
        }
    }

    // Admin functions (can be used in upgrades)
    
    /**
     * @dev Emergency pause functionality
     */
    function setEmergencyPause(bool _paused) external onlyOwner {
        emergencyPaused = _paused;
        emit EmergencyPause(_paused);
    }

    /**
     * @dev Blacklist users (added in upgrade capability)
     */
    function setUserBlacklist(address _user, bool _blacklisted) external onlyOwner {
        blacklistedUsers[_user] = _blacklisted;
        emit UserBlacklisted(_user, _blacklisted);
    }

    /**
     * @dev Update market duration limits
     */
    function setMarketDurationLimits(uint256 _minDuration, uint256 _maxDuration) external onlyOwner {
        require(_minDuration < _maxDuration, "Invalid duration range");
        require(_minDuration >= 1 hours, "Minimum too short");
        require(_maxDuration <= 365 days, "Maximum too long");
        
        minMarketDuration = _minDuration;
        maxMarketDuration = _maxDuration;
    }

    // View functions
    function getMarketFactory() external view returns (address) {
        return address(marketFactory);
    }

    function getAllMarkets() external view returns (address[] memory) {
        return marketFactory.getAllMarkets();
    }
    
    /**
     * @dev Get protocol version (useful for frontend integration)
     */
    function getVersion() external view returns (uint256) {
        return protocolVersion;
    }

    /**
     * @dev Get contract status
     */
    function getContractStatus() external view returns (
        uint256 version,
        bool paused,
        uint256 totalMarkets,
        uint256 minDuration,
        uint256 maxDuration
    ) {
        return (
            protocolVersion,
            emergencyPaused,
            marketFactory.getAllMarkets().length,
            minMarketDuration,
            maxMarketDuration
        );
    }
} 