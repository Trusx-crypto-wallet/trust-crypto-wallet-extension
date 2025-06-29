/**
 * @fileoverview Enhanced Enterprise-grade RPC Broadcast Provider with production edge improvements
 * @version 2.0.0
 * @author Enterprise Development Team
 * @license MIT
 */

import { ethers } from 'ethers';
import { URL } from 'url';
import https from 'https';
import crypto from 'crypto';

/**
 * Error codes for RPC broadcast operations
 * @readonly
 * @enum {string}
 */
export const RPC_ERROR_CODES = {
  INVALID_URL: 'RPC_INVALID_URL',
  SECURITY_VIOLATION: 'RPC_SECURITY_VIOLATION',
  CONNECTION_FAILED: 'RPC_CONNECTION_FAILED',
  TIMEOUT: 'RPC_TIMEOUT',
  AUTHENTICATION_FAILED: 'RPC_AUTH_FAILED',
  RATE_LIMITED: 'RPC_RATE_LIMITED',
  CIRCUIT_BREAKER_OPEN: 'RPC_CIRCUIT_BREAKER_OPEN',
  INVALID_RESPONSE: 'RPC_INVALID_RESPONSE',
  NETWORK_ERROR: 'RPC_NETWORK_ERROR',
  CONFIGURATION_ERROR: 'RPC_CONFIG_ERROR',
  RESOURCE_EXHAUSTED: 'RPC_RESOURCE_EXHAUSTED',
  CERTIFICATE_ERROR: 'RPC_CERTIFICATE_ERROR',
  MEMORY_LIMIT_EXCEEDED: 'RPC_MEMORY_LIMIT_EXCEEDED'
};

/**
 * Security profiles for different deployment environments
 * @readonly
 * @enum {Object}
 */
export const SECURITY_PROFILES = {
  DEVELOPMENT: {
    enforceHttps: false,
    allowPrivateIps: true,
    strictCertValidation: false,
    enableCertificatePinning: false,
    maxUrlLength: 2048,
    enableDebugLogging: true,
    memoryThresholdMB: 1024,
    enableResourceAlerts: false
  },
  STAGING: {
    enforceHttps: true,
    allowPrivateIps: true,
    strictCertValidation: true,
    enableCertificatePinning: false,
    maxUrlLength: 1024,
    enableDebugLogging: true,
    memoryThresholdMB: 512,
    enableResourceAlerts: true
  },
  PRODUCTION: {
    enforceHttps: true,
    allowPrivateIps: false,
    strictCertValidation: true,
    enableCertificatePinning: true,
    maxUrlLength: 512,
    enableDebugLogging: false,
    memoryThresholdMB: 256,
    enableResourceAlerts: true
  }
};

/**
 * Custom error class for RPC operations
 */
export class RPCError extends Error {
  /**
   * @param {string} message - Error message
   * @param {string} code - Error code from RPC_ERROR_CODES
   * @param {Object} [context] - Additional error context
   */
  constructor(message, code, context = {}) {
    super(message);
    this.name = 'RPCError';
    this.code = code;
    this.context = context;
    this.timestamp = new Date().toISOString();
  }

  /**
   * Convert error to JSON for logging
   * @returns {Object} JSON representation
   */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      context: this.context,
      timestamp: this.timestamp,
      stack: this.stack
    };
  }
}

/**
 * Certificate pinning manager for enhanced security
 */
class CertificatePinningManager {
  /**
   * @param {Object} config - Certificate pinning configuration
   * @param {Array<string>} [config.allowedFingerprints] - SHA256 fingerprints of allowed certificates
   * @param {Array<string>} [config.allowedCAFingerprints] - SHA256 fingerprints of allowed CA certificates
   * @param {boolean} [config.strictMode=true] - Strict validation mode
   */
  constructor(config = {}) {
    this.allowedFingerprints = new Set(config.allowedFingerprints || []);
    this.allowedCAFingerprints = new Set(config.allowedCAFingerprints || []);
    this.strictMode = config.strictMode !== false;
    this.logger = config.logger;
  }

  /**
   * Validate certificate against pinned fingerprints
   * @param {Object} cert - Certificate object
   * @returns {boolean} True if certificate is valid
   */
  validateCertificate(cert) {
    try {
      const fingerprint = this._getCertificateFingerprint(cert);
      
      // Check against pinned certificate fingerprints
      if (this.allowedFingerprints.size > 0) {
        if (this.allowedFingerprints.has(fingerprint)) {
          this.logger?.debug('Certificate validated against pinned fingerprint', { fingerprint });
          return true;
        }
        
        if (this.strictMode) {
          this.logger?.warn('Certificate rejected - not in pinned fingerprints', { fingerprint });
          return false;
        }
      }

      // Check against CA fingerprints
      if (this.allowedCAFingerprints.size > 0 && cert.issuerCertificate) {
        const caFingerprint = this._getCertificateFingerprint(cert.issuerCertificate);
        if (this.allowedCAFingerprints.has(caFingerprint)) {
          this.logger?.debug('Certificate validated against pinned CA', { caFingerprint });
          return true;
        }
        
        if (this.strictMode) {
          this.logger?.warn('Certificate rejected - CA not in pinned fingerprints', { caFingerprint });
          return false;
        }
      }

      // If no pinning configured, allow through
      if (this.allowedFingerprints.size === 0 && this.allowedCAFingerprints.size === 0) {
        return true;
      }

      // In non-strict mode, allow if basic validation passes
      return !this.strictMode;

    } catch (error) {
      this.logger?.error('Certificate validation error', { error: error.message });
      return false;
    }
  }

  /**
   * Get SHA256 fingerprint of certificate
   * @private
   * @param {Object} cert - Certificate object
   * @returns {string} SHA256 fingerprint
   */
  _getCertificateFingerprint(cert) {
    const derCert = cert.raw || Buffer.from(cert.pemEncoded.replace(/-----[^-]+-----/g, ''), 'base64');
    return crypto.createHash('sha256').update(derCert).digest('hex').toUpperCase();
  }

  /**
   * Add allowed fingerprint
   * @param {string} fingerprint - SHA256 fingerprint to allow
   */
  addAllowedFingerprint(fingerprint) {
    this.allowedFingerprints.add(fingerprint.toUpperCase());
  }

  /**
   * Add allowed CA fingerprint
   * @param {string} fingerprint - SHA256 fingerprint of CA to allow
   */
  addAllowedCAFingerprint(fingerprint) {
    this.allowedCAFingerprints.add(fingerprint.toUpperCase());
  }
}

/**
 * Resource monitor for memory and performance tracking
 */
class ResourceMonitor {
  /**
   * @param {Object} config - Resource monitor configuration
   * @param {number} [config.memoryThresholdMB=256] - Memory threshold in MB
   * @param {number} [config.heapThresholdPercent=85] - Heap usage threshold percentage
   * @param {number} [config.checkIntervalMs=30000] - Check interval in milliseconds
   * @param {Function} [config.onAlert] - Alert callback function
   * @param {Object} [config.logger] - Logger instance
   */
  constructor(config = {}) {
    this.memoryThresholdMB = config.memoryThresholdMB || 256;
    this.heapThresholdPercent = config.heapThresholdPercent || 85;
    this.checkIntervalMs = config.checkIntervalMs || 30000;
    this.onAlert = config.onAlert || (() => {});
    this.logger = config.logger;
    
    this.isMonitoring = false;
    this.monitorInterval = null;
    this.alertHistory = [];
    this.lastHeapSnapshot = null;
  }

  /**
   * Start resource monitoring
   */
  start() {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    this.monitorInterval = setInterval(() => {
      this._performHealthCheck();
    }, this.checkIntervalMs);
    
    this.logger?.info('Resource monitoring started', {
      memoryThresholdMB: this.memoryThresholdMB,
      heapThresholdPercent: this.heapThresholdPercent
    });
  }

  /**
   * Stop resource monitoring
   */
  stop() {
    if (!this.isMonitoring) return;
    
    this.isMonitoring = false;
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }
    
    this.logger?.info('Resource monitoring stopped');
  }

  /**
   * Perform resource health check
   * @private
   */
  _performHealthCheck() {
    try {
      const memoryUsage = process.memoryUsage();
      const heapUsedMB = memoryUsage.heapUsed / 1024 / 1024;
      const heapTotalMB = memoryUsage.heapTotal / 1024 / 1024;
      const heapUsagePercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
      
      // Check memory threshold
      if (heapUsedMB > this.memoryThresholdMB) {
        this._triggerAlert('MEMORY_THRESHOLD_EXCEEDED', {
          heapUsedMB,
          thresholdMB: this.memoryThresholdMB,
          heapUsagePercent
        });
      }
      
      // Check heap usage percentage
      if (heapUsagePercent > this.heapThresholdPercent) {
        this._triggerAlert('HEAP_THRESHOLD_EXCEEDED', {
          heapUsagePercent,
          thresholdPercent: this.heapThresholdPercent,
          heapUsedMB,
          heapTotalMB
        });
      }
      
      // Check for memory leaks
      if (this.lastHeapSnapshot) {
        const heapGrowth = heapUsedMB - this.lastHeapSnapshot.heapUsedMB;
        const timeDiff = Date.now() - this.lastHeapSnapshot.timestamp;
        const growthRateMBPerMin = (heapGrowth / timeDiff) * 60000;
        
        if (growthRateMBPerMin > 10) { // More than 10MB/min growth
          this._triggerAlert('POTENTIAL_MEMORY_LEAK', {
            growthRateMBPerMin,
            heapGrowthMB: heapGrowth,
            timeDiffMs: timeDiff
          });
        }
      }
      
      this.lastHeapSnapshot = {
        heapUsedMB,
        heapTotalMB,
        timestamp: Date.now()
      };
      
    } catch (error) {
      this.logger?.error('Resource health check failed', { error: error.message });
    }
  }

  /**
   * Trigger resource alert
   * @private
   * @param {string} alertType - Type of alert
   * @param {Object} context - Alert context
   */
  _triggerAlert(alertType, context) {
    const alert = {
      type: alertType,
      timestamp: new Date().toISOString(),
      context,
      severity: this._getAlertSeverity(alertType)
    };
    
    this.alertHistory.push(alert);
    
    // Keep only last 100 alerts
    if (this.alertHistory.length > 100) {
      this.alertHistory = this.alertHistory.slice(-100);
    }
    
    this.logger?.warn('Resource alert triggered', alert);
    this.onAlert(alert);
  }

  /**
   * Get alert severity level
   * @private
   * @param {string} alertType - Alert type
   * @returns {string} Severity level
   */
  _getAlertSeverity(alertType) {
    const severityMap = {
      'MEMORY_THRESHOLD_EXCEEDED': 'HIGH',
      'HEAP_THRESHOLD_EXCEEDED': 'MEDIUM',
      'POTENTIAL_MEMORY_LEAK': 'HIGH'
    };
    return severityMap[alertType] || 'MEDIUM';
  }

  /**
   * Get current resource status
   * @returns {Object} Current resource status
   */
  getStatus() {
    const memoryUsage = process.memoryUsage();
    return {
      isMonitoring: this.isMonitoring,
      memoryUsage: {
        heapUsedMB: memoryUsage.heapUsed / 1024 / 1024,
        heapTotalMB: memoryUsage.heapTotal / 1024 / 1024,
        heapUsagePercent: (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100,
        rssMB: memoryUsage.rss / 1024 / 1024,
        externalMB: memoryUsage.external / 1024 / 1024
      },
      thresholds: {
        memoryThresholdMB: this.memoryThresholdMB,
        heapThresholdPercent: this.heapThresholdPercent
      },
      alertCount: this.alertHistory.length,
      lastAlert: this.alertHistory[this.alertHistory.length - 1] || null
    };
  }

  /**
   * Force garbage collection if available
   */
  forceGarbageCollection() {
    if (global.gc) {
      global.gc();
      this.logger?.debug('Forced garbage collection executed');
      return true;
    }
    return false;
  }

  /**
   * Take heap snapshot for analysis
   * @returns {Object} Heap snapshot data
   */
  takeHeapSnapshot() {
    const memoryUsage = process.memoryUsage();
    const snapshot = {
      timestamp: new Date().toISOString(),
      memoryUsage,
      processInfo: {
        pid: process.pid,
        uptime: process.uptime(),
        version: process.version,
        platform: process.platform
      }
    };
    
    this.logger?.info('Heap snapshot taken', snapshot);
    return snapshot;
  }
}

/**
 * Health check server for Kubernetes/ELB integration
 */
class HealthCheckServer {
  /**
   * @param {Object} config - Health check server configuration
   * @param {number} [config.port=8080] - Server port
   * @param {string} [config.host='0.0.0.0'] - Server host
   * @param {string} [config.path='/healthz'] - Health check endpoint path
   * @param {Function} [config.healthProvider] - Function that returns health status
   * @param {Object} [config.logger] - Logger instance
   */
  constructor(config = {}) {
    this.port = config.port || 8080;
    this.host = config.host || '0.0.0.0';
    this.path = config.path || '/healthz';
    this.healthProvider = config.healthProvider || (() => ({ status: 'healthy' }));
    this.logger = config.logger;
    this.server = null;
    this.isRunning = false;
  }

  /**
   * Start health check server
   * @returns {Promise<void>}
   */
  async start() {
    if (this.isRunning) return;

    return new Promise((resolve, reject) => {
      // Simple HTTP server without external dependencies
      this.server = require('http').createServer(async (req, res) => {
        try {
          if (req.url === this.path && req.method === 'GET') {
            const healthStatus = await this.healthProvider();
            const statusCode = healthStatus.status === 'healthy' ? 200 : 503;
            
            res.writeHead(statusCode, {
              'Content-Type': 'application/json',
              'Cache-Control': 'no-cache, no-store, must-revalidate'
            });
            
            res.end(JSON.stringify({
              ...healthStatus,
              timestamp: new Date().toISOString(),
              endpoint: this.path
            }));
            
          } else if (req.url === '/metrics' && req.method === 'GET') {
            // Basic metrics endpoint
            const healthStatus = await this.healthProvider();
            res.writeHead(200, { 'Content-Type': 'text/plain' });
            res.end(this._formatPrometheusMetrics(healthStatus));
            
          } else {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Not Found', path: req.url }));
          }
          
        } catch (error) {
          this.logger?.error('Health check request failed', { error: error.message });
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Internal Server Error' }));
        }
      });

      this.server.listen(this.port, this.host, (error) => {
        if (error) {
          reject(error);
        } else {
          this.isRunning = true;
          this.logger?.info('Health check server started', {
            host: this.host,
            port: this.port,
            path: this.path
          });
          resolve();
        }
      });
    });
  }

  /**
   * Stop health check server
   * @returns {Promise<void>}
   */
  async stop() {
    if (!this.isRunning || !this.server) return;

    return new Promise((resolve) => {
      this.server.close(() => {
        this.isRunning = false;
        this.logger?.info('Health check server stopped');
        resolve();
      });
    });
  }

  /**
   * Format health status as Prometheus metrics
   * @private
   * @param {Object} healthStatus - Health status object
   * @returns {string} Prometheus formatted metrics
   */
  _formatPrometheusMetrics(healthStatus) {
    let metrics = '';
    
    // Health status metric
    metrics += '# HELP rpc_provider_healthy Provider health status (1=healthy, 0=unhealthy)\n';
    metrics += '# TYPE rpc_provider_healthy gauge\n';
    metrics += `rpc_provider_healthy ${healthStatus.status === 'healthy' ? 1 : 0}\n\n`;
    
    // Add other numeric metrics if available
    Object.entries(healthStatus).forEach(([key, value]) => {
      if (typeof value === 'number') {
        metrics += `# HELP rpc_provider_${key} RPC Provider ${key}\n`;
        metrics += `# TYPE rpc_provider_${key} gauge\n`;
        metrics += `rpc_provider_${key} ${value}\n\n`;
      }
    });
    
    return metrics;
  }
}

/**
 * Graceful shutdown manager
 */
class GracefulShutdownManager {
  /**
   * @param {Object} config - Shutdown manager configuration
   * @param {Array<Function>} [config.shutdownHandlers] - Array of shutdown handler functions
   * @param {number} [config.gracefulTimeoutMs=30000] - Graceful shutdown timeout
   * @param {Object} [config.logger] - Logger instance
   */
  constructor(config = {}) {
    this.shutdownHandlers = config.shutdownHandlers || [];
    this.gracefulTimeoutMs = config.gracefulTimeoutMs || 30000;
    this.logger = config.logger;
    this.isShuttingDown = false;
    this.shutdownStartTime = null;
  }

  /**
   * Initialize shutdown signal handlers
   */
  initialize() {
    // Handle graceful shutdown signals
    process.on('SIGINT', () => this._handleShutdownSignal('SIGINT'));
    process.on('SIGTERM', () => this._handleShutdownSignal('SIGTERM'));
    
    // Handle ungraceful shutdown signals
    process.on('SIGQUIT', () => this._handleShutdownSignal('SIGQUIT'));
    
    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      this.logger?.error('Uncaught exception, initiating emergency shutdown', { error: error.message });
      this._emergencyShutdown(1);
    });
    
    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      this.logger?.error('Unhandled promise rejection, initiating emergency shutdown', { 
        reason: reason?.message || reason,
        promise: promise?.toString() 
      });
      this._emergencyShutdown(1);
    });

    this.logger?.info('Graceful shutdown manager initialized');
  }

  /**
   * Add shutdown handler
   * @param {Function} handler - Shutdown handler function
   */
  addShutdownHandler(handler) {
    if (typeof handler === 'function') {
      this.shutdownHandlers.push(handler);
    }
  }

  /**
   * Handle shutdown signal
   * @private
   * @param {string} signal - Signal name
   */
  async _handleShutdownSignal(signal) {
    if (this.isShuttingDown) {
      this.logger?.warn(`Received ${signal} during shutdown, forcing exit`);
      process.exit(1);
      return;
    }

    this.isShuttingDown = true;
    this.shutdownStartTime = Date.now();
    
    this.logger?.info(`Received ${signal}, initiating graceful shutdown`);

    try {
      // Set timeout for graceful shutdown
      const timeoutId = setTimeout(() => {
        this.logger?.error('Graceful shutdown timeout exceeded, forcing exit');
        process.exit(1);
      }, this.gracefulTimeoutMs);

      // Execute shutdown handlers
      for (const handler of this.shutdownHandlers) {
        try {
          await handler();
        } catch (error) {
          this.logger?.error('Shutdown handler failed', { error: error.message });
        }
      }

      clearTimeout(timeoutId);
      
      const shutdownDuration = Date.now() - this.shutdownStartTime;
      this.logger?.info('Graceful shutdown completed', { duration: shutdownDuration });
      
      process.exit(0);
      
    } catch (error) {
      this.logger?.error('Graceful shutdown failed', { error: error.message });
      process.exit(1);
    }
  }

  /**
   * Emergency shutdown
   * @private
   * @param {number} exitCode - Exit code
   */
  _emergencyShutdown(exitCode) {
    this.logger?.error('Performing emergency shutdown');
    process.exit(exitCode);
  }
}

/**
 * Circuit breaker for handling RPC failures
 */
class CircuitBreaker {
  /**
   * @param {Object} options - Circuit breaker configuration
   * @param {number} [options.failureThreshold=5] - Number of failures before opening
   * @param {number} [options.resetTimeout=60000] - Time before attempting reset
   * @param {number} [options.monitoringPeriod=60000] - Monitoring window
   */
  constructor(options = {}) {
    this.failureThreshold = options.failureThreshold || 5;
    this.resetTimeout = options.resetTimeout || 60000;
    this.monitoringPeriod = options.monitoringPeriod || 60000;
    
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.nextAttemptTime = null;
  }

  /**
   * Check if circuit breaker allows execution
   * @returns {boolean} True if execution is allowed
   */
  canExecute() {
    const now = Date.now();
    
    if (this.state === 'CLOSED') {
      return true;
    }
    
    if (this.state === 'OPEN') {
      if (now >= this.nextAttemptTime) {
        this.state = 'HALF_OPEN';
        return true;
      }
      return false;
    }
    
    if (this.state === 'HALF_OPEN') {
      return true;
    }
    
    return false;
  }

  /**
   * Record successful execution
   */
  recordSuccess() {
    this.failureCount = 0;
    this.state = 'CLOSED';
    this.lastFailureTime = null;
    this.nextAttemptTime = null;
  }

  /**
   * Record failed execution
   */
  recordFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    if (this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN';
      this.nextAttemptTime = this.lastFailureTime + this.resetTimeout;
    }
  }

  /**
   * Get current circuit breaker status
   * @returns {Object} Status information
   */
  getStatus() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime,
      nextAttemptTime: this.nextAttemptTime
    };
  }
}

/**
 * Request queue with concurrency control
 */
class RequestQueue {
  /**
   * @param {number} [maxConcurrency=10] - Maximum concurrent requests
   */
  constructor(maxConcurrency = 10) {
    this.maxConcurrency = maxConcurrency;
    this.activeRequests = 0;
    this.queue = [];
  }

  /**
   * Execute request with concurrency control
   * @param {Function} requestFn - Function that returns a promise
   * @returns {Promise} Request result
   */
  async execute(requestFn) {
    return new Promise((resolve, reject) => {
      this.queue.push({ requestFn, resolve, reject });
      this.processQueue();
    });
  }

  /**
   * Process queued requests
   * @private
   */
  async processQueue() {
    if (this.activeRequests >= this.maxConcurrency || this.queue.length === 0) {
      return;
    }

    const { requestFn, resolve, reject } = this.queue.shift();
    this.activeRequests++;

    try {
      const result = await requestFn();
      resolve(result);
    } catch (error) {
      reject(error);
    } finally {
      this.activeRequests--;
      this.processQueue();
    }
  }

  /**
   * Get queue status
   * @returns {Object} Queue status
   */
  getStatus() {
    return {
      activeRequests: this.activeRequests,
      queuedRequests: this.queue.length,
      maxConcurrency: this.maxConcurrency
    };
  }
}

/**
 * Enhanced Enterprise-grade RPC Broadcast Provider
 */
export class RPCBroadcastProvider {
  /**
   * @param {Object} config - Configuration object
   * @param {string} config.rpcUrl - RPC endpoint URL
   * @param {number} config.chainId - Blockchain chain ID
   * @param {number} [config.timeout=30000] - Request timeout in milliseconds
   * @param {string} [config.securityProfile='PRODUCTION'] - Security profile
   * @param {Object} [config.retryConfig] - Retry configuration
   * @param {Object} [config.circuitBreakerConfig] - Circuit breaker configuration
   * @param {Object} [config.rateLimitConfig] - Rate limiting configuration
   * @param {Object} [config.headers] - Custom HTTP headers
   * @param {Object} [config.auth] - Authentication configuration
   * @param {Object} [config.proxy] - Proxy configuration
   * @param {Object} [config.certificatePinning] - Certificate pinning configuration
   * @param {Array<string>} [config.certificatePinning.allowedFingerprints] - Allowed certificate fingerprints
   * @param {Array<string>} [config.certificatePinning.allowedCAFingerprints] - Allowed CA fingerprints
   * @param {boolean} [config.enableHealthCheckServer=false] - Enable health check HTTP server
   * @param {Object} [config.healthCheckServer] - Health check server configuration
   * @param {number} [config.healthCheckServer.port=8080] - Health check server port
   * @param {boolean} [config.enableResourceMonitoring=true] - Enable resource monitoring
   * @param {Object} [config.resourceMonitoring] - Resource monitoring configuration
   * @param {boolean} [config.enableGracefulShutdown=true] - Enable graceful shutdown handling
   * @param {boolean} [config.enableMetrics=true] - Enable metrics collection
   * @param {number} [config.maxConcurrency=10] - Maximum concurrent requests
   * @param {number} [config.memoryLimit=100] - Maximum memory usage in MB
   */
  constructor(config) {
    this.config = this._validateAndNormalizeConfig(config);
    this.provider = null;
    this.circuitBreaker = new CircuitBreaker(this.config.circuitBreakerConfig);
    this.requestQueue = new RequestQueue(this.config.maxConcurrency);
    
    // Enhanced components
    this.certificatePinningManager = null;
    this.resourceMonitor = null;
    this.healthCheckServer = null;
    this.gracefulShutdownManager = null;
    
    // Statistics and monitoring
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      totalResponseTime: 0,
      lastRequestTime: null,
      connectionStatus: 'disconnected',
      errors: new Map(),
      responseTimeHistory: [],
      startTime: Date.now(),
      certificateValidations: 0,
      resourceAlerts: 0
    };

    // Rate limiting
    this.rateLimiter = {
      requests: [],
      maxRequestsPerSecond: this.config.rateLimitConfig.maxRequestsPerSecond
    };

    // Memory management
    this.memoryManager = {
      cleanupInterval: setInterval(() => this._cleanupMemory(), 60000),
      maxHistorySize: 1000
    };

    // Logger
    this.logger = this._createLogger();

    this.logger.info('Enhanced RPCBroadcastProvider initialized', {
      rpcUrl: this._maskSensitiveData(this.config.rpcUrl),
      chainId: this.config.chainId,
      securityProfile: this.config.securityProfile,
      certificatePinningEnabled: this.config.certificatePinning.enabled,
      resourceMonitoringEnabled: this.config.resourceMonitoring.enabled,
      healthCheckServerEnabled: this.config.healthCheckServer.enabled
    });

    // Initialize enhanced components
    this._initializeEnhancedComponents();
    
    // Initialize provider
    this._initializeProvider();
  }

  /**
   * Initialize enhanced security and monitoring components
   * @private
   */
  _initializeEnhancedComponents() {
    // Initialize certificate pinning
    if (this.config.certificatePinning.enabled) {
      this.certificatePinningManager = new CertificatePinningManager({
        ...this.config.certificatePinning,
        logger: this.logger
      });
      this.logger.info('Certificate pinning enabled');
    }

    // Initialize resource monitoring
    if (this.config.resourceMonitoring.enabled) {
      this.resourceMonitor = new ResourceMonitor({
        ...this.config.resourceMonitoring,
        logger: this.logger,
        onAlert: (alert) => {
          this.stats.resourceAlerts++;
          this._handleResourceAlert(alert);
        }
      });
      this.resourceMonitor.start();
      this.logger.info('Resource monitoring started');
    }

    // Initialize health check server
    if (this.config.healthCheckServer.enabled) {
      this.healthCheckServer = new HealthCheckServer({
        ...this.config.healthCheckServer,
        logger: this.logger,
        healthProvider: () => this.getHealthStatus()
      });
    }

    // Initialize graceful shutdown manager
    if (this.config.gracefulShutdown.enabled) {
      this.gracefulShutdownManager = new GracefulShutdownManager({
        logger: this.logger,
        gracefulTimeoutMs: this.config.gracefulShutdown.timeoutMs
      });

      // Add shutdown handlers
      this.gracefulShutdownManager.addShutdownHandler(() => this.shutdown());
      
      if (this.healthCheckServer) {
        this.gracefulShutdownManager.addShutdownHandler(() => this.healthCheckServer.stop());
      }
      
      if (this.resourceMonitor) {
        this.gracefulShutdownManager.addShutdownHandler(() => this.resourceMonitor.stop());
      }

      this.gracefulShutdownManager.initialize();
      this.logger.info('Graceful shutdown manager initialized');
    }
  }

  /**
   * Validate and normalize configuration
   * @private
   * @param {Object} config - Raw configuration
   * @returns {Object} Validated configuration
   */
  _validateAndNormalizeConfig(config) {
    if (!config) {
      throw new RPCError('Configuration is required', RPC_ERROR_CODES.CONFIGURATION_ERROR);
    }

    if (!config.rpcUrl || typeof config.rpcUrl !== 'string') {
      throw new RPCError('Valid rpcUrl is required', RPC_ERROR_CODES.CONFIGURATION_ERROR);
    }

    if (!config.chainId || typeof config.chainId !== 'number') {
      throw new RPCError('Valid chainId is required', RPC_ERROR_CODES.CONFIGURATION_ERROR);
    }

    const securityProfile = SECURITY_PROFILES[config.securityProfile] || SECURITY_PROFILES.PRODUCTION;
    
    // Validate URL
    this._validateUrl(config.rpcUrl, securityProfile);

    return {
      rpcUrl: config.rpcUrl,
      chainId: config.chainId,
      timeout: config.timeout || 30000,
      securityProfile: config.securityProfile || 'PRODUCTION',
      securitySettings: securityProfile,
      retryConfig: {
        maxRetries: config.retryConfig?.maxRetries || 3,
        baseDelay: config.retryConfig?.baseDelay || 1000,
        maxDelay: config.retryConfig?.maxDelay || 30000,
        ...config.retryConfig
      },
      circuitBreakerConfig: {
        failureThreshold: 5,
        resetTimeout: 60000,
        monitoringPeriod: 60000,
        ...config.circuitBreakerConfig
      },
      rateLimitConfig: {
        maxRequestsPerSecond: 100,
        ...config.rateLimitConfig
      },
      headers: config.headers || {},
      auth: config.auth,
      proxy: config.proxy,
      
      // Enhanced configuration
      certificatePinning: {
        enabled: securityProfile.enableCertificatePinning && config.certificatePinning?.enabled !== false,
        allowedFingerprints: config.certificatePinning?.allowedFingerprints || [],
        allowedCAFingerprints: config.certificatePinning?.allowedCAFingerprints || [],
        strictMode: config.certificatePinning?.strictMode !== false,
        ...config.certificatePinning
      },
      
      healthCheckServer: {
        enabled: config.enableHealthCheckServer === true,
        port: config.healthCheckServer?.port || 8080,
        host: config.healthCheckServer?.host || '0.0.0.0',
        path: config.healthCheckServer?.path || '/healthz',
        ...config.healthCheckServer
      },
      
      resourceMonitoring: {
        enabled: config.enableResourceMonitoring !== false && securityProfile.enableResourceAlerts,
        memoryThresholdMB: config.resourceMonitoring?.memoryThresholdMB || securityProfile.memoryThresholdMB,
        heapThresholdPercent: config.resourceMonitoring?.heapThresholdPercent || 85,
        checkIntervalMs: config.resourceMonitoring?.checkIntervalMs || 30000,
        ...config.resourceMonitoring
      },
      
      gracefulShutdown: {
        enabled: config.enableGracefulShutdown !== false,
        timeoutMs: config.gracefulShutdown?.timeoutMs || 30000,
        ...config.gracefulShutdown
      },
      
      enableMetrics: config.enableMetrics !== false,
      enableHealthCheck: config.enableHealthCheck !== false,
      maxConcurrency: config.maxConcurrency || 10,
      memoryLimit: config.memoryLimit || 100,
      logLevel: config.logLevel || (securityProfile.enableDebugLogging ? 'debug' : 'info')
    };
  }

  /**
   * Validate URL according to security requirements
   * @private
   * @param {string} url - URL to validate
   * @param {Object} securitySettings - Security settings
   */
  _validateUrl(url, securitySettings) {
    try {
      const urlObj = new URL(url);
      
      // Check URL length
      if (url.length > securitySettings.maxUrlLength) {
        throw new RPCError(
          `URL exceeds maximum length of ${securitySettings.maxUrlLength} characters`,
          RPC_ERROR_CODES.SECURITY_VIOLATION
        );
      }

      // Check protocol
      if (securitySettings.enforceHttps && urlObj.protocol !== 'https:') {
        if (urlObj.hostname !== 'localhost' && urlObj.hostname !== '127.0.0.1') {
          throw new RPCError(
            'HTTPS is required for non-localhost connections',
            RPC_ERROR_CODES.SECURITY_VIOLATION
          );
        }
      }

      // Check for private IP ranges (SSRF protection)
      if (!securitySettings.allowPrivateIps) {
        const hostname = urlObj.hostname;
        if (this._isPrivateIp(hostname)) {
          throw new RPCError(
            'Private IP addresses are not allowed',
            RPC_ERROR_CODES.SECURITY_VIOLATION,
            { hostname }
          );
        }
      }

      // Check for malicious patterns
      const maliciousPatterns = [
        /javascript:/i,
        /data:/i,
        /file:/i,
        /ftp:/i,
        /@/,
        /\.\./,
        /[<>'"]/
      ];

      for (const pattern of maliciousPatterns) {
        if (pattern.test(url)) {
          throw new RPCError(
            'URL contains potentially malicious patterns',
            RPC_ERROR_CODES.SECURITY_VIOLATION
          );
        }
      }

    } catch (error) {
      if (error instanceof RPCError) {
        throw error;
      }
      throw new RPCError(
        'Invalid URL format',
        RPC_ERROR_CODES.INVALID_URL,
        { originalError: error.message }
      );
    }
  }

  /**
   * Check if hostname is a private IP address
   * @private
   * @param {string} hostname - Hostname to check
   * @returns {boolean} True if private IP
   */
  _isPrivateIp(hostname) {
    const privateRanges = [
      /^10\./,
      /^192\.168\./,
      /^172\.(1[6-9]|2[0-9]|3[01])\./,
      /^127\./,
      /^169\.254\./,
      /^224\./,
      /^::1$/,
      /^fc00:/,
      /^fe80:/
    ];

    return privateRanges.some(range => range.test(hostname));
  }

  /**
   * Create logger instance
   * @private
   * @returns {Object} Logger instance
   */
  _createLogger() {
    const logLevel = this.config.logLevel;
    const levels = ['debug', 'info', 'warn', 'error'];
    const currentLevelIndex = levels.indexOf(logLevel);

    const shouldLog = (level) => {
      const levelIndex = levels.indexOf(level);
      return levelIndex >= currentLevelIndex;
    };

    const formatMessage = (level, message, context = {}) => {
      return JSON.stringify({
        timestamp: new Date().toISOString(),
        level: level.toUpperCase(),
        service: 'RPCBroadcastProvider',
        message,
        context: this._maskSensitiveData(context),
        pid: process.pid,
        version: '2.0.0'
      });
    };

    return {
      debug: (message, context) => {
        if (shouldLog('debug')) {
          console.log(formatMessage('debug', message, context));
        }
      },
      info: (message, context) => {
        if (shouldLog('info')) {
          console.log(formatMessage('info', message, context));
        }
      },
      warn: (message, context) => {
        if (shouldLog('warn')) {
          console.warn(formatMessage('warn', message, context));
        }
      },
      error: (message, context) => {
        if (shouldLog('error')) {
          console.error(formatMessage('error', message, context));
        }
      }
    };
  }

  /**
   * Mask sensitive data for logging
   * @private
   * @param {any} data - Data to mask
   * @returns {any} Masked data
   */
  _maskSensitiveData(data) {
    if (typeof data === 'string') {
      // Mask URLs by showing only protocol and hostname
      try {
        const url = new URL(data);
        return `${url.protocol}//${url.hostname}`;
      } catch {
        // If not a URL, mask if it looks like sensitive data
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
            lowerKey.includes('secret') || lowerKey.includes('password') ||
            lowerKey.includes('fingerprint')) {
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
   * Initialize the ethers provider with enhanced security
   * @private
   */
  _initializeProvider() {
    try {
      const providerOptions = {
        timeout: this.config.timeout
      };

      // Add custom headers if provided
      if (Object.keys(this.config.headers).length > 0) {
        providerOptions.headers = this.config.headers;
      }

      // Add authentication headers
      if (this.config.auth) {
        providerOptions.headers = providerOptions.headers || {};
        
        switch (this.config.auth.type) {
          case 'bearer':
            providerOptions.headers['Authorization'] = `Bearer ${this.config.auth.token}`;
            break;
          case 'basic':
            const credentials = Buffer.from(`${this.config.auth.username}:${this.config.auth.password}`).toString('base64');
            providerOptions.headers['Authorization'] = `Basic ${credentials}`;
            break;
          case 'api-key':
            providerOptions.headers['X-API-Key'] = this.config.auth.token;
            break;
        }
      }

      // Enhanced HTTPS agent with certificate pinning
      if (this.config.rpcUrl.startsWith('https') && this.certificatePinningManager) {
        providerOptions.httpsAgent = new https.Agent({
          checkServerIdentity: (hostname, cert) => {
            // Standard hostname verification first
            const hostnameError = https.checkServerIdentity(hostname, cert);
            if (hostnameError) {
              this.logger.warn('Certificate hostname verification failed', { 
                hostname, 
                error: hostnameError.message 
              });
              return hostnameError;
            }

            // Certificate pinning validation
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
      
      this.logger.info('Enhanced provider initialized successfully');
      
    } catch (error) {
      this.logger.error('Failed to initialize provider', { error: error.message });
      throw new RPCError(
        'Failed to initialize RPC provider',
        RPC_ERROR_CODES.CONFIGURATION_ERROR,
        { originalError: error.message }
      );
    }
  }

  /**
   * Handle resource alerts
   * @private
   * @param {Object} alert - Resource alert
   */
  _handleResourceAlert(alert) {
    switch (alert.type) {
      case 'MEMORY_THRESHOLD_EXCEEDED':
        this.logger.warn('Memory threshold exceeded', alert);
        
        // Force garbage collection
        if (this.resourceMonitor.forceGarbageCollection()) {
          this.logger.info('Forced garbage collection to free memory');
        }
        
        // Clean up internal data structures
        this._cleanupMemory();
        break;

      case 'HEAP_THRESHOLD_EXCEEDED':
        this.logger.warn('Heap threshold exceeded', alert);
        
        // Take heap snapshot for analysis
        if (this.config.securityProfile === 'DEVELOPMENT') {
          this.resourceMonitor.takeHeapSnapshot();
        }
        break;

      case 'POTENTIAL_MEMORY_LEAK':
        this.logger.error('Potential memory leak detected', alert);
        
        // In production, this might trigger an alert to operations team
        if (this.config.securityProfile === 'PRODUCTION') {
          // Could integrate with alerting system here
          this.logger.error('Memory leak alert - operations team should investigate');
        }
        break;
    }
  }

  /**
   * Start health check server
   * @returns {Promise<void>}
   */
  async startHealthCheckServer() {
    if (this.healthCheckServer && !this.healthCheckServer.isRunning) {
      await this.healthCheckServer.start();
      this.logger.info('Health check server started', {
        port: this.config.healthCheckServer.port,
        path: this.config.healthCheckServer.path
      });
    }
  }

  /**
   * Stop health check server
   * @returns {Promise<void>}
   */
  async stopHealthCheckServer() {
    if (this.healthCheckServer && this.healthCheckServer.isRunning) {
      await this.healthCheckServer.stop();
      this.logger.info('Health check server stopped');
    }
  }

  /**
   * Get the configured ethers provider
   * @returns {ethers.JsonRpcProvider} The configured provider
   */
  getProvider() {
    if (!this.provider) {
      throw new RPCError(
        'Provider not initialized',
        RPC_ERROR_CODES.CONFIGURATION_ERROR
      );
    }
    return this.provider;
  }

  /**
   * Comprehensive RPC connectivity validation with stress testing
   * @param {Object} [options] - Validation options
   * @param {boolean} [options.includeStressTest=false] - Include stress testing
   * @param {number} [options.stressTestConcurrency=50] - Stress test concurrency
   * @param {number} [options.stressTestDuration=10000] - Stress test duration in ms
   * @returns {Promise<Object>} Validation results
   */
  async validateConnection(options = {}) {
    const startTime = Date.now();
    const results = {
      isValid: false,
      tests: {},
      chainId: null,
      blockNumber: null,
      responseTime: 0,
      errors: [],
      stressTestResults: null
    };

    try {
      this.logger.info('Starting enhanced connection validation');

      // Test 1: Basic connectivity
      try {
        await this._executeWithRetry(async () => {
          const network = await this.provider.getNetwork();
          results.tests.connectivity = { success: true, chainId: Number(network.chainId) };
          results.chainId = Number(network.chainId);
        });
      } catch (error) {
        results.tests.connectivity = { success: false, error: error.message };
        results.errors.push(`Connectivity test failed: ${error.message}`);
      }

      // Test 2: Chain ID validation
      if (results.chainId !== null && results.chainId !== this.config.chainId) {
        results.tests.chainIdValidation = { 
          success: false, 
          expected: this.config.chainId, 
          actual: results.chainId 
        };
        results.errors.push(`Chain ID mismatch: expected ${this.config.chainId}, got ${results.chainId}`);
      } else if (results.chainId !== null) {
        results.tests.chainIdValidation = { success: true };
      }

      // Test 3: Block number retrieval
      try {
        await this._executeWithRetry(async () => {
          const blockNumber = await this.provider.getBlockNumber();
          results.tests.blockNumber = { success: true, blockNumber };
          results.blockNumber = blockNumber;
        });
      } catch (error) {
        results.tests.blockNumber = { success: false, error: error.message };
        results.errors.push(`Block number test failed: ${error.message}`);
      }

      // Test 4: Performance test
      try {
        const perfStart = Date.now();
        await this._executeWithRetry(async () => {
          await this.provider.getBlockNumber();
        });
        const perfTime = Date.now() - perfStart;
        results.tests.performance = { 
          success: true, 
          responseTime: perfTime,
          acceptable: perfTime < this.config.timeout 
        };
      } catch (error) {
        results.tests.performance = { success: false, error: error.message };
      }

      // Test 5: Certificate validation (if HTTPS)
      if (this.config.rpcUrl.startsWith('https') && this.certificatePinningManager) {
        results.tests.certificateValidation = {
          success: true,
          validationsPerformed: this.stats.certificateValidations,
          pinningEnabled: true
        };
      }

      // Test 6: Stress testing (optional)
      if (options.includeStressTest) {
        try {
          results.stressTestResults = await this.performStressTest({
            concurrency: options.stressTestConcurrency || 50,
            duration: options.stressTestDuration || 10000
          });
          results.tests.stressTest = { success: true };
        } catch (error) {
          results.tests.stressTest = { success: false, error: error.message };
          results.errors.push(`Stress test failed: ${error.message}`);
        }
      }

      results.responseTime = Date.now() - startTime;
      results.isValid = results.errors.length === 0;

      // Update connection status
      this.stats.connectionStatus = results.isValid ? 'connected' : 'failed';

      this.logger.info('Enhanced connection validation completed', {
        isValid: results.isValid,
        responseTime: results.responseTime,
        errorsCount: results.errors.length,
        testsCompleted: Object.keys(results.tests).length
      });

      return results;

    } catch (error) {
      results.responseTime = Date.now() - startTime;
      results.errors.push(`Validation failed: ${error.message}`);
      
      this.logger.error('Enhanced connection validation failed', { error: error.message });
      
      return results;
    }
  }

  /**
   * Perform high-concurrency stress test
   * @param {Object} options - Stress test options
   * @param {number} [options.concurrency=50] - Number of concurrent requests
   * @param {number} [options.duration=10000] - Test duration in milliseconds
   * @returns {Promise<Object>} Stress test results
   */
  async performStressTest(options = {}) {
    const { concurrency = 50, duration = 10000 } = options;
    const results = {
      concurrency,
      duration,
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      minResponseTime: Infinity,
      maxResponseTime: 0,
      throughputPerSecond: 0,
      errors: [],
      resourceUsageBefore: null,
      resourceUsageAfter: null,
      memoryLeakDetected: false
    };

    this.logger.info('Starting stress test', { concurrency, duration });

    // Record initial resource usage
    if (this.resourceMonitor) {
      results.resourceUsageBefore = this.resourceMonitor.getStatus().memoryUsage;
    }

    const startTime = Date.now();
    const endTime = startTime + duration;
    const activePromises = new Set();
    let totalResponseTime = 0;

    // Launch concurrent requests
    while (Date.now() < endTime || activePromises.size > 0) {
      // Launch new requests if under time limit and under concurrency limit
      while (Date.now() < endTime && activePromises.size < concurrency) {
        const requestPromise = this._performStressTestRequest()
          .then(responseTime => {
            results.totalRequests++;
            results.successfulRequests++;
            totalResponseTime += responseTime;
            results.minResponseTime = Math.min(results.minResponseTime, responseTime);
            results.maxResponseTime = Math.max(results.maxResponseTime, responseTime);
          })
          .catch(error => {
            results.totalRequests++;
            results.failedRequests++;
            results.errors.push(error.message);
          })
          .finally(() => {
            activePromises.delete(requestPromise);
          });
        
        activePromises.add(requestPromise);
      }

      // Wait a bit before checking again
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    // Wait for all remaining requests to complete
    await Promise.allSettled(activePromises);

    const actualDuration = Date.now() - startTime;
    results.averageResponseTime = results.successfulRequests > 0 ? totalResponseTime / results.successfulRequests : 0;
    results.throughputPerSecond = (results.totalRequests / actualDuration) * 1000;

    if (results.minResponseTime === Infinity) {
      results.minResponseTime = 0;
    }

    // Record final resource usage and check for memory leaks
    if (this.resourceMonitor) {
      results.resourceUsageAfter = this.resourceMonitor.getStatus().memoryUsage;
      
      if (results.resourceUsageBefore && results.resourceUsageAfter) {
        const memoryIncreaseMB = results.resourceUsageAfter.heapUsedMB - results.resourceUsageBefore.heapUsedMB;
        
        // Simple heuristic: if memory increased by more than 50MB during stress test, flag as potential leak
        if (memoryIncreaseMB > 50) {
          results.memoryLeakDetected = true;
          this.logger.warn('Potential memory leak detected during stress test', {
            memoryIncreaseMB,
            before: results.resourceUsageBefore.heapUsedMB,
            after: results.resourceUsageAfter.heapUsedMB
          });
        }
      }
    }

    this.logger.info('Stress test completed', {
      totalRequests: results.totalRequests,
      successRate: (results.successfulRequests / results.totalRequests) * 100,
      throughputPerSecond: results.throughputPerSecond,
      averageResponseTime: results.averageResponseTime
    });

    return results;
  }

  /**
   * Perform single stress test request
   * @private
   * @returns {Promise<number>} Response time in milliseconds
   */
  async _performStressTestRequest() {
    const startTime = Date.now();
    
    // Use getBlockNumber as a simple, fast RPC call
    await this.provider.getBlockNumber();
    
    return Date.now() - startTime;
  }

  /**
   * Execute request with retry logic and circuit breaker
   * @private
   * @param {Function} requestFn - Function to execute
   * @returns {Promise} Request result
   */
  async _executeWithRetry(requestFn) {
    if (!this.circuitBreaker.canExecute()) {
      throw new RPCError(
        'Circuit breaker is open',
        RPC_ERROR_CODES.CIRCUIT_BREAKER_OPEN,
        this.circuitBreaker.getStatus()
      );
    }

    // Rate limiting check
    await this._checkRateLimit();

    const startTime = Date.now();
    let lastError;

    for (let attempt = 0; attempt <= this.config.retryConfig.maxRetries; attempt++) {
      try {
        // Execute request through queue
        const result = await this.requestQueue.execute(async () => {
          this.stats.totalRequests++;
          this.stats.lastRequestTime = Date.now();
          
          const requestPromise = requestFn();
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Request timeout')), this.config.timeout);
          });

          return Promise.race([requestPromise, timeoutPromise]);
        });

        // Success
        const responseTime = Date.now() - startTime;
        this.stats.successfulRequests++;
        this.stats.totalResponseTime += responseTime;
        this._updateResponseTimeHistory(responseTime);
        
        this.circuitBreaker.recordSuccess();
        
        this.logger.debug('Request executed successfully', {
          attempt: attempt + 1,
          responseTime
        });

        return result;

      } catch (error) {
        lastError = error;
        this.stats.failedRequests++;
        
        // Record error statistics
        const errorCode = error.code || 'UNKNOWN';
        this.stats.errors.set(errorCode, (this.stats.errors.get(errorCode) || 0) + 1);

        this.logger.warn('Request attempt failed', {
          attempt: attempt + 1,
          error: error.message,
          code: error.code
        });

        // Check if error is retryable
        if (!this._isRetryableError(error) || attempt === this.config.retryConfig.maxRetries) {
          this.circuitBreaker.recordFailure();
          break;
        }

        // Calculate delay for next attempt
        const delay = Math.min(
          this.config.retryConfig.baseDelay * Math.pow(2, attempt),
          this.config.retryConfig.maxDelay
        );

        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    this.circuitBreaker.recordFailure();

    // Determine appropriate error code
    let errorCode = RPC_ERROR_CODES.NETWORK_ERROR;
    if (lastError.message.includes('timeout')) {
      errorCode = RPC_ERROR_CODES.TIMEOUT;
    } else if (lastError.message.includes('auth')) {
      errorCode = RPC_ERROR_CODES.AUTHENTICATION_FAILED;
    } else if (lastError.message.includes('certificate')) {
      errorCode = RPC_ERROR_CODES.CERTIFICATE_ERROR;
    }

    throw new RPCError(
      `Request failed after ${this.config.retryConfig.maxRetries + 1} attempts: ${lastError.message}`,
      errorCode,
      { 
        originalError: lastError.message,
        attempts: this.config.retryConfig.maxRetries + 1,
        lastAttemptTime: Date.now()
      }
    );
  }

  /**
   * Check if error is retryable
   * @private
   * @param {Error} error - Error to check
   * @returns {boolean} True if retryable
   */
  _isRetryableError(error) {
    const nonRetryablePatterns = [
      /auth/i,
      /unauthorized/i,
      /forbidden/i,
      /invalid.*url/i,
      /malformed/i,
      /bad.*request/i,
      /certificate/i
    ];

    return !nonRetryablePatterns.some(pattern => 
      pattern.test(error.message) || pattern.test(error.code || '')
    );
  }

  /**
   * Check rate limiting
   * @private
   */
  async _checkRateLimit() {
    const now = Date.now();
    const oneSecondAgo = now - 1000;

    // Clean old requests
    this.rateLimiter.requests = this.rateLimiter.requests.filter(time => time > oneSecondAgo);

    if (this.rateLimiter.requests.length >= this.rateLimiter.maxRequestsPerSecond) {
      const oldestRequest = Math.min(...this.rateLimiter.requests);
      const waitTime = oldestRequest + 1000 - now;
      
      if (waitTime > 0) {
        this.logger.debug('Rate limit reached, waiting', { waitTime });
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }

    this.rateLimiter.requests.push(now);
  }

  /**
   * Update response time history
   * @private
   * @param {number} responseTime - Response time to add
   */
  _updateResponseTimeHistory(responseTime) {
    this.stats.responseTimeHistory.push({
      time: Date.now(),
      responseTime
    });

    // Keep only recent history
    if (this.stats.responseTimeHistory.length > this.memoryManager.maxHistorySize) {
      this.stats.responseTimeHistory = this.stats.responseTimeHistory.slice(-this.memoryManager.maxHistorySize);
    }
  }

  /**
   * Clean up memory periodically
   * @private
   */
  _cleanupMemory() {
    const now = Date.now();
    const oneHourAgo = now - 3600000;

    // Clean response time history
    this.stats.responseTimeHistory = this.stats.responseTimeHistory.filter(
      entry => entry.time > oneHourAgo
    );

    // Clean rate limiter history
    this.rateLimiter.requests = this.rateLimiter.requests.filter(
      time => time > now - 1000
    );

    // Clean error statistics (keep only recent errors)
    const errorEntries = Array.from(this.stats.errors.entries());
    this.stats.errors.clear();
    
    // Keep only errors that occurred recently or have high frequency
    errorEntries.forEach(([code, count]) => {
      if (count > 10) { // Keep frequently occurring errors
        this.stats.errors.set(code, Math.floor(count * 0.9)); // Decay count
      }
    });

    // Force garbage collection if available
    if (global.gc && this.resourceMonitor) {
      global.gc();
    }

    this.logger.debug('Memory cleanup completed');
  }

  /**
   * Get comprehensive statistics with enhanced metrics
   * @returns {Object} Current statistics
   */
  getStats() {
    const now = Date.now();
    const uptime = now - this.stats.startTime;
    const averageResponseTime = this.stats.successfulRequests > 0 ? 
      this.stats.totalResponseTime / this.stats.successfulRequests : 0;

    const baseStats = {
      ...this.stats,
      uptime,
      averageResponseTime,
      successRate: this.stats.totalRequests > 0 ? 
        this.stats.successfulRequests / this.stats.totalRequests : 0,
      circuitBreakerStatus: this.circuitBreaker.getStatus(),
      queueStatus: this.requestQueue.getStatus()
    };

    // Add enhanced metrics
    if (this.resourceMonitor) {
      baseStats.resourceStatus = this.resourceMonitor.getStatus();
    }

    if (this.healthCheckServer) {
      baseStats.healthCheckServer = {
        isRunning: this.healthCheckServer.isRunning,
        port: this.config.healthCheckServer.port,
        path: this.config.healthCheckServer.path
      };
    }

    baseStats.securityMetrics = {
      certificateValidations: this.stats.certificateValidations,
      certificatePinningEnabled: this.config.certificatePinning.enabled,
      httpsEnforced: this.config.securitySettings.enforceHttps,
      securityProfile: this.config.securityProfile
    };

    baseStats.memoryUsage = process.memoryUsage ? process.memoryUsage() : null;

    return baseStats;
  }

  /**
   * Get enhanced health check status
   * @returns {Promise<Object>} Health status
   */
  async getHealthStatus() {
    const stats = this.getStats();
    
    // Determine overall health
    const healthChecks = {
      connection: stats.connectionStatus === 'connected',
      circuitBreaker: stats.circuitBreakerStatus.state !== 'OPEN',
      memory: true,
      resources: true
    };

    // Check memory health
    if (this.resourceMonitor) {
      const resourceStatus = this.resourceMonitor.getStatus();
      healthChecks.memory = resourceStatus.memoryUsage.heapUsagePercent < 90;
      healthChecks.resources = resourceStatus.alertCount === 0 || 
        (resourceStatus.lastAlert && 
         Date.now() - new Date(resourceStatus.lastAlert.timestamp).getTime() > 300000); // No alerts in last 5 minutes
    }

    const isHealthy = Object.values(healthChecks).every(check => check === true);

    return {
      status: isHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: stats.uptime,
      connectionStatus: stats.connectionStatus,
      successRate: stats.successRate,
      averageResponseTime: stats.averageResponseTime,
      circuitBreakerState: stats.circuitBreakerStatus.state,
      activeRequests: stats.queueStatus.activeRequests,
      queuedRequests: stats.queueStatus.queuedRequests,
      memoryUsage: stats.memoryUsage,
      lastRequestTime: stats.lastRequestTime,
      
      // Enhanced health metrics
      healthChecks,
      securityMetrics: stats.securityMetrics,
      resourceAlerts: stats.resourceAlerts,
      version: '2.0.0',
      
      // Resource monitoring status
      resourceMonitoring: this.resourceMonitor ? {
        enabled: true,
        status: this.resourceMonitor.getStatus()
      } : { enabled: false }
    };
  }

  /**
   * Perform performance test with enhanced metrics
   * @param {Object} [options] - Test options
   * @param {number} [options.iterations=10] - Number of test iterations
   * @param {number} [options.concurrency=1] - Concurrent requests
   * @param {boolean} [options.includeMemoryProfile=false] - Include memory profiling
   * @returns {Promise<Object>} Performance test results
   */
  async performanceTest(options = {}) {
    const { iterations = 10, concurrency = 1, includeMemoryProfile = false } = options;
    const results = {
      iterations,
      concurrency,
      totalTime: 0,
      averageTime: 0,
      minTime: Infinity,
      maxTime: 0,
      successCount: 0,
      errorCount: 0,
      errors: [],
      throughput: 0,
      memoryProfile: null
    };

    this.logger.info('Starting enhanced performance test', { 
      iterations, 
      concurrency, 
      includeMemoryProfile 
    });

    let memoryBefore = null;
    if (includeMemoryProfile) {
      memoryBefore = process.memoryUsage();
    }

    const startTime = Date.now();
    const promises = [];

    for (let i = 0; i < iterations; i++) {
      const testPromise = this._performSingleTest()
        .then(time => {
          results.successCount++;
          results.minTime = Math.min(results.minTime, time);
          results.maxTime = Math.max(results.maxTime, time);
          return time;
        })
        .catch(error => {
          results.errorCount++;
          results.errors.push(error.message);
          return null;
        });

      promises.push(testPromise);

      // Control concurrency
      if (promises.length >= concurrency) {
        await Promise.all(promises.splice(0, concurrency));
      }
    }

    // Wait for remaining promises
    if (promises.length > 0) {
      await Promise.all(promises);
    }

    results.totalTime = Date.now() - startTime;
    results.averageTime = results.successCount > 0 ? 
      results.totalTime / results.successCount : 0;
    results.throughput = results.successCount > 0 ?
      (results.successCount / results.totalTime) * 1000 : 0;

    if (results.minTime === Infinity) {
      results.minTime = 0;
    }

    // Memory profiling
    if (includeMemoryProfile && memoryBefore) {
      const memoryAfter = process.memoryUsage();
      results.memoryProfile = {
        before: memoryBefore,
        after: memoryAfter,
        heapUsedDelta: memoryAfter.heapUsed - memoryBefore.heapUsed,
        heapTotalDelta: memoryAfter.heapTotal - memoryBefore.heapTotal,
        externalDelta: memoryAfter.external - memoryBefore.external,
        rssDelta: memoryAfter.rss - memoryBefore.rss
      };
    }

    this.logger.info('Enhanced performance test completed', {
      successCount: results.successCount,
      errorCount: results.errorCount,
      averageTime: results.averageTime,
      throughput: results.throughput,
      memoryProfiled: includeMemoryProfile
    });

    return results;
  }

  /**
   * Perform single performance test
   * @private
   * @returns {Promise<number>} Response time in milliseconds
   */
  async _performSingleTest() {
    const startTime = Date.now();
    await this.provider.getBlockNumber();
    return Date.now() - startTime;
  }

  /**
   * Get connection diagnostics with enhanced information
   * @returns {Promise<Object>} Diagnostic information
   */
  async getConnectionDiagnostics() {
    const diagnostics = {
      timestamp: new Date().toISOString(),
      version: '2.0.0',
      configuration: {
        rpcUrl: this._maskSensitiveData(this.config.rpcUrl),
        chainId: this.config.chainId,
        timeout: this.config.timeout,
        securityProfile: this.config.securityProfile,
        certificatePinningEnabled: this.config.certificatePinning.enabled,
        resourceMonitoringEnabled: this.config.resourceMonitoring.enabled,
        healthCheckServerEnabled: this.config.healthCheckServer.enabled
      },
      connectivity: null,
      performance: null,
      security: null,
      resources: null,
      errors: [],
      recommendations: []
    };

    try {
      // Basic connectivity test
      const connectivityStart = Date.now();
      const validation = await this.validateConnection();
      diagnostics.connectivity = {
        ...validation,
        testDuration: Date.now() - connectivityStart
      };

      // Performance analysis
      const perfTest = await this.performanceTest({ 
        iterations: 5, 
        concurrency: 1, 
        includeMemoryProfile: true 
      });
      diagnostics.performance = perfTest;

      // Security analysis
      diagnostics.security = {
        httpsEnabled: this.config.rpcUrl.startsWith('https'),
        certificatePinningEnabled: this.config.certificatePinning.enabled,
        certificateValidations: this.stats.certificateValidations,
        privateIpsBlocked: !this.config.securitySettings.allowPrivateIps,
        strictCertValidation: this.config.securitySettings.strictCertValidation
      };

      // Resource analysis
      if (this.resourceMonitor) {
        diagnostics.resources = this.resourceMonitor.getStatus();
      }

      // Enhanced recommendations
      const stats = this.getStats();
      
      if (stats.successRate < 0.95) {
        diagnostics.recommendations.push({
          type: 'reliability',
          message: 'Low success rate detected. Consider checking network connectivity or RPC endpoint reliability.',
          priority: 'high',
          actionable: [
            'Check RPC endpoint status',
            'Verify network connectivity',
            'Review error logs for patterns',
            'Consider implementing fallback endpoints'
          ]
        });
      }

      if (stats.averageResponseTime > this.config.timeout * 0.8) {
        diagnostics.recommendations.push({
          type: 'performance',
          message: 'High response times detected. Consider increasing timeout or using a different RPC endpoint.',
          priority: 'medium',
          actionable: [
            'Increase timeout configuration',
            'Use geographically closer RPC endpoint',
            'Implement request caching',
            'Review network latency'
          ]
        });
      }

      if (stats.circuitBreakerStatus.state === 'OPEN') {
        diagnostics.recommendations.push({
          type: 'availability',
          message: 'Circuit breaker is open. RPC endpoint may be experiencing issues.',
          priority: 'high',
          actionable: [
            'Wait for automatic circuit breaker reset',
            'Check RPC endpoint health',
            'Verify authentication credentials',
            'Review recent error patterns'
          ]
        });
      }

      if (stats.queueStatus.queuedRequests > stats.queueStatus.maxConcurrency) {
        diagnostics.recommendations.push({
          type: 'capacity',
          message: 'Request queue is backing up. Consider increasing maxConcurrency.',
          priority: 'medium',
          actionable: [
            'Increase maxConcurrency setting',
            'Review request patterns',
            'Consider implementing load balancing',
            'Monitor resource usage'
          ]
        });
      }

      // Security recommendations
      if (!this.config.certificatePinning.enabled && this.config.securityProfile === 'PRODUCTION') {
        diagnostics.recommendations.push({
          type: 'security',
          message: 'Certificate pinning is disabled in production. Consider enabling for enhanced security.',
          priority: 'medium',
          actionable: [
            'Enable certificate pinning',
            'Configure allowed certificate fingerprints',
            'Test certificate validation'
          ]
        });
      }

      // Resource recommendations
      if (this.resourceMonitor && diagnostics.resources.memoryUsage.heapUsagePercent > 80) {
        diagnostics.recommendations.push({
          type: 'resources',
          message: 'High memory usage detected. Monitor for potential memory leaks.',
          priority: 'medium',
          actionable: [
            'Monitor memory usage trends',
            'Review memory cleanup intervals',
            'Consider reducing history retention',
            'Enable garbage collection logging'
          ]
        });
      }

    } catch (error) {
      diagnostics.errors.push({
        type: 'diagnostic_error',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }

    return diagnostics;
  }

  /**
   * Export metrics for monitoring systems with enhanced format
   * @param {string} [format='json'] - Export format ('json', 'prometheus')
   * @returns {string|Object} Metrics in requested format
   */
  exportMetrics(format = 'json') {
    const stats = this.getStats();
    const metrics = {
      // Basic metrics
      rpc_total_requests: stats.totalRequests,
      rpc_successful_requests: stats.successfulRequests,
      rpc_failed_requests: stats.failedRequests,
      rpc_success_rate: stats.successRate,
      rpc_average_response_time_ms: stats.averageResponseTime,
      rpc_uptime_ms: stats.uptime,
      rpc_circuit_breaker_state: stats.circuitBreakerStatus.state === 'CLOSED' ? 0 : 1,
      rpc_active_requests: stats.queueStatus.activeRequests,
      rpc_queued_requests: stats.queueStatus.queuedRequests,
      rpc_connection_status: stats.connectionStatus === 'connected' ? 1 : 0,
      
      // Enhanced metrics
      rpc_certificate_validations: stats.certificateValidations,
      rpc_resource_alerts: stats.resourceAlerts,
      rpc_certificate_pinning_enabled: this.config.certificatePinning.enabled ? 1 : 0,
      rpc_security_profile: this.config.securityProfile === 'PRODUCTION' ? 2 : 
                           this.config.securityProfile === 'STAGING' ? 1 : 0
    };

    // Add resource metrics if available
    if (this.resourceMonitor) {
      const resourceStatus = this.resourceMonitor.getStatus();
      metrics.rpc_heap_used_mb = resourceStatus.memoryUsage.heapUsedMB;
      metrics.rpc_heap_usage_percent = resourceStatus.memoryUsage.heapUsagePercent;
      metrics.rpc_memory_threshold_mb = resourceStatus.thresholds.memoryThresholdMB;
    }

    if (format === 'prometheus') {
      let prometheusMetrics = '';
      for (const [key, value] of Object.entries(metrics)) {
        if (typeof value === 'number') {
          prometheusMetrics += `# TYPE ${key} gauge\n`;
          prometheusMetrics += `${key} ${value}\n`;
        }
      }
      return prometheusMetrics;
    }

    return metrics;
  }

  /**
   * Enhanced graceful shutdown
   * @returns {Promise<void>}
   */
  async shutdown() {
    this.logger.info('Initiating enhanced graceful shutdown');

    try {
      // Stop accepting new requests by marking as shutting down
      this.isShuttingDown = true;

      // Stop health check server first
      if (this.healthCheckServer) {
        await this.stopHealthCheckServer();
      }

      // Stop resource monitoring
      if (this.resourceMonitor) {
        this.resourceMonitor.stop();
      }

      // Clear cleanup interval
      if (this.memoryManager.cleanupInterval) {
        clearInterval(this.memoryManager.cleanupInterval);
      }

      // Wait for active requests to complete (with timeout)
      const shutdownTimeout = 30000; // 30 seconds
      const startTime = Date.now();

      while (this.requestQueue.getStatus().activeRequests > 0 && 
             Date.now() - startTime < shutdownTimeout) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Update connection status
      this.stats.connectionStatus = 'disconnected';

      // Final cleanup
      this._cleanupMemory();

      // Log final statistics
      const finalStats = this.getStats();
      this.logger.info('Final statistics before shutdown', {
        totalRequests: finalStats.totalRequests,
        successRate: finalStats.successRate,
        uptime: finalStats.uptime,
        averageResponseTime: finalStats.averageResponseTime
      });

      this.logger.info('Enhanced graceful shutdown completed');

    } catch (error) {
      this.logger.error('Error during enhanced shutdown', { error: error.message });
      throw error;
    }
  }

  /**
   * Get troubleshooting information with enhanced guidance
   * @returns {Object} Troubleshooting guide
   */
  getTroubleshootingInfo() {
    const stats = this.getStats();
    const issues = [];
    const solutions = [];

    // Connection issues
    if (stats.connectionStatus !== 'connected') {
      issues.push('RPC connection failed');
      solutions.push({
        issue: 'RPC connection failed',
        possibleCauses: [
          'Invalid RPC URL',
          'Network connectivity issues',
          'RPC endpoint is down',
          'Authentication problems',
          'Firewall blocking requests',
          'Certificate validation failures'
        ],
        suggestedActions: [
          'Verify RPC URL is correct and accessible',
          'Check network connectivity with ping/traceroute',
          'Test with curl: curl -X POST -H "Content-Type: application/json" --data \'{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}\' <RPC_URL>',
          'Verify authentication credentials',
          'Check firewall rules and proxy settings',
          'Validate SSL/TLS certificate if using HTTPS',
          'Review certificate pinning configuration if enabled'
        ],
        diagnosticCommands: [
          'curl -I <RPC_URL>',
          'openssl s_client -connect <hostname>:443',
          'nslookup <hostname>'
        ]
      });
    }

    // Performance issues
    if (stats.averageResponseTime > this.config.timeout * 0.5) {
      issues.push('High response times');
      solutions.push({
        issue: 'High response times',
        possibleCauses: [
          'Network latency',
          'RPC endpoint overload',
          'Insufficient timeout settings',
          'Geographic distance to endpoint',
          'Memory pressure affecting performance'
        ],
        suggestedActions: [
          'Increase timeout settings in configuration',
          'Use geographically closer RPC endpoint',
          'Implement request caching for repeated calls',
          'Contact RPC provider about performance',
          'Monitor resource usage and memory',
          'Consider load balancing across multiple endpoints'
        ]
      });
    }

    // Security issues
    if (this.config.certificatePinning.enabled && stats.certificateValidations === 0) {
      issues.push('Certificate pinning not functioning');
      solutions.push({
        issue: 'Certificate pinning not functioning',
        possibleCauses: [
          'HTTPS not being used',
          'Certificate pinning misconfigured',
          'No HTTPS requests made yet'
        ],
        suggestedActions: [
          'Verify HTTPS is being used for RPC calls',
          'Check certificate fingerprint configuration',
          'Review certificate pinning logs',
          'Test with a known certificate fingerprint'
        ]
      });
    }

    // Resource issues
    if (this.resourceMonitor && stats.resourceStatus?.alertCount > 0) {
      issues.push('Resource alerts detected');
      solutions.push({
        issue: 'Resource alerts detected',
        possibleCauses: [
          'Memory leaks',
          'High request volume',
          'Insufficient memory allocation',
          'Memory fragmentation'
        ],
        suggestedActions: [
          'Review memory usage trends',
          'Adjust memory thresholds if appropriate',
          'Monitor for memory leaks',
          'Consider increasing memory limits',
          'Review garbage collection settings'
        ]
      });
    }

    return {
      currentIssues: issues,
      detailedSolutions: solutions,
      currentStats: stats,
      enhancedDiagnostics: {
        version: '2.0.0',
        securityFeatures: {
          certificatePinningEnabled: this.config.certificatePinning.enabled,
          httpsEnforced: this.config.securitySettings.enforceHttps,
          privateIpsBlocked: !this.config.securitySettings.allowPrivateIps
        },
        monitoringFeatures: {
          resourceMonitoringEnabled: this.resourceMonitor?.isMonitoring || false,
          healthCheckServerEnabled: this.healthCheckServer?.isRunning || false,
          gracefulShutdownEnabled: this.config.gracefulShutdown.enabled
        }
      },
      configurationSummary: {
        timeout: this.config.timeout,
        maxRetries: this.config.retryConfig.maxRetries,
        securityProfile: this.config.securityProfile,
        maxConcurrency: this.config.maxConcurrency,
        memoryThresholdMB: this.config.resourceMonitoring.memoryThresholdMB
      },
      quickChecks: [
        'Test RPC URL: curl -X POST -H "Content-Type: application/json" --data \'{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}\' <RPC_URL>',
        'Verify chain ID matches expected value',
        'Check authentication credentials',
        'Confirm network connectivity: ping <hostname>',
        'Review recent error logs',
        'Check certificate validity: openssl s_client -connect <hostname>:443',
        'Monitor memory usage and alerts',
        'Verify health check endpoint if enabled'
      ],
      emergencyActions: [
        'Restart with DEVELOPMENT security profile for debugging',
        'Disable certificate pinning temporarily if connection issues',
        'Increase memory limits if resource alerts persist',
        'Enable debug logging for detailed troubleshooting',
        'Contact operations team if issues persist'
      ]
    };
  }
}

/**
 * Enhanced factory function to create RPC broadcast provider
 * @param {Object} config - Configuration object
 * @returns {RPCBroadcastProvider} Configured provider instance
 */
export default function createRpcBroadcastProvider(config) {
  try {
    const provider = new RPCBroadcastProvider(config);
    
    // Auto-start health check server if enabled
    if (config.enableHealthCheckServer) {
      provider.startHealthCheckServer().catch(error => {
        console.error('Failed to start health check server:', error.message);
      });
    }
    
    return provider;
  } catch (error) {
    // Enhanced error for factory function
    throw new RPCError(
      `Failed to create enhanced RPC broadcast provider: ${error.message}`,
      error.code || RPC_ERROR_CODES.CONFIGURATION_ERROR,
      {
        factoryError: true,
        originalError: error.message,
        config: error.context?.config ? 'provided' : 'missing',
        version: '2.0.0'
      }
    );
  }
}

/**
 * Enhanced utility function to validate RPC configuration
 * @param {Object} config - Configuration to validate
 * @returns {Object} Validation result with enhanced checks
 */
export function validateRpcConfig(config) {
  const validation = {
    isValid: true,
    errors: [],
    warnings: [],
    recommendations: [],
    securityChecks: {},
    performanceChecks: {}
  };

  try {
    // Test configuration by creating a temporary instance
    const tempProvider = new RPCBroadcastProvider(config);
    tempProvider.shutdown();

    // Security checks
    validation.securityChecks = {
      httpsEnforced: config.securityProfile === 'PRODUCTION' ? 
        config.rpcUrl?.startsWith('https') : true,
      certificatePinningConfigured: config.certificatePinning?.enabled && 
        (config.certificatePinning?.allowedFingerprints?.length > 0 || 
         config.certificatePinning?.allowedCAFingerprints?.length > 0),
      privateIpsBlocked: config.securityProfile === 'PRODUCTION'
    };

    // Performance checks
    validation.performanceChecks = {
      timeoutReasonable: (config.timeout || 30000) >= 10000,
      concurrencyConfigured: (config.maxConcurrency || 10) <= 100,
      retryConfigured: config.retryConfig?.maxRetries <= 5
    };

    // Enhanced recommendations
    if (config.securityProfile === 'DEVELOPMENT') {
      validation.warnings.push('Using development security profile - not recommended for production');
    }

    if (!config.retryConfig) {
      validation.recommendations.push('Configure retry settings for better reliability');
    }

    if (!config.circuitBreakerConfig) {
      validation.recommendations.push('Circuit breaker configuration improves fault tolerance');
    }

    if (config.timeout && config.timeout < 10000) {
      validation.warnings.push('Timeout less than 10 seconds may cause issues with slow networks');
    }

    if (!config.enableResourceMonitoring && config.securityProfile === 'PRODUCTION') {
      validation.recommendations.push('Enable resource monitoring for production deployments');
    }

    if (!config.certificatePinning?.enabled && config.securityProfile === 'PRODUCTION') {
      validation.recommendations.push('Consider enabling certificate pinning for enhanced security');
    }

  } catch (error) {
    validation.isValid = false;
    validation.errors.push(error.message);
  }

  return validation;
}

/**
 * Enhanced utility function to create multiple providers with load balancing
 * @param {Array<Object>} configs - Array of provider configurations
 * @param {Object} [loadBalancerConfig] - Load balancer configuration
 * @returns {Object} Enhanced load balanced provider manager
 */
export function createLoadBalancedProviders(configs, loadBalancerConfig = {}) {
  if (!Array.isArray(configs) || configs.length === 0) {
    throw new RPCError(
      'At least one provider configuration is required',
      RPC_ERROR_CODES.CONFIGURATION_ERROR
    );
  }

  const providers = configs.map((config, index) => {
    try {
      return {
        id: `provider_${index}`,
        provider: new RPCBroadcastProvider(config),
        weight: config.weight || 1,
        isHealthy: true,
        lastHealthCheck: null,
        consecutiveFailures: 0,
        totalRequests: 0,
        successfulRequests: 0
      };
    } catch (error) {
      throw new RPCError(
        `Failed to create provider ${index}: ${error.message}`,
        RPC_ERROR_CODES.CONFIGURATION_ERROR,
        { providerIndex: index }
      );
    }
  });

  const config = {
    healthCheckInterval: loadBalancerConfig.healthCheckInterval || 60000,
    maxConsecutiveFailures: loadBalancerConfig.maxConsecutiveFailures || 3,
    ...loadBalancerConfig
  };

  let healthCheckInterval = null;

  const manager = {
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
          const health = await providerInfo.provider.getHealthStatus();
          const wasHealthy = providerInfo.isHealthy;
          providerInfo.isHealthy = health.status === 'healthy';
          providerInfo.lastHealthCheck = new Date().toISOString();
          
          if (providerInfo.isHealthy) {
            providerInfo.consecutiveFailures = 0;
          } else {
            providerInfo.consecutiveFailures++;
            
            if (providerInfo.consecutiveFailures >= config.maxConsecutiveFailures) {
              console.warn(`Provider ${providerInfo.id} marked unhealthy after ${providerInfo.consecutiveFailures} failures`);
            }
          }
          
          // Log health transitions
          if (wasHealthy !== providerInfo.isHealthy) {
            console.info(`Provider ${providerInfo.id} health changed: ${wasHealthy ? 'healthy' : 'unhealthy'} -> ${providerInfo.isHealthy ? 'healthy' : 'unhealthy'}`);
          }
          
        } catch (error) {
          providerInfo.isHealthy = false;
          providerInfo.consecutiveFailures++;
