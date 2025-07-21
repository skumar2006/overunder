// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./MarketFactory.sol";
import "./Treasury.sol";

/**
 * @title OverUnder Betting Platform
 * @dev Simple betting platform where users can create markets and bet on outcomes
 * @author OverUnder Protocol
 */
contract Overunder {
    struct UserProfile {
        string username;
        uint256 totalBets;
        uint256 totalWinnings;
        uint256 winRate; // Basis points (10000 = 100%)
        uint256 reputation; // Reputation score
        bool isActive;
    }

    // State variables
    MarketFactory public marketFactory;
    Treasury public treasury;
    
    mapping(address => UserProfile) public userProfiles;
    
    // Events
    event ProfileUpdated(address indexed user, string username);

    constructor(address _treasury) {
        treasury = Treasury(_treasury);
        marketFactory = new MarketFactory(address(this), _treasury);
    }

    /**
     * @dev Creates a market - anyone can create
     */
    function createMarket(
        string memory _question,
        string memory _description,
        uint256 _resolutionTime,
        string memory _category
    ) external payable returns (address) {
        require(msg.value >= 0.01 ether, "Minimum initial liquidity required");
        
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
    function updateProfile(string memory _username) external {
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

    // View functions
    function getMarketFactory() external view returns (address) {
        return address(marketFactory);
    }

    function getAllMarkets() external view returns (address[] memory) {
        return marketFactory.getAllMarkets();
    }
}
