/**
 * Production-Ready Testnet Configuration
 * Trust Wallet Extension - Testnet Networks & Development Environment
 * 
 * @fileoverview Comprehensive testnet configuration with production-grade
 * faucet integrations, test token management, and development utilities
 * 
 * Features:
 * - Complete testnet configurations for all major networks
 * - Faucet integration and automation
 * - Test token management
 * - Development environment settings
 * - Cross-chain testnet bridge configurations
 * 
 * @version 1.0.0
 * @author Trust Wallet Team
 * @license MIT
 */

const { ethers } = require('ethers');

/**
 * Testnet Network Configurations
 */
const TESTNET_CONFIGS = {
  // Ethereum Sepolia Testnet
  11155111: {
    name: 'sepolia',
    chainName: 'Ethereum Sepolia',
    nativeCurrency: {
      name: 'Sepolia Ether',
      symbol: 'ETH',
      decimals: 18
    },
    rpcUrls: [
      'https://ethereum-sepolia-rpc.publicnode.com',
      'https://sepolia.infura.io/v3/',
      'https://eth-sepolia.g.alchemy.com/v2/',
      'https://rpc.sepolia.org',
      'https://rpc2.sepolia.org'
    ],
    blockExplorerUrls: ['https://sepolia.etherscan.io'],
    iconUrls: ['/images/chains/ethereum.png'],
    maxPriorityFeePerGas: ethers.parseUnits('2', 'gwei'),
    maxFeePerGas: ethers.parseUnits('20', 'gwei'),
    gasLimit: 21000,
    blockTime: 12000,
    confirmations: 2,
    faucets: [
      {
        name: 'Sepolia Faucet',
        url: 'https://sepoliafaucet.com',
        amount: '0.5 ETH',
        cooldown: 86400000, // 24 hours
        requirements: ['twitter', 'github']
      },
      {
        name: 'Faucet Sepolia Dev',
        url: 'https://faucet.sepolia.dev',
        amount: '0.1 ETH',
        cooldown: 86400000,
        requirements: []
      },
      {
        name: 'Alchemy Sepolia Faucet',
        url: 'https://sepoliafaucet.com',
        amount: '0.5 ETH',
        cooldown: 86400000,
        requirements: ['alchemy_account']
      }
    ],
    testTokens: {
      TST: {
        address: '0x779877A7B0D9E8603169DdbD7836e478b4624789',
        symbol: 'TST',
        name: 'Test Token',
        decimals: 18,
        logoURI: 'https://raw.githubusercontent.com/Trusx-crypto-wallet/trust-crypto-wallet-tokenlist/main/tst-logo.png',
        tags: ['test', 'testnet']
      },
      USDC: {
        address: '0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8',
        symbol: 'USDC',
        name: 'Test USD Coin',
        decimals: 6,
        logoURI: 'https://raw.githubusercontent.com/Trusx-crypto-wallet/trust-crypto-wallet-tokenlist/main/usdc-logo.png',
        tags: ['stablecoin', 'testnet']
      },
      USDT: {
        address: '0xaA8E23Fb1079EA71e0a56F48a2aA51851D8433D0',
        symbol: 'USDT',
        name: 'Test Tether USD',
        decimals: 6,
        logoURI: 'https://raw.githubusercontent.com/Trusx-crypto-wallet/trust-crypto-wallet-tokenlist/main/usdt-logo.png',
        tags: ['stablecoin', 'testnet']
      }
    }
  },

  // BSC Testnet
  97: {
    name: 'bsc-testnet',
    chainName: 'BSC Testnet',
    nativeCurrency: {
      name: 'Test BNB',
      symbol: 'tBNB',
      decimals: 18
    },
    rpcUrls: [
      'https://bsc-testnet-rpc.publicnode.com',
      'https://data-seed-prebsc-1-s1.binance.org:8545',
      'https://data-seed-prebsc-2-s1.binance.org:8545',
      'https://data-seed-prebsc-1-s2.binance.org:8545',
      'https://data-seed-prebsc-2-s2.binance.org:8545'
    ],
    blockExplorerUrls: ['https://testnet.bscscan.com'],
    iconUrls: ['/images/chains/bsc.png'],
    maxPriorityFeePerGas: ethers.parseUnits('1', 'gwei'),
    maxFeePerGas: ethers.parseUnits('10', 'gwei'),
    gasLimit: 21000,
    blockTime: 3000,
    confirmations: 3,
    faucets: [
      {
        name: 'BSC Testnet Faucet',
        url: 'https://testnet.bnbchain.org/faucet-smart',
        amount: '0.1 BNB',
        cooldown: 86400000,
        requirements: ['twitter']
      }
    ],
    testTokens: {
      USDC: {
        address: '0x337610d27c682E347C9cD60BD4b3b107C9d34dDd',
        symbol: 'USDC',
        name: 'Test USD Coin',
        decimals: 18,
        logoURI: 'https://raw.githubusercontent.com/Trusx-crypto-wallet/trust-crypto-wallet-tokenlist/main/usdc-logo.png',
        tags: ['stablecoin', 'testnet']
      },
      USDT: {
        address: '0x7ef95a0FEE0Dd31b22626fA2e10Ee6A223F8a684',
        symbol: 'USDT',
        name: 'Test Tether USD',
        decimals: 18,
        logoURI: 'https://raw.githubusercontent.com/Trusx-crypto-wallet/trust-crypto-wallet-tokenlist/main/usdt-logo.png',
        tags: ['stablecoin', 'testnet']
      },
      TST: {
        address: '0x779877A7B0D9E8603169DdbD7836e478b4624789',
        symbol: 'TST',
        name: 'Test Token',
        decimals: 18,
        logoURI: 'https://raw.githubusercontent.com/Trusx-crypto-wallet/trust-crypto-wallet-tokenlist/main/tst-logo.png',
        tags: ['test', 'testnet']
      }
    }
  },

  // Polygon Amoy Testnet (Mumbai successor)
  80002: {
    name: 'polygon-amoy',
    chainName: 'Polygon Amoy Testnet',
    nativeCurrency: {
      name: 'MATIC',
      symbol: 'MATIC',
      decimals: 18
    },
    rpcUrls: [
      'https://polygon-amoy-bor-rpc.publicnode.com',
      'https://rpc-amoy.polygon.technology',
      'https://polygon-amoy.infura.io/v3/',
      'https://polygon-amoy.g.alchemy.com/v2/',
      'https://polygon-amoy.blockpi.network/v1/rpc/public'
    ],
    blockExplorerUrls: ['https://www.oklink.com/amoy'],
    iconUrls: ['/images/chains/polygon.png'],
    maxPriorityFeePerGas: ethers.parseUnits('30', 'gwei'),
    maxFeePerGas: ethers.parseUnits('100', 'gwei'),
    gasLimit: 21000,
    blockTime: 2000,
    confirmations: 3,
    faucets: [
      {
        name: 'Polygon Amoy Faucet',
        url: 'https://faucet.polygon.technology',
        amount: '0.5 MATIC',
        cooldown: 86400000,
        requirements: []
      }
    ],
    testTokens: {
      USDC: {
        address: '0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582',
        symbol: 'USDC',
        name: 'Test USD Coin',
        decimals: 6,
        logoURI: 'https://raw.githubusercontent.com/Trusx-crypto-wallet/trust-crypto-wallet-tokenlist/main/usdc-logo.png',
        tags: ['stablecoin', 'testnet']
      },
      WETH: {
        address: '0x2c852e740B62308c46DD29B982FBb650D063Bd07',
        symbol: 'WETH',
        name: 'Test Wrapped Ether',
        decimals: 18,
        logoURI: 'https://raw.githubusercontent.com/Trusx-crypto-wallet/trust-crypto-wallet-tokenlist/main/weth-logo.png',
        tags: ['wrapped', 'testnet']
      },
      TST: {
        address: '0x779877A7B0D9E8603169DdbD7836e478b4624789',
        symbol: 'TST',
        name: 'Test Token',
        decimals: 18,
        logoURI: 'https://raw.githubusercontent.com/Trusx-crypto-wallet/trust-crypto-wallet-tokenlist/main/tst-logo.png',
        tags: ['test', 'testnet']
      }
    }
  },

  // Arbitrum Sepolia Testnet
  421614: {
    name: 'arbitrum-sepolia',
    chainName: 'Arbitrum Sepolia',
    nativeCurrency: {
      name: 'Ethereum',
      symbol: 'ETH',
      decimals: 18
    },
    rpcUrls: [
      'https://arbitrum-sepolia-rpc.publicnode.com',
      'https://sepolia-rollup.arbitrum.io/rpc',
      'https://arb-sepolia.g.alchemy.com/v2/',
      'https://arbitrum-sepolia.infura.io/v3/',
      'https://arbitrum-sepolia.blockpi.network/v1/rpc/public'
    ],
    blockExplorerUrls: ['https://sepolia.arbiscan.io'],
    iconUrls: ['/images/chains/arbitrum.png'],
    maxPriorityFeePerGas: ethers.parseUnits('0.01', 'gwei'),
    maxFeePerGas: ethers.parseUnits('1', 'gwei'),
    gasLimit: 21000,
    blockTime: 1000,
    confirmations: 2,
    faucets: [
      {
        name: 'Arbitrum Sepolia Bridge',
        url: 'https://bridge.arbitrum.io',
        amount: 'Bridge from Sepolia',
        cooldown: 0,
        requirements: ['sepolia_eth']
      }
    ],
    testTokens: {
      USDC: {
        address: '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d',
        symbol: 'USDC',
        name: 'Test USD Coin',
        decimals: 6,
        logoURI: 'https://raw.githubusercontent.com/Trusx-crypto-wallet/trust-crypto-wallet-tokenlist/main/usdc-logo.png',
        tags: ['stablecoin', 'testnet']
      },
      WETH: {
        address: '0x980B62Da83eFf3D4576C647993b0c1D7faf17c73',
        symbol: 'WETH',
        name: 'Test Wrapped Ether',
        decimals: 18,
        logoURI: 'https://raw.githubusercontent.com/Trusx-crypto-wallet/trust-crypto-wallet-tokenlist/main/weth-logo.png',
        tags: ['wrapped', 'testnet']
      },
      TST: {
        address: '0x779877A7B0D9E8603169DdbD7836e478b4624789',
        symbol: 'TST',
        name: 'Test Token',
        decimals: 18,
        logoURI: 'https://raw.githubusercontent.com/Trusx-crypto-wallet/trust-crypto-wallet-tokenlist/main/tst-logo.png',
        tags: ['test', 'testnet']
      }
    }
  },

  // Optimism Sepolia Testnet
  11155420: {
    name: 'optimism-sepolia',
    chainName: 'OP Sepolia',
    nativeCurrency: {
      name: 'Ethereum',
      symbol: 'ETH',
      decimals: 18
    },
    rpcUrls: [
      'https://optimism-sepolia-rpc.publicnode.com',
      'https://sepolia.optimism.io',
      'https://opt-sepolia.g.alchemy.com/v2/',
      'https://optimism-sepolia.infura.io/v3/',
      'https://optimism-sepolia.blockpi.network/v1/rpc/public'
    ],
    blockExplorerUrls: ['https://sepolia-optimism.etherscan.io'],
    iconUrls: ['/images/chains/optimism.png'],
    maxPriorityFeePerGas: ethers.parseUnits('0.001', 'gwei'),
    maxFeePerGas: ethers.parseUnits('1', 'gwei'),
    gasLimit: 21000,
    blockTime: 2000,
    confirmations: 2,
    faucets: [
      {
        name: 'Optimism Sepolia Faucet',
        url: 'https://app.optimism.io/faucet',
        amount: '0.05 ETH',
        cooldown: 86400000,
        requirements: []
      }
    ],
    testTokens: {
      USDC: {
        address: '0x5fd84259d66Cd46123540766Be93DFE6D43130D7',
        symbol: 'USDC',
        name: 'Test USD Coin',
        decimals: 6,
        logoURI: 'https://raw.githubusercontent.com/Trusx-crypto-wallet/trust-crypto-wallet-tokenlist/main/usdc-logo.png',
        tags: ['stablecoin', 'testnet']
      },
      TST: {
        address: '0x779877A7B0D9E8603169DdbD7836e478b4624789',
        symbol: 'TST',
        name: 'Test Token',
        decimals: 18,
        logoURI: 'https://raw.githubusercontent.com/Trusx-crypto-wallet/trust-crypto-wallet-tokenlist/main/tst-logo.png',
        tags: ['test', 'testnet']
      }
    }
  },

  // Avalanche Fuji Testnet
  43113: {
    name: 'avalanche-fuji',
    chainName: 'Avalanche Fuji Testnet',
    nativeCurrency: {
      name: 'Avalanche',
      symbol: 'AVAX',
      decimals: 18
    },
    rpcUrls: [
      'https://avalanche-fuji-c-chain-rpc.publicnode.com',
      'https://api.avax-test.network/ext/bc/C/rpc',
      'https://avalanche-fuji.infura.io/v3/',
      'https://ava-testnet.public.blastapi.io/ext/bc/C/rpc',
      'https://rpc.ankr.com/avalanche_fuji'
    ],
    blockExplorerUrls: ['https://testnet.snowtrace.io'],
    iconUrls: ['/images/chains/avalanche.png'],
    maxPriorityFeePerGas: ethers.parseUnits('2', 'gwei'),
    maxFeePerGas: ethers.parseUnits('30', 'gwei'),
    gasLimit: 21000,
    blockTime: 2000,
    confirmations: 2,
    faucets: [
      {
        name: 'Avalanche Fuji Core Faucet',
        url: 'https://core.app/tools/testnet-faucet',
        amount: '2 AVAX',
        cooldown: 86400000,
        requirements: []
      }
    ],
    testTokens: {
      USDC: {
        address: '0x5425890298aed601595a70AB815c96711a31Bc65',
        symbol: 'USDC',
        name: 'Test USD Coin',
        decimals: 6,
        logoURI: 'https://raw.githubusercontent.com/Trusx-crypto-wallet/trust-crypto-wallet-tokenlist/main/usdc-logo.png',
        tags: ['stablecoin', 'testnet']
      },
      TST: {
        address: '0x779877A7B0D9E8603169DdbD7836e478b4624789',
        symbol: 'TST',
        name: 'Test Token',
        decimals: 18,
        logoURI: 'https://raw.githubusercontent.com/Trusx-crypto-wallet/trust-crypto-wallet-tokenlist/main/tst-logo.png',
        tags: ['test', 'testnet']
      }
    }
  },

  // opBNB Testnet
  5611: {
    name: 'opbnb-testnet',
    chainName: 'opBNB Testnet',
    nativeCurrency: {
      name: 'Test BNB',
      symbol: 'tBNB',
      decimals: 18
    },
    rpcUrls: [
      'https://opbnb-testnet-rpc.publicnode.com',
      'https://opbnb-testnet-rpc.bnbchain.org',
      'https://opbnb-testnet.nodereal.io/v1/64a9df0874fb4a93b9d0a3849de012d3',
      'https://opbnb-testnet-rpc.publicnode.com'
    ],
    blockExplorerUrls: ['https://testnet.opbnbscan.com'],
    iconUrls: ['/images/chains/bsc.png'],
    maxPriorityFeePerGas: ethers.parseUnits('0.001', 'gwei'),
    maxFeePerGas: ethers.parseUnits('1', 'gwei'),
    gasLimit: 21000,
    blockTime: 1000,
    confirmations: 2,
    faucets: [
      {
        name: 'opBNB Testnet Faucet',
        url: 'https://testnet.bnbchain.org/faucet-smart',
        amount: '0.05 tBNB',
        cooldown: 86400000,
        requirements: ['twitter']
      }
    ],
    testTokens: {
      USDT: {
        address: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
        symbol: 'USDT',
        name: 'Tether USD (opBNB Testnet)',
        decimals: 18,
        logoURI: '/images/tokens/usdt.png'
      }
    }
  }
};

/**
 * Faucet Integration Configuration
 */
const FAUCET_CONFIG = {
  // Automated faucet claiming
  automation: {
    enabled: true,
    scheduleInterval: 86400000, // 24 hours
    retryAttempts: 3,
    retryDelay: 300000, // 5 minutes
    minimumBalance: ethers.parseEther('0.01')
  },

  // Rate limiting and cooldowns
  rateLimiting: {
    globalCooldown: 3600000, // 1 hour
    perNetworkCooldown: 86400000, // 24 hours
    maxDailyRequests: 5,
    requestTracking: true
  },

  // Social requirements handling
  socialRequirements: {
    twitter: {
      enabled: true,
      verificationRequired: false,
      followRequired: ['@binance', '@ethereum', '@0xPolygon']
    },
    github: {
      enabled: true,
      verificationRequired: false,
      minRepositories: 1
    },
    discord: {
      enabled: false
    }
  },

  // Notification settings
  notifications: {
    success: true,
    failure: true,
    cooldownReminder: true,
    balanceAlerts: true
  }
};

/**
 * Test Token Management
 */
const TEST_TOKEN_CONFIG = {
  // Auto-discovery settings
  autoDiscovery: {
    enabled: true,
    scanInterval: 300000, // 5 minutes
    minBalance: '0',
    includeZeroBalance: true
  },

  // Token verification
  verification: {
    checksumValidation: true,
    contractVerification: true,
    metadataValidation: true,
    logoValidation: true
  },

  // Custom test tokens
  customTokens: {
    allowCustom: true,
    verificationRequired: false,
    metadataRequired: ['name', 'symbol', 'decimals'],
    logoRequired: false
  },

  // Token pools aligned with Trust token list
  tokenPools: {
    ethereum: {
      chainId: 11155111,
      tokens: ['TST', 'USDC', 'USDT']
    },
    polygon: {
      chainId: 80002,
      tokens: ['USDC', 'WETH', 'TST']
    },
    arbitrum: {
      chainId: 421614,
      tokens: ['USDC', 'WETH', 'TST']
    },
    optimism: {
      chainId: 11155420,
      tokens: ['USDC', 'TST']
    },
    avalanche: {
      chainId: 43113,
      tokens: ['USDC', 'TST']
    },
    bsc: {
      chainId: 97,
      tokens: ['USDC', 'USDT', 'TST']
    }
  }
};

/**
 * Development Environment Configuration
 */
const DEVELOPMENT_CONFIG = {
  // Debug settings
  debugging: {
    verboseLogging: true,
    transactionTracing: true,
    gasEstimationLogging: true,
    faucetLogging: true,
    tokenDiscoveryLogging: true
  },

  // Testing utilities
  testing: {
    mockTransactions: false,
    simulateNetworkDelay: false,
    randomFailures: false,
    gasEstimationOverride: false
  },

  // Hot reloading
  hotReload: {
    enabled: true,
    watchFiles: ['config/**/*.js', 'src/**/*.js'],
    reloadDelay: 1000
  },

  // Performance monitoring
  performance: {
    trackRPCLatency: true,
    trackFaucetResponse: true,
    trackTokenDiscovery: true,
    alertSlowRequests: true,
    slowRequestThreshold: 5000 // 5 seconds
  }
};

/**
 * Cross-Chain Bridge Test Configuration
 */
const BRIDGE_TEST_CONFIG = {
  // LayerZero testnet endpoints
  layerzero: {
    ethereum: {
      chainId: 11155111,
      endpoint: '0x6EDCE65403992e310A62460808c4b910D972f10f'
    },
    polygon: {
      chainId: 80002,
      endpoint: '0x6EDCE65403992e310A62460808c4b910D972f10f'
    },
    arbitrum: {
      chainId: 421614,
      endpoint: '0x6EDCE65403992e310A62460808c4b910D972f10f'
    },
    optimism: {
      chainId: 11155420,
      endpoint: '0x6EDCE65403992e310A62460808c4b910D972f10f'
    },
    avalanche: {
      chainId: 43113,
      endpoint: '0x6EDCE65403992e310A62460808c4b910D972f10f'
    },
    bsc: {
      chainId: 97,
      endpoint: '0x6EDCE65403992e310A62460808c4b910D972f10f'
    }
  },

  // Test bridge routes
  testRoutes: [
    {
      from: 11155111, // Sepolia
      to: 80002,     // Amoy
      token: 'USDC',
      enabled: true
    },
    {
      from: 421614,  // Arbitrum Sepolia
      to: 11155420,  // Optimism Sepolia
      token: 'USDC',
      enabled: true
    }
  ],

  // Bridge testing settings
  testing: {
    minTestAmount: ethers.parseUnits('0.1', 6), // 0.1 USDC
    maxTestAmount: ethers.parseUnits('100', 6), // 100 USDC
    confirmationTimeout: 600000, // 10 minutes
    retryAttempts: 3
  }
};

/**
 * Export comprehensive testnet configuration
 */
module.exports = {
  TESTNET_CONFIGS,
  FAUCET_CONFIG,
  TEST_TOKEN_CONFIG,
  DEVELOPMENT_CONFIG,
  BRIDGE_TEST_CONFIG,

  /**
   * Get testnet configuration by chain ID
   * @param {number} chainId - Testnet chain ID
   * @returns {object} Testnet configuration
   */
  getTestnetConfig(chainId) {
    const config = TESTNET_CONFIGS[chainId];
    if (!config) {
      throw new Error(`Unsupported testnet: ${chainId}`);
    }
    return config;
  },

  /**
   * Get all supported testnet chain IDs
   * @returns {number[]} Array of supported chain IDs
   */
  getSupportedTestnets() {
    return Object.keys(TESTNET_CONFIGS).map(Number);
  },

  /**
   * Check if chain ID is a testnet
   * @param {number} chainId - Chain ID to check
   * @returns {boolean} True if testnet
   */
  isTestnet(chainId) {
    return chainId in TESTNET_CONFIGS;
  },

  /**
   * Get faucet information for a network
   * @param {number} chainId - Chain ID
   * @returns {array} Array of faucet configurations
   */
  getFaucets(chainId) {
    const config = TESTNET_CONFIGS[chainId];
    return config ? config.faucets : [];
  },

  /**
   * Get test tokens for a network
   * @param {number} chainId - Chain ID
   * @returns {object} Test token configurations
   */
  getTestTokens(chainId) {
    const config = TESTNET_CONFIGS[chainId];
    return config ? config.testTokens : {};
  },

  /**
   * Get LayerZero endpoint for testnet
   * @param {number} chainId - Chain ID
   * @returns {string} LayerZero endpoint address
   */
  getLayerZeroEndpoint(chainId) {
    const endpoints = BRIDGE_TEST_CONFIG.layerzero;
    const network = Object.values(endpoints).find(n => n.chainId === chainId);
    return network ? network.endpoint : null;
  },

  /**
   * Validate testnet configuration
   * @returns {boolean} Validation result
   */
  validateTestnetConfig() {
    try {
      // Validate each testnet configuration
      Object.entries(TESTNET_CONFIGS).forEach(([chainId, config]) => {
        if (!config.name || !config.rpcUrls || config.rpcUrls.length === 0) {
          throw new Error(`Invalid testnet config for chain ${chainId}`);
        }
        
        if (!config.nativeCurrency || !config.nativeCurrency.symbol) {
          throw new Error(`Invalid native currency for chain ${chainId}`);
        }
        
        if (!config.blockExplorerUrls || config.blockExplorerUrls.length === 0) {
          throw new Error(`Missing block explorer for chain ${chainId}`);
        }
      });

      return true;
    } catch (error) {
      console.error('Testnet configuration validation failed:', error.message);
      return false;
    }
  }
};

// Validate configuration on module load
if (!module.exports.validateTestnetConfig()) {
  throw new Error('Testnet configuration validation failed');
}
