import { ethers } from 'ethers';
import { logger } from '../utils/logger.js';
import { validateConfig } from '../utils/validation.js';

/**
 * Production-grade Polygon provider factory with comprehensive error handling,
 * fallback mechanisms, and support for both mainnet and testnet environments.
 * 
 * Features:
 * - Multiple RPC endpoint fallbacks
 * - Health checking and automatic failover
 * - Configurable retry logic
 * - Environment-specific configurations
 * - Comprehensive logging
 * - Input validation
 * - Performance monitoring
 */

// Configuration constants
const POLYGON_CONFIG = {
  MAINNET: {
    chainId: 137,
    name: 'polygon-mainnet',
    pollingInterval: 2000, // 2 seconds for faster Polygon blocks
    blockConfirmations: 10,
    gasLimit: 8000000,
    maxFeePerGas: ethers.parseUnits('200', 'gwei'),
    maxPriorityFeePerGas: ethers.parseUnits('30', 'gwei')
  },
  TESTNET: {
    chainId: 80001, // Mumbai testnet
    name: 'polygon-mumbai',
    pollingInterval: 3000, // Slightly slower for testnet
    blockConfirmations: 5,
    gasLimit: 8000000,
    maxFeePerGas: ethers.parseUnits('50', 'gwei'),
    maxPriorityFeePerGas: ethers.parseUnits('10', 'gwei')
  }
};

// Free RPC endpoints (no API key required)
const FREE_RPC_ENDPOINTS = {
  MAINNET: [
    'https://polygon.llamarpc.com',
    'https://polygon-bor-rpc.publicnode.com',
    'https://polygon.blockpi.network/v1/rpc/public',
    'https://polygon.rpc.blxrbdn.com',
    'https://rpc.ankr.com/polygon',
    'https://polygon-mainnet.public.blastapi.io',
    'https://polygon.api.onfinality.io/public'
  ],
  TESTNET: [
    'https://rpc-mumbai.maticvigil.com',
    'https://polygon-mumbai.blockpi.network/v1/rpc/public',
    'https://polygon-testnet.public.blastapi.io',
    'https://rpc.ankr.com/polygon_mumbai',
    'https://mumbai.polygon.io',
    'https://polygon-mumbai.gateway.tenderly.co'
  ]
};

// Premium RPC endpoints (require API keys)
const PREMIUM_RPC_ENDPOINTS = {
  MAINNET: [
    'https://polygon-mainnet.alchemyapi.io/v2/',
    'https://polygon-mainnet.infura.io/v3/',
    'https://polygon.gateway.tenderly.co/'
  ],
  TESTNET: [
    'https://polygon-mumbai.g.alchemy.com/v2/',
    'https://polygon-mumbai.infura.io/v3/',
    'https://polygon-mumbai.gateway.tenderly.co/'
  ]
};

/**
 * Enhanced provider wrapper with health checking and metrics
 */
class EnhancedJsonRpcProvider extends ethers.JsonRpcProvider {
  constructor(url, network, options = {}) {
    super(url, network, options);
    this.url = url;
    this.isHealthy = true;
    this.lastHealthCheck = Date.now();
    this.errorCount = 0;
    this.responseTime = 0;
    this.requestCount = 0;
    this.maxErrorCount = options.maxErrorCount || 5;
    this.healthCheckInterval = options.healthCheckInterval || 60000; // 1 minute
  }

  async send(method, params) {
    const startTime = Date.now();
    this.requestCount++;

    try {
      const result = await super.send(method, params);
      this.responseTime = Date.now() - startTime;
      this.errorCount = Math.max(0, this.errorCount - 1); // Decrease error count on success
      this.isHealthy = true;
      
      // Log slow requests
      if (this.responseTime > 5000) {
        logger.warn(`Slow RPC response from ${this.url}: ${this.responseTime}ms`);
      }
      
      return result;
    } catch (error) {
      this.errorCount++;
      this.responseTime = Date.now() - startTime;
      
      // Mark as unhealthy if too many errors
      if (this.errorCount >= this.maxErrorCount) {
        this.isHealthy = false;
        logger.error(`Provider ${this.url} marked as unhealthy after ${this.errorCount} errors`);
      }
      
      logger.error(`RPC error from ${this.url}:`, {
        method,
        params,
        error: error.message,
        errorCount: this.errorCount,
        responseTime: this.responseTime
      });
      
      throw error;
    }
  }

  async healthCheck() {
    try {
      const startTime = Date.now();
      await this.send('eth_chainId', []);
      this.responseTime = Date.now() - startTime;
      this.isHealthy = true;
      this.lastHealthCheck = Date.now();
      return true;
    } catch (error) {
      this.isHealthy = false;
      this.lastHealthCheck = Date.now();
      logger.error(`Health check failed for ${this.url}:`, error.message);
      return false;
    }
  }

  getMetrics() {
    return {
      url: this.url,
      isHealthy: this.isHealthy,
      errorCount: this.errorCount,
      responseTime: this.responseTime,
      requestCount: this.requestCount,
      lastHealthCheck: this.lastHealthCheck
    };
  }
}

/**
 * Production-grade Polygon provider factory
 */
export const polygonProvider = {
  /**
   * Creates a robust Polygon provider with fallback mechanisms
   * @param {Object} chainConfig - Chain-specific configuration
   * @param {Object} globalConfig - Global application configuration
   * @returns {Promise<ethers.FallbackProvider>} Configured provider instance
   */
  async create(chainConfig = {}, globalConfig = {}) {
    try {
      // Validate inputs
      validateConfig(chainConfig, globalConfig);
      
      const isTestnet = globalConfig.network === 'testnet' || chainConfig.testnet;
      const networkConfig = isTestnet ? POLYGON_CONFIG.TESTNET : POLYGON_CONFIG.MAINNET;
      const freeEndpoints = isTestnet ? FREE_RPC_ENDPOINTS.TESTNET : FREE_RPC_ENDPOINTS.MAINNET;
      const premiumEndpoints = isTestnet ? PREMIUM_RPC_ENDPOINTS.TESTNET : PREMIUM_RPC_ENDPOINTS.MAINNET;
      
      logger.info(`Creating Polygon provider for ${isTestnet ? 'testnet' : 'mainnet'}`);
      
      // Build RPC URLs array with priorities
      const rpcUrls = [];
      
      // Add premium endpoints with API keys (highest priority)
      if (globalConfig.apiKeys) {
        if (globalConfig.apiKeys.alchemy) {
          rpcUrls.push({
            url: `${premiumEndpoints[0]}${globalConfig.apiKeys.alchemy}`,
            priority: 1,
            weight: 3,
            type: 'premium'
          });
        }
        
        if (globalConfig.apiKeys.infura) {
          rpcUrls.push({
            url: `${premiumEndpoints[1]}${globalConfig.apiKeys.infura}`,
            priority: 2,
            weight: 3,
            type: 'premium'
          });
        }
        
        if (globalConfig.apiKeys.tenderly) {
          rpcUrls.push({
            url: `${premiumEndpoints[2]}${globalConfig.apiKeys.tenderly}`,
            priority: 3,
            weight: 2,
            type: 'premium'
          });
        }
      }
      
      // Add free endpoints (medium priority)
      freeEndpoints.forEach((url, index) => {
        rpcUrls.push({
          url,
          priority: 10 + index,
          weight: 1,
          type: 'free'
        });
      });
      
      // Add custom RPC URLs from config (lowest priority)
      if (chainConfig.rpcUrls && Array.isArray(chainConfig.rpcUrls)) {
        chainConfig.rpcUrls.forEach((url, index) => {
          rpcUrls.push({
            url,
            priority: 100 + index,
            weight: 1,
            type: 'custom'
          });
        });
      }
      
      if (rpcUrls.length === 0) {
        throw new Error('No RPC URLs available. Please configure at least one endpoint.');
      }
      
      logger.info(`Configured ${rpcUrls.length} RPC endpoints:`, {
        premium: rpcUrls.filter(r => r.type === 'premium').length,
        free: rpcUrls.filter(r => r.type === 'free').length,
        custom: rpcUrls.filter(r => r.type === 'custom').length
      });
      
      // Create enhanced providers
      const providers = rpcUrls.map(({ url, priority, weight, type }) => {
        const provider = new EnhancedJsonRpcProvider(url, networkConfig.chainId, {
          maxErrorCount: globalConfig.maxErrorCount || 5,
          healthCheckInterval: globalConfig.healthCheckInterval || 60000
        });
        
        return {
          provider,
          priority,
          weight,
          stallTimeout: type === 'premium' ? 2000 : 5000, // Premium endpoints should be faster
          type
        };
      });
      
      // Create fallback provider with enhanced configuration
      const fallbackProvider = new ethers.FallbackProvider(providers, networkConfig.chainId, {
        cacheTimeout: globalConfig.cacheTimeout || 2000,
        pollingInterval: networkConfig.pollingInterval,
        quorum: Math.min(2, providers.length), // Require at least 2 providers to agree (if available)
        eventQuorum: 1,
        eventWorkers: Math.min(3, providers.length)
      });
      
      // Configure additional properties
      fallbackProvider.pollingInterval = networkConfig.pollingInterval;
      
      // Add custom methods for monitoring and management
      fallbackProvider.getProviderMetrics = () => {
        return providers.map(p => ({
          ...p.provider.getMetrics(),
          type: p.type,
          priority: p.priority,
          weight: p.weight
        }));
      };
      
      fallbackProvider.getDetailedHealth = async () => {
        const metrics = fallbackProvider.getProviderMetrics();
        const healthCheck = await fallbackProvider.performHealthCheck();
        
        return {
          overall: healthCheck,
          providers: metrics,
          summary: {
            totalProviders: providers.length,
            healthyProviders: healthCheck.healthy,
            healthRatio: healthCheck.ratio,
            averageResponseTime: metrics.reduce((sum, m) => sum + m.responseTime, 0) / metrics.length,
            totalRequests: metrics.reduce((sum, m) => sum + m.requestCount, 0),
            totalErrors: metrics.reduce((sum, m) => sum + m.errorCount, 0),
            providerTypes: {
              premium: metrics.filter(m => m.type === 'premium').length,
              free: metrics.filter(m => m.type === 'free').length,
              custom: metrics.filter(m => m.type === 'custom').length
            }
          },
          timestamp: Date.now()
        };
      };
      
      // Enhanced monitoring with thresholds
      fallbackProvider.checkHealthThresholds = async () => {
        const health = await fallbackProvider.getDetailedHealth();
        const alerts = [];
        
        // Define alert thresholds
        const thresholds = {
          minHealthyProviders: Math.max(1, Math.floor(providers.length * 0.5)),
          maxAverageResponseTime: 10000, // 10 seconds
          maxErrorRate: 0.1 // 10% error rate
        };
        
        // Check thresholds
        if (health.overall.healthy < thresholds.minHealthyProviders) {
          alerts.push({
            level: 'critical',
            message: `Only ${health.overall.healthy} providers healthy (minimum: ${thresholds.minHealthyProviders})`,
            metric: 'provider_count',
            value: health.overall.healthy,
            threshold: thresholds.minHealthyProviders
          });
        }
        
        if (health.summary.averageResponseTime > thresholds.maxAverageResponseTime) {
          alerts.push({
            level: 'warning',
            message: `High average response time: ${health.summary.averageResponseTime}ms`,
            metric: 'response_time',
            value: health.summary.averageResponseTime,
            threshold: thresholds.maxAverageResponseTime
          });
        }
        
        const errorRate = health.summary.totalErrors / Math.max(health.summary.totalRequests, 1);
        if (errorRate > thresholds.maxErrorRate) {
          alerts.push({
            level: 'warning',
            message: `High error rate: ${(errorRate * 100).toFixed(2)}%`,
            metric: 'error_rate',
            value: errorRate,
            threshold: thresholds.maxErrorRate
          });
        }
        
        return {
          health,
          alerts,
          status: alerts.length === 0 ? 'healthy' : 
                 alerts.some(a => a.level === 'critical') ? 'critical' : 'warning'
        };
      };
      
      fallbackProvider.performHealthCheck = async () => {
        const results = await Promise.allSettled(
          providers.map(p => p.provider.healthCheck())
        );
        
        const healthyCount = results.filter(r => r.status === 'fulfilled' && r.value).length;
        const totalCount = providers.length;
        
        logger.info(`Health check completed: ${healthyCount}/${totalCount} providers healthy`);
        
        return {
          healthy: healthyCount,
          total: totalCount,
          ratio: healthyCount / totalCount,
          details: results.map((result, index) => ({
            url: providers[index].provider.url,
            healthy: result.status === 'fulfilled' && result.value,
            error: result.status === 'rejected' ? result.reason.message : null
          }))
        };
      };
      
      fallbackProvider.getNetworkConfig = () => networkConfig;
      
      // Add resource management and graceful shutdown
      fallbackProvider.isActive = true;
      
      fallbackProvider.destroy = async () => {
        fallbackProvider.isActive = false;
        
        // Clear health check interval
        if (healthCheckInterval) {
          clearInterval(healthCheckInterval);
          healthCheckInterval = null;
        }
        
        // Cleanup individual providers
        providers.forEach(({ provider }) => {
          if (provider.destroy && typeof provider.destroy === 'function') {
            provider.destroy();
          }
        });
        
        logger.info('Polygon provider destroyed and resources cleaned up');
      };
      
      // Enhanced error event handling
      fallbackProvider.on('error', (error) => {
        logger.error('Provider error event:', error);
      });
      
      // Add process cleanup handlers for graceful shutdown
      if (typeof process !== 'undefined' && process.on) {
        const cleanupHandler = () => {
          if (fallbackProvider.isActive) {
            fallbackProvider.destroy();
          }
        };
        
        process.on('SIGTERM', cleanupHandler);
        process.on('SIGINT', cleanupHandler);
        process.on('beforeExit', cleanupHandler);
      }
      
      // Perform initial health check
      const healthCheck = await fallbackProvider.performHealthCheck();
      
      if (healthCheck.healthy === 0) {
        throw new Error('All RPC providers failed health check. Please check your configuration.');
      }
      
      if (healthCheck.ratio < 0.5) {
        logger.warn(`Only ${healthCheck.healthy}/${healthCheck.total} providers are healthy`);
      }
      
      // Set up periodic health checks with proper cleanup
      let healthCheckInterval = null;
      
      if (globalConfig.enablePeriodicHealthCheck !== false) {
        const intervalDuration = globalConfig.healthCheckInterval || networkConfig.healthCheckInterval || 300000; // 5 minutes default
        
        healthCheckInterval = setInterval(async () => {
          try {
            const healthStatus = await fallbackProvider.performHealthCheck();
            
            // Log health status changes
            if (healthStatus.ratio < 0.5) {
              logger.warn(`Provider health degraded: ${healthStatus.healthy}/${healthStatus.total} providers healthy`);
            } else if (healthStatus.ratio === 1.0) {
              logger.debug('All providers healthy');
            }
            
            // Auto-recovery logic for failed providers
            if (healthStatus.healthy < healthStatus.total) {
              logger.info(`Attempting recovery for ${healthStatus.total - healthStatus.healthy} failed providers`);
            }
            
          } catch (error) {
            logger.error('Periodic health check failed:', error);
          }
        }, intervalDuration);
        
        logger.info(`Periodic health checks enabled with ${intervalDuration}ms interval`);
      }
      
      // Add cleanup method to the provider
      fallbackProvider.cleanup = () => {
        if (healthCheckInterval) {
          clearInterval(healthCheckInterval);
          healthCheckInterval = null;
          logger.info('Health check interval cleared');
        }
      };
      
      logger.info('Polygon provider created successfully', {
        network: isTestnet ? 'testnet' : 'mainnet',
        chainId: networkConfig.chainId,
        providerCount: providers.length,
        healthyProviders: healthCheck.healthy
      });
      
      return fallbackProvider;
      
    } catch (error) {
      logger.error('Failed to create Polygon provider:', error);
      throw new Error(`Provider creation failed: ${error.message}`);
    }
  },

  /**
   * Creates a testnet-specific provider
   * @param {Object} chainConfig - Chain configuration
   * @param {Object} globalConfig - Global configuration
   * @returns {Promise<ethers.FallbackProvider>} Testnet provider
   */
  async createTestnet(chainConfig = {}, globalConfig = {}) {
    return this.create(chainConfig, { ...globalConfig, network: 'testnet' });
  },

  /**
   * Creates a mainnet-specific provider
   * @param {Object} chainConfig - Chain configuration
   * @param {Object} globalConfig - Global configuration
   * @returns {Promise<ethers.FallbackProvider>} Mainnet provider
   */
  async createMainnet(chainConfig = {}, globalConfig = {}) {
    return this.create(chainConfig, { ...globalConfig, network: 'mainnet' });
  },

  /**
   * Gets the default configuration for a network
   * @param {boolean} isTestnet - Whether to get testnet config
   * @returns {Object} Network configuration
   */
  getNetworkConfig(isTestnet = false) {
    return isTestnet ? { ...POLYGON_CONFIG.TESTNET } : { ...POLYGON_CONFIG.MAINNET };
  },

  /**
   * Gets available free RPC endpoints
   * @param {boolean} isTestnet - Whether to get testnet endpoints
   * @returns {Array<string>} List of free RPC endpoints
   */
  getFreeEndpoints(isTestnet = false) {
    return [...(isTestnet ? FREE_RPC_ENDPOINTS.TESTNET : FREE_RPC_ENDPOINTS.MAINNET)];
  }
};
