// SPDX-License-Identifier: Apache-2.0

pragma solidity 0.8.26;

import "./ISecurityTokenV1.sol";
import "./ERC1155AccessControlUpgradeableV1.sol";
import "../satellite/ISatelliteV1.sol";

import "@openzeppelin/contracts-upgradeable/token/ERC1155/ERC1155Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC1155/extensions/ERC1155BurnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC1155/extensions/ERC1155SupplyUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC1155/extensions/ERC1155URIStorageUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

import "@openzeppelin/contracts/utils/introspection/ERC165Checker.sol";
import "@openzeppelin/contracts/proxy/Clones.sol";

/**
 * @dev The `SecurityToken` contract is basically an ERC1155 with a few specifics
 * It uses the UUPS upgrade mechanism
 * It has a set of operators with specific rights :
 * - the registrar operator(for the whole contract) :
 *      - mints tokens
 *      - burns tokens
 *      - force reviews(and either releases or cancels) transfers of tokens
 *      - names the operators for next implementation contract upgrade (ERC1155AccessControlUpgradeableV1.nameNewOperators)
 *      - authorises upgrade to next implementation contract (ERC1155AccessControlUpgradeableV1.authorizeImplementation)
 * - the technical operator(for the whole contract):
 *      - only the technical operator can launch a (previously authorised) upgrade of the implementation contract (upgradeTo/upgradeToAndCall)
 * - the registrar agent operator(by tokenId):
 *      - initiate a safeTransferFrom
 *      - cancel a locked safeTransferFrom using the cancelTransaction method
 * - the settlement agent operator(by tokenId):
 *      - releases a locked safeTransferFrom using the releaseTransaction method
 * It has two types of transfer:
 * - Direct safeTransferFrom:
 *      - direct transfer of tokens to the receiver
 * - Lock safeTransferFrom
 *      - locks the tokens in the holder address by the registrar agent
 *      - transfer could be canceled by the registrar agent or registrar (owner of the contract).
 *      - transfer could be released by the settlement agent or registrar (owner of the contract).
 * It has two types of mints
 * - Mint with data that contains (Settlement agent, Registrar agent and token URI)
 *      - set up a registrar agent and settlement agent for the token.
 *      - set up an URI for the token
 *      - mints the tokens to receiver address
 * - Mint with empty data
 *      - mints tokens to the receiver address (only if the token was previously minted)
 */
//@custom:oz-upgrades
contract SecurityTokenV1 is
    Initializable,
    ERC1155AccessControlUpgradeableV1,
    ERC1155SupplyUpgradeable,
    ERC1155URIStorageUpgradeable,
    UUPSUpgradeable,
    ISecurityTokenV1
{
    /// @custom:storage-location erc7201:sgforge.storage.SecurityToken
    struct SecurityTokenStorage {
        mapping(string transactionId => TransferRequest) transferRequests;
        mapping(uint256 id => mapping(address account => uint256)) engagedAmount;
        mapping(uint256 id => bool) minted;
        string name;
        string symbol;
        mapping(uint256 id => address) satellites;
        mapping(uint256 id => string) webUris;
        mapping(uint256 id => address) formerSmartcontractAddresses;
    }

    string constant TRANFER_TYPE_DIRECT = "Direct";
    string constant TRANFER_TYPE_LOCK = "Lock";

    // keccak256(abi.encode(uint256(keccak256("sgforge.storage.SecurityToken")) - 1)) & ~bytes32(uint256(0xff))
    bytes32 private constant SecurityTokenStorageLocation =
        0x5ca544375baada28ac0172fd60c2d13c5c7015fc0767de9d1a40a3419301b900;

    error DataTransferEmpty();
    error TransactionAlreadyExists();
    error InvalidTransferType();

    error TransferRequestNotFound();
    error InvalidTransferRequestStatus();

    error InvalidIsinCodeLength();
    error InvalidIsinCodeCharacter(bytes1 character);

    error UnsupportedMethod();

    error InvalidSatelliteAddress();

    /**
     * @dev Used when "available" balance is insufficient
     */
    error InsufficientBalance(uint256 id, uint256 current, uint256 required);

    /**
     * @dev Used when token has already been minted in the past
     */
    error TokenAlreadyMinted(uint256 id);
    /**
     * @dev Used when token has not already been minted in the past
     */
    error TokenNotAlreadyMinted(uint256 id);
    /**
     * @dev Performs balance checks based on the "available" balance instead of total balance
     * The "available" balance excludes tokens currently engaged in a transfer request,
     * which is a two-step transfer back to the registrar operator or the operations operator
     * (initiated with the transfer() method)
     */
    modifier onlyWhenBalanceAvailable(
        address _from,
        uint256 _id,
        uint256 _value
    ) {
        uint256 availableBalance = _availableBalance(_from, _id);
        if (_value > availableBalance)
            revert InsufficientBalance({
                id: _id,
                current: availableBalance,
                required: _value
            });
        _;
    }
    /**
     * @dev Throws if called by any account other than the settlement agent.
     */
    modifier onlySettlementAgent(string calldata _transactionId) {
        SecurityTokenStorage storage $ = _getSecurityTokenStorage();
        uint tokenId = $.transferRequests[_transactionId].id;
        require(
            _msgSender() == getSettlementAgent(tokenId),
            UnauthorizedSettlementAgent(tokenId)
        );
        _;
    }
    /**
     * @dev Throws if called by any account other than the settlement agent.
     */
    modifier onlyTransactionRegistrarAgent(string calldata _transactionId) {
        SecurityTokenStorage storage $ = _getSecurityTokenStorage();
        uint tokenId = $.transferRequests[_transactionId].id;
        require(
            _msgSender() == getRegistrarAgent(tokenId),
            UnauthorizedRegistrarAgent(tokenId)
        );
        _;
    }
    /**
     * @dev Throws if isinCode format is invalid.
     */
    modifier onlyIfValidIsin(string calldata isinCode) {
        bytes memory isin = bytes(isinCode);
        for (uint256 i = 0; i < isin.length; i++) {
            if (
                isin[i] < 0x30 ||
                (isin[i] > 0x39 && isin[i] < 0x41) ||
                (isin[i] > 0x5A && isin[i] < 0x61) ||
                isin[i] > 0x7A
            ) revert InvalidIsinCodeCharacter(isin[i]);
        }
        require(isin.length == 12, InvalidIsinCodeLength());
        _;
    }

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor(
        address _registrar,
        address _technical
    )
        onlyNotZeroAddress(_registrar)
        onlyNotZeroAddress(_technical)
        onlyWhenOperatorsHaveDifferentAddress(_registrar, _technical)
        ERC1155AccessControlUpgradeableV1(_registrar, _technical)
    {
        // https://docs.openzeppelin.com/upgrades-plugins/1.x/writing-upgradeable#potentially-unsafe-operations
        // https://docs.openzeppelin.com/upgrades-plugins/1.x/writing-upgradeable#initializing_the_implementation_contract
        _disableInitializers();
    }

    /**
     * @dev UUPS initializer that initializes the token's name, symbol, uri and baseUri
     */
    function initialize(
        string memory _uri,
        string memory _baseUri,
        string memory _name,
        string memory _symbol
    ) public initializer {
        __ERC1155_init(_uri);
        __ERC1155URIStorage_init();
        _setBaseURI(_baseUri);
        __UUPSUpgradeable_init();

        SecurityTokenStorage storage $ = _getSecurityTokenStorage();
        $.name = _name;
        $.symbol = _symbol;
    }

    /**
     * @dev Sets an URI for the token `tokenId`
     */
    function setURI(
        uint256 tokenId,
        string calldata tokenURI
    ) external whenNotPaused onlyRegistrar {
        ERC1155URIStorageUpgradeable._setURI(tokenId, tokenURI);
    }
    
    /**
     * @dev set the token's webUri.
     */
    function setWebUri(uint256 _tokenId, string calldata _webUri) external whenNotPaused onlyRegistrar{
        SecurityTokenStorage storage $ = _getSecurityTokenStorage();
        $.webUris[_tokenId] = _webUri;
        emit WebURI(_tokenId, _webUri);
    }
    /**
     * @dev Sets `_baseURI` as the `_baseURI` for all tokens
     */
    function setBaseURI(
        string calldata _baseURI
    ) external whenNotPaused onlyRegistrar {
        ERC1155URIStorageUpgradeable._setBaseURI(_baseURI);
    }

    /**
     * @dev Burns a `amount` amount of `id` tokens from the account `_account`.
     * NB: only the registrar operator is allowed to burn tokens
     */
    function burn(
        address _account,
        uint256 _id,
        uint256 _amount
    )
        external
        whenNotPaused
        onlyRegistrar
        onlyWhenBalanceAvailable(_account, _id, _amount)
    {
        super._burn(_account, _id, _amount);
    }

    /**
     * @dev Mints a `_amount` amount of `_id` tokens on `_to` address
     * NB: if `_data` data is not empty, set up a registrar agent, settlement agent and an uri for the `_id` token.
     * NB: only the registrar operator is allowed to mint new tokens
     */
    function mint(
        address _to,
        uint256 _id,
        uint256 _amount,
        bytes calldata _data
    ) external whenNotPaused onlyRegistrar returns (bool) {
        SecurityTokenStorage storage $ = _getSecurityTokenStorage();
        if (_data.length != 0) {
            
            require(!$.minted[_id], TokenAlreadyMinted(_id));
            
            (
                TokenOperators memory tokenOperators,
                TokenMetadata memory tokenMetadata,
                SatelliteDetails memory satelitteDetails
            ) = abi.decode(_data, (TokenOperators, TokenMetadata, SatelliteDetails));

            require(
                ERC165Checker.supportsInterface(
                    satelitteDetails.implementationAddress,
                    type(ISatelliteV1).interfaceId
                ),
                InvalidSatelliteAddress()
            );
            $.formerSmartcontractAddresses[_id] = tokenMetadata.formerSmartcontractAddress;
            $.webUris[_id] = tokenMetadata.webUri;
            _setRegistrarAgent(_id, tokenOperators.registrarAgent);
            _setSettlementAgent(_id, tokenOperators.settlementAgent);
            ERC1155URIStorageUpgradeable._setURI(_id, tokenMetadata.uri);

            _launchSatellite(
                _id,
                satelitteDetails.implementationAddress,
                satelitteDetails.name,
                satelitteDetails.symbol
            );
            $.minted[_id] = true;
        } else {
            require($.minted[_id], TokenNotAlreadyMinted(_id));
        }
        super._mint(_to, _id, _amount, _data);
        _handleSatelliteTransfer(_id, address(0), _to, _amount);
        return true;
    }

    /**
     * @dev Actually performs the transfer request corresponding to the given `_transactionId`
     * Called by the settlement agent operator
     */
    function releaseTransaction(
        string calldata _transactionId
    )
        external
        whenNotPaused
        onlySettlementAgent(_transactionId)
        returns (bool)
    {
        return _releaseTransaction(_transactionId);
    }

    /**
     * @dev Cancels the transfer request corresponding to the given `_transactionId`
     * Called by the registrar agent operator
     */
    function cancelTransaction(
        string calldata _transactionId
    )
        external
        whenNotPaused
        onlyTransactionRegistrarAgent(_transactionId)
        returns (bool)
    {
        return _cancelTransaction(_transactionId);
    }

    /**
     * @dev Actually performs the transfer request corresponding to the given `_transactionId`
     * Called by the registrar operator
     */
    function forceReleaseTransaction(
        string calldata _transactionId
    ) external whenNotPaused onlyRegistrar returns (bool) {
        return _releaseTransaction(_transactionId);
    }

    /**
     * @dev Cancels the transfer request corresponding to the given `_transactionId`
     * Called by the registrar operator
     */
    function forceCancelTransaction(
        string calldata _transactionId
    ) external whenNotPaused onlyRegistrar returns (bool) {
        return _cancelTransaction(_transactionId);
    }

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
    ) external whenNotPaused onlyRegistrar {
        _internalSafeTransferFrom(_from, _to, _id, _value, _data);
    }

    /**
     * @dev Returns the name of this token
     */
    function formerSmartContractAddress(uint256 _tokenId) external view returns (address) {
        SecurityTokenStorage storage $ = _getSecurityTokenStorage();
        return $.formerSmartcontractAddresses[_tokenId];
    }

    /**
     * @dev Returns the name of this token
     */
    function name() external view returns (string memory) {
        SecurityTokenStorage storage $ = _getSecurityTokenStorage();
        return $.name;
    }

    /**
     * @dev Returns the symbol of this token
     */
    function symbol() external view returns (string memory) {
        SecurityTokenStorage storage $ = _getSecurityTokenStorage();
        return $.symbol;
    }

    /**
     * @dev Returns the address of the satellite contract for tokenId
     */
    function satellite(uint256 _tokenId) external view returns (address) {
        SecurityTokenStorage storage $ = _getSecurityTokenStorage();
        return $.satellites[_tokenId];
    }

    /**
     * @dev Returns the token's webUri
     */
    function webUri(uint256 _tokenId) external view returns (string memory) {
        SecurityTokenStorage storage $ = _getSecurityTokenStorage();
        return $.webUris[_tokenId];
    }

    function getLockedAmount(string memory _transactionId) external view returns(TransferRequest memory){
        SecurityTokenStorage storage $ = _getSecurityTokenStorage();
        TransferRequest memory transferRequest = $.transferRequests[_transactionId];
        require(transferRequest.status == TransferStatus.Created, InvalidTransferRequestStatus());
        return transferRequest;
    }

    /**
     * @dev Returns the tokenId as number from an `_isinCode`.
     */
    function getTokenIdByIsin(
        string calldata _isinCode
    ) external pure onlyIfValidIsin(_isinCode) returns (uint256) {
        return uint96(bytes12(_toUpper(_isinCode)));
    }

    /**
     * @dev Returns the contract version.
     */
    function version() external pure virtual override returns (string memory) {
        return "V1";
    }

    /** @dev Same semantic as ERC1155's safeTransferFrom function although there are 3 cases :
     * 1- if the type of transfer is a Direct Transfer then the transfer will occur right away
     * 2- if the type of transfer is Lock Transfer then the transfer will only actually occur once validated by the settlement agent operator
     * using the releaseTransaction method or by the registrar operator(owner of the registry) via forceReleaseTransaction
     * 3- if the type of Transfer is unknown then the transfer will be rejected
     * NB: only the registrar agent of the `_id` token  could perform a safeTransferFrom
     */
    function safeTransferFrom(
        address _from,
        address _to,
        uint256 _id,
        uint256 _value,
        bytes memory _data
    )
        public
        override(ERC1155Upgradeable, IERC1155)
        whenNotPaused
        onlyRegistrarAgent(_id)
    {
        _internalSafeTransferFrom(_from, _to, _id, _value, _data);
    }

    function upgradeToAndCall(
        address _newImplementation,
        bytes memory _data
    )
        public
        payable
        virtual
        override
        onlyProxy
        consumeAuthorizeImplementation(_newImplementation)
    {
        super.upgradeToAndCall(_newImplementation, _data);
        _resetNewOperators();
    }

    /**
     * @dev See {IERC1155-safeBatchTransferFrom}.
     */
    function safeBatchTransferFrom(
        address,
        address,
        uint256[] memory,
        uint256[] memory,
        bytes memory
    ) public virtual override(ERC1155Upgradeable, IERC1155) {
        revert UnsupportedMethod();
    }

    /**
     * @dev See {IERC1155-setApprovalForAll}.
     */
    function setApprovalForAll(
        address,
        bool
    ) public virtual override(ERC1155Upgradeable, IERC1155) {
        revert UnsupportedMethod();
    }

    /**
     * @dev See {IERC1155-isApprovedForAll}.
     */
    function isApprovedForAll(
        address,
        address
    )
        public
        view
        virtual
        override(ERC1155Upgradeable, IERC1155)
        returns (bool)
    {
        revert UnsupportedMethod();
    }

    /**
     * @dev See {ERC1155URIStorageUpgradeable-uri}.
     */
    function uri(
        uint256 _id
    )
        public
        view
        override(
            ISecurityTokenV1,
            ERC1155Upgradeable,
            ERC1155URIStorageUpgradeable
        )
        returns (string memory)
    {
        return ERC1155URIStorageUpgradeable.uri(_id);
    }

    /**
     * @dev Total value of tokens in with a given id.
     */
    function totalSupply(
        uint256 _id
    )
        public
        view
        override(ISecurityTokenV1, ERC1155SupplyUpgradeable)
        returns (uint256)
    {
        return super.totalSupply(_id);
    }
    /**
     * @dev Returns the balance of `addr` account for `id` token.
     * NB: The returned balance is the "available" balance, which excludes tokens engaged in a transaction
     * (i.e. a safeTransferFrom of type `Lock`)
     */
    function balanceOf(
        address _addr,
        uint256 _id
    ) public view override(ERC1155Upgradeable, IERC1155) returns (uint256) {
        return _availableBalance(_addr, _id);
    }

    /**
     * @dev Returns current amount engaged in transfer requests for `addr` account and `id` token
     */
    function engagedAmount(
        address _addr,
        uint256 _id
    ) public view returns (uint256) {
        SecurityTokenStorage storage $ = _getSecurityTokenStorage();
        return $.engagedAmount[_id][_addr];
    }

    /**
     * @dev See {IERC1155-_update}.
     */
    function _update(
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory values
    )
        internal
        override(
            ERC1155Upgradeable,
            ERC1155SupplyUpgradeable,
            ERC1155AccessControlUpgradeableV1
        )
    {
        super._update(from, to, ids, values);
    }

    // solhint-disable-next-line no-empty-blocks
    function _authorizeUpgrade(
        address newImplementation
    ) internal override onlyTechnical {}

    /**
     * @dev Internal method that computes the available(i.e. not engaged) balance
     */
    function _availableBalance(
        address _addr,
        uint256 _id
    ) internal view returns (uint256) {
        SecurityTokenStorage storage $ = _getSecurityTokenStorage();
        unchecked {
            return super.balanceOf(_addr, _id) - $.engagedAmount[_id][_addr]; // No overflow since balance >= engagedAmount
        }
    }

    /**
     * @dev Private method cancelling a lock transfer.
     * disengages the engaged amount
     * cancels the transfer for the given `_transactionId` transactionId
     * and emits a corresponding `LockUpdated` event
     */
    function _cancelTransaction(
        string calldata _transactionId
    ) private returns (bool) {
        SecurityTokenStorage storage $ = _getSecurityTokenStorage();
        TransferRequest storage transferRequest = $.transferRequests[
            _transactionId
        ];
        require(
            transferRequest.status == TransferStatus.Created,
            InvalidTransferRequestStatus()
        );

        transferRequest.status = TransferStatus.Rejected;
        $.engagedAmount[transferRequest.id][
            transferRequest.from
        ] -= transferRequest.value;
        emit LockUpdated(
            _transactionId,
            _msgSender(),
            transferRequest.from,
            transferRequest.to,
            transferRequest.id,
            TransferStatus.Rejected
        );
        return true;
    }

    /**
     * @dev Private method releasing a lock transfer.
     * disengages the engaged amount
     * proceeds the transfer for the given `_transactionId` transactionId
     * and emits a corresponding `LockUpdated` event
     */
    function _releaseTransaction(
        string calldata _transactionId
    ) private returns (bool) {
        SecurityTokenStorage storage $ = _getSecurityTokenStorage();
        TransferRequest storage transferRequest = $.transferRequests[
            _transactionId
        ];
        require(
            transferRequest.status == TransferStatus.Created,
            InvalidTransferRequestStatus()
        );

        transferRequest.status = TransferStatus.Validated;
        $.engagedAmount[transferRequest.id][
            transferRequest.from
        ] -= transferRequest.value;

        super._safeTransferFrom(
            transferRequest.from,
            transferRequest.to,
            transferRequest.id,
            transferRequest.value,
            ""
        );

        _handleSatelliteTransfer(
            transferRequest.id,
            transferRequest.from,
            transferRequest.to,
            transferRequest.value
        );

        emit LockUpdated(
            _transactionId,
            _msgSender(),
            transferRequest.from,
            transferRequest.to,
            transferRequest.id,
            TransferStatus.Validated
        );
        return true;
    }

    /**
     * @dev Deploy a new satellite contract for a given tokenId
     * The goal of a satellite contract is that a given token appear
     * as his own on explorers (e.g. own token tracker on etherscan)
     */
    function _launchSatellite(
        uint256 _tokenId,
        address _satelliteImplementation,
        string memory _name,
        string memory _symbol
    ) private {
        SecurityTokenStorage storage $ = _getSecurityTokenStorage();

        address satelliteAddress = Clones.clone(_satelliteImplementation);
        ISatelliteV1(satelliteAddress).initialize(
            address(this),
            _tokenId,
            _name,
            _symbol
        );
        $.satellites[_tokenId] = satelliteAddress;

        emit NewSatellite(_tokenId, satelliteAddress);
    }
    /**
     * @dev Same semantic as ERC1155's safeTransferFrom function although there are 3 cases :
     * 1- if the type of transfer is a Direct Transfer then the transfer will occur right away
     * 2- if the type of transfer is Lock Transfer then the transfer will only actually occur once validated by the settlement agent operator
     * using the releaseTransaction method or by the registrar operator(owner of the registry) via forceReleaseTransaction
     * 3- if the type of Transfer is unknown then the transfer will be rejected
     */
    function _internalSafeTransferFrom(
        address _from,
        address _to,
        uint256 _id,
        uint256 _value,
        bytes memory _data
    ) private onlyWhenBalanceAvailable(_from, _id, _value) {
        require(_data.length > 0, DataTransferEmpty());
        TransferData memory transferData = abi.decode(_data, (TransferData));
        if (_isLockTransfer(transferData.kind)) {
            LockTransferData memory lockTransferData = abi.decode(
                _data,
                (LockTransferData)
            );
            SecurityTokenStorage storage $ = _getSecurityTokenStorage();
            require(
                $.transferRequests[lockTransferData.transactionId].status ==
                    TransferStatus.Undefined,
                TransactionAlreadyExists()
            );
            $.engagedAmount[_id][_from] += _value;
            $.transferRequests[
                lockTransferData.transactionId
            ] = TransferRequest(
                _from,
                _to,
                _id,
                _value,
                TransferStatus.Created
            );
            emit TransferSingle(_msgSender(), _from, _to, _id, 0);
            emit LockReady(
                lockTransferData.transactionId,
                _msgSender(),
                _from,
                _to,
                _id,
                _value,
                _data
            );
        } else if (_isDirectTransfer(transferData.kind)) {
            super._safeTransferFrom(_from, _to, _id, _value, _data);
            _handleSatelliteTransfer(_id, _from, _to, _value);
        } else {
            revert InvalidTransferType();
        }
    }

    /**
     * @dev proceeds a transfer in satellite token
     */
    function _handleSatelliteTransfer(
        uint256 _tokenId,
        address _from,
        address _to,
        uint256 _value
    ) private {
        SecurityTokenStorage storage $ = _getSecurityTokenStorage();
        address satelliteAddress = $.satellites[_tokenId];
        ISatelliteV1(satelliteAddress).transferFrom(_from, _to, _value);
    }
    /**
     * @dev Returns whether the kind `_kind` is a direct transfer
     */
    function _isDirectTransfer(string memory kind) private pure returns (bool) {
        return _compareStr(kind, TRANFER_TYPE_DIRECT);
    }

    /**
     * @dev Returns whether the kind `_kind` is a lock transfer
     */
    function _isLockTransfer(string memory _kind) private pure returns (bool) {
        return _compareStr(_kind, TRANFER_TYPE_LOCK);
    }

    /**
     * @dev Returns whether the strings `_str1` and `_str2` are equivalent
     */
    function _compareStr(
        string memory _str1,
        string memory _str2
    ) private pure returns (bool) {
        if (bytes(_str1).length != bytes(_str2).length) {
            return false;
        }
        return
            keccak256(abi.encodePacked(_str1)) ==
            keccak256(abi.encodePacked(_str2));
    }

    /**
     * @dev Returns the string `_isinCode` in uppercase
     */
    function _toUpper(
        string memory _isinCode
    ) private pure returns (bytes memory) {
        bytes memory isin = bytes(_isinCode);
        for (uint256 i = 0; i < isin.length; i++) {
            if (isin[i] >= 0x61 && isin[i] <= 0x7A) {
                isin[i] = bytes1(uint8(isin[i]) - 32);
            }
        }
        return isin;
    }

    function _getSecurityTokenStorage()
        private
        pure
        returns (SecurityTokenStorage storage $)
    {
        assembly {
            $.slot := SecurityTokenStorageLocation
        }
    }
}
