// scripts/deployMockFeed.js
const { ethers } = require("hardhat");

async function main() {
  // Változtatható BTC értékek - csak ezt kell módosítanod!
  const BTC_AMOUNT = "0.0002"; // Itt állítsd be a kívánt BTC mennyiséget
  
  console.log("=== MockFeed Deployment ===");
  console.log("Target BTC amount:", BTC_AMOUNT);
  
  // BTC értéket 18 decimálra konvertálás
  const initialValue = ethers.utils.parseUnits(BTC_AMOUNT, 18);
  
  console.log("Values:");
  console.log("- BTC amount:", BTC_AMOUNT);
  console.log("- Raw value (18 decimal):", initialValue.toString());
  console.log("- Scientific notation:", parseFloat(BTC_AMOUNT).toExponential());
  
  // Deploy
  const MockFeed = await ethers.getContractFactory("MockFeed");
  const feed = await MockFeed.deploy(initialValue);
  
  await feed.deployed();
  
  console.log("\n=== Deployment Success ===");
  console.log("MockFeed deployed to:", feed.address);
  console.log("Owner:", await feed.owner());
  
  // Ellenőrzés
  const currentValue = await feed.latestAnswer();
  const btcValue = ethers.utils.formatUnits(currentValue, 18);
  
  console.log("\n=== Verification ===");
  console.log("Stored raw value:", currentValue.toString());
  console.log("Stored BTC value:", btcValue);
  console.log("Match check:", BTC_AMOUNT === btcValue ? "✅ MATCH" : "❌ MISMATCH");
  
  // SATSTD számítás előnézet (1 BTC = 100M SATSTD)
  const satsdCapacity = parseFloat(btcValue) * 100000000;
  console.log("Expected SATSTD capacity:", satsdCapacity.toLocaleString(), "SATSTD");
  
  console.log("\n=== Usage Instructions ===");
  console.log("1. Copy this address to your App.js FEED_ADDRESS:");
  console.log(`   const FEED_ADDRESS = "${feed.address}";`);
  console.log("\n2. To update value later, use:");
  console.log(`   npx hardhat run scripts/updateMockFeed.js --network sepolia`);
  
  console.log("\n=== Test Values You Can Try ===");
  const testValues = ["0.0001", "0.001", "0.01", "0.1", "1", "10", "100", "1000"];
  testValues.forEach(val => {
    const satstd = parseFloat(val) * 100000000;
    console.log(`- ${val} BTC = ${satstd.toLocaleString()} SATSTD`);
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});