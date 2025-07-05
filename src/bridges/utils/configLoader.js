// src/bridges/utils/configLoader.js
// Production-grade bridge configuration loader
// Loads and manages bridge configurations for protocol implementations

const { 
  bridgeConfig, 
  getNetworkByChainId, 
  getNetworkByKey,
  getBridgeContract,
  doesNetworkSupportBridge,
  getAllNetworks,
  validateBridgeConfig,
  healthCheck
} = require('../../../config');

/**
 * Bridge Configuration Loader
 * Provides centralized access to bridge configurations for protocol implementations
 */
class BridgeConfigLoader {
  constructor() {
    this.config = null;
    this.isInitialized = false;
    this.lastValidation = null;
    this.contractCache = new Map();
    this.networkCache = new Map();
    
    // Initialize on construction
    this.initialize();
  }

  /**
   * Initialize the configuration loader
   * @returns {Promise<boolean>} Initialization success
   */
  async initialize() {
    try {
      console.log('🔧 Initializing Bridge Configuration Loader...');
      
      // Validate configuration on load
      const validation = validateBridgeConfig();
      
      if (!validation.isValid) {
        throw new Error(`Configuration validation failed: ${validation.errors.join(', ')}`);
      }
      
      this.config = bridgeConfig;
      this.lastValidation = validation;
      this.isInitialized = true;
      
      // Pre-populate caches for performance
      await this.prePopulateCaches();
      
      console.log('✅ Bridge Configuration Loader initialized successfully');
      console.log(`   📊 Networks: ${Object.keys(this.config.networks || {}).length}`);
      console.log(`   🌉 Bridges: ${Object.keys(this.config.bridges || {}).length}`);
      console.log(`   🪙 Tokens: ${Object.keys(this.config.tokens || {}).length}`);
      
      return true;
    } catch (error) {
      console.error('❌ Bridge Configuration Loader initialization failed:', error.message);
      this.isInitialized = false;
      throw error;
    }
  }

  /**
   * Pre-populate caches for better performance
   */
  async prePopulateCaches() {
    try {
      // Cache all networks
      const networks = getAllNetworks();
      networks.forEach(network => {
        this.networkCache.set(network.chainId, network);
        this.networkCache.set(network.key, network);
      });

      // Cache bridge contracts
      const bridges = Object.keys(this.config.bridges || {});
      bridges.forEach(bridgeKey => {
        networks.forEach(network => {
          const contract = getBridgeContract(network.key, bridgeKey);
          if (contract) {
            const cacheKey = `${bridgeKey}-${network.key}`;
            this.contractCache.set(cacheKey, contract);
          }
        });
      });

      console.log(`📦 Cached ${this.networkCache.size} network entries and ${this.contractCache.size} contract entries`);
    } catch (error) {
      console.warn('⚠️ Cache pre-population failed:', error.message);
    }
  }

  /**
   * Ensure loader is initialized
   */
  ensureInitialized() {
    if (!this.isInitialized) {
      throw new Error('BridgeConfigLoader not initialized. Call initialize() first.');
    }
  }

  /**
   * Get bridge configuration for a specific protocol
   * @param {string} bridgeKey - Bridge identifier (e.g., 'layerzeroV1', 'layerzeroV2')
   * @returns {Object|null} Bridge configuration
   */
  getBridgeConfig(bridgeKey) {
    this.ensureInitialized();
    
    if (!bridgeKey || typeof bridgeKey !== 'string') {
      throw new Error('Bridge key must be a non-empty string');
    }

    const bridge = this.config.bridges?.[bridgeKey];
    
    if (!bridge) {
      console.warn(`⚠️ Bridge configuration not found for: ${bridgeKey}`);
      return null;
    }

    return {
      key: bridgeKey,
      name: bridge.name,
      version: bridge.version,
      contracts: bridge.contracts || {},
      isActive: this.isBridgeActive(bridgeKey),
      supportedNetworks: Object.keys(bridge.contracts || {}),
      metadata: {
        type: this.getBridgeType(bridgeKey),
        isLayerZero: bridgeKey.includes('layerzero'),
        configuredAt: new Date().toISOString()
      }
    };
  }

  /**
   * Get contract address for a bridge on a specific network
   * @param {string} bridgeKey - Bridge identifier
   * @param {string|number} network - Network key or chain ID
   * @param {string} contractType - Contract type ('endpoint', 'router', etc.)
   * @returns {string|null} Contract address
   */
  getContractAddress(bridgeKey, network, contractType = 'endpoint') {
    this.ensureInitialized();
    
    try {
      // Try cache first
      const cacheKey = `${bridgeKey}-${network}-${contractType}`;
      if (this.contractCache.has(cacheKey)) {
        return this.contractCache.get(cacheKey);
      }

      // Resolve network key
      const networkKey = typeof network === 'number' 
        ? this.getNetworkKey(network)
        : network;

      if (!networkKey) {
        console.warn(`⚠️ Network not found: ${network}`);
        return null;
      }

      const contract = getBridgeContract(networkKey, bridgeKey, contractType);
      
      // Cache the result
      if (contract) {
        this.contractCache.set(cacheKey, contract);
      }
      
      return contract;
    } catch (error) {
      console.error(`❌ Error getting contract address for ${bridgeKey} on ${network}:`, error.message);
      return null;
    }
  }

  /**
   * Get network configuration by chain ID or key
   * @param {string|number} identifier - Network key or chain ID
   * @returns {Object|null} Network configuration
   */
  getNetworkConfig(identifier) {
    this.ensureInitialized();
    
    try {
      // Try cache first
      if (this.networkCache.has(identifier)) {
        return this.networkCache.get(identifier);
      }

      // Get from config utilities
      const network = typeof identifier === 'number'
        ? getNetworkByChainId(identifier)
        : getNetworkByKey(identifier);

      // Cache the result
      if (network) {
        this.networkCache.set(identifier, network);
        this.networkCache.set(network.chainId, network);
        this.networkCache.set(network.key, network);
      }

      return network;
    } catch (error) {
      console.error(`❌ Error getting network config for ${identifier}:`, error.message);
      return null;
    }
  }

  /**
   * Get network key from chain ID
   * @param {number} chainId - EVM chain ID
   * @returns {string|null} Network key
   */
  getNetworkKey(chainId) {
    const network = this.getNetworkConfig(chainId);
    return network?.key || null;
  }

  /**
   * Get LayerZero chain ID for a network
   * @param {string|number} network - Network key or chain ID
   * @returns {number|null} LayerZero chain ID
   */
  getLayerZeroChainId(network) {
    const networkConfig = this.getNetworkConfig(network);
    return networkConfig?.layerZeroChainId || null;
  }

  /**
   * Get token configuration
   * @param {string} tokenSymbol - Token symbol (e.g., 'USDT')
   * @returns {Object|null} Token configuration
   */
  getTokenConfig(tokenSymbol) {
    this.ensureInitialized();
    
    if (!tokenSymbol || typeof tokenSymbol !== 'string') {
      return null;
    }

    const tokenConfig = this.config.tokens?.[tokenSymbol.toUpperCase()];
    
    if (!tokenConfig) {
      return null;
    }

    return {
      symbol: tokenSymbol.toUpperCase(),
      bridgeSupport: tokenConfig.bridgeSupport || {},
      contracts: tokenConfig.contracts || {},
      decimals: tokenConfig.decimals,
      supportedBridges: Object.keys(tokenConfig.bridgeSupport || {}).filter(
        bridge => tokenConfig.bridgeSupport[bridge] === true
      )
    };
  }

  /**
   * Get custom contract address for a token on a network
   * @param {string} tokenSymbol - Token symbol
   * @param {string|number} network - Network key or chain ID
   * @returns {string|null} Contract address
   */
  getCustomContractAddress(tokenSymbol, network) {
    this.ensureInitialized();
    
    const networkKey = typeof network === 'number' 
      ? this.getNetworkKey(network)
      : network;

    if (!networkKey) {
      return null;
    }

    return this.config.customContracts?.[tokenSymbol]?.[networkKey] || null;
  }

  /**
   * Check if a bridge supports a specific token
   * @param {string} bridgeKey - Bridge identifier
   * @param {string} tokenSymbol - Token symbol
   * @returns {boolean} Whether bridge supports token
   */
  doesBridgeSupportToken(bridgeKey, tokenSymbol) {
    const tokenConfig = this.getTokenConfig(tokenSymbol);
    return tokenConfig?.bridgeSupport?.[bridgeKey] === true;
  }

  /**
   * Check if a network supports a specific bridge
   * @param {string|number} network - Network key or chain ID
   * @param {string} bridgeKey - Bridge identifier
   * @returns {boolean} Whether network supports bridge
   */
  doesNetworkSupportBridge(network, bridgeKey) {
    const networkKey = typeof network === 'number' 
      ? this.getNetworkKey(network)
      : network;

    if (!networkKey) {
      return false;
    }

    return doesNetworkSupportBridge(networkKey, bridgeKey);
  }

  /**
   * Get all supported bridges for a token between two networks
   * @param {string} tokenSymbol - Token symbol
   * @param {string|number} fromNetwork - Source network
   * @param {string|number} toNetwork - Destination network
   * @returns {Array} Supported bridge keys
   */
  getSupportedBridgesForRoute(tokenSymbol, fromNetwork, toNetwork) {
    const tokenConfig = this.getTokenConfig(tokenSymbol);
    
    if (!tokenConfig) {
      return [];
    }

    const supportedBridges = tokenConfig.supportedBridges;
    
    return supportedBridges.filter(bridgeKey => {
      return this.doesNetworkSupportBridge(fromNetwork, bridgeKey) &&
             this.doesNetworkSupportBridge(toNetwork, bridgeKey);
    });
  }

  /**
   * Get bridge type from bridge key
   * @param {string} bridgeKey - Bridge identifier
   * @returns {string} Bridge type
   */
  getBridgeType(bridgeKey) {
    if (bridgeKey.includes('layerzero')) return 'layerzero';
    if (bridgeKey.includes('wormhole')) return 'wormhole';
    if (bridgeKey.includes('axelar')) return 'axelar';
    if (bridgeKey.includes('chainlink') || bridgeKey.includes('ccip')) return 'chainlink';
    if (bridgeKey.includes('hyperlane')) return 'hyperlane';
    if (bridgeKey.includes('multichain')) return 'multichain';
    if (bridgeKey.includes('hop')) return 'hop';
    if (bridgeKey.includes('across')) return 'across';
    return 'unknown';
  }

  /**
   * Check if a bridge is currently active
   * @param {string} bridgeKey - Bridge identifier
   * @returns {boolean} Whether bridge is active
   */
  isBridgeActive(bridgeKey) {
    // Should integrate with real bridge status monitoring
    // For now, check if bridge exists in config
    return !!(this.config.bridges?.[bridgeKey]);
  }

  /**
   * Get configuration health status
   * @returns {Object} Health check results
   */
  getHealthStatus() {
    try {
      const health = healthCheck();
      return {
        ...health,
        configLoader: {
          initialized: this.isInitialized,
          cacheSize: {
            networks: this.networkCache.size,
            contracts: this.contractCache.size
          },
          lastValidation: this.lastValidation?.timestamp
        }
      };
    } catch (error) {
      return {
        status: 'error',
        error: error.message,
        configLoader: {
          initialized: this.isInitialized
        }
      };
    }
  }

  /**
   * Reload configuration (useful for hot-reloading)
   * @returns {Promise<boolean>} Reload success
   */
  async reload() {
    try {
      console.log('🔄 Reloading bridge configuration...');
      
      // Clear caches
      this.contractCache.clear();
      this.networkCache.clear();
      
      // Re-initialize
      await this.initialize();
      
      console.log('✅ Configuration reloaded successfully');
      return true;
    } catch (error) {
      console.error('❌ Configuration reload failed:', error.message);
      return false;
    }
  }

  /**
   * Get configuration summary for debugging
   * @returns {Object} Configuration summary
   */
  getConfigSummary() {
    this.ensureInitialized();
    
    const networks = Object.keys(this.config.networks || {});
    const bridges = Object.keys(this.config.bridges || {});
    const tokens = Object.keys(this.config.tokens || {});
    
    return {
      networks: {
        total: networks.length,
        list: networks,
        layerZeroEnabled: networks.filter(net => 
          this.getNetworkConfig(net)?.layerZeroChainId
        ).length
      },
      bridges: {
        total: bridges.length,
        list: bridges,
        byType: bridges.reduce((acc, bridge) => {
          const type = this.getBridgeType(bridge);
          acc[type] = (acc[type] || 0) + 1;
          return acc;
        }, {})
      },
      tokens: {
        total: tokens.length,
        list: tokens
      },
      customContracts: Object.keys(this.config.customContracts || {}),
      lastValidated: this.lastValidation?.timestamp,
      cacheStats: {
        networks: this.networkCache.size,
        contracts: this.contractCache.size
      }
    };
  }
}

// Create singleton instance
const bridgeConfigLoader = new BridgeConfigLoader();

// Export singleton instance and class
module.exports = {
  BridgeConfigLoader,
  bridgeConfigLoader,
  
  // Convenience functions
  getBridgeConfig: (bridgeKey) => bridgeConfigLoader.getBridgeConfig(bridgeKey),
  getContractAddress: (bridgeKey, network, contractType) => 
    bridgeConfigLoader.getContractAddress(bridgeKey, network, contractType),
  getNetworkConfig: (identifier) => bridgeConfigLoader.getNetworkConfig(identifier),
  getTokenConfig: (tokenSymbol) => bridgeConfigLoader.getTokenConfig(tokenSymbol),
  getCustomContractAddress: (tokenSymbol, network) => 
    bridgeConfigLoader.getCustomContractAddress(tokenSymbol, network),
  getSupportedBridgesForRoute: (tokenSymbol, fromNetwork, toNetwork) =>
    bridgeConfigLoader.getSupportedBridgesForRoute(tokenSymbol, fromNetwork, toNetwork),
  getHealthStatus: () => bridgeConfigLoader.getHealthStatus(),
  getConfigSummary: () => bridgeConfigLoader.getConfigSummary()
};
