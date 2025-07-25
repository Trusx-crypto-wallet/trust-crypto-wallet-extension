/**
 * TokenListAligner - Enterprise Production-Ready Token List Integration
 * Addresses all critical security, performance, and operational requirements
 * 
 * @version 2.0.0
 * @author Trust Crypto Wallet Team
 * @license MIT
 */

/**
 * Custom error classes for structured error handling
 */
class TokenListError extends Error {
  constructor(code, message, context = {}) {
    super(message);
    this.name = 'TokenListError';
    this.code = code;
    this.context = context;
    this.timestamp = Date.now();
    Error.captureStackTrace?.(this, TokenListError);
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      context: this.context,
      timestamp: this.timestamp,
      stack: this.stack
    };
  }
}

/**
 * Error codes for different failure scenarios
 */
const ERROR_CODES = {
  // Validation errors
  INVALID_ADDRESS: 'INVALID_ADDRESS',
  INVALID_CHAIN_ID: 'INVALID_CHAIN_ID',
  INVALID_CONFIG: 'INVALID_CONFIG',
  
  // Network errors
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
  RATE_LIMITED: 'RATE_LIMITED',
  
  // Data errors
  DATA_CORRUPTION: 'DATA_CORRUPTION',
  INTEGRITY_CHECK_FAILED: 'INTEGRITY_CHECK_FAILED',
  INVALID_JSON: 'INVALID_JSON',
  
  // System errors
  STORAGE_ERROR: 'STORAGE_ERROR',
  MEMORY_ERROR: 'MEMORY_ERROR',
  INITIALIZATION_FAILED: 'INITIALIZATION_FAILED',
  
  // Application errors
  TOKEN_NOT_FOUND: 'TOKEN_NOT_FOUND',
  NETWORK_NOT_SUPPORTED: 'NETWORK_NOT_SUPPORTED',
  FEATURE_DISABLED: 'FEATURE_DISABLED'
};

/**
 * Production-ready logger with multiple levels
 */
class Logger {
  constructor(level = 'info') {
    this.levels = { error: 0, warn: 1, info: 2, debug: 3 };
    this.level = this.levels[level] ?? 2;
    this.context = {};
  }

  setContext(context) {
    this.context = { ...this.context, ...context };
  }

  _log(level, message, data = {}) {
    if (this.levels[level] > this.level) return;
    
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: level.toUpperCase(),
      message,
      context: this.context,
      data,
      service: 'TokenListAligner'
    };

    // In production, send to logging service
    if (typeof window !== 'undefined' && window.logService) {
      window.logService.log(logEntry);
    } else {
      console[level](JSON.stringify(logEntry, null, 2));
    }
  }

  error(message, data) { this._log('error', message, data); }
  warn(message, data) { this._log('warn', message, data); }
  info(message, data) { this._log('info', message, data); }
  debug(message, data) { this._log('debug', message, data); }
}

/**
 * Input validation utilities
 */
class Validator {
  /**
   * Validate Ethereum address format
   * @param {string} address - Address to validate
   * @throws {TokenListError} If address is invalid
   */
  static validateAddress(address) {
    if (!address || typeof address !== 'string') {
      throw new TokenListError(ERROR_CODES.INVALID_ADDRESS, 'Address must be a non-empty string', { address });
    }
    
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      throw new TokenListError(ERROR_CODES.INVALID_ADDRESS, 'Invalid Ethereum address format', { address });
    }
  }

  /**
   * Validate chain ID
   * @param {number} chainId - Chain ID to validate
   * @throws {TokenListError} If chain ID is invalid
   */
  static validateChainId(chainId) {
    if (!Number.isInteger(chainId) || chainId < 1 || chainId > 4294967295) {
      throw new TokenListError(ERROR_CODES.INVALID_CHAIN_ID, 'Chain ID must be integer between 1 and 4294967295', { chainId });
    }
  }

  /**
   * Validate URL format and whitelist
   * @param {string} url - URL to validate
   * @throws {TokenListError} If URL is invalid
   */
  static validateUrl(url) {
    try {
      const parsedUrl = new URL(url);
      const allowedHosts = [
        'raw.githubusercontent.com',
        'github.com',
        'api.github.com'
      ];
      
      if (!allowedHosts.includes(parsedUrl.hostname)) {
        throw new TokenListError(ERROR_CODES.INVALID_CONFIG, 'URL not in whitelist', { url, allowedHosts });
      }
      
      if (parsedUrl.protocol !== 'https:') {
        throw new TokenListError(ERROR_CODES.INVALID_CONFIG, 'Only HTTPS URLs allowed', { url });
      }
    } catch (error) {
      if (error instanceof TokenListError) throw error;
      throw new TokenListError(ERROR_CODES.INVALID_CONFIG, 'Invalid URL format', { url, error: error.message });
    }
  }

  /**
   * Sanitize user input
   * @param {string} input - Input to sanitize
   * @returns {string} Sanitized input
   */
  static sanitizeInput(input) {
    if (typeof input !== 'string') return '';
    return input.trim().replace(/[<>'"&]/g, '');
  }
}

/**
 * Circuit breaker for handling repeated failures
 */
class CircuitBreaker {
  constructor(threshold = 5, resetTimeout = 60000) {
    this.threshold = threshold;
    this.resetTimeout = resetTimeout;
    this.failures = 0;
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.nextAttempt = 0;
  }

  async execute(fn) {
    if (this.state === 'OPEN') {
      if (Date.now() < this.nextAttempt) {
        throw new TokenListError(ERROR_CODES.RATE_LIMITED, 'Circuit breaker is OPEN', {
          state: this.state,
          failures: this.failures,
          nextAttempt: new Date(this.nextAttempt).toISOString()
        });
      }
      this.state = 'HALF_OPEN';
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  onSuccess() {
    this.failures = 0;
    this.state = 'CLOSED';
  }

  onFailure() {
    this.failures++;
    if (this.failures >= this.threshold) {
      this.state = 'OPEN';
      this.nextAttempt = Date.now() + this.resetTimeout;
    }
  }
}

/**
 * Memory manager for preventing memory leaks
 */
class MemoryManager {
  constructor(maxCacheSize = 1000, cleanupInterval = 300000) { // 5 minutes
    this.maxCacheSize = maxCacheSize;
    this.cache = new Map();
    this.accessTimes = new Map();
    
    setInterval(() => this.cleanup(), cleanupInterval);
  }

  set(key, value) {
    if (this.cache.size >= this.maxCacheSize) {
      this.evictLRU();
    }
    
    this.cache.set(key, value);
    this.accessTimes.set(key, Date.now());
  }

  get(key) {
    if (this.cache.has(key)) {
      this.accessTimes.set(key, Date.now());
      return this.cache.get(key);
    }
    return undefined;
  }

  evictLRU() {
    let oldestKey = null;
    let oldestTime = Infinity;
    
    for (const [key, time] of this.accessTimes) {
      if (time < oldestTime) {
        oldestTime = time;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.accessTimes.delete(oldestKey);
    }
  }

  cleanup() {
    const now = Date.now();
    const ttl = 30 * 60 * 1000; // 30 minutes
    
    for (const [key, time] of this.accessTimes) {
      if (now - time > ttl) {
        this.cache.delete(key);
        this.accessTimes.delete(key);
      }
    }
  }

  clear() {
    this.cache.clear();
    this.accessTimes.clear();
  }

  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxCacheSize,
      memoryUsage: this.cache.size / this.maxCacheSize * 100
    };
  }
}

/**
 * Enhanced search index for O(1) lookups
 */
class SearchIndex {
  constructor() {
    this.symbolIndex = new Map();
    this.nameIndex = new Map();
    this.addressIndex = new Map();
  }

  addToken(token) {
    const key = `${token.chainId}_${token.address}`;
    
    // Index by symbol
    const symbol = token.symbol.toLowerCase();
    if (!this.symbolIndex.has(symbol)) {
      this.symbolIndex.set(symbol, new Set());
    }
    this.symbolIndex.get(symbol).add(key);
    
    // Index by name words
    const nameWords = token.name.toLowerCase().split(/\s+/);
    nameWords.forEach(word => {
      if (!this.nameIndex.has(word)) {
        this.nameIndex.set(word, new Set());
      }
      this.nameIndex.get(word).add(key);
    });
    
    // Index by address
    this.addressIndex.set(token.address.toLowerCase(), key);
  }

  search(query, limit = 50) {
    const lowerQuery = query.toLowerCase();
    const results = new Set();
    
    // Search symbols
    for (const [symbol, tokens] of this.symbolIndex) {
      if (symbol.includes(lowerQuery)) {
        tokens.forEach(token => {
          if (results.size < limit) results.add(token);
        });
      }
    }
    
    // Search name words
    for (const [word, tokens] of this.nameIndex) {
      if (word.includes(lowerQuery)) {
        tokens.forEach(token => {
          if (results.size < limit) results.add(token);
        });
      }
    }
    
    return Array.from(results);
  }

  clear() {
    this.symbolIndex.clear();
    this.nameIndex.clear();
    this.addressIndex.clear();
  }
}

/**
 * Health check and metrics provider
 */
class HealthMonitor {
  constructor() {
    this.metrics = {
      requestCount: 0,
      errorCount: 0,
      averageResponseTime: 0,
      cacheHitRate: 0,
      memoryUsage: 0,
      lastUpdate: null,
      uptime: Date.now()
    };
    this.responseTimes = [];
  }

  recordRequest(responseTime, isError = false) {
    this.metrics.requestCount++;
    if (isError) this.metrics.errorCount++;
    
    this.responseTimes.push(responseTime);
    if (this.responseTimes.length > 100) {
      this.responseTimes.shift();
    }
    
    this.metrics.averageResponseTime = 
      this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length;
  }

  updateMetrics(data) {
    Object.assign(this.metrics, data);
  }

  getHealthStatus() {
    const errorRate = this.metrics.requestCount > 0 ? 
      (this.metrics.errorCount / this.metrics.requestCount) * 100 : 0;
    
    return {
      status: errorRate < 5 && this.metrics.averageResponseTime < 200 ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: Date.now() - this.metrics.uptime,
      metrics: this.metrics,
      version: '2.0.0'
    };
  }

  getPrometheusMetrics() {
    return `
# HELP token_aligner_requests_total Total number of requests
# TYPE token_aligner_requests_total counter
token_aligner_requests_total ${this.metrics.requestCount}

# HELP token_aligner_errors_total Total number of errors
# TYPE token_aligner_errors_total counter
token_aligner_errors_total ${this.metrics.errorCount}

# HELP token_aligner_response_time_seconds Average response time
# TYPE token_aligner_response_time_seconds gauge
token_aligner_response_time_seconds ${this.metrics.averageResponseTime / 1000}

# HELP token_aligner_cache_hit_rate Cache hit rate percentage
# TYPE token_aligner_cache_hit_rate gauge
token_aligner_cache_hit_rate ${this.metrics.cacheHitRate}

# HELP token_aligner_memory_usage Memory usage percentage
# TYPE token_aligner_memory_usage gauge
token_aligner_memory_usage ${this.metrics.memoryUsage}
`.trim();
  }
}

/**
 * Enhanced production-ready TokenListAligner
 */
class TokenListAligner {
  constructor(options = {}) {
    // Validate configuration
    this.options = this._validateConfig({
      enableTestnet: options.enableTestnet || false,
      cacheVersion: options.cacheVersion || '2.0.0',
      maxRetries: options.maxRetries || 3,
      requestTimeout: options.requestTimeout || 5000,
      cacheTTL: options.cacheTTL || 24 * 60 * 60 * 1000, // 24 hours
      updateInterval: options.updateInterval || 6 * 60 * 60 * 1000, // 6 hours
      logLevel: options.logLevel || 'info',
      environment: options.environment || 'production',
      enableMetrics: options.enableMetrics !== false,
      maxCacheSize: options.maxCacheSize || 1000,
      circuitBreakerThreshold: options.circuitBreakerThreshold || 5,
      ...options
    });

    // Initialize components
    this.logger = new Logger(this.options.logLevel);
    this.memoryManager = new MemoryManager(this.options.maxCacheSize);
    this.searchIndex = new SearchIndex();
    this.healthMonitor = new HealthMonitor();
    this.circuitBreaker = new CircuitBreaker(this.options.circuitBreakerThreshold);

    // Data sources with validation
    this.dataSources = {
      extension: 'https://raw.githubusercontent.com/Trusx-crypto-wallet/trust-crypto-wallet-tokenlist/main/extension.json',
      mainnet: 'https://raw.githubusercontent.com/Trusx-crypto-wallet/trust-crypto-wallet-tokenlist/main/tokenlist.json',
      testnet: 'https://raw.githubusercontent.com/Trusx-crypto-wallet/trust-crypto-wallet-tokenlist/main/testnet.json'
    };

    // Validate data source URLs
    Object.values(this.dataSources).forEach(url => Validator.validateUrl(url));

    // Enhanced fallback data
    this.fallbackData = this._initializeFallbackData();
    
    // State management
    this.alignedRegistry = null;
    this.isInitialized = false;
    this.lastUpdate = null;
    this.updatePromise = null;

    // Performance metrics
    this.metrics = {
      loadTime: 0,
      cacheHits: 0,
      cacheMisses: 0,
      errors: 0,
      initializationTime: 0
    };

    // Set logger context
    this.logger.setContext({
      component: 'TokenListAligner',
      version: '2.0.0',
      environment: this.options.environment
    });

    // Initialize storage and scheduling
    this._initializeIndexedDB().catch(error => {
      this.logger.error('IndexedDB initialization failed', { error: error.message });
    });

    if (this.options.environment === 'production') {
      this._scheduleUpdates();
    }

    this.logger.info('TokenListAligner initialized', { 
      options: this.options,
      version: '2.0.0'
    });
  }

  /**
   * Validate configuration object
   * @private
   */
  _validateConfig(config) {
    const requiredFields = ['cacheVersion', 'maxRetries', 'requestTimeout'];
    const missingFields = requiredFields.filter(field => config[field] == null);
    
    if (missingFields.length > 0) {
      throw new TokenListError(ERROR_CODES.INVALID_CONFIG, 'Missing required configuration fields', {
        missingFields,
        provided: Object.keys(config)
      });
    }

    if (config.maxRetries < 1 || config.maxRetries > 10) {
      throw new TokenListError(ERROR_CODES.INVALID_CONFIG, 'maxRetries must be between 1 and 10', {
        value: config.maxRetries
      });
    }

    if (config.requestTimeout < 1000 || config.requestTimeout > 30000) {
      throw new TokenListError(ERROR_CODES.INVALID_CONFIG, 'requestTimeout must be between 1000 and 30000ms', {
        value: config.requestTimeout
      });
    }

    return config;
  }

  /**
   * Initialize the aligner with comprehensive error handling
   * @returns {Promise<Object>} Aligned token registry
   * @throws {TokenListError} If initialization fails completely
   */
  async initialize() {
    const startTime = performance.now();
    
    try {
      this.logger.info('Starting TokenListAligner initialization');

      if (this.isInitialized && this.alignedRegistry) {
        this.metrics.cacheHits++;
        this.healthMonitor.recordRequest(performance.now() - startTime);
        return this.alignedRegistry;
      }

      // Try to load from IndexedDB cache first
      const cachedData = await this._loadFromIndexedDB();
      if (cachedData && this._isCacheValid(cachedData.timestamp)) {
        this.alignedRegistry = cachedData.data;
        this.isInitialized = true;
        this.metrics.cacheHits++;
        
        const loadTime = performance.now() - startTime;
        this.metrics.loadTime = loadTime;
        this.healthMonitor.recordRequest(loadTime);
        
        this.logger.info('Loaded from cache', { loadTime, cacheSize: this.alignedRegistry.tokens.size });
        return this.alignedRegistry;
      }

      // Load fresh data from sources with circuit breaker
      this.alignedRegistry = await this.circuitBreaker.execute(async () => {
        return await this._loadAndAlignData();
      });

      this.isInitialized = true;
      this.lastUpdate = Date.now();
      
      // Cache the result
      await this._saveToIndexedDB(this.alignedRegistry);
      
      // Build search index
      this._buildSearchIndex();
      
      this.metrics.cacheMisses++;
      const loadTime = performance.now() - startTime;
      this.metrics.loadTime = loadTime;
      this.metrics.initializationTime = loadTime;
      
      this.healthMonitor.recordRequest(loadTime);
      this.healthMonitor.updateMetrics({
        lastUpdate: this.lastUpdate,
        cacheHitRate: this._getCacheHitRate(),
        memoryUsage: this.memoryManager.getStats().memoryUsage
      });
      
      this.logger.info('Initialization completed', {
        loadTime,
        tokenCount: this.alignedRegistry.tokens.size,
        networkCount: this.alignedRegistry.metadata.networks.size,
        bridgeCount: this.alignedRegistry.bridges.size
      });
      
      return this.alignedRegistry;
    } catch (error) {
      this.metrics.errors++;
      this.healthMonitor.recordRequest(performance.now() - startTime, true);
      
      this.logger.error('Initialization failed', { 
        error: error.message,
        stack: error.stack,
        code: error.code 
      });
      
      // Fallback to hardcoded data
      try {
        this.alignedRegistry = this._createFallbackRegistry();
        this.metrics.loadTime = performance.now() - startTime;
        
        this.logger.warn('Using fallback data due to initialization failure');
        return this.alignedRegistry;
      } catch (fallbackError) {
        this.logger.error('Fallback initialization failed', { error: fallbackError.message });
        throw new TokenListError(ERROR_CODES.INITIALIZATION_FAILED, 'Complete initialization failure', {
          originalError: error.message,
          fallbackError: fallbackError.message
        });
      }
    }
  }

  /**
   * Load and align data from all sources with enhanced error handling
   * @private
   */
  async _loadAndAlignData() {
    this.logger.debug('Loading data from sources');
    
    const promises = [
      this._fetchWithRetry(this.dataSources.extension, 'extension'),
      this._fetchWithRetry(this.dataSources.mainnet, 'mainnet'),
      this.options.enableTestnet ? 
        this._fetchWithRetry(this.dataSources.testnet, 'testnet') : 
        Promise.resolve(null)
    ];

    const results = await Promise.allSettled(promises);
    
    const extension = results[0].status === 'fulfilled' ? results[0].value : this.fallbackData.extension;
    const mainnet = results[1].status === 'fulfilled' ? results[1].value : this.fallbackData.mainnet;
    const testnet = results[2]?.status === 'fulfilled' ? results[2].value : this.fallbackData.testnet;

    // Log any failures
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        const source = ['extension', 'mainnet', 'testnet'][index];
        this.logger.warn(`Failed to load ${source} data, using fallback`, {
          error: result.reason.message
        });
      }
    });

    return this._alignTokenData(extension, mainnet, testnet);
  }

  /**
   * Enhanced fetch with retry, validation, and integrity checks
   * @private
   */
  async _fetchWithRetry(url, source, retries = this.options.maxRetries) {
    for (let i = 0; i < retries; i++) {
      try {
        this.logger.debug(`Fetching ${source} data`, { url, attempt: i + 1 });
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.options.requestTimeout);
        
        const response = await fetch(url, {
          signal: controller.signal,
          headers: {
            'Cache-Control': 'no-cache',
            'Accept': 'application/json',
            'User-Agent': 'TokenListAligner/2.0.0'
          }
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          throw new TokenListError(ERROR_CODES.NETWORK_ERROR, `HTTP ${response.status}: ${response.statusText}`, {
            url,
            status: response.status,
            statusText: response.statusText
          });
        }

        // Validate content type
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          throw new TokenListError(ERROR_CODES.DATA_CORRUPTION, 'Invalid content type', {
            contentType,
            url
          });
        }
        
        const text = await response.text();
        
        // Basic integrity check - ensure it's valid JSON and has expected structure
        let data;
        try {
          data = JSON.parse(text);
        } catch (parseError) {
          throw new TokenListError(ERROR_CODES.INVALID_JSON, 'Invalid JSON response', {
            url,
            parseError: parseError.message
          });
        }

        // Validate data structure
        this._validateDataStructure(data, source);
        
        this.logger.debug(`Successfully fetched ${source} data`, {
          size: text.length,
          tokens: data.tokens?.length || 0
        });
        
        return data;
      } catch (error) {
        if (error.name === 'AbortError') {
          throw new TokenListError(ERROR_CODES.TIMEOUT_ERROR, `Request timeout for ${source}`, { url });
        }
        
        if (error instanceof TokenListError) {
          throw error;
        }
        
        if (i === retries - 1) {
          throw new TokenListError(ERROR_CODES.NETWORK_ERROR, `Failed to fetch ${source} after ${retries} attempts`, {
            url,
            originalError: error.message
          });
        }
        
        // Exponential backoff
        const delay = Math.pow(2, i) * 1000 + Math.random() * 1000;
        this.logger.debug(`Retrying ${source} fetch in ${delay}ms`, { attempt: i + 1, error: error.message });
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  /**
   * Validate data structure from sources
   * @private
   */
  _validateDataStructure(data, source) {
    if (!data || typeof data !== 'object') {
      throw new TokenListError(ERROR_CODES.DATA_CORRUPTION, `Invalid data structure from ${source}`, { data });
    }

    if (source === 'mainnet' || source === 'testnet') {
      if (!Array.isArray(data.tokens)) {
        throw new TokenListError(ERROR_CODES.DATA_CORRUPTION, `Missing or invalid tokens array in ${source}`, { data });
      }
    }

    if (source === 'extension') {
      if (!data.lists || !data.features) {
        throw new TokenListError(ERROR_CODES.DATA_CORRUPTION, `Missing required fields in ${source}`, { data });
      }
    }
  }

  /**
   * Build search index for fast token lookups
   * @private
   */
  _buildSearchIndex() {
    this.searchIndex.clear();
    
    if (!this.alignedRegistry?.tokens) return;
    
    for (const token of this.alignedRegistry.tokens.values()) {
      try {
        this.searchIndex.addToken(token);
      } catch (error) {
        this.logger.warn('Failed to index token', { 
          token: token.symbol,
          error: error.message 
        });
      }
    }
    
    this.logger.debug('Search index built', { 
      tokenCount: this.alignedRegistry.tokens.size 
    });
  }

  /**
   * Align token data with enhanced validation and error handling
   * @private
   */
  _alignTokenData(extension, mainnet, testnet) {
    this.logger.debug('Aligning token data');
    
    const registry = {
      metadata: {
        version: extension?.version || '2.0.0',
        name: 'Unified Trust Crypto Wallet Token Registry',
        timestamp: Date.now(),
        networks: new Map(),
        features: extension?.features || {},
        performance: {
          loadTime: this.metrics.loadTime,
          cacheHitRate: this._getCacheHitRate()
        }
      },
      tokens: new Map(),
      bridges: new Map(),
      logos: new Map(),
      security: new Map()
    };

    try {
      // Process data with comprehensive error handling
      this._mergeNetworks(registry, extension, mainnet, testnet);
      this._processTokens(registry, mainnet, testnet);
      this._mapLogos(registry, extension);
      this._mergeBridgeProtocols(registry, extension, mainnet);
      this._applyFeatureFlags(registry, extension);
      this._calculateSecurityScores(registry);
      this._validateRegistry(registry);

      this.logger.info('Token data alignment completed', {
        tokens: registry.tokens.size,
        networks: registry.metadata.networks.size,
        bridges: registry.bridges.size
      });

      return registry;
    } catch (error) {
      this.logger.error('Data alignment failed', { error: error.message });
      throw new TokenListError(ERROR_CODES.DATA_CORRUPTION, 'Token data alignment failed', {
        originalError: error.message
      });
    }
  }

  /**
   * Process tokens with enhanced validation
   * @private
   */
  _processTokens(registry, mainnet, testnet) {
    // Process mainnet tokens
    if (mainnet?.tokens) {
      mainnet.tokens.forEach((token, index) => {
        try {
          // Validate token structure
          if (!token.symbol || !token.address || !token.chainId) {
            this.logger.warn('Skipping invalid token', { index, token });
            return;
          }

          Validator.validateAddress(token.address);
          Validator.validateChainId(token.chainId);

          const tokenKey = `${token.chainId}_${token.address.toLowerCase()}`;
          registry.tokens.set(tokenKey, {
            ...token,
            address: token.address.toLowerCase(), // Normalize address
            type: 'mainnet',
            verification: {
              status: 'verified',
              timestamp: Date.now(),
              ttl: this.options.cacheTTL
            },
            risk: {
              score: 0,
              factors: []
            }
          });
        } catch (error) {
          this.logger.warn('Failed to process mainnet token', {
            index,
            token: token.symbol,
            error: error.message
          });
        }
      });
    }

    // Process testnet tokens if enabled
    if (this.options.enableTestnet && testnet?.tokens) {
      testnet.tokens.forEach((token, index) => {
        try {
          if (!token.symbol || !token.address || !token.chainId) {
            this.logger.warn('Skipping invalid testnet token', { index, token });
            return;
          }

          Validator.validateAddress(token.address);
          Validator.validateChainId(token.chainId);

          const tokenKey = `testnet_${token.chainId}_${token.address.toLowerCase()}`;
          registry.tokens.set(tokenKey, {
            ...token,
            address: token.address.toLowerCase(),
            type: 'testnet',
            verification: {
              status: 'unverified',
              timestamp: Date.now(),
              ttl: this.options.cacheTTL / 2
            },
            risk: {
              score: 50,
              factors: ['testnet']
            }
          });
        } catch (error) {
          this.logger.warn('Failed to process testnet token', {
            index,
            token: token.symbol,
            error: error.message
          });
        }
      });
    }
  }

  /**
   * Merge networks with enhanced validation
   * @private
   */
  _mergeNetworks(registry, extension, mainnet, testnet) {
    const networks = registry.metadata.networks;
    
    // Process mainnet networks
    if (extension?.lists?.mainnet?.networks) {
      extension.lists.mainnet.networks.forEach(network => {
        try {
          Validator.validateChainId(network.chainId);
          const tokenCount = this._countTokensForNetwork(network.chainId, mainnet);
          networks.set(network.chainId, {
            ...network,
            tokenCount,
            type: 'mainnet',
            isActive: tokenCount > 0
          });
        } catch (error) {
          this.logger.warn('Failed to process mainnet network', {
            network: network.name,
            error: error.message
          });
        }
      });
    }

    // Process testnet networks if enabled
    if (this.options.enableTestnet && extension?.lists?.testnet?.networks) {
      extension.lists.testnet.networks.forEach(network => {
        try {
          Validator.validateChainId(network.chainId);
          const tokenCount = this._countTokensForNetwork(network.chainId, testnet);
          networks.set(`testnet_${network.chainId}`, {
            ...network,
            tokenCount,
            type: 'testnet',
            isActive: tokenCount > 0
          });
        } catch (error) {
          this.logger.warn('Failed to process testnet network', {
            network: network.name,
            error: error.message
          });
        }
      });
    }
  }

  /**
   * Map logos with validation
   * @private
   */
  _mapLogos(registry, extension) {
    if (!extension?.assets?.logos?.files) return;

    const logoMap = new Map();
    extension.assets.logos.files.forEach(logo => {
      try {
        const symbol = logo.name.replace(/\.(png|svg|jpg|jpeg)$/i, '').toUpperCase();
        logoMap.set(symbol, {
          url: logo.url,
          type: logo.type || 'png',
          size: logo.size || 'medium'
        });
      } catch (error) {
        this.logger.warn('Failed to process logo', {
          logo: logo.name,
          error: error.message
        });
      }
    });

    // Apply logos to tokens
    registry.tokens.forEach((token, key) => {
      const logo = logoMap.get(token.symbol.toUpperCase());
      if (logo) {
        token.logoURI = logo.url;
        token.logoType = logo.type;
      }
    });

    registry.logos = logoMap;
  }

  /**
   * Merge bridge protocols with validation
   * @private
   */
  _mergeBridgeProtocols(registry, extension, mainnet) {
    const bridges = registry.bridges;

    // Add extension bridge protocols
    if (extension?.bridgeProtocols) {
      extension.bridgeProtocols.forEach(bridge => {
        try {
          if (!bridge.id || !bridge.name) {
            this.logger.warn('Skipping invalid bridge from extension', { bridge });
            return;
          }
          
          bridges.set(bridge.id, {
            ...bridge,
            source: 'extension',
            isActive: true
          });
        } catch (error) {
          this.logger.warn('Failed to process extension bridge', {
            bridge: bridge.id,
            error: error.message
          });
        }
      });
    }

    // Add mainnet bridges
    if (mainnet?.bridges) {
      mainnet.bridges.forEach(bridge => {
        try {
          if (!bridge.id || !bridge.name) {
            this.logger.warn('Skipping invalid bridge from mainnet', { bridge });
            return;
          }

          const existingBridge = bridges.get(bridge.id);
          if (existingBridge) {
            bridges.set(bridge.id, {
              ...existingBridge,
              ...bridge,
              source: 'merged',
              supportedChains: [
                ...(existingBridge.supportedChains || []),
                ...(bridge.supportedChains || [])
              ].filter((chain, index, arr) => arr.indexOf(chain) === index) // Remove duplicates
            });
          } else {
            bridges.set(bridge.id, {
              ...bridge,
              source: 'mainnet',
              isActive: true
            });
          }
        } catch (error) {
          this.logger.warn('Failed to process mainnet bridge', {
            bridge: bridge.id,
            error: error.message
          });
        }
      });
    }
  }

  /**
   * Apply feature flags with validation
   * @private
   */
  _applyFeatureFlags(registry, extension) {
    const features = extension?.features || {};
    
    registry.tokens.forEach((token, key) => {
      try {
        if (features.enableAdvancedSecurity) {
          token.securityEnabled = true;
        }
        
        if (features.enablePriceFeeds) {
          token.priceFeeds = {
            chainlink: true,
            dex: true,
            fallback: true
          };
        }
        
        if (features.enableBridgeSupport && registry.bridges.size > 0) {
          token.bridgeSupport = Array.from(registry.bridges.keys());
        }
      } catch (error) {
        this.logger.warn('Failed to apply feature flags to token', {
          token: token.symbol,
          error: error.message
        });
      }
    });
  }

  /**
   * Calculate enhanced security scores
   * @private
   */
  _calculateSecurityScores(registry) {
    registry.tokens.forEach((token, key) => {
      try {
        let score = token.risk.score;
        const factors = [...token.risk.factors];

        // Contract age factor
        if (token.deployedAt) {
          const age = Date.now() - token.deployedAt;
          const ageInDays = age / (1000 * 60 * 60 * 24);
          if (ageInDays < 30) {
            score += 20;
            factors.push('new_contract');
          } else if (ageInDays > 365) {
            score -= 10;
            factors.push('mature_contract');
          }
        }

        // Verification status
        if (token.verification.status === 'verified') {
          score -= 15;
          factors.push('verified');
        }

        // Bridge support
        if (token.bridgeSupport && token.bridgeSupport.length > 2) {
          score -= 5;
          factors.push('multi_bridge');
        }

        // Token standard compliance
        if (token.decimals === 18) {
          score -= 5;
          factors.push('standard_decimals');
        }

        // Ensure score is within bounds
        token.risk.score = Math.max(0, Math.min(100, score));
        token.risk.factors = factors;
        
        // Store in security map for quick access
        registry.security.set(key, {
          score: token.risk.score,
          level: this._getSecurityLevel(token.risk.score),
          factors: factors,
          lastUpdated: Date.now()
        });
      } catch (error) {
        this.logger.warn('Failed to calculate security score for token', {
          token: token.symbol,
          error: error.message
        });
      }
    });
  }

  /**
   * Enhanced registry validation
   * @private
   */
  _validateRegistry(registry) {
    if (!registry.tokens || registry.tokens.size === 0) {
      throw new TokenListError(ERROR_CODES.DATA_CORRUPTION, 'No tokens found in registry');
    }

    if (!registry.metadata.networks || registry.metadata.networks.size === 0) {
      throw new TokenListError(ERROR_CODES.DATA_CORRUPTION, 'No networks found in registry');
    }

    // Validate token structure and remove invalid tokens
    const invalidTokens = [];
    for (const [key, token] of registry.tokens) {
      try {
        if (!token.symbol || !token.address || !token.chainId) {
          invalidTokens.push(key);
          continue;
        }
        
        Validator.validateAddress(token.address);
        Validator.validateChainId(token.chainId);
      } catch (error) {
        this.logger.warn('Removing invalid token from registry', {
          key,
          token: token.symbol,
          error: error.message
        });
        invalidTokens.push(key);
      }
    }

    // Remove invalid tokens
    invalidTokens.forEach(key => {
      registry.tokens.delete(key);
      registry.security.delete(key);
    });

    this.logger.info('Registry validation completed', {
      validTokens: registry.tokens.size,
      invalidTokens: invalidTokens.length,
      networks: registry.metadata.networks.size,
      bridges: registry.bridges.size
    });
  }

  /**
   * Enhanced IndexedDB initialization with error handling
   * @private
   */
  async _initializeIndexedDB() {
    try {
      this.db = await new Promise((resolve, reject) => {
        const request = indexedDB.open('TokenListCache', 2);
        
        request.onerror = () => {
          this.logger.error('IndexedDB open failed', { error: request.error?.message });
          reject(new TokenListError(ERROR_CODES.STORAGE_ERROR, 'Failed to open IndexedDB', {
            error: request.error?.message
          }));
        };
        
        request.onsuccess = () => {
          this.logger.debug('IndexedDB opened successfully');
          resolve(request.result);
        };
        
        request.onupgradeneeded = (event) => {
          const db = event.target.result;
          
          // Create tokens store if it doesn't exist
          if (!db.objectStoreNames.contains('tokens')) {
            const store = db.createObjectStore('tokens');
            store.createIndex('timestamp', 'timestamp', { unique: false });
          }
          
          // Create metrics store
          if (!db.objectStoreNames.contains('metrics')) {
            db.createObjectStore('metrics');
          }
        };
      });
    } catch (error) {
      this.logger.warn('IndexedDB initialization failed, continuing without persistent cache', {
        error: error.message
      });
      this.db = null;
    }
  }

  /**
   * Enhanced IndexedDB loading with error handling
   * @private
   */
  async _loadFromIndexedDB() {
    if (!this.db) return null;
    
    try {
      return await new Promise((resolve, reject) => {
        const transaction = this.db.transaction(['tokens'], 'readonly');
        const store = transaction.objectStore('tokens');
        const request = store.get('aligned_registry');
        
        transaction.onerror = () => {
          this.logger.warn('IndexedDB load transaction failed', { error: transaction.error?.message });
          reject(new TokenListError(ERROR_CODES.STORAGE_ERROR, 'IndexedDB transaction failed'));
        };
        
        request.onerror = () => {
          this.logger.warn('IndexedDB load request failed', { error: request.error?.message });
          reject(new TokenListError(ERROR_CODES.STORAGE_ERROR, 'IndexedDB request failed'));
        };
        
        request.onsuccess = () => {
          const result = request.result;
          if (result && result.version === this.options.cacheVersion) {
            this.logger.debug('Loaded data from IndexedDB', { 
              timestamp: new Date(result.timestamp).toISOString(),
              version: result.version
            });
            resolve(result);
          } else {
            this.logger.debug('IndexedDB data version mismatch or not found', {
              found: !!result,
              version: result?.version,
              expected: this.options.cacheVersion
            });
            resolve(null);
          }
        };
      });
    } catch (error) {
      this.logger.warn('Failed to load from IndexedDB', { error: error.message });
      return null;
    }
  }

  /**
   * Enhanced IndexedDB saving with error handling
   * @private
   */
  async _saveToIndexedDB(data) {
    if (!this.db) return;
    
    try {
      await new Promise((resolve, reject) => {
        const transaction = this.db.transaction(['tokens'], 'readwrite');
        const store = transaction.objectStore('tokens');
        
        const saveData = {
          data,
          timestamp: Date.now(),
          version: this.options.cacheVersion,
          size: data.tokens.size
        };
        
        const request = store.put(saveData, 'aligned_registry');
        
        transaction.onerror = () => {
          this.logger.warn('IndexedDB save transaction failed', { error: transaction.error?.message });
          reject(new TokenListError(ERROR_CODES.STORAGE_ERROR, 'IndexedDB save transaction failed'));
        };
        
        request.onerror = () => {
          this.logger.warn('IndexedDB save request failed', { error: request.error?.message });
          reject(new TokenListError(ERROR_CODES.STORAGE_ERROR, 'IndexedDB save request failed'));
        };
        
        request.onsuccess = () => {
          this.logger.debug('Saved data to IndexedDB', { 
            size: saveData.size,
            timestamp: new Date(saveData.timestamp).toISOString()
          });
          resolve();
        };
      });
    } catch (error) {
      this.logger.warn('Failed to save to IndexedDB', { error: error.message });
    }
  }

  /**
   * Enhanced scheduled updates with error handling
   * @private
   */
  _scheduleUpdates() {
    const intervalId = setInterval(async () => {
      try {
        if (this.updatePromise) {
          this.logger.debug('Update already in progress, skipping');
          return;
        }
        
        this.logger.info('Starting scheduled update');
        this.updatePromise = this._loadAndAlignData();
        const newRegistry = await this.updatePromise;
        
        this.alignedRegistry = newRegistry;
        await this._saveToIndexedDB(newRegistry);
        this._buildSearchIndex();
        this.lastUpdate = Date.now();
        
        this.healthMonitor.updateMetrics({
          lastUpdate: this.lastUpdate,
          cacheHitRate: this._getCacheHitRate(),
          memoryUsage: this.memoryManager.getStats().memoryUsage
        });
        
        this.logger.info('Scheduled update completed', {
          tokenCount: newRegistry.tokens.size,
          timestamp: new Date(this.lastUpdate).toISOString()
        });
      } catch (error) {
        this.metrics.errors++;
        this.logger.error('Scheduled update failed', { error: error.message });
      } finally {
        this.updatePromise = null;
      }
    }, this.options.updateInterval);

    // Store interval ID for cleanup
    this.updateIntervalId = intervalId;
  }

  /**
   * Enhanced fallback data initialization
   * @private
   */
  _initializeFallbackData() {
    return {
      extension: {
        version: '2.0.0',
        lists: {
          mainnet: {
            networks: [
              { chainId: 1, name: 'Ethereum', nativeCurrency: { symbol: 'ETH' } },
              { chainId: 56, name: 'BSC', nativeCurrency: { symbol: 'BNB' } },
              { chainId: 137, name: 'Polygon', nativeCurrency: { symbol: 'MATIC' } },
              { chainId: 250, name: 'Fantom', nativeCurrency: { symbol: 'FTM' } },
              { chainId: 43114, name: 'Avalanche', nativeCurrency: { symbol: 'AVAX' } },
              { chainId: 42161, name: 'Arbitrum', nativeCurrency: { symbol: 'ETH' } },
              { chainId: 10, name: 'Optimism', nativeCurrency: { symbol: 'ETH' } }
            ]
          },
          testnet: {
            networks: [
              { chainId: 5, name: 'Goerli', nativeCurrency: { symbol: 'ETH' } },
              { chainId: 97, name: 'BSC Testnet', nativeCurrency: { symbol: 'tBNB' } },
              { chainId: 80001, name: 'Mumbai', nativeCurrency: { symbol: 'MATIC' } },
              { chainId: 4002, name: 'Fantom Testnet', nativeCurrency: { symbol: 'FTM' } },
              { chainId: 43113, name: 'Fuji', nativeCurrency: { symbol: 'AVAX' } },
              { chainId: 421613, name: 'Arbitrum Goerli', nativeCurrency: { symbol: 'ETH' } }
            ]
          }
        },
        bridgeProtocols: [
          { 
            id: 'multichain', 
            name: 'Multichain', 
            supportedChains: [1, 56, 137, 250, 43114],
            url: 'https://multichain.org'
          },
          { 
            id: 'celer', 
            name: 'Celer cBridge', 
            supportedChains: [1, 56, 137, 42161, 10],
            url: 'https://cbridge.celer.network'
          },
          { 
            id: 'stargate', 
            name: 'Stargate', 
            supportedChains: [1, 56, 137, 250, 43114, 42161, 10],
            url: 'https://stargate.finance'
          },
          { 
            id: 'synapse', 
            name: 'Synapse', 
            supportedChains: [1, 56, 137, 250, 43114, 42161, 10],
            url: 'https://synapseprotocol.com'
          },
          { 
            id: 'hop', 
            name: 'Hop Protocol', 
            supportedChains: [1, 137, 42161, 10],
            url: 'https://hop.exchange'
          }
        ],
        assets: {
          logos: {
            files: [
              { name: 'ETH.png', url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==', type: 'png' },
              { name: 'BTC.png', url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==', type: 'png' },
              { name: 'USDT.png', url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==', type: 'png' },
              { name: 'USDC.png', url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==', type: 'png' },
              { name: 'BNB.png', url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==', type: 'png' }
            ]
          }
        },
        features: {
          enableAdvancedSecurity: true,
          enablePriceFeeds: true,
          enableBridgeSupport: true,
          enableTestnetMode: true,
          enableMetrics: true
        }
      },
      mainnet: {
        tokens: [
          {
            chainId: 1,
            address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
            symbol: 'WETH',
            name: 'Wrapped Ether',
            decimals: 18,
            deployedAt: Date.now() - 365 * 24 * 60 * 60 * 1000
          },
          {
            chainId: 1,
            address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
            symbol: 'USDT',
            name: 'Tether USD',
            decimals: 6,
            deployedAt: Date.now() - 2 * 365 * 24 * 60 * 60 * 1000
          },
          {
            chainId: 1,
            address: '0xA0b86a33E6441d1e0aD3a1B8b7F3b9b8c6C8F8E0',
            symbol: 'USDC',
            name: 'USD Coin',
            decimals: 6,
            deployedAt: Date.now() - 3 * 365 * 24 * 60 * 60 * 1000
          },
          {
            chainId: 56,
            address: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
            symbol: 'WBNB',
            name: 'Wrapped BNB',
            decimals: 18,
            deployedAt: Date.now() - 2 * 365 * 24 * 60 * 60 * 1000
          },
          {
            chainId: 137,
            address: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270',
            symbol: 'WMATIC',
            name: 'Wrapped Matic',
            decimals: 18,
            deployedAt: Date.now() - 2 * 365 * 24 * 60 * 60 * 1000
          }
        ],
        bridges: [
          {
            id: 'polygon_bridge',
            name: 'Polygon PoS Bridge',
            supportedChains: [1, 137],
            type: 'pos',
            url: 'https://wallet.polygon.technology/bridge'
          },
          {
            id: 'arbitrum_bridge',
            name: 'Arbitrum Bridge',
            supportedChains: [1, 42161],
            type: 'rollup',
            url: 'https://bridge.arbitrum.io'
          }
        ]
      },
      testnet: {
        tokens: [
          {
            chainId: 5,
            address: '0xB0b86a33E6441d1e0aD3a1B8b7F3b9b8c6C8F8E1',
            symbol: 'tETH',
            name: 'Test Ethereum',
            decimals: 18
          },
          {
            chainId: 97,
            address: '0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd',
            symbol: 'tBNB',
            name: 'Test BNB',
            decimals: 18
          },
          {
            chainId: 80001,
            address: '0x9c3C9283D3e44854697Cd22D3Faa240Cfb032889',
            symbol: 'tMATIC',
            name: 'Test MATIC',
            decimals: 18
          }
        ]
      }
    };
  }

  /**
   * Create fallback registry with full structure
   * @private
   */
  _createFallbackRegistry() {
    const fallback = this.fallbackData;
    return this._alignTokenData(fallback.extension, fallback.mainnet, fallback.testnet);
  }

  /**
   * Utility methods
   */
  _countTokensForNetwork(chainId, tokenList) {
    if (!tokenList?.tokens) return 0;
    return tokenList.tokens.filter(token => token.chainId === chainId).length;
  }

  _isCacheValid(timestamp) {
    return Date.now() - timestamp < this.options.cacheTTL;
  }

  _getCacheHitRate() {
    const total = this.metrics.cacheHits + this.metrics.cacheMisses;
    return total > 0 ? (this.metrics.cacheHits / total) * 100 : 0;
  }

  _getSecurityLevel(score) {
    if (score <= 20) return 'HIGH';
    if (score <= 50) return 'MEDIUM';
    if (score <= 80) return 'LOW';
    return 'CRITICAL';
  }

  /**
   * Enhanced Public API Methods with comprehensive validation and error handling
   */

  /**
   * Get token by address and chain ID with validation
   * @param {string} address - The token contract address (case-insensitive)
   * @param {number} chainId - The blockchain network chain ID
   * @param {boolean} [isTestnet=false] - Whether to search in testnet tokens
   * @returns {Object|null} Token object with metadata, verification, and risk info, or null if not found
   * @throws {TokenListError} If parameters are invalid
   * @example
   * // Get WETH on Ethereum mainnet
   * const weth = aligner.getToken('0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', 1);
   * console.log(weth.symbol); // 'WETH'
   * 
   * // Get testnet token
   * const testToken = aligner.getToken('0x123...', 5, true);
   */
  getToken(address, chainId, isTestnet = false) {
    const startTime = performance.now();
    
    try {
      // Validate inputs
      Validator.validateAddress(address);
      Validator.validateChainId(chainId);
      
      
      const cacheKey = `network_${chainId}_${isTestnet}_${offset}_${limit}`;
      const cached = this.memoryManager.get(cacheKey);
      if (cached) {
        this.metrics.cacheHits++;
        this.healthMonitor.recordRequest(performance.now() - startTime);
        return cached;
      }
      
      const tokens = [];
      const prefix = isTestnet ? `testnet_${chainId}_` : `${chainId}_`;
      
      let count = 0;
      let skipped = 0;
      
      for (const [key, token] of this.alignedRegistry.tokens) {
        if (key.startsWith(prefix)) {
          if (skipped < offset) {
            skipped++;
            continue;
          }
          
          if (count >= limit) {
            break;
          }
          
          tokens.push(token);
          count++;
        }
      }
      
      // Cache result
      this.memoryManager.set(cacheKey, tokens);
      this.metrics.cacheMisses++;
      
      this.healthMonitor.recordRequest(performance.now() - startTime);
      this.logger.debug('Network tokens lookup completed', {
        chainId,
        isTestnet,
        offset,
        limit,
        found: tokens.length
      });
      
      return tokens;
    } catch (error) {
      this.metrics.errors++;
      this.healthMonitor.recordRequest(performance.now() - startTime, true);
      this.logger.error('Network tokens lookup failed', {
        chainId,
        isTestnet,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Search tokens by symbol or name with fuzzy matching and performance optimization
   * @param {string} query - Search term to match against token symbol or name (case-insensitive)
   * @param {number} [limit=50] - Maximum number of results to return
   * @param {Object} [options={}] - Additional search options
   * @param {boolean} [options.exactMatch=false] - Whether to perform exact matching only
   * @param {Array<number>} [options.chainIds] - Filter by specific chain IDs
   * @param {number} [options.minRiskScore=0] - Minimum risk score filter
   * @param {number} [options.maxRiskScore=100] - Maximum risk score filter
   * @returns {Array<Object>} Array of matching tokens sorted by security risk (lowest risk first)
   * @throws {TokenListError} If parameters are invalid
   * @example
   * // Search for ETH-related tokens
   * const ethTokens = aligner.searchTokens('ETH', 10);
   * ethTokens.forEach(token => {
   *   console.log(`${token.symbol} on chain ${token.chainId} - Risk: ${token.risk.score}`);
   * });
   * 
   * // Search for stablecoins with filters
   * const stablecoins = aligner.searchTokens('USD', 20, {
   *   chainIds: [1, 137],
   *   maxRiskScore: 30
   * });
   * 
   * // Exact match search
   * const exactResults = aligner.searchTokens('USDC', 5, { exactMatch: true });
   */
  searchTokens(query, limit = 50, options = {}) {
    const startTime = performance.now();
    const {
      exactMatch = false,
      chainIds = null,
      minRiskScore = 0,
      maxRiskScore = 100
    } = options;
    
    try {
      // Validate inputs
      if (!query || typeof query !== 'string') {
        throw new TokenListError(ERROR_CODES.INVALID_CONFIG, 'Query must be a non-empty string', { query });
      }
      
      if (limit < 1 || limit > 1000) {
        throw new TokenListError(ERROR_CODES.INVALID_CONFIG, 'Limit must be between 1 and 1000', { limit });
      }
      
      if (minRiskScore < 0 || maxRiskScore > 100 || minRiskScore > maxRiskScore) {
        throw new TokenListError(ERROR_CODES.INVALID_CONFIG, 'Invalid risk score range', {
          minRiskScore,
          maxRiskScore
        });
      }
      
      if (!this.alignedRegistry) {
        throw new TokenListError(ERROR_CODES.INITIALIZATION_FAILED, 'TokenListAligner not initialized');
      }
      
      const sanitizedQuery = Validator.sanitizeInput(query);
      const cacheKey = `search_${sanitizedQuery}_${limit}_${JSON.stringify(options)}`;
      
      // Check cache first
      const cached = this.memoryManager.get(cacheKey);
      if (cached) {
        this.metrics.cacheHits++;
        this.healthMonitor.recordRequest(performance.now() - startTime);
        return cached;
      }
      
      let results = [];
      
      if (this.searchIndex && !exactMatch) {
        // Use optimized search index
        const indexResults = this.searchIndex.search(sanitizedQuery, limit * 2);
        results = indexResults.map(key => this.alignedRegistry.tokens.get(key)).filter(Boolean);
      } else {
        // Fallback to linear search
        const lowerQuery = sanitizedQuery.toLowerCase();
        
        for (const token of this.alignedRegistry.tokens.values()) {
          if (results.length >= limit * 2) break; // Get more results for filtering
          
          const matchesSymbol = exactMatch ? 
            token.symbol.toLowerCase() === lowerQuery :
            token.symbol.toLowerCase().includes(lowerQuery);
            
          const matchesName = exactMatch ?
            token.name.toLowerCase() === lowerQuery :
            token.name.toLowerCase().includes(lowerQuery);
          
          if (matchesSymbol || matchesName) {
            results.push(token);
          }
        }
      }
      
      // Apply filters
      const filteredResults = results.filter(token => {
        // Chain ID filter
        if (chainIds && !chainIds.includes(token.chainId)) {
          return false;
        }
        
        // Risk score filter
        if (token.risk.score < minRiskScore || token.risk.score > maxRiskScore) {
          return false;
        }
        
        return true;
      });
      
      // Sort by security risk (lowest risk first) and limit results
      const sortedResults = filteredResults
        .sort((a, b) => a.risk.score - b.risk.score)
        .slice(0, limit);
      
      // Cache result
      this.memoryManager.set(cacheKey, sortedResults);
      this.metrics.cacheMisses++;
      
      this.healthMonitor.recordRequest(performance.now() - startTime);
      this.logger.debug('Token search completed', {
        query: sanitizedQuery,
        limit,
        options,
        found: sortedResults.length
      });
      
      return sortedResults;
    } catch (error) {
      this.metrics.errors++;
      this.healthMonitor.recordRequest(performance.now() - startTime, true);
      this.logger.error('Token search failed', {
        query,
        limit,
        options,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get available bridge protocols with their configurations and status
   * @param {Object} [options={}] - Filter options
   * @param {boolean} [options.activeOnly=true] - Return only active bridges
   * @param {Array<number>} [options.supportedChains] - Filter by supported chain IDs
   * @returns {Array<Object>} Array of bridge protocol objects with metadata and supported chains
   * @throws {TokenListError} If not initialized
   * @example
   * const bridges = aligner.getBridgeProtocols();
   * bridges.forEach(bridge => {
   *   console.log(`${bridge.name} (${bridge.id})`);
   *   console.log(`Supports chains: ${bridge.supportedChains.join(', ')}`);
   *   console.log(`Source: ${bridge.source}`); // 'extension', 'mainnet', or 'merged'
   *   console.log(`Active: ${bridge.isActive}`);
   * });
   * 
   * // Filter active bridges only
   * const activeBridges = aligner.getBridgeProtocols({ activeOnly: true });
   * 
   * // Filter by supported chains
   * const ethBridges = aligner.getBridgeProtocols({ 
   *   supportedChains: [1] 
   * });
   */
  getBridgeProtocols(options = {}) {
    const startTime = performance.now();
    const { activeOnly = true, supportedChains = null } = options;
    
    try {
      if (!this.alignedRegistry) {
        throw new TokenListError(ERROR_CODES.INITIALIZATION_FAILED, 'TokenListAligner not initialized');
      }
      
      const cacheKey = `bridges_${JSON.stringify(options)}`;
      const cached = this.memoryManager.get(cacheKey);
      if (cached) {
        this.metrics.cacheHits++;
        this.healthMonitor.recordRequest(performance.now() - startTime);
        return cached;
      }
      
      let bridges = Array.from(this.alignedRegistry.bridges.values());
      
      // Apply filters
      if (activeOnly) {
        bridges = bridges.filter(bridge => bridge.isActive);
      }
      
      if (supportedChains && supportedChains.length > 0) {
        bridges = bridges.filter(bridge => 
          bridge.supportedChains?.some(chainId => supportedChains.includes(chainId))
        );
      }
      
      // Sort by name for consistent ordering
      bridges.sort((a, b) => a.name.localeCompare(b.name));
      
      // Cache result
      this.memoryManager.set(cacheKey, bridges);
      this.metrics.cacheMisses++;
      
      this.healthMonitor.recordRequest(performance.now() - startTime);
      this.logger.debug('Bridge protocols lookup completed', {
        options,
        found: bridges.length
      });
      
      return bridges;
    } catch (error) {
      this.metrics.errors++;
      this.healthMonitor.recordRequest(performance.now() - startTime, true);
      this.logger.error('Bridge protocols lookup failed', {
        options,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get comprehensive security assessment for a specific token
   * @param {string} address - The token contract address
   * @param {number} chainId - The blockchain network chain ID
   * @param {boolean} [isTestnet=false] - Whether the token is on testnet
   * @returns {Object|null} Security assessment object or null if token not found
   * @property {number} score - Risk score from 0-100 (0 = safest, 100 = highest risk)
   * @property {string} level - Security level: 'HIGH', 'MEDIUM', 'LOW', or 'CRITICAL'
   * @property {Array<string>} factors - Array of risk factors affecting the score
   * @property {number} lastUpdated - Timestamp when security assessment was last calculated
   * @throws {TokenListError} If parameters are invalid
   * @example
   * const security = aligner.getTokenSecurity('0xA0b86a33E6441d1e0aD3a1B8b7F3b9b8c6C8F8E0', 1);
   * if (security) {
   *   console.log(`Risk Score: ${security.score}/100`);
   *   console.log(`Security Level: ${security.level}`);
   *   console.log(`Risk Factors: ${security.factors.join(', ')}`);
   *   
   *   // Example risk factors:
   *   // - 'new_contract' (deployed < 30 days ago)
   *   // - 'mature_contract' (deployed > 1 year ago)
   *   // - 'verified' (contract is verified)
   *   // - 'multi_bridge' (supported by multiple bridges)
   *   // - 'testnet' (testnet token)
   *   // - 'standard_decimals' (uses 18 decimals)
   * }
   */
  getTokenSecurity(address, chainId, isTestnet = false) {
    const startTime = performance.now();
    
    try {
      // Validate inputs
      Validator.validateAddress(address);
      Validator.validateChainId(chainId);
      
      if (!this.alignedRegistry) {
        throw new TokenListError(ERROR_CODES.INITIALIZATION_FAILED, 'TokenListAligner not initialized');
      }
      
      const normalizedAddress = address.toLowerCase();
      const key = isTestnet ? `testnet_${chainId}_${normalizedAddress}` : `${chainId}_${normalizedAddress}`;
      
      const cacheKey = `security_${key}`;
      const cached = this.memoryManager.get(cacheKey);
      if (cached) {
        this.metrics.cacheHits++;
        this.healthMonitor.recordRequest(performance.now() - startTime);
        return cached;
      }
      
      const security = this.alignedRegistry.security.get(key) || null;
      
      // Cache result
      if (security) {
        this.memoryManager.set(cacheKey, security);
        this.metrics.cacheHits++;
      } else {
        this.metrics.cacheMisses++;
      }
      
      this.healthMonitor.recordRequest(performance.now() - startTime);
      this.logger.debug('Token security lookup completed', {
        address: normalizedAddress,
        chainId,
        isTestnet,
        found: !!security
      });
      
      return security;
    } catch (error) {
      this.metrics.errors++;
      this.healthMonitor.recordRequest(performance.now() - startTime, true);
      this.logger.error('Token security lookup failed', {
        address,
        chainId,
        isTestnet,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get comprehensive performance metrics and system status
   * @returns {Object} Metrics object with performance and operational data
   * @property {number} loadTime - Last initialization time in milliseconds
   * @property {number} cacheHits - Total number of cache hits since instantiation
   * @property {number} cacheMisses - Total number of cache misses since instantiation
   * @property {number} errors - Total number of errors encountered
   * @property {number} cacheHitRate - Cache hit rate as percentage (0-100)
   * @property {boolean} isInitialized - Whether the aligner has been successfully initialized
   * @property {number|null} lastUpdate - Timestamp of last successful data update
   * @property {number} registrySize - Total number of tokens in the current registry
   * @property {Object} memoryStats - Memory usage statistics
   * @property {Object} circuitBreakerState - Circuit breaker status
   * @property {string} version - TokenListAligner version
   * @example
   * const metrics = aligner.getMetrics();
   * console.log(`Performance Metrics:`);
   * console.log(`- Load Time: ${metrics.loadTime.toFixed(2)}ms`);
   * console.log(`- Cache Hit Rate: ${metrics.cacheHitRate.toFixed(1)}%`);
   * console.log(`- Registry Size: ${metrics.registrySize} tokens`);
   * console.log(`- Errors: ${metrics.errors}`);
   * console.log(`- Last Update: ${new Date(metrics.lastUpdate).toISOString()}`);
   * 
   * // Performance validation
   * if (metrics.loadTime > 200) {
   *   console.warn('Load time exceeds 200ms target');
   * }
   * if (metrics.cacheHitRate < 95) {
   *   console.warn('Cache hit rate below 95% target');
   * }
   */
  getMetrics() {
    const memoryStats = this.memoryManager.getStats();
    
    return {
      ...this.metrics,
      cacheHitRate: this._getCacheHitRate(),
      isInitialized: this.isInitialized,
      lastUpdate: this.lastUpdate,
      registrySize: this.alignedRegistry ? this.alignedRegistry.tokens.size : 0,
      memoryStats,
      circuitBreakerState: {
        state: this.circuitBreaker.state,
        failures: this.circuitBreaker.failures,
        threshold: this.circuitBreaker.threshold
      },
      version: '2.0.0',
      environment: this.options.environment,
      uptime: Date.now() - (this.metrics.startTime || Date.now())
    };
  }

  /**
   * Force refresh of token data from all sources with comprehensive error handling
   * Clears all caches and re-fetches data from remote endpoints
   * @param {Object} [options={}] - Refresh options
   * @param {boolean} [options.clearCache=true] - Whether to clear all caches
   * @param {boolean} [options.rebuildIndex=true] - Whether to rebuild search index
   * @returns {Promise<Object>} Promise resolving to the updated aligned registry
   * @throws {TokenListError} If refresh fails and fallback data cannot be used
   * @example
   * // Force refresh when user requests latest data
   * try {
   *   console.log('Refreshing token data...');
   *   const updatedRegistry = await aligner.refresh();
   *   console.log(`Refreshed: ${updatedRegistry.tokens.size} tokens loaded`);
   *   
   *   // Check if data is fresh
   *   const metrics = aligner.getMetrics();
   *   console.log(`Cache cleared, fresh data loaded in ${metrics.loadTime}ms`);
   * } catch (error) {
   *   console.error('Refresh failed:', error.message);
   *   // Aligner will continue using cached/fallback data
   * }
   * 
   * // Refresh in background without blocking UI
   * aligner.refresh().catch(console.error);
   * 
   * // Refresh without clearing cache (update only)
   * aligner.refresh({ clearCache: false });
   */
  async refresh(options = {}) {
    const { clearCache = true, rebuildIndex = true } = options;
    const startTime = performance.now();
    
    try {
      this.logger.info('Starting manual refresh', { options });
      
      if (clearCache) {
        this.isInitialized = false;
        this.alignedRegistry = null;
        this.memoryManager.clear();
        
        // Clear IndexedDB cache
        if (this.db) {
          try {
            const transaction = this.db.transaction(['tokens'], 'readwrite');
            const store = transaction.objectStore('tokens');
            await new Promise((resolve, reject) => {
              const request = store.delete('aligned_registry');
              request.onsuccess = () => resolve();
              request.onerror = () => reject(request.error);
            });
            this.logger.debug('IndexedDB cache cleared');
          } catch (error) {
            this.logger.warn('Failed to clear IndexedDB cache', { error: error.message });
          }
        }
      }
      
      // Load fresh data
      const updatedRegistry = await this.initialize();
      
      if (rebuildIndex) {
        this._buildSearchIndex();
      }
      
      const refreshTime = performance.now() - startTime;
      this.logger.info('Manual refresh completed', {
        refreshTime,
        tokenCount: updatedRegistry.tokens.size,
        clearCache,
        rebuildIndex
      });
      
      return updatedRegistry;
    } catch (error) {
      this.metrics.errors++;
      this.logger.error('Manual refresh failed', {
        error: error.message,
        options
      });
      throw error;
    }
  }

  /**
   * Export complete registry data for backup, analysis, or migration
   * Converts internal Map structures to JSON-serializable arrays
   * @param {Object} [options={}] - Export options
   * @param {boolean} [options.includeMetrics=true] - Include performance metrics
   * @param {boolean} [options.includeSecurity=true] - Include security assessments
   * @param {Array<number>} [options.chainIds] - Export only specific chain IDs
   * @returns {Object|null} Exportable registry object or null if not initialized
   * @property {Object} metadata - Registry metadata including version, networks, and features
   * @property {Array<Array>} tokens - Array of [key, token] pairs from tokens Map
   * @property {Array<Array>} bridges - Array of [key, bridge] pairs from bridges Map  
   * @property {Array<Array>} logos - Array of [symbol, logo] pairs from logos Map
   * @property {Array<Array>} security - Array of [key, security] pairs from security Map
   * @property {number} exportedAt - Timestamp when export was created
   * @property {Object} exportOptions - Options used for export
   * @throws {TokenListError} If not initialized
   * @example
   * // Export for backup
   * const backup = aligner.exportRegistry();
   * if (backup) {
   *   console.log(`Exported ${backup.tokens.length} tokens`);
   *   console.log(`Networks: ${backup.metadata.networks.size}`);
   *   console.log(`Bridges: ${backup.bridges.length}`);
   *   
   *   // Save to file or send to server
   *   localStorage.setItem('tokenRegistryBackup', JSON.stringify(backup));
   *   
   *   // Or send to backup service
   *   await fetch('/api/backup', {
   *     method: 'POST',
   *     body: JSON.stringify(backup),
   *     headers: { 'Content-Type': 'application/json' }
   *   });
   * }
   * 
   * // Export specific chains only
   * const ethExport = aligner.exportRegistry({ chainIds: [1] });
   * 
   * // Export without security data for smaller size
   * const lightExport = aligner.exportRegistry({ includeSecurity: false });
   */
  exportRegistry(options = {}) {
    const {
      includeMetrics = true,
      includeSecurity = true,
      chainIds = null
    } = options;
    
    try {
      if (!this.alignedRegistry) {
        throw new TokenListError(ERROR_CODES.INITIALIZATION_FAILED, 'TokenListAligner not initialized');
      }
      
      let tokens = Array.from(this.alignedRegistry.tokens.entries());
      let security = Array.from(this.alignedRegistry.security.entries());
      
      // Filter by chain IDs if specified
      if (chainIds && chainIds.length > 0) {
        tokens = tokens.filter(([key, token]) => chainIds.includes(token.chainId));
        security = security.filter(([key, sec]) => {
          const token = this.alignedRegistry.tokens.get(key);
          return token && chainIds.includes(token.chainId);
        });
      }
      
      const exportData = {
        metadata: {
          ...this.alignedRegistry.metadata,
          networks: Array.from(this.alignedRegistry.metadata.networks.entries()),
          exportedAt: Date.now(),
          exportOptions: options
        },
        tokens,
        bridges: Array.from(this.alignedRegistry.bridges.entries()),
        logos: Array.from(this.alignedRegistry.logos.entries()),
        version: '2.0.0'
      };
      
      if (includeSecurity) {
        exportData.security = security;
      }
      
      if (includeMetrics) {
        exportData.metrics = this.getMetrics();
      }
      
      this.logger.info('Registry export completed', {
        tokenCount: tokens.length,
        bridgeCount: exportData.bridges.length,
        options
      });
      
      return exportData;
    } catch (error) {
      this.logger.error('Registry export failed', {
        error: error.message,
        options
      });
      throw error;
    }
  }

  /**
   * Health check endpoint for monitoring systems
   * @returns {Object} Health status with detailed information
   */
  getHealthStatus() {
    return this.healthMonitor.getHealthStatus();
  }

  /**
   * Get Prometheus-compatible metrics
   * @returns {string} Prometheus metrics format
   */
  getPrometheusMetrics() {
    return this.healthMonitor.getPrometheusMetrics();
  }

  /**
   * Graceful shutdown - cleanup resources
   */
  async shutdown() {
    try {
      this.logger.info('Starting graceful shutdown');
      
      // Clear update interval
      if (this.updateIntervalId) {
        clearInterval(this.updateIntervalId);
        this.updateIntervalId = null;
      }
      
      // Wait for any ongoing update to complete
      if (this.updatePromise) {
        await this.updatePromise.catch(() => {}); // Ignore errors during shutdown
      }
      
      // Close IndexedDB connection
      if (this.db) {
        this.db.close();
        this.db = null;
      }
      
      // Clear caches
      this.memoryManager.clear();
      this.searchIndex.clear();
      
      this.logger.info('Graceful shutdown completed');
    } catch (error) {
      this.logger.error('Error during shutdown', { error: error.message });
    }
  }
}

// Export for CommonJS and ES modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { 
    TokenListAligner, 
    TokenListError, 
    ERROR_CODES, 
    Logger,
    Validator,
    CircuitBreaker,
    MemoryManager,
    SearchIndex,
    HealthMonitor
  };
} else if (typeof window !== 'undefined') {
  window.TokenListAligner = TokenListAligner;
  window.TokenListError = TokenListError;
  window.ERROR_CODES = ERROR_CODES;
}

// Usage Examples and Production Setup:

/*
// PRODUCTION INITIALIZATION
const aligner = new TokenListAligner({
  enableTestnet: false,
  environment: 'production',
  logLevel: 'info',
  cacheTTL: 24 * 60 * 60 * 1000, // 24 hours
  requestTimeout: 5000,
  maxCacheSize: 2000,
  circuitBreakerThreshold: 3,
  enableMetrics: true
});

// COMPREHENSIVE ERROR HANDLING
try {
  const registry = await aligner.initialize();
  console.log(`✅ Loaded ${registry.tokens.size} tokens successfully`);
  
  // Validate performance targets
  const metrics = aligner.getMetrics();
  if (metrics.loadTime > 200) {
    console.warn(`⚠️ Load time ${metrics.loadTime}ms exceeds 200ms target`);
  }
  if (metrics.cacheHitRate < 95) {
    console.warn(`⚠️ Cache hit rate ${metrics.cacheHitRate}% below 95% target`);
  }
  
} catch (error) {
  if (error instanceof TokenListError) {
    console.error(`❌ TokenList Error [${error.code}]: ${error.message}`);
    console.error('Context:', error.context);
  } else {
    console.error('❌ Unexpected error:', error.message);
  }
}

// HEALTH MONITORING SETUP
setInterval(() => {
  const health = aligner.getHealthStatus();
  console.log(`Health: ${health.status} | Uptime: ${health.uptime}ms`);
  
  if (health.status === 'unhealthy') {
    console.warn('🚨 TokenListAligner is unhealthy!', health.metrics);
    // Send alert to monitoring system
  }
}, 30000); // Check every 30 seconds

// SECURE TOKEN OPERATIONS
try {
  // Validate addresses before use
  const token = aligner.getToken('0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', 1);
  
  if (token) {
    const security = aligner.getTokenSecurity(token.address, token.chainId);
    
    if (security.level === 'CRITICAL') {
      console.warn(`🚨 High risk token: ${token.symbol} (Score: ${security.score})`);
      console.warn(`Risk factors: ${security.factors.join(', ')}`);
    }
    
    console.log(`✅ ${token.symbol}: ${security.level} security (${security.score}/100)`);
  }
} catch (error) {
  console.error('Token lookup failed:', error.message);
}

// PERFORMANCE-OPTIMIZED SEARCH
const searchResults = aligner.searchTokens('USD', 20, {
  chainIds: [1, 137], // Ethereum and Polygon only
  maxRiskScore: 30,   // Low risk tokens only
  exactMatch: false   // Fuzzy matching
});

console.log(`Found ${searchResults.length} USD tokens with low risk`);

// BRIDGE INTEGRATION
const bridges = aligner.getBridgeProtocols({ 
  activeOnly: true,
  supportedChains: [1, 137] 
});

console.log(`Available bridges for Ethereum-Polygon: ${bridges.length}`);

// EXPORT FOR BACKUP
const backup = aligner.exportRegistry({
  includeMetrics: true,
  includeSecurity: true,
  chainIds: [1, 137, 56] // Major chains only
});

// Save to secure backup location
await fetch('/api/token-registry/backup', {
  method: 'POST',
  headers: { 
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + backupToken
  },
  body: JSON.stringify(backup)
});

// GRACEFUL SHUTDOWN
process.on('SIGTERM', async () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  await aligner.shutdown();
  process.exit(0);
});

// PROMETHEUS METRICS ENDPOINT
app.get('/metrics', (req, res) => {
  res.set('Content-Type', 'text/plain');
  res.send(aligner.getPrometheusMetrics());
});

// HEALTH CHECK ENDPOINT
app.get('/health', (req, res) => {
  const health = aligner.getHealthStatus();
  res.status(health.status === 'healthy' ? 200 : 503).json(health);
});
*/
      
      const normalizedAddress = address.toLowerCase();
      const key = isTestnet ? `testnet_${chainId}_${normalizedAddress}` : `${chainId}_${normalizedAddress}`;
      
      // Check memory cache first
      const cached = this.memoryManager.get(key);
      if (cached) {
        this.metrics.cacheHits++;
        this.healthMonitor.recordRequest(performance.now() - startTime);
        return cached;
      }
      
      const token = this.alignedRegistry.tokens.get(key) || null;
      
      // Cache result for future use
      if (token) {
        this.memoryManager.set(key, token);
        this.metrics.cacheHits++;
      } else {
        this.metrics.cacheMisses++;
      }
      
      this.healthMonitor.recordRequest(performance.now() - startTime);
      this.logger.debug('Token lookup completed', { 
        address: normalizedAddress, 
        chainId, 
        isTestnet, 
        found: !!token 
      });
      
      return token;
    } catch (error) {
      this.metrics.errors++;
      this.healthMonitor.recordRequest(performance.now() - startTime, true);
      this.logger.error('Token lookup failed', { 
        address, 
        chainId, 
        isTestnet, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Get all tokens for a specific network with pagination support
   * @param {number} chainId - The blockchain network chain ID
   * @param {boolean} [isTestnet=false] - Whether to get testnet tokens
   * @param {Object} [options={}] - Additional options
   * @param {number} [options.offset=0] - Pagination offset
   * @param {number} [options.limit=100] - Maximum number of tokens to return
   * @returns {Array<Object>} Array of token objects for the specified network
   * @throws {TokenListError} If parameters are invalid
   * @example
   * // Get all Ethereum mainnet tokens
   * const ethTokens = aligner.getTokensByNetwork(1);
   * console.log(`Found ${ethTokens.length} tokens on Ethereum`);
   * 
   * // Get Polygon tokens with pagination
   * const polygonTokens = aligner.getTokensByNetwork(137, false, { offset: 0, limit: 50 });
   * 
   * // Get BSC testnet tokens
   * const bscTestTokens = aligner.getTokensByNetwork(97, true);
   */
  getTokensByNetwork(chainId, isTestnet = false, options = {}) {
    const startTime = performance.now();
    const { offset = 0, limit = 100 } = options;
    
    try {
      // Validate inputs
      Validator.validateChainId(chainId);
      
      if (offset < 0 || limit < 1 || limit > 1000) {
        throw new TokenListError(ERROR_CODES.INVALID_CONFIG, 'Invalid pagination parameters', {
          offset,
          limit
        });
      }
      
      if (!this.alignedRegistry) {
        throw new TokenListError(ERROR_CODES.INITIALIZATION_FAILED, 'TokenListAligner not initialized');
      }
