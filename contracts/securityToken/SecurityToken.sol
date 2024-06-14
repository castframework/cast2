// SPDX-License-Identifier: Apache-2.0

pragma solidity 0.8.26;

import "./ISecurityToken.sol";
import "./ERC1155AccessControlUpgradeable.sol";
import "../libraries/EncodingUtils.sol";

import "@openzeppelin/contracts-upgradeable/token/ERC1155/ERC1155Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC1155/extensions/ERC1155BurnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC1155/extensions/ERC1155SupplyUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC1155/extensions/ERC1155URIStorageUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

/**
 * @dev The `SecurityToken` contract is basically an ERC1155 with a few specifics
 * It uses the UUPS upgrade mechanism
 * It has a set of operators with specific rights :
 * - the registrar operator :
 *      - manages the blacklisting of users
 *      - reviews(and either validates or rejects) transfers of tokens back to the registrar or the operations address
 *      - names the operators for next implementation contract upgrade (AccessControlUpgradeable.nameNewOperators)
 *      - authorises upgrade to next implementation contract (AccessControlUpgradeable.authorizeImplementation)
 * - the operations operator is a special address used when token owners want to 'cash out' of the SmartCoin
 * (i.e. sell their tokens to the issuer in exchange for cash) :
 *      - it is not possible to use the operations operator's address as spender or destination of a transferFrom
 *      - transfers to the operations address have to be reviewed by the registrar operator before being performed.
 * - the technical operator :
 *      - only the technical operator can launch a (previously authorised) upgrade of the implementation contract (upgradeTo/upgradeToAndCall)
 */
contract SecurityToken is
   Initializable,
   ERC1155AccessControlUpgradeable,
   ERC1155SupplyUpgradeable,
   ERC1155URIStorageUpgradeable,   
   UUPSUpgradeable,
   ISecurityToken
{
    string constant TRANFER_TYPE_DIRECT = "Direct";
    string constant TRANFER_TYPE_LOCK = "Lock";
    string constant TRANFER_TYPE_UNKNOWN = "";
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

    /// @custom:storage-location erc7201:sgforge.storage.SecurityToken
    struct SecurityTokenStorage {
        mapping(uint256 id => mapping(address account => uint256)) _engagedAmount;
        mapping(uint256 id => bool) _minted; 
    }

    // keccak256(abi.encode(uint256(keccak256("sgforge.storage.SecurityToken")) - 1)) & ~bytes32(uint256(0xff))
    bytes32 private constant SecurityTokenStorageLocation = 0x5ca544375baada28ac0172fd60c2d13c5c7015fc0767de9d1a40a3419301b900;

    function _getSecurityTokenStorage() private pure returns (SecurityTokenStorage storage $) {
        assembly {
            $.slot := SecurityTokenStorageLocation
        }
    }
    /**
     * @dev Performs balance checks based on the "available" balance instead of total balance
     * The "available" balance excludes tokens currently engaged in a transfer request,
     * which is a two-step transfer back to the registrar operator or the operations operator
     * (initiated with the transfer() method)
     */
    modifier onlyWhenBalanceAvailable(address _from, uint256 _id, uint256 _value) {
        uint256 availableBalance = _availableBalance(_from, _id);
        if (_value > availableBalance)
            revert InsufficientBalance({
                id: _id,
                current: availableBalance,
                required: _value
            });
        _;
    }

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor(
        address _registrar,
        address _technical
    )
        onlyNotZeroAddress(_registrar)
        onlyNotZeroAddress(_technical)
        onlyWhenOperatorsHaveDifferentAddress(
            _registrar,
            _technical
        )
        ERC1155AccessControlUpgradeable(_registrar, _technical)
    {
        // https://docs.openzeppelin.com/upgrades-plugins/1.x/writing-upgradeable#potentially-unsafe-operations
        // https://docs.openzeppelin.com/upgrades-plugins/1.x/writing-upgradeable#initializing_the_implementation_contract
        _disableInitializers();
    }

    function upgradeToAndCall(
        address _newImplementation,
        bytes memory data
    )
        public
        payable
        virtual
        override
        onlyProxy
        consumeAuthorizeImplementation(_newImplementation)
    {

        super.upgradeToAndCall(_newImplementation, data);
        _resetNewOperators();
    }

    /**
     * @dev Returns the version number of this contract
     */
    function version() external pure virtual returns (string memory) {
        return "V1";
    }

    /**
     * @dev UUPS initializer that initializes the token's name and symbol
     */
    function initialize(
        string memory _baseUri
    ) public initializer {
        __ERC1155_init(_baseUri);
        __ERC1155URIStorage_init();
        _setBaseURI(_baseUri);
        __UUPSUpgradeable_init();
    }

    function setURI(uint256 tokenId, string memory tokenURI) external virtual onlyRegistrar {
        super._setURI(tokenId, tokenURI);
    }

    function setBaseURI(string memory baseURI) external virtual onlyRegistrar {
        super._setBaseURI(baseURI);
    }

    /**
     * @dev Burns a `amount` amount of `id` tokens from the caller.
     * NB: only the registrar operator is allowed to burn their tokens
     */
    // todo : either this or burn(_id, _amount) to only burn on registrar's account
    function burn(address _account, uint256 _id, uint256 _amount) external onlyRegistrar onlyWhenBalanceAvailable(_account, _id, _amount) {
        super._burn(_account, _id, _amount);
    }

    /**
     * @dev Mints a `amount` amount of `id` tokens on `to` address
     * NB: only the registrar operator is allowed to mint new tokens
     * NB: the `_to` address has to be unfrozen
     */
    function mint(
        address _to,
        uint256 _id,
        uint256 _amount,
        bytes calldata data
    ) external onlyRegistrar returns (bool) {
        SecurityTokenStorage storage $ = _getSecurityTokenStorage();
        if (data.length != 0) {
            require(!$._minted[_id], TokenAlreadyMinted(_id));
            MintData memory mintData = abi.decode(data, (MintData));            
            setRegistrarAgent(_id, mintData.registrarAgent);
            setSettlementAgent(_id, mintData.settlementAgent);
            $._minted[_id] = true;             
        } else {
            require($._minted[_id], TokenNotAlreadyMinted(_id));            
        }
        super._mint(_to, _id, _amount, data);
        return true;
    }

    function _update(address from, address to, uint256[] memory ids, uint256[] memory values)
        internal
        override(ERC1155Upgradeable, ERC1155SupplyUpgradeable, ERC1155AccessControlUpgradeable)
    {
        super._update(from, to, ids, values);//TODO check which parent class this method call
    }

    function uri(uint256 _id) public view override(ERC1155Upgradeable, ERC1155URIStorageUpgradeable) returns (string memory) {
        return super.uri(_id);
    }

   /**
     * @dev See {IERC1155-safeTransferFrom}.
     */
    function safeTransferFrom(address from, address to, uint256 id, uint256 value, bytes memory data) onlyRegistrarAgent(id) public override {

        super._safeTransferFrom(from, to, id ,value, data);
    }

    /**
     * @dev Returns the balance of `addr` account for `id` token.
     * NB: The returned balance is the "available" balance, which excludes tokens engaged in a transaction
     * (i.e. a transfer back to the registrar operator or the operations operator)
     */
    function balanceOf(
        address _addr, uint256 _id
    ) public view override(ERC1155Upgradeable) returns (uint256) {
        return _availableBalance(_addr, _id);
    }

    /**
     * @dev Returns current amount engaged in transfer requests for `addr` account and `id` token
     */
    function engagedAmount(address _addr, uint256 _id) public view returns (uint256) {
        SecurityTokenStorage storage $ = _getSecurityTokenStorage();
        return $._engagedAmount[_id][_addr];
    }

    // solhint-disable-next-line no-empty-blocks
    function _authorizeUpgrade(
        address newImplementation
    ) internal override onlyTechnical {}

    /**
     * @dev Internal method that computes the available(i.e. not engaged) balance
     */
    function _availableBalance(address _addr, uint256 _id) internal view returns (uint256) {
        SecurityTokenStorage storage $ = _getSecurityTokenStorage();
        unchecked {
            return super.balanceOf(_addr, _id) - $._engagedAmount[_id][_addr]; // No overflow since balance >= engagedAmount
        }
    }

    // function GetCharacter(string isinCode, uint256 index) public view returns (byte) {
    //     bytes32 isin = isinCode;
    //     return isin[index];
    // }
}
