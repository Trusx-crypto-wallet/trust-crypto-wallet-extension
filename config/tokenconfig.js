/**
 * Trust Crypto Wallet Extension - Token Configuration
 * Production-grade token configuration with IPFS integration and Bitcoin filtering
 * Integrates with TokenListAligner for unified data loading
 */

import { logger } from '../src/utils/logger.js';
import { BridgeErrors } from '../src/errors/BridgeErrors.js';
import { TokenListAligner } from '../src/alignment/TokenListAligner.js';

/**
 * IPFS Configuration for Token Lists
 * These hashes must be updated for production deployment
 */
const IPFS_CONFIG = {
    // IPFS Gateway Configuration
    gateways: [
        'https://ipfs.io/ipfs/',
        'https://cloudflare-ipfs.com/ipfs/',
        'https://gateway.pinata.cloud/ipfs/',
        'https://dweb.link/ipfs/'
    ],
    
    // Token List IPFS Hashes - MUST BE UPDATED FOR PRODUCTION
    hashes: {
        mainnetTokenlist: 'bafkreidrjqn645yqrpyoctbx6awbf6gwio47n2hk54qpgcnaxypgugrj6a', // mainnet-tokenlist.json
        testnetTokenlist: 'bafkreibiwwrs5xmhgyp3pvdl3xrdzryxzl5oyq6lh7dl3qbxa63vgl33da', // testnet-tokenlist.json
        tokenlist: 'bafkreida6oqbjj4zot3iui43qyautdsszznsnx2pbsudocafhgcnwcchqq', // tokenlist.json
        bridgeMetadata: 'bafkreieedvgfhn3c3epkwtixy6dbewpaanlaotjacievrbsknuowimhrra', // bridge-metadata.json
        bridgeSchema: 'bafkreiczapkfclas6qigtdhp32e3irqqquyq3cmrccdoxrzkf5k2a3j23q' // bridge-registry-schema.json
    },
    
    // Fallback GitHub URLs
    fallbackUrls: {
        extension: 'https://raw.githubusercontent.com/Trusx-crypto-wallet/trust-crypto-wallet-tokenlist/main/extension.json',
        mainnet: 'https://raw.githubusercontent.com/Trusx-crypto-wallet/trust-crypto-wallet-tokenlist/main/mainnet-tokenlist.json',
        testnet: 'https://raw.githubusercontent.com/Trusx-crypto-wallet/trust-crypto-wallet-tokenlist/main/testnet-tokenlist.json'
    },
    
    // Cache settings
    cache: {
        ttl: 300000, // 5 minutes
        maxSize: 100,
        enablePersistent: true
    }
};

/**
 * Bitcoin Filtering Configuration
 */
const BITCOIN_FILTER_CONFIG = {
    enabled: true,
    strictMode: true,
    symbols: [
        'BTC', 'WBTC', 'BTCB', 'HBTC', 'RENBTC', 'SBTC', 
        'TBTC', 'OBTC', 'PBTC', 'VBTC', 'XBTC', 'BBTC'
    ],
    namePatterns: [
        'bitcoin', 'wrapped bitcoin', 'synthetic bitcoin', 
        'tokenized bitcoin', 'bitcoin token', 'btc token'
    ],
    chainIds: [0], // Bitcoin mainnet
    addresses: [
        '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', // WBTC on Ethereum
        '0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c', // BTCB on BSC
        '0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6'  // WBTC on Polygon
    ]
};

/**
 * Deprecated Network Configuration
 */
const DEPRECATED_NETWORKS = {
    testnets: [
        5,       // Goerli (deprecated)
        80001,   // Mumbai (deprecated, replaced by Amoy)
        421613,  // Arbitrum Goerli (deprecated)
        420,     // Optimism Goerli (deprecated)
        97       // BSC Testnet (old)
    ],
    mainnets: [] // No deprecated mainnets currently
};

/**
 * Production Token Configuration Class
 */
export class TokenConfig {
    constructor() {
        this.extensionData = null;
        this.mainnetTokens = new Map();
        this.testnetTokens = new Map();
        this.tokenMappings = new Map();
        this.bridgeTokens = new Map();
        this.initialized = false;
        this.lastUpdated = null;
        this.cache = new Map();
        this.ipfsCache = new Map();
        this.aligner = new TokenListAligner();
        this.productionMode = process.env.NODE_ENV === 'production';
        
        this.urlConfig = {
            extension: IPFS_CONFIG.fallbackUrls.extension,
            mainnet: null,
            testnet: null,
            ipfsGateway: IPFS_CONFIG.gateways[0]
        };

        this.stats = {
            tokensFiltered: 0,
            bitcoinTokensFiltered: 0,
            deprecatedTokensFiltered: 0,
            loadTime: 0,
            ipfsLoadTime: 0
        };
    }

    /**
     * Initialize token configuration with IPFS and Bitcoin filtering
     * @returns {Promise<void>}
     */
    async initialize() {
        try {
            const startTime = Date.now();
            logger.info('🚀 Initializing BITCOIN-FREE token configuration with IPFS integration...');
            
            // Step 1: Initialize TokenListAligner with IPFS hashes
            await this.initializeAligner();
            
            // Step 2: Load extension metadata with IPFS fallback
            await this.loadExtensionMetadata();
            
            // Step 3: Extract URLs and prepare IPFS loading
            this.prepareDataSources();
            
            // Step 4: Load token data with strict Bitcoin filtering
            await this.loadTokenDataWithFiltering();
            
            // Step 5: Validate and perform final checks
            await this.validateTokenData();
            await this.performFinalBitcoinCheck();
            
            // Step 6: Finalize initialization
            this.stats.loadTime = Date.now() - startTime;
            this.initialized = true;
            this.lastUpdated = new Date().toISOString();
            
            logger.info(`✅ BITCOIN-FREE token configuration initialized in ${this.stats.loadTime}ms`);
            this.logInitializationStats();

        } catch (error) {
            logger.error('❌ Failed to initialize token configuration:', error);
            logger.warn('🔄 Falling back to hardcoded Bitcoin-free configuration...');
            await this.initializeFallback();
        }
    }

    /**
     * Initialize TokenListAligner with IPFS configuration
     * @returns {Promise<void>}
     */
    async initializeAligner() {
        try {
            const ipfsStartTime = Date.now();
            logger.info('🔗 Initializing TokenListAligner with IPFS hashes...');
            
            await this.aligner.initialize({
                ipfsHashes: IPFS_CONFIG.hashes,
                gateways: IPFS_CONFIG.gateways,
                fallbackUrls: IPFS_CONFIG.fallbackUrls,
                bitcoinFilter: BITCOIN_FILTER_CONFIG,
                deprecatedNetworks: DEPRECATED_NETWORKS
            });
            
            this.stats.ipfsLoadTime = Date.now() - ipfsStartTime;
            logger.info(`✅ TokenListAligner initialized in ${this.stats.ipfsLoadTime}ms`);
            
        } catch (error) {
            logger.error('❌ Failed to initialize TokenListAligner:', error);
            throw error;
        }
    }

    /**
     * Load extension metadata with IPFS integration
     * @returns {Promise<void>}
     */
    async loadExtensionMetadata() {
        try {
            // Try to get extension data from aligner first
            const alignedData = await this.aligner.getExtensionData();
            if (alignedData) {
                this.extensionData = alignedData;
                logger.info('📋 Extension metadata loaded from TokenListAligner');
                return;
            }

            // Fallback to direct loading
            const response = await this.fetchWithTimeout(this.urlConfig.extension, 3000);
            this.extensionData = await response.json();
            
            logger.info('📋 Extension metadata loaded from fallback URL:', {
                version: this.extensionData.version,
                name: this.extensionData.name,
                tokenCount: this.extensionData.tokenCount
            });

        } catch (error) {
            logger.error('❌ Failed to load extension metadata:', error);
            throw error;
        }
    }

    /**
     * Prepare data sources for loading
     */
    prepareDataSources() {
        // Get URLs from extension data or use IPFS
        if (this.extensionData?.lists) {
            this.urlConfig.mainnet = this.extensionData.lists.mainnet?.uri || 
                                   this.buildIpfsUrl(IPFS_CONFIG.hashes.mainnetTokenlist);
            this.urlConfig.testnet = this.extensionData.lists.testnet?.uri || 
                                   this.buildIpfsUrl(IPFS_CONFIG.hashes.testnetTokenlist);
        } else {
            // Use IPFS hashes directly
            this.urlConfig.mainnet = this.buildIpfsUrl(IPFS_CONFIG.hashes.mainnetTokenlist);
            this.urlConfig.testnet = this.buildIpfsUrl(IPFS_CONFIG.hashes.testnetTokenlist);
        }

        logger.debug('📡 Data sources prepared:', {
            mainnet: this.urlConfig.mainnet,
            testnet: this.urlConfig.testnet
        });
    }

    /**
     * Build IPFS URL with gateway rotation
     * @param {string} hash 
     * @returns {string}
     */
    buildIpfsUrl(hash) {
        return `${this.urlConfig.ipfsGateway}${hash}`;
    }

    /**
     * Load token data with comprehensive Bitcoin and deprecated network filtering
     * @returns {Promise<void>}
     */
    async loadTokenDataWithFiltering() {
        logger.info('🔍 Loading token data with STRICT Bitcoin filtering...');
        
        const loadPromises = [];

        // Load mainnet tokens
        if (this.urlConfig.mainnet) {
            loadPromises.push(
                this.loadMainnetTokens().catch(error => {
                    logger.error('❌ Failed to load mainnet tokens:', error);
                    return null;
                })
            );
        }

        // Load testnet tokens
        if (this.urlConfig.testnet) {
            loadPromises.push(
                this.loadTestnetTokens().catch(error => {
                    logger.error('❌ Failed to load testnet tokens:', error);
                    return null;
                })
            );
        }

        await Promise.all(loadPromises);
        
        logger.info(`📊 Token loading complete: ${this.mainnetTokens.size} mainnet, ${this.testnetTokens.size} testnet`);
        logger.info(`🚫 Filtering stats: ${this.stats.bitcoinTokensFiltered} Bitcoin, ${this.stats.deprecatedTokensFiltered} deprecated`);
    }

    /**
     * Load mainnet tokens with enhanced filtering
     * @returns {Promise<void>}
     */
    async loadMainnetTokens() {
        try {
            // Try to get from aligner first
            const alignedTokens = await this.aligner.getMainnetTokens();
            if (alignedTokens && alignedTokens.length > 0) {
                this.processAlignedTokens(alignedTokens, false);
                logger.info(`📄 Mainnet tokens loaded from aligner: ${alignedTokens.length} tokens`);
                return;
            }

            // Fallback to direct loading
            const response = await this.fetchWithIpfsFallback(this.urlConfig.mainnet);
            const tokenData = await response.json();

            if (!tokenData.tokens || !Array.isArray(tokenData.tokens)) {
                throw new Error('Invalid mainnet token data structure');
            }

            this.processTokenArray(tokenData.tokens, false);
            
        } catch (error) {
            logger.error('❌ Failed to load mainnet tokens:', error);
            throw error;
        }
    }

    /**
     * Load testnet tokens with enhanced filtering
     * @returns {Promise<void>}
     */
    async loadTestnetTokens() {
        try {
            // Try to get from aligner first
            const alignedTokens = await this.aligner.getTestnetTokens();
            if (alignedTokens && alignedTokens.length > 0) {
                this.processAlignedTokens(alignedTokens, true);
                logger.info(`📄 Testnet tokens loaded from aligner: ${alignedTokens.length} tokens`);
                return;
            }

            // Fallback to direct loading
            const response = await this.fetchWithIpfsFallback(this.urlConfig.testnet);
            const tokenData = await response.json();

            if (!tokenData.tokens || !Array.isArray(tokenData.tokens)) {
                throw new Error('Invalid testnet token data structure');
            }

            this.processTokenArray(tokenData.tokens, true);
            
        } catch (error) {
            logger.error('❌ Failed to load testnet tokens:', error);
            throw error;
        }
    }

    /**
     * Process tokens from TokenListAligner
     * @param {Array} tokens 
     * @param {boolean} isTestnet 
     */
    processAlignedTokens(tokens, isTestnet) {
        let processedCount = 0;
        
        for (const token of tokens) {
            // Aligner should have already filtered, but double-check
            if (this.isBitcoinRelatedToken(token)) {
                this.stats.bitcoinTokensFiltered++;
                logger.debug(`DOUBLE-FILTERED Bitcoin token from aligner: ${token.symbol}`);
                continue;
            }

            this.processToken(token, isTestnet);
            processedCount++;
        }

        logger.info(`Processed ${processedCount} ${isTestnet ? 'testnet' : 'mainnet'} tokens from aligner`);
    }

    /**
     * Process token array with filtering
     * @param {Array} tokens 
     * @param {boolean} isTestnet 
     */
    processTokenArray(tokens, isTestnet) {
        let filteredCount = 0;
        let processedCount = 0;

        for (const token of tokens) {
            // Bitcoin filtering
            if (this.isBitcoinRelatedToken(token)) {
                filteredCount++;
                this.stats.bitcoinTokensFiltered++;
                logger.debug(`FILTERED Bitcoin token: ${token.symbol} (${token.name}) on chain ${token.chainId}`);
                continue;
            }

            // Deprecated network filtering
            if (this.isDeprecatedNetwork(token.chainId, isTestnet)) {
                filteredCount++;
                this.stats.deprecatedTokensFiltered++;
                logger.debug(`FILTERED deprecated network token: ${token.symbol} on chain ${token.chainId}`);
                continue;
            }

            this.processToken(token, isTestnet);
            processedCount++;
        }

        const networkType = isTestnet ? 'testnet' : 'mainnet';
        logger.info(`${networkType} tokens: ${processedCount} processed, ${filteredCount} filtered`);
    }

    /**
     * Enhanced Bitcoin detection with 6-tier filtering system
     * @param {Object} token 
     * @returns {boolean}
     */
    isBitcoinRelatedToken(token) {
        if (!BITCOIN_FILTER_CONFIG.enabled) {
            return false;
        }

        // 1. Filter by symbol (comprehensive list)
        if (token.symbol && BITCOIN_FILTER_CONFIG.symbols.includes(token.symbol.toUpperCase())) {
            return true;
        }

        // 2. Filter by name (case-insensitive patterns)
        if (token.name) {
            const tokenNameLower = token.name.toLowerCase();
            if (BITCOIN_FILTER_CONFIG.namePatterns.some(pattern => tokenNameLower.includes(pattern))) {
                return true;
            }
        }

        // 3. Filter by chainId (Bitcoin networks)
        if (BITCOIN_FILTER_CONFIG.chainIds.includes(token.chainId)) {
            return true;
        }

        // 4. Filter by known Bitcoin addresses
        if (token.address && BITCOIN_FILTER_CONFIG.addresses.includes(token.address)) {
            return true;
        }

        // 5. Filter by logo URI containing bitcoin references
        if (token.logoURI) {
            const logoURI = token.logoURI.toLowerCase();
            if (['btc', 'bitcoin', 'wbtc'].some(pattern => logoURI.includes(pattern))) {
                return true;
            }
        }

        // 6. Filter by tags containing bitcoin
        if (token.tags && Array.isArray(token.tags)) {
            if (token.tags.some(tag => tag.toLowerCase().includes('btc') || tag.toLowerCase().includes('bitcoin'))) {
                return true;
            }
        }

        return false;
    }

    /**
     * Check if network is deprecated
     * @param {number} chainId 
     * @param {boolean} isTestnet 
     * @returns {boolean}
     */
    isDeprecatedNetwork(chainId, isTestnet) {
        if (isTestnet) {
            return DEPRECATED_NETWORKS.testnets.includes(chainId);
        } else {
            return DEPRECATED_NETWORKS.mainnets.includes(chainId);
        }
    }

    /**
     * Fetch with IPFS gateway fallback
     * @param {string} url 
     * @returns {Promise<Response>}
     */
    async fetchWithIpfsFallback(url) {
        // Try primary URL first
        try {
            return await this.fetchWithTimeout(url, 3000);
        } catch (error) {
            logger.warn(`Primary URL failed: ${url}, trying IPFS fallback`);
        }

        // Extract IPFS hash from URL if it's an IPFS URL
        const ipfsHash = this.extractIpfsHash(url);
        if (ipfsHash) {
            // Try different gateways
            for (const gateway of IPFS_CONFIG.gateways) {
                try {
                    const ipfsUrl = `${gateway}${ipfsHash}`;
                    return await this.fetchWithTimeout(ipfsUrl, 5000);
                } catch (error) {
                    logger.debug(`IPFS gateway failed: ${gateway}`);
                }
            }
        }

        throw new Error('All data sources failed');
    }

    /**
     * Extract IPFS hash from URL
     * @param {string} url 
     * @returns {string|null}
     */
    extractIpfsHash(url) {
        const ipfsPattern = /\/ipfs\/([a-zA-Z0-9]{46,})/;
        const match = url.match(ipfsPattern);
        return match ? match[1] : null;
    }

    /**
     * Process individual token with enhanced validation
     * @param {Object} token 
     * @param {boolean} isTestnet 
     */
    processToken(token, isTestnet = false) {
        try {
            // Final Bitcoin check (should not happen if filtering works)
            if (this.isBitcoinRelatedToken(token)) {
                logger.warn(`⚠️ Bitcoin token escaped filtering: ${token.symbol}`);
                return;
            }

            // Validate required fields
            if (!token.chainId || !token.address || !token.symbol) {
                logger.debug(`Skipping token with missing required fields: ${JSON.stringify(token)}`);
                return;
            }

            // Filter out invalid chain IDs
            if (token.chainId === 0 || token.chainId < 1) {
                logger.debug(`Filtering token with invalid chainId: ${token.chainId}`);
                return;
            }

            const tokenKey = `${token.chainId}-${token.address}`;
            const processedToken = {
                chainId: token.chainId,
                address: token.address,
                name: token.name || token.symbol,
                symbol: token.symbol,
                decimals: token.decimals || 18,
                logoURI: token.logoURI || this.getDefaultTokenLogo(token.symbol),
                tags: token.tags || [],
                bridgeTokens: token.bridgeTokens || [],
                extensions: token.extensions || {},
                isTestnet,
                custom: false,
                verified: token.verified || false,
                lastUpdated: Date.now()
            };

            // Store in appropriate map
            const targetMap = isTestnet ? this.testnetTokens : this.mainnetTokens;
            targetMap.set(tokenKey, processedToken);

            // Process bridge tokens if available
            if (token.bridgeTokens && Array.isArray(token.bridgeTokens)) {
                this.processBridgeTokens(token, token.bridgeTokens);
            }

            // Add to chain mapping
            this.addToChainMapping(token.chainId, tokenKey, processedToken);

        } catch (error) {
            logger.warn(`Failed to process token ${token.symbol}:`, error);
        }
    }

    /**
     * Process bridge tokens for cross-chain functionality
     * @param {Object} sourceToken 
     * @param {Array} bridgeTokens 
     */
    processBridgeTokens(sourceToken, bridgeTokens) {
        for (const bridgeToken of bridgeTokens) {
            // Skip bridge tokens for Bitcoin
            if (this.isBitcoinRelatedToken(bridgeToken)) {
                continue;
            }

            const bridgeKey = `${bridgeToken.chainId}-${bridgeToken.address}`;
            
            this.bridgeTokens.set(bridgeKey, {
                sourceChainId: sourceToken.chainId,
                sourceAddress: sourceToken.address,
                sourceSymbol: sourceToken.symbol,
                targetChainId: bridgeToken.chainId,
                targetAddress: bridgeToken.address,
                protocol: bridgeToken.protocol || 'unknown',
                bridgeContract: bridgeToken.bridgeContract,
                fees: bridgeToken.fees || {},
                limits: bridgeToken.limits || {},
                estimatedTime: bridgeToken.estimatedTime || '5-10 minutes',
                security: bridgeToken.security || 'standard'
            });
        }
    }

    /**
     * Add token to chain mapping for efficient lookups
     * @param {number} chainId 
     * @param {string} tokenKey 
     * @param {Object} tokenData 
     */
    addToChainMapping(chainId, tokenKey, tokenData) {
        if (!this.tokenMappings.has(chainId)) {
            this.tokenMappings.set(chainId, new Map());
        }
        this.tokenMappings.get(chainId).set(tokenData.address, tokenData);
    }

    /**
     * Get default token logo with comprehensive mapping
     * @param {string} symbol 
     * @returns {string}
     */
    getDefaultTokenLogo(symbol) {
        const logoMap = {
            // Major native tokens
            'ETH': '/public/images/tokens/eth-logo.png',
            'WETH': '/public/images/tokens/weth-logo.png',
            'BNB': '/public/images/tokens/bnb-logo.png',
            'MATIC': '/public/images/tokens/matic-logo.png',
            'AVAX': '/public/images/tokens/avax-logo.png',
            'ARB': '/public/images/tokens/arb-logo.png',
            'OP': '/public/images/tokens/op-logo.png',
            
            // Stablecoins
            'USDT': '/public/images/tokens/usdt.png',
            'USDC': '/public/images/tokens/usdc.png',
            'DAI': '/public/images/tokens/dai.png',
            
            // DeFi tokens
            'UNI': '/public/images/tokens/uni-logo.png',
            'AAVE': '/public/images/tokens/aave-logo.png',
            
            // Cross-chain
            'CROSSCHAIN-USDT': '/public/images/tokens/crosschain-usdt.png'
        };

        return logoMap[symbol.toUpperCase()] || '/public/images/tokens/unknown-token.png';
    }

    /**
     * Perform final Bitcoin verification check
     * @returns {Promise<void>}
     */
    async performFinalBitcoinCheck() {
        logger.info('🔍 Performing final Bitcoin verification check...');
        
        const bitcoinTokens = this.findBitcoinTokens();
        const supportedChains = this.getSupportedChainIds(true);
        
        // Check for Bitcoin chain ID
        if (supportedChains.includes(0)) {
            throw new Error('CRITICAL: Bitcoin chain ID (0) found in supported chains');
        }
        
        // Check for Bitcoin tokens
        if (bitcoinTokens.length > 0) {
            logger.error('❌ CRITICAL: Bitcoin tokens found after filtering:');
            bitcoinTokens.forEach(token => {
                logger.error(`   - ${token.symbol} (${token.name}) on chain ${token.chainId}`);
            });
            throw new Error(`CRITICAL: ${bitcoinTokens.length} Bitcoin tokens found after filtering`);
        }
        
        logger.info('✅ Bitcoin verification passed: System is Bitcoin-free');
    }

    /**
     * Find any Bitcoin tokens that escaped filtering
     * @returns {Array}
     */
    findBitcoinTokens() {
        const bitcoinTokens = [];
        
        // Check mainnet tokens
        for (const token of this.mainnetTokens.values()) {
            if (this.isBitcoinRelatedToken(token)) {
                bitcoinTokens.push(token);
            }
        }
        
        // Check testnet tokens
        for (const token of this.testnetTokens.values()) {
            if (this.isBitcoinRelatedToken(token)) {
                bitcoinTokens.push(token);
            }
        }
        
        return bitcoinTokens;
    }

    /**
     * Validate token data against extension expectations
     * @returns {Promise<void>}
     */
    async validateTokenData() {
        logger.info('=== TOKEN VALIDATION STARTING ===');
        
        if (!this.extensionData?.tokenCount) {
            logger.warn('Extension metadata missing expected token count');
            return;
        }

        const expectedMainnetCount = this.extensionData.tokenCount;
        const actualMainnetCount = this.mainnetTokens.size;
        
        logger.info(`Expected mainnet tokens: ${expectedMainnetCount}`);
        logger.info(`Actual loaded tokens: ${actualMainnetCount}`);
        
        if (actualMainnetCount !== expectedMainnetCount) {
            const difference = expectedMainnetCount - actualMainnetCount;
            logger.warn(`⚠️ Token count difference: ${difference} tokens filtered (expected due to Bitcoin + deprecated filtering)`);
        } else {
            logger.info(`✅ Token count validation passed: ${actualMainnetCount} tokens`);
        }

        // Validate no Bitcoin tokens
        const bitcoinTokensFound = this.findBitcoinTokens();
        if (bitcoinTokensFound.length > 0) {
            throw new Error(`Bitcoin filtering failed: ${bitcoinTokensFound.length} Bitcoin tokens found`);
        }

        logger.info('✅ Bitcoin filtering validation passed');
        logger.info('=== TOKEN VALIDATION COMPLETE ===');
    }

    /**
     * Initialize fallback configuration
     * @returns {Promise<void>}
     */
    async initializeFallback() {
        logger.warn('🔄 Initializing fallback token configuration...');
        
        // Hardcoded Bitcoin-free tokens for fallback
        const fallbackTokens = [
            {
                chainId: 1, address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
                name: 'Ethereum', symbol: 'ETH', decimals: 18
            },
            {
                chainId: 1, address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
                name: 'Tether USD', symbol: 'USDT', decimals: 6
            },
            {
                chainId: 1, address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
                name: 'USD Coin', symbol: 'USDC', decimals: 6
            },
            {
                chainId: 137, address: '0x0000000000000000000000000000000000001010',
                name: 'Polygon', symbol: 'MATIC', decimals: 18
            },
            {
                chainId: 56, address: '0x0000000000000000000000000000000000000000',
                name: 'BNB', symbol: 'BNB', decimals: 18
            }
        ];

        for (const token of fallbackTokens) {
            this.processToken(token, false);
        }

        this.extensionData = {
            version: '2.1.0',
            name: 'Trust Crypto Wallet Extension Token List (Fallback)',
            tokenCount: fallbackTokens.length,
            fallbackMode: true
        };

        this.initialized = true;
        this.lastUpdated = new Date().toISOString();
        
        logger.info(`✅ Fallback configuration loaded: ${fallbackTokens.length} tokens`);
    }

    /**
     * Fetch with timeout and enhanced error handling
     * @param {string} url 
     * @param {number} timeout 
     * @returns {Promise<Response>}
     */
    async fetchWithTimeout(url, timeout = 5000) {
        const cacheKey = `fetch-${url}`;
        const cached = this.cache.get(cacheKey);
        
        if (cached && (Date.now() - cached.timestamp) < IPFS_CONFIG.cache.ttl) {
            logger.debug(`Using cached response for ${url}`);
            return new Response(JSON.stringify(cached.data), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        
        try {
            const response = await fetch(url, { 
                signal: controller.signal,
                headers: {
                    'Accept': 'application/json',
                    'Cache-Control': 'no-cache',
                    'User-Agent': 'TrustCryptoWallet-Extension/2.1.0'
                }
            });
            
            if (!response.ok) {
                if (response.status === 429) {
                    throw new Error('Rate limit exceeded');
                }
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            // Cache successful responses
            this.cache.set(cacheKey, {
                data,
                timestamp: Date.now()
            });
            
            // Cleanup old cache entries
            this.cleanupCache();
            
            return new Response(JSON.stringify(data), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
            
        } finally {
            clearTimeout(timeoutId);
        }
    }

    /**
     * Cleanup old cache entries
     */
    cleanupCache() {
        if (this.cache.size > IPFS_CONFIG.cache.maxSize) {
            const entries = Array.from(this.cache.entries());
            const sortedEntries = entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
            const toDelete = sortedEntries.slice(0, entries.length - IPFS_CONFIG.cache.maxSize);
            
            for (const [key] of toDelete) {
                this.cache.delete(key);
            }
        }
    }

    /**
     * Log initialization statistics
     */
    logInitializationStats() {
        logger.info('=== INITIALIZATION STATISTICS ===');
        logger.info(`Total load time: ${this.stats.loadTime}ms`);
        logger.info(`IPFS load time: ${this.stats.ipfsLoadTime}ms`);
        logger.info(`Mainnet tokens: ${this.mainnetTokens.size}`);
        logger.info(`Testnet tokens: ${this.testnetTokens.size}`);
        logger.info(`Bridge mappings: ${this.bridgeTokens.size}`);
        logger.info(`Bitcoin tokens filtered: ${this.stats.bitcoinTokensFiltered}`);
        logger.info(`Deprecated tokens filtered: ${this.stats.deprecatedTokensFiltered}`);
        logger.info(`Supported chains: ${this.getSupportedChainIds(true).length}`);
        logger.info('=== STATISTICS COMPLETE ===');
    }

    // =================================================================
    // PUBLIC API METHODS
    // =================================================================

    /**
     * Get token by chain and address
     * @param {number} chainId 
     * @param {string} address 
     * @param {boolean} includeTestnet 
     * @returns {Object|null}
     */
    getToken(chainId, address, includeTestnet = false) {
        if (!this.initialized) {
            throw new BridgeErrors.NotInitializedError('Token configuration not initialized');
        }

        const tokenKey = `${chainId}-${address}`;
        
        if (this.mainnetTokens.has(tokenKey)) {
            return this.mainnetTokens.get(tokenKey);
        }

        if (includeTestnet && this.testnetTokens.has(tokenKey)) {
            return this.testnetTokens.get(tokenKey);
        }

        return null;
    }

    /**
     * Get tokens for specific chain
     * @param {number} chainId 
     * @param {boolean} includeTestnet 
     * @returns {Array}
     */
    getTokensForChain(chainId, includeTestnet = false) {
        if (!this.initialized) {
            throw new BridgeErrors.NotInitializedError('Token configuration not initialized');
        }

        const chainTokens = this.tokenMappings.get(chainId);
        if (!chainTokens) {
            return [];
        }

        const tokens = Array.from(chainTokens.values());
        
        if (!includeTestnet) {
            return tokens.filter(token => !token.isTestnet);
        }
        
        return tokens;
    }

    /**
     * Get all mainnet tokens
     * @returns {Array}
     */
    getMainnetTokens() {
        if (!this.initialized) {
            throw new BridgeErrors.NotInitializedError('Token configuration not initialized');
        }
        return Array.from(this.mainnetTokens.values());
    }

    /**
     * Get all testnet tokens
     * @returns {Array}
     */
    getTestnetTokens() {
        if (!this.initialized) {
            throw new BridgeErrors.NotInitializedError('Token configuration not initialized');
        }
        return Array.from(this.testnetTokens.values());
    }

    /**
     * Search tokens by symbol or name
     * @param {string} query 
     * @param {boolean} includeTestnet 
     * @returns {Array}
     */
    searchTokens(query, includeTestnet = false) {
        if (!this.initialized) {
            throw new BridgeErrors.NotInitializedError('Token configuration not initialized');
        }

        const lowercaseQuery = query.toLowerCase();
        const results = [];

        // Search mainnet tokens
        for (const token of this.mainnetTokens.values()) {
            if (token.symbol.toLowerCase().includes(lowercaseQuery) || 
                token.name.toLowerCase().includes(lowercaseQuery)) {
                results.push(token);
            }
        }

        // Search testnet tokens if requested
        if (includeTestnet) {
            for (const token of this.testnetTokens.values()) {
                if (token.symbol.toLowerCase().includes(lowercaseQuery) || 
                    token.name.toLowerCase().includes(lowercaseQuery)) {
                    results.push(token);
                }
            }
        }

        return results.sort((a, b) => {
            // Prioritize exact symbol matches
            const aExactSymbol = a.symbol.toLowerCase() === lowercaseQuery;
            const bExactSymbol = b.symbol.toLowerCase() === lowercaseQuery;
            if (aExactSymbol && !bExactSymbol) return -1;
            if (!aExactSymbol && bExactSymbol) return 1;
            
            return a.symbol.localeCompare(b.symbol);
        });
    }

    /**
     * Get tokens by tag
     * @param {string} tag 
     * @param {boolean} includeTestnet 
     * @returns {Array}
     */
    getTokensByTag(tag, includeTestnet = false) {
        if (!this.initialized) {
            throw new BridgeErrors.NotInitializedError('Token configuration not initialized');
        }

        const results = [];

        for (const token of this.mainnetTokens.values()) {
            if (token.tags && token.tags.includes(tag)) {
                results.push(token);
            }
        }

        if (includeTestnet) {
            for (const token of this.testnetTokens.values()) {
                if (token.tags && token.tags.includes(tag)) {
                    results.push(token);
                }
            }
        }

        return results;
    }

    /**
     * Get bridge token mapping
     * @param {number} chainId 
     * @param {string} address 
     * @returns {Object|null}
     */
    getBridgeTokenMapping(chainId, address) {
        if (!this.initialized) {
            return null;
        }
        
        const bridgeKey = `${chainId}-${address}`;
        return this.bridgeTokens.get(bridgeKey) || null;
    }

    /**
     * Get all bridge tokens
     * @returns {Array}
     */
    getAllBridgeTokens() {
        if (!this.initialized) {
            throw new BridgeErrors.NotInitializedError('Token configuration not initialized');
        }
        return Array.from(this.bridgeTokens.values());
    }

    /**
     * Get supported chain IDs
     * @param {boolean} includeTestnet 
     * @returns {Array<number>}
     */
    getSupportedChainIds(includeTestnet = false) {
        if (!this.initialized) {
            throw new BridgeErrors.NotInitializedError('Token configuration not initialized');
        }

        const chainIds = new Set();

        for (const token of this.mainnetTokens.values()) {
            chainIds.add(token.chainId);
        }

        if (includeTestnet) {
            for (const token of this.testnetTokens.values()) {
                chainIds.add(token.chainId);
            }
        }

        return Array.from(chainIds).sort((a, b) => a - b);
    }

    /**
     * Validate token address
     * @param {string} address 
     * @returns {boolean}
     */
    validateTokenAddress(address) {
        if (!address || typeof address !== 'string') {
            return false;
        }

        // Ethereum address validation
        const addressRegex = /^0x[a-fA-F0-9]{40}$/;
        return addressRegex.test(address);
    }

    /**
     * Check if token exists
     * @param {number} chainId 
     * @param {string} address 
     * @param {boolean} includeTestnet 
     * @returns {boolean}
     */
    tokenExists(chainId, address, includeTestnet = false) {
        return this.getToken(chainId, address, includeTestnet) !== null;
    }

    /**
     * Add custom token
     * @param {Object} tokenData 
     * @param {boolean} isTestnet 
     */
    addCustomToken(tokenData, isTestnet = false) {
        if (!this.validateTokenAddress(tokenData.address)) {
            throw new Error('Invalid token address');
        }

        // Prevent adding Bitcoin tokens
        if (this.isBitcoinRelatedToken(tokenData)) {
            throw new Error('Bitcoin tokens are not supported');
        }

        const processedToken = {
            ...tokenData,
            isTestnet,
            custom: true,
            verified: false,
            lastUpdated: Date.now()
        };

        this.processToken(processedToken, isTestnet);
        logger.info(`Added custom token: ${tokenData.symbol} on chain ${tokenData.chainId}`);
    }

    /**
     * Remove custom token
     * @param {number} chainId 
     * @param {string} address 
     */
    removeCustomToken(chainId, address) {
        const tokenKey = `${chainId}-${address}`;
        
        let removed = false;
        if (this.mainnetTokens.has(tokenKey)) {
            const token = this.mainnetTokens.get(tokenKey);
            if (token.custom) {
                this.mainnetTokens.delete(tokenKey);
                removed = true;
            }
        }
        
        if (this.testnetTokens.has(tokenKey)) {
            const token = this.testnetTokens.get(tokenKey);
            if (token.custom) {
                this.testnetTokens.delete(tokenKey);
                removed = true;
            }
        }

        if (removed) {
            const chainMapping = this.tokenMappings.get(chainId);
            if (chainMapping && chainMapping.has(address)) {
                chainMapping.delete(address);
            }
            logger.info(`Removed custom token: ${address} on chain ${chainId}`);
        } else {
            logger.warn(`Cannot remove non-custom token: ${address} on chain ${chainId}`);
        }
    }

    /**
     * Get production token configuration
     * @returns {Object}
     */
    getProductionTokenConfig() {
        if (!this.initialized) {
            throw new BridgeErrors.NotInitializedError('Token configuration not initialized');
        }

        // Final Bitcoin check
        const bitcoinTokens = this.findBitcoinTokens();
        if (bitcoinTokens.length > 0) {
            throw new Error(`PRODUCTION SAFETY: ${bitcoinTokens.length} Bitcoin tokens detected`);
        }

        return {
            extension: {
                ...this.extensionData,
                bitcoinFiltered: true,
                productionMode: this.productionMode,
                ipfsIntegrated: true,
                filteringApplied: {
                    bitcoinTokens: true,
                    deprecatedTestnets: true,
                    invalidChainIds: true
                }
            },
            mainnetTokens: Object.fromEntries(this.mainnetTokens),
            testnetTokens: Object.fromEntries(this.testnetTokens),
            bridgeTokens: Object.fromEntries(this.bridgeTokens),
            tokenMappings: Object.fromEntries(
                Array.from(this.tokenMappings.entries()).map(([chainId, tokens]) => [
                    chainId,
                    Object.fromEntries(tokens)
                ])
            ),
            statistics: this.getStatistics(),
            ipfsConfig: {
                hashes: IPFS_CONFIG.hashes,
                gateways: IPFS_CONFIG.gateways,
                lastUpdated: this.lastUpdated
            },
            productionSafety: {
                bitcoinFiltered: true,
                bitcoinTokensFound: bitcoinTokens.length,
                supportedChains: this.getSupportedChainIds(true),
                excludedChains: [0, ...DEPRECATED_NETWORKS.testnets],
                lastValidated: new Date().toISOString()
            }
        };
    }

    /**
     * Validate production readiness
     * @returns {Object}
     */
    validateProductionReadiness() {
        const validation = {
            isProductionReady: false,
            issues: [],
            warnings: [],
            bitcoinCheck: {
                passed: false,
                bitcoinTokensFound: 0,
                bitcoinChainsFound: []
            },
            ipfsCheck: {
                hashesConfigured: false,
                gatewaysAvailable: false,
                alignerInitialized: false
            }
        };

        if (!this.initialized) {
            validation.issues.push('Token configuration not initialized');
            return validation;
        }

        // Bitcoin validation
        const bitcoinTokens = this.findBitcoinTokens();
        const supportedChains = this.getSupportedChainIds(true);
        const bitcoinChains = supportedChains.filter(chainId => chainId === 0);

        validation.bitcoinCheck.bitcoinTokensFound = bitcoinTokens.length;
        validation.bitcoinCheck.bitcoinChainsFound = bitcoinChains;
        validation.bitcoinCheck.passed = bitcoinTokens.length === 0 && bitcoinChains.length === 0;

        if (bitcoinTokens.length > 0) {
            validation.issues.push(`${bitcoinTokens.length} Bitcoin tokens found`);
        }

        if (bitcoinChains.length > 0) {
            validation.issues.push(`Bitcoin chain IDs found: ${bitcoinChains.join(', ')}`);
        }

        // IPFS validation
        validation.ipfsCheck.hashesConfigured = Object.keys(IPFS_CONFIG.hashes).length > 0;
        validation.ipfsCheck.gatewaysAvailable = IPFS_CONFIG.gateways.length > 0;
        validation.ipfsCheck.alignerInitialized = this.aligner && this.aligner.isInitialized();

        if (!validation.ipfsCheck.hashesConfigured) {
            validation.issues.push('IPFS hashes not configured');
        }

        if (!validation.ipfsCheck.alignerInitialized) {
            validation.warnings.push('TokenListAligner not properly initialized');
        }

        // Token count validation
        if (this.mainnetTokens.size === 0) {
            validation.issues.push('No mainnet tokens loaded');
        }

        if (this.mainnetTokens.size < 50) {
            validation.warnings.push('Low mainnet token count - may indicate loading issues');
        }

        // Performance warnings
        if (this.stats.loadTime > 5000) {
            validation.warnings.push('Slow initialization time');
        }

        validation.isProductionReady = validation.issues.length === 0 && validation.bitcoinCheck.passed;

        return validation;
    }

    /**
     * Get statistics with enhanced filtering info
     * @returns {Object}
     */
    getStatistics() {
        if (!this.initialized) {
            return { initialized: false };
        }

        return {
            initialized: true,
            lastUpdated: this.lastUpdated,
            loadTime: this.stats.loadTime,
            ipfsLoadTime: this.stats.ipfsLoadTime,
            mainnetTokenCount: this.mainnetTokens.size,
            testnetTokenCount: this.testnetTokens.size,
            bridgeTokenCount: this.bridgeTokens.size,
            supportedChains: this.getSupportedChainIds(true).length,
            extensionVersion: this.extensionData?.version || 'unknown',
            cacheSize: this.cache.size,
            productionMode: this.productionMode,
            filtering: {
                bitcoinFilteringEnabled: BITCOIN_FILTER_CONFIG.enabled,
                bitcoinTokensFiltered: this.stats.bitcoinTokensFiltered,
                deprecatedTokensFiltered: this.stats.deprecatedTokensFiltered,
                totalTokensFiltered: this.stats.bitcoinTokensFiltered + this.stats.deprecatedTokensFiltered,
                supportedChainIds: this.getSupportedChainIds(true),
                excludedChainIds: [0, ...DEPRECATED_NETWORKS.testnets]
            },
            ipfs: {
                hashesConfigured: Object.keys(IPFS_CONFIG.hashes).length,
                gatewaysConfigured: IPFS_CONFIG.gateways.length,
                alignerIntegrated: this.aligner && this.aligner.isInitialized()
            }
        };
    }

    /**
     * Export token list in standard format
     * @param {boolean} includeTestnet 
     * @returns {Object}
     */
    exportTokenList(includeTestnet = false) {
        if (!this.initialized) {
            throw new BridgeErrors.NotInitializedError('Token configuration not initialized');
        }

        const tokens = includeTestnet ? 
            [...this.getMainnetTokens(), ...this.getTestnetTokens()] : 
            this.getMainnetTokens();

        return {
            name: this.extensionData?.name || 'Trust Crypto Wallet Token List',
            version: this.extensionData?.version || '2.1.0',
            timestamp: new Date().toISOString(),
            logoURI: 'https://trustcryptowallet.com/assets/images/media/assets/trust_crypto_wallet.png',
            keywords: ['trustcryptowallet', 'bridge', 'cross-chain', 'defi', 'bitcoin-free'],
            tokens: tokens.map(token => ({
                chainId: token.chainId,
                address: token.address,
                name: token.name,
                symbol: token.symbol,
                decimals: token.decimals,
                logoURI: token.logoURI,
                tags: token.tags || []
            })),
            filtering: {
                bitcoinFiltered: true,
                deprecatedNetworksFiltered: true,
                customTokensIncluded: tokens.some(t => t.custom)
            }
        };
    }

    /**
     * Clear cache and refresh
     */
    clearCache() {
        this.cache.clear();
        this.ipfsCache.clear();
        logger.info('Token configuration cache cleared');
    }

    /**
     * Refresh token data
     * @returns {Promise<void>}
     */
    async refresh() {
        logger.info('🔄 Refreshing token configuration...');
        this.clearCache();
        this.initialized = false;
        await this.initialize();
    }

    /**
     * Get extension metadata
     * @returns {Object|null}
     */
    getExtensionMetadata() {
        return this.extensionData;
    }

    /**
     * Get IPFS configuration
     * @returns {Object}
     */
    getIpfsConfig() {
        return {
            hashes: IPFS_CONFIG.hashes,
            gateways: IPFS_CONFIG.gateways,
            cache: IPFS_CONFIG.cache
        };
    }
}

// Create singleton instance
export const tokenConfig = new TokenConfig();

// Export configuration constants for use in other modules
export { IPFS_CONFIG, BITCOIN_FILTER_CONFIG, DEPRECATED_NETWORKS };

// Default export
export default tokenConfig;
