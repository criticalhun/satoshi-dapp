// src/utils/helpers.js

export function formatToken(amount, decimals = 8, currency = "SATSTD") {
  if (!amount) return "0";
  const num = Number(amount);
  if (isNaN(num)) return amount;
  return num.toLocaleString("en-US", { maximumFractionDigits: decimals }) + ` ${currency}`;
}

export function formatBTC(amount) {
  if (!amount) return "0 BTC";
  // Amount is BTC with 18 decimals, need to format it properly
  const btc = Number(amount) / 1e18;
  return btc.toLocaleString("en-US", { maximumFractionDigits: 8 }) + " BTC";
}

export function formatBtcReserve(amount) {
  if (!amount) return "0 BTC";
  // Amount is BTC with 18 decimals
  const btc = Number(amount) / 1e18;
  return btc.toLocaleString("en-US", { maximumFractionDigits: 8 }) + " BTC";
}

export function formatSatsToBTC(amount) {
  if (!amount) return "0 BTC";
  // Legacy function for backward compatibility
  // If amount is already in 18 decimal BTC format
  const btc = Number(amount) / 1e18;
  return btc.toLocaleString("en-US", { maximumFractionDigits: 8 }) + " BTC";
}

export function shortenAddress(addr) {
  if (!addr) return "";
  return addr.slice(0, 6) + "..." + addr.slice(-4);
}