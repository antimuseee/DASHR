import { useEffect, useMemo, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { clusterApiUrl, Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';

const endpoint = clusterApiUrl('devnet');
const connection = new Connection(endpoint, 'processed');

async function fetchBalance(pk?: PublicKey) {
  if (!pk) return 0;
  const lamports = await connection.getBalance(pk);
  return lamports / LAMPORTS_PER_SOL;
}

export default function WalletUI() {
  const { publicKey } = useWallet();
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    if (!publicKey) {
      setBalance(null);
      return;
    }
    fetchBalance(publicKey).then((b) => alive && setBalance(b));
    return () => {
      alive = false;
    };
  }, [publicKey]);

  const shortAddr = useMemo(() => {
    const addr = publicKey?.toBase58();
    if (!addr) return 'Not connected';
    return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
  }, [publicKey]);

  return (
    <div className="topbar">
      <div className="stat-pill">Wallet: {shortAddr}</div>
      <div className="wallet-card">
        <WalletMultiButton className="btn secondary" />
        {publicKey && balance !== null && <span className="badge">{balance.toFixed(2)} SOL</span>}
      </div>
    </div>
  );
}
