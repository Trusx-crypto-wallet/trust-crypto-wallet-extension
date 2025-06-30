try {
      this.logger.info('Initializing WebSocket connection');

      // Subscribe to pending transactions
      await this.websocketProvider.on('pending', (txHash) => {
        this._handleWebSocketTransaction(txHash);
      });

      this.websocketConnected = true;
      this.websocketReconnectAttempts = 0;

      this.logger.info('WebSocket connection established');

      // Set up reconnection handling
      this.websocketProvider.on('error', (error) => {
        this._handleWebSocketError(error);
      });

      this.websocketProvider.on('close', () => {
        this._handleWebSocketClose();
      });

      return true;

    } catch (error) {
      this.logger.error('Failed to initialize WebSocket', {
        error: error.message
      });
      
      this.websocketConnected = false;
      return false;
    }
  }

  /**
   * Handles WebSocket transaction events
   */
  async _handleWebSocketTransaction(txHash) {
    try {
      if (!this._isValidTransactionHash(txHash)) {
        return;
      }

      // Avoid duplicate processing
      if (this.mempool.has(txHash) || this.pendingTransactions.has(txHash)) {
        return;
      }

      // Fetch transaction details
      const transaction = await this.provider.getTransaction(txHash);
      if (transaction && !transaction.blockNumber) {
        await this._addTransactionToMempool(transaction);
      }

    } catch (error) {
      this.logger.debug('WebSocket transaction processing error', {
        txHash,
        error: error.message
      });
    }
  }

  /**
   * Handles WebSocket errors
   */
  _handleWebSocketError(error) {
    this.logger.warn('WebSocket error', {
      error: error.message,
      reconnectAttempts: this.websocketReconnectAttempts
    });

    this.websocketConnected = false;
    this._attemptWebSocketReconnection();
  }

  /**
   * Handles WebSocket connection close
   */
  _handleWebSocketClose() {
    this.logger.warn('WebSocket connection closed');
    this.websocketConnected = false;
    this._attemptWebSocketReconnection();
  }

  /**
   * Attempts WebSocket reconnection
   */
  _attemptWebSocketReconnection() {
    if (this.websocketReconnectAttempts >= this.maxWebsocketReconnectAttempts) {
      this.logger.error('Max WebSocket reconnection attempts reached');
      return;
    }

    if (!this.isMonitoring) {
      return; // Don't reconnect if monitoring is stopped
    }

    this.websocketReconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.websocketReconnectAttempts), 30000);

    this.logger.info('Attempting WebSocket reconnection', {
      attempt: this.websocketReconnectAttempts,
      delay
    });

    setTimeout(async () => {
      try {
        await this._initializeWebSocket();
      } catch (error) {
        this.logger.error('WebSocket reconnection failed', {
          error: error.message
        });
      }
    }, delay);
  }

  /**
   * Closes WebSocket connection
   */
  async _closeWebSocket() {
    if (this.websocketProvider && this.websocketConnected) {
      try {
        await this.websocketProvider.removeAllListeners();
        this.websocketConnected = false;
        this.logger.info('WebSocket connection closed');
      } catch (error) {
        this.logger.warn('Error closing WebSocket', {
          error: error.message
        });
      }
    }
  }

  /**
   * Starts polling-based monitoring
   */
  _startPollingMonitoring() {
    const pollMempool = async () => {
      if (!this.isMonitoring) return;

      try {
        await this._pollMempoolTransactions();
        this.performanceMetrics.lastUpdateTime = Date.now();
      } catch (error) {
        this.performanceMetrics.errorCount++;
        this.logger.warn('Mempool polling error', {
          error: error.message
        });
      }
    };

    // Start polling
    this.pollingInterval = setInterval(pollMempool, this.config.pollingInterval);
    
    // Initial poll
    pollMempool();
  }

  /**
   * Polls mempool transactions
   */
  async _pollMempoolTransactions() {
    // Note: This is a simplified implementation
    // In a real production environment, you would need access to mempool APIs
    // or use WebSocket subscriptions for real-time mempool data
    
    // For demonstration, we'll poll pending transactions we're tracking
    const pendingPromises = Array.from(this.pendingTransactions.keys()).map(txHash =>
      this._updateTrackedTransaction(txHash)
    );

    await Promise.allSettled(pendingPromises);

    // Update analytics
    this._updateMempoolAnalytics();
  }

  /**
   * Updates a tracked transaction
   */
  async _updateTrackedTransaction(txHash) {
    try {
      const trackingData = this.pendingTransactions.get(txHash);
      if (!trackingData) return;

      const transaction = await this.provider.getTransaction(txHash);
      const receipt = await this.provider.getTransactionReceipt(txHash);

      if (receipt) {
        // Transaction confirmed
        trackingData.updates.push({
          type: 'confirmed',
          blockNumber: receipt.blockNumber,
          timestamp: Date.now()
        });

        this._removeTransactionFromMempool(txHash, MEMPOOL_TX_STATES.CONFIRMED);
        
        this.emit('transaction_confirmed', {
          transactionHash: txHash,
          blockNumber: receipt.blockNumber,
          timestamp: Date.now()
        });

      } else if (!transaction) {
        // Transaction dropped
        trackingData.updates.push({
          type: 'dropped',
          timestamp: Date.now()
        });

        this._removeTransactionFromMempool(txHash, MEMPOOL_TX_STATES.DROPPED);
        
        this.emit('transaction_dropped', {
          transactionHash: txHash,
          timestamp: Date.now()
        });

      } else {
        // Still pending - update last seen
        trackingData.lastSeen = Date.now();
        
        // Check if stuck
        const timeInMempool = Date.now() - trackingData.trackingStarted;
        if (timeInMempool > this.config.stuckThreshold) {
          this._markTransactionAsStuck(txHash);
        }
      }

    } catch (error) {
      this.logger.debug('Error updating tracked transaction', {
        txHash,
        error: error.message
      });
    }
  }

  /**
   * Adds transaction to mempool
   */
  async _addTransactionToMempool(transaction) {
    try {
      const processedTx = await this._processTransaction(transaction);
      
      // Check mempool size limit
      if (this.mempool.size >= this.config.maxMempoolSize) {
        this._evictOldestTransaction();
      }

      this.mempool.set(transaction.hash, processedTx);
      this.performanceMetrics.transactionsProcessed++;

      // Apply filters
      this._applyFiltersToTransaction(processedTx);

      // Perform security analysis if enabled
      if (this.config.enableSecurityChecks) {
        await this._performSecurityAnalysis(processedTx);
      }

      // Perform MEV analysis if enabled
      if (this.config.enableMevAnalysis) {
        await this._performMevAnalysis(processedTx);
      }

      // Update analytics
      this._updateTransactionAnalytics(processedTx);

      this.emit('transaction_added', {
        transactionHash: transaction.hash,
        priority: processedTx.priority,
        gasPrice: processedTx.gasPrice.toString(),
        value: processedTx.value.toString(),
        timestamp: Date.now()
      });

      this.logger.debug('Transaction added to mempool', {
        hash: transaction.hash,
        priority: processedTx.priority,
        gasPrice: processedTx.gasPrice.toString()
      });

    } catch (error) {
      this.logger.warn('Error adding transaction to mempool', {
        hash: transaction.hash,
        error: error.message
      });
    }
  }

  /**
   * Processes raw transaction into mempool format
   */
  async _processTransaction(transaction) {
    const now = Date.now();
    
    const processedTx = {
      hash: transaction.hash,
      from: transaction.from,
      to: transaction.to,
      value: transaction.value || BigInt(0),
      gasLimit: transaction.gasLimit || BigInt(0),
      gasPrice: transaction.gasPrice || BigInt(0),
      maxFeePerGas: transaction.maxFeePerGas || null,
      maxPriorityFeePerGas: transaction.maxPriorityFeePerGas || null,
      nonce: transaction.nonce,
      data: transaction.data || '0x',
      type: transaction.type || 0,
      
      // Mempool-specific data
      firstSeen: now,
      lastSeen: now,
      timeInMempool: 0,
      state: MEMPOOL_TX_STATES.PENDING,
      
      // Analysis results
      priority: this._calculateTransactionPriority(transaction),
      mevRisk: 0,
      securityFlags: [],
      
      // Metadata
      size: this._calculateTransactionSize(transaction),
      isContractInteraction: transaction.to && transaction.data && transaction.data !== '0x',
      estimatedConfirmationTime: this._estimateConfirmationTime(transaction)
    };

    return processedTx;
  }

  /**
   * Calculates transaction priority based on gas price
   */
  _calculateTransactionPriority(transaction) {
    const gasPrice = transaction.gasPrice || transaction.maxFeePerGas || BigInt(0);
    const thresholds = this.networkConfig.priorityThresholds;

    if (gasPrice >= thresholds.ultraHigh) {
      return TRANSACTION_PRIORITY.ULTRA_HIGH;
    } else if (gasPrice >= thresholds.high) {
      return TRANSACTION_PRIORITY.HIGH;
    } else if (gasPrice >= thresholds.medium) {
      return TRANSACTION_PRIORITY.MEDIUM;
    } else if (gasPrice >= thresholds.low) {
      return TRANSACTION_PRIORITY.LOW;
    } else {
      return TRANSACTION_PRIORITY.VERY_LOW;
    }
  }

  /**
   * Calculates transaction size in bytes
   */
  _calculateTransactionSize(transaction) {
    // Simplified size calculation
    let size = 68; // Base transaction size
    
    if (transaction.data && transaction.data !== '0x') {
      size += (transaction.data.length - 2) / 2; // Data size in bytes
    }
    
    return size;
  }

  /**
   * Estimates confirmation time based on gas price and network conditions
   */
  _estimateConfirmationTime(transaction) {
    const gasPrice = transaction.gasPrice || transaction.maxFeePerGas || BigInt(0);
    const avgBlockTime = this.networkConfig.avgBlockTime;
    
    // Simple estimation based on priority
    const priority = this._calculateTransactionPriority(transaction);
    
    switch (priority) {
      case TRANSACTION_PRIORITY.ULTRA_HIGH:
        return avgBlockTime;
      case TRANSACTION_PRIORITY.HIGH:
        return avgBlockTime * 2;
      case TRANSACTION_PRIORITY.MEDIUM:
        return avgBlockTime * 4;
      case TRANSACTION_PRIORITY.LOW:
        return avgBlockTime * 8;
      case TRANSACTION_PRIORITY.VERY_LOW:
        return avgBlockTime * 16;
      default:
        return avgBlockTime * 8;
    }
  }

  /**
   * Applies filters to transaction
   */
  _applyFiltersToTransaction(transaction) {
    for (const [filterId, filter] of this.filters.entries()) {
      if (!filter.enabled) continue;

      try {
        if (filter.criteria(transaction)) {
          this.emit('filter_matched', {
            filterId,
            filterName: filter.name,
            transactionHash: transaction.hash,
            transaction: this._formatTransactionForOutput(transaction),
            timestamp: Date.now()
          });
        }
      } catch (error) {
        this.logger.warn('Filter execution error', {
          filterId,
          filterName: filter.name,
          error: error.message
        });
      }
    }
  }

  /**
   * Performs security analysis on transaction
   */
  async _performSecurityAnalysis(transaction) {
    try {
      const securityFlags = [];

      // Check for unusual gas prices
      if (transaction.gasPrice > this.networkConfig.priorityThresholds.ultraHigh * BigInt(5)) {
        securityFlags.push({
          type: 'unusual_gas_price',
          severity: 'medium',
          description: 'Unusually high gas price detected'
        });
      }

      // Check for large value transfers
      if (transaction.value > ethers.parseEther('100')) {
        securityFlags.push({
          type: 'large_value_transfer',
          severity: 'low',
          description: 'Large value transfer detected'
        });
      }

      // Check for contract interactions with high gas
      if (transaction.isContractInteraction && transaction.gasLimit > BigInt(1000000)) {
        securityFlags.push({
          type: 'high_gas_contract_interaction',
          severity: 'medium',
          description: 'High gas contract interaction detected'
        });
      }

      transaction.securityFlags = securityFlags;

      if (securityFlags.length > 0) {
        this.emit('security_alert', {
          transactionHash: transaction.hash,
          flags: securityFlags,
          timestamp: Date.now()
        });
      }

    } catch (error) {
      this.logger.warn('Security analysis error', {
        hash: transaction.hash,
        error: error.message
      });
    }
  }

  /**
   * Performs MEV analysis on transaction
   */
  async _performMevAnalysis(transaction) {
    try {
      let mevRisk = 0;
      const mevPatterns = [];

      // Check for potential arbitrage (high gas, contract interaction)
      if (transaction.isContractInteraction && 
          transaction.gasPrice > this.networkConfig.priorityThresholds.high) {
        mevRisk += 0.3;
        mevPatterns.push('potential_arbitrage');
      }

      // Check for front-running patterns (high gas, small value)
      if (transaction.gasPrice > this.networkConfig.priorityThresholds.ultraHigh &&
          transaction.value < ethers.parseEther('0.1')) {
        mevRisk += 0.4;
        mevPatterns.push('potential_frontrun');
      }

      // Check for sandwich attack patterns
      if (this._detectSandwichPattern(transaction)) {
        mevRisk += 0.5;
        mevPatterns.push('potential_sandwich');
        this.mevAnalytics.sandwichAttacks++;
      }

      transaction.mevRisk = mevRisk;
      transaction.mevPatterns = mevPatterns;

      if (mevRisk > 0.7) {
        this.mevAnalytics.detectedMevTransactions++;
        
        this.emit('mev_detected', {
          transactionHash: transaction.hash,
          mevRisk,
          patterns: mevPatterns,
          timestamp: Date.now()
        });
      }

    } catch (error) {
      this.logger.warn('MEV analysis error', {
        hash: transaction.hash,
        error: error.message
      });
    }
  }

  /**
   * Detects sandwich attack patterns
   */
  _detectSandwichPattern(transaction) {
    // Simplified sandwich detection
    // Look for transactions with similar patterns in recent mempool
    const recentTransactions = Array.from(this.mempool.values())
      .filter(tx => Date.now() - tx.firstSeen < 30000) // Last 30 seconds
      .filter(tx => tx.to === transaction.to && tx.from !== transaction.from);

    return recentTransactions.length > 1;
  }

  /**
   * Updates transaction analytics
   */
  _updateTransactionAnalytics(transaction) {
    // Update priority distribution
    if (!this.mempoolStats.priorityDistribution[transaction.priority]) {
      this.mempoolStats.priorityDistribution[transaction.priority] = 0;
    }
    this.mempoolStats.priorityDistribution[transaction.priority]++;

    // Update gas analytics
    if (this.config.enableGasAnalysis) {
      this._updateGasAnalytics(transaction);
    }

    // Update general stats
    this.mempoolStats.totalTransactions = this.mempool.size;
  }

  /**
   * Updates gas analytics
   */
  _updateGasAnalytics(transaction) {
    const gasPrice = transaction.gasPrice;
    
    // Add to priority fee history
    this.gasAnalytics.priorityFeeHistory.push({
      gasPrice: gasPrice,
      timestamp: Date.now(),
      priority: transaction.priority
    });

    // Trim history
    if (this.gasAnalytics.priorityFeeHistory.length > this.config.gasAnalysisDepth) {
      this.gasAnalytics.priorityFeeHistory = 
        this.gasAnalytics.priorityFeeHistory.slice(-this.config.gasAnalysisDepth);
    }

    // Update gas usage distribution
    const gasLimit = Number(transaction.gasLimit);
    const gasRange = this._getGasRange(gasLimit);
    
    if (!this.gasAnalytics.gasUsageDistribution[gasRange]) {
      this.gasAnalytics.gasUsageDistribution[gasRange] = 0;
    }
    this.gasAnalytics.gasUsageDistribution[gasRange]++;

    // Update congestion level
    this._updateCongestionLevel();

    // Update recommended gas price
    this._updateRecommendedGasPrice();
  }

  /**
   * Gets gas range category
   */
  _getGasRange(gasLimit) {
    if (gasLimit < 21000) return 'very_low';
    if (gasLimit < 50000) return 'low';
    if (gasLimit < 100000) return 'medium';
    if (gasLimit < 300000) return 'high';
    return 'very_high';
  }

  /**
   * Updates congestion level
   */
  _updateCongestionLevel() {
    const mempoolSize = this.mempool.size;
    const thresholds = this.networkConfig.congestionThresholds;

    if (mempoolSize >= thresholds.critical) {
      this.gasAnalytics.congestionLevel = 'critical';
      this.mempoolStats.congestionScore = 100;
    } else if (mempoolSize >= thresholds.high) {
      this.gasAnalytics.congestionLevel = 'high';
      this.mempoolStats.congestionScore = 80;
    } else if (mempoolSize >= thresholds.medium) {
      this.gasAnalytics.congestionLevel = 'medium';
      this.mempoolStats.congestionScore = 60;
    } else if (mempoolSize >= thresholds.low) {
      this.gasAnalytics.congestionLevel = 'low';
      this.mempoolStats.congestionScore = 40;
    } else {
      this.gasAnalytics.congestionLevel = 'minimal';
      this.mempoolStats.congestionScore = 20;
    }
  }

  /**
   * Updates recommended gas price
   */
  _updateRecommendedGasPrice() {
    if (this.gasAnalytics.priorityFeeHistory.length === 0) return;

    const recent = this.gasAnalytics.priorityFeeHistory.slice(-50);
    const gasPrices = recent.map(entry => entry.gasPrice).sort((a, b) => a > b ? 1 : -1);
    
    // Use 60th percentile as recommendation
    const percentileIndex = Math.floor(gasPrices.length * 0.6);
    this.gasAnalytics.recommendedGasPrice = gasPrices[percentileIndex] || BigInt(0);
  }

  /**
   * Updates mempool analytics
   */
  _updateMempoolAnalytics() {
    const transactions = Array.from(this.mempool.values());
    
    if (transactions.length === 0) return;

    // Calculate average gas price
    const totalGasPrice = transactions.reduce((sum, tx) => sum + tx.gasPrice, BigInt(0));
    this.mempoolStats.averageGasPrice = totalGasPrice / BigInt(transactions.length);

    // Calculate average gas limit
    const totalGasLimit = transactions.reduce((sum, tx) => sum + tx.gasLimit, BigInt(0));
    this.mempoolStats.averageGasLimit = totalGasLimit / BigInt(transactions.length);

    // Calculate throughput (transactions per second)
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    const recentTransactions = transactions.filter(tx => tx.firstSeen > oneMinuteAgo);
    this.mempoolStats.throughput = recentTransactions.length / 60;

    // Update performance metrics
    this._updatePerformanceMetrics();
  }

  /**
   * Updates performance metrics
   */
  _updatePerformanceMetrics() {
    const now = Date.now();
    
    // Update throughput history
    this.performanceMetrics.throughputHistory.push({
      value: this.mempoolStats.throughput,
      timestamp: now
    });

    // Trim history
    if (this.performanceMetrics.throughputHistory.length > 1000) {
      this.performanceMetrics.throughputHistory = 
        this.performanceMetrics.throughputHistory.slice(-1000);
    }

    // Calculate processing time
    if (this.performanceMetrics.transactionsProcessed > 0) {
      const totalTime = now - this.startTime;
      this.performanceMetrics.averageProcessingTime = 
        totalTime / this.performanceMetrics.transactionsProcessed;
    }
  }

  /**
   * Removes transaction from mempool
   */
  _removeTransactionFromMempool(txHash, newState) {
    const transaction = this.mempool.get(txHash);
    if (transaction) {
      transaction.state = newState;
      this.mempool.delete(txHash);
      
      this.emit('transaction_removed', {
        transactionHash: txHash,
        state: newState,
        timeInMempool: Date.now() - transaction.firstSeen,
        timestamp: Date.now()
      });
    }

    // Also remove from pending tracking
    this.pendingTransactions.delete(txHash);
  }

  /**
   * Marks transaction as stuck
   */
  _markTransactionAsStuck(txHash) {
    const transaction = this.mempool.get(txHash);
    if (transaction && transaction.state !== MEMPOOL_TX_STATES.STUCK) {
      transaction.state = MEMPOOL_TX_STATES.STUCK;
      
      this.emit('transaction_stuck', {
        transactionHash: txHash,
        timeInMempool: Date.now() - transaction.firstSeen,
        gasPrice: transaction.gasPrice.toString(),
        timestamp: Date.now()
      });
    }
  }

  /**
   * Evicts oldest transaction when mempool is full
   */
  _evictOldestTransaction() {
    let oldestTx = null;
    let oldestTime = Date.now();

    for (const transaction of this.mempool.values()) {
      if (transaction.firstSeen < oldestTime) {
        oldestTime = transaction.firstSeen;
        oldestTx = transaction;
      }
    }

    if (oldestTx) {
      this._removeTransactionFromMempool(oldestTx.hash, MEMPOOL_TX_STATES.DROPPED);
      this.logger.debug('Evicted oldest transaction', {
        hash: oldestTx.hash,
        age: Date.now() - oldestTx.firstSeen
      });
    }
  }

  /**
   * Starts performance monitoring
   */
  _startPerformanceMonitoring() {
    const monitor = () => {
      if (!this.isMonitoring) return;

      try {
        this._updateMempoolAnalytics();
        
        // Check performance thresholds
        this._checkPerformanceThresholds();
        
      } catch (error) {
        this.logger.warn('Performance monitoring error', {
          error: error.message
        });
      }
    };

    this.performanceMonitoringInterval = setInterval(
      monitor, 
      this.config.performanceMonitoringInterval
    );
  }

  /**
   * Checks performance thresholds and emits alerts
   */
  _checkPerformanceThresholds() {
    const latency = this.mempoolStats.latency;
    const throughput = this.mempoolStats.throughput;
    const errorRate = this._calculateErrorRate();

    // Check latency threshold
    if (latency > this.config.highLatencyThreshold) {
      this.emit('performance_alert', {
        type: 'high_latency',
        value: latency,
        threshold: this.config.highLatencyThreshold,
        timestamp: Date.now()
      });
    }

    // Check throughput threshold
    if (throughput < this.config.lowThroughputThreshold) {
      this.emit('performance_alert', {
        type: 'low_throughput',
        value: throughput,
        threshold: this.config.lowThroughputThreshold,
        timestamp: Date.now()
      });
    }

    // Check error rate threshold
    if (errorRate > this.config.errorRateThreshold) {
      this.emit('performance_alert', {
        type: 'high_error_rate',
        value: errorRate,
        threshold: this.config.errorRateThreshold,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Starts cleanup service
   */
  _startCleanupService() {
    const cleanup = () => {
      if (!this.isMonitoring) return;

      try {
        this._cleanupExpiredTransactions();
        this._cleanupOldData();
        this.lastCleanup = Date.now();
        
      } catch (error) {
        this.logger.warn('Cleanup service error', {
          error: error.message
        });
      }
    };

    this.cleanupInterval = setInterval(cleanup, this.config.cleanupInterval);
  }

  /**
   * Cleans up expired transactions
   */
  _cleanupExpiredTransactions() {
    const now = Date.now();
    const expiredTransactions = [];

    for (const [txHash, transaction] of this.mempool.entries()) {
      const age = now - transaction.firstSeen;
      
      if (age > this.config.retentionTime) {
        expiredTransactions.push(txHash);
      }
    }

    for (const txHash of expiredTransactions) {
      this._removeTransactionFromMempool(txHash, MEMPOOL_TX_STATES.DROPPED);
    }

    if (expiredTransactions.length > 0) {
      this.logger.debug('Cleaned up expired transactions', {
        count: expiredTransactions.length
      });
    }
  }

  /**
   * Cleans up old data
   */
  _cleanupOldData() {
    const now = Date.now();
    const maxAge = this.config.retentionTime * 2; // Keep data longer than mempool retention

    // Cleanup pending transactions
    for (const [txHash, trackingData] of this.pendingTransactions.entries()) {
      if (now - trackingData.trackingStarted > maxAge) {
        this.pendingTransactions.delete(txHash);
      }
    }

    // Cleanup analytics history
    this.gasAnalytics.priorityFeeHistory = this.gasAnalytics.priorityFeeHistory
      .filter(entry => now - entry.timestamp < maxAge);

    this.performanceMetrics.throughputHistory = this.performanceMetrics.throughputHistory
      .filter(entry => now - entry.timestamp < maxAge);

    this.performanceMetrics.latencyHistory = this.performanceMetrics.latencyHistory
      .filter(entry => now - entry.timestamp < maxAge);

    // Cleanup MEV patterns
    this.mevAnalytics.suspiciousPatterns = this.mevAnalytics.suspiciousPatterns
      .filter(pattern => now - pattern.timestamp < maxAge);
  }

  /**
   * Stops all intervals
   */
  _stopAllIntervals() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }

    if (this.performanceMonitoringInterval) {
      clearInterval(this.performanceMonitoringInterval);
      this.performanceMonitoringInterval = null;
    }

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Clears all subscriptions
   */
  _clearAllSubscriptions() {
    this.subscriptions.clear();
  }

  /**
   * Helper methods for calculations and utilities
   */

  _isValidTransactionHash(hash) {
    return typeof hash === 'string' && 
           hash.length === 66 && 
           hash.startsWith('0x') && 
           /^0x[a-fA-F0-9]{64}$/.test(hash);
  }

  _calculateErrorRate() {
    const totalOperations = this.performanceMetrics.transactionsProcessed + this.performanceMetrics.errorCount;
    return totalOperations > 0 ? (this.performanceMetrics.errorCount / totalOperations) * 100 : 0;
  }

  _calculatePriorityDistribution() {
    const distribution = {};
    const transactions = Array.from(this.mempool.values());
    
    for (const priority of Object.values(TRANSACTION_PRIORITY)) {
      distribution[priority] = transactions.filter(tx => tx.priority === priority).length;
    }
    
    return distribution;
  }

  _calculateSizeDistribution() {
    const distribution = { small: 0, medium: 0, large: 0, extraLarge: 0 };
    
    for (const transaction of this.mempool.values()) {
      if (transaction.size < 200) distribution.small++;
      else if (transaction.size < 500) distribution.medium++;
      else if (transaction.size < 1000) distribution.large++;
      else distribution.extraLarge++;
    }
    
    return distribution;
  }

  _calculateValueDistribution() {
    const distribution = { micro: 0, small: 0, medium: 0, large: 0, whale: 0 };
    
    for (const transaction of this.mempool.values()) {
      const valueEth = Number(ethers.formatEther(transaction.value));
      
      if (valueEth < 0.01) distribution.micro++;
      else if (valueEth < 0.1) distribution.small++;
      else if (valueEth < 1) distribution.medium++;
      else if (valueEth < 10) distribution.large++;
      else distribution.whale++;
    }
    
    return distribution;
  }

  _calculateContractInteractionRatio() {
    const total = this.mempool.size;
    if (total === 0) return 0;
    
    const contractInteractions = Array.from(this.mempool.values())
      .filter(tx => tx.isContractInteraction).length;
    
    return (contractInteractions / total) * 100;
  }

  _calculateAverageTimeInMempool() {
    const transactions = Array.from(this.mempool.values());
    if (transactions.length === 0) return 0;
    
    const now = Date.now();
    const totalTime = transactions.reduce((sum, tx) => sum + (now - tx.firstSeen), 0);
    
    return totalTime / transactions.length;
  }

  _calculateGasPriceTrend() {
    const history = this.gasAnalytics.priorityFeeHistory.slice(-20);
    if (history.length < 10) return 'stable';
    
    const firstHalf = history.slice(0, Math.floor(history.length / 2));
    const secondHalf = history.slice(Math.floor(history.length / 2));
    
    const firstAvg = firstHalf.reduce((sum, entry) => sum + entry.gasPrice, BigInt(0)) / BigInt(firstHalf.length);
    const secondAvg = secondHalf.reduce((sum, entry) => sum + entry.gasPrice, BigInt(0)) / BigInt(secondHalf.length);
    
    const change = Number(((secondAvg - firstAvg) * BigInt(100)) / firstAvg);
    
    if (change > 10) return 'increasing';
    if (change < -10) return 'decreasing';
    return 'stable';
  }

  _calculateCongestionTrend() {
    const history = this.performanceMetrics.throughputHistory.slice(-10);
    if (history.length < 5) return 'stable';
    
    const firstHalf = history.slice(0, Math.floor(history.length / 2));
    const secondHalf = history.slice(Math.floor(history.length / 2));
    
    const firstAvg = firstHalf.reduce((sum, entry) => sum + entry.value, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, entry) => sum + entry.value, 0) / secondHalf.length;
    
    const change = ((secondAvg - firstAvg) / firstAvg) * 100;
    
    if (change > 20) return 'increasing';
    if (change < -20) return 'decreasing';
    return 'stable';
  }

  _calculateMevScore() {
    const total = this.mempool.size;
    if (total === 0) return 0;
    
    const mevTransactions = Array.from(this.mempool.values())
      .filter(tx => tx.mevRisk > 0.5).length;
    
    return (mevTransactions / total) * 100;
  }

  _calculateMevRiskLevel() {
    const mevScore = this._calculateMevScore();
    
    if (mevScore > 10) return 'high';
    if (mevScore > 5) return 'medium';
    if (mevScore > 1) return 'low';
    return 'minimal';
  }

  _calculateProcessingEfficiency() {
    const totalTime = Date.now() - this.startTime;
    const processed = this.performanceMetrics.transactionsProcessed;
    
    return totalTime > 0 ? (processed / totalTime) * 1000 : 0; // Transactions per second
  }

  _calculateResourceUtilization() {
    const memoryUsage = (this.mempool.size / this.config.maxMempoolSize) * 100;
    const processingLoad = Math.min(this.mempoolStats.throughput / 100, 1) * 100;
    
    return {
      memory: memoryUsage,
      processing: processingLoad,
      overall: (memoryUsage + processingLoad) / 2
    };
  }

  _getCongestionIndicators() {
    return {
      mempoolSize: this.mempool.size,
      maxSize: this.config.maxMempoolSize,
      utilizationPercentage: (this.mempool.size / this.config.maxMempoolSize) * 100,
      averageGasPrice: this.mempoolStats.averageGasPrice.toString(),
      congestionLevel: this.gasAnalytics.congestionLevel,
      stuckTransactions: Array.from(this.mempool.values())
        .filter(tx => tx.state === MEMPOOL_TX_STATES.STUCK).length
    };
  }

  _calculateNetworkHealthScore() {
    const congestionScore = 100 - this.mempoolStats.congestionScore;
    const throughputScore = Math.min(this.mempoolStats.throughput / 50, 1) * 100;
    const errorScore = 100 - this._calculateErrorRate();
    
    return Math.round((congestionScore + throughputScore + errorScore) / 3);
  }

  _generateRecommendedActions() {
    const actions = [];
    const congestionLevel = this.gasAnalytics.congestionLevel;
    const mempoolUtilization = (this.mempool.size / this.config.maxMempoolSize) * 100;
    
    if (congestionLevel === 'critical' || congestionLevel === 'high') {
      actions.push({
        type: 'gas_optimization',
        priority: 'high',
        description: 'Consider increasing gas prices for faster confirmation',
        recommendedGasPrice: this.gasAnalytics.recommendedGasPrice.toString()
      });
    }
    
    if (mempoolUtilization > 80) {
      actions.push({
        type: 'capacity_management',
        priority: 'medium',
        description: 'Mempool nearing capacity, consider filtering transactions'
      });
    }
    
    const stuckCount = Array.from(this.mempool.values())
      .filter(tx => tx.state === MEMPOOL_TX_STATES.STUCK).length;
    
    if (stuckCount > 10) {
      actions.push({
        type: 'stuck_transactions',
        priority: 'medium',
        description: `${stuckCount} transactions stuck in mempool, consider replacement`
      });
    }
    
    const errorRate = this._calculateErrorRate();
    if (errorRate > 5) {
      actions.push({
        type: 'error_investigation',
        priority: 'high',
        description: 'High error rate detected, investigate connection issues'
      });
    }
    
    return actions;
  }

  _formatTransactionForOutput(transaction) {
    return {
      hash: transaction.hash,
      from: transaction.from,
      to: transaction.to,
      value: transaction.value.toString(),
      gasLimit: transaction.gasLimit.toString(),
      gasPrice: transaction.gasPrice.toString(),
      maxFeePerGas: transaction.maxFeePerGas?.toString() || null,
      maxPriorityFeePerGas: transaction.maxPriorityFeePerGas?.toString() || null,
      nonce: transaction.nonce,
      type: transaction.type,
      size: transaction.size,
      priority: transaction.priority,
      state: transaction.state,
      timeInMempool: Date.now() - transaction.firstSeen,
      estimatedConfirmationTime: transaction.estimatedConfirmationTime,
      isContractInteraction: transaction.isContractInteraction,
      mevRisk: transaction.mevRisk,
      securityFlags: transaction.securityFlags,
      firstSeen: transaction.firstSeen,
      lastSeen: transaction.lastSeen
    };
  }

  /**
   * Public management methods
   */

  /**
   * Adds a custom filter
   */
  addFilter(filter) {
    const filterId = `filter_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const filterConfig = {
      id: filterId,
      name: filter.name || 'Custom Filter',
      criteria: filter.criteria,
      enabled: filter.enabled !== false,
      createdAt: Date.now(),
      ...filter
    };
    
    this.filters.set(filterId, filterConfig);
    
    this.logger.info('Custom filter added', {
      filterId,
      name: filterConfig.name
    });
    
    return {
      success: true,
      filterId,
      filter: filterConfig
    };
  }

  /**
   * Removes a filter
   */
  removeFilter(filterId) {
    const removed = this.filters.delete(filterId);
    
    if (removed) {
      this.logger.info('Filter removed', { filterId });
    }
    
    return {
      success: removed,
      message: removed ? 'Filter removed successfully' : 'Filter not found'
    };
  }

  /**
   * Updates filter configuration
   */
  updateFilter(filterId, updates) {
    const filter = this.filters.get(filterId);
    
    if (!filter) {
      return {
        success: false,
        message: 'Filter not found'
      };
    }
    
    const updatedFilter = { ...filter, ...updates, updatedAt: Date.now() };
    this.filters.set(filterId, updatedFilter);
    
    this.logger.info('Filter updated', {
      filterId,
      updates: Object.keys(updates)
    });
    
    return {
      success: true,
      filter: updatedFilter
    };
  }

  /**
   * Gets all filters
   */
  getFilters() {
    return Array.from(this.filters.values());
  }

  /**
   * Updates configuration
   */
  updateConfig(newConfig) {
    const oldConfig = { ...this.config };
    this.config = { ...this.config, ...newConfig };
    
    // Restart intervals if polling interval changed
    if (newConfig.pollingInterval && newConfig.pollingInterval !== oldConfig.pollingInterval) {
      this._restartPolling();
    }
    
    this.logger.info('MempoolMonitor configuration updated', {
      updatedFields: Object.keys(newConfig)
    });
    
    return {
      success: true,
      oldConfig: oldConfig,
      newConfig: this.config
    };
  }

  /**
   * Restarts polling with new interval
   */
  _restartPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }
    
    if (this.isMonitoring) {
      this._startPollingMonitoring();
    }
  }

  /**
   * Forces refresh of all data
   */
  async forceRefresh() {
    this.logger.info('Forcing mempool refresh');
    
    try {
      await this._pollMempoolTransactions();
      this._updateMempoolAnalytics();
      
      return {
        success: true,
        stats: this.getMempoolStats(),
        timestamp: Date.now()
      };
    } catch (error) {
      this.logger.error('Force refresh failed', {
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
   * Clears mempool data
   */
  clearMempool() {
    const clearedCount = this.mempool.size;
    
    this.mempool.clear();
    this.pendingTransactions.clear();
    
    // Reset analytics
    this.mempoolStats = {
      totalTransactions: 0,
      priorityDistribution: {},
      averageGasPrice: BigInt(0),
      averageGasLimit: BigInt(0),
      congestionScore: 0,
      throughput: 0,
      latency: 0
    };
    
    this.logger.info('Mempool cleared', { clearedCount });
    
    this.emit('mempool_cleared', {
      clearedCount,
      timestamp: Date.now()
    });
    
    return {
      success: true,
      clearedCount,
      message: 'Mempool cleared successfully'
    };
  }

  /**
   * Exports mempool data
   */
  exportMempoolData() {
    return {
      metadata: {
        chainId: this.chainId,
        network: this.networkConfig.name,
        exportTime: Date.now(),
        version: '1.0.0'
      },
      
      configuration: this.config,
      
      mempool: Array.from(this.mempool.values()).map(tx => 
        this._formatTransactionForOutput(tx)
      ),
      
      pendingTransactions: Array.from(this.pendingTransactions.entries()).map(([hash, data]) => ({
        hash,
        trackingData: data
      })),
      
      analytics: this.getMempoolAnalytics(),
      
      filters: Array.from(this.filters.values()),
      
      performance: {
        ...this.performanceMetrics,
        throughputHistory: this.performanceMetrics.throughputHistory.slice(-100),
        latencyHistory: this.performanceMetrics.latencyHistory.slice(-100)
      }
    };
  }

  /**
   * Gets detailed statistics
   */
  getDetailedStats() {
    return {
      monitor: 'MempoolMonitor',
      version: '1.0.0',
      chainId: this.chainId,
      network: this.networkConfig.name,
      
      status: {
        isMonitoring: this.isMonitoring,
        websocketConnected: this.websocketConnected,
        lastUpdate: this.performanceMetrics.lastUpdateTime,
        uptime: Date.now() - this.startTime
      },
      
      mempool: this.getMempoolStats(),
      analytics: this.getMempoolAnalytics(),
      
      configuration: {
        maxMempoolSize: this.config.maxMempoolSize,
        retentionTime: this.config.retentionTime,
        pollingInterval: this.config.pollingInterval,
        enableGasAnalysis: this.config.enableGasAnalysis,
        enableMevAnalysis: this.config.enableMevAnalysis,
        enableSecurityChecks: this.config.enableSecurityChecks
      },
      
      filters: {
        total: this.filters.size,
        active: Array.from(this.filters.values()).filter(f => f.enabled).length,
        list: Array.from(this.filters.values())
      },
      
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Graceful shutdown
   */
  async shutdown() {
    this.logger.info('MempoolMonitor shutdown initiated');
    
    // Stop monitoring
    if (this.isMonitoring) {
      await this.stopMonitoring();
    }
    
    // Stop all intervals
    this._stopAllIntervals();
    
    // Close WebSocket
    if (this.websocketConnected) {
      await this._closeWebSocket();
    }
    
    // Shutdown metrics collector
    if (this.metrics) {
      await this.metrics.shutdown();
    }
    
    // Clear data structures
    this.mempool.clear();
    this.pendingTransactions.clear();
    this.filters.clear();
    this.subscriptions.clear();
    
    this.logger.info('MempoolMonitor shutdown completed', {
      uptime: Date.now() - this.startTime,
      transactionsProcessed: this.performanceMetrics.transactionsProcessed
    });
  }
}

/**
 * Factory function to create MempoolMonitor
 */
export function createMempoolMonitor(config) {
  return new MempoolMonitor(config);
}

/**
 * Utility function for quick mempool snapshot
 */
export async function getMempoolSnapshot(chainId, provider, options = {}) {
  const monitor = new MempoolMonitor({
    chainId,
    provider,
    enableRealTimeUpdates: false,
    enableAnalytics: options.enableAnalytics !== false
  });
  
  try {
    await monitor.startMonitoring();
    
    // Wait for initial data collection
    await new Promise(resolve => setTimeout(resolve, options.duration || 10000));
    
    const snapshot = monitor.getMempoolStats();
    await monitor.shutdown();
    
    return snapshot;
  } catch (error) {
    await monitor.shutdown();
    throw error;
  }
}

export default MempoolMonitor;

/**
 * Example usage:
 * 
 * // Basic usage
 * const monitor = new MempoolMonitor({
 *   chainId: 1,
 *   provider: new ethers.JsonRpcProvider(RPC_URL),
 *   websocketProvider: new ethers.WebSocketProvider(WS_URL),
 *   enableGasAnalysis: true,
 *   enableMevAnalysis: true,
 *   enableSecurityChecks: true
 * });
 * 
 * // Start monitoring
 * await monitor.startMonitoring();
 * 
 * // Listen for events
 * monitor.on('monitoring_started', (event) => {
 *   console.log('Monitoring started:', event.network);
 * });
 * 
 * monitor.on('transaction_added', (event) => {
 *   console.log('New transaction:', event.transactionHash);
 * });
 * 
 * monitor.on('filter_matched', (event) => {
 *   console.log('Filter matched:', event.filterName, event.transactionHash);
 * });
 * 
 * monitor.on('mev_detected', (event) => {
 *   console.log('MEV detected:', event.transactionHash, event.mevRisk);
 * });
 * 
 * monitor.on('security_alert', (event) => {
 *   console.log('Security alert:', event.transactionHash, event.flags);
 * });
 * 
 * // Get mempool statistics
 * const stats = monitor.getMempoolStats();
 * console.log('Mempool size:', stats.mempool.totalTransactions);
 * console.log('Average gas price:', stats.gas.averageGasPrice);
 * 
 * // Get detailed analytics
 * const analytics = monitor.getMempoolAnalytics();
 * console.log('Priority distribution:', analytics.transactionAnalysis.priorityDistribution);
 * 
 * // Get filtered transactions
 * const highPriorityTxs = monitor.getTransactions({
 *   priority: 'high',
 *   limit: 50,
 *   sortBy: 'gasPrice',
 *   sortOrder: 'desc'
 * });
 * 
 * // Track specific transaction
 * await monitor.trackTransaction('0x...');
 * 
 * // Add custom filter
 * monitor.addFilter({
 *   name: 'Large Transactions',
 *   criteria: (tx) => tx.value > ethers.parseEther('5'),
 *   enabled: true
 * });
 * 
 * // Quick mempool snapshot
 * const snapshot = await getMempoolSnapshot(1, provider, { duration: 30000 });
 * 
 * // Export data
 * const exportData = monitor.exportMempoolData();
 * 
 * // Stop monitoring
 * await monitor.stopMonitoring();
 * 
 * // Graceful shutdown
 * await monitor.shutdown();
 *//**
 * @fileoverview Production Enterprise-grade Mempool Monitor for Trust Crypto Wallet Extension
 * @version 1.0.0
 * @author Trust Wallet Development Team
 * @license MIT
 * @description PRODUCTION-READY mempool monitoring with real-time analytics and enterprise features
 */

import { EventEmitter } from 'events';
import { ethers } from 'ethers';
import { RPCError, RPC_ERROR_CODES } from '../providers/RPCBroadcastProvider.js';
import { SecurityManager } from '../../security/SecurityManager.js';
import { MetricsCollector } from '../../monitoring/MetricsCollector.js';
import { Logger } from '../../utils/Logger.js';

/**
 * Mempool monitoring error codes
 */
export const MEMPOOL_MONITOR_ERRORS = {
  // Configuration errors
  INVALID_CONFIGURATION: 'MEMPOOL_INVALID_CONFIG',
  PROVIDER_UNAVAILABLE: 'MEMPOOL_PROVIDER_UNAVAILABLE',
  NETWORK_UNSUPPORTED: 'MEMPOOL_NETWORK_UNSUPPORTED',
  INVALID_FILTER_CRITERIA: 'MEMPOOL_INVALID_FILTER',
  
  // Connection errors
  CONNECTION_FAILED: 'MEMPOOL_CONNECTION_FAILED',
  WEBSOCKET_ERROR: 'MEMPOOL_WEBSOCKET_ERROR',
  SUBSCRIPTION_FAILED: 'MEMPOOL_SUBSCRIPTION_FAILED',
  STREAM_INTERRUPTED: 'MEMPOOL_STREAM_INTERRUPTED',
  
  // Monitoring errors
  TRANSACTION_FETCH_ERROR: 'MEMPOOL_TX_FETCH_ERROR',
  GAS_ESTIMATION_ERROR: 'MEMPOOL_GAS_ESTIMATION_ERROR',
  MEMPOOL_ANALYSIS_ERROR: 'MEMPOOL_ANALYSIS_ERROR',
  FILTER_PROCESSING_ERROR: 'MEMPOOL_FILTER_PROCESSING_ERROR',
  
  // Performance errors
  HIGH_LATENCY: 'MEMPOOL_HIGH_LATENCY',
  RATE_LIMITED: 'MEMPOOL_RATE_LIMITED',
  MEMORY_EXHAUSTED: 'MEMPOOL_MEMORY_EXHAUSTED',
  PROCESSING_OVERLOAD: 'MEMPOOL_PROCESSING_OVERLOAD',
  
  // Data integrity errors
  INVALID_TRANSACTION_DATA: 'MEMPOOL_INVALID_TX_DATA',
  CORRUPTED_MEMPOOL_STATE: 'MEMPOOL_CORRUPTED_STATE',
  SYNC_ERROR: 'MEMPOOL_SYNC_ERROR'
};

/**
 * Transaction priority levels
 */
export const TRANSACTION_PRIORITY = {
  ULTRA_HIGH: 'ultra_high',     // >200 Gwei or top 1%
  HIGH: 'high',                 // >100 Gwei or top 5%
  MEDIUM: 'medium',             // >50 Gwei or top 20%
  LOW: 'low',                   // >20 Gwei or top 50%
  VERY_LOW: 'very_low'          // Bottom 50%
};

/**
 * Mempool transaction states
 */
export const MEMPOOL_TX_STATES = {
  PENDING: 'pending',           // In mempool, waiting for mining
  REPLACED: 'replaced',         // Replaced by higher gas transaction
  DROPPED: 'dropped',           // Removed from mempool
  CONFIRMED: 'confirmed',       // Mined in block
  FAILED: 'failed',             // Transaction failed
  STUCK: 'stuck'                // Been in mempool too long
};

/**
 * Network-specific mempool configurations
 */
export const MEMPOOL_NETWORK_CONFIGS = {
  1: { // Ethereum Mainnet
    name: 'ethereum',
    chainId: 1,
    avgBlockTime: 12000,              // 12 seconds
    mempoolRetentionTime: 1800000,    // 30 minutes
    maxMempoolSize: 50000,            // Max tracked transactions
    gasAnalysisDepth: 1000,           // Analyze last 1000 transactions
    priorityThresholds: {
      ultraHigh: ethers.parseUnits('200', 'gwei'),
      high: ethers.parseUnits('100', 'gwei'),
      medium: ethers.parseUnits('50', 'gwei'),
      low: ethers.parseUnits('20', 'gwei')
    },
    stuckThreshold: 600000,           // 10 minutes
    pollingInterval: 5000,            // 5 seconds
    websocketEnabled: true,
    mevAnalysisEnabled: true,
    congestionThresholds: {
      low: 10000,
      medium: 25000,
      high: 40000,
      critical: 50000
    }
  },
  56: { // BSC
    name: 'bsc',
    chainId: 56,
    avgBlockTime: 3000,               // 3 seconds
    mempoolRetentionTime: 300000,     // 5 minutes
    maxMempoolSize: 20000,
    gasAnalysisDepth: 500,
    priorityThresholds: {
      ultraHigh: ethers.parseUnits('20', 'gwei'),
      high: ethers.parseUnits('10', 'gwei'),
      medium: ethers.parseUnits('5', 'gwei'),
      low: ethers.parseUnits('3', 'gwei')
    },
    stuckThreshold: 180000,           // 3 minutes
    pollingInterval: 2000,            // 2 seconds
    websocketEnabled: true,
    mevAnalysisEnabled: false,
    congestionThresholds: {
      low: 5000,
      medium: 12000,
      high: 18000,
      critical: 20000
    }
  },
  137: { // Polygon
    name: 'polygon',
    chainId: 137,
    avgBlockTime: 2000,               // 2 seconds
    mempoolRetentionTime: 240000,     // 4 minutes
    maxMempoolSize: 15000,
    gasAnalysisDepth: 400,
    priorityThresholds: {
      ultraHigh: ethers.parseUnits('100', 'gwei'),
      high: ethers.parseUnits('50', 'gwei'),
      medium: ethers.parseUnits('30', 'gwei'),
      low: ethers.parseUnits('20', 'gwei')
    },
    stuckThreshold: 120000,           // 2 minutes
    pollingInterval: 1500,            // 1.5 seconds
    websocketEnabled: true,
    mevAnalysisEnabled: false,
    congestionThresholds: {
      low: 3000,
      medium: 8000,
      high: 12000,
      critical: 15000
    }
  },
  42161: { // Arbitrum
    name: 'arbitrum',
    chainId: 42161,
    avgBlockTime: 1000,               // 1 second
    mempoolRetentionTime: 120000,     // 2 minutes
    maxMempoolSize: 10000,
    gasAnalysisDepth: 200,
    priorityThresholds: {
      ultraHigh: ethers.parseUnits('2', 'gwei'),
      high: ethers.parseUnits('1', 'gwei'),
      medium: ethers.parseUnits('0.5', 'gwei'),
      low: ethers.parseUnits('0.1', 'gwei')
    },
    stuckThreshold: 60000,            // 1 minute
    pollingInterval: 1000,            // 1 second
    websocketEnabled: false,          // Limited WebSocket support
    mevAnalysisEnabled: false,
    congestionThresholds: {
      low: 2000,
      medium: 5000,
      high: 8000,
      critical: 10000
    }
  },
  10: { // Optimism
    name: 'optimism',
    chainId: 10,
    avgBlockTime: 2000,               // 2 seconds
    mempoolRetentionTime: 120000,     // 2 minutes
    maxMempoolSize: 8000,
    gasAnalysisDepth: 200,
    priorityThresholds: {
      ultraHigh: ethers.parseUnits('0.01', 'gwei'),
      high: ethers.parseUnits('0.005', 'gwei'),
      medium: ethers.parseUnits('0.002', 'gwei'),
      low: ethers.parseUnits('0.001', 'gwei')
    },
    stuckThreshold: 60000,            // 1 minute
    pollingInterval: 1000,            // 1 second
    websocketEnabled: false,
    mevAnalysisEnabled: false,
    congestionThresholds: {
      low: 2000,
      medium: 4000,
      high: 6000,
      critical: 8000
    }
  }
};

/**
 * PRODUCTION Enterprise-grade Mempool Monitor
 * @class MempoolMonitor
 * @extends EventEmitter
 */
export class MempoolMonitor extends EventEmitter {
  constructor({
    chainId,
    provider,
    websocketProvider = null,
    enableRealTimeUpdates = true,
    enableGasAnalysis = true,
    enableMevAnalysis = true,
    enableSecurityChecks = true,
    customFilters = [],
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
    this.websocketProvider = websocketProvider;
    this.networkConfig = MEMPOOL_NETWORK_CONFIGS[chainId];
    
    if (!this.networkConfig) {
      throw new Error(`Unsupported chain ID: ${chainId}`);
    }

    // Initialize components
    this.logger = new Logger('MempoolMonitor');
    this.securityManager = new SecurityManager({
      enableMempoolAnalysis: enableSecurityChecks,
      enableMevDetection: enableMevAnalysis && this.networkConfig.mevAnalysisEnabled,
      enableGasAnalysis: enableGasAnalysis,
      ...security
    });
    
    this.metrics = new MetricsCollector({
      component: 'mempool_monitor',
      labels: { chainId: this.chainId, network: this.networkConfig.name },
      ...monitoring
    });

    // Configuration
    this.config = {
      enableRealTimeUpdates,
      enableGasAnalysis,
      enableMevAnalysis: enableMevAnalysis && this.networkConfig.mevAnalysisEnabled,
      enableSecurityChecks,
      
      // Mempool settings
      maxMempoolSize: this.networkConfig.maxMempoolSize,
      retentionTime: this.networkConfig.mempoolRetentionTime,
      stuckThreshold: this.networkConfig.stuckThreshold,
      
      // Monitoring settings
      pollingInterval: this.networkConfig.pollingInterval,
      gasAnalysisDepth: this.networkConfig.gasAnalysisDepth,
      websocketEnabled: this.networkConfig.websocketEnabled && websocketProvider !== null,
      
      // Analysis settings
      priorityAnalysisEnabled: true,
      congestionAnalysisEnabled: true,
      replacementAnalysisEnabled: true,
      
      // Performance settings
      batchSize: 100,
      maxConcurrentRequests: 10,
      retryAttempts: 3,
      retryDelay: 2000,
      
      // Cleanup settings
      cleanupInterval: 60000,          // 1 minute
      performanceMonitoringInterval: 30000, // 30 seconds
      
      // Alert thresholds
      highLatencyThreshold: 10000,     // 10 seconds
      lowThroughputThreshold: 10,      // transactions per second
      errorRateThreshold: 5            // 5% error rate
    };

    // Data structures
    this.mempool = new Map();            // txHash -> MempoolTransaction
    this.pendingTransactions = new Map(); // txHash -> PendingTransaction
    this.gasAnalytics = {
      currentBaseFee: BigInt(0),
      priorityFeeHistory: [],
      gasUsageDistribution: {},
      congestionLevel: 'low',
      recommendedGasPrice: BigInt(0)
    };

    // Real-time tracking
    this.mempoolStats = {
      totalTransactions: 0,
      priorityDistribution: {},
      averageGasPrice: BigInt(0),
      averageGasLimit: BigInt(0),
      congestionScore: 0,
      throughput: 0,
      latency: 0
    };

    // MEV and security tracking
    this.mevAnalytics = {
      detectedMevTransactions: 0,
      frontRunningAttempts: 0,
      sandwichAttacks: 0,
      arbitrageOpportunities: 0,
      suspiciousPatterns: []
    };

    // Performance and monitoring
    this.performanceMetrics = {
      transactionsProcessed: 0,
      averageProcessingTime: 0,
      errorCount: 0,
      lastUpdateTime: 0,
      throughputHistory: [],
      latencyHistory: []
    };

    // Filters and subscriptions
    this.filters = new Map();           // filterId -> FilterConfig
    this.subscriptions = new Map();     // subscriptionId -> SubscriptionConfig
    this.customFilters = customFilters;

    // WebSocket management
    this.websocketConnected = false;
    this.websocketReconnectAttempts = 0;
    this.maxWebsocketReconnectAttempts = 5;

    // State management
    this.isMonitoring = false;
    this.startTime = Date.now();
    this.lastCleanup = Date.now();

    // Initialize filters
    this._initializeFilters(customFilters);

    // Start services
    this._initializeServices();

    this.logger.info('Production MempoolMonitor initialized', {
      chainId: this.chainId,
      network: this.networkConfig.name,
      websocketEnabled: this.config.websocketEnabled,
      maxMempoolSize: this.config.maxMempoolSize,
      enableGasAnalysis: this.config.enableGasAnalysis,
      enableMevAnalysis: this.config.enableMevAnalysis
    });
  }

  /**
   * Starts mempool monitoring
   */
  async startMonitoring() {
    if (this.isMonitoring) {
      this.logger.warn('Mempool monitoring already started');
      return { success: false, message: 'Already monitoring' };
    }

    try {
      this.logger.info('Starting mempool monitoring');

      // Initialize WebSocket connection if enabled
      if (this.config.websocketEnabled) {
        await this._initializeWebSocket();
      }

      // Start polling-based monitoring
      this._startPollingMonitoring();

      // Start performance monitoring
      this._startPerformanceMonitoring();

      // Start cleanup service
      this._startCleanupService();

      this.isMonitoring = true;

      this.emit('monitoring_started', {
        chainId: this.chainId,
        network: this.networkConfig.name,
        websocketEnabled: this.websocketConnected,
        timestamp: Date.now()
      });

      this.logger.info('Mempool monitoring started successfully', {
        websocketEnabled: this.websocketConnected,
        pollingInterval: this.config.pollingInterval
      });

      return {
        success: true,
        websocketEnabled: this.websocketConnected,
        pollingInterval: this.config.pollingInterval,
        message: 'Mempool monitoring started successfully'
      };

    } catch (error) {
      this.logger.error('Failed to start mempool monitoring', {
        error: error.message,
        stack: error.stack
      });

      throw new RPCError(
        `Failed to start mempool monitoring: ${error.message}`,
        MEMPOOL_MONITOR_ERRORS.CONNECTION_FAILED,
        { originalError: error }
      );
    }
  }

  /**
   * Stops mempool monitoring
   */
  async stopMonitoring() {
    if (!this.isMonitoring) {
      this.logger.warn('Mempool monitoring not started');
      return { success: false, message: 'Not monitoring' };
    }

    try {
      this.logger.info('Stopping mempool monitoring');

      this.isMonitoring = false;

      // Stop all intervals
      this._stopAllIntervals();

      // Close WebSocket connection
      if (this.websocketProvider && this.websocketConnected) {
        await this._closeWebSocket();
      }

      // Clear subscriptions
      this._clearAllSubscriptions();

      this.emit('monitoring_stopped', {
        chainId: this.chainId,
        network: this.networkConfig.name,
        timestamp: Date.now(),
        stats: this.getMempoolStats()
      });

      this.logger.info('Mempool monitoring stopped successfully');

      return {
        success: true,
        finalStats: this.getMempoolStats(),
        message: 'Mempool monitoring stopped successfully'
      };

    } catch (error) {
      this.logger.error('Failed to stop mempool monitoring', {
        error: error.message
      });

      throw new RPCError(
        `Failed to stop mempool monitoring: ${error.message}`,
        MEMPOOL_MONITOR_ERRORS.CONNECTION_FAILED,
        { originalError: error }
      );
    }
  }

  /**
   * Gets current mempool statistics
   */
  getMempoolStats() {
    const now = Date.now();
    
    return {
      network: {
        chainId: this.chainId,
        name: this.networkConfig.name,
        blockTime: this.networkConfig.avgBlockTime
      },
      
      mempool: {
        totalTransactions: this.mempool.size,
        pendingTransactions: this.pendingTransactions.size,
        retentionTime: this.config.retentionTime,
        maxSize: this.config.maxMempoolSize,
        utilizationPercentage: (this.mempool.size / this.config.maxMempoolSize) * 100
      },
      
      priority: this._calculatePriorityDistribution(),
      
      gas: this.config.enableGasAnalysis ? {
        currentBaseFee: this.gasAnalytics.currentBaseFee.toString(),
        averageGasPrice: this.mempoolStats.averageGasPrice.toString(),
        averageGasLimit: this.mempoolStats.averageGasLimit.toString(),
        recommendedGasPrice: this.gasAnalytics.recommendedGasPrice.toString(),
        congestionLevel: this.gasAnalytics.congestionLevel,
        congestionScore: this.mempoolStats.congestionScore
      } : null,
      
      mev: this.config.enableMevAnalysis ? {
        detectedMevTransactions: this.mevAnalytics.detectedMevTransactions,
        frontRunningAttempts: this.mevAnalytics.frontRunningAttempts,
        sandwichAttacks: this.mevAnalytics.sandwichAttacks,
        arbitrageOpportunities: this.mevAnalytics.arbitrageOpportunities,
        suspiciousPatternsCount: this.mevAnalytics.suspiciousPatterns.length
      } : null,
      
      performance: {
        transactionsProcessed: this.performanceMetrics.transactionsProcessed,
        averageProcessingTime: this.performanceMetrics.averageProcessingTime,
        throughput: this.mempoolStats.throughput,
        latency: this.mempoolStats.latency,
        errorCount: this.performanceMetrics.errorCount,
        errorRate: this._calculateErrorRate(),
        lastUpdateTime: this.performanceMetrics.lastUpdateTime,
        uptime: now - this.startTime
      },
      
      connection: {
        websocketEnabled: this.config.websocketEnabled,
        websocketConnected: this.websocketConnected,
        pollingInterval: this.config.pollingInterval,
        isMonitoring: this.isMonitoring
      },
      
      filters: {
        activeFilters: this.filters.size,
        activeSubscriptions: this.subscriptions.size
      },
      
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Gets detailed mempool analytics
   */
  getMempoolAnalytics() {
    return {
      overview: this.getMempoolStats(),
      
      gasAnalytics: this.config.enableGasAnalysis ? {
        ...this.gasAnalytics,
        priorityFeeHistory: this.gasAnalytics.priorityFeeHistory.slice(-100),
        gasUsageDistribution: this.gasAnalytics.gasUsageDistribution,
        gasPriceTrend: this._calculateGasPriceTrend(),
        congestionTrend: this._calculateCongestionTrend()
      } : null,
      
      mevAnalytics: this.config.enableMevAnalysis ? {
        ...this.mevAnalytics,
        suspiciousPatterns: this.mevAnalytics.suspiciousPatterns.slice(-20),
        mevScore: this._calculateMevScore(),
        riskLevel: this._calculateMevRiskLevel()
      } : null,
      
      transactionAnalysis: {
        priorityDistribution: this._calculatePriorityDistribution(),
        sizeDistribution: this._calculateSizeDistribution(),
        valueDistribution: this._calculateValueDistribution(),
        contractInteractionRatio: this._calculateContractInteractionRatio(),
        averageTimeInMempool: this._calculateAverageTimeInMempool()
      },
      
      performanceAnalytics: {
        throughputHistory: this.performanceMetrics.throughputHistory.slice(-100),
        latencyHistory: this.performanceMetrics.latencyHistory.slice(-100),
        processingEfficiency: this._calculateProcessingEfficiency(),
        resourceUtilization: this._calculateResourceUtilization()
      },
      
      networkHealth: {
        congestionIndicators: this._getCongestionIndicators(),
        healthScore: this._calculateNetworkHealthScore(),
        recommendedActions: this._generateRecommendedActions()
      },
      
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Gets specific transactions from mempool with filtering
   */
  getTransactions(options = {}) {
    const {
      limit = 100,
      offset = 0,
      sortBy = 'gasPrice',
      sortOrder = 'desc',
      priority = null,
      minValue = null,
      maxValue = null,
      address = null,
      contractInteraction = null
    } = options;

    let transactions = Array.from(this.mempool.values());

    // Apply filters
    if (priority) {
      transactions = transactions.filter(tx => tx.priority === priority);
    }

    if (minValue !== null) {
      const minValueBigInt = BigInt(minValue);
      transactions = transactions.filter(tx => tx.value >= minValueBigInt);
    }

    if (maxValue !== null) {
      const maxValueBigInt = BigInt(maxValue);
      transactions = transactions.filter(tx => tx.value <= maxValueBigInt);
    }

    if (address) {
      transactions = transactions.filter(tx => 
        tx.from.toLowerCase() === address.toLowerCase() ||
        tx.to?.toLowerCase() === address.toLowerCase()
      );
    }

    if (contractInteraction !== null) {
      transactions = transactions.filter(tx => 
        contractInteraction ? (tx.to && tx.data && tx.data !== '0x') : 
        (!tx.to || !tx.data || tx.data === '0x')
      );
    }

    // Sort transactions
    transactions.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'gasPrice':
          aValue = a.gasPrice;
          bValue = b.gasPrice;
          break;
        case 'value':
          aValue = a.value;
          bValue = b.value;
          break;
        case 'timestamp':
          aValue = a.firstSeen;
          bValue = b.firstSeen;
          break;
        case 'gasLimit':
          aValue = a.gasLimit;
          bValue = b.gasLimit;
          break;
        default:
          aValue = a.gasPrice;
          bValue = b.gasPrice;
      }

      if (sortOrder === 'desc') {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      } else {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      }
    });

    // Apply pagination
    const paginatedTransactions = transactions.slice(offset, offset + limit);

    return {
      transactions: paginatedTransactions.map(tx => this._formatTransactionForOutput(tx)),
      total: transactions.length,
      limit,
      offset,
      hasMore: offset + limit < transactions.length
    };
  }

  /**
   * Tracks a specific transaction in the mempool
   */
  async trackTransaction(transactionHash) {
    try {
      if (!this._isValidTransactionHash(transactionHash)) {
        throw new RPCError(
          'Invalid transaction hash format',
          MEMPOOL_MONITOR_ERRORS.INVALID_TRANSACTION_DATA,
          { transactionHash }
        );
      }

      // Check if already tracking
      if (this.pendingTransactions.has(transactionHash)) {
        return {
          success: true,
          alreadyTracking: true,
          transaction: this.pendingTransactions.get(transactionHash)
        };
      }

      // Get transaction from provider
      const transaction = await this.provider.getTransaction(transactionHash);
      
      if (!transaction) {
        throw new RPCError(
          'Transaction not found',
          MEMPOOL_MONITOR_ERRORS.TRANSACTION_FETCH_ERROR,
          { transactionHash }
        );
      }

      // Create tracking entry
      const trackingData = {
        hash: transactionHash,
        trackingStarted: Date.now(),
        initialState: transaction.blockNumber ? 'confirmed' : 'pending',
        lastSeen: Date.now(),
        updates: [],
        transaction: this._processTransaction(transaction)
      };

      this.pendingTransactions.set(transactionHash, trackingData);

      // Add to mempool if still pending
      if (!transaction.blockNumber) {
        await this._addTransactionToMempool(transaction);
      }

      this.emit('transaction_tracking_started', {
        transactionHash,
        initialState: trackingData.initialState,
        timestamp: Date.now()
      });

      this.logger.info('Transaction tracking started', {
        transactionHash,
        initialState: trackingData.initialState
      });

      return {
        success: true,
        alreadyTracking: false,
        transaction: trackingData
      };

    } catch (error) {
      this.logger.error('Failed to track transaction', {
        transactionHash,
        error: error.message
      });

      throw new RPCError(
        `Failed to track transaction: ${error.message}`,
        error.code || MEMPOOL_MONITOR_ERRORS.TRANSACTION_FETCH_ERROR,
        { transactionHash, originalError: error }
      );
    }
  }

  /**
   * Internal methods
   */

  /**
   * Initializes services and monitoring
   */
  _initializeServices() {
    // Pre-populate some network data
    this._initializeNetworkData();
  }

  /**
   * Initializes network-specific data
   */
  async _initializeNetworkData() {
    try {
      // Get current base fee for EIP-1559 networks
      if (this.chainId === 1 || this.chainId === 137) {
        const feeData = await this.provider.getFeeData();
        if (feeData.gasPrice) {
          this.gasAnalytics.currentBaseFee = feeData.gasPrice;
          this.gasAnalytics.recommendedGasPrice = feeData.gasPrice;
        }
      }
    } catch (error) {
      this.logger.warn('Failed to initialize network data', {
        error: error.message
      });
    }
  }

  /**
   * Initializes custom filters
   */
  _initializeFilters(customFilters) {
    // Add default priority filter
    this.filters.set('priority_high', {
      id: 'priority_high',
      name: 'High Priority Transactions',
      criteria: (tx) => tx.priority === TRANSACTION_PRIORITY.HIGH || tx.priority === TRANSACTION_PRIORITY.ULTRA_HIGH,
      enabled: true,
      createdAt: Date.now()
    });

    // Add default value filter for large transactions
    this.filters.set('large_value', {
      id: 'large_value',
      name: 'Large Value Transactions',
      criteria: (tx) => tx.value > ethers.parseEther('10'), // > 10 ETH
      enabled: true,
      createdAt: Date.now()
    });

    // Add MEV filter if enabled
    if (this.config.enableMevAnalysis) {
      this.filters.set('potential_mev', {
        id: 'potential_mev',
        name: 'Potential MEV Transactions',
        criteria: (tx) => tx.mevRisk > 0.7,
        enabled: true,
        createdAt: Date.now()
      });
    }

    // Add custom filters
    customFilters.forEach((filter, index) => {
      const filterId = `custom_${index}`;
      this.filters.set(filterId, {
        ...filter,
        id: filterId,
        createdAt: Date.now()
      });
    });

    this.logger.info('Filters initialized', {
      totalFilters: this.filters.size,
      customFilters: customFilters.length
    });
  }

  /**
   * Initializes WebSocket connection
   */
  async _initializeWebSocket() {
    if (!this.websocketProvider || !this.config.websocketEnabled) {
      return false;
    }

    try {
      this.logger.info('Initializing WebSocket connection');

      // Subscribe to pending transactions
      await this.websocketProvider.on('pending', (txHash) => {
        this._handleWebSocketTransaction(txHash);
      });

      this.websocketConnected = true;
      this.websocketReconnectAttempts = 0;

      this.logger.info('WebSocket connection established');

      // Set up reconnection handling
      this.websocketProvider.on('error', (error) => {
        this._handleWebSocketError(error);
      });

      this.websocketProvider.on('close', () => {
        this._handleWebSocketClose();
      });

      return true;

    }
