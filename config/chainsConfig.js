/**
 * Trust Crypto Wallet - Chain Configuration
 * Production-ready chain metadata for multi-chain wallet
 * 
 * File: config/chainsconfig.js
 * Compatible with: config/bridgeconfig.js
 * Last updated: 2025-07-17
 */

'use strict';

// ------------------------------------------------------------
// Chain IDs – Production mainnet and testnet IDs
// ------------------------------------------------------------
const CHAIN_IDS = Object.freeze({
  // Mainnets
  ETHEREUM:        1,
  POLYGON:         137,
  BSC:             56,
  ARBITRUM:        42161,
  AVALANCHE:       43114,
  OPTIMISM:        10,

  // Testnets
  ETHEREUM_SEPOLIA:   11155111,
  ARBITRUM_SEPOLIA:   421614,
  OPTIMISM_SEPOLIA:   11155420,
  BSC_TESTNET:        97,
  AVALANCHE_FUJI:     43113,
  POLYGON_AMOY:       80002
});

// ------------------------------------------------------------
// Production RPC endpoints with fallbacks
// ------------------------------------------------------------
const RPC_CONFIGS = {
  // Mainnet RPCs - Production grade with multiple fallbacks
  ethereum: {
    rpcUrls: [
      'https://ethereum-rpc.publicnode.com',
      'https://eth.llamarpc.com',
      'https://ethereum.blockpi.network/v1/rpc/public',
      'https://rpc.ankr.com/eth'
    ],
    blockExplorerUrls: ['https://etherscan.io'],
    websocketUrls: ['wss://ethereum-rpc.publicnode.com']
  },
  polygon: {
    rpcUrls: [
      'https://polygon-bor-rpc.publicnode.com',
      'https://polygon.llamarpc.com',
      'https://polygon.blockpi.network/v1/rpc/public',
      'https://rpc.ankr.com/polygon'
    ],
    blockExplorerUrls: ['https://polygonscan.com'],
    websocketUrls: ['wss://polygon-bor-rpc.publicnode.com']
  },
  bsc: {
    rpcUrls: [
      'https://bsc-rpc.publicnode.com',
      'https://binance.llamarpc.com',
      'https://bsc.blockpi.network/v1/rpc/public',
      'https://rpc.ankr.com/bsc'
    ],
    blockExplorerUrls: ['https://bscscan.com'],
    websocketUrls: ['wss://bsc-rpc.publicnode.com']
  },
  arbitrum: {
    rpcUrls: [
      'https://arbitrum-one-rpc.publicnode.com',
      'https://arbitrum.llamarpc.com',
      'https://arbitrum.blockpi.network/v1/rpc/public',
      'https://rpc.ankr.com/arbitrum'
    ],
    blockExplorerUrls: ['https://arbiscan.io'],
    websocketUrls: ['wss://arbitrum-one-rpc.publicnode.com']
  },
  avalanche: {
    rpcUrls: [
      'https://avalanche-c-chain-rpc.publicnode.com',
      'https://avalanche.blockpi.network/v1/rpc/public',
      'https://rpc.ankr.com/avalanche',
      'https://avax.meowrpc.com'
    ],
    blockExplorerUrls: ['https://snowtrace.io'],
    websocketUrls: ['wss://avalanche-c-chain-rpc.publicnode.com']
  },
  optimism: {
    rpcUrls: [
      'https://optimism-rpc.publicnode.com',
      'https://optimism.llamarpc.com',
      'https://optimism.blockpi.network/v1/rpc/public',
      'https://rpc.ankr.com/optimism'
    ],
    blockExplorerUrls: ['https://optimistic.etherscan.io'],
    websocketUrls: ['wss://optimism-rpc.publicnode.com']
  },
  
  // Testnet RPCs - For development and testing
  sepolia: {
    rpcUrls: [
      'https://ethereum-sepolia-rpc.publicnode.com',
      'https://sepolia.blockpi.network/v1/rpc/public',
      'https://rpc.sepolia.org',
      'https://rpc2.sepolia.org'
    ],
    blockExplorerUrls: ['https://sepolia.etherscan.io'],
    websocketUrls: ['wss://ethereum-sepolia-rpc.publicnode.com']
  },
  arbitrumSepolia: {
    rpcUrls: [
      'https://arbitrum-sepolia-rpc.publicnode.com',
      'https://arbitrum-sepolia.blockpi.network/v1/rpc/public',
      'https://sepolia-rollup.arbitrum.io/rpc'
    ],
    blockExplorerUrls: ['https://sepolia.arbiscan.io'],
    websocketUrls: ['wss://arbitrum-sepolia-rpc.publicnode.com']
  },
  optimismSepolia: {
    rpcUrls: [
      'https://optimism-sepolia-rpc.publicnode.com',
      'https://optimism-sepolia.blockpi.network/v1/rpc/public',
      'https://sepolia.optimism.io'
    ],
    blockExplorerUrls: ['https://sepolia-optimism.etherscan.io'],
    websocketUrls: ['wss://optimism-sepolia-rpc.publicnode.com']
  },
  bscTestnet: {
    rpcUrls: [
      'https://bsc-testnet-rpc.publicnode.com',
      'https://data-seed-prebsc-1-s1.binance.org:8545',
      'https://data-seed-prebsc-2-s1.binance.org:8545'
    ],
    blockExplorerUrls: ['https://testnet.bscscan.com'],
    websocketUrls: ['wss://bsc-testnet-rpc.publicnode.com']
  },
  avalancheFuji: {
    rpcUrls: [
      'https://avalanche-fuji-c-chain-rpc.publicnode.com',
      'https://avalanche-fuji.blockpi.network/v1/rpc/public',
      'https://api.avax-test.network/ext/bc/C/rpc'
    ],
    blockExplorerUrls: ['https://testnet.snowtrace.io'],
    websocketUrls: ['wss://avalanche-fuji-c-chain-rpc.publicnode.com']
  },
  polygonAmoy: {
    rpcUrls: [
      'https://polygon-amoy-bor-rpc.publicnode.com',
      'https://polygon-amoy.blockpi.network/v1/rpc/public',
      'https://rpc-amoy.polygon.technology'
    ],
    blockExplorerUrls: ['https://amoy.polygonscan.com'],
    websocketUrls: ['wss://polygon-amoy-bor-rpc.publicnode.com']
  }
};

// ------------------------------------------------------------
// Native currency configurations
// ------------------------------------------------------------
const NATIVE_CURRENCIES = {
  ethereum: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  polygon: { name: 'Polygon', symbol: 'MATIC', decimals: 18 },
  bsc: { name: 'Binance Coin', symbol: 'BNB', decimals: 18 },
  arbitrum: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  avalanche: { name: 'Avalanche', symbol: 'AVAX', decimals: 18 },
  optimism: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  sepolia: { name: 'Sepolia Ether', symbol: 'ETH', decimals: 18 },
  arbitrumSepolia: { name: 'Sepolia Ether', symbol: 'ETH', decimals: 18 },
  optimismSepolia: { name: 'Sepolia Ether', symbol: 'ETH', decimals: 18 },
  bscTestnet: { name: 'Test BNB', symbol: 'tBNB', decimals: 18 },
  avalancheFuji: { name: 'Avalanche', symbol: 'AVAX', decimals: 18 },
  polygonAmoy: { name: 'Polygon', symbol: 'MATIC', decimals: 18 }
};

// ------------------------------------------------------------
// Production gas configurations
// ------------------------------------------------------------
const GAS_SETTINGS = {
  ethereum: {
    gasLimit: 21000,
    maxFeePerGas: '20000000000', // 20 gwei
    maxPriorityFeePerGas: '2000000000', // 2 gwei
    eip1559: true
  },
  polygon: {
    gasLimit: 21000,
    maxFeePerGas: '40000000000', // 40 gwei
    maxPriorityFeePerGas: '30000000000', // 30 gwei
    eip1559: true
  },
  bsc: {
    gasLimit: 21000,
    gasPrice: '5000000000', // 5 gwei
    eip1559: false
  },
  arbitrum: {
    gasLimit: 21000,
    maxFeePerGas: '100000000', // 0.1 gwei
    maxPriorityFeePerGas: '10000000', // 0.01 gwei
    eip1559: true
  },
  avalanche: {
    gasLimit: 21000,
    maxFeePerGas: '25000000000', // 25 gwei
    maxPriorityFeePerGas: '1500000000', // 1.5 gwei
    eip1559: true
  },
  optimism: {
    gasLimit: 21000,
    maxFeePerGas: '1000000', // 0.001 gwei
    maxPriorityFeePerGas: '1000000', // 0.001 gwei
    eip1559: true
  }
};

// ------------------------------------------------------------
// Token list URLs - Production CDN with fallbacks
// ------------------------------------------------------------
const makeTokenListUrls = () => ({
  primary: 'https://cdn.jsdelivr.net/gh/Trusx-crypto-wallet/trust-crypto-wallet-tokenlist@main/tokenlist.json',
  fallback: 'https://raw.githubusercontent.com/Trusx-crypto-wallet/trust-crypto-wallet-tokenlist/main/tokenlist.json',
  backup: 'https://tokens.coingecko.com/ethereum/all.json' // Emergency fallback
});

// ------------------------------------------------------------
// Complete chain configurations map
// ------------------------------------------------------------
const CHAIN_CONFIGS = new Map([
  // MAINNETS
  [CHAIN_IDS.ETHEREUM, {
    chainId: CHAIN_IDS.ETHEREUM,
    name: 'Ethereum',
    shortName: 'eth',
    symbol: 'ETH',
    isTestnet: false,
    isL2: false,
    rpcUrls: RPC_CONFIGS.ethereum.rpcUrls,
    blockExplorerUrls: RPC_CONFIGS.ethereum.blockExplorerUrls,
    websocketUrls: RPC_CONFIGS.ethereum.websocketUrls,
    nativeCurrency: NATIVE_CURRENCIES.ethereum,
    gasSettings: GAS_SETTINGS.ethereum,
    tokenListUrls: makeTokenListUrls(),
    iconUrl: '/images/chains/ethereum.png',
    features: ['EIP1559', 'BRIDGE_SUPPORT', 'TOKEN_SWAPS']
  }],

  [CHAIN_IDS.POLYGON, {
    chainId: CHAIN_IDS.POLYGON,
    name: 'Polygon',
    shortName: 'polygon',
    symbol: 'MATIC',
    isTestnet: false,
    isL2: true,
    rpcUrls: RPC_CONFIGS.polygon.rpcUrls,
    blockExplorerUrls: RPC_CONFIGS.polygon.blockExplorerUrls,
    websocketUrls: RPC_CONFIGS.polygon.websocketUrls,
    nativeCurrency: NATIVE_CURRENCIES.polygon,
    gasSettings: GAS_SETTINGS.polygon,
    tokenListUrls: makeTokenListUrls(),
    iconUrl: '/images/chains/polygon.png',
    features: ['EIP1559', 'BRIDGE_SUPPORT', 'TOKEN_SWAPS', 'LOW_FEES']
  }],

  [CHAIN_IDS.BSC, {
    chainId: CHAIN_IDS.BSC,
    name: 'Binance Smart Chain',
    shortName: 'bsc',
    symbol: 'BNB',
    isTestnet: false,
    isL2: false,
    rpcUrls: RPC_CONFIGS.bsc.rpcUrls,
    blockExplorerUrls: RPC_CONFIGS.bsc.blockExplorerUrls,
    websocketUrls: RPC_CONFIGS.bsc.websocketUrls,
    nativeCurrency: NATIVE_CURRENCIES.bsc,
    gasSettings: GAS_SETTINGS.bsc,
    tokenListUrls: makeTokenListUrls(),
    iconUrl: '/images/chains/bsc.png',
    features: ['BRIDGE_SUPPORT', 'TOKEN_SWAPS', 'LOW_FEES']
  }],

  [CHAIN_IDS.ARBITRUM, {
    chainId: CHAIN_IDS.ARBITRUM,
    name: 'Arbitrum One',
    shortName: 'arb',
    symbol: 'ETH',
    isTestnet: false,
    isL2: true,
    rpcUrls: RPC_CONFIGS.arbitrum.rpcUrls,
    blockExplorerUrls: RPC_CONFIGS.arbitrum.blockExplorerUrls,
    websocketUrls: RPC_CONFIGS.arbitrum.websocketUrls,
    nativeCurrency: NATIVE_CURRENCIES.arbitrum,
    gasSettings: GAS_SETTINGS.arbitrum,
    tokenListUrls: makeTokenListUrls(),
    iconUrl: '/images/chains/arbitrum.png',
    features: ['EIP1559', 'BRIDGE_SUPPORT', 'TOKEN_SWAPS', 'LOW_FEES']
  }],

  [CHAIN_IDS.AVALANCHE, {
    chainId: CHAIN_IDS.AVALANCHE,
    name: 'Avalanche',
    shortName: 'avax',
    symbol: 'AVAX',
    isTestnet: false,
    isL2: false,
    rpcUrls: RPC_CONFIGS.avalanche.rpcUrls,
    blockExplorerUrls: RPC_CONFIGS.avalanche.blockExplorerUrls,
    websocketUrls: RPC_CONFIGS.avalanche.websocketUrls,
    nativeCurrency: NATIVE_CURRENCIES.avalanche,
    gasSettings: GAS_SETTINGS.avalanche,
    tokenListUrls: makeTokenListUrls(),
    iconUrl: '/images/chains/avalanche.png',
    features: ['EIP1559', 'BRIDGE_SUPPORT', 'TOKEN_SWAPS']
  }],

  [CHAIN_IDS.OPTIMISM, {
    chainId: CHAIN_IDS.OPTIMISM,
    name: 'Optimism',
    shortName: 'op',
    symbol: 'ETH',
    isTestnet: false,
    isL2: true,
    rpcUrls: RPC_CONFIGS.optimism.rpcUrls,
    blockExplorerUrls: RPC_CONFIGS.optimism.blockExplorerUrls,
    websocketUrls: RPC_CONFIGS.optimism.websocketUrls,
    nativeCurrency: NATIVE_CURRENCIES.optimism,
    gasSettings: GAS_SETTINGS.optimism,
    tokenListUrls: makeTokenListUrls(),
    iconUrl: '/images/chains/optimism.png',
    features: ['EIP1559', 'BRIDGE_SUPPORT', 'TOKEN_SWAPS', 'LOW_FEES']
  }],

  // TESTNETS
  [CHAIN_IDS.ETHEREUM_SEPOLIA, {
    chainId: CHAIN_IDS.ETHEREUM_SEPOLIA,
    name: 'Ethereum Sepolia',
    shortName: 'sep',
    symbol: 'ETH',
    isTestnet: true,
    isL2: false,
    rpcUrls: RPC_CONFIGS.sepolia.rpcUrls,
    blockExplorerUrls: RPC_CONFIGS.sepolia.blockExplorerUrls,
    websocketUrls: RPC_CONFIGS.sepolia.websocketUrls,
    nativeCurrency: NATIVE_CURRENCIES.sepolia,
    gasSettings: GAS_SETTINGS.ethereum,
    tokenListUrls: makeTokenListUrls(),
    iconUrl: '/images/chains/ethereum.png',
    features: ['EIP1559', 'BRIDGE_SUPPORT']
  }],

  [CHAIN_IDS.ARBITRUM_SEPOLIA, {
    chainId: CHAIN_IDS.ARBITRUM_SEPOLIA,
    name: 'Arbitrum Sepolia',
    shortName: 'arb-sep',
    symbol: 'ETH',
    isTestnet: true,
    isL2: true,
    rpcUrls: RPC_CONFIGS.arbitrumSepolia.rpcUrls,
    blockExplorerUrls: RPC_CONFIGS.arbitrumSepolia.blockExplorerUrls,
    websocketUrls: RPC_CONFIGS.arbitrumSepolia.websocketUrls,
    nativeCurrency: NATIVE_CURRENCIES.arbitrumSepolia,
    gasSettings: GAS_SETTINGS.arbitrum,
    tokenListUrls: makeTokenListUrls(),
    iconUrl: '/images/chains/arbitrum.png',
    features: ['EIP1559', 'BRIDGE_SUPPORT', 'LOW_FEES']
  }],

  [CHAIN_IDS.OPTIMISM_SEPOLIA, {
    chainId: CHAIN_IDS.OPTIMISM_SEPOLIA,
    name: 'Optimism Sepolia',
    shortName: 'op-sep',
    symbol: 'ETH',
    isTestnet: true,
    isL2: true,
    rpcUrls: RPC_CONFIGS.optimismSepolia.rpcUrls,
    blockExplorerUrls: RPC_CONFIGS.optimismSepolia.blockExplorerUrls,
    websocketUrls: RPC_CONFIGS.optimismSepolia.websocketUrls,
    nativeCurrency: NATIVE_CURRENCIES.optimismSepolia,
    gasSettings: GAS_SETTINGS.optimism,
    tokenListUrls: makeTokenListUrls(),
    iconUrl: '/images/chains/optimism.png',
    features: ['EIP1559', 'BRIDGE_SUPPORT', 'LOW_FEES']
  }],

  [CHAIN_IDS.BSC_TESTNET, {
    chainId: CHAIN_IDS.BSC_TESTNET,
    name: 'BSC Testnet',
    shortName: 'bsc-t',
    symbol: 'tBNB',
    isTestnet: true,
    isL2: false,
    rpcUrls: RPC_CONFIGS.bscTestnet.rpcUrls,
    blockExplorerUrls: RPC_CONFIGS.bscTestnet.blockExplorerUrls,
    websocketUrls: RPC_CONFIGS.bscTestnet.websocketUrls,
    nativeCurrency: NATIVE_CURRENCIES.bscTestnet,
    gasSettings: GAS_SETTINGS.bsc,
    tokenListUrls: makeTokenListUrls(),
    iconUrl: '/images/chains/bsc.png',
    features: ['BRIDGE_SUPPORT', 'LOW_FEES']
  }],

  [CHAIN_IDS.AVALANCHE_FUJI, {
    chainId: CHAIN_IDS.AVALANCHE_FUJI,
    name: 'Avalanche Fuji',
    shortName: 'fuji',
    symbol: 'AVAX',
    isTestnet: true,
    isL2: false,
    rpcUrls: RPC_CONFIGS.avalancheFuji.rpcUrls,
    blockExplorerUrls: RPC_CONFIGS.avalancheFuji.blockExplorerUrls,
    websocketUrls: RPC_CONFIGS.avalancheFuji.websocketUrls,
    nativeCurrency: NATIVE_CURRENCIES.avalancheFuji,
    gasSettings: GAS_SETTINGS.avalanche,
    tokenListUrls: makeTokenListUrls(),
    iconUrl: '/images/chains/avalanche.png',
    features: ['EIP1559', 'BRIDGE_SUPPORT']
  }],

  [CHAIN_IDS.POLYGON_AMOY, {
    chainId: CHAIN_IDS.POLYGON_AMOY,
    name: 'Polygon Amoy',
    shortName: 'amoy',
    symbol: 'MATIC',
    isTestnet: true,
    isL2: true,
    rpcUrls: RPC_CONFIGS.polygonAmoy.rpcUrls,
    blockExplorerUrls: RPC_CONFIGS.polygonAmoy.blockExplorerUrls,
    websocketUrls: RPC_CONFIGS.polygonAmoy.websocketUrls,
    nativeCurrency: NATIVE_CURRENCIES.polygonAmoy,
    gasSettings: GAS_SETTINGS.polygon,
    tokenListUrls: makeTokenListUrls(),
    iconUrl: '/images/chains/polygon.png',
    features: ['EIP1559', 'BRIDGE_SUPPORT', 'LOW_FEES']
  }]
]);

// ------------------------------------------------------------
// Simple CHAINS object for bridgeConfig.js compatibility
// ------------------------------------------------------------
const CHAINS = {
  1: { 
    name: 'Ethereum', 
    symbol: 'ETH', 
    rpc: 'https://ethereum-rpc.publicnode.com',
    chainId: 1,
    isTestnet: false
  },
  56: { 
    name: 'BSC', 
    symbol: 'BNB', 
    rpc: 'https://bsc-rpc.publicnode.com',
    chainId: 56,
    isTestnet: false
  },
  137: { 
    name: 'Polygon', 
    symbol: 'MATIC', 
    rpc: 'https://polygon-bor-rpc.publicnode.com',
    chainId: 137,
    isTestnet: false
  },
  42161: { 
    name: 'Arbitrum', 
    symbol: 'ETH', 
    rpc: 'https://arbitrum-one-rpc.publicnode.com',
    chainId: 42161,
    isTestnet: false
  },
  10: { 
    name: 'Optimism', 
    symbol: 'ETH', 
    rpc: 'https://optimism-rpc.publicnode.com',
    chainId: 10,
    isTestnet: false
  },
  43114: { 
    name: 'Avalanche', 
    symbol: 'AVAX', 
    rpc: 'https://avalanche-c-chain-rpc.publicnode.com',
    chainId: 43114,
    isTestnet: false
  }
};

// ------------------------------------------------------------
// Production utility functions
// ------------------------------------------------------------
const getChainConfig = (chainId) => {
  try {
    return CHAIN_CONFIGS.get(parseInt(chainId)) || null;
  } catch (error) {
    console.error('Invalid chainId provided:', chainId);
    return null;
  }
};

const isTestnet = (chainId) => {
  const config = getChainConfig(chainId);
  return config ? config.isTestnet : false;
};

const isL2 = (chainId) => {
  const config = getChainConfig(chainId);
  return config ? config.isL2 : false;
};

const getAllMainnets = () => {
  return Array.from(CHAIN_CONFIGS.values()).filter(config => !config.isTestnet);
};

const getAllTestnets = () => {
  return Array.from(CHAIN_CONFIGS.values()).filter(config => config.isTestnet);
};

const getSupportedChainIds = () => {
  return Array.from(CHAIN_CONFIGS.keys());
};

const getMainnetChainIds = () => {
  return getAllMainnets().map(config => config.chainId);
};

const getTestnetChainIds = () => {
  return getAllTestnets().map(config => config.chainId);
};

const getRpcUrl = (chainId, index = 0) => {
  const config = getChainConfig(chainId);
  if (!config || !config.rpcUrls || !config.rpcUrls[index]) {
    return null;
  }
  return config.rpcUrls[index];
};

const getExplorerUrl = (chainId) => {
  const config = getChainConfig(chainId);
  if (!config || !config.blockExplorerUrls || !config.blockExplorerUrls[0]) {
    return null;
  }
  return config.blockExplorerUrls[0];
};

const validateChainId = (chainId) => {
  return CHAIN_CONFIGS.has(parseInt(chainId));
};

// ------------------------------------------------------------
// Production error handling and validation
// ------------------------------------------------------------
const validateConfiguration = () => {
  const errors = [];
  const warnings = [];

  // Validate all chain configurations
  for (const [chainId, config] of CHAIN_CONFIGS) {
    if (!config.name || !config.symbol || !config.rpcUrls?.length) {
      errors.push(`Invalid configuration for chain ${chainId}`);
    }
    if (!config.blockExplorerUrls?.length) {
      warnings.push(`No block explorer configured for chain ${chainId}`);
    }
  }

  return { isValid: errors.length === 0, errors, warnings };
};

// ------------------------------------------------------------
// CommonJS exports for production use
// ------------------------------------------------------------
module.exports = {
  // Core exports
  CHAIN_IDS,
  CHAIN_CONFIGS,
  CHAINS, // Required by bridgeConfig.js
  
  // Utility functions
  getChainConfig,
  isTestnet,
  isL2,
  getAllMainnets,
  getAllTestnets,
  getSupportedChainIds,
  getMainnetChainIds,
  getTestnetChainIds,
  getRpcUrl,
  getExplorerUrl,
  validateChainId,
  validateConfiguration,
  
  // Production configurations
  RPC_CONFIGS,
  NATIVE_CURRENCIES,
  GAS_SETTINGS
};
