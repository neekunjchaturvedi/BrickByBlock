const hre = require("hardhat");

async function main() {
  console.log("Deploying contracts...");

  // Deploy the NFT Contract
  const nftContract = await hre.ethers.deployContract("BrickByBlockMasterNFT");
  await nftContract.waitForDeployment(); // Waits for the contract to be mined
  const nftContractAddress = await nftContract.getAddress();
  console.log(`✅ NFT Contract deployed to: ${nftContractAddress}`);

  // Deploy the Marketplace Contract, passing the NFT contract's address
  const marketplaceContract = await hre.ethers.deployContract(
    "BrickByBlockMarketplace",
    [nftContractAddress]
  );
  await marketplaceContract.waitForDeployment();
  const marketplaceContractAddress = await marketplaceContract.getAddress();
  console.log(
    `✅ Marketplace Contract deployed to: ${marketplaceContractAddress}`
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
