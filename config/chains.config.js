// config/chains.config.js
// ------------------------------------------------------------
// Centralised chain metadata for the multi‑chain wallet.
// ------------------------------------------------------------
// NOTE: Only import from the five sanctioned config modules.

import { TOKEN_CONFIGS }        from './token.config.js';
import { WEB3_PROVIDER_CONFIGS } from './web3provider.config.js';
import { GAS_CONFIGS }          from './gas.config.js';
import { DAPP_CONFIGS }         from './dapp.config.js';
import { BROADCAST_CONFIGS }    from './broadcast.config.js';

// ------------------------------------------------------------
// Chain IDs – frozen to avoid accidental mutation
// ------------------------------------------------------------
export const CHAIN_IDS = Object.freeze({
  // Mainnets
  ETHEREUM:        1,
  POLYGON:         137,
  BSC:             56,
  ARBITRUM:        42161,
  AVALANCHE:       43114,
  OPTIMISM:        10,

  // Testnets
  ETHEREUM_SEPOLIA:   11155111,
  ARBITRUM_SEPOLIA:   421614,
  OPTIMISM_SEPOLIA:   11155420,
  BSC_TESTNET:        97,
  AVALANCHE_FUJI:     43113,
  POLYGON_AMOY:       80002
});

// ------------------------------------------------------------
// Helper to DRY up token‑list URLs (primary + fallback)
// ------------------------------------------------------------
const makeTokenListUrls = () => ({
  primary : 'https://cdn.jsdelivr.net/gh/Trusx-crypto-wallet/trust-crypto-wallet-tokenlist@main/tokenlist.json',
  fallback: 'https://raw.githubusercontent.com/Trusx-crypto-wallet/trust-crypto-wallet-tokenlist/main/tokenlist.json'
});

// ------------------------------------------------------------
// Chain configuration map – key = numeric chainId
// ------------------------------------------------------------
export const CHAIN_CONFIGS = new Map([
  // ------------------  Mainnets  ------------------
  [CHAIN_IDS.ETHEREUM, {
    chainId:        CHAIN_IDS.ETHEREUM,
    name:           'Ethereum',
    shortName:      'eth',
    symbol:         'ETH',
    isTestnet:      false,

    rpcUrls:            WEB3_PROVIDER_CONFIGS.ethereum.rpcUrls,
    blockExplorerUrls:  WEB3_PROVIDER_CONFIGS.ethereum.blockExplorerUrls,
    nativeCurrency:     TOKEN_CONFIGS.ethereum.nativeCurrency,

    gasSettings:        GAS_CONFIGS.ethereum,
    dappIntegration:    DAPP_CONFIGS.ethereum,
    broadcastSettings:  BROADCAST_CONFIGS.ethereum,

    tokenListUrls:  makeTokenListUrls()
  }],

  [CHAIN_IDS.POLYGON, {
    chainId:        CHAIN_IDS.POLYGON,
    name:           'Polygon',
    shortName:      'polygon',
    symbol:         'MATIC',
    isTestnet:      false,

    rpcUrls:            WEB3_PROVIDER_CONFIGS.polygon.rpcUrls,
    blockExplorerUrls:  WEB3_PROVIDER_CONFIGS.polygon.blockExplorerUrls,
    nativeCurrency:     TOKEN_CONFIGS.polygon.nativeCurrency,

    gasSettings:        GAS_CONFIGS.polygon,
    dappIntegration:    DAPP_CONFIGS.polygon,
    broadcastSettings:  BROADCAST_CONFIGS.polygon,

    tokenListUrls:  makeTokenListUrls()
  }],

  [CHAIN_IDS.BSC, {
    chainId:        CHAIN_IDS.BSC,
    name:           'Binance Smart Chain',
    shortName:      'bsc',
    symbol:         'BNB',
    isTestnet:      false,

    rpcUrls:            WEB3_PROVIDER_CONFIGS.bsc.rpcUrls,
    blockExplorerUrls:  WEB3_PROVIDER_CONFIGS.bsc.blockExplorerUrls,
    nativeCurrency:     TOKEN_CONFIGS.bsc.nativeCurrency,

    gasSettings:        GAS_CONFIGS.bsc,
    dappIntegration:    DAPP_CONFIGS.bsc,
    broadcastSettings:  BROADCAST_CONFIGS.bsc,

    tokenListUrls:  makeTokenListUrls()
  }],

  [CHAIN_IDS.ARBITRUM, {
    chainId:        CHAIN_IDS.ARBITRUM,
    name:           'Arbitrum One',
    shortName:      'arb',
    symbol:         'ETH',
    isTestnet:      false,

    rpcUrls:            WEB3_PROVIDER_CONFIGS.arbitrum.rpcUrls,
    blockExplorerUrls:  WEB3_PROVIDER_CONFIGS.arbitrum.blockExplorerUrls,
    nativeCurrency:     TOKEN_CONFIGS.arbitrum.nativeCurrency,

    gasSettings:        GAS_CONFIGS.arbitrum,
    dappIntegration:    DAPP_CONFIGS.arbitrum,
    broadcastSettings:  BROADCAST_CONFIGS.arbitrum,

    tokenListUrls:  makeTokenListUrls()
  }],

  [CHAIN_IDS.AVALANCHE, {
    chainId:        CHAIN_IDS.AVALANCHE,
    name:           'Avalanche',
    shortName:      'avax',
    symbol:         'AVAX',
    isTestnet:      false,

    rpcUrls:            WEB3_PROVIDER_CONFIGS.avalanche.rpcUrls,
    blockExplorerUrls:  WEB3_PROVIDER_CONFIGS.avalanche.blockExplorerUrls,
    nativeCurrency:     TOKEN_CONFIGS.avalanche.nativeCurrency,

    gasSettings:        GAS_CONFIGS.avalanche,
    dappIntegration:    DAPP_CONFIGS.avalanche,
    broadcastSettings:  BROADCAST_CONFIGS.avalanche,

    tokenListUrls:  makeTokenListUrls()
  }],

  [CHAIN_IDS.OPTIMISM, {
    chainId:        CHAIN_IDS.OPTIMISM,
    name:           'Optimism',
    shortName:      'op',
    symbol:         'ETH',
    isTestnet:      false,

    rpcUrls:            WEB3_PROVIDER_CONFIGS.optimism.rpcUrls,
    blockExplorerUrls:  WEB3_PROVIDER_CONFIGS.optimism.blockExplorerUrls,
    nativeCurrency:     TOKEN_CONFIGS.optimism.nativeCurrency,

    gasSettings:        GAS_CONFIGS.optimism,
    dappIntegration:    DAPP_CONFIGS.optimism,
    broadcastSettings:  BROADCAST_CONFIGS.optimism,

    tokenListUrls:  makeTokenListUrls()
  }],

  // ------------------  Testnets  ------------------
  [CHAIN_IDS.ETHEREUM_SEPOLIA, {
    chainId:        CHAIN_IDS.ETHEREUM_SEPOLIA,
    name:           'Ethereum Sepolia',
    shortName:      'sep',
    symbol:         'ETH',
    isTestnet:      true,

    rpcUrls:            WEB3_PROVIDER_CONFIGS.sepolia.rpcUrls,
    blockExplorerUrls:  WEB3_PROVIDER_CONFIGS.sepolia.blockExplorerUrls,
    nativeCurrency:     TOKEN_CONFIGS.sepolia.nativeCurrency,

    gasSettings:        GAS_CONFIGS.sepolia,
    dappIntegration:    DAPP_CONFIGS.sepolia,
    broadcastSettings:  BROADCAST_CONFIGS.sepolia,

    tokenListUrls:  makeTokenListUrls()
  }],

  [CHAIN_IDS.ARBITRUM_SEPOLIA, {
    chainId:        CHAIN_IDS.ARBITRUM_SEPOLIA,
    name:           'Arbitrum Sepolia',
    shortName:      'arb-sep',
    symbol:         'ETH',
    isTestnet:      true,

    rpcUrls:            WEB3_PROVIDER_CONFIGS.arbitrumSepolia.rpcUrls,
    blockExplorerUrls:  WEB3_PROVIDER_CONFIGS.arbitrumSepolia.blockExplorerUrls,
    nativeCurrency:     TOKEN_CONFIGS.arbitrumSepolia.nativeCurrency,

    gasSettings:        GAS_CONFIGS.arbitrumSepolia,
    dappIntegration:    DAPP_CONFIGS.arbitrumSepolia,
    broadcastSettings:  BROADCAST_CONFIGS.arbitrumSepolia,

    tokenListUrls:  makeTokenListUrls()
  }],

  [CHAIN_IDS.OPTIMISM_SEPOLIA, {
    chainId:        CHAIN_IDS.OPTIMISM_SEPOLIA,
    name:           'Optimism Sepolia',
    shortName:      'op-sep',
    symbol:         'ETH',
    isTestnet:      true,

    rpcUrls:            WEB3_PROVIDER_CONFIGS.optimismSepolia.rpcUrls,
    blockExplorerUrls:  WEB3_PROVIDER_CONFIGS.optimismSepolia.blockExplorerUrls,
    nativeCurrency:     TOKEN_CONFIGS.optimismSepolia.nativeCurrency,

    gasSettings:        GAS_CONFIGS.optimismSepolia,
    dappIntegration:    DAPP_CONFIGS.optimismSepolia,
    broadcastSettings:  BROADCAST_CONFIGS.optimismSepolia,

    tokenListUrls:  makeTokenListUrls()
  }],

  [CHAIN_IDS.BSC_TESTNET, {
    chainId:        CHAIN_IDS.BSC_TESTNET,
    name:           'BSC Testnet',
    shortName:      'bsc-t',
    symbol:         'tBNB',
    isTestnet:      true,

    rpcUrls:            WEB3_PROVIDER_CONFIGS.bscTestnet.rpcUrls,
    blockExplorerUrls:  WEB3_PROVIDER_CONFIGS.bscTestnet.blockExplorerUrls,
    nativeCurrency:     TOKEN_CONFIGS.bscTestnet.nativeCurrency,

    gasSettings:        GAS_CONFIGS.bscTestnet,
    dappIntegration:    DAPP_CONFIGS.bscTestnet,
    broadcastSettings:  BROADCAST_CONFIGS.bscTestnet,

    tokenListUrls:  makeTokenListUrls()
  }],

  [CHAIN_IDS.AVALANCHE_FUJI, {
    chainId:        CHAIN_IDS.AVALANCHE_FUJI,
    name:           'Avalanche Fuji',
    shortName:      'fuji',
    symbol:         'AVAX',
    isTestnet:      true,

    rpcUrls:            WEB3_PROVIDER_CONFIGS.avalancheFuji.rpcUrls,
    blockExplorerUrls:  WEB3_PROVIDER_CONFIGS.avalancheFuji.blockExplorerUrls,
    nativeCurrency:     TOKEN_CONFIGS.avalancheFuji.nativeCurrency,

    gasSettings:        GAS_CONFIGS.avalancheFuji,
    dappIntegration:    DAPP_CONFIGS.avalancheFuji,
    broadcastSettings:  BROADCAST_CONFIGS.avalancheFuji,

    tokenListUrls:  makeTokenListUrls()
  }],

  [CHAIN_IDS.POLYGON_AMOY, {
    chainId:        CHAIN_IDS.POLYGON_AMOY,
    name:           'Polygon Amoy',
    shortName:      'amoy',
    symbol:         'MATIC',
    isTestnet:      true,

    rpcUrls:            WEB3_PROVIDER_CONFIGS.polygonAmoy.rpcUrls,
    blockExplorerUrls:  WEB3_PROVIDER_CONFIGS.polygonAmoy.blockExplorerUrls,
    nativeCurrency:     TOKEN_CONFIGS.polygonAmoy.nativeCurrency,

    gasSettings:        GAS_CONFIGS.polygonAmoy,
    dappIntegration:    DAPP_CONFIGS.polygonAmoy,
    broadcastSettings:  BROADCAST_CONFIGS.polygonAmoy,

    tokenListUrls:  makeTokenListUrls()
  }]
]);

// ------------------------------------------------------------
// Public helper – safely returns undefined for unknown IDs
// ------------------------------------------------------------
export const getChainConfig = (chainId) => CHAIN_CONFIGS.get(chainId);
