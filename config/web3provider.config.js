// config/web3provider.config.js
// ------------------------------------------------------------
// Web3 provider configuration with RPC and WebSocket endpoints.
// Includes provider priority logic for fallback management.
// No imports - this is a standalone configuration module.
// ------------------------------------------------------------

// ------------------------------------------------------------
// RPC endpoints organized by chain ID with provider priorities
// ------------------------------------------------------------
export const RPC_ENDPOINTS = Object.freeze({
  // ── Ethereum Mainnet (1) ───────────────────────────────────
  1: Object.freeze({
    primary: 'https://ethereum-rpc.publicnode.com',
    fallbacks: Object.freeze([
      'https://eth.llamarpc.com',
      'https://rpc.ankr.com/eth',
      'https://ethereum.blockpi.network/v1/rpc/public',
      'https://eth-mainnet.public.blastapi.io',
      'https://api.mycryptoapi.com/eth'
    ])
  }),

  // ── Polygon Mainnet (137) ──────────────────────────────────
  137: Object.freeze({
    primary: 'https://polygon-rpc.com',
    fallbacks: Object.freeze([
      'https://polygon-bor-rpc.publicnode.com',
      'https://rpc.ankr.com/polygon',
      'https://polygon.llamarpc.com',
      'https://polygon-mainnet.public.blastapi.io',
      'https://polygon.blockpi.network/v1/rpc/public'
    ])
  }),

  // ── BSC Mainnet (56) ───────────────────────────────────────
  56: Object.freeze({
    primary: 'https://bsc-dataseed.binance.org',
    fallbacks: Object.freeze([
      'https://bsc-rpc.publicnode.com',
      'https://rpc.ankr.com/bsc',
      'https://bsc.llamarpc.com',
      'https://bsc-mainnet.public.blastapi.io',
      'https://bsc.blockpi.network/v1/rpc/public'
    ])
  }),

  // ── Arbitrum One (42161) ───────────────────────────────────
  42161: Object.freeze({
    primary: 'https://arb1.arbitrum.io/rpc',
    fallbacks: Object.freeze([
      'https://arbitrum-one-rpc.publicnode.com',
      'https://rpc.ankr.com/arbitrum',
      'https://arbitrum.llamarpc.com',
      'https://arbitrum-one.public.blastapi.io',
      'https://arbitrum.blockpi.network/v1/rpc/public'
    ])
  }),

  // ── Avalanche C-Chain (43114) ──────────────────────────────
  43114: Object.freeze({
    primary: 'https://api.avax.network/ext/bc/C/rpc',
    fallbacks: Object.freeze([
      'https://avalanche-c-chain-rpc.publicnode.com',
      'https://rpc.ankr.com/avalanche',
      'https://avalanche.public.blastapi.io/ext/bc/C/rpc',
      'https://avalanche.blockpi.network/v1/rpc/public',
      'https://avax.meowrpc.com'
    ])
  }),

  // ── Optimism Mainnet (10) ──────────────────────────────────
  10: Object.freeze({
    primary: 'https://mainnet.optimism.io',
    fallbacks: Object.freeze([
      'https://optimism-rpc.publicnode.com',
      'https://rpc.ankr.com/optimism',
      'https://optimism.llamarpc.com',
      'https://optimism-mainnet.public.blastapi.io',
      'https://optimism.blockpi.network/v1/rpc/public'
    ])
  }),

  // ── Ethereum Sepolia Testnet (11155111) ────────────────────
  11155111: Object.freeze({
    primary: 'https://ethereum-sepolia-rpc.publicnode.com',
    fallbacks: Object.freeze([
      'https://rpc.sepolia.org',
      'https://sepolia.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161',
      'https://eth-sepolia.public.blastapi.io',
      'https://rpc.ankr.com/eth_sepolia'
    ])
  }),

  // ── Arbitrum Sepolia Testnet (421614) ──────────────────────
  421614: Object.freeze({
    primary: 'https://sepolia-rollup.arbitrum.io/rpc',
    fallbacks: Object.freeze([
      'https://arbitrum-sepolia-rpc.publicnode.com',
      'https://rpc.ankr.com/arbitrum_sepolia',
      'https://arbitrum-sepolia.public.blastapi.io'
    ])
  }),

  // ── Optimism Sepolia Testnet (11155420) ────────────────────
  11155420: Object.freeze({
    primary: 'https://sepolia.optimism.io',
    fallbacks: Object.freeze([
      'https://optimism-sepolia-rpc.publicnode.com',
      'https://rpc.ankr.com/optimism_sepolia',
      'https://optimism-sepolia.public.blastapi.io'
    ])
  }),

  // ── BSC Testnet (97) ───────────────────────────────────────
  97: Object.freeze({
    primary: 'https://data-seed-prebsc-1-s1.binance.org:8545',
    fallbacks: Object.freeze([
      'https://bsc-testnet-rpc.publicnode.com',
      'https://rpc.ankr.com/bsc_testnet_chapel',
      'https://bsc-testnet.public.blastapi.io'
    ])
  }),

  // ── Avalanche Fuji Testnet (43113) ─────────────────────────
  43113: Object.freeze({
    primary: 'https://api.avax-test.network/ext/bc/C/rpc',
    fallbacks: Object.freeze([
      'https://avalanche-fuji-c-chain-rpc.publicnode.com',
      'https://rpc.ankr.com/avalanche_fuji',
      'https://avalanche-fuji.public.blastapi.io/ext/bc/C/rpc'
    ])
  }),

  // ── Polygon Amoy Testnet (80002) ───────────────────────────
  80002: Object.freeze({
    primary: 'https://rpc-amoy.polygon.technology',
    fallbacks: Object.freeze([
      'https://polygon-amoy-bor-rpc.publicnode.com',
      'https://rpc.ankr.com/polygon_amoy',
      'https://polygon-amoy.public.blastapi.io'
    ])
  })
});

// ------------------------------------------------------------
// WebSocket endpoints for real-time blockchain data
// ------------------------------------------------------------
export const WEBSOCKET_ENDPOINTS = Object.freeze({
  // ── Ethereum Mainnet (1) ───────────────────────────────────
  1: Object.freeze({
    primary: 'wss://ethereum-rpc.publicnode.com',
    fallbacks: Object.freeze([
      'wss://eth-mainnet.ws.alchemyapi.io/v2/demo',
      'wss://mainnet.infura.io/ws/v3/9aa3d95b3bc440fa88ea12eaa4456161'
    ])
  }),

  // ── Polygon Mainnet (137) ──────────────────────────────────
  137: Object.freeze({
    primary: 'wss://polygon-bor-rpc.publicnode.com',
    fallbacks: Object.freeze([
      'wss://polygon-mainnet.g.alchemy.com/v2/demo',
      'wss://ws-matic-mainnet.chainstacklabs.com'
    ])
  }),

  // ── BSC Mainnet (56) ───────────────────────────────────────
  56: Object.freeze({
    primary: 'wss://bsc-rpc.publicnode.com',
    fallbacks: Object.freeze([
      'wss://bsc-ws-node.nariox.org:443'
    ])
  }),

  // ── Arbitrum One (42161) ───────────────────────────────────
  42161: Object.freeze({
    primary: 'wss://arbitrum-one-rpc.publicnode.com',
    fallbacks: Object.freeze([
      'wss://arb-mainnet.g.alchemy.com/v2/demo'
    ])
  }),

  // ── Avalanche C-Chain (43114) ──────────────────────────────
  43114: Object.freeze({
    primary: 'wss://avalanche-c-chain-rpc.publicnode.com',
    fallbacks: Object.freeze([
      'wss://api.avax.network/ext/bc/C/ws'
    ])
  }),

  // ── Optimism Mainnet (10) ──────────────────────────────────
  10: Object.freeze({
    primary: 'wss://optimism-rpc.publicnode.com',
    fallbacks: Object.freeze([
      'wss://opt-mainnet.g.alchemy.com/v2/demo'
    ])
  }),

  // ── Ethereum Sepolia Testnet (11155111) ────────────────────
  11155111: Object.freeze({
    primary: 'wss://ethereum-sepolia-rpc.publicnode.com',
    fallbacks: Object.freeze([
      'wss://sepolia.infura.io/ws/v3/9aa3d95b3bc440fa88ea12eaa4456161'
    ])
  }),

  // ── Arbitrum Sepolia Testnet (421614) ──────────────────────
  421614: Object.freeze({
    primary: 'wss://arbitrum-sepolia-rpc.publicnode.com',
    fallbacks: Object.freeze([
      'wss://arb-sepolia.g.alchemy.com/v2/demo'
    ])
  }),

  // ── Optimism Sepolia Testnet (11155420) ────────────────────
  11155420: Object.freeze({
    primary: 'wss://optimism-sepolia-rpc.publicnode.com',
    fallbacks: Object.freeze([
      'wss://opt-sepolia.g.alchemy.com/v2/demo'
    ])
  }),

  // ── BSC Testnet (97) ───────────────────────────────────────
  97: Object.freeze({
    primary: 'wss://bsc-testnet-rpc.publicnode.com',
    fallbacks: Object.freeze([])
  }),

  // ── Avalanche Fuji Testnet (43113) ─────────────────────────
  43113: Object.freeze({
    primary: 'wss://avalanche-fuji-c-chain-rpc.publicnode.com',
    fallbacks: Object.freeze([
      'wss://api.avax-test.network/ext/bc/C/ws'
    ])
  }),

  // ── Polygon Amoy Testnet (80002) ───────────────────────────
  80002: Object.freeze({
    primary: 'wss://polygon-amoy-bor-rpc.publicnode.com',
    fallbacks: Object.freeze([])
  })
});

// ------------------------------------------------------------
// Provider priority and retry configuration
// ------------------------------------------------------------
export const PROVIDER_CONFIG = Object.freeze({
  // Retry configuration for failed requests
  retryConfig: Object.freeze({
    maxRetries: 3,
    retryDelay: 1000, // milliseconds
    exponentialBackoff: true,
    maxRetryDelay: 10000 // max 10 seconds
  }),

  // Request timeout configuration
  timeouts: Object.freeze({
    request: 30000,    // 30 seconds for regular requests
    websocket: 60000,  // 1 minute for WebSocket connections
    batch: 45000       // 45 seconds for batch requests
  }),

  // Provider priorities (higher number = higher priority)
  providerPriority: Object.freeze({
    publicnode: 100,   // Highest - no API keys needed
    llamarpc: 90,      // High - reliable free tier
    ankr: 80,          // Good - solid infrastructure
    blastapi: 70,      // Medium - good performance
    blockpi: 60,       // Medium - decent fallback
    official: 50,      // Lower - often rate limited
    infura: 40,        // Lowest - requires API key (demo only)
    alchemy: 30        // Lowest - requires API key (demo only)
  }),

  // Health check configuration
  healthCheck: Object.freeze({
    enabled: true,
    interval: 60000,   // Check every minute
    timeout: 5000,     // 5 second timeout
    failureThreshold: 3 // Mark as unhealthy after 3 failures
  }),

  // Load balancing configuration
  loadBalancing: Object.freeze({
    strategy: 'priority', // 'priority' | 'round-robin' | 'random'
    enableAutoFailover: true,
    maxConcurrentRequests: 10
  })
});

// ------------------------------------------------------------
// Block explorer URLs for transaction viewing
// ------------------------------------------------------------
export const BLOCK_EXPLORERS = Object.freeze({
  1: 'https://etherscan.io',
  137: 'https://polygonscan.com',
  56: 'https://bscscan.com',
  42161: 'https://arbiscan.io',
  43114: 'https://snowtrace.io',
  10: 'https://optimistic.etherscan.io',
  
  // Testnets
  11155111: 'https://sepolia.etherscan.io',
  421614: 'https://sepolia.arbiscan.io',
  11155420: 'https://sepolia-optimism.etherscan.io',
  97: 'https://testnet.bscscan.com',
  43113: 'https://testnet.snowtrace.io',
  80002: 'https://amoy.polygonscan.com'
});

// ------------------------------------------------------------
// Helper functions for provider management
// ------------------------------------------------------------

/**
 * Get RPC endpoints for a specific chain with fallback priority
 * @param {number} chainId - The chain ID
 * @returns {Object|null} RPC configuration or null if not supported
 */
export const getRpcEndpoints = (chainId) => {
  return RPC_ENDPOINTS[chainId] || null;
};

/**
 * Get WebSocket endpoints for a specific chain
 * @param {number} chainId - The chain ID
 * @returns {Object|null} WebSocket configuration or null if not supported
 */
export const getWebSocketEndpoints = (chainId) => {
  return WEBSOCKET_ENDPOINTS[chainId] || null;
};

/**
 * Get block explorer URL for a specific chain
 * @param {number} chainId - The chain ID
 * @returns {string|null} Block explorer URL or null if not supported
 */
export const getBlockExplorer = (chainId) => {
  return BLOCK_EXPLORERS[chainId] || null;
};

/**
 * Get all RPC URLs for a chain (primary + fallbacks)
 * @param {number} chainId - The chain ID
 * @returns {Array} Array of RPC URLs in priority order
 */
export const getAllRpcUrls = (chainId) => {
  const endpoints = getRpcEndpoints(chainId);
  if (!endpoints) return [];
  
  return [endpoints.primary, ...endpoints.fallbacks];
};

/**
 * Get all WebSocket URLs for a chain (primary + fallbacks)
 * @param {number} chainId - The chain ID
 * @returns {Array} Array of WebSocket URLs in priority order
 */
export const getAllWebSocketUrls = (chainId) => {
  const endpoints = getWebSocketEndpoints(chainId);
  if (!endpoints) return [];
  
  return [endpoints.primary, ...endpoints.fallbacks];
};

/**
 * Check if a chain is supported by the provider configuration
 * @param {number} chainId - The chain ID
 * @returns {boolean} True if supported
 */
export const isChainSupported = (chainId) => {
  return chainId in RPC_ENDPOINTS;
};

/**
 * Get supported chain IDs
 * @returns {Array} Array of supported chain IDs
 */
export const getSupportedChains = () => {
  return Object.keys(RPC_ENDPOINTS).map(Number);
};

/**
 * Get provider configuration for retry logic
 * @returns {Object} Provider configuration
 */
export const getProviderConfig = () => {
  return PROVIDER_CONFIG;
};
