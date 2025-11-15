const { ethers } = require("hardhat");

async function main() {
  const Voting = await ethers.getContractFactory("Voting");
  console.log("⏳ Deploying Voting contract...");

  // Pass your candidate names here
  const voting = await Voting.deploy(["Alice", "Bob", "Charlie"]);
  await voting.waitForDeployment();

  console.log("✅ Voting contract deployed at:", await voting.getAddress());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error during deployment:", error);
    process.exit(1);
  });
