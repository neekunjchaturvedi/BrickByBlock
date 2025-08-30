// routes/auth.js
const express = require("express");
const { ethers } = require("ethers");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");

const router = express.Router();

// A simple in-memory store for nonces. In production, use a database like Redis.
const userNonces = {};

/**
 * @route   POST /api/auth/request-message
 * @desc    Requests a unique message for a user to sign.
 */
router.post("/request-message", (req, res) => {
  try {
    const { walletAddress } = req.body;
    if (!walletAddress) {
      return res.status(400).json({ error: "walletAddress is required." });
    }

    // Generate a new random nonce
    const nonce = crypto.randomBytes(32).toString("hex");
    // Store the nonce for the user
    userNonces[walletAddress.toLowerCase()] = nonce;

    // Create the message for the user to sign
    const message = `Welcome to BrickByBlock!\n\nPlease sign this message to authenticate.\n\nNonce: ${nonce}`;

    res.status(200).json({ message });
  } catch (error) {
    console.error("Error requesting message:", error);
    res.status(500).json({ error: "Server error." });
  }
});

/**
 * @route   POST /api/auth/verify
 * @desc    Verifies a signed message and returns a JWT.
 */
router.post("/verify", async (req, res) => {
  try {
    const { walletAddress, signature } = req.body;
    const lowerCaseAddress = walletAddress.toLowerCase();

    // 1. Get the original message/nonce we stored for this user
    const originalNonce = userNonces[lowerCaseAddress];
    if (!originalNonce) {
      return res
        .status(400)
        .json({ error: "No pending auth request, or session expired." });
    }
    const originalMessage = `Welcome to BrickByBlock!\n\nPlease sign this message to authenticate.\n\nNonce: ${originalNonce}`;

    // 2. Use ethers to verify the signature
    const recoveredAddress = ethers.utils.verifyMessage(
      originalMessage,
      signature
    );

    // 3. Check if the recovered address matches the user's address
    if (recoveredAddress.toLowerCase() === lowerCaseAddress) {
      // Signature is valid!
      // Invalidate the nonce so it can't be used again
      delete userNonces[lowerCaseAddress];

      // 4. Create a JWT for the user session
      const token = jwt.sign(
        { address: lowerCaseAddress },
        process.env.JWT_SECRET, // Add a JWT_SECRET to your .env file!
        { expiresIn: "1d" } // Token expires in 1 day
      );

      res.status(200).json({ token });
    } else {
      // Signature is invalid
      res.status(401).json({ error: "Signature verification failed." });
    }
  } catch (error) {
    console.error("Error verifying signature:", error);
    res.status(500).json({ error: "Server error." });
  }
});

module.exports = router;
