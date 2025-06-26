// config/walletconnect.config.js
// ------------------------------------------------------------
// WalletConnect v2 configuration including project IDs, relay URLs,
// session timeouts, and chain-specific settings for dApp connections
// ------------------------------------------------------------

import { CHAIN_IDS } from './token.config.js';

// ------------------------------------------------------------
// Core WalletConnect project configuration
// ------------------------------------------------------------
export const WALLETCONNECT_PROJECT_CONFIG = Object.freeze({
  // Your WalletConnect Cloud project ID (register at cloud.walletconnect.com)
  projectId: '19cd0c9bde217d2b307f1aab44621317',
  
  // Primary relay server for WalletConnect communications
  relayUrl: 'wss://relay.walletconnect.com',
  
  // Fallback relay servers for redundancy
  fallbackRelays: Object.freeze([
    'wss://relay.walletconnect.org',
    'wss://bridge.walletconnect.org'
  ]),
  
  // App metadata displayed in connection requests
  metadata: Object.freeze({
    name: 'Trust Crypto Wallet',
    description: 'Multi-chain cryptocurrency wallet with DeFi integration',
    url: 'https://trust-crypto-wallet-extension.onrender.com',
    icons: ['https://trust-crypto-wallet-extension.onrender.com/logo.png']
  })
});

// ------------------------------------------------------------
// Session timeout configurations (in milliseconds)
// ------------------------------------------------------------
export const SESSION_TIMEOUTS = Object.freeze({
  // Default timeouts for all chains
  default: Object.freeze({
    connection:    30_000,   // 30 seconds to establish connection
    session:       3_600_000, // 1 hour session duration
    heartbeat:     30_000,   // 30 seconds between heartbeats
    request:       60_000,   // 1 minute for request/response
    pairing:       300_000   // 5 minutes for pairing timeout
  }),
  
  // Chain-specific timeout overrides
  [CHAIN_IDS.ETHEREUM]: Object.freeze({
    connection: 45_000,      // Longer due to potential network congestion
    session:    7_200_000,   // 2 hours for DeFi interactions
    request:    120_000      // 2 minutes for complex transactions
  }),
  
  [CHAIN_IDS.POLYGON]: Object.freeze({
    connection: 25_000,      // Faster network
    session:    3_600_000,   // 1 hour standard
    request:    45_000       // Faster confirmation times
  }),
  
  [CHAIN_IDS.BSC]: Object.freeze({
    connection: 25_000,      // Fast network
    session:    3_600_000,   // 1 hour standard
    request:    45_000       // Quick confirmations
  }),
  
  [CHAIN_IDS.ARBITRUM]: Object.freeze({
    connection: 20_000,      // L2 efficiency
    session:    5_400_000,   // 1.5 hours for DeFi
    request:    30_000       // Very fast L2 transactions
  }),
  
  [CHAIN_IDS.AVALANCHE]: Object.freeze({
    connection: 25_000,      // Fast finality
    session:    3_600_000,   // 1 hour standard
    request:    45_000       // Quick confirmations
  }),
  
  [CHAIN_IDS.OPTIMISM]: Object.freeze({
    connection: 20_000,      // L2 efficiency
    session:    5_400_000,   // 1.5 hours for DeFi
    request:    30_000       // Very fast L2 transactions
  })
});

// ------------------------------------------------------------
// Supported blockchain networks for WalletConnect sessions
// ------------------------------------------------------------
export const SUPPORTED_CHAINS = Object.freeze([
  // Mainnets
  `eip155:${CHAIN_IDS.ETHEREUM}`,
  `eip155:${CHAIN_IDS.POLYGON}`,
  `eip155:${CHAIN_IDS.BSC}`,
  `eip155:${CHAIN_IDS.ARBITRUM}`,
  `eip155:${CHAIN_IDS.AVALANCHE}`,
  `eip155:${CHAIN_IDS.OPTIMISM}`,
  
  // Testnets (for development)
  `eip155:${CHAIN_IDS.ETHEREUM_SEPOLIA}`,
  `eip155:${CHAIN_IDS.ARBITRUM_SEPOLIA}`,
  `eip155:${CHAIN_IDS.OPTIMISM_SEPOLIA}`,
  `eip155:${CHAIN_IDS.BSC_TESTNET}`,
  `eip155:${CHAIN_IDS.AVALANCHE_FUJI}`,
  `eip155:${CHAIN_IDS.POLYGON_AMOY}`
]);

// ------------------------------------------------------------
// Supported RPC methods per chain type
// ------------------------------------------------------------
export const SUPPORTED_METHODS = Object.freeze({
  // Standard Ethereum methods supported across all chains
  standard: Object.freeze([
    'eth_accounts',
    'eth_requestAccounts',
    'eth_sendTransaction',
    'eth_sign',
    'eth_signTransaction',
    'eth_signTypedData',
    'eth_signTypedData_v1',
    'eth_signTypedData_v3',
    'eth_signTypedData_v4',
    'personal_sign',
    'wallet_addEthereumChain',
    'wallet_switchEthereumChain',
    'wallet_watchAsset',
    'wallet_getPermissions',
    'wallet_requestPermissions'
  ]),
  
  // Chain-specific method extensions
  [CHAIN_IDS.ETHEREUM]: Object.freeze([
    'eth_subscribe',
    'eth_unsubscribe',
    'eth_newFilter',
    'eth_getFilterChanges',
    'eth_getLogs'
  ]),
  
  // L2-specific methods for Arbitrum and Optimism
  layer2: Object.freeze([
    'eth_estimateGas',
    'eth_gasPrice',
    'eth_feeHistory',
    'eth_maxPriorityFeePerGas'
  ])
});

// ------------------------------------------------------------
// Session management configuration
// ------------------------------------------------------------
export const SESSION_CONFIG = Object.freeze({
  // Maximum number of concurrent sessions
  maxConcurrentSessions: 10,
  
  // Auto-cleanup expired sessions
  enableAutoCleanup: true,
  cleanupInterval: 300_000, // 5 minutes
  
  // Session persistence
  persistSessions: true,
  storageKey: 'walletconnect_sessions',
  
  // Security settings
  requireUserApproval: true,
  enableSessionEncryption: true,
  
  // Connection preferences
  preferredRelay: 'wss://relay.walletconnect.com',
  enableFallbackRelays: true,
  maxRetryAttempts: 3,
  retryDelay: 5_000 // 5 seconds between retries
});

// ------------------------------------------------------------
// Network-specific WalletConnect configurations
// ------------------------------------------------------------
export const NETWORK_CONFIGS = Object.freeze({
  [CHAIN_IDS.ETHEREUM]: Object.freeze({
    namespace: 'eip155',
    chainId: CHAIN_IDS.ETHEREUM,
    rpcUrl: 'https://ethereum-rpc.publicnode.com',
    explorer: 'https://etherscan.io',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    enableEIP1559: true
  }),
  
  [CHAIN_IDS.POLYGON]: Object.freeze({
    namespace: 'eip155',
    chainId: CHAIN_IDS.POLYGON,
    rpcUrl: 'https://polygon-rpc.com',
    explorer: 'https://polygonscan.com',
    nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
    enableEIP1559: true
  }),
  
  [CHAIN_IDS.BSC]: Object.freeze({
    namespace: 'eip155',
    chainId: CHAIN_IDS.BSC,
    rpcUrl: 'https://bsc-dataseed.binance.org',
    explorer: 'https://bscscan.com',
    nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
    enableEIP1559: false // BSC doesn't use EIP-1559
  }),
  
  [CHAIN_IDS.ARBITRUM]: Object.freeze({
    namespace: 'eip155',
    chainId: CHAIN_IDS.ARBITRUM,
    rpcUrl: 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    enableEIP1559: true
  }),
  
  [CHAIN_IDS.AVALANCHE]: Object.freeze({
    namespace: 'eip155',
    chainId: CHAIN_IDS.AVALANCHE,
    rpcUrl: 'https://api.avax.network/ext/bc/C/rpc',
    explorer: 'https://snowtrace.io',
    nativeCurrency: { name: 'AVAX', symbol: 'AVAX', decimals: 18 },
    enableEIP1559: true
  }),
  
  [CHAIN_IDS.OPTIMISM]: Object.freeze({
    namespace: 'eip155',
    chainId: CHAIN_IDS.OPTIMISM,
    rpcUrl: 'https://mainnet.optimism.io',
    explorer: 'https://optimistic.etherscan.io',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    enableEIP1559: true
  }),

  // Testnets
  [CHAIN_IDS.ETHEREUM_SEPOLIA]: Object.freeze({
    namespace: 'eip155',
    chainId: CHAIN_IDS.ETHEREUM_SEPOLIA,
    rpcUrl: 'https://ethereum-sepolia-rpc.publicnode.com',
    explorer: 'https://sepolia.etherscan.io',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    enableEIP1559: true
  }),

  [CHAIN_IDS.ARBITRUM_SEPOLIA]: Object.freeze({
    namespace: 'eip155',
    chainId: CHAIN_IDS.ARBITRUM_SEPOLIA,
    rpcUrl: 'https://sepolia-rollup.arbitrum.io/rpc',
    explorer: 'https://sepolia.arbiscan.io',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    enableEIP1559: true
  }),

  [CHAIN_IDS.OPTIMISM_SEPOLIA]: Object.freeze({
    namespace: 'eip155',
    chainId: CHAIN_IDS.OPTIMISM_SEPOLIA,
    rpcUrl: 'https://sepolia.optimism.io',
    explorer: 'https://sepolia-optimism.etherscan.io',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    enableEIP1559: true
  }),

  [CHAIN_IDS.BSC_TESTNET]: Object.freeze({
    namespace: 'eip155',
    chainId: CHAIN_IDS.BSC_TESTNET,
    rpcUrl: 'https://data-seed-prebsc-1-s1.binance.org:8545',
    explorer: 'https://testnet.bscscan.com',
    nativeCurrency: { name: 'Test BNB', symbol: 'tBNB', decimals: 18 },
    enableEIP1559: false
  }),

  [CHAIN_IDS.AVALANCHE_FUJI]: Object.freeze({
    namespace: 'eip155',
    chainId: CHAIN_IDS.AVALANCHE_FUJI,
    rpcUrl: 'https://api.avax-test.network/ext/bc/C/rpc',
    explorer: 'https://testnet.snowtrace.io',
    nativeCurrency: { name: 'AVAX', symbol: 'AVAX', decimals: 18 },
    enableEIP1559: true
  }),

  [CHAIN_IDS.POLYGON_AMOY]: Object.freeze({
    namespace: 'eip155',
    chainId: CHAIN_IDS.POLYGON_AMOY,
    rpcUrl: 'https://rpc-amoy.polygon.technology',
    explorer: 'https://amoy.polygonscan.com',
    nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
    enableEIP1559: true
  })
});

// ------------------------------------------------------------
// Helper functions for WalletConnect integration
// ------------------------------------------------------------

/**
 * Get session timeout configuration for a specific chain
 * @param {number} chainId - The chain ID
 * @returns {Object} Timeout configuration
 */
export const getSessionTimeouts = (chainId) => {
  return SESSION_TIMEOUTS[chainId] || SESSION_TIMEOUTS.default;
};

/**
 * Get network configuration for a specific chain
 * @param {number} chainId - The chain ID
 * @returns {Object|null} Network configuration or null if not supported
 */
export const getNetworkConfig = (chainId) => {
  return NETWORK_CONFIGS[chainId] || null;
};

/**
 * Check if a chain is supported by WalletConnect
 * @param {number} chainId - The chain ID
 * @returns {boolean} True if supported
 */
export const isChainSupported = (chainId) => {
  return SUPPORTED_CHAINS.includes(`eip155:${chainId}`);
};

/**
 * Get supported methods for a specific chain
 * @param {number} chainId - The chain ID
 * @returns {Array} Array of supported method names
 */
export const getSupportedMethods = (chainId) => {
  const methods = [...SUPPORTED_METHODS.standard];
  
  // Add chain-specific methods
  if (SUPPORTED_METHODS[chainId]) {
    methods.push(...SUPPORTED_METHODS[chainId]);
  }
  
  // Add L2 methods for Arbitrum and Optimism
  if (chainId === CHAIN_IDS.ARBITRUM || chainId === CHAIN_IDS.OPTIMISM) {
    methods.push(...SUPPORTED_METHODS.layer2);
  }
  
  return methods;
};

/**
 * Generate WalletConnect chain string for a chain ID
 * @param {number} chainId - The chain ID
 * @returns {string} WalletConnect chain string (e.g., 'eip155:1')
 */
export const getChainString = (chainId) => {
  return `eip155:${chainId}`;
};

/**
 * Get all supported testnet chains
 * @returns {Array} Array of testnet chain IDs
 */
export const getTestnetChains = () => {
  return [
    CHAIN_IDS.ETHEREUM_SEPOLIA,
    CHAIN_IDS.ARBITRUM_SEPOLIA,
    CHAIN_IDS.OPTIMISM_SEPOLIA,
    CHAIN_IDS.BSC_TESTNET,
    CHAIN_IDS.AVALANCHE_FUJI,
    CHAIN_IDS.POLYGON_AMOY
  ];
};

/**
 * Get relay configuration with fallbacks
 * @returns {Object} Relay configuration
 */
export const getRelayConfig = () => {
  return {
    url: WALLETCONNECT_PROJECT_CONFIG.relayUrl,
    fallbacks: WALLETCONNECT_PROJECT_CONFIG.fallbackRelays,
    projectId: WALLETCONNECT_PROJECT_CONFIG.projectId
  };
};
