const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const Token = await hre.ethers.getContractFactory("SatoshiStandard");
  const token = await Token.deploy(await deployer.getAddress());

  await token.waitForDeployment();

  console.log("SatoshiStandard deployed to:", await token.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

