// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

interface AggregatorV3Interface {
    function latestAnswer() external view returns (int256);
}

contract SatoshiStandard is ERC20, AccessControl {
    AggregatorV3Interface public reserveFeed;

    // Roles
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");
    bytes32 public constant FEED_SETTER_ROLE = keccak256("FEED_SETTER_ROLE");

    // Events
    event Minted(address indexed to, uint256 amount);
    event Burned(address indexed from, uint256 amount);
    event ReserveFeedChanged(address indexed oldFeed, address indexed newFeed);

    constructor(address feedAddress, address admin) ERC20("Satoshi Standard", "SATSTD") {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(MINTER_ROLE, admin);
        _grantRole(BURNER_ROLE, admin);
        _grantRole(FEED_SETTER_ROLE, admin);
        reserveFeed = AggregatorV3Interface(feedAddress);
    }

    function setReserveFeed(address newFeed) external onlyRole(FEED_SETTER_ROLE) {
        require(newFeed != address(0), "Invalid address");
        address old = address(reserveFeed);
        reserveFeed = AggregatorV3Interface(newFeed);
        emit ReserveFeedChanged(old, newFeed);
    }

    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
        int256 satoshiReserve = reserveFeed.latestAnswer();
        require(satoshiReserve >= 0, "Negative reserve");
        uint256 maxMintable = uint256(satoshiReserve);
        require(totalSupply() + amount <= maxMintable, "Exceeds BTC reserve");
        _mint(to, amount);
        emit Minted(to, amount);
    }

    function burn(address from, uint256 amount) external onlyRole(BURNER_ROLE) {
        _burn(from, amount);
        emit Burned(from, amount);
    }
}
