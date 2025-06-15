// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract SATSTD is ERC20, Ownable {
    constructor(uint256 initialSupply, address initialOwner) ERC20("Satoshi Standard", "SATSTD") Ownable() {
        _mint(initialOwner, initialSupply);
        _transferOwnership(initialOwner); // OpenZeppelin 5.x-ben így adsz új owner-t deploykor
    }
}
