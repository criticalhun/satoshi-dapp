import React, { useEffect, useState } from 'react'

// Ezeken a láncokon engedélyezzük a dApp működését
const ALLOWED_CHAIN_IDS = [11155111, 31337]

export default function NetworkBanner() {
  const [chainId, setChainId] = useState(null)

  // Inicializáljuk az első lekérdezést és a váltás-figyelőt
  useEffect(() => {
    async function fetchChain() {
      if (window.ethereum && window.ethereum.request) {
        try {
          const hex = await window.ethereum.request({ method: 'eth_chainId' })
          setChainId(parseInt(hex, 16))
        } catch {}
      }
    }
    fetchChain()

    // csak akkor kötünk eseményre, ha van .on metódus
    if (window.ethereum && typeof window.ethereum.on === 'function') {
      const handler = (hex) => setChainId(parseInt(hex, 16))
      window.ethereum.on('chainChanged', handler)
      return () => {
        if (typeof window.ethereum.removeListener === 'function') {
          window.ethereum.removeListener('chainChanged', handler)
        }
      }
    }
  }, [])

  // Ha még nem tudjuk a chainId-t, ne mutassunk semmit
  if (chainId === null) return null

  // Ha nincs a megengedettek között, figyelmeztessünk
  if (!ALLOWED_CHAIN_IDS.includes(chainId)) {
    return (
      <div className="p-3 bg-yellow-100 text-yellow-800 rounded text-center text-sm">
        ⚠️ This dApp only works on Sepolia (chainId 11155111) or Localhost (31337). You're on <strong>{chainId}</strong>.
        <br/>
        Please switch network in MetaMask.
      </div>
    )
  }

  return null
}