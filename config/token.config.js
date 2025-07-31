// config/tokenconfig.js
// ------------------------------------------------------------
// Canonical token metadata for all supported chains with IPFS integration.
// Logo images live in public/images/tokens/.
// IPFS data sources for dynamic token lists.
// ------------------------------------------------------------

// IPFS Integration - Your Production Hashes
export const TOKEN_LISTS = Object.freeze({
  mainnet: {
    uri: "ipfs://bafkreidrjqn645yqrpyoctbx6awbf6gwio47n2hk54qpgcnaxypgugrj6a",
    fallback: "https://gateway.pinata.cloud/ipfs/bafkreidrjqn645yqrpyoctbx6awbf6gwio47n2hk54qpgcnaxypgugrj6a"
  },
  testnet: {
    uri: "ipfs://bafkreibiwwrs5xmhgyp3pvdl3xrdzryxzl5oyq6lh7dl3qbxa63vgl33da",
    fallback: "https://gateway.pinata.cloud/ipfs/bafkreibiwwrs5xmhgyp3pvdl3xrdzryxzl5oyq6lh7dl3qbxa63vgl33da"
  },
  base: {
    uri: "ipfs://bafkreida6oqbjj4zot3iui43qyautdsszznsnx2pbsudocafhgcnwcchqq",
    fallback: "https://gateway.pinata.cloud/ipfs/bafkreida6oqbjj4zot3iui43qyautdsszznsnx2pbsudocafhgcnwcchqq"
  }
});

export const IPFS_CONFIG = Object.freeze({
  gateways: [
    "https://gateway.pinata.cloud/ipfs/",
    "https://ipfs.io/ipfs/",
    "https://cloudflare-ipfs.com/ipfs/"
  ],
  timeout: 5000,
  retries: 3
});

export const CHAIN_IDS = Object.freeze({
  // ── Mainnets ───────────────────────────────────────────────
  ETHEREUM: 1,
  POLYGON: 137,
  BSC: 56,
  ARBITRUM: 42161,
  AVALANCHE: 43114,
  OPTIMISM: 10,

  // ── Testnets ───────────────────────────────────────────────
  ETHEREUM_SEPOLIA: 11155111,
  ARBITRUM_SEPOLIA: 421614,
  OPTIMISM_SEPOLIA: 11155420,
  BSC_TESTNET: 97,
  AVALANCHE_FUJI: 43113,
  POLYGON_AMOY: 80002
});

// helper to build logo paths
const logo    = (file) => `/images/tokens/${file}`;
const UNKNOWN = logo('unknown-token.png');

// ------------------------------------------------------------
// TOKENS[chainId] → array of token objects (Static fallback)
// Primary data source is IPFS, this is fallback only
// ------------------------------------------------------------
export const TOKENS = Object.freeze({
  // ── Mainnets ───────────────────────────────────────────────
  [CHAIN_IDS.ETHEREUM]: [
    { symbol: 'ETH',  name: 'Ether',           address: 'native',                                               decimals: 18, isNative: true,  logoURI: logo('eth-logo.png') },
    { symbol: 'WETH', name: 'Wrapped Ether',   address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',           decimals: 18, isNative: false, logoURI: logo('eth-logo.png') },
    { symbol: 'USDC', name: 'USD Coin',        address: '0xA0b86991c6218B36c1D19D4a2E9Eb0cE3606EB48',           decimals:  6, isNative: false, logoURI: logo('usdc.png')      },
    { symbol: 'DAI',  name: 'Dai Stablecoin',  address: '0x6B175474E89094C44Da98b954EedeAC495271d0F',           decimals: 18, isNative: false, logoURI: logo('dai.png')       },
    { symbol: 'WBTC', name: 'Wrapped Bitcoin', address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',           decimals:  8, isNative: false, logoURI: logo('wbtc.png')      },
    { symbol: 'UNI',  name: 'Uniswap',         address: '0x1F9840a85d5aF5bf1D1762F925BDADdC4201F984',           decimals: 18, isNative: false, logoURI: UNKNOWN               },
    { symbol: 'AAVE', name: 'Aave',            address: '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9',           decimals: 18, isNative: false, logoURI: UNKNOWN               },
    { symbol: 'USDT', name: 'Tether USD',      address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',           decimals:  6, isNative: false, logoURI: logo('usdt.png')      }
  ],

  [CHAIN_IDS.POLYGON]: [
    { symbol: 'MATIC', name: 'Polygon',        address: 'native',                                               decimals: 18, isNative: true,  logoURI: logo('matic-logo.png') },
    { symbol: 'WETH',  name: 'Wrapped Ether',  address: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619',           decimals: 18, isNative: false, logoURI: logo('eth-logo.png')   },
    { symbol: 'USDC',  name: 'USD Coin',       address: '0x2791Bca1f2de4661ED88a30C99A7a9449Aa84174',           decimals:  6, isNative: false, logoURI: logo('usdc.png')       },
    { symbol: 'DAI',   name: 'Dai Stablecoin', address: '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063',           decimals: 18, isNative: false, logoURI: logo('dai.png')        }
  ],

  [CHAIN_IDS.BSC]: [
    { symbol: 'BNB',  name: 'Binance Coin',    address: 'native',                                               decimals: 18, isNative: true,  logoURI: logo('bnb-logo.png') },
    { symbol: 'WBNB', name: 'Wrapped BNB',     address: '0xBB4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',           decimals: 18, isNative: false, logoURI: UNKNOWN              },
    { symbol: 'USDC', name: 'USD Coin',        address: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',           decimals: 18, isNative: false, logoURI: logo('usdc.png')     },
    { symbol: 'USDT', name: 'Tether USD',      address: '0x55d398326f99059fF775485246999027B3197955',           decimals: 18, isNative: false, logoURI: logo('usdt.png')     }
  ],

  [CHAIN_IDS.ARBITRUM]: [
    { symbol: 'ETH',  name: 'Ether',           address: 'native',                                               decimals: 18, isNative: true,  logoURI: logo('eth-logo.png') },
    { symbol: 'ARB',  name: 'Arbitrum',        address: '0x912CE59144191C1204E64559FE8253a0e49E6548',           decimals: 18, isNative: false, logoURI: logo('arb-logo.png') },
    { symbol: 'WETH', name: 'Wrapped Ether',   address: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',           decimals: 18, isNative: false, logoURI: logo('eth-logo.png') },
    { symbol: 'USDC', name: 'USD Coin',        address: '0xaf88d065e77c8CC2239327C5EDb3A432268e5831',           decimals:  6, isNative: false, logoURI: logo('usdc.png')     }
  ],

  [CHAIN_IDS.AVALANCHE]: [
    { symbol: 'AVAX',  name: 'Avalanche',      address: 'native',                                               decimals: 18, isNative: true,  logoURI: logo('avax-logo.png') },
    { symbol: 'WAVAX', name: 'Wrapped AVAX',   address: '0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7',           decimals: 18, isNative: false, logoURI: logo('avax-logo.png') },
    { symbol: 'USDC',  name: 'USD Coin',       address: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E',           decimals:  6, isNative: false, logoURI: logo('usdc.png')      }
  ],

  [CHAIN_IDS.OPTIMISM]: [
    { symbol: 'ETH',  name: 'Ether',           address: 'native',                                               decimals: 18, isNative: true,  logoURI: logo('eth-logo.png') },
    { symbol: 'OP',   name: 'Optimism',        address: '0x4200000000000000000000000000000000000042',           decimals: 18, isNative: false, logoURI: logo('op-logo.png')  },
    { symbol: 'WETH', name: 'Wrapped Ether',   address: '0x4200000000000000000000000000000000000006',           decimals: 18, isNative: false, logoURI: logo('eth-logo.png') },
    { symbol: 'USDC', name: 'USD Coin',        address: '0x0B2C639c533813F4Aa9D7837CAf62653D097Ff85',           decimals:  6, isNative: false, logoURI: logo('usdc.png')     }
  ],

  // ── Testnets (native only) ─────────────────────────────────
  [CHAIN_IDS.ETHEREUM_SEPOLIA]: [
    { symbol: 'ETH', name: 'Ether', address: 'native', decimals: 18, isNative: true, logoURI: logo('eth-logo.png') }
  ],
  [CHAIN_IDS.ARBITRUM_SEPOLIA]: [
    { symbol: 'ETH', name: 'Ether', address: 'native', decimals: 18, isNative: true, logoURI: logo('eth-logo.png') }
  ],
  [CHAIN_IDS.OPTIMISM_SEPOLIA]: [
    { symbol: 'ETH', name: 'Ether', address: 'native', decimals: 18, isNative: true, logoURI: logo('eth-logo.png') }
  ],
  [CHAIN_IDS.BSC_TESTNET]: [
    { symbol: 'tBNB', name: 'Test BNB', address: 'native', decimals: 18, isNative: true, logoURI: logo('bnb-logo.png') }
  ],
  [CHAIN_IDS.AVALANCHE_FUJI]: [
    { symbol: 'AVAX', name: 'Avalanche', address: 'native', decimals: 18, isNative: true, logoURI: logo('avax-logo.png') }
  ],
  [CHAIN_IDS.POLYGON_AMOY]: [
    { symbol: 'MATIC', name: 'Polygon', address: 'native', decimals: 18, isNative: true, logoURI: logo('matic-logo.png') }
  ]
});

// ------------------------------------------------------------
// TOKEN_CONFIGS – native currency objects for chains.config.js
// ------------------------------------------------------------
export const TOKEN_CONFIGS = Object.freeze({
  ethereum:        { nativeCurrency: { name: 'Ether',           symbol: 'ETH',   decimals: 18 } },
  polygon:         { nativeCurrency: { name: 'MATIC',           symbol: 'MATIC', decimals: 18 } },
  bsc:             { nativeCurrency: { name: 'Binance Coin',    symbol: 'BNB',   decimals: 18 } },
  arbitrum:        { nativeCurrency: { name: 'Ether',           symbol: 'ETH',   decimals: 18 } },
  avalanche:       { nativeCurrency: { name: 'Avalanche',       symbol: 'AVAX',  decimals: 18 } },
  optimism:        { nativeCurrency: { name: 'Ether',           symbol: 'ETH',   decimals: 18 } },

  // Testnets
  sepolia:         { nativeCurrency: { name: 'Ether',   symbol: 'ETH',   decimals: 18 } },
  arbitrumSepolia: { nativeCurrency: { name: 'Ether',   symbol: 'ETH',   decimals: 18 } },
  optimismSepolia: { nativeCurrency: { name: 'Ether',   symbol: 'ETH',   decimals: 18 } },
  bscTestnet:      { nativeCurrency: { name: 'Test BNB',symbol: 'tBNB',  decimals: 18 } },
  avalancheFuji:   { nativeCurrency: { name: 'Avalanche', symbol: 'AVAX',decimals: 18 } },
  polygonAmoy:     { nativeCurrency: { name: 'MATIC',   symbol: 'MATIC',decimals: 18 } }
});

// ------------------------------------------------------------
//  Helper utilities (Extended with IPFS support)
// ------------------------------------------------------------

export const getTokensForChain = (chainId) => TOKENS[chainId] || [];

export const findTokenBySymbol = (chainId, symbol) =>
  (TOKENS[chainId] || []).find(
    (t) => t.symbol.toLowerCase() === symbol.toLowerCase()
  ) || null;

export const getNativeToken = (chainId) =>
  (TOKENS[chainId] || []).find((t) => t.isNative) || null;

export const isNativeToken = (address) => address === 'native';

export const getSupportedChainIds = () => Object.values(CHAIN_IDS);

export const getTokenConfig = (chainKey) => TOKEN_CONFIGS[chainKey] || null;

export const getAllTokens = () => Object.values(TOKENS).flat();

const TESTNET_IDS = new Set([
  CHAIN_IDS.ETHEREUM_SEPOLIA,
  CHAIN_IDS.ARBITRUM_SEPOLIA,
  CHAIN_IDS.OPTIMISM_SEPOLIA,
  CHAIN_IDS.BSC_TESTNET,
  CHAIN_IDS.AVALANCHE_FUJI,
  CHAIN_IDS.POLYGON_AMOY
]);
export const isTestnet = (chainId) => TESTNET_IDS.has(chainId);

// ------------------------------------------------------------
// IPFS Integration Helpers
// ------------------------------------------------------------

export const getTokenListURI = (environment = 'mainnet') => {
  const config = TOKEN_LISTS[environment];
  return config ? config.uri : null;
};

export const getTokenListFallback = (environment = 'mainnet') => {
  const config = TOKEN_LISTS[environment];
  return config ? config.fallback : null;
};

export const getIPFSGateways = () => IPFS_CONFIG.gateways;

export const getIPFSTimeout = () => IPFS_CONFIG.timeout;
