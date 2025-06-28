/**
 * BaseBroadcaster.js
 * 
 * Abstract base class for blockchain-specific transaction broadcasters.
 * Provides common functionality and defines the interface that all
 * broadcaster implementations must follow.
 * 
 * @author Trust Crypto Wallet Extension
 * @version 1.0.0
 */

import { EventEmitter } from 'events';
import { ethers } from 'ethers';

/**
 * BaseBroadcaster - Abstract base class for transaction broadcasters
 * 
 * Defines the common interface and shared functionality for all blockchain-specific
 * broadcaster implementations. Handles provider management, transaction validation,
 * and provides extension points for network-specific behavior.
 * 
 * @abstract
 * @class BaseBroadcaster
 * @extends EventEmitter
 * @example
 * // Cannot instantiate directly - must extend
 * class MyBroadcaster extends BaseBroadcaster {
 *   async _sendRawTransaction(txData) {
 *     return await this.provider.sendTransaction(txData);
 *   }
 * }
 * 
 * const broadcaster = new MyBroadcaster(provider, { network: 'ethereum' });
 */
export default class BaseBroadcaster extends EventEmitter {
  /**
   * Creates a new BaseBroadcaster instance
   * 
   * Initializes the broadcaster with a blockchain provider and configuration options.
   * This constructor cannot be called directly as BaseBroadcaster is abstract.
   * 
   * @constructor
   * @param {Object} provider - Blockchain provider (ethers.js provider or compatible)
   * @param {Object} [options={}] - Configuration options
   * @param {string} [options.network='unknown'] - Network name for identification
   * @param {number} [options.timeout=30000] - Transaction timeout in milliseconds
   * @param {number} [options.confirmations=1] - Required confirmations for success
   * @param {number} [options.gasMultiplier=1.1] - Gas estimation safety multiplier
   * @param {number} [options.maxRetries=3] - Maximum retry attempts for failed transactions
   * @param {boolean} [options.validateTransactions=true] - Enable transaction validation
   * 
   * @throws {Error} If attempting to instantiate BaseBroadcaster directly
   * @throws {TypeError} If provider is null or undefined
   * 
   * @example
   * // In a subclass constructor:
   * constructor(provider, options = {}) {
   *   super(provider, {
   *     network: 'ethereum',
   *     confirmations: 12,
   *     gasMultiplier: 1.2,
   *     ...options
   *   });
   * }
   */
  constructor(provider, options = {}) {
    super();
    
    // Prevent direct instantiation of abstract class
    if (new.target === BaseBroadcaster) {
      throw new Error('BaseBroadcaster is abstract and cannot be instantiated directly. Please extend this class.');
    }
    
    // Validate provider
    if (!provider) {
      throw new TypeError('Provider is required and cannot be null or undefined');
    }
    
    // Store provider
    this.provider = provider;
    
    // Default configuration
    this.config = {
      network: 'unknown',
      timeout: 30000, // 30 seconds
      confirmations: 1,
      gasMultiplier: 1.1,
      maxRetries: 3,
      validateTransactions: true,
      ...options
    };
    
    // Initialize statistics
    this.stats = {
      totalTransactions: 0,
      successfulTransactions: 0,
      failedTransactions: 0,
      totalGasUsed: 0n,
      averageGasPrice: 0n,
      startTime: Date.now()
    };
    
    // Internal state
    this.isInitialized = false;
    this.lastTransaction = null;
    
    console.log(`BaseBroadcaster initialized for ${this.config.network} network`);
  }
  
  /**
   * Initializes the broadcaster (optional override point)
   * 
   * Subclasses can override this method to perform network-specific initialization
   * such as network detection, feature support checking, or provider validation.
   * 
   * @public
   * @method initialize
   * @returns {Promise<void>} Resolves when initialization is complete
   * 
   * @example
   * async initialize() {
   *   await super.initialize();
   *   // Perform network-specific initialization
   *   this.networkInfo = await this.provider.getNetwork();
   * }
   */
  async initialize() {
    if (this.isInitialized) {
      console.warn('Broadcaster already initialized');
      return;
    }
    
    try {
      // Validate provider connectivity
      if (typeof this.provider.getBlockNumber === 'function') {
        await this.provider.getBlockNumber();
        console.log(`Provider connectivity verified for ${this.config.network}`);
      }
      
      this.isInitialized = true;
      this.emit('initialized', { network: this.config.network });
      
    } catch (error) {
      console.error('Failed to initialize broadcaster:', error);
      throw new Error(`Broadcaster initialization failed: ${error.message}`);
    }
  }
  
  /**
   * Broadcasts a transaction to the blockchain
   * 
   * This is the main entry point for transaction broadcasting. It performs
   * validation, calls the abstract _sendRawTransaction method, and handles
   * common error scenarios.
   * 
   * @public
   * @method broadcast
   * @param {Object} txData - Transaction data to broadcast
   * @param {string} txData.to - Recipient address
   * @param {string|BigNumber} [txData.value] - Transaction value
   * @param {string} [txData.data] - Transaction data/input
   * @param {Object} [options={}] - Broadcasting options
   * @param {boolean} [options.skipValidation=false] - Skip transaction validation
   * @returns {Promise<string>} Transaction hash
   * @fires BaseBroadcaster#transaction-broadcasting
   * @fires BaseBroadcaster#transaction-sent
   * @fires BaseBroadcaster#transaction-failed
   * 
   * @example
   * const txHash = await broadcaster.broadcast({
   *   to: '0x742dFfdf2c6c8D4B93067782b1e7A38754b8c7b3',
   *   value: ethers.parseEther('0.1'),
   *   data: '0x'
   * });
   * console.log('Transaction hash:', txHash);
   */
  async broadcast(txData, options = {}) {
    const startTime = Date.now();
    
    try {
      /**
       * Transaction broadcasting event
       * @event BaseBroadcaster#transaction-broadcasting
       * @type {Object}
       * @property {Object} txData - Transaction data being broadcast
       * @property {string} network - Network name
       * @property {number} timestamp - Broadcasting start timestamp
       */
      this.emit('transaction-broadcasting', {
        txData: { ...txData },
        network: this.config.network,
        timestamp: startTime
      });
      
      // Validate transaction data unless skipped
      if (this.config.validateTransactions && !options.skipValidation) {
        this.validateTransactionData(txData);
      }
      
      // Call abstract method implemented by subclasses
      const txHash = await this._sendRawTransaction(txData);
      
      // Update statistics
      this.stats.totalTransactions++;
      this.stats.successfulTransactions++;
      this.lastTransaction = {
        hash: txHash,
        timestamp: Date.now(),
        data: txData
      };
      
      const duration = Date.now() - startTime;
      console.log(`Transaction broadcast successful: ${txHash} (${duration}ms)`);
      
      /**
       * Transaction sent successfully event
       * @event BaseBroadcaster#transaction-sent
       * @type {Object}
       * @property {string} txHash - Transaction hash
       * @property {Object} txData - Transaction data
       * @property {number} duration - Time taken to broadcast (ms)
       * @property {string} network - Network name
       */
      this.emit('transaction-sent', {
        txHash,
        txData: { ...txData },
        duration,
        network: this.config.network
      });
      
      return txHash;
      
    } catch (error) {
      this.stats.failedTransactions++;
      
      const duration = Date.now() - startTime;
      console.error(`Transaction broadcast failed after ${duration}ms:`, error.message);
      
      /**
       * Transaction failed event
       * @event BaseBroadcaster#transaction-failed
       * @type {Object}
       * @property {Error} error - The error that occurred
       * @property {Object} txData - Transaction data that failed
       * @property {number} duration - Time taken before failure (ms)
       * @property {string} network - Network name
       */
      this.emit('transaction-failed', {
        error,
        txData: { ...txData },
        duration,
        network: this.config.network
      });
      
      throw error;
    }
  }
  
  /**
   * Estimates gas required for a transaction
   * 
   * Provides a default implementation using the provider's estimateGas method.
   * Subclasses can override this for network-specific gas estimation logic.
   * 
   * @public
   * @method estimateGas
   * @param {Object} tx - Transaction object for gas estimation
   * @param {string} tx.to - Recipient address
   * @param {string} [tx.from] - Sender address
   * @param {string|BigNumber} [tx.value] - Transaction value
   * @param {string} [tx.data] - Transaction data
   * @returns {Promise<BigNumber|string>} Estimated gas limit
   * 
   * @example
   * const gasEstimate = await broadcaster.estimateGas({
   *   to: '0x742dFfdf2c6c8D4B93067782b1e7A38754b8c7b3',
   *   value: ethers.parseEther('0.1'),
   *   from: '0x8ba1f109551bD432803012645Hac136c'
   * });
   * console.log('Estimated gas:', gasEstimate.toString());
   */
  async estimateGas(tx) {
    try {
      if (!this.provider.estimateGas) {
        throw new Error('Provider does not support gas estimation');
      }
      
      const gasEstimate = await this.provider.estimateGas(tx);
      
      // Apply safety multiplier if configured
      if (this.config.gasMultiplier && this.config.gasMultiplier !== 1) {
        const safeGas = Math.floor(Number(gasEstimate) * this.config.gasMultiplier);
        return BigInt(safeGas);
      }
      
      return gasEstimate;
      
    } catch (error) {
      console.error('Gas estimation failed:', error.message);
      throw new Error(`Gas estimation failed: ${error.message}`);
    }
  }
  
  /**
   * Abstract method for sending raw transactions
   * 
   * This method must be implemented by all subclasses to handle the actual
   * transaction broadcasting to their specific blockchain network.
   * 
   * @abstract
   * @protected
   * @method _sendRawTransaction
   * @param {Object} txData - Formatted transaction data ready for broadcasting
   * @returns {Promise<string>} Transaction hash
   * @throws {Error} Always throws if not implemented by subclass
   * 
   * @example
   * // In a subclass:
   * async _sendRawTransaction(txData) {
   *   const txResponse = await this.provider.sendTransaction(txData);
   *   return txResponse.hash;
   * }
   */
  async _sendRawTransaction(txData) {
    throw new Error('_sendRawTransaction() must be implemented by subclass. This is an abstract method.');
  }
  
  /**
   * Validates transaction data structure and content
   * 
   * Performs basic validation that applies to all blockchain networks.
   * Subclasses can override this method to add network-specific validation rules.
   * 
   * @protected
   * @method validateTransactionData
   * @param {Object} txData - Transaction data to validate
   * @throws {Error} If validation fails
   * 
   * @example
   * validateTransactionData(txData) {
   *   super.validateTransactionData(txData); // Call parent validation
   *   // Add network-specific validation
   *   if (txData.gasPrice && BigInt(txData.gasPrice) > this.maxGasPrice) {
   *     throw new Error('Gas price too high');
   *   }
   * }
   */
  validateTransactionData(txData) {
    if (!txData || typeof txData !== 'object') {
      throw new Error('Transaction data must be a non-null object');
    }
    
    if (!txData.to) {
      throw new Error('Transaction must include a "to" address');
    }
    
    if (typeof txData.to !== 'string') {
      throw new Error('Transaction "to" address must be a string');
    }
    
    // Validate address format if ethers is available
    if (ethers && ethers.isAddress && !ethers.isAddress(txData.to)) {
      throw new Error('Invalid "to" address format');
    }
    
    if (txData.value !== undefined) {
      // Allow string, number, or BigInt values
      if (typeof txData.value !== 'string' && 
          typeof txData.value !== 'number' && 
          typeof txData.value !== 'bigint') {
        throw new Error('Transaction value must be a string, number, or BigInt');
      }
      
      // Ensure non-negative value
      if (BigInt(txData.value) < 0n) {
        throw new Error('Transaction value cannot be negative');
      }
    }
    
    if (txData.data !== undefined && typeof txData.data !== 'string') {
      throw new Error('Transaction data must be a string');
    }
    
    console.log('Transaction validation passed');
  }
  
  /**
   * Gets current broadcaster statistics
   * 
   * Returns comprehensive statistics about the broadcaster's performance
   * and transaction history.
   * 
   * @public
   * @method getStats
   * @returns {Object} Statistics object with performance metrics
   * 
   * @example
   * const stats = broadcaster.getStats();
   * console.log(`Success rate: ${stats.successRate}%`);
   * console.log(`Total transactions: ${stats.totalTransactions}`);
   */
  getStats() {
    const runtime = Date.now() - this.stats.startTime;
    const successRate = this.stats.totalTransactions > 0 
      ? Math.round((this.stats.successfulTransactions / this.stats.totalTransactions) * 100)
      : 0;
    
    return {
      network: this.config.network,
      totalTransactions: this.stats.totalTransactions,
      successfulTransactions: this.stats.successfulTransactions,
      failedTransactions: this.stats.failedTransactions,
      successRate,
      totalGasUsed: this.stats.totalGasUsed.toString(),
      averageGasPrice: this.stats.averageGasPrice.toString(),
      runtime,
      isInitialized: this.isInitialized,
      lastTransaction: this.lastTransaction
    };
  }
  
  /**
   * Gets broadcaster configuration
   * 
   * @public
   * @method getConfig
   * @returns {Object} Current configuration object
   */
  getConfig() {
    return { ...this.config };
  }
  
  /**
   * Updates broadcaster configuration
   * 
   * @public
   * @method updateConfig
   * @param {Object} newConfig - Configuration updates
   * @returns {Object} Updated configuration
   * 
   * @example
   * broadcaster.updateConfig({
   *   gasMultiplier: 1.2,
   *   confirmations: 6
   * });
   */
  updateConfig(newConfig) {
    this.config = {
      ...this.config,
      ...newConfig
    };
    
    console.log(`Configuration updated for ${this.config.network}:`, newConfig);
    this.emit('config-updated', { config: this.config, updates: newConfig });
    
    return this.getConfig();
  }
  
  /**
   * Resets broadcaster statistics
   * 
   * @public
   * @method resetStats
   * @returns {Object} Previous statistics before reset
   */
  resetStats() {
    const previousStats = this.getStats();
    
    this.stats = {
      totalTransactions: 0,
      successfulTransactions: 0,
      failedTransactions: 0,
      totalGasUsed: 0n,
      averageGasPrice: 0n,
      startTime: Date.now()
    };
    
    console.log(`Statistics reset for ${this.config.network} broadcaster`);
    this.emit('stats-reset', { previousStats });
    
    return previousStats;
  }
  
  /**
   * Graceful shutdown of the broadcaster
   * 
   * @public
   * @method shutdown
   * @returns {Promise<Object>} Final statistics
   */
  async shutdown() {
    console.log(`Shutting down ${this.config.network} broadcaster...`);
    
    const finalStats = this.getStats();
    
    // Emit shutdown event
    this.emit('shutdown', { 
      network: this.config.network,
      finalStats 
    });
    
    // Remove all listeners
    this.removeAllListeners();
    
    console.log(`${this.config.network} broadcaster shutdown complete`);
    return finalStats;
  }
}
