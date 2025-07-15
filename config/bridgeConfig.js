// config/bridgeConfig.js
// CORRECTED Production Bridge Configuration - Cross-Chain Token Bridge & Deployment System

// config/bridgeConfig.js
// CORRECTED Production Bridge Configuration - Cross-Chain Token Bridge & Deployment System

const { CHAINS } = require('./chainsConfig');
const { TOKENS } = require('./tokenConfig');
const { getChainById, getChainByName } = require('./chainsConfig');

// Bridge Protocol Types
const BRIDGE_PROTOCOLS = {
  LAYERZERO: 'layerzero',
  WORMHOLE: 'wormhole',
  AXELAR: 'axelar',
  HYPERLANE: 'hyperlane',
  CHAINLINK_CCIP: 'chainlink-ccip',
  HOP: 'hop',
  ACROSS: 'across',
  CROSSCHAIN_USDT: 'crosschain-usdt',
  // NEW: Deployment-specific protocols
  DEPLOYMENT_BRIDGE: 'deployment-bridge',
  TEMPLATE_BRIDGE: 'template-bridge'
};

// Bridge Status Types
const BRIDGE_STATUS = {
  PENDING: 'pending',
  CONFIRMING: 'confirming',
  BRIDGING: 'bridging',
  COMPLETED: 'completed',
  FAILED: 'failed',
  EXPIRED: 'expired',
  // NEW: Deployment-specific statuses
  COMPILING: 'compiling',
  DEPLOYING: 'deploying',
  VERIFYING: 'verifying',
  CONFIGURING: 'configuring'
};

// NEW: Deployment Types
const DEPLOYMENT_TYPES = {
  OFT: 'oft',
  OFT_ADAPTER: 'oft-adapter',
  ERC20: 'erc20',
  MINTABLE_TOKEN: 'mintable-token',
  GOVERNANCE_TOKEN: 'governance-token',
  CUSTOM_BRIDGE: 'custom-bridge'
};

// Bridge Configuration per Protocol
const BRIDGE_CONFIGS = {
  [BRIDGE_PROTOCOLS.LAYERZERO]: {
    name: 'LayerZero',
    version: 'v2',
    enabled: true,
    icon: '/images/bridges/layerzero-bridge-64.png',
    description: 'Ultra-light cross-chain protocol',
    
    // Protocol specific settings
    settings: {
      gasLimit: 200000,
      adapterParams: '0x00010000000000000000000000000000000000000000000000000000000000030d40',
      confirmations: {
        ethereum: 15,
        bsc: 20,
        polygon: 200,
        arbitrum: 1,
        optimism: 1,
        avalanche: 1
      }
    },
    
    // Supported chains
    supportedChains: ['ethereum', 'bsc', 'polygon', 'arbitrum', 'optimism', 'avalanche'],
    
    // CORRECTED: Contract addresses per chain
    contracts: {
      ethereum: {
        endpoint: '0x1a44076050125825900e736c501f859c50fE728c',
        oft: '0x6985884C4392D348587B19cb9eAAf157F13271cd', // CORRECTED
        adapter: '0x211Cc4DD073734dA055fbF44a2b4667d5E5fE5d2',
        bridge: '0x8C0479c5173DdD98A22d283233f86189CCb7C027'
      },
      bsc: {
        endpoint: '0x1a44076050125825900e736c501f859c50fE728c',
        oft: '0x6985884C4392D348587B19cb9eAAf157F13271cd',
        adapter: '0x211Cc4DD073734dA055fbF44a2b4667d5E5fE5d2',
        bridge: '0x8C0479c5173DdD98A22d283233f86189CCb7C027'
      },
      polygon: {
        endpoint: '0x1a44076050125825900e736c501f859c50fE728c',
        oft: '0x6985884C4392D348587B19cb9eAAf157F13271cd',
        adapter: '0x211Cc4DD073734dA055fbF44a2b4667d5E5fE5d2',
        bridge: '0x8C0479c5173DdD98A22d283233f86189CCb7C027'
      },
      arbitrum: {
        endpoint: '0x1a44076050125825900e736c501f859c50fE728c',
        oft: '0x6985884C4392D348587B19cb9eAAf157F13271cd',
        adapter: '0x211Cc4DD073734dA055fbF44a2b4667d5E5fE5d2',
        bridge: '0x8C0479c5173DdD98A22d283233f86189CCb7C027'
      },
      optimism: {
        endpoint: '0x1a44076050125825900e736c501f859c50fE728c',
        oft: '0x6985884C4392D348587B19cb9eAAf157F13271cd',
        adapter: '0x211Cc4DD073734dA055fbF44a2b4667d5E5fE5d2',
        bridge: '0x8C0479c5173DdD98A22d283233f86189CCb7C027'
      },
      avalanche: {
        endpoint: '0x1a44076050125825900e736c501f859c50fE728c',
        oft: '0x6985884C4392D348587B19cb9eAAf157F13271cd',
        adapter: '0x211Cc4DD073734dA055fbF44a2b4667d5E5fE5d2',
        bridge: '0x8C0479c5173DdD98A22d283233f86189CCb7C027'
      }
    },
    
    // NEW: ABI specifications
    abis: {
      endpoint: 'src/bridges/abis/layerzero/v2/LayerZeroV2Endpoint.json',
      oft: 'src/bridges/abis/layerzero/v2/LayerZeroV2OFT.json',
      adapter: 'src/bridges/abis/layerzero/v2/LayerZeroV2Adapter.json',
      bridge: 'src/bridges/abis/bridges/LayerZeroTokenBridge.json'
    },
    
    // Fee structure
    fees: {
      baseFee: '0.001',
      dynamicFee: true,
      feeToken: 'native',
      minFee: '0.0001',
      maxFee: '0.01'
    },
    
    // Bridge limits
    limits: {
      minAmount: '0.001',
      maxAmount: '1000000',
      dailyLimit: '10000000'
    }
  },

  [BRIDGE_PROTOCOLS.WORMHOLE]: {
    name: 'Wormhole',
    version: 'v3',
    enabled: true,
    icon: '/images/bridges/wormhole-bridge-64.png',
    description: 'Secure cross-chain communication protocol',
    
    settings: {
      gasLimit: 300000,
      consistency: 200,
      confirmations: {
        ethereum: 15,
        bsc: 15,
        polygon: 512,
        arbitrum: 1,
        optimism: 1,
        avalanche: 1
      }
    },
    
    supportedChains: ['ethereum', 'bsc', 'polygon', 'arbitrum', 'optimism', 'avalanche'],
    
    contracts: {
      ethereum: {
        core: '0x98f3c9e6E3fAce36bAAd05FE09d375Ef1464288B',
        tokenBridge: '0x381752f5458282d317d12C30D2Bd4D6E1FD8841e'
      },
      bsc: {
        core: '0x98f3c9e6E3fAce36bAAd05FE09d375Ef1464288B',
        tokenBridge: '0x381752f5458282d317d12C30D2Bd4D6E1FD8841e'
      },
      polygon: {
        core: '0x98f3c9e6E3fAce36bAAd05FE09d375Ef1464288B',
        tokenBridge: '0x381752f5458282d317d12C30D2Bd4D6E1FD8841e'
      },
      arbitrum: {
        core: '0x98f3c9e6E3fAce36bAAd05FE09d375Ef1464288B',
        tokenBridge: '0x381752f5458282d317d12C30D2Bd4D6E1FD8841e'
      },
      optimism: {
        core: '0x98f3c9e6E3fAce36bAAd05FE09d375Ef1464288B',
        tokenBridge: '0x381752f5458282d317d12C30D2Bd4D6E1FD8841e'
      },
      avalanche: {
        core: '0x98f3c9e6E3fAce36bAAd05FE09d375Ef1464288B',
        tokenBridge: '0x381752f5458282d317d12C30D2Bd4D6E1FD8841e'
      }
    },
    
    abis: {
      core: 'src/bridges/abis/bridges/WormholeTokenBridge.json',
      tokenBridge: 'src/bridges/abis/bridges/WormholeTokenBridge.json'
    },
    
    fees: {
      baseFee: '0.002',
      dynamicFee: true,
      feeToken: 'native',
      minFee: '0.0002',
      maxFee: '0.02'
    },
    
    limits: {
      minAmount: '0.01',
      maxAmount: '500000',
      dailyLimit: '5000000'
    }
  },

  [BRIDGE_PROTOCOLS.CHAINLINK_CCIP]: {
    name: 'Chainlink CCIP',
    version: 'v1.2',
    enabled: true,
    icon: '/images/bridges/chainlink-bridge-64.png',
    description: 'Chainlink Cross-Chain Interoperability Protocol',
    
    settings: {
      gasLimit: 400000,
      destinationGasLimit: 200000,
      confirmations: {
        ethereum: 20,
        bsc: 10,
        polygon: 200,
        arbitrum: 1,
        optimism: 1,
        avalanche: 1
      }
    },
    
    supportedChains: ['ethereum', 'bsc', 'polygon', 'arbitrum', 'optimism', 'avalanche'],
    
    contracts: {
      ethereum: {
        router: '0x80226fc0ee2b096224eeac085bb9a8cba1146f7d',
        bridge: '0x80226fc0ee2b096224eeac085bb9a8cba1146f7d'
      },
      bsc: {
        router: '0x80226fc0ee2b096224eeac085bb9a8cba1146f7d',
        bridge: '0x80226fc0ee2b096224eeac085bb9a8cba1146f7d'
      },
      polygon: {
        router: '0x80226fc0ee2b096224eeac085bb9a8cba1146f7d',
        bridge: '0x80226fc0ee2b096224eeac085bb9a8cba1146f7d'
      },
      arbitrum: {
        router: '0x80226fc0ee2b096224eeac085bb9a8cba1146f7d',
        bridge: '0x80226fc0ee2b096224eeac085bb9a8cba1146f7d'
      },
      optimism: {
        router: '0x80226fc0ee2b096224eeac085bb9a8cba1146f7d',
        bridge: '0x80226fc0ee2b096224eeac085bb9a8cba1146f7d'
      },
      avalanche: {
        router: '0x80226fc0ee2b096224eeac085bb9a8cba1146f7d',
        bridge: '0x80226fc0ee2b096224eeac085bb9a8cba1146f7d'
      }
    },
    
    abis: {
      router: 'src/bridges/abis/bridges/CCIPBridge.json',
      bridge: 'src/bridges/abis/bridges/CCIPBridge.json'
    },
    
    fees: {
      baseFee: '0.003',
      dynamicFee: true,
      feeToken: 'LINK',
      minFee: '0.0003',
      maxFee: '0.03'
    },
    
    limits: {
      minAmount: '0.01',
      maxAmount: '100000',
      dailyLimit: '1000000'
    }
  },

  [BRIDGE_PROTOCOLS.CROSSCHAIN_USDT]: {
    name: 'CrossChain USDT',
    version: 'v1.0',
    enabled: true,
    icon: '/images/tokens/crosschain-usdt.png',
    description: 'Custom CrossChain USDT Bridge',
    
    settings: {
      gasLimit: 250000,
      bridgeTimeout: 3600,
      confirmations: {
        ethereum: 12,
        bsc: 15,
        polygon: 128,
        arbitrum: 1,
        optimism: 1,
        avalanche: 1
      }
    },
    
    supportedChains: ['ethereum', 'bsc', 'polygon', 'arbitrum', 'optimism', 'avalanche'],
    
    contracts: {
      ethereum: {
        bridge: '0xcc1b99dDAc1a33c201a742A1851662E87BC7f22C',
        token: '0xcc1b99dDAc1a33c201a742A1851662E87BC7f22C'
      },
      bsc: {
        bridge: '0xcc1b99dDAc1a33c201a742A1851662E87BC7f22C',
        token: '0xcc1b99dDAc1a33c201a742A1851662E87BC7f22C'
      },
      polygon: {
        bridge: '0xcc1b99dDAc1a33c201a742A1851662E87BC7f22C',
        token: '0xcc1b99dDAc1a33c201a742A1851662E87BC7f22C'
      },
      arbitrum: {
        bridge: '0xcc1b99dDAc1a33c201a742A1851662E87BC7f22C',
        token: '0xcc1b99dDAc1a33c201a742A1851662E87BC7f22C'
      },
      optimism: {
        bridge: '0xcc1b99dDAc1a33c201a742A1851662E87BC7f22C',
        token: '0xcc1b99dDAc1a33c201a742A1851662E87BC7f22C'
      },
      avalanche: {
        bridge: '0xcc1b99dDAc1a33c201a742A1851662E87BC7f22C',
        token: '0xcc1b99dDAc1a33c201a742A1851662E87BC7f22C'
      }
    },
    
    abis: {
      bridge: 'src/bridges/abis/bridges/crosschain-usdt-bridge.json',
      token: 'src/bridges/abis/tokens/CrossChainUSDT.json'
    },
    
    fees: {
      baseFee: '0.0005',
      dynamicFee: false,
      feeToken: 'native',
      minFee: '0.0001',
      maxFee: '0.005'
    },
    
    limits: {
      minAmount: '1',
      maxAmount: '1000000',
      dailyLimit: '10000000'
    }
  }
};

// NEW: Contract Deployment Bridge Configurations
const DEPLOYMENT_BRIDGE_CONFIGS = {
  [BRIDGE_PROTOCOLS.DEPLOYMENT_BRIDGE]: {
    name: 'Multi-Chain Deployment Bridge',
    version: 'v1.0',
    enabled: true,
    icon: '/images/templates/deployment-bridge-64.png',
    description: 'Orchestrates cross-chain contract deployments',
    
    settings: {
      gasLimit: 8000000, // Higher for contract deployments
      deploymentTimeout: 7200, // 2 hours
      verificationTimeout: 3600, // 1 hour
      confirmations: {
        ethereum: 5,  // Lower for deployments
        bsc: 10,
        polygon: 50,
        arbitrum: 1,
        optimism: 1,
        avalanche: 1
      }
    },
    
    supportedChains: ['ethereum', 'bsc', 'polygon', 'arbitrum', 'optimism', 'avalanche'],
    
    // Deployment-specific contract addresses
    contracts: {
      ethereum: {
        deployer: '0xDeployerContractAddress',
        factory: '0xFactoryContractAddress',
        registry: '0xRegistryContractAddress'
      },
      bsc: {
        deployer: '0xDeployerContractAddress',
        factory: '0xFactoryContractAddress',
        registry: '0xRegistryContractAddress'
      },
      // ... other chains
    },
    
    abis: {
      deployer: 'src/contracts/deployment/ContractDeployer.json',
      factory: 'src/contracts/deployment/ContractFactory.json',
      registry: 'src/contracts/deployment/ContractRegistry.json'
    },
    
    // Template support
    templates: {
      [DEPLOYMENT_TYPES.OFT]: {
        template: 'src/contracts/templates/layerzero/OFT.sol',
        parameters: ['name', 'symbol', 'delegate', 'endpoint'],
        gasLimit: 3000000
      },
      [DEPLOYMENT_TYPES.OFT_ADAPTER]: {
        template: 'src/contracts/templates/layerzero/OFTAdapter.sol',
        parameters: ['token', 'delegate', 'endpoint'],
        gasLimit: 2500000
      },
      [DEPLOYMENT_TYPES.ERC20]: {
        template: 'src/contracts/templates/erc20/StandardToken.sol',
        parameters: ['name', 'symbol', 'decimals', 'initialSupply'],
        gasLimit: 2000000
      },
      [DEPLOYMENT_TYPES.MINTABLE_TOKEN]: {
        template: 'src/contracts/templates/erc20/MintableToken.sol',
        parameters: ['name', 'symbol', 'decimals', 'owner'],
        gasLimit: 2200000
      },
      [DEPLOYMENT_TYPES.GOVERNANCE_TOKEN]: {
        template: 'src/contracts/templates/erc20/GovernanceToken.sol',
        parameters: ['name', 'symbol', 'decimals', 'initialSupply', 'votingDelay', 'votingPeriod'],
        gasLimit: 4000000
      }
    },
    
    fees: {
      baseFee: '0.01', // Higher for deployments
      dynamicFee: true,
      feeToken: 'native',
      minFee: '0.005',
      maxFee: '0.1'
    },
    
    limits: {
      maxConcurrentDeployments: 5,
      maxChainsPerDeployment: 7,
      deploymentTimeout: 7200
    }
  }
};

// NEW: Template-Specific Bridge Routes
const TEMPLATE_BRIDGE_ROUTES = {
  // OFT Template Routes
  'oft-deployment': {
    protocols: [BRIDGE_PROTOCOLS.DEPLOYMENT_BRIDGE, BRIDGE_PROTOCOLS.LAYERZERO],
    preferredProtocol: BRIDGE_PROTOCOLS.DEPLOYMENT_BRIDGE,
    requiredContracts: ['LayerZero Endpoint'],
    estimatedTime: '15-30 minutes',
    cost: 'high',
    
    chainConfigurations: {
      ethereum: {
        endpointId: 101,
        gasLimit: 3000000,
        verificationRequired: true
      },
      bsc: {
        endpointId: 102,
        gasLimit: 2500000,
        verificationRequired: true
      },
      polygon: {
        endpointId: 109,
        gasLimit: 2000000,
        verificationRequired: true
      },
      arbitrum: {
        endpointId: 110,
        gasLimit: 2500000,
        verificationRequired: true
      },
      optimism: {
        endpointId: 111,
        gasLimit: 2500000,
        verificationRequired: true
      },
      avalanche: {
        endpointId: 106,
        gasLimit: 2000000,
        verificationRequired: true
      }
    }
  },
  
  // ERC20 Template Routes
  'erc20-deployment': {
    protocols: [BRIDGE_PROTOCOLS.DEPLOYMENT_BRIDGE],
    preferredProtocol: BRIDGE_PROTOCOLS.DEPLOYMENT_BRIDGE,
    requiredContracts: [],
    estimatedTime: '10-20 minutes',
    cost: 'medium',
    
    chainConfigurations: {
      ethereum: {
        gasLimit: 2000000,
        verificationRequired: true
      },
      bsc: {
        gasLimit: 1500000,
        verificationRequired: true
      },
      polygon: {
        gasLimit: 1200000,
        verificationRequired: true
      },
      arbitrum: {
        gasLimit: 1500000,
        verificationRequired: true
      },
      optimism: {
        gasLimit: 1500000,
        verificationRequired: true
      },
      avalanche: {
        gasLimit: 1200000,
        verificationRequired: true
      }
    }
  },
  
  // Governance Token Routes
  'governance-deployment': {
    protocols: [BRIDGE_PROTOCOLS.DEPLOYMENT_BRIDGE],
    preferredProtocol: BRIDGE_PROTOCOLS.DEPLOYMENT_BRIDGE,
    requiredContracts: [],
    estimatedTime: '20-40 minutes',
    cost: 'high',
    
    chainConfigurations: {
      ethereum: {
        gasLimit: 4000000,
        verificationRequired: true,
        governanceSetup: true
      },
      bsc: {
        gasLimit: 3500000,
        verificationRequired: true,
        governanceSetup: true
      },
      polygon: {
        gasLimit: 3000000,
        verificationRequired: true,
        governanceSetup: true
      }
    }
  }
};

// NEW: Multi-Chain Deployment Orchestration
const MULTI_CHAIN_DEPLOYMENT_CONFIG = {
  // Deployment strategies
  strategies: {
    SEQUENTIAL: {
      name: 'Sequential Deployment',
      description: 'Deploy on chains one by one',
      maxConcurrency: 1,
      failureHandling: 'stop',
      estimatedTime: 'long',
      reliability: 'high'
    },
    PARALLEL: {
      name: 'Parallel Deployment',
      description: 'Deploy on multiple chains simultaneously',
      maxConcurrency: 3,
      failureHandling: 'continue',
      estimatedTime: 'medium',
      reliability: 'medium'
    },
    BATCH: {
      name: 'Batch Deployment',
      description: 'Deploy in batches of chains',
      maxConcurrency: 2,
      failureHandling: 'retry',
      estimatedTime: 'medium',
      reliability: 'high'
    }
  },
  
  // Chain deployment priorities
  deploymentPriorities: {
    ethereum: 1,    // Deploy first (main chain)
    bsc: 2,         // Deploy second
    polygon: 3,     // Deploy third
    arbitrum: 4,    // Deploy fourth
    optimism: 5,    // Deploy fifth
    avalanche: 6    // Deploy sixth
  },
  
  // Cross-chain configuration setup
  crossChainSetup: {
    layerZero: {
      trustedRemotes: {
        setupRequired: true,
        batchSize: 3,
        confirmationsRequired: 2
      },
      peerConfigurations: {
        setupRequired: true,
        validationRequired: true
      }
    },
    
    verification: {
      parallel: true,
      maxRetries: 3,
      timeout: 300000 // 5 minutes per chain
    }
  },
  
  // Deployment tracking
  tracking: {
    statusUpdates: true,
    progressReporting: true,
    failureAlerts: true,
    completionNotifications: true
  }
};

// NEW: Verification Bridge Configuration
const VERIFICATION_BRIDGE_CONFIG = {
  // Verification providers per chain
  providers: {
    ethereum: {
      etherscan: {
        apiUrl: 'https://api.etherscan.io/api',
        apiKey: process.env.ETHERSCAN_API_KEY,
        enabled: true
      }
    },
    bsc: {
      bscscan: {
        apiUrl: 'https://api.bscscan.com/api',
        apiKey: process.env.BSCSCAN_API_KEY,
        enabled: true
      }
    },
    polygon: {
      polygonscan: {
        apiUrl: 'https://api.polygonscan.com/api',
        apiKey: process.env.POLYGONSCAN_API_KEY,
        enabled: true
      }
    },
    arbitrum: {
      arbiscan: {
        apiUrl: 'https://api.arbiscan.io/api',
        apiKey: process.env.ARBISCAN_API_KEY,
        enabled: true
      }
    },
    optimism: {
      optimisticEtherscan: {
        apiUrl: 'https://api-optimistic.etherscan.io/api',
        apiKey: process.env.OPTIMISTIC_ETHERSCAN_API_KEY,
        enabled: true
      }
    },
    avalanche: {
      snowtrace: {
        apiUrl: 'https://api.snowtrace.io/api',
        apiKey: process.env.SNOWTRACE_API_KEY,
        enabled: true
      }
    }
  },
  
  // Verification settings
  settings: {
    autoVerify: true,
    maxRetries: 3,
    retryDelay: 30000, // 30 seconds
    timeout: 300000,   // 5 minutes
    batchVerification: true
  }
};

// Enhanced Route Configuration
const BRIDGE_ROUTES = {
  // Standard bridging routes
  'ethereum-bsc': {
    protocols: [BRIDGE_PROTOCOLS.LAYERZERO, BRIDGE_PROTOCOLS.WORMHOLE, BRIDGE_PROTOCOLS.CROSSCHAIN_USDT],
    preferredProtocol: BRIDGE_PROTOCOLS.LAYERZERO,
    estimatedTime: '5-15 minutes',
    cost: 'medium'
  },
  'ethereum-polygon': {
    protocols: [BRIDGE_PROTOCOLS.LAYERZERO, BRIDGE_PROTOCOLS.WORMHOLE, BRIDGE_PROTOCOLS.CHAINLINK_CCIP],
    preferredProtocol: BRIDGE_PROTOCOLS.LAYERZERO,
    estimatedTime: '5-20 minutes',
    cost: 'medium'
  },
  'ethereum-arbitrum': {
    protocols: [BRIDGE_PROTOCOLS.LAYERZERO, BRIDGE_PROTOCOLS.WORMHOLE, BRIDGE_PROTOCOLS.CHAINLINK_CCIP],
    preferredProtocol: BRIDGE_PROTOCOLS.LAYERZERO,
    estimatedTime: '2-10 minutes',
    cost: 'low'
  },
  'ethereum-optimism': {
    protocols: [BRIDGE_PROTOCOLS.LAYERZERO, BRIDGE_PROTOCOLS.WORMHOLE, BRIDGE_PROTOCOLS.CHAINLINK_CCIP],
    preferredProtocol: BRIDGE_PROTOCOLS.LAYERZERO,
    estimatedTime: '2-10 minutes',
    cost: 'low'
  },
  'ethereum-avalanche': {
    protocols: [BRIDGE_PROTOCOLS.LAYERZERO, BRIDGE_PROTOCOLS.WORMHOLE, BRIDGE_PROTOCOLS.CHAINLINK_CCIP],
    preferredProtocol: BRIDGE_PROTOCOLS.LAYERZERO,
    estimatedTime: '5-15 minutes',
    cost: 'medium'
  },
  
  // Additional cross-chain routes
  'bsc-polygon': {
    protocols: [BRIDGE_PROTOCOLS.LAYERZERO, BRIDGE_PROTOCOLS.WORMHOLE, BRIDGE_PROTOCOLS.CROSSCHAIN_USDT],
    preferredProtocol: BRIDGE_PROTOCOLS.LAYERZERO,
    estimatedTime: '3-10 minutes',
    cost: 'low'
  },
  'bsc-arbitrum': {
    protocols: [BRIDGE_PROTOCOLS.LAYERZERO, BRIDGE_PROTOCOLS.WORMHOLE],
    preferredProtocol: BRIDGE_PROTOCOLS.LAYERZERO,
    estimatedTime: '5-15 minutes',
    cost: 'medium'
  },
  'bsc-optimism': {
    protocols: [BRIDGE_PROTOCOLS.LAYERZERO, BRIDGE_PROTOCOLS.WORMHOLE],
    preferredProtocol: BRIDGE_PROTOCOLS.LAYERZERO,
    estimatedTime: '5-15 minutes',
    cost: 'medium'
  },
  'bsc-avalanche': {
    protocols: [BRIDGE_PROTOCOLS.LAYERZERO, BRIDGE_PROTOCOLS.WORMHOLE, BRIDGE_PROTOCOLS.CROSSCHAIN_USDT],
    preferredProtocol: BRIDGE_PROTOCOLS.LAYERZERO,
    estimatedTime: '3-10 minutes',
    cost: 'low'
  },
  'polygon-arbitrum': {
    protocols: [BRIDGE_PROTOCOLS.LAYERZERO, BRIDGE_PROTOCOLS.WORMHOLE, BRIDGE_PROTOCOLS.CHAINLINK_CCIP],
    preferredProtocol: BRIDGE_PROTOCOLS.LAYERZERO,
    estimatedTime: '5-15 minutes',
    cost: 'medium'
  },
  'polygon-optimism': {
    protocols: [BRIDGE_PROTOCOLS.LAYERZERO, BRIDGE_PROTOCOLS.WORMHOLE, BRIDGE_PROTOCOLS.CHAINLINK_CCIP],
    preferredProtocol: BRIDGE_PROTOCOLS.LAYERZERO,
    estimatedTime: '5-15 minutes',
    cost: 'medium'
  },
  'polygon-avalanche': {
    protocols: [BRIDGE_PROTOCOLS.LAYERZERO, BRIDGE_PROTOCOLS.WORMHOLE, BRIDGE_PROTOCOLS.CROSSCHAIN_USDT],
    preferredProtocol: BRIDGE_PROTOCOLS.LAYERZERO,
    estimatedTime: '5-15 minutes',
    cost: 'medium'
  },
  'arbitrum-optimism': {
    protocols: [BRIDGE_PROTOCOLS.LAYERZERO, BRIDGE_PROTOCOLS.WORMHOLE],
    preferredProtocol: BRIDGE_PROTOCOLS.LAYERZERO,
    estimatedTime: '2-8 minutes',
    cost: 'low'
  },

  // NEW: Deployment routes
  'multi-chain-deployment': {
    protocols: [BRIDGE_PROTOCOLS.DEPLOYMENT_BRIDGE],
    preferredProtocol: BRIDGE_PROTOCOLS.DEPLOYMENT_BRIDGE,
    estimatedTime: '30-60 minutes',
    cost: 'very-high',
    supportedChains: ['ethereum', 'bsc', 'polygon', 'arbitrum', 'optimism', 'avalanche']
  }
};

// Security Configuration
const SECURITY_CONFIG = {
  // Transaction validation
  validation: {
    requireSignature: true,
    requireApproval: true,
    maxSlippage: 0.05, // 5%
    minConfirmations: {
      ethereum: 12,
      bsc: 15,
      polygon: 128,
      arbitrum: 1,
      optimism: 1,
      avalanche: 1,
      fantom: 1
    }
  },

  // Risk management
  riskManagement: {
    maxTransactionValue: '100000', // USD
    dailyTransactionLimit: '1000000', // USD
    suspiciousActivityDetection: true,
    blacklistCheck: true,
    amlCompliance: true
  },

  // NEW: Deployment security
  deploymentSecurity: {
    codeValidation: true,
    templateValidation: true,
    parameterValidation: true,
    gasLimitValidation: true,
    contractSizeLimit: 24576, // 24KB
    maxInitCodeSize: 49152,   // 48KB
    requireTestnetValidation: false // Set to true for production
  },

  // Security features
  features: {
    pauseEmergency: true,
    upgradeability: false,
    timelock: 86400, // 24 hours
    multisig: true,
    rateLimiting: true
  }
};

// Bridge Manager Configuration
const BRIDGE_MANAGER_CONFIG = {
  // Default settings
  defaults: {
    protocol: BRIDGE_PROTOCOLS.LAYERZERO,
    slippage: 0.005, // 0.5%
    deadline: 1800, // 30 minutes
    gasMultiplier: 1.2
  },

  // Monitoring settings
  monitoring: {
    pollInterval: 10000, // 10 seconds
    maxRetries: 3,
    timeoutMs: 300000, // 5 minutes
    alertThresholds: {
      highGas: 100, // gwei
      longDelay: 1800, // 30 minutes
      failureRate: 0.1 // 10%
    }
  },

  // Error handling
  errorHandling: {
    retryOnFailure: true,
    fallbackProtocol: true,
    autoRefund: true,
    maxRetryAttempts: 3,
    retryDelay: 30000 // 30 seconds
  },

  // NEW: Deployment management
  deploymentManagement: {
    maxConcurrentDeployments: 5,
    deploymentQueue: true,
    progressTracking: true,
    rollbackSupport: true,
    verificationQueue: true
  }
};

// Enhanced Integration paths with application components
const INTEGRATION_PATHS = {
  // Services integration
  services: {
    bridgeService: 'src/services/BridgeService.js',
    crossChainService: 'src/services/CrossChainService.js',
    contractDeploymentService: 'src/services/ContractDeploymentService.js',
    templateService: 'src/services/TemplateService.js',
    compilationService: 'src/services/CompilationService.js',
    verificationService: 'src/services/VerificationService.js'
  },

  // Components integration  
  components: {
    bridgeSelector: 'src/ui/components/bridge/BridgeSelector.js',
    routeDisplay: 'src/ui/components/bridge/RouteDisplay.js',
    bridgeStatus: 'src/ui/components/bridge/BridgeStatus.js',
    crossChainProgress: 'src/ui/components/bridge/CrossChainProgress.js',
    // NEW: Deployment components
    tokenCreator: 'src/ui/components/deployment/TokenCreator.js',
    templateSelector: 'src/ui/components/deployment/TemplateSelector.js',
    deploymentProgress: 'src/ui/components/deployment/DeploymentProgress.js',
    deploymentWizard: 'src/ui/components/deployment/DeploymentWizard.js',
    deployedContracts: 'src/ui/components/deployment/DeployedContracts.js'
  },

  // Utils integration
  utils: {
    bridgeUtils: 'src/utils/bridgeUtils.js',
    crossChainUtils: 'src/utils/crossChainUtils.js',
    addressUtils: 'src/utils/addressUtils.js',
    // NEW: Deployment utils
    contractUtils: 'src/utils/contractUtils.js',
    templateUtils: 'src/utils/templateUtils.js',
    deploymentUtils: 'src/utils/deploymentUtils.js',
    compilationUtils: 'src/utils/compilationUtils.js',
    verificationUtils: 'src/utils/verificationUtils.js'
  },

  // Storage integration
  storage: {
    bridgeStorage: 'src/storage/BridgeStorage.js',
    contractStorage: 'src/storage/ContractStorage.js',
    templateStorage: 'src/storage/TemplateStorage.js',
    deploymentStorage: 'src/storage/DeploymentStorage.js',
    compilationStorage: 'src/storage/CompilationStorage.js'
  },

  // Hooks integration
  hooks: {
    useBridge: 'src/ui/hooks/useBridge.js',
    useBridgeConfig: 'src/ui/hooks/useBridgeConfig.js',
    useCrossChain: 'src/ui/hooks/useCrossChain.js',
    useBridgeValidation: 'src/ui/hooks/useBridgeValidation.js',
    useCrossChainUSDT: 'src/ui/hooks/useCrossChainUSDT.js',
    // NEW: Deployment hooks
    useContractDeployment: 'src/ui/hooks/useContractDeployment.js',
    useTemplateManagement: 'src/ui/hooks/useTemplateManagement.js',
    useMultiChainDeployment: 'src/ui/hooks/useMultiChainDeployment.js',
    useDeploymentTracking: 'src/ui/hooks/useDeploymentTracking.js',
    useContractPortfolio: 'src/ui/hooks/useContractPortfolio.js',
    useContractVerification: 'src/ui/hooks/useContractVerification.js'
  },

  // Contract ABIs integration
  abis: {
    layerzero: {
      v2: {
        endpoint: 'src/bridges/abis/layerzero/v2/LayerZeroV2Endpoint.json',
        oft: 'src/bridges/abis/layerzero/v2/LayerZeroV2OFT.json',
        adapter: 'src/bridges/abis/layerzero/v2/LayerZeroV2Adapter.json'
      }
    },
    bridges: {
      layerzero: 'src/bridges/abis/bridges/LayerZeroTokenBridge.json',
      wormhole: 'src/bridges/abis/bridges/WormholeTokenBridge.json',
      ccip: 'src/bridges/abis/bridges/CCIPBridge.json'
    },
    tokens: {
      crosschainUsdt: 'src/bridges/abis/tokens/CrossChainUSDT.json',
      erc20: 'src/bridges/abis/tokens/ERC20.json'
    },
    infrastructure: {
      axelarGateway: 'src/bridges/abis/infrastructure/AxelarGateway.json',
      mailbox: 'src/bridges/abis/infrastructure/Mailbox.json',
      chainlinkPriceFeed: 'src/bridges/abis/infrastructure/ChainlinkPriceFeed.json'
    }
  },

  // API endpoints
  api: {
    bridgeRoutes: 'pages/api/bridge-routes.js',
    bridgeStatus: 'pages/api/bridge-status.js',
    crossChainTransfer: 'pages/api/cross-chain-transfer.js',
    crosschainUsdt: 'pages/api/crosschain-usdt.js',
    // NEW: Deployment APIs
    compileContract: 'pages/api/compile-contract.js',
    deployContract: 'pages/api/deploy-contract.js',
    verifyContract: 'pages/api/verify-contract.js',
    deploymentStatus: 'pages/api/deployment-status.js',
    templateManagement: 'pages/api/template-management.js',
    contractPortfolio: 'pages/api/contract-portfolio.js',
    multiChainDeploy: 'pages/api/multi-chain-deploy.js'
  }
};

// Utility Functions
const getBridgeConfig = (protocol) => {
  if (BRIDGE_CONFIGS[protocol]) {
    return BRIDGE_CONFIGS[protocol];
  }
  if (DEPLOYMENT_BRIDGE_CONFIGS[protocol]) {
    return DEPLOYMENT_BRIDGE_CONFIGS[protocol];
  }
  throw new Error(`Bridge protocol ${protocol} not supported`);
};

const getDeploymentConfig = (deploymentType) => {
  const deploymentBridge = DEPLOYMENT_BRIDGE_CONFIGS[BRIDGE_PROTOCOLS.DEPLOYMENT_BRIDGE];
  return deploymentBridge?.templates[deploymentType];
};

const getTemplateRoute = (templateType) => {
  const routeKey = `${templateType}-deployment`;
  return TEMPLATE_BRIDGE_ROUTES[routeKey];
};

const getSupportedProtocols = (fromChain, toChain) => {
  const routeKey = `${fromChain}-${toChain}`;
  const reverseRouteKey = `${toChain}-${fromChain}`;
  
  return BRIDGE_ROUTES[routeKey]?.protocols || 
         BRIDGE_ROUTES[reverseRouteKey]?.protocols || 
         [];
};

const getPreferredProtocol = (fromChain, toChain) => {
  const routeKey = `${fromChain}-${toChain}`;
  const reverseRouteKey = `${toChain}-${fromChain}`;
  
  return BRIDGE_ROUTES[routeKey]?.preferredProtocol || 
         BRIDGE_ROUTES[reverseRouteKey]?.preferredProtocol || 
         BRIDGE_PROTOCOLS.LAYERZERO;
};

const getBridgeRoute = (fromChain, toChain) => {
  const routeKey = `${fromChain}-${toChain}`;
  const reverseRouteKey = `${toChain}-${fromChain}`;
  
  return BRIDGE_ROUTES[routeKey] || BRIDGE_ROUTES[reverseRouteKey] || null;
};

const isBridgeSupported = (fromChain, toChain, protocol) => {
  const supportedProtocols = getSupportedProtocols(fromChain, toChain);
  return supportedProtocols.includes(protocol);
};

const isDeploymentSupported = (deploymentType, chains) => {
  const templateRoute = getTemplateRoute(deploymentType);
  if (!templateRoute) return false;
  
  return chains.every(chain => 
    templateRoute.chainConfigurations[chain] !== undefined
  );
};

const getBridgeLimits = (protocol, token) => {
  const config = getBridgeConfig(protocol);
  return {
    ...config.limits,
    token: token || 'native'
  };
};

const getBridgeFees = (protocol) => {
  const config = getBridgeConfig(protocol);
  return config.fees;
};

const getContractAddress = (protocol, chain, contractType) => {
  const config = getBridgeConfig(protocol);
  return config.contracts[chain]?.[contractType];
};

const getAbiPath = (protocol, contractType) => {
  const config = getBridgeConfig(protocol);
  return config.abis?.[contractType];
};

const validateBridgeTransaction = (fromChain, toChain, amount, protocol) => {
  const errors = [];
  
  // Check if route is supported
  if (!isBridgeSupported(fromChain, toChain, protocol)) {
    errors.push(`Bridge route ${fromChain} -> ${toChain} not supported for ${protocol}`);
  }
  
  // Check amount limits
  const limits = getBridgeLimits(protocol);
  if (parseFloat(amount) < parseFloat(limits.minAmount)) {
    errors.push(`Amount below minimum limit of ${limits.minAmount}`);
  }
  if (parseFloat(amount) > parseFloat(limits.maxAmount)) {
    errors.push(`Amount exceeds maximum limit of ${limits.maxAmount}`);
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

const validateDeploymentRequest = (deploymentType, chains, parameters) => {
  const errors = [];
  
  // Check if deployment type is supported
  const deploymentConfig = getDeploymentConfig(deploymentType);
  if (!deploymentConfig) {
    errors.push(`Deployment type ${deploymentType} not supported`);
    return { isValid: false, errors };
  }
  
  // Check if all chains are supported
  if (!isDeploymentSupported(deploymentType, chains)) {
    errors.push(`Deployment type ${deploymentType} not supported on all requested chains`);
  }
  
  // Validate required parameters
  const requiredParams = deploymentConfig.parameters;
  const providedParams = Object.keys(parameters);
  const missingParams = requiredParams.filter(param => !providedParams.includes(param));
  
  if (missingParams.length > 0) {
    errors.push(`Missing required parameters: ${missingParams.join(', ')}`);
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    config: deploymentConfig
  };
};

const estimateBridgeTime = (fromChain, toChain) => {
  const route = getBridgeRoute(fromChain, toChain);
  return route?.estimatedTime || '10-30 minutes';
};

const estimateBridgeCost = (fromChain, toChain) => {
  const route = getBridgeRoute(fromChain, toChain);
  return route?.cost || 'medium';
};

const estimateDeploymentTime = (deploymentType, chainCount) => {
  const baseTime = 10; // minutes per chain
  const complexityMultiplier = {
    [DEPLOYMENT_TYPES.ERC20]: 1,
    [DEPLOYMENT_TYPES.MINTABLE_TOKEN]: 1.2,
    [DEPLOYMENT_TYPES.OFT]: 1.5,
    [DEPLOYMENT_TYPES.OFT_ADAPTER]: 1.3,
    [DEPLOYMENT_TYPES.GOVERNANCE_TOKEN]: 2,
    [DEPLOYMENT_TYPES.CUSTOM_BRIDGE]: 3
  };
  
  const multiplier = complexityMultiplier[deploymentType] || 1;
  const totalTime = Math.ceil(baseTime * chainCount * multiplier);
  
  return `${totalTime}-${totalTime + 10} minutes`;
};

const getDeploymentStrategy = (chainCount) => {
  if (chainCount <= 2) return MULTI_CHAIN_DEPLOYMENT_CONFIG.strategies.PARALLEL;
  if (chainCount <= 4) return MULTI_CHAIN_DEPLOYMENT_CONFIG.strategies.BATCH;
  return MULTI_CHAIN_DEPLOYMENT_CONFIG.strategies.SEQUENTIAL;
};

// Export configuration and utilities
module.exports = {
  // Core configurations
  BRIDGE_PROTOCOLS,
  BRIDGE_STATUS,
  DEPLOYMENT_TYPES,
  BRIDGE_CONFIGS,
  DEPLOYMENT_BRIDGE_CONFIGS,
  TEMPLATE_BRIDGE_ROUTES,
  MULTI_CHAIN_DEPLOYMENT_CONFIG,
  VERIFICATION_BRIDGE_CONFIG,
  BRIDGE_ROUTES,
  SECURITY_CONFIG,
  BRIDGE_MANAGER_CONFIG,
  INTEGRATION_PATHS,
  
  // Utility functions
  getBridgeConfig,
  getDeploymentConfig,
  getTemplateRoute,
  getSupportedProtocols,
  getPreferredProtocol,
  getBridgeRoute,
  isBridgeSupported,
  isDeploymentSupported,
  getBridgeLimits,
  getBridgeFees,
  getContractAddress,
  getAbiPath,
  validateBridgeTransaction,
  validateDeploymentRequest,
  estimateBridgeTime,
  estimateBridgeCost,
  estimateDeploymentTime,
  getDeploymentStrategy
};
// Bridge Protocol Types
const BRIDGE_PROTOCOLS = {
  LAYERZERO: 'layerzero',
  WORMHOLE: 'wormhole',
  AXELAR: 'axelar',
  HYPERLANE: 'hyperlane',
  CHAINLINK_CCIP: 'chainlink-ccip',
  HOP: 'hop',
  ACROSS: 'across',
  CROSSCHAIN_USDT: 'crosschain-usdt',
  // NEW: Deployment-specific protocols
  DEPLOYMENT_BRIDGE: 'deployment-bridge',
  TEMPLATE_BRIDGE: 'template-bridge'
};

// Bridge Status Types
const BRIDGE_STATUS = {
  PENDING: 'pending',
  CONFIRMING: 'confirming',
  BRIDGING: 'bridging',
  COMPLETED: 'completed',
  FAILED: 'failed',
  EXPIRED: 'expired',
  // NEW: Deployment-specific statuses
  COMPILING: 'compiling',
  DEPLOYING: 'deploying',
  VERIFYING: 'verifying',
  CONFIGURING: 'configuring'
};

// NEW: Deployment Types
const DEPLOYMENT_TYPES = {
  OFT: 'oft',
  OFT_ADAPTER: 'oft-adapter',
  ERC20: 'erc20',
  MINTABLE_TOKEN: 'mintable-token',
  GOVERNANCE_TOKEN: 'governance-token',
  CUSTOM_BRIDGE: 'custom-bridge'
};

// Bridge Configuration per Protocol
const BRIDGE_CONFIGS = {
  [BRIDGE_PROTOCOLS.LAYERZERO]: {
    name: 'LayerZero',
    version: 'v2',
    enabled: true,
    icon: '/images/bridges/layerzero-bridge-64.png',
    description: 'Ultra-light cross-chain protocol',
    
    // Protocol specific settings
    settings: {
      gasLimit: 200000,
      adapterParams: '0x00010000000000000000000000000000000000000000000000000000000000030d40',
      confirmations: {
        ethereum: 15,
        bsc: 20,
        polygon: 200,
        arbitrum: 1,
        optimism: 1,
        avalanche: 1
      }
    },
    
    // Supported chains
    supportedChains: ['ethereum', 'bsc', 'polygon', 'arbitrum', 'optimism', 'avalanche'],
    
    // CORRECTED: Contract addresses per chain
    contracts: {
      ethereum: {
        endpoint: '0x1a44076050125825900e736c501f859c50fE728c',
        oft: '0x6985884C4392D348587B19cb9eAAf157F13271cd', // CORRECTED
        adapter: '0x211Cc4DD073734dA055fbF44a2b4667d5E5fE5d2',
        bridge: '0x8C0479c5173DdD98A22d283233f86189CCb7C027'
      },
      bsc: {
        endpoint: '0x1a44076050125825900e736c501f859c50fE728c',
        oft: '0x6985884C4392D348587B19cb9eAAf157F13271cd',
        adapter: '0x211Cc4DD073734dA055fbF44a2b4667d5E5fE5d2',
        bridge: '0x8C0479c5173DdD98A22d283233f86189CCb7C027'
      },
      polygon: {
        endpoint: '0x1a44076050125825900e736c501f859c50fE728c',
        oft: '0x6985884C4392D348587B19cb9eAAf157F13271cd',
        adapter: '0x211Cc4DD073734dA055fbF44a2b4667d5E5fE5d2',
        bridge: '0x8C0479c5173DdD98A22d283233f86189CCb7C027'
      },
      arbitrum: {
        endpoint: '0x1a44076050125825900e736c501f859c50fE728c',
        oft: '0x6985884C4392D348587B19cb9eAAf157F13271cd',
        adapter: '0x211Cc4DD073734dA055fbF44a2b4667d5E5fE5d2',
        bridge: '0x8C0479c5173DdD98A22d283233f86189CCb7C027'
      },
      optimism: {
        endpoint: '0x1a44076050125825900e736c501f859c50fE728c',
        oft: '0x6985884C4392D348587B19cb9eAAf157F13271cd',
        adapter: '0x211Cc4DD073734dA055fbF44a2b4667d5E5fE5d2',
        bridge: '0x8C0479c5173DdD98A22d283233f86189CCb7C027'
      },
      avalanche: {
        endpoint: '0x1a44076050125825900e736c501f859c50fE728c',
        oft: '0x6985884C4392D348587B19cb9eAAf157F13271cd',
        adapter: '0x211Cc4DD073734dA055fbF44a2b4667d5E5fE5d2',
        bridge: '0x8C0479c5173DdD98A22d283233f86189CCb7C027'
      }
    },
    
    // NEW: ABI specifications
    abis: {
      endpoint: 'src/bridges/abis/layerzero/v2/LayerZeroV2Endpoint.json',
      oft: 'src/bridges/abis/layerzero/v2/LayerZeroV2OFT.json',
      adapter: 'src/bridges/abis/layerzero/v2/LayerZeroV2Adapter.json',
      bridge: 'src/bridges/abis/bridges/LayerZeroTokenBridge.json'
    },
    
    // Fee structure
    fees: {
      baseFee: '0.001',
      dynamicFee: true,
      feeToken: 'native',
      minFee: '0.0001',
      maxFee: '0.01'
    },
    
    // Bridge limits
    limits: {
      minAmount: '0.001',
      maxAmount: '1000000',
      dailyLimit: '10000000'
    }
  },

  [BRIDGE_PROTOCOLS.WORMHOLE]: {
    name: 'Wormhole',
    version: 'v3',
    enabled: true,
    icon: '/images/bridges/wormhole-bridge-64.png',
    description: 'Secure cross-chain communication protocol',
    
    settings: {
      gasLimit: 300000,
      consistency: 200,
      confirmations: {
        ethereum: 15,
        bsc: 15,
        polygon: 512,
        arbitrum: 1,
        optimism: 1,
        avalanche: 1
      }
    },
    
    supportedChains: ['ethereum', 'bsc', 'polygon', 'arbitrum', 'optimism', 'avalanche'],
    
    contracts: {
      ethereum: {
        core: '0x98f3c9e6E3fAce36bAAd05FE09d375Ef1464288B',
        tokenBridge: '0x381752f5458282d317d12C30D2Bd4D6E1FD8841e'
      },
      bsc: {
        core: '0x98f3c9e6E3fAce36bAAd05FE09d375Ef1464288B',
        tokenBridge: '0x381752f5458282d317d12C30D2Bd4D6E1FD8841e'
      },
      polygon: {
        core: '0x98f3c9e6E3fAce36bAAd05FE09d375Ef1464288B',
        tokenBridge: '0x381752f5458282d317d12C30D2Bd4D6E1FD8841e'
      },
      arbitrum: {
        core: '0x98f3c9e6E3fAce36bAAd05FE09d375Ef1464288B',
        tokenBridge: '0x381752f5458282d317d12C30D2Bd4D6E1FD8841e'
      },
      optimism: {
        core: '0x98f3c9e6E3fAce36bAAd05FE09d375Ef1464288B',
        tokenBridge: '0x381752f5458282d317d12C30D2Bd4D6E1FD8841e'
      },
      avalanche: {
        core: '0x98f3c9e6E3fAce36bAAd05FE09d375Ef1464288B',
        tokenBridge: '0x381752f5458282d317d12C30D2Bd4D6E1FD8841e'
      }
    },
    
    abis: {
      core: 'src/bridges/abis/bridges/WormholeTokenBridge.json',
      tokenBridge: 'src/bridges/abis/bridges/WormholeTokenBridge.json'
    },
    
    fees: {
      baseFee: '0.002',
      dynamicFee: true,
      feeToken: 'native',
      minFee: '0.0002',
      maxFee: '0.02'
    },
    
    limits: {
      minAmount: '0.01',
      maxAmount: '500000',
      dailyLimit: '5000000'
    }
  },

  [BRIDGE_PROTOCOLS.CHAINLINK_CCIP]: {
    name: 'Chainlink CCIP',
    version: 'v1.2',
    enabled: true,
    icon: '/images/bridges/chainlink-bridge-64.png',
    description: 'Chainlink Cross-Chain Interoperability Protocol',
    
    settings: {
      gasLimit: 400000,
      destinationGasLimit: 200000,
      confirmations: {
        ethereum: 20,
        bsc: 10,
        polygon: 200,
        arbitrum: 1,
        optimism: 1,
        avalanche: 1
      }
    },
    
    supportedChains: ['ethereum', 'bsc', 'polygon', 'arbitrum', 'optimism', 'avalanche'],
    
    contracts: {
      ethereum: {
        router: '0x80226fc0ee2b096224eeac085bb9a8cba1146f7d',
        bridge: '0x80226fc0ee2b096224eeac085bb9a8cba1146f7d'
      },
      bsc: {
        router: '0x80226fc0ee2b096224eeac085bb9a8cba1146f7d',
        bridge: '0x80226fc0ee2b096224eeac085bb9a8cba1146f7d'
      },
      polygon: {
        router: '0x80226fc0ee2b096224eeac085bb9a8cba1146f7d',
        bridge: '0x80226fc0ee2b096224eeac085bb9a8cba1146f7d'
      },
      arbitrum: {
        router: '0x80226fc0ee2b096224eeac085bb9a8cba1146f7d',
        bridge: '0x80226fc0ee2b096224eeac085bb9a8cba1146f7d'
      },
      optimism: {
        router: '0x80226fc0ee2b096224eeac085bb9a8cba1146f7d',
        bridge: '0x80226fc0ee2b096224eeac085bb9a8cba1146f7d'
      },
      avalanche: {
        router: '0x80226fc0ee2b096224eeac085bb9a8cba1146f7d',
        bridge: '0x80226fc0ee2b096224eeac085bb9a8cba1146f7d'
      }
    },
    
    abis: {
      router: 'src/bridges/abis/bridges/CCIPBridge.json',
      bridge: 'src/bridges/abis/bridges/CCIPBridge.json'
    },
    
    fees: {
      baseFee: '0.003',
      dynamicFee: true,
      feeToken: 'LINK',
      minFee: '0.0003',
      maxFee: '0.03'
    },
    
    limits: {
      minAmount: '0.01',
      maxAmount: '100000',
      dailyLimit: '1000000'
    }
  },

  [BRIDGE_PROTOCOLS.CROSSCHAIN_USDT]: {
    name: 'CrossChain USDT',
    version: 'v1.0',
    enabled: true,
    icon: '/images/tokens/crosschain-usdt.png',
    description: 'Custom CrossChain USDT Bridge',
    
    settings: {
      gasLimit: 250000,
      bridgeTimeout: 3600,
      confirmations: {
        ethereum: 12,
        bsc: 15,
        polygon: 128,
        arbitrum: 1,
        optimism: 1,
        avalanche: 1
      }
    },
    
    supportedChains: ['ethereum', 'bsc', 'polygon', 'arbitrum', 'optimism', 'avalanche'],
    
    contracts: {
      ethereum: {
        bridge: '0xcc1b99dDAc1a33c201a742A1851662E87BC7f22C',
        token: '0xcc1b99dDAc1a33c201a742A1851662E87BC7f22C'
      },
      bsc: {
        bridge: '0xcc1b99dDAc1a33c201a742A1851662E87BC7f22C',
        token: '0xcc1b99dDAc1a33c201a742A1851662E87BC7f22C'
      },
      polygon: {
        bridge: '0xcc1b99dDAc1a33c201a742A1851662E87BC7f22C',
        token: '0xcc1b99dDAc1a33c201a742A1851662E87BC7f22C'
      },
      arbitrum: {
        bridge: '0xcc1b99dDAc1a33c201a742A1851662E87BC7f22C',
        token: '0xcc1b99dDAc1a33c201a742A1851662E87BC7f22C'
      },
      optimism: {
        bridge: '0xcc1b99dDAc1a33c201a742A1851662E87BC7f22C',
        token: '0xcc1b99dDAc1a33c201a742A1851662E87BC7f22C'
      },
      avalanche: {
        bridge: '0xcc1b99dDAc1a33c201a742A1851662E87BC7f22C',
        token: '0xcc1b99dDAc1a33c201a742A1851662E87BC7f22C'
      }
    },
    
    abis: {
      bridge: 'src/bridges/abis/bridges/crosschain-usdt-bridge.json',
      token: 'src/bridges/abis/tokens/CrossChainUSDT.json'
    },
    
    fees: {
      baseFee: '0.0005',
      dynamicFee: false,
      feeToken: 'native',
      minFee: '0.0001',
      maxFee: '0.005'
    },
    
    limits: {
      minAmount: '1',
      maxAmount: '1000000',
      dailyLimit: '10000000'
    }
  }
};

// NEW: Contract Deployment Bridge Configurations
const DEPLOYMENT_BRIDGE_CONFIGS = {
  [BRIDGE_PROTOCOLS.DEPLOYMENT_BRIDGE]: {
    name: 'Multi-Chain Deployment Bridge',
    version: 'v1.0',
    enabled: true,
    icon: '/images/templates/deployment-bridge-64.png',
    description: 'Orchestrates cross-chain contract deployments',
    
    settings: {
      gasLimit: 8000000, // Higher for contract deployments
      deploymentTimeout: 7200, // 2 hours
      verificationTimeout: 3600, // 1 hour
      confirmations: {
        ethereum: 5,  // Lower for deployments
        bsc: 10,
        polygon: 50,
        arbitrum: 1,
        optimism: 1,
        avalanche: 1
      }
    },
    
    supportedChains: ['ethereum', 'bsc', 'polygon', 'arbitrum', 'optimism', 'avalanche'],
    
    // Deployment-specific contract addresses
    contracts: {
      ethereum: {
        deployer: '0xDeployerContractAddress',
        factory: '0xFactoryContractAddress',
        registry: '0xRegistryContractAddress'
      },
      bsc: {
        deployer: '0xDeployerContractAddress',
        factory: '0xFactoryContractAddress',
        registry: '0xRegistryContractAddress'
      },
      // ... other chains
    },
    
    abis: {
      deployer: 'src/contracts/deployment/ContractDeployer.json',
      factory: 'src/contracts/deployment/ContractFactory.json',
      registry: 'src/contracts/deployment/ContractRegistry.json'
    },
    
    // Template support
    templates: {
      [DEPLOYMENT_TYPES.OFT]: {
        template: 'src/contracts/templates/layerzero/OFT.sol',
        parameters: ['name', 'symbol', 'delegate', 'endpoint'],
        gasLimit: 3000000
      },
      [DEPLOYMENT_TYPES.OFT_ADAPTER]: {
        template: 'src/contracts/templates/layerzero/OFTAdapter.sol',
        parameters: ['token', 'delegate', 'endpoint'],
        gasLimit: 2500000
      },
      [DEPLOYMENT_TYPES.ERC20]: {
        template: 'src/contracts/templates/erc20/StandardToken.sol',
        parameters: ['name', 'symbol', 'decimals', 'initialSupply'],
        gasLimit: 2000000
      },
      [DEPLOYMENT_TYPES.MINTABLE_TOKEN]: {
        template: 'src/contracts/templates/erc20/MintableToken.sol',
        parameters: ['name', 'symbol', 'decimals', 'owner'],
        gasLimit: 2200000
      },
      [DEPLOYMENT_TYPES.GOVERNANCE_TOKEN]: {
        template: 'src/contracts/templates/erc20/GovernanceToken.sol',
        parameters: ['name', 'symbol', 'decimals', 'initialSupply', 'votingDelay', 'votingPeriod'],
        gasLimit: 4000000
      }
    },
    
    fees: {
      baseFee: '0.01', // Higher for deployments
      dynamicFee: true,
      feeToken: 'native',
      minFee: '0.005',
      maxFee: '0.1'
    },
    
    limits: {
      maxConcurrentDeployments: 5,
      maxChainsPerDeployment: 7,
      deploymentTimeout: 7200
    }
  }
};

// NEW: Template-Specific Bridge Routes
const TEMPLATE_BRIDGE_ROUTES = {
  // OFT Template Routes
  'oft-deployment': {
    protocols: [BRIDGE_PROTOCOLS.DEPLOYMENT_BRIDGE, BRIDGE_PROTOCOLS.LAYERZERO],
    preferredProtocol: BRIDGE_PROTOCOLS.DEPLOYMENT_BRIDGE,
    requiredContracts: ['LayerZero Endpoint'],
    estimatedTime: '15-30 minutes',
    cost: 'high',
    
    chainConfigurations: {
      ethereum: {
        endpointId: 101,
        gasLimit: 3000000,
        verificationRequired: true
      },
      bsc: {
        endpointId: 102,
        gasLimit: 2500000,
        verificationRequired: true
      },
      polygon: {
        endpointId: 109,
        gasLimit: 2000000,
        verificationRequired: true
      },
      arbitrum: {
        endpointId: 110,
        gasLimit: 2500000,
        verificationRequired: true
      },
      optimism: {
        endpointId: 111,
        gasLimit: 2500000,
        verificationRequired: true
      },
      avalanche: {
        endpointId: 106,
        gasLimit: 2000000,
        verificationRequired: true
      }
    }
  },
  
  // ERC20 Template Routes
  'erc20-deployment': {
    protocols: [BRIDGE_PROTOCOLS.DEPLOYMENT_BRIDGE],
    preferredProtocol: BRIDGE_PROTOCOLS.DEPLOYMENT_BRIDGE,
    requiredContracts: [],
    estimatedTime: '10-20 minutes',
    cost: 'medium',
    
    chainConfigurations: {
      ethereum: {
        gasLimit: 2000000,
        verificationRequired: true
      },
      bsc: {
        gasLimit: 1500000,
        verificationRequired: true
      },
      polygon: {
        gasLimit: 1200000,
        verificationRequired: true
      },
      arbitrum: {
        gasLimit: 1500000,
        verificationRequired: true
      },
      optimism: {
        gasLimit: 1500000,
        verificationRequired: true
      },
      avalanche: {
        gasLimit: 1200000,
        verificationRequired: true
      }
    }
  },
  
  // Governance Token Routes
  'governance-deployment': {
    protocols: [BRIDGE_PROTOCOLS.DEPLOYMENT_BRIDGE],
    preferredProtocol: BRIDGE_PROTOCOLS.DEPLOYMENT_BRIDGE,
    requiredContracts: [],
    estimatedTime: '20-40 minutes',
    cost: 'high',
    
    chainConfigurations: {
      ethereum: {
        gasLimit: 4000000,
        verificationRequired: true,
        governanceSetup: true
      },
      bsc: {
        gasLimit: 3500000,
        verificationRequired: true,
        governanceSetup: true
      },
      polygon: {
        gasLimit: 3000000,
        verificationRequired: true,
        governanceSetup: true
      }
    }
  }
};

// NEW: Multi-Chain Deployment Orchestration
const MULTI_CHAIN_DEPLOYMENT_CONFIG = {
  // Deployment strategies
  strategies: {
    SEQUENTIAL: {
      name: 'Sequential Deployment',
      description: 'Deploy on chains one by one',
      maxConcurrency: 1,
      failureHandling: 'stop',
      estimatedTime: 'long',
      reliability: 'high'
    },
    PARALLEL: {
      name: 'Parallel Deployment',
      description: 'Deploy on multiple chains simultaneously',
      maxConcurrency: 3,
      failureHandling: 'continue',
      estimatedTime: 'medium',
      reliability: 'medium'
    },
    BATCH: {
      name: 'Batch Deployment',
      description: 'Deploy in batches of chains',
      maxConcurrency: 2,
      failureHandling: 'retry',
      estimatedTime: 'medium',
      reliability: 'high'
    }
  },
  
  // Chain deployment priorities
  deploymentPriorities: {
    ethereum: 1,    // Deploy first (main chain)
    bsc: 2,         // Deploy second
    polygon: 3,     // Deploy third
    arbitrum: 4,    // Deploy fourth
    optimism: 5,    // Deploy fifth
    avalanche: 6    // Deploy sixth
  },
  
  // Cross-chain configuration setup
  crossChainSetup: {
    layerZero: {
      trustedRemotes: {
        setupRequired: true,
        batchSize: 3,
        confirmationsRequired: 2
      },
      peerConfigurations: {
        setupRequired: true,
        validationRequired: true
      }
    },
    
    verification: {
      parallel: true,
      maxRetries: 3,
      timeout: 300000 // 5 minutes per chain
    }
  },
  
  // Deployment tracking
  tracking: {
    statusUpdates: true,
    progressReporting: true,
    failureAlerts: true,
    completionNotifications: true
  }
};

// NEW: Verification Bridge Configuration
const VERIFICATION_BRIDGE_CONFIG = {
  // Verification providers per chain
  providers: {
    ethereum: {
      etherscan: {
        apiUrl: 'https://api.etherscan.io/api',
        apiKey: process.env.ETHERSCAN_API_KEY,
        enabled: true
      }
    },
    bsc: {
      bscscan: {
        apiUrl: 'https://api.bscscan.com/api',
        apiKey: process.env.BSCSCAN_API_KEY,
        enabled: true
      }
    },
    polygon: {
      polygonscan: {
        apiUrl: 'https://api.polygonscan.com/api',
        apiKey: process.env.POLYGONSCAN_API_KEY,
        enabled: true
      }
    },
    arbitrum: {
      arbiscan: {
        apiUrl: 'https://api.arbiscan.io/api',
        apiKey: process.env.ARBISCAN_API_KEY,
        enabled: true
      }
    },
    optimism: {
      optimisticEtherscan: {
        apiUrl: 'https://api-optimistic.etherscan.io/api',
        apiKey: process.env.OPTIMISTIC_ETHERSCAN_API_KEY,
        enabled: true
      }
    },
    avalanche: {
      snowtrace: {
        apiUrl: 'https://api.snowtrace.io/api',
        apiKey: process.env.SNOWTRACE_API_KEY,
        enabled: true
      }
    }
  },
  
  // Verification settings
  settings: {
    autoVerify: true,
    maxRetries: 3,
    retryDelay: 30000, // 30 seconds
    timeout: 300000,   // 5 minutes
    batchVerification: true
  }
};

// Enhanced Route Configuration
const BRIDGE_ROUTES = {
  // Standard bridging routes
  'ethereum-bsc': {
    protocols: [BRIDGE_PROTOCOLS.LAYERZERO, BRIDGE_PROTOCOLS.WORMHOLE, BRIDGE_PROTOCOLS.CROSSCHAIN_USDT],
    preferredProtocol: BRIDGE_PROTOCOLS.LAYERZERO,
    estimatedTime: '5-15 minutes',
    cost: 'medium'
  },
  'ethereum-polygon': {
    protocols: [BRIDGE_PROTOCOLS.LAYERZERO, BRIDGE_PROTOCOLS.WORMHOLE, BRIDGE_PROTOCOLS.CHAINLINK_CCIP],
    preferredProtocol: BRIDGE_PROTOCOLS.LAYERZERO,
    estimatedTime: '5-20 minutes',
    cost: 'medium'
  },
  'ethereum-arbitrum': {
    protocols: [BRIDGE_PROTOCOLS.LAYERZERO, BRIDGE_PROTOCOLS.WORMHOLE, BRIDGE_PROTOCOLS.CHAINLINK_CCIP],
    preferredProtocol: BRIDGE_PROTOCOLS.LAYERZERO,
    estimatedTime: '2-10 minutes',
    cost: 'low'
  },
  'ethereum-optimism': {
    protocols: [BRIDGE_PROTOCOLS.LAYERZERO, BRIDGE_PROTOCOLS.WORMHOLE, BRIDGE_PROTOCOLS.CHAINLINK_CCIP],
    preferredProtocol: BRIDGE_PROTOCOLS.LAYERZERO,
    estimatedTime: '2-10 minutes',
    cost: 'low'
  },
  'ethereum-avalanche': {
    protocols: [BRIDGE_PROTOCOLS.LAYERZERO, BRIDGE_PROTOCOLS.WORMHOLE, BRIDGE_PROTOCOLS.CHAINLINK_CCIP],
    preferredProtocol: BRIDGE_PROTOCOLS.LAYERZERO,
    estimatedTime: '5-15 minutes',
    cost: 'medium'
  },
  
  // Additional cross-chain routes
  'bsc-polygon': {
    protocols: [BRIDGE_PROTOCOLS.LAYERZERO, BRIDGE_PROTOCOLS.WORMHOLE, BRIDGE_PROTOCOLS.CROSSCHAIN_USDT],
    preferredProtocol: BRIDGE_PROTOCOLS.LAYERZERO,
    estimatedTime: '3-10 minutes',
    cost: 'low'
  },
  'bsc-arbitrum': {
    protocols: [BRIDGE_PROTOCOLS.LAYERZERO, BRIDGE_PROTOCOLS.WORMHOLE],
    preferredProtocol: BRIDGE_PROTOCOLS.LAYERZERO,
    estimatedTime: '5-15 minutes',
    cost: 'medium'
  },
  'bsc-optimism': {
    protocols: [BRIDGE_PROTOCOLS.LAYERZERO, BRIDGE_PROTOCOLS.WORMHOLE],
    preferredProtocol: BRIDGE_PROTOCOLS.LAYERZERO,
    estimatedTime: '5-15 minutes',
    cost: 'medium'
  },
  'bsc-avalanche': {
    protocols: [BRIDGE_PROTOCOLS.LAYERZERO, BRIDGE_PROTOCOLS.WORMHOLE, BRIDGE_PROTOCOLS.CROSSCHAIN_USDT],
    preferredProtocol: BRIDGE_PROTOCOLS.LAYERZERO,
    estimatedTime: '3-10 minutes',
    cost: 'low'
  },
  'polygon-arbitrum': {
    protocols: [BRIDGE_PROTOCOLS.LAYERZERO, BRIDGE_PROTOCOLS.WORMHOLE, BRIDGE_PROTOCOLS.CHAINLINK_CCIP],
    preferredProtocol: BRIDGE_PROTOCOLS.LAYERZERO,
    estimatedTime: '5-15 minutes',
    cost: 'medium'
  },
  'polygon-optimism': {
    protocols: [BRIDGE_PROTOCOLS.LAYERZERO, BRIDGE_PROTOCOLS.WORMHOLE, BRIDGE_PROTOCOLS.CHAINLINK_CCIP],
    preferredProtocol: BRIDGE_PROTOCOLS.LAYERZERO,
    estimatedTime: '5-15 minutes',
    cost: 'medium'
  },
  'polygon-avalanche': {
    protocols: [BRIDGE_PROTOCOLS.LAYERZERO, BRIDGE_PROTOCOLS.WORMHOLE, BRIDGE_PROTOCOLS.CROSSCHAIN_USDT],
    preferredProtocol: BRIDGE_PROTOCOLS.LAYERZERO,
    estimatedTime: '5-15 minutes',
    cost: 'medium'
  },
  'arbitrum-optimism': {
    protocols: [BRIDGE_PROTOCOLS.LAYERZERO, BRIDGE_PROTOCOLS.WORMHOLE],
    preferredProtocol: BRIDGE_PROTOCOLS.LAYERZERO,
    estimatedTime: '2-8 minutes',
    cost: 'low'
  },

  // NEW: Deployment routes
  'multi-chain-deployment': {
    protocols: [BRIDGE_PROTOCOLS.DEPLOYMENT_BRIDGE],
    preferredProtocol: BRIDGE_PROTOCOLS.DEPLOYMENT_BRIDGE,
    estimatedTime: '30-60 minutes',
    cost: 'very-high',
    supportedChains: ['ethereum', 'bsc', 'polygon', 'arbitrum', 'optimism', 'avalanche']
  }
};

// Security Configuration
const SECURITY_CONFIG = {
  // Transaction validation
  validation: {
    requireSignature: true,
    requireApproval: true,
    maxSlippage: 0.05, // 5%
    minConfirmations: {
      ethereum: 12,
      bsc: 15,
      polygon: 128,
      arbitrum: 1,
      optimism: 1,
      avalanche: 1,
      fantom: 1
    }
  },

  // Risk management
  riskManagement: {
    maxTransactionValue: '100000', // USD
    dailyTransactionLimit: '1000000', // USD
    suspiciousActivityDetection: true,
    blacklistCheck: true,
    amlCompliance: true
  },

  // NEW: Deployment security
  deploymentSecurity: {
    codeValidation: true,
    templateValidation: true,
    parameterValidation: true,
    gasLimitValidation: true,
    contractSizeLimit: 24576, // 24KB
    maxInitCodeSize: 49152,   // 48KB
    requireTestnetValidation: false // Set to true for production
  },

  // Security features
  features: {
    pauseEmergency: true,
    upgradeability: false,
    timelock: 86400, // 24 hours
    multisig: true,
    rateLimiting: true
  }
};

// Bridge Manager Configuration
const BRIDGE_MANAGER_CONFIG = {
  // Default settings
  defaults: {
    protocol: BRIDGE_PROTOCOLS.LAYERZERO,
    slippage: 0.005, // 0.5%
    deadline: 1800, // 30 minutes
    gasMultiplier: 1.2
  },

  // Monitoring settings
  monitoring: {
    pollInterval: 10000, // 10 seconds
    maxRetries: 3,
    timeoutMs: 300000, // 5 minutes
    alertThresholds: {
      highGas: 100, // gwei
      longDelay: 1800, // 30 minutes
      failureRate: 0.1 // 10%
    }
  },

  // Error handling
  errorHandling: {
    retryOnFailure: true,
    fallbackProtocol: true,
    autoRefund: true,
    maxRetryAttempts: 3,
    retryDelay: 30000 // 30 seconds
  },

  // NEW: Deployment management
  deploymentManagement: {
    maxConcurrentDeployments: 5,
    deploymentQueue: true,
    progressTracking: true,
    rollbackSupport: true,
    verificationQueue: true
  }
};

// Enhanced Integration paths with application components
const INTEGRATION_PATHS = {
  // Services integration
  services: {
    bridgeService: 'src/services/BridgeService.js',
    crossChainService: 'src/services/CrossChainService.js',
    contractDeploymentService: 'src/services/ContractDeploymentService.js',
    templateService: 'src/services/TemplateService.js',
    compilationService: 'src/services/CompilationService.js',
    verificationService: 'src/services/VerificationService.js'
  },

  // Components integration  
  components: {
    bridgeSelector: 'src/ui/components/bridge/BridgeSelector.js',
    routeDisplay: 'src/ui/components/bridge/RouteDisplay.js',
    bridgeStatus: 'src/ui/components/bridge/BridgeStatus.js',
    crossChainProgress: 'src/ui/components/bridge/CrossChainProgress.js',
    // NEW: Deployment components
    tokenCreator: 'src/ui/components/deployment/TokenCreator.js',
    templateSelector: 'src/ui/components/deployment/TemplateSelector.js',
    deploymentProgress: 'src/ui/components/deployment/DeploymentProgress.js',
    deploymentWizard: 'src/ui/components/deployment/DeploymentWizard.js',
    deployedContracts: 'src/ui/components/deployment/DeployedContracts.js'
  },

  // Utils integration
  utils: {
    bridgeUtils: 'src/utils/bridgeUtils.js',
    crossChainUtils: 'src/utils/crossChainUtils.js',
    addressUtils: 'src/utils/addressUtils.js',
    // NEW: Deployment utils
    contractUtils: 'src/utils/contractUtils.js',
    templateUtils: 'src/utils/templateUtils.js',
    deploymentUtils: 'src/utils/deploymentUtils.js',
    compilationUtils: 'src/utils/compilationUtils.js',
    verificationUtils: 'src/utils/verificationUtils.js'
  },

  // Storage integration
  storage: {
    bridgeStorage: 'src/storage/BridgeStorage.js',
    contractStorage: 'src/storage/ContractStorage.js',
    templateStorage: 'src/storage/TemplateStorage.js',
    deploymentStorage: 'src/storage/DeploymentStorage.js',
    compilationStorage: 'src/storage/CompilationStorage.js'
  },

  // Hooks integration
  hooks: {
    useBridge: 'src/ui/hooks/useBridge.js',
    useBridgeConfig: 'src/ui/hooks/useBridgeConfig.js',
    useCrossChain: 'src/ui/hooks/useCrossChain.js',
    useBridgeValidation: 'src/ui/hooks/useBridgeValidation.js',
    useCrossChainUSDT: 'src/ui/hooks/useCrossChainUSDT.js',
    // NEW: Deployment hooks
    useContractDeployment: 'src/ui/hooks/useContractDeployment.js',
    useTemplateManagement: 'src/ui/hooks/useTemplateManagement.js',
    useMultiChainDeployment: 'src/ui/hooks/useMultiChainDeployment.js',
    useDeploymentTracking: 'src/ui/hooks/useDeploymentTracking.js',
    useContractPortfolio: 'src/ui/hooks/useContractPortfolio.js',
    useContractVerification: 'src/ui/hooks/useContractVerification.js'
  },

  // Contract ABIs integration
  abis: {
    layerzero: {
      v2: {
        endpoint: 'src/bridges/abis/layerzero/v2/LayerZeroV2Endpoint.json',
        oft: 'src/bridges/abis/layerzero/v2/LayerZeroV2OFT.json',
        adapter: 'src/bridges/abis/layerzero/v2/LayerZeroV2Adapter.json'
      }
    },
    bridges: {
      layerzero: 'src/bridges/abis/bridges/LayerZeroTokenBridge.json',
      wormhole: 'src/bridges/abis/bridges/WormholeTokenBridge.json',
      ccip: 'src/bridges/abis/bridges/CCIPBridge.json'
    },
    tokens: {
      crosschainUsdt: 'src/bridges/abis/tokens/CrossChainUSDT.json',
      erc20: 'src/bridges/abis/tokens/ERC20.json'
    },
    infrastructure: {
      axelarGateway: 'src/bridges/abis/infrastructure/AxelarGateway.json',
      mailbox: 'src/bridges/abis/infrastructure/Mailbox.json',
      chainlinkPriceFeed: 'src/bridges/abis/infrastructure/ChainlinkPriceFeed.json'
    }
  },

  // API endpoints
  api: {
    bridgeRoutes: 'pages/api/bridge-routes.js',
    bridgeStatus: 'pages/api/bridge-status.js',
    crossChainTransfer: 'pages/api/cross-chain-transfer.js',
    crosschainUsdt: 'pages/api/crosschain-usdt.js',
    // NEW: Deployment APIs
    compileContract: 'pages/api/compile-contract.js',
    deployContract: 'pages/api/deploy-contract.js',
    verifyContract: 'pages/api/verify-contract.js',
    deploymentStatus: 'pages/api/deployment-status.js',
    templateManagement: 'pages/api/template-management.js',
    contractPortfolio: 'pages/api/contract-portfolio.js',
    multiChainDeploy: 'pages/api/multi-chain-deploy.js'
  }
};

// Utility Functions
const getBridgeConfig = (protocol) => {
  if (BRIDGE_CONFIGS[protocol]) {
    return BRIDGE_CONFIGS[protocol];
  }
  if (DEPLOYMENT_BRIDGE_CONFIGS[protocol]) {
    return DEPLOYMENT_BRIDGE_CONFIGS[protocol];
  }
  throw new Error(`Bridge protocol ${protocol} not supported`);
};

const getDeploymentConfig = (deploymentType) => {
  const deploymentBridge = DEPLOYMENT_BRIDGE_CONFIGS[BRIDGE_PROTOCOLS.DEPLOYMENT_BRIDGE];
  return deploymentBridge?.templates[deploymentType];
};

const getTemplateRoute = (templateType) => {
  const routeKey = `${templateType}-deployment`;
  return TEMPLATE_BRIDGE_ROUTES[routeKey];
};

const getSupportedProtocols = (fromChain, toChain) => {
  const routeKey = `${fromChain}-${toChain}`;
  const reverseRouteKey = `${toChain}-${fromChain}`;
  
  return BRIDGE_ROUTES[routeKey]?.protocols || 
         BRIDGE_ROUTES[reverseRouteKey]?.protocols || 
         [];
};

const getPreferredProtocol = (fromChain, toChain) => {
  const routeKey = `${fromChain}-${toChain}`;
  const reverseRouteKey = `${toChain}-${fromChain}`;
  
  return BRIDGE_ROUTES[routeKey]?.preferredProtocol || 
         BRIDGE_ROUTES[reverseRouteKey]?.preferredProtocol || 
         BRIDGE_PROTOCOLS.LAYERZERO;
};

const getBridgeRoute = (fromChain, toChain) => {
  const routeKey = `${fromChain}-${toChain}`;
  const reverseRouteKey = `${toChain}-${fromChain}`;
  
  return BRIDGE_ROUTES[routeKey] || BRIDGE_ROUTES[reverseRouteKey] || null;
};

const isBridgeSupported = (fromChain, toChain, protocol) => {
  const supportedProtocols = getSupportedProtocols(fromChain, toChain);
  return supportedProtocols.includes(protocol);
};

const isDeploymentSupported = (deploymentType, chains) => {
  const templateRoute = getTemplateRoute(deploymentType);
  if (!templateRoute) return false;
  
  return chains.every(chain => 
    templateRoute.chainConfigurations[chain] !== undefined
  );
};

const getBridgeLimits = (protocol, token) => {
  const config = getBridgeConfig(protocol);
  return {
    ...config.limits,
    token: token || 'native'
  };
};

const getBridgeFees = (protocol) => {
  const config = getBridgeConfig(protocol);
  return config.fees;
};

const getContractAddress = (protocol, chain, contractType) => {
  const config = getBridgeConfig(protocol);
  return config.contracts[chain]?.[contractType];
};

const getAbiPath = (protocol, contractType) => {
  const config = getBridgeConfig(protocol);
  return config.abis?.[contractType];
};

const validateBridgeTransaction = (fromChain, toChain, amount, protocol) => {
  const errors = [];
  
  // Check if route is supported
  if (!isBridgeSupported(fromChain, toChain, protocol)) {
    errors.push(`Bridge route ${fromChain} -> ${toChain} not supported for ${protocol}`);
  }
  
  // Check amount limits
  const limits = getBridgeLimits(protocol);
  if (parseFloat(amount) < parseFloat(limits.minAmount)) {
    errors.push(`Amount below minimum limit of ${limits.minAmount}`);
  }
  if (parseFloat(amount) > parseFloat(limits.maxAmount)) {
    errors.push(`Amount exceeds maximum limit of ${limits.maxAmount}`);
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

const validateDeploymentRequest = (deploymentType, chains, parameters) => {
  const errors = [];
  
  // Check if deployment type is supported
  const deploymentConfig = getDeploymentConfig(deploymentType);
  if (!deploymentConfig) {
    errors.push(`Deployment type ${deploymentType} not supported`);
    return { isValid: false, errors };
  }
  
  // Check if all chains are supported
  if (!isDeploymentSupported(deploymentType, chains)) {
    errors.push(`Deployment type ${deploymentType} not supported on all requested chains`);
  }
  
  // Validate required parameters
  const requiredParams = deploymentConfig.parameters;
  const providedParams = Object.keys(parameters);
  const missingParams = requiredParams.filter(param => !providedParams.includes(param));
  
  if (missingParams.length > 0) {
    errors.push(`Missing required parameters: ${missingParams.join(', ')}`);
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    config: deploymentConfig
  };
};

const estimateBridgeTime = (fromChain, toChain) => {
  const route = getBridgeRoute(fromChain, toChain);
  return route?.estimatedTime || '10-30 minutes';
};

const estimateBridgeCost = (fromChain, toChain) => {
  const route = getBridgeRoute(fromChain, toChain);
  return route?.cost || 'medium';
};

const estimateDeploymentTime = (deploymentType, chainCount) => {
  const baseTime = 10; // minutes per chain
  const complexityMultiplier = {
    [DEPLOYMENT_TYPES.ERC20]: 1,
    [DEPLOYMENT_TYPES.MINTABLE_TOKEN]: 1.2,
    [DEPLOYMENT_TYPES.OFT]: 1.5,
    [DEPLOYMENT_TYPES.OFT_ADAPTER]: 1.3,
    [DEPLOYMENT_TYPES.GOVERNANCE_TOKEN]: 2,
    [DEPLOYMENT_TYPES.CUSTOM_BRIDGE]: 3
  };
  
  const multiplier = complexityMultiplier[deploymentType] || 1;
  const totalTime = Math.ceil(baseTime * chainCount * multiplier);
  
  return `${totalTime}-${totalTime + 10} minutes`;
};

const getDeploymentStrategy = (chainCount) => {
  if (chainCount <= 2) return MULTI_CHAIN_DEPLOYMENT_CONFIG.strategies.PARALLEL;
  if (chainCount <= 4) return MULTI_CHAIN_DEPLOYMENT_CONFIG.strategies.BATCH;
  return MULTI_CHAIN_DEPLOYMENT_CONFIG.strategies.SEQUENTIAL;
};

// Export configuration and utilities
module.exports = {
  // Core configurations
  BRIDGE_PROTOCOLS,
  BRIDGE_STATUS,
  DEPLOYMENT_TYPES,
  BRIDGE_CONFIGS,
  DEPLOYMENT_BRIDGE_CONFIGS,
  TEMPLATE_BRIDGE_ROUTES,
  MULTI_CHAIN_DEPLOYMENT_CONFIG,
  VERIFICATION_BRIDGE_CONFIG,
  BRIDGE_ROUTES,
  SECURITY_CONFIG,
  BRIDGE_MANAGER_CONFIG,
  INTEGRATION_PATHS,
  
  // Utility functions
  getBridgeConfig,
  getDeploymentConfig,
  getTemplateRoute,
  getSupportedProtocols,
  getPreferredProtocol,
  getBridgeRoute,
  isBridgeSupported,
  isDeploymentSupported,
  getBridgeLimits,
  getBridgeFees,
  getContractAddress,
  getAbiPath,
  validateBridgeTransaction,
  validateDeploymentRequest,
  estimateBridgeTime,
  estimateBridgeCost,
  estimateDeploymentTime,
  getDeploymentStrategy
};
