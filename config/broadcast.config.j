/**
 * Production-Ready Broadcasting Configuration
 * Trust Wallet Extension - Transaction Broadcasting & MEV Protection
 * 
 * @author Trust Wallet Core Team
 * @version 1.0.0
 * @license MIT
 */

import { ethers } from 'ethers';

/**
 * Broadcasting configuration for secure transaction transmission
 * Includes MEV protection, gas optimization, and retry mechanisms
 */
export const BROADCAST_CONFIG = {
  // Network-specific broadcasting settings
  networks: {
    ethereum: {
      chainId: 1,
      maxGasPrice: ethers.utils.parseUnits('300', 'gwei'),
      maxPriorityFeePerGas: ethers.utils.parseUnits('5', 'gwei'),
      gasLimitMultiplier: 1.2,
      retryAttempts: 5,
      retryDelay: 2000, // 2 seconds
      mempoolTimeout: 300000, // 5 minutes
      confirmationBlocks: 2,
      enableMEVProtection: true,
      flashbotsRelay: 'https://relay.flashbots.net',
      ethGasStation: 'https://ethgasstation.info/api/ethgasAPI.json',
      rpcEndpoints: [
        'https://eth-mainnet.alchemyapi.io/v2/YOUR_ALCHEMY_KEY',
        'https://mainnet.infura.io/v3/YOUR_INFURA_KEY',
        'https://rpc.ankr.com/eth',
        'https://ethereum.publicnode.com'
      ]
    },
    polygon: {
      chainId: 137,
      maxGasPrice: ethers.utils.parseUnits('500', 'gwei'),
      maxPriorityFeePerGas: ethers.utils.parseUnits('30', 'gwei'),
      gasLimitMultiplier: 1.1,
      retryAttempts: 3,
      retryDelay: 1500,
      mempoolTimeout: 120000, // 2 minutes
      confirmationBlocks: 1,
      enableMEVProtection: false,
      gasStation: 'https://gasstation-mainnet.matic.network/v2',
      rpcEndpoints: [
        'https://polygon-mainnet.alchemyapi.io/v2/YOUR_ALCHEMY_KEY',
        'https://polygon-mainnet.infura.io/v3/YOUR_INFURA_KEY',
        'https://rpc.ankr.com/polygon',
        'https://polygon.publicnode.com'
      ]
    },
    bsc: {
      chainId: 56,
      maxGasPrice: ethers.utils.parseUnits('20', 'gwei'),
      maxPriorityFeePerGas: ethers.utils.parseUnits('2', 'gwei'),
      gasLimitMultiplier: 1.1,
      retryAttempts: 3,
      retryDelay: 1000,
      mempoolTimeout: 90000, // 1.5 minutes
      confirmationBlocks: 1,
      enableMEVProtection: false,
      rpcEndpoints: [
        'https://bsc-dataseed1.binance.org',
        'https://bsc-dataseed2.binance.org',
        'https://rpc.ankr.com/bsc',
        'https://bsc.publicnode.com'
      ]
    },
    arbitrum: {
      chainId: 42161,
      maxGasPrice: ethers.utils.parseUnits('2', 'gwei'),
      maxPriorityFeePerGas: ethers.utils.parseUnits('0.01', 'gwei'),
      gasLimitMultiplier: 1.05,
      retryAttempts: 3,
      retryDelay: 1000,
      mempoolTimeout: 60000, // 1 minute
      confirmationBlocks: 1,
      enableMEVProtection: false,
      rpcEndpoints: [
        'https://arb-mainnet.g.alchemy.com/v2/YOUR_ALCHEMY_KEY',
        'https://arbitrum-mainnet.infura.io/v3/YOUR_INFURA_KEY',
        'https://rpc.ankr.com/arbitrum',
        'https://arbitrum.publicnode.com'
      ]
    },
    optimism: {
      chainId: 10,
      maxGasPrice: ethers.utils.parseUnits('0.5', 'gwei'),
      maxPriorityFeePerGas: ethers.utils.parseUnits('0.001', 'gwei'),
      gasLimitMultiplier: 1.05,
      retryAttempts: 3,
      retryDelay: 1000,
      mempoolTimeout: 60000,
      confirmationBlocks: 1,
      enableMEVProtection: false,
      rpcEndpoints: [
        'https://opt-mainnet.g.alchemy.com/v2/YOUR_ALCHEMY_KEY',
        'https://optimism-mainnet.infura.io/v3/YOUR_INFURA_KEY',
        'https://rpc.ankr.com/optimism',
        'https://optimism.publicnode.com'
      ]
    },
    avalanche: {
      chainId: 43114,
      maxGasPrice: ethers.utils.parseUnits('100', 'gwei'),
      maxPriorityFeePerGas: ethers.utils.parseUnits('2', 'gwei'),
      gasLimitMultiplier: 1.1,
      retryAttempts: 3,
      retryDelay: 1000,
      mempoolTimeout: 30000, // 30 seconds
      confirmationBlocks: 1,
      enableMEVProtection: false,
      rpcEndpoints: [
        'https://api.avax.network/ext/bc/C/rpc',
        'https://rpc.ankr.com/avalanche',
        'https://avalanche.publicnode.com'
      ]
    }
  },

  // Global broadcasting settings
  global: {
    maxConcurrentBroadcasts: 10,
    queueProcessingInterval: 1000, // 1 second
    healthCheckInterval: 30000, // 30 seconds
    failoverThreshold: 3, // Failed attempts before switching RPC
    enableBroadcastQueue: true,
    enableFailover: true,
    enableLoadBalancing: true,
    enableMetrics: true,
    metricsRetentionDays: 7
  },

  // MEV Protection Configuration
  mevProtection: {
    enabled: true,
    strategies: ['flashbots', 'private_mempool', 'gas_auction'],
    flashbots: {
      relayUrl: 'https://relay.flashbots.net',
      builderUrl: 'https://builder0x69.io',
      maxBundleBlocks: 3,
      minTimestamp: 0,
      maxTimestamp: 0,
      revertingTxHashes: []
    },
    privateMempool: {
      enabled: true,
      endpoints: [
        'https://api.blocknative.com/v1',
        'https://api.1inch.io/v5.0/1/tx-gateway'
      ],
      fallbackToPublic: true,
      timeout: 30000
    },
    gasAuction: {
      enabled: true,
      maxBidIncrease: 0.15, // 15% max increase
      bidIncrementSteps: [0.05, 0.10, 0.15],
      auctionDuration: 45000, // 45 seconds
      minProfitThreshold: ethers.utils.parseEther('0.001')
    }
  },

  // Transaction Pool Management
  transactionPool: {
    maxPoolSize: 1000,
    priorityLevels: {
      urgent: { weight: 10, maxWaitTime: 30000 },
      high: { weight: 5, maxWaitTime: 60000 },
      normal: { weight: 1, maxWaitTime: 300000 },
      low: { weight: 0.5, maxWaitTime: 600000 }
    },
    cleanupInterval: 300000, // 5 minutes
    maxAge: 3600000, // 1 hour
    enablePrioritization: true,
    enableDeduplication: true
  },

  // Gas Optimization Settings
  gasOptimization: {
    enabled: true,
    strategies: ['eip1559', 'oracle_based', 'network_congestion'],
    eip1559: {
      baseFeeMultiplier: 1.125, // 12.5% above base fee
      maxPriorityFeePerGas: ethers.utils.parseUnits('2', 'gwei'),
      priorityFeeMultiplier: 1.1
    },
    oracleBased: {
      oracles: [
        'https://ethgasstation.info/api/ethgasAPI.json',
        'https://gas-api.metaswap.codefi.network/networks/1/suggestedGasFees',
        'https://api.blocknative.com/gasprices/blockprices'
      ],
      updateInterval: 15000, // 15 seconds
      fallbackGasPrice: ethers.utils.parseUnits('20', 'gwei')
    },
    networkCongestion: {
      lowCongestionMultiplier: 0.9,
      mediumCongestionMultiplier: 1.1,
      highCongestionMultiplier: 1.3,
      congestionThresholds: {
        low: 70, // % network utilization
        medium: 85,
        high: 95
      }
    }
  },

  // Retry Configuration
  retryConfig: {
    maxRetries: 5,
    backoffStrategy: 'exponential', // 'linear', 'exponential', 'custom'
    initialDelay: 1000,
    maxDelay: 30000,
    jitterEnabled: true,
    retryableErrors: [
      'NETWORK_ERROR',
      'TIMEOUT',
      'NONCE_TOO_LOW',
      'UNDERPRICED',
      'REPLACEMENT_UNDERPRICED'
    ],
    nonRetryableErrors: [
      'INSUFFICIENT_FUNDS',
      'INVALID_SIGNATURE',
      'INVALID_ADDRESS',
      'CONTRACT_REVERT'
    ]
  },

  // Broadcasting Strategies
  strategies: {
    single: {
      name: 'Single Broadcast',
      description: 'Broadcast to single RPC endpoint',
      enabled: true,
      fallbackEnabled: true
    },
    multi: {
      name: 'Multi Broadcast',
      description: 'Broadcast to multiple RPC endpoints simultaneously',
      enabled: true,
      maxEndpoints: 3,
      requireAllSuccess: false,
      successThreshold: 0.6 // 60% success rate required
    },
    failover: {
      name: 'Failover Broadcast',
      description: 'Try endpoints sequentially until success',
      enabled: true,
      maxAttempts: 5,
      endpointCooldown: 60000 // 1 minute cooldown for failed endpoints
    },
    parallel: {
      name: 'Parallel Broadcast',
      description: 'Broadcast in parallel with race condition',
      enabled: true,
      timeout: 30000,
      cancelOnFirst: true
    }
  },

  // Monitoring & Metrics
  monitoring: {
    enableMetrics: true,
    enableAlerts: true,
    metrics: {
      successRate: { threshold: 0.95, window: '5m' },
      averageLatency: { threshold: 3000, window: '5m' }, // 3 seconds
      errorRate: { threshold: 0.05, window: '5m' }, // 5% error rate
      queueSize: { threshold: 100, window: '1m' }
    },
    alerts: {
      channels: ['console', 'storage'],
      severityLevels: ['info', 'warning', 'error', 'critical'],
      rateLimiting: {
        maxAlerts: 10,
        timeWindow: 300000 // 5 minutes
      }
    },
    logging: {
      level: 'info', // 'debug', 'info', 'warn', 'error'
      enableConsole: process.env.NODE_ENV === 'development',
      enableStorage: true,
      maxLogSize: 10485760, // 10MB
      rotationSize: 5242880 // 5MB
    }
  },

  // Security Settings
  security: {
    enableRateLimiting: true,
    rateLimits: {
      perSecond: 10,
      perMinute: 100,
      perHour: 1000
    },
    enableRequestValidation: true,
    enableSignatureValidation: true,
    enableNonceValidation: true,
    enableAddressValidation: true,
    maxTransactionValue: ethers.utils.parseEther('100'), // 100 ETH
    trustedContracts: [
      '0xA0b86a33E6441D6dE7d1fa34d5fF7C4b1527a18F', // Trust Wallet contract
      '0x7d2768dE32b0b80b7a3454c06BdAc94A69DDc7A9', // Aave LendingPool
      '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45'  // Uniswap V3 Router
    ]
  },

  // Environment-specific overrides
  environments: {
    development: {
      enableDebugLogs: true,
      enableMEVProtection: false,
      retryAttempts: 2,
      confirmationBlocks: 1
    },
    staging: {
      enableDebugLogs: true,
      enableMEVProtection: true,
      retryAttempts: 3,
      confirmationBlocks: 1
    },
    production: {
      enableDebugLogs: false,
      enableMEVProtection: true,
      retryAttempts: 5,
      confirmationBlocks: 2
    }
  }
};

/**
 * Get broadcasting configuration for specific network
 * @param {string} networkName - Network identifier
 * @returns {Object} Network-specific broadcasting configuration
 */
export function getBroadcastConfig(networkName) {
  const config = BROADCAST_CONFIG.networks[networkName];
  if (!config) {
    throw new Error(`Unsupported network: ${networkName}`);
  }
  
  return {
    ...config,
    global: BROADCAST_CONFIG.global,
    mevProtection: BROADCAST_CONFIG.mevProtection,
    gasOptimization: BROADCAST_CONFIG.gasOptimization,
    security: BROADCAST_CONFIG.security
  };
}

/**
 * Validate broadcasting configuration
 * @param {Object} config - Configuration to validate
 * @returns {boolean} True if valid
 * @throws {Error} If configuration is invalid
 */
export function validateBroadcastConfig(config) {
  if (!config.chainId || typeof config.chainId !== 'number') {
    throw new Error('Invalid chainId in broadcast configuration');
  }
  
  if (!config.rpcEndpoints || !Array.isArray(config.rpcEndpoints) || config.rpcEndpoints.length === 0) {
    throw new Error('Invalid RPC endpoints in broadcast configuration');
  }
  
  if (!config.maxGasPrice || !ethers.BigNumber.isBigNumber(config.maxGasPrice)) {
    throw new Error('Invalid maxGasPrice in broadcast configuration');
  }
  
  return true;
}

/**
 * Get optimal gas configuration based on network conditions
 * @param {string} networkName - Network identifier
 * @param {Object} networkConditions - Current network conditions
 * @returns {Object} Optimized gas configuration
 */
export function getOptimizedGasConfig(networkName, networkConditions = {}) {
  const baseConfig = getBroadcastConfig(networkName);
  const { congestionLevel = 'medium', urgency = 'normal' } = networkConditions;
  
  let gasMultiplier = 1.0;
  
  // Adjust based on network congestion
  switch (congestionLevel) {
    case 'low':
      gasMultiplier *= BROADCAST_CONFIG.gasOptimization.networkCongestion.lowCongestionMultiplier;
      break;
    case 'high':
      gasMultiplier *= BROADCAST_CONFIG.gasOptimization.networkCongestion.highCongestionMultiplier;
      break;
    default:
      gasMultiplier *= BROADCAST_CONFIG.gasOptimization.networkCongestion.mediumCongestionMultiplier;
  }
  
  // Adjust based on urgency
  switch (urgency) {
    case 'urgent':
      gasMultiplier *= 1.5;
      break;
    case 'high':
      gasMultiplier *= 1.2;
      break;
    case 'low':
      gasMultiplier *= 0.8;
      break;
    default:
      // normal priority, no adjustment
      break;
  }
  
  return {
    ...baseConfig,
    gasMultiplier,
    recommendedGasPrice: baseConfig.maxGasPrice.mul(Math.floor(gasMultiplier * 100)).div(100)
  };
}

/**
 * Get MEV protection settings for transaction
 * @param {Object} transaction - Transaction details
 * @param {string} networkName - Network identifier
 * @returns {Object} MEV protection configuration
 */
export function getMEVProtectionConfig(transaction, networkName) {
  const networkConfig = BROADCAST_CONFIG.networks[networkName];
  
  if (!networkConfig.enableMEVProtection) {
    return { enabled: false };
  }
  
  const transactionValue = ethers.BigNumber.from(transaction.value || 0);
  const mevThreshold = ethers.utils.parseEther('1'); // 1 ETH threshold
  
  return {
    enabled: true,
    useFlashbots: transactionValue.gte(mevThreshold),
    usePrivateMempool: true,
    maxSlippage: 0.005, // 0.5%
    protectionLevel: transactionValue.gte(mevThreshold) ? 'high' : 'standard'
  };
}

export default BROADCAST_CONFIG;
