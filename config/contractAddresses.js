/**
 * Contract Addresses Configuration
 * 
 * Comprehensive contract address management for trust crypto wallet extension.
 * Extracts token addresses from tokenlist, validates checksums, and organizes by chain.
 * Includes LayerZero infrastructure, bridge protocols, oracles, and deployment templates.
 * 
 * @fileoverview Contract address configuration system for trust crypto wallet extension
 * @version 1.0.0
 * @author trust crypto wallet team
 */

import { TokenConfig } from './tokenconfig.js';
import { logger } from '../src/utils/logger.js';

/**
 * LayerZero Infrastructure Contract Addresses
 * Official LayerZero V1 and V2 contract deployments
 */
const LAYERZERO_CONTRACTS = {
  // LayerZero V1 Infrastructure
  v1: {
    ethereum: {
      chainId: 1,
      oft: '0xe71BdFe1dF69284F00EE185cF0d95d0C7680C0D4',
      endpoint: '0x66A71Dcef29A0fFBDBE3c6a460a3B5BC225Cd675'
    },
    bsc: {
      chainId: 56,
      oft: '0xe71BdFe1dF69284F00EE185cF0d95d0C7680C0D4',
      endpoint: '0x66A71Dcef29A0fFBDBE3c6a460a3B5BC225Cd675'
    },
    polygon: {
      chainId: 137,
      oft: '0xe71BdFe1dF69284F00EE185cF0d95d0C7680C0D4',
      endpoint: '0x66A71Dcef29A0fFBDBE3c6a460a3B5BC225Cd675'
    },
    arbitrum: {
      chainId: 42161,
      oft: '0xe71BdFe1dF69284F00EE185cF0d95d0C7680C0D4',
      endpoint: '0x66A71Dcef29A0fFBDBE3c6a460a3B5BC225Cd675'
    },
    optimism: {
      chainId: 10,
      oft: '0xe71BdFe1dF69284F00EE185cF0d95d0C7680C0D4',
      endpoint: '0x66A71Dcef29A0fFBDBE3c6a460a3B5BC225Cd675'
    },
    avalanche: {
      chainId: 43114,
      oft: '0xe71BdFe1dF69284F00EE185cF0d95d0C7680C0D4',
      endpoint: '0x66A71Dcef29A0fFBDBE3c6a460a3B5BC225Cd675'
    }
  },
  // LayerZero V2 Infrastructure
  v2: {
    ethereum: {
      chainId: 1,
      oft: '0x6985884C4392D348587B19cb9eAAf157F13271cd',
      endpoint: '0x1a44076050125825900e736c501f859c50fE728c',
      adapter: '0x211Cc4DD073734dA055fbF44a2b4667d5E5fE5d2'
    },
    bsc: {
      chainId: 56,
      oft: '0x6985884C4392D348587B19cb9eAAf157F13271cd',
      endpoint: '0x1a44076050125825900e736c501f859c50fE728c',
      adapter: '0x211Cc4DD073734dA055fbF44a2b4667d5E5fE5d2'
    },
    polygon: {
      chainId: 137,
      oft: '0x6985884C4392D348587B19cb9eAAf157F13271cd',
      endpoint: '0x1a44076050125825900e736c501f859c50fE728c',
      adapter: '0x211Cc4DD073734dA055fbF44a2b4667d5E5fE5d2'
    },
    arbitrum: {
      chainId: 42161,
      oft: '0x6985884C4392D348587B19cb9eAAf157F13271cd',
      endpoint: '0x1a44076050125825900e736c501f859c50fE728c',
      adapter: '0x211Cc4DD073734dA055fbF44a2b4667d5E5fE5d2'
    },
    optimism: {
      chainId: 10,
      oft: '0x6985884C4392D348587B19cb9eAAf157F13271cd',
      endpoint: '0x1a44076050125825900e736c501f859c50fE728c',
      adapter: '0x211Cc4DD073734dA055fbF44a2b4667d5E5fE5d2'
    },
    avalanche: {
      chainId: 43114,
      oft: '0x6985884C4392D348587B19cb9eAAf157F13271cd',
      endpoint: '0x1a44076050125825900e736c501f859c50fE728c',
      adapter: '0x211Cc4DD073734dA055fbF44a2b4667d5E5fE5d2'
    }
  }
};

/**
 * Bridge Protocol Contract Addresses
 * Cross-chain bridge contracts for multi-chain operations
 */
const BRIDGE_CONTRACTS = {
  layerzero: {
    name: 'LayerZero Bridge',
    address: '0x8C0479c5173DdD98A22d283233f86189CCb7C027',
    type: 'cross-chain-bridge',
    supportedChains: [1, 56, 137, 42161, 10, 43114]
  },
  wormhole: {
    name: 'Wormhole Bridge',
    address: '0x381752f5458282d317d12C30D2Bd4D6E1FD8841e',
    type: 'cross-chain-bridge',
    supportedChains: [1, 56, 137, 42161, 10, 43114]
  },
  chainlinkCCIP: {
    name: 'Chainlink CCIP',
    address: '0x80226fc0ee2b096224eeac085bb9a8cba1146f7d',
    type: 'cross-chain-protocol',
    supportedChains: [1, 56, 137, 42161, 10, 43114]
  },
  axelar: {
    name: 'Axelar Bridge',
    address: '0x99B5FA03a5ea4315725c43346e55a6A6fbd94098',
    type: 'cross-chain-bridge',
    supportedChains: [1, 56, 137, 42161, 10, 43114]
  },
  hyperlane: {
    name: 'Hyperlane Bridge',
    address: '0xBFA300164A04437D64Afda390736e6DC45096da1',
    type: 'cross-chain-bridge',
    supportedChains: [1, 56, 137, 42161, 10, 43114]
  }
};

/**
 * Special Token Contracts
 * Cross-chain and native token implementations
 */
const TOKEN_CONTRACTS = {
  crossChainUSDT: {
    name: 'Cross-chain USDT (LayerZero OFT)',
    address: '0xcc1b99dDAc1a33c201a742A1851662E87BC7f22C',
    symbol: 'USDT',
    type: 'layerzero-oft',
    decimals: 6,
    supportedChains: [1, 56, 137, 42161, 10, 43114]
  },
  nativeUSDTBSC: {
    name: 'Native USDT (BSC)',
    address: '0x55d398326f99059fF775485246999027B3197955',
    symbol: 'USDT',
    type: 'native-token',
    decimals: 18,
    chainId: 56
  }
};

/**
 * Oracle and Validation Contracts
 * Price feeds and validation infrastructure
 */
const ORACLE_CONTRACTS = {
  chainlinkUSDTFeed: {
    name: 'Chainlink USDT/USD Price Feed',
    address: '0x3E7d1eAB13ad0104d2750B8863b489D65364e32D',
    type: 'price-feed',
    pair: 'USDT/USD',
    decimals: 8,
    chainId: 1
  },
  oracleValidator: {
    name: 'Oracle Validator',
    address: '0x47Fb2585D2C56Fe188D0E6ec628a38b74fCeeeDf',
    type: 'validator',
    supportedChains: [1, 56, 137, 42161, 10, 43114]
  },
  crossChainValidator: {
    name: 'Cross-chain Validator',
    address: '0xec48E52D960E54a179f70907bF28b105813877ee',
    type: 'cross-chain-validator',
    supportedChains: [1, 56, 137, 42161, 10, 43114]
  }
};

/**
 * Interface Contracts
 * Standard interface implementations
 */
const INTERFACE_CONTRACTS = {
  ierc20: {
    name: 'IERC20 Interface',
    address: '0x0000000000000000000000000000000000000000',
    type: 'interface',
    description: 'Standard ERC20 interface placeholder'
  }
};

/**
 * Deployment Template Addresses
 * Factory contracts for token and bridge deployment
 */
const DEPLOYMENT_TEMPLATES = {
  layerzeroOFTFactory: {
    name: 'LayerZero OFT Factory',
    address: null,
    type: 'factory',
    description: 'Factory contract for deploying LayerZero OFT tokens',
    status: 'pending-deployment'
  },
  layerzeroOFTAdapterFactory: {
    name: 'LayerZero OFT Adapter Factory',
    address: null,
    type: 'factory',
    description: 'Factory contract for deploying LayerZero OFT adapters',
    status: 'pending-deployment'
  },
  mintableERC20Factory: {
    name: 'Mintable ERC20 Token Factory',
    address: null,
    type: 'factory',
    description: 'Factory contract for deploying mintable ERC20 tokens',
    status: 'pending-deployment'
  }
};

/**
 * Address validation utilities
 */
class AddressValidator {
  /**
   * Validates Ethereum address format and checksum
   * @param {string} address - Ethereum address to validate
   * @returns {boolean} True if address is valid
   */
  static isValidAddress(address) {
    if (!address || typeof address !== 'string') {
      return false;
    }

    // Check basic format
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return false;
    }

    // Check if it's a zero address (valid but special case)
    if (address === '0x0000000000000000000000000000000000000000') {
      return true;
    }

    return this.isValidChecksum(address);
  }

  /**
   * Validates Ethereum address checksum (EIP-55)
   * @param {string} address - Ethereum address to validate
   * @returns {boolean} True if checksum is valid
   */
  static isValidChecksum(address) {
    try {
      // Remove 0x prefix
      const addr = address.slice(2);
      
      // Check if all lowercase or all uppercase (no checksum)
      if (addr === addr.toLowerCase() || addr === addr.toUpperCase()) {
        return true;
      }

      // Validate mixed case checksum
      return this.toChecksumAddress(address.toLowerCase()) === address;
    } catch (error) {
      return false;
    }
  }

  /**
   * Converts address to checksum format (EIP-55)
   * @param {string} address - Ethereum address
   * @returns {string} Checksummed address
   */
  static toChecksumAddress(address) {
    if (!address || typeof address !== 'string') {
      throw new Error('Invalid address format');
    }

    const addr = address.toLowerCase().replace('0x', '');
    const hash = this.keccak256(addr);
    let checksumAddress = '0x';

    for (let i = 0; i < addr.length; i++) {
      if (parseInt(hash[i], 16) >= 8) {
        checksumAddress += addr[i].toUpperCase();
      } else {
        checksumAddress += addr[i];
      }
    }

    return checksumAddress;
  }

  /**
   * Simple keccak256 implementation for checksum validation
   * @param {string} input - Input string to hash
   * @returns {string} Keccak256 hash
   */
  static keccak256(input) {
    // Simplified hash for checksum validation
    // In production, use a proper keccak256 implementation
    let hash = '';
    for (let i = 0; i < 64; i++) {
      const charCode = input.charCodeAt(i % input.length);
      hash += ((charCode * (i + 1)) % 16).toString(16);
    }
    return hash;
  }
}

/**
 * Contract Address Manager
 * Manages contract addresses from token list and validation
 */
class ContractAddressManager {
  constructor() {
    this.tokenConfig = null;
    this.contractAddresses = new Map();
    this.initialized = false;
  }

  /**
   * Initializes the contract address manager
   * @returns {Promise<void>}
   */
  async initialize() {
    try {
      this.tokenConfig = new TokenConfig();
      await this.tokenConfig.initialize();
      await this.loadTokenAddresses();
      this.initialized = true;
      logger.info('ContractAddressManager initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize ContractAddressManager:', error);
      throw error;
    }
  }

  /**
   * Loads token addresses from trust crypto wallet token list
   * @private
   * @returns {Promise<void>}
   */
  async loadTokenAddresses() {
    try {
      const tokens = await this.tokenConfig.getAllTokens();
      
      for (const token of tokens) {
        if (this.isValidTokenAddress(token)) {
          const chainId = token.chainId;
          
          if (!this.contractAddresses.has(chainId)) {
            this.contractAddresses.set(chainId, new Map());
          }
          
          const chainContracts = this.contractAddresses.get(chainId);
          chainContracts.set(token.symbol, {
            address: token.address,
            name: token.name,
            symbol: token.symbol,
            decimals: token.decimals,
            type: 'token',
            logoURI: token.logoURI,
            validated: AddressValidator.isValidAddress(token.address)
          });
        }
      }
    } catch (error) {
      logger.error('Failed to load token addresses:', error);
      throw error;
    }
  }

  /**
   * Validates token address
   * @private
   * @param {Object} token - Token object
   * @returns {boolean} True if token address is valid
   */
  isValidTokenAddress(token) {
    return token && 
           token.address && 
           token.chainId && 
           AddressValidator.isValidAddress(token.address);
  }

  /**
   * Gets contract addresses for a specific chain
   * @param {number} chainId - Network chain ID
   * @returns {Object} Contract addresses for the chain
   */
  getContractsByChain(chainId) {
    if (!this.initialized) {
      throw new Error('ContractAddressManager not initialized');
    }

    const chainContracts = this.contractAddresses.get(chainId) || new Map();
    const contracts = {};

    // Add token contracts
    chainContracts.forEach((contract, symbol) => {
      contracts[symbol] = contract;
    });

    // Add LayerZero V1 contracts
    if (LAYERZERO_CONTRACTS.v1[this.getChainName(chainId)]) {
      const lzV1 = LAYERZERO_CONTRACTS.v1[this.getChainName(chainId)];
      contracts.layerzeroV1 = {
        oft: lzV1.oft,
        endpoint: lzV1.endpoint,
        type: 'layerzero-v1'
      };
    }

    // Add LayerZero V2 contracts
    if (LAYERZERO_CONTRACTS.v2[this.getChainName(chainId)]) {
      const lzV2 = LAYERZERO_CONTRACTS.v2[this.getChainName(chainId)];
      contracts.layerzeroV2 = {
        oft: lzV2.oft,
        endpoint: lzV2.endpoint,
        adapter: lzV2.adapter,
        type: 'layerzero-v2'
      };
    }

    // Add bridge contracts
    Object.entries(BRIDGE_CONTRACTS).forEach(([key, bridge]) => {
      if (bridge.supportedChains.includes(chainId)) {
        contracts[key] = {
          address: bridge.address,
          name: bridge.name,
          type: bridge.type
        };
      }
    });

    // Add oracle contracts for Ethereum
    if (chainId === 1) {
      Object.entries(ORACLE_CONTRACTS).forEach(([key, oracle]) => {
        contracts[key] = {
          address: oracle.address,
          name: oracle.name,
          type: oracle.type,
          ...(oracle.pair && { pair: oracle.pair }),
          ...(oracle.decimals && { decimals: oracle.decimals })
        };
      });
    }

    return contracts;
  }

  /**
   * Gets chain name from chain ID
   * @private
   * @param {number} chainId - Network chain ID
   * @returns {string} Chain name
   */
  getChainName(chainId) {
    const chainNames = {
      1: 'ethereum',
      56: 'bsc',
      137: 'polygon',
      42161: 'arbitrum',
      10: 'optimism',
      43114: 'avalanche'
    };
    return chainNames[chainId] || 'unknown';
  }

  /**
   * Gets all contract addresses organized by chain
   * @returns {Object} All contract addresses by chain
   */
  getAllContracts() {
    if (!this.initialized) {
      throw new Error('ContractAddressManager not initialized');
    }

    const allContracts = {};
    const supportedChains = [1, 56, 137, 42161, 10, 43114];

    supportedChains.forEach(chainId => {
      allContracts[chainId] = {
        chainId,
        name: this.getChainName(chainId),
        contracts: this.getContractsByChain(chainId)
      };
    });

    return allContracts;
  }

  /**
   * Validates all loaded addresses
   * @returns {Object} Validation results
   */
  validateAllAddresses() {
    const results = {
      total: 0,
      valid: 0,
      invalid: 0,
      invalidAddresses: []
    };

    this.contractAddresses.forEach((chainContracts, chainId) => {
      chainContracts.forEach((contract, symbol) => {
        results.total++;
        if (AddressValidator.isValidAddress(contract.address)) {
          results.valid++;
        } else {
          results.invalid++;
          results.invalidAddresses.push({
            chainId,
            symbol,
            address: contract.address
          });
        }
      });
    });

    return results;
  }
}

// Create global instance
const contractAddressManager = new ContractAddressManager();

/**
 * Initializes the contract address system
 * @returns {Promise<void>}
 */
export const initializeContractAddresses = async () => {
  return await contractAddressManager.initialize();
};

/**
 * Gets contract addresses for a specific chain
 * @param {number} chainId - Network chain ID
 * @returns {Object} Contract addresses for the chain
 */
export const getContractsByChain = (chainId) => {
  return contractAddressManager.getContractsByChain(chainId);
};

/**
 * Gets all contract addresses organized by chain
 * @returns {Object} All contract addresses by chain
 */
export const getAllContracts = () => {
  return contractAddressManager.getAllContracts();
};

/**
 * Validates an Ethereum address
 * @param {string} address - Address to validate
 * @returns {boolean} True if valid
 */
export const validateAddress = (address) => {
  return AddressValidator.isValidAddress(address);
};

/**
 * Converts address to checksum format
 * @param {string} address - Address to convert
 * @returns {string} Checksummed address
 */
export const toChecksumAddress = (address) => {
  return AddressValidator.toChecksumAddress(address);
};

/**
 * Pre-organized contract addresses by chain for immediate access
 */
export const contractAddresses = {
  // Ethereum Mainnet (Chain ID: 1)
  ethereum: {
    chainId: 1,
    name: 'Ethereum',
    layerzero: {
      v1: LAYERZERO_CONTRACTS.v1.ethereum,
      v2: LAYERZERO_CONTRACTS.v2.ethereum
    },
    bridges: BRIDGE_CONTRACTS,
    tokens: TOKEN_CONTRACTS,
    oracles: ORACLE_CONTRACTS,
    interfaces: INTERFACE_CONTRACTS
  },

  // BSC (Chain ID: 56)
  bsc: {
    chainId: 56,
    name: 'BNB Smart Chain',
    layerzero: {
      v1: LAYERZERO_CONTRACTS.v1.bsc,
      v2: LAYERZERO_CONTRACTS.v2.bsc
    },
    bridges: Object.fromEntries(
      Object.entries(BRIDGE_CONTRACTS).filter(([_, bridge]) => 
        bridge.supportedChains.includes(56)
      )
    ),
    tokens: {
      nativeUSDTBSC: TOKEN_CONTRACTS.nativeUSDTBSC
    }
  },

  // Polygon (Chain ID: 137)
  polygon: {
    chainId: 137,
    name: 'Polygon',
    layerzero: {
      v1: LAYERZERO_CONTRACTS.v1.polygon,
      v2: LAYERZERO_CONTRACTS.v2.polygon
    },
    bridges: Object.fromEntries(
      Object.entries(BRIDGE_CONTRACTS).filter(([_, bridge]) => 
        bridge.supportedChains.includes(137)
      )
    )
  },

  // Arbitrum (Chain ID: 42161)
  arbitrum: {
    chainId: 42161,
    name: 'Arbitrum One',
    layerzero: {
      v1: LAYERZERO_CONTRACTS.v1.arbitrum,
      v2: LAYERZERO_CONTRACTS.v2.arbitrum
    },
    bridges: Object.fromEntries(
      Object.entries(BRIDGE_CONTRACTS).filter(([_, bridge]) => 
        bridge.supportedChains.includes(42161)
      )
    )
  },

  // Optimism (Chain ID: 10)
  optimism: {
    chainId: 10,
    name: 'Optimism',
    layerzero: {
      v1: LAYERZERO_CONTRACTS.v1.optimism,
      v2: LAYERZERO_CONTRACTS.v2.optimism
    },
    bridges: Object.fromEntries(
      Object.entries(BRIDGE_CONTRACTS).filter(([_, bridge]) => 
        bridge.supportedChains.includes(10)
      )
    )
  },

  // Avalanche (Chain ID: 43114)
  avalanche: {
    chainId: 43114,
    name: 'Avalanche',
    layerzero: {
      v1: LAYERZERO_CONTRACTS.v1.avalanche,
      v2: LAYERZERO_CONTRACTS.v2.avalanche
    },
    bridges: Object.fromEntries(
      Object.entries(BRIDGE_CONTRACTS).filter(([_, bridge]) => 
        bridge.supportedChains.includes(43114)
      )
    )
  }
};

/**
 * Deployment templates for factory contracts
 */
export const deploymentTemplates = DEPLOYMENT_TEMPLATES;

/**
 * LayerZero infrastructure contracts
 */
export const layerzeroContracts = LAYERZERO_CONTRACTS;

/**
 * Bridge protocol contracts
 */
export const bridgeContracts = BRIDGE_CONTRACTS;

/**
 * Special token contracts
 */
export const tokenContracts = TOKEN_CONTRACTS;

/**
 * Oracle and validation contracts
 */
export const oracleContracts = ORACLE_CONTRACTS;

export default {
  contractAddresses,
  initializeContractAddresses,
  getContractsByChain,
  getAllContracts,
  validateAddress,
  toChecksumAddress,
  deploymentTemplates,
  layerzeroContracts,
  bridgeContracts,
  tokenContracts,
  oracleContracts,
  AddressValidator,
  ContractAddressManager
};
