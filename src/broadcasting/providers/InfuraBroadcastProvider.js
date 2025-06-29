/**
   * Map Infura-specific HTTP errors to custom error codes with enhanced context
   * @private
   * @param {Error} error - Original error
   * @returns {InfuraError} Mapped error with full context/**
 * @fileoverview Enterprise-grade Infura Broadcast Provider with failover and rate limiting
 * @version 1.0.0
 * @author Senior Backend Development Team
 * @license MIT
 */

import { RPCBroadcastProvider, RPCError, RPC_ERROR_CODES } from './RPCBroadcastProvider.js';
import crypto from 'crypto';

/**
 * Infura-specific error codes
 * @readonly
 * @enum {string}
 */
export const INFURA_ERROR_CODES = {
  INVALID_PROJECT_ID: 'INFURA_INVALID_PROJECT_ID',
  INVALID_PROJECT_SECRET: 'INFURA_INVALID_PROJECT_SECRET',
  QUOTA_EXCEEDED: 'INFURA_QUOTA_EXCEEDED',
  RATE_LIMITED: 'INFURA_RATE_LIMITED',
  UNAUTHORIZED: 'INFURA_UNAUTHORIZED',
  ARCHIVE_REQUIRED: 'INFURA_ARCHIVE_REQUIRED',
  NETWORK_UNSUPPORTED: 'INFURA_NETWORK_UNSUPPORTED',
  FAILOVER_ACTIVATED: 'INFURA_FAILOVER_ACTIVATED',
  KEY_ROTATION_FAILED: 'INFURA_KEY_ROTATION_FAILED'
};

/**
 * Supported Infura networks with their configurations
 * @readonly
 * @enum {Object}
 */
export const INFURA_NETWORKS = {
  mainnet: { chainId: 1, endpoint: 'mainnet', archiveSupported: true },
  goerli: { chainId: 5, endpoint: 'goerli', archiveSupported: true },
  sepolia: { chainId: 11155111, endpoint: 'sepolia', archiveSupported: true },
  polygon: { chainId: 137, endpoint: 'polygon-mainnet', archiveSupported: true },
  'polygon-mumbai': { chainId: 80001, endpoint: 'polygon-mumbai', archiveSupported: true },
  arbitrum: { chainId: 42161, endpoint: 'arbitrum-mainnet', archiveSupported: true },
  'arbitrum-goerli': { chainId: 421613, endpoint: 'arbitrum-goerli', archiveSupported: true },
  optimism: { chainId: 10, endpoint: 'optimism-mainnet', archiveSupported: true },
  'optimism-goerli': { chainId: 420, endpoint: 'optimism-goerli', archiveSupported: true },
  avalanche: { chainId: 43114, endpoint: 'avalanche-mainnet', archiveSupported: true },
  'avalanche-fuji': { chainId: 43113, endpoint: 'avalanche-fuji', archiveSupported: true }
};

/**
 * LRU Cache implementation for rate limit tracking
 */
class LRUCache {
  /**
   * @param {number} maxSize - Maximum cache size
   * @param {number} ttl - Time to live in milliseconds
   */
  constructor(maxSize = 1000, ttl = 60000) {
    this.maxSize = maxSize;
    this.ttl = ttl;
    this.cache = new Map();
    this.accessOrder = [];
  }

  /**
   * Get value from cache
   * @param {string} key - Cache key
   * @returns {any} Cached value or undefined
   */
  get(key) {
    const item = this.cache.get(key);
    if (!item) return undefined;

    // Check TTL
    if (Date.now() - item.timestamp > this.ttl) {
      this.delete(key);
      return undefined;
    }

    // Update access order
    this._updateAccessOrder(key);
    return item.value;
  }

  /**
   * Set value in cache
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   */
  set(key, value) {
    // Remove existing entry
    if (this.cache.has(key)) {
      this.delete(key);
    }

    // Evict oldest entry if at capacity
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.accessOrder.shift();
      this.cache.delete(oldestKey);
    }

    // Add new entry
    this.cache.set(key, {
      value,
      timestamp: Date.now()
    });
    this.accessOrder.push(key);
  }

  /**
   * Delete entry from cache
   * @param {string} key - Cache key
   */
  delete(key) {
    this.cache.delete(key);
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
  }

  /**
   * Update access order for LRU eviction
   * @private
   * @param {string} key - Cache key
   */
  _updateAccessOrder(key) {
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
      this.accessOrder.push(key);
    }
  }

  /**
   * Clear expired entries
   */
  cleanup() {
    const now = Date.now();
    const expiredKeys = [];

    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > this.ttl) {
        expiredKeys.push(key);
      }
    }

    expiredKeys.forEach(key => this.delete(key));
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache statistics
   */
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      utilizationPercent: (this.cache.size / this.maxSize) * 100,
      ttl: this.ttl
    };
  }
}

/**
 * Lightweight high-performance rate limiter for >1k RPM
 */
class HighThroughputRateLimiter {
  /**
   * @param {Object} config - Rate limiter configuration
   * @param {number} [config.requestsPerMinute=1000] - Requests per minute limit
   * @param {number} [config.burstSize=100] - Burst size allowance
   * @param {number} [config.windowSizeMs=60000] - Time window in milliseconds
   */
  constructor(config = {}) {
    this.requestsPerMinute = config.requestsPerMinute || 1000;
    this.burstSize = config.burstSize || 100;
    this.windowSizeMs = config.windowSizeMs || 60000;
    
    // Use circular buffer for efficient memory usage
    this.requestTimestamps = new Array(this.requestsPerMinute + this.burstSize);
    this.currentIndex = 0;
    this.requestCount = 0;
    
    // Token bucket for burst handling
    this.tokens = this.burstSize;
    this.lastRefill = Date.now();
    this.refillRate = this.requestsPerMinute / 60000; // tokens per ms
  }

  /**
   * Check if request is allowed
   * @returns {Object} Rate limit check result
   */
  checkLimit() {
    const now = Date.now();
    
    // Refill token bucket
    this._refillTokens(now);
    
    // Check token bucket first (for burst)
    if (this.tokens >= 1) {
      return { allowed: true, type: 'burst', remainingTokens: Math.floor(this.tokens) };
    }
    
    // Check sliding window
    const windowStart = now - this.windowSizeMs;
    const validRequests = this._countValidRequests(windowStart);
    
    if (validRequests < this.requestsPerMinute) {
      return { 
        allowed: true, 
        type: 'normal', 
        remainingRequests: this.requestsPerMinute - validRequests 
      };
    }
    
    // Calculate next available time
    const oldestValidIndex = this._getOldestValidIndex(windowStart);
    const nextAvailableTime = oldestValidIndex !== -1 ? 
      this.requestTimestamps[oldestValidIndex] + this.windowSizeMs : now + 1000;
    
    return {
      allowed: false,
      reason: 'rate_limited',
      nextAvailableTime,
      remainingRequests: 0
    };
  }

  /**
   * Record a request
   */
  recordRequest() {
    const now = Date.now();
    
    // Use token if available
    if (this.tokens >= 1) {
      this.tokens -= 1;
    }
    
    // Record in circular buffer
    this.requestTimestamps[this.currentIndex] = now;
    this.currentIndex = (this.currentIndex + 1) % this.requestTimestamps.length;
    this.requestCount++;
  }

  /**
   * Refill token bucket
   * @private
   * @param {number} now - Current timestamp
   */
  _refillTokens(now) {
    const timePassed = now - this.lastRefill;
    const tokensToAdd = timePassed * this.refillRate;
    
    this.tokens = Math.min(this.burstSize, this.tokens + tokensToAdd);
    this.lastRefill = now;
  }

  /**
   * Count valid requests in sliding window
   * @private
   * @param {number} windowStart - Window start time
   * @returns {number} Number of valid requests
   */
  _countValidRequests(windowStart) {
    let count = 0;
    const maxCheck = Math.min(this.requestCount, this.requestTimestamps.length);
    
    for (let i = 0; i < maxCheck; i++) {
      if (this.requestTimestamps[i] && this.requestTimestamps[i] > windowStart) {
        count++;
      }
    }
    
    return count;
  }

  /**
   * Get oldest valid request index
   * @private
   * @param {number} windowStart - Window start time
   * @returns {number} Oldest valid index or -1
   */
  _getOldestValidIndex(windowStart) {
    const maxCheck = Math.min(this.requestCount, this.requestTimestamps.length);
    
    for (let i = 0; i < maxCheck; i++) {
      if (this.requestTimestamps[i] && this.requestTimestamps[i] > windowStart) {
        return i;
      }
    }
    
    return -1;
  }

  /**
   * Get rate limiter statistics
   * @returns {Object} Statistics
   */
  getStats() {
    const now = Date.now();
    const windowStart = now - this.windowSizeMs;
    
    return {
      requestsPerMinute: this.requestsPerMinute,
      burstSize: this.burstSize,
      currentTokens: Math.floor(this.tokens),
      requestsInWindow: this._countValidRequests(windowStart),
      utilizationPercent: (this._countValidRequests(windowStart) / this.requestsPerMinute) * 100,
      totalRequests: this.requestCount
    };
  }
}
class InfuraRateLimitTracker {
  /**
   * @param {Object} config - Rate limit configuration
   * @param {number} [config.dailyLimit=100000] - Daily request limit
   * @param {number} [config.secondlyLimit=10] - Requests per second limit
   * @param {number} [config.burstLimit=50] - Burst request limit
   */
  constructor(config = {}) {
    this.dailyLimit = config.dailyLimit || 100000;
    this.secondlyLimit = config.secondlyLimit || 10;
    this.burstLimit = config.burstLimit || 50;
    
    this.requestCount = 0;
    this.dailyRequestCount = 0;
    this.lastResetTime = Date.now();
    this.secondlyRequests = [];
    this.burstRequests = [];
    
    this.cache = new LRUCache(1000, 300000); // 5 minute TTL
    
    // Reset daily counter at midnight UTC
    this._scheduleDailyReset();
  }

  /**
   * Check if request is allowed under rate limits
   * @param {string} [endpoint] - Optional endpoint for granular tracking
   * @returns {Object} Rate limit check result
   */
  checkRateLimit(endpoint = 'default') {
    const now = Date.now();
    const currentSecond = Math.floor(now / 1000);
    const currentMinute = Math.floor(now / 60000);

    // Clean old requests
    this._cleanOldRequests(now);

    // Check daily limit
    if (this.dailyRequestCount >= this.dailyLimit) {
      return {
        allowed: false,
        reason: 'daily_limit_exceeded',
        resetTime: this._getNextMidnightUTC(),
        remainingRequests: 0
      };
    }

    // Check per-second limit
    const currentSecondRequests = this.secondlyRequests.filter(
      req => Math.floor(req / 1000) === currentSecond
    ).length;

    if (currentSecondRequests >= this.secondlyLimit) {
      return {
        allowed: false,
        reason: 'rate_limit_exceeded',
        resetTime: (currentSecond + 1) * 1000,
        remainingRequests: this.secondlyLimit - currentSecondRequests
      };
    }

    // Check burst limit (requests in last 10 seconds)
    const tenSecondsAgo = now - 10000;
    const burstRequests = this.burstRequests.filter(req => req > tenSecondsAgo).length;

    if (burstRequests >= this.burstLimit) {
      return {
        allowed: false,
        reason: 'burst_limit_exceeded',
        resetTime: tenSecondsAgo + 10000,
        remainingRequests: this.burstLimit - burstRequests
      };
    }

    return {
      allowed: true,
      remainingDaily: this.dailyLimit - this.dailyRequestCount,
      remainingSecondly: this.secondlyLimit - currentSecondRequests,
      remainingBurst: this.burstLimit - burstRequests
    };
  }

  /**
   * Record a request
   * @param {string} [endpoint] - Optional endpoint
   */
  recordRequest(endpoint = 'default') {
    const now = Date.now();
    
    this.requestCount++;
    this.dailyRequestCount++;
    this.secondlyRequests.push(now);
    this.burstRequests.push(now);

    // Cache endpoint-specific stats
    const endpointStats = this.cache.get(endpoint) || { count: 0, lastRequest: 0 };
    endpointStats.count++;
    endpointStats.lastRequest = now;
    this.cache.set(endpoint, endpointStats);
  }

  /**
   * Update rate limits from Infura response headers
   * @param {Object} headers - HTTP response headers
   */
  updateFromHeaders(headers) {
    if (headers['x-ratelimit-limit']) {
      this.dailyLimit = parseInt(headers['x-ratelimit-limit'], 10);
    }

    if (headers['x-ratelimit-remaining']) {
      const remaining = parseInt(headers['x-ratelimit-remaining'], 10);
      this.dailyRequestCount = Math.max(0, this.dailyLimit - remaining);
    }

    if (headers['x-ratelimit-reset']) {
      // Infura typically provides reset time as Unix timestamp
      this.nextResetTime = parseInt(headers['x-ratelimit-reset'], 10) * 1000;
    }
  }

  /**
   * Clean old request records
   * @private
   * @param {number} now - Current timestamp
   */
  _cleanOldRequests(now) {
    // Keep only requests from last 60 seconds for per-second tracking
    this.secondlyRequests = this.secondlyRequests.filter(req => now - req < 60000);
    
    // Keep only requests from last 10 seconds for burst tracking
    this.burstRequests = this.burstRequests.filter(req => now - req < 10000);
  }

  /**
   * Schedule daily reset
   * @private
   */
  _scheduleDailyReset() {
    const now = new Date();
    const nextMidnight = this._getNextMidnightUTC();
    const timeToMidnight = nextMidnight - now.getTime();

    setTimeout(() => {
      this.dailyRequestCount = 0;
      this.lastResetTime = Date.now();
      this._scheduleDailyReset(); // Schedule next reset
    }, timeToMidnight);
  }

  /**
   * Get next midnight UTC timestamp
   * @private
   * @returns {number} Next midnight UTC timestamp
   */
  _getNextMidnightUTC() {
    const now = new Date();
    const nextMidnight = new Date(now);
    nextMidnight.setUTCHours(24, 0, 0, 0);
    return nextMidnight.getTime();
  }

  /**
   * Get rate limit statistics
   * @returns {Object} Rate limit statistics
   */
  getStats() {
    const now = Date.now();
    return {
      totalRequests: this.requestCount,
      dailyRequests: this.dailyRequestCount,
      dailyLimit: this.dailyLimit,
      remainingDaily: Math.max(0, this.dailyLimit - this.dailyRequestCount),
      utilizationPercent: (this.dailyRequestCount / this.dailyLimit) * 100,
      lastResetTime: this.lastResetTime,
      nextResetTime: this._getNextMidnightUTC(),
      cacheStats: this.cache.getStats(),
      recentActivity: {
        lastMinute: this.secondlyRequests.filter(req => now - req < 60000).length,
        lastTenSeconds: this.burstRequests.filter(req => now - req < 10000).length
      }
    };
  }
}

/**
 * Enterprise-grade Infura Broadcast Provider
 */
export class InfuraBroadcastProvider extends RPCBroadcastProvider {
  /**
   * @param {Object} config - Configuration object
   * @param {string} config.projectId - Infura project ID
   * @param {string} config.projectSecret - Infura project secret
   * @param {string} config.network - Network name (e.g., 'mainnet', 'polygon')
   * @param {Object} [config.fallbackProvider] - Fallback provider configuration
   * @param {Object} [config.rateLimitConfig] - Rate limiting configuration
   * @param {number} [config.rateLimitConfig.dailyLimit=100000] - Daily request limit
   * @param {number} [config.rateLimitConfig.secondlyLimit=10] - Requests per second
   * @param {boolean} [config.enableArchiveNode=false] - Enable archive node support
   * @param {boolean} [config.enableFailover=true] - Enable automatic failover
   * @param {number} [config.failoverThreshold=3] - Consecutive failures before failover
   * @param {Object} config.opts - Additional options passed to parent class
   */
  constructor({ 
    projectId, 
    projectSecret, 
    network, 
    fallbackProvider,
    rateLimitConfig = {},
    enableArchiveNode = false,
    enableFailover = true,
    failoverThreshold = 3,
    ...opts 
  }) {
    // Validate required parameters
    if (!projectId || typeof projectId !== 'string') {
      throw new RPCError(
        'Valid Infura project ID is required',
        INFURA_ERROR_CODES.INVALID_PROJECT_ID
      );
    }

    if (!projectSecret || typeof projectSecret !== 'string') {
      throw new RPCError(
        'Valid Infura project secret is required',
        INFURA_ERROR_CODES.INVALID_PROJECT_SECRET
      );
    }

    if (!network || !INFURA_NETWORKS[network]) {
      throw new RPCError(
        `Unsupported network: ${network}. Supported networks: ${Object.keys(INFURA_NETWORKS).join(', ')}`,
        INFURA_ERROR_CODES.NETWORK_UNSUPPORTED
      );
    }

    // Build secure Infura RPC URL
    const networkConfig = INFURA_NETWORKS[network];
    const rpcUrl = InfuraBroadcastProvider._buildInfuraUrl(
      projectId, 
      projectSecret, 
      networkConfig.endpoint,
      enableArchiveNode
    );

    // Initialize parent class with Infura configuration
    super({
      rpcUrl,
      chainId: networkConfig.chainId,
      securityProfile: 'PRODUCTION',
      auth: {
        type: 'basic',
        username: projectId,
        password: projectSecret
      },
      ...opts
    });

    // Store configuration (secrets are not logged)
    this.projectId = projectId;
    this.projectSecret = projectSecret;
    this.network = network;
    this.networkConfig = networkConfig;
    this.enableArchiveNode = enableArchiveNode;
    this.enableFailover = enableFailover;
    this.failoverThreshold = failoverThreshold;

    // Initialize Infura-specific components
    this.rateLimitTracker = new InfuraRateLimitTracker(rateLimitConfig);
    
    // Add high-throughput rate limiter for >1k RPM scenarios
    this.highThroughputLimiter = new HighThroughputRateLimiter({
      requestsPerMinute: rateLimitConfig.requestsPerMinute || 1000,
      burstSize: rateLimitConfig.burstSize || 100
    });
    
    this.failoverProvider = null;
    
    // Initialize failover provider if configured
    if (fallbackProvider && enableFailover) {
      this._initializeFallbackProvider(fallbackProvider);
    }

    // Statistics tracking
    this.infuraStats = {
      infuraRequests: 0,
      infuraFailures: 0,
      failoverActivations: 0,
      lastFailoverTime: null,
      keyRotations: 0,
      archiveRequests: 0,
      rateLimitHits: 0,
      consecutiveFailures: 0,
      isFailoverActive: false,
      startTime: Date.now()
    };

    // Enhanced logging context
    this.logger.info('InfuraBroadcastProvider initialized', {
      network: this.network,
      chainId: this.networkConfig.chainId,
      archiveNodeEnabled: this.enableArchiveNode,
      failoverEnabled: this.enableFailover,
      projectIdMasked: this._maskProjectId(this.projectId)
    });
  }

  /**
   * Build secure Infura RPC URL
   * @private
   * @param {string} projectId - Project ID
   * @param {string} projectSecret - Project secret
   * @param {string} endpoint - Network endpoint
   * @param {boolean} enableArchive - Enable archive node
   * @returns {string} Infura RPC URL
   */
  static _buildInfuraUrl(projectId, projectSecret, endpoint, enableArchive = false) {
    // Validate inputs
    if (!projectId?.match(/^[a-zA-Z0-9]{32}$/)) {
      throw new RPCError(
        'Invalid Infura project ID format',
        INFURA_ERROR_CODES.INVALID_PROJECT_ID
      );
    }

    if (!projectSecret?.match(/^[a-zA-Z0-9]{32}$/)) {
      throw new RPCError(
        'Invalid Infura project secret format',
        INFURA_ERROR_CODES.INVALID_PROJECT_SECRET
      );
    }

    const subdomain = enableArchive ? 'mainnet-archive' : endpoint;
    return `https://${subdomain}.infura.io/v3/${projectId}`;
  }

  /**
   * Initialize fallback provider
   * @private
   * @param {Object} fallbackConfig - Fallback provider configuration
   */
  _initializeFallbackProvider(fallbackConfig) {
    try {
      this.failoverProvider = new RPCBroadcastProvider({
        ...fallbackConfig,
        chainId: this.networkConfig.chainId,
        securityProfile: 'PRODUCTION'
      });

      this.logger.info('Fallback provider initialized', {
        fallbackUrl: this._maskSensitiveData(fallbackConfig.rpcUrl),
        chainId: this.networkConfig.chainId
      });
    } catch (error) {
      this.logger.error('Infura key rotation failed', {
        error: error.message,
        newProjectIdMasked: this._maskProjectId(newProjectId)
      });

      throw new RPCError(
        `Key rotation failed: ${error.message}`,
        INFURA_ERROR_CODES.KEY_ROTATION_FAILED,
        { originalError: error.message }
      );
    }
  }

  /**
   * Perform comprehensive health check
   * @returns {Promise<Object>} Health check results
   */
  async healthCheck() {
    const startTime = Date.now();
    const healthResult = {
      healthy: false,
      timestamp: new Date().toISOString(),
      checks: {
        infuraConnectivity: false,
        authentication: false,
        networkValidation: false,
        rateLimitStatus: false,
        failoverAvailable: false,
        archiveNodeAccess: false
      },
      infuraStats: this.getInfuraStats(),
      responseTime: 0,
      errors: []
    };

    try {
      // Check rate limit status
      const rateLimitCheck = this.rateLimitTracker.checkRateLimit('health');
      healthResult.checks.rateLimitStatus = rateLimitCheck.allowed;
      
      if (!rateLimitCheck.allowed) {
        healthResult.errors.push(`Rate limited: ${rateLimitCheck.reason}`);
      }

      // Test basic connectivity and authentication
      try {
        const networkInfo = await this.getProvider().getNetwork();
        healthResult.checks.infuraConnectivity = true;
        healthResult.checks.authentication = true;
        
        // Validate network matches configuration
        if (Number(networkInfo.chainId) === this.networkConfig.chainId) {
          healthResult.checks.networkValidation = true;
        } else {
          healthResult.errors.push(
            `Chain ID mismatch: expected ${this.networkConfig.chainId}, got ${networkInfo.chainId}`
          );
        }
      } catch (error) {
        healthResult.errors.push(`Connectivity test failed: ${error.message}`);
        
        // Determine specific failure type
        if (error.message.includes('401') || error.message.includes('unauthorized')) {
          healthResult.checks.authentication = false;
        } else {
          healthResult.checks.infuraConnectivity = false;
        }
      }

      // Test archive node access if enabled
      if (this.enableArchiveNode && this.networkConfig.archiveSupported) {
        try {
          // Test with an archive-specific call (getting very old block)
          await this.getProvider().getBlock(1);
          healthResult.checks.archiveNodeAccess = true;
        } catch (error) {
          healthResult.errors.push(`Archive node test failed: ${error.message}`);
        }
      } else {
        healthResult.checks.archiveNodeAccess = !this.enableArchiveNode;
      }

      // Check failover provider availability
      if (this.enableFailover && this.failoverProvider) {
        try {
          const failoverHealth = await this.failoverProvider.getHealthStatus();
          healthResult.checks.failoverAvailable = failoverHealth.status === 'healthy';
        } catch (error) {
          healthResult.errors.push(`Failover provider unhealthy: ${error.message}`);
        }
      } else {
        healthResult.checks.failoverAvailable = !this.enableFailover;
      }

      // Overall health determination
      healthResult.healthy = Object.values(healthResult.checks).every(check => check === true);
      healthResult.responseTime = Date.now() - startTime;

      this.logger.info('Infura health check completed', {
        healthy: healthResult.healthy,
        responseTime: healthResult.responseTime,
        errorCount: healthResult.errors.length
      });

      return healthResult;

    } catch (error) {
      healthResult.responseTime = Date.now() - startTime;
      healthResult.errors.push(`Health check failed: ${error.message}`);
      
      this.logger.error('Infura health check failed', {
        error: error.message,
        responseTime: healthResult.responseTime
      });

      return healthResult;
    }
  }

  /**
   * Get Infura-specific statistics
   * @returns {Object} Infura statistics
   */
  getInfuraStats() {
    const baseStats = this.getStats();
    const rateLimitStats = this.rateLimitTracker.getStats();
    
    return {
      ...baseStats,
      infura: {
        ...this.infuraStats,
        uptime: Date.now() - this.infuraStats.startTime,
        successRate: this.infuraStats.infuraRequests > 0 ? 
          (this.infuraStats.infuraRequests - this.infuraStats.infuraFailures) / this.infuraStats.infuraRequests : 0,
        averageFailuresBeforeFailover: this.infuraStats.failoverActivations > 0 ?
          this.infuraStats.infuraFailures / this.infuraStats.failoverActivations : 0
      },
      rateLimiting: rateLimitStats,
      network: {
        name: this.network,
        chainId: this.networkConfig.chainId,
        endpoint: this.networkConfig.endpoint,
        archiveSupported: this.networkConfig.archiveSupported,
        archiveEnabled: this.enableArchiveNode
      },
      failover: {
        enabled: this.enableFailover,
        available: this.failoverProvider !== null,
        isActive: this.infuraStats.isFailoverActive,
        threshold: this.failoverThreshold,
        activations: this.infuraStats.failoverActivations,
        lastActivation: this.infuraStats.lastFailoverTime
      }
    };
  }

  /**
   * Get comprehensive diagnostic information
   * @returns {Promise<Object>} Diagnostic information
   */
  async getInfuraDiagnostics() {
    const diagnostics = await this.getConnectionDiagnostics();
    const healthCheck = await this.healthCheck();
    const stats = this.getInfuraStats();

    return {
      ...diagnostics,
      timestamp: new Date().toISOString(),
      provider: 'Infura',
      infuraSpecific: {
        health: healthCheck,
        configuration: {
          network: this.network,
          chainId: this.networkConfig.chainId,
          archiveNodeEnabled: this.enableArchiveNode,
          failoverEnabled: this.enableFailover,
          projectIdMasked: this._maskProjectId(this.projectId)
        },
        statistics: stats.infura,
        rateLimiting: stats.rateLimiting,
        failover: stats.failover
      },
      recommendations: [
        ...diagnostics.recommendations,
        ...this._generateInfuraRecommendations(stats, healthCheck)
      ]
    };
  }

  /**
   * Generate Infura-specific recommendations
   * @private
   * @param {Object} stats - Current statistics
   * @param {Object} healthCheck - Health check results
   * @returns {Array} Array of recommendations
   */
  _generateInfuraRecommendations(stats, healthCheck) {
    const recommendations = [];

    // Rate limiting recommendations
    if (stats.rateLimiting.utilizationPercent > 80) {
      recommendations.push({
        type: 'rate_limiting',
        priority: 'high',
        message: 'Infura usage approaching daily limit',
        actionable: [
          'Consider upgrading Infura plan',
          'Implement request caching',
          'Enable failover provider',
          'Review request patterns for optimization'
        ]
      });
    }

    // Failover recommendations
    if (stats.infura.consecutiveFailures > 2 && !this.enableFailover) {
      recommendations.push({
        type: 'reliability',
        priority: 'medium',
        message: 'Multiple consecutive failures detected without failover',
        actionable: [
          'Configure failover provider',
          'Enable automatic failover',
          'Monitor Infura service status',
          'Implement retry logic optimization'
        ]
      });
    }

    // Archive node recommendations
    if (this.enableArchiveNode && !healthCheck.checks.archiveNodeAccess) {
      recommendations.push({
        type: 'configuration',
        priority: 'medium',
        message: 'Archive node enabled but not accessible',
        actionable: [
          'Verify Infura plan includes archive access',
          'Check if network supports archive nodes',
          'Consider disabling archive mode if not needed',
          'Contact Infura support for archive access issues'
        ]
      });
    }

    // Performance recommendations
    if (stats.averageResponseTime > 2000) {
      recommendations.push({
        type: 'performance',
        priority: 'medium',
        message: 'High response times detected with Infura',
        actionable: [
          'Check network connectivity to Infura',
          'Consider using different Infura endpoint',
          'Implement request batching',
          'Enable failover for better performance'
        ]
      });
    }

    // Security recommendations
    if (stats.infura.keyRotations === 0 && stats.infura.uptime > 7 * 24 * 60 * 60 * 1000) {
      recommendations.push({
        type: 'security',
        priority: 'low',
        message: 'Consider periodic API key rotation for enhanced security',
        actionable: [
          'Implement regular key rotation schedule',
          'Test key rotation procedure',
          'Monitor for key compromise indicators',
          'Use key rotation for maintenance windows'
        ]
      });
    }

    return recommendations;
  }

  /**
   * Mask project ID for secure logging
   * @private
   * @param {string} projectId - Project ID to mask
   * @returns {string} Masked project ID
   */
  _maskProjectId(projectId) {
    if (!projectId || projectId.length < 8) {
      return '***MASKED***';
    }
    return projectId.substring(0, 4) + '***' + projectId.substring(projectId.length - 4);
  }

  /**
   * Export Infura-specific metrics for monitoring
   * @param {string} [format='json'] - Export format
   * @returns {Object|string} Metrics in specified format
   */
  exportInfuraMetrics(format = 'json') {
    const baseMetrics = this.exportMetrics('json');
    const infuraStats = this.getInfuraStats();
    
    const infuraMetrics = {
      ...baseMetrics,
      
      // Infura-specific metrics
      infura_requests_total: infuraStats.infura.infuraRequests,
      infura_failures_total: infuraStats.infura.infuraFailures,
      infura_success_rate: infuraStats.infura.successRate,
      infura_failover_activations: infuraStats.infura.failoverActivations,
      infura_consecutive_failures: infuraStats.infura.consecutiveFailures,
      infura_is_failover_active: infuraStats.infura.isFailoverActive ? 1 : 0,
      infura_key_rotations: infuraStats.infura.keyRotations,
      infura_archive_requests: infuraStats.infura.archiveRequests,
      infura_rate_limit_hits: infuraStats.infura.rateLimitHits,
      
      // Rate limiting metrics
      infura_daily_requests: infuraStats.rateLimiting.dailyRequests,
      infura_daily_limit: infuraStats.rateLimiting.dailyLimit,
      infura_rate_limit_utilization: infuraStats.rateLimiting.utilizationPercent,
      infura_remaining_daily: infuraStats.rateLimiting.remainingDaily,
      
      // Network metrics
      infura_network_chain_id: infuraStats.network.chainId,
      infura_archive_enabled: infuraStats.network.archiveEnabled ? 1 : 0,
      
      // Failover metrics
      infura_failover_enabled: infuraStats.failover.enabled ? 1 : 0,
      infura_failover_available: infuraStats.failover.available ? 1 : 0
    };

    if (format === 'prometheus') {
      let prometheusMetrics = this.exportMetrics('prometheus');
      
      // Add Infura-specific Prometheus metrics
      const infuraPrometheusMetrics = [
        '# HELP infura_requests_total Total Infura requests',
        '# TYPE infura_requests_total counter',
        `infura_requests_total ${infuraMetrics.infura_requests_total}`,
        '',
        '# HELP infura_success_rate Infura request success rate',
        '# TYPE infura_success_rate gauge', 
        `infura_success_rate ${infuraMetrics.infura_success_rate}`,
        '',
        '# HELP infura_rate_limit_utilization Infura rate limit utilization percentage',
        '# TYPE infura_rate_limit_utilization gauge',
        `infura_rate_limit_utilization ${infuraMetrics.infura_rate_limit_utilization}`,
        '',
        '# HELP infura_failover_active Whether Infura failover is currently active',
        '# TYPE infura_failover_active gauge',
        `infura_failover_active ${infuraMetrics.infura_is_failover_active}`,
        ''
      ].join('\n');
      
      return prometheusMetrics + infuraPrometheusMetrics;
    }

    return infuraMetrics;
  }

  /**
   * Enhanced graceful shutdown with Infura-specific cleanup
   * @returns {Promise<void>}
   */
  async shutdown() {
    this.logger.info('Initiating Infura provider shutdown');

    try {
      // Log final statistics
      const finalStats = this.getInfuraStats();
      this.logger.info('Final Infura statistics', {
        totalInfuraRequests: finalStats.infura.infuraRequests,
        successRate: finalStats.infura.successRate,
        failoverActivations: finalStats.infura.failoverActivations,
        keyRotations: finalStats.infura.keyRotations,
        uptime: finalStats.infura.uptime
      });

      // Cleanup rate limit tracker
      if (this.rateLimitTracker && this.rateLimitTracker.cache) {
        this.rateLimitTracker.cache.cleanup();
      }

      // Shutdown failover provider if exists
      if (this.failoverProvider) {
        await this.failoverProvider.shutdown();
      }

      // Call parent shutdown
      await super.shutdown();

      this.logger.info('Infura provider shutdown completed');

    } catch (error) {
      this.logger.error('Error during Infura provider shutdown', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get troubleshooting information with Infura-specific guidance
   * @returns {Object} Enhanced troubleshooting guide
   */
  getTroubleshootingInfo() {
    const baseTroubleshooting = super.getTroubleshootingInfo();
    const infuraStats = this.getInfuraStats();
    
    return {
      ...baseTroubleshooting,
      infuraSpecific: {
        commonIssues: {
          rateLimiting: {
            symptoms: ['429 HTTP errors', 'Request rejected', 'Daily quota exceeded'],
            causes: ['High request volume', 'Inadequate Infura plan', 'No request optimization'],
            solutions: [
              'Upgrade Infura plan',
              'Implement request caching',
              'Enable request batching',
              'Configure failover provider',
              'Optimize request patterns'
            ]
          },
          authentication: {
            symptoms: ['401 HTTP errors', 'Unauthorized access', 'Invalid credentials'],
            causes: ['Incorrect project ID', 'Invalid project secret', 'Expired credentials'],
            solutions: [
              'Verify project ID format (32 alphanumeric characters)',
              'Check project secret is correct',
              'Ensure project is active in Infura dashboard',
              'Test credentials with curl command',
              'Rotate API keys if compromised'
            ]
          },
          archiveNode: {
            symptoms: ['Archive data not available', 'Historical block errors'],
            causes: ['Archive not enabled', 'Plan limitations', 'Network not supported'],
            solutions: [
              'Enable archive node in configuration',
              'Verify Infura plan includes archive access',
              'Check if network supports archive nodes',
              'Use different historical data method'
            ]
          },
          failover: {
            symptoms: ['Service interruptions', 'High failure rates'],
            causes: ['No fallback configured', 'Failover provider issues'],
            solutions: [
              'Configure reliable failover provider',
              'Test failover mechanisms regularly',
              'Monitor failover provider health',
              'Adjust failover thresholds'
            ]
          }
        },
        diagnosticCommands: [
          'curl -X POST -H "Content-Type: application/json" --data \'{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}\' https://mainnet.infura.io/v3/YOUR_PROJECT_ID',
          'curl -u YOUR_PROJECT_ID:YOUR_PROJECT_SECRET https://mainnet.infura.io/v3/YOUR_PROJECT_ID',
          'Check Infura status page: https://status.infura.io/',
          'Monitor rate limits in Infura dashboard'
        ],
        currentStatus: {
          rateLimitUtilization: `${infuraStats.rateLimiting.utilizationPercent.toFixed(2)}%`,
          consecutiveFailures: infuraStats.infura.consecutiveFailures,
          failoverActive: infuraStats.infura.isFailoverActive,
          lastFailover: infuraStats.infura.lastFailoverTime ? 
            new Date(infuraStats.infura.lastFailoverTime).toISOString() : 'Never'
        }
      }
    };
  }
}

/**
 * Factory function to create Infura broadcast provider
 * @param {Object} config - Configuration object
 * @returns {InfuraBroadcastProvider} Configured Infura provider instance
 */
export default function createInfuraBroadcastProvider(config) {
  try {
    return new InfuraBroadcastProvider(config);
  } catch (error) {
    throw new RPCError(
      `Failed to create Infura broadcast provider: ${error.message}`,
      error.code || INFURA_ERROR_CODES.INVALID_PROJECT_ID,
      {
        factoryError: true,
        originalError: error.message,
        config: {
          hasProjectId: !!config?.projectId,
          hasProjectSecret: !!config?.projectSecret,
          network: config?.network
        }
      }
    );
  }
}

/**
 * Utility function to validate Infura configuration
 * @param {Object} config - Configuration to validate
 * @returns {Object} Validation result
 */
export function validateInfuraConfig(config) {
  const validation = {
    isValid: true,
    errors: [],
    warnings: [],
    recommendations: []
  };

  try {
    // Validate required fields
    if (!config.projectId) {
      validation.errors.push('Project ID is required');
    } else if (!config.projectId.match(/^[a-zA-Z0-9]{32}$/)) {
      validation.errors.push('Project ID must be 32 alphanumeric characters');
    }

    if (!config.projectSecret) {
      validation.errors.push('Project secret is required');
    } else if (!config.projectSecret.match(/^[a-zA-Z0-9]{32}$/)) {
      validation.errors.push('Project secret must be 32 alphanumeric characters');
    }

    if (!config.network) {
      validation.errors.push('Network is required');
    } else if (!INFURA_NETWORKS[config.network]) {
      validation.errors.push(`Unsupported network: ${config.network}`);
      validation.recommendations.push(`Supported networks: ${Object.keys(INFURA_NETWORKS).join(', ')}`);
    }

    // Validate optional configurations
    if (config.enableArchiveNode && config.network && !INFURA_NETWORKS[config.network]?.archiveSupported) {
      validation.warnings.push('Archive node requested but not supported for this network');
    }

    if (!config.fallbackProvider && config.enableFailover !== false) {
      validation.recommendations.push('Consider configuring a fallback provider for improved reliability');
    }

    if (config.rateLimitConfig?.dailyLimit && config.rateLimitConfig.dailyLimit < 10000) {
      validation.warnings.push('Daily limit seems low for production usage');
    }

    validation.isValid = validation.errors.length === 0;

  } catch (error) {
    validation.isValid = false;
    validation.errors.push(`Configuration validation failed: ${error.message}`);
  }

  return validation;
}) {
      this.logger.error('Failed to initialize fallback provider', {
        error: error.message
      });
      throw new RPCError(
        `Failed to initialize fallback provider: ${error.message}`,
        RPC_ERROR_CODES.CONFIGURATION_ERROR
      );
    }
  }

  /**
   * Override parent's execute method to add Infura-specific handling
   * @private
   * @param {Function} requestFn - Request function to execute
   * @returns {Promise} Request result
   */
  async _executeWithRetry(requestFn) {
    // Check high-throughput rate limits first
    const highThroughputCheck = this.highThroughputLimiter.checkLimit();
    if (!highThroughputCheck.allowed) {
      this.infuraStats.rateLimitHits++;
      
      this.logger.warn('High-throughput rate limit exceeded', {
        reason: highThroughputCheck.reason,
        nextAvailableTime: new Date(highThroughputCheck.nextAvailableTime).toISOString()
      });
      
      // Try failover if available
      if (this.enableFailover && this.failoverProvider && !this.infuraStats.isFailoverActive) {
        return this._executeWithFailover(requestFn);
      }
      
      throw new InfuraError(
        `High-throughput rate limit exceeded: ${highThroughputCheck.reason}`,
        INFURA_ERROR_CODES.RATE_LIMITED,
        { rateLimitInfo: highThroughputCheck },
        {
          projectId: this.projectId,
          network: this.network,
          rateLimitInfo: highThroughputCheck,
          failoverAvailable: !!this.failoverProvider
        }
      );
    }

    // Check standard rate limits
    const rateLimitCheck = this.rateLimitTracker.checkRateLimit('infura');
    if (!rateLimitCheck.allowed) {
      this.infuraStats.rateLimitHits++;
      
      // Try failover if available and not rate limited
      if (this.enableFailover && this.failoverProvider && !this.infuraStats.isFailoverActive) {
        this.logger.warn('Infura rate limited, attempting failover', {
          reason: rateLimitCheck.reason,
          resetTime: new Date(rateLimitCheck.resetTime).toISOString()
        });
        
        return this._executeWithFailover(requestFn);
      }
      
      throw new InfuraError(
        `Infura rate limit exceeded: ${rateLimitCheck.reason}`,
        INFURA_ERROR_CODES.RATE_LIMITED,
        { rateLimitInfo: rateLimitCheck },
        {
          projectId: this.projectId,
          network: this.network,
          rateLimitInfo: rateLimitCheck,
          failoverAvailable: !!this.failoverProvider,
          consecutiveFailures: this.infuraStats.consecutiveFailures
        }
      );
    }

    try {
      // Record request attempt
      this.rateLimitTracker.recordRequest('infura');
      this.highThroughputLimiter.recordRequest();
      this.infuraStats.infuraRequests++;

      // Execute request through parent class
      const result = await super._executeWithRetry(async () => {
        const response = await requestFn();
        
        // Extract and process Infura-specific headers
        if (response && response.headers) {
          this._processInfuraHeaders(response.headers);
        }
        
        return response;
      });

      // Reset consecutive failure count on success
      this.infuraStats.consecutiveFailures = 0;
      
      // Deactivate failover if it was active
      if (this.infuraStats.isFailoverActive) {
        this.infuraStats.isFailoverActive = false;
        this.logger.info('Infura service recovered, deactivating failover');
      }

      return result;

    } catch (error) {
      this.infuraStats.infuraFailures++;
      this.infuraStats.consecutiveFailures++;

      // Map Infura-specific errors with enhanced context
      const mappedError = this._mapInfuraError(error);
      
      // Check if failover should be activated
      if (this._shouldActivateFailover(mappedError)) {
        return this._executeWithFailover(requestFn);
      }

      throw mappedError;
    }
  }

  /**
   * Execute request with failover provider
   * @private
   * @param {Function} requestFn - Request function to execute
   * @returns {Promise} Request result
   */
  async _executeWithFailover(requestFn) {
    if (!this.failoverProvider) {
      throw new RPCError(
        'Failover provider not configured',
        INFURA_ERROR_CODES.FAILOVER_ACTIVATED
      );
    }

    try {
      this.infuraStats.isFailoverActive = true;
      this.infuraStats.failoverActivations++;
      this.infuraStats.lastFailoverTime = Date.now();

      this.logger.warn('Activating failover provider', {
        consecutiveFailures: this.infuraStats.consecutiveFailures,
        failoverActivations: this.infuraStats.failoverActivations
      });

      // Execute request through failover provider
      const result = await this.failoverProvider._executeWithRetry(requestFn);

      this.logger.info('Failover request successful');
      return result;

    } catch (failoverError) {
      this.logger.error('Failover provider also failed', {
        error: failoverError.message
      });

      throw new RPCError(
        'Both Infura and failover provider failed',
        INFURA_ERROR_CODES.FAILOVER_ACTIVATED,
        {
          infuraError: 'Service unavailable',
          failoverError: failoverError.message
        }
      );
    }
  }

  /**
   * Determine if failover should be activated
   * @private
   * @param {Error} error - The error that occurred
   * @returns {boolean} True if failover should be activated
   */
  _shouldActivateFailover(error) {
    if (!this.enableFailover || !this.failoverProvider || this.infuraStats.isFailoverActive) {
      return false;
    }

    // Activate failover for specific error conditions
    const failoverErrorCodes = [
      INFURA_ERROR_CODES.RATE_LIMITED,
      INFURA_ERROR_CODES.QUOTA_EXCEEDED,
      RPC_ERROR_CODES.TIMEOUT,
      RPC_ERROR_CODES.NETWORK_ERROR,
      RPC_ERROR_CODES.CONNECTION_FAILED
    ];

    const shouldFailover = failoverErrorCodes.includes(error.code) ||
                          this.infuraStats.consecutiveFailures >= this.failoverThreshold;

    return shouldFailover;
  }

  /**
   * Process Infura-specific response headers
   * @private
   * @param {Object} headers - HTTP response headers
   */
  _processInfuraHeaders(headers) {
    try {
      // Update rate limit tracking from headers
      this.rateLimitTracker.updateFromHeaders(headers);

      // Log rate limit information for monitoring
      if (headers['x-ratelimit-remaining']) {
        const remaining = parseInt(headers['x-ratelimit-remaining'], 10);
        if (remaining < 1000) { // Log when getting low
          this.logger.warn('Infura rate limit getting low', {
            remaining,
            limit: headers['x-ratelimit-limit'],
            resetTime: headers['x-ratelimit-reset']
          });
        }
      }

      // Check for archive node usage indicators
      if (headers['x-infura-archive'] === 'true') {
        this.infuraStats.archiveRequests++;
      }

    } catch (error) {
      this.logger.debug('Failed to process Infura headers', {
        error: error.message
      });
    }
  }

  /**
   * Map Infura-specific HTTP errors to custom error codes with enhanced context
   * @private
   * @param {Error} error - Original error
   * @returns {InfuraError} Mapped error with full context
   */
  _mapInfuraError(error) {
    // If already an InfuraError, return as-is
    if (error instanceof InfuraError) {
      return error;
    }

    let errorCode = RPC_ERROR_CODES.NETWORK_ERROR;
    let message = error.message || 'Unknown Infura error';
    let context = { originalError: this._maskSensitiveData(error.message) };
    let infuraContext = {
      projectId: this.projectId,
      network: this.network,
      endpoint: this.networkConfig.endpoint,
      consecutiveFailures: this.infuraStats.consecutiveFailures,
      failoverAvailable: !!this.failoverProvider,
      lastSuccessTime: this.infuraStats.lastRequestTime
    };

    // Map HTTP status codes to specific Infura errors
    if (error.response?.status) {
      switch (error.response.status) {
        case 401:
          errorCode = INFURA_ERROR_CODES.UNAUTHORIZED;
          message = 'Infura authentication failed. Check project ID and secret.';
          context.suggestion = 'Verify project credentials and ensure they are not expired';
          infuraContext.authenticationIssue = true;
          break;

        case 429:
          errorCode = INFURA_ERROR_CODES.RATE_LIMITED;
          message = 'Infura rate limit exceeded';
          context.retryAfter = error.response.headers['retry-after'];
          infuraContext.rateLimitInfo = {
            retryAfter: error.response.headers['retry-after'],
            remaining: error.response.headers['x-ratelimit-remaining'],
            limit: error.response.headers['x-ratelimit-limit']
          };
          break;

        case 403:
          errorCode = INFURA_ERROR_CODES.QUOTA_EXCEEDED;
          message = 'Infura quota exceeded or endpoint not allowed';
          context.suggestion = 'Check your Infura plan limits and endpoint permissions';
          infuraContext.quotaIssue = true;
          break;

        case 500:
        case 502:
        case 503:
        case 504:
          errorCode = RPC_ERROR_CODES.NETWORK_ERROR;
          message = 'Infura service temporarily unavailable';
          context.httpStatus = error.response.status;
          infuraContext.serviceIssue = true;
          break;

        case 400:
          // Check for archive node requirement
          if (error.response.data?.error?.message?.includes('archive')) {
            errorCode = INFURA_ERROR_CODES.ARCHIVE_REQUIRED;
            message = 'Request requires archive node access';
            context.suggestion = 'Enable archive node support or use a different method';
            infuraContext.archiveRequired = true;
          }
          break;
      }
    }

    // Check error message for specific patterns
    if (message.includes('project ID')) {
      errorCode = INFURA_ERROR_CODES.INVALID_PROJECT_ID;
      infuraContext.credentialIssue = 'project_id';
    } else if (message.includes('project secret')) {
      errorCode = INFURA_ERROR_CODES.INVALID_PROJECT_SECRET;
      infuraContext.credentialIssue = 'project_secret';
    } else if (message.includes('rate limit')) {
      errorCode = INFURA_ERROR_CODES.RATE_LIMITED;
    }

    return new InfuraError(message, errorCode, context, infuraContext);
  }

  /**
   * Add dry-run mode for development and debugging
   * @param {boolean} enabled - Enable dry-run mode
   */
  setDryRunMode(enabled = true) {
    this.dryRunMode = enabled;
    
    if (enabled) {
      this.logger.warn('Dry-run mode enabled - requests will be simulated', {
        network: this.network,
        projectIdMasked: this._maskProjectId(this.projectId)
      });
    } else {
      this.logger.info('Dry-run mode disabled - normal operation resumed');
    }
  }

  /**
   * Override request execution for dry-run mode
   * @private
   * @param {Function} requestFn - Request function to execute
   * @returns {Promise} Simulated or real result
   */
  async _executeWithDryRun(requestFn) {
    if (this.dryRunMode) {
      // Simulate request for dry-run mode
      return this._simulateRequest(requestFn);
    }
    
    return this._executeWithRetry(requestFn);
  }

  /**
   * Simulate request for dry-run mode
   * @private
   * @param {Function} requestFn - Request function to simulate
   * @returns {Promise} Simulated result
   */
  async _simulateRequest(requestFn) {
    const simulationDelay = 100 + Math.random() * 200; // 100-300ms
    
    this.logger.debug('Simulating request in dry-run mode', {
      delay: simulationDelay,
      network: this.network
    });
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, simulationDelay));
    
    // Update stats as if real request happened
    this.infuraStats.infuraRequests++;
    this.rateLimitTracker.recordRequest('infura');
    this.highThroughputLimiter.recordRequest();
    
    // Return mock response based on common RPC methods
    const functionString = requestFn.toString();
    
    if (functionString.includes('getBlockNumber')) {
      return { result: '0x' + Math.floor(Math.random() * 1000000).toString(16) };
    } else if (functionString.includes('getBalance')) {
      return { result: '0x' + Math.floor(Math.random() * 1000000000000000000).toString(16) };
    } else if (functionString.includes('getNetwork')) {
      return { result: { chainId: this.networkConfig.chainId, name: this.network } };
    } else {
      return { result: 'dry-run-simulation' };
    }
  }

  /**
   * Get enhanced Infura-specific statistics with high-throughput metrics
   * @returns {Object} Enhanced Infura statistics
   */
  getInfuraStats() {
    const baseStats = this.getStats();
    const rateLimitStats = this.rateLimitTracker.getStats();
    const highThroughputStats = this.highThroughputLimiter.getStats();
    
    return {
      ...baseStats,
      infura: {
        ...this.infuraStats,
        uptime: Date.now() - this.infuraStats.startTime,
        successRate: this.infuraStats.infuraRequests > 0 ? 
          (this.infuraStats.infuraRequests - this.infuraStats.infuraFailures) / this.infuraStats.infuraRequests : 0,
        averageFailuresBeforeFailover: this.infuraStats.failoverActivations > 0 ?
          this.infuraStats.infuraFailures / this.infuraStats.failoverActivations : 0,
        dryRunMode: this.dryRunMode || false
      },
      rateLimiting: {
        standard: rateLimitStats,
        highThroughput: highThroughputStats
      },
      network: {
        name: this.network,
        chainId: this.networkConfig.chainId,
        endpoint: this.networkConfig.endpoint,
        archiveSupported: this.networkConfig.archiveSupported,
        archiveEnabled: this.enableArchiveNode
      },
      failover: {
        enabled: this.enableFailover,
        available: this.failoverProvider !== null,
        isActive: this.infuraStats.isFailoverActive,
        threshold: this.failoverThreshold,
        activations: this.infuraStats.failoverActivations,
        lastActivation: this.infuraStats.lastFailoverTime
      }
    };
  }

  /**
   * Enhanced graceful shutdown with comprehensive cleanup
   * @returns {Promise<void>}
   */
  async shutdown() {
    this.logger.info('Initiating enhanced Infura provider shutdown');

    try {
      // Log final statistics
      const finalStats = this.getInfuraStats();
      this.logger.info('Final Infura statistics', {
        totalInfuraRequests: finalStats.infura.infuraRequests,
        successRate: finalStats.infura.successRate,
        failoverActivations: finalStats.infura.failoverActivations,
        keyRotations: finalStats.infura.keyRotations,
        uptime: finalStats.infura.uptime,
        rateLimitHits: finalStats.infura.rateLimitHits,
        dryRunMode: finalStats.infura.dryRunMode
      });

      // Cleanup rate limit trackers
      if (this.rateLimitTracker && this.rateLimitTracker.cache) {
        this.rateLimitTracker.cache.cleanup();
      }

      // Cleanup high-throughput limiter
      if (this.highThroughputLimiter) {
        // Clear any internal timers or references
        this.highThroughputLimiter.requestTimestamps = null;
      }

      // Shutdown failover provider if exists
      if (this.failoverProvider) {
        await this.failoverProvider.shutdown();
      }

      // Disable dry-run mode
      this.dryRunMode = false;

      // Call parent shutdown
      await super.shutdown();

      this.logger.info('Enhanced Infura provider shutdown completed successfully');

    } catch (error) {
      this.logger.error('Error during enhanced Infura provider shutdown', {
        error: this._maskSensitiveData(error.message)
      });
      throw new InfuraError(
        `Shutdown failed: ${error.message}`,
        RPC_ERROR_CODES.CONFIGURATION_ERROR,
        { shutdownError: true },
        {
          projectId: this.projectId,
          network: this.network,
          shutdownPhase: 'cleanup'
        }
      );
    }
  }

  /**
   * Rotate Infura API credentials
   * @param {string} newProjectId - New project ID
   * @param {string} newProjectSecret - New project secret
   * @returns {Promise<boolean>} True if rotation successful
   */
  async rotateKey(newProjectId, newProjectSecret) {
    if (!newProjectId || !newProjectSecret) {
      throw new RPCError(
        'Both project ID and secret are required for key rotation',
        INFURA_ERROR_CODES.KEY_ROTATION_FAILED
      );
    }

    this.logger.info('Starting Infura key rotation', {
      oldProjectIdMasked: this._maskProjectId(this.projectId),
      newProjectIdMasked: this._maskProjectId(newProjectId)
    });

    try {
      // Validate new credentials by building URL
      const newRpcUrl = InfuraBroadcastProvider._buildInfuraUrl(
        newProjectId,
        newProjectSecret,
        this.networkConfig.endpoint,
        this.enableArchiveNode
      );

      // Test new credentials with a simple request
      const testProvider = new RPCBroadcastProvider({
        rpcUrl: newRpcUrl,
        chainId: this.networkConfig.chainId,
        timeout: 10000,
        auth: {
          type: 'basic',
          username: newProjectId,
          password: newProjectSecret
        }
      });

      // Perform health check with new credentials
      const healthCheck = await testProvider.validateConnection();
      if (!healthCheck.isValid) {
        throw new Error(`Health check failed: ${healthCheck.errors.join(', ')}`);
      }

      // Store old credentials for rollback
      const oldProjectId = this.projectId;
      const oldProjectSecret = this.projectSecret;
      const oldRpcUrl = this.config.rpcUrl;

      try {
        // Update credentials
        this.projectId = newProjectId;
        this.projectSecret = newProjectSecret;
        this.config.rpcUrl = newRpcUrl;

        // Update authentication in parent provider
        this.config.auth.username = newProjectId;
        this.config.auth.password = newProjectSecret;

        // Reinitialize the underlying provider
        this._initializeProvider();

        // Verify the rotation worked
        const verificationCheck = await this.healthCheck();
        if (!verificationCheck.healthy) {
          throw new Error('Post-rotation verification failed');
        }

        this.infuraStats.keyRotations++;
        
        this.logger.info('Infura key rotation completed successfully', {
          rotationCount: this.infuraStats.keyRotations,
          newProjectIdMasked: this._maskProjectId(newProjectId)
        });

        return true;

      } catch (rotationError) {
        // Rollback on failure
        this.projectId = oldProjectId;
        this.projectSecret = oldProjectSecret;
        this.config.rpcUrl = oldRpcUrl;
        this.config.auth.username = oldProjectId;
        this.config.auth.password = oldProjectSecret;
        this._initializeProvider();

        throw rotationError;
      }

    } catch (error)
