// scripts/restoreMockFeedValue.js
const { ethers } = require("hardhat");

async function main() {
  const MOCK_FEED_ADDRESS = "0xD1A0Ee5D3B885B5477164c282e77A8208763784f";
  
  // HELYES ÉRTÉK: 0.0002 BTC (18 decimálban)
  const correctBtcAmount = "0.0002";
  const correctFeedValue = ethers.utils.parseUnits(correctBtcAmount, 18);
  
  console.log("Restoring correct MockFeed value...");
  console.log("Target BTC amount:", correctBtcAmount);
  console.log("Feed value (18 decimal):", correctFeedValue.toString());
  
  const MockFeed = await ethers.getContractAt("MockFeed", MOCK_FEED_ADDRESS);
  
  // Current (wrong) value
  const wrongValue = await MockFeed.latestAnswer();
  console.log("Current wrong value:", wrongValue.toString());
  console.log("Current (wrong) BTC:", ethers.utils.formatUnits(wrongValue, 18));
  
  // Set correct value
  const tx = await MockFeed.set(correctFeedValue);
  await tx.wait();
  
  // Verify
  const newValue = await MockFeed.latestAnswer();
  const newBtc = ethers.utils.formatUnits(newValue, 18);
  
  console.log("\n✅ MockFeed restored!");
  console.log("New value:", newValue.toString());
  console.log("New BTC amount:", newBtc);
  
  // Expected SATSTD capacity calculation
  const expectedCapacity = parseFloat(newBtc) * 100000000;
  console.log("Expected SATSTD capacity:", expectedCapacity.toLocaleString());
  
  console.log("\n🎯 Now the frontend should show:");
  console.log("- BTC Proof of Reserve:", newBtc, "BTC");
  console.log("- Your mintable max:", expectedCapacity.toLocaleString(), "SATSTD");
}

main().catch(console.error);
