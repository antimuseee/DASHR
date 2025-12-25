// Token Configuration
// Set TEST_MODE to false to use real token balance fetching
import { Connection, PublicKey } from '@solana/web3.js';
import { getAccount, getAssociatedTokenAddress } from '@solana/spl-token';

// ============ CONFIGURATION ============
export const TEST_MODE = false; // Set to false for production with real token
export const TOKEN_SYMBOL = 'PUMP'; // Token symbol
export const TOKEN_MINT = '63RFxQy57mJKhRhWbdEQNcwmQ5kFfmSGJpVxKeVCpump'; // Real token mint address

// Mock balance for testing (only used when TEST_MODE = true)
export const MOCK_BALANCE = 1000000; // Set this to test different tiers (Diamond tier)

// ============ HOLDER TIERS ============
export type HolderTier = 'none' | 'bronze' | 'silver' | 'gold' | 'diamond';

export interface TierInfo {
  tier: HolderTier;
  name: string;
  emoji: string;
  minBalance: number;
  color: string;
  perks: string[];
}

export const HOLDER_TIERS: Record<HolderTier, TierInfo> = {
  none: {
    tier: 'none',
    name: 'Non-Holder',
    emoji: '',
    minBalance: 0,
    color: '#888888',
    perks: [],
  },
  bronze: {
    tier: 'bronze',
    name: 'Bronze',
    emoji: '🥉',
    minBalance: 1000,
    color: '#cd7f32',
    perks: ['Holder badge', 'Bronze Runner skin'],
  },
  silver: {
    tier: 'silver',
    name: 'Silver',
    emoji: '🥈',
    minBalance: 10000,
    color: '#c0c0c0',
    perks: ['All Bronze perks', 'Silver & Chrome skins', 'Neon trail effect'],
  },
  gold: {
    tier: 'gold',
    name: 'Gold',
    emoji: '🥇',
    minBalance: 100000,
    color: '#ffd700',
    perks: ['All Silver perks', 'Exclusive game mode', 'All cosmetics unlocked'],
  },
  diamond: {
    tier: 'diamond',
    name: 'Diamond',
    emoji: '💎',
    minBalance: 1000000,
    color: '#00ffff',
    perks: ['All Gold perks', 'Whale status badge', 'Highlighted leaderboard name'],
  },
};

// ============ HELPER FUNCTIONS ============

// Get tier based on token balance
export function getTierFromBalance(balance: number): HolderTier {
  if (balance >= HOLDER_TIERS.diamond.minBalance) return 'diamond';
  if (balance >= HOLDER_TIERS.gold.minBalance) return 'gold';
  if (balance >= HOLDER_TIERS.silver.minBalance) return 'silver';
  if (balance >= HOLDER_TIERS.bronze.minBalance) return 'bronze';
  return 'none';
}

// Get tier info from balance
export function getTierInfo(balance: number): TierInfo {
  const tier = getTierFromBalance(balance);
  return HOLDER_TIERS[tier];
}

// Format balance with commas
export function formatTokenBalance(balance: number): string {
  return Math.floor(balance).toLocaleString();
}

// Get mock or real balance
export async function getTokenBalance(walletAddress: string | null): Promise<number> {
  if (!walletAddress) return 0;
  
  if (TEST_MODE) {
    // Return mock balance for testing
    console.log(`[Token] TEST MODE: Returning mock balance of ${MOCK_BALANCE} ${TOKEN_SYMBOL}`);
    return MOCK_BALANCE;
  }
  
  // Real token balance fetching using Solana SPL token program
  try {
    // Use mainnet for real token
    const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
    const walletPubkey = new PublicKey(walletAddress);
    const mintPubkey = new PublicKey(TOKEN_MINT);
    
    // Get the associated token account address
    const tokenAccount = await getAssociatedTokenAddress(mintPubkey, walletPubkey);
    
    try {
      // Fetch the token account
      const accountInfo = await getAccount(connection, tokenAccount);
      // Convert from token decimals (usually 6-9 for most tokens, using 6 as default)
      // For pump.fun tokens, they typically use 6 decimals
      const decimals = 6; // You may need to adjust this based on your token
      const balance = Number(accountInfo.amount) / Math.pow(10, decimals);
      console.log(`[Token] Fetched balance: ${balance} ${TOKEN_SYMBOL} for ${walletAddress.slice(0, 8)}...`);
      return balance;
    } catch (error: any) {
      // Token account doesn't exist (user doesn't hold any tokens)
      if (error.message?.includes('could not find account')) {
        console.log(`[Token] No token account found for ${walletAddress.slice(0, 8)}... (balance: 0)`);
        return 0;
      }
      throw error;
    }
  } catch (error) {
    console.error('[Token] Error fetching token balance:', error);
    return 0;
  }
}

// Check if wallet is a holder (has any tier)
export function isHolder(balance: number): boolean {
  return balance >= HOLDER_TIERS.bronze.minBalance;
}

