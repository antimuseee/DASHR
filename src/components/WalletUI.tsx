import { useEffect, useMemo, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { useGameStore, gameActions } from '../utils/store';
import { TOKEN_SYMBOL, HOLDER_TIERS, formatTokenBalance, isHolder, TEST_MODE, MOCK_BALANCE, getTierFromBalance } from '../utils/token';
import { autoEquipForTier } from '../utils/cosmetics';
import { getDevice } from '../utils/device';

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
  const { publicKey, connected, connecting, disconnecting, wallet } = useWallet();
  const [solBalance, setSolBalance] = useState<number | null>(null);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  const { holderTier, tokenBalance } = useGameStore();
  const [showMobileVerifiedBanner, setShowMobileVerifiedBanner] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // Debug wallet connection state
  useEffect(() => {
    console.log('[WalletUI] Connection state:', { 
      connected, 
      connecting, 
      disconnecting,
      wallet: wallet?.adapter?.name,
      publicKey: publicKey?.toBase58()?.slice(0, 8) 
    });
  }, [connected, connecting, disconnecting, publicKey, wallet]);
  
  const [statusMessage, setStatusMessage] = useState<string>('');
  
  // Copy game link to clipboard (for mobile users to switch to browser)
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.origin);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // Fallback
      const textArea = document.createElement('textarea');
      textArea.value = window.location.origin;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
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
      
      // On mobile in Phantom's WebView, show banner to switch to regular browser
      const device = getDevice();
      if (device.isMobile && device.isPhantomWebView) {
        console.log('[WalletUI] Mobile wallet connected in Phantom WebView - showing browser switch banner');
        // Show the "switch to browser" banner after tier is verified
        setTimeout(() => {
          setShowMobileVerifiedBanner(true);
        }, 500);
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
  // Show badge if:
  // - TEST_MODE with mock balance
  // - Connected wallet with tokens
  // - OR cached tier (allows playing in browser without active connection)
  const hasCachedTier = !TEST_MODE && !connected && holderTier !== 'none' && isHolder(tokenBalance);
  const showHolderBadge = TEST_MODE 
    ? isHolder(tokenBalance) 
    : (connected && isHolder(tokenBalance)) || hasCachedTier;

  return (
    <div className="topbar">
      {/* Mobile Phantom WebView: Show banner to switch to regular browser for better performance */}
      {showMobileVerifiedBanner && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 10000,
          background: 'linear-gradient(135deg, #1a0a2e 0%, #2d1b4e 100%)',
          borderBottom: '3px solid #4ef0c5',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          boxShadow: '0 4px 20px rgba(78, 240, 197, 0.3)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ color: '#fff', fontSize: '14px', lineHeight: '1.4' }}>
              <span style={{ fontSize: '18px' }}>✅</span>{' '}
              <strong style={{ color: '#4ef0c5' }}>Tier Verified!</strong>
              <br />
              <span style={{ color: '#ccc', fontSize: '12px' }}>
                For smoother gameplay, open the game in Safari or Chrome:
              </span>
            </div>
            <button
              onClick={() => setShowMobileVerifiedBanner(false)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#888',
                fontSize: '24px',
                cursor: 'pointer',
                padding: '0',
                lineHeight: '1',
              }}
            >
              ×
            </button>
          </div>
          
          <button
            onClick={handleCopyLink}
            style={{
              background: copied 
                ? 'linear-gradient(135deg, #4ef0c5, #00ff88)' 
                : 'linear-gradient(135deg, #9b5cff, #4ef0c5)',
              border: 'none',
              borderRadius: '8px',
              padding: '12px 16px',
              color: '#0a0517',
              fontWeight: 700,
              fontSize: '14px',
              cursor: 'pointer',
            }}
          >
            {copied ? '✅ Link Copied! Paste in Safari/Chrome' : '📋 Copy Game Link'}
          </button>
          
          <div style={{ color: '#888', fontSize: '11px', textAlign: 'center' }}>
            Your {holderTier} tier is saved for 24 hours. You can play here too, but your browser runs faster!
          </div>
        </div>
      )}
      
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
        {!TEST_MODE && <WalletMultiButton className="btn secondary" />}
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
