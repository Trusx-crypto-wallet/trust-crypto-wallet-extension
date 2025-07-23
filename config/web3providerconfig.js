/**
 * Web3 Provider Configuration
 * 
 * Comprehensive Web3 provider configuration for trust crypto wallet extension.
 * Provides Ethereum provider injection, RPC management, method handling, and multi-chain support.
 * Integrates with DApp connections, wallet operations, and cross-chain functionality.
 * 
 * @fileoverview Web3 provider configuration system for trust crypto wallet extension
 * @version 1.0.0
 * @author trust crypto wallet team
 */

import { TokenConfig } from './tokenconfig.js';
import { logger } from '../src/utils/logger.js';

/**
 * Web3 provider types and their configurations
 */
const PROVIDER_TYPES = {
  injected: {
    name: 'Injected Provider',
    type: 'injected',
    description: 'Standard window.ethereum injection for DApp compatibility',
    priority: 1,
    enabled: true
  },
  walletConnect: {
    name: 'WalletConnect Provider',
    type: 'walletconnect',
    description: 'WalletConnect v2.0 protocol provider for cross-platform connections',
    priority: 2,
    enabled: true
  },
  custom: {
    name: 'Custom Provider',
    type: 'custom',
    description: 'Custom provider implementation for specific use cases',
    priority: 3,
    enabled: true
/**
 * Security and validation configuration
 */
const SECURITY_CONFIG = {

/**
 * Ethereum provider configuration
 * Standard EIP-1193 compliant provider settings
 */
const ETHEREUM_PROVIDER_CONFIG = {
  // Provider identification
  identity: {
    isMetaMask: false,           // Don't impersonate MetaMask
    isTrustWallet: true,         // Identify as Trust Wallet
    isTrustCryptoWallet: true,   // Identify as Trust Crypto Wallet Extension
    isConnected: false,          // Connection status (dynamic)
    chainId: null,               // Current chain ID (dynamic)
    networkVersion: null,        // Network version (dynamic)
    selectedAddress: null        // Selected account (dynamic)
  },

  // Provider metadata
  metadata: {
    name: 'Trust Crypto Wallet Extension',
    description: 'Secure multi-chain crypto wallet for Web3 interactions',
    icon: '/public/icons/icon-128.png',
    rdns: 'com.trustwallet.extension',
    uuid: 'trust-crypto-wallet-extension-provider'
  },

  // EIP-1193 configuration
  eip1193: {
    supportsEIP1193: true,
    supportsEIP3085: true,       // wallet_addEthereumChain
    supportsEIP3326: true,       // wallet_switchEthereumChain
    supportsEIP747: true,        // wallet_watchAsset
    supportsEIP1102: true,       // eth_requestAccounts (deprecated but supported)
    supportsEIP2255: true        // wallet_getPermissions
  },

  // Event configuration
  events: {
    connect: true,
    disconnect: true,
    accountsChanged: true,
    chainChanged: true,
    message: true,
    data: false,                 // Deprecated
    notification: false,         // Custom events
    close: false                 // Legacy event
  },

  // Request handling
  requests: {
    timeout: 60000,              // 60 seconds
    maxPendingRequests: 20,      // Maximum queued requests
    batchRequests: false,        // Disable JSON-RPC batch requests
    parallelRequests: 5,         // Maximum parallel requests
    rateLimitPerMinute: 120      // Request rate limiting
  }
};

/**
 * Supported JSON-RPC methods with their configurations
 */
const SUPPORTED_METHODS = {
  // Account methods
  accounts: {
    'eth_accounts': {
      description: 'Returns list of addresses owned by client',
      requiresPermission: false,
      requiresConnection: true,
      riskLevel: 'low',
      cacheable: true,
      cacheTime: 30000
    },
    'eth_requestAccounts': {
      description: 'Requests access to user accounts',
      requiresPermission: true,
      requiresConnection: false,
      riskLevel: 'medium',
      cacheable: false,
      userApprovalRequired: true
    }
  },

  // Transaction methods
  transactions: {
    'eth_sendTransaction': {
      description: 'Creates new message call transaction or contract creation',
      requiresPermission: true,
      requiresConnection: true,
      riskLevel: 'high',
      cacheable: false,
      userApprovalRequired: true,
      gasEstimationRequired: true
    },
    'eth_signTransaction': {
      description: 'Signs transaction without sending to network',
      requiresPermission: true,
      requiresConnection: true,
      riskLevel: 'high',
      cacheable: false,
      userApprovalRequired: true
    },
    'eth_estimateGas': {
      description: 'Estimates gas needed for transaction',
      requiresPermission: false,
      requiresConnection: true,
      riskLevel: 'low',
      cacheable: true,
      cacheTime: 10000
    },
    'eth_gasPrice': {
      description: 'Returns current gas price in wei',
      requiresPermission: false,
      requiresConnection: true,
      riskLevel: 'low',
      cacheable: true,
      cacheTime: 30000
    },
    'eth_maxPriorityFeePerGas': {
      description: 'Returns max priority fee per gas for EIP-1559',
      requiresPermission: false,
      requiresConnection: true,
      riskLevel: 'low',
      cacheable: true,
      cacheTime: 30000
    },
    'eth_feeHistory': {
      description: 'Returns fee history for given block range',
      requiresPermission: false,
      requiresConnection: true,
      riskLevel: 'low',
      cacheable: true,
      cacheTime: 60000
    }
  },

  // Signing methods
  signing: {
    'personal_sign': {
      description: 'Signs arbitrary data with personal sign prefix',
      requiresPermission: true,
      requiresConnection: true,
      riskLevel: 'medium',
      cacheable: false,
      userApprovalRequired: true
    },
    'eth_sign': {
      description: 'Signs arbitrary data (deprecated, dangerous)',
      requiresPermission: true,
      requiresConnection: true,
      riskLevel: 'high',
      cacheable: false,
      userApprovalRequired: true,
      deprecated: true,
      warningMessage: 'eth_sign is deprecated and dangerous. Use personal_sign instead.'
    },
    'eth_signTypedData': {
      description: 'Signs typed structured data (EIP-712)',
      requiresPermission: true,
      requiresConnection: true,
      riskLevel: 'medium',
      cacheable: false,
      userApprovalRequired: true
    },
    'eth_signTypedData_v1': {
      description: 'Signs typed data v1 (deprecated)',
      requiresPermission: true,
      requiresConnection: true,
      riskLevel: 'medium',
      cacheable: false,
      userApprovalRequired: true,
      deprecated: true
    },
    'eth_signTypedData_v3': {
      description: 'Signs typed data v3',
      requiresPermission: true,
      requiresConnection: true,
      riskLevel: 'medium',
      cacheable: false,
      userApprovalRequired: true
    },
    'eth_signTypedData_v4': {
      description: 'Signs typed data v4 (recommended)',
      requiresPermission: true,
      requiresConnection: true,
      riskLevel: 'medium',
      cacheable: false,
      userApprovalRequired: true
    }
  },

  // Network methods
  network: {
    'eth_chainId': {
      description: 'Returns current chain ID',
      requiresPermission: false,
      requiresConnection: false,
      riskLevel: 'low',
      cacheable: true,
      cacheTime: 60000
    },
    'net_version': {
      description: 'Returns network ID (deprecated, use eth_chainId)',
      requiresPermission: false,
      requiresConnection: false,
      riskLevel: 'low',
      cacheable: true,
      cacheTime: 60000,
      deprecated: true
    },
    'wallet_addEthereumChain': {
      description: 'Adds new Ethereum chain to wallet',
      requiresPermission: true,
      requiresConnection: true,
      riskLevel: 'medium',
      cacheable: false,
      userApprovalRequired: true
    },
    'wallet_switchEthereumChain': {
      description: 'Switches to specified Ethereum chain',
      requiresPermission: true,
      requiresConnection: true,
      riskLevel: 'medium',
      cacheable: false,
      userApprovalRequired: true
    },
    'wallet_watchAsset': {
      description: 'Adds token to wallet watch list',
      requiresPermission: true,
      requiresConnection: true,
      riskLevel: 'low',
      cacheable: false,
      userApprovalRequired: true
    },
    'wallet_getPermissions': {
      description: 'Gets current permissions',
      requiresPermission: false,
      requiresConnection: true,
      riskLevel: 'low',
      cacheable: true,
      cacheTime: 30000
    },
    'wallet_requestPermissions': {
      description: 'Requests new permissions',
      requiresPermission: false,
      requiresConnection: true,
      riskLevel: 'medium',
      cacheable: false,
      userApprovalRequired: true
    }
  },

  // Data methods
  data: {
    'eth_call': {
      description: 'Executes new message call immediately',
      requiresPermission: false,
      requiresConnection: true,
      riskLevel: 'low',
      cacheable: true,
      cacheTime: 15000
    },
    'eth_getBalance': {
      description: 'Returns balance of given address',
      requiresPermission: false,
      requiresConnection: true,
      riskLevel: 'low',
      cacheable: true,
      cacheTime: 30000
    },
    'eth_getCode': {
      description: 'Returns code at given address',
      requiresPermission: false,
      requiresConnection: true,
      riskLevel: 'low',
      cacheable: true,
      cacheTime: 300000
    },
    'eth_getStorageAt': {
      description: 'Returns value from storage position',
      requiresPermission: false,
      requiresConnection: true,
      riskLevel: 'low',
      cacheable: true,
      cacheTime: 60000
    },
    'eth_blockNumber': {
      description: 'Returns current block number',
      requiresPermission: false,
      requiresConnection: true,
      riskLevel: 'low',
      cacheable: true,
      cacheTime: 15000
    },
    'eth_getBlockByNumber': {
      description: 'Returns block by number',
      requiresPermission: false,
      requiresConnection: true,
      riskLevel: 'low',
      cacheable: true,
      cacheTime: 300000
    },
    'eth_getBlockByHash': {
      description: 'Returns block by hash',
      requiresPermission: false,
      requiresConnection: true,
      riskLevel: 'low',
      cacheable: true,
      cacheTime: 300000
    },
    'eth_getTransactionByHash': {
      description: 'Returns transaction by hash',
      requiresPermission: false,
      requiresConnection: true,
      riskLevel: 'low',
      cacheable: true,
      cacheTime: 300000
    },
    'eth_getTransactionReceipt': {
      description: 'Returns transaction receipt',
      requiresPermission: false,
      requiresConnection: true,
      riskLevel: 'low',
      cacheable: true,
      cacheTime: 300000
    },
    'eth_getTransactionCount': {
      description: 'Returns transaction count (nonce)',
      requiresPermission: false,
      requiresConnection: true,
      riskLevel: 'low',
      cacheable: true,
      cacheTime: 10000
    },
    'eth_getLogs': {
      description: 'Returns array of logs matching filter',
      requiresPermission: false,
      requiresConnection: true,
      riskLevel: 'low',
      cacheable: true,
      cacheTime: 60000
    }
  },

  // Encryption methods
  encryption: {
    'eth_getEncryptionPublicKey': {
      description: 'Gets encryption public key for account',
      requiresPermission: true,
      requiresConnection: true,
      riskLevel: 'medium',
      cacheable: false,
      userApprovalRequired: true
    },
    'eth_decrypt': {
      description: 'Decrypts encrypted message',
      requiresPermission: true,
      requiresConnection: true,
      riskLevel: 'high',
      cacheable: false,
      userApprovalRequired: true
    }
  }
};

/**
 * Network-specific provider configurations
 */
const NETWORK_PROVIDER_CONFIG = {
  1: { // Ethereum Mainnet
    chainName: 'Ethereum Mainnet',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: [
      'https://ethereum-rpc.publicnode.com',
      'https://eth-mainnet.public.blastapi.io',
      'https://ethereum.publicnode.com'
    ],
    blockExplorerUrls: ['https://etherscan.io'],
    iconUrls: ['/public/images/chains/ethereum.png'],
    features: {
      eip1559: true,
      eip155: true,
      eip2930: true
    }
  },
  56: { // BSC
    chainName: 'BNB Smart Chain',
    nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
    rpcUrls: [
      'https://bsc-rpc.publicnode.com',
      'https://bsc-dataseed1.binance.org',
      'https://bsc-dataseed2.binance.org'
    ],
    blockExplorerUrls: ['https://bscscan.com'],
    iconUrls: ['/public/images/chains/bsc.png'],
    features: {
      eip1559: false,
      eip155: true,
      eip2930: false
    }
  },
  137: { // Polygon
    chainName: 'Polygon Mainnet',
    nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
    rpcUrls: [
      'https://polygon-bor-rpc.publicnode.com',
      'https://polygon-rpc.com',
      'https://rpc-mainnet.matic.network'
    ],
    blockExplorerUrls: ['https://polygonscan.com'],
    iconUrls: ['/public/images/chains/polygon.png'],
    features: {
      eip1559: true,
      eip155: true,
      eip2930: true
    }
  },
  42161: { // Arbitrum
    chainName: 'Arbitrum One',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: [
      'https://arbitrum-one-rpc.publicnode.com',
      'https://arb1.arbitrum.io/rpc',
      'https://arbitrum-mainnet.infura.io/v3'
    ],
    blockExplorerUrls: ['https://arbiscan.io'],
    iconUrls: ['/public/images/chains/arbitrum.png'],
    features: {
      eip1559: false,
      eip155: true,
      eip2930: false
    }
  },
  10: { // Optimism
    chainName: 'Optimism',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: [
      'https://optimism-rpc.publicnode.com',
      'https://mainnet.optimism.io',
      'https://optimism-mainnet.public.blastapi.io'
    ],
    blockExplorerUrls: ['https://optimistic.etherscan.io'],
    iconUrls: ['/public/images/chains/optimism.png'],
    features: {
      eip1559: true,
      eip155: true,
      eip2930: true
    }
  },
  43114: { // Avalanche
    chainName: 'Avalanche C-Chain',
    nativeCurrency: { name: 'Avalanche', symbol: 'AVAX', decimals: 18 },
    rpcUrls: [
      'https://avalanche-c-chain-rpc.publicnode.com',
      'https://api.avax.network/ext/bc/C/rpc',
      'https://avalanche-mainnet.infura.io/v3'
    ],
    blockExplorerUrls: ['https://snowtrace.io'],
    iconUrls: ['/public/images/chains/avalanche.png'],
    features: {
      eip1559: true,
      eip155: true,
      eip2930: true
    }
  }
};

/**
 * DApp detection and compatibility configuration
 */
const DAPP_COMPATIBILITY = {
  // Popular DApp detection patterns
  detectionPatterns: {
    remix: {
      domain: 'remix.ethereum.org',
      userAgent: /remix/i,
      specialHandling: true,
      features: ['contract_deployment', 'debugging', 'testing']
    },
    uniswap: {
      domain: 'app.uniswap.org',
      userAgent: null,
      specialHandling: false,
      features: ['token_swaps', 'liquidity_provision']
    },
    opensea: {
      domain: 'opensea.io',
      userAgent: null,
      specialHandling: false,
      features: ['nft_trading', 'collections']
    }
  },

  // Browser compatibility
  browserCompatibility: {
    chrome: { supported: true, version: '88+' },
    firefox: { supported: true, version: '78+' },
    safari: { supported: true, version: '14+' },
    edge: { supported: true, version: '88+' },
    opera: { supported: true, version: '74+' },
    brave: { supported: true, version: '1.20+' }
  },

  // Feature detection
  featureSupport: {
    eip1193: true,           // Standard provider interface
    eip1102: true,           // Account access (deprecated)
    eip3085: true,           // Add chain
    eip3326: true,           // Switch chain
    eip747: true,            // Watch asset
    eip2255: true,           // Permissions API
    eip6963: true            // Provider discovery
  }
};

/**
 * Fallback configurations for unsupported methods and network failures
 */
const FALLBACK_CONFIG = {
  // Unsupported method handling
  unsupportedMethods: {
    enabled: true,
    defaultResponse: {
      error: {
        code: -32601,
        message: 'Method not supported by Trust Crypto Wallet Extension'
      }
    },
    gracefulDegradation: {
      'eth_mining': { fallback: false, alternative: null },
      'eth_hashrate': { fallback: false, alternative: null },
      'eth_coinbase': { fallback: 'eth_accounts', alternative: 'Use eth_accounts instead' },
      'eth_submitWork': { fallback: false, alternative: null },
      'eth_submitHashrate': { fallback: false, alternative: null },
      'debug_traceTransaction': { fallback: false, alternative: 'Use block explorer for transaction details' },
      'trace_transaction': { fallback: false, alternative: 'Use block explorer for transaction tracing' },
      'personal_ecRecover': { fallback: false, alternative: 'Use client-side signature verification' },
      'personal_importRawKey': { fallback: false, alternative: 'Import through wallet interface' },
      'personal_lockAccount': { fallback: false, alternative: 'Use wallet lock feature' },
      'personal_unlockAccount': { fallback: false, alternative: 'Authenticate through wallet UI' }
    }
  },

  // Network failure handling
  networkFailures: {
    enabled: true,
    retryAttempts: 3,
    retryDelay: 2000,        // 2 seconds
    exponentialBackoff: true,
    maxDelay: 30000,         // 30 seconds max delay
    timeoutMs: 60000,        // 60 seconds timeout
    
    // Fallback RPC endpoints per network
    fallbackRPCs: {
      1: [  // Ethereum
        'https://ethereum-rpc.publicnode.com',
        'https://eth-mainnet.public.blastapi.io',
        'https://ethereum.publicnode.com',
        'https://rpc.ankr.com/eth',
        'https://eth-mainnet.nodereal.io/v1/1659dfb40aa24bbb8153a677b98064d7'
      ],
      56: [ // BSC
        'https://bsc-rpc.publicnode.com',
        'https://bsc-dataseed1.binance.org',
        'https://bsc-dataseed2.binance.org',
        'https://bsc-dataseed3.binance.org',
        'https://rpc.ankr.com/bsc'
      ],
      137: [ // Polygon
        'https://polygon-bor-rpc.publicnode.com',
        'https://polygon-rpc.com',
        'https://rpc-mainnet.matic.network',
        'https://rpc.ankr.com/polygon',
        'https://polygon-mainnet.nodereal.io/v1/1659dfb40aa24bbb8153a677b98064d7'
      ],
      42161: [ // Arbitrum
        'https://arbitrum-one-rpc.publicnode.com',
        'https://arb1.arbitrum.io/rpc',
        'https://rpc.ankr.com/arbitrum',
        'https://arbitrum-mainnet.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161'
      ],
      10: [ // Optimism
        'https://optimism-rpc.publicnode.com',
        'https://mainnet.optimism.io',
        'https://optimism-mainnet.public.blastapi.io',
        'https://rpc.ankr.com/optimism'
      ],
      43114: [ // Avalanche
        'https://avalanche-c-chain-rpc.publicnode.com',
        'https://api.avax.network/ext/bc/C/rpc',
        'https://rpc.ankr.com/avalanche',
        'https://avalanche-mainnet.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161'
      ]
    },

    // Offline mode configuration
    offlineMode: {
      enabled: true,
      cacheReadOnlyMethods: true,
      allowedMethods: [
        'eth_chainId',
        'net_version', 
        'eth_accounts',
        'wallet_getPermissions'
      ],
      offlineMessage: 'Network unavailable. Operating in offline mode with cached data.'
    }
  },

  // Error categorization and handling
  errorHandling: {
    categories: {
      'network': {
        codes: [-32603, -32000, -32002, -32005],
        retryable: true,
        fallbackStrategy: 'retry_with_fallback_rpc'
      },
      'method': {
        codes: [-32601],
        retryable: false,
        fallbackStrategy: 'graceful_degradation'
      },
      'params': {
        codes: [-32602, -32700],
        retryable: false,
        fallbackStrategy: 'user_feedback'
      },
      'auth': {
        codes: [4001, 4100, 4200, 4900, 4901],
        retryable: false,
        fallbackStrategy: 'user_action_required'
      },
      'rate_limit': {
        codes: [429, -32004],
        retryable: true,
        fallbackStrategy: 'exponential_backoff'
      }
    },

    // User-friendly error messages
    userMessages: {
      '-32601': 'This feature is not supported. Please try an alternative method.',
      '-32603': 'Network connection failed. Retrying with backup servers...',
      '-32000': 'Server temporarily unavailable. Please try again in a moment.',
      '4001': 'Transaction rejected. You can try again if needed.',
      '4100': 'Account not authorized. Please connect your wallet first.',
      'network_timeout': 'Network request timed out. Switching to backup server...',
      'rpc_failure': 'Primary server unavailable. Using backup connection...',
      'unsupported_chain': 'This network is not supported. Please switch to a supported network.',
      'offline_mode': 'You are currently offline. Some features may be limited.'
    }
  }
};
  // Origin validation
  origin: {
    validateOrigin: true,
    allowedOrigins: [],          // Empty = allow all (managed by permission system)
    blockedOrigins: [
      'chrome-extension://',     // Block other extensions
      'moz-extension://',        // Block Firefox extensions
      'safari-extension://'      // Block Safari extensions
    ],
    requireHttps: false          // Allow HTTP for localhost development
  },

  // Request validation
  request: {
    validateParams: true,        // Validate method parameters
    sanitizeInputs: true,        // Sanitize input data
    maxParamSize: 1048576,      // 1MB max parameter size
    maxArrayLength: 10000,       // Max array length in parameters
    preventReplay: true          // Prevent replay attacks
  },

  // Rate limiting
  rateLimit: {
    enabled: true,
    windowMs: 60000,            // 1 minute window
    maxRequests: 120,           // Max requests per window
    skipSuccessfulRequests: false,
    skipFailedRequests: false
  },

  // Anti-phishing
  antiPhishing: {
    enabled: true,
    checkDomainSimilarity: true,
    warnOnSuspiciousDomains: true,
    blockKnownPhishingSites: true
  }
};

/**
 * Web3 Provider Configuration Manager
 * Main class for managing Web3 provider configurations and operations
 */
class Web3ProviderConfigManager {
  constructor() {
    this.tokenConfig = null;
    this.activeProviders = new Map();
    this.methodCache = new Map();
    this.initialized = false;
    this.initializing = false;
    this.initPromise = null;
  }

  /**
   * Auto-initializes the manager on first access (lazy initialization)
   * @private
   * @returns {Promise<void>}
   */
  async _ensureInitialized() {
    if (this.initialized) {
      return;
    }

    if (this.initializing) {
      return this.initPromise;
    }

    this.initializing = true;
    this.initPromise = this._initialize();
    
    try {
      await this.initPromise;
    } finally {
      this.initializing = false;
    }
  }

  /**
   * Internal initialization method
   * @private
   * @returns {Promise<void>}
   */
  async _initialize() {
    try {
      this.tokenConfig = new TokenConfig();
      await this.tokenConfig.initialize();
      this.setupCacheCleanup();
      this.initialized = true;
      logger.info('Web3ProviderConfigManager auto-initialized successfully');
    } catch (error) {
      logger.error('Failed to auto-initialize Web3ProviderConfigManager:', error);
      throw error;
    }
  }

  /**
   * Manual initialization method (optional - auto-initialization preferred)
   * @returns {Promise<void>}
   */
  async initialize() {
    return await this._ensureInitialized();
  }

  /**
   * Gets Ethereum provider configuration
   * @param {Object} [options={}] - Configuration options
   * @returns {Promise<Object>} Ethereum provider configuration
   */
  async getEthereumProviderConfig(options = {}) {
    await this._ensureInitialized();

    const config = {
      ...ETHEREUM_PROVIDER_CONFIG,
      // Dynamic properties
      chainId: options.chainId || null,
      networkVersion: options.networkVersion || null,
      selectedAddress: options.selectedAddress || null,
      isConnected: options.isConnected || false
    };

    // Update identity based on current state
    config.identity.chainId = config.chainId;
    config.identity.networkVersion = config.networkVersion;
    config.identity.selectedAddress = config.selectedAddress;
    config.identity.isConnected = config.isConnected;

    return config;
  }

  /**
   * Gets supported JSON-RPC methods configuration
   * @param {string} [category] - Method category filter
   * @returns {Promise<Object>} Supported methods configuration
   */
  async getSupportedMethods(category = null) {
    await this._ensureInitialized();

    if (category && SUPPORTED_METHODS[category]) {
      return SUPPORTED_METHODS[category];
    }

    return SUPPORTED_METHODS;
  }

  /**
   * Gets method configuration by name
   * @param {string} methodName - JSON-RPC method name
   * @returns {Promise<Object|null>} Method configuration
   */
  async getMethodConfig(methodName) {
    await this._ensureInitialized();

    // Search through all categories
    for (const category of Object.values(SUPPORTED_METHODS)) {
      if (category[methodName]) {
        return {
          method: methodName,
          category: Object.keys(SUPPORTED_METHODS).find(key => 
            SUPPORTED_METHODS[key] === category
          ),
          ...category[methodName]
        };
      }
    }

    return null;
  }

  /**
   * Validates if method is supported
   * @param {string} methodName - JSON-RPC method name
   * @returns {Promise<boolean>} True if method is supported
   */
  async isMethodSupported(methodName) {
    const methodConfig = await this.getMethodConfig(methodName);
    return methodConfig !== null;
  }

  /**
   * Gets network provider configuration
   * @param {number} chainId - Network chain ID
   * @returns {Promise<Object|null>} Network provider configuration
   */
  async getNetworkConfig(chainId) {
    await this._ensureInitialized();

    return NETWORK_PROVIDER_CONFIG[chainId] || null;
  }

  /**
   * Gets all supported networks
   * @returns {Promise<Array>} Array of supported networks
   */
  async getSupportedNetworks() {
    await this._ensureInitialized();

    return Object.entries(NETWORK_PROVIDER_CONFIG).map(([chainId, config]) => ({
      chainId: Number(chainId),
      ...config
    }));
  }

  /**
   * Validates network configuration for adding to wallet
   * @param {Object} networkConfig - Network configuration to validate
   * @returns {Promise<Object>} Validation results
   */
  async validateNetworkConfig(networkConfig) {
    await this._ensureInitialized();

    try {
      const results = {
        isValid: true,
        errors: [],
        warnings: []
      };

      // Required fields validation
      const requiredFields = ['chainId', 'chainName', 'nativeCurrency', 'rpcUrls'];
      for (const field of requiredFields) {
        if (!networkConfig[field]) {
          results.errors.push(`Missing required field: ${field}`);
          results.isValid = false;
        }
      }

      // Chain ID validation
      if (networkConfig.chainId) {
        const chainId = typeof networkConfig.chainId === 'string' 
          ? parseInt(networkConfig.chainId, 16) 
          : networkConfig.chainId;

        if (chainId <= 0 || chainId > 4503599627370476) {
          results.errors.push('Invalid chain ID');
          results.isValid = false;
        }

        // Check if already supported
        if (NETWORK_PROVIDER_CONFIG[chainId]) {
          results.warnings.push('Chain is already supported');
        }
      }

      // RPC URLs validation
      if (networkConfig.rpcUrls && Array.isArray(networkConfig.rpcUrls)) {
        for (const rpcUrl of networkConfig.rpcUrls) {
          try {
            new URL(rpcUrl);
          } catch (error) {
            results.errors.push(`Invalid RPC URL: ${rpcUrl}`);
            results.isValid = false;
          }
        }
      }

      // Native currency validation
      if (networkConfig.nativeCurrency) {
        const currency = networkConfig.nativeCurrency;
        if (!currency.name || !currency.symbol || currency.decimals === undefined) {
          results.errors.push('Invalid native currency configuration');
          results.isValid = false;
        }

        if (currency.decimals < 0 || currency.decimals > 36) {
          results.errors.push('Native currency decimals must be between 0 and 36');
          results.isValid = false;
        }
      }

      return results;
    } catch (error) {
      logger.error('Network config validation failed:', error);
      return {
        isValid: false,
        errors: ['Validation failed due to internal error'],
        warnings: []
      };
    }
  }

  /**
   * Gets DApp compatibility configuration
   * @param {string} [domain] - Domain to check compatibility for
   * @returns {Promise<Object>} DApp compatibility configuration
   */
  async getDAppCompatibility(domain = null) {
    await this._ensureInitialized();

    if (domain) {
      // Check for specific DApp patterns
      for (const [dappName, config] of Object.entries(DAPP_COMPATIBILITY.detectionPatterns)) {
        if (domain.includes(config.domain)) {
          return {
            dapp: dappName,
            detected: true,
            ...config
          };
        }
      }

      return {
        dapp: 'unknown',
        detected: false,
        domain,
        specialHandling: false,
        features: []
      };
    }

    return DAPP_COMPATIBILITY;
  }

  /**
   * Gets security configuration
   * @returns {Promise<Object>} Security configuration
   */
  async getSecurityConfig() {
    await this._ensureInitialized();
    return { ...SECURITY_CONFIG };
  }

  /**
   * Validates request origin
   * @param {string} origin - Request origin
   * @returns {Promise<Object>} Origin validation results
   */
  async validateOrigin(origin) {
    await this._ensureInitialized();

    try {
      const results = {
        isValid: true,
        blocked: false,
        warnings: [],
        riskLevel: 'low'
      };

      // Check blocked origins
      for (const blockedPattern of SECURITY_CONFIG.origin.blockedOrigins) {
        if (origin.startsWith(blockedPattern)) {
          results.isValid = false;
          results.blocked = true;
          results.warnings.push(`Blocked origin pattern: ${blockedPattern}`);
          results.riskLevel = 'high';
          break;
        }
      }

      // HTTPS requirement (except localhost)
      if (SECURITY_CONFIG.origin.requireHttps && 
          !origin.startsWith('https://') && 
          !origin.startsWith('http://localhost') &&
          !origin.startsWith('http://127.0.0.1')) {
        results.warnings.push('Non-HTTPS origin detected');
        results.riskLevel = 'medium';
      }

      // Anti-phishing check
      if (SECURITY_CONFIG.antiPhishing.enabled) {
        const phishingCheck = await this._checkPhishingDomain(origin);
        if (phishingCheck.suspicious) {
          results.warnings.push('Potentially suspicious domain detected');
          results.riskLevel = 'high';
        }
      }

      return results;
    } catch (error) {
      logger.error('Origin validation failed:', error);
      return {
        isValid: false,
        blocked: true,
        warnings: ['Origin validation failed'],
        riskLevel: 'high'
      };
    }
  }

  /**
   * Checks domain for phishing indicators
   * @private
   * @param {string} origin - Origin to check
   * @returns {Promise<Object>} Phishing check results
   */
  async _checkPhishingDomain(origin) {
    try {
      const url = new URL(origin);
      const domain = url.hostname.toLowerCase();

      const results = {
        suspicious: false,
        reasons: []
      };

      // Check for suspicious patterns
      const suspiciousPatterns = [
        /metamask[0-9]+\.com/i,
        /trustwallet[0-9]+\.com/i,
        /uniswap[0-9]+\.org/i,
        /pancakeswap[0-9]+\.finance/i,
        /\-[a-z]+\.com$/i,  // Domains ending with -something.com
        /[а-я]/i,           // Cyrillic characters
        /[αβγδε]/i          // Greek characters
      ];

      for (const pattern of suspiciousPatterns) {
        if (pattern.test(domain)) {
          results.suspicious = true;
          results.reasons.push('Suspicious domain pattern detected');
          break;
        }
      }

      // Check for homograph attacks
      if (domain.includes('xn--')) {
        results.suspicious = true;
        results.reasons.push('Punycode domain detected (possible homograph attack)');
      }

      return results;
    } catch (error) {
      return {
        suspicious: false,
        reasons: ['Domain check failed']
      };
    }
  }

  /**
   * Sets up cache cleanup interval
   * @private
   */
  setupCacheCleanup() {
    setInterval(() => {
      this.cleanupExpiredCache();
    }, 300000); // 5 minutes
  }

  /**
   * Cleans up expired cache entries
   * @private
   */
  cleanupExpiredCache() {
    const now = Date.now();
    const expiredKeys = [];

    for (const [key, entry] of this.methodCache.entries()) {
      if (entry.expiry && entry.expiry < now) {
        expiredKeys.push(key);
      }
    }

    expiredKeys.forEach(key => {
      this.methodCache.delete(key);
    });

    if (expiredKeys.length > 0) {
      logger.info(`Cleaned up ${expiredKeys.length} expired cache entries`);
    }
  }

  /**
   * Gets provider types configuration
   * @returns {Promise<Object>} Provider types
   */
  async getProviderTypes() {
    await this._ensureInitialized();
    return { ...PROVIDER_TYPES };
  }

  /**
   * Handles unsupported method requests with graceful fallbacks
   * @param {string} methodName - Unsupported method name
   * @param {Array} params - Method parameters
   * @returns {Promise<Object>} Fallback response or error
   */
  async handleUnsupportedMethod(methodName, params = []) {
    await this._ensureInitialized();

    try {
      const fallbackConfig = FALLBACK_CONFIG.unsupportedMethods;
      const gracefulDegradation = fallbackConfig.gracefulDegradation[methodName];

      if (gracefulDegradation && gracefulDegradation.fallback) {
        // Try alternative method
        const alternativeMethod = gracefulDegradation.fallback;
        logger.info(`Falling back from ${methodName} to ${alternativeMethod}`);
        
        return {
          success: true,
          fallback: true,
          originalMethod: methodName,
          alternativeMethod,
          message: gracefulDegradation.alternative || `Using ${alternativeMethod} instead`,
          data: null // Would be populated by actual method call
        };
      }

      // Return graceful error with helpful message
      return {
        success: false,
        error: {
          code: -32601,
          message: `Method ${methodName} not supported`,
          alternative: gracefulDegradation?.alternative || 'No alternative available'
        }
      };
    } catch (error) {
      logger.error(`Failed to handle unsupported method ${methodName}:`, error);
      return {
        success: false,
        error: {
          code: -32603,
          message: 'Internal error handling unsupported method'
        }
      };
    }
  }

  /**
   * Handles network failures with retry logic and fallback RPCs
   * @param {number} chainId - Network chain ID
   * @param {string} method - JSON-RPC method
   * @param {Array} params - Method parameters
   * @param {Object} [options={}] - Retry options
   * @returns {Promise<Object>} Response or fallback result
   */
  async handleNetworkFailure(chainId, method, params = [], options = {}) {
    await this._ensureInitialized();

    const fallbackConfig = FALLBACK_CONFIG.networkFailures;
    const maxRetries = options.maxRetries || fallbackConfig.retryAttempts;
    const baseDelay = options.baseDelay || fallbackConfig.retryDelay;
    
    let lastError = null;
    let attempt = 0;

    // Get fallback RPCs for the chain
    const fallbackRPCs = fallbackConfig.fallbackRPCs[chainId] || [];
    
    while (attempt < maxRetries && attempt < fallbackRPCs.length) {
      try {
        const rpcUrl = fallbackRPCs[attempt];
        logger.info(`Attempting network request (attempt ${attempt + 1}/${maxRetries}) using RPC: ${rpcUrl}`);

        // Calculate delay with exponential backoff
        if (attempt > 0) {
          const delay = fallbackConfig.exponentialBackoff 
            ? Math.min(baseDelay * Math.pow(2, attempt - 1), fallbackConfig.maxDelay)
            : baseDelay;
          
          await new Promise(resolve => setTimeout(resolve, delay));
        }

        // Simulate network request (in real implementation, this would make actual RPC call)
        const result = await this._makeRPCRequest(rpcUrl, method, params, {
          timeout: fallbackConfig.timeoutMs
        });

        if (result.success) {
          logger.info(`Network request successful on attempt ${attempt + 1}`);
          return {
            success: true,
            data: result.data,
            rpcUsed: rpcUrl,
            attempts: attempt + 1
          };
        }

        lastError = result.error;
        attempt++;
        
      } catch (error) {
        lastError = error;
        attempt++;
        logger.warn(`Network attempt ${attempt} failed:`, error.message);
      }
    }

    // All attempts failed - check for offline mode
    if (fallbackConfig.offlineMode.enabled && 
        fallbackConfig.offlineMode.allowedMethods.includes(method)) {
      
      logger.info(`Entering offline mode for method: ${method}`);
      return this._handleOfflineMode(method, params);
    }

    // Return final error
    return {
      success: false,
      error: {
        code: -32603,
        message: 'All network attempts failed',
        originalError: lastError,
        attempts: attempt,
        offlineMode: fallbackConfig.offlineMode.enabled
      }
    };
  }

  /**
   * Handles offline mode for supported methods
   * @private
   * @param {string} method - JSON-RPC method
   * @param {Array} params - Method parameters
   * @returns {Promise<Object>} Offline mode response
   */
  async _handleOfflineMode(method, params) {
    const fallbackConfig = FALLBACK_CONFIG.networkFailures.offlineMode;
    
    try {
      // Return cached data for read-only methods
      if (fallbackConfig.cacheReadOnlyMethods) {
        const cachedData = this._getCachedData(method, params);
        if (cachedData) {
          return {
            success: true,
            data: cachedData,
            offline: true,
            message: fallbackConfig.offlineMessage
          };
        }
      }

      // Return appropriate offline responses
      switch (method) {
        case 'eth_chainId':
          return {
            success: true,
            data: '0x1', // Default to Ethereum mainnet
            offline: true,
            message: fallbackConfig.offlineMessage
          };
          
        case 'eth_accounts':
          return {
            success: true,
            data: [], // No accounts in offline mode
            offline: true,
            message: fallbackConfig.offlineMessage
          };
          
        case 'wallet_getPermissions':
          return {
            success: true,
            data: [],
            offline: true,
            message: fallbackConfig.offlineMessage
          };
          
        default:
          return {
            success: false,
            error: {
              code: -32603,
              message: 'Method not available in offline mode'
            },
            offline: true
          };
      }
    } catch (error) {
      logger.error('Offline mode handling failed:', error);
      return {
        success: false,
        error: {
          code: -32603,
          message: 'Offline mode error'
        },
        offline: true
      };
    }
  }

  /**
   * Simulates RPC request (placeholder for actual implementation)
   * @private
   * @param {string} rpcUrl - RPC endpoint URL
   * @param {string} method - JSON-RPC method
   * @param {Array} params - Method parameters
   * @param {Object} options - Request options
   * @returns {Promise<Object>} RPC response
   */
  async _makeRPCRequest(rpcUrl, method, params, options = {}) {
    // This is a placeholder - in real implementation would make actual HTTP request
    return new Promise((resolve) => {
      setTimeout(() => {
        // Simulate random success/failure for demonstration
        const success = Math.random() > 0.3; // 70% success rate
        
        if (success) {
          resolve({
            success: true,
            data: `Mock response for ${method}`
          });
        } else {
          resolve({
            success: false,
            error: new Error('Network timeout')
          });
        }
      }, 1000);
    });
  }

  /**
   * Gets cached data for read-only methods
   * @private
   * @param {string} method - JSON-RPC method
   * @param {Array} params - Method parameters
   * @returns {any} Cached data or null
   */
  _getCachedData(method, params) {
    const cacheKey = `${method}_${JSON.stringify(params)}`;
    const cached = this.methodCache.get(cacheKey);
    
    if (cached && cached.expiry > Date.now()) {
      return cached.data;
    }
    
    return null;
  }

  /**
   * Categorizes and handles errors with appropriate fallback strategies
   * @param {Object} error - Error object
   * @param {string} method - JSON-RPC method that failed
   * @param {Array} params - Method parameters
   * @returns {Promise<Object>} Error handling result
   */
  async handleErrorWithFallback(error, method, params = []) {
    await this._ensureInitialized();

    try {
      const errorConfig = FALLBACK_CONFIG.errorHandling;
      const errorCode = error.code || error.status || 'unknown';
      
      // Find error category
      let category = 'unknown';
      for (const [cat, config] of Object.entries(errorConfig.categories)) {
        if (config.codes.includes(errorCode)) {
          category = cat;
          break;
        }
      }

      const categoryConfig = errorConfig.categories[category];
      const userMessage = errorConfig.userMessages[errorCode] || 
                         errorConfig.userMessages[category] || 
                         'An unexpected error occurred';

      logger.error(`Error categorized as '${category}' for method ${method}:`, error);

      // Apply fallback strategy
      switch (categoryConfig?.fallbackStrategy) {
        case 'retry_with_fallback_rpc':
          if (categoryConfig.retryable) {
            logger.info(`Retrying ${method} with fallback RPC`);
            return await this.handleNetworkFailure(1, method, params); // Default to Ethereum
          }
          break;

        case 'graceful_degradation':
          return await this.handleUnsupportedMethod(method, params);

        case 'exponential_backoff':
          if (categoryConfig.retryable) {
            logger.info(`Applying exponential backoff for ${method}`);
            await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
            return { success: false, retry: true, delay: 2000 };
          }
          break;

        case 'user_action_required':
          return {
            success: false,
            userActionRequired: true,
            message: userMessage,
            error: error
          };

        case 'user_feedback':
          return {
            success: false,
            userFeedback: true,
            message: userMessage,
            error: error
          };

        default:
          return {
            success: false,
            message: userMessage,
            error: error,
            category: category
          };
      }

      return {
        success: false,
        message: userMessage,
        error: error,
        category: category,
        retryable: categoryConfig?.retryable || false
      };

    } catch (fallbackError) {
      logger.error('Error handling fallback failed:', fallbackError);
      return {
        success: false,
        message: 'An unexpected error occurred',
        error: error,
        fallbackError: fallbackError
      };
    }
  }

  /**
   * Gets method risk assessment
   * @param {string} methodName - Method name to assess
   * @returns {Promise<Object>} Risk assessment
   */
  /**
   * Gets fallback configuration
   * @returns {Promise<Object>} Fallback configuration
   */
  async getFallbackConfig() {
    await this._ensureInitialized();
    return { ...FALLBACK_CONFIG };
  }
}

// Create global instance
const web3ProviderConfigManager = new Web3ProviderConfigManager();

/**
 * Gets Ethereum provider configuration
 * @param {Object} [options={}] - Configuration options
 * @returns {Promise<Object>} Ethereum provider configuration
 */
export const getEthereumProviderConfig = async (options = {}) => {
  return await web3ProviderConfigManager.getEthereumProviderConfig(options);
};

/**
 * Gets supported JSON-RPC methods
 * @param {string} [category] - Method category filter
 * @returns {Promise<Object>} Supported methods
 */
export const getSupportedMethods = async (category = null) => {
  return await web3ProviderConfigManager.getSupportedMethods(category);
};

/**
 * Gets method configuration
 * @param {string} methodName - JSON-RPC method name
 * @returns {Promise<Object|null>} Method configuration
 */
export const getMethodConfig = async (methodName) => {
  return await web3ProviderConfigManager.getMethodConfig(methodName);
};

/**
 * Validates if method is supported
 * @param {string} methodName - JSON-RPC method name
 * @returns {Promise<boolean>} True if method is supported
 */
export const isMethodSupported = async (methodName) => {
  return await web3ProviderConfigManager.isMethodSupported(methodName);
};

/**
 * Gets network provider configuration
 * @param {number} chainId - Network chain ID
 * @returns {Promise<Object|null>} Network configuration
 */
export const getNetworkConfig = async (chainId) => {
  return await web3ProviderConfigManager.getNetworkConfig(chainId);
};

/**
 * Gets all supported networks
 * @returns {Promise<Array>} Supported networks
 */
export const getSupportedNetworks = async () => {
  return await web3ProviderConfigManager.getSupportedNetworks();
};

/**
 * Validates network configuration
 * @param {Object} networkConfig - Network configuration
 * @returns {Promise<Object>} Validation results
 */
export const validateNetworkConfig = async (networkConfig) => {
  return await web3ProviderConfigManager.validateNetworkConfig(networkConfig);
};

/**
 * Gets DApp compatibility configuration
 * @param {string} [domain] - Domain to check
 * @returns {Promise<Object>} Compatibility configuration
 */
export const getDAppCompatibility = async (domain = null) => {
  return await web3ProviderConfigManager.getDAppCompatibility(domain);
};

/**
 * Gets security configuration
 * @returns {Promise<Object>} Security configuration
 */
export const getSecurityConfig = async () => {
  return await web3ProviderConfigManager.getSecurityConfig();
};

/**
 * Validates request origin
 * @param {string} origin - Request origin
 * @returns {Promise<Object>} Validation results
 */
export const validateOrigin = async (origin) => {
  return await web3ProviderConfigManager.validateOrigin(origin);
};

/**
 * Handles unsupported method requests
 * @param {string} methodName - Unsupported method name
 * @param {Array} [params=[]] - Method parameters
 * @returns {Promise<Object>} Fallback response
 */
export const handleUnsupportedMethod = async (methodName, params = []) => {
  return await web3ProviderConfigManager.handleUnsupportedMethod(methodName, params);
};

/**
 * Handles network failures with fallback strategies
 * @param {number} chainId - Network chain ID
 * @param {string} method - JSON-RPC method
 * @param {Array} [params=[]] - Method parameters
 * @param {Object} [options={}] - Retry options
 * @returns {Promise<Object>} Network failure handling result
 */
export const handleNetworkFailure = async (chainId, method, params = [], options = {}) => {
  return await web3ProviderConfigManager.handleNetworkFailure(chainId, method, params, options);
};

/**
 * Handles errors with appropriate fallback strategies
 * @param {Object} error - Error object
 * @param {string} method - JSON-RPC method that failed
 * @param {Array} [params=[]] - Method parameters
 * @returns {Promise<Object>} Error handling result
 */
export const handleErrorWithFallback = async (error, method, params = []) => {
  return await web3ProviderConfigManager.handleErrorWithFallback(error, method, params);
};

/**
 * Gets method risk assessment
 * @param {string} methodName - Method name
 * @returns {Promise<Object>} Risk assessment
 */
export const getMethodRiskAssessment = async (methodName) => {
  return await web3ProviderConfigManager.getMethodRiskAssessment(methodName);
};

/**
 * Pre-configured Web3 provider settings for immediate access
 * Note: These sync functions are for immediate access to static data only
 * Use async functions above for dynamic operations and fallback handling
 */
export const web3ProviderConfig = {
  ethereumProvider: ETHEREUM_PROVIDER_CONFIG,
  supportedMethods: SUPPORTED_METHODS,
  networkConfigs: NETWORK_PROVIDER_CONFIG,
  dappCompatibility: DAPP_COMPATIBILITY,
  securityConfig: SECURITY_CONFIG,
  providerTypes: PROVIDER_TYPES,
  fallbackConfig: FALLBACK_CONFIG
};

/**
 * Static Ethereum provider configuration (synchronous access)
 */
export const ethereumProviderConfig = ETHEREUM_PROVIDER_CONFIG;

/**
 * Static supported methods (synchronous access)
 */
export const supportedMethods = SUPPORTED_METHODS;

/**
 * Static network configurations (synchronous access)
 */
export const networkConfigs = NETWORK_PROVIDER_CONFIG;

/**
 * Static DApp compatibility (synchronous access)
 */
export const dappCompatibility = DAPP_COMPATIBILITY;

/**
 * Static security configuration (synchronous access)
 */
export const securityConfig = SECURITY_CONFIG;

/**
 * Static fallback configuration (synchronous access)
 */
export const fallbackConfig = FALLBACK_CONFIG;

export default {
  // Async methods (auto-initialize)
  getEthereumProviderConfig,
  getSupportedMethods,
  getMethodConfig,
  isMethodSupported,
  getNetworkConfig,
  getSupportedNetworks,
  validateNetworkConfig,
  getDAppCompatibility,
  getSecurityConfig,
  validateOrigin,
  getMethodRiskAssessment,
  
  // Fallback methods (graceful degradation)
  handleUnsupportedMethod,
  handleNetworkFailure,
  handleErrorWithFallback,
  getFallbackConfig,

  // Static configurations (immediate access)
  web3ProviderConfig,
  ethereumProviderConfig,
  supportedMethods,
  networkConfigs,
  dappCompatibility,
  securityConfig,
  providerTypes,

  // Manager class
  Web3ProviderConfigManager
};
