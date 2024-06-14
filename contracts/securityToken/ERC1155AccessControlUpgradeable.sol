// SPDX-License-Identifier: Apache-2.0

pragma solidity 0.8.26;

import "@openzeppelin/contracts-upgradeable/token/ERC1155/extensions/ERC1155PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "./IAccessControl.sol";

abstract contract ERC1155AccessControlUpgradeable is
    IAccessControl,
    ERC1155PausableUpgradeable
{
    /**
     * @dev Used when a method reserved to the registrar operator is called by some other address
     */
    error UnauthorizedRegistrar();
    /**
     * @dev Used when the registar operator's address is used as parameter where it's not allowed
     */
    error ForbiddenForRegistrar();
    /**
     * @dev Used when `addr` address is not authorized to perform an action
     */
    error Unauthorized(address addr);
    /**
     * @dev Used when the zero address is used as parameter where it's not allowed
     */
    error ZeroAddressCheck();
    /**
     * @dev Used when trying to freeze an address and the address is already in the frozen list
     */
    error AddressAlreadyFrozen(address addr);
    /**
     * @dev Used when a method reserved to the technical operator is called by some other address
     */
    error UnauthorizedTechnical();
    /**
     * @dev Used when trying to unfreeze an address and the address is not frozen
     */
    error AddressNotFrozen(address addr);
    /**
     * @dev Used when trying to update to an unauthorized implementation
     */
    error UnauthorizedImplementation(address implementation);
    /**
     * @dev Used when contract already paused
     */
    error ContractPaused();
    /**
     * @dev Used when contract already not paused
     */
    error ContractNotPaused();

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

    function _getAccessControlStorage()
        private
        pure
        returns (AccessControlStorage storage $)
    {
        assembly {
            $.slot := AccessControlStorageLocation
        }
    }

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
     * @dev Throws if called by any account other than the registrar.
     */
    modifier onlyRegistrar() {
        if (msg.sender != registrar) revert UnauthorizedRegistrar();
        _;
    }

    /**
     * @dev Throws if called by any account other than the technical.
     */
    modifier onlyTechnical() {
        if (msg.sender != technical) revert UnauthorizedTechnical();
        _;
    }

    modifier onlyWhenOperatorsHaveDifferentAddress(
        address _registrar,
        address _technical
    ) {
        if (
            _registrar == _technical
        ) revert InconsistentOperators();
        _;
    }

    /**
     * @dev Throws if addr is registrar
     */
    modifier forbiddenForRegistrar(address _addr) {
        if (_addr == registrar) revert ForbiddenForRegistrar();
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
     * @dev Throws if `_registrar`, `_operations` and `_technical` have not all accepted their respective future role
     * and (still) match the values for new contract
     */
    modifier onlyWhenOperatorsMatchAndAcceptedRole(
        IAccessControl _newImplementation
    ) {
        AccessControlStorage storage $ = _getAccessControlStorage();
        (
            address _registar,
            address _technical
        ) = _newImplementation.getOperators();
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
            msg.sender == $.registrarAgentByTokenId[_id],
            UnauthorizedRegistrarAgent(_id)
        );
        _;
    }

    /**
     * @dev Throws if called by any account other than the registrar agent.
     */
    modifier onlySettlementAgent(uint256 _id) {
        AccessControlStorage storage $ = _getAccessControlStorage();
        require(
            msg.sender == $.settlementAgentByTokenId[_id],
            UnauthorizedSettlementAgent(_id)
        );
        _;
    }

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor(address _registrar, address _technical) {
        registrar = _registrar;
        technical = _technical;
    }

    /**
     * @dev Returns the contract's operators' addresses
     */
    function getOperators() external view returns (address, address) {
        return (registrar, technical);
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
        onlyWhenOperatorsHaveDifferentAddress(
            _registrar,
            _technical
        )
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
        if ($.newRegistrar != msg.sender) revert UnauthorizedRegistrar();
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
        if ($.newTechnical != msg.sender) revert UnauthorizedTechnical();
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
        onlyWhenOperatorsMatchAndAcceptedRole(IAccessControl(_implementation))
    {
        AccessControlStorage storage $ = _getAccessControlStorage();
        $.newImplementation = _implementation;
        emit ImplementationAuthorized(_implementation);
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

    function setRegistrarAgent(
        uint256 _id,
        address registrarAgent
    )
        public
        onlyRegistrar
        onlyNotZeroAddress(registrarAgent)
        onlyWhenRegistrarAgentAlreadySet(_id)
    {
        AccessControlStorage storage $ = _getAccessControlStorage();
        $.registrarAgentByTokenId[_id] = registrarAgent;
    }

    function setSettlementAgent(
        uint256 _id,
        address settlementAgent
    )
        public
        onlyRegistrar
        onlyNotZeroAddress(settlementAgent)
        onlyWhenSettlementAgentAlreadySet(_id)
    {
        AccessControlStorage storage $ = _getAccessControlStorage();
        $.settlementAgentByTokenId[_id] = settlementAgent;
    }

    function pause() external onlyRegistrar {
        super._pause();
    }

    function unpause() external onlyRegistrar {
        super._unpause();
    }

    function _update(
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory values
    ) internal virtual override(ERC1155PausableUpgradeable) {
        super._update(from, to, ids, values);
    }
}
