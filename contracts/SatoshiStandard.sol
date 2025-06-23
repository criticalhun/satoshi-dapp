// SPDX-License-Identifier: OTHER
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

interface AggregatorV3Interface {
    function latestAnswer() external view returns (int256);
}

contract SatoshiStandard is ERC20, AccessControl, Pausable {
    AggregatorV3Interface public reserveFeed;

    // Roles
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");         // DEFAULT_ADMIN
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");   // minden, mint admin

    // Events
    event Minted(address indexed to, uint256 amount);
    event Burned(address indexed from, uint256 amount);
    event ReserveFeedChanged(address indexed oldFeed, address indexed newFeed);

    constructor(address feedAddress, address admin, address minter, address pauser, address operator)
        ERC20("Satoshi Standard", "SATSTD")
    {
        require(feedAddress != address(0), "Feed cannot be zero address");
        require(admin != address(0), "Admin cannot be zero address");
        require(minter != address(0), "Minter cannot be zero address");
        require(pauser != address(0), "Pauser cannot be zero address");
        require(operator != address(0), "Operator cannot be zero address");

        // Grant all roles
        _grantRole(DEFAULT_ADMIN_ROLE, admin);        // csak ő tud szerepet kiosztani/elvenni!
        _grantRole(ADMIN_ROLE, admin);
        _grantRole(MINTER_ROLE, minter);
        _grantRole(PAUSER_ROLE, pauser);
        _grantRole(OPERATOR_ROLE, operator);

        reserveFeed = AggregatorV3Interface(feedAddress);
    }

    // Operator/admin tud feedet váltani
    function setReserveFeed(address newFeed) external onlyOperatorOrAdmin {
        require(newFeed != address(0), "Invalid address");
        address old = address(reserveFeed);
        reserveFeed = AggregatorV3Interface(newFeed);
        emit ReserveFeedChanged(old, newFeed);
    }

    // Operator/admin tud mintelni is, nem csak minter
    function mint(address to, uint256 amount) external whenNotPaused onlyMinterOrOperatorOrAdmin {
        require(to != address(0), "Invalid address");
        int256 satoshiReserve = reserveFeed.latestAnswer();
        require(satoshiReserve >= 0, "Negative reserve");
        uint256 maxMintable = uint256(satoshiReserve);
        require(totalSupply() + amount <= maxMintable, "Exceeds BTC reserve");
        _mint(to, amount);
        emit Minted(to, amount);
    }

    // Operator/admin tud égetni is, nem csak burner
    function burn(address from, uint256 amount) external whenNotPaused onlyMinterOrOperatorOrAdmin {
        require(from != address(0), "Invalid address");
        _burn(from, amount);
        emit Burned(from, amount);
    }

    // Pauser/Operator/Admin tudja pause-olni
    function pause() public onlyPauserOrOperatorOrAdmin {
        _pause();
    }
    function unpause() public onlyPauserOrOperatorOrAdmin {
        _unpause();
    }

    // ----------- Role modifiers ------------

    modifier onlyOperatorOrAdmin() {
        require(
            hasRole(OPERATOR_ROLE, msg.sender) ||
            hasRole(ADMIN_ROLE, msg.sender) ||
            hasRole(DEFAULT_ADMIN_ROLE, msg.sender),
            "Operator/Admin only"
        );
        _;
    }

    modifier onlyMinterOrOperatorOrAdmin() {
        require(
            hasRole(MINTER_ROLE, msg.sender) ||
            hasRole(OPERATOR_ROLE, msg.sender) ||
            hasRole(ADMIN_ROLE, msg.sender) ||
            hasRole(DEFAULT_ADMIN_ROLE, msg.sender),
            "Minter/Operator/Admin only"
        );
        _;
    }

    modifier onlyPauserOrOperatorOrAdmin() {
        require(
            hasRole(PAUSER_ROLE, msg.sender) ||
            hasRole(OPERATOR_ROLE, msg.sender) ||
            hasRole(ADMIN_ROLE, msg.sender) ||
            hasRole(DEFAULT_ADMIN_ROLE, msg.sender),
            "Pauser/Operator/Admin only"
        );
        _;
    }
}
