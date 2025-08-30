// routes/api.js

// Import required packages
const express = require("express");
const multer = require("multer");
const { ethers } = require("ethers");
const pinataSDK = require("@pinata/sdk");
const fetch = require("node-fetch"); // You might need to install this: npm install node-fetch

// Import your contract ABIs and middleware
const nftContractABI = require("../abi/MasterNFT.json").abi;
const marketplaceContractABI = require("../abi/MarketPlace.json").abi;
const authMiddleware = require("../middleware/authMiddleware");

// Initialize the router
const router = express.Router();

// --- CONFIGURATION ---
const upload = multer({ storage: multer.memoryStorage() });
const pinata = new pinataSDK({ pinataJWTKey: process.env.PINATA_JWT });
const provider = new ethers.providers.JsonRpcProvider(
  process.env.AVALANCHE_FUJI_RPC_URL
);
const nftContract = new ethers.Contract(
  process.env.NFT_CONTRACT_ADDRESS,
  nftContractABI,
  provider
);
const marketplaceContract = new ethers.Contract(
  process.env.MARKETPLACE_CONTRACT_ADDRESS,
  marketplaceContractABI,
  provider
);

const ipfsGateway = "https://gateway.pinata.cloud/ipfs/";

// --- HELPER FUNCTION ---
// A helper to fetch and combine metadata for a given token URI
const fetchMetadata = async (tokenURI) => {
  const metadataUrl = tokenURI.replace("ipfs://", ipfsGateway);
  const metadataResponse = await fetch(metadataUrl);
  const metadata = await metadataResponse.json();
  metadata.image = metadata.image.replace("ipfs://", ipfsGateway);
  return metadata;
};

// --- PUBLIC ROUTES (No Auth Required) ---

/**
 * @route   GET /api/assets
 * @desc    Retrieves all assets from the blockchain and their metadata from IPFS.
 */
router.get("/", async (req, res) => {
  try {
    const eventFilter = nftContract.filters.AssetMinted();
    const logs = await nftContract.queryFilter(eventFilter, 0, "latest");

    const assets = await Promise.all(
      logs.map(async (log) => {
        const { tokenId, owner, tokenURI } = log.args;
        const metadata = await fetchMetadata(tokenURI);
        return {
          tokenId: tokenId.toString(),
          owner,
          name: metadata.name,
          description: metadata.description,
          image: metadata.image,
        };
      })
    );

    res.status(200).json(assets.reverse());
  } catch (error) {
    console.error("Error fetching assets:", error);
    res.status(500).json({ error: "Server error while fetching assets." });
  }
});

/**
 * @route   GET /api/assets/:tokenId
 * @desc    Retrieves detailed information for one specific asset.
 */
router.get("/:tokenId", async (req, res) => {
  try {
    const { tokenId } = req.params;
    const [owner, tokenURI] = await Promise.all([
      nftContract.ownerOf(tokenId),
      nftContract.tokenURI(tokenId),
    ]);
    const metadata = await fetchMetadata(tokenURI);

    res.status(200).json({
      tokenId,
      owner,
      name: metadata.name,
      description: metadata.description,
      image: metadata.image,
    });
  } catch (error) {
    console.error(`Error fetching asset ${req.params.tokenId}:`, error);
    res.status(500).json({ error: "Could not fetch asset details." });
  }
});

/**
 * @route   GET /api/assets/:tokenId/bids
 * @desc    Retrieves all active bids for a specific asset.
 */
router.get("/:tokenId/bids", async (req, res) => {
  try {
    const { tokenId } = req.params;
    const bids = await marketplaceContract.bidsForAsset(tokenId);

    const formattedBids = bids.map((bid) => ({
      bidder: bid.bidder,
      amount: ethers.utils.formatEther(bid.amount), // Convert from Wei to AVAX string
    }));

    res.status(200).json(formattedBids);
  } catch (error) {
    console.error(
      `Error fetching bids for asset ${req.params.tokenId}:`,
      error
    );
    res.status(500).json({ error: "Could not fetch bids." });
  }
});

// --- PROTECTED ROUTES (Authentication Required) ---

/**
 * @route   POST /api/assets/mint-request
 * @desc    Handles asset upload and creates an unsigned mint transaction.
 */
router.post(
  "/mint-request",
  authMiddleware,
  upload.single("file"),
  async (req, res) => {
    try {
      const ownerAddress = req.user.address; // Get owner from JWT
      const { name, description } = req.body;
      const imageFile = req.file;

      if (!imageFile || !name || !description) {
        return res.status(400).json({ error: "Missing required fields." });
      }

      const imageResult = await pinata.pinFileToIPFS(imageFile.stream, {
        pinataMetadata: { name: `Asset_${name}` },
      });
      const imageUrl = `ipfs://${imageResult.IpfsHash}`;

      const metadata = { name, description, image: imageUrl };
      const metadataResult = await pinata.pinJSONToIPFS(metadata, {
        pinataMetadata: { name: `Metadata_${name}` },
      });
      const tokenURI = `ipfs://${metadataResult.IpfsHash}`;

      const unsignedTx = await nftContract.populateTransaction.mintAsset(
        ownerAddress,
        tokenURI
      );

      res.status(200).json({ unsignedTx });
    } catch (error) {
      console.error("Error in /mint-request:", error);
      res.status(500).json({ error: "Server error during mint request." });
    }
  }
);

/**
 * @route   POST /api/assets/list-request
 * @desc    Creates the two unsigned transactions needed to list an asset for sale.
 */
router.post("/list-request", authMiddleware, async (req, res) => {
  try {
    const { tokenId } = req.body;
    const sellerAddress = req.user.address;

    // 1. Create the 'approve' transaction for the NFT contract
    const approveTx = await nftContract.populateTransaction.approve(
      process.env.MARKETPLACE_CONTRACT_ADDRESS,
      tokenId
    );
    approveTx.from = sellerAddress;

    // 2. Create the 'listAsset' transaction for the Marketplace contract
    const listTx = await marketplaceContract.populateTransaction.listAsset(
      tokenId
    );
    listTx.from = sellerAddress;

    res.status(200).json({ approveTx, listTx });
  } catch (error) {
    console.error("Error in /list-request:", error);
    res.status(500).json({ error: "Server error during list request." });
  }
});

/**
 * @route   POST /api/assets/create-bid-transaction
 * @desc    Creates an unsigned 'makeBid' transaction.
 */
router.post("/create-bid-transaction", authMiddleware, async (req, res) => {
  try {
    const { tokenId, bidAmount } = req.body;
    const bidderAddress = req.user.address;

    const unsignedTx = await marketplaceContract.populateTransaction.makeBid(
      tokenId,
      {
        from: bidderAddress,
        value: ethers.utils.parseEther(bidAmount),
      }
    );

    res.status(200).json({ unsignedTx });
  } catch (error) {
    console.error("Error in /create-bid-transaction:", error);
    res.status(500).json({ error: "Server error during bid creation." });
  }
});

/**
 * @route   POST /api/assets/accept-bid
 * @desc    Creates an unsigned transaction for a seller to accept a bid.
 */
router.post("/accept-bid", authMiddleware, async (req, res) => {
  try {
    const { tokenId, buyerAddress } = req.body;
    const sellerAddress = req.user.address;

    const unsignedTx = await marketplaceContract.populateTransaction.acceptBid(
      tokenId,
      buyerAddress
    );
    unsignedTx.from = sellerAddress;

    res.status(200).json({ unsignedTx });
  } catch (error) {
    console.error("Error in /accept-bid:", error);
    res.status(500).json({ error: "Server error during bid acceptance." });
  }
});

/**
 * @route   GET /api/portfolio
 * @desc    Gets all assets owned by the authenticated user.
 */
router.get("/portfolio/owned", authMiddleware, async (req, res) => {
  try {
    const ownerAddress = req.user.address;
    const balance = await nftContract.balanceOf(ownerAddress);

    const assets = await Promise.all(
      Array.from({ length: balance.toNumber() }).map(async (_, i) => {
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

// Export the router to be used in index.js
module.exports = router;
