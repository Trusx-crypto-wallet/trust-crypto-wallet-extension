// config/validation.js
// Production-grade validation for bridge configuration
// Validates all bridge configs, networks, tokens, and cross-dependencies

const { bridgeConfig } = require('./bridgeConfig');
const { networks } = require('./chains.config');
const { tokens } = require('./token.config');
const { priceFeeds } = require('./price.config');

/**
 * Validates the complete bridge configuration
 * @returns {Object} { isValid: boolean, errors: string[], warnings: string[] }
 */
function validateBridgeConfig() {
  const errors = [];
  const warnings = [];

  try {
    // 1. Validate bridgeConfig structure
    if (!bridgeConfig || typeof bridgeConfig !== 'object') {
      errors.push('bridgeConfig must be a valid object');
      return { isValid: false, errors, warnings };
    }

    // 2. Validate networks configuration
    const networkValidation = validateNetworks();
    errors.push(...networkValidation.errors);
    warnings.push(...networkValidation.warnings);

    // 3. Validate bridges configuration
    const bridgeValidation = validateBridges();
    errors.push(...bridgeValidation.errors);
    warnings.push(...bridgeValidation.warnings);

    // 4. Validate tokens configuration
    const tokenValidation = validateTokens();
    errors.push(...tokenValidation.errors);
    warnings.push(...tokenValidation.warnings);

    // 5. Validate cross-dependencies
    const crossValidation = validateCrossDependencies();
    errors.push(...crossValidation.errors);
    warnings.push(...crossValidation.warnings);

    // 6. Validate LayerZero specific configurations
    const layerZeroValidation = validateLayerZeroConfig();
    errors.push(...layerZeroValidation.errors);
    warnings.push(...layerZeroValidation.warnings);

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      summary: {
        totalNetworks: Object.keys(bridgeConfig.networks || {}).length,
        totalBridges: Object.keys(bridgeConfig.bridges || {}).length,
        totalTokens: Object.keys(bridgeConfig.tokens || {}).length,
        hasLayerZeroV1: !!bridgeConfig.bridges?.layerzeroV1,
        hasLayerZeroV2: !!bridgeConfig.bridges?.layerzeroV2
      }
    };
  } catch (error) {
    errors.push(`Validation failed with error: ${error.message}`);
    return { isValid: false, errors, warnings };
  }
}

/**
 * Validates network configurations
 */
function validateNetworks() {
  const errors = [];
  const warnings = [];

  if (!bridgeConfig.networks || typeof bridgeConfig.networks !== 'object') {
    errors.push('bridgeConfig.networks must be a valid object');
    return { errors, warnings };
  }

  const requiredNetworkFields = ['chainId', 'name', 'nativeCurrency'];
  const optionalNetworkFields = ['rpcUrl', 'blockExplorer', 'testnet', 'layerZeroChainId'];

  for (const [networkKey, network] of Object.entries(bridgeConfig.networks)) {
    if (!network || typeof network !== 'object') {
      errors.push(`Network ${networkKey} must be a valid object`);
      continue;
    }

    // Check required fields
    for (const field of requiredNetworkFields) {
      if (!network[field]) {
        errors.push(`Network ${networkKey} missing required field: ${field}`);
      }
    }

    // Validate chainId
    if (network.chainId && (!Number.isInteger(network.chainId) || network.chainId <= 0)) {
      errors.push(`Network ${networkKey} chainId must be a positive integer`);
    }

    // Validate LayerZero chainId if present
    if (network.layerZeroChainId && (!Number.isInteger(network.layerZeroChainId) || network.layerZeroChainId <= 0)) {
      errors.push(`Network ${networkKey} layerZeroChainId must be a positive integer`);
    }

    // Check for duplicate chainIds
    const duplicateChainId = Object.entries(bridgeConfig.networks)
      .filter(([key, net]) => key !== networkKey && net.chainId === network.chainId);
    
    if (duplicateChainId.length > 0) {
      errors.push(`Network ${networkKey} has duplicate chainId ${network.chainId} with ${duplicateChainId[0][0]}`);
    }

    // Validate RPC URL format
    if (network.rpcUrl && !isValidUrl(network.rpcUrl)) {
      warnings.push(`Network ${networkKey} rpcUrl appears invalid: ${network.rpcUrl}`);
    }

    // Cross-reference with chains.config.js
    if (networks && networks[networkKey] && networks[networkKey].chainId !== network.chainId) {
      warnings.push(`Network ${networkKey} chainId mismatch between bridgeConfig and chains.config`);
    }
  }

  return { errors, warnings };
}

/**
 * Validates bridge configurations
 */
function validateBridges() {
  const errors = [];
  const warnings = [];

  if (!bridgeConfig.bridges || typeof bridgeConfig.bridges !== 'object') {
    errors.push('bridgeConfig.bridges must be a valid object');
    return { errors, warnings };
  }

  const requiredBridgeFields = ['name', 'version', 'contracts'];
  const knownBridgeTypes = ['layerzeroV1', 'layerzeroV2', 'wormhole', 'axelar', 'multichain'];

  for (const [bridgeKey, bridge] of Object.entries(bridgeConfig.bridges)) {
    if (!bridge || typeof bridge !== 'object') {
      errors.push(`Bridge ${bridgeKey} must be a valid object`);
      continue;
    }

    // Check required fields
    for (const field of requiredBridgeFields) {
      if (!bridge[field]) {
        errors.push(`Bridge ${bridgeKey} missing required field: ${field}`);
      }
    }

    // Validate contracts
    if (bridge.contracts && typeof bridge.contracts === 'object') {
      for (const [networkKey, contract] of Object.entries(bridge.contracts)) {
        if (!bridgeConfig.networks[networkKey]) {
          warnings.push(`Bridge ${bridgeKey} references unknown network: ${networkKey}`);
        }

        if (contract && typeof contract === 'object') {
          // Validate contract addresses
          if (contract.endpoint && !isValidEthereumAddress(contract.endpoint)) {
            errors.push(`Bridge ${bridgeKey} invalid endpoint address for ${networkKey}: ${contract.endpoint}`);
          }
          
          if (contract.router && !isValidEthereumAddress(contract.router)) {
            errors.push(`Bridge ${bridgeKey} invalid router address for ${networkKey}: ${contract.router}`);
          }
        }
      }
    }

    // Validate LayerZero specific configurations
    if (bridgeKey.includes('layerzero')) {
      const layerZeroValidation = validateLayerZeroBridge(bridgeKey, bridge);
      errors.push(...layerZeroValidation.errors);
      warnings.push(...layerZeroValidation.warnings);
    }

    // Warn about unknown bridge types
    if (!knownBridgeTypes.includes(bridgeKey)) {
      warnings.push(`Unknown bridge type: ${bridgeKey}. Consider adding to known types.`);
    }
  }

  return { errors, warnings };
}

/**
 * Validates token configurations
 */
function validateTokens() {
  const errors = [];
  const warnings = [];

  if (!bridgeConfig.tokens || typeof bridgeConfig.tokens !== 'object') {
    errors.push('bridgeConfig.tokens must be a valid object');
    return { errors, warnings };
  }

  for (const [tokenSymbol, tokenConfig] of Object.entries(bridgeConfig.tokens)) {
    if (!tokenConfig || typeof tokenConfig !== 'object') {
      errors.push(`Token ${tokenSymbol} must be a valid object`);
      continue;
    }

    // Validate bridge support
    if (tokenConfig.bridgeSupport && typeof tokenConfig.bridgeSupport === 'object') {
      for (const [bridgeKey, isSupported] of Object.entries(tokenConfig.bridgeSupport)) {
        if (!bridgeConfig.bridges[bridgeKey] && isSupported) {
          warnings.push(`Token ${tokenSymbol} references unknown bridge: ${bridgeKey}`);
        }
        
        if (typeof isSupported !== 'boolean') {
          errors.push(`Token ${tokenSymbol} bridge support for ${bridgeKey} must be boolean`);
        }
      }
    }

    // Validate custom contracts
    if (tokenConfig.contracts && typeof tokenConfig.contracts === 'object') {
      for (const [networkKey, contractAddress] of Object.entries(tokenConfig.contracts)) {
        if (!bridgeConfig.networks[networkKey]) {
          warnings.push(`Token ${tokenSymbol} references unknown network: ${networkKey}`);
        }
        
        if (contractAddress && !isValidEthereumAddress(contractAddress)) {
          errors.push(`Token ${tokenSymbol} invalid contract address for ${networkKey}: ${contractAddress}`);
        }
      }
    }

    // Cross-reference with token.config.js
    if (tokens && tokens[tokenSymbol] && tokenConfig.decimals !== tokens[tokenSymbol].decimals) {
      warnings.push(`Token ${tokenSymbol} decimals mismatch between bridgeConfig and token.config`);
    }
  }

  return { errors, warnings };
}

/**
 * Validates LayerZero specific bridge configuration
 */
function validateLayerZeroBridge(bridgeKey, bridge) {
  const errors = [];
  const warnings = [];

  // Validate LayerZero version
  if (bridgeKey === 'layerzeroV1' && bridge.version !== '1.0') {
    warnings.push(`LayerZero V1 bridge should have version '1.0', found: ${bridge.version}`);
  }
  
  if (bridgeKey === 'layerzeroV2' && bridge.version !== '2.0') {
    warnings.push(`LayerZero V2 bridge should have version '2.0', found: ${bridge.version}`);
  }

  // Validate LayerZero endpoints
  const knownV1Endpoints = {
    1: '0x66A71Dcef29A0fFBDBE3c6a460a3B5BC225Cd675', // Ethereum
    137: '0x3c2269811836af69497E5F486A85D7316753cf62', // Polygon
    56: '0x3c2269811836af69497E5F486A85D7316753cf62', // BSC
    43114: '0x3c2269811836af69497E5F486A85D7316753cf62', // Avalanche
    42161: '0x3c2269811836af69497E5F486A85D7316753cf62', // Arbitrum
    10: '0x3c2269811836af69497E5F486A85D7316753cf62' // Optimism
  };

  const knownV2Endpoints = {
    1: '0x1a44076050125825900e736c501f859c50fE728c', // Ethereum
    137: '0x1a44076050125825900e736c501f859c50fE728c', // Polygon
    56: '0x1a44076050125825900e736c501f859c50fE728c', // BSC
    43114: '0x1a44076050125825900e736c501f859c50fE728c', // Avalanche
    42161: '0x1a44076050125825900e736c501f859c50fE728c', // Arbitrum
    10: '0x1a44076050125825900e736c501f859c50fE728c' // Optimism
  };

  if (bridge.contracts) {
    for (const [networkKey, contract] of Object.entries(bridge.contracts)) {
      const network = bridgeConfig.networks[networkKey];
      if (!network) continue;

      const chainId = network.chainId;
      const expectedEndpoints = bridgeKey === 'layerzeroV1' ? knownV1Endpoints : knownV2Endpoints;
      
      if (contract.endpoint && expectedEndpoints[chainId] && contract.endpoint !== expectedEndpoints[chainId]) {
        warnings.push(`${bridgeKey} ${networkKey} endpoint may be incorrect. Expected: ${expectedEndpoints[chainId]}, Found: ${contract.endpoint}`);
      }
    }
  }

  return { errors, warnings };
}

/**
 * Validates cross-dependencies between configurations
 */
function validateCrossDependencies() {
  const errors = [];
  const warnings = [];

  // Validate that supported networks have corresponding bridge contracts
  for (const [tokenSymbol, tokenConfig] of Object.entries(bridgeConfig.tokens || {})) {
    if (tokenConfig.bridgeSupport) {
      for (const [bridgeKey, isSupported] of Object.entries(tokenConfig.bridgeSupport)) {
        if (isSupported && bridgeConfig.bridges[bridgeKey]) {
          const bridge = bridgeConfig.bridges[bridgeKey];
          const bridgeNetworks = Object.keys(bridge.contracts || {});
          const tokenNetworks = Object.keys(tokenConfig.contracts || {});
          
          // Check if token has contracts on networks where bridge is available
          const missingNetworks = bridgeNetworks.filter(net => !tokenNetworks.includes(net));
          if (missingNetworks.length > 0) {
            warnings.push(`Token ${tokenSymbol} supports ${bridgeKey} but missing contracts on: ${missingNetworks.join(', ')}`);
          }
        }
      }
    }
  }

  // Validate custom contracts exist for networks
  if (bridgeConfig.customContracts) {
    for (const [tokenSymbol, contracts] of Object.entries(bridgeConfig.customContracts)) {
      for (const [networkKey, contractAddress] of Object.entries(contracts)) {
        if (!bridgeConfig.networks[networkKey]) {
          warnings.push(`Custom contract for ${tokenSymbol} references unknown network: ${networkKey}`);
        }
        
        if (contractAddress && !isValidEthereumAddress(contractAddress)) {
          errors.push(`Custom contract for ${tokenSymbol} invalid address on ${networkKey}: ${contractAddress}`);
        }
      }
    }
  }

  return { errors, warnings };
}

/**
 * Validates Ethereum address format
 */
function isValidEthereumAddress(address) {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Validates URL format
 */
function isValidUrl(url) {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validates bridge configuration on module load
 */
function validateOnLoad() {
  try {
    const validation = validateBridgeConfig();
    
    if (validation.errors.length > 0) {
      console.error('❌ Bridge Configuration Validation Failed:');
      validation.errors.forEach(error => console.error(`  - ${error}`));
      throw new Error('Bridge configuration validation failed');
    }
    
    if (validation.warnings.length > 0) {
      console.warn('⚠️  Bridge Configuration Warnings:');
      validation.warnings.forEach(warning => console.warn(`  - ${warning}`));
    }
    
    console.log('✅ Bridge configuration validated successfully');
    console.log(`   Networks: ${validation.summary.totalNetworks}, Bridges: ${validation.summary.totalBridges}, Tokens: ${validation.summary.totalTokens}`);
    
    return validation;
  } catch (error) {
    console.error('❌ Bridge configuration validation error:', error.message);
    throw error;
  }
}

module.exports = {
  validateBridgeConfig,
  validateNetworks,
  validateBridges,
  validateTokens,
  validateLayerZeroBridge,
  validateCrossDependencies,
  validateOnLoad,
  isValidEthereumAddress,
  isValidUrl
};
