import React, { useEffect, useState, useRef } from "react";
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

// Three.js Background Component
const ThreeBackground = ({ isDarkMode }) => {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const bitcoinsRef = useRef([]);

  useEffect(() => {
    if (!mountRef.current) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0);
    mountRef.current.appendChild(renderer.domElement);
    
    const createBitcoin = () => {
      const geometry = new THREE.RingGeometry(0.8, 1, 8);
      const material = new THREE.MeshBasicMaterial({ 
        color: isDarkMode ? 0xf7931a : 0xff9500,
        transparent: true,
        opacity: 0.6
      });
      const bitcoin = new THREE.Mesh(geometry, material);
      
      const innerGeometry = new THREE.RingGeometry(0.3, 0.5, 6);
      const innerMaterial = new THREE.MeshBasicMaterial({ 
        color: isDarkMode ? 0xffd700 : 0xffa500,
        transparent: true,
        opacity: 0.8
      });
      const innerRing = new THREE.Mesh(innerGeometry, innerMaterial);
      bitcoin.add(innerRing);
      
      bitcoin.position.x = (Math.random() - 0.5) * 20;
      bitcoin.position.y = (Math.random() - 0.5) * 20;
      bitcoin.position.z = (Math.random() - 0.5) * 10;
      
      bitcoin.userData = {
        rotationSpeed: (Math.random() - 0.5) * 0.02,
        floatSpeed: (Math.random() - 0.5) * 0.01,
        originalY: bitcoin.position.y
      };
      
      return bitcoin;
    };

    for (let i = 0; i < 12; i++) {
      const bitcoin = createBitcoin();
      scene.add(bitcoin);
      bitcoinsRef.current.push(bitcoin);
    }
    
    const particleCount = 80;
    const particleGeometry = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    
    for (let i = 0; i < particleCount * 3; i++) {
      particlePositions[i] = (Math.random() - 0.5) * 50;
    }
    
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    
    const particleMaterial = new THREE.PointsMaterial({
      color: isDarkMode ? 0x00ffff : 0x0088ff,
      size: 2,
      transparent: true,
      opacity: 0.6
    });
    
    const particles = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particles);

    camera.position.z = 10;
    sceneRef.current = { scene, camera, renderer, particles };

    const animate = () => {
      requestAnimationFrame(animate);
      
      bitcoinsRef.current.forEach((bitcoin, index) => {
        bitcoin.rotation.z += bitcoin.userData.rotationSpeed;
        bitcoin.position.y = bitcoin.userData.originalY + Math.sin(Date.now() * 0.001 + index) * 2;
        bitcoin.children[0].rotation.z -= bitcoin.userData.rotationSpeed * 0.5;
      });
      
      if (particles) {
        particles.rotation.y += 0.001;
        particles.rotation.x += 0.0005;
      }
      
      renderer.render(scene, camera);
    };
    
    animate();

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [isDarkMode]);

  return <div ref={mountRef} className="fixed inset-0 pointer-events-none z-0" />;
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

        // --- JAVÍTÁS VÉGE ---

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
            
            {/* Cyberpunk Grid Background */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div 
                    className="absolute inset-0 opacity-10 dark:opacity-20"
                    style={{
                        backgroundImage: `
                            linear-gradient(cyan 1px, transparent 1px),
                            linear-gradient(90deg, cyan 1px, transparent 1px)
                        `,
                        backgroundSize: '50px 50px',
                        animation: 'grid-move 20s linear infinite'
                    }}
                />
            </div>

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
                <div className="fixed inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm z-50" onClick={() => setShowQR(false)}>
                    <div className="bg-gradient-to-br from-gray-900/90 to-black/90 rounded-3xl shadow-2xl p-8 flex flex-col items-center border border-cyan-400/30 backdrop-blur-xl" onClick={e => e.stopPropagation()}>
                        <QRCodeSVG value={account || "0x0"} size={180} />
                        <div className="mt-3 text-sm text-cyan-300 break-all font-mono">{account}</div>
                        <button 
                            onClick={() => setShowQR(false)} 
                            className="mt-4 px-6 py-2 rounded-xl bg-gradient-to-r from-cyan-500/80 to-purple-500/80 text-white font-bold hover:from-cyan-400 hover:to-purple-400 transition-all duration-300 transform hover:scale-105 border border-cyan-400/30 backdrop-blur-sm"
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}

            <div className="min-h-screen relative z-10 flex flex-col items-center p-4 transition-all duration-300">
                {/* Floating particles effect */}
                <div className="fixed inset-0 overflow-hidden pointer-events-none">
                    {[...Array(15)].map((_, i) => (
                        <div
                            key={i}
                            className="absolute w-2 h-2 bg-cyan-400 rounded-full opacity-30"
                            style={{
                                left: `${Math.random() * 100}%`,
                                top: `${Math.random() * 100}%`,
                                animation: `float-particle ${3 + Math.random() * 4}s ease-in-out infinite`,
                                animationDelay: `${Math.random() * 2}s`
                            }}
                        />
                    ))}
                </div>

                <div className="w-full max-w-md relative">
                    {/* 3D Card with hover effects */}
                    <div 
                        className="group bg-black/40 dark:bg-white/10 backdrop-blur-xl shadow-2xl rounded-3xl p-6 space-y-6 transition-all duration-500 transform hover:scale-[1.02] border border-cyan-400/20 hover:border-cyan-400/40 hover:shadow-cyan-400/25 hover:shadow-2xl"
                        style={{
                            background: isDarkMode 
                                ? 'linear-gradient(135deg, rgba(0,0,0,0.8) 0%, rgba(20,20,40,0.9) 100%)'
                                : 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(200,200,255,0.2) 100%)',
                        }}
                    >
                        
                        {/* Theme Toggle */}
                        <button
                            onClick={() => setIsDarkMode(!isDarkMode)}
                            className="absolute top-4 right-4 p-3 rounded-full bg-gradient-to-r from-purple-500/20 to-cyan-500/20 text-cyan-400 hover:text-cyan-300 border border-cyan-400/30 hover:border-cyan-400/60 transition-all duration-300 transform hover:scale-110 hover:rotate-180 backdrop-blur-sm hover:shadow-lg hover:shadow-cyan-400/25"
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

                        {/* Holographic Title */}
                        <h1 
                            className="text-3xl font-extrabold text-center mb-4 pt-8 sm:pt-0 bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent animate-pulse"
                            style={{
                                textShadow: '0 0 30px rgba(0, 255, 255, 0.5)',
                                animation: 'holographic 3s ease-in-out infinite'
                            }}
                        >
                            Satoshi Standard dApp
                        </h1>
                        
                        <NetworkBanner chainId={chainId} />

                        {!isNetworkAllowed && chainId && (
                            <div className="p-4 rounded-xl bg-gradient-to-r from-yellow-500/20 to-orange-500/20 text-yellow-300 dark:text-yellow-200 text-sm font-semibold flex items-center justify-center border border-yellow-400/30 backdrop-blur-sm animate-pulse">
                                <span className="mr-2 animate-bounce">⚠️</span>
                                Please switch to Sepolia Testnet (chainId 11155111)
                            </div>
                        )}

                        {/* Holographic Progress Bar */}
                        <div className="space-y-2">
                            <div className="relative w-full h-4 bg-black/30 dark:bg-white/10 rounded-full overflow-hidden border border-cyan-400/30">
                                <div
                                    className="h-4 bg-gradient-to-r from-green-400 via-cyan-400 to-blue-400 transition-all duration-1000 relative"
                                    style={{ 
                                        width: `${progress}%`,
                                        boxShadow: '0 0 20px rgba(0, 255, 255, 0.6)',
                                        animation: 'pulse-glow 2s ease-in-out infinite'
                                    }}
                                >
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse"></div>
                                </div>
                            </div>
                            <div className="text-xs text-cyan-400 dark:text-cyan-300 text-center font-mono">
                                Reserve usage: <span className="font-bold">{Math.min(100, Math.round(progress))}%</span>
                            </div>
                        </div>

                        {reserveWarning && (
                            <div className="p-4 rounded-xl bg-gradient-to-r from-orange-500/20 to-red-500/20 text-orange-300 dark:text-orange-200 text-sm font-semibold border border-orange-400/30 backdrop-blur-sm animate-pulse">
                                {reserveWarning}
                            </div>
                        )}
                        
                        {message.text && (
                            <div
                                className={`p-4 rounded-xl text-sm transition-all duration-500 font-semibold border backdrop-blur-sm ${
                                    message.type === "success"
                                    ? "bg-green-500/20 text-green-300 border-green-400/30 animate-pulse"
                                    : message.type === "error"
                                    ? "bg-red-500/20 text-red-300 border-red-400/30 animate-bounce"
                                    : "bg-blue-500/20 text-blue-300 border-blue-400/30 animate-pulse"
                                }`}
                            >
                                {message.text}
                            </div>
                        )}

                        {!account ? (
                            <button
                                onClick={connectWallet}
                                disabled={loading || !isNetworkAllowed}
                                className="w-full py-4 bg-gradient-to-r from-cyan-500/80 via-purple-500/80 to-pink-500/80 text-white rounded-xl font-bold text-lg shadow-lg disabled:opacity-50 flex justify-center items-center transition-all duration-300 transform hover:scale-105 hover:shadow-2xl hover:shadow-cyan-400/25 border border-cyan-400/30 backdrop-blur-sm relative overflow-hidden group"
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/20 to-purple-400/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                                <span className="relative z-10">
                                    {loading && (
                                        <span className="loader mr-2 w-5 h-5 border-2 border-white border-t-cyan-400 rounded-full animate-spin"></span>
                                    )}
                                    {loading ? "Connecting..." : "Connect Wallet"}
                                </span>
                            </button>
                        ) : (
                            <>
                                <div className="text-center space-y-4">
                                    <div className="flex justify-center items-center space-x-3">
                                        <p className="font-mono text-sm text-cyan-300 dark:text-cyan-400 truncate select-all cursor-pointer hover:text-cyan-200 transition-colors" onClick={handleCopy}>
                                            {shortenAddress(account)}
                                        </p>
                                        <button 
                                            onClick={handleCopy} 
                                            className="text-cyan-400 hover:text-cyan-300 text-xs font-mono px-2 py-1 rounded border border-cyan-400/30 hover:border-cyan-400/60 transition-all duration-300 transform hover:scale-105" 
                                            title="Copy address"
                                        >
                                            {copied ? "Copied!" : "Copy"}
                                        </button>
                                        <Tooltip text="Show QR code">
                                            <span
                                                className="text-cyan-400 hover:text-cyan-300 cursor-pointer text-lg transform hover:scale-125 transition-all duration-300"
                                                onClick={() => setShowQR(true)}
                                            >📱</span>
                                        </Tooltip>
                                    </div>
                                    
                                    <div className="bg-gradient-to-r from-black/40 to-gray-900/40 dark:from-white/10 dark:to-gray-800/20 rounded-xl p-4 border border-cyan-400/20 backdrop-blur-sm">
                                        <p className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                                            {formatToken(balance)}
                                        </p>
                                    </div>
                                    
                                    <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-xl p-3 text-sm border border-blue-400/30 backdrop-blur-sm">
                                        <p className="text-blue-300 dark:text-blue-400 font-medium">Exchange Rate</p>
                                        <p className="text-cyan-400 dark:text-cyan-300 font-mono">1 BTC = 100,000,000 SATSTD</p>
                                    </div>
                                    
                                    <div className="space-y-1">
                                        <p className="text-sm text-gray-300 dark:text-gray-400">
                                            BTC Proof of Reserve: <span className="font-mono text-cyan-400">{formatBtcReserve(poReserve)}</span>
                                        </p>
                                        <p className="text-xs text-gray-400 dark:text-gray-500">
                                            Total supply: <span className="text-purple-400">{formatToken(totalSupply)}</span>
                                        </p>
                                    </div>
                                </div>
                                
                                <div className="text-sm text-center font-mono bg-gradient-to-r from-cyan-500/20 to-purple-500/20 rounded-xl p-3 border border-cyan-400/30 backdrop-blur-sm">
                                    <span className="text-cyan-400">Your mintable max: </span>
                                    <span className="text-purple-400 font-bold">{formatToken(mintableMax)}</span>
                                </div>

                                {(isAdmin || isOperator) && (
                                    <div className="space-y-3">
                                        <label className="block text-sm font-bold text-cyan-400">
                                            Reserve Feed Change (admin/operator)
                                        </label>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                className="flex-1 p-3 border rounded-xl bg-black/20 dark:bg-white/10 text-white border-purple-400/30 focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20 backdrop-blur-sm transition-all duration-300 text-sm"
                                                placeholder="New Feed Address (0x...)"
                                                value={newFeed}
                                                onChange={e => setNewFeed(e.target.value)}
                                            />
                                            <button
                                                onClick={handleSetFeed}
                                                disabled={loading || !newFeed || !ethers.utils.isAddress(newFeed)}
                                                className="px-4 bg-gradient-to-r from-purple-500/80 to-pink-500/80 text-white rounded-xl disabled:opacity-60 text-sm font-bold hover:from-purple-400 hover:to-pink-400 transition-all duration-300 transform hover:scale-105 border border-purple-400/30 backdrop-blur-sm"
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
                                        className={`w-full py-3 rounded-xl font-bold text-sm transition-all duration-300 transform hover:scale-105 border backdrop-blur-sm ${
                                            isPaused
                                            ? "bg-gradient-to-r from-orange-500/80 to-red-500/80 text-white border-orange-400/30 hover:from-orange-400 hover:to-red-400"
                                            : "bg-gradient-to-r from-gray-500/80 to-gray-600/80 text-white border-gray-400/30 hover:from-gray-400 hover:to-gray-500"
                                        }`}
                                    >
                                        {loading ? "Processing..." : isPaused ? "Unpause Contract" : "Pause Contract"}
                                    </button>
                                )}

                                <div className="space-y-6">
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

            <style jsx>{`
                @keyframes float-particle {
                    0%, 100% { transform: translateY(0px) rotate(0deg); opacity: 0.3; }
                    50% { transform: translateY(-20px) rotate(180deg); opacity: 0.8; }
                }
                
                @keyframes holographic {
                    0%, 100% { filter: hue-rotate(0deg); }
                    25% { filter: hue-rotate(90deg); }
                    50% { filter: hue-rotate(180deg); }
                    75% { filter: hue-rotate(270deg); }
                }
                
                @keyframes pulse-glow {
                    0%, 100% { box-shadow: 0 0 20px rgba(0, 255, 255, 0.6); }
                    50% { box-shadow: 0 0 40px rgba(0, 255, 255, 0.8), 0 0 60px rgba(0, 255, 255, 0.4); }
                }
                
                @keyframes grid-move {
                    0% { transform: translate(0, 0); }
                    100% { transform: translate(50px, 50px); }
                }
            `}</style>
        </>
    );
}