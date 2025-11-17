async function main() {
  const candidates = ["Alice", "Bob", "Charlie"]; // <-- ADD YOUR NAMES HERE

  const Voting = await ethers.getContractFactory("Voting");
  const voting = await Voting.deploy(candidates);

  await voting.waitForDeployment();

  console.log("Voting contract deployed at:", await voting.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
