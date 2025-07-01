// Basic validation
    if (!transactionRequest || typeof transactionRequest !== 'object') {
      throw new RPCError(
        'Invalid transaction request',
        PARALLEL_BROADCAST_ERRORS.INVALID_CONFIGURATION
      );
    }

    // Check provider availability
    const healthyProviders = this._getHealthyProviders();
    if (healthyProviders.length === 0) {
      throw new RPCError(
        'No healthy providers available',
        PARALLEL_BROADCAST_ERRORS.NO_PROVIDERS_AVAILABLE
      );
    }

    // Check minimum provider requirement
    const minRequired = this.config.minSuccessfulProviders;
    if (healthyProviders.length < minRequired) {
      throw new RPCError(
        `Insufficient providers: need ${minRequired}, have ${healthyProviders.length}`,
        PARALLEL_BROADCAST_ERRORS.INSUFFICIENT_PROVIDERS
      );
    }

    // Security validation if enabled
    if (this.config.enableSecurityChecks) {
      await this._performSecurityValidation(transactionRequest);
    }
  }

  /**
   * Executes the parallel broadcast
   */
  async _executeParallelBroadcast(broadcastData) {
    const { selectedProviders, transactionRequest, broadcastTimeout } = broadcastData;

    this.logger.debug('Executing parallel broadcast', {
      broadcastId: broadcastData.broadcastId,
      providers: selectedProviders.length,
      timeout: broadcastTimeout
    });

    // Create broadcast promises for all providers
    const broadcastPromises = selectedProviders.map(provider => 
      this._broadcastToProvider(provider, transactionRequest, {
        timeout: provider.timeout,
        broadcastId: broadcastData.broadcastId
      }).then(result => ({
        success: true,
        providerId: provider.id,
        result,
        responseTime: Date.now() - broadcastData.startTime
      })).catch(error => ({
        success: false,
        providerId: provider.id,
        error: error.message,
        errorCode: error.code,
        responseTime: Date.now() - broadcastData.startTime
      }))
    );

    // Create timeout promise
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new RPCError(
          `Parallel broadcast timeout after ${broadcastTimeout}ms`,
          PARALLEL_BROADCAST_ERRORS.BROADCAST_TIMEOUT
        ));
      }, broadcastTimeout);
    });

    try {
      // Wait for all broadcasts to complete or timeout
      const results = await Promise.race([
        Promise.allSettled(broadcastPromises),
        timeoutPromise
      ]);

      // Process results
      const { successfulResults, failedResults } = this._processProviderResults(results, broadcastData);

      // Check if minimum success threshold is met
      if (successfulResults.length < this.config.minSuccessfulProviders) {
        throw new RPCError(
          `Insufficient successful providers: need ${this.config.minSuccessfulProviders}, got ${successfulResults.length}`,
          PARALLEL_BROADCAST_ERRORS.PARTIAL_BROADCAST_FAILURE,
          {
            broadcastId: broadcastData.broadcastId,
            successfulProviders: successfulResults.length,
            failedProviders: failedResults.length,
            results: { successful: successfulResults, failed: failedResults }
          }
        );
      }

      // Validate consensus if enabled
      let consensusResult = { valid: true, agreement: 100, details: 'Consensus validation disabled' };
      if (this.config.enableConsensusValidation && this.config.consensusMode !== CONSENSUS_MODES.DISABLED) {
        consensusResult = this._validateConsensus(successfulResults);
        broadcastData.consensusValidation = consensusResult;
        broadcastData.consensusAgreement = consensusResult.agreement;

        if (!consensusResult.valid) {
          throw new RPCError(
            `Consensus validation failed: ${consensusResult.details}`,
            PARALLEL_BROADCAST_ERRORS.CONSENSUS_FAILURE,
            {
              broadcastId: broadcastData.broadcastId,
              consensusResult,
              successfulProviders: successfulResults.length
            }
          );
        }
      }

      // Select primary result
      const primaryResult = consensusResult.primaryResult || successfulResults[0].result;
      broadcastData.primaryResult = primaryResult;
      broadcastData.transactionHash = primaryResult.hash;

      // Determine result state
      const resultState = this._determineResultState(successfulResults, failedResults, consensusResult);

      return {
        success: true,
        broadcastId: broadcastData.broadcastId,
        strategy: 'parallel',
        state: resultState,
        transactionHash: primaryResult.hash,
        
        // Provider results
        successfulProviders: successfulResults.map(r => r.providerId),
        failedProviders: failedResults.map(r => r.providerId),
        totalProviders: selectedProviders.length,
        successRate: (successfulResults.length / selectedProviders.length) * 100,
        
        // Consensus information
        consensus: {
          enabled: this.config.enableConsensusValidation,
          mode: this.config.consensusMode,
          valid: consensusResult.valid,
          agreement: consensusResult.agreement,
          details: consensusResult.details
        },
        
        // Timing
        responseTime: Date.now() - broadcastData.startTime,
        
        // Result
        result: primaryResult
      };

    } catch (error) {
      // Handle specific error types
      if (error.code === PARALLEL_BROADCAST_ERRORS.BROADCAST_TIMEOUT) {
        // Timeout occurred - check partial results
        const partialResults = await this._handleTimeoutScenario(broadcastPromises, broadcastData);
        if (partialResults.successfulResults.length >= this.config.minSuccessfulProviders) {
          return this._createPartialSuccessResult(partialResults, broadcastData);
        }
      }
      
      throw error;
    }
  }

  /**
   * Broadcasts to a single provider
   */
  async _broadcastToProvider(provider, transactionRequest, options = {}) {
    const startTime = Date.now();
    const timeout = options.timeout || this.config.providerTimeout;
    const broadcastId = options.broadcastId;

    try {
      // Update metrics
      this._recordProviderRequest(provider.id, true); // true for parallel

      // Create timeout promise
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new RPCError(
            `Provider timeout after ${timeout}ms`,
            PARALLEL_BROADCAST_ERRORS.PROVIDER_TIMEOUT
          ));
        }, timeout);
      });

      // Execute broadcast with timeout
      const broadcastPromise = provider.provider.sendTransaction(transactionRequest);
      const result = await Promise.race([broadcastPromise, timeoutPromise]);

      // Record success metrics
      const responseTime = Date.now() - startTime;
      this._recordProviderSuccess(provider.id, responseTime, true); // true for parallel

      // Update provider last used
      this.providers.get(provider.id).lastUsed = Date.now();

      this.emit('provider_success', {
        broadcastId,
        providerId: provider.id,
        transactionHash: result.hash,
        responseTime,
        parallel: true
      });

      return result;

    } catch (error) {
      const responseTime = Date.now() - startTime;
      this._recordProviderFailure(provider.id, error, responseTime, true); // true for parallel
      
      this.emit('provider_failure', {
        broadcastId,
        providerId: provider.id,
        error: error.message,
        errorCode: error.code,
        responseTime,
        parallel: true
      });

      // Categorize and re-throw error
      throw this._categorizeProviderError(error);
    }
  }

  /**
   * Processes provider results from parallel broadcast
   */
  _processProviderResults(results, broadcastData) {
    const successfulResults = [];
    const failedResults = [];

    results.forEach((result, index) => {
      const provider = broadcastData.selectedProviders[index];
      
      if (result.status === 'fulfilled') {
        const broadcastResult = result.value;
        
        if (broadcastResult.success) {
          successfulResults.push(broadcastResult);
          broadcastData.successfulProviders.push(broadcastResult.providerId);
          broadcastData.providerResults.set(broadcastResult.providerId, broadcastResult.result);
        } else {
          failedResults.push(broadcastResult);
          broadcastData.failedProviders.push({
            providerId: broadcastResult.providerId,
            error: broadcastResult.error,
            errorCode: broadcastResult.errorCode
          });
        }
      } else {
        // Promise itself was rejected
        const error = result.reason;
        failedResults.push({
          providerId: provider.id,
          error: error?.message || 'Unknown error',
          errorCode: error?.code || 'UNKNOWN',
          responseTime: Date.now() - broadcastData.startTime
        });
        broadcastData.failedProviders.push({
          providerId: provider.id,
          error: error?.message || 'Unknown error',
          errorCode: error?.code || 'UNKNOWN'
        });
      }
    });

    return { successfulResults, failedResults };
  }

  /**
   * Validates consensus among successful results
   */
  _validateConsensus(successfulResults) {
    const results = successfulResults.map(r => r.result);
    return this.securityManager.validateConsensus(
      results, 
      this.config.consensusMode, 
      this.config.consensusThreshold
    );
  }

  /**
   * Determines the final result state
   */
  _determineResultState(successfulResults, failedResults, consensusResult) {
    const totalProviders = successfulResults.length + failedResults.length;
    const successRate = successfulResults.length / totalProviders;

    if (!consensusResult.valid) {
      return BROADCAST_RESULT_STATES.CONSENSUS_FAILURE;
    } else if (successfulResults.length === totalProviders) {
      return BROADCAST_RESULT_STATES.SUCCESS;
    } else if (successfulResults.length >= this.config.minSuccessfulProviders) {
      return BROADCAST_RESULT_STATES.PARTIAL_SUCCESS;
    } else {
      return BROADCAST_RESULT_STATES.FAILURE;
    }
  }

  /**
   * Handles timeout scenario with partial results
   */
  async _handleTimeoutScenario(broadcastPromises, broadcastData) {
    this.logger.warn('Broadcast timeout occurred, checking partial results', {
      broadcastId: broadcastData.broadcastId
    });

    // Give a short grace period for pending promises
    const gracePeriod = 2000; // 2 seconds
    await new Promise(resolve => setTimeout(resolve, gracePeriod));

    // Check which promises have resolved
    const partialResults = await Promise.allSettled(broadcastPromises);
    return this._processProviderResults(partialResults, broadcastData);
  }

  /**
   * Creates partial success result
   */
  _createPartialSuccessResult(partialResults, broadcastData) {
    const { successfulResults, failedResults } = partialResults;
    
    // Validate consensus if enabled
    let consensusResult = { valid: true, agreement: 100, details: 'Consensus validation disabled' };
    if (this.config.enableConsensusValidation && this.config.consensusMode !== CONSENSUS_MODES.DISABLED) {
      consensusResult = this._validateConsensus(successfulResults);
    }

    const primaryResult = consensusResult.primaryResult || successfulResults[0].result;
    
    return {
      success: true,
      broadcastId: broadcastData.broadcastId,
      strategy: 'parallel',
      state: BROADCAST_RESULT_STATES.PARTIAL_SUCCESS,
      transactionHash: primaryResult.hash,
      
      successfulProviders: successfulResults.map(r => r.providerId),
      failedProviders: failedResults.map(r => r.providerId),
      totalProviders: broadcastData.selectedProviders.length,
      successRate: (successfulResults.length / broadcastData.selectedProviders.length) * 100,
      
      consensus: {
        enabled: this.config.enableConsensusValidation,
        mode: this.config.consensusMode,
        valid: consensusResult.valid,
        agreement: consensusResult.agreement,
        details: consensusResult.details
      },
      
      responseTime: Date.now() - broadcastData.startTime,
      result: primaryResult,
      
      warning: 'Partial success due to timeout'
    };
  }

  /**
   * Helper methods for provider management and analytics
   */

  /**
   * Gets healthy providers
   */
  _getHealthyProviders() {
    return Array.from(this.providers.values()).filter(provider => 
      provider.enabled && this._isProviderHealthy(provider.id)
    );
  }

  /**
   * Checks if provider is healthy
   */
  _isProviderHealthy(providerId) {
    const health = this.providerHealth.get(providerId);
    if (!health) return false;

    const isNotFailed = health.status !== PROVIDER_HEALTH.FAILED;
    const belowFailureThreshold = health.consecutiveFailures < this.config.failureThreshold;
    const hasRecentActivity = health.lastCheck && (Date.now() - health.lastCheck) < (this.config.healthCheckInterval * 2);

    return isNotFailed && belowFailureThreshold;
  }

  /**
   * Records provider request
   */
  _recordProviderRequest(providerId, isParallel = false) {
    const metrics = this.providerMetrics.get(providerId);
    if (metrics) {
      metrics.totalRequests++;
      if (isParallel) {
        metrics.parallelBroadcasts++;
      }
    }

    this.metrics.increment('provider_requests_total', { 
      providerId, 
      type: isParallel ? 'parallel' : 'single' 
    });
  }

  /**
   * Records provider success
   */
  _recordProviderSuccess(providerId, responseTime = null, isParallel = false) {
    const health = this.providerHealth.get(providerId);
    const metrics = this.providerMetrics.get(providerId);

    if (health) {
      health.consecutiveSuccesses++;
      health.consecutiveFailures = 0;
      health.lastCheck = Date.now();
      health.status = PROVIDER_HEALTH.HEALTHY;
      
      if (health.consecutiveSuccesses >= this.config.recoveryThreshold) {
        health.healthScore = Math.min(100, health.healthScore + 10);
      }

      if (responseTime) {
        health.responseTimeHistory.push({
          timestamp: Date.now(),
          responseTime,
          parallel: isParallel
        });

        // Keep only last 100 response times
        if (health.responseTimeHistory.length > 100) {
          health.responseTimeHistory.shift();
        }
      }
    }

    if (metrics && responseTime) {
      metrics.lastResponseTime = responseTime;
      metrics.totalLatency += responseTime;
      metrics.averageLatency = metrics.totalLatency / metrics.totalRequests;
      metrics.successRate = ((metrics.totalRequests - metrics.totalFailures) / metrics.totalRequests) * 100;

      if (isParallel) {
        metrics.parallelSuccesses++;
        metrics.parallelSuccessRate = (metrics.parallelSuccesses / metrics.parallelBroadcasts) * 100;
      }
    }

    this.metrics.increment('provider_successes_total', { 
      providerId, 
      type: isParallel ? 'parallel' : 'single' 
    });
    
    if (responseTime) {
      this.metrics.histogram('provider_response_time', responseTime, { 
        providerId, 
        type: isParallel ? 'parallel' : 'single' 
      });
    }
  }

  /**
   * Records provider failure
   */
  _recordProviderFailure(providerId, error, responseTime = null, isParallel = false) {
    const health = this.providerHealth.get(providerId);
    const metrics = this.providerMetrics.get(providerId);

    if (health) {
      health.consecutiveFailures++;
      health.consecutiveSuccesses = 0;
      health.lastCheck = Date.now();
      health.lastError = error?.message || 'Unknown error';
      
      if (health.consecutiveFailures >= this.config.failureThreshold) {
        health.status = PROVIDER_HEALTH.FAILED;
        health.healthScore = Math.max(0, health.healthScore - 20);
      } else {
        health.status = PROVIDER_HEALTH.DEGRADED;
        health.healthScore = Math.max(0, health.healthScore - 5);
      }
    }

    if (metrics) {
      metrics.totalFailures++;
      metrics.successRate = ((metrics.totalRequests - metrics.totalFailures) / metrics.totalRequests) * 100;
      
      if (isParallel) {
        metrics.parallelSuccessRate = (metrics.parallelSuccesses / metrics.parallelBroadcasts) * 100;
      }
    }

    this.metrics.increment('provider_failures_total', { 
      providerId, 
      error: error?.code || 'unknown',
      type: isParallel ? 'parallel' : 'single'
    });
  }

  /**
   * Categorizes provider errors for better handling
   */
  _categorizeProviderError(error) {
    const message = error.message?.toLowerCase() || '';
    const code = error.code || '';

    // Network errors
    if (message.includes('network') || message.includes('connection') || code === 'NETWORK_ERROR') {
      return new RPCError(error.message, PARALLEL_BROADCAST_ERRORS.PROVIDER_NETWORK_ERROR, { originalError: error });
    }

    // Timeout errors
    if (message.includes('timeout') || code === 'TIMEOUT') {
      return new RPCError(error.message, PARALLEL_BROADCAST_ERRORS.PROVIDER_TIMEOUT, { originalError: error });
    }

    // Rate limiting
    if (message.includes('rate limit') || message.includes('too many requests') || code === 'RATE_LIMITED') {
      return new RPCError(error.message, PARALLEL_BROADCAST_ERRORS.PROVIDER_RATE_LIMITED, { originalError: error });
    }

    // Default to connection failed
    return new RPCError(error.message, PARALLEL_BROADCAST_ERRORS.PROVIDER_CONNECTION_FAILED, { originalError: error });
  }

  /**
   * Performs security validation
   */
  async _performSecurityValidation(transactionRequest) {
    if (!this.securityManager) return;

    try {
      await this.securityManager.validateTransaction(transactionRequest);
    } catch (error) {
      throw new RPCError(
        `Security validation failed: ${error.message}`,
        PARALLEL_BROADCAST_ERRORS.INVALID_CONFIGURATION
      );
    }
  }

  /**
   * Generates unique broadcast ID
   */
  _generateBroadcastId() {
    return `parallel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Completes broadcast coordination
   */
  async _completeBroadcast(broadcastData, success, result) {
    const broadcastTime = Date.now() - broadcastData.startTime;

    // Update analytics
    this.analytics.totalBroadcasts++;
    
    if (success) {
      const successfulCount = broadcastData.successfulProviders.length;
      const totalCount = broadcastData.selectedProviders.length;
      
      if (successfulCount === totalCount) {
        this.analytics.successfulBroadcasts++;
      } else {
        this.analytics.partialSuccesses++;
      }

      // Update average successful providers
      this.analytics.averageSuccessfulProviders = (
        (this.analytics.averageSuccessfulProviders * (this.analytics.totalBroadcasts - 1) + successfulCount) / 
        this.analytics.totalBroadcasts
      );

      // Update consensus agreement rate
      if (broadcastData.consensusValidation) {
        const currentRate = this.analytics.consensusAgreementRate;
        this.analytics.consensusAgreementRate = (
          (currentRate * (this.analytics.totalBroadcasts - 1) + broadcastData.consensusAgreement) / 
          this.analytics.totalBroadcasts
        );
      }

      // Calculate parallel efficiency
      this.analytics.parallelEfficiency = (
        (this.analytics.successfulBroadcasts + this.analytics.partialSuccesses) / 
        this.analytics.totalBroadcasts
      ) * 100;
    } else {
      this.analytics.failedBroadcasts++;
      
      // Check if it's a consensus failure
      if (result?.code === PARALLEL_BROADCAST_ERRORS.CONSENSUS_FAILURE) {
        this.analytics.consensusFailures++;
      }
    }

    // Update average broadcast time
    this.analytics.averageBroadcastTime = (
      (this.analytics.averageBroadcastTime * (this.analytics.totalBroadcasts - 1) + broadcastTime) / 
      this.analytics.totalBroadcasts
    );

    // Store in history
    this.broadcastHistory.push({
      broadcastId: broadcastData.broadcastId,
      success,
      broadcastTime,
      successfulProviders: broadcastData.successfulProviders.length,
      totalProviders: broadcastData.selectedProviders.length,
      consensusValidation: broadcastData.consensusValidation,
      timestamp: new Date().toISOString()
    });

    // Keep only last 1000 broadcasts in history
    if (this.broadcastHistory.length > 1000) {
      this.broadcastHistory.shift();
    }

    // Emit completion event
    this.emit('broadcast_completed', {
      broadcastId: broadcastData.broadcastId,
      success,
      result,
      broadcastTime,
      successfulProviders: broadcastData.successfulProviders.length,
      consensusValidation: broadcastData.consensusValidation,
      analytics: this.getAnalytics()
    });
  }

  /**
   * Handles broadcast error
   */
  async _handleBroadcastError(broadcastId, error, startTime) {
    const broadcastTime = Date.now() - startTime;

    this.analytics.totalBroadcasts++;
    this.analytics.failedBroadcasts++;

    this.logger.error('Parallel broadcast failed', {
      broadcastId,
      error: error.message,
      broadcastTime
    });

    this.emit('broadcast_failed', {
      broadcastId,
      error: error.message,
      errorCode: error.code,
      broadcastTime
    });
  }

  /**
   * Starts health monitoring
   */
  _startHealthMonitoring() {
    this.healthMonitorInterval = setInterval(() => {
      this._performHealthChecks();
    }, this.config.healthCheckInterval);

    this.logger.info('Health monitoring started', {
      interval: this.config.healthCheckInterval
    });
  }

  /**
   * Performs health checks on all providers
   */
  async _performHealthChecks() {
    const healthCheckPromises = Array.from(this.providers.keys()).map(async (providerId) => {
      try {
        const provider = this.providers.get(providerId);
        if (!provider.enabled) return;

        // Simple health check - get block number
        const startTime = Date.now();
        await Promise.race([
          provider.provider.getBlockNumber(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Health check timeout')), 5000)
          )
        ]);
        const responseTime = Date.now() - startTime;

        this._recordProviderSuccess(providerId, responseTime, false);
        
      } catch (error) {
        this._recordProviderFailure(providerId, error, null, false);
      }
    });

    await Promise.allSettled(healthCheckPromises);

    // Emit health update
    this.emit('health_updated', this.getProviderHealth());
  }

  /**
   * Starts metrics monitoring
   */
  _startMetricsMonitoring() {
    this.metricsInterval = setInterval(() => {
      this._updateMetrics();
    }, 60000); // Update every minute

    this.logger.info('Metrics monitoring started');
  }

  /**
   * Updates metrics data
   */
  _updateMetrics() {
    // Update provider reliability scores
    for (const [providerId, metrics] of this.providerMetrics.entries()) {
      this.analytics.providerReliability[providerId] = {
        successRate: metrics.successRate,
        averageLatency: metrics.averageLatency,
        totalRequests: metrics.totalRequests,
        parallelSuccessRate: metrics.parallelSuccessRate,
        consensusAgreements: metrics.consensusAgreements,
        consensusDisagreements: metrics.consensusDisagreements
      };
    }

    // Update gauge metrics
    this.metrics.gauge('active_providers', this._getHealthyProviders().length);
    this.metrics.gauge('consensus_agreement_rate', this.analytics.consensusAgreementRate);
    this.metrics.gauge('parallel_efficiency', this.analytics.parallelEfficiency);

    // Emit metrics update
    this.emit('metrics_updated', {
      analytics: this.getAnalytics(),
      metrics: this.metrics.getMetrics()
    });
  }

  /**
   * Calculate success rate
   */
  _calculateSuccessRate() {
    if (this.analytics.totalBroadcasts === 0) return 100;
    return (this.analytics.successfulBroadcasts / this.analytics.totalBroadcasts) * 100;
  }

  /**
   * Calculate partial success rate
   */
  _calculatePartialSuccessRate() {
    if (this.analytics.totalBroadcasts === 0) return 0;
    return (this.analytics.partialSuccesses / this.analytics.totalBroadcasts) * 100;
  }

  /**
   * Calculate consensus failure rate
   */
  _calculateConsensusFailureRate() {
    if (this.analytics.totalBroadcasts === 0) return 0;
    return (this.analytics.consensusFailures / this.analytics.totalBroadcasts) * 100;
  }

  /**
   * Gets provider analytics
   */
  _getProviderAnalytics() {
    const analytics = {};
    
    for (const [providerId, provider] of this.providers.entries()) {
      const health = this.providerHealth.get(providerId);
      const metrics = this.providerMetrics.get(providerId);
      
      analytics[providerId] = {
        name: provider.name,
        enabled: provider.enabled,
        tier: provider.tier,
        weight: provider.weight,
        
        health: {
          status: health?.status || PROVIDER_HEALTH.UNKNOWN,
          healthScore: health?.healthScore || 0,
          consecutiveFailures: health?.consecutiveFailures || 0,
          consecutiveSuccesses: health?.consecutiveSuccesses || 0,
          lastError: health?.lastError || null
        },
        
        performance: {
          totalRequests: metrics?.totalRequests || 0,
          totalFailures: metrics?.totalFailures || 0,
          successRate: metrics?.successRate || 0,
          averageLatency: metrics?.averageLatency || 0,
          lastResponseTime: metrics?.lastResponseTime || null,
          parallelBroadcasts: metrics?.parallelBroadcasts || 0,
          parallelSuccesses: metrics?.parallelSuccesses || 0,
          parallelSuccessRate: metrics?.parallelSuccessRate || 0
        },
        
        usage: {
          lastUsed: provider.lastUsed,
          createdAt: provider.createdAt
        }
      };
    }
    
    return analytics;
  }

  /**
   * Gets recent broadcast history
   */
  getBroadcastHistory(limit = 100) {
    return this.broadcastHistory
      .slice(-limit)
      .map(broadcast => ({
        broadcastId: broadcast.broadcastId,
        success: broadcast.success,
        broadcastTime: broadcast.broadcastTime,
        successfulProviders: broadcast.successfulProviders,
        totalProviders: broadcast.totalProviders,
        successRate: (broadcast.successfulProviders / broadcast.totalProviders) * 100,
        consensusValidation: broadcast.consensusValidation,
        timestamp: broadcast.timestamp
      }));
  }

  /**
   * Forces provider health status update
   */
  setProviderHealth(providerId, status, reason = null) {
    const health = this.providerHealth.get(providerId);
    if (!health) {
      throw new Error(`Provider ${providerId} not found`);
    }

    const oldStatus = health.status;
    health.status = status;
    health.lastCheck = Date.now();
    
    if (reason) {
      health.lastError = reason;
    }

    this.logger.info('Provider health status updated', {
      providerId,
      oldStatus,
      newStatus: status,
      reason
    });

    this.emit('provider_health_changed', {
      providerId,
      oldStatus,
      newStatus: status,
      reason
    });
  }

  /**
   * Enables or disables a provider
   */
  setProviderEnabled(providerId, enabled) {
    const provider = this.providers.get(providerId);
    if (!provider) {
      throw new Error(`Provider ${providerId} not found`);
    }

    const oldEnabled = provider.enabled;
    provider.enabled = enabled;

    this.logger.info('Provider enabled status updated', {
      providerId,
      oldEnabled,
      newEnabled: enabled
    });

    this.emit('provider_enabled_changed', {
      providerId,
      oldEnabled,
      newEnabled: enabled
    });
  }

  /**
   * Gets current metrics from MetricsCollector
   */
  getMetrics() {
    return this.metrics.getMetrics();
  }

  /**
   * Cleanup and shutdown
   */
  async shutdown() {
    this.logger.info('Shutting down ParallelBroadcastStrategy');

    // Clear intervals
    if (this.healthMonitorInterval) {
      clearInterval(this.healthMonitorInterval);
    }
    
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
    }

    // Cancel active broadcasts
    for (const [broadcastId, broadcastData] of this.activeBroadcasts.entries()) {
      this.emit('broadcast_cancelled', { broadcastId });
    }

    this.activeBroadcasts.clear();

    // Emit final analytics
    this.emit('shutdown', {
      finalAnalytics: this.getAnalytics(),
      finalMetrics: this.getMetrics(),
      uptime: Date.now() - this.startTime
    });

    // Remove all listeners
    this.removeAllListeners();

    this.logger.info('ParallelBroadcastStrategy shutdown complete');
  }
}

// Export for use in other modules
export default ParallelBroadcastStrategy;/**
 * @fileoverview Production Enterprise-grade Parallel Broadcast Strategy for Trust Crypto Wallet Extension
 * @version 1.0.0
 * @author Trust Crypto Wallet Development Team
 * @license MIT
 * @description PRODUCTION-READY parallel broadcast strategy with enterprise reliability and consensus validation
 */

import { EventEmitter } from 'events';
import { ethers } from 'ethers';

/**
 * Parallel broadcast strategy error codes
 */
export const PARALLEL_BROADCAST_ERRORS = {
  // Configuration errors
  INVALID_CONFIGURATION: 'PARALLEL_INVALID_CONFIG',
  NO_PROVIDERS_AVAILABLE: 'PARALLEL_NO_PROVIDERS',
  INSUFFICIENT_PROVIDERS: 'PARALLEL_INSUFFICIENT_PROVIDERS',
  CONSENSUS_CONFIG_ERROR: 'PARALLEL_CONSENSUS_CONFIG',
  
  // Broadcast errors
  ALL_PROVIDERS_FAILED: 'PARALLEL_ALL_FAILED',
  PARTIAL_BROADCAST_FAILURE: 'PARALLEL_PARTIAL_FAILURE',
  BROADCAST_TIMEOUT: 'PARALLEL_TIMEOUT',
  CONSENSUS_FAILURE: 'PARALLEL_CONSENSUS_FAILED',
  
  // Provider errors
  PROVIDER_CONNECTION_FAILED: 'PARALLEL_PROVIDER_CONNECTION',
  PROVIDER_TIMEOUT: 'PARALLEL_PROVIDER_TIMEOUT',
  PROVIDER_RATE_LIMITED: 'PARALLEL_PROVIDER_RATE_LIMITED',
  PROVIDER_NETWORK_ERROR: 'PARALLEL_PROVIDER_NETWORK',
  
  // Consensus errors
  HASH_MISMATCH: 'PARALLEL_HASH_MISMATCH',
  RESULT_INCONSISTENCY: 'PARALLEL_RESULT_INCONSISTENCY',
  CONSENSUS_THRESHOLD_NOT_MET: 'PARALLEL_CONSENSUS_THRESHOLD',
  VALIDATION_TIMEOUT: 'PARALLEL_VALIDATION_TIMEOUT'
};

/**
 * Provider health states
 */
export const PROVIDER_HEALTH = {
  HEALTHY: 'healthy',
  DEGRADED: 'degraded',
  FAILED: 'failed',
  TIMEOUT: 'timeout',
  RATE_LIMITED: 'rate_limited',
  UNKNOWN: 'unknown'
};

/**
 * Parallel broadcast result states
 */
export const BROADCAST_RESULT_STATES = {
  SUCCESS: 'success',                 // All or majority providers succeeded
  PARTIAL_SUCCESS: 'partial_success', // Some providers succeeded
  FAILURE: 'failure',                 // All providers failed
  TIMEOUT: 'timeout',                 // Operation timed out
  CONSENSUS_FAILURE: 'consensus_failure' // Results don't match
};

/**
 * Consensus validation modes
 */
export const CONSENSUS_MODES = {
  DISABLED: 'disabled',               // No consensus validation
  HASH_ONLY: 'hash_only',            // Validate transaction hash only
  BASIC: 'basic',                     // Validate hash and basic fields
  STRICT: 'strict',                   // Validate all consensus fields
  MAJORITY: 'majority'                // Require majority agreement
};

/**
 * Network-specific parallel broadcast configurations
 */
export const PARALLEL_CONFIGS = {
  1: { // Ethereum Mainnet
    name: 'ethereum',
    chainId: 1,
    maxProviders: 5,
    minSuccessfulProviders: 2,          // Minimum for success
    broadcastTimeout: 45000,            // 45 seconds total
    providerTimeout: 15000,             // 15 seconds per provider
    consensusMode: CONSENSUS_MODES.STRICT,
    consensusThreshold: 0.67,           // 67% agreement required
    enableResultValidation: true,
    healthCheckInterval: 30000,         // 30 seconds
    failureThreshold: 3,                // Failures before unhealthy
    recoveryThreshold: 2,               // Successes before healthy
    enableMetrics: true,
    enableDetailedLogging: true,
    retryFailedProviders: true,
    maxRetryAttempts: 2
  },
  56: { // BSC
    name: 'bsc',
    chainId: 56,
    maxProviders: 4,
    minSuccessfulProviders: 2,
    broadcastTimeout: 25000,            // 25 seconds
    providerTimeout: 8000,              // 8 seconds per provider
    consensusMode: CONSENSUS_MODES.HASH_ONLY,
    consensusThreshold: 0.51,           // 51% agreement
    enableResultValidation: false,
    healthCheckInterval: 20000,         // 20 seconds
    failureThreshold: 2,
    recoveryThreshold: 2,
    enableMetrics: true,
    enableDetailedLogging: true,
    retryFailedProviders: true,
    maxRetryAttempts: 1
  },
  137: { // Polygon
    name: 'polygon',
    chainId: 137,
    maxProviders: 4,
    minSuccessfulProviders: 2,
    broadcastTimeout: 20000,            // 20 seconds
    providerTimeout: 6000,              // 6 seconds per provider
    consensusMode: CONSENSUS_MODES.BASIC,
    consensusThreshold: 0.51,           // 51% agreement
    enableResultValidation: true,
    healthCheckInterval: 15000,         // 15 seconds
    failureThreshold: 2,
    recoveryThreshold: 1,
    enableMetrics: true,
    enableDetailedLogging: true,
    retryFailedProviders: false,
    maxRetryAttempts: 1
  },
  42161: { // Arbitrum
    name: 'arbitrum',
    chainId: 42161,
    maxProviders: 3,
    minSuccessfulProviders: 2,
    broadcastTimeout: 15000,            // 15 seconds
    providerTimeout: 5000,              // 5 seconds per provider
    consensusMode: CONSENSUS_MODES.HASH_ONLY,
    consensusThreshold: 0.51,           // 51% agreement
    enableResultValidation: false,
    healthCheckInterval: 10000,         // 10 seconds
    failureThreshold: 2,
    recoveryThreshold: 1,
    enableMetrics: true,
    enableDetailedLogging: false,
    retryFailedProviders: false,
    maxRetryAttempts: 1
  },
  10: { // Optimism
    name: 'optimism',
    chainId: 10,
    maxProviders: 3,
    minSuccessfulProviders: 2,
    broadcastTimeout: 15000,            // 15 seconds
    providerTimeout: 5000,              // 5 seconds per provider
    consensusMode: CONSENSUS_MODES.HASH_ONLY,
    consensusThreshold: 0.51,           // 51% agreement
    enableResultValidation: false,
    healthCheckInterval: 10000,         // 10 seconds
    failureThreshold: 2,
    recoveryThreshold: 1,
    enableMetrics: true,
    enableDetailedLogging: false,
    retryFailedProviders: false,
    maxRetryAttempts: 1
  },
  43114: { // Avalanche
    name: 'avalanche',
    chainId: 43114,
    maxProviders: 4,
    minSuccessfulProviders: 2,
    broadcastTimeout: 20000,            // 20 seconds
    providerTimeout: 6000,              // 6 seconds per provider
    consensusMode: CONSENSUS_MODES.BASIC,
    consensusThreshold: 0.51,           // 51% agreement
    enableResultValidation: true,
    healthCheckInterval: 15000,         // 15 seconds
    failureThreshold: 2,
    recoveryThreshold: 2,
    enableMetrics: true,
    enableDetailedLogging: true,
    retryFailedProviders: true,
    maxRetryAttempts: 2
  }
};

/**
 * RPCError class for parallel broadcast errors
 */
export class RPCError extends Error {
  constructor(message, code = 'UNKNOWN_ERROR', details = {}) {
    super(message);
    this.name = 'RPCError';
    this.code = code;
    this.details = details;
    this.timestamp = new Date().toISOString();
  }
}

/**
 * Logger implementation for parallel strategy
 */
export class Logger {
  constructor(component) {
    this.component = component;
    this.logLevel = process.env.LOG_LEVEL || 'info';
  }

  info(message, data = {}) {
    if (this._shouldLog('info')) {
      console.log(`[INFO] ${this.component}: ${message}`, data);
    }
  }

  warn(message, data = {}) {
    if (this._shouldLog('warn')) {
      console.warn(`[WARN] ${this.component}: ${message}`, data);
    }
  }

  error(message, data = {}) {
    if (this._shouldLog('error')) {
      console.error(`[ERROR] ${this.component}: ${message}`, data);
    }
  }

  debug(message, data = {}) {
    if (this._shouldLog('debug')) {
      console.debug(`[DEBUG] ${this.component}: ${message}`, data);
    }
  }

  _shouldLog(level) {
    const levels = { debug: 0, info: 1, warn: 2, error: 3 };
    return levels[level] >= levels[this.logLevel];
  }
}

/**
 * SecurityManager for transaction validation
 */
export class SecurityManager {
  constructor(options = {}) {
    this.enableTransactionValidation = options.enableTransactionValidation !== false;
    this.enableConsensusValidation = options.enableConsensusValidation !== false;
    this.maxGasLimit = options.maxGasLimit || BigInt('21000000');
    this.maxValue = options.maxValue || null;
    this.blacklistedAddresses = new Set(options.blacklistedAddresses || []);
    this.consensusFields = options.consensusFields || ['hash', 'gasUsed', 'blockNumber'];
  }

  async validateTransaction(transactionRequest) {
    if (!this.enableTransactionValidation) return;

    // Basic structure validation
    if (!transactionRequest || typeof transactionRequest !== 'object') {
      throw new Error('Invalid transaction structure');
    }

    // Required fields validation
    if (!transactionRequest.to) {
      throw new Error('Transaction must have a recipient address');
    }

    // Address validation
    if (!ethers.isAddress(transactionRequest.to)) {
      throw new Error('Invalid recipient address');
    }

    // Blacklist check
    if (this.blacklistedAddresses.has(transactionRequest.to.toLowerCase())) {
      throw new Error('Recipient address is blacklisted');
    }

    // Gas limit validation
    if (transactionRequest.gasLimit) {
      const gasLimit = BigInt(transactionRequest.gasLimit);
      if (gasLimit > this.maxGasLimit) {
        throw new Error(`Gas limit ${gasLimit} exceeds maximum ${this.maxGasLimit}`);
      }
    }

    // Value validation
    if (this.maxValue && transactionRequest.value) {
      const value = BigInt(transactionRequest.value);
      if (value > this.maxValue) {
        throw new Error(`Transaction value ${value} exceeds maximum ${this.maxValue}`);
      }
    }

    return true;
  }

  validateConsensus(results, mode = CONSENSUS_MODES.BASIC, threshold = 0.67) {
    if (!this.enableConsensusValidation || mode === CONSENSUS_MODES.DISABLED) {
      return { valid: true, agreement: 100, details: 'Consensus validation disabled' };
    }

    if (results.length < 2) {
      return { valid: true, agreement: 100, details: 'Single result - consensus not applicable' };
    }

    const consensusResults = this._analyzeConsensus(results, mode);
    const agreement = consensusResults.maxAgreement;
    const valid = agreement >= threshold;

    return {
      valid,
      agreement,
      details: consensusResults.details,
      groups: consensusResults.groups,
      primaryResult: consensusResults.primaryResult
    };
  }

  _analyzeConsensus(results, mode) {
    const groups = new Map();
    
    // Group results by consensus key
    for (const result of results) {
      const key = this._generateConsensusKey(result, mode);
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key).push(result);
    }

    // Find largest group
    let maxGroup = [];
    let maxKey = '';
    for (const [key, group] of groups.entries()) {
      if (group.length > maxGroup.length) {
        maxGroup = group;
        maxKey = key;
      }
    }

    const agreement = (maxGroup.length / results.length) * 100;

    return {
      maxAgreement: agreement,
      groups: Object.fromEntries(groups),
      primaryResult: maxGroup[0],
      details: `${maxGroup.length}/${results.length} providers agree (${agreement.toFixed(1)}%)`
    };
  }

  _generateConsensusKey(result, mode) {
    switch (mode) {
      case CONSENSUS_MODES.HASH_ONLY:
        return result.hash || 'no-hash';
        
      case CONSENSUS_MODES.BASIC:
        return JSON.stringify({
          hash: result.hash,
          gasUsed: result.gasUsed,
          status: result.status
        });
        
      case CONSENSUS_MODES.STRICT:
        return JSON.stringify({
          hash: result.hash,
          gasUsed: result.gasUsed,
          blockNumber: result.blockNumber,
          blockHash: result.blockHash,
          status: result.status,
          effectiveGasPrice: result.effectiveGasPrice
        });
        
      case CONSENSUS_MODES.MAJORITY:
        return JSON.stringify({
          hash: result.hash,
          gasUsed: result.gasUsed,
          blockNumber: result.blockNumber
        });
        
      default:
        return result.hash || 'no-hash';
    }
  }
}

/**
 * MetricsCollector for performance tracking
 */
export class MetricsCollector {
  constructor(options = {}) {
    this.component = options.component || 'parallel_strategy';
    this.labels = options.labels || {};
    this.metrics = new Map();
    this.histograms = new Map();
    this.gauges = new Map();
  }

  increment(metric, labels = {}) {
    const key = this._generateKey(metric, labels);
    this.metrics.set(key, (this.metrics.get(key) || 0) + 1);
  }

  gauge(metric, value, labels = {}) {
    const key = this._generateKey(metric, labels);
    this.gauges.set(key, {
      value,
      timestamp: Date.now(),
      labels: { ...this.labels, ...labels }
    });
  }

  histogram(metric, value, labels = {}) {
    const key = this._generateKey(metric, labels);
    const values = this.histograms.get(key) || [];
    values.push({ value, timestamp: Date.now() });
    
    // Keep only last 1000 values for memory efficiency
    if (values.length > 1000) {
      values.shift();
    }
    
    this.histograms.set(key, values);
  }

  timer(metric, labels = {}) {
    const startTime = Date.now();
    return {
      end: () => {
        const duration = Date.now() - startTime;
        this.histogram(metric, duration, labels);
        return duration;
      }
    };
  }

  getMetrics() {
    const result = {};
    
    // Regular counters
    for (const [key, value] of this.metrics.entries()) {
      result[key] = value;
    }
    
    // Gauges
    for (const [key, data] of this.gauges.entries()) {
      result[key] = data.value;
      result[`${key}_timestamp`] = data.timestamp;
    }
    
    // Histogram summaries
    for (const [key, values] of this.histograms.entries()) {
      if (values.length > 0) {
        const sorted = values.map(v => v.value).sort((a, b) => a - b);
        result[`${key}_count`] = values.length;
        result[`${key}_sum`] = sorted.reduce((a, b) => a + b, 0);
        result[`${key}_avg`] = result[`${key}_sum`] / values.length;
        result[`${key}_min`] = sorted[0];
        result[`${key}_max`] = sorted[sorted.length - 1];
        result[`${key}_p50`] = sorted[Math.floor(sorted.length * 0.5)];
        result[`${key}_p90`] = sorted[Math.floor(sorted.length * 0.9)];
        result[`${key}_p95`] = sorted[Math.floor(sorted.length * 0.95)];
        result[`${key}_p99`] = sorted[Math.floor(sorted.length * 0.99)];
      }
    }
    
    return result;
  }

  _generateKey(metric, labels) {
    const allLabels = { ...this.labels, ...labels };
    const labelString = Object.keys(allLabels)
      .sort()
      .map(key => `${key}=${allLabels[key]}`)
      .join(',');
    return labelString ? `${metric}{${labelString}}` : metric;
  }
}

/**
 * PRODUCTION Enterprise-grade Parallel Broadcast Strategy
 * @class ParallelBroadcastStrategy
 * @extends EventEmitter
 */
export class ParallelBroadcastStrategy extends EventEmitter {
  constructor({
    chainId,
    providers = [],
    consensusMode = null,
    consensusThreshold = null,
    minSuccessfulProviders = null,
    enableHealthMonitoring = true,
    enableMetrics = true,
    enableSecurityChecks = true,
    enableConsensusValidation = null,
    customConfig = {},
    security = {},
    monitoring = {}
  }) {
    super();

    if (!chainId || typeof chainId !== 'number') {
      throw new Error('Valid chain ID is required');
    }

    if (!Array.isArray(providers) || providers.length === 0) {
      throw new Error('At least one provider is required');
    }

    this.chainId = chainId;
    this.networkConfig = PARALLEL_CONFIGS[chainId];
    
    if (!this.networkConfig) {
      throw new Error(`Unsupported chain ID: ${chainId}`);
    }

    // Initialize components
    this.logger = new Logger('ParallelBroadcastStrategy');
    this.securityManager = new SecurityManager({
      enableTransactionValidation: enableSecurityChecks,
      enableConsensusValidation: enableConsensusValidation !== null ? 
        enableConsensusValidation : this.networkConfig.enableResultValidation,
      ...security
    });
    
    this.metrics = new MetricsCollector({
      component: 'parallel_broadcast_strategy',
      labels: { chainId: this.chainId, network: this.networkConfig.name },
      ...monitoring
    });

    // Configuration with custom overrides
    this.config = {
      ...this.networkConfig,
      ...customConfig,
      consensusMode: consensusMode || this.networkConfig.consensusMode,
      consensusThreshold: consensusThreshold || this.networkConfig.consensusThreshold,
      minSuccessfulProviders: minSuccessfulProviders || this.networkConfig.minSuccessfulProviders,
      enableHealthMonitoring,
      enableMetrics,
      enableSecurityChecks,
      enableConsensusValidation: enableConsensusValidation !== null ? 
        enableConsensusValidation : this.networkConfig.enableResultValidation
    };

    // Validate configuration
    this._validateConfiguration();

    // Provider management
    this.providers = new Map();           // providerId -> ProviderData
    this.providerHealth = new Map();     // providerId -> HealthData
    this.providerMetrics = new Map();    // providerId -> MetricsData

    // State management
    this.activeBroadcasts = new Map();   // broadcastId -> BroadcastData
    this.broadcastHistory = [];

    // Performance tracking
    this.analytics = {
      totalBroadcasts: 0,
      successfulBroadcasts: 0,
      partialSuccesses: 0,
      failedBroadcasts: 0,
      consensusFailures: 0,
      averageBroadcastTime: 0,
      averageSuccessfulProviders: 0,
      consensusAgreementRate: 0,
      providerReliability: {},
      parallelEfficiency: 0
    };

    // Initialize providers
    this._initializeProviders(providers);

    // Start health monitoring if enabled
    if (this.config.enableHealthMonitoring) {
      this._startHealthMonitoring();
    }

    // Start metrics monitoring if enabled
    if (this.config.enableMetrics) {
      this._startMetricsMonitoring();
    }

    this.startTime = Date.now();

    this.logger.info('Production ParallelBroadcastStrategy initialized', {
      chainId: this.chainId,
      network: this.networkConfig.name,
      consensusMode: this.config.consensusMode,
      providersCount: this.providers.size,
      minSuccessfulProviders: this.config.minSuccessfulProviders,
      enableConsensusValidation: this.config.enableConsensusValidation
    });
  }

  /**
   * Broadcasts transaction using parallel strategy
   */
  async broadcastTransaction(transactionRequest, options = {}) {
    const broadcastId = this._generateBroadcastId();
    const startTime = Date.now();
    const timer = this.metrics.timer('broadcast_duration');

    try {
      this.logger.info('Starting parallel broadcast', {
        broadcastId,
        consensusMode: this.config.consensusMode,
        providersAvailable: this._getHealthyProviders().length,
        minSuccessfulProviders: this.config.minSuccessfulProviders
      });

      // Validate input
      await this._validateBroadcastRequest(transactionRequest, options);

      // Get healthy providers for broadcast
      const availableProviders = this._getHealthyProviders();
      const selectedProviders = availableProviders.slice(0, this.config.maxProviders);

      if (selectedProviders.length === 0) {
        throw new RPCError(
          'No healthy providers available for parallel broadcast',
          PARALLEL_BROADCAST_ERRORS.NO_PROVIDERS_AVAILABLE
        );
      }

      // Initialize broadcast data
      const broadcastData = {
        broadcastId,
        transactionRequest: { ...transactionRequest },
        options: { ...options },
        selectedProviders,
        
        // State tracking
        startTime,
        broadcastTimeout: options.broadcastTimeout || this.config.broadcastTimeout,
        
        // Results tracking
        providerResults: new Map(),         // providerId -> result
        successfulProviders: [],
        failedProviders: [],
        
        // Consensus tracking
        consensusValidation: null,
        consensusAgreement: 0,
        
        // Final result
        primaryResult: null,
        transactionHash: null
      };

      this.activeBroadcasts.set(broadcastId, broadcastData);

      // Execute parallel broadcast
      const result = await this._executeParallelBroadcast(broadcastData);

      // Complete broadcast
      await this._completeBroadcast(broadcastData, true, result);
      
      const duration = timer.end();
      this.metrics.increment('broadcasts_total', { status: 'success' });
      
      return result;

    } catch (error) {
      await this._handleBroadcastError(broadcastId, error, startTime);
      timer.end();
      this.metrics.increment('broadcasts_total', { status: 'error' });
      throw error;
    } finally {
      this.activeBroadcasts.delete(broadcastId);
    }
  }

  /**
   * Gets current strategy analytics
   */
  getAnalytics() {
    return {
      strategy: 'ParallelBroadcastStrategy',
      network: {
        chainId: this.chainId,
        name: this.networkConfig.name
      },
      
      configuration: {
        consensusMode: this.config.consensusMode,
        consensusThreshold: this.config.consensusThreshold,
        minSuccessfulProviders: this.config.minSuccessfulProviders,
        maxProviders: this.config.maxProviders,
        broadcastTimeout: this.config.broadcastTimeout,
        enableConsensusValidation: this.config.enableConsensusValidation
      },
      
      performance: {
        totalBroadcasts: this.analytics.totalBroadcasts,
        successfulBroadcasts: this.analytics.successfulBroadcasts,
        partialSuccesses: this.analytics.partialSuccesses,
        failedBroadcasts: this.analytics.failedBroadcasts,
        consensusFailures: this.analytics.consensusFailures,
        successRate: this._calculateSuccessRate(),
        partialSuccessRate: this._calculatePartialSuccessRate(),
        consensusFailureRate: this._calculateConsensusFailureRate(),
        averageBroadcastTime: this.analytics.averageBroadcastTime,
        averageSuccessfulProviders: this.analytics.averageSuccessfulProviders,
        consensusAgreementRate: this.analytics.consensusAgreementRate,
        parallelEfficiency: this.analytics.parallelEfficiency
      },
      
      providers: this._getProviderAnalytics(),
      
      uptime: Date.now() - this.startTime,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Gets current provider health status
   */
  getProviderHealth() {
    const healthData = {};
    
    for (const [providerId, provider] of this.providers.entries()) {
      const health = this.providerHealth.get(providerId);
      const metrics = this.providerMetrics.get(providerId);
      
      healthData[providerId] = {
        id: providerId,
        name: provider.name || `Provider ${providerId}`,
        status: health?.status || PROVIDER_HEALTH.UNKNOWN,
        tier: provider.tier || 1,
        weight: provider.weight || 1,
        lastCheck: health?.lastCheck || null,
        consecutiveFailures: health?.consecutiveFailures || 0,
        consecutiveSuccesses: health?.consecutiveSuccesses || 0,
        isHealthy: this._isProviderHealthy(providerId),
        
        metrics: {
          averageLatency: metrics?.averageLatency || 0,
          successRate: metrics?.successRate || 0,
          totalRequests: metrics?.totalRequests || 0,
          totalFailures: metrics?.totalFailures || 0,
          lastResponseTime: metrics?.lastResponseTime || null,
          parallelSuccessRate: metrics?.parallelSuccessRate || 0
        }
      };
    }
    
    return healthData;
  }

  /**
   * Internal methods
   */

  /**
   * Validates configuration on initialization
   */
  _validateConfiguration() {
    // Validate consensus mode
    if (!Object.values(CONSENSUS_MODES).includes(this.config.consensusMode)) {
      throw new RPCError(
        `Invalid consensus mode: ${this.config.consensusMode}`,
        PARALLEL_BROADCAST_ERRORS.CONSENSUS_CONFIG_ERROR
      );
    }

    // Validate consensus threshold
    if (this.config.consensusThreshold < 0 || this.config.consensusThreshold > 1) {
      throw new RPCError(
        'Consensus threshold must be between 0 and 1',
        PARALLEL_BROADCAST_ERRORS.CONSENSUS_CONFIG_ERROR
      );
    }

    // Validate minimum successful providers
    if (this.config.minSuccessfulProviders <= 0) {
      throw new RPCError(
        'Minimum successful providers must be positive',
        PARALLEL_BROADCAST_ERRORS.INVALID_CONFIGURATION
      );
    }

    // Validate timeouts
    if (this.config.broadcastTimeout <= 0 || this.config.providerTimeout <= 0) {
      throw new RPCError(
        'Timeouts must be positive values',
        PARALLEL_BROADCAST_ERRORS.INVALID_CONFIGURATION
      );
    }
  }

  /**
   * Initializes provider management
   */
  _initializeProviders(providers) {
    providers.forEach((provider, index) => {
      const providerId = provider.id || `provider_${index}`;
      
      const providerData = {
        id: providerId,
        provider: provider.provider || provider,
        name: provider.name || `Provider ${index}`,
        tier: provider.tier || 1,
        weight: provider.weight || 1,
        endpoint: provider.endpoint || 'unknown',
        enabled: provider.enabled !== false,
        
        // Configuration
        timeout: provider.timeout || this.config.providerTimeout,
        
        // State
        createdAt: Date.now(),
        lastUsed: null
      };

      this.providers.set(providerId, providerData);

      // Initialize health tracking
      this.providerHealth.set(providerId, {
        status: PROVIDER_HEALTH.UNKNOWN,
        lastCheck: null,
        consecutiveFailures: 0,
        consecutiveSuccesses: 0,
        lastError: null,
        healthScore: 100,
        responseTimeHistory: []
      });

      // Initialize metrics tracking
      this.providerMetrics.set(providerId, {
        totalRequests: 0,
        totalFailures: 0,
        totalLatency: 0,
        averageLatency: 0,
        successRate: 100,
        lastResponseTime: null,
        parallelBroadcasts: 0,
        parallelSuccesses: 0,
        parallelSuccessRate: 0,
        consensusAgreements: 0,
        consensusDisagreements: 0
      });
    });

    if (this.providers.size === 0) {
      throw new RPCError(
        'No valid providers configured',
        PARALLEL_BROADCAST_ERRORS.NO_PROVIDERS_AVAILABLE
      );
    }

    this.logger.info('Providers initialized', {
      total: this.providers.size,
      enabled: Array.from(this.providers.values()).filter(p => p.enabled).length
    });
  }

  /**
   * Validates broadcast request
   */
  async _validateBroadcastRequest(transactionRequest, options) {
    // Basic validation
    if (!transactionRequest || typeof transactionRequest !== 'object') {
      throw new RPCError(
        'Invalid transaction request',
        PARALLEL_BROADCAST_ERRORS.INVALID_
