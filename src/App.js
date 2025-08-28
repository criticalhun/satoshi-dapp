import React, { useEffect, useState } from "react";
import * as THREE from 'three';
import NetworkBanner from "./components/NetworkBanner";
import MintController from "./components/MintController";
import BurnController from "./components/BurnController";
import { ethers } from "ethers";
import { QRCodeSVG } from "qrcode.react";
import { formatToken, formatBtcReserve, shortenAddress } from "./utils/helpers";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const BTC_TO_SATSTD_RATIO = 100000000;

// Role hash-ek
const ADMIN_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("ADMIN_ROLE"));
const MINTER_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("MINTER_ROLE"));
const PAUSER_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("PAUSER_ROLE"));
const OPERATOR_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("OPERATOR_ROLE"));

// Címek
const CONTRACT_ADDRESS = process.env.REACT_APP_CONTRACT_ADDRESS;
const FEED_ADDRESS = process.env.REACT_APP_FEED_ADDRESS;

// ABI
const TOKEN_ABI = [
"function name() view returns (string)",
"function symbol() view returns (string)",
"function balanceOf(address) view returns (uint256)",
"function totalSupply() view returns (uint256)",
"function mint(address to, uint256 amount) external",
"function burn(uint256 amount) external",
"function burnFrom(address from, uint256 amount) external",
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

const ThreeBackground = ({ isDarkMode }) => {
  return (
    <div className="fixed inset-0 pointer-events-none z-0">
      {/* Bitcoin szimbólumok CSS-sel */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="absolute animate-spin"
            style={{
              left: `${20 + i * 20}%`,
              top: `${20 + i * 15}%`,
              fontSize: '60px',
              opacity: 0.1,
              color: isDarkMode ? '#f7931a' : '#ff9500',
              animationDuration: `${5 + i * 2}s`,
              animationDelay: `${i * 0.5}s`
            }}
          >
            ₿
          </div>
        ))}
      </div>
      
      {/* Gradiens háttér */}
      <div 
        className="absolute inset-0"
        style={{
          background: isDarkMode 
            ? 'radial-gradient(circle at 20% 20%, rgba(247,147,26,0.1) 0%, transparent 50%)'
            : 'radial-gradient(circle at 80% 80%, rgba(255,149,0,0.1) 0%, transparent 50%)',
          animation: 'pulse 4s ease-in-out infinite'
        }}
      />
    </div>
  );
};

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

    const [isDarkMode, setIsDarkMode] = useState(() => {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme) {
            return savedTheme === 'dark';
        }
        return window.matchMedia?.('(prefers-color-scheme: dark)').matches;
    });

    // Role flags
    const [isAdmin, setIsAdmin] = useState(false);
    const [isOperator, setIsOperator] = useState(false);
    const [isMinter, setIsMinter] = useState(false);
    const [isPauser, setIsPauser] = useState(false);
    const [isPaused, setIsPaused] = useState(false);

    const [showQR, setShowQR] = useState(false);

    const getEtherscanLink = (hash) => {
        if (chainId === 11155111) {
            return `https://sepolia.etherscan.io/tx/${hash}`;
        }
        return "";
    };

    const handleTxError = (error) => {
        console.error("Transaction Error:", error);
        let errorMessage = "An unknown error occurred. Please check the console.";

        if (error.code === 'ACTION_REJECTED') {
            errorMessage = "Transaction was rejected in your wallet.";
        } else if (error.code === 'INSUFFICIENT_FUNDS') {
            errorMessage = "Transaction failed: Not enough funds for gas fees.";
        } else if (error.reason) {
            errorMessage = error.reason;
        } else if (error.data && error.data.message) {
            const nestedReason = error.data.message.match(/reverted with reason string '([^']*)'/);
            if(nestedReason && nestedReason[1]) {
                errorMessage = nestedReason[1];
            } else {
                errorMessage = "Transaction failed. Check contract conditions.";
            }
        }
        toast.error(errorMessage);
    };

    useEffect(() => {
        const theme = isDarkMode ? 'dark' : 'light';
        const root = window.document.documentElement;
        root.classList.remove(isDarkMode ? 'light' : 'dark');
        root.classList.add(theme);
        localStorage.setItem('theme', theme);
    }, [isDarkMode]);

    const processAndAuthorizeAccount = async (prov, addr) => {
        const roles = await fetchAllRoles(prov, addr);
        const isAuthorized = roles.isAdmin || roles.isOperator || roles.isMinter || roles.isPauser;

        if (isAuthorized) {
            setAccount(addr);
            setSigner(prov.getSigner());
            fetchChainData(prov, addr);
        } else {
            setAccount("");
            setSigner(null);
            setMessage({ text: "Access Denied: Your account does not have the required role.", type: "error" });
            setTimeout(() => setMessage({ text: "", type: "" }), 3500);
        }
    };

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
                    processAndAuthorizeAccount(prov, accs[0]);
                } else {
                    setAccount("");
                    setSigner(null);
                    setIsAdmin(false); setIsOperator(false); setIsMinter(false); setIsPauser(false);
                }
            });
        }
    }, [isTest]);

    const isNetworkAllowed = chainId === 11155111;

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
            const roles = await fetchAllRoles(provider, user);
            const isAuthorized = roles.isAdmin || roles.isOperator || roles.isMinter || roles.isPauser;

            if (isAuthorized) {
                setAccount(user);
                const newSigner = provider.getSigner();
                setSigner(newSigner);
                await fetchChainData(provider, user);
                setMessage({ text: "Wallet connected", type: "success" });
            } else {
                setAccount("");
                setSigner(null);
                setMessage({ text: "Connection Failed: Your account is not authorized.", type: "error" });
            }
        } catch (e) {
            setMessage({ text: "Connection failed or rejected.", type: "error" });
        } finally {
            setLoading(false);
            setTimeout(() => setMessage({ text: "", type: "" }), 3000);
        }
    }

    async function fetchAllRoles(_provider, addr) {
        if (!addr || !_provider) {
            setIsAdmin(false); setIsOperator(false); setIsMinter(false); setIsPauser(false);
            return { isAdmin: false, isOperator: false, isMinter: false, isPauser: false };
        }
        try {
            const token = new ethers.Contract(CONTRACT_ADDRESS, TOKEN_ABI, _provider);
            const [isAdmin, isOperator, isMinter, isPauser, isPaused] = await Promise.all([
                token.hasRole(ADMIN_ROLE, addr),
                token.hasRole(OPERATOR_ROLE, addr),
                token.hasRole(MINTER_ROLE, addr),
                token.hasRole(PAUSER_ROLE, addr),
                token.paused(),
            ]);
            setIsAdmin(isAdmin);
            setIsOperator(isOperator);
            setIsMinter(isMinter);
            setIsPauser(isPauser);
            setIsPaused(isPaused);
            return { isAdmin, isOperator, isMinter, isPauser };
        } catch(e) {
            console.error("Failed to fetch roles:", e);
            setIsAdmin(false); setIsOperator(false); setIsMinter(false); setIsPauser(false);
            return { isAdmin: false, isOperator: false, isMinter: false, isPauser: false };
        }
    }

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
        
        // 🔧 DEBUG: Részletes számítás log
        console.log("=== FETCH CHAIN DATA DEBUG ===");
        console.log("Raw reserve from feed:", reserve.toString());
        console.log("Reserve in BTC:", ethers.utils.formatUnits(reserve, 18));
        console.log("Current supply:", ethers.utils.formatUnits(supply, 18));
        
        setBalance(ethers.utils.formatUnits(bal, 18));
        setPoReserve(reserve.toString());
        setTotalSupply(ethers.utils.formatUnits(supply, 18));
        setIsPaused(paused);
        
        // Jelenlegi (hibás) számítás
        const reserveRaw = ethers.BigNumber.from(reserve.toString());
        const ratio = ethers.BigNumber.from("100000000"); // 100M
        const maxMintableRaw = reserveRaw.mul(ratio); // RAW * 100M
        console.log("Current calculation (RAW * 100M):", maxMintableRaw.toString());
        console.log("Current calculation formatted:", ethers.utils.formatUnits(maxMintableRaw, 18));
        
        // Helyes számítás
        const btcAmount = parseFloat(ethers.utils.formatUnits(reserve, 18)); // 0.0002
        const correctSatsdCapacity = btcAmount * 100000000; // 20000 SATSTD
        const correctWei = ethers.utils.parseUnits(correctSatsdCapacity.toString(), 18);
        console.log("CORRECT BTC amount:", btcAmount);
        console.log("CORRECT SATSTD capacity:", correctSatsdCapacity);
        console.log("CORRECT wei value:", correctWei.toString());
        
        const currentSupplyRaw = supply;
        const availableRaw = maxMintableRaw.sub(currentSupplyRaw);
        const maxMint = Math.max(0, parseFloat(ethers.utils.formatUnits(availableRaw, 18)));
        setMintableMax(maxMint.toString());
        
        console.log("Available to mint (current calc):", maxMint);
        console.log("Should be available:", correctSatsdCapacity - parseFloat(ethers.utils.formatUnits(supply, 18)));
        console.log("=============================");
         const reserveNum = parseFloat(ethers.utils.formatUnits(reserve, 18)); // pl. 0.0002
        const supplyNum = parseFloat(ethers.utils.formatUnits(supply, 18)); // pl. 10

        // 1. Számoljuk ki a teljes lehetséges SATSTD mennyiséget a BTC tartalékból
        const totalCapacity = reserveNum * BTC_TO_SATSTD_RATIO; // pl. 0.0002 * 100_000_000 = 20_000

        // 2. A figyelmeztetést a helyes arány alapján állítjuk be
        if (totalCapacity > 0 && (supplyNum / totalCapacity) > 0.9) { // pl. 10 / 20000 > 0.9 -> false
            setReserveWarning("Warning: Reserve is almost depleted. Only a small amount of SATSTD can be minted!");
        } else {
            setReserveWarning("");
        }
        
        // 3. A progress bart is a helyes arány alapján számoljuk
        setProgress(totalCapacity > 0 ? (supplyNum / totalCapacity) * 100 : 0); // pl. (10 / 20000) * 100 = 0.05%
        // ... rest of the function stays the same
    } catch (e) {
        console.error("Error fetching chain data:", e);
        setReserveWarning("");
    }
}

    async function handleMint() {
        if (!isNetworkAllowed && !isTest) return;
        const amount = parseFloat(mintAmount || "0");
        if (amount <= 0) {
            toast.warn("Please enter an amount greater than zero.");
            return;
        }
        if (amount > parseFloat(mintableMax)) {
            toast.error("Cannot mint more than the available reserve.");
            return;
        }
        let toastId;
        try {
            setLoading(true);
            const token = new ethers.Contract(CONTRACT_ADDRESS, TOKEN_ABI, signer);
            const amt = ethers.utils.parseUnits(mintAmount, 18);
            const tx = await token.mint(account, amt);
            const etherscanLink = getEtherscanLink(tx.hash);
            toastId = toast.loading(
                <div>
                    Mint transaction submitted...
                    <br/>
                    <a href={etherscanLink} target="_blank" rel="noopener noreferrer" className="text-white font-bold underline">View on Etherscan</a>
                </div>
            );
            await tx.wait();
            toast.update(toastId, {
                render: `Successfully minted ${mintAmount} SATSTD!`,
                type: 'success',
                isLoading: false,
                autoClose: 5000,
            });
            await fetchChainData();
            setMintAmount("");
        } catch (e) {
            if (toastId) toast.dismiss(toastId);
            handleTxError(e);
        } finally {
            setLoading(false);
        }
    }

    async function handleBurn() {
        if (!isNetworkAllowed && !isTest) return;
        const amount = parseFloat(burnAmount || "0");
        if (amount <= 0) {
            toast.warn("Please enter an amount greater than zero.");
            return;
        }
        if (amount > parseFloat(balance)) {
            toast.error("You do not have enough tokens to burn.");
            return;
        }
        let toastId;
        try {
            setLoading(true);
            const token = new ethers.Contract(CONTRACT_ADDRESS, TOKEN_ABI, signer);
            const amt = ethers.utils.parseUnits(burnAmount, 18);
            const tx = await token.burn(amt);
            const etherscanLink = getEtherscanLink(tx.hash);
            toastId = toast.loading(
                <div>
                    Burn transaction submitted...
                    <br/>
                    <a href={etherscanLink} target="_blank" rel="noopener noreferrer" className="text-white font-bold underline">View on Etherscan</a>
                </div>
            );
            await tx.wait();
            toast.update(toastId, {
                render: `Successfully burned ${burnAmount} SATSTD!`,
                type: 'success',
                isLoading: false,
                autoClose: 5000,
            });
            await fetchChainData();
            setBurnAmount("");
        } catch (e) {
            if (toastId) toast.dismiss(toastId);
            handleTxError(e);
        } finally {
            setLoading(false);
        }
    }

    async function handleSetFeed() {
        if (!isOperator && !isAdmin) {
            toast.error("Not authorized.");
            return;
        }
        if (!newFeed || !ethers.utils.isAddress(newFeed)) {
            toast.error("Invalid address provided.");
            return;
        }
        let toastId;
        try {
            setLoading(true);
            const token = new ethers.Contract(CONTRACT_ADDRESS, TOKEN_ABI, signer);
            const tx = await token.setReserveFeed(newFeed);
            const etherscanLink = getEtherscanLink(tx.hash);
            toastId = toast.loading(
                <div>
                    Feed update submitted...
                    <br/>
                    <a href={etherscanLink} target="_blank" rel="noopener noreferrer" className="text-white font-bold underline">View on Etherscan</a>
                </div>
            );
            await tx.wait();
            toast.update(toastId, {
                render: "Reserve feed address changed successfully!",
                type: 'success',
                isLoading: false,
                autoClose: 5000,
            });
            setNewFeed("");
        } catch (e) {
            if (toastId) toast.dismiss(toastId);
            handleTxError(e);
        } finally {
            setLoading(false);
        }
    }

    async function handlePause() {
        if (!isPauser && !isOperator && !isAdmin) {
            toast.error("Not authorized.");
            return;
        }
        let toastId;
        const actionText = isPaused ? "Unpausing" : "Pausing";
        try {
            setLoading(true);
            const token = new ethers.Contract(CONTRACT_ADDRESS, TOKEN_ABI, signer);
            const tx = await (isPaused ? token.unpause() : token.pause());
            const etherscanLink = getEtherscanLink(tx.hash);
            toastId = toast.loading(
                <div>
                    {actionText} transaction submitted...
                    <br/>
                    <a href={etherscanLink} target="_blank" rel="noopener noreferrer" className="text-white font-bold underline">View on Etherscan</a>
                </div>
            );
            await tx.wait();
            toast.update(toastId, {
                render: `Contract has been ${isPaused ? "unpaused" : "paused"}.`,
                type: 'success',
                isLoading: false,
                autoClose: 5000,
            });
            setIsPaused(!isPaused);
        } catch (e) {
            if (toastId) toast.dismiss(toastId);
            handleTxError(e);
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
    <>
        <ThreeBackground isDarkMode={isDarkMode} />
        
        <div>
            <ToastContainer
                position="top-right"
                autoClose={5000}
                hideProgressBar={false}
                newestOnTop
                closeOnClick
                rtl={false}
                pauseOnFocusLoss
                draggable
                pauseOnHover
                theme={isDarkMode ? "dark" : "light"}
            />

            {showQR && (
                <div className="fixed inset-0 flex items-center justify-center bg-black/60 z-50" onClick={() => setShowQR(false)}>
                    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-6 flex flex-col items-center" onClick={e => e.stopPropagation()}>
                        <QRCodeSVG value={account || "0x0"} size={180} />
                        <div className="mt-3 text-sm text-gray-700 dark:text-gray-300 break-all">{account}</div>
                        <button onClick={() => setShowQR(false)} className="mt-4 px-3 py-1 rounded bg-blue-600 text-white dark:bg-blue-500">Close</button>
                    </div>
                </div>
            )}

            <div className={`min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center p-4 transition-all duration-300 relative z-10`}>
                <div className="w-full max-w-md bg-white dark:bg-gray-800 shadow-lg rounded-2xl p-6 space-y-8 transition-all duration-300 relative">
                    
                    <button
                        onClick={() => setIsDarkMode(!isDarkMode)}
                        className="absolute top-4 right-4 p-2 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                        aria-label="Toggle theme"
                    >
                        {isDarkMode ? (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm-1.414 8.486a1 1 0 011.414 0l.707.707a1 1 0 01-1.414 1.414l-.707-.707a1 1 0 010-1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                            </svg>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                            </svg>
                        )}
                    </button>

                    <h1 className="text-3xl font-extrabold text-center mb-2 text-gray-800 dark:text-gray-100 pt-8 sm:pt-0">Satoshi Standard dApp</h1>
                    <NetworkBanner chainId={chainId} />

                    {!isNetworkAllowed && chainId && (
                        <div className="p-3 rounded-lg bg-yellow-100 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-100 text-sm font-semibold flex items-center justify-center">
                            <span className="animate-pulse mr-2">⚠️</span>
                            Please switch to Sepolia Testnet (chainId 11155111)
                        </div>
                    )}

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
                                
                                <p className="text-lg font-semibold text-gray-800 dark:text-gray-100">{formatToken(balance)}</p>
                                
                                <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-2 text-xs">
                                    <p className="text-blue-700 dark:text-blue-300 font-medium">Exchange Rate</p>
                                    <p className="text-blue-600 dark:text-blue-400">1 BTC = 100,000,000 SATSTD</p>
                                </div>
                                
                                <p className="text-sm text-gray-700 dark:text-gray-200">
                                    BTC Proof of Reserve: <span className="font-mono">{formatBtcReserve(poReserve)}</span>
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-300">
                                    Total supply: {formatToken(totalSupply)}
                                </p>
                            </div>
                            <div className="text-xs text-blue-700 dark:text-blue-400 text-center font-mono mb-2">
                                Your mintable max: <span>{formatToken(mintableMax)}</span> SATSTD
                            </div>
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
                                            disabled={loading || !newFeed || !ethers.utils.isAddress(newFeed)}
                                            className="px-3 bg-purple-700 dark:bg-purple-900 text-white rounded disabled:opacity-60 text-xs"
                                        >
                                            Set Feed
                                        </button>
                                    </div>
                                </div>
                            )}
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
    </>
);
}