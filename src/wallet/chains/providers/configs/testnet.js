/**
 * Testnet configurations for all supported blockchain networks
 * Production-ready settings optimized for testnet environments
 * Includes Goerli, Mumbai, BSC Testnet, Fuji, Arbitrum Goerli, and Optimism Goerli
 */

export const testnetConfigs = {
  ethereum: {
    chainId: 5,
    name: 'Ethereum Goerli',
    symbol: 'ETH',
    decimals: 18,
    rpcUrls: [
      'https://ethereum-sepolia-rpc.publicnode.com',
      'https://goerli.infura.io/v3/',
      'https://rpc.ankr.com/eth_goerli',
      'https://goerli.publicnode.com',
      'https://eth-goerli.public.blastapi.io',
      'https://goerli.gateway.tenderly.co'
    ],
    explorer: {
      name: 'Goerli Etherscan',
      baseUrl: 'https://goerli.etherscan.io',
      txPath: '/tx/',
      addressPath: '/address/',
      apiUrl: 'https://api-goerli.etherscan.io/api'
    },
    nativeCurrency: {
      name: 'Goerli Ether',
      symbol: 'ETH',
      decimals: 18
    },
    pollingInterval: 12000,
    blockConfirmations: 6,
    gasLimit: 21000,
    maxFeePerGas: '20000000000', // 20 gwei
    maxPriorityFeePerGas: '1000000000', // 1 gwei
    faucet: 'https://goerlifaucet.com'
  },

  polygon: {
    chainId: 80001,
    name: 'Polygon Mumbai',
    symbol: 'MATIC',
    decimals: 18,
    rpcUrls: [
      'https://polygon-amoy-bor-rpc.publicnode.com',
      'https://polygon-mumbai.g.alchemy.com/v2/',
      'https://rpc.ankr.com/polygon_mumbai',
      'https://polygon-mumbai.public.blastapi.io',
      'https://rpc-mumbai.maticvigil.com',
      'https://polygon-testnet.public.blastapi.io'
    ],
    explorer: {
      name: 'Mumbai PolygonScan',
      baseUrl: 'https://mumbai.polygonscan.com',
      txPath: '/tx/',
      addressPath: '/address/',
      apiUrl: 'https://api-testnet.polygonscan.com/api'
    },
    nativeCurrency: {
      name: 'Mumbai Matic',
      symbol: 'MATIC',
      decimals: 18
    },
    pollingInterval: 2000,
    blockConfirmations: 5,
    gasLimit: 8000000,
    maxFeePerGas: '50000000000', // 50 gwei
    maxPriorityFeePerGas: '5000000000', // 5 gwei
    faucet: 'https://faucet.polygon.technology'
  },

  bsc: {
    chainId: 97,
    name: 'BSC Testnet',
    symbol: 'tBNB',
    decimals: 18,
    rpcUrls: [
      'https://bsc-testnet-rpc.publicnode.com',
      'https://data-seed-prebsc-1-s1.binance.org:8545',
      'https://rpc.ankr.com/bsc_testnet_chapel',
      'https://bsc-testnet.public.blastapi.io',
      'https://data-seed-prebsc-2-s1.binance.org:8545',
      'https://bsc-testnet.publicnode.com'
    ],
    explorer: {
      name: 'BSC Testnet Scan',
      baseUrl: 'https://testnet.bscscan.com',
      txPath: '/tx/',
      addressPath: '/address/',
      apiUrl: 'https://api-testnet.bscscan.com/api'
    },
    nativeCurrency: {
      name: 'Test BNB',
      symbol: 'tBNB',
      decimals: 18
    },
    pollingInterval: 3000,
    blockConfirmations: 10,
    gasLimit: 8000000,
    maxFeePerGas: '5000000000', // 5 gwei
    maxPriorityFeePerGas: '1000000000', // 1 gwei
    faucet: 'https://testnet.binance.org/faucet-smart'
  },

  avalanche: {
    chainId: 43113,
    name: 'Avalanche Fuji',
    symbol: 'AVAX',
    decimals: 18,
    rpcUrls: [
      'https://avalanche-fuji-c-chain-rpc.publicnode.com',
      'https://api.avax-test.network/ext/bc/C/rpc',
      'https://rpc.ankr.com/avalanche_fuji',
      'https://avalanche-fuji.blockpi.network/v1/rpc/public',
      'https://ava-testnet.public.blastapi.io/ext/bc/C/rpc',
      'https://fuji.gateway.tenderly.co'
    ],
    explorer: {
      name: 'Fuji SnowTrace',
      baseUrl: 'https://testnet.snowtrace.io',
      txPath: '/tx/',
      addressPath: '/address/',
      apiUrl: 'https://api-testnet.snowtrace.io/api'
    },
    nativeCurrency: {
      name: 'Avalanche',
      symbol: 'AVAX',
      decimals: 18
    },
    pollingInterval: 2000,
    blockConfirmations: 3,
    gasLimit: 8000000,
    maxFeePerGas: '25000000000', // 25 gwei
    maxPriorityFeePerGas: '2000000000', // 2 gwei
    faucet: 'https://faucet.avax.network'
  },

  arbitrum: {
    chainId: 421613,
    name: 'Arbitrum Goerli',
    symbol: 'ETH',
    decimals: 18,
    rpcUrls: [
      'https://arbitrum-sepolia-rpc.publicnode.com',
      'https://goerli-rollup.arbitrum.io/rpc',
      'https://arb-goerli.publicnode.com',
      'https://rpc.ankr.com/arbitrum_goerli',
      'https://arbitrum-goerli.public.blastapi.io',
      'https://arbitrum-goerli.gateway.tenderly.co'
    ],
    explorer: {
      name: 'Arbitrum Goerli Explorer',
      baseUrl: 'https://goerli.arbiscan.io',
      txPath: '/tx/',
      addressPath: '/address/',
      apiUrl: 'https://api-goerli.arbiscan.io/api'
    },
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18
    },
    pollingInterval: 1000,
    blockConfirmations: 3,
    gasLimit: 32000000,
    maxFeePerGas: '1000000000', // 1 gwei
    maxPriorityFeePerGas: '100000000', // 0.1 gwei
    faucet: 'https://bridge.arbitrum.io'
  },

  optimism: {
    chainId: 420,
    name: 'Optimism Goerli',
    symbol: 'ETH',
    decimals: 18,
    rpcUrls: [
      'https://optimism-sepolia-rpc.publicnode.com',
      'https://goerli.optimism.io',
      'https://rpc.ankr.com/optimism_goerli',
      'https://optimism-goerli.public.blastapi.io',
      'https://optimism-goerli.gateway.tenderly.co',
      'https://opt-goerli.g.alchemy.com/v2/'
    ],
    explorer: {
      name: 'Optimism Goerli Explorer',
      baseUrl: 'https://goerli-optimism.etherscan.io',
      txPath: '/tx/',
      addressPath: '/address/',
      apiUrl: 'https://api-goerli-optimism.etherscan.io/api'
    },
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18
    },
    pollingInterval: 2000,
    blockConfirmations: 3,
    gasLimit: 15000000,
    maxFeePerGas: '1000000000', // 1 gwei
    maxPriorityFeePerGas: '100000000', // 0.1 gwei
    faucet: 'https://app.optimism.io/bridge'
  }
};

/**
 * Get testnet configuration for a specific chain
 * @param {string} chainName - Name of the blockchain (ethereum, polygon, bsc, etc.)
 * @returns {Object} Chain configuration object
 */
export function getTestnetConfig(chainName) {
  const config = testnetConfigs[chainName.toLowerCase()];
  if (!config) {
    throw new Error(`Testnet configuration not found for chain: ${chainName}`);
  }
  return { ...config };
}

/**
 * Get the first RPC URL for a testnet chain
 * @param {string} chainName - Name of the blockchain (ethereum, polygon, bsc, etc.)
 * @returns {string} First RPC URL for the specified chain
 */
export function getTestnetRpc(chainName) {
  const config = getTestnetConfig(chainName);
  return config.rpcUrls[0];
}

/**
 * Get all supported testnet chain IDs
 * @returns {Array<number>} Array of supported testnet chain IDs
 */
export function getSupportedTestnetChainIds() {
  return Object.values(testnetConfigs).map(config => config.chainId);
}

/**
 * Get testnet configuration by chain ID
 * @param {number} chainId - Chain ID to look up
 * @returns {Object} Chain configuration object
 */
export function getTestnetConfigByChainId(chainId) {
  const config = Object.values(testnetConfigs).find(c => c.chainId === chainId);
  if (!config) {
    throw new Error(`Testnet configuration not found for chain ID: ${chainId}`);
  }
  return { ...config };
}

/**
 * Check if a chain ID is supported in testnet
 * @param {number} chainId - Chain ID to check
 * @returns {boolean} True if supported
 */
export function isTestnetChainSupported(chainId) {
  return getSupportedTestnetChainIds().includes(chainId);
}

/**
 * Get faucet URL for a testnet chain
 * @param {string} chainName - Name of the blockchain
 * @returns {string} Faucet URL for the specified chain
 */
export function getTestnetFaucet(chainName) {
  const config = getTestnetConfig(chainName);
  return config.faucet || null;
}

/**
 * Get all testnet chains with their basic info
 * @returns {Array<Object>} Array of chain info objects
 */
export function getAllTestnetChains() {
  return Object.entries(testnetConfigs).map(([key, config]) => ({
    key,
    chainId: config.chainId,
    name: config.name,
    symbol: config.symbol,
    faucet: config.faucet
  }));
}

/**
 * Build explorer URL for transaction
 * @param {string} chainName - Name of the blockchain
 * @param {string} txHash - Transaction hash
 * @returns {string} Complete explorer URL for transaction
 */
export function buildTestnetTxUrl(chainName, txHash) {
  const config = getTestnetConfig(chainName);
  return `${config.explorer.baseUrl}${config.explorer.txPath}${txHash}`;
}

/**
 * Build explorer URL for address
 * @param {string} chainName - Name of the blockchain
 * @param {string} address - Wallet/contract address
 * @returns {string} Complete explorer URL for address
 */
export function buildTestnetAddressUrl(chainName, address) {
  const config = getTestnetConfig(chainName);
  return `${config.explorer.baseUrl}${config.explorer.addressPath}${address}`;
}
