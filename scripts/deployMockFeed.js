// scripts/deployMockFeed.js
const { ethers } = require("hardhat");

async function main() {
  // Kezdeti érték pl. 100_000_000_000 satoshi (1,000 BTC)
  const initialValue = ethers.BigNumber.from("1000000000000000000000000000");
  const MockFeed = await ethers.getContractFactory("MockFeed");
  const feed = await MockFeed.deploy(initialValue);
  await feed.deployed();
  console.log("MockFeed deployed to:", feed.address);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
