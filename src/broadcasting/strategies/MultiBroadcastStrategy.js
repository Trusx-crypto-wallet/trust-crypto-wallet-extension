/**
 * @fileoverview Production Enterprise-grade Multi Broadcast Strategy for Trust Crypto Wallet Extension
 * @version 1.0.0
 * @author Trust Crypto Wallet Development Team
 * @license MIT
 * @description PRODUCTION-READY multi-provider broadcast strategy with enterprise reliability and failover features
 */

import { EventEmitter } from 'events';
import { ethers } from 'ethers';
import { RPCError, RPC_ERROR_CODES } from '../../providers/RPCBroadcastProvider.js';
import { SecurityManager } from '../../../security/SecurityManager.js';
import { MetricsCollector } from '../../../monitoring/MetricsCollector.js';
import { Logger } from '../../../utils/Logger.js';

/**
 * Multi broadcast strategy error codes
 */
export const MULTI_BROADCAST_ERRORS = {
  // Configuration errors
  INVALID_CONFIGURATION: 'MULTI_INVALID_CONFIG',
  NO_PROVIDERS_AVAILABLE: 'MULTI_NO_PROVIDERS',
  INSUFFICIENT_PROVIDERS: 'MULTI_INSUFFICIENT_PROVIDERS',
  INVALID_STRATEGY_MODE: 'MULTI_INVALID_MODE',
  
  // Broadcast errors
  ALL_BROADCASTS_FAILED: 'MULTI_ALL_FAILED',
  PARTIAL_BROADCAST_FAILURE: 'MULTI_PARTIAL_FAILURE',
  BROADCAST_TIMEOUT: 'MULTI_TIMEOUT',
  QUORUM_NOT_REACHED: 'MULTI_QUORUM_FAILED',
  
  // Provider errors
  PROVIDER_FAILURE: 'MULTI_PROVIDER_FAILURE',
  PROVIDER_TIMEOUT: 'MULTI_PROVIDER_TIMEOUT',
  PROVIDER_RATE_LIMITED: 'MULTI_PROVIDER_RATE_LIMITED',
  PROVIDER_INCONSISTENCY: 'MULTI_PROVIDER_INCONSISTENCY',
  
  // Coordination errors
  NONCE_MISMATCH: 'MULTI_NONCE_MISMATCH',
  HASH_MISMATCH: 'MULTI_HASH_MISMATCH',
  CONSENSUS_FAILURE: 'MULTI_CONSENSUS_FAILURE',
  COORDINATION_TIMEOUT: 'MULTI_COORDINATION_TIMEOUT'
};

/**
 * Multi broadcast strategy modes
 */
export const BROADCAST_MODES = {
  FAILOVER: 'failover',               // Try providers sequentially until success
  PARALLEL: 'parallel',               // Broadcast to all providers simultaneously
  QUORUM: 'quorum',                   // Require minimum number of successful broadcasts
  RACING: 'racing',                   // Race all providers, use first success
  CONSENSUS: 'consensus'              // Require majority consensus on result
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
 * Broadcast result states
 */
export const BROADCAST_RESULT_STATES = {
  SUCCESS: 'success',                 // Broadcast completed successfully
  PARTIAL_SUCCESS: 'partial_success', // Some providers succeeded
  FAILURE: 'failure',                 // All providers failed
  TIMEOUT: 'timeout',                 // Operation timed out
  CANCELLED: 'cancelled'              // Operation was cancelled
};

/**
 * Network-specific multi-broadcast configurations
 */
export const MULTI_BROADCAST_CONFIGS = {
  1: { // Ethereum Mainnet
    name: 'ethereum',
    chainId: 1,
    defaultMode: BROADCAST_MODES.QUORUM,
    quorumSize: 2,                          // Minimum successful broadcasts
    maxProviders: 5,                        // Maximum providers to use
    coordinationTimeout: 45000,             // 45 seconds total timeout
    providerTimeout: 15000,                 // 15 seconds per provider
    retryAttempts: 2,
    retryDelay: 3000,
    enableConsensusValidation: true,
    healthCheckInterval: 30000,             // 30 seconds
    providerFailureThreshold: 3,            // Failures before marking unhealthy
    providerRecoveryThreshold: 2,           // Successes before marking healthy
    enableLoadBalancing: true,
    loadBalancingStrategy: 'weighted_round_robin'
  },
  56: { // BSC
    name: 'bsc',
    chainId: 56,
    defaultMode: BROADCAST_MODES.RACING,
    quorumSize: 2,
    maxProviders: 4,
    coordinationTimeout: 25000,             // 25 seconds
    providerTimeout: 8000,                  // 8 seconds per provider
    retryAttempts: 2,
    retryDelay: 2000,
    enableConsensusValidation: false,
    healthCheckInterval: 20000,
    providerFailureThreshold: 2,
    providerRecoveryThreshold: 2,
    enableLoadBalancing: true,
    loadBalancingStrategy: 'fastest_response'
  },
  137: { // Polygon
    name: 'polygon',
    chainId: 137,
    defaultMode: BROADCAST_MODES.PARALLEL,
    quorumSize: 2,
    maxProviders: 4,
    coordinationTimeout: 20000,             // 20 seconds
    providerTimeout: 6000,                  // 6 seconds per provider
    retryAttempts: 1,
    retryDelay: 1500,
    enableConsensusValidation: false,
    healthCheckInterval: 15000,
    providerFailureThreshold: 2,
    providerRecoveryThreshold: 1,
    enableLoadBalancing: true,
    loadBalancingStrategy: 'least_latency'
  },
  42161: { // Arbitrum
    name: 'arbitrum',
    chainId: 42161,
    defaultMode: BROADCAST_MODES.FAILOVER,
    quorumSize: 1,
    maxProviders: 3,
    coordinationTimeout: 15000,             // 15 seconds
    providerTimeout: 5000,                  // 5 seconds per provider
    retryAttempts: 1,
    retryDelay: 1000,
    enableConsensusValidation: false,
    healthCheckInterval: 10000,
    providerFailureThreshold: 2,
    providerRecoveryThreshold: 1,
    enableLoadBalancing: false,             // L2 doesn't need complex load balancing
    loadBalancingStrategy: 'round_robin'
  },
  10: { // Optimism
    name: 'optimism',
    chainId: 10,
    defaultMode: BROADCAST_MODES.FAILOVER,
    quorumSize: 1,
    maxProviders: 3,
    coordinationTimeout: 15000,
    providerTimeout: 5000,
    retryAttempts: 1,
    retryDelay: 1000,
    enableConsensusValidation: false,
    healthCheckInterval: 10000,
    providerFailureThreshold: 2,
    providerRecoveryThreshold: 1,
    enableLoadBalancing: false,
    loadBalancingStrategy: 'round_robin'
  },
  43114: { // Avalanche
    name: 'avalanche',
    chainId: 43114,
    defaultMode: BROADCAST_MODES.RACING,
    quorumSize: 2,
    maxProviders: 4,
    coordinationTimeout: 20000,             // 20 seconds
    providerTimeout: 6000,                  // 6 seconds per provider
    retryAttempts: 2,
    retryDelay: 1500,
    enableConsensusValidation: false,
    healthCheckInterval: 15000,             // 15 seconds
    providerFailureThreshold: 2,            // Failures before marking unhealthy
    providerRecoveryThreshold: 2,           // Successes before marking healthy
    enableLoadBalancing: true,
    loadBalancingStrategy: 'fastest_response'
  }
};

/**
 * PRODUCTION Enterprise-grade Multi Broadcast Strategy
 * @class MultiBroadcastStrategy
 * @extends EventEmitter
 */
export class MultiBroadcastStrategy extends EventEmitter {
  constructor({
    chainId,
    providers = [],
    mode = null,
    quorumSize = null,
    enableAnalytics = true,
    enableSecurityChecks = true,
    enableHealthMonitoring = true,
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
    this.networkConfig = MULTI_BROADCAST_CONFIGS[chainId];
    
    if (!this.networkConfig) {
      throw new Error(`Unsupported chain ID: ${chainId}`);
    }

    // Initialize components
    this.logger = new Logger('MultiBroadcastStrategy');
    this.securityManager = new SecurityManager({
      enableTransactionValidation: enableSecurityChecks,
      enableProviderValidation: true,
      enableConsensusValidation: this.networkConfig.enableConsensusValidation,
      ...security
    });
    
    this.metrics = new MetricsCollector({
      component: 'multi_broadcast_strategy',
      labels: { chainId: this.chainId, network: this.networkConfig.name },
      ...monitoring
    });

    // Configuration with custom overrides
    this.config = {
      ...this.networkConfig,
      ...customConfig,
      mode: mode || this.networkConfig.defaultMode,
      quorumSize: quorumSize || this.networkConfig.quorumSize,
      enableAnalytics,
      enableSecurityChecks,
      enableHealthMonitoring,
      
      // Performance settings
      maxConcurrentBroadcasts: 10,
      batchSize: 5,
      enableOptimizations: true,
      
      // Monitoring settings
      enableMetrics: enableAnalytics,
      enableDetailedLogging: true,
      
      // Failsafe settings
      enableTransactionValidation: enableSecurityChecks,
      enableProviderValidation: true,
      enableResultValidation: true
    };

    // Validate configuration
    this._validateConfiguration();

    // Provider management
    this.providers = new Map();           // providerId -> ProviderData
    this.providerHealth = new Map();     // providerId -> HealthData
    this.providerMetrics = new Map();    // providerId -> MetricsData
    this.loadBalancer = null;

    // State management
    this.activeBroadcasts = new Map();   // broadcastId -> BroadcastData
    this.broadcastHistory = [];
    this.coordinatorState = {
      currentRound: 0,
      activeCoordinations: 0,
      totalCoordinations: 0
    };

    // Performance tracking
    this.analytics = {
      totalBroadcasts: 0,
      successfulBroadcasts: 0,
      partialSuccesses: 0,
      failedBroadcasts: 0,
      averageCoordinationTime: 0,
      averageProviderResponseTime: 0,
      providerReliability: {},
      consensusAgreement: 0,
      quorumAchievementRate: 0
    };

    // Initialize providers and load balancer
    this._initializeProviders(providers);
    this._initializeLoadBalancer();

    // Start health monitoring if enabled
    if (this.config.enableHealthMonitoring) {
      this._startHealthMonitoring();
    }

    // Start analytics monitoring if enabled
    if (this.config.enableAnalytics) {
      this._startAnalyticsMonitoring();
    }

    this.startTime = Date.now();

    this.logger.info('Production MultiBroadcastStrategy initialized', {
      chainId: this.chainId,
      network: this.networkConfig.name,
      mode: this.config.mode,
      providersCount: this.providers.size,
      quorumSize: this.config.quorumSize,
      enableHealthMonitoring: this.config.enableHealthMonitoring
    });
  }

  /**
   * Broadcasts transaction using multi-provider strategy
   */
  async broadcastTransaction(transactionRequest, options = {}) {
    const broadcastId = this._generateBroadcastId();
    const startTime = Date.now();

    try {
      this.logger.info('Starting multi-provider broadcast', {
        broadcastId,
        mode: this.config.mode,
        providersAvailable: this._getHealthyProviders().length,
        quorumSize: this.config.quorumSize
      });

      // Validate input
      await this._validateBroadcastRequest(transactionRequest, options);

      // Select providers for this broadcast
      const selectedProviders = await this._selectProvidersForBroadcast(options);

      // Initialize broadcast coordination
      const broadcastData = {
        broadcastId,
        mode: options.mode || this.config.mode,
        transactionRequest: { ...transactionRequest },
        options: { ...options },
        selectedProviders,
        
        // Coordination state
        startTime,
        coordinationTimeout: options.coordinationTimeout || this.config.coordinationTimeout,
        providerTimeout: options.providerTimeout || this.config.providerTimeout,
        
        // Results tracking
        providerResults: new Map(),      // providerId -> result
        successfulProviders: [],
        failedProviders: [],
        
        // Status tracking
        state: 'coordinating',
        attempts: 0,
        maxAttempts: options.retryAttempts || this.config.retryAttempts,
        
        // Analytics
        coordinationTime: null,
        consensusReached: false,
        quorumAchieved: false,
        
        // Final results
        transactionHash: null,
        finalResult: null
      };

      this.activeBroadcasts.set(broadcastId, broadcastData);
      this.coordinatorState.activeCoordinations++;

      // Execute broadcast strategy
      const result = await this._executeBroadcastStrategy(broadcastData);

      // Complete coordination
      await this._completeBroadcastCoordination(broadcastData, true, result);

      return result;

    } catch (error) {
      await this._handleBroadcastCoordinationError(broadcastId, error, startTime);
      throw error;
    } finally {
      this.activeBroadcasts.delete(broadcastId);
      this.coordinatorState.activeCoordinations--;
    }
  }

  /**
   * Gets current strategy analytics
   */
  getAnalytics() {
    return {
      strategy: 'MultiBroadcastStrategy',
      network: {
        chainId: this.chainId,
        name: this.networkConfig.name
      },
      
      configuration: {
        mode: this.config.mode,
        quorumSize: this.config.quorumSize,
        maxProviders: this.config.maxProviders,
        coordinationTimeout: this.config.coordinationTimeout,
        enableConsensusValidation: this.config.enableConsensusValidation
      },
      
      performance: {
        totalBroadcasts: this.analytics.totalBroadcasts,
        successfulBroadcasts: this.analytics.successfulBroadcasts,
        partialSuccesses: this.analytics.partialSuccesses,
        failedBroadcasts: this.analytics.failedBroadcasts,
        successRate: this._calculateSuccessRate(),
        partialSuccessRate: this._calculatePartialSuccessRate(),
        averageCoordinationTime: this.analytics.averageCoordinationTime,
        averageProviderResponseTime: this.analytics.averageProviderResponseTime,
        quorumAchievementRate: this.analytics.quorumAchievementRate,
        consensusAgreement: this.analytics.consensusAgreement
      },
      
      providers: this._getProviderAnalytics(),
      
      coordination: {
        activeCoordinations: this.coordinatorState.activeCoordinations,
        totalCoordinations: this.coordinatorState.totalCoordinations,
        currentRound: this.coordinatorState.currentRound
      },
      
      loadBalancing: this.loadBalancer ? this.loadBalancer.getStats() : null,
      
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
   * Internal methods for broadcast coordination
   */

  /**
   * Validates configuration on initialization
   */
  _validateConfiguration() {
    // Validate mode
    if (!Object.values(BROADCAST_MODES).includes(this.config.mode)) {
      throw new RPCError(
        `Invalid broadcast mode: ${this.config.mode}`,
        MULTI_BROADCAST_ERRORS.INVALID_STRATEGY_MODE
      );
    }

    // Validate quorum size
    if (this.config.mode === BROADCAST_MODES.QUORUM || this.config.mode === BROADCAST_MODES.CONSENSUS) {
      if (this.config.quorumSize < 1) {
        throw new RPCError(
          'Quorum size must be at least 1',
          MULTI_BROADCAST_ERRORS.INVALID_CONFIGURATION
        );
      }
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
        weight: provider.weight || 1,
        tier: provider.tier || 1,
        endpoint: provider.endpoint || 'unknown',
        enabled: provider.enabled !== false,
        
        // Configuration
        timeout: provider.timeout || this.config.providerTimeout,
        retryAttempts: provider.retryAttempts || 1,
        
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
        healthScore: 100
      });

      // Initialize metrics tracking
      this.providerMetrics.set(providerId, {
        totalRequests: 0,
        totalFailures: 0,
        totalLatency: 0,
        averageLatency: 0,
        successRate: 100,
        lastResponseTime: null,
        throughput: 0
      });
    });

    if (this.providers.size === 0) {
      throw new RPCError(
        'No valid providers configured',
        MULTI_BROADCAST_ERRORS.NO_PROVIDERS_AVAILABLE
      );
    }

    this.logger.info('Providers initialized', {
      total: this.providers.size,
      enabled: Array.from(this.providers.values()).filter(p => p.enabled).length
    });
  }

  /**
   * Initializes load balancer
   */
  _initializeLoadBalancer() {
    if (!this.config.enableLoadBalancing) {
      return;
    }

    this.loadBalancer = {
      strategy: this.config.loadBalancingStrategy,
      lastUsedIndex: 0,
      responseTimeHistory: new Map(),
      
      getStats: () => ({
        strategy: this.config.loadBalancingStrategy,
        totalSelections: this.coordinatorState.totalCoordinations,
        averageSelectionTime: 0
      }),
      
      selectProvider: (availableProviders) => {
        return this._executeLoadBalancingStrategy(availableProviders);
      }
    };
  }

  /**
   * Validates broadcast request
   */
  async _validateBroadcastRequest(transactionRequest, options) {
    // Basic validation
    if (!transactionRequest || typeof transactionRequest !== 'object') {
      throw new RPCError(
        'Invalid transaction request',
        MULTI_BROADCAST_ERRORS.INVALID_CONFIGURATION
      );
    }

    // Check provider availability
    const healthyProviders = this._getHealthyProviders();
    if (healthyProviders.length === 0) {
      throw new RPCError(
        'No healthy providers available',
        MULTI_BROADCAST_ERRORS.NO_PROVIDERS_AVAILABLE
      );
    }

    // Validate quorum requirements
    const requiredQuorum = options.quorumSize || this.config.quorumSize;
    if (this.config.mode === BROADCAST_MODES.QUORUM && healthyProviders.length < requiredQuorum) {
      throw new RPCError(
        `Insufficient providers for quorum: need ${requiredQuorum}, have ${healthyProviders.length}`,
        MULTI_BROADCAST_ERRORS.INSUFFICIENT_PROVIDERS
      );
    }

    // Security validation if enabled
    if (this.config.enableSecurityChecks) {
      await this._performSecurityValidation(transactionRequest);
    }
  }

  /**
   * Selects providers for broadcast based on strategy and health
   */
  async _selectProvidersForBroadcast(options) {
    const healthyProviders = this._getHealthyProviders();
    const maxProviders = Math.min(
      options.maxProviders || this.config.maxProviders,
      healthyProviders.length
    );

    let selectedProviders = [];

    switch (this.config.mode) {
      case BROADCAST_MODES.FAILOVER:
        // Select providers in order of reliability
        selectedProviders = this._selectByReliability(healthyProviders, maxProviders);
        break;
        
      case BROADCAST_MODES.PARALLEL:
      case BROADCAST_MODES.RACING:
        // Select all available providers up to max
        selectedProviders = healthyProviders.slice(0, maxProviders);
        break;
        
      case BROADCAST_MODES.QUORUM:
      case BROADCAST_MODES.CONSENSUS:
        // Select providers ensuring quorum can be met
        const requiredQuorum = options.quorumSize || this.config.quorumSize;
        selectedProviders = this._selectForQuorum(healthyProviders, requiredQuorum, maxProviders);
        break;
        
      default:
        selectedProviders = healthyProviders.slice(0, maxProviders);
    }

    if (selectedProviders.length === 0) {
      throw new RPCError(
        'No providers selected for broadcast',
        MULTI_BROADCAST_ERRORS.NO_PROVIDERS_AVAILABLE
      );
    }

    this.logger.debug('Providers selected for broadcast', {
      mode: this.config.mode,
      selected: selectedProviders.length,
      available: healthyProviders.length,
      providers: selectedProviders.map(p => p.id)
    });

    return selectedProviders;
  }

  /**
   * Executes the specific broadcast strategy
   */
  async _executeBroadcastStrategy(broadcastData) {
    this.coordinatorState.totalCoordinations++;
    
    switch (broadcastData.mode) {
      case BROADCAST_MODES.FAILOVER:
        return await this._executeFailoverStrategy(broadcastData);
        
      case BROADCAST_MODES.PARALLEL:
        return await this._executeParallelStrategy(broadcastData);
        
      case BROADCAST_MODES.RACING:
        return await this._executeRacingStrategy(broadcastData);
        
      case BROADCAST_MODES.QUORUM:
        return await this._executeQuorumStrategy(broadcastData);
        
      case BROADCAST_MODES.CONSENSUS:
        return await this._executeConsensusStrategy(broadcastData);
        
      default:
        throw new RPCError(
          `Unsupported broadcast mode: ${broadcastData.mode}`,
          MULTI_BROADCAST_ERRORS.INVALID_STRATEGY_MODE
        );
    }
  }

  /**
   * Executes failover strategy - try providers sequentially
   */
  async _executeFailoverStrategy(broadcastData) {
    const { selectedProviders, transactionRequest } = broadcastData;

    for (let i = 0; i < selectedProviders.length; i++) {
      const provider = selectedProviders[i];
      
      try {
        this.logger.debug('Attempting failover broadcast', {
          broadcastId: broadcastData.broadcastId,
          providerId: provider.id,
          attempt: i + 1,
          totalProviders: selectedProviders.length
        });

        const result = await this._broadcastToProvider(provider, transactionRequest, {
          timeout: broadcastData.providerTimeout,
          attempt: i + 1
        });

        // Success - record and return
        broadcastData.successfulProviders.push(provider.id);
        broadcastData.transactionHash = result.hash;
        broadcastData.finalResult = result;

        this.emit('provider_success', {
          broadcastId: broadcastData.broadcastId,
          providerId: provider.id,
          attempt: i + 1,
          transactionHash: result.hash
        });

        return {
          success: true,
          broadcastId: broadcastData.broadcastId,
          mode: BROADCAST_MODES.FAILOVER,
          transactionHash: result.hash,
          successfulProviders: [provider.id],
          failedProviders: broadcastData.failedProviders,
          totalAttempts: i + 1,
          result: result
        };

      } catch (error) {
        broadcastData.failedProviders.push({
          providerId: provider.id,
          error: error.message,
          attempt: i + 1
        });

        this._recordProviderFailure(provider.id, error);

        this.emit('provider_failure', {
          broadcastId: broadcastData.broadcastId,
          providerId: provider.id,
          attempt: i + 1,
          error: error.message
        });

        // Continue to next provider if available
        if (i < selectedProviders.length - 1) {
          this.logger.warn('Provider failed, trying next', {
            broadcastId: broadcastData.broadcastId,
            failedProvider: provider.id,
            nextProvider: selectedProviders[i + 1].id,
            error: error.message
          });
        }
      }
    }

    // All providers failed
    throw new RPCError(
      'All providers failed in failover strategy',
      MULTI_BROADCAST_ERRORS.ALL_BROADCASTS_FAILED,
      {
        broadcastId: broadcastData.broadcastId,
        failedProviders: broadcastData.failedProviders,
        totalAttempts: selectedProviders.length
      }
    );
  }

  /**
   * Executes parallel strategy - broadcast to all providers simultaneously
   */
  async _executeParallelStrategy(broadcastData) {
    const { selectedProviders, transactionRequest } = broadcastData;

    this.logger.debug('Executing parallel broadcast', {
      broadcastId: broadcastData.broadcastId,
      providers: selectedProviders.length
    });

    // Create broadcast promises for all providers
    const broadcastPromises = selectedProviders.map(provider => 
      this._broadcastToProvider(provider, transactionRequest, {
        timeout: broadcastData.providerTimeout
      }).then(result => ({
        success: true,
        providerId: provider.id,
        result
      })).catch(error => ({
        success: false,
        providerId: provider.id,
        error: error.message
      }))
    );

    // Wait for all broadcasts to complete
    const results = await Promise.allSettled(broadcastPromises);

    // Process results
    const successfulResults = [];
    const failedResults = [];

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        const broadcastResult = result.value;
        
        if (broadcastResult.success) {
          successfulResults.push(broadcastResult);
          broadcastData.successfulProviders.push(broadcastResult.providerId);
          this._recordProviderSuccess(broadcastResult.providerId);
          
          this.emit('provider_success', {
            broadcastId: broadcastData.broadcastId,
            providerId: broadcastResult.providerId,
            transactionHash: broadcastResult.result.hash
          });
        } else {
          failedResults.push(broadcastResult);
          broadcastData.failedProviders.push({
            providerId: broadcastResult.providerId,
            error: broadcastResult.error
          });
          this._recordProviderFailure(broadcastResult.providerId, new Error(broadcastResult.error));
          
          this.emit('provider_failure', {
            broadcastId: broadcastData.broadcastId,
            providerId: broadcastResult.providerId,
            error: broadcastResult.error
          });
        }
      } else {
        const provider = selectedProviders[index];
        failedResults.push({
          providerId: provider.id,
          error: result.reason?.message || 'Unknown error'
        });
        broadcastData.failedProviders.push({
          providerId: provider.id,
          error: result.reason?.message || 'Unknown error'
        });
        this._recordProviderFailure(provider.id, result.reason);
      }
    });

    // Determine final result
    if (successfulResults.length > 0) {
      // At least one success
      const primaryResult = successfulResults[0];
      broadcastData.transactionHash = primaryResult.result.hash;
      broadcastData.finalResult = primaryResult.result;

      // Validate consensus if enabled
      if (this.config.enableConsensusValidation && successfulResults.length > 1) {
        const consensusValid = this._validateResultConsensus(successfulResults);
        if (!consensusValid) {
          this.logger.warn('Consensus validation failed in parallel broadcast', {
            broadcastId: broadcastData.broadcastId,
            successfulProviders: successfulResults.length
          });
        }
      }

      return {
        success: true,
        broadcastId: broadcastData.broadcastId,
        mode: BROADCAST_MODES.PARALLEL,
        transactionHash: primaryResult.result.hash,
        successfulProviders: successfulResults.map(r => r.providerId),
        failedProviders: failedResults.map(r => r.providerId),
        totalProviders: selectedProviders.length,
        successRate: (successfulResults.length / selectedProviders.length) * 100,
        result: primaryResult.result
      };
    } else {
      // All failed
      throw new RPCError(
        'All providers failed in parallel strategy',
        MULTI_BROADCAST_ERRORS.ALL_BROADCASTS_FAILED,
        {
          broadcastId: broadcastData.broadcastId,
          failedProviders: failedResults,
          totalProviders: selectedProviders.length
        }
      );
    }
  }

  /**
   * Executes racing strategy - use first successful result
   */
  async _executeRacingStrategy(broadcastData) {
    const { selectedProviders, transactionRequest } = broadcastData;

    this.logger.debug('Executing racing broadcast', {
      broadcastId: broadcastData.broadcastId,
      providers: selectedProviders.length
    });

    // Create racing promises
    const racingPromises = selectedProviders.map(provider => 
      this._broadcastToProvider(provider, transactionRequest, {
        timeout: broadcastData.providerTimeout
      }).then(result => ({
        providerId: provider.id,
        result
      }))
    );

    try {
      // Wait for first success or all failures
      const winnerResult = await Promise.any(racingPromises);

      broadcastData.successfulProviders.push(winnerResult.providerId);
      broadcastData.transactionHash = winnerResult.result.hash;
      broadcastData.finalResult = winnerResult.result;

      this._recordProviderSuccess(winnerResult.providerId);

      this.emit('provider_success', {
        broadcastId: broadcastData.broadcastId,
        providerId: winnerResult.providerId,
        transactionHash: winnerResult.result.hash,
        winner: true
      });

      return {
        success: true,
        broadcastId: broadcastData.broadcastId,
        mode: BROADCAST_MODES.RACING,
        transactionHash: winnerResult.result.hash,
        winnerProvider: winnerResult.providerId,
        successfulProviders: [winnerResult.providerId],
        totalProviders: selectedProviders.length,
        result: winnerResult.result
      };

    } catch (error) {
      // All promises rejected - get detailed error info
      const allResults = await Promise.allSettled(racingPromises);
      const failedProviders = allResults.map((result, index) => ({
        providerId: selectedProviders[index].id,
        error: result.reason?.message || 'Unknown error'
      }));

      broadcastData.failedProviders = failedProviders;

      // Record all failures
      failedProviders.forEach(failure => {
        this._recordProviderFailure(failure.providerId, new Error(failure.error));
        
        this.emit('provider_failure', {
          broadcastId: broadcastData.broadcastId,
          providerId: failure.providerId,
          error: failure.error
        });
      });

      throw new RPCError(
        'All providers failed in racing strategy',
        MULTI_BROADCAST_ERRORS.ALL_BROADCASTS_FAILED,
        {
          broadcastId: broadcastData.broadcastId,
          failedProviders,
          totalProviders: selectedProviders.length
        }
      );
    }
  }

  /**
   * Executes quorum strategy - require minimum successful broadcasts
   */
  async _executeQuorumStrategy(broadcastData) {
    const { selectedProviders, transactionRequest } = broadcastData;
    const requiredQuorum = broadcastData.options.quorumSize || this.config.quorumSize;

    this.logger.debug('Executing quorum broadcast', {
      broadcastId: broadcastData.broadcastId,
      providers: selectedProviders.length,
      requiredQuorum
    });

    // Execute parallel broadcasts
    const parallelResult = await this._executeParallelStrategy(broadcastData);

    // Check if quorum was achieved
    const successfulCount = broadcastData.successfulProviders.length;
    const quorumAchieved = successfulCount >= requiredQuorum;

    broadcastData.quorumAchieved = quorumAchieved;

    if (quorumAchieved) {
      this.analytics.quorumAchievementRate = this._updateQuorumAchievementRate(true);
      
      return {
        ...parallelResult,
        mode: BROADCAST_MODES.QUORUM,
        quorumAchieved: true,
        requiredQuorum,
        actualQuorum: successfulCount
      };
    } else {
      this.analytics.quorumAchievementRate = this._updateQuorumAchievementRate(false);
      
      throw new RPCError(
        `Quorum not reached: need ${requiredQuorum}, got ${successfulCount}`,
        MULTI_BROADCAST_ERRORS.QUORUM_NOT_REACHED,
        {
          broadcastId: broadcastData.broadcastId,
          requiredQuorum,
          actualQuorum: successfulCount,
          successfulProviders: broadcastData.successfulProviders,
          failedProviders: broadcastData.failedProviders
        }
      );
    }
  }

  /**
   * Executes consensus strategy - require majority agreement on result
   */
  async _executeConsensusStrategy(broadcastData) {
    const { selectedProviders, transactionRequest } = broadcastData;

    this.logger.debug('Executing consensus broadcast', {
      broadcastId: broadcastData.broadcastId,
      providers: selectedProviders.length
    });

    // Execute parallel broadcasts
    const parallelResult = await this._executeParallelStrategy(broadcastData);

    // Validate consensus among successful results
    if (broadcastData.successfulProviders.length > 1) {
      const consensusValid = this._validateDetailedConsensus(broadcastData);
      broadcastData.consensusReached = consensusValid;

      if (!consensusValid) {
        throw new RPCError(
          'Consensus not reached among providers',
          MULTI_BROADCAST_ERRORS.CONSENSUS_FAILURE,
          {
            broadcastId: broadcastData.broadcastId,
            successfulProviders: broadcastData.successfulProviders.length,
            consensusRequired: true
          }
        );
      }

      this.analytics.consensusAgreement = this._updateConsensusAgreement(true);
    } else {
      // Single provider success automatically has consensus
      broadcastData.consensusReached = true;
      this.analytics.consensusAgreement = this._updateConsensusAgreement(true);
    }

    return {
      ...parallelResult,
      mode: BROADCAST_MODES.CONSENSUS,
      consensusReached: broadcastData.consensusReached,
      consensusProviders: broadcastData.successfulProviders.length
    };
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
            MULTI_BROADCAST_ERRORS.PROVIDER_TIMEOUT
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
      
      throw error;
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
    const hasRecentActivity = health.lastCheck && (Date.now() - health.lastCheck) < (this.config.healthCheckInterval * 2);
    const belowFailureThreshold = health.consecutiveFailures < this.config.providerFailureThreshold;

    return isNotFailed && belowFailureThreshold;
  }

  /**
   * Selects providers by reliability
   */
  _selectByReliability(providers, maxCount) {
    return providers
      .sort((a, b) => {
        const healthA = this.providerHealth.get(a.id);
        const healthB = this.providerHealth.get(b.id);
        const metricsA = this.providerMetrics.get(a.id);
        const metricsB = this.providerMetrics.get(b.id);

        // Sort by success rate first, then by average latency
        const successRateDiff = (metricsB?.successRate || 0) - (metricsA?.successRate || 0);
        if (Math.abs(successRateDiff) > 5) {
          return successRateDiff;
        }

        return (metricsA?.averageLatency || Infinity) - (metricsB?.averageLatency || Infinity);
      })
      .slice(0, maxCount);
  }

  /**
   * Selects providers for quorum
   */
  _selectForQuorum(providers, requiredQuorum, maxCount) {
    const reliable = this._selectByReliability(providers, maxCount);
    
    if (reliable.length < requiredQuorum) {
      throw new RPCError(
        `Cannot form quorum: need ${requiredQuorum}, have ${reliable.length} reliable providers`,
        MULTI_BROADCAST_ERRORS.INSUFFICIENT_PROVIDERS
      );
    }

    return reliable;
  }

  /**
   * Executes load balancing strategy
   */
  _executeLoadBalancingStrategy(providers) {
    switch (this.config.loadBalancingStrategy) {
      case 'round_robin':
        return this._roundRobinSelection(providers);
      case 'weighted_round_robin':
        return this._weightedRoundRobinSelection(providers);
      case 'least_latency':
        return this._leastLatencySelection(providers);
      case 'fastest_response':
        return this._fastestResponseSelection(providers);
      default:
        return providers[0]; // Default to first provider
    }
  }

  /**
   * Round robin provider selection
   */
  _roundRobinSelection(providers) {
    const index = this.loadBalancer.lastUsedIndex % providers.length;
    this.loadBalancer.lastUsedIndex++;
    return providers[index];
  }

  /**
   * Weighted round robin provider selection
   */
  _weightedRoundRobinSelection(providers) {
    const totalWeight = providers.reduce((sum, p) => sum + (p.weight || 1), 0);
    let random = Math.random() * totalWeight;
    
    for (const provider of providers) {
      random -= (provider.weight || 1);
      if (random <= 0) {
        return provider;
      }
    }
    
    return providers[0];
  }

  /**
   * Least latency provider selection
   */
  _leastLatencySelection(providers) {
    return providers.reduce((best, current) => {
      const bestMetrics = this.providerMetrics.get(best.id);
      const currentMetrics = this.providerMetrics.get(current.id);
      
      const bestLatency = bestMetrics?.averageLatency || Infinity;
      const currentLatency = currentMetrics?.averageLatency || Infinity;
      
      return currentLatency < bestLatency ? current : best;
    });
  }

  /**
   * Fastest response provider selection
   */
  _fastestResponseSelection(providers) {
    return providers.reduce((best, current) => {
      const bestMetrics = this.providerMetrics.get(best.id);
      const currentMetrics = this.providerMetrics.get(current.id);
      
      const bestResponse = bestMetrics?.lastResponseTime || Infinity;
      const currentResponse = currentMetrics?.lastResponseTime || Infinity;
      
      return currentResponse < bestResponse ? current : best;
    });
  }

  /**
   * Records provider request
   */
  _recordProviderRequest(providerId) {
    const metrics = this.providerMetrics.get(providerId);
    if (metrics) {
      metrics.totalRequests++;
    }
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
      
      if (health.consecutiveSuccesses >= this.config.providerRecoveryThreshold) {
        health.healthScore = Math.min(100, health.healthScore + 10);
      }
    }

    if (metrics && responseTime) {
      metrics.lastResponseTime = responseTime;
      metrics.totalLatency += responseTime;
      metrics.averageLatency = metrics.totalLatency / metrics.totalRequests;
      metrics.successRate = ((metrics.totalRequests - metrics.totalFailures) / metrics.totalRequests) * 100;
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
      
      if (health.consecutiveFailures >= this.config.providerFailureThreshold) {
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
      
      if (responseTime) {
        metrics.lastResponseTime = responseTime;
      }
    }
  }

  /**
   * Validates result consensus
   */
  _validateResultConsensus(results) {
    if (results.length <= 1) return true;

    const primaryHash = results[0].result.hash;
    return results.every(result => result.result.hash === primaryHash);
  }

  /**
   * Validates detailed consensus
   */
  _validateDetailedConsensus(broadcastData) {
    const results = Array.from(broadcastData.providerResults.values());
    if (results.length <= 1) return true;

    const primaryResult = results[0];
    const consensusFields = ['hash', 'gasUsed', 'blockNumber'];

    return results.every(result => {
      return consensusFields.every(field => 
        result[field] === primaryResult[field]
      );
    });
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
        MULTI_BROADCAST_ERRORS.INVALID_CONFIGURATION
      );
    }
  }

  /**
   * Generates unique broadcast ID
   */
  _generateBroadcastId() {
    return `broadcast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Completes broadcast coordination
   */
  async _completeBroadcastCoordination(broadcastData, success, result) {
    const coordinationTime = Date.now() - broadcastData.startTime;
    broadcastData.coordinationTime = coordinationTime;

    // Update analytics
    this.analytics.totalBroadcasts++;
    
    if (success) {
      if (broadcastData.successfulProviders.length === broadcastData.selectedProviders.length) {
        this.analytics.successfulBroadcasts++;
      } else {
        this.analytics.partialSuccesses++;
      }
    } else {
      this.analytics.failedBroadcasts++;
    }

    // Update average coordination time
    this.analytics.averageCoordinationTime = (
      (this.analytics.averageCoordinationTime * (this.analytics.totalBroadcasts - 1) + coordinationTime) / 
      this.analytics.totalBroadcasts
    );

    // Store in history
    this.broadcastHistory.push({
      broadcastId: broadcastData.broadcastId,
      mode: broadcastData.mode,
      success,
      coordinationTime,
      providersUsed: broadcastData.selectedProviders.length,
      successfulProviders: broadcastData.successfulProviders.length,
      quorumAchieved: broadcastData.quorumAchieved,
      consensusReached: broadcastData.consensusReached,
      timestamp: new Date().toISOString()
    });

    // Emit completion event
    this.emit('broadcast_completed', {
      broadcastId: broadcastData.broadcastId,
      success,
      result,
      coordinationTime,
      analytics: this.getAnalytics()
    });
  }

  /**
   * Handles broadcast coordination error
   */
  async _handleBroadcastCoordinationError(broadcastId, error, startTime) {
    const coordinationTime = Date.now() - startTime;

    this.analytics.totalBroadcasts++;
    this.analytics.failedBroadcasts++;

    this.logger.error('Broadcast coordination failed', {
      broadcastId,
      error: error.message,
      coordinationTime
    });

    this.emit('broadcast_failed', {
      broadcastId,
      error: error.message,
      coordinationTime
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
        await provider.provider.getBlockNumber();
        const responseTime = Date.now() - startTime;

        this._recordProviderSuccess(providerId, responseTime);
        
      } catch (error) {
        this._recordProviderFailure(providerId, error);
      }
    });

    await Promise.allSettled(healthCheckPromises);
  }

  /**
   * Starts analytics monitoring
   */
  _startAnalyticsMonitoring() {
    this.analyticsInterval = setInterval(() => {
      this._updateAnalytics();
    }, 60000); // Update every minute

    this.logger.info('Analytics monitoring started');
  }

  /**
   * Updates analytics data
   */
  _updateAnalytics() {
    // Update provider reliability scores
    for (const [providerId, metrics] of this.providerMetrics.entries()) {
      this.analytics.providerReliability[providerId] = {
        successRate: metrics.successRate,
        averageLatency: metrics.averageLatency,
        totalRequests: metrics.totalRequests
      };
    }

    // Calculate average provider response time
    const allMetrics = Array.from(this.providerMetrics.values());
    const totalLatency = allMetrics.reduce((sum, m) => sum + (m.averageLatency || 0), 0);
    this.analytics.averageProviderResponseTime = allMetrics.length > 0 ? totalLatency / allMetrics.length : 0;

    this.emit('analytics_updated', this.getAnalytics());
  }

  /**
   * Calculates success rate
   */
  _calculateSuccessRate() {
    if (this.analytics.totalBroadcasts === 0) return 100;
    return (this.analytics.successfulBroadcasts / this.analytics.totalBroadcasts) * 100;
  }

  /**
   * Calculates partial success rate
   */
  _calculatePartialSuccessRate() {
    if (this.analytics.totalBroadcasts === 0) return 0;
    return (this.analytics.partialSuccesses / this.analytics.totalBroadcasts) * 100;
  }

  /**
   * Updates quorum achievement rate
   */
  _updateQuorumAchievementRate(achieved) {
    const currentRate = this.analytics.quorumAchievementRate;
    const totalAttempts = this.analytics.totalBroadcasts;
    
    if (totalAttempts === 0) {
      return achieved ? 100 : 0;
    }

    return ((currentRate * (totalAttempts - 1)) + (achieved ? 100 : 0)) / totalAttempts;
  }

  /**
   * Updates consensus agreement rate
   */
  _updateConsensusAgreement(agreed) {
    const currentRate = this.analytics.consensusAgreement;
    const totalAttempts = this.analytics.totalBroadcasts;
    
    if (totalAttempts === 0) {
      return agreed ? 100 : 0;
    }

    return ((currentRate * (totalAttempts - 1)) + (agreed ? 100 : 0)) / totalAttempts;
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
          consecutiveSuccesses: health?.consecutiveSuccesses || 0
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
   * Cleanup and shutdown
   */
  async shutdown() {
    this.logger.info('Shutting down MultiBroadcastStrategy');

    // Clear intervals
    if (this.healthMonitorInterval) {
      clearInterval(this.healthMonitorInterval);
    }
    
    if (this.analyticsInterval) {
      clearInterval(this.analyticsInterval);
    }

    // Cancel active broadcasts
    for (const [broadcastId, broadcastData] of this.activeBroadcasts.entries()) {
      broadcastData.state = 'cancelled';
      this.emit('broadcast_cancelled', { broadcastId });
    }

    this.activeBroadcasts.clear();

    // Emit final analytics
    this.emit('shutdown', {
      finalAnalytics: this.getAnalytics(),
      uptime: Date.now() - this.startTime
    });

    // Remove all listeners
    this.removeAllListeners();
  }
}

// Export for use in other modules
export default MultiBroadcastStrategy;
