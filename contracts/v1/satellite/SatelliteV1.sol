// SPDX-License-Identifier: Apache-2.0

pragma solidity 0.8.26;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "../securityToken/ISecurityTokenV1.sol";
import "@openzeppelin/contracts/utils/introspection/ERC165.sol";
import "./ISatelliteV1.sol";

contract SatelliteV1 is ISatelliteV1, Initializable, ERC165 {
    ISecurityTokenV1 public erc1155Parent;
    uint256 public tokenId;
    string public name;
    string public symbol;

    modifier onlyERC1155Parent() {
        require(msg.sender == address(erc1155Parent), Unauthorized());
        _;
    }

    constructor() {}

    /**
    @dev initiates the token parameters.
     */
    function initialize(
        address _erc1155Parent,
        uint256 _tokenId,
        string memory _name,
        string memory _symbol
    ) external initializer {
        erc1155Parent = ISecurityTokenV1(_erc1155Parent);
        tokenId = _tokenId;
        name = _name;
        symbol = _symbol;
    }

    /**
     *@dev emits transfer event when safeTransferFrom is made on the ERC1155 parent tokenId.
     */
    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) external onlyERC1155Parent returns (bool) {
        emit Transfer(from, to, amount);
        return true;
    }

    /**
     *@dev Returns the balance of `account` related to ERC1155 parent tokenId.
     */
    function balanceOf(address account) external view returns (uint256) {
        return erc1155Parent.balanceOf(account, tokenId);
    }

    /**
     *@dev Returns the token's total supply.
     */
    function totalSupply() external view returns (uint256) {
        return erc1155Parent.totalSupply(tokenId);
    }

    // https://eips.ethereum.org/EIPS/eip-1046
    function tokenURI() external view returns (string memory) {
        return erc1155Parent.uri(tokenId);
    }

    /**
     *@dev  Returns the token's web uri.
     */
    function webUri() external view returns (string memory) {
        return erc1155Parent.webUri(tokenId);
    }

    /**
     *@dev  Returns the token's former smart contract address.
     */
    function formerSmartContractAddress() external view returns (address) {
        return erc1155Parent.formerSmartContractAddress(tokenId);
    }

    function allowance(address, address) external pure returns (uint256) {
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
    function supportsInterface(
        bytes4 interfaceId
    ) public view override returns (bool) {
        return
            interfaceId == type(ISatelliteV1).interfaceId ||
            super.supportsInterface(interfaceId);
    }
}
