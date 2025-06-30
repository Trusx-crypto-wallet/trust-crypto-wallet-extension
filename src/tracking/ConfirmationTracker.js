/**
 * @fileoverview Production Enterprise-grade Confirmation Tracker for Trust Crypto Wallet Extension
 * @version 1.0.0
 * @author Trust Wallet Development Team
 * @license MIT
 * @description PRODUCTION-READY confirmation tracking with real-time monitoring and enterprise features
 */

import { EventEmitter } from 'events';
import { ethers } from 'ethers';
import { RPCError, RPC_ERROR_CODES } from '../providers/RPCBroadcastProvider.js';
import { SecurityManager } from '../../security/SecurityManager.js';
import { MetricsCollector } from '../../monitoring/MetricsCollector.js';
import { Logger } from '../../utils/Logger.js';

/**
 * Confirmation tracking error codes
 */
export const CONFIRMATION_TRACKING_ERRORS = {
  // Configuration errors
  INVALID_CONFIGURATION: 'CONF_INVALID_CONFIG',
  INVALID_TRANSACTION_HASH: 'CONF_INVALID_TX_HASH',
  INVALID_CONFIRMATION_COUNT: 'CONF_INVALID_COUNT',
  PROVIDER_UNAVAILABLE: 'CONF_PROVIDER_UNAVAILABLE',
  
  // Tracking errors
  TRANSACTION_NOT_FOUND: 'CONF_TX_NOT_FOUND',
  TRANSACTION_FAILED: 'CONF_TX_FAILED',
  TRACKING_TIMEOUT: 'CONF_TRACKING_TIMEOUT',
  CONFIRMATION_ROLLBACK: 'CONF_ROLLBACK',
  
  // Network errors
  NETWORK_ERROR: 'CONF_NETWORK_ERROR',
  RPC_ERROR: 'CONF_RPC_ERROR',
  BLOCK_SYNC_ERROR: 'CONF_BLOCK_SYNC_ERROR',
  REORG_DETECTED: 'CONF_REORG_DETECTED',
  
  // Performance errors
  HIGH_LATENCY: 'CONF_HIGH_LATENCY',
  RATE_LIMITED: 'CONF_RATE_LIMITED',
  RESOURCE_EXHAUSTED: 'CONF_RESOURCE_EXHAUSTED',
  
  // Business logic errors
  DUPLICATE_TRACKING: 'CONF_DUPLICATE_TRACKING',
  TRACKING_LIMIT_EXCEEDED: 'CONF_LIMIT_EXCEEDED',
  INVALID_STATE_TRANSITION: 'CONF_INVALID_STATE'
};

/**
 * Confirmation states for tracking lifecycle
 */
export const CONFIRMATION_STATES = {
  PENDING: 'pending',                 // Waiting for first confirmation
  CONFIRMING: 'confirming',          // Accumulating confirmations
  CONFIRMED: 'confirmed',            // Target confirmations reached
  FAILED: 'failed',                  // Transaction failed
  DROPPED: 'dropped',                // Transaction dropped from mempool
  REPLACED: 'replaced',              // Transaction replaced (higher gas)
  ROLLBACK: 'rollback',              // Confirmation rolled back due to reorg
  TIMEOUT: 'timeout',                // Tracking timeout reached
  CANCELLED: 'cancelled'             // Tracking manually cancelled
};

/**
 * Network-specific confirmation configurations
 */
export const CONFIRMATION_NETWORK_CONFIGS = {
  1: { // Ethereum Mainnet
    name: 'ethereum',
    chainId: 1,
    avgBlockTime: 12000,              // 12 seconds
    defaultConfirmations: 12,         // Default required confirmations
    maxConfirmations: 64,             // Maximum trackable confirmations
    fastConfirmations: 3,             // Fast confirmation threshold
    safeConfirmations: 12,            // Safe confirmation threshold
    finalConfirmations: 32,           // Finality confirmation threshold
    reorgDepth: 7,                    // Expected max reorg depth
    timeoutBlocks: 100,               // Blocks before timeout
    pollingInterval: 3000,            // 3 seconds polling
    batchSize: 50,                    // Batch size for RPC calls
    priorityFeeThreshold: ethers.parseUnits('2', 'gwei'),
    gasTracking: true,
    mevProtection: true
  },
  56: { // BSC
    name: 'bsc',
    chainId: 56,
    avgBlockTime: 3000,               // 3 seconds
    defaultConfirmations: 3,
    maxConfirmations: 15,
    fastConfirmations: 1,
    safeConfirmations: 3,
    finalConfirmations: 8,
    reorgDepth: 3,
    timeoutBlocks: 200,
    pollingInterval: 1000,            // 1 second polling
    batchSize: 30,
    priorityFeeThreshold: ethers.parseUnits('5', 'gwei'),
    gasTracking: true,
    mevProtection: false
  },
  137: { // Polygon
    name: 'polygon',
    chainId: 137,
    avgBlockTime: 2000,               // 2 seconds
    defaultConfirmations: 5,
    maxConfirmations: 20,
    fastConfirmations: 2,
    safeConfirmations: 5,
    finalConfirmations: 12,
    reorgDepth: 5,
    timeoutBlocks: 300,
    pollingInterval: 800,             // 800ms polling
    batchSize: 40,
    priorityFeeThreshold: ethers.parseUnits('30', 'gwei'),
    gasTracking: true,
    mevProtection: false
  },
  42161: { // Arbitrum
    name: 'arbitrum',
    chainId: 42161,
    avgBlockTime: 1000,               // 1 second
    defaultConfirmations: 1,
    maxConfirmations: 5,
    fastConfirmations: 1,
    safeConfirmations: 1,
    finalConfirmations: 2,
    reorgDepth: 1,
    timeoutBlocks: 600,
    pollingInterval: 500,             // 500ms polling
    batchSize: 20,
    priorityFeeThreshold: ethers.parseUnits('0.1', 'gwei'),
    gasTracking: false,               // Different gas model
    mevProtection: false
  },
  10: { // Optimism
    name: 'optimism',
    chainId: 10,
    avgBlockTime: 2000,               // 2 seconds
    defaultConfirmations: 1,
    maxConfirmations: 5,
    fastConfirmations: 1,
    safeConfirmations: 1,
    finalConfirmations: 3,
    reorgDepth: 2,
    timeoutBlocks: 300,
    pollingInterval: 600,             // 600ms polling
    batchSize: 25,
    priorityFeeThreshold: ethers.parseUnits('0.001', 'gwei'),
    gasTracking: false,
    mevProtection: false
  }
};

/**
 * PRODUCTION Enterprise-grade Confirmation Tracker
 * @class ConfirmationTracker
 * @extends EventEmitter
 */
export class ConfirmationTracker extends EventEmitter {
  constructor({
    chainId,
    provider,
    maxConcurrentTracking = 2000,
    enableAnalytics = true,
    enableRealtimeUpdates = true,
    enableSecurityChecks = true,
    customThresholds = {},
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
    this.networkConfig = CONFIRMATION_NETWORK_CONFIGS[chainId];
    
    if (!this.networkConfig) {
      throw new Error(`Unsupported chain ID: ${chainId}`);
    }

    // Initialize components
    this.logger = new Logger('ConfirmationTracker');
    this.securityManager = new SecurityManager({
      enableTransactionAnalysis: enableSecurityChecks,
      enableReorgDetection: true,
      enableMevDetection: this.networkConfig.mevProtection,
      ...security
    });
    
    this.metrics = new MetricsCollector({
      component: 'confirmation_tracker',
      labels: { chainId: this.chainId, network: this.networkConfig.name },
      ...monitoring
    });

    // Configuration with network-specific defaults
    this.config = {
      maxConcurrentTracking,
      enableAnalytics,
      enableRealtimeUpdates,
      enableSecurityChecks,
      
      // Confirmation thresholds
      fastConfirmations: customThresholds.fast || this.networkConfig.fastConfirmations,
      safeConfirmations: customThresholds.safe || this.networkConfig.safeConfirmations,
      finalConfirmations: customThresholds.final || this.networkConfig.finalConfirmations,
      defaultConfirmations: customThresholds.default || this.networkConfig.defaultConfirmations,
      maxConfirmations: this.networkConfig.maxConfirmations,
      
      // Performance settings
      pollingInterval: this.networkConfig.pollingInterval,
      batchSize: this.networkConfig.batchSize,
      timeoutBlocks: this.networkConfig.timeoutBlocks,
      reorgDepth: this.networkConfig.reorgDepth,
      
      // Retry and error handling
      retryAttempts: 3,
      retryDelay: 1000,
      retryBackoffMultiplier: 2,
      maxRetryDelay: 30000,
      
      // Cleanup settings
      historyRetention: 86400000,      // 24 hours
      cleanupInterval: 300000,         // 5 minutes
      
      // Performance monitoring
      latencyThreshold: 5000,          // 5 seconds
      errorRateThreshold: 5,           // 5% error rate
      
      // Gas tracking
      enableGasTracking: this.networkConfig.gasTracking,
      gasAnalyticsDepth: 100           // Track last 100 transactions
    };

    // Tracking data structures
    this.activeTracking = new Map();     // txHash -> TrackingData
    this.completedTracking = new Map();  // txHash -> CompletedData
    this.blockConfirmations = new Map(); // blockNumber -> confirmationCount
    this.transactionCache = new Map();   // txHash -> cachedTxData
    this.reorgHistory = [];              // Array of reorg events

    // Performance and analytics
    this.analytics = {
      totalTracked: 0,
      totalConfirmed: 0,
      totalFailed: 0,
      totalRollbacks: 0,
      totalReorgs: 0,
      averageConfirmationTime: 0,
      confirmationDistribution: {},
      gasAnalytics: {
        averageGasUsed: 0,
        gasPriceHistory: [],
        gasEfficiencyStats: {}
      }
    };

    // Network state tracking
    this.currentBlock = 0;
    this.lastBlockHash = null;
    this.lastBlockTimestamp = 0;
    this.blockHistory = [];
    this.networkHealth = {
      blockTimeVariance: 0,
      avgBlockTime: this.networkConfig.avgBlockTime,
      reorgFrequency: 0
    };

    // Performance monitoring
    this.performanceMetrics = {
      latency: [],
      throughput: [],
      errorRate: [],
      confirmationSpeed: []
    };

    // Initialize services
    this.startTime = Date.now();
    this._initializeServices();

    this.logger.info('Production ConfirmationTracker initialized', {
      chainId: this.chainId,
      network: this.networkConfig.name,
      maxConcurrentTracking: this.config.maxConcurrentTracking,
      defaultConfirmations: this.config.defaultConfirmations
    });
  }

  /**
   * Tracks transaction confirmations with comprehensive monitoring
   */
  async trackConfirmations(transactionHash, options = {}) {
    const trackingId = this._generateTrackingId();
    
    try {
      // Validate input parameters
      if (!this._isValidTransactionHash(transactionHash)) {
        throw new RPCError(
          'Invalid transaction hash format',
          CONFIRMATION_TRACKING_ERRORS.INVALID_TRANSACTION_HASH,
          { transactionHash }
        );
      }

      // Check for duplicate tracking
      if (this.activeTracking.has(transactionHash)) {
        throw new RPCError(
          'Transaction already being tracked',
          CONFIRMATION_TRACKING_ERRORS.DUPLICATE_TRACKING,
          { transactionHash, existingTrackingId: this.activeTracking.get(transactionHash).trackingId }
        );
      }

      // Check tracking limits
      if (this.activeTracking.size >= this.config.maxConcurrentTracking) {
        throw new RPCError(
          'Maximum concurrent tracking limit exceeded',
          CONFIRMATION_TRACKING_ERRORS.TRACKING_LIMIT_EXCEEDED,
          { 
            current: this.activeTracking.size,
            maximum: this.config.maxConcurrentTracking
          }
        );
      }

      // Parse and validate options
      const targetConfirmations = this._validateConfirmationCount(
        options.confirmations || this.config.defaultConfirmations
      );

      const timeout = options.timeout || (this.config.timeoutBlocks * this.networkConfig.avgBlockTime);

      // Initialize tracking data
      const trackingData = {
        trackingId,
        transactionHash,
        targetConfirmations,
        currentConfirmations: 0,
        state: CONFIRMATION_STATES.PENDING,
        startTime: Date.now(),
        timeout,
        
        // Transaction metadata
        transaction: null,
        receipt: null,
        blockNumber: null,
        blockHash: null,
        gasUsed: null,
        effectiveGasPrice: null,
        
        // Confirmation tracking
        confirmationHistory: [],
        confirmationBlocks: [],
        firstConfirmationTime: null,
        lastConfirmationTime: null,
        
        // Performance tracking
        latencyData: [],
        retryCount: 0,
        errorHistory: [],
        
        // Security and validation
        securityChecks: {
          mevDetected: false,
          reorgAffected: false,
          gasAnomalyDetected: false
        },
        
        // Configuration
        options: {
          ...options,
          fastConfirmations: options.fastConfirmations || this.config.fastConfirmations,
          safeConfirmations: options.safeConfirmations || this.config.safeConfirmations,
          enableRealtime: options.enableRealtime !== false,
          enableSecurity: options.enableSecurity !== false && this.config.enableSecurityChecks
        },
        
        // Event tracking
        events: [],
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      // Add to active tracking
      this.activeTracking.set(transactionHash, trackingData);
      this.analytics.totalTracked++;

      // Perform initial transaction lookup
      await this._initialTransactionLookup(trackingData);

      // Start confirmation monitoring
      this._startConfirmationMonitoring(trackingData);

      // Add initial event
      this._addTrackingEvent(trackingData, 'tracking_started', {
        trackingId,
        targetConfirmations,
        timeout
      });

      this.logger.info('Confirmation tracking started', {
        trackingId,
        transactionHash,
        targetConfirmations,
        timeout
      });

      // Emit tracking started event
      this.emit('tracking_started', {
        trackingId,
        transactionHash,
        targetConfirmations,
        state: trackingData.state
      });

      return {
        trackingId,
        transactionHash,
        targetConfirmations,
        state: trackingData.state,
        message: 'Confirmation tracking started successfully'
      };

    } catch (error) {
      this.logger.error('Failed to start confirmation tracking', {
        trackingId,
        transactionHash,
        error: error.message,
        stack: error.stack
      });

      throw new RPCError(
        `Confirmation tracking failed: ${error.message}`,
        error.code || CONFIRMATION_TRACKING_ERRORS.INVALID_CONFIGURATION,
        { trackingId, transactionHash, originalError: error }
      );
    }
  }

  /**
   * Gets detailed confirmation status for a transaction
   */
  getConfirmationStatus(transactionHash) {
    // Check active tracking
    if (this.activeTracking.has(transactionHash)) {
      const trackingData = this.activeTracking.get(transactionHash);
      
      return {
        active: true,
        trackingId: trackingData.trackingId,
        transactionHash,
        state: trackingData.state,
        currentConfirmations: trackingData.currentConfirmations,
        targetConfirmations: trackingData.targetConfirmations,
        progress: (trackingData.currentConfirmations / trackingData.targetConfirmations) * 100,
        
        // Timing information
        elapsedTime: Date.now() - trackingData.startTime,
        estimatedTimeRemaining: this._estimateTimeRemaining(trackingData),
        firstConfirmationTime: trackingData.firstConfirmationTime,
        averageConfirmationTime: this._calculateAverageConfirmationTime(trackingData),
        
        // Transaction details
        blockNumber: trackingData.blockNumber,
        blockHash: trackingData.blockHash,
        gasUsed: trackingData.gasUsed,
        effectiveGasPrice: trackingData.effectiveGasPrice,
        
        // Confirmation details
        confirmationHistory: trackingData.confirmationHistory,
        fastThresholdMet: trackingData.currentConfirmations >= trackingData.options.fastConfirmations,
        safeThresholdMet: trackingData.currentConfirmations >= trackingData.options.safeConfirmations,
        
        // Performance metrics
        latency: this._calculateCurrentLatency(trackingData),
        
        // Security information
        securityChecks: trackingData.securityChecks,
        
        // Network information
        networkHealth: this._getNetworkHealth(),
        
        events: trackingData.events,
        updatedAt: trackingData.updatedAt
      };
    }

    // Check completed tracking
    if (this.completedTracking.has(transactionHash)) {
      const completedData = this.completedTracking.get(transactionHash);
      
      return {
        active: false,
        completed: true,
        trackingId: completedData.trackingId,
        transactionHash,
        finalState: completedData.finalState,
        finalConfirmations: completedData.finalConfirmations,
        targetConfirmations: completedData.targetConfirmations,
        progress: 100,
        
        // Timing information
        totalTime: completedData.totalTime,
        firstConfirmationTime: completedData.firstConfirmationTime,
        completionTime: completedData.completionTime,
        averageConfirmationTime: completedData.averageConfirmationTime,
        
        // Final results
        result: completedData.result,
        events: completedData.events,
        completedAt: completedData.completedAt
      };
    }

    return {
      active: false,
      completed: false,
      found: false,
      message: 'Transaction not being tracked'
    };
  }

  /**
   * Gets comprehensive analytics and performance data
   */
  getAnalytics() {
    return {
      summary: {
        activeTracking: this.activeTracking.size,
        completedTracking: this.completedTracking.size,
        totalTracked: this.analytics.totalTracked,
        successRate: this._calculateSuccessRate(),
        averageConfirmationTime: this.analytics.averageConfirmationTime
      },
      
      confirmations: {
        distribution: this.analytics.confirmationDistribution,
        fastThresholdHits: this._calculateThresholdHits('fast'),
        safeThresholdHits: this._calculateThresholdHits('safe'),
        finalThresholdHits: this._calculateThresholdHits('final')
      },
      
      performance: {
        averageLatency: this._calculateAverageLatency(),
        throughput: this._calculateThroughput(),
        errorRate: this._calculateErrorRate(),
        confirmationSpeed: this._calculateConfirmationSpeed()
      },
      
      network: {
        currentBlock: this.currentBlock,
        lastBlockTime: this.lastBlockTimestamp,
        health: this.networkHealth,
        reorgHistory: this.reorgHistory.slice(-10)
      },
      
      gas: this.config.enableGasTracking ? this._getGasAnalytics() : null,
      
      security: {
        totalReorgs: this.analytics.totalReorgs,
        totalRollbacks: this.analytics.totalRollbacks,
        mevDetections: this._countSecurityIncidents('mevDetected'),
        gasAnomalies: this._countSecurityIncidents('gasAnomalyDetected')
      },
      
      states: {
        pending: this._countByState(CONFIRMATION_STATES.PENDING),
        confirming: this._countByState(CONFIRMATION_STATES.CONFIRMING),
        confirmed: this.analytics.totalConfirmed,
        failed: this.analytics.totalFailed,
        dropped: this._countByState(CONFIRMATION_STATES.DROPPED),
        rollback: this.analytics.totalRollbacks
      },
      
      timestamp: new Date().toISOString(),
      uptime: Date.now() - this.startTime
    };
  }

  /**
   * Gets all currently tracked transactions with detailed status
   */
  getActiveTransactions() {
    const transactions = [];
    
    for (const [txHash, trackingData] of this.activeTracking.entries()) {
      transactions.push({
        transactionHash: txHash,
        trackingId: trackingData.trackingId,
        state: trackingData.state,
        currentConfirmations: trackingData.currentConfirmations,
        targetConfirmations: trackingData.targetConfirmations,
        progress: (trackingData.currentConfirmations / trackingData.targetConfirmations) * 100,
        elapsedTime: Date.now() - trackingData.startTime,
        estimatedTimeRemaining: this._estimateTimeRemaining(trackingData),
        blockNumber: trackingData.blockNumber,
        fastThresholdMet: trackingData.currentConfirmations >= trackingData.options.fastConfirmations,
        safeThresholdMet: trackingData.currentConfirmations >= trackingData.options.safeConfirmations,
        securityIssues: this._hasSecurityIssues(trackingData)
      });
    }
    
    return transactions.sort((a, b) => b.elapsedTime - a.elapsedTime);
  }

  /**
   * Stops tracking a specific transaction
   */
  async stopTracking(transactionHash, reason = 'manual_stop') {
    if (!this.activeTracking.has(transactionHash)) {
      return {
        success: false,
        message: 'Transaction not being tracked'
      };
    }

    const trackingData = this.activeTracking.get(transactionHash);
    
    try {
      // Complete tracking with cancellation state
      await this._completeTracking(trackingData, CONFIRMATION_STATES.CANCELLED, {
        reason,
        cancelledAt: Date.now(),
        finalConfirmations: trackingData.currentConfirmations
      });

      this.logger.info('Confirmation tracking stopped', {
        trackingId: trackingData.trackingId,
        transactionHash,
        reason,
        confirmationsAtStop: trackingData.currentConfirmations
      });

      return {
        success: true,
        trackingId: trackingData.trackingId,
        confirmationsAtStop: trackingData.currentConfirmations,
        message: 'Confirmation tracking stopped successfully'
      };

    } catch (error) {
      this.logger.error('Failed to stop confirmation tracking', {
        trackingId: trackingData.trackingId,
        transactionHash,
        reason,
        error: error.message
      });

      return {
        success: false,
        error: error.message,
        message: 'Failed to stop confirmation tracking'
      };
    }
  }

  /**
   * Internal methods
   */

  /**
   * Initializes background services
   */
  _initializeServices() {
    // Block monitoring service
    this._startBlockMonitoring();
    
    // Confirmation processing service
    this._startConfirmationProcessing();
    
    // Cleanup service
    this._startCleanupService();
    
    // Performance monitoring
    if (this.config.enableAnalytics) {
      this._startPerformanceMonitoring();
    }
    
    // Security monitoring
    if (this.config.enableSecurityChecks) {
      this._startSecurityMonitoring();
    }
  }

  /**
   * Starts block monitoring for real-time confirmation updates
   */
  _startBlockMonitoring() {
    const pollBlocks = async () => {
      try {
        const latestBlock = await this.provider.getBlockNumber();
        
        if (latestBlock > this.currentBlock) {
          const previousBlock = this.currentBlock;
          this.currentBlock = latestBlock;
          this.lastBlockTimestamp = Date.now();
          
          // Handle potential reorg
          await this._checkForReorganization(previousBlock, latestBlock);
          
          // Update all confirmations
          await this._updateAllConfirmations();
          
          // Update network health metrics
          this._updateNetworkHealth();
          
          // Emit new block event
          this.emit('new_block', {
            blockNumber: latestBlock,
            timestamp: this.lastBlockTimestamp,
            trackedTransactions: this.activeTracking.size
          });
        }
        
      } catch (error) {
        this.logger.warn('Block monitoring error', { 
          error: error.message,
          currentBlock: this.currentBlock
        });
        
        // Increment error count for performance metrics
        this._recordError('block_monitoring', error);
      }
    };

    // Initial block fetch
    pollBlocks();
    
    // Set up polling interval
    this.blockMonitoringInterval = setInterval(pollBlocks, this.config.pollingInterval);
  }

  /**
   * Starts confirmation processing service
   */
  _startConfirmationProcessing() {
    const processConfirmations = async () => {
      if (this.activeTracking.size === 0) return;

      try {
        // Process transactions in batches
        const transactions = Array.from(this.activeTracking.values());
        const batches = this._createBatches(transactions, this.config.batchSize);
        
        for (const batch of batches) {
          await Promise.allSettled(
            batch.map(trackingData => this._processTransactionConfirmations(trackingData))
          );
        }
        
      } catch (error) {
        this.logger.warn('Confirmation processing error', { error: error.message });
        this._recordError('confirmation_processing', error);
      }
    };

    this.confirmationProcessingInterval = setInterval(
      processConfirmations, 
      this.config.pollingInterval
    );
  }

  /**
   * Performs initial transaction lookup and validation
   */
  async _initialTransactionLookup(trackingData) {
    const startTime = Date.now();
    
    try {
      // Try to get transaction and receipt
      const [transaction, receipt] = await Promise.allSettled([
        this.provider.getTransaction(trackingData.transactionHash),
        this.provider.getTransactionReceipt(trackingData.transactionHash)
      ]);

      // Process transaction data
      if (transaction.status === 'fulfilled' && transaction.value) {
        trackingData.transaction = transaction.value;
        this._addTrackingEvent(trackingData, 'transaction_found', {
          blockNumber: transaction.value.blockNumber,
          from: transaction.value.from,
          to: transaction.value.to,
          value: transaction.value.value?.toString()
        });
      }

      // Process receipt data
      if (receipt.status === 'fulfilled' && receipt.value) {
        trackingData.receipt = receipt.value;
        trackingData.blockNumber = receipt.value.blockNumber;
        trackingData.blockHash = receipt.value.blockHash;
        trackingData.gasUsed = receipt.value.gasUsed?.toString();
        trackingData.effectiveGasPrice = receipt.value.effectiveGasPrice?.toString();
        
        // Check transaction status
        if (receipt.value.status === 0) {
          // Transaction failed
          await this._completeTracking(trackingData, CONFIRMATION_STATES.FAILED, {
            reason: 'transaction_reverted',
            receipt: receipt.value
          });
          return;
        }
        
        // Calculate initial confirmations
        const confirmations = Math.max(0, this.currentBlock - receipt.value.blockNumber + 1);
        trackingData.currentConfirmations = confirmations;
        
        if (confirmations > 0) {
          trackingData.state = CONFIRMATION_STATES.CONFIRMING;
          trackingData.firstConfirmationTime = Date.now();
          
          this._addTrackingEvent(trackingData, 'first_confirmation', {
            blockNumber: receipt.value.blockNumber,
            confirmations
          });
          
          // Check if already confirmed
          if (confirmations >= trackingData.targetConfirmations) {
            await this._completeTracking(trackingData, CONFIRMATION_STATES.CONFIRMED, {
              finalConfirmations: confirmations,
              completionTime: Date.now()
            });
            return;
          }
        }
      }

      // Perform security checks if enabled
      if (trackingData.options.enableSecurity) {
        await this._performSecurityChecks(trackingData);
      }

      // Record lookup latency
      const latency = Date.now() - startTime;
      trackingData.latencyData.push({
        operation: 'initial_lookup',
        latency,
        timestamp: Date.now()
      });

    } catch (error) {
      this.logger.warn('Initial transaction lookup failed', {
        trackingId: trackingData.trackingId,
        transactionHash: trackingData.transactionHash,
        error: error.message
      });
      
      trackingData.errorHistory.push({
        operation: 'initial_lookup',
        error: error.message,
        timestamp: Date.now()
      });
      
      this._addTrackingEvent(trackingData, 'lookup_error', {
        error: error.message,
        retryScheduled: true
      });
    }
  }

  /**
   * Starts confirmation monitoring for a specific transaction
   */
  _startConfirmationMonitoring(trackingData) {
    // Monitoring is handled by the global confirmation processing service
    // This method can be used for transaction-specific monitoring logic
    this._addTrackingEvent(trackingData, 'monitoring_started', {
      pollingInterval: this.config.pollingInterval,
      targetConfirmations: trackingData.targetConfirmations,
      networkConfig: this.networkConfig.name
    });
  }

  /**
   * Processes confirmation updates for a specific transaction
   */
  async _processTransactionConfirmations(trackingData) {
    const startTime = Date.now();
    
    try {
      // Check for timeout
      if (Date.now() - trackingData.startTime > trackingData.timeout) {
        await this._completeTracking(trackingData, CONFIRMATION_STATES.TIMEOUT, {
          reason: 'tracking_timeout',
          timeoutAfter: trackingData.timeout,
          finalConfirmations: trackingData.currentConfirmations
        });
        return;
      }

      // Get current receipt
      const receipt = await this.provider.getTransactionReceipt(trackingData.transactionHash);
      
      if (!receipt) {
        // Transaction not found - might be dropped or pending
        await this._handleMissingTransaction(trackingData);
        return;
      }

      // Check for transaction failure
      if (receipt.status === 0) {
        await this._completeTracking(trackingData, CONFIRMATION_STATES.FAILED, {
          reason: 'transaction_reverted',
          receipt,
          finalConfirmations: 0
        });
        return;
      }

      // Calculate current confirmations
      const newConfirmations = Math.max(0, this.currentBlock - receipt.blockNumber + 1);
      const previousConfirmations = trackingData.currentConfirmations;

      // Check for confirmation rollback (reorg)
      if (newConfirmations < previousConfirmations) {
        await this._handleConfirmationRollback(trackingData, previousConfirmations, newConfirmations);
        return;
      }

      // Update confirmation data
      if (newConfirmations > previousConfirmations) {
        await this._updateConfirmationData(trackingData, receipt, newConfirmations, previousConfirmations);
      }

      // Check if target confirmations reached
      if (newConfirmations >= trackingData.targetConfirmations) {
        await this._completeTracking(trackingData, CONFIRMATION_STATES.CONFIRMED, {
          finalConfirmations: newConfirmations,
          receipt,
          completionTime: Date.now()
        });
      }

      // Record processing latency
      const latency = Date.now() - startTime;
      trackingData.latencyData.push({
        operation: 'confirmation_update',
        latency,
        timestamp: Date.now()
      });

    } catch (error) {
      trackingData.retryCount++;
      trackingData.errorHistory.push({
        operation: 'confirmation_processing',
        error: error.message,
        timestamp: Date.now(),
        retryCount: trackingData.retryCount
      });

      this.logger.warn('Confirmation processing error', {
        trackingId: trackingData.trackingId,
        transactionHash: trackingData.transactionHash,
        error: error.message,
        retryCount: trackingData.retryCount
      });

      // Check if should fail after max retries
      if (trackingData.retryCount >= this.config.retryAttempts) {
        await this._completeTracking(trackingData, CONFIRMATION_STATES.FAILED, {
          reason: 'max_retries_exceeded',
          error: error.message,
          retryCount: trackingData.retryCount
        });
      }

      this._recordError('confirmation_processing', error);
    }
  }

  /**
   * Updates confirmation data when new confirmations are received
   */
  async _updateConfirmationData(trackingData, receipt, newConfirmations, previousConfirmations) {
    // Update basic confirmation data
    trackingData.currentConfirmations = newConfirmations;
    trackingData.lastConfirmationTime = Date.now();
    trackingData.updatedAt = Date.now();

    // Update receipt data if changed
    if (receipt.blockNumber !== trackingData.blockNumber) {
      trackingData.blockNumber = receipt.blockNumber;
      trackingData.blockHash = receipt.blockHash;
      trackingData.gasUsed = receipt.gasUsed?.toString();
      trackingData.effectiveGasPrice = receipt.effectiveGasPrice?.toString();
    }

    // Record first confirmation
    if (previousConfirmations === 0 && newConfirmations > 0) {
      trackingData.state = CONFIRMATION_STATES.CONFIRMING;
      trackingData.firstConfirmationTime = Date.now();
      
      this._addTrackingEvent(trackingData, 'first_confirmation', {
        blockNumber: receipt.blockNumber,
        blockHash: receipt.blockHash,
        gasUsed: trackingData.gasUsed,
        effectiveGasPrice: trackingData.effectiveGasPrice
      });

      this.emit('first_confirmation', {
        trackingId: trackingData.trackingId,
        transactionHash: trackingData.transactionHash,
        blockNumber: receipt.blockNumber,
        gasUsed: trackingData.gasUsed
      });
    }

    // Record confirmation history
    trackingData.confirmationHistory.push({
      confirmations: newConfirmations,
      blockNumber: receipt.blockNumber,
      timestamp: Date.now()
    });

    // Trim confirmation history to prevent memory bloat
    if (trackingData.confirmationHistory.length > 100) {
      trackingData.confirmationHistory = trackingData.confirmationHistory.slice(-100);
    }

    // Add confirmation blocks to tracking
    if (!trackingData.confirmationBlocks.includes(receipt.blockNumber)) {
      trackingData.confirmationBlocks.push(receipt.blockNumber);
    }

    // Check confirmation thresholds
    await this._checkConfirmationThresholds(trackingData, newConfirmations, previousConfirmations);

    // Perform ongoing security checks
    if (trackingData.options.enableSecurity) {
      await this._performOngoingSecurityChecks(trackingData, receipt);
    }

    // Update analytics
    this._updateConfirmationAnalytics(trackingData, newConfirmations);

    // Emit confirmation update event
    this.emit('confirmation_update', {
      trackingId: trackingData.trackingId,
      transactionHash: trackingData.transactionHash,
      currentConfirmations: newConfirmations,
      targetConfirmations: trackingData.targetConfirmations,
      progress: (newConfirmations / trackingData.targetConfirmations) * 100,
      blockNumber: receipt.blockNumber
    });

    this._addTrackingEvent(trackingData, 'confirmation_update', {
      previousConfirmations,
      newConfirmations,
      blockNumber: receipt.blockNumber,
      progress: (newConfirmations / trackingData.targetConfirmations) * 100
    });
  }

  /**
   * Checks and emits events for confirmation thresholds
   */
  async _checkConfirmationThresholds(trackingData, newConfirmations, previousConfirmations) {
    const thresholds = [
      { name: 'fast', count: trackingData.options.fastConfirmations },
      { name: 'safe', count: trackingData.options.safeConfirmations },
      { name: 'final', count: this.config.finalConfirmations }
    ];

    for (const threshold of thresholds) {
      if (newConfirmations >= threshold.count && previousConfirmations < threshold.count) {
        this._addTrackingEvent(trackingData, `${threshold.name}_threshold_reached`, {
          threshold: threshold.count,
          confirmations: newConfirmations,
          elapsedTime: Date.now() - trackingData.startTime
        });

        this.emit(`${threshold.name}_threshold_reached`, {
          trackingId: trackingData.trackingId,
          transactionHash: trackingData.transactionHash,
          threshold: threshold.count,
          confirmations: newConfirmations,
          elapsedTime: Date.now() - trackingData.startTime
        });
      }
    }
  }

  /**
   * Handles missing transaction (dropped or pending)
   */
  async _handleMissingTransaction(trackingData) {
    // Check if transaction exists in mempool
    try {
      const transaction = await this.provider.getTransaction(trackingData.transactionHash);
      
      if (!transaction) {
        // Transaction completely missing - likely dropped
        await this._completeTracking(trackingData, CONFIRMATION_STATES.DROPPED, {
          reason: 'transaction_dropped',
          lastSeen: trackingData.lastConfirmationTime || trackingData.startTime
        });
      } else {
        // Transaction exists but not mined yet
        if (trackingData.currentConfirmations > 0) {
          // Was confirmed before, now missing - potential reorg
          this._addTrackingEvent(trackingData, 'transaction_unconfirmed', {
            previousConfirmations: trackingData.currentConfirmations,
            reason: 'potential_reorg'
          });
          
          trackingData.currentConfirmations = 0;
          trackingData.state = CONFIRMATION_STATES.PENDING;
          trackingData.securityChecks.reorgAffected = true;
        }
      }
    } catch (error) {
      this.logger.warn('Error checking missing transaction', {
        trackingId: trackingData.trackingId,
        transactionHash: trackingData.transactionHash,
        error: error.message
      });
    }
  }

  /**
   * Handles confirmation rollback due to reorganization
   */
  async _handleConfirmationRollback(trackingData, previousConfirmations, newConfirmations) {
    this.analytics.totalRollbacks++;
    trackingData.securityChecks.reorgAffected = true;

    this._addTrackingEvent(trackingData, 'confirmation_rollback', {
      previousConfirmations,
      newConfirmations,
      rollbackAmount: previousConfirmations - newConfirmations,
      timestamp: Date.now()
    });

    this.logger.warn('Confirmation rollback detected', {
      trackingId: trackingData.trackingId,
      transactionHash: trackingData.transactionHash,
      previousConfirmations,
      newConfirmations,
      rollbackAmount: previousConfirmations - newConfirmations
    });

    // Update confirmation data
    trackingData.currentConfirmations = newConfirmations;
    trackingData.updatedAt = Date.now();
    
    // Update state if necessary
    if (newConfirmations === 0) {
      trackingData.state = CONFIRMATION_STATES.PENDING;
    }

    // Emit rollback event
    this.emit('confirmation_rollback', {
      trackingId: trackingData.trackingId,
      transactionHash: trackingData.transactionHash,
      previousConfirmations,
      newConfirmations,
      rollbackAmount: previousConfirmations - newConfirmations
    });

    // Check if rollback is too severe
    const rollbackAmount = previousConfirmations - newConfirmations;
    if (rollbackAmount > this.config.reorgDepth) {
      this._addTrackingEvent(trackingData, 'severe_rollback_detected', {
        rollbackAmount,
        reorgDepth: this.config.reorgDepth,
        severity: 'critical'
      });
    }
  }

  /**
   * Checks for blockchain reorganization
   */
  async _checkForReorganization(previousBlock, latestBlock) {
    // Check for large block number jumps or rollbacks
    const blockDifference = latestBlock - previousBlock;
    
    if (blockDifference < 0) {
      // Block number decreased - major reorg
      this._handleMajorReorganization(previousBlock, latestBlock);
    } else if (blockDifference > 10) {
      // Large block jump - potential sync issue or missed blocks
      this._handleLargeBlockJump(previousBlock, latestBlock);
    } else if (blockDifference > 1) {
      // Missed some blocks - check for reorg
      await this._checkMissedBlocks(previousBlock, latestBlock);
    }
  }

  /**
   * Handles major blockchain reorganization
   */
  _handleMajorReorganization(previousBlock, latestBlock) {
    const reorgEvent = {
      type: 'major_reorg',
      previousBlock,
      newBlock: latestBlock,
      depth: previousBlock - latestBlock,
      timestamp: Date.now(),
      affectedTransactions: []
    };

    this.analytics.totalReorgs++;
    this.reorgHistory.push(reorgEvent);

    this.logger.error('Major blockchain reorganization detected', {
      previousBlock,
      newBlock: latestBlock,
      depth: reorgEvent.depth
    });

    // Mark all active transactions as potentially affected
    for (const trackingData of this.activeTracking.values()) {
      if (trackingData.blockNumber && trackingData.blockNumber > latestBlock) {
        trackingData.securityChecks.reorgAffected = true;
        reorgEvent.affectedTransactions.push(trackingData.transactionHash);
        
        this._addTrackingEvent(trackingData, 'major_reorg_detected', {
          previousBlock,
          newBlock: latestBlock,
          depth: reorgEvent.depth
        });
      }
    }

    this.emit('major_reorg_detected', reorgEvent);
  }

  /**
   * Handles large block number jumps
   */
  _handleLargeBlockJump(previousBlock, latestBlock) {
    this.logger.warn('Large block number jump detected', {
      previousBlock,
      latestBlock,
      missedBlocks: latestBlock - previousBlock - 1
    });

    this._addTrackingEvent(null, 'large_block_jump', {
      previousBlock,
      latestBlock,
      missedBlocks: latestBlock - previousBlock - 1
    });
  }

  /**
   * Checks for reorgs in missed blocks
   */
  async _checkMissedBlocks(previousBlock, latestBlock) {
    // This could be implemented to check block hashes for reorgs
    // For now, we'll just log the missed blocks
    this.logger.debug('Missed blocks detected', {
      previousBlock,
      latestBlock,
      missedCount: latestBlock - previousBlock - 1
    });
  }

  /**
   * Updates all active confirmations
   */
  async _updateAllConfirmations() {
    const updatePromises = [];
    
    for (const trackingData of this.activeTracking.values()) {
      updatePromises.push(this._processTransactionConfirmations(trackingData));
    }
    
    // Process all updates concurrently
    await Promise.allSettled(updatePromises);
  }

  /**
   * Performs security checks on transaction
   */
  async _performSecurityChecks(trackingData) {
    try {
      if (!trackingData.transaction || !trackingData.receipt) return;

      // MEV detection
      if (this.networkConfig.mevProtection) {
        await this._checkForMevActivity(trackingData);
      }

      // Gas anomaly detection
      if (this.config.enableGasTracking) {
        await this._checkGasAnomalies(trackingData);
      }

      // Smart contract interaction analysis
      if (trackingData.transaction.to && trackingData.transaction.data && trackingData.transaction.data !== '0x') {
        await this._analyzeSmartContractInteraction(trackingData);
      }

    } catch (error) {
      this.logger.warn('Security check failed', {
        trackingId: trackingData.trackingId,
        error: error.message
      });
    }
  }

  /**
   * Performs ongoing security checks during confirmation process
   */
  async _performOngoingSecurityChecks(trackingData, receipt) {
    try {
      // Check for gas price manipulation
      if (this.config.enableGasTracking && trackingData.effectiveGasPrice) {
        const gasPrice = BigInt(trackingData.effectiveGasPrice);
        if (gasPrice > this.networkConfig.priorityFeeThreshold * BigInt(10)) {
          trackingData.securityChecks.gasAnomalyDetected = true;
          
          this._addTrackingEvent(trackingData, 'gas_anomaly_detected', {
            effectiveGasPrice: trackingData.effectiveGasPrice,
            threshold: this.networkConfig.priorityFeeThreshold.toString()
          });
        }
      }

      // Check for unusual confirmation patterns
      if (trackingData.confirmationHistory.length > 1) {
        await this._checkConfirmationPatterns(trackingData);
      }

    } catch (error) {
      this.logger.warn('Ongoing security check failed', {
        trackingId: trackingData.trackingId,
        error: error.message
      });
    }
  }

  /**
   * Checks for MEV (Maximal Extractable Value) activity
   */
  async _checkForMevActivity(trackingData) {
    // This would implement MEV detection logic
    // For now, we'll check for suspicious gas prices and timing
    
    if (trackingData.effectiveGasPrice) {
      const gasPrice = BigInt(trackingData.effectiveGasPrice);
      const threshold = this.networkConfig.priorityFeeThreshold * BigInt(5); // 5x threshold
      
      if (gasPrice > threshold) {
        trackingData.securityChecks.mevDetected = true;
        
        this._addTrackingEvent(trackingData, 'potential_mev_detected', {
          effectiveGasPrice: trackingData.effectiveGasPrice,
          threshold: threshold.toString(),
          severity: 'medium'
        });
      }
    }
  }

  /**
   * Checks for gas anomalies
   */
  async _checkGasAnomalies(trackingData) {
    if (!trackingData.gasUsed || !trackingData.effectiveGasPrice) return;

    const gasUsed = BigInt(trackingData.gasUsed);
    const gasPrice = BigInt(trackingData.effectiveGasPrice);
    
    // Check for unusually high gas usage
    if (gasUsed > BigInt(1000000)) { // 1M gas
      trackingData.securityChecks.gasAnomalyDetected = true;
      
      this._addTrackingEvent(trackingData, 'high_gas_usage_detected', {
        gasUsed: trackingData.gasUsed,
        threshold: '1000000'
      });
    }
    
    // Check for unusually high gas price
    if (gasPrice > this.networkConfig.priorityFeeThreshold * BigInt(20)) {
      trackingData.securityChecks.gasAnomalyDetected = true;
      
      this._addTrackingEvent(trackingData, 'high_gas_price_detected', {
        effectiveGasPrice: trackingData.effectiveGasPrice,
        threshold: (this.networkConfig.priorityFeeThreshold * BigInt(20)).toString()
      });
    }
  }

  /**
   * Analyzes smart contract interactions
   */
  async _analyzeSmartContractInteraction(trackingData) {
    // This would implement smart contract analysis
    // For now, we'll just record the interaction
    
    this._addTrackingEvent(trackingData, 'smart_contract_interaction', {
      to: trackingData.transaction.to,
      dataLength: trackingData.transaction.data.length,
      value: trackingData.transaction.value?.toString()
    });
  }

  /**
   * Checks confirmation patterns for anomalies
   */
  async _checkConfirmationPatterns(trackingData) {
    const history = trackingData.confirmationHistory;
    if (history.length < 3) return;

    // Check for irregular confirmation timing
    const recent = history.slice(-3);
    const timeDifferences = [];
    
    for (let i = 1; i < recent.length; i++) {
      timeDifferences.push(recent[i].timestamp - recent[i-1].timestamp);
    }
    
    const avgDiff = timeDifferences.reduce((sum, diff) => sum + diff, 0) / timeDifferences.length;
    const expectedDiff = this.networkConfig.avgBlockTime;
    
    // If confirmation timing is significantly different from expected
    if (Math.abs(avgDiff - expectedDiff) > expectedDiff * 0.5) {
      this._addTrackingEvent(trackingData, 'irregular_confirmation_timing', {
        averageTimeDiff: avgDiff,
        expectedTimeDiff: expectedDiff,
        variance: Math.abs(avgDiff - expectedDiff)
      });
    }
  }

  /**
   * Completes tracking and moves to completed state
   */
  async _completeTracking(trackingData, finalState, result = {}) {
    const totalTime = Date.now() - trackingData.startTime;
    
    // Calculate final metrics
    const averageConfirmationTime = trackingData.confirmationHistory.length > 1 ?
      this._calculateAverageConfirmationTime(trackingData) : 0;

    // Update analytics based on final state
    this._updateFinalAnalytics(finalState, totalTime, trackingData);

    // Create completed tracking data
    const completedData = {
      trackingId: trackingData.trackingId,
      transactionHash: trackingData.transactionHash,
      finalState,
      finalConfirmations: trackingData.currentConfirmations,
      targetConfirmations: trackingData.targetConfirmations,
      totalTime,
      averageConfirmationTime,
      
      // Timing data
      firstConfirmationTime: trackingData.firstConfirmationTime,
      completionTime: Date.now(),
      
      // Transaction data
      blockNumber: trackingData.blockNumber,
      blockHash: trackingData.blockHash,
      gasUsed: trackingData.gasUsed,
      effectiveGasPrice: trackingData.effectiveGasPrice,
      
      // Performance data
      latencyData: trackingData.latencyData,
      errorHistory: trackingData.errorHistory,
      
      // Security data
      securityChecks: trackingData.securityChecks,
      
      // Result data
      result,
      events: trackingData.events,
      completedAt: Date.now()
    };

    // Add final event
    this._addTrackingEvent(trackingData, 'tracking_completed', {
      finalState,
      totalTime,
      finalConfirmations: trackingData.currentConfirmations,
      result
    });

    // Move to completed tracking
    this.completedTracking.set(trackingData.transactionHash, completedData);
    this.activeTracking.delete(trackingData.transactionHash);

    // Emit completion event
    this.emit('tracking_completed', {
      trackingId: trackingData.trackingId,
      transactionHash: trackingData.transactionHash,
      finalState,
      totalTime,
      finalConfirmations: trackingData.currentConfirmations,
      targetConfirmations: trackingData.targetConfirmations
    });

    this.logger.info('Confirmation tracking completed', {
      trackingId: trackingData.trackingId,
      transactionHash: trackingData.transactionHash,
      finalState,
      totalTime,
      finalConfirmations: trackingData.currentConfirmations,
      targetConfirmations: trackingData.targetConfirmations
    });
  }

  /**
   * Updates network health metrics
   */
  _updateNetworkHealth() {
    // Calculate block time variance
    if (this.blockHistory.length > 0) {
      const recentBlocks = this.blockHistory.slice(-10);
      const blockTimes = [];
      
      for (let i = 1; i < recentBlocks.length; i++) {
        blockTimes.push(recentBlocks[i].timestamp - recentBlocks[i-1].timestamp);
      }
      
      if (blockTimes.length > 0) {
        const avgBlockTime = blockTimes.reduce((sum, time) => sum + time, 0) / blockTimes.length;
        const variance = blockTimes.reduce((sum, time) => sum + Math.pow(time - avgBlockTime, 2), 0) / blockTimes.length;
        
        this.networkHealth.avgBlockTime = avgBlockTime;
        this.networkHealth.blockTimeVariance = Math.sqrt(variance);
      }
    }
    
    // Add current block to history
    this.blockHistory.push({
      blockNumber: this.currentBlock,
      timestamp: this.lastBlockTimestamp
    });
    
    // Trim block history
    if (this.blockHistory.length > 100) {
      this.blockHistory = this.blockHistory.slice(-100);
    }
    
    // Calculate reorg frequency
    const recentReorgs = this.reorgHistory.filter(
      reorg => Date.now() - reorg.timestamp < 86400000 // Last 24 hours
    );
    this.networkHealth.reorgFrequency = recentReorgs.length;
  }

  /**
   * Starts cleanup service for old data
   */
  _startCleanupService() {
    const cleanup = () => {
      const now = Date.now();
      const maxAge = this.config.historyRetention;
      
      // Clean up completed tracking data
      for (const [txHash, completedData] of this.completedTracking.entries()) {
        if (now - completedData.completedAt > maxAge) {
          this.completedTracking.delete(txHash);
        }
      }
      
      // Clean up transaction cache
      for (const [txHash, cachedData] of this.transactionCache.entries()) {
        if (now - cachedData.timestamp > maxAge) {
          this.transactionCache.delete(txHash);
        }
      }
      
      // Clean up reorg history
      this.reorgHistory = this.reorgHistory.filter(
        reorg => now - reorg.timestamp <= maxAge
      );
      
      // Clean up performance metrics
      const maxMetrics = 10000;
      if (this.performanceMetrics.latency.length > maxMetrics) {
        this.performanceMetrics.latency = this.performanceMetrics.latency.slice(-maxMetrics);
      }
      if (this.performanceMetrics.throughput.length > maxMetrics) {
        this.performanceMetrics.throughput = this.performanceMetrics.throughput.slice(-maxMetrics);
      }
      if (this.performanceMetrics.errorRate.length > maxMetrics) {
        this.performanceMetrics.errorRate = this.performanceMetrics.errorRate.slice(-maxMetrics);
      }
      if (this.performanceMetrics.confirmationSpeed.length > maxMetrics) {
        this.performanceMetrics.confirmationSpeed = this.performanceMetrics.confirmationSpeed.slice(-maxMetrics);
      }
    };

    this.cleanupInterval = setInterval(cleanup, this.config.cleanupInterval);
  }

  /**
   * Starts performance monitoring service
   */
  _startPerformanceMonitoring() {
    const updateMetrics = () => {
      // Update throughput metrics
      const now = Date.now();
      const oneMinuteAgo = now - 60000;
      
      const recentCompletions = Array.from(this.completedTracking.values())
        .filter(data => data.completedAt > oneMinuteAgo).length;
      
      this.performanceMetrics.throughput.push({
        value: recentCompletions,
        timestamp: now
      });
      
      // Update error rate
      const errorRate = this._calculateCurrentErrorRate();
      this.performanceMetrics.errorRate.push({
        value: errorRate,
        timestamp: now
      });
      
      // Update confirmation speed
      const confirmationSpeed = this._calculateCurrentConfirmationSpeed();
      this.performanceMetrics.confirmationSpeed.push({
        value: confirmationSpeed,
        timestamp: now
      });
    };

    this.performanceMonitoringInterval = setInterval(updateMetrics, 60000); // Every minute
  }

  /**
   * Starts security monitoring service
   */
  _startSecurityMonitoring() {
    const securityCheck = () => {
      // Check for security incidents across all active tracking
      let mevDetections = 0;
      let gasAnomalies = 0;
      let reorgAffected = 0;
      
      for (const trackingData of this.activeTracking.values()) {
        if (trackingData.securityChecks.mevDetected) mevDetections++;
        if (trackingData.securityChecks.gasAnomalyDetected) gasAnomalies++;
        if (trackingData.securityChecks.reorgAffected) reorgAffected++;
      }
      
      // Emit security summary if any issues found
      if (mevDetections > 0 || gasAnomalies > 0 || reorgAffected > 0) {
        this.emit('security_summary', {
          mevDetections,
          gasAnomalies,
          reorgAffected,
          timestamp: Date.now()
        });
      }
    };

    this.securityMonitoringInterval = setInterval(securityCheck, 300000); // Every 5 minutes
  }

  /**
   * Helper methods for calculations and utilities
   */

  _validateConfirmationCount(confirmations) {
    if (typeof confirmations !== 'number' || confirmations < 1 || confirmations > this.config.maxConfirmations) {
      throw new RPCError(
        `Invalid confirmation count: ${confirmations}. Must be between 1 and ${this.config.maxConfirmations}`,
        CONFIRMATION_TRACKING_ERRORS.INVALID_CONFIRMATION_COUNT
      );
    }
    return confirmations;
  }

  _isValidTransactionHash(hash) {
    return typeof hash === 'string' && 
           hash.length === 66 && 
           hash.startsWith('0x') && 
           /^0x[a-fA-F0-9]{64}$/.test(hash);
  }

  _generateTrackingId() {
    return `conf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  _addTrackingEvent(trackingData, eventType, eventData = {}) {
    const event = {
      type: eventType,
      timestamp: Date.now(),
      data: eventData
    };
    
    if (trackingData) {
      trackingData.events.push(event);
      trackingData.updatedAt = Date.now();
    }
    
    // Also emit as system event for global monitoring
    this.emit('tracking_event', {
      eventType,
      trackingId: trackingData?.trackingId,
      transactionHash: trackingData?.transactionHash,
      data: eventData,
      timestamp: event.timestamp
    });
  }

  _createBatches(array, batchSize) {
    const batches = [];
    for (let i = 0; i < array.length; i += batchSize) {
      batches.push(array.slice(i, i + batchSize));
    }
    return batches;
  }

  _estimateTimeRemaining(trackingData) {
    if (trackingData.currentConfirmations >= trackingData.targetConfirmations) {
      return 0;
    }
    
    const remainingConfirmations = trackingData.targetConfirmations - trackingData.currentConfirmations;
    const avgBlockTime = this.networkHealth.avgBlockTime || this.networkConfig.avgBlockTime;
    
    return remainingConfirmations * avgBlockTime;
  }

  _calculateAverageConfirmationTime(trackingData) {
    if (!trackingData.firstConfirmationTime || trackingData.confirmationHistory.length < 2) {
      return 0;
    }
    
    const totalTime = trackingData.lastConfirmationTime - trackingData.firstConfirmationTime;
    const confirmationCount = trackingData.currentConfirmations - 1; // Excluding first confirmation
    
    return confirmationCount > 0 ? totalTime / confirmationCount : 0;
  }

  _calculateCurrentLatency(trackingData) {
    if (trackingData.latencyData.length === 0) return 0;
    
    const recent = trackingData.latencyData.slice(-5); // Last 5 operations
    return recent.reduce((sum, data) => sum + data.latency, 0) / recent.length;
  }

  _hasSecurityIssues(trackingData) {
    return trackingData.securityChecks.mevDetected ||
           trackingData.securityChecks.gasAnomalyDetected ||
           trackingData.securityChecks.reorgAffected;
  }

  _getNetworkHealth() {
    return {
      currentBlock: this.currentBlock,
      lastBlockTime: this.lastBlockTimestamp,
      avgBlockTime: this.networkHealth.avgBlockTime,
      blockTimeVariance: this.networkHealth.blockTimeVariance,
      reorgFrequency: this.networkHealth.reorgFrequency,
      status: this._getNetworkStatus()
    };
  }

  _getNetworkStatus() {
    const now = Date.now();
    const timeSinceLastBlock = now - this.lastBlockTimestamp;
    const expectedBlockTime = this.networkConfig.avgBlockTime;
    
    if (timeSinceLastBlock > expectedBlockTime * 3) {
      return 'degraded';
    } else if (timeSinceLastBlock > expectedBlockTime * 2) {
      return 'slow';
    }
    return 'healthy';
  }

  _updateConfirmationAnalytics(trackingData, confirmations) {
    // Update confirmation distribution
    if (!this.analytics.confirmationDistribution[confirmations]) {
      this.analytics.confirmationDistribution[confirmations] = 0;
    }
    this.analytics.confirmationDistribution[confirmations]++;
    
    // Update gas analytics if enabled
    if (this.config.enableGasTracking && trackingData.gasUsed && trackingData.effectiveGasPrice) {
      this._updateGasAnalytics(trackingData);
    }
  }

  _updateGasAnalytics(trackingData) {
    const gasData = {
      gasUsed: BigInt(trackingData.gasUsed),
      effectiveGasPrice: BigInt(trackingData.effectiveGasPrice),
      timestamp: Date.now(),
      transactionHash: trackingData.transactionHash
    };
    
    this.analytics.gasAnalytics.gasPriceHistory.push(gasData);
    
    // Trim gas history
    if (this.analytics.gasAnalytics.gasPriceHistory.length > this.config.gasAnalyticsDepth) {
      this.analytics.gasAnalytics.gasPriceHistory = 
        this.analytics.gasAnalytics.gasPriceHistory.slice(-this.config.gasAnalyticsDepth);
    }
    
    // Update average gas used
    const totalGasUsed = this.analytics.gasAnalytics.gasPriceHistory
      .reduce((sum, data) => sum + data.gasUsed, BigInt(0));
    this.analytics.gasAnalytics.averageGasUsed = 
      Number(totalGasUsed / BigInt(this.analytics.gasAnalytics.gasPriceHistory.length));
  }

  _updateFinalAnalytics(finalState, totalTime, trackingData) {
    switch (finalState) {
      case CONFIRMATION_STATES.CONFIRMED:
        this.analytics.totalConfirmed++;
        this._updateAverageConfirmationTime(totalTime);
        break;
      case CONFIRMATION_STATES.FAILED:
        this.analytics.totalFailed++;
        break;
      case CONFIRMATION_STATES.DROPPED:
        // Count as failed for success rate calculation
        this.analytics.totalFailed++;
        break;
      case CONFIRMATION_STATES.ROLLBACK:
        this.analytics.totalRollbacks++;
        break;
    }
  }

  _updateAverageConfirmationTime(totalTime) {
    const currentAverage = this.analytics.averageConfirmationTime;
    const count = this.analytics.totalConfirmed;
    
    this.analytics.averageConfirmationTime = 
      ((currentAverage * (count - 1)) + totalTime) / count;
  }

  _calculateSuccessRate() {
    const total = this.analytics.totalConfirmed + this.analytics.totalFailed;
    return total > 0 ? (this.analytics.totalConfirmed / total) * 100 : 0;
  }

  _calculateThresholdHits(thresholdType) {
    let hits = 0;
    for (const completedData of this.completedTracking.values()) {
      const threshold = this._getThresholdValue(thresholdType);
      if (completedData.finalConfirmations >= threshold) {
        hits++;
      }
    }
    return hits;
  }

  _getThresholdValue(thresholdType) {
    switch (thresholdType) {
      case 'fast': return this.config.fastConfirmations;
      case 'safe': return this.config.safeConfirmations;
      case 'final': return this.config.finalConfirmations;
      default: return this.config.defaultConfirmations;
    }
  }

  _calculateAverageLatency() {
    const allLatency = [];
    for (const trackingData of this.activeTracking.values()) {
      allLatency.push(...trackingData.latencyData.map(d => d.latency));
    }
    for (const completedData of this.completedTracking.values()) {
      allLatency.push(...completedData.latencyData.map(d => d.latency));
    }
    
    return allLatency.length > 0 ? 
      allLatency.reduce((sum, latency) => sum + latency, 0) / allLatency.length : 0;
  }

  _calculateThroughput() {
    const now = Date.now();
    const oneHourAgo = now - 3600000; // 1 hour
    
    const recentCompletions = Array.from(this.completedTracking.values())
      .filter(data => data.completedAt > oneHourAgo).length;
    
    return recentCompletions; // Transactions per hour
  }

  _calculateErrorRate() {
    const recent = this.performanceMetrics.errorRate.slice(-10);
    return recent.length > 0 ? 
      recent.reduce((sum, data) => sum + data.value, 0) / recent.length : 0;
  }

  _calculateConfirmationSpeed() {
    const recent = this.performanceMetrics.confirmationSpeed.slice(-10);
    return recent.length > 0 ?
      recent.reduce((sum, data) => sum + data.value, 0) / recent.length : 0;
  }

  _calculateCurrentErrorRate() {
    const now = Date.now();
    const fiveMinutesAgo = now - 300000;
    
    const recentCompleted = Array.from(this.completedTracking.values())
      .filter(data => data.completedAt > fiveMinutesAgo);
    
    if (recentCompleted.length === 0) return 0;
    
    const failedCount = recentCompleted.filter(data => 
      data.finalState === CONFIRMATION_STATES.FAILED ||
      data.finalState === CONFIRMATION_STATES.DROPPED ||
      data.finalState === CONFIRMATION_STATES.TIMEOUT
    ).length;
    
    return (failedCount / recentCompleted.length) * 100;
  }

  _calculateCurrentConfirmationSpeed() {
    const recentCompleted = Array.from(this.completedTracking.values()).slice(-10);
    
    if (recentCompleted.length === 0) return 0;
    
    const avgTime = recentCompleted
      .filter(data => data.finalState === CONFIRMATION_STATES.CONFIRMED)
      .reduce((sum, data) => sum + data.totalTime, 0) / recentCompleted.length;
    
    return avgTime > 0 ? 1000 / avgTime : 0; // Confirmations per second
  }

  _getGasAnalytics() {
    const gasHistory = this.analytics.gasAnalytics.gasPriceHistory;
    
    if (gasHistory.length === 0) {
      return {
        averageGasUsed: 0,
        averageGasPrice: 0,
        maxGasPrice: 0,
        minGasPrice: 0,
        gasPriceTrend: 'stable',
        totalTransactions: 0
      };
    }
    
    const gasPrices = gasHistory.map(data => Number(data.effectiveGasPrice));
    const avgGasPrice = gasPrices.reduce((sum, price) => sum + price, 0) / gasPrices.length;
    
    return {
      averageGasUsed: this.analytics.gasAnalytics.averageGasUsed,
      averageGasPrice: avgGasPrice,
      maxGasPrice: Math.max(...gasPrices),
      minGasPrice: Math.min(...gasPrices),
      gasPriceTrend: this._calculateGasPriceTrend(gasPrices),
      totalTransactions: gasHistory.length
    };
  }

  _calculateGasPriceTrend(gasPrices) {
    if (gasPrices.length < 10) return 'stable';
    
    const recent = gasPrices.slice(-10);
    const firstHalf = recent.slice(0, 5);
    const secondHalf = recent.slice(5);
    
    const firstAvg = firstHalf.reduce((sum, price) => sum + price, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, price) => sum + price, 0) / secondHalf.length;
    
    const change = ((secondAvg - firstAvg) / firstAvg) * 100;
    
    if (change > 10) return 'increasing';
    if (change < -10) return 'decreasing';
    return 'stable';
  }

  _countByState(state) {
    let count = 0;
    for (const trackingData of this.activeTracking.values()) {
      if (trackingData.state === state) count++;
    }
    return count;
  }

  _countSecurityIncidents(incidentType) {
    let count = 0;
    for (const trackingData of this.activeTracking.values()) {
      if (trackingData.securityChecks[incidentType]) count++;
    }
    for (const completedData of this.completedTracking.values()) {
      if (completedData.securityChecks && completedData.securityChecks[incidentType]) count++;
    }
    return count;
  }

  _recordError(operation, error) {
    this.logger.warn(`Error in ${operation}`, {
      error: error.message,
      stack: error.stack,
      timestamp: Date.now()
    });
    
    // Record for performance metrics
    this.performanceMetrics.latency.push({
      operation,
      latency: this.config.latencyThreshold, // Use threshold as error latency
      timestamp: Date.now(),
      error: true
    });
  }

  /**
   * Public management methods
   */

  /**
   * Updates tracker configuration
   */
  updateConfig(newConfig) {
    const oldConfig = { ...this.config };
    this.config = { ...this.config, ...newConfig };
    
    // Restart intervals if changed
    if (newConfig.pollingInterval && newConfig.pollingInterval !== oldConfig.pollingInterval) {
      this._restartPollingIntervals();
    }
    
    this.logger.info('ConfirmationTracker configuration updated', {
      updatedFields: Object.keys(newConfig),
      oldPollingInterval: oldConfig.pollingInterval,
      newPollingInterval: this.config.pollingInterval
    });
  }

  /**
   * Restarts polling intervals with new configuration
   */
  _restartPollingIntervals() {
    // Clear existing intervals
    if (this.blockMonitoringInterval) {
      clearInterval(this.blockMonitoringInterval);
    }
    if (this.confirmationProcessingInterval) {
      clearInterval(this.confirmationProcessingInterval);
    }
    
    // Restart with new intervals
    this._startBlockMonitoring();
    this._startConfirmationProcessing();
  }

  /**
   * Forces refresh of all confirmation statuses
   */
  async forceRefreshAll() {
    this.logger.info('Forcing refresh of all confirmation statuses', {
      activeTransactions: this.activeTracking.size
    });
    
    try {
      await this._updateAllConfirmations();
      
      return {
        success: true,
        refreshedTransactions: this.activeTracking.size,
        timestamp: Date.now()
      };
    } catch (error) {
      this.logger.error('Failed to refresh all confirmations', {
        error: error.message
      });
      
      return {
        success: false,
        error: error.message,
        timestamp: Date.now()
      };
    }
  }

  /**
   * Gets detailed statistics and health information
   */
  getDetailedStats() {
    return {
      tracker: 'ConfirmationTracker',
      version: '1.0.0',
      chainId: this.chainId,
      network: this.networkConfig.name,
      
      configuration: {
        maxConcurrentTracking: this.config.maxConcurrentTracking,
        defaultConfirmations: this.config.defaultConfirmations,
        fastConfirmations: this.config.fastConfirmations,
        safeConfirmations: this.config.safeConfirmations,
        finalConfirmations: this.config.finalConfirmations,
        pollingInterval: this.config.pollingInterval,
        enableAnalytics: this.config.enableAnalytics,
        enableSecurityChecks: this.config.enableSecurityChecks
      },
      
      performance: {
        activeTracking: this.activeTracking.size,
        completedTracking: this.completedTracking.size,
        averageLatency: this._calculateAverageLatency(),
        throughput: this._calculateThroughput(),
        errorRate: this._calculateErrorRate(),
        uptime: Date.now() - this.startTime
      },
      
      network: this._getNetworkHealth(),
      analytics: this.getAnalytics(),
      
      memory: {
        activeTrackingSize: this.activeTracking.size,
        completedTrackingSize: this.completedTracking.size,
        blockCacheSize: this.blockConfirmations.size,
        transactionCacheSize: this.transactionCache.size,
        reorgHistorySize: this.reorgHistory.length
      },
      
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Clears historical data to free memory
   */
  clearHistory(olderThan = 0) {
    const cutoff = Date.now() - olderThan;
    let cleared = 0;
    
    // Clear completed tracking
    for (const [txHash, completedData] of this.completedTracking.entries()) {
      if (completedData.completedAt < cutoff) {
        this.completedTracking.delete(txHash);
        cleared++;
      }
    }
    
    // Clear transaction cache
    for (const [txHash, cachedData] of this.transactionCache.entries()) {
      if (cachedData.timestamp < cutoff) {
        this.transactionCache.delete(txHash);
        cleared++;
      }
    }
    
    // Clear reorg history
    const originalReorgCount = this.reorgHistory.length;
    this.reorgHistory = this.reorgHistory.filter(reorg => reorg.timestamp > cutoff);
    cleared += originalReorgCount - this.reorgHistory.length;
    
    this.logger.info('Historical data cleared', { cleared, cutoff });
    return cleared;
  }

  /**
   * Exports tracking data for analysis
   */
  exportTrackingData() {
    return {
      metadata: {
        chainId: this.chainId,
        network: this.networkConfig.name,
        exportTime: Date.now(),
        version: '1.0.0',
        configuration: this.config
      },
      
      active: Array.from(this.activeTracking.entries()).map(([txHash, data]) => ({
        transactionHash: txHash,
        trackingData: {
          ...data,
          // Remove large arrays for export
          events: data.events.slice(-10),
          latencyData: data.latencyData.slice(-10)
        }
      })),
      
      completed: Array.from(this.completedTracking.entries()).map(([txHash, data]) => ({
        transactionHash: txHash,
        completedData: {
          ...data,
          events: data.events ? data.events.slice(-10) : [],
          latencyData: data.latencyData ? data.latencyData.slice(-10) : []
        }
      })),
      
      analytics: this.analytics,
      networkHealth: this.networkHealth,
      reorgHistory: this.reorgHistory.slice(-20),
      
      performance: {
        latency: this.performanceMetrics.latency.slice(-100),
        throughput: this.performanceMetrics.throughput.slice(-100),
        errorRate: this.performanceMetrics.errorRate.slice(-100),
        confirmationSpeed: this.performanceMetrics.confirmationSpeed.slice(-100)
      }
    };
  }

  /**
   * Graceful shutdown
   */
  async shutdown() {
    this.logger.info('ConfirmationTracker shutdown initiated');
    
    // Clear all intervals
    if (this.blockMonitoringInterval) {
      clearInterval(this.blockMonitoringInterval);
    }
    if (this.confirmationProcessingInterval) {
      clearInterval(this.confirmationProcessingInterval);
    }
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    if (this.performanceMonitoringInterval) {
      clearInterval(this.performanceMonitoringInterval);
    }
    if (this.securityMonitoringInterval) {
      clearInterval(this.securityMonitoringInterval);
    }
    
    // Complete all active tracking
    const shutdownPromises = [];
    for (const trackingData of this.activeTracking.values()) {
      shutdownPromises.push(
        this._completeTracking(trackingData, CONFIRMATION_STATES.CANCELLED, {
          reason: 'shutdown',
          shutdownAt: Date.now(),
          finalConfirmations: trackingData.currentConfirmations
        })
      );
    }
    
    await Promise.allSettled(shutdownPromises);
    
    // Shutdown metrics collector
    if (this.metrics) {
      await this.metrics.shutdown();
    }
    
    // Clear data structures
    this.activeTracking.clear();
    this.blockConfirmations.clear();
    this.transactionCache.clear();
    
    this.logger.info('ConfirmationTracker shutdown completed', {
      completedTransactions: this.completedTracking.size,
      uptime: Date.now() - this.startTime
    });
  }
}

/**
 * Factory function to create ConfirmationTracker
 */
export function createConfirmationTracker(config) {
  return new ConfirmationTracker(config);
}

/**
 * Utility function to track single transaction confirmations
 */
export async function trackSingleConfirmation(transactionHash, provider, chainId, options = {}) {
  const tracker = new ConfirmationTracker({
    chainId,
    provider,
    enableAnalytics: false,
    enableRealtimeUpdates: true
  });
  
  try {
    const result = await tracker.trackConfirmations(transactionHash, options);
    
    // Return promise that resolves when tracking completes
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        tracker.shutdown();
        reject(new Error('Confirmation tracking timeout'));
      }, options.timeout || 600000); // 10 minutes default

      tracker.on('tracking_completed', (event) => {
        if (event.transactionHash === transactionHash) {
          clearTimeout(timeout);
          tracker.shutdown();
          resolve({
            ...result,
            finalState: event.finalState,
            totalTime: event.totalTime,
            finalConfirmations: event.finalConfirmations
          });
        }
      });

      tracker.on('error', (error) => {
        clearTimeout(timeout);
        tracker.shutdown();
        reject(error);
      });
    });
    
  } catch (error) {
    await tracker.shutdown();
    throw error;
  }
}

export default ConfirmationTracker;

/**
 * Example usage:
 * 
 * // Basic usage
 * const tracker = new ConfirmationTracker({
 *   chainId: 1,
 *   provider: new ethers.JsonRpcProvider(RPC_URL),
 *   enableAnalytics: true,
 *   enableSecurityChecks: true
 * });
 * 
 * // Track transaction confirmations
 * const result = await tracker.trackConfirmations('0x...', {
 *   confirmations: 12,
 *   timeout: 900000, // 15 minutes
 *   fastConfirmations: 3,
 *   safeConfirmations: 6
 * });
 * 
 * // Listen for confirmation events
 * tracker.on('tracking_started', (event) => {
 *   console.log('Tracking started:', event.trackingId);
 * });
 * 
 * tracker.on('first_confirmation', (event) => {
 *   console.log('First confirmation:', event.transactionHash);
 * });
 * 
 * tracker.on('fast_threshold_reached', (event) => {
 *   console.log('Fast confirmations reached:', event.confirmations);
 * });
 * 
 * tracker.on('confirmation_update', (event) => {
 *   console.log(`Confirmations: ${event.currentConfirmations}/${event.targetConfirmations}`);
 * });
 * 
 * tracker.on('tracking_completed', (event) => {
 *   console.log('Tracking completed:', event.finalState);
 * });
 * 
 * // Get confirmation status
 * const status = tracker.getConfirmationStatus('0x...');
 * console.log('Progress:', status.progress + '%');
 * 
 * // Get analytics
 * const analytics = tracker.getAnalytics();
 * console.log('Success rate:', analytics.summary.successRate + '%');
 * 
 * // Get all active transactions
 * const active = tracker.getActiveTransactions();
 * 
 * // Stop tracking specific transaction
 * await tracker.stopTracking('0x...');
 * 
 * // Quick single confirmation tracking
 * const singleResult = await trackSingleConfirmation(
 *   '0x...', 
 *   provider, 
 *   1, 
 *   { confirmations: 6 }
 * );
 * 
 * // Force refresh all
 * await tracker.forceRefreshAll();
 * 
 * // Get detailed statistics
 * const stats = tracker.getDetailedStats();
 * 
 * // Export data for analysis
 * const exportData = tracker.exportTrackingData();
 * 
 * // Graceful shutdown
 * await tracker.shutdown();
 */
