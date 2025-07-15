// config/token.config.js
// Enhanced Production Token Configuration - Canonical token metadata for all supported chains
// Integrates with Trust Crypto Wallet structure and LayerZero cross-chain deployments

const { CHAINS } = require('./chains.config');

// Chain IDs mapped to Trust Crypto Wallet structure
const CHAIN_IDS = Object.freeze({
  // ── Mainnets ───────────────────────────────────────────────
  [CHAINS.ETHEREUM]: 1,
  [CHAINS.POLYGON]: 137,
  [CHAINS.BSC]: 56,
  [CHAINS.ARBITRUM]: 42161,
  [CHAINS.AVALANCHE]: 43114,
  [CHAINS.OPTIMISM]: 10,
  [CHAINS.BASE]: 8453,

  // ── Testnets ───────────────────────────────────────────────
  ETHEREUM_SEPOLIA: 11155111,
  ARBITRUM_SEPOLIA: 421614,
  OPTIMISM_SEPOLIA: 11155420,
  BSC_TESTNET: 97,
  AVALANCHE_FUJI: 43113,
  POLYGON_AMOY: 80002,
  BASE_SEPOLIA: 84532
});

// Token categories for enhanced classification
const TOKEN_CATEGORIES = Object.freeze({
  NATIVE: 'native',
  STABLECOIN: 'stablecoin',
  WRAPPED: 'wrapped',
  DEFI: 'defi',
  GOVERNANCE: 'governance',
  CROSSCHAIN: 'crosschain',
  BRIDGE: 'bridge',
  YIELD: 'yield'
});

// Token risk levels for security analysis
const RISK_LEVELS = Object.freeze({
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  UNVERIFIED: 'unverified'
});

// Helper to build logo paths
const logo = (file) => `/images/tokens/${file}`;
const UNKNOWN = logo('unknown-token.png');

// Enhanced base token configurations
const BASE_TOKENS = Object.freeze({
  ETH: {
    symbol: 'ETH',
    name: 'Ether',
    decimals: 18,
    isNative: true,
    category: TOKEN_CATEGORIES.NATIVE,
    riskLevel: RISK_LEVELS.LOW,
    logoURI: logo('eth-logo.png'),
    coingeckoId: 'ethereum',
    verified: true,
    tags: ['gas', 'native', 'defi']
  },
  WETH: {
    symbol: 'WETH',
    name: 'Wrapped Ether',
    decimals: 18,
    isNative: false,
    category: TOKEN_CATEGORIES.WRAPPED,
    riskLevel: RISK_LEVELS.LOW,
    logoURI: logo('weth-logo.png'),
    coingeckoId: 'weth',
    verified: true,
    tags: ['wrapped', 'defi', 'trading']
  },
  USDC: {
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    isNative: false,
    category: TOKEN_CATEGORIES.STABLECOIN,
    riskLevel: RISK_LEVELS.LOW,
    logoURI: logo('usdc.png'),
    coingeckoId: 'usd-coin',
    verified: true,
    tags: ['stablecoin', 'trading', 'defi']
  },
  USDT: {
    symbol: 'USDT',
    name: 'Tether USD',
    decimals: 6,
    isNative: false,
    category: TOKEN_CATEGORIES.STABLECOIN,
    riskLevel: RISK_LEVELS.LOW,
    logoURI: logo('usdt.png'),
    coingeckoId: 'tether',
    verified: true,
    tags: ['stablecoin', 'trading', 'defi']
  },
  DAI: {
    symbol: 'DAI',
    name: 'Dai Stablecoin',
    decimals: 18,
    isNative: false,
    category: TOKEN_CATEGORIES.STABLECOIN,
    riskLevel: RISK_LEVELS.LOW,
    logoURI: logo('dai.png'),
    coingeckoId: 'dai',
    verified: true,
    tags: ['stablecoin', 'defi', 'makerdao']
  },
  WBTC: {
    symbol: 'WBTC',
    name: 'Wrapped Bitcoin',
    decimals: 8,
    isNative: false,
    category: TOKEN_CATEGORIES.WRAPPED,
    riskLevel: RISK_LEVELS.LOW,
    logoURI: logo('wbtc.png'),
    coingeckoId: 'wrapped-bitcoin',
    verified: true,
    tags: ['wrapped', 'bitcoin', 'defi']
  }
});

// Enhanced token configurations per chain
const TOKENS = Object.freeze({
  // ── Ethereum Mainnet ───────────────────────────────────────
  [CHAIN_IDS[CHAINS.ETHEREUM]]: [
    {
      ...BASE_TOKENS.ETH,
      address: 'native',
      chainId: CHAIN_IDS[CHAINS.ETHEREUM],
      bridgeSupport: ['layerzero', 'wormhole', 'axelar']
    },
    {
      ...BASE_TOKENS.WETH,
      address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
      chainId: CHAIN_IDS[CHAINS.ETHEREUM],
      bridgeSupport: ['layerzero', 'wormhole']
    },
    {
      ...BASE_TOKENS.USDC,
      address: '0xA0b86a33E6441E6fb7ae73e9bee7D3a8b7A4Cb4',
      chainId: CHAIN_IDS[CHAINS.ETHEREUM],
      bridgeSupport: ['layerzero', 'wormhole', 'axelar', 'chainlink-ccip']
    },
    {
      ...BASE_TOKENS.USDT,
      address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      chainId: CHAIN_IDS[CHAINS.ETHEREUM],
      bridgeSupport: ['layerzero', 'wormhole', 'axelar']
    },
    {
      ...BASE_TOKENS.DAI,
      address: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
      chainId: CHAIN_IDS[CHAINS.ETHEREUM],
      bridgeSupport: ['layerzero', 'wormhole']
    },
    {
      ...BASE_TOKENS.WBTC,
      address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
      chainId: CHAIN_IDS[CHAINS.ETHEREUM],
      bridgeSupport: ['layerzero', 'wormhole']
    },
    {
      symbol: 'UNI',
      name: 'Uniswap',
      address: '0x1F9840a85d5aF5bf1D1762F925BDADdC4201F984',
      decimals: 18,
      isNative: false,
      category: TOKEN_CATEGORIES.GOVERNANCE,
      riskLevel: RISK_LEVELS.MEDIUM,
      logoURI: logo('uni-logo.png'),
      coingeckoId: 'uniswap',
      verified: true,
      tags: ['governance', 'defi', 'dex'],
      chainId: CHAIN_IDS[CHAINS.ETHEREUM],
      bridgeSupport: ['layerzero']
    },
    {
      symbol: 'AAVE',
      name: 'Aave',
      address: '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9',
      decimals: 18,
      isNative: false,
      category: TOKEN_CATEGORIES.GOVERNANCE,
      riskLevel: RISK_LEVELS.MEDIUM,
      logoURI: logo('aave-logo.png'),
      coingeckoId: 'aave',
      verified: true,
      tags: ['governance', 'defi', 'lending'],
      chainId: CHAIN_IDS[CHAINS.ETHEREUM],
      bridgeSupport: ['layerzero']
    },
    // Cross-Chain USDT from wallet structure
    {
      symbol: 'CROSS-USDT',
      name: 'Cross-Chain USDT',
      address: '0xcc1b99dDAc1a33c201a742A1851662E87BC7f22C',
      decimals: 6,
      isNative: false,
      category: TOKEN_CATEGORIES.CROSSCHAIN,
      riskLevel: RISK_LEVELS.LOW,
      logoURI: logo('crosschain-usdt.png'),
      coingeckoId: 'tether',
      verified: true,
      tags: ['crosschain', 'stablecoin', 'layerzero'],
      chainId: CHAIN_IDS[CHAINS.ETHEREUM],
      bridgeSupport: ['layerzero'],
      isLayerZeroOFT: true
    }
  ],

  // ── Polygon Mainnet ────────────────────────────────────────
  [CHAIN_IDS[CHAINS.POLYGON]]: [
    {
      symbol: 'MATIC',
      name: 'Polygon',
      address: 'native',
      decimals: 18,
      isNative: true,
      category: TOKEN_CATEGORIES.NATIVE,
      riskLevel: RISK_LEVELS.LOW,
      logoURI: logo('matic-logo.png'),
      coingeckoId: 'matic-network',
      verified: true,
      tags: ['gas', 'native', 'defi'],
      chainId: CHAIN_IDS[CHAINS.POLYGON],
      bridgeSupport: ['layerzero', 'wormhole', 'axelar']
    },
    {
      ...BASE_TOKENS.WETH,
      symbol: 'WETH',
      address: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619',
      chainId: CHAIN_IDS[CHAINS.POLYGON],
      bridgeSupport: ['layerzero', 'wormhole']
    },
    {
      ...BASE_TOKENS.USDC,
      address: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
      chainId: CHAIN_IDS[CHAINS.POLYGON],
      bridgeSupport: ['layerzero', 'wormhole', 'axelar']
    },
    {
      ...BASE_TOKENS.USDT,
      address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
      chainId: CHAIN_IDS[CHAINS.POLYGON],
      bridgeSupport: ['layerzero', 'wormhole']
    },
    {
      ...BASE_TOKENS.DAI,
      address: '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063',
      chainId: CHAIN_IDS[CHAINS.POLYGON],
      bridgeSupport: ['layerzero', 'wormhole']
    },
    {
      ...BASE_TOKENS.WBTC,
      address: '0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6',
      chainId: CHAIN_IDS[CHAINS.POLYGON],
      bridgeSupport: ['layerzero', 'wormhole']
    },
    // Cross-Chain USDT
    {
      symbol: 'CROSS-USDT',
      name: 'Cross-Chain USDT',
      address: '0xcc1b99dDAc1a33c201a742A1851662E87BC7f22C',
      decimals: 6,
      isNative: false,
      category: TOKEN_CATEGORIES.CROSSCHAIN,
      riskLevel: RISK_LEVELS.LOW,
      logoURI: logo('crosschain-usdt.png'),
      coingeckoId: 'tether',
      verified: true,
      tags: ['crosschain', 'stablecoin', 'layerzero'],
      chainId: CHAIN_IDS[CHAINS.POLYGON],
      bridgeSupport: ['layerzero'],
      isLayerZeroOFT: true
    }
  ],

  // ── BSC Mainnet ────────────────────────────────────────────
  [CHAIN_IDS[CHAINS.BSC]]: [
    {
      symbol: 'BNB',
      name: 'Binance Coin',
      address: 'native',
      decimals: 18,
      isNative: true,
      category: TOKEN_CATEGORIES.NATIVE,
      riskLevel: RISK_LEVELS.LOW,
      logoURI: logo('bnb-logo.png'),
      coingeckoId: 'binancecoin',
      verified: true,
      tags: ['gas', 'native', 'defi'],
      chainId: CHAIN_IDS[CHAINS.BSC],
      bridgeSupport: ['layerzero', 'wormhole', 'axelar']
    },
    {
      symbol: 'WBNB',
      name: 'Wrapped BNB',
      address: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
      decimals: 18,
      isNative: false,
      category: TOKEN_CATEGORIES.WRAPPED,
      riskLevel: RISK_LEVELS.LOW,
      logoURI: logo('bnb-logo.png'),
      coingeckoId: 'wbnb',
      verified: true,
      tags: ['wrapped', 'defi', 'trading'],
      chainId: CHAIN_IDS[CHAINS.BSC],
      bridgeSupport: ['layerzero', 'wormhole']
    },
    {
      ...BASE_TOKENS.USDC,
      address: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
      decimals: 18, // BSC USDC has 18 decimals
      chainId: CHAIN_IDS[CHAINS.BSC],
      bridgeSupport: ['layerzero', 'wormhole', 'axelar']
    },
    {
      ...BASE_TOKENS.USDT,
      address: '0x55d398326f99059fF775485246999027B3197955',
      decimals: 18, // BSC USDT has 18 decimals
      chainId: CHAIN_IDS[CHAINS.BSC],
      bridgeSupport: ['layerzero', 'wormhole']
    },
    {
      ...BASE_TOKENS.WBTC,
      address: '0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c',
      chainId: CHAIN_IDS[CHAINS.BSC],
      bridgeSupport: ['layerzero', 'wormhole']
    },
    // Cross-Chain USDT
    {
      symbol: 'CROSS-USDT',
      name: 'Cross-Chain USDT',
      address: '0xcc1b99dDAc1a33c201a742A1851662E87BC7f22C',
      decimals: 6,
      isNative: false,
      category: TOKEN_CATEGORIES.CROSSCHAIN,
      riskLevel: RISK_LEVELS.LOW,
      logoURI: logo('crosschain-usdt.png'),
      coingeckoId: 'tether',
      verified: true,
      tags: ['crosschain', 'stablecoin', 'layerzero'],
      chainId: CHAIN_IDS[CHAINS.BSC],
      bridgeSupport: ['layerzero'],
      isLayerZeroOFT: true
    }
  ],

  // ── Arbitrum Mainnet ───────────────────────────────────────
  [CHAIN_IDS[CHAINS.ARBITRUM]]: [
    {
      ...BASE_TOKENS.ETH,
      address: 'native',
      chainId: CHAIN_IDS[CHAINS.ARBITRUM],
      bridgeSupport: ['layerzero', 'wormhole', 'axelar']
    },
    {
      symbol: 'ARB',
      name: 'Arbitrum',
      address: '0x912CE59144191C1204E64559FE8253a0e49E6548',
      decimals: 18,
      isNative: false,
      category: TOKEN_CATEGORIES.GOVERNANCE,
      riskLevel: RISK_LEVELS.MEDIUM,
      logoURI: logo('arb-logo.png'),
      coingeckoId: 'arbitrum',
      verified: true,
      tags: ['governance', 'layer2', 'arbitrum'],
      chainId: CHAIN_IDS[CHAINS.ARBITRUM],
      bridgeSupport: ['layerzero']
    },
    {
      ...BASE_TOKENS.WETH,
      address: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
      chainId: CHAIN_IDS[CHAINS.ARBITRUM],
      bridgeSupport: ['layerzero', 'wormhole']
    },
    {
      ...BASE_TOKENS.USDC,
      address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      chainId: CHAIN_IDS[CHAINS.ARBITRUM],
      bridgeSupport: ['layerzero', 'wormhole', 'axelar']
    },
    {
      ...BASE_TOKENS.USDT,
      address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
      chainId: CHAIN_IDS[CHAINS.ARBITRUM],
      bridgeSupport: ['layerzero', 'wormhole']
    },
    {
      ...BASE_TOKENS.WBTC,
      address: '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f',
      chainId: CHAIN_IDS[CHAINS.ARBITRUM],
      bridgeSupport: ['layerzero', 'wormhole']
    },
    // Cross-Chain USDT
    {
      symbol: 'CROSS-USDT',
      name: 'Cross-Chain USDT',
      address: '0xcc1b99dDAc1a33c201a742A1851662E87BC7f22C',
      decimals: 6,
      isNative: false,
      category: TOKEN_CATEGORIES.CROSSCHAIN,
      riskLevel: RISK_LEVELS.LOW,
      logoURI: logo('crosschain-usdt.png'),
      coingeckoId: 'tether',
      verified: true,
      tags: ['crosschain', 'stablecoin', 'layerzero'],
      chainId: CHAIN_IDS[CHAINS.ARBITRUM],
      bridgeSupport: ['layerzero'],
      isLayerZeroOFT: true
    }
  ],

  // ── Optimism Mainnet ───────────────────────────────────────
  [CHAIN_IDS[CHAINS.OPTIMISM]]: [
    {
      ...BASE_TOKENS.ETH,
      address: 'native',
      chainId: CHAIN_IDS[CHAINS.OPTIMISM],
      bridgeSupport: ['layerzero', 'wormhole', 'axelar']
    },
    {
      symbol: 'OP',
      name: 'Optimism',
      address: '0x4200000000000000000000000000000000000042',
      decimals: 18,
      isNative: false,
      category: TOKEN_CATEGORIES.GOVERNANCE,
      riskLevel: RISK_LEVELS.MEDIUM,
      logoURI: logo('op-logo.png'),
      coingeckoId: 'optimism',
      verified: true,
      tags: ['governance', 'layer2', 'optimism'],
      chainId: CHAIN_IDS[CHAINS.OPTIMISM],
      bridgeSupport: ['layerzero']
    },
    {
      ...BASE_TOKENS.WETH,
      address: '0x4200000000000000000000000000000000000006',
      chainId: CHAIN_IDS[CHAINS.OPTIMISM],
      bridgeSupport: ['layerzero', 'wormhole']
    },
    {
      ...BASE_TOKENS.USDC,
      address: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
      chainId: CHAIN_IDS[CHAINS.OPTIMISM],
      bridgeSupport: ['layerzero', 'wormhole', 'axelar']
    },
    {
      ...BASE_TOKENS.USDT,
      address: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58',
      chainId: CHAIN_IDS[CHAINS.OPTIMISM],
      bridgeSupport: ['layerzero', 'wormhole']
    },
    // Cross-Chain USDT
    {
      symbol: 'CROSS-USDT',
      name: 'Cross-Chain USDT',
      address: '0xcc1b99dDAc1a33c201a742A1851662E87BC7f22C',
      decimals: 6,
      isNative: false,
      category: TOKEN_CATEGORIES.CROSSCHAIN,
      riskLevel: RISK_LEVELS.LOW,
      logoURI: logo('crosschain-usdt.png'),
      coingeckoId: 'tether',
      verified: true,
      tags: ['crosschain', 'stablecoin', 'layerzero'],
      chainId: CHAIN_IDS[CHAINS.OPTIMISM],
      bridgeSupport: ['layerzero'],
      isLayerZeroOFT: true
    }
  ],

  // ── Avalanche Mainnet ──────────────────────────────────────
  [CHAIN_IDS[CHAINS.AVALANCHE]]: [
    {
      symbol: 'AVAX',
      name: 'Avalanche',
      address: 'native',
      decimals: 18,
      isNative: true,
      category: TOKEN_CATEGORIES.NATIVE,
      riskLevel: RISK_LEVELS.LOW,
      logoURI: logo('avax-logo.png'),
      coingeckoId: 'avalanche-2',
      verified: true,
      tags: ['gas', 'native', 'defi'],
      chainId: CHAIN_IDS[CHAINS.AVALANCHE],
      bridgeSupport: ['layerzero', 'wormhole', 'axelar']
    },
    {
      symbol: 'WAVAX',
      name: 'Wrapped AVAX',
      address: '0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7',
      decimals: 18,
      isNative: false,
      category: TOKEN_CATEGORIES.WRAPPED,
      riskLevel: RISK_LEVELS.LOW,
      logoURI: logo('avax-logo.png'),
      coingeckoId: 'wrapped-avax',
      verified: true,
      tags: ['wrapped', 'defi', 'trading'],
      chainId: CHAIN_IDS[CHAINS.AVALANCHE],
      bridgeSupport: ['layerzero', 'wormhole']
    },
    {
      ...BASE_TOKENS.USDC,
      address: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E',
      chainId: CHAIN_IDS[CHAINS.AVALANCHE],
      bridgeSupport: ['layerzero', 'wormhole', 'axelar']
    },
    {
      ...BASE_TOKENS.USDT,
      address: '0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7',
      chainId: CHAIN_IDS[CHAINS.AVALANCHE],
      bridgeSupport: ['layerzero', 'wormhole']
    },
    // Cross-Chain USDT
    {
      symbol: 'CROSS-USDT',
      name: 'Cross-Chain USDT',
      address: '0xcc1b99dDAc1a33c201a742A1851662E87BC7f22C',
      decimals: 6,
      isNative: false,
      category: TOKEN_CATEGORIES.CROSSCHAIN,
      riskLevel: RISK_LEVELS.LOW,
      logoURI: logo('crosschain-usdt.png'),
      coingeckoId: 'tether',
      verified: true,
      tags: ['crosschain', 'stablecoin', 'layerzero'],
      chainId: CHAIN_IDS[CHAINS.AVALANCHE],
      bridgeSupport: ['layerzero'],
      isLayerZeroOFT: true
    }
  ],

  // ── Base Mainnet ───────────────────────────────────────────
  [CHAIN_IDS[CHAINS.BASE]]: [
    {
      ...BASE_TOKENS.ETH,
      address: 'native',
      chainId: CHAIN_IDS[CHAINS.BASE],
      bridgeSupport: ['layerzero', 'wormhole']
    },
    {
      ...BASE_TOKENS.USDC,
      address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      chainId: CHAIN_IDS[CHAINS.BASE],
      bridgeSupport: ['layerzero', 'wormhole']
    },
    // Cross-Chain USDT
    {
      symbol: 'CROSS-USDT',
      name: 'Cross-Chain USDT',
      address: '0xcc1b99dDAc1a33c201a742A1851662E87BC7f22C',
      decimals: 6,
      isNative: false,
      category: TOKEN_CATEGORIES.CROSSCHAIN,
      riskLevel: RISK_LEVELS.LOW,
      logoURI: logo('crosschain-usdt.png'),
      coingeckoId: 'tether',
      verified: true,
      tags: ['crosschain', 'stablecoin', 'layerzero'],
      chainId: CHAIN_IDS[CHAINS.BASE],
      bridgeSupport: ['layerzero'],
      isLayerZeroOFT: true
    }
  ],

  // ── Testnets (native only) ─────────────────────────────────
  [CHAIN_IDS.ETHEREUM_SEPOLIA]: [
    {
      ...BASE_TOKENS.ETH,
      address: 'native',
      chainId: CHAIN_IDS.ETHEREUM_SEPOLIA,
      bridgeSupport: ['layerzero-testnet']
    }
  ],
  [CHAIN_IDS.ARBITRUM_SEPOLIA]: [
    {
      ...BASE_TOKENS.ETH,
      address: 'native',
      chainId: CHAIN_IDS.ARBITRUM_SEPOLIA,
      bridgeSupport: ['layerzero-testnet']
    }
  ],
  [CHAIN_IDS.OPTIMISM_SEPOLIA]: [
    {
      ...BASE_TOKENS.ETH,
      address: 'native',
      chainId: CHAIN_IDS.OPTIMISM_SEPOLIA,
      bridgeSupport: ['layerzero-testnet']
    }
  ],
  [CHAIN_IDS.BSC_TESTNET]: [
    {
      symbol: 'tBNB',
      name: 'Test BNB',
      address: 'native',
      decimals: 18,
      isNative: true,
      category: TOKEN_CATEGORIES.NATIVE,
      riskLevel: RISK_LEVELS.LOW,
      logoURI: logo('bnb-logo.png'),
      coingeckoId: 'binancecoin',
      verified: true,
      tags: ['gas', 'native', 'testnet'],
      chainId: CHAIN_IDS.BSC_TESTNET,
      bridgeSupport: ['layerzero-testnet']
    }
  ],
  [CHAIN_IDS.AVALANCHE_FUJI]: [
    {
      symbol: 'AVAX',
      name: 'Avalanche',
      address: 'native',
      decimals: 18,
      isNative: true,
      category: TOKEN_CATEGORIES.NATIVE,
      riskLevel: RISK_LEVELS.LOW,
      logoURI: logo('avax-logo.png'),
      coingeckoId: 'avalanche-2',
      verified: true,
      tags: ['gas', 'native', 'testnet'],
      chainId: CHAIN_IDS.AVALANCHE_FUJI,
      bridgeSupport: ['layerzero-testnet']
    }
  ],
  [CHAIN_IDS.POLYGON_AMOY]: [
    {
      symbol: 'MATIC',
      name: 'Polygon',
      address: 'native',
      decimals: 18,
      isNative: true,
      category: TOKEN_CATEGORIES.NATIVE,
      riskLevel: RISK_LEVELS.LOW,
      logoURI: logo('matic-logo.png'),
      coingeckoId: 'matic-network',
      verified: true,
      tags: ['gas', 'native', 'testnet'],
      chainId: CHAIN_IDS.POLYGON_AMOY,
      bridgeSupport: ['layerzero-testnet']
    }
  ]
});

// Enhanced token configs for chains.config.js integration
const TOKEN_CONFIGS = Object.freeze({
  [CHAINS.ETHEREUM]: { nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 } },
  [CHAINS.POLYGON]: { nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 } },
  [CHAINS.BSC]: { nativeCurrency: { name: 'Binance Coin', symbol: 'BNB', decimals: 18 } },
  [CHAINS.ARBITRUM]: { nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 } },
  [CHAINS.AVALANCHE]: { nativeCurrency: { name: 'Avalanche', symbol: 'AVAX', decimals: 18 } },
  [CHAINS.OPTIMISM]: { nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 } },
  [CHAINS.BASE]: { nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 } },

  // Testnets
  sepolia: { nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 } },
  arbitrumSepolia: { nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 } },
  optimismSepolia: { nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 } },
  bscTestnet: { nativeCurrency: { name: 'Test BNB', symbol: 'tBNB', decimals: 18 } },
  avalancheFuji: { nativeCurrency: { name: 'Avalanche', symbol: 'AVAX', decimals: 18 } },
  polygonAmoy: { nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 } },
  baseSepolia: { nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 } }
});

// Popular token list for quick access
const POPULAR_TOKENS = Object.freeze({
  stablecoins: ['USDC', 'USDT', 'DAI', 'CROSS-USDT'],
  wrapped: ['WETH', 'WBTC', 'WBNB', 'WAVAX'],
  governance: ['UNI', 'AAVE', 'ARB', 'OP'],
  layer2: ['ARB', 'OP'],
  crosschain: ['CROSS-USDT']
});

// Bridge support mapping
const BRIDGE_PROTOCOLS = Object.freeze({
  LAYERZERO: 'layerzero',
  WORMHOLE: 'wormhole',
  AXELAR: 'axelar',
  CHAINLINK_CCIP: 'chainlink-ccip',
  HYPERLANE: 'hyperlane',
  MULTICHAIN: 'multichain'
});

// Token validation rules
const TOKEN_VALIDATION = Object.freeze({
  maxSymbolLength: 10,
  maxNameLength: 50,
  minDecimals: 0,
  maxDecimals: 18,
  requiredFields: ['symbol', 'name', 'address', 'decimals', 'chainId'],
  validCategories: Object.values(TOKEN_CATEGORIES),
  validRiskLevels: Object.values(RISK_LEVELS)
});

// Helper utilities with enhanced functionality
const getTokensForChain = (chainId) => {
  const tokens = TOKENS[chainId] || [];
  return tokens.map(token => ({
    ...token,
    chainId,
    id: `${chainId}-${token.address}`,
    isTestnet: isTestnet(chainId)
  }));
};

const findTokenBySymbol = (chainId, symbol) => {
  const tokens = TOKENS[chainId] || [];
  return tokens.find(
    (t) => t.symbol.toLowerCase() === symbol.toLowerCase()
  ) || null;
};

const findTokenByAddress = (chainId, address) => {
  const tokens = TOKENS[chainId] || [];
  return tokens.find(
    (t) => t.address.toLowerCase() === address.toLowerCase()
  ) || null;
};

const getNativeToken = (chainId) => {
  const tokens = TOKENS[chainId] || [];
  return tokens.find((t) => t.isNative) || null;
};

const getTokensByCategory = (chainId, category) => {
  const tokens = TOKENS[chainId] || [];
  return tokens.filter((t) => t.category === category);
};

const getStablecoins = (chainId) => getTokensByCategory(chainId, TOKEN_CATEGORIES.STABLECOIN);

const getWrappedTokens = (chainId) => getTokensByCategory(chainId, TOKEN_CATEGORIES.WRAPPED);

const getCrossChainTokens = (chainId) => getTokensByCategory(chainId, TOKEN_CATEGORIES.CROSSCHAIN);

const getLayerZeroTokens = (chainId) => {
  const tokens = TOKENS[chainId] || [];
  return tokens.filter((t) => t.isLayerZeroOFT === true);
};

const getTokensWithBridgeSupport = (chainId, protocol) => {
  const tokens = TOKENS[chainId] || [];
  return tokens.filter((t) => t.bridgeSupport && t.bridgeSupport.includes(protocol));
};

const isNativeToken = (address) => address === 'native';

const isVerifiedToken = (chainId, address) => {
  const token = findTokenByAddress(chainId, address);
  return token ? token.verified === true : false;
};

const getTokenRiskLevel = (chainId, address) => {
  const token = findTokenByAddress(chainId, address);
  return token ? token.riskLevel : RISK_LEVELS.UNVERIFIED;
};

const getSupportedChainIds = () => Object.values(CHAIN_IDS);

const getMainnetChainIds = () => {
  return Object.values(CHAINS).map(chain => CHAIN_IDS[chain]).filter(Boolean);
};

const getTestnetChainIds = () => {
  return [
    CHAIN_IDS.ETHEREUM_SEPOLIA,
    CHAIN_IDS.ARBITRUM_SEPOLIA,
    CHAIN_IDS.OPTIMISM_SEPOLIA,
    CHAIN_IDS.BSC_TESTNET,
    CHAIN_IDS.AVALANCHE_FUJI,
    CHAIN_IDS.POLYGON_AMOY,
    CHAIN_IDS.BASE_SEPOLIA
  ];
};

const getTokenConfig = (chainKey) => TOKEN_CONFIGS[chainKey] || null;

const getAllTokens = () => {
  return Object.values(TOKENS).flat().map((token, index) => ({
    ...token,
    id: `${token.chainId}-${token.address}`,
    globalIndex: index
  }));
};

const getTokensByTag = (tag) => {
  return getAllTokens().filter(token => 
    token.tags && token.tags.includes(tag)
  );
};

const searchTokens = (query, chainId = null) => {
  const tokens = chainId ? getTokensForChain(chainId) : getAllTokens();
  const searchTerm = query.toLowerCase();
  
  return tokens.filter(token => 
    token.symbol.toLowerCase().includes(searchTerm) ||
    token.name.toLowerCase().includes(searchTerm) ||
    token.address.toLowerCase().includes(searchTerm) ||
    (token.tags && token.tags.some(tag => tag.toLowerCase().includes(searchTerm)))
  );
};

const validateToken = (tokenData) => {
  const errors = [];
  
  TOKEN_VALIDATION.requiredFields.forEach(field => {
    if (!tokenData[field]) {
      errors.push(`Missing required field: ${field}`);
    }
  });
  
  if (tokenData.symbol && tokenData.symbol.length > TOKEN_VALIDATION.maxSymbolLength) {
    errors.push(`Symbol too long (max ${TOKEN_VALIDATION.maxSymbolLength})`);
  }
  
  if (tokenData.name && tokenData.name.length > TOKEN_VALIDATION.maxNameLength) {
    errors.push(`Name too long (max ${TOKEN_VALIDATION.maxNameLength})`);
  }
  
  if (tokenData.decimals < TOKEN_VALIDATION.minDecimals || tokenData.decimals > TOKEN_VALIDATION.maxDecimals) {
    errors.push(`Invalid decimals (must be ${TOKEN_VALIDATION.minDecimals}-${TOKEN_VALIDATION.maxDecimals})`);
  }
  
  if (tokenData.category && !TOKEN_VALIDATION.validCategories.includes(tokenData.category)) {
    errors.push(`Invalid category: ${tokenData.category}`);
  }
  
  if (tokenData.riskLevel && !TOKEN_VALIDATION.validRiskLevels.includes(tokenData.riskLevel)) {
    errors.push(`Invalid risk level: ${tokenData.riskLevel}`);
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Testnet detection
const TESTNET_IDS = new Set([
  CHAIN_IDS.ETHEREUM_SEPOLIA,
  CHAIN_IDS.ARBITRUM_SEPOLIA,
  CHAIN_IDS.OPTIMISM_SEPOLIA,
  CHAIN_IDS.BSC_TESTNET,
  CHAIN_IDS.AVALANCHE_FUJI,
  CHAIN_IDS.POLYGON_AMOY,
  CHAIN_IDS.BASE_SEPOLIA
]);

const isTestnet = (chainId) => TESTNET_IDS.has(chainId);

// Export all configurations and utilities
module.exports = {
  // Core configurations
  CHAIN_IDS,
  TOKENS,
  TOKEN_CONFIGS,
  BASE_TOKENS,
  
  // Constants
  TOKEN_CATEGORIES,
  RISK_LEVELS,
  POPULAR_TOKENS,
  BRIDGE_PROTOCOLS,
  TOKEN_VALIDATION,
  
  // Utility functions
  getTokensForChain,
  findTokenBySymbol,
  findTokenByAddress,
  getNativeToken,
  getTokensByCategory,
  getStablecoins,
  getWrappedTokens,
  getCrossChainTokens,
  getLayerZeroTokens,
  getTokensWithBridgeSupport,
  isNativeToken,
  isVerifiedToken,
  getTokenRiskLevel,
  getSupportedChainIds,
  getMainnetChainIds,
  getTestnetChainIds,
  getTokenConfig,
  getAllTokens,
  getTokensByTag,
  searchTokens,
  validateToken,
  isTestnet,
  
  // Legacy exports for compatibility
  logo
};
