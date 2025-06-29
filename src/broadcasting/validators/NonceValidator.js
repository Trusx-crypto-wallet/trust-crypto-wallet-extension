/**
 * @fileoverview Enterprise-grade Nonce Validator for Trust Crypto Wallet Extension
 * @version 1.0.0
 * @author Trust Wallet Development Team
 * @license MIT
 * @description Production-ready nonce validator with advanced gap detection, prediction, and monitoring
 */

import { RPCError, RPC_ERROR_CODES } from '../providers/RPCBroadcastProvider.js';
import { SecurityManager } from '../../security/SecurityManager.js';
import { MetricsCollector } from '../../monitoring/MetricsCollector.js';
import { Logger } from '../../utils/Logger.js';

/**
 * Nonce validation error codes
 */
export const NONCE_VALIDATION_ERRORS = {
  // Basic validation errors
  INVALID_NONCE: 'NONCE_INVALID_NONCE',
  MISSING_NONCE: 'NONCE_MISSING_NONCE',
  INVALID_NONCE_FORMAT: 'NONCE_INVALID_FORMAT',
  INVALID_NONCE_TYPE: 'NONCE_INVALID_TYPE',
  
  // Value validation errors
  NEGATIVE_NONCE: 'NONCE_NEGATIVE_VALUE',
  NONCE_TOO_LARGE: 'NONCE_TOO_LARGE',
  ZERO_NONCE_INVALID: 'NONCE_ZERO_INVALID',
  
  // Sequence validation errors
  NONCE_TOO_LOW: 'NONCE_TOO_LOW',
  NONCE_TOO_HIGH: 'NONCE_TOO_HIGH',
  NONCE_GAP_DETECTED: 'NONCE_GAP_DETECTED',
  NONCE_DUPLICATE: 'NONCE_DUPLICATE',
  NONCE_OUT_OF_ORDER: 'NONCE_OUT_OF_ORDER',
  
  // State validation errors
  ACCOUNT_STATE_UNAVAILABLE: 'NONCE_ACCOUNT_STATE_UNAVAILABLE',
  PROVIDER_ERROR: 'NONCE_PROVIDER_ERROR',
  NETWORK_ERROR: 'NONCE_NETWORK_ERROR',
  STALE_NONCE_DATA: 'NONCE_STALE_DATA',
  
  // Security validation errors
  SUSPICIOUS_NONCE_PATTERN: 'NONCE_SUSPICIOUS_PATTERN',
  NONCE_REPLAY_ATTACK: 'NONCE_REPLAY_ATTACK',
  HIGH_FREQUENCY_NONCE: 'NONCE_HIGH_FREQUENCY',
  UNUSUAL_NONCE_JUMP: 'NONCE_UNUSUAL_JUMP',
  
  // Business logic errors
  NONCE_PREDICTION_FAILED: 'NONCE_PREDICTION_FAILED',
  NONCE_CACHE_ERROR: 'NONCE_CACHE_ERROR',
  RATE_LIMIT_EXCEEDED: 'NONCE_RATE_LIMIT_EXCEEDED',
  MAINTENANCE_MODE: 'NONCE_MAINTENANCE_MODE'
};

/**
 * Nonce validation strategies
 */
export const NONCE_STRATEGIES = {
  STRICT: 'strict',           // Must be exactly next expected nonce
  OPTIMISTIC: 'optimistic',   // Allow reasonable gaps for parallel processing
  PERMISSIVE: 'permissive',   // Allow larger gaps with warnings
  PREDICTIVE: 'predictive'    // Use AI/ML for nonce prediction
};

/**
 * Network-specific nonce configurations
 */
export const NONCE_NETWORK_CONFIGS = {
  1: { // Ethereum
    name: 'ethereum',
    maxNonceGap: 50,
    maxPendingNonces: 100,
    nonceTimeout: 300000, // 5 minutes
    blockConfirmations: 12,
    avgBlockTime: 12000,
    maxNonceJump: 1000,
    enableNoncePrediction: true
  },
  56: { // BSC
    name: 'bsc',
    maxNonceGap: 25,
    maxPendingNonces: 50,
    nonceTimeout: 180000, // 3 minutes
    blockConfirmations: 3,
    avgBlockTime: 3000,
    maxNonceJump: 500,
    enableNoncePrediction: true
  },
  137: { // Polygon
    name: 'polygon',
    maxNonceGap: 20,
    maxPendingNonces: 40,
    nonceTimeout: 120000, // 2 minutes
    blockConfirmations: 5,
    avgBlockTime: 2000,
    maxNonceJump: 300,
    enableNoncePrediction: true
  },
  42161: { // Arbitrum
    name: 'arbitrum',
    maxNonceGap: 100,
    maxPendingNonces: 200,
    nonceTimeout: 600000, // 10 minutes
    blockConfirmations: 1,
    avgBlockTime: 1000,
    maxNonceJump: 2000,
    enableNoncePrediction: false // Too fast for prediction
  }
};

/**
 * Enterprise-grade Nonce Validator
 * @class NonceValidator
 */
export class NonceValidator {
  /**
   * @param {Object} config - Validator configuration
   * @param {number} config.chainId - Network chain ID
   * @param {Object} config.provider - RPC provider instance
   * @param {string} [config.strategy] - Validation strategy
   * @param {Object} [config.cache] - Cache configuration
   * @param {Object} [config.security] - Security configuration
   * @param {Object} [config.monitoring] - Monitoring configuration
   * @param {Object} [config.limits] - Rate limiting configuration
   */
  constructor({
    chainId,
    provider,
    strategy = NONCE_STRATEGIES.OPTIMISTIC,
    cache = {},
    security = {},
    monitoring = {},
    limits = {}
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
    this.networkConfig = NONCE_NETWORK_CONFIGS[chainId];
    
    if (!this.networkConfig) {
      throw new Error(`Unsupported chain ID: ${chainId}`);
    }

    // Initialize components
    this.logger = new Logger('NonceValidator');
    this.securityManager = new SecurityManager({
      enableNonceAnalysis: true,
      enablePatternDetection: true,
      enableReplayDetection: true,
      ...security
    });
    
    this.metrics = new MetricsCollector({
      component: 'nonce_validator',
      labels: { chainId: this.chainId, network: this.networkConfig.name },
      ...monitoring
    });

    // Configuration with defaults
    this.config = {
      // Validation strategy
      strategy: this.strategy,
      
      // Gap tolerance
      maxNonceGap: this.networkConfig.maxNonceGap,
      maxPendingNonces: this.networkConfig.maxPendingNonces,
      maxNonceJump: this.networkConfig.maxNonceJump,
      
      // Timing configuration
      nonceTimeout: this.networkConfig.nonceTimeout,
      cacheTimeout: 60000, // 1 minute
      refreshInterval: 30000, // 30 seconds
      
      // Security settings
      enableSecurityChecks: true,
      enableReplayDetection: true,
      enablePatternAnalysis: true,
      detectSuspiciousJumps: true,
      
      // Performance settings
      enableCaching: true,
      enablePrediction: this.networkConfig.enableNoncePrediction,
      enableParallelProcessing: true,
      
      // Rate limiting
      maxValidationsPerSecond: 100,
      maxValidationsPerMinute: 1000,
      
      // Cache configuration
      cacheSize: 10000,
      cacheTTL: cache.ttl || 300000, // 5 minutes
      enablePersistentCache: false,
      
      // Merge with provided configuration
      ...limits
    };

    // Initialize data structures
    this.nonceCache = new Map(); // address -> nonce data
    this.pendingNonces = new Map(); // address -> Set of pending nonces
    this.nonceHistory = new Map(); // address -> historical nonce data
    this.validationHistory = new Map(); // validation tracking
    this.suspiciousAddresses = new Set();

    // Performance tracking
    this.startTime = Date.now();
    this.lastCacheCleanup = Date.now();
    
    // Start background services
    this._startBackgroundServices();

    this.logger.info('NonceValidator initialized', {
      chainId: this.chainId,
      network: this.networkConfig.name,
      strategy: this.strategy,
      config: this._sanitizeConfig(this.config)
    });
  }

  /**
   * Main validation method - validates transaction nonce
   * @param {Object} transaction - Transaction object with nonce
   * @param {Object} [options] - Validation options
   * @returns {Promise<Object>} Validation result
   */
  async validateNonce(transaction, options = {}) {
    const startTime = Date.now();
    const validationId = this._generateValidationId();

    try {
      this.logger.debug('Starting nonce validation', {
        validationId,
        from: this._maskAddress(transaction.from),
        nonce: transaction.nonce,
        strategy: this.strategy
      });

      // Increment validation counter
      this.metrics.increment('validations_total');

      // Pre-validation checks
      await this._preValidationChecks(transaction, options);

      // Extract and normalize nonce
      const nonce = this._extractAndNormalizeNonce(transaction);

      // Get current account state
      const accountState = await this._getAccountState(transaction.from, options);

      // Perform validation based on strategy
      const validationResult = await this._performNonceValidation(
        transaction.from,
        nonce,
        accountState,
        options
      );

      // Security analysis
      await this._performSecurityAnalysis(transaction.from, nonce, accountState, options);

      // Update tracking data
      await this._updateTrackingData(transaction.from, nonce, validationResult);

      // Create result
      const result = {
        valid: true,
        validationId,
        timestamp: new Date().toISOString(),
        chainId: this.chainId,
        network: this.networkConfig.name,
        strategy: this.strategy,
        validationTime: Date.now() - startTime,
        nonce: {
          provided: nonce.toString(),
          expected: accountState.expectedNonce?.toString(),
          current: accountState.currentNonce?.toString(),
          pending: accountState.pendingCount || 0
        },
        validation: validationResult,
        warnings: this._extractWarnings(validationResult),
        metadata: {
          validator: 'NonceValidator',
          version: '1.0.0',
          accountAddress: this._maskAddress(transaction.from)
        }
      };

      // Record success metrics
      this.metrics.increment('validations_successful');
      this.metrics.recordTiming('validation_duration', result.validationTime);

      this.logger.info('Nonce validation completed successfully', {
        validationId,
        validationTime: result.validationTime,
        nonce: nonce.toString(),
        expected: accountState.expectedNonce?.toString(),
        warnings: result.warnings.length
      });

      return result;

    } catch (error) {
      const validationTime = Date.now() - startTime;
      
      // Record failure metrics
      this.metrics.increment('validations_failed');
      this.metrics.increment('validation_errors', { errorType: error.code || 'unknown' });

      this.logger.error('Nonce validation failed', {
        validationId,
        error: error.message,
        errorCode: error.code,
        validationTime,
        from: this._maskAddress(transaction?.from),
        nonce: transaction?.nonce
      });

      throw new RPCError(
        `Nonce validation failed: ${error.message}`,
        error.code || NONCE_VALIDATION_ERRORS.INVALID_NONCE,
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
   * @private
   */
  async _preValidationChecks(transaction, options) {
    // Check transaction object
    if (!transaction || typeof transaction !== 'object') {
      throw new RPCError(
        'Transaction object is required',
        NONCE_VALIDATION_ERRORS.INVALID_NONCE
      );
    }

    // Check from address
    if (!transaction.from || typeof transaction.from !== 'string') {
      throw new RPCError(
        'Transaction from address is required',
        NONCE_VALIDATION_ERRORS.INVALID_NONCE
      );
    }

    // Check maintenance mode
    if (options.maintenanceMode) {
      throw new RPCError(
        'Nonce validation unavailable during maintenance',
        NONCE_VALIDATION_ERRORS.MAINTENANCE_MODE
      );
    }

    // Check rate limiting
    await this._checkRateLimits(transaction.from);
  }

  /**
   * Extracts and normalizes nonce from transaction
   * @private
   */
  _extractAndNormalizeNonce(transaction) {
    const nonce = transaction.nonce;

    // Check if nonce is provided
    if (nonce === undefined || nonce === null) {
      throw new RPCError(
        'Transaction nonce is required',
        NONCE_VALIDATION_ERRORS.MISSING_NONCE
      );
    }

    // Convert to BigInt for precise handling
    let nonceBigInt;
    try {
      if (typeof nonce === 'string') {
        // Handle hex strings
        if (nonce.startsWith('0x')) {
          nonceBigInt = BigInt(nonce);
        } else {
          nonceBigInt = BigInt(nonce);
        }
      } else if (typeof nonce === 'number') {
        nonceBigInt = BigInt(nonce);
      } else {
        throw new Error('Invalid nonce type');
      }
    } catch (error) {
      throw new RPCError(
        `Invalid nonce format: ${error.message}`,
        NONCE_VALIDATION_ERRORS.INVALID_NONCE_FORMAT,
        { nonce, type: typeof nonce }
      );
    }

    // Basic validation
    if (nonceBigInt < 0n) {
      throw new RPCError(
        'Nonce cannot be negative',
        NONCE_VALIDATION_ERRORS.NEGATIVE_NONCE,
        { nonce: nonceBigInt.toString() }
      );
    }

    // Check maximum reasonable nonce
    const maxNonce = BigInt('0xffffffffffffffff'); // 64-bit max
    if (nonceBigInt > maxNonce) {
      throw new RPCError(
        'Nonce exceeds maximum value',
        NONCE_VALIDATION_ERRORS.NONCE_TOO_LARGE,
        { 
          nonce: nonceBigInt.toString(),
          maximum: maxNonce.toString()
        }
      );
    }

    return nonceBigInt;
  }

  /**
   * Gets current account state including nonce information
   * @private
   */
  async _getAccountState(address, options = {}) {
    const cacheKey = address.toLowerCase();
    const now = Date.now();

    // Check cache first
    if (this.config.enableCaching && this.nonceCache.has(cacheKey)) {
      const cached = this.nonceCache.get(cacheKey);
      if (now - cached.timestamp < this.config.cacheTimeout && !options.forceRefresh) {
        this.metrics.increment('cache_hits');
        return cached.data;
      }
    }

    try {
      // Fetch current nonce from provider
      const currentNonce = await this._fetchCurrentNonce(address);
      
      // Get pending transaction count
      const pendingNonce = await this._fetchPendingNonce(address);
      
      // Calculate expected nonce
      const expectedNonce = pendingNonce || currentNonce;
      
      // Get pending nonces from our tracking
      const pendingSet = this.pendingNonces.get(cacheKey) || new Set();
      const pendingCount = pendingSet.size;

      const accountState = {
        address: address.toLowerCase(),
        currentNonce,
        pendingNonce,
        expectedNonce,
        pendingCount,
        lastUpdate: now,
        source: 'provider'
      };

      // Cache the result
      if (this.config.enableCaching) {
        this.nonceCache.set(cacheKey, {
          data: accountState,
          timestamp: now
        });
        this.metrics.increment('cache_misses');
      }

      return accountState;

    } catch (error) {
      this.logger.error('Failed to get account state', {
        address: this._maskAddress(address),
        error: error.message
      });

      throw new RPCError(
        'Unable to retrieve account nonce state',
        NONCE_VALIDATION_ERRORS.ACCOUNT_STATE_UNAVAILABLE,
        { originalError: error, address: this._maskAddress(address) }
      );
    }
  }

  /**
   * Fetches current nonce from provider
   * @private
   */
  async _fetchCurrentNonce(address) {
    try {
      const result = await this.provider._makeRequest({
        method: 'eth_getTransactionCount',
        params: [address, 'latest']
      });
      return BigInt(result);
    } catch (error) {
      throw new RPCError(
        'Failed to fetch current nonce',
        NONCE_VALIDATION_ERRORS.PROVIDER_ERROR,
        { originalError: error }
      );
    }
  }

  /**
   * Fetches pending nonce from provider
   * @private
   */
  async _fetchPendingNonce(address) {
    try {
      const result = await this.provider._makeRequest({
        method: 'eth_getTransactionCount',
        params: [address, 'pending']
      });
      return BigInt(result);
    } catch (error) {
      // Fallback to latest if pending fails
      this.logger.warn('Failed to fetch pending nonce, using latest', {
        address: this._maskAddress(address),
        error: error.message
      });
      return await this._fetchCurrentNonce(address);
    }
  }

  /**
   * Performs nonce validation based on strategy
   * @private
   */
  async _performNonceValidation(address, nonce, accountState, options) {
    const strategy = options.strategy || this.strategy;
    
    switch (strategy) {
      case NONCE_STRATEGIES.STRICT:
        return await this._validateStrict(address, nonce, accountState);
      
      case NONCE_STRATEGIES.OPTIMISTIC:
        return await this._validateOptimistic(address, nonce, accountState);
      
      case NONCE_STRATEGIES.PERMISSIVE:
        return await this._validatePermissive(address, nonce, accountState);
      
      case NONCE_STRATEGIES.PREDICTIVE:
        return await this._validatePredictive(address, nonce, accountState);
      
      default:
        throw new RPCError(
          `Unknown validation strategy: ${strategy}`,
          NONCE_VALIDATION_ERRORS.INVALID_NONCE,
          { strategy }
        );
    }
  }

  /**
   * Strict validation - nonce must be exactly expected
   * @private
   */
  async _validateStrict(address, nonce, accountState) {
    const expected = accountState.expectedNonce;
    
    if (nonce !== expected) {
      if (nonce < expected) {
        throw new RPCError(
          'Nonce too low for strict validation',
          NONCE_VALIDATION_ERRORS.NONCE_TOO_LOW,
          {
            provided: nonce.toString(),
            expected: expected.toString(),
            difference: (expected - nonce).toString()
          }
        );
      } else {
        throw new RPCError(
          'Nonce too high for strict validation',
          NONCE_VALIDATION_ERRORS.NONCE_TOO_HIGH,
          {
            provided: nonce.toString(),
            expected: expected.toString(),
            difference: (nonce - expected).toString()
          }
        );
      }
    }

    return {
      status: 'valid',
      strategy: 'strict',
      message: 'Nonce matches expected value exactly',
      expectedNonce: expected.toString(),
      providedNonce: nonce.toString()
    };
  }

  /**
   * Optimistic validation - allows reasonable gaps
   * @private
   */
  async _validateOptimistic(address, nonce, accountState) {
    const expected = accountState.expectedNonce;
    const gap = nonce - expected;

    // Check if nonce is too low
    if (nonce < accountState.currentNonce) {
      throw new RPCError(
        'Nonce too low - transaction would be rejected',
        NONCE_VALIDATION_ERRORS.NONCE_TOO_LOW,
        {
          provided: nonce.toString(),
          current: accountState.currentNonce.toString(),
          expected: expected.toString()
        }
      );
    }

    // Check for reasonable gaps
    if (gap > this.config.maxNonceGap) {
      throw new RPCError(
        'Nonce gap too large for optimistic validation',
        NONCE_VALIDATION_ERRORS.NONCE_GAP_DETECTED,
        {
          provided: nonce.toString(),
          expected: expected.toString(),
          gap: gap.toString(),
          maxGap: this.config.maxNonceGap
        }
      );
    }

    // Check for duplicate nonce
    if (await this._isDuplicateNonce(address, nonce)) {
      throw new RPCError(
        'Duplicate nonce detected',
        NONCE_VALIDATION_ERRORS.NONCE_DUPLICATE,
        { nonce: nonce.toString() }
      );
    }

    const result = {
      status: 'valid',
      strategy: 'optimistic',
      expectedNonce: expected.toString(),
      providedNonce: nonce.toString(),
      gap: gap.toString()
    };

    if (gap > 0) {
      result.status = 'warning';
      result.message = `Nonce gap detected: ${gap}`;
      result.warnings = [`Gap of ${gap} nonces detected`];
    } else {
      result.message = 'Nonce is valid for optimistic validation';
    }

    return result;
  }

  /**
   * Permissive validation - allows larger gaps with warnings
   * @private
   */
  async _validatePermissive(address, nonce, accountState) {
    const expected = accountState.expectedNonce;
    const gap = nonce - expected;

    // Still reject if too low
    if (nonce < accountState.currentNonce) {
      throw new RPCError(
        'Nonce too low - transaction would be rejected',
        NONCE_VALIDATION_ERRORS.NONCE_TOO_LOW,
        {
          provided: nonce.toString(),
          current: accountState.currentNonce.toString()
        }
      );
    }

    // Check for extremely large jumps
    if (gap > this.config.maxNonceJump) {
      throw new RPCError(
        'Nonce jump too large even for permissive validation',
        NONCE_VALIDATION_ERRORS.UNUSUAL_NONCE_JUMP,
        {
          provided: nonce.toString(),
          expected: expected.toString(),
          jump: gap.toString(),
          maxJump: this.config.maxNonceJump
        }
      );
    }

    const warnings = [];
    let status = 'valid';

    if (gap > this.config.maxNonceGap) {
      status = 'warning';
      warnings.push(`Large nonce gap detected: ${gap}`);
    }

    if (gap > this.config.maxNonceGap * 2) {
      warnings.push('Unusually large nonce gap - verify transaction order');
    }

    return {
      status,
      strategy: 'permissive',
      message: status === 'valid' ? 'Nonce is valid for permissive validation' : 'Nonce valid with warnings',
      expectedNonce: expected.toString(),
      providedNonce: nonce.toString(),
      gap: gap.toString(),
      warnings
    };
  }

  /**
   * Predictive validation - uses ML/AI for nonce prediction
   * @private
   */
  async _validatePredictive(address, nonce, accountState) {
    if (!this.config.enablePrediction) {
      // Fallback to optimistic validation
      return await this._validateOptimistic(address, nonce, accountState);
    }

    try {
      // Get historical nonce patterns
      const history = await this._getNonceHistory(address);
      
      // Predict next likely nonces
      const predictions = await this._predictNextNonces(address, history, accountState);
      
      // Check if provided nonce matches predictions
      const confidence = this._calculatePredictionConfidence(nonce, predictions);
      
      if (confidence > 0.8) {
        return {
          status: 'valid',
          strategy: 'predictive',
          message: 'Nonce matches prediction with high confidence',
          expectedNonce: accountState.expectedNonce.toString(),
          providedNonce: nonce.toString(),
          confidence,
          predictions: predictions.map(p => p.toString())
        };
      } else if (confidence > 0.5) {
        return {
          status: 'warning',
          strategy: 'predictive',
          message: 'Nonce matches prediction with medium confidence',
          expectedNonce: accountState.expectedNonce.toString(),
          providedNonce: nonce.toString(),
          confidence,
          warnings: ['Medium confidence prediction match']
        };
      } else {
        // Fallback validation for low confidence
        return await this._validateOptimistic(address, nonce, accountState);
      }

    } catch (error) {
      this.logger.warn('Predictive validation failed, falling back to optimistic', {
        address: this._maskAddress(address),
        error: error.message
      });
      
      return await this._validateOptimistic(address, nonce, accountState);
    }
  }

  /**
   * Performs security analysis on nonce patterns
   * @private
   */
  async _performSecurityAnalysis(address, nonce, accountState, options) {
    if (!this.config.enableSecurityChecks) {
      return;
    }

    const addressKey = address.toLowerCase();
    
    // Check for suspicious patterns
    await this._detectSuspiciousPatterns(address, nonce, accountState);
    
    // Check for replay attacks
    if (this.config.enableReplayDetection) {
      await this._detectReplayAttacks(address, nonce);
    }
    
    // Check for high-frequency nonce usage
    await this._detectHighFrequencyUsage(address, nonce);
    
    // Check for unusual nonce jumps
    if (this.config.detectSuspiciousJumps) {
      await this._detectUnusualJumps(address, nonce, accountState);
    }
  }

  /**
   * Detects suspicious nonce patterns
   * @private
   */
  async _detectSuspiciousPatterns(address, nonce, accountState) {
    const addressKey = address.toLowerCase();
    
    // Get recent nonce history
    const history = this.nonceHistory.get(addressKey) || [];
    const recentHistory = history.slice(-10); // Last 10 nonces

    // Pattern 1: Sequential exact increments (potential bot)
    if (recentHistory.length >= 5) {
      const isSequential = recentHistory.every((entry, index) => {
        if (index === 0) return true;
        return BigInt(entry.nonce) === BigInt(recentHistory[index - 1].nonce) + 1n;
      });

      if (isSequential) {
        this.suspiciousAddresses.add(addressKey);
        this.logger.warn('Suspicious sequential nonce pattern detected', {
          address: this._maskAddress(address),
          pattern: 'sequential_increment'
        });
      }
    }

    // Pattern 2: Repeated round numbers
    const nonceStr = nonce.toString();
    if (/^[1-9]0+$/.test(nonceStr) && nonceStr.length > 2) {
      this.logger.warn('Round number nonce detected', {
        address: this._maskAddress(address),
        nonce: nonceStr
      });
    }

    // Pattern 3: Rapid nonce progression
    if (recentHistory.length >= 3) {
      const timeSpan = Date.now() - recentHistory[0].timestamp;
      const nonceSpan = Number(nonce) - Number(recentHistory[0].nonce);
      
      if (timeSpan < 60000 && nonceSpan > 20) { // 20 nonces in 1 minute
        throw new RPCError(
          'Suspicious rapid nonce progression detected',
          NONCE_VALIDATION_ERRORS.SUSPICIOUS_NONCE_PATTERN,
          {
            timeSpan,
            nonceSpan,
            pattern: 'rapid_progression'
          }
        );
      }
    }
  }

  /**
   * Detects potential replay attacks
   * @private
   */
  async _detectReplayAttacks(address, nonce) {
    const addressKey = address.toLowerCase();
    const history = this.nonceHistory.get(addressKey) || [];
    
    // Check if nonce was used recently
    const recentUsage = history.find(entry => 
      BigInt(entry.nonce) === nonce && 
      Date.now() - entry.timestamp < 300000 // 5 minutes
    );

    if (recentUsage) {
      throw new RPCError(
        'Potential replay attack: nonce used recently',
        NONCE_VALIDATION_ERRORS.NONCE_REPLAY_ATTACK,
        {
          nonce: nonce.toString(),
          lastUsed: recentUsage.timestamp,
          timeSinceLastUse: Date.now() - recentUsage.timestamp
        }
      );
    }
  }

  /**
   * Detects high-frequency nonce usage
   * @private
   */
  async _detectHighFrequencyUsage(address, nonce) {
    const addressKey = address.toLowerCase();
    const now = Date.now();
    
    if (!this.validationHistory.has(addressKey)) {
      this.validationHistory.set(addressKey, []);
    }

    const validations = this.validationHistory.get(addressKey);
    
    // Clean old validations
    const re
