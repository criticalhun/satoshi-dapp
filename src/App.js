import React, { useEffect, useState } from "react";
import NetworkBanner from "./components/NetworkBanner";
import MintController from "./components/MintController";
import BurnController from "./components/BurnController";
import { ethers } from "ethers";
import { QRCodeSVG } from "qrcode.react";
import { formatToken, formatSatsToBTC, shortenAddress } from "./utils/helpers";
// 1. LÉPÉS: Toastify importálása
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

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
// --- ÚJ HELPER FÜGGVÉNYEK ---

const getEtherscanLink = (hash) => {
// A DApp a Sepolia teszthálózatra van beállítva
if (chainId === 11155111) {
return `https://sepolia.etherscan.io/tx/${hash}`;
}
// Később más hálózatok is hozzáadhatók
return "";
};

const handleTxError = (error) => {
console.error("Transaction Error:", error); // A teljes hiba naplózása fejlesztőknek
let errorMessage = "An unknown error occurred. Please check the console.";

if (error.code === 'ACTION_REJECTED') {
errorMessage = "Transaction was rejected in your wallet.";
} else if (error.code === 'INSUFFICIENT_FUNDS') {
errorMessage = "Transaction failed: Not enough funds for gas fees.";
} else if (error.reason) {
// A szerződés `require` üzenetének használata
errorMessage = error.reason;
} else if (error.data && error.data.message) {
// Néha a hibaüzenet mélyebben van beágyazva
const nestedReason = error.data.message.match(/reverted with reason string '([^']*)'/);
if(nestedReason && nestedReason[1]) {
errorMessage = nestedReason[1];
} else {
errorMessage = "Transaction failed. Check contract conditions.";
}
}
toast.error(errorMessage);
};

// --- A KÓD TÖBBI RÉSZE NAGYRÉSZT VÁLTOZATLAN ---

useEffect(() => {
const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
if (prefersDark) document.documentElement.classList.add('dark');
else document.documentElement.classList.remove('dark');
}, []);

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
window.ethereum.request({ method: "eth_accounts" }).then((accs) => {
if (accs && accs[0]) {
processAndAuthorizeAccount(prov, accs[0]);
}
});
}, [isTest]);

const isNetworkAllowed = chainId === 11155111;

async function connectWallet() {
// ... (ez a rész változatlan maradt)
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
// ... (ez a rész változatlan maradt)
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
// ... (ez a rész változatlan maradt)
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
const maxMint = Math.max(0, parseFloat(ethers.utils.formatUnits(reserve, 18)) - parseFloat(ethers.utils.formatUnits(supply, 18)));
setMintableMax(maxMint.toString());
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
// --- MÓDOSÍTOTT TRANZAKCIÓS FÜGGVÉNYEK ---

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
<a href={etherscanLink} target="_blank" rel="noopener noreferrer" className="text-white font-bold underline">
View on Etherscan
</a>
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
const tx = await token.burn(account, amt);
const etherscanLink = getEtherscanLink(tx.hash);
toastId = toast.loading(
<div>
Burn transaction submitted...
<br/>
<a href={etherscanLink} target="_blank" rel="noopener noreferrer" className="text-white font-bold underline">
View on Etherscan
</a>
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
<a href={etherscanLink} target="_blank" rel="noopener noreferrer" className="text-white font-bold underline">
View on Etherscan
</a>
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
<a href={etherscanLink} target="_blank" rel="noopener noreferrer" className="text-white font-bold underline">
View on Etherscan
</a>
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
<div>
{/* 2. LÉPÉS: A ToastContainer hozzáadása az alkalmazás gyökeréhez */}
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
theme="colored"
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

{/* Az üzenet blokk megmaradt a nem-tranzakciós üzeneteknek (pl. connect) */}
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
);
}
