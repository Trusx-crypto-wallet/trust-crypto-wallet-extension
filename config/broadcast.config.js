// config/broadcast.config.js
// ------------------------------------------------------------
// Transaction broadcasting configuration per chain including
// retry strategies, timeouts, and broadcasting methods
// ------------------------------------------------------------

import { CHAIN_IDS } from './token.config.js';

// ------------------------------------------------------------
// Broadcasting strategies available
// ------------------------------------------------------------
export const BROADCAST_STRATEGIES = Object.freeze({
  SINGLE: 'single',           // Single provider broadcast
  PARALLEL: 'parallel',       // Broadcast to multiple providers simultaneously
  SEQUENTIAL: 'sequential',   // Try providers one by one until success
  REDUNDANT: 'redundant'      // Broadcast to all providers for maximum reliability
});

// ------------------------------------------------------------
// Broadcast settings per chain ID
// ------------------------------------------------------------
export const BROADCAST_SETTINGS = Object.freeze({
  // ── Ethereum Mainnet (1) ───────────────────────────────────
  [CHAIN_IDS.ETHEREUM]: Object.freeze({
    strategy: BROADCAST_STRATEGIES.PARALLEL,
    maxRetries: 5,
    retryDelay: 2000,           // 2 seconds initial delay
    maxRetryDelay: 30000,       // max 30 seconds
    exponentialBackoff: true,
    timeout: 120000,            // 2 minutes for complex transactions
    confirmationBlocks: 3,
    gasEstimationBuffer: 1.2,   // 20% gas buffer
    priorityProviders: Object.freeze([
      'publicnode',
      'llamarpc',
      'ankr'
    ]),
    enableMevProtection: true,
    mempoolMonitoring: true,
    replacementPolicy: 'increase_gas' // 'cancel' | 'speed_up' | 'increase_gas'
  }),

  // ── Polygon Mainnet (137) ──────────────────────────────────
  [CHAIN_IDS.POLYGON]: Object.freeze({
    strategy: BROADCAST_STRATEGIES.SEQUENTIAL,
    maxRetries: 4,
    retryDelay: 1000,           // 1 second initial delay
    maxRetryDelay: 15000,       // max 15 seconds
    exponentialBackoff: true,
    timeout: 60000,             // 1 minute
    confirmationBlocks: 5,      // Polygon reorganization protection
    gasEstimationBuffer: 1.15,  // 15% gas buffer
    priorityProviders: Object.freeze([
      'polygon-rpc',
      'publicnode',
      'ankr'
    ]),
    enableMevProtection: false, // Less MEV activity on Polygon
    mempoolMonitoring: true,
    replacementPolicy: 'speed_up'
  }),

  // ── BSC Mainnet (56) ───────────────────────────────────────
  [CHAIN_IDS.BSC]: Object.freeze({
    strategy: BROADCAST_STRATEGIES.SEQUENTIAL,
    maxRetries: 3,
    retryDelay: 1000,           // 1 second initial delay
    maxRetryDelay: 10000,       // max 10 seconds
    exponentialBackoff: true,
    timeout: 45000,             // 45 seconds
    confirmationBlocks: 3,
    gasEstimationBuffer: 1.1,   // 10% gas buffer (cheap gas)
    priorityProviders: Object.freeze([
      'binance-official',
      'publicnode',
      'ankr'
    ]),
    enableMevProtection: false,
    mempoolMonitoring: true,
    replacementPolicy: 'speed_up'
  }),

  // ── Arbitrum One (42161) ───────────────────────────────────
  [CHAIN_IDS.ARBITRUM]: Object.freeze({
    strategy: BROADCAST_STRATEGIES.SINGLE,
    maxRetries: 3,
    retryDelay: 500,            // 500ms initial delay (fast L2)
    maxRetryDelay: 5000,        // max 5 seconds
    exponentialBackoff: true,
    timeout: 30000,             // 30 seconds
    confirmationBlocks: 1,      // Fast finality on L2
    gasEstimationBuffer: 1.05,  // 5% gas buffer (cheap L2 gas)
    priorityProviders: Object.freeze([
      'arbitrum-official',
      'publicnode',
      'ankr'
    ]),
    enableMevProtection: false, // L2 has different MEV dynamics
    mempoolMonitoring: false,   // Less critical on L2
    replacementPolicy: 'cancel'
  }),

  // ── Avalanche C-Chain (43114) ──────────────────────────────
  [CHAIN_IDS.AVALANCHE]: Object.freeze({
    strategy: BROADCAST_STRATEGIES.SEQUENTIAL,
    maxRetries: 3,
    retryDelay: 1000,           // 1 second initial delay
    maxRetryDelay: 8000,        // max 8 seconds
    exponentialBackoff: true,
    timeout: 30000,             // 30 seconds (fast finality)
    confirmationBlocks: 1,      // Avalanche has fast finality
    gasEstimationBuffer: 1.1,   // 10% gas buffer
    priorityProviders: Object.freeze([
      'avalanche-official',
      'publicnode',
      'ankr'
    ]),
    enableMevProtection: false,
    mempoolMonitoring: true,
    replacementPolicy: 'speed_up'
  }),

  // ── Optimism Mainnet (10) ──────────────────────────────────
  [CHAIN_IDS.OPTIMISM]: Object.freeze({
    strategy: BROADCAST_STRATEGIES.SINGLE,
    maxRetries: 3,
    retryDelay: 500,            // 500ms initial delay (fast L2)
    maxRetryDelay: 5000,        // max 5 seconds
    exponentialBackoff: true,
    timeout: 30000,             // 30 seconds
    confirmationBlocks: 1,      // Fast finality on L2
    gasEstimationBuffer: 1.05,  // 5% gas buffer
    priorityProviders: Object.freeze([
      'optimism-official',
      'publicnode',
      'ankr'
    ]),
    enableMevProtection: false,
    mempoolMonitoring: false,
    replacementPolicy: 'cancel'
  }),

  // ── Ethereum Sepolia Testnet (11155111) ────────────────────
  [CHAIN_IDS.ETHEREUM_SEPOLIA]: Object.freeze({
    strategy: BROADCAST_STRATEGIES.SINGLE,
    maxRetries: 2,
    retryDelay: 3000,           // 3 seconds (testnet can be slow)
    maxRetryDelay: 15000,       // max 15 seconds
    exponentialBackoff: true,
    timeout: 60000,             // 1 minute
    confirmationBlocks: 2,
    gasEstimationBuffer: 1.5,   // 50% buffer for testnet variability
    priorityProviders: Object.freeze([
      'publicnode',
      'infura-demo'
    ]),
    enableMevProtection: false,
    mempoolMonitoring: false,
    replacementPolicy: 'speed_up'
  }),

  // ── Arbitrum Sepolia Testnet (421614) ──────────────────────
  [CHAIN_IDS.ARBITRUM_SEPOLIA]: Object.freeze({
    strategy: BROADCAST_STRATEGIES.SINGLE,
    maxRetries: 2,
    retryDelay: 2000,           // 2 seconds
    maxRetryDelay: 10000,       // max 10 seconds
    exponentialBackoff: true,
    timeout: 45000,             // 45 seconds
    confirmationBlocks: 1,
    gasEstimationBuffer: 1.3,   // 30% buffer for testnet
    priorityProviders: Object.freeze([
      'arbitrum-sepolia',
      'publicnode'
    ]),
    enableMevProtection: false,
    mempoolMonitoring: false,
    replacementPolicy: 'cancel'
  }),

  // ── Optimism Sepolia Testnet (11155420) ────────────────────
  [CHAIN_IDS.OPTIMISM_SEPOLIA]: Object.freeze({
    strategy: BROADCAST_STRATEGIES.SINGLE,
    maxRetries: 2,
    retryDelay: 2000,           // 2 seconds
    maxRetryDelay: 10000,       // max 10 seconds
    exponentialBackoff: true,
    timeout: 45000,             // 45 seconds
    confirmationBlocks: 1,
    gasEstimationBuffer: 1.3,   // 30% buffer for testnet
    priorityProviders: Object.freeze([
      'optimism-sepolia',
      'publicnode'
    ]),
    enableMevProtection: false,
    mempoolMonitoring: false,
    replacementPolicy: 'cancel'
  }),

  // ── BSC Testnet (97) ───────────────────────────────────────
  [CHAIN_IDS.BSC_TESTNET]: Object.freeze({
    strategy: BROADCAST_STRATEGIES.SINGLE,
    maxRetries: 2,
    retryDelay: 2000,           // 2 seconds
    maxRetryDelay: 12000,       // max 12 seconds
    exponentialBackoff: true,
    timeout: 45000,             // 45 seconds
    confirmationBlocks: 2,
    gasEstimationBuffer: 1.4,   // 40% buffer for testnet
    priorityProviders: Object.freeze([
      'bsc-testnet',
      'publicnode'
    ]),
    enableMevProtection: false,
    mempoolMonitoring: false,
    replacementPolicy: 'speed_up'
  }),

  // ── Avalanche Fuji Testnet (43113) ─────────────────────────
  [CHAIN_IDS.AVALANCHE_FUJI]: Object.freeze({
    strategy: BROADCAST_STRATEGIES.SINGLE,
    maxRetries: 2,
    retryDelay: 2000,           // 2 seconds
    maxRetryDelay: 10000,       // max 10 seconds
    exponentialBackoff: true,
    timeout: 40000,             // 40 seconds
    confirmationBlocks: 1,
    gasEstimationBuffer: 1.3,   // 30% buffer for testnet
    priorityProviders: Object.freeze([
      'avalanche-fuji',
      'publicnode'
    ]),
    enableMevProtection: false,
    mempoolMonitoring: false,
    replacementPolicy: 'speed_up'
  }),

  // ── Polygon Amoy Testnet (80002) ───────────────────────────
  [CHAIN_IDS.POLYGON_AMOY]: Object.freeze({
    strategy: BROADCAST_STRATEGIES.SINGLE,
    maxRetries: 2,
    retryDelay: 2000,           // 2 seconds
    maxRetryDelay: 12000,       // max 12 seconds
    exponentialBackoff: true,
    timeout: 45000,             // 45 seconds
    confirmationBlocks: 2,
    gasEstimationBuffer: 1.4,   // 40% buffer for testnet
    priorityProviders: Object.freeze([
      'polygon-amoy',
      'publicnode'
    ]),
    enableMevProtection: false,
    mempoolMonitoring: false,
    replacementPolicy: 'speed_up'
  })
});

// ------------------------------------------------------------
// Global broadcast configuration defaults
// ------------------------------------------------------------
export const GLOBAL_BROADCAST_CONFIG = Object.freeze({
  // Default settings for unknown chains
  defaultSettings: Object.freeze({
    strategy: BROADCAST_STRATEGIES.SINGLE,
    maxRetries: 3,
    retryDelay: 2000,
    maxRetryDelay: 10000,
    exponentialBackoff: true,
    timeout: 60000,
    confirmationBlocks: 3,
    gasEstimationBuffer: 1.2,
    priorityProviders: Object.freeze(['publicnode']),
    enableMevProtection: false,
    mempoolMonitoring: false,
    replacementPolicy: 'speed_up'
  }),

  // Monitoring and alerting configuration
  monitoring: Object.freeze({
    enableBroadcastMetrics: true,
    trackSuccessRates: true,
    alertOnHighFailureRate: true,
    failureRateThreshold: 0.1, // 10% failure rate triggers alert
    metricsRetentionDays: 7
  }),

  // Queue management
  queueConfig: Object.freeze({
    maxQueueSize: 1000,
    processingInterval: 100,    // 100ms between queue processing
    priorityLevels: 3,          // high, medium, low priority
    enableQueuePersistence: true
  }),

  // Security settings
  security: Object.freeze({
    enableNonceManagement: true,
    preventDuplicateTransactions: true,
    maxPendingTransactions: 50,
    enableTransactionAnalysis: true
  })
});

// ------------------------------------------------------------
// Helper functions for broadcast configuration
// ------------------------------------------------------------

/**
 * Get broadcast settings for a specific chain
 * @param {number} chainId - The chain ID
 * @returns {Object} Broadcast settings for the chain
 */
export const getBroadcastSettings = (chainId) => {
  return BROADCAST_SETTINGS[chainId] || GLOBAL_BROADCAST_CONFIG.defaultSettings;
};

/**
 * Check if a chain supports MEV protection
 * @param {number} chainId - The chain ID
 * @returns {boolean} True if MEV protection is enabled
 */
export const supportsMevProtection = (chainId) => {
  const settings = getBroadcastSettings(chainId);
  return settings.enableMevProtection;
};

/**
 * Get retry configuration for a specific chain
 * @param {number} chainId - The chain ID
 * @returns {Object} Retry configuration
 */
export const getRetryConfig = (chainId) => {
  const settings = getBroadcastSettings(chainId);
  return {
    maxRetries: settings.maxRetries,
    retryDelay: settings.retryDelay,
    maxRetryDelay: settings.maxRetryDelay,
    exponentialBackoff: settings.exponentialBackoff
  };
};

/**
 * Get timeout configuration for a specific chain
 * @param {number} chainId - The chain ID
 * @returns {number} Timeout in milliseconds
 */
export const getBroadcastTimeout = (chainId) => {
  const settings = getBroadcastSettings(chainId);
  return settings.timeout;
};

/**
 * Get gas estimation buffer for a specific chain
 * @param {number} chainId - The chain ID
 * @returns {number} Gas buffer multiplier (e.g., 1.2 for 20% buffer)
 */
export const getGasBuffer = (chainId) => {
  const settings = getBroadcastSettings(chainId);
  return settings.gasEstimationBuffer;
};

/**
 * Get confirmation blocks required for a specific chain
 * @param {number} chainId - The chain ID
 * @returns {number} Number of confirmation blocks
 */
export const getConfirmationBlocks = (chainId) => {
  const settings = getBroadcastSettings(chainId);
  return settings.confirmationBlocks;
};

/**
 * Get priority providers for a specific chain
 * @param {number} chainId - The chain ID
 * @returns {Array} Array of priority provider names
 */
export const getPriorityProviders = (chainId) => {
  const settings = getBroadcastSettings(chainId);
  return settings.priorityProviders;
};

/**
 * Check if mempool monitoring is enabled for a chain
 * @param {number} chainId - The chain ID
 * @returns {boolean} True if mempool monitoring is enabled
 */
export const isMempoolMonitoringEnabled = (chainId) => {
  const settings = getBroadcastSettings(chainId);
  return settings.mempoolMonitoring;
};

/**
 * Get replacement policy for failed transactions
 * @param {number} chainId - The chain ID
 * @returns {string} Replacement policy ('cancel' | 'speed_up' | 'increase_gas')
 */
export const getReplacementPolicy = (chainId) => {
  const settings = getBroadcastSettings(chainId);
  return settings.replacementPolicy;
};

/**
 * Get all supported chain IDs for broadcasting
 * @returns {Array} Array of supported chain IDs
 */
export const getSupportedBroadcastChains = () => {
  return Object.keys(BROADCAST_SETTINGS).map(Number);
};

/**
 * Get global broadcast configuration
 * @returns {Object} Global configuration settings
 */
export const getGlobalBroadcastConfig = () => {
  return GLOBAL_BROADCAST_CONFIG;
};
