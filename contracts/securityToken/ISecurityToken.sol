// SPDX-License-Identifier: Apache-2.0

pragma solidity 0.8.26;

interface ISecurityToken {
    string constant TRANFER_TYPE_DIRECT = "Direct";
    string constant TRANFER_TYPE_LOCK = "Lock";
    string constant TRANFER_TYPE_UNKNOWN = "";

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