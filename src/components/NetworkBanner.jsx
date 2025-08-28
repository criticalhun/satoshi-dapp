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
      <div className="p-3 bg-yellow-100/20 dark:bg-yellow-800/30 text-yellow-800 dark:text-yellow-200 rounded-lg text-center text-sm font-semibold border border-yellow-400/30 backdrop-blur-sm animate-pulse">
        <div className="flex items-center justify-center mb-2">
          <span className="animate-pulse mr-2 text-lg">⚠️</span>
          <span className="font-bold">Network Warning</span>
        </div>
        <div className="space-y-1">
          <div>This dApp only works on Sepolia (chainId 11155111) or Localhost (31337).</div>
          <div className="flex items-center justify-center space-x-1">
            <span className="font-bold">You're currently on chain:</span>
            <span className="font-mono bg-yellow-200/30 dark:bg-yellow-700/30 px-2 py-1 rounded text-yellow-900 dark:text-yellow-100 border border-yellow-400/40">
              {chainId}
            </span>
          </div>
          <div className="mt-2 text-yellow-700 dark:text-yellow-300">
            Please switch network in MetaMask.
          </div>
        </div>
      </div>
    );
  }

  return null;
}