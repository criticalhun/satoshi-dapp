const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("SatoshiStandard — burn és újramintelés tesztek", function () {
  let token;
  let reserveFeed;
  let owner;
  let alice;

  beforeEach(async function () {
    [owner, alice] = await ethers.getSigners();

    // Deploy mock BTC reserve feed 1000 satoshi tartalékkal
    const ReserveMock = await ethers.getContractFactory("MockBtcReserveFeed");
    reserveFeed = await ReserveMock.deploy(1000);
    await reserveFeed.deployed();

    // Deploy SatoshiStandard a mock feed címmel
    const Token = await ethers.getContractFactory("SatoshiStandard");
    token = await Token.deploy(reserveFeed.address);
    await token.deployed();
  });

  it("owner tud burn-elni és csökkenti a totalSupply-et", async function () {
    // Owner először mintel 500 SATSTD-t
    await token.mint(owner.address, 500);
    expect(await token.totalSupply()).to.equal(500);

    // Owner burn-el 200 SATSTD-t
    await token.burn(owner.address, 200);
    expect(await token.totalSupply()).to.equal(300);
  });

  it("nem-owner nem tud burn-elni", async function () {
    // Először owner mintel, hogy legyen mit burn-elni
    await token.mint(owner.address, 500);

    // Alice (nem-owner) próbál burn-elni: revertet várunk
    await expect(
      token.connect(alice).burn(owner.address, 100)
    ).to.be.reverted;
  });

  it("burn után felszabaduló tartalék erejéig újra lehet mintelni", async function () {
    // Owner mintel 800 SATSTD-t
    await token.mint(owner.address, 800);
    expect(await token.totalSupply()).to.equal(800);

    // Owner burn-el 300 SATSTD-t → totalSupply = 500
    await token.burn(owner.address, 300);
    expect(await token.totalSupply()).to.equal(500);

    // A reserve 1000, tehát még 500 SATSTD-t lehet mintelni
    await token.mint(owner.address, 500);
    expect(await token.totalSupply()).to.equal(1000);

    // Ezen felüli mintelés már fail-el
    await expect(
      token.mint(owner.address, 1)
    ).to.be.revertedWith("Exceeds BTC reserve");
  });
});