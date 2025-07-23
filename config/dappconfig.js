/**
 * DApp Configuration
 * 
 * Comprehensive DApp integration and management system for trust crypto wallet extension.
 * Provides security scanning, permission management, connection handling, and protocol support.
 * Integrates with popular DApps, DEXs, and DeFi protocols across multiple chains.
 * 
 * @fileoverview DApp configuration system for trust crypto wallet extension
 * @version 1.0.0
 * @author trust crypto wallet team
 */

import { TokenConfig } from './tokenconfig.js';
import { logger } from '../src/utils/logger.js';

/**
 * Supported DApp categories and their characteristics
 */
const DAPP_CATEGORIES = {
  dex: {
    name: 'Decentralized Exchanges',
    description: 'Token swapping and liquidity provision',
    riskLevel: 'medium',
    permissions: ['accounts', 'transactions'],
    commonMethods: ['eth_sendTransaction', 'eth_sign', 'personal_sign']
  },
  defi: {
    name: 'DeFi Protocols',
    description: 'Lending, borrowing, and yield farming',
    riskLevel: 'medium',
    permissions: ['accounts', 'transactions', 'approvals'],
    commonMethods: ['eth_sendTransaction', 'eth_signTypedData']
  },
  nft: {
    name: 'NFT Marketplaces',
    description: 'Non-fungible token trading and minting',
    riskLevel: 'medium',
    permissions: ['accounts', 'transactions', 'signatures'],
    commonMethods: ['eth_sendTransaction', 'personal_sign', 'eth_signTypedData']
  },
  gaming: {
    name: 'GameFi',
    description: 'Blockchain gaming and metaverse',
    riskLevel: 'medium',
    permissions: ['accounts', 'transactions', 'signatures'],
    commonMethods: ['eth_sendTransaction', 'personal_sign']
  },
  bridge: {
    name: 'Cross-chain Bridges',
    description: 'Asset bridging between chains',
    riskLevel: 'high',
    permissions: ['accounts', 'transactions', 'chain_switching'],
    commonMethods: ['eth_sendTransaction', 'wallet_switchEthereumChain', 'wallet_addEthereumChain']
  },
  tools: {
    name: 'Development Tools',
    description: 'Smart contract development and deployment',
    riskLevel: 'high',
    permissions: ['accounts', 'transactions', 'contract_deployment'],
    commonMethods: ['eth_sendTransaction', 'eth_estimateGas', 'eth_getCode']
  },
  dao: {
    name: 'Governance & DAO',
    description: 'Decentralized governance and voting',
    riskLevel: 'low',
    permissions: ['accounts', 'signatures', 'voting'],
    commonMethods: ['personal_sign', 'eth_signTypedData']
  },
  social: {
    name: 'Social & Identity',
    description: 'Decentralized social networks and identity',
    riskLevel: 'low',
    permissions: ['accounts', 'signatures'],
    commonMethods: ['personal_sign', 'eth_sign']
  }
};

/**
 * Trusted DApp configurations
 * Pre-verified and trusted DApps with specific configurations
 */
const TRUSTED_DAPPS = {
  // DEX Protocols
  uniswap: {
    name: 'Uniswap',
    url: 'https://app.uniswap.org',
    category: 'dex',
    logo: 'public/images/dapps/uniswap-logo.png',
    description: 'Leading decentralized exchange protocol',
    supportedChains: [1, 56, 137, 42161, 10, 43114],
    verified: true,
    riskScore: 1, // 1-10 scale, 1 = very safe
    permissions: {
      required: ['eth_accounts', 'eth_sendTransaction'],
      optional: ['wallet_switchEthereumChain', 'wallet_addEthereumChain']
    },
    features: ['token_swaps', 'liquidity_provision', 'yield_farming'],
    contracts: {
      1: ['0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45'], // Uniswap V3 Router
      137: ['0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45'],
      42161: ['0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45']
    }
  },

  pancakeswap: {
    name: 'PancakeSwap',
    url: 'https://pancakeswap.finance',
    category: 'dex',
    logo: 'public/images/dapps/pancakeswap-logo.png',
    description: 'Leading DEX on BNB Smart Chain',
    supportedChains: [56],
    verified: true,
    riskScore: 1,
    permissions: {
      required: ['eth_accounts', 'eth_sendTransaction'],
      optional: ['wallet_switchEthereumChain']
    },
    features: ['token_swaps', 'yield_farming', 'nft_marketplace'],
    contracts: {
      56: ['0x10ED43C718714eb63d5aA57B78B54704E256024E'] // PancakeSwap Router
    }
  },

  // DeFi Protocols
  compound: {
    name: 'Compound',
    url: 'https://app.compound.finance',
    category: 'defi',
    logo: 'public/images/dapps/compound-logo.png',
    description: 'Autonomous interest rate protocol',
    supportedChains: [1, 137],
    verified: true,
    riskScore: 2,
    permissions: {
      required: ['eth_accounts', 'eth_sendTransaction'],
      optional: ['eth_signTypedData']
    },
    features: ['lending', 'borrowing', 'governance'],
    contracts: {
      1: ['0x3d9819210A31b4961b30EF54bE2aeD79B9c9Cd3B'] // Compound Comptroller
    }
  },

  aave: {
    name: 'Aave',
    url: 'https://app.aave.com',
    category: 'defi',
    logo: 'public/images/dapps/aave-logo.png',
    description: 'Open source liquidity protocol',
    supportedChains: [1, 137, 42161, 10, 43114],
    verified: true,
    riskScore: 2,
    permissions: {
      required: ['eth_accounts', 'eth_sendTransaction'],
      optional: ['eth_signTypedData', 'wallet_switchEthereumChain']
    },
    features: ['lending', 'borrowing', 'flash_loans'],
    contracts: {
      1: ['0x7d2768dE32b0b80b7a3454c06BdAc94A69DDc7A9'], // Aave Lending Pool
      137: ['0x8dFf5E27EA6b7AC08EbFdf9eB090F32ee9a30fcf']
    }
  },

  // Development Tools
  remix: {
    name: 'Remix IDE',
    url: 'https://remix.ethereum.org',
    category: 'tools',
    logo: 'public/images/dapps/remix-logo.png',
    description: 'Ethereum smart contract development IDE',
    supportedChains: [1, 56, 137, 42161, 10, 43114, 11155111, 97], // Include testnets
    verified: true,
    riskScore: 3,
    permissions: {
      required: ['eth_accounts', 'eth_sendTransaction'],
      optional: ['eth_getCode', 'eth_estimateGas', 'wallet_addEthereumChain']
    },
    features: ['contract_deployment', 'debugging', 'testing'],
    specialHandling: {
      remixDetection: true,
      allowContractDeployment: true,
      enableAdvancedFeatures: true
    }
  },

  // Cross-chain Bridges
  layerzero: {
    name: 'LayerZero Bridge',
    url: 'https://layerzero.network',
    category: 'bridge',
    logo: 'public/images/bridges/layerzero-bridge-64.png',
    description: 'Omnichain interoperability protocol',
    supportedChains: [1, 56, 137, 42161, 10, 43114],
    verified: true,
    riskScore: 4,
    permissions: {
      required: ['eth_accounts', 'eth_sendTransaction'],
      optional: ['wallet_switchEthereumChain', 'wallet_addEthereumChain']
    },
    features: ['cross_chain_messaging', 'oft_transfers', 'omnichain_apps'],
    contracts: {
      1: ['0x66A71Dcef29A0fFBDBE3c6a460a3B5BC225Cd675'], // LayerZero Endpoint
      56: ['0x66A71Dcef29A0fFBDBE3c6a460a3B5BC225Cd675'],
      137: ['0x66A71Dcef29A0fFBDBE3c6a460a3B5BC225Cd675']
    }
  },

  // WalletConnect Integration
  walletconnect: {
    name: 'WalletConnect',
    url: 'https://walletconnect.com',
    category: 'tools',
    logo: 'public/images/dapps/walletconnect-logo.png',
    description: 'Open source protocol for connecting wallets',
    supportedChains: [1, 56, 137, 42161, 10, 43114],
    verified: true,
    riskScore: 2,
    permissions: {
      required: ['eth_accounts'],
      optional: ['eth_sendTransaction', 'personal_sign', 'eth_signTypedData']
    },
    features: ['cross_platform_connection', 'qr_code_pairing', 'session_management'],
    specialHandling: {
      walletConnectProtocol: true,
      sessionManagement: true,
      crossPlatformSupport: true
    }
  }
};

/**
 * DApp security configuration
 * Security rules and risk assessment parameters
 */
const SECURITY_CONFIG = {
  // Risk assessment thresholds
  riskThresholds: {
    low: 3,      // Risk score 1-3
    medium: 6,   // Risk score 4-6
    high: 10     // Risk score 7-10
  },

  // Phishing protection patterns
  phishingPatterns: [
    // Common phishing indicators
    /uniswap[0-9]+\.com/i,
    /pancakeswap[0-9]+\.com/i,
    /metamask-[a-z]+\.com/i,
    /trust-wallet[0-9]+\.com/i,
    /aave[0-9]+\.finance/i,
    /compound[0-9]+\.finance/i,
    // Suspicious TLDs
    /\.(tk|ml|ga|cf)$/i,
    // Unicode spoofing attempts
    /[а-я]/i, // Cyrillic characters
    /[αβγδε]/i // Greek characters
  ],

  // Malicious contract patterns
  maliciousPatterns: {
    // Honeypot indicators
    honeypotFunctions: [
      'transfer(address,uint256)',
      'balanceOf(address)',
      'totalSupply()'
    ],
    // Rug pull indicators
    rugPullFunctions: [
      'renounceOwnership()',
      'transferOwnership(address)',
      'withdraw()',
      'emergencyWithdraw()'
    ],
    // Flash loan attack patterns
    flashLoanFunctions: [
      'flashLoan(address,uint256,bytes)',
      'executeOperation(address[],uint256[],uint256[],address,bytes)'
    ]
  },

  // Permission risk levels
  permissionRisks: {
    'eth_accounts': 1,
    'eth_requestAccounts': 1,
    'personal_sign': 2,
    'eth_sign': 3,
    'eth_signTypedData': 2,
    'eth_sendTransaction': 4,
    'wallet_addEthereumChain': 2,
    'wallet_switchEthereumChain': 2,
    'wallet_watchAsset': 1,
    'eth_getEncryptionPublicKey': 3,
    'eth_decrypt': 4
  },

  // Transaction risk factors
  transactionRisks: {
    highValueThreshold: '10000', // USD
    newContractThreshold: 7, // days
    unverifiedContractRisk: 5,
    multipleApprovalsRisk: 3,
    maxApprovalRisk: 4
  }
};

/**
 * DApp connection and session configuration
 */
const CONNECTION_CONFIG = {
  // Session management
  session: {
    defaultTimeout: 3600000, // 1 hour in milliseconds
    maxTimeout: 86400000,    // 24 hours in milliseconds
    cleanupInterval: 300000, // 5 minutes
    maxConcurrentSessions: 10
  },

  // Connection protocols
  protocols: {
    walletConnect: {
      version: '2.0',
      projectId: 'trust-crypto-wallet-extension',
      metadata: {
        name: 'Trust Crypto Wallet Extension',
        description: 'Secure multi-chain crypto wallet',
        url: 'https://trustwallet.com',
        icons: ['public/icons/icon-128.png']
      },
      chains: [1, 56, 137, 42161, 10, 43114],
      methods: [
        'eth_sendTransaction',
        'eth_signTransaction',
        'eth_sign',
        'personal_sign',
        'eth_signTypedData'
      ],
      events: ['chainChanged', 'accountsChanged']
    },
    injected: {
      windowObject: 'ethereum',
      methods: [
        'eth_requestAccounts',
        'eth_accounts',
        'eth_sendTransaction',
        'eth_sign',
        'personal_sign',
        'eth_signTypedData',
        'wallet_addEthereumChain',
        'wallet_switchEthereumChain',
        'wallet_watchAsset'
      ],
      events: ['connect', 'disconnect', 'accountsChanged', 'chainChanged']
    }
  },

  // Request handling
  requests: {
    timeout: 60000, // 60 seconds
    maxPendingRequests: 5,
    autoRejectAfter: 300000, // 5 minutes
    priorityMethods: ['eth_sendTransaction', 'personal_sign']
  }
};

/**
 * Network-specific DApp configurations
 */
const NETWORK_DAPP_CONFIG = {
  1: { // Ethereum
    preferredDApps: ['uniswap', 'compound', 'aave', 'remix'],
    gasMultiplier: 1.0,
    securityLevel: 'high',
    allowUnverifiedContracts: false
  },
  56: { // BSC
    preferredDApps: ['pancakeswap', 'remix'],
    gasMultiplier: 1.0,
    securityLevel: 'medium',
    allowUnverifiedContracts: true
  },
  137: { // Polygon
    preferredDApps: ['uniswap', 'aave', 'remix'],
    gasMultiplier: 1.2,
    securityLevel: 'medium',
    allowUnverifiedContracts: true
  },
  42161: { // Arbitrum
    preferredDApps: ['uniswap', 'aave', 'remix'],
    gasMultiplier: 2.0,
    securityLevel: 'medium',
    allowUnverifiedContracts: true
  },
  10: { // Optimism
    preferredDApps: ['uniswap', 'aave', 'remix'],
    gasMultiplier: 1.2,
    securityLevel: 'medium',
    allowUnverifiedContracts: true
  },
  43114: { // Avalanche
    preferredDApps: ['uniswap', 'aave', 'remix'],
    gasMultiplier: 1.0,
    securityLevel: 'medium',
    allowUnverifiedContracts: true
  }
};

/**
 * DApp Configuration Manager
 * Main class for managing DApp configurations and security
 */
class DAppConfigManager {
  constructor() {
    this.tokenConfig = null;
    this.connectedDApps = new Map();
    this.sessionCache = new Map();
    this.securityCache = new Map();
    this.initialized = false;
  }

  /**
   * Initializes the DApp configuration manager
   * @returns {Promise<void>}
   */
  async initialize() {
    try {
      this.tokenConfig = new TokenConfig();
      await this.tokenConfig.initialize();
      this.startSessionCleanup();
      this.initialized = true;
      logger.info('DAppConfigManager initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize DAppConfigManager:', error);
      throw error;
    }
  }

  /**
   * Gets DApp configuration by URL or name
   * @param {string} identifier - DApp URL or name
   * @returns {Object|null} DApp configuration
   */
  getDAppConfig(identifier) {
    if (!this.initialized) {
      throw new Error('DAppConfigManager not initialized');
    }

    // Check by exact match first
    for (const [key, dapp] of Object.entries(TRUSTED_DAPPS)) {
      if (dapp.url === identifier || dapp.name === identifier || key === identifier) {
        return { ...dapp, id: key };
      }
    }

    // Check by domain match
    try {
      const url = new URL(identifier.startsWith('http') ? identifier : `https://${identifier}`);
      const domain = url.hostname.toLowerCase();

      for (const [key, dapp] of Object.entries(TRUSTED_DAPPS)) {
        const dappUrl = new URL(dapp.url);
        if (dappUrl.hostname.toLowerCase() === domain) {
          return { ...dapp, id: key };
        }
      }
    } catch (error) {
      logger.warn(`Invalid URL format: ${identifier}`);
    }

    return null;
  }

  /**
   * Performs security scan on a DApp URL
   * @param {string} url - DApp URL to scan
   * @returns {Object} Security scan results
   */
  performSecurityScan(url) {
    try {
      const cacheKey = `security_${url}`;
      if (this.securityCache.has(cacheKey)) {
        return this.securityCache.get(cacheKey);
      }

      const results = {
        url,
        riskScore: 0,
        warnings: [],
        blocked: false,
        trusted: false,
        scannedAt: Date.now()
      };

      // Check if it's a trusted DApp
      const dappConfig = this.getDAppConfig(url);
      if (dappConfig && dappConfig.verified) {
        results.trusted = true;
        results.riskScore = dappConfig.riskScore;
        this.securityCache.set(cacheKey, results);
        return results;
      }

      // Check for phishing patterns
      for (const pattern of SECURITY_CONFIG.phishingPatterns) {
        if (pattern.test(url)) {
          results.riskScore += 8;
          results.warnings.push('Potential phishing site detected');
          results.blocked = true;
          break;
        }
      }

      // Additional security checks
      if (url.includes('metamask') && !url.includes('metamask.io')) {
        results.riskScore += 6;
        results.warnings.push('Suspicious domain impersonating MetaMask');
      }

      if (url.includes('trustwallet') && !url.includes('trustwallet.com')) {
        results.riskScore += 6;
        results.warnings.push('Suspicious domain impersonating Trust Wallet');
      }

      // Check for suspicious TLDs
      try {
        const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
        const suspiciousTLDs = ['.tk', '.ml', '.ga', '.cf', '.pw'];
        if (suspiciousTLDs.some(tld => urlObj.hostname.endsWith(tld))) {
          results.riskScore += 4;
          results.warnings.push('Suspicious top-level domain');
        }
      } catch (error) {
        results.riskScore += 2;
        results.warnings.push('Invalid URL format');
      }

      // Cache results for 1 hour
      setTimeout(() => {
        this.securityCache.delete(cacheKey);
      }, 3600000);

      this.securityCache.set(cacheKey, results);
      return results;
    } catch (error) {
      logger.error(`Security scan failed for ${url}:`, error);
      return {
        url,
        riskScore: 5,
        warnings: ['Security scan failed'],
        blocked: false,
        trusted: false,
        scannedAt: Date.now()
      };
    }
  }

  /**
   * Gets network-specific DApp configuration
   * @param {number} chainId - Network chain ID
   * @returns {Object} Network DApp configuration
   */
  getNetworkDAppConfig(chainId) {
    if (!this.initialized) {
      throw new Error('DAppConfigManager not initialized');
    }

    return NETWORK_DAPP_CONFIG[chainId] || {
      preferredDApps: [],
      gasMultiplier: 1.0,
      securityLevel: 'medium',
      allowUnverifiedContracts: true
    };
  }

  /**
   * Validates DApp permissions request
   * @param {Array} permissions - Requested permissions
   * @param {string} dappUrl - DApp URL
   * @returns {Object} Permission validation results
   */
  validatePermissions(permissions, dappUrl) {
    try {
      const results = {
        approved: [],
        denied: [],
        warnings: [],
        totalRisk: 0
      };

      const securityScan = this.performSecurityScan(dappUrl);
      const baseRisk = securityScan.riskScore;

      for (const permission of permissions) {
        const riskLevel = SECURITY_CONFIG.permissionRisks[permission] || 2;
        const totalRisk = baseRisk + riskLevel;

        if (securityScan.blocked) {
          results.denied.push(permission);
        } else if (totalRisk > 8) {
          results.denied.push(permission);
          results.warnings.push(`High risk permission: ${permission}`);
        } else {
          results.approved.push(permission);
          if (totalRisk > 5) {
            results.warnings.push(`Medium risk permission: ${permission}`);
          }
        }

        results.totalRisk += riskLevel;
      }

      return results;
    } catch (error) {
      logger.error('Permission validation failed:', error);
      return {
        approved: [],
        denied: permissions,
        warnings: ['Permission validation failed'],
        totalRisk: 10
      };
    }
  }

  /**
   * Gets supported DApps for a network
   * @param {number} chainId - Network chain ID
   * @returns {Array} Supported DApps
   */
  getSupportedDApps(chainId) {
    const supportedDApps = [];

    for (const [key, dapp] of Object.entries(TRUSTED_DAPPS)) {
      if (dapp.supportedChains.includes(chainId)) {
        supportedDApps.push({
          id: key,
          ...dapp
        });
      }
    }

    return supportedDApps;
  }

  /**
   * Starts session cleanup interval
   * @private
   */
  startSessionCleanup() {
    setInterval(() => {
      this.cleanupExpiredSessions();
    }, CONNECTION_CONFIG.session.cleanupInterval);
  }

  /**
   * Cleans up expired sessions
   * @private
   */
  cleanupExpiredSessions() {
    const now = Date.now();
    const expiredSessions = [];

    for (const [sessionId, session] of this.sessionCache.entries()) {
      if (now - session.createdAt > session.timeout) {
        expiredSessions.push(sessionId);
      }
    }

    expiredSessions.forEach(sessionId => {
      this.sessionCache.delete(sessionId);
      this.connectedDApps.delete(sessionId);
    });

    if (expiredSessions.length > 0) {
      logger.info(`Cleaned up ${expiredSessions.length} expired sessions`);
    }
  }

  /**
   * Gets all DApp categories
   * @returns {Object} DApp categories
   */
  getDAppCategories() {
    return { ...DAPP_CATEGORIES };
  }

  /**
   * Gets connection configuration
   * @returns {Object} Connection configuration
   */
  getConnectionConfig() {
    return { ...CONNECTION_CONFIG };
  }

  /**
   * Gets security configuration
   * @returns {Object} Security configuration
   */
  getSecurityConfig() {
    return { ...SECURITY_CONFIG };
  }
}

// Create global instance
const dappConfigManager = new DAppConfigManager();

/**
 * Initializes the DApp configuration system
 * @returns {Promise<void>}
 */
export const initializeDAppConfig = async () => {
  return await dappConfigManager.initialize();
};

/**
 * Gets DApp configuration
 * @param {string} identifier - DApp URL or name
 * @returns {Object|null} DApp configuration
 */
export const getDAppConfig = (identifier) => {
  return dappConfigManager.getDAppConfig(identifier);
};

/**
 * Performs security scan on DApp
 * @param {string} url - DApp URL
 * @returns {Object} Security scan results
 */
export const performSecurityScan = (url) => {
  return dappConfigManager.performSecurityScan(url);
};

/**
 * Gets network DApp configuration
 * @param {number} chainId - Network chain ID
 * @returns {Object} Network DApp configuration
 */
export const getNetworkDAppConfig = (chainId) => {
  return dappConfigManager.getNetworkDAppConfig(chainId);
};

/**
 * Validates DApp permissions
 * @param {Array} permissions - Requested permissions
 * @param {string} dappUrl - DApp URL
 * @returns {Object} Permission validation results
 */
export const validatePermissions = (permissions, dappUrl) => {
  return dappConfigManager.validatePermissions(permissions, dappUrl);
};

/**
 * Gets supported DApps for network
 * @param {number} chainId - Network chain ID
 * @returns {Array} Supported DApps
 */
export const getSupportedDApps = (chainId) => {
  return dappConfigManager.getSupportedDApps(chainId);
};

/**
 * Pre-configured DApp settings for immediate access
 */
export const dappConfig = {
  categories: DAPP_CATEGORIES,
  trustedDApps: TRUSTED_DAPPS,
  security: SECURITY_CONFIG,
  connection: CONNECTION_CONFIG,
  networks: NETWORK_DAPP_CONFIG
};

/**
 * Trusted DApp configurations
 */
export const trustedDApps = TRUSTED_DAPPS;

/**
 * DApp categories
 */
export const dappCategories = DAPP_CATEGORIES;

/**
 * Security configuration
 */
export const securityConfig = SECURITY_CONFIG;

/**
 * Connection configuration
 */
export const connectionConfig = CONNECTION_CONFIG;

export default {
  dappConfig,
  initializeDAppConfig,
  getDAppConfig,
  performSecurityScan,
  getNetworkDAppConfig,
  validatePermissions,
  getSupportedDApps,
  trustedDApps,
  dappCategories,
  securityConfig,
  connectionConfig,
  DAppConfigManager
};
