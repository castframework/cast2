// SPDX-License-Identifier: Apache-2.0

pragma solidity 0.8.26;

interface IERC1155AccessControlUpgradeableV1 {
    /**
     * @dev Emitted when new operators are named by the registrar operator
     */
    event NamedNewOperators(address registrar, address technical);
    /**
     * @dev Emitted when the future new registrar operator has accepted the role
     */
    event AcceptedRegistrarRole(address registrar);
    /**
     * @dev Emitted when the future new technical operator has accepted the role
     */
    event AcceptedTechnicalRole(address technical);
    /**
     * @dev Emitted when the future new implementation contract has been authorized by the registrar
     */
    event ImplementationAuthorized(address implementation);

    /**
     * @dev Emitted when the token's registrar agent has been updated
     */
    event RegistrarAgentUpdated(
        uint256 tokenId,
        address oldRegistrarAgent,
        address newRegistrarAgent
    );

    /**
     * @dev Emitted when the token's settlement agent has been updated
     */
    event SettlementAgentUpdated(
        uint256 tokenId,
        address oldSettlementAgent,
        address newSettlementAgent
    );

    /**
     * @dev Accepts the future registrar role
     * NB: only the future registrar operator can call this method
     */
    function acceptRegistrarRole() external;

    /**
     * @dev Accepts the future technical role
     * NB: only the future technical operator can call this method
     */
    function acceptTechnicalRole() external;

    /**
     * @dev Authorizes the future new implementation contract
     * NB: only the (current) registrar operator can call this method
     */
    function authorizeImplementation(address implementation) external;

    /**
     * @dev Returns the contract's operators' addresses
     */
    function getOperators() external view returns (address, address);
}
