// config/bridgeConfig.js
// FIXED Production Bridge Configuration - Cross-Chain Token Bridge System
// Aligned with actual project structure and existing components only

const { CHAINS } = require('./chainsConfig');
const { TOKENS } = require('./tokenConfig');

// Network configuration
const NETWORK_CONFIG = {
  // Mainnet RPC endpoints using publicnode.com
  mainnet: {
    ethereum: 'https://ethereum-rpc.publicnode.com',
    bsc: 'https://bsc-rpc.publicnode.com', 
    polygon: 'https://polygon-bor-rpc.publicnode.com',
    arbitrum: 'https://arbitrum-one-rpc.publicnode.com',
    optimism: 'https://optimism-rpc.publicnode.com',
    avalanche: 'https://avalanche-c-chain-rpc.publicnode.com',
    opbnb: 'https://opbnb-rpc.publicnode.com'
  },
  
  // Testnet RPC endpoints using publicnode.com
  testnet: {
    ethereum: 'https://ethereum-sepolia-rpc.publicnode.com',
    bsc: 'https://bsc-testnet-rpc.publicnode.com',
    polygon: 'https://polygon-amoy-bor-rpc.publicnode.com',
    arbitrum: 'https://arbitrum-sepolia-rpc.publicnode.com',
    optimism: 'https://optimism-sepolia-rpc.publicnode.com',
    avalanche: 'https://avalanche-fuji-c-chain-rpc.publicnode.com',
    opbnb: 'https://opbnb-testnet-rpc.publicnode.com'
  },
  
  // Chain IDs for validation
  chainIds: {
    mainnet: {
      ethereum: 1,
      bsc: 56,
      polygon: 137,
      arbitrum: 42161,
      optimism: 10,
      avalanche: 43114,
      opbnb: 204
    },
    testnet: {
      ethereum: 11155111, // Sepolia
      bsc: 97,
      polygon: 80002, // Amoy
      arbitrum: 421614, // Sepolia
      optimism: 11155420, // Sepolia
      avalanche: 43113, // Fuji
      opbnb: 5611
    }
  },
  
  // Explorer URLs
  explorers: {
    mainnet: {
      ethereum: 'https://etherscan.io',
      bsc: 'https://bscscan.com',
      polygon: 'https://polygonscan.com',
      arbitrum: 'https://arbiscan.io',
      optimism: 'https://optimistic.etherscan.io',
      avalanche: 'https://snowtrace.io',
      opbnb: 'https://opbnbscan.com'
    },
    testnet: {
      ethereum: 'https://sepolia.etherscan.io',
      bsc: 'https://testnet.bscscan.com',
      polygon: 'https://amoy.polygonscan.com',
      arbitrum: 'https://sepolia.arbiscan.io',
      optimism: 'https://sepolia-optimism.etherscan.io',
      avalanche: 'https://testnet.snowtrace.io',
      opbnb: 'https://opbnb-testnet.bscscan.com'
    }
  }
};

// Bridge Protocol Types (Updated with V1/V2 separation)
const BRIDGE_PROTOCOLS = {
  LAYERZERO_V1: 'layerzero-v1',
  LAYERZERO_V2: 'layerzero-v2',
  LAYERZERO: 'layerzero', // Generic LayerZero (defaults to V2)
  WORMHOLE: 'wormhole',
  AXELAR: 'axelar',
  HYPERLANE: 'hyperlane',
  CHAINLINK_CCIP: 'chainlink-ccip',
  HOP: 'hop',
  ACROSS: 'across',
  CROSSCHAIN_USDT: 'crosschain-usdt'
};

// Bridge Status Types (Existing Only)
const BRIDGE_STATUS = {
  PENDING: 'pending',
  CONFIRMING: 'confirming',
  BRIDGING: 'bridging',
  COMPLETED: 'completed',
  FAILED: 'failed',
  EXPIRED: 'expired'
};

// Bridge Configuration per Protocol (CORRECTED PATHS)
const BRIDGE_CONFIGS = {
  [BRIDGE_PROTOCOLS.LAYERZERO_V1]: {
    name: 'LayerZero V1',
    version: 'v1',
    enabled: true,
    icon: '/images/bridges/layerzero-bridge-64.png',
    description: 'Legacy LayerZero protocol with Oracle + Relayer architecture',
    
    // V1-specific settings
    settings: {
      gasLimit: 200000,
      useOracle: true,
      useRelayer: true,
      adapterParams: '0x00010000000000000000000000000000000000000000000000000000000000030d40',
      confirmations: {
        ethereum: 15,
        bsc: 20,
        polygon: 200,
        arbitrum: 1,
        optimism: 1,
        avalanche: 1,
        opbnb: 10
      }
    },
    
    // Supported chains
    supportedChains: ['ethereum', 'bsc', 'polygon', 'arbitrum', 'optimism', 'avalanche', 'opbnb'],
    
    // V1 Contract addresses per chain
    contracts: {
      ethereum: {
        endpoint: '0x66A71Dcef29A0fFBDBE3c6a460a3B5BC225Cd675',
        oft: '0xe71BdFe1dF69284F00EE185cF0d95d0C7680C0D4',
        bridge: '0x8C0479c5173DdD98A22d283233f86189CCb7C027'
      },
      bsc: {
        endpoint: '0x66A71Dcef29A0fFBDBE3c6a460a3B5BC225Cd675',
        oft: '0xe71BdFe1dF69284F00EE185cF0d95d0C7680C0D4',
        bridge: '0x8C0479c5173DdD98A22d283233f86189CCb7C027'
      },
      polygon: {
        endpoint: '0x66A71Dcef29A0fFBDBE3c6a460a3B5BC225Cd675',
        oft: '0xe71BdFe1dF69284F00EE185cF0d95d0C7680C0D4',
        bridge: '0x8C0479c5173DdD98A22d283233f86189CCb7C027'
      },
      arbitrum: {
        endpoint: '0x66A71Dcef29A0fFBDBE3c6a460a3B5BC225Cd675',
        oft: '0xe71BdFe1dF69284F00EE185cF0d95d0C7680C0D4',
        bridge: '0x8C0479c5173DdD98A22d283233f86189CCb7C027'
      },
      optimism: {
        endpoint: '0x66A71Dcef29A0fFBDBE3c6a460a3B5BC225Cd675',
        oft: '0xe71BdFe1dF69284F00EE185cF0d95d0C7680C0D4',
        bridge: '0x8C0479c5173DdD98A22d283233f86189CCb7C027'
      },
      avalanche: {
        endpoint: '0x66A71Dcef29A0fFBDBE3c6a460a3B5BC225Cd675',
        oft: '0xe71BdFe1dF69284F00EE185cF0d95d0C7680C0D4',
        bridge: '0x8C0479c5173DdD98A22d283233f86189CCb7C027'
      },
      opbnb: {
        endpoint: '0x66A71Dcef29A0fFBDBE3c6a460a3B5BC225Cd675',
        oft: '0xe71BdFe1dF69284F00EE185cF0d95d0C7680C0D4',
        bridge: '0x8C0479c5173DdD98A22d283233f86189CCb7C027'
      }
    },
    
    // V1 ABI specifications
    abis: {
      endpoint: 'src/bridges/abis/layerzero/v1/LayerZeroV1Endpoint.json',
      oft: 'src/bridges/abis/layerzero/v1/LayerZeroV1OFT.json',
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

  [BRIDGE_PROTOCOLS.LAYERZERO_V2]: {
    name: 'LayerZero V2',
    version: 'v2',
    enabled: true,
    icon: '/images/bridges/layerzero-bridge-64.png',
    description: 'Next-generation LayerZero with DVN + Executor architecture',
    
    // V2-specific settings
    settings: {
      gasLimit: 200000,
      useDVN: true,
      useExecutor: true,
      adapterParams: '0x00010000000000000000000000000000000000000000000000000000000000030d40',
      confirmations: {
        ethereum: 15,
        bsc: 20,
        polygon: 200,
        arbitrum: 1,
        optimism: 1,
        avalanche: 1,
        opbnb: 10
      }
    },
    
    // Supported chains
    supportedChains: ['ethereum', 'bsc', 'polygon', 'arbitrum', 'optimism', 'avalanche', 'opbnb'],
    
    // V2 Contract addresses per chain
    contracts: {
      ethereum: {
        endpoint: '0x1a44076050125825900e736c501f859c50fE728c',
        oft: '0x6985884C4392D348587B19cb9eAAf157F13271cd',
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
      },
      opbnb: {
        endpoint: '0x1a44076050125825900e736c501f859c50fE728c',
        oft: '0x6985884C4392D348587B19cb9eAAf157F13271cd',
        adapter: '0x211Cc4DD073734dA055fbF44a2b4667d5E5fE5d2',
        bridge: '0x8C0479c5173DdD98A22d283233f86189CCb7C027'
      }
    },
    
    // V2 ABI specifications
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

  // Generic LayerZero (defaults to V2 with V1 fallback)
  [BRIDGE_PROTOCOLS.LAYERZERO]: {
    name: 'LayerZero',
    version: 'auto',
    enabled: true,
    icon: '/images/bridges/layerzero-bridge-64.png',
    description: 'Auto-selecting LayerZero protocol (V2 preferred, V1 fallback)',
    
    // Auto-selection settings
    settings: {
      preferredVersion: 'v2',
      fallbackVersion: 'v1',
      autoVersionSelection: true,
      gasLimit: 200000,
      adapterParams: '0x00010000000000000000000000000000000000000000000000000000000000030d40',
      confirmations: {
        ethereum: 15,
        bsc: 20,
        polygon: 200,
        arbitrum: 1,
        optimism: 1,
        avalanche: 1,
        opbnb: 10
      }
    },
    
    supportedChains: ['ethereum', 'bsc', 'polygon', 'arbitrum', 'optimism', 'avalanche', 'opbnb'],
    
    // Will use V2 contracts by default, V1 as fallback
    contracts: {
      // References V2 contracts primarily
      ethereum: {
        endpoint: '0x1a44076050125825900e736c501f859c50fE728c', // V2
        endpointV1: '0x66A71Dcef29A0fFBDBE3c6a460a3B5BC225Cd675', // V1 fallback
        oft: '0x6985884C4392D348587B19cb9eAAf157F13271cd',
        oftV1: '0xe71BdFe1dF69284F00EE185cF0d95d0C7680C0D4',
        adapter: '0x211Cc4DD073734dA055fbF44a2b4667d5E5fE5d2',
        bridge: '0x8C0479c5173DdD98A22d283233f86189CCb7C027'
      }
      // ... other chains follow same pattern
    },
    
    abis: {
      endpoint: 'src/bridges/abis/layerzero/v2/LayerZeroV2Endpoint.json',
      endpointV1: 'src/bridges/abis/layerzero/v1/LayerZeroV1Endpoint.json',
      oft: 'src/bridges/abis/layerzero/v2/LayerZeroV2OFT.json',
      oftV1: 'src/bridges/abis/layerzero/v1/LayerZeroV1OFT.json',
      adapter: 'src/bridges/abis/layerzero/v2/LayerZeroV2Adapter.json',
      bridge: 'src/bridges/abis/bridges/LayerZeroTokenBridge.json'
    },
    
    fees: {
      baseFee: '0.001',
      dynamicFee: true,
      feeToken: 'native',
      minFee: '0.0001',
      maxFee: '0.01'
    },
    
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
        avalanche: 1,
        opbnb: 10
      }
    },
    
    supportedChains: ['ethereum', 'bsc', 'polygon', 'arbitrum', 'optimism', 'avalanche', 'opbnb'],
    
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
      },
      opbnb: {
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
        avalanche: 1,
        opbnb: 10
      }
    },
    
    supportedChains: ['ethereum', 'bsc', 'polygon', 'arbitrum', 'optimism', 'avalanche', 'opbnb'],
    
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
      },
      opbnb: {
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
        avalanche: 1,
        opbnb: 10
      }
    },
    
    supportedChains: ['ethereum', 'bsc', 'polygon', 'arbitrum', 'optimism', 'avalanche', 'opbnb'],
    
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
      },
      opbnb: {
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

// Bridge Route Configuration (Enhanced with LayerZero V1/V2)
const BRIDGE_ROUTES = {
  // Enhanced route configurations including opBNB and LayerZero V1/V2
  'ethereum-bsc': {
    protocols: [BRIDGE_PROTOCOLS.LAYERZERO_V2, BRIDGE_PROTOCOLS.LAYERZERO_V1, BRIDGE_PROTOCOLS.WORMHOLE, BRIDGE_PROTOCOLS.CROSSCHAIN_USDT],
    preferredProtocol: BRIDGE_PROTOCOLS.LAYERZERO_V2,
    fallbackProtocol: BRIDGE_PROTOCOLS.LAYERZERO_V1,
    estimatedTime: '5-15 minutes',
    cost: 'medium'
  },
  'ethereum-polygon': {
    protocols: [BRIDGE_PROTOCOLS.LAYERZERO_V2, BRIDGE_PROTOCOLS.LAYERZERO_V1, BRIDGE_PROTOCOLS.WORMHOLE, BRIDGE_PROTOCOLS.CHAINLINK_CCIP],
    preferredProtocol: BRIDGE_PROTOCOLS.LAYERZERO_V2,
    fallbackProtocol: BRIDGE_PROTOCOLS.LAYERZERO_V1,
    estimatedTime: '5-20 minutes',
    cost: 'medium'
  },
  'ethereum-arbitrum': {
    protocols: [BRIDGE_PROTOCOLS.LAYERZERO_V2, BRIDGE_PROTOCOLS.LAYERZERO_V1, BRIDGE_PROTOCOLS.WORMHOLE, BRIDGE_PROTOCOLS.CHAINLINK_CCIP],
    preferredProtocol: BRIDGE_PROTOCOLS.LAYERZERO_V2,
    fallbackProtocol: BRIDGE_PROTOCOLS.LAYERZERO_V1,
    estimatedTime: '2-10 minutes',
    cost: 'low'
  },
  'ethereum-optimism': {
    protocols: [BRIDGE_PROTOCOLS.LAYERZERO_V2, BRIDGE_PROTOCOLS.LAYERZERO_V1, BRIDGE_PROTOCOLS.WORMHOLE, BRIDGE_PROTOCOLS.CHAINLINK_CCIP],
    preferredProtocol: BRIDGE_PROTOCOLS.LAYERZERO_V2,
    fallbackProtocol: BRIDGE_PROTOCOLS.LAYERZERO_V1,
    estimatedTime: '2-10 minutes',
    cost: 'low'
  },
  'ethereum-avalanche': {
    protocols: [BRIDGE_PROTOCOLS.LAYERZERO_V2, BRIDGE_PROTOCOLS.LAYERZERO_V1, BRIDGE_PROTOCOLS.WORMHOLE, BRIDGE_PROTOCOLS.CHAINLINK_CCIP],
    preferredProtocol: BRIDGE_PROTOCOLS.LAYERZERO_V2,
    fallbackProtocol: BRIDGE_PROTOCOLS.LAYERZERO_V1,
    estimatedTime: '5-15 minutes',
    cost: 'medium'
  },
  'ethereum-opbnb': {
    protocols: [BRIDGE_PROTOCOLS.LAYERZERO_V2, BRIDGE_PROTOCOLS.LAYERZERO_V1, BRIDGE_PROTOCOLS.WORMHOLE],
    preferredProtocol: BRIDGE_PROTOCOLS.LAYERZERO_V2,
    fallbackProtocol: BRIDGE_PROTOCOLS.LAYERZERO_V1,
    estimatedTime: '3-10 minutes',
    cost: 'low'
  },
  'bsc-polygon': {
    protocols: [BRIDGE_PROTOCOLS.LAYERZERO_V2, BRIDGE_PROTOCOLS.LAYERZERO_V1, BRIDGE_PROTOCOLS.WORMHOLE, BRIDGE_PROTOCOLS.CROSSCHAIN_USDT],
    preferredProtocol: BRIDGE_PROTOCOLS.LAYERZERO_V2,
    fallbackProtocol: BRIDGE_PROTOCOLS.LAYERZERO_V1,
    estimatedTime: '3-10 minutes',
    cost: 'low'
  },
  'bsc-arbitrum': {
    protocols: [BRIDGE_PROTOCOLS.LAYERZERO_V2, BRIDGE_PROTOCOLS.LAYERZERO_V1, BRIDGE_PROTOCOLS.WORMHOLE],
    preferredProtocol: BRIDGE_PROTOCOLS.LAYERZERO_V2,
    fallbackProtocol: BRIDGE_PROTOCOLS.LAYERZERO_V1,
    estimatedTime: '5-15 minutes',
    cost: 'medium'
  },
  'bsc-optimism': {
    protocols: [BRIDGE_PROTOCOLS.LAYERZERO_V2, BRIDGE_PROTOCOLS.LAYERZERO_V1, BRIDGE_PROTOCOLS.WORMHOLE],
    preferredProtocol: BRIDGE_PROTOCOLS.LAYERZERO_V2,
    fallbackProtocol: BRIDGE_PROTOCOLS.LAYERZERO_V1,
    estimatedTime: '5-15 minutes',
    cost: 'medium'
  },
  'bsc-avalanche': {
    protocols: [BRIDGE_PROTOCOLS.LAYERZERO_V2, BRIDGE_PROTOCOLS.LAYERZERO_V1, BRIDGE_PROTOCOLS.WORMHOLE, BRIDGE_PROTOCOLS.CROSSCHAIN_USDT],
    preferredProtocol: BRIDGE_PROTOCOLS.LAYERZERO_V2,
    fallbackProtocol: BRIDGE_PROTOCOLS.LAYERZERO_V1,
    estimatedTime: '3-10 minutes',
    cost: 'low'
  },
  'bsc-opbnb': {
    protocols: [BRIDGE_PROTOCOLS.LAYERZERO_V2, BRIDGE_PROTOCOLS.LAYERZERO_V1, BRIDGE_PROTOCOLS.WORMHOLE],
    preferredProtocol: BRIDGE_PROTOCOLS.LAYERZERO_V2,
    fallbackProtocol: BRIDGE_PROTOCOLS.LAYERZERO_V1,
    estimatedTime: '2-8 minutes',
    cost: 'very-low'
  },
  'polygon-arbitrum': {
    protocols: [BRIDGE_PROTOCOLS.LAYERZERO_V2, BRIDGE_PROTOCOLS.LAYERZERO_V1, BRIDGE_PROTOCOLS.WORMHOLE, BRIDGE_PROTOCOLS.CHAINLINK_CCIP],
    preferredProtocol: BRIDGE_PROTOCOLS.LAYERZERO_V2,
    fallbackProtocol: BRIDGE_PROTOCOLS.LAYERZERO_V1,
    estimatedTime: '5-15 minutes',
    cost: 'medium'
  },
  'polygon-optimism': {
    protocols: [BRIDGE_PROTOCOLS.LAYERZERO_V2, BRIDGE_PROTOCOLS.LAYERZERO_V1, BRIDGE_PROTOCOLS.WORMHOLE, BRIDGE_PROTOCOLS.CHAINLINK_CCIP],
    preferredProtocol: BRIDGE_PROTOCOLS.LAYERZERO_V2,
    fallbackProtocol: BRIDGE_PROTOCOLS.LAYERZERO_V1,
    estimatedTime: '5-15 minutes',
    cost: 'medium'
  },
  'polygon-avalanche': {
    protocols: [BRIDGE_PROTOCOLS.LAYERZERO_V2, BRIDGE_PROTOCOLS.LAYERZERO_V1, BRIDGE_PROTOCOLS.WORMHOLE, BRIDGE_PROTOCOLS.CROSSCHAIN_USDT],
    preferredProtocol: BRIDGE_PROTOCOLS.LAYERZERO_V2,
    fallbackProtocol: BRIDGE_PROTOCOLS.LAYERZERO_V1,
    estimatedTime: '5-15 minutes',
    cost: 'medium'
  },
  'polygon-opbnb': {
    protocols: [BRIDGE_PROTOCOLS.LAYERZERO_V2, BRIDGE_PROTOCOLS.LAYERZERO_V1, BRIDGE_PROTOCOLS.WORMHOLE],
    preferredProtocol: BRIDGE_PROTOCOLS.LAYERZERO_V2,
    fallbackProtocol: BRIDGE_PROTOCOLS.LAYERZERO_V1,
    estimatedTime: '5-12 minutes',
    cost: 'low'
  },
  'arbitrum-optimism': {
    protocols: [BRIDGE_PROTOCOLS.LAYERZERO_V2, BRIDGE_PROTOCOLS.LAYERZERO_V1, BRIDGE_PROTOCOLS.WORMHOLE],
    preferredProtocol: BRIDGE_PROTOCOLS.LAYERZERO_V2,
    fallbackProtocol: BRIDGE_PROTOCOLS.LAYERZERO_V1,
    estimatedTime: '2-8 minutes',
    cost: 'low'
  },
  'arbitrum-opbnb': {
    protocols: [BRIDGE_PROTOCOLS.LAYERZERO_V2, BRIDGE_PROTOCOLS.LAYERZERO_V1, BRIDGE_PROTOCOLS.WORMHOLE],
    preferredProtocol: BRIDGE_PROTOCOLS.LAYERZERO_V2,
    fallbackProtocol: BRIDGE_PROTOCOLS.LAYERZERO_V1,
    estimatedTime: '3-10 minutes',
    cost: 'low'
  },
  'optimism-opbnb': {
    protocols: [BRIDGE_PROTOCOLS.LAYERZERO_V2, BRIDGE_PROTOCOLS.LAYERZERO_V1, BRIDGE_PROTOCOLS.WORMHOLE],
    preferredProtocol: BRIDGE_PROTOCOLS.LAYERZERO_V2,
    fallbackProtocol: BRIDGE_PROTOCOLS.LAYERZERO_V1,
    estimatedTime: '3-10 minutes',
    cost: 'low'
  },
  'avalanche-opbnb': {
    protocols: [BRIDGE_PROTOCOLS.LAYERZERO_V2, BRIDGE_PROTOCOLS.LAYERZERO_V1, BRIDGE_PROTOCOLS.WORMHOLE],
    preferredProtocol: BRIDGE_PROTOCOLS.LAYERZERO_V2,
    fallbackProtocol: BRIDGE_PROTOCOLS.LAYERZERO_V1,
    estimatedTime: '5-12 minutes',
    cost: 'low'
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
      opbnb: 5
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
    protocol: BRIDGE_PROTOCOLS.LAYERZERO_V2,
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
  }
};

// CORRECTED: Integration paths with EXISTING components only
const INTEGRATION_PATHS = {
  // Existing Services
  services: {
    bridgeService: 'src/services/BridgeService.js',
    crossChainService: 'src/services/CrossChainService.js'
  },

  // Existing Components
  components: {
    bridgeSelector: 'src/ui/components/bridge/BridgeSelector.js',
    routeDisplay: 'src/ui/components/bridge/RouteDisplay.js',
    bridgeStatus: 'src/ui/components/bridge/BridgeStatus.js',
    crossChainProgress: 'src/ui/components/bridge/CrossChainProgress.js',
    layerZeroBridge: 'src/ui/components/bridge/LayerZeroBridge.js',
    crossChainUSDTBridge: 'src/ui/components/bridge/CrossChainUSDTBridge.js'
  },

  // Existing Utils
  utils: {
    bridgeUtils: 'src/utils/bridgeUtils.js',
    crossChainUtils: 'src/utils/crossChainUtils.js',
    addressUtils: 'src/utils/addressUtils.js'
  },

  // Existing Storage
  storage: {
    bridgeStorage: 'src/storage/BridgeStorage.js'
  },

  // Existing Hooks
  hooks: {
    useBridge: 'src/ui/hooks/useBridge.js',
    useBridgeConfig: 'src/ui/hooks/useBridgeConfig.js',
    useCrossChain: 'src/ui/hooks/useCrossChain.js',
    useBridgeValidation: 'src/ui/hooks/useBridgeValidation.js',
    useCrossChainUSDT: 'src/ui/hooks/useCrossChainUSDT.js'
  },

  // Existing Contract ABIs (CORRECTED PATHS)
  abis: {
    layerzero: {
      v1: {
        endpoint: 'src/bridges/abis/layerzero/v1/LayerZeroV1Endpoint.json',
        oft: 'src/bridges/abis/layerzero/v1/LayerZeroV1OFT.json'
      },
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
      chainlinkPriceFeed: 'src/bridges/abis/infrastructure/ChainlinkPriceFeed.json',
      oracleValidator: 'src/bridges/abis/infrastructure/OracleValidator.json',
      crossChainValidator: 'src/bridges/abis/infrastructure/CrossChainValidator.json'
    },
    interfaces: {
      ierc20: 'src/bridges/abis/interfaces/IERC20.json'
    }
  },

  // Existing API endpoints
  api: {
    bridgeRoutes: 'pages/api/bridge-routes.js',
    bridgeStatus: 'pages/api/bridge-status.js',
    crossChainTransfer: 'pages/api/cross-chain-transfer.js',
    crosschainUsdt: 'pages/api/crosschain-usdt.js'
  }
};

// Enhanced environment configuration with LayerZero version controls
const getEnvironmentConfig = () => {
  const isTestnet = process.env.USE_TESTNET === 'true';
  const networkType = isTestnet ? 'testnet' : 'mainnet';
  
  return {
    // Network configuration
    isTestnet,
    networkType,
    
    // API Keys for block explorers
    etherscanApiKey: process.env.ETHERSCAN_API_KEY || null,
    bscscanApiKey: process.env.BSCSCAN_API_KEY || null,
    polygonscanApiKey: process.env.POLYGONSCAN_API_KEY || null,
    arbiscanApiKey: process.env.ARBISCAN_API_KEY || null,
    optimisticEtherscanApiKey: process.env.OPTIMISTIC_ETHERSCAN_API_KEY || null,
    snowtraceApiKey: process.env.SNOWTRACE_API_KEY || null,
    
    // RPC endpoints - Updated with publicnode.com
    ethereumRpc: process.env.ETHEREUM_RPC_URL || NETWORK_CONFIG[networkType].ethereum,
    bscRpc: process.env.BSC_RPC_URL || NETWORK_CONFIG[networkType].bsc,
    polygonRpc: process.env.POLYGON_RPC_URL || NETWORK_CONFIG[networkType].polygon,
    arbitrumRpc: process.env.ARBITRUM_RPC_URL || NETWORK_CONFIG[networkType].arbitrum,
    optimismRpc: process.env.OPTIMISM_RPC_URL || NETWORK_CONFIG[networkType].optimism,
    avalancheRpc: process.env.AVALANCHE_RPC_URL || NETWORK_CONFIG[networkType].avalanche,
    opbnbRpc: process.env.OPBNB_RPC_URL || NETWORK_CONFIG[networkType].opbnb,
    
    // Chain IDs
    chainIds: NETWORK_CONFIG.chainIds[networkType],
    
    // Explorer URLs
    explorers: NETWORK_CONFIG.explorers[networkType],
    
    // Feature flags
    enableBridging: process.env.ENABLE_BRIDGING !== 'false',
    enableCrossChainUSDT: process.env.ENABLE_CROSSCHAIN_USDT !== 'false',
    enableLayerZero: process.env.ENABLE_LAYERZERO !== 'false',
    enableLayerZeroV1: process.env.ENABLE_LAYERZERO_V1 !== 'false',
    enableLayerZeroV2: process.env.ENABLE_LAYERZERO_V2 !== 'false',
    enableWormhole: process.env.ENABLE_WORMHOLE !== 'false',
    enableChainlinkCCIP: process.env.ENABLE_CHAINLINK_CCIP !== 'false',
    enableOpBNB: process.env.ENABLE_OPBNB !== 'false',
    
    // LayerZero version preferences
    preferLayerZeroV1: process.env.PREFER_LAYERZERO_V1 === 'true',
    forceLayerZeroVersion: process.env.FORCE_LAYERZERO_VERSION || null, // 'v1' or 'v2'
    
    // Development mode
    isDevelopment: process.env.NODE_ENV === 'development',
    isProduction: process.env.NODE_ENV === 'production',
    
    // Additional configuration
    walletConnectProjectId: process.env.WALLETCONNECT_PROJECT_ID || null,
    infuraProjectId: process.env.INFURA_PROJECT_ID || null,
    alchemyApiKey: process.env.ALCHEMY_API_KEY || null
  };
};

// Enhanced utilities with LayerZero version selection
const getBridgeConfig = (protocol) => {
  if (!BRIDGE_CONFIGS[protocol]) {
    throw new Error(`Bridge protocol ${protocol} not supported`);
  }
  return BRIDGE_CONFIGS[protocol];
};

// LayerZero version selection utility
const getOptimalLayerZeroProtocol = (fromChain, toChain, options = {}) => {
  const { preferV1 = false, forceVersion = null } = options;
  
  // Force specific version if requested
  if (forceVersion === 'v1') return BRIDGE_PROTOCOLS.LAYERZERO_V1;
  if (forceVersion === 'v2') return BRIDGE_PROTOCOLS.LAYERZERO_V2;
  
  // Check route availability for both versions
  const route = getBridgeRoute(fromChain, toChain);
  if (!route) return null;
  
  const hasV2 = route.protocols.includes(BRIDGE_PROTOCOLS.LAYERZERO_V2);
  const hasV1 = route.protocols.includes(BRIDGE_PROTOCOLS.LAYERZERO_V1);
  
  // Prefer V1 if explicitly requested and available
  if (preferV1 && hasV1) return BRIDGE_PROTOCOLS.LAYERZERO_V1;
  
  // Default preference: V2 -> V1 -> null
  if (hasV2) return BRIDGE_PROTOCOLS.LAYERZERO_V2;
  if (hasV1) return BRIDGE_PROTOCOLS.LAYERZERO_V1;
  
  return null;
};

// Check LayerZero version availability
const isLayerZeroVersionSupported = (version, fromChain, toChain) => {
  const protocol = version === 'v1' ? BRIDGE_PROTOCOLS.LAYERZERO_V1 : BRIDGE_PROTOCOLS.LAYERZERO_V2;
  return isBridgeSupported(fromChain, toChain, protocol);
};

// Get LayerZero contract addresses with version fallback
const getLayerZeroContract = (chain, contractType, version = 'auto') => {
  if (version === 'v1') {
    return getContractAddress(BRIDGE_PROTOCOLS.LAYERZERO_V1, chain, contractType);
  }
  if (version === 'v2') {
    return getContractAddress(BRIDGE_PROTOCOLS.LAYERZERO_V2, chain, contractType);
  }
  
  // Auto selection: try V2 first, fallback to V1
  const v2Address = getContractAddress(BRIDGE_PROTOCOLS.LAYERZERO_V2, chain, contractType);
  if (v2Address) return { address: v2Address, version: 'v2' };
  
  const v1Address = getContractAddress(BRIDGE_PROTOCOLS.LAYERZERO_V1, chain, contractType);
  if (v1Address) return { address: v1Address, version: 'v1' };
  
  return null;
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
         BRIDGE_PROTOCOLS.LAYERZERO_V2;
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
  try {
    const limits = getBridgeLimits(protocol);
    if (parseFloat(amount) < parseFloat(limits.minAmount)) {
      errors.push(`Amount below minimum limit of ${limits.minAmount}`);
    }
    if (parseFloat(amount) > parseFloat(limits.maxAmount)) {
      errors.push(`Amount exceeds maximum limit of ${limits.maxAmount}`);
    }
  } catch (error) {
    errors.push(`Error validating limits: ${error.message}`);
  }
  
  return {
    isValid: errors.length === 0,
    errors
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

// Get RPC URL for a specific chain
const getRpcUrl = (chainName, useTestnet = false) => {
  const env = getEnvironmentConfig();
  const networkType = useTestnet || env.isTestnet ? 'testnet' : 'mainnet';
  
  const rpcMap = {
    ethereum: env.ethereumRpc,
    bsc: env.bscRpc,
    polygon: env.polygonRpc,
    arbitrum: env.arbitrumRpc,
    optimism: env.optimismRpc,
    avalanche: env.avalancheRpc,
    opbnb: env.opbnbRpc
  };
  
  return rpcMap[chainName] || NETWORK_CONFIG[networkType][chainName];
};

// Get chain ID for a specific chain
const getChainId = (chainName, useTestnet = false) => {
  const env = getEnvironmentConfig();
  const networkType = useTestnet || env.isTestnet ? 'testnet' : 'mainnet';
  return NETWORK_CONFIG.chainIds[networkType][chainName];
};

// Get explorer URL for a specific chain
const getExplorerUrl = (chainName, useTestnet = false) => {
  const env = getEnvironmentConfig();
  const networkType = useTestnet || env.isTestnet ? 'testnet' : 'mainnet';
  return NETWORK_CONFIG.explorers[networkType][chainName];
};

// Validate chain configuration
const validateChainConfig = (chainName) => {
  const env = getEnvironmentConfig();
  const networkType = env.isTestnet ? 'testnet' : 'mainnet';
  
  const errors = [];
  
  // Check if chain is supported
  const supportedChains = Object.keys(NETWORK_CONFIG.chainIds[networkType]);
  if (!supportedChains.includes(chainName)) {
    errors.push(`Chain ${chainName} is not supported`);
    return { isValid: false, errors };
  }
  
  // Check RPC URL
  const rpcUrl = getRpcUrl(chainName);
  if (!rpcUrl || !rpcUrl.startsWith('http')) {
    errors.push(`Invalid RPC URL for ${chainName}: ${rpcUrl}`);
  }
  
  // Check chain ID
  const chainId = getChainId(chainName);
  if (!chainId || typeof chainId !== 'number') {
    errors.push(`Invalid chain ID for ${chainName}: ${chainId}`);
  }
  
  // Check explorer URL
  const explorerUrl = getExplorerUrl(chainName);
  if (!explorerUrl || !explorerUrl.startsWith('http')) {
    errors.push(`Invalid explorer URL for ${chainName}: ${explorerUrl}`);
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    config: {
      rpcUrl,
      chainId,
      explorerUrl,
      networkType
    }
  };
};

// Path validation utility
const validatePaths = () => {
  const fs = require('fs');
  const path = require('path');
  const invalidPaths = [];

  // Helper function to check if file exists
  const checkPath = (filePath, description) => {
    try {
      if (!fs.existsSync(filePath)) {
        invalidPaths.push({ path: filePath, description, exists: false });
        return false;
      }
      invalidPaths.push({ path: filePath, description, exists: true });
      return true;
    } catch (error) {
      invalidPaths.push({ path: filePath, description, exists: false, error: error.message });
      return false;
    }
  };

  // Validate ABI paths
  const validateABIs = (obj, prefix = '') => {
    Object.entries(obj).forEach(([key, value]) => {
      if (typeof value === 'string' && value.endsWith('.json')) {
        checkPath(value, `${prefix}${key} ABI`);
      } else if (typeof value === 'object' && value !== null) {
        validateABIs(value, `${prefix}${key}.`);
      }
    });
  };

  validateABIs(INTEGRATION_PATHS.abis, 'ABI.');

  // Validate component paths
  Object.entries(INTEGRATION_PATHS.components).forEach(([key, filePath]) => {
    checkPath(filePath, `Component: ${key}`);
  });

  // Validate service paths
  Object.entries(INTEGRATION_PATHS.services).forEach(([key, filePath]) => {
    checkPath(filePath, `Service: ${key}`);
  });

  // Validate utility paths
  Object.entries(INTEGRATION_PATHS.utils).forEach(([key, filePath]) => {
    checkPath(filePath, `Utility: ${key}`);
  });

  // Validate hook paths
  Object.entries(INTEGRATION_PATHS.hooks).forEach(([key, filePath]) => {
    checkPath(filePath, `Hook: ${key}`);
  });

  // Validate API paths
  Object.entries(INTEGRATION_PATHS.api).forEach(([key, filePath]) => {
    checkPath(filePath, `API: ${key}`);
  });

  return invalidPaths;
};

// Enhanced configuration validation with LayerZero version checks
const validateConfiguration = () => {
  const errors = [];
  const warnings = [];
  const env = getEnvironmentConfig();

  // Check required environment variables in production
  if (env.isProduction) {
    const requiredEnvVars = [
      'ETHERSCAN_API_KEY',
      'ETHEREUM_RPC_URL'
    ];

    requiredEnvVars.forEach(envVar => {
      if (!process.env[envVar]) {
        errors.push(`Missing required environment variable: ${envVar}`);
      }
    });
  }

  // Validate LayerZero version configuration
  if (env.enableLayerZero) {
    if (!env.enableLayerZeroV1 && !env.enableLayerZeroV2) {
      warnings.push('LayerZero enabled but neither V1 nor V2 are enabled');
    }
    
    if (env.forceLayerZeroVersion && !['v1', 'v2'].includes(env.forceLayerZeroVersion)) {
      errors.push(`Invalid FORCE_LAYERZERO_VERSION: ${env.forceLayerZeroVersion}. Must be 'v1' or 'v2'`);
    }
  }

  // Validate bridge configurations
  Object.entries(BRIDGE_CONFIGS).forEach(([protocol, config]) => {
    // Check if all required properties exist
    const requiredProps = ['name', 'version', 'enabled', 'supportedChains', 'contracts', 'abis', 'fees', 'limits'];
    requiredProps.forEach(prop => {
      if (!config[prop]) {
        errors.push(`Bridge config for ${protocol} missing required property: ${prop}`);
      }
    });

    // Validate contract addresses for LayerZero versions
    if (protocol.includes('layerzero')) {
      config.supportedChains?.forEach(chain => {
        if (!config.contracts[chain]) {
          warnings.push(`Bridge config for ${protocol} missing contracts for chain: ${chain}`);
        } else {
          // Check for required LayerZero contracts
          const requiredContracts = ['endpoint', 'oft', 'bridge'];
          requiredContracts.forEach(contractType => {
            if (!config.contracts[chain][contractType]) {
              warnings.push(`LayerZero ${protocol} missing ${contractType} contract for ${chain}`);
            }
          });
        }
      });
    }
  });

  // Validate route configurations with LayerZero versions
  Object.entries(BRIDGE_ROUTES).forEach(([route, config]) => {
    if (!config.protocols || !Array.isArray(config.protocols)) {
      errors.push(`Bridge route ${route} missing or invalid protocols array`);
    }
    
    if (!config.preferredProtocol) {
      warnings.push(`Bridge route ${route} missing preferred protocol`);
    }
    
    // Check if fallback protocol is valid
    if (config.fallbackProtocol && !config.protocols.includes(config.fallbackProtocol)) {
      warnings.push(`Bridge route ${route} fallback protocol not in protocols list`);
    }
  });

  return { errors, warnings, isValid: errors.length === 0 };
};

// Dynamic protocol enabling/disabling with LayerZero version support
const getEnabledProtocols = () => {
  const env = getEnvironmentConfig();
  const enabledProtocols = [];

  // LayerZero protocol handling
  if (env.enableLayerZero) {
    if (env.enableLayerZeroV1 && BRIDGE_CONFIGS[BRIDGE_PROTOCOLS.LAYERZERO_V1]?.enabled) {
      enabledProtocols.push(BRIDGE_PROTOCOLS.LAYERZERO_V1);
    }
    
    if (env.enableLayerZeroV2 && BRIDGE_CONFIGS[BRIDGE_PROTOCOLS.LAYERZERO_V2]?.enabled) {
      enabledProtocols.push(BRIDGE_PROTOCOLS.LAYERZERO_V2);
    }
    
    // Add generic LayerZero if both versions available
    if (enabledProtocols.includes(BRIDGE_PROTOCOLS.LAYERZERO_V1) || 
        enabledProtocols.includes(BRIDGE_PROTOCOLS.LAYERZERO_V2)) {
      enabledProtocols.push(BRIDGE_PROTOCOLS.LAYERZERO);
    }
  }
  
  if (env.enableWormhole && BRIDGE_CONFIGS[BRIDGE_PROTOCOLS.WORMHOLE]?.enabled) {
    enabledProtocols.push(BRIDGE_PROTOCOLS.WORMHOLE);
  }
  
  if (env.enableChainlinkCCIP && BRIDGE_CONFIGS[BRIDGE_PROTOCOLS.CHAINLINK_CCIP]?.enabled) {
    enabledProtocols.push(BRIDGE_PROTOCOLS.CHAINLINK_CCIP);
  }
  
  if (env.enableCrossChainUSDT && BRIDGE_CONFIGS[BRIDGE_PROTOCOLS.CROSSCHAIN_USDT]?.enabled) {
    enabledProtocols.push(BRIDGE_PROTOCOLS.CROSSCHAIN_USDT);
  }

  return enabledProtocols;
};

// Get available routes based on enabled protocols
const getAvailableRoutes = () => {
  const enabledProtocols = getEnabledProtocols();
  const availableRoutes = {};

  Object.entries(BRIDGE_ROUTES).forEach(([route, config]) => {
    const availableProtocols = config.protocols.filter(protocol => 
      enabledProtocols.includes(protocol)
    );
    
    if (availableProtocols.length > 0) {
      availableRoutes[route] = {
        ...config,
        protocols: availableProtocols,
        preferredProtocol: availableProtocols.includes(config.preferredProtocol) 
          ? config.preferredProtocol 
          : availableProtocols[0]
      };
    }
  });

  return availableRoutes;
};

// Test RPC connections (development only)
const testRpcConnections = async (chains) => {
  const results = {};
  
  for (const chainName of chains) {
    try {
      const rpcUrl = getRpcUrl(chainName);
      console.log(`🔌 Testing ${chainName}: ${rpcUrl}`);
      
      // Simple HTTP test - in a real implementation, you'd use Web3/Ethers
      const response = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_chainId',
          params: [],
          id: 1
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        const chainId = parseInt(data.result, 16);
        const expectedChainId = getChainId(chainName);
        
        if (chainId === expectedChainId) {
          console.log(`✅ ${chainName} RPC working (Chain ID: ${chainId})`);
          results[chainName] = { status: 'success', chainId };
        } else {
          console.warn(`⚠️ ${chainName} RPC chain ID mismatch: expected ${expectedChainId}, got ${chainId}`);
          results[chainName] = { status: 'warning', chainId, expectedChainId };
        }
      } else {
        console.error(`❌ ${chainName} RPC failed: ${response.status}`);
        results[chainName] = { status: 'error', error: `HTTP ${response.status}` };
      }
    } catch (error) {
      console.error(`❌ ${chainName} RPC error:`, error.message);
      results[chainName] = { status: 'error', error: error.message };
    }
  }
  
  return results;
};

// Initialize configuration with enhanced validation
const initializeConfiguration = () => {
  console.log('🔄 Initializing Bridge Configuration...');
  
  const env = getEnvironmentConfig();
  console.log(`🌐 Network: ${env.networkType.toUpperCase()}`);
  console.log(`🔗 Supported chains: ${Object.keys(env.chainIds).join(', ')}`);
  
  // Validate configuration
  const validation = validateConfiguration();
  if (!validation.isValid) {
    console.error('❌ Configuration validation failed:', validation.errors);
    throw new Error('Invalid bridge configuration');
  }
  
  if (validation.warnings.length > 0) {
    console.warn('⚠️ Configuration warnings:', validation.warnings);
  }
  
  // Validate chain configurations
  const chainValidations = {};
  const supportedChains = Object.keys(env.chainIds);
  
  supportedChains.forEach(chainName => {
    const chainValidation = validateChainConfig(chainName);
    chainValidations[chainName] = chainValidation;
    
    if (!chainValidation.isValid) {
      console.warn(`⚠️ Chain ${chainName} configuration issues:`, chainValidation.errors);
    } else {
      console.log(`✅ Chain ${chainName} configured (ID: ${chainValidation.config.chainId})`);
    }
  });
  
  // Validate file paths in development
  if (env.isDevelopment) {
    console.log('🔍 Validating file paths...');
    const pathValidation = validatePaths();
    const missingPaths = pathValidation.filter(p => !p.exists);
    
    if (missingPaths.length > 0) {
      console.warn('⚠️ Missing files detected:', missingPaths.map(p => p.path));
    }
    
    console.log(`✅ Path validation complete. ${pathValidation.length - missingPaths.length}/${pathValidation.length} files found.`);
  }
  
  // Log enabled protocols
  const enabledProtocols = getEnabledProtocols();
  console.log('✅ Enabled bridge protocols:', enabledProtocols);
  
  // Log available routes
  const availableRoutes = getAvailableRoutes();
  console.log(`✅ Available bridge routes: ${Object.keys(availableRoutes).length}`);
  
  // Test RPC connections in development
  if (env.isDevelopment) {
    console.log('🧪 Testing RPC connections...');
    testRpcConnections(supportedChains);
  }
  
  console.log('🎉 Bridge configuration initialized successfully!');
  
  return {
    environment: env,
    protocols: enabledProtocols,
    routes: availableRoutes,
    chains: chainValidations,
    validation
  };
};

// Export all configurations and utilities
module.exports = {
  // Core configurations
  BRIDGE_PROTOCOLS,
  BRIDGE_STATUS,
  BRIDGE_CONFIGS,
  BRIDGE_ROUTES,
  SECURITY_CONFIG,
  BRIDGE_MANAGER_CONFIG,
  INTEGRATION_PATHS,
  NETWORK_CONFIG,
  
  // Utility functions
  getBridgeConfig,
  getSupportedProtocols,
  getPreferredProtocol,
  getBridgeRoute,
  isBridgeSupported,
  getBridgeLimits,
  getBridgeFees,
  getContractAddress,
  getAbiPath,
  validateBridgeTransaction,
  estimateBridgeTime,
  estimateBridgeCost,
  
  // Enhanced utilities
  validatePaths,
  getEnvironmentConfig,
  validateConfiguration,
  getEnabledProtocols,
  getAvailableRoutes,
  initializeConfiguration,
  
  // LayerZero version utilities
  getOptimalLayerZeroProtocol,
  isLayerZeroVersionSupported,
  getLayerZeroContract,
  
  // Network utilities
  getRpcUrl,
  getChainId,
  getExplorerUrl,
  validateChainConfig,
  testRpcConnections,
  
  // Initialization
  init: initializeConfiguration
};
