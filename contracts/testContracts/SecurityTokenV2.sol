// SPDX-License-Identifier: Apache-2.0

pragma solidity 0.8.26;

import "../securityToken/SecurityToken.sol";

contract SecurityTokenV2 is SecurityToken {
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor(
        address registrar,
        address operations,
        address technical
    ) SecurityToken(registrar, operations, technical) {}

    function version() external pure override returns (string memory) {
        return "V2";
    }
}
