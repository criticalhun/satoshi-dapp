import React, { useEffect, useState } from "react";
import { ethers } from "ethers";
import WalletConnectProvider from "@walletconnect/web3-provider";

const CONTRACT_ADDRESS = "0x49ffdeF28EC2AFb9C0930a9Cc4aec6733F3b5d83";
const CONTRACT_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function balanceOf(address) view returns (uint256)",
  "function mint(address to, uint256 amount)",
  "function burn(address from, uint256 amount)"
];

// Sepolia chain ID constant
const SEPOLIA_CHAIN_ID = 11155111;
// Provide your Infura key for WalletConnect fallback
const INFURA_API_KEY = process.env.REACT_APP_INFURA_API_KEY;

export default function App() {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [account, setAccount] = useState("");
  const [balance, setBalance] = useState("0");
  const [mintAmount, setMintAmount] = useState("");
  const [burnAmount, setBurnAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });
  const [chainId, setChainId] = useState(null);

  useEffect(() => {
    if (window.ethereum) {
      const prov = new ethers.BrowserProvider(window.ethereum);
      setProvider(prov);
      window.ethereum.request({ method: 'eth_chainId' })
        .then(id => setChainId(parseInt(id, 16)))
        .catch(() => setChainId(null));
      window.ethereum.on('chainChanged', hex => setChainId(parseInt(hex, 16)));
    }
  }, []);

  async function connectWallet() {
    setLoading(true);
    try {
      let _provider;
      if (window.ethereum) {
        await window.ethereum.request({ method: "eth_requestAccounts" });
        _provider = new ethers.BrowserProvider(window.ethereum);
      } else {
        const wcProvider = new WalletConnectProvider({
          rpc: { [SEPOLIA_CHAIN_ID]: `https://sepolia.infura.io/v3/${INFURA_API_KEY}` }
        });
        await wcProvider.enable();
        _provider = new ethers.BrowserProvider(wcProvider);
      }
      setProvider(_provider);
      const accounts = await _provider.send("eth_accounts", []);
      const user = accounts[0];
      setAccount(user);
      setSigner(await _provider.getSigner());
      await fetchBalance(user);
      setMessage({ text: "Wallet connected", type: "success" });
    } catch (err) {
      console.error(err);
      setMessage({ text: "Connection failed", type: "error" });
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
      // silent
    }
  }

  async function handleMint() {
    setLoading(true);
    try {
      setMessage({ text: "Processing mint...", type: "info" });
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      const wei = ethers.parseUnits(mintAmount || "0", 18);
      const tx = await contract.mint(account, wei);
      await tx.wait();
      await fetchBalance(account);
      setMessage({ text: `Minted ${mintAmount} SATSTD`, type: "success" });
      setMintAmount("");
    } catch {
      setMessage({ text: "Mint failed", type: "error" });
    } finally {
      setLoading(false);
    }
  }

  async function handleBurn() {
    setLoading(true);
    try {
      setMessage({ text: "Processing burn...", type: "info" });
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      const wei = ethers.parseUnits(burnAmount || "0", 18);
      const tx = await contract.burn(account, wei);
      await tx.wait();
      await fetchBalance(account);
      setMessage({ text: `Burned ${burnAmount} SATSTD`, type: "success" });
      setBurnAmount("");
    } catch {
      setMessage({ text: "Burn failed", type: "error" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-4 max-w-md mx-auto">
      {/* Network switch warning */}
      {chainId !== SEPOLIA_CHAIN_ID && (
        <div className="w-full bg-yellow-200 text-yellow-800 p-3 mb-4 text-center rounded">
          ⚠️ A dApp csak a Sepolia teszthálózaton működik.
          <button
            onClick={async () => {
              try {
                await window.ethereum.request({
                  method: 'wallet_switchEthereumChain',
                  params: [{ chainId: '0xaa36a7' }],
                });
              } catch (err) {
                console.error('Hálózatváltási hiba:', err);
              }
            }}
            className="ml-2 px-3 py-1 bg-yellow-800 text-white rounded"
          >
            Váltás Sepoliára
          </button>
        </div>
      )}

      <h1 className="text-2xl font-bold mb-4">Satoshi Standard dApp</h1>

      {message.text && (
        <div className={`mb-4 p-2 rounded ${
          message.type === "success"
            ? 'bg-green-100 text-green-800'
            : message.type === "error"
            ? 'bg-red-100 text-red-800'
            : 'bg-blue-100 text-blue-800'
        }`}>
          {message.text}
        </div>
      )}

      {!account ? (
        <button
          onClick={connectWallet}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
        >
          {loading ? 'Connecting...' : 'Connect Wallet'}
        </button>
      ) : (
        <>
          <p className="mb-2">Connected: {account}</p>
          <p className="mb-4">Balance: {balance} SATSTD</p>
          <div className="mb-4">
            <label className="block mb-1">Mint Amount:</label>
            <input
              type="text"
              value={mintAmount}
              onChange={e => setMintAmount(e.target.value)}
              className="w-full p-2 border rounded"
              placeholder="0.0"
              disabled={loading}
            />
            <button
              onClick={handleMint}
              disabled={loading || !mintAmount}
              className="mt-2 px-4 py-2 bg-green-600 text-white rounded disabled:opacity-50"
            >
              {loading ? 'Processing...' : 'Mint'}
            </button>
          </div>
          <div>
            <label className="block mb-1">Burn Amount:</label>
            <input
              type="text"
              value={burnAmount}
              onChange={e => setBurnAmount(e.target.value)}
              className="w-full p-2 border rounded"
              placeholder="0.0"
              disabled={loading}
            />
            <button
              onClick={handleBurn}
              disabled={loading || !burnAmount}
              className="mt-2 px-4 py-2 bg-red-600 text-white rounded disabled:opacity-50"
            >
              {loading ? 'Processing...' : 'Burn'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
