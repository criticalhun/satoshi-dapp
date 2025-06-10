// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";

contract MockBtcReserveFeed is AccessControl {
    int256 public reserve;

    bytes32 public constant RESERVE_SETTER_ROLE = keccak256("RESERVE_SETTER_ROLE");

    constructor(int256 initial, address admin) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(RESERVE_SETTER_ROLE, admin);
        reserve = initial;
    }

    function latestAnswer() external view returns (int256) {
        return reserve;
    }

    function setReserve(int256 _new) external onlyRole(RESERVE_SETTER_ROLE) {
        reserve = _new;
    }
}
