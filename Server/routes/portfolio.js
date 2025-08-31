// routes/portfolio.js

const express = require("express");
const { ethers, JsonRpcProvider } = require("ethers");
const fetch = require("node-fetch");
const authMiddleware = require("../middleware/authMiddleware");

const nftContractABI = require("../abi/MasterNFT.json").abi;
const router = express.Router();

// --- CONFIGURATION ---
const provider = new JsonRpcProvider(process.env.AVALANCHE_FUJI_RPC_URL);
const nftContract = new ethers.Contract(
  process.env.NFT_CONTRACT_ADDRESS,
  nftContractABI,
  provider
);
const ipfsGateway =
  "https://beige-impressive-caterpillar-396.mypinata.cloud/ipfs/";

// --- HELPER FUNCTION ---
const fetchMetadata = async (tokenURI) => {
  const metadataUrl = tokenURI.replace("ipfs://", ipfsGateway);
  const metadataResponse = await fetch(metadataUrl);
  const metadata = await metadataResponse.json();
  metadata.image = metadata.image.replace("ipfs://", ipfsGateway);
  return metadata;
};

/**
 * @route   GET /api/portfolio/owned
 * @desc    Gets all assets owned by the authenticated user.
 */
router.get("/owned", authMiddleware, async (req, res) => {
  try {
    const ownerAddress = req.user.address;
    const balance = await nftContract.balanceOf(ownerAddress);

    const assets = await Promise.all(
      Array.from({ length: Number(balance) }).map(async (_, i) => {
        const tokenId = await nftContract.tokenOfOwnerByIndex(ownerAddress, i);
        const tokenURI = await nftContract.tokenURI(tokenId);
        const metadata = await fetchMetadata(tokenURI);
        return {
          tokenId: tokenId.toString(),
          owner: ownerAddress,
          name: metadata.name,
          description: metadata.description,
          image: metadata.image,
        };
      })
    );
    res.status(200).json(assets.reverse());
  } catch (error) {
    console.error("Error in /portfolio:", error);
    res.status(500).json({ error: "Server error while fetching portfolio." });
  }
});

module.exports = router;
