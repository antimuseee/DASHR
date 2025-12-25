import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-phantom';
// clusterApiUrl no longer needed - using direct RPC URL
import GameCanvas from './GameCanvas';
import WalletUI from './WalletUI';
import Menus from './Menus';
import { useGameStore } from '../utils/store';
import '@solana/wallet-adapter-react-ui/styles.css';
import '../styles.css';

// Use Helius free RPC (more reliable for browser requests)
const endpoint = 'https://mainnet.helius-rpc.com/?api-key=1d8740dc-e5f4-421c-b823-e1bad1889eff';

// Create wallet adapter with error handling
const phantomAdapter = new PhantomWalletAdapter();
phantomAdapter.on('error', (error) => {
  console.error('[Wallet] Phantom error:', error);
});
const wallets = [phantomAdapter];

export default function App() {
  const phase = useGameStore((s) => s.phase);
  return (
    <ConnectionProvider endpoint={endpoint} config={{ commitment: 'processed' }}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <div className="app-shell">
            <GameCanvas />
            <div className="hud">
              <WalletUI />
              <Menus phase={phase} />
            </div>
          </div>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
