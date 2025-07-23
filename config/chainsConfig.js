/**
 * Trust Crypto Wallet Extension - Chain Configuration
 * Production-grade network configuration using Token List Extension data
 * Supports mainnet and testnet with fallback RPC endpoints
 */

import { logger } from '../src/utils/logger.js';
import { BridgeErrors } from '../src/errors/BridgeErrors.js';

/**
 * Chain configuration class with extension-based network loading
 */
export class ChainsConfig {
    constructor() {
        this.networks = new Map();
        this.rpcEndpoints = new Map();
        this.tokenMappings = new Map();
        this.testnetNetworks = new Map();
        this.initialized = false;
        this.urlConfig = {
            extension: 'https://raw.githubusercontent.com/Trusx-crypto-wallet/trust-crypto-wallet-tokenlist/main/extension.json'
        };
    }

    /**
     * Initialize chain configuration with extension data
     * @returns {Promise<void>}
     */
    async initialize() {
        try {
            logger.info('Initializing chain configuration for Trust Crypto Wallet Extension...');
            
            const response = await this.fetchWithTimeout(this.urlConfig.extension, 5000);
            const extensionData = await response.json();

            // Extract network data from extension
            await this.processMainnetNetworks(extensionData.lists?.mainnet?.networks || []);
            await this.processTestnetNetworks(extensionData.lists?.testnet?.networks || []);
            
            // Setup RPC fallbacks
            await this.setupRPCFallbacks();
            
            this.initialized = true;
            logger.info('Chain configuration initialized successfully for Trust Crypto Wallet Extension');

        } catch (error) {
            logger.error('Failed to initialize chain configuration:', error);
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
     * Process mainnet networks from extension
     * @param {Array} networks 
     */
    async processMainnetNetworks(networks) {
        for (const network of networks) {
            try {
                const chainConfig = {
                    chainId: network.chainId,
                    name: network.name,
                    shortName: network.shortName,
                    nativeCurrency: network.nativeCurrency,
                    rpcUrls: network.rpcUrls || [],
                    blockExplorerUrls: network.blockExplorerUrls || [],
                    iconPath: this.getChainIcon(network.shortName),
                    isTestnet: false,
                    features: network.features || [],
                    gasSettings: network.gasSettings || {},
                    bridgeSupport: network.bridgeSupport || []
                };

                this.networks.set(network.chainId, chainConfig);
                this.setupRPCEndpoints(network.chainId, network.rpcUrls || []);
                
                logger.debug(`Processed mainnet network: ${network.name} (${network.chainId})`);
            } catch (error) {
                logger.warn(`Failed to process mainnet network ${network.chainId}:`, error);
            }
        }
    }

    /**
     * Process testnet networks from extension
     * @param {Array} networks 
     */
    async processTestnetNetworks(networks) {
        for (const network of networks) {
            try {
                const chainConfig = {
                    chainId: network.chainId,
                    name: network.name,
                    shortName: network.shortName,
                    nativeCurrency: network.nativeCurrency,
                    rpcUrls: network.rpcUrls || [],
                    blockExplorerUrls: network.blockExplorerUrls || [],
                    iconPath: this.getChainIcon(network.shortName),
                    isTestnet: true,
                    features: network.features || [],
                    gasSettings: network.gasSettings || {},
                    bridgeSupport: network.bridgeSupport || []
                };

                this.testnetNetworks.set(network.chainId, chainConfig);
                this.setupRPCEndpoints(network.chainId, network.rpcUrls || []);
                
                logger.debug(`Processed testnet network: ${network.name} (${network.chainId})`);
            } catch (error) {
                logger.warn(`Failed to process testnet network ${network.chainId}:`, error);
            }
        }
    }

    /**
     * Setup RPC endpoints with fallback support
     * @param {number} chainId 
     * @param {Array} rpcUrls 
     */
    setupRPCEndpoints(chainId, rpcUrls) {
        if (!Array.isArray(rpcUrls) || rpcUrls.length === 0) {
            logger.warn(`No RPC URLs provided for chain ${chainId}`);
            return;
        }

        // Add fallback RPCs based on chain
        const fallbackRPCs = this.getFallbackRPCs(chainId);
        const allRPCs = [...rpcUrls, ...fallbackRPCs];
        
        this.rpcEndpoints.set(chainId, {
            primary: allRPCs[0],
            fallbacks: allRPCs.slice(1),
            all: allRPCs,
            lastUpdated: Date.now(),
            status: new Map() // Track RPC health
        });
    }

    /**
     * Get fallback RPC URLs for chain
     * @param {number} chainId 
     * @returns {Array<string>}
     */
    getFallbackRPCs(chainId) {
        const fallbackMap = {
            1: [ // Ethereum
                'https://ethereum-rpc.publicnode.com',
                'https://rpc.ankr.com/eth',
                'https://eth.llamarpc.com'
            ],
            56: [ // BSC
                'https://bsc-dataseed1.binance.org',
                'https://rpc.ankr.com/bsc',
                'https://bsc.publicnode.com'
            ],
            137: [ // Polygon
                'https://polygon-rpc.com',
                'https://rpc.ankr.com/polygon',
                'https://polygon.llamarpc.com'
            ],
            42161: [ // Arbitrum
                'https://arb1.arbitrum.io/rpc',
                'https://rpc.ankr.com/arbitrum',
                'https://arbitrum.llamarpc.com'
            ],
            10: [ // Optimism
                'https://mainnet.optimism.io',
                'https://rpc.ankr.com/optimism',
                'https://optimism.llamarpc.com'
            ],
            43114: [ // Avalanche
                'https://api.avax.network/ext/bc/C/rpc',
                'https://rpc.ankr.com/avalanche',
                'https://avalanche.drpc.org'
            ],
            // Testnet fallbacks
            11155111: [ // Sepolia
                'https://sepolia.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161',
                'https://rpc.ankr.com/eth_sepolia',
                'https://sepolia.gateway.tenderly.co'
            ],
            97: [ // BSC Testnet
                'https://data-seed-prebsc-1-s1.binance.org:8545',
                'https://bsc-testnet.publicnode.com',
                'https://rpc.ankr.com/bsc_testnet_chapel'
            ],
            80001: [ // Mumbai
                'https://rpc-mumbai.maticvigil.com',
                'https://rpc.ankr.com/polygon_mumbai',
                'https://polygon-mumbai.gateway.tenderly.co'
            ]
        };

        return fallbackMap[chainId] || [];
    }

    /**
     * Get chain icon path
     * @param {string} shortName 
     * @returns {string}
     */
    getChainIcon(shortName) {
        const iconMap = {
            'eth': '/public/images/chains/ethereum.png',
            'bsc': '/public/images/chains/bsc.png',
            'matic': '/public/images/chains/polygon.png',
            'arb1': '/public/images/chains/arbitrum.png',
            'oeth': '/public/images/chains/optimism.png',
            'avax': '/public/images/chains/avalanche.png'
        };

        return iconMap[shortName.toLowerCase()] || '/public/images/chains/ethereum.png';
    }

    /**
     * Setup fallback RPC management
     */
    async setupRPCFallbacks() {
        // Initialize health checks for all RPC endpoints
        for (const [chainId, rpcData] of this.rpcEndpoints) {
            for (const rpcUrl of rpcData.all) {
                rpcData.status.set(rpcUrl, {
                    healthy: true,
                    latency: 0,
                    lastCheck: 0,
                    errorCount: 0
                });
            }
        }

        // Start periodic health checks
        this.startRPCHealthChecks();
    }

    /**
     * Start RPC health monitoring
     */
    startRPCHealthChecks() {
        // Check RPC health every 5 minutes
        setInterval(async () => {
            await this.checkRPCHealth();
        }, 5 * 60 * 1000);
    }

    /**
     * Check RPC endpoint health
     */
    async checkRPCHealth() {
        for (const [chainId, rpcData] of this.rpcEndpoints) {
            for (const rpcUrl of rpcData.all) {
                try {
                    const startTime = Date.now();
                    
                    const response = await fetch(rpcUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            jsonrpc: '2.0',
                            method: 'eth_blockNumber',
                            params: [],
                            id: 1
                        }),
                        signal: AbortSignal.timeout(5000)
                    });

                    const latency = Date.now() - startTime;
                    const isHealthy = response.ok;

                    rpcData.status.set(rpcUrl, {
                        healthy: isHealthy,
                        latency,
                        lastCheck: Date.now(),
                        errorCount: isHealthy ? 0 : rpcData.status.get(rpcUrl).errorCount + 1
                    });

                } catch (error) {
                    const currentStatus = rpcData.status.get(rpcUrl);
                    rpcData.status.set(rpcUrl, {
                        healthy: false,
                        latency: 9999,
                        lastCheck: Date.now(),
                        errorCount: currentStatus.errorCount + 1
                    });
                }
            }
        }
    }

    /**
     * Initialize fallback configuration
     */
    async initializeFallback() {
        logger.warn('Using fallback chain configuration for Trust Crypto Wallet Extension');
        
        // Ethereum Mainnet
        this.networks.set(1, {
            chainId: 1,
            name: 'Ethereum Mainnet',
            shortName: 'eth',
            nativeCurrency: {
                name: 'Ether',
                symbol: 'ETH',
                decimals: 18
            },
            rpcUrls: ['https://ethereum-rpc.publicnode.com'],
            blockExplorerUrls: ['https://etherscan.io'],
            iconPath: '/public/images/chains/ethereum.png',
            isTestnet: false,
            features: ['eip1559', 'london'],
            gasSettings: { type: 2, maxFeePerGas: '20000000000', maxPriorityFeePerGas: '2000000000' },
            bridgeSupport: ['layerzero', 'wormhole', 'axelar', 'hyperlane', 'chainlink']
        });

        // Polygon
        this.networks.set(137, {
            chainId: 137,
            name: 'Polygon Mainnet',
            shortName: 'matic',
            nativeCurrency: {
                name: 'MATIC',
                symbol: 'MATIC',
                decimals: 18
            },
            rpcUrls: ['https://polygon-rpc.com'],
            blockExplorerUrls: ['https://polygonscan.com'],
            iconPath: '/public/images/chains/polygon.png',
            isTestnet: false,
            features: ['eip1559'],
            gasSettings: { type: 2, maxFeePerGas: '50000000000', maxPriorityFeePerGas: '30000000000' },
            bridgeSupport: ['layerzero', 'wormhole', 'axelar', 'hyperlane']
        });

        // BSC
        this.networks.set(56, {
            chainId: 56,
            name: 'BNB Smart Chain',
            shortName: 'bsc',
            nativeCurrency: {
                name: 'BNB',
                symbol: 'BNB',
                decimals: 18
            },
            rpcUrls: ['https://bsc-dataseed1.binance.org'],
            blockExplorerUrls: ['https://bscscan.com'],
            iconPath: '/public/images/chains/bsc.png',
            isTestnet: false,
            features: ['legacy'],
            gasSettings: { gasPrice: '5000000000' },
            bridgeSupport: ['layerzero', 'wormhole', 'axelar']
        });

        // Arbitrum
        this.networks.set(42161, {
            chainId: 42161,
            name: 'Arbitrum One',
            shortName: 'arb1',
            nativeCurrency: {
                name: 'Ether',
                symbol: 'ETH',
                decimals: 18
            },
            rpcUrls: ['https://arb1.arbitrum.io/rpc'],
            blockExplorerUrls: ['https://arbiscan.io'],
            iconPath: '/public/images/chains/arbitrum.png',
            isTestnet: false,
            features: ['eip1559'],
            gasSettings: { type: 2, maxFeePerGas: '1000000000', maxPriorityFeePerGas: '100000000' },
            bridgeSupport: ['layerzero', 'wormhole', 'hyperlane', 'chainlink']
        });

        // Optimism
        this.networks.set(10, {
            chainId: 10,
            name: 'Optimism',
            shortName: 'oeth',
            nativeCurrency: {
                name: 'Ether',
                symbol: 'ETH',
                decimals: 18
            },
            rpcUrls: ['https://mainnet.optimism.io'],
            blockExplorerUrls: ['https://optimistic.etherscan.io'],
            iconPath: '/public/images/chains/optimism.png',
            isTestnet: false,
            features: ['eip1559'],
            gasSettings: { type: 2, maxFeePerGas: '1000000000', maxPriorityFeePerGas: '100000000' },
            bridgeSupport: ['layerzero', 'wormhole', 'hyperlane', 'chainlink']
        });

        // Avalanche
        this.networks.set(43114, {
            chainId: 43114,
            name: 'Avalanche C-Chain',
            shortName: 'avax',
            nativeCurrency: {
                name: 'AVAX',
                symbol: 'AVAX',
                decimals: 18
            },
            rpcUrls: ['https://api.avax.network/ext/bc/C/rpc'],
            blockExplorerUrls: ['https://snowtrace.io'],
            iconPath: '/public/images/chains/avalanche.png',
            isTestnet: false,
            features: ['eip1559'],
            gasSettings: { type: 2, maxFeePerGas: '30000000000', maxPriorityFeePerGas: '2000000000' },
            bridgeSupport: ['layerzero', 'wormhole', 'axelar']
        });

        // Testnets
        this.testnetNetworks.set(11155111, {
            chainId: 11155111,
            name: 'Sepolia Testnet',
            shortName: 'sep',
            nativeCurrency: {
                name: 'Sepolia Ether',
                symbol: 'ETH',
                decimals: 18
            },
            rpcUrls: ['https://sepolia.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161'],
            blockExplorerUrls: ['https://sepolia.etherscan.io'],
            iconPath: '/public/images/chains/ethereum.png',
            isTestnet: true,
            features: ['eip1559'],
            gasSettings: { type: 2, maxFeePerGas: '10000000000', maxPriorityFeePerGas: '1000000000' },
            bridgeSupport: ['layerzero']
        });

        // Setup RPC endpoints for all networks
        for (const [chainId, network] of this.networks) {
            this.setupRPCEndpoints(chainId, network.rpcUrls);
        }
        for (const [chainId, network] of this.testnetNetworks) {
            this.setupRPCEndpoints(chainId, network.rpcUrls);
        }

        await this.setupRPCFallbacks();
        this.initialized = true;
    }

    /**
     * Get network configuration by chain ID
     * @param {number} chainId 
     * @param {boolean} includeTestnet 
     * @returns {Object|null}
     */
    getNetwork(chainId, includeTestnet = false) {
        if (!this.initialized) {
            throw new BridgeErrors.NotInitializedError('Chain configuration not initialized');
        }

        // Check mainnet first
        if (this.networks.has(chainId)) {
            return this.networks.get(chainId);
        }

        // Check testnet if requested
        if (includeTestnet && this.testnetNetworks.has(chainId)) {
            return this.testnetNetworks.get(chainId);
        }

        return null;
    }

    /**
     * Get all mainnet networks
     * @returns {Array}
     */
    getMainnetNetworks() {
        if (!this.initialized) {
            throw new BridgeErrors.NotInitializedError('Chain configuration not initialized');
        }
        return Array.from(this.networks.values());
    }

    /**
     * Get all testnet networks
     * @returns {Array}
     */
    getTestnetNetworks() {
        if (!this.initialized) {
            throw new BridgeErrors.NotInitializedError('Chain configuration not initialized');
        }
        return Array.from(this.testnetNetworks.values());
    }

    /**
     * Get all networks (mainnet + testnet)
     * @returns {Array}
     */
    getAllNetworks() {
        if (!this.initialized) {
            throw new BridgeErrors.NotInitializedError('Chain configuration not initialized');
        }
        return [...this.getMainnetNetworks(), ...this.getTestnetNetworks()];
    }

    /**
     * Get RPC endpoint for chain
     * @param {number} chainId 
     * @returns {string|null}
     */
    getRPCEndpoint(chainId) {
        if (!this.rpcEndpoints.has(chainId)) {
            return null;
        }

        const rpcData = this.rpcEndpoints.get(chainId);
        
        // Find the first healthy RPC
        for (const rpcUrl of rpcData.all) {
            const status = rpcData.status.get(rpcUrl);
            if (status && status.healthy && status.errorCount < 3) {
                return rpcUrl;
            }
        }

        // If no healthy RPC found, return primary
        return rpcData.primary;
    }

    /**
     * Get all RPC endpoints for chain
     * @param {number} chainId 
     * @returns {Array<string>}
     */
    getAllRPCEndpoints(chainId) {
        if (!this.rpcEndpoints.has(chainId)) {
            return [];
        }
        return this.rpcEndpoints.get(chainId).all;
    }

    /**
     * Get RPC health status
     * @param {number} chainId 
     * @returns {Object}
     */
    getRPCHealthStatus(chainId) {
        if (!this.rpcEndpoints.has(chainId)) {
            return null;
        }

        const rpcData = this.rpcEndpoints.get(chainId);
        const healthStatus = {};

        for (const [rpcUrl, status] of rpcData.status) {
            healthStatus[rpcUrl] = {
                healthy: status.healthy,
                latency: status.latency,
                lastCheck: status.lastCheck,
                errorCount: status.errorCount
            };
        }

        return healthStatus;
    }

    /**
     * Check if chain supports bridge protocol
     * @param {number} chainId 
     * @param {string} protocolId 
     * @returns {boolean}
     */
    supportsBridgeProtocol(chainId, protocolId) {
        const network = this.getNetwork(chainId, true);
        return network ? network.bridgeSupport.includes(protocolId) : false;
    }

    /**
     * Get supported bridge protocols for chain
     * @param {number} chainId 
     * @returns {Array<string>}
     */
    getSupportedBridgeProtocols(chainId) {
        const network = this.getNetwork(chainId, true);
        return network ? network.bridgeSupport : [];
    }

    /**
     * Get chain token mappings
     * @param {number} chainId 
     * @returns {Map}
     */
    getChainTokenMappings(chainId) {
        return this.tokenMappings.get(chainId) || new Map();
    }

    /**
     * Add token mapping for chain
     * @param {number} chainId 
     * @param {string} tokenAddress 
     * @param {Object} tokenData 
     */
    addTokenMapping(chainId, tokenAddress, tokenData) {
        if (!this.tokenMappings.has(chainId)) {
            this.tokenMappings.set(chainId, new Map());
        }
        this.tokenMappings.get(chainId).set(tokenAddress, tokenData);
    }

    /**
     * Get private chain configuration
     * @returns {Object}
     */
    getPrivateChainConfig() {
        if (!this.initialized) {
            throw new BridgeErrors.NotInitializedError('Chain configuration not initialized');
        }

        return {
            mainnetNetworks: Object.fromEntries(this.networks),
            testnetNetworks: Object.fromEntries(this.testnetNetworks),
            rpcEndpoints: Object.fromEntries(
                Array.from(this.rpcEndpoints.entries()).map(([chainId, rpcData]) => [
                    chainId,
                    {
                        primary: rpcData.primary,
                        fallbacks: rpcData.fallbacks,
                        all: rpcData.all
                    }
                ])
            ),
            tokenMappings: Object.fromEntries(
                Array.from(this.tokenMappings.entries()).map(([chainId, tokens]) => [
                    chainId,
                    Object.fromEntries(tokens)
                ])
            ),
            lastUpdated: new Date().toISOString()
        };
    }

    /**
     * Validate chain ID
     * @param {number} chainId 
     * @returns {boolean}
     */
    isValidChainId(chainId) {
        return this.networks.has(chainId) || this.testnetNetworks.has(chainId);
    }

    /**
     * Get supported chain IDs
     * @param {boolean} includeTestnet 
     * @returns {Array<number>}
     */
    getSupportedChainIds(includeTestnet = false) {
        const mainnetIds = Array.from(this.networks.keys());
        if (includeTestnet) {
            const testnetIds = Array.from(this.testnetNetworks.keys());
            return [...mainnetIds, ...testnetIds].sort((a, b) => a - b);
        }
        return mainnetIds.sort((a, b) => a - b);
    }
}

// Create singleton instance
export const chainsConfig = new ChainsConfig();

// Default export
export default chainsConfig;
