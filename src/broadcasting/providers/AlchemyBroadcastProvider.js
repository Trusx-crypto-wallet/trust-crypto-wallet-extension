if (lowerKey.includes('token') || lowerKey.includes('key') || 
            lowerKey.includes('secret') || lowerKey.includes('password') ||
            lowerKey.includes('fingerprint') || lowerKey.includes('apikey') ||
            lowerKey.includes('signature') || lowerKey.includes('private') ||
            lowerKey.includes('auth') || key === 'data' || key === 'input') {
          masked[key] = '***MASKED***';
        } else {
          masked[key] = this._maskSensitiveData(value);
        }
      }
      return masked;
    }

    return data;
  }

  /**
   * Mask API key for secure logging
   * @private
   * @param {string} apiKey - API key to mask
   * @returns {string} Masked API key
   */
  _maskApiKey(apiKey) {
    if (!apiKey || apiKey.length < 8) {
      return '***MASKED***';
    }
    return apiKey.substring(0, 4) + '***' + apiKey.substring(apiKey.length - 4);
  }

  /**
   * Initialize the ethers provider with enhanced Alchemy configuration
   * @private
   */
  _initializeProvider() {
    try {
      const providerOptions = {
        timeout: this.config.timeout
      };

      // Add custom headers if provided
      if (Object.keys(this.config.headers).length > 0) {
        providerOptions.headers = { ...this.config.headers };
      } else {
        providerOptions.headers = {};
      }

      // Add proper Authorization headers for Alchemy
      if (this.apiKey) {
        providerOptions.headers['Authorization'] = `Bearer ${this.apiKey}`;
        providerOptions.headers['Content-Type'] = 'application/json';
        providerOptions.headers['User-Agent'] = 'Trust-Crypto-Wallet/2.0.0 AlchemyBroadcastProvider';
        
        this.logger.debug('Authorization headers configured for Alchemy', {
          hasAuth: true,
          headerCount: Object.keys(providerOptions.headers).length
        });
      }

      // Enhanced HTTPS agent with certificate pinning (inherited from parent)
      if (this.config.rpcUrl.startsWith('https') && this.certificatePinningManager) {
        providerOptions.httpsAgent = new https.Agent({
          checkServerIdentity: (hostname, cert) => {
            const hostnameError = https.checkServerIdentity(hostname, cert);
            if (hostnameError) {
              this.logger.warn('Certificate hostname verification failed', { 
                hostname, 
                error: hostnameError.message 
              });
              return hostnameError;
            }

            this.stats.certificateValidations++;
            if (!this.certificatePinningManager.validateCertificate(cert)) {
              const error = new Error('Certificate failed pinning validation');
              this.logger.error('Certificate pinning validation failed', { hostname });
              return error;
            }

            this.logger.debug('Certificate validation passed', { hostname });
            return undefined;
          },
          rejectUnauthorized: this.config.securitySettings.strictCertValidation
        });
      }

      this.provider = new ethers.JsonRpcProvider(this.config.rpcUrl, this.config.chainId, providerOptions);
      
      this.logger.info('Enhanced Alchemy provider initialized successfully', {
        network: this.network,
        chainId: this.config.chainId,
        hasCustomHeaders: Object.keys(this.config.headers).length > 0,
        hasAuth: !!this.apiKey
      });
      
    } catch (error) {
      this.logger.error('Failed to initialize Alchemy provider', { 
        error: this._maskSensitiveData(error.message),
        network: this.network 
      });
      throw new AlchemyError(
        'Failed to initialize Alchemy RPC provider',
        RPC_ERROR_CODES.CONFIGURATION_ERROR,
        { originalError: this._maskSensitiveData(error.message) }
      );
    }
  }

  /**
   * Override parent's execute method to add Alchemy-specific handling
   * @private
   * @param {Function} requestFn - Request function to execute
   * @returns {Promise} Request result
   */
  async _executeWithRetry(requestFn) {
    // Extract method name for rate limiting
    const methodName = this._extractMethodName(requestFn);
    
    // Check rate limits before making request
    const rateLimitCheck = this.rateLimitTracker.checkRateLimit(methodName, 'alchemy');
    
    if (!rateLimitCheck.allowed) {
      this.alchemyStats.rateLimitHits++;
      
      // Try failover if available and not rate limited
      if (this.enableFailover && this.failoverProvider && !this.alchemyStats.isFailoverActive) {
        this.logger.warn('Alchemy rate limited, attempting failover', {
          reason: rateLimitCheck.reason,
          resetTime: new Date(rateLimitCheck.resetTime).toISOString(),
          method: methodName
        });
        
        return this._executeWithFailover(requestFn);
      }
      
      throw new AlchemyError(
        `Alchemy rate limit exceeded: ${rateLimitCheck.reason}`,
        ALCHEMY_ERROR_CODES.RATE_LIMITED,
        { rateLimitInfo: rateLimitCheck },
        {
          apiKey: this.apiKey,
          network: this.network,
          rateLimitInfo: rateLimitCheck,
          failoverAvailable: !!this.failoverProvider,
          consecutiveFailures: this.alchemyStats.consecutiveFailures,
          computeUnitsUsed: this.alchemyStats.computeUnitsUsed
        }
      );
    }

    try {
      // Record request attempt
      this.rateLimitTracker.recordRequest(methodName, 'alchemy');
      this.alchemyStats.alchemyRequests++;
      
      // Track archive requests
      if (this.enableArchiveNode) {
        this.alchemyStats.archiveRequests++;
      }

      // Execute request through parent class
      const result = await super._executeWithRetry(async () => {
        const response = await requestFn();
        
        // Extract and process Alchemy-specific headers
        if (response && response.headers) {
          this._processAlchemyHeaders(response.headers);
        }
        
        return response;
      });

      // Reset consecutive failure count on success
      this.alchemyStats.consecutiveFailures = 0;
      
      // Deactivate failover if it was active
      if (this.alchemyStats.isFailoverActive) {
        this.alchemyStats.isFailoverActive = false;
        this.logger.info('Alchemy service recovered, deactivating failover');
      }

      return result;

    } catch (error) {
      this.alchemyStats.alchemyFailures++;
      this.alchemyStats.consecutiveFailures++;

      // Map Alchemy-specific errors with enhanced context
      const mappedError = this._mapAlchemyError(error, methodName);
      
      // Check if failover should be activated
      if (this._shouldActivateFailover(mappedError)) {
        return this._executeWithFailover(requestFn);
      }

      throw mappedError;
    }
  }

  /**
   * Extract method name from request function for rate limiting
   * @private
   * @param {Function} requestFn - Request function
   * @returns {string} Method name
   */
  _extractMethodName(requestFn) {
    try {
      const fnString = requestFn.toString();
      
      // Common patterns for method extraction
      const methodPatterns = [
        /method["']?\s*:\s*["']([^"']+)["']/,
        /\.(\w+)\s*\(/,
        /"method"\s*:\s*"([^"]+)"/
      ];
      
      for (const pattern of methodPatterns) {
        const match = fnString.match(pattern);
        if (match && match[1]) {
          return match[1];
        }
      }
      
      // Check for common method names in function string
      const commonMethods = [
        'eth_blockNumber', 'eth_getBalance', 'eth_call', 'eth_estimateGas',
        'eth_sendRawTransaction', 'eth_getLogs', 'eth_getBlock',
        'alchemy_getTokenBalances', 'alchemy_getTokenMetadata'
      ];
      
      for (const method of commonMethods) {
        if (fnString.includes(method)) {
          return method;
        }
      }
      
      return 'default';
    } catch (error) {
      return 'default';
    }
  }

  /**
   * Execute request with failover provider
   * @private
   * @param {Function} requestFn - Request function to execute
   * @returns {Promise} Request result
   */
  async _executeWithFailover(requestFn) {
    if (!this.failoverProvider) {
      throw new AlchemyError(
        'Failover provider not configured',
        ALCHEMY_ERROR_CODES.FAILOVER_ACTIVATED
      );
    }

    try {
      this.alchemyStats.isFailoverActive = true;
      this.alchemyStats.failoverActivations++;
      this.alchemyStats.lastFailoverTime = Date.now();

      this.logger.warn('Activating failover provider', {
        consecutiveFailures: this.alchemyStats.consecutiveFailures,
        failoverActivations: this.alchemyStats.failoverActivations
      });

      // Execute request through failover provider
      const result = await this.failoverProvider._executeWithRetry(requestFn);

      this.logger.info('Failover request successful');
      return result;

    } catch (failoverError) {
      this.logger.error('Failover provider also failed', {
        error: failoverError.message
      });

      throw new AlchemyError(
        'Both Alchemy and failover provider failed',
        ALCHEMY_ERROR_CODES.FAILOVER_ACTIVATED,
        {
          alchemyError: 'Service unavailable',
          failoverError: failoverError.message
        }
      );
    }
  }

  /**
   * Determine if failover should be activated
   * @private
   * @param {Error} error - The error that occurred
   * @returns {boolean} True if failover should be activated
   */
  _shouldActivateFailover(error) {
    if (!this.enableFailover || !this.failoverProvider || this.alchemyStats.isFailoverActive) {
      return false;
    }

    // Activate failover for specific error conditions
    const failoverErrorCodes = [
      ALCHEMY_ERROR_CODES.RATE_LIMITED,
      ALCHEMY_ERROR_CODES.QUOTA_EXCEEDED,
      ALCHEMY_ERROR_CODES.SERVICE_UNAVAILABLE,
      RPC_ERROR_CODES.TIMEOUT,
      RPC_ERROR_CODES.NETWORK_ERROR,
      RPC_ERROR_CODES.CONNECTION_FAILED
    ];

    const shouldFailover = failoverErrorCodes.includes(error.code) ||
                          this.alchemyStats.consecutiveFailures >= this.failoverThreshold;

    return shouldFailover;
  }

  /**
   * Process Alchemy-specific response headers
   * @private
   * @param {Object} headers - HTTP response headers
   */
  _processAlchemyHeaders(headers) {
    try {
      // Update rate limit tracking from headers
      this.rateLimitTracker.updateFromHeaders(headers);

      // Track compute units usage
      if (headers['x-alchemy-compute-units-used']) {
        const computeUnits = parseInt(headers['x-alchemy-compute-units-used'], 10);
        this.alchemyStats.computeUnitsUsed = computeUnits;
        
        // Log warning if approaching limits
        if (computeUnits > this.rateLimitTracker.computeUnitsPerSecond * 0.8) {
          this.logger.warn('Alchemy compute units usage high', {
            used: computeUnits,
            limit: this.rateLimitTracker.computeUnitsPerSecond
          });
        }
      }

      // Check for archive node usage indicators
      if (headers['x-alchemy-archive'] === 'true') {
        this.alchemyStats.archiveRequests++;
      }

    } catch (error) {
      this.logger.debug('Failed to process Alchemy headers', {
        error: error.message
      });
    }
  }

  /**
   * Map Alchemy-specific HTTP errors to custom error codes with enhanced context
   * @private
   * @param {Error} error - Original error
   * @param {string} methodName - RPC method name
   * @returns {AlchemyError} Mapped error with full context
   */
  _mapAlchemyError(error, methodName = 'unknown') {
    // If already an AlchemyError, return as-is
    if (error instanceof AlchemyError) {
      return error;
    }

    let errorCode = RPC_ERROR_CODES.NETWORK_ERROR;
    let message = error.message || 'Unknown Alchemy error';
    let context = { originalError: this._maskSensitiveData(error.message), method: methodName };
    let alchemyContext = {
      apiKey: this.apiKey,
      network: this.network,
      endpoint: this.networkConfig.path,
      consecutiveFailures: this.alchemyStats.consecutiveFailures,
      failoverAvailable: !!this.failoverProvider,
      lastSuccessTime: this.alchemyStats.lastRequestTime,
      computeUnitsUsed: this.alchemyStats.computeUnitsUsed,
      method: methodName
    };

    // Map HTTP status codes to specific Alchemy errors
    if (error.response?.status) {
      switch (error.response.status) {
        case 401:
          errorCode = ALCHEMY_ERROR_CODES.UNAUTHORIZED;
          message = 'Alchemy authentication failed. Check API key.';
          context.suggestion = 'Verify API key and ensure it has required permissions';
          alchemyContext.authenticationIssue = true;
          break;

        case 429:
          errorCode = ALCHEMY_ERROR_CODES.RATE_LIMITED;
          message = 'Alchemy rate limit exceeded';
          context.retryAfter = error.response.headers['retry-after'];
          alchemyContext.rateLimitInfo = {
            retryAfter: error.response.headers['retry-after'],
            computeUnitsUsed: error.response.headers['x-alchemy-compute-units-used']
          };
          break;

        case 403:
          if (error.response.data?.error?.message?.includes('compute unit')) {
            errorCode = ALCHEMY_ERROR_CODES.QUOTA_EXCEEDED;
            message = 'Alchemy compute unit quota exceeded';
          } else {
            errorCode = ALCHEMY_ERROR_CODES.PLAN_LIMIT_EXCEEDED;
            message = 'Alchemy plan limit exceeded or feature not available';
          }
          context.suggestion = 'Check your Alchemy plan limits and feature availability';
          alchemyContext.quotaIssue = true;
          break;

        case 500:
        case 502:
        case 503:
        case 504:
          errorCode = ALCHEMY_ERROR_CODES.SERVICE_UNAVAILABLE;
          message = 'Alchemy service temporarily unavailable';
          context.httpStatus = error.response.status;
          alchemyContext.serviceIssue = true;
          break;

        case 400:
          // Check for archive node requirement
          if (error.response.data?.error?.message?.includes('archive')) {
            errorCode = ALCHEMY_ERROR_CODES.ARCHIVE_REQUIRED;
            message = 'Request requires archive node access';
            context.suggestion = 'Enable archive node support or use a different method';
            alchemyContext.archiveRequired = true;
          }
          break;
      }
    }

    // Check error message for specific patterns
    if (message.includes('API key')) {
      errorCode = ALCHEMY_ERROR_CODES.INVALID_API_KEY;
      alchemyContext.credentialIssue = 'api_key';
    } else if (message.includes('compute unit')) {
      errorCode = ALCHEMY_ERROR_CODES.QUOTA_EXCEEDED;
    } else if (message.includes('rate limit')) {
      errorCode = ALCHEMY_ERROR_CODES.RATE_LIMITED;
    }

    return new AlchemyError(message, errorCode, context, alchemyContext);
  }

  /**
   * Rotate Alchemy API key
   * @param {string} newApiKey - New API key
   * @returns {Promise<boolean>} True if rotation successful
   */
  async rotateKey(newApiKey) {
    if (!newApiKey) {
      throw new AlchemyError(
        'New API key is required for key rotation',
        ALCHEMY_ERROR_CODES.KEY_ROTATION_FAILED
      );
    }

    this.logger.info('Starting Alchemy key rotation', {
      oldApiKeyMasked: this._maskApiKey(this.apiKey),
      newApiKeyMasked: this._maskApiKey(newApiKey)
    });

    try {
      // Validate new API key by building URL
      const newRpcUrl = AlchemyBroadcastProvider._buildAlchemyUrl(
        newApiKey,
        this.networkConfig.path,
        this.enableArchiveNode
      );

      // Test new API key with a simple request
      const testProvider = new RPCBroadcastProvider({
        rpcUrl: newRpcUrl,
        chainId: this.networkConfig.chainId,
        timeout: 10000,
        headers: {
          'Authorization': `Bearer ${newApiKey}`,
          'Content-Type': 'application/json'
        }
      });

      // Perform health check with new API key
      const healthCheck = await testProvider.validateConnection();
      if (!healthCheck.isValid) {
        throw new Error(`Health check failed: ${healthCheck.errors.join(', ')}`);
      }

      // Store old API key for rollback
      const oldApiKey = this.apiKey;
      const oldRpcUrl = this.config.rpcUrl;

      try {
        // Update API key
        this.apiKey = newApiKey;
        this.config.rpcUrl = newRpcUrl;

        // Reinitialize the underlying provider
        this._initializeProvider();

        // Verify the rotation worked
        const verificationCheck = await this.healthCheck();
        if (!verificationCheck.healthy) {
          throw new Error('Post-rotation verification failed');
        }

        this.alchemyStats.keyRotations++;
        
        this.logger.info('Alchemy key rotation completed successfully', {
          rotationCount: this.alchemyStats.keyRotations,
          newApiKeyMasked: this._maskApiKey(newApiKey)
        });

        return true;

      } catch (rotationError) {
        // Rollback on failure
        this.apiKey = oldApiKey;
        this.config.rpcUrl = oldRpcUrl;
        this._initializeProvider();

        throw rotationError;
      }

    } catch (error) {
      this.logger.error('Alchemy key rotation failed', {
        error: error.message,
        newApiKeyMasked: this._maskApiKey(newApiKey)
      });

      throw new AlchemyError(
        `Key rotation failed: ${error.message}`,
        ALCHEMY_ERROR_CODES.KEY_ROTATION_FAILED,
        { originalError: error.message }
      );
    }
  }

  /**
   * Perform comprehensive health check
   * @returns {Promise<Object>} Health check results
   */
  async healthCheck() {
    const startTime = Date.now();
    const healthResult = {
      healthy: false,
      timestamp: new Date().toISOString(),
      checks: {
        alchemyConnectivity: false,
        authentication: false,
        networkValidation: false,
        rateLimitStatus: false,
        failoverAvailable: false,
        archiveNodeAccess: false,
        computeUnitsStatus: false
      },
      alchemyStats: this.getAlchemyStats(),
      responseTime: 0,
      errors: []
    };

    try {
      // Check rate limit status
      const rateLimitCheck = this.rateLimitTracker.checkRateLimit('eth_blockNumber', 'health');
      healthResult.checks.rateLimitStatus = rateLimitCheck.allowed;
      
      if (!rateLimitCheck.allowed) {
        healthResult.errors.push(`Rate limited: ${rateLimitCheck.reason}`);
      }

      // Check compute units status
      const rateLimitStats = this.rateLimitTracker.getStats();
      healthResult.checks.computeUnitsStatus = rateLimitStats.recentActivity.computeUnitsLastSecond < 
        this.rateLimitTracker.computeUnitsPerSecond * 0.9;
      
      if (!healthResult.checks.computeUnitsStatus) {
        healthResult.errors.push('Compute units near limit');
      }

      // Test basic connectivity and authentication
      try {
        const networkInfo = await this.getProvider().getNetwork();
        healthResult.checks.alchemyConnectivity = true;
        healthResult.checks.authentication = true;
        
        // Validate network matches configuration
        if (Number(networkInfo.chainId) === this.networkConfig.chainId) {
          healthResult.checks.networkValidation = true;
        } else {
          healthResult.errors.push(
            `Chain ID mismatch: expected ${this.networkConfig.chainId}, got ${networkInfo.chainId}`
          );
        }
      } catch (error) {
        healthResult.errors.push(`Connectivity test failed: ${error.message}`);
        
        if (error.message.includes('401') || error.message.includes('unauthorized')) {
          healthResult.checks.authentication = false;
        } else {
          healthResult.checks.alchemyConnectivity = false;
        }
      }

      // Test archive node access if enabled
      if (this.enableArchiveNode && this.networkConfig.archiveSupported) {
        try {
          await this.getProvider().getBlock(1);
          healthResult.checks.archiveNodeAccess = true;
        } catch (error) {
          healthResult.errors.push(`Archive node test failed: ${error.message}`);
        }
      } else {
        healthResult.checks.archiveNodeAccess = !this.enableArchiveNode;
      }

      // Check failover provider availability
      if (this.enableFailover && this.failoverProvider) {
        try {
          const failoverHealth = await this.failoverProvider.getHealthStatus();
          healthResult.checks.failoverAvailable = failoverHealth.status === 'healthy';
        } catch (error) {
          healthResult.errors.push(`Failover provider unhealthy: ${error.message}`);
        }
      } else {
        healthResult.checks.failoverAvailable = !this.enableFailover;
      }

      // Overall health determination
      healthResult.healthy = Object.values(healthResult.checks).every(check => check === true);
      healthResult.responseTime = Date.now() - startTime;

      this.logger.info('Alchemy health check completed', {
        healthy: healthResult.healthy,
        responseTime: healthResult.responseTime,
        errorCount: healthResult.errors.length
      });

      return healthResult;

    } catch (error) {
      healthResult.responseTime = Date.now() - startTime;
      healthResult.errors.push(`Health check failed: ${error.message}`);
      
      this.logger.error('Alchemy health check failed', {
        error: error.message,
        responseTime: healthResult.responseTime
      });

      return healthResult;
    }
  }

  /**
   * Add dry-run mode for development and debugging
   * @param {boolean} enabled - Enable dry-run mode
   */
  setDryRunMode(enabled = true) {
    this.alchemyStats.dryRunMode = enabled;
    
    if (enabled) {
      this.logger.warn('Dry-run mode enabled - requests will be simulated', {
        network: this.network,
        apiKeyMasked: this._maskApiKey(this.apiKey)
      });
    } else {
      this.logger.info('Dry-run mode disabled - normal operation resumed');
    }
  }

  /**
   * Override request execution for dry-run mode
   * @private
   * @param {Function} requestFn - Request function to execute
   * @returns {Promise} Simulated or real result
   */
  async _executeWithDryRun(requestFn) {
    if (this.alchemyStats.dryRunMode) {
      return this._simulateRequest(requestFn);
    }
    
    return this._executeWithRetry(requestFn);
  }

  /**
   * Simulate request for dry-run mode
   * @private
   * @param {Function} requestFn - Request function to simulate
   * @returns {Promise} Simulated result
   */
  async _simulateRequest(requestFn) {
    const simulationDelay = 50 + Math.random() * 150; // 50-200ms (faster than Infura)
    
    this.logger.debug('Simulating request in dry-run mode', {
      delay: simulationDelay,
      network: this.network
    });
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, simulationDelay));
    
    // Update stats as if real request happened
    this.alchemyStats.alchemyRequests++;
    const methodName = this._extractMethodName(requestFn);
    this.rateLimitTracker.recordRequest(methodName, 'alchemy');
    
    // Return mock response based on common RPC methods
    const functionString = requestFn.toString();
    
    if (functionString.includes('getBlockNumber')) {
      return { result: '0x' + Math.floor(Math.random() * 1000000).toString(16) };
    } else if (functionString.includes('getBalance')) {
      return { result: '0x' + Math.floor(Math.random() * 1000000000000000000).toString(16) };
    } else if (functionString.includes('getNetwork')) {
      return { result: { chainId: this.networkConfig.chainId, name: this.network } };
    } else if (functionString.includes('alchemy_getTokenBalances')) {
      return { result: { address: '0x...', tokenBalances: [] } };
    } else {
      return { result: 'dry-run-simulation' };
    }
  }

  /**
   * Get Alchemy-specific statistics
   * @returns {Object} Alchemy statistics
   */
  getAlchemyStats() {
    const baseStats = this.getStats();
    const rateLimitStats = this.rateLimitTracker.getStats();
    
    return {
      ...baseStats,
      alchemy: {
        ...this.alchemyStats,
        uptime: Date.now() - this.alchemyStats.startTime,
        successRate: this.alchemyStats.alchemyRequests > 0 ? 
          (this.alchemyStats.alchemyRequests - this.alchemyStats.alchemyFailures) / this.alchemyStats.alchemyRequests : 0,
        averageFailuresBeforeFailover: this.alchemyStats.failoverActivations > 0 ?
          this.alchemyStats.alchemyFailures / this.alchemyStats.failoverActivations : 0,
        computeUnitsEfficiency: this.alchemyStats.alchemyRequests > 0 ?
          this.alchemyStats.computeUnitsUsed / this.alchemyStats.alchemyRequests : 0
      },
      rateLimiting: rateLimitStats,
      network: {
        name: this.network,
        chainId: this.networkConfig.chainId,
        path: this.networkConfig.path,
        archiveSupported: this.networkConfig.archiveSupported,
        archiveEnabled: this.enableArchiveNode,
        testnet: this.networkConfig.testnet
      },
      failover: {
        enabled: this.enableFailover,
        available: this.failoverProvider !== null,
        isActive: this.alchemyStats.isFailoverActive,
        threshold: this.failoverThreshold,
        activations: this.alchemyStats.failoverActivations,
        lastActivation: this.alchemyStats.lastFailoverTime
      }
    };
  }

  /**
   * Export Alchemy-specific metrics for monitoring
   * @param {string} [format='json'] - Export format
   * @returns {Object|string} Metrics in specified format
   */
  exportAlchemyMetrics(format = 'json') {
    const baseMetrics = this.exportMetrics('json');
    const alchemyStats = this.getAlchemyStats();
    
    const alchemyMetrics = {
      ...baseMetrics,
      
      // Alchemy-specific metrics
      alchemy_requests_total: alchemyStats.alchemy.alchemyRequests,
      alchemy_failures_total: alchemyStats.alchemy.alchemyFailures,
      alchemy_success_rate: alchemyStats.alchemy.successRate,
      alchemy_failover_activations: alchemyStats.alchemy.failoverActivations,
      alchemy_consecutive_failures: alchemyStats.alchemy.consecutiveFailures,
      alchemy_is_failover_active: alchemyStats.alchemy.isFailoverActive ? 1 : 0,
      alchemy_key_rotations: alchemyStats.alchemy.keyRotations,
      alchemy_archive_requests: alchemyStats.alchemy.archiveRequests,
      alchemy_rate_limit_hits: alchemyStats.alchemy.rateLimitHits,
      alchemy_compute_units_used: alchemyStats.alchemy.computeUnitsUsed,
      
      // Rate limiting metrics
      alchemy_daily_requests: alchemyStats.rateLimiting.dailyRequests,
      alchemy_daily_limit: alchemyStats.rateLimiting.dailyLimit,
      alchemy_rate_limit_utilization: alchemyStats.rateLimiting.utilizationPercent,
      alchemy_remaining_daily: alchemyStats.rateLimiting.remainingDaily,
      alchemy_compute_units_per_second: alchemyStats.rateLimiting.computeUnitsPerSecond,
      
      // Network metrics
      alchemy_network_chain_id: alchemyStats.network.chainId,
      alchemy_archive_enabled: alchemyStats.network.archiveEnabled ? 1 : 0,
      alchemy_is_testnet: alchemyStats.network.testnet ? 1 : 0,
      
      // Failover metrics
      alchemy_failover_enabled: alchemyStats.failover.enabled ? 1 : 0,
      alchemy_failover_available: alchemyStats.failover.available ? 1 : 0
    };

    if (format === 'prometheus') {
      let prometheusMetrics = this.exportMetrics('prometheus');
      
      // Add Alchemy-specific Prometheus metrics
      const alchemyPrometheusMetrics = [
        '# HELP alchemy_requests_total Total Alchemy requests',
        '# TYPE alchemy_requests_total counter',
        `alchemy_requests_total ${alchemyMetrics.alchemy_requests_total}`,
        '',
        '# HELP alchemy_success_rate Alchemy request success rate',
        '# TYPE alchemy_success_rate gauge', 
        `alchemy_success_rate ${alchemyMetrics.alchemy_success_rate}`,
        '',
        '# HELP alchemy_rate_limit_utilization Alchemy rate limit utilization percentage',
        '# TYPE alchemy_rate_limit_utilization gauge',
        `alchemy_rate_limit_utilization ${alchemyMetrics.alchemy_rate_limit_utilization}`,
        '',
        '# HELP alchemy_compute_units_used Total compute units used',
        '# TYPE alchemy_compute_units_used counter',
        `alchemy_compute_units_used ${alchemyMetrics.alchemy_compute_units_used}`,
        '',
        '# HELP alchemy_failover_active Whether Alchemy failover is currently active',
        '# TYPE alchemy_failover_active gauge',
        `alchemy_failover_active ${alchemyMetrics.alchemy_is_failover_active}`,
        ''
      ].join('\n');
      
      return prometheusMetrics + alchemyPrometheusMetrics;
    }

    return alchemyMetrics;
  }

  /**
   * Get comprehensive diagnostic information
   * @returns {Promise<Object>} Diagnostic information
   */
  async getAlchemyDiagnostics() {
    const diagnostics = await this.getConnectionDiagnostics();
    const healthCheck = await this.healthCheck();
    const stats = this.getAlchemyStats();

    return {
      ...diagnostics,
      timestamp: new Date().toISOString(),
      provider: 'Alchemy',
      alchemySpecific: {
        health: healthCheck,
        configuration: {
          network: this.network,
          chainId: this.networkConfig.chainId,
          archiveNodeEnabled: this.enableArchiveNode,
          failoverEnabled: this.enableFailover,
          apiKeyMasked: this._maskApiKey(this.apiKey),
          isTestnet: this.networkConfig.testnet
        },
        statistics: stats.alchemy,
        rateLimiting: stats.rateLimiting,
        failover: stats.failover
      },
      recommendations: [
        ...diagnostics.recommendations,
        ...this._generateAlchemyRecommendations(stats, healthCheck)
      ]
    };
  }

  /**
   * Generate Alchemy-specific recommendations
   * @private
   * @param {Object} stats - Current statistics
   * @param {Object} healthCheck - Health check results
   * @returns {Array} Array of recommendations
   */
  _generateAlchemyRecommendations(stats, healthCheck) {
    const recommendations = [];

    // Rate limiting recommendations
    if (stats.rateLimiting.utilizationPercent > 80) {
      recommendations.push({
        type: 'rate_limiting',
        priority: 'high',
        message: 'Alchemy usage approaching daily limit',
        actionable: [
          'Consider upgrading Alchemy plan',
          'Implement request caching',
          'Enable failover provider',
          'Optimize compute unit usage'
        ]
      });
    }

    // Compute units recommendations
    if (stats.rateLimiting.recentActivity.computeUnitsLastSecond > stats.rateLimiting.computeUnitsPerSecond * 0.8) {
      recommendations.push({
        type: 'performance',
        priority: 'medium',
        message: 'High compute units usage detected',
        actionable: [
          'Use more efficient RPC methods',
          'Implement request batching',
          'Cache frequently requested data',
          'Consider method-specific optimizations'
        ]
      });
    }

    // Failover recommendations
    if (stats.alchemy.consecutiveFailures > 2 && !this.enableFailover) {
      recommendations.push({
        type: 'reliability',
        priority: 'medium',
        message: 'Multiple consecutive failures detected without failover',
        actionable: [
          'Configure failover provider',
          'Enable automatic failover',
          'Monitor Alchemy service status',
          'Implement retry logic optimization'
        ]
      });
    }

    // Archive node recommendations
    if (this.enableArchiveNode && !healthCheck.checks.archiveNodeAccess) {
      recommendations.push({
        type: 'configuration',
        priority: 'medium',
        message: 'Archive node enabled but not accessible',
        actionable: [
          'Verify Alchemy plan includes archive access',
          'Check if network supports archive nodes',
          'Consider disabling archive mode if not needed',
          'Contact Alchemy support for archive access issues'
        ]
      });
    }

    // Performance recommendations
    if (stats.averageResponseTime > 1000) {
      recommendations.push({
        type: 'performance',
        priority: 'medium',
        message: 'High response times detected with Alchemy',
        actionable: [
          'Check network connectivity to Alchemy',
          'Consider using different Alchemy endpoint',
          'Implement request batching',
          'Enable failover for better performance'
        ]
      });
    }

    // Security recommendations
    if (stats.alchemy.keyRotations === 0 && stats.alchemy.uptime > 7 * 24 * 60 * 60 * 1000) {
      recommendations.push({
        type: 'security',
        priority: 'low',
        message: 'Consider periodic API key rotation for enhanced security',
        actionable: [
          'Implement regular key rotation schedule',
          'Test key rotation procedure',
          'Monitor for key compromise indicators',
          'Use key rotation for maintenance windows'
        ]
      });
    }

    return recommendations;
  }

  /**
   * Enhanced graceful shutdown with comprehensive cleanup
   * @returns {Promise<void>}
   */
  async shutdown() {
    this.logger.info('Initiating enhanced Alchemy provider shutdown');

    try {
      // Log final statistics
      const finalStats = this.getAlchemyStats();
      this.logger.info('Final Alchemy statistics', {
        totalAlchemyRequests: finalStats.alchemy.alchemyRequests,
        successRate: finalStats.alchemy.successRate,
        failoverActivations: finalStats.alchemy.failoverActivations,
        keyRotations: finalStats.alchemy.keyRotations,
        computeUnitsUsed: finalStats.alchemy.computeUnitsUsed,
        uptime: finalStats.alchemy.uptime,
        rateLimitHits: finalStats.alchemy.rateLimitHits,
        dryRunMode: finalStats.alchemy.dryRunMode
      });

      // Cleanup rate limit tracker
      if (this.rateLimitTracker && this.rateLimitTracker.cache) {
        this.rateLimitTracker.cache.cleanup();
      }

      // Shutdown failover provider if exists
      if (this.failoverProvider) {
        await this.failoverProvider.shutdown();
      }

      // Disable dry-run mode
      this.alchemyStats.dryRunMode = false;

      // Call parent shutdown
      await super.shutdown();

      this.logger.info('Enhanced Alchemy provider shutdown completed successfully');

    } catch (error) {
      this.logger.error('Error during enhanced Alchemy provider shutdown', {
        error: this._maskSensitiveData(error.message)
      });
      throw new AlchemyError(
        `Shutdown failed: ${error.message}`,
        RPC_ERROR_CODES.CONFIGURATION_ERROR,
        { shutdownError: true },
        {
          apiKey: this.apiKey,
          network: this.network,
          shutdownPhase: 'cleanup'
        }
      );
    }
  }

  /**
   * Get troubleshooting information with Alchemy-specific guidance
   * @returns {Object} Enhanced troubleshooting guide
   */
  getTroubleshootingInfo() {
    const baseTroubleshooting = super.getTroubleshootingInfo();
    const alchemyStats = this.getAlchemyStats();
    
    return {
      ...baseTroubleshooting,
      alchemySpecific: {
        commonIssues: {
          rateLimiting: {
            symptoms: ['429 HTTP errors', 'Request rejected', 'Compute unit exhaustion'],
            causes: ['High request volume', 'Inefficient method usage', 'No request optimization'],
            solutions: [
              'Upgrade Alchemy plan',
              'Implement request caching',
              'Use more efficient RPC methods',
              'Configure failover provider',
              'Optimize compute unit usage'
            ]
          },
          authentication: {
            symptoms: ['401 HTTP errors', 'Unauthorized access', 'Invalid API key'],
            causes: ['Incorrect API key', 'Expired or suspended account', 'Insufficient permissions'],
            solutions: [
              'Verify API key format and validity',
              'Check API key exists in Alchemy dashboard',
              'Ensure API key has required permissions',
              'Test API key with curl command',
              'Rotate API key if compromised'
            ]
          },
          computeUnits: {
            symptoms: ['Quota exceeded errors', 'Plan limit reached', 'Service degradation'],
            causes: ['Heavy method usage', 'Inefficient request patterns', 'Plan limitations'],
            solutions: [
              'Monitor compute unit usage',
              'Use lighter RPC methods when possible',
              'Implement request batching',
              'Cache frequently requested data',
              'Upgrade to higher tier plan'
            ]
          },
          archiveNode: {
            symptoms: ['Archive data not available', 'Historical block errors'],
            causes: ['Archive not enabled', 'Plan limitations', 'Network not supported'],
            solutions: [
              'Enable archive node in configuration',
              'Verify Alchemy plan includes archive access',
              'Check if network supports archive nodes',
              'Use different historical data method'
            ]
          },
          failover: {
            symptoms: ['Service interruptions', 'High failure rates'],
            causes: ['No fallback configured', 'Failover provider issues'],
            solutions: [
              'Configure reliable failover provider',
              'Test failover mechanisms regularly',
              'Monitor failover provider health',
              'Adjust failover thresholds'
            ]
          }
        },
        diagnosticCommands: [
          'curl -X POST -H "Content-Type: application/json" -H "Authorization: Bearer YOUR_API_KEY" --data \'{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}\' https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY',
          'curl -H "Authorization: Bearer YOUR_API_KEY" https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY',
          'Check Alchemy status page: https://status.alchemy.com/',
          'Monitor compute units in Alchemy dashboard'
        ],
        currentStatus: {
          rateLimitUtilization: `${alchemyStats.rateLimiting.utilizationPercent.toFixed(2)}%`,
          consecutiveFailures: alchemyStats.alchemy.consecutiveFailures,
          failoverActive: alchemyStats.alchemy.isFailoverActive,
          lastFailover: alchemyStats.alchemy.lastFailoverTime ? 
            new Date(alchemyStats.alchemy.lastFailoverTime).toISOString() : 'Never',
          computeUnitsUsed: alchemyStats.alchemy.computeUnitsUsed,
          dryRunMode: alchemyStats.alchemy.dryRunMode
        }
      }
    };
  }
}

/**
 * Factory function to create Alchemy broadcast provider
 * @param {Object} config - Configuration object
 * @returns {AlchemyBroadcastProvider} Configured Alchemy provider instance
 */
export default function createAlchemyBroadcastProvider(config) {
  try {
    return new AlchemyBroadcastProvider(config);
  } catch (error) {
    throw new AlchemyError(
      `Failed to create Alchemy broadcast provider: ${error.message}`,
      error.code || ALCHEMY_ERROR_CODES.INVALID_API_KEY,
      {
        factoryError: true,
        originalError: error.message,
        config: {
          hasApiKey: !!config?.apiKey,
          network: config?.network
        }
      }
    );
  }
}

/**
 * Utility function to validate Alchemy configuration
 * @param {Object} config - Configuration to validate
 * @returns {Object} Validation result
 */
export function validateAlchemyConfig(config) {
  const validation = {
    isValid: true,
    errors: [],
    warnings: [],
    recommendations: []
  };

  try {
    // Validate required fields
    if (!config.apiKey) {
      validation.errors.push('API key is required');
    } else if (!config.apiKey.match(/^[a-zA-Z0-9_-]{20,}$/)) {
      validation.errors.push('API key format appears invalid');
    }

    if (!config.network) {
      validation.errors.push('Network is required');
    } else if (!ALCHEMY_NETWORKS[config.network]) {
      validation.errors.push(`Unsupported network: ${config.network}`);
      validation.recommendations.push(`Supported networks: ${Object.keys(ALCHEMY_NETWORKS).join(', ')}`);
    }

    // Validate optional configurations
    if (config.enableArchiveNode && config.network && !ALCHEMY_NETWORKS[config.network]?.archiveSupported) {
      validation.warnings.push('Archive node requested but not supported for this network');
    }

    if (!config.fallbackProvider && config.enableFailover !== false) {
      validation.recommendations.push('Consider configuring a fallback provider for improved reliability');
    }

    if (config.rateLimitConfig?.requestsPerDay && config.rateLimitConfig.requestsPerDay < 10000) {
      validation.warnings.push('Daily request limit seems low for production usage');
    }

    // Testnet warnings
    if (config.network && ALCHEMY_NETWORKS[config.network]?.testnet) {
      validation.warnings.push('Using testnet - ensure this is intended for your environment');
    }

    validation.isValid = validation.errors.length === 0;

  } catch (error) {
    validation.isValid = false;
    validation.errors.push(`Configuration validation failed: ${error.message}`);
  }

  return validation;
}

/**
 * Utility function to create multiple Alchemy providers with load balancing
 * @param {Array<Object>} configs - Array of provider configurations
 * @param {Object} [loadBalancerConfig] - Load balancer configuration
 * @returns {Object} Enhanced load balanced provider manager
 */
export function createLoadBalancedAlchemyProviders(configs, loadBalancerConfig = {}) {
  if (!Array.isArray(configs) || configs.length === 0) {
    throw new AlchemyError(
      'At least one provider configuration is required',
      RPC_ERROR_CODES.CONFIGURATION_ERROR
    );
  }

  const providers = configs.map((config, index) => {
    try {
      return {
        id: `alchemy_provider_${index}`,
        provider: new AlchemyBroadcastProvider(config),
        weight: config.weight || 1,
        isHealthy: true,
        lastHealthCheck: null,
        consecutiveFailures: 0,
        totalRequests: 0,
        successfulRequests: 0,
        computeUnitsUsed: 0
      };
    } catch (error) {
      throw new AlchemyError(
        `Failed to create Alchemy provider ${index}: ${error.message}`,
        RPC_ERROR_CODES.CONFIGURATION_ERROR,
        { providerIndex: index }
      );
    }
  });

  const config = {
    healthCheckInterval: loadBalancerConfig.healthCheckInterval || 60000,
    maxConsecutiveFailures: loadBalancerConfig.maxConsecutiveFailures || 3,
    computeUnitAwareBalancing: loadBalancerConfig.computeUnitAwareBalancing !== false,
    ...loadBalancerConfig
  };

  let healthCheckInterval = null;

  return {
    providers,
    config,
    
    /**
     * Start health monitoring
     */
    startHealthMonitoring() {
      if (healthCheckInterval) return;
      
      healthCheckInterval = setInterval(async () => {
        await this.checkAllProviderHealth();
      }, config.healthCheckInterval);
    },

    /**
     * Stop health monitoring
     */
    stopHealthMonitoring() {
      if (healthCheckInterval) {
        clearInterval(healthCheckInterval);
        healthCheckInterval = null;
      }
    },

    /**
     * Check health of all providers
     */
    async checkAllProviderHealth() {
      for (const providerInfo of providers) {
        try {
          const health = await providerInfo.provider.getAlchemyStats();
          const wasHealthy = providerInfo.isHealthy;
          
          // Consider compute unit usage in health determination
          const computeUtilization = health.rateLimiting.utilizationPercent;
          providerInfo.isHealthy = health.alchemy.successRate > 0.9 && computeUtilization < 90;
          providerInfo.lastHealthCheck = new Date().toISOString();
          providerInfo.computeUnitsUsed = health.alchemy.computeUnitsUsed;
          
          if (providerInfo.isHealthy) {
            providerInfo.consecutiveFailures = 0;
          } else {
            providerInfo.consecutiveFailures++;
          }
          
          // Log health transitions
          if (wasHealthy !== providerInfo.isHealthy) {
            console.info(`Alchemy provider ${providerInfo.id} health changed: ${wasHealthy ? 'healthy' : 'unhealthy'} -> ${providerInfo.isHealthy ? 'healthy' : 'unhealthy'}`);
          }
          
        } catch (error) {
          providerInfo.isHealthy = false;
          providerInfo.consecutiveFailures++;
          console.warn(`Health check failed for Alchemy provider ${providerInfo.id}:`, error.message);
        }
      }
    },

    /**
     * Get next provider using compute-unit-aware load balancing
     * @returns {AlchemyBroadcastProvider} Selected provider
     */
    getProvider() {
      const healthyProviders = providers.filter(p => p.isHealthy);
      if (healthyProviders.length === 0) {
        throw new AlchemyError(
          'No healthy Alchemy providers available',
          RPC_ERROR_CODES.RESOURCE_EXHAUSTED
        );
      }

      if (config.computeUnitAwareBalancing) {
        // Select provider with lowest compute unit usage
        const selectedProvider = healthyProviders.reduce((prev, current) => 
          (current.computeUnitsUsed < prev.computeUnitsUsed) ? current : prev
        );
        return selectedProvider.provider;
      } else {
        // Simple round-robin
        const selectedProvider = healthyProviders[Math.floor(Math.random() * healthyProviders.length)];
        return selectedProvider.provider;
      }
    },

    /**
     * Get all provider health statuses
     * @returns {Promise<Array>} Health statuses
     */
    async getHealthStatuses() {
      const statuses = await Promise.all(
        providers.map(async (p) => {
          try {
            const health = await p.provider.healthCheck();
            p.isHealthy = health.healthy;
            return { id: p.id, ...health };
          } catch (error) {
            p.isHealthy = false;
            return { id: p.id, healthy: false, error: error.message };
          }
        })
      );
      return statuses;
    },

    /**
     * Shutdown all providers
     * @returns {Promise<void>}
     */
    async shutdown() {
      this.stopHealthMonitoring();
      await Promise.all(providers.map(p => p.provider.shutdown()));
    }
  };
}/**
 * @fileoverview Enterprise-grade Alchemy Broadcast Provider with comprehensive production features
 * @version 2.0.0
 * @author Enterprise Development Team
 * @license MIT
 */

import { RPCBroadcastProvider, RPCError, RPC_ERROR_CODES } from './RPCBroadcastProvider.js';
import crypto from 'crypto';
import https from 'https';

/**
 * Alchemy-specific error codes
 * @readonly
 * @enum {string}
 */
export const ALCHEMY_ERROR_CODES = {
  INVALID_API_KEY: 'ALCHEMY_INVALID_API_KEY',
  RATE_LIMITED: 'ALCHEMY_RATE_LIMITED',
  QUOTA_EXCEEDED: 'ALCHEMY_QUOTA_EXCEEDED',
  UNAUTHORIZED: 'ALCHEMY_UNAUTHORIZED',
  NETWORK_UNSUPPORTED: 'ALCHEMY_NETWORK_UNSUPPORTED',
  SERVICE_UNAVAILABLE: 'ALCHEMY_SERVICE_UNAVAILABLE',
  ARCHIVE_REQUIRED: 'ALCHEMY_ARCHIVE_REQUIRED',
  FAILOVER_ACTIVATED: 'ALCHEMY_FAILOVER_ACTIVATED',
  KEY_ROTATION_FAILED: 'ALCHEMY_KEY_ROTATION_FAILED',
  PLAN_LIMIT_EXCEEDED: 'ALCHEMY_PLAN_LIMIT_EXCEEDED'
};

/**
 * Supported Alchemy networks with comprehensive configuration
 * @readonly
 * @enum {Object}
 */
export const ALCHEMY_NETWORKS = {
  mainnet: { 
    chainId: 1, 
    path: 'eth-mainnet', 
    archiveSupported: true,
    testnet: false 
  },
  goerli: { 
    chainId: 5, 
    path: 'eth-goerli', 
    archiveSupported: true,
    testnet: true 
  },
  sepolia: { 
    chainId: 11155111, 
    path: 'eth-sepolia', 
    archiveSupported: true,
    testnet: true 
  },
  polygon: { 
    chainId: 137, 
    path: 'polygon-mainnet', 
    archiveSupported: true,
    testnet: false 
  },
  'polygon-mumbai': { 
    chainId: 80001, 
    path: 'polygon-mumbai', 
    archiveSupported: true,
    testnet: true 
  },
  optimism: { 
    chainId: 10, 
    path: 'opt-mainnet', 
    archiveSupported: true,
    testnet: false 
  },
  'optimism-goerli': { 
    chainId: 420, 
    path: 'opt-goerli', 
    archiveSupported: true,
    testnet: true 
  },
  arbitrum: { 
    chainId: 42161, 
    path: 'arb-mainnet', 
    archiveSupported: true,
    testnet: false 
  },
  'arbitrum-goerli': { 
    chainId: 421613, 
    path: 'arb-goerli', 
    archiveSupported: true,
    testnet: true 
  },
  base: { 
    chainId: 8453, 
    path: 'base-mainnet', 
    archiveSupported: true,
    testnet: false 
  },
  'base-goerli': { 
    chainId: 84531, 
    path: 'base-goerli', 
    archiveSupported: true,
    testnet: true 
  }
};

/**
 * LRU Cache implementation for efficient rate limit tracking
 */
class LRUCache {
  /**
   * @param {number} maxSize - Maximum cache size
   * @param {number} ttl - Time to live in milliseconds
   */
  constructor(maxSize = 1000, ttl = 60000) {
    this.maxSize = maxSize;
    this.ttl = ttl;
    this.cache = new Map();
    this.accessOrder = [];
  }

  /**
   * Get value from cache
   * @param {string} key - Cache key
   * @returns {any} Cached value or undefined
   */
  get(key) {
    const item = this.cache.get(key);
    if (!item) return undefined;

    // Check TTL
    if (Date.now() - item.timestamp > this.ttl) {
      this.delete(key);
      return undefined;
    }

    // Update access order
    this._updateAccessOrder(key);
    return item.value;
  }

  /**
   * Set value in cache
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   */
  set(key, value) {
    if (this.cache.has(key)) {
      this.delete(key);
    }

    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.accessOrder.shift();
      this.cache.delete(oldestKey);
    }

    this.cache.set(key, {
      value,
      timestamp: Date.now()
    });
    this.accessOrder.push(key);
  }

  /**
   * Delete entry from cache
   * @param {string} key - Cache key
   */
  delete(key) {
    this.cache.delete(key);
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
  }

  /**
   * Update access order for LRU eviction
   * @private
   * @param {string} key - Cache key
   */
  _updateAccessOrder(key) {
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
      this.accessOrder.push(key);
    }
  }

  /**
   * Clear expired entries
   */
  cleanup() {
    const now = Date.now();
    const expiredKeys = [];

    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > this.ttl) {
        expiredKeys.push(key);
      }
    }

    expiredKeys.forEach(key => this.delete(key));
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache statistics
   */
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      utilizationPercent: (this.cache.size / this.maxSize) * 100,
      ttl: this.ttl
    };
  }
}

/**
 * High-performance rate limiter for Alchemy API quotas
 */
class AlchemyRateLimitTracker {
  /**
   * @param {Object} config - Rate limit configuration
   * @param {number} [config.requestsPerSecond=25] - Requests per second limit
   * @param {number} [config.requestsPerDay=300000] - Daily request limit
   * @param {number} [config.burstLimit=100] - Burst request limit
   * @param {number} [config.computeUnitsPerSecond=700] - Compute units per second
   */
  constructor(config = {}) {
    this.requestsPerSecond = config.requestsPerSecond || 25;
    this.requestsPerDay = config.requestsPerDay || 300000;
    this.burstLimit = config.burstLimit || 100;
    this.computeUnitsPerSecond = config.computeUnitsPerSecond || 700;
    
    this.requestCount = 0;
    this.dailyRequestCount = 0;
    this.computeUnitsUsed = 0;
    this.lastResetTime = Date.now();
    this.secondlyRequests = [];
    this.burstRequests = [];
    this.computeUnitsHistory = [];
    
    this.cache = new LRUCache(1000, 300000); // 5 minute TTL
    
    // Reset daily counter at midnight UTC
    this._scheduleDailyReset();
  }

  /**
   * Check if request is allowed under rate limits
   * @param {string} [method] - RPC method for compute unit calculation
   * @param {string} [endpoint] - Optional endpoint for granular tracking
   * @returns {Object} Rate limit check result
   */
  checkRateLimit(method = 'default', endpoint = 'default') {
    const now = Date.now();
    const currentSecond = Math.floor(now / 1000);

    // Clean old requests
    this._cleanOldRequests(now);

    // Calculate compute units for this method
    const computeUnits = this._getComputeUnits(method);

    // Check daily request limit
    if (this.dailyRequestCount >= this.requestsPerDay) {
      return {
        allowed: false,
        reason: 'daily_request_limit_exceeded',
        resetTime: this._getNextMidnightUTC(),
        remainingRequests: 0
      };
    }

    // Check per-second request limit
    const currentSecondRequests = this.secondlyRequests.filter(
      req => Math.floor(req.timestamp / 1000) === currentSecond
    ).length;

    if (currentSecondRequests >= this.requestsPerSecond) {
      return {
        allowed: false,
        reason: 'per_second_limit_exceeded',
        resetTime: (currentSecond + 1) * 1000,
        remainingRequests: this.requestsPerSecond - currentSecondRequests
      };
    }

    // Check compute units per second
    const currentSecondComputeUnits = this.computeUnitsHistory
      .filter(cu => Math.floor(cu.timestamp / 1000) === currentSecond)
      .reduce((sum, cu) => sum + cu.units, 0);

    if (currentSecondComputeUnits + computeUnits > this.computeUnitsPerSecond) {
      return {
        allowed: false,
        reason: 'compute_units_exceeded',
        resetTime: (currentSecond + 1) * 1000,
        remainingComputeUnits: this.computeUnitsPerSecond - currentSecondComputeUnits
      };
    }

    // Check burst limit (requests in last 10 seconds)
    const tenSecondsAgo = now - 10000;
    const burstRequests = this.burstRequests.filter(req => req.timestamp > tenSecondsAgo).length;

    if (burstRequests >= this.burstLimit) {
      return {
        allowed: false,
        reason: 'burst_limit_exceeded',
        resetTime: tenSecondsAgo + 10000,
        remainingBurst: this.burstLimit - burstRequests
      };
    }

    return {
      allowed: true,
      remainingDaily: this.requestsPerDay - this.dailyRequestCount,
      remainingPerSecond: this.requestsPerSecond - currentSecondRequests,
      remainingBurst: this.burstLimit - burstRequests,
      remainingComputeUnits: this.computeUnitsPerSecond - currentSecondComputeUnits,
      computeUnitsForRequest: computeUnits
    };
  }

  /**
   * Record a request with compute units
   * @param {string} [method] - RPC method
   * @param {string} [endpoint] - Optional endpoint
   */
  recordRequest(method = 'default', endpoint = 'default') {
    const now = Date.now();
    const computeUnits = this._getComputeUnits(method);
    
    this.requestCount++;
    this.dailyRequestCount++;
    this.computeUnitsUsed += computeUnits;

    const requestInfo = { timestamp: now, method, computeUnits };
    
    this.secondlyRequests.push(requestInfo);
    this.burstRequests.push(requestInfo);
    this.computeUnitsHistory.push({ timestamp: now, units: computeUnits });

    // Cache endpoint-specific stats
    const endpointStats = this.cache.get(endpoint) || { 
      count: 0, 
      lastRequest: 0, 
      computeUnits: 0 
    };
    endpointStats.count++;
    endpointStats.lastRequest = now;
    endpointStats.computeUnits += computeUnits;
    this.cache.set(endpoint, endpointStats);
  }

  /**
   * Get compute units for specific RPC method
   * @private
   * @param {string} method - RPC method name
   * @returns {number} Compute units required
   */
  _getComputeUnits(method) {
    // Alchemy compute units by method
    const computeUnitsMap = {
      'eth_blockNumber': 10,
      'eth_getBalance': 10,
      'eth_getTransactionByHash': 15,
      'eth_getTransactionReceipt': 15,
      'eth_call': 26,
      'eth_estimateGas': 87,
      'eth_sendRawTransaction': 250,
      'eth_getLogs': 75,
      'eth_getBlock': 16,
      'eth_getCode': 19,
      'debug_traceTransaction': 309,
      'alchemy_getTokenBalances': 150,
      'alchemy_getTokenMetadata': 50,
      'default': 10
    };
    
    return computeUnitsMap[method] || computeUnitsMap['default'];
  }

  /**
   * Update rate limits from Alchemy response headers
   * @param {Object} headers - HTTP response headers
   */
  updateFromHeaders(headers) {
    // Alchemy uses different header names
    if (headers['x-alchemy-compute-units-used']) {
      this.computeUnitsUsed = parseInt(headers['x-alchemy-compute-units-used'], 10);
    }

    if (headers['x-alchemy-compute-units-remaining']) {
      const remaining = parseInt(headers['x-alchemy-compute-units-remaining'], 10);
      // Update daily limit based on remaining units
      this.dailyRequestCount = Math.max(0, this.requestsPerDay - remaining);
    }
  }

  /**
   * Clean old request records
   * @private
   * @param {number} now - Current timestamp
   */
  _cleanOldRequests(now) {
    // Keep only requests from last 60 seconds
    this.secondlyRequests = this.secondlyRequests.filter(req => now - req.timestamp < 60000);
    
    // Keep only requests from last 10 seconds for burst tracking
    this.burstRequests = this.burstRequests.filter(req => now - req.timestamp < 10000);
    
    // Keep only compute units from last 60 seconds
    this.computeUnitsHistory = this.computeUnitsHistory.filter(cu => now - cu.timestamp < 60000);
  }

  /**
   * Schedule daily reset
   * @private
   */
  _scheduleDailyReset() {
    const now = new Date();
    const nextMidnight = this._getNextMidnightUTC();
    const timeToMidnight = nextMidnight - now.getTime();

    setTimeout(() => {
      this.dailyRequestCount = 0;
      this.computeUnitsUsed = 0;
      this.lastResetTime = Date.now();
      this._scheduleDailyReset(); // Schedule next reset
    }, timeToMidnight);
  }

  /**
   * Get next midnight UTC timestamp
   * @private
   * @returns {number} Next midnight UTC timestamp
   */
  _getNextMidnightUTC() {
    const now = new Date();
    const nextMidnight = new Date(now);
    nextMidnight.setUTCHours(24, 0, 0, 0);
    return nextMidnight.getTime();
  }

  /**
   * Get rate limit statistics
   * @returns {Object} Rate limit statistics
   */
  getStats() {
    const now = Date.now();
    return {
      totalRequests: this.requestCount,
      dailyRequests: this.dailyRequestCount,
      dailyLimit: this.requestsPerDay,
      remainingDaily: Math.max(0, this.requestsPerDay - this.dailyRequestCount),
      utilizationPercent: (this.dailyRequestCount / this.requestsPerDay) * 100,
      computeUnitsUsed: this.computeUnitsUsed,
      computeUnitsPerSecond: this.computeUnitsPerSecond,
      lastResetTime: this.lastResetTime,
      nextResetTime: this._getNextMidnightUTC(),
      cacheStats: this.cache.getStats(),
      recentActivity: {
        lastMinute: this.secondlyRequests.filter(req => now - req.timestamp < 60000).length,
        lastTenSeconds: this.burstRequests.filter(req => now - req.timestamp < 10000).length,
        computeUnitsLastSecond: this.computeUnitsHistory
          .filter(cu => now - cu.timestamp < 1000)
          .reduce((sum, cu) => sum + cu.units, 0)
      }
    };
  }
}

/**
 * Enhanced Alchemy-specific error class with full context
 */
export class AlchemyError extends RPCError {
  /**
   * @param {string} message - Error message
   * @param {string} code - Error code from ALCHEMY_ERROR_CODES
   * @param {Object} [context] - Additional error context
   * @param {Object} [alchemyContext] - Alchemy-specific context
   */
  constructor(message, code, context = {}, alchemyContext = {}) {
    super(message, code, context);
    this.name = 'AlchemyError';
    this.alchemyContext = {
      apiKeyMasked: alchemyContext.apiKey ? 
        alchemyContext.apiKey.substring(0, 4) + '***' + alchemyContext.apiKey.substring(alchemyContext.apiKey.length - 4) : null,
      network: alchemyContext.network,
      endpoint: alchemyContext.endpoint,
      rateLimitInfo: alchemyContext.rateLimitInfo,
      failoverAvailable: alchemyContext.failoverAvailable,
      consecutiveFailures: alchemyContext.consecutiveFailures,
      lastSuccessTime: alchemyContext.lastSuccessTime,
      computeUnitsUsed: alchemyContext.computeUnitsUsed,
      suggestedActions: this._getSuggestedActions(code),
      troubleshootingUrl: this._getTroubleshootingUrl(code),
      ...alchemyContext
    };
  }

  /**
   * Get suggested actions based on error code
   * @private
   * @param {string} code - Error code
   * @returns {Array<string>} Suggested actions
   */
  _getSuggestedActions(code) {
    const actionMap = {
      [ALCHEMY_ERROR_CODES.INVALID_API_KEY]: [
        'Verify API key format and validity',
        'Check API key exists in Alchemy dashboard',
        'Ensure API key has required permissions'
      ],
      [ALCHEMY_ERROR_CODES.QUOTA_EXCEEDED]: [
        'Upgrade your Alchemy plan',
        'Implement request caching',
        'Enable failover provider',
        'Optimize request patterns'
      ],
      [ALCHEMY_ERROR_CODES.RATE_LIMITED]: [
        'Implement exponential backoff',
        'Reduce request frequency',
        'Use compute units efficiently',
        'Consider plan upgrade'
      ],
      [ALCHEMY_ERROR_CODES.UNAUTHORIZED]: [
        'Check API key permissions',
        'Verify network access rights',
        'Ensure plan includes requested features',
        'Test API key with curl'
      ],
      [ALCHEMY_ERROR_CODES.ARCHIVE_REQUIRED]: [
        'Enable archive data access',
        'Upgrade to plan with archive support',
        'Use different RPC method',
        'Configure archive fallback'
      ]
    };
    
    return actionMap[code] || [
      'Check Alchemy status page',
      'Verify network connectivity',
      'Contact Alchemy support'
    ];
  }

  /**
   * Get troubleshooting URL based on error code
   * @private
   * @param {string} code - Error code
   * @returns {string} Troubleshooting URL
   */
  _getTroubleshootingUrl(code) {
    const urlMap = {
      [ALCHEMY_ERROR_CODES.QUOTA_EXCEEDED]: 'https://docs.alchemy.com/reference/throughput',
      [ALCHEMY_ERROR_CODES.RATE_LIMITED]: 'https://docs.alchemy.com/reference/compute-units',
      [ALCHEMY_ERROR_CODES.ARCHIVE_REQUIRED]: 'https://docs.alchemy.com/reference/archive-data',
      [ALCHEMY_ERROR_CODES.UNAUTHORIZED]: 'https://docs.alchemy.com/reference/api-keys'
    };
    
    return urlMap[code] || 'https://docs.alchemy.com/reference/error-codes';
  }

  /**
   * Get comprehensive error information
   * @returns {Object} Complete error information
   */
  getFullContext() {
    return {
      ...this.toJSON(),
      alchemySpecific: this.alchemyContext,
      recovery: {
        isRetryable: this._isRetryable(),
        suggestedRetryDelay: this._getSuggestedRetryDelay(),
        maxRetries: this._getMaxRetries()
      }
    };
  }

  /**
   * Check if error is retryable
   * @private
   * @returns {boolean} True if retryable
   */
  _isRetryable() {
    const retryableCodes = [
      ALCHEMY_ERROR_CODES.RATE_LIMITED,
      ALCHEMY_ERROR_CODES.SERVICE_UNAVAILABLE,
      RPC_ERROR_CODES.TIMEOUT,
      RPC_ERROR_CODES.NETWORK_ERROR
    ];
    
    return retryableCodes.includes(this.code);
  }

  /**
   * Get suggested retry delay
   * @private
   * @returns {number} Suggested delay in milliseconds
   */
  _getSuggestedRetryDelay() {
    const delayMap = {
      [ALCHEMY_ERROR_CODES.RATE_LIMITED]: 1000,      // 1 second
      [ALCHEMY_ERROR_CODES.SERVICE_UNAVAILABLE]: 5000, // 5 seconds
      [RPC_ERROR_CODES.TIMEOUT]: 3000,               // 3 seconds
      [RPC_ERROR_CODES.NETWORK_ERROR]: 10000         // 10 seconds
    };
    
    return delayMap[this.code] || 15000; // Default 15 seconds
  }

  /**
   * Get maximum retry attempts
   * @private
   * @returns {number} Maximum retries
   */
  _getMaxRetries() {
    const retryMap = {
      [ALCHEMY_ERROR_CODES.RATE_LIMITED]: 3,
      [ALCHEMY_ERROR_CODES.SERVICE_UNAVAILABLE]: 2,
      [RPC_ERROR_CODES.TIMEOUT]: 3,
      [RPC_ERROR_CODES.NETWORK_ERROR]: 2
    };
    
    return retryMap[this.code] || 1;
  }
}

/**
 * Enterprise-grade Alchemy Broadcast Provider
 */
export class AlchemyBroadcastProvider extends RPCBroadcastProvider {
  /**
   * @param {Object} config - Configuration object
   * @param {string} config.apiKey - Alchemy API key
   * @param {string} config.network - Network name
   * @param {Object} [config.fallbackProvider] - Fallback provider configuration
   * @param {Object} [config.rateLimitConfig] - Rate limiting configuration
   * @param {boolean} [config.enableArchiveNode=false] - Enable archive node support
   * @param {boolean} [config.enableFailover=true] - Enable automatic failover
   * @param {number} [config.failoverThreshold=3] - Consecutive failures before failover
   * @param {Object} config.opts - Additional options passed to parent class
   */
  constructor({ 
    apiKey, 
    network, 
    fallbackProvider,
    rateLimitConfig = {},
    enableArchiveNode = false,
    enableFailover = true,
    failoverThreshold = 3,
    ...opts 
  }) {
    // Validate required parameters
    if (!apiKey || typeof apiKey !== 'string') {
      throw new AlchemyError(
        'Valid Alchemy API key is required',
        ALCHEMY_ERROR_CODES.INVALID_API_KEY
      );
    }

    if (!network || !ALCHEMY_NETWORKS[network]) {
      throw new AlchemyError(
        `Unsupported network: ${network}. Supported networks: ${Object.keys(ALCHEMY_NETWORKS).join(', ')}`,
        ALCHEMY_ERROR_CODES.NETWORK_UNSUPPORTED
      );
    }

    // Validate API key format (Alchemy keys are typically 32 characters)
    if (!apiKey.match(/^[a-zA-Z0-9_-]{20,}$/)) {
      throw new AlchemyError(
        'Invalid Alchemy API key format',
        ALCHEMY_ERROR_CODES.INVALID_API_KEY
      );
    }

    // Build secure Alchemy RPC URL
    const networkConfig = ALCHEMY_NETWORKS[network];
    const rpcUrl = AlchemyBroadcastProvider._buildAlchemyUrl(
      apiKey, 
      networkConfig.path,
      enableArchiveNode
    );

    // Initialize parent class with Alchemy configuration
    super({
      rpcUrl,
      chainId: networkConfig.chainId,
      securityProfile: 'PRODUCTION',
      ...opts
    });

    // Store configuration (secrets are not logged)
    this.apiKey = apiKey;
    this.network = network;
    this.networkConfig = networkConfig;
    this.enableArchiveNode = enableArchiveNode;
    this.enableFailover = enableFailover;
    this.failoverThreshold = failoverThreshold;

    // Initialize Alchemy-specific components
    this.rateLimitTracker = new AlchemyRateLimitTracker(rateLimitConfig);
    this.failoverProvider = null;
    
    // Initialize failover provider if configured
    if (fallbackProvider && enableFailover) {
      this._initializeFallbackProvider(fallbackProvider);
    }

    // Statistics tracking
    this.alchemyStats = {
      alchemyRequests: 0,
      alchemyFailures: 0,
      failoverActivations: 0,
      lastFailoverTime: null,
      keyRotations: 0,
      archiveRequests: 0,
      rateLimitHits: 0,
      consecutiveFailures: 0,
      isFailoverActive: false,
      computeUnitsUsed: 0,
      startTime: Date.now(),
      dryRunMode: false
    };

    // Enhanced logging context
    this.logger.info('AlchemyBroadcastProvider initialized', {
      network: this.network,
      chainId: this.networkConfig.chainId,
      archiveNodeEnabled: this.enableArchiveNode,
      failoverEnabled: this.enableFailover,
      apiKeyMasked: this._maskApiKey(this.apiKey)
    });
  }

  /**
   * Build secure Alchemy RPC URL
   * @private
   * @param {string} apiKey - API key
   * @param {string} networkPath - Network path
   * @param {boolean} enableArchive - Enable archive node
   * @returns {string} Alchemy RPC URL
   */
  static _buildAlchemyUrl(apiKey, networkPath, enableArchive = false) {
    // Validate inputs
    if (!apiKey?.match(/^[a-zA-Z0-9_-]{20,}$/)) {
      throw new AlchemyError(
        'Invalid Alchemy API key format',
        ALCHEMY_ERROR_CODES.INVALID_API_KEY
      );
    }

    if (!networkPath) {
      throw new AlchemyError(
        'Network path is required',
        ALCHEMY_ERROR_CODES.NETWORK_UNSUPPORTED
      );
    }

    // Build URL with optional archive support
    const subdomain = enableArchive ? `${networkPath}-archive` : networkPath;
    return `https://${subdomain}.g.alchemy.com/v2/${apiKey}`;
  }

  /**
   * Initialize fallback provider
   * @private
   * @param {Object} fallbackConfig - Fallback provider configuration
   */
  _initializeFallbackProvider(fallbackConfig) {
    try {
      this.failoverProvider = new RPCBroadcastProvider({
        ...fallbackConfig,
        chainId: this.networkConfig.chainId,
        securityProfile: 'PRODUCTION'
      });

      this.logger.info('Fallback provider initialized', {
        fallbackUrl: this._maskSensitiveData(fallbackConfig.rpcUrl),
        chainId: this.networkConfig.chainId
      });
    } catch (error) {
      this.logger.error('Failed to initialize fallback provider', {
        error: error.message
      });
      throw new AlchemyError(
        `Failed to initialize fallback provider: ${error.message}`,
        RPC_ERROR_CODES.CONFIGURATION_ERROR
      );
    }
  }

  /**
   * Enhanced sensitive data masking for Alchemy
   * @private
   * @param {any} data - Data to mask
   * @returns {any} Masked data
   */
  _maskSensitiveData(data) {
    if (typeof data === 'string') {
      // Check for signed transaction data
      if (data.startsWith('0x') && data.length > 42) {
        return `0x${data.substring(2, 8)}***${data.substring(data.length - 6)}`;
      }
      
      // Check for Alchemy API key format
      if (data.match(/^[a-zA-Z0-9_-]{20,}$/)) {
        return this._maskApiKey(data);
      }
      
      // Mask URLs by showing only protocol and hostname
      try {
        const url = new URL(data);
        return `${url.protocol}//${url.hostname}`;
      } catch {
        if (data.length > 20) {
          return data.substring(0, 8) + '***' + data.substring(data.length - 4);
        }
        return data;
      }
    }

    if (typeof data === 'object' && data !== null) {
      const masked = {};
      for (const [key, value] of Object.entries(data)) {
        const lowerKey = key.toLowerCase();
        if (lowerKey.includes('token') || lowerKey.includes('key') || 
            lowerKey.includes
