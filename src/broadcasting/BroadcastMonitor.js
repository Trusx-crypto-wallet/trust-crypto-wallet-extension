/**
 * BroadcastMonitor.js
 * 
 * A production-ready transaction monitoring system for cryptocurrency wallets.
 * Monitors transaction status across blockchain networks using ethers.js provider
 * and integrates with BroadcastQueue for comprehensive transaction lifecycle management.
 * 
 * @author Trust Crypto Wallet Extension
 * @version 1.0.0
 */

import { ethers } from "ethers";
import { EventEmitter } from 'events';
import BroadcastQueue from "./BroadcastQueue.js";

/**
 * BroadcastMonitor - Advanced transaction monitoring with ethers.js integration
 * 
 * Monitors cryptocurrency transactions across multiple blockchain networks,
 * tracking their progress from mempool to confirmation. Integrates with
 * BroadcastQueue for seamless transaction lifecycle management.
 * 
 * @class BroadcastMonitor
 * @extends EventEmitter
 * @example
 * const provider = new ethers.JsonRpcProvider('https://mainnet.infura.io/v3/YOUR-PROJECT-ID');
 * const queue = new BroadcastQueue();
 * const monitor = new BroadcastMonitor(queue, provider, {
 *   confirmationBlocks: 12,
 *   timeout: 300000,
 *   checkInterval: 15000
 * });
 * 
 * monitor.on('confirmed', ({ txHash, receipt, confirmations }) => {
 *   console.log(`Transaction ${txHash} confirmed with ${confirmations} blocks`);
 * });
 * 
 * monitor.on('failed', ({ txHash, reason, receipt }) => {
 *   console.error(`Transaction ${txHash} failed: ${reason}`);
 * });
 * 
 * monitor.startMonitoring();
 * monitor.addTransaction('0x1234567890abcdef...');
 */
export default class BroadcastMonitor extends EventEmitter {
  /**
   * Creates a new BroadcastMonitor instance
   * 
   * Initializes the monitor with a queue for transaction management,
   * an ethers provider for blockchain interaction, and configurable options
   * for monitoring behavior.
   * 
   * @constructor
   * @param {BroadcastQueue} queue - The broadcast queue instance for transaction management
   * @param {ethers.Provider} provider - Ethers.js provider for blockchain interaction
   * @param {Object} [options={}] - Configuration options for monitoring behavior
   * @param {number} [options.confirmationBlocks=12] - Number of blocks required for confirmation
   * @param {number} [options.timeout=300000] - Transaction timeout in milliseconds (5 minutes)
   * @param {number} [options.checkInterval=15000] - Interval for status checks in milliseconds (15 seconds)
   * @param {number} [options.maxConcurrentMonitoring=100] - Maximum number of transactions to monitor simultaneously
   * @param {boolean} [options.monitorMempool=true] - Whether to monitor mempool for pending transactions
   * @param {number} [options.retryAttempts=3] - Number of retry attempts for failed provider calls
   * @param {number} [options.retryDelay=2000] - Delay between retry attempts in milliseconds
   * @param {Object} [options.networkConfig] - Network-specific configuration overrides
   * 
   * @throws {TypeError} If queue is not a BroadcastQueue instance
   * @throws {TypeError} If provider is not a valid ethers provider
   * @throws {RangeError} If configuration values are outside acceptable ranges
   * 
   * @example
   * const monitor = new BroadcastMonitor(queue, provider, {
   *   confirmationBlocks: 6,
   *   timeout: 180000, // 3 minutes
   *   checkInterval: 10000, // 10 seconds
   *   maxConcurrentMonitoring: 50,
   *   networkConfig: {
   *     ethereum: { confirmationBlocks: 12, timeout: 300000 },
   *     polygon: { confirmationBlocks: 20, timeout: 120000 }
   *   }
   * });
   */
  constructor(queue, provider, options = {}) {
    super();
    
    // Validate required parameters
    if (!(queue instanceof BroadcastQueue)) {
      throw new TypeError('Queue must be an instance of BroadcastQueue');
    }
    
    if (!provider || typeof provider.getTransactionReceipt !== 'function') {
      throw new TypeError('Provider must be a valid ethers provider');
    }
    
    // Store core dependencies
    this.queue = queue;
    this.provider = provider;
    
    // Configuration with defaults
    this.config = {
      confirmationBlocks: options.confirmationBlocks || 12,
      timeout: options.timeout || 300000, // 5 minutes
      checkInterval: options.checkInterval || 15000, // 15 seconds
      maxConcurrentMonitoring: options.maxConcurrentMonitoring || 100,
      monitorMempool: options.monitorMempool !== false, // Default true
      retryAttempts: options.retryAttempts || 3,
      retryDelay: options.retryDelay || 2000,
      networkConfig: options.networkConfig || {},
      ...options
    };
    
    // Validate configuration ranges
    this._validateConfig();
    
    // Internal state
    this.isMonitoring = false;
    this.isPaused = false; // New state for pause/resume functionality
    this.monitoredTransactions = new Map(); // txHash -> monitoring data
    this.intervalId = null;
    this.pendingListener = null;
    
    // Statistics
    this.stats = {
      totalMonitored: 0,
      confirmed: 0,
      failed: 0,
      dropped: 0,
      timeouts: 0,
      retries: 0,
      startTime: null
    };
    
    // Bind methods
    this._handlePendingTransaction = this._handlePendingTransaction.bind(this);
    this._checkTransactionStatus = this._checkTransactionStatus.bind(this);
    this._monitoringLoop = this._monitoringLoop.bind(this);
    
    // Setup queue event listeners
    this._setupQueueListeners();
    
    console.log('BroadcastMonitor initialized with configuration:', this.config);
  }
  
  /**
   * Validates configuration parameters
   * @private
   */
  _validateConfig() {
    const { confirmationBlocks, timeout, checkInterval, maxConcurrentMonitoring, retryAttempts } = this.config;
    
    if (confirmationBlocks < 1 || confirmationBlocks > 100) {
      throw new RangeError('confirmationBlocks must be between 1 and 100');
    }
    
    if (timeout < 10000 || timeout > 3600000) { // 10 seconds to 1 hour
      throw new RangeError('timeout must be between 10,000ms and 3,600,000ms');
    }
    
    if (checkInterval < 1000 || checkInterval > 300000) { // 1 second to 5 minutes
      throw new RangeError('checkInterval must be between 1,000ms and 300,000ms');
    }
    
    if (maxConcurrentMonitoring < 1 || maxConcurrentMonitoring > 1000) {
      throw new RangeError('maxConcurrentMonitoring must be between 1 and 1000');
    }
    
    if (retryAttempts < 0 || retryAttempts > 10) {
      throw new RangeError('retryAttempts must be between 0 and 10');
    }
  }
  
  /**
   * Sets up event listeners for the broadcast queue
   * @private
   */
  _setupQueueListeners() {
    // Monitor transactions added to queue
    this.queue.on('enqueue', ({ transaction }) => {
      if (transaction.txHash && this.isMonitoring) {
        this.addTransaction(transaction.txHash, {
          id: transaction.id,
          network: transaction.network,
          type: transaction.type,
          priority: transaction.priority
        });
      }
    });
    
    // Handle queue errors
    this.queue.on('error', ({ error, operation, transaction }) => {
      console.error(`Queue error during ${operation}:`, error);
      this.emit('error', { 
        source: 'queue', 
        error, 
        operation, 
        transaction 
      });
    });
  }
  
  /**
   * Starts monitoring blockchain transactions
   * 
   * Begins the monitoring process by setting up blockchain event listeners,
   * starting the periodic status check loop, and enabling mempool monitoring
   * if configured. This method is idempotent and safe to call multiple times.
   * 
   * @public
   * @method startMonitoring
   * @returns {Promise<void>} Resolves when monitoring has started successfully
   * @fires BroadcastMonitor#monitoring-started
   * 
   * @example
   * await monitor.startMonitoring();
   * console.log('Transaction monitoring active');
   * 
   * // Monitor will now emit events for transaction status changes
   * monitor.on('confirmed', ({ txHash, confirmations }) => {
   *   updateTransactionUI(txHash, 'confirmed', confirmations);
   * });
   */
  async startMonitoring() {
    if (this.isMonitoring) {
      console.warn('BroadcastMonitor is already monitoring');
      return;
    }
    
    try {
      // Verify provider connectivity
      await this._verifyProviderConnection();
      
      this.isMonitoring = true;
      this.stats.startTime = Date.now();
      
      // Start mempool monitoring if enabled
      if (this.config.monitorMempool) {
        this._startMempoolMonitoring();
      }
      
      // Start periodic status checking
      this.intervalId = setInterval(this._monitoringLoop, this.config.checkInterval);
      
      console.log('BroadcastMonitor started successfully');
      
      /**
       * Monitoring started event
       * @event BroadcastMonitor#monitoring-started
       * @type {Object}
       * @property {number} timestamp - When monitoring started
       * @property {Object} config - Current configuration
       */
      this.emit('monitoring-started', {
        timestamp: this.stats.startTime,
        config: this.config
      });
      
    } catch (error) {
      console.error('Failed to start BroadcastMonitor:', error);
      this.emit('error', { 
        source: 'startup', 
        error, 
        operation: 'startMonitoring' 
      });
      throw error;
    }
  }
  
  /**
   * Temporarily pauses monitoring without clearing state
   * 
   * Suspends all monitoring activities while preserving the current state
   * of monitored transactions. Unlike stopMonitoring(), this maintains
   * all transaction data and can be quickly resumed with resume().
   * 
   * @public
   * @method pause
   * @returns {Object} Current monitoring statistics when paused
   * @fires BroadcastMonitor#monitoring-paused
   * 
   * @example
   * // Temporarily pause during network maintenance
   * const stats = monitor.pause();
   * console.log(`Paused monitoring ${stats.currentlyMonitored} transactions`);
   * 
   * // Resume when ready
   * setTimeout(() => monitor.resume(), 30000);
   */
  pause() {
    if (!this.isMonitoring) {
      console.warn('BroadcastMonitor is not currently monitoring');
      return this.getStats();
    }
    
    // Stop periodic checking but keep state
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    
    // Stop mempool monitoring temporarily
    this._stopMempoolMonitoring();
    
    this.isMonitoring = false;
    this.isPaused = true;
    
    const currentStats = this.getStats();
    
    console.log(`BroadcastMonitor paused with ${this.monitoredTransactions.size} transactions`);
    
    /**
     * Monitoring paused event
     * @event BroadcastMonitor#monitoring-paused
     * @type {Object}
     * @property {number} timestamp - When monitoring was paused
     * @property {Object} stats - Current monitoring statistics
     * @property {number} pendingTransactions - Number of transactions still tracked
     */
    this.emit('monitoring-paused', {
      timestamp: Date.now(),
      stats: currentStats,
      pendingTransactions: this.monitoredTransactions.size
    });
    
    return currentStats;
  }
  
  /**
   * Resumes monitoring from paused state
   * 
   * Restarts all monitoring activities from where they were paused,
   * maintaining all previously tracked transactions and their state.
   * This provides seamless continuation of monitoring operations.
   * 
   * @public
   * @method resume
   * @returns {Promise<Object>} Current monitoring statistics after resuming
   * @fires BroadcastMonitor#monitoring-resumed
   * 
   * @example
   * // Resume monitoring after maintenance
   * const stats = await monitor.resume();
   * console.log(`Resumed monitoring ${stats.currentlyMonitored} transactions`);
   */
  async resume() {
    if (this.isMonitoring) {
      console.warn('BroadcastMonitor is already monitoring');
      return this.getStats();
    }
    
    if (!this.isPaused) {
      console.warn('BroadcastMonitor was not paused, use startMonitoring() instead');
      return await this.startMonitoring();
    }
    
    try {
      // Verify provider connectivity
      await this._verifyProviderConnection();
      
      this.isMonitoring = true;
      this.isPaused = false;
      
      // Restart mempool monitoring if enabled
      if (this.config.monitorMempool) {
        this._startMempoolMonitoring();
      }
      
      // Restart periodic status checking
      this.intervalId = setInterval(this._monitoringLoop, this.config.checkInterval);
      
      const currentStats = this.getStats();
      
      console.log(`BroadcastMonitor resumed with ${this.monitoredTransactions.size} transactions`);
      
      /**
       * Monitoring resumed event
       * @event BroadcastMonitor#monitoring-resumed
       * @type {Object}
       * @property {number} timestamp - When monitoring was resumed
       * @property {Object} stats - Current monitoring statistics
       * @property {number} pendingTransactions - Number of transactions being monitored
       */
      this.emit('monitoring-resumed', {
        timestamp: Date.now(),
        stats: currentStats,
        pendingTransactions: this.monitoredTransactions.size
      });
      
      return currentStats;
      
    } catch (error) {
      console.error('Failed to resume BroadcastMonitor:', error);
      this.emit('error', { 
        source: 'resume', 
        error, 
        operation: 'resume' 
      });
      throw error;
    }
  }

  /**
   * Stops monitoring blockchain transactions
   * 
   * Gracefully stops all monitoring activities including blockchain event listeners,
   * periodic status checks, and mempool monitoring. Preserves currently monitored
   * transactions for potential restart.
   * 
   * @public
   * @method stopMonitoring
   * @returns {Promise<Object>} Resolves with final monitoring statistics
   * @fires BroadcastMonitor#monitoring-stopped
   * 
   * @example
   * const finalStats = await monitor.stopMonitoring();
   * console.log(`Monitored ${finalStats.totalMonitored} transactions`);
   * console.log(`${finalStats.confirmed} confirmed, ${finalStats.failed} failed`);
   */
  async stopMonitoring() {
    if (!this.isMonitoring && !this.isPaused) {
      console.warn('BroadcastMonitor is not currently monitoring');
      return this.getStats();
    }
    
    this.isMonitoring = false;
    this.isPaused = false;
    
    // Stop periodic checking
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    
    // Stop mempool monitoring
    this._stopMempoolMonitoring();
    
    const finalStats = this.getStats();
    
    console.log('BroadcastMonitor stopped', finalStats);
    
    /**
     * Monitoring stopped event
     * @event BroadcastMonitor#monitoring-stopped
     * @type {Object}
     * @property {number} timestamp - When monitoring stopped
     * @property {Object} finalStats - Final monitoring statistics
     * @property {number} pendingTransactions - Number of transactions still being monitored
     */
    this.emit('monitoring-stopped', {
      timestamp: Date.now(),
      finalStats,
      pendingTransactions: this.monitoredTransactions.size
    });
    
    return finalStats;
  }
  
  /**
   * Adds a transaction to the monitoring system
   * 
   * Begins monitoring a specific transaction by its hash. The transaction
   * will be tracked through confirmation, failure, or timeout. Supports
   * additional metadata for enhanced tracking and reporting.
   * 
   * @public
   * @method addTransaction
   * @param {string} txHash - The transaction hash to monitor (must be valid hex with 0x prefix)
   * @param {Object} [metadata={}] - Additional transaction metadata
   * @param {string} [metadata.id] - Unique transaction identifier
   * @param {string} [metadata.network] - Blockchain network name
   * @param {string} [metadata.type] - Transaction type (transfer, swap, etc.)
   * @param {number} [metadata.priority] - Transaction priority level
   * @param {number} [metadata.gasPrice] - Gas price used
   * @param {string} [metadata.from] - Sender address
   * @param {string} [metadata.to] - Recipient address
   * @returns {boolean} True if transaction was added successfully, false if already monitored
   * @throws {Error} If txHash is invalid or monitoring limit exceeded
   * @fires BroadcastMonitor#transaction-added
   * 
   * @example
   * const success = monitor.addTransaction(
   *   '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
   *   {
   *     id: 'tx_001',
   *     network: 'ethereum',
   *     type: 'transfer',
   *     priority: 5,
   *     from: '0xabc...',
   *     to: '0xdef...'
   *   }
   * );
   * 
   * if (success) {
   *   console.log('Transaction added to monitoring');
   * }
   */
  addTransaction(txHash, metadata = {}) {
    // Validate transaction hash
    if (!txHash || typeof txHash !== 'string') {
      throw new Error('Transaction hash must be a non-empty string');
    }
    
    if (!ethers.isHexString(txHash, 32)) {
      throw new Error('Invalid transaction hash format (must be 0x + 64 hex characters)');
    }
    
    // Check if already monitoring
    if (this.monitoredTransactions.has(txHash)) {
      console.warn(`Transaction ${txHash} is already being monitored`);
      return false;
    }
    
    // Check monitoring limit
    if (this.monitoredTransactions.size >= this.config.maxConcurrentMonitoring) {
      throw new Error(`Maximum concurrent monitoring limit reached (${this.config.maxConcurrentMonitoring})`);
    }
    
    // Create monitoring entry
    const monitoringData = {
      txHash,
      metadata: { ...metadata },
      addedAt: Date.now(),
      lastChecked: 0,
      confirmations: 0,
      status: 'pending',
      retryCount: 0,
      timeoutAt: Date.now() + this.config.timeout
    };
    
    this.monitoredTransactions.set(txHash, monitoringData);
    this.stats.totalMonitored++;
    
    console.log(`Added transaction ${txHash} to monitoring (${this.monitoredTransactions.size} total)`);
    
    /**
     * Transaction added event
     * @event BroadcastMonitor#transaction-added
     * @type {Object}
     * @property {string} txHash - The transaction hash
     * @property {Object} metadata - Transaction metadata
     * @property {number} totalMonitored - Total number of monitored transactions
     */
    this.emit('transaction-added', {
      txHash,
      metadata,
      totalMonitored: this.monitoredTransactions.size
    });
    
    // If monitoring is active, start checking immediately
    if (this.isMonitoring) {
      this._checkTransactionStatus(monitoringData).catch(error => {
        console.error(`Error checking transaction ${txHash}:`, error);
      });
    }
    
    return true;
  }
  
  /**
   * Verifies provider connection
   * @private
   */
  async _verifyProviderConnection() {
    try {
      await this.provider.getBlockNumber();
    } catch (error) {
      throw new Error(`Provider connection failed: ${error.message}`);
    }
  }
  
  /**
   * Starts mempool monitoring
   * @private
   */
  _startMempoolMonitoring() {
    if (!this.config.monitorMempool) return;
    
    try {
      this.pendingListener = this._handlePendingTransaction;
      this.provider.on('pending', this.pendingListener);
      console.log('Mempool monitoring started');
    } catch (error) {
      console.warn('Failed to start mempool monitoring:', error);
    }
  }
  
  /**
   * Stops mempool monitoring
   * @private
   */
  _stopMempoolMonitoring() {
    if (this.pendingListener) {
      try {
        this.provider.off('pending', this.pendingListener);
        this.pendingListener = null;
        console.log('Mempool monitoring stopped');
      } catch (error) {
        console.warn('Error stopping mempool monitoring:', error);
      }
    }
  }
  
  /**
   * Handles pending transaction events from mempool
   * @private
   */
  _handlePendingTransaction(txHash) {
    if (this.monitoredTransactions.has(txHash)) {
      const data = this.monitoredTransactions.get(txHash);
      if (data.status === 'pending') {
        console.log(`Detected pending transaction ${txHash} in mempool`);
        this.emit('mempool-detected', { txHash, metadata: data.metadata });
      }
    }
  }
  
  /**
   * Main monitoring loop - checks status of all monitored transactions
   * @private
   */
  async _monitoringLoop() {
    if (!this.isMonitoring || this.monitoredTransactions.size === 0) {
      return;
    }
    
    const transactions = Array.from(this.monitoredTransactions.values());
    const currentTime = Date.now();
    
    console.log(`Checking status of ${transactions.length} monitored transactions`);
    
    // Process transactions in batches to avoid overwhelming the provider
    const batchSize = 10;
    for (let i = 0; i < transactions.length; i += batchSize) {
      const batch = transactions.slice(i, i + batchSize);
      
      const promises = batch.map(async (data) => {
        try {
          // Check for timeout
          if (currentTime > data.timeoutAt) {
            await this._handleTransactionTimeout(data);
            return;
          }
          
          await this._checkTransactionStatus(data);
        } catch (error) {
          console.error(`Error checking transaction ${data.txHash}:`, error);
          await this._handleMonitoringError(data, error);
        }
      });
      
      await Promise.allSettled(promises);
      
      // Small delay between batches
      if (i + batchSize < transactions.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
  }
  
  /**
   * Checks the status of a specific transaction
   * @private
   */
  async _checkTransactionStatus(data) {
    data.lastChecked = Date.now();
    
    let receipt = null;
    let currentBlock = null;
    
    // Retry logic for provider calls
    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      try {
        [receipt, currentBlock] = await Promise.all([
          this.provider.getTransactionReceipt(data.txHash),
          this.provider.getBlockNumber()
        ]);
        break; // Success, exit retry loop
        
      } catch (error) {
        if (attempt === this.config.retryAttempts) {
          throw error; // Final attempt failed
        }
        
        console.warn(`Provider call failed (attempt ${attempt}/${this.config.retryAttempts}):`, error.message);
        this.stats.retries++;
        await new Promise(resolve => setTimeout(resolve, this.config.retryDelay));
      }
    }
    
    if (!receipt) {
      // Transaction not yet mined
      data.status = 'pending';
      return;
    }
    
    // Calculate confirmations
    data.confirmations = Math.max(0, currentBlock - receipt.blockNumber + 1);
    
    // Check if transaction failed
    if (receipt.status === 0) {
      await this._handleTransactionFailed(data, receipt, 'Transaction reverted');
      return;
    }
    
    // Check if fully confirmed
    const requiredConfirmations = this._getRequiredConfirmations(data);
    if (data.confirmations >= requiredConfirmations) {
      await this._handleTransactionConfirmed(data, receipt);
    } else {
      data.status = 'confirming';
      
      /**
       * Transaction confirming event - emitted when transaction is mined but not fully confirmed
       * 
       * This event indicates that a transaction has been included in a block but has not
       * yet reached the required number of confirmations. Useful for showing progress
       * in user interfaces and providing real-time updates on confirmation status.
       * 
       * @event BroadcastMonitor#confirming
       * @type {Object}
       * @property {string} txHash - The transaction hash being confirmed
       * @property {number} confirmations - Current number of confirmations received
       * @property {number} required - Total number of confirmations required
       * @property {number} blockNumber - Block number where transaction was mined
       * @property {Object} metadata - Transaction metadata including network, type, priority
       * @property {number} progress - Confirmation progress as percentage (0-100)
       * @property {number} estimatedCompletion - Estimated timestamp when fully confirmed (ms)
       * 
       * @example
       * monitor.on('confirming', ({ txHash, confirmations, required, progress }) => {
       *   updateProgressBar(txHash, progress);
       *   showStatus(`${confirmations}/${required} confirmations (${progress}%)`);
       * });
       */
      this.emit('confirming', {
        txHash: data.txHash,
        confirmations: data.confirmations,
        required: requiredConfirmations,
        blockNumber: receipt.blockNumber,
        metadata: data.metadata,
        progress: Math.round((data.confirmations / requiredConfirmations) * 100),
        estimatedCompletion: this._estimateConfirmationTime(data.confirmations, requiredConfirmations)
      });
    }
  }
  
  /**
   * Gets required confirmations for a transaction
   * @private
   */
  _getRequiredConfirmations(data) {
    const network = data.metadata.network;
    if (network && this.config.networkConfig[network]) {
      return this.config.networkConfig[network].confirmationBlocks || this.config.confirmationBlocks;
    }
    return this.config.confirmationBlocks;
  }
  
  /**
   * Handles confirmed transaction
   * @private
   */
  async _handleTransactionConfirmed(data, receipt) {
    data.status = 'confirmed';
    data.confirmedAt = Date.now();
    
    this.stats.confirmed++;
    this.monitoredTransactions.delete(data.txHash);
    
    console.log(`Transaction ${data.txHash} confirmed with ${data.confirmations} confirmations`);
    
    /**
     * Transaction confirmed event
     * @event BroadcastMonitor#confirmed
     * @type {Object}
     * @property {string} txHash - The confirmed transaction hash
     * @property {Object} receipt - The transaction receipt
     * @property {number} confirmations - Number of confirmations
     * @property {Object} metadata - Transaction metadata
     * @property {number} duration - Time from addition to confirmation (ms)
     */
    this.emit('confirmed', {
      txHash: data.txHash,
      receipt,
      confirmations: data.confirmations,
      metadata: data.metadata,
      duration: data.confirmedAt - data.addedAt
    });
  }
  
  /**
   * Handles failed transaction
   * @private
   */
  async _handleTransactionFailed(data, receipt, reason) {
    data.status = 'failed';
    data.failedAt = Date.now();
    data.failureReason = reason;
    
    this.stats.failed++;
    this.monitoredTransactions.delete(data.txHash);
    
    console.error(`Transaction ${data.txHash} failed: ${reason}`);
    
    /**
     * Transaction failed event
     * @event BroadcastMonitor#failed
     * @type {Object}
     * @property {string} txHash - The failed transaction hash
     * @property {string} reason - Failure reason
     * @property {Object} receipt - The transaction receipt (if available)
     * @property {Object} metadata - Transaction metadata
     * @property {number} duration - Time from addition to failure (ms)
     */
    this.emit('failed', {
      txHash: data.txHash,
      reason,
      receipt,
      metadata: data.metadata,
      duration: data.failedAt - data.addedAt
    });
  }
  
  /**
   * Handles transaction timeout
   * @private
   */
  async _handleTransactionTimeout(data) {
    data.status = 'dropped';
    data.droppedAt = Date.now();
    
    this.stats.dropped++;
    this.stats.timeouts++;
    this.monitoredTransactions.delete(data.txHash);
    
    console.warn(`Transaction ${data.txHash} timed out after ${this.config.timeout}ms`);
    
    /**
     * Transaction dropped event
     * @event BroadcastMonitor#dropped
     * @type {Object}
     * @property {string} txHash - The dropped transaction hash
     * @property {string} reason - Drop reason (timeout)
     * @property {Object} metadata - Transaction metadata
     * @property {number} duration - Time from addition to timeout (ms)
     */
    this.emit('dropped', {
      txHash: data.txHash,
      reason: 'timeout',
      metadata: data.metadata,
      duration: data.droppedAt - data.addedAt
    });
  }
  
  /**
   * Handles monitoring errors
   * @private
   */
  async _handleMonitoringError(data, error) {
    data.retryCount++;
    
    if (data.retryCount >= this.config.retryAttempts) {
      await this._handleTransactionFailed(data, null, `Monitoring error: ${error.message}`);
    } else {
      console.warn(`Monitoring error for ${data.txHash} (retry ${data.retryCount}):`, error.message);
    }
    
    this.emit('error', {
      source: 'monitoring',
      error,
      txHash: data.txHash,
      retryCount: data.retryCount
    });
  }
  
  /**
   * Gets the live status of a specific transaction
   * 
   * Retrieves comprehensive status information for a monitored transaction,
   * including confirmation progress, timing data, and current state. Useful
   * for UI updates, debugging, and providing detailed transaction information.
   * 
   * @public
   * @method getTransactionStatus
   * @param {string} txHash - The transaction hash to check
   * @returns {Object|null} Detailed transaction status or null if not monitored
   * 
   * @example
   * const status = monitor.getTransactionStatus('0x1234...');
   * if (status) {
   *   console.log(`Status: ${status.status}`);
   *   console.log(`Confirmations: ${status.confirmations}/${status.requiredConfirmations}`);
   *   console.log(`Progress: ${status.progress}%`);
   *   console.log(`Time monitoring: ${status.monitoringDuration}ms`);
   * }
   * 
   * // Example return object:
   * // {
   * //   txHash: '0x1234...',
   * //   status: 'confirming',
   * //   confirmations: 8,
   * //   requiredConfirmations: 12,
   * //   progress: 67,
   * //   addedAt: 1640995200000,
   * //   lastChecked: 1640995800000,
   * //   monitoringDuration: 600000,
   * //   timeoutAt: 1640995500000,
   * //   isTimedOut: false,
   * //   retryCount: 0,
   * //   metadata: { network: 'ethereum', type: 'transfer' }
   * // }
   */
  getTransactionStatus(txHash) {
    if (!txHash || typeof txHash !== 'string') {
      throw new Error('Transaction hash must be a non-empty string');
    }
    
    const data = this.monitoredTransactions.get(txHash);
    if (!data) {
      return null;
    }
    
    const now = Date.now();
    const requiredConfirmations = this._getRequiredConfirmations(data);
    const progress = data.confirmations > 0 
      ? Math.round((data.confirmations / requiredConfirmations) * 100)
      : 0;
    
    return {
      txHash: data.txHash,
      status: data.status,
      confirmations: data.confirmations,
      requiredConfirmations,
      progress,
      addedAt: data.addedAt,
      lastChecked: data.lastChecked,
      monitoringDuration: now - data.addedAt,
      timeoutAt: data.timeoutAt,
      isTimedOut: now > data.timeoutAt,
      retryCount: data.retryCount,
      metadata: { ...data.metadata },
      // Additional computed fields
      timeRemaining: Math.max(0, data.timeoutAt - now),
      averageCheckInterval: data.lastChecked > data.addedAt 
        ? (data.lastChecked - data.addedAt) / Math.max(1, data.retryCount + 1)
        : 0,
      estimatedCompletion: this._estimateConfirmationTime(data.confirmations, requiredConfirmations)
    };
  }

  /**
   * Estimates completion time for transaction confirmations
   * @private
   */
  _estimateConfirmationTime(currentConfirmations, requiredConfirmations) {
    if (currentConfirmations >= requiredConfirmations) {
      return Date.now(); // Already complete
    }
    
    const remainingConfirmations = requiredConfirmations - currentConfirmations;
    // Estimate 15 seconds per block (Ethereum average)
    const estimatedBlockTime = 15000;
    
    return Date.now() + (remainingConfirmations * estimatedBlockTime);
  }

  /**
   * Gets current monitoring statistics
   * @public
   */
  getStats() {
    const runtime = this.stats.startTime ? Date.now() - this.stats.startTime : 0;
    
    return {
      ...this.stats,
      currentlyMonitored: this.monitoredTransactions.size,
      isMonitoring: this.isMonitoring,
      isPaused: this.isPaused || false,
      runtime,
      successRate: this.stats.totalMonitored > 0 
        ? Math.round((this.stats.confirmed / this.stats.totalMonitored) * 100)
        : 0
    };
  }
  
  /**
   * Gets currently monitored transactions
   * @public
   */
  getMonitoredTransactions() {
    return Array.from(this.monitoredTransactions.values());
  }
  
  /**
   * Removes a transaction from monitoring
   * @public
   */
  removeTransaction(txHash) {
    const removed = this.monitoredTransactions.delete(txHash);
    if (removed) {
      console.log(`Removed transaction ${txHash} from monitoring`);
    }
    return removed;
  }
  
  /**
   * Graceful shutdown
   * @public
   */
  async shutdown() {
    console.log('Shutting down BroadcastMonitor...');
    
    const finalStats = await this.stopMonitoring();
    this.removeAllListeners();
    this.monitoredTransactions.clear();
    
    console.log('BroadcastMonitor shutdown complete');
    return finalStats;
  }
}
