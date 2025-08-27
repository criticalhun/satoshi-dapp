// scripts/fixMockFeedValue.js
const { ethers } = require("hardhat");

async function main() {
  const MOCK_FEED_ADDRESS = "0xD1A0Ee5D3B885B5477164c282e77A8208763784f";
  
  // A smart contract hibás logika miatt, ha 20000 SATSTD-t szeretnél mintelni,
  // akkor a feed értékének 20000 wei-nek kell lennie (nem BTC-ben)
  
  const TARGET_SATSTD = "20000"; // 20000 SATSTD mint kapacitás
  const mockFeedValue = ethers.utils.parseUnits(TARGET_SATSTD, 18);
  
  console.log("Setting MockFeed for", TARGET_SATSTD, "SATSTD capacity");
  console.log("Feed value will be:", mockFeedValue.toString());
  
  const MockFeed = await ethers.getContractAt("MockFeed", MOCK_FEED_ADDRESS);
  
  // Current value check
  const oldValue = await MockFeed.latestAnswer();
  console.log("Old value:", oldValue.toString());
  
  // Set new value
  const tx = await MockFeed.set(mockFeedValue);
  await tx.wait();
  
  // Verify
  const newValue = await MockFeed.latestAnswer();
  console.log("New value:", newValue.toString());
  console.log("Expected SATSTD capacity:", ethers.utils.formatUnits(newValue, 18));
  
  console.log("\n✅ MockFeed updated for smart contract compatibility!");
  console.log("You should now be able to mint up to", TARGET_SATSTD, "SATSTD");
}

main().catch(console.error);
