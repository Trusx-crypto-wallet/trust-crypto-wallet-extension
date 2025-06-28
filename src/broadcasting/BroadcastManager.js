/**
 * BroadcastMonitor.js
 * 
 * Monitors the status of pending broadcasts and manages their lifecycle.
 * Tracks transaction confirmations, handles timeouts, and coordinates with
 * Queue and RetryManager for comprehensive broadcast management.
 */

import EventEmitter from 'events';

export class BroadcastMonitor extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.config = {
      // Monitor configuration
      checkInterval: options.checkInterval || 5000, // 5 seconds
      maxConfirmations: options.maxConfirmations || 12,
      confirmationTimeout: options.confirmationTimeout || 300000, // 5 minutes
      batchSize: options.batchSize || 50,
      maxRetries: options.maxRetries || 3,
      
      // Network-specific settings
      networks: {
        ethereum: { confirmations: 12, timeout: 300000 },
        polygon: { confirmations: 20, timeout: 120000 },
        bsc: { confirmations: 15, timeout: 180000 },
        arbitrum: { confirmations: 1, timeout: 60000 },
        optimism: { confirmations: 1, timeout: 60000 },
        avalanche: { confirmations: 10, timeout: 150000 },
        ...options.networks
      },
      
      ...options
    };
    
    // Core components
    this.queue = null;
    this.retryManager = null;
    this.provider = null;
    
    // Monitoring state
    this.pendingBroadcasts = new Map();
    this.monitoringTimer = null;
    this.isMonitoring = false;
    this.stats = {
      totalMonitored: 0,
      completed: 0,
      failed: 0,
      timedOut: 0,
      removed: 0
    };
    
    // Bind methods
    this.monitor = this.monitor.bind(this);
    this.checkBroadcastStatus = this.checkBroadcastStatus.bind(this);
  }
  
  /**
   * Initialize the monitor with required components
   */
  initialize(queue, retryManager, provider) {
    this.queue = queue;
    this.retryManager = retryManager;
    this.provider = provider;
    
    // Listen to queue events
    this.setupQueueListeners();
    
    console.log('BroadcastMonitor initialized');
    this.emit('initialized');
    
    return this;
  }
  
  /**
   * Setup listeners for queue events
   */
  setupQueueListeners() {
    if (!this.queue) return;
    
    this.queue.on('broadcast:sent', (broadcast) => {
      this.addBroadcast(broadcast);
    });
    
    this.queue.on('broadcast:failed', (broadcast) => {
      this.removeBroadcast(broadcast.id, 'failed');
    });
    
    this.queue.on('broadcast:retry', (broadcast) => {
      // Update broadcast info for retry
      if (this.pendingBroadcasts.has(broadcast.id)) {
        const existing = this.pendingBroadcasts.get(broadcast.id);
        existing.retryCount = broadcast.retryCount;
        existing.lastRetry = Date.now();
      }
    });
  }
  
  /**
   * Start monitoring broadcasts
   */
  start() {
    if (this.isMonitoring) {
      console.warn('BroadcastMonitor is already running');
      return;
    }
    
    this.isMonitoring = true;
    this.monitoringTimer = setInterval(this.monitor, this.config.checkInterval);
    
    console.log(`BroadcastMonitor started (interval: ${this.config.checkInterval}ms)`);
    this.emit('started');
  }
  
  /**
   * Stop monitoring broadcasts
   */
  stop() {
    if (!this.isMonitoring) {
      console.warn('BroadcastMonitor is not running');
      return;
    }
    
    this.isMonitoring = false;
    
    if (this.monitoringTimer) {
      clearInterval(this.monitoringTimer);
      this.monitoringTimer = null;
    }
    
    console.log('BroadcastMonitor stopped');
    this.emit('stopped');
  }
  
  /**
   * Add a broadcast to monitoring
   */
  addBroadcast(broadcast) {
    if (!broadcast || !broadcast.id || !broadcast.txHash) {
      console.error('Invalid broadcast data for monitoring:', broadcast);
      return false;
    }
    
    const networkConfig = this.config.networks[broadcast.network] || {
      confirmations: this.config.maxConfirmations,
      timeout: this.config.confirmationTimeout
    };
    
    const monitorData = {
      id: broadcast.id,
      txHash: broadcast.txHash,
      network: broadcast.network,
      type: broadcast.type,
      timestamp: broadcast.timestamp || Date.now(),
      startTime: Date.now(),
      confirmations: 0,
      requiredConfirmations: networkConfig.confirmations,
      timeout: networkConfig.timeout,
      retryCount: broadcast.retryCount || 0,
      maxRetries: this.config.maxRetries,
      status: 'pending',
      lastCheck: 0,
      originalBroadcast: broadcast
    };
    
    this.pendingBroadcasts.set(broadcast.id, monitorData);
    this.stats.totalMonitored++;
    
    console.log(`Added broadcast ${broadcast.id} to monitoring (${this.pendingBroadcasts.size} pending)`);
    this.emit('broadcast:added', monitorData);
    
    return true;
  }
  
  /**
   * Remove a broadcast from monitoring
   */
  removeBroadcast(broadcastId, reason = 'completed') {
    const broadcast = this.pendingBroadcasts.get(broadcastId);
    if (!broadcast) {
      return false;
    }
    
    this.pendingBroadcasts.delete(broadcastId);
    this.stats.removed++;
    
    // Update stats based on reason
    if (reason === 'completed') {
      this.stats.completed++;
    } else if (reason === 'failed') {
      this.stats.failed++;
    } else if (reason === 'timeout') {
      this.stats.timedOut++;
    }
    
    console.log(`Removed broadcast ${broadcastId} from monitoring (reason: ${reason})`);
    this.emit('broadcast:removed', { broadcast, reason });
    
    return true;
  }
  
  /**
   * Main monitoring loop
   */
  async monitor() {
    if (this.pendingBroadcasts.size === 0) {
      return;
    }
    
    console.log(`Monitoring ${this.pendingBroadcasts.size} pending broadcasts`);
    
    // Process broadcasts in batches
    const broadcasts = Array.from(this.pendingBroadcasts.values());
    const batches = this.createBatches(broadcasts, this.config.batchSize);
    
    for (const batch of batches) {
      await this.processBatch(batch);
      
      // Small delay between batches to avoid overwhelming the provider
      if (batches.length > 1) {
        await this.delay(100);
      }
    }
  }
  
  /**
   * Process a batch of broadcasts
   */
  async processBatch(broadcasts) {
    const promises = broadcasts.map(broadcast => 
      this.checkBroadcastStatus(broadcast).catch(error => {
        console.error(`Error checking broadcast ${broadcast.id}:`, error);
        return null;
      })
    );
    
    await Promise.allSettled(promises);
  }
  
  /**
   * Check the status of a specific broadcast
   */
  async checkBroadcastStatus(broadcast) {
    if (!this.provider) {
      console.error('No provider available for status check');
      return;
    }
    
    const now = Date.now();
    broadcast.lastCheck = now;
    
    try {
      // Check for timeout
      if (now - broadcast.startTime > broadcast.timeout) {
        await this.handleTimeout(broadcast);
        return;
      }
      
      // Get transaction receipt
      const receipt = await this.provider.getTransactionReceipt(broadcast.txHash);
      
      if (!receipt) {
        // Transaction not yet mined
        this.emit('broadcast:pending', broadcast);
        return;
      }
      
      // Check if transaction failed
      if (receipt.status === 0) {
        await this.handleFailed(broadcast, 'Transaction failed on-chain');
        return;
      }
      
      // Update confirmation count
      const currentBlock = await this.provider.getBlockNumber();
      broadcast.confirmations = Math.max(0, currentBlock - receipt.blockNumber + 1);
      
      // Check if fully confirmed
      if (broadcast.confirmations >= broadcast.requiredConfirmations) {
        await this.handleCompleted(broadcast, receipt);
      } else {
        this.emit('broadcast:confirming', { 
          broadcast, 
          confirmations: broadcast.confirmations,
          required: broadcast.requiredConfirmations 
        });
      }
      
    } catch (error) {
      console.error(`Error checking broadcast ${broadcast.id}:`, error);
      
      // Handle provider errors
      if (error.code === 'NETWORK_ERROR' || error.code === 'TIMEOUT') {
        // Don't fail the broadcast for network issues, just skip this check
        return;
      }
      
      // For other errors, consider retrying or failing
      await this.handleError(broadcast, error);
    }
  }
  
  /**
   * Handle completed broadcast
   */
  async handleCompleted(broadcast, receipt) {
    broadcast.status = 'completed';
    broadcast.receipt = receipt;
    broadcast.completedAt = Date.now();
    
    // Notify queue of completion
    if (this.queue) {
      this.queue.emit('broadcast:confirmed', {
        ...broadcast.originalBroadcast,
        receipt,
        confirmations: broadcast.confirmations
      });
    }
    
    this.removeBroadcast(broadcast.id, 'completed');
    this.emit('broadcast:completed', { broadcast, receipt });
  }
  
  /**
   * Handle failed broadcast
   */
  async handleFailed(broadcast, reason) {
    broadcast.status = 'failed';
    broadcast.failureReason = reason;
    broadcast.failedAt = Date.now();
    
    // Check if we should retry
    if (broadcast.retryCount < broadcast.maxRetries && this.retryManager) {
      console.log(`Scheduling retry for failed broadcast ${broadcast.id} (attempt ${broadcast.retryCount + 1})`);
      
      await this.retryManager.scheduleRetry(broadcast.originalBroadcast, reason);
      this.removeBroadcast(broadcast.id, 'retry_scheduled');
    } else {
      // No more retries, mark as permanently failed
      if (this.queue) {
        this.queue.emit('broadcast:permanently_failed', {
          ...broadcast.originalBroadcast,
          reason,
          retryCount: broadcast.retryCount
        });
      }
      
      this.removeBroadcast(broadcast.id, 'failed');
    }
    
    this.emit('broadcast:failed', { broadcast, reason });
  }
  
  /**
   * Handle broadcast timeout
   */
  async handleTimeout(broadcast) {
    const reason = `Confirmation timeout (${broadcast.timeout}ms)`;
    console.warn(`Broadcast ${broadcast.id} timed out after ${broadcast.timeout}ms`);
    
    // Treat timeout as a failure that can be retried
    await this.handleFailed(broadcast, reason);
  }
  
  /**
   * Handle monitoring errors
   */
  async handleError(broadcast, error) {
    console.error(`Error monitoring broadcast ${broadcast.id}:`, error);
    
    // For persistent errors, consider the broadcast failed
    if (error.code === 'CALL_EXCEPTION' || error.message.includes('reverted')) {
      await this.handleFailed(broadcast, `Monitoring error: ${error.message}`);
    }
    
    this.emit('broadcast:error', { broadcast, error });
  }
  
  /**
   * Get monitoring statistics
   */
  getStats() {
    return {
      ...this.stats,
      pending: this.pendingBroadcasts.size,
      isMonitoring: this.isMonitoring
    };
  }
  
  /**
   * Get all pending broadcasts
   */
  getPendingBroadcasts() {
    return Array.from(this.pendingBroadcasts.values());
  }
  
  /**
   * Get specific broadcast status
   */
  getBroadcastStatus(broadcastId) {
    return this.pendingBroadcasts.get(broadcastId) || null;
  }
  
  /**
   * Update network configuration
   */
  updateNetworkConfig(network, config) {
    this.config.networks[network] = {
      ...this.config.networks[network],
      ...config
    };
    
    console.log(`Updated network config for ${network}:`, this.config.networks[network]);
  }
  
  /**
   * Clear all monitoring data
   */
  clear() {
    const count = this.pendingBroadcasts.size;
    this.pendingBroadcasts.clear();
    
    console.log(`Cleared ${count} pending broadcasts from monitor`);
    this.emit('cleared', { count });
  }
  
  /**
   * Graceful shutdown
   */
  async shutdown() {
    console.log('Shutting down BroadcastMonitor...');
    
    this.stop();
    
    // Give any pending operations a chance to complete
    await this.delay(1000);
    
    this.clear();
    this.removeAllListeners();
    
    console.log('BroadcastMonitor shutdown complete');
  }
  
  // Utility methods
  
  /**
   * Create batches from array
   */
  createBatches(array, batchSize) {
    const batches = [];
    for (let i = 0; i < array.length; i += batchSize) {
      batches.push(array.slice(i, i + batchSize));
    }
    return batches;
  }
  
  /**
   * Delay utility
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default BroadcastMonitor;
