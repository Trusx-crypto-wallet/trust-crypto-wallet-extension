/**
 * Setup Trusted Remotes Script
 * Configures cross-chain trusted remote addresses for all supported bridge protocols
 * across mainnet chains to enable secure cross-chain communication.
 */

const { getChainConfig } = require('../config/chains.config.js');
const BridgeManager = require('../src/bridges/BridgeManager.js');
const { CHAIN_IDS } = require('../src/utils/constants.js');

// Define mainnet chain IDs for trusted remote setup
const MAINNET_CHAIN_IDS = [
    CHAIN_IDS.ETHEREUM,
    CHAIN_IDS.BSC,
    CHAIN_IDS.POLYGON,
    CHAIN_IDS.ARBITRUM,
    CHAIN_IDS.OPTIMISM,
    CHAIN_IDS.AVALANCHE
];

// Bridge protocols that require trusted remote configuration
const BRIDGE_PROTOCOLS = [
    'layerzero',
    'wormhole',
    'axelar',
    'hyperlane',
    'multichain',
    'chainlink',
    'hop',
    'across'
];

/**
 * Main function to setup trusted remotes across all chains and protocols
 */
async function setupTrustedRemotes() {
    console.log('🚀 Starting Trusted Remote Setup...');
    console.log(`📋 Configuring ${MAINNET_CHAIN_IDS.length} chains across ${BRIDGE_PROTOCOLS.length} bridge protocols\n`);

    const bridgeManager = new BridgeManager();
    const setupResults = {
        successful: 0,
        failed: 0,
        errors: []
    };

    try {
        // Initialize bridge manager
        await bridgeManager.initialize();

        // Loop through each mainnet chain
        for (const chainId of MAINNET_CHAIN_IDS) {
            console.log(`\n🔗 Processing Chain ID: ${chainId}`);
            
            try {
                // Get chain configuration
                const chainConfig = await getChainConfig(chainId);
                console.log(`✅ Retrieved config for ${chainConfig.name}`);
                console.log(`   RPC URL: ${chainConfig.rpcUrl}`);
                console.log(`   Native Token: ${chainConfig.nativeToken.symbol}`);

                // Setup trusted remotes for each bridge protocol
                for (const protocol of BRIDGE_PROTOCOLS) {
                    await setupTrustedRemotesForProtocol(
                        bridgeManager,
                        chainId,
                        chainConfig,
                        protocol,
                        setupResults
                    );
                }

            } catch (error) {
                console.error(`❌ Failed to process chain ${chainId}:`, error.message);
                setupResults.failed++;
                setupResults.errors.push({
                    chainId,
                    error: error.message
                });
            }
        }

        // Display final results
        displayResults(setupResults);

    } catch (error) {
        console.error('💥 Critical error during setup:', error);
        process.exit(1);
    }
}

/**
 * Setup trusted remotes for a specific protocol on a source chain
 */
async function setupTrustedRemotesForProtocol(bridgeManager, sourceChainId, sourceConfig, protocol, results) {
    console.log(`  🌉 Setting up ${protocol.toUpperCase()} trusted remotes...`);

    try {
        // Get protocol-specific contract addresses from source chain config
        const sourceContractAddress = getContractAddress(sourceConfig, protocol);
        if (!sourceContractAddress) {
            console.log(`  ⚠️  No ${protocol} contract found on chain ${sourceChainId}, skipping...`);
            return;
        }

        // Setup trusted remotes to all other chains
        for (const targetChainId of MAINNET_CHAIN_IDS) {
            if (sourceChainId === targetChainId) continue; // Skip self

            try {
                const targetConfig = await getChainConfig(targetChainId);
                const targetContractAddress = getContractAddress(targetConfig, protocol);

                if (!targetContractAddress) {
                    console.log(`    ⚠️  No ${protocol} contract on target chain ${targetChainId}, skipping...`);
                    continue;
                }

                // Configure trusted remote
                await bridgeManager.setTrustedRemote({
                    protocol,
                    sourceChainId,
                    targetChainId,
                    sourceContractAddress,
                    targetContractAddress,
                    rpcUrl: sourceConfig.rpcUrl
                });

                console.log(`    ✅ ${sourceConfig.name} → ${targetConfig.name} (${protocol})`);
                results.successful++;

            } catch (error) {
                console.error(`    ❌ Failed ${sourceChainId} → ${targetChainId} (${protocol}):`, error.message);
                results.failed++;
                results.errors.push({
                    sourceChainId,
                    targetChainId,
                    protocol,
                    error: error.message
                });
            }
        }

    } catch (error) {
        console.error(`  ❌ Protocol ${protocol} setup failed on chain ${sourceChainId}:`, error.message);
        results.failed++;
        results.errors.push({
            sourceChainId,
            protocol,
            error: error.message
        });
    }
}

/**
 * Extract contract address for a specific bridge protocol from chain config
 */
function getContractAddress(chainConfig, protocol) {
    if (!chainConfig.bridges || !chainConfig.bridges[protocol]) {
        return null;
    }

    const bridgeConfig = chainConfig.bridges[protocol];
    
    // Handle different contract naming conventions
    return bridgeConfig.contractAddress || 
           bridgeConfig.address || 
           bridgeConfig.endpoint || 
           bridgeConfig.gateway ||
           null;
}

/**
 * Display setup results summary
 */
function displayResults(results) {
    console.log('\n' + '='.repeat(60));
    console.log('📊 TRUSTED REMOTE SETUP RESULTS');
    console.log('='.repeat(60));
    console.log(`✅ Successful configurations: ${results.successful}`);
    console.log(`❌ Failed configurations: ${results.failed}`);
    console.log(`📈 Success rate: ${((results.successful / (results.successful + results.failed)) * 100).toFixed(1)}%`);

    if (results.errors.length > 0) {
        console.log('\n❌ ERRORS ENCOUNTERED:');
        results.errors.forEach((error, index) => {
            console.log(`${index + 1}. Chain ${error.sourceChainId} → ${error.targetChainId || 'N/A'} (${error.protocol || 'N/A'})`);
            console.log(`   Error: ${error.error}\n`);
        });
    }

    console.log('\n🏁 Trusted remote setup completed!');
}

/**
 * Validate environment and prerequisites
 */
async function validateEnvironment() {
    console.log('🔍 Validating environment...');

    // Check if required config files exist
    const requiredModules = [
        '../config/chains.config.js',
        '../src/bridges/BridgeManager.js',
        '../src/utils/constants.js'
    ];

    for (const module of requiredModules) {
        try {
            require.resolve(module);
            console.log(`✅ Found: ${module}`);
        } catch (error) {
            console.error(`❌ Missing required module: ${module}`);
            throw new Error(`Required module not found: ${module}`);
        }
    }

    console.log('✅ Environment validation passed\n');
}

/**
 * Execute setup with proper error handling
 */
async function main() {
    try {
        console.log('🔧 Trust Crypto Wallet - Trusted Remote Setup');
        console.log('=' .repeat(50));
        
        await validateEnvironment();
        await setupTrustedRemotes();
        
        process.exit(0);
    } catch (error) {
        console.error('\n💥 Setup failed:', error.message);
        console.error('Stack trace:', error.stack);
        process.exit(1);
    }
}

// Handle script execution
if (require.main === module) {
    main();
}

module.exports = {
    setupTrustedRemotes,
    setupTrustedRemotesForProtocol,
    getContractAddress,
    MAINNET_CHAIN_IDS,
    BRIDGE_PROTOCOLS
};
