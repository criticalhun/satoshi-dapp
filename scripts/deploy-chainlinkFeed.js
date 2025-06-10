const hre = require("hardhat");

async function main() {
  const aggregatorAddress = "0x1b44F3514812d835EB1BDB0acB33d3fA3351Ee43"; // Chainlink BTC/USD on Sepolia

  const ChainlinkFeed = await hre.ethers.getContractFactory("ChainlinkProofOfReserveFeed");
  const chainlinkFeed = await ChainlinkFeed.deploy(aggregatorAddress);

  await chainlinkFeed.waitForDeployment();

  console.log("ChainlinkProofOfReserveFeed deployed to:", await chainlinkFeed.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
