// SPDX-License-Identifier: Apache-2.0

pragma solidity 0.8.26;

import "@openzeppelin/contracts-upgradeable/token/ERC1155/extensions/ERC1155PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "./IERC1155AccessControlUpgradeableV1.sol";

abstract contract ERC1155AccessControlUpgradeableV1 is
    IERC1155AccessControlUpgradeableV1,
    ERC1155PausableUpgradeable
{
    /// @custom:storage-location erc7201:sgforge.storage.AccessControl
    struct AccessControlStorage {
        /**
         * @dev Address of the future new registrar operator
         */
        address newRegistrar;
        /**
         * @dev Address of the future new technical operator
         */
        address newTechnical;
        /**
         * @dev Structure that keeps track of whether the future operators have accepted their future role
         */
        mapping(address => bool) hasAcceptedRole;
        /**
         * @dev Address of the future new implementation contract
         */
        address newImplementation;
        mapping(uint256 => address) registrarAgentByTokenId;
        mapping(uint256 => address) settlementAgentByTokenId;
    }

    // keccak256(abi.encode(uint256(keccak256("sgforge.storage.AccessControl")) - 1)) & ~bytes32(uint256(0xff))
    bytes32 private constant AccessControlStorageLocation =
        0x5b3fd8164fa8df3212fc3e89c5a3ef922df6e80e7134203b2d3bcd6145be3400;

    /**
     * @dev Current registrar operator's address
     */
    /// @custom:oz-upgrades-unsafe-allow state-variable-immutable
    address public immutable registrar;
    /**
     * @dev Current technical operator's address
     */
    /// @custom:oz-upgrades-unsafe-allow state-variable-immutable
    address public immutable technical;

    /**
     * @dev Used when a method reserved to the registrar operator is called by some other address
     */
    error UnauthorizedRegistrar();

    /**
     * @dev Used when the zero address is used as parameter where it's not allowed
     */
    error ZeroAddressCheck();

    /**
     * @dev Used when a method reserved to the technical operator is called by some other address
     */
    error UnauthorizedTechnical();

    /**
     * @dev Used when trying to update to an unauthorized implementation
     */
    error UnauthorizedImplementation(address implementation);

    /**
     * @dev Used when operators have same addresses
     */
    error InconsistentOperators();

    /**
     * @dev Used when no registrar agent was previously set
     */
    error NoRegistrarAgentCurrentlySet();

    /**
     * @dev Used when no settlement agent was previously set
     */
    error NoSettlementAgentCurrentlySet();

    /**
     * @dev Used when a method reserved to the registrar agent is called by some other address
     */
    error UnauthorizedRegistrarAgent(uint256 id);

    /**
     * @dev Used when a method reserved to the settlement agent is called by some other address
     */
    error UnauthorizedSettlementAgent(uint256 id);

    /**
     * @dev Throws if called by any account other than the registrar.
     */
    modifier onlyRegistrar() {
        if (_msgSender() != registrar) revert UnauthorizedRegistrar();
        _;
    }

    /**
     * @dev Throws if called by any account other than the technical.
     */
    modifier onlyTechnical() {
        if (_msgSender() != technical) revert UnauthorizedTechnical();
        _;
    }

    modifier onlyWhenOperatorsHaveDifferentAddress(
        address _registrar,
        address _technical
    ) {
        if (_registrar == _technical) revert InconsistentOperators();
        _;
    }

    /**
     * @dev Consumes the authorization to update to this `_newImplementation`, that was given by the current registrar
     * Throws if `_newImplementation` has not been previously authorized
     */
    modifier consumeAuthorizeImplementation(address _newImplementation) {
        AccessControlStorage storage $ = _getAccessControlStorage();
        if ($.newImplementation != _newImplementation)
            revert UnauthorizedImplementation(_newImplementation);
        _;
        $.newImplementation = address(0);
    }
    /**
     * @dev Throws if `_registrar` and `_technical` have not all accepted their respective future role
     * and (still) match the values for new contract
     */
    modifier onlyWhenOperatorsMatchAndAcceptedRole(
        IERC1155AccessControlUpgradeableV1 _newImplementation
    ) {
        AccessControlStorage storage $ = _getAccessControlStorage();
        (address _registar, address _technical) = _newImplementation
            .getOperators();
        if (_registar != $.newRegistrar || !$.hasAcceptedRole[_registar])
            revert UnauthorizedRegistrar();
        if (_technical != $.newTechnical || !$.hasAcceptedRole[_technical])
            revert UnauthorizedTechnical();
        _;
    }
    /**
     * @dev Throws if `addr` is the zero address
     */
    modifier onlyNotZeroAddress(address addr) {
        if (addr == address(0)) revert ZeroAddressCheck();
        _;
    }

    /**
     * @dev Throws if no registrar agent was previously set for this token id
     */
    modifier onlyWhenRegistrarAgentAlreadySet(uint256 _id) {
        AccessControlStorage storage $ = _getAccessControlStorage();
        require(
            $.registrarAgentByTokenId[_id] != address(0),
            NoRegistrarAgentCurrentlySet()
        );
        _;
    }

    /**
     * @dev Throws if no settlement agent was previously set for this token id
     */
    modifier onlyWhenSettlementAgentAlreadySet(uint256 _id) {
        AccessControlStorage storage $ = _getAccessControlStorage();
        require(
            $.settlementAgentByTokenId[_id] != address(0),
            NoSettlementAgentCurrentlySet()
        );
        _;
    }

    /**
     * @dev Throws if called by any account other than the registrar agent.
     */
    modifier onlyRegistrarAgent(uint256 _id) {
        AccessControlStorage storage $ = _getAccessControlStorage();
        require(
            _msgSender() == $.registrarAgentByTokenId[_id],
            UnauthorizedRegistrarAgent(_id)
        );
        _;
    }

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor(address _registrar, address _technical) {
        registrar = _registrar;
        technical = _technical;
    }

    /**
     * @dev Name the operators for the next implementation
     * and emits a corresponding `NamedNewOperators` event
     * The operators will have to accept their future roles before the update to the new implementation can take place
     * NB : only the registrar operator can call this method
     */
    function nameNewOperators(
        address _registrar,
        address _technical
    )
        external
        onlyRegistrar
        onlyNotZeroAddress(_registrar)
        onlyNotZeroAddress(_technical)
        onlyWhenOperatorsHaveDifferentAddress(_registrar, _technical)
    {
        _resetNewOperators();
        AccessControlStorage storage $ = _getAccessControlStorage();
        $.newRegistrar = _registrar;
        $.newTechnical = _technical;
        emit NamedNewOperators(_registrar, _technical);
    }

    /**
     * @dev Accepts the future registrar role
     * and emits a corresponding `AcceptedRegistrarRole` event
     * NB: only the future registrar operator can call this method
     */
    function acceptRegistrarRole() external {
        AccessControlStorage storage $ = _getAccessControlStorage();
        if ($.newRegistrar != _msgSender()) revert UnauthorizedRegistrar();
        $.hasAcceptedRole[$.newRegistrar] = true;
        emit AcceptedRegistrarRole($.newRegistrar);
    }

    /**
     * @dev Accepts the future technical role
     * and emits a corresponding `AcceptedTechnicalRole` event
     * NB: only the future technical operator can call this method
     */
    function acceptTechnicalRole() external {
        AccessControlStorage storage $ = _getAccessControlStorage();
        if ($.newTechnical != _msgSender()) revert UnauthorizedTechnical();
        $.hasAcceptedRole[$.newTechnical] = true;
        emit AcceptedTechnicalRole($.newTechnical);
    }

    /**
     * @dev Authorizes the future new implementation contract
     * and emits a corresponding `ImplementationAuthorized` event
     * NB: only the (current) registrar operator can call this method
     * NB: fails if all future operators have not previously accepted their role using the acceptXXXRole() methods
     */
    function authorizeImplementation(
        address _implementation
    )
        external
        onlyRegistrar
        onlyNotZeroAddress(_implementation)
        onlyWhenOperatorsMatchAndAcceptedRole(
            IERC1155AccessControlUpgradeableV1(_implementation)
        )
    {
        AccessControlStorage storage $ = _getAccessControlStorage();
        $.newImplementation = _implementation;
        emit ImplementationAuthorized(_implementation);
    }

    /**
     * @dev Sets  settlement agent `_settlementAgent` for `_id` token
     * NB: only the registrar could call this method
     */
    function setSettlementAgent(
        uint256 _id,
        address _settlementAgent
    )
        external
        whenNotPaused
        onlyRegistrar
        onlyWhenSettlementAgentAlreadySet(_id)
    {
        _setSettlementAgent(_id, _settlementAgent);
    }

    /**
     * @dev Sets  registrar agent `_registrarAgent` for `_id` token
     * NB: only the registrar could call this method
     */
    function setRegistrarAgent(
        uint256 _id,
        address _registrarAgent
    )
        external
        whenNotPaused
        onlyRegistrar
        onlyWhenRegistrarAgentAlreadySet(_id)
    {
        _setRegistrarAgent(_id, _registrarAgent);
    }

    /**
     * @dev See {PausableUpgradeable-_pause}.
     */
    function pause() external onlyRegistrar {
        super._pause();
    }

    /**
     * @dev See {PausableUpgradeable-unpause}.
     */
    function unpause() external onlyRegistrar {
        super._unpause();
    }

    /**
     * @dev Returns the contract's operators' addresses
     */
    function getOperators() external view returns (address, address) {
        return (registrar, technical);
    }

    /**
     * @dev Returns the token's settlement agent
     */
    function getSettlementAgent(uint256 _id) public view returns (address) {
        AccessControlStorage storage $ = _getAccessControlStorage();
        return $.settlementAgentByTokenId[_id];
    }

    /**
     * @dev Returns the token's registrar agent
     */
    function getRegistrarAgent(uint256 _id) public view returns (address) {
        AccessControlStorage storage $ = _getAccessControlStorage();
        return $.registrarAgentByTokenId[_id];
    }

    /**
     * @dev Internal method that sets  settlement agent `_settlementAgent` for `_id` token
     */
    function _setSettlementAgent(
        uint256 _id,
        address _settlementAgent
    ) internal onlyNotZeroAddress(_settlementAgent) {
        AccessControlStorage storage $ = _getAccessControlStorage();
        address oldSettlementAgent = $.settlementAgentByTokenId[_id];
        $.settlementAgentByTokenId[_id] = _settlementAgent;
        emit SettlementAgentUpdated(_id, oldSettlementAgent, _settlementAgent);
    }

    function __AccessControl_init() internal onlyInitializing {
        __ERC1155Pausable_init();
    }

    /**
     * @dev Internal method that resets new operators' acceptation statuses
     */
    function _resetNewOperators() internal {
        AccessControlStorage storage $ = _getAccessControlStorage();
        $.hasAcceptedRole[$.newRegistrar] = false;
        $.hasAcceptedRole[$.newTechnical] = false;
    }

    /**
     * @dev Internal method that sets  registrar agent `_registrarAgent` for `_id` token
     */
    function _setRegistrarAgent(
        uint256 _id,
        address _registrarAgent
    ) internal onlyNotZeroAddress(_registrarAgent) {
        AccessControlStorage storage $ = _getAccessControlStorage();
        address oldRegistrarAgent = $.registrarAgentByTokenId[_id];
        $.registrarAgentByTokenId[_id] = _registrarAgent;
        emit RegistrarAgentUpdated(_id, oldRegistrarAgent, _registrarAgent);
    }

    function _update(
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory values
    ) internal virtual override(ERC1155PausableUpgradeable) {
        super._update(from, to, ids, values);
    }

    function _getAccessControlStorage()
        private
        pure
        returns (AccessControlStorage storage $)
    {
        assembly {
            $.slot := AccessControlStorageLocation
        }
    }
}
