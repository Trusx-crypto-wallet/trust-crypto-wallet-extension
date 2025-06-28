/**
 * EthereumBroadcaster.js
 * 
 * Ethereum-specific transaction broadcaster implementation that handles
 * Ethereum mainnet and EVM-compatible network transaction broadcasting
 * with network-specific optimizations and error handling.
 * 
 * @author Trust Crypto Wallet Extension
 * @version 1.0.0
 */

import { ethers } from 'ethers';
import BaseBroadcaster from './BaseBroadcaster.js';

/**
 * Ethereum-specific error codes and messages
 */
const ETHEREUM_ERROR_CODES = {
  INSUFFICIENT_FUNDS: 'INSUFFICIENT_FUNDS',
  NONCE_TOO_LOW: 'NONCE_TOO_LOW',
  NONCE_TOO_HIGH: 'NONCE_TOO_HIGH',
  GAS_LIMIT_TOO_LOW: 'GAS_LIMIT_TOO_LOW',
  GAS_PRICE_TOO_LOW: 'GAS_PRICE_TOO_LOW',
  REPLACEMENT_UNDERPRICED: 'REPLACEMENT_UNDERPRICED',
  INVALID_TRANSACTION: 'INVALID_TRANSACTION',
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT: 'TIMEOUT'
};

/**
 * Default Ethereum network configuration
 */
const DEFAULT_ETHEREUM_CONFIG = {
  network: 'ethereum',
  timeout: 300000, // 5 minutes
  confirmations: 1,
  gasMultiplier: 1.1,
  maxGasPrice: ethers.parseUnits('500', 'gwei'), // 500 Gwei max
  maxGasLimit: 21000000, // 21M gas limit
  blockTime: 12000, // 12 seconds average block time
  maxFeePerGas: ethers.parseUnits('100', 'gwei'),
  maxPriorityFeePerGas: ethers.parseUnits('2', 'gwei')
};

/**
 * EthereumBroadcaster - Ethereum-specific transaction broadcaster
 * 
 * Handles Ethereum mainnet and EVM-compatible network transaction broadcasting
 * with optimized gas estimation, EIP-1559 support, and comprehensive error handling
 * for Ethereum-specific transaction failures.
 * 
 * @class EthereumBroadcaster
 * @extends BaseBroadcaster
 * @example
 * const provider = new ethers.JsonRpcProvider('https://mainnet.infura.io/v3/YOUR-PROJECT-ID');
 * const broadcaster = new EthereumBroadcaster(provider, {
 *   network: 'ethereum',
 *   confirmations: 12,
 *   gasMultiplier: 1.2
 * });
 * 
 * broadcaster.on('transaction-sent', ({ txHash, gasUsed }) => {
 *   console.log(`Transaction sent: ${txHash} (Gas: ${gasUsed})`);
 * });
 * 
 * const txHash = await broadcaster.broadcast({
 *   to: '0x742dFfdf2c6c8D4B93067782b1e7A38754b8c7b3',
 *   value: ethers.parseEther('0.1'),
 *   data: '0x'
 * });
 */
export default class EthereumBroadcaster extends BaseBroadcaster {
  /**
   * Creates a new EthereumBroadcaster instance
   * 
   * Initializes the broadcaster with Ethereum-specific configuration
   * and sets up provider connection for Ethereum mainnet or EVM-compatible networks.
   * 
   * @constructor
   * @param {ethers.Provider} provider - Ethers.js provider for Ethereum network
   * @param {Object} [options={}] - Ethereum-specific configuration options
   * @param {string} [options.network='ethereum'] - Network name (ethereum, goerli, sepolia, etc.)
   * @param {number} [options.timeout=300000] - Transaction timeout in milliseconds (5 minutes)
   * @param {number} [options.confirmations=1] - Number of block confirmations to wait for
   * @param {number} [options.gasMultiplier=1.1] - Gas estimation safety multiplier
   * @param {BigNumber} [options.maxGasPrice] - Maximum gas price in wei
   * @param {number} [options.maxGasLimit=21000000] - Maximum gas limit
   * @param {BigNumber} [options.maxFeePerGas] - Maximum fee per gas (EIP-1559)
   * @param {BigNumber} [options.maxPriorityFeePerGas] - Maximum priority fee per gas (EIP-1559)
   * @param {boolean} [options.enableEIP1559=true] - Enable EIP-1559 fee structure
   * 
   * @throws {TypeError} If provider is not a valid ethers provider
   * @throws {Error} If network configuration is invalid
   * 
   * @example
   * const broadcaster = new EthereumBroadcaster(provider, {
   *   network: 'ethereum',
   *   confirmations: 12,
   *   gasMultiplier: 1.2,
   *   maxGasPrice: ethers.parseUnits('200', 'gwei'),
   *   enableEIP1559: true
   * });
   */
  constructor(provider, options = {}) {
    // Validate provider
    if (!provider || typeof provider.sendTransaction !== 'function') {
      throw new TypeError('Provider must be a valid ethers provider');
    }
    
    // Merge with Ethereum defaults
    const config = {
      ...DEFAULT_ETHEREUM_CONFIG,
      ...options
    };
    
    super(provider, config);
    
    // Ethereum-specific configuration
    this.enableEIP1559 = options.enableEIP1559 !== false; // Default to true
    this.lastNonce = null;
    this.gasCache = new Map(); // Cache gas estimates for similar transactions
    
    // Network detection
    this._detectNetwork();
    
    console.log(`EthereumBroadcaster initialized for ${this.config.network} network`);
  }
  
  /**
   * Detects and validates the connected network
   * @private
   */
  async _detectNetwork() {
    try {
      const network = await this.provider.getNetwork();
      this.networkInfo = {
        name: network.name,
        chainId: network.chainId,
        ensAddress: network.ensAddress
      };
      
      console.log(`Connected to network: ${network.name} (Chain ID: ${network.chainId})`);
    } catch (error) {
      console.warn('Could not detect network:', error.message);
    }
  }
  
  /**
   * Broadcasts a transaction to the Ethereum network
   * 
   * Handles the complete transaction lifecycle including gas estimation,
   * nonce management, EIP-1559 fee calculation, and confirmation waiting.
   * 
   * @public
   * @method broadcast
   * @param {Object} txData - Ethereum transaction data
   * @param {string} txData.to - Recipient address
   * @param {string|BigNumber} [txData.value='0'] - Transaction value in wei
   * @param {string} [txData.data='0x'] - Transaction data/input
   * @param {string|number} [txData.gasLimit] - Gas limit
   * @param {string|BigNumber} [txData.gasPrice] - Gas price (legacy)
   * @param {string|BigNumber} [txData.maxFeePerGas] - Max fee per gas (EIP-1559)
   * @param {string|BigNumber} [txData.maxPriorityFeePerGas] - Max priority fee (EIP-1559)
   * @param {number} [txData.nonce] - Transaction nonce
   * @param {string} [txData.from] - Sender address (for estimation)
   * @returns {Promise<string>} Transaction hash
   * @fires EthereumBroadcaster#transaction-sent
   * @fires EthereumBroadcaster#transaction-confirmed
   * 
   * @example
   * const txHash = await broadcaster.broadcast({
   *   to: '0x742dFfdf2c6c8D4B93067782b1e7A38754b8c7b3',
   *   value: ethers.parseEther('0.1'),
   *   data: '0x',
   *   gasLimit: 21000
   * });
   */
  async broadcast(txData) {
    const startTime = Date.now();
    
    try {
      // Validate transaction data
      this.validateTransactionData(txData);
      
      // Format transaction for Ethereum
      const formattedTx = await this._formatEthereumTransaction(txData);
      
      // Send transaction
      const txHash = await this._sendRawTransaction(formattedTx);
      
      // Update statistics
      this.stats.totalTransactions++;
      
      const duration = Date.now() - startTime;
      console.log(`Ethereum transaction broadcast completed in ${duration}ms: ${txHash}`);
      
      return txHash;
      
    } catch (error) {
      this.stats.failedTransactions++;
      const enhancedError = this._enhanceError(error);
      
      console.error('Ethereum broadcast failed:', enhancedError.message);
      
      /**
       * Transaction failed event
       * @event EthereumBroadcaster#transaction-failed
       * @type {Object}
       * @property {Error} error - Enhanced error with Ethereum-specific details
       * @property {Object} txData - Original transaction data
       * @property {number} duration - Time spent before failure
       */
      this.emit('transaction-failed', {
        error: enhancedError,
        txData,
        duration: Date.now() - startTime
      });
      
      throw enhancedError;
    }
  }
  
  /**
   * Sends raw transaction to Ethereum network with confirmation waiting
   * 
   * @protected
   * @method _sendRawTransaction
   * @param {Object} txData - Formatted Ethereum transaction data
   * @returns {Promise<string>} Transaction hash after confirmation
   */
  async _sendRawTransaction(txData) {
    try {
      console.log('Sending Ethereum transaction:', {
        to: txData.to,
        value: txData.value?.toString(),
        gasLimit: txData.gasLimit?.toString(),
        gasPrice: txData.gasPrice?.toString(),
        maxFeePerGas: txData.maxFeePerGas?.toString(),
        nonce: txData.nonce
      });
      
      // Send transaction
      const txResponse = await this.provider.sendTransaction(txData);
      const txHash = txResponse.hash;
      
      console.log(`Transaction sent: ${txHash}`);
      
      /**
       * Transaction sent event
       * @event EthereumBroadcaster#transaction-sent
       * @type {Object}
       * @property {string} txHash - Transaction hash
       * @property {Object} txData - Transaction data
       * @property {number} gasLimit - Gas limit used
       * @property {string} gasPrice - Gas price used
       */
      this.emit('transaction-sent', {
        txHash,
        txData,
        gasLimit: txData.gasLimit?.toString(),
        gasPrice: txData.gasPrice?.toString() || txData.maxFeePerGas?.toString()
      });
      
      // Wait for confirmation if required
      if (this.config.confirmations > 0) {
        console.log(`Waiting for ${this.config.confirmations} confirmation(s)...`);
        
        const receipt = await txResponse.wait(this.config.confirmations);
        
        if (receipt.status === 0) {
          throw new Error('Transaction was reverted');
        }
        
        this.stats.successfulTransactions++;
        
        /**
         * Transaction confirmed event
         * @event EthereumBroadcaster#transaction-confirmed
         * @type {Object}
         * @property {string} txHash - Transaction hash
         * @property {Object} receipt - Transaction receipt
         * @property {number} confirmations - Number of confirmations
         * @property {number} gasUsed - Actual gas used
         */
        this.emit('transaction-confirmed', {
          txHash,
          receipt,
          confirmations: this.config.confirmations,
          gasUsed: receipt.gasUsed.toString()
        });
        
        console.log(`Transaction confirmed: ${txHash} (Gas used: ${receipt.gasUsed})`);
      }
      
      return txHash;
      
    } catch (error) {
      throw this._enhanceError(error);
    }
  }
  
  /**
   * Estimates gas for an Ethereum transaction
   * 
   * Provides accurate gas estimation with safety multipliers and handles
   * EIP-1559 fee estimation for optimal transaction inclusion.
   * 
   * @public
   * @method estimateGas
   * @param {Object} txData - Transaction data for estimation
   * @param {string} txData.to - Recipient address
   * @param {string} [txData.from] - Sender address
   * @param {string|BigNumber} [txData.value='0'] - Transaction value
   * @param {string} [txData.data='0x'] - Transaction data
   * @returns {Promise<Object>} Gas estimation object with gasLimit and fee data
   * 
   * @example
   * const gasEstimate = await broadcaster.estimateGas({
   *   to: '0x742dFfdf2c6c8D4B93067782b1e7A38754b8c7b3',
   *   value: ethers.parseEther('0.1'),
   *   from: '0x8ba1f109551bD432803012645Hac136c'
   * });
   * 
   * console.log(`Gas limit: ${gasEstimate.gasLimit}`);
   * console.log(`Max fee: ${gasEstimate.maxFeePerGas}`);
   */
  async estimateGas(txData) {
    try {
      // Create cache key for similar transactions
      const cacheKey = this._createGasCacheKey(txData);
      
      // Check cache first
      if (this.gasCache.has(cacheKey)) {
        const cached = this.gasCache.get(cacheKey);
        if (Date.now() - cached.timestamp < 60000) { // 1 minute cache
          console.log('Using cached gas estimate');
          return cached.estimate;
        }
      }
      
      // Estimate gas limit
      const gasLimit = await this.provider.estimateGas({
        to: txData.to,
        from: txData.from,
        value: txData.value || '0x0',
        data: txData.data || '0x'
      });
      
      // Apply safety multiplier
      const safeGasLimit = Math.floor(Number(gasLimit) * this.config.gasMultiplier);
      
      // Get current fee data
      const feeData = await this.provider.getFeeData();
      
      let gasEstimate;
      
      if (this.enableEIP1559 && feeData.maxFeePerGas) {
        // EIP-1559 fee estimation
        gasEstimate = {
          gasLimit: safeGasLimit,
          maxFeePerGas: feeData.maxFeePerGas.toString(),
          maxPriorityFeePerGas: feeData.maxPriorityFeePerGas?.toString() || ethers.parseUnits('2', 'gwei').toString(),
          type: 2 // EIP-1559 transaction
        };
      } else {
        // Legacy gas price estimation
        gasEstimate = {
          gasLimit: safeGasLimit,
          gasPrice: feeData.gasPrice?.toString() || ethers.parseUnits('20', 'gwei').toString(),
          type: 0 // Legacy transaction
        };
      }
      
      // Validate against maximums
      this._validateGasEstimate(gasEstimate);
      
      // Cache the estimate
      this.gasCache.set(cacheKey, {
        estimate: gasEstimate,
        timestamp: Date.now()
      });
      
      console.log('Gas estimation completed:', gasEstimate);
      return gasEstimate;
      
    } catch (error) {
      throw this._enhanceError(error, 'Gas estimation failed');
    }
  }
  
  /**
   * Formats transaction data for Ethereum network
   * @private
   */
  async _formatEthereumTransaction(txData) {
    // Get gas estimation if not provided
    let gasData;
    if (!txData.gasLimit || (!txData.gasPrice && !txData.maxFeePerGas)) {
      gasData = await this.estimateGas(txData);
    }
    
    // Get nonce if not provided
    let nonce = txData.nonce;
    if (nonce === undefined) {
      nonce = await this.provider.getTransactionCount(txData.from || await this.provider.getSigner().getAddress(), 'pending');
    }
    
    // Format transaction
    const formattedTx = {
      to: txData.to,
      value: txData.value || '0x0',
      data: txData.data || '0x',
      nonce,
      gasLimit: txData.gasLimit || gasData.gasLimit
    };
    
    // Add fee data based on type
    if (this.enableEIP1559 && (gasData?.type === 2 || txData.maxFeePerGas)) {
      formattedTx.type = 2;
      formattedTx.maxFeePerGas = txData.maxFeePerGas || gasData.maxFeePerGas;
      formattedTx.maxPriorityFeePerGas = txData.maxPriorityFeePerGas || gasData.maxPriorityFeePerGas;
    } else {
      formattedTx.type = 0;
      formattedTx.gasPrice = txData.gasPrice || gasData.gasPrice;
    }
    
    return formattedTx;
  }
  
  /**
   * Validates gas estimate against network limits
   * @private
   */
  _validateGasEstimate(gasEstimate) {
    if (gasEstimate.gasLimit > this.config.maxGasLimit) {
      throw new Error(`Gas limit ${gasEstimate.gasLimit} exceeds maximum ${this.config.maxGasLimit}`);
    }
    
    if (gasEstimate.gasPrice && BigInt(gasEstimate.gasPrice) > this.config.maxGasPrice) {
      throw new Error(`Gas price ${gasEstimate.gasPrice} exceeds maximum ${this.config.maxGasPrice}`);
    }
    
    if (gasEstimate.maxFeePerGas && BigInt(gasEstimate.maxFeePerGas) > this.config.maxFeePerGas) {
      throw new Error(`Max fee per gas ${gasEstimate.maxFeePerGas} exceeds maximum ${this.config.maxFeePerGas}`);
    }
  }
  
  /**
   * Creates cache key for gas estimation
   * @private
   */
  _createGasCacheKey(txData) {
    return `${txData.to}-${txData.value || '0'}-${txData.data || '0x'}-${txData.from || 'unknown'}`;
  }
  
  /**
   * Enhances errors with Ethereum-specific context
   * @private
   */
  _enhanceError(error, context = '') {
    const message = error.message || error.toString();
    const lowerMessage = message.toLowerCase();
    
    let errorCode = ETHEREUM_ERROR_CODES.NETWORK_ERROR;
    let enhancedMessage = message;
    
    // Categorize Ethereum-specific errors
    if (lowerMessage.includes('insufficient funds')) {
      errorCode = ETHEREUM_ERROR_CODES.INSUFFICIENT_FUNDS;
      enhancedMessage = 'Insufficient funds for transaction (including gas costs)';
    } else if (lowerMessage.includes('nonce too low')) {
      errorCode = ETHEREUM_ERROR_CODES.NONCE_TOO_LOW;
      enhancedMessage = 'Transaction nonce is too low (transaction may have been replaced)';
    } else if (lowerMessage.includes('nonce too high')) {
      errorCode = ETHEREUM_ERROR_CODES.NONCE_TOO_HIGH;
      enhancedMessage = 'Transaction nonce is too high (missing previous transactions)';
    } else if (lowerMessage.includes('gas required exceeds allowance') || lowerMessage.includes('out of gas')) {
      errorCode = ETHEREUM_ERROR_CODES.GAS_LIMIT_TOO_LOW;
      enhancedMessage = 'Gas limit too low for transaction execution';
    } else if (lowerMessage.includes('gas price too low') || lowerMessage.includes('transaction underpriced')) {
      errorCode = ETHEREUM_ERROR_CODES.GAS_PRICE_TOO_LOW;
      enhancedMessage = 'Gas price too low for current network conditions';
    } else if (lowerMessage.includes('replacement transaction underpriced')) {
      errorCode = ETHEREUM_ERROR_CODES.REPLACEMENT_UNDERPRICED;
      enhancedMessage = 'Replacement transaction must have higher gas price';
    } else if (lowerMessage.includes('timeout') || lowerMessage.includes('timed out')) {
      errorCode = ETHEREUM_ERROR_CODES.TIMEOUT;
      enhancedMessage = 'Transaction timed out waiting for confirmation';
    } else if (lowerMessage.includes('reverted') || lowerMessage.includes('invalid')) {
      errorCode = ETHEREUM_ERROR_CODES.INVALID_TRANSACTION;
      enhancedMessage = 'Transaction execution reverted or invalid';
    }
    
    const enhancedError = new Error(`${context ? context + ': ' : ''}${enhancedMessage}`);
    enhancedError.code = errorCode;
    enhancedError.originalError = error;
    enhancedError.network = this.config.network;
    
    return enhancedError;
  }
  
  /**
   * Validates Ethereum-specific transaction data
   * @protected
   */
  validateTransactionData(txData) {
    // Call parent validation
    super.validateTransactionData(txData);
    
    // Ethereum-specific validations
    if (txData.gasLimit && (txData.gasLimit < 21000 || txData.gasLimit > this.config.maxGasLimit)) {
      throw new Error(`Gas limit must be between 21000 and ${this.config.maxGasLimit}`);
    }
    
    if (txData.gasPrice && BigInt(txData.gasPrice) > this.config.maxGasPrice) {
      throw new Error(`Gas price exceeds maximum allowed: ${this.config.maxGasPrice}`);
    }
    
    if (txData.nonce !== undefined && (txData.nonce < 0 || !Number.isInteger(txData.nonce))) {
      throw new Error('Nonce must be a non-negative integer');
    }
    
    // EIP-1559 validations
    if (txData.maxFeePerGas && txData.maxPriorityFeePerGas) {
      if (BigInt(txData.maxPriorityFeePerGas) > BigInt(txData.maxFeePerGas)) {
        throw new Error('maxPriorityFeePerGas cannot exceed maxFeePerGas');
      }
    }
  }
  
  /**
   * Gets network-specific information
   * @public
   */
  getNetworkInfo() {
    return {
      ...this.networkInfo,
      enableEIP1559: this.enableEIP1559,
      gasCache: {
        size: this.gasCache.size,
        enabled: true
      }
    };
  }
  
  /**
   * Clears gas estimation cache
   * @public
   */
  clearGasCache() {
    const size = this.gasCache.size;
    this.gasCache.clear();
    console.log(`Cleared ${size} gas cache entries`);
    return size;
  }
  
  /**
   * Gets enhanced statistics with Ethereum-specific metrics
   * @public
   */
  getStats() {
    return {
      ...super.getStats(),
      network: this.config.network,
      gasCacheSize: this.gasCache.size,
      enableEIP1559: this.enableEIP1559,
      networkInfo: this.networkInfo
    };
  }
}
