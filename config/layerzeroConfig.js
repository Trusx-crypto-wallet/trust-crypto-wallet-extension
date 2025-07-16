/**
 * LayerZero Configuration
 * Complete LayerZero V1/V2 endpoint and chain configuration
 * Aligned with Trust Crypto Wallet project structure
 * FIXED: Added opBNB support throughout all configurations
 */

const { NETWORKS, CHAIN_ENDPOINTS } = require('./contractAddresses');

// LayerZero V1 Endpoint Addresses (FIXED: Added opBNB)
const LAYERZERO_V1_ENDPOINTS = {
  [NETWORKS.BSC]: '0x66A71Dcef29A0fFBDBE3c6a460a3B5BC225Cd675',
  [NETWORKS.ETHEREUM]: '0x66A71Dcef29A0fFBDBE3c6a460a3B5BC225Cd675',
  [NETWORKS.POLYGON]: '0x66A71Dcef29A0fFBDBE3c6a460a3B5BC225Cd675',
  [NETWORKS.ARBITRUM]: '0x66A71Dcef29A0fFBDBE3c6a460a3B5BC225Cd675',
  [NETWORKS.OPTIMISM]: '0x66A71Dcef29A0fFBDBE3c6a460a3B5BC225Cd675',
  [NETWORKS.AVALANCHE]: '0x66A71Dcef29A0fFBDBE3c6a460a3B5BC225Cd675',
  [NETWORKS.OPBNB]: '0x66A71Dcef29A0fFBDBE3c6a460a3B5BC225Cd675' // ADDED: opBNB V1 endpoint
};

// LayerZero V2 Endpoint Addresses (FIXED: Added opBNB)
const LAYERZERO_V2_ENDPOINTS = {
  [NETWORKS.BSC]: '0x1a44076050125825900e736c501f859c50fE728c',
  [NETWORKS.ETHEREUM]: '0x1a44076050125825900e736c501f859c50fE728c',
  [NETWORKS.POLYGON]: '0x1a44076050125825900e736c501f859c50fE728c',
  [NETWORKS.ARBITRUM]: '0x1a44076050125825900e736c501f859c50fE728c',
  [NETWORKS.OPTIMISM]: '0x1a44076050125825900e736c501f859c50fE728c',
  [NETWORKS.AVALANCHE]: '0x1a44076050125825900e736c501f859c50fE728c',
  [NETWORKS.OPBNB]: '0x1a44076050125825900e736c501f859c50fE728c' // ADDED: opBNB V2 endpoint
};

// LayerZero Chain IDs mapping (FIXED: Added opBNB)
const LAYERZERO_CHAIN_IDS = {
  [NETWORKS.ETHEREUM]: 101,
  [NETWORKS.BSC]: 102,
  [NETWORKS.AVALANCHE]: 106,
  [NETWORKS.POLYGON]: 109,
  [NETWORKS.ARBITRUM]: 110,
  [NETWORKS.OPTIMISM]: 111,
  [NETWORKS.OPBNB]: 202 // ADDED: opBNB LayerZero chain ID
};

// Reverse mapping for chain ID lookup
const CHAIN_ID_TO_NETWORK = Object.fromEntries(
  Object.entries(LAYERZERO_CHAIN_IDS).map(([network, chainId]) => [chainId, network])
);

// LayerZero Gas Limits per destination chain (FIXED: Added opBNB)
const LAYERZERO_GAS_LIMITS = {
  [NETWORKS.ETHEREUM]: {
    send: 200000,
    receive: 200000,
    adapter: 250000
  },
  [NETWORKS.BSC]: {
    send: 200000,
    receive: 200000,
    adapter: 250000
  },
  [NETWORKS.POLYGON]: {
    send: 200000,
    receive: 200000,
    adapter: 250000
  },
  [NETWORKS.ARBITRUM]: {
    send: 800000,
    receive: 800000,
    adapter: 900000
  },
  [NETWORKS.OPTIMISM]: {
    send: 200000,
    receive: 200000,
    adapter: 250000
  },
  [NETWORKS.AVALANCHE]: {
    send: 200000,
    receive: 200000,
    adapter: 250000
  },
  [NETWORKS.OPBNB]: {  // ADDED: opBNB gas limits (optimized for low-cost L2)
    send: 150000,       // Lower gas for L2 efficiency
    receive: 150000,
    adapter: 200000
  }
};

// LayerZero Trusted Remote Configuration (FIXED: Added opBNB to all networks)
const TRUSTED_REMOTES = {
  // Cross-chain peer relationships for OFT contracts
  [NETWORKS.BSC]: {
    trustedRemotes: [
      NETWORKS.ETHEREUM,
      NETWORKS.POLYGON,
      NETWORKS.ARBITRUM,
      NETWORKS.OPTIMISM,
      NETWORKS.AVALANCHE,
      NETWORKS.OPBNB  // ADDED: opBNB as trusted remote
    ]
  },
  [NETWORKS.ETHEREUM]: {
    trustedRemotes: [
      NETWORKS.BSC,
      NETWORKS.POLYGON,
      NETWORKS.ARBITRUM,
      NETWORKS.OPTIMISM,
      NETWORKS.AVALANCHE,
      NETWORKS.OPBNB  // ADDED: opBNB as trusted remote
    ]
  },
  [NETWORKS.POLYGON]: {
    trustedRemotes: [
      NETWORKS.BSC,
      NETWORKS.ETHEREUM,
      NETWORKS.ARBITRUM,
      NETWORKS.OPTIMISM,
      NETWORKS.AVALANCHE,
      NETWORKS.OPBNB  // ADDED: opBNB as trusted remote
    ]
  },
  [NETWORKS.ARBITRUM]: {
    trustedRemotes: [
      NETWORKS.BSC,
      NETWORKS.ETHEREUM,
      NETWORKS.POLYGON,
      NETWORKS.OPTIMISM,
      NETWORKS.AVALANCHE,
      NETWORKS.OPBNB  // ADDED: opBNB as trusted remote
    ]
  },
  [NETWORKS.OPTIMISM]: {
    trustedRemotes: [
      NETWORKS.BSC,
      NETWORKS.ETHEREUM,
      NETWORKS.POLYGON,
      NETWORKS.ARBITRUM,
      NETWORKS.AVALANCHE,
      NETWORKS.OPBNB  // ADDED: opBNB as trusted remote
    ]
  },
  [NETWORKS.AVALANCHE]: {
    trustedRemotes: [
      NETWORKS.BSC,
      NETWORKS.ETHEREUM,
      NETWORKS.POLYGON,
      NETWORKS.ARBITRUM,
      NETWORKS.OPTIMISM,
      NETWORKS.OPBNB  // ADDED: opBNB as trusted remote
    ]
  },
  [NETWORKS.OPBNB]: {  // ADDED: Complete opBNB trusted remotes configuration
    trustedRemotes: [
      NETWORKS.BSC,
      NETWORKS.ETHEREUM,
      NETWORKS.POLYGON,
      NETWORKS.ARBITRUM,
      NETWORKS.OPTIMISM,
      NETWORKS.AVALANCHE
    ]
  }
};

// LayerZero Fee Configuration (FIXED: Added opBNB)
const LAYERZERO_FEES = {
  // Native fees for cross-chain messaging
  baseFee: {
    [NETWORKS.ETHEREUM]: '0.001', // ETH
    [NETWORKS.BSC]: '0.005', // BNB
    [NETWORKS.POLYGON]: '0.01', // MATIC
    [NETWORKS.ARBITRUM]: '0.001', // ETH
    [NETWORKS.OPTIMISM]: '0.001', // ETH
    [NETWORKS.AVALANCHE]: '0.01', // AVAX
    [NETWORKS.OPBNB]: '0.0001' // ADDED: BNB (very low for L2 efficiency)
  },
  // Fee multipliers for different message types
  multipliers: {
    oftSend: 1.0,
    oftReceive: 1.0,
    adapterSend: 1.2,
    adapterReceive: 1.2
  }
};

// LayerZero Message Types
const MESSAGE_TYPES = {
  OFT_SEND: 0,
  OFT_RECEIVE: 1,
  ADAPTER_SEND: 2,
  ADAPTER_RECEIVE: 3
};

// LayerZero Version Configuration
const LAYERZERO_CONFIG = {
  version: {
    v1: {
      endpoints: LAYERZERO_V1_ENDPOINTS,
      abiPath: 'src/abis/layerzero/v1/',
      protocolFile: 'src/bridges/protocols/layerzero-bridge.js',
      supported: true
    },
    v2: {
      endpoints: LAYERZERO_V2_ENDPOINTS,
      abiPath: 'src/abis/layerzero/v2/',
      protocolFile: 'src/bridges/protocols/layerzero-bridge.js',
      supported: true,
      preferred: true // V2 is preferred for new deployments
    }
  },
  chainIds: LAYERZERO_CHAIN_IDS,
  gasLimits: LAYERZERO_GAS_LIMITS,
  trustedRemotes: TRUSTED_REMOTES,
  fees: LAYERZERO_FEES,
  messageTypes: MESSAGE_TYPES
};

// Helper Functions (Enhanced with opBNB support)
const LayerZeroUtils = {
  /**
   * Get LayerZero chain ID from network name
   */
  getChainId: (network) => {
    return LAYERZERO_CHAIN_IDS[network];
  },

  /**
   * Get network name from LayerZero chain ID
   */
  getNetwork: (chainId) => {
    return CHAIN_ID_TO_NETWORK[chainId];
  },

  /**
   * Get endpoint address for network and version
   */
  getEndpoint: (network, version = 'v2') => {
    return LAYERZERO_CONFIG.version[version].endpoints[network];
  },

  /**
   * Get gas limit for network and operation
   */
  getGasLimit: (network, operation = 'send') => {
    return LAYERZERO_GAS_LIMITS[network]?.[operation] || 200000;
  },

  /**
   * Get trusted remotes for a network
   */
  getTrustedRemotes: (network) => {
    return TRUSTED_REMOTES[network]?.trustedRemotes || [];
  },

  /**
   * Check if cross-chain path is supported
   */
  isPathSupported: (fromNetwork, toNetwork) => {
    const trustedRemotes = LayerZeroUtils.getTrustedRemotes(fromNetwork);
    return trustedRemotes.includes(toNetwork);
  },

  /**
   * Calculate estimated fee for cross-chain transfer
   */
  estimateFee: (fromNetwork, toNetwork, messageType = MESSAGE_TYPES.OFT_SEND) => {
    const baseFee = parseFloat(LAYERZERO_FEES.baseFee[fromNetwork] || '0.001');
    const multiplier = Object.values(LAYERZERO_FEES.multipliers)[messageType] || 1.0;
    return (baseFee * multiplier).toString();
  },

  /**
   * Get all supported networks
   */
  getSupportedNetworks: () => {
    return Object.keys(LAYERZERO_CHAIN_IDS);
  },

  /**
   * Check if network supports LayerZero
   */
  isNetworkSupported: (network) => {
    return LAYERZERO_CHAIN_IDS.hasOwnProperty(network);
  },

  /**
   * Get optimized gas limit for opBNB operations
   */
  getOptimizedGasLimit: (network, operation = 'send') => {
    // Special optimization for opBNB (lower gas costs)
    if (network === NETWORKS.OPBNB) {
      const opbnbLimits = LAYERZERO_GAS_LIMITS[NETWORKS.OPBNB];
      return opbnbLimits[operation] || 150000;
    }
    return LayerZeroUtils.getGasLimit(network, operation);
  },

  /**
   * Check if network is Layer 2 (for fee optimization)
   */
  isLayer2: (network) => {
    const layer2Networks = [NETWORKS.ARBITRUM, NETWORKS.OPTIMISM, NETWORKS.OPBNB];
    return layer2Networks.includes(network);
  },

  /**
   * Get all possible routes from a network
   */
  getAvailableRoutes: (fromNetwork) => {
    if (!LayerZeroUtils.isNetworkSupported(fromNetwork)) {
      return [];
    }
    
    const trustedRemotes = LayerZeroUtils.getTrustedRemotes(fromNetwork);
    return trustedRemotes.map(toNetwork => ({
      from: fromNetwork,
      to: toNetwork,
      chainId: LayerZeroUtils.getChainId(toNetwork),
      estimatedFee: LayerZeroUtils.estimateFee(fromNetwork, toNetwork),
      gasLimit: LayerZeroUtils.getOptimizedGasLimit(toNetwork)
    }));
  }
};

module.exports = {
  LAYERZERO_V1_ENDPOINTS,
  LAYERZERO_V2_ENDPOINTS,
  LAYERZERO_CHAIN_IDS,
  CHAIN_ID_TO_NETWORK,
  LAYERZERO_GAS_LIMITS,
  TRUSTED_REMOTES,
  LAYERZERO_FEES,
  MESSAGE_TYPES,
  LAYERZERO_CONFIG,
  LayerZeroUtils
};
