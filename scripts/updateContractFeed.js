// scripts/updateContractFeed.js
const { ethers } = require("hardhat");

async function main() {
  const CONTRACT_ADDRESS = "0xc272861193915ec021Ba47AFBeF971feFf9B8e4E"; // Új contract
  const NEW_FEED_ADDRESS = "0xD1A0Ee5D3B885B5477164c282e77A8208763784f"; // MockFeed cím
  
  console.log("Updating contract feed address...");
  console.log("Contract:", CONTRACT_ADDRESS);
  console.log("New Feed:", NEW_FEED_ADDRESS);
  
  const [deployer] = await ethers.getSigners();
  const contract = await ethers.getContractAt("SatoshiStandard", CONTRACT_ADDRESS, deployer);
  
  // Jelenlegi feed cím ellenőrzése
  console.log("\n=== Current State ===");
  try {
    const currentFeed = await contract.reserveFeed();
    console.log("Current feed address:", currentFeed);
    
    // Test feed value
    if (currentFeed !== ethers.constants.AddressZero) {
      try {
        const feedContract = await ethers.getContractAt("MockFeed", currentFeed);
        const feedValue = await feedContract.latestAnswer();
        console.log("Current feed value:", feedValue.toString());
        console.log("Current feed BTC:", ethers.utils.formatUnits(feedValue, 18));
      } catch (e) {
        console.log("Cannot read current feed value:", e.message);
      }
    }
  } catch (e) {
    console.log("Error reading current feed:", e.message);
  }
  
  // Feed frissítése
  console.log("\n=== Updating Feed ===");
  try {
    const tx = await contract.setReserveFeed(NEW_FEED_ADDRESS);
    console.log("Transaction hash:", tx.hash);
    await tx.wait();
    console.log("Transaction confirmed!");
    
    // Ellenőrzés
    const newFeed = await contract.reserveFeed();
    console.log("Updated feed address:", newFeed);
    
    // Új feed érték tesztelése
    const newFeedContract = await ethers.getContractAt("MockFeed", NEW_FEED_ADDRESS);
    const newFeedValue = await newFeedContract.latestAnswer();
    console.log("New feed value:", newFeedValue.toString());
    console.log("New feed BTC:", ethers.utils.formatUnits(newFeedValue, 18));
    
    // Debug info a contractból
    if (await contract.getDebugInfo) {
      const debugInfo = await contract.getDebugInfo();
      console.log("\n=== Contract Debug Info ===");
      console.log("Raw Reserve:", debugInfo.rawReserve.toString());
      console.log("Calculated Max:", debugInfo.calculatedMax.toString());
      console.log("Current Supply:", debugInfo.currentSupply.toString());
      console.log("Available:", debugInfo.available.toString());
      
      const availableSATSTD = parseFloat(ethers.utils.formatUnits(debugInfo.available, 18));
      console.log("Available SATSTD:", availableSATSTD.toLocaleString());
    }
    
    console.log("\n✅ Feed updated successfully!");
    console.log("You should now be able to mint SATSTD tokens.");
    
  } catch (e) {
    console.error("Failed to update feed:", e.message);
  }
}

main().catch(console.error);
