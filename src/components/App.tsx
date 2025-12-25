import { useState, useCallback } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-phantom';
// clusterApiUrl no longer needed - using direct RPC URL
import GameCanvas from './GameCanvas';
import WalletUI from './WalletUI';
import Menus from './Menus';
import Tutorial, { hasTutorialBeenSeen } from './Tutorial';
import { useGameStore } from '../utils/store';
import '@solana/wallet-adapter-react-ui/styles.css';
import '../styles.css';

// Use Helius RPC for wallet connection (reliable)
// Get API key from environment variable (set in Vercel)
const heliusApiKey = import.meta.env.VITE_HELIUS_API_KEY;
const endpoint = heliusApiKey 
  ? `https://mainnet.helius-rpc.com/?api-key=${heliusApiKey}`
  : 'https://api.mainnet-beta.solana.com'; // Fallback to public RPC if env var not set

// Create wallet adapter with error handling
const phantomAdapter = new PhantomWalletAdapter();
phantomAdapter.on('error', (error) => {
  console.error('[Wallet] Phantom error:', error);
});
const wallets = [phantomAdapter];

export default function App() {
  const phase = useGameStore((s) => s.phase);
  const [showTutorial, setShowTutorial] = useState(!hasTutorialBeenSeen());
  const [forceShowTutorial, setForceShowTutorial] = useState(false);
  
  const handleTutorialComplete = useCallback(() => {
    console.log('[App] Tutorial complete - hiding tutorial');
    setShowTutorial(false);
    setForceShowTutorial(false);
  }, []);
  
  const handleShowTutorial = useCallback(() => {
    console.log('[App] How to Play clicked - showing tutorial');
    setForceShowTutorial(true);
    setShowTutorial(true);
  }, []);
  
  return (
    <ConnectionProvider endpoint={endpoint} config={{ commitment: 'processed' }}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <div className="app-shell">
            <GameCanvas />
            <div className="hud">
              <WalletUI />
              <Menus phase={phase} onShowTutorial={handleShowTutorial} />
            </div>
            {showTutorial && (
              <Tutorial 
                onComplete={handleTutorialComplete} 
                forceShow={forceShowTutorial}
              />
            )}
          </div>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
