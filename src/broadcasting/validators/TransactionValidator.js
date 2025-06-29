/**
 * @fileoverview Enterprise-grade Transaction Validator for Trust Crypto Wallet Extension
 * @version 1.0.0
 * @author Trust Wallet Development Team
 * @license MIT
 * @description Production-ready transaction validator with comprehensive security, validation, and monitoring
 */

import { RPCError, RPC_ERROR_CODES } from '../providers/RPCBroadcastProvider.js';
import { SecurityManager } from '../../security/SecurityManager.js';
import { MetricsCollector } from '../../monitoring/MetricsCollector.js';
import { Logger } from '../../utils/Logger.js';

/**
 * Transaction validation error codes
 */
export const TRANSACTION_VALIDATION_ERRORS = {
  // Basic validation errors
  INVALID_TRANSACTION: 'TX_INVALID_TRANSACTION',
  MISSING_REQUIRED_FIELD: 'TX_MISSING_REQUIRED_FIELD',
  INVALID_FIELD_TYPE: 'TX_INVALID_FIELD_TYPE',
  INVALID_FIELD_VALUE: 'TX_INVALID_FIELD_VALUE',
  
  // Address validation errors
  INVALID_TO_ADDRESS: 'TX_INVALID_TO_ADDRESS',
  INVALID_FROM_ADDRESS: 'TX_INVALID_FROM_ADDRESS',
  ZERO_ADDRESS_NOT_ALLOWED: 'TX_ZERO_ADDRESS_NOT_ALLOWED',
  BLACKLISTED_ADDRESS: 'TX_BLACKLISTED_ADDRESS',
  
  // Value and gas validation errors
  INVALID_VALUE: 'TX_INVALID_VALUE',
  INSUFFICIENT_BALANCE: 'TX_INSUFFICIENT_BALANCE',
  INVALID_GAS_LIMIT: 'TX_INVALID_GAS_LIMIT',
  INVALID_GAS_PRICE: 'TX_INVALID_GAS_PRICE',
  GAS_LIMIT_EXCEEDED: 'TX_GAS_LIMIT_EXCEEDED',
  GAS_PRICE_TOO_LOW: 'TX_GAS_PRICE_TOO_LOW',
  GAS_PRICE_TOO_HIGH: 'TX_GAS_PRICE_TOO_HIGH',
  
  // Nonce validation errors
  INVALID_NONCE: 'TX_INVALID_NONCE',
  NONCE_TOO_LOW: 'TX_NONCE_TOO_LOW',
  NONCE_TOO_HIGH: 'TX_NONCE_TOO_HIGH',
  NONCE_GAP_DETECTED: 'TX_NONCE_GAP_DETECTED',
  
  // Data validation errors
  INVALID_DATA: 'TX_INVALID_DATA',
  DATA_TOO_LARGE: 'TX_DATA_TOO_LARGE',
  MALICIOUS_DATA_DETECTED: 'TX_MALICIOUS_DATA_DETECTED',
  
  // Chain and type validation errors
  INVALID_CHAIN_ID: 'TX_INVALID_CHAIN_ID',
  UNSUPPORTED_CHAIN: 'TX_UNSUPPORTED_CHAIN',
  INVALID_TRANSACTION_TYPE: 'TX_INVALID_TRANSACTION_TYPE',
  UNSUPPORTED_TRANSACTION_TYPE: 'TX_UNSUPPORTED_TRANSACTION_TYPE',
  
  // EIP-1559 validation errors
  INVALID_MAX_FEE_PER_GAS: 'TX_INVALID_MAX_FEE_PER_GAS',
  INVALID_MAX_PRIORITY_FEE: 'TX_INVALID_MAX_PRIORITY_FEE',
  PRIORITY_FEE_EXCEEDS_MAX_FEE: 'TX_PRIORITY_FEE_EXCEEDS_MAX_FEE',
  
  // Security validation errors
  SUSPICIOUS_TRANSACTION: 'TX_SUSPICIOUS_TRANSACTION',
  POTENTIAL_FRAUD: 'TX_POTENTIAL_FRAUD',
  HIGH_RISK_TRANSACTION: 'TX_HIGH_RISK_TRANSACTION',
  CONTRACT_INTERACTION_BLOCKED: 'TX_CONTRACT_INTERACTION_BLOCKED',
  
  // Business logic errors
  TRANSACTION_EXPIRED: 'TX_TRANSACTION_EXPIRED',
  RATE_LIMIT_EXCEEDED: 'TX_RATE_LIMIT_EXCEEDED',
  DAILY_LIMIT_EXCEEDED: 'TX_DAILY_LIMIT_EXCEEDED',
  MAINTENANCE_MODE: 'TX_MAINTENANCE_MODE'
};

/**
 * Network-specific configuration
 */
export const NETWORK_CONFIGS = {
  1: { // Ethereum Mainnet
    name: 'ethereum',
    maxGasLimit: 30000000,
    minGasPrice: 1000000000, // 1 gwei
    maxGasPrice: 1000000000000, // 1000 gwei
    maxDataSize: 131072, // 128KB
    blockGasLimit: 30000000,
    avgBlockTime: 12000
  },
  56: { // BSC
    name: 'bsc',
    maxGasLimit: 50000000,
    minGasPrice: 3000000000, // 3 gwei
    maxGasPrice: 20000000000, // 20 gwei
    maxDataSize: 131072,
    blockGasLimit: 50000000,
    avgBlockTime: 3000
  },
  137: { // Polygon
    name: 'polygon',
    maxGasLimit: 20000000,
    minGasPrice: 30000000000, // 30 gwei
    maxGasPrice: 500000000000, // 500 gwei
    maxDataSize: 131072,
    blockGasLimit: 20000000,
    avgBlockTime: 2000
  },
  42161: { // Arbitrum
    name: 'arbitrum',
    maxGasLimit: 1125899906842624,
    minGasPrice: 100000000, // 0.1 gwei
    maxGasPrice: 100000000000, // 100 gwei
    maxDataSize: 131072,
    blockGasLimit: 1125899906842624,
    avgBlockTime: 1000
  }
};

/**
 * Transaction type definitions
 */
export const TRANSACTION_TYPES = {
  LEGACY: 0,
  EIP_2930: 1, // Access list
  EIP_1559: 2  // Dynamic fee
};

/**
 * Enterprise-grade Transaction Validator
 * @class TransactionValidator
 */
export class TransactionValidator {
  /**
   * @param {Object} config - Validator configuration
   * @param {number} config.chainId - Network chain ID
   * @param {Object} [config.security] - Security configuration
   * @param {Object} [config.limits] - Transaction limits configuration
   * @param {Object} [config.monitoring] - Monitoring configuration
   * @param {Array} [config.blacklistedAddresses] - Blacklisted addresses
   * @param {Array} [config.whitelistedAddresses] - Whitelisted addresses
   */
  constructor({
    chainId,
    security = {},
    limits = {},
    monitoring = {},
    blacklistedAddresses = [],
    whitelistedAddresses = []
  }) {
    if (!chainId || typeof chainId !== 'number') {
      throw new Error('Valid chain ID is required');
    }

    this.chainId = chainId;
    this.networkConfig = NETWORK_CONFIGS[chainId];
    
    if (!this.networkConfig) {
      throw new Error(`Unsupported chain ID: ${chainId}`);
    }

    // Initialize components
    this.logger = new Logger('TransactionValidator');
    this.securityManager = new SecurityManager({
      enableThreatDetection: true,
      enableAddressAnalysis: true,
      enableDataAnalysis: true,
      ...security
    });
    
    this.metrics = new MetricsCollector({
      component: 'transaction_validator',
      labels: { chainId: this.chainId, network: this.networkConfig.name },
      ...monitoring
    });

    // Security lists
    this.blacklistedAddresses = new Set(blacklistedAddresses.map(addr => addr.toLowerCase()));
    this.whitelistedAddresses = new Set(whitelistedAddresses.map(addr => addr.toLowerCase()));

    // Configuration with defaults
    this.config = {
      // Gas configuration
      maxGasLimit: this.networkConfig.maxGasLimit,
      minGasPrice: this.networkConfig.minGasPrice,
      maxGasPrice: this.networkConfig.maxGasPrice,
      
      // Data limits
      maxDataSize: this.networkConfig.maxDataSize,
      
      // Security settings
      enableAddressValidation: true,
      enableSecurityChecks: true,
      enableValueLimits: true,
      enableDataValidation: true,
      
      // Transaction limits (null means unlimited)
      maxDailyValue: '1000000000000000000000', // 1000 ETH in wei (null for unlimited)
      maxSingleTransaction: '100000000000000000000', // 100 ETH in wei (null for unlimited)
      
      // Rate limiting
      maxTransactionsPerMinute: 10,
      maxTransactionsPerHour: 100,
      
      // Merge with provided limits
      ...limits
    };

    // Transaction tracking for rate limiting
    this.transactionHistory = new Map();
    
    // Start cleanup interval
    this._startCleanupInterval();

    this.logger.info('TransactionValidator initialized', {
      chainId: this.chainId,
      network: this.networkConfig.name,
      config: this._sanitizeConfig(this.config)
    });
  }

  /**
   * Main validation method - validates a complete transaction
   * @param {Object} transaction - Transaction object to validate
   * @param {Object} [options] - Validation options
   * @returns {Promise<Object>} Validation result
   */
  async validateTransaction(transaction, options = {}) {
    const startTime = Date.now();
    const validationId = this._generateValidationId();

    try {
      this.logger.debug('Starting transaction validation', {
        validationId,
        transactionHash: transaction.hash,
        from: this._maskAddress(transaction.from),
        to: this._maskAddress(transaction.to)
      });

      // Increment validation counter
      this.metrics.increment('validations_total');

      // Pre-validation checks
      await this._preValidationChecks(transaction, options);

      // Core validation steps
      const validationResults = await this._performValidationSteps(transaction, options);

      // Post-validation security checks
      await this._postValidationSecurityChecks(transaction, validationResults, options);

      // Create validation result
      const result = {
        valid: true,
        validationId,
        timestamp: new Date().toISOString(),
        chainId: this.chainId,
        network: this.networkConfig.name,
        validationTime: Date.now() - startTime,
        checks: validationResults,
        warnings: this._extractWarnings(validationResults),
        metadata: {
          validator: 'TransactionValidator',
          version: '1.0.0',
          securityLevel: this._calculateSecurityLevel(validationResults)
        }
      };

      // Record success metrics
      this.metrics.increment('validations_successful');
      this.metrics.recordTiming('validation_duration', result.validationTime);

      this.logger.info('Transaction validation completed successfully', {
        validationId,
        validationTime: result.validationTime,
        securityLevel: result.metadata.securityLevel,
        warnings: result.warnings.length
      });

      return result;

    } catch (error) {
      const validationTime = Date.now() - startTime;
      
      // Record failure metrics
      this.metrics.increment('validations_failed');
      this.metrics.increment('validation_errors', { errorType: error.code || 'unknown' });

      this.logger.error('Transaction validation failed', {
        validationId,
        error: error.message,
        errorCode: error.code,
        validationTime,
        transactionHash: transaction?.hash
      });

      throw new RPCError(
        `Transaction validation failed: ${error.message}`,
        error.code || TRANSACTION_VALIDATION_ERRORS.INVALID_TRANSACTION,
        {
          validationId,
          originalError: error,
          validationTime,
          chainId: this.chainId
        }
      );
    }
  }

  /**
   * Performs pre-validation checks
   * @private
   */
  async _preValidationChecks(transaction, options) {
    // Check if transaction object exists
    if (!transaction || typeof transaction !== 'object') {
      throw new RPCError(
        'Transaction object is required',
        TRANSACTION_VALIDATION_ERRORS.INVALID_TRANSACTION
      );
    }

    // Check maintenance mode
    if (options.maintenanceMode) {
      throw new RPCError(
        'Transaction validation unavailable during maintenance',
        TRANSACTION_VALIDATION_ERRORS.MAINTENANCE_MODE
      );
    }

    // Check rate limiting
    await this._checkRateLimits(transaction.from);
  }

  /**
   * Performs all validation steps
   * @private
   */
  async _performValidationSteps(transaction, options) {
    const results = {};

    // Required field validation
    results.requiredFields = await this._validateRequiredFields(transaction);
    
    // Address validation
    results.addresses = await this._validateAddresses(transaction);
    
    // Value validation
    results.value = await this._validateValue(transaction);
    
    // Gas validation
    results.gas = await this._validateGas(transaction);
    
    // Nonce validation (if nonce provided)
    if (transaction.nonce !== undefined) {
      results.nonce = await this._validateNonce(transaction);
    }
    
    // Data validation
    results.data = await this._validateData(transaction);
    
    // Chain ID validation
    results.chainId = await this._validateChainId(transaction);
    
    // Transaction type validation
    results.transactionType = await this._validateTransactionType(transaction);
    
    // EIP-1559 validation (if applicable)
    if (transaction.type === TRANSACTION_TYPES.EIP_1559) {
      results.eip1559 = await this._validateEIP1559Fields(transaction);
    }

    return results;
  }

  /**
   * Validates required transaction fields
   * @private
   */
  async _validateRequiredFields(transaction) {
    const requiredFields = ['to', 'value', 'gasLimit'];
    const missing = [];
    const invalid = [];

    for (const field of requiredFields) {
      if (transaction[field] === undefined || transaction[field] === null) {
        missing.push(field);
      } else if (typeof transaction[field] !== 'string' && typeof transaction[field] !== 'number') {
        invalid.push(field);
      }
    }

    if (missing.length > 0) {
      throw new RPCError(
        `Missing required fields: ${missing.join(', ')}`,
        TRANSACTION_VALIDATION_ERRORS.MISSING_REQUIRED_FIELD,
        { missingFields: missing }
      );
    }

    if (invalid.length > 0) {
      throw new RPCError(
        `Invalid field types: ${invalid.join(', ')}`,
        TRANSACTION_VALIDATION_ERRORS.INVALID_FIELD_TYPE,
        { invalidFields: invalid }
      );
    }

    return {
      status: 'valid',
      message: 'All required fields present and valid',
      fieldsChecked: requiredFields
    };
  }

  /**
   * Validates transaction addresses
   * @private
   */
  async _validateAddresses(transaction) {
    const results = {
      to: await this._validateSingleAddress(transaction.to, 'to'),
      from: transaction.from ? await this._validateSingleAddress(transaction.from, 'from') : null
    };

    // Check for zero address (if not allowed)
    if (transaction.to === '0x0000000000000000000000000000000000000000') {
      throw new RPCError(
        'Zero address not allowed as destination',
        TRANSACTION_VALIDATION_ERRORS.ZERO_ADDRESS_NOT_ALLOWED
      );
    }

    // Security checks
    await this._performAddressSecurityChecks(transaction.to, transaction.from);

    return {
      status: 'valid',
      message: 'All addresses are valid',
      details: results
    };
  }

  /**
   * Validates a single address
   * @private
   */
  async _validateSingleAddress(address, fieldName) {
    if (!address || typeof address !== 'string') {
      throw new RPCError(
        `Invalid ${fieldName} address: must be a string`,
        TRANSACTION_VALIDATION_ERRORS.INVALID_TO_ADDRESS
      );
    }

    // Basic format validation
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      throw new RPCError(
        `Invalid ${fieldName} address format`,
        fieldName === 'to' ? TRANSACTION_VALIDATION_ERRORS.INVALID_TO_ADDRESS : TRANSACTION_VALIDATION_ERRORS.INVALID_FROM_ADDRESS
      );
    }

    // Checksum validation
    if (!this._isValidChecksum(address)) {
      return {
        status: 'warning',
        message: `Address ${fieldName} has invalid checksum`,
        address: this._maskAddress(address)
      };
    }

    return {
      status: 'valid',
      message: `Address ${fieldName} is valid`,
      address: this._maskAddress(address)
    };
  }

  /**
   * Performs address security checks
   * @private
   */
  async _performAddressSecurityChecks(toAddress, fromAddress) {
    const toLower = toAddress.toLowerCase();
    const fromLower = fromAddress?.toLowerCase();

    // Check blacklist
    if (this.blacklistedAddresses.has(toLower)) {
      throw new RPCError(
        'Destination address is blacklisted',
        TRANSACTION_VALIDATION_ERRORS.BLACKLISTED_ADDRESS,
        { address: this._maskAddress(toAddress) }
      );
    }

    if (fromLower && this.blacklistedAddresses.has(fromLower)) {
      throw new RPCError(
        'Source address is blacklisted',
        TRANSACTION_VALIDATION_ERRORS.BLACKLISTED_ADDRESS,
        { address: this._maskAddress(fromAddress) }
      );
    }

    // Advanced security analysis
    if (this.config.enableSecurityChecks) {
      const securityAnalysis = await this.securityManager.analyzeAddress(toAddress);
      
      if (securityAnalysis.riskLevel === 'high') {
        throw new RPCError(
          'High-risk address detected',
          TRANSACTION_VALIDATION_ERRORS.HIGH_RISK_TRANSACTION,
          { riskFactors: securityAnalysis.riskFactors }
        );
      }
    }
  }

  /**
   * Validates transaction value
   * @private
   */
  async _validateValue(transaction) {
    const value = transaction.value;

    // Convert to BigInt for precise comparison
    let valueBigInt;
    try {
      valueBigInt = BigInt(value);
    } catch (error) {
      throw new RPCError(
        'Invalid value format',
        TRANSACTION_VALIDATION_ERRORS.INVALID_VALUE,
        { value }
      );
    }

    // Check for negative values
    if (valueBigInt < 0n) {
      throw new RPCError(
        'Transaction value cannot be negative',
        TRANSACTION_VALIDATION_ERRORS.INVALID_VALUE,
        { value: value.toString() }
      );
    }

    // Check transaction limits (only if limits are enabled and not null)
    if (this.config.enableValueLimits && this.config.maxSingleTransaction !== null) {
      const maxSingleTx = BigInt(this.config.maxSingleTransaction);
      
      if (valueBigInt > maxSingleTx) {
        throw new RPCError(
          'Transaction value exceeds single transaction limit',
          TRANSACTION_VALIDATION_ERRORS.DAILY_LIMIT_EXCEEDED,
          { 
            value: value.toString(),
            limit: this.config.maxSingleTransaction 
          }
        );
      }
    }

    // Check daily limits (if enabled and not null)
    if (this.config.enableValueLimits && this.config.maxDailyValue !== null) {
      await this._checkDailyValueLimits(transaction.from, valueBigInt);
    }

    return {
      status: 'valid',
      message: 'Transaction value is valid',
      value: value.toString(),
      valueWei: valueBigInt.toString(),
      unlimited: this.config.maxSingleTransaction === null
    };
  }

  /**
   * Validates gas parameters
   * @private
   */
  async _validateGas(transaction) {
    const results = {};

    // Validate gas limit
    if (transaction.gasLimit) {
      results.gasLimit = await this._validateGasLimit(transaction.gasLimit);
    }

    // Validate gas price (legacy transactions)
    if (transaction.gasPrice) {
      results.gasPrice = await this._validateGasPrice(transaction.gasPrice);
    }

    return {
      status: 'valid',
      message: 'Gas parameters are valid',
      details: results
    };
  }

  /**
   * Validates gas limit
   * @private
   */
  async _validateGasLimit(gasLimit) {
    let gasLimitBigInt;
    try {
      gasLimitBigInt = BigInt(gasLimit);
    } catch (error) {
      throw new RPCError(
        'Invalid gas limit format',
        TRANSACTION_VALIDATION_ERRORS.INVALID_GAS_LIMIT,
        { gasLimit }
      );
    }

    // Check minimum gas limit
    if (gasLimitBigInt < 21000n) {
      throw new RPCError(
        'Gas limit too low (minimum 21000)',
        TRANSACTION_VALIDATION_ERRORS.INVALID_GAS_LIMIT,
        { gasLimit: gasLimit.toString(), minimum: '21000' }
      );
    }

    // Check maximum gas limit
    const maxGasLimit = BigInt(this.config.maxGasLimit);
    if (gasLimitBigInt > maxGasLimit) {
      throw new RPCError(
        'Gas limit exceeds network maximum',
        TRANSACTION_VALIDATION_ERRORS.GAS_LIMIT_EXCEEDED,
        { 
          gasLimit: gasLimit.toString(),
          maximum: this.config.maxGasLimit.toString()
        }
      );
    }

    return {
      status: 'valid',
      message: 'Gas limit is valid',
      gasLimit: gasLimit.toString()
    };
  }

  /**
   * Validates gas price
   * @private
   */
  async _validateGasPrice(gasPrice) {
    let gasPriceBigInt;
    try {
      gasPriceBigInt = BigInt(gasPrice);
    } catch (error) {
      throw new RPCError(
        'Invalid gas price format',
        TRANSACTION_VALIDATION_ERRORS.INVALID_GAS_PRICE,
        { gasPrice }
      );
    }

    // Check minimum gas price
    const minGasPrice = BigInt(this.config.minGasPrice);
    if (gasPriceBigInt < minGasPrice) {
      throw new RPCError(
        'Gas price too low',
        TRANSACTION_VALIDATION_ERRORS.GAS_PRICE_TOO_LOW,
        { 
          gasPrice: gasPrice.toString(),
          minimum: this.config.minGasPrice.toString()
        }
      );
    }

    // Check maximum gas price
    const maxGasPrice = BigInt(this.config.maxGasPrice);
    if (gasPriceBigInt > maxGasPrice) {
      throw new RPCError(
        'Gas price too high',
        TRANSACTION_VALIDATION_ERRORS.GAS_PRICE_TOO_HIGH,
        { 
          gasPrice: gasPrice.toString(),
          maximum: this.config.maxGasPrice.toString()
        }
      );
    }

    return {
      status: 'valid',
      message: 'Gas price is valid',
      gasPrice: gasPrice.toString()
    };
  }

  /**
   * Validates transaction nonce
   * @private
   */
  async _validateNonce(transaction) {
    const nonce = transaction.nonce;

    let nonceBigInt;
    try {
      nonceBigInt = BigInt(nonce);
    } catch (error) {
      throw new RPCError(
        'Invalid nonce format',
        TRANSACTION_VALIDATION_ERRORS.INVALID_NONCE,
        { nonce }
      );
    }

    // Check for negative nonce
    if (nonceBigInt < 0n) {
      throw new RPCError(
        'Nonce cannot be negative',
        TRANSACTION_VALIDATION_ERRORS.INVALID_NONCE,
        { nonce: nonce.toString() }
      );
    }

    // Additional nonce validation would require account state
    // This is a placeholder for more sophisticated nonce validation

    return {
      status: 'valid',
      message: 'Nonce format is valid',
      nonce: nonce.toString()
    };
  }

  /**
   * Validates transaction data
   * @private
   */
  async _validateData(transaction) {
    const data = transaction.data || transaction.input || '0x';

    // Basic format validation
    if (typeof data !== 'string') {
      throw new RPCError(
        'Transaction data must be a string',
        TRANSACTION_VALIDATION_ERRORS.INVALID_DATA,
        { dataType: typeof data }
      );
    }

    // Hex format validation
    if (!/^0x[a-fA-F0-9]*$/.test(data)) {
      throw new RPCError(
        'Transaction data must be valid hex',
        TRANSACTION_VALIDATION_ERRORS.INVALID_DATA,
        { data: data.substring(0, 20) + '...' }
      );
    }

    // Size validation
    const dataSize = (data.length - 2) / 2; // Convert hex to bytes
    if (dataSize > this.config.maxDataSize) {
      throw new RPCError(
        'Transaction data too large',
        TRANSACTION_VALIDATION_ERRORS.DATA_TOO_LARGE,
        { 
          size: dataSize,
          maxSize: this.config.maxDataSize
        }
      );
    }

    // Security analysis of data
    if (this.config.enableDataValidation && data.length > 2) {
      const securityAnalysis = await this.securityManager.analyzeTransactionData(data);
      
      if (securityAnalysis.isMalicious) {
        throw new RPCError(
          'Malicious transaction data detected',
          TRANSACTION_VALIDATION_ERRORS.MALICIOUS_DATA_DETECTED,
          { threats: securityAnalysis.threats }
        );
      }
    }

    return {
      status: 'valid',
      message: 'Transaction data is valid',
      dataSize,
      hasData: data.length > 2
    };
  }

  /**
   * Validates chain ID
   * @private
   */
  async _validateChainId(transaction) {
    if (transaction.chainId === undefined) {
      return {
        status: 'warning',
        message: 'Chain ID not specified in transaction'
      };
    }

    const chainId = parseInt(transaction.chainId);
    if (chainId !== this.chainId) {
      throw new RPCError(
        'Chain ID mismatch',
        TRANSACTION_VALIDATION_ERRORS.INVALID_CHAIN_ID,
        { 
          transactionChainId: chainId,
          expectedChainId: this.chainId
        }
      );
    }

    return {
      status: 'valid',
      message: 'Chain ID is valid',
      chainId
    };
  }

  /**
   * Validates transaction type
   * @private
   */
  async _validateTransactionType(transaction) {
    if (transaction.type === undefined) {
      return {
        status: 'valid',
        message: 'Legacy transaction (no type specified)',
        type: 'legacy'
      };
    }

    const type = parseInt(transaction.type);
    const validTypes = Object.values(TRANSACTION_TYPES);

    if (!validTypes.includes(type)) {
      throw new RPCError(
        'Unsupported transaction type',
        TRANSACTION_VALIDATION_ERRORS.UNSUPPORTED_TRANSACTION_TYPE,
        { 
          type,
          supportedTypes: validTypes
        }
      );
    }

    return {
      status: 'valid',
      message: 'Transaction type is valid',
      type,
      typeName: this._getTransactionTypeName(type)
    };
  }

  /**
   * Validates EIP-1559 specific fields
   * @private
   */
  async _validateEIP1559Fields(transaction) {
    const results = {};

    // Validate maxFeePerGas
    if (transaction.maxFeePerGas) {
      results.maxFeePerGas = await this._validateMaxFeePerGas(transaction.maxFeePerGas);
    } else {
      throw new RPCError(
        'maxFeePerGas required for EIP-1559 transactions',
        TRANSACTION_VALIDATION_ERRORS.INVALID_MAX_FEE_PER_GAS
      );
    }

    // Validate maxPriorityFeePerGas
    if (transaction.maxPriorityFeePerGas) {
      results.maxPriorityFeePerGas = await this._validateMaxPriorityFeePerGas(transaction.maxPriorityFeePerGas);
    } else {
      throw new RPCError(
        'maxPriorityFeePerGas required for EIP-1559 transactions',
        TRANSACTION_VALIDATION_ERRORS.INVALID_MAX_PRIORITY_FEE
      );
    }

    // Validate fee relationship
    const maxFee = BigInt(transaction.maxFeePerGas);
    const priorityFee = BigInt(transaction.maxPriorityFeePerGas);

    if (priorityFee > maxFee) {
      throw new RPCError(
        'Priority fee cannot exceed max fee per gas',
        TRANSACTION_VALIDATION_ERRORS.PRIORITY_FEE_EXCEEDS_MAX_FEE,
        {
          maxFeePerGas: transaction.maxFeePerGas,
          maxPriorityFeePerGas: transaction.maxPriorityFeePerGas
        }
      );
    }

    return {
      status: 'valid',
      message: 'EIP-1559 fields are valid',
      details: results
    };
  }

  /**
   * Validates maxFeePerGas
   * @private
   */
  async _validateMaxFeePerGas(maxFeePerGas) {
    let maxFeeBigInt;
    try {
      maxFeeBigInt = BigInt(maxFeePerGas);
    } catch (error) {
      throw new RPCError(
        'Invalid maxFeePerGas format',
        TRANSACTION_VALIDATION_ERRORS.INVALID_MAX_FEE_PER_GAS,
        { maxFeePerGas }
      );
    }

    // Check reasonable bounds
    const maxGasPrice = BigInt(this.config.maxGasPrice);
    if (maxFeeBigInt > maxGasPrice) {
      throw new RPCError(
        'maxFeePerGas exceeds reasonable limit',
        TRANSACTION_VALIDATION_ERRORS.INVALID_MAX_FEE_PER_GAS,
        { 
          maxFeePerGas: maxFeePerGas.toString(),
          limit: this.config.maxGasPrice.toString()
        }
      );
    }

    return {
      status: 'valid',
      message: 'maxFeePerGas is valid',
      maxFeePerGas: maxFeePerGas.toString()
    };
  }

  /**
   * Validates maxPriorityFeePerGas
   * @private
   */
  async _validateMaxPriorityFeePerGas(maxPriorityFeePerGas) {
    let priorityFeeBigInt;
    try {
      priorityFeeBigInt = BigInt(maxPriorityFeePerGas);
    } catch (error) {
      throw new RPCError(
        'Invalid maxPriorityFeePerGas format',
        TRANSACTION_VALIDATION_ERRORS.INVALID_MAX_PRIORITY_FEE,
        { maxPriorityFeePerGas }
      );
    }

    // Check for negative values
    if (priorityFeeBigInt < 0n) {
      throw new RPCError(
        'maxPriorityFeePerGas cannot be negative',
        TRANSACTION_VALIDATION_ERRORS.INVALID_MAX_PRIORITY_FEE,
        { maxPriorityFeePerGas: maxPriorityFeePerGas.toString() }
      );
    }

    return {
      status: 'valid',
      message: 'maxPriorityFeePerGas is valid',
      maxPriorityFeePerGas: maxPriorityFeePerGas.toString()
    };
  }

  /**
   * Performs post-validation security checks
   * @private
   */
  async _postValidationSecurityChecks(transaction, validationResults, options) {
    if (!this.config.enableSecurityChecks) {
      return;
    }

    // Comprehensive security analysis
    const securityScore = this._calculateSecurityScore(transaction, validationResults);
    
    if (securityScore < 0.5) { // 50% threshold
      throw new RPCError(
        'Transaction failed security analysis',
        TRANSACTION_VALIDATION_ERRORS.SUSPICIOUS_TRANSACTION,
        { securityScore, threshold: 0.5 }
      );
    }

    // Check for potential fraud patterns
    const fraudAnalysis = await this._performFraudAnalysis(transaction);
    
    if (fraudAnalysis.riskLevel === 'high') {
      throw new RPCError(
        'Potential fraud detected',
        TRANSACTION_VALIDATION_ERRORS.POTENTIAL_FRAUD,
        { riskFactors: fraudAnalysis.riskFactors }
      );
    }
  }

  /**
   * Calculates security score based on validation results
   * @private
   */
  _calculateSecurityScore(transaction, validationResults) {
    let score = 1.0;
    
    // Penalize for warnings
    Object.values(validationResults).forEach(result => {
      if (result.status === 'warning') {
        score -= 0.1;
      }
    });

    // Penalize high-value transactions to unknown addresses
    const value = BigInt(transaction.value || 0);
    const highValueThreshold = BigInt('10000000000000000000'); // 10 ETH
    
    if (value > highValueThreshold) {
      const toAddress = transaction.to.toLowerCase();
      if (!this.whitelistedAddresses.has(toAddress)) {
        score -= 0.2;
      }
    }

    // Penalize contract interactions with data
    if ((transaction.data && transaction.data.length > 2) || 
        (transaction.input && transaction.input.length > 2)) {
      score -= 0.1;
    }

    return Math.max(0, score);
  }

  /**
   * Checks daily value limits for an address
   * @private
   */
  async _checkDailyValueLimits(fromAddress, transactionValue) {
    if (!fromAddress || this.config.maxDailyValue === null) {
      return; // No daily limits or no address provided
    }

    const address = fromAddress.toLowerCase();
    const now = Date.now();
    const oneDayAgo = now - 86400000; // 24 hours ago

    // Get transaction history for this address
    if (!this.transactionHistory.has(address)) {
      this.transactionHistory.set(address, []);
    }

    const history = this.transactionHistory.get(address);
    
    // Calculate total value in the last 24 hours
    const dailyTotal = history
      .filter(tx => tx.timestamp > oneDayAgo && tx.value)
      .reduce((total, tx) => total + BigInt(tx.value), 0n);

    const maxDailyValue = BigInt(this.config.maxDailyValue);
    const projectedTotal = dailyTotal + transactionValue;

    if (projectedTotal > maxDailyValue) {
      throw new RPCError(
        'Transaction would exceed daily value limit',
        TRANSACTION_VALIDATION_ERRORS.DAILY_LIMIT_EXCEEDED,
        {
          currentDailyTotal: dailyTotal.toString(),
          transactionValue: transactionValue.toString(),
          projectedTotal: projectedTotal.toString(),
          dailyLimit: this.config.maxDailyValue,
          resetTime: Math.ceil((86400000 - (now - history.find(tx => tx.timestamp > oneDayAgo)?.timestamp || now)) / 1000)
        }
      );
    }
  }
  async _performFraudAnalysis(transaction) {
    const riskFactors = [];
    let riskLevel = 'low';

    // Check for unusual gas prices
    if (transaction.gasPrice) {
      const gasPrice = BigInt(transaction.gasPrice);
      const avgGasPrice = BigInt(this.config.minGasPrice) * 10n; // 10x minimum as average
      
      if (gasPrice > avgGasPrice * 5n) {
        riskFactors.push('Unusually high gas price');
        riskLevel = 'medium';
      }
    }

    // Check for round-number values (potential automated attacks)
    if (transaction.value) {
      const value = transaction.value.toString();
      if (/^[1-9]0+$/.test(value)) {
        riskFactors.push('Round number value');
        riskLevel = riskLevel === 'high' ? 'high' : 'medium';
      }
    }

    // Check transaction timing patterns
    const fromAddress = transaction.from?.toLowerCase();
    if (fromAddress && this.transactionHistory.has(fromAddress)) {
      const history = this.transactionHistory.get(fromAddress);
      const recentTxs = history.filter(tx => Date.now() - tx.timestamp < 60000); // Last minute
      
      if (recentTxs.length > 5) {
        riskFactors.push('High frequency transactions');
        riskLevel = 'high';
      }
    }

    return { riskLevel, riskFactors };
  }

  /**
   * Checks rate limits for the sender address
   * @private
   */
  async _checkRateLimits(fromAddress) {
    if (!fromAddress) return;

    const address = fromAddress.toLowerCase();
    const now = Date.now();
    
    if (!this.transactionHistory.has(address)) {
      this.transactionHistory.set(address, []);
    }

    const history = this.transactionHistory.get(address);
    
    // Clean old entries
    const validEntries = history.filter(entry => now - entry.timestamp < 3600000); // 1 hour
    this.transactionHistory.set(address, validEntries);

    // Check per-minute limit
    const lastMinute = validEntries.filter(entry => now - entry.timestamp < 60000);
    if (lastMinute.length >= this.config.maxTransactionsPerMinute) {
      throw new RPCError(
        'Rate limit exceeded: too many transactions per minute',
        TRANSACTION_VALIDATION_ERRORS.RATE_LIMIT_EXCEEDED,
        { 
          limit: this.config.maxTransactionsPerMinute,
          current: lastMinute.length,
          resetTime: Math.ceil((60000 - (now - lastMinute[0].timestamp)) / 1000)
        }
      );
    }

    // Check per-hour limit
    if (validEntries.length >= this.config.maxTransactionsPerHour) {
      throw new RPCError(
        'Rate limit exceeded: too many transactions per hour',
        TRANSACTION_VALIDATION_ERRORS.RATE_LIMIT_EXCEEDED,
        { 
          limit: this.config.maxTransactionsPerHour,
          current: validEntries.length,
          resetTime: Math.ceil((3600000 - (now - validEntries[0].timestamp)) / 1000)
        }
      );
    }

    // Record this validation attempt
    validEntries.push({ 
      timestamp: now, 
      value: transaction.value || '0' // Store value for daily limit tracking
    });
    this.transactionHistory.set(address, validEntries);
  }

  /**
   * Extracts warnings from validation results
   * @private
   */
  _extractWarnings(validationResults) {
    const warnings = [];
    
    Object.entries(validationResults).forEach(([category, result]) => {
      if (result.status === 'warning') {
        warnings.push({
          category,
          message: result.message,
          details: result.details || {}
        });
      }
    });

    return warnings;
  }

  /**
   * Calculates security level based on validation results
   * @private
   */
  _calculateSecurityLevel(validationResults) {
    const warningCount = this._extractWarnings(validationResults).length;
    
    if (warningCount === 0) return 'high';
    if (warningCount <= 2) return 'medium';
    return 'low';
  }

  /**
   * Utility methods
   */

  /**
   * Validates Ethereum address checksum
   * @private
   */
  _isValidChecksum(address) {
    // Simplified checksum validation - in production, use proper EIP-55 validation
    const hasLowerCase = /[a-f]/.test(address);
    const hasUpperCase = /[A-F]/.test(address);
    
    // If all same case, checksum is not being used
    if (!hasLowerCase || !hasUpperCase) {
      return true; // Valid but no checksum
    }
    
    // For production, implement full EIP-55 checksum validation
    return true;
  }

  /**
   * Masks address for logging (shows first 6 and last 4 characters)
   * @private
   */
  _maskAddress(address) {
    if (!address || address.length < 10) return address;
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  }

  /**
   * Gets transaction type name
   * @private
   */
  _getTransactionTypeName(type) {
    switch (type) {
      case TRANSACTION_TYPES.LEGACY: return 'Legacy';
      case TRANSACTION_TYPES.EIP_2930: return 'EIP-2930 (Access List)';
      case TRANSACTION_TYPES.EIP_1559: return 'EIP-1559 (Dynamic Fee)';
      default: return 'Unknown';
    }
  }

  /**
   * Generates unique validation ID
   * @private
   */
  _generateValidationId() {
    return `tx_val_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Sanitizes configuration for logging
   * @private
   */
  _sanitizeConfig(config) {
    const sanitized = { ...config };
    
    // Remove sensitive information
    delete sanitized.blacklistedAddresses;
    delete sanitized.whitelistedAddresses;
    
    return sanitized;
  }

  /**
   * Starts cleanup interval for transaction history
   * @private
   */
  _startCleanupInterval() {
    this.cleanupInterval = setInterval(() => {
      try {
        this._cleanupTransactionHistory();
      } catch (error) {
        this.logger.warn('Failed to cleanup transaction history', { error: error.message });
      }
    }, 300000); // Every 5 minutes
  }

  /**
   * Cleans up old transaction history entries
   * @private
   */
  _cleanupTransactionHistory() {
    const now = Date.now();
    const maxAge = 3600000; // 1 hour

    for (const [address, history] of this.transactionHistory.entries()) {
      const validEntries = history.filter(entry => now - entry.timestamp < maxAge);
      
      if (validEntries.length === 0) {
        this.transactionHistory.delete(address);
      } else {
        this.transactionHistory.set(address, validEntries);
      }
    }

    this.logger.debug('Transaction history cleanup completed', {
      activeAddresses: this.transactionHistory.size
    });
  }

  /**
   * Public utility methods
   */

  /**
   * Validates a single field
   * @param {string} fieldName - Name of the field to validate
   * @param {*} value - Value to validate
   * @param {Object} [options] - Validation options
   * @returns {Promise<Object>} Validation result
   */
  async validateField(fieldName, value, options = {}) {
    const startTime = Date.now();
    
    try {
      let result;
      
      switch (fieldName) {
        case 'to':
        case 'from':
          result = await this._validateSingleAddress(value, fieldName);
          break;
        case 'value':
          result = await this._validateValue({ value });
          break;
        case 'gasLimit':
          result = await this._validateGasLimit(value);
          break;
        case 'gasPrice':
          result = await this._validateGasPrice(value);
          break;
        case 'nonce':
          result = await this._validateNonce({ nonce: value });
          break;
        case 'data':
        case 'input':
          result = await this._validateData({ data: value });
          break;
        default:
          throw new Error(`Unknown field: ${fieldName}`);
      }

      this.metrics.increment('field_validations_successful');
      this.metrics.recordTiming('field_validation_duration', Date.now() - startTime);

      return {
        valid: true,
        field: fieldName,
        result,
        validationTime: Date.now() - startTime
      };

    } catch (error) {
      this.metrics.increment('field_validations_failed');
      
      throw new RPCError(
        `Field validation failed for ${fieldName}: ${error.message}`,
        error.code || TRANSACTION_VALIDATION_ERRORS.INVALID_FIELD_VALUE,
        { 
          field: fieldName,
          originalError: error,
          validationTime: Date.now() - startTime
        }
      );
    }
  }

  /**
   * Gets validator statistics
   * @returns {Object} Validator statistics
   */
  getStats() {
    return {
      validator: 'TransactionValidator',
      version: '1.0.0',
      chainId: this.chainId,
      network: this.networkConfig.name,
      config: this._sanitizeConfig(this.config),
      activeAddresses: this.transactionHistory.size,
      blacklistedAddresses: this.blacklistedAddresses.size,
      whitelistedAddresses: this.whitelistedAddresses.size,
      metrics: this.metrics.getStats(),
      uptime: Date.now() - this.startTime,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Updates validator configuration
   * @param {Object} newConfig - New configuration to merge
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    
    this.logger.info('Validator configuration updated', {
      updatedFields: Object.keys(newConfig)
    });
  }

  /**
   * Adds addresses to blacklist
   * @param {Array<string>} addresses - Addresses to blacklist
   */
  addToBlacklist(addresses) {
    addresses.forEach(address => {
      this.blacklistedAddresses.add(address.toLowerCase());
    });
    
    this.logger.info('Addresses added to blacklist', {
      count: addresses.length,
      totalBlacklisted: this.blacklistedAddresses.size
    });
  }

  /**
   * Removes addresses from blacklist
   * @param {Array<string>} addresses - Addresses to remove from blacklist
   */
  removeFromBlacklist(addresses) {
    addresses.forEach(address => {
      this.blacklistedAddresses.delete(address.toLowerCase());
    });
    
    this.logger.info('Addresses removed from blacklist', {
      count: addresses.length,
      totalBlacklisted: this.blacklistedAddresses.size
    });
  }

  /**
   * Adds addresses to whitelist
   * @param {Array<string>} addresses - Addresses to whitelist
   */
  addToWhitelist(addresses) {
    addresses.forEach(address => {
      this.whitelistedAddresses.add(address.toLowerCase());
    });
    
    this.logger.info('Addresses added to whitelist', {
      count: addresses.length,
      totalWhitelisted: this.whitelistedAddresses.size
    });
  }

  /**
   * Removes addresses from whitelist
   * @param {Array<string>} addresses - Addresses to remove from whitelist
   */
  removeFromWhitelist(addresses) {
    addresses.forEach(address => {
      this.whitelistedAddresses.delete(address.toLowerCase());
    });
    
    this.logger.info('Addresses removed from whitelist', {
      count: addresses.length,
      totalWhitelisted: this.whitelistedAddresses.size
    });
  }

  /**
   * Graceful shutdown
   * @returns {Promise<void>}
   */
  async shutdown() {
    this.logger.info('TransactionValidator shutdown initiated');

    // Clear cleanup interval
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    // Shutdown metrics collector
    if (this.metrics) {
      await this.metrics.shutdown();
    }

    // Clear transaction history
    this.transactionHistory.clear();

    this.logger.info('TransactionValidator shutdown completed');
  }
}

/**
 * Factory function to create TransactionValidator
 * @param {Object} config - Validator configuration
 * @returns {TransactionValidator} Configured validator instance
 */
export function createTransactionValidator(config) {
  return new TransactionValidator(config);
}

/**
 * Utility function to validate transaction quickly
 * @param {Object} transaction - Transaction to validate
 * @param {number} chainId - Network chain ID
 * @param {Object} [options] - Validation options
 * @returns {Promise<Object>} Validation result
 */
export async function validateTransaction(transaction, chainId, options = {}) {
  const validator = new TransactionValidator({ chainId, ...options });
  
  try {
    return await validator.validateTransaction(transaction, options);
  } finally {
    await validator.shutdown();
  }
}

/**
 * Export default
 */
export default TransactionValidator;

/**
 * Example usage:
 * 
 * // Basic usage
 * const validator = new TransactionValidator({ chainId: 1 });
 * const result = await validator.validateTransaction(transaction);
 * 
 * // Advanced configuration with unlimited single transactions
 * const enterpriseValidator = new TransactionValidator({
 *   chainId: 1,
 *   security: { enableThreatDetection: true },
 *   limits: { 
 *     maxSingleTransaction: null, // Explicitly allow unlimited single transactions
 *     maxDailyValue: '1000000000000000000000' // But keep daily limits (1000 ETH)
 *   },
 *   blacklistedAddresses: ['0x...'],
 *   whitelistedAddresses: ['0x...']
 * });
 * 
 * // Completely unlimited configuration
 * const unlimitedValidator = new TransactionValidator({
 *   chainId: 1,
 *   limits: {
 *     maxSingleTransaction: null, // No single transaction limit
 *     maxDailyValue: null, // No daily limit
 *     enableValueLimits: false // Disable all value limits
 *   }
 * });
 * 
 * // Validate individual fields
 * const fieldResult = await validator.validateField('gasPrice', '20000000000');
 * 
 * // Get validator statistics
 * const stats = validator.getStats();
 * 
 * // Update configuration to allow unlimited transactions
 * validator.updateConfig({ 
 *   maxSingleTransaction: null,
 *   maxDailyValue: null 
 * });
 * 
 * // Graceful shutdown
 * await validator.shutdown();
 */
