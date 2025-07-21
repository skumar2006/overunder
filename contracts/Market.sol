// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./OutcomeToken.sol";
import "./Treasury.sol";

/**
 * @title Market
 * @dev Individual betting market with YES/NO outcome tokens and AMM pricing
 */
contract Market {
    enum MarketState { Active, Resolved, Invalid }
    
    struct MarketInfo {
        string question;
        string description;
        string category;
        address creator;
        uint256 createdAt;
        uint256 resolutionTime;
        MarketState state;
        bool outcome; // true = YES wins, false = NO wins
        uint256 totalYesShares;
        uint256 totalNoShares;
        uint256 initialLiquidity;
        uint256 k; // Constant product for AMM (x * y = k)
    }

    MarketInfo public marketInfo;
    OutcomeToken public yesToken;
    OutcomeToken public noToken;
    Treasury public treasury;
    address public overUnderContract;
    
    mapping(address => uint256) public userYesShares;
    mapping(address => uint256) public userNoShares;
    mapping(address => bool) public hasClaimed;
    
    address[] public bettors;
    
    uint256 constant PLATFORM_FEE = 200; // 2% in basis points
    uint256 constant BASIS_POINTS = 10000;
    uint256 constant MIN_LIQUIDITY = 1000; // Minimum shares to prevent division by zero

    event SharesPurchased(address indexed user, bool isYes, uint256 shares, uint256 cost);
    event MarketResolved(bool outcome);
    event WinningsClaimed(address indexed user, uint256 amount);

    error MarketNotActive();
    error MarketClosed();
    error MarketAlreadyResolved();
    error TooEarlyToResolve();
    error OnlyCreatorCanResolve();
    error InvalidShareAmount();
    error InsufficientPayment();
    error NoWinningShares();
    error AlreadyClaimed();
    error MarketNotResolved();
    error InsufficientLiquidity();
    error SlippageExceeded();

    modifier onlyActive() {
        if (marketInfo.state != MarketState.Active) revert MarketNotActive();
        if (block.timestamp >= marketInfo.resolutionTime) revert MarketClosed();
        _;
    }

    modifier onlyCreatorOrModerator() {
        if (msg.sender != marketInfo.creator) revert OnlyCreatorCanResolve();
        _;
    }

    constructor(
        string memory _question,
        string memory _description,
        uint256 _resolutionTime,
        string memory _category,
        address _creator,
        address _treasury,
        address _overUnderContract
    ) payable {
        require(_resolutionTime > block.timestamp, "Invalid resolution time");
        require(msg.value > 0, "Initial liquidity required");
        
        treasury = Treasury(_treasury);
        overUnderContract = _overUnderContract;
        
        // Create YES/NO tokens
        yesToken = new OutcomeToken("YES", "YES");
        noToken = new OutcomeToken("NO", "NO");
        
        // Initial AMM setup: create equal liquidity pools
        // Convert ETH to number of shares (1 ETH = 1000 shares for initial setup)
        uint256 initialShares = (msg.value * 1000) / 1 ether;
        if (initialShares < MIN_LIQUIDITY) {
            initialShares = MIN_LIQUIDITY;
        }
        
        // Mint initial shares to the contract (not to creator)
        yesToken.mint(address(this), initialShares);
        noToken.mint(address(this), initialShares);
        
        // Set up AMM constant product (x * y = k)
        uint256 k = initialShares * initialShares;
        
        marketInfo = MarketInfo({
            question: _question,
            description: _description,
            category: _category,
            creator: _creator,
            createdAt: block.timestamp,
            resolutionTime: _resolutionTime,
            state: MarketState.Active,
            outcome: false,
            totalYesShares: initialShares,
            totalNoShares: initialShares,
            initialLiquidity: msg.value,
            k: k
        });
    }

    /**
     * @dev Purchase YES or NO shares using AMM pricing (like Uniswap)
     * Price is determined by the constant product formula: x * y = k
     */
    function buyShares(bool _buyYes, uint256 _shares) external payable onlyActive {
        if (_shares == 0) revert InvalidShareAmount();
        
        uint256 cost = calculateCost(_buyYes, _shares);
        if (msg.value < cost) revert InsufficientPayment();
        
        // Take platform fee
        uint256 fee = (cost * PLATFORM_FEE) / BASIS_POINTS;
        if (fee > 0) {
            treasury.collectFee{value: fee}();
        }
        
        // Update the AMM pools
        if (_buyYes) {
            // Buying YES: remove YES shares from pool, add to user
            if (marketInfo.totalYesShares < _shares) revert InsufficientLiquidity();
            
            yesToken.mint(msg.sender, _shares);
            userYesShares[msg.sender] += _shares;
            marketInfo.totalYesShares -= _shares; // Remove from AMM pool
        } else {
            // Buying NO: remove NO shares from pool, add to user
            if (marketInfo.totalNoShares < _shares) revert InsufficientLiquidity();
            
            noToken.mint(msg.sender, _shares);
            userNoShares[msg.sender] += _shares;
            marketInfo.totalNoShares -= _shares; // Remove from AMM pool
        }
        
        // Track bettor for first bet
        if ((userYesShares[msg.sender] == _shares && userNoShares[msg.sender] == 0) ||
            (userNoShares[msg.sender] == _shares && userYesShares[msg.sender] == 0)) {
            bettors.push(msg.sender);
        }
        
        // Refund excess payment
        if (msg.value > cost) {
            payable(msg.sender).transfer(msg.value - cost);
        }
        
        emit SharesPurchased(msg.sender, _buyYes, _shares, cost);
    }

    /**
     * @dev Calculate cost using AMM constant product formula
     * Similar to Uniswap: when you buy YES shares, YES becomes more expensive
     */
    function calculateCost(bool _buyYes, uint256 _shares) public view returns (uint256) {
        if (_shares == 0) return 0;
        
        uint256 yesPool = marketInfo.totalYesShares;
        uint256 noPool = marketInfo.totalNoShares;
        
        if (yesPool == 0 || noPool == 0) revert InsufficientLiquidity();
        
        if (_buyYes) {
            // Buying YES: price goes up as YES pool decreases
            if (_shares >= yesPool) revert InsufficientLiquidity();
            
            // New YES pool after purchase
            uint256 newYesPool = yesPool - _shares;
            // New NO pool needed to maintain constant product k
            uint256 newNoPool = marketInfo.k / newYesPool;
            // Cost is the additional NO tokens needed
            uint256 additionalNoTokens = newNoPool - noPool;
            
            // Convert to ETH cost (1000 shares = 1 ETH)
            return (additionalNoTokens * 1 ether) / 1000;
        } else {
            // Buying NO: price goes up as NO pool decreases  
            if (_shares >= noPool) revert InsufficientLiquidity();
            
            // New NO pool after purchase
            uint256 newNoPool = noPool - _shares;
            // New YES pool needed to maintain constant product k
            uint256 newYesPool = marketInfo.k / newNoPool;
            // Cost is the additional YES tokens needed
            uint256 additionalYesTokens = newYesPool - yesPool;
            
            // Convert to ETH cost (1000 shares = 1 ETH)
            return (additionalYesTokens * 1 ether) / 1000;
        }
    }

    /**
     * @dev Get current price per share for both outcomes
     */
    function getCurrentOdds() external view returns (uint256 yesPrice, uint256 noPrice) {
        // Price for 1 share of each outcome
        if (marketInfo.totalYesShares > 1 && marketInfo.totalNoShares > 1) {
            yesPrice = calculateCost(true, 1);
            noPrice = calculateCost(false, 1);
        } else {
            // Fallback if pools are too small
            yesPrice = 0.001 ether;
            noPrice = 0.001 ether;
        }
    }

    /**
     * @dev Get the current implied probability (YES price / (YES + NO price))
     */
    function getImpliedProbability() external view returns (uint256) {
        if (marketInfo.totalYesShares == 0 || marketInfo.totalNoShares == 0) {
            return 5000; // 50% if no data
        }
        
        // Implied probability based on pool ratio
        // If more people bought YES, YES pool is smaller, implied probability higher
        uint256 totalShares = marketInfo.totalYesShares + marketInfo.totalNoShares;
        return (marketInfo.totalNoShares * 10000) / totalShares; // Basis points
    }

    /**
     * @dev Resolve the market outcome
     */
    function resolveMarket(bool _outcome) external onlyCreatorOrModerator {
        if (block.timestamp < marketInfo.resolutionTime) revert TooEarlyToResolve();
        if (marketInfo.state != MarketState.Active) revert MarketAlreadyResolved();
        
        marketInfo.state = MarketState.Resolved;
        marketInfo.outcome = _outcome;
        
        emit MarketResolved(_outcome);
    }

    /**
     * @dev Claim winnings from resolved market
     */
    function claimWinnings() external {
        if (marketInfo.state != MarketState.Resolved) revert MarketNotResolved();
        if (hasClaimed[msg.sender]) revert AlreadyClaimed();
        
        uint256 winningShares = marketInfo.outcome ? userYesShares[msg.sender] : userNoShares[msg.sender];
        if (winningShares == 0) revert NoWinningShares();
        
        hasClaimed[msg.sender] = true;
        
        // Calculate payout: winners share the entire betting pool
        uint256 totalWinningShares = 0;
        for (uint256 i = 0; i < bettors.length; i++) {
            address bettor = bettors[i];
            if (marketInfo.outcome) {
                totalWinningShares += userYesShares[bettor];
            } else {
                totalWinningShares += userNoShares[bettor];
            }
        }
        
        if (totalWinningShares == 0) revert InsufficientLiquidity();
        
        uint256 totalPot = address(this).balance;
        uint256 payout = (winningShares * totalPot) / totalWinningShares;
        
        payable(msg.sender).transfer(payout);
        
        emit WinningsClaimed(msg.sender, payout);
    }

    // View functions
    function getMarketInfo() external view returns (MarketInfo memory) {
        return marketInfo;
    }

    function getUserPosition(address _user) external view returns (uint256 yesShares, uint256 noShares) {
        yesShares = userYesShares[_user];
        noShares = userNoShares[_user];
    }

    function getTotalShares() external view returns (uint256 yes, uint256 no) {
        yes = marketInfo.totalYesShares;
        no = marketInfo.totalNoShares;
    }

    receive() external payable {} // Allow contract to receive ETH
} 