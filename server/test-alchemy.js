require('dotenv').config();

const {
    getEthBalance,
    getErc20Balances,
    getNftsByOwner,
    getTransactions
} = require('./services/alchemyMainnetClient');

const { mintStoryNft } = require('./services/nftMintService');

async function runTests() {
    console.log('--- Testing Alchemy ETH Mainnet Client ---');

    // Skip actual tests if environment variables are not set
    if (!process.env.ALCHEMY_ETH_MAINNET_RPC_URL) {
        console.warn('⚠️ ALCHEMY_ETH_MAINNET_RPC_URL is not set. Skipping tests.');
        return;
    }

    // Basic address for testing read methods (Vitalik)
    const TEST_ADDRESS = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';

    try {
        console.log(`\n1. Fetching ETH Balance for \${TEST_ADDRESS}...`);
        const balance = await getEthBalance(TEST_ADDRESS);
        console.log(`ETH Balance: \${balance}`);

        console.log(`\n2. Fetching ERC-20 Balances...`);
        const erc20 = await getErc20Balances(TEST_ADDRESS);
        console.log(`Found \${erc20.length} standard token balances (limited output)`);

        console.log(`\n3. Fetching NFTs...`);
        const nfts = await getNftsByOwner(TEST_ADDRESS);
        console.log(`Found \${nfts.totalCount} total NFTs`);

        console.log(`\n4. Fetching Recent Transactions...`);
        const txs = await getTransactions(TEST_ADDRESS, { maxCount: 2 });
        console.log(`Fetched \${txs.transfers?.length || 0} recent transfers`);

        console.log('\n--- Testing NFT Mint Service ---');
        if (!process.env.ETH_MAINNET_SIGNER_PRIVATE_KEY) {
            console.warn('⚠️ ETH_MAINNET_SIGNER_PRIVATE_KEY is not set. Skipping mint test.');
        } else {
            console.log('Skipping real mint transaction to avoid spending mainnet ETH in automated tests, but service is validly loaded!');
            console.log('Mint function type:', typeof mintStoryNft);
        }

        console.log('\n✅ All tests completed successfully!');
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        process.exit(1);
    }
}

runTests();
