// SPDX-License-Identifier: OTHER
pragma solidity ^0.8.20;

import "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract ChainlinkProofOfReserveFeed is AccessControl {
    AggregatorV3Interface public aggregator;

    bytes32 public constant AGGREGATOR_SETTER_ROLE = keccak256("AGGREGATOR_SETTER_ROLE");

    event AggregatorChanged(address indexed oldAgg, address indexed newAgg);

    constructor(address _aggregator, address admin) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(AGGREGATOR_SETTER_ROLE, admin);
        aggregator = AggregatorV3Interface(_aggregator);
    }

    function setAggregator(address newAgg) external onlyRole(AGGREGATOR_SETTER_ROLE) {
        require(newAgg != address(0), "Invalid address");
        address old = address(aggregator);
        aggregator = AggregatorV3Interface(newAgg);
        emit AggregatorChanged(old, newAgg);
    }

    function getReserve() external view returns (int256) {
        (, int256 answer, , , ) = aggregator.latestRoundData();
        return answer;
    }
}
