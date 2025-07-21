// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "./Market.sol";
import "./Treasury.sol";

/**
 * @title MarketFactory (Upgradeable)
 * @dev Upgradeable factory for creating and managing markets
 */
contract MarketFactoryUpgradeable is Initializable, UUPSUpgradeable, OwnableUpgradeable {
    address public overUnderContract;
    Treasury public treasury;
    
    mapping(address => bool) public validMarkets;
    mapping(string => address[]) public marketsByCategory;
    address[] public allMarkets;
    
    // New state variables for future upgrades
    mapping(address => uint256) public marketCreationFees;
    uint256 public defaultCreationFee;
    bool public categoryFilterEnabled;
    mapping(string => bool) public allowedCategories;
    
    // Reserve storage for future upgrades
    uint256[45] private __gap;
    
    event MarketCreated(
        address indexed marketAddress,
        string question,
        address indexed creator,
        string category
    );
    event CategoryAdded(string category);
    event MarketCreationFeeUpdated(address indexed creator, uint256 fee);

    // Custom errors
    error UnauthorizedMarketCreation();
    error InvalidCategory();
    error InsufficientCreationFee();

    modifier onlyOverUnder() {
        if (msg.sender != overUnderContract) revert UnauthorizedMarketCreation();
        _;
    }

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address _overUnderContract, address _treasury) public initializer {
        __Ownable_init(msg.sender);
        __UUPSUpgradeable_init();
        
        overUnderContract = _overUnderContract;
        treasury = Treasury(_treasury);
        defaultCreationFee = 0;
        categoryFilterEnabled = false;
        
        // Add default categories
        _addCategory("Sports");
        _addCategory("Crypto");
        _addCategory("Politics");
        _addCategory("Weather");
        _addCategory("Entertainment");
        _addCategory("Technology");
        _addCategory("Other");
    }

    /**
     * @dev Required by UUPS - only owner can upgrade
     */
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    function createMarket(
        string memory _question,
        string memory _description,
        uint256 _resolutionTime,
        string memory _category,
        address _creator
    ) external payable onlyOverUnder returns (address) {
        // Validate category if filtering is enabled
        if (categoryFilterEnabled && !allowedCategories[_category]) {
            revert InvalidCategory();
        }
        
        // Check creation fee (can be customized per user)
        uint256 requiredFee = marketCreationFees[_creator] > 0 
            ? marketCreationFees[_creator] 
            : defaultCreationFee;
            
        if (msg.value < requiredFee) {
            revert InsufficientCreationFee();
        }
        
        // Forward the value (minus any creation fee) to the new market
        uint256 marketLiquidity = msg.value - requiredFee;
        
        Market newMarket = new Market{value: marketLiquidity}(
            _question,
            _description,
            _resolutionTime,
            _category,
            _creator,
            address(treasury),
            overUnderContract
        );
        
        address marketAddress = address(newMarket);
        validMarkets[marketAddress] = true;
        allMarkets.push(marketAddress);
        marketsByCategory[_category].push(marketAddress);
        
        // Send creation fee to treasury if applicable
        if (requiredFee > 0) {
            treasury.collectFee{value: requiredFee}();
        }
        
        emit MarketCreated(marketAddress, _question, _creator, _category);
        
        return marketAddress;
    }

    // Admin functions for upgrades

    /**
     * @dev Add allowed category
     */
    function addCategory(string memory _category) external onlyOwner {
        _addCategory(_category);
    }

    function _addCategory(string memory _category) internal {
        allowedCategories[_category] = true;
        emit CategoryAdded(_category);
    }

    /**
     * @dev Toggle category filtering
     */
    function setCategoryFilterEnabled(bool _enabled) external onlyOwner {
        categoryFilterEnabled = _enabled;
    }

    /**
     * @dev Set default market creation fee
     */
    function setDefaultCreationFee(uint256 _fee) external onlyOwner {
        defaultCreationFee = _fee;
    }

    /**
     * @dev Set custom creation fee for specific user
     */
    function setUserCreationFee(address _user, uint256 _fee) external onlyOwner {
        marketCreationFees[_user] = _fee;
        emit MarketCreationFeeUpdated(_user, _fee);
    }

    /**
     * @dev Remove invalid market (emergency function)
     */
    function removeMarket(address _market) external onlyOwner {
        validMarkets[_market] = false;
    }

    // View functions

    function isValidMarket(address _market) external view returns (bool) {
        return validMarkets[_market];
    }

    function getAllMarkets() external view returns (address[] memory) {
        return allMarkets;
    }
    
    /**
     * @dev Get markets by category (new feature available after upgrade)
     */
    function getMarketsByCategory(string memory _category) external view returns (address[] memory) {
        return marketsByCategory[_category];
    }

    /**
     * @dev Get market statistics
     */
    function getMarketStats() external view returns (
        uint256 totalMarkets,
        uint256 totalCategories,
        bool filterEnabled,
        uint256 defaultFee
    ) {
        // Count categories (simplified - in real upgrade this would be more efficient)
        uint256 categoryCount = 7; // Default categories for now
        
        return (
            allMarkets.length,
            categoryCount,
            categoryFilterEnabled,
            defaultCreationFee
        );
    }

    /**
     * @dev Check if category is allowed
     */
    function isCategoryAllowed(string memory _category) external view returns (bool) {
        if (!categoryFilterEnabled) return true;
        return allowedCategories[_category];
    }

    /**
     * @dev Get creation fee for user
     */
    function getCreationFee(address _user) external view returns (uint256) {
        return marketCreationFees[_user] > 0 ? marketCreationFees[_user] : defaultCreationFee;
    }
} 