import { useEffect, useMemo, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { useGameStore, gameActions } from '../utils/store';
import { TOKEN_SYMBOL, HOLDER_TIERS, formatTokenBalance, isHolder, TEST_MODE, MOCK_BALANCE, getTierFromBalance } from '../utils/token';
import { autoEquipForTier } from '../utils/cosmetics';
import { getDevice } from '../utils/device';
import { shouldUseMobileDeepLink, connectPhantomMobile, isReturningFromPhantom, processPhantomRedirect } from '../utils/phantomMobile';

// Use Helius RPC for wallet connection (reliable)
// Get API key from environment variable (set in Vercel)
const heliusApiKey = import.meta.env.VITE_HELIUS_API_KEY;
const endpoint = heliusApiKey 
  ? `https://mainnet.helius-rpc.com/?api-key=${heliusApiKey}`
  : 'https://api.mainnet-beta.solana.com'; // Fallback to public RPC if env var not set
const connection = new Connection(endpoint, 'processed');

async function fetchBalance(pk?: PublicKey) {
  if (!pk) return 0;
  const lamports = await connection.getBalance(pk);
  return lamports / LAMPORTS_PER_SOL;
}

// Cache keys for localStorage - persist tier info so returning users don't need to re-verify
const CACHE_KEYS = {
  walletAddress: 'trench-wallet-address',
  tokenBalance: 'trench-token-balance',
  holderTier: 'trench-holder-tier',
  lastVerified: 'trench-last-verified',
};

// Load cached tier data (for returning users)
function loadCachedTier(): { address: string; balance: number; tier: string; timestamp: number } | null {
  try {
    const address = localStorage.getItem(CACHE_KEYS.walletAddress);
    const balance = localStorage.getItem(CACHE_KEYS.tokenBalance);
    const tier = localStorage.getItem(CACHE_KEYS.holderTier);
    const timestamp = localStorage.getItem(CACHE_KEYS.lastVerified);
    
    if (address && balance && tier && timestamp) {
      return {
        address,
        balance: parseFloat(balance),
        tier,
        timestamp: parseInt(timestamp),
      };
    }
  } catch (e) {
    console.error('[WalletUI] Error loading cached tier:', e);
  }
  return null;
}

// Save tier data to cache
function saveCachedTier(address: string, balance: number, tier: string) {
  try {
    localStorage.setItem(CACHE_KEYS.walletAddress, address);
    localStorage.setItem(CACHE_KEYS.tokenBalance, balance.toString());
    localStorage.setItem(CACHE_KEYS.holderTier, tier);
    localStorage.setItem(CACHE_KEYS.lastVerified, Date.now().toString());
    console.log('[WalletUI] Cached tier data for returning user');
  } catch (e) {
    console.error('[WalletUI] Error caching tier:', e);
  }
}

// Clear cached tier data
function clearCachedTier() {
  try {
    localStorage.removeItem(CACHE_KEYS.walletAddress);
    localStorage.removeItem(CACHE_KEYS.tokenBalance);
    localStorage.removeItem(CACHE_KEYS.holderTier);
    localStorage.removeItem(CACHE_KEYS.lastVerified);
  } catch (e) {
    console.error('[WalletUI] Error clearing cache:', e);
  }
}

export default function WalletUI() {
  const { publicKey, connected, connecting, disconnecting, wallet, connect, disconnect } = useWallet();
  const [solBalance, setSolBalance] = useState<number | null>(null);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  const { holderTier, tokenBalance } = useGameStore();
  const [useMobileFlow, setUseMobileFlow] = useState(false);
  
  // Check if we should use mobile deep link flow
  useEffect(() => {
    const shouldUseMobile = shouldUseMobileDeepLink();
    setUseMobileFlow(shouldUseMobile);
    if (shouldUseMobile) {
      console.log('[WalletUI] Using mobile deep link flow for wallet connection');
    }
  }, []);
  
  // Handle return from Phantom mobile redirect
  useEffect(() => {
    if (useMobileFlow && isReturningFromPhantom()) {
      console.log('[WalletUI] Processing return from Phantom mobile...');
      const redirectData = processPhantomRedirect();
      
      if (redirectData) {
        // Trigger wallet connection after redirect
        console.log('[WalletUI] Redirect processed, triggering wallet connect...');
        // The wallet adapter should pick up the connection from the redirect
        if (!connected && wallet) {
          connect().catch(err => {
            console.error('[WalletUI] Error connecting after redirect:', err);
          });
        }
      }
    }
  }, [useMobileFlow, connected, wallet, connect]);
  
  // Debug wallet connection state
  useEffect(() => {
    console.log('[WalletUI] Connection state:', { 
      connected, 
      connecting, 
      disconnecting,
      wallet: wallet?.adapter?.name,
      publicKey: publicKey?.toBase58()?.slice(0, 8),
      useMobileFlow 
    });
  }, [connected, connecting, disconnecting, publicKey, wallet, useMobileFlow]);
  
  const [statusMessage, setStatusMessage] = useState<string>('');
  
  // Custom mobile wallet connect handler
  const handleMobileConnect = () => {
    console.log('[WalletUI] Mobile connect clicked - opening Phantom...');
    connectPhantomMobile();
  };
  
  const handleRefreshBalance = async () => {
    console.log('[WalletUI] Refresh button clicked!');
    console.log('[WalletUI] publicKey:', publicKey?.toBase58());
    console.log('[WalletUI] connected:', connected);
    
    if (!publicKey || !connected) {
      setStatusMessage('❌ Wallet not connected');
      console.log('[WalletUI] Wallet not connected, aborting');
      return;
    }
    
    setIsLoadingBalance(true);
    setStatusMessage('⏳ Fetching balance...');
    
    try {
      const walletAddress = publicKey.toBase58();
      console.log('[WalletUI] Calling updateTokenBalance...');
      await gameActions.updateTokenBalance(walletAddress);
      const newBalance = useGameStore.getState().tokenBalance;
      const newTier = useGameStore.getState().holderTier;
      
      // Cache the refreshed data
      saveCachedTier(walletAddress, newBalance, newTier);
      
      setStatusMessage(`✅ Balance: ${newBalance} | Tier: ${newTier}`);
      console.log('[WalletUI] Balance updated and cached:', { newBalance, newTier });
    } catch (error: any) {
      console.error('[WalletUI] Error refreshing balance:', error);
      setStatusMessage(`❌ Error: ${error.message || 'Unknown error'}`);
    } finally {
      setIsLoadingBalance(false);
      // Clear status message after 5 seconds
      setTimeout(() => setStatusMessage(''), 5000);
    }
  };

  // On mount: Load cached tier for returning users (no wallet needed to show tier)
  useEffect(() => {
    if (TEST_MODE) {
      const mockTier = getTierFromBalance(MOCK_BALANCE);
      console.log(`[TEST MODE] Auto-setting holder: ${MOCK_BALANCE} ${TOKEN_SYMBOL} → ${mockTier}`);
      useGameStore.setState({ 
        tokenBalance: MOCK_BALANCE, 
        holderTier: mockTier,
        walletConnected: true // Simulate connected for test mode
      });
      
      // Auto-equip best cosmetics for the tier
      const equipped = autoEquipForTier(mockTier);
      console.log(`[TEST MODE] Auto-equipped: Skin=${equipped.skin}, Trail=${equipped.trail}`);
    } else {
      // Load cached tier data for returning users
      // This lets users keep their tier even without wallet connected (reduces load)
      const cached = loadCachedTier();
      if (cached && cached.tier !== 'none') {
        // Cache is valid for 24 hours before requiring re-verification
        const cacheAge = Date.now() - cached.timestamp;
        const cacheValid = cacheAge < 24 * 60 * 60 * 1000; // 24 hours
        
        if (cacheValid) {
          console.log(`[WalletUI] Loaded cached tier: ${cached.tier} (${cached.balance} tokens)`);
          useGameStore.setState({
            tokenBalance: cached.balance,
            holderTier: cached.tier as any,
          });
          // Auto-equip cosmetics for cached tier
          const equipped = autoEquipForTier(cached.tier as any);
          console.log(`[WalletUI] Auto-equipped from cache: Skin=${equipped.skin}, Trail=${equipped.trail}`);
        } else {
          console.log('[WalletUI] Cached tier expired, will refresh on wallet connect');
        }
      }
    }
  }, []);

  // Update SOL balance when wallet connects (one-time fetch, not polling)
  useEffect(() => {
    let alive = true;
    if (!publicKey) {
      setSolBalance(null);
      return;
    }
    // Single fetch, no polling - we only need this for display
    fetchBalance(publicKey).then((b) => alive && setSolBalance(b));
    return () => {
      alive = false;
    };
  }, [publicKey]);

  // Update token balance when wallet connects (one-time verification, then cache)
  // This also handles the redirect back from Phantom app on mobile
  useEffect(() => {
    if (TEST_MODE) return;
    
    gameActions.setWalletConnected(connected);
    
    if (connected && publicKey) {
      const walletAddress = publicKey.toBase58();
      const cached = loadCachedTier();
      
      // Check if we have a valid cache for THIS wallet
      const cacheValid = cached && 
        cached.address === walletAddress && 
        (Date.now() - cached.timestamp) < 24 * 60 * 60 * 1000;
      
      if (cacheValid) {
        // Use cached data - no RPC call needed!
        console.log('[WalletUI] Using cached tier data (same wallet, cache valid)');
        useGameStore.setState({
          tokenBalance: cached.balance,
          holderTier: cached.tier as any,
        });
      } else {
        // Fresh wallet or cache expired - fetch once and cache
        console.log('[WalletUI] Fetching token balance (first connect or cache expired)...');
        gameActions.updateTokenBalance(walletAddress)
          .then(() => {
            // Cache the result for future sessions
            const state = useGameStore.getState();
            saveCachedTier(walletAddress, state.tokenBalance, state.holderTier);
            console.log('[WalletUI] Wallet connected and tier verified:', {
              address: walletAddress.slice(0, 8) + '...',
              tier: state.holderTier,
              balance: state.tokenBalance,
            });
          })
          .catch(error => {
            console.error('[WalletUI] Failed to fetch token balance:', error);
          });
      }
      
      // On mobile, if we just returned from Phantom app redirect, ensure UI updates
      // The wallet adapter should have already handled the redirect, but we ensure state is synced
      const device = getDevice();
      if (device.isMobile) {
        console.log('[WalletUI] Mobile wallet connected - ensuring redirect completed');
        // Small delay to ensure redirect params are processed
        setTimeout(() => {
          // Force a state update to ensure UI reflects connection
          useGameStore.setState({ walletConnected: true });
        }, 100);
      }
    } else if (!connected) {
      // Wallet disconnected - keep cached tier data for cosmetics
      // but mark as not connected in store
      // Don't clear cache - user can reconnect same wallet
      useGameStore.setState({ walletConnected: false });
    }
  }, [connected, publicKey]);

  const shortAddr = useMemo(() => {
    if (TEST_MODE && !publicKey) return 'TEST MODE';
    const addr = publicKey?.toBase58();
    if (!addr) return 'Not connected';
    return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
  }, [publicKey]);

  const tierInfo = HOLDER_TIERS[holderTier];
  // In TEST_MODE, show badge if mock balance qualifies. In production, need real wallet.
  const showHolderBadge = TEST_MODE 
    ? isHolder(tokenBalance) 
    : (connected && isHolder(tokenBalance));

  return (
    <div className="topbar">
      {/* Holder tier badge with refresh button positioned at upper right */}
      {showHolderBadge && (
        <div style={{ position: 'relative' }}>
          <div 
            className="holder-badge"
            style={{ 
              backgroundColor: tierInfo.color + '22',
              borderColor: tierInfo.color,
              color: tierInfo.color,
              padding: '14px 20px',
              fontSize: '14px',
            }}
          >
            <span className="tier-emoji" style={{ fontSize: '20px' }}>{tierInfo.emoji}</span>
            <span className="tier-name" style={{ fontSize: '14px', fontWeight: 700 }}>{tierInfo.name}</span>
            <span className="tier-balance" style={{ fontSize: '13px' }}>{formatTokenBalance(tokenBalance)} {TOKEN_SYMBOL}</span>
          </div>
          {/* Small refresh button positioned at upper right corner */}
          {!TEST_MODE && connected && publicKey && (
            <button
              className="refresh-balance-btn"
              onClick={handleRefreshBalance}
              disabled={isLoadingBalance}
              style={{ 
                position: 'absolute',
                top: '-10px',
                right: '-10px',
                fontSize: '14px', 
                padding: '6px 8px',
                cursor: isLoadingBalance ? 'not-allowed' : 'pointer',
                opacity: isLoadingBalance ? 0.6 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(135deg, #9b5cff, #4ef0c5)',
                border: 'none',
                borderRadius: '8px',
                color: '#0a0517',
                fontWeight: 700,
                transition: 'all 0.2s ease',
                pointerEvents: 'auto',
                lineHeight: '1',
              }}
              onMouseEnter={(e) => {
                if (!isLoadingBalance) {
                  e.currentTarget.style.transform = 'scale(1.1)';
                  e.currentTarget.style.boxShadow = '0 0 10px rgba(155, 92, 255, 0.6)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = 'none';
              }}
              title="Refresh token balance"
            >
              {isLoadingBalance ? '⏳' : '🔄'}
            </button>
          )}
        </div>
      )}
      
      {/* Show TEST MODE indicator if in test mode and no tier badge */}
      {TEST_MODE && !publicKey && !showHolderBadge && (
        <div className="stat-pill">
          🧪 TEST MODE
        </div>
      )}
      
      {/* Status message from refresh */}
      {statusMessage && (
        <div className="stat-pill" style={{ 
          fontSize: '11px', 
          background: statusMessage.includes('❌') ? 'rgba(255,0,0,0.2)' : 
                      statusMessage.includes('✅') ? 'rgba(0,255,0,0.2)' : 
                      'rgba(255,255,0,0.2)',
          color: statusMessage.includes('❌') ? '#ff6666' : 
                 statusMessage.includes('✅') ? '#66ff66' : 
                 '#ffff66',
        }}>
          {statusMessage}
        </div>
      )}
      
      <div className="wallet-card">
        {!TEST_MODE && !useMobileFlow && <WalletMultiButton className="btn secondary" />}
        {!TEST_MODE && useMobileFlow && (
          <>
            {!connected && !connecting && (
              <button
                className="btn secondary"
                onClick={handleMobileConnect}
                style={{
                  background: 'linear-gradient(135deg, #9b5cff, #4ef0c5)',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '10px 20px',
                  color: '#0a0517',
                  fontWeight: 700,
                  fontSize: '14px',
                  cursor: 'pointer',
                }}
              >
                Connect Phantom
              </button>
            )}
            {connecting && (
              <button
                className="btn secondary"
                disabled
                style={{
                  background: 'rgba(155, 92, 255, 0.5)',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '10px 20px',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: '14px',
                  cursor: 'not-allowed',
                  opacity: 0.6,
                }}
              >
                Connecting...
              </button>
            )}
            {connected && publicKey && (
              <button
                className="btn secondary"
                onClick={() => disconnect()}
                style={{
                  background: 'linear-gradient(135deg, #4ef0c5, #9b5cff)',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '10px 20px',
                  color: '#0a0517',
                  fontWeight: 700,
                  fontSize: '14px',
                  cursor: 'pointer',
                }}
              >
                {shortAddr}
              </button>
            )}
          </>
        )}
        {TEST_MODE && !publicKey && (
          <span className="badge" style={{ background: 'rgba(255,215,0,0.2)', color: '#ffd700' }}>
            Testing with {formatTokenBalance(MOCK_BALANCE)} {TOKEN_SYMBOL}
          </span>
        )}
        {/* SOL balance - hidden on mobile via CSS class .sol-balance-badge */}
        {publicKey && solBalance !== null && (
          <span className="badge sol-balance-badge">{Math.round(solBalance).toLocaleString()} SOL</span>
        )}
      </div>
    </div>
  );
}
