// src/components/MintController.js
import React from "react";

export default function MintController({
  mintAmount, setMintAmount,
  mintableMax, loading, isNetworkAllowed, isTest,
  handleMint
}) {
  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
        Mint Amount ⚡
      </label>
      <div className="flex space-x-2">
        <div className="relative flex-1 group">
          <input
            type="text"
            aria-label="mint"
            value={mintAmount}
            onChange={(e) => setMintAmount(e.target.value)}
            disabled={loading || (!isNetworkAllowed && !isTest)}
            className="w-full p-3 rounded-xl bg-black/20 dark:bg-white/10 text-white dark:text-white border border-cyan-400/30 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 backdrop-blur-sm transition-all duration-300 group-hover:border-cyan-400/50"
            placeholder="0.0"
          />
          <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-cyan-400/10 to-purple-400/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
        </div>
        <button
          type="button"
          onClick={() => setMintAmount(mintableMax)}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-500/80 to-purple-500/80 text-white font-bold hover:from-blue-400 hover:to-purple-400 transition-all duration-300 transform hover:scale-105 hover:shadow-lg hover:shadow-blue-400/25 backdrop-blur-sm border border-blue-400/30"
          disabled={mintableMax === "0"}
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
          className="px-6 py-2 rounded-xl bg-gradient-to-r from-green-500/80 to-emerald-500/80 text-white font-bold hover:from-green-400 hover:to-emerald-400 disabled:opacity-50 transition-all duration-300 transform hover:scale-105 hover:shadow-lg hover:shadow-green-400/25 backdrop-blur-sm border border-green-400/30 relative overflow-hidden group flex items-center"
        >
          {loading ? (
            <span className="loader mr-2 w-4 h-4 border-2 border-white border-t-green-400 rounded-full animate-spin"></span>
          ) : null}
          <div className="absolute inset-0 bg-gradient-to-r from-green-400/20 to-emerald-400/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
          <span className="relative z-10">
            {loading ? "Processing..." : "Mint"}
          </span>
        </button>
      </div>
      {mintAmount && parseFloat(mintAmount) > parseFloat(mintableMax) && (
        <div className="text-xs text-red-400 mt-2 p-2 rounded-lg bg-red-500/10 border border-red-400/20 animate-pulse">
          ⚠️ Not enough BTC reserve for this mint.
        </div>
      )}
    </div>
  );
}