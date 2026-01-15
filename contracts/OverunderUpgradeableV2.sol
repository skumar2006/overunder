// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./OverunderUpgradeable.sol";

contract OverunderUpgradeableV2 is OverunderUpgradeable {
    
    // Additional modifiers
    modifier notResolved(uint256 _betId) {
        require(!bets[_betId].isResolved, "Bet already resolved");
        _;
    }
    
    // New state for dispute system
    struct Dispute {
        uint256 betId;
        address initiator;
        uint256 proposedOutcome;
        uint256 creatorProposedOutcome;
        uint256 disputeEndTime;
        uint256 totalVotes;
        bool resolved;
        mapping(address => bool) hasVoted;
        mapping(uint256 => uint256) outcomeVotes; // outcome => vote count
    }
    
    // Dispute storage
    mapping(uint256 => Dispute) public disputes;
    mapping(uint256 => bool) public hasDispute;
    
    // Events for dispute system
    event BetResolutionProposed(uint256 indexed betId, uint256 proposedOutcome, address proposer);
    event DisputeInitiated(uint256 indexed betId, address initiator, uint256 proposedOutcome);
    event VoteCast(uint256 indexed betId, address voter, uint256 outcome, uint256 weight);
    event DisputeResolved(uint256 indexed betId, uint256 finalOutcome);
    
    // Constants
    uint256 public constant DISPUTE_PERIOD = 24 hours;
    uint256 public constant VOTING_PERIOD = 48 hours;
    uint256 public constant MIN_DISPUTE_STAKE = 0.01 ether;
    
    /**
     * @dev Propose resolution for a bet (only creator can do this initially)
     */
    function proposeBetResolution(uint256 _betId, uint256 _outcome) 
        external 
        betExists(_betId) 
        notResolved(_betId) 
    {
        Bet storage bet = bets[_betId];
        require(msg.sender == bet.creator, "Only creator can propose resolution");
        require(block.timestamp >= bet.deadlineTimestamp, "Bet still active");
        require(_outcome < bet.bettingOptions.length, "Invalid outcome");
        
        // Store proposed resolution
        disputes[_betId].creatorProposedOutcome = _outcome;
        disputes[_betId].disputeEndTime = block.timestamp + DISPUTE_PERIOD;
        
        emit BetResolutionProposed(_betId, _outcome, msg.sender);
    }
    
    /**
     * @dev Initiate a dispute (any participant can dispute)
     */
    function initiateDispute(uint256 _betId, uint256 _proposedOutcome) 
        external 
        payable 
        betExists(_betId) 
        notResolved(_betId) 
    {
        require(msg.value >= MIN_DISPUTE_STAKE, "Insufficient dispute stake");
        require(disputes[_betId].disputeEndTime > block.timestamp, "Dispute period expired");
        require(!hasDispute[_betId], "Dispute already initiated");
        
        Bet storage bet = bets[_betId];
        require(_proposedOutcome < bet.bettingOptions.length, "Invalid outcome");
        require(_proposedOutcome != disputes[_betId].creatorProposedOutcome, "Same as creator outcome");
        
        // Check if sender participated in the bet
        bool participated = false;
        Wager[] storage wagers = betWagers[_betId];
        for (uint i = 0; i < wagers.length; i++) {
            if (wagers[i].bettor == msg.sender) {
                participated = true;
                break;
            }
        }
        require(participated, "Only participants can dispute");
        
        // Initialize dispute
        hasDispute[_betId] = true;
        Dispute storage dispute = disputes[_betId];
        dispute.betId = _betId;
        dispute.initiator = msg.sender;
        dispute.proposedOutcome = _proposedOutcome;
        dispute.disputeEndTime = block.timestamp + VOTING_PERIOD;
        dispute.resolved = false;
        
        // Initiator's stake counts as first vote
        uint256 voteWeight = getVoteWeight(_betId, msg.sender);
        dispute.outcomeVotes[_proposedOutcome] = voteWeight;
        dispute.hasVoted[msg.sender] = true;
        dispute.totalVotes = voteWeight;
        
        emit DisputeInitiated(_betId, msg.sender, _proposedOutcome);
    }
    
    /**
     * @dev Cast vote in a dispute
     */
    function voteOnDispute(uint256 _betId, uint256 _outcome) 
        external 
        betExists(_betId) 
        notResolved(_betId) 
    {
        require(hasDispute[_betId], "No active dispute");
        Dispute storage dispute = disputes[_betId];
        require(block.timestamp < dispute.disputeEndTime, "Voting period ended");
        require(!dispute.hasVoted[msg.sender], "Already voted");
        
        // Check if sender participated in the bet
        uint256 voteWeight = getVoteWeight(_betId, msg.sender);
        require(voteWeight > 0, "Only participants can vote");
        
        Bet storage bet = bets[_betId];
        require(_outcome < bet.bettingOptions.length, "Invalid outcome");
        
        // Record vote
        dispute.hasVoted[msg.sender] = true;
        dispute.outcomeVotes[_outcome] += voteWeight;
        dispute.totalVotes += voteWeight;
        
        emit VoteCast(_betId, msg.sender, _outcome, voteWeight);
    }
    
    /**
     * @dev Resolve dispute after voting period
     */
    function resolveDispute(uint256 _betId) 
        external 
        betExists(_betId) 
        notResolved(_betId) 
    {
        if (hasDispute[_betId]) {
            Dispute storage dispute = disputes[_betId];
            require(block.timestamp >= dispute.disputeEndTime, "Voting still active");
            require(!dispute.resolved, "Already resolved");
            
            // Find winning outcome
            uint256 winningOutcome = dispute.creatorProposedOutcome;
            uint256 maxVotes = dispute.outcomeVotes[winningOutcome];
            
            Bet storage bet = bets[_betId];
            for (uint256 i = 0; i < bet.bettingOptions.length; i++) {
                if (dispute.outcomeVotes[i] > maxVotes) {
                    maxVotes = dispute.outcomeVotes[i];
                    winningOutcome = i;
                }
            }
            
            // Resolve the bet
            _resolveBet(_betId, winningOutcome);
            dispute.resolved = true;
            
            // Return dispute stake to initiator if they won
            if (winningOutcome == dispute.proposedOutcome && dispute.initiator != address(0)) {
                payable(dispute.initiator).transfer(MIN_DISPUTE_STAKE);
            }
            
            emit DisputeResolved(_betId, winningOutcome);
        } else {
            // No dispute, use creator's proposed outcome
            require(disputes[_betId].disputeEndTime > 0, "No resolution proposed");
            require(block.timestamp >= disputes[_betId].disputeEndTime, "Dispute period not ended");
            
            _resolveBet(_betId, disputes[_betId].creatorProposedOutcome);
        }
    }
    
    /**
     * @dev Get vote weight based on participation
     */
    function getVoteWeight(uint256 _betId, address _voter) public view returns (uint256) {
        // Vote weight is proportional to amount wagered
        uint256 totalStake = 0;
        Wager[] storage wagers = betWagers[_betId];
        
        for (uint i = 0; i < wagers.length; i++) {
            if (wagers[i].bettor == _voter) {
                totalStake += wagers[i].amountStaked;
            }
        }
        
        return totalStake;
    }
    
    /**
     * @dev Internal function to resolve bet
     */
    function _resolveBet(uint256 _betId, uint256 _outcome) internal {
        Bet storage bet = bets[_betId];
        bet.isResolved = true;
        bet.resolvedOutcome = _outcome;
        bet.resolutionTimestamp = block.timestamp;
        
        emit BetResolved(_betId, _outcome, bet.totalPoolAmount);
    }
    
    /**
     * @dev Get dispute status
     */
    function getDisputeStatus(uint256 _betId) external view returns (
        bool isDisputed,
        uint256 proposedByCreator,
        uint256 proposedByDisputer,
        uint256 votingEndsAt,
        uint256 totalVotes,
        uint256[] memory outcomesVoteCounts
    ) {
        Dispute storage dispute = disputes[_betId];
        Bet storage bet = bets[_betId];
        
        outcomesVoteCounts = new uint256[](bet.bettingOptions.length);
        for (uint i = 0; i < bet.bettingOptions.length; i++) {
            outcomesVoteCounts[i] = dispute.outcomeVotes[i];
        }
        
        return (
            hasDispute[_betId],
            dispute.creatorProposedOutcome,
            dispute.proposedOutcome,
            dispute.disputeEndTime,
            dispute.totalVotes,
            outcomesVoteCounts
        );
    }
    
    /**
     * @dev Check if user can vote
     */
    function canVote(uint256 _betId, address _voter) external view returns (bool) {
        if (!hasDispute[_betId]) return false;
        if (disputes[_betId].hasVoted[_voter]) return false;
        if (block.timestamp >= disputes[_betId].disputeEndTime) return false;
        return getVoteWeight(_betId, _voter) > 0;
    }
}