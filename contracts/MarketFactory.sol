// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./Market.sol";
import "./Treasury.sol";

/**
 * @title MarketFactory
 * @dev Factory contract for creating and managing individual betting markets
 */
contract MarketFactory {
    address public overUnderContract;
    Treasury public treasury;
    
    mapping(address => bool) public validMarkets;
    address[] public allMarkets;
    
    event MarketCreated(
        address indexed marketAddress,
        string question,
        address indexed creator
    );

    modifier onlyOverUnder() {
        require(msg.sender == overUnderContract, "Only OverUnder contract");
        _;
    }

    constructor(address _overUnderContract, address _treasury) {
        overUnderContract = _overUnderContract;
        treasury = Treasury(_treasury);
    }

    function createMarket(
        string memory _question,
        string memory _description,
        uint256 _resolutionTime,
        string memory _category,
        address _creator
    ) external payable onlyOverUnder returns (address) {
        Market newMarket = new Market{value: msg.value}(
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
        
        emit MarketCreated(marketAddress, _question, _creator);
        
        return marketAddress;
    }

    function isValidMarket(address _market) external view returns (bool) {
        return validMarkets[_market];
    }

    function getAllMarkets() external view returns (address[] memory) {
        return allMarkets;
    }
} 