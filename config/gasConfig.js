// config/gasConfig.js
// Enhanced Production Gas Configuration - Gas policies and optimization strategies
// Static gas-policy table with dynamic pricing, EIP-1559 support, and cross-chain optimization
// Integrates with Trust Crypto Wallet structure and LayerZero cross-chain deployments

const { CHAIN_IDS } = require('./tokenConfig');
const { CHAINS } = require('./chainsConfig');

// Gas pricing strategies
const GAS_STRATEGIES = Object.freeze({
  ECONOMY: 'economy',      // Lowest cost, slower confirmation
  STANDARD: 'standard',    // Balanced cost and speed
  FAST: 'fast',           // Higher cost, faster confirmation
  INSTANT: 'instant',     // Highest cost, immediate confirmation
  CUSTOM: 'custom'        // User-defined pricing
});

// Gas pricing models
const PRICING_MODELS = Object.freeze({
  LEGACY: 'legacy',       // Legacy gas pricing (gasPrice only)
  EIP1559: 'eip1559',    // EIP-1559 with base fee + priority fee
  OPTIMISTIC: 'optimistic', // Optimistic rollup pricing
  ARBITRUM: 'arbitrum'    // Arbitrum-specific pricing
});

// Transaction types for gas estimation
const TRANSACTION_TYPES = Object.freeze({
  NATIVE_TRANSFER: 'native_transfer',
  TOKEN_TRANSFER: 'token_transfer',
  TOKEN_APPROVAL: 'token_approval',
  CONTRACT_INTERACTION: 'contract_interaction',
  DEX_SWAP: 'dex_swap',
  BRIDGE_TRANSFER: 'bridge_transfer',
  LAYERZERO_SEND: 'layerzero_send',
  NFT_TRANSFER: 'nft_transfer',
  MULTI_SEND: 'multi_send',
  CONTRACT_DEPLOYMENT: 'contract_deployment'
});

// Gas estimation strategies
const GAS_ESTIMATION_STRATEGIES = Object.freeze({
  CONSERVATIVE: 'conservative',  // Higher estimates for safety
  AGGRESSIVE: 'aggressive',      // Lower estimates for cost savings
  DYNAMIC: 'dynamic',           // Adaptive based on network conditions
  HISTORICAL: 'historical'      // Based on historical data
});

// Network congestion levels
const CONGESTION_LEVELS = Object.freeze({
  LOW: 'low',          // < 30% block utilization
  MODERATE: 'moderate', // 30-70% block utilization
  HIGH: 'high',        // 70-90% block utilization
  SEVERE: 'severe'     // > 90% block utilization
});

// Enhanced gas configurations with EIP-1559 support
const GAS_CONFIGURATIONS = Object.freeze({
  // ── Ethereum Mainnet ───────────────────────────────────────
  [CHAIN_IDS[CHAINS.ETHEREUM]]: {
    chainName: 'Ethereum',
    nativeSymbol: 'ETH',
    pricingModel: PRICING_MODELS.EIP1559,
    
    // Legacy gas pricing (gwei)
    gasPrice: {
      [GAS_STRATEGIES.ECONOMY]: { min: 5, default: 15, max: 25 },
      [GAS_STRATEGIES.STANDARD]: { min: 15, default: 30, max: 50 },
      [GAS_STRATEGIES.FAST]: { min: 30, default: 60, max: 100 },
      [GAS_STRATEGIES.INSTANT]: { min: 60, default: 120, max: 200 }
    },
    
    // EIP-1559 pricing (gwei)
    eip1559: {
      [GAS_STRATEGIES.ECONOMY]: { maxFeePerGas: 10, maxPriorityFeePerGas: 1, estimatedBaseFee: 5 },
      [GAS_STRATEGIES.STANDARD]: { maxFeePerGas: 15, maxPriorityFeePerGas: 2, estimatedBaseFee: 8 },
      [GAS_STRATEGIES.FAST]: { maxFeePerGas: 30, maxPriorityFeePerGas: 3, estimatedBaseFee: 15 },
      [GAS_STRATEGIES.INSTANT]: { maxFeePerGas: 60, maxPriorityFeePerGas: 5, estimatedBaseFee: 25 }
    },
    
    gasLimits: {
      [TRANSACTION_TYPES.NATIVE_TRANSFER]: 21_000,
      [TRANSACTION_TYPES.TOKEN_TRANSFER]: 55_000,
      [TRANSACTION_TYPES.TOKEN_APPROVAL]: 45_000,
      [TRANSACTION_TYPES.CONTRACT_INTERACTION]: 150_000,
      [TRANSACTION_TYPES.DEX_SWAP]: 250_000,
      [TRANSACTION_TYPES.BRIDGE_TRANSFER]: 300_000,
      [TRANSACTION_TYPES.LAYERZERO_SEND]: 400_000,
      [TRANSACTION_TYPES.NFT_TRANSFER]: 75_000,
      [TRANSACTION_TYPES.MULTI_SEND]: 120_000,
      [TRANSACTION_TYPES.CONTRACT_DEPLOYMENT]: 1_500_000
    },
    
    optimization: {
      enabled: false,
      maxGasIncrease: 1.0,
      dynamicAdjustment: false,
      networkCongestionThreshold: 1.0
    },
    
    feeEstimation: {
      confirmationTarget: 1,
      updateInterval: 30000,
      fallbackGasPrice: 8,
      maxFeeHistory: 5
    }
  },

  [CHAIN_IDS.BASE_SEPOLIA]: {
    chainName: 'Base Sepolia',
    nativeSymbol: 'ETH',
    pricingModel: PRICING_MODELS.OPTIMISTIC,
    
    gasPrice: {
      [GAS_STRATEGIES.ECONOMY]: { min: 0.005, default: 0.01, max: 0.02 },
      [GAS_STRATEGIES.STANDARD]: { min: 0.01, default: 0.02, max: 0.05 },
      [GAS_STRATEGIES.FAST]: { min: 0.02, default: 0.05, max: 0.1 },
      [GAS_STRATEGIES.INSTANT]: { min: 0.05, default: 0.1, max: 0.2 }
    },
    
    gasLimits: {
      [TRANSACTION_TYPES.NATIVE_TRANSFER]: 21_000,
      [TRANSACTION_TYPES.TOKEN_TRANSFER]: 50_000,
      [TRANSACTION_TYPES.TOKEN_APPROVAL]: 40_000,
      [TRANSACTION_TYPES.CONTRACT_INTERACTION]: 140_000,
      [TRANSACTION_TYPES.DEX_SWAP]: 200_000,
      [TRANSACTION_TYPES.BRIDGE_TRANSFER]: 250_000,
      [TRANSACTION_TYPES.LAYERZERO_SEND]: 350_000,
      [TRANSACTION_TYPES.NFT_TRANSFER]: 70_000,
      [TRANSACTION_TYPES.MULTI_SEND]: 100_000,
      [TRANSACTION_TYPES.CONTRACT_DEPLOYMENT]: 1_200_000
    },
    
    optimization: {
      enabled: false,
      maxGasIncrease: 1.0,
      dynamicAdjustment: false,
      networkCongestionThreshold: 1.0
    },
    
    feeEstimation: {
      confirmationTarget: 1,
      updateInterval: 30000,
      fallbackGasPrice: 0.02,
      maxFeeHistory: 5
    }
  }
});

// Enhanced utility functions for gas management
const getGasConfigForChain = (chainId) => {
  return GAS_CONFIGURATIONS[chainId] || null;
};

const getGasPriceForStrategy = (chainId, strategy) => {
  const config = GAS_CONFIGURATIONS[chainId];
  if (!config || !config.gasPrice[strategy]) {
    return null;
  }
  return config.gasPrice[strategy];
};

const getEIP1559ForStrategy = (chainId, strategy) => {
  const config = GAS_CONFIGURATIONS[chainId];
  if (!config || !config.eip1559 || !config.eip1559[strategy]) {
    return null;
  }
  return config.eip1559[strategy];
};

const getGasLimitForTransaction = (chainId, transactionType) => {
  const config = GAS_CONFIGURATIONS[chainId];
  if (!config || !config.gasLimits[transactionType]) {
    return null;
  }
  return config.gasLimits[transactionType];
};

const estimateTransactionCost = (chainId, transactionType, strategy = GAS_STRATEGIES.STANDARD) => {
  const config = GAS_CONFIGURATIONS[chainId];
  if (!config) {
    return null;
  }
  
  const gasLimit = config.gasLimits[transactionType];
  const gasPrice = config.gasPrice[strategy]?.default;
  
  if (!gasLimit || !gasPrice) {
    return null;
  }
  
  return {
    gasLimit,
    gasPrice,
    estimatedCost: gasLimit * gasPrice, // in gwei
    strategy,
    chainId,
    nativeSymbol: config.nativeSymbol
  };
};

const estimateEIP1559Cost = (chainId, transactionType, strategy = GAS_STRATEGIES.STANDARD) => {
  const config = GAS_CONFIGURATIONS[chainId];
  if (!config || !isEIP1559Supported(chainId)) {
    return null;
  }
  
  const gasLimit = config.gasLimits[transactionType];
  const eip1559 = config.eip1559[strategy];
  
  if (!gasLimit || !eip1559) {
    return null;
  }
  
  return {
    gasLimit,
    maxFeePerGas: eip1559.maxFeePerGas,
    maxPriorityFeePerGas: eip1559.maxPriorityFeePerGas,
    estimatedBaseFee: eip1559.estimatedBaseFee,
    estimatedCost: gasLimit * eip1559.maxFeePerGas, // worst case in gwei
    strategy,
    chainId,
    nativeSymbol: config.nativeSymbol
  };
};

const isEIP1559Supported = (chainId) => {
  const config = GAS_CONFIGURATIONS[chainId];
  return config?.pricingModel === PRICING_MODELS.EIP1559;
};

const isArbitrumNetwork = (chainId) => {
  const config = GAS_CONFIGURATIONS[chainId];
  return config?.pricingModel === PRICING_MODELS.ARBITRUM;
};

const isOptimisticNetwork = (chainId) => {
  const config = GAS_CONFIGURATIONS[chainId];
  return config?.pricingModel === PRICING_MODELS.OPTIMISTIC;
};

const getOptimizationSettings = (chainId) => {
  const config = GAS_CONFIGURATIONS[chainId];
  return config?.optimization || null;
};

const getFeeEstimationSettings = (chainId) => {
  const config = GAS_CONFIGURATIONS[chainId];
  return config?.feeEstimation || null;
};

const getSupportedStrategies = () => Object.values(GAS_STRATEGIES);

const getSupportedTransactionTypes = () => Object.values(TRANSACTION_TYPES);

const getPricingModel = (chainId) => {
  const config = GAS_CONFIGURATIONS[chainId];
  return config?.pricingModel || PRICING_MODELS.LEGACY;
};

const getChainNativeSymbol = (chainId) => {
  const config = GAS_CONFIGURATIONS[chainId];
  return config?.nativeSymbol || 'ETH';
};

const getChainName = (chainId) => {
  const config = GAS_CONFIGURATIONS[chainId];
  return config?.chainName || 'Unknown';
};

const validateGasConfig = (chainId, strategy, transactionType) => {
  const config = GAS_CONFIGURATIONS[chainId];
  
  if (!config) {
    return { isValid: false, error: 'Chain not supported' };
  }
  
  if (!config.gasPrice[strategy]) {
    return { isValid: false, error: 'Strategy not supported' };
  }
  
  if (!config.gasLimits[transactionType]) {
    return { isValid: false, error: 'Transaction type not supported' };
  }
  
  return { isValid: true };
};

const calculateDynamicGasPrice = (chainId, strategy, congestionLevel) => {
  const basePrice = getGasPriceForStrategy(chainId, strategy);
  if (!basePrice) return null;
  
  const multipliers = {
    [CONGESTION_LEVELS.LOW]: 0.8,
    [CONGESTION_LEVELS.MODERATE]: 1.0,
    [CONGESTION_LEVELS.HIGH]: 1.3,
    [CONGESTION_LEVELS.SEVERE]: 1.6
  };
  
  const multiplier = multipliers[congestionLevel] || 1.0;
  
  return {
    min: Math.round(basePrice.min * multiplier * 100) / 100,
    default: Math.round(basePrice.default * multiplier * 100) / 100,
    max: Math.round(basePrice.max * multiplier * 100) / 100,
    congestionLevel,
    multiplier
  };
};

const getLayerZeroGasSettings = (chainId) => {
  const config = GAS_CONFIGURATIONS[chainId];
  if (!config) return null;
  
  return {
    gasLimit: config.gasLimits[TRANSACTION_TYPES.LAYERZERO_SEND],
    gasPrice: config.gasPrice[GAS_STRATEGIES.STANDARD],
    eip1559: config.eip1559?.[GAS_STRATEGIES.STANDARD],
    optimization: config.optimization,
    pricingModel: config.pricingModel,
    nativeSymbol: config.nativeSymbol
  };
};

const getBridgeGasSettings = (chainId) => {
  const config = GAS_CONFIGURATIONS[chainId];
  if (!config) return null;
  
  return {
    gasLimit: config.gasLimits[TRANSACTION_TYPES.BRIDGE_TRANSFER],
    gasPrice: config.gasPrice[GAS_STRATEGIES.FAST], // Use fast for bridges
    eip1559: config.eip1559?.[GAS_STRATEGIES.FAST],
    optimization: config.optimization,
    pricingModel: config.pricingModel,
    nativeSymbol: config.nativeSymbol
  };
};

const getDEXSwapGasSettings = (chainId) => {
  const config = GAS_CONFIGURATIONS[chainId];
  if (!config) return null;
  
  return {
    gasLimit: config.gasLimits[TRANSACTION_TYPES.DEX_SWAP],
    gasPrice: config.gasPrice[GAS_STRATEGIES.STANDARD],
    eip1559: config.eip1559?.[GAS_STRATEGIES.STANDARD],
    optimization: config.optimization,
    pricingModel: config.pricingModel,
    nativeSymbol: config.nativeSymbol
  };
};

const getArbitrumSpecificSettings = (chainId) => {
  const config = GAS_CONFIGURATIONS[chainId];
  if (!config || !isArbitrumNetwork(chainId)) {
    return null;
  }
  return config.arbitrum || null;
};

const getOptimismSpecificSettings = (chainId) => {
  const config = GAS_CONFIGURATIONS[chainId];
  if (!config || !isOptimisticNetwork(chainId)) {
    return null;
  }
  return config.optimism || null;
};

const getAllSupportedChains = () => {
  return Object.keys(GAS_CONFIGURATIONS).map(chainId => ({
    chainId: Number(chainId),
    chainName: GAS_CONFIGURATIONS[chainId].chainName,
    nativeSymbol: GAS_CONFIGURATIONS[chainId].nativeSymbol,
    pricingModel: GAS_CONFIGURATIONS[chainId].pricingModel
  }));
};

const getMainnetChains = () => {
  return getAllSupportedChains().filter(chain => 
    ![
      CHAIN_IDS.ETHEREUM_SEPOLIA,
      CHAIN_IDS.ARBITRUM_SEPOLIA,
      CHAIN_IDS.OPTIMISM_SEPOLIA,
      CHAIN_IDS.BSC_TESTNET,
      CHAIN_IDS.AVALANCHE_FUJI,
      CHAIN_IDS.POLYGON_AMOY,
      CHAIN_IDS.BASE_SEPOLIA
    ].includes(chain.chainId)
  );
};

const getTestnetChains = () => {
  return getAllSupportedChains().filter(chain => 
    [
      CHAIN_IDS.ETHEREUM_SEPOLIA,
      CHAIN_IDS.ARBITRUM_SEPOLIA,
      CHAIN_IDS.OPTIMISM_SEPOLIA,
      CHAIN_IDS.BSC_TESTNET,
      CHAIN_IDS.AVALANCHE_FUJI,
      CHAIN_IDS.POLYGON_AMOY,
      CHAIN_IDS.BASE_SEPOLIA
    ].includes(chain.chainId)
  );
};

// Export all configurations and utilities
module.exports = {
  // Core configurations
  GAS_CONFIGURATIONS,
  
  // Constants
  GAS_STRATEGIES,
  PRICING_MODELS,
  TRANSACTION_TYPES,
  GAS_ESTIMATION_STRATEGIES,
  CONGESTION_LEVELS,
  
  // Utility functions
  getGasConfigForChain,
  getGasPriceForStrategy,
  getEIP1559ForStrategy,
  getGasLimitForTransaction,
  estimateTransactionCost,
  estimateEIP1559Cost,
  isEIP1559Supported,
  isArbitrumNetwork,
  isOptimisticNetwork,
  getOptimizationSettings,
  getFeeEstimationSettings,
  getSupportedStrategies,
  getSupportedTransactionTypes,
  getPricingModel,
  getChainNativeSymbol,
  getChainName,
  validateGasConfig,
  calculateDynamicGasPrice,
  getLayerZeroGasSettings,
  getBridgeGasSettings,
  getDEXSwapGasSettings,
  getArbitrumSpecificSettings,
  getOptimismSpecificSettings,
  getAllSupportedChains,
  getMainnetChains,
  getTestnetChains
};]: { 
        maxFeePerGas: 25, 
        maxPriorityFeePerGas: 1,
        estimatedBaseFee: 15
      },
      [GAS_STRATEGIES.STANDARD]: { 
        maxFeePerGas: 50, 
        maxPriorityFeePerGas: 2,
        estimatedBaseFee: 25
      },
      [GAS_STRATEGIES.FAST]: { 
        maxFeePerGas: 100, 
        maxPriorityFeePerGas: 3,
        estimatedBaseFee: 40
      },
      [GAS_STRATEGIES.INSTANT]: { 
        maxFeePerGas: 200, 
        maxPriorityFeePerGas: 5,
        estimatedBaseFee: 60
      }
    },
    
    // Gas limits for different transaction types
    gasLimits: {
      [TRANSACTION_TYPES.NATIVE_TRANSFER]: 21_000,
      [TRANSACTION_TYPES.TOKEN_TRANSFER]: 65_000,
      [TRANSACTION_TYPES.TOKEN_APPROVAL]: 50_000,
      [TRANSACTION_TYPES.CONTRACT_INTERACTION]: 200_000,
      [TRANSACTION_TYPES.DEX_SWAP]: 350_000,
      [TRANSACTION_TYPES.BRIDGE_TRANSFER]: 400_000,
      [TRANSACTION_TYPES.LAYERZERO_SEND]: 500_000,
      [TRANSACTION_TYPES.NFT_TRANSFER]: 85_000,
      [TRANSACTION_TYPES.MULTI_SEND]: 150_000,
      [TRANSACTION_TYPES.CONTRACT_DEPLOYMENT]: 2_000_000
    },
    
    // Gas optimization settings
    optimization: {
      enabled: true,
      maxGasIncrease: 1.2, // 20% increase limit
      dynamicAdjustment: true,
      networkCongestionThreshold: 0.8
    },
    
    // Fee estimation settings
    feeEstimation: {
      confirmationTarget: 3, // blocks
      updateInterval: 15000, // 15 seconds
      fallbackGasPrice: 30,
      maxFeeHistory: 10
    }
  },

  // ── Polygon Mainnet ────────────────────────────────────────
  [CHAIN_IDS[CHAINS.POLYGON]]: {
    chainName: 'Polygon',
    nativeSymbol: 'MATIC',
    pricingModel: PRICING_MODELS.EIP1559,
    
    gasPrice: {
      [GAS_STRATEGIES.ECONOMY]: { min: 2, default: 8, max: 15 },
      [GAS_STRATEGIES.STANDARD]: { min: 8, default: 40, max: 80 },
      [GAS_STRATEGIES.FAST]: { min: 40, default: 100, max: 150 },
      [GAS_STRATEGIES.INSTANT]: { min: 100, default: 200, max: 300 }
    },
    
    eip1559: {
      [GAS_STRATEGIES.ECONOMY]: { 
        maxFeePerGas: 15, 
        maxPriorityFeePerGas: 1,
        estimatedBaseFee: 8
      },
      [GAS_STRATEGIES.STANDARD]: { 
        maxFeePerGas: 80, 
        maxPriorityFeePerGas: 2,
        estimatedBaseFee: 30
      },
      [GAS_STRATEGIES.FAST]: { 
        maxFeePerGas: 150, 
        maxPriorityFeePerGas: 3,
        estimatedBaseFee: 50
      },
      [GAS_STRATEGIES.INSTANT]: { 
        maxFeePerGas: 300, 
        maxPriorityFeePerGas: 5,
        estimatedBaseFee: 80
      }
    },
    
    gasLimits: {
      [TRANSACTION_TYPES.NATIVE_TRANSFER]: 21_000,
      [TRANSACTION_TYPES.TOKEN_TRANSFER]: 55_000,
      [TRANSACTION_TYPES.TOKEN_APPROVAL]: 45_000,
      [TRANSACTION_TYPES.CONTRACT_INTERACTION]: 150_000,
      [TRANSACTION_TYPES.DEX_SWAP]: 250_000,
      [TRANSACTION_TYPES.BRIDGE_TRANSFER]: 300_000,
      [TRANSACTION_TYPES.LAYERZERO_SEND]: 400_000,
      [TRANSACTION_TYPES.NFT_TRANSFER]: 75_000,
      [TRANSACTION_TYPES.MULTI_SEND]: 120_000,
      [TRANSACTION_TYPES.CONTRACT_DEPLOYMENT]: 1_500_000
    },
    
    optimization: {
      enabled: true,
      maxGasIncrease: 1.15,
      dynamicAdjustment: true,
      networkCongestionThreshold: 0.7
    },
    
    feeEstimation: {
      confirmationTarget: 2,
      updateInterval: 10000,
      fallbackGasPrice: 40,
      maxFeeHistory: 15
    }
  },

  // ── BSC Mainnet ────────────────────────────────────────────
  [CHAIN_IDS[CHAINS.BSC]]: {
    chainName: 'BNB Smart Chain',
    nativeSymbol: 'BNB',
    pricingModel: PRICING_MODELS.LEGACY,
    
    gasPrice: {
      [GAS_STRATEGIES.ECONOMY]: { min: 3, default: 5, max: 8 },
      [GAS_STRATEGIES.STANDARD]: { min: 5, default: 10, max: 15 },
      [GAS_STRATEGIES.FAST]: { min: 10, default: 20, max: 30 },
      [GAS_STRATEGIES.INSTANT]: { min: 20, default: 40, max: 60 }
    },
    
    gasLimits: {
      [TRANSACTION_TYPES.NATIVE_TRANSFER]: 21_000,
      [TRANSACTION_TYPES.TOKEN_TRANSFER]: 60_000,
      [TRANSACTION_TYPES.TOKEN_APPROVAL]: 50_000,
      [TRANSACTION_TYPES.CONTRACT_INTERACTION]: 180_000,
      [TRANSACTION_TYPES.DEX_SWAP]: 300_000,
      [TRANSACTION_TYPES.BRIDGE_TRANSFER]: 350_000,
      [TRANSACTION_TYPES.LAYERZERO_SEND]: 450_000,
      [TRANSACTION_TYPES.NFT_TRANSFER]: 80_000,
      [TRANSACTION_TYPES.MULTI_SEND]: 140_000,
      [TRANSACTION_TYPES.CONTRACT_DEPLOYMENT]: 1_800_000
    },
    
    optimization: {
      enabled: true,
      maxGasIncrease: 1.1,
      dynamicAdjustment: false,
      networkCongestionThreshold: 0.9
    },
    
    feeEstimation: {
      confirmationTarget: 1,
      updateInterval: 5000,
      fallbackGasPrice: 10,
      maxFeeHistory: 20
    }
  },

  // ── Arbitrum Mainnet ───────────────────────────────────────
  [CHAIN_IDS[CHAINS.ARBITRUM]]: {
    chainName: 'Arbitrum One',
    nativeSymbol: 'ETH',
    pricingModel: PRICING_MODELS.ARBITRUM,
    
    gasPrice: {
      [GAS_STRATEGIES.ECONOMY]: { min: 0.05, default: 0.1, max: 0.2 },
      [GAS_STRATEGIES.STANDARD]: { min: 0.1, default: 0.2, max: 0.5 },
      [GAS_STRATEGIES.FAST]: { min: 0.2, default: 0.5, max: 1.0 },
      [GAS_STRATEGIES.INSTANT]: { min: 0.5, default: 1.0, max: 2.0 }
    },
    
    gasLimits: {
      [TRANSACTION_TYPES.NATIVE_TRANSFER]: 21_000,
      [TRANSACTION_TYPES.TOKEN_TRANSFER]: 50_000,
      [TRANSACTION_TYPES.TOKEN_APPROVAL]: 40_000,
      [TRANSACTION_TYPES.CONTRACT_INTERACTION]: 140_000,
      [TRANSACTION_TYPES.DEX_SWAP]: 200_000,
      [TRANSACTION_TYPES.BRIDGE_TRANSFER]: 250_000,
      [TRANSACTION_TYPES.LAYERZERO_SEND]: 350_000,
      [TRANSACTION_TYPES.NFT_TRANSFER]: 70_000,
      [TRANSACTION_TYPES.MULTI_SEND]: 100_000,
      [TRANSACTION_TYPES.CONTRACT_DEPLOYMENT]: 1_200_000
    },
    
    // Arbitrum-specific settings
    arbitrum: {
      l1GasPrice: 30, // L1 gas price in gwei
      l2GasPrice: 0.2, // L2 gas price in gwei
      l1GasPerPubdata: 16,
      overhead: 2100
    },
    
    optimization: {
      enabled: true,
      maxGasIncrease: 1.05,
      dynamicAdjustment: true,
      networkCongestionThreshold: 0.95
    },
    
    feeEstimation: {
      confirmationTarget: 1,
      updateInterval: 3000,
      fallbackGasPrice: 0.2,
      maxFeeHistory: 25
    }
  },

  // ── Optimism Mainnet ───────────────────────────────────────
  [CHAIN_IDS[CHAINS.OPTIMISM]]: {
    chainName: 'Optimism',
    nativeSymbol: 'ETH',
    pricingModel: PRICING_MODELS.OPTIMISTIC,
    
    gasPrice: {
      [GAS_STRATEGIES.ECONOMY]: { min: 0.01, default: 0.05, max: 0.1 },
      [GAS_STRATEGIES.STANDARD]: { min: 0.05, default: 0.1, max: 0.2 },
      [GAS_STRATEGIES.FAST]: { min: 0.1, default: 0.3, max: 0.5 },
      [GAS_STRATEGIES.INSTANT]: { min: 0.3, default: 0.5, max: 1.0 }
    },
    
    gasLimits: {
      [TRANSACTION_TYPES.NATIVE_TRANSFER]: 21_000,
      [TRANSACTION_TYPES.TOKEN_TRANSFER]: 50_000,
      [TRANSACTION_TYPES.TOKEN_APPROVAL]: 40_000,
      [TRANSACTION_TYPES.CONTRACT_INTERACTION]: 140_000,
      [TRANSACTION_TYPES.DEX_SWAP]: 200_000,
      [TRANSACTION_TYPES.BRIDGE_TRANSFER]: 250_000,
      [TRANSACTION_TYPES.LAYERZERO_SEND]: 350_000,
      [TRANSACTION_TYPES.NFT_TRANSFER]: 70_000,
      [TRANSACTION_TYPES.MULTI_SEND]: 100_000,
      [TRANSACTION_TYPES.CONTRACT_DEPLOYMENT]: 1_200_000
    },
    
    // Optimism-specific settings
    optimism: {
      l1GasPrice: 30,
      scalar: 0.684,
      overhead: 188,
      decimals: 6
    },
    
    optimization: {
      enabled: true,
      maxGasIncrease: 1.05,
      dynamicAdjustment: true,
      networkCongestionThreshold: 0.95
    },
    
    feeEstimation: {
      confirmationTarget: 1,
      updateInterval: 3000,
      fallbackGasPrice: 0.1,
      maxFeeHistory: 25
    }
  },

  // ── Avalanche Mainnet ──────────────────────────────────────
  [CHAIN_IDS[CHAINS.AVALANCHE]]: {
    chainName: 'Avalanche',
    nativeSymbol: 'AVAX',
    pricingModel: PRICING_MODELS.LEGACY,
    
    gasPrice: {
      [GAS_STRATEGIES.ECONOMY]: { min: 25, default: 35, max: 50 },
      [GAS_STRATEGIES.STANDARD]: { min: 35, default: 50, max: 75 },
      [GAS_STRATEGIES.FAST]: { min: 50, default: 100, max: 150 },
      [GAS_STRATEGIES.INSTANT]: { min: 100, default: 225, max: 300 }
    },
    
    gasLimits: {
      [TRANSACTION_TYPES.NATIVE_TRANSFER]: 21_000,
      [TRANSACTION_TYPES.TOKEN_TRANSFER]: 60_000,
      [TRANSACTION_TYPES.TOKEN_APPROVAL]: 50_000,
      [TRANSACTION_TYPES.CONTRACT_INTERACTION]: 180_000,
      [TRANSACTION_TYPES.DEX_SWAP]: 300_000,
      [TRANSACTION_TYPES.BRIDGE_TRANSFER]: 350_000,
      [TRANSACTION_TYPES.LAYERZERO_SEND]: 450_000,
      [TRANSACTION_TYPES.NFT_TRANSFER]: 80_000,
      [TRANSACTION_TYPES.MULTI_SEND]: 140_000,
      [TRANSACTION_TYPES.CONTRACT_DEPLOYMENT]: 1_800_000
    },
    
    optimization: {
      enabled: true,
      maxGasIncrease: 1.1,
      dynamicAdjustment: true,
      networkCongestionThreshold: 0.8
    },
    
    feeEstimation: {
      confirmationTarget: 1,
      updateInterval: 2000,
      fallbackGasPrice: 50,
      maxFeeHistory: 30
    }
  },

  // ── Base Mainnet ───────────────────────────────────────────
  [CHAIN_IDS[CHAINS.BASE]]: {
    chainName: 'Base',
    nativeSymbol: 'ETH',
    pricingModel: PRICING_MODELS.OPTIMISTIC,
    
    gasPrice: {
      [GAS_STRATEGIES.ECONOMY]: { min: 0.01, default: 0.05, max: 0.1 },
      [GAS_STRATEGIES.STANDARD]: { min: 0.05, default: 0.1, max: 0.2 },
      [GAS_STRATEGIES.FAST]: { min: 0.1, default: 0.3, max: 0.5 },
      [GAS_STRATEGIES.INSTANT]: { min: 0.3, default: 0.5, max: 1.0 }
    },
    
    gasLimits: {
      [TRANSACTION_TYPES.NATIVE_TRANSFER]: 21_000,
      [TRANSACTION_TYPES.TOKEN_TRANSFER]: 50_000,
      [TRANSACTION_TYPES.TOKEN_APPROVAL]: 40_000,
      [TRANSACTION_TYPES.CONTRACT_INTERACTION]: 140_000,
      [TRANSACTION_TYPES.DEX_SWAP]: 200_000,
      [TRANSACTION_TYPES.BRIDGE_TRANSFER]: 250_000,
      [TRANSACTION_TYPES.LAYERZERO_SEND]: 350_000,
      [TRANSACTION_TYPES.NFT_TRANSFER]: 70_000,
      [TRANSACTION_TYPES.MULTI_SEND]: 100_000,
      [TRANSACTION_TYPES.CONTRACT_DEPLOYMENT]: 1_200_000
    },
    
    optimization: {
      enabled: true,
      maxGasIncrease: 1.05,
      dynamicAdjustment: true,
      networkCongestionThreshold: 0.95
    },
    
    feeEstimation: {
      confirmationTarget: 1,
      updateInterval: 3000,
      fallbackGasPrice: 0.1,
      maxFeeHistory: 25
    }
  },

  // ── Testnets ───────────────────────────────────────────────
  [CHAIN_IDS.ETHEREUM_SEPOLIA]: {
    chainName: 'Ethereum Sepolia',
    nativeSymbol: 'ETH',
    pricingModel: PRICING_MODELS.EIP1559,
    
    gasPrice: {
      [GAS_STRATEGIES.ECONOMY]: { min: 1, default: 5, max: 10 },
      [GAS_STRATEGIES.STANDARD]: { min: 5, default: 10, max: 20 },
      [GAS_STRATEGIES.FAST]: { min: 10, default: 25, max: 50 },
      [GAS_STRATEGIES.INSTANT]: { min: 25, default: 50, max: 100 }
    },
    
    eip1559: {
      [GAS_STRATEGIES.ECONOMY]: { maxFeePerGas: 10, maxPriorityFeePerGas: 1, estimatedBaseFee: 5 },
      [GAS_STRATEGIES.STANDARD]: { maxFeePerGas: 20, maxPriorityFeePerGas: 2, estimatedBaseFee: 8 },
      [GAS_STRATEGIES.FAST]: { maxFeePerGas: 50, maxPriorityFeePerGas: 3, estimatedBaseFee: 15 },
      [GAS_STRATEGIES.INSTANT]: { maxFeePerGas: 100, maxPriorityFeePerGas: 5, estimatedBaseFee: 25 }
    },
    
    gasLimits: {
      [TRANSACTION_TYPES.NATIVE_TRANSFER]: 21_000,
      [TRANSACTION_TYPES.TOKEN_TRANSFER]: 65_000,
      [TRANSACTION_TYPES.TOKEN_APPROVAL]: 50_000,
      [TRANSACTION_TYPES.CONTRACT_INTERACTION]: 200_000,
      [TRANSACTION_TYPES.DEX_SWAP]: 350_000,
      [TRANSACTION_TYPES.BRIDGE_TRANSFER]: 400_000,
      [TRANSACTION_TYPES.LAYERZERO_SEND]: 500_000,
      [TRANSACTION_TYPES.NFT_TRANSFER]: 85_000,
      [TRANSACTION_TYPES.MULTI_SEND]: 150_000,
      [TRANSACTION_TYPES.CONTRACT_DEPLOYMENT]: 2_000_000
    },
    
    optimization: {
      enabled: false,
      maxGasIncrease: 1.0,
      dynamicAdjustment: false,
      networkCongestionThreshold: 1.0
    },
    
    feeEstimation: {
      confirmationTarget: 1,
      updateInterval: 30000,
      fallbackGasPrice: 10,
      maxFeeHistory: 5
    }
  },

  [CHAIN_IDS.ARBITRUM_SEPOLIA]: {
    chainName: 'Arbitrum Sepolia',
    nativeSymbol: 'ETH',
    pricingModel: PRICING_MODELS.ARBITRUM,
    
    gasPrice: {
      [GAS_STRATEGIES.ECONOMY]: { min: 0.02, default: 0.05, max: 0.1 },
      [GAS_STRATEGIES.STANDARD]: { min: 0.05, default: 0.1, max: 0.2 },
      [GAS_STRATEGIES.FAST]: { min: 0.1, default: 0.2, max: 0.3 },
      [GAS_STRATEGIES.INSTANT]: { min: 0.2, default: 0.3, max: 0.5 }
    },
    
    gasLimits: {
      [TRANSACTION_TYPES.NATIVE_TRANSFER]: 21_000,
      [TRANSACTION_TYPES.TOKEN_TRANSFER]: 50_000,
      [TRANSACTION_TYPES.TOKEN_APPROVAL]: 40_000,
      [TRANSACTION_TYPES.CONTRACT_INTERACTION]: 140_000,
      [TRANSACTION_TYPES.DEX_SWAP]: 200_000,
      [TRANSACTION_TYPES.BRIDGE_TRANSFER]: 250_000,
      [TRANSACTION_TYPES.LAYERZERO_SEND]: 350_000,
      [TRANSACTION_TYPES.NFT_TRANSFER]: 70_000,
      [TRANSACTION_TYPES.MULTI_SEND]: 100_000,
      [TRANSACTION_TYPES.CONTRACT_DEPLOYMENT]: 1_200_000
    },
    
    optimization: {
      enabled: false,
      maxGasIncrease: 1.0,
      dynamicAdjustment: false,
      networkCongestionThreshold: 1.0
    },
    
    feeEstimation: {
      confirmationTarget: 1,
      updateInterval: 30000,
      fallbackGasPrice: 0.05,
      maxFeeHistory: 5
    }
  },

  [CHAIN_IDS.OPTIMISM_SEPOLIA]: {
    chainName: 'Optimism Sepolia',
    nativeSymbol: 'ETH',
    pricingModel: PRICING_MODELS.OPTIMISTIC,
    
    gasPrice: {
      [GAS_STRATEGIES.ECONOMY]: { min: 0.005, default: 0.01, max: 0.02 },
      [GAS_STRATEGIES.STANDARD]: { min: 0.01, default: 0.02, max: 0.05 },
      [GAS_STRATEGIES.FAST]: { min: 0.02, default: 0.05, max: 0.1 },
      [GAS_STRATEGIES.INSTANT]: { min: 0.05, default: 0.1, max: 0.2 }
    },
    
    gasLimits: {
      [TRANSACTION_TYPES.NATIVE_TRANSFER]: 21_000,
      [TRANSACTION_TYPES.TOKEN_TRANSFER]: 50_000,
      [TRANSACTION_TYPES.TOKEN_APPROVAL]: 40_000,
      [TRANSACTION_TYPES.CONTRACT_INTERACTION]: 140_000,
      [TRANSACTION_TYPES.DEX_SWAP]: 200_000,
      [TRANSACTION_TYPES.BRIDGE_TRANSFER]: 250_000,
      [TRANSACTION_TYPES.LAYERZERO_SEND]: 350_000,
      [TRANSACTION_TYPES.NFT_TRANSFER]: 70_000,
      [TRANSACTION_TYPES.MULTI_SEND]: 100_000,
      [TRANSACTION_TYPES.CONTRACT_DEPLOYMENT]: 1_200_000
    },
    
    optimization: {
      enabled: false,
      maxGasIncrease: 1.0,
      dynamicAdjustment: false,
      networkCongestionThreshold: 1.0
    },
    
    feeEstimation: {
      confirmationTarget: 1,
      updateInterval: 30000,
      fallbackGasPrice: 0.02,
      maxFeeHistory: 5
    }
  },

  [CHAIN_IDS.BSC_TESTNET]: {
    chainName: 'BSC Testnet',
    nativeSymbol: 'tBNB',
    pricingModel: PRICING_MODELS.LEGACY,
    
    gasPrice: {
      [GAS_STRATEGIES.ECONOMY]: { min: 1, default: 3, max: 5 },
      [GAS_STRATEGIES.STANDARD]: { min: 3, default: 5, max: 10 },
      [GAS_STRATEGIES.FAST]: { min: 5, default: 10, max: 15 },
      [GAS_STRATEGIES.INSTANT]: { min: 10, default: 15, max: 25 }
    },
    
    gasLimits: {
      [TRANSACTION_TYPES.NATIVE_TRANSFER]: 21_000,
      [TRANSACTION_TYPES.TOKEN_TRANSFER]: 60_000,
      [TRANSACTION_TYPES.TOKEN_APPROVAL]: 50_000,
      [TRANSACTION_TYPES.CONTRACT_INTERACTION]: 180_000,
      [TRANSACTION_TYPES.DEX_SWAP]: 300_000,
      [TRANSACTION_TYPES.BRIDGE_TRANSFER]: 350_000,
      [TRANSACTION_TYPES.LAYERZERO_SEND]: 450_000,
      [TRANSACTION_TYPES.NFT_TRANSFER]: 80_000,
      [TRANSACTION_TYPES.MULTI_SEND]: 140_000,
      [TRANSACTION_TYPES.CONTRACT_DEPLOYMENT]: 1_800_000
    },
    
    optimization: {
      enabled: false,
      maxGasIncrease: 1.0,
      dynamicAdjustment: false,
      networkCongestionThreshold: 1.0
    },
    
    feeEstimation: {
      confirmationTarget: 1,
      updateInterval: 30000,
      fallbackGasPrice: 5,
      maxFeeHistory: 5
    }
  },

  [CHAIN_IDS.AVALANCHE_FUJI]: {
    chainName: 'Avalanche Fuji',
    nativeSymbol: 'AVAX',
    pricingModel: PRICING_MODELS.LEGACY,
    
    gasPrice: {
      [GAS_STRATEGIES.ECONOMY]: { min: 25, default: 35, max: 50 },
      [GAS_STRATEGIES.STANDARD]: { min: 35, default: 40, max: 75 },
      [GAS_STRATEGIES.FAST]: { min: 40, default: 75, max: 100 },
      [GAS_STRATEGIES.INSTANT]: { min: 75, default: 150, max: 200 }
    },
    
    gasLimits: {
      [TRANSACTION_TYPES.NATIVE_TRANSFER]: 21_000,
      [TRANSACTION_TYPES.TOKEN_TRANSFER]: 60_000,
      [TRANSACTION_TYPES.TOKEN_APPROVAL]: 50_000,
      [TRANSACTION_TYPES.CONTRACT_INTERACTION]: 180_000,
      [TRANSACTION_TYPES.DEX_SWAP]: 300_000,
      [TRANSACTION_TYPES.BRIDGE_TRANSFER]: 350_000,
      [TRANSACTION_TYPES.LAYERZERO_SEND]: 450_000,
      [TRANSACTION_TYPES.NFT_TRANSFER]: 80_000,
      [TRANSACTION_TYPES.MULTI_SEND]: 140_000,
      [TRANSACTION_TYPES.CONTRACT_DEPLOYMENT]: 1_800_000
    },
    
    optimization: {
      enabled: false,
      maxGasIncrease: 1.0,
      dynamicAdjustment: false,
      networkCongestionThreshold: 1.0
    },
    
    feeEstimation: {
      confirmationTarget: 1,
      updateInterval: 30000,
      fallbackGasPrice: 40,
      maxFeeHistory: 5
    }
  },

  [CHAIN_IDS.POLYGON_AMOY]: {
    chainName: 'Polygon Amoy',
    nativeSymbol: 'MATIC',
    pricingModel: PRICING_MODELS.EIP1559,
    
    gasPrice: {
      [GAS_STRATEGIES.ECONOMY]: { min: 2, default: 5, max: 10 },
      [GAS_STRATEGIES.STANDARD]: { min: 5, default: 8, max: 15 },
      [GAS_STRATEGIES.FAST]: { min: 8, default: 20, max: 30 },
      [GAS_STRATEGIES.INSTANT]: { min: 20, default: 40, max: 60 }
    },
    
    eip1559: {
      [GAS_STRATEGIES.ECONOMY
