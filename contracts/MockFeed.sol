// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract MockFeed {
    int256 private value;
    address public owner;

    constructor(int256 initialValue) {
        value = initialValue;
        owner = msg.sender;
    }

    function latestAnswer() external view returns (int256) {
        return value;
    }

    function set(int256 newValue) external {
        require(msg.sender == owner, "Only owner");
        value = newValue;
    }
}
