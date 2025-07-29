# On-Chain + Supabase Integration

This document explains how OverUnder connects on-chain smart contract data with Supabase database storage.

## Overview

The platform uses a **hybrid approach**:
1. **Smart contracts** handle the core betting logic, funds, and immutable data
2. **Supabase** stores user-friendly data, metadata, and enables fast queries

## Database Schema Changes

### Required Migration

Run this SQL in your Supabase database:

```sql
-- Add on-chain connection fields
ALTER TABLE bets 
ADD COLUMN onchain_bet_id INTEGER,
ADD COLUMN onchain_tx_hash TEXT;

-- Add indexes for performance
CREATE INDEX idx_bets_onchain_bet_id ON bets(onchain_bet_id);
CREATE INDEX idx_bets_onchain_tx_hash ON bets(onchain_tx_hash);
```

### Updated Bets Table Schema

```typescript
interface Bet {
  id: string;                    // Supabase UUID
  description: string;           // Combined question + description
  bet_type: 'binary' | 'overunder';
  community_id: string | null;
  creator_id: string;           // Supabase user ID
  deadline: string;             // ISO timestamp
  fixed_share_price: number;    // ETH amount
  resolution_status: 'open' | 'resolved';
  resolved_outcome: string | null;
  onchain_bet_id: number | null;    // 🆕 Smart contract bet ID
  onchain_tx_hash: string | null;   // 🆕 Creation transaction hash
  created_at: string;
  updated_at: string;
}
```

## Bet Creation Flow

### 1. Frontend Validation
- User fills out bet creation form
- Form validates required fields
- Checks wallet connection

### 2. On-Chain Creation
```typescript
// Create bet on smart contract first
const result = await createBet({
  question: "Will the Lakers win?",
  description: "NBA championship 2024",
  bettingOptions: ["Yes", "No"],
  deadline: new Date("2024-06-01"),
  category: "Sports",
  stakeAmount: "0.1" // ETH
});
```

### 3. Transaction Confirmation
- Wait for transaction to be mined
- Extract bet ID from event logs
- Parse `BetCreated` event

### 4. Supabase Storage
```typescript
// Store in database with on-chain connection
const betData = {
  description: `${question}\n\n${description}`,
  bet_type: 'binary',
  creator_id: user.id,
  deadline: deadline.toISOString(),
  fixed_share_price: parseFloat(stakeAmount),
  onchain_bet_id: extractedBetId,     // 🔗 Connection!
  onchain_tx_hash: receipt.transactionHash
};

await supabase.from('bets').insert(betData);
```

## Key Benefits

### 🔗 **Bidirectional Connection**
- Supabase records link to on-chain data via `onchain_bet_id`
- Transaction hashes provide audit trail
- Can verify any bet on blockchain explorer

### ⚡ **Performance**
- Fast queries from Supabase for UI
- Complex betting logic handled on-chain
- Best of both worlds

### 🛡️ **Security & Trust**
- Core betting logic is immutable on blockchain
- Funds are secured by smart contracts
- Supabase provides user experience layer

### 🔍 **Transparency**
- All betting actions are on-chain
- Users can verify bets independently
- Transaction hashes provide proof

## Data Flow Examples

### Creating a Bet
```
User Form → Smart Contract → Event Logs → Supabase
```

### Viewing Bets
```
Frontend → Supabase (fast) → Smart Contract (verification)
```

### Placing Wagers
```
User → Smart Contract → Event Logs → Supabase Update
```

## Integration Functions

### Utility Functions
- `extractBetIdFromReceipt()` - Parse bet ID from transaction logs
- `createSupabaseBetData()` - Format data for database storage
- `useCreateBet()` - React hook for bet creation

### Error Handling
- Graceful fallbacks if on-chain fails
- Transaction confirmation waiting
- User-friendly error messages

## Future Enhancements

1. **Automatic Sync**: Background job to sync on-chain events with Supabase
2. **Conflict Resolution**: Handle cases where on-chain and database diverge
3. **Event Indexing**: More sophisticated event parsing and storage
4. **Gas Optimization**: Batch operations and gas estimation

## Troubleshooting

### Common Issues
1. **Transaction Fails**: Check gas limits and network connectivity
2. **Bet ID Not Found**: Verify event logs and transaction success
3. **Database Sync**: Manual verification against smart contract

### Debug Commands
```typescript
// Check on-chain bet
const bet = await contract.getBet(betId);

// Verify in Supabase
const { data } = await supabase
  .from('bets')
  .select('*')
  .eq('onchain_bet_id', betId);
``` 