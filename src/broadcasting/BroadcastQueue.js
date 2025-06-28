/**
 * BroadcastQueue.js
 * 
 * A production-ready array-based queue implementation for managing transaction broadcasts.
 * Provides FIFO (First In, First Out) queue operations with validation, capacity limits,
 * and event hooks for real-world cryptocurrency wallet applications.
 * 
 * @author Trust Crypto Wallet Extension
 * @version 2.0.0
 */

import { EventEmitter } from 'events';

/**
 * Default transaction validation schema
 * Defines validation rules for transaction objects
 */
const DEFAULT_TRANSACTION_SCHEMA = {
  id: {
    type: 'string',
    required: true,
    minLength: 1,
    maxLength: 256,
    description: 'Unique transaction identifier'
  },
  txHash: {
    type: 'string',
    required: true,
    pattern: /^0x[a-fA-F0-9]{64}$/,
    description: 'Ethereum-compatible transaction hash'
  },
  network: {
    type: 'string',
    required: true,
    enum: ['ethereum', 'polygon', 'bsc', 'arbitrum', 'optimism', 'avalanche'],
    description: 'Blockchain network identifier'
  },
  type: {
    type: 'string',
    required: false,
    enum: ['transfer', 'swap', 'approval', 'contract', 'nft'],
    description: 'Transaction type classification'
  },
  priority: {
    type: 'number',
    required: false,
    minimum: 0,
    maximum: 10,
    description: 'Transaction priority (0=low, 10=high)'
  },
  timestamp: {
    type: 'number',
    required: false,
    minimum: 0,
    description: 'Transaction timestamp in milliseconds'
  },
  gasPrice: {
    type: 'string',
    required: false,
    pattern: /^\d+$/,
    description: 'Gas price in wei'
  },
  amount: {
    type: 'string',
    required: false,
    pattern: /^\d+(\.\d+)?$/,
    description: 'Transaction amount'
  }
};

/**
 * BroadcastQueue - A production-ready FIFO queue for transaction broadcasts
 * 
 * Enhanced queue implementation with validation, capacity management, event hooks,
 * and comprehensive error handling for cryptocurrency transaction processing.
 * 
 * @class BroadcastQueue
 * @extends EventEmitter
 * @example
 * const queue = new BroadcastQueue({
 *   maxSize: 1000,
 *   validateSchema: true,
 *   hooks: {
 *     beforeEnqueue: (tx) => console.log('Adding:', tx.id),
 *     afterDequeue: (tx) => console.log('Processing:', tx.id)
 *   }
 * });
 * 
 * queue.on('enqueue', ({ transaction, queueSize }) => {
 *   updateUI({ queueSize });
 * });
 * 
 * queue.enqueue({
 *   id: 'tx_001',
 *   txHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
 *   network: 'ethereum'
 * });
 */
export default class BroadcastQueue extends EventEmitter {
  /**
   * Creates a new BroadcastQueue instance with enhanced features
   * 
   * @constructor
   * @param {Object} options - Configuration options
   * @param {number} [options.maxSize=1000] - Maximum queue capacity (prevents memory bloat)
   * @param {boolean} [options.validateSchema=true] - Enable transaction validation
   * @param {Object} [options.schema] - Custom validation schema
   * @param {Object} [options.hooks] - Event hooks for lifecycle management
   * @param {Function} [options.hooks.beforeEnqueue] - Called before adding transaction
   * @param {Function} [options.hooks.afterEnqueue] - Called after adding transaction
   * @param {Function} [options.hooks.beforeDequeue] - Called before removing transaction
   * @param {Function} [options.hooks.afterDequeue] - Called after removing transaction
   * @param {boolean} [options.enablePriorityQueue=false] - Enable priority-based ordering
   * @param {string} [options.overflowStrategy='throw'] - Strategy when capacity exceeded: 'throw', 'drop-oldest', 'drop-newest'
   * 
   * @example
   * const queue = new BroadcastQueue({
   *   maxSize: 500,
   *   validateSchema: true,
   *   overflowStrategy: 'drop-oldest',
   *   hooks: {
   *     afterEnqueue: (tx, size) => console.log(`Queued ${tx.id}, total: ${size}`),
   *     beforeDequeue: (tx) => console.log(`Processing ${tx.id}`)
   *   }
   * });
   */
  constructor(options = {}) {
    super();
    
    // Configuration
    this.maxSize = options.maxSize || 1000;
    this.validateSchema = options.validateSchema !== false; // Default to true
    this.schema = options.schema || DEFAULT_TRANSACTION_SCHEMA;
    this.hooks = options.hooks || {};
    this.enablePriorityQueue = options.enablePriorityQueue || false;
    this.overflowStrategy = options.overflowStrategy || 'throw';
    
    // Internal storage
    this._items = [];
    this._stats = {
      totalEnqueued: 0,
      totalDequeued: 0,
      validationErrors: 0,
      capacityReached: 0,
      created: Date.now()
    };
    
    // Validate configuration
    this._validateConfig();
  }

  /**
   * Validates constructor configuration
   * @private
   */
  _validateConfig() {
    if (typeof this.maxSize !== 'number' || this.maxSize <= 0) {
      throw new TypeError('maxSize must be a positive number');
    }
    
    if (!['throw', 'drop-oldest', 'drop-newest'].includes(this.overflowStrategy)) {
      throw new TypeError('overflowStrategy must be "throw", "drop-oldest", or "drop-newest"');
    }
  }

  /**
   * Validates a transaction against the schema
   * 
   * @private
   * @param {Object} transaction - Transaction to validate
   * @throws {Error} If validation fails
   */
  _validateTransaction(transaction) {
    if (!transaction || typeof transaction !== 'object') {
      throw new Error('Transaction must be a non-null object');
    }

    for (const [field, rules] of Object.entries(this.schema)) {
      const value = transaction[field];
      
      // Check required fields
      if (rules.required && (value === undefined || value === null)) {
        throw new Error(`Required field "${field}" is missing`);
      }
      
      // Skip validation if field is not present and not required
      if (value === undefined || value === null) {
        continue;
      }
      
      // Type validation
      if (rules.type && typeof value !== rules.type) {
        throw new Error(`Field "${field}" must be of type ${rules.type}, got ${typeof value}`);
      }
      
      // String validations
      if (rules.type === 'string') {
        if (rules.minLength && value.length < rules.minLength) {
          throw new Error(`Field "${field}" must be at least ${rules.minLength} characters`);
        }
        if (rules.maxLength && value.length > rules.maxLength) {
          throw new Error(`Field "${field}" must be at most ${rules.maxLength} characters`);
        }
        if (rules.pattern && !rules.pattern.test(value)) {
          throw new Error(`Field "${field}" format is invalid`);
        }
        if (rules.enum && !rules.enum.includes(value)) {
          throw new Error(`Field "${field}" must be one of: ${rules.enum.join(', ')}`);
        }
      }
      
      // Number validations
      if (rules.type === 'number') {
        if (rules.minimum !== undefined && value < rules.minimum) {
          throw new Error(`Field "${field}" must be at least ${rules.minimum}`);
        }
        if (rules.maximum !== undefined && value > rules.maximum) {
          throw new Error(`Field "${field}" must be at most ${rules.maximum}`);
        }
      }
    }
  }

  /**
   * Handles queue capacity overflow based on strategy
   * 
   * @private
   * @returns {boolean} True if space was made, false otherwise
   */
  _handleOverflow() {
    this._stats.capacityReached++;
    
    switch (this.overflowStrategy) {
      case 'drop-oldest':
        const oldest = this._items.shift();
        this.emit('overflow', { 
          strategy: 'drop-oldest', 
          dropped: oldest, 
          queueSize: this._items.length 
        });
        return true;
        
      case 'drop-newest':
        // Don't add the new item, but don't throw error
        this.emit('overflow', { 
          strategy: 'drop-newest', 
          queueSize: this._items.length 
        });
        return false;
        
      case 'throw':
      default:
        throw new Error(`Queue capacity exceeded (max: ${this.maxSize})`);
    }
  }

  /**
   * Inserts transaction in priority order
   * 
   * @private
   * @param {Object} transaction - Transaction to insert
   */
  _insertByPriority(transaction) {
    const priority = transaction.priority || 0;
    
    // Find insertion point (higher priority = lower index)
    let insertIndex = this._items.length;
    for (let i = 0; i < this._items.length; i++) {
      const itemPriority = this._items[i].priority || 0;
      if (priority > itemPriority) {
        insertIndex = i;
        break;
      }
    }
    
    this._items.splice(insertIndex, 0, transaction);
  }

  /**
   * Adds a transaction to the queue with validation and capacity management
   * 
   * @public
   * @method enqueue
   * @param {Object} transaction - The transaction object to add
   * @param {string} transaction.id - Unique identifier
   * @param {string} transaction.txHash - Transaction hash (0x + 64 hex chars)
   * @param {string} transaction.network - Blockchain network
   * @param {string} [transaction.type] - Transaction type
   * @param {number} [transaction.priority] - Priority level (0-10)
   * @param {number} [transaction.timestamp] - Timestamp in milliseconds
   * @returns {number} The new size of the queue
   * 
   * @throws {Error} If validation fails or capacity exceeded (with 'throw' strategy)
   * @fires BroadcastQueue#enqueue
   * @fires BroadcastQueue#overflow
   * 
   * @example
   * const newSize = queue.enqueue({
   *   id: 'tx_001',
   *   txHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
   *   network: 'ethereum',
   *   type: 'transfer',
   *   priority: 5,
   *   timestamp: Date.now()
   * });
   */
  enqueue(transaction) {
    try {
      // Before enqueue hook
      if (this.hooks.beforeEnqueue) {
        this.hooks.beforeEnqueue(transaction);
      }
      
      // Validation
      if (this.validateSchema) {
        this._validateTransaction(transaction);
      }
      
      // Add timestamp if not provided
      if (!transaction.timestamp) {
        transaction.timestamp = Date.now();
      }
      
      // Check capacity and handle overflow
      if (this._items.length >= this.maxSize) {
        if (!this._handleOverflow()) {
          // Strategy was 'drop-newest', don't add the transaction
          return this._items.length;
        }
      }
      
      // Add to queue
      if (this.enablePriorityQueue) {
        this._insertByPriority(transaction);
      } else {
        this._items.push(transaction);
      }
      
      this._stats.totalEnqueued++;
      
      // After enqueue hook
      if (this.hooks.afterEnqueue) {
        this.hooks.afterEnqueue(transaction, this._items.length);
      }
      
      /**
       * Enqueue event
       * @event BroadcastQueue#enqueue
       * @type {Object}
       * @property {Object} transaction - The enqueued transaction
       * @property {number} queueSize - Current queue size
       * @property {number} priority - Transaction priority (if applicable)
       */
      this.emit('enqueue', { 
        transaction, 
        queueSize: this._items.length,
        priority: transaction.priority || 0
      });
      
      return this._items.length;
      
    } catch (error) {
      this._stats.validationErrors++;
      
      /**
       * Error event
       * @event BroadcastQueue#error
       * @type {Object}
       * @property {Error} error - The error that occurred
       * @property {string} operation - The operation that failed
       * @property {Object} transaction - The transaction that caused the error
       */
      this.emit('error', { 
        error, 
        operation: 'enqueue', 
        transaction 
      });
      
      throw error;
    }
  }

  /**
   * Removes and returns the first transaction from the queue
   * 
   * @public
   * @method dequeue
   * @returns {Object|undefined} The first transaction or undefined if empty
   * @fires BroadcastQueue#dequeue
   * 
   * @example
   * const transaction = queue.dequeue();
   * if (transaction) {
   *   console.log('Processing:', transaction.id);
   * }
   */
  dequeue() {
    if (this._items.length === 0) {
      return undefined;
    }
    
    // Before dequeue hook
    if (this.hooks.beforeDequeue) {
      this.hooks.beforeDequeue(this._items[0]);
    }
    
    const transaction = this._items.shift();
    this._stats.totalDequeued++;
    
    // After dequeue hook
    if (this.hooks.afterDequeue) {
      this.hooks.afterDequeue(transaction, this._items.length);
    }
    
    /**
     * Dequeue event
     * @event BroadcastQueue#dequeue
     * @type {Object}
     * @property {Object} transaction - The dequeued transaction
     * @property {number} queueSize - Current queue size after removal
     */
    this.emit('dequeue', { 
      transaction, 
      queueSize: this._items.length 
    });
    
    return transaction;
  }

  /**
   * Returns the first transaction without removing it
   * 
   * @public
   * @method peek
   * @returns {Object|undefined} The first transaction or undefined if empty
   */
  peek() {
    return this._items[0];
  }

  /**
   * Returns the current number of transactions in the queue
   * 
   * @public
   * @method size
   * @returns {number} Queue length
   */
  size() {
    return this._items.length;
  }

  /**
   * Checks if the queue is empty
   * 
   * @public
   * @method isEmpty
   * @returns {boolean} True if empty
   */
  isEmpty() {
    return this._items.length === 0;
  }

  /**
   * Checks if the queue is at capacity
   * 
   * @public
   * @method isFull
   * @returns {boolean} True if at maximum capacity
   */
  isFull() {
    return this._items.length >= this.maxSize;
  }

  /**
   * Returns the remaining capacity
   * 
   * @public
   * @method remainingCapacity
   * @returns {number} Number of additional items that can be queued
   */
  remainingCapacity() {
    return Math.max(0, this.maxSize - this._items.length);
  }

  /**
   * Finds a transaction by ID without removing it
   * 
   * @public
   * @method findById
   * @param {string} id - Transaction ID to find
   * @returns {Object|undefined} The transaction or undefined if not found
   */
  findById(id) {
    return this._items.find(transaction => transaction.id === id);
  }

  /**
   * Removes a specific transaction by ID
   * 
   * @public
   * @method removeById
   * @param {string} id - Transaction ID to remove
   * @returns {Object|undefined} The removed transaction or undefined if not found
   * @fires BroadcastQueue#removed
   */
  removeById(id) {
    const index = this._items.findIndex(transaction => transaction.id === id);
    if (index === -1) {
      return undefined;
    }
    
    const transaction = this._items.splice(index, 1)[0];
    
    /**
     * Removed event
     * @event BroadcastQueue#removed
     * @type {Object}
     * @property {Object} transaction - The removed transaction
     * @property {number} queueSize - Current queue size after removal
     * @property {string} reason - Reason for removal
     */
    this.emit('removed', { 
      transaction, 
      queueSize: this._items.length,
      reason: 'manual_removal'
    });
    
    return transaction;
  }

  /**
   * Removes all transactions from the queue
   * 
   * @public
   * @method clear
   * @returns {number} Number of transactions removed
   * @fires BroadcastQueue#cleared
   */
  clear() {
    const removedCount = this._items.length;
    const removedTransactions = [...this._items];
    this._items = [];
    
    /**
     * Cleared event
     * @event BroadcastQueue#cleared
     * @type {Object}
     * @property {number} removedCount - Number of transactions removed
     * @property {Array} removedTransactions - Array of removed transactions
     */
    this.emit('cleared', { 
      removedCount, 
      removedTransactions 
    });
    
    return removedCount;
  }

  /**
   * Returns queue statistics
   * 
   * @public
   * @method getStats
   * @returns {Object} Comprehensive statistics
   */
  getStats() {
    const uptime = Date.now() - this._stats.created;
    return {
      ...this._stats,
      currentSize: this._items.length,
      maxSize: this.maxSize,
      remainingCapacity: this.remainingCapacity(),
      utilizationPercent: Math.round((this._items.length / this.maxSize) * 100),
      uptime,
      throughput: {
        enqueueRate: this._stats.totalEnqueued / (uptime / 1000 / 60), // per minute
        dequeueRate: this._stats.totalDequeued / (uptime / 1000 / 60), // per minute
      }
    };
  }

  /**
   * Returns a shallow copy of all transactions
   * 
   * @public
   * @method toArray
   * @returns {Array} Copy of all transactions
   */
  toArray() {
    return [...this._items];
  }

  /**
   * Returns string representation with enhanced info
   * 
   * @public
   * @method toString
   * @returns {string} Queue description
   */
  toString() {
    const stats = this.getStats();
    return `BroadcastQueue(${stats.currentSize}/${stats.maxSize}): ` +
           `${stats.utilizationPercent}% full, ` +
           `${stats.totalEnqueued} total enqueued, ` +
           `${stats.validationErrors} validation errors`;
  }

  /**
   * Graceful shutdown with cleanup
   * 
   * @public
   * @method shutdown
   * @returns {Promise<Object>} Shutdown statistics
   */
  async shutdown() {
    const finalStats = this.getStats();
    
    this.emit('shutdown', { 
      finalStats, 
      pendingTransactions: this.toArray() 
    });
    
    this.clear();
    this.removeAllListeners();
    
    return finalStats;
  }
}
