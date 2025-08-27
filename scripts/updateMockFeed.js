// scripts/updateMockFeed.js
const { ethers } = require("hardhat");

async function main() {
  // Itt állítsd be az új BTC értéket és a MockFeed címét
  const MOCK_FEED_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3"; // Cseréld ki a valós címre!
  const NEW_BTC_AMOUNT = "0.0002"; // Változtatható érték - bármilyen decimális szám
  
  console.log("=== MockFeed Update ===");
  console.log("MockFeed address:", MOCK_FEED_ADDRESS);
  console.log("New BTC amount:", NEW_BTC_AMOUNT);
  
  // Konvertálás 18 decimálra
  const newValue = ethers.utils.parseUnits(NEW_BTC_AMOUNT, 18);
  
  console.log("Values:");
  console.log("- New BTC amount:", NEW_BTC_AMOUNT);
  console.log("- Raw value (18 decimal):", newValue.toString());
  
  // Contract csatlakozás
  const MockFeed = await ethers.getContractAt("MockFeed", MOCK_FEED_ADDRESS);
  
  // Jelenlegi érték lekérdezés
  console.log("\n=== Current State ===");
  const oldValue = await MockFeed.latestAnswer();
  const oldBtc = ethers.utils.formatUnits(oldValue, 18);
  console.log("Current raw value:", oldValue.toString());
  console.log("Current BTC value:", oldBtc);
  
  // SATSTD kapacitás számítás (régi)
  const oldSatsdCapacity = parseFloat(oldBtc) * 100000000;
  console.log("Current SATSTD capacity:", oldSatsdCapacity.toLocaleString());
  
  // Érték frissítés
  console.log("\n=== Updating... ===");
  const tx = await MockFeed.set(newValue);
  console.log("Transaction hash:", tx.hash);
  console.log("Waiting for confirmation...");
  await tx.wait();
  
  // Ellenőrzés
  console.log("\n=== Updated State ===");
  const updatedValue = await MockFeed.latestAnswer();
  const updatedBtc = ethers.utils.formatUnits(updatedValue, 18);
  console.log("Updated raw value:", updatedValue.toString());
  console.log("Updated BTC value:", updatedBtc);
  
  // SATSTD kapacitás számítás (új)
  const newSatsdCapacity = parseFloat(updatedBtc) * 100000000;
  console.log("New SATSTD capacity:", newSatsdCapacity.toLocaleString());
  
  // Változás
  const btcChange = parseFloat(updatedBtc) - parseFloat(oldBtc);
  const satsdChange = newSatsdCapacity - oldSatsdCapacity;
  console.log("\n=== Changes ===");
  console.log("BTC change:", btcChange > 0 ? `+${btcChange}` : btcChange);
  console.log("SATSTD capacity change:", satsdChange > 0 ? `+${satsdChange.toLocaleString()}` : satsdChange.toLocaleString());
  
  console.log("\n✅ MockFeed updated successfully!");
  
  console.log("\n=== Next Steps ===");
  console.log("1. Refresh your dApp to see the new BTC reserve");
  console.log("2. New mintable max should be around:", newSatsdCapacity.toLocaleString(), "SATSTD");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
