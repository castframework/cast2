// SPDX-License-Identifier: Apache-2.0

pragma solidity 0.8.26;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "../securityToken/ISecurityTokenV1.sol";
import "@openzeppelin/contracts/utils/introspection/ERC165.sol";
import "./ISatelliteV1.sol";

contract SatelliteV1 is ISatelliteV1, Initializable, ERC165 {
    ISecurityTokenV1 public multiToken;
    uint256 public tokenId;
    string public name;
    string public symbol;

    modifier onlyMultiToken() {
        require(msg.sender == address(multiToken), Unauthorized());
        _;
    }

    constructor() {}

    function initialize(
        address _multiToken,
        uint256 _tokenId,
        string memory _name,
        string memory _symbol
    ) external initializer {
        multiToken = ISecurityTokenV1(_multiToken);
        tokenId = _tokenId;
        name = _name;
        symbol = _symbol;
    }

    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) external onlyMultiToken returns (bool) {
        emit Transfer(from, to, amount);
        return true;
    }

    function balanceOf(address account) external view returns (uint256) {
        return multiToken.balanceOf(account, tokenId);
    }

    function totalSupply() external view returns (uint256) {
        return multiToken.totalSupply(tokenId);
    }

    // https://eips.ethereum.org/EIPS/eip-1046
    function tokenURI() external view returns (string memory) {
        return multiToken.uri(tokenId);
    }

    function allowance(
        address,
        address
    ) external pure  returns (uint256){
        revert Disabled();
    }
    // keep then so it will be picked up as an ERC20 by explorer
    function transfer(address, uint256) external pure returns (bool) {
       revert Disabled();
    }
    function approve(address, uint256) external pure returns (bool) {
       revert Disabled();
    }
    /**
     * @dev ERC165. Indicates that the Satellite implements the ISatellite interface.
     */
    function supportsInterface(bytes4 interfaceId)
        override
        public
        view
        returns (bool)
    {
        return
            interfaceId == type(ISatelliteV1).interfaceId ||
            super.supportsInterface(interfaceId);
    }

}
