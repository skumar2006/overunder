// Contract ABIs
export { OVERUNDER_ABI, TREASURY_ABI } from './abis';

// Types
export type {
  Bet,
  BetData,
  Wager,
  WagerData,
  UserProfile,
  UserStats,
  CreateBetForm,
  PlaceWagerForm,
  ContractConfig,
  BetCreatedEvent,
  WagerPlacedEvent,
  BetResolvedEvent,
  WinningsClaimedEvent,
  BetStatus,
  BetCategory,
  ContractError,
  TransactionResult,
  ContractCallResult,
} from './types';

// Configuration
export {
  NETWORKS,
  CONTRACT_ADDRESSES,
  CONTRACT_SETTINGS,
  getContractConfig,
  updateContractAddresses,
  getEnvironmentConfig,
} from './config';

// Utilities
export {
  transformBetData,
  transformWagerData,
  transformUserProfile,
  validateBetCreation,
  validateWagerAmount,
  calculateOdds,
  calculatePotentialPayout,
  formatTimeRemaining,
  formatNumber,
  formatETH,
  getBetStatus,
  shortenAddress,
  handleContractError,
  extractBetIdFromReceipt,
  createSupabaseBetData,
} from './utils';

// Custodial Bet Creation Hook
export { useCreateBet } from './betCreationHooks';

// Dispute System Hooks
export {
  useProposeBetResolution,
  useInitiateDispute,
  useVoteOnDispute,
  useResolveDispute,
  useGetDisputeStatus,
  useCanVote,
  useGetVoteWeight,
  useDisputeConstants,
} from './disputeHooks';

// React Hooks - Custodial System (wagmi-based hooks temporarily disabled)
// TODO: Implement custodial versions of these hooks
// export {
//   useContractConfig,   // Causes "chain not defined" error
//   useGetBet,
//   useGetAllBets,
//   useGetUserBets,
//   useGetUserWagers,
//   useGetBetWagers,
//   useGetUserProfile,
//   useGetUserPosition,
//   useCreateBet,         // Used in create bet page - needs custodial implementation
//   usePlaceWager,
//   useResolveBet,
//   useClaimWinnings,
//   useUpdateProfile,
//   useWaitForTransaction,
//   useContractStatus,
//   useMinimumBetAmount,
// } from './hooks'; 