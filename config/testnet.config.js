// config/testnet.config.js
// ------------------------------------------------------------
// Configuration for supported testnets, referencing other
// config modules: tokens, web3 providers, gas settings,
// dApp interactions, and broadcast strategies.
// ------------------------------------------------------------

import { CHAIN_IDS } from './token.config.js';
import { getRpcEndpoints, getWebSocketEndpoints } from './web3provider.config.js';
import { GAS_CONFIGURATIONS } from './gas.config.js';
import { DAPP_CONFIG } from './dapp.config.js';
import { BROADCAST_SETTINGS } from './broadcast.config.js';

// ------------------------------------------------------------
// Testnet Configuration Map
// ------------------------------------------------------------
export const TESTNET_CONFIGS = Object.freeze({
  [CHAIN_IDS.ETHEREUM_SEPOLIA]: Object.freeze({
    name: 'Ethereum Sepolia',
    rpcEndpoints: getRpcEndpoints(CHAIN_IDS.ETHEREUM_SEPOLIA),
    wsEndpoints: getWebSocketEndpoints(CHAIN_IDS.ETHEREUM_SEPOLIA),
    gas: GAS_CONFIGURATIONS[CHAIN_IDS.ETHEREUM_SEPOLIA],
    dapp: DAPP_CONFIG[CHAIN_IDS.ETHEREUM_SEPOLIA],
    broadcast: BROADCAST_SETTINGS[CHAIN_IDS.ETHEREUM_SEPOLIA],
  }),

  [CHAIN_IDS.ARBITRUM_SEPOLIA]: Object.freeze({
    name: 'Arbitrum Sepolia',
    rpcEndpoints: getRpcEndpoints(CHAIN_IDS.ARBITRUM_SEPOLIA),
    wsEndpoints: getWebSocketEndpoints(CHAIN_IDS.ARBITRUM_SEPOLIA),
    gas: GAS_CONFIGURATIONS[CHAIN_IDS.ARBITRUM_SEPOLIA],
    dapp: DAPP_CONFIG[CHAIN_IDS.ARBITRUM_SEPOLIA],
    broadcast: BROADCAST_SETTINGS[CHAIN_IDS.ARBITRUM_SEPOLIA],
  }),

  [CHAIN_IDS.OPTIMISM_SEPOLIA]: Object.freeze({
    name: 'Optimism Sepolia',
    rpcEndpoints: getRpcEndpoints(CHAIN_IDS.OPTIMISM_SEPOLIA),
    wsEndpoints: getWebSocketEndpoints(CHAIN_IDS.OPTIMISM_SEPOLIA),
    gas: GAS_CONFIGURATIONS[CHAIN_IDS.OPTIMISM_SEPOLIA],
    dapp: DAPP_CONFIG[CHAIN_IDS.OPTIMISM_SEPOLIA],
    broadcast: BROADCAST_SETTINGS[CHAIN_IDS.OPTIMISM_SEPOLIA],
  }),

  [CHAIN_IDS.BSC_TESTNET]: Object.freeze({
    name: 'BSC Testnet',
    rpcEndpoints: getRpcEndpoints(CHAIN_IDS.BSC_TESTNET),
    wsEndpoints: getWebSocketEndpoints(CHAIN_IDS.BSC_TESTNET),
    gas: GAS_CONFIGURATIONS[CHAIN_IDS.BSC_TESTNET],
    dapp: DAPP_CONFIG[CHAIN_IDS.BSC_TESTNET],
    broadcast: BROADCAST_SETTINGS[CHAIN_IDS.BSC_TESTNET],
  }),

  [CHAIN_IDS.AVALANCHE_FUJI]: Object.freeze({
    name: 'Avalanche Fuji Testnet',
    rpcEndpoints: getRpcEndpoints(CHAIN_IDS.AVALANCHE_FUJI),
    wsEndpoints: getWebSocketEndpoints(CHAIN_IDS.AVALANCHE_FUJI),
    gas: GAS_CONFIGURATIONS[CHAIN_IDS.AVALANCHE_FUJI],
    dapp: DAPP_CONFIG[CHAIN_IDS.AVALANCHE_FUJI],
    broadcast: BROADCAST_SETTINGS[CHAIN_IDS.AVALANCHE_FUJI],
  }),

  [CHAIN_IDS.POLYGON_AMOY]: Object.freeze({
    name: 'Polygon Amoy Testnet',
    rpcEndpoints: getRpcEndpoints(CHAIN_IDS.POLYGON_AMOY),
    wsEndpoints: getWebSocketEndpoints(CHAIN_IDS.POLYGON_AMOY),
    gas: GAS_CONFIGURATIONS[CHAIN_IDS.POLYGON_AMOY],
    dapp: DAPP_CONFIG[CHAIN_IDS.POLYGON_AMOY],
    broadcast: BROADCAST_SETTINGS[CHAIN_IDS.POLYGON_AMOY],
  })
});

// ------------------------------------------------------------
// Helper function to get configuration by chain ID
// ------------------------------------------------------------
export const getTestnetConfig = (chainId) => TESTNET_CONFIGS[chainId] || null;

// ------------------------------------------------------------
// List of all supported testnet chain IDs
// ------------------------------------------------------------
export const getAllTestnetChains = () => Object.keys(TESTNET_CONFIGS).map(Number);
