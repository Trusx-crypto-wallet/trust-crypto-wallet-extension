import { getChain, validateChainId, getAllChainIds } from '../providers/configs/chainRegistry.js';

// Production-grade API keys configuration
const EXPLORER_API_KEYS = {
  etherscan: process.env.ETHERSCAN_API_KEY || '9EKZ2MWZQ16C4CVNHM1ANUT6NKZQAT5W9F',
  polygonscan: process.env.POLYGONSCAN_API_KEY || 'VWSZXJA14GR1Q5WNAEHQ1J99I2SG3IRYYI',
  bscscan: process.env.BSCSCAN_API_KEY || 'Q69CUMIRDBDKVBT91WEDEX51QV9XEFFRQ9',
  snowtrace: process.env.SNOWTRACE_API_KEY || '', // Free tier - no API key needed
  arbiscan: process.env.ARBISCAN_API_KEY || 'YP88X719TRZFQFTJST7BQUYP8WXARXA3YT',
  optimistic: process.env.OPTIMISTIC_API_KEY || 'TI49N7Y1FWCHZ184KC1T3IGQCG6QGRWDV6'
};

// Block explorer URL templates
const EXPLORER_TEMPLATES = {
  transaction: '{baseUrl}/tx/{hash}',
  address: '{baseUrl}/address/{address}',
  token: '{baseUrl}/token/{address}',
  block: '{baseUrl}/block/{block}',
  contract: '{baseUrl}/address/{address}#code'
};

// Production-grade explorer APIs with enhanced configuration
const EXPLORER_APIS = {
  etherscan: {
    name: 'Etherscan',
    apiBase: 'https://api.etherscan.io/api',
    rateLimit: 5,
    requiresApiKey: true,
    timeout: 30000,
    retries: 3
  },
  polygonscan: {
    name: 'Polygonscan',
    apiBase: 'https://api.polygonscan.com/api',
    rateLimit: 5,
    requiresApiKey: true,
    timeout: 30000,
    retries: 3
  },
  bscscan: {
    name: 'BscScan',
    apiBase: 'https://api.bscscan.com/api',
    rateLimit: 5,
    requiresApiKey: true,
    timeout: 30000,
    retries: 3
  },
  snowtrace: {
    name: 'Snowtrace',
    apiBase: 'https://api.routescan.io/v2/network/mainnet/evm/43114/etherscan/api',
    rateLimit: 2, // Free tier: 2 requests per second
    requiresApiKey: false, // No API key required for free tier
    timeout: 30000,
    retries: 3,
    chainId: 43114,
    freeAccess: true
  },
  arbiscan: {
    name: 'Arbiscan',
    apiBase: 'https://api.arbiscan.io/api',
    rateLimit: 5,
    requiresApiKey: true,
    timeout: 30000,
    retries: 3
  },
  optimistic: {
    name: 'Optimistic Etherscan',
    apiBase: 'https://api-optimistic.etherscan.io/api',
    rateLimit: 5,
    requiresApiKey: true,
    timeout: 30000,
    retries: 3
  }
};

class ProductionBlockExplorer {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 300000; // 5 minutes
    this.requestQueue = new Map();
    this.rateLimiters = new Map();
    this.circuitBreakers = new Map();
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      cacheHits: 0,
      cacheMisses: 0
    };
    this.retryConfig = {
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 10000,
      backoffFactor: 2
    };
  }

  /**
   * Get block explorer URLs for a specific chain
   * @param {number} chainId - Chain ID
   * @returns {Object} Block explorer URLs
   */
  getExplorerUrls(chainId) {
    try {
      validateChainId(chainId);
      const chain = getChain(chainId);
      
      if (!chain.blockExplorers || chain.blockExplorers.length === 0) {
        throw new Error(`No block explorers configured for chain ${chainId}`);
      }

      const primaryExplorer = chain.blockExplorers[0];
      const baseUrl = primaryExplorer.url;

      return {
        name: primaryExplorer.name,
        baseUrl,
        transaction: (hash) => this._buildUrl(EXPLORER_TEMPLATES.transaction, { baseUrl, hash }),
        address: (address) => this._buildUrl(EXPLORER_TEMPLATES.address, { baseUrl, address }),
        token: (address) => this._buildUrl(EXPLORER_TEMPLATES.token, { baseUrl, address }),
        block: (block) => this._buildUrl(EXPLORER_TEMPLATES.block, { baseUrl, block }),
        contract: (address) => this._buildUrl(EXPLORER_TEMPLATES.contract, { baseUrl, address })
      };
    } catch (error) {
      this._logError('getExplorerUrls', error, { chainId });
      throw error;
    }
  }

  /**
   * Get transaction details from block explorer
   * @param {number} chainId - Chain ID
   * @param {string} txHash - Transaction hash
   * @returns {Promise<Object>} Transaction details
   */
  async getTransactionDetails(chainId, txHash) {
    const requestId = this._generateRequestId();
    const startTime = Date.now();

    try {
      validateChainId(chainId);
      this._validateHash(txHash);

      const cacheKey = `tx-${chainId}-${txHash}`;
      const cached = this._getFromCache(cacheKey);
      if (cached) {
        this.metrics.cacheHits++;
        return cached;
      }
      this.metrics.cacheMisses++;

      // Check circuit breaker
      const apiConfig = this._getApiConfig(chainId);
      if (this._isCircuitOpen(apiConfig.name)) {
        throw new Error(`Circuit breaker open for ${apiConfig.name}`);
      }

      // Rate limiting
      await this._enforceRateLimit(apiConfig);

      const response = await this._makeApiRequestWithRetry(apiConfig, 'transaction', {
        module: 'proxy',
        action: 'eth_getTransactionByHash',
        txhash: txHash,
        tag: 'latest'
      }, requestId);

      const txDetails = this._parseTransactionResponse(response, chainId);
      this._setCache(cacheKey, txDetails);
      this._updateSuccessMetrics(startTime);
      this._recordCircuitBreakerSuccess(apiConfig.name);
      
      return txDetails;
    } catch (error) {
      this._updateFailureMetrics(startTime);
      this._recordCircuitBreakerFailure(this._getApiConfig(chainId)?.name);
      this._logError('getTransactionDetails', error, { chainId, txHash, requestId });
      throw this._enhanceError(error, requestId, 'getTransactionDetails');
    }
  }

  /**
   * Get transaction receipt from block explorer
   * @param {number} chainId - Chain ID
   * @param {string} txHash - Transaction hash
   * @returns {Promise<Object>} Transaction receipt
   */
  async getTransactionReceipt(chainId, txHash) {
    const requestId = this._generateRequestId();
    const startTime = Date.now();

    try {
      validateChainId(chainId);
      this._validateHash(txHash);

      const cacheKey = `receipt-${chainId}-${txHash}`;
      const cached = this._getFromCache(cacheKey);
      if (cached) {
        this.metrics.cacheHits++;
        return cached;
      }
      this.metrics.cacheMisses++;

      const apiConfig = this._getApiConfig(chainId);
      if (this._isCircuitOpen(apiConfig.name)) {
        throw new Error(`Circuit breaker open for ${apiConfig.name}`);
      }

      await this._enforceRateLimit(apiConfig);

      const response = await this._makeApiRequestWithRetry(apiConfig, 'receipt', {
        module: 'proxy',
        action: 'eth_getTransactionReceipt',
        txhash: txHash
      }, requestId);

      const receipt = this._parseReceiptResponse(response, chainId);
      this._setCache(cacheKey, receipt);
      this._updateSuccessMetrics(startTime);
      this._recordCircuitBreakerSuccess(apiConfig.name);
      
      return receipt;
    } catch (error) {
      this._updateFailureMetrics(startTime);
      this._recordCircuitBreakerFailure(this._getApiConfig(chainId)?.name);
      this._logError('getTransactionReceipt', error, { chainId, txHash, requestId });
      throw this._enhanceError(error, requestId, 'getTransactionReceipt');
    }
  }

  /**
   * Get address balance and transaction history
   * @param {number} chainId - Chain ID
   * @param {string} address - Wallet address
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Address information
   */
  async getAddressInfo(chainId, address, options = {}) {
    const requestId = this._generateRequestId();
    const startTime = Date.now();

    try {
      validateChainId(chainId);
      this._validateAddress(address);

      const { includeTokens = false, page = 1, offset = 25 } = options;
      const cacheKey = `addr-${chainId}-${address}-${includeTokens}-${page}`;
      const cached = this._getFromCache(cacheKey);
      if (cached) {
        this.metrics.cacheHits++;
        return cached;
      }
      this.metrics.cacheMisses++;

      const apiConfig = this._getApiConfig(chainId);
      if (this._isCircuitOpen(apiConfig.name)) {
        throw new Error(`Circuit breaker open for ${apiConfig.name}`);
      }

      await this._enforceRateLimit(apiConfig);
      
      // Get balance
      const balanceResponse = await this._makeApiRequestWithRetry(apiConfig, 'balance', {
        module: 'account',
        action: 'balance',
        address,
        tag: 'latest'
      }, requestId);

      // Small delay between requests to respect rate limits
      await this._sleep(500);

      // Get transaction list
      const txListResponse = await this._makeApiRequestWithRetry(apiConfig, 'txlist', {
        module: 'account',
        action: 'txlist',
        address,
        startblock: 0,
        endblock: 99999999,
        page,
        offset,
        sort: 'desc'
      }, requestId);

      const addressInfo = {
        address,
        balance: this._parseBalance(balanceResponse.result),
        transactionCount: txListResponse.result?.length || 0,
        transactions: this._parseTransactionList(txListResponse.result || [], chainId),
        explorerUrl: this.getExplorerUrls(chainId).address(address),
        lastUpdated: new Date().toISOString()
      };

      // Include token balances if requested
      if (includeTokens) {
        try {
          await this._sleep(500); // Rate limit protection
          const tokenResponse = await this._makeApiRequestWithRetry(apiConfig, 'tokentx', {
            module: 'account',
            action: 'tokentx',
            address,
            page: 1,
            offset: 100,
            sort: 'desc'
          }, requestId);
          addressInfo.tokenTransactions = this._parseTokenTransactions(tokenResponse.result || []);
        } catch (tokenError) {
          console.warn('Failed to fetch token transactions:', tokenError);
          addressInfo.tokenTransactions = [];
        }
      }

      this._setCache(cacheKey, addressInfo);
      this._updateSuccessMetrics(startTime);
      this._recordCircuitBreakerSuccess(apiConfig.name);
      
      return addressInfo;
    } catch (error) {
      this._updateFailureMetrics(startTime);
      this._recordCircuitBreakerFailure(this._getApiConfig(chainId)?.name);
      this._logError('getAddressInfo', error, { chainId, address, requestId });
      throw this._enhanceError(error, requestId, 'getAddressInfo');
    }
  }

  /**
   * Get contract ABI from block explorer
   * @param {number} chainId - Chain ID
   * @param {string} contractAddress - Contract address
   * @returns {Promise<Object>} Contract ABI and info
   */
  async getContractABI(chainId, contractAddress) {
    const requestId = this._generateRequestId();
    const startTime = Date.now();

    try {
      validateChainId(chainId);
      this._validateAddress(contractAddress);

      const cacheKey = `abi-${chainId}-${contractAddress}`;
      const cached = this._getFromCache(cacheKey);
      if (cached) {
        this.metrics.cacheHits++;
        return cached;
      }
      this.metrics.cacheMisses++;

      const apiConfig = this._getApiConfig(chainId);
      if (this._isCircuitOpen(apiConfig.name)) {
        throw new Error(`Circuit breaker open for ${apiConfig.name}`);
      }

      await this._enforceRateLimit(apiConfig);

      const response = await this._makeApiRequestWithRetry(apiConfig, 'abi', {
        module: 'contract',
        action: 'getabi',
        address: contractAddress
      }, requestId);

      if (response.status === '0') {
        throw new Error(`Contract ABI not found: ${response.message}`);
      }

      const contractInfo = {
        address: contractAddress,
        abi: JSON.parse(response.result),
        isVerified: true,
        explorerUrl: this.getExplorerUrls(chainId).contract(contractAddress),
        lastUpdated: new Date().toISOString()
      };

      this._setCache(cacheKey, contractInfo);
      this._updateSuccessMetrics(startTime);
      this._recordCircuitBreakerSuccess(apiConfig.name);
      
      return contractInfo;
    } catch (error) {
      this._updateFailureMetrics(startTime);
      this._recordCircuitBreakerFailure(this._getApiConfig(chainId)?.name);
      this._logError('getContractABI', error, { chainId, contractAddress, requestId });
      throw this._enhanceError(error, requestId, 'getContractABI');
    }
  }

  /**
   * Search for transactions, addresses, or blocks
   * @param {number} chainId - Chain ID
   * @param {string} query - Search query
   * @returns {Promise<Object>} Search results
   */
  async search(chainId, query) {
    const requestId = this._generateRequestId();

    try {
      validateChainId(chainId);
      
      if (!query || query.length < 3) {
        throw new Error('Search query must be at least 3 characters long');
      }

      const results = {
        query,
        type: null,
        results: [],
        timestamp: new Date().toISOString(),
        requestId
      };

      // Determine query type and search
      if (this._isTransactionHash(query)) {
        results.type = 'transaction';
        try {
          const txDetails = await this.getTransactionDetails(chainId, query);
          results.results.push(txDetails);
        } catch (error) {
          console.warn('Transaction not found:', error.message);
        }
      } else if (this._isAddress(query)) {
        results.type = 'address';
        try {
          const addressInfo = await this.getAddressInfo(chainId, query, { includeTokens: false });
          results.results.push(addressInfo);
        } catch (error) {
          console.warn('Address not found:', error.message);
        }
      } else if (this._isBlockNumber(query)) {
        results.type = 'block';
        // Block search implementation would go here
        console.warn('Block search not yet implemented');
      }

      return results;
    } catch (error) {
      this._logError('search', error, { chainId, query, requestId });
      throw this._enhanceError(error, requestId, 'search');
    }
  }

  /**
   * Get supported chains with their explorer info
   * @returns {Array} List of supported chains
   */
  getSupportedChains() {
    try {
      return getAllChainIds().map(chainId => {
        try {
          const chain = getChain(chainId);
          return {
            chainId,
            name: chain.name,
            hasExplorer: chain.blockExplorers && chain.blockExplorers.length > 0,
            explorerName: chain.blockExplorers?.[0]?.name,
            explorerUrl: chain.blockExplorers?.[0]?.url,
            isSupported: this._isChainSupported(chainId)
          };
        } catch (error) {
          return null;
        }
      }).filter(Boolean);
    } catch (error) {
      this._logError('getSupportedChains', error);
      return [];
    }
  }

  /**
   * Get current metrics and health status
   * @returns {Object} Metrics and health information
   */
  getMetrics() {
    const successRate = this.metrics.totalRequests > 0 
      ? (this.metrics.successfulRequests / this.metrics.totalRequests * 100).toFixed(2)
      : '0';

    const cacheHitRate = (this.metrics.cacheHits + this.metrics.cacheMisses) > 0
      ? (this.metrics.cacheHits / (this.metrics.cacheHits + this.metrics.cacheMisses) * 100).toFixed(2)
      : '0';

    return {
      requests: {
        total: this.metrics.totalRequests,
        successful: this.metrics.successfulRequests,
        failed: this.metrics.failedRequests,
        successRate: `${successRate}%`
      },
      performance: {
        averageResponseTime: `${this.metrics.averageResponseTime.toFixed(2)}ms`
      },
      cache: {
        hits: this.metrics.cacheHits,
        misses: this.metrics.cacheMisses,
        hitRate: `${cacheHitRate}%`,
        size: this.cache.size
      },
      circuitBreakers: Array.from(this.circuitBreakers.entries()).map(([name, breaker]) => ({
        api: name,
        state: breaker.state,
        failureCount: breaker.failureCount,
        lastFailTime: breaker.lastFailTime
      })),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Health check for the explorer service
   * @returns {Promise<Object>} Health status
   */
  async healthCheck() {
    const health = {
      status: 'healthy',
      checks: {},
      timestamp: new Date().toISOString()
    };

    try {
      // Test Avalanche C-Chain (free tier)
      health.checks.avalanche = await this._testApiHealth('snowtrace');
      
      // Add other API health checks if needed
      const unhealthyApis = Object.values(health.checks).filter(check => check.status !== 'healthy');
      
      if (unhealthyApis.length > 0) {
        health.status = 'degraded';
      }

    } catch (error) {
      health.status = 'unhealthy';
      health.error = error.message;
    }

    return health;
  }

  // Private helper methods
  _buildUrl(template, params) {
    return Object.entries(params).reduce(
      (url, [key, value]) => url.replace(`{${key}}`, value),
      template
    );
  }

  _getApiConfig(chainId) {
    try {
      const chain = getChain(chainId);
      const explorerName = chain.blockExplorers?.[0]?.name?.toLowerCase();
      
      // Special handling for Avalanche C-Chain
      if (chainId === 43114) {
        return EXPLORER_APIS.snowtrace;
      }
      
      // Map explorer names to API configs
      const apiKey = explorerName?.includes('etherscan') ? 'etherscan' :
                     explorerName?.includes('polygonscan') ? 'polygonscan' :
                     explorerName?.includes('bscscan') ? 'bscscan' :
                     explorerName?.includes('snowtrace') ? 'snowtrace' :
                     explorerName?.includes('arbiscan') ? 'arbiscan' :
                     explorerName?.includes('optimistic') ? 'optimistic' : null;

      if (!apiKey || !EXPLORER_APIS[apiKey]) {
        throw new Error(`No API configuration found for explorer: ${explorerName}`);
      }

      return EXPLORER_APIS[apiKey];
    } catch (error) {
      throw new Error(`Failed to get API config for chain ${chainId}: ${error.message}`);
    }
  }

  async _makeApiRequestWithRetry(apiConfig, requestType, params, requestId) {
    let lastError;

    for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          const delay = this._calculateBackoffDelay(attempt);
          console.log(`Retrying request ${requestId}, attempt ${attempt}/${this.retryConfig.maxRetries}, delay: ${delay}ms`);
          await this._sleep(delay);
        }

        return await this._makeApiRequest(apiConfig, requestType, params, requestId);

      } catch (error) {
        lastError = error;

        // Don't retry on certain error types
        if (this._isNonRetryableError(error)) {
          break;
        }

        // Don't retry on last attempt
        if (attempt === this.retryConfig.maxRetries) {
          break;
        }
      }
    }

    throw lastError;
  }

  async _makeApiRequest(apiConfig, requestType, params, requestId) {
    try {
      const url = new URL(apiConfig.apiBase);
      
      // Add parameters with proper encoding
      Object.entries(params).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          url.searchParams.append(key, String(value));
        }
      });

      // Add API key if required
      if (apiConfig.requiresApiKey) {
        const apiKey = this._getApiKey(apiConfig.name);
        if (apiKey) {
          url.searchParams.append('apikey', apiKey);
        } else if (apiConfig.requiresApiKey === true) {
          throw new Error(`API key required but not found for ${apiConfig.name}`);
        }
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), apiConfig.timeout || 30000);

      try {
        const response = await fetch(url.toString(), {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'ProductionBlockExplorer/1.0',
            'X-Request-ID': requestId
          },
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
        }

        const data = await response.json();

        // Validate API response format
        if (!this._isValidApiResponse(data)) {
          throw new Error(`Invalid API response format: ${JSON.stringify(data)}`);
        }

        return data;

      } catch (fetchError) {
        clearTimeout(timeoutId);
        throw fetchError;
      }

    } catch (error) {
      throw new Error(`API request failed: ${error.message}`);
    }
  }

  // Rate limiting implementation
  async _enforceRateLimit(apiConfig) {
    const key = apiConfig.name;
    const rateLimit = apiConfig.rateLimit || 5;
    const windowMs = 1000; // 1 second window

    if (!this.rateLimiters.has(key)) {
      this.rateLimiters.set(key, {
        requests: [],
        queue: []
      });
    }

    const limiter = this.rateLimiters.get(key);
    const now = Date.now();

    // Clean old requests
    limiter.requests = limiter.requests.filter(time => now - time < windowMs);

    // Check if we can make request immediately
    if (limiter.requests.length < rateLimit) {
      limiter.requests.push(now);
      return;
    }

    // Calculate wait time
    const oldestRequest = Math.min(...limiter.requests);
    const waitTime = windowMs - (now - oldestRequest);

    if (waitTime > 0) {
      await this._sleep(waitTime);
      return this._enforceRateLimit(apiConfig);
    }
  }

  // Circuit breaker implementation
  _isCircuitOpen(apiName) {
    const breaker = this.circuitBreakers.get(apiName);
    if (!breaker) return false;

    const now = Date.now();
    
    // Check if circuit should be reset
    if (breaker.state === 'open' && now - breaker.lastFailTime > breaker.timeout) {
      breaker.state = 'half-open';
      breaker.failureCount = 0;
    }

    return breaker.state === 'open';
  }

  _recordCircuitBreakerSuccess(apiName) {
    const breaker = this.circuitBreakers.get(apiName) || {
      failureCount: 0,
      state: 'closed',
      threshold: 5,
      timeout: 60000
    };

    breaker.failureCount = 0;
    breaker.state = 'closed';
    this.circuitBreakers.set(apiName, breaker);
  }

  _recordCircuitBreakerFailure(apiName) {
    if (!apiName) return;

    const breaker = this.circuitBreakers.get(apiName) || {
      failureCount: 0,
      state: 'closed',
      threshold: 5,
      timeout: 60000
    };

    breaker.failureCount++;
    breaker.lastFailTime = Date.now();

    if (breaker.failureCount >= breaker.threshold) {
      breaker.state = 'open';
      console.warn(`Circuit breaker opened for ${apiName} after ${breaker.failureCount} failures`);
    }

    this.circuitBreakers.set(apiName, breaker);
  }

  // Utility methods
  _getApiKey(apiName) {
    const keyMap = {
      'Etherscan': 'etherscan',
      'Polygonscan': 'polygonscan',
      'BscScan': 'bscscan',
      'Snowtrace': 'snowtrace',
      'Arbiscan': 'arbiscan',
      'Optimistic Etherscan': 'optimistic'
    };

    const keyName = keyMap[apiName] || apiName.toLowerCase();
    return EXPLORER_API_KEYS[keyName] || '';
  }

  _calculateBackoffDelay(attempt) {
    const { baseDelay, maxDelay, backoffFactor } = this.retryConfig;
    const delay = baseDelay * Math.pow(backoffFactor, attempt - 1);
    const jitter = Math.random() * 0.1 * delay; // Add 10% jitter
    return Math.min(delay + jitter, maxDelay);
  }

  _isNonRetryableError(error) {
    const nonRetryablePatterns = [
      /invalid.*address/i,
      /invalid.*hash/i,
      /not.*found/i,
      /unauthorized/i,
      /forbidden/i,
      /bad.*request/i,
      /invalid.*api.*key/i
    ];

    return nonRetryablePatterns.some(pattern => pattern.test(error.message));
  }

  _isValidApiResponse(data) {
    return data && typeof data === 'object' && 
           (data.hasOwnProperty('status') || data.hasOwnProperty('result'));
  }

  _generateRequestId() {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  _isChainSupported(chainId) {
    try {
      this._getApiConfig(chainId);
      return true;
    } catch {
      return false;
    }
  }

  async _testApiHealth(apiKey) {
    try {
      const apiConfig = EXPLORER_APIS[apiKey];
      const startTime = Date.now();
      
      // Test with a simple balance request for Avalanche
      const testUrl = `${apiConfig.apiBase}?module=account&action=balance&address=0x742d35Cc6634C0532925a3b8D400c3eb95f3c6e2&tag=latest`;
      
      const response = await fetch(testUrl, {
        timeout: 10000
      });
      
      const responseTime = Date.now() - startTime;
      const data = await response.json();

      return {
        status: response.ok && data.status !== '0' ? 'healthy' : 'unhealthy',
        responseTime: `${responseTime}ms`,
        apiResponse: data.status === '1' ? 'valid' : 'error'
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message
      };
    }
  }

  _updateSuccessMetrics(startTime) {
    this.metrics.totalRequests++;
    this.metrics.successfulRequests++;
    this._updateAverageResponseTime(startTime);
  }

  _updateFailureMetrics(startTime) {
    this.metrics.totalRequests++;
    this.metrics.failedRequests++;
    this._updateAverageResponseTime(startTime);
  }

  _updateAverageResponseTime(startTime) {
    const responseTime = Date.now() - startTime;
    this.metrics.averageResponseTime = 
      (this.metrics.averageResponseTime * (this.metrics.totalRequests - 1) + responseTime) / 
      this.metrics.totalRequests;
  }

  _logError(method, error, context = {}) {
    console.error(`BlockExplorer Error [${method}]`, {
      error: error.message,
      context,
      timestamp: new Date().toISOString(),
      stack: error.stack
    });
  }

  _enhanceError(error, requestId, method) {
    const enhancedError = new Error(`BlockExplorer ${method} failed: ${error.message}`);
    enhancedError.requestId = requestId;
    enhancedError.method = method;
    enhancedError.originalError = error;
    enhancedError.timestamp = new Date().toISOString();
    return enhancedError;
  }

  // Parsing methods
  _parseTransactionResponse(response, chainId) {
    const tx = response.result;
    if (!tx) throw new Error('Transaction not found');

    return {
      hash: tx.hash,
      blockNumber: parseInt(tx.blockNumber, 16),
      from: tx.from,
      to: tx.to,
      value: tx.value,
      gasPrice: tx.gasPrice,
      gasUsed: tx.gas,
      status: 'confirmed',
      explorerUrl: this.getExplorerUrls(chainId).transaction(tx.hash),
      timestamp: new Date().toISOString()
    };
  }

  _parseReceiptResponse(response, chainId) {
    const receipt = response.result;
    if (!receipt) throw new Error('Receipt not found');

    return {
      transactionHash: receipt.transactionHash,
      status: receipt.status === '0x1' ? 'success' : 'failed',
      gasUsed: parseInt(receipt.gasUsed, 16),
      logs: receipt.logs || [],
      explorerUrl: this.getExplorerUrls(chainId).transaction(receipt.transactionHash),
      timestamp: new Date().toISOString()
    };
  }

  _parseBalance(balanceHex) {
    try {
      const balanceWei = BigInt(balanceHex);
      const balanceEth = Number(balanceWei) / Math.pow(10, 18);
      return balanceEth.toString();
    } catch (error) {
      console.warn('Failed to parse balance:', balanceHex);
      return '0';
    }
  }

  _parseTransactionList(transactions, chainId) {
    return transactions.map(tx => ({
      hash: tx.hash,
      blockNumber: parseInt(tx.blockNumber),
      from: tx.from,
      to: tx.to,
      value: tx.value,
      timeStamp: new Date(parseInt(tx.timeStamp) * 1000),
      explorerUrl: this.getExplorerUrls(chainId).transaction(tx.hash)
    }));
  }

  _parseTokenTransactions(tokenTxs) {
    return tokenTxs.map(tx => ({
      hash: tx.hash,
      tokenName: tx.tokenName,
      tokenSymbol: tx.tokenSymbol,
      tokenDecimal: tx.tokenDecimal,
      from: tx.from,
      to: tx.to,
      value: tx.value,
      timeStamp: new Date(parseInt(tx.timeStamp) * 1000)
    }));
  }

  // Validation methods
  _isTransactionHash(query) {
    return /^0x[a-fA-F0-9]{64}$/.test(query);
  }

  _isAddress(query) {
    return /^0x[a-fA-F0-9]{40}$/.test(query);
  }

  _isBlockNumber(query) {
    return /^\d+$/.test(query);
  }

  _validateHash(hash) {
    if (!this._isTransactionHash(hash)) {
      throw new Error('Invalid transaction hash format');
    }
  }

  _validateAddress(address) {
    if (!this._isAddress(address)) {
      throw new Error('Invalid address format');
    }
  }

  // Cache methods
  _getFromCache(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    this.cache.delete(key); // Clean expired cache
    return null;
  }

  _setCache(key, data) {
    // Implement cache size limit
    if (this.cache.size > 1000) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  clearCache() {
    this.cache.clear();
    console.log('Cache cleared');
  }

  // Management methods
  resetCircuitBreakers() {
    this.circuitBreakers.clear();
    console.log('Circuit breakers reset');
  }

  clearRateLimiters() {
    this.rateLimiters.clear();
    console.log('Rate limiters cleared');
  }

  resetMetrics() {
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      cacheHits: 0,
      cacheMisses: 0
    };
    console.log('Metrics reset');
  }
}

// Export singleton instance
export const blockExplorer = new ProductionBlockExplorer();

// Export utility functions with error handling
export const getExplorerUrlsForChain = (chainId) => {
  try {
    return blockExplorer.getExplorerUrls(chainId);
  } catch (error) {
    console.error('Failed to get explorer URLs:', error);
    throw error;
  }
};

export const searchBlockchain = async (chainId, query) => {
  try {
    return await blockExplorer.search(chainId, query);
  } catch (error) {
    console.error('Blockchain search failed:', error);
    throw error;
  }
};

export const getTransactionInfo = async (chainId, txHash) => {
  try {
    return await blockExplorer.getTransactionDetails(chainId, txHash);
  } catch (error) {
    console.error('Failed to get transaction info:', error);
    throw error;
  }
};

export const getAddressDetails = async (chainId, address, options) => {
  try {
    return await blockExplorer.getAddressInfo(chainId, address, options);
  } catch (error) {
    console.error('Failed to get address details:', error);
    throw error;
  }
};

export const getExplorerMetrics = () => {
  try {
    return blockExplorer.getMetrics();
  } catch (error) {
    console.error('Failed to get metrics:', error);
    return null;
  }
};

export const checkExplorerHealth = async () => {
  try {
    return await blockExplorer.healthCheck();
  } catch (error) {
    console.error('Health check failed:', error);
    return { status: 'unhealthy', error: error.message };
  }
};

// Production-ready configuration export
export const PRODUCTION_CONFIG = {
  EXPLORER_API_KEYS,
  EXPLORER_APIS,
  CACHE_TIMEOUT: 300000, // 5 minutes
  RATE_LIMITS: {
    snowtrace: 2, // Free tier
    etherscan: 5,
    polygonscan: 5,
    bscscan: 5,
    arbiscan: 5,
    optimistic: 5
  },
  RETRY_CONFIG: {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    backoffFactor: 2
  }
};

export default blockExplorer;

// Usage Example:
/*
// Basic usage
import { blockExplorer, getAddressDetails, checkExplorerHealth } from './ProductionBlockExplorer.js';

// Get Avalanche C-Chain address info (uses free Routescan API)
const addressInfo = await getAddressDetails(43114, '0x742d35Cc6634C0532925a3b8D400c3eb95f3c6e2');
console.log('AVAX Balance:', addressInfo.balance);

// Health check
const health = await checkExplorerHealth();
console.log('Service health:', health.status);

// Get metrics
const metrics = blockExplorer.getMetrics();
console.log('Success rate:', metrics.requests.successRate);

// Production monitoring
setInterval(async () => {
  const health = await checkExplorerHealth();
  if (health.status !== 'healthy') {
    console.error('Service degraded:', health);
    // Trigger alerts here
  }
}, 60000); // Check every minute
*/
