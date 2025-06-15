import React, { useEffect, useState } from 'react';

// Ezeken a láncokon engedélyezzük a dApp működését
const ALLOWED_CHAIN_IDS = [11155111, 31337];

export default function NetworkBanner() {
  const [chainId, setChainId] = useState(null);

  useEffect(() => {
    async function fetchChain() {
      if (window.ethereum && window.ethereum.request) {
        try {
          const hex = await window.ethereum.request({ method: 'eth_chainId' });
          setChainId(parseInt(hex, 16));
        } catch {}
      }
    }
    fetchChain();

    if (window.ethereum && typeof window.ethereum.on === 'function') {
      const handler = (hex) => setChainId(parseInt(hex, 16));
      window.ethereum.on('chainChanged', handler);
      return () => {
        if (typeof window.ethereum.removeListener === 'function') {
          window.ethereum.removeListener('chainChanged', handler);
        }
      };
    }
  }, []);

  if (chainId === null) return null;

  if (!ALLOWED_CHAIN_IDS.includes(chainId)) {
    return (
      <div className="p-3 bg-yellow-100 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-100 rounded text-center text-sm font-semibold">
        ⚠️ This dApp only works on Sepolia (chainId 11155111) or Localhost (31337).<br />
        <span>
          <span className="font-bold">You're on </span>
          <span className="font-mono">{chainId}</span>.
        </span>
        <br />
        <span>Please switch network in MetaMask.</span>
      </div>
    );
  }

  return null;
}
