// src/components/BurnController.js
import React from "react";

export default function BurnController({
  burnAmount, setBurnAmount,
  balance, loading, isNetworkAllowed, isTest,
  handleBurn
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-800 dark:text-gray-100">
        Burn Amount{" "}
        <span className="ml-1 text-xs text-gray-400">ⓘ</span>
      </label>
      <div className="flex space-x-2">
        <input
          type="text"
          aria-label="burn"
          value={burnAmount}
          onChange={(e) => setBurnAmount(e.target.value)}
          disabled={loading || (!isNetworkAllowed && !isTest)}
          className="flex-1 p-2 border rounded dark:bg-gray-700 dark:text-white"
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
          className="px-4 bg-yellow-600 dark:bg-yellow-800 text-white rounded disabled:opacity-50 flex items-center"
        >
          {loading ? (
            <span className="loader mr-1 w-3 h-3 border-2 border-white border-t-yellow-600 rounded-full animate-spin"></span>
          ) : null}
          {loading ? "Processing..." : "Burn"}
        </button>
      </div>
      {burnAmount && parseFloat(burnAmount) > parseFloat(balance) && (
        <div className="text-xs text-red-500 mt-1">
          Insufficient token balance to burn.
        </div>
      )}
    </div>
  );
}
