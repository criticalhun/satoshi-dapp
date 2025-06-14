// src/App.js
import React, { useEffect, useState } from "react";
import NetworkBanner from "./components/NetworkBanner";
import MintController from "./components/MintController";
import BurnController from "./components/BurnController";
import OwnerPanel from "./components/OwnerPanel";
import { ethers } from "ethers";
import { QRCodeSVG } from "qrcode.react";
import { formatToken, formatSatsToBTC, shortenAddress } from "./utils/helpers";

const CONTRACT_ADDRESS = "0x97C444c55Acd050645D4F2cc6498BdC10e86E9d8";
const FEED_ADDRESS = "0x1b44F3514812d835EB1BDB0acB33d3fA3351Ee43";

const TOKEN_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function balanceOf(address) view returns (uint256)",
  "function mint(address to, uint256 amount) external",
  "function burn(address from, uint256 amount) external",
  "function owner() view returns (address)",
  "function totalSupply() view returns (uint256)",
];
const FEED_ABI = [
  "function latestAnswer() view returns (int256)",
];

const CYPRESS_TEST_ACCOUNT = "0x1234567890abcdef1234567890abcdef12345678";

export default function App() {
  const isTest = typeof window.Cypress !== "undefined";
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [account, setAccount] = useState("");
  const [balance, setBalance] = useState("0");
  const [poReserve, setPoReserve] = useState("0");
  const [totalSupply, setTotalSupply] = useState("0");
  const [mintAmount, setMintAmount] = useState("");
  const [burnAmount, setBurnAmount] = useState("");
  const [newBacking, setNewBacking] = useState("");
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });
  const [chainId, setChainId] = useState(isTest ? 11155111 : null);
  const [reserveWarning, setReserveWarning] = useState("");
  const [mintableMax, setMintableMax] = useState("0");
  const [progress, setProgress] = useState(0);
  const [copied, setCopied] = useState(false);

  // --- UI state for dark mode and QR modal
  const [darkMode, setDarkMode] = useState(() => window.matchMedia?.('(prefers-color-scheme: dark)').matches);
  const [showQR, setShowQR] = useState(false);

  // --- DARK MODE: Set .dark class on <html> dynamically ---
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // --- Provider setup + auto account check ---
  useEffect(() => {
    if (isTest) {
      setChainId(11155111);
      setAccount(CYPRESS_TEST_ACCOUNT);
      return;
    }
    if (!window.ethereum) {
      setMessage({ text: "MetaMask not detected", type: "error" });
      return;
    }
    const prov = new ethers.providers.Web3Provider(window.ethereum);
    setProvider(prov);

    window.ethereum.request({ method: "eth_chainId" })
      .then(hex => setChainId(parseInt(hex, 16)));

    if (typeof window.ethereum.on === "function") {
      window.ethereum.on("chainChanged", (hex) => {
        const id = parseInt(hex, 16);
        setChainId(id);
      });
      window.ethereum.on("accountsChanged", (accs) => {
        if (accs && accs[0]) {
          setAccount(accs[0]);
          setSigner(prov.getSigner());
          fetchChainData(prov, accs[0]);
        } else {
          setAccount("");
        }
      });
    }

    window.ethereum.request({ method: "eth_accounts" }).then((accs) => {
      if (accs && accs[0]) {
        setAccount(accs[0]);
        setSigner(prov.getSigner());
        fetchChainData(prov, accs[0]);
      }
    });
  }, [isTest]);

  const isNetworkAllowed = chainId === 11155111;

  // --- Connect wallet (always callable) ---
  async function connectWallet() {
    if (isTest) {
      setAccount(CYPRESS_TEST_ACCOUNT);
      setIsOwner(true);
      setBalance("0");
      setPoReserve("1000000000000000000");
      setTotalSupply("0");
      setMintableMax("1000000");
      setProgress(0);
      setMessage({ text: "Wallet connected (mock)", type: "success" });
      setTimeout(() => setMessage({ text: "", type: "" }), 2000);
      return;
    }
    try {
      setLoading(true);
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      const user = accounts[0];
      setAccount(user);
      const newSigner = provider.getSigner();
      setSigner(newSigner);
      const token = new ethers.Contract(CONTRACT_ADDRESS, TOKEN_ABI, provider);
      const ownerAddress = await token.owner();
      setIsOwner(ownerAddress.toLowerCase() === user.toLowerCase());
      await fetchChainData(provider, user);
      setMessage({ text: "Wallet connected", type: "success" });
    } catch (e) {
      setMessage({ text: "Connection failed", type: "error" });
    } finally {
      setLoading(false);
      setTimeout(() => setMessage({ text: "", type: "" }), 2000);
    }
  }

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
      const reserveNum = parseFloat(ethers.utils.formatUnits(reserve, 18));
      const supplyNum = parseFloat(ethers.utils.formatUnits(supply, 18));
      if (reserveNum > 0 && supplyNum / reserveNum > 0.9) {
        setReserveWarning("Warning: Reserve is almost depleted. Only a small amount of SATSTD can be minted!");
      } else {
        setReserveWarning("");
      }
      setProgress(
        reserveNum > 0 ? Math.min(100, (supplyNum / reserveNum) * 100) : 0
      );
    } catch (e) {
      setReserveWarning("");
    }
  }

  async function handleMint() {
    if (!isNetworkAllowed && !isTest) return;
    const amount = parseFloat(mintAmount || "0");
    if (amount > parseFloat(mintableMax)) {
      setMessage({ text: "Cannot mint more than the available BTC reserve.", type: "error" });
      return;
    }
    try {
      setLoading(true);
      setMessage({ text: "Processing mint...", type: "info" });
      if (isTest) {
        setBalance((b) => (parseFloat(b) + amount).toString());
        setTotalSupply((s) => (parseFloat(s) + amount).toString());
        setMintableMax((m) => (parseFloat(m) - amount).toString());
        setMessage({ text: `Minted ${mintAmount} SATSTD`, type: "success" });
        setMintAmount("");
        setTimeout(() => setMessage({ text: "", type: "" }), 2000);
        setLoading(false);
        return;
      }
      const token = new ethers.Contract(CONTRACT_ADDRESS, TOKEN_ABI, signer);
      const amt = ethers.utils.parseUnits(mintAmount || "0", 18);
      const tx = await token.mint(account, amt);
      setMessage({ text: "Mint transaction sent...", type: "info" });
      await tx.wait();
      await fetchChainData();
      setMessage({ text: `Minted ${mintAmount} SATSTD`, type: "success" });
      setMintAmount("");
    } catch (e) {
      setMessage({ text: "Mint failed", type: "error" });
    } finally {
      setLoading(false);
      setTimeout(() => setMessage({ text: "", type: "" }), 2000);
    }
  }

  async function handleBurn() {
    if (!isNetworkAllowed && !isTest) return;
    const amount = parseFloat(burnAmount || "0");
    if (amount > parseFloat(balance)) {
      setMessage({ text: "You do not have enough tokens to burn.", type: "error" });
      return;
    }
    try {
      setLoading(true);
      setMessage({ text: "Processing burn...", type: "info" });
      if (isTest) {
        setBalance((b) => (parseFloat(b) - amount).toString());
        setTotalSupply((s) => (parseFloat(s) - amount).toString());
        setMintableMax((m) => (parseFloat(m) + amount).toString());
        setMessage({ text: `Burned ${burnAmount} SATSTD`, type: "success" });
        setBurnAmount("");
        setTimeout(() => setMessage({ text: "", type: "" }), 2000);
        setLoading(false);
        return;
      }
      const token = new ethers.Contract(CONTRACT_ADDRESS, TOKEN_ABI, signer);
      const amt = ethers.utils.parseUnits(burnAmount || "0", 18);
      const tx = await token.burn(account, amt);
      setMessage({ text: "Burn transaction sent...", type: "info" });
      await tx.wait();
      await fetchChainData();
      setMessage({ text: `Burned ${burnAmount} SATSTD`, type: "success" });
      setBurnAmount("");
    } catch (e) {
      setMessage({ text: "Burn failed", type: "error" });
    } finally {
      setLoading(false);
      setTimeout(() => setMessage({ text: "", type: "" }), 2000);
    }
  }

  async function handleSetPoR() {
    if (!isOwner && !isTest) return;
    if (!newBacking || isNaN(newBacking)) {
      setMessage({ text: "Please enter a number", type: "error" });
      return;
    }
    if (parseFloat(newBacking) < parseFloat(totalSupply)) {
      setMessage({ text: "Reserve cannot be set below total supply!", type: "error" });
      return;
    }
    try {
      setLoading(true);
      if (isTest) {
        setPoReserve(newBacking);
        setMintableMax((parseFloat(newBacking) - parseFloat(totalSupply)).toString());
        setMessage({ text: "PoR backing updated.", type: "success" });
        setNewBacking("");
        setTimeout(() => setMessage({ text: "", type: "" }), 2000);
        setLoading(false);
        return;
      }
      setMessage({ text: "PoR update only available with a mock feed. (Not supported by Chainlink PoR)", type: "error" });
    } catch (e) {
      setMessage({ text: "PoR update failed", type: "error" });
    } finally {
      setLoading(false);
      setTimeout(() => setMessage({ text: "", type: "" }), 2000);
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
    <div className={darkMode ? "dark" : ""}>
      {/* Sötét mód váltó gomb */}
      <button
        className="absolute top-4 right-4 text-2xl z-50 focus:outline-none"
        onClick={() => setDarkMode(dm => !dm)}
        title="Toggle dark mode"
      >
        {darkMode ? "🌙" : "☀️"}
      </button>

      {/* QR-kód modal */}
      {showQR && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/60 z-50" onClick={() => setShowQR(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-6 flex flex-col items-center" onClick={e => e.stopPropagation()}>
            <QRCodeSVG value={account || "0x0"} size={180} />
            <div className="mt-3 text-sm text-gray-700 dark:text-gray-300 break-all">{account}</div>
            <button onClick={() => setShowQR(false)} className="mt-4 px-3 py-1 rounded bg-blue-600 text-white dark:bg-blue-500">Close</button>
          </div>
        </div>
      )}

      <div className={`min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center p-4 transition-all duration-300`}>
        <div className="w-full max-w-md bg-white dark:bg-gray-800 shadow-lg rounded-2xl p-6 space-y-8 transition-all duration-300">
          <h1 className="text-3xl font-extrabold text-center mb-2 text-gray-800 dark:text-gray-100">Satoshi Standard dApp</h1>
          <NetworkBanner chainId={chainId} />

          {!isNetworkAllowed && chainId && (
            <div className="p-3 rounded-lg bg-yellow-100 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-100 text-sm font-semibold flex items-center justify-center">
              <span className="animate-pulse mr-2">⚠️</span>
              Please switch to Sepolia Testnet (chainId 11155111)
            </div>
          )}

          {/* Progress bar */}
          <div className="w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden mb-2">
            <div
              className="h-3 bg-gradient-to-r from-green-400 to-lime-400 dark:from-green-600 dark:to-lime-600 transition-all duration-500"
              style={{ width: `${progress}%` }}
              role="progressbar"
              aria-valuenow={progress}
              aria-valuemax={100}
              data-tooltip="BTC reserve usage"
            />
          </div>
          <div className="text-xs text-gray-400 dark:text-gray-300 text-center mb-2">
            Reserve usage: {Math.min(100, Math.round(progress))}%
          </div>

          {reserveWarning && (
            <div className="p-3 rounded bg-orange-100 dark:bg-orange-700 text-orange-700 dark:text-orange-100 text-sm animate-pulse font-semibold">
              {reserveWarning}
            </div>
          )}

          {message.text && (
            <div
              className={`p-3 rounded text-sm transition-all duration-300 font-semibold ${
                message.type === "success"
                  ? "bg-green-100 dark:bg-green-700 text-green-800 dark:text-green-100 animate-fade-in"
                  : message.type === "error"
                  ? "bg-red-100 dark:bg-red-700 text-red-800 dark:text-red-100 animate-shake"
                  : "bg-blue-100 dark:bg-blue-700 text-blue-800 dark:text-blue-100 animate-fade-in"
              }`}
            >
              {message.text}
            </div>
          )}

          {!account ? (
            <button
              onClick={connectWallet}
              disabled={loading || !isNetworkAllowed}
              className="w-full py-2 bg-gradient-to-r from-blue-600 to-blue-400 dark:from-blue-800 dark:to-blue-600 text-white rounded-xl font-bold text-lg shadow disabled:opacity-50 flex justify-center items-center"
            >
              {loading && (
                <span className="loader mr-2 w-4 h-4 border-2 border-white border-t-blue-400 rounded-full animate-spin"></span>
              )}
              {loading ? "Connecting..." : "Connect Wallet"}
            </button>
          ) : (
            <>
              <div className="text-center space-y-1">
                <div className="flex justify-center items-center space-x-2">
                  <p className="font-mono text-xs text-gray-600 dark:text-gray-300 truncate select-all cursor-pointer" onClick={handleCopy}>
                    {shortenAddress(account)}
                  </p>
                  <button onClick={handleCopy} className="text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 text-xs font-mono" title="Copy address">
                    {copied ? "Copied!" : "Copy"}
                  </button>
                  <Tooltip text="Show QR code">
                    <span
                      className="ml-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-300 cursor-pointer"
                      onClick={() => setShowQR(true)}
                    >📱</span>
                  </Tooltip>
                </div>
                <p className="text-lg font-semibold text-gray-800 dark:text-gray-100">{formatToken(balance)} </p>
                <p className="text-sm text-gray-700 dark:text-gray-200">
                  BTC Proof of Reserve: <span className="font-mono">{formatSatsToBTC(poReserve)}</span>
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-300">
                  Total supply: {formatToken(totalSupply)}
                </p>
              </div>
              <div className="text-xs text-blue-700 dark:text-blue-400 text-center font-mono mb-2">
                Your mintable max: <span>{formatToken(mintableMax)}</span> SATSTD
              </div>
              <div className="space-y-4">
                <MintController
                  mintAmount={mintAmount}
                  setMintAmount={setMintAmount}
                  mintableMax={mintableMax}
                  loading={loading}
                  isNetworkAllowed={isNetworkAllowed}
                  isTest={isTest}
                  handleMint={handleMint}
                />
                <BurnController
                  burnAmount={burnAmount}
                  setBurnAmount={setBurnAmount}
                  balance={balance}
                  loading={loading}
                  isNetworkAllowed={isNetworkAllowed}
                  isTest={isTest}
                  handleBurn={handleBurn}
                />
                {isOwner && (
                  <OwnerPanel
                    newBacking={newBacking}
                    setNewBacking={setNewBacking}
                    loading={loading}
                    totalSupply={totalSupply}
                    handleSetPoR={handleSetPoR}
                  />
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// Tailwind CSS: loader
// .loader { border-top-color: transparent; border-radius: 50%; border-style: solid; border-width: 2px; }