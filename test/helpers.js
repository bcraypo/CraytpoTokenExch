const should = require('chai').should();

function checkEvent(log, eventName, expectedArgs) {
  log.event.should.eq(eventName);
  const event = log.args;
  
  for (const [key, value] of Object.entries(expectedArgs)) {
    if (key === 'timestamp') {
      event[key].toString().length.should.be.at.least(1, `${key} is correct`);
    } else if (key.substring(0, 4) === 'user' || key.substring(0, 5) === 'token') {
      event[key].should.equal(value, `${key} is correct`);
    } else {
      event[key].toString().should.equal(value.toString(), `${key} is correct`);
    }
  }
}

const EVM_REVERT = 'VM Exception while processing transaction: revert';
const ETH_ADDRESS = '0x0000000000000000000000000000000000000000';

const ether = (n) => {
  return new web3.utils.BN(
    web3.utils.toWei(n.toString(), 'ether')
  );
};

const tokens = (n) => ether(n)

const wait = (seconds) => {
  const milliseconds = seconds * 1000
  return new Promise((resolve) => setTimeout(resolve, milliseconds))
}

module.exports = {
  checkEvent,
  EVM_REVERT,
  ETH_ADDRESS,
  tokens,
  ether,
  wait
};