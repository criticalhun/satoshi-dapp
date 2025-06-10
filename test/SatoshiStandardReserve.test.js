// test/SatoshiStandardReserve.test.js
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("SatoshiStandard — on‐chain BTC reserve check", function () {
  let owner, user;
  let mockFeed, token;

  // 18 decimálos token, reserve‐ként is 18 decimálos értéket adunk vissza
  const RESERVE_TOKENS = ethers.utils.parseUnits("1000.0", 18);

  beforeEach(async () => {
    [owner, user] = await ethers.getSigners();

    // 1) Deploy a mock feed kontraktot, ami getReserve() = RESERVE_TOKENS
    const MockFeed = await ethers.getContractFactory("MockBtcReserveFeed");
    mockFeed = await MockFeed.deploy(RESERVE_TOKENS);
    await mockFeed.deployed();

    // 2) Deploy a SatoshiStandard tokent, injectálva a mock feed címet
    const Token = await ethers.getContractFactory("SatoshiStandard");
    token = await Token.deploy(mockFeed.address);
    await token.deployed();
  });

  it("should allow minting when totalSupply + amount <= reserve", async () => {
    // próbáljuk meg kiadni a reserve felét
    const mintAmount = RESERVE_TOKENS.div(2);
    await expect(token.mint(user.address, mintAmount))
      .to.emit(token, "Transfer")                                    // ERC20 Transfer event zero→user
      .withArgs(ethers.constants.AddressZero, user.address, mintAmount);

    // totalSupply megegyezik a mintelt összeggel
    expect(await token.totalSupply()).to.equal(mintAmount);
  });

  it("should allow minting up to exact reserve", async () => {
    // próbáljuk meg kiadni pontosan a teljes reserve mennyiséget
    await expect(token.mint(user.address, RESERVE_TOKENS))
      .to.emit(token, "Transfer")
      .withArgs(ethers.constants.AddressZero, user.address, RESERVE_TOKENS);

    expect(await token.totalSupply()).to.equal(RESERVE_TOKENS);
  });

  it("should revert when mint amount exceeds reserve", async () => {
    // reserve + 1 wei
    const tooMuch = RESERVE_TOKENS.add(1);
    await expect(token.mint(user.address, tooMuch))
      .to.be.revertedWith("Exceeds BTC reserve");
  });

  it("should accumulate supply and still enforce reserve", async () => {
    const half = RESERVE_TOKENS.div(2);
    // először kiadjuk a felet
    await token.mint(user.address, half);
    expect(await token.totalSupply()).to.equal(half);

    // utána próbálunk a maradék + 1 kiadni → bukás
    const remainingPlusOne = RESERVE_TOKENS.sub(half).add(1);
    await expect(token.mint(user.address, remainingPlusOne))
      .to.be.revertedWith("Exceeds BTC reserve");

    // de ha csak a maradékot kérjük, az működik
    const remaining = RESERVE_TOKENS.sub(half);
    await expect(token.mint(user.address, remaining))
      .to.emit(token, "Transfer")
      .withArgs(ethers.constants.AddressZero, user.address, remaining);
    expect(await token.totalSupply()).to.equal(RESERVE_TOKENS);
  });
});
