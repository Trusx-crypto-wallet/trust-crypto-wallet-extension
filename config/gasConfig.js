/**
 * Gas Configuration
 * 
 * Comprehensive gas management system for trust crypto wallet extension.
 * Provides gas price estimation, optimization strategies, and network-specific configurations.
 * Integrates with TokenConfig for chain-specific gas settings and price oracles.
 * 
 * @fileoverview Gas configuration system for trust crypto wallet extension
 * @version 1.0.0
 * @author trust crypto wallet team
 */

import { TokenConfig } from './tokenconfig.js';
import { logger } from '../src/utils/logger.js';

/**
 * Network-specific gas configurations
 * Based on actual network characteristics and usage patterns
 */
const NETWORK_GAS_CONFIGS = {
  // Ethereum Mainnet (Chain ID: 1)
  1: {
    chainId: 1,
    name: 'Ethereum',
    nativeToken: 'ETH',
    gasUnit: 'gwei',
    decimals: 9,
    baseFeeSupported: true, // EIP-1559
    maxPriorityFeeSupported: true,
    defaultGasLimit: {
      transfer: 21000,
      erc20Transfer: 65000,
      swap: 200000,
      bridge: 350000,
      contract: 500000,
      multiSig: 100000
    },
    gasPrice: {
      slow: 10,      // 10 gwei
      standard: 15,  // 15 gwei
      fast: 25,      // 25 gwei
      instant: 40    // 40 gwei
    },
    maxFeePerGas: {
      slow: 20,
      standard: 30,
      fast: 50,
      instant: 80
    },
    maxPriorityFeePerGas: {
      slow: 1,
      standard: 2,
      fast: 3,
      instant: 5
    },
    blockTime: 12, // seconds
    congestionThreshold: 50, // gwei
    maxGasPrice: 1000, // gwei max limit
    minGasPrice: 1     // gwei min limit
  },

  // BSC (Chain ID: 56)
  56: {
    chainId: 56,
    name: 'BNB Smart Chain',
    nativeToken: 'BNB',
    gasUnit: 'gwei',
    decimals: 9,
    baseFeeSupported: false,
    maxPriorityFeeSupported: false,
    defaultGasLimit: {
      transfer: 21000,
      erc20Transfer: 65000,
      swap: 180000,
      bridge: 300000,
      contract: 400000,
      multiSig: 80000
    },
    gasPrice: {
      slow: 3,       // 3 gwei
      standard: 5,   // 5 gwei
      fast: 8,       // 8 gwei
      instant: 12    // 12 gwei
    },
    blockTime: 3, // seconds
    congestionThreshold: 20, // gwei
    maxGasPrice: 100, // gwei max limit
    minGasPrice: 1    // gwei min limit
  },

  // Polygon (Chain ID: 137)
  137: {
    chainId: 137,
    name: 'Polygon',
    nativeToken: 'MATIC',
    gasUnit: 'gwei',
    decimals: 9,  
    baseFeeSupported: true, // EIP-1559
    maxPriorityFeeSupported: true,
    defaultGasLimit: {
      transfer: 21000,
      erc20Transfer: 65000,
      swap: 150000,
      bridge: 250000,
      contract: 350000,
      multiSig: 70000
    },
    gasPrice: {
      slow: 30,      // 30 gwei
      standard: 35,  // 35 gwei  
      fast: 45,      // 45 gwei
      instant: 60    // 60 gwei
    },
    maxFeePerGas: {
      slow: 40,
      standard: 50,
      fast: 70,
      instant: 100
    },
    maxPriorityFeePerGas: {
      slow: 30,
      standard: 35,
      fast: 45,
      instant: 60
    },
    blockTime: 2, // seconds
    congestionThreshold: 80, // gwei
    maxGasPrice: 500, // gwei max limit
    minGasPrice: 1    // gwei min limit
  },

  // Arbitrum (Chain ID: 42161)
  42161: {
    chainId: 42161,
    name: 'Arbitrum One',
    nativeToken: 'ETH',
    gasUnit: 'gwei',
    decimals: 9,
    baseFeeSupported: false,
    maxPriorityFeeSupported: false,
    defaultGasLimit: {
      transfer: 21000,
      erc20Transfer: 100000,
      swap: 500000,
      bridge: 800000,
      contract: 1000000,
      multiSig: 200000
    },
    gasPrice: {
      slow: 0.1,     // 0.1 gwei
      standard: 0.2, // 0.2 gwei
      fast: 0.3,     // 0.3 gwei
      instant: 0.5   // 0.5 gwei
    },
    blockTime: 0.25, // seconds (very fast)
    congestionThreshold: 1, // gwei
    maxGasPrice: 10, // gwei max limit
    minGasPrice: 0.01 // gwei min limit
  },

  // Optimism (Chain ID: 10)
  10: {
    chainId: 10,
    name: 'Optimism',
    nativeToken: 'ETH',
    gasUnit: 'gwei',
    decimals: 9,
    baseFeeSupported: true, // EIP-1559
    maxPriorityFeeSupported: true,
    defaultGasLimit: {
      transfer: 21000,
      erc20Transfer: 75000,
      swap: 200000,
      bridge: 400000,
      contract: 500000,
      multiSig: 120000
    },
    gasPrice: {
      slow: 0.001,   // 0.001 gwei
      standard: 0.001, // 0.001 gwei
      fast: 0.001,   // 0.001 gwei
      instant: 0.002 // 0.002 gwei
    },
    maxFeePerGas: {
      slow: 0.002,
      standard: 0.002,
      fast: 0.002,
      instant: 0.005
    },
    maxPriorityFeePerGas: {
      slow: 0.001,
      standard: 0.001,
      fast: 0.001,
      instant: 0.002
    },
    blockTime: 2, // seconds
    congestionThreshold: 0.01, // gwei
    maxGasPrice: 1, // gwei max limit
    minGasPrice: 0.001 // gwei min limit
  },

  // Avalanche (Chain ID: 43114)
  43114: {
    chainId: 43114,
    name: 'Avalanche',
    nativeToken: 'AVAX',
    gasUnit: 'navax', // nano AVAX
    decimals: 9,
    baseFeeSupported: true, // EIP-1559
    maxPriorityFeeSupported: true,
    defaultGasLimit: {
      transfer: 21000,
      erc20Transfer: 65000,
      swap: 180000,
      bridge: 300000,
      contract: 400000,
      multiSig: 90000
    },
    gasPrice: {
      slow: 25,      // 25 navax
      standard: 27,  // 27 navax
      fast: 30,      // 30 navax
      instant: 35    // 35 navax
    },
    maxFeePerGas: {
      slow: 30,
      standard: 35,
      fast: 40,
      instant: 50
    },
    maxPriorityFeePerGas: {
      slow: 1,
      standard: 2,
      fast: 3,
      instant: 5
    },
    blockTime: 2, // seconds
    congestionThreshold: 50, // navax
    maxGasPrice: 200, // navax max limit
    minGasPrice: 1    // navax min limit
  }
};

/**
 * Gas optimization strategies
 * Different strategies for different use cases
 */
const GAS_STRATEGIES = {
  economy: {
    name: 'Economy',
    description: 'Lowest gas price, slower confirmation',
    multiplier: 0.8,
    priority: 'slow',
    maxWaitTime: 1800, // 30 minutes
    recommended: ['Low priority transactions', 'Non-urgent swaps']
  },
  standard: {
    name: 'Standard',
    description: 'Balanced gas price and speed',
    multiplier: 1.0,
    priority: 'standard',
    maxWaitTime: 300, // 5 minutes
    recommended: ['Regular transfers', 'Most transactions']
  },
  fast: {
    name: 'Fast',
    description: 'Higher gas price, faster confirmation',
    multiplier: 1.3,
    priority: 'fast',
    maxWaitTime: 60, // 1 minute
    recommended: ['Time-sensitive transactions', 'DeFi interactions']
  },
  instant: {
    name: 'Instant',
    description: 'Highest gas price, fastest confirmation',
    multiplier: 1.8,
    priority: 'instant',
    maxWaitTime: 15, // 15 seconds
    recommended: ['Urgent transactions', 'MEV protection', 'Arbitrage']
  }
};

/**
 * Transaction type specific gas limits
 * More precise gas estimation based on transaction type
 */
const TRANSACTION_GAS_LIMITS = {
  // Basic transfers
  ethTransfer: 21000,
  erc20Transfer: 65000,
  
  // Token operations
  erc20Approve: 46000,
  erc20ApprovalRevoke: 24000,
  
  // DEX operations
  uniswapV2Swap: 150000,
  uniswapV3Swap: 180000,
  pancakeSwapSwap: 140000,
  sushiSwapSwap: 160000,
  
  // Bridge operations
  layerzeroSend: 350000,
  wormholeSend: 300000,
  chainlinkCCIPSend: 400000,
  axelarSend: 320000,
  hyperlaneSend: 280000,
  
  // Contract deployments
  erc20Deploy: 1200000,
  layerzeroOFTDeploy: 2500000,
  proxyDeploy: 800000,
  
  // Multi-signature operations
  multiSigSubmit: 80000,
  multiSigConfirm: 60000,
  multiSigExecute: 100000,
  
  // Staking operations
  stake: 120000,
  unstake: 100000,
  claimRewards: 80000,
  
  // NFT operations
  nftMint: 150000,
  nftTransfer: 85000,
  nftApprove: 50000
};

/**
 * Gas price oracles configuration
 * External sources for real-time gas price data
 */
const GAS_ORACLES = {
  ethereum: {
    primary: 'chainlink',
    fallbacks: ['internal'],
    sources: {
      chainlink: {
        enabled: true,
        weight: 0.7,
        updateInterval: 60000 // 1 minute
      },
      internal: {
        enabled: true,
        weight: 0.3,
        updateInterval: 120000 // 2 minutes
      }
    }
  },
  polygon: {
    primary: 'internal',
    fallbacks: [],
    sources: {
      internal: {
        enabled: true,
        weight: 1.0,
        updateInterval: 30000 // 30 seconds
      }
    }
  },
  bsc: {
    primary: 'internal',
    fallbacks: [],
    sources: {
      internal: {
        enabled: true,
        weight: 1.0,
        updateInterval: 15000 // 15 seconds
      }
    }
  },
  arbitrum: {
    primary: 'internal',
    fallbacks: [],
    sources: {
      internal: {
        enabled: true,
        weight: 1.0,
        updateInterval: 5000 // 5 seconds
      }
    }
  },
  optimism: {
    primary: 'internal',
    fallbacks: [],
    sources: {
      internal: {
        enabled: true,
        weight: 1.0,
        updateInterval: 10000 // 10 seconds
      }
    }
  },
  avalanche: {
    primary: 'internal',
    fallbacks: [],
    sources: {
      internal: {
        enabled: true,
        weight: 1.0,
        updateInterval: 10000 // 10 seconds
      }
    }
  }
};

/**
 * Gas Configuration Manager
 * Main class for managing gas configurations and calculations
 */
class GasConfigManager {
  constructor() {
    this.tokenConfig = null;
    this.gasPriceCache = new Map();
    this.lastUpdate = new Map();
    this.initialized = false;
  }

  /**
   * Initializes the gas configuration manager
   * @returns {Promise<void>}
   */
  async initialize() {
    try {
      this.tokenConfig = new TokenConfig();
      await this.tokenConfig.initialize();
      this.initialized = true;
      logger.info('GasConfigManager initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize GasConfigManager:', error);
      throw error;
    }
  }

  /**
   * Gets gas configuration for a specific network
   * @param {number} chainId - Network chain ID
   * @returns {Object|null} Gas configuration for the network
   */
  getNetworkGasConfig(chainId) {
    if (!this.initialized) {
      throw new Error('GasConfigManager not initialized');
    }

    const config = NETWORK_GAS_CONFIGS[chainId];
    if (!config) {
      logger.warn(`Gas configuration not found for chain ${chainId}`);
      return null;
    }

    return { ...config };
  }

  /**
   * Estimates gas limit for a transaction type
   * @param {string} transactionType - Type of transaction
   * @param {number} chainId - Network chain ID
   * @param {Object} [options={}] - Additional options
   * @returns {number} Estimated gas limit
   */
  estimateGasLimit(transactionType, chainId, options = {}) {
    try {
      const networkConfig = this.getNetworkGasConfig(chainId);
      if (!networkConfig) {
        throw new Error(`Network ${chainId} not supported`);
      }

      let gasLimit;

      // Check specific transaction type first
      if (TRANSACTION_GAS_LIMITS[transactionType]) {
        gasLimit = TRANSACTION_GAS_LIMITS[transactionType];
      } else {
        // Fallback to network defaults
        gasLimit = networkConfig.defaultGasLimit[transactionType] || 
                  networkConfig.defaultGasLimit.contract;
      }

      // Apply buffer for safety
      const buffer = options.buffer || 1.1; // 10% buffer by default
      gasLimit = Math.ceil(gasLimit * buffer);

      // Apply network-specific multipliers
      if (chainId === 42161) { // Arbitrum - higher gas limits
        gasLimit *= 2;
      } else if (chainId === 10) { // Optimism - moderate increase
        gasLimit *= 1.2;
      }

      return gasLimit;
    } catch (error) {
      logger.error(`Failed to estimate gas limit for ${transactionType}:`, error);
      return TRANSACTION_GAS_LIMITS.contract || 500000; // Safe fallback
    }
  }

  /**
   * Gets gas price for a strategy
   * @param {number} chainId - Network chain ID
   * @param {string} strategy - Gas strategy ('economy', 'standard', 'fast', 'instant')
   * @param {Object} [options={}] - Additional options
   * @returns {Object} Gas price configuration
   */
  getGasPrice(chainId, strategy = 'standard', options = {}) {
    try {
      const networkConfig = this.getNetworkGasConfig(chainId);
      if (!networkConfig) {
        throw new Error(`Network ${chainId} not supported`);
      }

      const strategyConfig = GAS_STRATEGIES[strategy];
      if (!strategyConfig) {
        throw new Error(`Strategy ${strategy} not supported`);
      }

      const priority = strategyConfig.priority;
      let gasPrice = networkConfig.gasPrice[priority];

      // Apply strategy multiplier
      gasPrice = gasPrice * strategyConfig.multiplier;

      // Apply custom multiplier if provided
      if (options.multiplier) {
        gasPrice *= options.multiplier;
      }

      // Ensure within bounds
      gasPrice = Math.max(gasPrice, networkConfig.minGasPrice);
      gasPrice = Math.min(gasPrice, networkConfig.maxGasPrice);

      const result = {
        chainId,
        strategy,
        gasPrice: Math.ceil(gasPrice),
        unit: networkConfig.gasUnit,
        estimatedTime: this._estimateConfirmationTime(chainId, gasPrice),
        priority: strategyConfig.priority
      };

      // Add EIP-1559 fields if supported
      if (networkConfig.baseFeeSupported) {
        result.maxFeePerGas = Math.ceil(networkConfig.maxFeePerGas[priority] * strategyConfig.multiplier);
        result.maxPriorityFeePerGas = Math.ceil(networkConfig.maxPriorityFeePerGas[priority] * strategyConfig.multiplier);
        result.type = 2; // EIP-1559 transaction
      } else {
        result.type = 0; // Legacy transaction
      }

      return result;
    } catch (error) {
      logger.error(`Failed to get gas price for chain ${chainId}:`, error);
      return this._getFallbackGasPrice(chainId);
    }
  }

  /**
   * Gets all available gas strategies for a network
   * @param {number} chainId - Network chain ID
   * @returns {Array} Array of gas strategies with prices
   */
  getAllGasStrategies(chainId) {
    try {
      const strategies = [];
      
      for (const [strategyName, strategyConfig] of Object.entries(GAS_STRATEGIES)) {
        const gasPrice = this.getGasPrice(chainId, strategyName);
        strategies.push({
          name: strategyName,
          ...strategyConfig,
          ...gasPrice
        });
      }

      return strategies;
    } catch (error) {
      logger.error(`Failed to get gas strategies for chain ${chainId}:`, error);
      return [];
    }
  }

  /**
   * Calculates transaction cost in native token
   * @param {number} chainId - Network chain ID
   * @param {number} gasLimit - Gas limit
   * @param {string} strategy - Gas strategy
   * @returns {Object} Transaction cost details
   */
  calculateTransactionCost(chainId, gasLimit, strategy = 'standard') {
    try {
      const networkConfig = this.getNetworkGasConfig(chainId);
      const gasPriceConfig = this.getGasPrice(chainId, strategy);
      
      if (!networkConfig || !gasPriceConfig) {
        throw new Error('Failed to get network or gas price config');
      }

      const gasPrice = gasPriceConfig.gasPrice;
      const gasCostWei = gasLimit * gasPrice * Math.pow(10, networkConfig.decimals);
      const gasCostNative = gasCostWei / Math.pow(10, 18); // Convert to native token units

      return {
        chainId,
        gasLimit,
        gasPrice,
        gasCostWei: gasCostWei.toString(),
        gasCostNative: gasCostNative.toFixed(8),
        nativeToken: networkConfig.nativeToken,
        strategy,
        estimatedTime: gasPriceConfig.estimatedTime
      };
    } catch (error) {
      logger.error('Failed to calculate transaction cost:', error);
      return null;
    }
  }

  /**
   * Estimates confirmation time based on gas price and network
   * @private
   * @param {number} chainId - Network chain ID
   * @param {number} gasPrice - Gas price
   * @returns {number} Estimated confirmation time in seconds
   */
  _estimateConfirmationTime(chainId, gasPrice) {
    const networkConfig = NETWORK_GAS_CONFIGS[chainId];
    if (!networkConfig) return 60; // 1 minute fallback

    const baseTime = networkConfig.blockTime;
    const congestionThreshold = networkConfig.congestionThreshold;

    // Fast networks (Arbitrum, Avalanche, BSC)
    if (chainId === 42161) return baseTime * 4; // ~1 second
    if (chainId === 43114 || chainId === 56) return baseTime * 2; // ~4-6 seconds

    // Calculate based on gas price relative to congestion threshold
    const congestionMultiplier = Math.max(1, congestionThreshold / gasPrice);
    return Math.ceil(baseTime * congestionMultiplier * 2);
  }

  /**
   * Gets fallback gas price configuration
   * @private
   * @param {number} chainId - Network chain ID
   * @returns {Object} Fallback gas price
   */
  _getFallbackGasPrice(chainId) {
    const networkConfig = NETWORK_GAS_CONFIGS[chainId];
    if (!networkConfig) {
      return {
        chainId,
        strategy: 'standard',
        gasPrice: 20,
        unit: 'gwei',
        estimatedTime: 180,
        priority: 'standard',
        type: 0
      };
    }

    return {
      chainId,
      strategy: 'standard',
      gasPrice: networkConfig.gasPrice.standard,
      unit: networkConfig.gasUnit,
      estimatedTime: this._estimateConfirmationTime(chainId, networkConfig.gasPrice.standard),
      priority: 'standard',
      type: networkConfig.baseFeeSupported ? 2 : 0
    };
  }

  /**
   * Gets supported networks for gas configuration
   * @returns {Array<number>} Array of supported chain IDs
   */
  getSupportedNetworks() {
    return Object.keys(NETWORK_GAS_CONFIGS).map(Number);
  }

  /**
   * Validates gas configuration parameters
   * @param {Object} gasConfig - Gas configuration to validate
   * @returns {boolean} True if valid
   */
  validateGasConfig(gasConfig) {
    try {
      if (!gasConfig || typeof gasConfig !== 'object') {
        return false;
      }

      const required = ['chainId', 'gasPrice', 'gasLimit'];
      return required.every(field => gasConfig.hasOwnProperty(field));
    } catch (error) {
      logger.error('Gas config validation failed:', error);
      return false;
    }
  }
}

// Create global instance
const gasConfigManager = new GasConfigManager();

/**
 * Initializes the gas configuration system
 * @returns {Promise<void>}
 */
export const initializeGasConfig = async () => {
  return await gasConfigManager.initialize();
};

/**
 * Gets gas configuration for a network
 * @param {number} chainId - Network chain ID
 * @returns {Object|null} Gas configuration
 */
export const getNetworkGasConfig = (chainId) => {
  return gasConfigManager.getNetworkGasConfig(chainId);
};

/**
 * Estimates gas limit for a transaction
 * @param {string} transactionType - Transaction type
 * @param {number} chainId - Network chain ID
 * @param {Object} [options={}] - Additional options
 * @returns {number} Estimated gas limit
 */
export const estimateGasLimit = (transactionType, chainId, options = {}) => {
  return gasConfigManager.estimateGasLimit(transactionType, chainId, options);
};

/**
 * Gets gas price for a strategy
 * @param {number} chainId - Network chain ID
 * @param {string} [strategy='standard'] - Gas strategy
 * @param {Object} [options={}] - Additional options
 * @returns {Object} Gas price configuration
 */
export const getGasPrice = (chainId, strategy = 'standard', options = {}) => {
  return gasConfigManager.getGasPrice(chainId, strategy, options);
};

/**
 * Gets all gas strategies for a network
 * @param {number} chainId - Network chain ID
 * @returns {Array} Gas strategies with prices
 */
export const getAllGasStrategies = (chainId) => {
  return gasConfigManager.getAllGasStrategies(chainId);
};

/**
 * Calculates transaction cost
 * @param {number} chainId - Network chain ID
 * @param {number} gasLimit - Gas limit
 * @param {string} [strategy='standard'] - Gas strategy
 * @returns {Object|null} Transaction cost details
 */
export const calculateTransactionCost = (chainId, gasLimit, strategy = 'standard') => {
  return gasConfigManager.calculateTransactionCost(chainId, gasLimit, strategy);
};

/**
 * Pre-configured gas settings for immediate access
 */
export const gasConfig = {
  networks: NETWORK_GAS_CONFIGS,
  strategies: GAS_STRATEGIES,
  transactionLimits: TRANSACTION_GAS_LIMITS,
  oracles: GAS_ORACLES
};

/**
 * Gas strategies configuration
 */
export const gasStrategies = GAS_STRATEGIES;

/**
 * Network gas configurations
 */
export const networkGasConfigs = NETWORK_GAS_CONFIGS;

/**
 * Transaction gas limits
 */
export const transactionGasLimits = TRANSACTION_GAS_LIMITS;

export default {
  gasConfig,
  initializeGasConfig,
  getNetworkGasConfig,
  estimateGasLimit,
  getGasPrice,
  getAllGasStrategies,
  calculateTransactionCost,
  gasStrategies,
  networkGasConfigs,
  transactionGasLimits,
  GasConfigManager
};
