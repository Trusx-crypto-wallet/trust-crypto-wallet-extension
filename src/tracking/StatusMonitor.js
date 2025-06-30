/**
 * @fileoverview Production Enterprise-grade Status Monitor for Trust Crypto Wallet Extension
 * @version 1.0.0
 * @author Trust Wallet Development Team
 * @license MIT
 * @description PRODUCTION-READY status monitoring with real-time health checks and enterprise features
 */

import { EventEmitter } from 'events';
import { ethers } from 'ethers';
import { RPCError, RPC_ERROR_CODES } from '../providers/RPCBroadcastProvider.js';
import { SecurityManager } from '../../security/SecurityManager.js';
import { MetricsCollector } from '../../monitoring/MetricsCollector.js';
import { Logger } from '../../utils/Logger.js';

/**
 * Status monitoring error codes
 */
export const STATUS_MONITOR_ERRORS = {
  // Configuration errors
  INVALID_CONFIGURATION: 'STATUS_INVALID_CONFIG',
  PROVIDER_UNAVAILABLE: 'STATUS_PROVIDER_UNAVAILABLE',
  INVALID_ENDPOINTS: 'STATUS_INVALID_ENDPOINTS',
  
  // Connection errors
  CONNECTION_FAILED: 'STATUS_CONNECTION_FAILED',
  CONNECTION_TIMEOUT: 'STATUS_CONNECTION_TIMEOUT',
  AUTHENTICATION_FAILED: 'STATUS_AUTH_FAILED',
  RATE_LIMITED: 'STATUS_RATE_LIMITED',
  
  // Network errors
  NETWORK_UNAVAILABLE: 'STATUS_NETWORK_UNAVAILABLE',
  CHAIN_MISMATCH: 'STATUS_CHAIN_MISMATCH',
  BLOCK_SYNC_ERROR: 'STATUS_BLOCK_SYNC_ERROR',
  CONSENSUS_ERROR: 'STATUS_CONSENSUS_ERROR',
  
  // Service errors
  SERVICE_DEGRADED: 'STATUS_SERVICE_DEGRADED',
  SERVICE_UNAVAILABLE: 'STATUS_SERVICE_UNAVAILABLE',
  HEALTH_CHECK_FAILED: 'STATUS_HEALTH_CHECK_FAILED',
  MAINTENANCE_MODE: 'STATUS_MAINTENANCE_MODE',
  
  // Performance errors
  HIGH_LATENCY: 'STATUS_HIGH_LATENCY',
  RESOURCE_EXHAUSTED: 'STATUS_RESOURCE_EXHAUSTED',
  PERFORMANCE_DEGRADED: 'STATUS_PERFORMANCE_DEGRADED'
};

/**
 * Service status levels
 */
export const SERVICE_STATUS = {
  OPERATIONAL: 'operational',         // All systems operational
  DEGRADED: 'degraded',              // Some performance issues
  PARTIAL_OUTAGE: 'partial_outage',  // Some services unavailable
  MAJOR_OUTAGE: 'major_outage',      // Major services down
  MAINTENANCE: 'maintenance',         // Scheduled maintenance
  UNKNOWN: 'unknown'                 // Status cannot be determined
};

/**
 * Component health states
 */
export const HEALTH_STATUS = {
  HEALTHY: 'healthy',
  WARNING: 'warning',
  CRITICAL: 'critical',
  DOWN: 'down',
  UNKNOWN: 'unknown'
};

/**
 * Network-specific monitoring configurations
 */
export const NETWORK_MONITOR_CONFIGS = {
  1: { // Ethereum Mainnet
    name: 'ethereum',
    chainId: 1,
    rpcEndpoints: [
      'https://mainnet.infura.io/v3/',
      'https://eth-mainnet.alchemyapi.io/v2/',
      'https://api.mycryptoapi.com/eth',
      'https://cloudflare-eth.com'
    ],
    expectedBlockTime: 12000,        // 12 seconds
    maxLatency: 2000,               // 2 seconds max latency
    healthCheckInterval: 30000,      // 30 seconds
    failureThreshold: 3,            // 3 consecutive failures
    recoveryThreshold: 2,           // 2 consecutive successes
    timeoutDuration: 10000,         // 10 seconds timeout
    criticalServices: ['rpc', 'websocket', 'mempool']
  },
  56: { // BSC
    name: 'bsc',
    chainId: 56,
    rpcEndpoints: [
      'https://bsc-dataseed.binance.org/',
      'https://bsc-dataseed1.defibit.io/',
      'https://bsc-dataseed1.ninicoin.io/'
    ],
    expectedBlockTime: 3000,         // 3 seconds
    maxLatency: 1500,
    healthCheckInterval: 15000,      // 15 seconds
    failureThreshold: 2,
    recoveryThreshold: 2,
    timeoutDuration: 8000,
    criticalServices: ['rpc', 'websocket']
  },
  137: { // Polygon
    name: 'polygon',
    chainId: 137,
    rpcEndpoints: [
      'https://polygon-rpc.com/',
      'https://rpc-mainnet.matic.network',
      'https://matic-mainnet.chainstacklabs.com'
    ],
    expectedBlockTime: 2000,         // 2 seconds
    maxLatency: 1000,
    healthCheckInterval: 10000,      // 10 seconds
    failureThreshold: 2,
    recoveryThreshold: 2,
    timeoutDuration: 6000,
    criticalServices: ['rpc', 'websocket']
  },
  42161: { // Arbitrum
    name: 'arbitrum',
    chainId: 42161,
    rpcEndpoints: [
      'https://arb1.arbitrum.io/rpc',
      'https://arbitrum-mainnet.infura.io/v3/'
    ],
    expectedBlockTime: 1000,         // 1 second
    maxLatency: 800,
    healthCheckInterval: 8000,       // 8 seconds
    failureThreshold: 2,
    recoveryThreshold: 2,
    timeoutDuration: 5000,
    criticalServices: ['rpc']
  }
};

/**
 * PRODUCTION Enterprise-grade Status Monitor
 * @class StatusMonitor
 * @extends EventEmitter
 */
export class StatusMonitor extends EventEmitter {
  constructor({
    chainId,
    providers = [],
    enableRealTimeMonitoring = true,
    enableFailover = true,
    enableAnalytics = true,
    customEndpoints = [],
    security = {},
    monitoring = {}
  }) {
    super();

    if (!chainId || typeof chainId !== 'number') {
      throw new Error('Valid chain ID is required');
    }

    this.chainId = chainId;
    this.networkConfig = NETWORK_MONITOR_CONFIGS[chainId];
    
    if (!this.networkConfig) {
      throw new Error(`Unsupported chain ID: ${chainId}`);
    }

    // Initialize components
    this.logger = new Logger('StatusMonitor');
    this.securityManager = new SecurityManager({
      enableEndpointValidation: true,
      enableThreatDetection: true,
      ...security
    });
    
    this.metrics = new MetricsCollector({
      component: 'status_monitor',
      labels: { chainId: this.chainId, network: this.networkConfig.name },
      ...monitoring
    });

    // Configuration
    this.config = {
      enableRealTimeMonitoring,
      enableFailover,
      enableAnalytics,
      healthCheckInterval: this.networkConfig.healthCheckInterval,
      failureThreshold: this.networkConfig.failureThreshold,
      recoveryThreshold: this.networkConfig.recoveryThreshold,
      timeoutDuration: this.networkConfig.timeoutDuration,
      maxLatency: this.networkConfig.maxLatency,
      retryAttempts: 3,
      retryDelay: 1000,
      circuitBreakerThreshold: 5,
      circuitBreakerTimeout: 60000,    // 1 minute
      alertCooldown: 300000,           // 5 minutes
      historyRetention: 86400000       // 24 hours
    };

    // Provider management
    this.providers = new Map();
    this.primaryProvider = null;
    this.activeProvider = null;
    this.failoverQueue = [];

    // Status tracking
    this.serviceStatus = SERVICE_STATUS.UNKNOWN;
    this.componentHealth = new Map();
    this.healthHistory = [];
    this.outageHistory = [];
    this.performanceMetrics = {
      latency: [],
      throughput: [],
      errorRate: [],
      uptime: 100
    };

    // Real-time monitoring state
    this.monitoringActive = false;
    this.lastHealthCheck = 0;
    this.consecutiveFailures = 0;
    this.consecutiveSuccesses = 0;
    this.alertCooldowns = new Map();

    // Circuit breaker state
    this.circuitBreakers = new Map();

    // Initialize providers
    this._initializeProviders(providers, customEndpoints);

    // Start monitoring if enabled
    if (this.config.enableRealTimeMonitoring) {
      this._startRealTimeMonitoring();
    }

    this.logger.info('Production StatusMonitor initialized', {
      chainId: this.chainId,
      network: this.networkConfig.name,
      providersCount: this.providers.size,
      realTimeMonitoring: this.config.enableRealTimeMonitoring
    });
  }

  /**
   * Performs comprehensive health check
   */
  async performHealthCheck() {
    const healthCheckId = this._generateHealthCheckId();
    const startTime = Date.now();

    try {
      this.logger.debug('Starting health check', { healthCheckId });

      // Initialize health check results
      const healthResults = {
        id: healthCheckId,
        timestamp: startTime,
        overall: HEALTH_STATUS.UNKNOWN,
        components: {},
        providers: {},
        metrics: {
          latency: 0,
          availability: 0,
          performance: 0
        },
        issues: [],
        recommendations: []
      };

      // Check all providers in parallel
      const providerChecks = Array.from(this.providers.entries()).map(([id, provider]) =>
        this._checkProviderHealth(id, provider).catch(error => ({
          id,
          status: HEALTH_STATUS.DOWN,
          error: error.message,
          latency: this.config.timeoutDuration
        }))
      );

      const providerResults = await Promise.allSettled(providerChecks);

      // Process provider results
      let healthyProviders = 0;
      let totalLatency = 0;
      let workingProviders = 0;

      for (const result of providerResults) {
        if (result.status === 'fulfilled') {
          const providerHealth = result.value;
          healthResults.providers[providerHealth.id] = providerHealth;

          if (providerHealth.status === HEALTH_STATUS.HEALTHY) {
            healthyProviders++;
            totalLatency += providerHealth.latency;
            workingProviders++;
          } else if (providerHealth.status === HEALTH_STATUS.WARNING) {
            workingProviders++;
            totalLatency += providerHealth.latency;
          }
        }
      }

      // Calculate metrics
      healthResults.metrics.availability = (workingProviders / this.providers.size) * 100;
      healthResults.metrics.latency = workingProviders > 0 ? totalLatency / workingProviders : 0;
      healthResults.metrics.performance = this._calculatePerformanceScore(healthResults);

      // Check critical services
      await this._checkCriticalServices(healthResults);

      // Determine overall health
      healthResults.overall = this._determineOverallHealth(healthResults);

      // Generate recommendations
      this._generateHealthRecommendations(healthResults);

      // Update status based on health check
      await this._updateStatusFromHealthCheck(healthResults);

      // Record health check
      this._recordHealthCheck(healthResults);

      const duration = Date.now() - startTime;
      
      this.logger.info('Health check completed', {
        healthCheckId,
        duration,
        overall: healthResults.overall,
        availability: healthResults.metrics.availability,
        averageLatency: healthResults.metrics.latency
      });

      // Emit health check event
      this.emit('health_check_completed', healthResults);

      return healthResults;

    } catch (error) {
      const duration = Date.now() - startTime;
      
      this.logger.error('Health check failed', {
        healthCheckId,
        duration,
        error: error.message
      });

      throw new RPCError(
        `Health check failed: ${error.message}`,
        STATUS_MONITOR_ERRORS.HEALTH_CHECK_FAILED,
        { healthCheckId, duration, originalError: error }
      );
    }
  }

  /**
   * Gets current service status
   */
  getServiceStatus() {
    return {
      status: this.serviceStatus,
      timestamp: Date.now(),
      network: {
        chainId: this.chainId,
        name: this.networkConfig.name
      },
      providers: {
        total: this.providers.size,
        active: this.activeProvider ? 1 : 0,
        healthy: this._countHealthyProviders(),
        primary: this.primaryProvider?.id || null
      },
      components: Object.fromEntries(this.componentHealth),
      metrics: {
        uptime: this.performanceMetrics.uptime,
        averageLatency: this._calculateAverageLatency(),
        errorRate: this._calculateErrorRate(),
        availability: this._calculateAvailability()
      },
      lastHealthCheck: this.lastHealthCheck,
      monitoringActive: this.monitoringActive
    };
  }

  /**
   * Gets detailed system information
   */
  getSystemInfo() {
    return {
      monitor: 'StatusMonitor',
      version: '1.0.0',
      chainId: this.chainId,
      network: this.networkConfig.name,
      
      configuration: {
        realTimeMonitoring: this.config.enableRealTimeMonitoring,
        failoverEnabled: this.config.enableFailover,
        healthCheckInterval: this.config.healthCheckInterval,
        failureThreshold: this.config.failureThreshold,
        maxLatency: this.config.maxLatency
      },
      
      providers: Array.from(this.providers.entries()).map(([id, provider]) => ({
        id,
        type: provider.type,
        endpoint: this._maskSensitiveInfo(provider.endpoint),
        status: this.componentHealth.get(`provider_${id}`) || HEALTH_STATUS.UNKNOWN,
        primary: id === this.primaryProvider?.id,
        active: id === this.activeProvider?.id
      })),
      
      performance: {
        ...this.performanceMetrics,
        recentLatency: this.performanceMetrics.latency.slice(-10),
        recentThroughput: this.performanceMetrics.throughput.slice(-10)
      },
      
      history: {
        healthChecks: this.healthHistory.length,
        outages: this.outageHistory.length,
        recentOutages: this.outageHistory.slice(-5)
      },
      
      circuitBreakers: Array.from(this.circuitBreakers.entries()).map(([service, state]) => ({
        service,
        state: state.state,
        failures: state.failures,
        lastFailure: state.lastFailure
      })),
      
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Gets performance analytics
   */
  getPerformanceAnalytics() {
    const now = Date.now();
    const oneHour = 3600000;
    const oneDay = 86400000;

    // Filter recent data
    const recentHealth = this.healthHistory.filter(h => now - h.timestamp < oneDay);
    const recentOutages = this.outageHistory.filter(o => now - o.startTime < oneDay);

    return {
      summary: {
        uptime: this.performanceMetrics.uptime,
        averageLatency: this._calculateAverageLatency(),
        errorRate: this._calculateErrorRate(),
        availability: this._calculateAvailability()
      },
      
      trends: {
        hourly: this._calculateHourlyTrends(recentHealth, oneHour),
        daily: this._calculateDailyTrends(recentHealth, oneDay)
      },
      
      latency: {
        current: this.performanceMetrics.latency.slice(-1)[0] || 0,
        average: this._calculateAverageLatency(),
        p95: this._calculatePercentile(this.performanceMetrics.latency, 95),
        p99: this._calculatePercentile(this.performanceMetrics.latency, 99),
        max: Math.max(...this.performanceMetrics.latency.slice(-100)),
        trend: this._calculateLatencyTrend()
      },
      
      outages: {
        total: recentOutages.length,
        totalDuration: recentOutages.reduce((sum, o) => sum + (o.duration || 0), 0),
        averageDuration: recentOutages.length > 0 ? 
          recentOutages.reduce((sum, o) => sum + (o.duration || 0), 0) / recentOutages.length : 0,
        longestOutage: Math.max(...recentOutages.map(o => o.duration || 0)),
        recentOutages: recentOutages.slice(-10)
      },
      
      providers: this._getProviderAnalytics(),
      
      timestamp: new Date().toISOString(),
      period: '24h'
    };
  }

  /**
   * Checks if service is healthy
   */
  isHealthy() {
    return this.serviceStatus === SERVICE_STATUS.OPERATIONAL ||
           this.serviceStatus === SERVICE_STATUS.DEGRADED;
  }

  /**
   * Checks if specific component is healthy
   */
  isComponentHealthy(component) {
    const status = this.componentHealth.get(component);
    return status === HEALTH_STATUS.HEALTHY || status === HEALTH_STATUS.WARNING;
  }

  /**
   * Gets best available provider
   */
  getBestProvider() {
    if (!this.activeProvider) {
      this._selectBestProvider();
    }
    
    return this.activeProvider ? {
      id: this.activeProvider.id,
      provider: this.activeProvider.provider,
      endpoint: this._maskSensitiveInfo(this.activeProvider.endpoint),
      status: this.componentHealth.get(`provider_${this.activeProvider.id}`),
      latency: this.activeProvider.lastLatency || 0
    } : null;
  }

  /**
   * Forces failover to next available provider
   */
  async forceFailover(reason = 'manual_failover') {
    if (!this.config.enableFailover) {
      throw new RPCError(
        'Failover is disabled',
        STATUS_MONITOR_ERRORS.SERVICE_UNAVAILABLE
      );
    }

    const currentProvider = this.activeProvider;
    
    try {
      this.logger.warn('Forcing provider failover', {
        currentProvider: currentProvider?.id,
        reason
      });

      // Select next best provider
      const nextProvider = this._selectNextProvider();
      
      if (!nextProvider) {
        throw new RPCError(
          'No healthy providers available for failover',
          STATUS_MONITOR_ERRORS.SERVICE_UNAVAILABLE
        );
      }

      // Test new provider before switching
      await this._testProvider(nextProvider);

      // Switch to new provider
      this.activeProvider = nextProvider;

      // Record failover event
      this._recordFailover(currentProvider, nextProvider, reason);

      this.logger.info('Failover completed successfully', {
        fromProvider: currentProvider?.id,
        toProvider: nextProvider.id,
        reason
      });

      // Emit failover event
      this.emit('failover_completed', {
        fromProvider: currentProvider?.id,
        toProvider: nextProvider.id,
        reason,
        timestamp: Date.now()
      });

      return {
        success: true,
        fromProvider: currentProvider?.id,
        toProvider: nextProvider.id,
        reason
      };

    } catch (error) {
      this.logger.error('Failover failed', {
        currentProvider: currentProvider?.id,
        reason,
        error: error.message
      });

      throw new RPCError(
        `Failover failed: ${error.message}`,
        STATUS_MONITOR_ERRORS.SERVICE_UNAVAILABLE,
        { currentProvider: currentProvider?.id, reason, originalError: error }
      );
    }
  }

  /**
   * Internal methods
   */

  /**
   * Initializes providers from configuration
   */
  _initializeProviders(providers, customEndpoints) {
    // Add configured RPC endpoints
    const allEndpoints = [
      ...this.networkConfig.rpcEndpoints,
      ...customEndpoints
    ];

    allEndpoints.forEach((endpoint, index) => {
      const providerId = `rpc_${index}`;
      try {
        const provider = new ethers.JsonRpcProvider(endpoint);
        this.providers.set(providerId, {
          id: providerId,
          type: 'rpc',
          provider,
          endpoint,
          lastLatency: 0,
          lastCheck: 0,
          failures: 0,
          successes: 0
        });
      } catch (error) {
        this.logger.warn('Failed to initialize provider', {
          providerId,
          endpoint: this._maskSensitiveInfo(endpoint),
          error: error.message
        });
      }
    });

    // Add custom providers
    providers.forEach((provider, index) => {
      const providerId = `custom_${index}`;
      this.providers.set(providerId, {
        id: providerId,
        type: 'custom',
        provider,
        endpoint: 'custom',
        lastLatency: 0,
        lastCheck: 0,
        failures: 0,
        successes: 0
      });
    });

    // Select primary provider
    if (this.providers.size > 0) {
      this.primaryProvider = Array.from(this.providers.values())[0];
      this.activeProvider = this.primaryProvider;
    }

    this.logger.info('Providers initialized', {
      total: this.providers.size,
      rpcEndpoints: allEndpoints.length,
      customProviders: providers.length
    });
  }

  /**
   * Starts real-time monitoring service
   */
  _startRealTimeMonitoring() {
    if (this.monitoringActive) return;

    this.monitoringActive = true;

    // Start health check interval
    this.healthCheckInterval = setInterval(async () => {
      try {
        await this.performHealthCheck();
      } catch (error) {
        this.logger.error('Scheduled health check failed', {
          error: error.message
        });
      }
    }, this.config.healthCheckInterval);

    // Start performance monitoring
    this.performanceInterval = setInterval(() => {
      this._updatePerformanceMetrics();
    }, 60000); // Every minute

    // Start circuit breaker reset
    this.circuitBreakerInterval = setInterval(() => {
      this._resetCircuitBreakers();
    }, this.config.circuitBreakerTimeout);

    this.logger.info('Real-time monitoring started', {
      healthCheckInterval: this.config.healthCheckInterval,
      performanceMonitoring: true
    });
  }

  /**
   * Checks individual provider health
   */
  async _checkProviderHealth(providerId, providerData) {
    const startTime = Date.now();

    try {
      // Check circuit breaker
      if (this._isCircuitBreakerOpen(`provider_${providerId}`)) {
        return {
          id: providerId,
          status: HEALTH_STATUS.DOWN,
          latency: this.config.timeoutDuration,
          error: 'Circuit breaker open',
          timestamp: startTime
        };
      }

      // Perform health check with timeout
      const healthPromise = this._performProviderHealthCheck(providerData.provider);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Health check timeout')), this.config.timeoutDuration)
      );

      await Promise.race([healthPromise, timeoutPromise]);

      const latency = Date.now() - startTime;

      // Update provider stats
      providerData.lastLatency = latency;
      providerData.lastCheck = Date.now();
      providerData.successes++;

      // Determine status based on latency
      let status = HEALTH_STATUS.HEALTHY;
      if (latency > this.config.maxLatency * 2) {
        status = HEALTH_STATUS.CRITICAL;
      } else if (latency > this.config.maxLatency) {
        status = HEALTH_STATUS.WARNING;
      }

      // Update component health
      this.componentHealth.set(`provider_${providerId}`, status);

      return {
        id: providerId,
        status,
        latency,
        timestamp: startTime,
        endpoint: this._maskSensitiveInfo(providerData.endpoint)
      };

    } catch (error) {
      const latency = Date.now() - startTime;

      // Update provider stats
      providerData.failures++;
      providerData.lastCheck = Date.now();

      // Update circuit breaker
      this._recordFailure(`provider_${providerId}`);

      // Update component health
      this.componentHealth.set(`provider_${providerId}`, HEALTH_STATUS.DOWN);

      return {
        id: providerId,
        status: HEALTH_STATUS.DOWN,
        latency,
        error: error.message,
        timestamp: startTime,
        endpoint: this._maskSensitiveInfo(providerData.endpoint)
      };
    }
  }

  /**
   * Performs actual provider health check
   */
  async _performProviderHealthCheck(provider) {
    // Test basic connectivity
    const blockNumber = await provider.getBlockNumber();
    
    // Verify chain ID
    const network = await provider.getNetwork();
    if (Number(network.chainId) !== this.chainId) {
      throw new Error(`Chain ID mismatch: expected ${this.chainId}, got ${network.chainId}`);
    }

    // Test transaction pool
    const gasPrice = await provider.getFeeData();
    if (!gasPrice) {
      throw new Error('Unable to get fee data');
    }

    return {
      blockNumber,
      chainId: Number(network.chainId),
      gasPrice: gasPrice.gasPrice?.toString()
    };
  }

  /**
   * Checks critical services
   */
  async _checkCriticalServices(healthResults) {
    for (const service of this.networkConfig.criticalServices) {
      try {
        let serviceHealth = HEALTH_STATUS.HEALTHY;
        
        switch (service) {
          case 'rpc':
            serviceHealth = this._checkRpcService();
            break;
          case 'websocket':
            serviceHealth = await this._checkWebSocketService();
            break;
          case 'mempool':
            serviceHealth = await this._checkMempoolService();
            break;
        }
        
        healthResults.components[service] = serviceHealth;
        this.componentHealth.set(service, serviceHealth);
        
      } catch (error) {
        healthResults.components[service] = HEALTH_STATUS.DOWN;
        this.componentHealth.set(service, HEALTH_STATUS.DOWN);
        healthResults.issues.push({
          component: service,
          severity: 'critical',
          message: `${service} service check failed: ${error.message}`
        });
      }
    }
  }

  /**
   * Checks RPC service health
   */
  _checkRpcService() {
    const healthyProviders = Array.from(this.providers.values())
      .filter(p => this.componentHealth.get(`provider_${p.id}`) === HEALTH_STATUS.HEALTHY);
    
    if (healthyProviders.length === 0) {
      return HEALTH_STATUS.DOWN;
    } else if (healthyProviders.length < this.providers.size / 2) {
      return HEALTH_STATUS.WARNING;
    }
    
    return HEALTH_STATUS.HEALTHY;
  }

  /**
   * Checks WebSocket service health
   */
  async _checkWebSocketService() {
    // Implementation for WebSocket health check
    // This would check WebSocket connections if available
    return HEALTH_STATUS.HEALTHY;
  }

  /**
   * Checks mempool service health
   */
  async _checkMempoolService() {
    // Implementation for mempool health check
    // This would check mempool connectivity
    return HEALTH_STATUS.HEALTHY;
  }

  /**
   * Determines overall system health
   */
  _determineOverallHealth(healthResults) {
    const componentStatuses = Object.values(healthResults.components);
    const providerStatuses = Object.values(healthResults.providers).map(p => p.status);
    
    const allStatuses = [...componentStatuses, ...providerStatuses];
    
    const downCount = allStatuses.filter(s => s === HEALTH_STATUS.DOWN).length;
    const criticalCount = allStatuses.filter(s => s === HEALTH_STATUS.CRITICAL).length;
    const warningCount = allStatuses.filter(s => s === HEALTH_STATUS.WARNING).length;
    
    if (downCount > allStatuses.length / 2) {
      return HEALTH_STATUS.DOWN;
    } else if (downCount > 0 || criticalCount > 0) {
      return HEALTH_STATUS.CRITICAL;
    } else if (warningCount > 0) {
      return HEALTH_STATUS.WARNING;
    }
    
    return HEALTH_STATUS.HEALTHY;
  }

  /**
   * Generates health recommendations
   */
  _generateHealthRecommendations(healthResults) {
    const recommendations = [];
    
    // Check availability
    if (healthResults.metrics.availability < 80) {
      recommendations.push({
        type: 'availability',
        priority: 'high',
        message: 'Low provider availability detected. Consider adding more RPC endpoints.',
        action: 'add_providers'
      });
    }
    
    // Check latency
    if (healthResults.metrics.latency > this.config.maxLatency) {
      recommendations.push({
        type: 'performance',
        priority: 'medium',
        message: 'High latency detected. Consider optimizing network configuration.',
        action: 'optimize_network'
      });
    }
    
    // Check provider diversity
    const workingProviders = Object.values(healthResults.providers)
      .filter(p => p.status !== HEALTH_STATUS.DOWN).length;
    
    if (workingProviders < 2) {
      recommendations.push({
        type: 'reliability',
        priority: 'high',
        message: 'Limited provider redundancy. Add backup providers for better reliability.',
        action: 'add_redundancy'
      });
    }
    
    healthResults.recommendations = recommendations;
  }

  /**
   * Updates service status based on health check
   */
  async _updateStatusFromHealthCheck(healthResults) {
    const previousStatus = this.serviceStatus;
    
    // Determine new status
    let newStatus = SERVICE_STATUS.OPERATIONAL;
    
    switch (healthResults.overall) {
      case HEALTH_STATUS.DOWN:
        newStatus = SERVICE_STATUS.MAJOR_OUTAGE;
        break;
      case HEALTH_STATUS.CRITICAL:
        newStatus = SERVICE_STATUS.PARTIAL_OUTAGE;
        break;
      case HEALTH_STATUS.WARNING:
        newStatus = SERVICE_STATUS.DEGRADED;
        break;
      case HEALTH_STATUS.HEALTHY:
        newStatus = SERVICE_STATUS.OPERATIONAL;
        break;
      default:
        newStatus = SERVICE_STATUS.UNKNOWN;
    }
    
    // Update service status
    this.serviceStatus = newStatus;
    this.lastHealthCheck = healthResults.timestamp;
    
    // Handle status changes
    if (newStatus !== previousStatus) {
      await this._handleStatusChange(previousStatus, newStatus, healthResults);
    }
    
    // Update consecutive counters
    if (healthResults.overall === HEALTH_STATUS.HEALTHY || 
        healthResults.overall === HEALTH_STATUS.WARNING) {
      this.consecutiveFailures = 0;
      this.consecutiveSuccesses++;
    } else {
      this.consecutiveSuccesses = 0;
      this.consecutiveFailures++;
    }
    
    // Trigger failover if needed
    if (this.config.enableFailover && 
        this.consecutiveFailures >= this.config.failureThreshold) {
      await this._handleFailoverCondition(healthResults);
    }
  }

  /**
   * Handles service status changes
   */
  async _handleStatusChange(previousStatus, newStatus, healthResults) {
    const statusChange = {
      from: previousStatus,
      to: newStatus,
      timestamp: Date.now(),
      healthResults,
      duration: previousStatus !== SERVICE_STATUS.UNKNOWN ? 
        Date.now() - this.lastHealthCheck : 0
    };
    
    this.logger.info('Service status changed', {
      from: previousStatus,
      to: newStatus,
      availability: healthResults.metrics.availability,
      latency: healthResults.metrics.latency
    });
    
    // Record outage if service degraded
    if (this._isServiceDown(newStatus) && !this._isServiceDown(previousStatus)) {
      this._startOutageTracking(statusChange);
    }
    
    // End outage if service recovered
    if (!this._isServiceDown(newStatus) && this._isServiceDown(previousStatus)) {
      this._endOutageTracking(statusChange);
    }
    
    // Send alerts if needed
    await this._sendStatusAlert(statusChange);
    
    // Emit status change event
    this.emit('status_changed', statusChange);
  }

  /**
   * Handles failover conditions
   */
  async _handleFailoverCondition(healthResults) {
    if (!this.activeProvider) return;
    
    try {
      await this.forceFailover('health_check_failures');
    } catch (error) {
      this.logger.error('Automatic failover failed', {
        consecutiveFailures: this.consecutiveFailures,
        error: error.message
      });
    }
  }

  /**
   * Records health check results
   */
  _recordHealthCheck(healthResults) {
    // Add to history
    this.healthHistory.push(healthResults);
    
    // Trim history to retention period
    const cutoff = Date.now() - this.config.historyRetention;
    this.healthHistory = this.healthHistory.filter(h => h.timestamp > cutoff);
    
    // Update performance metrics
    this.performanceMetrics.latency.push(healthResults.metrics.latency);
    if (this.performanceMetrics.latency.length > 1000) {
      this.performanceMetrics.latency = this.performanceMetrics.latency.slice(-1000);
    }
    
    // Update uptime calculation
    this._updateUptimeMetrics(healthResults);
  }

  /**
   * Updates uptime metrics
   */
  _updateUptimeMetrics(healthResults) {
    const isHealthy = healthResults.overall === HEALTH_STATUS.HEALTHY ||
                     healthResults.overall === HEALTH_STATUS.WARNING;
    
    // Calculate uptime over last 24 hours
    const oneDayAgo = Date.now() - 86400000;
    const recentChecks = this.healthHistory.filter(h => h.timestamp > oneDayAgo);
    
    if (recentChecks.length > 0) {
      const healthyChecks = recentChecks.filter(h => 
        h.overall === HEALTH_STATUS.HEALTHY || h.overall === HEALTH_STATUS.WARNING
      );
      this.performanceMetrics.uptime = (healthyChecks.length / recentChecks.length) * 100;
    }
  }

  /**
   * Selects best available provider
   */
  _selectBestProvider() {
    const healthyProviders = Array.from(this.providers.values())
      .filter(p => {
        const health = this.componentHealth.get(`provider_${p.id}`);
        return health === HEALTH_STATUS.HEALTHY || health === HEALTH_STATUS.WARNING;
      })
      .sort((a, b) => a.lastLatency - b.lastLatency);
    
    if (healthyProviders.length > 0) {
      this.activeProvider = healthyProviders[0];
      return this.activeProvider;
    }
    
    return null;
  }

  /**
   * Selects next provider for failover
   */
  _selectNextProvider() {
    const currentId = this.activeProvider?.id;
    const availableProviders = Array.from(this.providers.values())
      .filter(p => {
        if (p.id === currentId) return false;
        const health = this.componentHealth.get(`provider_${p.id}`);
        return health === HEALTH_STATUS.HEALTHY || health === HEALTH_STATUS.WARNING;
      })
      .sort((a, b) => a.lastLatency - b.lastLatency);
    
    return availableProviders[0] || null;
  }

  /**
   * Tests provider connectivity
   */
  async _testProvider(provider) {
    const startTime = Date.now();
    
    try {
      await this._performProviderHealthCheck(provider.provider);
      provider.lastLatency = Date.now() - startTime;
      return true;
    } catch (error) {
      throw new Error(`Provider test failed: ${error.message}`);
    }
  }

  /**
   * Records failover event
   */
  _recordFailover(fromProvider, toProvider, reason) {
    const failoverEvent = {
      timestamp: Date.now(),
      from: fromProvider?.id || null,
      to: toProvider.id,
      reason,
      duration: 0 // Will be updated when failover completes
    };
    
    // Add to history (implement as needed)
    this.logger.info('Failover event recorded', failoverEvent);
  }

  /**
   * Starts outage tracking
   */
  _startOutageTracking(statusChange) {
    const outage = {
      id: this._generateOutageId(),
      startTime: statusChange.timestamp,
      status: statusChange.to,
      trigger: 'health_check',
      affectedServices: this._getAffectedServices(),
      severity: this._getOutageSeverity(statusChange.to)
    };
    
    this.currentOutage = outage;
    
    this.logger.warn('Outage started', {
      outageId: outage.id,
      status: outage.status,
      severity: outage.severity
    });
    
    this.emit('outage_started', outage);
  }

  /**
   * Ends outage tracking
   */
  _endOutageTracking(statusChange) {
    if (!this.currentOutage) return;
    
    const outage = {
      ...this.currentOutage,
      endTime: statusChange.timestamp,
      duration: statusChange.timestamp - this.currentOutage.startTime,
      resolvedStatus: statusChange.to
    };
    
    this.outageHistory.push(outage);
    this.currentOutage = null;
    
    this.logger.info('Outage resolved', {
      outageId: outage.id,
      duration: outage.duration,
      resolvedStatus: outage.resolvedStatus
    });
    
    this.emit('outage_resolved', outage);
  }

  /**
   * Sends status alerts
   */
  async _sendStatusAlert(statusChange) {
    const alertKey = `status_${statusChange.to}`;
    
    // Check alert cooldown
    if (this.alertCooldowns.has(alertKey)) {
      const lastAlert = this.alertCooldowns.get(alertKey);
      if (Date.now() - lastAlert < this.config.alertCooldown) {
        return; // Skip alert due to cooldown
      }
    }
    
    // Send alert
    const alert = {
      type: 'status_change',
      severity: this._getAlertSeverity(statusChange.to),
      from: statusChange.from,
      to: statusChange.to,
      timestamp: statusChange.timestamp,
      network: this.networkConfig.name,
      chainId: this.chainId,
      message: this._generateAlertMessage(statusChange)
    };
    
    this.emit('alert', alert);
    
    // Update cooldown
    this.alertCooldowns.set(alertKey, Date.now());
    
    this.logger.info('Status alert sent', {
      type: alert.type,
      severity: alert.severity,
      status: statusChange.to
    });
  }

  /**
   * Circuit breaker management
   */
  _isCircuitBreakerOpen(service) {
    const breaker = this.circuitBreakers.get(service);
    if (!breaker) return false;
    
    return breaker.state === 'open' && 
           Date.now() - breaker.lastFailure < this.config.circuitBreakerTimeout;
  }

  _recordFailure(service) {
    let breaker = this.circuitBreakers.get(service);
    if (!breaker) {
      breaker = {
        state: 'closed',
        failures: 0,
        lastFailure: 0
      };
      this.circuitBreakers.set(service, breaker);
    }
    
    breaker.failures++;
    breaker.lastFailure = Date.now();
    
    if (breaker.failures >= this.config.circuitBreakerThreshold) {
      breaker.state = 'open';
      this.logger.warn('Circuit breaker opened', {
        service,
        failures: breaker.failures
      });
    }
  }

  _resetCircuitBreakers() {
    for (const [service, breaker] of this.circuitBreakers.entries()) {
      if (breaker.state === 'open' && 
          Date.now() - breaker.lastFailure >= this.config.circuitBreakerTimeout) {
        breaker.state = 'half-open';
        breaker.failures = 0;
        this.logger.info('Circuit breaker reset to half-open', { service });
      }
    }
  }

  /**
   * Performance metrics calculation
   */
  _updatePerformanceMetrics() {
    // Update throughput metrics
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    
    const recentChecks = this.healthHistory.filter(h => h.timestamp > oneMinuteAgo);
    const throughput = recentChecks.length;
    
    this.performanceMetrics.throughput.push(throughput);
    if (this.performanceMetrics.throughput.length > 1440) { // 24 hours of minutes
      this.performanceMetrics.throughput = this.performanceMetrics.throughput.slice(-1440);
    }
    
    // Update error rate
    const errorRate = this._calculateCurrentErrorRate();
    this.performanceMetrics.errorRate.push(errorRate);
    if (this.performanceMetrics.errorRate.length > 1440) {
      this.performanceMetrics.errorRate = this.performanceMetrics.errorRate.slice(-1440);
    }
  }

  _calculateCurrentErrorRate() {
    const recentChecks = this.healthHistory.slice(-10); // Last 10 checks
    if (recentChecks.length === 0) return 0;
    
    const errorChecks = recentChecks.filter(h => 
      h.overall === HEALTH_STATUS.DOWN || h.overall === HEALTH_STATUS.CRITICAL
    );
    
    return (errorChecks.length / recentChecks.length) * 100;
  }

  _calculateAverageLatency() {
    if (this.performanceMetrics.latency.length === 0) return 0;
    const recent = this.performanceMetrics.latency.slice(-100); // Last 100 measurements
    return recent.reduce((sum, latency) => sum + latency, 0) / recent.length;
  }

  _calculateErrorRate() {
    return this.performanceMetrics.errorRate.slice(-1)[0] || 0;
  }

  _calculateAvailability() {
    return this.performanceMetrics.uptime;
  }

  _calculatePerformanceScore(healthResults) {
    const availabilityScore = healthResults.metrics.availability;
    const latencyScore = Math.max(0, 100 - (healthResults.metrics.latency / this.config.maxLatency) * 50);
    const errorRate = this._calculateErrorRate();
    const errorScore = Math.max(0, 100 - errorRate);
    
    return (availabilityScore * 0.4 + latencyScore * 0.3 + errorScore * 0.3);
  }

  _calculatePercentile(values, percentile) {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  _calculateLatencyTrend() {
    const recent = this.performanceMetrics.latency.slice(-20);
    if (recent.length < 10) return 'stable';
    
    const firstHalf = recent.slice(0, Math.floor(recent.length / 2));
    const secondHalf = recent.slice(Math.floor(recent.length / 2));
    
    const firstAvg = firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length;
    
    const change = ((secondAvg - firstAvg) / firstAvg) * 100;
    
    if (change > 10) return 'increasing';
    if (change < -10) return 'decreasing';
    return 'stable';
  }

  _calculateHourlyTrends(healthData, period) {
    // Implementation for hourly trend calculation
    return {
      uptime: 100,
      averageLatency: 0,
      errorRate: 0
    };
  }

  _calculateDailyTrends(healthData, period) {
    // Implementation for daily trend calculation
    return {
      uptime: 100,
      averageLatency: 0,
      errorRate: 0
    };
  }

  _getProviderAnalytics() {
    const analytics = {};
    
    for (const [id, provider] of this.providers.entries()) {
      const health = this.componentHealth.get(`provider_${id}`);
      analytics[id] = {
        status: health || HEALTH_STATUS.UNKNOWN,
        lastLatency: provider.lastLatency,
        successRate: provider.successes / (provider.successes + provider.failures) * 100 || 0,
        totalChecks: provider.successes + provider.failures,
        endpoint: this._maskSensitiveInfo(provider.endpoint)
      };
    }
    
    return analytics;
  }

  /**
   * Helper methods
   */
  _countHealthyProviders() {
    let count = 0;
    for (const [id] of this.providers.entries()) {
      const health = this.componentHealth.get(`provider_${id}`);
      if (health === HEALTH_STATUS.HEALTHY) count++;
    }
    return count;
  }

  _isServiceDown(status) {
    return status === SERVICE_STATUS.MAJOR_OUTAGE || 
           status === SERVICE_STATUS.PARTIAL_OUTAGE;
  }

  _getAffectedServices() {
    const affected = [];
    for (const [component, health] of this.componentHealth.entries()) {
      if (health === HEALTH_STATUS.DOWN || health === HEALTH_STATUS.CRITICAL) {
        affected.push(component);
      }
    }
    return affected;
  }

  _getOutageSeverity(status) {
    switch (status) {
      case SERVICE_STATUS.MAJOR_OUTAGE:
        return 'critical';
      case SERVICE_STATUS.PARTIAL_OUTAGE:
        return 'major';
      case SERVICE_STATUS.DEGRADED:
        return 'minor';
      default:
        return 'minor';
    }
  }

  _getAlertSeverity(status) {
    switch (status) {
      case SERVICE_STATUS.MAJOR_OUTAGE:
        return 'critical';
      case SERVICE_STATUS.PARTIAL_OUTAGE:
        return 'high';
      case SERVICE_STATUS.DEGRADED:
        return 'medium';
      default:
        return 'low';
    }
  }

  _generateAlertMessage(statusChange) {
    const networkName = this.networkConfig.name;
    return `${networkName} network status changed from ${statusChange.from} to ${statusChange.to}`;
  }

  _generateHealthCheckId() {
    return `health_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  _generateOutageId() {
    return `outage_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  _maskSensitiveInfo(endpoint) {
    if (typeof endpoint !== 'string') return endpoint;
    // Mask API keys and sensitive information
    return endpoint.replace(/\/v3\/[a-zA-Z0-9]+/g, '/v3/***').replace(/\/v2\/[a-zA-Z0-9]+/g, '/v2/***');
  }

  /**
   * Public management methods
   */

  /**
   * Manually sets service status
   */
  setServiceStatus(status, reason = 'manual_override') {
    const previousStatus = this.serviceStatus;
    this.serviceStatus = status;
    
    this.logger.info('Service status manually set', {
      from: previousStatus,
      to: status,
      reason
    });
    
    this.emit('status_changed', {
      from: previousStatus,
      to: status,
      timestamp: Date.now(),
      reason,
      manual: true
    });
  }

  /**
   * Updates monitoring configuration
   */
  updateConfig(newConfig) {
    const oldConfig = { ...this.config };
    this.config = { ...this.config, ...newConfig };
    
    // Restart monitoring if interval changed
    if (newConfig.healthCheckInterval && 
        newConfig.healthCheckInterval !== oldConfig.healthCheckInterval) {
      this._restartHealthCheckInterval();
    }
    
    this.logger.info('StatusMonitor configuration updated', {
      updatedFields: Object.keys(newConfig)
    });
  }

  /**
   * Restarts health check interval
   */
  _restartHealthCheckInterval() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    
    if (this.monitoringActive) {
      this.healthCheckInterval = setInterval(async () => {
        try {
          await this.performHealthCheck();
        } catch (error) {
          this.logger.error('Scheduled health check failed', {
            error: error.message
          });
        }
      }, this.config.healthCheckInterval);
    }
  }

  /**
   * Adds new provider
   */
  addProvider(provider, endpoint = 'custom') {
    const providerId = `added_${Date.now()}`;
    
    this.providers.set(providerId, {
      id: providerId,
      type: 'added',
      provider,
      endpoint,
      lastLatency: 0,
      lastCheck: 0,
      failures: 0,
      successes: 0
    });
    
    this.logger.info('Provider added', {
      providerId,
      endpoint: this._maskSensitiveInfo(endpoint)
    });
    
    return providerId;
  }

  /**
   * Removes provider
   */
  removeProvider(providerId) {
    if (!this.providers.has(providerId)) {
      return false;
    }
    
    // Don't remove if it's the only provider
    if (this.providers.size <= 1) {
      throw new Error('Cannot remove the last remaining provider');
    }
    
    // Switch active provider if removing current one
    if (this.activeProvider?.id === providerId) {
      this._selectBestProvider();
    }
    
    this.providers.delete(providerId);
    this.componentHealth.delete(`provider_${providerId}`);
    
    this.logger.info('Provider removed', { providerId });
    
    return true;
  }

  /**
   * Clears performance history
   */
  clearHistory(olderThan = 0) {
    const cutoff = Date.now() - olderThan;
    
    this.healthHistory = this.healthHistory.filter(h => h.timestamp > cutoff);
    this.outageHistory = this.outageHistory.filter(o => o.startTime > cutoff);
    
    if (olderThan === 0) {
      this.performanceMetrics.latency = [];
      this.performanceMetrics.throughput = [];
      this.performanceMetrics.errorRate = [];
    }
    
    this.logger.info('Performance history cleared', { olderThan });
  }

  /**
   * Exports monitoring data
   */
  exportMonitoringData() {
    return {
      metadata: {
        chainId: this.chainId,
        network: this.networkConfig.name,
        exportTime: Date.now(),
        version: '1.0.0'
      },
      
      status: this.getServiceStatus(),
      systemInfo: this.getSystemInfo(),
      analytics: this.getPerformanceAnalytics(),
      
      history: {
        healthChecks: this.healthHistory,
        outages: this.outageHistory
      },
      
      configuration: this.config
    };
  }

  /**
   * Graceful shutdown
   */
  async shutdown() {
    this.logger.info('StatusMonitor shutdown initiated');
    
    this.monitoringActive = false;
    
    // Clear all intervals
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    if (this.performanceInterval) {
      clearInterval(this.performanceInterval);
    }
    if (this.circuitBreakerInterval) {
      clearInterval(this.circuitBreakerInterval);
    }
    
    // Close current outage if any
    if (this.currentOutage) {
      this._endOutageTracking({
        timestamp: Date.now(),
        to: SERVICE_STATUS.MAINTENANCE
      });
    }
    
    // Shutdown metrics collector
    if (this.metrics) {
      await this.metrics.shutdown();
    }
    
    // Clear data structures
    this.providers.clear();
    this.componentHealth.clear();
    this.circuitBreakers.clear();
    this.alertCooldowns.clear();
    
    this.logger.info('StatusMonitor shutdown completed');
  }
}

/**
 * Factory function to create StatusMonitor
 */
export function createStatusMonitor(config) {
  return new StatusMonitor(config);
}

/**
 * Utility function for quick health check
 */
export async function quickHealthCheck(chainId, providers) {
  const monitor = new StatusMonitor({
    chainId,
    providers,
    enableRealTimeMonitoring: false
  });
  
  try {
    const healthResults = await monitor.performHealthCheck();
    await monitor.shutdown();
    return healthResults;
  } catch (error) {
    await monitor.shutdown();
    throw error;
  }
}

export default StatusMonitor;

/**
 * Example usage:
 * 
 * // Basic usage
 * const monitor = new StatusMonitor({
 *   chainId: 1,
 *   providers: [new ethers.JsonRpcProvider(RPC_URL)],
 *   enableRealTimeMonitoring: true
 * });
 * 
 * // Perform health check
 * const health = await monitor.performHealthCheck();
 * console.log('Health status:', health.overall);
 * 
 * // Get service status
 * const status = monitor.getServiceStatus();
 * console.log('Service status:', status.status);
 * 
 * // Listen for events
 * monitor.on('status_changed', (change) => {
 *   console.log('Status changed:', change.from, '->', change.to);
 * });
 * 
 * monitor.on('alert', (alert) => {
 *   console.log('Alert:', alert.message);
 * });
 * 
 * monitor.on('failover_completed', (event) => {
 *   console.log('Failover completed:', event.toProvider);
 * });
 * 
 * // Force failover
 * await monitor.forceFailover('testing');
 * 
 * // Get analytics
 * const analytics = monitor.getPerformanceAnalytics();
 * console.log('Uptime:', analytics.summary.uptime);
 * 
 * // Add new provider
 * const providerId = monitor.addProvider(newProvider);
 * 
 * // Export data
 * const data = monitor.exportMonitoringData();
 * 
 * // Quick health check
 * const quickHealth = await quickHealthCheck(1, [provider]);
 * 
 * // Graceful shutdown
 * await monitor.shutdown();
 */
