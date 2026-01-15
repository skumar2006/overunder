import { supabase } from './supabase';
import { walletService } from './walletService';
import { OVERUNDER_ABI, MARKET_ABI } from './contracts/abis';

export interface TransactionResult {
  success: boolean;
  transactionHash?: string;
  error?: string;
}

export interface CreateBetParams {
  question: string;
  description: string;
  resolutionTime: number;
  category: string;
  initialAmount: string; // Amount in USD to fund the bet
}

export interface PlaceBetParams {
  betId: string;
  buyYes: boolean;
  shares: number;
  amount: string; // Amount in USD
}

class TransactionService {
  private readonly OVERUNDER_CONTRACT_ADDRESS = '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0';

  /**
   * Create a new bet using custodial wallet
   */
  async createBet(userId: string, params: CreateBetParams): Promise<TransactionResult> {
    try {
      // Get user's wallet
      const wallet = await this.getUserWallet(userId);
      if (!wallet) {
        return { success: false, error: 'User wallet not found' };
      }

      // Convert USD amount to ETH (simplified conversion for demo)
      const ethAmount = (parseFloat(params.initialAmount) / 2000).toString(); // Assuming $2000/ETH

      // Call createMarket function on contract
      const tx = await walletService.callContract(
        wallet.encryptedPrivateKey,
        this.OVERUNDER_CONTRACT_ADDRESS,
        OVERUNDER_ABI,
        'createMarket',
        [params.question, params.description, params.resolutionTime, params.category],
        ethAmount
      );

      // Deduct virtual balance
      await this.deductVirtualBalance(userId, parseFloat(params.initialAmount));

      // Record transaction in database
      await this.recordTransaction(userId, 'create_bet', params.initialAmount, tx.hash);

      return {
        success: true,
        transactionHash: tx.hash
      };
    } catch (error) {
      console.error('Error creating bet:', error);
      return {
        success: false,
        error: 'Failed to create bet'
      };
    }
  }

  /**
   * Place a bet using custodial wallet
   */
  async placeBet(userId: string, params: PlaceBetParams): Promise<TransactionResult> {
    try {
      // Get user's wallet
      const wallet = await this.getUserWallet(userId);
      if (!wallet) {
        return { success: false, error: 'User wallet not found' };
      }

      // Check virtual balance
      const hasBalance = await this.checkVirtualBalance(userId, parseFloat(params.amount));
      if (!hasBalance) {
        return { success: false, error: 'Insufficient balance' };
      }

      // Convert USD to ETH for blockchain transaction
      const ethAmount = (parseFloat(params.amount) / 2000).toString();

      // Get the market contract address from the bet
      const marketAddress = await this.getBetMarketAddress(params.betId);
      if (!marketAddress) {
        return { success: false, error: 'Market not found' };
      }

      // Call buyShares function on market contract
      const tx = await walletService.callContract(
        wallet.encryptedPrivateKey,
        marketAddress,
        MARKET_ABI,
        'buyShares',
        [params.buyYes, params.shares],
        ethAmount
      );

      // Deduct virtual balance
      await this.deductVirtualBalance(userId, parseFloat(params.amount));

      // Record transaction
      await this.recordTransaction(userId, 'place_bet', params.amount, tx.hash);

      // Update shares in database
      await this.updateUserShares(userId, params.betId, params.buyYes ? 'yes' : 'no', params.shares);

      return {
        success: true,
        transactionHash: tx.hash
      };
    } catch (error) {
      console.error('Error placing bet:', error);
      return {
        success: false,
        error: 'Failed to place bet'
      };
    }
  }

  /**
   * Fund a custodial wallet with test ETH (for development)
   */
  async fundWallet(userId: string): Promise<TransactionResult> {
    try {
      const wallet = await this.getUserWallet(userId);
      if (!wallet) {
        return { success: false, error: 'User wallet not found' };
      }

      // Get wallet address and fund it with test ETH
      const { data: walletData } = await supabase!
        .from('user_wallets')
        .select('wallet_address')
        .eq('user_id', userId)
        .single();

      if (!walletData) {
        return { success: false, error: 'Wallet address not found' };
      }

      // Fund with 1 ETH for testing
      const txHash = await walletService.fundWallet(walletData.wallet_address, '1.0');

      return {
        success: true,
        transactionHash: txHash
      };
    } catch (error) {
      console.error('Error funding wallet:', error);
      return {
        success: false,
        error: 'Failed to fund wallet'
      };
    }
  }

  /**
   * Get user's encrypted wallet data
   */
  private async getUserWallet(userId: string) {
    if (!supabase) return null;

    const { data } = await supabase
      .from('user_wallets')
      .select('encrypted_private_key, wallet_address')
      .eq('user_id', userId)
      .single();

    return data;
  }

  /**
   * Check if user has sufficient virtual balance
   */
  private async checkVirtualBalance(userId: string, amount: number): Promise<boolean> {
    if (!supabase) return false;

    const { data } = await supabase
      .from('wallet_balances')
      .select('balance')
      .eq('user_id', userId)
      .single();

    return data ? data.balance >= amount : false;
  }

  /**
   * Deduct amount from user's virtual balance
   */
  private async deductVirtualBalance(userId: string, amount: number): Promise<void> {
    if (!supabase) return;

    await supabase.rpc('deduct_balance', {
      user_id: userId,
      amount: amount
    });
  }

  /**
   * Record transaction in database
   */
  private async recordTransaction(
    userId: string,
    type: string,
    amount: string,
    txHash: string
  ): Promise<void> {
    if (!supabase) return;

    await supabase
      .from('transactions')
      .insert({
        user_id: userId,
        transaction_type: type,
        amount: parseFloat(amount),
        transaction_hash: txHash,
        status: 'completed'
      });
  }

  /**
   * Update user's shares in database
   */
  private async updateUserShares(
    userId: string,
    betId: string,
    side: string,
    shares: number
  ): Promise<void> {
    if (!supabase) return;

    // Use upsert to either create or update shares
    await supabase
      .from('shares_owned')
      .upsert({
        user_id: userId,
        bet_id: betId,
        side: side,
        shares_owned: shares
      }, {
        onConflict: 'user_id,bet_id,side'
      });
  }

  /**
   * Get market address for a bet (simplified - in reality would query the contract)
   */
  private async getBetMarketAddress(betId: string): Promise<string | null> {
    // This is a simplified implementation
    // In reality, you'd query the OverUnder contract to get the market address for a bet ID
    // For now, we'll use a placeholder
    return '0x' + betId.padStart(40, '0');
  }
}

export const transactionService = new TransactionService();