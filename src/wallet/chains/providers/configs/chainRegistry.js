import ethereum from '../ethereum.js';
import polygon from '../polygon.js';
import bsc from '../bsc.js';
import avalanche from '../avalanche.js';
import arbitrum from '../arbitrum.js';
import optimism from '../optimism.js';
import mainnetConfig from './mainnet.js';
import testnetConfig from './testnet.js';

// Chain registry with mainnet configurations
export const chains = {
  1: { ...ethereum, ...mainnetConfig.ethereum },           // Ethereum mainnet
  137: { ...polygon, ...mainnetConfig.polygon },           // Polygon mainnet
  56: { ...bsc, ...mainnetConfig.bsc },                    // BSC mainnet
  43114: { ...avalanche, ...mainnetConfig.avalanche },     // Avalanche mainnet
  42161: { ...arbitrum, ...mainnetConfig.arbitrum },       // Arbitrum mainnet
  10: { ...optimism, ...mainnetConfig.optimism }           // Optimism mainnet
};

// Testnet configurations
export const testnets = {
  11155111: { ...ethereum, ...testnetConfig.sepolia },     // Ethereum Sepolia
  80001: { ...polygon, ...testnetConfig.mumbai },          // Polygon Mumbai
  97: { ...bsc, ...testnetConfig.bscTestnet },             // BSC Testnet
  43113: { ...avalanche, ...testnetConfig.fuji },          // Avalanche Fuji
  421613: { ...arbitrum, ...testnetConfig.arbitrumGoerli }, // Arbitrum Goerli
  420: { ...optimism, ...testnetConfig.optimismGoerli }    // Optimism Goerli
};

// Combined registry with all networks
export const allChains = {
  ...chains,
  ...testnets
};

// Network type constants
export const NETWORK_TYPES = {
  MAINNET: 'mainnet',
  TESTNET: 'testnet'
};

// Chain categories
export const CHAIN_CATEGORIES = {
  ETHEREUM: 'ethereum',
  L2_SCALING: 'l2-scaling',
  SIDECHAIN: 'sidechain',
  ALT_L1: 'alt-l1'
};

// Chain metadata
export const chainMetadata = {
  1: { category: CHAIN_CATEGORIES.ETHEREUM, type: NETWORK_TYPES.MAINNET },
  137: { category: CHAIN_CATEGORIES.SIDECHAIN, type: NETWORK_TYPES.MAINNET },
  56: { category: CHAIN_CATEGORIES.ALT_L1, type: NETWORK_TYPES.MAINNET },
  43114: { category: CHAIN_CATEGORIES.ALT_L1, type: NETWORK_TYPES.MAINNET },
  42161: { category: CHAIN_CATEGORIES.L2_SCALING, type: NETWORK_TYPES.MAINNET },
  10: { category: CHAIN_CATEGORIES.L2_SCALING, type: NETWORK_TYPES.MAINNET },
  11155111: { category: CHAIN_CATEGORIES.ETHEREUM, type: NETWORK_TYPES.TESTNET },
  80001: { category: CHAIN_CATEGORIES.SIDECHAIN, type: NETWORK_TYPES.TESTNET },
  97: { category: CHAIN_CATEGORIES.ALT_L1, type: NETWORK_TYPES.TESTNET },
  43113: { category: CHAIN_CATEGORIES.ALT_L1, type: NETWORK_TYPES.TESTNET },
  421613: { category: CHAIN_CATEGORIES.L2_SCALING, type: NETWORK_TYPES.TESTNET },
  420: { category: CHAIN_CATEGORIES.L2_SCALING, type: NETWORK_TYPES.TESTNET }
};

// Core functions
export const getChain = (chainId) => {
  const chain = allChains[chainId];
  if (!chain) {
    throw new Error(`Chain with ID ${chainId} not found in registry`);
  }
  return {
    ...chain,
    metadata: chainMetadata[chainId]
  };
};

export const getMainnetChain = (chainId) => {
  const chain = chains[chainId];
  if (!chain) {
    throw new Error(`Mainnet chain with ID ${chainId} not found`);
  }
  return {
    ...chain,
    metadata: chainMetadata[chainId]
  };
};

export const getTestnetChain = (chainId) => {
  const chain = testnets[chainId];
  if (!chain) {
    throw new Error(`Testnet chain with ID ${chainId} not found`);
  }
  return {
    ...chain,
    metadata: chainMetadata[chainId]
  };
};

// Utility functions
export const isMainnet = (chainId) => {
  return chainMetadata[chainId]?.type === NETWORK_TYPES.MAINNET;
};

export const isTestnet = (chainId) => {
  return chainMetadata[chainId]?.type === NETWORK_TYPES.TESTNET;
};

export const getChainsByCategory = (category) => {
  return Object.entries(chainMetadata)
    .filter(([, meta]) => meta.category === category)
    .map(([chainId]) => parseInt(chainId));
};

export const getMainnetChains = () => {
  return Object.keys(chains).map(id => parseInt(id));
};

export const getTestnetChains = () => {
  return Object.keys(testnets).map(id => parseInt(id));
};

export const getAllChainIds = () => {
  return Object.keys(allChains).map(id => parseInt(id));
};

export const getChainName = (chainId) => {
  const chain = getChain(chainId);
  return chain.name || `Chain ${chainId}`;
};

export const isChainSupported = (chainId) => {
  return chainId in allChains;
};

// Chain validation
export const validateChainId = (chainId) => {
  if (!Number.isInteger(chainId) || chainId <= 0) {
    throw new Error('Chain ID must be a positive integer');
  }
  if (!isChainSupported(chainId)) {
    throw new Error(`Chain ID ${chainId} is not supported`);
  }
  return true;
};

// Default export for convenience
export default {
  chains,
  testnets,
  allChains,
  getChain,
  getMainnetChain,
  getTestnetChain,
  isMainnet,
  isTestnet,
  getChainsByCategory,
  getMainnetChains,
  getTestnetChains,
  getAllChainIds,
  getChainName,
  isChainSupported,
  validateChainId,
  NETWORK_TYPES,
  CHAIN_CATEGORIES
};
