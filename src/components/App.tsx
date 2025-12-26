import { useState, useCallback, useEffect } from 'react';
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

// Create wallet adapter - it will automatically handle mobile deep linking
// On mobile: Click connect → Opens Phantom app → User approves → Redirects back to browser
const phantomAdapter = new PhantomWalletAdapter();

phantomAdapter.on('error', (error) => {
  console.error('[Wallet] Phantom error:', error);
});

// Listen for connection events
phantomAdapter.on('connect', (publicKey) => {
  console.log('[Wallet] Connected:', publicKey.toBase58());
  // On mobile, after user approves in Phantom app, they'll be redirected back here
  // The adapter automatically handles the redirect via deep linking
});

phantomAdapter.on('disconnect', () => {
  console.log('[Wallet] Disconnected');
});

const wallets = [phantomAdapter];

export default function App() {
  const phase = useGameStore((s) => s.phase);
  const [showTutorial, setShowTutorial] = useState(!hasTutorialBeenSeen());
  const [forceShowTutorial, setForceShowTutorial] = useState(false);
  
  // Handle redirect back from Phantom app on mobile
  // Check if we're returning from a wallet connection redirect
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const phantomRedirect = urlParams.get('phantom_redirect');
    
    if (phantomRedirect === 'true') {
      console.log('[App] Returned from Phantom app redirect - wallet should be connected');
      // Clean up URL params after processing
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);
    }
  }, []);
  
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
      <WalletProvider wallets={wallets} autoConnect={false}>
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
