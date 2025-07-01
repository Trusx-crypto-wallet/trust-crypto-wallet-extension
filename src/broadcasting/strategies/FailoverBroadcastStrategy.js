/**
 * @fileoverview Production Enterprise-grade Failover Broadcast Strategy for Trust Crypto Wallet Extension
 * @version 1.0.0
 * @author Trust Crypto Wallet Development Team
 * @license MIT
 * @description PRODUCTION-READY failover broadcast strategy with enterprise reliability and provider management
 */

import { EventEmitter } from 'events';
import { ethers } from 'ethers';

/**
 * Failover broadcast strategy error codes
 */
export const FAILOVER_BROADCAST_ERRORS = {
  // Configuration errors
  INVALID_CONFIGURATION: 'FAILOVER_INVALID_CONFIG',
  NO_PROVIDERS_AVAILABLE: 'FAILOVER_NO_PROVIDERS',
  INVALID_PROVIDER: 'FAILOVER_INVALID_PROVIDER',
  PROVIDER_LIMIT_EXCEEDED: 'FAILOVER_PROVIDER_LIMIT',
  
  // Broadcast errors
  ALL_PROVIDERS_FAILED: 'FAILOVER_ALL_FAILED',
  BROADCAST_TIMEOUT: 'FAILOVER_TIMEOUT',
  TRANSACTION_REJECTED: 'FAILOVER_TX_REJECTED',
  INSUFFICIENT_FUNDS: 'FAILOVER_INSUFFICIENT_FUNDS',
  
  // Provider errors
  PROVIDER_CONNECTION_FAILED: 'FAILOVER_PROVIDER_CONNECTION',
  PROVIDER_TIMEOUT: 'FAILOVER_PROVIDER_TIMEOUT',
  PROVIDER_RATE_LIMITED: 'FAILOVER_PROVIDER_RATE_LIMITED',
  PROVIDER_NETWORK_ERROR: 'FAILOVER_PROVIDER_NETWORK',
  
  // Transaction errors
  NONCE_TOO_LOW: 'FAILOVER_NONCE_LOW',
  GAS_PRICE_TOO_LOW: 'FAILOVER_GAS_PRICE_LOW',
  GAS_LIMIT_EXCEEDED: 'FAILOVER_GAS_LIMIT',
  REPLACEMENT_UNDERPRICED: 'FAILOVER_REPLACEMENT_UNDERPRICED'
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
 * Failover strategies
 */
export const FAILOVER_STRATEGIES = {
  SEQUENTIAL: 'sequential',           // Try providers in order
  PRIORITY: 'priority',               // Try by priority/tier
  PERFORMANCE: 'performance',         // Try by historical performance
  RANDOM: 'random'                    // Try in random order
};

/**
 * Network-specific failover configurations
 */
export const FAILOVER_CONFIGS = {
  1: { // Ethereum Mainnet
    name: 'ethereum',
    chainId: 1,
    maxProviders: 5,
    providerTimeout: 15000,             // 15 seconds per provider
    totalTimeout: 60000,                // 1 minute total
    retryAttempts: 2,
    retryDelay: 3000,
    healthCheckInterval: 30000,         // 30 seconds
    failureThreshold: 3,                // Failures before marking unhealthy
    recoveryThreshold: 2,               // Successes before marking healthy
    enableHealthMonitoring: true,
    enableMetrics: true,
    strategy: FAILOVER_STRATEGIES.PERFORMANCE
  },
  56: { // BSC
    name: 'bsc',
    chainId: 56,
    maxProviders: 4,
    providerTimeout: 8000,              // 8 seconds per provider
    totalTimeout: 30000,                // 30 seconds total
    retryAttempts: 2,
    retryDelay: 2000,
    healthCheckInterval: 20000,         // 20 seconds
    failureThreshold: 2,
    recoveryThreshold: 2,
    enableHealthMonitoring: true,
    enableMetrics: true,
    strategy: FAILOVER_STRATEGIES.PERFORMANCE
  },
  137: { // Polygon
    name: 'polygon',
    chainId: 137,
    maxProviders: 4,
    providerTimeout: 6000,              // 6 seconds per provider
    totalTimeout: 25000,                // 25 seconds total
    retryAttempts: 1,
    retryDelay: 1500,
    healthCheckInterval: 15000,         // 15 seconds
    failureThreshold: 2,
    recoveryThreshold: 1,
    enableHealthMonitoring: true,
    enableMetrics: true,
    strategy: FAILOVER_STRATEGIES.PERFORMANCE
  },
  42161: { // Arbitrum
    name: 'arbitrum',
    chainId: 42161,
    maxProviders: 3,
    providerTimeout: 5000,              // 5 seconds per provider
    totalTimeout: 15000,                // 15 seconds total
    retryAttempts: 1,
    retryDelay: 1000,
    healthCheckInterval: 10000,         // 10 seconds
    failureThreshold: 2,
    recoveryThreshold: 1,
    enableHealthMonitoring: true,
    enableMetrics: true,
    strategy: FAILOVER_STRATEGIES.SEQUENTIAL
  },
  10: { // Optimism
    name: 'optimism',
    chainId: 10,
    maxProviders: 3,
    providerTimeout: 5000,              // 5 seconds per provider
    totalTimeout: 15000,                // 15 seconds total
    retryAttempts: 1,
    retryDelay: 1000,
    healthCheckInterval: 10000,         // 10 seconds
    failureThreshold: 2,
    recoveryThreshold: 1,
    enableHealthMonitoring: true,
    enableMetrics: true,
    strategy: FAILOVER_STRATEGIES.SEQUENTIAL
  },
  43114: { // Avalanche
    name: 'avalanche',
    chainId: 43114,
    maxProviders: 4,
    providerTimeout: 6000,              // 6 seconds per provider
    totalTimeout: 20000,                // 20 seconds total
    retryAttempts: 2,
    retryDelay: 1500,
    healthCheckInterval: 15000,         // 15 seconds
    failureThreshold: 2,
    recoveryThreshold: 2,
    enableHealthMonitoring: true,
    enableMetrics: true,
    strategy: FAILOVER_STRATEGIES.PERFORMANCE
  }
};

/**
 * RPCError class for failover broadcast errors
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
 * Logger implementation for failover strategy
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
    this.maxGasLimit = options.maxGasLimit || BigInt('21000000');
    this.maxValue = options.maxValue || null;
    this.blacklistedAddresses = new Set(options.blacklistedAddresses || []);
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
}

/**
 * MetricsCollector for performance tracking
 */
export class MetricsCollector {
  constructor(options = {}) {
    this.component = options.component || 'failover_strategy';
    this.labels = options.labels || {};
    this.metrics = new Map();
    this.histograms = new Map();
  }

  increment(metric, labels = {}) {
    const key = this._generateKey(metric, labels);
    this.metrics.set(key, (this.metrics.get(key) || 0) + 1);
  }

  gauge(metric, value, labels = {}) {
    const key = this._generateKey(metric, labels);
    this.metrics.set(key, value);
  }

  histogram(metric, value, labels = {}) {
    const key = this._generateKey(metric, labels);
    const values = this.histograms.get(key) || [];
    values.push({ value, timestamp: Date.now() });
    
    // Keep only last 1000 values
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
    
    // Regular metrics
    for (const [key, value] of this.metrics.entries()) {
      result[key] = value;
    }
    
    // Histogram summaries
    for (const [key, values] of this.histograms.entries()) {
      if (values.length > 0) {
        const sorted = values.map(v => v.value).sort((a, b) => a - b);
        result[`${key}_count`] = values.length;
        result[`${key}_sum`] = sorted.reduce((a, b) => a + b, 0);
        result[`${key}_avg`] = result[`${key}_sum`] / values.length;
        result[`${key}_p50`] = sorted[Math.floor(sorted.length * 0.5)];
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
 * PRODUCTION Enterprise-grade Failover Broadcast Strategy
 * @class FailoverBroadcastStrategy
 * @extends EventEmitter
 */
export class FailoverBroadcastStrategy extends EventEmitter {
  constructor({
    chainId,
    providers = [],
    strategy = null,
    enableHealthMonitoring = true,
    enableMetrics = true,
    enableSecurityChecks = true,
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
    this.networkConfig = FAILOVER_CONFIGS[chainId];
    
    if (!this.networkConfig) {
      throw new Error(`Unsupported chain ID: ${chainId}`);
    }

    // Initialize components
    this.logger = new Logger('FailoverBroadcastStrategy');
    this.securityManager = new SecurityManager({
      enableTransactionValidation: enableSecurityChecks,
      ...security
    });
    
    this.metrics = new MetricsCollector({
      component: 'failover_broadcast_strategy',
      labels: { chainId: this.chainId, network: this.networkConfig.name },
      ...monitoring
    });

    // Configuration with custom overrides
    this.config = {
      ...this.networkConfig,
      ...customConfig,
      strategy: strategy || this.networkConfig.strategy,
      enableHealthMonitoring,
      enableMetrics,
      enableSecurityChecks
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
      failedBroadcasts: 0,
      totalProviderAttempts: 0,
      averageAttempts: 0,
      averageBroadcastTime: 0,
      providerReliability: {},
      failoverEffectiveness: 0
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

    this.logger.info('Production FailoverBroadcastStrategy initialized', {
      chainId: this.chainId,
      network: this.networkConfig.name,
      strategy: this.config.strategy,
      providersCount: this.providers.size,
      enableHealthMonitoring: this.config.enableHealthMonitoring
    });
  }

  /**
   * Broadcasts transaction using failover strategy
   */
  async broadcastTransaction(transactionRequest, options = {}) {
    const broadcastId = this._generateBroadcastId();
    const startTime = Date.now();
    const timer = this.metrics.timer('broadcast_duration');

    try {
      this.logger.info('Starting failover broadcast', {
        broadcastId,
        strategy: this.config.strategy,
        providersAvailable: this._getHealthyProviders().length
      });

      // Validate input
      await this._validateBroadcastRequest(transactionRequest, options);

      // Get providers in failover order
      const orderedProviders = this._getProvidersInFailoverOrder();

      if (orderedProviders.length === 0) {
        throw new RPCError(
          'No healthy providers available for failover',
          FAILOVER_BROADCAST_ERRORS.NO_PROVIDERS_AVAILABLE
        );
      }

      // Initialize broadcast data
      const broadcastData = {
        broadcastId,
        transactionRequest: { ...transactionRequest },
        options: { ...options },
        orderedProviders,
        
        // State tracking
        startTime,
        currentAttempt: 0,
        totalAttempts: 0,
        maxAttempts: Math.min(orderedProviders.length, this.config.maxProviders),
        
        // Results tracking
        attemptResults: [],
        lastError: null,
        
        // Final result
        transactionHash: null,
        finalResult: null
      };

      this.activeBroadcasts.set(broadcastId, broadcastData);

      // Execute failover broadcast
      const result = await this._executeFailoverBroadcast(broadcastData);

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
      strategy: 'FailoverBroadcastStrategy',
      network: {
        chainId: this.chainId,
        name: this.networkConfig.name
      },
      
      configuration: {
        strategy: this.config.strategy,
        maxProviders: this.config.maxProviders,
        providerTimeout: this.config.providerTimeout,
        totalTimeout: this.config.totalTimeout,
        retryAttempts: this.config.retryAttempts
      },
      
      performance: {
        totalBroadcasts: this.analytics.totalBroadcasts,
        successfulBroadcasts: this.analytics.successfulBroadcasts,
        failedBroadcasts: this.analytics.failedBroadcasts,
        successRate: this._calculateSuccessRate(),
        totalProviderAttempts: this.analytics.totalProviderAttempts,
        averageAttempts: this.analytics.averageAttempts,
        averageBroadcastTime: this.analytics.averageBroadcastTime,
        failoverEffectiveness: this.analytics.failoverEffectiveness
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
        priority: provider.priority || 0,
        tier: provider.tier || 1,
        lastCheck: health?.lastCheck || null,
        consecutiveFailures: health?.consecutiveFailures || 0,
        consecutiveSuccesses: health?.consecutiveSuccesses || 0,
        isHealthy: this._isProviderHealthy(providerId),
        
        metrics: {
          averageLatency: metrics?.averageLatency || 0,
          successRate: metrics?.successRate || 0,
          totalRequests: metrics?.totalRequests || 0,
          totalFailures: metrics?.totalFailures || 0,
          lastResponseTime: metrics?.lastResponseTime || null
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
    // Validate strategy
    if (!Object.values(FAILOVER_STRATEGIES).includes(this.config.strategy)) {
      throw new RPCError(
        `Invalid failover strategy: ${this.config.strategy}`,
        FAILOVER_BROADCAST_ERRORS.INVALID_CONFIGURATION
      );
    }

    // Validate timeouts
    if (this.config.providerTimeout <= 0 || this.config.totalTimeout <= 0) {
      throw new RPCError(
        'Timeouts must be positive values',
        FAILOVER_BROADCAST_ERRORS.INVALID_CONFIGURATION
      );
    }

    // Validate provider limits
    if (this.config.maxProviders <= 0) {
      throw new RPCError(
        'Max providers must be positive',
        FAILOVER_BROADCAST_ERRORS.INVALID_CONFIGURATION
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
        priority: provider.priority || index,
        tier: provider.tier || 1,
        weight: provider.weight || 1,
        endpoint: provider.endpoint || 'unknown',
        enabled: provider.enabled !== false,
        
        // Configuration
        timeout: provider.timeout || this.config.providerTimeout,
        retryAttempts: provider.retryAttempts || this.config.retryAttempts,
        
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
        requestHistory: []
      });
    });

    if (this.providers.size === 0) {
      throw new RPCError(
        'No valid providers configured',
        FAILOVER_BROADCAST_ERRORS.NO_PROVIDERS_AVAILABLE
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
        FAILOVER_BROADCAST_ERRORS.INVALID_CONFIGURATION
      );
    }

    // Check provider availability
    const healthyProviders = this._getHealthyProviders();
    if (healthyProviders.length === 0) {
      throw new RPCError(
        'No healthy providers available',
        FAILOVER_BROADCAST_ERRORS.NO_PROVIDERS_AVAILABLE
      );
    }

    // Security validation if enabled
    if (this.config.enableSecurityChecks) {
      await this._performSecurityValidation(transactionRequest);
    }
  }

  /**
   * Gets providers in failover order based on strategy
   */
  _getProvidersInFailoverOrder() {
    const healthyProviders = this._getHealthyProviders();
    
    switch (this.config.strategy) {
      case FAILOVER_STRATEGIES.SEQUENTIAL:
        return healthyProviders.sort((a, b) => a.priority - b.priority);
        
      case FAILOVER_STRATEGIES.PRIORITY:
        return healthyProviders.sort((a, b) => {
          // Sort by tier first, then priority
          if (a.tier !== b.tier) {
            return a.tier - b.tier;
          }
          return a.priority - b.priority;
        });
        
      case FAILOVER_STRATEGIES.PERFORMANCE:
        return this._sortByPerformance(healthyProviders);
        
      case FAILOVER_STRATEGIES.RANDOM:
        return this._shuffleArray([...healthyProviders]);
        
      default:
        return healthyProviders;
    }
  }

  /**
   * Executes the failover broadcast
   */
  async _executeFailoverBroadcast(broadcastData) {
    const { orderedProviders, transactionRequest, options } = broadcastData;
    const totalTimeout = options.totalTimeout || this.config.totalTimeout;
    const startTime = Date.now();

    for (let i = 0; i < orderedProviders.length && i < broadcastData.maxAttempts; i++) {
      const provider = orderedProviders[i];
      
      // Check total timeout
      if (Date.now() - startTime > totalTimeout) {
        throw new RPCError(
          `Total timeout exceeded: ${totalTimeout}ms`,
          FAILOVER_BROADCAST_ERRORS.BROADCAST_TIMEOUT
        );
      }

      broadcastData.currentAttempt = i + 1;
      broadcastData.totalAttempts++;

      try {
        this.logger.debug('Attempting failover broadcast', {
          broadcastId: broadcastData.broadcastId,
          providerId: provider.id,
          attempt: i + 1,
          totalProviders: orderedProviders.length
        });

        const result = await this._broadcastToProvider(provider, transactionRequest, {
          timeout: provider.timeout,
          attempt: i + 1
        });

        // Success - record and return
        const attemptResult = {
          providerId: provider.id,
          attempt: i + 1,
          success: true,
          transactionHash: result.hash,
          responseTime: Date.now() - startTime,
          result
        };

        broadcastData.attemptResults.push(attemptResult);
        broadcastData.transactionHash = result.hash;
        broadcastData.finalResult = result;

        this.emit('provider_success', {
          broadcastId: broadcastData.broadcastId,
          providerId: provider.id,
          attempt: i + 1,
          transactionHash: result.hash,
          responseTime: attemptResult.responseTime
        });

        return {
          success: true,
          broadcastId: broadcastData.broadcastId,
          strategy: 'failover',
          transactionHash: result.hash,
          successfulProvider: provider.id,
          totalAttempts: i + 1,
          responseTime: attemptResult.responseTime,
          result: result
        };

      } catch (error) {
        const attemptResult = {
          providerId: provider.id,
          attempt: i + 1,
          success: false,
          error: error.message,
          responseTime: Date.now() - startTime
        };

        broadcastData.attemptResults.push(attemptResult);
        broadcastData.lastError = error;

        this._recordProviderFailure(provider.id, error);

        this.emit('provider_failure', {
          broadcastId: broadcastData.broadcastId,
          providerId: provider.id,
          attempt: i + 1,
          error: error.message
        });

        // Continue to next provider if available
        if (i < orderedProviders.length - 1) {
          this.logger.warn('Provider failed, trying next', {
            broadcastId: broadcastData.broadcastId,
            failedProvider: provider.id,
            nextProvider: orderedProviders[i + 1].id,
            error: error.message
          });

          // Add retry delay if configured
          if (this.config.retryDelay > 0) {
            await new Promise(resolve => setTimeout(resolve, this.config.retryDelay));
          }
        }
      }
    }

    // All providers failed
    throw new RPCError(
      'All providers failed in failover strategy',
      FAILOVER_BROADCAST_ERRORS.ALL_PROVIDERS_FAILED,
      {
        broadcastId: broadcastData.broadcastId,
        attemptResults: broadcastData.attemptResults,
        totalAttempts: broadcastData.totalAttempts,
        lastError: broadcastData.lastError?.message
      }
    );
  }

  /**
   * Broadcasts to a single provider
   */
  async _broadcastToProvider(provider, transactionRequest, options = {}) {
    const startTime = Date.now();
    const timeout = options.timeout || this.config.providerTimeout;
    const attempt = options.attempt || 1;

    try {
      // Update metrics
      this._recordProviderRequest(provider.id);

      // Create timeout promise
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new RPCError(
            `Provider timeout after ${timeout}ms`,
            FAILOVER_BROADCAST_ERRORS.PROVIDER_TIMEOUT
          ));
        }, timeout);
      });

      // Execute broadcast with timeout
      const broadcastPromise = provider.provider.sendTransaction(transactionRequest);
      const result = await Promise.race([broadcastPromise, timeoutPromise]);

      // Record success metrics
      const responseTime = Date.now() - startTime;
      this._recordProviderSuccess(provider.id, responseTime);

      // Update provider last used
      this.providers.get(provider.id).lastUsed = Date.now();

      return result;

    } catch (error) {
      const responseTime = Date.now() - startTime;
      this._recordProviderFailure(provider.id, error, responseTime);
      
      // Categorize and re-throw error
      throw this._categorizeProviderError(error);
    }
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
   * Sorts providers by performance
   */
  _sortByPerformance(providers) {
    return providers.sort((a, b) => {
      const healthA = this.providerHealth.get(a.id);
      const healthB = this.providerHealth.get(b.id);
      const metricsA = this.providerMetrics.get(a.id);
      const metricsB = this.providerMetrics.get(b.id);

      // Primary sort: success rate (higher is better)
      const successRateA = metricsA?.successRate || 0;
      const successRateB = metricsB?.successRate || 0;
      const successRateDiff = successRateB - successRateA;
      
      if (Math.abs(successRateDiff) > 5) {
        return successRateDiff;
      }

      // Secondary sort: average latency (lower is better)
      const latencyA = metricsA?.averageLatency || Infinity;
      const latencyB = metricsB?.averageLatency || Infinity;
      const latencyDiff = latencyA - latencyB;
      
      if (Math.abs(latencyDiff) > 100) {
        return latencyDiff;
      }

      // Tertiary sort: health score (higher is better)
      const healthScoreA = healthA?.healthScore || 0;
      const healthScoreB = healthB?.healthScore || 0;
      
      return healthScoreB - healthScoreA;
    });
  }

  /**
   * Shuffles array for random strategy
   */
  _shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  /**
   * Records provider request
   */
  _recordProviderRequest(providerId) {
    const metrics = this.providerMetrics.get(providerId);
    if (metrics) {
      metrics.totalRequests++;
      metrics.requestHistory.push({
        timestamp: Date.now(),
        type: 'request'
      });

      // Keep only last 100 requests
      if (metrics.requestHistory.length > 100) {
        metrics.requestHistory.shift();
      }
    }

    this.metrics.increment('provider_requests_total', { providerId });
  }

  /**
   * Records provider success
   */
  _recordProviderSuccess(providerId, responseTime = null) {
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
          responseTime
        });

        // Keep only last 50 response times
        if (health.responseTimeHistory.length > 50) {
          health.responseTimeHistory.shift();
        }
      }
    }

    if (metrics && responseTime) {
      metrics.lastResponseTime = responseTime;
      metrics.totalLatency += responseTime;
      metrics.averageLatency = metrics.totalLatency / metrics.totalRequests;
      metrics.successRate = ((metrics.totalRequests - metrics.totalFailures) / metrics.totalRequests) * 100;

      metrics.requestHistory.push({
        timestamp: Date.now(),
        type: 'success',
        responseTime
      });
    }

    this.metrics.increment('provider_successes_total', { providerId });
    if (responseTime) {
      this.metrics.histogram('provider_response_time', responseTime, { providerId });
    }
  }

  /**
   * Records provider failure
   */
  _recordProviderFailure(providerId, error, responseTime = null) {
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
      
      metrics.requestHistory.push({
        timestamp: Date.now(),
        type: 'failure',
        error: error?.message,
        responseTime
      });
    }

    this.metrics.increment('provider_failures_total', { providerId, error: error?.code || 'unknown' });
  }

  /**
   * Categorizes provider errors for better handling
   */
  _categorizeProviderError(error) {
    const message = error.message?.toLowerCase() || '';
    const code = error.code || '';

    // Network errors
    if (message.includes('network') || message.includes('connection') || code === 'NETWORK_ERROR') {
      return new RPCError(error.message, FAILOVER_BROADCAST_ERRORS.PROVIDER_NETWORK_ERROR, { originalError: error });
    }

    // Timeout errors
    if (message.includes('timeout') || code === 'TIMEOUT') {
      return new RPCError(error.message, FAILOVER_BROADCAST_ERRORS.PROVIDER_TIMEOUT, { originalError: error });
    }

    // Rate limiting
    if (message.includes('rate limit') || message.includes('too many requests') || code === 'RATE_LIMITED') {
      return new RPCError(error.message, FAILOVER_BROADCAST_ERRORS.PROVIDER_RATE_LIMITED, { originalError: error });
    }

    // Transaction specific errors
    if (message.includes('nonce too low') || code === 'NONCE_EXPIRED') {
      return new RPCError(error.message, FAILOVER_BROADCAST_ERRORS.NONCE_TOO_LOW, { originalError: error });
    }

    if (message.includes('insufficient funds') || code === 'INSUFFICIENT_FUNDS') {
      return new RPCError(error.message, FAILOVER_BROADCAST_ERRORS.INSUFFICIENT_FUNDS, { originalError: error });
    }

    if (message.includes('gas price too low') || code === 'UNPREDICTABLE_GAS_LIMIT') {
      return new RPCError(error.message, FAILOVER_BROADCAST_ERRORS.GAS_PRICE_TOO_LOW, { originalError: error });
    }

    if (message.includes('replacement underpriced') || code === 'REPLACEMENT_UNDERPRICED') {
      return new RPCError(error.message, FAILOVER_BROADCAST_ERRORS.REPLACEMENT_UNDERPRICED, { originalError: error });
    }

    // Default to connection failed
    return new RPCError(error.message, FAILOVER_BROADCAST_ERRORS.PROVIDER_CONNECTION_FAILED, { originalError: error });
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
        FAILOVER_BROADCAST_ERRORS.INVALID_CONFIGURATION
      );
    }
  }

  /**
   * Generates unique broadcast ID
   */
  _generateBroadcastId() {
    return `failover_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Completes broadcast coordination
   */
  async _completeBroadcast(broadcastData, success, result) {
    const broadcastTime = Date.now() - broadcastData.startTime;

    // Update analytics
    this.analytics.totalBroadcasts++;
    this.analytics.totalProviderAttempts += broadcastData.totalAttempts;
    
    if (success) {
      this.analytics.successfulBroadcasts++;
    } else {
      this.analytics.failedBroadcasts++;
    }

    // Update average attempts
    this.analytics.averageAttempts = this.analytics.totalProviderAttempts / this.analytics.totalBroadcasts;

    // Update average broadcast time
    this.analytics.averageBroadcastTime = (
      (this.analytics.averageBroadcastTime * (this.analytics.totalBroadcasts - 1) + broadcastTime) / 
      this.analytics.totalBroadcasts
    );

    // Calculate failover effectiveness (successful broadcasts that required failover)
    const requiredFailover = broadcastData.totalAttempts > 1;
    if (success && requiredFailover) {
      const totalFailovers = this.broadcastHistory.filter(h => h.totalAttempts > 1 && h.success).length + 1;
      this.analytics.failoverEffectiveness = (totalFailovers / this.analytics.successfulBroadcasts) * 100;
    }

    // Store in history
    this.broadcastHistory.push({
      broadcastId: broadcastData.broadcastId,
      success,
      broadcastTime,
      totalAttempts: broadcastData.totalAttempts,
      attemptResults: broadcastData.attemptResults,
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
      totalAttempts: broadcastData.totalAttempts,
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

    this.logger.error('Failover broadcast failed', {
      broadcastId,
      error: error.message,
      broadcastTime
    });

    this.emit('broadcast_failed', {
      broadcastId,
      error: error.message,
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

        this._recordProviderSuccess(providerId, responseTime);
        
      } catch (error) {
        this._recordProviderFailure(providerId, error);
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
        totalFailures: metrics.totalFailures
      };
    }

    // Emit metrics update
    this.emit('metrics_updated', {
      analytics: this.getAnalytics(),
      metrics: this.metrics.getMetrics()
    });
  }

  /**
   * Calculates success rate
   */
  _calculateSuccessRate() {
    if (this.analytics.totalBroadcasts === 0) return 100;
    return (this.analytics.successfulBroadcasts / this.analytics.totalBroadcasts) * 100;
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
        priority: provider.priority,
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
          lastResponseTime: metrics?.lastResponseTime || null
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
        totalAttempts: broadcast.totalAttempts,
        timestamp: broadcast.timestamp,
        attemptResults: broadcast.attemptResults.map(attempt => ({
          providerId: attempt.providerId,
          attempt: attempt.attempt,
          success: attempt.success,
          responseTime: attempt.responseTime,
          error: attempt.error || null
        }))
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
    this.logger.info('Shutting down FailoverBroadcastStrategy');

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

    this.logger.info('FailoverBroadcastStrategy shutdown complete');
  }
}

// Export for use in other modules
export default FailoverBroadcastStrategy;
