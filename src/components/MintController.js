// src/components/MintController.js
import React from "react";

export default function MintController({
  mintAmount, setMintAmount,
  mintableMax, loading, isNetworkAllowed, isTest,
  handleMint
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-800 dark:text-gray-100">
        Mint Amount{" "}
        <span className="ml-1 text-xs text-gray-400">ⓘ</span>
      </label>
      <div className="flex space-x-2">
        <input
          type="text"
          aria-label="mint"
          value={mintAmount}
          onChange={(e) => setMintAmount(e.target.value)}
          disabled={loading || (!isNetworkAllowed && !isTest)}
          className="flex-1 p-2 border rounded dark:bg-gray-700 dark:text-white"
          placeholder="0.0"
        />
        <button
          type="button"
          onClick={() => setMintAmount(mintableMax)}
          className="px-2 bg-blue-200 dark:bg-blue-800 rounded text-xs font-bold hover:bg-blue-300 dark:hover:bg-blue-700 transition"
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
          className="px-4 bg-green-600 dark:bg-green-800 text-white rounded disabled:opacity-50 flex items-center"
        >
          {loading ? (
            <span className="loader mr-1 w-3 h-3 border-2 border-white border-t-green-600 rounded-full animate-spin"></span>
          ) : null}
          {loading ? "Processing..." : "Mint"}
        </button>
      </div>
      {mintAmount && parseFloat(mintAmount) > parseFloat(mintableMax) && (
        <div className="text-xs text-red-500 mt-1">
          Not enough BTC reserve for this mint.
        </div>
      )}
    </div>
  );
}
