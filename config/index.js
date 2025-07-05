// config/index.js
// Clean main interface for bridge configuration system
// Centralized exports for all bridge-related configurations and utilities

// Core Configuration Imports
const { bridgeConfig } = require('./bridgeConfig');

// Validation Imports
const {
  validateBridgeConfig,
  validateNetworks,
  validateBridges,
  validateTokens,
  validateLayerZeroBridge,
  validateCrossDependencies,
  validateOnLoad,
  isValidEthereumAddress,
  isValidUrl
} = require('./validation');

// Network Utility Imports
const {
  getNetworkByChainId,
  getNetworkByKey,
  getNetworkByLayerZeroChainId,
  getLayerZeroChainId,
  getEvmChainId,
  getAllNetworks,
  getNetworksByBridge,
  doesNetworkSupportBridge,
  getBridgeContract,
  getAvailableBridges,
  getAvailableBridgesBetweenNetworks,
  getNetworkNativeCurrency,
  isTestnet,
  getMainnetNetworks,
  getTestnetNetworks,
  getLayerZeroChainIdMapping,
  getReverseLayerZeroChainIdMapping,
  validateNetwork,
  getNetworkDisplayName,
  searchNetworksByName
} = require('./networkUtils');

// Bridge Utility Imports
const {
  getSupportedBridges,
  getOptimalBridge,
  getAllBridges,
  getBridgesByType,
  doesBridgeSupportToken,
  getTokensSupportedByBridge,
  getBridgeRoutes,
  calculateBridgeFees,
  getBridgeLimits,
  validateBridgeTransfer,
  getBridgeType,
  getEstimatedBridgeTime,
  getEstimatedFees,
  getBridgeSecurityLevel,
  getBridgeLiquidity,
  hasAdequateLiquidity,
  isBridgeActive,
  getBridgeStats
} = require('./bridgeUtils');

// Additional Configuration Imports (leverage existing structure)
let chainsConfig, tokenConfig, priceConfig, gasConfig;

try {
  chainsConfig = require('./chains.config');
} catch (error) {
  console.warn('chains.config.js not found, some features may be limited');
  chainsConfig = {};
}

try {
  tokenConfig = require('./token.config');
} catch (error) {
  console.warn('token.config.js not found, some features may be limited');
  tokenConfig = {};
}

try {
  priceConfig = require('./price.config');
} catch (error) {
  console.warn('price.config.js not found, some features may be limited');
  priceConfig = {};
}

try {
  gasConfig = require('./gas.config');
} catch (error) {
  console.warn('gas.config.js not found, some features may be limited');
  gasConfig = {};
}

/**
 * Initialize and validate configuration on module load
 */
function initializeBridgeConfig() {
  try {
    console.log('🚀 Initializing Bridge Configuration System...');
    
    // Validate configuration
    const validation = validateBridgeConfig();
    
    if (!validation.isValid) {
      console.error('❌ Bridge Configuration Validation Failed:');
      validation.errors.forEach(error => console.error(`  - ${error}`));
      throw new Error('Bridge configuration validation failed');
    }
    
    if (validation.warnings.length > 0) {
      console.warn('⚠️  Bridge Configuration Warnings:');
      validation.warnings.forEach(warning => console.warn(`  - ${warning}`));
    }
    
    // Log configuration summary
    console.log('✅ Bridge Configuration Initialized Successfully');
    console.log(`   📊 Summary:`);
    console.log(`      - Networks: ${validation.summary.totalNetworks}`);
    console.log(`      - Bridges: ${validation.summary.totalBridges}`);
    console.log(`      - Tokens: ${validation.summary.totalTokens}`);
    console.log(`      - LayerZero V1: ${validation.summary.hasLayerZeroV1 ? '✅' : '❌'}`);
    console.log(`      - LayerZero V2: ${validation.summary.hasLayerZeroV2 ? '✅' : '❌'}`);
    
    return validation;
  } catch (error) {
    console.error('❌ Bridge Configuration Initialization Failed:', error.message);
    throw error;
  }
}

/**
 * Get complete bridge configuration with validation
 * @returns {Object} Complete validated bridge configuration
 */
function getValidatedBridgeConfig() {
  const validation = validateBridgeConfig();
  
  return {
    config: bridgeConfig,
    validation,
    isValid: validation.isValid,
    metadata: {
      totalNetworks: Object.keys(bridgeConfig.networks || {}).length,
      totalBridges: Object.keys(bridgeConfig.bridges || {}).length,
      totalTokens: Object.keys(bridgeConfig.tokens || {}).length,
      supportedBridgeTypes: [...new Set(Object.keys(bridgeConfig.bridges || {}).map(getBridgeType))],
      lastValidated: new Date().toISOString()
    }
  };
}

/**
 * Get bridge configuration summary for debugging/monitoring
 * @returns {Object} Configuration summary
 */
function getBridgeConfigSummary() {
  const networks = getAllNetworks();
  const bridges = getAllBridges();
  const tokens = Object.keys(bridgeConfig.tokens || {});
  
  return {
    networks: {
      total: networks.length,
      mainnet: networks.filter(n => !n.testnet).length,
      testnet: networks.filter(n => n.testnet).length,
      layerZeroEnabled: networks.filter(n => n.layerZeroChainId).length
    },
    bridges: {
      total: bridges.length,
      active: bridges.filter(b => b.isActive).length,
      byType: bridges.reduce((acc, bridge) => {
        acc[bridge.type] = (acc[bridge.type] || 0) + 1;
        return acc;
      }, {})
    },
    tokens: {
      total: tokens.length,
      byBridgeSupport: tokens.reduce((acc, tokenSymbol) => {
        const tokenConfig = bridgeConfig.tokens[tokenSymbol];
        const supportedBridges = Object.keys(tokenConfig?.bridgeSupport || {});
        supportedBridges.forEach(bridge => {
          acc[bridge] = (acc[bridge] || 0) + 1;
        });
        return acc;
      }, {})
    },
    crossChainRoutes: calculateTotalRoutes(),
    lastUpdated: new Date().toISOString()
  };
}

/**
 * Calculate total possible cross-chain routes
 * @returns {number} Total possible routes
 */
function calculateTotalRoutes() {
  const networks = getAllNetworks();
  const bridges = getAllBridges();
  let totalRoutes = 0;
  
  for (let i = 0; i < networks.length; i++) {
    for (let j = 0; j < networks.length; j++) {
      if (i !== j) {
        const availableBridges = getAvailableBridgesBetweenNetworks(
          networks[i].key, 
          networks[j].key
        );
        if (availableBridges.length > 0) {
          totalRoutes++;
        }
      }
    }
  }
  
  return totalRoutes;
}

/**
 * Health check for bridge configuration
 * @returns {Object} Health check results
 */
function healthCheck() {
  const start = Date.now();
  const results = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    checks: {}
  };
  
  try {
    // Configuration validation check
    const validation = validateBridgeConfig();
    results.checks.configuration = {
      status: validation.isValid ? 'pass' : 'fail',
      errors: validation.errors,
      warnings: validation.warnings
    };
    
    // Network connectivity check (basic)
    const networks = getAllNetworks();
    results.checks.networks = {
      status: networks.length > 0 ? 'pass' : 'fail',
      total: networks.length,
      mainnet: networks.filter(n => !n.testnet).length
    };
    
    // Bridge availability check
    const bridges = getAllBridges();
    const activeBridges = bridges.filter(b => b.isActive);
    results.checks.bridges = {
      status: activeBridges.length > 0 ? 'pass' : 'fail',
      total: bridges.length,
      active: activeBridges.length
    };
    
    // LayerZero specific check
    const hasLayerZeroV1 = !!bridgeConfig.bridges?.layerzeroV1;
    const hasLayerZeroV2 = !!bridgeConfig.bridges?.layerzeroV2;
    results.checks.layerzero = {
      status: (hasLayerZeroV1 || hasLayerZeroV2) ? 'pass' : 'fail',
      v1Available: hasLayerZeroV1,
      v2Available: hasLayerZeroV2
    };
    
    // Overall status
    const failedChecks = Object.values(results.checks).filter(check => check.status === 'fail');
    results.status = failedChecks.length === 0 ? 'healthy' : 'unhealthy';
    results.responseTime = Date.now() - start;
    
  } catch (error) {
    results.status = 'error';
    results.error = error.message;
    results.responseTime = Date.now() - start;
  }
  
  return results;
}

// Initialize configuration on module load
let initializationResult;
try {
  initializationResult = initializeBridgeConfig();
} catch (error) {
  console.error('Failed to initialize bridge configuration:', error.message);
  initializationResult = { isValid: false, errors: [error.message] };
}

// Main Exports - Clean Interface
module.exports = {
  // Core Configuration
  bridgeConfig,
  
  // Additional Configurations (from existing structure)
  chainsConfig,
  tokenConfig,
  priceConfig,
  gasConfig,
  
  // Validation Functions
  validateBridgeConfig,
  validateNetworks,
  validateBridges,
  validateTokens,
  validateLayerZeroBridge,
  validateCrossDependencies,
  validateOnLoad,
  isValidEthereumAddress,
  isValidUrl,
  
  // Network Utilities
  getNetworkByChainId,
  getNetworkByKey,
  getNetworkByLayerZeroChainId,
  getLayerZeroChainId,
  getEvmChainId,
  getAllNetworks,
  getNetworksByBridge,
  doesNetworkSupportBridge,
  getBridgeContract,
  getAvailableBridges,
  getAvailableBridgesBetweenNetworks,
  getNetworkNativeCurrency,
  isTestnet,
  getMainnetNetworks,
  getTestnetNetworks,
  getLayerZeroChainIdMapping,
  getReverseLayerZeroChainIdMapping,
  validateNetwork,
  getNetworkDisplayName,
  searchNetworksByName,
  
  // Bridge Utilities
  getSupportedBridges,
  getOptimalBridge,
  getAllBridges,
  getBridgesByType,
  doesBridgeSupportToken,
  getTokensSupportedByBridge,
  getBridgeRoutes,
  calculateBridgeFees,
  getBridgeLimits,
  validateBridgeTransfer,
  getBridgeType,
  getEstimatedBridgeTime,
  getEstimatedFees,
  getBridgeSecurityLevel,
  getBridgeLiquidity,
  hasAdequateLiquidity,
  isBridgeActive,
  getBridgeStats,
  
  // Configuration Management
  getValidatedBridgeConfig,
  getBridgeConfigSummary,
  healthCheck,
  initializeBridgeConfig,
  
  // Initialization Status
  initializationResult,
  
  // Utility Functions
  calculateTotalRoutes
};
