// SPDX-License-Identifier: Apache-2.0

pragma solidity 0.8.26;

import "../securityToken/ERC1155AccessControlUpgradeableV1.sol";
import "@openzeppelin/contracts/proxy/utils/UUPSUpgradeable.sol";

contract MissuseAccessControlInternal is
    ERC1155AccessControlUpgradeableV1,
    UUPSUpgradeable
{
    constructor(
        address registrar,
        address technical
    ) ERC1155AccessControlUpgradeableV1(registrar, technical) {}

    function initialize() public initializer {
        __AccessControl_init();
    }

    function doubleInitAccessControl() public {
        __AccessControl_init();
    }

    // solhint-disable-next-line no-empty-blocks
    function _authorizeUpgrade(address) internal override onlyRegistrar {}
}
