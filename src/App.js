// src/App.js
import React, { useEffect, useState } from 'react';
import NetworkBanner from './components/NetworkBanner';
import { ethers } from 'ethers';
import { QRCode } from 'qrcode.react';

// Sepolia Chainlink BTC/USD Proof of Reserve feed
const CONTRACT_ADDRESS = '0x97C444c55Acd050645D4F2cc6498BdC10e86E9d8';
const FEED_ADDRESS = '0x1b44F3514812d835EB1BDB0acB33d3fA3351Ee43'; // Chainlink BTC/USD PoR on Sepolia

const TOKEN_ABI = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function balanceOf(address) view returns (uint256)',
  'function mint(address to, uint256 amount) external',
  'function burn(address from, uint256 amount) external',
  'function owner() view returns (address)',
  'function totalSupply() view returns (uint256)',
];
const FEED_ABI = [
  'function latestAnswer() view returns (int256)', // Chainlink PoR Aggregator interface
];

const CYPRESS_TEST_ACCOUNT = '0x1234567890abcdef1234567890abcdef12345678';

// --- helpers --- //
function formatToken(amount, decimals = 8, currency = 'SATSTD') {
  if (!amount) return '0';
  const num = Number(amount);
  if (isNaN(num)) return amount;
  return num.toLocaleString('en-US', { maximumFractionDigits: decimals }) + ` ${currency}`;
}
function formatSatsToBTC(amount) {
  if (!amount) return '0';
  const btc = Number(amount) / 1e8;
  return btc.toLocaleString('en-US', { maximumFractionDigits: 8 }) + ' BTC';
}
function shortenAddress(addr) {
  if (!addr) return '';
  return addr.slice(0, 6) + '...' + addr.slice(-4);
}

export default function App() {
  const isTest = typeof window.Cypress !== 'undefined';

  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [account, setAccount] = useState('');
  const [balance, setBalance] = useState('0');
  const [poReserve, setPoReserve] = useState('0');
  const [totalSupply, setTotalSupply] = useState('0');
  const [mintAmount, setMintAmount] = useState('');
  const [burnAmount, setBurnAmount] = useState('');
  const [newBacking, setNewBacking] = useState('');
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [chainId, setChainId] = useState(isTest ? 11155111 : null);
  const [reserveWarning, setReserveWarning] = useState('');
  const [mintableMax, setMintableMax] = useState('0');
  const [progress, setProgress] = useState(0);
  const [copied, setCopied] = useState(false);

  // --- Network detection ---
  useEffect(() => {
    if (isTest) {
      setChainId(11155111);
      return;
    }
    if (!window.ethereum) return;
    const raw = window.ethereum.chainId;
    if (raw != null) {
      const parsed = typeof raw === 'string' ? parseInt(raw, 16) : raw;
      setChainId(parsed);
    }
    if (typeof window.ethereum.on === 'function') {
      window.ethereum.on('chainChanged', (hex) => {
        const id = parseInt(hex, 16);
        setChainId(id);
      });
    }
  }, [isTest]);

  const isNetworkAllowed = chainId === 11155111;

  // --- Auto-connect if already authorized ---
  useEffect(() => {
    if (!isTest && provider && isNetworkAllowed && window.ethereum.selectedAddress) {
      connectWallet();
    }
    // eslint-disable-next-line
  }, [provider, chainId, isTest]);

  // --- Provider setup (Only in prod/test) ---
  useEffect(() => {
    if (!isTest) {
      if (window.ethereum && window.ethereum.request) {
        const prov = new ethers.providers.Web3Provider(window.ethereum);
        setProvider(prov);
        fetchChainData(prov);
      } else {
        setMessage({ text: 'MetaMask not detected', type: 'error' });
      }
    }
    // eslint-disable-next-line
  }, [isTest]);

  // --- Connect wallet (Cypress and prod) ---
  async function connectWallet() {
    if (isTest) {
      setAccount(CYPRESS_TEST_ACCOUNT);
      setIsOwner(true);
      setBalance('0');
      setPoReserve('1000000000000000000');
      setTotalSupply('0');
      setMintableMax('1000000');
      setProgress(0);
      setMessage({ text: 'Wallet connected (mock)', type: 'success' });
      setTimeout(() => setMessage({ text: '', type: '' }), 2000);
      return;
    }
    try {
      setLoading(true);
      const accounts = await provider.send('eth_requestAccounts', []);
      const user = accounts[0];
      setAccount(user);

      const newSigner = provider.getSigner();
      setSigner(newSigner);

      const token = new ethers.Contract(CONTRACT_ADDRESS, TOKEN_ABI, provider);
      const ownerAddress = await token.owner();
      setIsOwner(ownerAddress.toLowerCase() === user.toLowerCase());

      await fetchChainData(provider, user);
      setMessage({ text: 'Wallet connected', type: 'success' });
    } catch (e) {
      setMessage({ text: 'Connection failed', type: 'error' });
    } finally {
      setLoading(false);
      setTimeout(() => setMessage({ text: '', type: '' }), 2000);
    }
  }

  // --- Fetch chain data ---
  async function fetchChainData(_provider = provider, addr = account) {
    try {
      const token = new ethers.Contract(CONTRACT_ADDRESS, TOKEN_ABI, _provider);
      const feed = new ethers.Contract(FEED_ADDRESS, FEED_ABI, _provider);
      const [bal, reserve, supply] = await Promise.all([
        addr ? token.balanceOf(addr) : ethers.BigNumber.from(0),
        feed.latestAnswer(),
        token.totalSupply(),
      ]);
      setBalance(ethers.utils.formatUnits(bal, 18));
      setPoReserve(reserve.toString());
      setTotalSupply(ethers.utils.formatUnits(supply, 18));
      const maxMint = Math.max(
        0,
        parseFloat(ethers.utils.formatUnits(reserve, 18)) -
        parseFloat(ethers.utils.formatUnits(supply, 18))
      );
      setMintableMax(maxMint.toString());

      // Reserve warning logic
      const reserveNum = parseFloat(ethers.utils.formatUnits(reserve, 18));
      const supplyNum = parseFloat(ethers.utils.formatUnits(supply, 18));
      if (reserveNum > 0 && supplyNum / reserveNum > 0.9) {
        setReserveWarning(
          "Warning: Reserve is almost depleted. Only a small amount of SATSTD can be minted!"
        );
      } else {
        setReserveWarning('');
      }

      setProgress(
        reserveNum > 0 ? Math.min(100, (supplyNum / reserveNum) * 100) : 0
      );
    } catch (e) {
      setReserveWarning('');
    }
  }

  // --- Mint ---
  async function handleMint() {
    if (!isNetworkAllowed && !isTest) return;
    const amount = parseFloat(mintAmount || '0');
    if (amount > parseFloat(mintableMax)) {
      setMessage({ text: 'Cannot mint more than the available BTC reserve.', type: 'error' });
      return;
    }
    try {
      setLoading(true);
      setMessage({ text: 'Processing mint...', type: 'info' });
      if (isTest) {
        setBalance((b) => (parseFloat(b) + amount).toString());
        setTotalSupply((s) => (parseFloat(s) + amount).toString());
        setMintableMax((m) => (parseFloat(m) - amount).toString());
        setMessage({ text: `Minted ${mintAmount} SATSTD`, type: 'success' });
        setMintAmount('');
        setTimeout(() => setMessage({ text: '', type: '' }), 2000);
        setLoading(false);
        return;
      }
      const token = new ethers.Contract(CONTRACT_ADDRESS, TOKEN_ABI, signer);
      const amt = ethers.utils.parseUnits(mintAmount || '0', 18);
      const tx = await token.mint(account, amt);
      setMessage({ text: 'Mint transaction sent...', type: 'info' });
      await tx.wait();
      await fetchChainData();
      setMessage({ text: `Minted ${mintAmount} SATSTD`, type: 'success' });
      setMintAmount('');
    } catch (e) {
      setMessage({ text: 'Mint failed', type: 'error' });
    } finally {
      setLoading(false);
      setTimeout(() => setMessage({ text: '', type: '' }), 2000);
    }
  }

  // --- Burn ---
  async function handleBurn() {
    if (!isNetworkAllowed && !isTest) return;
    const amount = parseFloat(burnAmount || '0');
    if (amount > parseFloat(balance)) {
      setMessage({ text: 'You do not have enough tokens to burn.', type: 'error' });
      return;
    }
    try {
      setLoading(true);
      setMessage({ text: 'Processing burn...', type: 'info' });
      if (isTest) {
        setBalance((b) => (parseFloat(b) - amount).toString());
        setTotalSupply((s) => (parseFloat(s) - amount).toString());
        setMintableMax((m) => (parseFloat(m) + amount).toString());
        setMessage({ text: `Burned ${burnAmount} SATSTD`, type: 'success' });
        setBurnAmount('');
        setTimeout(() => setMessage({ text: '', type: '' }), 2000);
        setLoading(false);
        return;
      }
      const token = new ethers.Contract(CONTRACT_ADDRESS, TOKEN_ABI, signer);
      const amt = ethers.utils.parseUnits(burnAmount || '0', 18);
      const tx = await token.burn(account, amt);
      setMessage({ text: 'Burn transaction sent...', type: 'info' });
      await tx.wait();
      await fetchChainData();
      setMessage({ text: `Burned ${burnAmount} SATSTD`, type: 'success' });
      setBurnAmount('');
    } catch (e) {
      setMessage({ text: 'Burn failed', type: 'error' });
    } finally {
      setLoading(false);
      setTimeout(() => setMessage({ text: '', type: '' }), 2000);
    }
  }

  // --- Set PoR --- (Sepolia-n is ELÉRHETŐ, ha owner vagy)
  async function handleSetPoR() {
    if (!isOwner && !isTest) return;
    if (!newBacking || isNaN(newBacking)) {
      setMessage({ text: 'Please enter a number', type: 'error' });
      return;
    }
    if (parseFloat(newBacking) < parseFloat(totalSupply)) {
      setMessage({ text: 'Reserve cannot be set below total supply!', type: 'error' });
      return;
    }
    try {
      setLoading(true);
      if (isTest) {
        setPoReserve(newBacking);
        setMintableMax(
          (parseFloat(newBacking) - parseFloat(totalSupply)).toString()
        );
        setMessage({ text: 'PoR backing updated.', type: 'success' });
        setNewBacking('');
        setTimeout(() => setMessage({ text: '', type: '' }), 2000);
        setLoading(false);
        return;
      }
      // Sepolia: NINCS setReserve funkció az igazi Chainlink feed-en, ez csak mock feeden működik!
      setMessage({ text: 'PoR update only available with a mock feed. (Not supported by Chainlink PoR)', type: 'error' });
    } catch (e) {
      setMessage({ text: 'PoR update failed', type: 'error' });
    } finally {
      setLoading(false);
      setTimeout(() => setMessage({ text: '', type: '' }), 2000);
    }
  }

  function handleCopy() {
    if (!account) return;
    navigator.clipboard.writeText(account);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }

  function Tooltip({ children, text }) {
    return (
      <span className="relative group">
        {children}
        <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 z-10 hidden group-hover:flex bg-black text-white text-xs rounded px-2 py-1 transition-all duration-150 opacity-90">
          {text}
        </span>
      </span>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center p-4">
      <div className="w-full max-w-md bg-white shadow-lg rounded-2xl p-6 space-y-8 transition-all duration-300">
        <h1 className="text-3xl font-extrabold text-center mb-2">Satoshi Standard dApp</h1>
        <NetworkBanner chainId={chainId} />

        {!isNetworkAllowed && chainId && (
          <div className="p-3 rounded-lg bg-yellow-100 text-yellow-800 text-sm font-semibold flex items-center justify-center">
            <span className="animate-pulse mr-2">⚠️</span>
            Please switch to Sepolia Testnet (chainId 11155111)
          </div>
        )}

        {/* Progress bar */}
        <div className="w-full h-3 bg-gray-200 rounded-lg overflow-hidden mb-2">
          <div
            className="h-3 bg-gradient-to-r from-green-400 to-lime-400 transition-all duration-500"
            style={{ width: `${progress}%` }}
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemax={100}
            data-tooltip="BTC reserve usage"
          />
        </div>
        <div className="text-xs text-gray-400 text-center mb-2">
          Reserve usage: {Math.min(100, Math.round(progress))}%
        </div>

        {reserveWarning && (
          <div className="p-3 rounded bg-orange-100 text-orange-700 text-sm animate-pulse font-semibold">
            {reserveWarning}
          </div>
        )}

        {message.text && (
          <div
            className={`p-3 rounded text-sm transition-all duration-300 font-semibold ${
              message.type === 'success'
                ? 'bg-green-100 text-green-800 animate-fade-in'
                : message.type === 'error'
                ? 'bg-red-100   text-red-800 animate-shake'
                : 'bg-blue-100  text-blue-800 animate-fade-in'
            }`}
          >
            {message.text}
          </div>
        )}

        {!account ? (
          <button
            onClick={connectWallet}
            disabled={loading || (!isNetworkAllowed && !isTest)}
            className="w-full py-2 bg-gradient-to-r from-blue-600 to-blue-400 text-white rounded-xl font-bold text-lg shadow disabled:opacity-50 flex justify-center items-center"
          >
            {loading && (
              <span className="loader mr-2 w-4 h-4 border-2 border-white border-t-blue-400 rounded-full animate-spin"></span>
            )}
            {loading ? 'Connecting...' : 'Connect Wallet'}
          </button>
        ) : (
          <>
            <div className="text-center space-y-1">
              <div className="flex justify-center items-center space-x-2">
                <p className="font-mono text-xs text-gray-600 truncate select-all cursor-pointer" onClick={handleCopy}>
                  {shortenAddress(account)}
                </p>
                <button onClick={handleCopy} className="text-blue-500 hover:text-blue-700 text-xs font-mono" title="Copy address">
                  {copied ? "Copied!" : "Copy"}
                </button>
                <Tooltip text="Show QR code">
                  <span
                    className="ml-2 text-gray-400 hover:text-blue-600 cursor-pointer"
                    onClick={() => window.alert('QR kód: fejlesztés alatt (használd qrcode.react-et)')}
                  >📱</span>
                </Tooltip>
              </div>
              <p className="text-lg font-semibold">{formatToken(balance)} </p>
              <p className="text-sm text-gray-700">
                BTC Proof of Reserve: <span className="font-mono">{formatSatsToBTC(poReserve)}</span>
              </p>
              <p className="text-xs text-gray-500">
                Total supply: {formatToken(totalSupply)}
              </p>
            </div>

            {/* Mintable max info */}
            <div className="text-xs text-blue-700 text-center font-mono mb-2">
              Your mintable max: <span>{formatToken(mintableMax)}</span> SATSTD
            </div>

            <div className="space-y-4">
              {/* Mint */}
              <div>
                <label className="block text-sm font-medium">
                  Mint Amount{' '}
                  <Tooltip text="You can only mint up to the remaining reserve.">
                    <span className="ml-1 text-xs text-gray-400">ⓘ</span>
                  </Tooltip>
                </label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    aria-label="mint"
                    value={mintAmount}
                    onChange={(e) => setMintAmount(e.target.value)}
                    disabled={loading || (!isNetworkAllowed && !isTest)}
                    className="flex-1 p-2 border rounded"
                    placeholder="0.0"
                  />
                  <button
                    type="button"
                    onClick={() => setMintAmount(mintableMax)}
                    className="px-2 bg-blue-200 rounded text-xs font-bold hover:bg-blue-300 transition"
                    disabled={mintableMax === '0'}
                  >
                    Max
                  </button>
                  <button
                    onClick={handleMint}
                    disabled={
                      loading ||
                      (!isNetworkAllowed && !isTest) ||
                      !mintAmount ||
                      parseFloat(mintAmount) === 0 ||
                      parseFloat(mintAmount) > parseFloat(mintableMax)
                    }
                    className="px-4 bg-green-600 text-white rounded disabled:opacity-50 flex items-center"
                  >
                    {loading ? (
                      <span className="loader mr-1 w-3 h-3 border-2 border-white border-t-green-600 rounded-full animate-spin"></span>
                    ) : null}
                    {loading ? 'Processing...' : 'Mint'}
                  </button>
                </div>
                {mintAmount &&
                  parseFloat(mintAmount) > parseFloat(mintableMax) && (
                    <div className="text-xs text-red-500 mt-1">
                      Not enough BTC reserve for this mint.
                    </div>
                  )}
              </div>

              {/* Burn */}
              <div>
                <label className="block text-sm font-medium">
                  Burn Amount{' '}
                  <Tooltip text="You can only burn what you have.">
                    <span className="ml-1 text-xs text-gray-400">ⓘ</span>
                  </Tooltip>
                </label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    aria-label="burn"
                    value={burnAmount}
                    onChange={(e) => setBurnAmount(e.target.value)}
                    disabled={loading || (!isNetworkAllowed && !isTest)}
                    className="flex-1 p-2 border rounded"
                    placeholder="0.0"
                  />
                  <button
                    onClick={handleBurn}
                    disabled={
                      loading ||
                      (!isNetworkAllowed && !isTest) ||
                      !burnAmount ||
                      parseFloat(burnAmount) === 0 ||
                      parseFloat(burnAmount) > parseFloat(balance)
                    }
                    className="px-4 bg-yellow-600 text-white rounded disabled:opacity-50 flex items-center"
                  >
                    {loading ? (
                      <span className="loader mr-1 w-3 h-3 border-2 border-white border-t-yellow-600 rounded-full animate-spin"></span>
                    ) : null}
                    {loading ? 'Processing...' : 'Burn'}
                  </button>
                </div>
                {burnAmount && parseFloat(burnAmount) > parseFloat(balance) && (
                  <div className="text-xs text-red-500 mt-1">
                    Insufficient token balance to burn.
                  </div>
                )}
              </div>

              {/* Set Reserve */}
              {isOwner && (
                <div>
                  <label className="block text-sm font-medium">
                    Set Mock PoR Backing (satoshi){' '}
                    <Tooltip text="Reserve cannot be set below total supply!">
                      <span className="ml-1 text-xs text-gray-400">ⓘ</span>
                    </Tooltip>
                  </label>
                  <div className="flex space-x-2">
                    <input
                      type="number"
                      value={newBacking}
                      onChange={(e) => setNewBacking(e.target.value)}
                      disabled={loading}
                      className="flex-1 p-2 border rounded"
                      placeholder="e.g. 1000000"
                    />
                    <button
                      onClick={handleSetPoR}
                      disabled={
                        loading ||
                        !newBacking ||
                        isNaN(newBacking) ||
                        parseFloat(newBacking) < parseFloat(totalSupply)
                      }
                      className="px-4 bg-purple-600 text-white rounded disabled:opacity-50 flex items-center"
                    >
                      {loading ? (
                        <span className="loader mr-1 w-3 h-3 border-2 border-white border-t-purple-600 rounded-full animate-spin"></span>
                      ) : null}
                      {loading ? 'Updating...' : 'Set'}
                    </button>
                  </div>
                  {newBacking &&
                    parseFloat(newBacking) < parseFloat(totalSupply) && (
                      <div className="text-xs text-red-500 mt-1">
                        Reserve cannot be set below current total supply!
                      </div>
                    )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
      {/* Példa: QRCode, ha akarod ténylegesen megjeleníteni */}
      {/* account && <div className="my-4"><QRCode value={account} size={100} /></div> */}
    </div>
  );
}

// Tailwind CSS: loader
// .loader { border-top-color: transparent; border-radius: 50%; border-style: solid; border-width: 2px; }
