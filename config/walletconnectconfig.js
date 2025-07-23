/**
 * WalletConnect Configuration
 * 
 * Comprehensive WalletConnect v2.0 integration for trust crypto wallet extension.
 * Provides session management, protocol handling, multi-chain support, and security features.
 * Integrates with DApp connections, cross-chain bridging, and mobile wallet pairing.
 * 
 * @fileoverview WalletConnect configuration system for trust crypto wallet extension
 * @version 1.0.0
 * @author trust crypto wallet team
 */

import { TokenConfig } from './tokenconfig.js';
import { logger } from '../src/utils/logger.js';

/**
 * WalletConnect protocol versions and their configurations
 */
const WALLETCONNECT_VERSIONS = {
  v1: {
    version: '1.8.0',
    deprecated: true,
    supportLevel: 'legacy',
    description: 'Legacy WalletConnect v1 protocol (deprecated)'
  },
  v2: {
    version: '2.11.0',
    deprecated: false,
    supportLevel: 'full',
    description: 'Modern WalletConnect v2 protocol with multi-chain support'
  }
};

/**
 * WalletConnect project configuration
 * Official project metadata for trust crypto wallet extension
 */
const PROJECT_CONFIG = {
  projectId: 'trust-crypto-wallet-extension-wc',
  name: 'Trust Crypto Wallet Extension',
  description: 'Secure multi-chain crypto wallet for Web3 interactions and asset management',
  url: 'https://trust-crypto-wallet-extension.onrender.com',
  icons: [
    'https://trustwallet.com/assets/images/favicon.png',
    '/public/icons/icon-128.png',
    '/public/icons/icon-512.png'
  ],
  verifyUrl: 'https://verify.walletconnect.com',
  explorerUrl: 'https://walletconnect.com/explorer',
  redirect: {
    native: 'trust-crypto-wallet',
    universal: 'https://trust-crypto-wallet-extension.onrender.com/connect'
  },
  tokenList: {
    version: '2.1.0',
    logoURI: 'https://trustwallet.com/assets/images/favicon.png',
    baseUri: 'https://raw.githubusercontent.com/Trusx-crypto-wallet/trust-crypto-wallet-tokenlist/main/tokenlist.json',
    extensionUri: 'https://raw.githubusercontent.com/Trusx-crypto-wallet/trust-crypto-wallet-tokenlist/main/extension.json',
    homepage: 'https://trust-crypto-wallet-extension.onrender.com',
    repository: 'https://github.com/Trusx-crypto-wallet/trust-crypto-wallet-tokenlist'
  }
};

/**
 * Supported blockchain networks for WalletConnect
 * Aligned with trust crypto wallet extension supported chains
 */
const SUPPORTED_CHAINS = {
  // Mainnet chains
  mainnet: [
    {
      chainId: 1,
      name: 'Ethereum',
      namespace: 'eip155',
      fullChainId: 'eip155:1',
      rpcUrl: 'https://ethereum-rpc.publicnode.com',
      blockExplorer: 'https://etherscan.io',
      nativeCurrency: {
        name: 'Ether',
        symbol: 'ETH',
        decimals: 18
      },
      logo: '/public/images/chains/ethereum.png'
    },
    {
      chainId: 56,
      name: 'BNB Smart Chain',
      namespace: 'eip155',
      fullChainId: 'eip155:56',
      rpcUrl: 'https://bsc-rpc.publicnode.com',
      blockExplorer: 'https://bscscan.com',
      nativeCurrency: {
        name: 'BNB',
        symbol: 'BNB',
        decimals: 18
      },
      logo: '/public/images/chains/bsc.png'
    },
    {
      chainId: 137,
      name: 'Polygon',
      namespace: 'eip155',
      fullChainId: 'eip155:137',
      rpcUrl: 'https://polygon-bor-rpc.publicnode.com',
      blockExplorer: 'https://polygonscan.com',
      nativeCurrency: {
        name: 'MATIC',
        symbol: 'MATIC',
        decimals: 18
      },
      logo: '/public/images/chains/polygon.png'
    },
    {
      chainId: 42161,
      name: 'Arbitrum One',
      namespace: 'eip155',
      fullChainId: 'eip155:42161',
      rpcUrl: 'https://arbitrum-one-rpc.publicnode.com',
      blockExplorer: 'https://arbiscan.io',
      nativeCurrency: {
        name: 'Ether',
        symbol: 'ETH',
        decimals: 18
      },
      logo: '/public/images/chains/arbitrum.png'
    },
    {
      chainId: 10,
      name: 'Optimism',
      namespace: 'eip155',
      fullChainId: 'eip155:10',
      rpcUrl: 'https://optimism-rpc.publicnode.com',
      blockExplorer: 'https://optimistic.etherscan.io',
      nativeCurrency: {
        name: 'Ether',
        symbol: 'ETH',
        decimals: 18
      },
      logo: '/public/images/chains/optimism.png'
    },
    {
      chainId: 43114,
      name: 'Avalanche',
      namespace: 'eip155',
      fullChainId: 'eip155:43114',
      rpcUrl: 'https://avalanche-c-chain-rpc.publicnode.com',
      blockExplorer: 'https://snowtrace.io',
      nativeCurrency: {
        name: 'Avalanche',
        symbol: 'AVAX',
        decimals: 18
      },
      logo: '/public/images/chains/avalanche.png'
    }
  ],
  
  // Testnet chains
  testnet: [
    {
      chainId: 11155111,
      name: 'Sepolia',
      namespace: 'eip155',
      fullChainId: 'eip155:11155111',
      rpcUrl: 'https://ethereum-sepolia-rpc.publicnode.com',
      blockExplorer: 'https://sepolia.etherscan.io',
      nativeCurrency: {
        name: 'Sepolia Ether',
        symbol: 'ETH',
        decimals: 18
      },
      logo: '/public/images/chains/ethereum.png'
    },
    {
      chainId: 97,
      name: 'BSC Testnet',
      namespace: 'eip155',
      fullChainId: 'eip155:97',
      rpcUrl: 'https://bsc-testnet-rpc.publicnode.com',
      blockExplorer: 'https://testnet.bscscan.com',
      nativeCurrency: {
        name: 'Test BNB',
        symbol: 'tBNB',
        decimals: 18
      },
      logo: '/public/images/chains/bsc.png'
    },
    {
      chainId: 80002,
      name: 'Polygon Amoy',
      namespace: 'eip155',
      fullChainId: 'eip155:80002',
      rpcUrl: 'https://polygon-amoy-bor-rpc.publicnode.com',
      blockExplorer: 'https://amoy.polygonscan.com',
      nativeCurrency: {
        name: 'MATIC',
        symbol: 'MATIC',
        decimals: 18
      },
      logo: '/public/images/chains/polygon.png'
    },
    {
      chainId: 421614,
      name: 'Arbitrum Sepolia',
      namespace: 'eip155',
      fullChainId: 'eip155:421614',
      rpcUrl: 'https://arbitrum-sepolia-rpc.publicnode.com',
      blockExplorer: 'https://sepolia.arbiscan.io',
      nativeCurrency: {
        name: 'Sepolia Ether',
        symbol: 'ETH',
        decimals: 18
      },
      logo: '/public/images/chains/arbitrum.png'
    },
    {
      chainId: 11155420,
      name: 'Optimism Sepolia',
      namespace: 'eip155',
      fullChainId: 'eip155:11155420',
      rpcUrl: 'https://optimism-sepolia-rpc.publicnode.com',
      blockExplorer: 'https://sepolia-optimism.etherscan.io',
      nativeCurrency: {
        name: 'Sepolia Ether',
        symbol: 'ETH',
        decimals: 18
      },
      logo: '/public/images/chains/optimism.png'
    },
    {
      chainId: 43113,
      name: 'Fuji',
      namespace: 'eip155',
      fullChainId: 'eip155:43113',
      rpcUrl: 'https://avalanche-fuji-c-chain-rpc.publicnode.com',
      blockExplorer: 'https://testnet.snowtrace.io',
      nativeCurrency: {
        name: 'Avalanche',
        symbol: 'AVAX',
        decimals: 18
      },
      logo: '/public/images/chains/avalanche.png'
    }
  ]
};

/**
 * Supported JSON-RPC methods for WalletConnect sessions
 */
const SUPPORTED_METHODS = {
  // Account methods
  accounts: [
    'eth_accounts',
    'eth_requestAccounts'
  ],
  
  // Transaction methods
  transactions: [
    'eth_sendTransaction',
    'eth_signTransaction',
    'eth_estimateGas',
    'eth_gasPrice',
    'eth_getTransactionCount',
    'eth_getTransactionReceipt',
    'eth_getTransactionByHash'
  ],
  
  // Signing methods
  signing: [
    'personal_sign',
    'eth_sign',
    'eth_signTypedData',
    'eth_signTypedData_v1',
    'eth_signTypedData_v3',
    'eth_signTypedData_v4'
  ],
  
  // Network methods
  network: [
    'eth_chainId',
    'net_version',
    'wallet_addEthereumChain',
    'wallet_switchEthereumChain',
    'wallet_watchAsset',
    'wallet_getPermissions',
    'wallet_requestPermissions'
  ],
  
  // Data methods
  data: [
    'eth_call',
    'eth_getBalance',
    'eth_getCode',
    'eth_getStorageAt',
    'eth_blockNumber',
    'eth_getBlockByNumber',
    'eth_getBlockByHash',
    'eth_getLogs'
  ],
  
  // Encryption methods
  encryption: [
    'eth_getEncryptionPublicKey',
    'eth_decrypt'
  ]
};

/**
 * WalletConnect session events
 */
const SESSION_EVENTS = {
  // Standard events
  standard: [
    'chainChanged',
    'accountsChanged',
    'connect',
    'disconnect'
  ],
  
  // Custom events for trust crypto wallet
  custom: [
    'wallet_bridgeTransaction',
    'wallet_crossChainSwap',
    'wallet_tokenUpdate',
    'wallet_networkCongestion'
  ]
};

/**
 * Session configuration parameters
 */
const SESSION_CONFIG = {
  // Connection settings
  connection: {
    timeout: 30000,        // 30 seconds connection timeout
    retryAttempts: 3,      // Number of retry attempts
    retryDelay: 2000,      // 2 seconds between retries
    keepAlive: true,       // Keep connection alive
    maxConcurrentSessions: 10 // Maximum concurrent sessions
  },
  
  // Session lifecycle
  lifecycle: {
    defaultExpiry: 604800,    // 7 days in seconds
    maxExpiry: 2592000,       // 30 days in seconds
    minExpiry: 3600,          // 1 hour in seconds
    renewalThreshold: 86400,  // Renew when 24 hours remaining
    cleanupInterval: 300000   // Clean up expired sessions every 5 minutes
  },
  
  // Security settings
  security: {
    requireApproval: true,           // Require user approval for connections
    enableEncryption: true,          // Enable message encryption
    validateOrigin: true,            // Validate DApp origin
    allowInsecureConnections: false, // Block insecure connections
    maxRequestsPerMinute: 60,        // Rate limiting
    sessionSigningRequired: true     // Require session signing
  },
  
  // QR Code settings
  qrCode: {
    size: 300,                    // QR code size in pixels
    margin: 4,                    // QR code margin
    errorCorrectionLevel: 'M',    // Error correction level
    foregroundColor: '#000000',   // QR code foreground color
    backgroundColor: '#FFFFFF',   // QR code background color
    logoSize: 60,                 // Logo size in pixels
    logoMargin: 8                 // Logo margin
  }
};

/**
 * Bridge and cross-chain specific configurations
 */
const BRIDGE_CONFIG = {
  // Supported bridge protocols
  protocols: [
    {
      name: 'LayerZero',
      identifier: 'layerzero',
      methods: ['lz_send', 'lz_estimate', 'lz_quote'],
      supportedChains: [1, 56, 137, 42161, 10, 43114],
      logo: '/public/images/bridges/layerzero-bridge-64.png'
    },
    {
      name: 'Wormhole',
      identifier: 'wormhole',
      methods: ['wh_transfer', 'wh_attest', 'wh_redeem'],
      supportedChains: [1, 56, 137, 42161, 10, 43114],
      logo: '/public/images/bridges/wormhole-bridge-64.png'
    },
    {
      name: 'Chainlink CCIP',
      identifier: 'ccip',
      methods: ['ccip_send', 'ccip_receive', 'ccip_estimate'],
      supportedChains: [1, 137, 42161, 10, 43114],
      logo: '/public/images/bridges/chainlink-bridge-64.png'
    },
    {
      name: 'Axelar',
      identifier: 'axelar',
      methods: ['axl_transfer', 'axl_approve', 'axl_execute'],
      supportedChains: [1, 56, 137, 42161, 10, 43114],
      logo: '/public/images/bridges/axelar-bridge-64.png'
    },
    {
      name: 'Hyperlane',
      identifier: 'hyperlane',
      methods: ['hl_dispatch', 'hl_process', 'hl_quote'],
      supportedChains: [1, 56, 137, 42161, 10, 43114],
      logo: '/public/images/bridges/hyperlane-bridge-64.png'
    }
  ],
  
  // Cross-chain transaction settings
  crossChain: {
    confirmationBlocks: {
      1: 12,      // Ethereum
      56: 15,     // BSC
      137: 20,    // Polygon
      42161: 1,   // Arbitrum
      10: 1,      // Optimism
      43114: 1    // Avalanche
    },
    timeoutBlocks: {
      1: 100,     // Ethereum
      56: 200,    // BSC
      137: 300,   // Polygon
      42161: 1000, // Arbitrum
      10: 1000,   // Optimism
      43114: 500  // Avalanche
    }
  }
};

/**
 * DApp category configurations for WalletConnect
 */
const DAPP_CATEGORIES = {
  defi: {
    name: 'DeFi',
    description: 'Decentralized Finance applications',
    requiredMethods: ['eth_sendTransaction', 'personal_sign'],
    optionalMethods: ['eth_signTypedData', 'wallet_addEthereumChain'],
    riskLevel: 'medium',
    icon: '🏦'
  },
  dex: {
    name: 'DEX',
    description: 'Decentralized exchanges',
    requiredMethods: ['eth_sendTransaction', 'eth_accounts'],
    optionalMethods: ['wallet_switchEthereumChain'],
    riskLevel: 'medium',
    icon: '🔄'
  },
  nft: {
    name: 'NFT',
    description: 'Non-fungible token marketplaces',
    requiredMethods: ['eth_sendTransaction', 'personal_sign'],
    optionalMethods: ['eth_signTypedData'],
    riskLevel: 'medium',
    icon: '🎨'
  },
  gaming: {
    name: 'Gaming',
    description: 'Blockchain gaming applications',
    requiredMethods: ['eth_sendTransaction', 'personal_sign'],
    optionalMethods: ['eth_signTypedData'],
    riskLevel: 'medium',
    icon: '🎮'
  },
  bridge: {
    name: 'Bridge',
    description: 'Cross-chain bridge applications',
    requiredMethods: ['eth_sendTransaction', 'wallet_switchEthereumChain'],
    optionalMethods: ['wallet_addEthereumChain'],
    riskLevel: 'high',
    icon: '🌉'
  },
  dao: {
    name: 'DAO',
    description: 'Decentralized governance',
    requiredMethods: ['personal_sign', 'eth_signTypedData'],
    optionalMethods: ['eth_sendTransaction'],
    riskLevel: 'low',
    icon: '🗳️'
  }
};

/**
 * WalletConnect Configuration Manager
 * Main class for managing WalletConnect configurations and sessions
 * Features auto-initialization on first access (lazy initialization)
 */
class WalletConnectConfigManager {
  constructor() {
    this.tokenConfig = null;
    this.activeSessions = new Map();
    this.sessionRequests = new Map();
    this.bridgeConfigs = new Map();
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
      this.setupSessionCleanup();
      this.initialized = true;
      logger.info('WalletConnectConfigManager auto-initialized successfully');
    } catch (error) {
      logger.error('Failed to auto-initialize WalletConnectConfigManager:', error);
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
   * Gets WalletConnect v2 configuration
   * @param {Object} [options={}] - Configuration options
   * @returns {Promise<Object>} WalletConnect v2 configuration
   */
  async getWalletConnectConfig(options = {}) {
    await this._ensureInitialized();

    const chains = options.testnet ? SUPPORTED_CHAINS.testnet : SUPPORTED_CHAINS.mainnet;
    const allMethods = await this.getAllSupportedMethods();

    return {
      projectId: PROJECT_CONFIG.projectId,
      metadata: {
        name: PROJECT_CONFIG.name,
        description: PROJECT_CONFIG.description,
        url: PROJECT_CONFIG.url,
        icons: PROJECT_CONFIG.icons,
        redirect: PROJECT_CONFIG.redirect
      },
      chains: chains.map(chain => chain.fullChainId),
      methods: allMethods,
      events: [...SESSION_EVENTS.standard, ...SESSION_EVENTS.custom],
      optionalChains: chains.map(chain => chain.fullChainId),
      optionalMethods: allMethods,
      optionalEvents: SESSION_EVENTS.custom,
      sessionConfig: SESSION_CONFIG,
      bridgeConfig: BRIDGE_CONFIG
    };
  }

  /**
   * Gets supported chains configuration
   * @param {boolean} [includeTestnet=false] - Include testnet chains
   * @returns {Array} Supported chains
   */
  getSupportedChains(includeTestnet = false) {
    const chains = [...SUPPORTED_CHAINS.mainnet];
    if (includeTestnet) {
      chains.push(...SUPPORTED_CHAINS.testnet);
    }
    return chains;
  }

  /**
   * Gets all supported JSON-RPC methods
   * @returns {Promise<Array>} All supported methods
   */
  async getAllSupportedMethods() {
    await this._ensureInitialized();
    
    const allMethods = [];
    Object.values(SUPPORTED_METHODS).forEach(methods => {
      allMethods.push(...methods);
    });
    return [...new Set(allMethods)]; // Remove duplicates
  }

  /**
   * Gets methods by category
   * @param {string} category - Method category
   * @returns {Promise<Array>} Methods in the category
   */
  async getMethodsByCategory(category) {
    await this._ensureInitialized();
    return SUPPORTED_METHODS[category] || [];
  }

  /**
   * Validates session proposal
   * @param {Object} proposal - Session proposal
   * @returns {Promise<Object>} Validation results
   */
  async validateSessionProposal(proposal) {
    await this._ensureInitialized();
    
    try {
      const results = {
        isValid: true,
        warnings: [],
        errors: [],
        requiredChains: [],
        optionalChains: [],
        requiredMethods: [],
        optionalMethods: []
      };

      // Validate chains
      if (proposal.requiredNamespaces?.eip155?.chains) {
        for (const chainId of proposal.requiredNamespaces.eip155.chains) {
          const chain = await this.getChainById(chainId);
          if (chain) {
            results.requiredChains.push(chain);
          } else {
            results.errors.push(`Unsupported required chain: ${chainId}`);
            results.isValid = false;
          }
        }
      }

      // Validate optional chains
      if (proposal.optionalNamespaces?.eip155?.chains) {
        for (const chainId of proposal.optionalNamespaces.eip155.chains) {
          const chain = await this.getChainById(chainId);
          if (chain) {
            results.optionalChains.push(chain);
          } else {
            results.warnings.push(`Unsupported optional chain: ${chainId}`);
          }
        }
      }

      // Validate methods
      const allSupportedMethods = await this.getAllSupportedMethods();
      if (proposal.requiredNamespaces?.eip155?.methods) {
        for (const method of proposal.requiredNamespaces.eip155.methods) {
          if (allSupportedMethods.includes(method)) {
            results.requiredMethods.push(method);
          } else {
            results.errors.push(`Unsupported required method: ${method}`);
            results.isValid = false;
          }
        }
      }

      // Validate optional methods
      if (proposal.optionalNamespaces?.eip155?.methods) {
        for (const method of proposal.optionalNamespaces.eip155.methods) {
          if (allSupportedMethods.includes(method)) {
            results.optionalMethods.push(method);
          } else {
            results.warnings.push(`Unsupported optional method: ${method}`);
          }
        }
      }

      return results;
    } catch (error) {
      logger.error('Session proposal validation failed:', error);
      return {
        isValid: false,
        warnings: [],
        errors: ['Validation failed due to internal error'],
        requiredChains: [],
        optionalChains: [],
        requiredMethods: [],
        optionalMethods: []
      };
    }
  }

  /**
   * Gets chain configuration by ID
   * @param {string} chainId - Chain ID (e.g., 'eip155:1')
   * @returns {Promise<Object|null>} Chain configuration
   */
  async getChainById(chainId) {
    await this._ensureInitialized();
    
    const allChains = [...SUPPORTED_CHAINS.mainnet, ...SUPPORTED_CHAINS.testnet];
    return allChains.find(chain => 
      chain.fullChainId === chainId || 
      chain.chainId.toString() === chainId.replace('eip155:', '')
    ) || null;
  }

  /**
   * Gets bridge configuration for cross-chain operations
   * @param {string} bridgeProtocol - Bridge protocol identifier
   * @returns {Promise<Object|null>} Bridge configuration
   */
  async getBridgeConfig(bridgeProtocol) {
    await this._ensureInitialized();
    
    return BRIDGE_CONFIG.protocols.find(protocol => 
      protocol.identifier === bridgeProtocol
    ) || null;
  }

  /**
   * Gets DApp category configuration
   * @param {string} category - DApp category
   * @returns {Object|null} Category configuration
   */
  getDAppCategory(category) {
    return DAPP_CATEGORIES[category] || null;
  }

  /**
   * Creates session configuration for a specific DApp
   * @param {Object} dappInfo - DApp information
   * @param {Object} [options={}] - Configuration options
   * @returns {Promise<Object>} Session configuration
   */
  async createSessionConfig(dappInfo, options = {}) {
    await this._ensureInitialized();
    
    try {
      const chains = options.chains || this.getSupportedChains(options.includeTestnet);
      const methods = options.methods || await this.getAllSupportedMethods();
      const events = options.events || [...SESSION_EVENTS.standard, ...SESSION_EVENTS.custom];

      return {
        chains: chains.map(chain => chain.fullChainId),
        methods,
        events,
        accounts: chains.map(chain => `${chain.fullChainId}:${options.account || '0x0000000000000000000000000000000000000000'}`),
        expiry: Math.floor(Date.now() / 1000) + (options.expiry || SESSION_CONFIG.lifecycle.defaultExpiry),
        relay: {
          protocol: 'irn'
        },
        controller: options.controller || false,
        requiredNamespaces: {
          eip155: {
            chains: chains.slice(0, 1).map(chain => chain.fullChainId), // At least one chain required
            methods: methods.slice(0, 5), // Essential methods
            events: SESSION_EVENTS.standard
          }
        },
        optionalNamespaces: {
          eip155: {
            chains: chains.map(chain => chain.fullChainId),
            methods,
            events: [...SESSION_EVENTS.standard, ...SESSION_EVENTS.custom]
          }
        }
      };
    } catch (error) {
      logger.error('Failed to create session config:', error);
      return null;
    }
  }

  /**
   * Sets up session cleanup interval
   * @private
   */
  setupSessionCleanup() {
    setInterval(() => {
      this.cleanupExpiredSessions();
    }, SESSION_CONFIG.lifecycle.cleanupInterval);
  }

  /**
   * Cleans up expired sessions
   * @private
   */
  cleanupExpiredSessions() {
    const now = Math.floor(Date.now() / 1000);
    const expiredSessions = [];

    for (const [sessionId, session] of this.activeSessions.entries()) {
      if (session.expiry && session.expiry < now) {
        expiredSessions.push(sessionId);
      }
    }

    expiredSessions.forEach(sessionId => {
      this.activeSessions.delete(sessionId);
      logger.info(`Cleaned up expired session: ${sessionId}`);
    });

    if (expiredSessions.length > 0) {
      logger.info(`Cleaned up ${expiredSessions.length} expired sessions`);
    }
  }

  /**
   * Gets session configuration settings
   * @returns {Object} Session configuration
   */
  getSessionConfig() {
    return { ...SESSION_CONFIG };
  }

  /**
   * Gets project configuration
   * @returns {Object} Project configuration
   */
  getProjectConfig() {
    return { ...PROJECT_CONFIG };
  }

  /**
   * Gets supported WalletConnect versions
   * @returns {Object} Supported versions
   */
  getSupportedVersions() {
    return { ...WALLETCONNECT_VERSIONS };
  }
}

// Create global instance
const walletConnectConfigManager = new WalletConnectConfigManager();

/**
 * Initializes the WalletConnect configuration system
 * @returns {Promise<void>}
 */
export const initializeWalletConnectConfig = async () => {
  return await walletConnectConfigManager.initialize();
};

/**
 * Gets WalletConnect v2 configuration
 * @param {Object} [options={}] - Configuration options
 * @returns {Object} WalletConnect configuration
 */
export const getWalletConnectConfig = (options = {}) => {
  return walletConnectConfigManager.getWalletConnectConfig(options);
};

/**
 * Gets supported chains
 * @param {boolean} [includeTestnet=false] - Include testnet chains
 * @returns {Array} Supported chains
 */
export const getSupportedChains = (includeTestnet = false) => {
  return walletConnectConfigManager.getSupportedChains(includeTestnet);
};

/**
 * Gets supported methods by category
 * @param {string} category - Method category
 * @returns {Array} Methods in category
 */
export const getMethodsByCategory = (category) => {
  return walletConnectConfigManager.getMethodsByCategory(category);
};

/**
 * Validates session proposal
 * @param {Object} proposal - Session proposal
 * @returns {Object} Validation results
 */
export const validateSessionProposal = (proposal) => {
  return walletConnectConfigManager.validateSessionProposal(proposal);
};

/**
 * Gets chain by ID
 * @param {string} chainId - Chain ID
 * @returns {Object|null} Chain configuration
 */
export const getChainById = (chainId) => {
  return walletConnectConfigManager.getChainById(chainId);
};

/**
 * Gets bridge configuration
 * @param {string} bridgeProtocol - Bridge protocol identifier
 * @returns {Object|null} Bridge configuration
 */
export const getBridgeConfig = (bridgeProtocol) => {
  return walletConnectConfigManager.getBridgeConfig(bridgeProtocol);
};

/**
 * Creates session configuration
 * @param {Object} dappInfo - DApp information
 * @param {Object} [options={}] - Configuration options
 * @returns {Object} Session configuration
 */
export const createSessionConfig = (dappInfo, options = {}) => {
  return walletConnectConfigManager.createSessionConfig(dappInfo, options);
};

/**
 * Pre-configured WalletConnect settings for immediate access
 * Note: These sync functions are for immediate access to static data only
 * Use async functions above for dynamic operations
 */
export const walletConnectConfig = {
  project: PROJECT_CONFIG,
  versions: WALLETCONNECT_VERSIONS,
  supportedChains: SUPPORTED_CHAINS,
  supportedMethods: SUPPORTED_METHODS,
  sessionEvents: SESSION_EVENTS,
  sessionConfig: SESSION_CONFIG,
  bridgeConfig: BRIDGE_CONFIG,
  dappCategories: DAPP_CATEGORIES
};

/**
 * Static supported chains (synchronous access)
 */
export const supportedChains = SUPPORTED_CHAINS;

/**
 * Static supported methods (synchronous access)
 */
export const supportedMethods = SUPPORTED_METHODS;

/**
 * Static session configuration (synchronous access)
 */
export const sessionConfig = SESSION_CONFIG;

/**
 * Static bridge configuration (synchronous access)
 */
export const bridgeConfig = BRIDGE_CONFIG;

export default {
  // Async methods (auto-initialize)
  getWalletConnectConfig,
  getMethodsByCategory,
  validateSessionProposal,
  getChainById,
  getBridgeConfig,
  createSessionConfig,
  
  // Sync methods (immediate access)
  getSupportedChains,
  
  // Static configurations
  walletConnectConfig,
  supportedChains,
  supportedMethods,
  sessionConfig,
  bridgeConfig,
  
  // Manager class
  WalletConnectConfigManager
};
