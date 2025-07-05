// config/networkUtils.js
// Production-grade network utilities for bridge operations
// Handles network lookups, conversions, and LayerZero chain mappings

const { bridgeConfig } = require('./bridgeConfig');
const { networks: chainsConfig } = require('./chains.config');

/**
 * Get network configuration by chain ID
 * @param {number} chainId - EVM chain ID
 * @returns {Object|null} Network configuration with key and details
 */
function getNetworkByChainId(chainId) {
  if (!chainId || !Number.isInteger(chainId)) {
    return null;
  }

  const networks = bridgeConfig.networks || {};
  
  for (const [networkKey, network] of Object.entries(networks)) {
    if (network.chainId === chainId) {
      return {
        key: networkKey,
        ...network,
        // Merge with chains.config if available
        ...(chainsConfig?.[networkKey] || {})
      };
    }
  }
  
  return null;
}

/**
 * Get network configuration by network key
 * @param {string} networkKey - Network identifier (e.g., 'ethereum', 'polygon')
 * @returns {Object|null} Network configuration
 */
function getNetworkByKey(networkKey) {
  if (!networkKey || typeof networkKey !== 'string') {
    return null;
  }

  const networks = bridgeConfig.networks || {};
  const network = networks[networkKey];
  
  if (!network) {
    return null;
  }

  return {
    key: networkKey,
    ...network,
    // Merge with chains.config if available
    ...(chainsConfig?.[networkKey] || {})
  };
}

/**
 * Get network configuration by LayerZero chain ID
 * @param {number} layerZeroChainId - LayerZero chain ID
 * @returns {Object|null} Network configuration
 */
function getNetworkByLayerZeroChainId(layerZeroChainId) {
  if (!layerZeroChainId || !Number.isInteger(layerZeroChainId)) {
    return null;
  }

  const networks = bridgeConfig.networks || {};
  
  for (const [networkKey, network] of Object.entries(networks)) {
    if (network.layerZeroChainId === layerZeroChainId) {
      return {
        key: networkKey,
        ...network,
        // Merge with chains.config if available
        ...(chainsConfig?.[networkKey] || {})
      };
    }
  }
  
  return null;
}

/**
 * Convert EVM chain ID to LayerZero chain ID
 * @param {number} chainId - EVM chain ID
 * @returns {number|null} LayerZero chain ID
 */
function getLayerZeroChainId(chainId) {
  const network = getNetworkByChainId(chainId);
  return network?.layerZeroChainId || null;
}

/**
 * Convert LayerZero chain ID to EVM chain ID
 * @param {number} layerZeroChainId - LayerZero chain ID
 * @returns {number|null} EVM chain ID
 */
function getEvmChainId(layerZeroChainId) {
  const network = getNetworkByLayerZeroChainId(layerZeroChainId);
  return network?.chainId || null;
}

/**
 * Get all supported networks
 * @returns {Array} Array of network configurations with keys
 */
function getAllNetworks() {
  const networks = bridgeConfig.networks || {};
  
  return Object.entries(networks).map(([key, network]) => ({
    key,
    ...network,
    // Merge with chains.config if available
    ...(chainsConfig?.[key] || {})
  }));
}

/**
 * Get networks that support a specific bridge
 * @param {string} bridgeKey - Bridge identifier (e.g., 'layerzeroV1')
 * @returns {Array} Array of network configurations that support the bridge
 */
function getNetworksByBridge(bridgeKey) {
  if (!bridgeKey || typeof bridgeKey !== 'string') {
    return [];
  }

  const bridges = bridgeConfig.bridges || {};
  const bridge = bridges[bridgeKey];
  
  if (!bridge || !bridge.contracts) {
    return [];
  }

  const supportedNetworkKeys = Object.keys(bridge.contracts);
  
  return supportedNetworkKeys
    .map(networkKey => getNetworkByKey(networkKey))
    .filter(network => network !== null);
}

/**
 * Check if a network supports a specific bridge
 * @param {string} networkKey - Network identifier
 * @param {string} bridgeKey - Bridge identifier
 * @returns {boolean} Whether the network supports the bridge
 */
function doesNetworkSupportBridge(networkKey, bridgeKey) {
  if (!networkKey || !bridgeKey) {
    return false;
  }

  const bridges = bridgeConfig.bridges || {};
  const bridge = bridges[bridgeKey];
  
  return !!(bridge?.contracts?.[networkKey]);
}

/**
 * Get bridge contract address for a network
 * @param {string} networkKey - Network identifier
 * @param {string} bridgeKey - Bridge identifier
 * @param {string} contractType - Contract type ('endpoint', 'router', etc.)
 * @returns {string|null} Contract address
 */
function getBridgeContract(networkKey, bridgeKey, contractType = 'endpoint') {
  if (!networkKey || !bridgeKey) {
    return null;
  }

  const bridges = bridgeConfig.bridges || {};
  const bridge = bridges[bridgeKey];
  
  if (!bridge?.contracts?.[networkKey]) {
    return null;
  }

  return bridge.contracts[networkKey][contractType] || null;
}

/**
 * Get all available bridges for a network
 * @param {string} networkKey - Network identifier
 * @returns {Array} Array of bridge keys that support the network
 */
function getAvailableBridges(networkKey) {
  if (!networkKey) {
    return [];
  }

  const bridges = bridgeConfig.bridges || {};
  const availableBridges = [];

  for (const [bridgeKey, bridge] of Object.entries(bridges)) {
    if (bridge.contracts?.[networkKey]) {
      availableBridges.push(bridgeKey);
    }
  }

  return availableBridges;
}

/**
 * Check if two networks can be bridged using any available bridge
 * @param {string} fromNetworkKey - Source network
 * @param {string} toNetworkKey - Destination network
 * @returns {Array} Array of bridge keys that can bridge between the networks
 */
function getAvailableBridgesBetweenNetworks(fromNetworkKey, toNetworkKey) {
  if (!fromNetworkKey || !toNetworkKey) {
    return [];
  }

  const fromBridges = getAvailableBridges(fromNetworkKey);
  const toBridges = getAvailableBridges(toNetworkKey);
  
  // Return intersection of bridges available on both networks
  return fromBridges.filter(bridge => toBridges.includes(bridge));
}

/**
 * Get network native currency information
 * @param {string} networkKey - Network identifier
 * @returns {Object|null} Native currency information
 */
function getNetworkNativeCurrency(networkKey) {
  const network = getNetworkByKey(networkKey);
  return network?.nativeCurrency || null;
}

/**
 * Check if a network is a testnet
 * @param {string} networkKey - Network identifier
 * @returns {boolean} Whether the network is a testnet
 */
function isTestnet(networkKey) {
  const network = getNetworkByKey(networkKey);
  return network?.testnet === true;
}

/**
 * Get mainnet networks only
 * @returns {Array} Array of mainnet network configurations
 */
function getMainnetNetworks() {
  return getAllNetworks().filter(network => !network.testnet);
}

/**
 * Get testnet networks only
 * @returns {Array} Array of testnet network configurations
 */
function getTestnetNetworks() {
  return getAllNetworks().filter(network => network.testnet === true);
}

/**
 * Get LayerZero chain ID mapping for all networks
 * @returns {Object} Mapping of EVM chain IDs to LayerZero chain IDs
 */
function getLayerZeroChainIdMapping() {
  const networks = getAllNetworks();
  const mapping = {};

  for (const network of networks) {
    if (network.chainId && network.layerZeroChainId) {
      mapping[network.chainId] = network.layerZeroChainId;
    }
  }

  return mapping;
}

/**
 * Get reverse LayerZero chain ID mapping
 * @returns {Object} Mapping of LayerZero chain IDs to EVM chain IDs
 */
function getReverseLayerZeroChainIdMapping() {
  const networks = getAllNetworks();
  const mapping = {};

  for (const network of networks) {
    if (network.layerZeroChainId && network.chainId) {
      mapping[network.layerZeroChainId] = network.chainId;
    }
  }

  return mapping;
}

/**
 * Validate network configuration
 * @param {string} networkKey - Network identifier
 * @returns {Object} Validation result
 */
function validateNetwork(networkKey) {
  const network = getNetworkByKey(networkKey);
  const errors = [];
  const warnings = [];

  if (!network) {
    errors.push(`Network ${networkKey} not found`);
    return { isValid: false, errors, warnings };
  }

  // Check required fields
  if (!network.chainId) errors.push(`Network ${networkKey} missing chainId`);
  if (!network.name) errors.push(`Network ${networkKey} missing name`);
  if (!network.nativeCurrency) errors.push(`Network ${networkKey} missing nativeCurrency`);

  // Check LayerZero configuration
  if (!network.layerZeroChainId) {
    warnings.push(`Network ${networkKey} missing layerZeroChainId - LayerZero bridges will not work`);
  }

  // Check RPC URL
  if (!network.rpcUrl) {
    warnings.push(`Network ${networkKey} missing rpcUrl`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    network
  };
}

/**
 * Get network display name
 * @param {string} networkKey - Network identifier
 * @returns {string} Display name for the network
 */
function getNetworkDisplayName(networkKey) {
  const network = getNetworkByKey(networkKey);
  return network?.name || networkKey;
}

/**
 * Get network by partial name match
 * @param {string} partialName - Partial network name
 * @returns {Array} Array of matching networks
 */
function searchNetworksByName(partialName) {
  if (!partialName || typeof partialName !== 'string') {
    return [];
  }

  const searchTerm = partialName.toLowerCase();
  const networks = getAllNetworks();

  return networks.filter(network => 
    network.name.toLowerCase().includes(searchTerm) ||
    network.key.toLowerCase().includes(searchTerm)
  );
}

module.exports = {
  getNetworkByChainId,
  getNetworkByKey,
  getNetworkByLayerZeroChainId,
  getLayerZeroChainId,
  getEvmChainId,
  getAllNetworks,
  getNetworksByBridge,
  doesNetworkSupportBridge,
  getBridgeContract,
  getAvailableBridges,
  getAvailableBridgesBetweenNetworks,
  getNetworkNativeCurrency,
  isTestnet,
  getMainnetNetworks,
  getTestnetNetworks,
  getLayerZeroChainIdMapping,
  getReverseLayerZeroChainIdMapping,
  validateNetwork,
  getNetworkDisplayName,
  searchNetworksByName
};
