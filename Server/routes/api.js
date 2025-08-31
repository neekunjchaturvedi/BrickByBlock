// routes/api.js

const express = require("express");
const multer = require("multer");
const { ethers, JsonRpcProvider } = require("ethers");
const pinataSDK = require("@pinata/sdk");
const fetch = require("node-fetch");
const authMiddleware = require("../middleware/authMiddleware");

const nftContractABI = require("../abi/MasterNFT.json").abi;
const marketplaceContractABI = require("../abi/MarketPlace.json").abi;

const router = express.Router();
// ... (Your full configuration code for Pinata, Ethers, Contracts etc. remains here)
const upload = multer({ storage: multer.memoryStorage() });
const pinata = new pinataSDK({ pinataJWTKey: process.env.PINATA_JWT });
const provider = new JsonRpcProvider(process.env.AVALANCHE_FUJI_RPC_URL);
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

const fetchMetadata = async (tokenURI) => {
  const metadataUrl = tokenURI.replace("ipfs://", ipfsGateway);
  const metadataResponse = await fetch(metadataUrl);
  const metadata = await metadataResponse.json();
  metadata.image = metadata.image.replace("ipfs://", ipfsGateway);
  return metadata;
};

// --- PUBLIC ASSET ROUTES ---
router.get("/", async (req, res) => {
  /* ... Get All Assets logic ... */
  try {
    const latestBlock = await provider.getBlockNumber();
    const eventFilter = nftContract.filters.AssetMinted();
    const chunkSize = 2048; // The max block range allowed by the public RPC
    let allLogs = [];

    console.log(`Scanning for events up to block ${latestBlock}...`);

    // Loop through blocks in chunks to avoid overwhelming the RPC node
    for (let i = 0; i <= latestBlock; i += chunkSize) {
      const fromBlock = i;
      const toBlock = Math.min(i + chunkSize - 1, latestBlock);

      const logs = await nftContract.queryFilter(
        eventFilter,
        fromBlock,
        toBlock
      );
      allLogs = allLogs.concat(logs);
    }
    if (allLogs.length === 0) {
      return res.status(200).json([]);
    }

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

router.get("/:tokenId/bids", async (req, res) => {
  try {
    const { tokenId } = req.params;
    const bids = await marketplaceContract.bidsForAsset(tokenId);

    const formattedBids = bids.map((bid) => ({
      bidder: bid.bidder,
      amount: ethers.utils.formatEther(bid.amount),
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

// --- PROTECTED ASSET ROUTES ---
router.post(
  "/mint-request",
  authMiddleware,
  upload.single("file"),
  async (req, res) => {
    const ownerAddress = req.user.address;
    const { name, description } = req.body;
    const imageFile = req.file;

    if (!imageFile || !name || !description) {
      return res.status(400).json({ error: "Missing required fields." });
    }

    try {
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

router.post("/list-request", authMiddleware, async (req, res) => {
  try {
    const { tokenId } = req.body;
    const sellerAddress = req.user.address;

    const approveTx = await nftContract.populateTransaction.approve(
      process.env.MARKETPLACE_CONTRACT_ADDRESS,
      tokenId
    );
    approveTx.from = sellerAddress;

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

module.exports = router;
