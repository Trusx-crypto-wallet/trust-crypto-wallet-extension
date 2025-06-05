/**
 * Mainnet configurations for all supported blockchain networks
 * Production-ready settings with optimized parameters for mainnet environments
 */

export const mainnetConfigs = {
  ethereum: {
    chainId: 1,
    name: 'Ethereum Mainnet',
    symbol: 'ETH',
    decimals: 18,
    rpcUrls: [
      'https://ethereum-rpc.publicnode.com',
      'https://mainnet.infura.io/v3/',
      'https://eth-mainnet.alchemyapi.io/v2/',
      'https://rpc.ankr.com/eth',
      'https://ethereum.publicnode.com',
      'https://eth-mainnet.public.blastapi.io'
    ],
    blockExplorer: {
      name: 'Etherscan',
      url: 'https://etherscan.io',
      apiUrl: 'https://api.etherscan.io/api'
    },
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18
    },
    pollingInterval: 12000,
    blockConfirmations: 12,
    gasLimit: 21000,
    maxFeePerGas: '50000000000', // 50 gwei
    maxPriorityFeePerGas: '2000000000' // 2 gwei
  },

  polygon: {
    chainId: 137,
    name: 'Polygon Mainnet',
    symbol: 'MATIC',
    decimals: 18,
    rpcUrls: [
      'https://polygon-bor-rpc.publicnode.com',
      'https://polygon.llamarpc.com',
      'https://polygon.blockpi.network/v1/rpc/public',
      'https://rpc.ankr.com/polygon',
      'https://polygon-mainnet.public.blastapi.io'
    ],
    blockExplorer: {
      name: 'PolygonScan',
      url: 'https://polygonscan.com',
      apiUrl: 'https://api.polygonscan.com/api'
    },
    nativeCurrency: {
      name: 'Polygon',
      symbol: 'MATIC',
      decimals: 18
    },
    pollingInterval: 2000,
    blockConfirmations: 10,
    gasLimit: 8000000,
    maxFeePerGas: '200000000000', // 200 gwei
    maxPriorityFeePerGas: '30000000000' // 30 gwei
  },

  bsc: {
    chainId: 56,
    name: 'BNB Smart Chain',
    symbol: 'BNB',
    decimals: 18,
    rpcUrls: [
      'https://bsc-rpc.publicnode.com',
      'https://bsc-dataseed1.binance.org',
      'https://bsc-dataseed2.binance.org',
      'https://bsc-dataseed3.binance.org',
      'https://rpc.ankr.com/bsc',
      'https://bsc.publicnode.com'
    ],
    blockExplorer: {
      name: 'BscScan',
      url: 'https://bscscan.com',
      apiUrl: 'https://api.bscscan.com/api'
    },
    nativeCurrency: {
      name: 'BNB',
      symbol: 'BNB',
      decimals: 18
    },
    pollingInterval: 3000,
    blockConfirmations: 15,
    gasLimit: 8000000,
    maxFeePerGas: '10000000000', // 10 gwei
    maxPriorityFeePerGas: '1000000000' // 1 gwei
  },

  avalanche: {
    chainId: 43114,
    name: 'Avalanche C-Chain',
    symbol: 'AVAX',
    decimals: 18,
    rpcUrls: [
      'https://avalanche-c-chain-rpc.publicnode.com',
      'https://api.avax.network/ext/bc/C/rpc',
      'https://rpc.ankr.com/avalanche',
      'https://avalanche.publicnode.com',
      'https://avalanche-c-chain.publicnode.com',
      'https://avax-mainnet.gateway.pokt.network/v1/lb/605238bf6b986eea7cf36d5e/ext/bc/C/rpc'
    ],
    blockExplorer: {
      name: 'SnowTrace',
      url: 'https://snowtrace.io',
      apiUrl: 'https://api.snowtrace.io/api'
    },
    nativeCurrency: {
      name: 'Avalanche',
      symbol: 'AVAX',
      decimals: 18
    },
    pollingInterval: 2000,
    blockConfirmations: 6,
    gasLimit: 8000000,
    maxFeePerGas: '50000000000', // 50 gwei
    maxPriorityFeePerGas: '2000000000' // 2 gwei
  },

  arbitrum: {
    chainId: 42161,
    name: 'Arbitrum One',
    symbol: 'ETH',
    decimals: 18,
    rpcUrls: [
      'https://arbitrum-one-rpc.publicnode.com',
      'https://arb1.arbitrum.io/rpc',
      'https://arbitrum-mainnet.infura.io/v3/',
      'https://rpc.ankr.com/arbitrum',
      'https://arbitrum.publicnode.com',
      'https://arbitrum-one.public.blastapi.io'
    ],
    blockExplorer: {
      name: 'Arbiscan',
      url: 'https://arbiscan.io',
      apiUrl: 'https://api.arbiscan.io/api'
    },
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18
    },
    pollingInterval: 1000,
    blockConfirmations: 5,
    gasLimit: 32000000,
    maxFeePerGas: '2000000000', // 2 gwei
    maxPriorityFeePerGas: '100000000' // 0.1 gwei
  },

  optimism: {
    chainId: 10,
    name: 'Optimism',
    symbol: 'ETH',
    decimals: 18,
    rpcUrls: [
      'https://optimism-rpc.publicnode.com',
      'https://mainnet.optimism.io',
      'https://rpc.ankr.com/optimism',
      'https://optimism-mainnet.public.blastapi.io',
      'https://optimism.publicnode.com',
      'https://optimism.gateway.tenderly.co'
    ],
    blockExplorer: {
      name: 'Optimistic Etherscan',
      url: 'https://optimistic.etherscan.io',
      apiUrl: 'https://api-optimistic.etherscan.io/api'
    },
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18
    },
    pollingInterval: 2000,
    blockConfirmations: 5,
    gasLimit: 15000000,
    maxFeePerGas: '2000000000', // 2 gwei
    maxPriorityFeePerGas: '100000000' // 0.1 gwei
  }
};

/**
 * Get mainnet configuration for a specific chain
 * @param {string} chainName - Name of the blockchain (ethereum, polygon, bsc, etc.)
 * @returns {Object} Chain configuration object
 */
export function getMainnetConfig(chainName) {
  const config = mainnetConfigs[chainName.toLowerCase()];
  if (!config) {
    throw new Error(`Mainnet configuration not found for chain: ${chainName}`);
  }
  return { ...config };
}

/**
 * Get all supported mainnet chain IDs
 * @returns {Array<number>} Array of supported chain IDs
 */
export function getSupportedMainnetChainIds() {
  return Object.values(mainnetConfigs).map(config => config.chainId);
}

/**
 * Get mainnet configuration by chain ID
 * @param {number} chainId - Chain ID to look up
 * @returns {Object} Chain configuration object
 */
export function getMainnetConfigByChainId(chainId) {
  const config = Object.values(mainnetConfigs).find(c => c.chainId === chainId);
  if (!config) {
    throw new Error(`Mainnet configuration not found for chain ID: ${chainId}`);
  }
  return { ...config };
}

/**
 * Check if a chain ID is supported in mainnet
 * @param {number} chainId - Chain ID to check
 * @returns {boolean} True if supported
 */
export function isMainnetChainSupported(chainId) {
  return getSupportedMainnetChainIds().includes(chainId);
}
