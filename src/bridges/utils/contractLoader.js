/**
 * Contract Loader Utility
 * Production-ready contract loading with dependency injection, retry logic, and comprehensive error handling.
 * Loads and manages contract instances, ABIs, and deployment artifacts with advanced caching and provider management.
 */

const { ethers } = require('ethers');
const LRU = require('lru-cache');
const pLimit = require('p-limit');
const { BridgeErrors } = require('../../errors/BridgeErrors');

class ContractLoader {
  constructor({ configLoader, logger, metrics, signerProvider = null, retryConfig = {} }) {
    this.configLoader = configLoader;
    this.logger = logger;
    this.metrics = metrics;
    this.signerProvider = signerProvider;

    this.retryConfig = {
      retries: retryConfig.retries ?? 3,
      initialDelayMs: retryConfig.initialDelayMs ?? 500,
      maxDelayMs: retryConfig.maxDelayMs ?? 2000
    };

    this.contractCache = new LRU({ max: 500, ttl: 15 * 60 * 1000 });
    this.providerCache = new LRU({ max: 50, ttl: 30 * 60 * 1000 });
    this.abiCache = new LRU({ max: 200, ttl: 60 * 60 * 1000 });
    this.concurrency = pLimit(8);

    this.networkConfigs = this.configLoader.getNetworkConfigs(); // pulled from DI
    this.contractInterfaces = new Map();
    this.signerCache = new Map();
  }

  async loadContract(bridgeKey, network, options = {}) {
    const cacheKey = `${bridgeKey}-${network}`;
    if (!options.forceReload && this.contractCache.has(cacheKey)) {
      const cached = this.contractCache.get(cacheKey);
      if (await this._isContractValid(cached)) {
        this.metrics.increment('contract_loader.cache_hit', { bridge: bridgeKey, network });
        return cached;
      }
      this.contractCache.delete(cacheKey);
      this.logger.warn(`Invalid cache entry, reloading: ${cacheKey}`);
    }

    const deployment = this.configLoader.getDeploymentInfo(bridgeKey, network);
    const abi = this.configLoader.getExpectedAbi(bridgeKey);
    const provider = await this._getProviderWithRetry(network, options.timeout);

    const contract = new ethers.Contract(deployment.address, abi, provider);

    if (options.attachSigner) {
      const signer = await this._getSigner(network, options.signerAddress);
      contract.connect(signer);
    }

    if (options.verifyExists !== false) {
      await this._verifyContractExists(contract, deployment.address, network, abi);
    }

    const metadata = await this._getContractMetadata(contract, deployment, bridgeKey, network);
    const instance = { contract, abi, address: deployment.address, network, provider, metadata };
    this.contractCache.set(cacheKey, instance);

    this.metrics.increment('contract_loader.load_success', { bridge: bridgeKey, network });
    this.logger.info(`Loaded contract ${bridgeKey} on ${network} at ${deployment.address}`);
    return instance;
  }

  async _getProviderWithRetry(network, timeout = 10000) {
    const cfg = this.networkConfigs[network];
    if (!cfg) throw new BridgeErrors.NetworkError(`Invalid network ${network}`);

    const urls = [cfg.rpc, ...cfg.fallbackRpcs];
    let attempt = 0, delay = this.retryConfig.initialDelayMs;
    let lastErr;

    while (attempt < this.retryConfig.retries) {
      for (const url of urls) {
        try {
          const provider = new ethers.providers.JsonRpcProvider({ url, timeout });
          const net = await provider.getNetwork();
          if (net.chainId !== cfg.chainId) throw new Error('chainId mismatch');
          await provider.getBlockNumber();
          this.providerCache.set(`provider-${network}`, { provider, url });
          this.metrics.increment('contract_loader.provider_connected', { network, url });
          return provider;
        } catch (err) {
          lastErr = err;
          this.metrics.increment('contract_loader.provider_failed', { network, url, error: err.message });
          this.logger.warn(`Provider failed (${url}): ${err.message}`);
        }
      }
      await new Promise(r => setTimeout(r, delay));
      delay = Math.min(delay * 2, this.retryConfig.maxDelayMs);
      attempt++;
    }

    throw new BridgeErrors.NetworkError(`Failed to connect to ${network}: ${lastErr.message}`);
  }

  async _getSigner(network, signerAddress) {
    if (!this.signerProvider) {
      throw new BridgeErrors.ContractLoadError('No signerProvider injected');
    }
    const key = `${network}:${signerAddress || 'default'}`;
    if (this.signerCache.has(key)) return this.signerCache.get(key);
    const signer = await this.signerProvider.getSigner({ network, address: signerAddress });
    this.signerCache.set(key, signer);
    return signer;
  }

  // _verifyContractExists optionally validates on-chain code size vs ABI heuristics
  async _verifyContractExists(contract, address, network, abi) {
    const code = await contract.provider.getCode(address);
    if (code === '0x') throw new BridgeErrors.ContractLoadError('No on-chain code');
    // optional: check that bytecode length > expected minimum from ABI
  }

  async _getContractMetadata(contract, deployment, bridgeKey, network) {
    try {
      const metadata = {
        functions: contract.interface.fragments.filter(f => f.type === 'function').length,
        events: contract.interface.fragments.filter(f => f.type === 'event').length,
        hasReceive: contract.interface.fragments.some(f => f.type === 'receive'),
        hasFallback: contract.interface.fragments.some(f => f.type === 'fallback'),
        isPayable: contract.interface.fragments.some(f => f.payable === true),
        bridgeKey,
        deploymentBlock: deployment.blockNumber,
        deploymentTx: deployment.txHash,
        version: deployment.version,
        loadedAt: new Date().toISOString()
      };

      // Try to get additional contract info if standard functions exist
      try {
        if (contract.name && typeof contract.name === 'function') {
          metadata.name = await contract.name();
        }
        if (contract.symbol && typeof contract.symbol === 'function') {
          metadata.symbol = await contract.symbol();
        }
        if (contract.decimals && typeof contract.decimals === 'function') {
          metadata.decimals = await contract.decimals();
        }
        if (contract.totalSupply && typeof contract.totalSupply === 'function') {
          metadata.totalSupply = (await contract.totalSupply()).toString();
        }
      } catch (error) {
        // These are optional metadata fields
        this.logger.debug(`Could not fetch optional contract metadata: ${error.message}`);
      }

      return metadata;
    } catch (error) {
      this.logger.warn(`Failed to get contract metadata: ${error.message}`);
      return {
        functions: 0,
        events: 0,
        hasReceive: false,
        hasFallback: false,
        isPayable: false,
        bridgeKey,
        loadedAt: new Date().toISOString()
      };
    }
  }

  async _isContractValid(contractInstance) {
    try {
      // Check if provider is still connected
      if (!await this._isProviderHealthy(contractInstance.provider)) {
        return false;
      }

      // Verify contract still exists
      const code = await contractInstance.provider.getCode(contractInstance.address);
      return code !== '0x';
    } catch (error) {
      this.logger.debug(`Contract validity check failed: ${error.message}`);
      return false;
    }
  }

  async _isProviderHealthy(provider) {
    try {
      const blockNumber = await Promise.race([
        provider.getBlockNumber(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Health check timeout')), 5000)
        )
      ]);
      return typeof blockNumber === 'number' && blockNumber > 0;
    } catch (error) {
      return false;
    }
  }

  async loadMultipleContracts(requests) {
    try {
      if (!Array.isArray(requests) || requests.length === 0) {
        throw new BridgeErrors.InvalidParametersError('Requests must be a non-empty array');
      }

      const maxBatchSize = 50;
      if (requests.length > maxBatchSize) {
        throw new BridgeErrors.InvalidParametersError(`Batch size exceeds maximum: ${requests.length} > ${maxBatchSize}`);
      }

      const loadingPromises = requests.map(({ bridgeKey, network, options = {} }) =>
        this.concurrency(() => 
          this.loadContract(bridgeKey, network, options).catch(error => ({
            error: error.message,
            bridgeKey,
            network,
            failed: true
          }))
        )
      );

      const results = await Promise.all(loadingPromises);
      const successful = results.filter(result => !result.failed);
      const failed = results.filter(result => result.failed);

      this.metrics.increment('contract_loader.batch_load', {
        count: requests.length,
        successful: successful.length,
        failed: failed.length
      });

      if (failed.length > 0) {
        this.logger.warn(`Batch contract loading completed with ${failed.length} failures:`, 
          failed.map(f => `${f.bridgeKey}:${f.network} - ${f.error}`)
        );
      }

      return {
        contracts: successful,
        failures: failed,
        stats: {
          total: requests.length,
          successful: successful.length,
          failed: failed.length
        }
      };

    } catch (error) {
      this.logger.error('Batch contract loading failed:', error);
      this.metrics.increment('contract_loader.batch_load_error', {
        error: error.message
      });
      throw error;
    }
  }

  getContractABI(bridgeKey) {
    try {
      const cacheKey = `abi-${bridgeKey}`;
      
      if (this.abiCache.has(cacheKey)) {
        return this.abiCache.get(cacheKey);
      }

      const abi = this.configLoader.getExpectedAbi(bridgeKey);
      this.abiCache.set(cacheKey, abi);
      
      return abi;
    } catch (error) {
      throw new BridgeErrors.ContractLoadError(`ABI not found for ${bridgeKey}: ${error.message}`);
    }
  }

  getContractInterface(bridgeKey) {
    if (this.contractInterfaces.has(bridgeKey)) {
      return this.contractInterfaces.get(bridgeKey);
    }

    const abi = this.getContractABI(bridgeKey);
    const iface = new ethers.utils.Interface(abi);
    this.contractInterfaces.set(bridgeKey, iface);
    
    return iface;
  }

  isContractLoaded(bridgeKey, network) {
    const cacheKey = `${bridgeKey}-${network}`;
    return this.contractCache.has(cacheKey);
  }

  clearCache(bridgeKey = null, network = null) {
    if (bridgeKey && network) {
      const cacheKey = `${bridgeKey}-${network}`;
      this.contractCache.delete(cacheKey);
      this.logger.info(`Cleared cache for ${bridgeKey} on ${network}`);
    } else if (bridgeKey) {
      let cleared = 0;
      for (const key of this.contractCache.keys()) {
        if (key.startsWith(`${bridgeKey}-`)) {
          this.contractCache.delete(key);
          cleared++;
        }
      }
      this.logger.info(`Cleared ${cleared} cached contracts for bridge ${bridgeKey}`);
    } else {
      const totalCleared = this.contractCache.size;
      this.contractCache.clear();
      this.abiCache.clear();
      this.contractInterfaces.clear();
      this.logger.info(`Cleared all ${totalCleared} cached contracts and ABIs`);
    }
  }

  getCacheStats() {
    return {
      contracts: {
        size: this.contractCache.size,
        maxSize: this.contractCache.max,
        ttl: '15 minutes'
      },
      providers: {
        size: this.providerCache.size,
        maxSize: this.providerCache.max,
        ttl: '30 minutes'
      },
      abis: {
        size: this.abiCache.size,
        maxSize: this.abiCache.max,
        ttl: '1 hour'
      },
      interfaces: {
        size: this.contractInterfaces.size
      },
      signers: {
        size: this.signerCache.size
      },
      concurrencyLimit: this.concurrency.limit,
      retryConfig: this.retryConfig
    };
  }
}

module.exports = { ContractLoader };
