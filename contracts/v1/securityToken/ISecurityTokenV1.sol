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
    }
    struct LockTransferData {
        string kind;
        string transactionId;
    }
    struct TokenOperators {
        address registrarAgent;
        address settlementAgent;
    }
    struct TokenMetadata {
        string uri;
        address formerSmartcontractAddress;
        string webUri;
    }
    struct SatelliteDetails {
        address implementationAddress;
        string name;
        string symbol;
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

    event NewSatellite(uint256 indexed tokenId, address satelite);

    event WebURI(uint256 indexed tokenId, string webUri);
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

    /** @dev Same semantic as ERC1155's safeTransferFrom function although there are 3 cases :
     * 1- if the type of transfer is a Direct Transfer then the transfer will occur right away
     * 2- if the type of transfer is Lock Transfer then the transfer will only actually occur once validated by the settlement agent operator
     * using the releaseTransaction method or by the registrar operator(owner of the registry) via forceReleaseTransaction
     * 3- if the type of Transfer is unknown then the transfer will be rejected
     * NB: only the registrar could perform a forceSafeTransferFrom
     */
    function forceSafeTransferFrom(
        address _from,
        address _to,
        uint256 _id,
        uint256 _value,
        bytes memory _data
    ) external;

    /**
     * @dev set the token's webUri.
     */
    function setWebUri(uint256 _tokenId, string calldata _webUri) external;

    /**
     * @dev get locked amout
     */
    function getLockedAmount(string memory _transactionId) external view returns(TransferRequest memory);

    /**
     * @dev Returns the name of the token
     */
    function name() external view returns (string memory);

    /**
     * @dev Returns the symbol of the token
     */
    function symbol() external view returns (string memory);

    /**
     * @dev Returns current amount engaged in transfer requests for `addr` account and `id` token
     */
    function engagedAmount(
        address _addr,
        uint256 _id
    ) external view returns (uint256);

    /**
     * @dev Total value of tokens in with a given id.
     */
    function totalSupply(uint256 id) external view returns (uint256);

    /**
     * @dev Returns the token's uri.
     */
    function uri(uint256 tokenId) external view returns (string memory);

    /**
     * @dev Returns the token's webUri.
     */
    function webUri(uint256 tokenId) external view returns (string memory);

    /**
     * @dev Returns the token's formerSmartContractAddress.
     */
    function formerSmartContractAddress(
        uint256 tokenId
    ) external view returns (address);

    /**
     * @dev Returns the version number of this contract
     */
    function version() external pure returns (string memory);

    /**
     * @dev Returns the tokenId as number from an `_isinCode`.
     */
    function getTokenIdByIsin(
        string calldata isinCode
    ) external pure returns (uint256);
}
