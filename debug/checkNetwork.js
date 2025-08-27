// debug/checkNetwork.js
const { ethers, network } = require("hardhat");

async function main() {
  console.log("=== Network Debug ===");
  console.log("Current network:", network.name);
  console.log("Chain ID:", network.config.chainId);
  
  const [deployer] = await ethers.getSigners();
  console.log("Deployer address:", deployer.address);
  console.log("Balance:", ethers.utils.formatEther(await deployer.getBalance()));
  
  // Ellenőrizd hogy a MockFeed elérhető-e
  const MOCK_FEED_ADDRESS = "0xD1A0Ee5D3B885B5477164c282e77A8208763784f";
  
  try {
    const MockFeed = await ethers.getContractAt("MockFeed", MOCK_FEED_ADDRESS);
    const value = await MockFeed.latestAnswer();
    console.log("MockFeed accessible:", true);
    console.log("Current value:", value.toString());
    console.log("BTC value:", ethers.utils.formatUnits(value, 18));
  } catch (e) {
    console.log("MockFeed accessible:", false);
    console.log("Error:", e.message);
  }
}

main().catch(console.error);
