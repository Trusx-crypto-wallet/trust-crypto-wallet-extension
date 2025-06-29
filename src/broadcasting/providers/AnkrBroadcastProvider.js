/**
 * Enhanced AnkrBroadcastProvider with performance optimizations and additional features
 * @fileoverview Improved version with better caching, connection pooling, and async improvements
 * @version 2.1.0
 */

import { RPCBroadcastProvider, RPCError, RPC_ERROR_CODES } from './RPCBroadcastProvider.js';
import { SecurityManager } from '../security/SecurityManager.js';
import { MetricsCollector } from '../monitoring/MetricsCollector.js';
import { CircuitBreaker } from '../reliability/CircuitBreaker.js';
import { ConnectionPool } from '../networking/ConnectionPool.js';
import { CacheManager } from '../caching/CacheManager.js';

/**
 * Enhanced Ankr-specific error codes
 */
export const ANKR_ERROR_CODES = {
  // Configuration Errors
  INVALID_URL: 'ANKR_INVALID_URL',
  INVALID_API_KEY: 'ANKR_INVALID_API_KEY',
  INVALID_CHAIN_ID: 'ANKR_INVALID_CHAIN_ID',
  INVALID_CONFIG: 'ANKR_INVALID_CONFIG',
  
  // Service Errors
  SERVICE_UNAVAILABLE: 'ANKR_SERVICE_UNAVAILABLE',
  ENDPOINT_NOT_FOUND: 'ANKR_ENDPOINT_NOT_FOUND',
  MAINTENANCE_MODE: 'ANKR_MAINTENANCE_MODE',
  VERSION_MISMATCH: 'ANKR_VERSION_MISMATCH',
  
  // Rate Limiting & Quota
  RATE_LIMITED: 'ANKR_RATE_LIMITED',
  QUOTA_EXCEEDED: 'ANKR_QUOTA_EXCEEDED',
  CONCURRENT_LIMIT: 'ANKR_CONCURRENT_LIMIT',
  BURST_LIMIT: 'ANKR_BURST_LIMIT',
  
  // Authentication & Authorization
  AUTH_FAILED: 'ANKR_AUTH_FAILED',
  PERMISSION_DENIED: 'ANKR_PERMISSION_DENIED',
  TOKEN_EXPIRED: 'ANKR_TOKEN_EXPIRED',
  API_KEY_INVALID: 'ANKR_API_KEY_INVALID',
  
  // Network & Infrastructure
  NETWORK_ERROR: 'ANKR_NETWORK_ERROR',
  TIMEOUT: 'ANKR_TIMEOUT',
  DNS_RESOLUTION: 'ANKR_DNS_RESOLUTION',
  CONNECTION_FAILED: 'ANKR_CONNECTION_FAILED',
  
  // Data & Protocol
  INVALID_RESPONSE: 'ANKR_INVALID_RESPONSE',
  PROTOCOL_ERROR: 'ANKR_PROTOCOL_ERROR',
  MALFORMED_DATA: 'ANKR_MALFORMED_DATA',
  CHECKSUM_MISMATCH: 'ANKR_CHECKSUM_MISMATCH',
  
  // Cache & Performance
  CACHE_ERROR: 'ANKR_CACHE_ERROR',
  PERFORMANCE_DEGRADED: 'ANKR_PERFORMANCE_DEGRADED'
};

/**
 * Extended network configuration with additional metadata
 */
export const ANKR_NETWORKS = {
  ETHEREUM: { 
    chainId: 1, 
    name: 'ethereum', 
    rpcPath: '/eth',
    blockTime: 12000,
    confirmations: 12,
    gasMultiplier: 1.1
  },
  BSC: { 
    chainId: 56, 
    name: 'bsc', 
    rpcPath: '/bsc',
    blockTime: 3000,
    confirmations: 3,
    gasMultiplier: 1.2
  },
  POLYGON: { 
    chainId: 137, 
    name: 'polygon', 
    rpcPath: '/polygon',
    blockTime: 2000,
    confirmations: 5,
    gasMultiplier: 1.3
  },
  AVALANCHE: { 
    chainId: 43114, 
    name: 'avalanche', 
    rpcPath: '/avalanche',
    blockTime: 2000,
    confirmations: 3,
    gasMultiplier: 1.1
  },
  ARBITRUM: { 
    chainId: 42161, 
    name: 'arbitrum', 
    rpcPath: '/arbitrum',
    blockTime: 1000,
    confirmations: 1,
    gasMultiplier: 1.0
  },
  OPTIMISM: { 
    chainId: 10, 
    name: 'optimism', 
    rpcPath: '/optimism',
    blockTime: 2000,
    confirmations: 1,
    gasMultiplier: 1.0
  },
  FANTOM: { 
    chainId: 250, 
    name: 'fantom', 
    rpcPath: '/fantom',
    blockTime: 1000,
    confirmations: 3,
    gasMultiplier: 1.1
  },
  CELO: { 
    chainId: 42220, 
    name: 'celo', 
    rpcPath: '/celo',
    blockTime: 5000,
    confirmations: 3,
    gasMultiplier: 1.1
  }
};

/**
 * Enhanced AnkrBroadcastProvider with improved performance and features
 */
export class AnkrBroadcastProvider extends RPCBroadcastProvider {
  constructor(config) {
    // Validate and normalize configuration
    const normalizedConfig = AnkrBroadcastProvider._normalizeConfig(config);
    AnkrBroadcastProvider._validateConfiguration(normalizedConfig);

    // Initialize with enhanced configuration
    super(normalizedConfig);

    // Provider metadata
    this.providerType = 'ankr';
    this.providerVersion = '2.1.0';
    this.networkInfo = this._getNetworkInfo(normalizedConfig.chainId);
    
    // Initialize enhanced components
    this._initializeEnhancedComponents(normalizedConfig);
    this._initializeEventHandlers();
    this._startBackgroundServices();

    this.logger.info('Enhanced AnkrBroadcastProvider initialized', {
      provider: 'ankr',
      version: this.providerVersion,
      network: this.networkInfo?.name || 'unknown',
      features: this._getEnabledFeatures()
    });
  }

  /**
   * Normalizes and validates configuration
   */
  static _normalizeConfig(config) {
    if (!config || typeof config !== 'object') {
      throw new RPCError('Configuration object is required', ANKR_ERROR_CODES.INVALID_CONFIG);
    }

    return {
      // Required fields
      rpcUrl: config.rpcUrl,
      chainId: config.chainId,
      
      // Authentication
      apiKey: config.apiKey,
      auth: config.auth,
      
      // Performance settings
      maxRetries: config.maxRetries ?? 3,
      retryDelayMs: config.retryDelayMs ?? 1000,
      timeoutMs: config.timeoutMs ?? 30000,
      
      // Rate limiting
      rateLimits: {
        requestsPerSecond: 15,
        burstSize: 30,
        concurrentRequests: 8,
        ...config.rateLimits
      },
      
      // Circuit breaker
      circuitBreaker: {
        failureThreshold: 5,
        recoveryTime: 30000,
        timeout: 30000,
        monitoringPeriod: 10000,
        ...config.circuitBreaker
      },
      
      // Caching
      caching: {
        enabled: true,
        ttl: 60000, // 1 minute default
        maxSize: 1000,
        ...config.caching
      },
      
      // Connection pooling
      connectionPool: {
        enabled: true,
        maxConnections: 10,
        keepAliveTimeout: 60000,
        ...config.connectionPool
      },
      
      // Monitoring
      monitoring: {
        enableDetailedMetrics: true,
        metricsInterval: 30000,
        ...config.monitoring
      },
      
      // Security
      security: {
        enableRequestSigning: true,
        enableResponseValidation: true,
        maskSensitiveData: true,
        auditLogging: true,
        ...config.security
      },
      
      // Other options
      ...config
    };
  }

  /**
   * Enhanced configuration validation
   */
  static _validateConfiguration(config) {
    const errors = [];

    // URL validation
    if (!config.rpcUrl || typeof config.rpcUrl !== 'string') {
      errors.push('RPC URL is required and must be a string');
    } else if (!config.rpcUrl.startsWith('https://')) {
      errors.push('Only HTTPS URLs are allowed for security');
    } else if (!/^https:\/\/rpc\.ankr\.com\//.test(config.rpcUrl)) {
      errors.push('Invalid Ankr RPC URL format');
    }

    // Chain ID validation
    if (!config.chainId || typeof config.chainId !== 'number' || config.chainId <= 0) {
      errors.push('Valid chain ID is required');
    } else {
      const supportedChainIds = Object.values(ANKR_NETWORKS).map(n => n.chainId);
      if (!supportedChainIds.includes(config.chainId)) {
        errors.push(`Unsupported chain ID: ${config.chainId}`);
      }
    }

    // Authentication validation
    if (!config.apiKey && !config.auth) {
      errors.push('API key or auth object is required');
    }

    if (config.apiKey && !isValidAnkrApiKey(config.apiKey)) {
      errors.push('Invalid API key format');
    }

    // Performance validation
    if (config.timeoutMs && (config.timeoutMs < 1000 || config.timeoutMs > 300000)) {
      errors.push('Timeout must be between 1s and 5m');
    }

    if (config.maxRetries && (config.maxRetries < 0 || config.maxRetries > 10)) {
      errors.push('Max retries must be between 0 and 10');
    }

    if (errors.length > 0) {
      throw new RPCError(
        `Configuration validation failed: ${errors.join(', ')}`,
        ANKR_ERROR_CODES.INVALID_CONFIG,
        { errors }
      );
    }
  }

  /**
   * Initialize enhanced components with improved error handling
   */
  _initializeEnhancedComponents(config) {
    try {
      // Security manager with enhanced features
      this.securityManager = new SecurityManager({
        provider: 'ankr',
        ...config.security
      });

      // Metrics collector with custom labels
      this.metrics = new MetricsCollector({
        provider: 'ankr',
        version: this.providerVersion,
        labels: {
          chainId: config.chainId,
          network: this.networkInfo?.name || 'unknown'
        },
        ...config.monitoring
      });

      // Circuit breaker with adaptive thresholds
      this.circuitBreaker = new CircuitBreaker({
        name: `ankr-${this.networkInfo?.name || config.chainId}`,
        ...config.circuitBreaker
      });

      // Connection pool for better performance
      if (config.connectionPool.enabled) {
        this.connectionPool = new ConnectionPool({
          baseUrl: config.rpcUrl,
          ...config.connectionPool
        });
      }

      // Cache manager for response caching
      if (config.caching.enabled) {
        this.cacheManager = new CacheManager({
          namespace: `ankr-${config.chainId}`,
          ...config.caching
        });
      }

      // Enhanced rate limiter with sliding window
      this.rateLimiter = this._createSlidingWindowRateLimiter(config.rateLimits);

      // Health status tracking
      this.healthStatus = {
        isHealthy: true,
        lastCheck: null,
        consecutiveFailures: 0,
        uptime: Date.now(),
        metrics: {
          totalRequests: 0,
          successfulRequests: 0,
          failedRequests: 0,
          averageResponseTime: 0,
          cacheHitRate: 0
        }
      };

    } catch (error) {
      throw new RPCError(
        `Failed to initialize provider components: ${error.message}`,
        ANKR_ERROR_CODES.INVALID_CONFIG,
        { originalError: error }
      );
    }
  }

  /**
   * Creates a sliding window rate limiter
   */
  _createSlidingWindowRateLimiter(config) {
    return {
      ...config,
      windows: new Map(), // timestamp -> request count
      _activeRequests: 0,
      
      async checkLimit() {
        const now = Date.now();
        const windowStart = now - 1000; // 1 second window
        
        // Clean old windows
        for (const [timestamp] of this.windows) {
          if (timestamp < windowStart) {
            this.windows.delete(timestamp);
          }
        }
        
        // Count requests in current window
        const currentRequests = Array.from(this.windows.values())
          .reduce((sum, count) => sum + count, 0);
        
        if (currentRequests >= this.requestsPerSecond) {
          throw new RPCError(
            'Rate limit exceeded',
            ANKR_ERROR_CODES.RATE_LIMITED,
            { limit: this.requestsPerSecond, current: currentRequests }
          );
        }
        
        if (this._activeRequests >= this.concurrentRequests) {
          throw new RPCError(
            'Concurrent request limit exceeded',
            ANKR_ERROR_CODES.CONCURRENT_LIMIT,
            { limit: this.concurrentRequests }
          );
        }
      },
      
      recordRequest() {
        const now = Date.now();
        const windowKey = Math.floor(now / 100) * 100; // 100ms buckets
        this.windows.set(windowKey, (this.windows.get(windowKey) || 0) + 1);
        this._activeRequests++;
      },
      
      releaseRequest() {
        this._activeRequests = Math.max(0, this._activeRequests - 1);
      }
    };
  }

  /**
   * Initialize event handlers for better monitoring
   */
  _initializeEventHandlers() {
    // Handle process events for graceful shutdown
    const handleShutdown = async (signal) => {
      this.logger.info(`Received ${signal}, initiating graceful shutdown`);
      await this.shutdown();
      process.exit(0);
    };

    process.on('SIGTERM', handleShutdown);
    process.on('SIGINT', handleShutdown);
    
    // Handle uncaught errors
    process.on('uncaughtException', (error) => {
      this.logger.error('Uncaught exception in AnkrProvider', { error: error.message });
      this.metrics.recordError('uncaught_exception', error);
    });
  }

  /**
   * Start background services with error handling
   */
  _startBackgroundServices() {
    // Health check service
    this.services = {
      healthCheck: setInterval(async () => {
        try {
          await this.performHealthCheck();
        } catch (error) {
          this.logger.debug('Background health check failed', { error: error.message });
        }
      }, 60000),

      // Metrics cleanup service
      metricsCleanup: setInterval(() => {
        try {
          this._cleanupMetrics();
        } catch (error) {
          this.logger.warn('Metrics cleanup failed', { error: error.message });
        }
      }, 300000),

      // Cache cleanup service
      cacheCleanup: this.cacheManager ? setInterval(() => {
        try {
          this.cacheManager.cleanup();
        } catch (error) {
          this.logger.warn('Cache cleanup failed', { error: error.message });
        }
      }, 180000) : null
    };
  }

  /**
   * Enhanced request execution with caching and connection pooling
   */
  async executeWithRetry(requestFn) {
    const requestId = this._generateRequestId();
    const startTime = Date.now();
    
    try {
      // Check cache first
      if (this.cacheManager) {
        const cacheKey = await this._generateCacheKey(requestFn);
        const cachedResult = await this.cacheManager.get(cacheKey);
        if (cachedResult) {
          this.healthStatus.metrics.cacheHitRate = 
            (this.healthStatus.metrics.cacheHitRate + 1) / 2;
          return cachedResult;
        }
      }

      // Rate limiting check
      await this.rateLimiter.checkLimit();
      this.rateLimiter.recordRequest();

      // Circuit breaker check
      if (this.circuitBreaker.isOpen()) {
        throw new RPCError(
          'Circuit breaker is open',
          ANKR_ERROR_CODES.SERVICE_UNAVAILABLE
        );
      }

      // Execute request with enhanced error handling
      const result = await this.circuitBreaker.execute(async () => {
        try {
          let executionResult;
          
          if (this.connectionPool) {
            executionResult = await this.connectionPool.execute(requestFn);
          } else {
            executionResult = await super.executeWithRetry(requestFn);
          }
          
          return executionResult;
        } catch (error) {
          throw this._mapAnkrError(error);
        }
      });

      // Cache the result if cacheable
      if (this.cacheManager && this._isCacheable(requestFn)) {
        const cacheKey = await this._generateCacheKey(requestFn);
        await this.cacheManager.set(cacheKey, result);
      }

      // Record success metrics
      this._recordSuccess(Date.now() - startTime);
      
      return result;

    } catch (error) {
      this._recordFailure(error, Date.now() - startTime);
      throw error;
    } finally {
      this.rateLimiter.releaseRequest();
    }
  }

  /**
   * Generates cache key for requests
   */
  async _generateCacheKey(requestFn) {
    const fnString = requestFn.toString();
    const hash = await this._hashString(fnString);
    return `${this.networkInfo?.name || this.chainId}:${hash}`;
  }

  /**
   * Determines if a request is cacheable
   */
  _isCacheable(requestFn) {
    const fnString = requestFn.toString();
    const cacheableMethods = [
      'eth_blockNumber',
      'eth_gasPrice',
      'eth_chainId',
      'net_version',
      'eth_getBlockByNumber',
      'eth_getTransactionByHash'
    ];
    
    return cacheableMethods.some(method => fnString.includes(method));
  }

  /**
   * Simple string hashing function
   */
  async _hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Enhanced health check with additional diagnostics
   */
  async performHealthCheck() {
    const startTime = Date.now();
    const checks = {};

    try {
      // Basic connectivity
      checks.connectivity = await this._checkConnectivity();
      
      // RPC functionality
      checks.rpc = await this._checkRPCFunctionality();
      
      // Performance check
      checks.performance = await this._checkPerformance();
      
      // Component health
      checks.circuitBreaker = this.circuitBreaker.getStatus();
      checks.rateLimiter = this._getRateLimiterStatus();
      
      if (this.connectionPool) {
        checks.connectionPool = this.connectionPool.getStatus();
      }
      
      if (this.cacheManager) {
        checks.cache = this.cacheManager.getStatus();
      }

      const isHealthy = Object.values(checks).every(check => 
        check.status === 'healthy' || check.status === 'ok'
      );

      this.healthStatus.isHealthy = isHealthy;
      this.healthStatus.lastCheck = new Date().toISOString();
      this.healthStatus.consecutiveFailures = isHealthy ? 0 : this.healthStatus.consecutiveFailures + 1;

      return {
        status: isHealthy ? 'healthy' : 'degraded',
        responseTime: Date.now() - startTime,
        checks,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      this.healthStatus.isHealthy = false;
      this.healthStatus.consecutiveFailures++;
      
      throw new RPCError(
        'Health check failed',
        ANKR_ERROR_CODES.SERVICE_UNAVAILABLE,
        { originalError: error, responseTime: Date.now() - startTime }
      );
    }
  }

  /**
   * Get comprehensive provider statistics
   */
  getStats() {
    const baseStats = {
      provider: 'ankr',
      version: this.providerVersion,
      uptime: Date.now() - this.healthStatus.uptime,
      network: this.networkInfo,
      healthStatus: this.healthStatus,
      circuitBreaker: this.circuitBreaker.getStatus(),
      rateLimiter: this._getRateLimiterStatus(),
      timestamp: new Date().toISOString()
    };

    // Add optional component stats
    if (this.connectionPool) {
      baseStats.connectionPool = this.connectionPool.getStats();
    }

    if (this.cacheManager) {
      baseStats.cache = this.cacheManager.getStats();
    }

    if (this.metrics) {
      baseStats.metrics = this.metrics.getStats();
    }

    return baseStats;
  }

  /**
   * Enhanced graceful shutdown
   */
  async shutdown() {
    this.logger.info('Starting graceful shutdown of AnkrBroadcastProvider');

    try {
      // Stop background services
      Object.values(this.services).forEach(service => {
        if (service) clearInterval(service);
      });

      // Wait for active requests
      const maxWaitTime = 15000;
      const startWait = Date.now();
      
      while (this.rateLimiter._activeRequests > 0 && Date.now() - startWait < maxWaitTime) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Shutdown components
      const shutdownPromises = [];
      
      if (this.connectionPool) {
        shutdownPromises.push(this.connectionPool.shutdown());
      }
      
      if (this.cacheManager) {
        shutdownPromises.push(this.cacheManager.shutdown());
      }
      
      if (this.metrics) {
        shutdownPromises.push(this.metrics.shutdown());
      }
      
      shutdownPromises.push(this.circuitBreaker.shutdown());

      await Promise.allSettled(shutdownPromises);

      this.logger.info('AnkrBroadcastProvider shutdown completed successfully');

    } catch (error) {
      this.logger.error('Error during shutdown', { error: error.message });
      throw error;
    }
  }

  /**
   * Helper methods
   */
  _getNetworkInfo(chainId) {
    return Object.values(ANKR_NETWORKS).find(n => n.chainId === chainId) || null;
  }

  _getEnabledFeatures() {
    return {
      caching: !!this.cacheManager,
      connectionPooling: !!this.connectionPool,
      circuitBreaker: !!this.circuitBreaker,
      rateLimiting: !!this.rateLimiter,
      monitoring: !!this.metrics,
      security: !!this.securityManager
    };
  }

  _generateRequestId() {
    return `ankr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  _recordSuccess(responseTime) {
    this.healthStatus.metrics.totalRequests++;
    this.healthStatus.metrics.successfulRequests++;
    this.healthStatus.metrics.averageResponseTime = 
      (this.healthStatus.metrics.averageResponseTime + responseTime) / 2;
    
    if (this.metrics) {
      this.metrics.recordSuccess(responseTime);
    }
  }

  _recordFailure(error, responseTime) {
    this.healthStatus.metrics.totalRequests++;
    this.healthStatus.metrics.failedRequests++;
    
    if (this.metrics) {
      this.metrics.recordFailure(error, responseTime);
    }
  }

  _cleanupMetrics() {
    const maxAge = 300000; // 5 minutes
    
    // Cleanup rate limiter windows
    const cutoff = Date.now() - maxAge;
    for (const [timestamp] of this.rateLimiter.windows) {
      if (timestamp < cutoff) {
        this.rateLimiter.windows.delete(timestamp);
      }
    }
    
    // Cleanup metrics if available
    if (this.metrics) {
      this.metrics.cleanup(maxAge);
    }
  }

  _mapAnkrError(error) {
    // Enhanced error mapping with more specific categorization
    const message = error?.message || 'Unknown error';
    const status = error?.status || error?.code;
    
    let code = ANKR_ERROR_CODES.SERVICE_UNAVAILABLE;
    let category = 'general';
    let severity = 'medium';

    // Detailed error pattern matching
    if (message.includes('rate limit') || status === 429) {
      code = ANKR_ERROR_CODES.RATE_LIMITED;
      category = 'rate_limiting';
      severity = 'low';
    } else if (message.includes('quota') || message.includes('limit exceeded')) {
      code = ANKR_ERROR_CODES.QUOTA_EXCEEDED;
      category = 'quota';
      severity = 'medium';
    } else if (message.includes('unauthorized') || status === 401) {
      code = ANKR_ERROR_CODES.AUTH_FAILED;
      category = 'authentication';
      severity = 'high';
    } else if (message.includes('timeout') || message.includes('ETIMEDOUT')) {
      code = ANKR_ERROR_CODES.TIMEOUT;
      category = 'timeout';
      severity = 'medium';
    }

    return new RPCError(message, code, {
      originalError: error,
      provider: 'ankr',
      category,
      severity,
      timestamp: new Date().toISOString(),
      requestId: this._generateRequestId(),
      retryable: this._isRetryableError(code)
    });
  }

  _isRetryableError(errorCode) {
    const retryableErrors = [
      ANKR_ERROR_CODES.SERVICE_UNAVAILABLE,
      ANKR_ERROR_CODES.NETWORK_ERROR,
      ANKR_ERROR_CODES.TIMEOUT,
      ANKR_ERROR_CODES.RATE_LIMITED
    ];
    return retryableErrors.includes(errorCode);
  }

  _getRateLimiterStatus() {
    return {
      status: 'ok',
      activeRequests: this.rateLimiter._activeRequests,
      requestsPerSecond: this.rateLimiter.requestsPerSecond,
      burstSize: this.rateLimiter.burstSize,
      windows: this.rateLimiter.windows.size
    };
  }

  // Implement remaining private methods...
  async _checkConnectivity() {
    try {
      const response = await this._makeRequest({ method: 'net_version', params: [] }, { timeout: 5000 });
      return { status: 'healthy', message: 'Connectivity OK', networkVersion: response };
    } catch (error) {
      return { status: 'unhealthy', message: 'Connectivity failed', error: error.message };
    }
  }

  async _checkRPCFunctionality() {
    try {
      const blockNumber = await this._makeRequest({ method: 'eth_blockNumber', params: [] }, { timeout: 10000 });
      const blockNumberInt = parseInt(blockNumber, 16);
      const isValid = blockNumberInt > 0;
      
      return {
        status: isValid ? 'healthy' : 'unhealthy',
        message: isValid ? 'RPC functionality OK' : 'Invalid block number',
        blockNumber: blockNumberInt
      };
    } catch (error) {
      return { status: 'unhealthy', message: 'RPC check failed', error: error.message };
    }
  }

  async _checkPerformance() {
    const startTime = Date.now();
    try {
      await this._makeRequest({ method: 'eth_chainId', params: [] }, { timeout: 3000 });
      const responseTime = Date.now() - startTime;
      const isPerformant = responseTime < 2000;
      
      return {
        status: isPerformant ? 'healthy' : 'degraded',
        message: isPerformant ? 'Performance OK' : 'Performance degraded',
        responseTime
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: 'Performance check failed',
        responseTime: Date.now() - startTime,
        error: error.message
      };
    }
  }
}

/**
 * Utility function to validate Ankr API key format
 */
export function isValidAnkrApiKey(apiKey) {
  return typeof apiKey === 'string' && 
         apiKey.length >= 32 && 
         /^[a-zA-Z0-9_-]+$/.test(apiKey);
}

/**
 * Factory function with enhanced validation
 */
export function createAnkrBroadcastProvider(config) {
  try {
    return new AnkrBroadcastProvider(config);
  } catch (error) {
    throw new RPCError(
      `Failed to create AnkrBroadcastProvider: ${error.message}`,
      error.code || ANKR_ERROR_CODES.INVALID_CONFIG,
      { originalError: error, config: sanitizeConfig(config) }
    );
  }
}

/**
 * Creates an Ankr provider with automatic network detection and optimization
 */
export function createAnkrProviderForNetwork(apiKey, chainId, options = {}) {
  const networkInfo = Object.values(ANKR_NETWORKS).find(n => n.chainId === chainId);
  
  if (!networkInfo) {
    throw new RPCError(
      `Unsupported chain ID: ${chainId}`,
      ANKR_ERROR_CODES.INVALID_CHAIN_ID,
      { 
        supportedChains: Object.values(ANKR_NETWORKS).map(n => ({ 
          chainId: n.chainId, 
          name: n.name 
        })) 
      }
    );
  }

  const rpcUrl = `https://rpc.ankr.com${networkInfo.rpcPath}/${apiKey}`;
  
  // Network-specific optimizations
  const networkOptimizations = {
    rateLimits: {
      requestsPerSecond: networkInfo.name === 'ethereum' ? 10 : 15,
      burstSize: networkInfo.name === 'ethereum' ? 20 : 30
    },
    circuitBreaker: {
      timeout: networkInfo.blockTime * 3 // 3x block time
    },
    caching: {
      ttl: networkInfo.blockTime, // Cache for one block time
      maxSize: networkInfo.name === 'ethereum' ? 500 : 1000
    }
  };
  
  return createAnkrBroadcastProvider({
    rpcUrl,
    chainId,
    apiKey,
    ...networkOptimizations,
    ...options
  });
}

/**
 * Enhanced configuration builder with fluent interface and validation
 */
export class AnkrProviderConfigBuilder {
  constructor() {
    this.config = {
      rateLimits: {},
      circuitBreaker: {},
      monitoring: {},
      security: {},
      caching: {},
      connectionPool: {}
    };
  }

  /**
   * Sets basic connection parameters with validation
   */
  connection(rpcUrl, chainId, apiKey) {
    if (!rpcUrl || !chainId) {
      throw new Error('RPC URL and chain ID are required');
    }
    
    this.config.rpcUrl = rpcUrl;
    this.config.chainId = chainId;
    this.config.apiKey = apiKey;
    return this;
  }

  /**
   * Configures rate limiting with intelligent defaults
   */
  rateLimiting(limits = {}) {
    this.config.rateLimits = {
      requestsPerSecond: 15,
      burstSize: 30,
      concurrentRequests: 8,
      ...limits
    };
    return this;
  }

  /**
   * Configures circuit breaker with adaptive settings
   */
  circuitBreaker(settings = {}) {
    this.config.circuitBreaker = {
      failureThreshold: 5,
      recoveryTime: 30000,
      timeout: 30000,
      monitoringPeriod: 10000,
      ...settings
    };
    return this;
  }

  /**
   * Configures comprehensive monitoring
   */
  monitoring(settings = {}) {
    this.config.monitoring = {
      enableDetailedMetrics: true,
      metricsInterval: 30000,
      alertThresholds: {
        errorRate: 0.05, // 5%
        responseTime: 5000, // 5 seconds
        failureCount: 10
      },
      ...settings
    };
    return this;
  }

  /**
   * Configures security with best practices
   */
  security(settings = {}) {
    this.config.security = {
      enableRequestSigning: true,
      enableResponseValidation: true,
      maskSensitiveData: true,
      auditLogging: true,
      rateLimitByIP: true,
      ...settings
    };
    return this;
  }

  /**
   * Configures intelligent caching
   */
  caching(settings = {}) {
    this.config.caching = {
      enabled: true,
      ttl: 60000,
      maxSize: 1000,
      compression: true,
      persistToDisk: false,
      ...settings
    };
    return this;
  }

  /**
   * Configures connection pooling for better performance
   */
  connectionPool(settings = {}) {
    this.config.connectionPool = {
      enabled: true,
      maxConnections: 10,
      keepAliveTimeout: 60000,
      connectionTimeout: 10000,
      ...settings
    };
    return this;
  }

  /**
   * Sets retry configuration with exponential backoff
   */
  retries(maxRetries = 3, initialDelayMs = 1000, maxDelayMs = 30000) {
    this.config.maxRetries = maxRetries;
    this.config.retryDelayMs = initialDelayMs;
    this.config.maxRetryDelayMs = maxDelayMs;
    this.config.retryStrategy = 'exponential';
    return this;
  }

  /**
   * Sets timeout configuration
   */
  timeout(timeoutMs = 30000) {
    if (timeoutMs < 1000 || timeoutMs > 300000) {
      throw new Error('Timeout must be between 1s and 5m');
    }
    this.config.timeoutMs = timeoutMs;
    return this;
  }

  /**
   * Enables specific optimizations for the network
   */
  optimizeForNetwork(chainId) {
    const networkInfo = Object.values(ANKR_NETWORKS).find(n => n.chainId === chainId);
    
    if (networkInfo) {
      // Apply network-specific optimizations
      this.config.rateLimits.requestsPerSecond = networkInfo.name === 'ethereum' ? 10 : 15;
      this.config.circuitBreaker.timeout = networkInfo.blockTime * 3;
      this.config.caching.ttl = networkInfo.blockTime;
      this.config.gasMultiplier = networkInfo.gasMultiplier;
    }
    
    return this;
  }

  /**
   * Enables development mode with relaxed settings
   */
  developmentMode() {
    this.config.rateLimits.requestsPerSecond = 50;
    this.config.rateLimits.burstSize = 100;
    this.config.security.auditLogging = false;
    this.config.monitoring.enableDetailedMetrics = false;
    return this;
  }

  /**
   * Enables production mode with strict settings
   */
  productionMode() {
    this.config.rateLimits.requestsPerSecond = 10;
    this.config.rateLimits.burstSize = 20;
    this.config.security.auditLogging = true;
    this.config.security.enableRequestSigning = true;
    this.config.monitoring.enableDetailedMetrics = true;
    return this;
  }

  /**
   * Validates and builds the configuration
   */
  build() {
    // Validate required fields
    if (!this.config.rpcUrl || !this.config.chainId) {
      throw new RPCError(
        'RPC URL and chain ID are required',
        ANKR_ERROR_CODES.INVALID_CONFIG
      );
    }

    // Validate rate limits
    if (this.config.rateLimits.requestsPerSecond > 100) {
      throw new RPCError(
        'Requests per second cannot exceed 100',
        ANKR_ERROR_CODES.INVALID_CONFIG
      );
    }

    // Set intelligent defaults based on configuration
    if (!this.config.maxRetries) {
      this.config.maxRetries = this.config.rateLimits.requestsPerSecond > 20 ? 5 : 3;
    }

    return { ...this.config };
  }

  /**
   * Builds and creates the provider instance
   */
  create() {
    return createAnkrBroadcastProvider(this.build());
  }
}

/**
 * Utility functions
 */

/**
 * Gets available Ankr networks with metadata
 */
export function getAnkrNetworks() {
  return Object.values(ANKR_NETWORKS).map(network => ({
    chainId: network.chainId,
    name: network.name,
    rpcPath: network.rpcPath,
    blockTime: network.blockTime,
    confirmations: network.confirmations,
    gasMultiplier: network.gasMultiplier
  }));
}

/**
 * Validates if URL is a proper Ankr RPC URL
 */
export function isAnkrRpcUrl(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname === 'rpc.ankr.com' && 
           urlObj.protocol === 'https:' &&
           Object.values(ANKR_NETWORKS).some(network => 
             urlObj.pathname.startsWith(network.rpcPath)
           );
  } catch {
    return false;
  }
}

/**
 * Sanitizes configuration for logging (removes sensitive data)
 */
export function sanitizeConfig(config) {
  if (!config) return config;
  
  const sanitized = { ...config };
  
  // Mask sensitive fields
  if (sanitized.apiKey) sanitized.apiKey = '***MASKED***';
  if (sanitized.auth) sanitized.auth = { ...sanitized.auth, apiKey: '***MASKED***' };
  if (sanitized.rpcUrl) {
    sanitized.rpcUrl = sanitized.rpcUrl.replace(/\/\w{32,}/, '/***API_KEY***');
  }
  
  return sanitized;
}

/**
 * Creates a provider with automatic failover to multiple endpoints
 */
export class AnkrFailoverProvider {
  constructor(configs) {
    if (!Array.isArray(configs) || configs.length === 0) {
      throw new RPCError(
        'At least one provider configuration is required',
        ANKR_ERROR_CODES.INVALID_CONFIG
      );
    }

    this.providers = configs.map(config => createAnkrBroadcastProvider(config));
    this.currentIndex = 0;
    this.failoverAttempts = 0;
    this.maxFailoverAttempts = this.providers.length * 2;
  }

  async executeWithFailover(requestFn) {
    let lastError;

    for (let attempt = 0; attempt < this.maxFailoverAttempts; attempt++) {
      const provider = this.providers[this.currentIndex];

      try {
        const result = await provider.executeWithRetry(requestFn);
        this.failoverAttempts = 0; // Reset on success
        return result;
      } catch (error) {
        lastError = error;
        
        // Check if we should failover
        if (this._shouldFailover(error)) {
          this._switchToNextProvider();
          this.failoverAttempts++;
          continue;
        }
        
        throw error;
      }
    }

    throw new RPCError(
      'All providers failed after exhausting failover attempts',
      ANKR_ERROR_CODES.SERVICE_UNAVAILABLE,
      { 
        attempts: this.maxFailoverAttempts,
        lastError,
        availableProviders: this.providers.length
      }
    );
  }

  _shouldFailover(error) {
    const failoverErrors = [
      ANKR_ERROR_CODES.SERVICE_UNAVAILABLE,
      ANKR_ERROR_CODES.NETWORK_ERROR,
      ANKR_ERROR_CODES.TIMEOUT,
      ANKR_ERROR_CODES.MAINTENANCE_MODE
    ];
    
    return failoverErrors.includes(error.code);
  }

  _switchToNextProvider() {
    this.currentIndex = (this.currentIndex + 1) % this.providers.length;
  }

  async healthCheck() {
    const results = await Promise.allSettled(
      this.providers.map(async (provider, index) => {
        try {
          const health = await provider.performHealthCheck();
          return { index, status: 'healthy', health };
        } catch (error) {
          return { index, status: 'unhealthy', error: error.message };
        }
      })
    );

    return {
      overallStatus: results.some(r => r.value?.status === 'healthy') ? 'healthy' : 'unhealthy',
      providers: results.map(r => r.value || r.reason),
      activeProvider: this.currentIndex,
      timestamp: new Date().toISOString()
    };
  }

  async shutdown() {
    await Promise.allSettled(
      this.providers.map(provider => provider.shutdown())
    );
  }
}

/**
 * Example usage and patterns
 */

// Basic usage
const basicProvider = createAnkrBroadcastProvider({
  rpcUrl: 'https://rpc.ankr.com/eth/YOUR_API_KEY',
  chainId: 1,
  apiKey: 'YOUR_API_KEY'
});

// Advanced configuration with builder
const advancedProvider = new AnkrProviderConfigBuilder()
  .connection('https://rpc.ankr.com/eth/API_KEY', 1, 'API_KEY')
  .rateLimiting({ requestsPerSecond: 20, burstSize: 50 })
  .circuitBreaker({ failureThreshold: 3, recoveryTime: 30000 })
  .monitoring({ enableDetailedMetrics: true })
  .security({ enableRequestSigning: true })
  .caching({ enabled: true, ttl: 30000 })
  .connectionPool({ maxConnections: 15 })
  .retries(5, 2000)
  .timeout(45000)
  .optimizeForNetwork(1)
  .productionMode()
  .create();

// Network-specific provider
const bscProvider = createAnkrProviderForNetwork('API_KEY', 56, {
  rateLimits: { requestsPerSecond: 25 }
});

// Failover provider setup
const failoverProvider = new AnkrFailoverProvider([
  { rpcUrl: 'https://rpc.ankr.com/eth/KEY1', chainId: 1, apiKey: 'KEY1' },
  { rpcUrl: 'https://rpc.ankr.com/eth/KEY2', chainId: 1, apiKey: 'KEY2' }
]);

export default AnkrBroadcastProvider;
