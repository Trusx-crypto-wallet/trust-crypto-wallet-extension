/**
 * ArbitrumBroadcaster.js
 * 
 * Arbitrum Layer 2 specific transaction broadcaster implementation with
 * optimized gas calculations, fast finality, and Arbitrum-specific
 * transaction handling for efficient L2 operations.
 * 
 * @author Trust Crypto Wallet Extension
 * @version 1.0.0
 */

import { ethers } from 'ethers';
import BaseBroadcaster from './BaseBroadcaster.js';

/**
 * Arbitrum-specific error codes and messages
 */
const ARBITRUM_ERROR_CODES = {
  INSUFFICIENT_ETH: 'INSUFFICIENT_ETH',
  L2_GAS_PRICE_TOO_LOW: 'L2_GAS_PRICE_TOO_LOW',
  L1_GAS_PRICE_TOO_HIGH: 'L1_GAS_PRICE_TOO_HIGH',
  NONCE_TOO_LOW: 'NONCE_TOO_LOW',
  SEQUENCER_ERROR: 'SEQUENCER_ERROR',
  RETRYABLE_TICKET_FAILED: 'RETRYABLE_TICKET_FAILED',
  L2_TO_L1_MESSAGE_FAILED: 'L2_TO_L1_MESSAGE_FAILED',
  INVALID_L2_TRANSACTION: 'INVALID_L2_TRANSACTION',
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT: 'TIMEOUT',
  ROLLUP_ERROR: 'ROLLUP_ERROR'
};

/**
 * Default Arbitrum network configuration
 */
const DEFAULT_ARBITRUM_CONFIG = {
  network: 'arbitrum',
  timeout: 60000, // 1 minute (L2 is fast)
  confirmations: 1, // Fast finality on L2
  gasMultiplier: 1.1, // Lower multiplier due to predictable L2 gas
  blockTime: 1000, // ~1 second average block time
  
  // Arbitrum-specific gas configuration
  minL2GasPrice: ethers.parseUnits('0.1', 'gwei'), // 0.1 Gwei minimum
  maxL2GasPrice: ethers.parseUnits('100', 'gwei'), // 100 Gwei maximum
  defaultL2GasPrice: ethers.parseUnits('1', 'gwei'), // 1 Gwei default
  maxGasLimit: 32000000, // 32M gas limit for L2
  
  // L1 gas pricing for data posting
  l1GasMultiplier: 1.2,
  maxL1GasPrice: ethers.parseUnits('200', 'gwei'),
  
  // Arbitrum-specific features
  enableArbOS: true,
  supportsFastConfirmations: true,
  l2ChainId: 42161, // Arbitrum One
  parentChainId: 1 // Ethereum mainnet
};

/**
 * ArbitrumBroadcaster - Arbitrum Layer 2 specific transaction broadcaster
 * 
 * Handles Arbitrum L2 transaction broadcasting with optimized gas calculations
 * for both L2 execution and L1 data posting costs, fast finality confirmation,
 * and Arbitrum-specific transaction types and error handling.
 * 
 * @class ArbitrumBroadcaster
 * @extends BaseBroadcaster
 * @example
 * const provider = new ethers.JsonRpcProvider('https://arb1.arbitrum.io/rpc');
 * const broadcaster = new ArbitrumBroadcaster(provider, {
 *   network: 'arbitrum-one',
 *   confirmations: 1,
 *   enableArbOS: true
 * });
 * 
 * broadcaster.on('transaction-sent', ({ txHash, l2GasUsed, l1GasCost }) => {
 *   console.log(`Arbitrum tx: ${txHash} (L2 Gas: ${l2GasUsed}, L1 Cost: ${l1GasCost})`);
 * });
 * 
 * const txHash = await broadcaster.broadcast({
 *   to: '0x742dFfdf2c6c8D4B93067782b1e7A38754b8c7b3',
 *   value: ethers.parseEther('0.01'), // 0.01 ETH
 *   data: '0x'
 * });
 */
export default class ArbitrumBroadcaster extends BaseBroadcaster {
  /**
   * Creates a new ArbitrumBroadcaster instance
   * 
   * Initializes the broadcaster with Arbitrum-specific configuration including
   * fast finality, L2 gas optimizations, and ArbOS-specific features.
   * 
   * @constructor
   * @param {ethers.Provider} provider - Ethers.js provider for Arbitrum network
   * @param {Object} [options={}] - Arbitrum-specific configuration options
   * @param {string} [options.network='arbitrum'] - Network name (arbitrum-one, arbitrum-goerli, etc.)
   * @param {number} [options.timeout=60000] - Transaction timeout in milliseconds (1 minute)
   * @param {number} [options.confirmations=1] - Number of confirmations (fast L2 finality)
   * @param {number} [options.gasMultiplier=1.1] - Gas estimation safety multiplier
   * @param {BigNumber} [options.minL2GasPrice] - Minimum L2 gas price in wei
   * @param {BigNumber} [options.maxL2GasPrice] - Maximum L2 gas price in wei
   * @param {BigNumber} [options.maxL1GasPrice] - Maximum L1 gas price for data posting
   * @param {number} [options.maxGasLimit=32000000] - Maximum gas limit for L2 transactions
   * @param {boolean} [options.enableArbOS=true] - Enable ArbOS-specific features
   * @param {number} [options.l2ChainId=42161] - L2 chain ID (42161 for Arbitrum One)
   * @param {number} [options.parentChainId=1] - Parent chain ID (1 for Ethereum)
   * 
   * @throws {TypeError} If provider is not compatible with Arbitrum
   * @throws {Error} If network configuration is invalid for Arbitrum
   * 
   * @example
   * const broadcaster = new ArbitrumBroadcaster(provider, {
   *   network: 'arbitrum-one',
   *   confirmations: 1,
   *   maxL2GasPrice: ethers.parseUnits('50', 'gwei'),
   *   enableArbOS: true
   * });
   */
  constructor(provider, options = {}) {
    // Validate provider for Arbitrum compatibility
    if (!provider || typeof provider.sendTransaction !== 'function') {
      throw new TypeError('Provider must be a valid ethers provider compatible with Arbitrum network');
    }
    
    // Merge with Arbitrum defaults
    const config = {
      ...DEFAULT_ARBITRUM_CONFIG,
      ...options
    };
    
    super(provider, config);
    
    // Arbitrum-specific properties
    this.enableArbOS = config.enableArbOS;
    this.l2ChainId = config.l2ChainId;
    this.parentChainId = config.parentChainId;
    this.gasCache = new Map();
    this.networkInfo = null;
    this.sequencerInfo = null;
    
    // L1/L2 gas tracking
    this.l1GasHistory = [];
    this.l2GasHistory = [];
    
    console.log(`ArbitrumBroadcaster initialized for ${this.config.network} network`);
  }
  
  /**
   * Initializes Arbitrum-specific broadcaster features
   * 
   * @public
   * @method initialize
   * @returns {Promise<void>} Resolves when initialization is complete
   */
  async initialize() {
    await super.initialize();
    
    try {
      // Detect and validate Arbitrum network
      await this._detectArbitrumNetwork();
      
      // Initialize sequencer information
      await this._initializeSequencerInfo();
      
      // Initialize L1/L2 gas tracking
      await this._initializeL2GasTracking();
      
      console.log(`ArbitrumBroadcaster initialized successfully for ${this.networkInfo?.name || 'unknown'} network`);
      
    } catch (error) {
      console.error('Failed to initialize ArbitrumBroadcaster:', error);
      throw new Error(`Arbitrum broadcaster initialization failed: ${error.message}`);
    }
  }
  
  /**
   * Detects and validates Arbitrum network connection
   * @private
   */
  async _detectArbitrumNetwork() {
    try {
      const network = await this.provider.getNetwork();
      const chainId = Number(network.chainId);
      
      // Validate Arbitrum chain IDs
      const validChainIds = {
        42161: 'arbitrum-one',
        421613: 'arbitrum-goerli',
        421614: 'arbitrum-sepolia'
      };
      
      if (!validChainIds[chainId]) {
        console.warn(`Warning: Unrecognized Arbitrum chain ID: ${chainId}`);
      }
      
      this.networkInfo = {
        name: validChainIds[chainId] || `arbitrum-${chainId}`,
        chainId,
        isArbitrum: true,
        isL2: true,
        parentChainId: chainId === 42161 ? 1 : (chainId === 421613 ? 5 : 11155111), // mainnet : goerli : sepolia
        isTestnet: chainId !== 42161
      };
      
      console.log(`Connected to Arbitrum network: ${this.networkInfo.name} (Chain ID: ${chainId})`);
      
    } catch (error) {
      console.warn('Could not detect Arbitrum network:', error.message);
    }
  }
  
  /**
   * Initializes sequencer information for Arbitrum
   * @private
   */
  async _initializeSequencerInfo() {
    try {
      // Try to get sequencer information (if available)
      const blockNumber = await this.provider.getBlockNumber();
      this.sequencerInfo = {
        lastBlock: blockNumber,
        isHealthy: true,
        lastUpdate: Date.now()
      };
      
      console.log('Arbitrum sequencer information initialized');
      
    } catch (error) {
      console.warn('Could not initialize sequencer information:', error.message);
    }
  }
  
  /**
   * Initializes L2 gas tracking for cost optimization
   * @private
   */
  async _initializeL2GasTracking() {
    try {
      // Get initial L2 gas price
      const feeData = await this.provider.getFeeData();
      this.l2GasHistory.push({
        timestamp: Date.now(),
        gasPrice: feeData.gasPrice,
        maxFeePerGas: feeData.maxFeePerGas,
        maxPriorityFeePerGas: feeData.maxPriorityFeePerGas
      });
      
      console.log('Arbitrum L2 gas tracking initialized');
      
    } catch (error) {
      console.warn('Could not initialize L2 gas tracking:', error.message);
    }
  }
  
  /**
   * Sends raw transaction to Arbitrum L2 with 1 block confirmation
   * 
   * @protected
   * @method _sendRawTransaction
   * @param {Object} txData - Formatted Arbitrum transaction data
   * @returns {Promise<string>} Transaction hash after confirmation
   */
  async _sendRawTransaction(txData) {
    try {
      console.log('Sending Arbitrum L2 transaction:', {
        to: txData.to,
        value: txData.value?.toString(),
        gasLimit: txData.gasLimit?.toString(),
        gasPrice: txData.gasPrice?.toString(),
        maxFeePerGas: txData.maxFeePerGas?.toString(),
        nonce: txData.nonce,
        type: txData.type
      });
      
      // Send transaction to Arbitrum sequencer
      const txResponse = await this.provider.sendTransaction(txData);
      const txHash = txResponse.hash;
      
      console.log(`Arbitrum L2 transaction sent: ${txHash}`);
      
      /**
       * Transaction sent event
       * @event ArbitrumBroadcaster#transaction-sent
       * @type {Object}
       * @property {string} txHash - Transaction hash
       * @property {Object} txData - Transaction data
       * @property {string} network - Arbitrum network name
       * @property {boolean} isL2 - Always true for Arbitrum
       * @property {number} gasLimit - Gas limit used
       * @property {string} l2GasPrice - L2 gas price used
       */
      this.emit('transaction-sent', {
        txHash,
        txData,
        network: this.config.network,
        isL2: true,
        gasLimit: txData.gasLimit?.toString(),
        l2GasPrice: this._formatGasPrice(txData.gasPrice || txData.maxFeePerGas)
      });
      
      // Wait for L2 confirmation (fast finality)
      if (this.config.confirmations > 0) {
        console.log(`Waiting for ${this.config.confirmations} Arbitrum L2 confirmation(s)...`);
        
        const receipt = await txResponse.wait(this.config.confirmations);
        
        if (receipt.status === 0) {
          throw new Error('Arbitrum L2 transaction was reverted');
        }
        
        this.stats.successfulTransactions++;
        this.stats.totalGasUsed += receipt.gasUsed;
        
        /**
         * Transaction confirmed event
         * @event ArbitrumBroadcaster#transaction-confirmed
         * @type {Object}
         * @property {string} txHash - Transaction hash
         * @property {Object} receipt - Transaction receipt
         * @property {number} confirmations - Number of confirmations
         * @property {string} l2GasUsed - Actual L2 gas used
         * @property {number} blockNumber - L2 block number
         * @property {boolean} isL2 - Always true for Arbitrum
         */
        this.emit('transaction-confirmed', {
          txHash,
          receipt,
          confirmations: this.config.confirmations,
          l2GasUsed: receipt.gasUsed.toString(),
          blockNumber: receipt.blockNumber,
          isL2: true
        });
        
        console.log(`Arbitrum L2 transaction confirmed: ${txHash} (L2 Gas: ${receipt.gasUsed}, Block: ${receipt.blockNumber})`);
      }
      
      return txHash;
      
    } catch (error) {
      throw this._enhanceArbitrumError(error);
    }
  }
  
  /**
   * Estimates gas for Arbitrum L2 transactions with L1/L2 cost breakdown
   * 
   * @public
   * @method estimateGas
   * @param {Object} txData - Transaction data for estimation
   * @returns {Promise<Object>} Comprehensive gas estimation for Arbitrum
   * 
   * @example
   * const gasEstimate = await broadcaster.estimateGas({
   *   to: '0x742dFfdf2c6c8D4B93067782b1e7A38754b8c7b3',
   *   value: ethers.parseEther('0.01'),
   *   from: '0x8ba1f109551bD432803012645Hac136c'
   * });
   * 
   * console.log(`L2 Gas: ${gasEstimate.l2Gas}`);
   * console.log(`L1 Data Cost: ${gasEstimate.l1DataCost}`);
   */
  async estimateGas(txData) {
    try {
      // Create cache key for Arbitrum transactions
      const cacheKey = this._createArbitrumGasCacheKey(txData);
      
      // Check cache (shorter TTL for L2)
      if (this.gasCache.has(cacheKey)) {
        const cached = this.gasCache.get(cacheKey);
        if (Date.now() - cached.timestamp < 15000) { // 15 second cache
          console.log('Using cached Arbitrum gas estimate');
          return cached.estimate;
        }
      }
      
      // Estimate L2 gas limit
      const l2GasLimit = await super.estimateGas(txData);
      const safeL2GasLimit = Math.floor(Number(l2GasLimit) * this.config.gasMultiplier);
      
      // Get L2 fee data
      const l2FeeData = await this._getArbitrumL2FeeData();
      
      // Estimate L1 data cost (Arbitrum-specific)
      const l1DataCost = await this._estimateL1DataCost(txData);
      
      let gasEstimate;
      
      if (l2FeeData.maxFeePerGas) {
        // EIP-1559 for Arbitrum
        gasEstimate = {
          l2Gas: safeL2GasLimit,
          l2MaxFeePerGas: l2FeeData.maxFeePerGas.toString(),
          l2MaxPriorityFeePerGas: l2FeeData.maxPriorityFeePerGas.toString(),
          l1DataCost: l1DataCost.toString(),
          totalCost: (BigInt(safeL2GasLimit) * l2FeeData.maxFeePerGas + l1DataCost).toString(),
          type: 2,
          network: 'arbitrum',
          isL2: true
        };
      } else {
        // Legacy gas for Arbitrum
        gasEstimate = {
          l2Gas: safeL2GasLimit,
          l2GasPrice: l2FeeData.gasPrice.toString(),
          l1DataCost: l1DataCost.toString(),
          totalCost: (BigInt(safeL2GasLimit) * l2FeeData.gasPrice + l1DataCost).toString(),
          type: 0,
          network: 'arbitrum',
          isL2: true
        };
      }
      
      // Validate against Arbitrum limits
      this._validateArbitrumGasEstimate(gasEstimate);
      
      // Cache the estimate
      this.gasCache.set(cacheKey, {
        estimate: gasEstimate,
        timestamp: Date.now()
      });
      
      console.log('Arbitrum gas estimation completed:', gasEstimate);
      return gasEstimate;
      
    } catch (error) {
      throw this._enhanceArbitrumError(error, 'Arbitrum gas estimation failed');
    }
  }
  
  /**
   * Gets optimized L2 fee data for Arbitrum
   * @private
   */
  async _getArbitrumL2FeeData() {
    try {
      const feeData = await this.provider.getFeeData();
      
      // Update L2 gas history
      this.l2GasHistory.push({
        timestamp: Date.now(),
        gasPrice: feeData.gasPrice,
        maxFeePerGas: feeData.maxFeePerGas,
        maxPriorityFeePerGas: feeData.maxPriorityFeePerGas
      });
      
      // Keep recent history
      if (this.l2GasHistory.length > 5) {
        this.l2GasHistory = this.l2GasHistory.slice(-5);
      }
      
      // Apply Arbitrum L2 optimizations
      const gasPrice = feeData.gasPrice || this.config.defaultL2GasPrice;
      const minGasPrice = this.config.minL2GasPrice;
      
      return {
        gasPrice: gasPrice > minGasPrice ? gasPrice : minGasPrice,
        maxFeePerGas: feeData.maxFeePerGas,
        maxPriorityFeePerGas: feeData.maxPriorityFeePerGas
      };
      
    } catch (error) {
      console.warn('Failed to get Arbitrum L2 fee data, using defaults:', error.message);
      
      return {
        gasPrice: this.config.defaultL2GasPrice,
        maxFeePerGas: null,
        maxPriorityFeePerGas: null
      };
    }
  }
  
  /**
   * Estimates L1 data cost for Arbitrum transaction
   * @private
   */
  async _estimateL1DataCost(txData) {
    try {
      // Estimate transaction data size
      const txDataSize = this._calculateTransactionDataSize(txData);
      
      // Get current L1 gas price (simplified estimation)
      // In production, this would use Arbitrum's L1 gas price oracle
      const l1GasPrice = ethers.parseUnits('20', 'gwei'); // Simplified
      const l1GasPerByte = 16; // Approximate gas per byte
      
      const l1DataCost = BigInt(txDataSize) * BigInt(l1GasPerByte) * l1GasPrice;
      
      return l1DataCost;
      
    } catch (error) {
      console.warn('Could not estimate L1 data cost:', error.message);
      return BigInt(0);
    }
  }
  
  /**
   * Calculates transaction data size for L1 cost estimation
   * @private
   */
  _calculateTransactionDataSize(txData) {
    let size = 0;
    
    // Base transaction size
    size += 109; // Basic transaction overhead
    
    // Data field
    if (txData.data && txData.data !== '0x') {
      const dataBytes = (txData.data.length - 2) / 2; // Remove 0x prefix
      size += dataBytes;
    }
    
    return size;
  }
  
  /**
   * Validates gas estimate against Arbitrum limits
   * @private
   */
  _validateArbitrumGasEstimate(gasEstimate) {
    if (gasEstimate.l2Gas > this.config.maxGasLimit) {
      throw new Error(`Arbitrum L2 gas limit ${gasEstimate.l2Gas} exceeds maximum ${this.config.maxGasLimit}`);
    }
    
    const gasPrice = gasEstimate.l2GasPrice || gasEstimate.l2MaxFeePerGas;
    if (gasPrice && BigInt(gasPrice) > this.config.maxL2GasPrice) {
      throw new Error(`Arbitrum L2 gas price ${gasPrice} exceeds maximum ${this.config.maxL2GasPrice}`);
    }
    
    if (gasPrice && BigInt(gasPrice) < this.config.minL2GasPrice) {
      throw new Error(`Arbitrum L2 gas price ${gasPrice} below minimum ${this.config.minL2GasPrice}`);
    }
  }
  
  /**
   * Creates cache key for Arbitrum gas estimation
   * @private
   */
  _createArbitrumGasCacheKey(txData) {
    const key = `arbitrum-${txData.to}-${txData.value || '0'}-${txData.data || '0x'}-${txData.from || 'unknown'}`;
    return key.toLowerCase();
  }
  
  /**
   * Enhances errors with Arbitrum-specific context
   * @private
   */
  _enhanceArbitrumError(error, context = '') {
    const message = error.message || error.toString();
    const lowerMessage = message.toLowerCase();
    
    let errorCode = ARBITRUM_ERROR_CODES.NETWORK_ERROR;
    let enhancedMessage = message;
    
    // Categorize Arbitrum-specific errors
    if (lowerMessage.includes('insufficient funds')) {
      errorCode = ARBITRUM_ERROR_CODES.INSUFFICIENT_ETH;
      enhancedMessage = 'Insufficient ETH balance for Arbitrum L2 transaction (including gas costs)';
    } else if (lowerMessage.includes('nonce too low')) {
      errorCode = ARBITRUM_ERROR_CODES.NONCE_TOO_LOW;
      enhancedMessage = 'Transaction nonce too low for Arbitrum L2 (transaction may have been replaced)';
    } else if (lowerMessage.includes('gas price too low')) {
      errorCode = ARBITRUM_ERROR_CODES.L2_GAS_PRICE_TOO_LOW;
      enhancedMessage = `Arbitrum L2 gas price too low (minimum: ${this._formatGasPrice(this.config.minL2GasPrice)} GWEI)`;
    } else if (lowerMessage.includes('sequencer')) {
      errorCode = ARBITRUM_ERROR_CODES.SEQUENCER_ERROR;
      enhancedMessage = 'Arbitrum sequencer error - please try again';
    } else if (lowerMessage.includes('retryable') || lowerMessage.includes('ticket')) {
      errorCode = ARBITRUM_ERROR_CODES.RETRYABLE_TICKET_FAILED;
      enhancedMessage = 'Arbitrum retryable ticket failed - check L1 gas price';
    } else if (lowerMessage.includes('rollup') || lowerMessage.includes('batch')) {
      errorCode = ARBITRUM_ERROR_CODES.ROLLUP_ERROR;
      enhancedMessage = 'Arbitrum rollup error - transaction may be delayed';
    } else if (lowerMessage.includes('timeout')) {
      errorCode = ARBITRUM_ERROR_CODES.TIMEOUT;
      enhancedMessage = 'Arbitrum L2 transaction timed out';
    }
    
    const enhancedError = new Error(`${context ? context + ': ' : ''}${enhancedMessage}`);
    enhancedError.code = errorCode;
    enhancedError.originalError = error;
    enhancedError.network = 'arbitrum';
    enhancedError.isL2 = true;
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
   * Gets Arbitrum network-specific information
   * @public
   */
  getNetworkInfo() {
    return {
      ...this.networkInfo,
      enableArbOS: this.enableArbOS,
      sequencerInfo: this.sequencerInfo,
      l2ChainId: this.l2ChainId,
      parentChainId: this.parentChainId,
      minL2GasPrice: this._formatGasPrice(this.config.minL2GasPrice),
      maxL2GasPrice: this._formatGasPrice(this.config.maxL2GasPrice),
      gasCache: {
        size: this.gasCache.size,
        enabled: true
      }
    };
  }
  
  /**
   * Gets enhanced statistics with Arbitrum-specific metrics
   * @public
   */
  getStats() {
    const baseStats = super.getStats();
    const avgL2GasPrice = this.l2GasHistory.length > 0
      ? this.l2GasHistory.reduce((sum, entry) => sum + Number(entry.gasPrice || 0), 0) / this.l2GasHistory.length
      : 0;
    
    return {
      ...baseStats,
      network: 'arbitrum',
      isL2: true,
      chainId: this.networkInfo?.chainId,
      parentChainId: this.networkInfo?.parentChainId,
      gasCacheSize: this.gasCache.size,
      averageL2GasPrice: this._formatGasPrice(Math.floor(avgL2GasPrice)),
      sequencerHealth: this.sequencerInfo?.isHealthy || false,
      networkInfo: this.networkInfo
    };
  }
}
