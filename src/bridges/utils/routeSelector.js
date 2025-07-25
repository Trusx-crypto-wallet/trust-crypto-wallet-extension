/**
 * Route Selection Engine
 * Selects optimal bridge routes based on cost, speed, security, and availability.
 * Integrates with contract verification and audit validation.
 * Production-ready with TypeScript interfaces, concurrency limits, and metrics.
 */

const configLoader = require('./configLoader');
const { BridgeErrors } = require('../../errors/BridgeErrors');
const { logger } = require('../../utils/logger');
const { metrics } = require('../../utils/metrics');
const pLimit = require('p-limit');
const { ABIStructureValidator } = require('./contractVerification/ABIStructureValidator');
const { BytecodeValidator } = require('./contractVerification/BytecodeValidator');
const { OnChainVerifier } = require('./contractVerification/OnChainVerifier');
const { AuditStatusChecker } = require('./contractVerification/AuditStatusChecker');
const { BigNumber } = require('ethers');

/**
 * @typedef {Object} RouteParams
 * @property {string} fromNetwork - Source network
 * @property {string} toNetwork - Destination network
 * @property {string} tokenSymbol - Token to transfer
 * @property {string|number|BigNumber} amount - Transfer amount
 * @property {string} speed - Transfer speed preference (fast|standard|economy)
 */

/**
 * @typedef {Object} ValidationResult
 * @property {boolean} valid - Validation status
 * @property {string[]} checks - Validation check results
 */

/**
 * @typedef {Object} FeeBreakdown
 * @property {string} bridgeFee - Bridge protocol fee
 * @property {string} gasFee - Gas cost estimation
 * @property {string} totalFee - Total fee amount
 * @property {string} currency - Fee currency
 */

/**
 * @typedef {Object} TimingEstimates
 * @property {number} estimated - Estimated time in seconds
 * @property {number} min - Minimum time in seconds
 * @property {number} max - Maximum time in seconds
 * @property {string} unit - Time unit
 */

/**
 * @typedef {Object} RouteOption
 * @property {string} bridgeKey - Bridge identifier
 * @property {string} bridgeName - Bridge display name
 * @property {string} bridgeType - Bridge type
 * @property {string} fromNetwork - Source network
 * @property {string} toNetwork - Destination network
 * @property {string} tokenSymbol - Token symbol
 * @property {string} amount - Transfer amount
 * @property {FeeBreakdown} fees - Fee breakdown
 * @property {TimingEstimates} timing - Timing estimates
 * @property {Object} validation - Validation results
 * @property {number} score - Route score (0-100)
 * @property {Object} metadata - Additional metadata
 */

// Concurrency control for bridge evaluations
const EVALUATION_CONCURRENCY = 5;
const limit = pLimit(EVALUATION_CONCURRENCY);

class RouteSelector {
  constructor() {
    this.validationCache = new Map();
    this.routeCache = new Map();
  }

  /**
   * Find optimal routes for cross-chain transfer
   * @param {RouteParams} params - Transfer parameters
   * @returns {Promise<RouteOption[]>} Available routes sorted by score
   */
  async findOptimalRoutes(params) {
    try {
      // Validate input parameters
      this._validateRouteParams(params);

      // Get available bridges for route
      const availableBridges = await this._getAvailableBridges(params);
      
      if (availableBridges.length === 0) {
        metrics.increment('route_selector.no_bridges_available', {
          fromNetwork: params.fromNetwork,
          toNetwork: params.toNetwork,
          token: params.tokenSymbol
        });
        throw new BridgeErrors.RouteNotFoundError(
          `No bridges available for ${params.fromNetwork} -> ${params.toNetwork}`
        );
      }

      // Evaluate bridge routes with concurrency control
      const evaluationPromises = availableBridges.map(bridge => 
        limit(() => this._evaluateBridgeRoute(bridge, params))
      );

      const evaluationResults = await Promise.allSettled(evaluationPromises);

      // Filter successful evaluations
      const validRoutes = evaluationResults
        .filter(result => result.status === 'fulfilled' && result.value.validation.isValid)
        .map(result => result.value)
        .sort((a, b) => b.score - a.score);

      if (validRoutes.length === 0) {
        metrics.increment('route_selector.no_valid_routes', {
          fromNetwork: params.fromNetwork,
          toNetwork: params.toNetwork,
          token: params.tokenSymbol
        });
        throw new BridgeErrors.RouteNotFoundError('No valid routes found after evaluation');
      }

      logger.info(`Found ${validRoutes.length} valid routes for ${params.fromNetwork} -> ${params.toNetwork}`);
      metrics.increment('route_selector.routes_found', {
        count: validRoutes.length,
        fromNetwork: params.fromNetwork,
        toNetwork: params.toNetwork
      });

      return validRoutes;

    } catch (error) {
      logger.error('Route selection failed:', error);
      metrics.increment('route_selector.error', { error: error.message });
      throw error;
    }
  }

  /**
   * Validate smart contract for bridge deployment
   * @param {string} bridgeKey - Bridge identifier
   * @param {string} network - Network name
   * @param {string} toNetwork - Destination network
   * @param {string} tokenSymbol - Token symbol
   * @returns {Promise<ValidationResult>} Validation results
   */
  async validateSmartContract(bridgeKey, network, toNetwork, tokenSymbol) {
    const cacheKey = `${bridgeKey}-${network}-${toNetwork}-${tokenSymbol}`;
    
    if (this.validationCache.has(cacheKey)) {
      return this.validationCache.get(cacheKey);
    }

    const result = { valid: true, checks: [] };

    try {
      // Get deployment information
      const deployment = configLoader.getDeploymentInfo(bridgeKey, network);
      const expectedAbi = configLoader.getExpectedAbi(bridgeKey);

      // ABI Structure validation
      try {
        const abiValidation = await ABIStructureValidator.validateContractABI(
          deployment.address, 
          network, 
          expectedAbi
        );
        
        if (!abiValidation.isValid) {
          throw new Error(`ABI mismatch: ${abiValidation.errors.join(', ')}`);
        }
        result.checks.push('abi_valid');
      } catch (err) {
        result.valid = false;
        result.checks.push(`abi_validation_failed:${err.message}`);
      }

      // Bytecode validation
      try {
        const bytecodeResult = await BytecodeValidator.validateBytecode(
          deployment.address,
          network,
          deployment.expectedBytecode
        );
        
        if (!bytecodeResult.isValid) {
          throw new Error(`Bytecode mismatch: ${bytecodeResult.reason}`);
        }
        result.checks.push('bytecode_valid');
      } catch (err) {
        result.valid = false;
        result.checks.push(`bytecode_validation_failed:${err.message}`);
      }

      // On-chain verification
      try {
        const onChainResult = await OnChainVerifier.verifyContract(
          deployment.address,
          network,
          { skipBytecodeCheck: true }
        );
        
        if (!onChainResult.verified) {
          throw new Error(`On-chain verification failed: ${onChainResult.reason}`);
        }
        result.checks.push('onchain_verified');
      } catch (err) {
        result.valid = false;
        result.checks.push(`onchain_verification_failed:${err.message}`);
      }

      // Audit status validation
      try {
        const auditResult = await AuditStatusChecker.checkAuditStatus(bridgeKey, deployment.address);
        
        if (!auditResult.passed) {
          throw new Error(`Audit status failed: ${auditResult.details}`);
        }
        result.checks.push('audit_status_ok');
      } catch (err) {
        result.valid = false;
        result.checks.push(`audit_status_failed:${err.message}`);
      }

      // Cache only valid results for 10 minutes
      if (result.valid) {
        this.validationCache.set(cacheKey, result);
        setTimeout(() => this.validationCache.delete(cacheKey), 10 * 60 * 1000);
        
        metrics.increment('contract_validation.success', { 
          bridge: bridgeKey, 
          network 
        });
      } else {
        metrics.increment('contract_validation.failure', { 
          bridge: bridgeKey, 
          network, 
          reason: result.checks.join(',')
        });
      }

      return result;

    } catch (error) {
      logger.warn(`Smart contract validation failed: ${error.message}`, { 
        bridgeKey, 
        network, 
        error 
      });
      
      result.valid = false;
      result.checks.push(`validation_error:${error.message}`);
      
      metrics.increment('contract_validation.error', { 
        bridge: bridgeKey, 
        network, 
        error: error.message 
      });
      
      return result;
    }
  }

  /**
   * Build complete route configuration
   * @param {Object} bridge - Bridge configuration
   * @param {RouteParams} transferParams - Transfer parameters
   * @returns {Promise<RouteOption>} Complete route configuration
   */
  async buildRouteConfiguration(bridge, transferParams) {
    try {
      // Calculate fees
      const fees = await this._calculateRouteFees(bridge, transferParams);
      
      // Estimate timing
      const timing = this._estimateTransferTiming(bridge, transferParams);
      
      // Initial validation
      const validation = {
        isValid: true,
        checks: ['basic_validation_passed'],
        smartContract: null
      };

      // Perform smart contract validation
      validation.smartContract = await this.validateSmartContract(
        bridge.key,
        transferParams.fromNetwork,
        transferParams.toNetwork,
        transferParams.tokenSymbol
      );

      if (!validation.smartContract.valid) {
        validation.isValid = false;
        validation.checks.push('smart_contract_validation_failed');
      } else {
        validation.checks.push('smart_contract_validated');
      }

      // Build route object
      const route = {
        bridgeKey: bridge.key,
        bridgeName: bridge.name,
        bridgeType: bridge.type,
        fromNetwork: transferParams.fromNetwork,
        toNetwork: transferParams.toNetwork,
        tokenSymbol: transferParams.tokenSymbol,
        amount: transferParams.amount.toString(),
        fees,
        timing,
        validation,
        score: this._calculateRouteScore(bridge, fees, timing, validation),
        metadata: {
          bridgeVersion: bridge.version,
          securityRating: bridge.securityRating || 'medium',
          supportUrl: bridge.supportUrl,
          lastUpdated: new Date().toISOString()
        }
      };

      return route;

    } catch (error) {
      logger.error(`Failed to build route configuration for ${bridge.key}:`, error);
      throw new BridgeErrors.RouteConfigurationError(
        `Route configuration failed: ${error.message}`
      );
    }
  }

  /**
   * Get available bridges for transfer route
   * @param {RouteParams} params - Transfer parameters
   * @returns {Promise<Object[]>} Available bridge configurations
   * @private
   */
  async _getAvailableBridges(params) {
    const bridges = Object.entries(configLoader.config.bridges)
      .map(([key, bridge]) => ({ key, ...bridge }))
      .filter(bridge => {
        // Check if bridge supports both networks
        const supportedNetworks = configLoader.getSupportedNetworks(bridge.key);
        return supportedNetworks.includes(params.fromNetwork) && 
               supportedNetworks.includes(params.toNetwork);
      })
      .filter(bridge => {
        // Check if bridge supports the token
        return bridge.supportedTokens?.includes(params.tokenSymbol) || 
               bridge.supportedTokens?.includes('*');
      })
      .filter(bridge => {
        // Check if bridge is active
        return bridge.status === 'active';
      });

    return bridges;
  }

  /**
   * Evaluate bridge route option
   * @param {Object} bridge - Bridge configuration
   * @param {RouteParams} params - Transfer parameters
   * @returns {Promise<RouteOption>} Evaluated route option
   * @private
   */
  async _evaluateBridgeRoute(bridge, params) {
    try {
      const route = await this.buildRouteConfiguration(bridge, params);
      
      // Additional validation checks
      if (!route.validation.isValid) {
        logger.warn(`Route validation failed for ${bridge.key}:`, route.validation.checks);
        metrics.increment('route_evaluation.validation_failed', { 
          bridge: bridge.key 
        });
      }

      return route;

    } catch (error) {
      logger.error(`Bridge evaluation failed for ${bridge.key}:`, error);
      metrics.increment('route_evaluation.error', { 
        bridge: bridge.key, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Calculate route fees with BigNumber support
   * @param {Object} bridge - Bridge configuration
   * @param {RouteParams} params - Transfer parameters
   * @returns {Promise<FeeBreakdown>} Fee breakdown
   * @private
   */
  async _calculateRouteFees(bridge, params) {
    try {
      const amount = BigNumber.from(params.amount);
      
      // Bridge-specific fee calculation
      const bridgeFeeRate = bridge.feeRate || '0.001'; // 0.1% default
      const bridgeFee = amount.mul(BigNumber.from(bridgeFeeRate).mul(1000)).div(1000000);
      
      // Gas fee estimation
      const gasFeeEstimate = BigNumber.from('2000000000000000'); // 0.002 ETH
      
      const totalFee = bridgeFee.add(gasFeeEstimate);

      return {
        bridgeFee: bridgeFee.toString(),
        gasFee: gasFeeEstimate.toString(),
        totalFee: totalFee.toString(),
        currency: 'ETH'
      };
    } catch (error) {
      logger.error('Fee calculation failed:', error);
      return {
        bridgeFee: '1000000000000000',
        gasFee: '2000000000000000',
        totalFee: '3000000000000000',
        currency: 'ETH'
      };
    }
  }

  /**
   * Estimate transfer timing
   * @param {Object} bridge - Bridge configuration
   * @param {RouteParams} params - Transfer parameters
   * @returns {TimingEstimates} Timing estimates
   * @private
   */
  _estimateTransferTiming(bridge, params) {
    const baseTime = bridge.averageTransferTime || 300; // 5 minutes default
    
    // Adjust for speed preference
    const speedMultipliers = {
      'fast': 0.7,
      'standard': 1.0,
      'economy': 1.5
    };
    
    const multiplier = speedMultipliers[params.speed] || 1.0;
    const estimatedTime = Math.floor(baseTime * multiplier);
    
    return {
      estimated: estimatedTime,
      min: Math.floor(estimatedTime * 0.7),
      max: Math.ceil(estimatedTime * 2),
      unit: 'seconds'
    };
  }

  /**
   * Calculate route score with enhanced criteria
   * @param {Object} bridge - Bridge configuration
   * @param {FeeBreakdown} fees - Fee information
   * @param {TimingEstimates} timing - Timing information
   * @param {Object} validation - Validation results
   * @returns {number} Route score (0-100)
   * @private
   */
  _calculateRouteScore(bridge, fees, timing, validation) {
    let score = 100;

    // Validation penalties
    if (!validation.isValid) score -= 50;
    if (!validation.smartContract?.valid) score -= 30;

    // Fee penalties (lower fees = higher score)
    const totalFeeBN = BigNumber.from(fees.totalFee);
    const bridgeFeeBN = BigNumber.from(fees.bridgeFee);
    const feeRatio = totalFeeBN.div(bridgeFeeBN.gt(0) ? bridgeFeeBN : 1).toNumber();
    score -= Math.min(20, feeRatio * 5);

    // Speed penalties (faster = higher score)
    score -= Math.min(15, timing.estimated / 60); // Deduct based on minutes

    // Security rating adjustments
    const securityAdjustments = {
      'high': 10,
      'medium': 5,
      'low': -10
    };
    score += securityAdjustments[bridge.securityRating] || 0;

    // Bridge type adjustments
    const typeAdjustments = {
      'native': 5,
      'canonical': 3,
      'external': 0,
      'synthetic': -5
    };
    score += typeAdjustments[bridge.type] || 0;

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * Validate route parameters with BigNumber support
   * @param {RouteParams} params - Parameters to validate
   * @private
   */
  _validateRouteParams(params) {
    if (!params.fromNetwork || !params.toNetwork || !params.tokenSymbol || !params.amount) {
      throw new BridgeErrors.InvalidParametersError('Missing required route parameters');
    }

    if (params.fromNetwork === params.toNetwork) {
      throw new BridgeErrors.InvalidParametersError('Source and destination networks must differ');
    }

    try {
      const amount = BigNumber.from(params.amount);
      if (amount.lte(0)) {
        throw new BridgeErrors.InvalidParametersError('Amount must be greater than 0');
      }
    } catch (error) {
      throw new BridgeErrors.InvalidParametersError('Invalid amount format');
    }

    // Validate speed preference
    if (params.speed && !['fast', 'standard', 'economy'].includes(params.speed)) {
      throw new BridgeErrors.InvalidParametersError('Invalid speed preference');
    }
  }

  /**
   * Clear caches
   */
  clearCache() {
    this.validationCache.clear();
    this.routeCache.clear();
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache statistics
   */
  getCacheStats() {
    return {
      validationCacheSize: this.validationCache.size,
      routeCacheSize: this.routeCache.size
    };
  }
}

module.exports = { RouteSelector };
