import { getChain, validateChainId, CHAIN_CATEGORIES } from '../providers/configs/chainRegistry.js';

// Gas price multipliers for different transaction speeds
export const GAS_SPEED_MULTIPLIERS = {
  SLOW: 0.8,
  STANDARD: 1.0,
  FAST: 1.2,
  INSTANT: 1.5
};

// Default gas limits for different transaction types
export const DEFAULT_GAS_LIMITS = {
  TRANSFER: 21000,
  TOKEN_TRANSFER: 65000,
  CONTRACT_INTERACTION: 150000,
  SWAP: 300000,
  NFT_TRANSFER: 85000,
  MULTI_SEND: 200000
};

// Chain-specific gas configurations
const CHAIN_GAS_CONFIGS = {
  1: { // Ethereum
    baseFeeMultiplier: 1.1,
    priorityFeeRange: { min: 1, max: 5 },
    maxGasPrice: 500, // gwei
    eip1559: true
  },
  137: { // Polygon
    baseFeeMultiplier: 1.2,
    priorityFeeRange: { min: 30, max: 100 },
    maxGasPrice: 1000,
    eip1559: true
  },
  56: { // BSC
    baseFeeMultiplier: 1.0,
    priorityFeeRange: { min: 1, max: 3 },
    maxGasPrice: 20,
    eip1559: false
  },
  43114: { // Avalanche
    baseFeeMultiplier: 1.1,
    priorityFeeRange: { min: 1, max: 2 },
    maxGasPrice: 100,
    eip1559: true
  },
  42161: { // Arbitrum
    baseFeeMultiplier: 1.0,
    priorityFeeRange: { min: 0.01, max: 0.1 },
    maxGasPrice: 10,
    eip1559: true
  },
  10: { // Optimism
    baseFeeMultiplier: 1.0,
    priorityFeeRange: { min: 0.001, max: 0.01 },
    maxGasPrice: 5,
    eip1559: true
  }
};

class GasEstimator {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 30000; // 30 seconds
  }

  /**
   * Get current gas prices for a specific chain
   * @param {number} chainId - Chain ID
   * @returns {Promise<Object>} Gas prices object
   */
  async getGasPrices(chainId) {
    validateChainId(chainId);
    
    const cacheKey = `gas-${chainId}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }

    try {
      const chain = getChain(chainId);
      const gasConfig = CHAIN_GAS_CONFIGS[chainId];
      
      if (!gasConfig) {
        throw new Error(`Gas configuration not found for chain ${chainId}`);
      }

      const prices = await this._fetchGasPrices(chain, gasConfig);
      
      // Cache the result
      this.cache.set(cacheKey, {
        data: prices,
        timestamp: Date.now()
      });
      
      return prices;
    } catch (error) {
      console.error(`Failed to fetch gas prices for chain ${chainId}:`, error);
      return this._getFallbackGasPrices(chainId);
    }
  }

  /**
   * Estimate gas for a transaction
   * @param {number} chainId - Chain ID
   * @param {Object} transaction - Transaction object
   * @param {string} speed - Transaction speed (SLOW, STANDARD, FAST, INSTANT)
   * @returns {Promise<Object>} Gas estimation
   */
  async estimateGas(chainId, transaction, speed = 'STANDARD') {
    validateChainId(chainId);
    
    const gasPrices = await this.getGasPrices(chainId);
    const gasLimit = await this._estimateGasLimit(chainId, transaction);
    const multiplier = GAS_SPEED_MULTIPLIERS[speed] || 1.0;
    
    const chain = getChain(chainId);
    const gasConfig = CHAIN_GAS_CONFIGS[chainId];
    
    if (gasConfig.eip1559) {
      return this._calculateEIP1559Gas(gasPrices, gasLimit, multiplier);
    } else {
      return this._calculateLegacyGas(gasPrices, gasLimit, multiplier);
    }
  }

  /**
   * Get gas estimation for different speeds
   * @param {number} chainId - Chain ID
   * @param {Object} transaction - Transaction object
   * @returns {Promise<Object>} Gas estimations for all speeds
   */
  async getGasEstimations(chainId, transaction) {
    const estimations = {};
    
    for (const [speed, multiplier] of Object.entries(GAS_SPEED_MULTIPLIERS)) {
      try {
        estimations[speed.toLowerCase()] = await this.estimateGas(chainId, transaction, speed);
      } catch (error) {
        console.error(`Failed to estimate gas for speed ${speed}:`, error);
        estimations[speed.toLowerCase()] = null;
      }
    }
    
    return estimations;
  }

  /**
   * Calculate transaction cost in native token
   * @param {number} chainId - Chain ID
   * @param {Object} gasEstimation - Gas estimation object
   * @returns {Object} Cost calculation
   */
  calculateTransactionCost(chainId, gasEstimation) {
    const chain = getChain(chainId);
    const { gasLimit, gasPrice, maxFeePerGas } = gasEstimation;
    
    const effectiveGasPrice = maxFeePerGas || gasPrice;
    const costInWei = gasLimit * effectiveGasPrice;
    const costInEther = costInWei / Math.pow(10, 18);
    
    return {
      gasLimit,
      gasPrice: effectiveGasPrice,
      costInWei: costInWei.toString(),
      costInEther: costInEther.toFixed(8),
      nativeSymbol: chain.nativeCurrency?.symbol || 'ETH'
    };
  }

  /**
   * Private method to fetch gas prices from RPC
   */
  async _fetchGasPrices(chain, gasConfig) {
    const rpcUrl = chain.rpcUrls?.[0];
    if (!rpcUrl) {
      throw new Error('No RPC URL available for chain');
    }

    // Simulate RPC call (replace with actual Web3/ethers implementation)
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_gasPrice',
        params: [],
        id: 1
      })
    });

    if (!response.ok) {
      throw new Error(`RPC request failed: ${response.statusText}`);
    }

    const data = await response.json();
    const gasPrice = parseInt(data.result, 16);
    
    return this._processGasPrices(gasPrice, gasConfig);
  }

  /**
   * Process raw gas price data
   */
  _processGasPrices(baseGasPrice, gasConfig) {
    const baseFee = Math.floor(baseGasPrice * gasConfig.baseFeeMultiplier);
    const { min, max } = gasConfig.priorityFeeRange;
    
    return {
      slow: Math.floor(baseFee * GAS_SPEED_MULTIPLIERS.SLOW),
      standard: baseFee,
      fast: Math.floor(baseFee * GAS_SPEED_MULTIPLIERS.FAST),
      instant: Math.floor(baseFee * GAS_SPEED_MULTIPLIERS.INSTANT),
      baseFee,
      priorityFee: {
        min: min * Math.pow(10, 9), // Convert to wei
        max: max * Math.pow(10, 9)
      }
    };
  }

  /**
   * Estimate gas limit for transaction
   */
  async _estimateGasLimit(chainId, transaction) {
    // Determine transaction type and return appropriate gas limit
    if (transaction.data && transaction.data !== '0x') {
      if (transaction.to) {
        return DEFAULT_GAS_LIMITS.CONTRACT_INTERACTION;
      }
      return DEFAULT_GAS_LIMITS.CONTRACT_INTERACTION * 2; // Contract deployment
    }
    
    return DEFAULT_GAS_LIMITS.TRANSFER;
  }

  /**
   * Calculate EIP-1559 gas parameters
   */
  _calculateEIP1559Gas(gasPrices, gasLimit, multiplier) {
    const baseFee = gasPrices.baseFee;
    const priorityFee = gasPrices.priorityFee.min;
    
    return {
      gasLimit,
      maxFeePerGas: Math.floor((baseFee + priorityFee) * multiplier),
      maxPriorityFeePerGas: Math.floor(priorityFee * multiplier),
      baseFee,
      type: 'eip1559'
    };
  }

  /**
   * Calculate legacy gas parameters
   */
  _calculateLegacyGas(gasPrices, gasLimit, multiplier) {
    return {
      gasLimit,
      gasPrice: Math.floor(gasPrices.standard * multiplier),
      type: 'legacy'
    };
  }

  /**
   * Get fallback gas prices when RPC fails
   */
  _getFallbackGasPrices(chainId) {
    const gasConfig = CHAIN_GAS_CONFIGS[chainId];
    const basePrice = gasConfig.maxGasPrice * 0.1 * Math.pow(10, 9); // 10% of max in wei
    
    return {
      slow: Math.floor(basePrice * GAS_SPEED_MULTIPLIERS.SLOW),
      standard: basePrice,
      fast: Math.floor(basePrice * GAS_SPEED_MULTIPLIERS.FAST),
      instant: Math.floor(basePrice * GAS_SPEED_MULTIPLIERS.INSTANT),
      baseFee: basePrice,
      priorityFee: { min: Math.pow(10, 9), max: 5 * Math.pow(10, 9) }
    };
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
  }
}

// Export singleton instance
export const gasEstimator = new GasEstimator();

// Export utility functions
export const estimateGasForTransaction = (chainId, transaction, speed) => 
  gasEstimator.estimateGas(chainId, transaction, speed);

export const getGasPricesForChain = (chainId) => 
  gasEstimator.getGasPrices(chainId);

export const calculateTxCost = (chainId, gasEstimation) => 
  gasEstimator.calculateTransactionCost(chainId, gasEstimation);

export default gasEstimator;
