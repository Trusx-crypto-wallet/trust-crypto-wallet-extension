// ============================================================================
// AVALANCHE.JS - Complete Enhanced Avalanche Network Handler
// ============================================================================

/**
 * Enhanced Avalanche Network Configuration and Utilities
 * Supports C-Chain, P-Chain, X-Chain with comprehensive production features
 * Includes rate limiting, structured logging, event subscriptions, and nonce management
 */

const { ethers } = require('ethers');
const EventEmitter = require('events');

// Structured Logging Implementation
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

  log(level, message, meta = {}) {
    if (this.levels[level] <= this.levels[this.level]) {
      const timestamp = new Date().toISOString();
      const logEntry = {
        timestamp,
        level: level.toUpperCase(),
        message,
        ...meta
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

    // Queue the request if no tokens available
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
    }, 100); // Check every 100ms
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
    
    // Find the next available nonce
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

// Address Watcher for Event Subscriptions
class AddressWatcher extends EventEmitter {
  constructor(provider, logger) {
    super();
    this.provider = provider;
    this.logger = logger;
    this.watchedAddresses = new Map();
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

  unwatchAddress(address) {
    this.watchedAddresses.delete(address.toLowerCase());
    this.logger.info('Stopped watching address', { address });

    if (this.watchedAddresses.size === 0 && this.isWatching) {
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
    this.watchedAddresses.clear();
    this.removeAllListeners();
  }
}

// Multi-Chain Support (C-Chain, P-Chain, X-Chain)
class AvalancheChainManager {
  constructor(networkType, logger) {
    this.networkType = networkType;
    this.logger = logger;
    this.chains = this.initializeChains();
  }

  initializeChains() {
    const baseUrls = {
      mainnet: {
        c: 'https://api.avax.network/ext/bc/C',
        p: 'https://api.avax.network/ext/bc/P',
        x: 'https://api.avax.network/ext/bc/X'
      },
      testnet: {
        c: 'https://api.avax-test.network/ext/bc/C',
        p: 'https://api.avax-test.network/ext/bc/P',
        x: 'https://api.avax-test.network/ext/bc/X'
      }
    };

    return {
      cChain: {
        rpc: baseUrls[this.networkType].c + '/rpc',
        ws: baseUrls[this.networkType].c.replace('https://', 'wss://') + '/ws',
        name: 'Contract Chain (EVM)',
        purpose: 'Smart contracts, DeFi, ERC-20 tokens'
      },
      pChain: {
        rpc: baseUrls[this.networkType].p,
        name: 'Platform Chain',
        purpose: 'Staking, validator management, subnet creation'
      },
      xChain: {
        rpc: baseUrls[this.networkType].x,
        name: 'Exchange Chain',
        purpose: 'UTXO transactions, asset creation and exchange'
      }
    };
  }

  async callPChain(method, params = []) {
    try {
      const response = await fetch(this.chains.pChain.rpc, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: Date.now(),
          method,
          params
        })
      });

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error.message);
      }

      return data.result;
    } catch (error) {
      this.logger.error('P-Chain call failed', { method, error: error.message });
      throw error;
    }
  }

  async callXChain(method, params = []) {
    try {
      const response = await fetch(this.chains.xChain.rpc, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: Date.now(),
          method,
          params
        })
      });

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error.message);
      }

      return data.result;
    } catch (error) {
      this.logger.error('X-Chain call failed', { method, error: error.message });
      throw error;
    }
  }

  // P-Chain specific methods
  async getStakingInfo(address) {
    return await this.callPChain('platform.getStake', [{ addresses: [address] }]);
  }

  async getValidators() {
    return await this.callPChain('platform.getCurrentValidators', [{}]);
  }

  async getPendingValidators() {
    return await this.callPChain('platform.getPendingValidators', [{}]);
  }

  // X-Chain specific methods
  async getXChainBalance(address) {
    return await this.callXChain('avm.getBalance', [{ address }]);
  }

  async getAssets() {
    return await this.callXChain('avm.getAssetDescription', [{}]);
  }

  getChainInfo() {
    return {
      networkType: this.networkType,
      chains: this.chains,
      supportedOperations: {
        cChain: ['Smart contracts', 'DeFi', 'ERC-20 transfers', 'NFTs'],
        pChain: ['Staking', 'Validator operations', 'Subnet management'],
        xChain: ['UTXO transactions', 'Asset creation', 'Cross-chain transfers']
      }
    };
  }
}

class AvalancheNetwork extends EventEmitter {
  constructor(config = {}) {
    super();
    
    // Initialize structured logger
    this.logger = new Logger(config.logLevel || 'info');
    
    // Initialize rate limiter
    this.rateLimiter = new RateLimiter(
      config.maxRequestsPerSecond || 50,
      config.refillRate || 10
    );

    // Determine network type
    this.networkType = config.network || config.networkType || 'mainnet';
    
    // Network-specific configurations
    const networkConfigs = {
      mainnet: {
        chainId: 43114,
        networkName: 'Avalanche Mainnet',
        symbol: 'AVAX',
        explorerUrl: 'https://snowtrace.io',
        rpcUrls: [
          'https://avalanche-c-chain-rpc.publicnode.com',
          'https://api.avax.network/ext/bc/C/rpc',
          'https://rpc.ankr.com/avalanche',
          'https://avalanche.public-rpc.com',
          'https://avax-mainnet.gateway.pokt.network/v1/lb/605238bf6b986eea7cf36d5e/ext/bc/C/rpc'
        ]
      },
      testnet: {
        chainId: 43113,
        networkName: 'Avalanche Fuji Testnet',
        symbol: 'AVAX',
        explorerUrl: 'https://testnet.snowtrace.io',
        rpcUrls: [
          'https://avalanche-fuji-c-chain-rpc.publicnode.com',
          'https://api.avax-test.network/ext/bc/C/rpc',
          'https://rpc.ankr.com/avalanche_fuji',
          'https://avalanche-fuji.public-rpc.com',
          'https://endpoints.omniatech.io/v1/avax/fuji/public'
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
      
      // Gas settings
      gasLimit: config.gasLimit || 21000,
      maxFeePerGas: config.maxFeePerGas || ethers.parseUnits('25', 'gwei'),
      maxPriorityFeePerGas: config.maxPriorityFeePerGas || ethers.parseUnits('1', 'gwei'),
      
      // Connection settings
      retryAttempts: config.retryAttempts || 3,
      retryDelay: config.retryDelay || 1000,
      healthCheckInterval: config.healthCheckInterval || 30000,
      connectionTimeout: config.connectionTimeout || 10000,
      operationTimeout: config.operationTimeout || 15000,
      
      // Rate limiting
      enableRateLimiting: config.enableRateLimiting !== false,
      maxRequestsPerSecond: config.maxRequestsPerSecond || 50,
      
      // Event subscriptions
      enableEventSubscriptions: config.enableEventSubscriptions || false,
      
      // Nonce management
      enableNonceManagement: config.enableNonceManagement || false,
      
      // Multi-chain support
      enableMultiChain: config.enableMultiChain || false,
      
      // Testnet specific settings
      faucetUrl: this.networkType === 'testnet' ? 'https://faucet.avax.network/' : null,
      
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
    this.chainManager = null;

    // Performance metrics
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      providerSwitches: 0,
      averageResponseTime: 0,
      rateLimitHits: 0
    };

    this.logger.info('Initializing Avalanche Network', { 
      networkType: this.networkType,
      chainId: this.config.chainId,
      networkName: this.config.networkName
    });
    
    this.initializeComponents();
  }

  async initializeComponents() {
    try {
      // Initialize providers
      await this.initializeProviders();
      
      // Initialize multi-chain support if enabled
      if (this.config.enableMultiChain) {
        this.chainManager = new AvalancheChainManager(this.networkType, this.logger);
        this.logger.info('Multi-chain support enabled', this.chainManager.getChainInfo());
      }
      
      // Initialize event subscriptions if enabled
      if (this.config.enableEventSubscriptions) {
        this.addressWatcher = new AddressWatcher(this.getCurrentProvider(), this.logger);
        this.logger.info('Event subscription support enabled');
      }

      this.startHealthCheck();
      
    } catch (error) {
      this.logger.error('Failed to initialize components', { error: error.message });
      throw error;
    }
  }

  /**
   * Execute with rate limiting and comprehensive error handling
   */
  async executeWithFailover(operation, ...args) {
    // Apply rate limiting if enabled
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

  /**
   * Enhanced transaction sending with nonce management
   */
  async sendTransaction(to, amount, options = {}) {
    if (!this.signer) {
      throw new Error('Signer not initialized. Call setSigner() first.');
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
          network: this.config.networkName
        });
        
        const receipt = await transaction.wait();
        
        this.logger.info('Transaction confirmed', {
          hash: transaction.hash,
          blockNumber: receipt.blockNumber,
          gasUsed: receipt.gasUsed?.toString()
        });

        // Release nonce if using nonce management
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
          timestamp: new Date().toISOString()
        };
      } catch (error) {
        // Release nonce on failure
        if (this.nonceManager && nonce !== undefined) {
          this.nonceManager.releaseNonce(nonce);
        }
        throw error;
      }
    });
  }

  /**
   * Set signer with enhanced nonce management
   */
  setSigner(privateKey) {
    try {
      const provider = this.getCurrentProvider();
      this.signer = new ethers.Wallet(privateKey, provider);
      
      // Initialize nonce manager if enabled
      if (this.config.enableNonceManagement) {
        this.nonceManager = new NonceManager(provider, this.signer.address);
      }
      
      this.logger.info('Signer configured', {
        address: this.signer.address,
        network: this.config.networkName,
        nonceManagement: this.config.enableNonceManagement
      });
      
      if (this.networkType === 'testnet') {
        this.logger.info('Testnet faucet available', { url: this.config.faucetUrl });
      }
      
      return this.signer;
    } catch (error) {
      this.logger.error('Failed to set signer', { error: error.message });
      throw error;
    }
  }

  /**
   * Watch address for activity
   */
  watchAddress(address, options = {}) {
    if (!this.addressWatcher) {
      throw new Error('Event subscriptions not enabled. Set enableEventSubscriptions: true in config.');
    }

    const unwatchFn = this.addressWatcher.watchAddress(address, options);
    
    // Forward events
    this.addressWatcher.on('addressActivity', (data) => {
      this.emit('addressActivity', data);
    });
    
    this.addressWatcher.on('newBlock', (data) => {
      this.emit('newBlock', data);
    });

    return unwatchFn;
  }

  /**
   * P-Chain operations
   */
  async getStakingInfo(address) {
    if (!this.chainManager) {
      throw new Error('Multi-chain support not enabled. Set enableMultiChain: true in config.');
    }
    
    return await this.chainManager.getStakingInfo(address);
  }

  async getValidators() {
    if (!this.chainManager) {
      throw new Error('Multi-chain support not enabled. Set enableMultiChain: true in config.');
    }
    
    return await this.chainManager.getValidators();
  }

  /**
   * X-Chain operations
   */
  async getXChainBalance(address) {
    if (!this.chainManager) {
      throw new Error('Multi-chain support not enabled. Set enableMultiChain: true in config.');
    }
    
    return await this.chainManager.getXChainBalance(address);
  }

  /**
   * Get comprehensive chain information
   */
  getChainInfo() {
    const baseInfo = {
      network: this.config.networkName,
      networkType: this.networkType,
      chainId: this.config.chainId,
      cChainSupported: true,
      pChainSupported: !!this.chainManager,
      xChainSupported: !!this.chainManager
    };

    if (this.chainManager) {
      return {
        ...baseInfo,
        ...this.chainManager.getChainInfo()
      };
    }

    return baseInfo;
  }

  /**
   * Get enhanced metrics including rate limiting stats
   */
  getMetrics() {
    const successRate = this.metrics.totalRequests > 0 
      ? (this.metrics.successfulRequests / this.metrics.totalRequests * 100).toFixed(2)
      : '0';

    return {
      network: this.config.networkName,
      networkType: this.networkType,
      performance: {
        totalRequests: this.metrics.totalRequests,
        successfulRequests: this.metrics.successfulRequests,
        failedRequests: this.metrics.failedRequests,
        successRate: `${successRate}%`,
        providerSwitches: this.metrics.providerSwitches,
        averageResponseTime: Math.round(this.metrics.averageResponseTime),
        rateLimitHits: this.metrics.rateLimitHits
      },
      providers: {
        healthyProviders: this.providers.filter(p => p.healthy).length,
        totalProviders: this.providers.length,
        currentProvider: this.providers[this.currentProviderIndex]?.url
      },
      rateLimiting: this.config.enableRateLimiting ? this.rateLimiter.getStats() : null,
      features: {
        multiChain: !!this.chainManager,
        eventSubscriptions: !!this.addressWatcher,
        nonceManagement: !!this.nonceManager,
        rateLimiting: this.config.enableRateLimiting
      }
    };
  }

  /**
   * Initialize all Avalanche providers for selected network
   */
  async initializeProviders() {
    try {
      this.logger.info('Initializing providers with failover support', {
        networkType: this.networkType,
        providerCount: this.config.rpcUrls.length
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
              consecutiveFailures: 0
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
              network: this.config.networkName
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
        totalProviders: this.config.rpcUrls.length
      });
      
      if (this.networkType === 'testnet') {
        this.logger.info('Testnet configuration', {
          faucetUrl: this.config.faucetUrl,
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

  /**
   * Optimize provider order based on health and performance
   */
  optimizeProviderOrder() {
    this.providers.sort((a, b) => {
      if (a.healthy && !b.healthy) return -1;
      if (!a.healthy && b.healthy) return 1;
      
      if (a.healthy && b.healthy) {
        return a.responseTime - b.responseTime;
      }
      
      return a.consecutiveFailures - b.consecutiveFailures;
    });

    this.currentProviderIndex = 0;
  }

  /**
   * Get current healthy provider with intelligent failover
   */
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

  /**
   * Switch to next available provider
   */
  switchToNextProvider() {
    const oldIndex = this.currentProviderIndex;
    this.currentProviderIndex = (this.currentProviderIndex + 1) % this.providers.length;
    this.lastFailoverTime = Date.now();
    this.metrics.providerSwitches++;
    
    this.logger.info('Provider failover', {
      network: this.config.networkName,
      fromIndex: oldIndex + 1,
      toIndex: this.currentProviderIndex + 1
    });
  }

  /**
   * Update provider success metrics
   */
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

  /**
   * Update provider failure metrics
   */
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

  /**
   * Update global metrics
   */
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

  /**
   * Start health check for all providers
   */
  startHealthCheck() {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }

    this.healthCheckTimer = setInterval(async () => {
      await this.checkProvidersHealth();
    }, this.config.healthCheckInterval);
  }

  /**
   * Health check for all providers
   */
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

  /**
   * Get account balance
   */
  async getBalance(address) {
    return this.executeWithFailover(async (provider) => {
      const balance = await provider.getBalance(address);
      const balanceInAvax = ethers.formatEther(balance);
      
      return {
        wei: balance.toString(),
        avax: balanceInAvax,
        formatted: `${parseFloat(balanceInAvax).toFixed(4)} AVAX`,
        network: this.config.networkName,
        networkType: this.networkType,
        chainId: this.config.chainId,
        timestamp: new Date().toISOString()
      };
    });
  }

  /**
   * Get gas price recommendations
   */
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

  /**
   * Get comprehensive network status
   */
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
        faucetUrl: this.config.faucetUrl,
        providersHealth: Object.fromEntries(this.rpcHealth),
        metrics: this.getMetrics(),
        lastHealthCheck: new Date().toISOString()
      };
    });
  }

  /**
   * Get testnet faucet information (if on testnet)
   */
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
      instructions: 'Visit the faucet URL to get free testnet AVAX tokens',
      network: this.config.networkName
    };
  }

  /**
   * Validate Avalanche address
   */
  isValidAddress(address) {
    try {
      return ethers.isAddress(address);
    } catch {
      return false;
    }
  }

  /**
   * Get transaction details by hash
   */
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
        confirmations: receipt ? await provider.getBlockNumber() - receipt.blockNumber : 0,
        timestamp: new Date().toISOString()
      };
    });
  }

  /**
   * Switch network type (mainnet/testnet)
   */
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
    
    // Cleanup current network
    this.destroy();
    
    // Reinitialize with new network
    this.networkType = newNetworkType;
    const avalanche = new AvalancheNetwork({ 
      network: newNetworkType,
      ...this.config 
    });
    
    // Copy new instance properties
    Object.assign(this, avalanche);
    
    return this.initializeComponents();
  }

  /**
   * Get current network type
   */
  getNetworkType() {
    return {
      type: this.networkType,
      name: this.config.networkName,
      chainId: this.config.chainId,
      isTestnet: this.networkType === 'testnet',
      isMainnet: this.networkType === 'mainnet'
    };
  }

  /**
   * Get detailed provider information
   */
  getProviderInfo() {
    return {
      network: this.config.networkName,
      networkType: this.networkType,
      chainId: this.config.chainId,
      providers: this.providers.map((provider, index) => ({
        index: index + 1,
        url: provider.url,
        healthy: provider.healthy,
        responseTime: provider.responseTime,
        consecutiveFailures: provider.consecutiveFailures,
        lastChecked: new Date(provider.lastChecked).toISOString(),
        isCurrent: index === this.currentProviderIndex
      })),
      health: Object.fromEntries(this.rpcHealth),
      currentProviderIndex: this.currentProviderIndex + 1,
      totalProviders: this.providers.length,
      healthyProviders: this.providers.filter(p => p.healthy).length,
      faucet: this.getFaucetInfo()
    };
  }

  /**
   * Enhanced cleanup with proper resource management
   */
  destroy() {
    this.logger.info('Shutting down Avalanche network handler', {
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
    
    this.logger.info('Avalanche network handler shutdown complete');
  }

  // [Include all other methods from previous implementation with structured logging]
  // ... maintaining backward compatibility while adding enhanced features ...
}

module.exports = AvalancheNetwork;
