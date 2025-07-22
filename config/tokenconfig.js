/**
 * Trust Crypto Wallet Extension - Token Configuration
 * Production-grade token configuration with Unified Trust Crypto Wallet Token List
 * Integrates extension.json, tokenlist.json, and testnet.json with TokenListAligner
 */

import { logger } from '../src/utils/logger.js';
import { BridgeErrors } from '../src/errors/BridgeErrors.js';

/**
 * Token configuration class with extension-guided URL loading for Trust Crypto Wallet Extension
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
        
        this.urlConfig = {
            extension: 'https://raw.githubusercontent.com/Trusx-crypto-wallet/trust-crypto-wallet-tokenlist/main/extension.json',
            mainnet: null, // Will be set from extension data
            testnet: null  // Will be set from extension data
        };
    }

    /**
     * Initialize token configuration with extension-guided loading and Bitcoin filtering
     * @returns {Promise<void>}
     */
    async initialize() {
        try {
            const startTime = Date.now();
            logger.info('🚀 Initializing BITCOIN-FREE token configuration for Trust Crypto Wallet Extension with TokenListAligner integration...');
            
            // Step 1: Load extension metadata first
            await this.loadExtensionMetadata();
            
            // Step 2: Extract URLs from extension
            this.extractTokenListUrls();
            
            // Step 3: Load actual token data with Bitcoin filtering
            await this.loadTokenDataWithFiltering();
            
            // Step 4: Strict validation against extension expectations + Bitcoin filtering
            await this.validateTokenData();
            
            // Step 5: Final Bitcoin verification
            await this.performFinalBitcoinCheck();
            
            const loadTime = Date.now() - startTime;
            logger.info(`✅ BITCOIN-FREE token configuration initialized in ${loadTime}ms`);
            
            if (loadTime > 200) {
                logger.warn(`⚠️  Load time ${loadTime}ms exceeds target <200ms`);
            }
            
            this.initialized = true;
            this.lastUpdated = new Date().toISOString();

        } catch (error) {
            logger.error('❌ Failed to initialize token configuration:', error);
            logger.warn('🔄 Falling back to Bitcoin-free hardcoded configuration...');
            await this.initializeFallback();
        }
    }

    /**
     * Load token data with comprehensive Bitcoin filtering
     * @returns {Promise<void>}
     */
    async loadTokenDataWithFiltering() {
        logger.info('🔍 Loading token data with STRICT Bitcoin filtering...');
        
        const loadPromises = [];

        // Load mainnet tokens with filtering
        if (this.urlConfig.mainnet) {
            loadPromises.push(
                this.loadMainnetTokens().catch(error => {
                    logger.error('❌ Failed to load mainnet tokens:', error);
                    return null;
                })
            );
        }

        // Load testnet tokens with filtering
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
            throw new Error(`CRITICAL: ${bitcoinTokens.length} Bitcoin tokens found after filtering`);
        }
        
        // Check for Bitcoin-related logos in cache
        const bitcoinLogos = this.findBitcoinLogosInCache();
        if (bitcoinLogos.length > 0) {
            logger.warn(`⚠️  Bitcoin logos found in cache: ${bitcoinLogos.join(', ')}`);
        }
        
        logger.info('✅ Bitcoin verification passed: System is Bitcoin-free');
    }

    /**
     * Find Bitcoin-related logos in cache
     * @returns {Array<string>}
     */
    findBitcoinLogosInCache() {
        const bitcoinLogos = [];
        
        for (const [key, data] of this.cache) {
            if (key.toLowerCase().includes('btc') || 
                key.toLowerCase().includes('bitcoin') ||
                (data.data && JSON.stringify(data.data).toLowerCase().includes('btc'))) {
                bitcoinLogos.push(key);
            }
        }
        
        return bitcoinLogos;
    }

    /**
     * Get Bitcoin-free token configuration for production deployment
     * @returns {Object}
     */
    getProductionTokenConfig() {
        if (!this.initialized) {
            throw new BridgeErrors.NotInitializedError('Token configuration not initialized');
        }

        // Final Bitcoin check before returning production config
        const bitcoinTokens = this.findBitcoinTokens();
        if (bitcoinTokens.length > 0) {
            throw new Error(`PRODUCTION SAFETY: ${bitcoinTokens.length} Bitcoin tokens detected`);
        }

        return {
            extension: {
                ...this.extensionData,
                bitcoinFiltered: true,
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
            urls: {
                extension: this.urlConfig.extension,
                mainnet: this.urlConfig.mainnet,
                testnet: this.urlConfig.testnet
            },
            productionSafety: {
                bitcoinFiltered: true,
                bitcoinTokensFound: bitcoinTokens.length,
                supportedChains: this.getSupportedChainIds(true),
                excludedChains: [0, 5, 80001, 421613, 420],
                lastValidated: new Date().toISOString()
            },
            lastUpdated: this.lastUpdated
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
            }
        };

        // Check initialization
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

        if (bitcoinTokens.length > 0) {
            validation.issues.push(`${bitcoinTokens.length} Bitcoin tokens found`);
        }

        if (bitcoinChains.length > 0) {
            validation.issues.push(`Bitcoin chain IDs found: ${bitcoinChains.join(', ')}`);
        }

        validation.bitcoinCheck.passed = bitcoinTokens.length === 0 && bitcoinChains.length === 0;

        // Check token counts
        if (this.mainnetTokens.size === 0) {
            validation.issues.push('No mainnet tokens loaded');
        }

        // Check URLs accessibility
        if (!this.urlConfig.mainnet || !this.urlConfig.extension) {
            validation.issues.push('Missing required URLs');
        }

        // Warnings for sub-optimal conditions
        if (this.cache.size > 1000) {
            validation.warnings.push('Cache size is very large');
        }

        // Final determination
        validation.isProductionReady = validation.issues.length === 0 && validation.bitcoinCheck.passed;

        return validation;
    }

    /**
     * Load extension metadata first
     * @returns {Promise<void>}
     */
    async loadExtensionMetadata() {
        try {
            const response = await this.fetchWithTimeout(this.urlConfig.extension, 3000);
            this.extensionData = await response.json();
            
            logger.info('Extension metadata loaded:', {
                version: this.extensionData.version,
                name: this.extensionData.name,
                description: this.extensionData.description
            });

            // Log expected counts for validation
            if (this.extensionData.tokenCount) {
                logger.info(`Expected token counts: mainnet=${this.extensionData.tokenCount}, testnet=${this.extensionData.testnetCount || 'unknown'}`);
            }

        } catch (error) {
            logger.error('Failed to load extension metadata:', error);
            throw error;
        }
    }

    /**
     * Extract token list URLs from extension data
     */
    extractTokenListUrls() {
        if (!this.extensionData || !this.extensionData.lists) {
            throw new Error('Extension data missing required lists configuration');
        }

        const lists = this.extensionData.lists;
        
        // Extract mainnet URL
        if (lists.mainnet && lists.mainnet.uri) {
            this.urlConfig.mainnet = lists.mainnet.uri;
            logger.debug(`Mainnet token list URL: ${this.urlConfig.mainnet}`);
        }

        // Extract testnet URL
        if (lists.testnet && lists.testnet.uri) {
            this.urlConfig.testnet = lists.testnet.uri;
            logger.debug(`Testnet token list URL: ${this.urlConfig.testnet}`);
        }

        if (!this.urlConfig.mainnet) {
            throw new Error('Extension missing mainnet token list URL');
        }
    }

    /**
     * Load token data from URLs
     * @returns {Promise<void>}
     */
    async loadTokenData() {
        const loadPromises = [];

        // Load mainnet tokens
        if (this.urlConfig.mainnet) {
            loadPromises.push(
                this.loadMainnetTokens().catch(error => {
                    logger.error('Failed to load mainnet tokens:', error);
                    return null;
                })
            );
        }

        // Load testnet tokens
        if (this.urlConfig.testnet) {
            loadPromises.push(
                this.loadTestnetTokens().catch(error => {
                    logger.error('Failed to load testnet tokens:', error);
                    return null;
                })
            );
        }

        await Promise.all(loadPromises);
    }

    /**
     * Load mainnet token data with Bitcoin filtering
     * @returns {Promise<void>}
     */
    async loadMainnetTokens() {
        const response = await this.fetchWithTimeout(this.urlConfig.mainnet, 5000);
        const tokenData = await response.json();

        if (!tokenData.tokens || !Array.isArray(tokenData.tokens)) {
            throw new Error('Invalid mainnet token data structure');
        }

        let filteredCount = 0;
        let processedCount = 0;

        // Process tokens with STRICT Bitcoin filtering
        for (const token of tokenData.tokens) {
            if (this.isBitcoinRelatedToken(token)) {
                filteredCount++;
                logger.debug(`FILTERED Bitcoin token: ${token.symbol} (${token.name}) on chain ${token.chainId}`);
                continue;
            }

            // Additional filtering for deprecated testnets in mainnet list
            if (this.isDeprecatedTestnet(token.chainId)) {
                filteredCount++;
                logger.debug(`FILTERED deprecated testnet token: ${token.symbol} on deprecated chain ${token.chainId}`);
                continue;
            }

            this.processToken(token, false);
            processedCount++;
        }

        logger.info(`Mainnet tokens loaded: ${processedCount} processed, ${filteredCount} filtered out (Bitcoin + deprecated)`);
    }

    /**
     * Load testnet token data with Bitcoin filtering
     * @returns {Promise<void>}
     */
    async loadTestnetTokens() {
        const response = await this.fetchWithTimeout(this.urlConfig.testnet, 5000);
        const tokenData = await response.json();

        if (!tokenData.tokens || !Array.isArray(tokenData.tokens)) {
            throw new Error('Invalid testnet token data structure');
        }

        let filteredCount = 0;
        let processedCount = 0;

        // Process tokens with STRICT Bitcoin filtering
        for (const token of tokenData.tokens) {
            if (this.isBitcoinRelatedToken(token)) {
                filteredCount++;
                logger.debug(`FILTERED Bitcoin testnet token: ${token.symbol} (${token.name}) on chain ${token.chainId}`);
                continue;
            }

            // Filter deprecated testnets
            if (this.isDeprecatedTestnet(token.chainId)) {
                filteredCount++;
                logger.debug(`FILTERED deprecated testnet: ${token.symbol} on chain ${token.chainId}`);
                continue;
            }

            this.processToken(token, true);
            processedCount++;
        }

        logger.info(`Testnet tokens loaded: ${processedCount} processed, ${filteredCount} filtered out (Bitcoin + deprecated)`);
    }

    /**
     * Check if chainId belongs to deprecated testnet
     * @param {number} chainId 
     * @returns {boolean}
     */
    isDeprecatedTestnet(chainId) {
        const deprecatedTestnets = [
            5,       // Goerli (deprecated)
            80001,   // Mumbai (deprecated, replaced by Amoy)
            421613,  // Arbitrum Goerli (deprecated)
            420      // Optimism Goerli (deprecated)
        ];
        return deprecatedTestnets.includes(chainId);
    }

    /**
     * Validate extension data against actual loaded tokens
     * @returns {Promise<void>}
     */
    async validateTokenData() {
        if (!this.extensionData.tokenCount) {
            logger.warn('Extension metadata missing expected token count');
            return;
        }

        const expectedMainnetCount = this.extensionData.tokenCount;
        const actualMainnetCount = this.mainnetTokens.size;
        
        // Log detailed validation results
        logger.info('=== TOKEN VALIDATION RESULTS ===');
        logger.info(`Expected mainnet tokens: ${expectedMainnetCount}`);
        logger.info(`Actual loaded tokens: ${actualMainnetCount}`);
        
        if (actualMainnetCount !== expectedMainnetCount) {
            logger.warn(`⚠️  Token count mismatch: expected ${expectedMainnetCount}, got ${actualMainnetCount}`);
            logger.info('This is expected due to Bitcoin filtering and deprecated testnet removal');
        } else {
            logger.info(`✅ Token count validation passed: ${actualMainnetCount} tokens`);
        }

        // Validate no Bitcoin tokens made it through
        const bitcoinTokensFound = this.findBitcoinTokens();
        if (bitcoinTokensFound.length > 0) {
            logger.error(`❌ CRITICAL: ${bitcoinTokensFound.length} Bitcoin tokens found after filtering!`);
            bitcoinTokensFound.forEach(token => {
                logger.error(`   - ${token.symbol} (${token.name}) on chain ${token.chainId}`);
            });
            throw new Error('Bitcoin filtering failed - Bitcoin tokens still present');
        } else {
            logger.info('✅ Bitcoin filtering validation passed: No Bitcoin tokens found');
        }

        // Validate bridge count if available
        if (this.extensionData.bridgeCount) {
            const expectedBridgeCount = this.extensionData.bridgeCount;
            const actualBridgeCount = this.bridgeTokens.size;
            
            if (actualBridgeCount < expectedBridgeCount) {
                logger.warn(`Bridge count below expected: expected ${expectedBridgeCount}, got ${actualBridgeCount}`);
            }
        }

        logger.info('=== VALIDATION COMPLETE ===');
    }

    /**
     * Find any Bitcoin tokens that made it through filtering
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
     * Get statistics with Bitcoin filtering info
     * @returns {Object}
     */
    getStatistics() {
        if (!this.initialized) {
            return {
                initialized: false
            };
        }

        return {
            initialized: true,
            lastUpdated: this.lastUpdated,
            mainnetTokenCount: this.mainnetTokens.size,
            testnetTokenCount: this.testnetTokens.size,
            bridgeTokenCount: this.bridgeTokens.size,
            supportedChains: this.getSupportedChainIds(true).length,
            extensionVersion: this.extensionData?.version || 'unknown',
            cacheSize: this.cache.size,
            filtering: {
                bitcoinFilteringEnabled: true,
                deprecatedTestnetFiltering: true,
                bitcoinTokensFound: this.findBitcoinTokens().length,
                supportedChainIds: this.getSupportedChainIds(true),
                filteredChainIds: [0, 5, 80001, 421613, 420] // Bitcoin + deprecated testnets
            }
        };
    }

    /**
     * Process individual token
     * @param {Object} token 
     * @param {boolean} isTestnet 
     */
    processToken(token, isTestnet = false) {
        try {
            // CRITICAL: Filter out Bitcoin and Bitcoin-related tokens
            if (this.isBitcoinRelatedToken(token)) {
                logger.debug(`Filtering out Bitcoin-related token: ${token.symbol}`);
                return;
            }

            // Filter out invalid chain IDs (like Bitcoin chainId: 0)
            if (token.chainId === 0 || token.chainId < 1) {
                logger.debug(`Filtering out token with invalid chainId: ${token.chainId}`);
                return;
            }

            const tokenKey = `${token.chainId}-${token.address}`;
            const processedToken = {
                chainId: token.chainId,
                address: token.address,
                name: token.name,
                symbol: token.symbol,
                decimals: token.decimals,
                logoURI: token.logoURI || this.getDefaultTokenLogo(token.symbol),
                tags: token.tags || [],
                bridgeTokens: token.bridgeTokens || [],
                extensions: token.extensions || {},
                isTestnet,
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
     * Enhanced Bitcoin detection with comprehensive filtering (5-tier system)
     * @param {Object} token 
     * @returns {boolean}
     */
    isBitcoinRelatedToken(token) {
        // 1. Filter by symbol (comprehensive list)
        const bitcoinSymbols = [
            'BTC', 'WBTC', 'BTCB', 'HBTC', 'RENBTC', 'SBTC', 
            'TBTC', 'OBTC', 'PBTC', 'VBTC', 'XBTC'
        ];
        if (bitcoinSymbols.includes(token.symbol?.toUpperCase())) {
            return true;
        }

        // 2. Filter by name (case-insensitive)
        const bitcoinNamePatterns = [
            'bitcoin', 'wrapped bitcoin', 'synthetic bitcoin', 
            'tokenized bitcoin', 'bitcoin token'
        ];
        const tokenNameLower = token.name?.toLowerCase() || '';
        if (bitcoinNamePatterns.some(pattern => tokenNameLower.includes(pattern))) {
            return true;
        }

        // 3. Filter by chainId (Bitcoin networks)
        const bitcoinChainIds = [0]; // Bitcoin mainnet uses chainId: 0
        if (bitcoinChainIds.includes(token.chainId)) {
            return true;
        }

        // 4. Filter by logo URI containing bitcoin references
        const logoURI = token.logoURI?.toLowerCase() || '';
        const bitcoinLogoPatterns = ['btc', 'bitcoin', 'wbtc'];
        if (bitcoinLogoPatterns.some(pattern => logoURI.includes(pattern))) {
            return true;
        }

        // 5. Filter by address patterns (known Bitcoin token addresses)
        const knownBitcoinAddresses = [
            '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', // WBTC on Ethereum
            '0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c', // BTCB on BSC
            '0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6'  // WBTC on Polygon
        ];
        if (knownBitcoinAddresses.includes(token.address)) {
            return true;
        }

        return false;
    }

    /**
     * Process bridge tokens for a token
     * @param {Object} sourceToken 
     * @param {Array} bridgeTokens 
     */
    processBridgeTokens(sourceToken, bridgeTokens) {
        for (const bridgeToken of bridgeTokens) {
            const bridgeKey = `${bridgeToken.chainId}-${bridgeToken.address}`;
            
            this.bridgeTokens.set(bridgeKey, {
                sourceChainId: sourceToken.chainId,
                sourceAddress: sourceToken.address,
                sourceSymbol: sourceToken.symbol,
                targetChainId: bridgeToken.chainId,
                targetAddress: bridgeToken.address,
                protocol: bridgeToken.protocol,
                bridgeContract: bridgeToken.bridgeContract,
                fees: bridgeToken.fees || {},
                limits: bridgeToken.limits || {}
            });
        }
    }

    /**
     * Add token to chain mapping
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
     * Get default token logo
     * @param {string} symbol 
     * @returns {string}
     */
    getDefaultTokenLogo(symbol) {
        const logoMap = {
            'ETH': '/public/images/tokens/eth-logo.png',
            'WETH': '/public/images/tokens/weth-logo.png',
            'USDT': '/public/images/tokens/usdt.png',
            'USDC': '/public/images/tokens/usdc.png',
            'DAI': '/public/images/tokens/dai.png',
            'BNB': '/public/images/tokens/bnb-logo.png',
            'MATIC': '/public/images/tokens/matic-logo.png',
            'ARB': '/public/images/tokens/arb-logo.png',
            'OP': '/public/images/tokens/op-logo.png',
            'AVAX': '/public/images/tokens/avax-logo.png',
            'UNI': '/public/images/tokens/uni-logo.png',
            'AAVE': '/public/images/tokens/aave-logo.png',
            'CROSSCHAIN-USDT': '/public/images/tokens/crosschain-usdt.png'
        };

        return logoMap[symbol.toUpperCase()] || '/public/images/tokens/unknown-token.png';
    }

    /**
     * Validate token data against extension expectations
     * @returns {Promise<void>}
     */
    async validateTokenData() {
        if (!this.extensionData.tokenCount) {
            logger.warn('Extension metadata missing expected token count');
            return;
        }

        const expectedMainnetCount = this.extensionData.tokenCount;
        const actualMainnetCount = this.mainnetTokens.size;
        
        if (actualMainnetCount !== expectedMainnetCount) {
            logger.warn(`Token count mismatch: expected ${expectedMainnetCount}, got ${actualMainnetCount}`);
        } else {
            logger.info(`✅ Token count validation passed: ${actualMainnetCount} tokens`);
        }

        // Validate bridge count if available
        if (this.extensionData.bridgeCount) {
            const expectedBridgeCount = this.extensionData.bridgeCount;
            const actualBridgeCount = this.bridgeTokens.size;
            
            if (actualBridgeCount < expectedBridgeCount) {
                logger.warn(`Bridge count below expected: expected ${expectedBridgeCount}, got ${actualBridgeCount}`);
            }
        }
    }

    /**
     * Fetch URL with timeout and caching
     * @param {string} url 
     * @param {number} timeout 
     * @returns {Promise<Response>}
     */
    async fetchWithTimeout(url, timeout = 5000) {
        // Check cache first
        const cacheKey = `fetch-${url}`;
        const cached = this.cache.get(cacheKey);
        if (cached && (Date.now() - cached.timestamp) < 60000) { // 1 minute cache
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
                    'User-Agent': 'TrustWallet-Extension/2.1.0'
                }
            });
            
            if (!response.ok) {
                if (response.status === 429) {
                    throw new Error('GitHub rate limit exceeded');
                }
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            // Cache successful responses
            const data = await response.json();
            this.cache.set(cacheKey, {
                data,
                timestamp: Date.now()
            });
            
            return new Response(JSON.stringify(data), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
            
        } finally {
            clearTimeout(timeoutId);
        }
    }

    /**
     * Initialize fallback configuration with hardcoded tokens
     * @returns {Promise<void>}
     */
    async initializeFallback() {
        logger.warn('Using fallback token configuration');
        
        // Hardcoded fallback tokens - mainnet (BITCOIN REMOVED)
        const fallbackMainnetTokens = [
            {
                chainId: 1,
                address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
                name: 'Ethereum',
                symbol: 'ETH',
                decimals: 18,
                logoURI: '/public/images/tokens/eth-logo.png'
            },
            {
                chainId: 1,
                address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
                name: 'Tether USD',
                symbol: 'USDT',
                decimals: 6,
                logoURI: '/public/images/tokens/usdt.png'
            },
            {
                chainId: 1,
                address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
                name: 'USD Coin',
                symbol: 'USDC',
                decimals: 6,
                logoURI: '/public/images/tokens/usdc.png'
            },
            {
                chainId: 1,
                address: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
                name: 'Dai Stablecoin',
                symbol: 'DAI',
                decimals: 18,
                logoURI: '/public/images/tokens/dai.png'
            },
            {
                chainId: 1,
                address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
                name: 'Wrapped Ether',
                symbol: 'WETH',
                decimals: 18,
                logoURI: '/public/images/tokens/weth-logo.png'
            },
            {
                chainId: 137,
                address: '0x0000000000000000000000000000000000001010',
                name: 'Polygon',
                symbol: 'MATIC',
                decimals: 18,
                logoURI: '/public/images/tokens/matic-logo.png'
            },
            {
                chainId: 56,
                address: '0x0000000000000000000000000000000000000000',
                name: 'BNB',
                symbol: 'BNB',
                decimals: 18,
                logoURI: '/public/images/tokens/bnb-logo.png'
            }
        ];

        // Process fallback tokens
        for (const token of fallbackMainnetTokens) {
            this.processToken(token, false);
        }

        // Create minimal extension data
        this.extensionData = {
            version: '2.1.0',
            name: 'Trust Crypto Wallet Extension Token List',
            tokenCount: fallbackMainnetTokens.length,
            bridgeCount: 0,
            lists: {
                mainnet: { uri: 'fallback' },
                testnet: { uri: 'fallback' }
            }
        };

        this.initialized = true;
        this.lastUpdated = new Date().toISOString();
    }

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
        
        // Check mainnet tokens first
        if (this.mainnetTokens.has(tokenKey)) {
            return this.mainnetTokens.get(tokenKey);
        }

        // Check testnet tokens if requested
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
     * Get all tokens (mainnet + testnet)
     * @returns {Array}
     */
    getAllTokens() {
        if (!this.initialized) {
            throw new BridgeErrors.NotInitializedError('Token configuration not initialized');
        }
        return [...this.getMainnetTokens(), ...this.getTestnetTokens()];
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

        return results.sort((a, b) => a.symbol.localeCompare(b.symbol));
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

        // Search mainnet tokens
        for (const token of this.mainnetTokens.values()) {
            if (token.tags && token.tags.includes(tag)) {
                results.push(token);
            }
        }

        // Search testnet tokens if requested
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
     * Validate token address
     * @param {string} address 
     * @returns {boolean}
     */
    validateTokenAddress(address) {
        if (!address || typeof address !== 'string') {
            return false;
        }

        // Basic Ethereum address validation
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
     * Get supported chain IDs
     * @param {boolean} includeTestnet 
     * @returns {Array<number>}
     */
    getSupportedChainIds(includeTestnet = false) {
        if (!this.initialized) {
            throw new BridgeErrors.NotInitializedError('Token configuration not initialized');
        }

        const chainIds = new Set();

        // Add mainnet chain IDs
        for (const token of this.mainnetTokens.values()) {
            chainIds.add(token.chainId);
        }

        // Add testnet chain IDs if requested
        if (includeTestnet) {
            for (const token of this.testnetTokens.values()) {
                chainIds.add(token.chainId);
            }
        }

        return Array.from(chainIds).sort((a, b) => a - b);
    }

    /**
     * Get token count by chain
     * @param {number} chainId 
     * @param {boolean} includeTestnet 
     * @returns {number}
     */
    getTokenCountForChain(chainId, includeTestnet = false) {
        const tokens = this.getTokensForChain(chainId, includeTestnet);
        return tokens.length;
    }

    /**
     * Get extension metadata
     * @returns {Object|null}
     */
    getExtensionMetadata() {
        return this.extensionData;
    }

    /**
     * Get configuration statistics
     * @returns {Object}
     */
    getStatistics() {
        if (!this.initialized) {
            return {
                initialized: false
            };
        }

        return {
            initialized: true,
            lastUpdated: this.lastUpdated,
            mainnetTokenCount: this.mainnetTokens.size,
            testnetTokenCount: this.testnetTokens.size,
            bridgeTokenCount: this.bridgeTokens.size,
            supportedChains: this.getSupportedChainIds(true).length,
            extensionVersion: this.extensionData?.version || 'unknown',
            cacheSize: this.cache.size
        };
    }

    /**
     * Switch between mainnet and testnet mode
     * @param {boolean} useTestnet 
     */
    switchNetworkMode(useTestnet) {
        // This method could be used to implement mainnet/testnet switching
        // Currently handled by the includeTestnet parameter in other methods
        logger.info(`Network mode switched to: ${useTestnet ? 'testnet' : 'mainnet'}`);
    }

    /**
     * Clear cache
     */
    clearCache() {
        this.cache.clear();
        logger.info('Token configuration cache cleared');
    }

    /**
     * Refresh token data
     * @returns {Promise<void>}
     */
    async refresh() {
        logger.info('Refreshing token configuration...');
        this.clearCache();
        await this.initialize();
    }

    /**
     * Get private token configuration for deployment
     * @returns {Object}
     */
    getPrivateTokenConfig() {
        if (!this.initialized) {
            throw new BridgeErrors.NotInitializedError('Token configuration not initialized');
        }

        return {
            extension: this.extensionData,
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
            urls: {
                extension: this.urlConfig.extension,
                mainnet: this.urlConfig.mainnet,
                testnet: this.urlConfig.testnet
            },
            lastUpdated: this.lastUpdated
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

        const tokens = includeTestnet ? this.getAllTokens() : this.getMainnetTokens();

        return {
            name: this.extensionData?.name || 'Trust Wallet Token List',
            version: this.extensionData?.version || '2.1.0',
            timestamp: new Date().toISOString(),
            logoURI: 'https://trustwallet.com/assets/images/media/assets/trust_wallet.png',
            keywords: ['trustwallet', 'bridge', 'cross-chain', 'defi'],
            tokens: tokens.map(token => ({
                chainId: token.chainId,
                address: token.address,
                name: token.name,
                symbol: token.symbol,
                decimals: token.decimals,
                logoURI: token.logoURI,
                tags: token.tags || []
            }))
        };
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

        const processedToken = {
            ...tokenData,
            isTestnet,
            custom: true,
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
        
        // Remove from mainnet or testnet
        let removed = false;
        if (this.mainnetTokens.has(tokenKey)) {
            this.mainnetTokens.delete(tokenKey);
            removed = true;
        }
        if (this.testnetTokens.has(tokenKey)) {
            this.testnetTokens.delete(tokenKey);
            removed = true;
        }

        // Remove from chain mapping
        const chainMapping = this.tokenMappings.get(chainId);
        if (chainMapping && chainMapping.has(address)) {
            chainMapping.delete(address);
        }

        if (removed) {
            logger.info(`Removed custom token: ${address} on chain ${chainId}`);
        }
    }
}

// Create singleton instance
export const tokenConfig = new TokenConfig();

// Default export
export default tokenConfig;
