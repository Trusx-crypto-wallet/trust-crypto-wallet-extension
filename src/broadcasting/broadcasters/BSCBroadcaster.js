/**
 * BSCBroadcaster.js
 * 
 * Binance Smart Chain (BSC) specific transaction broadcaster implementation
 * with BNB gas calculations, validator network considerations, and BSC-specific
 * transaction handling for efficient operations on the BSC network.
 * 
 * @author Trust Crypto Wallet Extension
 * @version 1.0.0
 */

import { ethers } from 'ethers';
import BaseBroadcaster from './BaseBroadcaster.js';

/**
 * BSC-specific error codes and messages
 */
const BSC_ERROR_CODES = {
  INSUFFICIENT_BNB: 'INSUFFICIENT_BNB',
  GAS_PRICE_TOO_LOW: 'GAS_PRICE_TOO_LOW',
  NONCE_TOO_LOW: 'NONCE_TOO_LOW',
  VALIDATOR_ERROR: 'VALIDATOR_ERROR',
  NETWORK_CONGESTION: 'NETWORK_CONGESTION',
  BSC_RPC_ERROR: 'BSC_RPC_ERROR',
  PARLIA_CONSENSUS_ERROR: 'PARLIA_CONSENSUS_ERROR',
  INVALID_BSC_TX: 'INVALID_BSC_TX',
  CROSS_CHAIN_ERROR: 'CROSS_CHAIN_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT: 'TIMEOUT',
  MEV_PROTECTION_ERROR: 'MEV_PROTECTION_ERROR'
};

/**
 * Default BSC network configuration
 */
const DEFAULT_BSC_CONFIG = {
  network: 'bsc',
  timeout: 120000, // 2 minutes (3 block confirmations)
  confirmations: 3, // 3 blocks for safety on BSC
  gasMultiplier: 1.2, // Higher multiplier for BSC variability
  blockTime: 3000, // ~3 seconds average block time
  
  // BSC-specific gas configuration
  minGasPrice: ethers.parseUnits('3', 'gwei'), // 3 Gwei minimum (BSC standard)
  maxGasPrice: ethers.parseUnits('100', 'gwei'), // 100 Gwei maximum
  defaultGasPrice: ethers.parseUnits('5', 'gwei'), // 5 Gwei default
  maxGasLimit: 30000000, // 30M gas limit
  
  // BSC validator configuration
  validatorRotationBlocks: 200, // Validators rotate every ~200 blocks
  validatorCount: 21, // 21 active validators
  
  // BSC-specific features
  enableEIP1559: false, // BSC doesn't support EIP-1559 yet
  supportsCrossChain: true,
  useParliaConsensus: true,
  bscChainId: 56, // BSC mainnet
  testnetChainId: 97, // BSC testnet
  
  // MEV protection settings
  enableMEVProtection: true,
  maxPriorityFeeForMEV: ethers.parseUnits('2', 'gwei')
};

/**
 * BSCBroadcaster - Binance Smart Chain specific transaction broadcaster
 * 
 * Handles BSC transaction broadcasting with BNB gas calculations, validator
 * network awareness, Parlia consensus considerations, and BSC-specific
 * transaction optimizations for efficient operations.
 * 
 * @class BSCBroadcaster
 * @extends BaseBroadcaster
 * @example
 * const provider = new ethers.JsonRpcProvider('https://bsc-dataseed.binance.org/');
 * const broadcaster = new BSCBroadcaster(provider, {
 *   network: 'bsc',
 *   confirmations: 3,
 *   enableMEVProtection: true
 * });
 * 
 * broadcaster.on('transaction-sent', ({ txHash, bnbGasPrice, validatorEpoch }) => {
 *   console.log(`BSC tx: ${txHash} (Gas: ${bnbGasPrice} GWEI, Epoch: ${validatorEpoch})`);
 * });
 * 
 * const txHash = await broadcaster.broadcast({
 *   to: '0x742dFfdf2c6c8D4B93067782b1e7A38754b8c7b3',
 *   value: ethers.parseEther('0.1'), // 0.1 BNB
 *   data: '0x'
 * });
 */
export default class BSCBroadcaster extends BaseBroadcaster {
  /**
   * Creates a new BSCBroadcaster instance
   * 
   * Initializes the broadcaster with BSC-specific configuration including
   * 3 block confirmations, BNB gas calculations, and validator network awareness.
   * 
   * @constructor
   * @param {ethers.Provider} provider - Ethers.js provider for BSC network
   * @param {Object} [options={}] - BSC-specific configuration options
   * @param {string} [options.network='bsc'] - Network name (bsc, bsc-testnet)
   * @param {number} [options.timeout=120000] - Transaction timeout in milliseconds (2 minutes)
   * @param {number} [options.confirmations=3] - Number of block confirmations for safety
   * @param {number} [options.gasMultiplier=1.2] - Gas estimation safety multiplier
   * @param {BigNumber} [options.minGasPrice] - Minimum gas price in wei (3 Gwei default)
   * @param {BigNumber} [options.maxGasPrice] - Maximum gas price in wei (100 Gwei default)
   * @param {BigNumber} [options.defaultGasPrice] - Default gas price when estimation fails
   * @param {number} [options.maxGasLimit=30000000] - Maximum gas limit for transactions
   * @param {boolean} [options.enableMEVProtection=true] - Enable MEV protection features
   * @param {number} [options.validatorCount=21] - Number of active BSC validators
   * @param {number} [options.bscChainId=56] - BSC chain ID (56 for mainnet)
   * 
   * @throws {TypeError} If provider is not compatible with BSC
   * @throws {Error} If network configuration is invalid for BSC
   * 
   * @example
   * const broadcaster = new BSCBroadcaster(provider, {
   *   network: 'bsc',
   *   confirmations: 5,
   *   gasMultiplier: 1.3,
   *   enableMEVProtection: true,
   *   minGasPrice: ethers.parseUnits('5', 'gwei')
   * });
   */
  constructor(provider, options = {}) {
    // Validate provider for BSC compatibility
    if (!provider || typeof provider.sendTransaction !== 'function') {
      throw new TypeError('Provider must be a valid ethers provider compatible with BSC network');
    }
    
    // Merge with BSC defaults
    const config = {
      ...DEFAULT_BSC_CONFIG,
      ...options
    };
    
    super(provider, config);
    
    // BSC-specific properties
    this.enableMEVProtection = config.enableMEVProtection;
    this.validatorCount = config.validatorCount;
    this.validatorRotationBlocks = config.validatorRotationBlocks;
    this.bscChainId = config.bscChainId;
    this.testnetChainId = config.testnetChainId;
    this.gasCache = new Map();
    this.networkInfo = null;
    this.validatorInfo = null;
    
    // BSC validator and gas tracking
    this.gasHistory = [];
    this.validatorEpoch = 0;
    this.lastValidatorUpdate = 0;
    this.networkCongestion = 'normal';
    
    console.log(`BSCBroadcaster initialized for ${this.config.network} network`);
  }
  
  /**
   * Initializes BSC-specific broadcaster features
   * 
   * @public
   * @method initialize
   * @returns {Promise<void>} Resolves when initialization is complete
   */
  async initialize() {
    await super.initialize();
    
    try {
      // Detect and validate BSC network
      await this._detectBSCNetwork();
      
      // Initialize validator tracking
      await this._initializeValidatorTracking();
      
      // Initialize gas price tracking
      await this._initializeBSCGasTracking();
      
      console.log(`BSCBroadcaster initialized successfully for ${this.networkInfo?.name || 'unknown'} network`);
      
    } catch (error) {
      console.error('Failed to initialize BSCBroadcaster:', error);
      throw new Error(`BSC broadcaster initialization failed: ${error.message}`);
    }
  }
  
  /**
   * Detects and validates BSC network connection
   * @private
   */
  async _detectBSCNetwork() {
    try {
      const network = await this.provider.getNetwork();
      const chainId = Number(network.chainId);
      
      // Validate BSC chain IDs
      const validChainIds = {
        56: 'bsc-mainnet',
        97: 'bsc-testnet'
      };
      
      if (!validChainIds[chainId]) {
        console.warn(`Warning: Unrecognized BSC chain ID: ${chainId}`);
      }
      
      this.networkInfo = {
        name: validChainIds[chainId] || `bsc-${chainId}`,
        chainId,
        isBSC: true,
        isTestnet: chainId !== 56,
        useParliaConsensus: true,
        supportsCrossChain: true,
        validatorBased: true
      };
      
      console.log(`Connected to BSC network: ${this.networkInfo.name} (Chain ID: ${chainId})`);
      
    } catch (error) {
      console.warn('Could not detect BSC network:', error.message);
    }
  }
  
  /**
   * Initializes BSC validator tracking
   * @private
   */
  async _initializeValidatorTracking() {
    try {
      // Get current block to calculate validator epoch
      const currentBlock = await this.provider.getBlockNumber();
      this.validatorEpoch = Math.floor(currentBlock / this.validatorRotationBlocks);
      this.lastValidatorUpdate = Date.now();
      
      this.validatorInfo = {
        currentEpoch: this.validatorEpoch,
        totalValidators: this.validatorCount,
        rotationBlocks: this.validatorRotationBlocks,
        lastUpdate: this.lastValidatorUpdate,
        consensusEngine: 'parlia',
        isHealthy: true
      };
      
      console.log(`BSC validator tracking initialized (Epoch: ${this.validatorEpoch})`);
      
    } catch (error) {
      console.warn('Could not initialize validator tracking:', error.message);
    }
  }
  
  /**
   * Initializes BSC gas price tracking
   * @private
   */
  async _initializeBSCGasTracking() {
    try {
      // Get initial BSC gas price
      const feeData = await this.provider.getFeeData();
      this.gasHistory.push({
        timestamp: Date.now(),
        gasPrice: feeData.gasPrice,
        validatorEpoch: this.validatorEpoch
      });
      
      console.log('BSC gas price tracking initialized');
      
    } catch (error) {
      console.warn('Could not initialize BSC gas tracking:', error.message);
    }
  }
  
  /**
   * Sends raw transaction to BSC with 3 block confirmations
   * 
   * @protected
   * @method _sendRawTransaction
   * @param {Object} txData - Formatted BSC transaction data
   * @returns {Promise<string>} Transaction hash after confirmations
   */
  async _sendRawTransaction(txData) {
    try {
      console.log('Sending BSC transaction:', {
        to: txData.to,
        value: txData.value?.toString(),
        gasLimit: txData.gasLimit?.toString(),
        gasPrice: txData.gasPrice?.toString(),
        nonce: txData.nonce,
        validatorEpoch: this.validatorEpoch
      });
      
      // Send transaction to BSC network
      const txResponse = await this.provider.sendTransaction(txData);
      const txHash = txResponse.hash;
      
      console.log(`BSC transaction sent: ${txHash}`);
      
      /**
       * Transaction sent event
       * @event BSCBroadcaster#transaction-sent
       * @type {Object}
       * @property {string} txHash - Transaction hash
       * @property {Object} txData - Transaction data
       * @property {string} network - BSC network name
       * @property {boolean} isBSC - Always true for BSC
       * @property {number} gasLimit - Gas limit used
       * @property {string} bnbGasPrice - BNB gas price used
       * @property {number} validatorEpoch - Current validator epoch
       * @property {boolean} mevProtected - Whether MEV protection was applied
       */
      this.emit('transaction-sent', {
        txHash,
        txData,
        network: this.config.network,
        isBSC: true,
        gasLimit: txData.gasLimit?.toString(),
        bnbGasPrice: this._formatGasPrice(txData.gasPrice),
        validatorEpoch: this.validatorEpoch,
        mevProtected: this.enableMEVProtection
      });
      
      // Wait for BSC confirmations (3 blocks for safety)
      if (this.config.confirmations > 0) {
        console.log(`Waiting for ${this.config.confirmations} BSC confirmation(s)...`);
        
        const receipt = await txResponse.wait(this.config.confirmations);
        
        if (receipt.status === 0) {
          throw new Error('BSC transaction was reverted');
        }
        
        this.stats.successfulTransactions++;
        this.stats.totalGasUsed += receipt.gasUsed;
        
        // Update validator epoch if needed
        await this._updateValidatorEpoch(receipt.blockNumber);
        
        /**
         * Transaction confirmed event
         * @event BSCBroadcaster#transaction-confirmed
         * @type {Object}
         * @property {string} txHash - Transaction hash
         * @property {Object} receipt - Transaction receipt
         * @property {number} confirmations - Number of confirmations
         * @property {string} bnbGasUsed - Actual BNB gas used
         * @property {number} blockNumber - Block number
         * @property {boolean} isBSC - Always true for BSC
         * @property {number} validatorEpoch - Validator epoch when confirmed
         */
        this.emit('transaction-confirmed', {
          txHash,
          receipt,
          confirmations: this.config.confirmations,
          bnbGasUsed: receipt.gasUsed.toString(),
          blockNumber: receipt.blockNumber,
          isBSC: true,
          validatorEpoch: this.validatorEpoch
        });
        
        console.log(`BSC transaction confirmed: ${txHash} (Gas: ${receipt.gasUsed}, Block: ${receipt.blockNumber}, Epoch: ${this.validatorEpoch})`);
      }
      
      return txHash;
      
    } catch (error) {
      throw this._enhanceBSCError(error);
    }
  }
  
  /**
   * Estimates gas for BSC transactions with BNB calculations
   * 
   * @public
   * @method estimateGas
   * @param {Object} txData - Transaction data for estimation
   * @returns {Promise<Object>} Comprehensive gas estimation for BSC
   * 
   * @example
   * const gasEstimate = await broadcaster.estimateGas({
   *   to: '0x742dFfdf2c6c8D4B93067782b1e7A38754b8c7b3',
   *   value: ethers.parseEther('0.1'),
   *   from: '0x8ba1f109551bD432803012645Hac136c'
   * });
   * 
   * console.log(`Gas limit: ${gasEstimate.gasLimit}`);
   * console.log(`BNB gas price: ${gasEstimate.gasPrice} GWEI`);
   */
  async estimateGas(txData) {
    try {
      // Create cache key for BSC transactions
      const cacheKey = this._createBSCGasCacheKey(txData);
      
      // Check cache (30 second TTL for BSC)
      if (this.gasCache.has(cacheKey)) {
        const cached = this.gasCache.get(cacheKey);
        if (Date.now() - cached.timestamp < 30000) {
          console.log('Using cached BSC gas estimate');
          return cached.estimate;
        }
      }
      
      // Estimate gas limit using parent method
      const gasLimit = await super.estimateGas(txData);
      const safeGasLimit = Math.floor(Number(gasLimit) * this.config.gasMultiplier);
      
      // Get BSC-optimized fee data
      const feeData = await this._getBSCFeeData();
      
      // BSC uses legacy gas pricing (no EIP-1559 support yet)
      let gasEstimate = {
        gasLimit: safeGasLimit,
        gasPrice: feeData.gasPrice.toString(),
        type: 0, // Legacy transaction type
        network: 'bsc',
        currency: 'BNB',
        validatorEpoch: this.validatorEpoch,
        mevProtected: this.enableMEVProtection
      };
      
      // Apply MEV protection if enabled
      if (this.enableMEVProtection) {
        gasEstimate = await this._applyMEVProtection(gasEstimate, txData);
      }
      
      // Validate against BSC limits
      this._validateBSCGasEstimate(gasEstimate);
      
      // Cache the estimate
      this.gasCache.set(cacheKey, {
        estimate: gasEstimate,
        timestamp: Date.now()
      });
      
      console.log('BSC gas estimation completed:', gasEstimate);
      return gasEstimate;
      
    } catch (error) {
      throw this._enhanceBSCError(error, 'BSC gas estimation failed');
    }
  }
  
  /**
   * Gets optimized fee data for BSC network
   * @private
   */
  async _getBSCFeeData() {
    try {
      const feeData = await this.provider.getFeeData();
      
      // Update gas history
      this.gasHistory.push({
        timestamp: Date.now(),
        gasPrice: feeData.gasPrice,
        validatorEpoch: this.validatorEpoch
      });
      
      // Keep recent history (last 15 entries)
      if (this.gasHistory.length > 15) {
        this.gasHistory = this.gasHistory.slice(-15);
      }
      
      // Apply BSC-specific optimizations
      const gasPrice = feeData.gasPrice || this.config.defaultGasPrice;
      const minGasPrice = this.config.minGasPrice;
      
      // Adjust based on network congestion
      const congestionMultiplier = this._getBSCCongestionMultiplier();
      const adjustedGasPrice = gasPrice * BigInt(Math.floor(congestionMultiplier * 100)) / 100n;
      
      return {
        gasPrice: adjustedGasPrice > minGasPrice ? adjustedGasPrice : minGasPrice
      };
      
    } catch (error) {
      console.warn('Failed to get BSC fee data, using defaults:', error.message);
      
      return {
        gasPrice: this.config.defaultGasPrice
      };
    }
  }
  
  /**
   * Gets BSC network congestion multiplier
   * @private
   */
  _getBSCCongestionMultiplier() {
    // Simple congestion detection based on recent gas prices
    if (this.gasHistory.length < 3) {
      return 1.0;
    }
    
    const recent = this.gasHistory.slice(-3);
    const avgRecent = recent.reduce((sum, entry) => sum + Number(entry.gasPrice), 0) / recent.length;
    const baseline = Number(this.config.defaultGasPrice);
    
    const ratio = avgRecent / baseline;
    
    if (ratio > 2.0) {
      this.networkCongestion = 'high';
      return 1.3;
    } else if (ratio > 1.5) {
      this.networkCongestion = 'medium';
      return 1.1;
    } else {
      this.networkCongestion = 'normal';
      return 1.0;
    }
  }
  
  /**
   * Applies MEV protection to gas estimate
   * @private
   */
  async _applyMEVProtection(gasEstimate, txData) {
    if (!this.enableMEVProtection) {
      return gasEstimate;
    }
    
    try {
      // Analyze transaction for MEV risk
      const mevRisk = this._analyzeMEVRisk(txData);
      
      if (mevRisk === 'high') {
        // Apply higher gas price for MEV protection
        const protectedGasPrice = BigInt(gasEstimate.gasPrice) + this.config.maxPriorityFeeForMEV;
        gasEstimate.gasPrice = protectedGasPrice.toString();
        gasEstimate.mevProtectionLevel = 'high';
        gasEstimate.mevPremium = this._formatGasPrice(this.config.maxPriorityFeeForMEV);
        
        console.log(`Applied high MEV protection: +${gasEstimate.mevPremium} GWEI`);
      } else if (mevRisk === 'medium') {
        // Apply moderate protection
        const protectedGasPrice = BigInt(gasEstimate.gasPrice) + (this.config.maxPriorityFeeForMEV / 2n);
        gasEstimate.gasPrice = protectedGasPrice.toString();
        gasEstimate.mevProtectionLevel = 'medium';
        gasEstimate.mevPremium = this._formatGasPrice(this.config.maxPriorityFeeForMEV / 2n);
        
        console.log(`Applied medium MEV protection: +${gasEstimate.mevPremium} GWEI`);
      } else {
        gasEstimate.mevProtectionLevel = 'none';
        gasEstimate.mevPremium = '0';
      }
      
      return gasEstimate;
      
    } catch (error) {
      console.warn('MEV protection analysis failed:', error.message);
      return gasEstimate;
    }
  }
  
  /**
   * Analyzes transaction for MEV risk
   * @private
   */
  _analyzeMEVRisk(txData) {
    // Simple MEV risk analysis
    const value = BigInt(txData.value || 0);
    const hasData = txData.data && txData.data !== '0x';
    
    // High value transactions with contract interaction = high MEV risk
    if (value > ethers.parseEther('1') && hasData) {
      return 'high';
    }
    
    // Contract interactions = medium MEV risk
    if (hasData) {
      return 'medium';
    }
    
    // Simple transfers = low MEV risk
    return 'low';
  }
  
  /**
   * Updates validator epoch based on block number
   * @private
   */
  async _updateValidatorEpoch(blockNumber) {
    const newEpoch = Math.floor(blockNumber / this.validatorRotationBlocks);
    
    if (newEpoch > this.validatorEpoch) {
      console.log(`BSC validator epoch updated: ${this.validatorEpoch} -> ${newEpoch}`);
      this.validatorEpoch = newEpoch;
      this.lastValidatorUpdate = Date.now();
      
      if (this.validatorInfo) {
        this.validatorInfo.currentEpoch = this.validatorEpoch;
        this.validatorInfo.lastUpdate = this.lastValidatorUpdate;
      }
      
      // Clear gas cache on validator rotation for fresh estimates
      this.clearGasCache();
      
      /**
       * Validator epoch changed event
       * @event BSCBroadcaster#validator-epoch-changed
       * @type {Object}
       * @property {number} previousEpoch - Previous validator epoch
       * @property {number} newEpoch - New validator epoch
       * @property {number} blockNumber - Block number where change occurred
       * @property {number} timestamp - When the change was detected
       */
      this.emit('validator-epoch-changed', {
        previousEpoch: this.validatorEpoch - 1,
        newEpoch: this.validatorEpoch,
        blockNumber,
        timestamp: this.lastValidatorUpdate
      });
    }
  }
  
  /**
   * Validates gas estimate against BSC limits
   * @private
   */
  _validateBSCGasEstimate(gasEstimate) {
    if (gasEstimate.gasLimit > this.config.maxGasLimit) {
      throw new Error(`BSC gas limit ${gasEstimate.gasLimit} exceeds maximum ${this.config.maxGasLimit}`);
    }
    
    if (gasEstimate.gasPrice && BigInt(gasEstimate.gasPrice) > this.config.maxGasPrice) {
      throw new Error(`BSC gas price ${gasEstimate.gasPrice} exceeds maximum ${this.config.maxGasPrice}`);
    }
    
    if (gasEstimate.gasPrice && BigInt(gasEstimate.gasPrice) < this.config.minGasPrice) {
      throw new Error(`BSC gas price ${gasEstimate.gasPrice} below minimum ${this.config.minGasPrice}`);
    }
  }
  
  /**
   * Creates cache key for BSC gas estimation
   * @private
   */
  _createBSCGasCacheKey(txData) {
    const key = `bsc-${txData.to}-${txData.value || '0'}-${txData.data || '0x'}-${txData.from || 'unknown'}-${this.validatorEpoch}`;
    return key.toLowerCase();
  }
  
  /**
   * Enhances errors with BSC-specific context
   * @private
   */
  _enhanceBSCError(error, context = '') {
    const message = error.message || error.toString();
    const lowerMessage = message.toLowerCase();
    
    let errorCode = BSC_ERROR_CODES.NETWORK_ERROR;
    let enhancedMessage = message;
    
    // Categorize BSC-specific errors
    if (lowerMessage.includes('insufficient funds')) {
      errorCode = BSC_ERROR_CODES.INSUFFICIENT_BNB;
      enhancedMessage = 'Insufficient BNB balance for transaction (including gas costs)';
    } else if (lowerMessage.includes('nonce too low')) {
      errorCode = BSC_ERROR_CODES.NONCE_TOO_LOW;
      enhancedMessage = 'Transaction nonce too low for BSC network (transaction may have been replaced)';
    } else if (lowerMessage.includes('gas price too low') || lowerMessage.includes('transaction underpriced')) {
      errorCode = BSC_ERROR_CODES.GAS_PRICE_TOO_LOW;
      enhancedMessage = `BSC gas price too low (minimum: ${this._formatGasPrice(this.config.minGasPrice)} GWEI)`;
    } else if (lowerMessage.includes('validator') || lowerMessage.includes('parlia')) {
      errorCode = BSC_ERROR_CODES.VALIDATOR_ERROR;
      enhancedMessage = 'BSC validator error - transaction may be delayed during validator rotation';
    } else if (lowerMessage.includes('consensus') || lowerMessage.includes('parlia')) {
      errorCode = BSC_ERROR_CODES.PARLIA_CONSENSUS_ERROR;
      enhancedMessage = 'BSC Parlia consensus error - please try again';
    } else if (lowerMessage.includes('cross-chain') || lowerMessage.includes('bridge')) {
      errorCode = BSC_ERROR_CODES.CROSS_CHAIN_ERROR;
      enhancedMessage = 'BSC cross-chain operation error - check bridge status';
    } else if (lowerMessage.includes('mev') || lowerMessage.includes('front')) {
      errorCode = BSC_ERROR_CODES.MEV_PROTECTION_ERROR;
      enhancedMessage = 'MEV protection error - consider increasing gas price';
    } else if (lowerMessage.includes('congestion') || lowerMessage.includes('busy')) {
      errorCode = BSC_ERROR_CODES.NETWORK_CONGESTION;
      enhancedMessage = 'BSC network congestion - consider increasing gas price or waiting for validator rotation';
    } else if (lowerMessage.includes('timeout')) {
      errorCode = BSC_ERROR_CODES.TIMEOUT;
      enhancedMessage = 'BSC transaction timed out';
    } else if (lowerMessage.includes('rpc') || lowerMessage.includes('endpoint')) {
      errorCode = BSC_ERROR_CODES.BSC_RPC_ERROR;
      enhancedMessage = 'BSC RPC endpoint error - try different RPC provider';
    }
    
    const enhancedError = new Error(`${context ? context + ': ' : ''}${enhancedMessage}`);
    enhancedError.code = errorCode;
    enhancedError.originalError = error;
    enhancedError.network = 'bsc';
    enhancedError.isBSC = true;
    enhancedError.chainId = this.networkInfo?.chainId;
    enhancedError.validatorEpoch = this.validatorEpoch;
    enhancedError.congestionLevel = this.networkCongestion;
    
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
   * Validates BSC-specific transaction data
   * @protected
   */
  validateTransactionData(txData) {
    // Call parent validation
    super.validateTransactionData(txData);
    
    // BSC-specific validations
    if (txData.gasLimit && (txData.gasLimit < 21000 || txData.gasLimit > this.config.maxGasLimit)) {
      throw new Error(`BSC gas limit must be between 21000 and ${this.config.maxGasLimit}`);
    }
    
    if (txData.gasPrice) {
      const gasPrice = BigInt(txData.gasPrice);
      if (gasPrice > this.config.maxGasPrice) {
        throw new Error(`BSC gas price exceeds maximum: ${this._formatGasPrice(this.config.maxGasPrice)} GWEI`);
      }
      if (gasPrice < this.config.minGasPrice) {
        throw new Error(`BSC gas price below minimum: ${this._formatGasPrice(this.config.minGasPrice)} GWEI`);
      }
    }
    
    // BSC doesn't support EIP-1559 yet, reject if provided
    if (txData.maxFeePerGas || txData.maxPriorityFeePerGas) {
      throw new Error('BSC does not support EIP-1559 transaction format yet. Use legacy gasPrice instead.');
    }
  }
  
  /**
   * Gets BSC network-specific information with validator details
   * @public
   */
  getNetworkInfo() {
    return {
      ...this.networkInfo,
      validatorInfo: this.validatorInfo,
      enableMEVProtection: this.enableMEVProtection,
      bscChainId: this.bscChainId,
      testnetChainId: this.testnetChainId,
      currentValidatorEpoch: this.validatorEpoch,
      networkCongestion: this.networkCongestion,
      
      // Gas configuration
      gasConfiguration: {
        minGasPrice: this._formatGasPrice(this.config.minGasPrice),
        maxGasPrice: this._formatGasPrice(this.config.maxGasPrice),
        defaultGasPrice: this._formatGasPrice(this.config.defaultGasPrice),
        gasMultiplier: this.config.gasMultiplier,
        supportEIP1559: false
      },
      
      // Validator system details
      validatorSystem: {
        activeValidators: this.validatorCount,
        rotationBlocks: this.validatorRotationBlocks,
        consensusEngine: 'parlia',
        currentEpoch: this.validatorEpoch,
        lastRotation: this.lastValidatorUpdate
      },
      
      // Performance metrics
      gasCache: {
        size: this.gasCache.size,
        enabled: true,
        ttl: '30 seconds'
      },
      
      // BSC-specific features
      bscFeatures: {
        crossChainSupport: this.config.supportsCrossChain,
        mevProtection: this.enableMEVProtection,
        parliaConsensus: this.config.useParliaConsensus
      }
    };
  }
  
  /**
   * Gets comprehensive fee recommendations for BSC transactions
   * @public
   */
  async getFeeRecommendations() {
    try {
      // Get current BSC fee data
      const currentFeeData = await this._getBSCFeeData();
      const baseFee = currentFeeData.gasPrice;
      
      // Calculate recommendations based on network conditions
      const recommendations = {
        safeLow: {
          priority: 'safeLow',
          description: 'Most economical option, may take longer during congestion',
          gasPrice: this.config.minGasPrice,
          gasPriceGwei: this._formatGasPrice(this.config.minGasPrice),
          estimatedTime: this._estimateBSCTransactionTime(this.config.minGasPrice),
          confidence: 'medium',
          type: 0, // Legacy
          savingsVsStandard: 0 // Will be calculated
        },
        
        standard: {
          priority: 'standard',
          description: 'Balanced speed and cost, recommended for most BSC transactions',
          gasPrice: baseFee,
          gasPriceGwei: this._formatGasPrice(baseFee),
          estimatedTime: this._estimateBSCTransactionTime(baseFee),
          confidence: 'high',
          type: 0, // Legacy
          savingsVsStandard: 0 // Reference point
        },
        
        fast: {
          priority: 'fast',
          description: 'Fastest confirmation, higher cost',
          gasPrice: baseFee * 150n / 100n, // 1.5x base fee
          gasPriceGwei: this._formatGasPrice(baseFee * 150n / 100n),
          estimatedTime: this._estimateBSCTransactionTime(baseFee * 150n / 100n),
          confidence: 'high',
          type: 0, // Legacy
          savingsVsStandard: 0 // Will be calculated (negative = more expensive)
        }
      };
      
      // Apply network congestion adjustments
      this._adjustRecommendationsForCongestion(recommendations);
      
      // Calculate savings percentages
      const standardPrice = Number(recommendations.standard.gasPrice);
      recommendations.safeLow.savingsVsStandard = Math.round(
        ((standardPrice - Number(recommendations.safeLow.gasPrice)) / standardPrice) * 100
      );
      recommendations.fast.savingsVsStandard = Math.round(
        ((standardPrice - Number(recommendations.fast.gasPrice)) / standardPrice) * 100
      );
      
      // Add metadata
      const result = {
        ...recommendations,
        metadata: {
          timestamp: Date.now(),
          network: 'bsc',
          currency: 'BNB',
          congestionLevel: this.networkCongestion,
          validatorEpoch: this.validatorEpoch,
          mevProtectionEnabled: this.enableMEVProtection,
          supportEIP1559: false,
          lastUpdated: new Date().toISOString()
        }
      };
      
      console.log('Generated BSC fee recommendations:', {
        safeLow: result.safeLow.gasPriceGwei + ' GWEI',
        standard: result.standard.gasPriceGwei + ' GWEI',
        fast: result.fast.gasPriceGwei + ' GWEI',
        congestion: this.networkCongestion,
        epoch: this.validatorEpoch
      });
      
      return result;
      
    } catch (error) {
      console.error('Failed to get BSC fee recommendations:', error);
      return this._getFallbackBSCRecommendations();
    }
  }
  
  /**
   * Estimates BSC transaction time based on gas price
   * @private
   */
  _estimateBSCTransactionTime(gasPrice) {
    const baseTime = this.config.blockTime * this.config.confirmations; // 3 blocks * 3 seconds
    const congestionMultiplier = this.networkCongestion === 'high' ? 1.5 : 
                                this.networkCongestion === 'medium' ? 1.2 : 1.0;
    
    // Estimate based on gas price competitiveness
    let gasPriceMultiplier = 1.0;
    const currentBaseFee = this.gasHistory.length > 0 
      ? this.gasHistory[this.gasHistory.length - 1].gasPrice
      : this.config.defaultGasPrice;
      
    const gasPriceRatio = Number(gasPrice) / Number(currentBaseFee);
    
    if (gasPriceRatio >= 1.5) {
      gasPriceMultiplier = 0.8; // 20% faster
    } else if (gasPriceRatio >= 1.2) {
      gasPriceMultiplier = 0.9; // 10% faster
    } else if (gasPriceRatio < 0.8) {
      gasPriceMultiplier = 1.3; // 30% slower
    }
    
    return Math.round((baseTime * congestionMultiplier * gasPriceMultiplier) / 1000);
  }
  
  /**
   * Adjusts recommendations based on network congestion
   * @private
   */
  _adjustRecommendationsForCongestion(recommendations) {
    switch (this.networkCongestion) {
      case 'high':
        // Increase all prices during high congestion
        recommendations.safeLow.gasPrice = recommendations.safeLow.gasPrice * 120n / 100n;
        recommendations.standard.gasPrice = recommendations.standard.gasPrice * 130n / 100n;
        recommendations.fast.gasPrice = recommendations.fast.gasPrice * 150n / 100n;
        
        // Update descriptions
        recommendations.safeLow.description += ' (network congestion detected)';
        recommendations.standard.description += ' (adjusted for congestion)';
        recommendations.fast.description += ' (recommended due to congestion)';
        break;
        
      case 'medium':
        // Moderate increases
        recommendations.standard.gasPrice = recommendations.standard.gasPrice * 110n / 100n;
        recommendations.fast.gasPrice = recommendations.fast.gasPrice * 125n / 100n;
        break;
    }
    
    // Update formatted prices
    Object.keys(recommendations).forEach(tier => {
      if (recommendations[tier].gasPrice) {
        recommendations[tier].gasPriceGwei = this._formatGasPrice(recommendations[tier].gasPrice);
        recommendations[tier].estimatedTime = this._estimateBSCTransactionTime(recommendations[tier].gasPrice);
      }
    });
  }
  
  /**
   * Returns fallback recommendations when calculation fails
   * @private
   */
  _getFallbackBSCRecommendations() {
    return {
      safeLow: {
        priority: 'safeLow',
        description: 'Most economical option (fallback pricing)',
        gasPrice: this.config.minGasPrice,
        gasPriceGwei: this._formatGasPrice(this.config.minGasPrice),
        estimatedTime: 12,
        confidence: 'low',
        type: 0,
        savingsVsStandard: 40
      },
      
      standard: {
        priority: 'standard',
        description: 'Balanced speed and cost (fallback pricing)',
        gasPrice: this.config.defaultGasPrice,
        gasPriceGwei: this._formatGasPrice(this.config.defaultGasPrice),
        estimatedTime: 9,
        confidence: 'medium',
        type: 0,
        savingsVsStandard: 0
      },
      
      fast: {
        priority: 'fast',
        description: 'Fastest confirmation (fallback pricing)',
        gasPrice: this.config.defaultGasPrice * 2n,
        gasPriceGwei: this._formatGasPrice(this.config.defaultGasPrice * 2n),
        estimatedTime: 6,
        confidence: 'medium',
        type: 0,
        savingsVsStandard: -100
      },
      
      metadata: {
        timestamp: Date.now(),
        network: 'bsc',
        currency: 'BNB',
        validatorEpoch: this.validatorEpoch,
        isFallback: true,
        supportEIP1559: false,
        lastUpdated: new Date().toISOString()
      }
    };
  }
  
  /**
   * Clears BSC gas estimation cache
   * @public
   */
  clearGasCache() {
    const size = this.gasCache.size;
    this.gasCache.clear();
    console.log(`Cleared ${size} BSC gas cache entries`);
    return size;
  }
  
  /**
   * Gets current validator information
   * @public
   */
  getValidatorInfo() {
    return {
      ...this.validatorInfo,
      nextRotationBlock: (this.validatorEpoch + 1) * this.validatorRotationBlocks,
      blocksUntilRotation: ((this.validatorEpoch + 1) * this.validatorRotationBlocks) - 
                          (this.validatorInfo?.lastUpdate ? 
                           Math.floor(this.validatorInfo.lastUpdate / this.config.blockTime) : 0),
      estimatedRotationTime: Date.now() + 
                           (((this.validatorEpoch + 1) * this.validatorRotationBlocks) - 
                            (this.validatorInfo?.lastUpdate ? 
                             Math.floor(this.validatorInfo.lastUpdate / this.config.blockTime) : 0)) * 
                           this.config.blockTime
    };
  }
  
  /**
   * Gets enhanced statistics with BSC-specific metrics
   * @public
   */
  getStats() {
    const baseStats = super.getStats();
    const avgGasPrice = this.gasHistory.length > 0
      ? this.gasHistory.reduce((sum, entry) => sum + Number(entry.gasPrice || 0), 0) / this.gasHistory.length
      : 0;
    
    return {
      ...baseStats,
      network: 'bsc',
      currency: 'BNB',
      isBSC: true,
      chainId: this.networkInfo?.chainId,
      validatorEpoch: this.validatorEpoch,
      networkCongestion: this.networkCongestion,
      gasCacheSize: this.gasCache.size,
      averageGasPrice: this._formatGasPrice(Math.floor(avgGasPrice)),
      mevProtectionEnabled: this.enableMEVProtection,
      
      // BSC-specific metrics
      bscMetrics: {
        validatorRotations: Math.max(0, this.validatorEpoch),
        avgConfirmationTime: this.config.blockTime * this.config.confirmations,
        consensusEngine: 'parlia',
        crossChainSupport: this.config.supportsCrossChain
      },
      
      // Validator system status
      validatorSystem: this.getValidatorInfo(),
      networkInfo: this.networkInfo
    };
  }
  
  /**
   * Forces refresh of BSC network conditions
   * @public
   */
  async refreshNetworkConditions() {
    try {
      console.log('Refreshing BSC network conditions...');
      
      // Clear cache
      this.clearGasCache();
      
      // Update gas tracking
      await this._initializeBSCGasTracking();
      
      // Update validator info
      const currentBlock = await this.provider.getBlockNumber();
      await this._updateValidatorEpoch(currentBlock);
      
      console.log(`BSC network conditions refreshed. Congestion: ${this.networkCongestion}, Epoch: ${this.validatorEpoch}`);
      
      /**
       * Network refreshed event
       * @event BSCBroadcaster#network-refreshed
       * @type {Object}
       * @property {string} congestionLevel - Current congestion level
       * @property {number} validatorEpoch - Current validator epoch
       * @property {number} currentBlock - Latest block number
       * @property {number} timestamp - When refresh completed
       */
      this.emit('network-refreshed', {
        congestionLevel: this.networkCongestion,
        validatorEpoch: this.validatorEpoch,
        currentBlock,
        timestamp: Date.now()
      });
      
      return {
        congestion: this.networkCongestion,
        validatorEpoch: this.validatorEpoch,
        gasHistory: this.gasHistory.slice(-3)
      };
      
    } catch (error) {
      console.error('Failed to refresh BSC network conditions:', error);
      throw new Error(`BSC network refresh failed: ${error.message}`);
    }
  }
  
  /**
   * Graceful shutdown with BSC-specific cleanup
   * @public
   */
  async shutdown() {
    console.log('Shutting down BSCBroadcaster...');
    
    const finalStats = await super.shutdown();
    
    // Clear BSC-specific data
    this.clearGasCache();
    this.gasHistory = [];
    
    console.log('BSCBroadcaster shutdown complete');
    return {
      ...finalStats,
      bscSpecific: {
        finalValidatorEpoch: this.validatorEpoch,
        finalCongestionLevel: this.networkCongestion,
        cacheCleared: true,
        historyCleared: true
      }
    };
  }
}
