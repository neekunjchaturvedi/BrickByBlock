const dotenv = require("dotenv");
dotenv.config();
const express = require("express");
const multer = require("multer");
const { ethers, JsonRpcProvider } = require("ethers");
const pinataSDK = require("@pinata/sdk");
const fetch = require("node-fetch");
const authMiddleware = require("../middleware/authMiddleware");

const marketplaceContractABI = require("../abi/MarketPlace.json").abi;

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

const pinata = new pinataSDK(
  process.env.PINATA_API_KEY,
  process.env.PINATA_API_SECRET
);

const provider = new JsonRpcProvider(process.env.AVALANCHE_FUJI_RPC_URL);
const nftArtifact = require("../abi/MasterNFT.json").abi;
const nftContract = new ethers.Contract(
  process.env.NFT_CONTRACT_ADDRESS,
  nftArtifact,
  provider
);
const marketplaceContract = new ethers.Contract(
  process.env.MARKETPLACE_CONTRACT_ADDRESS,
  marketplaceContractABI,
  provider
);

const { Readable } = require("stream");

function bufferToStream(buffer) {
  const readable = new Readable();
  readable.push(buffer);
  readable.push(null);
  return readable;
}

const ipfsGateway =
  "https://beige-impressive-caterpillar-396.mypinata.cloud/ipfs/";

const fetchMetadata = async (tokenURI) => {
  const metadataUrl = tokenURI.replace("ipfs://", ipfsGateway);
  const metadataResponse = await fetch(metadataUrl);
  const metadata = await metadataResponse.json();
  metadata.image = metadata.image.replace("ipfs://", ipfsGateway);
  return metadata;
};

// --- PUBLIC ASSET ROUTES ---
router.get("/", async (req, res) => {
  try {
    // Get all pinned files from Pinata
    const pinnedFiles = await pinata.pinList({
      status: "pinned",
      pageLimit: 1000,
    });

    // Filter for metadata files (assuming they have "Metadata_" prefix)
    const metadataFiles = pinnedFiles.rows.filter(
      (file) =>
        file.metadata &&
        file.metadata.name &&
        file.metadata.name.startsWith("Metadata_")
    );

    const assets = [];

    // Fetch each metadata file
    for (const file of metadataFiles) {
      try {
        const metadataUrl = `${ipfsGateway}${file.ipfs_pin_hash}`;
        const response = await fetch(metadataUrl);
        const metadata = await response.json();

        // Convert IPFS URLs to gateway URLs
        if (metadata.image) {
          metadata.image = metadata.image.replace("ipfs://", ipfsGateway);
        }

        assets.push({
          ipfsHash: file.ipfs_pin_hash,
          name: metadata.name,
          description: metadata.description,
          image: metadata.image,
          pinDate: file.date_pinned,
          size: file.size,
          price: metadata.price || "N/A",
          owner: metadata.owner || "N/A",
        });
      } catch (error) {
        console.error(
          `Error fetching metadata for ${file.ipfs_pin_hash}:`,
          error
        );
      }
    }

    res.json({
      success: true,
      data: assets,
      totalFound: assets.length,
    });
  } catch (err) {
    console.error("Error fetching assets from IPFS:", err);
    res.status(500).json({ success: false, error: err.message });
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
    const { name, description, price, owner } = req.body;
    const imageFile = req.file;

    if (!imageFile || !name || !description || !price) {
      return res.status(400).json({ error: "Missing required fields." });
    }

    try {
      const stream = bufferToStream(imageFile.buffer);
      const imageResult = await pinata.pinFileToIPFS(stream, {
        pinataMetadata: { name: `Asset_${name}` },
      });
      const imageUrl = `ipfs://${imageResult.IpfsHash}`;
      console.log(imageUrl);

      const metadata = { name, description, image: imageUrl, price, owner };
      const metadataResult = await pinata.pinJSONToIPFS(metadata, {
        pinataMetadata: { name: `Metadata_${name}` },
      });
      const tokenURI = `ipfs://${metadataResult.IpfsHash}`;

      const unsignedTx = await nftContract.mintAsset.populateTransaction(
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
