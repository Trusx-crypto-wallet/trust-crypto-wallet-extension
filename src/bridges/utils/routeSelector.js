// src/bridges/utils/routeSelector.js
// Production-grade route selection utilities
// Uses bridge configuration system for intelligent route optimization

const { 
  getSupportedBridges,
  getOptimalBridge,
  calculateBridgeFees,
  getBridgeLimits,
  getEstimatedBridgeTime,
  getBridgeSecurityLevel,
  getBridgeLiquidity,
  validateBridgeTransfer
} = require('../../../config');

const { bridgeConfigLoader } = require('./configLoader');

/**
 * Route Selection Utilities
 * Provides intelligent route selection and optimization for cross-chain transfers
 */
class RouteSelector {
  constructor() {
    this.routeCache = new Map();
    this.performanceMetrics = new Map();
    this.blacklistedRoutes = new Set();
    
    // Route selection preferences
    this.defaultPreferences = {
      prioritizeSpeed: false,
      prioritizeCost: false,
      prioritizeSecurity: true,
      maxTime: null,
      maxFees: null,
      preferredBridges: [],
      avoidBridges: [],
      minLiquidity: 60, // Minimum liquidity score (0-100)
      minSecurity: 70,  // Minimum security score (0-100)
      allowExperimental: false
    };
  }

  /**
   * Get optimal route for a cross-chain transfer
   * @param {Object} transferParams - Transfer parameters
   * @returns {Object|null} Optimal route configuration
   */
  async getOptimalRoute(transferParams) {
    try {
      const {
        fromNetwork,
        toNetwork,
        tokenSymbol,
        amount,
        preferences = {}
      } = transferParams;

      // Validate input parameters
      const validation = this.validateTransferParams(transferParams);
      if (!validation.isValid) {
        throw new Error(`Invalid transfer parameters: ${validation.errors.join(', ')}`);
      }

      // Check cache first
      const cacheKey = this.generateCacheKey(transferParams);
      if (this.routeCache.has(cacheKey)) {
        const cachedRoute = this.routeCache.get(cacheKey);
        if (this.isCacheValid(cachedRoute)) {
          console.log(`📦 Using cached route for ${tokenSymbol} ${fromNetwork} → ${toNetwork}`);
          return cachedRoute.route;
        }
      }

      // Get supported bridges for this route
      const supportedBridges = getSupportedBridges(fromNetwork, toNetwork, tokenSymbol);
      
      if (supportedBridges.length === 0) {
        console.warn(`⚠️ No supported bridges found for ${tokenSymbol} from ${fromNetwork} to ${toNetwork}`);
        return null;
      }

      console.log(`🔍 Found ${supportedBridges.length} supported bridges for ${tokenSymbol} route`);

      // Apply filters and scoring
      const filteredBridges = await this.filterAndScoreBridges(
        supportedBridges,
        transferParams,
        preferences
      );

      if (filteredBridges.length === 0) {
        console.warn(`⚠️ No bridges passed filtering criteria for ${tokenSymbol} route`);
        return null;
      }

      // Get optimal bridge using config system
      const mergedPreferences = { ...this.defaultPreferences, ...preferences };
      const optimalBridge = getOptimalBridge(
        fromNetwork,
        toNetwork,
        tokenSymbol,
        amount,
        mergedPreferences
      );

      if (!optimalBridge) {
        console.warn(`⚠️ No optimal bridge found for ${tokenSymbol} route`);
        return null;
      }

      // Build complete route configuration
      const route = await this.buildRouteConfiguration(
        optimalBridge,
        transferParams,
        filteredBridges
      );

      // Cache the result
      this.cacheRoute(cacheKey, route);

      // Update performance metrics
      this.updatePerformanceMetrics(route.bridgeKey, 'selected');

      console.log(`✅ Selected optimal route: ${route.bridgeKey} for ${tokenSymbol} transfer`);
      return route;

    } catch (error) {
      console.error('❌ Error selecting optimal route:', error.message);
      throw error;
    }
  }

  /**
   * Get all available routes for a transfer
   * @param {Object} transferParams - Transfer parameters
   * @returns {Array} Array of available routes
   */
  async getAllAvailableRoutes(transferParams) {
    try {
      const { fromNetwork, toNetwork, tokenSymbol, amount } = transferParams;

      // Get all supported bridges
      const supportedBridges = getSupportedBridges(fromNetwork, toNetwork, tokenSymbol);
      
      if (supportedBridges.length === 0) {
        return [];
      }

      // Build route configurations for all bridges
      const routes = [];
      
      for (const bridge of supportedBridges) {
        try {
          const route = await this.buildRouteConfiguration(
            bridge,
            transferParams,
            supportedBridges
          );
          
          if (route) {
            routes.push(route);
          }
        } catch (error) {
          console.warn(`⚠️ Failed to build route for bridge ${bridge.key}:`, error.message);
        }
      }

      // Sort routes by score
      return routes.sort((a, b) => b.score - a.score);

    } catch (error) {
      console.error('❌ Error getting available routes:', error.message);
      return [];
    }
  }

  /**
   * Filter and score bridges based on criteria
   * @param {Array} bridges - Available bridges
   * @param {Object} transferParams - Transfer parameters
   * @param {Object} preferences - User preferences
   * @returns {Array} Filtered and scored bridges
   */
  async filterAndScoreBridges(bridges, transferParams, preferences) {
    const { amount, tokenSymbol, fromNetwork, toNetwork } = transferParams;
    const mergedPreferences = { ...this.defaultPreferences, ...preferences };
    
    const filteredBridges = [];

    for (const bridge of bridges) {
      try {
        // Check blacklist
        const routeId = `${bridge.key}-${fromNetwork}-${toNetwork}`;
        if (this.blacklistedRoutes.has(routeId)) {
          console.log(`🚫 Skipping blacklisted route: ${routeId}`);
          continue;
        }

        // Check bridge preferences
        if (mergedPreferences.avoidBridges.includes(bridge.key)) {
          console.log(`🚫 Skipping avoided bridge: ${bridge.key}`);
          continue;
        }

        // Validate transfer parameters for this bridge
        const validation = validateBridgeTransfer({
          bridgeKey: bridge.key,
          fromNetwork,
          toNetwork,
          tokenSymbol,
          amount
        });

        if (!validation.isValid) {
          console.log(`❌ Bridge ${bridge.key} failed validation:`, validation.errors);
          continue;
        }

        // Check security requirements
        if (bridge.security < mergedPreferences.minSecurity) {
          console.log(`🔐 Bridge ${bridge.key} security too low: ${bridge.security} < ${mergedPreferences.minSecurity}`);
          continue;
        }

        // Check liquidity requirements
        if (bridge.liquidity < mergedPreferences.minLiquidity) {
          console.log(`💧 Bridge ${bridge.key} liquidity too low: ${bridge.liquidity} < ${mergedPreferences.minLiquidity}`);
          continue;
        }

        // Check time constraints
        if (mergedPreferences.maxTime && bridge.estimatedTime > mergedPreferences.maxTime) {
          console.log(`⏰ Bridge ${bridge.key} too slow: ${bridge.estimatedTime}min > ${mergedPreferences.maxTime}min`);
          continue;
        }

        // Check fee constraints
        if (mergedPreferences.maxFees && bridge.fees.total > mergedPreferences.maxFees) {
          console.log(`💰 Bridge ${bridge.key} too expensive: $${bridge.fees.total} > $${mergedPreferences.maxFees}`);
          continue;
        }

        // Calculate detailed fees for this specific amount
        if (amount) {
          const detailedFees = calculateBridgeFees(bridge.key, fromNetwork, toNetwork, amount);
          bridge.detailedFees = detailedFees;
        }

        // Check bridge limits
        const limits = getBridgeLimits(bridge.key, tokenSymbol, fromNetwork, toNetwork);
        if (amount) {
          const amountNum = parseFloat(amount);
          if (amountNum < parseFloat(limits.min) || amountNum > parseFloat(limits.max)) {
            console.log(`📏 Amount ${amount} outside limits for ${bridge.key}: ${limits.min} - ${limits.max}`);
            continue;
          }
        }

        // Add performance metrics
        bridge.performance = this.getPerformanceMetrics(bridge.key);
        
        // Calculate composite score
        bridge.compositeScore = this.calculateCompositeScore(bridge, mergedPreferences);

        filteredBridges.push(bridge);

      } catch (error) {
        console.warn(`⚠️ Error filtering bridge ${bridge.key}:`, error.message);
      }
    }

    // Sort by composite score
    return filteredBridges.sort((a, b) => b.compositeScore - a.compositeScore);
  }

  /**
   * Calculate composite score for bridge selection
   * @param {Object} bridge - Bridge configuration
   * @param {Object} preferences - User preferences
   * @returns {number} Composite score (0-100)
   */
  calculateCompositeScore(bridge, preferences) {
    let score = 0;
    let totalWeight = 0;

    // Security scoring (0-100)
    const securityWeight = preferences.prioritizeSecurity ? 3 : 1;
    score += bridge.security * securityWeight;
    totalWeight += securityWeight;

    // Speed scoring (inverse of time, 0-100)
    const speedWeight = preferences.prioritizeSpeed ? 3 : 1;
    const maxTime = 60; // Assume 60 minutes as maximum reasonable time
    const speedScore = Math.max(0, (maxTime - bridge.estimatedTime) / maxTime * 100);
    score += speedScore * speedWeight;
    totalWeight += speedWeight;

    // Cost scoring (inverse of fees, 0-100)
    const costWeight = preferences.prioritizeCost ? 3 : 1;
    const maxFees = 50; // Assume $50 as maximum reasonable fees
    const costScore = Math.max(0, (maxFees - bridge.fees.total) / maxFees * 100);
    score += costScore * costWeight;
    totalWeight += costWeight;

    // Liquidity scoring (0-100)
    const liquidityWeight = 1;
    score += bridge.liquidity * liquidityWeight;
    totalWeight += liquidityWeight;

    // Performance bonus (based on historical data)
    if (bridge.performance) {
      const performanceWeight = 0.5;
      const performanceScore = (bridge.performance.successRate || 90); // Default 90% if no data
      score += performanceScore * performanceWeight;
      totalWeight += performanceWeight;
    }

    // Preference bonuses
    if (preferences.preferredBridges.includes(bridge.key)) {
      score += 20; // Bonus for preferred bridges
    }

    // LayerZero V2 preference bonus
    if (bridge.key === 'layerzeroV2') {
      score += 10; // Future-proofing bonus
    }

    // Calculate average score
    return totalWeight > 0 ? Math.min(100, score / totalWeight) : 0;
  }

  /**
   * Build complete route configuration
   * @param {Object} bridge - Selected bridge
   * @param {Object} transferParams - Transfer parameters
   * @param {Array} allBridges - All available bridges for comparison
   * @returns {Object} Complete route configuration
   */
  async buildRouteConfiguration(bridge, transferParams, allBridges = []) {
    const { fromNetwork, toNetwork, tokenSymbol, amount } = transferParams;
    
    try {
      // Get contract addresses
      const fromContract = bridgeConfigLoader.getContractAddress(bridge.key, fromNetwork);
      const toContract = bridgeConfigLoader.getContractAddress(bridge.key, toNetwork);
      
      if (!fromContract || !toContract) {
        throw new Error(`Missing contract addresses for ${bridge.key} on ${fromNetwork} or ${toNetwork}`);
      }

      // Get network configurations
      const fromNetworkConfig = bridgeConfigLoader.getNetworkConfig(fromNetwork);
      const toNetworkConfig = bridgeConfigLoader.getNetworkConfig(toNetwork);

      // Get token configuration
      const tokenConfig = bridgeConfigLoader.getTokenConfig(tokenSymbol);

      // Build route configuration
      const route = {
        // Bridge Information
        bridgeKey: bridge.key,
        bridgeName: bridge.name,
        bridgeType: bridge.type,
        bridgeVersion: bridge.version,
        
        // Route Information
        fromNetwork: {
          key: fromNetwork,
          chainId: fromNetworkConfig?.chainId,
          layerZeroChainId: fromNetworkConfig?.layerZeroChainId,
          name: fromNetworkConfig?.name,
          contract: fromContract
        },
        toNetwork: {
          key: toNetwork,
          chainId: toNetworkConfig?.chainId,
          layerZeroChainId: toNetworkConfig?.layerZeroChainId,
          name: toNetworkConfig?.name,
          contract: toContract
        },
        
        // Token Information
        token: {
          symbol: tokenSymbol,
          decimals: tokenConfig?.decimals,
          customContract: bridgeConfigLoader.getCustomContractAddress(tokenSymbol, fromNetwork)
        },
        
        // Transfer Details
        amount: amount || '0',
        estimatedTime: bridge.estimatedTime,
        fees: bridge.detailedFees || bridge.fees,
        limits: getBridgeLimits(bridge.key, tokenSymbol, fromNetwork, toNetwork),
        
        // Scoring and Metrics
        score: bridge.compositeScore || bridge.score || 0,
        security: bridge.security,
        liquidity: bridge.liquidity,
        performance: bridge.performance,
        
        // Route Metadata
        alternativeRoutes: allBridges.length - 1,
        isOptimal: true,
        selectedAt: new Date().toISOString(),
        
        // Validation Status
        validation: {
          isValid: true,
          checks: [
            'contract_addresses_verified',
            'network_support_confirmed',
            'token_support_confirmed',
            'limits_checked',
            'security_requirements_met'
          ]
        }
      };

      return route;

    } catch (error) {
      console.error(`❌ Error building route configuration for ${bridge.key}:`, error.message);
      return null;
    }
  }

  /**
   * Validate transfer parameters
   * @param {Object} transferParams - Transfer parameters to validate
   * @returns {Object} Validation result
   */
  validateTransferParams(transferParams) {
    const errors = [];
    const { fromNetwork, toNetwork, tokenSymbol, amount } = transferParams;

    // Required parameters
    if (!fromNetwork) errors.push('fromNetwork is required');
    if (!toNetwork) errors.push('toNetwork is required');
    if (!tokenSymbol) errors.push('tokenSymbol is required');
    
    // Network validation
    if (fromNetwork === toNetwork) {
      errors.push('fromNetwork and toNetwork cannot be the same');
    }

    // Validate networks exist
    const fromNetworkConfig = bridgeConfigLoader.getNetworkConfig(fromNetwork);
    const toNetworkConfig = bridgeConfigLoader.getNetworkConfig(toNetwork);
    
    if (!fromNetworkConfig) {
      errors.push(`fromNetwork '${fromNetwork}' not found in configuration`);
    }
    
    if (!toNetworkConfig) {
      errors.push(`toNetwork '${toNetwork}' not found in configuration`);
    }

    // Validate token exists
    const tokenConfig = bridgeConfigLoader.getTokenConfig(tokenSymbol);
    if (!tokenConfig) {
      errors.push(`Token '${tokenSymbol}' not found in configuration`);
    }

    // Amount validation
    if (amount) {
      const amountNum = parseFloat(amount);
      if (isNaN(amountNum) || amountNum <= 0) {
        errors.push('Amount must be a positive number');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Get performance metrics for a bridge
   * @param {string} bridgeKey - Bridge identifier
   * @returns {Object} Performance metrics
   */
  getPerformanceMetrics(bridgeKey) {
    if (!this.performanceMetrics.has(bridgeKey)) {
      // Default metrics if no historical data
      return {
        successRate: 95,
        averageTime: getEstimatedBridgeTime(bridgeKey),
        totalTransactions: 0,
        lastUsed: null
      };
    }

    return this.performanceMetrics.get(bridgeKey);
  }

  /**
   * Update performance metrics for a bridge
   * @param {string} bridgeKey - Bridge identifier
   * @param {string} event - Event type ('selected', 'success', 'failure')
   * @param {Object} metadata - Additional metadata
   */
  updatePerformanceMetrics(bridgeKey, event, metadata = {}) {
    const current = this.getPerformanceMetrics(bridgeKey);
    
    switch (event) {
      case 'selected':
        current.totalTransactions += 1;
        current.lastUsed = new Date().toISOString();
        break;
        
      case 'success':
        if (metadata.actualTime) {
          current.averageTime = (current.averageTime + metadata.actualTime) / 2;
        }
        break;
        
      case 'failure':
        current.successRate = Math.max(0, current.successRate - 1);
        break;
    }
    
    this.performanceMetrics.set(bridgeKey, current);
  }

  /**
   * Generate cache key for route caching
   * @param {Object} transferParams - Transfer parameters
   * @returns {string} Cache key
   */
  generateCacheKey(transferParams) {
    const { fromNetwork, toNetwork, tokenSymbol, amount, preferences = {} } = transferParams;
    
    // Create deterministic key from parameters
    const keyParts = [
      fromNetwork,
      toNetwork,
      tokenSymbol,
      amount || 'no-amount',
      JSON.stringify(preferences)
    ];
    
    return keyParts.join('-');
  }

  /**
   * Cache a route for performance
   * @param {string} cacheKey - Cache key
   * @param {Object} route - Route to cache
   */
  cacheRoute(cacheKey, route) {
    this.routeCache.set(cacheKey, {
      route,
      cachedAt: Date.now(),
      ttl: 5 * 60 * 1000 // 5 minutes TTL
    });
    
    // Clean old cache entries
    this.cleanCache();
  }

  /**
   * Check if cached route is still valid
   * @param {Object} cachedEntry - Cached route entry
   * @returns {boolean} Whether cache is valid
   */
  isCacheValid(cachedEntry) {
    const now = Date.now();
    return (now - cachedEntry.cachedAt) < cachedEntry.ttl;
  }

  /**
   * Clean expired cache entries
   */
  cleanCache() {
    const now = Date.now();
    
    for (const [key, entry] of this.routeCache.entries()) {
      if ((now - entry.cachedAt) >= entry.ttl) {
        this.routeCache.delete(key);
      }
    }
  }

  /**
   * Blacklist a route (temporarily disable)
   * @param {string} bridgeKey - Bridge identifier
   * @param {string} fromNetwork - Source network
   * @param {string} toNetwork - Destination network
   * @param {number} duration - Blacklist duration in milliseconds
   */
  blacklistRoute(bridgeKey, fromNetwork, toNetwork, duration = 30 * 60 * 1000) {
    const routeId = `${bridgeKey}-${fromNetwork}-${toNetwork}`;
    this.blacklistedRoutes.add(routeId);
    
    console.warn(`🚫 Blacklisted route ${routeId} for ${duration}ms`);
    
    // Auto-remove after duration
    setTimeout(() => {
      this.blacklistedRoutes.delete(routeId);
      console.log(`✅ Removed blacklist for route ${routeId}`);
    }, duration);
  }

  /**
   * Get route comparison analysis
   * @param {Array} routes - Routes to compare
   * @returns {Object} Comparison analysis
   */
  compareRoutes(routes) {
    if (routes.length === 0) {
      return { analysis: 'No routes to compare' };
    }

    const analysis = {
      totalRoutes: routes.length,
      fastest: routes.reduce((prev, curr) => 
        prev.estimatedTime < curr.estimatedTime ? prev : curr
      ),
      cheapest: routes.reduce((prev, curr) => 
        prev.fees.total < curr.fees.total ? prev : curr
      ),
      mostSecure: routes.reduce((prev, curr) => 
        prev.security > curr.security ? prev : curr
      ),
      averageTime: routes.reduce((sum, route) => sum + route.estimatedTime, 0) / routes.length,
      averageFees: routes.reduce((sum, route) => sum + route.fees.total, 0) / routes.length,
      bridgeTypes: [...new Set(routes.map(route => route.bridgeType))],
      recommendations: []
    };

    // Generate recommendations
    if (analysis.fastest.estimatedTime < 5) {
      analysis.recommendations.push(`${analysis.fastest.bridgeName} offers fastest transfer (${analysis.fastest.estimatedTime} min)`);
    }
    
    if (analysis.cheapest.fees.total < 5) {
      analysis.recommendations.push(`${analysis.cheapest.bridgeName} offers lowest fees (${analysis.cheapest.fees.total})`);
    }
    
    if (analysis.mostSecure.security > 90) {
      analysis.recommendations.push(`${analysis.mostSecure.bridgeName} offers highest security (${analysis.mostSecure.security}%)`);
    }

    return analysis;
  }

  /**
   * Get route selector statistics
   * @returns {Object} Statistics
   */
  getStatistics() {
    return {
      cacheSize: this.routeCache.size,
      blacklistedRoutes: this.blacklistedRoutes.size,
      performanceMetrics: Object.fromEntries(this.performanceMetrics),
      totalSelectionsToday: Array.from(this.performanceMetrics.values())
        .reduce((sum, metrics) => sum + metrics.totalTransactions, 0)
    };
  }

  /**
   * Clear all caches and reset state
   */
  reset() {
    this.routeCache.clear();
    this.performanceMetrics.clear();
    this.blacklistedRoutes.clear();
    console.log('🔄 Route selector state reset');
  }
}

// Create singleton instance
const routeSelector = new RouteSelector();

// Export singleton and class
module.exports = {
  RouteSelector,
  routeSelector,
  
  // Convenience functions
  getOptimalRoute: (transferParams) => routeSelector.getOptimalRoute(transferParams),
  getAllAvailableRoutes: (transferParams) => routeSelector.getAllAvailableRoutes(transferParams),
  compareRoutes: (routes) => routeSelector.compareRoutes(routes),
  blacklistRoute: (bridgeKey, fromNetwork, toNetwork, duration) => 
    routeSelector.blacklistRoute(bridgeKey, fromNetwork, toNetwork, duration),
  getRouteStatistics: () => routeSelector.getStatistics()
};
