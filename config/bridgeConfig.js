/**
 * Trust Crypto Wallet Extension - Bridge Configuration
 * Production-grade bridge protocol configuration with IPFS integration
 * Supports LayerZero, Wormhole, Axelar, Hyperlane, Chainlink, Hop, Across protocols
 */

import { BridgeErrors } from '../src/errors/BridgeErrors.js';
import { logger } from '../src/utils/logger.js';
import { TokenListAligner } from '../src/alignment/TokenListAligner.js';

/**
 * IPFS Configuration for Bridge Data
 * These hashes must be updated for production deployment
 */
const BRIDGE_IPFS_CONFIG = {
    // IPFS Gateway Configuration
    gateways: [
        'https://ipfs.io/ipfs/',
        'https://cloudflare-ipfs.com/ipfs/',
        'https://gateway.pinata.cloud/ipfs/',
        'https://dweb.link/ipfs/'
    ],
    
    // Bridge IPFS Hashes - MUST BE UPDATED FOR PRODUCTION
    hashes: {
        bridgeMetadata: 'bafkreieedvgfhn3c3epkwtixy6dbewpaanlaotjacievrbsknuowimhrra', // bridge-metadata.json
        bridgeSchema: 'bafkreiczapkfclas6qigtdhp32e3irqqquyq3cmrccdoxrzkf5k2a3j23q', // bridge-registry-schema.json
        tokenlist: 'bafkreida6oqbjj4zot3iui43qyautdsszznsnx2pbsudocafhgcnwcchqq', // tokenlist.json for bridge tokens
        mainnetTokenlist: 'bafkreidrjqn645yqrpyoctbx6awbf6gwio47n2hk54qpgcnaxypgugrj6a', // mainnet-tokenlist.json
        testnetTokenlist: 'bafkreibiwwrs5xmhgyp3pvdl3xrdzryxzl5oyq6lh7dl3qbxa63vgl33da' // testnet-tokenlist.json
    },
    
    // Fallback GitHub URLs
    fallbackUrls: {
        extension: 'https://raw.githubusercontent.com/Trusx-crypto-wallet/trust-crypto-wallet-tokenlist/main/extension.json',
        tokenlist: 'https://raw.githubusercontent.com/Trusx-crypto-wallet/trust-crypto-wallet-tokenlist/main/tokenlist.json',
        bridgeMetadata: 'https://raw.githubusercontent.com/Trusx-crypto-wallet/trust-crypto-wallet-tokenlist/main/bridge-metadata.json',
        assetBase: 'https://raw.githubusercontent.com/Trusx-crypto-wallet/trust-crypto-wallet-tokenlist/main/images/bridges/'
    },
    
    // Cache settings
    cache: {
        ttl: 300000, // 5 minutes
        maxSize: 50,
        enablePersistent: true
    }
};

/**
 * Bridge Protocol Configuration
 */
const BRIDGE_PROTOCOLS = {
    layerzero: {
        name: 'LayerZero',
        type: 'omnichain',
        versions: ['v1', 'v2'],
        logo: 'layerzero-bridge-64.png',
        security: 'high',
        gasOptimized: true
    },
    wormhole: {
        name: 'Wormhole',
        type: 'cross-chain',
        versions: ['v2'],
        logo: 'wormhole-bridge-64.png',
        security: 'high',
        gasOptimized: false
    },
    axelar: {
        name: 'Axelar',
        type: 'cross-chain',
        versions: ['v1'],
        logo: 'axelar-bridge-64.png',
        security: 'medium',
        gasOptimized: true
    },
    hyperlane: {
        name: 'Hyperlane',
        type: 'interchain',
        versions: ['v3'],
        logo: 'hyperlane-bridge-64.png',
        security: 'high',
        gasOptimized: true
    },
    chainlink: {
        name: 'Chainlink CCIP',
        type: 'cross-chain',
        versions: ['v1'],
        logo: 'chainlink-bridge-64.png',
        security: 'high',
        gasOptimized: false
    },
    hop: {
        name: 'Hop Protocol',
        type: 'optimistic',
        versions: ['v1'],
        logo: 'hop-bridge-64.png',
        security: 'medium',
        gasOptimized: true
    },
    across: {
        name: 'Across Protocol',
        type: 'optimistic',
        versions: ['v2'],
        logo: 'across-bridge-64.png',
        security: 'medium',
        gasOptimized: true
    }
};

/**
 * Production Bridge Configuration Class
 */
export class BridgeConfig {
    constructor() {
        this.bridgeData = new Map();
        this.protocolMappings = new Map();
        this.bridgeTokenMappings = new Map();
        this.assetCache = new Map();
        this.ipfsCache = new Map();
        this.initialized = false;
        this.lastUpdated = null;
        this.aligner = new TokenListAligner();
        this.productionMode = process.env.NODE_ENV === 'production';
        
        this.urlConfig = {
            bridges: BRIDGE_IPFS_CONFIG.fallbackUrls.tokenlist,
            extension: BRIDGE_IPFS_CONFIG.fallbackUrls.extension,
            bridgeMetadata: BRIDGE_IPFS_CONFIG.fallbackUrls.bridgeMetadata,
            assetBase: BRIDGE_IPFS_CONFIG.fallbackUrls.assetBase,
            ipfsGateway: BRIDGE_IPFS_CONFIG.gateways[0]
        };

        this.stats = {
            protocolsLoaded: 0,
            bridgesLoaded: 0,
            tokenMappingsLoaded: 0,
            loadTime: 0,
            ipfsLoadTime: 0
        };
    }

    /**
     * Initialize bridge configuration with IPFS integration
     * @returns {Promise<void>}
     */
    async initialize() {
        try {
            const startTime = Date.now();
            logger.info('🚀 Initializing Trust Crypto Wallet Bridge configuration with IPFS integration...');
            
            // Step 1: Initialize TokenListAligner for bridge data
            await this.initializeAligner();
            
            // Step 2: Load bridge metadata with IPFS fallback
            await this.loadBridgeMetadata();
            
            // Step 3: Load token data for bridge mappings
            await this.loadTokenDataForBridges();
            
            // Step 4: Process bridge protocols and configurations
            await this.processBridgeProtocols();
            
            // Step 5: Map bridge tokens and validate
            await this.mapBridgeTokens();
            
            // Step 6: Load bridge assets and finalize
            await this.loadBridgeAssets();
            
            // Step 7: Finalize initialization
            this.stats.loadTime = Date.now() - startTime;
            this.initialized = true;
            this.lastUpdated = new Date().toISOString();

            logger.info(`✅ Trust Crypto Wallet Bridge configuration initialized in ${this.stats.loadTime}ms`);
            this.logInitializationStats();

        } catch (error) {
            logger.error('❌ Failed to initialize bridge configuration:', error);
            logger.warn('🔄 Falling back to hardcoded bridge configuration...');
            await this.initializeFallback();
        }
    }

    /**
     * Initialize TokenListAligner for bridge data
     * @returns {Promise<void>}
     */
    async initializeAligner() {
        try {
            const ipfsStartTime = Date.now();
            logger.info('🔗 Initializing TokenListAligner for bridge data...');
            
            await this.aligner.initialize({
                ipfsHashes: BRIDGE_IPFS_CONFIG.hashes,
                gateways: BRIDGE_IPFS_CONFIG.gateways,
                fallbackUrls: BRIDGE_IPFS_CONFIG.fallbackUrls,
                focusMode: 'bridges' // Focus on bridge-related data
            });
            
            this.stats.ipfsLoadTime = Date.now() - ipfsStartTime;
            logger.info(`✅ TokenListAligner for bridges initialized in ${this.stats.ipfsLoadTime}ms`);
            
        } catch (error) {
            logger.warn('⚠️ TokenListAligner initialization failed, using direct IPFS loading');
        }
    }

    /**
     * Load bridge metadata with IPFS integration
     * @returns {Promise<void>}
     */
    async loadBridgeMetadata() {
        try {
            // Try to get bridge metadata from aligner first
            const alignedMetadata = await this.aligner.getBridgeMetadata();
            if (alignedMetadata) {
                this.bridgeMetadata = alignedMetadata;
                logger.info('📋 Bridge metadata loaded from TokenListAligner');
                return;
            }

            // Fallback to direct IPFS/URL loading
            const metadataUrl = this.buildIpfsUrl(BRIDGE_IPFS_CONFIG.hashes.bridgeMetadata);
            const response = await this.fetchWithIpfsFallback(metadataUrl);
            this.bridgeMetadata = await response.json();
            
            logger.info('📋 Bridge metadata loaded from IPFS/fallback');

        } catch (error) {
            logger.error('❌ Failed to load bridge metadata:', error);
            throw error;
        }
    }

    /**
     * Load token data for bridge mappings
     * @returns {Promise<void>}
     */
    async loadTokenDataForBridges() {
        try {
            // Try to get token data from aligner
            const alignedTokens = await this.aligner.getAllTokensWithBridges();
            if (alignedTokens && alignedTokens.length > 0) {
                this.tokenDataForBridges = alignedTokens;
                logger.info(`📄 Token data for bridges loaded from aligner: ${alignedTokens.length} tokens`);
                return;
            }

            // Fallback to direct loading
            const tokenlistUrl = this.buildIpfsUrl(BRIDGE_IPFS_CONFIG.hashes.tokenlist);
            const response = await this.fetchWithIpfsFallback(tokenlistUrl);
            const tokenData = await response.json();
            
            this.tokenDataForBridges = tokenData.tokens || [];
            logger.info(`📄 Token data loaded from IPFS: ${this.tokenDataForBridges.length} tokens`);

        } catch (error) {
            logger.error('❌ Failed to load token data for bridges:', error);
            this.tokenDataForBridges = [];
        }
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
            for (const gateway of BRIDGE_IPFS_CONFIG.gateways) {
                try {
                    const ipfsUrl = `${gateway}${ipfsHash}`;
                    return await this.fetchWithTimeout(ipfsUrl, 5000);
                } catch (error) {
                    logger.debug(`IPFS gateway failed: ${gateway}`);
                }
            }
        }

        throw new Error('All bridge data sources failed');
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
     * Process bridge protocols from metadata and configuration
     * @returns {Promise<void>}
     */
    async processBridgeProtocols() {
        try {
            // Process protocols from bridge metadata if available
            if (this.bridgeMetadata?.protocols) {
                for (const protocol of this.bridgeMetadata.protocols) {
                    await this.processProtocol(protocol);
                }
            }

            // Process built-in protocols
            for (const [protocolId, protocolConfig] of Object.entries(BRIDGE_PROTOCOLS)) {
                if (!this.protocolMappings.has(protocolId)) {
                    await this.processBuiltInProtocol(protocolId, protocolConfig);
                }
            }

            this.stats.protocolsLoaded = this.protocolMappings.size;
            logger.info(`✅ Processed ${this.stats.protocolsLoaded} bridge protocols`);

        } catch (error) {
            logger.error('❌ Failed to process bridge protocols:', error);
        }
    }

    /**
     * Process individual protocol from metadata
     * @param {Object} protocol 
     */
    async processProtocol(protocol) {
        try {
            const logoUrl = await this.getAssetUrl(protocol.logo || `${protocol.id}-bridge-64.png`);
            
            this.protocolMappings.set(protocol.id, {
                id: protocol.id,
                name: protocol.name,
                type: protocol.type,
                version: protocol.version,
                logo: logoUrl,
                chains: protocol.chains || [],
                endpoints: protocol.endpoints || {},
                fees: protocol.fees || {},
                limits: protocol.limits || {},
                security: protocol.security || 'medium',
                gasOptimized: protocol.gasOptimized || false,
                status: protocol.status || 'active'
            });
            
            logger.debug(`✅ Processed protocol: ${protocol.name}`);
        } catch (error) {
            logger.warn(`⚠️ Failed to process protocol ${protocol.id}:`, error);
        }
    }

    /**
     * Process built-in protocol configuration
     * @param {string} protocolId 
     * @param {Object} protocolConfig 
     */
    async processBuiltInProtocol(protocolId, protocolConfig) {
        try {
            const logoUrl = await this.getAssetUrl(protocolConfig.logo);
            
            // Get protocol-specific configuration
            const protocolData = this.getProtocolDefaults(protocolId);
            
            this.protocolMappings.set(protocolId, {
                id: protocolId,
                name: protocolConfig.name,
                type: protocolConfig.type,
                version: protocolConfig.versions[0], // Use latest version
                logo: logoUrl,
                chains: protocolData.chains,
                endpoints: protocolData.endpoints,
                fees: protocolData.fees,
                limits: protocolData.limits,
                security: protocolConfig.security,
                gasOptimized: protocolConfig.gasOptimized,
                status: 'active'
            });
            
            logger.debug(`✅ Processed built-in protocol: ${protocolConfig.name}`);
        } catch (error) {
            logger.warn(`⚠️ Failed to process built-in protocol ${protocolId}:`, error);
        }
    }

    /**
     * Get protocol defaults for built-in protocols
     * @param {string} protocolId 
     * @returns {Object}
     */
    getProtocolDefaults(protocolId) {
        const defaults = {
            layerzero: {
                chains: [1, 10, 137, 42161, 43114, 56, 8453, 59144],
                endpoints: {
                    mainnet: '0x3c2269811836af69497E5F486A85D7316753cf62',
                    polygon: '0x3c2269811836af69497E5F486A85D7316753cf62',
                    arbitrum: '0x3c2269811836af69497E5F486A85D7316753cf62',
                    optimism: '0x3c2269811836af69497E5F486A85D7316753cf62',
                    base: '0x3c2269811836af69497E5F486A85D7316753cf62'
                },
                fees: { base: '0.001', variable: '0.05%' },
                limits: { min: '10', max: '1000000' }
            },
            wormhole: {
                chains: [1, 10, 137, 42161, 43114, 56, 250, 25],
                endpoints: {
                    mainnet: '0x98f3c9e6E3fAce36bAAd05FE09d375Ef1464288B',
                    polygon: '0x7A4B5a56256163F07b2C80A7cA55aBE66c4ec4d7',
                    arbitrum: '0xa5f208e072434bC67592E4C49C1B991BA79BCA46'
                },
                fees: { base: '0.002', variable: '0.1%' },
                limits: { min: '1', max: '500000' }
            },
            axelar: {
                chains: [1, 56, 137, 43114, 250, 25],
                endpoints: {
                    gateway: '0x4F4495243837681061C4743b74B3eEdf548D56A5',
                    gasService: '0x2d5d7d31F671F86C782533cc367F14109a082712'
                },
                fees: { base: '0.005', gas: 'dynamic' },
                limits: { min: '5', max: '100000' }
            },
            hyperlane: {
                chains: [1, 10, 137, 42161, 43114, 56],
                endpoints: {
                    mailbox: '0xc005dc82818d67AF737725bD4bf75435d065D239',
                    igp: '0x9A10DFaB4C8a98bc9C1E4C39c715dc4fa5120dD5'
                },
                fees: { base: '0.003', gas: 'estimated' },
                limits: { min: '1', max: '250000' }
            },
            chainlink: {
                chains: [1, 10, 137, 42161, 43114, 56],
                endpoints: {
                    router: '0x80226fc0Ee2b096224EeAc085Bb9a8cba1146f7D',
                    arm: '0x28c4A1Fa47EEE9226F8dE7D6AF0a41C62Ca98267'
                },
                fees: { base: '0.004', variable: '0.08%' },
                limits: { min: '10', max: '750000' }
            },
            hop: {
                chains: [1, 10, 137, 42161, 100, 8453],
                endpoints: {
                    mainnet: '0xb8901acB165ed027E32754E0FFe830802919727f',
                    polygon: '0x58c61AeE5eD3D748a1467085ED2650B697A66234',
                    arbitrum: '0x0e0E3d2C5c292161999474247956EF542caBF8dd'
                },
                fees: { base: '0.002', bonder: '0.04%' },
                limits: { min: '1', max: '100000' }
            },
            across: {
                chains: [1, 10, 137, 42161, 8453],
                endpoints: {
                    spokePool: '0x4D9079Bb4165aeb4084c526a32695dCfd2F77381',
                    hubPool: '0xc186fA914353c44b2E33eBE05f21846F1048bEda'
                },
                fees: { base: '0.001', relayer: '0.25%' },
                limits: { min: '5', max: '500000' }
            }
        };

        return defaults[protocolId] || {
            chains: [],
            endpoints: {},
            fees: {},
            limits: {}
        };
    }

    /**
     * Map bridge tokens from token data
     * @returns {Promise<void>}
     */
    async mapBridgeTokens() {
        try {
            let mappingCount = 0;
            
            for (const token of this.tokenDataForBridges) {
                if (token.bridgeTokens && Array.isArray(token.bridgeTokens)) {
                    for (const bridgeToken of token.bridgeTokens) {
                        const key = `${bridgeToken.chainId}-${bridgeToken.address}`;
                        this.bridgeTokenMappings.set(key, {
                            ...bridgeToken,
                            sourceToken: token.address,
                            sourceChain: token.chainId,
                            symbol: token.symbol,
                            name: token.name,
                            decimals: token.decimals,
                            logoURI: token.logoURI
                        });
                        mappingCount++;
                    }
                }
            }
            
            this.stats.tokenMappingsLoaded = mappingCount;
            logger.info(`✅ Mapped ${mappingCount} bridge token relationships`);

        } catch (error) {
            logger.error('❌ Failed to map bridge tokens:', error);
        }
    }

    /**
     * Load bridge assets and cache URLs
     * @returns {Promise<void>}
     */
    async loadBridgeAssets() {
        try {
            const assetPromises = [];
            
            // Load protocol logos
            for (const protocol of this.protocolMappings.values()) {
                if (protocol.logo && !this.assetCache.has(protocol.logo)) {
                    assetPromises.push(this.preloadAsset(protocol.logo));
                }
            }
            
            await Promise.allSettled(assetPromises);
            logger.info(`✅ Preloaded ${this.assetCache.size} bridge assets`);

        } catch (error) {
            logger.warn('⚠️ Some bridge assets failed to preload:', error);
        }
    }

    /**
     * Preload asset and cache URL
     * @param {string} filename 
     * @returns {Promise<void>}
     */
    async preloadAsset(filename) {
        try {
            await this.getAssetUrl(filename);
        } catch (error) {
            logger.debug(`Failed to preload asset: ${filename}`);
        }
    }

    /**
     * Get asset URL with caching and IPFS support
     * @param {string} filename 
     * @returns {Promise<string>}
     */
    async getAssetUrl(filename) {
        if (this.assetCache.has(filename)) {
            return this.assetCache.get(filename);
        }

        // Try IPFS/remote URL first
        const remoteUrl = `${this.urlConfig.assetBase}${filename}`;
        
        try {
            const response = await this.fetchWithTimeout(remoteUrl, 3000);
            if (response.ok) {
                this.assetCache.set(filename, remoteUrl);
                return remoteUrl;
            }
        } catch (error) {
            logger.debug(`Remote asset not found: ${filename}`);
        }

        // Fallback to local asset
        const fallbackUrl = `/public/images/bridges/${filename}`;
        this.assetCache.set(filename, fallbackUrl);
        return fallbackUrl;
    }

    /**
     * Fetch URL with timeout and enhanced error handling
     * @param {string} url 
     * @param {number} timeout 
     * @returns {Promise<Response>}
     */
    async fetchWithTimeout(url, timeout = 5000) {
        const cacheKey = `fetch-${url}`;
        const cached = this.ipfsCache.get(cacheKey);
        
        if (cached && (Date.now() - cached.timestamp) < BRIDGE_IPFS_CONFIG.cache.ttl) {
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
            
            // Cache successful JSON responses
            if (response.headers.get('content-type')?.includes('application/json')) {
                const data = await response.json();
                this.ipfsCache.set(cacheKey, {
                    data,
                    timestamp: Date.now()
                });
                
                return new Response(JSON.stringify(data), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' }
                });
            }
            
            return response;
            
        } finally {
            clearTimeout(timeoutId);
        }
    }

    /**
     * Initialize fallback configuration
     * @returns {Promise<void>}
     */
    async initializeFallback() {
        logger.warn('🔄 Using fallback bridge configuration for Trust Crypto Wallet Extension');
        
        // Process built-in protocols with fallback data
        for (const [protocolId, protocolConfig] of Object.entries(BRIDGE_PROTOCOLS)) {
            await this.processBuiltInProtocol(protocolId, protocolConfig);
        }

        this.initialized = true;
        this.lastUpdated = new Date().toISOString();
        
        logger.info(`✅ Fallback bridge configuration loaded: ${this.protocolMappings.size} protocols`);
    }

    /**
     * Log initialization statistics
     */
    logInitializationStats() {
        logger.info('=== BRIDGE INITIALIZATION STATISTICS ===');
        logger.info(`Total load time: ${this.stats.loadTime}ms`);
        logger.info(`IPFS load time: ${this.stats.ipfsLoadTime}ms`);
        logger.info(`Protocols loaded: ${this.stats.protocolsLoaded}`);
        logger.info(`Token mappings: ${this.stats.tokenMappingsLoaded}`);
        logger.info(`Assets cached: ${this.assetCache.size}`);
        logger.info(`Supported chains: ${this.getSupportedChains().length}`);
        logger.info('=== BRIDGE STATISTICS COMPLETE ===');
    }

    // =================================================================
    // PUBLIC API METHODS
    // =================================================================

    /**
     * Get bridge by ID
     * @param {string} bridgeId 
     * @returns {Object|null}
     */
    getBridge(bridgeId) {
        if (!this.initialized) {
            throw new BridgeErrors.NotInitializedError('Bridge configuration not initialized');
        }
        return this.bridgeData.get(bridgeId) || null;
    }

    /**
     * Get protocol by ID
     * @param {string} protocolId 
     * @returns {Object|null}
     */
    getProtocol(protocolId) {
        if (!this.initialized) {
            throw new BridgeErrors.NotInitializedError('Bridge configuration not initialized');
        }
        return this.protocolMappings.get(protocolId) || null;
    }

    /**
     * Get bridges for specific chains
     * @param {number} sourceChainId 
     * @param {number} targetChainId 
     * @returns {Array}
     */
    getBridgesForChains(sourceChainId, targetChainId) {
        if (!this.initialized) {
            throw new BridgeErrors.NotInitializedError('Bridge configuration not initialized');
        }

        const bridges = [];

        // Check explicit bridge configurations
        for (const [bridgeId, bridge] of this.bridgeData) {
            if (bridge.sourceChain === sourceChainId && bridge.targetChain === targetChainId) {
                bridges.push(bridge);
            }
        }

        // Check protocol support for chain pair
        for (const [protocolId, protocol] of this.protocolMappings) {
            if (protocol.chains.includes(sourceChainId) && 
                protocol.chains.includes(targetChainId) && 
                protocol.status === 'active') {
                
                bridges.push({
                    id: `${protocolId}-${sourceChainId}-${targetChainId}`,
                    protocol: protocolId,
                    name: `${protocol.name} Bridge`,
                    sourceChain: sourceChainId,
                    targetChain: targetChainId,
                    logo: protocol.logo,
                    fees: protocol.fees,
                    limits: protocol.limits,
                    security: protocol.security,
                    gasOptimized: protocol.gasOptimized,
                    estimatedTime: this.getEstimatedBridgeTime(protocolId),
                    status: 'active'
                });
            }
        }

        // Sort by security and gas optimization
        return bridges.sort((a, b) => {
            const securityWeight = { high: 3, medium: 2, low: 1 };
            const aScore = (securityWeight[a.security] || 1) + (a.gasOptimized ? 1 : 0);
            const bScore = (securityWeight[b.security] || 1) + (b.gasOptimized ? 1 : 0);
            return bScore - aScore;
        });
    }

    /**
     * Get estimated bridge time for protocol
     * @param {string} protocolId 
     * @returns {string}
     */
    getEstimatedBridgeTime(protocolId) {
        const timeEstimates = {
            layerzero: '2-5 minutes',
            wormhole: '5-15 minutes',
            axelar: '3-10 minutes',
            hyperlane: '1-3 minutes',
            chainlink: '10-20 minutes',
            hop: '5-10 minutes',
            across: '1-4 minutes'
        };
        
        return timeEstimates[protocolId] || '5-10 minutes';
    }

    /**
     * Get all supported protocols
     * @returns {Array}
     */
    getAllProtocols() {
        if (!this.initialized) {
            throw new BridgeErrors.NotInitializedError('Bridge configuration not initialized');
        }
        return Array.from(this.protocolMappings.values());
    }

    /**
     * Get active protocols only
     * @returns {Array}
     */
    getActiveProtocols() {
        if (!this.initialized) {
            throw new BridgeErrors.NotInitializedError('Bridge configuration not initialized');
        }
        return Array.from(this.protocolMappings.values()).filter(protocol => protocol.status === 'active');
    }

    /**
     * Get protocols by security level
     * @param {string} securityLevel - 'high', 'medium', 'low'
     * @returns {Array}
     */
    getProtocolsBySecurity(securityLevel) {
        if (!this.initialized) {
            throw new BridgeErrors.NotInitializedError('Bridge configuration not initialized');
        }
        return Array.from(this.protocolMappings.values()).filter(protocol => 
            protocol.security === securityLevel && protocol.status === 'active'
        );
    }

    /**
     * Get gas-optimized protocols
     * @returns {Array}
     */
    getGasOptimizedProtocols() {
        if (!this.initialized) {
            throw new BridgeErrors.NotInitializedError('Bridge configuration not initialized');
        }
        return Array.from(this.protocolMappings.values()).filter(protocol => 
            protocol.gasOptimized && protocol.status === 'active'
        );
    }

    /**
     * Get bridge token mapping
     * @param {number} chainId 
     * @param {string} tokenAddress 
     * @returns {Object|null}
     */
    getBridgeTokenMapping(chainId, tokenAddress) {
        if (!this.initialized) {
            return null;
        }
        
        const key = `${chainId}-${tokenAddress}`;
        return this.bridgeTokenMappings.get(key) || null;
    }

    /**
     * Get all bridge token mappings
     * @returns {Array}
     */
    getAllBridgeTokenMappings() {
        if (!this.initialized) {
            throw new BridgeErrors.NotInitializedError('Bridge configuration not initialized');
        }
        return Array.from(this.bridgeTokenMappings.values());
    }

    /**
     * Get bridge token mappings for specific chain
     * @param {number} chainId 
     * @returns {Array}
     */
    getBridgeTokenMappingsForChain(chainId) {
        if (!this.initialized) {
            throw new BridgeErrors.NotInitializedError('Bridge configuration not initialized');
        }

        const mappings = [];
        for (const [key, mapping] of this.bridgeTokenMappings) {
            if (key.startsWith(`${chainId}-`)) {
                mappings.push(mapping);
            }
        }
        return mappings;
    }

    /**
     * Search bridge tokens by symbol
     * @param {string} symbol 
     * @returns {Array}
     */
    searchBridgeTokensBySymbol(symbol) {
        if (!this.initialized) {
            throw new BridgeErrors.NotInitializedError('Bridge configuration not initialized');
        }

        const results = [];
        const lowercaseSymbol = symbol.toLowerCase();
        
        for (const mapping of this.bridgeTokenMappings.values()) {
            if (mapping.symbol && mapping.symbol.toLowerCase().includes(lowercaseSymbol)) {
                results.push(mapping);
            }
        }
        
        return results.sort((a, b) => a.symbol.localeCompare(b.symbol));
    }

    /**
     * Validate bridge address
     * @param {string} address 
     * @param {number} chainId 
     * @returns {boolean}
     */
    validateBridgeAddress(address, chainId) {
        if (!address || typeof address !== 'string') {
            return false;
        }

        // Basic Ethereum address validation
        const addressRegex = /^0x[a-fA-F0-9]{40}$/;
        if (!addressRegex.test(address)) {
            return false;
        }

        // Check if address exists in bridge configurations
        for (const bridge of this.bridgeData.values()) {
            if (bridge.contractAddress === address && 
                (bridge.sourceChain === chainId || bridge.targetChain === chainId)) {
                return true;
            }
        }

        // Check protocol endpoints
        for (const protocol of this.protocolMappings.values()) {
            if (protocol.chains.includes(chainId)) {
                const endpoints = Object.values(protocol.endpoints);
                if (endpoints.includes(address)) {
                    return true;
                }
            }
        }

        return false;
    }

    /**
     * Get bridge fees for protocol
     * @param {string} protocolId 
     * @param {number} sourceChainId 
     * @param {number} targetChainId 
     * @param {string} amount 
     * @returns {Object|null}
     */
    getBridgeFees(protocolId, sourceChainId, targetChainId, amount = '100') {
        const protocol = this.getProtocol(protocolId);
        if (!protocol || !protocol.fees) {
            return null;
        }

        const fees = { ...protocol.fees };
        
        // Calculate variable fees if applicable
        if (fees.variable && amount) {
            const variableRate = parseFloat(fees.variable.replace('%', '')) / 100;
            fees.variableAmount = (parseFloat(amount) * variableRate).toString();
        }

        // Add estimated total
        if (fees.base && fees.variableAmount) {
            fees.estimatedTotal = (parseFloat(fees.base) + parseFloat(fees.variableAmount)).toString();
        } else if (fees.base) {
            fees.estimatedTotal = fees.base;
        }

        return {
            protocol: protocolId,
            sourceChain: sourceChainId,
            targetChain: targetChainId,
            amount,
            fees,
            currency: 'ETH' // Default, should be chain-specific
        };
    }

    /**
     * Get bridge limits for protocol
     * @param {string} protocolId 
     * @returns {Object|null}
     */
    getBridgeLimits(protocolId) {
        const protocol = this.getProtocol(protocolId);
        return protocol?.limits || null;
    }

    /**
     * Check if bridge route is supported
     * @param {number} sourceChainId 
     * @param {number} targetChainId 
     * @param {string} tokenSymbol 
     * @returns {boolean}
     */
    isBridgeRouteSupported(sourceChainId, targetChainId, tokenSymbol = null) {
        if (!this.initialized) {
            return false;
        }

        // Check if any protocol supports this chain pair
        for (const protocol of this.protocolMappings.values()) {
            if (protocol.chains.includes(sourceChainId) && 
                protocol.chains.includes(targetChainId) &&
                protocol.status === 'active') {
                
                // If token symbol specified, check if it's supported
                if (tokenSymbol) {
                    const tokenMappings = this.searchBridgeTokensBySymbol(tokenSymbol);
                    const hasSourceToken = tokenMappings.some(m => m.sourceChain === sourceChainId);
                    const hasTargetToken = tokenMappings.some(m => m.chainId === targetChainId);
                    
                    if (hasSourceToken && hasTargetToken) {
                        return true;
                    }
                } else {
                    return true;
                }
            }
        }

        return false;
    }

    /**
     * Get recommended bridge for route
     * @param {number} sourceChainId 
     * @param {number} targetChainId 
     * @param {Object} options 
     * @returns {Object|null}
     */
    getRecommendedBridge(sourceChainId, targetChainId, options = {}) {
        const bridges = this.getBridgesForChains(sourceChainId, targetChainId);
        if (bridges.length === 0) {
            return null;
        }

        // Apply filters based on options
        let filteredBridges = bridges;

        if (options.prioritySecurity) {
            filteredBridges = filteredBridges.filter(b => b.security === 'high');
        }

        if (options.prioritySpeed) {
            filteredBridges = filteredBridges.filter(b => b.gasOptimized);
        }

        if (options.maxFees) {
            filteredBridges = filteredBridges.filter(b => {
                const baseFee = parseFloat(b.fees?.base || '0');
                return baseFee <= parseFloat(options.maxFees);
            });
        }

        // Return best option (already sorted by score)
        return filteredBridges[0] || bridges[0];
    }

    /**
     * Get all supported chain IDs
     * @returns {Array<number>}
     */
    getSupportedChains() {
        if (!this.initialized) {
            throw new BridgeErrors.NotInitializedError('Bridge configuration not initialized');
        }

        const chains = new Set();
        
        // Add chains from protocols
        for (const protocol of this.protocolMappings.values()) {
            protocol.chains.forEach(chainId => chains.add(chainId));
        }
        
        // Add chains from explicit bridges
        for (const bridge of this.bridgeData.values()) {
            chains.add(bridge.sourceChain);
            chains.add(bridge.targetChain);
        }
        
        return Array.from(chains).sort((a, b) => a - b);
    }

    /**
     * Get chain pairs supported by any protocol
     * @returns {Array}
     */
    getSupportedChainPairs() {
        if (!this.initialized) {
            throw new BridgeErrors.NotInitializedError('Bridge configuration not initialized');
        }

        const pairs = new Set();
        
        for (const protocol of this.protocolMappings.values()) {
            if (protocol.status === 'active') {
                for (let i = 0; i < protocol.chains.length; i++) {
                    for (let j = i + 1; j < protocol.chains.length; j++) {
                        const sourceChain = protocol.chains[i];
                        const targetChain = protocol.chains[j];
                        pairs.add(`${sourceChain}-${targetChain}`);
                        pairs.add(`${targetChain}-${sourceChain}`); // Bidirectional
                    }
                }
            }
        }
        
        return Array.from(pairs).map(pair => {
            const [source, target] = pair.split('-').map(Number);
            return { sourceChain: source, targetChain: target };
        });
    }

    /**
     * Get production bridge configuration
     * @returns {Object}
     */
    getProductionBridgeConfig() {
        if (!this.initialized) {
            throw new BridgeErrors.NotInitializedError('Bridge configuration not initialized');
        }

        return {
            extension: {
                name: 'Trust Crypto Wallet Bridge Configuration',
                version: '2.1.0',
                ipfsIntegrated: true,
                lastUpdated: this.lastUpdated
            },
            protocols: Object.fromEntries(this.protocolMappings),
            bridges: Object.fromEntries(this.bridgeData),
            tokenMappings: Object.fromEntries(this.bridgeTokenMappings),
            assetUrls: Object.fromEntries(this.assetCache),
            supportedChains: this.getSupportedChains(),
            supportedChainPairs: this.getSupportedChainPairs(),
            statistics: this.getStatistics(),
            ipfsConfig: {
                hashes: BRIDGE_IPFS_CONFIG.hashes,
                gateways: BRIDGE_IPFS_CONFIG.gateways,
                lastUpdated: this.lastUpdated
            },
            productionSafety: {
                protocolsLoaded: this.stats.protocolsLoaded,
                tokenMappingsLoaded: this.stats.tokenMappingsLoaded,
                assetsLoaded: this.assetCache.size,
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
            protocolCheck: {
                protocolsLoaded: this.stats.protocolsLoaded,
                requiredProtocols: Object.keys(BRIDGE_PROTOCOLS).length,
                allProtocolsLoaded: false
            },
            ipfsCheck: {
                hashesConfigured: false,
                gatewaysAvailable: false,
                alignerInitialized: false
            }
        };

        if (!this.initialized) {
            validation.issues.push('Bridge configuration not initialized');
            return validation;
        }

        // Protocol validation
        validation.protocolCheck.allProtocolsLoaded = 
            this.stats.protocolsLoaded >= validation.protocolCheck.requiredProtocols;

        if (!validation.protocolCheck.allProtocolsLoaded) {
            validation.issues.push(`Missing protocols: ${validation.protocolCheck.requiredProtocols - this.stats.protocolsLoaded}`);
        }

        // IPFS validation
        validation.ipfsCheck.hashesConfigured = Object.keys(BRIDGE_IPFS_CONFIG.hashes).length > 0;
        validation.ipfsCheck.gatewaysAvailable = BRIDGE_IPFS_CONFIG.gateways.length > 0;
        validation.ipfsCheck.alignerInitialized = this.aligner && this.aligner.isInitialized();

        if (!validation.ipfsCheck.hashesConfigured) {
            validation.issues.push('IPFS hashes not configured');
        }

        if (!validation.ipfsCheck.alignerInitialized) {
            validation.warnings.push('TokenListAligner not properly initialized');
        }

        // Chain support validation
        const supportedChains = this.getSupportedChains();
        if (supportedChains.length < 5) {
            validation.warnings.push('Low number of supported chains');
        }

        // Asset validation
        if (this.assetCache.size === 0) {
            validation.warnings.push('No bridge assets loaded');
        }

        // Performance validation
        if (this.stats.loadTime > 10000) {
            validation.warnings.push('Slow initialization time');
        }

        validation.isProductionReady = validation.issues.length === 0;

        return validation;
    }

    /**
     * Get statistics
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
            protocolsLoaded: this.stats.protocolsLoaded,
            bridgesLoaded: this.stats.bridgesLoaded,
            tokenMappingsLoaded: this.stats.tokenMappingsLoaded,
            assetsLoaded: this.assetCache.size,
            supportedChains: this.getSupportedChains().length,
            supportedChainPairs: this.getSupportedChainPairs().length,
            productionMode: this.productionMode,
            ipfs: {
                hashesConfigured: Object.keys(BRIDGE_IPFS_CONFIG.hashes).length,
                gatewaysConfigured: BRIDGE_IPFS_CONFIG.gateways.length,
                alignerIntegrated: this.aligner && this.aligner.isInitialized()
            }
        };
    }

    /**
     * Export bridge configuration
     * @returns {Object}
     */
    exportBridgeConfig() {
        if (!this.initialized) {
            throw new BridgeErrors.NotInitializedError('Bridge configuration not initialized');
        }

        return {
            name: 'Trust Crypto Wallet Bridge Configuration',
            version: '2.1.0',
            timestamp: new Date().toISOString(),
            protocols: Array.from(this.protocolMappings.values()),
            bridges: Array.from(this.bridgeData.values()),
            tokenMappings: Array.from(this.bridgeTokenMappings.values()),
            supportedChains: this.getSupportedChains(),
            supportedChainPairs: this.getSupportedChainPairs()
        };
    }

    /**
     * Clear cache and refresh
     */
    clearCache() {
        this.assetCache.clear();
        this.ipfsCache.clear();
        logger.info('Bridge configuration cache cleared');
    }

    /**
     * Refresh bridge configuration
     * @returns {Promise<void>}
     */
    async refresh() {
        logger.info('🔄 Refreshing bridge configuration...');
        this.clearCache();
        this.initialized = false;
        await this.initialize();
    }

    /**
     * Get bridge metadata
     * @returns {Object|null}
     */
    getBridgeMetadata() {
        return this.bridgeMetadata || null;
    }

    /**
     * Get IPFS configuration
     * @returns {Object}
     */
    getIpfsConfig() {
        return {
            hashes: BRIDGE_IPFS_CONFIG.hashes,
            gateways: BRIDGE_IPFS_CONFIG.gateways,
            cache: BRIDGE_IPFS_CONFIG.cache
        };
    }
}

// Create singleton instance
export const bridgeConfig = new BridgeConfig();

// Export configuration constants for use in other modules
export { BRIDGE_IPFS_CONFIG, BRIDGE_PROTOCOLS };

// Default export
export default bridgeConfig;
