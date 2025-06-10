// scripts/transferOwnership.js
const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  const TOKEN = "0xaba4c984559b4395d14C25844311BBBD649b6012"; // token címed

  const token = await ethers.getContractAt("SatoshiStandard", TOKEN, deployer);
  const newOwner = "0x7aeEa25dbc54CA7589766bfD9B65671022e5B2C0";
  const tx = await token.transferOwnership(newOwner);
  console.log("Ownership transferred in tx:", tx.hash);
  await tx.wait();
  console.log("Új owner:", newOwner);
}

main();
