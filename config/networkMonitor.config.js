/**
 * @fileoverview Production Enterprise-grade Network Monitor Configuration for Trust Crypto Wallet Extension
 * @version 1.0.0
 * @author Trust Wallet Development Team
 * @license MIT
 * @description PRODUCTION-READY network monitoring configuration with enterprise features
 */

/**
 * Environment-based configuration management
 */
const NODE_ENV = process.env.NODE_ENV || 'development';
const IS_PRODUCTION = NODE_ENV === 'production';
const IS_DEVELOPMENT = NODE_ENV === 'development';
const IS_STAGING = NODE_ENV === 'staging';

/**
 * Security configuration for API access
 */
const API_KEYS = {
  INFURA_API_KEY: process.env.INFURA_API_KEY || '',
  ALCHEMY_API_KEY: process.env.ALCHEMY_API_KEY || '',
  QUICKNODE_API_KEY: process.env.QUICKNODE_API_KEY || '',
  MORALIS_API_KEY: process.env.MORALIS_API_KEY || '',
  ANKR_API_KEY: process.env.ANKR_API_KEY || '',
  BLAST_API_KEY: process.env.BLAST_API_KEY || ''
};

/**
 * Enterprise-grade network monitoring configurations with failover support
 */
export const NETWORK_MONITOR_CONFIGS = {
  1: { // Ethereum Mainnet
    name: 'ethereum',
    chainId: 1,
    networkType: 'mainnet',
    symbol: 'ETH',
    decimals: 18,
    
    // Primary RPC endpoints with failover
    rpcEndpoints: {
      primary: [
        // Tier 1 - Premium providers (highest reliability)
        {
          url: `https://mainnet.infura.io/v3/${API_KEYS.INFURA_API_KEY}`,
          provider: 'infura',
          tier: 1,
          weight: 100,
          rateLimit: 100000, // requests per day
          timeout: 5000,
          retryAttempts: 3,
          enabled: !!API_KEYS.INFURA_API_KEY
        },
        {
          url: `https://eth-mainnet.g.alchemy.com/v2/${API_KEYS.ALCHEMY_API_KEY}`,
          provider: 'alchemy',
          tier: 1,
          weight: 100,
          rateLimit: 300000,
          timeout: 5000,
          retryAttempts: 3,
          enabled: !!API_KEYS.ALCHEMY_API_KEY
        },
        {
          url: `https://experienced-quick-bridge.quiknode.pro/${API_KEYS.QUICKNODE_API_KEY}`,
          provider: 'quicknode',
          tier: 1,
          weight: 95,
          rateLimit: 500000,
          timeout: 4000,
          retryAttempts: 3,
          enabled: !!API_KEYS.QUICKNODE_API_KEY
        }
      ],
      
      // Tier 2 - Reliable free/public providers
      secondary: [
        {
          url: 'https://ethereum-rpc.publicnode.com',
          provider: 'publicnode',
          tier: 2,
          weight: 80,
          rateLimit: 10000,
          timeout: 8000,
          retryAttempts: 2,
          enabled: true
        },
        {
          url: 'https://cloudflare-eth.com',
          provider: 'cloudflare',
          tier: 2,
          weight: 85,
          rateLimit: 100000,
          timeout: 6000,
          retryAttempts: 2,
          enabled: true
        },
        {
          url: `https://rpc.ankr.com/eth/${API_KEYS.ANKR_API_KEY}`,
          provider: 'ankr',
          tier: 2,
          weight: 75,
          rateLimit: 50000,
          timeout: 7000,
          retryAttempts: 2,
          enabled: !!API_KEYS.ANKR_API_KEY
        }
      ],
      
      // Tier 3 - Backup providers
      fallback: [
        {
          url: 'https://eth.llamarpc.com',
          provider: 'llamarpc',
          tier: 3,
          weight: 60,
          rateLimit: 5000,
          timeout: 10000,
          retryAttempts: 1,
          enabled: true
        },
        {
          url: 'https://rpc.payload.de',
          provider: 'payload',
          tier: 3,
          weight: 55,
          rateLimit: 3000,
          timeout: 12000,
          retryAttempts: 1,
          enabled: true
        }
      ]
    },
    
    // WebSocket endpoints for real-time updates
    websocketEndpoints: {
      primary: [
        {
          url: `wss://mainnet.infura.io/ws/v3/${API_KEYS.INFURA_API_KEY}`,
          provider: 'infura',
          enabled: !!API_KEYS.INFURA_API_KEY,
          reconnectInterval: 5000,
          maxReconnectAttempts: 10
        },
        {
          url: `wss://eth-mainnet.g.alchemy.com/v2/${API_KEYS.ALCHEMY_API_KEY}`,
          provider: 'alchemy',
          enabled: !!API_KEYS.ALCHEMY_API_KEY,
          reconnectInterval: 5000,
          maxReconnectAttempts: 10
        }
      ],
      fallback: [
        {
          url: 'wss://ethereum-rpc.publicnode.com',
          provider: 'publicnode',
          enabled: true,
          reconnectInterval: 8000,
          maxReconnectAttempts: 5
        }
      ]
    },
    
    // Network-specific monitoring configuration
    monitoring: {
      avgBlockTime: 12000,              // 12 seconds
      maxBlockTime: 30000,              // 30 seconds (alert threshold)
      confirmationBlocks: 12,           // Standard confirmation depth
      fastConfirmationBlocks: 3,        // Fast confirmation threshold
      safeConfirmationBlocks: 6,        // Safe confirmation threshold
      finalConfirmationBlocks: 32,      // Finality threshold
      
      healthCheck: {
        interval: 30000,                // 30 seconds
        timeout: 10000,                 // 10 seconds
        failureThreshold: 3,            // Consecutive failures before marking as down
        recoveryThreshold: 2            // Consecutive successes before marking as up
      },
      
      performance: {
        latencyThreshold: 2000,         // 2 seconds
        throughputThreshold: 100,       // TPS threshold
        errorRateThreshold: 5,          // 5% error rate
        uptimeRequirement: 99.9         // 99.9% uptime SLA
      }
    },
    
    // Gas and fee configuration
    gas: {
      units: 'gwei',
      defaultGasLimit: 21000,
      maxGasLimit: 30000000,
      priorityFeeMultiplier: 1.2,
      baseFeeMultiplier: 2.0,
      
      thresholds: {
        slow: '10',      // 10 gwei
        standard: '20',  // 20 gwei
        fast: '30',      // 30 gwei
        instant: '50'    // 50 gwei
      }
    },
    
    // Explorer and external services
    explorers: {
      primary: 'https://etherscan.io',
      alternatives: [
        'https://etherchain.org',
        'https://blockchair.com/ethereum',
        'https://eth.blockscout.com'
      ]
    },
    
    // Security and compliance
    security: {
      enableTxValidation: true,
      enableGasEstimation: true,
      enableMevProtection: true,
      enableReorgDetection: true,
      maxReorgDepth: 7,
      suspiciousGasThreshold: '1000' // 1000 gwei
    }
  },

  11155111: { // Ethereum Sepolia Testnet
    name: 'ethereum-sepolia',
    chainId: 11155111,
    networkType: 'testnet',
    symbol: 'SepoliaETH',
    decimals: 18,
    
    rpcEndpoints: {
      primary: [
        {
          url: `https://sepolia.infura.io/v3/${API_KEYS.INFURA_API_KEY}`,
          provider: 'infura',
          tier: 1,
          weight: 100,
          enabled: !!API_KEYS.INFURA_API_KEY
        },
        {
          url: `https://eth-sepolia.g.alchemy.com/v2/${API_KEYS.ALCHEMY_API_KEY}`,
          provider: 'alchemy',
          tier: 1,
          weight: 100,
          enabled: !!API_KEYS.ALCHEMY_API_KEY
        }
      ],
      secondary: [
        {
          url: 'https://ethereum-sepolia-rpc.publicnode.com',
          provider: 'publicnode',
          tier: 2,
          weight: 80,
          enabled: true
        }
      ]
    },
    
    websocketEndpoints: {
      primary: [
        {
          url: `wss://sepolia.infura.io/ws/v3/${API_KEYS.INFURA_API_KEY}`,
          provider: 'infura',
          enabled: !!API_KEYS.INFURA_API_KEY
        }
      ]
    },
    
    monitoring: {
      avgBlockTime: 12000,
      maxBlockTime: 30000,
      confirmationBlocks: 3,
      healthCheck: {
        interval: 60000,
        timeout: 15000,
        failureThreshold: 5,
        recoveryThreshold: 2
      }
    },
    
    explorers: {
      primary: 'https://sepolia.etherscan.io'
    }
  },

  56: { // BSC Mainnet
    name: 'binance-smart-chain',
    chainId: 56,
    networkType: 'mainnet',
    symbol: 'BNB',
    decimals: 18,
    
    rpcEndpoints: {
      primary: [
        {
          url: 'https://bsc-dataseed1.binance.org',
          provider: 'binance',
          tier: 1,
          weight: 100,
          enabled: true
        },
        {
          url: 'https://bsc-dataseed2.binance.org',
          provider: 'binance',
          tier: 1,
          weight: 95,
          enabled: true
        },
        {
          url: `https://bsc-mainnet.nodereal.io/v1/${API_KEYS.QUICKNODE_API_KEY}`,
          provider: 'nodereal',
          tier: 1,
          weight: 90,
          enabled: !!API_KEYS.QUICKNODE_API_KEY
        }
      ],
      secondary: [
        {
          url: 'https://bsc-rpc.publicnode.com',
          provider: 'publicnode',
          tier: 2,
          weight: 80,
          enabled: true
        },
        {
          url: `https://rpc.ankr.com/bsc/${API_KEYS.ANKR_API_KEY}`,
          provider: 'ankr',
          tier: 2,
          weight: 75,
          enabled: !!API_KEYS.ANKR_API_KEY
        }
      ],
      fallback: [
        {
          url: 'https://bsc-dataseed1.defibit.io',
          provider: 'defibit',
          tier: 3,
          weight: 60,
          enabled: true
        }
      ]
    },
    
    websocketEndpoints: {
      primary: [
        {
          url: 'wss://bsc-ws-node.nariox.org:443',
          provider: 'nariox',
          enabled: true
        }
      ]
    },
    
    monitoring: {
      avgBlockTime: 3000,               // 3 seconds
      maxBlockTime: 10000,              // 10 seconds
      confirmationBlocks: 3,
      fastConfirmationBlocks: 1,
      safeConfirmationBlocks: 3,
      finalConfirmationBlocks: 15,
      
      healthCheck: {
        interval: 15000,                // 15 seconds
        timeout: 8000,
        failureThreshold: 3,
        recoveryThreshold: 2
      }
    },
    
    gas: {
      units: 'gwei',
      defaultGasLimit: 21000,
      thresholds: {
        slow: '3',
        standard: '5',
        fast: '10',
        instant: '20'
      }
    },
    
    explorers: {
      primary: 'https://bscscan.com',
      alternatives: ['https://bsc.tokenview.io']
    }
  },

  97: { // BSC Testnet
    name: 'binance-smart-chain-testnet',
    chainId: 97,
    networkType: 'testnet',
    symbol: 'tBNB',
    decimals: 18,
    
    rpcEndpoints: {
      primary: [
        {
          url: 'https://data-seed-prebsc-1-s1.binance.org:8545',
          provider: 'binance',
          tier: 1,
          weight: 100,
          enabled: true
        }
      ],
      secondary: [
        {
          url: 'https://bsc-testnet-rpc.publicnode.com',
          provider: 'publicnode',
          tier: 2,
          weight: 80,
          enabled: true
        }
      ]
    },
    
    monitoring: {
      avgBlockTime: 3000,
      confirmationBlocks: 3,
      healthCheck: {
        interval: 30000,
        timeout: 10000
      }
    },
    
    explorers: {
      primary: 'https://testnet.bscscan.com'
    }
  },

  137: { // Polygon Mainnet
    name: 'polygon',
    chainId: 137,
    networkType: 'mainnet',
    symbol: 'MATIC',
    decimals: 18,
    
    rpcEndpoints: {
      primary: [
        {
          url: `https://polygon-mainnet.g.alchemy.com/v2/${API_KEYS.ALCHEMY_API_KEY}`,
          provider: 'alchemy',
          tier: 1,
          weight: 100,
          enabled: !!API_KEYS.ALCHEMY_API_KEY
        },
        {
          url: `https://polygon-mainnet.infura.io/v3/${API_KEYS.INFURA_API_KEY}`,
          provider: 'infura',
          tier: 1,
          weight: 95,
          enabled: !!API_KEYS.INFURA_API_KEY
        }
      ],
      secondary: [
        {
          url: 'https://polygon-bor-rpc.publicnode.com',
          provider: 'publicnode',
          tier: 2,
          weight: 80,
          enabled: true
        },
        {
          url: 'https://polygon-rpc.com',
          provider: 'polygon',
          tier: 2,
          weight: 85,
          enabled: true
        }
      ],
      fallback: [
        {
          url: 'https://rpc-mainnet.matic.network',
          provider: 'matic-network',
          tier: 3,
          weight: 60,
          enabled: true
        }
      ]
    },
    
    websocketEndpoints: {
      primary: [
        {
          url: `wss://polygon-mainnet.g.alchemy.com/v2/${API_KEYS.ALCHEMY_API_KEY}`,
          provider: 'alchemy',
          enabled: !!API_KEYS.ALCHEMY_API_KEY
        }
      ],
      fallback: [
        {
          url: 'wss://polygon-bor-rpc.publicnode.com',
          provider: 'publicnode',
          enabled: true
        }
      ]
    },
    
    monitoring: {
      avgBlockTime: 2000,               // 2 seconds
      maxBlockTime: 8000,               // 8 seconds
      confirmationBlocks: 5,
      fastConfirmationBlocks: 2,
      safeConfirmationBlocks: 5,
      finalConfirmationBlocks: 128,     // Polygon finality
      
      healthCheck: {
        interval: 10000,                // 10 seconds
        timeout: 6000,
        failureThreshold: 3,
        recoveryThreshold: 2
      }
    },
    
    gas: {
      units: 'gwei',
      defaultGasLimit: 21000,
      thresholds: {
        slow: '30',
        standard: '35',
        fast: '40',
        instant: '50'
      }
    },
    
    explorers: {
      primary: 'https://polygonscan.com',
      alternatives: ['https://polygon.blockscout.com']
    }
  },

  42161: { // Arbitrum One
    name: 'arbitrum-one',
    chainId: 42161,
    networkType: 'mainnet',
    symbol: 'ETH',
    decimals: 18,
    
    rpcEndpoints: {
      primary: [
        {
          url: `https://arb-mainnet.g.alchemy.com/v2/${API_KEYS.ALCHEMY_API_KEY}`,
          provider: 'alchemy',
          tier: 1,
          weight: 100,
          enabled: !!API_KEYS.ALCHEMY_API_KEY
        },
        {
          url: `https://arbitrum-mainnet.infura.io/v3/${API_KEYS.INFURA_API_KEY}`,
          provider: 'infura',
          tier: 1,
          weight: 95,
          enabled: !!API_KEYS.INFURA_API_KEY
        }
      ],
      secondary: [
        {
          url: 'https://arbitrum-one-rpc.publicnode.com',
          provider: 'publicnode',
          tier: 2,
          weight: 80,
          enabled: true
        },
        {
          url: 'https://arb1.arbitrum.io/rpc',
          provider: 'arbitrum',
          tier: 2,
          weight: 85,
          enabled: true
        }
      ]
    },
    
    monitoring: {
      avgBlockTime: 1000,               // 1 second
      maxBlockTime: 5000,               // 5 seconds
      confirmationBlocks: 1,            // L2 instant finality
      fastConfirmationBlocks: 1,
      safeConfirmationBlocks: 1,
      finalConfirmationBlocks: 1,
      
      healthCheck: {
        interval: 8000,                 // 8 seconds
        timeout: 4000,
        failureThreshold: 2,
        recoveryThreshold: 2
      }
    },
    
    gas: {
      units: 'gwei',
      defaultGasLimit: 1000000,         // Higher for L2
      thresholds: {
        slow: '0.1',
        standard: '0.1',
        fast: '0.1',
        instant: '0.1'
      }
    },
    
    explorers: {
      primary: 'https://arbiscan.io'
    }
  },

  10: { // Optimism
    name: 'optimism',
    chainId: 10,
    networkType: 'mainnet',
    symbol: 'ETH',
    decimals: 18,
    
    rpcEndpoints: {
      primary: [
        {
          url: `https://opt-mainnet.g.alchemy.com/v2/${API_KEYS.ALCHEMY_API_KEY}`,
          provider: 'alchemy',
          tier: 1,
          weight: 100,
          enabled: !!API_KEYS.ALCHEMY_API_KEY
        },
        {
          url: `https://optimism-mainnet.infura.io/v3/${API_KEYS.INFURA_API_KEY}`,
          provider: 'infura',
          tier: 1,
          weight: 95,
          enabled: !!API_KEYS.INFURA_API_KEY
        }
      ],
      secondary: [
        {
          url: 'https://optimism-rpc.publicnode.com',
          provider: 'publicnode',
          tier: 2,
          weight: 80,
          enabled: true
        },
        {
          url: 'https://mainnet.optimism.io',
          provider: 'optimism',
          tier: 2,
          weight: 85,
          enabled: true
        }
      ]
    },
    
    monitoring: {
      avgBlockTime: 2000,               // 2 seconds
      maxBlockTime: 8000,               // 8 seconds
      confirmationBlocks: 1,            // L2 instant finality
      
      healthCheck: {
        interval: 10000,
        timeout: 5000,
        failureThreshold: 2,
        recoveryThreshold: 2
      }
    },
    
    gas: {
      units: 'gwei',
      defaultGasLimit: 21000,
      thresholds: {
        slow: '0.001',
        standard: '0.001',
        fast: '0.001',
        instant: '0.001'
      }
    },
    
    explorers: {
      primary: 'https://optimistic.etherscan.io'
    }
  },

  43114: { // Avalanche C-Chain
    name: 'avalanche',
    chainId: 43114,
    networkType: 'mainnet',
    symbol: 'AVAX',
    decimals: 18,
    
    rpcEndpoints: {
      primary: [
        {
          url: 'https://api.avax.network/ext/bc/C/rpc',
          provider: 'avalanche',
          tier: 1,
          weight: 100,
          enabled: true
        },
        {
          url: `https://rpc.ankr.com/avalanche/${API_KEYS.ANKR_API_KEY}`,
          provider: 'ankr',
          tier: 1,
          weight: 90,
          enabled: !!API_KEYS.ANKR_API_KEY
        }
      ],
      secondary: [
        {
          url: 'https://avalanche-c-chain-rpc.publicnode.com',
          provider: 'publicnode',
          tier: 2,
          weight: 80,
          enabled: true
        }
      ]
    },
    
    websocketEndpoints: {
      primary: [
        {
          url: 'wss://api.avax.network/ext/bc/C/ws',
          provider: 'avalanche',
          enabled: true
        }
      ]
    },
    
    monitoring: {
      avgBlockTime: 2000,               // 2 seconds
      maxBlockTime: 6000,               // 6 seconds
      confirmationBlocks: 1,            // Avalanche instant finality
      
      healthCheck: {
        interval: 10000,
        timeout: 5000,
        failureThreshold: 2,
        recoveryThreshold: 2
      }
    },
    
    gas: {
      units: 'gwei',
      defaultGasLimit: 21000,
      thresholds: {
        slow: '25',
        standard: '25',
        fast: '25',
        instant: '25'
      }
    },
    
    explorers: {
      primary: 'https://snowtrace.io'
    }
  }
};

/**
 * Load balancer configuration for RPC endpoints
 */
export const LOAD_BALANCER_CONFIG = {
  strategy: 'weighted_round_robin',     // weighted_round_robin, least_connections, fastest_response
  healthCheckInterval: 30000,           // 30 seconds
  failoverTimeout: 5000,                // 5 seconds
  maxRetries: 3,
  retryDelay: 1000,                     // Base retry delay
  retryBackoffMultiplier: 2,            // Exponential backoff
  
  // Circuit breaker configuration
  circuitBreaker: {
    failureThreshold: 5,                // Failures before opening circuit
    recoveryTimeout: 60000,             // 1 minute recovery timeout
    halfOpenMaxCalls: 3,                // Max calls in half-open state
    successThreshold: 2                 // Successes needed to close circuit
  },
  
  // Rate limiting per provider
  rateLimiting: {
    windowMs: 60000,                    // 1 minute window
    maxRequests: 1000,                  // Max requests per window
    skipOnError: false                  // Don't skip rate limiting on errors
  }
};

/**
 * Monitoring and alerting configuration
 */
export const MONITORING_CONFIG = {
  // Performance thresholds
  performance: {
    latencyWarning: 2000,               // 2 seconds
    latencyCritical: 5000,              // 5 seconds
    errorRateWarning: 5,                // 5%
    errorRateCritical: 15,              // 15%
    uptimeMinimum: 99.0                 // 99% minimum uptime
  },
  
  // Health check configuration
  healthCheck: {
    enableContinuous: true,
    checkInterval: 30000,               // 30 seconds
    timeout: 10000,                     // 10 seconds
    retryAttempts: 3,
    retryDelay: 2000
  },
  
  // Metrics collection
  metrics: {
    enableCollection: true,
    retentionPeriod: 86400000,          // 24 hours
    aggregationInterval: 60000,         // 1 minute
    exportInterval: 300000              // 5 minutes
  },
  
  // Alerting configuration
  alerts: {
    enableAlerts: IS_PRODUCTION,
    cooldownPeriod: 300000,             // 5 minutes
    escalationTimeout: 900000,          // 15 minutes
    
    channels: {
      email: process.env.ALERT_EMAIL || '',
      slack: process.env.SLACK_WEBHOOK_URL || '',
      webhook: process.env.ALERT_WEBHOOK_URL || ''
    }
  }
};

/**
 * Security configuration
 */
export const SECURITY_CONFIG = {
  // API key rotation
  keyRotation: {
    enabled: IS_PRODUCTION,
    rotationInterval: 2592000000,       // 30 days
    warningPeriod: 604800000            // 7 days before expiry
  },
  
  // Request validation
  validation: {
    enableRequestValidation: true,
    enableResponseValidation: true,
    maxRequestSize: 1048576,            // 1MB
    maxResponseSize: 10485760           // 10MB
  },
  
  // Rate limiting
  rateLimiting: {
    enabled: true,
    windowMs: 60000,                    // 1 minute
    maxRequests: 1000,                  // Per IP
    skipSuccessfulRequests: false
  },
  
  // CORS configuration
  cors: {
    enabled: true,
    allowedOrigins: IS_PRODUCTION ? 
      ['https://trustwallet.com', 'https://*.trustwallet.com'] : 
      ['http://localhost:*', 'https://localhost:*'],
    allowedMethods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key']
  }
};

/**
 * Environment-specific configuration overrides
 */
export const ENVIRONMENT_CONFIG = {
  development: {
    logLevel: 'debug',
    enableDebugMode: true,
    enableMockData: false,
    cacheEnabled: true,
    cacheTTL: 300000                    // 5 minutes
  },
  
  staging: {
    logLevel: 'info',
    enableDebugMode: false,
    enableMockData: false,
    cacheEnabled: true,
    cacheTTL: 600000                    // 10 minutes
  },
  
  production: {
    logLevel: 'warn',
    enableDebugMode: false,
    enableMockData: false,
    cacheEnabled: true,
    cacheTTL: 300000,                   // 5 minutes
    enableMetrics: true,
    enableAlerting: true
  }
};

/**
 * Default configuration based on environment
 */
export const DEFAULT_CONFIG = {
  ...ENVIRONMENT_CONFIG[NODE_ENV],
  ...MONITORING_CONFIG,
  ...SECURITY_CONFIG,
  loadBalancer: LOAD_BALANCER_CONFIG
};

/**
 * Configuration validation
 */
export const validateConfiguration = () => {
  const errors = [];
  const warnings = [];
  
  // Check for missing API keys in production
  if (IS_PRODUCTION) {
    if (!API_KEYS.INFURA_API_KEY) {
      warnings.push('INFURA_API_KEY not configured - falling back to public endpoints');
    }
    if (!API_KEYS.ALCHEMY_API_KEY) {
      warnings.push('ALCHEMY_API_KEY not configured - falling back to public endpoints');
    }
    if (!process.env.ALERT_EMAIL && !process.env.SLACK_WEBHOOK_URL) {
      warnings.push('No alerting channels configured');
    }
  }
  
  // Validate network configurations
  for (const [chainId, config] of Object.entries(NETWORK_MONITOR_CONFIGS)) {
    if (!config.rpcEndpoints || !config.rpcEndpoints.primary || config.rpcEndpoints.primary.length === 0) {
      errors.push(`No primary RPC endpoints configured for chain ${chainId}`);
    }
    
    if (!config.monitoring || !config.monitoring.avgBlockTime) {
      errors.push(`Missing monitoring configuration for chain ${chainId}`);
    }
  }
  
  return { errors, warnings };
};

/**
 * Get network configuration by chain ID
 */
export const getNetworkConfig = (chainId) => {
  const config = NETWORK_MONITOR_CONFIGS[chainId];
  if (!config) {
    throw new Error(`Unsupported network: ${chainId}`);
  }
  return config;
};

/**
 * Get all enabled RPC endpoints for a network
 */
export const getEnabledEndpoints = (chainId, tier = 'all') => {
  const config = getNetworkConfig(chainId);
  const endpoints = [];
  
  if (tier === 'all' || tier === 'primary') {
    endpoints.push(...config.rpcEndpoints.primary.filter(ep => ep.enabled));
  }
  
  if (tier === 'all' || tier === 'secondary') {
    endpoints.push(...(config.rpcEndpoints.secondary || []).filter(ep => ep.enabled));
  }
  
  if (tier === 'all' || tier === 'fallback') {
    endpoints.push(...(config.rpcEndpoints.fallback || []).filter(ep => ep.enabled));
  }
  
  return endpoints.sort((a, b) => b.weight - a.weight);
};

/**
 * Get WebSocket endpoints for a network
 */
export const getWebSocketEndpoints = (chainId) => {
  const config = getNetworkConfig(chainId);
  const endpoints = [];
  
  if (config.websocketEndpoints) {
    if (config.websocketEndpoints.primary) {
      endpoints.push(...config.websocketEndpoints.primary.filter(ep => ep.enabled));
    }
    if (config.websocketEndpoints.fallback) {
      endpoints.push(...config.websocketEndpoints.fallback.filter(ep => ep.enabled));
    }
  }
  
  return endpoints;
};

/**
 * Get network configuration by name
 */
export const getNetworkConfigByName = (networkName) => {
  for (const [chainId, config] of Object.entries(NETWORK_MONITOR_CONFIGS)) {
    if (config.name === networkName) {
      return { chainId: parseInt(chainId), ...config };
    }
  }
  throw new Error(`Network not found: ${networkName}`);
};

/**
 * Get all supported networks
 */
export const getSupportedNetworks = () => {
  return Object.entries(NETWORK_MONITOR_CONFIGS).map(([chainId, config]) => ({
    chainId: parseInt(chainId),
    name: config.name,
    symbol: config.symbol,
    networkType: config.networkType,
    avgBlockTime: config.monitoring.avgBlockTime,
    confirmationBlocks: config.monitoring.confirmationBlocks
  }));
};

/**
 * Get mainnet networks only
 */
export const getMainnetNetworks = () => {
  return getSupportedNetworks().filter(network => network.networkType === 'mainnet');
};

/**
 * Get testnet networks only
 */
export const getTestnetNetworks = () => {
  return getSupportedNetworks().filter(network => network.networkType === 'testnet');
};

/**
 * Dynamic configuration loader with caching
 */
class ConfigurationManager {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 300000; // 5 minutes
    this.lastValidation = 0;
    this.validationInterval = 60000; // 1 minute
  }
  
  /**
   * Get cached configuration or load fresh
   */
  getConfig(chainId, useCache = true) {
    const cacheKey = `config_${chainId}`;
    const now = Date.now();
    
    if (useCache && this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (now - cached.timestamp < this.cacheTimeout) {
        return cached.config;
      }
    }
    
    const config = this._loadConfiguration(chainId);
    this.cache.set(cacheKey, {
      config,
      timestamp: now
    });
    
    return config;
  }
  
  /**
   * Load configuration with environment overrides
   */
  _loadConfiguration(chainId) {
    const baseConfig = getNetworkConfig(chainId);
    const envOverrides = this._getEnvironmentOverrides(chainId);
    
    return {
      ...baseConfig,
      ...envOverrides,
      monitoring: {
        ...baseConfig.monitoring,
        ...envOverrides.monitoring
      },
      gas: {
        ...baseConfig.gas,
        ...envOverrides.gas
      }
    };
  }
  
  /**
   * Get environment-specific overrides
   */
  _getEnvironmentOverrides(chainId) {
    const overrides = {};
    
    // Check for environment-specific RPC endpoints
    const envRpcKey = `RPC_${chainId}_URL`;
    const envWsKey = `WS_${chainId}_URL`;
    
    if (process.env[envRpcKey]) {
      overrides.customRpcUrl = process.env[envRpcKey];
    }
    
    if (process.env[envWsKey]) {
      overrides.customWsUrl = process.env[envWsKey];
    }
    
    // Environment-specific monitoring overrides
    if (IS_DEVELOPMENT) {
      overrides.monitoring = {
        healthCheck: {
          interval: 60000,  // Slower in development
          timeout: 15000
        }
      };
    }
    
    return overrides;
  }
  
  /**
   * Validate configuration periodically
   */
  validatePeriodically() {
    const now = Date.now();
    if (now - this.lastValidation < this.validationInterval) {
      return;
    }
    
    const { errors, warnings } = validateConfiguration();
    
    if (errors.length > 0) {
      console.error('Configuration validation errors:', errors);
    }
    
    if (warnings.length > 0) {
      console.warn('Configuration validation warnings:', warnings);
    }
    
    this.lastValidation = now;
  }
  
  /**
   * Clear configuration cache
   */
  clearCache() {
    this.cache.clear();
  }
  
  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      maxAge: this.cacheTimeout,
      lastValidation: this.lastValidation
    };
  }
}

/**
 * Singleton configuration manager instance
 */
export const configManager = new ConfigurationManager();

/**
 * Network health status enumeration
 */
export const NETWORK_HEALTH_STATUS = {
  HEALTHY: 'healthy',
  DEGRADED: 'degraded',
  DOWN: 'down',
  UNKNOWN: 'unknown'
};

/**
 * Provider tier definitions
 */
export const PROVIDER_TIERS = {
  TIER_1: {
    level: 1,
    description: 'Premium providers with SLA',
    expectedUptime: 99.9,
    maxLatency: 1000
  },
  TIER_2: {
    level: 2,
    description: 'Reliable public providers',
    expectedUptime: 99.0,
    maxLatency: 3000
  },
  TIER_3: {
    level: 3,
    description: 'Backup providers',
    expectedUptime: 95.0,
    maxLatency: 5000
  }
};

/**
 * Error code definitions for network monitoring
 */
export const NETWORK_ERROR_CODES = {
  // Connection errors
  CONNECTION_FAILED: 'NET_CONNECTION_FAILED',
  CONNECTION_TIMEOUT: 'NET_CONNECTION_TIMEOUT',
  CONNECTION_REFUSED: 'NET_CONNECTION_REFUSED',
  
  // Authentication errors
  INVALID_API_KEY: 'NET_INVALID_API_KEY',
  API_KEY_EXPIRED: 'NET_API_KEY_EXPIRED',
  RATE_LIMITED: 'NET_RATE_LIMITED',
  
  // Network errors
  NETWORK_UNREACHABLE: 'NET_UNREACHABLE',
  DNS_RESOLUTION_FAILED: 'NET_DNS_FAILED',
  SSL_HANDSHAKE_FAILED: 'NET_SSL_FAILED',
  
  // Response errors
  INVALID_RESPONSE: 'NET_INVALID_RESPONSE',
  MALFORMED_JSON: 'NET_MALFORMED_JSON',
  UNEXPECTED_RESPONSE: 'NET_UNEXPECTED_RESPONSE',
  
  // Chain-specific errors
  CHAIN_ID_MISMATCH: 'NET_CHAIN_ID_MISMATCH',
  BLOCK_NOT_FOUND: 'NET_BLOCK_NOT_FOUND',
  TRANSACTION_NOT_FOUND: 'NET_TX_NOT_FOUND',
  
  // Provider errors
  PROVIDER_OVERLOADED: 'NET_PROVIDER_OVERLOADED',
  PROVIDER_MAINTENANCE: 'NET_PROVIDER_MAINTENANCE',
  PROVIDER_DEPRECATED: 'NET_PROVIDER_DEPRECATED'
};

/**
 * Feature flags for network monitoring
 */
export const FEATURE_FLAGS = {
  ENABLE_WEBSOCKET: {
    enabled: !IS_DEVELOPMENT,
    description: 'Enable WebSocket connections for real-time updates'
  },
  ENABLE_LOAD_BALANCING: {
    enabled: true,
    description: 'Enable intelligent load balancing across providers'
  },
  ENABLE_CIRCUIT_BREAKER: {
    enabled: IS_PRODUCTION,
    description: 'Enable circuit breaker pattern for fault tolerance'
  },
  ENABLE_METRICS_COLLECTION: {
    enabled: IS_PRODUCTION || IS_STAGING,
    description: 'Enable detailed metrics collection and analysis'
  },
  ENABLE_AUTOMATIC_FAILOVER: {
    enabled: true,
    description: 'Enable automatic failover to backup providers'
  },
  ENABLE_PROVIDER_HEALTH_SCORING: {
    enabled: true,
    description: 'Enable dynamic provider health scoring'
  },
  ENABLE_REQUEST_CACHING: {
    enabled: true,
    description: 'Enable intelligent request caching'
  },
  ENABLE_COMPRESSION: {
    enabled: IS_PRODUCTION,
    description: 'Enable response compression for bandwidth optimization'
  }
};

/**
 * Utility functions for configuration management
 */
export const ConfigUtils = {
  /**
   * Check if a feature is enabled
   */
  isFeatureEnabled(featureName) {
    const feature = FEATURE_FLAGS[featureName];
    return feature ? feature.enabled : false;
  },
  
  /**
   * Get provider by name and chain
   */
  getProvider(chainId, providerName) {
    const endpoints = getEnabledEndpoints(chainId);
    return endpoints.find(ep => ep.provider === providerName);
  },
  
  /**
   * Get fastest providers for a chain
   */
  getFastestProviders(chainId, limit = 3) {
    const endpoints = getEnabledEndpoints(chainId);
    return endpoints
      .filter(ep => ep.tier <= 2) // Only tier 1 and 2
      .slice(0, limit);
  },
  
  /**
   * Get configuration summary
   */
  getConfigSummary() {
    const networks = getSupportedNetworks();
    const totalEndpoints = networks.reduce((sum, network) => {
      const endpoints = getEnabledEndpoints(network.chainId);
      return sum + endpoints.length;
    }, 0);
    
    return {
      supportedNetworks: networks.length,
      mainnetNetworks: getMainnetNetworks().length,
      testnetNetworks: getTestnetNetworks().length,
      totalEndpoints,
      environment: NODE_ENV,
      featuresEnabled: Object.keys(FEATURE_FLAGS).filter(
        key => FEATURE_FLAGS[key].enabled
      ).length
    };
  },
  
  /**
   * Export configuration for debugging
   */
  exportConfiguration() {
    return {
      environment: NODE_ENV,
      networks: NETWORK_MONITOR_CONFIGS,
      monitoring: MONITORING_CONFIG,
      security: SECURITY_CONFIG,
      loadBalancer: LOAD_BALANCER_CONFIG,
      featureFlags: FEATURE_FLAGS,
      apiKeysConfigured: {
        infura: !!API_KEYS.INFURA_API_KEY,
        alchemy: !!API_KEYS.ALCHEMY_API_KEY,
        quicknode: !!API_KEYS.QUICKNODE_API_KEY,
        ankr: !!API_KEYS.ANKR_API_KEY
      }
    };
  }
};

/**
 * Runtime configuration validator
 */
export const RuntimeValidator = {
  /**
   * Validate API key format
   */
  validateApiKey(apiKey, provider) {
    if (!apiKey) return { valid: false, error: 'API key is required' };
    
    const patterns = {
      infura: /^[a-f0-9]{32}$/i,
      alchemy: /^[a-zA-Z0-9_-]{40,}$/,
      quicknode: /^[a-zA-Z0-9_-]{20,}$/
    };
    
    const pattern = patterns[provider.toLowerCase()];
    if (pattern && !pattern.test(apiKey)) {
      return { valid: false, error: `Invalid ${provider} API key format` };
    }
    
    return { valid: true };
  },
  
  /**
   * Validate network configuration
   */
  validateNetworkConfig(config) {
    const errors = [];
    
    if (!config.chainId || typeof config.chainId !== 'number') {
      errors.push('Invalid or missing chainId');
    }
    
    if (!config.name || typeof config.name !== 'string') {
      errors.push('Invalid or missing network name');
    }
    
    if (!config.rpcEndpoints || !config.rpcEndpoints.primary || config.rpcEndpoints.primary.length === 0) {
      errors.push('No primary RPC endpoints configured');
    }
    
    if (!config.monitoring || !config.monitoring.avgBlockTime) {
      errors.push('Missing monitoring configuration');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  },
  
  /**
   * Validate environment configuration
   */
  validateEnvironment() {
    const warnings = [];
    const errors = [];
    
    // Check Node.js version
    const nodeVersion = process.version;
    const majorVersion = parseInt(nodeVersion.substring(1).split('.')[0]);
    
    if (majorVersion < 16) {
      errors.push(`Node.js version ${nodeVersion} is not supported. Minimum version: 16.0.0`);
    }
    
    // Check production readiness
    if (IS_PRODUCTION) {
      if (!process.env.INFURA_API_KEY && !process.env.ALCHEMY_API_KEY) {
        warnings.push('No premium API keys configured for production');
      }
      
      if (!process.env.ALERT_EMAIL && !process.env.SLACK_WEBHOOK_URL) {
        warnings.push('No alerting configured for production');
      }
    }
    
    return { errors, warnings };
  }
};

// Perform initial configuration validation on module load
const { errors: configErrors, warnings: configWarnings } = validateConfiguration();
const { errors: envErrors, warnings: envWarnings } = RuntimeValidator.validateEnvironment();

if (configErrors.length > 0 || envErrors.length > 0) {
  console.error('Configuration errors detected:', [...configErrors, ...envErrors]);
}

if (configWarnings.length > 0 || envWarnings.length > 0) {
  console.warn('Configuration warnings:', [...configWarnings, ...envWarnings]);
}

// Export default configuration
export default {
  networks: NETWORK_MONITOR_CONFIGS,
  monitoring: MONITORING_CONFIG,
  security: SECURITY_CONFIG,
  loadBalancer: LOAD_BALANCER_CONFIG,
  environment: DEFAULT_CONFIG,
  featureFlags: FEATURE_FLAGS,
  utils: ConfigUtils,
  validator: RuntimeValidator,
  manager: configManager
};
