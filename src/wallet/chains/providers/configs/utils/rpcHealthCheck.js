import { getChain, validateChainId, getAllChainIds, getMainnetChains, getTestnetChains } from '../providers/configs/chainRegistry.js';

// Health check status constants
export const RPC_STATUS = {
  HEALTHY: 'healthy',
  DEGRADED: 'degraded',
  UNHEALTHY: 'unhealthy',
  UNKNOWN: 'unknown'
};

// Health check thresholds
const HEALTH_THRESHOLDS = {
  RESPONSE_TIME: {
    GOOD: 500,    // ms
    ACCEPTABLE: 2000, // ms
    POOR: 5000    // ms
  },
  SUCCESS_RATE: {
    GOOD: 0.95,   // 95%
    ACCEPTABLE: 0.85, // 85%
    POOR: 0.70    // 70%
  },
  BLOCK_LAG: {
    GOOD: 2,      // blocks
    ACCEPTABLE: 10, // blocks
    POOR: 50      // blocks
  }
};

// Standard RPC methods for health checking
const HEALTH_CHECK_METHODS = {
  BASIC: ['eth_blockNumber', 'eth_gasPrice', 'net_version'],
  EXTENDED: ['eth_getBalance', 'eth_getBlockByNumber', 'eth_syncing'],
  PERFORMANCE: ['eth_call', 'eth_estimateGas']
};

// Test addresses for balance checks (zero addresses)
const TEST_ADDRESSES = {
  DEFAULT: '0x0000000000000000000000000000000000000000',
  VITALIK: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045' // Known address for testing
};

// Alert severity levels
export const ALERT_SEVERITY = {
  INFO: 'info',
  WARNING: 'warning',
  CRITICAL: 'critical',
  RECOVERY: 'recovery'
};

// Environment configuration
const isDebugMode = () => {
  if (typeof process !== 'undefined' && process.env) {
    return process.env.DEBUG_RPC === 'true';
  }
  // Browser environment check
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage.getItem('DEBUG_RPC') === 'true';
  }
  return false;
};

class RPCHealthChecker {
  constructor() {
    this.healthCache = new Map();
    this.cacheTimeout = 60000; // 1 minute
    this.checkInterval = 300000; // 5 minutes
    this.activeChecks = new Map();
    this.statistics = new Map();
    this.isMonitoring = false;
    this.alertHooks = new Map(); // For webhook/notification integrations
    this.alertHistory = []; // Track alert events
    this.debugMode = isDebugMode();
  }

  /**
   * Check health of a single RPC endpoint
   * @param {number} chainId - Chain ID
   * @param {string} rpcUrl - RPC URL to check
   * @param {Object} options - Check options
   * @returns {Promise<Object>} Health check result
   */
  async checkRPCHealth(chainId, rpcUrl, options = {}) {
    const { 
      timeout = 10000, 
      includePerformance = true,
      includeExtended = false 
    } = options;

    const startTime = Date.now();
    const healthResult = {
      chainId,
      rpcUrl,
      timestamp: startTime,
      status: RPC_STATUS.UNKNOWN,
      responseTime: null,
      blockNumber: null,
      networkId: null,
      gasPrice: null,
      isSync: null,
      errors: [],
      tests: {
        connectivity: false,
        blockNumber: false,
        gasPrice: false,
        networkId: false
      }
    };

    try {
      // Basic connectivity and method tests
      await this._runBasicChecks(rpcUrl, healthResult, timeout);
      
      // Extended checks if requested
      if (includeExtended) {
        await this._runExtendedChecks(rpcUrl, healthResult, timeout);
      }

      // Performance checks if requested
      if (includePerformance) {
        await this._runPerformanceChecks(rpcUrl, healthResult, timeout);
      }

      // Calculate overall health status
      healthResult.status = this._calculateHealthStatus(healthResult);
      healthResult.responseTime = Date.now() - startTime;

      // Debug logging for response times
      if (this.debugMode) {
        console.debug(`[RPC Health] ${rpcUrl} responded in ${healthResult.responseTime}ms (Status: ${healthResult.status})`);
      }

      // Update statistics
      this._updateStatistics(chainId, rpcUrl, healthResult);

      // Check for alert conditions
      this._checkAlertConditions(chainId, rpcUrl, healthResult);

      return healthResult;
    } catch (error) {
      healthResult.errors.push(error.message);
      healthResult.status = RPC_STATUS.UNHEALTHY;
      healthResult.responseTime = Date.now() - startTime;
      
      if (this.debugMode) {
        console.debug(`[RPC Health] ${rpcUrl} failed after ${healthResult.responseTime}ms: ${error.message}`);
      }

      // Alert on critical failures
      this._triggerAlert(chainId, rpcUrl, ALERT_SEVERITY.CRITICAL, `RPC endpoint failed: ${error.message}`);
      
      return healthResult;
    }
  }

  /**
   * Check health of all RPC endpoints for a chain
   * @param {number} chainId - Chain ID
   * @param {Object} options - Check options
   * @returns {Promise<Object>} Complete health report
   */
  async checkChainHealth(chainId, options = {}) {
    validateChainId(chainId);
    
    const chain = getChain(chainId);
    const rpcUrls = chain.rpcUrls || [];
    
    if (rpcUrls.length === 0) {
      throw new Error(`No RPC URLs configured for chain ${chainId}`);
    }

    const healthChecks = await Promise.allSettled(
      rpcUrls.map(url => this.checkRPCHealth(chainId, url, options))
    );

    const results = healthChecks.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          chainId,
          rpcUrl: rpcUrls[index],
          status: RPC_STATUS.UNHEALTHY,
          error: result.reason.message,
          timestamp: Date.now()
        };
      }
    });

    const chainHealthReport = {
      chainId,
      chainName: chain.name,
      timestamp: Date.now(),
      totalEndpoints: rpcUrls.length,
      healthyEndpoints: results.filter(r => r.status === RPC_STATUS.HEALTHY).length,
      degradedEndpoints: results.filter(r => r.status === RPC_STATUS.DEGRADED).length,
      unhealthyEndpoints: results.filter(r => r.status === RPC_STATUS.UNHEALTHY).length,
      results,
      bestEndpoint: this._findBestEndpoint(results),
      overallStatus: this._calculateOverallStatus(results)
    };

    // Check for chain-level alerts
    this._checkChainAlertConditions(chainHealthReport);

    return chainHealthReport;
  }

  /**
   * Check health of multiple chains
   * @param {Array<number>} chainIds - Array of chain IDs
   * @param {Object} options - Check options
   * @returns {Promise<Object>} Multi-chain health report
   */
  async checkMultiChainHealth(chainIds = null, options = {}) {
    const targetChains = chainIds || getAllChainIds();
    const { includeTestnets = false } = options;

    // Filter chains based on options
    const filteredChains = includeTestnets 
      ? targetChains 
      : targetChains.filter(id => getMainnetChains().includes(id));

    const healthChecks = await Promise.allSettled(
      filteredChains.map(chainId => this.checkChainHealth(chainId, options))
    );

    const results = {};
    healthChecks.forEach((result, index) => {
      const chainId = filteredChains[index];
      if (result.status === 'fulfilled') {
        results[chainId] = result.value;
      } else {
        results[chainId] = {
          chainId,
          error: result.reason.message,
          status: RPC_STATUS.UNHEALTHY,
          timestamp: Date.now()
        };
      }
    });

    const multiChainReport = {
      timestamp: Date.now(),
      totalChains: filteredChains.length,
      healthyChains: Object.values(results).filter(r => r.overallStatus === RPC_STATUS.HEALTHY).length,
      degradedChains: Object.values(results).filter(r => r.overallStatus === RPC_STATUS.DEGRADED).length,
      unhealthyChains: Object.values(results).filter(r => r.overallStatus === RPC_STATUS.UNHEALTHY).length,
      results,
      summary: this._generateSummary(results)
    };

    // Cache multi-chain results for monitoring dashboard
    this.healthCache.set('multi-chain-results', {
      ...multiChainReport,
      timestamp: Date.now()
    });

    return multiChainReport;
  }

  /**
   * Get cached health status
   * @param {number} chainId - Chain ID
   * @param {string} rpcUrl - RPC URL (optional)
   * @returns {Object|null} Cached health data
   */
  getCachedHealth(chainId, rpcUrl = null) {
    const cacheKey = rpcUrl ? `${chainId}-${rpcUrl}` : `chain-${chainId}`;
    const cached = this.healthCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached;
    }
    
    return null;
  }

  /**
   * Start continuous monitoring
   * @param {Array<number>} chainIds - Chains to monitor
   * @param {Object} options - Monitoring options
   */
  startMonitoring(chainIds = null, options = {}) {
    if (this.isMonitoring) {
      this.stopMonitoring();
    }

    const { interval = this.checkInterval, enableAlerts = true } = options;
    this.monitoringChains = chainIds || getAllChainIds();
    this.monitoringOptions = { ...options, enableAlerts };

    console.log(`[RPC Health] Starting monitoring for ${this.monitoringChains.length} chains (interval: ${interval}ms)`);
    
    // Initial check
    this._performMonitoringCheck();
    
    // Set up recurring checks
    this.monitoringInterval = setInterval(() => {
      this._performMonitoringCheck();
    }, interval);

    this.isMonitoring = true;
  }

  /**
   * Stop continuous monitoring
   */
  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    this.isMonitoring = false;
    console.log('[RPC Health] Monitoring stopped');
  }

  /**
   * Register alert webhook/notification hook
   * @param {string} name - Hook name
   * @param {Function} callback - Alert callback function
   * @param {Object} config - Hook configuration
   */
  registerAlertHook(name, callback, config = {}) {
    const { 
      severityLevels = [ALERT_SEVERITY.WARNING, ALERT_SEVERITY.CRITICAL],
      enabled = true,
      rateLimit = 300000 // 5 minutes between same alerts
    } = config;

    this.alertHooks.set(name, {
      callback,
      severityLevels,
      enabled,
      rateLimit,
      lastTriggered: new Map() // Track last trigger time per alert type
    });

    if (this.debugMode) {
      console.debug(`[RPC Health] Registered alert hook: ${name}`);
    }
  }

  /**
   * Unregister alert hook
   * @param {string} name - Hook name
   */
  unregisterAlertHook(name) {
    this.alertHooks.delete(name);
    if (this.debugMode) {
      console.debug(`[RPC Health] Unregistered alert hook: ${name}`);
    }
  }

  /**
   * Get monitoring statistics
   * @param {number} chainId - Chain ID (optional)
   * @returns {Object} Statistics
   */
  getStatistics(chainId = null) {
    if (chainId) {
      return this.statistics.get(chainId) || null;
    }
    
    const allStats = {};
    this.statistics.forEach((stats, id) => {
      allStats[id] = stats;
    });
    
    return allStats;
  }

  /**
   * Get alert history
   * @param {Object} filters - Filter options
   * @returns {Array} Alert history
   */
  getAlertHistory(filters = {}) {
    const { 
      chainId = null, 
      severity = null, 
      since = null,
      limit = 100 
    } = filters;

    let history = [...this.alertHistory];

    if (chainId) {
      history = history.filter(alert => alert.chainId === chainId);
    }

    if (severity) {
      history = history.filter(alert => alert.severity === severity);
    }

    if (since) {
      history = history.filter(alert => alert.timestamp >= since);
    }

    return history
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  /**
   * Find the best RPC endpoint for a chain
   * @param {number} chainId - Chain ID
   * @returns {Promise<Object>} Best endpoint info
   */
  async findBestEndpoint(chainId) {
    const healthReport = await this.checkChainHealth(chainId, { includePerformance: true });
    return healthReport.bestEndpoint;
  }

  /**
   * Enable/disable debug mode
   * @param {boolean} enabled - Debug mode state
   */
  setDebugMode(enabled) {
    this.debugMode = enabled;
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem('DEBUG_RPC', enabled.toString());
    }
    console.log(`[RPC Health] Debug mode ${enabled ? 'enabled' : 'disabled'}`);
  }

  // Private methods
  async _runBasicChecks(rpcUrl, healthResult, timeout) {
    // Check block number
    try {
      const blockNumber = await this._makeRPCCall(rpcUrl, 'eth_blockNumber', [], timeout);
      healthResult.blockNumber = parseInt(blockNumber, 16);
      healthResult.tests.blockNumber = true;
    } catch (error) {
      healthResult.errors.push(`Block number check failed: ${error.message}`);
    }

    // Check gas price
    try {
      const gasPrice = await this._makeRPCCall(rpcUrl, 'eth_gasPrice', [], timeout);
      healthResult.gasPrice = parseInt(gasPrice, 16);
      healthResult.tests.gasPrice = true;
    } catch (error) {
      healthResult.errors.push(`Gas price check failed: ${error.message}`);
    }

    // Check network ID
    try {
      const netVersion = await this._makeRPCCall(rpcUrl, 'net_version', [], timeout);
      healthResult.networkId = netVersion;
      healthResult.tests.networkId = true;
    } catch (error) {
      healthResult.errors.push(`Network ID check failed: ${error.message}`);
    }

    healthResult.tests.connectivity = healthResult.tests.blockNumber || 
                                    healthResult.tests.gasPrice || 
                                    healthResult.tests.networkId;
  }

  async _runExtendedChecks(rpcUrl, healthResult, timeout) {
    // Check sync status
    try {
      const syncStatus = await this._makeRPCCall(rpcUrl, 'eth_syncing', [], timeout);
      healthResult.isSync = syncStatus === false;
      healthResult.tests.syncing = true;
    } catch (error) {
      healthResult.errors.push(`Sync status check failed: ${error.message}`);
    }

    // Check balance call
    try {
      await this._makeRPCCall(rpcUrl, 'eth_getBalance', [TEST_ADDRESSES.DEFAULT, 'latest'], timeout);
      healthResult.tests.balance = true;
    } catch (error) {
      healthResult.errors.push(`Balance check failed: ${error.message}`);
    }
  }

  async _runPerformanceChecks(rpcUrl, healthResult, timeout) {
    const performanceStart = Date.now();
    
    // Test multiple calls for performance
    const performanceTests = [
      this._makeRPCCall(rpcUrl, 'eth_blockNumber', [], timeout),
      this._makeRPCCall(rpcUrl, 'eth_gasPrice', [], timeout),
      this._makeRPCCall(rpcUrl, 'eth_getBalance', [TEST_ADDRESSES.DEFAULT, 'latest'], timeout)
    ];

    try {
      await Promise.all(performanceTests);
      healthResult.performanceScore = Date.now() - performanceStart;
      healthResult.tests.performance = true;
    } catch (error) {
      healthResult.errors.push(`Performance test failed: ${error.message}`);
    }
  }

  async _makeRPCCall(rpcUrl, method, params = [], timeout = 5000) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method,
          params,
          id: Date.now()
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(`RPC Error: ${data.error.message}`);
      }

      return data.result;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  _calculateHealthStatus(healthResult) {
    const { tests, errors, responseTime, performanceScore } = healthResult;
    
    // Count successful tests
    const successfulTests = Object.values(tests).filter(Boolean).length;
    const totalTests = Object.keys(tests).length;
    const successRate = successfulTests / totalTests;

    // Check response time
    const responseTimeGood = !responseTime || responseTime < HEALTH_THRESHOLDS.RESPONSE_TIME.GOOD;
    const responseTimeAcceptable = !responseTime || responseTime < HEALTH_THRESHOLDS.RESPONSE_TIME.ACCEPTABLE;

    // Determine status
    if (successRate >= HEALTH_THRESHOLDS.SUCCESS_RATE.GOOD && responseTimeGood && errors.length === 0) {
      return RPC_STATUS.HEALTHY;
    } else if (successRate >= HEALTH_THRESHOLDS.SUCCESS_RATE.ACCEPTABLE && responseTimeAcceptable) {
      return RPC_STATUS.DEGRADED;
    } else {
      return RPC_STATUS.UNHEALTHY;
    }
  }

  _calculateOverallStatus(results) {
    const healthyCount = results.filter(r => r.status === RPC_STATUS.HEALTHY).length;
    const degradedCount = results.filter(r => r.status === RPC_STATUS.DEGRADED).length;
    const totalCount = results.length;

    if (healthyCount > totalCount / 2) {
      return RPC_STATUS.HEALTHY;
    } else if (healthyCount + degradedCount > totalCount / 2) {
      return RPC_STATUS.DEGRADED;
    } else {
      return RPC_STATUS.UNHEALTHY;
    }
  }

  _findBestEndpoint(results) {
    const healthyEndpoints = results.filter(r => r.status === RPC_STATUS.HEALTHY);
    
    if (healthyEndpoints.length === 0) {
      const degradedEndpoints = results.filter(r => r.status === RPC_STATUS.DEGRADED);
      if (degradedEndpoints.length === 0) {
        return results[0] || null;
      }
      return degradedEndpoints.sort((a, b) => (a.responseTime || Infinity) - (b.responseTime || Infinity))[0];
    }

    return healthyEndpoints.sort((a, b) => (a.responseTime || Infinity) - (b.responseTime || Infinity))[0];
  }

  _updateStatistics(chainId, rpcUrl, healthResult) {
    const key = `${chainId}-${rpcUrl}`;
    const existing = this.statistics.get(key) || {
      totalChecks: 0,
      successfulChecks: 0,
      averageResponseTime: 0,
      lastCheck: null,
      uptime: 0,
      recentResponseTimes: [] // Track recent response times for trend analysis
    };

    existing.totalChecks++;
    if (healthResult.status === RPC_STATUS.HEALTHY) {
      existing.successfulChecks++;
    }
    
    existing.uptime = (existing.successfulChecks / existing.totalChecks) * 100;
    existing.averageResponseTime = (existing.averageResponseTime + (healthResult.responseTime || 0)) / 2;
    existing.lastCheck = healthResult.timestamp;

    // Track recent response times (last 10 checks)
    if (healthResult.responseTime) {
      existing.recentResponseTimes.push(healthResult.responseTime);
      if (existing.recentResponseTimes.length > 10) {
        existing.recentResponseTimes.shift();
      }
    }

    this.statistics.set(key, existing);
  }

  _checkAlertConditions(chainId, rpcUrl, healthResult) {
    const stats = this.statistics.get(`${chainId}-${rpcUrl}`);
    
    // Check for critical failures
    if (healthResult.status === RPC_STATUS.UNHEALTHY) {
      this._triggerAlert(
        chainId, 
        rpcUrl, 
        ALERT_SEVERITY.CRITICAL, 
        `RPC endpoint is unhealthy: ${healthResult.errors.join(', ')}`
      );
    }
    
    // Check for degraded performance
    else if (healthResult.status === RPC_STATUS.DEGRADED && stats && stats.uptime < 90) {
      this._triggerAlert(
        chainId, 
        rpcUrl, 
        ALERT_SEVERITY.WARNING, 
        `RPC endpoint showing degraded performance (uptime: ${stats.uptime.toFixed(1)}%)`
      );
    }
    
    // Check for recovery
    else if (healthResult.status === RPC_STATUS.HEALTHY && stats && stats.totalChecks > 1) {
      const previouslyUnhealthy = stats.uptime < 95; // Was previously having issues
      if (previouslyUnhealthy && stats.uptime >= 95) {
        this._triggerAlert(
          chainId, 
          rpcUrl, 
          ALERT_SEVERITY.RECOVERY, 
          `RPC endpoint has recovered (uptime: ${stats.uptime.toFixed(1)}%)`
        );
      }
    }
  }

  _checkChainAlertConditions(chainHealthReport) {
    const { chainId, chainName, overallStatus, healthyEndpoints, totalEndpoints } = chainHealthReport;
    
    // Alert if chain has no healthy endpoints
    if (healthyEndpoints === 0) {
      this._triggerAlert(
        chainId, 
        null, 
        ALERT_SEVERITY.CRITICAL, 
        `Chain ${chainName} has no healthy RPC endpoints available`
      );
    }
    
    // Alert if majority of endpoints are unhealthy
    else if (healthyEndpoints < totalEndpoints / 2) {
      this._triggerAlert(
        chainId, 
        null, 
        ALERT_SEVERITY.WARNING, 
        `Chain ${chainName} has ${healthyEndpoints}/${totalEndpoints} healthy endpoints`
      );
    }
  }

  _triggerAlert(chainId, rpcUrl, severity, message) {
    const alertKey = `${chainId}-${rpcUrl || 'chain'}-${severity}`;
    const alert = {
      chainId,
      rpcUrl,
      severity,
      message,
      timestamp: Date.now(),
      alertKey
    };

    // Add to alert history
    this.alertHistory.push(alert);
    
    // Keep only last 1000 alerts
    if (this.alertHistory.length > 1000) {
      this.alertHistory.shift();
    }

    // Trigger registered hooks
    this.alertHooks.forEach((hook, name) => {
      if (!hook.enabled || !hook.severityLevels.includes(severity)) {
        return;
      }

      // Check rate limiting
      const lastTriggered = hook.lastTriggered.get(alertKey);
      if (lastTriggered && Date.now() - lastTriggered < hook.rateLimit) {
        return;
      }

      try {
        hook.callback(alert);
        hook.lastTriggered.set(alertKey, Date.now());
        
        if (this.debugMode) {
          console.debug(`[RPC Health] Alert triggered via hook ${name}: ${message}`);
        }
      } catch (error) {
        console.error(`[RPC Health] Alert hook ${name} failed:`, error);
      }
    });

    // Console logging for debug mode
    if (this.debugMode) {
      const logMethod = severity === ALERT_SEVERITY.CRITICAL ? 'error' : 
                       severity === ALERT_SEVERITY.WARNING ? 'warn' : 'info';
      console[logMethod](`[RPC Health Alert] ${severity.toUpperCase()}: ${message}`);
    }
  }

  _generateSummary(results) {
    const totalEndpoints = Object.values(results).reduce((acc, chain) => acc + (chain.totalEndpoints || 0), 0);
    const healthyEndpoints = Object.values(results).reduce((acc, chain) => acc + (chain.healthyEndpoints || 0), 0);
    
    return {
      totalEndpoints,
      healthyEndpoints,
      healthPercentage: totalEndpoints > 0 ? (healthyEndpoints / totalEndpoints * 100).toFixed(2) : 0,
      recommendedChains: Object.values(results)
        .filter(chain => chain.overallStatus === RPC_STATUS.HEALTHY)
        .map(chain => ({ chainId: chain.chainId, name: chain.chainName }))
    };
  }

  async _performMonitoringCheck() {
    try {
      const results = await this.checkMultiChainHealth(this.monitoringChains, this.monitoringOptions);
      
      // Cache results with enhanced metadata
      this.healthCache.set('monitoring-results', {
        ...results,
        timestamp: Date.now(),
        monitoringActive: true,
        nextCheck: Date.now() + this.checkInterval
      });

      // Emit monitoring event (if event system exists)
      if (typeof window !== 'undefined' && window.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('rpc-health-update', { detail: results }));
      }

      if (this.debugMode) {
        console.debug(`[RPC Health] Monitoring check completed for ${this.monitoringChains.length} chains`);
      }
    } catch (error) {
      console.error('[RPC Health] Monitoring check failed:', error);
      
      // Alert on monitoring system failure
      this._triggerAlert(
        null, 
        null, 
        ALERT_SEVERITY.CRITICAL, 
        `Health monitoring system failure: ${error.message}`
      );
    }
  }

  clearCache() {
    this.healthCache.clear();
  }

  clearStatistics() {
    this.statistics.clear();
  }

  clearAlertHistory() {
    this.alertHistory = [];
  }
}

// Export singleton instance
export const rpcHealthChecker = new RPCHealthChecker();

// Export utility functions
export const checkChainRPCHealth = (chainId, options) => 
  rpcHealthChecker.checkChainHealth(chainId, options);

export const checkAllChainsHealth = (options) => 
  rpcHealthChecker.checkMultiChainHealth(null, options);

export const findBestRPC = (chainId) => 
  rpcHealthChecker.findBestEndpoint(chainId);

export const startRPCMonitoring = (chainIds, options) => 
  rpcHealthChecker.startMonitoring(chainIds, options);

export const stopRPCMonitoring = () => 
  rpcHealthChecker.stopMonitoring();

export const getRPCStatistics = (chainId) => 
  rpcHealthChecker.getStatistics(chainId);

// Enhanced utility functions (Version 2 additions)
export const getMonitoringResults = () => 
  rpcHealthChecker.healthCache.get('monitoring-results') || null;

export const getMultiChainResults = () => 
  rpcHealthChecker.healthCache.get('multi-chain-results') || null;

export const registerAlertWebhook = (name, callback, config) => 
  rpcHealthChecker.registerAlertHook(name, callback, config);

export const unregisterAlertWebhook = (name) => 
  rpcHealthChecker.unregisterAlertHook(name);

export const getAlertHistory = (filters) => 
  rpcHealthChecker.getAlertHistory(filters);

export const setDebugMode = (enabled) => 
  rpcHealthChecker.setDebugMode(enabled);

export default rpcHealthChecker;
