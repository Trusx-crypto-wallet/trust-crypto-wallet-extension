/**
 * AvalancheBroadcaster.js
 * 
 * Avalanche C-Chain specific transaction broadcaster implementation with
 * fast finality, dynamic gas fee handling, and AVAX-specific transaction
 * optimizations for efficient C-Chain operations.
 * 
 * @author Trust Crypto Wallet Extension
 * @version 1.0.0
 */

import { ethers } from 'ethers';
import BaseBroadcaster from './BaseBroadcaster.js';

/**
 * Avalanche-specific error codes and messages
 */
const AVALANCHE_ERROR_CODES = {
  INSUFFICIENT_AVAX: 'INSUFFICIENT_AVAX',
  GAS_PRICE_TOO_LOW: 'GAS_PRICE_TOO_LOW',
  DYNAMIC_FEE_TOO_LOW: 'DYNAMIC_FEE_TOO_LOW',
  NONCE_TOO_LOW: 'NONCE_TOO_LOW',
  NETWORK_CONGESTION: 'NETWORK_CONGESTION',
  VALIDATOR_ERROR: 'VALIDATOR_ERROR',
  SUBNET_ERROR: 'SUBNET_ERROR',
  CONSENSUS_ERROR: 'CONSENSUS_ERROR',
  INVALID_C_CHAIN_TX: 'INVALID_C_CHAIN_TX',
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT: 'TIMEOUT',
  SNOWMAN_ERROR: 'SNOWMAN_ERROR'
};

/**
 * Default Avalanche C-Chain configuration
 */
const DEFAULT_AVALANCHE_CONFIG = {
  network: 'avalanche',
  timeout: 90000, // 1.5 minutes (fast finality)
  confirmations: 1, // Fast finality on Avalanche
  gasMultiplier: 1.15, // Slightly higher for dynamic fees
  blockTime: 2000, // ~2 seconds average block time
  
  // Avalanche C-Chain gas configuration
  minGasPrice: ethers.parseUnits('25', 'gwei'), // 25 Gwei minimum (Avalanche standard)
  maxGasPrice: ethers.parseUnits('1000', 'gwei'), // 1000 Gwei maximum
  defaultGasPrice: ethers.parseUnits('50', 'gwei'), // 50 Gwei default
  maxGasLimit: 15000000, // 15M gas limit
  
  // Dynamic fee configuration
  baseFeeMultiplier: 1.25, // More aggressive for faster inclusion
  maxDynamicFeePerGas: ethers.parseUnits('200', 'gwei'),
  maxPriorityFeePerGas: ethers.parseUnits('10', 'gwei'),
  
  // Avalanche-specific features
  enableDynamicFees: true,
  supportsFastFinality: true,
  cChainId: 43114, // Avalanche C-Chain mainnet
  fujiChainId: 43113, // Avalanche Fuji testnet
  avalancheFeatures: true
};

/**
 * AvalancheBroadcaster - Avalanche C-Chain specific transaction broadcaster
 * 
 * Handles Avalanche C-Chain transaction broadcasting with fast finality,
 * dynamic gas fee optimization, and AVAX-specific transaction handling
 * for efficient operations on the Avalanche network.
 * 
 * @class AvalancheBroadcaster
 * @extends BaseBroadcaster
 * @example
 * const provider = new ethers.JsonRpcProvider('https://api.avax.network/ext/bc/C/rpc');
 * const broadcaster = new AvalancheBroadcaster(provider, {
 *   network: 'avalanche',
 *   confirmations: 1,
 *   enableDynamicFees: true
 * });
 * 
 * broadcaster.on('transaction-sent', ({ txHash, dynamicFee }) => {
 *   console.log(`Avalanche tx: ${txHash} (Dynamic Fee: ${dynamicFee} GWEI)`);
 * });
 * 
 * const txHash = await broadcaster.broadcast({
 *   to: '0x742dFfdf2c6c8D4B93067782b1e7A38754b8c7b3',
 *   value: ethers.parseEther('1.5'), // 1.5 AVAX
 *   data: '0x'
 * });
 */
export default class AvalancheBroadcaster extends BaseBroadcaster {
  /**
   * Creates a new AvalancheBroadcaster instance
   * 
   * Initializes the broadcaster with Avalanche C-Chain specific configuration
   * including fast finality, dynamic fees, and AVAX network optimizations.
   * 
   * @constructor
   * @param {ethers.Provider} provider - Ethers.js provider for Avalanche C-Chain
   * @param {Object} [options={}] - Avalanche-specific configuration options
   * @param {string} [options.network='avalanche'] - Network name (avalanche, fuji, etc.)
   * @param {number} [options.timeout=90000] - Transaction timeout in milliseconds (1.5 minutes)
   * @param {number} [options.confirmations=1] - Number of confirmations (fast finality)
   * @param {number} [options.gasMultiplier=1.15] - Gas estimation safety multiplier
   * @param {BigNumber} [options.minGasPrice] - Minimum gas price in wei (25 Gwei default)
   * @param {BigNumber} [options.maxGasPrice] - Maximum gas price in wei (1000 Gwei default)
   * @param {BigNumber} [options.defaultGasPrice] - Default gas price when estimation fails
   * @param {number} [options.maxGasLimit=15000000] - Maximum gas limit for transactions
   * @param {boolean} [options.enableDynamicFees=true] - Enable dynamic fee structure
   * @param {number} [options.baseFeeMultiplier=1.25] - Base fee multiplier for dynamic fees
   * @param {number} [options.cChainId=43114] - C-Chain ID (43114 for mainnet)
   * 
   * @throws {TypeError} If provider is not compatible with Avalanche
   * @throws {Error} If network configuration is invalid for Avalanche
   * 
   * @example
   * const broadcaster = new AvalancheBroadcaster(provider, {
   *   network: 'avalanche',
   *   confirmations: 1,
   *   gasMultiplier: 1.2,
   *   enableDynamicFees: true,
   *   minGasPrice: ethers.parseUnits('30', 'gwei')
   * });
   */
  constructor(provider, options = {}) {
    // Validate provider for Avalanche compatibility
    if (!provider || typeof provider.sendTransaction !== 'function') {
      throw new TypeError('Provider must be a valid ethers provider compatible with Avalanche C-Chain');
    }
    
    // Merge with Avalanche defaults
    const config = {
      ...DEFAULT_AVALANCHE_CONFIG,
      ...options
    };
    
    super(provider, config);
    
    // Avalanche-specific properties
    this.enableDynamicFees = config.enableDynamicFees;
    this.baseFeeMultiplier = config.baseFeeMultiplier;
    this.cChainId = config.cChainId;
    this.fujiChainId = config.fujiChainId;
    this.gasCache = new Map();
    this.networkInfo = null;
    this.validatorInfo = null;
    
    // Avalanche fee tracking
    this.baseFeeHistory = [];
    this.priorityFeeHistory = [];
    this.networkCongestionLevel = 'normal';
    
    console.log(`AvalancheBroadcaster initialized for ${this.config.network} network`);
  }
  
  /**
   * Initializes Avalanche-specific broadcaster features
   * 
   * @public
   * @method initialize
   * @returns {Promise<void>} Resolves when initialization is complete
   */
  async initialize() {
    await super.initialize();
    
    try {
      // Detect and validate Avalanche network
      await this._detectAvalancheNetwork();
      
      // Initialize dynamic fee tracking
      await this._initializeDynamicFeeTracking();
      
      // Initialize network congestion monitoring
      await this._initializeNetworkMonitoring();
      
      console.log(`AvalancheBroadcaster initialized successfully for ${this.networkInfo?.name || 'unknown'} network`);
      
    } catch (error) {
      console.error('Failed to initialize AvalancheBroadcaster:', error);
      throw new Error(`Avalanche broadcaster initialization failed: ${error.message}`);
    }
  }
  
  /**
   * Detects and validates Avalanche network connection
   * @private
   */
  async _detectAvalancheNetwork() {
    try {
      const network = await this.provider.getNetwork();
      const chainId = Number(network.chainId);
      
      // Validate Avalanche chain IDs
      const validChainIds = {
        43114: 'avalanche-mainnet',
        43113: 'avalanche-fuji'
      };
      
      if (!validChainIds[chainId]) {
        console.warn(`Warning: Unrecognized Avalanche chain ID: ${chainId}`);
      }
      
      this.networkInfo = {
        name: validChainIds[chainId] || `avalanche-${chainId}`,
        chainId,
        isAvalanche: true,
        isCChain: true,
        isTestnet: chainId !== 43114,
        supportsFastFinality: true,
        supportsSnowmanConsensus: true
      };
      
      console.log(`Connected to Avalanche network: ${this.networkInfo.name} (Chain ID: ${chainId})`);
      
    } catch (error) {
      console.warn('Could not detect Avalanche network:', error.message);
    }
  }
  
  /**
   * Initializes dynamic fee tracking for Avalanche
   * @private
   */
  async _initializeDynamicFeeTracking() {
    try {
      // Get initial fee data
      const feeData = await this.provider.getFeeData();
      
      this.baseFeeHistory.push({
        timestamp: Date.now(),
        baseFee: feeData.gasPrice,
        maxFeePerGas: feeData.maxFeePerGas,
        maxPriorityFeePerGas: feeData.maxPriorityFeePerGas
      });
      
      console.log('Avalanche dynamic fee tracking initialized');
      
    } catch (error) {
      console.warn('Could not initialize dynamic fee tracking:', error.message);
    }
  }
  
  /**
   * Initializes network congestion monitoring
   * @private
   */
  async _initializeNetworkMonitoring() {
    try {
      // Get current block to establish baseline
      const currentBlock = await this.provider.getBlockNumber();
      
      this.validatorInfo = {
        lastBlock: currentBlock,
        isHealthy: true,
        lastUpdate: Date.now(),
        consensusEngine: 'snowman'
      };
      
      console.log('Avalanche network monitoring initialized');
      
    } catch (error) {
      console.warn('Could not initialize network monitoring:', error.message);
    }
  }
  
  /**
   * Sends raw transaction to Avalanche C-Chain with 1 block confirmation
   * 
   * @protected
   * @method _sendRawTransaction
   * @param {Object} txData - Formatted Avalanche transaction data
   * @returns {Promise<string>} Transaction hash after confirmation
   */
  async _sendRawTransaction(txData) {
    try {
      console.log('Sending Avalanche C-Chain transaction:', {
        to: txData.to,
        value: txData.value?.toString(),
        gasLimit: txData.gasLimit?.toString(),
        gasPrice: txData.gasPrice?.toString(),
        maxFeePerGas: txData.maxFeePerGas?.toString(),
        maxPriorityFeePerGas: txData.maxPriorityFeePerGas?.toString(),
        nonce: txData.nonce,
        type: txData.type
      });
      
      // Send transaction to Avalanche C-Chain
      const txResponse = await this.provider.sendTransaction(txData);
      const txHash = txResponse.hash;
      
      console.log(`Avalanche C-Chain transaction sent: ${txHash}`);
      
      /**
       * Transaction sent event
       * @event AvalancheBroadcaster#transaction-sent
       * @type {Object}
       * @property {string} txHash - Transaction hash
       * @property {Object} txData - Transaction data
       * @property {string} network - Avalanche network name
       * @property {boolean} isCChain - Always true for C-Chain
       * @property {number} gasLimit - Gas limit used
       * @property {string} dynamicFee - Dynamic fee used (if applicable)
       * @property {string} congestionLevel - Current network congestion level
       */
      this.emit('transaction-sent', {
        txHash,
        txData,
        network: this.config.network,
        isCChain: true,
        gasLimit: txData.gasLimit?.toString(),
        dynamicFee: this._formatGasPrice(txData.maxFeePerGas || txData.gasPrice),
        congestionLevel: this.networkCongestionLevel
      });
      
      // Wait for fast finality (1 block)
      if (this.config.confirmations > 0) {
        console.log(`Waiting for ${this.config.confirmations} Avalanche confirmation(s)...`);
        
        const receipt = await txResponse.wait(this.config.confirmations);
        
        if (receipt.status === 0) {
          throw new Error('Avalanche C-Chain transaction was reverted');
        }
        
        this.stats.successfulTransactions++;
        this.stats.totalGasUsed += receipt.gasUsed;
        
        // Update network congestion based on gas used vs estimated
        this._updateNetworkCongestion(receipt);
        
        /**
         * Transaction confirmed event
         * @event AvalancheBroadcaster#transaction-confirmed
         * @type {Object}
         * @property {string} txHash - Transaction hash
         * @property {Object} receipt - Transaction receipt
         * @property {number} confirmations - Number of confirmations
         * @property {string} gasUsed - Actual gas used
         * @property {number} blockNumber - Block number
         * @property {boolean} isCChain - Always true for C-Chain
         * @property {number} finalityTime - Time to finality in milliseconds
         */
        this.emit('transaction-confirmed', {
          txHash,
          receipt,
          confirmations: this.config.confirmations,
          gasUsed: receipt.gasUsed.toString(),
          blockNumber: receipt.blockNumber,
          isCChain: true,
          finalityTime: Date.now() - txResponse.timestamp * 1000
        });
        
        console.log(`Avalanche C-Chain transaction confirmed: ${txHash} (Gas used: ${receipt.gasUsed}, Block: ${receipt.blockNumber})`);
      }
      
      return txHash;
      
    } catch (error) {
      throw this._enhanceAvalancheError(error);
    }
  }
  
  /**
   * Estimates gas for Avalanche C-Chain transactions with dynamic fee optimization
   * 
   * @public
   * @method estimateGas
   * @param {Object} txData - Transaction data for estimation
   * @returns {Promise<Object>} Comprehensive gas estimation for Avalanche
   * 
   * @example
   * const gasEstimate = await broadcaster.estimateGas({
   *   to: '0x742dFfdf2c6c8D4B93067782b1e7A38754b8c7b3',
   *   value: ethers.parseEther('1.5'),
   *   from: '0x8ba1f109551bD432803012645Hac136c'
   * });
   * 
   * console.log(`Gas limit: ${gasEstimate.gasLimit}`);
   * console.log(`Dynamic fee: ${gasEstimate.maxFeePerGas} GWEI`);
   */
  async estimateGas(txData) {
    try {
      // Create cache key for Avalanche transactions
      const cacheKey = this._createAvalancheGasCacheKey(txData);
      
      // Check cache (shorter TTL for fast network)
      if (this.gasCache.has(cacheKey)) {
        const cached = this.gasCache.get(cacheKey);
        if (Date.now() - cached.timestamp < 10000) { // 10 second cache
          console.log('Using cached Avalanche gas estimate');
          return cached.estimate;
        }
      }
      
      // Estimate gas limit using parent method
      const gasLimit = await super.estimateGas(txData);
      const safeGasLimit = Math.floor(Number(gasLimit) * this.config.gasMultiplier);
      
      // Get Avalanche-optimized fee data
      const feeData = await this._getAvalancheFeeData();
      
      let gasEstimate;
      
      if (this.enableDynamicFees && feeData.maxFeePerGas) {
        // Dynamic fee estimation for Avalanche
        gasEstimate = {
          gasLimit: safeGasLimit,
          maxFeePerGas: feeData.maxFeePerGas.toString(),
          maxPriorityFeePerGas: feeData.maxPriorityFeePerGas.toString(),
          baseFee: feeData.baseFee?.toString(),
          type: 2,
          network: 'avalanche',
          isDynamic: true,
          congestionLevel: this.networkCongestionLevel
        };
      } else {
        // Legacy gas price for Avalanche
        gasEstimate = {
          gasLimit: safeGasLimit,
          gasPrice: feeData.gasPrice.toString(),
          type: 0,
          network: 'avalanche',
          isDynamic: false,
          congestionLevel: this.networkCongestionLevel
        };
      }
      
      // Validate against Avalanche limits
      this._validateAvalancheGasEstimate(gasEstimate);
      
      // Cache the estimate
      this.gasCache.set(cacheKey, {
        estimate: gasEstimate,
        timestamp: Date.now()
      });
      
      console.log('Avalanche gas estimation completed:', gasEstimate);
      return gasEstimate;
      
    } catch (error) {
      throw this._enhanceAvalancheError(error, 'Avalanche gas estimation failed');
    }
  }
  
  /**
   * Gets optimized fee data for Avalanche C-Chain with dynamic pricing
   * @private
   */
  async _getAvalancheFeeData() {
    try {
      const feeData = await this.provider.getFeeData();
      
      // Update fee history
      this.baseFeeHistory.push({
        timestamp: Date.now(),
        baseFee: feeData.gasPrice,
        maxFeePerGas: feeData.maxFeePerGas,
        maxPriorityFeePerGas: feeData.maxPriorityFeePerGas
      });
      
      // Keep recent history (last 10 entries)
      if (this.baseFeeHistory.length > 10) {
        this.baseFeeHistory = this.baseFeeHistory.slice(-10);
      }
      
      // Apply Avalanche-specific optimizations
      if (this.enableDynamicFees && feeData.maxFeePerGas) {
        // Calculate optimized dynamic fees
        const baseFee = feeData.gasPrice || this.config.defaultGasPrice;
        const congestionMultiplier = this._getCongestionMultiplier();
        
        const optimizedMaxFee = baseFee * BigInt(Math.floor(this.baseFeeMultiplier * congestionMultiplier * 100)) / 100n;
        const optimizedPriorityFee = feeData.maxPriorityFeePerGas || this.config.maxPriorityFeePerGas;
        
        return {
          gasPrice: baseFee,
          baseFee,
          maxFeePerGas: optimizedMaxFee,
          maxPriorityFeePerGas: optimizedPriorityFee
        };
      } else {
        // Fallback to standard gas price with congestion adjustment
        const gasPrice = feeData.gasPrice || this.config.defaultGasPrice;
        const minGasPrice = this.config.minGasPrice;
        const congestionMultiplier = this._getCongestionMultiplier();
        
        const adjustedGasPrice = gasPrice * BigInt(Math.floor(congestionMultiplier * 100)) / 100n;
        
        return {
          gasPrice: adjustedGasPrice > minGasPrice ? adjustedGasPrice : minGasPrice,
          baseFee: gasPrice,
          maxFeePerGas: null,
          maxPriorityFeePerGas: null
        };
      }
      
    } catch (error) {
      console.warn('Failed to get Avalanche fee data, using defaults:', error.message);
      
      return {
        gasPrice: this.config.defaultGasPrice,
        baseFee: this.config.defaultGasPrice,
        maxFeePerGas: this.config.maxDynamicFeePerGas,
        maxPriorityFeePerGas: this.config.maxPriorityFeePerGas
      };
    }
  }
  
  /**
   * Gets congestion multiplier based on current network conditions
   * @private
   */
  _getCongestionMultiplier() {
    switch (this.networkCongestionLevel) {
      case 'low':
        return 1.0;
      case 'normal':
        return 1.1;
      case 'high':
        return 1.3;
      case 'extreme':
        return 1.5;
      default:
        return 1.1;
    }
  }
  
  /**
   * Updates network congestion level based on transaction results
   * @private
   */
  _updateNetworkCongestion(receipt) {
    try {
      // Simple congestion detection based on gas used vs block gas limit
      const gasUsedRatio = Number(receipt.gasUsed) / Number(receipt.gasLimit || 15000000);
      
      if (gasUsedRatio > 0.9) {
        this.networkCongestionLevel = 'extreme';
      } else if (gasUsedRatio > 0.7) {
        this.networkCongestionLevel = 'high';
      } else if (gasUsedRatio > 0.4) {
        this.networkCongestionLevel = 'normal';
      } else {
        this.networkCongestionLevel = 'low';
      }
      
      console.log(`Network congestion updated: ${this.networkCongestionLevel} (gas ratio: ${gasUsedRatio.toFixed(2)})`);
      
    } catch (error) {
      console.warn('Could not update network congestion:', error.message);
    }
  }
  
  /**
   * Validates gas estimate against Avalanche limits
   * @private
   */
  _validateAvalancheGasEstimate(gasEstimate) {
    if (gasEstimate.gasLimit > this.config.maxGasLimit) {
      throw new Error(`Avalanche gas limit ${gasEstimate.gasLimit} exceeds maximum ${this.config.maxGasLimit}`);
    }
    
    const gasPrice = gasEstimate.gasPrice || gasEstimate.maxFeePerGas;
    if (gasPrice && BigInt(gasPrice) > this.config.maxGasPrice) {
      throw new Error(`Avalanche gas price ${gasPrice} exceeds maximum ${this.config.maxGasPrice}`);
    }
    
    if (gasPrice && BigInt(gasPrice) < this.config.minGasPrice) {
      throw new Error(`Avalanche gas price ${gasPrice} below minimum ${this.config.minGasPrice}`);
    }
    
    if (gasEstimate.maxFeePerGas && BigInt(gasEstimate.maxFeePerGas) > this.config.maxDynamicFeePerGas) {
      throw new Error(`Avalanche max fee per gas ${gasEstimate.maxFeePerGas} exceeds maximum ${this.config.maxDynamicFeePerGas}`);
    }
  }
  
  /**
   * Creates cache key for Avalanche gas estimation
   * @private
   */
  _createAvalancheGasCacheKey(txData) {
    const key = `avalanche-${txData.to}-${txData.value || '0'}-${txData.data || '0x'}-${txData.from || 'unknown'}-${this.networkCongestionLevel}`;
    return key.toLowerCase();
  }
  
  /**
   * Enhances errors with Avalanche-specific context
   * @private
   */
  _enhanceAvalancheError(error, context = '') {
    const message = error.message || error.toString();
    const lowerMessage = message.toLowerCase();
    
    let errorCode = AVALANCHE_ERROR_CODES.NETWORK_ERROR;
    let enhancedMessage = message;
    
    // Categorize Avalanche-specific errors
    if (lowerMessage.includes('insufficient funds')) {
      errorCode = AVALANCHE_ERROR_CODES.INSUFFICIENT_AVAX;
      enhancedMessage = 'Insufficient AVAX balance for transaction (including gas costs)';
    } else if (lowerMessage.includes('nonce too low')) {
      errorCode = AVALANCHE_ERROR_CODES.NONCE_TOO_LOW;
      enhancedMessage = 'Transaction nonce too low for Avalanche C-Chain (transaction may have been replaced)';
    } else if (lowerMessage.includes('gas price too low') || lowerMessage.includes('transaction underpriced')) {
      errorCode = AVALANCHE_ERROR_CODES.GAS_PRICE_TOO_LOW;
      enhancedMessage = `Avalanche gas price too low (minimum: ${this._formatGasPrice(this.config.minGasPrice)} GWEI)`;
    } else if (lowerMessage.includes('dynamic fee') || lowerMessage.includes('base fee')) {
      errorCode = AVALANCHE_ERROR_CODES.DYNAMIC_FEE_TOO_LOW;
      enhancedMessage = 'Avalanche dynamic fee too low for current network conditions';
    } else if (lowerMessage.includes('validator') || lowerMessage.includes('staking')) {
      errorCode = AVALANCHE_ERROR_CODES.VALIDATOR_ERROR;
      enhancedMessage = 'Avalanche validator error - please try again';
    } else if (lowerMessage.includes('subnet')) {
      errorCode = AVALANCHE_ERROR_CODES.SUBNET_ERROR;
      enhancedMessage = 'Avalanche subnet error - check network configuration';
    } else if (lowerMessage.includes('consensus') || lowerMessage.includes('snowman')) {
      errorCode = AVALANCHE_ERROR_CODES.CONSENSUS_ERROR;
      enhancedMessage = 'Avalanche consensus error - transaction may be delayed';
    } else if (lowerMessage.includes('congestion') || lowerMessage.includes('busy')) {
      errorCode = AVALANCHE_ERROR_CODES.NETWORK_CONGESTION;
      enhancedMessage = 'Avalanche network congestion - consider increasing gas price';
    } else if (lowerMessage.includes('timeout')) {
      errorCode = AVALANCHE_ERROR_CODES.TIMEOUT;
      enhancedMessage = 'Avalanche transaction timed out';
    }
    
    const enhancedError = new Error(`${context ? context + ': ' : ''}${enhancedMessage}`);
    enhancedError.code = errorCode;
    enhancedError.originalError = error;
    enhancedError.network = 'avalanche';
    enhancedError.isCChain = true;
    enhancedError.chainId = this.networkInfo?.chainId;
    enhancedError.congestionLevel = this.networkCongestionLevel;
    
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
   * Validates Avalanche-specific transaction data
   * @protected
   */
  validateTransactionData(txData) {
    // Call parent validation
    super.validateTransactionData(txData);
    
    // Avalanche-specific validations
    if (txData.gasLimit && (txData.gasLimit < 21000 || txData.gasLimit > this.config.maxGasLimit)) {
      throw new Error(`Avalanche gas limit must be between 21000 and ${this.config.maxGasLimit}`);
    }
    
    if (txData.gasPrice) {
      const gasPrice = BigInt(txData.gasPrice);
      if (gasPrice > this.config.maxGasPrice) {
        throw new Error(`Avalanche gas price exceeds maximum: ${this._formatGasPrice(this.config.maxGasPrice)} GWEI`);
      }
      if (gasPrice < this.config.minGasPrice) {
        throw new Error(`Avalanche gas price below minimum: ${this._formatGasPrice(this.config.minGasPrice)} GWEI`);
      }
    }
    
    // Dynamic fee validations for Avalanche
    if (txData.maxFeePerGas && txData.maxPriorityFeePerGas) {
      if (BigInt(txData.maxPriorityFeePerGas) > BigInt(txData.maxFeePerGas)) {
        throw new Error('Avalanche maxPriorityFeePerGas cannot exceed maxFeePerGas');
      }
    }
  }
  
  /**
   * Gets Avalanche network-specific information
   * @public
   */
  getNetworkInfo() {
    return {
      ...this.networkInfo,
      enableDynamicFees: this.enableDynamicFees,
      baseFeeMultiplier: this.baseFeeMultiplier,
      validatorInfo: this.validatorInfo,
      cChainId: this.cChainId,
      fujiChainId: this.fujiChainId,
      congestionLevel: this.networkCongestionLevel,
      gasConfiguration: {
        minGasPrice: this._formatGasPrice(this.config.minGasPrice),
        maxGasPrice: this._formatGasPrice(this.config.maxGasPrice),
        defaultGasPrice: this._formatGasPrice(this.config.defaultGasPrice)
      },
      gasCache: {
        size: this.gasCache.size,
        enabled: true,
        ttl: '10 seconds'
      },
      feeHistory: {
        baseFeeEntries: this.baseFeeHistory.length,
        priorityFeeEntries: this.priorityFeeHistory.length
      }
    };
  }
  
  /**
   * Clears Avalanche gas estimation cache
   * @public
   */
  clearGasCache() {
    const size = this.gasCache.size;
    this.gasCache.clear();
    console.log(`Cleared ${size} Avalanche gas cache entries`);
    return size;
  }
  
  /**
   * Updates network congestion level manually
   * @public
   */
  setNetworkCongestion(level) {
    const validLevels = ['low', 'normal', 'high', 'extreme'];
    if (!validLevels.includes(level)) {
      throw new Error(`Invalid congestion level. Must be one of: ${validLevels.join(', ')}`);
    }
    
    const previousLevel = this.networkCongestionLevel;
    this.networkCongestionLevel = level;
    
    console.log(`Network congestion manually updated from ${previousLevel} to ${level}`);
    
    /**
     * Congestion level changed event
     * @event AvalancheBroadcaster#congestion-changed
     * @type {Object}
     * @property {string} previousLevel - Previous congestion level
     * @property {string} newLevel - New congestion level
     * @property {number} timestamp - When the change occurred
     * @property {boolean} isManual - Whether change was manual or automatic
     */
    this.emit('congestion-changed', {
      previousLevel,
      newLevel: level,
      timestamp: Date.now(),
      isManual: true
    });
    
    // Clear gas cache when congestion changes significantly
    if ((previousLevel === 'low' && level === 'high') || 
        (previousLevel === 'high' && level === 'low')) {
      this.clearGasCache();
    }
    
    return level;
  }
  
  /**
   * Gets current network congestion level
   * @public
   */
  getNetworkCongestion() {
    return {
      level: this.networkCongestionLevel,
      multiplier: this._getCongestionMultiplier(),
      timestamp: Date.now(),
      baseFeeHistory: this.baseFeeHistory.slice(-3) // Last 3 entries
    };
  }
  
  /**
   * Estimates transaction time based on current network conditions
   * @public
   */
  estimateTransactionTime(gasPrice) {
    try {
      const baseTime = this.config.blockTime; // ~2 seconds
      const congestionMultiplier = this._getCongestionMultiplier();
      
      // Estimate based on gas price competitiveness
      let gasPriceMultiplier = 1.0;
      if (gasPrice) {
        const currentGasPrice = this.baseFeeHistory.length > 0 
          ? this.baseFeeHistory[this.baseFeeHistory.length - 1].baseFee
          : this.config.defaultGasPrice;
          
        const gasPriceRatio = Number(gasPrice) / Number(currentGasPrice);
        
        if (gasPriceRatio >= 1.5) {
          gasPriceMultiplier = 0.8; // 20% faster
        } else if (gasPriceRatio >= 1.2) {
          gasPriceMultiplier = 0.9; // 10% faster
        } else if (gasPriceRatio < 0.8) {
          gasPriceMultiplier = 1.5; // 50% slower
        }
      }
      
      const estimatedTime = baseTime * congestionMultiplier * gasPriceMultiplier;
      
      return {
        estimatedSeconds: Math.round(estimatedTime / 1000),
        estimatedBlocks: 1, // Avalanche typically confirms in 1 block
        confidence: this.networkCongestionLevel === 'normal' ? 'high' : 'medium',
        factors: {
          baseBlockTime: baseTime,
          congestionMultiplier,
          gasPriceMultiplier,
          congestionLevel: this.networkCongestionLevel
        }
      };
      
    } catch (error) {
      console.warn('Could not estimate transaction time:', error.message);
      return {
        estimatedSeconds: 2,
        estimatedBlocks: 1,
        confidence: 'low',
        factors: null
      };
    }
  }
  
  /**
   * Gets enhanced statistics with Avalanche-specific metrics
   * @public
   */
  getStats() {
    const baseStats = super.getStats();
    const avgBaseFee = this.baseFeeHistory.length > 0
      ? this.baseFeeHistory.reduce((sum, entry) => sum + Number(entry.baseFee || 0), 0) / this.baseFeeHistory.length
      : 0;
    
    const avgFinalizationTime = this.stats.successfulTransactions > 0
      ? this.config.blockTime * this.stats.successfulTransactions / this.stats.successfulTransactions // Simplified
      : this.config.blockTime;
    
    return {
      ...baseStats,
      network: 'avalanche',
      isCChain: true,
      chainId: this.networkInfo?.chainId,
      enableDynamicFees: this.enableDynamicFees,
      congestionLevel: this.networkCongestionLevel,
      gasCacheSize: this.gasCache.size,
      averageBaseFee: this._formatGasPrice(Math.floor(avgBaseFee)),
      averageFinalizationTime: Math.round(avgFinalizationTime),
      networkHealth: {
        validatorStatus: this.validatorInfo?.isHealthy || false,
        lastBlockUpdate: this.validatorInfo?.lastUpdate || 0,
        consensusEngine: 'snowman'
      },
      feeHistorySize: this.baseFeeHistory.length,
      networkInfo: this.networkInfo
    };
  }
  
  /**
   * Forces a refresh of network conditions and fee data
   * @public
   */
  async refreshNetworkConditions() {
    try {
      console.log('Refreshing Avalanche network conditions...');
      
      // Clear existing cache
      this.clearGasCache();
      
      // Refresh fee tracking
      await this._initializeDynamicFeeTracking();
      
      // Update validator info
      const currentBlock = await this.provider.getBlockNumber();
      if (this.validatorInfo) {
        const blockDiff = currentBlock - this.validatorInfo.lastBlock;
        const timeDiff = Date.now() - this.validatorInfo.lastUpdate;
        const expectedBlocks = Math.floor(timeDiff / this.config.blockTime);
        
        // Check if we're missing blocks (potential network issues)
        if (blockDiff < expectedBlocks * 0.8) {
          console.warn('Potential Avalanche network delays detected');
          this.networkCongestionLevel = 'high';
        }
        
        this.validatorInfo.lastBlock = currentBlock;
        this.validatorInfo.lastUpdate = Date.now();
      }
      
      console.log(`Network conditions refreshed. Congestion: ${this.networkCongestionLevel}`);
      
      /**
       * Network refreshed event
       * @event AvalancheBroadcaster#network-refreshed
       * @type {Object}
       * @property {string} congestionLevel - Current congestion level
       * @property {number} currentBlock - Latest block number
       * @property {Object} validatorInfo - Validator status information
       * @property {number} timestamp - When refresh completed
       */
      this.emit('network-refreshed', {
        congestionLevel: this.networkCongestionLevel,
        currentBlock,
        validatorInfo: this.validatorInfo,
        timestamp: Date.now()
      });
      
      return this.getNetworkConditions();
      
    } catch (error) {
      console.error('Failed to refresh network conditions:', error);
      throw new Error(`Network refresh failed: ${error.message}`);
    }
  }
  
  /**
   * Gets comprehensive fee recommendations for different transaction priorities
   * 
   * Provides detailed fee recommendations based on current network conditions,
   * congestion levels, and historical fee data. Useful for UI integration
   * and giving users clear pricing options.
   * 
   * @public
   * @method getFeeRecommendations
   * @returns {Object} Detailed fee recommendations with timing estimates
   * 
   * @example
   * const fees = await broadcaster.getFeeRecommendations();
   * console.log(`Fast: ${fees.fast.gasPrice} GWEI (${fees.fast.estimatedTime}s)`);
   * console.log(`Standard: ${fees.standard.gasPrice} GWEI (${fees.standard.estimatedTime}s)`);
   * console.log(`Safe: ${fees.safeLow.gasPrice} GWEI (${fees.safeLow.estimatedTime}s)`);
   */
  async getFeeRecommendations() {
    try {
      // Get current network fee data
      const currentFeeData = await this._getAvalancheFeeData();
      const congestionMultiplier = this._getCongestionMultiplier();
      const baseFee = currentFeeData.baseFee || this.config.defaultGasPrice;
      
      // Calculate base recommendations
      const baseRecommendations = {
        safeLow: {
          priority: 'safeLow',
          description: 'Most economical option, slower confirmation',
          gasPrice: this.config.minGasPrice,
          estimatedTime: Math.round(this.config.blockTime * 1.5 / 1000), // 1.5x base time
          confidence: 'high',
          savingsVsStandard: 0 // Will be calculated
        },
        
        standard: {
          priority: 'standard',
          description: 'Balanced speed and cost, recommended for most transactions',
          gasPrice: baseFee,
          estimatedTime: Math.round(this.config.blockTime / 1000), // Base block time
          confidence: 'high',
          savingsVsStandard: 0 // Reference point
        },
        
        fast: {
          priority: 'fast',
          description: 'Fastest confirmation, higher cost',
          gasPrice: baseFee * BigInt(Math.floor(congestionMultiplier * 150)) / 100n, // 1.5x congestion
          estimatedTime: Math.round(this.config.blockTime * 0.8 / 1000), // 0.8x base time
          confidence: 'medium',
          savingsVsStandard: 0 // Will be calculated (negative = more expensive)
        }
      };
      
      // Apply dynamic fee structure if enabled
      if (this.enableDynamicFees && currentFeeData.maxFeePerGas) {
        const priorityFee = currentFeeData.maxPriorityFeePerGas || this.config.maxPriorityFeePerGas;
        
        baseRecommendations.safeLow.maxFeePerGas = baseFee + priorityFee / 2n;
        baseRecommendations.safeLow.maxPriorityFeePerGas = priorityFee / 2n;
        baseRecommendations.safeLow.type = 2;
        
        baseRecommendations.standard.maxFeePerGas = currentFeeData.maxFeePerGas;
        baseRecommendations.standard.maxPriorityFeePerGas = priorityFee;
        baseRecommendations.standard.type = 2;
        
        baseRecommendations.fast.maxFeePerGas = currentFeeData.maxFeePerGas * BigInt(150) / 100n;
        baseRecommendations.fast.maxPriorityFeePerGas = priorityFee * BigInt(200) / 100n;
        baseRecommendations.fast.type = 2;
      } else {
        // Legacy gas price mode
        baseRecommendations.safeLow.type = 0;
        baseRecommendations.standard.type = 0;
        baseRecommendations.fast.type = 0;
      }
      
      // Apply network-specific adjustments
      const adjustedRecommendations = this._adjustRecommendationsForNetwork(baseRecommendations);
      
      // Calculate savings percentages
      const standardPrice = Number(adjustedRecommendations.standard.gasPrice);
      adjustedRecommendations.safeLow.savingsVsStandard = Math.round(
        ((standardPrice - Number(adjustedRecommendations.safeLow.gasPrice)) / standardPrice) * 100
      );
      adjustedRecommendations.fast.savingsVsStandard = Math.round(
        ((standardPrice - Number(adjustedRecommendations.fast.gasPrice)) / standardPrice) * 100
      );
      
      // Add formatted prices for display
      Object.keys(adjustedRecommendations).forEach(tier => {
        const rec = adjustedRecommendations[tier];
        rec.gasPriceGwei = this._formatGasPrice(rec.gasPrice);
        
        if (rec.maxFeePerGas) {
          rec.maxFeePerGasGwei = this._formatGasPrice(rec.maxFeePerGas);
          rec.maxPriorityFeePerGasGwei = this._formatGasPrice(rec.maxPriorityFeePerGas);
        }
        
        // Add transaction time estimation
        const timeEstimate = this.estimateTransactionTime(rec.gasPrice);
        rec.estimatedTime = timeEstimate.estimatedSeconds;
        rec.estimatedBlocks = timeEstimate.estimatedBlocks;
        rec.confidence = timeEstimate.confidence;
      });
      
      // Add metadata
      const recommendations = {
        ...adjustedRecommendations,
        metadata: {
          timestamp: Date.now(),
          network: 'avalanche',
          congestionLevel: this.networkCongestionLevel,
          congestionMultiplier,
          baseFeeGwei: this._formatGasPrice(baseFee),
          enableDynamicFees: this.enableDynamicFees,
          blockTime: this.config.blockTime,
          currency: 'AVAX',
          lastUpdated: new Date().toISOString()
        }
      };
      
      console.log('Generated Avalanche fee recommendations:', {
        safeLow: recommendations.safeLow.gasPriceGwei + ' GWEI',
        standard: recommendations.standard.gasPriceGwei + ' GWEI',
        fast: recommendations.fast.gasPriceGwei + ' GWEI',
        congestion: this.networkCongestionLevel
      });
      
      return recommendations;
      
    } catch (error) {
      console.error('Failed to get fee recommendations:', error);
      
      // Return safe fallback recommendations
      return this._getFallbackRecommendations();
    }
  }
  
  /**
   * Adjusts recommendations based on Avalanche network characteristics
   * @private
   */
  _adjustRecommendationsForNetwork(recommendations) {
    const adjusted = { ...recommendations };
    
    // Avalanche-specific adjustments
    switch (this.networkCongestionLevel) {
      case 'low':
        // Reduce all prices slightly during low congestion
        adjusted.safeLow.gasPrice = adjusted.safeLow.gasPrice * 90n / 100n;
        adjusted.standard.gasPrice = adjusted.standard.gasPrice * 95n / 100n;
        break;
        
      case 'high':
        // Increase standard and fast during high congestion
        adjusted.standard.gasPrice = adjusted.standard.gasPrice * 120n / 100n;
        adjusted.fast.gasPrice = adjusted.fast.gasPrice * 150n / 100n;
        adjusted.standard.description += ' (network congestion detected)';
        adjusted.fast.description += ' (recommended due to congestion)';
        break;
        
      case 'extreme':
        // Significant increases during extreme congestion
        adjusted.standard.gasPrice = adjusted.standard.gasPrice * 150n / 100n;
        adjusted.fast.gasPrice = adjusted.fast.gasPrice * 200n / 100n;
        adjusted.safeLow.description += ' (may experience delays)';
        adjusted.standard.description += ' (high network congestion)';
        adjusted.fast.description += ' (strongly recommended)';
        break;
    }
    
    // Ensure minimum gas prices
    Object.keys(adjusted).forEach(tier => {
      if (adjusted[tier].gasPrice < this.config.minGasPrice) {
        adjusted[tier].gasPrice = this.config.minGasPrice;
      }
      if (adjusted[tier].gasPrice > this.config.maxGasPrice) {
        adjusted[tier].gasPrice = this.config.maxGasPrice;
      }
    });
    
    return adjusted;
  }
  
  /**
   * Returns safe fallback recommendations when primary calculation fails
   * @private
   */
  _getFallbackRecommendations() {
    console.log('Using fallback fee recommendations');
    
    return {
      safeLow: {
        priority: 'safeLow',
        description: 'Most economical option (fallback pricing)',
        gasPrice: this.config.minGasPrice,
        gasPriceGwei: this._formatGasPrice(this.config.minGasPrice),
        estimatedTime: 4,
        estimatedBlocks: 2,
        confidence: 'low',
        type: 0,
        savingsVsStandard: 50
      },
      
      standard: {
        priority: 'standard',
        description: 'Balanced speed and cost (fallback pricing)',
        gasPrice: this.config.defaultGasPrice,
        gasPriceGwei: this._formatGasPrice(this.config.defaultGasPrice),
        estimatedTime: 2,
        estimatedBlocks: 1,
        confidence: 'medium',
        type: 0,
        savingsVsStandard: 0
      },
      
      fast: {
        priority: 'fast',
        description: 'Fastest confirmation (fallback pricing)',
        gasPrice: this.config.defaultGasPrice * 2n,
        gasPriceGwei: this._formatGasPrice(this.config.defaultGasPrice * 2n),
        estimatedTime: 2,
        estimatedBlocks: 1,
        confidence: 'medium',
        type: 0,
        savingsVsStandard: -100
      },
      
      metadata: {
        timestamp: Date.now(),
        network: 'avalanche',
        congestionLevel: this.networkCongestionLevel,
        enableDynamicFees: false,
        isFallback: true,
        currency: 'AVAX',
        lastUpdated: new Date().toISOString()
      }
    };
  }
  
  /**
   * Graceful shutdown with Avalanche-specific cleanup
   * @public
   */
  async shutdown() {
    console.log('Shutting down AvalancheBroadcaster...');
    
    const finalStats = await super.shutdown();
    
    // Clear Avalanche-specific data
    this.clearGasCache();
    this.baseFeeHistory = [];
    this.priorityFeeHistory = [];
    
    console.log('AvalancheBroadcaster shutdown complete');
    return {
      ...finalStats,
      avalancheSpecific: {
        finalCongestionLevel: this.networkCongestionLevel,
        cacheCleared: true,
        historyCleared: true
      }
    };
  }
}
