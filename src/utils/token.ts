// Token Configuration
// Set TEST_MODE to false to use real token balance fetching
import { Connection, PublicKey, TokenAccountsFilter } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';

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
  
  // Real token balance fetching - works with all token types including pump.fun
  try {
    console.log(`[Token] Fetching balance for wallet: ${walletAddress.slice(0, 8)}...`);
    
    // Use Helius RPC
    const rpcUrl = 'https://mainnet.helius-rpc.com/?api-key=1b53e1d5-75e3-43bf-a559-52dc278ca7bf';
    const connection = new Connection(rpcUrl, 'confirmed');
    
    const walletPubkey = new PublicKey(walletAddress);
    const mintPubkey = new PublicKey(TOKEN_MINT);
    
    // Use getTokenAccountsByOwner - works with ALL token types (standard SPL & pump.fun)
    // This finds any token account for this mint owned by the wallet
    const filter: TokenAccountsFilter = { mint: mintPubkey };
    
    console.log(`[Token] Searching for token accounts with mint: ${TOKEN_MINT}`);
    
    const tokenAccounts = await connection.getTokenAccountsByOwner(walletPubkey, filter);
    
    console.log(`[Token] Found ${tokenAccounts.value.length} token account(s)`);
    
    if (tokenAccounts.value.length === 0) {
      console.log(`[Token] No token accounts found for ${walletAddress.slice(0, 8)}... (balance: 0)`);
      return 0;
    }
    
    // Sum up balance from all token accounts (usually just 1)
    let totalBalance = 0;
    const decimals = 6; // pump.fun tokens use 6 decimals
    
    for (const account of tokenAccounts.value) {
      // Parse the account data to get the balance
      // Token account data structure: mint (32) + owner (32) + amount (8) + ...
      const data = account.account.data;
      // Amount is at bytes 64-72 (after mint and owner)
      const rawAmount = data.readBigUInt64LE(64);
      const balance = Number(rawAmount) / Math.pow(10, decimals);
      console.log(`[Token] Account ${account.pubkey.toBase58().slice(0, 8)}...: ${balance} ${TOKEN_SYMBOL}`);
      totalBalance += balance;
    }
    
    console.log(`[Token] Total balance: ${totalBalance} ${TOKEN_SYMBOL}`);
    console.log(`[Token] Tier: ${getTierFromBalance(totalBalance)}`);
    return totalBalance;
    
  } catch (error) {
    console.error('[Token] Error fetching token balance:', error);
    return 0;
  }
}

// Check if wallet is a holder (has any tier)
export function isHolder(balance: number): boolean {
  return balance >= HOLDER_TIERS.bronze.minBalance;
}

