// SPDX-License-Identifier: Apache-2.0

pragma solidity 0.8.26;

import "../securityToken/SecurityTokenV1.sol";

//@custom:oz-upgrades-from SecurityTokenV1
contract SecurityTokenFakeV2 is SecurityTokenV1 {
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor(
        address registrar,
        address technical
    ) SecurityTokenV1(registrar, technical) {}

    function version() external pure override returns (string memory) {
        return "V2";
    }
}
