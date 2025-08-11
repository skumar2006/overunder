import { ethers } from 'ethers';
import CryptoJS from 'crypto-js';
import { getEnvironmentConfig, NETWORKS } from './contracts/config';

interface CustodialWallet {
  address: string;
  encryptedPrivateKey: string;
}

interface DecryptedWallet {
  address: string;
  privateKey: string;
  signer: ethers.Wallet;
}

class WalletService {
  private readonly encryptionKey: string;
  private provider: ethers.JsonRpcProvider;

  constructor() {
    // In production, this should be a secure environment variable
    this.encryptionKey = process.env.WALLET_ENCRYPTION_KEY || 'default-dev-key-change-in-production';
    
    // Get the correct RPC provider based on environment
    const { defaultChainId } = getEnvironmentConfig();
    const NETWORK_BY_CHAIN_ID = {
      31337: NETWORKS.localhost,
      84532: NETWORKS.baseSepolia,
      8453: NETWORKS.baseMainnet,
    } as const;
    
    const selectedNetwork = NETWORK_BY_CHAIN_ID[defaultChainId];
    this.provider = new ethers.JsonRpcProvider(selectedNetwork.rpcUrl);
    
    console.log('🔧 WalletService initialized with RPC:', selectedNetwork.rpcUrl);
  }

  /**
   * Generate a new custodial wallet
   */
  async generateWallet(): Promise<CustodialWallet> {
    try {
      // Generate new random wallet
      const wallet = ethers.Wallet.createRandom();
      
      // Encrypt the private key
      const encryptedPrivateKey = this.encryptPrivateKey(wallet.privateKey);

      return {
        address: wallet.address,
        encryptedPrivateKey
      };
    } catch (error) {
      console.error('Error generating wallet:', error);
      throw new Error('Failed to generate wallet');
    }
  }

  /**
   * Decrypt and get a wallet instance for transactions
   */
  async getWallet(encryptedPrivateKey: string): Promise<DecryptedWallet> {
    try {
      const privateKey = this.decryptPrivateKey(encryptedPrivateKey);
      const wallet = new ethers.Wallet(privateKey, this.provider);

      return {
        address: wallet.address,
        privateKey,
        signer: wallet
      };
    } catch (error) {
      console.error('Error decrypting wallet:', error);
      throw new Error('Failed to decrypt wallet');
    }
  }

  /**
   * Get wallet balance
   */
  async getWalletBalance(address: string): Promise<string> {
    try {
      const balance = await this.provider.getBalance(address);
      return ethers.formatEther(balance);
    } catch (error) {
      console.error('Error getting wallet balance:', error);
      return '0';
    }
  }

  /**
   * Send transaction using custodial wallet
   */
  async sendTransaction(
    encryptedPrivateKey: string,
    to: string,
    value: string,
    data?: string
  ): Promise<string> {
    try {
      const wallet = await this.getWallet(encryptedPrivateKey);
      
      const transaction = {
        to,
        value: ethers.parseEther(value),
        data: data || '0x',
      };

      const tx = await wallet.signer.sendTransaction(transaction);
      await tx.wait();

      return tx.hash;
    } catch (error) {
      console.error('Error sending transaction:', error);
      throw new Error('Failed to send transaction');
    }
  }

  /**
   * Call contract function using custodial wallet
   */
  async callContract(
    encryptedPrivateKey: string,
    contractAddress: string,
    abi: any[],
    functionName: string,
    args: any[] = [],
    value: string = '0'
  ): Promise<any> {
    try {
      const wallet = await this.getWallet(encryptedPrivateKey);
      const contract = new ethers.Contract(contractAddress, abi, wallet.signer);
      
      const options = value !== '0' ? { value: ethers.parseEther(value) } : {};
      const tx = await contract[functionName](...args, options);
      
      // If it's a state-changing function, wait for confirmation
      if (tx.hash) {
        await tx.wait();
        return tx;
      }
      
      // If it's a view function, return the result directly
      return tx;
    } catch (error) {
      console.error('Error calling contract:', error);
      throw new Error(`Failed to call contract function: ${functionName}`);
    }
  }

  /**
   * Fund a custodial wallet from the master wallet (for testing)
   */
  async fundWallet(targetAddress: string, amount: string): Promise<string> {
    try {
      // Use the first Hardhat account as the funding source
      const masterPrivateKey = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
      const masterWallet = new ethers.Wallet(masterPrivateKey, this.provider);

      const tx = await masterWallet.sendTransaction({
        to: targetAddress,
        value: ethers.parseEther(amount)
      });

      await tx.wait();
      return tx.hash;
    } catch (error) {
      console.error('Error funding wallet:', error);
      throw new Error('Failed to fund wallet');
    }
  }

  /**
   * Encrypt private key
   */
  private encryptPrivateKey(privateKey: string): string {
    return CryptoJS.AES.encrypt(privateKey, this.encryptionKey).toString();
  }

  /**
   * Decrypt private key
   */
  private decryptPrivateKey(encryptedPrivateKey: string): string {
    const bytes = CryptoJS.AES.decrypt(encryptedPrivateKey, this.encryptionKey);
    return bytes.toString(CryptoJS.enc.Utf8);
  }

  /**
   * Validate Ethereum address
   */
  isValidAddress(address: string): boolean {
    return ethers.isAddress(address);
  }
}

export const walletService = new WalletService();