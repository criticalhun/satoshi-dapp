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

// Segédfüggvény az esemény típusok azonosításához
export function getEventDisplayName(eventName) {
  const eventNames = {
    Transfer: "Token Transfer",
    Minted: "Token Mint",
    Burned: "Token Burn", 
    Paused: "Contract Paused",
    Unpaused: "Contract Unpaused",
    RoleGranted: "Role Granted",
    RoleRevoked: "Role Revoked",
    ReserveFeedChanged: "Reserve Feed Changed"
  };
  
  return eventNames[eventName] || eventName;
}

// Segédfüggvény a role nevek megjelenítéséhez
export function getRoleDisplayName(roleHash) {
  // Ezeket a hash-eket a szerződésből származtatjuk
  const roleNames = {
    "0xa49807205ce4d355092ef5a8a18f56e8913cf4a201fbe287825b095693c21775": "Admin",
    "0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6": "Minter", 
    "0x65d7a28e3265b37a6474929f336521b332c1681b933f6cb9f3376673440d862a": "Pauser",
    "0x97667070c54ef182b0f5858b034beac1b6f3089aa2d3188bb1e8929f4fa9b929": "Operator"
  };
  
  return roleNames[roleHash] || "Unknown Role";
}