// Token Configuration
// Set TEST_MODE to false to use real token balance fetching
import { Connection, PublicKey } from '@solana/web3.js';
import { getAccount, getAssociatedTokenAddress, getMint } from '@solana/spl-token';

// ============ CONFIGURATION ============
export const TEST_MODE = false; // Set to false for production with real token
export const TOKEN_SYMBOL = '$cpw3'; // Token symbol
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
    console.log(`[Token] Fetching balance for wallet: ${walletAddress.slice(0, 8)}...`);
    // Use a public RPC that allows browser requests (Solana's public RPC blocks them)
    // Options: Ankr, Helius, QuickNode - using Ankr's free public endpoint
    const connection = new Connection('https://rpc.ankr.com/solana', 'confirmed');
    const walletPubkey = new PublicKey(walletAddress);
    const mintPubkey = new PublicKey(TOKEN_MINT);
    
    // First, get the mint info to determine decimals
    let decimals = 6; // Default fallback
    try {
      const mintInfo = await getMint(connection, mintPubkey);
      decimals = mintInfo.decimals;
      console.log(`[Token] Mint decimals: ${decimals}`);
    } catch (mintError) {
      console.warn(`[Token] Could not fetch mint info, using default decimals: ${decimals}`, mintError);
    }
    
    // Get the associated token account address
    const tokenAccount = await getAssociatedTokenAddress(mintPubkey, walletPubkey);
    console.log(`[Token] Token account: ${tokenAccount.toBase58()}`);
    
    try {
      // Fetch the token account
      const accountInfo = await getAccount(connection, tokenAccount);
      const rawBalance = Number(accountInfo.amount);
      const balance = rawBalance / Math.pow(10, decimals);
      console.log(`[Token] Raw balance: ${rawBalance}, Decimals: ${decimals}, Final balance: ${balance} ${TOKEN_SYMBOL}`);
      console.log(`[Token] Tier: ${getTierFromBalance(balance)}`);
      return balance;
    } catch (error: any) {
      // Token account doesn't exist (user doesn't hold any tokens)
      if (error.message?.includes('could not find account') || error.message?.includes('InvalidAccountData')) {
        console.log(`[Token] No token account found for ${walletAddress.slice(0, 8)}... (balance: 0)`);
        return 0;
      }
      console.error(`[Token] Error fetching account:`, error);
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

