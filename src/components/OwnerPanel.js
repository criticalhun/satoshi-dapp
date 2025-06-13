// src/components/OwnerPanel.js
import React from "react";

export default function OwnerPanel({
  newBacking,
  setNewBacking,
  loading,
  totalSupply,
  handleSetPoR,
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-800 dark:text-gray-100">
        Set Mock PoR Backing (satoshi){" "}
        <span className="ml-1 text-xs text-gray-400">ⓘ Reserve cannot be set below total supply!</span>
      </label>
      <div className="flex space-x-2">
        <input
          type="number"
          value={newBacking}
          onChange={(e) => setNewBacking(e.target.value)}
          disabled={loading}
          className="flex-1 p-2 border rounded dark:bg-gray-700 dark:text-white"
          placeholder="e.g. 1000000"
        />
        <button
          onClick={handleSetPoR}
          disabled={
            loading ||
            !newBacking ||
            isNaN(newBacking) ||
            parseFloat(newBacking) < parseFloat(totalSupply)
          }
          className="px-4 bg-purple-600 dark:bg-purple-800 text-white rounded disabled:opacity-50 flex items-center"
        >
          {loading ? (
            <span className="loader mr-1 w-3 h-3 border-2 border-white border-t-purple-600 rounded-full animate-spin"></span>
          ) : null}
          {loading ? "Updating..." : "Set"}
        </button>
      </div>
      {newBacking &&
        parseFloat(newBacking) < parseFloat(totalSupply) && (
          <div className="text-xs text-red-500 mt-1">
            Reserve cannot be set below current total supply!
          </div>
        )}
    </div>
  );
}
