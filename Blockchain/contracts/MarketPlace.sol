// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";


contract BrickByBlockMarketplace is ReentrancyGuard {
    IERC721 public immutable nftContract;

    struct Bid {
        address bidder;
        uint256 amount;
    }

    mapping(uint256 => Bid[]) public bidsForAsset;
    mapping(uint256 => address) public assetSeller;
    mapping(address => uint256) public pendingRefunds;

    event AssetListed(uint256 indexed tokenId, address indexed seller);
    event BidAccepted(uint256 indexed tokenId, address indexed seller, address indexed buyer, uint256 amount);
    event RefundAvailable(address indexed bidder, uint256 amount);

    constructor(address _nftContractAddress) {
        nftContract = IERC721(_nftContractAddress);
    }

    function listAsset(uint256 tokenId) external {
        require(nftContract.ownerOf(tokenId) == msg.sender, "Not asset owner");
        require(
            nftContract.getApproved(tokenId) == address(this) ||
            nftContract.isApprovedForAll(msg.sender, address(this)),
            "Marketplace not approved"
        );
        require(assetSeller[tokenId] == address(0), "Already listed");

        assetSeller[tokenId] = msg.sender;
        emit AssetListed(tokenId, msg.sender);
    }

    function makeBid(uint256 tokenId) external payable {
        require(assetSeller[tokenId] != address(0), "Not listed");
        require(msg.value > 0, "Invalid bid");

        bidsForAsset[tokenId].push(Bid(msg.sender, msg.value));
    }

    function acceptBid(uint256 tokenId, address buyerAddress) external nonReentrant {
        address seller = assetSeller[tokenId];
        require(msg.sender == seller, "Not seller");

        Bid[] storage bids = bidsForAsset[tokenId];
        uint256 bidAmount = 0;
        uint256 bidIndex = 0;

        for (uint256 i = 0; i < bids.length; i++) {
            if (bids[i].bidder == buyerAddress) {
                bidAmount = bids[i].amount;
                bidIndex = i;
                break;
            }
        }
        require(bidAmount > 0, "No bid found");

        delete assetSeller[tokenId];

        // Transfer NFT to buyer
        nftContract.safeTransferFrom(seller, buyerAddress, tokenId);

        // Pay seller
        (bool success, ) = payable(seller).call{value: bidAmount}("");
        require(success, "Payment failed");

        emit BidAccepted(tokenId, seller, buyerAddress, bidAmount);

        // Store refunds for losers instead of sending in-loop
        for (uint256 i = 0; i < bids.length; i++) {
            if (i != bidIndex) {
                pendingRefunds[bids[i].bidder] += bids[i].amount;
                emit RefundAvailable(bids[i].bidder, bids[i].amount);
            }
        }

        delete bidsForAsset[tokenId];
    }

    function withdrawRefund() external nonReentrant {
        uint256 refund = pendingRefunds[msg.sender];
        require(refund > 0, "No refund available");

        pendingRefunds[msg.sender] = 0;
        (bool success, ) = payable(msg.sender).call{value: refund}("");
        require(success, "Refund failed");
    }
}
