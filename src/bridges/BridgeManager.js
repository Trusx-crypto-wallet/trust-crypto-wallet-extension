import { EventEmitter } from 'events';
import { createHash, randomBytes } from 'crypto';
import * as protocols from './protocols/index.js';
import { BridgeError, UnsupportedProtocolError, InsufficientFundsError, NetworkError } from '../errors/BridgeErrors.js';
import logger from '../utils/logger.js';

/**
 * Production-grade BridgeManager for cross-chain operations
 * Implements enterprise-level reliability, security, and monitoring
 */
export default class BridgeManager extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.config = {
      // Core configuration
      timeout: config.timeout || 300000, // 5 minutes
      retryAttempts: config.retryAttempts || 5,
      retryBackoffMs: config.retryBackoffMs || 1000,
      maxRetryBackoffMs: config.maxRetryBackoffMs || 30000,
      
      // Security
      maxConcurrentBridges: config.maxConcurrentBridges || 10,
      rateLimitWindow: config.rateLimitWindow || 60000,
      rateLimitRequests: config.rateLimitRequests || 100,
      
      // Protocol configuration
      supportedProtocols: config.supportedProtocols || ['wormhole', 'layerzero', 'axelar', 'stargate'],
      protocolWeights: config.protocolWeights || {},
      
      // Circuit breaker
      circuitBreakerThreshold: config.circuitBreakerThreshold || 5,
      circuitBreakerTimeout: config.circuitBreakerTimeout || 300000,
      
      // Monitoring
      metricsEnabled: config.metricsEnabled !== false,
      healthCheckInterval: config.healthCheckInterval || 30000,
      
      ...config
    };
    
    // Core state
    this.bridges = new Map();
    this.protocolCapabilities = new Map();
    this.initialized = false;
    this.shutdown = false;
    
    // Security & Rate limiting
    this.activeBridges = new Set();
    this.rateLimitMap = new Map();
    this.nonceTracker = new Map();
    
    // Circuit breaker state
    this.circuitBreakers = new Map();
    
    // Transaction state management
    this.pendingTransactions = new Map();
    this.transactionHistory = new Map();
    
    // Monitoring
    this.metrics = {
      bridgesExecuted: 0,
      bridgesSuccessful: 0,
      bridgesFailed: 0,
      totalVolume: 0n,
      avgExecutionTime: 0,
      protocolUsage: new Map()
    };
    
    this.healthCheckTimer = null;
    this.startTime = Date.now();
    
    this._setupHealthMonitoring();
    this._setupGracefulShutdown();
    
    logger.info('Production BridgeManager initialized', {
      supportedProtocols: this.config.supportedProtocols,
      securityFeatures: ['rate_limiting', 'circuit_breaker', 'nonce_tracking', 'transaction_monitoring']
    });
  }

  /**
   * Initialize all bridge protocols with comprehensive error handling
   */
  async initializeBridges() {
    if (this.initialized) {
      logger.warn('BridgeManager already initialized');
      return;
    }

    const startTime = Date.now();
    const initResults = new Map();
    
    try {
      logger.info('Initializing bridge protocols with production safeguards...');
      
      // Initialize protocols with timeout and error isolation
      const initPromises = this.config.supportedProtocols.map(async (protocolName) => {
        const protocolStartTime = Date.now();
        
        try {
          const ProtocolClass = protocols[protocolName];
          if (!ProtocolClass) {
            throw new Error(`Protocol class not found: ${protocolName}`);
          }

          // Initialize with timeout
          const protocolInstance = await this._withTimeout(
            new ProtocolClass(this.config[protocolName] || {}).initialize(),
            this.config.timeout,
            `Protocol ${protocolName} initialization timeout`
          );
          
          // Validate protocol implementation
          this._validateProtocolImplementation(protocolInstance, protocolName);
          
          // Store protocol and capabilities
          this.bridges.set(protocolName, protocolInstance);
          this.protocolCapabilities.set(protocolName, protocolInstance.getCapabilities());
          
          // Initialize circuit breaker
          this.circuitBreakers.set(protocolName, {
            failures: 0,
            lastFailure: null,
            state: 'CLOSED' // CLOSED, OPEN, HALF_OPEN
          });
          
          const initTime = Date.now() - protocolStartTime;
          initResults.set(protocolName, { success: true, initTime });
          
          logger.info(`Protocol ${protocolName} initialized successfully`, { initTime });
          this.emit('protocolInitialized', { protocol: protocolName, initTime });
          
        } catch (error) {
          const initTime = Date.now() - protocolStartTime;
          initResults.set(protocolName, { success: false, error: error.message, initTime });
          
          logger.error(`Failed to initialize protocol ${protocolName}:`, {
            error: error.message,
            stack: error.stack,
            initTime
          });
          
          this.emit('protocolError', { protocol: protocolName, error, initTime });
        }
      });

      await Promise.allSettled(initPromises);
      
      // Validate at least one protocol initialized successfully
      if (this.bridges.size === 0) {
        throw new BridgeError('No bridge protocols initialized successfully');
      }
      
      this.initialized = true;
      const totalInitTime = Date.now() - startTime;
      
      logger.info('Bridge initialization complete', {
        successfulProtocols: Array.from(this.bridges.keys()),
        failedProtocols: Array.from(initResults.entries())
          .filter(([, result]) => !result.success)
          .map(([protocol]) => protocol),
        totalInitTime,
        results: Object.fromEntries(initResults)
      });
      
      this.emit('initialized', {
        protocols: Array.from(this.bridges.keys()),
        initTime: totalInitTime,
        results: Object.fromEntries(initResults)
      });
      
    } catch (error) {
      logger.error('Critical bridge initialization failure:', error);
      throw new BridgeError('Failed to initialize bridge system', error);
    }
  }

  /**
   * Get bridge instance with circuit breaker protection
   */
  getBridge(protocol) {
    if (!this.initialized) {
      throw new BridgeError('BridgeManager not initialized');
    }
    
    if (this.shutdown) {
      throw new BridgeError('BridgeManager is shutting down');
    }
    
    const bridge = this.bridges.get(protocol);
    if (!bridge) {
      return null;
    }
    
    // Check circuit breaker
    const circuitBreaker = this.circuitBreakers.get(protocol);
    if (circuitBreaker?.state === 'OPEN') {
      const timeSinceLastFailure = Date.now() - circuitBreaker.lastFailure;
      if (timeSinceLastFailure < this.config.circuitBreakerTimeout) {
        throw new BridgeError(`Protocol ${protocol} circuit breaker is OPEN`);
      } else {
        // Transition to HALF_OPEN
        circuitBreaker.state = 'HALF_OPEN';
        logger.info(`Circuit breaker transitioning to HALF_OPEN for protocol ${protocol}`);
      }
    }
    
    return bridge;
  }

  /**
   * Get supported protocols with health status
   */
  getSupportedProtocols() {
    return Array.from(this.bridges.keys()).filter(protocol => {
      const circuitBreaker = this.circuitBreakers.get(protocol);
      return circuitBreaker?.state !== 'OPEN';
    });
  }

  /**
   * Estimate bridge fee with comprehensive validation and caching
   */
  async estimateBridgeFee(params) {
    const requestId = this._generateRequestId();
    const startTime = Date.now();
    
    try {
      // Rate limiting
      await this._checkRateLimit(params.userAddress || 'anonymous');
      
      // Comprehensive validation
      this.validateBridgeParams(params);
      
      const { protocol, sourceChain, targetChain, amount, token } = params;
      const bridge = this.getBridge(protocol);
      
      if (!bridge) {
        throw new UnsupportedProtocolError(`Protocol ${protocol} not available`);
      }

      // Check protocol capabilities
      const capabilities = this.getProtocolCapabilities(protocol);
      this._validateChainSupport(capabilities, sourceChain, targetChain);
      this._validateTokenSupport(capabilities, token);
      this._validateAmountLimits(capabilities, amount);

      logger.debug('Estimating bridge fee', { requestId, ...params });
      
      // Execute fee estimation with retry logic
      const feeEstimate = await this._executeWithRetry(
        () => bridge.estimateFee({
          sourceChain,
          targetChain,
          amount,
          token,
          gasPrice: params.gasPrice,
          recipient: params.recipient
        }),
        protocol,
        'estimateFee'
      );

      const executionTime = Date.now() - startTime;
      
      // Enhanced fee estimate with additional metadata
      const enhancedEstimate = {
        ...feeEstimate,
        protocol,
        requestId,
        timestamp: Date.now(),
        executionTime,
        chainInfo: {
          sourceChain,
          targetChain,
          estimatedConfirmations: capabilities.estimatedConfirmations?.[sourceChain] || 12
        },
        riskAssessment: this._assessTransactionRisk(params, capabilities)
      };

      this.emit('feeEstimated', { params, estimate: enhancedEstimate, requestId });
      
      return enhancedEstimate;
      
    } catch (error) {
      const executionTime = Date.now() - startTime;
      logger.error('Fee estimation failed:', { error: error.message, requestId, executionTime });
      this.emit('error', { type: 'feeEstimation', error, params, requestId });
      
      this._handleCircuitBreaker(params.protocol, error);
      throw error;
    }
  }

  /**
   * Execute bridge transaction with full production safeguards
   */
  async executeBridge(params) {
    const transactionId = this._generateTransactionId();
    const startTime = Date.now();
    
    try {
      // Pre-execution security checks
      await this._performSecurityChecks(params, transactionId);
      
      // Comprehensive validation
      this.validateBridgeParams(params);
      
      const { protocol, sourceChain, targetChain, amount, token, recipient } = params;
      const bridge = this.getBridge(protocol);
      
      if (!bridge) {
        throw new UnsupportedProtocolError(`Protocol ${protocol} not available`);
      }

      // Duplicate transaction check
      const txHash = this._generateTransactionHash(params);
      if (this.transactionHistory.has(txHash)) {
        throw new BridgeError('Duplicate transaction detected');
      }

      // Concurrency control
      if (this.activeBridges.size >= this.config.maxConcurrentBridges) {
        throw new BridgeError('Maximum concurrent bridges limit reached');
      }

      // Protocol-specific validation
      const capabilities = this.getProtocolCapabilities(protocol);
      this._validateChainSupport(capabilities, sourceChain, targetChain);
      this._validateTokenSupport(capabilities, token);
      this._validateAmountLimits(capabilities, amount);

      logger.info('Executing bridge transaction', {
        transactionId,
        protocol,
        sourceChain,
        targetChain,
        amount: amount.toString(),
        token,
        recipient
      });

      // Track transaction state
      this.activeBridges.add(transactionId);
      this.pendingTransactions.set(transactionId, {
        params,
        startTime,
        status: 'PENDING'
      });

      this.emit('bridgeStarted', { params, transactionId });

      // Execute bridge with comprehensive monitoring
      const bridgeParams = {
        sourceChain,
        targetChain,
        amount,
        token,
        recipient,
        slippage: params.slippage || 0.005,
        deadline: params.deadline || Date.now() + (30 * 60 * 1000),
        nonce: this._generateNonce(params.userAddress || 'system'),
        metadata: {
          transactionId,
          userAddress: params.userAddress,
          timestamp: startTime
        }
      };

      const result = await this._executeWithRetry(
        () => bridge.executeBridge(bridgeParams),
        protocol,
        'executeBridge'
      );

      const executionTime = Date.now() - startTime;

      // Enhanced result with tracking information
      const enhancedResult = {
        ...result,
        transactionId,
        protocol,
        sourceChain,
        targetChain,
        executionTime,
        timestamp: Date.now(),
        status: 'COMPLETED',
        confirmations: {
          required: capabilities.requiredConfirmations?.[sourceChain] || 12,
          current: 0
        }
      };

      // Update tracking
      this.transactionHistory.set(txHash, enhancedResult);
      this.pendingTransactions.delete(transactionId);
      this.activeBridges.delete(transactionId);

      // Update metrics
      this._updateMetrics(protocol, amount, executionTime, true);

      // Handle circuit breaker success
      this._handleCircuitBreakerSuccess(protocol);

      logger.info('Bridge transaction completed successfully', {
        transactionId,
        txHash: result.txHash,
        protocol,
        executionTime
      });

      this.emit('bridgeCompleted', { params, result: enhancedResult, transactionId });
      
      // Start confirmation monitoring
      this._monitorTransactionConfirmations(enhancedResult, bridge);
      
      return enhancedResult;
      
    } catch (error) {
      const executionTime = Date.now() - startTime;
      
      // Cleanup on failure
      this.activeBridges.delete(transactionId);
      const pendingTx = this.pendingTransactions.get(transactionId);
      if (pendingTx) {
        pendingTx.status = 'FAILED';
        pendingTx.error = error.message;
      }

      // Update metrics
      this._updateMetrics(params.protocol, params.amount, executionTime, false);

      // Handle circuit breaker
      this._handleCircuitBreaker(params.protocol, error);

      logger.error('Bridge execution failed:', {
        error: error.message,
        transactionId,
        executionTime,
        stack: error.stack
      });

      this.emit('bridgeError', { params, error, transactionId });
      
      // Transform specific errors
      if (error.code === 'INSUFFICIENT_FUNDS') {
        throw new InsufficientFundsError(error.message);
      } else if (error.code === 'NETWORK_ERROR') {
        throw new NetworkError(error.message);
      }
      
      throw error;
    }
  }

  /**
   * Comprehensive parameter validation with security checks
   */
  validateBridgeParams(params) {
    const required = ['protocol', 'sourceChain', 'targetChain', 'amount', 'token'];
    const missing = required.filter(field => !params[field]);
    
    if (missing.length > 0) {
      throw new BridgeError(`Missing required parameters: ${missing.join(', ')}`);
    }

    if (!this.isProtocolSupported(params.protocol)) {
      throw new UnsupportedProtocolError(`Protocol ${params.protocol} not supported`);
    }

    if (params.sourceChain === params.targetChain) {
      throw new BridgeError('Source and target chains cannot be the same');
    }

    if (typeof params.amount !== 'bigint' && typeof params.amount !== 'number') {
      throw new BridgeError('Amount must be a number or bigint');
    }

    if (params.amount <= 0) {
      throw new BridgeError('Amount must be greater than 0');
    }

    // Security validations
    if (params.recipient && !this._isValidAddress(params.recipient, params.targetChain)) {
      throw new BridgeError('Invalid recipient address format');
    }

    if (params.slippage && (params.slippage < 0 || params.slippage > 0.1)) {
      throw new BridgeError('Slippage must be between 0 and 10%');
    }

    if (params.deadline && params.deadline <= Date.now()) {
      throw new BridgeError('Deadline must be in the future');
    }

    // Additional security checks
    this._validateTokenAddress(params.token, params.sourceChain);
    this._validateAmountSanity(params.amount, params.token);
  }

  /**
   * Check protocol support with health status
   */
  isProtocolSupported(protocol) {
    if (!this.bridges.has(protocol)) {
      return false;
    }
    
    const circuitBreaker = this.circuitBreakers.get(protocol);
    return circuitBreaker?.state !== 'OPEN';
  }

  /**
   * Get protocol capabilities with real-time status
   */
  getProtocolCapabilities(protocol) {
    if (!this.isProtocolSupported(protocol)) {
      throw new UnsupportedProtocolError(`Protocol ${protocol} not supported or unavailable`);
    }
    
    const baseCapabilities = this.protocolCapabilities.get(protocol);
    const circuitBreaker = this.circuitBreakers.get(protocol);
    
    return {
      ...baseCapabilities,
      status: {
        available: circuitBreaker?.state !== 'OPEN',
        circuitBreakerState: circuitBreaker?.state,
        lastFailure: circuitBreaker?.lastFailure,
        failures: circuitBreaker?.failures
      }
    };
  }

  // ===== PRIVATE METHODS - PRODUCTION SAFEGUARDS =====

  async _performSecurityChecks(params, transactionId) {
    // Rate limiting
    await this._checkRateLimit(params.userAddress || 'anonymous');
    
    // Additional security validations can be added here
    // - AML/KYC checks
    // - Blacklist validation
    // - Regulatory compliance
    
    logger.debug('Security checks passed', { transactionId });
  }

  async _checkRateLimit(identifier) {
    const now = Date.now();
    const windowStart = now - this.config.rateLimitWindow;
    
    if (!this.rateLimitMap.has(identifier)) {
      this.rateLimitMap.set(identifier, []);
    }
    
    const requests = this.rateLimitMap.get(identifier);
    
    // Remove old requests outside the window
    while (requests.length > 0 && requests[0] < windowStart) {
      requests.shift();
    }
    
    if (requests.length >= this.config.rateLimitRequests) {
      throw new BridgeError(`Rate limit exceeded for ${identifier}`);
    }
    
    requests.push(now);
  }

  async _executeWithRetry(operation, protocol, operationType) {
    let lastError;
    
    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      try {
        const result = await this._withTimeout(operation(), this.config.timeout);
        
        if (attempt > 1) {
          logger.info(`Operation succeeded on attempt ${attempt}`, { protocol, operationType });
        }
        
        return result;
        
      } catch (error) {
        lastError = error;
        
        if (attempt === this.config.retryAttempts) {
          break;
        }
        
        if (!this._isRetryableError(error)) {
          throw error;
        }
        
        const backoffTime = Math.min(
          this.config.retryBackoffMs * Math.pow(2, attempt - 1),
          this.config.maxRetryBackoffMs
        );
        
        logger.warn(`Operation failed, retrying in ${backoffTime}ms`, {
          protocol,
          operationType,
          attempt,
          error: error.message
        });
        
        await this._sleep(backoffTime);
      }
    }
    
    throw lastError;
  }

  _isRetryableError(error) {
    const retryableCodes = ['NETWORK_ERROR', 'TIMEOUT', 'RATE_LIMITED', 'TEMPORARY_FAILURE'];
    return retryableCodes.includes(error.code) || error.message.includes('timeout');
  }

  async _withTimeout(promise, timeoutMs, timeoutMessage = 'Operation timeout') {
    return Promise.race([
      promise,
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs)
      )
    ]);
  }

  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  _handleCircuitBreaker(protocol, error) {
    const circuitBreaker = this.circuitBreakers.get(protocol);
    if (!circuitBreaker) return;
    
    circuitBreaker.failures++;
    circuitBreaker.lastFailure = Date.now();
    
    if (circuitBreaker.failures >= this.config.circuitBreakerThreshold) {
      circuitBreaker.state = 'OPEN';
      logger.error(`Circuit breaker OPENED for protocol ${protocol}`, {
        failures: circuitBreaker.failures,
        error: error.message
      });
      
      this.emit('circuitBreakerOpen', { protocol, failures: circuitBreaker.failures });
    }
  }

  _handleCircuitBreakerSuccess(protocol) {
    const circuitBreaker = this.circuitBreakers.get(protocol);
    if (!circuitBreaker) return;
    
    if (circuitBreaker.state === 'HALF_OPEN') {
      circuitBreaker.state = 'CLOSED';
      circuitBreaker.failures = 0;
      logger.info(`Circuit breaker CLOSED for protocol ${protocol}`);
      this.emit('circuitBreakerClosed', { protocol });
    } else if (circuitBreaker.failures > 0) {
      circuitBreaker.failures = Math.max(0, circuitBreaker.failures - 1);
    }
  }

  _validateProtocolImplementation(protocol, name) {
    const requiredMethods = ['initialize', 'estimateFee', 'executeBridge', 'getCapabilities'];
    
    for (const method of requiredMethods) {
      if (typeof protocol[method] !== 'function') {
        throw new Error(`Protocol ${name} missing required method: ${method}`);
      }
    }
  }

  _validateChainSupport(capabilities, sourceChain, targetChain) {
    if (!capabilities.supportedChains.includes(sourceChain)) {
      throw new UnsupportedProtocolError(`Source chain ${sourceChain} not supported`);
    }
    
    if (!capabilities.supportedChains.includes(targetChain)) {
      throw new UnsupportedProtocolError(`Target chain ${targetChain} not supported`);
    }
  }

  _validateTokenSupport(capabilities, token) {
    if (capabilities.supportedTokens && capabilities.supportedTokens.length > 0) {
      if (!capabilities.supportedTokens.includes(token)) {
        throw new UnsupportedProtocolError(`Token ${token} not supported`);
      }
    }
  }

  _validateAmountLimits(capabilities, amount) {
    if (capabilities.minAmount && amount < capabilities.minAmount) {
      throw new BridgeError(`Amount below minimum: ${capabilities.minAmount}`);
    }
    
    if (capabilities.maxAmount && amount > capabilities.maxAmount) {
      throw new BridgeError(`Amount above maximum: ${capabilities.maxAmount}`);
    }
  }

  _validateTokenAddress(token, chain) {
    // Enhanced token address validation
    if (!this._isValidAddress(token, chain)) {
      throw new BridgeError(`Invalid token address for chain ${chain}`);
    }
  }

  _validateAmountSanity(amount, token) {
    // Sanity check for unreasonably large amounts
    const maxSaneAmount = BigInt('1000000000000000000000000'); // 1M tokens with 18 decimals
    if (typeof amount === 'bigint' && amount > maxSaneAmount) {
      throw new BridgeError('Amount exceeds sanity limits');
    }
  }

  _isValidAddress(address, chain) {
    if (!address || typeof address !== 'string') return false;
    
    const validators = {
      ethereum: /^0x[a-fA-F0-9]{40}$/,
      polygon: /^0x[a-fA-F0-9]{40}$/,
      bsc: /^0x[a-fA-F0-9]{40}$/,
      avalanche: /^0x[a-fA-F0-9]{40}$/,
      arbitrum: /^0x[a-fA-F0-9]{40}$/,
      optimism: /^0x[a-fA-F0-9]{40}$/,
      solana: /^[1-9A-HJ-NP-Za-km-z]{32,44}$/,
      cosmos: /^cosmos1[qpzry9x8gf2tvdw0s3jn54khce6mua7l]{38}$/,
      osmosis: /^osmo1[qpzry9x8gf2tvdw0s3jn54khce6mua7l]{38}$/
    };
    
    const validator = validators[chain.toLowerCase()];
    return validator ? validator.test(address) : address.length > 0;
  }

  _generateRequestId() {
    return `req_${Date.now()}_${randomBytes(8).toString('hex')}`;
  }

  _generateTransactionId() {
    return `tx_${Date.now()}_${randomBytes(16).toString('hex')}`;
  }

  _generateTransactionHash(params) {
    const hashInput = JSON.stringify({
      protocol: params.protocol,
      sourceChain: params.sourceChain,
      targetChain: params.targetChain,
      amount: params.amount.toString(),
      token: params.token,
      recipient: params.recipient,
      userAddress: params.userAddress
    });
    
    return createHash('sha256').update(hashInput).digest('hex');
  }

  _generateNonce(userAddress) {
    if (!this.nonceTracker.has(userAddress)) {
      this.nonceTracker.set(userAddress, 0);
    }
    
    const currentNonce = this.nonceTracker.get(userAddress);
    this.nonceTracker.set(userAddress, currentNonce + 1);
    
    return currentNonce + 1;
  }

  _assessTransactionRisk(params, capabilities) {
    let riskScore = 0;
    const riskFactors = [];
    
    // Amount-based risk
    if (capabilities.maxAmount && params.amount > capabilities.maxAmount * 0.8) {
      riskScore += 3;
      riskFactors.push('high_amount');
    }
    
    // Chain combination risk
    const riskyCombinations = [
      ['ethereum', 'bsc'],
      ['ethereum', 'polygon']
    ];
    
    if (riskyCombinations.some(([src, tgt]) => 
      params.sourceChain === src && params.targetChain === tgt)) {
      riskScore += 2;
      riskFactors.push('risky_chain_combination');
    }
    
    // Protocol reliability
    const circuitBreaker = this.circuitBreakers.get(params.protocol);
    if (circuitBreaker?.failures > 0) {
      riskScore += circuitBreaker.failures;
      riskFactors.push('protocol_recent_failures');
    }
    
    return {
      score: Math.min(riskScore, 10),
      level: riskScore <= 2 ? 'LOW' : riskScore <= 5 ? 'MEDIUM' : 'HIGH',
      factors: riskFactors
    };
  }

  _updateMetrics(protocol, amount, executionTime, success) {
    this.metrics.bridgesExecuted++;
    
    if (success) {
      this.metrics.bridgesSuccessful++;
      this.metrics.totalVolume += BigInt(amount.toString());
    } else {
      this.metrics.bridgesFailed++;
    }
    
    // Update average execution time
    this.metrics.avgExecutionTime = 
      (this.metrics.avgExecutionTime * (this.metrics.bridgesExecuted - 1) + executionTime) / 
      this.metrics.bridgesExecuted;
    
    // Protocol usage tracking
    const protocolUsage = this.metrics.protocolUsage.get(protocol) || 0;
    this.metrics.protocolUsage.set(protocol, protocolUsage + 1);
  }

  async _monitorTransactionConfirmations(result, bridge) {
    // Transaction confirmation monitoring implementation
    // This would integrate with blockchain monitoring services
    logger.debug('Starting confirmation monitoring', { transactionId: result.transactionId });
  }

  _setupHealthMonitoring() {
    this.healthCheckTimer = setInterval(() => {
      this._performHealthCheck();
    }, this.config.healthCheckInterval);
  }

  _performHealthCheck() {
    const healthStatus = {
      timestamp: Date.now(),
      uptime: Date.now() - this.startTime,
      initialized: this.initialized,
      activeBridges: this.activeBridges.size,
      pendingTransactions: this.pendingTransactions.size,
      protocols: {}
    };
    
    for (const [protocol, circuitBreaker] of this.circuitBreakers) {
      healthStatus.protocols[protocol] = {
        available: circuitBreaker.state !== 'OPEN',
        circuitBreakerState: circuitBreaker.state,
        failures: circuitBreaker.failures
      };
    }
    
    this.emit('healthCheck', healthStatus);
    
    if (this.config.metricsEnabled) {
      logger.debug('Health check completed', healthStatus);
    }
  }

  _setupGracefulShutdown() {
    const gracefulShutdown = async (signal) => {
      logger.info(`Received ${signal}, initiating graceful shutdown...`);
      await this.gracefulShutdown();
      process.exit(0);
    };
    
    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);
  }

  /**
   * Get comprehensive system status
   */
  getStatus() {
    return {
      initialized: this.initialized,
      uptime: Date.now() - this.startTime,
      supportedProtocols: this.getSupportedProtocols(),
      protocolCount: this.bridges.size,
      activeBridges: this.activeBridges.size,
      pendingTransactions: this.pendingTransactions.size,
      metrics: {
        ...this.metrics,
        totalVolume: this.metrics.totalVolume.toString(),
        protocolUsage: Object.fromEntries(this.metrics.protocolUsage),
        successRate: this.metrics.bridgesExecuted > 0 ? 
          (this.metrics.bridgesSuccessful / this.metrics.bridgesExecuted * 100).toFixed(2) + '%' : '0%'
      },
      circuitBreakers: Object.fromEntries(
        Array.from(this.circuitBreakers.entries()).map(([protocol, cb]) => [
          protocol, 
          {
            state: cb.state,
            failures: cb.failures,
            lastFailure: cb.lastFailure,
            timeSinceLastFailure: cb.lastFailure ? Date.now() - cb.lastFailure : null
          }
        ])
      ),
      capabilities: Object.fromEntries(this.protocolCapabilities)
    };
  }

  /**
   * Get detailed metrics for monitoring dashboards
   */
  getMetrics() {
    return {
      ...this.metrics,
      totalVolume: this.metrics.totalVolume.toString(),
      protocolUsage: Object.fromEntries(this.metrics.protocolUsage),
      successRate: this.metrics.bridgesExecuted > 0 ? 
        this.metrics.bridgesSuccessful / this.metrics.bridgesExecuted : 0,
      failureRate: this.metrics.bridgesExecuted > 0 ? 
        this.metrics.bridgesFailed / this.metrics.bridgesExecuted : 0,
      averageExecutionTimeMs: Math.round(this.metrics.avgExecutionTime),
      timestamp: Date.now()
    };
  }

  /**
   * Get transaction history with filtering options
   */
  getTransactionHistory(options = {}) {
    const { 
      limit = 100, 
      offset = 0, 
      protocol, 
      status, 
      sourceChain, 
      targetChain,
      startTime,
      endTime 
    } = options;
    
    let transactions = Array.from(this.transactionHistory.values());
    
    // Apply filters
    if (protocol) {
      transactions = transactions.filter(tx => tx.protocol === protocol);
    }
    
    if (status) {
      transactions = transactions.filter(tx => tx.status === status);
    }
    
    if (sourceChain) {
      transactions = transactions.filter(tx => tx.sourceChain === sourceChain);
    }
    
    if (targetChain) {
      transactions = transactions.filter(tx => tx.targetChain === targetChain);
    }
    
    if (startTime) {
      transactions = transactions.filter(tx => tx.timestamp >= startTime);
    }
    
    if (endTime) {
      transactions = transactions.filter(tx => tx.timestamp <= endTime);
    }
    
    // Sort by timestamp (newest first)
    transactions.sort((a, b) => b.timestamp - a.timestamp);
    
    // Apply pagination
    const total = transactions.length;
    const paginatedTransactions = transactions.slice(offset, offset + limit);
    
    return {
      transactions: paginatedTransactions,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      }
    };
  }

  /**
   * Get pending transactions with detailed status
   */
  getPendingTransactions() {
    return Array.from(this.pendingTransactions.entries()).map(([txId, txData]) => ({
      transactionId: txId,
      ...txData,
      duration: Date.now() - txData.startTime
    }));
  }

  /**
   * Cancel pending transaction (if supported by protocol)
   */
  async cancelTransaction(transactionId) {
    const pendingTx = this.pendingTransactions.get(transactionId);
    if (!pendingTx) {
      throw new BridgeError(`Transaction ${transactionId} not found or not pending`);
    }
    
    const bridge = this.getBridge(pendingTx.params.protocol);
    if (!bridge || typeof bridge.cancelTransaction !== 'function') {
      throw new UnsupportedProtocolError(`Transaction cancellation not supported for protocol ${pendingTx.params.protocol}`);
    }
    
    try {
      logger.info('Cancelling transaction', { transactionId });
      
      const result = await bridge.cancelTransaction(transactionId);
      
      // Update transaction status
      pendingTx.status = 'CANCELLED';
      pendingTx.cancelledAt = Date.now();
      
      this.activeBridges.delete(transactionId);
      this.emit('transactionCancelled', { transactionId, result });
      
      return result;
      
    } catch (error) {
      logger.error('Transaction cancellation failed', { transactionId, error: error.message });
      throw error;
    }
  }

  /**
   * Force circuit breaker state change (admin function)
   */
  setCircuitBreakerState(protocol, state) {
    if (!['OPEN', 'CLOSED', 'HALF_OPEN'].includes(state)) {
      throw new BridgeError('Invalid circuit breaker state');
    }
    
    const circuitBreaker = this.circuitBreakers.get(protocol);
    if (!circuitBreaker) {
      throw new UnsupportedProtocolError(`Protocol ${protocol} not found`);
    }
    
    const oldState = circuitBreaker.state;
    circuitBreaker.state = state;
    
    if (state === 'CLOSED') {
      circuitBreaker.failures = 0;
      circuitBreaker.lastFailure = null;
    }
    
    logger.info(`Circuit breaker state changed for ${protocol}`, { 
      oldState, 
      newState: state 
    });
    
    this.emit('circuitBreakerStateChanged', { protocol, oldState, newState: state });
  }

  /**
   * Reset protocol failure count
   */
  resetProtocolFailures(protocol) {
    const circuitBreaker = this.circuitBreakers.get(protocol);
    if (!circuitBreaker) {
      throw new UnsupportedProtocolError(`Protocol ${protocol} not found`);
    }
    
    circuitBreaker.failures = 0;
    circuitBreaker.lastFailure = null;
    
    logger.info(`Reset failure count for protocol ${protocol}`);
    this.emit('protocolFailuresReset', { protocol });
  }

  /**
   * Update protocol configuration dynamically
   */
  updateProtocolConfig(protocol, config) {
    const bridge = this.bridges.get(protocol);
    if (!bridge) {
      throw new UnsupportedProtocolError(`Protocol ${protocol} not found`);
    }
    
    if (typeof bridge.updateConfig !== 'function') {
      throw new UnsupportedProtocolError(`Dynamic configuration not supported for protocol ${protocol}`);
    }
    
    try {
      bridge.updateConfig(config);
      logger.info(`Protocol configuration updated`, { protocol, config });
      this.emit('protocolConfigUpdated', { protocol, config });
    } catch (error) {
      logger.error('Protocol configuration update failed', { protocol, error: error.message });
      throw error;
    }
  }

  /**
   * Emergency pause all bridge operations
   */
  emergencyPause() {
    logger.warn('Emergency pause activated - stopping all bridge operations');
    
    // Set all circuit breakers to OPEN
    for (const [protocol, circuitBreaker] of this.circuitBreakers) {
      circuitBreaker.state = 'OPEN';
      circuitBreaker.lastFailure = Date.now();
    }
    
    this.shutdown = true;
    this.emit('emergencyPause');
  }

  /**
   * Resume operations after emergency pause
   */
  resumeOperations() {
    logger.info('Resuming bridge operations after emergency pause');
    
    // Reset circuit breakers to CLOSED
    for (const [protocol, circuitBreaker] of this.circuitBreakers) {
      circuitBreaker.state = 'CLOSED';
      circuitBreaker.failures = 0;
      circuitBreaker.lastFailure = null;
    }
    
    this.shutdown = false;
    this.emit('operationsResumed');
  }

  /**
   * Graceful shutdown with cleanup
   */
  async gracefulShutdown() {
    if (this.shutdown) {
      logger.warn('Shutdown already in progress');
      return;
    }
    
    this.shutdown = true;
    logger.info('Initiating graceful shutdown...');
    
    // Stop accepting new requests
    this.emit('shutdownStarted');
    
    // Clear health check timer
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }
    
    // Wait for pending transactions with timeout
    const shutdownTimeout = 60000; // 1 minute
    const startTime = Date.now();
    
    while (this.activeBridges.size > 0 && (Date.now() - startTime) < shutdownTimeout) {
      logger.info(`Waiting for ${this.activeBridges.size} active bridges to complete...`);
      await this._sleep(1000);
    }
    
    if (this.activeBridges.size > 0) {
      logger.warn(`Forcing shutdown with ${this.activeBridges.size} active bridges remaining`);
    }
    
    // Shutdown individual protocols
    const shutdownPromises = Array.from(this.bridges.values()).map(async (bridge) => {
      try {
        if (typeof bridge.shutdown === 'function') {
          await this._withTimeout(bridge.shutdown(), 10000, 'Protocol shutdown timeout');
        }
      } catch (error) {
        logger.error('Error shutting down bridge protocol:', error);
      }
    });

    await Promise.allSettled(shutdownPromises);
    
    // Final cleanup
    this.bridges.clear();
    this.protocolCapabilities.clear();
    this.circuitBreakers.clear();
    this.pendingTransactions.clear();
    this.transactionHistory.clear();
    this.rateLimitMap.clear();
    this.nonceTracker.clear();
    this.activeBridges.clear();
    
    this.initialized = false;
    
    this.emit('shutdown');
    logger.info('Graceful shutdown completed');
  }
}
