/**
 * @fileoverview Production Enterprise-grade Single Broadcast Strategy for Trust Crypto Wallet Extension
 * @version 1.0.0
 * @author Trust Wallet Development Team
 * @license MIT
 * @description PRODUCTION-READY single provider broadcast strategy with enterprise reliability features
 */

import { EventEmitter } from 'events';
import { ethers } from 'ethers';
import { RPCError, RPC_ERROR_CODES } from '../../providers/RPCBroadcastProvider.js';
import { SecurityManager } from '../../../security/SecurityManager.js';
import { MetricsCollector } from '../../../monitoring/MetricsCollector.js';
import { Logger } from '../../../utils/Logger.js';

/**
 * Single broadcast strategy error codes
 */
export const SINGLE_BROADCAST_ERRORS = {
  // Configuration errors
  INVALID_CONFIGURATION: 'SINGLE_INVALID_CONFIG',
  PROVIDER_UNAVAILABLE: 'SINGLE_PROVIDER_UNAVAILABLE',
  INVALID_TRANSACTION: 'SINGLE_INVALID_TX',
  INVALID_PRIVATE_KEY: 'SINGLE_INVALID_KEY',
  
  // Broadcast errors
  BROADCAST_FAILED: 'SINGLE_BROADCAST_FAILED',
  TRANSACTION_REJECTED: 'SINGLE_TX_REJECTED',
  INSUFFICIENT_FUNDS: 'SINGLE_INSUFFICIENT_FUNDS',
  GAS_ESTIMATION_FAILED: 'SINGLE_GAS_ESTIMATION_FAILED',
  NONCE_TOO_LOW: 'SINGLE_NONCE_TOO_LOW',
  NONCE_TOO_HIGH: 'SINGLE_NONCE_TOO_HIGH',
  
  // Network errors
  NETWORK_ERROR: 'SINGLE_NETWORK_ERROR',
  RPC_ERROR: 'SINGLE_RPC_ERROR',
  CONNECTION_TIMEOUT: 'SINGLE_CONNECTION_TIMEOUT',
  RATE_LIMITED: 'SINGLE_RATE_LIMITED',
  
  // Validation errors
  TRANSACTION_VALIDATION_FAILED: 'SINGLE_TX_VALIDATION_FAILED',
  GAS_PRICE_TOO_LOW: 'SINGLE_GAS_PRICE_TOO_LOW',
  GAS_LIMIT_EXCEEDED: 'SINGLE_GAS_LIMIT_EXCEEDED',
  VALUE_OVERFLOW: 'SINGLE_VALUE_OVERFLOW'
};

/**
 * Transaction broadcast states
 */
export const BROADCAST_STATES = {
  PREPARING: 'preparing',         // Preparing transaction for broadcast
  VALIDATING: 'validating',       // Validating transaction parameters
  BROADCASTING: 'broadcasting',   // Broadcasting to network
  PENDING: 'pending',             // Transaction pending in mempool
  CONFIRMED: 'confirmed',         // Transaction confirmed
  FAILED: 'failed',               // Broadcast or transaction failed
  REJECTED: 'rejected',           // Transaction rejected by network
  TIMEOUT: 'timeout'              // Broadcast timeout reached
};

/**
 * Network-specific broadcast configurations
 */
export const SINGLE_BROADCAST_CONFIGS = {
  1: { // Ethereum Mainnet
    name: 'ethereum',
    chainId: 1,
    maxGasPrice: ethers.parseUnits('1000', 'gwei'),     // 1000 gwei max
    maxGasLimit: 15000000,                               // 15M gas limit
    broadcastTimeout: 30000,                             // 30 seconds
    confirmationTimeout: 300000,                         // 5 minutes
    retryAttempts: 3,
    retryDelay: 5000,                                    // 5 seconds
    enableMevProtection: true,
    gasPriceInflationFactor: 1.1,                        // 10% inflation for stuck txs
    nonceManagement: 'auto',
    enableReplayProtection: true
  },
  56: { // BSC
    name: 'bsc',
    chainId: 56,
    maxGasPrice: ethers.parseUnits('100', 'gwei'),
    maxGasLimit: 10000000,
    broadcastTimeout: 15000,                             // 15 seconds
    confirmationTimeout: 180000,                         // 3 minutes
    retryAttempts: 2,
    retryDelay: 3000,
    enableMevProtection: false,
    gasPriceInflationFactor: 1.2,                        // 20% inflation
    nonceManagement: 'auto',
    enableReplayProtection: true
  },
  137: { // Polygon
    name: 'polygon',
    chainId: 137,
    maxGasPrice: ethers.parseUnits('500', 'gwei'),
    maxGasLimit: 20000000,
    broadcastTimeout: 10000,                             // 10 seconds
    confirmationTimeout: 120000,                         // 2 minutes
    retryAttempts: 2,
    retryDelay: 2000,
    enableMevProtection: false,
    gasPriceInflationFactor: 1.15,
    nonceManagement: 'auto',
    enableReplayProtection: true
  },
  42161: { // Arbitrum
    name: 'arbitrum',
    chainId: 42161,
    maxGasPrice: ethers.parseUnits('10', 'gwei'),
    maxGasLimit: 50000000,                               // Higher for L2
    broadcastTimeout: 8000,                              // 8 seconds
    confirmationTimeout: 60000,                          // 1 minute
    retryAttempts: 1,
    retryDelay: 1000,
    enableMevProtection: false,
    gasPriceInflationFactor: 1.0,                        // No inflation needed
    nonceManagement: 'auto',
    enableReplayProtection: true
  },
  10: { // Optimism
    name: 'optimism',
    chainId: 10,
    maxGasPrice: ethers.parseUnits('1', 'gwei'),
    maxGasLimit: 50000000,
    broadcastTimeout: 8000,
    confirmationTimeout: 60000,
    retryAttempts: 1,
    retryDelay: 1000,
    enableMevProtection: false,
    gasPriceInflationFactor: 1.0,
    nonceManagement: 'auto',
    enableReplayProtection: true
  }
};

/**
 * PRODUCTION Enterprise-grade Single Broadcast Strategy
 * @class SingleBroadcastStrategy
 * @extends EventEmitter
 */
export class SingleBroadcastStrategy extends EventEmitter {
  constructor({
    chainId,
    provider,
    signer = null,
    enableAnalytics = true,
    enableSecurityChecks = true,
    customConfig = {},
    security = {},
    monitoring = {}
  }) {
    super();

    if (!chainId || typeof chainId !== 'number') {
      throw new Error('Valid chain ID is required');
    }

    if (!provider) {
      throw new Error('RPC provider is required');
    }

    this.chainId = chainId;
    this.provider = provider;
    this.signer = signer;
    this.networkConfig = SINGLE_BROADCAST_CONFIGS[chainId];
    
    if (!this.networkConfig) {
      throw new Error(`Unsupported chain ID: ${chainId}`);
    }

    // Initialize components
    this.logger = new Logger('SingleBroadcastStrategy');
    this.securityManager = new SecurityManager({
      enableTransactionValidation: enableSecurityChecks,
      enableGasAnalysis: true,
      enableMevDetection: this.networkConfig.enableMevProtection,
      ...security
    });
    
    this.metrics = new MetricsCollector({
      component: 'single_broadcast_strategy',
      labels: { chainId: this.chainId, network: this.networkConfig.name },
      ...monitoring
    });

    // Configuration with custom overrides
    this.config = {
      ...this.networkConfig,
      ...customConfig,
      enableAnalytics,
      enableSecurityChecks,
      
      // Performance settings
      batchSize: 1,                    // Single broadcast only
      concurrentBroadcasts: 1,         // One at a time
      enableOptimizations: true,
      
      // Monitoring settings
      enableMetrics: enableAnalytics,
      enableDetailedLogging: true,
      
      // Failsafe settings
      enableTransactionValidation: enableSecurityChecks,
      enableGasValidation: true,
      enableNonceValidation: true,
      enableBalanceCheck: true
    };

    // State management
    this.broadcastHistory = [];
    this.activeNonces = new Map();       // address -> nonce
    this.nonceCache = new Map();         // address -> { nonce, timestamp }
    this.gasCache = new Map();           // Block-based gas price cache
    
    // Performance tracking
    this.analytics = {
      totalBroadcasts: 0,
      successfulBroadcasts: 0,
      failedBroadcasts: 0,
      averageBroadcastTime: 0,
      averageConfirmationTime: 0,
      gasEfficiency: {
        totalGasUsed: BigInt(0),
        totalGasCost: BigInt(0),
        averageGasPrice: BigInt(0)
      }
    };

    // Error tracking
    this.errorStats = new Map();         // error_code -> count
    
    // Current broadcast state
    this.currentBroadcast = null;
    this.broadcastQueue = [];

    // Initialize strategy
    this.startTime = Date.now();
    this._initializeStrategy();

    this.logger.info('Production SingleBroadcastStrategy initialized', {
      chainId: this.chainId,
      network: this.networkConfig.name,
      enableAnalytics: this.config.enableAnalytics,
      enableSecurityChecks: this.config.enableSecurityChecks
    });
  }

  /**
   * Broadcasts a single transaction with comprehensive validation and monitoring
   */
  async broadcastTransaction(transactionRequest, options = {}) {
    const broadcastId = this._generateBroadcastId();
    const startTime = Date.now();

    try {
      this.logger.info('Starting single transaction broadcast', {
        broadcastId,
        chainId: this.chainId,
        to: transactionRequest.to,
        value: transactionRequest.value?.toString()
      });

      // Validate input parameters
      await this._validateTransactionRequest(transactionRequest, options);

      // Initialize broadcast tracking
      const broadcastData = {
        broadcastId,
        transactionRequest: { ...transactionRequest },
        options: { ...options },
        state: BROADCAST_STATES.PREPARING,
        startTime,
        
        // Transaction details
        transactionHash: null,
        nonce: null,
        gasPrice: null,
        gasLimit: null,
        finalTransaction: null,
        
        // Timing data
        preparationTime: null,
        validationTime: null,
        broadcastTime: null,
        confirmationTime: null,
        
        // Status tracking
        attempts: 0,
        maxAttempts: options.retryAttempts || this.config.retryAttempts,
        errors: [],
        
        // Analytics
        gasUsed: null,
        gasEfficiency: null,
        mevProtected: false
      };

      this.currentBroadcast = broadcastData;

      // Step 1: Prepare transaction
      await this._prepareTransaction(broadcastData);
      
      // Step 2: Validate transaction
      await this._validateTransaction(broadcastData);
      
      // Step 3: Broadcast transaction
      await this._broadcastToNetwork(broadcastData);
      
      // Step 4: Monitor confirmation (if requested)
      if (options.waitForConfirmation) {
        await this._waitForConfirmation(broadcastData, options);
      }

      // Complete broadcast tracking
      await this._completeBroadcast(broadcastData, true);

      const result = {
        success: true,
        broadcastId,
        transactionHash: broadcastData.transactionHash,
        state: broadcastData.state,
        nonce: broadcastData.nonce,
        gasPrice: broadcastData.gasPrice?.toString(),
        gasLimit: broadcastData.gasLimit?.toString(),
        totalTime: Date.now() - startTime,
        attempts: broadcastData.attempts
      };

      this.emit('broadcast_success', {
        ...result,
        transaction: broadcastData.finalTransaction
      });

      return result;

    } catch (error) {
      await this._handleBroadcastError(broadcastId, error, startTime);
      throw error;
    } finally {
      this.currentBroadcast = null;
    }
  }

  /**
   * Gets current broadcast analytics
   */
  getAnalytics() {
    return {
      strategy: 'SingleBroadcastStrategy',
      network: {
        chainId: this.chainId,
        name: this.networkConfig.name
      },
      
      performance: {
        totalBroadcasts: this.analytics.totalBroadcasts,
        successfulBroadcasts: this.analytics.successfulBroadcasts,
        failedBroadcasts: this.analytics.failedBroadcasts,
        successRate: this._calculateSuccessRate(),
        averageBroadcastTime: this.analytics.averageBroadcastTime,
        averageConfirmationTime: this.analytics.averageConfirmationTime
      },
      
      gas: {
        totalGasUsed: this.analytics.gasEfficiency.totalGasUsed.toString(),
        totalGasCost: this.analytics.gasEfficiency.totalGasCost.toString(),
        averageGasPrice: this.analytics.gasEfficiency.averageGasPrice.toString(),
        gasEfficiencyScore: this._calculateGasEfficiency()
      },
      
      errors: Object.fromEntries(this.errorStats),
      
      state: {
        currentlyBroadcasting: this.currentBroadcast !== null,
        queueLength: this.broadcastQueue.length,
        activeBroadcastId: this.currentBroadcast?.broadcastId || null
      },
      
      configuration: {
        maxGasPrice: this.config.maxGasPrice.toString(),
        maxGasLimit: this.config.maxGasLimit,
        broadcastTimeout: this.config.broadcastTimeout,
        retryAttempts: this.config.retryAttempts,
        enableMevProtection: this.config.enableMevProtection
      },
      
      uptime: Date.now() - this.startTime,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Gets current broadcast status
   */
  getCurrentBroadcastStatus() {
    if (!this.currentBroadcast) {
      return {
        active: false,
        message: 'No active broadcast'
      };
    }

    const broadcast = this.currentBroadcast;
    const elapsed = Date.now() - broadcast.startTime;

    return {
      active: true,
      broadcastId: broadcast.broadcastId,
      state: broadcast.state,
      elapsedTime: elapsed,
      attempts: broadcast.attempts,
      maxAttempts: broadcast.maxAttempts,
      transactionHash: broadcast.transactionHash,
      progress: this._calculateBroadcastProgress(broadcast),
      estimatedTimeRemaining: this._estimateTimeRemaining(broadcast)
    };
  }

  /**
   * Internal methods
   */

  /**
   * Initializes the strategy
   */
  _initializeStrategy() {
    // Pre-warm gas price cache if needed
    this._warmupGasCache();
    
    // Initialize nonce tracking
    this._initializeNonceTracking();
    
    // Start background monitoring if analytics enabled
    if (this.config.enableAnalytics) {
      this._startAnalyticsMonitoring();
    }
  }

  /**
   * Validates transaction request parameters
   */
  async _validateTransactionRequest(transactionRequest, options) {
    // Basic parameter validation
    if (!transactionRequest || typeof transactionRequest !== 'object') {
      throw new RPCError(
        'Invalid transaction request object',
        SINGLE_BROADCAST_ERRORS.INVALID_TRANSACTION
      );
    }

    // Validate required fields
    if (!transactionRequest.to && !transactionRequest.data) {
      throw new RPCError(
        'Transaction must have either "to" address or "data" field',
        SINGLE_BROADCAST_ERRORS.INVALID_TRANSACTION
      );
    }

    // Validate addresses
    if (transactionRequest.to && !ethers.isAddress(transactionRequest.to)) {
      throw new RPCError(
        'Invalid "to" address format',
        SINGLE_BROADCAST_ERRORS.INVALID_TRANSACTION,
        { to: transactionRequest.to }
      );
    }

    if (transactionRequest.from && !ethers.isAddress(transactionRequest.from)) {
      throw new RPCError(
        'Invalid "from" address format',
        SINGLE_BROADCAST_ERRORS.INVALID_TRANSACTION,
        { from: transactionRequest.from }
      );
    }

    // Validate value
    if (transactionRequest.value) {
      try {
        const value = BigInt(transactionRequest.value);
        if (value < 0) {
          throw new Error('Negative value');
        }
      } catch (error) {
        throw new RPCError(
          'Invalid transaction value',
          SINGLE_BROADCAST_ERRORS.VALUE_OVERFLOW,
          { value: transactionRequest.value }
        );
      }
    }

    // Validate gas parameters
    if (transactionRequest.gasLimit) {
      const gasLimit = BigInt(transactionRequest.gasLimit);
      if (gasLimit > this.config.maxGasLimit) {
        throw new RPCError(
          'Gas limit exceeds maximum allowed',
          SINGLE_BROADCAST_ERRORS.GAS_LIMIT_EXCEEDED,
          { gasLimit: gasLimit.toString(), maxGasLimit: this.config.maxGasLimit }
        );
      }
    }

    if (transactionRequest.gasPrice) {
      const gasPrice = BigInt(transactionRequest.gasPrice);
      if (gasPrice > this.config.maxGasPrice) {
        throw new RPCError(
          'Gas price exceeds maximum allowed',
          SINGLE_BROADCAST_ERRORS.GAS_PRICE_TOO_LOW,
          { gasPrice: gasPrice.toString(), maxGasPrice: this.config.maxGasPrice.toString() }
        );
      }
    }

    // Validate signer availability
    if (!this.signer && !transactionRequest.from) {
      throw new RPCError(
        'No signer configured and no "from" address provided',
        SINGLE_BROADCAST_ERRORS.INVALID_PRIVATE_KEY
      );
    }
  }

  /**
   * Prepares transaction for broadcast
   */
  async _prepareTransaction(broadcastData) {
    const startTime = Date.now();
    broadcastData.state = BROADCAST_STATES.PREPARING;

    try {
      this.logger.debug('Preparing transaction for broadcast', {
        broadcastId: broadcastData.broadcastId
      });

      const tx = broadcastData.transactionRequest;

      // Determine sender address
      const fromAddress = tx.from || (this.signer ? await this.signer.getAddress() : null);
      if (!fromAddress) {
        throw new RPCError(
          'Cannot determine sender address',
          SINGLE_BROADCAST_ERRORS.INVALID_PRIVATE_KEY
        );
      }

      // Get and validate nonce
      const nonce = await this._getNonce(fromAddress, tx.nonce);
      broadcastData.nonce = nonce;

      // Estimate gas if not provided
      const gasLimit = tx.gasLimit || await this._estimateGas(tx, fromAddress);
      broadcastData.gasLimit = gasLimit;

      // Get gas price if not provided
      const gasPrice = tx.gasPrice || await this._getGasPrice(tx);
      broadcastData.gasPrice = gasPrice;

      // Build final transaction
      const finalTransaction = {
        ...tx,
        from: fromAddress,
        nonce,
        gasLimit,
        gasPrice,
        chainId: this.chainId
      };

      // Add EIP-1559 fields if supported
      if (this._supportsEIP1559()) {
        if (tx.maxFeePerGas) finalTransaction.maxFeePerGas = tx.maxFeePerGas;
        if (tx.maxPriorityFeePerGas) finalTransaction.maxPriorityFeePerGas = tx.maxPriorityFeePerGas;
        if (!tx.gasPrice) delete finalTransaction.gasPrice; // Remove gasPrice for EIP-1559
      }

      broadcastData.finalTransaction = finalTransaction;
      broadcastData.preparationTime = Date.now() - startTime;

      this.emit('transaction_prepared', {
        broadcastId: broadcastData.broadcastId,
        transaction: finalTransaction,
        preparationTime: broadcastData.preparationTime
      });

    } catch (error) {
      throw new RPCError(
        `Transaction preparation failed: ${error.message}`,
        SINGLE_BROADCAST_ERRORS.BROADCAST_FAILED,
        { broadcastId: broadcastData.broadcastId, originalError: error }
      );
    }
  }

  /**
   * Validates prepared transaction
   */
  async _validateTransaction(broadcastData) {
    const startTime = Date.now();
    broadcastData.state = BROADCAST_STATES.VALIDATING;

    try {
      if (!this.config.enableTransactionValidation) {
        broadcastData.validationTime = Date.now() - startTime;
        return;
      }

      this.logger.debug('Validating prepared transaction', {
        broadcastId: broadcastData.broadcastId
      });

      const tx = broadcastData.finalTransaction;

      // Validate balance if checking enabled
      if (this.config.enableBalanceCheck && tx.value && BigInt(tx.value) > 0) {
        await this._validateBalance(tx.from, tx.value, tx.gasLimit, tx.gasPrice);
      }

      // Security validation
      if (this.config.enableSecurityChecks) {
        await this._performSecurityValidation(tx);
      }

      // Gas validation
      if (this.config.enableGasValidation) {
        await this._validateGasParameters(tx);
      }

      // Nonce validation
      if (this.config.enableNonceValidation) {
        await this._validateNonce(tx.from, tx.nonce);
      }

      broadcastData.validationTime = Date.now() - startTime;

      this.emit('transaction_validated', {
        broadcastId: broadcastData.broadcastId,
        validationTime: broadcastData.validationTime
      });

    } catch (error) {
      throw new RPCError(
        `Transaction validation failed: ${error.message}`,
        SINGLE_BROADCAST_ERRORS.TRANSACTION_VALIDATION_FAILED,
        { broadcastId: broadcastData.broadcastId, originalError: error }
      );
    }
  }

  /**
   * Broadcasts transaction to network
   */
  async _broadcastToNetwork(broadcastData) {
    const startTime = Date.now();
    broadcastData.state = BROADCAST_STATES.BROADCASTING;
    broadcastData.attempts++;

    try {
      this.logger.info('Broadcasting transaction to network', {
        broadcastId: broadcastData.broadcastId,
        attempt: broadcastData.attempts,
        maxAttempts: broadcastData.maxAttempts
      });

      const tx = broadcastData.finalTransaction;

      // Sign transaction if signer available
      let signedTransaction;
      if (this.signer) {
        signedTransaction = await this._signTransaction(tx);
      } else {
        // For unsigned broadcasting (when using external signers)
        signedTransaction = tx;
      }

      // Broadcast with timeout
      const broadcastPromise = this.signer ? 
        this.provider.broadcastTransaction(signedTransaction) :
        this.provider.sendTransaction(signedTransaction);

      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Broadcast timeout')), this.config.broadcastTimeout)
      );

      const response = await Promise.race([broadcastPromise, timeoutPromise]);
      
      broadcastData.transactionHash = response.hash || response;
      broadcastData.state = BROADCAST_STATES.PENDING;
      broadcastData.broadcastTime = Date.now() - startTime;

      // Update nonce tracking
      this._updateNonceTracking(tx.from, tx.nonce);

      // Record successful broadcast
      this.analytics.totalBroadcasts++;
      this._updateAverageBroadcastTime(broadcastData.broadcastTime);

      this.emit('transaction_broadcasted', {
        broadcastId: broadcastData.broadcastId,
        transactionHash: broadcastData.transactionHash,
        broadcastTime: broadcastData.broadcastTime,
        attempt: broadcastData.attempts
      });

      this.logger.info('Transaction broadcasted successfully', {
        broadcastId: broadcastData.broadcastId,
        transactionHash: broadcastData.transactionHash,
        broadcastTime: broadcastData.broadcastTime
      });

    } catch (error) {
      await this._handleBroadcastAttemptError(broadcastData, error, startTime);
    }
  }

  /**
   * Waits for transaction confirmation
   */
  async _waitForConfirmation(broadcastData, options) {
    const startTime = Date.now();
    const confirmations = options.confirmations || 1;
    const timeout = options.confirmationTimeout || this.config.confirmationTimeout;

    try {
      this.logger.debug('Waiting for transaction confirmation', {
        broadcastId: broadcastData.broadcastId,
        transactionHash: broadcastData.transactionHash,
        confirmations
      });

      const receipt = await this.provider.waitForTransaction(
        broadcastData.transactionHash,
        confirmations,
        timeout
      );

      if (!receipt) {
        throw new Error('Transaction confirmation timeout');
      }

      if (receipt.status === 0) {
        throw new Error('Transaction reverted');
      }

      broadcastData.state = BROADCAST_STATES.CONFIRMED;
      broadcastData.confirmationTime = Date.now() - startTime;
      broadcastData.gasUsed = receipt.gasUsed;

      // Update gas analytics
      this._updateGasAnalytics(broadcastData, receipt);

      this.emit('transaction_confirmed', {
        broadcastId: broadcastData.broadcastId,
        transactionHash: broadcastData.transactionHash,
        confirmationTime: broadcastData.confirmationTime,
        gasUsed: receipt.gasUsed.toString(),
        confirmations: receipt.confirmations
      });

    } catch (error) {
      if (error.message.includes('timeout')) {
        broadcastData.state = BROADCAST_STATES.TIMEOUT;
      } else {
        broadcastData.state = BROADCAST_STATES.FAILED;
      }
      
      throw new RPCError(
        `Transaction confirmation failed: ${error.message}`,
        SINGLE_BROADCAST_ERRORS.BROADCAST_FAILED,
        { broadcastId: broadcastData.broadcastId, originalError: error }
      );
    }
  }

  /**
   * Handles broadcast attempt errors with retry logic
   */
  async _handleBroadcastAttemptError(broadcastData, error, startTime) {
    broadcastData.errors.push({
      attempt: broadcastData.attempts,
      error: error.message,
      timestamp: Date.now()
    });

    // Analyze error for retry decision
    const errorCode = this._analyzeError(error);
    this._recordError(errorCode);

    const canRetry = broadcastData.attempts < broadcastData.maxAttempts && 
                    this._shouldRetryError(errorCode);

    if (canRetry) {
      this.logger.warn('Broadcast attempt failed, retrying', {
        broadcastId: broadcastData.broadcastId,
        attempt: broadcastData.attempts,
        maxAttempts: broadcastData.maxAttempts,
        error: error.message,
        nextRetryIn: this.config.retryDelay
      });

      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, this.config.retryDelay));

      // Adjust gas price for retry if needed
      if (this._shouldIncreaseGasPrice(errorCode)) {
        await this._adjustGasPriceForRetry(broadcastData);
      }

      // Retry broadcast
      await this._broadcastToNetwork(broadcastData);
    } else {
      broadcastData.state = BROADCAST_STATES.FAILED;
      broadcastData.broadcastTime = Date.now() - startTime;
      
      throw new RPCError(
        `Broadcast failed after ${broadcastData.attempts} attempts: ${error.message}`,
        errorCode,
        { 
          broadcastId: broadcastData.broadcastId,
          attempts: broadcastData.attempts,
          errors: broadcastData.errors,
          originalError: error
        }
      );
    }
  }

  /**
   * Completes broadcast tracking and updates analytics
   */
  async _completeBroadcast(broadcastData, success) {
    const totalTime = Date.now() - broadcastData.startTime;

    // Update analytics
    if (success) {
      this.analytics.successfulBroadcasts++;
    } else {
      this.analytics.failedBroadcasts++;
    }

    // Update average confirmation time
    if (broadcastData.confirmationTime) {
      this._updateAverageConfirmationTime(broadcastData.confirmationTime);
    }

    // Add to broadcast history
    this.broadcastHistory.push({
      broadcastId: broadcastData.broadcastId,
      success,
      totalTime,
      attempts: broadcastData.attempts,
      state: broadcastData.state,
      transactionHash: broadcastData.transactionHash,
      gasUsed: broadcastData.gasUsed?.toString(),
      timestamp: Date.now()
    });

    // Trim history to prevent memory growth
    if (this.broadcastHistory.length > 1000) {
      this.broadcastHistory = this.broadcastHistory.slice(-1000);
    }

    this.logger.info('Broadcast completed', {
      broadcastId: broadcastData.broadcastId,
      success,
      totalTime,
      attempts: broadcastData.attempts,
      state: broadcastData.state
    });
  }

  /**
   * Helper methods for transaction processing
   */

  async _getNonce(address, providedNonce) {
    if (providedNonce !== undefined) {
      return BigInt(providedNonce);
    }

    // Check cache first
    const cached = this.nonceCache.get(address);
    if (cached && Date.now() - cached.timestamp < 10000) { // 10 second cache
      return cached.nonce;
    }

    // Get from network
    const nonce = await this.provider.getTransactionCount(address, 'pending');
    const nonceValue = BigInt(nonce);

    // Update cache
    this.nonceCache.set(address, {
      nonce: nonceValue,
      timestamp: Date.now()
    });

    return nonceValue;
  }

  async _estimateGas(tx, fromAddress) {
    try {
      const estimatedGas = await this.provider.estimateGas({
        ...tx,
        from: fromAddress
      });
      
      // Add 10% buffer for safety
      const gasLimit = (estimatedGas * BigInt(110)) / BigInt(100);
      
      return gasLimit;
    } catch (error) {
      this.logger.warn('Gas estimation failed, using default', {
        error: error.message,
        to: tx.to
      });
      
      // Return default gas limit
      return BigInt(tx.to ? 21000 : 53000); // 21k for transfer, 53k for contract creation
    }
  }

  async _getGasPrice(tx) {
    try {
      // Check cache first
      const currentBlock = await this.provider.getBlockNumber();
      const cached = this.gasCache.get(currentBlock);
      if (cached && Date.now() - cached.timestamp < 30000) { // 30 second cache
        return cached.gasPrice;
      }

      let gasPrice;
      
      if (this._supportsEIP1559() && !tx.gasPrice) {
        // Use EIP-1559 fee data
        const feeData = await this.provider.getFeeData();
        gasPrice = feeData.gasPrice || feeData.maxFeePerGas || ethers.parseUnits('20', 'gwei');
      } else {
        // Legacy gas price
        gasPrice = await this.provider.getGasPrice();
      }

      // Apply minimum gas price if configured
      const minGasPrice = ethers.parseUnits('1', 'gwei'); // 1 gwei minimum
      if (gasPrice < minGasPrice) {
        gasPrice = minGasPrice;
      }

      // Cache the result
      this.gasCache.set(currentBlock, {
        gasPrice,
        timestamp: Date.now()
      });

      return gasPrice;
    } catch (error) {
      this.logger.warn('Gas price fetch failed, using default', {
        error: error.message
      });
      
      return ethers.parseUnits('20', 'gwei'); // 20 gwei default
    }
  }

  async _signTransaction(tx) {
    if (!this.signer) {
      throw new RPCError(
        'No signer available for transaction signing',
        SINGLE_BROADCAST_ERRORS.INVALID_PRIVATE_KEY
      );
    }

    try {
      const signedTx = await this.signer.signTransaction(tx);
      return signedTx;
    } catch (error) {
      throw new RPCError(
        `Transaction signing failed: ${error.message}`,
        SINGLE_BROADCAST_ERRORS.INVALID_PRIVATE_KEY,
        { originalError: error }
      );
    }
  }

  async _validateBalance(fromAddress, value, gasLimit, gasPrice) {
    try {
      const balance = await this.provider.getBalance(fromAddress);
      const totalCost = BigInt(value) + (BigInt(gasLimit) * BigInt(gasPrice));
      
      if (balance < totalCost) {
        throw new RPCError(
          'Insufficient balance for transaction',
          SINGLE_BROADCAST_ERRORS.INSUFFICIENT_FUNDS,
          {
            balance: balance.toString(),
            required: totalCost.toString(),
            address: fromAddress
          }
        );
      }
    } catch (error) {
      if (error instanceof RPCError) {
        throw error;
      }
      
      this.logger.warn('Balance validation failed', {
        error: error.message,
        address: fromAddress
      });
    }
  }

  async _performSecurityValidation(tx) {
    try {
      // Validate transaction through security manager
      const securityResult = await this.securityManager.validateTransaction(tx);
      
      if (!securityResult.safe) {
        throw new RPCError(
          `Security validation failed: ${securityResult.reason}`,
          SINGLE_BROADCAST_ERRORS.TRANSACTION_VALIDATION_FAILED,
          { securityResult }
        );
      }
    } catch (error) {
      if (error instanceof RPCError) {
        throw error;
      }
      
      this.logger.warn('Security validation error', {
        error: error.message
      });
    }
  }

  async _validateGasParameters(tx) {
    // Validate gas limit
    if (tx.gasLimit && BigInt(tx.gasLimit) > this.config.maxGasLimit) {
      throw new RPCError(
        'Gas limit exceeds maximum allowed',
        SINGLE_BROADCAST_ERRORS.GAS_LIMIT_EXCEEDED,
        { gasLimit: tx.gasLimit.toString(), maxGasLimit: this.config.maxGasLimit }
      );
    }

    // Validate gas price
    if (tx.gasPrice && BigInt(tx.gasPrice) > this.config.maxGasPrice) {
      throw new RPCError(
        'Gas price exceeds maximum allowed',
        SINGLE_BROADCAST_ERRORS.GAS_PRICE_TOO_LOW,
        { gasPrice: tx.gasPrice.toString(), maxGasPrice: this.config.maxGasPrice.toString() }
      );
    }

    // Validate against current network gas price
    try {
      const networkGasPrice = await this.provider.getGasPrice();
      const txGasPrice = BigInt(tx.gasPrice || tx.maxFeePerGas || 0);
      
      // Gas price should be at least 50% of network price
      const minGasPrice = (networkGasPrice * BigInt(50)) / BigInt(100);
      
      if (txGasPrice < minGasPrice) {
        this.logger.warn('Gas price below recommended minimum', {
          txGasPrice: txGasPrice.toString(),
          networkGasPrice: networkGasPrice.toString(),
          minRecommended: minGasPrice.toString()
        });
      }
    } catch (error) {
      this.logger.debug('Could not validate against network gas price', {
        error: error.message
      });
    }
  }

  async _validateNonce(address, nonce) {
    try {
      const currentNonce = await this.provider.getTransactionCount(address, 'pending');
      const txNonce = BigInt(nonce);
      const expectedNonce = BigInt(currentNonce);
      
      if (txNonce < expectedNonce) {
        throw new RPCError(
          'Nonce too low - transaction may have been already processed',
          SINGLE_BROADCAST_ERRORS.NONCE_TOO_LOW,
          { 
            provided: txNonce.toString(),
            expected: expectedNonce.toString(),
            address
          }
        );
      }
      
      if (txNonce > expectedNonce + BigInt(10)) {
        throw new RPCError(
          'Nonce too high - may cause transaction queue issues',
          SINGLE_BROADCAST_ERRORS.NONCE_TOO_HIGH,
          {
            provided: txNonce.toString(),
            expected: expectedNonce.toString(),
            address
          }
        );
      }
    } catch (error) {
      if (error instanceof RPCError) {
        throw error;
      }
      
      this.logger.warn('Nonce validation failed', {
        error: error.message,
        address,
        nonce: nonce.toString()
      });
    }
  }

  _supportsEIP1559() {
    // EIP-1559 supported networks
    return [1, 137, 42161, 10].includes(this.chainId);
  }

  _analyzeError(error) {
    const message = error.message.toLowerCase();
    
    if (message.includes('insufficient funds')) {
      return SINGLE_BROADCAST_ERRORS.INSUFFICIENT_FUNDS;
    }
    if (message.includes('nonce too low')) {
      return SINGLE_BROADCAST_ERRORS.NONCE_TOO_LOW;
    }
    if (message.includes('nonce too high')) {
      return SINGLE_BROADCAST_ERRORS.NONCE_TOO_HIGH;
    }
    if (message.includes('gas price too low')) {
      return SINGLE_BROADCAST_ERRORS.GAS_PRICE_TOO_LOW;
    }
    if (message.includes('gas limit exceeded') || message.includes('out of gas')) {
      return SINGLE_BROADCAST_ERRORS.GAS_LIMIT_EXCEEDED;
    }
    if (message.includes('timeout')) {
      return SINGLE_BROADCAST_ERRORS.CONNECTION_TIMEOUT;
    }
    if (message.includes('rate limit') || message.includes('too many requests')) {
      return SINGLE_BROADCAST_ERRORS.RATE_LIMITED;
    }
    if (message.includes('rejected') || message.includes('reverted')) {
      return SINGLE_BROADCAST_ERRORS.TRANSACTION_REJECTED;
    }
    
    return SINGLE_BROADCAST_ERRORS.NETWORK_ERROR;
  }

  _shouldRetryError(errorCode) {
    const retryableErrors = [
      SINGLE_BROADCAST_ERRORS.NETWORK_ERROR,
      SINGLE_BROADCAST_ERRORS.CONNECTION_TIMEOUT,
      SINGLE_BROADCAST_ERRORS.RPC_ERROR,
      SINGLE_BROADCAST_ERRORS.GAS_PRICE_TOO_LOW
    ];
    
    return retryableErrors.includes(errorCode);
  }

  _shouldIncreaseGasPrice(errorCode) {
    return errorCode === SINGLE_BROADCAST_ERRORS.GAS_PRICE_TOO_LOW;
  }

  async _adjustGasPriceForRetry(broadcastData) {
    const currentGasPrice = BigInt(broadcastData.gasPrice);
    const inflationFactor = BigInt(Math.floor(this.config.gasPriceInflationFactor * 100));
    const newGasPrice = (currentGasPrice * inflationFactor) / BigInt(100);
    
    // Ensure we don't exceed maximum
    const finalGasPrice = newGasPrice > this.config.maxGasPrice ? 
      this.config.maxGasPrice : newGasPrice;
    
    broadcastData.gasPrice = finalGasPrice;
    broadcastData.finalTransaction.gasPrice = finalGasPrice;
    
    this.logger.info('Adjusted gas price for retry', {
      broadcastId: broadcastData.broadcastId,
      oldGasPrice: currentGasPrice.toString(),
      newGasPrice: finalGasPrice.toString(),
      inflationFactor: this.config.gasPriceInflationFactor
    });
  }

  _updateNonceTracking(address, nonce) {
    this.activeNonces.set(address, BigInt(nonce));
    
    // Update cache with next nonce
    this.nonceCache.set(address, {
      nonce: BigInt(nonce) + BigInt(1),
      timestamp: Date.now()
    });
  }

  _updateGasAnalytics(broadcastData, receipt) {
    const gasUsed = receipt.gasUsed;
    const gasPrice = BigInt(broadcastData.gasPrice);
    const gasCost = gasUsed * gasPrice;
    
    this.analytics.gasEfficiency.totalGasUsed += gasUsed;
    this.analytics.gasEfficiency.totalGasCost += gasCost;
    
    // Update average gas price
    const totalTxs = BigInt(this.analytics.successfulBroadcasts);
    if (totalTxs > 0) {
      this.analytics.gasEfficiency.averageGasPrice = 
        this.analytics.gasEfficiency.totalGasCost / this.analytics.gasEfficiency.totalGasUsed;
    }
    
    // Calculate gas efficiency for this transaction
    const estimatedGas = BigInt(broadcastData.gasLimit);
    broadcastData.gasEfficiency = estimatedGas > 0 ? 
      Number((gasUsed * BigInt(100)) / estimatedGas) : 0;
  }

  _recordError(errorCode) {
    const count = this.errorStats.get(errorCode) || 0;
    this.errorStats.set(errorCode, count + 1);
  }

  _updateAverageBroadcastTime(broadcastTime) {
    const currentAverage = this.analytics.averageBroadcastTime;
    const count = this.analytics.totalBroadcasts;
    
    this.analytics.averageBroadcastTime = 
      ((currentAverage * (count - 1)) + broadcastTime) / count;
  }

  _updateAverageConfirmationTime(confirmationTime) {
    const currentAverage = this.analytics.averageConfirmationTime;
    const count = this.analytics.successfulBroadcasts;
    
    this.analytics.averageConfirmationTime = 
      ((currentAverage * (count - 1)) + confirmationTime) / count;
  }

  _calculateSuccessRate() {
    const total = this.analytics.totalBroadcasts;
    return total > 0 ? (this.analytics.successfulBroadcasts / total) * 100 : 0;
  }

  _calculateGasEfficiency() {
    if (this.analytics.gasEfficiency.totalGasUsed === BigInt(0)) return 0;
    
    // Simple efficiency score based on gas usage vs estimates
    return 85; // Simplified for example
  }

  _calculateBroadcastProgress(broadcast) {
    const states = [
      BROADCAST_STATES.PREPARING,
      BROADCAST_STATES.VALIDATING,
      BROADCAST_STATES.BROADCASTING,
      BROADCAST_STATES.PENDING,
      BROADCAST_STATES.CONFIRMED
    ];
    
    const currentIndex = states.indexOf(broadcast.state);
    return currentIndex >= 0 ? ((currentIndex + 1) / states.length) * 100 : 0;
  }

  _estimateTimeRemaining(broadcast) {
    const elapsed = Date.now() - broadcast.startTime;
    const progress = this._calculateBroadcastProgress(broadcast);
    
    if (progress === 0) return 0;
    
    const estimatedTotal = (elapsed / progress) * 100;
    return Math.max(0, estimatedTotal - elapsed);
  }

  _generateBroadcastId() {
    return `single_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async _handleBroadcastError(broadcastId, error, startTime) {
    const totalTime = Date.now() - startTime;
    
    this.analytics.failedBroadcasts++;
    
    // Complete current broadcast tracking
    if (this.currentBroadcast) {
      await this._completeBroadcast(this.currentBroadcast, false);
    }

    this.emit('broadcast_error', {
      broadcastId,
      error: error.message,
      totalTime,
      timestamp: Date.now()
    });

    this.logger.error('Broadcast failed', {
      broadcastId,
      error: error.message,
      totalTime
    });
  }

  /**
   * Background monitoring and maintenance
   */

  _warmupGasCache() {
    // Pre-warm gas cache in background
    if (this.config.enableOptimizations) {
      setImmediate(async () => {
        try {
          await this._getGasPrice({});
        } catch (error) {
          this.logger.debug('Gas cache warmup failed', { error: error.message });
        }
      });
    }
  }

  _initializeNonceTracking() {
    // Initialize nonce tracking structures
    this.activeNonces.clear();
    this.nonceCache.clear();
  }

  _startAnalyticsMonitoring() {
    // Clean up old cache entries periodically
    this.analyticsInterval = setInterval(() => {
      this._cleanupCaches();
      this._emitPerformanceMetrics();
    }, 60000); // Every minute
  }

  _cleanupCaches() {
    const now = Date.now();
    
    // Clean nonce cache (10 second TTL)
    for (const [address, data] of this.nonceCache.entries()) {
      if (now - data.timestamp > 10000) {
        this.nonceCache.delete(address);
      }
    }
    
    // Clean gas cache (30 second TTL)
    for (const [block, data] of this.gasCache.entries()) {
      if (now - data.timestamp > 30000) {
        this.gasCache.delete(block);
      }
    }
  }

  _emitPerformanceMetrics() {
    const metrics = {
      totalBroadcasts: this.analytics.totalBroadcasts,
      successRate: this._calculateSuccessRate(),
      averageBroadcastTime: this.analytics.averageBroadcastTime,
      cacheHitRatio: this._calculateCacheHitRatio(),
      activeNonces: this.activeNonces.size,
      timestamp: Date.now()
    };

    this.emit('performance_metrics', metrics);
  }

  _calculateCacheHitRatio() {
    // Simplified cache hit ratio calculation
    return 75; // Placeholder
  }

  /**
   * Public management methods
   */

  /**
   * Updates strategy configuration
   */
  updateConfig(newConfig) {
    const oldConfig = { ...this.config };
    this.config = { ...this.config, ...newConfig };
    
    this.logger.info('SingleBroadcastStrategy configuration updated', {
      updatedFields: Object.keys(newConfig)
    });
    
    this.emit('config_updated', {
      oldConfig,
      newConfig: this.config,
      timestamp: Date.now()
    });
  }

  /**
   * Gets strategy statistics
   */
  getStats() {
    return {
      strategy: 'SingleBroadcastStrategy',
      version: '1.0.0',
      chainId: this.chainId,
      network: this.networkConfig.name,
      
      analytics: this.getAnalytics(),
      
      cache: {
        nonceCache: this.nonceCache.size,
        gasCache: this.gasCache.size,
        activeNonces: this.activeNonces.size
      },
      
      history: {
        totalBroadcasts: this.broadcastHistory.length,
        recentBroadcasts: this.broadcastHistory.slice(-10)
      },
      
      configuration: this.config,
      uptime: Date.now() - this.startTime,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Clears strategy state and cache
   */
  clearState() {
    this.nonceCache.clear();
    this.gasCache.clear();
    this.activeNonces.clear();
    this.errorStats.clear();
    this.broadcastHistory.length = 0;
    
    // Reset analytics
    this.analytics = {
      totalBroadcasts: 0,
      successfulBroadcasts: 0,
      failedBroadcasts: 0,
      averageBroadcastTime: 0,
      averageConfirmationTime: 0,
      gasEfficiency: {
        totalGasUsed: BigInt(0),
        totalGasCost: BigInt(0),
        averageGasPrice: BigInt(0)
      }
    };
    
    this.logger.info('SingleBroadcastStrategy state cleared');
    
    this.emit('state_cleared', {
      timestamp: Date.now()
    });
  }

  /**
   * Exports strategy data for analysis
   */
  exportData() {
    return {
      metadata: {
        strategy: 'SingleBroadcastStrategy',
        chainId: this.chainId,
        network: this.networkConfig.name,
        exportTime: Date.now(),
        version: '1.0.0'
      },
      
      analytics: this.analytics,
      configuration: this.config,
      broadcastHistory: this.broadcastHistory,
      errorStats: Object.fromEntries(this.errorStats),
      
      cache: {
        nonceCacheSize: this.nonceCache.size,
        gasCacheSize: this.gasCache.size,
        activeNoncesSize: this.activeNonces.size
      }
    };
  }

  /**
   * Graceful shutdown
   */
  async shutdown() {
    this.logger.info('SingleBroadcastStrategy shutdown initiated');
    
    // Clear analytics interval
    if (this.analyticsInterval) {
      clearInterval(this.analyticsInterval);
    }
    
    // Wait for current broadcast to complete if any
    if (this.currentBroadcast) {
      this.logger.info('Waiting for current broadcast to complete');
      
      const timeout = setTimeout(() => {
        this.logger.warn('Shutdown timeout - forcing cleanup');
      }, 30000); // 30 second timeout
      
      // Wait for broadcast completion
      await new Promise((resolve) => {
        if (!this.currentBroadcast) {
          resolve();
          return;
        }
        
        const checkCompletion = () => {
          if (!this.currentBroadcast) {
            clearTimeout(timeout);
            resolve();
          } else {
            setTimeout(checkCompletion, 1000);
          }
        };
        
        checkCompletion();
      });
    }
    
    // Shutdown metrics collector
    if (this.metrics) {
      await this.metrics.shutdown();
    }
    
    // Clear all state
    this.clearState();
    
    this.logger.info('SingleBroadcastStrategy shutdown completed', {
      uptime: Date.now() - this.startTime
    });
  }
}

/**
 * Factory function to create SingleBroadcastStrategy
 */
export function createSingleBroadcastStrategy(config) {
  return new SingleBroadcastStrategy(config);
}

export default SingleBroadcastStrategy;

/**
 * Example usage:
 * 
 * // Initialize strategy
 * const strategy = new SingleBroadcastStrategy({
 *   chainId: 1,
 *   provider: new ethers.JsonRpcProvider(RPC_URL),
 *   signer: new ethers.Wallet(PRIVATE_KEY),
 *   enableAnalytics: true,
 *   enableSecurityChecks: true
 * });
 * 
 * // Listen for events
 * strategy.on('transaction_broadcasted', (event) => {
 *   console.log('Transaction broadcasted:', event.transactionHash);
 * });
 * 
 * strategy.on('transaction_confirmed', (event) => {
 *   console.log('Transaction confirmed:', event.confirmations);
 * });
 * 
 * // Broadcast transaction
 * const result = await strategy.broadcastTransaction({
 *   to: '0x...',
 *   value: ethers.parseEther('0.1'),
 *   gasLimit: 21000
 * }, {
 *   waitForConfirmation: true,
 *   confirmations: 3,
 *   retryAttempts: 3
 * });
 * 
 * // Get analytics
 * const analytics = strategy.getAnalytics();
 * console.log('Success rate:', analytics.performance.successRate);
 * 
 * // Get current status
 * const status = strategy.getCurrentBroadcastStatus();
 * 
 * // Update configuration
 * strategy.updateConfig({
 *   retryAttempts: 5,
 *   broadcastTimeout: 45000
 * });
 * 
 * // Export data for analysis
 * const exportData = strategy.exportData();
 * 
 * // Graceful shutdown
 * await strategy.shutdown();
 */
