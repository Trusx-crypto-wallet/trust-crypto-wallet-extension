/**
 * TransactionTracker - Comprehensive bridge transaction lifecycle tracking and metrics
 * Location: src/bridges/monitoring/TransactionTracker.js
 * Focus: Transaction state management, metrics, and monitoring
 */

import { EventEmitter } from 'events';
import { BridgeError, ValidationError } from '../../errors/BridgeErrors.js';
import logger from '../../utils/logger.js';

export default class TransactionTracker extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.config = {
      // Storage configuration
      maxTransactions: config.maxTransactions || 50000,
      retentionPeriod: config.retentionPeriod || 30 * 24 * 60 * 60 * 1000, // 30 days
      
      // Cleanup configuration
      cleanupInterval: config.cleanupInterval || 60 * 60 * 1000, // 1 hour
      batchSize: config.batchSize || 1000,
      
      // Alert thresholds
      stuckTransactionThreshold: config.stuckTransactionThreshold || 2 * 60 * 60 * 1000, // 2 hours
      failureRateThreshold: config.failureRateThreshold || 0.1, // 10%
      avgCompletionTimeThreshold: config.avgCompletionTimeThreshold || 30 * 60 * 1000, // 30 minutes
      
      // Metrics configuration
      metricsRetentionPeriod: config.metricsRetentionPeriod || 7 * 24 * 60 * 60 * 1000, // 7 days
      metricsInterval: config.metricsInterval || 5 * 60 * 1000, // 5 minutes
      
      // External storage (if configured)
      externalStorage: config.externalStorage || null,
      enablePersistence: config.enablePersistence || false,
      
      ...config
    };
    
    // Core storage - Map for in-memory, could be extended to external DB
    this.transactions = new Map();
    this.transactionsByStatus = new Map();
    this.transactionsByProtocol = new Map();
    this.transactionsByChain = new Map();
    
    // Metrics storage
    this.metrics = {
      totalTransactions: 0,
      completedTransactions: 0,
      failedTransactions: 0,
      cancelledTransactions: 0,
      totalVolume: 0n,
      totalFees: 0n,
      protocolStats: new Map(),
      chainStats: new Map(),
      hourlyStats: new Map(),
      dailyStats: new Map()
    };
    
    // Status tracking
    this.validStatuses = new Set([
      'pending',      // Transaction created but not yet initiated
      'initiated',    // Transaction sent to source chain
      'confirmed',    // Transaction confirmed on source chain
      'processing',   // Cross-chain message in transit
      'executed',     // Transaction executed on destination chain
      'completed',    // Bridge fully completed
      'failed',       // Transaction failed
      'cancelled',    // Transaction cancelled
      'stuck'         // Transaction appears stuck (auto-detected)
    ]);
    
    // Cleanup and monitoring
    this.cleanupTimer = null;
    this.metricsTimer = null;
    this.isActive = false;
    this.startTime = Date.now();
    
    // Initialize status maps
    this.validStatuses.forEach(status => {
      this.transactionsByStatus.set(status, new Set());
    });
    
    logger.info('TransactionTracker initialized', {
      maxTransactions: this.config.maxTransactions,
      retentionPeriod: this.config.retentionPeriod,
      cleanupInterval: this.config.cleanupInterval
    });
    
    // Start background tasks
    this._startBackgroundTasks();
  }

  /**
   * Start tracking a new bridge transaction
   */
  startTracking(bridgeId, params) {
    try {
      this._validateBridgeId(bridgeId);
      this._validateTrackingParams(params);
      
      if (this.transactions.has(bridgeId)) {
        throw new ValidationError(`Transaction ${bridgeId} is already being tracked`);
      }
      
      const now = Date.now();
      const transaction = {
        // Core identification
        bridgeId,
        
        // Transaction parameters
        protocol: params.protocol,
        sourceChain: params.sourceChain,
        targetChain: params.targetChain,
        token: params.token,
        amount: params.amount?.toString() || '0',
        recipient: params.recipient,
        
        // User context
        userAddress: params.userAddress || null,
        
        // Status tracking
        status: 'pending',
        statusHistory: [{
          status: 'pending',
          timestamp: now,
          data: { reason: 'Transaction tracking started' }
        }],
        
        // Timestamps
        createdAt: now,
        updatedAt: now,
        initiatedAt: null,
        confirmedAt: null,
        completedAt: null,
        
        // Transaction hashes
        sourceTransactionHash: null,
        destinationTransactionHash: null,
        
        // Financial data
        estimatedFee: params.estimatedFee?.toString() || '0',
        actualFee: null,
        gasUsed: null,
        exchangeRate: params.exchangeRate || null,
        
        // Metadata
        metadata: {
          slippage: params.slippage || null,
          deadline: params.deadline || null,
          priority: params.priority || 'normal',
          tags: params.tags || [],
          notes: params.notes || null
        },
        
        // Error tracking
        errors: [],
        retryCount: 0,
        
        // Performance metrics
        estimatedDuration: null,
        actualDuration: null,
        
        // External references
        externalRefs: {
          messageId: null,
          nonce: null,
          sequence: null
        }
      };
      
      // Store transaction
      this.transactions.set(bridgeId, transaction);
      this._indexTransaction(transaction);
      
      // Update metrics
      this.metrics.totalTransactions++;
      this._updateProtocolStats(params.protocol, 'started');
      this._updateChainStats(params.sourceChain, 'source');
      this._updateChainStats(params.targetChain, 'target');
      
      logger.info(`Started tracking transaction ${bridgeId}`, {
        protocol: params.protocol,
        sourceChain: params.sourceChain,
        targetChain: params.targetChain,
        amount: params.amount?.toString()
      });
      
      this.emit('transactionStarted', {
        bridgeId,
        transaction: { ...transaction },
        timestamp: now
      });
      
    } catch (error) {
      logger.error(`Failed to start tracking transaction ${bridgeId}:`, error);
      throw new BridgeError('Failed to start transaction tracking', 'TRACKING_START_FAILED', {
        bridgeId,
        error: error.message
      });
    }
  }

  /**
   * Update transaction status and associated data
   */
  updateStatus(bridgeId, status, data = {}) {
    try {
      const transaction = this.transactions.get(bridgeId);
      if (!transaction) {
        throw new ValidationError(`Transaction ${bridgeId} not found`);
      }
      
      if (!this.validStatuses.has(status)) {
        throw new ValidationError(`Invalid status: ${status}`);
      }
      
      const now = Date.now();
      const previousStatus = transaction.status;
      
      // Update transaction
      transaction.status = status;
      transaction.updatedAt = now;
      
      // Add to status history
      transaction.statusHistory.push({
        status,
        timestamp: now,
        previousStatus,
        data: { ...data }
      });
      
      // Update specific timestamps
      this._updateTimestamps(transaction, status, now);
      
      // Update transaction data based on status and provided data
      this._updateTransactionData(transaction, status, data);
      
      // Re-index transaction with new status
      this._reindexTransaction(transaction, previousStatus);
      
      // Update metrics
      this._updateStatusMetrics(status, previousStatus, transaction);
      
      // Calculate duration for completed/failed transactions
      if (['completed', 'failed', 'cancelled'].includes(status)) {
        transaction.actualDuration = now - transaction.createdAt;
        
        if (status === 'completed') {
          this.metrics.completedTransactions++;
          this._updateProtocolStats(transaction.protocol, 'completed');
        } else if (status === 'failed') {
          this.metrics.failedTransactions++;
          this._updateProtocolStats(transaction.protocol, 'failed');
        } else if (status === 'cancelled') {
          this.metrics.cancelledTransactions++;
          this._updateProtocolStats(transaction.protocol, 'cancelled');
        }
      }
      
      logger.debug(`Updated transaction ${bridgeId} status: ${previousStatus} -> ${status}`, {
        data,
        duration: transaction.actualDuration
      });
      
      this.emit('statusUpdated', {
        bridgeId,
        status,
        previousStatus,
        transaction: { ...transaction },
        data,
        timestamp: now
      });
      
      // Check for alerts
      this._checkAlerts(transaction);
      
    } catch (error) {
      logger.error(`Failed to update status for transaction ${bridgeId}:`, error);
      throw new BridgeError('Failed to update transaction status', 'STATUS_UPDATE_FAILED', {
        bridgeId,
        status,
        error: error.message
      });
    }
  }

  /**
   * Get specific transaction by ID
   */
  getTransaction(bridgeId) {
    const transaction = this.transactions.get(bridgeId);
    return transaction ? { ...transaction } : null;
  }

  /**
   * Get transaction history with filtering and pagination
   */
  getTransactionHistory(options = {}) {
    const {
      limit = 100,
      offset = 0,
      status = null,
      protocol = null,
      sourceChain = null,
      targetChain = null,
      userAddress = null,
      startTime = null,
      endTime = null,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = options;
    
    let transactions = Array.from(this.transactions.values());
    
    // Apply filters
    if (status) {
      transactions = transactions.filter(tx => tx.status === status);
    }
    
    if (protocol) {
      transactions = transactions.filter(tx => tx.protocol === protocol);
    }
    
    if (sourceChain) {
      transactions = transactions.filter(tx => tx.sourceChain === sourceChain);
    }
    
    if (targetChain) {
      transactions = transactions.filter(tx => tx.targetChain === targetChain);
    }
    
    if (userAddress) {
      transactions = transactions.filter(tx => tx.userAddress === userAddress);
    }
    
    if (startTime) {
      transactions = transactions.filter(tx => tx.createdAt >= startTime);
    }
    
    if (endTime) {
      transactions = transactions.filter(tx => tx.createdAt <= endTime);
    }
    
    // Sort transactions
    transactions.sort((a, b) => {
      const aValue = a[sortBy] || 0;
      const bValue = b[sortBy] || 0;
      
      if (sortOrder === 'asc') {
        return aValue - bValue;
      } else {
        return bValue - aValue;
      }
    });
    
    // Apply pagination
    const total = transactions.length;
    const paginatedTransactions = transactions.slice(offset, offset + limit);
    
    return {
      transactions: paginatedTransactions,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      },
      filters: options
    };
  }

  /**
   * Get all active (non-final) transactions
   */
  getActiveTransactions() {
    const activeStatuses = ['pending', 'initiated', 'confirmed', 'processing', 'executed'];
    const activeTransactions = [];
    
    for (const status of activeStatuses) {
      const txIds = this.transactionsByStatus.get(status) || new Set();
      for (const txId of txIds) {
        const transaction = this.transactions.get(txId);
        if (transaction) {
          activeTransactions.push({ ...transaction });
        }
      }
    }
    
    return activeTransactions;
  }

  /**
   * Cleanup old transactions
   */
  async cleanup(olderThan = null) {
    const cutoffTime = olderThan || (Date.now() - this.config.retentionPeriod);
    let cleanedCount = 0;
    const batchSize = this.config.batchSize;
    
    logger.info('Starting transaction cleanup', {
      cutoffTime: new Date(cutoffTime).toISOString(),
      totalTransactions: this.transactions.size
    });
    
    try {
      const transactionsToClean = [];
      
      // Find transactions to clean
      for (const [bridgeId, transaction] of this.transactions) {
        if (transaction.createdAt < cutoffTime && 
            ['completed', 'failed', 'cancelled'].includes(transaction.status)) {
          transactionsToClean.push(bridgeId);
        }
      }
      
      // Clean in batches
      for (let i = 0; i < transactionsToClean.length; i += batchSize) {
        const batch = transactionsToClean.slice(i, i + batchSize);
        
        for (const bridgeId of batch) {
          const transaction = this.transactions.get(bridgeId);
          if (transaction) {
            this._unindexTransaction(transaction);
            this.transactions.delete(bridgeId);
            cleanedCount++;
          }
        }
        
        // Yield control to prevent blocking
        if (batch.length === batchSize) {
          await new Promise(resolve => setImmediate(resolve));
        }
      }
      
      logger.info(`Cleanup completed: removed ${cleanedCount} transactions`, {
        remainingTransactions: this.transactions.size
      });
      
      this.emit('cleanupCompleted', {
        cleanedCount,
        remainingTransactions: this.transactions.size,
        cutoffTime
      });
      
      return cleanedCount;
      
    } catch (error) {
      logger.error('Cleanup failed:', error);
      throw new BridgeError('Transaction cleanup failed', 'CLEANUP_FAILED', {
        cleanedCount,
        error: error.message
      });
    }
  }

  /**
   * Get comprehensive metrics
   */
  getMetrics() {
    const now = Date.now();
    const uptime = now - this.startTime;
    
    // Calculate real-time metrics
    const activeTransactions = this.getActiveTransactions();
    const completedTransactions = Array.from(this.transactions.values())
      .filter(tx => tx.status === 'completed');
    
    // Calculate success rate
    const totalFinishedTransactions = this.metrics.completedTransactions + 
                                    this.metrics.failedTransactions + 
                                    this.metrics.cancelledTransactions;
    const successRate = totalFinishedTransactions > 0 ? 
      (this.metrics.completedTransactions / totalFinishedTransactions) : 0;
    
    // Calculate average completion time
    const completedWithDuration = completedTransactions.filter(tx => tx.actualDuration);
    const avgCompletionTime = completedWithDuration.length > 0 ?
      completedWithDuration.reduce((sum, tx) => sum + tx.actualDuration, 0) / completedWithDuration.length : 0;
    
    // Calculate volume metrics
    const totalVolumeEth = this._bigIntToEth(this.metrics.totalVolume);
    const totalFeesEth = this._bigIntToEth(this.metrics.totalFees);
    
    // Protocol performance
    const protocolPerformance = {};
    for (const [protocol, stats] of this.metrics.protocolStats) {
      const protocolTotal = stats.started || 0;
      const protocolCompleted = stats.completed || 0;
      const protocolFailed = stats.failed || 0;
      
      protocolPerformance[protocol] = {
        total: protocolTotal,
        completed: protocolCompleted,
        failed: protocolFailed,
        cancelled: stats.cancelled || 0,
        successRate: protocolTotal > 0 ? (protocolCompleted / protocolTotal) : 0,
        failureRate: protocolTotal > 0 ? (protocolFailed / protocolTotal) : 0
      };
    }
    
    // Chain statistics
    const chainStats = {};
    for (const [chain, stats] of this.metrics.chainStats) {
      chainStats[chain] = { ...stats };
    }
    
    // Recent activity (last 24 hours)
    const last24h = now - (24 * 60 * 60 * 1000);
    const recentTransactions = Array.from(this.transactions.values())
      .filter(tx => tx.createdAt >= last24h);
    
    const recentCompleted = recentTransactions.filter(tx => tx.status === 'completed').length;
    const recentFailed = recentTransactions.filter(tx => tx.status === 'failed').length;
    
    return {
      // Summary statistics
      summary: {
        totalTransactions: this.metrics.totalTransactions,
        activeTransactions: activeTransactions.length,
        completedTransactions: this.metrics.completedTransactions,
        failedTransactions: this.metrics.failedTransactions,
        cancelledTransactions: this.metrics.cancelledTransactions,
        successRate: Math.round(successRate * 10000) / 100, // Percentage with 2 decimal places
        avgCompletionTimeMs: Math.round(avgCompletionTime),
        avgCompletionTimeMinutes: Math.round(avgCompletionTime / 60000 * 100) / 100
      },
      
      // Volume and fees
      volume: {
        totalVolumeWei: this.metrics.totalVolume.toString(),
        totalVolumeEth: totalVolumeEth,
        totalFeesWei: this.metrics.totalFees.toString(),
        totalFeesEth: totalFeesEth
      },
      
      // Protocol performance
      protocols: protocolPerformance,
      
      // Chain statistics
      chains: chainStats,
      
      // Recent activity (24h)
      recent24h: {
        transactions: recentTransactions.length,
        completed: recentCompleted,
        failed: recentFailed,
        successRate: recentTransactions.length > 0 ? 
          Math.round(recentCompleted / recentTransactions.length * 10000) / 100 : 0
      },
      
      // System information
      system: {
        uptime,
        uptimeHours: Math.round(uptime / (60 * 60 * 1000) * 100) / 100,
        storageSize: this.transactions.size,
        maxStorageSize: this.config.maxTransactions,
        storageUtilization: Math.round(this.transactions.size / this.config.maxTransactions * 10000) / 100
      },
      
      // Timestamps
      generatedAt: now,
      startTime: this.startTime
    };
  }

  /**
   * Get stuck transactions (transactions that haven't progressed in a while)
   */
  getStuckTransactions() {
    const now = Date.now();
    const threshold = this.config.stuckTransactionThreshold;
    const stuckTransactions = [];
    
    for (const transaction of this.transactions.values()) {
      if (!['completed', 'failed', 'cancelled'].includes(transaction.status)) {
        const timeSinceUpdate = now - transaction.updatedAt;
        if (timeSinceUpdate > threshold) {
          stuckTransactions.push({
            ...transaction,
            stuckDuration: timeSinceUpdate
          });
        }
      }
    }
    
    return stuckTransactions;
  }

  /**
   * Get failure analysis
   */
  getFailureAnalysis() {
    const failedTransactions = Array.from(this.transactions.values())
      .filter(tx => tx.status === 'failed');
    
    const failureReasons = {};
    const protocolFailures = {};
    const chainFailures = {};
    
    for (const transaction of failedTransactions) {
      // Analyze failure reasons
      const lastError = transaction.errors[transaction.errors.length - 1];
      const reason = lastError?.code || 'unknown';
      failureReasons[reason] = (failureReasons[reason] || 0) + 1;
      
      // Protocol failures
      protocolFailures[transaction.protocol] = (protocolFailures[transaction.protocol] || 0) + 1;
      
      // Chain failures
      chainFailures[transaction.sourceChain] = (chainFailures[transaction.sourceChain] || 0) + 1;
    }
    
    return {
      totalFailures: failedTransactions.length,
      failureReasons,
      protocolFailures,
      chainFailures,
      recentFailures: failedTransactions.filter(tx => 
        tx.updatedAt > Date.now() - (24 * 60 * 60 * 1000)
      ).length
    };
  }

  // ===== PRIVATE METHODS =====

  /**
   * Start background tasks
   */
  _startBackgroundTasks() {
    if (this.isActive) return;
    
    this.isActive = true;
    
    // Cleanup timer
    this.cleanupTimer = setInterval(() => {
      this.cleanup().catch(error => {
        logger.error('Scheduled cleanup failed:', error);
      });
    }, this.config.cleanupInterval);
    
    // Metrics collection timer
    this.metricsTimer = setInterval(() => {
      this._collectMetrics();
    }, this.config.metricsInterval);
    
    // Stuck transaction detection
    setInterval(() => {
      this._detectStuckTransactions();
    }, 10 * 60 * 1000); // Every 10 minutes
    
    logger.info('Background tasks started');
  }

  /**
   * Stop background tasks
   */
  _stopBackgroundTasks() {
    if (!this.isActive) return;
    
    this.isActive = false;
    
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    
    if (this.metricsTimer) {
      clearInterval(this.metricsTimer);
      this.metricsTimer = null;
    }
    
    logger.info('Background tasks stopped');
  }

  /**
   * Validate bridge ID
   */
  _validateBridgeId(bridgeId) {
    if (!bridgeId || typeof bridgeId !== 'string') {
      throw new ValidationError('Bridge ID must be a non-empty string');
    }
    
    if (bridgeId.length > 100) {
      throw new ValidationError('Bridge ID too long (max 100 characters)');
    }
  }

  /**
   * Validate tracking parameters
   */
  _validateTrackingParams(params) {
    const required = ['protocol', 'sourceChain', 'targetChain', 'token', 'amount'];
    
    for (const field of required) {
      if (!params[field]) {
        throw new ValidationError(`Missing required parameter: ${field}`);
      }
    }
    
    if (params.sourceChain === params.targetChain) {
      throw new ValidationError('Source and target chains cannot be the same');
    }
  }

  /**
   * Index transaction for efficient querying
   */
  _indexTransaction(transaction) {
    // Index by status
    this.transactionsByStatus.get(transaction.status).add(transaction.bridgeId);
    
    // Index by protocol
    if (!this.transactionsByProtocol.has(transaction.protocol)) {
      this.transactionsByProtocol.set(transaction.protocol, new Set());
    }
    this.transactionsByProtocol.get(transaction.protocol).add(transaction.bridgeId);
    
    // Index by chains
    if (!this.transactionsByChain.has(transaction.sourceChain)) {
      this.transactionsByChain.set(transaction.sourceChain, new Set());
    }
    this.transactionsByChain.get(transaction.sourceChain).add(transaction.bridgeId);
    
    if (!this.transactionsByChain.has(transaction.targetChain)) {
      this.transactionsByChain.set(transaction.targetChain, new Set());
    }
    this.transactionsByChain.get(transaction.targetChain).add(transaction.bridgeId);
  }

  /**
   * Re-index transaction after status change
   */
  _reindexTransaction(transaction, previousStatus) {
    // Remove from previous status
    if (previousStatus) {
      this.transactionsByStatus.get(previousStatus)?.delete(transaction.bridgeId);
    }
    
    // Add to new status
    this.transactionsByStatus.get(transaction.status).add(transaction.bridgeId);
  }

  /**
   * Remove transaction from all indexes
   */
  _unindexTransaction(transaction) {
    // Remove from status index
    this.transactionsByStatus.get(transaction.status)?.delete(transaction.bridgeId);
    
    // Remove from protocol index
    this.transactionsByProtocol.get(transaction.protocol)?.delete(transaction.bridgeId);
    
    // Remove from chain indexes
    this.transactionsByChain.get(transaction.sourceChain)?.delete(transaction.bridgeId);
    this.transactionsByChain.get(transaction.targetChain)?.delete(transaction.bridgeId);
  }

  /**
   * Update timestamps based on status
   */
  _updateTimestamps(transaction, status, timestamp) {
    switch (status) {
      case 'initiated':
        transaction.initiatedAt = timestamp;
        break;
      case 'confirmed':
        transaction.confirmedAt = timestamp;
        break;
      case 'completed':
        transaction.completedAt = timestamp;
        break;
    }
  }

  /**
   * Update transaction data based on status and provided data
   */
  _updateTransactionData(transaction, status, data) {
    // Update transaction hashes
    if (data.sourceTransactionHash) {
      transaction.sourceTransactionHash = data.sourceTransactionHash;
    }
    
    if (data.destinationTransactionHash) {
      transaction.destinationTransactionHash = data.destinationTransactionHash;
    }
    
    // Update financial data
    if (data.actualFee) {
      transaction.actualFee = data.actualFee.toString();
      this.metrics.totalFees += BigInt(data.actualFee.toString());
    }
    
    if (data.gasUsed) {
      transaction.gasUsed = data.gasUsed.toString();
    }
    
    // Update external references
    if (data.messageId) {
      transaction.externalRefs.messageId = data.messageId;
    }
    
    if (data.nonce) {
      transaction.externalRefs.nonce = data.nonce;
    }
    
    if (data.sequence) {
      transaction.externalRefs.sequence = data.sequence;
    }
    
    // Handle errors
    if (data.error) {
      transaction.errors.push({
        timestamp: Date.now(),
        status,
        code: data.error.code || 'UNKNOWN_ERROR',
        message: data.error.message || 'Unknown error',
        details: data.error.details || null
      });
    }
    
    // Update retry count
    if (data.isRetry) {
      transaction.retryCount++;
    }
    
    // Update volume for completed transactions
    if (status === 'completed' && transaction.amount) {
      try {
        this.metrics.totalVolume += BigInt(transaction.amount);
      } catch (error) {
        logger.warn(`Invalid amount for volume calculation: ${transaction.amount}`);
      }
    }
  }

  /**
   * Update protocol statistics
   */
  _updateProtocolStats(protocol, action) {
    if (!this.metrics.protocolStats.has(protocol)) {
      this.metrics.protocolStats.set(protocol, {
        started: 0,
        completed: 0,
        failed: 0,
        cancelled: 0
      });
    }
    
    const stats = this.metrics.protocolStats.get(protocol);
    stats[action] = (stats[action] || 0) + 1;
  }

  /**
   * Update chain statistics
   */
  _updateChainStats(chain, type) {
    if (!this.metrics.chainStats.has(chain)) {
      this.metrics.chainStats.set(chain, {
        source: 0,
        target: 0
      });
    }
    
    const stats = this.metrics.chainStats.get(chain);
    stats[type] = (stats[type] || 0) + 1;
  }

  /**
   * Update status-specific metrics
   */
  _updateStatusMetrics(newStatus, previousStatus, transaction) {
    // This could be extended to track status transition metrics
    // For now, we update the basic counters in the main update method
  }

  /**
   * Check for alerts and emit warnings
   */
  _checkAlerts(transaction) {
    const now = Date.now();
    
    // Check for stuck transaction
    if (!['completed', 'failed', 'cancelled'].includes(transaction.status)) {
      const timeSinceCreated = now - transaction.createdAt;
      if (timeSinceCreated > this.config.stuckTransactionThreshold) {
        this.emit('stuckTransaction', {
          bridgeId: transaction.bridgeId,
          transaction: { ...transaction },
          stuckDuration: timeSinceCreated
        });
      }
    }
    
    // Check for high failure rate
    const recentFailures = this._getRecentFailureRate();
    if (recentFailures > this.config.failureRateThreshold) {
      this.emit('highFailureRate', {
        currentRate: recentFailures,
        threshold: this.config.failureRateThreshold,
        timestamp: now
      });
    }
  }

  /**
   * Get recent failure rate (last hour)
   */
  _getRecentFailureRate() {
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    const recentTransactions = Array.from(this.transactions.values())
      .filter(tx => tx.createdAt >= oneHourAgo);
    
    if (recentTransactions.length === 0) return 0;
    
    const recentFailures = recentTransactions.filter(tx => tx.status === 'failed').length;
    return recentFailures / recentTransactions.length;
  }

  /**
   * Detect stuck transactions
   */
  _detectStuckTransactions() {
    const stuckTransactions = this.getStuckTransactions();
    
    for (const transaction of stuckTransactions) {
      // Auto-mark as stuck if not already
      if (transaction.status !== 'stuck') {
        this.updateStatus(transaction.bridgeId, 'stuck', {
          reason: 'Auto-detected stuck transaction',
          stuckDuration: transaction.stuckDuration,
          previousStatus: transaction.status
        });
      }
    }
    
    if (stuckTransactions.length > 0) {
      logger.warn(`Detected ${stuckTransactions.length} stuck transactions`);
      this.emit('stuckTransactionsDetected', {
        count: stuckTransactions.length,
        transactions: stuckTransactions.map(tx => ({
          bridgeId: tx.bridgeId,
          status: tx.status,
          stuckDuration: tx.stuckDuration,
          protocol: tx.protocol
        }))
      });
    }
  }

  /**
   * Collect periodic metrics
   */
  _collectMetrics() {
    const now = Date.now();
    const hour = Math.floor(now / (60 * 60 * 1000));
    const day = Math.floor(now / (24 * 60 * 60 * 1000));
    
    // Collect hourly metrics
    if (!this.metrics.hourlyStats.has(hour)) {
      this.metrics.hourlyStats.set(hour, {
        hour,
        transactions: 0,
        completed: 0,
        failed: 0,
        totalVolume: 0n,
        totalFees: 0n
      });
    }
    
    // Collect daily metrics
    if (!this.metrics.dailyStats.has(day)) {
      this.metrics.dailyStats.set(day, {
        day,
        transactions: 0,
        completed: 0,
        failed: 0,
        totalVolume: 0n,
        totalFees: 0n
      });
    }
    
    // Clean up old hourly stats (keep last 48 hours)
    const oldestHour = hour - 48;
    for (const [h] of this.metrics.hourlyStats) {
      if (h < oldestHour) {
        this.metrics.hourlyStats.delete(h);
      }
    }
    
    // Clean up old daily stats (keep last 30 days)
    const oldestDay = day - 30;
    for (const [d] of this.metrics.dailyStats) {
      if (d < oldestDay) {
        this.metrics.dailyStats.delete(d);
      }
    }
  }

  /**
   * Convert BigInt wei to ETH string
   */
  _bigIntToEth(weiAmount) {
    try {
      const eth = Number(weiAmount) / Math.pow(10, 18);
      return eth.toFixed(6);
    } catch (error) {
      return '0.000000';
    }
  }

  /**
   * Get transaction performance report
   */
  getPerformanceReport(timeRange = '24h') {
    const now = Date.now();
    let startTime;
    
    switch (timeRange) {
      case '1h':
        startTime = now - (60 * 60 * 1000);
        break;
      case '24h':
        startTime = now - (24 * 60 * 60 * 1000);
        break;
      case '7d':
        startTime = now - (7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startTime = now - (30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startTime = now - (24 * 60 * 60 * 1000);
    }
    
    const transactions = Array.from(this.transactions.values())
      .filter(tx => tx.createdAt >= startTime);
    
    if (transactions.length === 0) {
      return {
        timeRange,
        startTime,
        endTime: now,
        totalTransactions: 0,
        summary: {},
        protocols: {},
        chains: {},
        trends: []
      };
    }
    
    const completed = transactions.filter(tx => tx.status === 'completed');
    const failed = transactions.filter(tx => tx.status === 'failed');
    const active = transactions.filter(tx => !['completed', 'failed', 'cancelled'].includes(tx.status));
    
    // Calculate durations for completed transactions
    const completionTimes = completed
      .filter(tx => tx.actualDuration)
      .map(tx => tx.actualDuration);
    
    const avgCompletionTime = completionTimes.length > 0 ?
      completionTimes.reduce((sum, time) => sum + time, 0) / completionTimes.length : 0;
    
    const medianCompletionTime = completionTimes.length > 0 ?
      completionTimes.sort((a, b) => a - b)[Math.floor(completionTimes.length / 2)] : 0;
    
    // Protocol breakdown
    const protocolBreakdown = {};
    for (const tx of transactions) {
      if (!protocolBreakdown[tx.protocol]) {
        protocolBreakdown[tx.protocol] = {
          total: 0,
          completed: 0,
          failed: 0,
          active: 0,
          avgCompletionTime: 0
        };
      }
      
      const stats = protocolBreakdown[tx.protocol];
      stats.total++;
      
      if (tx.status === 'completed') {
        stats.completed++;
      } else if (tx.status === 'failed') {
        stats.failed++;
      } else if (!['cancelled'].includes(tx.status)) {
        stats.active++;
      }
    }
    
    // Calculate protocol completion times
    for (const [protocol, stats] of Object.entries(protocolBreakdown)) {
      const protocolCompleted = completed.filter(tx => tx.protocol === protocol);
      const protocolTimes = protocolCompleted
        .filter(tx => tx.actualDuration)
        .map(tx => tx.actualDuration);
      
      stats.avgCompletionTime = protocolTimes.length > 0 ?
        protocolTimes.reduce((sum, time) => sum + time, 0) / protocolTimes.length : 0;
      
      stats.successRate = stats.total > 0 ? (stats.completed / stats.total) : 0;
    }
    
    // Chain breakdown
    const chainBreakdown = {};
    for (const tx of transactions) {
      // Source chain
      if (!chainBreakdown[tx.sourceChain]) {
        chainBreakdown[tx.sourceChain] = { asSource: 0, asTarget: 0 };
      }
      chainBreakdown[tx.sourceChain].asSource++;
      
      // Target chain
      if (!chainBreakdown[tx.targetChain]) {
        chainBreakdown[tx.targetChain] = { asSource: 0, asTarget: 0 };
      }
      chainBreakdown[tx.targetChain].asTarget++;
    }
    
    return {
      timeRange,
      startTime,
      endTime: now,
      totalTransactions: transactions.length,
      
      summary: {
        completed: completed.length,
        failed: failed.length,
        active: active.length,
        cancelled: transactions.filter(tx => tx.status === 'cancelled').length,
        successRate: transactions.length > 0 ? (completed.length / transactions.length) : 0,
        failureRate: transactions.length > 0 ? (failed.length / transactions.length) : 0,
        avgCompletionTimeMs: Math.round(avgCompletionTime),
        medianCompletionTimeMs: Math.round(medianCompletionTime),
        avgCompletionTimeMinutes: Math.round(avgCompletionTime / 60000 * 100) / 100
      },
      
      protocols: protocolBreakdown,
      chains: chainBreakdown,
      
      trends: this._calculateTrends(transactions, timeRange)
    };
  }

  /**
   * Calculate trend data
   */
  _calculateTrends(transactions, timeRange) {
    if (transactions.length === 0) return [];
    
    let bucketSize;
    let bucketCount;
    
    switch (timeRange) {
      case '1h':
        bucketSize = 5 * 60 * 1000; // 5 minutes
        bucketCount = 12;
        break;
      case '24h':
        bucketSize = 60 * 60 * 1000; // 1 hour
        bucketCount = 24;
        break;
      case '7d':
        bucketSize = 6 * 60 * 60 * 1000; // 6 hours
        bucketCount = 28;
        break;
      case '30d':
        bucketSize = 24 * 60 * 60 * 1000; // 1 day
        bucketCount = 30;
        break;
      default:
        bucketSize = 60 * 60 * 1000;
        bucketCount = 24;
    }
    
    const now = Date.now();
    const trends = [];
    
    for (let i = bucketCount - 1; i >= 0; i--) {
      const bucketEnd = now - (i * bucketSize);
      const bucketStart = bucketEnd - bucketSize;
      
      const bucketTransactions = transactions.filter(tx => 
        tx.createdAt >= bucketStart && tx.createdAt < bucketEnd
      );
      
      const bucketCompleted = bucketTransactions.filter(tx => tx.status === 'completed');
      const bucketFailed = bucketTransactions.filter(tx => tx.status === 'failed');
      
      trends.push({
        timestamp: bucketStart,
        timestampEnd: bucketEnd,
        total: bucketTransactions.length,
        completed: bucketCompleted.length,
        failed: bucketFailed.length,
        successRate: bucketTransactions.length > 0 ? 
          (bucketCompleted.length / bucketTransactions.length) : 0
      });
    }
    
    return trends;
  }

  /**
   * Export transaction data for external systems
   */
  exportData(format = 'json', options = {}) {
    const {
      includeHistory = false,
      includeMetrics = true,
      includeErrors = false,
      timeRange = null
    } = options;
    
    let transactions = Array.from(this.transactions.values());
    
    // Apply time range filter
    if (timeRange) {
      const now = Date.now();
      const startTime = now - timeRange;
      transactions = transactions.filter(tx => tx.createdAt >= startTime);
    }
    
    // Prepare export data
    const exportData = {
      metadata: {
        exportedAt: Date.now(),
        totalTransactions: transactions.length,
        format,
        options
      },
      transactions: transactions.map(tx => ({
        bridgeId: tx.bridgeId,
        protocol: tx.protocol,
        sourceChain: tx.sourceChain,
        targetChain: tx.targetChain,
        token: tx.token,
        amount: tx.amount,
        recipient: tx.recipient,
        status: tx.status,
        createdAt: tx.createdAt,
        updatedAt: tx.updatedAt,
        completedAt: tx.completedAt,
        actualDuration: tx.actualDuration,
        sourceTransactionHash: tx.sourceTransactionHash,
        destinationTransactionHash: tx.destinationTransactionHash,
        actualFee: tx.actualFee,
        gasUsed: tx.gasUsed,
        ...(includeHistory && { statusHistory: tx.statusHistory }),
        ...(includeErrors && { errors: tx.errors })
      }))
    };
    
    if (includeMetrics) {
      exportData.metrics = this.getMetrics();
    }
    
    switch (format) {
      case 'json':
        return JSON.stringify(exportData, null, 2);
      case 'csv':
        return this._exportToCsv(exportData.transactions);
      default:
        return exportData;
    }
  }

  /**
   * Export transactions to CSV format
   */
  _exportToCsv(transactions) {
    if (transactions.length === 0) return '';
    
    const headers = [
      'bridgeId', 'protocol', 'sourceChain', 'targetChain', 'token', 'amount',
      'recipient', 'status', 'createdAt', 'completedAt', 'actualDuration',
      'sourceTransactionHash', 'destinationTransactionHash', 'actualFee', 'gasUsed'
    ];
    
    const csvRows = [headers.join(',')];
    
    for (const tx of transactions) {
      const row = headers.map(header => {
        const value = tx[header] || '';
        // Escape CSV values
        return typeof value === 'string' && value.includes(',') ? `"${value}"` : value;
      });
      csvRows.push(row.join(','));
    }
    
    return csvRows.join('\n');
  }

  /**
   * Get tracker health status
   */
  getHealthStatus() {
    const now = Date.now();
    const activeTransactions = this.getActiveTransactions();
    const stuckTransactions = this.getStuckTransactions();
    
    return {
      status: this.isActive ? 'healthy' : 'stopped',
      timestamp: now,
      uptime: now - this.startTime,
      storage: {
        totalTransactions: this.transactions.size,
        activeTransactions: activeTransactions.length,
        stuckTransactions: stuckTransactions.length,
        storageUtilization: (this.transactions.size / this.config.maxTransactions) * 100
      },
      metrics: {
        successRate: this._getRecentSuccessRate(),
        avgCompletionTime: this._getRecentAvgCompletionTime(),
        recentFailureRate: this._getRecentFailureRate()
      },
      backgroundTasks: {
        cleanupActive: !!this.cleanupTimer,
        metricsActive: !!this.metricsTimer
      }
    };
  }

  /**
   * Get recent success rate (last 100 transactions)
   */
  _getRecentSuccessRate() {
    const recentTransactions = Array.from(this.transactions.values())
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 100)
      .filter(tx => ['completed', 'failed'].includes(tx.status));
    
    if (recentTransactions.length === 0) return 0;
    
    const completed = recentTransactions.filter(tx => tx.status === 'completed').length;
    return completed / recentTransactions.length;
  }

  /**
   * Get recent average completion time
   */
  _getRecentAvgCompletionTime() {
    const recentCompleted = Array.from(this.transactions.values())
      .filter(tx => tx.status === 'completed' && tx.actualDuration)
      .sort((a, b) => b.completedAt - a.completedAt)
      .slice(0, 50);
    
    if (recentCompleted.length === 0) return 0;
    
    const totalTime = recentCompleted.reduce((sum, tx) => sum + tx.actualDuration, 0);
    return totalTime / recentCompleted.length;
  }

  /**
   * Graceful shutdown
   */
  async shutdown() {
    logger.info('Shutting down TransactionTracker...');
    
    try {
      // Stop background tasks
      this._stopBackgroundTasks();
      
      // Final cleanup
      await this.cleanup();
      
      // Clear all data
      this.transactions.clear();
      this.transactionsByStatus.clear();
      this.transactionsByProtocol.clear();
      this.transactionsByChain.clear();
      
      // Remove all event listeners
      this.removeAllListeners();
      
      logger.info('TransactionTracker shutdown completed', {
        uptime: Date.now() - this.startTime
      });
      
      this.emit('shutdown', {
        uptime: Date.now() - this.startTime,
        finalMetrics: this.getMetrics()
      });
      
    } catch (error) {
      logger.error('Error during TransactionTracker shutdown:', error);
      throw error;
    }
  }
}
