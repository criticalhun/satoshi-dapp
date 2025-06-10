require('dotenv').config();
const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with:", deployer.address);

  // FONTOS: .env-ből veszi a címeket!
  const feedAddress = process.env.CHAINLINK_FEED_ADDRESS;
  const admin = deployer.address; // vagy process.env.ADMIN_ADDRESS, ha mást akarsz

  if (!feedAddress) {
    throw new Error("CHAINLINK_FEED_ADDRESS nincs megadva a .env-ben!");
  }

  const SatoshiStandard = await ethers.getContractFactory("SatoshiStandard");
  const satoshi = await SatoshiStandard.deploy(feedAddress, admin);
  await satoshi.deployed();
  console.log("SatoshiStandard deployed to:", satoshi.address);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
