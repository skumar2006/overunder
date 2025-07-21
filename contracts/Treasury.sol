// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title Treasury
 * @dev Handles platform fees and protocol revenue
 */
contract Treasury {
    address public owner;
    uint256 public totalFeesCollected;
    
    mapping(address => uint256) public feesFromSource;
    
    event FeeCollected(address indexed source, uint256 amount);
    event Withdrawal(address indexed to, uint256 amount);
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }
    
    constructor() {
        owner = msg.sender;
    }
    
    function collectFee() external payable {
        require(msg.value > 0, "No fee to collect");
        totalFeesCollected += msg.value;
        feesFromSource[msg.sender] += msg.value;
        
        emit FeeCollected(msg.sender, msg.value);
    }
    
    function withdraw(uint256 _amount) external onlyOwner {
        require(_amount <= address(this).balance, "Insufficient balance");
        payable(owner).transfer(_amount);
        
        emit Withdrawal(owner, _amount);
    }
    
    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }
} 