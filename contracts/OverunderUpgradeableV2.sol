// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "./MarketFactoryUpgradeable.sol";
import "./Treasury.sol";

/**
 * @title OverUnder Betting Platform V2 (Upgradeable)
 * @dev Version 2 with enhanced features: Referral system, Premium memberships, and Advanced analytics
 * @author OverUnder Protocol
 */
contract OverunderUpgradeableV2 is 
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

    // NEW V2 FEATURES
    struct PremiumMembership {
        bool isActive;
        uint256 expiresAt;
        uint256 discountRate; // Basis points for fee discounts
        uint256 bonusMultiplier; // Reputation bonus multiplier
    }

    struct ReferralData {
        address referrer;
        uint256 totalReferred;
        uint256 referralEarnings;
        uint256 referralRate; // Basis points
    }

    // State variables
    MarketFactoryUpgradeable public marketFactory;
    Treasury public treasury;
    uint256 public protocolVersion;
    bool public emergencyPaused;
    
    mapping(address => UserProfile) public userProfiles;
    
    // Existing upgrade variables (from V1)
    mapping(address => bool) public blacklistedUsers;
    uint256 public minMarketDuration;
    uint256 public maxMarketDuration;
    
    // NEW V2 STATE VARIABLES (added at end to preserve storage layout)
    mapping(address => PremiumMembership) public premiumMembers;
    mapping(address => ReferralData) public referralData;
    uint256 public premiumMembershipPrice;
    uint256 public premiumMembershipDuration;
    uint256 public defaultReferralRate;
    bool public referralSystemEnabled;
    uint256 public totalPremiumRevenue;
    mapping(string => uint256) public categoryPopularity; // Track popular categories
    
    // Reserve storage slots for future variables (reduced by new variables added)
    uint256[39] private __gap;
    
    // Events
    event ProfileUpdated(address indexed user, string username);
    event ContractUpgraded(address indexed newImplementation, uint256 newVersion);
    event EmergencyPause(bool paused);
    event UserBlacklisted(address indexed user, bool blacklisted);
    
    // NEW V2 EVENTS
    event PremiumMembershipPurchased(address indexed user, uint256 duration, uint256 price);
    event ReferralReward(address indexed referrer, address indexed referee, uint256 reward);
    event CategoryPopularityUpdated(string category, uint256 newCount);

    // Custom errors
    error ContractPaused();
    error UserBlacklistedError();
    error InvalidMarketDuration();
    
    // NEW V2 ERRORS
    error InsufficientPremiumPayment();
    error PremiumMembershipExpired();
    error InvalidReferralRate();
    error ReferralSystemDisabled();

    modifier notPaused() {
        if (emergencyPaused) revert ContractPaused();
        _;
    }

    modifier notBlacklisted() {
        if (blacklistedUsers[msg.sender]) revert UserBlacklistedError();
        _;
    }

    // NEW V2 MODIFIER
    modifier premiumFeature() {
        PremiumMembership memory membership = premiumMembers[msg.sender];
        if (!membership.isActive || block.timestamp > membership.expiresAt) {
            revert PremiumMembershipExpired();
        }
        _;
    }

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @dev Standard initializer (for fresh deployments) - never used in upgrades
     */
    function initialize(address _treasury) public initializer {
        __Ownable_init(msg.sender);
        __UUPSUpgradeable_init();
        __ReentrancyGuard_init();
        
        treasury = Treasury(_treasury);
        protocolVersion = 2;
        emergencyPaused = false;
        minMarketDuration = 1 hours;
        maxMarketDuration = 365 days;
        
        // Initialize V2 features
        premiumMembershipPrice = 0.1 ether;
        premiumMembershipDuration = 30 days;
        defaultReferralRate = 500;
        referralSystemEnabled = true;
        totalPremiumRevenue = 0;
    }

    /**
     * @dev V2 Initializer for new features (called after upgrade from V1)
     * This function can only be called once after the V2 upgrade
     */
    function initializeV2() public reinitializer(2) {
        premiumMembershipPrice = 0.1 ether; // 0.1 ETH for premium membership
        premiumMembershipDuration = 30 days; // 30 days duration
        defaultReferralRate = 500; // 5% referral rate
        referralSystemEnabled = true;
        totalPremiumRevenue = 0;
    }

    /**
     * @dev Required by UUPS - only owner can upgrade
     */
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {
        protocolVersion++;
        emit ContractUpgraded(newImplementation, protocolVersion);
    }

    /**
     * @dev Creates a market with V2 enhancements
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
        
        // Apply premium member discount
        uint256 actualValue = msg.value;
        PremiumMembership memory membership = premiumMembers[msg.sender];
        if (membership.isActive && block.timestamp <= membership.expiresAt) {
            // Premium members get a small bonus to their initial liquidity
            uint256 bonus = (msg.value * membership.bonusMultiplier) / 10000;
            actualValue += bonus;
        }
        
        address marketAddress = marketFactory.createMarket{value: actualValue}(
            _question,
            _description,
            _resolutionTime,
            _category,
            msg.sender
        );
        
        // Track category popularity
        categoryPopularity[_category]++;
        emit CategoryPopularityUpdated(_category, categoryPopularity[_category]);
        
        return marketAddress;
    }

    /**
     * @dev Enhanced profile update with referral system
     */
    function updateProfile(
        string memory _username, 
        address _referrer
    ) external notPaused notBlacklisted {
        require(bytes(_username).length > 0, "Username cannot be empty");
        require(bytes(_username).length <= 32, "Username too long");
        
        // Set referrer if referral system is enabled and user doesn't have one
        if (referralSystemEnabled && 
            _referrer != address(0) && 
            _referrer != msg.sender && 
            referralData[msg.sender].referrer == address(0)) {
            
            referralData[msg.sender].referrer = _referrer;
            referralData[msg.sender].referralRate = defaultReferralRate;
            referralData[_referrer].totalReferred++;
        }
        
        userProfiles[msg.sender].username = _username;
        userProfiles[msg.sender].isActive = true;
        
        emit ProfileUpdated(msg.sender, _username);
    }

    // Legacy function for backwards compatibility
    function updateProfile(string memory _username) external {
        this.updateProfile(_username, address(0));
    }

    /**
     * @dev NEW V2 FEATURE: Purchase Premium Membership
     */
    function purchasePremiumMembership() external payable nonReentrant notPaused notBlacklisted {
        if (msg.value < premiumMembershipPrice) revert InsufficientPremiumPayment();
        
        PremiumMembership storage membership = premiumMembers[msg.sender];
        
        // Extend membership if already active, otherwise start new
        uint256 startTime = membership.isActive && block.timestamp <= membership.expiresAt 
            ? membership.expiresAt 
            : block.timestamp;
            
        membership.isActive = true;
        membership.expiresAt = startTime + premiumMembershipDuration;
        membership.discountRate = 200; // 2% discount on fees
        membership.bonusMultiplier = 110; // 10% bonus multiplier
        
        totalPremiumRevenue += msg.value;
        
        // Send payment to treasury
        treasury.collectFee{value: msg.value}();
        
        emit PremiumMembershipPurchased(msg.sender, premiumMembershipDuration, msg.value);
    }

    /**
     * @dev NEW V2 FEATURE: Get market analytics
     */
    function getMarketAnalytics() external view premiumFeature returns (
        string[] memory popularCategories,
        uint256[] memory categoryTotals,
        uint256 totalMarketsCreated,
        uint256 totalPremiumMembers
    ) {
        // This is a simplified version - in reality you'd track more data
        popularCategories = new string[](3);
        categoryTotals = new uint256[](3);
        
        popularCategories[0] = "Sports";
        popularCategories[1] = "Crypto"; 
        popularCategories[2] = "Politics";
        
        categoryTotals[0] = categoryPopularity["Sports"];
        categoryTotals[1] = categoryPopularity["Crypto"];
        categoryTotals[2] = categoryPopularity["Politics"];
        
        totalMarketsCreated = marketFactory.getAllMarkets().length;
        
        // Count premium members (simplified)
        totalPremiumMembers = totalPremiumRevenue / premiumMembershipPrice;
        
        return (popularCategories, categoryTotals, totalMarketsCreated, totalPremiumMembers);
    }

    /**
     * @dev Enhanced user stats update with referral rewards
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
        
        // Update win rate
        if (profile.totalBets > 0) {
            profile.winRate = (profile.totalWinnings * 10000) / profile.totalBets;
        }
        
        // Enhanced reputation system for premium members
        PremiumMembership memory membership = premiumMembers[_user];
        uint256 reputationGain = _won ? 1 : 0;
        if (membership.isActive && block.timestamp <= membership.expiresAt) {
            reputationGain = (reputationGain * membership.bonusMultiplier) / 100;
        }
        profile.reputation += reputationGain;
        
        // Process referral rewards if applicable
        if (referralSystemEnabled && _won && _winnings > 0) {
            ReferralData storage refData = referralData[_user];
            if (refData.referrer != address(0)) {
                uint256 referralReward = (_winnings * refData.referralRate) / 10000;
                refData.referralEarnings += referralReward;
                
                emit ReferralReward(refData.referrer, _user, referralReward);
            }
        }
    }

    // Admin functions for new features
    
    /**
     * @dev Set premium membership parameters
     */
    function setPremiumMembershipParams(
        uint256 _price,
        uint256 _duration
    ) external onlyOwner {
        premiumMembershipPrice = _price;
        premiumMembershipDuration = _duration;
    }

    /**
     * @dev Toggle referral system
     */
    function setReferralSystemEnabled(bool _enabled) external onlyOwner {
        referralSystemEnabled = _enabled;
    }

    /**
     * @dev Set default referral rate
     */
    function setDefaultReferralRate(uint256 _rate) external onlyOwner {
        if (_rate > 2000) revert InvalidReferralRate(); // Max 20%
        defaultReferralRate = _rate;
    }

    // Existing admin functions (inherited from V1)
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

    function setMarketFactory(address _marketFactory) external onlyOwner {
        require(address(marketFactory) == address(0), "MarketFactory already set");
        marketFactory = MarketFactoryUpgradeable(_marketFactory);
    }

    // View functions
    function getMarketFactory() external view returns (address) {
        return address(marketFactory);
    }

    function getAllMarkets() external view returns (address[] memory) {
        return marketFactory.getAllMarkets();
    }
    
    /**
     * @dev Get protocol version - now returns 2
     */
    function getVersion() external pure returns (uint256) {
        return 2;
    }

    /**
     * @dev Enhanced contract status with V2 features
     */
    function getContractStatus() external view returns (
        uint256 version,
        bool paused,
        uint256 totalMarkets,
        uint256 minDuration,
        uint256 maxDuration,
        uint256 premiumMembersCount,
        bool referralEnabled,
        uint256 totalRevenue
    ) {
        return (
            2, // V2
            emergencyPaused,
            marketFactory.getAllMarkets().length,
            minMarketDuration,
            maxMarketDuration,
            premiumMembershipPrice > 0 ? totalPremiumRevenue / premiumMembershipPrice : 0,
            referralSystemEnabled,
            totalPremiumRevenue
        );
    }

    /**
     * @dev Get user's premium membership info
     */
    function getPremiumMembershipInfo(address _user) external view returns (
        bool isActive,
        uint256 expiresAt,
        uint256 discountRate,
        uint256 bonusMultiplier
    ) {
        PremiumMembership memory membership = premiumMembers[_user];
        return (
            membership.isActive && block.timestamp <= membership.expiresAt,
            membership.expiresAt,
            membership.discountRate,
            membership.bonusMultiplier
        );
    }

    /**
     * @dev Get user's referral info
     */
    function getReferralInfo(address _user) external view returns (
        address referrer,
        uint256 totalReferred,
        uint256 referralEarnings,
        uint256 referralRate
    ) {
        ReferralData memory refData = referralData[_user];
        return (
            refData.referrer,
            refData.totalReferred,
            refData.referralEarnings,
            refData.referralRate
        );
    }
} 