/*  ChainManager.js – v2.2.0  (MIT)
 *  Production-grade blockchain chain management for Trust Crypto Wallet
 *  — Handles chain switching, provider management, and network configurations
 *  — Supports Ethereum, Polygon, BSC, Arbitrum, Optimism, Avalanche
 *  — Dynamic provider switching with fallback mechanisms
 *  — Network health monitoring and automatic failover
 *  — Author: Trust Crypto Wallet Team
 */

import { ethers } from 'ethers';
import { chainRegistry } from './configs/chainRegistry.js';
import { mainnetConfig } from './configs/mainnet.js';
import { testnetConfig } from './configs/testnet.js';

// Import providers
import { ethereumProvider } from './providers/ethereum.js';
import { polygonProvider } from './providers/polygon.js';
import { bscProvider } from './providers/bsc.js';
import { avalancheProvider } from './providers/avalanche.js';
import { arbitrumProvider } from './providers/arbitrum.js';
import { optimismProvider } from './providers/optimism.js';

export default class ChainManager {
  /*------------------------------------------------------------------*/
  /* CONSTRUCTOR / CONFIG                                             */
  /*------------------------------------------------------------------*/
  constructor (opts = {}) {
    this.initialized = false;

    this.config = {
      enableLogging:       opts.enableLogging            ?? false,
      autoFailover:        opts.autoFailover             ?? true,
      healthCheckInterval: opts.healthCheckInterval      ?? 30_000, // 30 seconds
      maxRetries:          opts.maxRetries               ?? 3,
      retryDelay:          opts.retryDelay               ?? 5_000,
      connectionTimeout:   opts.connectionTimeout        ?? 10_000,
      enableMetrics:       opts.enableMetrics            ?? true,
      defaultNetwork:      opts.defaultNetwork           ?? 'ethereum',
      environment:         opts.environment              ?? 'mainnet', // mainnet | testnet
      ...opts
    };

    /* ---------- State ---------- */
    this.currentChain         = null;
    this.providers            = new Map();  // chainId -> provider
    this.providerHealth       = new Map();  // chainId -> health status
    this.chainConfigs         = new Map();  // chainId -> config
    this.connectionMetrics    = new Map();  // chainId -> metrics
    this.healthCheckIntervals = new Map();  // chainId -> intervalId
    this.auditLog             = [];         // chain switching audit
    this.listeners            = new Map();  // event -> [callbacks]

    /* ---------- Provider factory ---------- */
    this.providerFactory = {
      ethereum: ethereumProvider,
      polygon: polygonProvider,
      bsc: bscProvider,
      avalanche: avalancheProvider,
      arbitrum: arbitrumProvider,
      optimism: optimismProvider
    };

    /* ---------- Events ---------- */
    this.EVENTS = {
      CHAIN_SWITCHED: 'chain_switched',
      CHAIN_ERROR: 'chain_error',
      PROVIDER_FAILED: 'provider_failed',
      HEALTH_CHECK_FAILED: 'health_check_failed',
      CONNECTION_RESTORED: 'connection_restored'
    };

    this.CHAIN_STATUS = {
      CONNECTED: 'connected',
      CONNECTING: 'connecting',
      DISCONNECTED: 'disconnected',
      ERROR: 'error',
      MAINTENANCE: 'maintenance'
    };
  }

  /*------------------------------------------------------------------*/
  /* INITIALISATION                                                   */
  /*------------------------------------------------------------------*/
  async initialize () {
    try {
      // Load chain configurations
      await this.#loadChainConfigurations();
      
      // Initialize providers for all supported chains
      await this.#initializeProviders();
      
      // Set default chain
      await this.switchChain(this.config.defaultNetwork);
      
      // Start health monitoring
      if (this.config.autoFailover) {
        this.#startHealthMonitoring();
      }
      
      this.initialized = true;
      this.#log('ChainManager v2.2.0 ready');
      this.#audit('INIT_SUCCESS', { 
        environment: this.config.environment,
        defaultChain: this.config.defaultNetwork,
        supportedChains: Array.from(this.chainConfigs.keys())
      });
      
      return true;
    } catch (error) {
      this.#logErr('ChainManager initialization failed', error);
      this.#audit('INIT_FAILED', { error: error.message });
      throw new Error(`ChainManager initialization failed: ${error.message}`);
    }
  }

  /*------------------------------------------------------------------*/
  /* PUBLIC API – CHAIN SWITCHING                                     */
  /*------------------------------------------------------------------*/
  async switchChain (chainIdentifier) {
    this.#preFlight();

    const previousChain = this.currentChain;
    let targetChain;

    try {
      // Resolve chain identifier (name or chainId)
      targetChain = await this.#resolveChain(chainIdentifier);
      
      if (!targetChain) {
        throw new Error(`Unsupported chain: ${chainIdentifier}`);
      }

      // Check if already on this chain
      if (this.currentChain && this.currentChain.chainId === targetChain.chainId) {
        this.#log(`Already connected to ${targetChain.name}`);
        return { success: true, chain: targetChain, switched: false };
      }

      this.#log(`Switching to ${targetChain.name} (${targetChain.chainId})`);
      
      // Update chain status
      this.#updateChainStatus(targetChain.chainId, this.CHAIN_STATUS.CONNECTING);

      // Get provider for target chain
      const provider = await this.#getProvider(targetChain.chainId);
      
      // Test connection
      await this.#testConnection(provider, targetChain);
      
      // Update current chain
      this.currentChain = targetChain;
      this.#updateChainStatus(targetChain.chainId, this.CHAIN_STATUS.CONNECTED);
      
      // Emit chain switched event
      this.#emit(this.EVENTS.CHAIN_SWITCHED, {
        from: previousChain,
        to: targetChain,
        timestamp: Date.now()
      });

      this.#audit('CHAIN_SWITCHED', {
        from: previousChain?.name,
        to: targetChain.name,
        chainId: targetChain.chainId
      });

      return {
        success: true,
        chain: targetChain,
        switched: true,
        provider: provider,
        timestamp: Date.now()
      };

    } catch (error) {
      if (targetChain) {
        this.#updateChainStatus(targetChain.chainId, this.CHAIN_STATUS.ERROR);
      }
      
      this.#emit(this.EVENTS.CHAIN_ERROR, {
        chain: targetChain,
        error: error.message,
        timestamp: Date.now()
      });

      this.#audit('CHAIN_SWITCH_FAILED', {
        target: chainIdentifier,
        error: error.message
      });

      throw new Error(`Chain switch failed: ${error.message}`);
    }
  }

  /*------------------------------------------------------------------*/
  /* PUBLIC API – PROVIDER ACCESS                                     */
  /*------------------------------------------------------------------*/
  async getProvider (chainIdentifier = null) {
    this.#preFlight();

    try {
      let targetChain;
      
      if (chainIdentifier) {
        targetChain = await this.#resolveChain(chainIdentifier);
      } else {
        targetChain = this.currentChain;
      }

      if (!targetChain) {
        throw new Error('No chain specified and no current chain set');
      }

      return await this.#getProvider(targetChain.chainId);

    } catch (error) {
      this.#logErr('Provider access failed', error);
      throw new Error(`Provider access failed: ${error.message}`);
    }
  }

  /*------------------------------------------------------------------*/
  /* PUBLIC API – CHAIN INFO                                          */
  /*------------------------------------------------------------------*/
  getCurrentChain () {
    return this.currentChain ? {
      ...this.currentChain,
      status: this.providerHealth.get(this.currentChain.chainId)?.status,
      lastHealthCheck: this.providerHealth.get(this.currentChain.chainId)?.lastCheck,
      metrics: this.connectionMetrics.get(this.currentChain.chainId)
    } : null;
  }

  getSupportedChains () {
    return Array.from(this.chainConfigs.values()).map(chain => ({
      chainId: chain.chainId,
      name: chain.name,
      symbol: chain.nativeCurrency.symbol,
      rpcUrls: chain.rpcUrls,
      blockExplorerUrls: chain.blockExplorerUrls,
      status: this.providerHealth.get(chain.chainId)?.status || this.CHAIN_STATUS.DISCONNECTED
    }));
  }

  getChainStatus (chainIdentifier) {
    const chain = this.#resolveChainSync(chainIdentifier);
    if (!chain) return null;

    const health = this.providerHealth.get(chain.chainId);
    const metrics = this.connectionMetrics.get(chain.chainId);

    return {
      chainId: chain.chainId,
      name: chain.name,
      status: health?.status || this.CHAIN_STATUS.DISCONNECTED,
      lastHealthCheck: health?.lastCheck,
      blockNumber: health?.blockNumber,
      latency: metrics?.averageLatency,
      errorCount: metrics?.errorCount,
      isHealthy: health?.isHealthy
    };
  }

  /*------------------------------------------------------------------*/
  /* PUBLIC API – NETWORK UTILITIES                                   */
  /*------------------------------------------------------------------*/
  async addCustomChain (chainConfig) {
    this.#preFlight();

    try {
      // Validate chain configuration
      this.#validateChainConfig(chainConfig);

      // Check if chain already exists
      if (this.chainConfigs.has(chainConfig.chainId)) {
        throw new Error(`Chain ${chainConfig.chainId} already exists`);
      }

      // Add to configurations
      this.chainConfigs.set(chainConfig.chainId, chainConfig);

      // Initialize provider
      const provider = await this.#createProvider(chainConfig);
      this.providers.set(chainConfig.chainId, provider);

      // Initialize health monitoring
      this.#initializeHealthMonitoring(chainConfig.chainId);

      this.#audit('CUSTOM_CHAIN_ADDED', {
        chainId: chainConfig.chainId,
        name: chainConfig.name
      });

      return { success: true, chainId: chainConfig.chainId };

    } catch (error) {
      this.#logErr('Add custom chain failed', error);
      throw new Error(`Add custom chain failed: ${error.message}`);
    }
  }

  async removeChain (chainIdentifier) {
    this.#preFlight();

    try {
      const chain = await this.#resolveChain(chainIdentifier);
      if (!chain) {
        throw new Error(`Chain not found: ${chainIdentifier}`);
      }

      // Cannot remove current chain
      if (this.currentChain && this.currentChain.chainId === chain.chainId) {
        throw new Error('Cannot remove currently active chain');
      }

      // Clean up
      this.#cleanupChain(chain.chainId);

      this.#audit('CHAIN_REMOVED', {
        chainId: chain.chainId,
        name: chain.name
      });

      return { success: true };

    } catch (error) {
      this.#logErr('Remove chain failed', error);
      throw new Error(`Remove chain failed: ${error.message}`);
    }
  }

  /*------------------------------------------------------------------*/
  /* PUBLIC API – EVENT HANDLING                                      */
  /*------------------------------------------------------------------*/
  on (event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  off (event, callback) {
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  /*------------------------------------------------------------------*/
  /* PUBLIC API – UTILITIES                                           */
  /*------------------------------------------------------------------*/
  getMetrics () {
    const metrics = {};
    
    for (const [chainId, chainMetrics] of this.connectionMetrics.entries()) {
      const chain = this.chainConfigs.get(chainId);
      const health = this.providerHealth.get(chainId);
      
      metrics[chain?.name || chainId] = {
        chainId,
        status: health?.status,
        isHealthy: health?.isHealthy,
        blockNumber: health?.blockNumber,
        ...chainMetrics
      };
    }

    return {
      currentChain: this.currentChain?.name,
      totalChains: this.chainConfigs.size,
      healthyChains: Array.from(this.providerHealth.values()).filter(h => h.isHealthy).length,
      chains: metrics,
      lastActivity: Math.max(
        ...this.auditLog.map(log => log.timestamp),
        0
      )
    };
  }

  async shutdown () {
    this.#log('Shutting down ChainManager...');
    
    // Clear all health check intervals
    for (const intervalId of this.healthCheckIntervals.values()) {
      clearInterval(intervalId);
    }
    this.healthCheckIntervals.clear();

    // Close all provider connections
    for (const [chainId, provider] of this.providers.entries()) {
      try {
        if (provider.destroy) {
          await provider.destroy();
        }
      } catch (error) {
        this.#logErr(`Error closing provider for chain ${chainId}`, error);
      }
    }

    this.providers.clear();
    this.currentChain = null;
    this.initialized = false;
    
    this.#log('ChainManager shutdown complete');
    this.#audit('SHUTDOWN');
  }

  /*------------------------------------------------------------------*/
  /* PRIVATE HELPERS                                                  */
  /*------------------------------------------------------------------*/
  #preFlight () {
    if (!this.initialized) {
      throw new Error('ChainManager not initialized');
    }
  }

  async #loadChainConfigurations () {
    try {
      // Load configurations based on environment
      const configs = this.config.environment === 'testnet' 
        ? testnetConfig 
        : mainnetConfig;

      // Register all supported chains
      for (const [chainName, config] of Object.entries(configs)) {
        // Merge with registry data
        const registryData = chainRegistry[chainName] || {};
        const fullConfig = { ...registryData, ...config };
        
        this.chainConfigs.set(fullConfig.chainId, fullConfig);
      }

      this.#log(`Loaded ${this.chainConfigs.size} chain configurations`);

    } catch (error) {
      throw new Error(`Failed to load chain configurations: ${error.message}`);
    }
  }

  async #initializeProviders () {
    const initPromises = [];

    for (const [chainId, chainConfig] of this.chainConfigs.entries()) {
      initPromises.push(
        this.#createProvider(chainConfig)
          .then(provider => {
            this.providers.set(chainId, provider);
            this.#initializeHealthMonitoring(chainId);
            this.#log(`Provider initialized for ${chainConfig.name}`);
          })
          .catch(error => {
            this.#logErr(`Failed to initialize provider for ${chainConfig.name}`, error);
          })
      );
    }

    await Promise.allSettled(initPromises);
  }

  async #createProvider (chainConfig) {
    try {
      // Get provider factory function
      const factoryKey = chainConfig.name.toLowerCase();
      const providerFactory = this.providerFactory[factoryKey];

      if (providerFactory) {
        // Use custom provider factory
        return await providerFactory.create(chainConfig, this.config);
      } else {
        // Create standard ethers provider
        return new ethers.JsonRpcProvider(
          chainConfig.rpcUrls[0],
          {
            chainId: chainConfig.chainId,
            name: chainConfig.name
          }
        );
      }

    } catch (error) {
      throw new Error(`Provider creation failed for ${chainConfig.name}: ${error.message}`);
    }
  }

  async #getProvider (chainId) {
    let provider = this.providers.get(chainId);
    
    if (!provider) {
      // Try to create provider on demand
      const chainConfig = this.chainConfigs.get(chainId);
      if (chainConfig) {
        provider = await this.#createProvider(chainConfig);
        this.providers.set(chainId, provider);
      } else {
        throw new Error(`No provider available for chain ${chainId}`);
      }
    }

    // Check provider health
    const health = this.providerHealth.get(chainId);
    if (health && !health.isHealthy && this.config.autoFailover) {
      // Try to restore connection
      try {
        await this.#testConnection(provider, this.chainConfigs.get(chainId));
        this.#updateProviderHealth(chainId, true);
      } catch (error) {
        this.#logErr(`Provider health check failed for chain ${chainId}`, error);
        throw new Error(`Provider unhealthy for chain ${chainId}`);
      }
    }

    return provider;
  }

  async #testConnection (provider, chainConfig) {
    const startTime = Date.now();
    
    try {
      // Test basic connectivity
      const blockNumber = await Promise.race([
        provider.getBlockNumber(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Connection timeout')), this.config.connectionTimeout)
        )
      ]);

      const latency = Date.now() - startTime;

      // Update metrics
      this.#updateConnectionMetrics(chainConfig.chainId, {
        latency,
        blockNumber,
        success: true
      });

      return { blockNumber, latency };

    } catch (error) {
      this.#updateConnectionMetrics(chainConfig.chainId, {
        latency: Date.now() - startTime,
        success: false,
        error: error.message
      });
      
      throw error;
    }
  }

  async #resolveChain (chainIdentifier) {
    // Try by chain ID first
    if (typeof chainIdentifier === 'number' || !isNaN(chainIdentifier)) {
      const chainId = Number(chainIdentifier);
      return this.chainConfigs.get(chainId);
    }

    // Try by name
    if (typeof chainIdentifier === 'string') {
      for (const [chainId, config] of this.chainConfigs.entries()) {
        if (config.name.toLowerCase() === chainIdentifier.toLowerCase() ||
            config.shortName?.toLowerCase() === chainIdentifier.toLowerCase()) {
          return config;
        }
      }
    }

    return null;
  }

  #resolveChainSync (chainIdentifier) {
    // Synchronous version of resolveChain
    if (typeof chainIdentifier === 'number' || !isNaN(chainIdentifier)) {
      const chainId = Number(chainIdentifier);
      return this.chainConfigs.get(chainId);
    }

    if (typeof chainIdentifier === 'string') {
      for (const [chainId, config] of this.chainConfigs.entries()) {
        if (config.name.toLowerCase() === chainIdentifier.toLowerCase() ||
            config.shortName?.toLowerCase() === chainIdentifier.toLowerCase()) {
          return config;
        }
      }
    }

    return null;
  }

  #validateChainConfig (config) {
    const required = ['chainId', 'name', 'rpcUrls', 'nativeCurrency'];
    
    for (const field of required) {
      if (!config[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    if (!Array.isArray(config.rpcUrls) || config.rpcUrls.length === 0) {
      throw new Error('rpcUrls must be a non-empty array');
    }

    if (typeof config.chainId !== 'number' || config.chainId <= 0) {
      throw new Error('chainId must be a positive number');
    }
  }

  #startHealthMonitoring () {
    for (const chainId of this.chainConfigs.keys()) {
      this.#initializeHealthMonitoring(chainId);
    }
  }

  #initializeHealthMonitoring (chainId) {
    // Initialize health status
    this.providerHealth.set(chainId, {
      status: this.CHAIN_STATUS.DISCONNECTED,
      isHealthy: false,
      lastCheck: 0,
      blockNumber: 0,
      consecutiveFailures: 0
    });

    // Initialize metrics
    this.connectionMetrics.set(chainId, {
      totalRequests: 0,
      successfulRequests: 0,
      errorCount: 0,
      averageLatency: 0,
      latencies: []
    });

    // Start health check interval
    const intervalId = setInterval(async () => {
      await this.#performHealthCheck(chainId);
    }, this.config.healthCheckInterval);

    this.healthCheckIntervals.set(chainId, intervalId);
  }

  async #performHealthCheck (chainId) {
    try {
      const provider = this.providers.get(chainId);
      const chainConfig = this.chainConfigs.get(chainId);
      
      if (!provider || !chainConfig) return;

      const result = await this.#testConnection(provider, chainConfig);
      
      // Update health status
      this.#updateProviderHealth(chainId, true, result.blockNumber);
      
    } catch (error) {
      this.#updateProviderHealth(chainId, false);
      
      this.#emit(this.EVENTS.HEALTH_CHECK_FAILED, {
        chainId,
        error: error.message,
        timestamp: Date.now()
      });
    }
  }

  #updateProviderHealth (chainId, isHealthy, blockNumber = null) {
    const health = this.providerHealth.get(chainId);
    if (!health) return;

    const wasHealthy = health.isHealthy;
    
    health.isHealthy = isHealthy;
    health.lastCheck = Date.now();
    health.status = isHealthy ? this.CHAIN_STATUS.CONNECTED : this.CHAIN_STATUS.ERROR;
    
    if (blockNumber !== null) {
      health.blockNumber = blockNumber;
    }

    if (isHealthy) {
      health.consecutiveFailures = 0;
      
      // Emit connection restored if was unhealthy
      if (!wasHealthy) {
        this.#emit(this.EVENTS.CONNECTION_RESTORED, {
          chainId,
          timestamp: Date.now()
        });
      }
    } else {
      health.consecutiveFailures++;
    }
  }

  #updateConnectionMetrics (chainId, result) {
    const metrics = this.connectionMetrics.get(chainId);
    if (!metrics) return;

    metrics.totalRequests++;
    
    if (result.success) {
      metrics.successfulRequests++;
      
      // Update latency tracking
      metrics.latencies.push(result.latency);
      if (metrics.latencies.length > 100) {
        metrics.latencies = metrics.latencies.slice(-100); // Keep last 100
      }
      
      metrics.averageLatency = metrics.latencies.reduce((a, b) => a + b, 0) / metrics.latencies.length;
    } else {
      metrics.errorCount++;
    }
  }

  #updateChainStatus (chainId, status) {
    const health = this.providerHealth.get(chainId);
    if (health) {
      health.status = status;
    }
  }

  #cleanupChain (chainId) {
    // Clear health monitoring
    const intervalId = this.healthCheckIntervals.get(chainId);
    if (intervalId) {
      clearInterval(intervalId);
      this.healthCheckIntervals.delete(chainId);
    }

    // Remove from maps
    this.providers.delete(chainId);
    this.providerHealth.delete(chainId);
    this.connectionMetrics.delete(chainId);
    this.chainConfigs.delete(chainId);
  }

  #emit (event, data) {
    const callbacks = this.listeners.get(event) || [];
    callbacks.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        this.#logErr(`Event callback error for ${event}`, error);
      }
    });
  }

  #log (message) {
    if (this.config.enableLogging) {
      console.log(`[ChainManager] ${new Date().toISOString()}: ${message}`);
    }
  }

  #logErr (message, error) {
    if (this.config.enableLogging) {
      console.error(`[ChainManager] ${new Date().toISOString()}: ${message}`, error);
    }
  }

  #audit (action, data = {}) {
    this.auditLog.push({
      action,
      data,
      timestamp: Date.now()
    });

    // Keep only last 1000 entries
    if (this.auditLog.length > 1000) {
      this.auditLog = this.auditLog.slice(-1000);
    }
  }
}
