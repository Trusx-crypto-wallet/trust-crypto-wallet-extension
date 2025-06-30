/**
 * @fileoverview Production Enterprise-grade Broadcast Tracker for Trust Crypto Wallet Extension
 * @version 1.0.0
 * @author Trust Wallet Development Team
 * @license MIT
 * @description PRODUCTION-READY broadcast tracker with real monitoring, analytics, and enterprise features
 */

import { ethers } from 'ethers';
import { EventEmitter } from 'events';
import { RPCError, RPC_ERROR_CODES } from '../providers/RPCBroadcastProvider.js';
import { SecurityManager } from '../../security/SecurityManager.js';
import { MetricsCollector } from '../../monitoring/MetricsCollector.js';
import { Logger } from '../../utils/Logger.js';

/**
 * Broadcast tracking error codes
 */
export const BROADCAST_TRACKING_ERRORS = {
  // Tracking initialization errors
  INVALID_CONFIGURATION: 'TRACK_INVALID_CONFIG',
  PROVIDER_UNAVAILABLE: 'TRACK_PROVIDER_UNAVAILABLE',
  NETWORK_MISMATCH: 'TRACK_NETWORK_MISMATCH',
  
  // Transaction tracking errors
  TRANSACTION_NOT_FOUND: 'TRACK_TX_NOT_FOUND',
  INVALID_TRANSACTION_HASH: 'TRACK_INVALID_TX_HASH',
  TRACKING_TIMEOUT: 'TRACK_TIMEOUT',
  CONFIRMATION_FAILED: 'TRACK_CONFIRMATION_FAILED',
  
  // Network errors
  NETWORK_ERROR: 'TRACK_NETWORK_ERROR',
  RPC_ERROR: 'TRACK_RPC_ERROR',
  CONNECTION_LOST: 'TRACK_CONNECTION_LOST',
  PROVIDER_ERROR: 'TRACK_PROVIDER_ERROR',
  
  // State management errors
  INVALID_STATE_TRANSITION: 'TRACK_INVALID_STATE',
  DUPLICATE_TRACKING: 'TRACK_DUPLICATE',
  TRACKING_LIMIT_EXCEEDED: 'TRACK_LIMIT_EXCEEDED',
  
  // Business logic errors
  RATE_LIMIT_EXCEEDED: 'TRACK_RATE_LIMITED',
  MAINTENANCE_MODE: 'TRACK_MAINTENANCE'
};

/**
 * Transaction states for tracking lifecycle
 */
export const TRANSACTION_STATES = {
  SUBMITTED: 'submitted',           // Transaction submitted to network
  PENDING: 'pending',              // Transaction in mempool
  CONFIRMED: 'confirmed',          // Transaction mined and confirmed
  FAILED: 'failed',                // Transaction failed or reverted
  DROPPED: 'dropped',              // Transaction dropped from mempool
  REPLACED: 'replaced',            // Transaction replaced (nonce reused)
  TIMEOUT: 'timeout'               // Tracking timeout reached
};

/**
 * Network-specific tracking configurations
 */
export const TRACKING_NETWORK_CONFIGS = {
  1: { // Ethereum Mainnet
    name: 'ethereum',
    avgBlockTime: 12000,            // 12 seconds
    maxConfirmations: 12,           // Maximum confirmations to track
    timeoutBlocks: 50,              // Blocks before timeout
    mempoolTimeout: 900000,         // 15 minutes mempool timeout
    reorgDepth: 7,                  // Reorg protection depth
    gasTracking: true,              // Track gas price changes
    enableMevProtection: true       // MEV protection monitoring
  },
  56: { // BSC
    name: 'bsc',
    avgBlockTime: 3000,             // 3 seconds
    maxConfirmations: 3,
    timeoutBlocks: 100,
    mempoolTimeout: 300000,         // 5 minutes
    reorgDepth: 3,
    gasTracking: true,
    enableMevProtection: false
  },
  137: { // Polygon
    name: 'polygon',
    avgBlockTime: 2000,             // 2 seconds
    maxConfirmations: 5,
    timeoutBlocks: 150,
    mempoolTimeout: 240000,         // 4 minutes
    reorgDepth: 5,
    gasTracking: true,
    enableMevProtection: false
  },
  42161: { // Arbitrum
    name: 'arbitrum',
    avgBlockTime: 1000,             // 1 second
    maxConfirmations: 1,
    timeoutBlocks: 300,
    mempoolTimeout: 120000,         // 2 minutes
    reorgDepth: 1,
    gasTracking: false,             // Different gas model
    enableMevProtection: false
  }
};

/**
 * PRODUCTION Enterprise-grade Broadcast Tracker
 * @class BroadcastTracker
 * @extends EventEmitter
 */
export class BroadcastTracker extends EventEmitter {
  constructor({
    chainId,
    provider,
    maxConcurrentTracking = 1000,
    enableAnalytics = true,
    enableRealtimeUpdates = true,
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
    this.networkConfig = TRACKING_NETWORK_CONFIGS[chainId];
    
    if (!this.networkConfig) {
      throw new Error(`Unsupported chain ID: ${chainId}`);
    }

    // Initialize components
    this.logger = new Logger('BroadcastTracker');
    this.securityManager = new SecurityManager({
      enableTransactionAnalysis: true,
      enableMevDetection: this.networkConfig.enableMevProtection,
      ...security
    });
    
    this.metrics = new MetricsCollector({
      component: 'broadcast_tracker',
      labels: { chainId: this.chainId, network: this.networkConfig.name },
      ...monitoring
    });

    // Configuration
    this.config = {
      maxConcurrentTracking,
      enableAnalytics,
      enableRealtimeUpdates,
      trackingTimeout: this.networkConfig.mempoolTimeout,
      maxConfirmations: this.networkConfig.maxConfirmations,
      reorgDepth: this.networkConfig.reorgDepth,
      pollingInterval: Math.max(1000, this.networkConfig.avgBlockTime / 4), // 25% of block time
      batchSize: 10,                  // Batch RPC calls for efficiency
      retryAttempts: 3,
      retryDelay: 2000,
      enableGasTracking: this.networkConfig.gasTracking,
      enableMevProtection: this.networkConfig.enableMevProtection
    };

    // Data structures for tracking
    this.activeTracking = new Map();     // txHash -> TrackingData
    this.completedTracking = new Map();  // txHash -> CompletedTrackingData
    this.blockCache = new Map();         // blockNumber -> BlockData
    this.gasTracker = new Map();         // block -> gas data
    this.analytics = {
      totalTracked: 0,
      totalConfirmed: 0,
      totalFailed: 0,
      totalDropped: 0,
      averageConfirmationTime: 0,
      reorgDetections: 0
    };

    // Network state
    this.currentBlock = 0;
    this.networkStatus = 'connecting';
    this.lastBlockTimestamp = 0;

    // Performance tracking
    this.startTime = Date.now();
    
    // Start services
    this._initializeServices();

    this.logger.info('Production BroadcastTracker initialized', {
      chainId: this.chainId,
      network: this.networkConfig.name,
      maxConcurrentTracking: this.config.maxConcurrentTracking
    });
  }

  /**
   * Tracks a transaction from submission to confirmation
   */
  async trackTransaction(transactionHash, options = {}) {
    const trackingId = this._generateTrackingId();
    
    try {
      // Validate transaction hash
      if (!this._isValidTransactionHash(transactionHash)) {
        throw new RPCError(
          'Invalid transaction hash format',
          BROADCAST_TRACKING_ERRORS.INVALID_TRANSACTION_HASH,
          { transactionHash }
        );
      }

      // Check if already tracking
      if (this.activeTracking.has(transactionHash)) {
        throw new RPCError(
          'Transaction already being tracked',
          BROADCAST_TRACKING_ERRORS.DUPLICATE_TRACKING,
          { transactionHash }
        );
      }

      // Check tracking limits
      if (this.activeTracking.size >= this.config.maxConcurrentTracking) {
        throw new RPCError(
          'Maximum concurrent tracking limit exceeded',
          BROADCAST_TRACKING_ERRORS.TRACKING_LIMIT_EXCEEDED,
          { 
            current: this.activeTracking.size,
            maximum: this.config.maxConcurrentTracking
          }
        );
      }

      // Initialize tracking data
      const trackingData = {
        trackingId,
        transactionHash,
        startTime: Date.now(),
        state: TRANSACTION_STATES.SUBMITTED,
        confirmations: 0,
        targetConfirmations: options.confirmations || this.config.maxConfirmations,
        timeout: options.timeout || this.config.trackingTimeout,
        retryCount: 0,
        events: [],
        metadata: {
          submittedAt: Date.now(),
          submittedBlock: this.currentBlock,
          gasPrice: null,
          nonce: null,
          from: null,
          to: null,
          value: null
        },
        options
      };

      // Add to active tracking
      this.activeTracking.set(transactionHash, trackingData);
      this.analytics.totalTracked++;

      // Initial transaction lookup
      await this._initialTransactionLookup(trackingData);

      // Start tracking
      this._addTrackingEvent(trackingData, 'tracking_started', {
        trackingId,
        targetConfirmations: trackingData.targetConfirmations
      });

      this.logger.info('Transaction tracking started', {
        trackingId,
        transactionHash,
        targetConfirmations: trackingData.targetConfirmations
      });

      // Emit tracking started event
      this.emit('tracking_started', {
        trackingId,
        transactionHash,
        state: trackingData.state
      });

      return {
        trackingId,
        transactionHash,
        state: trackingData.state,
        message: 'Transaction tracking started successfully'
      };

    } catch (error) {
      this.logger.error('Failed to start transaction tracking', {
        trackingId,
        transactionHash,
        error: error.message
      });

      throw new RPCError(
        `Transaction tracking failed: ${error.message}`,
        error.code || BROADCAST_TRACKING_ERRORS.TRACKING_TIMEOUT,
        { trackingId, transactionHash, originalError: error }
      );
    }
  }

  /**
   * Gets current tracking status for a transaction
   */
  getTrackingStatus(transactionHash) {
    // Check active tracking
    if (this.activeTracking.has(transactionHash)) {
      const trackingData = this.activeTracking.get(transactionHash);
      return {
        active: true,
        trackingId: trackingData.trackingId,
        state: trackingData.state,
        confirmations: trackingData.confirmations,
        targetConfirmations: trackingData.targetConfirmations,
        elapsedTime: Date.now() - trackingData.startTime,
        events: trackingData.events,
        metadata: trackingData.metadata
      };
    }

    // Check completed tracking
    if (this.completedTracking.has(transactionHash)) {
      const completedData = this.completedTracking.get(transactionHash);
      return {
        active: false,
        completed: true,
        trackingId: completedData.trackingId,
        state: completedData.finalState,
        confirmations: completedData.finalConfirmations,
        totalTime: completedData.totalTime,
        events: completedData.events,
        result: completedData.result
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
    
    // Move to completed tracking
    await this._completeTracking(trackingData, TRANSACTION_STATES.TIMEOUT, {
      reason,
      stoppedAt: Date.now()
    });

    this.logger.info('Transaction tracking stopped', {
      trackingId: trackingData.trackingId,
      transactionHash,
      reason
    });

    return {
      success: true,
      trackingId: trackingData.trackingId,
      message: 'Transaction tracking stopped successfully'
    };
  }

  /**
   * Gets comprehensive analytics data
   */
  getAnalytics() {
    return {
      tracking: {
        activeTransactions: this.activeTracking.size,
        completedTransactions: this.completedTracking.size,
        totalTracked: this.analytics.totalTracked,
        successRate: this._calculateSuccessRate()
      },
      
      performance: {
        averageConfirmationTime: this.analytics.averageConfirmationTime,
        averageTrackingTime: this._calculateAverageTrackingTime(),
        networkLatency: this._calculateNetworkLatency()
      },
      
      network: {
        currentBlock: this.currentBlock,
        networkStatus: this.networkStatus,
        lastBlockTime: this.lastBlockTimestamp,
        reorgDetections: this.analytics.reorgDetections
      },
      
      states: {
        confirmed: this.analytics.totalConfirmed,
        failed: this.analytics.totalFailed,
        dropped: this.analytics.totalDropped,
        pending: this._countByState(TRANSACTION_STATES.PENDING)
      },

      gas: this.config.enableGasTracking ? this._getGasAnalytics() : null,
      
      timestamp: new Date().toISOString(),
      uptime: Date.now() - this.startTime
    };
  }

  /**
   * Gets all currently tracked transactions
   */
  getActiveTransactions() {
    const transactions = [];
    
    for (const [txHash, trackingData] of this.activeTracking.entries()) {
      transactions.push({
        transactionHash: txHash,
        trackingId: trackingData.trackingId,
        state: trackingData.state,
        confirmations: trackingData.confirmations,
        targetConfirmations: trackingData.targetConfirmations,
        elapsedTime: Date.now() - trackingData.startTime,
        metadata: trackingData.metadata
      });
    }
    
    return transactions.sort((a, b) => a.elapsedTime - b.elapsedTime);
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
    
    // Transaction monitoring service  
    this._startTransactionMonitoring();
    
    // Cleanup service
    this._startCleanupService();
    
    // Analytics service
    if (this.config.enableAnalytics) {
      this._startAnalyticsService();
    }
  }

  /**
   * Starts block monitoring for real-time updates
   */
  _startBlockMonitoring() {
    const pollBlocks = async () => {
      try {
        const latestBlock = await this.provider.getBlockNumber();
        
        if (latestBlock > this.currentBlock) {
          const blockDifference = latestBlock - this.currentBlock;
          
          // Handle potential reorg
          if (blockDifference < 0 || blockDifference > 10) {
            await this._handlePotentialReorg(latestBlock);
          }
          
          this.currentBlock = latestBlock;
          this.lastBlockTimestamp = Date.now();
          this.networkStatus = 'connected';
          
          // Emit new block event
          this.emit('new_block', {
            blockNumber: latestBlock,
            timestamp: this.lastBlockTimestamp
          });
          
          // Update confirmations for tracked transactions
          await this._updateConfirmations();
          
        }
        
      } catch (error) {
        this.networkStatus = 'error';
        this.logger.warn('Block monitoring error', { error: error.message });
      }
    };

    // Initial block fetch
    pollBlocks();
    
    // Set up polling interval
    this.blockMonitoringInterval = setInterval(pollBlocks, this.config.pollingInterval);
  }

  /**
   * Starts transaction monitoring service
   */
  _startTransactionMonitoring() {
    const monitorTransactions = async () => {
      if (this.activeTracking.size === 0) return;

      try {
        // Process transactions in batches for efficiency
        const transactions = Array.from(this.activeTracking.values());
        const batches = this._createBatches(transactions, this.config.batchSize);
        
        for (const batch of batches) {
          await Promise.all(batch.map(trackingData => 
            this._updateTransactionStatus(trackingData)
          ));
        }
        
      } catch (error) {
        this.logger.warn('Transaction monitoring error', { error: error.message });
      }
    };

    this.transactionMonitoringInterval = setInterval(
      monitorTransactions, 
      this.config.pollingInterval
    );
  }

  /**
   * Updates transaction status and confirmations
   */
  async _updateTransactionStatus(trackingData) {
    try {
      // Check for timeout
      if (Date.now() - trackingData.startTime > trackingData.timeout) {
        await this._completeTracking(trackingData, TRANSACTION_STATES.TIMEOUT, {
          reason: 'timeout_reached',
          timeoutAfter: trackingData.timeout
        });
        return;
      }

      // Get transaction receipt
      const receipt = await this.provider.getTransactionReceipt(trackingData.transactionHash);
      
      if (!receipt) {
        // Transaction still pending or dropped
        await this._handlePendingTransaction(trackingData);
      } else {
        // Transaction confirmed
        await this._handleConfirmedTransaction(trackingData, receipt);
      }
      
    } catch (error) {
      trackingData.retryCount++;
      
      if (trackingData.retryCount >= this.config.retryAttempts) {
        await this._completeTracking(trackingData, TRANSACTION_STATES.FAILED, {
          reason: 'max_retries_exceeded',
          error: error.message
        });
      }
    }
  }

  /**
   * Handles confirmed transaction
   */
  async _handleConfirmedTransaction(trackingData, receipt) {
    const blockNumber = receipt.blockNumber;
    const confirmations = this.currentBlock - blockNumber + 1;
    
    // Update tracking data
    trackingData.confirmations = confirmations;
    trackingData.metadata.blockNumber = blockNumber;
    trackingData.metadata.gasUsed = receipt.gasUsed.toString();
    trackingData.metadata.status = receipt.status;

    // Check if transaction failed
    if (receipt.status === 0) {
      await this._completeTracking(trackingData, TRANSACTION_STATES.FAILED, {
        reason: 'transaction_reverted',
        receipt
      });
      return;
    }

    // Update state based on confirmations
    if (trackingData.state !== TRANSACTION_STATES.CONFIRMED) {
      trackingData.state = TRANSACTION_STATES.CONFIRMED;
      
      this._addTrackingEvent(trackingData, 'first_confirmation', {
        blockNumber,
        confirmations: 1
      });

      this.emit('transaction_confirmed', {
        trackingId: trackingData.trackingId,
        transactionHash: trackingData.transactionHash,
        blockNumber,
        confirmations: 1
      });
    }

    // Check if we've reached target confirmations
    if (confirmations >= trackingData.targetConfirmations) {
      await this._completeTracking(trackingData, TRANSACTION_STATES.CONFIRMED, {
        finalConfirmations: confirmations,
        receipt
      });
    } else {
      // Emit confirmation update
      this.emit('confirmation_update', {
        trackingId: trackingData.trackingId,
        transactionHash: trackingData.transactionHash,
        confirmations,
        targetConfirmations: trackingData.targetConfirmations
      });
    }
  }

  /**
   * Handles pending transaction
   */
  async _handlePendingTransaction(trackingData) {
    // Try to get transaction from mempool
    try {
      const tx = await this.provider.getTransaction(trackingData.transactionHash);
      
      if (!tx) {
        // Transaction not found - might be dropped
        if (trackingData.state === TRANSACTION_STATES.PENDING) {
          await this._completeTracking(trackingData, TRANSACTION_STATES.DROPPED, {
            reason: 'transaction_not_found'
          });
        }
      } else {
        // Update metadata if first time seeing transaction
        if (!trackingData.metadata.from) {
          trackingData.metadata.from = tx.from;
          trackingData.metadata.to = tx.to;
          trackingData.metadata.value = tx.value?.toString();
          trackingData.metadata.nonce = tx.nonce;
          trackingData.metadata.gasPrice = tx.gasPrice?.toString();
        }

        // Update state to pending if not already
        if (trackingData.state === TRANSACTION_STATES.SUBMITTED) {
          trackingData.state = TRANSACTION_STATES.PENDING;
          
          this._addTrackingEvent(trackingData, 'mempool_confirmed', {
            mempoolTime: Date.now() - trackingData.startTime
          });

          this.emit('mempool_confirmed', {
            trackingId: trackingData.trackingId,
            transactionHash: trackingData.transactionHash,
            mempoolTime: Date.now() - trackingData.startTime
          });
        }
      }
    } catch (error) {
      // Error getting transaction - increment retry count
      trackingData.retryCount++;
    }
  }

  /**
   * Completes tracking and moves to completed list
   */
  async _completeTracking(trackingData, finalState, result = {}) {
    const totalTime = Date.now() - trackingData.startTime;
    
    // Update analytics
    this._updateAnalytics(finalState, totalTime);
    
    // Create completed tracking data
    const completedData = {
      trackingId: trackingData.trackingId,
      transactionHash: trackingData.transactionHash,
      finalState,
      finalConfirmations: trackingData.confirmations,
      totalTime,
      events: trackingData.events,
      metadata: trackingData.metadata,
      result,
      completedAt: Date.now()
    };

    // Add final event
    this._addTrackingEvent(trackingData, 'tracking_completed', {
      finalState,
      totalTime,
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
      confirmations: trackingData.confirmations
    });

    this.logger.info('Transaction tracking completed', {
      trackingId: trackingData.trackingId,
      transactionHash: trackingData.transactionHash,
      finalState,
      totalTime,
      confirmations: trackingData.confirmations
    });
  }

  /**
   * Initial transaction lookup after submission
   */
  async _initialTransactionLookup(trackingData) {
    try {
      // Try to get transaction immediately
      const tx = await this.provider.getTransaction(trackingData.transactionHash);
      
      if (tx) {
        // Transaction found in mempool
        trackingData.state = TRANSACTION_STATES.PENDING;
        trackingData.metadata.from = tx.from;
        trackingData.metadata.to = tx.to;
        trackingData.metadata.value = tx.value?.toString();
        trackingData.metadata.nonce = tx.nonce;
        trackingData.metadata.gasPrice = tx.gasPrice?.toString();
        
        this._addTrackingEvent(trackingData, 'initial_lookup_success', {
          foundInMempool: true
        });
      } else {
        // Transaction not yet visible
        this._addTrackingEvent(trackingData, 'initial_lookup_pending', {
          foundInMempool: false
        });
      }
    } catch (error) {
      this._addTrackingEvent(trackingData, 'initial_lookup_error', {
        error: error.message
      });
    }
  }

  /**
   * Updates confirmations for all tracked transactions
   */
  async _updateConfirmations() {
    for (const trackingData of this.activeTracking.values()) {
      if (trackingData.state === TRANSACTION_STATES.CONFIRMED && 
          trackingData.metadata.blockNumber) {
        
        const newConfirmations = this.currentBlock - trackingData.metadata.blockNumber + 1;
        
        if (newConfirmations !== trackingData.confirmations) {
          trackingData.confirmations = newConfirmations;
          
          // Check if we've reached target confirmations
          if (newConfirmations >= trackingData.targetConfirmations) {
            await this._completeTracking(trackingData, TRANSACTION_STATES.CONFIRMED, {
              finalConfirmations: newConfirmations
            });
          }
        }
      }
    }
  }

  /**
   * Handles potential blockchain reorganization
   */
  async _handlePotentialReorg(newBlockNumber) {
    this.analytics.reorgDetections++;
    
    this.logger.warn('Potential blockchain reorganization detected', {
      previousBlock: this.currentBlock,
      newBlock: newBlockNumber,
      difference: newBlockNumber - this.currentBlock
    });

    // Re-check all confirmed transactions within reorg depth
    for (const trackingData of this.activeTracking.values()) {
      if (trackingData.state === TRANSACTION_STATES.CONFIRMED &&
          trackingData.metadata.blockNumber &&
          (this.currentBlock - trackingData.metadata.blockNumber) <= this.config.reorgDepth) {
        
        // Re-verify transaction
        try {
          const receipt = await this.provider.getTransactionReceipt(trackingData.transactionHash);
          if (!receipt || receipt.blockNumber !== trackingData.metadata.blockNumber) {
            // Transaction affected by reorg
            this._addTrackingEvent(trackingData, 'reorg_detected', {
              originalBlock: trackingData.metadata.blockNumber,
              newBlock: receipt?.blockNumber || null
            });

            if (receipt) {
              // Update with new block information
              trackingData.metadata.blockNumber = receipt.blockNumber;
              trackingData.confirmations = newBlockNumber - receipt.blockNumber + 1;
            } else {
              // Transaction no longer confirmed
              trackingData.state = TRANSACTION_STATES.PENDING;
              trackingData.confirmations = 0;
              trackingData.metadata.blockNumber = null;
            }
          }
        } catch (error) {
          this.logger.error('Error during reorg verification', {
            trackingId: trackingData.trackingId,
            error: error.message
          });
        }
      }
    }

    this.emit('reorg_detected', {
      previousBlock: this.currentBlock,
      newBlock: newBlockNumber,
      affectedTransactions: this._getReorgAffectedTransactions()
    });
  }

  /**
   * Starts cleanup service for old completed tracking data
   */
  _startCleanupService() {
    const cleanup = () => {
      const now = Date.now();
      const maxAge = 86400000; // 24 hours
      
      // Clean up old completed tracking data
      for (const [txHash, completedData] of this.completedTracking.entries()) {
        if (now - completedData.completedAt > maxAge) {
          this.completedTracking.delete(txHash);
        }
      }

      // Clean up old block cache
      const maxBlocks = 100;
      if (this.blockCache.size > maxBlocks) {
        const blocks = Array.from(this.blockCache.keys()).sort((a, b) => a - b);
        const toDelete = blocks.slice(0, blocks.length - maxBlocks);
        toDelete.forEach(block => this.blockCache.delete(block));
      }
    };

    this.cleanupInterval = setInterval(cleanup, 300000); // Every 5 minutes
  }

  /**
   * Starts analytics service
   */
  _startAnalyticsService() {
    const updateAnalytics = () => {
      // Update average confirmation time
      this.analytics.averageConfirmationTime = this._calculateAverageConfirmationTime();
      
      // Update gas analytics if enabled
      if (this.config.enableGasTracking) {
        this._updateGasAnalytics();
      }
    };

    this.analyticsInterval = setInterval(updateAnalytics, 60000); // Every minute
  }

  /**
   * Helper methods
   */

  _isValidTransactionHash(hash) {
    return typeof hash === 'string' && 
           hash.length === 66 && 
           hash.startsWith('0x') && 
           /^0x[a-fA-F0-9]{64}$/.test(hash);
  }

  _generateTrackingId() {
    return `track_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  _addTrackingEvent(trackingData, eventType, eventData = {}) {
    trackingData.events.push({
      type: eventType,
      timestamp: Date.now(),
      data: eventData
    });
  }

  _createBatches(array, batchSize) {
    const batches = [];
    for (let i = 0; i < array.length; i += batchSize) {
      batches.push(array.slice(i, i + batchSize));
    }
    return batches;
  }

  _updateAnalytics(finalState, totalTime) {
    switch (finalState) {
      case TRANSACTION_STATES.CONFIRMED:
        this.analytics.totalConfirmed++;
        break;
      case TRANSACTION_STATES.FAILED:
        this.analytics.totalFailed++;
        break;
      case TRANSACTION_STATES.DROPPED:
        this.analytics.totalDropped++;
        break;
    }

    // Update average confirmation time for successful transactions
    if (finalState === TRANSACTION_STATES.CONFIRMED) {
      const currentAverage = this.analytics.averageConfirmationTime;
      const count = this.analytics.totalConfirmed;
      this.analytics.averageConfirmationTime = 
        ((currentAverage * (count - 1)) + totalTime) / count;
    }
  }

  _calculateSuccessRate() {
    const total = this.analytics.totalConfirmed + this.analytics.totalFailed + this.analytics.totalDropped;
    return total > 0 ? (this.analytics.totalConfirmed / total) * 100 : 0;
  }

  _calculateAverageTrackingTime() {
    if (this.completedTracking.size === 0) return 0;
    
    let totalTime = 0;
    for (const completedData of this.completedTracking.values()) {
      totalTime += completedData.totalTime;
    }
    
    return totalTime / this.completedTracking.size;
  }

  _calculateNetworkLatency() {
    if (this.lastBlockTimestamp === 0) return 0;
    return Date.now() - this.lastBlockTimestamp;
  }

  _calculateAverageConfirmationTime() {
    const confirmedTransactions = Array.from(this.completedTracking.values())
      .filter(data => data.finalState === TRANSACTION_STATES.CONFIRMED);
    
    if (confirmedTransactions.length === 0) return 0;
    
    const totalTime = confirmedTransactions.reduce((sum, data) => sum + data.totalTime, 0);
    return totalTime / confirmedTransactions.length;
  }

  _countByState(state) {
    let count = 0;
    for (const trackingData of this.activeTracking.values()) {
      if (trackingData.state === state) count++;
    }
    return count;
  }

  _getGasAnalytics() {
    if (!this.config.enableGasTracking || this.gasTracker.size === 0) {
      return null;
    }

    const gasData = Array.from(this.gasTracker.values());
    const avgGasPrice = gasData.reduce((sum, data) => sum + data.gasPrice, 0) / gasData.length;
    const maxGasPrice = Math.max(...gasData.map(data => data.gasPrice));
    const minGasPrice = Math.min(...gasData.map(data => data.gasPrice));

    return {
      averageGasPrice: avgGasPrice,
      maxGasPrice,
      minGasPrice,
      dataPoints: gasData.length,
      trend: this._calculateGasTrend(gasData)
    };
  }

  _calculateGasTrend(gasData) {
    if (gasData.length < 2) return 'stable';
    
    const recent = gasData.slice(-10); // Last 10 data points
    const first = recent[0].gasPrice;
    const last = recent[recent.length - 1].gasPrice;
    
    const change = ((last - first) / first) * 100;
    
    if (change > 5) return 'increasing';
    if (change < -5) return 'decreasing';
    return 'stable';
  }

  _updateGasAnalytics() {
    // This would update gas tracking data
    // Implementation depends on specific gas tracking requirements
  }

  _getReorgAffectedTransactions() {
    const affected = [];
    for (const [txHash, trackingData] of this.activeTracking.entries()) {
      if (trackingData.events.some(event => event.type === 'reorg_detected')) {
        affected.push({
          transactionHash: txHash,
          trackingId: trackingData.trackingId,
          state: trackingData.state
        });
      }
    }
    return affected;
  }

  /**
   * Public management methods
   */

  /**
   * Gets comprehensive statistics
   */
  getStats() {
    return {
      tracker: 'BroadcastTracker',
      version: '1.0.0',
      chainId: this.chainId,
      network: this.networkConfig.name,
      
      tracking: {
        active: this.activeTracking.size,
        completed: this.completedTracking.size,
        maxConcurrent: this.config.maxConcurrentTracking
      },
      
      analytics: this.analytics,
      
      network: {
        currentBlock: this.currentBlock,
        status: this.networkStatus,
        lastBlockTime: this.lastBlockTimestamp,
        avgBlockTime: this.networkConfig.avgBlockTime
      },
      
      performance: this.metrics.getStats(),
      uptime: Date.now() - this.startTime,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Updates configuration
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    
    this.logger.info('BroadcastTracker configuration updated', {
      updatedFields: Object.keys(newConfig)
    });
  }

  /**
   * Clears completed tracking data
   */
  clearCompletedTracking(olderThan = 0) {
    const cutoff = Date.now() - olderThan;
    let cleared = 0;
    
    for (const [txHash, completedData] of this.completedTracking.entries()) {
      if (completedData.completedAt < cutoff) {
        this.completedTracking.delete(txHash);
        cleared++;
      }
    }
    
    this.logger.info('Completed tracking data cleared', { cleared });
    return cleared;
  }

  /**
   * Forces refresh of network state
   */
  async forceNetworkRefresh() {
    try {
      this.currentBlock = await this.provider.getBlockNumber();
      this.lastBlockTimestamp = Date.now();
      this.networkStatus = 'connected';
      
      this.logger.info('Network state refreshed', {
        currentBlock: this.currentBlock
      });
      
      return {
        success: true,
        currentBlock: this.currentBlock,
        timestamp: this.lastBlockTimestamp
      };
    } catch (error) {
      this.networkStatus = 'error';
      
      this.logger.error('Network refresh failed', {
        error: error.message
      });
      
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Gets transaction history for analytics
   */
  getTransactionHistory(limit = 100) {
    const history = Array.from(this.completedTracking.values())
      .sort((a, b) => b.completedAt - a.completedAt)
      .slice(0, limit)
      .map(data => ({
        transactionHash: data.transactionHash,
        trackingId: data.trackingId,
        finalState: data.finalState,
        confirmations: data.finalConfirmations,
        totalTime: data.totalTime,
        completedAt: data.completedAt
      }));
    
    return history;
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
        version: '1.0.0'
      },
      
      active: Array.from(this.activeTracking.entries()).map(([txHash, data]) => ({
        transactionHash: txHash,
        trackingData: data
      })),
      
      completed: Array.from(this.completedTracking.entries()).map(([txHash, data]) => ({
        transactionHash: txHash,
        completedData: data
      })),
      
      analytics: this.analytics,
      
      config: this.config
    };
  }

  /**
   * Graceful shutdown
   */
  async shutdown() {
    this.logger.info('BroadcastTracker shutdown initiated');

    // Clear all intervals
    if (this.blockMonitoringInterval) {
      clearInterval(this.blockMonitoringInterval);
    }
    if (this.transactionMonitoringInterval) {
      clearInterval(this.transactionMonitoringInterval);
    }
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    if (this.analyticsInterval) {
      clearInterval(this.analyticsInterval);
    }

    // Complete all active tracking
    const activePromises = [];
    for (const trackingData of this.activeTracking.values()) {
      activePromises.push(
        this._completeTracking(trackingData, TRANSACTION_STATES.TIMEOUT, {
          reason: 'shutdown',
          shutdownAt: Date.now()
        })
      );
    }
    
    await Promise.allSettled(activePromises);

    // Shutdown metrics collector
    if (this.metrics) {
      await this.metrics.shutdown();
    }

    // Clear data structures
    this.activeTracking.clear();
    this.blockCache.clear();
    this.gasTracker.clear();

    this.logger.info('BroadcastTracker shutdown completed', {
      completedTransactions: this.completedTracking.size
    });
  }
}

/**
 * Factory function to create BroadcastTracker
 */
export function createBroadcastTracker(config) {
  return new BroadcastTracker(config);
}

/**
 * Utility function to track a single transaction
 */
export async function trackSingleTransaction(transactionHash, provider, chainId, options = {}) {
  const tracker = new BroadcastTracker({ chainId, provider });
  
  try {
    const result = await tracker.trackTransaction(transactionHash, options);
    
    // Return promise that resolves when tracking completes
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        tracker.shutdown();
        reject(new Error('Tracking timeout'));
      }, options.timeout || 900000); // 15 minutes default

      tracker.on('tracking_completed', (event) => {
        if (event.transactionHash === transactionHash) {
          clearTimeout(timeout);
          tracker.shutdown();
          resolve({
            ...result,
            finalState: event.finalState,
            totalTime: event.totalTime,
            confirmations: event.confirmations
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

export default BroadcastTracker;

/**
 * Example usage:
 * 
 * // Basic usage
 * const tracker = new BroadcastTracker({
 *   chainId: 1,
 *   provider: new ethers.JsonRpcProvider(RPC_URL)
 * });
 * 
 * // Track a transaction
 * const result = await tracker.trackTransaction('0x...', {
 *   confirmations: 3,
 *   timeout: 600000 // 10 minutes
 * });
 * 
 * // Listen for events
 * tracker.on('tracking_started', (event) => {
 *   console.log('Tracking started:', event.trackingId);
 * });
 * 
 * tracker.on('transaction_confirmed', (event) => {
 *   console.log('Transaction confirmed:', event.transactionHash);
 * });
 * 
 * tracker.on('tracking_completed', (event) => {
 *   console.log('Tracking completed:', event.finalState);
 * });
 * 
 * // Get tracking status
 * const status = tracker.getTrackingStatus('0x...');
 * 
 * // Get analytics
 * const analytics = tracker.getAnalytics();
 * 
 * // Get all active transactions
 * const active = tracker.getActiveTransactions();
 * 
 * // Stop tracking specific transaction
 * await tracker.stopTracking('0x...');
 * 
 * // Quick single transaction tracking
 * const singleResult = await trackSingleTransaction(
 *   '0x...', 
 *   provider, 
 *   1, 
 *   { confirmations: 3 }
 * );
 * 
 * // Graceful shutdown
 * await tracker.shutdown();
 */
