// SPDX-License-Identifier: Apache-2.0

pragma solidity 0.8.26;
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface ISatelliteV1 is IERC20 {

    error Unauthorized();
    error Disabled();
    
    function initialize(
        address _erc1155Parent,
        uint256 _tokenId,
        string memory _name,
        string memory _symbol
    ) external;

    // https://eips.ethereum.org/EIPS/eip-1046
    function tokenURI() external view returns (string memory);

    function webUri() external view returns (string memory);

    function formerSmartContractAddress() external view returns (address);
}
