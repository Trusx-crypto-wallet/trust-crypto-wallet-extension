// ============================================================================
// ARBITRUM.JS - Complete Enhanced Arbitrum Network Handler (FIXED)
// ============================================================================

/**
 * Enhanced Arbitrum Network Configuration and Utilities
 * Supports Arbitrum One (Mainnet) and Arbitrum Sepolia (Testnet)
 * Includes rate limiting, structured logging, event subscriptions, nonce management,
 * HD wallet support, broadcast mode, and enhanced security
 */

const { ethers } = require('ethers');
const EventEmitter = require('events');

// Structured Logging Implementation with Security Sanitization
class Logger {
  constructor(level = 'info') {
    this.levels = {
      error: 0,
      warn: 1,
      info: 2,
      debug: 3
    };
    this.level = level;
  }

  // Sanitize sensitive data from logs
  sanitizeData(data) {
    const sanitized = { ...data };
    const sensitiveKeys = ['privateKey', 'mnemonic', 'seed', 'password', 'secret'];
    
    for (const key of sensitiveKeys) {
      if (sanitized[key]) {
        sanitized[key] = '[REDACTED]';
      }
    }
    
    // Sanitize nested objects
    for (const [key, value] of Object.entries(sanitized)) {
      if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeData(value);
      }
    }
    
    return sanitized;
  }

  log(level, message, meta = {}) {
    if (this.levels[level] <= this.levels[this.level]) {
      const timestamp = new Date().toISOString();
      const sanitizedMeta = this.sanitizeData(meta);
      const logEntry = {
        timestamp,
        level: level.toUpperCase(),
        message,
        network: 'Arbitrum',
        ...sanitizedMeta
      };
      console.log(JSON.stringify(logEntry));
    }
  }

  error(message, meta = {}) { this.log('error', message, meta); }
  warn(message, meta = {}) { this.log('warn', message, meta); }
  info(message, meta = {}) { this.log('info', message, meta); }
  debug(message, meta = {}) { this.log('debug', message, meta); }
}

// Rate Limiter Implementation (Token Bucket Algorithm)
class RateLimiter {
  constructor(maxTokens = 100, refillRate = 10) {
    this.maxTokens = maxTokens;
    this.tokens = maxTokens;
    this.refillRate = refillRate; // tokens per second
    this.lastRefill = Date.now();
    this.queue = [];
  }

  async consume(tokens = 1) {
    this.refill();
    
    if (this.tokens >= tokens) {
      this.tokens -= tokens;
      return true;
    }

    return new Promise((resolve) => {
      this.queue.push({ tokens, resolve, timestamp: Date.now() });
      this.processQueue();
    });
  }

  refill() {
    const now = Date.now();
    const timePassed = (now - this.lastRefill) / 1000;
    const tokensToAdd = Math.floor(timePassed * this.refillRate);
    
    if (tokensToAdd > 0) {
      this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);
      this.lastRefill = now;
    }
  }

  processQueue() {
    setTimeout(() => {
      this.refill();
      
      while (this.queue.length > 0 && this.tokens >= this.queue[0].tokens) {
        const request = this.queue.shift();
        this.tokens -= request.tokens;
        request.resolve(true);
      }
      
      if (this.queue.length > 0) {
        this.processQueue();
      }
    }, 100);
  }

  getStats() {
    return {
      availableTokens: this.tokens,
      queueLength: this.queue.length,
      maxTokens: this.maxTokens,
      refillRate: this.refillRate
    };
  }
}

// Nonce Manager for High-Throughput Transactions
class NonceManager {
  constructor(provider, address) {
    this.provider = provider;
    this.address = address;
    this.currentNonce = null;
    this.pendingNonces = new Set();
    this.initialized = false;
  }

  async initialize() {
    if (!this.initialized) {
      this.currentNonce = await this.provider.getTransactionCount(this.address, 'pending');
      this.initialized = true;
    }
  }

  async getNextNonce() {
    await this.initialize();
    
    while (this.pendingNonces.has(this.currentNonce)) {
      this.currentNonce++;
    }
    
    const nonce = this.currentNonce;
    this.pendingNonces.add(nonce);
    this.currentNonce++;
    
    return nonce;
  }

  releaseNonce(nonce) {
    this.pendingNonces.delete(nonce);
  }

  reset() {
    this.currentNonce = null;
    this.pendingNonces.clear();
    this.initialized = false;
  }
}

// Enhanced Address Watcher with Contract Event Support
class AddressWatcher extends EventEmitter {
  constructor(provider, logger) {
    super();
    this.provider = provider;
    this.logger = logger;
    this.watchedAddresses = new Map();
    this.watchedContracts = new Map();
    this.blockWatcher = null;
    this.isWatching = false;
  }

  watchAddress(address, options = {}) {
    const watchConfig = {
      address: address.toLowerCase(),
      includeIncoming: options.includeIncoming !== false,
      includeOutgoing: options.includeOutgoing !== false,
      startBlock: options.startBlock || 'latest'
    };

    this.watchedAddresses.set(address.toLowerCase(), watchConfig);
    this.logger.info('Started watching address', { address, options });

    if (!this.isWatching) {
      this.startBlockWatcher();
    }

    return () => this.unwatchAddress(address);
  }

  // Enhanced contract event watching
  watchContract(contractAddress, abi, eventName, options = {}) {
    try {
      const contract = new ethers.Contract(contractAddress, abi, this.provider);
      const eventFilter = contract.filters[eventName]();
      
      const watchConfig = {
        contract,
        eventName,
        filter: eventFilter,
        startBlock: options.startBlock || 'latest',
        topics: options.topics || []
      };

      this.watchedContracts.set(`${contractAddress}-${eventName}`, watchConfig);
      
      // Set up event listener
      contract.on(eventName, (...args) => {
        const event = args[args.length - 1]; // Last argument is the event object
        this.emit('contractEvent', {
          contractAddress,
          eventName,
          args: args.slice(0, -1),
          event,
          blockNumber: event.blockNumber,
          transactionHash: event.transactionHash
        });
      });

      this.logger.info('Started watching contract event', { 
        contractAddress, 
        eventName,
        options 
      });

      return () => this.unwatchContract(contractAddress, eventName);
    } catch (error) {
      this.logger.error('Failed to watch contract event', { 
        contractAddress, 
        eventName, 
        error: error.message 
      });
      throw error;
    }
  }

  unwatchContract(contractAddress, eventName) {
    const key = `${contractAddress}-${eventName}`;
    const watchConfig = this.watchedContracts.get(key);
    
    if (watchConfig) {
      watchConfig.contract.removeAllListeners(eventName);
      this.watchedContracts.delete(key);
      this.logger.info('Stopped watching contract event', { contractAddress, eventName });
    }
  }

  unwatchAddress(address) {
    this.watchedAddresses.delete(address.toLowerCase());
    this.logger.info('Stopped watching address', { address });

    if (this.watchedAddresses.size === 0 && this.watchedContracts.size === 0 && this.isWatching) {
      this.stopBlockWatcher();
    }
  }

  startBlockWatcher() {
    if (this.isWatching) return;

    this.isWatching = true;
    this.provider.on('block', this.handleNewBlock.bind(this));
    this.logger.info('Started block watcher');
  }

  stopBlockWatcher() {
    if (!this.isWatching) return;

    this.isWatching = false;
    this.provider.removeAllListeners('block');
    this.logger.info('Stopped block watcher');
  }

  async handleNewBlock(blockNumber) {
    try {
      const block = await this.provider.getBlock(blockNumber, true);
      
      for (const tx of block.transactions) {
        await this.checkTransaction(tx, blockNumber);
      }

      this.emit('newBlock', { blockNumber, timestamp: block.timestamp });
    } catch (error) {
      this.logger.error('Error processing new block', { blockNumber, error: error.message });
    }
  }

  async checkTransaction(tx, blockNumber) {
    const fromAddress = tx.from?.toLowerCase();
    const toAddress = tx.to?.toLowerCase();

    for (const [watchedAddress, config] of this.watchedAddresses.entries()) {
      let isRelevant = false;
      let direction = null;

      if (config.includeIncoming && toAddress === watchedAddress) {
        isRelevant = true;
        direction = 'incoming';
      } else if (config.includeOutgoing && fromAddress === watchedAddress) {
        isRelevant = true;
        direction = 'outgoing';
      }

      if (isRelevant) {
        const receipt = await this.provider.getTransactionReceipt(tx.hash);
        
        this.emit('addressActivity', {
          address: watchedAddress,
          direction,
          transaction: tx,
          receipt,
          blockNumber
        });
      }
    }
  }

  destroy() {
    this.stopBlockWatcher();
    
    // Clean up contract watchers
    for (const [key, watchConfig] of this.watchedContracts.entries()) {
      watchConfig.contract.removeAllListeners();
    }
    
    this.watchedAddresses.clear();
    this.watchedContracts.clear();
    this.removeAllListeners();
  }
}

class ArbitrumNetwork extends EventEmitter {
  constructor(config = {}) {
    super();
    
    // Initialize structured logger
    this.logger = new Logger(config.logLevel || 'info');
    
    // Initialize rate limiter
    this.rateLimiter = new RateLimiter(
      config.maxRequestsPerSecond || 100,
      config.refillRate || 20
    );

    // Determine network type
    this.networkType = config.network || config.networkType || 'mainnet';
    
    // Network-specific configurations
    const networkConfigs = {
      mainnet: {
        chainId: 42161,
        networkName: 'Arbitrum One',
        symbol: 'ETH',
        explorerUrl: 'https://arbiscan.io',
        bridgeUrl: 'https://bridge.arbitrum.io',
        rpcUrls: [
          'https://arbitrum-one-rpc.publicnode.com',
          'https://arb1.arbitrum.io/rpc',
          'https://rpc.ankr.com/arbitrum',
          'https://arbitrum.public-rpc.com',
          'https://endpoints.omniatech.io/v1/arbitrum/one/public'
        ]
      },
      testnet: {
        chainId: 421614,
        networkName: 'Arbitrum Sepolia',
        symbol: 'ETH',
        explorerUrl: 'https://sepolia.arbiscan.io',
        bridgeUrl: 'https://bridge.arbitrum.io',
        rpcUrls: [
          'https://arbitrum-sepolia-rpc.publicnode.com',
          'https://sepolia-rollup.arbitrum.io/rpc',
          'https://rpc.ankr.com/arbitrum_sepolia',
          'https://arbitrum-sepolia.public-rpc.com',
          'https://endpoints.omniatech.io/v1/arbitrum/sepolia/public'
        ]
      }
    };

    const selectedNetwork = networkConfigs[this.networkType];
    if (!selectedNetwork) {
      throw new Error(`Unsupported network type: ${this.networkType}. Use 'mainnet' or 'testnet'`);
    }

    this.config = {
      // Network-specific settings
      rpcUrls: config.rpcUrls || selectedNetwork.rpcUrls,
      chainId: config.chainId || selectedNetwork.chainId,
      networkName: config.networkName || selectedNetwork.networkName,
      symbol: selectedNetwork.symbol,
      decimals: 18,
      explorerUrl: config.explorerUrl || selectedNetwork.explorerUrl,
      bridgeUrl: config.bridgeUrl || selectedNetwork.bridgeUrl,
      
      // Gas settings (very low for Arbitrum)
      gasLimit: config.gasLimit || 21000,
      maxFeePerGas: config.maxFeePerGas || ethers.parseUnits('0.1', 'gwei'),
      maxPriorityFeePerGas: config.maxPriorityFeePerGas || ethers.parseUnits('0.01', 'gwei'),
      
      // Connection settings
      retryAttempts: config.retryAttempts || 3,
      retryDelay: config.retryDelay || 1000,
      healthCheckInterval: config.healthCheckInterval || 30000,
      connectionTimeout: config.connectionTimeout || 10000,
      operationTimeout: config.operationTimeout || 15000,
      
      // Rate limiting
      enableRateLimiting: config.enableRateLimiting !== false,
      maxRequestsPerSecond: config.maxRequestsPerSecond || 100,
      
      // Enhanced features
      enableEventSubscriptions: config.enableEventSubscriptions || false,
      enableNonceManagement: config.enableNonceManagement || false,
      enableBroadcastMode: config.enableBroadcastMode || false,
      enableContractEvents: config.enableContractEvents || false,
      
      // Signer options
      signerType: config.signerType || 'privateKey', // 'privateKey', 'mnemonic', 'external'
      hdPath: config.hdPath || "m/44'/60'/0'/0/0",
      
      // Testnet specific settings
      faucetUrl: this.networkType === 'testnet' ? 'https://faucet.quicknode.com/arbitrum/sepolia' : null,
      
      ...config
    };

    // Initialize components
    this.providers = [];
    this.currentProviderIndex = 0;
    this.signer = null;
    this.isConnected = false;
    this.healthCheckTimer = null;
    this.rpcHealth = new Map();
    this.lastFailoverTime = 0;
    this.failoverCooldown = 5000;

    // Enhanced components
    this.nonceManager = null;
    this.addressWatcher = null;

    // Performance metrics
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      providerSwitches: 0,
      averageResponseTime: 0,
      rateLimitHits: 0,
      broadcastTransactions: 0
    };

    this.logger.info('Initializing Arbitrum Network', { 
      networkType: this.networkType,
      chainId: this.config.chainId,
      networkName: this.config.networkName,
      enabledFeatures: {
        rateLimiting: this.config.enableRateLimiting,
        eventSubscriptions: this.config.enableEventSubscriptions,
        nonceManagement: this.config.enableNonceManagement,
        broadcastMode: this.config.enableBroadcastMode,
        contractEvents: this.config.enableContractEvents
      }
    });
    
    this.initializeComponents();
  }

  async initializeComponents() {
    try {
      await this.initializeProviders();
      
      if (this.config.enableEventSubscriptions) {
        this.addressWatcher = new AddressWatcher(this.getCurrentProvider(), this.logger);
        this.logger.info('Event subscription support enabled', {
          contractEvents: this.config.enableContractEvents
        });
      }

      this.startHealthCheck();
      
    } catch (error) {
      this.logger.error('Failed to initialize components', { error: error.message });
      throw error;
    }
  }

  async initializeProviders() {
    try {
      this.logger.info('Initializing providers with failover support', {
        networkType: this.networkType,
        providerCount: this.config.rpcUrls.length,
        primaryRpc: this.config.rpcUrls[0]
      });
      
      const initPromises = this.config.rpcUrls.map(async (rpcUrl, index) => {
        try {
          const provider = new ethers.JsonRpcProvider(rpcUrl, this.config.chainId);
          
          const network = await Promise.race([
            provider.getNetwork(),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Connection timeout')), this.config.connectionTimeout)
            )
          ]);
          
          if (Number(network.chainId) === this.config.chainId) {
            const providerInfo = {
              provider,
              url: rpcUrl,
              healthy: true,
              lastChecked: Date.now(),
              responseTime: 0,
              consecutiveFailures: 0,
              isPrimary: index === 0
            };

            this.providers.push(providerInfo);
            
            this.rpcHealth.set(rpcUrl, {
              healthy: true,
              lastResponse: Date.now(),
              consecutiveFailures: 0,
              totalRequests: 0,
              successfulRequests: 0,
              averageResponseTime: 0
            });
            
            this.logger.info('Provider connected', {
              index: index + 1,
              url: rpcUrl,
              network: this.config.networkName,
              isPrimary: index === 0
            });
            
            return { success: true, url: rpcUrl, index };
          } else {
            throw new Error(`Chain ID mismatch: expected ${this.config.chainId}, got ${Number(network.chainId)}`);
          }
        } catch (error) {
          this.logger.warn('Provider connection failed', {
            index: index + 1,
            url: rpcUrl,
            error: error.message
          });
          
          this.rpcHealth.set(rpcUrl, {
            healthy: false,
            lastError: error.message,
            consecutiveFailures: 1,
            lastFailureTime: Date.now()
          });
          
          return { success: false, url: rpcUrl, error: error.message, index };
        }
      });

      const results = await Promise.allSettled(initPromises);
      const successfulProviders = results.filter(r => 
        r.status === 'fulfilled' && r.value.success
      ).length;

      if (successfulProviders === 0) {
        throw new Error(`No healthy ${this.config.networkName} providers available`);
      }

      this.optimizeProviderOrder();
      this.isConnected = true;
      
      this.logger.info('Network initialization complete', {
        network: this.config.networkName,
        successfulProviders,
        totalProviders: this.config.rpcUrls.length,
        primaryHealthy: this.providers[0]?.healthy || false
      });
      
      if (this.networkType === 'testnet') {
        this.logger.info('Testnet configuration', {
          faucetUrl: this.config.faucetUrl,
          bridgeUrl: this.config.bridgeUrl,
          warning: 'Testnet tokens have no real value'
        });
      }
      
      return this.getCurrentProvider();
    } catch (error) {
      this.logger.error('Provider initialization failed', {
        network: this.config.networkName,
        error: error.message
      });
      throw new Error(`${this.config.networkName} connection failed: ${error.message}`);
    }
  }

  optimizeProviderOrder() {
    this.providers.sort((a, b) => {
      // Always prioritize primary provider if healthy
      if (a.isPrimary && a.healthy) return -1;
      if (b.isPrimary && b.healthy) return 1;
      
      if (a.healthy && !b.healthy) return -1;
      if (!a.healthy && b.healthy) return 1;
      
      if (a.healthy && b.healthy) {
        return a.responseTime - b.responseTime;
      }
      
      return a.consecutiveFailures - b.consecutiveFailures;
    });

    this.currentProviderIndex = 0;
  }

  getCurrentProvider() {
    if (this.providers.length === 0) {
      throw new Error('No providers available');
    }

    let attempts = 0;
    const startIndex = this.currentProviderIndex;

    while (attempts < this.providers.length) {
      const providerInfo = this.providers[this.currentProviderIndex];
      
      if (providerInfo && providerInfo.healthy) {
        return providerInfo.provider;
      }

      this.currentProviderIndex = (this.currentProviderIndex + 1) % this.providers.length;
      attempts++;

      if (this.currentProviderIndex === startIndex && attempts > 0) {
        break;
      }
    }

    if (this.providers.length > 0) {
      this.currentProviderIndex = 0;
      this.logger.warn('No healthy providers found, using first available', {
        network: this.config.networkName
      });
      return this.providers[0].provider;
    }

    throw new Error(`No ${this.config.networkName} providers available`);
  }

  async executeWithFailover(operation, ...args) {
    if (this.config.enableRateLimiting) {
      await this.rateLimiter.consume(1);
    }

    const startTime = Date.now();
    let lastError;
    let attempts = 0;
    const maxAttempts = Math.min(this.providers.length, this.config.retryAttempts);

    this.metrics.totalRequests++;

    while (attempts < maxAttempts) {
      const currentProviderInfo = this.providers[this.currentProviderIndex];
      
      if (!currentProviderInfo) {
        attempts++;
        this.currentProviderIndex = (this.currentProviderIndex + 1) % this.providers.length;
        continue;
      }

      try {
        const provider = currentProviderInfo.provider;
        const operationStartTime = Date.now();
        
        const result = await Promise.race([
          operation(provider, ...args),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Operation timeout')), this.config.operationTimeout)
          )
        ]);

        const responseTime = Date.now() - operationStartTime;
        
        this.updateProviderSuccess(currentProviderInfo, responseTime);
        this.updateGlobalMetrics(true, Date.now() - startTime);

        return result;
        
      } catch (error) {
        lastError = error;
        
        this.updateProviderFailure(currentProviderInfo, error);
        
        this.logger.warn('Provider operation failed', {
          provider: currentProviderInfo.url,
          attempt: attempts + 1,
          error: error.message
        });
        
        const now = Date.now();
        if (now - this.lastFailoverTime < this.failoverCooldown) {
          await new Promise(resolve => setTimeout(resolve, this.failoverCooldown));
        }
        
        this.switchToNextProvider();
        attempts++;

        if (attempts < maxAttempts) {
          const delay = this.config.retryDelay * Math.pow(2, attempts - 1);
          await new Promise(resolve => setTimeout(resolve, Math.min(delay, 10000)));
        }
      }
    }

    this.updateGlobalMetrics(false, Date.now() - startTime);
    this.logger.error('All providers failed', { 
      attempts: maxAttempts,
      lastError: lastError?.message 
    });
    
    throw new Error(`All ${this.config.networkName} providers failed after ${maxAttempts} attempts. Last error: ${lastError?.message}`);
  }

  switchToNextProvider() {
    const oldIndex = this.currentProviderIndex;
    this.currentProviderIndex = (this.currentProviderIndex + 1) % this.providers.length;
    this.lastFailoverTime = Date.now();
    this.metrics.providerSwitches++;
    
    this.logger.info('Provider failover', {
      network: this.config.networkName,
      fromIndex: oldIndex + 1,
      toIndex: this.currentProviderIndex + 1,
      fromUrl: this.providers[oldIndex]?.url,
      toUrl: this.providers[this.currentProviderIndex]?.url
    });
  }

  updateProviderSuccess(providerInfo, responseTime) {
    providerInfo.healthy = true;
    providerInfo.lastChecked = Date.now();
    providerInfo.responseTime = responseTime;
    providerInfo.consecutiveFailures = 0;
    
    const health = this.rpcHealth.get(providerInfo.url);
    if (health) {
      health.healthy = true;
      health.lastResponse = Date.now();
      health.consecutiveFailures = 0;
      health.totalRequests++;
      health.successfulRequests++;
      health.averageResponseTime = health.averageResponseTime 
        ? (health.averageResponseTime + responseTime) / 2 
        : responseTime;
    }
  }

  updateProviderFailure(providerInfo, error) {
    providerInfo.healthy = false;
    providerInfo.consecutiveFailures++;
    
    const health = this.rpcHealth.get(providerInfo.url);
    if (health) {
      health.healthy = false;
      health.lastError = error.message;
      health.consecutiveFailures++;
      health.totalRequests++;
      health.lastFailureTime = Date.now();
    }
  }

  updateGlobalMetrics(success, responseTime) {
    if (success) {
      this.metrics.successfulRequests++;
    } else {
      this.metrics.failedRequests++;
    }
    
    this.metrics.averageResponseTime = this.metrics.averageResponseTime
      ? (this.metrics.averageResponseTime + responseTime) / 2
      : responseTime;
  }

  startHealthCheck() {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }

    this.healthCheckTimer = setInterval(async () => {
      await this.checkProvidersHealth();
    }, this.config.healthCheckInterval);
  }

  async checkProvidersHealth() {
    const healthPromises = this.providers.map(async (providerInfo, index) => {
      try {
        const startTime = Date.now();
        
        const blockNumber = await Promise.race([
          providerInfo.provider.getBlockNumber(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Health check timeout')), 5000)
          )
        ]);
        
        const responseTime = Date.now() - startTime;
        this.updateProviderSuccess(providerInfo, responseTime);
        
        return { index, healthy: true, responseTime, blockNumber };
        
      } catch (error) {
        this.updateProviderFailure(providerInfo, error);
        return { index, healthy: false, error: error.message };
      }
    });

    const results = await Promise.allSettled(healthPromises);
    const healthyCount = results.filter(r => 
      r.status === 'fulfilled' && r.value.healthy
    ).length;

    this.optimizeProviderOrder();

    if (healthyCount === 0) {
      this.logger.error('All providers unhealthy, attempting reconnection', {
        network: this.config.networkName
      });
      setTimeout(() => this.initializeProviders(), 5000);
    } else if (healthyCount < this.providers.length) {
      this.logger.warn('Some providers unhealthy', {
        network: this.config.networkName,
        unhealthyCount: this.providers.length - healthyCount,
        totalCount: this.providers.length
      });
    }
  }

  // Enhanced setSigner with HD Wallet and External Signer Support
  setSigner(signerInput, options = {}) {
    try {
      const provider = this.getCurrentProvider();
      let signer;
      
      switch (this.config.signerType) {
        case 'privateKey':
          if (typeof signerInput === 'string') {
            signer = new ethers.Wallet(signerInput, provider);
          } else {
            throw new Error('Private key must be a string');
          }
          break;
          
        case 'mnemonic':
          if (typeof signerInput === 'string') {
            const hdPath = options.hdPath || this.config.hdPath;
            signer = ethers.Wallet.fromPhrase(signerInput, provider, hdPath);
          } else {
            throw new Error('Mnemonic must be a string');
          }
          break;
          
        case 'external':
          // Support for external signers (MetaMask, hardware wallets, etc.)
          if (signerInput && typeof signerInput.getAddress === 'function') {
            signer = signerInput.connect ? signerInput.connect(provider) : signerInput;
          } else {
            throw new Error('External signer must implement ethers Signer interface');
          }
          break;
          
        default:
          throw new Error(`Unsupported signer type: ${this.config.signerType}`);
      }
      
      this.signer = signer;
      
      if (this.config.enableNonceManagement) {
        this.nonceManager = new NonceManager(provider, this.signer.address);
      }
      
      // Safe logging without sensitive data
      this.logger.info('Signer configured', {
        address: this.signer.address,
        network: this.config.networkName,
        signerType: this.config.signerType,
        nonceManagement: this.config.enableNonceManagement,
        hdPath: this.config.signerType === 'mnemonic' ? (options.hdPath || this.config.hdPath) : undefined
      });
      
      if (this.networkType === 'testnet') {
        this.logger.info('Testnet resources available', { 
          faucetUrl: this.config.faucetUrl,
          bridgeUrl: this.config.bridgeUrl
        });
      }
      
      return this.signer;
    } catch (error) {
      this.logger.error('Failed to set signer', { 
        error: error.message,
        signerType: this.config.signerType 
      });
      throw error;
    }
  }

  async getBalance(address) {
    return this.executeWithFailover(async (provider) => {
      const balance = await provider.getBalance(address);
      const balanceInEth = ethers.formatEther(balance);
      
      return {
        wei: balance.toString(),
        eth: balanceInEth,
        formatted: `${parseFloat(balanceInEth).toFixed(6)} ETH`,
        network: this.config.networkName,
        networkType: this.networkType,
        chainId: this.config.chainId,
        timestamp: new Date().toISOString()
      };
    });
  }

  // Enhanced sendTransaction with Broadcast Mode Support
  async sendTransaction(to, amount, options = {}) {
    if (!this.signer) {
      throw new Error('Signer not initialized. Call setSigner() first.');
    }

    if (this.config.enableBroadcastMode && options.broadcast !== false) {
      return this.broadcastTransaction(to, amount, options);
    }

    return this.executeWithFailover(async () => {
      const amountWei = ethers.parseEther(amount.toString());
      
      const feeData = await this.getCurrentProvider().getFeeData();
      
      let nonce;
      if (this.config.enableNonceManagement && this.nonceManager) {
        nonce = await this.nonceManager.getNextNonce();
      }

      const tx = {
        to: to,
        value: amountWei,
        gasLimit: options.gasLimit || this.config.gasLimit,
        maxFeePerGas: options.maxFeePerGas || feeData.maxFeePerGas || this.config.maxFeePerGas,
        maxPriorityFeePerGas: options.maxPriorityFeePerGas || feeData.maxPriorityFeePerGas || this.config.maxPriorityFeePerGas,
        ...(nonce !== undefined && { nonce }),
        ...options
      };

      this.signer = this.signer.connect(this.getCurrentProvider());

      try {
        const transaction = await this.signer.sendTransaction(tx);
        
        this.logger.info('Transaction sent', {
          hash: transaction.hash,
          to,
          amount,
          nonce: transaction.nonce,
          network: this.config.networkName,
          broadcastMode: false
        });
        
        const receipt = await transaction.wait();
        
        this.logger.info('Transaction confirmed', {
          hash: transaction.hash,
          blockNumber: receipt.blockNumber,
          gasUsed: receipt.gasUsed?.toString()
        });

        if (this.nonceManager && nonce !== undefined) {
          this.nonceManager.releaseNonce(nonce);
        }
        
        return {
          hash: transaction.hash,
          receipt: receipt,
          explorerUrl: `${this.config.explorerUrl}/tx/${transaction.hash}`,
          network: this.config.networkName,
          networkType: this.networkType,
          chainId: this.config.chainId,
          gasUsed: receipt.gasUsed?.toString(),
          effectiveGasPrice: receipt.effectiveGasPrice?.toString(),
          l2BlockNumber: receipt.blockNumber,
          broadcastMode: false,
          timestamp: new Date().toISOString()
        };
      } catch (error) {
        if (this.nonceManager && nonce !== undefined) {
          this.nonceManager.releaseNonce(nonce);
        }
        throw error;
      }
    });
  }

  // Broadcast Mode: Send transaction to all healthy providers for redundancy
  async broadcastTransaction(to, amount, options = {}) {
    if (!this.signer) {
      throw new Error('Signer not initialized. Call setSigner() first.');
    }

    this.metrics.broadcastTransactions++;

    try {
      const amountWei = ethers.parseEther(amount.toString());
      
      // Get fee data from primary provider
      const feeData = await this.getCurrentProvider().getFeeData();
      
      let nonce;
      if (this.config.enableNonceManagement && this.nonceManager) {
        nonce = await this.nonceManager.getNextNonce();
      }

      const tx = {
        to: to,
        value: amountWei,
        gasLimit: options.gasLimit || this.config.gasLimit,
        maxFeePerGas: options.maxFeePerGas || feeData.maxFeePerGas || this.config.maxFeePerGas,
        maxPriorityFeePerGas: options.maxPriorityFeePerGas || feeData.maxPriorityFeePerGas || this.config.maxPriorityFeePerGas,
        ...(nonce !== undefined && { nonce }),
        ...options
      };

      // Sign transaction once
      const signedTx = await this.signer.signTransaction(tx);
      
      // Broadcast to all healthy providers
      const healthyProviders = this.providers.filter(p => p.healthy);
      const broadcastPromises = healthyProviders.map(async (providerInfo) => {
        try {
          const response = await providerInfo.provider.broadcastTransaction(signedTx);
          return {
            provider: providerInfo.url,
            hash: response.hash,
            success: true
          };
        } catch (error) {
          return {
            provider: providerInfo.url,
            error: error.message,
            success: false
          };
        }
      });

      const results = await Promise.allSettled(broadcastPromises);
      const successfulBroadcasts = results.filter(r => 
        r.status === 'fulfilled' && r.value.success
      );

      if (successfulBroadcasts.length === 0) {
        if (this.nonceManager && nonce !== undefined) {
          this.nonceManager.releaseNonce(nonce);
        }
        throw new Error('Failed to broadcast transaction to any provider');
      }

      const firstSuccess = successfulBroadcasts[0].value;
      const transactionHash = firstSuccess.hash;

      this.logger.info('Transaction broadcasted', {
        hash: transactionHash,
        to,
        amount,
        nonce,
        network: this.config.networkName,
        broadcastMode: true,
        successfulBroadcasts: successfulBroadcasts.length,
        totalProviders: healthyProviders.length
      });

      // Wait for confirmation from primary provider
      const receipt = await this.getCurrentProvider().waitForTransaction(transactionHash);
      
      this.logger.info('Broadcast transaction confirmed', {
        hash: transactionHash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed?.toString()
      });

      if (this.nonceManager && nonce !== undefined) {
        this.nonceManager.releaseNonce(nonce);
      }

      return {
        hash: transactionHash,
        receipt: receipt,
        explorerUrl: `${this.config.explorerUrl}/tx/${transactionHash}`,
        network: this.config.networkName,
        networkType: this.networkType,
        chainId: this.config.chainId,
        gasUsed: receipt.gasUsed?.toString(),
        effectiveGasPrice: receipt.effectiveGasPrice?.toString(),
        l2BlockNumber: receipt.blockNumber,
        broadcastMode: true,
        broadcastResults: {
          successful: successfulBroadcasts.length,
          total: healthyProviders.length,
          providers: results.map(r => r.status === 'fulfilled' ? r.value : { success: false })
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      if (this.nonceManager && nonce !== undefined) {
        this.nonceManager.releaseNonce(nonce);
      }
      this.logger.error('Broadcast transaction failed', { error: error.message });
      throw error;
    }
  }

  async getGasPrice() {
    return this.executeWithFailover(async (provider) => {
      const feeData = await provider.getFeeData();
      
      return {
        gasPrice: feeData.gasPrice,
        maxFeePerGas: feeData.maxFeePerGas,
        maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
        formatted: {
          gasPrice: ethers.formatUnits(feeData.gasPrice || 0, 'gwei') + ' gwei',
          maxFeePerGas: ethers.formatUnits(feeData.maxFeePerGas || 0, 'gwei') + ' gwei',
          maxPriorityFeePerGas: ethers.formatUnits(feeData.maxPriorityFeePerGas || 0, 'gwei') + ' gwei'
        },
        network: this.config.networkName,
        networkType: this.networkType,
        timestamp: new Date().toISOString()
      };
    });
  }

  async getNetworkStatus() {
    return this.executeWithFailover(async (provider) => {
      const [blockNumber, gasPrice, network] = await Promise.all([
        provider.getBlockNumber(),
        provider.getFeeData(),
        provider.getNetwork()
      ]);

      const healthyProviders = this.providers.filter(p => p.healthy).length;
      const currentProviderUrl = this.providers[this.currentProviderIndex]?.url;

      return {
        network: this.config.networkName,
        networkType: this.networkType,
        chainId: Number(network.chainId),
        blockNumber: blockNumber,
        gasPrice: gasPrice,
        isConnected: this.isConnected,
        currentProvider: currentProviderUrl,
        currentProviderIndex: this.currentProviderIndex + 1,
        totalProviders: this.providers.length,
        healthyProviders: healthyProviders,
        explorerUrl: this.config.explorerUrl,
        bridgeUrl: this.config.bridgeUrl,
        faucetUrl: this.config.faucetUrl,
        layer: 2,
        primaryProvider: this.config.rpcUrls[0],
        providersHealth: Object.fromEntries(this.rpcHealth),
        metrics: this.getMetrics(),
        lastHealthCheck: new Date().toISOString()
      };
    });
  }

  // Enhanced address watching with contract event support
  watchAddress(address, options = {}) {
    if (!this.addressWatcher) {
      throw new Error('Event subscriptions not enabled. Set enableEventSubscriptions: true in config.');
    }

    const unwatchFn = this.addressWatcher.watchAddress(address, options);
    
    this.addressWatcher.on('addressActivity', (data) => {
      this.emit('addressActivity', data);
    });
    
    this.addressWatcher.on('newBlock', (data) => {
      this.emit('newBlock', data);
    });

    return unwatchFn;
  }

  // Contract event watching
  watchContract(contractAddress, abi, eventName, options = {}) {
    if (!this.addressWatcher) {
      throw new Error('Event subscriptions not enabled. Set enableEventSubscriptions: true in config.');
    }

    if (!this.config.enableContractEvents) {
      throw new Error('Contract events not enabled. Set enableContractEvents: true in config.');
    }

    const unwatchFn = this.addressWatcher.watchContract(contractAddress, abi, eventName, options);
    
    this.addressWatcher.on('contractEvent', (data) => {
      this.emit('contractEvent', data);
    });

    return unwatchFn;
  }

  async getTransaction(hash) {
    return this.executeWithFailover(async (provider) => {
      const [tx, receipt] = await Promise.all([
        provider.getTransaction(hash),
        provider.getTransactionReceipt(hash).catch(() => null)
      ]);

      if (!tx) {
        throw new Error('Transaction not found');
      }

      return {
        transaction: tx,
        receipt: receipt,
        status: receipt ? (receipt.status === 1 ? 'confirmed' : 'failed') : 'pending',
        explorerUrl: `${this.config.explorerUrl}/tx/${hash}`,
        network: this.config.networkName,
        networkType: this.networkType,
        layer: 2,
        l2BlockNumber: receipt?.blockNumber,
        confirmations: receipt ? await provider.getBlockNumber() - receipt.blockNumber : 0,
        timestamp: new Date().toISOString()
      };
    });
  }

  async estimateL2GasCost(txData) {
    return this.executeWithFailover(async (provider) => {
      const gasEstimate = await provider.estimateGas(txData);
      const feeData = await provider.getFeeData();
      
      const l2GasCost = gasEstimate * (feeData.gasPrice || feeData.maxFeePerGas || 0n);
      
      return {
        l2GasUsed: gasEstimate,
        l2GasCost: l2GasCost,
        formatted: {
          l2GasUsed: gasEstimate.toString(),
          l2GasCost: ethers.formatEther(l2GasCost) + ' ETH'
        },
        network: this.config.networkName,
        layer: 2
      };
    });
  }

  isValidAddress(address) {
    try {
      return ethers.isAddress(address);
    } catch {
      return false;
    }
  }

  async switchNetwork(newNetworkType) {
    if (newNetworkType === this.networkType) {
      this.logger.info('Already connected to requested network', {
        network: this.config.networkName
      });
      return;
    }

    if (!['mainnet', 'testnet'].includes(newNetworkType)) {
      throw new Error(`Invalid network type: ${newNetworkType}. Use 'mainnet' or 'testnet'`);
    }

    this.logger.info('Switching networks', {
      from: this.networkType,
      to: newNetworkType
    });
    
    this.destroy();
    
    this.networkType = newNetworkType;
    const arbitrum = new ArbitrumNetwork({ 
      network: newNetworkType,
      ...this.config 
    });
    
    Object.assign(this, arbitrum);
    
    return this.initializeComponents();
  }

  getNetworkType() {
    return {
      type: this.networkType,
      name: this.config.networkName,
      chainId: this.config.chainId,
      isTestnet: this.networkType === 'testnet',
      isMainnet: this.networkType === 'mainnet',
      layer: 2
    };
  }

  getFaucetInfo() {
    if (this.networkType !== 'testnet') {
      return {
        available: false,
        message: 'Faucet only available on testnet'
      };
    }

    return {
      available: true,
      url: this.config.faucetUrl,
      instructions: 'Visit the faucet URL to get free testnet ETH tokens',
      network: this.config.networkName
    };
  }

  getBridgeInfo() {
    return {
      url: this.config.bridgeUrl,
      network: this.config.networkName,
      instructions: 'Use the bridge to transfer assets between Ethereum and Arbitrum',
      layer: 2
    };
  }

  getMetrics() {
    const successRate = this.metrics.totalRequests > 0 
      ? (this.metrics.successfulRequests / this.metrics.totalRequests * 100).toFixed(2)
      : '0';

    return {
      network: this.config.networkName,
      networkType: this.networkType,
      layer: 2,
      performance: {
        totalRequests: this.metrics.totalRequests,
        successfulRequests: this.metrics.successfulRequests,
        failedRequests: this.metrics.failedRequests,
        successRate: `${successRate}%`,
        providerSwitches: this.metrics.providerSwitches,
        averageResponseTime: Math.round(this.metrics.averageResponseTime),
        rateLimitHits: this.metrics.rateLimitHits,
        broadcastTransactions: this.metrics.broadcastTransactions
      },
      providers: {
        healthyProviders: this.providers.filter(p => p.healthy).length,
        totalProviders: this.providers.length,
        currentProvider: this.providers[this.currentProviderIndex]?.url,
        primaryProvider: this.config.rpcUrls[0]
      },
      rateLimiting: this.config.enableRateLimiting ? this.rateLimiter.getStats() : null,
      features: {
        eventSubscriptions: !!this.addressWatcher,
        contractEvents: this.config.enableContractEvents,
        nonceManagement: !!this.nonceManager,
        rateLimiting: this.config.enableRateLimiting,
        broadcastMode: this.config.enableBroadcastMode,
        layer2: true
      }
    };
  }

  getProviderInfo() {
    return {
      network: this.config.networkName,
      networkType: this.networkType,
      chainId: this.config.chainId,
      layer: 2,
      primaryProvider: this.config.rpcUrls[0],
      providers: this.providers.map((provider, index) => ({
        index: index + 1,
        url: provider.url,
        healthy: provider.healthy,
        responseTime: provider.responseTime,
        consecutiveFailures: provider.consecutiveFailures,
        lastChecked: new Date(provider.lastChecked).toISOString(),
        isCurrent: index === this.currentProviderIndex,
        isPrimary: provider.isPrimary || false
      })),
      health: Object.fromEntries(this.rpcHealth),
      currentProviderIndex: this.currentProviderIndex + 1,
      totalProviders: this.providers.length,
      healthyProviders: this.providers.filter(p => p.healthy).length,
      faucet: this.getFaucetInfo(),
      bridge: this.getBridgeInfo()
    };
  }

  destroy() {
    this.logger.info('Shutting down Arbitrum network handler', {
      network: this.config.networkName
    });
    
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }

    if (this.addressWatcher) {
      this.addressWatcher.destroy();
      this.addressWatcher = null;
    }

    if (this.nonceManager) {
      this.nonceManager.reset();
      this.nonceManager = null;
    }
    
    this.providers = [];
    this.rpcHealth.clear();
    this.isConnected = false;
    this.signer = null;
    this.removeAllListeners();
    
    this.logger.info('Arbitrum network handler shutdown complete');
  }
}

module.exports = ArbitrumNetwork;
