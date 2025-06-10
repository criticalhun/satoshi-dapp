import React, { useEffect, useState } from 'react';
import NetworkBanner from './components/NetworkBanner';
import { ethers } from 'ethers';

const CONTRACT_ADDRESS = '0x49ffdeF28EC2AFb9C0930a9Cc4aec6733F3b5d83';
const CONTRACT_ABI = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function balanceOf(address) view returns (uint256)',
  'function mint(address to, uint256 amount)',
  'function burn(address from, uint256 amount)',
];

export default function App() {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner]     = useState(null);
  const [account, setAccount]   = useState('');
  const [balance, setBalance]   = useState('0');
  const [mintAmount, setMintAmount] = useState('');
  const [burnAmount, setBurnAmount] = useState('');
  const [loading, setLoading]   = useState(false);
  const [message, setMessage]   = useState({ text: '', type: '' });

  useEffect(() => {
    if (window.ethereum) {
      const prov = new ethers.BrowserProvider(window.ethereum);
      setProvider(prov);
    } else {
      setMessage({ text: 'MetaMask not detected', type: 'error' });
    }
  }, []);

  async function connectWallet() {
    try {
      setLoading(true);
      const accounts = await provider.send('eth_requestAccounts', []);
      setAccount(accounts[0]);
      setSigner(await provider.getSigner());
      await fetchBalance(accounts[0]);
      setMessage({ text: 'Wallet connected', type: 'success' });
    } catch {
      setMessage({ text: 'Connection failed', type: 'error' });
    } finally {
      setLoading(false);
    }
  }

  async function fetchBalance(address) {
    try {
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
      const bal = await contract.balanceOf(address);
      setBalance(ethers.formatUnits(bal, 18));
    } catch {
      // ignore
    }
  }

  async function handleMint() {
    try {
      setLoading(true);
      setMessage({ text: 'Processing mint...', type: 'info' });
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      const wei = ethers.parseUnits(mintAmount || '0', 18);
      const tx = await contract.mint(account, wei);
      await tx.wait();
      await fetchBalance(account);
      setMessage({ text: `Minted ${mintAmount} SATSTD`, type: 'success' });
      setMintAmount('');
    } catch {
      setMessage({ text: 'Mint failed', type: 'error' });
    } finally {
      setLoading(false);
    }
  }

  async function handleBurn() {
    try {
      setLoading(true);
      setMessage({ text: 'Processing burn...', type: 'info' });
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      const wei = ethers.parseUnits(burnAmount || '0', 18);
      const tx = await contract.burn(account, wei);
      await tx.wait();
      await fetchBalance(account);
      setMessage({ text: `Burned ${burnAmount} SATSTD`, type: 'success' });
      setBurnAmount('');
    } catch {
      setMessage({ text: 'Burn failed', type: 'error' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center p-4">
      <div className="w-full max-w-md bg-white shadow-lg rounded-lg p-6 space-y-6">
        <h1 className="text-2xl font-bold text-center">Satoshi Standard dApp</h1>

        {/* hálózat-ellenőrző banner */}
        <NetworkBanner />

        {message.text && (
          <div className={`p-3 rounded text-sm ${
            message.type === 'success' ? 'bg-green-100 text-green-800' :
            message.type === 'error'   ? 'bg-red-100   text-red-800' :
                                          'bg-blue-100  text-blue-800'
          }`}>
            {message.text}
          </div>
        )}

        {!account ? (
          <button
            onClick={connectWallet}
            disabled={loading}
            className="w-full py-2 bg-blue-600 text-white rounded disabled:opacity-50"
          >
            {loading ? 'Connecting...' : 'Connect Wallet'}
          </button>
        ) : (
          <>
            <div className="text-center space-y-1">
              <p className="font-mono text-xs text-gray-600 truncate">
                Connected: {account}
              </p>
              <p className="text-lg font-semibold">{balance} SATSTD</p>
            </div>

            <div className="space-y-4">
              {/* Mint */}
              <div>
                <label className="block text-sm font-medium">Mint Amount</label>
                <div className="flex space-x-2">
                  <input
                    type="number"
                    value={mintAmount}
                    onChange={e => setMintAmount(e.target.value)}
                    className="flex-1 p-2 border rounded"
                    placeholder="0.0"
                    disabled={loading}
                  />
                  <button
                    onClick={handleMint}
                    disabled={loading || !mintAmount}
                    className="px-4 bg-green-600 text-white rounded disabled:opacity-50"
                  >
                    {loading ? 'Processing...' : 'Mint'}
                  </button>
                </div>
              </div>

              {/* Burn */}
              <div>
                <label className="block text-sm font-medium">Burn Amount</label>
                <div className="flex space-x-2">
                  <input
                    type="number"
                    value={burnAmount}
                    onChange={e => setBurnAmount(e.target.value)}
                    className="flex-1 p-2 border rounded"
                    placeholder="0.0"
                    disabled={loading}
                  />
                  <button
                    onClick={handleBurn}
                    disabled={loading || !burnAmount}
                    className="px-4 bg-red-600 text-white rounded disabled:opacity-50"
                  >
                    {loading ? 'Processing...' : 'Burn'}
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
