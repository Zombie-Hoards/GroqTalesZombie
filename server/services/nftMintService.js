/**
 * ETH Mainnet NFT Mint Service
 * Uses the Alchemy client provider and backend signer to mint NFTs on Ethereum mainnet.
 */

const { ethers } = require('ethers');
const logger = require('../utils/logger');
const { provider } = require('./alchemyMainnetClient');

const NFT_CONTRACT_ADDRESS = process.env.ETH_MAINNET_NFT_CONTRACT_ADDRESS;
const SIGNER_PRIVATE_KEY = process.env.ETH_MAINNET_SIGNER_PRIVATE_KEY;

// Minimal ABI for minting standard ERC721
const MINIMAL_ERC721_ABI = [
    "function safeMint(address to, string memory uri) public returns (uint256)",
    // Generic fallback if mint signature varies, customize based on the actual contract
    "function mint(address to, string memory uri) public returns (uint256)",
];

/**
 * Mints an NFT to the specified address on Ethereum mainnet.
 * @param {string} toAddress The recipient EVM address.
 * @param {string} tokenUri The IPFS URI or metadata URI.
 * @returns {Promise<{txHash: string, status: string}>}
 */
const mintStoryNft = async (toAddress, tokenUri) => {
    if (!provider) {
        throw new Error('Alchemy Mainnet Provider is not configured. Cannot mint.');
    }
    if (!SIGNER_PRIVATE_KEY || !ethers.isAddress(NFT_CONTRACT_ADDRESS)) {
        throw new Error('NFT contract address or signer private key missing/invalid.');
    }
    if (!ethers.isAddress(toAddress)) {
        throw new Error('Invalid recipient address.');
    }

    try {
        const signer = new ethers.Wallet(SIGNER_PRIVATE_KEY, provider);
        const contract = new ethers.Contract(NFT_CONTRACT_ADDRESS, MINIMAL_ERC721_ABI, signer);

        logger.info(`Minting ETH mainnet NFT to ${toAddress} with URI ${tokenUri}...`);

        // We assume the contract has a `mint` or `safeMint` function.
        // Replace `safeMint` with the actual contract function name.

        // Estimate gas (optional but recommended for reliability)
        const gasEstimate = await contract.mint.estimateGas(toAddress, tokenUri);
        // Add 20% buffer to gas estimate
        const gasLimit = (gasEstimate * 120n) / 100n;

        // Send transaction
        const tx = await contract.mint(toAddress, tokenUri, { gasLimit });

        logger.info(`Mint tx submitted: ${tx.hash}. Waiting for confirmation...`);

        // Wait for 1 confirmation
        const receipt = await tx.wait(1);

        return {
            txHash: receipt.hash,
            status: 'confirmed',
            // The tokenId depends on the contract return/events, usually parsed from Transfer event
            // If we need tokenId immediately, we must parse the receipt logs.
        };

    } catch (error) {
        logger.error('Error minting ETH mainnet NFT:', error);
        if (error.code === 'INSUFFICIENT_FUNDS') {
            throw new Error('Backend signer wallet has insufficient funds for gas.');
        }
        throw new Error(`Minting failed: ${error.reason || error.message}`);
    }
};

module.exports = {
    mintStoryNft
};
