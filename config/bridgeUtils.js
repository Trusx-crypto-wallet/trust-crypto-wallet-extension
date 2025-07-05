// config/bridgeUtils.js
// Production-grade bridge utilities for cross-chain operations
// Handles bridge selection, routing, and optimization

const { bridgeConfig } = require('./bridgeConfig');
const { getNetworkByKey, getNetworkByChainId, doesNetworkSupportBridge } = require('./networkUtils');

/**
 * Get all supported bridges for a token between two networks
 * @param {string} fromNetwork - Source network key
 * @param {string} toNetwork - Destination network key
 * @param {string} tokenSymbol - Token symbol (e.g., 'USDT')
 * @returns {Array} Array of supported bridge configurations
 */
function getSupportedBridges(fromNetwork, toNetwork, tokenSymbol) {
  if (!fromNetwork || !toNetwork || !tokenSymbol) {
    return [];
  }

  const tokens = bridgeConfig.tokens || {};
  const tokenConfig = tokens[tokenSymbol];
  
  if (!tokenConfig || !tokenConfig.bridgeSupport) {
    return [];
  }

  const supportedBridges = [];
  const bridges = bridgeConfig.bridges || {};

  for (const [bridgeKey, isSupported] of Object.entries(tokenConfig.bridgeSupport)) {
    if (!isSupported) continue;

    const bridge = bridges[bridgeKey];
    if (!bridge) continue;

    // Check if both networks support this bridge
    const fromSupported = doesNetworkSupportBridge(fromNetwork, bridgeKey);
    const toSupported = doesNetworkSupportBridge(toNetwork, bridgeKey);

    if (fromSupported && toSupported) {
              supportedBridges.push({
        key: bridgeKey,
        name: bridge.name,
        version: bridge.version,
        type: getBridgeType(bridgeKey),
        config: bridge,
        fromContract: bridge.contracts[fromNetwork],
        toContract: bridge.contracts[toNetwork],
        estimatedTime: getEstimatedBridgeTime(bridgeKey),
        fees: getEstimatedFees(bridgeKey, fromNetwork, toNetwork),
        security: getBridgeSecurityLevel(bridgeKey),
        liquidity: getBridgeLiquidity(bridgeKey, tokenSymbol, fromNetwork, toNetwork)
      });
    }
  }

  return supportedBridges.sort((a, b) => {
    // Sort by priority: security > speed > fees
    if (a.security !== b.security) return b.security - a.security;
    if (a.estimatedTime !== b.estimatedTime) return a.estimatedTime - b.estimatedTime;
    return a.fees.total - b.fees.total;
  });
}

/**
 * Get optimal bridge for a cross-chain transfer
 * @param {string} fromNetwork - Source network key
 * @param {string} toNetwork - Destination network key
 * @param {string} tokenSymbol - Token symbol
 * @param {string} amount - Transfer amount (in token units)
 * @param {Object} preferences - User preferences for bridge selection
 * @returns {Object|null} Optimal bridge configuration
 */
function getOptimalBridge(fromNetwork, toNetwork, tokenSymbol, amount, preferences = {}) {
  const supportedBridges = getSupportedBridges(fromNetwork, toNetwork, tokenSymbol);
  
  if (supportedBridges.length === 0) {
    return null;
  }

  const {
    prioritizeSpeed = false,
    prioritizeCost = false,
    prioritizeSecurity = true,
    maxTime = null,
    maxFees = null,
    preferredBridges = [],
    avoidBridges = []
  } = preferences;

  // Filter based on user constraints
  let filteredBridges = supportedBridges.filter(bridge => {
    // Avoid blacklisted bridges
    if (avoidBridges.includes(bridge.key)) return false;
    
    // Check time constraints
    if (maxTime && bridge.estimatedTime > maxTime) return false;
    
    // Check fee constraints
    if (maxFees && bridge.fees.total > maxFees) return false;
    
    // Check liquidity for the amount
    if (amount && !hasAdequateLiquidity(bridge, tokenSymbol, amount)) return false;
    
    return true;
  });

  if (filteredBridges.length === 0) {
    return supportedBridges[0]; // Return best available if constraints are too strict
  }

  // Prefer user-specified bridges
  if (preferredBridges.length > 0) {
    const preferredBridge = filteredBridges.find(bridge => 
      preferredBridges.includes(bridge.key)
    );
    if (preferredBridge) return preferredBridge;
  }

  // Apply scoring based on preferences
  const scoredBridges = filteredBridges.map(bridge => {
    let score = 0;
    
    // Security scoring (0-100)
    score += bridge.security * (prioritizeSecurity ? 2 : 1);
    
    // Speed scoring (inverse of time, 0-100)
    const maxTimeInSet = Math.max(...filteredBridges.map(b => b.estimatedTime));
    const speedScore = maxTimeInSet > 0 ? (maxTimeInSet - bridge.estimatedTime) / maxTimeInSet * 100 : 50;
    score += speedScore * (prioritizeSpeed ? 2 : 1);
    
    // Cost scoring (inverse of fees, 0-100)
    const maxFeesInSet = Math.max(...filteredBridges.map(b => b.fees.total));
    const costScore = maxFeesInSet > 0 ? (maxFeesInSet - bridge.fees.total) / maxFeesInSet * 100 : 50;
    score += costScore * (prioritizeCost ? 2 : 1);
    
    // Liquidity bonus
    score += bridge.liquidity * 0.5;
    
    // LayerZero V2 preference (future-proofing)
    if (bridge.key === 'layerzeroV2') score += 10;
    
    return { ...bridge, score };
  });

  // Return highest scored bridge
  return scoredBridges.sort((a, b) => b.score - a.score)[0];
}

/**
 * Get all available bridges
 * @returns {Array} Array of all bridge configurations
 */
function getAllBridges() {
  const bridges = bridgeConfig.bridges || {};
  
  return Object.entries(bridges).map(([key, bridge]) => ({
    key,
    name: bridge.name,
    version: bridge.version,
    type: getBridgeType(key),
    config: bridge,
    supportedNetworks: Object.keys(bridge.contracts || {}),
    isActive: isBridgeActive(key),
    estimatedTime: getEstimatedBridgeTime(key),
    security: getBridgeSecurityLevel(key)
  }));
}

/**
 * Get bridges by type (LayerZero, Wormhole, etc.)
 * @param {string} bridgeType - Bridge type identifier
 * @returns {Array} Array of bridges of the specified type
 */
function getBridgesByType(bridgeType) {
  return getAllBridges().filter(bridge => bridge.type === bridgeType);
}

/**
 * Check if a bridge supports a specific token
 * @param {string} bridgeKey - Bridge identifier
 * @param {string} tokenSymbol - Token symbol
 * @returns {boolean} Whether the bridge supports the token
 */
function doesBridgeSupportToken(bridgeKey, tokenSymbol) {
  const tokens = bridgeConfig.tokens || {};
  const tokenConfig = tokens[tokenSymbol];
  
  return !!(tokenConfig?.bridgeSupport?.[bridgeKey]);
}

/**
 * Get tokens supported by a bridge
 * @param {string} bridgeKey - Bridge identifier
 * @returns {Array} Array of supported token symbols
 */
function getTokensSupportedByBridge(bridgeKey) {
  const tokens = bridgeConfig.tokens || {};
  const supportedTokens = [];

  for (const [tokenSymbol, tokenConfig] of Object.entries(tokens)) {
    if (tokenConfig.bridgeSupport?.[bridgeKey]) {
      supportedTokens.push(tokenSymbol);
    }
  }

  return supportedTokens;
}

/**
 * Get bridge routes between networks
 * @param {string} fromNetwork - Source network
 * @param {string} toNetwork - Destination network
 * @returns {Array} Available bridge routes
 */
function getBridgeRoutes(fromNetwork, toNetwork) {
  const bridges = bridgeConfig.bridges || {};
  const routes = [];

  for (const [bridgeKey, bridge] of Object.entries(bridges)) {
    const fromSupported = doesNetworkSupportBridge(fromNetwork, bridgeKey);
    const toSupported = doesNetworkSupportBridge(toNetwork, bridgeKey);

    if (fromSupported && toSupported) {
      routes.push({
        bridgeKey,
        bridgeName: bridge.name,
        fromContract: bridge.contracts[fromNetwork],
        toContract: bridge.contracts[toNetwork],
        estimatedTime: getEstimatedBridgeTime(bridgeKey),
        fees: getEstimatedFees(bridgeKey, fromNetwork, toNetwork)
      });
    }
  }

  return routes;
}

/**
 * Calculate bridge fees for a transfer
 * @param {string} bridgeKey - Bridge identifier
 * @param {string} fromNetwork - Source network
 * @param {string} toNetwork - Destination network
 * @param {string} amount - Transfer amount
 * @returns {Object} Fee breakdown
 */
function calculateBridgeFees(bridgeKey, fromNetwork, toNetwork, amount = '0') {
  const baseFees = getEstimatedFees(bridgeKey, fromNetwork, toNetwork);
  const amountNum = parseFloat(amount) || 0;

  // Calculate percentage-based fees
  const percentageFee = baseFees.percentage ? (amountNum * baseFees.percentage / 100) : 0;

  return {
    baseFee: baseFees.base || 0,
    percentageFee,
    gasFee: baseFees.gas || 0,
    protocolFee: baseFees.protocol || 0,
    total: (baseFees.base || 0) + percentageFee + (baseFees.gas || 0) + (baseFees.protocol || 0),
    currency: baseFees.currency || 'USD'
  };
}

/**
 * Get bridge transaction limits
 * @param {string} bridgeKey - Bridge identifier
 * @param {string} tokenSymbol - Token symbol
 * @param {string} fromNetwork - Source network
 * @param {string} toNetwork - Destination network
 * @returns {Object} Transaction limits
 */
function getBridgeLimits(bridgeKey, tokenSymbol, fromNetwork, toNetwork) {
  // Default limits - should be configurable per bridge
  const defaultLimits = {
    min: '0.01',
    max: '1000000',
    daily: '10000000',
    currency: tokenSymbol
  };

  // Bridge-specific limits
  const bridgeLimits = {
    layerzeroV1: {
      USDT: { min: '0.01', max: '100000', daily: '1000000' },
      USDC: { min: '0.01', max: '100000', daily: '1000000' },
      WETH: { min: '0.001', max: '1000', daily: '10000' }
    },
    layerzeroV2: {
      USDT: { min: '0.01', max: '500000', daily: '5000000' },
      USDC: { min: '0.01', max: '500000', daily: '5000000' },
      WETH: { min: '0.001', max: '5000', daily: '50000' }
    },
    wormhole: {
      USDT: { min: '1', max: '50000', daily: '500000' },
      USDC: { min: '1', max: '50000', daily: '500000' },
      WETH: { min: '0.01', max: '500', daily: '5000' }
    }
  };

  const limits = bridgeLimits[bridgeKey]?.[tokenSymbol] || defaultLimits;
  
  return {
    ...limits,
    currency: tokenSymbol
  };
}

/**
 * Validate bridge transfer parameters
 * @param {Object} transferParams - Transfer parameters
 * @returns {Object} Validation result
 */
function validateBridgeTransfer(transferParams) {
  const { bridgeKey, fromNetwork, toNetwork, tokenSymbol, amount } = transferParams;
  const errors = [];
  const warnings = [];

  // Check if bridge exists
  const bridges = bridgeConfig.bridges || {};
  if (!bridges[bridgeKey]) {
    errors.push(`Bridge ${bridgeKey} not found`);
    return { isValid: false, errors, warnings };
  }

  // Check network support
  if (!doesNetworkSupportBridge(fromNetwork, bridgeKey)) {
    errors.push(`Bridge ${bridgeKey} does not support source network ${fromNetwork}`);
  }

  if (!doesNetworkSupportBridge(toNetwork, bridgeKey)) {
    errors.push(`Bridge ${bridgeKey} does not support destination network ${toNetwork}`);
  }

  // Check token support
  if (!doesBridgeSupportToken(bridgeKey, tokenSymbol)) {
    errors.push(`Bridge ${bridgeKey} does not support token ${tokenSymbol}`);
  }

  // Check amount limits
  if (amount) {
    const limits = getBridgeLimits(bridgeKey, tokenSymbol, fromNetwork, toNetwork);
    const amountNum = parseFloat(amount);
    
    if (amountNum < parseFloat(limits.min)) {
      errors.push(`Amount ${amount} is below minimum ${limits.min} ${tokenSymbol}`);
    }
    
    if (amountNum > parseFloat(limits.max)) {
      errors.push(`Amount ${amount} exceeds maximum ${limits.max} ${tokenSymbol}`);
    }
  }

  // Check bridge status
  if (!isBridgeActive(bridgeKey)) {
    warnings.push(`Bridge ${bridgeKey} is currently inactive or under maintenance`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Get bridge type from bridge key
 * @param {string} bridgeKey - Bridge identifier
 * @returns {string} Bridge type
 */
function getBridgeType(bridgeKey) {
  if (bridgeKey.includes('layerzero')) return 'layerzero';
  if (bridgeKey.includes('wormhole')) return 'wormhole';
  if (bridgeKey.includes('axelar')) return 'axelar';
  if (bridgeKey.includes('multichain')) return 'multichain';
  return 'unknown';
}

/**
 * Get estimated bridge time in minutes
 * @param {string} bridgeKey - Bridge identifier
 * @returns {number} Estimated time in minutes
 */
function getEstimatedBridgeTime(bridgeKey) {
  const bridgeTimes = {
    layerzeroV1: 5,
    layerzeroV2: 3,
    wormhole: 15,
    axelar: 10,
    multichain: 20
  };
  
  return bridgeTimes[bridgeKey] || 15;
}

/**
 * Get estimated fees for a bridge
 * @param {string} bridgeKey - Bridge identifier
 * @param {string} fromNetwork - Source network
 * @param {string} toNetwork - Destination network
 * @returns {Object} Fee structure
 */
function getEstimatedFees(bridgeKey, fromNetwork, toNetwork) {
  // Base fee structure - should be updated based on real data
  const baseFees = {
    layerzeroV1: { base: 5, percentage: 0.05, gas: 0.01, protocol: 0, currency: 'USD' },
    layerzeroV2: { base: 3, percentage: 0.03, gas: 0.008, protocol: 0, currency: 'USD' },
    wormhole: { base: 8, percentage: 0.1, gas: 0.02, protocol: 0, currency: 'USD' },
    axelar: { base: 6, percentage: 0.08, gas: 0.015, protocol: 0, currency: 'USD' },
    multichain: { base: 10, percentage: 0.15, gas: 0.025, protocol: 0, currency: 'USD' }
  };

  const fees = baseFees[bridgeKey] || { base: 10, percentage: 0.1, gas: 0.02, protocol: 0, currency: 'USD' };
  
  // Calculate total base fees
  fees.total = fees.base + fees.gas + fees.protocol;
  
  return fees;
}

/**
 * Get bridge security level (0-100)
 * @param {string} bridgeKey - Bridge identifier
 * @returns {number} Security score
 */
function getBridgeSecurityLevel(bridgeKey) {
  const securityScores = {
    layerzeroV2: 95,
    layerzeroV1: 90,
    axelar: 88,
    wormhole: 85,
    multichain: 75
  };
  
  return securityScores[bridgeKey] || 70;
}

/**
 * Get bridge liquidity level (0-100)
 * @param {string} bridgeKey - Bridge identifier
 * @param {string} tokenSymbol - Token symbol
 * @param {string} fromNetwork - Source network
 * @param {string} toNetwork - Destination network
 * @returns {number} Liquidity score
 */
function getBridgeLiquidity(bridgeKey, tokenSymbol, fromNetwork, toNetwork) {
  // Simplified liquidity scoring - should integrate with real liquidity data
  const liquidityScores = {
    layerzeroV1: 85,
    layerzeroV2: 80,
    wormhole: 90,
    axelar: 75,
    multichain: 70
  };
  
  return liquidityScores[bridgeKey] || 60;
}

/**
 * Check if bridge has adequate liquidity for amount
 * @param {Object} bridge - Bridge configuration
 * @param {string} tokenSymbol - Token symbol
 * @param {string} amount - Transfer amount
 * @returns {boolean} Whether liquidity is adequate
 */
function hasAdequateLiquidity(bridge, tokenSymbol, amount) {
  // Simplified check - should integrate with real liquidity APIs
  const amountNum = parseFloat(amount) || 0;
  const liquidityThreshold = bridge.liquidity / 100;
  
  // Very basic heuristic: if amount is less than 10% of daily limit, assume adequate liquidity
  const limits = getBridgeLimits(bridge.key, tokenSymbol, '', '');
  const dailyLimitNum = parseFloat(limits.daily) || 1000000;
  
  return amountNum < (dailyLimitNum * 0.1 * liquidityThreshold);
}

/**
 * Check if bridge is currently active
 * @param {string} bridgeKey - Bridge identifier
 * @returns {boolean} Whether bridge is active
 */
function isBridgeActive(bridgeKey) {
  // Should integrate with real bridge status monitoring
  // For now, assume all configured bridges are active
  const bridges = bridgeConfig.bridges || {};
  return !!bridges[bridgeKey];
}

/**
 * Get bridge statistics
 * @param {string} bridgeKey - Bridge identifier
 * @returns {Object} Bridge statistics
 */
function getBridgeStats(bridgeKey) {
  return {
    totalVolume24h: 0, // Should fetch from analytics
    totalTransactions24h: 0,
    averageTime: getEstimatedBridgeTime(bridgeKey),
    successRate: 99.5, // Should fetch from monitoring
    uptime: 99.9,
    supportedNetworks: Object.keys(bridgeConfig.bridges?.[bridgeKey]?.contracts || {}),
    supportedTokens: getTokensSupportedByBridge(bridgeKey)
  };
}

module.exports = {
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
};
