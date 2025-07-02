/**
 * RouteCalculator - Optimal bridge route calculation and optimization
 * Location: src/bridges/routes/RouteCalculator.js
 * Focus: Pure route calculation and optimization logic
 */

// Import all protocol classes
import LayerZeroBridge from '../protocols/layerzero-bridge.js';
import WormholeBridge from '../protocols/wormhole-bridge.js';
import AxelarBridge from '../protocols/axelar-bridge.js';
import HyperlaneBridge from '../protocols/hyperlane-bridge.js';
import MultichainBridge from '../protocols/multichain-bridge.js';
import ChainlinkBridge from '../protocols/chainlink-bridge.js';
import HopBridge from '../protocols/hop-bridge.js';
import AcrossBridge from '../protocols/across-bridge.js';

import { BridgeError, ValidationError, UnsupportedProtocolError } from '../../errors/BridgeErrors.js';
import logger from '../../utils/logger.js';

export default class RouteCalculator {
  constructor(config = {}) {
    this.config = {
      // Default optimization weights
      defaultWeights: {
        speed: 0.40,    // 40% weight for speed
        cost: 0.35,     // 35% weight for cost
        reliability: 0.25  // 25% weight for reliability
      },
      
      // Maximum number of hops for multi-hop routes
      maxHops: config.maxHops || 2,
      
      // Route calculation timeouts
      calculationTimeout: config.calculationTimeout || 30000, // 30 seconds
      
      // Slippage considerations
      defaultSlippage: config.defaultSlippage || 0.005, // 0.5%
      maxSlippage: config.maxSlippage || 0.05, // 5%
      
      // Route filtering thresholds
      minConfidenceScore: config.minConfidenceScore || 0.6,
      maxCostMultiplier: config.maxCostMultiplier || 3.0, // Max 3x more expensive than cheapest
      
      // Protocol preferences
      protocolPreferences: config.protocolPreferences || {},
      
      // Chain connectivity overrides
      chainConnectivity: config.chainConnectivity || {},
      
      ...config
    };
    
    // Initialize protocol instances
    this.protocols = new Map([
      ['layerzero', LayerZeroBridge],
      ['wormhole', WormholeBridge],
      ['axelar', AxelarBridge],
      ['hyperlane', HyperlaneBridge],
      ['multichain', MultichainBridge],
      ['chainlink', ChainlinkBridge],
      ['hop', HopBridge],
      ['across', AcrossBridge]
    ]);
    
    // Protocol capabilities matrix
    this.protocolCapabilities = new Map();
    
    // Chain connectivity matrix
    this.chainConnectivity = new Map();
    
    // Token support matrix
    this.tokenSupport = new Map();
    
    // Protocol performance cache
    this.performanceCache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    
    // Route calculation cache
    this.routeCache = new Map();
    this.routeCacheTimeout = 2 * 60 * 1000; // 2 minutes
    
    // Initialize calculator
    this._initializeProtocolCapabilities();
    this._initializeChainConnectivity();
    this._initializeTokenSupport();
    
    logger.info('RouteCalculator initialized', {
      supportedProtocols: Array.from(this.protocols.keys()),
      maxHops: this.config.maxHops,
      defaultWeights: this.config.defaultWeights
    });
  }

  /**
   * Calculate optimal route based on criteria
   */
  calculateOptimalRoute(fromChain, toChain, token, amount, criteria = {}) {
    try {
      this._validateRouteParams(fromChain, toChain, token, amount);
      
      const cacheKey = `${fromChain}-${toChain}-${token}-${amount}-${JSON.stringify(criteria)}`;
      const cached = this._getCachedRoute(cacheKey);
      if (cached) {
        logger.debug('Returning cached optimal route', { fromChain, toChain, token });
        return cached;
      }
      
      logger.info('Calculating optimal route', {
        fromChain,
        toChain,
        token,
        amount: amount.toString(),
        criteria
      });
      
      // Get all possible routes
      const allRoutes = this.getAllPossibleRoutes(fromChain, toChain, token);
      
      if (allRoutes.length === 0) {
        throw new BridgeError('No routes available for the specified parameters', 'NO_ROUTES_FOUND', {
          fromChain,
          toChain,
          token
        });
      }
      
      // Filter routes by amount limits and token support
      const validRoutes = this._filterRoutesByAmount(allRoutes, amount);
      
      if (validRoutes.length === 0) {
        throw new BridgeError('No routes support the specified amount', 'AMOUNT_NOT_SUPPORTED', {
          fromChain,
          toChain,
          token,
          amount: amount.toString()
        });
      }
      
      // Score and rank routes
      const scoredRoutes = this._scoreRoutes(validRoutes, criteria);
      
      // Get the optimal route (highest score)
      const optimalRoute = scoredRoutes[0];
      
      // Cache the result
      this._cacheRoute(cacheKey, optimalRoute);
      
      logger.info('Optimal route calculated', {
        protocol: optimalRoute.protocol,
        path: optimalRoute.path,
        score: optimalRoute.score,
        hops: optimalRoute.hops
      });
      
      return optimalRoute;
      
    } catch (error) {
      logger.error('Failed to calculate optimal route:', error);
      throw new BridgeError('Route calculation failed', 'ROUTE_CALCULATION_FAILED', {
        fromChain,
        toChain,
        token,
        error: error.message
      });
    }
  }

  /**
   * Get all possible routes between chains for a token
   */
  getAllPossibleRoutes(fromChain, toChain, token) {
    try {
      this._validateChains(fromChain, toChain);
      
      const routes = [];
      
      // Get direct routes
      const directRoutes = this.getDirectRoutes(fromChain, toChain);
      routes.push(...directRoutes);
      
      // Get multi-hop routes if direct routes are limited
      if (directRoutes.length < 2) {
        const multiHopRoutes = this.getMultiHopRoutes(fromChain, toChain);
        routes.push(...multiHopRoutes);
      }
      
      // Filter by token support
      const tokenSupportedRoutes = routes.filter(route => 
        this._routeSupportsToken(route, token)
      );
      
      logger.debug(`Found ${tokenSupportedRoutes.length} possible routes`, {
        fromChain,
        toChain,
        token,
        directRoutes: directRoutes.length,
        totalRoutes: routes.length
      });
      
      return tokenSupportedRoutes;
      
    } catch (error) {
      logger.error('Failed to get all possible routes:', error);
      throw new BridgeError('Failed to enumerate routes', 'ROUTE_ENUMERATION_FAILED', {
        fromChain,
        toChain,
        token,
        error: error.message
      });
    }
  }

  /**
   * Estimate costs for multiple routes
   */
  async estimateRouteCosts(routes) {
    try {
      logger.debug(`Estimating costs for ${routes.length} routes`);
      
      const estimatedRoutes = await Promise.allSettled(
        routes.map(route => this._estimateRouteCost(route))
      );
      
      const validRoutes = [];
      
      for (let i = 0; i < estimatedRoutes.length; i++) {
        const result = estimatedRoutes[i];
        
        if (result.status === 'fulfilled') {
          validRoutes.push(result.value);
        } else {
          logger.warn(`Failed to estimate cost for route ${routes[i].protocol}:`, result.reason);
          // Include route with estimated costs if individual estimation fails
          validRoutes.push({
            ...routes[i],
            estimatedFee: '0',
            estimatedTime: 600000, // 10 minutes fallback
            confidence: 0.3,
            gasEstimate: '300000'
          });
        }
      }
      
      logger.debug(`Successfully estimated costs for ${validRoutes.length} routes`);
      return validRoutes;
      
    } catch (error) {
      logger.error('Failed to estimate route costs:', error);
      throw new BridgeError('Route cost estimation failed', 'COST_ESTIMATION_FAILED', {
        routeCount: routes.length,
        error: error.message
      });
    }
  }

  /**
   * Find fastest route
   */
  findFastestRoute(fromChain, toChain, token) {
    try {
      logger.debug('Finding fastest route', { fromChain, toChain, token });
      
      const routes = this.getAllPossibleRoutes(fromChain, toChain, token);
      
      if (routes.length === 0) {
        throw new BridgeError('No routes available', 'NO_ROUTES_FOUND');
      }
      
      // Score routes with 100% weight on speed
      const speedCriteria = { speed: 1.0, cost: 0.0, reliability: 0.0 };
      const scoredRoutes = this._scoreRoutes(routes, speedCriteria);
      
      const fastestRoute = scoredRoutes[0];
      
      logger.info('Fastest route found', {
        protocol: fastestRoute.protocol,
        estimatedTime: fastestRoute.estimatedTime,
        path: fastestRoute.path
      });
      
      return fastestRoute;
      
    } catch (error) {
      logger.error('Failed to find fastest route:', error);
      throw new BridgeError('Fastest route calculation failed', 'FASTEST_ROUTE_FAILED', {
        fromChain,
        toChain,
        token,
        error: error.message
      });
    }
  }

  /**
   * Find cheapest route
   */
  findCheapestRoute(fromChain, toChain, token) {
    try {
      logger.debug('Finding cheapest route', { fromChain, toChain, token });
      
      const routes = this.getAllPossibleRoutes(fromChain, toChain, token);
      
      if (routes.length === 0) {
        throw new BridgeError('No routes available', 'NO_ROUTES_FOUND');
      }
      
      // Score routes with 100% weight on cost
      const costCriteria = { speed: 0.0, cost: 1.0, reliability: 0.0 };
      const scoredRoutes = this._scoreRoutes(routes, costCriteria);
      
      const cheapestRoute = scoredRoutes[0];
      
      logger.info('Cheapest route found', {
        protocol: cheapestRoute.protocol,
        estimatedFee: cheapestRoute.estimatedFee,
        path: cheapestRoute.path
      });
      
      return cheapestRoute;
      
    } catch (error) {
      logger.error('Failed to find cheapest route:', error);
      throw new BridgeError('Cheapest route calculation failed', 'CHEAPEST_ROUTE_FAILED', {
        fromChain,
        toChain,
        token,
        error: error.message
      });
    }
  }

  /**
   * Get direct routes (single hop)
   */
  getDirectRoutes(fromChain, toChain) {
    const directRoutes = [];
    
    for (const [protocolName, ProtocolClass] of this.protocols) {
      try {
        const capabilities = this.protocolCapabilities.get(protocolName);
        
        if (capabilities && 
            capabilities.supportedChains.includes(fromChain) &&
            capabilities.supportedChains.includes(toChain)) {
          
          const route = {
            protocol: protocolName,
            path: [fromChain, toChain],
            hops: 1,
            estimatedFee: '0',
            estimatedTime: capabilities.averageTime || 300000, // 5 minutes default
            confidence: this._getProtocolConfidence(protocolName),
            gasEstimate: '300000',
            protocolType: capabilities.type || 'bridge',
            securityModel: capabilities.trustModel || 'unknown',
            intermediateTokens: []
          };
          
          directRoutes.push(route);
        }
      } catch (error) {
        logger.warn(`Error evaluating direct route for protocol ${protocolName}:`, error);
      }
    }
    
    logger.debug(`Found ${directRoutes.length} direct routes`, {
      fromChain,
      toChain,
      protocols: directRoutes.map(r => r.protocol)
    });
    
    return directRoutes;
  }

  /**
   * Get multi-hop routes
   */
  getMultiHopRoutes(fromChain, toChain, maxHops = null) {
    const maxAllowedHops = maxHops || this.config.maxHops;
    const multiHopRoutes = [];
    
    // For now, implement 2-hop routes through common intermediary chains
    const commonIntermediaries = ['ethereum', 'polygon', 'bsc'];
    
    for (const intermediary of commonIntermediaries) {
      if (intermediary === fromChain || intermediary === toChain) {
        continue;
      }
      
      try {
        // Get routes from source to intermediary
        const firstHopRoutes = this.getDirectRoutes(fromChain, intermediary);
        
        // Get routes from intermediary to target
        const secondHopRoutes = this.getDirectRoutes(intermediary, toChain);
        
        // Combine routes
        for (const firstHop of firstHopRoutes) {
          for (const secondHop of secondHopRoutes) {
            // Skip if same protocol (to avoid complications)
            if (firstHop.protocol === secondHop.protocol) {
              continue;
            }
            
            const multiHopRoute = {
              protocol: `${firstHop.protocol}+${secondHop.protocol}`,
              path: [fromChain, intermediary, toChain],
              hops: 2,
              estimatedFee: '0', // Will be calculated later
              estimatedTime: firstHop.estimatedTime + secondHop.estimatedTime + 300000, // Add 5 min buffer
              confidence: Math.min(firstHop.confidence, secondHop.confidence) * 0.8, // Reduce confidence for multi-hop
              gasEstimate: (parseInt(firstHop.gasEstimate) + parseInt(secondHop.gasEstimate)).toString(),
              protocolType: 'multi-hop',
              securityModel: 'hybrid',
              intermediateTokens: [this._getCommonToken(intermediary)],
              firstHop,
              secondHop
            };
            
            multiHopRoutes.push(multiHopRoute);
          }
        }
      } catch (error) {
        logger.warn(`Error calculating multi-hop route through ${intermediary}:`, error);
      }
    }
    
    logger.debug(`Found ${multiHopRoutes.length} multi-hop routes`, {
      fromChain,
      toChain,
      maxHops: maxAllowedHops
    });
    
    return multiHopRoutes;
  }

  // ===== PRIVATE METHODS =====

  /**
   * Initialize protocol capabilities
   */
  _initializeProtocolCapabilities() {
    const protocolConfigs = {
      layerzero: {
        supportedChains: ['ethereum', 'polygon', 'bsc', 'avalanche', 'arbitrum', 'optimism'],
        type: 'messaging',
        trustModel: 'hybrid',
        averageTime: 300000, // 5 minutes
        maxTime: 1800000, // 30 minutes
        features: ['omnichain_tokens', 'generic_messaging'],
        feeStructure: 'dynamic'
      },
      wormhole: {
        supportedChains: ['ethereum', 'polygon', 'bsc', 'avalanche', 'arbitrum', 'optimism', 'solana'],
        type: 'messaging',
        trustModel: 'validator_set',
        averageTime: 900000, // 15 minutes
        maxTime: 3600000, // 60 minutes
        features: ['token_bridge', 'nft_bridge', 'generic_messaging'],
        feeStructure: 'fixed'
      },
      axelar: {
        supportedChains: ['ethereum', 'polygon', 'avalanche', 'bsc'],
        type: 'network',
        trustModel: 'proof_of_stake',
        averageTime: 600000, // 10 minutes
        maxTime: 1800000, // 30 minutes
        features: ['general_message_passing', 'token_transfers'],
        feeStructure: 'dynamic'
      },
      hyperlane: {
        supportedChains: ['ethereum', 'polygon', 'avalanche', 'bsc', 'arbitrum', 'optimism'],
        type: 'infrastructure',
        trustModel: 'modular',
        averageTime: 300000, // 5 minutes
        maxTime: 900000, // 15 minutes
        features: ['permissionless_deployment', 'modular_security'],
        feeStructure: 'dynamic'
      },
      multichain: {
        supportedChains: ['ethereum', 'bsc', 'polygon', 'avalanche', 'arbitrum', 'optimism'],
        type: 'bridge',
        trustModel: 'mpc',
        averageTime: 1200000, // 20 minutes
        maxTime: 3600000, // 60 minutes
        features: ['cross_chain_swaps', 'liquidity_pools'],
        feeStructure: 'percentage'
      },
      chainlink: {
        supportedChains: ['ethereum', 'polygon', 'avalanche', 'bsc', 'arbitrum', 'optimism'],
        type: 'messaging',
        trustModel: 'oracle_network',
        averageTime: 600000, // 10 minutes
        maxTime: 1800000, // 30 minutes
        features: ['arbitrary_messaging', 'token_transfers'],
        feeStructure: 'dynamic'
      },
      hop: {
        supportedChains: ['ethereum', 'polygon', 'arbitrum', 'optimism'],
        type: 'bridge',
        trustModel: 'optimistic',
        averageTime: 300000, // 5 minutes
        maxTime: 900000, // 15 minutes
        features: ['fast_withdrawals', 'amm_based'],
        feeStructure: 'dynamic'
      },
      across: {
        supportedChains: ['ethereum', 'polygon', 'arbitrum', 'optimism'],
        type: 'bridge',
        trustModel: 'optimistic',
        averageTime: 180000, // 3 minutes
        maxTime: 600000, // 10 minutes
        features: ['intent_based_bridging', 'fast_bridging'],
        feeStructure: 'dynamic'
      }
    };
    
    for (const [protocol, config] of Object.entries(protocolConfigs)) {
      this.protocolCapabilities.set(protocol, config);
    }
    
    logger.debug('Protocol capabilities initialized', {
      protocolCount: this.protocolCapabilities.size
    });
  }

  /**
   * Initialize chain connectivity matrix
   */
  _initializeChainConnectivity() {
    const chains = ['ethereum', 'polygon', 'bsc', 'avalanche', 'arbitrum', 'optimism'];
    
    for (const sourceChain of chains) {
      if (!this.chainConnectivity.has(sourceChain)) {
        this.chainConnectivity.set(sourceChain, new Set());
      }
      
      for (const targetChain of chains) {
        if (sourceChain !== targetChain) {
          this.chainConnectivity.get(sourceChain).add(targetChain);
        }
      }
    }
    
    logger.debug('Chain connectivity matrix initialized', {
      chainCount: chains.length,
      totalConnections: chains.length * (chains.length - 1)
    });
  }

  /**
   * Initialize token support matrix
   */
  _initializeTokenSupport() {
    const commonTokens = {
      'USDC': ['ethereum', 'polygon', 'bsc', 'avalanche', 'arbitrum', 'optimism'],
      'USDT': ['ethereum', 'polygon', 'bsc', 'avalanche', 'arbitrum', 'optimism'],
      'WETH': ['ethereum', 'polygon', 'bsc', 'avalanche', 'arbitrum', 'optimism'],
      'ETH': ['ethereum', 'polygon', 'arbitrum', 'optimism'],
      'BNB': ['ethereum', 'polygon', 'bsc', 'avalanche', 'arbitrum', 'optimism'],
      'MATIC': ['ethereum', 'polygon', 'bsc', 'avalanche', 'arbitrum', 'optimism'],
      'AVAX': ['ethereum', 'polygon', 'bsc', 'avalanche', 'arbitrum', 'optimism']
    };
    
    for (const [token, supportedChains] of Object.entries(commonTokens)) {
      this.tokenSupport.set(token, new Set(supportedChains));
    }
    
    logger.debug('Token support matrix initialized', {
      tokenCount: this.tokenSupport.size
    });
  }

  /**
   * Validate route parameters
   */
  _validateRouteParams(fromChain, toChain, token, amount) {
    if (!fromChain || !toChain || !token || !amount) {
      throw new ValidationError('Missing required parameters: fromChain, toChain, token, amount');
    }
    
    if (fromChain === toChain) {
      throw new ValidationError('Source and target chains cannot be the same');
    }
    
    if (!this.chainConnectivity.has(fromChain)) {
      throw new ValidationError(`Unsupported source chain: ${fromChain}`);
    }
    
    if (!this.chainConnectivity.has(toChain)) {
      throw new ValidationError(`Unsupported target chain: ${toChain}`);
    }
    
    try {
      BigInt(amount.toString());
    } catch (error) {
      throw new ValidationError('Invalid amount format');
    }
  }

  /**
   * Validate chains
   */
  _validateChains(fromChain, toChain) {
    if (!fromChain || !toChain) {
      throw new ValidationError('Source and target chains are required');
    }
    
    if (fromChain === toChain) {
      throw new ValidationError('Source and target chains cannot be the same');
    }
  }

  /**
   * Check if route supports token
   */
  _routeSupportsToken(route, token) {
    const tokenSymbol = this._getTokenSymbol(token);
    const supportedChains = this.tokenSupport.get(tokenSymbol);
    
    if (!supportedChains) {
      // If token not in common list, assume it's supported (custom token)
      return true;
    }
    
    // Check if all chains in the route path support the token
    return route.path.every(chain => supportedChains.has(chain));
  }

  /**
   * Get token symbol from address or symbol
   */
  _getTokenSymbol(token) {
    // If it's already a symbol (common tokens)
    if (this.tokenSupport.has(token)) {
      return token;
    }
    
    // Try to map address to symbol (simplified)
    const addressToSymbol = {
      '0xA0b86a33E6441986c0eD0C5e4c1fE15C6E4E8F1d': 'USDC',
      '0xdAC17F958D2ee523a2206206994597C13D831ec7': 'USDT',
      '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2': 'WETH'
    };
    
    return addressToSymbol[token] || 'UNKNOWN';
  }

  /**
   * Get common token for intermediary chain
   */
  _getCommonToken(chain) {
    const commonTokens = {
      ethereum: 'USDC',
      polygon: 'USDC',
      bsc: 'USDT',
      avalanche: 'USDC',
      arbitrum: 'USDC',
      optimism: 'USDC'
    };
    
    return commonTokens[chain] || 'USDC';
  }

  /**
   * Filter routes by amount limits
   */
  _filterRoutesByAmount(routes, amount) {
    return routes.filter(route => {
      try {
        const capabilities = this.protocolCapabilities.get(route.protocol.split('+')[0]);
        if (!capabilities) return true;
        
        const amountBigInt = BigInt(amount.toString());
        
        // Check minimum amount (simplified)
        const minAmount = BigInt('1000000000000000'); // 0.001 ETH
        if (amountBigInt < minAmount) {
          return false;
        }
        
        // Check maximum amount (if specified)
        // Most protocols don't have hard maximums, so we'll allow most amounts
        
        return true;
      } catch (error) {
        logger.warn(`Error filtering route by amount: ${route.protocol}`, error);
        return true; // Include route if validation fails
      }
    });
  }

  /**
   * Score routes based on criteria
   */
  _scoreRoutes(routes, criteria = {}) {
    const weights = {
      ...this.config.defaultWeights,
      ...criteria
    };
    
    // Get baseline metrics for normalization
    const fees = routes.map(r => parseFloat(r.estimatedFee || '0')).filter(f => f > 0);
    const times = routes.map(r => r.estimatedTime || 300000);
    const confidences = routes.map(r => r.confidence || 0.5);
    
    const minFee = fees.length > 0 ? Math.min(...fees) : 1;
    const maxFee = fees.length > 0 ? Math.max(...fees) : 1;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    const avgConfidence = confidences.reduce((sum, c) => sum + c, 0) / confidences.length;
    
    const scoredRoutes = routes.map(route => {
      const fee = parseFloat(route.estimatedFee || '0');
      const time = route.estimatedTime || 300000;
      const confidence = route.confidence || 0.5;
      
      // Normalize scores (0-1 scale, higher is better)
      let costScore = 1;
      if (maxFee > minFee && fee > 0) {
        costScore = 1 - ((fee - minFee) / (maxFee - minFee));
      }
      
      let speedScore = 1;
      if (maxTime > minTime) {
        speedScore = 1 - ((time - minTime) / (maxTime - minTime));
      }
      
      const reliabilityScore = confidence;
      
      // Apply protocol-specific bonuses/penalties
      const protocolBonus = this._getProtocolBonus(route.protocol);
      
      // Apply hop penalty for multi-hop routes
      const hopPenalty = route.hops > 1 ? 0.1 * (route.hops - 1) : 0;
      
      // Calculate weighted score
      const rawScore = (
        weights.cost * costScore +
        weights.speed * speedScore +
        weights.reliability * reliabilityScore
      ) + protocolBonus - hopPenalty;
      
      const finalScore = Math.max(0, Math.min(1, rawScore));
      
      return {
        ...route,
        score: finalScore,
        scoreBreakdown: {
          costScore: Math.round(costScore * 100) / 100,
          speedScore: Math.round(speedScore * 100) / 100,
          reliabilityScore: Math.round(reliabilityScore * 100) / 100,
          protocolBonus,
          hopPenalty,
          finalScore: Math.round(finalScore * 100) / 100
        }
      };
    });
    
    // Sort by score (highest first)
    scoredRoutes.sort((a, b) => b.score - a.score);
    
    logger.debug('Routes scored and ranked', {
      routeCount: scoredRoutes.length,
      topScore: scoredRoutes[0]?.score,
      weights
    });
    
    return scoredRoutes;
  }

  /**
   * Get protocol confidence score
   */
  _getProtocolConfidence(protocol) {
    const confidenceScores = {
      layerzero: 0.9,
      wormhole: 0.85,
      axelar: 0.8,
      chainlink: 0.95,
      hyperlane: 0.8,
      hop: 0.8,
      across: 0.75,
      multichain: 0.7
    };
    
    return confidenceScores[protocol] || 0.6;
  }

  /**
   * Get protocol bonus/penalty
   */
  _getProtocolBonus(protocol) {
    const protocolBonuses = {
      layerzero: 0.05,   // Bonus for omnichain capability
      chainlink: 0.08,   // Bonus for oracle security
      axelar: 0.03,      // Bonus for PoS security
      wormhole: 0.02,    // Slight bonus for maturity
      hyperlane: 0.01,   // Slight bonus for modularity
      hop: 0.0,          // Neutral
      across: -0.02,     // Slight penalty for complexity
      multichain: -0.05  // Penalty for MPC risks
    };
    
    // Handle multi-hop protocols
    if (protocol.includes('+')) {
      return -0.1; // Penalty for multi-hop complexity
    }
    
    return protocolBonuses[protocol] || 0;
  }

  /**
   * Estimate cost for individual route
   */
  async _estimateRouteCost(route) {
    try {
      // For direct routes
      if (route.hops === 1) {
        const protocolName = route.protocol;
        const capabilities = this.protocolCapabilities.get(protocolName);
        
        // Estimate fees based on protocol type
        let estimatedFee = '0';
        
        switch (capabilities.feeStructure) {
          case 'fixed':
            estimatedFee = '5000000000000000'; // 0.005 ETH
            break;
          case 'dynamic':
            estimatedFee = '3000000000000000'; // 0.003 ETH
            break;
          case 'percentage':
            estimatedFee = '2000000000000000'; // 0.002 ETH base
            break;
          default:
            estimatedFee = '4000000000000000'; // 0.004 ETH default
        }
        
        return {
          ...route,
          estimatedFee,
          estimatedTime: capabilities.averageTime,
          confidence: this._getProtocolConfidence(protocolName),
          gasEstimate: this._estimateGasForProtocol(protocolName)
        };
      }
      
      // For multi-hop routes
      if (route.hops === 2 && route.firstHop && route.secondHop) {
        const firstCost = await this._estimateRouteCost(route.firstHop);
        const secondCost = await this._estimateRouteCost(route.secondHop);
        
        const totalFee = (BigInt(firstCost.estimatedFee) + BigInt(secondCost.estimatedFee)).toString();
        const totalTime = firstCost.estimatedTime + secondCost.estimatedTime + 300000; // 5 min buffer
        const totalGas = (parseInt(firstCost.gasEstimate) + parseInt(secondCost.gasEstimate)).toString();
        
        return {
          ...route,
          estimatedFee: totalFee,
          estimatedTime: totalTime,
          confidence: Math.min(firstCost.confidence, secondCost.confidence) * 0.8,
          gasEstimate: totalGas
        };
      }
      
      // Fallback for unknown route types
      return {
        ...route,
        estimatedFee: '10000000000000000', // 0.01 ETH fallback
        estimatedTime: 600000, // 10 minutes
        confidence: 0.5,
        gasEstimate: '500000'
      };
      
    } catch (error) {
      logger.warn(`Failed to estimate cost for route ${route.protocol}:`, error);
      
      // Return route with fallback estimates
      return {
        ...route,
        estimatedFee: '10000000000000000',
        estimatedTime: 600000,
        confidence: 0.3,
        gasEstimate: '500000'
      };
    }
  }

  /**
   * Estimate gas for protocol
   */
  _estimateGasForProtocol(protocol) {
    const gasEstimates = {
      layerzero: '500000',
      wormhole: '400000',
      axelar: '600000',
      hyperlane: '350000',
      multichain: '300000',
      chainlink: '500000',
      hop: '400000',
      across: '300000'
    };
    
    return gasEstimates[protocol] || '400000';
  }

  /**
   * Cache route result
   */
  _cacheRoute(key, route) {
    this.routeCache.set(key, {
      route,
      timestamp: Date.now()
    });
    
    // Cleanup old cache entries
    if (this.routeCache.size > 1000) {
      const oldEntries = [];
      const cutoff = Date.now() - this.routeCacheTimeout;
      
      for (const [cacheKey, cached] of this.routeCache) {
        if (cached.timestamp < cutoff) {
          oldEntries.push(cacheKey);
        }
      }
      
      oldEntries.forEach(key => this.routeCache.delete(key));
    }
  }

  /**
   * Get cached route
   */
  _getCachedRoute(key) {
    const cached = this.routeCache.get(key);
    
    if (cached && (Date.now() - cached.timestamp) < this.routeCacheTimeout) {
      return cached.route;
    }
    
    if (cached) {
      this.routeCache.delete(key);
    }
    
    return null;
  }

  /**
   * Get route comparison analysis
   */
  getRouteComparison(fromChain, toChain, token, amount) {
    try {
      const allRoutes = this.getAllPossibleRoutes(fromChain, toChain, token);
      
      if (allRoutes.length === 0) {
        return {
          fromChain,
          toChain,
          token,
          amount: amount.toString(),
          analysis: 'No routes available',
          routes: []
        };
      }
      
      // Get different optimization results
      const optimalRoute = this.calculateOptimalRoute(fromChain, toChain, token, amount);
      const fastestRoute = this.findFastestRoute(fromChain, toChain, token);
      const cheapestRoute = this.findCheapestRoute(fromChain, toChain, token);
      
      // Analyze route diversity
      const protocolsUsed = new Set(allRoutes.map(r => r.protocol));
      const directRoutes = allRoutes.filter(r => r.hops === 1);
      const multiHopRoutes = allRoutes.filter(r => r.hops > 1);
      
      return {
        fromChain,
        toChain,
        token,
        amount: amount.toString(),
        summary: {
          totalRoutes: allRoutes.length,
          directRoutes: directRoutes.length,
          multiHopRoutes: multiHopRoutes.length,
          protocolsAvailable: protocolsUsed.size,
          protocols: Array.from(protocolsUsed)
        },
        recommendations: {
          optimal: {
            ...optimalRoute,
            reason: 'Best balance of speed, cost, and reliability'
          },
          fastest: {
            ...fastestRoute,
            reason: 'Shortest estimated completion time'
          },
          cheapest: {
            ...cheapestRoute,
            reason: 'Lowest estimated fees'
          }
        },
        allRoutes: allRoutes.map(route => ({
          ...route,
          estimatedFeeEth: this._weiToEth(route.estimatedFee || '0'),
          estimatedTimeMinutes: Math.round((route.estimatedTime || 0) / 60000)
        }))
      };
      
    } catch (error) {
      logger.error('Failed to generate route comparison:', error);
      throw new BridgeError('Route comparison failed', 'ROUTE_COMPARISON_FAILED', {
        fromChain,
        toChain,
        token,
        error: error.message
      });
    }
  }

  /**
   * Get route analytics
   */
  getRouteAnalytics(timeframe = '24h') {
    const analytics = {
      timeframe,
      generatedAt: Date.now(),
      cacheStats: {
        totalCachedRoutes: this.routeCache.size,
        cacheHitRate: this._calculateCacheHitRate(),
        avgCacheAge: this._calculateAvgCacheAge()
      },
      protocolStats: this._getProtocolUsageStats(),
      chainPairStats: this._getChainPairStats(),
      performance: {
        avgCalculationTime: this._getAvgCalculationTime(),
        routesPerSecond: this._getRoutesPerSecond()
      }
    };
    
    return analytics;
  }

  /**
   * Calculate cache hit rate
   */
  _calculateCacheHitRate() {
    // This would be tracked in a real implementation
    return 0.75; // 75% cache hit rate example
  }

  /**
   * Calculate average cache age
   */
  _calculateAvgCacheAge() {
    if (this.routeCache.size === 0) return 0;
    
    const now = Date.now();
    const totalAge = Array.from(this.routeCache.values())
      .reduce((sum, cached) => sum + (now - cached.timestamp), 0);
    
    return Math.round(totalAge / this.routeCache.size);
  }

  /**
   * Get protocol usage statistics
   */
  _getProtocolUsageStats() {
    const stats = {};
    
    for (const protocol of this.protocols.keys()) {
      stats[protocol] = {
        available: true,
        confidence: this._getProtocolConfidence(protocol),
        avgTime: this.protocolCapabilities.get(protocol)?.averageTime || 300000,
        supportedChains: this.protocolCapabilities.get(protocol)?.supportedChains?.length || 0
      };
    }
    
    return stats;
  }

  /**
   * Get chain pair statistics
   */
  _getChainPairStats() {
    const stats = {};
    
    for (const [sourceChain, targetChains] of this.chainConnectivity) {
      stats[sourceChain] = {
        possibleTargets: targetChains.size,
        targets: Array.from(targetChains)
      };
    }
    
    return stats;
  }

  /**
   * Get average calculation time
   */
  _getAvgCalculationTime() {
    // This would be tracked in a real implementation
    return 150; // 150ms average
  }

  /**
   * Get routes per second throughput
   */
  _getRoutesPerSecond() {
    // This would be tracked in a real implementation
    return 25; // 25 routes per second
  }

  /**
   * Convert wei to ETH
   */
  _weiToEth(weiAmount) {
    try {
      const wei = BigInt(weiAmount);
      const eth = Number(wei) / Math.pow(10, 18);
      return eth.toFixed(6);
    } catch (error) {
      return '0.000000';
    }
  }

  /**
   * Validate route configuration
   */
  validateConfiguration() {
    const issues = [];
    
    // Check protocol availability
    for (const [protocolName, ProtocolClass] of this.protocols) {
      try {
        const capabilities = this.protocolCapabilities.get(protocolName);
        if (!capabilities) {
          issues.push(`Protocol ${protocolName} missing capabilities configuration`);
        }
      } catch (error) {
        issues.push(`Protocol ${protocolName} class validation failed: ${error.message}`);
      }
    }
    
    // Check chain connectivity
    const connectedChains = Array.from(this.chainConnectivity.keys());
    if (connectedChains.length < 2) {
      issues.push('Insufficient chain connectivity (minimum 2 chains required)');
    }
    
    // Check token support
    if (this.tokenSupport.size === 0) {
      issues.push('No token support configured');
    }
    
    const validation = {
      valid: issues.length === 0,
      issues,
      summary: {
        protocolCount: this.protocols.size,
        chainCount: connectedChains.length,
        tokenCount: this.tokenSupport.size,
        possibleRoutes: this._calculateTotalPossibleRoutes()
      }
    };
    
    logger.info('Route calculator configuration validated', validation);
    return validation;
  }

  /**
   * Calculate total possible routes
   */
  _calculateTotalPossibleRoutes() {
    const chains = Array.from(this.chainConnectivity.keys());
    const chainPairs = chains.length * (chains.length - 1);
    const avgProtocolsPerPair = 3; // Rough estimate
    
    return chainPairs * avgProtocolsPerPair;
  }

  /**
   * Update protocol preferences
   */
  updateProtocolPreferences(preferences) {
    this.config.protocolPreferences = {
      ...this.config.protocolPreferences,
      ...preferences
    };
    
    // Clear cache to force recalculation with new preferences
    this.routeCache.clear();
    
    logger.info('Protocol preferences updated', { preferences });
  }

  /**
   * Get supported chains for protocol
   */
  getSupportedChains(protocol) {
    const capabilities = this.protocolCapabilities.get(protocol);
    return capabilities ? capabilities.supportedChains : [];
  }

  /**
   * Get supported protocols for chain pair
   */
  getSupportedProtocols(fromChain, toChain) {
    const supportedProtocols = [];
    
    for (const [protocolName, capabilities] of this.protocolCapabilities) {
      if (capabilities.supportedChains.includes(fromChain) && 
          capabilities.supportedChains.includes(toChain)) {
        supportedProtocols.push(protocolName);
      }
    }
    
    return supportedProtocols;
  }

  /**
   * Check if direct route exists
   */
  hasDirectRoute(fromChain, toChain) {
    return this.getSupportedProtocols(fromChain, toChain).length > 0;
  }

  /**
   * Get route health status
   */
  getHealthStatus() {
    const totalProtocols = this.protocols.size;
    const healthyProtocols = Array.from(this.protocols.keys())
      .filter(protocol => this._getProtocolConfidence(protocol) > 0.7).length;
    
    const totalChains = this.chainConnectivity.size;
    const totalConnections = Array.from(this.chainConnectivity.values())
      .reduce((sum, targets) => sum + targets.size, 0);
    
    return {
      status: healthyProtocols > totalProtocols / 2 ? 'healthy' : 'degraded',
      protocols: {
        total: totalProtocols,
        healthy: healthyProtocols,
        healthPercentage: Math.round((healthyProtocols / totalProtocols) * 100)
      },
      connectivity: {
        chains: totalChains,
        connections: totalConnections,
        avgConnectionsPerChain: Math.round(totalConnections / totalChains)
      },
      cache: {
        size: this.routeCache.size,
        hitRate: this._calculateCacheHitRate(),
        avgAge: this._calculateAvgCacheAge()
      },
      timestamp: Date.now()
    };
  }

  /**
   * Clear all caches
   */
  clearCache() {
    this.routeCache.clear();
    this.performanceCache.clear();
    
    logger.info('Route calculator caches cleared');
  }

  /**
   * Get configuration summary
   */
  getConfigSummary() {
    return {
      maxHops: this.config.maxHops,
      defaultWeights: this.config.defaultWeights,
      calculationTimeout: this.config.calculationTimeout,
      cacheTimeout: this.routeCacheTimeout,
      protocolCount: this.protocols.size,
      chainCount: this.chainConnectivity.size,
      tokenCount: this.tokenSupport.size,
      protocolPreferences: this.config.protocolPreferences
    };
  }
}
