require("@nomicfoundation/hardhat-toolbox");

module.exports = {
  solidity: "0.8.21",
  networks: {
    sepolia: {
      url: "https://sepolia.infura.io/v3/87380f52222d45118c592aba76720205",
   // FREE PUBLIC RPC
      accounts: ["0x7cd9f3af6b382114911bd6914a4865404d78d9047281d4d809d025df0b714d46"]  // replace with your real private key
    }
  }
};
