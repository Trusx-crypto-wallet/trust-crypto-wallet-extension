// config/dapp.config.js
// ------------------------------------------------------------
// dApp-integration feature flags per chain.
// Each key is a numeric CHAIN_ID imported from token.config.js
// ------------------------------------------------------------

import { CHAIN_IDS } from './token.config.js';

export const DAPP_CONFIG = Object.freeze({
  /* ─────────── Mainnets ─────────── */

  [CHAIN_IDS.ETHEREUM]: Object.freeze({
    allowContractInteractions: true,   // wallets → contracts → users
    enableEIP1102:             true,   // legacy privacy-mode handshake
    autoAddTokenMetadata:      true,   // fetch logo/symbol on watchAsset
    permitDAppRegistry:        true    // allow wallet-side dApp allowlisting
  }),

  [CHAIN_IDS.POLYGON]: Object.freeze({
    allowContractInteractions: true,
    enableEIP1102:             true,
    autoAddTokenMetadata:      true,
    permitDAppRegistry:        true
  }),

  [CHAIN_IDS.BSC]: Object.freeze({
    allowContractInteractions: true,
    enableEIP1102:             false,  // most BNB-Chain dApps never adopted 1102
    autoAddTokenMetadata:      true,
    permitDAppRegistry:        true
  }),

  [CHAIN_IDS.ARBITRUM]: Object.freeze({
    allowContractInteractions: true,
    enableEIP1102:             true,
    autoAddTokenMetadata:      true,
    permitDAppRegistry:        true
  }),

  [CHAIN_IDS.AVALANCHE]: Object.freeze({
    allowContractInteractions: true,
    enableEIP1102:             true,
    autoAddTokenMetadata:      true,
    permitDAppRegistry:        true
  }),

  [CHAIN_IDS.OPTIMISM]: Object.freeze({
    allowContractInteractions: true,
    enableEIP1102:             true,
    autoAddTokenMetadata:      true,
    permitDAppRegistry:        true
  }),

  /* ─────────── Testnets ─────────── */

  [CHAIN_IDS.ETHEREUM_SEPOLIA]: Object.freeze({
    allowContractInteractions: true,
    enableEIP1102:             true,
    autoAddTokenMetadata:      false,  // keep dev nets simpler
    permitDAppRegistry:        false
  }),

  [CHAIN_IDS.ARBITRUM_SEPOLIA]: Object.freeze({
    allowContractInteractions: true,
    enableEIP1102:             true,
    autoAddTokenMetadata:      false,
    permitDAppRegistry:        false
  }),

  [CHAIN_IDS.OPTIMISM_SEPOLIA]: Object.freeze({
    allowContractInteractions: true,
    enableEIP1102:             true,
    autoAddTokenMetadata:      false,
    permitDAppRegistry:        false
  }),

  [CHAIN_IDS.BSC_TESTNET]: Object.freeze({
    allowContractInteractions: true,
    enableEIP1102:             false,
    autoAddTokenMetadata:      false,
    permitDAppRegistry:        false
  }),

  [CHAIN_IDS.AVALANCHE_FUJI]: Object.freeze({
    allowContractInteractions: true,
    enableEIP1102:             true,
    autoAddTokenMetadata:      false,
    permitDAppRegistry:        false
  }),

  [CHAIN_IDS.POLYGON_AMOY]: Object.freeze({
    allowContractInteractions: true,
    enableEIP1102:             true,
    autoAddTokenMetadata:      false,
    permitDAppRegistry:        false
  })
});
