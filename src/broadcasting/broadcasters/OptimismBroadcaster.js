/**
 * OptimismBroadcaster.js
 * 
 * Optimism Layer 2 specific transaction broadcaster implementation with
 * optimized gas calculations, fast finality, and Optimism-specific
 * transaction handling for efficient L2 operations.
 * 
 * @author Trust Crypto Wallet Extension
 * @version 1.0.0
 */

import { ethers } from 'ethers';
import BaseBroadcaster from './BaseBroadcaster.js';

/**
 * Optimism-specific error codes and messages
 */
const OPTIMISM_ERROR_CODES = {
  INSUFFICIENT_ETH: 'INSUFFICIENT_ETH',
  L2_GAS_PRICE_TOO_LOW: 'L2_GAS_PRICE_TOO_LOW',
  L1_GAS_PRICE_TOO_HIGH: 'L1_GAS_PRICE_TOO_HIGH',
  NONCE_TOO_LOW: 'NONCE_TOO_LOW',
  SEQUENCER_ERROR: 'SEQUENCER_ERROR',
  STATE_ROOT_BATCH_ERROR: 'STATE_ROOT_BATCH_ERROR',
  L2_TO_L1_MESSAGE_FAILED: 'L2_TO_L1_MESSAGE_FAILED',
  INVALID_L2_TRANSACTION: 'INVALID_L2_TRANSACTION',
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT: 'TIMEOUT',
  BEDROCK_ERROR: 'BEDROCK_ERROR'
};

/**
 * Default Optimism network configuration
 */
const DEFAULT_OPTIMISM_CONFIG = {
  network: 'optimism',
  timeout: 60000, // 1 minute (L2 is fast)
  confirmations: 1, // Fast finality on L2
  gasMultiplier: 1.1, // Lower multiplier due to predictable L2 gas
  blockTime: 2000, // ~2 seconds average block time
  
  // Optimism-specific gas configuration
  minL2GasPrice: ethers.parseUnits('0.001', 'gwei'), // 0.001 Gwei minimum
  maxL2GasPrice: ethers.parseUnits('100', 'gwei'), // 100 Gwei maximum
  defaultL2GasPrice: ethers.parseUnits('0.01', 'gwei'), // 0.01 Gwei default
  maxGasLimit: 30000000, // 30M gas limit for L2
  
  // L1 gas pricing for data publishing
  l1GasMultiplier: 1.2,
  maxL1GasPrice: ethers.parseUnits('200', 'gwei'),
  
  // Optimism-specific features
  enableBedrock: true,
  supportsOptimisticRollup: true,
  l2ChainId: 10, // Optimism mainnet
  parentChainId: 1, // Ethereum mainnet
  
  // Optimism fee structure
  l1DataFeeScalar: 684000, // Bedrock scalar for L1 data fees
  l1BaseFeeScalar: 1368 // Bedrock base fee scalar
};

/**
 * OptimismBroadcaster - Optimism Layer 2 specific transaction broadcaster
 * 
 * Handles Optimism L2 transaction broadcasting with optimized gas calculations
 * for both L2 execution and L1 data publishing costs, fast finality confirmation,
 * and Optimism-specific transaction types and error handling including Bedrock support.
 * 
 * @class OptimismBroadcaster
 * @extends BaseBroadcaster
 * @example
 * const provider = new ethers.JsonRpcProvider('https://mainnet.optimism.io');
 * const broadcaster = new OptimismBroadcaster(provider, {
 *   network: 'optimism',
 *   confirmations: 1,
 *   enableBedrock: true
 * });
 * 
 * broadcaster.on('transaction-sent', ({ txHash, l2GasUsed, l1DataFee }) => {
 *   console.log(`Optimism tx: ${txHash} (L2 Gas: ${l2GasUsed}, L1 Fee: ${l1DataFee})`);
 * });
 * 
 * const txHash = await broadcaster.broadcast({
 *   to: '0x742dFfdf2c6c8D4B93067782b1e7A38754b8c7b3',
 *   value: ethers.parseEther('0.01'), // 0.01 ETH
 *   data: '0x'
 * });
 */
export default class OptimismBroadcaster extends BaseBroadcaster {
  /**
   * Creates a new OptimismBroadcaster instance
   * 
   * Initializes the broadcaster with Optimism-specific configuration including
   * fast finality, L2 gas optimizations, and Bedrock-specific features.
   * 
   * @constructor
   * @param {ethers.Provider} provider - Ethers.js provider for Optimism network
   * @param {Object} [options={}] - Optimism-specific configuration options
   * @param {string} [options.network='optimism'] - Network name (optimism, optimism-goerli, base, etc.)
   * @param {number} [options.timeout=60000] - Transaction timeout in milliseconds (1 minute)
   * @param {number} [options.confirmations=1] - Number of confirmations (fast L2 finality)
   * @param {number} [options.gasMultiplier=1.1] - Gas estimation safety multiplier
   * @param {BigNumber} [options.minL2GasPrice] - Minimum L2 gas price in wei
   * @param {BigNumber} [options.maxL2GasPrice] - Maximum L2 gas price in wei
   * @param {BigNumber} [options.maxL1GasPrice] - Maximum L1 gas price for data publishing
   * @param {number} [options.maxGasLimit=30000000] - Maximum gas limit for L2 transactions
   * @param {boolean} [options.enableBedrock=true] - Enable Bedrock-specific features
   * @param {number} [options.l2ChainId=10] - L2 chain ID (10 for Optimism mainnet)
   * @param {number} [options.parentChainId=1] - Parent chain ID (1 for Ethereum)
   * @param {number} [options.l1DataFeeScalar] - Bedrock scalar for L1 data fees
   * 
   * @throws {TypeError} If provider is not compatible with Optimism
   * @throws {Error} If network configuration is invalid for Optimism
   * 
   * @example
   * const broadcaster = new OptimismBroadcaster(provider, {
   *   network: 'optimism',
   *   confirmations: 1,
   *   maxL2GasPrice: ethers.parseUnits('50', 'gwei'),
   *   enableBedrock: true
   * });
   */
  constructor(provider, options = {}) {
    // Validate provider for Optimism compatibility
    if (!provider || typeof provider.sendTransaction !== 'function') {
      throw new TypeError('Provider must be a valid ethers provider compatible with Optimism network');
    }
    
    // Merge with Optimism defaults
    const config = {
      ...DEFAULT_OPTIMISM_CONFIG,
      ...options
    };
    
    super(provider, config);
    
    // Optimism-specific properties
    this.enableBedrock = config.enableBedrock;
    this.l2ChainId = config.l2ChainId;
    this.parentChainId = config.parentChainId;
    this.l1DataFeeScalar = config.l1DataFeeScalar;
    this.l1BaseFeeScalar = config.l1BaseFeeScalar;
    this.gasCache = new Map();
    this.networkInfo = null;
    this.sequencerInfo = null;
    
    // L1/L2 gas tracking
    this.l1GasHistory = [];
    this.l2GasHistory = [];
    
    console.log(`OptimismBroadcaster initialized for ${this.config.network} network`);
  }
  
  /**
   * Initializes Optimism-specific broadcaster features
   * 
   * @public
   * @method initialize
   * @returns {Promise<void>} Resolves when initialization is complete
   */
  async initialize() {
    await super.initialize();
    
    try {
      // Detect and validate Optimism network
      await this._detectOptimismNetwork();
      
      // Initialize sequencer information
      await this._initializeSequencerInfo();
      
      // Initialize L1/L2 gas tracking
      await this._initializeL2GasTracking();
      
      console.log(`OptimismBroadcaster initialized successfully for ${this.networkInfo?.name || 'unknown'} network`);
      
    } catch (error) {
      console.error('Failed to initialize OptimismBroadcaster:', error);
      throw new Error(`Optimism broadcaster initialization failed: ${error.message}`);
    }
  }
  
  /**
   * Detects and validates Optimism network connection with comprehensive OP Stack support
   * @private
   */
  async _detectOptimismNetwork() {
    try {
      const network = await this.provider.getNetwork();
      const chainId = Number(network.chainId);
      
      // Comprehensive Optimism-compatible chain IDs with OP Stack support
      const validChainIds = {
        // Core Optimism networks
        10: 'optimism',
        420: 'optimism-goerli', // Deprecated but still supported
        11155420: 'optimism-sepolia',
        
        // Base networks (Coinbase's OP Stack)
        8453: 'base',
        84531: 'base-goerli', // Deprecated
        84532: 'base-sepolia',
        
        // Extended OP Stack ecosystem for scalability
        7777777: 'zora',      // Zora Network
        999999999: 'zora-sepolia',
        34443: 'mode',        // Mode Network
        919: 'mode-sepolia',
        252: 'fraxtal',       // Fraxtal
        2522: 'fraxtal-testnet',
        
        // Additional recognized OP Stack chains
        424: 'pgn',           // Public Goods Network
        58008: 'pgn-sepolia',
        288: 'boba',          // Boba Network (OP Stack migration)
        2888: 'boba-sepolia'
      };
      
      const networkName = validChainIds[chainId];
      if (!networkName) {
        console.warn(`Warning: Unrecognized OP Stack compatible chain ID: ${chainId}`);
      }
      
      // Determine network characteristics
      const isMainnet = [10, 8453, 7777777, 34443, 252, 424, 288].includes(chainId);
      const isBase = [8453, 84531, 84532].includes(chainId);
      const isCore = [10, 420, 11155420].includes(chainId);
      
      this.networkInfo = {
        name: networkName || `op-stack-${chainId}`,
        chainId,
        isOptimism: true,
        isL2: true,
        isOPStack: true,
        isBase,
        isCoreOptimism: isCore,
        parentChainId: this._getParentChainId(chainId),
        isTestnet: !isMainnet,
        isBedrock: this.enableBedrock,
        supportsOPStackFeatures: true
      };
      
      console.log(`Connected to OP Stack network: ${this.networkInfo.name} (Chain ID: ${chainId})`);
      console.log(`Network type: ${isCore ? 'Core Optimism' : isBase ? 'Base' : 'OP Stack'}, Parent: ${this.networkInfo.parentChainId}`);
      
    } catch (error) {
      console.warn('Could not detect Optimism network:', error.message);
      // Set minimal fallback info
      this.networkInfo = {
        name: 'unknown-op-stack',
        chainId: 10, // Default to Optimism mainnet
        isOptimism: true,
        isL2: true,
        isOPStack: true,
        parentChainId: 1,
        isTestnet: false,
        isBedrock: this.enableBedrock
      };
    }
  }
  
  /**
   * Gets parent chain ID for Optimism networks with comprehensive mapping
   * @private
   */
  _getParentChainId(chainId) {
    const parentChainMap = {
      // Optimism networks
      10: 1,        // Optimism Mainnet -> Ethereum Mainnet
      420: 5,       // Optimism Goerli -> Goerli (deprecated)
      11155420: 11155111, // Optimism Sepolia -> Sepolia
      
      // Base networks (OP Stack)
      8453: 1,      // Base Mainnet -> Ethereum Mainnet
      84531: 5,     // Base Goerli -> Goerli (deprecated)
      84532: 11155111, // Base Sepolia -> Sepolia
      
      // Additional OP Stack chains for scalability
      7777777: 1,   // Zora Network -> Ethereum Mainnet
      999999999: 11155111, // Zora Sepolia -> Sepolia
      
      // Mode Network (OP Stack)
      34443: 1,     // Mode Mainnet -> Ethereum Mainnet
      919: 11155111, // Mode Sepolia -> Sepolia
      
      // Fraxtal (OP Stack)
      252: 1,       // Fraxtal Mainnet -> Ethereum Mainnet
      2522: 11155111, // Fraxtal Testnet -> Sepolia
      
      // Default fallback for unknown chains
      default: 1    // Assume Ethereum mainnet as parent
    };
    
    const parentChainId = parentChainMap[chainId];
    if (!parentChainId) {
      console.warn(`Unknown OP Stack chain ID: ${chainId}, defaulting to Ethereum mainnet (1)`);
      return parentChainMap.default;
    }
    
    return parentChainId;
  }
  
  /**
   * Initializes sequencer information for Optimism
   * @private
   */
  async _initializeSequencerInfo() {
    try {
      // Try to get sequencer information
      const blockNumber = await this.provider.getBlockNumber();
      this.sequencerInfo = {
        lastBlock: blockNumber,
        isHealthy: true,
        lastUpdate: Date.now(),
        isBedrock: this.enableBedrock
      };
      
      console.log('Optimism sequencer information initialized');
      
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
      
      console.log('Optimism L2 gas tracking initialized');
      
    } catch (error) {
      console.warn('Could not initialize L2 gas tracking:', error.message);
    }
  }
  
  /**
   * Sends raw transaction to Optimism L2 with 1 block confirmation
   * 
   * @protected
   * @method _sendRawTransaction
   * @param {Object} txData - Formatted Optimism transaction data
   * @returns {Promise<string>} Transaction hash after confirmation
   */
  async _sendRawTransaction(txData) {
    try {
      console.log('Sending Optimism L2 transaction:', {
        to: txData.to,
        value: txData.value?.toString(),
        gasLimit: txData.gasLimit?.toString(),
        gasPrice: txData.gasPrice?.toString(),
        maxFeePerGas: txData.maxFeePerGas?.toString(),
        nonce: txData.nonce,
        type: txData.type
      });
      
      // Send transaction to Optimism sequencer
      const txResponse = await this.provider.sendTransaction(txData);
      const txHash = txResponse.hash;
      
      console.log(`Optimism L2 transaction sent: ${txHash}`);
      
      /**
       * Transaction sent event
       * @event OptimismBroadcaster#transaction-sent
       * @type {Object}
       * @property {string} txHash - Transaction hash
       * @property {Object} txData - Transaction data
       * @property {string} network - Optimism network name
       * @property {boolean} isL2 - Always true for Optimism
       * @property {number} gasLimit - Gas limit used
       * @property {string} l2GasPrice - L2 gas price used
       * @property {boolean} isBedrock - Whether using Bedrock features
       */
      this.emit('transaction-sent', {
        txHash,
        txData,
        network: this.config.network,
        isL2: true,
        gasLimit: txData.gasLimit?.toString(),
        l2GasPrice: this._formatGasPrice(txData.gasPrice || txData.maxFeePerGas),
        isBedrock: this.enableBedrock
      });
      
      // Wait for L2 confirmation (fast finality)
      if (this.config.confirmations > 0) {
        console.log(`Waiting for ${this.config.confirmations} Optimism L2 confirmation(s)...`);
        
        const receipt = await txResponse.wait(this.config.confirmations);
        
        if (receipt.status === 0) {
          throw new Error('Optimism L2 transaction was reverted');
        }
        
        this.stats.successfulTransactions++;
        this.stats.totalGasUsed += receipt.gasUsed;
        
        /**
         * Transaction confirmed event
         * @event OptimismBroadcaster#transaction-confirmed
         * @type {Object}
         * @property {string} txHash - Transaction hash
         * @property {Object} receipt - Transaction receipt
         * @property {number} confirmations - Number of confirmations
         * @property {string} l2GasUsed - Actual L2 gas used
         * @property {number} blockNumber - L2 block number
         * @property {boolean} isL2 - Always true for Optimism
         * @property {string} l1DataFee - L1 data fee (if available)
         */
        this.emit('transaction-confirmed', {
          txHash,
          receipt,
          confirmations: this.config.confirmations,
          l2GasUsed: receipt.gasUsed.toString(),
          blockNumber: receipt.blockNumber,
          isL2: true,
          l1DataFee: receipt.l1Fee?.toString() || '0' // Bedrock provides L1 fee
        });
        
        console.log(`Optimism L2 transaction confirmed: ${txHash} (L2 Gas: ${receipt.gasUsed}, Block: ${receipt.blockNumber})`);
      }
      
      return txHash;
      
    } catch (error) {
      throw this._enhanceOptimismError(error);
    }
  }
  
  /**
   * Estimates gas for Optimism L2 transactions with L1/L2 cost breakdown
   * 
   * @public
   * @method estimateGas
   * @param {Object} txData - Transaction data for estimation
   * @returns {Promise<Object>} Comprehensive gas estimation for Optimism
   * 
   * @example
   * const gasEstimate = await broadcaster.estimateGas({
   *   to: '0x742dFfdf2c6c8D4B93067782b1e7A38754b8c7b3',
   *   value: ethers.parseEther('0.01'),
   *   from: '0x8ba1f109551bD432803012645Hac136c'
   * });
   * 
   * console.log(`L2 Gas: ${gasEstimate.l2Gas}`);
   * console.log(`L1 Data Fee: ${gasEstimate.l1DataFee}`);
   */
  async estimateGas(txData) {
    try {
      // Create cache key for Optimism transactions
      const cacheKey = this._createOptimismGasCacheKey(txData);
      
      // Check cache (shorter TTL for L2)
      if (this.gasCache.has(cacheKey)) {
        const cached = this.gasCache.get(cacheKey);
        if (Date.now() - cached.timestamp < 20000) { // 20 second cache
          console.log('Using cached Optimism gas estimate');
          return cached.estimate;
        }
      }
      
      // Estimate L2 gas limit
      const l2GasLimit = await super.estimateGas(txData);
      const safeL2GasLimit = Math.floor(Number(l2GasLimit) * this.config.gasMultiplier);
      
      // Get L2 fee data
      const l2FeeData = await this._getOptimismL2FeeData();
      
      // Estimate L1 data fee (Optimism-specific)
      const l1DataFee = await this._estimateL1DataFee(txData);
      
      let gasEstimate;
      
      if (l2FeeData.maxFeePerGas) {
        // EIP-1559 for Optimism
        gasEstimate = {
          l2Gas: safeL2GasLimit,
          l2MaxFeePerGas: l2FeeData.maxFeePerGas.toString(),
          l2MaxPriorityFeePerGas: l2FeeData.maxPriorityFeePerGas.toString(),
          l1DataFee: l1DataFee.toString(),
          totalCost: (BigInt(safeL2GasLimit) * l2FeeData.maxFeePerGas + l1DataFee).toString(),
          type: 2,
          network: 'optimism',
          isL2: true,
          isBedrock: this.enableBedrock
        };
      } else {
        // Legacy gas for Optimism
        gasEstimate = {
          l2Gas: safeL2GasLimit,
          l2GasPrice: l2FeeData.gasPrice.toString(),
          l1DataFee: l1DataFee.toString(),
          totalCost: (BigInt(safeL2GasLimit) * l2FeeData.gasPrice + l1DataFee).toString(),
          type: 0,
          network: 'optimism',
          isL2: true,
          isBedrock: this.enableBedrock
        };
      }
      
      // Validate against Optimism limits
      this._validateOptimismGasEstimate(gasEstimate);
      
      // Cache the estimate
      this.gasCache.set(cacheKey, {
        estimate: gasEstimate,
        timestamp: Date.now()
      });
      
      console.log('Optimism gas estimation completed:', gasEstimate);
      return gasEstimate;
      
    } catch (error) {
      throw this._enhanceOptimismError(error, 'Optimism gas estimation failed');
    }
  }
  
  /**
   * Gets optimized L2 fee data for Optimism
   * @private
   */
  async _getOptimismL2FeeData() {
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
      
      // Apply Optimism L2 optimizations
      const gasPrice = feeData.gasPrice || this.config.defaultL2GasPrice;
      const minGasPrice = this.config.minL2GasPrice;
      
      return {
        gasPrice: gasPrice > minGasPrice ? gasPrice : minGasPrice,
        maxFeePerGas: feeData.maxFeePerGas,
        maxPriorityFeePerGas: feeData.maxPriorityFeePerGas
      };
      
    } catch (error) {
      console.warn('Failed to get Optimism L2 fee data, using defaults:', error.message);
      
      return {
        gasPrice: this.config.defaultL2GasPrice,
        maxFeePerGas: null,
        maxPriorityFeePerGas: null
      };
    }
  }
  
  /**
   * Estimates L1 data fee for Optimism transaction using Bedrock formula
   * @private
   */
  async _estimateL1DataFee(txData) {
    try {
      if (!this.enableBedrock) {
        // Legacy Optimism L1 gas calculation (pre-Bedrock)
        return this._estimateLegacyL1DataFee(txData);
      }
      
      // Bedrock L1 data fee calculation with oracle integration
      const txDataSize = this._calculateTransactionDataSize(txData);
      
      // Try to get L1 base fee from oracle, fallback to default
      let l1BaseFee;
      try {
        // In production, use Optimism's L1 gas price oracle contract
        // For now, use a sensible default with some dynamic adjustment
        const currentFeeData = await this.provider.getFeeData();
        l1BaseFee = currentFeeData.gasPrice 
          ? BigInt(Math.floor(Number(currentFeeData.gasPrice) * 0.75)) // Estimate L1 base fee as 75% of L2 gas price
          : ethers.parseUnits('15', 'gwei'); // Sensible 15 Gwei default fallback
      } catch (error) {
        console.warn('Could not get L1 base fee from oracle, using default:', error.message);
        l1BaseFee = ethers.parseUnits('15', 'gwei'); // Base fee fallback for oracle unavailability
      }
      
      // Bedrock formula: (calldataGas + overhead) * l1BaseFee * scalar / 10^6
      const calldataGas = BigInt(txDataSize * 16); // 16 gas per calldata byte
      const overhead = BigInt(188); // Fixed overhead for transaction metadata
      const scalar = BigInt(this.l1DataFeeScalar);
      
      // Apply Bedrock scalar calculation
      const l1DataFee = (calldataGas + overhead) * l1BaseFee * scalar / BigInt(1000000);
      
      console.log(`Bedrock L1 data fee calculation: calldata=${txDataSize} bytes, overhead=188, scalar=${this.l1DataFeeScalar}, baseFee=${ethers.formatUnits(l1BaseFee, 'gwei')} GWEI, fee=${ethers.formatEther(l1DataFee)} ETH`);
      
      return l1DataFee;
      
    } catch (error) {
      console.warn('Could not estimate L1 data fee:', error.message);
      // Return minimum viable fee to prevent transaction failures
      return ethers.parseUnits('0.0001', 'ether'); // 0.0001 ETH fallback
    }
  }
  
  /**
   * Estimates legacy L1 data fee for pre-Bedrock Optimism
   * @private
   */
  _estimateLegacyL1DataFee(txData) {
    try {
      const txDataSize = this._calculateTransactionDataSize(txData);
      const l1GasPrice = ethers.parseUnits('20', 'gwei'); // Conservative estimate for legacy
      const l1GasPerByte = 16; // Standard gas per calldata byte
      const legacyOverhead = 2100; // Higher overhead for legacy system
      
      const legacyL1Fee = (BigInt(txDataSize) + BigInt(legacyOverhead)) * BigInt(l1GasPerByte) * l1GasPrice;
      
      console.log(`Legacy L1 data fee calculation: calldata=${txDataSize} bytes, overhead=${legacyOverhead}, gasPrice=${ethers.formatUnits(l1GasPrice, 'gwei')} GWEI, fee=${ethers.formatEther(legacyL1Fee)} ETH`);
      
      return legacyL1Fee;
    } catch (error) {
      console.warn('Legacy L1 fee calculation failed:', error.message);
      return ethers.parseUnits('0.001', 'ether'); // Conservative fallback
    }
  }
  
  /**
   * Calculates transaction data size for L1 fee estimation with RLP encoding consideration
   * @private
   */
  _calculateTransactionDataSize(txData) {
    let size = 0;
    
    // Base transaction size (RLP encoded fields)
    // Accounts for: nonce, gasPrice/maxFeePerGas, gasLimit, to, value, data, v, r, s
    size += 100; // Base RLP overhead
    
    // Add size for each transaction field
    if (txData.nonce !== undefined) {
      size += this._getRLPSize(txData.nonce);
    }
    
    if (txData.gasLimit !== undefined) {
      size += this._getRLPSize(txData.gasLimit);
    }
    
    if (txData.gasPrice !== undefined) {
      size += this._getRLPSize(txData.gasPrice);
    }
    
    if (txData.maxFeePerGas !== undefined) {
      size += this._getRLPSize(txData.maxFeePerGas);
    }
    
    if (txData.maxPriorityFeePerGas !== undefined) {
      size += this._getRLPSize(txData.maxPriorityFeePerGas);
    }
    
    if (txData.value !== undefined) {
      size += this._getRLPSize(txData.value);
    }
    
    // Address fields (20 bytes each)
    if (txData.to) {
      size += 20;
    }
    
    // Data field (most significant for L1 fee calculation)
    if (txData.data && txData.data !== '0x') {
      const dataBytes = (txData.data.length - 2) / 2; // Remove 0x prefix
      size += dataBytes;
      
      // Add extra consideration for data-heavy transactions
      if (dataBytes > 1000) {
        console.log(`Large transaction data detected: ${dataBytes} bytes`);
      }
    }
    
    return size;
  }
  
  /**
   * Estimates RLP encoding size for a value
   * @private
   */
  _getRLPSize(value) {
    if (value === 0 || value === '0x0' || value === '0') {
      return 1; // Single byte for zero
    }
    
    // Convert to hex string if not already
    let hexValue = value.toString();
    if (!hexValue.startsWith('0x')) {
      hexValue = '0x' + BigInt(value).toString(16);
    }
    
    // Remove 0x prefix and calculate byte length
    const byteLength = (hexValue.length - 2) / 2;
    
    // RLP encoding overhead
    if (byteLength === 1) {
      return 1;
    } else if (byteLength <= 55) {
      return byteLength + 1;
    } else {
      return byteLength + 1 + Math.ceil(Math.log2(byteLength) / 8);
    }
  }
  
  /**
   * Validates gas estimate against Optimism limits
   * @private
   */
  _validateOptimismGasEstimate(gasEstimate) {
    if (gasEstimate.l2Gas > this.config.maxGasLimit) {
      throw new Error(`Optimism L2 gas limit ${gasEstimate.l2Gas} exceeds maximum ${this.config.maxGasLimit}`);
    }
    
    const gasPrice = gasEstimate.l2GasPrice || gasEstimate.l2MaxFeePerGas;
    if (gasPrice && BigInt(gasPrice) > this.config.maxL2GasPrice) {
      throw new Error(`Optimism L2 gas price ${gasPrice} exceeds maximum ${this.config.maxL2GasPrice}`);
    }
    
    if (gasPrice && BigInt(gasPrice) < this.config.minL2GasPrice) {
      throw new Error(`Optimism L2 gas price ${gasPrice} below minimum ${this.config.minL2GasPrice}`);
    }
  }
  
  /**
   * Creates cache key for Optimism gas estimation
   * @private
   */
  _createOptimismGasCacheKey(txData) {
    const key = `optimism-${txData.to}-${txData.value || '0'}-${txData.data || '0x'}-${txData.from || 'unknown'}`;
    return key.toLowerCase();
  }
  
  /**
   * Enhances errors with Optimism-specific context
   * @private
   */
  _enhanceOptimismError(error, context = '') {
    const message = error.message || error.toString();
    const lowerMessage = message.toLowerCase();
    
    let errorCode = OPTIMISM_ERROR_CODES.NETWORK_ERROR;
    let enhancedMessage = message;
    
    // Categorize Optimism-specific errors
    if (lowerMessage.includes('insufficient funds')) {
      errorCode = OPTIMISM_ERROR_CODES.INSUFFICIENT_ETH;
      enhancedMessage = 'Insufficient ETH balance for Optimism L2 transaction (including gas costs)';
    } else if (lowerMessage.includes('nonce too low')) {
      errorCode = OPTIMISM_ERROR_CODES.NONCE_TOO_LOW;
      enhancedMessage = 'Transaction nonce too low for Optimism L2 (transaction may have been replaced)';
    } else if (lowerMessage.includes('gas price too low')) {
      errorCode = OPTIMISM_ERROR_CODES.L2_GAS_PRICE_TOO_LOW;
      enhancedMessage = `Optimism L2 gas price too low (minimum: ${this._formatGasPrice(this.config.minL2GasPrice)} GWEI)`;
    } else if (lowerMessage.includes('sequencer')) {
      errorCode = OPTIMISM_ERROR_CODES.SEQUENCER_ERROR;
      enhancedMessage = 'Optimism sequencer error - please try again';
    } else if (lowerMessage.includes('state root') || lowerMessage.includes('batch')) {
      errorCode = OPTIMISM_ERROR_CODES.STATE_ROOT_BATCH_ERROR;
      enhancedMessage = 'Optimism state root batch error - transaction may be delayed';
    } else if (lowerMessage.includes('bedrock')) {
      errorCode = OPTIMISM_ERROR_CODES.BEDROCK_ERROR;
      enhancedMessage = 'Optimism Bedrock upgrade error - check network compatibility';
    } else if (lowerMessage.includes('timeout')) {
      errorCode = OPTIMISM_ERROR_CODES.TIMEOUT;
      enhancedMessage = 'Optimism L2 transaction timed out';
    }
    
    const enhancedError = new Error(`${context ? context + ': ' : ''}${enhancedMessage}`);
    enhancedError.code = errorCode;
    enhancedError.originalError = error;
    enhancedError.network = 'optimism';
    enhancedError.isL2 = true;
    enhancedError.isBedrock = this.enableBedrock;
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
   * Gets Optimism network-specific information with comprehensive OP Stack details
   * @public
   */
  getNetworkInfo() {
    return {
      ...this.networkInfo,
      // Bedrock-specific features
      enableBedrock: this.enableBedrock,
      bedrockFeatures: this.enableBedrock ? {
        l1DataFeeScalar: this.l1DataFeeScalar,
        l1BaseFeeScalar: this.l1BaseFeeScalar,
        usesBedrockFeeCalculation: true
      } : null,
      
      // Network topology
      sequencerInfo: this.sequencerInfo,
      l2ChainId: this.l2ChainId,
      parentChainId: this.parentChainId,
      
      // Gas configuration
      gasConfiguration: {
        minL2GasPrice: this._formatGasPrice(this.config.minL2GasPrice),
        maxL2GasPrice: this._formatGasPrice(this.config.maxL2GasPrice),
        defaultL2GasPrice: this._formatGasPrice(this.config.defaultL2GasPrice),
        gasMultiplier: this.config.gasMultiplier
      },
      
      // Performance metrics
      gasCache: {
        size: this.gasCache.size,
        enabled: true,
        ttl: '20 seconds'
      },
      
      // OP Stack capabilities
      opStackCapabilities: {
        isOPStack: this.networkInfo?.isOPStack || false,
        isCoreOptimism: this.networkInfo?.isCoreOptimism || false,
        isBase: this.networkInfo?.isBase || false,
        supportsOPStackFeatures: this.networkInfo?.supportsOPStackFeatures || false
      },
      
      // Fee calculation method
      feeCalculationMethod: this.enableBedrock ? 'bedrock' : 'legacy',
      
      // Network status
      networkStatus: {
        blockTime: this.config.blockTime,
        fastFinality: true,
        recommendedConfirmations: this.config.confirmations
      }
    };
  }
  
  /**
   * Gets enhanced statistics with Optimism-specific metrics
   * @public
   */
  getStats() {
    const baseStats = super.getStats();
    const avgL2GasPrice = this.l2GasHistory.length > 0
      ? this.l2GasHistory.reduce((sum, entry) => sum + Number(entry.gasPrice || 0), 0) / this.l2GasHistory.length
      : 0;
    
    return {
      ...baseStats,
      network: 'optimism',
      isL2: true,
      isBedrock: this.enableBedrock,
      chainId: this.networkInfo?.chainId,
      parentChainId: this.networkInfo?.parentChainId,
      gasCacheSize: this.gasCache.size,
      averageL2GasPrice: this._formatGasPrice(Math.floor(avgL2GasPrice)),
      sequencerHealth: this.sequencerInfo?.isHealthy || false,
      networkInfo: this.networkInfo
    };
  }
}
