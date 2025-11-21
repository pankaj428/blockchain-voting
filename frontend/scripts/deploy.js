const { ethers } = require("hardhat");

async function main() {
  const candidates = ["Alice", "Bob"];

  // ⭐ This must be your MinimalForwarder address deployed on Sepolia
  const trustedForwarder = "0xYOUR_FORWARDER_ADDRESS";

  const Voting = await ethers.getContractFactory("Voting");
  const voting = await Voting.deploy(trustedForwarder, candidates);

  await voting.waitForDeployment();

  console.log("Voting deployed at:", await voting.getAddress());
}

main().catch(console.error);
