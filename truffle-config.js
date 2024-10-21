require('babel-register');
require('babel-polyfill');
require('dotenv').config();
const HDWalletProvider = require('truffle-hdwallet-provider-privkey');
const privateKeys = process.env.PRIVATE_KEYS || ""

module.exports = {
  networks: {
    development: {
      host: "127.0.0.1",
      port: 7545,
      network_id: "*",
    },
    sepolia: {
      provider: function() {
        return new HDWalletProvider(
          privateKeys.split(','),
          `https://eth-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`
        )
      },
      gas: 3000000, // Reduced from 4,000,000 to 3,000,000
      gasPrice: 1000000000, // Reduced from 2 Gwei to 1 Gwei
      network_id: 11155111,
      skipDryRun: true // Add this line to skip the dry run
    }
  },
  contracts_directory: './src/contracts/',
  contracts_build_directory: './src/abis/',
  compilers: {
    solc: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  }
}
