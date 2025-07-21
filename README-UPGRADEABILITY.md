# 🚀 OverUnder Upgradeable Smart Contract System

This system implements a fully upgradeable prediction market platform using the **UUPS (Universal Upgradeable Proxy Standard)** pattern. The contracts can be upgraded after deployment while preserving all user data and state.

## 🏗️ Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Proxy         │    │ Implementation  │
│                 │    │   Contract      │    │   Contract      │
│                 │────│                 │────│                 │
│ (Always same    │    │ (Always same    │    │ (Can be         │
│  address)       │    │  address)       │    │  upgraded)      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
        │                       │                       │
        │                       │                       │
        ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   User Data     │    │   Proxy Storage │    │   Logic Code    │
│   Preserved     │    │   Preserved     │    │   Updatable     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 📁 Contract Structure

### Core Contracts

1. **OverunderUpgradeable.sol** - Main betting platform contract
2. **MarketFactoryUpgradeable.sol** - Factory for creating markets
3. **Treasury.sol** - Fee collection (non-upgradeable)
4. **Market.sol** - Individual market contracts (non-upgradeable)
5. **OutcomeToken.sol** - ERC20-like tokens for YES/NO shares

### Upgrade Examples

1. **OverunderUpgradeableV2.sol** - Enhanced version with:
   - 🌟 Premium membership system
   - 🔗 Referral rewards
   - 📊 Advanced analytics
   - 📈 Category popularity tracking

## 🚀 Quick Start

### 1. Installation

```bash
npm install @openzeppelin/contracts-upgradeable @openzeppelin/hardhat-upgrades
```

### 2. Deploy Initial Version

```bash
# Start local network
npx hardhat node

# Deploy V1 contracts
npx hardhat run scripts/deploy-upgradeable.ts --network localhost
```

### 3. Upgrade to V2

```bash
# Deploy V2 upgrade
npx hardhat run scripts/upgrade-v2.ts --network localhost
```

## 🔧 How Upgradeability Works

### UUPS Pattern Benefits

✅ **Gas Efficient** - Upgrade logic in implementation, not proxy  
✅ **Secure** - Only authorized accounts can upgrade  
✅ **Flexible** - Can add new storage variables and functions  
✅ **State Preservation** - All data remains intact during upgrades  

### Storage Layout Rules

```solidity
contract V1 {
    uint256 public version;      // Slot 0
    bool public paused;          // Slot 1
    mapping(...) public users;   // Slot 2
    uint256[50] private __gap;   // Reserve slots for future
}

contract V2 {
    uint256 public version;      // Slot 0 (unchanged)
    bool public paused;          // Slot 1 (unchanged) 
    mapping(...) public users;   // Slot 2 (unchanged)
    
    // NEW VARIABLES (only add at end)
    uint256 public newFeature;   // Slot 3 (safe to add)
    uint256[49] private __gap;   // Reduced by 1
}
```

## 🛡️ Security Features

### Access Control

- **Owner-only upgrades** - Only contract owner can upgrade
- **Emergency pause** - Admin can pause all operations
- **User blacklisting** - Block malicious users
- **Duration limits** - Prevent invalid market periods

### Upgrade Safety

- **Storage gap reservations** - Prevent storage conflicts
- **Initializer modifiers** - Prevent multiple initialization
- **Custom errors** - Gas-efficient error handling
- **Reentrancy protection** - Prevent attack vectors

## 💎 V2 New Features

### Premium Membership System

```solidity
// Purchase premium membership
function purchasePremiumMembership() external payable;

// Get premium benefits
- Fee discounts (2%)
- Reputation bonuses (10%)
- Access to analytics
- Extended market duration
```

### Referral System

```solidity
// Set referrer when creating profile
function updateProfile(string username, address referrer) external;

// Automatic rewards for successful referrals
- 5% of winnings go to referrer
- Track total referred users
- Cumulative referral earnings
```

### Advanced Analytics (Premium Only)

```solidity
// Get market insights
function getMarketAnalytics() external view returns (
    string[] memory popularCategories,
    uint256[] memory categoryTotals,
    uint256 totalMarkets,
    uint256 totalPremiumMembers
);
```

## 🧪 Testing

### Run All Tests

```bash
# Test original contracts
npx hardhat test test/Overunder.ts

# Test upgradeable system
npx hardhat test test/UpgradeableTest.ts
```

### Test Coverage

- ✅ Proxy deployment
- ✅ State preservation during upgrade
- ✅ Access control enforcement
- ✅ Emergency functions
- ✅ Premium membership features
- ✅ Referral system mechanics
- ✅ Storage layout compatibility

## 📊 Gas Costs

| Operation | Gas Cost | Description |
|-----------|----------|-------------|
| Deploy V1 | ~1.4M gas | Initial proxy deployment |
| Upgrade to V2 | ~38K gas | UUPS upgrade transaction |
| Create Market | ~2.6M gas | Market creation with AMM |
| Premium Purchase | ~120K gas | Buy premium membership |
| Profile Update | ~78K gas | Update with referral |

## 🔄 Upgrade Process

### Step-by-Step Guide

1. **Prepare New Implementation**
   ```solidity
   // Create OverunderUpgradeableV2.sol
   // Add new features while preserving storage layout
   ```

2. **Deploy Upgrade**
   ```bash
   npx hardhat run scripts/upgrade-v2.ts --network <network>
   ```

3. **Verify Upgrade**
   ```bash
   # Check version incremented
   # Verify state preserved
   # Test new features
   ```

### Example Upgrade Script

```typescript
import { ethers, upgrades } from "hardhat";

async function main() {
  const proxyAddress = "0x..."; // Your proxy address
  
  const OverunderV2 = await ethers.getContractFactory("OverunderUpgradeableV2");
  
  // Upgrade proxy to V2
  const upgraded = await upgrades.upgradeProxy(proxyAddress, OverunderV2);
  
  // Initialize V2 features
  await upgraded.initializeV2();
  
  console.log("Upgraded to V2!");
}
```

## 🏗️ Best Practices

### Do's ✅

- Always add new storage variables at the end
- Use storage gaps (`uint256[n] private __gap`)
- Test upgrades thoroughly on testnets
- Use `reinitializer(version)` for new features
- Implement proper access controls
- Document storage layout changes

### Don'ts ❌

- Never change existing variable order
- Don't modify existing function signatures
- Avoid removing storage variables
- Don't skip storage gap updates
- Never upgrade without testing
- Avoid breaking changes in public API

## 🌐 Deployment Addresses

### Localhost (for testing)
```json
{
  "treasury": "0x5FbDB2315678afecb367f032d93F642f64180aa3",
  "overunder": {
    "proxy": "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0",
    "implementation": "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512"
  },
  "marketFactory": {
    "proxy": "0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9",
    "implementation": "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9"
  }
}
```

## 🚨 Emergency Procedures

### Emergency Pause
```bash
# Pause all operations
npx hardhat run scripts/emergency-pause.ts

# Resume operations
npx hardhat run scripts/emergency-unpause.ts
```

### User Management
```bash
# Blacklist malicious user
npx hardhat run scripts/blacklist-user.ts --user 0x...

# Remove from blacklist
npx hardhat run scripts/remove-blacklist.ts --user 0x...
```

## 📚 Additional Resources

- [OpenZeppelin Upgrades Documentation](https://docs.openzeppelin.com/upgrades-plugins/1.x/)
- [EIP-1967: Proxy Storage Slots](https://eips.ethereum.org/EIPS/eip-1967)
- [UUPS vs Transparent Proxy](https://docs.openzeppelin.com/contracts/4.x/api/proxy#UUPSUpgradeable)

## ⚠️ Important Notes

1. **Proxy Address Never Changes** - Always use the proxy address in your frontend
2. **Storage Layout Critical** - Never modify existing storage structure
3. **Test Thoroughly** - Always test upgrades on testnets first
4. **Backup Strategy** - Keep deployment info and upgrade history
5. **Access Control** - Secure upgrade permissions with multisig/timelock

## 🎯 Future Roadmap

- [ ] Multi-outcome markets (beyond YES/NO)
- [ ] Oracle integration for automatic resolution
- [ ] Cross-chain compatibility
- [ ] Governance token for decentralized upgrades
- [ ] Advanced trading features (limit orders, etc.)
- [ ] NFT integration for achievements/badges

---

**Ready to build upgradeable DeFi protocols?** This system provides a solid foundation for evolving your smart contracts while maintaining user trust and data integrity! 🚀 