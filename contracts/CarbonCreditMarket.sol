// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.9.0;

import "./CarbonCreditToken.sol";

contract CarbonCredit {

  address public minter;
  uint totalCredits;
  uint year;

  address[] participants;

  mapping (address => uint) public ndcs;
  mapping (address => uint) public balances; // ITMO balances for each entity
  mapping (address => Escrow) public bids;

  event Sent(address from, address to, uint amount);
  error InsufficientBalance(uint requested, uint available);
  error UnknownAddress(address addr);

  constructor() {
    minter = msg.sender;
    // participants.push(msg.sender);
    year = 2022;
  }

  function isParticipant(address addr) private view returns (bool) {
    for (uint i = 0; i < participants.length; i++) {
      if (participants[i] == addr) {
        return true;
      }
    }
    return false;
  }

  function join(address _cct) public {
    if (!isParticipant(msg.sender)) {
      participants.push(msg.sender);
      bids[msg.sender] = new Escrow(msg.sender, _cct, address(this), 0);
    }
  }

  function getYear() public view returns (uint) {
    return year;
  }

  function getBalance(address addr) public view returns (uint) {
    return balances[addr];
  }

  function getTargetNDC(address addr) public view returns (uint) {
    return ndcs[addr];
  }

  function setTargetNDC(uint amount) public { // only the tx sender can set their NDC
    if (!isParticipant(msg.sender)) {
      revert UnknownAddress(msg.sender);
    }
    ndcs[msg.sender] = amount;
  }

  function issue(address receiver, uint amount) public {
    if (!isParticipant(receiver)) {
      revert UnknownAddress(receiver);
    }
    require(msg.sender == minter); // only the smart contract minter can issue ITMOs

    // TODO: query Chainlink oracle to verify mitigation claims

    balances[receiver] += amount;
    totalCredits += amount;
  }

  function getBid(address addr) public view returns (uint256, uint256, address) {
    if (!isParticipant(addr)) {
      revert UnknownAddress(addr);
    }
    uint size = bids[addr].getAmount();
    uint price = bids[addr].price();
    address seller = bids[addr].getSeller();
    return (size, price, seller);
  }

  function requestToBuy(address _cct, uint amount, uint price) public returns (address) {
    if (!isParticipant(msg.sender)) {
      revert UnknownAddress(msg.sender);
    }
    if (bids[msg.sender].exists()) {
      return address(bids[msg.sender]);
    }

    Escrow esc = new Escrow(msg.sender, _cct, address(this), amount);
    esc.deposit(price);
    bids[msg.sender] = esc; // store request to buy ITMOs
    return address(esc);
  }

  function fillRequest(address receiver) public {
    if (!isParticipant(msg.sender)) { 
      revert UnknownAddress(msg.sender);
    }
    if (!isParticipant(receiver)) { 
      revert UnknownAddress(receiver);
    }
    bids[receiver].accept();

    uint amount = bids[receiver].getAmount();
    if (amount > balances[msg.sender]) {
      revert InsufficientBalance(amount, balances[msg.sender]);
    }

    balances[msg.sender] -= amount;
    balances[receiver] += amount;
    emit Sent(msg.sender, receiver, amount);    

    bids[receiver].unlock();
    bids[receiver].withdraw();
    bids[receiver].close();
    delete bids[receiver];
  }

  function sendCredits(address receiver, uint amount) public {
    if (amount > balances[msg.sender]) {
      revert InsufficientBalance(amount, balances[msg.sender]);
    }

    balances[msg.sender] -= amount;
    balances[receiver] += amount;
    emit Sent(msg.sender, receiver, amount);
  }


  function consume(address consumer, uint amount) public {
    // consume() can only be called by the owner of the used credits
    // or the organization managing the carbon credit contract
    require(msg.sender == consumer || msg.sender == minter);
    if (amount > balances[consumer]) {
      revert InsufficientBalance(amount, balances[consumer]);
    }
    balances[consumer] -= amount;
  }
}
