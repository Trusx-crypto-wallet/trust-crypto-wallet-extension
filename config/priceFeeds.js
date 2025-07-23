/**
 * Price Feeds Configuration
 * 
 * Auto-configures Chainlink price feeds and DEX fallbacks for tokens from trust crypto wallet extension.
 * Provides lazy loading and validation for optimal performance in private deployments.
 * 
 * @fileoverview Price feed configuration system for trust crypto wallet extension
 * @version 1.0.0
 * @author trust crypto wallet team
 */

import { TokenConfig } from './tokenconfig.js';
import { logger } from '../src/utils/logger.js';

/**
 * Chainlink price feed contract addresses by network (verified addresses)
 * These are the official Chainlink aggregator contracts
 */
const CHAINLINK_FEED_ADDRESSES = {
  // Ethereum Mainnet (Chain ID: 1)
  1: {
    'ETH/USD': '0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419',    // Verified ETH/USD feed
    'BTC/USD': '0xF4030086522a5bEEa4988F8cA5B36dbC97BeE88c',    // Verified BTC/USD feed
    'USDT/USD': '0x3E7d1eAB13ad0104d2750B8863b489D65364e32D',   // USDT/USD feed
    'USDC/USD': '0x8fFfFfd4AfB6115b954Bd326cbe7B4BA576818f6',   // USDC/USD feed
    'DAI/USD': '0xAed0c38402a5d19df6E4c03F4E2DceD6e29c1ee9',    // DAI/USD feed
    'WBTC/USD': '0xF4030086522a5bEEa4988F8cA5B36dbC97BeE88c',   // Uses BTC/USD feed
    'WETH/USD': '0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419',   // Uses ETH/USD feed
    'UNI/USD': '0x553303d460EE0afB37EdFf9bE42922D8FF63220e',    // UNI/USD feed
    'AAVE/USD': '0x547a514d5e3769680Ce22B2361c10Ea13619e8a9',   // AAVE/USD feed
    'MATIC/USD': '0x7bAC85A8a13A4BcD8abb3eB7d6b4d632c5a57676',  // MATIC/USD feed
    'LINK/USD': '0x2c1d072e956AFFC0D435Cb7AC38EF18d24d9127c'    // LINK/USD feed
  },
  // Polygon (Chain ID: 137)
  137: {
    'MATIC/USD': '0xAB594600376Ec9fD91F8e885dADF0CE036862dE0',
    'ETH/USD': '0xF9680D99D6C9589e2a93a78A04A279e509205945',
    'BTC/USD': '0xc907E116054Ad103354f2D350FD2514433D57F6f',
    'USDT/USD': '0x0A6513e40db6EB1b165753AD52E80663aeA50545',
    'USDC/USD': '0xfE4A8cc5b5B2366C1B58Bea3858e81843581b2F7',
    'DAI/USD': '0x4746DeC9e833A82EC7C2C1356372CcF2cfcD2F3D'
  },
  // BSC (Chain ID: 56)
  56: {
    'BNB/USD': '0x0567F2323251f0Aab15c8dFb1967E4e8A7D42aeE',
    'ETH/USD': '0x9ef1B8c0E4F7dc8bF5719Ea496883DC6401d5b2e',
    'BTC/USD': '0x264990fbd0A4796A3E3d8E37C4d5F87a3aCa5Ebf',
    'USDT/USD': '0xB97Ad0E74fa7d920791E90258A6E2085088b4320',
    'USDC/USD': '0x51597f405303C4377E36123cBc172b13269EA163',
    'WBNB/USD': '0x0567F2323251f0Aab15c8dFb1967E4e8A7D42aeE'   // Uses BNB/USD feed
  },
  // Arbitrum (Chain ID: 42161)
  42161: {
    'ETH/USD': '0x639Fe6ab55C921f74e7fac1ee960C0B6293ba612',
    'BTC/USD': '0x6ce185860a4963106506C203335A2910413708e9',
    'USDT/USD': '0x3f3f5dF88dC9F13eac63DF89EC16ef6e7E25DdE7',
    'USDC/USD': '0x50834F3163758fcC1Df9973b6e91f0F0F0434aD3',
    'ARB/USD': '0xb2A824043730FE05F3DA2efaFa1CBbe83fa548D6'
  },
  // Optimism (Chain ID: 10)
  10: {
    'ETH/USD': '0x13e3Ee699D1909E989722E753853AE30b17e08c5',
    'BTC/USD': '0xD702DD976Fb76Fffc2D3963D037dfDae5b04E593',
    'USDT/USD': '0xECef79E109e997bCA29c1c0897ec9d7b03647F5E',
    'USDC/USD': '0x16a9FA2FDa030272Ce99B29CF780dFA30361E0f3',
    'OP/USD': '0x0D276FC14719f9292D5C1eA2198673d1f4269246'
  },
  // Avalanche (Chain ID: 43114)
  43114: {
    'AVAX/USD': '0x0A77230d17318075983913bC2145DB16C7366156',
    'ETH/USD': '0x976B3D034E162d8bD72D6b9C989d545b839003b0',
    'BTC/USD': '0x2779D32d5166BAaa2B2b658333bA7e6Ec0C65743',
    'USDT/USD': '0xEBE676ee90Fe1112671f19b6B7459bC678B67e8a',
    'USDC/USD': '0xF096872672F44d6EBA71458D74fe67F9a77a23B9',
    'WAVAX/USD': '0x0A77230d17318075983913bC2145DB16C7366156'  // Uses AVAX/USD feed
  }
};

/**
 * DEX fallback configuration for tokens without Chainlink feeds
 * Uses popular DEX routers for price discovery
 */
const DEX_FALLBACK_CONFIG = {
  1: { // Ethereum
    router: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D', // Uniswap V2
    factory: '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f',
    weth: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    quoteCurrency: 'USDC',
    quoteCurrencyAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'
  },
  137: { // Polygon
    router: '0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff', // QuickSwap
    factory: '0x5757371414417b8C6CAad45bAeF941aBc7d3Ab32',
    weth: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270', // WMATIC
    quoteCurrency: 'USDC',
    quoteCurrencyAddress: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174'
  },
  56: { // BSC
    router: '0x10ED43C718714eb63d5aA57B78B54704E256024E', // PancakeSwap
    factory: '0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73',
    weth: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c', // WBNB
    quoteCurrency: 'USDT',
    quoteCurrencyAddress: '0x55d398326f99059fF775485246999027B3197955'
  },
  42161: { // Arbitrum
    router: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506', // SushiSwap
    factory: '0xc35DADB65012eC5796536bD9864eD8773aBc74C4',
    weth: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
    quoteCurrency: 'USDC',
    quoteCurrencyAddress: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8'
  },
  10: { // Optimism
    router: '0x9c12939390052919aF3155f41Bf4160Fd3666A6f', // Velodrome
    factory: '0x25CbdDb98b35ab1FF77413456B31EC81A6B6B746',
    weth: '0x4200000000000000000000000000000000000006',
    quoteCurrency: 'USDC',
    quoteCurrencyAddress: '0x7F5c764cBc14f9669B88837ca1490cCa17c31607'
  },
  43114: { // Avalanche
    router: '0x60aE616a2155Ee3d9A68541Ba4544862310933d4', // Trader Joe
    factory: '0x9Ad6C38BE94206cA50bb0d90783181662f0Cfa10',
    weth: '0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7', // WAVAX
    quoteCurrency: 'USDC',
    quoteCurrencyAddress: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E'
  }
};

/**
 * Price feed validation configuration
 */
const VALIDATION_CONFIG = {
  maxAge: 3600, // 1 hour in seconds
  minPrice: 0.000001,
  maxPrice: 1000000000,
  maxPriceDeviation: 0.5, // 50% from last known price
  heartbeat: 300, // 5 minutes for most feeds
  stalePriceThreshold: 86400 // 24 hours
};

/**
 * Token symbol mapping for Chainlink feeds
 * Maps wrapped tokens to their underlying asset feeds
 */
const SYMBOL_MAPPING = {
  'WETH': 'ETH',
  'WBTC': 'BTC',
  'WMATIC': 'MATIC',
  'WAVAX': 'AVAX',
  'WBNB': 'BNB'
};

/**
 * Price Feed Class
 * Manages individual price feed configuration and validation
 */
class PriceFeed {
  /**
   * Creates a new PriceFeed instance
   * @param {Object} token - Token object from trust crypto wallet token list
   * @param {number} chainId - Network chain ID
   * @param {Object} config - Feed configuration
   */
  constructor(token, chainId, config) {
    this.token = token;
    this.symbol = token.symbol;
    this.chainId = chainId;
    this.config = config;
    this.isValid = false;
    this.lastValidation = null;
    this.cachedPrice = null;
    this.lastUpdate = null;
  }

  /**
   * Validates the price feed configuration
   * @returns {boolean} True if feed is valid
   */
  validate() {
    try {
      // Check if Chainlink feed exists
      if (this.config.chainlinkAddress) {
        this.isValid = this._validateChainlinkFeed();
      } else if (this.config.dexFallback) {
        this.isValid = this._validateDexFallback();
      } else {
        this.isValid = false;
      }

      this.lastValidation = Date.now();
      return this.isValid;
    } catch (error) {
      logger.error(`Price feed validation failed for ${this.symbol}:`, error);
      this.isValid = false;
      return false;
    }
  }

  /**
   * Validates Chainlink price feed
   * @private
   * @returns {boolean} True if valid
   */
  _validateChainlinkFeed() {
    const address = this.config.chainlinkAddress;
    
    // Basic address validation
    if (!address || typeof address !== 'string' || address.length !== 42) {
      return false;
    }

    // Check if address starts with 0x
    if (!address.startsWith('0x')) {
      return false;
    }

    // Validate against known Chainlink feeds
    const chainFeeds = CHAINLINK_FEED_ADDRESSES[this.chainId];
    if (chainFeeds && Object.values(chainFeeds).includes(address)) {
      return true;
    }

    // Accept other valid addresses (for custom feeds)
    return true;
  }

  /**
   * Validates DEX fallback configuration
   * @private
   * @returns {boolean} True if valid
   */
  _validateDexFallback() {
    const dexConfig = DEX_FALLBACK_CONFIG[this.chainId];
    if (!dexConfig) {
      return false;
    }

    // Check if token has valid address
    if (!this.token.address || this.token.address === '0x0000000000000000000000000000000000000000') {
      return false;
    }

    return true;
  }

  /**
   * Gets the feed configuration object
   * @returns {Object} Feed configuration
   */
  getConfig() {
    return {
      token: this.token,
      symbol: this.symbol,
      chainId: this.chainId,
      isValid: this.isValid,
      lastValidation: this.lastValidation,
      feedType: this.config.type,
      ...this.config
    };
  }
}

/**
 * Price Feed Manager
 * Manages all price feeds and provides lazy loading functionality
 */
class PriceFeedManager {
  constructor() {
    this.feeds = new Map();
    this.tokenConfig = null;
    this.initialized = false;
  }

  /**
   * Initializes the price feed manager
   * @returns {Promise<void>}
   */
  async initialize() {
    try {
      this.tokenConfig = new TokenConfig();
      await this.tokenConfig.initialize();
      this.initialized = true;
      logger.info('PriceFeedManager initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize PriceFeedManager:', error);
      throw error;
    }
  }

  /**
   * Gets a price feed by symbol with lazy loading
   * @param {string} symbol - Token symbol
   * @param {number} [chainId] - Network chain ID (defaults to current network)
   * @returns {Promise<PriceFeed|null>} Price feed instance or null
   */
  async getPriceFeed(symbol, chainId = 1) {
    try {
      const feedKey = `${symbol}_${chainId}`;
      
      // Return cached feed if available
      if (this.feeds.has(feedKey)) {
        return this.feeds.get(feedKey);
      }

      // Ensure manager is initialized
      if (!this.initialized) {
        await this.initialize();
      }

      // Create new feed
      const feed = await this._createPriceFeed(symbol, chainId);
      
      if (feed && feed.validate()) {
        this.feeds.set(feedKey, feed);
        return feed;
      }

      return null;
    } catch (error) {
      logger.error(`Failed to get price feed for ${symbol}:`, error);
      return null;
    }
  }

  /**
   * Creates a new price feed configuration
   * @private
   * @param {string} symbol - Token symbol
   * @param {number} chainId - Network chain ID
   * @returns {Promise<PriceFeed|null>} Price feed instance
   */
  async _createPriceFeed(symbol, chainId) {
    try {
      // Get token information from trust crypto wallet token list
      const token = await this.tokenConfig.getTokenBySymbolAndChain(symbol, chainId);
      if (!token) {
        logger.warn(`Token not found: ${symbol} on chain ${chainId}`);
        return null;
      }

      // Check for Chainlink feed first
      const chainlinkAddress = this._getChainlinkAddress(symbol, chainId);
      
      if (chainlinkAddress) {
        return new PriceFeed(token, chainId, {
          type: 'chainlink',
          chainlinkAddress,
          decimals: 8, // Chainlink feeds typically use 8 decimals
          heartbeat: VALIDATION_CONFIG.heartbeat,
          stalePriceThreshold: VALIDATION_CONFIG.stalePriceThreshold
        });
      }

      // Fallback to DEX pricing
      const dexConfig = this._getDexConfig(token, chainId);
      if (dexConfig) {
        return new PriceFeed(token, chainId, {
          type: 'dex',
          dexFallback: dexConfig,
          decimals: token.decimals || 18
        });
      }

      logger.warn(`No price feed configuration available for ${symbol} on chain ${chainId}`);
      return null;
    } catch (error) {
      logger.error(`Failed to create price feed for ${symbol}:`, error);
      return null;
    }
  }

  /**
   * Gets Chainlink feed address for a symbol
   * @private
   * @param {string} symbol - Token symbol
   * @param {number} chainId - Network chain ID
   * @returns {string|null} Chainlink feed address
   */
  _getChainlinkAddress(symbol, chainId) {
    const chainFeeds = CHAINLINK_FEED_ADDRESSES[chainId];
    if (!chainFeeds) return null;

    // Check if we need to map wrapped token symbols
    const mappedSymbol = SYMBOL_MAPPING[symbol] || symbol;
    
    // Try exact match first
    const usdPair = `${mappedSymbol}/USD`;
    if (chainFeeds[usdPair]) {
      return chainFeeds[usdPair];
    }

    // Try direct symbol lookup
    if (chainFeeds[`${symbol}/USD`]) {
      return chainFeeds[`${symbol}/USD`];
    }

    return null;
  }

  /**
   * Gets DEX configuration for a token
   * @private
   * @param {Object} token - Token information from trust crypto wallet
   * @param {number} chainId - Network chain ID
   * @returns {Object|null} DEX configuration
   */
  _getDexConfig(token, chainId) {
    const dexConfig = DEX_FALLBACK_CONFIG[chainId];
    if (!dexConfig) return null;

    // Skip native tokens (address is 0x0000...)
    if (!token.address || token.address === '0x0000000000000000000000000000000000000000') {
      return null;
    }

    return {
      tokenAddress: token.address,
      router: dexConfig.router,
      factory: dexConfig.factory,
      weth: dexConfig.weth,
      quoteCurrency: dexConfig.quoteCurrency,
      quoteCurrencyAddress: dexConfig.quoteCurrencyAddress,
      // Create trading path: token -> WETH -> quote currency (USDC/USDT)
      path: [token.address, dexConfig.weth, dexConfig.quoteCurrencyAddress]
    };
  }

  /**
   * Gets all available price feeds for a chain
   * @param {number} chainId - Network chain ID
   * @returns {Promise<Map<string, PriceFeed>>} Map of symbol to PriceFeed
   */
  async getAllPriceFeeds(chainId = 1) {
    try {
      if (!this.initialized) {
        await this.initialize();
      }

      const tokens = await this.tokenConfig.getTokensByChain(chainId);
      const feeds = new Map();

      for (const token of tokens) {
        const feed = await this.getPriceFeed(token.symbol, chainId);
        if (feed) {
          feeds.set(token.symbol, feed);
        }
      }

      return feeds;
    } catch (error) {
      logger.error('Failed to get all price feeds:', error);
      return new Map();
    }
  }

  /**
   * Gets all supported chains with price feeds
   * @returns {Array<number>} Array of supported chain IDs
   */
  getSupportedChains() {
    return Object.keys(CHAINLINK_FEED_ADDRESSES).map(Number);
  }

  /**
   * Clears cached feeds
   */
  clearCache() {
    this.feeds.clear();
    logger.info('Price feed cache cleared');
  }

  /**
   * Gets validation configuration
   * @returns {Object} Validation configuration
   */
  getValidationConfig() {
    return { ...VALIDATION_CONFIG };
  }
}

// Create global instance
const priceFeedManager = new PriceFeedManager();

/**
 * Gets a price feed by symbol (lazy loaded)
 * @param {string} symbol - Token symbol
 * @param {number} [chainId=1] - Network chain ID
 * @returns {Promise<PriceFeed|null>} Price feed instance
 */
export const getPriceFeed = async (symbol, chainId = 1) => {
  return await priceFeedManager.getPriceFeed(symbol, chainId);
};

/**
 * Gets all price feeds for a chain
 * @param {number} [chainId=1] - Network chain ID
 * @returns {Promise<Map<string, PriceFeed>>} Map of price feeds
 */
export const getAllPriceFeeds = async (chainId = 1) => {
  return await priceFeedManager.getAllPriceFeeds(chainId);
};

/**
 * Initializes the price feed system
 * @returns {Promise<void>}
 */
export const initializePriceFeeds = async () => {
  return await priceFeedManager.initialize();
};

/**
 * Clears the price feed cache
 */
export const clearPriceFeedCache = () => {
  priceFeedManager.clearCache();
};

/**
 * Gets supported chains for price feeds
 * @returns {Array<number>} Array of supported chain IDs
 */
export const getSupportedChains = () => {
  return priceFeedManager.getSupportedChains();
};

/**
 * Pre-loaded price feeds configuration
 * Contains the most commonly used feeds for immediate access
 */
export const priceFeeds = {
  // Ethereum Mainnet feeds (Chain ID: 1)
  ethereum: {
    chainId: 1,
    name: 'Ethereum Mainnet',
    feeds: Object.entries(CHAINLINK_FEED_ADDRESSES[1] || {}).reduce((acc, [symbol, address]) => {
      const cleanSymbol = symbol.replace('/USD', '');
      acc[cleanSymbol] = {
        symbol,
        pair: symbol,
        chainlinkAddress: address,
        type: 'chainlink',
        decimals: 8,
        heartbeat: VALIDATION_CONFIG.heartbeat
      };
      return acc;
    }, {})
  },
  
  // Polygon feeds (Chain ID: 137)
  polygon: {
    chainId: 137,
    name: 'Polygon',
    feeds: Object.entries(CHAINLINK_FEED_ADDRESSES[137] || {}).reduce((acc, [symbol, address]) => {
      const cleanSymbol = symbol.replace('/USD', '');
      acc[cleanSymbol] = {
        symbol,
        pair: symbol,
        chainlinkAddress: address,
        type: 'chainlink',
        decimals: 8,
        heartbeat: VALIDATION_CONFIG.heartbeat
      };
      return acc;
    }, {})
  },
  
  // BSC feeds (Chain ID: 56)
  bsc: {
    chainId: 56,
    name: 'BNB Smart Chain',
    feeds: Object.entries(CHAINLINK_FEED_ADDRESSES[56] || {}).reduce((acc, [symbol, address]) => {
      const cleanSymbol = symbol.replace('/USD', '');
      acc[cleanSymbol] = {
        symbol,
        pair: symbol,
        chainlinkAddress: address,
        type: 'chainlink',
        decimals: 8,
        heartbeat: VALIDATION_CONFIG.heartbeat
      };
      return acc;
    }, {})
  },
  
  // Arbitrum feeds (Chain ID: 42161)
  arbitrum: {
    chainId: 42161,
    name: 'Arbitrum One',
    feeds: Object.entries(CHAINLINK_FEED_ADDRESSES[42161] || {}).reduce((acc, [symbol, address]) => {
      const cleanSymbol = symbol.replace('/USD', '');
      acc[cleanSymbol] = {
        symbol,
        pair: symbol,
        chainlinkAddress: address,
        type: 'chainlink',
        decimals: 8,
        heartbeat: VALIDATION_CONFIG.heartbeat
      };
      return acc;
    }, {})
  },
  
  // Optimism feeds (Chain ID: 10)
  optimism: {
    chainId: 10,
    name: 'Optimism',
    feeds: Object.entries(CHAINLINK_FEED_ADDRESSES[10] || {}).reduce((acc, [symbol, address]) => {
      const cleanSymbol = symbol.replace('/USD', '');
      acc[cleanSymbol] = {
        symbol,
        pair: symbol,
        chainlinkAddress: address,
        type: 'chainlink',
        decimals: 8,
        heartbeat: VALIDATION_CONFIG.heartbeat
      };
      return acc;
    }, {})
  },
  
  // Avalanche feeds (Chain ID: 43114)
  avalanche: {
    chainId: 43114,
    name: 'Avalanche',
    feeds: Object.entries(CHAINLINK_FEED_ADDRESSES[43114] || {}).reduce((acc, [symbol, address]) => {
      const cleanSymbol = symbol.replace('/USD', '');
      acc[cleanSymbol] = {
        symbol,
        pair: symbol,
        chainlinkAddress: address,
        type: 'chainlink',
        decimals: 8,
        heartbeat: VALIDATION_CONFIG.heartbeat
      };
      return acc;
    }, {})
  }
};

/**
 * Validation configuration for price feeds
 */
export const validationConfig = VALIDATION_CONFIG;

/**
 * DEX fallback configuration
 */
export const dexFallbackConfig = DEX_FALLBACK_CONFIG;

/**
 * Chainlink feed addresses by chain
 */
export const chainlinkFeeds = CHAINLINK_FEED_ADDRESSES;

/**
 * Symbol mapping for wrapped tokens
 */
export const symbolMapping = SYMBOL_MAPPING;

export default {
  priceFeeds,
  getPriceFeed,
  getAllPriceFeeds,
  initializePriceFeeds,
  clearPriceFeedCache,
  getSupportedChains,
  validationConfig,
  dexFallbackConfig,
  chainlinkFeeds,
  symbolMapping,
  PriceFeed,
  PriceFeedManager
};
