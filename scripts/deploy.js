// scripts/deploy.js

const hre = require("hardhat");

async function main() {
  // 1. Címek beállítása (használj érvényes sepolia address-eket!)
  const feedAddress = "0x1b44F3514812d835EB1BDB0acB33d3fA3351Ee43"; // Sepolia BTC/USD Chainlink feed
  const admin   = "0x7aeEa25dbc54CA7589766bfD9B65671022e5B2C0";
  const minter  = "0xd276E16774410A896eEDFa5ce905b09d6D59aCF9";
  const pauser  = "0x21f22EF549Ddd88Cb70e17e8A1960f96883271ac";
  const operator= "0x097280493702bF64c6dc5363FB48073A2d26f5C5";

  // 2. Szerződés deploy
  const SatoshiStandard = await hre.ethers.getContractFactory("SatoshiStandard");
  const contract = await SatoshiStandard.deploy(
    feedAddress,
    admin,
    minter,
    pauser,
    operator
  );

  await contract.deployed();

  // 3. Kimenet a konzolra
  console.log("SatoshiStandard deployed to:", contract.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
