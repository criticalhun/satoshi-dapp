// src/utils/helpers.js

export function formatToken(amount, decimals = 8, currency = "SATSTD") {
  if (!amount) return "0";
  const num = Number(amount);
  if (isNaN(num)) return amount;
  return num.toLocaleString("en-US", { maximumFractionDigits: decimals }) + ` ${currency}`;
}

export function formatSatsToBTC(amount) {
  if (!amount) return "0";
  const btc = Number(amount) / 1e8;
  return btc.toLocaleString("en-US", { maximumFractionDigits: 8 }) + " BTC";
}

export function shortenAddress(addr) {
  if (!addr) return "";
  return addr.slice(0, 6) + "..." + addr.slice(-4);
}
