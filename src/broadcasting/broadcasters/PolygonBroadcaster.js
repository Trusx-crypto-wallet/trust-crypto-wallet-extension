/**
 * PolygonBroadcaster.js
 * 
 * Polygon-specific transaction broadcaster implementation that handles
 * Polygon (MATIC) network transaction broadcasting with optimized gas
 * calculations, network-specific confirmations, and Polygon error handling.
 * 
 * @author Trust Crypto Wallet Extension
 * @version 1.0.0
 */

import { ethers } from 'ethers';
import BaseBroadcaster from './BaseBroadcaster.js';

/**
 * Polygon-specific error codes and messages
 */
const POLYGON_ERROR_CODES = {
  INSUFFICIENT_MATIC: 'INSUFFICIENT_MATIC',
  GAS_PRICE_TOO_LOW: 'GAS_PRICE_TOO_LOW', 
  NONCE_TOO_LOW: 'NONCE_TOO_LOW',
  NONCE_TOO_HIGH: 'NONCE_TOO_HIGH',
  REPLACEMENT_UNDERPRICED: 'REPLACEMENT_UNDERPRICED',
  INVALID_TRANSACTION: 'INVALID_TRANSACTION',
  NETWORK_CONGESTION: 'NETWORK_CONGESTION',
  RPC_ERROR: 'RPC_ERROR',
  TIMEOUT: 'TIMEOUT',
  MEMPOOL_FULL: 'MEMPOOL_FULL'
};

/**
 * Default Polygon network configuration
 */
const DEFAULT_POLYGON_CONFIG = {
  network: 'polygon',
  timeout: 180000, // 3 minutes (faster than Ethereum)
  confirmations: 3, // Polygon requires more confirmations due to faster blocks
  gasMultiplier: 1.2, // Higher multiplier for network variability
  blockTime: 2000, // ~2 seconds average block time
  
  // Polygon-specific gas configuration
  minGasPrice: ethers.parseUnits('30', 'gwei'), // 30 Gwei minimum
  maxGasPrice: ethers.parseUnits('1000', 'gwei'), // 1000 Gwei maximum
  defaultGasPrice: ethers.parseUnits('50', 'gwei'), // 50 Gwei default
  maxGasLimit: 20000000, // 20M gas limit
  
  // EIP-1559 configuration for Polygon
  maxFeePerGas: ethers.parseUnits('200', 'gwei'),
  maxPriorityFeePerGas: ethers.parseUnits('30', 'gwei'),
  baseFeeMultiplier: 1.5, // More aggressive for faster inclusion
  
  // Polygon-specific features
  enableEIP1559: true,
  supportsFastFinality: true,
  averageBlockTime: 2000
};

/**
 * PolygonBroadcaster - Polygon network-specific transaction broadcaster
 * 
 * Handles Polygon (MATIC) network transaction broadcasting with optimized
 * gas calculations, faster confirmation requirements, and Polygon-specific
 * error handling for improved user experience on the Polygon network.
 * 
 * @class PolygonBroadcaster
 * @extends BaseBroadcaster
 * @example
 * const provider = new ethers.JsonRpcProvider('https://polygon-mainnet.infura.io/v3/YOUR-PROJECT-ID');
 * const broadcaster = new PolygonBroadcaster(provider, {
 *   confirmations: 5,
 *   gasMultiplier: 1.3
 * });
 * 
 * broadcaster.on('transaction-sent', ({ txHash, gasPrice }) => {
 *   console.log(`Polygon transaction sent: ${txHash} (Gas: ${gasPrice} GWEI)`);
 * });
 * 
 * const txHash = await broadcaster.broadcast({
 *   to: '0x742dFfdf2c6c8D4B93067782b1e7A38754b8c7b3',
 *   value: ethers.parseEther('1.5'), // 1.5 MATIC
 *   data: '0x'
 * });
 */
export default class PolygonBroadcaster extends BaseBroadcaster {
  /**
   * Creates a new PolygonBroadcaster instance
   * 
   * Initializes the broadcaster with Polygon-specific configuration including
   * faster block times, higher confirmation requirements, and optimized gas settings.
   * 
   * @constructor
   * @param {ethers.Provider} provider - Ethers.js provider for Polygon network
   * @param {Object} [options={}] - Polygon-specific configuration options
   * @param {string} [options.network='polygon'] - Network name (polygon, mumbai, etc.)
   * @param {number} [options.timeout=180000] - Transaction timeout in milliseconds (3 minutes)
   * @param {number} [options.confirmations=3] - Number of block confirmations (higher due to faster blocks)
   * @param {number} [options.gasMultiplier=1.2] - Gas estimation safety multiplier
   * @param {BigNumber} [options.minGasPrice] - Minimum gas price in wei (30 Gwei default)
   * @param {BigNumber} [options.maxGasPrice] - Maximum gas price in wei (1000 Gwei default)
   * @param {BigNumber} [options.defaultGasPrice] - Default gas price when estimation fails
   * @param {number} [options.maxGasLimit=20000000] - Maximum gas limit for transactions
   * @param {boolean} [options.enableEIP1559=true] - Enable EIP-1559 fee structure
   * @param {number} [options.baseFeeMultiplier=1.5] - Base fee multiplier for EIP-1559
   * 
   * @throws {TypeError} If provider is not a valid ethers provider
   * @throws {Error} If network configuration is invalid for Polygon
   * 
   * @example
   * const broadcaster = new PolygonBroadcaster(provider, {
   *   network: 'polygon',
   *   confirmations: 5,
   *   gasMultiplier: 1.3,
   *   minGasPrice: ethers.parseUnits('25', 'gwei'),
   *   maxGasPrice: ethers.parseUnits('500', 'gwei')
   * });
   */
  constructor(provider, options = {}) {
    // Validate provider for Polygon compatibility
    if (!provider || typeof provider.sendTransaction !== 'function') {
      throw new TypeError('Provider must be a valid ethers provider compatible with Polygon network');
    }
    
    // Merge with Polygon defaults
    const config = {
      ...DEFAULT_POLYGON_CONFIG,
      ...options
    };
    
    super(provider, config);
    
    // Polygon-specific properties
    this.enableEIP1559 = config.enableEIP1559;
    this.baseFeeMultiplier = config.baseFeeMultiplier;
    this.gasCache = new Map(); // Cache gas estimates for performance
    this.networkInfo = null;
    this.feeHistory = []; // Track recent fee data
    
    // Polygon network validation
    this._validatePolygonConfig();
    
    console.log(`PolygonBroadcaster initialized for ${this.config.network} network`);
  }
  
  /**
   * Initializes Polygon-specific broadcaster features
   * 
   * @public
   * @method initialize
   * @returns {Promise<void>} Resolves when initialization is complete
   */
  async initialize() {
    await super.initialize();
    
    try {
      // Detect and validate Polygon network
      await this._detectPolygonNetwork();
      
      // Initialize gas price tracking
      await this._initializeGasPriceTracking();
      
      console.log(`PolygonBroadcaster initialized successfully for ${this.networkInfo?.name || 'unknown'} network`);
      
    } catch (error) {
      console.error('Failed to initialize PolygonBroadcaster:', error);
      throw new Error(`Polygon broadcaster initialization failed: ${error.message}`);
    }
  }
  
  /**
   * Validates Polygon-specific configuration
   * @private
   */
  _validatePolygonConfig() {
    if (this.config.confirmations < 1 || this.config.confirmations > 20) {
      throw new Error('Polygon confirmations must be between 1 and 20');
    }
    
    if (this.config.gasMultiplier < 1.0 || this.config.gasMultiplier > 3.0) {
      throw new Error('Polygon gas multiplier must be between 1.0 and 3.0');
    }
  }
  
  /**
   * Detects and validates Polygon network connection
   * @private
   */
  async _detectPolygonNetwork() {
    try {
      const network = await this.provider.getNetwork();
      const chainId = Number(network.chainId);
      
      // Validate Polygon chain IDs
      const validChainIds = {
        137: 'polygon-mainnet',
        80001: 'polygon-mumbai', 
        80002: 'polygon-amoy'
      };
      
      if (!validChainIds[chainId]) {
        console.warn(`Warning: Unrecognized Polygon chain ID: ${chainId}`);
      }
      
      this.networkInfo = {
        name: validChainIds[chainId] || `polygon-${chainId}`,
        chainId,
        isPolygon: true,
        isTestnet: chainId !== 137
      };
      
      console.log(`Connected to Polygon network: ${this.networkInfo.name} (Chain ID: ${chainId})`);
      
    } catch (error) {
      console.warn('Could not detect Polygon network:', error.message);
    }
  }
  
  /**
   * Initializes gas price tracking for optimal fee calculation
   * @private
   */
  async _initializeGasPriceTracking() {
    try {
      // Get initial fee data
      const feeData = await this.provider.getFeeData();
      this.feeHistory.push({
        timestamp: Date.now(),
        gasPrice: feeData.gasPrice,
        maxFeePerGas: feeData.maxFeePerGas,
        maxPriorityFeePerGas: feeData.maxPriorityFeePerGas
      });
      
      console.log('Polygon gas price tracking initialized');
      
    } catch (error) {
      console.warn('Could not initialize gas price tracking:', error.message);
    }
  }
  
  /**
   * Sends raw transaction to Polygon network with 3 block confirmations
   * 
   * @protected
   * @method _sendRawTransaction
   * @param {Object} txData - Formatted Polygon transaction data
   * @returns {Promise<string>} Transaction hash after confirmations
   */
  async _sendRawTransaction(txData) {
    try {
      console.log('Sending Polygon transaction:', {
        to: txData.to,
        value: txData.value?.toString(),
        gasLimit: txData.gasLimit?.toString(),
        gasPrice: txData.gasPrice?.toString(),
        maxFeePerGas: txData.maxFeePerGas?.toString(),
        nonce: txData.nonce,
        type: txData.type
      });
      
      // Send transaction
      const txResponse = await this.provider.sendTransaction(txData);
      const txHash = txResponse.hash;
      
      console.log(`Polygon transaction sent: ${txHash}`);
      
      /**
       * Transaction sent event
       * @event PolygonBroadcaster#transaction-sent
       * @type {Object}
       * @property {string} txHash - Transaction hash
       * @property {Object} txData - Transaction data
       * @property {string} network - Polygon network name
       * @property {number} gasLimit - Gas limit used
       * @property {string} gasPrice - Gas price used (GWEI)
       */
      this.emit('transaction-sent', {
        txHash,
        txData,
        network: this.config.network,
        gasLimit: txData.gasLimit?.toString(),
        gasPrice: this._formatGasPrice(txData.gasPrice || txData.maxFeePerGas)
      });
      
      // Wait for Polygon confirmations (3 blocks)
      if (this.config.confirmations > 0) {
        console.log(`Waiting for ${this.config.confirmations} Polygon confirmations...`);
        
        const receipt = await txResponse.wait(this.config.confirmations);
        
        if (receipt.status === 0) {
          throw new Error('Polygon transaction was reverted');
        }
        
        this.stats.successfulTransactions++;
        this.stats.totalGasUsed += receipt.gasUsed;
        
        /**
         * Transaction confirmed event
         * @event PolygonBroadcaster#transaction-confirmed
         * @type {Object}
         * @property {string} txHash - Transaction hash
         * @property {Object} receipt - Transaction receipt
         * @property {number} confirmations - Number of confirmations received
         * @property {string} gasUsed - Actual gas used
         * @property {number} blockNumber - Block number of confirmation
         */
        this.emit('transaction-confirmed', {
          txHash,
          receipt,
          confirmations: this.config.confirmations,
          gasUsed: receipt.gasUsed.toString(),
          blockNumber: receipt.blockNumber
        });
        
        console.log(`Polygon transaction confirmed: ${txHash} (Gas used: ${receipt.gasUsed}, Block: ${receipt.blockNumber})`);
      }
      
      return txHash;
      
    } catch (error) {
      throw this._enhancePolygonError(error);
    }
  }
  
  /**
   * Estimates gas for Polygon transactions with network-specific optimizations
   * 
   * @public
   * @method estimateGas
   * @param {Object} txData - Transaction data for estimation
   * @returns {Promise<Object>} Comprehensive gas estimation for Polygon
   * 
   * @example
   * const gasEstimate = await broadcaster.estimateGas({
   *   to: '0x742dFfdf2c6c8D4B93067782b1e7A38754b8c7b3',
   *   value: ethers.parseEther('1.5'),
   *   from: '0x8ba1f109551bD432803012645Hac136c'
   * });
   * 
   * console.log(`Gas limit: ${gasEstimate.gasLimit}`);
   * console.log(`Gas price: ${gasEstimate.gasPrice} GWEI`);
   */
  async estimateGas(txData) {
    try {
      // Create cache key for similar transactions
      const cacheKey = this._createPolygonGasCacheKey(txData);
      
      // Check cache first (30 second TTL for Polygon due to faster blocks)
      if (this.gasCache.has(cacheKey)) {
        const cached = this.gasCache.get(cacheKey);
        if (Date.now() - cached.timestamp < 30000) {
          console.log('Using cached Polygon gas estimate');
          return cached.estimate;
        }
      }
      
      // Estimate gas limit using parent method
      const gasLimit = await super.estimateGas(txData);
      
      // Apply Polygon-specific safety multiplier
      const safeGasLimit = Math.floor(Number(gasLimit) * this.config.gasMultiplier);
      
      // Get Polygon-optimized fee data
      const feeData = await this._getPolygonFeeData();
      
      let gasEstimate;
      
      if (this.enableEIP1559 && feeData.maxFeePerGas) {
        // EIP-1559 estimation for Polygon
        gasEstimate = {
          gasLimit: safeGasLimit,
          maxFeePerGas: feeData.maxFeePerGas.toString(),
          maxPriorityFeePerGas: feeData.maxPriorityFeePerGas.toString(),
          type: 2,
          network: 'polygon'
        };
      } else {
        // Legacy gas price for Polygon
        gasEstimate = {
          gasLimit: safeGasLimit,
          gasPrice: feeData.gasPrice.toString(),
          type: 0,
          network: 'polygon'
        };
      }
      
      // Validate against Polygon limits
      this._validatePolygonGasEstimate(gasEstimate);
      
      // Cache the estimate
      this.gasCache.set(cacheKey, {
        estimate: gasEstimate,
        timestamp: Date.now()
      });
      
      console.log('Polygon gas estimation completed:', gasEstimate);
      return gasEstimate;
      
    } catch (error) {
      throw this._enhancePolygonError(error, 'Polygon gas estimation failed');
    }
  }
  
  /**
   * Gets optimized fee data for Polygon network
   * @private
   */
  async _getPolygonFeeData() {
    try {
      const feeData = await this.provider.getFeeData();
      
      // Update fee history
      this.feeHistory.push({
        timestamp: Date.now(),
        gasPrice: feeData.gasPrice,
        maxFeePerGas: feeData.maxFeePerGas,
        maxPriorityFeePerGas: feeData.maxPriorityFeePerGas
      });
      
      // Keep only recent history (last 10 entries)
      if (this.feeHistory.length > 10) {
        this.feeHistory = this.feeHistory.slice(-10);
      }
      
      // Apply Polygon-specific optimizations
      if (this.enableEIP1559 && feeData.maxFeePerGas) {
        // Calculate optimized fees for Polygon
        const baseFee = feeData.maxFeePerGas - (feeData.maxPriorityFeePerGas || 0n);
        const optimizedMaxFee = baseFee * BigInt(Math.floor(this.baseFeeMultiplier * 100)) / 100n + 
                               (feeData.maxPriorityFeePerGas || this.config.maxPriorityFeePerGas);
        
        return {
          gasPrice: feeData.gasPrice,
          maxFeePerGas: optimizedMaxFee,
          maxPriorityFeePerGas: feeData.maxPriorityFeePerGas || this.config.maxPriorityFeePerGas
        };
      } else {
        // Fallback to legacy with Polygon minimum
        const gasPrice = feeData.gasPrice || this.config.defaultGasPrice;
        const minGasPrice = this.config.minGasPrice;
        
        return {
          gasPrice: gasPrice > minGasPrice ? gasPrice : minGasPrice,
          maxFeePerGas: null,
          maxPriorityFeePerGas: null
        };
      }
      
    } catch (error) {
      console.warn('Failed to get Polygon fee data, using defaults:', error.message);
      
      // Return safe defaults for Polygon
      return {
        gasPrice: this.config.defaultGasPrice,
        maxFeePerGas: this.config.maxFeePerGas,
        maxPriorityFeePerGas: this.config.maxPriorityFeePerGas
      };
    }
  }
  
  /**
   * Validates gas estimate against Polygon network limits
   * @private
   */
  _validatePolygonGasEstimate(gasEstimate) {
    if (gasEstimate.gasLimit > this.config.maxGasLimit) {
      throw new Error(`Polygon gas limit ${gasEstimate.gasLimit} exceeds maximum ${this.config.maxGasLimit}`);
    }
    
    if (gasEstimate.gasPrice && BigInt(gasEstimate.gasPrice) > this.config.maxGasPrice) {
      throw new Error(`Polygon gas price ${gasEstimate.gasPrice} exceeds maximum ${this.config.maxGasPrice}`);
    }
    
    if (gasEstimate.gasPrice && BigInt(gasEstimate.gasPrice) < this.config.minGasPrice) {
      throw new Error(`Polygon gas price ${gasEstimate.gasPrice} below minimum ${this.config.minGasPrice}`);
    }
    
    if (gasEstimate.maxFeePerGas && BigInt(gasEstimate.maxFeePerGas) > this.config.maxFeePerGas) {
      throw new Error(`Polygon max fee per gas ${gasEstimate.maxFeePerGas} exceeds maximum ${this.config.maxFeePerGas}`);
    }
  }
  
  /**
   * Creates cache key for Polygon gas estimation
   * @private
   */
  _createPolygonGasCacheKey(txData) {
    const key = `polygon-${txData.to}-${txData.value || '0'}-${txData.data || '0x'}-${txData.from || 'unknown'}`;
    return key.toLowerCase();
  }
  
  /**
   * Enhances errors with Polygon-specific context
   * @private
   */
  _enhancePolygonError(error, context = '') {
    const message = error.message || error.toString();
    const lowerMessage = message.toLowerCase();
    
    let errorCode = POLYGON_ERROR_CODES.RPC_ERROR;
    let enhancedMessage = message;
    
    // Categorize Polygon-specific errors
    if (lowerMessage.includes('insufficient funds')) {
      errorCode = POLYGON_ERROR_CODES.INSUFFICIENT_MATIC;
      enhancedMessage = 'Insufficient MATIC balance for transaction (including gas costs)';
    } else if (lowerMessage.includes('nonce too low')) {
      errorCode = POLYGON_ERROR_CODES.NONCE_TOO_LOW;
      enhancedMessage = 'Transaction nonce too low for Polygon network (transaction may have been replaced)';
    } else if (lowerMessage.includes('nonce too high')) {
      errorCode = POLYGON_ERROR_CODES.NONCE_TOO_HIGH;
      enhancedMessage = 'Transaction nonce too high for Polygon network (missing previous transactions)';
    } else if (lowerMessage.includes('gas price too low') || lowerMessage.includes('transaction underpriced')) {
      errorCode = POLYGON_ERROR_CODES.GAS_PRICE_TOO_LOW;
      enhancedMessage = `Gas price too low for Polygon network (minimum: ${this._formatGasPrice(this.config.minGasPrice)} GWEI)`;
    } else if (lowerMessage.includes('replacement transaction underpriced')) {
      errorCode = POLYGON_ERROR_CODES.REPLACEMENT_UNDERPRICED;
      enhancedMessage = 'Replacement transaction must have higher gas price on Polygon';
    } else if (lowerMessage.includes('timeout') || lowerMessage.includes('timed out')) {
      errorCode = POLYGON_ERROR_CODES.TIMEOUT;
      enhancedMessage = 'Polygon transaction timed out waiting for confirmation';
    } else if (lowerMessage.includes('reverted') || lowerMessage.includes('invalid')) {
      errorCode = POLYGON_ERROR_CODES.INVALID_TRANSACTION;
      enhancedMessage = 'Polygon transaction execution reverted or invalid';
    } else if (lowerMessage.includes('network') || lowerMessage.includes('connection')) {
      errorCode = POLYGON_ERROR_CODES.NETWORK_CONGESTION;
      enhancedMessage = 'Polygon network congestion or connectivity issues';
    } else if (lowerMessage.includes('mempool') || lowerMessage.includes('pool')) {
      errorCode = POLYGON_ERROR_CODES.MEMPOOL_FULL;
      enhancedMessage = 'Polygon mempool is full, try increasing gas price';
    }
    
    const enhancedError = new Error(`${context ? context + ': ' : ''}${enhancedMessage}`);
    enhancedError.code = errorCode;
    enhancedError.originalError = error;
    enhancedError.network = 'polygon';
    enhancedError.chainId = this.networkInfo?.chainId;
    
    return enhancedError;
  }
  
  /**
   * Formats gas price for display
   * @private
   */
  _formatGasPrice(gasPrice) {
    if (!gasPrice) return '0';
    return ethers.formatUnits(gasPrice, 'gwei');
  }
  
  /**
   * Validates Polygon-specific transaction data
   * @protected
   */
  validateTransactionData(txData) {
    // Call parent validation
    super.validateTransactionData(txData);
    
    // Polygon-specific validations
    if (txData.gasLimit && (txData.gasLimit < 21000 || txData.gasLimit > this.config.maxGasLimit)) {
      throw new Error(`Polygon gas limit must be between 21000 and ${this.config.maxGasLimit}`);
    }
    
    if (txData.gasPrice) {
      const gasPrice = BigInt(txData.gasPrice);
      if (gasPrice > this.config.maxGasPrice) {
        throw new Error(`Polygon gas price exceeds maximum: ${this._formatGasPrice(this.config.maxGasPrice)} GWEI`);
      }
      if (gasPrice < this.config.minGasPrice) {
        throw new Error(`Polygon gas price below minimum: ${this._formatGasPrice(this.config.minGasPrice)} GWEI`);
      }
    }
    
    // EIP-1559 validations for Polygon
    if (txData.maxFeePerGas && txData.maxPriorityFeePerGas) {
      if (BigInt(txData.maxPriorityFeePerGas) > BigInt(txData.maxFeePerGas)) {
        throw new Error('Polygon maxPriorityFeePerGas cannot exceed maxFeePerGas');
      }
    }
  }
  
  /**
   * Gets Polygon network-specific information
   * @public
   */
  getNetworkInfo() {
    return {
      ...this.networkInfo,
      enableEIP1559: this.enableEIP1559,
      baseFeeMultiplier: this.baseFeeMultiplier,
      minGasPrice: this._formatGasPrice(this.config.minGasPrice),
      maxGasPrice: this._formatGasPrice(this.config.maxGasPrice),
      averageBlockTime: this.config.averageBlockTime,
      gasCache: {
        size: this.gasCache.size,
        enabled: true
      },
      feeHistory: this.feeHistory.length
    };
  }
  
  /**
   * Clears Polygon gas estimation cache
   * @public
   */
  clearGasCache() {
    const size = this.gasCache.size;
    this.gasCache.clear();
    console.log(`Cleared ${size} Polygon gas cache entries`);
    return size;
  }
  
  /**
   * Gets enhanced statistics with Polygon-specific metrics
   * @public
   */
  getStats() {
    const baseStats = super.getStats();
    const avgGasPrice = this.feeHistory.length > 0
      ? this.feeHistory.reduce((sum, entry) => sum + Number(entry.gasPrice || 0), 0) / this.feeHistory.length
      : 0;
    
    return {
      ...baseStats,
      network: 'polygon',
      chainId: this.networkInfo?.chainId,
      gasCacheSize: this.gasCache.size,
      enableEIP1559: this.enableEIP1559,
      averageGasPrice: this._formatGasPrice(Math.floor(avgGasPrice)),
      recentFeeHistory: this.feeHistory.slice(-3), // Last 3 entries
      networkInfo: this.networkInfo
    };
  }
}
