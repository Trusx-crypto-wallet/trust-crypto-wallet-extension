/**
 * Multi-Token Trusted Remotes Setup Script
 * Configures LayerZero V1 trusted remote addresses for CrossChain token contracts
 * across all supported mainnet chains to enable secure cross-chain communication.
 * 
 * Supports all CrossChain tokens: USDT, USDC, DAI, WBTC, WETH, ETH, BNB, MATIC, ARB, OP, AVAX, UNI, AAVE
 * 
 * Usage:
 * node scripts/setupTrustedRemotes.js --token USDT
 * node scripts/setupTrustedRemotes.js --token USDC
 * node scripts/setupTrustedRemotes.js --token ALL
 */

const { ethers } = require('hardhat');
const { bridgeConfig, LAYERZERO_V1_ENDPOINT_IDS, CHAIN_IDS } = require('../config/bridgeConfig.js');

// All supported CrossChain token contract addresses (update after deployment)
const CROSSCHAIN_TOKEN_ADDRESSES = {
    USDT: {
        [CHAIN_IDS.ETHEREUM]: '', // Update with deployed CrossChainUSDT address
        [CHAIN_IDS.BSC]: '',
        [CHAIN_IDS.POLYGON]: '',
        [CHAIN_IDS.ARBITRUM]: '',
        [CHAIN_IDS.OPTIMISM]: '',
        [CHAIN_IDS.AVALANCHE]: ''
    },
    USDC: {
        [CHAIN_IDS.ETHEREUM]: '', // Update with deployed CrossChainUSDC address
        [CHAIN_IDS.BSC]: '',
        [CHAIN_IDS.POLYGON]: '',
        [CHAIN_IDS.ARBITRUM]: '',
        [CHAIN_IDS.OPTIMISM]: '',
        [CHAIN_IDS.AVALANCHE]: ''
    },
    DAI: {
        [CHAIN_IDS.ETHEREUM]: '', // Update with deployed CrossChainDAI address
        [CHAIN_IDS.BSC]: '',
        [CHAIN_IDS.POLYGON]: '',
        [CHAIN_IDS.ARBITRUM]: '',
        [CHAIN_IDS.OPTIMISM]: '',
        [CHAIN_IDS.AVALANCHE]: ''
    },
    WBTC: {
        [CHAIN_IDS.ETHEREUM]: '', // Update with deployed CrossChainWBTC address
        [CHAIN_IDS.BSC]: '',
        [CHAIN_IDS.POLYGON]: '',
        [CHAIN_IDS.ARBITRUM]: '',
        [CHAIN_IDS.OPTIMISM]: '',
        [CHAIN_IDS.AVALANCHE]: ''
    },
    WETH: {
        [CHAIN_IDS.ETHEREUM]: '', // Update with deployed CrossChainWETH address
        [CHAIN_IDS.BSC]: '',
        [CHAIN_IDS.POLYGON]: '',
        [CHAIN_IDS.ARBITRUM]: '',
        [CHAIN_IDS.OPTIMISM]: '',
        [CHAIN_IDS.AVALANCHE]: ''
    },
    ETH: {
        [CHAIN_IDS.ETHEREUM]: '', // Update with deployed CrossChainETH address
        [CHAIN_IDS.BSC]: '',
        [CHAIN_IDS.POLYGON]: '',
        [CHAIN_IDS.ARBITRUM]: '',
        [CHAIN_IDS.OPTIMISM]: '',
        [CHAIN_IDS.AVALANCHE]: ''
    },
    BNB: {
        [CHAIN_IDS.ETHEREUM]: '', // Update with deployed CrossChainBNB address
        [CHAIN_IDS.BSC]: '',
        [CHAIN_IDS.POLYGON]: '',
        [CHAIN_IDS.ARBITRUM]: '',
        [CHAIN_IDS.OPTIMISM]: '',
        [CHAIN_IDS.AVALANCHE]: ''
    },
    MATIC: {
        [CHAIN_IDS.ETHEREUM]: '', // Update with deployed CrossChainMATIC address
        [CHAIN_IDS.BSC]: '',
        [CHAIN_IDS.POLYGON]: '',
        [CHAIN_IDS.ARBITRUM]: '',
        [CHAIN_IDS.OPTIMISM]: '',
        [CHAIN_IDS.AVALANCHE]: ''
    },
    ARB: {
        [CHAIN_IDS.ETHEREUM]: '', // Update with deployed CrossChainARB address
        [CHAIN_IDS.BSC]: '',
        [CHAIN_IDS.POLYGON]: '',
        [CHAIN_IDS.ARBITRUM]: '',
        [CHAIN_IDS.OPTIMISM]: '',
        [CHAIN_IDS.AVALANCHE]: ''
    },
    OP: {
        [CHAIN_IDS.ETHEREUM]: '', // Update with deployed CrossChainOP address
        [CHAIN_IDS.BSC]: '',
        [CHAIN_IDS.POLYGON]: '',
        [CHAIN_IDS.ARBITRUM]: '',
        [CHAIN_IDS.OPTIMISM]: '',
        [CHAIN_IDS.AVALANCHE]: ''
    },
    AVAX: {
        [CHAIN_IDS.ETHEREUM]: '', // Update with deployed CrossChainAVAX address
        [CHAIN_IDS.BSC]: '',
        [CHAIN_IDS.POLYGON]: '',
        [CHAIN_IDS.ARBITRUM]: '',
        [CHAIN_IDS.OPTIMISM]: '',
        [CHAIN_IDS.AVALANCHE]: ''
    },
    UNI: {
        [CHAIN_IDS.ETHEREUM]: '', // Update with deployed CrossChainUNI address
        [CHAIN_IDS.BSC]: '',
        [CHAIN_IDS.POLYGON]: '',
        [CHAIN_IDS.ARBITRUM]: '',
        [CHAIN_IDS.OPTIMISM]: '',
        [CHAIN_IDS.AVALANCHE]: ''
    },
    AAVE: {
        [CHAIN_IDS.ETHEREUM]: '', // Update with deployed CrossChainAAVE address
        [CHAIN_IDS.BSC]: '',
        [CHAIN_IDS.POLYGON]: '',
        [CHAIN_IDS.ARBITRUM]: '',
        [CHAIN_IDS.OPTIMISM]: '',
        [CHAIN_IDS.AVALANCHE]: ''
    }
};

// Token metadata for validation and logging
const TOKEN_METADATA = {
    USDT: { name: 'CrossChain Tether USD', symbol: 'USDT', decimals: 6 },
    USDC: { name: 'CrossChain USD Coin', symbol: 'USDC', decimals: 6 },
    DAI: { name: 'CrossChain Dai Stablecoin', symbol: 'DAI', decimals: 18 },
    WBTC: { name: 'CrossChain Wrapped Bitcoin', symbol: 'WBTC', decimals: 8 },
    WETH: { name: 'CrossChain Wrapped Ether', symbol: 'WETH', decimals: 18 },
    ETH: { name: 'CrossChain Ether', symbol: 'ETH', decimals: 18 },
    BNB: { name: 'CrossChain BNB', symbol: 'BNB', decimals: 18 },
    MATIC: { name: 'CrossChain Polygon', symbol: 'MATIC', decimals: 18 },
    ARB: { name: 'CrossChain Arbitrum', symbol: 'ARB', decimals: 18 },
    OP: { name: 'CrossChain Optimism', symbol: 'OP', decimals: 18 },
    AVAX: { name: 'CrossChain Avalanche', symbol: 'AVAX', decimals: 18 },
    UNI: { name: 'CrossChain Uniswap', symbol: 'UNI', decimals: 18 },
    AAVE: { name: 'CrossChain Aave', symbol: 'AAVE', decimals: 18 }
};

// Supported networks for CrossChain token deployment
const SUPPORTED_NETWORKS = [
    {
        chainId: CHAIN_IDS.ETHEREUM,
        name: 'Ethereum',
        lzEndpointId: LAYERZERO_V1_ENDPOINT_IDS.ETHEREUM,
        rpcUrl: bridgeConfig.networks.ethereum.rpcUrls.primary
    },
    {
        chainId: CHAIN_IDS.BSC,
        name: 'BSC',
        lzEndpointId: LAYERZERO_V1_ENDPOINT_IDS.BSC,
        rpcUrl: bridgeConfig.networks.bsc.rpcUrls.primary
    },
    {
        chainId: CHAIN_IDS.POLYGON,
        name: 'Polygon',
        lzEndpointId: LAYERZERO_V1_ENDPOINT_IDS.POLYGON,
        rpcUrl: bridgeConfig.networks.polygon.rpcUrls.primary
    },
    {
        chainId: CHAIN_IDS.ARBITRUM,
        name: 'Arbitrum',
        lzEndpointId: LAYERZERO_V1_ENDPOINT_IDS.ARBITRUM,
        rpcUrl: bridgeConfig.networks.arbitrum.rpcUrls.primary
    },
    {
        chainId: CHAIN_IDS.OPTIMISM,
        name: 'Optimism',
        lzEndpointId: LAYERZERO_V1_ENDPOINT_IDS.OPTIMISM,
        rpcUrl: bridgeConfig.networks.optimism.rpcUrls.primary
    },
    {
        chainId: CHAIN_IDS.AVALANCHE,
        name: 'Avalanche',
        lzEndpointId: LAYERZERO_V1_ENDPOINT_IDS.AVALANCHE,
        rpcUrl: bridgeConfig.networks.avalanche.rpcUrls.primary
    }
];

/**
 * Parse command line arguments
 */
function parseArguments() {
    const args = process.argv.slice(2);
    let tokenSymbol = null;
    
    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--token' && i + 1 < args.length) {
            tokenSymbol = args[i + 1].toUpperCase();
            break;
        }
    }
    
    if (!tokenSymbol) {
        console.error('❌ Error: --token parameter is required');
        console.log('\n📖 Usage examples:');
        console.log('   node setupTrustedRemotes.js --token USDT');
        console.log('   node setupTrustedRemotes.js --token USDC');
        console.log('   node setupTrustedRemotes.js --token ALL');
        console.log('\n🪙 Supported tokens:');
        console.log('   ', Object.keys(TOKEN_METADATA).join(', '), ', ALL');
        process.exit(1);
    }
    
    return { tokenSymbol };
}

/**
 * Validate token parameter
 */
function validateToken(tokenSymbol) {
    if (tokenSymbol === 'ALL') {
        return Object.keys(TOKEN_METADATA);
    }
    
    if (!TOKEN_METADATA[tokenSymbol]) {
        console.error(`❌ Error: Token '${tokenSymbol}' is not supported`);
        console.log('\n🪙 Supported tokens:');
        console.log('   ', Object.keys(TOKEN_METADATA).join(', '), ', ALL');
        process.exit(1);
    }
    
    return [tokenSymbol];
}

/**
 * Check if token has deployed addresses
 */
function validateTokenAddresses(tokenSymbol) {
    const tokenAddresses = CROSSCHAIN_TOKEN_ADDRESSES[tokenSymbol];
    
    const missingAddresses = SUPPORTED_NETWORKS.filter(network => 
        !tokenAddresses[network.chainId]
    );
    
    if (missingAddresses.length > 0) {
        console.error(`❌ Missing ${tokenSymbol} contract addresses for networks:`);
        missingAddresses.forEach(network => {
            console.error(`   - ${network.name} (Chain ID: ${network.chainId})`);
        });
        return false;
    }
    
    return true;
}

/**
 * Construct LayerZero V1 trusted remote path
 */
function constructLayerZeroPath(remoteContractAddress, localContractAddress) {
    return ethers.utils.solidityPack(
        ['address', 'address'],
        [remoteContractAddress, localContractAddress]
    );
}

/**
 * Get contract instance for a specific network and token
 */
async function getContractInstance(chainId, contractAddress, rpcUrl, tokenSymbol) {
    const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
    
    const privateKey = process.env.PRIVATE_KEY;
    if (!privateKey) {
        throw new Error('PRIVATE_KEY environment variable not set');
    }
    
    const wallet = new ethers.Wallet(privateKey, provider);
    
    // Generic CrossChain token contract ABI (works for all tokens)
    const contractABI = [
        "function setTrustedRemote(uint16 _remoteChainId, bytes calldata _path) external",
        "function trustedRemoteLookup(uint16 chainId) external view returns (bytes memory)",
        "function hasRole(bytes32 role, address account) external view returns (bool)",
        "function DEFAULT_ADMIN_ROLE() external view returns (bytes32)",
        "function symbol() external view returns (string memory)",
        "function name() external view returns (string memory)"
    ];
    
    return new ethers.Contract(contractAddress, contractABI, wallet);
}

/**
 * Verify contract deployment and admin access
 */
async function verifyContractAccess(contract, signerAddress, networkName, tokenSymbol) {
    try {
        // Check if contract exists
        const code = await contract.provider.getCode(contract.address);
        if (code === '0x') {
            throw new Error(`No contract deployed at address ${contract.address}`);
        }
        
        // Verify contract symbol matches expected token
        try {
            const contractSymbol = await contract.symbol();
            const expectedSymbol = TOKEN_METADATA[tokenSymbol].symbol;
            if (contractSymbol !== expectedSymbol) {
                console.warn(`⚠️  Symbol mismatch on ${networkName}: expected ${expectedSymbol}, got ${contractSymbol}`);
            }
        } catch (error) {
            console.warn(`⚠️  Could not verify symbol on ${networkName}: ${error.message}`);
        }
        
        // Check admin role
        const defaultAdminRole = await contract.DEFAULT_ADMIN_ROLE();
        const hasAdminRole = await contract.hasRole(defaultAdminRole, signerAddress);
        
        if (!hasAdminRole) {
            throw new Error(`Signer ${signerAddress} does not have admin role on ${networkName}`);
        }
        
        console.log(`✅ Verified ${tokenSymbol} contract access on ${networkName}`);
        return true;
    } catch (error) {
        console.error(`❌ ${tokenSymbol} contract verification failed on ${networkName}:`, error.message);
        return false;
    }
}

/**
 * Setup trusted remote for a specific network pair and token
 */
async function setupTrustedRemote(
    sourceContract,
    sourceName,
    targetLzEndpointId,
    targetName,
    targetContractAddress,
    sourceContractAddress,
    tokenSymbol
) {
    try {
        // Check if trusted remote already exists
        const existingPath = await sourceContract.trustedRemoteLookup(targetLzEndpointId);
        
        if (existingPath && existingPath !== '0x') {
            console.log(`  ⚠️  ${tokenSymbol} trusted remote already exists: ${sourceName} → ${targetName} (LZ ID: ${targetLzEndpointId})`);
            return { success: true, skipped: true };
        }
        
        // Construct LayerZero path
        const trustedRemotePath = constructLayerZeroPath(targetContractAddress, sourceContractAddress);
        
        console.log(`  🔄 Setting ${tokenSymbol} trusted remote: ${sourceName} → ${targetName}`);
        console.log(`      Source: ${sourceContractAddress}`);
        console.log(`      Target: ${targetContractAddress}`);
        console.log(`      LZ Endpoint ID: ${targetLzEndpointId}`);
        console.log(`      Path: ${trustedRemotePath}`);
        
        // Estimate gas
        const gasEstimate = await sourceContract.estimateGas.setTrustedRemote(
            targetLzEndpointId,
            trustedRemotePath
        );
        
        // Add 20% buffer to gas estimate
        const gasLimit = gasEstimate.mul(120).div(100);
        
        // Execute transaction
        const tx = await sourceContract.setTrustedRemote(
            targetLzEndpointId,
            trustedRemotePath,
            { gasLimit }
        );
        
        console.log(`      TX Hash: ${tx.hash}`);
        
        // Wait for confirmation
        const receipt = await tx.wait();
        
        if (receipt.status === 1) {
            console.log(`  ✅ ${tokenSymbol} Success: ${sourceName} → ${targetName} (Block: ${receipt.blockNumber})`);
            return { success: true, txHash: tx.hash, blockNumber: receipt.blockNumber };
        } else {
            throw new Error('Transaction failed');
        }
        
    } catch (error) {
        console.error(`  ❌ ${tokenSymbol} Failed: ${sourceName} → ${targetName} - ${error.message}`);
        return { success: false, error: error.message };
    }
}

/**
 * Setup trusted remotes for a specific token
 */
async function setupTrustedRemotesForToken(tokenSymbol, signerAddress) {
    console.log(`\n🪙 Processing Token: ${TOKEN_METADATA[tokenSymbol].name} (${tokenSymbol})`);
    console.log(`📋 Decimals: ${TOKEN_METADATA[tokenSymbol].decimals}`);
    
    const tokenResults = {
        token: tokenSymbol,
        total: 0,
        successful: 0,
        skipped: 0,
        failed: 0,
        errors: []
    };
    
    // Validate token addresses
    if (!validateTokenAddresses(tokenSymbol)) {
        throw new Error(`Missing contract addresses for ${tokenSymbol}`);
    }
    
    const tokenAddresses = CROSSCHAIN_TOKEN_ADDRESSES[tokenSymbol];
    
    // Setup trusted remotes for each source network
    for (const sourceNetwork of SUPPORTED_NETWORKS) {
        console.log(`\n🔗 Processing ${tokenSymbol} Source Network: ${sourceNetwork.name}`);
        
        try {
            const sourceContractAddress = tokenAddresses[sourceNetwork.chainId];
            const sourceContract = await getContractInstance(
                sourceNetwork.chainId,
                sourceContractAddress,
                sourceNetwork.rpcUrl,
                tokenSymbol
            );
            
            // Verify contract access
            const hasAccess = await verifyContractAccess(
                sourceContract, 
                signerAddress, 
                sourceNetwork.name, 
                tokenSymbol
            );
            if (!hasAccess) {
                console.error(`❌ Skipping ${tokenSymbol} on ${sourceNetwork.name} due to access issues`);
                continue;
            }
            
            // Setup trusted remotes to all other networks
            for (const targetNetwork of SUPPORTED_NETWORKS) {
                if (sourceNetwork.chainId === targetNetwork.chainId) continue; // Skip self
                
                tokenResults.total++;
                
                const targetContractAddress = tokenAddresses[targetNetwork.chainId];
                
                const result = await setupTrustedRemote(
                    sourceContract,
                    sourceNetwork.name,
                    targetNetwork.lzEndpointId,
                    targetNetwork.name,
                    targetContractAddress,
                    sourceContractAddress,
                    tokenSymbol
                );
                
                if (result.success) {
                    if (result.skipped) {
                        tokenResults.skipped++;
                    } else {
                        tokenResults.successful++;
                    }
                } else {
                    tokenResults.failed++;
                    tokenResults.errors.push({
                        token: tokenSymbol,
                        source: sourceNetwork.name,
                        target: targetNetwork.name,
                        error: result.error
                    });
                }
                
                // Add delay between transactions to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
            
        } catch (error) {
            console.error(`❌ Failed to process ${tokenSymbol} source network ${sourceNetwork.name}:`, error.message);
            tokenResults.errors.push({
                token: tokenSymbol,
                source: sourceNetwork.name,
                target: 'ALL',
                error: error.message
            });
        }
    }
    
    return tokenResults;
}

/**
 * Setup trusted remotes for all specified tokens
 */
async function setupAllTrustedRemotes(tokens) {
    console.log('🚀 Starting Multi-Token Trusted Remote Setup...');
    console.log(`🪙 Processing ${tokens.length} token(s): ${tokens.join(', ')}`);
    console.log(`🌐 Networks: ${SUPPORTED_NETWORKS.length} networks with LayerZero V1\n`);
    
    const allResults = {
        totalTokens: tokens.length,
        successfulTokens: 0,
        failedTokens: 0,
        totalConfigurations: 0,
        successfulConfigurations: 0,
        skippedConfigurations: 0,
        failedConfigurations: 0,
        tokenResults: [],
        allErrors: []
    };
    
    // Get signer address for verification
    const tempProvider = new ethers.providers.JsonRpcProvider(SUPPORTED_NETWORKS[0].rpcUrl);
    const tempWallet = new ethers.Wallet(process.env.PRIVATE_KEY, tempProvider);
    const signerAddress = tempWallet.address;
    console.log(`🔑 Using signer address: ${signerAddress}\n`);
    
    // Process each token
    for (const tokenSymbol of tokens) {
        try {
            const tokenResults = await setupTrustedRemotesForToken(tokenSymbol, signerAddress);
            
            allResults.tokenResults.push(tokenResults);
            allResults.totalConfigurations += tokenResults.total;
            allResults.successfulConfigurations += tokenResults.successful;
            allResults.skippedConfigurations += tokenResults.skipped;
            allResults.failedConfigurations += tokenResults.failed;
            allResults.allErrors.push(...tokenResults.errors);
            
            if (tokenResults.failed === 0) {
                allResults.successfulTokens++;
                console.log(`\n🎉 ${tokenSymbol} trusted remotes configured successfully!`);
            } else {
                allResults.failedTokens++;
                console.log(`\n⚠️  ${tokenSymbol} had ${tokenResults.failed} failed configurations`);
            }
            
        } catch (error) {
            console.error(`❌ Failed to process token ${tokenSymbol}:`, error.message);
            allResults.failedTokens++;
            allResults.allErrors.push({
                token: tokenSymbol,
                source: 'ALL',
                target: 'ALL',
                error: error.message
            });
        }
    }
    
    // Display final results
    displayResults(allResults);
    
    return allResults;
}

/**
 * Display setup results summary
 */
function displayResults(results) {
    console.log('\n' + '='.repeat(100));
    console.log('📊 MULTI-TOKEN TRUSTED REMOTE SETUP RESULTS');
    console.log('='.repeat(100));
    
    // Token-level results
    console.log(`🪙 Total tokens processed: ${results.totalTokens}`);
    console.log(`✅ Successful tokens: ${results.successfulTokens}`);
    console.log(`❌ Failed tokens: ${results.failedTokens}`);
    
    // Configuration-level results
    console.log(`\n📝 Total configurations attempted: ${results.totalConfigurations}`);
    console.log(`✅ Successful configurations: ${results.successfulConfigurations}`);
    console.log(`⏭️  Skipped (already configured): ${results.skippedConfigurations}`);
    console.log(`❌ Failed configurations: ${results.failedConfigurations}`);
    
    if (results.totalConfigurations > 0) {
        const successRate = ((results.successfulConfigurations + results.skippedConfigurations) / results.totalConfigurations * 100).toFixed(1);
        console.log(`📈 Success rate: ${successRate}%`);
    }
    
    // Per-token breakdown
    if (results.tokenResults.length > 1) {
        console.log('\n📋 Per-Token Breakdown:');
        results.tokenResults.forEach(tokenResult => {
            const tokenSuccessRate = tokenResult.total > 0 ? 
                ((tokenResult.successful + tokenResult.skipped) / tokenResult.total * 100).toFixed(1) : 
                '0.0';
            console.log(`   ${tokenResult.token}: ${tokenResult.successful + tokenResult.skipped}/${tokenResult.total} (${tokenSuccessRate}%)`);
        });
    }
    
    if (results.allErrors.length > 0) {
        console.log('\n❌ ERRORS ENCOUNTERED:');
        results.allErrors.forEach((error, index) => {
            console.log(`${index + 1}. ${error.token}: ${error.source} → ${error.target}`);
            console.log(`   Error: ${error.error}\n`);
        });
    }
    
    console.log('\n🏁 Multi-token trusted remote setup completed!');
    
    if (results.failedTokens === 0 && results.failedConfigurations === 0) {
        console.log('🎉 All tokens and trusted remotes configured successfully!');
        console.log('🚀 Your CrossChain token contracts are ready for cross-chain transfers!');
    } else {
        console.log('⚠️  Some configurations failed. Please review errors and retry if needed.');
    }
}

/**
 * Validate environment and prerequisites
 */
async function validateEnvironment() {
    console.log('🔍 Validating environment...');
    
    // Check required environment variables
    if (!process.env.PRIVATE_KEY) {
        throw new Error('PRIVATE_KEY environment variable not set');
    }
    
    // Validate private key format
    if (!process.env.PRIVATE_KEY.startsWith('0x')) {
        throw new Error('PRIVATE_KEY must start with 0x');
    }
    
    // Check if bridgeConfig is available
    if (!bridgeConfig || !LAYERZERO_V1_ENDPOINT_IDS) {
        throw new Error('bridgeConfig.js not properly loaded');
    }
    
    // Validate LayerZero endpoint IDs
    const requiredEndpoints = ['ETHEREUM', 'BSC', 'POLYGON', 'ARBITRUM', 'OPTIMISM', 'AVALANCHE'];
    for (const endpoint of requiredEndpoints) {
        if (!LAYERZERO_V1_ENDPOINT_IDS[endpoint]) {
            throw new Error(`Missing LayerZero V1 endpoint ID for ${endpoint}`);
        }
    }
    
    console.log('✅ Environment validation passed');
    console.log(`✅ Found ${SUPPORTED_NETWORKS.length} supported networks`);
    console.log(`✅ Found ${Object.keys(TOKEN_METADATA).length} supported tokens`);
    console.log(`✅ LayerZero V1 endpoint IDs loaded`);
    console.log(`✅ Private key configured\n`);
}

/**
 * Display token and network configuration
 */
function displayConfiguration(tokens) {
    console.log('🔍 Configuration Summary...');
    
    console.log(`\n🪙 Token(s) to process: ${tokens.length}`);
    tokens.forEach(token => {
        const metadata = TOKEN_METADATA[token];
        console.log(`   - ${metadata.name} (${metadata.symbol}) - ${metadata.decimals} decimals`);
    });
    
    console.log(`\n🌐 Supported Networks: ${SUPPORTED_NETWORKS.length}`);
    SUPPORTED_NETWORKS.forEach(network => {
        console.log(`   - ${network.name} (Chain ID: ${network.chainId}, LZ ID: ${network.lzEndpointId})`);
    });
    
    console.log('');
}

/**
 * Main execution function
 */
async function main() {
    try {
        console.log('🔧 Multi-Token CrossChain - LayerZero V1 Trusted Remote Setup');
        console.log('='.repeat(70));
        console.log('📅 Timestamp:', new Date().toISOString());
        console.log('🌐 Protocol: LayerZero V1');
        console.log('📝 Contracts: CrossChain Token Contracts\n');
        
        // Parse command line arguments
        const { tokenSymbol } = parseArguments();
        
        // Validate and get tokens to process
        const tokensToProcess = validateToken(tokenSymbol);
        
        await validateEnvironment();
        displayConfiguration(tokensToProcess);
        
        const results = await setupAllTrustedRemotes(tokensToProcess);
        
        // Exit with appropriate code
        process.exit(results.failedTokens > 0 || results.failedConfigurations > 0 ? 1 : 0);
        
    } catch (error) {
        console.error('\n💥 Setup failed:', error.message);
        console.error('📍 Stack trace:', error.stack);
        process.exit(1);
    }
}

// Handle script execution
if (require.main === module) {
    main();
}

// Export functions for testing
module.exports = {
    setupAllTrustedRemotes,
    setupTrustedRemotesForToken,
    setupTrustedRemote,
    constructLayerZeroPath,
    getContractInstance,
    verifyContractAccess,
    validateEnvironment,
    parseArguments,
    validateToken,
    SUPPORTED_NETWORKS,
    CROSSCHAIN_TOKEN_ADDRESSES,
    TOKEN_METADATA
};
