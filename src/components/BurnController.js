// src/components/BurnController.js
import React from "react";

export default function BurnController({
  burnAmount, setBurnAmount,
  balance, loading, isNetworkAllowed, isTest,
  handleBurn
}) {
  return (
 <div className="space-y-3">
    <label className="block text-sm font-medium bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent">
      Burn Amount 🔥
    </label>
    <div className="flex space-x-2">
      <div className="relative flex-1 group">
        <input
          type="text"
          value={burnAmount}
          onChange={(e) => setBurnAmount(e.target.value)}
          disabled={loading}
          className="w-full p-3 rounded-xl bg-black/20 dark:bg-white/10 text-white dark:text-white border border-orange-400/30 focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 backdrop-blur-sm transition-all duration-300 group-hover:border-orange-400/50"
          placeholder="0.0"
        />
        <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-orange-400/10 to-red-400/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
      </div>
      <button
        onClick={handleBurn}
        disabled={loading || !burnAmount || parseFloat(burnAmount) === 0 || parseFloat(burnAmount) > parseFloat(balance)}
        className="px-6 py-2 rounded-xl bg-gradient-to-r from-orange-500/80 to-red-500/80 text-white font-bold hover:from-orange-400 hover:to-red-400 disabled:opacity-50 transition-all duration-300 transform hover:scale-105 hover:shadow-lg hover:shadow-orange-400/25 backdrop-blur-sm border border-orange-400/30 relative overflow-hidden group"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-orange-400/20 to-red-400/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
        <span className="relative z-10">
          {loading ? "Processing..." : "Burn"}
        </span>
      </button>
    </div>
  </div>
);
}
