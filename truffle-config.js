require('babel-register');
require('babel-polyfill');
require('dotenv').config();
const HDWalletProvider = require('@truffle/hdwallet-provider');
const privateKeys = process.env.PRIVATE_KEYS || ""

module.exports = {
  networks: {
    development: {
      host: "127.0.0.1",
      port: 4444,  // RSK node RPC port
      network_id: "*"
    },
    rsktestnet: {
      provider: () => new HDWalletProvider(process.env.PRIVATE_KEYS.split(','), `https://public-node.testnet.rsk.co`),
      network_id: 31,
      gas: 6800000,
      gasPrice: 20000000000, // 20 gwei
    },
    rskmainnet: {
      provider: () => new HDWalletProvider(process.env.PRIVATE_KEYS.split(','), `https://public-node.rsk.co`),
      network_id: 30,
      gas: 6800000,
      gasPrice: 20000000000, // 20 gwei
    }
  },
  contracts_directory: './src/contracts/',
  contracts_build_directory: './src/abis/',
  compilers: {
    solc: {
      version: "0.5.2",
    }
  }
}
