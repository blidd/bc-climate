// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.9.0;

abstract contract IERC223 {
    
    function name()        public view virtual returns (string memory);
    function symbol()      public view virtual returns (string memory);
    function standard()    public view virtual returns (string memory);
    function decimals()    public view virtual returns (uint8);
    function totalSupply() public view virtual returns (uint256);
    
    /**
     * @dev Returns the balance of the `who` address.
     */
    function balanceOf(address who) public virtual view returns (uint);
        
    /**
     * @dev Transfers `value` tokens from `msg.sender` to `to` address
     * and returns `true` on success.
     */
    function transfer(address to, uint value) public virtual returns (bool success);
        
    /**
     * @dev Transfers `value` tokens from `msg.sender` to `to` address with `data` parameter
     * and returns `true` on success.
     */
    function transfer(address to, uint value, bytes calldata data) public virtual returns (bool success);
     
     /**
     * @dev Event that is fired on successful transfer.
     */
    event Transfer(address indexed from, address indexed to, uint value);
    
     /**
     * @dev Additional event that is fired on successful transfer and logs transfer metadata,
     *      this event is implemented to keep Transfer event compatible with ERC20.
     */
    event TransferData(bytes data);
}

contract CarbonCreditToken is IERC223 {

    string private _name;
    string private _symbol;
    uint8 private _decimals;
    uint256 private _totalSupply;

    mapping(address => uint256) public balances;

    address public minter;

    constructor(string memory new_name, string memory new_symbol, uint8 new_decimals) {
        _name = new_name;
        _symbol = new_symbol;
        _decimals = new_decimals;
        _totalSupply = 1000;
        minter = msg.sender;
        balances[minter] = _totalSupply;
    }

    function standard() public pure override returns (string memory) {
        return "erc223";
    }

    function name() public view override returns (string memory) {
        return _name;
    }

    function symbol() public view override returns (string memory) {
        return _symbol;
    }

    function decimals() public view override returns (uint8) {
        return _decimals;
    }

    function totalSupply() public view override returns (uint256) {
        return _totalSupply;
    }

    function balanceOf(address _owner) public view override returns (uint256) {
        return balances[_owner];
    }

    function transfer(address _to, uint _value, bytes calldata _data) public override returns (bool success) {
        balances[msg.sender] = balances[msg.sender] - _value;
        balances[_to] = balances[_to] + _value;

        emit Transfer(msg.sender, _to, _value);
        emit TransferData(_data);
        return true;
    }

    function transfer(address _to, uint _value) public override returns (bool success) {
        bytes memory _empty = hex"00000000";
        balances[tx.origin] = balances[tx.origin] - _value;
        balances[_to] = balances[_to] + _value;
        emit Transfer(tx.origin, _to, _value);
        emit TransferData(_empty);
        return true;
    }

    function transferEscrow(address _esc, address _to, uint _value) public {
        balances[_esc] = balances[_esc] - _value;
        balances[_to] = balances[_to] + _value;

        emit Transfer(_esc, _to, _value);
    }

    function deleteEscrow(address _esc) public {
        delete balances[_esc];
    }
}

contract Escrow {

    // enum Status { EMPTY, WAITING_ACCEPT, WAITING_PAYMENT, COMPLETE }
    // Status status;

    address public buyer;
    address public seller;
    uint itmo_amt;
    uint _deposit;
    bool locked;
    
    // bool exists;

    CarbonCreditToken cct;

    address ccm_addr;

    modifier onlyBuyer() {
        require(msg.sender == buyer, "Only buyer can call this method");
        _;
    }

    modifier onlySeller() {
        require(msg.sender == seller, "Only seller can call this method");
        _;
    }

    modifier onlyCCM() {
        require(msg.sender == ccm_addr, "Only the CCM contract can call this method");
        _;
    }

    constructor(address _buyer, address _cct, address _ccm, uint amount) {
        buyer = _buyer;
        seller = address(0);
        itmo_amt = amount;
        locked = true;
        cct = CarbonCreditToken(_cct);
        ccm_addr = _ccm;
    }

    function exists() public view returns (bool) {
        return itmo_amt > 0;
    }

    function getAmount() public view returns (uint) {
        return itmo_amt;
    }

    function price() public view returns (uint) {
        return _deposit;
    }

    function getSeller() public view returns (address) {
        return seller;
    }

    function accept() public {
        require(seller == address(0)); // require that no one accepted the contract yet
        seller = msg.sender;
    }

    // this function can only be called by the CarbonCreditMarket smart contract
    // after funds have been sent correctly. Then the account can be unlocked
    function unlock() onlyCCM external {
        locked = false;
    }

    function withdraw() external {
        require(locked == false);
        // TODO: call CarbonCreditToken API to transfer funds from escrow to msg.sender balance
        cct.transferEscrow(address(this), tx.origin, _deposit);
    }

    // deposit sets the price to however much is deposited
    function deposit(uint _price) external {
        bool success = cct.transfer(address(this), _price);
        if (!success) {
            revert("failed to transfer");
        }
        _deposit = _price;
    }

    function close() public {
        cct.deleteEscrow(address(this));
    }

}