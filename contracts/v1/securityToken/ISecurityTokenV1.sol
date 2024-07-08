// SPDX-License-Identifier: Apache-2.0

pragma solidity 0.8.26;

import { IERC1155 } from "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";

interface ISecurityTokenV1 is IERC1155 {
    enum TransferStatus {
        Undefined,
        Created,
        Validated,
        Rejected
    }
    
    struct TransferData {
        string kind;
        string transactionId;
    }
    struct MintData {
        address registrarAgent;
        address settlementAgent;
        string metadataUri;
    }

    struct TransferRequest {
        address from;
        address to;
        uint256 id;
        uint256 value;
        TransferStatus status;
    }

    event LockReady(
        string transactionId,
        address indexed operator,
        address indexed from,
        address indexed to,
        uint256 id,
        uint256 value,
        bytes data
    );
    event LockUpdated(
        string transactionId,
        address indexed operator,
        address indexed from,
        address indexed to,
        uint256 id,
        TransferStatus status
    );

    /**
     * @dev Returns the version number of this contract
     */
    function version() external pure returns (string memory);

    /**
     * @dev Returns the name of the token
     */
    function name() external view returns (string memory);

    /**
     * @dev Returns the symbol of the token
     */
    function symbol() external view returns (string memory);

    /**
     * @dev Sets the token's URI
     */
    function setURI(uint256 tokenId, string memory tokenURI) external;

    /**
     * @dev Sets the token's baseURI
     */
    function setBaseURI(string memory baseURI) external;

    /**
     * @dev Burns a `amount` amount of `id` tokens from the account `_account`.
     * NB: only the registrar operator is allowed to burn tokens
     */
    function burn(address _account, uint256 _id, uint256 _amount) external;

    /**
     * @dev Mints a `_amount` amount of `_id` tokens on `_to` address
     * NB: if `_data` data is not empty, set up a registrar agent, settlement agent and an uri for the `_id` token.
     * NB: only the registrar operator is allowed to mint new tokens
     */
    function mint(
        address _to,
        uint256 _id,
        uint256 _amount,
        bytes calldata data
    ) external returns (bool);

    /**
     * @dev Actually performs the transfer request corresponding to the given `_transactionId`
     * Called by the settlement agent operator
     */
    function releaseTransaction(
        string calldata _transactionId
    ) external returns (bool);

    /**
     * @dev Cancels the transfer request corresponding to the given `_transactionId`
     * Called by the registrar agent operator
     */
    function cancelTransaction(
        string calldata _transactionId
    ) external returns (bool);

    /**
     * @dev Actually performs the transfer request corresponding to the given `_transactionId`
     * Called by the registrar operator
     */
    function forceReleaseTransaction(
        string calldata _transactionId
    ) external returns (bool);

    /**
     * @dev Cancels the transfer request corresponding to the given `_transactionId`
     * Called by the registrar operator
     */
    function forceCancelTransaction(
        string calldata _transactionId
    ) external returns (bool);

    /**
     * @dev Returns the tokenId as number from an `_isinCode`.
     */
    function getTokenIdByIsin(
        string calldata isinCode
    ) external pure returns (uint256);

    /**
     * @dev See {IERC1155-safeTransferFrom}.
     */
    function safeTransferFrom(
        address _from,
        address _to,
        uint256 _id,
        uint256 _value,
        bytes memory _data
    ) external;

    /**
     * @dev See {ERC1155URIStorageUpgradeable-uri}.
     */
    function uri(uint256 _id) external view returns (string memory);

    /**
     * @dev Returns the balance of `addr` account for `id` token.
     * NB: The returned balance is the "available" balance, which excludes tokens engaged in a transaction
     * (i.e. a transfer back to the registrar operator or the operations operator)
     */
    function balanceOf(
        address _addr,
        uint256 _id
    ) external view returns (uint256);

    /**
     * @dev Returns current amount engaged in transfer requests for `addr` account and `id` token
     */
    function engagedAmount(
        address _addr,
        uint256 _id
    ) external view returns (uint256);
}
