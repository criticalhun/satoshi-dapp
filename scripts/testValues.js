// scripts/testValues.js - Gyors tesztelés különböző értékekkel
const { ethers } = require("hardhat");

async function main() {
  const MOCK_FEED_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3"; // Itt add meg a MockFeed címét
  
  // Tesztelhető értékek
  const testValues = [
    "0.0001",   // 10,000 SATSTD
    "0.0002",   // 20,000 SATSTD  
    "0.001",    // 100,000 SATSTD
    "0.01",     // 1,000,000 SATSTD
    "0.1",      // 10,000,000 SATSTD
    "1",        // 100,000,000 SATSTD
    "10",       // 1,000,000,000 SATSTD
  ];
  
  console.log("=== MockFeed Test Values ===");
  console.log("Available test values:");
  testValues.forEach((value, index) => {
    const satstdCapacity = parseFloat(value) * 100000000;
    console.log(`${index + 1}. ${value} BTC → ${satstdCapacity.toLocaleString()} SATSTD`);
  });
  
  // Választható érték (módosítsd az index-et)
  const SELECTED_INDEX = 1; // 0.0002 BTC (index 1)
  const selectedValue = testValues[SELECTED_INDEX];
  
  console.log(`\nSelected: ${selectedValue} BTC`);
  console.log("Expected SATSTD capacity:", (parseFloat(selectedValue) * 100000000).toLocaleString());
  
  // Frissítés
  if (MOCK_FEED_ADDRESS === "0x_YOUR_MOCKFEED_ADDRESS") {
    console.log("\n❌ Please update MOCK_FEED_ADDRESS first!");
    return;
  }
  
  const MockFeed = await ethers.getContractAt("MockFeed", MOCK_FEED_ADDRESS);
  const newValue = ethers.utils.parseUnits(selectedValue, 18);
  
  console.log("\nUpdating MockFeed...");
  const tx = await MockFeed.set(newValue);
  await tx.wait();
  
  // Ellenőrzés
  const currentValue = await MockFeed.latestAnswer();
  const currentBtc = ethers.utils.formatUnits(currentValue, 18);
  
  console.log("✅ Updated!");
  console.log("New BTC value:", currentBtc);
  console.log("New SATSTD capacity:", (parseFloat(currentBtc) * 100000000).toLocaleString());
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
