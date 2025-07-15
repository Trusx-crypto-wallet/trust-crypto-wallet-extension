/**
 * Contract Addresses Configuration
 * Production deployment addresses for cross-chain wallet infrastructure
 * Aligned with Trust Crypto Wallet complete project structure
 */
const NETWORKS = {
  BSC: 'bsc',
  ETHEREUM: 'ethereum',
  POLYGON: 'polygon',
  AVALANCHE: 'avalanche',
  ARBITRUM: 'arbitrum',
  OPTIMISM: 'optimism'
};

const CONTRACT_ADDRESSES = {
  // LayerZero V1 Infrastructure (src/abis/layerzero/v1/)
  LAYERZERO_V1: {
    OFT: '0xe71BdFe1dF69284F00EE185cF0d95d0C7680C0D4', // LayerZeroV1OFT.json
    ENDPOINT: '0x66A71Dcef29A0fFBDBE3c6a460a3B5BC225Cd675', // LayerZeroV1Endpoint.json
    network: NETWORKS.BSC,
    description: 'LayerZero V1 cross-chain messaging infrastructure',
    abiPath: 'src/abis/layerzero/v1/'
  },

  // LayerZero V2 Infrastructure (src/abis/layerzero/v2/)
  LAYERZERO_V2: {
    OFT: '0x6985884C4392D348587B19cb9eAAf157F13271cd', // LayerZeroV2OFT.json
    ENDPOINT: '0x1a44076050125825900e736c501f859c50fE728c', // LayerZeroV2Endpoint.json
    ADAPTER: '0x211Cc4DD073734dA055fbF44a2b4667d5E5fE5d2', // LayerZeroV2Adapter.json
    network: NETWORKS.BSC,
    description: 'LayerZero V2 enhanced cross-chain messaging',
    abiPath: 'src/abis/layerzero/v2/'
  },

  // Cross-Chain Bridge Infrastructure (src/abis/bridges/)
  BRIDGES: {
    LAYERZERO_BRIDGE: {
      address: '0x8C0479c5173DdD98A22d283233f86189CCb7C027',
      network: NETWORKS.BSC,
      description: 'LayerZero Token Bridge',
      abiPath: 'src/abis/bridges/LayerZeroTokenBridge.json'
    },
    WORMHOLE: {
      address: '0x381752f5458282d317d12C30D2Bd4D6E1FD8841e',
      network: NETWORKS.BSC,
      description: 'Wormhole token bridge for cross-chain asset transfers',
      abiPath: 'src/abis/bridges/WormholeTokenBridge.json'
    },
    CCIP: {
      address: '0x80226fc0ee2b096224eeac085bb9a8cba1146f7d',
      network: NETWORKS.BSC,
      description: 'Chainlink CCIP bridge for secure cross-chain messaging',
      abiPath: 'src/abis/bridges/CCIPBridge.json'
    },
    AXELAR: {
      address: '0x99B5FA03a5ea4315725c43346e55a6A6fbd94098',
      network: NETWORKS.BSC,
      description: 'Axelar Gateway for universal cross-chain connectivity',
      abiPath: 'src/abis/infrastructure/AxelarGateway.json'
    },
    HYPERLANE: {
      address: '0xBFA300164A04437D64Afda390736e6DC45096da1',
      network: NETWORKS.BSC,
      description: 'Hyperlane Mailbox for permissionless cross-chain messaging',
      abiPath: 'src/abis/infrastructure/Mailbox.json'
    }
  },

  // Token Contracts (src/abis/tokens/)
  TOKENS: {
    CROSSCHAIN_USDT: {
      address: '0xcc1b99dDAc1a33c201a742A1851662E87BC7f22C',
      network: NETWORKS.BSC,
      description: 'Cross-chain USDT via LayerZero OFT',
      abiPath: 'src/abis/tokens/CrossChainUSDT.json',
      logo: 'public/images/tokens/crosschain-usdt.png'
    },
    USDT_BSC: {
      address: '0x55d398326f99059fF775485246999027B3197955',
      network: NETWORKS.BSC,
      description: 'Native USDT token on BSC',
      abiPath: 'src/abis/tokens/ERC20.json',
      logo: 'public/images/tokens/usdt.png'
    }
  },

  // Oracle and Validation Infrastructure (src/abis/infrastructure/)
  ORACLES: {
    CHAINLINK_USDT_USD: {
      address: '0x3E7d1eAB13ad0104d2750B8863b489D65364e32D',
      network: NETWORKS.BSC,
      description: 'Chainlink USDT/USD price feed aggregator',
      abiPath: 'src/abis/infrastructure/ChainlinkPriceFeed.json'
    },
    ORACLE_VALIDATOR: {
      address: '0x47Fb2585D2C56Fe188D0E6ec628a38b74fCeeeDf',
      network: NETWORKS.BSC,
      description: 'Oracle price validation contract',
      abiPath: 'src/abis/infrastructure/OracleValidator.json'
    },
    CROSSCHAIN_VALIDATOR: {
      address: '0xec48E52D960E54a179f70907bF28b105813877ee',
      network: NETWORKS.BSC,
      description: 'Cross-chain transaction validator',
      abiPath: 'src/abis/infrastructure/CrossChainValidator.json'
    }
  },

  // Standard Interfaces (src/abis/interfaces/)
  INTERFACES: {
    IERC20: {
      address: '0x0000000000000000000000000000000000000000',
      description: 'Standard ERC20 interface placeholder',
      abiPath: 'src/abis/interfaces/IERC20.json'
    }
  },

  // Template Deployment Addresses (for contract deployment feature)
  TEMPLATES: {
    OFT_FACTORY: {
      address: null, // To be deployed
      network: NETWORKS.BSC,
      description: 'LayerZero OFT Factory for token deployment',
      templatePath: 'src/contracts/templates/layerzero/OFT.sol'
    },
    OFT_ADAPTER_FACTORY: {
      address: null, // To be deployed
      network: NETWORKS.BSC,
      description: 'LayerZero OFT Adapter Factory',
      templatePath: 'src/contracts/templates/layerzero/OFTAdapter.sol'
    },
    MINTABLE_TOKEN_FACTORY: {
      address: null, // To be deployed
      network: NETWORKS.BSC,
      description: 'Mintable ERC20 Token Factory',
      templatePath: 'src/contracts/templates/erc20/MintableToken.sol'
    }
  }
};

// Chain-specific endpoint mappings aligned with project structure
const CHAIN_ENDPOINTS = {
  [NETWORKS.BSC]: {
    layerzeroV1: CONTRACT_ADDRESSES.LAYERZERO_V1.ENDPOINT,
    layerzeroV2: CONTRACT_ADDRESSES.LAYERZERO_V2.ENDPOINT,
    chainId: 56,
    lzChainId: 102, // LayerZero chain ID for BSC
    rpcUrls: [
      'https://bsc-dataseed1.binance.org/',
      'https://bsc-dataseed2.binance.org/',
      'https://bsc-dataseed3.binance.org/'
    ],
    blockExplorer: 'https://bscscan.com',
    nativeCurrency: {
      name: 'BNB',
      symbol: 'BNB',
      decimals: 18,
      logo: 'public/images/tokens/bnb-logo.png'
    }
  },
  [NETWORKS.ETHEREUM]: {
    layerzeroV1: '0x66A71Dcef29A0fFBDBE3c6a460a3B5BC225Cd675',
    layerzeroV2: '0x1a44076050125825900e736c501f859c50fE728c',
    chainId: 1,
    lzChainId: 101,
    rpcUrls: [
      'https://mainnet.infura.io/v3/',
      'https://eth-mainnet.alchemyapi.io/v2/'
    ],
    blockExplorer: 'https://etherscan.io',
    nativeCurrency: {
      name: 'Ethereum',
      symbol: 'ETH',
      decimals: 18,
      logo: 'public/images/tokens/eth-logo.png'
    }
  },
  [NETWORKS.POLYGON]: {
    layerzeroV1: '0x66A71Dcef29A0fFBDBE3c6a460a3B5BC225Cd675',
    layerzeroV2: '0x1a44076050125825900e736c501f859c50fE728c',
    chainId: 137,
    lzChainId: 109,
    rpcUrls: [
      'https://polygon-rpc.com/',
      'https://rpc-mainnet.matic.network'
    ],
    blockExplorer: 'https://polygonscan.com',
    nativeCurrency: {
      name: 'Polygon',
      symbol: 'MATIC',
      decimals: 18,
      logo: 'public/images/tokens/matic-logo.png'
    }
  },
  [NETWORKS.ARBITRUM]: {
    layerzeroV1: '0x66A71Dcef29A0fFBDBE3c6a460a3B5BC225Cd675',
    layerzeroV2: '0x1a44076050125825900e736c501f859c50fE728c',
    chainId: 42161,
    lzChainId: 110,
    rpcUrls: [
      'https://arb1.arbitrum.io/rpc'
    ],
    blockExplorer: 'https://arbiscan.io',
    nativeCurrency: {
      name: 'Arbitrum',
      symbol: 'ARB',
      decimals: 18,
      logo: 'public/images/tokens/arb-logo.png'
    }
  },
  [NETWORKS.OPTIMISM]: {
    layerzeroV1: '0x66A71Dcef29A0fFBDBE3c6a460a3B5BC225Cd675',
    layerzeroV2: '0x1a44076050125825900e736c501f859c50fE728c',
    chainId: 10,
    lzChainId: 111,
    rpcUrls: [
      'https://mainnet.optimism.io'
    ],
    blockExplorer: 'https://optimistic.etherscan.io',
    nativeCurrency: {
      name: 'Optimism',
      symbol: 'OP',
      decimals: 18,
      logo: 'public/images/tokens/op-logo.png'
    }
  },
  [NETWORKS.AVALANCHE]: {
    layerzeroV1: '0x66A71Dcef29A0fFBDBE3c6a460a3B5BC225Cd675',
    layerzeroV2: '0x1a44076050125825900e736c501f859c50fE728c',
    chainId: 43114,
    lzChainId: 106,
    rpcUrls: [
      'https://api.avax.network/ext/bc/C/rpc'
    ],
    blockExplorer: 'https://snowtrace.io',
    nativeCurrency: {
      name: 'Avalanche',
      symbol: 'AVAX',
      decimals: 18,
      logo: 'public/images/tokens/avax-logo.png'
    }
  }
};

// Contract categories for easy filtering (aligned with project structure)
const CONTRACT_CATEGORIES = {
  BRIDGES: 'bridges',
  TOKENS: 'tokens',
  ORACLES: 'oracles',
  LAYERZERO: 'layerzero',
  INTERFACES: 'interfaces',
  INFRASTRUCTURE: 'infrastructure',
  TEMPLATES: 'templates'
};

// Bridge protocol mappings (aligned with src/bridges/protocols/)
const BRIDGE_PROTOCOLS = {
  LAYERZERO: {
    name: 'LayerZero',
    protocolFile: 'src/bridges/protocols/layerzero-bridge.js',
    logo: 'public/images/bridges/layerzero-bridge-64.png',
    supportedChains: [NETWORKS.BSC, NETWORKS.ETHEREUM, NETWORKS.POLYGON, NETWORKS.ARBITRUM, NETWORKS.OPTIMISM, NETWORKS.AVALANCHE]
  },
  WORMHOLE: {
    name: 'Wormhole',
    protocolFile: 'src/bridges/protocols/wormhole-bridge.js',
    logo: 'public/images/bridges/wormhole-bridge-64.png',
    supportedChains: [NETWORKS.BSC, NETWORKS.ETHEREUM, NETWORKS.POLYGON, NETWORKS.ARBITRUM, NETWORKS.OPTIMISM, NETWORKS.AVALANCHE]
  },
  CCIP: {
    name: 'Chainlink CCIP',
    protocolFile: 'src/bridges/protocols/chainlink-bridge.js',
    logo: 'public/images/bridges/chainlink-bridge-64.png',
    supportedChains: [NETWORKS.ETHEREUM, NETWORKS.POLYGON, NETWORKS.ARBITRUM, NETWORKS.OPTIMISM, NETWORKS.AVALANCHE]
  },
  AXELAR: {
    name: 'Axelar',
    protocolFile: 'src/bridges/protocols/axelar-bridge.js',
    logo: 'public/images/bridges/axelar-bridge-64.png',
    supportedChains: [NETWORKS.BSC, NETWORKS.ETHEREUM, NETWORKS.POLYGON, NETWORKS.ARBITRUM, NETWORKS.OPTIMISM, NETWORKS.AVALANCHE]
  },
  HYPERLANE: {
    name: 'Hyperlane',
    protocolFile: 'src/bridges/protocols/hyperlane-bridge.js',
    logo: 'public/images/bridges/hyperlane-bridge-64.png',
    supportedChains: [NETWORKS.BSC, NETWORKS.ETHEREUM, NETWORKS.POLYGON, NETWORKS.ARBITRUM, NETWORKS.OPTIMISM, NETWORKS.AVALANCHE]
  }
};

// Deployment template configurations (for missing deployment features)
const DEPLOYMENT_TEMPLATES = {
  LAYERZERO_OFT: {
    name: 'LayerZero OFT Token',
    description: 'Cross-chain token using LayerZero V2 OFT standard',
    templatePath: 'src/contracts/templates/layerzero/OFT.sol',
    previewImage: 'public/images/templates/oft-template-preview.png',
    category: 'layerzero',
    features: ['Cross-chain transfers', 'Omnichain fungible token', 'LayerZero V2 integration'],
    parameters: [
      { name: 'name', type: 'string', required: true, description: 'Token name' },
      { name: 'symbol', type: 'string', required: true, description: 'Token symbol' },
      { name: 'decimals', type: 'uint8', default: '18', description: 'Token decimals' },
      { name: 'endpoint', type: 'address', required: true, description: 'LayerZero endpoint address' }
    ]
  },
  MINTABLE_TOKEN: {
    name: 'Mintable ERC20 Token',
    description: 'Standard ERC20 token with minting capability',
    templatePath: 'src/contracts/templates/erc20/MintableToken.sol',
    previewImage: 'public/images/templates/mintable-token-preview.png',
    category: 'erc20',
    features: ['Mintable', 'Ownable', 'Standard ERC20'],
    parameters: [
      { name: 'name', type: 'string', required: true, description: 'Token name' },
      { name: 'symbol', type: 'string', required: true, description: 'Token symbol' },
      { name: 'initialSupply', type: 'uint256', default: '1000000', description: 'Initial token supply' }
    ]
  },
  GOVERNANCE_TOKEN: {
    name: 'Governance Token',
    description: 'DAO governance token with voting capabilities',
    templatePath: 'src/contracts/templates/erc20/GovernanceToken.sol',
    previewImage: 'public/images/templates/governance-token-preview.png',
    category: 'governance',
    features: ['Voting power', 'Delegation', 'DAO compatible'],
    parameters: [
      { name: 'name', type: 'string', required: true, description: 'Token name' },
      { name: 'symbol', type: 'string', required: true, description: 'Token symbol' },
      { name: 'initialSupply', type: 'uint256', default: '1000000', description: 'Initial token supply' }
    ]
  }
};

module.exports = {
  CONTRACT_ADDRESSES,
  NETWORKS,
  CHAIN_ENDPOINTS,
  CONTRACT_CATEGORIES,
  BRIDGE_PROTOCOLS,
  DEPLOYMENT_TEMPLATES
};
