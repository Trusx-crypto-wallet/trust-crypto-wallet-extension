/**
 * RetryManager.js
 * 
 * A sophisticated retry management system for handling failed cryptocurrency
 * transaction broadcasts with exponential backoff and comprehensive error handling.
 * Integrates with BroadcastQueue and BroadcastMonitor for complete transaction
 * lifecycle management.
 * 
 * @author Trust Crypto Wallet Extension
 * @version 1.0.0
 */

import { EventEmitter } from 'events';
import BroadcastQueue from "./BroadcastQueue.js";
import BroadcastMonitor from "./BroadcastMonitor.js";

/**
 * Default retry configuration
 */
const DEFAULT_RETRY_CONFIG = {
  // Exponential backoff configuration
  initialDelay: 15000, // 15 seconds
  maxDelay: 300000, // 5 minutes
  backoffMultiplier: 2.0,
  jitterRange: 0.1, // ±10% random jitter
  
  // Retry limits
  maxRetries: 5,
  maxConcurrentRetries: 20,
  
  // Processing intervals
  checkInterval: 10000, // 10 seconds
  cleanupInterval: 3600000, // 1 hour
  retryExpiryMs: 86400000, // 24 hours - configurable retry expiry time
  
  // Error categorization
  retryableErrors: [
    'NETWORK_ERROR',
    'TIMEOUT',
    'INSUFFICIENT_FUNDS', // May be temporary
    'NONCE_TOO_LOW',
    'REPLACEMENT_UNDERPRICED',
    'SERVER_ERROR',
    'RATE_LIMITED'
  ],
  
  permanentErrors: [
    'INVALID_TRANSACTION',
    'TRANSACTION_REVERTED',
    'INVALID_SIGNATURE',
    'INVALID_ADDRESS',
    'CONTRACT_ERROR'
  ]
};

/**
 * RetryManager - Intelligent retry system for failed transaction broadcasts
 * 
 * Provides sophisticated retry logic with exponential backoff, error categorization,
 * and integration with broadcast queue and monitoring systems. Handles transient
 * failures gracefully while avoiding infinite retry loops.
 * 
 * @class RetryManager
 * @extends EventEmitter
 * @example
 * const retryManager = new RetryManager(queue, monitor, {
 *   maxRetries: 3,
 *   initialDelay: 10000,
 *   backoffMultiplier: 2.5
 * });
 * 
 * retryManager.on('retry', ({ transaction, attempt, delay }) => {
 *   console.log(`Retrying ${transaction.id}, attempt ${attempt} in ${delay}ms`);
 * });
 * 
 * retryManager.on('maxRetriesReached', ({ transaction, totalAttempts }) => {
 *   console.error(`Transaction ${transaction.id} failed after ${totalAttempts} attempts`);
 * });
 * 
 * retryManager.start();
 */
export default class RetryManager extends EventEmitter {
  /**
   * Creates a new RetryManager instance
   * 
   * Initializes the retry manager with queue and monitor integration,
   * configurable retry policies, and comprehensive error handling.
   * 
   * @constructor
   * @param {BroadcastQueue} queue - The broadcast queue for transaction management
   * @param {BroadcastMonitor} monitor - The broadcast monitor for transaction tracking
   * @param {Object} [options={}] - Configuration options for retry behavior
   * @param {number} [options.initialDelay=15000] - Initial retry delay in milliseconds
   * @param {number} [options.maxDelay=300000] - Maximum retry delay in milliseconds
   * @param {number} [options.backoffMultiplier=2.0] - Exponential backoff multiplier
   * @param {number} [options.jitterRange=0.1] - Random jitter range (0-1)
   * @param {number} [options.maxRetries=5] - Maximum number of retry attempts
   * @param {number} [options.maxConcurrentRetries=20] - Maximum concurrent retry operations
   * @param {number} [options.checkInterval=10000] - Retry processing interval in milliseconds
   * @param {number} [options.cleanupInterval=3600000] - Cleanup interval for expired retries in milliseconds
   * @param {number} [options.retryExpiryMs=86400000] - Retry expiry time in milliseconds (24 hours)
   * @param {Array<string>} [options.retryableErrors] - List of retryable error types
   * @param {Array<string>} [options.permanentErrors] - List of permanent error types
   * 
   * @throws {TypeError} If queue is not a BroadcastQueue instance
   * @throws {TypeError} If monitor is not a BroadcastMonitor instance
   * @throws {RangeError} If configuration values are outside acceptable ranges
   * 
   * @example
   * const retryManager = new RetryManager(queue, monitor, {
   *   maxRetries: 3,
   *   initialDelay: 10000,
   *   backoffMultiplier: 1.5,
   *   retryableErrors: ['NETWORK_ERROR', 'TIMEOUT', 'RATE_LIMITED']
   * });
   */
  constructor(queue, monitor, options = {}) {
    super();
    
    // Validate required dependencies
    if (!(queue instanceof BroadcastQueue)) {
      throw new TypeError('Queue must be an instance of BroadcastQueue');
    }
    
    if (!(monitor instanceof BroadcastMonitor)) {
      throw new TypeError('Monitor must be an instance of BroadcastMonitor');
    }
    
    // Store core dependencies
    this.queue = queue;
    this.monitor = monitor;
    
    // Merge configuration with defaults
    this.config = {
      ...DEFAULT_RETRY_CONFIG,
      ...options
    };
    
    // Validate configuration
    this._validateConfig();
    
    // Internal state
    this.isRunning = false;
    this.retryQueue = new Map(); // transactionId -> retry data
    this.activeRetries = new Set(); // Currently processing retry IDs
    
    // Intervals
    this.checkInterval = null;
    this.cleanupInterval = null;
    
    // Statistics
    this.stats = {
      totalRetries: 0,
      successfulRetries: 0,
      failedRetries: 0,
      permanentFailures: 0,
      maxRetriesReached: 0,
      averageRetryDelay: 0,
      startTime: null
    };
    
    // Bind methods
    this._processRetryQueue = this._processRetryQueue.bind(this);
    this._cleanupExpiredRetries = this._cleanupExpiredRetries.bind(this);
    this._handleMonitorEvents = this._handleMonitorEvents.bind(this);
    
    // Setup event listeners
    this._setupEventListeners();
    
    console.log('RetryManager initialized with configuration:', this.config);
  }
  
  /**
   * Validates configuration parameters
   * @private
   */
  _validateConfig() {
    const { initialDelay, maxDelay, backoffMultiplier, maxRetries, maxConcurrentRetries, checkInterval } = this.config;
    
    if (initialDelay < 1000 || initialDelay > 60000) {
      throw new RangeError('initialDelay must be between 1,000ms and 60,000ms');
    }
    
    if (maxDelay < initialDelay || maxDelay > 3600000) {
      throw new RangeError('maxDelay must be between initialDelay and 3,600,000ms');
    }
    
    if (backoffMultiplier < 1.0 || backoffMultiplier > 10.0) {
      throw new RangeError('backoffMultiplier must be between 1.0 and 10.0');
    }
    
    if (maxRetries < 1 || maxRetries > 20) {
      throw new RangeError('maxRetries must be between 1 and 20');
    }
    
    if (maxConcurrentRetries < 1 || maxConcurrentRetries > 100) {
      throw new RangeError('maxConcurrentRetries must be between 1 and 100');
    }
    
    if (checkInterval < 1000 || checkInterval > 60000) {
      throw new RangeError('checkInterval must be between 1,000ms and 60,000ms');
    }
  }
  
  /**
   * Sets up event listeners for queue and monitor
   * @private
   */
  _setupEventListeners() {
    // Listen for monitor events
    this.monitor.on('failed', this._handleMonitorEvents);
    this.monitor.on('dropped', this._handleMonitorEvents);
    
    // Listen for our own retry success events to update monitor
    this.on('retrySuccess', ({ transaction, txHash }) => {
      if (txHash && this.monitor.isMonitoring) {
        this.monitor.addTransaction(txHash, {
          id: transaction.id,
          network: transaction.network,
          type: transaction.type,
          isRetry: true,
          originalFailure: transaction.lastFailureReason
        });
      }
    });
  }
  
  /**
   * Handles events from broadcast monitor
   * @private
   */
  _handleMonitorEvents({ txHash, reason, metadata }) {
    if (!metadata || !metadata.id) {
      console.warn('Monitor event missing transaction metadata:', { txHash, reason });
      return;
    }
    
    // Find transaction in queue by ID
    const queueTransactions = this.queue.toArray();
    const transaction = queueTransactions.find(tx => tx.id === metadata.id);
    
    if (transaction) {
      this.addFailedTransaction(transaction, reason);
    }
  }
  
  /**
   * Starts the retry processing system
   * 
   * Begins processing failed transactions with exponential backoff retry logic.
   * Sets up periodic checking for scheduled retries and cleanup of expired entries.
   * This method is idempotent and safe to call multiple times.
   * 
   * @public
   * @method start
   * @returns {Promise<void>} Resolves when retry processing has started
   * @fires RetryManager#retry-started
   * 
   * @example
   * await retryManager.start();
   * console.log('Retry processing active');
   * 
   * // System will now automatically retry failed transactions
   * retryManager.on('retry', ({ transaction, attempt }) => {
   *   updateRetryStatus(transaction.id, attempt);
   * });
   */
  async start() {
    if (this.isRunning) {
      console.warn('RetryManager is already running');
      return;
    }
    
    this.isRunning = true;
    this.stats.startTime = Date.now();
    
    // Start periodic retry processing
    this.checkInterval = setInterval(this._processRetryQueue, this.config.checkInterval);
    
    // Start periodic cleanup of expired retries
    this.cleanupInterval = setInterval(this._cleanupExpiredRetries, this.config.cleanupInterval);
    
    console.log('RetryManager started successfully');
    
    /**
     * Retry processing started event
     * @event RetryManager#retry-started
     * @type {Object}
     * @property {number} timestamp - When retry processing started
     * @property {Object} config - Current retry configuration
     */
    this.emit('retry-started', {
      timestamp: this.stats.startTime,
      config: this.config
    });
  }
  
  /**
   * Stops the retry processing system
   * 
   * Gracefully stops all retry processing while preserving queued retries.
   * Clears all timers and intervals but maintains retry state for potential restart.
   * 
   * @public
   * @method stop
   * @returns {Promise<Object>} Resolves with final retry statistics
   * @fires RetryManager#retry-stopped
   * 
   * @example
   * const finalStats = await retryManager.stop();
   * console.log(`Processed ${finalStats.totalRetries} retry attempts`);
   * console.log(`Success rate: ${finalStats.successfulRetries}/${finalStats.totalRetries}`);
   */
  async stop() {
    if (!this.isRunning) {
      console.warn('RetryManager is not currently running');
      return this.getStats();
    }
    
    this.isRunning = false;
    
    // Clear intervals
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    
    const finalStats = this.getStats();
    
    console.log('RetryManager stopped', finalStats);
    
    /**
     * Retry processing stopped event
     * @event RetryManager#retry-stopped
     * @type {Object}
     * @property {number} timestamp - When retry processing stopped
     * @property {Object} finalStats - Final retry statistics
     * @property {number} pendingRetries - Number of retries still queued
     */
    this.emit('retry-stopped', {
      timestamp: Date.now(),
      finalStats,
      pendingRetries: this.retryQueue.size
    });
    
    return finalStats;
  }
  
  /**
   * Adds a failed transaction to the retry queue
   * 
   * Analyzes the failure reason and schedules appropriate retry attempts
   * with exponential backoff. Handles error categorization to avoid
   * retrying permanent failures.
   * 
   * @public
   * @method addFailedTransaction
   * @param {Object} transaction - The failed transaction object
   * @param {string} transaction.id - Unique transaction identifier
   * @param {string} transaction.txHash - Transaction hash
   * @param {string} transaction.network - Blockchain network
   * @param {string} [transaction.type] - Transaction type
   * @param {string} reason - Reason for transaction failure
   * @returns {boolean} True if transaction was queued for retry, false if permanent failure
   * @fires RetryManager#transaction-queued
   * @fires RetryManager#permanent-failure
   * 
   * @example
   * const wasQueued = retryManager.addFailedTransaction(
   *   {
   *     id: 'tx_001',
   *     txHash: '0x1234...',
   *     network: 'ethereum',
   *     type: 'transfer'
   *   },
   *   'NETWORK_ERROR'
   * );
   * 
   * if (wasQueued) {
   *   console.log('Transaction queued for retry');
   * } else {
   *   console.log('Transaction failure is permanent');
   * }
   */
  addFailedTransaction(transaction, reason) {
    if (!transaction || !transaction.id) {
      throw new Error('Transaction must have a valid ID');
    }
    
    if (!reason || typeof reason !== 'string') {
      throw new Error('Failure reason must be a non-empty string');
    }
    
    // Check if this is a retryable error
    if (!this._isRetryableError(reason)) {
      console.log(`Transaction ${transaction.id} failed with permanent error: ${reason}`);
      this.stats.permanentFailures++;
      
      /**
       * Permanent failure event
       * @event RetryManager#permanent-failure
       * @type {Object}
       * @property {Object} transaction - The permanently failed transaction
       * @property {string} reason - Failure reason
       * @property {string} errorCategory - Error category (permanent)
       */
      this.emit('permanent-failure', {
        transaction,
        reason,
        errorCategory: 'permanent'
      });
      
      return false;
    }
    
    // Check if already in retry queue
    if (this.retryQueue.has(transaction.id)) {
      const existingRetry = this.retryQueue.get(transaction.id);
      existingRetry.failures.push({
        reason,
        timestamp: Date.now()
      });
      console.log(`Updated existing retry entry for transaction ${transaction.id}`);
      return true;
    }
    
    // Create new retry entry
    const retryData = {
      transaction: { ...transaction },
      originalFailure: reason,
      failures: [{
        reason,
        timestamp: Date.now()
      }],
      retryCount: 0,
      maxRetries: this.config.maxRetries,
      nextRetryAt: Date.now() + this._calculateDelay(0),
      createdAt: Date.now(),
      lastFailureReason: reason
    };
    
    this.retryQueue.set(transaction.id, retryData);
    
    console.log(`Queued transaction ${transaction.id} for retry (reason: ${reason})`);
    
    /**
     * Transaction queued for retry event
     * @event RetryManager#transaction-queued
     * @type {Object}
     * @property {Object} transaction - The transaction queued for retry
     * @property {string} reason - Initial failure reason
     * @property {number} nextRetryAt - Timestamp of next retry attempt
     * @property {number} queueSize - Current retry queue size
     */
    this.emit('transaction-queued', {
      transaction,
      reason,
      nextRetryAt: retryData.nextRetryAt,
      queueSize: this.retryQueue.size
    });
    
    return true;
  }
  
  /**
   * Determines if an error is retryable
   * @private
   */
  _isRetryableError(reason) {
    const upperReason = reason.toUpperCase();
    
    // Check permanent errors first
    for (const permanentError of this.config.permanentErrors) {
      if (upperReason.includes(permanentError.toUpperCase())) {
        return false;
      }
    }
    
    // Check retryable errors
    for (const retryableError of this.config.retryableErrors) {
      if (upperReason.includes(retryableError.toUpperCase())) {
        return true;
      }
    }
    
    // Default to non-retryable for unknown errors
    return false;
  }
  
  /**
   * Calculates exponential backoff delay with jitter
   * @private
   */
  _calculateDelay(attempt) {
    const baseDelay = this.config.initialDelay * Math.pow(this.config.backoffMultiplier, attempt);
    const cappedDelay = Math.min(baseDelay, this.config.maxDelay);
    
    // Add random jitter to prevent thundering herd
    const jitter = cappedDelay * this.config.jitterRange * (Math.random() - 0.5) * 2;
    const finalDelay = Math.max(1000, cappedDelay + jitter); // Minimum 1 second
    
    return Math.round(finalDelay);
  }
  
  /**
   * Processes the retry queue
   * @private
   */
  async _processRetryQueue() {
    if (!this.isRunning || this.activeRetries.size >= this.config.maxConcurrentRetries) {
      return;
    }
    
    const now = Date.now();
    const readyRetries = [];
    
    // Find retries that are ready to process
    for (const [transactionId, retryData] of this.retryQueue.entries()) {
      if (now >= retryData.nextRetryAt && !this.activeRetries.has(transactionId)) {
        if (retryData.retryCount >= retryData.maxRetries) {
          // Max retries reached
          await this._handleMaxRetriesReached(retryData);
          continue;
        }
        
        readyRetries.push({ transactionId, retryData });
      }
    }
    
    // Process ready retries up to concurrent limit
    const availableSlots = this.config.maxConcurrentRetries - this.activeRetries.size;
    const retriesToProcess = readyRetries.slice(0, availableSlots);
    
    for (const { transactionId, retryData } of retriesToProcess) {
      await this._executeRetry(transactionId, retryData);
    }
  }
  
  /**
   * Executes a retry attempt
   * @private
   */
  async _executeRetry(transactionId, retryData) {
    this.activeRetries.add(transactionId);
    retryData.retryCount++;
    this.stats.totalRetries++;
    
    const delay = this._calculateDelay(retryData.retryCount - 1);
    
    console.log(`Executing retry ${retryData.retryCount}/${retryData.maxRetries} for transaction ${transactionId}`);
    
    /**
     * Retry attempt event
     * @event RetryManager#retry
     * @type {Object}
     * @property {Object} transaction - The transaction being retried
     * @property {number} attempt - Current retry attempt number
     * @property {number} totalAttempts - Total number of attempts including original
     * @property {number} delay - Delay before this retry (ms)
     * @property {string} reason - Original failure reason
     * @property {number} nextRetryAt - Timestamp of next retry if this fails
     */
    this.emit('retry', {
      transaction: retryData.transaction,
      attempt: retryData.retryCount,
      totalAttempts: retryData.retryCount + 1,
      delay,
      reason: retryData.lastFailureReason,
      nextRetryAt: retryData.nextRetryAt
    });
    
    try {
      // Attempt to re-queue the transaction
      const success = this.queue.enqueue({
        ...retryData.transaction,
        retryCount: retryData.retryCount,
        isRetry: true,
        originalFailure: retryData.originalFailure
      });
      
      if (success) {
        console.log(`Successfully re-queued transaction ${transactionId} (attempt ${retryData.retryCount})`);
        this.stats.successfulRetries++;
        
        /**
         * Retry success event - emitted when a transaction retry succeeds
         * 
         * This event indicates that a previously failed transaction has been successfully
         * retried and re-submitted to the broadcast queue. The transaction will now be
         * monitored again for confirmation. This is crucial for tracking retry effectiveness
         * and updating user interfaces with successful recovery status.
         * 
         * @event RetryManager#retrySuccess
         * @type {Object}
         * @property {Object} transaction - The successfully retried transaction object
         * @property {string} transaction.id - Unique transaction identifier
         * @property {string} transaction.txHash - Transaction hash (may be updated on retry)
         * @property {string} transaction.network - Blockchain network name
         * @property {boolean} transaction.isRetry - Flag indicating this is a retry attempt
         * @property {number} attempt - The successful retry attempt number (1-based)
         * @property {string} txHash - Transaction hash for monitoring (same as transaction.txHash)
         * @property {number} totalDelay - Total time spent in retry queue before success (milliseconds)
         * @property {string} originalFailure - Original failure reason that triggered retry
         * @property {number} timestamp - When the retry succeeded
         * 
         * @example
         * retryManager.on('retrySuccess', ({ transaction, attempt, totalDelay }) => {
         *   console.log(`✅ Transaction ${transaction.id} retry succeeded on attempt ${attempt}`);
         *   console.log(`Recovery took ${totalDelay}ms total`);
         *   updateTransactionStatus(transaction.id, 'retry-success', { attempt, totalDelay });
         *   showSuccessNotification(`Transaction recovered after ${attempt} retries`);
         * });
         */
        this.emit('retrySuccess', {
          transaction: retryData.transaction,
          attempt: retryData.retryCount,
          txHash: retryData.transaction.txHash,
          totalDelay: Date.now() - retryData.createdAt,
          originalFailure: retryData.originalFailure,
          timestamp: Date.now()
        });
        
        // Remove from retry queue
        this.retryQueue.delete(transactionId);
      } else {
        throw new Error('Failed to re-queue transaction');
      }
      
    } catch (error) {
      console.error(`Retry attempt ${retryData.retryCount} failed for transaction ${transactionId}:`, error);
      
      // Schedule next retry
      retryData.nextRetryAt = Date.now() + this._calculateDelay(retryData.retryCount);
      retryData.lastFailureReason = error.message;
      retryData.failures.push({
        reason: error.message,
        timestamp: Date.now(),
        attempt: retryData.retryCount
      });
      
      this.stats.failedRetries++;
      
      /**
       * Retry failed event - emitted when a specific retry attempt fails
       * 
       * This event provides detailed information about failed retry attempts,
       * enabling better error tracking, logging, and user interface updates.
       * Unlike 'maxRetriesReached', this event is emitted for each individual
       * retry failure while more attempts may still be scheduled.
       * 
       * @event RetryManager#retryFailed
       * @type {Object}
       * @property {Object} transaction - The transaction that failed retry
       * @property {string} transaction.id - Unique transaction identifier
       * @property {number} attempt - Failed retry attempt number
       * @property {number} totalAttempts - Total attempts made so far (including original)
       * @property {string} reason - Specific failure reason for this attempt
       * @property {string} originalFailure - Original failure reason that triggered retry
       * @property {Error} error - The error object that caused the failure
       * @property {number} nextRetryAt - Timestamp of next scheduled retry attempt
       * @property {number} remainingRetries - Number of retry attempts remaining
       * @property {number} totalDelay - Total time spent in retry process so far (milliseconds)
       * @property {Array} failureHistory - Array of all previous failure attempts
       * @property {number} timestamp - When this retry attempt failed
       * 
       * @example
       * retryManager.on('retryFailed', ({ transaction, attempt, reason, remainingRetries }) => {
       *   console.warn(`❌ Retry ${attempt} failed for ${transaction.id}: ${reason}`);
       *   console.log(`${remainingRetries} retries remaining`);
       *   updateTransactionStatus(transaction.id, 'retry-failed', { 
       *     attempt, 
       *     reason, 
       *     remainingRetries 
       *   });
       *   if (remainingRetries === 0) {
       *     showErrorNotification(`Transaction ${transaction.id} exhausted all retries`);
       *   }
       * });
       */
      this.emit('retryFailed', {
        transaction: retryData.transaction,
        attempt: retryData.retryCount,
        totalAttempts: retryData.retryCount + 1,
        reason: error.message,
        originalFailure: retryData.originalFailure,
        error,
        nextRetryAt: retryData.nextRetryAt,
        remainingRetries: retryData.maxRetries - retryData.retryCount,
        totalDelay: Date.now() - retryData.createdAt,
        failureHistory: retryData.failures,
        timestamp: Date.now()
      });
    } finally {
      this.activeRetries.delete(transactionId);
    }
  }
  
  /**
   * Handles transactions that have reached maximum retries
   * @private
   */
  async _handleMaxRetriesReached(retryData) {
    console.error(`Transaction ${retryData.transaction.id} reached maximum retries (${retryData.maxRetries})`);
    
    this.stats.maxRetriesReached++;
    this.retryQueue.delete(retryData.transaction.id);
    
    /**
     * Maximum retries reached event
     * @event RetryManager#maxRetriesReached
     * @type {Object}
     * @property {Object} transaction - The transaction that exhausted retries
     * @property {number} totalAttempts - Total number of attempts made
     * @property {Array} failures - Array of all failure reasons and timestamps
     * @property {number} totalDuration - Total time spent retrying (ms)
     * @property {string} finalReason - Final failure reason
     */
    this.emit('maxRetriesReached', {
      transaction: retryData.transaction,
      totalAttempts: retryData.retryCount + 1,
      failures: retryData.failures,
      totalDuration: Date.now() - retryData.createdAt,
      finalReason: retryData.lastFailureReason
    });
  }
  
  /**
   * Cleans up expired retry entries based on configurable expiry time
   * @private
   */
  _cleanupExpiredRetries() {
    const now = Date.now();
    const maxAge = this.config.retryExpiryMs; // Use configurable expiry time
    let cleanedCount = 0;
    
    for (const [transactionId, retryData] of this.retryQueue.entries()) {
      if (now - retryData.createdAt > maxAge) {
        this.retryQueue.delete(transactionId);
        cleanedCount++;
        
        // Emit event for expired retry cleanup
        this.emit('retry-expired', {
          transaction: retryData.transaction,
          totalAttempts: retryData.retryCount + 1,
          totalDuration: now - retryData.createdAt,
          finalReason: retryData.lastFailureReason,
          expiredAt: now
        });
      }
    }
    
    if (cleanedCount > 0) {
      console.log(`Cleaned up ${cleanedCount} expired retry entries (older than ${maxAge}ms)`);
    }
  }
  
  /**
   * Gets retry statistics
   * @public
   */
  getStats() {
    const runtime = this.stats.startTime ? Date.now() - this.stats.startTime : 0;
    const avgDelay = this.stats.totalRetries > 0 
      ? Array.from(this.retryQueue.values())
          .reduce((sum, retry) => sum + (retry.nextRetryAt - retry.createdAt), 0) / this.retryQueue.size
      : 0;
    
    return {
      ...this.stats,
      currentRetryQueue: this.retryQueue.size,
      activeRetries: this.activeRetries.size,
      isRunning: this.isRunning,
      runtime,
      averageRetryDelay: Math.round(avgDelay),
      successRate: this.stats.totalRetries > 0
        ? Math.round((this.stats.successfulRetries / this.stats.totalRetries) * 100)
        : 0
    };
  }
  
  /**
   * Gets queued retries
   * @public
   */
  getQueuedRetries() {
    return Array.from(this.retryQueue.values());
  }
  
  /**
   * Gets specific retry status
   * @public
   */
  getRetryStatus(transactionId) {
    return this.retryQueue.get(transactionId) || null;
  }
  
  /**
   * Removes a transaction from retry queue
   * @public
   */
  removeRetry(transactionId) {
    const removed = this.retryQueue.delete(transactionId);
    if (removed) {
      console.log(`Removed transaction ${transactionId} from retry queue`);
    }
    return removed;
  }
  
  /**
   * Clears all queued retries
   * @public
   */
  clearRetryQueue() {
    const count = this.retryQueue.size;
    this.retryQueue.clear();
    console.log(`Cleared ${count} retries from queue`);
    return count;
  }
  
  /**
   * Graceful shutdown
   * @public
   */
  async shutdown() {
    console.log('Shutting down RetryManager...');
    
    const finalStats = await this.stop();
    this.clearRetryQueue();
    this.removeAllListeners();
    
    console.log('RetryManager shutdown complete');
    return finalStats;
  }
}
