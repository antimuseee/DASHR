import { useEffect, useMemo, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { useGameStore, gameActions } from '../utils/store';
import { TOKEN_SYMBOL, HOLDER_TIERS, formatTokenBalance, isHolder, TEST_MODE, MOCK_BALANCE, getTierFromBalance } from '../utils/token';
import { autoEquipForTier } from '../utils/cosmetics';

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

export default function WalletUI() {
  const { publicKey, connected, connecting, disconnecting, wallet } = useWallet();
  const [solBalance, setSolBalance] = useState<number | null>(null);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  const { holderTier, tokenBalance } = useGameStore();
  
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
      console.log('[WalletUI] Calling updateTokenBalance...');
      await gameActions.updateTokenBalance(publicKey.toBase58());
      const newBalance = useGameStore.getState().tokenBalance;
      const newTier = useGameStore.getState().holderTier;
      setStatusMessage(`✅ Balance: ${newBalance} | Tier: ${newTier}`);
      console.log('[WalletUI] Balance updated:', { newBalance, newTier });
    } catch (error: any) {
      console.error('[WalletUI] Error refreshing balance:', error);
      setStatusMessage(`❌ Error: ${error.message || 'Unknown error'}`);
    } finally {
      setIsLoadingBalance(false);
      // Clear status message after 5 seconds
      setTimeout(() => setStatusMessage(''), 5000);
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
      {/* Holder tier badge with refresh button positioned at upper right */}
      {showHolderBadge && (
        <div style={{ position: 'relative' }}>
          <div 
            className="holder-badge"
            style={{ 
              backgroundColor: tierInfo.color + '22',
              borderColor: tierInfo.color,
              color: tierInfo.color,
              padding: '10px 20px',
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
              onClick={handleRefreshBalance}
              disabled={isLoadingBalance}
              style={{ 
                position: 'absolute',
                top: '-8px',
                right: '-8px',
                fontSize: '12px', 
                padding: '4px 6px',
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
        {publicKey && solBalance !== null && (
          <span className="badge">{Math.round(solBalance).toLocaleString()} SOL</span>
        )}
      </div>
    </div>
  );
}
