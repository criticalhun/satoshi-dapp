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
      <div className="p-3 bg-yellow-100/20 dark:bg-yellow-800/30 text-yellow-300 dark:text-yellow-200 rounded-lg text-center text-sm font-semibold border border-yellow-400/30 backdrop-blur-sm">
        <span className="animate-pulse mr-2">⚠️</span>
        Please switch to Sepolia Testnet (chainId 11155111)
      </div>
    );
  }
  
  return null;
};