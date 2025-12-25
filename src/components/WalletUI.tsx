import { useEffect, useMemo, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { clusterApiUrl, Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { useGameStore, gameActions } from '../utils/store';
import { TOKEN_SYMBOL, HOLDER_TIERS, formatTokenBalance, isHolder, TEST_MODE, MOCK_BALANCE, getTierFromBalance } from '../utils/token';
import { autoEquipForTier } from '../utils/cosmetics';

// Use mainnet for real token
const endpoint = clusterApiUrl('mainnet-beta');
const connection = new Connection(endpoint, 'processed');

async function fetchBalance(pk?: PublicKey) {
  if (!pk) return 0;
  const lamports = await connection.getBalance(pk);
  return lamports / LAMPORTS_PER_SOL;
}

export default function WalletUI() {
  const { publicKey, connected } = useWallet();
  const [solBalance, setSolBalance] = useState<number | null>(null);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  const { holderTier, tokenBalance } = useGameStore();
  
  const handleRefreshBalance = async () => {
    if (!publicKey || !connected) return;
    setIsLoadingBalance(true);
    try {
      await gameActions.updateTokenBalance(publicKey.toBase58());
    } catch (error) {
      console.error('[WalletUI] Error refreshing balance:', error);
    } finally {
      setIsLoadingBalance(false);
    }
  };

  // In TEST_MODE, auto-set the mock balance on load (no wallet needed)
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
    }
  }, []);

  // Update SOL balance when wallet connects (real wallet)
  useEffect(() => {
    let alive = true;
    if (!publicKey) {
      setSolBalance(null);
      return;
    }
    fetchBalance(publicKey).then((b) => alive && setSolBalance(b));
    return () => {
      alive = false;
    };
  }, [publicKey]);

  // Update token balance when real wallet connects (production mode)
  useEffect(() => {
    if (!TEST_MODE) {
      gameActions.setWalletConnected(connected);
      if (connected && publicKey) {
        console.log('[WalletUI] Wallet connected, fetching token balance...');
        gameActions.updateTokenBalance(publicKey.toBase58()).catch(error => {
          console.error('[WalletUI] Failed to fetch token balance:', error);
        });
      } else if (!connected) {
        // Reset when disconnected
        useGameStore.setState({ tokenBalance: 0, holderTier: 'none' });
      }
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
      <div className="stat-pill">
        {TEST_MODE && !publicKey ? '🧪 TEST MODE' : `Wallet: ${shortAddr}`}
      </div>
      
      {/* Holder tier badge */}
      {showHolderBadge && (
        <div 
          className="holder-badge"
          style={{ 
            backgroundColor: tierInfo.color + '22',
            borderColor: tierInfo.color,
            color: tierInfo.color,
          }}
        >
          <span className="tier-emoji">{tierInfo.emoji}</span>
          <span className="tier-name">{tierInfo.name}</span>
          <span className="tier-balance">{formatTokenBalance(tokenBalance)} {TOKEN_SYMBOL}</span>
          
          {/* Refresh balance button inside badge (toward center) */}
          {!TEST_MODE && connected && publicKey && (
            <button
              onClick={handleRefreshBalance}
              disabled={isLoadingBalance}
              style={{ 
                fontSize: '14px', 
                padding: '4px 8px',
                marginLeft: '4px',
                opacity: isLoadingBalance ? 0.6 : 1,
                background: 'rgba(255, 255, 255, 0.1)',
                border: `1px solid ${tierInfo.color}66`,
                borderRadius: '6px',
                cursor: isLoadingBalance ? 'not-allowed' : 'pointer',
                color: tierInfo.color,
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                if (!isLoadingBalance) {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
              }}
              title="Refresh token balance"
            >
              {isLoadingBalance ? '⏳' : '🔄'}
            </button>
          )}
        </div>
      )}
      
      {/* Debug info - show current tier and balance */}
      {!TEST_MODE && connected && (
        <div className="stat-pill" style={{ fontSize: '11px', opacity: 0.7 }}>
          Tier: {holderTier} | Balance: {formatTokenBalance(tokenBalance)}
        </div>
      )}
      
      <div className="wallet-card">
        {!TEST_MODE && <WalletMultiButton className="btn secondary" />}
        {TEST_MODE && !publicKey && (
          <span className="badge" style={{ background: 'rgba(255,215,0,0.2)', color: '#ffd700' }}>
            Testing with {formatTokenBalance(MOCK_BALANCE)} {TOKEN_SYMBOL}
          </span>
        )}
        {publicKey && solBalance !== null && (
          <span className="badge">{Math.round(solBalance).toLocaleString()} SOL</span>
        )}
      </div>
    </div>
  );
}
