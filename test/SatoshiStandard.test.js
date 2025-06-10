const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("SatoshiStandard", function () {
  let SatoshiStandard, satoshi, owner, addr1;

  beforeEach(async function () {
    [owner, addr1] = await ethers.getSigners();
    SatoshiStandard = await ethers.getContractFactory("SatoshiStandard");
    satoshi = await SatoshiStandard.deploy(owner.address);
    // Ez a sor elvileg coverage alatt opcionális, de nem árt:
    if (satoshi.deployed) await satoshi.deployed();
  });

  it("csak az owner tud mintelni", async function () {
    await expect(
      satoshi.connect(addr1).mint(addr1.address, 100)
    ).to.be.reverted; // csak sima reverted coverage alatt!
  });
});
