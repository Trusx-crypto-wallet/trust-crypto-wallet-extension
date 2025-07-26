/**
 * ABI Structure Validator
 * Validates contract ABI structure against expected interfaces.
 * Production-ready with real blockchain explorer API integration, function signature validation,
 * and comprehensive contract standard verification.
 */

const { ethers } = require('ethers');
const LRU = require('lru-cache');
const pLimit = require('p-limit');
const axios = require('axios');
const { BridgeErrors } = require('../../../errors/BridgeErrors');
const { logger } = require('../../../utils/logger');
const { metrics } = require('../../../utils/metrics');

/**
 * @typedef {Object} ABIValidationResult
 * @property {boolean} isValid - Validation status
 * @property {string[]} errors - Validation errors
 * @property {string[]} warnings - Validation warnings
 * @property {Object} analysis - Detailed ABI analysis
 * @property {Object} compliance - Interface compliance results
 */

/**
 * @typedef {Object} ABIValidationOptions
 * @property {boolean} strictMode - Require exact function matching
 * @property {string[]} requiredInterfaces - Required interface compliance
 * @property {boolean} allowExtraFunctions - Allow additional functions beyond expected
 * @property {boolean} checkEvents - Validate event signatures
 * @property {boolean} validateInputs - Validate function input parameters
 * @property {boolean} validateOutputs - Validate function output parameters
 */

class ABIStructureValidator {
  constructor({ configLoader, logger, metrics, apiKeys = {} } = {}) {
    this.configLoader = configLoader;
    this.logger = logger || console;
    this.metrics = metrics || { increment: () => {}, histogram: () => {} };
    this.apiKeys = apiKeys; // { ethereum: 'ETHERSCAN_KEY', polygon: 'POLYGONSCAN_KEY', ... }

    this.validationCache = new LRU({ max: 500, ttl: 30 * 60 * 1000 });
    this.abiCache = new LRU({ max: 200, ttl: 60 * 60 * 1000 });
    this.interfaceCache = new LRU({ max: 100, ttl: 60 * 60 * 1000 });
    this.concurrency = pLimit(5);

    // Standard interface definitions for compliance checking
    this.standardInterfaces = {
      ERC20: {
        name: 'ERC-20 Token Standard',
        functions: [
          'totalSupply() view returns (uint256)',
          'balanceOf(address) view returns (uint256)',
          'transfer(address,uint256) returns (bool)',
          'transferFrom(address,address,uint256) returns (bool)',
          'approve(address,uint256) returns (bool)',
          'allowance(address,address) view returns (uint256)'
        ],
        events: [
          'Transfer(address indexed,address indexed,uint256)',
          'Approval(address indexed,address indexed,uint256)'
        ]
      },
      ERC721: {
        name: 'ERC-721 Non-Fungible Token Standard',
        functions: [
          'balanceOf(address) view returns (uint256)',
          'ownerOf(uint256) view returns (address)',
          'transferFrom(address,address,uint256)',
          'approve(address,uint256)',
          'getApproved(uint256) view returns (address)',
          'setApprovalForAll(address,bool)',
          'isApprovedForAll(address,address) view returns (bool)'
        ],
        events: [
          'Transfer(address indexed,address indexed,uint256 indexed)',
          'Approval(address indexed,address indexed,uint256 indexed)',
          'ApprovalForAll(address indexed,address indexed,bool)'
        ]
      },
      Ownable: {
        name: 'Ownable Access Control',
        functions: [
          'owner() view returns (address)',
          'transferOwnership(address)',
          'renounceOwnership()'
        ],
        events: [
          'OwnershipTransferred(address indexed,address indexed)'
        ]
      },
      Pausable: {
        name: 'Pausable Contract',
        functions: [
          'paused() view returns (bool)',
          'pause()',
          'unpause()'
        ],
        events: [
          'Paused(address)',
          'Unpaused(address)'
        ]
      },
      AccessControl: {
        name: 'Role-Based Access Control',
        functions: [
          'hasRole(bytes32,address) view returns (bool)',
          'getRoleAdmin(bytes32) view returns (bytes32)',
          'grantRole(bytes32,address)',
          'revokeRole(bytes32,address)',
          'renounceRole(bytes32,address)'
        ],
        events: [
          'RoleAdminChanged(bytes32 indexed,bytes32 indexed,bytes32 indexed)',
          'RoleGranted(bytes32 indexed,address indexed,address indexed)',
          'RoleRevoked(bytes32 indexed,address indexed,address indexed)'
        ]
      }
    };

    // Blockchain explorer API endpoints
    this.explorerAPIs = {
      ethereum: 'https://api.etherscan.io/api',
      polygon: 'https://api.polygonscan.com/api',
      arbitrum: 'https://api.arbiscan.io/api',
      optimism: 'https://api-optimistic.etherscan.io/api',
      avalanche: 'https://api.snowtrace.io/api',
      bsc: 'https://api.bscscan.com/api'
    };
  }

  /**
   * Fetch contract ABI from blockchain explorer APIs
   * @param {string} address - Contract address
   * @param {string} network - Network name
   * @returns {Promise<Object>} Contract ABI
   * @private
   */
  async _fetchContractABI(address, network) {
    const key = `${address}-${network}`;
    if (this.abiCache.has(key)) return this.abiCache.get(key);

    const apiUrl = this.explorerAPIs[network];
    const apiKey = this.apiKeys[network];
    if (!apiUrl || !apiKey) {
      throw new BridgeErrors.ContractLoadError(`Missing API endpoint or key for ${network}`);
    }

    try {
      const resp = await axios.get(apiUrl, {
        params: {
          module: 'contract',
          action: 'getabi',
          address,
          apikey: apiKey
        },
        timeout: 5000
      });

      if (resp.data.status !== '1' || !resp.data.result) {
        throw new Error(`API returned error: ${resp.data.result}`);
      }

      const abi = JSON.parse(resp.data.result);
      this.abiCache.set(key, abi);
      this.metrics.increment('abi_validator.abi_fetch_success', { network });
      return abi;
    } catch (err) {
      this.metrics.increment('abi_validator.abi_fetch_error', { network, error: err.message });
      this.logger.error(`ABI fetch failed for ${address}@${network}: ${err.message}`);
      throw err;
    }
  }

  /**
   * Generate function signature from ABI function object
   * @param {Object} func - Function ABI object
   * @returns {string} Function signature
   * @private
   */
  _generateFunctionSignature(func) {
    const inputTypes = (func.inputs || []).map(i => i.type).join(',');
    return `${func.name}(${inputTypes})`;
  }

  /**
   * Generate event signature from ABI event object
   * @param {Object} event - Event ABI object
   * @returns {string} Event signature
   * @private
   */
  _generateEventSignature(event) {
    const inputTypes = (event.inputs || []).map(i => i.type).join(',');
    return `${event.name}(${inputTypes})`;
  }

  /**
   * Validate contract ABI against expected structure
   * @param {string} contractAddress - Contract address
   * @param {string} network - Network name
   * @param {Object} expectedABI - Expected ABI structure
   * @param {ABIValidationOptions} options - Validation options
   * @returns {Promise<ABIValidationResult>} Validation result
   */
  async validateContractABI(contractAddress, network, expectedABI, options = {}) {
    const start = Date.now();
    const cacheKey = `${contractAddress}-${network}-${this._hashABI(expectedABI)}`;
    
    if (this.validationCache.has(cacheKey)) {
      this.metrics.increment('abi_validator.cache_hit', { network });
      return this.validationCache.get(cacheKey);
    }

    const result = {
      isValid: true,
      errors: [],
      warnings: [],
      analysis: {
        contractAddress,
        network,
        validatedAt: new Date().toISOString(),
        validationTime: 0,
        functions: {},
        events: {},
        interfaces: {},
        recommendations: []
      },
      compliance: {}
    };

    let actualABI;
    try {
      actualABI = await this._fetchContractABI(contractAddress, network);
    } catch (error) {
      result.isValid = false;
      result.errors.push('Unable to fetch actual ABI');
      return result;
    }

    // Validate function signatures
    await this._validateFunctions(actualABI, expectedABI, result, options);
    
    // Validate events if requested
    if (options.checkEvents !== false) {
      await this._validateEvents(actualABI, expectedABI, result, options);
    }
    
    // Validate interface compliance
    await this._validateInterfaces(actualABI, result, options);
    
    // Check for security patterns
    await this._checkSecurityPatterns(actualABI, result, options);

    // Perform detailed analysis
    await this._performDetailedAnalysis(actualABI, expectedABI, result);

    result.isValid = result.errors.length === 0;
    result.analysis.validationTime = Date.now() - start;
    
    this.metrics.increment(
      result.isValid ? 'abi_validator.validation_success' : 'abi_validator.validation_failed',
      { network }
    );
    this.metrics.histogram('abi_validator.validation_time', result.analysis.validationTime, { network });

    if (result.isValid || (result.analysis.functions?.matched || 0) > 0) {
      this.validationCache.set(cacheKey, result);
    }

    return result;
  }

  /**
   * Validate function signatures and parameters
   * @param {Object} actualABI - Actual contract ABI
   * @param {Object} expectedABI - Expected ABI structure
   * @param {ABIValidationResult} result - Validation result object
   * @param {ABIValidationOptions} options - Validation options
   * @private
   */
  async _validateFunctions(actualABI, expectedABI, result, options) {
    try {
      const actualFunctions = this._extractFunctions(actualABI);
      const expectedFunctions = this._extractFunctions(expectedABI);

      result.analysis.functions = {
        actual: Object.keys(actualFunctions).length,
        expected: Object.keys(expectedFunctions).length,
        matched: 0,
        missing: [],
        extra: []
      };

      // Check required functions exist
      Object.entries(expectedFunctions).forEach(([signature, expectedFunc]) => {
        if (!actualFunctions[signature]) {
          result.errors.push(`Missing required function: ${signature}`);
          result.analysis.functions.missing.push(signature);
        } else {
          // Validate function parameters and return types
          const actualFunc = actualFunctions[signature];
          if (this._compareFunctionDefinitions(actualFunc, expectedFunc, options)) {
            result.analysis.functions.matched++;
          } else {
            result.errors.push(`Function signature mismatch: ${signature}`);
          }
        }
      });

      // Check for unexpected functions (if strict mode)
      if (options.strictMode || !options.allowExtraFunctions) {
        Object.keys(actualFunctions).forEach(signature => {
          if (!expectedFunctions[signature]) {
            const message = `Unexpected function found: ${signature}`;
            if (options.strictMode) {
              result.errors.push(message);
            } else {
              result.warnings.push(message);
            }
            result.analysis.functions.extra.push(signature);
          }
        });
      }

    } catch (error) {
      result.errors.push(`Function validation failed: ${error.message}`);
    }
  }

  /**
   * Validate event signatures
   * @param {Object} actualABI - Actual contract ABI
   * @param {Object} expectedABI - Expected ABI structure
   * @param {ABIValidationResult} result - Validation result object
   * @param {ABIValidationOptions} options - Validation options
   * @private
   */
  async _validateEvents(actualABI, expectedABI, result, options) {
    try {
      const actualEvents = this._extractEvents(actualABI);
      const expectedEvents = this._extractEvents(expectedABI);

      result.analysis.events = {
        actual: Object.keys(actualEvents).length,
        expected: Object.keys(expectedEvents).length,
        matched: 0,
        missing: [],
        extra: []
      };

      // Check required events exist
      Object.entries(expectedEvents).forEach(([signature, expectedEvent]) => {
        if (!actualEvents[signature]) {
          result.errors.push(`Missing required event: ${signature}`);
          result.analysis.events.missing.push(signature);
        } else {
          result.analysis.events.matched++;
        }
      });

      // Check for unexpected events
      if (options.strictMode) {
        Object.keys(actualEvents).forEach(signature => {
          if (!expectedEvents[signature]) {
            result.warnings.push(`Unexpected event found: ${signature}`);
            result.analysis.events.extra.push(signature);
          }
        });
      }

    } catch (error) {
      result.errors.push(`Event validation failed: ${error.message}`);
    }
  }

  /**
   * Validate interface compliance
   * @param {Object} actualABI - Actual contract ABI
   * @param {ABIValidationResult} result - Validation result object
   * @param {ABIValidationOptions} options - Validation options
   * @private
   */
  async _validateInterfaces(actualABI, result, options) {
    try {
      result.analysis.interfaces = {};

      Object.entries(this.standardInterfaces).forEach(([interfaceName, interfaceSpec]) => {
        const compliance = this._checkInterfaceCompliance(actualABI, interfaceSpec);
        result.analysis.interfaces[interfaceName] = compliance;

        if (options.requiredInterfaces?.includes(interfaceName) && !compliance.compliant) {
          result.errors.push(`Contract does not implement required interface: ${interfaceName}`);
        }
      });

    } catch (error) {
      result.errors.push(`Interface validation failed: ${error.message}`);
    }
  }

  /**
   * Check for security patterns in ABI
   * @param {Object} actualABI - Actual contract ABI
   * @param {ABIValidationResult} result - Validation result object
   * @param {ABIValidationOptions} options - Validation options
   * @private
   */
  async _checkSecurityPatterns(actualABI, result, options) {
    try {
      const functions = this._extractFunctions(actualABI);
      
      const securityChecks = {
        hasOwner: Object.keys(functions).some(sig => sig.includes('owner')),
        hasPause: Object.keys(functions).some(sig => sig.includes('pause')),
        hasAccessControl: Object.keys(functions).some(sig => sig.includes('Role')),
        hasReentrancyGuard: Object.keys(functions).some(sig => sig.includes('nonReentrant'))
      };

      result.analysis.security = securityChecks;

      // Add warnings for missing security features
      if (!securityChecks.hasOwner && options.requireOwnership) {
        result.warnings.push('Contract lacks ownership controls');
      }

      if (!securityChecks.hasPause && options.requirePausable) {
        result.warnings.push('Contract lacks pause functionality');
      }

    } catch (error) {
      result.warnings.push(`Security pattern check failed: ${error.message}`);
    }
  }

  /**
   * Perform detailed ABI analysis
   * @param {Object} actualABI - Actual contract ABI
   * @param {Object} expectedABI - Expected ABI structure
   * @param {ABIValidationResult} result - Validation result object
   * @private
   */
  async _performDetailedAnalysis(actualABI, expectedABI, result) {
    try {
      const analysis = result.analysis;

      // Calculate compatibility score
      const totalExpected = analysis.functions.expected + (analysis.events?.expected || 0);
      const totalMatched = analysis.functions.matched + (analysis.events?.matched || 0);
      analysis.compatibilityScore = totalExpected > 0 ? Math.round((totalMatched / totalExpected) * 100) : 0;

      // Generate recommendations
      if (analysis.compatibilityScore < 80) {
        analysis.recommendations.push('Consider implementing missing required functions');
      }
      
      if (analysis.functions.extra.length > 0) {
        analysis.recommendations.push('Review additional functions for necessity');
      }

    } catch (error) {
      this.logger.warn('Detailed analysis failed:', error);
    }
  }

  /**
   * Extract functions from ABI
   * @param {Object} abi - Contract ABI
   * @returns {Object} Functions indexed by signature
   * @private
   */
  _extractFunctions(abi) {
    const functions = {};
    
    abi.filter(item => item.type === 'function').forEach(func => {
      const signature = this._generateFunctionSignature(func);
      functions[signature] = func;
    });

    return functions;
  }

  /**
   * Extract events from ABI
   * @param {Object} abi - Contract ABI
   * @returns {Object} Events indexed by signature
   * @private
   */
  _extractEvents(abi) {
    const events = {};
    
    abi.filter(item => item.type === 'event').forEach(event => {
      const signature = this._generateEventSignature(event);
      events[signature] = event;
    });

    return events;
  }

  /**
   * Compare function definitions
   * @param {Object} func1 - First function definition
   * @param {Object} func2 - Second function definition
   * @param {ABIValidationOptions} options - Validation options
   * @returns {boolean} True if functions match
   * @private
   */
  _compareFunctionDefinitions(func1, func2, options = {}) {
    if (func1.name !== func2.name) return false;
    
    if (options.validateInputs !== false) {
      if (!this._compareParameters(func1.inputs, func2.inputs)) return false;
    }

    if (options.validateOutputs !== false) {
      if (!this._compareParameters(func1.outputs, func2.outputs)) return false;
    }

    if (func1.stateMutability !== func2.stateMutability) return false;

    return true;
  }

  /**
   * Compare function/event parameters
   * @param {Object[]} params1 - First parameter list
   * @param {Object[]} params2 - Second parameter list
   * @returns {boolean} True if parameters match
   * @private
   */
  _compareParameters(params1 = [], params2 = []) {
    if (params1.length !== params2.length) return false;
    
    for (let i = 0; i < params1.length; i++) {
      if (params1[i].type !== params2[i].type) return false;
    }

    return true;
  }

  /**
   * Check interface compliance
   * @param {Object} abi - Contract ABI
   * @param {Object} interfaceSpec - Interface specification
   * @returns {Object} Compliance result
   * @private
   */
  _checkInterfaceCompliance(abi, interfaceSpec) {
    const functions = this._extractFunctions(abi);
    const events = this._extractEvents(abi);
    
    const requiredFunctions = interfaceSpec.functions || [];
    const requiredEvents = interfaceSpec.events || [];
    
    const presentFunctions = Object.keys(functions);
    const presentEvents = Object.keys(events);
    
    const missingFunctions = requiredFunctions.filter(func => !presentFunctions.includes(func));
    const missingEvents = requiredEvents.filter(event => !presentEvents.includes(event));
    
    const totalRequired = requiredFunctions.length + requiredEvents.length;
    const totalMissing = missingFunctions.length + missingEvents.length;
    
    return {
      compliant: totalMissing === 0,
      missing: [...missingFunctions, ...missingEvents],
      present: [
        ...requiredFunctions.filter(func => presentFunctions.includes(func)),
        ...requiredEvents.filter(event => presentEvents.includes(event))
      ]
    };
  }

  /**
   * Generate hash for ABI caching
   * @param {Object} abi - ABI object
   * @returns {string} ABI hash
   * @private
   */
  _hashABI(abi) {
    return ethers.utils.keccak256(ethers.utils.toUtf8Bytes(JSON.stringify(abi))).substring(0, 10);
  }

  /**
   * Clear validation cache
   */
  clearCache() {
    this.validationCache.clear();
    this.abiCache.clear();
    this.interfaceCache.clear();
    this.logger.info('ABIStructureValidator caches cleared');
  }

  /**
   * Get validation statistics
   * @returns {Object} Validation statistics
   */
  getValidationStats() {
    return {
      validationCacheSize: this.validationCache.size,
      abiCacheSize: this.abiCache.size,
      interfaceCacheSize: this.interfaceCache.size,
      supportedNetworks: Object.keys(this.explorerAPIs),
      standardInterfaces: Object.keys(this.standardInterfaces),
      concurrencyLimit: this.concurrency.limit
    };
  }
}

module.exports = ABIStructureValidator;
