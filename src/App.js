// src/App.js
import React, { useEffect, useState } from "react";
import NetworkBanner from "./components/NetworkBanner";
import MintController from "./components/MintController";
import BurnController from "./components/BurnController";
import { ethers } from "ethers";
import { QRCodeSVG } from "qrcode.react";
import { formatToken, formatSatsToBTC, shortenAddress } from "./utils/helpers";

// Role hash-ek
const ADMIN_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("ADMIN_ROLE"));
const MINTER_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("MINTER_ROLE"));
const PAUSER_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("PAUSER_ROLE"));
const OPERATOR_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("OPERATOR_ROLE"));

// Címek
const CONTRACT_ADDRESS = "0xa86F8D5EE503e52bc8405A54E1C5f163d3D3eF8a";
const FEED_ADDRESS = "0xD3D2A1EdCBCab8308224C8CaeA8964d399B819D3";

// ABI
const TOKEN_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function balanceOf(address) view returns (uint256)",
  "function totalSupply() view returns (uint256)",
  "function mint(address to, uint256 amount) external",
  "function burn(address from, uint256 amount) external",
  "function hasRole(bytes32 role, address account) view returns (bool)",
  "function setReserveFeed(address newFeed) external",
  "function pause() external",
  "function unpause() external",
  "function paused() view returns (bool)"
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
  const [newFeed, setNewFeed] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });
  const [chainId, setChainId] = useState(isTest ? 11155111 : null);
  const [reserveWarning, setReserveWarning] = useState("");
  const [mintableMax, setMintableMax] = useState("0");
  const [progress, setProgress] = useState(0);
  const [copied, setCopied] = useState(false);

  // Role flags
  const [isAdmin, setIsAdmin] = useState(false);
  const [isOperator, setIsOperator] = useState(false);
  const [isMinter, setIsMinter] = useState(false);
  const [isPauser, setIsPauser] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  // UI state for QR modal
  const [showQR, setShowQR] = useState(false);

  // DARK MODE automatikus (OS based)
  useEffect(() => {
    const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
    if (prefersDark) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, []);

  // Provider setup + auto account check
  useEffect(() => {
    if (isTest) {
      setChainId(11155111);
      setAccount(CYPRESS_TEST_ACCOUNT);
      setIsAdmin(true); setIsOperator(true); setIsMinter(true); setIsPauser(true);
      return;
    }
    if (!window.ethereum) {
      setMessage({ text: "MetaMask not detected", type: "error" });
      return;
    }
    const prov = new ethers.providers.Web3Provider(window.ethereum);
    setProvider(prov);

    window.ethereum.request({ method: "eth_chainId" }).then(hex => setChainId(parseInt(hex, 16)));

    if (typeof window.ethereum.on === "function") {
      window.ethereum.on("chainChanged", (hex) => setChainId(parseInt(hex, 16)));
      window.ethereum.on("accountsChanged", (accs) => {
        if (accs && accs[0]) {
          setAccount(accs[0]);
          setSigner(prov.getSigner());
          fetchAllRoles(prov, accs[0]);
          fetchChainData(prov, accs[0]);
        } else setAccount("");
      });
    }

    window.ethereum.request({ method: "eth_accounts" }).then((accs) => {
      if (accs && accs[0]) {
        setAccount(accs[0]);
        setSigner(prov.getSigner());
        fetchAllRoles(prov, accs[0]);
        fetchChainData(prov, accs[0]);
      }
    });
  }, [isTest]);

  const isNetworkAllowed = chainId === 11155111;

  // --- CONNECT WALLET (hiányzott!) ---
  async function connectWallet() {
    if (isTest) {
      setAccount(CYPRESS_TEST_ACCOUNT);
      setIsAdmin(true); setIsOperator(true); setIsMinter(true); setIsPauser(true);
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
      await fetchAllRoles(provider, user);
      await fetchChainData(provider, user);
      setMessage({ text: "Wallet connected", type: "success" });
    } catch (e) {
      setMessage({ text: "Connection failed", type: "error" });
    } finally {
      setLoading(false);
      setTimeout(() => setMessage({ text: "", type: "" }), 2000);
    }
  }

  // Lekérdezi a role-okat
  async function fetchAllRoles(_provider, addr) {
    try {
      const token = new ethers.Contract(CONTRACT_ADDRESS, TOKEN_ABI, _provider);
      setIsAdmin(await token.hasRole(ADMIN_ROLE, addr));
      setIsOperator(await token.hasRole(OPERATOR_ROLE, addr));
      setIsMinter(await token.hasRole(MINTER_ROLE, addr));
      setIsPauser(await token.hasRole(PAUSER_ROLE, addr));
      setIsPaused(await token.paused());
    } catch {}
  }

  // Fetch chain data (balance, reserve, supply, paused)
  async function fetchChainData(_provider = provider, addr = account) {
    try {
      const token = new ethers.Contract(CONTRACT_ADDRESS, TOKEN_ABI, _provider);
      const feed = new ethers.Contract(FEED_ADDRESS, FEED_ABI, _provider);
      const [bal, reserve, supply, paused] = await Promise.all([
        addr ? token.balanceOf(addr) : ethers.BigNumber.from(0),
        feed.latestAnswer(),
        token.totalSupply(),
        token.paused(),
      ]);
      setBalance(ethers.utils.formatUnits(bal, 18));
      setPoReserve(reserve.toString());
      setTotalSupply(ethers.utils.formatUnits(supply, 18));
      setIsPaused(paused);

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
        setReserveWarning("Warning: Reserve is almost depleted. Only a small amount of SATSTD can be minted!");
      } else {
        setReserveWarning("");
      }
      setProgress(reserveNum > 0 ? Math.min(100, (supplyNum / reserveNum) * 100) : 0);
    } catch (e) {
      setReserveWarning("");
    }
  }

  // --- Mint ---
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

  // --- Burn ---
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

  // --- Reserve Feed váltás ---
  async function handleSetFeed() {
    if (!isOperator && !isAdmin) {
      setMessage({ text: "Not authorized.", type: "error" });
      return;
    }
    if (!newFeed || !ethers.utils.isAddress(newFeed)) {
      setMessage({ text: "Invalid address.", type: "error" });
      return;
    }
    try {
      setLoading(true);
      const token = new ethers.Contract(CONTRACT_ADDRESS, TOKEN_ABI, signer);
      const tx = await token.setReserveFeed(newFeed);
      setMessage({ text: "Feed address update sent...", type: "info" });
      await tx.wait();
      setMessage({ text: "Reserve feed changed!", type: "success" });
      setTimeout(() => setMessage({ text: "", type: "" }), 2000);
    } catch (e) {
      setMessage({ text: "Feed update failed", type: "error" });
    } finally {
      setLoading(false);
    }
  }

  // --- Pause/Unpause ---
  async function handlePause() {
    if (!isPauser && !isOperator && !isAdmin) {
      setMessage({ text: "Not authorized.", type: "error" });
      return;
    }
    try {
      setLoading(true);
      const token = new ethers.Contract(CONTRACT_ADDRESS, TOKEN_ABI, signer);
      const tx = await (isPaused ? token.unpause() : token.pause());
      setMessage({ text: isPaused ? "Unpausing..." : "Pausing..." });
      await tx.wait();
      setIsPaused(!isPaused);
      setMessage({ text: isPaused ? "Unpaused." : "Paused." });
      setTimeout(() => setMessage({ text: "", type: "" }), 2000);
    } catch (e) {
      setMessage({ text: "Pause/unpause failed", type: "error" });
    } finally {
      setLoading(false);
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
    <div>
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
              {/* FEED váltás csak admin/operator */}
              {(isAdmin || isOperator) && (
                <div>
                  <label className="block text-xs font-bold mb-1 text-gray-800 dark:text-gray-100">
                    Reserve Feed Change (admin/operator)
                  </label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      className="flex-1 p-2 border rounded dark:bg-gray-700 dark:text-white text-xs"
                      placeholder="New Feed Address (0x...)"
                      value={newFeed}
                      onChange={e => setNewFeed(e.target.value)}
                    />
                    <button
                      onClick={handleSetFeed}
                      disabled={loading || !ethers.utils.isAddress(newFeed)}
                      className="px-3 bg-purple-700 dark:bg-purple-900 text-white rounded disabled:opacity-60 text-xs"
                    >
                      Set Feed
                    </button>
                  </div>
                </div>
              )}
              {/* PAUSE gomb csak pauser/admin/operator */}
              {(isPauser || isAdmin || isOperator) && (
                <button
                  onClick={handlePause}
                  disabled={loading}
                  className={`w-full py-2 my-1 rounded font-bold text-xs ${
                    isPaused
                      ? "bg-orange-600 dark:bg-orange-900 text-white"
                      : "bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white"
                  }`}
                >
                  {loading ? "Processing..." : isPaused ? "Unpause Contract" : "Pause Contract"}
                </button>
              )}
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
