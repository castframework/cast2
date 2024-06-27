// SPDX-License-Identifier: Apache-2.0

pragma solidity 0.8.26;

interface ISecurityToken {
    enum TransferStatus {
        Undefined,
        Created,
        Validated,
        Rejected
    }
    event TransferRequested(
        string transactionId,
        address indexed from,
        address indexed to,
        uint256 id,
        uint256 value,
        bytes data
    );
    event TransferRejected(string transactionId);
    event TransferValidated(string transactionId);

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
        bytes data;
        TransferStatus status;
    }
}
