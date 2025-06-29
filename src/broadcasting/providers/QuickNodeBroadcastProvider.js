/**
 * @fileoverview Enterprise-grade QuickNode Broadcast Provider with comprehensive security
 * @version 2.0.0
 * @author Enterprise Development Team
 * @license MIT
 * @description Production-ready QuickNode provider with advanced security, monitoring, and reliability features
 */

import { RPCBroadcastProvider, RPCError, RPC_ERROR_CODES } from './RPCBroadcastProvider.js';
import { SecurityManager } from '../security/SecurityManager.js';
import { MetricsCollector } from '../monitoring/MetricsCollector.js';
import { CircuitBreaker } from '../reliability/CircuitBreaker.js';

/**
 * QuickNode-specific error codes with detailed categorization
 */
export const QUICKNODE_ERROR_CODES = {
  // Configuration Errors
  INVALID_URL: 'QUICKNODE_INVALID_URL',
  INVALID_API_KEY: 'QUICKNODE_INVALID_API_KEY',
  INVALID_ENDPOINT_ID: 'QUICKNODE_INVALID_ENDPOINT_ID',
  INVALID_CHAIN_ID: 'QUICKNODE_INVALID_CHAIN_ID',
  
  // Service Errors
  SERVICE_UNAVAILABLE: 'QUICKNODE_SERVICE_UNAVAILABLE',
  ENDPOINT_NOT_FOUND: 'QUICKNODE_ENDPOINT_NOT_FOUND',
  ENDPOINT_DISABLED: 'QUICKNODE_ENDPOINT_DISABLED',
  MAINTENANCE_MODE: 'QUICKNODE_MAINTENANCE_MODE',
  
  // Rate Limiting & Quota
  RATE_LIMITED: 'QUICKNODE_RATE_LIMITED',
  QUOTA_EXCEEDED: 'QUICKNODE_QUOTA_EXCEEDED',
  CREDITS_EXHAUSTED: 'QUICKNODE_CREDITS_EXHAUSTED',
  CONCURRENT_LIMIT: 'QUICKNODE_CONCURRENT_LIMIT',
  MONTHLY_LIMIT: 'QUICKNODE_MONTHLY_LIMIT',
  
  // Authentication & Authorization
  AUTH_FAILED: 'QUICKNODE_AUTH_FAILED',
  PERMISSION_DENIED: 'QUICKNODE_PERMISSION_DENIED',
  TOKEN_EXPIRED: 'QUICKNODE_TOKEN_EXPIRED',
  INVALID_CREDENTIALS: 'QUICKNODE_INVALID_CREDENTIALS',
  SUBSCRIPTION_REQUIRED: 'QUICKNODE_SUBSCRIPTION_REQUIRED',
  
  // Network & Infrastructure
  NETWORK_ERROR: 'QUICKNODE_NETWORK_ERROR',
  TIMEOUT: 'QUICKNODE_TIMEOUT',
  DNS_RESOLUTION: 'QUICKNODE_DNS_RESOLUTION',
  SSL_ERROR: 'QUICKNODE_SSL_ERROR',
  
  // Data & Protocol
  INVALID_RESPONSE: 'QUICKNODE_INVALID_RESPONSE',
  PROTOCOL_ERROR: 'QUICKNODE_PROTOCOL_ERROR',
  MALFORMED_DATA: 'QUICKNODE_MALFORMED_DATA',
  JSON_RPC_ERROR: 'QUICKNODE_JSON_RPC_ERROR',
  
  // QuickNode Specific
  ADDON_NOT_ENABLED: 'QUICKNODE_ADDON_NOT_ENABLED',
  PLAN_LIMITATION: 'QUICKNODE_PLAN_LIMITATION',
  REGION_NOT_SUPPORTED: 'QUICKNODE_REGION_NOT_SUPPORTED'
};

/**
 * Supported QuickNode networks with comprehensive configuration
 */
export const QUICKNODE_NETWORKS = {
  ETHEREUM: { 
    chainId: 1, 
    name: 'ethereum', 
    subdomain: 'eth-mainnet',
    testnet: false,
    addons: ['trace', 'debug', 'archive']
  },
  ETHEREUM_GOERLI: { 
    chainId: 5, 
    name: 'ethereum-goerli', 
    subdomain: 'eth-goerli',
    testnet: true,
    addons: ['trace', 'debug']
  },
  ETHEREUM_SEPOLIA: { 
    chainId: 11155111, 
    name: 'ethereum-sepolia', 
    subdomain: 'eth-sepolia',
    testnet: true,
    addons: ['trace', 'debug']
  },
  BSC: { 
    chainId: 56, 
    name: 'bsc', 
    subdomain: 'bsc-mainnet',
    testnet: false,
    addons: ['trace', 'debug']
  },
  BSC_TESTNET: { 
    chainId: 97, 
    name: 'bsc-testnet', 
    subdomain: 'bsc-testnet',
    testnet: true,
    addons: ['trace']
  },
  POLYGON: { 
    chainId: 137, 
    name: 'polygon', 
    subdomain: 'matic-mainnet',
    testnet: false,
    addons: ['trace', 'debug', 'archive']
  },
  POLYGON_MUMBAI: { 
    chainId: 80001, 
    name: 'polygon-mumbai', 
    subdomain: 'matic-mumbai',
    testnet: true,
    addons: ['trace', 'debug']
  },
  AVALANCHE: { 
    chainId: 43114, 
    name: 'avalanche', 
    subdomain: 'avalanche-mainnet',
    testnet: false,
    addons: ['trace', 'debug']
  },
  AVALANCHE_FUJI: { 
    chainId: 43113, 
    name: 'avalanche-fuji', 
    subdomain: 'avalanche-fuji',
    testnet: true,
    addons: ['trace']
  },
  ARBITRUM: { 
    chainId: 42161, 
    name: 'arbitrum', 
    subdomain: 'arb-mainnet',
    testnet: false,
    addons: ['trace', 'debug']
  },
  ARBITRUM_GOERLI: { 
    chainId: 421613, 
    name: 'arbitrum-goerli', 
    subdomain: 'arb-goerli',
    testnet: true,
    addons: ['trace']
  },
  OPTIMISM: { 
    chainId: 10, 
    name: 'optimism', 
    subdomain: 'opt-mainnet',
    testnet: false,
    addons: ['trace', 'debug']
  },
  OPTIMISM_GOERLI: { 
    chainId: 420, 
    name: 'optimism-goerli', 
    subdomain: 'opt-goerli',
    testnet: true,
    addons: ['trace']
  },
  FANTOM: { 
    chainId: 250, 
    name: 'fantom', 
    subdomain: 'fantom-mainnet',
    testnet: false,
    addons: ['trace', 'debug']
  },
  SOLANA: { 
    chainId: null, 
    name: 'solana', 
    subdomain: 'solana-mainnet',
    testnet: false,
    addons: ['rpc', 'websocket']
  },
  SOLANA_DEVNET: { 
    chainId: null, 
    name: 'solana-devnet', 
    subdomain: 'solana-devnet',
    testnet: true,
    addons: ['rpc', 'websocket']
  }
};

/**
 * QuickNode service tiers and their limitations
 */
export const QUICKNODE_TIERS = {
  DISCOVER: {
    name: 'Discover',
    requestsPerSecond: 25,
    monthlyQuota: 500000,
    concurrentConnections: 5,
    addons: ['basic']
  },
  BUILD: {
    name: 'Build',
    requestsPerSecond: 50,
    monthlyQuota: 10000000,
    concurrentConnections: 10,
    addons: ['trace', 'debug']
  },
  SCALE: {
    name: 'Scale',
    requestsPerSecond: 100,
    monthlyQuota: 50000000,
    concurrentConnections: 25,
    addons: ['trace', 'debug', 'archive']
  },
  ENTERPRISE: {
    name: 'Enterprise',
    requestsPerSecond: 500,
    monthlyQuota: null, // Unlimited
    concurrentConnections: 100,
    addons: ['all']
  }
};

/**
 * Enterprise-grade QuickNode Broadcast Provider with comprehensive security and monitoring
 * @class QuickNodeBroadcastProvider
 * @extends RPCBroadcastProvider
 */
export class QuickNodeBroadcastProvider extends RPCBroadcastProvider {
  /**
   * @param {Object} config - Comprehensive configuration object
   * @param {string} config.rpcUrl - Full QuickNode HTTPS RPC URL
   * @param {number} config.chainId - Network chain ID
   * @param {string} [config.endpointId] - QuickNode endpoint ID
   * @param {string} [config.apiKey] - QuickNode API key for authentication
   * @param {Object} [config.auth] - Alternative authentication object
   * @param {string} [config.tier] - Service tier (discover, build, scale, enterprise)
   * @param {Array<string>} [config.addons] - Enabled QuickNode addons
   * @param {Object} [config.rateLimits] - Rate limiting configuration
   * @param {Object} [config.circuitBreaker] - Circuit breaker settings
   * @param {Object} [config.monitoring] - Monitoring configuration
   * @param {Object} [config.security] - Security settings
   * @param {Object} [config.opts] - Additional provider options
   */
  constructor({
    rpcUrl,
    chainId,
    endpointId,
    apiKey,
    auth,
    tier = 'build',
    addons = [],
    rateLimits = {},
    circuitBreaker = {},
    monitoring = {},
    security = {},
    ...opts
  }) {
    // Enhanced URL validation with QuickNode-specific checks
    QuickNodeBroadcastProvider._validateConfiguration({ 
      rpcUrl, 
      chainId, 
      endpointId, 
      apiKey, 
      auth, 
      tier 
    });

    // Initialize security manager first
    const securityManager = new SecurityManager({
      enableRequestSigning: true,
      enableResponseValidation: true,
      maskSensitiveData: true,
      auditLogging: true,
      ...security
    });

    // Extract endpoint information from URL if not provided
    const endpointInfo = QuickNodeBroadcastProvider._extractEndpointInfo({ rpcUrl, endpointId });

    // Prepare enhanced configuration
    const enhancedConfig = {
      rpcUrl,
      chainId,
      auth: QuickNodeBroadcastProvider._prepareAuth({ apiKey, auth, endpointInfo }),
      securityProfile: 'PRODUCTION',
      maxRetries: 3,
      retryDelayMs: 1000,
      timeoutMs: 30000,
      ...opts
    };

    super(enhancedConfig);

    // Set provider-specific properties
    this.providerType = 'quicknode';
    this.providerVersion = '2.0.0';
    this.securityManager = securityManager;
    this.endpointInfo = endpointInfo;
    this.tier = tier;
    this.enabledAddons = addons;
    
    // Initialize advanced components
    this._initializeMetrics(monitoring);
    this._initializeCircuitBreaker(circuitBreaker);
    this._initializeRateLimiting(rateLimits, tier);
    this._initializeHealthMonitoring();
    this._initializeAddonSupport();

    // Cache network information
    this.networkInfo = this._getNetworkInfo(chainId);
    
    // Validate addon compatibility
    this._validateAddons();

    // Security: Mask sensitive information in logs
    this.logger.info('QuickNodeBroadcastProvider initialized successfully', {
      provider: 'quicknode',
      version: this.providerVersion,
      rpcUrl: this._maskSensitiveUrl(rpcUrl),
      chainId,
      network: this.networkInfo?.name || 'unknown',
      tier,
      endpointId: this._maskSensitiveData(endpointInfo.id),
      addons: this.enabledAddons,
      securityProfile: 'PRODUCTION',
      timestamp: new Date().toISOString()
    });

    // Start background monitoring
    this._startBackgroundMonitoring();
  }

  /**
   * Validates configuration parameters with comprehensive QuickNode-specific checks
   * @private
   * @static
   * @param {Object} config
   */
  static _validateConfiguration({ rpcUrl, chainId, endpointId, apiKey, auth, tier }) {
    // URL validation with QuickNode-specific patterns
    if (!rpcUrl || typeof rpcUrl !== 'string') {
      throw new RPCError('RPC URL is required and must be a string', QUICKNODE_ERROR_CODES.INVALID_URL);
    }

    if (!rpcUrl.startsWith('https://')) {
      throw new RPCError('Only HTTPS URLs are allowed for security', QUICKNODE_ERROR_CODES.INVALID_URL);
    }

    // Validate QuickNode URL patterns
    const quicknodeUrlPattern = /^https:\/\/[a-zA-Z0-9-]+\.quiknode\.pro\//;
    if (!quicknodeUrlPattern.test(rpcUrl)) {
      throw new RPCError('Invalid QuickNode RPC URL format', QUICKNODE_ERROR_CODES.INVALID_URL);
    }

    // Chain ID validation (optional for Solana)
    if (chainId !== null && (!chainId || typeof chainId !== 'number' || chainId <= 0)) {
      throw new RPCError('Valid chain ID is required for EVM networks', QUICKNODE_ERROR_CODES.INVALID_CHAIN_ID);
    }

    // Validate supported networks
    if (chainId !== null) {
      const supportedChainIds = Object.values(QUICKNODE_NETWORKS)
        .filter(n => n.chainId !== null)
        .map(n => n.chainId);
      
      if (!supportedChainIds.includes(chainId)) {
        throw new RPCError(
          `Unsupported chain ID: ${chainId}. Supported: ${supportedChainIds.join(', ')}`,
          QUICKNODE_ERROR_CODES.INVALID_CHAIN_ID
        );
      }
    }

    // Tier validation
    if (tier && !Object.keys(QUICKNODE_TIERS).map(k => k.toLowerCase()).includes(tier.toLowerCase())) {
      throw new RPCError(
        `Invalid tier: ${tier}. Supported: ${Object.keys(QUICKNODE_TIERS).join(', ').toLowerCase()}`,
        QUICKNODE_ERROR_CODES.PLAN_LIMITATION
      );
    }

    // Authentication validation (less strict than Ankr)
    if (!endpointId && !apiKey && !auth) {
      throw new RPCError(
        'Endpoint ID, API key, or auth object is required',
        QUICKNODE_ERROR_CODES.INVALID_CREDENTIALS
      );
    }

    // Endpoint ID validation
    if (endpointId && (typeof endpointId !== 'string' || endpointId.length < 10)) {
      throw new RPCError('Invalid endpoint ID format', QUICKNODE_ERROR_CODES.INVALID_ENDPOINT_ID);
    }
  }

  /**
   * Extracts endpoint information from URL or configuration
   * @private
   * @static
   * @param {Object} params
   * @returns {Object}
   */
  static _extractEndpointInfo({ rpcUrl, endpointId }) {
    const info = {
      id: endpointId,
      subdomain: null,
      region: null
    };

    try {
      const urlObj = new URL(rpcUrl);
      const hostParts = urlObj.hostname.split('.');
      
      if (hostParts.length >= 3 && hostParts[1] === 'quiknode') {
        info.subdomain = hostParts[0];
        
        // Extract endpoint ID from subdomain if not provided
        if (!info.id) {
          const subdomainParts = info.subdomain.split('-');
          if (subdomainParts.length > 2) {
            info.id = subdomainParts[subdomainParts.length - 1];
          }
        }
        
        // Extract region information
        if (info.subdomain.includes('-')) {
          const parts = info.subdomain.split('-');
          if (parts.length > 1) {
            info.region = parts[parts.length - 2];
          }
        }
      }
    } catch (error) {
      // URL parsing failed, use provided endpointId if available
    }

    return info;
  }

  /**
   * Prepares authentication configuration for QuickNode
   * @private
   * @static
   * @param {Object} params
   * @returns {Object}
   */
  static _prepareAuth({ apiKey, auth, endpointInfo }) {
    if (apiKey) {
      return {
        type: 'api_key',
        apiKey: apiKey,
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'X-API-Key': apiKey,
          'X-QuickNode-Endpoint': endpointInfo.id || 'unknown'
        }
      };
    }
    
    if (auth) {
      return {
        ...auth,
        headers: {
          ...auth.headers,
          'X-QuickNode-Endpoint': endpointInfo.id || 'unknown'
        }
      };
    }

    // URL-based authentication (no additional headers needed)
    return {
      type: 'url_based',
      endpointId: endpointInfo.id
    };
  }

  /**
   * Gets network information for the given chain ID
   * @private
   * @param {number} chainId
   * @returns {Object|null}
   */
  _getNetworkInfo(chainId) {
    return Object.values(QUICKNODE_NETWORKS).find(network => network.chainId === chainId) || null;
  }

  /**
   * Initializes metrics collection with QuickNode-specific metrics
   * @private
   * @param {Object} config
   */
  _initializeMetrics(config) {
    this.metrics = new MetricsCollector({
      provider: 'quicknode',
      labels: {
        chainId: this.chainId,
        network: this.networkInfo?.name || 'unknown',
        tier: this.tier,
        endpointId: this.endpointInfo.id || 'unknown'
      },
      customMetrics: [
        'credits_used',
        'addon_usage',
        'response_size',
        'cache_hits'
      ],
      ...config
    });
  }

  /**
   * Initializes circuit breaker with QuickNode-optimized settings
   * @private
   * @param {Object} config
   */
  _initializeCircuitBreaker(config) {
    const tierConfig = QUICKNODE_TIERS[this.tier?.toUpperCase()] || QUICKNODE_TIERS.BUILD;
    
    this.circuitBreaker = new CircuitBreaker({
      failureThreshold: tierConfig.name === 'Enterprise' ? 10 : 5,
      recoveryTime: tierConfig.name === 'Enterprise' ? 15000 : 30000,
      timeout: 30000,
      monitoringPeriod: 10000,
      ...config
    });
  }

  /**
   * Initializes rate limiting based on QuickNode tier
   * @private
   * @param {Object} config
   * @param {string} tier
   */
  _initializeRateLimiting(config, tier) {
    const tierConfig = QUICKNODE_TIERS[tier?.toUpperCase()] || QUICKNODE_TIERS.BUILD;
    
    this.rateLimiter = {
      requestsPerSecond: tierConfig.requestsPerSecond,
      burstSize: Math.ceil(tierConfig.requestsPerSecond * 2),
      concurrentRequests: tierConfig.concurrentConnections,
      monthlyQuota: tierConfig.monthlyQuota,
      creditsPerRequest: 1,
      ...config,
      _requests: [],
      _activeRequests: 0,
      _monthlyUsage: 0,
      _lastReset: new Date().getMonth()
    };
  }

  /**
   * Initializes health monitoring with QuickNode-specific checks
   * @private
   */
  _initializeHealthMonitoring() {
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
        creditsUsed: 0,
        quotaUtilization: 0
      },
      addons: {
        enabled: this.enabledAddons,
        status: {}
      }
    };
  }

  /**
   * Initializes addon support and validation
   * @private
   */
  _initializeAddonSupport() {
    this.addonSupport = {
      trace: {
        enabled: this.enabledAddons.includes('trace'),
        methods: ['debug_traceTransaction', 'debug_traceCall', 'trace_transaction']
      },
      debug: {
        enabled: this.enabledAddons.includes('debug'),
        methods: ['debug_storageRangeAt', 'debug_getBadBlocks']
      },
      archive: {
        enabled: this.enabledAddons.includes('archive'),
        methods: ['eth_getBalance', 'eth_getCode', 'eth_getStorageAt'],
        historicalBlocks: true
      },
      websocket: {
        enabled: this.enabledAddons.includes('websocket'),
        subscriptions: ['newHeads', 'logs', 'newPendingTransactions']
      }
    };
  }

  /**
   * Validates addon compatibility with network and tier
   * @private
   */
  _validateAddons() {
    const networkAddons = this.networkInfo?.addons || [];
    const tierConfig = QUICKNODE_TIERS[this.tier?.toUpperCase()] || QUICKNODE_TIERS.BUILD;
    
    for (const addon of this.enabledAddons) {
      // Check network support
      if (!networkAddons.includes(addon) && addon !== 'basic') {
        this.logger.warn('Addon not supported on this network', {
          addon,
          network: this.networkInfo?.name,
          supportedAddons: networkAddons
        });
      }
      
      // Check tier limitations
      if (tierConfig.addons !== 'all' && !tierConfig.addons.includes(addon)) {
        this.logger.warn('Addon may not be available on current tier', {
          addon,
          tier: this.tier,
          tierAddons: tierConfig.addons
        });
      }
    }
  }

  /**
   * Starts background monitoring processes
   * @private
   */
  _startBackgroundMonitoring() {
    // Health check interval
    this.healthCheckInterval = setInterval(async () => {
      try {
        await this.healthCheck();
      } catch (error) {
        this.logger.warn('Background health check failed', { error: error.message });
      }
    }, 60000); // Every minute

    // Metrics cleanup interval
    this.metricsCleanupInterval = setInterval(() => {
      this._cleanupOldMetrics();
    }, 300000); // Every 5 minutes

    // Monthly quota reset check
    this.quotaResetInterval = setInterval(() => {
      this._checkQuotaReset();
    }, 3600000); // Every hour

    // Addon status check
    this.addonCheckInterval = setInterval(async () => {
      await this._checkAddonStatus();
    }, 1800000); // Every 30 minutes
  }

  /**
   * Comprehensive health check with QuickNode-specific diagnostics
   * @returns {Promise<Object>} Health status with detailed metrics
   */
  async healthCheck() {
    const startTime = Date.now();
    const healthCheck = {
      provider: 'quicknode',
      version: this.providerVersion,
      timestamp: new Date().toISOString(),
      status: 'unknown',
      chainId: this.chainId,
      network: this.networkInfo?.name || 'unknown',
      tier: this.tier,
      endpointId: this._maskSensitiveData(this.endpointInfo.id),
      rpcUrl: this._maskSensitiveUrl(this.rpcUrl),
      checks: {}
    };

    try {
      // Basic connectivity check
      healthCheck.checks.connectivity = await this._checkConnectivity();
      
      // RPC functionality check
      healthCheck.checks.rpcFunctionality = await this._checkRPCFunctionality();
      
      // Authentication check
      healthCheck.checks.authentication = await this._checkAuthentication();
      
      // Performance check
      healthCheck.checks.performance = await this._checkPerformance();
      
      // Quota and limits check
      healthCheck.checks.quotaLimits = await this._checkQuotaLimits();
      
      // Addon availability check
      healthCheck.checks.addons = await this._checkAddonAvailability();
      
      // Circuit breaker status
      healthCheck.checks.circuitBreaker = this.circuitBreaker.getStatus();
      
      // Rate limiter status
      healthCheck.checks.rateLimiter = this._getRateLimiterStatus();

      // Determine overall status
      const allChecksPass = Object.values(healthCheck.checks).every(check => 
        check.status === 'healthy' || check.status === 'ok'
      );
      
      healthCheck.status = allChecksPass ? 'healthy' : 'degraded';
      healthCheck.responseTime = Date.now() - startTime;

      // Update internal health status
      this.healthStatus.isHealthy = allChecksPass;
      this.healthStatus.lastCheck = healthCheck.timestamp;
      this.healthStatus.consecutiveFailures = allChecksPass ? 0 : this.healthStatus.consecutiveFailures + 1;

      this.logger.info('Health check completed', {
        status: healthCheck.status,
        responseTime: healthCheck.responseTime,
        checks: Object.keys(healthCheck.checks).length
      });

      return healthCheck;

    } catch (error) {
      healthCheck.status = 'unhealthy';
      healthCheck.error = this._maskSensitiveData(error.message);
      healthCheck.responseTime = Date.now() - startTime;

      this.healthStatus.isHealthy = false;
      this.healthStatus.consecutiveFailures++;

      this.logger.error('Health check failed', {
        error: error.message,
        responseTime: healthCheck.responseTime
      });

      throw new RPCError('Health check failed', QUICKNODE_ERROR_CODES.SERVICE_UNAVAILABLE, {
        healthCheck,
        originalError: error
      });
    }
  }

  /**
   * Checks quota and rate limits status
   * @private
   * @returns {Promise<Object>}
   */
  async _checkQuotaLimits() {
    try {
      const tierConfig = QUICKNODE_TIERS[this.tier?.toUpperCase()] || QUICKNODE_TIERS.BUILD;
      const quotaUtilization = tierConfig.monthlyQuota ? 
        (this.rateLimiter._monthlyUsage / tierConfig.monthlyQuota) * 100 : 0;

      const status = quotaUtilization > 90 ? 'warning' : 
                    quotaUtilization > 99 ? 'critical' : 'healthy';

      return {
        status,
        message: `Quota utilization: ${quotaUtilization.toFixed(2)}%`,
        monthlyUsage: this.rateLimiter._monthlyUsage,
        monthlyQuota: tierConfig.monthlyQuota,
        utilizationPercentage: quotaUtilization,
        tier: this.tier,
        creditsPerSecond: this.rateLimiter.requestsPerSecond
      };
    } catch (error) {
      return {
        status: 'unknown',
        message: 'Unable to check quota limits',
        error: this._maskSensitiveData(error.message)
      };
    }
  }

  /**
   * Checks addon availability and status
   * @private
   * @returns {Promise<Object>}
   */
  async _checkAddonAvailability() {
    const addonStatus = {
      status: 'healthy',
      message: 'All addons operational',
      addons: {}
    };

    for (const [addonName, addonConfig] of Object.entries(this.addonSupport)) {
      if (addonConfig.enabled) {
        try {
          // Test addon-specific functionality
          const testResult = await this._testAddonFunctionality(addonName, addonConfig);
          addonStatus.addons[addonName] = {
            status: testResult ? 'healthy' : 'degraded',
            enabled: true,
            lastTested: new Date().toISOString()
          };
        } catch (error) {
          addonStatus.addons[addonName] = {
            status: 'unhealthy',
            enabled: true,
            error: this._maskSensitiveData(error.message),
            lastTested: new Date().toISOString()
          };
          addonStatus.status = 'degraded';
          addonStatus.message = 'Some addons experiencing issues';
        }
      } else {
        addonStatus.addons[addonName] = {
          status: 'disabled',
          enabled: false
        };
      }
    }

    return addonStatus;
  }

  /**
   * Tests specific addon functionality
   * @private
   * @param {string} addonName
   * @param {Object} addonConfig
   * @returns {Promise<boolean>}
   */
  async _testAddonFunctionality(addonName, addonConfig) {
    try {
      switch (addonName) {
        case 'trace':
          // Test trace functionality with a simple call
          if (this.networkInfo?.name === 'ethereum') {
            await this._makeRequest({
              method: 'trace_block',
              params: ['latest']
            }, { timeout: 5000 });
          }
          return true;

        case 'debug':
          // Test debug functionality
          await this._makeRequest({
            method: 'debug_getBadBlocks',
            params: []
          }, { timeout: 5000 });
          return true;

        case 'archive':
          // Test historical data access
          await this._makeRequest({
            method: 'eth_getBalance',
            params: ['0x0000000000000000000000000000000000000000', '0x1']
          }, { timeout: 5000 });
          return true;

        default:
          return true; // Unknown addon, assume healthy
      }
    } catch (error) {
      // Addon test failed
      this.logger.debug('Addon test failed', {
        addon: addonName,
        error: this._maskSensitiveData(error.message)
      });
      return false;
    }
  }

  /**
   * Checks basic connectivity to QuickNode service
   * @private
   * @returns {Promise<Object>}
   */
  async _checkConnectivity() {
    try {
      const response = await this._makeRequest({
        method: 'net_version',
        params: []
      }, { timeout: 5000 });

      return {
        status: 'healthy',
        message: 'Connectivity OK',
        networkVersion: response,
        endpointId: this._maskSensitiveData(this.endpointInfo.id)
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: 'Connectivity failed',
        error: this._maskSensitiveData(error.message)
      };
    }
  }

  /**
   * Checks RPC functionality with QuickNode-specific tests
   * @private
   * @returns {Promise<Object>}
   */
  async _checkRPCFunctionality() {
    try {
      const blockNumber = await this._makeRequest({
        method: 'eth_blockNumber',
        params: []
      }, { timeout: 10000 });

      const blockNumberInt = parseInt(blockNumber, 16);
      const isValid = blockNumberInt > 0;

      // Additional QuickNode-specific checks
      const gasPrice = await this._makeRequest({
        method: 'eth_gasPrice',
        params: []
      }, { timeout: 5000 });

      return {
        status: isValid ? 'healthy' : 'unhealthy',
        message: isValid ? 'RPC functionality OK' : 'Invalid block number received',
        blockNumber: blockNumberInt,
        blockNumberHex: blockNumber,
        gasPrice: parseInt(gasPrice, 16),
        additionalChecks: {
          gasPriceAvailable: !!gasPrice
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: 'RPC functionality check failed',
        error: this._maskSensitiveData(error.message)
      };
    }
  }

  /**
   * Checks authentication status with QuickNode
   * @private
   * @returns {Promise<Object>}
   */
  async _checkAuthentication() {
    try {
      // Make an authenticated request
      await this._makeRequest({
        method: 'eth_chainId',
        params: []
      }, { timeout: 5000 });

      return {
        status: 'healthy',
        message: 'Authentication OK',
        authType: this.auth?.type || 'url_based',
        endpointId: this._maskSensitiveData(this.endpointInfo.id)
      };
    } catch (error) {
      const isAuthError = error.message.includes('auth') || 
                         error.message.includes('unauthorized') ||
                         error.message.includes('forbidden') ||
                         error.message.includes('invalid endpoint');

      return {
        status: isAuthError ? 'unhealthy' : 'healthy',
        message: isAuthError ? 'Authentication failed' : 'Authentication OK',
        error: isAuthError ? this._maskSensitiveData(error.message) : undefined
      };
    }
  }

  /**
   * Checks performance metrics with QuickNode-specific benchmarks
   * @private
   * @returns {Promise<Object>}
   */
  async _checkPerformance() {
    const startTime = Date.now();
    
    try {
      await this._makeRequest({
        method: 'eth_chainId',
        params: []
      }, { timeout: 3000 });

      const responseTime = Date.now() - startTime;
      const tierConfig = QUICKNODE_TIERS[this.tier?.toUpperCase()] || QUICKNODE_TIERS.BUILD;
      const expectedThreshold = tierConfig.name === 'Enterprise' ? 500 : 1000;
      const isPerformant = responseTime < expectedThreshold;

      return {
        status: isPerformant ? 'healthy' : 'degraded',
        message: isPerformant ? 'Performance OK' : 'Performance degraded',
        responseTime,
        threshold: expectedThreshold,
        tier: this.tier,
        benchmark: 'eth_chainId'
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: 'Performance check failed',
        responseTime: Date.now() - startTime,
        error: this._maskSensitiveData(error.message)
      };
    }
  }

  /**
   * Enhanced error mapping with comprehensive QuickNode-specific error handling
   * @private
   * @param {Error} error - Original error
   * @returns {RPCError} Mapped RPC error
   */
  _mapQuickNodeError(error) {
    const message = error?.message || 'Unknown QuickNode error';
    const status = error?.status || error?.code;
    let code = QUICKNODE_ERROR_CODES.SERVICE_UNAVAILABLE;
    let category = 'general';
    let retryable = false;

    // Rate limiting errors
    if (message.includes('rate limit') || message.includes('too many requests') || status === 429) {
      code = QUICKNODE_ERROR_CODES.RATE_LIMITED;
      category = 'rate_limiting';
      retryable = true;
    }
    // Credits/quota errors
    else if (message.includes('credits') || message.includes('quota') || message.includes('limit exceeded')) {
      if (message.includes('monthly')) {
        code = QUICKNODE_ERROR_CODES.MONTHLY_LIMIT;
      } else if (message.includes('credits')) {
        code = QUICKNODE_ERROR_CODES.CREDITS_EXHAUSTED;
      } else {
        code = QUICKNODE_ERROR_CODES.QUOTA_EXCEEDED;
      }
      category = 'quota';
      retryable = false;
    }
    // Authentication errors
    else if (message.includes('unauthorized') || message.includes('auth') || status === 401) {
      code = QUICKNODE_ERROR_CODES.AUTH_FAILED;
      category = 'authentication';
      retryable = false;
    }
    // Permission/subscription errors
    else if (message.includes('forbidden') || message.includes('permission') || status === 403) {
      if (message.includes('subscription') || message.includes('plan')) {
        code = QUICKNODE_ERROR_CODES.SUBSCRIPTION_REQUIRED;
      } else {
        code = QUICKNODE_ERROR_CODES.PERMISSION_DENIED;
      }
      category = 'authorization';
      retryable = false;
    }
    // Endpoint-specific errors
    else if (message.includes('endpoint') || message.includes('not found') || status === 404) {
      if (message.includes('disabled')) {
        code = QUICKNODE_ERROR_CODES.ENDPOINT_DISABLED;
      } else {
        code = QUICKNODE_ERROR_CODES.ENDPOINT_NOT_FOUND;
      }
      category = 'endpoint';
      retryable = false;
    }
    // Addon-specific errors
    else if (message.includes('addon') || message.includes('feature not enabled')) {
      code = QUICKNODE_ERROR_CODES.ADDON_NOT_ENABLED;
      category = 'addon';
      retryable = false;
    }
    // Plan/tier limitations
    else if (message.includes('plan') || message.includes('tier') || message.includes('upgrade')) {
      code = QUICKNODE_ERROR_CODES.PLAN_LIMITATION;
      category = 'plan';
      retryable = false;
    }
    // Network errors
    else if (message.includes('network') || message.includes('connection') || message.includes('ENOTFOUND')) {
      code = QUICKNODE_ERROR_CODES.NETWORK_ERROR;
      category = 'network';
      retryable = true;
    }
    // Timeout errors
    else if (message.includes('timeout') || message.includes('ETIMEDOUT')) {
      code = QUICKNODE_ERROR_CODES.TIMEOUT;
      category = 'timeout';
      retryable = true;
    }
    // SSL/TLS errors
    else if (message.includes('ssl') || message.includes('tls') || message.includes('certificate')) {
      code = QUICKNODE_ERROR_CODES.SSL_ERROR;
      category = 'ssl';
      retryable = false;
    }
    // Service unavailable
    else if (message.includes('unavailable') || message.includes('maintenance') || status >= 500) {
      code = message.includes('maintenance') ? 
        QUICKNODE_ERROR_CODES.MAINTENANCE_MODE : 
        QUICKNODE_ERROR_CODES.SERVICE_UNAVAILABLE;
      category = 'service';
      retryable = true;
    }
    // Protocol/JSON-RPC errors
    else if (message.includes('protocol') || message.includes('json') || message.includes('rpc')) {
      code = message.includes('json') ? 
        QUICKNODE_ERROR_CODES.JSON_RPC_ERROR : 
        QUICKNODE_ERROR_CODES.PROTOCOL_ERROR;
      category = 'protocol';
      retryable = false;
    }
    // Region/geographical errors
    else if (message.includes('region') || message.includes('geographical')) {
      code = QUICKNODE_ERROR_CODES.REGION_NOT_SUPPORTED;
      category = 'region';
      retryable = false;
    }

    // Create enhanced error with additional context
    const rpcError = new RPCError(message, code, {
      originalError: error,
      provider: 'quicknode',
      category,
      timestamp: new Date().toISOString(),
      chainId: this.chainId,
      network: this.networkInfo?.name,
      tier: this.tier,
      endpointId: this.endpointInfo.id,
      requestId: error?.requestId || this._generateRequestId(),
      retryable,
      addons: this.enabledAddons
    });

    // Log error with appropriate level
    const logLevel = this._getErrorLogLevel(code);
    this.logger[logLevel]('QuickNode error mapped', {
      originalMessage: this._maskSensitiveData(message),
      mappedCode: code,
      category,
      retryable,
      tier: this.tier,
      endpointId: this._maskSensitiveData(this.endpointInfo.id)
    });

    return rpcError;
  }

  /**
   * Gets appropriate log level for error code
   * @private
   * @param {string} errorCode
   * @returns {string}
   */
  _getErrorLogLevel(errorCode) {
    const warnErrors = [
      QUICKNODE_ERROR_CODES.RATE_LIMITED,
      QUICKNODE_ERROR_CODES.TIMEOUT,
      QUICKNODE_ERROR_CODES.MAINTENANCE_MODE,
      QUICKNODE_ERROR_CODES.QUOTA_EXCEEDED
    ];
    
    const errorErrors = [
      QUICKNODE_ERROR_CODES.AUTH_FAILED,
      QUICKNODE_ERROR_CODES.PERMISSION_DENIED,
      QUICKNODE_ERROR_CODES.INVALID_CREDENTIALS,
      QUICKNODE_ERROR_CODES.ENDPOINT_NOT_FOUND,
      QUICKNODE_ERROR_CODES.ADDON_NOT_ENABLED
    ];

    const criticalErrors = [
      QUICKNODE_ERROR_CODES.CREDITS_EXHAUSTED,
      QUICKNODE_ERROR_CODES.MONTHLY_LIMIT,
      QUICKNODE_ERROR_CODES.PLAN_LIMITATION
    ];

    if (criticalErrors.includes(errorCode)) return 'error';
    if (errorErrors.includes(errorCode)) return 'error';
    if (warnErrors.includes(errorCode)) return 'warn';
    return 'info';
  }

  /**
   * Enhanced request execution with QuickNode-specific handling
   * @override
   * @param {Function} requestFn - Request function to execute
   * @returns {Promise<*>} Request result
   */
  async executeWithRetry(requestFn) {
    const requestId = this._generateRequestId();
    const startTime = Date.now();
    
    // Pre-flight checks
    await this._checkRateLimits();
    await this._checkQuotaLimits();
    await this._checkCircuitBreaker();

    try {
      this.rateLimiter._activeRequests++;
      this.healthStatus.metrics.totalRequests++;
      this._updateMonthlyUsage();

      // Execute with circuit breaker protection
      const result = await this.circuitBreaker.execute(async () => {
        try {
          return await super.executeWithRetry(requestFn);
        } catch (error) {
          throw this._mapQuickNodeError(error);
        }
      });

      // Record success metrics
      const responseTime = Date.now() - startTime;
      this._recordSuccessMetrics(responseTime, result);
      
      this.logger.debug('Request completed successfully', {
        requestId,
        responseTime,
        provider: 'quicknode',
        tier: this.tier,
        endpointId: this._maskSensitiveData(this.endpointInfo.id)
      });

      return result;

    } catch (error) {
      // Record failure metrics
      const responseTime = Date.now() - startTime;
      this._recordFailureMetrics(error, responseTime);
      
      this.logger.error('Request failed', {
        requestId,
        error: this._maskSensitiveData(error.message),
        responseTime,
        provider: 'quicknode',
        tier: this.tier,
        category: error.context?.category || 'unknown'
      });

      throw error;

    } finally {
      this.rateLimiter._activeRequests--;
      this.rateLimiter._requests.push(Date.now());
    }
  }

  /**
   * Checks rate limits with QuickNode tier-specific logic
   * @private
   * @returns {Promise<void>}
   */
  async _checkRateLimits() {
    const now = Date.now();
    
    // Clean old requests
    this.rateLimiter._requests = this.rateLimiter._requests.filter(req => now - req < 1000);
    
    // Check concurrent requests
    if (this.rateLimiter._activeRequests >= this.rateLimiter.concurrentRequests) {
      throw new RPCError(
        `Concurrent request limit exceeded (${this.rateLimiter.concurrentRequests})`,
        QUICKNODE_ERROR_CODES.CONCURRENT_LIMIT,
        { 
          limit: this.rateLimiter.concurrentRequests,
          current: this.rateLimiter._activeRequests,
          tier: this.tier
        }
      );
    }
    
    // Check rate limit
    if (this.rateLimiter._requests.length >= this.rateLimiter.requestsPerSecond) {
      const waitTime = 1000 - (now - this.rateLimiter._requests[0]);
      if (waitTime > 0) {
        this.logger.warn('Rate limit approached, waiting', { 
          waitTime,
          tier: this.tier,
          requestsPerSecond: this.rateLimiter.requestsPerSecond
        });
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }

  /**
   * Checks quota limits for current usage
   * @private
   * @returns {Promise<void>}
   */
  async _checkQuotaLimits() {
    if (!this.rateLimiter.monthlyQuota) return; // Unlimited plan

    const utilizationPercent = (this.rateLimiter._monthlyUsage / this.rateLimiter.monthlyQuota) * 100;
    
    if (utilizationPercent >= 100) {
      throw new RPCError(
        'Monthly quota exceeded',
        QUICKNODE_ERROR_CODES.MONTHLY_LIMIT,
        {
          monthlyUsage: this.rateLimiter._monthlyUsage,
          monthlyQuota: this.rateLimiter.monthlyQuota,
          tier: this.tier
        }
      );
    }
    
    if (utilizationPercent >= 95) {
      this.logger.warn('Monthly quota nearly exhausted', {
        utilizationPercent: utilizationPercent.toFixed(2),
        remaining: this.rateLimiter.monthlyQuota - this.rateLimiter._monthlyUsage,
        tier: this.tier
      });
    }
  }

  /**
   * Updates monthly usage tracking
   * @private
   */
  _updateMonthlyUsage() {
    const currentMonth = new Date().getMonth();
    
    // Reset counter if new month
    if (currentMonth !== this.rateLimiter._lastReset) {
      this.rateLimiter._monthlyUsage = 0;
      this.rateLimiter._lastReset = currentMonth;
      this.logger.info('Monthly usage counter reset', { 
        month: currentMonth,
        tier: this.tier
      });
    }
    
    this.rateLimiter._monthlyUsage += this.rateLimiter.creditsPerRequest;
    this.healthStatus.metrics.creditsUsed = this.rateLimiter._monthlyUsage;
    
    if (this.rateLimiter.monthlyQuota) {
      this.healthStatus.metrics.quotaUtilization = 
        (this.rateLimiter._monthlyUsage / this.rateLimiter.monthlyQuota) * 100;
    }
  }

  /**
   * Checks monthly quota reset
   * @private
   */
  _checkQuotaReset() {
    const currentMonth = new Date().getMonth();
    if (currentMonth !== this.rateLimiter._lastReset) {
      this._updateMonthlyUsage();
    }
  }

  /**
   * Checks addon status periodically
   * @private
   */
  async _checkAddonStatus() {
    try {
      for (const [addonName, addonConfig] of Object.entries(this.addonSupport)) {
        if (addonConfig.enabled) {
          const isWorking = await this._testAddonFunctionality(addonName, addonConfig);
          this.healthStatus.addons.status[addonName] = {
            working: isWorking,
            lastChecked: new Date().toISOString()
          };
        }
      }
    } catch (error) {
      this.logger.warn('Addon status check failed', { 
        error: this._maskSensitiveData(error.message) 
      });
    }
  }

  /**
   * Gets rate limiter status with QuickNode-specific information
   * @private
   * @returns {Object}
   */
  _getRateLimiterStatus() {
    const now = Date.now();
    const recentRequests = this.rateLimiter._requests.filter(req => now - req < 1000);
    const tierConfig = QUICKNODE_TIERS[this.tier?.toUpperCase()] || QUICKNODE_TIERS.BUILD;
    
    return {
      status: 'ok',
      activeRequests: this.rateLimiter._activeRequests,
      recentRequests: recentRequests.length,
      requestsPerSecond: this.rateLimiter.requestsPerSecond,
      concurrentLimit: this.rateLimiter.concurrentRequests,
      monthlyUsage: this.rateLimiter._monthlyUsage,
      monthlyQuota: this.rateLimiter.monthlyQuota,
      quotaUtilization: this.healthStatus.metrics.quotaUtilization,
      tier: this.tier,
      tierLimits: {
        requestsPerSecond: tierConfig.requestsPerSecond,
        concurrentConnections: tierConfig.concurrentConnections,
        monthlyQuota: tierConfig.monthlyQuota
      }
    };
  }

  /**
   * Records success metrics with QuickNode-specific data
   * @private
   * @param {number} responseTime
   * @param {*} result
   */
  _recordSuccessMetrics(responseTime, result) {
    this.healthStatus.metrics.successfulRequests++;
    this.healthStatus.metrics.averageResponseTime = 
      (this.healthStatus.metrics.averageResponseTime + responseTime) / 2;
    
    // Record response size if available
    if (result && typeof result === 'object') {
      const responseSize = JSON.stringify(result).length;
      this.metrics.recordCustomMetric('response_size', responseSize);
    }
    
    this.metrics.recordSuccess(responseTime, {
      tier: this.tier,
      endpointId: this.endpointInfo.id,
      addons: this.enabledAddons
    });
  }

  /**
   * Records failure metrics with QuickNode-specific context
   * @private
   * @param {Error} error
   * @param {number} responseTime
   */
  _recordFailureMetrics(error, responseTime) {
    this.healthStatus.metrics.failedRequests++;
    this.metrics.recordFailure(error, responseTime, {
      tier: this.tier,
      endpointId: this.endpointInfo.id,
      category: error.context?.category || 'unknown',
      retryable: error.context?.retryable || false
    });
  }

  /**
   * Generates unique request ID with QuickNode context
   * @private
   * @returns {string}
   */
  _generateRequestId() {
    const endpointPrefix = this.endpointInfo.id ? 
      this.endpointInfo.id.slice(-6) : 'unknown';
    return `qn_${endpointPrefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Cleans up old metrics data
   * @private
   */
  _cleanupOldMetrics() {
    const now = Date.now();
    const maxAge = 300000; // 5 minutes
    
    this.rateLimiter._requests = this.rateLimiter._requests.filter(req => now - req < maxAge);
    this.metrics.cleanup(maxAge);
  }

  /**
   * Masks sensitive data in URLs and messages with QuickNode-specific patterns
   * @private
   * @param {string} text
   * @returns {string}
   */
  _maskSensitiveData(text) {
    if (!text || typeof text !== 'string') return text;
    
    return text
      // QuickNode endpoint IDs and tokens
      .replace(/\/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/gi, '/***ENDPOINT_ID***')
      .replace(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/gi, '***ENDPOINT_ID***')
      // API keys and tokens
      .replace(/Bearer\s+\w{32,}/gi, 'Bearer ***TOKEN***')
      .replace(/api[_-]?key["\s:=]+[\w-]{32,}/gi, 'api_key: "***KEY***"')
      .replace(/token["\s:=]+[\w-]{32,}/gi, 'token: "***TOKEN***"')
      // Credentials
      .replace(/password["\s:=]+[\w-]+/gi, 'password: "***PASSWORD***"')
      .replace(/secret["\s:=]+[\w-]+/gi, 'secret: "***SECRET***"')
      // QuickNode specific
      .replace(/quiknode\.pro\/[a-zA-Z0-9-]+/gi, 'quiknode.pro/***ENDPOINT***');
  }

  /**
   * Masks sensitive information in URLs
   * @private
   * @param {string} url
   * @returns {string}
   */
  _maskSensitiveUrl(url) {
    if (!url) return url;
    
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname.replace(
        /\/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/gi, 
        '/***ENDPOINT_ID***'
      );
      return `${urlObj.protocol}//${urlObj.host}${pathname}`;
    } catch {
      return this._maskSensitiveData(url);
    }
  }

  /**
   * Gets comprehensive provider statistics with QuickNode-specific metrics
   * @returns {Object} Provider statistics and metrics
   */
  getStats() {
    const tierConfig = QUICKNODE_TIERS[this.tier?.toUpperCase()] || QUICKNODE_TIERS.BUILD;
    
    return {
      provider: 'quicknode',
      version: this.providerVersion,
      uptime: Date.now() - this.healthStatus.uptime,
      healthStatus: this.healthStatus,
      circuitBreaker: this.circuitBreaker.getStatus(),
      rateLimiter: this._getRateLimiterStatus(),
      metrics: this.metrics.getStats(),
      network: this.networkInfo,
      endpoint: {
        id: this._maskSensitiveData(this.endpointInfo.id),
        subdomain: this.endpointInfo.subdomain,
        region: this.endpointInfo.region
      },
      tier: {
        current: this.tier,
        limits: tierConfig
      },
      addons: {
        enabled: this.enabledAddons,
        support: this.addonSupport,
        status: this.healthStatus.addons.status
      },
      quota: {
        monthlyUsage: this.rateLimiter._monthlyUsage,
        monthlyQuota: this.rateLimiter.monthlyQuota,
        utilizationPercent: this.healthStatus.metrics.quotaUtilization,
        creditsPerRequest: this.rateLimiter.creditsPerRequest
      },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Gets detailed addon information and status
   * @returns {Object} Addon information
   */
  getAddonInfo() {
    return {
      enabled: this.enabledAddons,
      available: Object.keys(this.addonSupport),
      status: this.healthStatus.addons.status,
      networkSupport: this.networkInfo?.addons || [],
      tierSupport: QUICKNODE_TIERS[this.tier?.toUpperCase()]?.addons || [],
      details: this.addonSupport
    };
  }

  /**
   * Updates tier configuration dynamically
   * @param {string} newTier - New service tier
   * @returns {Promise<void>}
   */
  async updateTier(newTier) {
    const tierKey = newTier.toUpperCase();
    if (!QUICKNODE_TIERS[tierKey]) {
      throw new RPCError(
        `Invalid tier: ${newTier}`,
        QUICKNODE_ERROR_CODES.PLAN_LIMITATION,
        { availableTiers: Object.keys(QUICKNODE_TIERS) }
      );
    }

    const oldTier = this.tier;
    this.tier = newTier.toLowerCase();
    
    // Update rate limiting based on new tier
    this._initializeRateLimiting({}, this.tier);
    
    // Re-validate addons
    this._validateAddons();
    
    this.logger.info('Tier updated successfully', {
      oldTier,
      newTier: this.tier,
      newLimits: QUICKNODE_TIERS[tierKey]
    });
  }

  /**
   * Graceful shutdown with QuickNode-specific cleanup
   * @returns {Promise<void>}
   */
  async shutdown() {
    this.logger.info('QuickNodeBroadcastProvider shutdown initiated');

    // Clear intervals
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    if (this.metricsCleanupInterval) {
      clearInterval(this.metricsCleanupInterval);
    }
    if (this.quotaResetInterval) {
      clearInterval(this.quotaResetInterval);
    }
    if (this.addonCheckInterval) {
      clearInterval(this.addonCheckInterval);
    }

    // Wait for active requests to complete
    const maxWait = 15000; // 15 seconds for QuickNode
    const startWait = Date.now();
    
    while (this.rateLimiter._activeRequests > 0 && Date.now() - startWait < maxWait) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Final metrics report
    const finalStats = this.getStats();
    this.logger.info('Final statistics', {
      totalRequests: finalStats.healthStatus.metrics.totalRequests,
      successRate: (finalStats.healthStatus.metrics.successfulRequests / 
                   finalStats.healthStatus.metrics.totalRequests * 100).toFixed(2),
      creditsUsed: finalStats.quota.monthlyUsage,
      uptime: finalStats.uptime
    });

    // Cleanup resources
    this.metrics.shutdown();
    this.circuitBreaker.shutdown();

    this.logger.info('QuickNodeBroadcastProvider shutdown completed');
  }
}

/**
 * Factory method to create a QuickNodeBroadcastProvider with validation
 * @param {Object} config - Configuration object
 * @param {string} config.rpcUrl - QuickNode RPC URL
 * @param {number} config.chainId - Network chain ID
 * @param {string} [config.endpointId] - QuickNode endpoint ID
 * @param {string} [config.apiKey] - QuickNode API key
 * @param {Object} [config.auth] - Authentication object
 * @param {string} [config.tier] - Service tier
 * @param {Array} [config.addons] - Enabled addons
 * @param {Object} [config.options] - Additional options
 * @returns {QuickNodeBroadcastProvider} Configured provider instance
 * @throws {RPCError} If configuration is invalid
 */
export function createQuickNodeBroadcastProvider(config) {
  if (!config || typeof config !== 'object') {
    throw new RPCError('Configuration object is required', QUICKNODE_ERROR_CODES.INVALID_URL);
  }

  try {
    return new QuickNodeBroadcastProvider(config);
  } catch (error) {
    throw new RPCError(
      `Failed to create QuickNodeBroadcastProvider: ${error.message}`,
      error.code || QUICKNODE_ERROR_CODES.SERVICE_UNAVAILABLE,
      { 
        originalError: error, 
        config: { 
          ...config, 
          auth: '***MASKED***', 
          apiKey: '***MASKED***',
          endpointId: '***MASKED***'
        } 
      }
    );
  }
}

/**
 * Creates a QuickNode provider with automatic network detection
 * @param {string} endpointUrl - Full QuickNode endpoint URL
 * @param {Object} [options] - Additional options
 * @returns {QuickNodeBroadcastProvider} Configured provider
 */
export function createQuickNodeProviderFromUrl(endpointUrl, options = {}) {
  if (!endpointUrl || typeof endpointUrl !== 'string') {
    throw new RPCError(
      'Valid QuickNode endpoint URL is required',
      QUICKNODE_ERROR_CODES.INVALID_URL
    );
  }

  // Extract network and chain information from URL
  const networkInfo = QuickNodeBroadcastProvider._detectNetworkFromUrl(endpointUrl);
  
  return createQuickNodeBroadcastProvider({
    rpcUrl: endpointUrl,
    chainId: networkInfo.chainId,
    ...options
  });
}

/**
 * Creates a QuickNode provider for a specific network and tier
 * @param {string} network - Network name (ethereum, polygon, etc.)
 * @param {string} endpointId - QuickNode endpoint ID
 * @param {string} [tier] - Service tier
 * @param {Array} [addons] - Enabled addons
 * @param {Object} [options] - Additional options
 * @returns {QuickNodeBroadcastProvider} Configured provider
 */
export function createQuickNodeProviderForNetwork(network, endpointId, tier = 'build', addons = [], options = {}) {
  const networkConfig = Object.values(QUICKNODE_NETWORKS).find(n => 
    n.name === network || n.name === network.toLowerCase()
  );
  
  if (!networkConfig) {
    throw new RPCError(
      `Unsupported network: ${network}`,
      QUICKNODE_ERROR_CODES.INVALID_CHAIN_ID,
      { 
        supportedNetworks: Object.values(QUICKNODE_NETWORKS).map(n => n.name)
      }
    );
  }

  const rpcUrl = `https://${networkConfig.subdomain}.quiknode.pro/${endpointId}/`;
  
  return createQuickNodeBroadcastProvider({
    rpcUrl,
    chainId: networkConfig.chainId,
    endpointId,
    tier,
    addons,
    ...options
  });
}

/**
 * Utility function to validate QuickNode endpoint ID format
 * @param {string} endpointId - Endpoint ID to validate
 * @returns {boolean} True if valid format
 */
export function isValidQuickNodeEndpointId(endpointId) {
  if (!endpointId || typeof endpointId !== 'string') return false;
  
  // QuickNode endpoint IDs are typically UUIDs
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidPattern.test(endpointId);
}

/**
 * Gets available QuickNode networks with their configurations
 * @returns {Array<Object>} Array of supported networks
 */
export function getQuickNodeNetworks() {
  return Object.values(QUICKNODE_NETWORKS).map(network => ({
    chainId: network.chainId,
    name: network.name,
    subdomain: network.subdomain,
    testnet: network.testnet,
    addons: network.addons
  }));
}

/**
 * Gets QuickNode service tiers and their limitations
 * @returns {Object} Service tiers configuration
 */
export function getQuickNodeTiers() {
  return Object.entries(QUICKNODE_TIERS).reduce((acc, [key, value]) => {
    acc[key.toLowerCase()] = {
      name: value.name,
      requestsPerSecond: value.requestsPerSecond,
      monthlyQuota: value.monthlyQuota,
      concurrentConnections: value.concurrentConnections,
      addons: value.addons
    };
    return acc;
  }, {});
}

/**
 * Utility function to check if a URL is a valid QuickNode RPC URL
 * @param {string} url - URL to validate
 * @returns {boolean} True if valid QuickNode URL
 */
export function isQuickNodeRpcUrl(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.endsWith('.quiknode.pro') && 
           urlObj.protocol === 'https:' &&
           Object.values(QUICKNODE_NETWORKS).some(network => 
             urlObj.hostname.startsWith(network.subdomain)
           );
  } catch {
    return false;
  }
}

/**
 * Detects network information from QuickNode URL
 * @param {string} url - QuickNode URL
 * @returns {Object} Network information
 * @private
 */
QuickNodeBroadcastProvider._detectNetworkFromUrl = function(url) {
  try {
    const urlObj = new URL(url);
    const subdomain = urlObj.hostname.split('.')[0];
    
    const network = Object.values(QUICKNODE_NETWORKS).find(n => 
      n.subdomain === subdomain
    );
    
    if (!network) {
      throw new RPCError(
        `Unknown QuickNode network subdomain: ${subdomain}`,
        QUICKNODE_ERROR_CODES.INVALID_URL
      );
    }
    
    return network;
  } catch (error) {
    if (error instanceof RPCError) throw error;
    throw new RPCError(
      'Invalid QuickNode URL format',
      QUICKNODE_ERROR_CODES.INVALID_URL,
      { originalError: error }
    );
  }
};

/**
 * Advanced configuration builder for complex QuickNode setups
 * @class QuickNodeProviderConfigBuilder
 */
export class QuickNodeProviderConfigBuilder {
  constructor() {
    this.config = {
      rateLimits: {},
      circuitBreaker: {},
      monitoring: {},
      security: {},
      addons: []
    };
  }

  /**
   * Sets basic connection parameters
   * @param {string} rpcUrl - RPC URL
   * @param {number} chainId - Chain ID
   * @param {string} [endpointId] - Endpoint ID
   * @returns {QuickNodeProviderConfigBuilder}
   */
  connection(rpcUrl, chainId, endpointId) {
    this.config.rpcUrl = rpcUrl;
    this.config.chainId = chainId;
    if (endpointId) this.config.endpointId = endpointId;
    return this;
  }

  /**
   * Sets authentication parameters
   * @param {string} [apiKey] - API key
   * @param {Object} [auth] - Auth object
   * @returns {QuickNodeProviderConfigBuilder}
   */
  authentication(apiKey, auth) {
    if (apiKey) this.config.apiKey = apiKey;
    if (auth) this.config.auth = auth;
    return this;
  }

  /**
   * Sets service tier
   * @param {string} tier - Service tier
   * @returns {QuickNodeProviderConfigBuilder}
   */
  tier(tier) {
    this.config.tier = tier;
    return this;
  }

  /**
   * Configures enabled addons
   * @param {Array<string>} addons - List of addons to enable
   * @returns {QuickNodeProviderConfigBuilder}
   */
  addons(addons) {
    this.config.addons = Array.isArray(addons) ? addons : [addons];
    return this;
  }

  /**
   * Configures rate limiting
   * @param {Object} limits - Rate limiting configuration
   * @returns {QuickNodeProviderConfigBuilder}
   */
  rateLimiting(limits) {
    this.config.rateLimits = { ...this.config.rateLimits, ...limits };
    return this;
  }

  /**
   * Configures circuit breaker
   * @param {Object} settings - Circuit breaker settings
   * @returns {QuickNodeProviderConfigBuilder}
   */
  circuitBreaker(settings) {
    this.config.circuitBreaker = { ...this.config.circuitBreaker, ...settings };
    return this;
  }

  /**
   * Configures monitoring
   * @param {Object} settings - Monitoring configuration
   * @returns {QuickNodeProviderConfigBuilder}
   */
  monitoring(settings) {
    this.config.monitoring = { ...this.config.monitoring, ...settings };
    return this;
  }

  /**
   * Configures security settings
   * @param {Object} settings - Security configuration
   * @returns {QuickNodeProviderConfigBuilder}
   */
  security(settings) {
    this.config.security = { ...this.config.security, ...settings };
    return this;
  }

  /**
   * Sets retry configuration
   * @param {number} maxRetries - Maximum retry attempts
   * @param {number} retryDelayMs - Delay between retries
   * @returns {QuickNodeProviderConfigBuilder}
   */
  retries(maxRetries, retryDelayMs) {
    this.config.maxRetries = maxRetries;
    this.config.retryDelayMs = retryDelayMs;
    return this;
  }

  /**
   * Sets timeout configuration
   * @param {number} timeoutMs - Request timeout in milliseconds
   * @returns {QuickNodeProviderConfigBuilder}
   */
  timeout(timeoutMs) {
    this.config.timeoutMs = timeoutMs;
    return this;
  }

  /**
   * Builds and validates the configuration
   * @returns {Object} Complete configuration object
   */
  build() {
    // Validate required fields
    if (!this.config.rpcUrl || !this.config.chainId) {
      throw new RPCError(
        'RPC URL and chain ID are required',
        QUICKNODE_ERROR_CODES.INVALID_URL
      );
    }

    return { ...this.config };
  }

  /**
   * Builds and creates the provider instance
   * @returns {QuickNodeBroadcastProvider} Configured provider
   */
  create() {
    return createQuickNodeBroadcastProvider(this.build());
  }
}

/**
 * QuickNode-specific utility functions
 */
export const QuickNodeUtils = {
  /**
   * Estimates monthly quota usage based on request patterns
   * @param {number} requestsPerDay - Average requests per day
   * @param {number} daysInMonth - Days in month (default 30)
   * @returns {number} Estimated monthly requests
   */
  estimateMonthlyUsage(requestsPerDay, daysInMonth = 30) {
    return requestsPerDay * daysInMonth;
  },

  /**
   * Recommends appropriate tier based on usage patterns
   * @param {number} requestsPerSecond - Peak requests per second
   * @param {number} monthlyRequests - Monthly request volume
   * @param {Array} requiredAddons - Required addons
   * @returns {string} Recommended tier
   */
  recommendTier(requestsPerSecond, monthlyRequests, requiredAddons = []) {
    const tiers = Object.entries(QUICKNODE_TIERS);
    
    for (const [tierName, tierConfig] of tiers) {
      const supportsRps = requestsPerSecond <= tierConfig.requestsPerSecond;
      const supportsMonthly = !tierConfig.monthlyQuota || monthlyRequests <= tierConfig.monthlyQuota;
      const supportsAddons = tierConfig.addons === 'all' || 
        requiredAddons.every(addon => tierConfig.addons.includes(addon));
      
      if (supportsRps && supportsMonthly && supportsAddons) {
        return tierName.toLowerCase();
      }
    }
    
    return 'enterprise'; // Fallback to highest tier
  },

  /**
   * Calculates cost estimate based on tier and usage
   * @param {string} tier - Service tier
   * @param {number} monthlyRequests - Monthly request volume
   * @returns {Object} Cost breakdown (placeholder - actual pricing from QuickNode)
   */
  estimateCost(tier, monthlyRequests) {
    // Note: These are placeholder values - actual pricing should come from QuickNode
    const pricing = {
      discover: { base: 0, perRequest: 0 },
      build: { base: 9, perRequest: 0 },
      scale: { base: 49, perRequest: 0 },
      enterprise: { base: 399, perRequest: 0 }
    };
    
    const tierPricing = pricing[tier?.toLowerCase()] || pricing.build;
    const tierConfig = QUICKNODE_TIERS[tier?.toUpperCase()] || QUICKNODE_TIERS.BUILD;
    
    let totalCost = tierPricing.base;
    
    // Add overage costs if applicable
    if (tierConfig.monthlyQuota && monthlyRequests > tierConfig.monthlyQuota) {
      const overage = monthlyRequests - tierConfig.monthlyQuota;
      totalCost += overage * tierPricing.perRequest;
    }
    
    return {
      baseCost: tierPricing.base,
      overageCost: totalCost - tierPricing.base,
      totalCost,
      currency: 'USD',
      note: 'Estimates only - check QuickNode pricing for accurate costs'
    };
  },

  /**
   * Validates addon compatibility with network and tier
   * @param {Array} addons - Requested addons
   * @param {string} network - Network name
   * @param {string} tier - Service tier
   * @returns {Object} Validation result
   */
  validateAddonCompatibility(addons, network, tier) {
    const networkConfig = Object.values(QUICKNODE_NETWORKS).find(n => n.name === network);
    const tierConfig = QUICKNODE_TIERS[tier?.toUpperCase()];
    
    if (!networkConfig || !tierConfig) {
      return {
        valid: false,
        errors: ['Invalid network or tier specified']
      };
    }
    
    const errors = [];
    const warnings = [];
    const supported = [];
    
    for (const addon of addons) {
      if (!networkConfig.addons.includes(addon)) {
        errors.push(`Addon '${addon}' not supported on ${network}`);
      } else if (tierConfig.addons !== 'all' && !tierConfig.addons.includes(addon)) {
        warnings.push(`Addon '${addon}' may not be available on ${tier} tier`);
      } else {
        supported.push(addon);
      }
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings,
      supported,
      networkAddons: networkConfig.addons,
      tierAddons: tierConfig.addons
    };
  }
};

/**
 * Default export for convenient usage
 */
export default QuickNodeBroadcastProvider;

/**
 * Type definitions for TypeScript users (JSDoc format)
 * @typedef {Object} QuickNodeConfig
 * @property {string} rpcUrl - QuickNode RPC URL
 * @property {number} chainId - Network chain ID
 * @property {string} [endpointId] - QuickNode endpoint ID
 * @property {string} [apiKey] - QuickNode API key
 * @property {Object} [auth] - Authentication configuration
 * @property {string} [tier] - Service tier (discover, build, scale, enterprise)
 * @property {Array<string>} [addons] - Enabled addons
 * @property {Object} [rateLimits] - Rate limiting settings
 * @property {Object} [circuitBreaker] - Circuit breaker configuration
 * @property {Object} [monitoring] - Monitoring settings
 * @property {Object} [security] - Security configuration
 * @property {number} [maxRetries] - Maximum retry attempts
 * @property {number} [retryDelayMs] - Retry delay in milliseconds
 * @property {number} [timeoutMs] - Request timeout in milliseconds
 */

/**
 * @typedef {Object} QuickNodeHealthCheck
 * @property {string} provider - Provider name
 * @property {string} version - Provider version
 * @property {string} timestamp - Check timestamp
 * @property {string} status - Overall health status
 * @property {number} chainId - Network chain ID
 * @property {string} network - Network name
 * @property {string} tier - Service tier
 * @property {string} endpointId - Masked endpoint ID
 * @property {string} rpcUrl - Masked RPC URL
 * @property {Object} checks - Individual check results
 * @property {number} [responseTime] - Total response time
 * @property {string} [error] - Error message if unhealthy
 */

/**
 * @typedef {Object} QuickNodeStats
 * @property {string} provider - Provider name
 * @property {string} version - Provider version
 * @property {number} uptime - Uptime in milliseconds
 * @property {Object} healthStatus - Current health status
 * @property {Object} circuitBreaker - Circuit breaker status
 * @property {Object} rateLimiter - Rate limiter status
 * @property {Object} metrics - Performance metrics
 * @property {Object} network - Network information
 * @property {Object} endpoint - Endpoint information
 * @property {Object} tier - Tier information and limits
 * @property {Object} addons - Addon status and configuration
 * @property {Object} quota - Quota usage and limits
 * @property {string} timestamp - Current timestamp
 */

/**
 * Example usage and best practices
 * 
 * @example
 * // Basic usage with endpoint URL
 * const provider = createQuickNodeProviderFromUrl(
 *   'https://eth-mainnet.quiknode.pro/your-endpoint-id/'
 * );
 * 
 * @example
 * // Advanced configuration with builder pattern
 * const provider = new QuickNodeProviderConfigBuilder()
 *   .connection('https://eth-mainnet.quiknode.pro/endpoint/', 1, 'endpoint-id')
 *   .tier('scale')
 *   .addons(['trace', 'debug', 'archive'])
 *   .rateLimiting({ requestsPerSecond: 50, burstSize: 100 })
 *   .circuitBreaker({ failureThreshold: 5, recoveryTime: 30000 })
 *   .monitoring({ enableDetailedMetrics: true })
 *   .security({ enableRequestSigning: true })
 *   .retries(5, 2000)
 *   .timeout(45000)
 *   .create();
 * 
 * @example
 * // Network-specific provider creation
 * const polygonProvider = createQuickNodeProviderForNetwork(
 *   'polygon', 
 *   'your-endpoint-id', 
 *   'build', 
 *   ['trace', 'debug']
 * );
 * 
 * @example
 * // Health monitoring with addon status
 * const health = await provider.healthCheck();
 * console.log('Provider status:', health.status);
 * console.log('Addon status:', health.checks.addons);
 * 
 * @example
 * // Quota monitoring
 * const stats = provider.getStats();
 * console.log('Quota utilization:', stats.quota.utilizationPercent + '%');
 * console.log('Monthly usage:', stats.quota.monthlyUsage);
 * 
 * @example
 * // Addon information
 * const addonInfo = provider.getAddonInfo();
 * console.log('Enabled addons:', addonInfo.enabled);
 * console.log('Addon status:', addonInfo.status);
 * 
 * @example
 * // Tier management
 * await provider.updateTier('enterprise');
 * 
 * @example
 * // Utility functions
 * const isValid = isValidQuickNodeEndpointId('12345678-1234-1234-1234-123456789012');
 * const networks = getQuickNodeNetworks();
 * const tiers = getQuickNodeTiers();
 * 
 * @example
 * // Cost estimation and tier recommendation
 * const recommendedTier = QuickNodeUtils.recommendTier(25, 1000000, ['trace']);
 * const costEstimate = QuickNodeUtils.estimateCost('build', 500000);
 * 
 * @example
 * // Addon compatibility validation
 * const validation = QuickNodeUtils.validateAddonCompatibility(
 *   ['trace', 'debug'], 
 *   'ethereum', 
 *   'build'
 * );
 * 
 * @example
 * // Graceful shutdown
 * process.on('SIGTERM', async () => {
 *   await provider.shutdown();
 *   process.exit(0);
 * });
 */
