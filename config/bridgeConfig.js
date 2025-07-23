/**
 * Trust Crypto Wallet Extension - Bridge Configuration
 * Production-grade bridge protocol configuration with URL-based asset loading
 * Supports LayerZero, Wormhole, Axelar, Hyperlane, Chainlink, Hop, Across protocols
 */

import { BridgeErrors } from '../src/errors/BridgeErrors.js';
import { logger } from '../src/utils/logger.js';

/**
 * Bridge configuration class with URL-based data fetching
 */
export class BridgeConfig {
    constructor() {
        this.bridgeData = new Map();
        this.protocolMappings = new Map();
        this.assetCache = new Map();
        this.initialized = false;
        this.urlConfig = {
            bridges: 'https://raw.githubusercontent.com/Trusx-crypto-wallet/trust-crypto-wallet-tokenlist/main/tokenlist.json',
            extension: 'https://raw.githubusercontent.com/Trusx-crypto-wallet/trust-crypto-wallet-tokenlist/main/extension.json',
            assetBase: 'https://raw.githubusercontent.com/Trusx-crypto-wallet/trust-crypto-wallet-tokenlist/main/'
        };
    }

    /**
     * Initialize bridge configuration with URL data fetching
     * @returns {Promise<void>}
     */
    async initialize() {
        try {
            logger.info('Initializing bridge configuration for Trust Crypto Wallet Extension...');
            
            // Fetch bridge data from URLs
            const [bridgeResponse, extensionResponse] = await Promise.all([
                this.fetchWithTimeout(this.urlConfig.bridges, 5000),
                this.fetchWithTimeout(this.urlConfig.extension, 5000)
            ]);

            const bridgeData = await bridgeResponse.json();
            const extensionData = await extensionResponse.json();

            // Process bridge protocols from extension
            await this.processBridgeProtocols(extensionData.bridgeProtocols || []);
            
            // Process bridges array from tokenlist
            await this.processBridges(bridgeData.bridges || []);
            
            // Map bridge tokens
            await this.mapBridgeTokens(bridgeData.tokens || []);

            this.initialized = true;
            logger.info('Bridge configuration initialized successfully for Trust Crypto Wallet Extension');

        } catch (error) {
            logger.error('Failed to initialize bridge configuration:', error);
            await this.initializeFallback();
        }
    }

    /**
     * Fetch URL with timeout
     * @param {string} url 
     * @param {number} timeout 
     * @returns {Promise<Response>}
     */
    async fetchWithTimeout(url, timeout = 5000) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        
        try {
            const response = await fetch(url, { 
                signal: controller.signal,
                headers: {
                    'Accept': 'application/json',
                    'Cache-Control': 'no-cache'
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            return response;
        } finally {
            clearTimeout(timeoutId);
        }
    }

    /**
     * Process bridge protocols from extension data
     * @param {Array} protocols 
     */
    async processBridgeProtocols(protocols) {
        for (const protocol of protocols) {
            try {
                const logoUrl = await this.getAssetUrl(`${protocol.id}-bridge-64.png`);
                
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
                    security: protocol.security || {}
                });
                
                logger.debug(`Processed bridge protocol: ${protocol.name}`);
            } catch (error) {
                logger.warn(`Failed to process protocol ${protocol.id}:`, error);
            }
        }
    }

    /**
     * Process bridges from tokenlist data
     * @param {Array} bridges 
     */
    async processBridges(bridges) {
        for (const bridge of bridges) {
            try {
                const logoUrl = await this.getAssetUrl(`${bridge.protocol}-bridge-64.png`);
                
                this.bridgeData.set(bridge.id, {
                    id: bridge.id,
                    protocol: bridge.protocol,
                    name: bridge.name,
                    sourceChain: bridge.sourceChain,
                    targetChain: bridge.targetChain,
                    logo: logoUrl,
                    contractAddress: bridge.contractAddress,
                    abi: bridge.abi,
                    fees: bridge.fees || {},
                    limits: bridge.limits || {},
                    status: bridge.status || 'active'
                });

                logger.debug(`Processed bridge: ${bridge.name} (${bridge.protocol})`);
            } catch (error) {
                logger.warn(`Failed to process bridge ${bridge.id}:`, error);
            }
        }
    }

    /**
     * Map bridge tokens from token data
     * @param {Array} tokens 
     */
    async mapBridgeTokens(tokens) {
        const bridgeTokenMap = new Map();
        
        for (const token of tokens) {
            if (token.bridgeTokens && Array.isArray(token.bridgeTokens)) {
                for (const bridgeToken of token.bridgeTokens) {
                    const key = `${bridgeToken.chainId}-${bridgeToken.address}`;
                    bridgeTokenMap.set(key, {
                        ...bridgeToken,
                        sourceToken: token.address,
                        sourceChain: token.chainId,
                        symbol: token.symbol,
                        name: token.name,
                        decimals: token.decimals
                    });
                }
            }
        }
        
        this.bridgeTokenMappings = bridgeTokenMap;
        logger.info(`Mapped ${bridgeTokenMap.size} bridge token relationships`);
    }

    /**
     * Get asset URL with caching
     * @param {string} filename 
     * @returns {Promise<string>}
     */
    async getAssetUrl(filename) {
        if (this.assetCache.has(filename)) {
            return this.assetCache.get(filename);
        }

        const url = `${this.urlConfig.assetBase}${filename}`;
        
        try {
            // Verify asset exists
            const response = await this.fetchWithTimeout(url, 3000);
            if (response.ok) {
                this.assetCache.set(filename, url);
                return url;
            }
        } catch (error) {
            logger.warn(`Asset not found: ${filename}`);
        }

        // Fallback to local asset
        const fallbackUrl = `/public/images/bridges/${filename}`;
        this.assetCache.set(filename, fallbackUrl);
        return fallbackUrl;
    }

    /**
     * Initialize fallback configuration
     */
    async initializeFallback() {
        logger.warn('Using fallback bridge configuration for Trust Crypto Wallet Extension');
        
        // LayerZero bridge protocol
        this.protocolMappings.set('layerzero', {
            id: 'layerzero',
            name: 'LayerZero',
            type: 'omnichain',
            version: 'v2',
            logo: '/public/images/bridges/layerzero-bridge-64.png',
            chains: [1, 10, 137, 42161, 43114, 56],
            endpoints: {
                mainnet: '0x3c2269811836af69497E5F486A85D7316753cf62',
                polygon: '0x3c2269811836af69497E5F486A85D7316753cf62',
                arbitrum: '0x3c2269811836af69497E5F486A85D7316753cf62'
            },
            fees: { base: '0.001', variable: '0.05%' },
            limits: { min: '10', max: '1000000' }
        });

        // Wormhole bridge protocol
        this.protocolMappings.set('wormhole', {
            id: 'wormhole',
            name: 'Wormhole',
            type: 'cross-chain',
            version: 'v2',
            logo: '/public/images/bridges/wormhole-bridge-64.png',
            chains: [1, 10, 137, 42161, 43114, 56, 250, 25],
            endpoints: {
                mainnet: '0x98f3c9e6E3fAce36bAAd05FE09d375Ef1464288B',
                polygon: '0x7A4B5a56256163F07b2C80A7cA55aBE66c4ec4d7',
                arbitrum: '0xa5f208e072434bC67592E4C49C1B991BA79BCA46'
            },
            fees: { base: '0.002', variable: '0.1%' },
            limits: { min: '1', max: '500000' }
        });

        // Axelar bridge protocol
        this.protocolMappings.set('axelar', {
            id: 'axelar',
            name: 'Axelar',
            type: 'cross-chain',
            version: 'v1',
            logo: '/public/images/bridges/axelar-bridge-64.png',
            chains: [1, 56, 137, 43114, 250, 25],
            endpoints: {
                gateway: '0x4F4495243837681061C4743b74B3eEdf548D56A5',
                gasService: '0x2d5d7d31F671F86C782533cc367F14109a082712'
            },
            fees: { base: '0.005', gas: 'dynamic' },
            limits: { min: '5', max: '100000' }
        });

        // Hyperlane bridge protocol
        this.protocolMappings.set('hyperlane', {
            id: 'hyperlane',
            name: 'Hyperlane',
            type: 'interchain',
            version: 'v3',
            logo: '/public/images/bridges/hyperlane-bridge-64.png',
            chains: [1, 10, 137, 42161, 43114, 56],
            endpoints: {
                mailbox: '0xc005dc82818d67AF737725bD4bf75435d065D239',
                igp: '0x9A10DFaB4C8a98bc9C1E4C39c715dc4fa5120dD5'
            },
            fees: { base: '0.003', gas: 'estimated' },
            limits: { min: '1', max: '250000' }
        });

        // Chainlink CCIP bridge protocol
        this.protocolMappings.set('chainlink', {
            id: 'chainlink',
            name: 'Chainlink CCIP',
            type: 'cross-chain',
            version: 'v1',
            logo: '/public/images/bridges/chainlink-bridge-64.png',
            chains: [1, 10, 137, 42161, 43114, 56],
            endpoints: {
                router: '0x80226fc0Ee2b096224EeAc085Bb9a8cba1146f7D',
                arm: '0x28c4A1Fa47EEE9226F8dE7D6AF0a41C62Ca98267'
            },
            fees: { base: '0.004', variable: '0.08%' },
            limits: { min: '10', max: '750000' }
        });

        this.initialized = true;
    }

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
        for (const [bridgeId, bridge] of this.bridgeData) {
            if (bridge.sourceChain === sourceChainId && bridge.targetChain === targetChainId) {
                bridges.push(bridge);
            }
        }

        // Also check protocol support
        for (const [protocolId, protocol] of this.protocolMappings) {
            if (protocol.chains.includes(sourceChainId) && protocol.chains.includes(targetChainId)) {
                bridges.push({
                    id: `${protocolId}-${sourceChainId}-${targetChainId}`,
                    protocol: protocolId,
                    name: `${protocol.name} Bridge`,
                    sourceChain: sourceChainId,
                    targetChain: targetChainId,
                    logo: protocol.logo,
                    fees: protocol.fees,
                    limits: protocol.limits,
                    status: 'active'
                });
            }
        }

        return bridges;
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
     * Get bridge token mapping
     * @param {number} chainId 
     * @param {string} tokenAddress 
     * @returns {Object|null}
     */
    getBridgeTokenMapping(chainId, tokenAddress) {
        if (!this.initialized || !this.bridgeTokenMappings) {
            return null;
        }
        
        const key = `${chainId}-${tokenAddress}`;
        return this.bridgeTokenMappings.get(key) || null;
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

        // Check if address exists in our bridge configurations
        for (const [bridgeId, bridge] of this.bridgeData) {
            if (bridge.contractAddress === address && 
                (bridge.sourceChain === chainId || bridge.targetChain === chainId)) {
                return true;
            }
        }

        // Check protocol endpoints
        for (const [protocolId, protocol] of this.protocolMappings) {
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
     * Get bridge configuration for private deployment
     * @returns {Object}
     */
    getPrivateBridgeConfig() {
        if (!this.initialized) {
            throw new BridgeErrors.NotInitializedError('Bridge configuration not initialized');
        }

        return {
            protocols: Object.fromEntries(this.protocolMappings),
            bridges: Object.fromEntries(this.bridgeData),
            tokenMappings: this.bridgeTokenMappings ? Object.fromEntries(this.bridgeTokenMappings) : {},
            assetUrls: Object.fromEntries(this.assetCache),
            supportedChains: this.getSupportedChains(),
            lastUpdated: new Date().toISOString()
        };
    }

    /**
     * Get all supported chain IDs
     * @returns {Array<number>}
     */
    getSupportedChains() {
        const chains = new Set();
        
        for (const protocol of this.protocolMappings.values()) {
            protocol.chains.forEach(chainId => chains.add(chainId));
        }
        
        for (const bridge of this.bridgeData.values()) {
            chains.add(bridge.sourceChain);
            chains.add(bridge.targetChain);
        }
        
        return Array.from(chains).sort((a, b) => a - b);
    }
}

// Create singleton instance
export const bridgeConfig = new BridgeConfig();

// Default export
export default bridgeConfig;
