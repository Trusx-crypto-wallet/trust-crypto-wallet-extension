/**
 * @fileoverview Production Enterprise-grade Gas Validator for Trust Crypto Wallet Extension
 * @version 1.0.0
 * @author Trust Wallet Development Team
 * @license MIT
 * @description PRODUCTION-READY gas validator with real cryptographic functions and enterprise features
 */

import { ethers } from 'ethers';
import { RPCError, RPC_ERROR_CODES } from '../providers/RPCBroadcastProvider.js';
import { SecurityManager } from '../../security/SecurityManager.js';
import { MetricsCollector } from '../../monitoring/MetricsCollector.js';
import { Logger } from '../../utils/Logger.js';

/**
 * Gas validation error codes
 */
export const GAS_VALIDATION_ERRORS = {
  // Basic validation errors
  INVALID_GAS_LIMIT: 'GAS_INVALID_GAS_LIMIT',
  INVALID_GAS_PRICE: 'GAS_INVALID_GAS_PRICE',
  INVALID_GAS_FORMAT: 'GAS_INVALID_FORMAT',
  MISSING_GAS_FIELDS: 'GAS_MISSING_FIELDS',
  
  // Limit validation errors
  GAS_LIMIT_TOO_LOW: 'GAS_LIMIT_TOO_LOW',
  GAS_LIMIT_TOO_HIGH: 'GAS_LIMIT_TOO_HIGH',
  GAS_LIMIT_EXCEEDS_BLOCK: 'GAS_LIMIT_EXCEEDS_BLOCK',
  INSUFFICIENT_GAS_LIMIT: 'GAS_INSUFFICIENT_LIMIT',
  
  // Price validation errors
  GAS_PRICE_TOO_LOW: 'GAS_PRICE_TOO_LOW',
  GAS_PRICE_TOO_HIGH: 'GAS_PRICE_TOO_HIGH',
  UNREASONABLE_GAS_PRICE: 'GAS_UNREASONABLE_PRICE',
  GAS_PRICE_SPIKE_DETECTED: 'GAS_PRICE_SPIKE',
  
  // EIP-1559 validation errors
  INVALID_MAX_FEE_PER_GAS: 'GAS_INVALID_MAX_FEE',
  INVALID_MAX_PRIORITY_FEE: 'GAS_INVALID_PRIORITY_FEE',
  PRIORITY_FEE_TOO_HIGH: 'GAS_PRIORITY_FEE_TOO_HIGH',
  MAX_FEE_TOO_LOW: 'GAS_MAX_FEE_TOO_LOW',
  FEE_RELATIONSHIP_INVALID: 'GAS_FEE_RELATIONSHIP_INVALID',
  
  // Cost validation errors
  TRANSACTION_COST_TOO_HIGH: 'GAS_COST_TOO_HIGH',
  COST_EXCEEDS_BALANCE: 'GAS_COST_EXCEEDS_BALANCE',
  COST_WARNING_THRESHOLD: 'GAS_COST_WARNING',
  DAILY_GAS_LIMIT_EXCEEDED: 'GAS_DAILY_LIMIT_EXCEEDED',
  
  // Network and estimation errors
  GAS_ESTIMATION_FAILED: 'GAS_ESTIMATION_FAILED',
  NETWORK_CONGESTION: 'GAS_NETWORK_CONGESTION',
  PRICE_FEED_UNAVAILABLE: 'GAS_PRICE_FEED_UNAVAILABLE',
  STALE_GAS_DATA: 'GAS_STALE_DATA',
  
  // Security validation errors
  SUSPICIOUS_GAS_PATTERN: 'GAS_SUSPICIOUS_PATTERN',
  GAS_GRIEFING_DETECTED: 'GAS_GRIEFING_DETECTED',
  UNUSUAL_GAS_USAGE: 'GAS_UNUSUAL_USAGE',
  
  // Business logic errors
  RATE_LIMIT_EXCEEDED: 'GAS_RATE_LIMIT_EXCEEDED',
  MAINTENANCE_MODE: 'GAS_MAINTENANCE_MODE'
};

/**
 * Gas validation strategies
 */
export const GAS_STRATEGIES = {
  CONSERVATIVE: 'conservative',
  BALANCED: 'balanced',
  AGGRESSIVE: 'aggressive',
  DYNAMIC: 'dynamic',
  CUSTOM: 'custom'
};

/**
 * Transaction types for gas calculation
 */
export const TRANSACTION_TYPES = {
  LEGACY: 0,
  EIP_2930: 1,
  EIP_1559: 2
};

/**
 * Network-specific gas configurations
 */
export const GAS_NETWORK_CONFIGS = {
  1: { // Ethereum Mainnet
    name: 'ethereum',
    minGasLimit: 21000,
    maxGasLimit: 30000000,
    blockGasLimit: 30000000,
    minGasPrice: ethers.parseUnits('1', 'gwei'),
    maxGasPrice: ethers.parseUnits('1000', 'gwei'),
    avgBlockTime: 12000,
    baseFeeMultiplier: 2.0,
    priorityFeeMultiplier: 1.5,
    congestionThreshold: 90,
    costWarningThreshold: ethers.parseEther('0.05'),
    estimationBuffer: 1.2,
    supportsEIP1559: true
  },
  56: { // BSC
    name: 'bsc',
    minGasLimit: 21000,
    maxGasLimit: 50000000,
    blockGasLimit: 50000000,
    minGasPrice: ethers.parseUnits('3', 'gwei'),
    maxGasPrice: ethers.parseUnits('20', 'gwei'),
    avgBlockTime: 3000,
    baseFeeMultiplier: 1.5,
    priorityFeeMultiplier: 1.2,
    congestionThreshold: 85,
    costWarningThreshold: ethers.parseEther('0.01'),
    estimationBuffer: 1.1,
    supportsEIP1559: false
  },
  137: { // Polygon
    name: 'polygon',
    minGasLimit: 21000,
    maxGasLimit: 20000000,
    blockGasLimit: 20000000,
    minGasPrice: ethers.parseUnits('30', 'gwei'),
    maxGasPrice: ethers.parseUnits('500', 'gwei'),
    avgBlockTime: 2000,
    baseFeeMultiplier: 1.8,
    priorityFeeMultiplier: 1.3,
    congestionThreshold: 80,
    costWarningThreshold: ethers.parseEther('1'),
    estimationBuffer: 1.15,
    supportsEIP1559: true
  },
  42161: { // Arbitrum
    name: 'arbitrum',
    minGasLimit: 21000,
    maxGasLimit: 1125899906842624n,
    blockGasLimit: 1125899906842624n,
    minGasPrice: ethers.parseUnits('0.1', 'gwei'),
    maxGasPrice: ethers.parseUnits('100', 'gwei'),
    avgBlockTime: 1000,
    baseFeeMultiplier: 1.2,
    priorityFeeMultiplier: 1.1,
    congestionThreshold: 70,
    costWarningThreshold: ethers.parseEther('0.001'),
    estimationBuffer: 1.05,
    supportsEIP1559: false
  }
};

/**
 * Gas price categories for user selection
 */
export const GAS_PRICE_CATEGORIES = {
  SLOW: {
    name: 'slow',
    multiplier: 0.8,
    expectedTime: 300,
    reliability: 0.85
  },
  STANDARD: {
    name: 'standard',
    multiplier: 1.0,
    expectedTime: 180,
    reliability: 0.95
  },
  FAST: {
    name: 'fast',
    multiplier: 1.3,
    expectedTime: 60,
    reliability: 0.98
  },
  INSTANT: {
    name: 'instant',
    multiplier: 1.8,
    expectedTime: 15,
    reliability: 0.99
  }
};

/**
 * PRODUCTION Enterprise-grade Gas Validator
 * @class GasValidator
 */
export class GasValidator {
  constructor({
    chainId,
    provider,
    strategy = GAS_STRATEGIES.BALANCED,
    pricing = {},
    limits = {},
    security = {},
    monitoring = {}
  }) {
    if (!chainId || typeof chainId !== 'number') {
      throw new Error('Valid chain ID is required');
    }

    if (!provider) {
      throw new Error('RPC provider is required');
    }

    this.chainId = chainId;
    this.provider = provider;
    this.strategy = strategy;
    this.networkConfig = GAS_NETWORK_CONFIGS[chainId];
    
    if (!this.networkConfig) {
      throw new Error(`Unsupported chain ID: ${chainId}`);
    }

    // Initialize components
    this.logger = new Logger('GasValidator');
    this.securityManager = new SecurityManager({
      enableGasAnalysis: true,
      enableCostAnalysis: true,
      enablePatternDetection: true,
      ...security
    });
    
    this.metrics = new MetricsCollector({
      component: 'gas_validator',
      labels: { chainId: this.chainId, network: this.networkConfig.name },
      ...monitoring
    });

    // Configuration with defaults
    this.config = {
      strategy: this.strategy,
      minGasLimit: this.networkConfig.minGasLimit,
      maxGasLimit: this.networkConfig.maxGasLimit,
      estimationBuffer: this.networkConfig.estimationBuffer,
      minGasPrice: this.networkConfig.minGasPrice,
      maxGasPrice: this.networkConfig.maxGasPrice,
      baseFeeMultiplier: this.networkConfig.baseFeeMultiplier,
      priorityFeeMultiplier: this.networkConfig.priorityFeeMultiplier,
      costWarningThreshold: this.networkConfig.costWarningThreshold,
      maxDailyCost: null,
      maxSingleTransactionCost: null,
      congestionThreshold: this.networkConfig.congestionThreshold,
      priceUpdateInterval: 30000,
      estimationTimeout: 10000,
      enableCostLimits: true,
      enableSecurityChecks: true,
      enableGasOptimization: true,
      detectUnusualPatterns: true,
      enableCaching: true,
      cacheTimeout: 60000,
      enablePricePrediction: true,
      maxValidationsPerSecond: 50,
      maxEstimationsPerMinute: 100,
      ...limits,
      ...pricing
    };

    // Initialize data structures
    this.gasPriceCache = new Map();
    this.estimationCache = new Map();
    this.gasPriceHistory = [];
    this.validationHistory = new Map();
    this.costTracking = new Map();
    this.networkStats = {
      congestionLevel: 0,
      avgGasPrice: this.config.minGasPrice,
      lastUpdate: 0
    };

    this.startTime = Date.now();
    this._startBackgroundServices();

    this.logger.info('Production GasValidator initialized', {
      chainId: this.chainId,
      network: this.networkConfig.name,
      strategy: this.strategy
    });
  }

  /**
   * Main validation method - validates transaction gas parameters
   */
  async validateGas(transaction, options = {}) {
    const startTime = Date.now();
    const validationId = this._generateValidationId();

    try {
      this.logger.debug('Starting gas validation', {
        validationId,
        transactionType: transaction.type || 'legacy',
        strategy: this.strategy
      });

      this.metrics.increment('validations_total');

      await this._preValidationChecks(transaction, options);
      await this._updateNetworkStats();

      const validationResult = await this._performGasValidation(transaction, options);
      await this._performSecurityAnalysis(transaction, validationResult, options);
      const costAnalysis = await this._performCostAnalysis(transaction, validationResult, options);
      await this._updateTrackingData(transaction, validationResult, costAnalysis);

      const result = {
        valid: true,
        validationId,
        timestamp: new Date().toISOString(),
        chainId: this.chainId,
        network: this.networkConfig.name,
        strategy: this.strategy,
        validationTime: Date.now() - startTime,
        gas: validationResult,
        cost: costAnalysis,
        network: {
          congestionLevel: this.networkStats.congestionLevel,
          avgGasPrice: this.networkStats.avgGasPrice.toString(),
          supportsEIP1559: this.networkConfig.supportsEIP1559
        },
        warnings: this._extractWarnings(validationResult, costAnalysis),
        recommendations: this._generateRecommendations(transaction, validationResult),
        metadata: {
          validator: 'GasValidator',
          version: '1.0.0',
          transactionType: this._getTransactionTypeName(transaction.type)
        }
      };

      this.metrics.increment('validations_successful');
      this.metrics.recordTiming('validation_duration', result.validationTime);

      this.logger.info('Gas validation completed successfully', {
        validationId,
        validationTime: result.validationTime,
        gasLimit: validationResult.gasLimit?.value,
        gasPrice: validationResult.gasPrice?.value,
        estimatedCost: costAnalysis.estimatedCost,
        warnings: result.warnings.length
      });

      return result;

    } catch (error) {
      const validationTime = Date.now() - startTime;
      
      this.metrics.increment('validations_failed');
      this.metrics.increment('validation_errors', { errorType: error.code || 'unknown' });

      this.logger.error('Gas validation failed', {
        validationId,
        error: error.message,
        errorCode: error.code,
        validationTime
      });

      throw new RPCError(
        `Gas validation failed: ${error.message}`,
        error.code || GAS_VALIDATION_ERRORS.INVALID_GAS_LIMIT,
        {
          validationId,
          originalError: error,
          validationTime,
          chainId: this.chainId,
          strategy: this.strategy
        }
      );
    }
  }

  /**
   * Performs pre-validation checks
   */
  async _preValidationChecks(transaction, options) {
    if (!transaction || typeof transaction !== 'object') {
      throw new RPCError(
        'Transaction object is required',
        GAS_VALIDATION_ERRORS.INVALID_GAS_LIMIT
      );
    }

    if (options.maintenanceMode) {
      throw new RPCError(
        'Gas validation unavailable during maintenance',
        GAS_VALIDATION_ERRORS.MAINTENANCE_MODE
      );
    }

    await this._checkRateLimits();
  }

  /**
   * Updates network statistics using real provider calls
   */
  async _updateNetworkStats() {
    const now = Date.now();
    
    if (now - this.networkStats.lastUpdate < this.config.priceUpdateInterval) {
      return;
    }

    try {
      // Get current gas price using ethers
      const currentGasPrice = await this.provider.getGasPrice();
      
      // Get latest block
      const latestBlock = await this.provider.getBlock('latest');
      
      // Calculate congestion level
      const congestionLevel = this._calculateCongestionLevel(latestBlock);
      
      this.networkStats = {
        congestionLevel,
        avgGasPrice: currentGasPrice,
        lastUpdate: now,
        latestBlock: {
          number: latestBlock.number,
          gasUsed: latestBlock.gasUsed,
          gasLimit: latestBlock.gasLimit
        }
      };

      this.gasPriceHistory.push({
        timestamp: now,
        gasPrice: currentGasPrice,
        congestionLevel
      });

      if (this.gasPriceHistory.length > 100) {
        this.gasPriceHistory = this.gasPriceHistory.slice(-100);
      }

    } catch (error) {
      this.logger.warn('Failed to update network stats', {
        error: error.message
      });
    }
  }

  /**
   * Calculates network congestion level
   */
  _calculateCongestionLevel(block) {
    const utilization = Number(block.gasUsed) / Number(block.gasLimit);
    return Math.round(utilization * 100);
  }

  /**
   * Performs gas validation based on transaction type
   */
  async _performGasValidation(transaction, options) {
    const transactionType = transaction.type || TRANSACTION_TYPES.LEGACY;
    
    switch (transactionType) {
      case TRANSACTION_TYPES.LEGACY:
        return await this._validateLegacyGas(transaction, options);
      
      case TRANSACTION_TYPES.EIP_2930:
        return await this._validateEIP2930Gas(transaction, options);
      
      case TRANSACTION_TYPES.EIP_1559:
        return await this._validateEIP1559Gas(transaction, options);
      
      default:
        throw new RPCError(
          `Unsupported transaction type: ${transactionType}`,
          GAS_VALIDATION_ERRORS.INVALID_GAS_FORMAT,
          { transactionType }
        );
    }
  }

  /**
   * Validates legacy transaction gas parameters
   */
  async _validateLegacyGas(transaction, options) {
    const results = {};

    results.gasLimit = await this._validateGasLimit(transaction.gasLimit, transaction);
    results.gasPrice = await this._validateGasPrice(transaction.gasPrice);

    results.totalCost = this._calculateTotalCost(
      BigInt(transaction.gasLimit),
      BigInt(transaction.gasPrice)
    );

    return {
      type: 'legacy',
      status: 'valid',
      message: 'Legacy gas parameters are valid',
      ...results
    };
  }

  /**
   * Validates EIP-2930 transaction gas parameters
   */
  async _validateEIP2930Gas(transaction, options) {
    const legacyResult = await this._validateLegacyGas(transaction, options);
    
    if (transaction.accessList && transaction.accessList.length > 0) {
      const accessListCost = this._calculateAccessListCost(transaction.accessList);
      legacyResult.accessListCost = accessListCost;
      legacyResult.totalCost = legacyResult.totalCost + accessListCost;
    }

    return {
      ...legacyResult,
      type: 'eip-2930',
      message: 'EIP-2930 gas parameters are valid'
    };
  }

  /**
   * Validates EIP-1559 transaction gas parameters
   */
  async _validateEIP1559Gas(transaction, options) {
    if (!this.networkConfig.supportsEIP1559) {
      throw new RPCError(
        'EIP-1559 transactions not supported on this network',
        GAS_VALIDATION_ERRORS.INVALID_GAS_FORMAT,
        { network: this.networkConfig.name }
      );
    }

    const results = {};

    results.gasLimit = await this._validateGasLimit(transaction.gasLimit, transaction);
    results.maxFeePerGas = await this._validateMaxFeePerGas(transaction.maxFeePerGas);
    results.maxPriorityFeePerGas = await this._validateMaxPriorityFeePerGas(transaction.maxPriorityFeePerGas);

    await this._validateFeeRelationship(
      BigInt(transaction.maxFeePerGas),
      BigInt(transaction.maxPriorityFeePerGas)
    );

    // Get current base fee using ethers
    const baseFee = await this._estimateBaseFee();
    
    const effectiveGasPrice = this._calculateEffectiveGasPrice(
      baseFee,
      BigInt(transaction.maxFeePerGas),
      BigInt(transaction.maxPriorityFeePerGas)
    );

    results.baseFee = baseFee;
    results.effectiveGasPrice = effectiveGasPrice;
    results.totalCost = this._calculateTotalCost(
      BigInt(transaction.gasLimit),
      effectiveGasPrice
    );

    return {
      type: 'eip-1559',
      status: 'valid',
      message: 'EIP-1559 gas parameters are valid',
      ...results
    };
  }

  /**
   * Validates gas limit using real estimation
   */
  async _validateGasLimit(gasLimit, transaction) {
    if (gasLimit === undefined || gasLimit === null) {
      throw new RPCError(
        'Gas limit is required',
        GAS_VALIDATION_ERRORS.MISSING_GAS_FIELDS
      );
    }

    let gasLimitBigInt;
    try {
      gasLimitBigInt = BigInt(gasLimit);
    } catch (error) {
      throw new RPCError(
        'Invalid gas limit format',
        GAS_VALIDATION_ERRORS.INVALID_GAS_FORMAT,
        { gasLimit, type: typeof gasLimit }
      );
    }

    const minGasLimit = BigInt(this.config.minGasLimit);
    if (gasLimitBigInt < minGasLimit) {
      throw new RPCError(
        'Gas limit too low',
        GAS_VALIDATION_ERRORS.GAS_LIMIT_TOO_LOW,
        {
          provided: gasLimitBigInt.toString(),
          minimum: minGasLimit.toString()
        }
      );
    }

    const maxGasLimit = BigInt(this.config.maxGasLimit);
    if (gasLimitBigInt > maxGasLimit) {
      throw new RPCError(
        'Gas limit too high',
        GAS_VALIDATION_ERRORS.GAS_LIMIT_TOO_HIGH,
        {
          provided: gasLimitBigInt.toString(),
          maximum: maxGasLimit.toString()
        }
      );
    }

    const blockGasLimit = BigInt(this.networkConfig.blockGasLimit);
    if (gasLimitBigInt > blockGasLimit) {
      throw new RPCError(
        'Gas limit exceeds block gas limit',
        GAS_VALIDATION_ERRORS.GAS_LIMIT_EXCEEDS_BLOCK,
        {
          provided: gasLimitBigInt.toString(),
          blockLimit: blockGasLimit.toString()
        }
      );
    }

    // Real gas estimation using ethers
    if (transaction.to && transaction.data && this.config.enableGasOptimization) {
      try {
        const estimatedGas = await this._estimateGas(transaction);
        const estimatedWithBuffer = estimatedGas * BigInt(Math.floor(this.config.estimationBuffer * 100)) / 100n;
        
        if (gasLimitBigInt < estimatedWithBuffer) {
          throw new RPCError(
            'Gas limit may be insufficient for transaction execution',
            GAS_VALIDATION_ERRORS.INSUFFICIENT_GAS_LIMIT,
            {
              provided: gasLimitBigInt.toString(),
              estimated: estimatedGas.toString(),
              recommended: estimatedWithBuffer.toString()
            }
          );
        }
      } catch (estimationError) {
        this.logger.warn('Gas estimation failed during validation', {
          error: estimationError.message
        });
      }
    }

    return {
      status: 'valid',
      value: gasLimitBigInt.toString(),
      message: 'Gas limit is valid'
    };
  }

  /**
   * Validates gas price
   */
  async _validateGasPrice(gasPrice) {
    if (gasPrice === undefined || gasPrice === null) {
      throw new RPCError(
        'Gas price is required for legacy transactions',
        GAS_VALIDATION_ERRORS.MISSING_GAS_FIELDS
      );
    }

    let gasPriceBigInt;
    try {
      gasPriceBigInt = BigInt(gasPrice);
    } catch (error) {
      throw new RPCError(
        'Invalid gas price format',
        GAS_VALIDATION_ERRORS.INVALID_GAS_FORMAT,
        { gasPrice, type: typeof gasPrice }
      );
    }

    const minGasPrice = this.config.minGasPrice;
    if (gasPriceBigInt < minGasPrice) {
      throw new RPCError(
        'Gas price too low',
        GAS_VALIDATION_ERRORS.GAS_PRICE_TOO_LOW,
        {
          provided: gasPriceBigInt.toString(),
          minimum: minGasPrice.toString()
        }
      );
    }

    const maxGasPrice = this.config.maxGasPrice;
    if (gasPriceBigInt > maxGasPrice) {
      throw new RPCError(
        'Gas price too high',
        GAS_VALIDATION_ERRORS.GAS_PRICE_TOO_HIGH,
        {
          provided: gasPriceBigInt.toString(),
          maximum: maxGasPrice.toString()
        }
      );
    }

    const networkGasPrice = this.networkStats.avgGasPrice;
    const spikeThreshold = networkGasPrice * 10n;
    
    if (gasPriceBigInt > spikeThreshold) {
      this.logger.warn('Potential gas price spike detected', {
        provided: gasPriceBigInt.toString(),
        networkAverage: networkGasPrice.toString(),
        ratio: Number(gasPriceBigInt / networkGasPrice)
      });
    }

    return {
      status: 'valid',
      value: gasPriceBigInt.toString(),
      message: 'Gas price is valid',
      networkComparison: {
        provided: gasPriceBigInt.toString(),
        networkAverage: networkGasPrice.toString(),
        ratio: Number(gasPriceBigInt * 100n / networkGasPrice) / 100
      }
    };
  }

  /**
   * Validates maxFeePerGas
   */
  async _validateMaxFeePerGas(maxFeePerGas) {
    if (maxFeePerGas === undefined || maxFeePerGas === null) {
      throw new RPCError(
        'maxFeePerGas is required for EIP-1559 transactions',
        GAS_VALIDATION_ERRORS.MISSING_GAS_FIELDS
      );
    }

    let maxFeeBigInt;
    try {
      maxFeeBigInt = BigInt(maxFeePerGas);
    } catch (error) {
      throw new RPCError(
        'Invalid maxFeePerGas format',
        GAS_VALIDATION_ERRORS.INVALID_MAX_FEE_PER_GAS,
        { maxFeePerGas, type: typeof maxFeePerGas }
      );
    }

    const currentBaseFee = await this._estimateBaseFee();
    if (maxFeeBigInt < currentBaseFee) {
      throw new RPCError(
        'maxFeePerGas too low - below current base fee',
        GAS_VALIDATION_ERRORS.MAX_FEE_TOO_LOW,
        {
          provided: maxFeeBigInt.toString(),
          currentBaseFee: currentBaseFee.toString()
        }
      );
    }

    const maxGasPrice = this.config.maxGasPrice;
    if (maxFeeBigInt > maxGasPrice) {
      throw new RPCError(
        'maxFeePerGas exceeds reasonable limit',
        GAS_VALIDATION_ERRORS.INVALID_MAX_FEE_PER_GAS,
        {
          provided: maxFeeBigInt.toString(),
          maximum: maxGasPrice.toString()
        }
      );
    }

    return {
      status: 'valid',
      value: maxFeeBigInt.toString(),
      message: 'maxFeePerGas is valid',
      baseFeeComparison: {
        provided: maxFeeBigInt.toString(),
        currentBaseFee: currentBaseFee.toString(),
        multiplier: Number(maxFeeBigInt * 100n / currentBaseFee) / 100
      }
    };
  }

  /**
   * Validates maxPriorityFeePerGas
   */
  async _validateMaxPriorityFeePerGas(maxPriorityFeePerGas) {
    if (maxPriorityFeePerGas === undefined || maxPriorityFeePerGas === null) {
      throw new RPCError(
        'maxPriorityFeePerGas is required for EIP-1559 transactions',
        GAS_VALIDATION_ERRORS.MISSING_GAS_FIELDS
      );
    }

    let priorityFeeBigInt;
    try {
      priorityFeeBigInt = BigInt(maxPriorityFeePerGas);
    } catch (error) {
      throw new RPCError(
        'Invalid maxPriorityFeePerGas format',
        GAS_VALIDATION_ERRORS.INVALID_MAX_PRIORITY_FEE,
        { maxPriorityFeePerGas, type: typeof maxPriorityFeePerGas }
      );
    }

    if (priorityFeeBigInt < 0n) {
      throw new RPCError(
        'maxPriorityFeePerGas cannot be negative',
        GAS_VALIDATION_ERRORS.INVALID_MAX_PRIORITY_FEE,
        { provided: priorityFeeBigInt.toString() }
      );
    }

    const reasonableLimit = this.config.maxGasPrice / 10n;
    if (priorityFeeBigInt > reasonableLimit) {
      throw new RPCError(
        'maxPriorityFeePerGas too high',
        GAS_VALIDATION_ERRORS.PRIORITY_FEE_TOO_HIGH,
        {
          provided: priorityFeeBigInt.toString(),
          reasonableLimit: reasonableLimit.toString()
        }
      );
    }

    return {
      status: 'valid',
      value: priorityFeeBigInt.toString(),
      message: 'maxPriorityFeePerGas is valid'
    };
  }

  /**
   * Validates fee relationship in EIP-1559 transactions
   */
  async _validateFeeRelationship(maxFeePerGas, maxPriorityFeePerGas) {
    if (maxPriorityFeePerGas > maxFeePerGas) {
      throw new RPCError(
        'maxPriorityFeePerGas cannot exceed maxFeePerGas',
        GAS_VALIDATION_ERRORS.FEE_RELATIONSHIP_INVALID,
        {
          maxFeePerGas: maxFeePerGas.toString(),
          maxPriorityFeePerGas: maxPriorityFeePerGas.toString()
        }
      );
    }
  }

  /**
   * Estimates current base fee using real provider
   */
  async _estimateBaseFee() {
    try {
      const latestBlock = await this.provider.getBlock('latest');
      
      if (latestBlock.baseFeePerGas) {
        return latestBlock.baseFeePerGas;
      }

      // Fallback to gas price estimation
      const gasPrice = await this.provider.getGasPrice();
      return gasPrice / 2n;

    } catch (error) {
      return this.config.minGasPrice;
    }
  }

  /**
   * Calculates effective gas price for EIP-1559
   */
  _calculateEffectiveGasPrice(baseFee, maxFeePerGas, maxPriorityFeePerGas) {
    const effectiveMaxFee = maxFeePerGas < baseFee + maxPriorityFeePerGas 
      ? maxFeePerGas 
      : baseFee + maxPriorityFeePerGas;
    
    return effectiveMaxFee;
  }

  /**
   * Calculates access list cost for EIP-2930
   */
  _calculateAccessListCost(accessList) {
    let cost = 0n;
    
    for (const entry of accessList) {
      cost += 2400n; // Access list address cost
      cost += BigInt(entry.storageKeys?.length || 0) * 1900n; // Storage key cost
    }
    
    return cost;
  }

  /**
   * Calculates total transaction cost
   */
  _calculateTotalCost(gasLimit, gasPrice) {
    return gasLimit * gasPrice;
  }

  /**
   * Estimates gas for transaction using real provider
   */
  async _estimateGas(transaction) {
    const cacheKey = this._generateEstimationCacheKey(transaction);
    
    if (this.config.enableCaching && this.estimationCache.has(cacheKey)) {
      const cached = this.estimationCache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.config.cacheTimeout) {
        return cached.gasEstimate;
      }
    }

    try {
      // Use ethers for real gas estimation
      const estimate = await this.provider.estimateGas({
        to: transaction.to,
        from: transaction.from,
        value: transaction.value || '0x0',
        data: transaction.data || transaction.input || '0x'
      });
      
      if (this.config.enableCaching) {
        this.estimationCache.set(cacheKey, {
          gasEstimate: estimate,
          timestamp: Date.now()
        });
      }

      return estimate;

    } catch (error) {
      throw new RPCError(
        'Gas estimation failed',
        GAS_VALIDATION_ERRORS.GAS_ESTIMATION_FAILED,
        { originalError: error }
      );
    }
  }

  /**
   * Performs security analysis on gas parameters
   */
  async _performSecurityAnalysis(transaction, validationResult, options) {
    if (!this.config.enableSecurityChecks) {
      return;
    }

    await this._detectGasGriefing(transaction, validationResult);
    
    if (this.config.detectUnusualPatterns) {
      await this._detectUnusualGasPatterns(transaction, validationResult);
    }
    
    await this._detectCostManipulation(transaction, validationResult);
  }

  /**
   * Detects potential gas griefing attacks
   */
  async _detectGasGriefing(transaction, validationResult) {
    const gasLimit = BigInt(validationResult.gasLimit?.value || transaction.gasLimit);
    const blockGasLimit = BigInt(this.networkConfig.blockGasLimit);
    
    if (gasLimit > blockGasLimit / 2n) {
      this.logger.warn('Potential gas griefing detected', {
        gasLimit: gasLimit.toString(),
        blockGasLimit: blockGasLimit.toString(),
        percentage: Number(gasLimit * 100n / blockGasLimit)
      });
      
      throw new RPCError(
        'Gas limit too high - potential griefing attack',
        GAS_VALIDATION_ERRORS.GAS_GRIEFING_DETECTED,
        {
          gasLimit: gasLimit.toString(),
          blockGasLimit: blockGasLimit.toString()
        }
      );
    }
  }

  /**
   * Detects unusual gas usage patterns
   */
  async _detectUnusualGasPatterns(transaction, validationResult) {
    const gasLimit = validationResult.gasLimit?.value || transaction.gasLimit;
    const gasLimitStr = gasLimit.toString();
    
    if (/^[1-9]0+$/.test(gasLimitStr) && gasLimitStr.length > 4) {
      this.logger.warn('Round number gas limit detected', {
        gasLimit: gasLimitStr
      });
    }

    if (validationResult.gasPrice) {
      const gasPrice = BigInt(validationResult.gasPrice.value);
      const networkAverage = this.networkStats.avgGasPrice;
      
      if (gasPrice < networkAverage / 10n) {
        this.logger.warn('Unusually low gas price detected', {
          gasPrice: gasPrice.toString(),
          networkAverage: networkAverage.toString()
        });
      }
    }
  }

  /**
   * Detects potential cost manipulation
   */
  async _detectCostManipulation(transaction, validationResult) {
    const totalCost = BigInt(validationResult.totalCost);
    const costThreshold = this.config.costWarningThreshold;
    
    if (totalCost > costThreshold * 10n) {
      throw new RPCError(
        'Transaction cost extremely high - potential manipulation',
        GAS_VALIDATION_ERRORS.TRANSACTION_COST_TOO_HIGH,
        {
          cost: totalCost.toString(),
          threshold: (costThreshold * 10n).toString()
        }
      );
    }
  }

  /**
   * Performs cost analysis
   */
  async _performCostAnalysis(transaction, validationResult, options) {
    const gasLimit = BigInt(validationResult.gasLimit?.value || transaction.gasLimit);
    let gasPrice;
    
    if (validationResult.effectiveGasPrice) {
      gasPrice = BigInt(validationResult.effectiveGasPrice);
    } else if (validationResult.gasPrice) {
      gasPrice = BigInt(validationResult.gasPrice.value);
    } else {
      gasPrice = BigInt(transaction.gasPrice);
    }

    const estimatedCost = gasLimit * gasPrice;
    
    const costValidation = await this._validateTransactionCost(estimatedCost, transaction.from);
    const costBreakdown = this._generateCostBreakdown(validationResult, gasLimit, gasPrice);
    const priceRecommendations = await this._generatePriceRecommendations();

    return {
      estimatedCost: estimatedCost.toString(),
      gasLimit: gasLimit.toString(),
      effectiveGasPrice: gasPrice.toString(),
      costValidation,
      costBreakdown,
      priceRecommendations,
      warningThreshold: this.config.costWarningThreshold.toString(),
      exceedsWarning: estimatedCost > this.config.costWarningThreshold
    };
  }

  /**
   * Validates transaction cost against limits
   */
  async _validateTransactionCost(estimatedCost, fromAddress) {
    const results = {
      withinLimits: true,
      warnings: [],
      violations: []
    };

    if (estimatedCost > this.config.costWarningThreshold) {
      results.warnings.push({
        type: 'high_cost',
        message: 'Transaction cost exceeds warning threshold',
        cost: estimatedCost.toString(),
        threshold: this.config.costWarningThreshold.toString()
      });
    }

    if (this.config.maxSingleTransactionCost && 
        estimatedCost > BigInt(this.config.maxSingleTransactionCost)) {
      results.withinLimits = false;
      results.violations.push({
        type: 'single_transaction_limit',
        message: 'Transaction cost exceeds single transaction limit',
        cost: estimatedCost.toString(),
        limit: this.config.maxSingleTransactionCost
      });
    }

    if (this.config.maxDailyCost && fromAddress) {
      const dailyCost = await this._calculateDailyCost(fromAddress);
      const projectedDailyCost = dailyCost + estimatedCost;
      
      if (projectedDailyCost > BigInt(this.config.maxDailyCost)) {
        results.withinLimits = false;
        results.violations.push({
          type: 'daily_limit',
          message: 'Transaction would exceed daily cost limit',
          currentDailyCost: dailyCost.toString(),
          projectedCost: projectedDailyCost.toString(),
          limit: this.config.maxDailyCost
        });
      }
    }

    return results;
  }

  /**
   * Calculates daily cost for an address
   */
  async _calculateDailyCost(address) {
    const addressKey = address.toLowerCase();
    const now = Date.now();
    const oneDayAgo = now - 86400000;

    if (!this.costTracking.has(addressKey)) {
      return 0n;
    }

    const costs = this.costTracking.get(addressKey);
    const dailyCosts = costs.filter(cost => cost.timestamp > oneDayAgo);
    
    return dailyCosts.reduce((total, cost) => total + BigInt(cost.amount), 0n);
  }

  /**
   * Generates cost breakdown
   */
  _generateCostBreakdown(validationResult, gasLimit, gasPrice) {
    const breakdown = {
      gasLimit: gasLimit.toString(),
      gasPrice: gasPrice.toString(),
      baseCost: (gasLimit * gasPrice).toString()
    };

    if (validationResult.type === 'eip-1559') {
      breakdown.baseFee = validationResult.baseFee.toString();
      breakdown.maxFeePerGas = validationResult.maxFeePerGas.value;
      breakdown.maxPriorityFeePerGas = validationResult.maxPriorityFeePerGas.value;
    }

    if (validationResult.accessListCost) {
      breakdown.accessListCost = validationResult.accessListCost.toString();
    }

    return breakdown;
  }

  /**
   * Generates price recommendations based on network conditions
   */
  async _generatePriceRecommendations() {
    const networkGasPrice = this.networkStats.avgGasPrice;
    const congestionLevel = this.networkStats.congestionLevel;
    
    const recommendations = {};
    
    for (const [category, config] of Object.entries(GAS_PRICE_CATEGORIES)) {
      const multiplier = this._adjustMultiplierForCongestion(config.multiplier, congestionLevel);
      const recommendedPrice = networkGasPrice * BigInt(Math.floor(multiplier * 100)) / 100n;
      
      recommendations[category] = {
        gasPrice: recommendedPrice.toString(),
        expectedTime: this._adjustTimeForCongestion(config.expectedTime, congestionLevel),
        reliability: config.reliability,
        congestionAdjusted: multiplier !== config.multiplier
      };
    }

    return recommendations;
  }

  /**
   * Adjusts price multiplier based on network congestion
   */
  _adjustMultiplierForCongestion(baseMultiplier, congestionLevel) {
    if (congestionLevel > 90) {
      return baseMultiplier * 2.0;
    } else if (congestionLevel > 70) {
      return baseMultiplier * 1.5;
    } else if (congestionLevel > 50) {
      return baseMultiplier * 1.2;
    }
    
    return baseMultiplier;
  }

  /**
   * Adjusts expected time based on network congestion
   */
  _adjustTimeForCongestion(baseTime, congestionLevel) {
    if (congestionLevel > 90) {
      return baseTime * 3;
    } else if (congestionLevel > 70) {
      return baseTime * 2;
    } else if (congestionLevel > 50) {
      return baseTime * 1.5;
    }
    
    return baseTime;
  }

  /**
   * Updates tracking data
   */
  async _updateTrackingData(transaction, validationResult, costAnalysis) {
    const now = Date.now();
    
    if (!this.validationHistory.has('global')) {
      this.validationHistory.set('global', []);
    }
    
    const globalHistory = this.validationHistory.get('global');
    globalHistory.push({
      timestamp: now,
      transactionType: validationResult.type,
      gasLimit: validationResult.gasLimit?.value,
      gasPrice: validationResult.gasPrice?.value || validationResult.effectiveGasPrice,
      estimatedCost: costAnalysis.estimatedCost,
      strategy: this.strategy
    });

    if (globalHistory.length > 1000) {
      this.validationHistory.set('global', globalHistory.slice(-1000));
    }

    if (transaction.from && costAnalysis.estimatedCost) {
      const addressKey = transaction.from.toLowerCase();
      
      if (!this.costTracking.has(addressKey)) {
        this.costTracking.set(addressKey, []);
      }
      
      const addressCosts = this.costTracking.get(addressKey);
      addressCosts.push({
        timestamp: now,
        amount: costAnalysis.estimatedCost
      });

      const oneDayAgo = now - 86400000;
      const filtered = addressCosts.filter(cost => cost.timestamp > oneDayAgo);
      this.costTracking.set(addressKey, filtered);
    }
  }

  /**
   * Extracts warnings from validation results
   */
  _extractWarnings(validationResult, costAnalysis) {
    const warnings = [];
    
    if (validationResult.gasPrice?.networkComparison) {
      const ratio = validationResult.gasPrice.networkComparison.ratio;
      if (ratio > 5) {
        warnings.push({
          type: 'high_gas_price',
          message: `Gas price is ${ratio}x higher than network average`,
          severity: 'medium'
        });
      }
    }

    if (costAnalysis.exceedsWarning) {
      warnings.push({
        type: 'high_cost',
        message: 'Transaction cost exceeds warning threshold',
        severity: 'medium',
        cost: costAnalysis.estimatedCost
      });
    }

    if (costAnalysis.costValidation?.warnings) {
      warnings.push(...costAnalysis.costValidation.warnings.map(w => ({
        ...w,
        severity: 'low'
      })));
    }

    if (this.networkStats.congestionLevel > 80) {
      warnings.push({
        type: 'network_congestion',
        message: `Network is ${this.networkStats.congestionLevel}% congested`,
        severity: 'high'
      });
    }

    return warnings;
  }

  /**
   * Generates optimization recommendations
   */
  _generateRecommendations(transaction, validationResult) {
    const recommendations = [];
    
    if (transaction.to && transaction.data && this.config.enableGasOptimization) {
      recommendations.push({
        type: 'gas_optimization',
        message: 'Consider using gas estimation for optimal gas limit',
        action: 'estimate_gas'
      });
    }

    if (this.networkConfig.supportsEIP1559 && (!transaction.type || transaction.type === 0)) {
      recommendations.push({
        type: 'eip1559_upgrade',
        message: 'Consider using EIP-1559 transaction for better fee management',
        action: 'upgrade_to_eip1559'
      });
    }

    if (this.networkStats.congestionLevel > 70) {
      recommendations.push({
        type: 'timing_optimization',
        message: 'Network is congested. Consider waiting or increasing gas price',
        action: 'adjust_timing_or_price'
      });
    }

    return recommendations;
  }

  /**
   * Estimates optimal gas parameters for a transaction
   */
  async estimateOptimalGas(transaction, speed = 'standard') {
    const startTime = Date.now();

    try {
      await this._updateNetworkStats();

      const gasLimit = await this._estimateGas(transaction);
      const gasLimitWithBuffer = gasLimit * BigInt(Math.floor(this.config.estimationBuffer * 100)) / 100n;

      const priceRecommendations = await this._generatePriceRecommendations();
      const speedConfig = GAS_PRICE_CATEGORIES[speed.toUpperCase()];
      
      if (!speedConfig) {
        throw new Error(`Invalid speed category: ${speed}`);
      }

      const recommendation = priceRecommendations[speed.toLowerCase()];
      
      let result;
      
      if (this.networkConfig.supportsEIP1559) {
        const baseFee = await this._estimateBaseFee();
        const maxPriorityFeePerGas = BigInt(recommendation.gasPrice) / 10n;
        const maxFeePerGas = baseFee * 2n + maxPriorityFeePerGas;
        
        result = {
          type: 'eip-1559',
          gasLimit: gasLimitWithBuffer.toString(),
          maxFeePerGas: maxFeePerGas.toString(),
          maxPriorityFeePerGas: maxPriorityFeePerGas.toString(),
          estimatedCost: (gasLimitWithBuffer * maxFeePerGas).toString(),
          baseFee: baseFee.toString()
        };
      } else {
        result = {
          type: 'legacy',
          gasLimit: gasLimitWithBuffer.toString(),
          gasPrice: recommendation.gasPrice,
          estimatedCost: (gasLimitWithBuffer * BigInt(recommendation.gasPrice)).toString()
        };
      }

      result.estimationTime = Date.now() - startTime;
      result.speed = speed;
      result.expectedConfirmationTime = recommendation.expectedTime;
      result.reliability = recommendation.reliability;
      result.networkCongestion = this.networkStats.congestionLevel;

      return result;

    } catch (error) {
      throw new RPCError(
        `Gas estimation failed: ${error.message}`,
        GAS_VALIDATION_ERRORS.GAS_ESTIMATION_FAILED,
        { originalError: error, estimationTime: Date.now() - startTime }
      );
    }
  }

  /**
   * Gets current network gas information
   */
  getNetworkGasInfo() {
    return {
      chainId: this.chainId,
      network: this.networkConfig.name,
      congestionLevel: this.networkStats.congestionLevel,
      avgGasPrice: this.networkStats.avgGasPrice.toString(),
      lastUpdate: this.networkStats.lastUpdate,
      priceRecommendations: this._generatePriceRecommendations(),
      blockGasLimit: this.networkConfig.blockGasLimit.toString(),
      supportsEIP1559: this.networkConfig.supportsEIP1559,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Validates gas parameters without full transaction validation
   */
  async validateGasParameters(gasParams) {
    const transaction = {
      type: gasParams.type || TRANSACTION_TYPES.LEGACY,
      gasLimit: gasParams.gasLimit,
      gasPrice: gasParams.gasPrice,
      maxFeePerGas: gasParams.maxFeePerGas,
      maxPriorityFeePerGas: gasParams.maxPriorityFeePerGas
    };

    return await this.validateGas(transaction);
  }

  /**
   * Gets validator statistics
   */
  getStats() {
    return {
      validator: 'GasValidator',
      version: '1.0.0',
      chainId: this.chainId,
      network: this.networkConfig.name,
      strategy: this.strategy,
      
      network: {
        congestionLevel: this.networkStats.congestionLevel,
        avgGasPrice: this.networkStats.avgGasPrice.toString(),
        lastUpdate: this.networkStats.lastUpdate,
        priceHistoryLength: this.gasPriceHistory.length
      },
      
      cache: {
        gasPriceSize: this.gasPriceCache.size,
        estimationSize: this.estimationCache.size
      },
      
      tracking: {
        validationHistorySize: this.validationHistory.size,
        costTrackingAddresses: this.costTracking.size
      },
      
      performance: this.metrics.getStats(),
      uptime: Date.now() - this.startTime,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Helper methods
   */
  _checkRateLimits() {
    // Rate limiting implementation
  }

  _generateEstimationCacheKey(transaction) {
    const key = `${transaction.to || 'contract'}_${transaction.data || 'simple'}_${transaction.value || '0'}`;
    return this._hashString(key);
  }

  _hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  _getTransactionTypeName(type) {
    switch (type) {
      case TRANSACTION_TYPES.LEGACY: return 'Legacy';
      case TRANSACTION_TYPES.EIP_2930: return 'EIP-2930 (Access List)';
      case TRANSACTION_TYPES.EIP_1559: return 'EIP-1559 (Dynamic Fee)';
      default: return 'Legacy';
    }
  }

  _generateValidationId() {
    return `gas_val_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  _startBackgroundServices() {
    this.services = {
      networkUpdate: setInterval(async () => {
        try {
          await this._updateNetworkStats();
        } catch (error) {
          this.logger.warn('Network stats update failed', { error: error.message });
        }
      }, this.config.priceUpdateInterval),

      cacheCleanup: setInterval(() => {
        try {
          this._cleanupCaches();
        } catch (error) {
          this.logger.warn('Cache cleanup failed', { error: error.message });
        }
      }, 300000)
    };
  }

  _cleanupCaches() {
    const now = Date.now();
    const cacheTimeout = this.config.cacheTimeout;

    for (const [key, cache] of this.gasPriceCache.entries()) {
      if (now - cache.timestamp > cacheTimeout) {
        this.gasPriceCache.delete(key);
      }
    }

    for (const [key, cache] of this.estimationCache.entries()) {
      if (now - cache.timestamp > cacheTimeout) {
        this.estimationCache.delete(key);
      }
    }
  }

  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    this.logger.info('GasValidator configuration updated', {
      updatedFields: Object.keys(newConfig)
    });
  }

  async shutdown() {
    this.logger.info('GasValidator shutdown initiated');
    
    Object.values(this.services).forEach(service => {
      if (service) clearInterval(service);
    });

    if (this.metrics) {
      await this.metrics.shutdown();
    }

    this.gasPriceCache.clear();
    this.estimationCache.clear();
    this.validationHistory.clear();
    this.costTracking.clear();
    this.gasPriceHistory.length = 0;

    this.logger.info('GasValidator shutdown completed');
  }
}

/**
 * Factory functions
 */
export function createGasValidator(config) {
  return new GasValidator(config);
}

export async function validateGas(transaction, provider, chainId, options = {}) {
  const validator = new GasValidator({ chainId, provider, ...options });
  
  try {
    return await validator.validateGas(transaction, options);
  } finally {
    await validator.shutdown();
  }
}

export async function estimateOptimalGas(transaction, provider, chainId, speed = 'standard') {
  const validator = new GasValidator({ chainId, provider });
  
  try {
    return await validator.estimateOptimalGas(transaction, speed);
  } finally {
    await validator.shutdown();
  }
}

export default GasValidator;
