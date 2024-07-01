// SPDX-License-Identifier: Apache-2.0

pragma solidity 0.8.26;

import "../securityToken/SecurityTokenV1.sol";

//@custom:oz-upgrades-from SecurityTokenV1
contract SecurityTokenFakeV3 {
    /// @custom:oz-upgrades-unsafe-allow constructor

    /// @custom:storage-location erc7201:sgforge.storage.SecurityToken
    struct SecurityTokenStorage {
        mapping(uint256 id => bool) _minted;
    }

    // keccak256(abi.encode(uint256(keccak256("sgforge.storage.SecurityToken")) - 1)) & ~bytes32(uint256(0xff))
    bytes32 private constant SecurityTokenStorageLocation =
        0x5ca544375baada28ac0172fd60c2d13c5c7015fc0767de9d1a40a3419301b900;

    function _getSecurityTokenStorage()
        private
        pure
        returns (SecurityTokenStorage storage $)
    {
        assembly {
            $.slot := SecurityTokenStorageLocation
        }
    }

    constructor() {}

    function version() external pure returns (string memory) {
        return "V3";
    }
}
