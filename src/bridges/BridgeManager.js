/**
 * Enhanced Trust Crypto Wallet Bridge Manager
 * Production-grade orchestrator for cross-chain transfers with enterprise features
 */

import { ethers } from 'ethers';
import { TransactionTracker } from './monitoring/TransactionTracker.js';
import { StatusUpdater } from './monitoring/StatusUpdater.js';
import { FailureHandler } from './monitoring/FailureHandler.js';

export class BridgeManager {
  constructor() {
    this.protocols = new Map();
    this.isInitialized = false;
    this.supportedChains = [1, 137, 56, 43114, 42161, 10]; // ETH, Polygon, BSC, Avalanche, Arbitrum, Optimism
    
    // Enhanced monitoring & tracking
    this.transactionTracker = new TransactionTracker();
    this.statusUpdater = new StatusUpdater();
    this.failureHandler = new FailureHandler();
    
    // Bridge context & history
    this.bridgeHistory = this._loadBridgeHistory();
    this.bridgeContext = new Map();
    
    // Configuration
    this.config = {
      maxRetries: 3,
      retryDelay: 5000, // 5 seconds
      statusPollInterval: 30000, // 30 seconds
      cacheTimeout: 300000, // 5 minutes
      supportedTokens: new Set(['ETH', 'USDC', 'USDT', 'WETH', 'DAI'])
    };

    // Initialize monitoring interval
    this._initializeStatusMonitoring();
  }

  /**
   * ✅ MODULARITY: Dynamic protocol loading with plug-and-play architecture
   */
  async initialize() {
    try {
      console.log('🌉 Initializing Enhanced Trust Crypto Wallet Bridge System...');
      
      // Dynamic protocol loading from /protocols/ directory
      const protocolModules = await this._dynamicallyLoadProtocols();
      
      for (const [name, ProtocolClass] of protocolModules) {
        try {
          const protocolInstance = new ProtocolClass({
            retryHandler: this.failureHandler,
            statusUpdater: this.statusUpdater
          });
          
          await protocolInstance.initialize();
          this.protocols.set(name, protocolInstance);
          console.log(`✅ ${name} protocol loaded and initialized`);
        } catch (error) {
          console.warn(`⚠️ Failed to load ${name} protocol:`, error.message);
          // Continue with other protocols instead of failing completely
        }
      }

      // Initialize monitoring systems
      await this.transactionTracker.initialize();
      await this.statusUpdater.initialize();
      await this.failureHandler.initialize();

      this.isInitialized = true;
      console.log(`🚀 Bridge Manager operational with ${this.protocols.size} protocols`);
      
      return { 
        success: true, 
        protocols: Array.from(this.protocols.keys()),
        loadedProtocols: this.protocols.size,
        monitoringActive: true
      };
    } catch (error) {
      console.error('❌ Bridge initialization failed:', error);
      throw new Error(`Bridge setup failed: ${error.message}`);
    }
  }

  /**
   * 🛡 VALIDATION: Enhanced parameter validation with ethers.js
   */
  async getBridgeRoute(fromChain, toChain, tokenAddress, amount, options = {}) {
    if (!this.isInitialized) {
      throw new Error('Bridge system not initialized');
    }

    try {
      // Enhanced validation with ethers
      this._validateChains(fromChain, toChain);
      this._validateTokenAddress(tokenAddress);
      this._validateAmount(amount);

      console.log(`🔍 Finding optimal route: ${fromChain} → ${toChain} for ${amount} tokens`);
      
      // Check cache first
      const cacheKey = `route_${fromChain}_${toChain}_${tokenAddress}_${amount}`;
      const cachedRoute = this._getFromCache(cacheKey);
      if (cachedRoute) {
        console.log('📋 Using cached route');
        return cachedRoute;
      }

      // Get available protocols for this route
      const availableProtocols = this._getAvailableProtocols(fromChain, toChain);
      
      if (availableProtocols.length === 0) {
        throw new Error(`No bridge protocols support ${fromChain} → ${toChain}`);
      }

      // Calculate routes and fees with enhanced error handling
      const routes = [];
      const routePromises = availableProtocols.map(async (protocolName) => {
        try {
          const protocol = this.protocols.get(protocolName);
          const route = await protocol.calculateRoute(fromChain, toChain, amount, tokenAddress);
          return {
            protocol: protocolName,
            ...route,
            reliability: await this._getProtocolReliability(protocolName),
            estimatedGas: await this._estimateGasCost(protocolName, fromChain),
            securityScore: this._getSecurityScore(protocolName)
          };
        } catch (error) {
          console.warn(`⚠️ Route calculation failed for ${protocolName}:`, error.message);
          return null;
        }
      });

      const routeResults = await Promise.allSettled(routePromises);
      
      routeResults.forEach(result => {
        if (result.status === 'fulfilled' && result.value) {
          routes.push(result.value);
        }
      });

      if (routes.length === 0) {
        throw new Error('No protocols could calculate a valid route');
      }

      // Enhanced route scoring algorithm
      const scoredRoutes = routes.map(route => ({
        ...route,
        score: this._calculateRouteScore(route)
      }));

      // Sort by best score
      const optimalRoute = scoredRoutes.sort((a, b) => b.score - a.score)[0];

      console.log(`✨ Optimal route found: ${optimalRoute.protocol} (score: ${optimalRoute.score.toFixed(2)})`);
      
      const result = {
        recommended: optimalRoute,
        alternatives: scoredRoutes.slice(1),
        totalRoutes: routes.length,
        calculatedAt: new Date().toISOString(),
        cacheKey
      };

      // Cache the result
      this._setCache(cacheKey, result);
      
      return result;

    } catch (error) {
      console.error('Route calculation failed:', error);
      throw error;
    }
  }

  /**
   * 🔁 RETRY LOGIC: Enhanced bridge execution with comprehensive retry and monitoring
   */
  async executeBridge(bridgeParams) {
    const { fromChain, toChain, tokenAddress, amount, recipientAddress, protocol = 'auto' } = bridgeParams;

    let attempt = 0;
    const maxAttempts = this.config.maxRetries + 1;

    while (attempt < maxAttempts) {
      try {
        attempt++;
        console.log(`🚀 Bridge execution attempt ${attempt}/${maxAttempts}`);

        // Enhanced validation
        await this._validateBridgeParams(bridgeParams);

        // Auto-select protocol if not specified
        let selectedProtocol = protocol;
        if (protocol === 'auto') {
          const route = await this.getBridgeRoute(fromChain, toChain, tokenAddress, amount);
          selectedProtocol = route.recommended.protocol;
        }

        // Get protocol instance
        const protocolInstance = this.protocols.get(selectedProtocol);
        if (!protocolInstance) {
          throw new Error(`Protocol ${selectedProtocol} not available`);
        }

        // Generate enhanced transaction ID with metadata
        const transactionId = this._generateTransactionId();
        const bridgeContext = {
          transactionId,
          protocol: selectedProtocol,
          fromChain,
          toChain,
          tokenAddress,
          amount,
          recipientAddress,
          timestamp: Date.now(),
          attempt,
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'server'
        };

        // Store bridge context
        this.bridgeContext.set(transactionId, bridgeContext);
        this._saveBridgeContext(transactionId, bridgeContext);

        console.log(`📋 Transaction ID: ${transactionId}`);
        console.log(`🔗 Using protocol: ${selectedProtocol}`);

        // 📊 MONITORING: Start comprehensive tracking
        await this.transactionTracker.startTracking(transactionId, bridgeContext);

        // Execute the bridge transfer with enhanced monitoring
        const result = await this._executeBridgeWithMonitoring(
          protocolInstance, 
          bridgeParams, 
          transactionId
        );

        // Success - update context and start monitoring
        const finalResult = {
          transactionId,
          protocol: selectedProtocol,
          status: 'initiated',
          attempt,
          txHash: result.txHash,
          estimatedTime: result.estimatedTime,
          trackingUrl: result.trackingUrl,
          initiatedAt: new Date().toISOString(),
          gasEstimate: result.gasEstimate
        };

        // Update bridge context with result
        bridgeContext.result = finalResult;
        this.bridgeContext.set(transactionId, bridgeContext);
        this._saveBridgeContext(transactionId, bridgeContext);

        // Add to bridge history
        this._addToBridgeHistory(finalResult);

        // Start real-time status monitoring
        this._startRealTimeMonitoring(transactionId);

        return finalResult;

      } catch (error) {
        console.error(`❌ Bridge execution attempt ${attempt} failed:`, error);

        // Handle failure with enhanced retry logic
        if (attempt < maxAttempts) {
          const retryDelay = this.config.retryDelay * Math.pow(2, attempt - 1); // Exponential backoff
          console.log(`⏳ Retrying in ${retryDelay}ms...`);
          
          await this.failureHandler.handleFailure(
            `attempt_${attempt}`, 
            error, 
            { ...bridgeParams, attempt }
          );
          
          await this._sleep(retryDelay);
          continue;
        } else {
          // Final failure - comprehensive error handling
          const transactionId = this._generateTransactionId();
          await this.failureHandler.handleFailure(transactionId, error, bridgeParams);
          
          // Store failed attempt
          this._addToBridgeHistory({
            transactionId,
            status: 'failed',
            error: error.message,
            attempts: attempt,
            failedAt: new Date().toISOString(),
            ...bridgeParams
          });

          throw new Error(`Bridge execution failed after ${attempt} attempts: ${error.message}`);
        }
      }
    }
  }

  /**
   * 📊 MONITORING: Real-time transaction status with webhook integration
   */
  async getTransactionStatus(transactionId) {
    try {
      // Get from real-time tracker first
      const trackerStatus = await this.transactionTracker.getTransactionStatus(transactionId);
      
      if (trackerStatus) {
        return {
          transactionId,
          status: trackerStatus.status,
          progress: trackerStatus.progress,
          estimatedCompletion: trackerStatus.estimatedCompletion,
          confirmations: trackerStatus.confirmations,
          lastUpdated: trackerStatus.lastUpdated,
          protocol: trackerStatus.protocol,
          bridgeContext: this.bridgeContext.get(transactionId)
        };
      }

      // Fallback to protocol-specific status check
      const context = this.bridgeContext.get(transactionId);
      if (context && context.protocol) {
        const protocol = this.protocols.get(context.protocol);
        if (protocol) {
          const protocolStatus = await protocol.getTransactionStatus(context.result?.txHash);
          return {
            transactionId,
            ...protocolStatus,
            bridgeContext: context
          };
        }
      }

      throw new Error(`Transaction ${transactionId} not found`);
    } catch (error) {
      console.error('Status check failed:', error);
      throw error;
    }
  }

  /**
   * 🪪 BRIDGE CONTEXT: Enhanced history and session management
   */
  getBridgeHistory(filters = {}) {
    const { limit = 50, status, protocol, fromChain, toChain } = filters;
    
    let history = [...this.bridgeHistory];

    // Apply filters
    if (status) {
      history = history.filter(item => item.status === status);
    }
    if (protocol) {
      history = history.filter(item => item.protocol === protocol);
    }
    if (fromChain) {
      history = history.filter(item => item.fromChain === fromChain);
    }
    if (toChain) {
      history = history.filter(item => item.toChain === toChain);
    }

    // Sort by most recent first
    history.sort((a, b) => new Date(b.initiatedAt || b.failedAt) - new Date(a.initiatedAt || a.failedAt));

    return {
      total: history.length,
      items: history.slice(0, limit),
      hasMore: history.length > limit
    };
  }

  /**
   * Get comprehensive bridge statistics
   */
  getBridgeStats() {
    const history = this.bridgeHistory;
    const totalTransactions = history.length;
    const successfulTransactions = history.filter(tx => tx.status === 'completed').length;
    const failedTransactions = history.filter(tx => tx.status === 'failed').length;
    const pendingTransactions = history.filter(tx => tx.status === 'pending' || tx.status === 'initiated').length;

    const protocolUsage = {};
    history.forEach(tx => {
      if (tx.protocol) {
        protocolUsage[tx.protocol] = (protocolUsage[tx.protocol] || 0) + 1;
      }
    });

    return {
      overview: {
        totalProtocols: this.protocols.size,
        isInitialized: this.isInitialized,
        supportedChains: this.supportedChains,
        activeTransactions: this.transactionTracker.getActiveTransactionCount()
      },
      transactions: {
        total: totalTransactions,
        successful: successfulTransactions,
        failed: failedTransactions,
        pending: pendingTransactions,
        successRate: totalTransactions > 0 ? ((successfulTransactions / totalTransactions) * 100).toFixed(2) + '%' : '0%'
      },
      protocols: {
        usage: protocolUsage,
        available: Array.from(this.protocols.keys())
      },
      monitoring: {
        trackerActive: this.transactionTracker.isActive(),
        statusUpdaterActive: this.statusUpdater.isActive(),
        failureHandlerActive: this.failureHandler.isActive()
      }
    };
  }

  // ===============================
  // ENHANCED PRIVATE METHODS
  // ===============================

  /**
   * ✅ MODULARITY: Dynamic protocol loading
   */
  async _dynamicallyLoadProtocols() {
    const protocolModules = new Map();
    
    const protocolFiles = [
      'layerZero',
      'axelar', 
      'wormhole',
      'chainlink',
      'hyperlane'
    ];

    for (const protocolName of protocolFiles) {
      try {
        // Dynamic import of protocol modules
        const module = await import(`./protocols/${protocolName}.js`);
        const ProtocolClass = module.default || module[`${protocolName.charAt(0).toUpperCase() + protocolName.slice(1)}Protocol`];
        
        if (ProtocolClass) {
          protocolModules.set(protocolName, ProtocolClass);
          console.log(`📦 Loaded ${protocolName} protocol module`);
        }
      } catch (error) {
        console.warn(`⚠️ Could not load ${protocolName} protocol:`, error.message);
      }
    }

    return protocolModules;
  }

  /**
   * 🛡 VALIDATION: Enhanced validation with ethers.js
   */
  _validateChains(fromChain, toChain) {
    if (!Number.isInteger(fromChain) || !Number.isInteger(toChain)) {
      throw new Error('Chain IDs must be integers');
    }
    
    if (fromChain === toChain) {
      throw new Error('Source and destination chains cannot be the same');
    }

    if (!this.supportedChains.includes(fromChain)) {
      throw new Error(`Unsupported source chain: ${fromChain}`);
    }
    
    if (!this.supportedChains.includes(toChain)) {
      throw new Error(`Unsupported destination chain: ${toChain}`);
    }
  }

  _validateTokenAddress(tokenAddress) {
    if (!tokenAddress || typeof tokenAddress !== 'string') {
      throw new Error('Token address is required');
    }

    if (!ethers.isAddress(tokenAddress)) {
      throw new Error(`Invalid token address format: ${tokenAddress}`);
    }

    // Additional validation for known token addresses
    if (tokenAddress === ethers.ZeroAddress) {
      throw new Error('Zero address not allowed for token transfers');
    }
  }

  _validateAmount(amount) {
    if (!amount || amount === '0') {
      throw new Error('Amount must be greater than 0');
    }

    try {
      const parsedAmount = ethers.parseUnits(amount.toString(), 18);
      if (parsedAmount <= 0n) {
        throw new Error('Amount must be positive');
      }
      
      // Check for reasonable upper bound (1 billion tokens)
      const maxAmount = ethers.parseUnits('1000000000', 18);
      if (parsedAmount > maxAmount) {
        throw new Error('Amount exceeds maximum allowed limit');
      }
    } catch (error) {
      throw new Error(`Invalid amount format: ${error.message}`);
    }
  }

  async _validateBridgeParams(params) {
    const { fromChain, toChain, tokenAddress, amount, recipientAddress } = params;

    // Validate all parameters
    this._validateChains(fromChain, toChain);
    this._validateTokenAddress(tokenAddress);
    this._validateAmount(amount);

    if (!recipientAddress || !ethers.isAddress(recipientAddress)) {
      throw new Error(`Invalid recipient address: ${recipientAddress}`);
    }

    if (recipientAddress === ethers.ZeroAddress) {
      throw new Error('Cannot send to zero address');
    }

    // Additional business logic validation
    const availableProtocols = this._getAvailableProtocols(fromChain, toChain);
    if (availableProtocols.length === 0) {
      throw new Error(`No bridge protocols support the route ${fromChain} → ${toChain}`);
    }
  }

  /**
   * Enhanced transaction execution with monitoring
   */
  async _executeBridgeWithMonitoring(protocol, params, transactionId) {
    try {
      // Pre-execution monitoring
      await this.statusUpdater.notifySubscribers(transactionId, {
        status: 'preparing',
        message: 'Preparing bridge transaction...',
        timestamp: Date.now()
      });

      // Execute the bridge
      const result = await protocol.bridge({
        ...params,
        transactionId,
        onStatusUpdate: (status) => {
          this.statusUpdater.notifySubscribers(transactionId, status);
        }
      });

      // Post-execution monitoring
      await this.statusUpdater.notifySubscribers(transactionId, {
        status: 'submitted',
        message: 'Transaction submitted to blockchain',
        txHash: result.txHash,
        timestamp: Date.now()
      });

      return result;
    } catch (error) {
      await this.statusUpdater.notifySubscribers(transactionId, {
        status: 'error',
        message: error.message,
        timestamp: Date.now()
      });
      throw error;
    }
  }

  /**
   * Real-time monitoring setup
   */
  _startRealTimeMonitoring(transactionId) {
    const interval = setInterval(async () => {
      try {
        const status = await this.getTransactionStatus(transactionId);
        
        if (status.status === 'completed' || status.status === 'failed') {
          clearInterval(interval);
          console.log(`🏁 Monitoring complete for ${transactionId}: ${status.status}`);
        }
      } catch (error) {
        console.error(`Monitoring error for ${transactionId}:`, error);
      }
    }, this.config.statusPollInterval);

    // Store interval for cleanup
    if (!this.monitoringIntervals) {
      this.monitoringIntervals = new Map();
    }
    this.monitoringIntervals.set(transactionId, interval);
  }

  /**
   * Initialize status monitoring system
   */
  _initializeStatusMonitoring() {
    // Set up periodic cleanup of completed transactions
    setInterval(() => {
      this._cleanupCompletedMonitoring();
    }, 300000); // 5 minutes
  }

  _cleanupCompletedMonitoring() {
    if (!this.monitoringIntervals) return;

    for (const [transactionId, interval] of this.monitoringIntervals) {
      const context = this.bridgeContext.get(transactionId);
      if (context && context.result && 
          (context.result.status === 'completed' || context.result.status === 'failed')) {
        clearInterval(interval);
        this.monitoringIntervals.delete(transactionId);
      }
    }
  }

  /**
   * Enhanced route scoring algorithm
   */
  _calculateRouteScore(route) {
    const feeScore = 1 / (parseFloat(route.fee) + 0.001); // Lower fee = higher score
    const timeScore = 1 / (route.estimatedTime + 1); // Faster = higher score
    const reliabilityScore = route.reliability || 0.8; // Default reliability
    const securityScore = route.securityScore || 0.7; // Default security

    // Weighted scoring
    return (feeScore * 0.3) + (timeScore * 0.3) + (reliabilityScore * 0.25) + (securityScore * 0.15);
  }

  async _getProtocolReliability(protocolName) {
    // Calculate reliability based on historical success rate
    const protocolHistory = this.bridgeHistory.filter(tx => tx.protocol === protocolName);
    if (protocolHistory.length === 0) return 0.8; // Default for new protocols

    const successful = protocolHistory.filter(tx => tx.status === 'completed').length;
    return successful / protocolHistory.length;
  }

  async _estimateGasCost(protocolName, chainId) {
    // Mock gas estimation - replace with actual gas price fetching
    const gasPrice = await this._getGasPrice(chainId);
    const estimatedGas = 150000; // Typical bridge transaction gas
    return ethers.formatUnits((gasPrice * BigInt(estimatedGas)).toString(), 'gwei');
  }

  async _getGasPrice(chainId) {
    // Mock gas price - replace with actual RPC call
    return ethers.parseUnits('20', 'gwei'); // 20 gwei
  }

  _getSecurityScore(protocolName) {
    // Security scores based on protocol maturity and audit status
    const securityScores = {
      layerzero: 0.9,
      axelar: 0.85,
      wormhole: 0.8,
      chainlink: 0.95,
      hyperlane: 0.75
    };
    return securityScores[protocolName] || 0.7;
  }

  /**
   * 🪪 BRIDGE CONTEXT: Persistent storage methods
   */
  _loadBridgeHistory() {
    try {
      if (typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem('trust_bridge_history');
        return stored ? JSON.parse(stored) : [];
      }
      return [];
    } catch (error) {
      console.warn('Could not load bridge history:', error);
      return [];
    }
  }

  _addToBridgeHistory(transaction) {
    this.bridgeHistory.unshift(transaction);
    
    // Keep only last 1000 transactions
    if (this.bridgeHistory.length > 1000) {
      this.bridgeHistory = this.bridgeHistory.slice(0, 1000);
    }

    this._saveBridgeHistory();
  }

  _saveBridgeHistory() {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('trust_bridge_history', JSON.stringify(this.bridgeHistory));
      }
    } catch (error) {
      console.warn('Could not save bridge history:', error);
    }
  }

  _saveBridgeContext(transactionId, context) {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(`trust_bridge_context_${transactionId}`, JSON.stringify(context));
      }
    } catch (error) {
      console.warn('Could not save bridge context:', error);
    }
  }

  /**
   * Caching methods
   */
  _getFromCache(key) {
    const cached = this.cache?.get(key);
    if (cached && Date.now() - cached.timestamp < this.config.cacheTimeout) {
      return cached.data;
    }
    return null;
  }

  _setCache(key, data) {
    if (!this.cache) {
      this.cache = new Map();
    }
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * Utility methods
   */
  _generateTransactionId() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 8);
    return `bridge_${timestamp}_${random}`;
  }

  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  _getAvailableProtocols(fromChain, toChain) {
    // Enhanced protocol availability check
    const availableProtocols = [];
    
    for (const [protocolName, protocol] of this.protocols) {
      try {
        const supportedChains = protocol.getSupportedChains();
        if (supportedChains.includes(fromChain) && supportedChains.includes(toChain)) {
          availableProtocols.push(protocolName);
        }
      } catch (error) {
        console.warn(`Could not check support for ${protocolName}:`, error);
      }
    }

    return availableProtocols;
  }

  /**
   * Cleanup method for proper resource management
   */
  async destroy() {
    console.log('🧹 Cleaning up Bridge Manager...');
    
    // Clear monitoring intervals
    if (this.monitoringIntervals) {
      for (const interval of this.monitoringIntervals.values()) {
        clearInterval(interval);
      }
      this.monitoringIntervals.clear();
    }

    // Cleanup monitoring systems
    await this.transactionTracker?.destroy();
    await this.statusUpdater?.destroy();
    await this.failureHandler?.destroy();

    // Clear caches and contexts
    this.cache?.clear();
    this.bridgeContext.clear();

    this.isInitialized = false;
    console.log('✅ Bridge Manager cleanup complete');
  }
}

// Export singleton instance with enhanced features
export const trustBridgeManager = new BridgeManager();
export default BridgeManager;
