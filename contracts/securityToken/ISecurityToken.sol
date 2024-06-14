// SPDX-License-Identifier: Apache-2.0

pragma solidity 0.8.26;

interface ISecurityToken {

    struct MintData {
        address registrarAgent;
        address settlementAgent;
        string metadataUri;
    }

    struct TransferData {
        string kind;
        string transactionId;
    }
}