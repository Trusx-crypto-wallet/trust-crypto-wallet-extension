// config/priceFeeds.js
// Enhanced Production Chainlink Price Feed Configuration
// Chainlink price-feed proxy contracts organized by chain with enhanced metadata and validation
// Integrates with Trust Crypto Wallet structure and LayerZero cross-chain deployments

const { CHAIN_IDS } = require('./token.config');
const { CHAINS } = require('./chains.config');

// Price feed types and metadata
const FEED_TYPES = Object.freeze({
  CHAINLINK: 'chainlink',
  DERIVED: 'derived',
  COMPOSITE: 'composite'
});

// Feed update frequencies (in seconds)
const UPDATE_FREQUENCIES = Object.freeze({
  ULTRA_FAST: 1,      // 1 second
  FAST: 60,           // 1 minute
  STANDARD: 300,      // 5 minutes
  SLOW: 3600,         // 1 hour
  STABLE: 86400       // 24 hours
});

// Enhanced price feed configuration with metadata
const PRICE_FEED_METADATA = Object.freeze({
  ETH: {
    symbol: 'ETH',
    name: 'Ethereum',
    decimals: 8,
    updateFrequency: UPDATE_FREQUENCIES.FAST,
    feedType: FEED_TYPES.CHAINLINK,
    category: 'crypto',
    isStable: false
  },
  WETH: {
    symbol: 'WETH',
    name: 'Wrapped Ethereum',
    decimals: 8,
    updateFrequency: UPDATE_FREQUENCIES.FAST,
    feedType: FEED_TYPES.DERIVED,
    category: 'crypto',
    isStable: false,
    baseFeed: 'ETH'
  },
  BTC: {
    symbol: 'BTC',
    name: 'Bitcoin',
    decimals: 8,
    updateFrequency: UPDATE_FREQUENCIES.FAST,
    feedType: FEED_TYPES.CHAINLINK,
    category: 'crypto',
    isStable: false
  },
  WBTC: {
    symbol: 'WBTC',
    name: 'Wrapped Bitcoin',
    decimals: 8,
    updateFrequency: UPDATE_FREQUENCIES.FAST,
    feedType: FEED_TYPES.DERIVED,
    category: 'crypto',
    isStable: false,
    baseFeed: 'BTC'
  },
  USDC: {
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 8,
    updateFrequency: UPDATE_FREQUENCIES.STANDARD,
    feedType: FEED_TYPES.CHAINLINK,
    category: 'stablecoin',
    isStable: true
  },
  USDT: {
    symbol: 'USDT',
    name: 'Tether USD',
    decimals: 8,
    updateFrequency: UPDATE_FREQUENCIES.STANDARD,
    feedType: FEED_TYPES.CHAINLINK,
    category: 'stablecoin',
    isStable: true
  },
  DAI: {
    symbol: 'DAI',
    name: 'Dai Stablecoin',
    decimals: 8,
    updateFrequency: UPDATE_FREQUENCIES.STANDARD,
    feedType: FEED_TYPES.CHAINLINK,
    category: 'stablecoin',
    isStable: true
  }
});

// Enhanced price feeds configuration with validation and metadata
const PRICE_FEEDS = Object.freeze({
  // ── Ethereum Mainnet ───────────────────────────────────────
  [CHAIN_IDS[CHAINS.ETHEREUM]]: Object.freeze({
    ETH: {
      address: '0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419',
      pair: 'ETH/USD',
      ...PRICE_FEED_METADATA.ETH,
      chainId: CHAIN_IDS[CHAINS.ETHEREUM],
      verified: true,
      lastUpdate: null,
      heartbeat: 3600 // 1 hour
    },
    WETH: {
      address: '0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419',
      pair: 'ETH/USD',
      ...PRICE_FEED_METADATA.WETH,
      chainId: CHAIN_IDS[CHAINS.ETHEREUM],
      verified: true,
      lastUpdate: null,
      heartbeat: 3600
    },
    BTC: {
      address: '0xF4030086522a5bEEa4988F8cA5B36dbC97BeE88c',
      pair: 'BTC/USD',
      ...PRICE_FEED_METADATA.BTC,
      chainId: CHAIN_IDS[CHAINS.ETHEREUM],
      verified: true,
      lastUpdate: null,
      heartbeat: 3600
    },
    WBTC: {
      address: '0xF4030086522a5bEEa4988F8cA5B36dbC97BeE88c',
      pair: 'BTC/USD',
      ...PRICE_FEED_METADATA.WBTC,
      chainId: CHAIN_IDS[CHAINS.ETHEREUM],
      verified: true,
      lastUpdate: null,
      heartbeat: 3600
    },
    USDC: {
      address: '0x8fFfFfd4AfB6115b954Bd326cbe7B4BA576818f6',
      pair: 'USDC/USD',
      ...PRICE_FEED_METADATA.USDC,
      chainId: CHAIN_IDS[CHAINS.ETHEREUM],
      verified: true,
      lastUpdate: null,
      heartbeat: 86400 // 24 hours for stablecoins
    },
    USDT: {
      address: '0x3E7d1eAB13ad0104d2750B8863b489D65364e32D',
      pair: 'USDT/USD',
      ...PRICE_FEED_METADATA.USDT,
      chainId: CHAIN_IDS[CHAINS.ETHEREUM],
      verified: true,
      lastUpdate: null,
      heartbeat: 86400
    },
    DAI: {
      address: '0xAed0c38402a5d19df6E4c03F4E2DceD6e29c1ee9',
      pair: 'DAI/USD',
      ...PRICE_FEED_METADATA.DAI,
      chainId: CHAIN_IDS[CHAINS.ETHEREUM],
      verified: true,
      lastUpdate: null,
      heartbeat: 3600
    },
    UNI: {
      address: '0x553303d460EE0afB37EdFf9bE42922D8FF63220e',
      pair: 'UNI/USD',
      symbol: 'UNI',
      name: 'Uniswap',
      decimals: 8,
      updateFrequency: UPDATE_FREQUENCIES.STANDARD,
      feedType: FEED_TYPES.CHAINLINK,
      category: 'defi',
      isStable: false,
      chainId: CHAIN_IDS[CHAINS.ETHEREUM],
      verified: true,
      lastUpdate: null,
      heartbeat: 3600
    },
    AAVE: {
      address: '0x547a514d5e3769680Ce22B2361c10Ea13619e8a9',
      pair: 'AAVE/USD',
      symbol: 'AAVE',
      name: 'Aave',
      decimals: 8,
      updateFrequency: UPDATE_FREQUENCIES.STANDARD,
      feedType: FEED_TYPES.CHAINLINK,
      category: 'defi',
      isStable: false,
      chainId: CHAIN_IDS[CHAINS.ETHEREUM],
      verified: true,
      lastUpdate: null,
      heartbeat: 3600
    },
    LINK: {
      address: '0x2c1d072e956AFFC0D435Cb7AC38EF18d24d9127c',
      pair: 'LINK/USD',
      symbol: 'LINK',
      name: 'Chainlink',
      decimals: 8,
      updateFrequency: UPDATE_FREQUENCIES.STANDARD,
      feedType: FEED_TYPES.CHAINLINK,
      category: 'defi',
      isStable: false,
      chainId: CHAIN_IDS[CHAINS.ETHEREUM],
      verified: true,
      lastUpdate: null,
      heartbeat: 3600
    },
    // Cross-Chain USDT feed (same as USDT for pricing)
    'CROSS-USDT': {
      address: '0x3E7d1eAB13ad0104d2750B8863b489D65364e32D',
      pair: 'USDT/USD',
      symbol: 'CROSS-USDT',
      name: 'Cross-Chain USDT',
      decimals: 8,
      updateFrequency: UPDATE_FREQUENCIES.STANDARD,
      feedType: FEED_TYPES.DERIVED,
      category: 'crosschain',
      isStable: true,
      baseFeed: 'USDT',
      chainId: CHAIN_IDS[CHAINS.ETHEREUM],
      verified: true,
      lastUpdate: null,
      heartbeat: 86400,
      isLayerZeroOFT: true
    }
  }),

  // ── Polygon Mainnet ────────────────────────────────────────
  [CHAIN_IDS[CHAINS.POLYGON]]: Object.freeze({
    MATIC: {
      address: '0xAB594600376Ec9fD91F8e885dADF0CE036862dE0',
      pair: 'MATIC/USD',
      symbol: 'MATIC',
      name: 'Polygon',
      decimals: 8,
      updateFrequency: UPDATE_FREQUENCIES.STANDARD,
      feedType: FEED_TYPES.CHAINLINK,
      category: 'native',
      isStable: false,
      chainId: CHAIN_IDS[CHAINS.POLYGON],
      verified: true,
      lastUpdate: null,
      heartbeat: 3600
    },
    ETH: {
      address: '0xF9680D99D6C9589e2a93a78A04A279e509205945',
      pair: 'ETH/USD',
      ...PRICE_FEED_METADATA.ETH,
      chainId: CHAIN_IDS[CHAINS.POLYGON],
      verified: true,
      lastUpdate: null,
      heartbeat: 3600
    },
    WETH: {
      address: '0xF9680D99D6C9589e2a93a78A04A279e509205945',
      pair: 'ETH/USD',
      ...PRICE_FEED_METADATA.WETH,
      chainId: CHAIN_IDS[CHAINS.POLYGON],
      verified: true,
      lastUpdate: null,
      heartbeat: 3600
    },
    USDC: {
      address: '0xfE4A8cc5b5B2366C1B58Bea3858e81843581b2F7',
      pair: 'USDC/USD',
      ...PRICE_FEED_METADATA.USDC,
      chainId: CHAIN_IDS[CHAINS.POLYGON],
      verified: true,
      lastUpdate: null,
      heartbeat: 86400
    },
    USDT: {
      address: '0x0A6513e40db6EB1b165753AD52E80663aea50545',
      pair: 'USDT/USD',
      ...PRICE_FEED_METADATA.USDT,
      chainId: CHAIN_IDS[CHAINS.POLYGON],
      verified: true,
      lastUpdate: null,
      heartbeat: 86400
    },
    DAI: {
      address: '0x4746DeC9e833A82EC7C2C1356372CcF2cfcD2F3D',
      pair: 'DAI/USD',
      ...PRICE_FEED_METADATA.DAI,
      chainId: CHAIN_IDS[CHAINS.POLYGON],
      verified: true,
      lastUpdate: null,
      heartbeat: 3600
    },
    WBTC: {
      address: '0xDE31F8bFBD8c84b5360CFacCa3539B938dd78ae6',
      pair: 'BTC/USD',
      ...PRICE_FEED_METADATA.WBTC,
      chainId: CHAIN_IDS[CHAINS.POLYGON],
      verified: true,
      lastUpdate: null,
      heartbeat: 3600
    },
    AAVE: {
      address: '0x72484B12719E23115761D5DA1646945632979bB6',
      pair: 'AAVE/USD',
      symbol: 'AAVE',
      name: 'Aave',
      decimals: 8,
      updateFrequency: UPDATE_FREQUENCIES.STANDARD,
      feedType: FEED_TYPES.CHAINLINK,
      category: 'defi',
      isStable: false,
      chainId: CHAIN_IDS[CHAINS.POLYGON],
      verified: true,
      lastUpdate: null,
      heartbeat: 3600
    },
    'CROSS-USDT': {
      address: '0x0A6513e40db6EB1b165753AD52E80663aea50545',
      pair: 'USDT/USD',
      symbol: 'CROSS-USDT',
      name: 'Cross-Chain USDT',
      decimals: 8,
      updateFrequency: UPDATE_FREQUENCIES.STANDARD,
      feedType: FEED_TYPES.DERIVED,
      category: 'crosschain',
      isStable: true,
      baseFeed: 'USDT',
      chainId: CHAIN_IDS[CHAINS.POLYGON],
      verified: true,
      lastUpdate: null,
      heartbeat: 86400,
      isLayerZeroOFT: true
    }
  }),

  // ── BSC Mainnet ────────────────────────────────────────────
  [CHAIN_IDS[CHAINS.BSC]]: Object.freeze({
    BNB: {
      address: '0x0567F2323251f0Aab15c8dFb1967E4e8A7D42aeE',
      pair: 'BNB/USD',
      symbol: 'BNB',
      name: 'Binance Coin',
      decimals: 8,
      updateFrequency: UPDATE_FREQUENCIES.FAST,
      feedType: FEED_TYPES.CHAINLINK,
      category: 'native',
      isStable: false,
      chainId: CHAIN_IDS[CHAINS.BSC],
      verified: true,
      lastUpdate: null,
      heartbeat: 3600
    },
    WBNB: {
      address: '0x0567F2323251f0Aab15c8dFb1967E4e8A7D42aeE',
      pair: 'BNB/USD',
      symbol: 'WBNB',
      name: 'Wrapped BNB',
      decimals: 8,
      updateFrequency: UPDATE_FREQUENCIES.FAST,
      feedType: FEED_TYPES.DERIVED,
      category: 'wrapped',
      isStable: false,
      baseFeed: 'BNB',
      chainId: CHAIN_IDS[CHAINS.BSC],
      verified: true,
      lastUpdate: null,
      heartbeat: 3600
    },
    ETH: {
      address: '0x9ef1B8c0E4F7dc8bF5719Ea496883DC6401d5b2e',
      pair: 'ETH/USD',
      ...PRICE_FEED_METADATA.ETH,
      chainId: CHAIN_IDS[CHAINS.BSC],
      verified: true,
      lastUpdate: null,
      heartbeat: 3600
    },
    BTC: {
      address: '0x264990fbd0A4796A3E3d8E37C4d5F87a3aCa5Ebf',
      pair: 'BTC/USD',
      ...PRICE_FEED_METADATA.BTC,
      chainId: CHAIN_IDS[CHAINS.BSC],
      verified: true,
      lastUpdate: null,
      heartbeat: 3600
    },
    WBTC: {
      address: '0x264990fbd0A4796A3E3d8E37C4d5F87a3aCa5Ebf',
      pair: 'BTC/USD',
      ...PRICE_FEED_METADATA.WBTC,
      chainId: CHAIN_IDS[CHAINS.BSC],
      verified: true,
      lastUpdate: null,
      heartbeat: 3600
    },
    DOGE: {
      address: '0x3AB0A0d137D4F946fBB19eecc6e92E64660231C8',
      pair: 'DOGE/USD',
      symbol: 'DOGE',
      name: 'Dogecoin',
      decimals: 8,
      updateFrequency: UPDATE_FREQUENCIES.STANDARD,
      feedType: FEED_TYPES.CHAINLINK,
      category: 'crypto',
      isStable: false,
      chainId: CHAIN_IDS[CHAINS.BSC],
      verified: true,
      lastUpdate: null,
      heartbeat: 3600
    },
    USDC: {
      address: '0x51597f405303C4377E36123cBc172b13269EA163',
      pair: 'USDC/USD',
      ...PRICE_FEED_METADATA.USDC,
      chainId: CHAIN_IDS[CHAINS.BSC],
      verified: true,
      lastUpdate: null,
      heartbeat: 86400
    },
    USDT: {
      address: '0xB97Ad0E74fa7d920791E90258A6E2085088b4320',
      pair: 'USDT/USD',
      ...PRICE_FEED_METADATA.USDT,
      chainId: CHAIN_IDS[CHAINS.BSC],
      verified: true,
      lastUpdate: null,
      heartbeat: 86400
    },
    DAI: {
      address: '0x132d3C0B1D2cEa0BC552588063bdBb210FDeecfA',
      pair: 'DAI/USD',
      ...PRICE_FEED_METADATA.DAI,
      chainId: CHAIN_IDS[CHAINS.BSC],
      verified: true,
      lastUpdate: null,
      heartbeat: 3600
    },
    LINK: {
      address: '0xca236E327F629f9Fc2c30A4E95775EbF0B89fac8',
      pair: 'LINK/USD',
      symbol: 'LINK',
      name: 'Chainlink',
      decimals: 8,
      updateFrequency: UPDATE_FREQUENCIES.STANDARD,
      feedType: FEED_TYPES.CHAINLINK,
      category: 'defi',
      isStable: false,
      chainId: CHAIN_IDS[CHAINS.BSC],
      verified: true,
      lastUpdate: null,
      heartbeat: 3600
    },
    'CROSS-USDT': {
      address: '0xB97Ad0E74fa7d920791E90258A6E2085088b4320',
      pair: 'USDT/USD',
      symbol: 'CROSS-USDT',
      name: 'Cross-Chain USDT',
      decimals: 8,
      updateFrequency: UPDATE_FREQUENCIES.STANDARD,
      feedType: FEED_TYPES.DERIVED,
      category: 'crosschain',
      isStable: true,
      baseFeed: 'USDT',
      chainId: CHAIN_IDS[CHAINS.BSC],
      verified: true,
      lastUpdate: null,
      heartbeat: 86400,
      isLayerZeroOFT: true
    }
  }),

  // ── Arbitrum Mainnet ───────────────────────────────────────
  [CHAIN_IDS[CHAINS.ARBITRUM]]: Object.freeze({
    ETH: {
      address: '0x639Fe6ab55C921f74e7fac1ee960C0B6293ba612',
      pair: 'ETH/USD',
      ...PRICE_FEED_METADATA.ETH,
      chainId: CHAIN_IDS[CHAINS.ARBITRUM],
      verified: true,
      lastUpdate: null,
      heartbeat: 3600
    },
    WETH: {
      address: '0x639Fe6ab55C921f74e7fac1ee960C0B6293ba612',
      pair: 'ETH/USD',
      ...PRICE_FEED_METADATA.WETH,
      chainId: CHAIN_IDS[CHAINS.ARBITRUM],
      verified: true,
      lastUpdate: null,
      heartbeat: 3600
    },
    BTC: {
      address: '0x6ce185860a4963106506C203335A2910413708e9',
      pair: 'BTC/USD',
      ...PRICE_FEED_METADATA.BTC,
      chainId: CHAIN_IDS[CHAINS.ARBITRUM],
      verified: true,
      lastUpdate: null,
      heartbeat: 3600
    },
    WBTC: {
      address: '0x6ce185860a4963106506C203335A2910413708e9',
      pair: 'BTC/USD',
      ...PRICE_FEED_METADATA.WBTC,
      chainId: CHAIN_IDS[CHAINS.ARBITRUM],
      verified: true,
      lastUpdate: null,
      heartbeat: 3600
    },
    ARB: {
      address: '0xb2A824043730FE05F3DA2efaFa1CBbe83fa548D6',
      pair: 'ARB/USD',
      symbol: 'ARB',
      name: 'Arbitrum',
      decimals: 8,
      updateFrequency: UPDATE_FREQUENCIES.STANDARD,
      feedType: FEED_TYPES.CHAINLINK,
      category: 'governance',
      isStable: false,
      chainId: CHAIN_IDS[CHAINS.ARBITRUM],
      verified: true,
      lastUpdate: null,
      heartbeat: 3600
    },
    USDC: {
      address: '0x50834F3163758fcC1Df9973b6e91f0F0F0434aD3',
      pair: 'USDC/USD',
      ...PRICE_FEED_METADATA.USDC,
      chainId: CHAIN_IDS[CHAINS.ARBITRUM],
      verified: true,
      lastUpdate: null,
      heartbeat: 86400
    },
    USDT: {
      address: '0x3f3f5dF88dC9F13eac63DF89EC16ef6e7E25DdE7',
      pair: 'USDT/USD',
      ...PRICE_FEED_METADATA.USDT,
      chainId: CHAIN_IDS[CHAINS.ARBITRUM],
      verified: true,
      lastUpdate: null,
      heartbeat: 86400
    },
    DAI: {
      address: '0xc5C8E77B397E531B8EC06BFb0048328B30E9eCfB',
      pair: 'DAI/USD',
      ...PRICE_FEED_METADATA.DAI,
      chainId: CHAIN_IDS[CHAINS.ARBITRUM],
      verified: true,
      lastUpdate: null,
      heartbeat: 3600
    },
    LINK: {
      address: '0x86E53CF1B870786351Da77A57575e79CB55812CB',
      pair: 'LINK/USD',
      symbol: 'LINK',
      name: 'Chainlink',
      decimals: 8,
      updateFrequency: UPDATE_FREQUENCIES.STANDARD,
      feedType: FEED_TYPES.CHAINLINK,
      category: 'defi',
      isStable: false,
      chainId: CHAIN_IDS[CHAINS.ARBITRUM],
      verified: true,
      lastUpdate: null,
      heartbeat: 3600
    },
    UNI: {
      address: '0x9C917083fDb403ab5ADbEC26Ee294f6EcAda2720',
      pair: 'UNI/USD',
      symbol: 'UNI',
      name: 'Uniswap',
      decimals: 8,
      updateFrequency: UPDATE_FREQUENCIES.STANDARD,
      feedType: FEED_TYPES.CHAINLINK,
      category: 'defi',
      isStable: false,
      chainId: CHAIN_IDS[CHAINS.ARBITRUM],
      verified: true,
      lastUpdate: null,
      heartbeat: 3600
    },
    'CROSS-USDT': {
      address: '0x3f3f5dF88dC9F13eac63DF89EC16ef6e7E25DdE7',
      pair: 'USDT/USD',
      symbol: 'CROSS-USDT',
      name: 'Cross-Chain USDT',
      decimals: 8,
      updateFrequency: UPDATE_FREQUENCIES.STANDARD,
      feedType: FEED_TYPES.DERIVED,
      category: 'crosschain',
      isStable: true,
      baseFeed: 'USDT',
      chainId: CHAIN_IDS[CHAINS.ARBITRUM],
      verified: true,
      lastUpdate: null,
      heartbeat: 86400,
      isLayerZeroOFT: true
    }
  }),

  // ── Optimism Mainnet ───────────────────────────────────────
  [CHAIN_IDS[CHAINS.OPTIMISM]]: Object.freeze({
    ETH: {
      address: '0x13e3Ee699D1909E989722E753853AE30b17e08c5',
      pair: 'ETH/USD',
      ...PRICE_FEED_METADATA.ETH,
      chainId: CHAIN_IDS[CHAINS.OPTIMISM],
      verified: true,
      lastUpdate: null,
      heartbeat: 3600
    },
    WETH: {
      address: '0x13e3Ee699D1909E989722E753853AE30b17e08c5',
      pair: 'ETH/USD',
      ...PRICE_FEED_METADATA.WETH,
      chainId: CHAIN_IDS[CHAINS.OPTIMISM],
      verified: true,
      lastUpdate: null,
      heartbeat: 3600
    },
    BTC: {
      address: '0xD702DD976Fb76Fffc2D3963D037dfDae5b04E593',
      pair: 'BTC/USD',
      ...PRICE_FEED_METADATA.BTC,
      chainId: CHAIN_IDS[CHAINS.OPTIMISM],
      verified: true,
      lastUpdate: null,
      heartbeat: 3600
    },
    OP: {
      address: '0x0D276FC14719f9292D5C1eA2198673d1f4269246',
      pair: 'OP/USD',
      symbol: 'OP',
      name: 'Optimism',
      decimals: 8,
      updateFrequency: UPDATE_FREQUENCIES.STANDARD,
      feedType: FEED_TYPES.CHAINLINK,
      category: 'governance',
      isStable: false,
      chainId: CHAIN_IDS[CHAINS.OPTIMISM],
      verified: true,
      lastUpdate: null,
      heartbeat: 3600
    },
    USDC: {
      address: '0x16a9FA2FDa030272Ce99B29CF780dFA30361E0f3',
      pair: 'USDC/USD',
      ...PRICE_FEED_METADATA.USDC,
      chainId: CHAIN_IDS[CHAINS.OPTIMISM],
      verified: true,
      lastUpdate: null,
      heartbeat: 86400
    },
    USDT: {
      address: '0xECef79E109e997bCA29c1c0897ec9d7b03647F5E',
      pair: 'USDT/USD',
      ...PRICE_FEED_METADATA.USDT,
      chainId: CHAIN_IDS[CHAINS.OPTIMISM],
      verified: true,
      lastUpdate: null,
      heartbeat: 86400
    },
    DAI: {
      address: '0x8dBa75e83DA73cc766A7e5a0ee71F656BAb470d6',
      pair: 'DAI/USD',
      ...PRICE_FEED_METADATA.DAI,
      chainId: CHAIN_IDS[CHAINS.OPTIMISM],
      verified: true,
      lastUpdate: null,
      heartbeat: 3600
    },
    LINK: {
      address: '0xCc232dcFAAE6354cE191Bd574108c1aD03f86450',
      pair: 'LINK/USD',
      symbol: 'LINK',
      name: 'Chainlink',
      decimals: 8,
      updateFrequency: UPDATE_FREQUENCIES.STANDARD,
      feedType: FEED_TYPES.CHAINLINK,
      category: 'defi',
      isStable: false,
      chainId: CHAIN_IDS[CHAINS.OPTIMISM],
      verified: true,
      lastUpdate: null,
      heartbeat: 3600
    },
    UNI: {
      address: '0x11429eE838cC01071402f21C219870cbAc0a59A0',
      pair: 'UNI/USD',
      symbol: 'UNI',
      name: 'Uniswap',
      decimals: 8,
      updateFrequency: UPDATE_FREQUENCIES.STANDARD,
      feedType: FEED_TYPES.CHAINLINK,
      category: 'defi',
      isStable: false,
      chainId: CHAIN_IDS[CHAINS.OPTIMISM],
      verified: true,
      lastUpdate: null,
      heartbeat: 3600
    },
    'CROSS-USDT': {
      address: '0xECef79E109e997bCA29c1c0897ec9d7b03647F5E',
      pair: 'USDT/USD',
      symbol: 'CROSS-USDT',
      name: 'Cross-Chain USDT',
      decimals: 8,
      updateFrequency: UPDATE_FREQUENCIES.STANDARD,
      feedType: FEED_TYPES.DERIVED,
      category: 'crosschain',
      isStable: true,
      baseFeed: 'USDT',
      chainId: CHAIN_IDS[CHAINS.OPTIMISM],
      verified: true,
      lastUpdate: null,
      heartbeat: 86400,
      isLayerZeroOFT: true
    }
  }),

  // ── Avalanche Mainnet ──────────────────────────────────────
  [CHAIN_IDS[CHAINS.AVALANCHE]]: Object.freeze({
    AVAX: {
      address: '0x0A77230d17318075983913bC2145DB16C7366156',
      pair: 'AVAX/USD',
      symbol: 'AVAX',
      name: 'Avalanche',
      decimals: 8,
      updateFrequency: UPDATE_FREQUENCIES.FAST,
      feedType: FEED_TYPES.CHAINLINK,
      category: 'native',
      isStable: false,
      chainId: CHAIN_IDS[CHAINS.AVALANCHE],
      verified: true,
      lastUpdate: null,
      heartbeat: 3600
    },
    WAVAX: {
      address: '0x0A77230d17318075983913bC2145DB16C7366156',
      pair: 'AVAX/USD',
      symbol: 'WAVAX',
      name: 'Wrapped AVAX',
      decimals: 8,
      updateFrequency: UPDATE_FREQUENCIES.FAST,
      feedType: FEED_TYPES.DERIVED,
      category: 'wrapped',
      isStable: false,
      baseFeed: 'AVAX',
      chainId: CHAIN_IDS[CHAINS.AVALANCHE],
      verified: true,
      lastUpdate: null,
      heartbeat: 3600
    },
    ETH: {
      address: '0x976B3D034E162d8bD72D6b9C989d545b839003b0',
      pair: 'ETH/USD',
      ...PRICE_FEED_METADATA.ETH,
      chainId: CHAIN_IDS[CHAINS.AVALANCHE],
      verified: true,
      lastUpdate: null,
      heartbeat: 3600
    },
    BTC: {
      address: '0x2779D32d5166BAaa2B2b658333bA7e6Ec0C65743',
      pair: 'BTC/USD',
      ...PRICE_FEED_METADATA.BTC,
      chainId: CHAIN_IDS[CHAINS.AVALANCHE],
      verified: true,
      lastUpdate: null,
      heartbeat: 3600
    },
    USDC: {
      address: '0xF096872672F44d6EBA71458D74fe67F9a77a23B9',
      pair: 'USDC/USD',
      ...PRICE_FEED_METADATA.USDC,
      chainId: CHAIN_IDS[CHAINS.AVALANCHE],
      verified: true,
      lastUpdate: null,
      heartbeat: 86400
    },
    USDT: {
      address: '0xEBE676ee90Fe1112671f19b6B7459bC678B67e8a',
      pair: 'USDT/USD',
      ...PRICE_FEED_METADATA.USDT,
      chainId: CHAIN_IDS[CHAINS.AVALANCHE],
      verified: true,
      lastUpdate: null,
      heartbeat: 86400
    },
    DAI: {
      address: '0x51D7180edA2260cc4F6e4EebB82FEF5c3c2B8300',
      pair: 'DAI/USD',
      ...PRICE_FEED_METADATA.DAI,
      chainId: CHAIN_IDS[CHAINS.AVALANCHE],
      verified: true,
      lastUpdate: null,
      heartbeat: 3600
    },
    LINK: {
      address: '0x49ccd9ca821EfEab2b98c60dC60F518E765EDe9a',
      pair: 'LINK/USD',
      symbol: 'LINK',
      name: 'Chainlink',
      decimals: 8,
      updateFrequency: UPDATE_FREQUENCIES.STANDARD,
      feedType: FEED_TYPES.CHAINLINK,
      category: 'defi',
      isStable: false,
      chainId: CHAIN_IDS[CHAINS.AVALANCHE],
      verified: true,
      lastUpdate: null,
      heartbeat: 3600
    },
    AAVE: {
      address: '0x3CA13391E9fb38a75330fb28f8cc2eB3D9ceceED',
      pair: 'AAVE/USD',
      symbol: 'AAVE',
      name: 'Aave',
      decimals: 8,
      updateFrequency: UPDATE_FREQUENCIES.STANDARD,
      feedType: FEED_TYPES.CHAINLINK,
      category: 'defi',
      isStable: false,
      chainId: CHAIN_IDS[CHAINS.AVALANCHE],
      verified: true,
      lastUpdate: null,
      heartbeat: 3600
    },
    'CROSS-USDT': {
      address: '0xEBE676ee90Fe1112671f19b6B7459bC678B67e8a',
      pair: 'USDT/USD',
      symbol: 'CROSS-USDT',
      name: 'Cross-Chain USDT',
      decimals: 8,
      updateFrequency: UPDATE_FREQUENCIES.STANDARD,
      feedType: FEED_TYPES.DERIVED,
      category: 'crosschain',
      isStable: true,
      baseFeed: 'USDT',
      chainId: CHAIN_IDS[CHAINS.AVALANCHE],
      verified: true,
      lastUpdate: null,
      heartbeat: 86400,
      isLayerZeroOFT: true
    }
  }),

  // ── Base Mainnet ───────────────────────────────────────────
  [CHAIN_IDS[CHAINS.BASE]]: Object.freeze({
    ETH: {
      address: '0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70',
      pair: 'ETH/USD',
      ...PRICE_FEED_METADATA.ETH,
      chainId: CHAIN_IDS[CHAINS.BASE],
      verified: true,
      lastUpdate: null,
      heartbeat: 3600
    },
    USDC: {
      address: '0x7e860098F58bBFC8648a4311b374B1D669a2bc6B',
      pair: 'USDC/USD',
      ...PRICE_FEED_METADATA.USDC,
      chainId: CHAIN_IDS[CHAINS.BASE],
      verified: true,
      lastUpdate: null,
      heartbeat: 86400
    },
    'CROSS-USDT': {
      address: '0x7e860098F58bBFC8648a4311b374B1D669a2bc6B',
      pair: 'USDC/USD',
      symbol: 'CROSS-USDT',
      name: 'Cross-Chain USDT',
      decimals: 8,
      updateFrequency: UPDATE_FREQUENCIES.STANDARD,
      feedType: FEED_TYPES.DERIVED,
      category: 'crosschain',
      isStable: true,
      baseFeed: 'USDC',
      chainId: CHAIN_IDS[CHAINS.BASE],
      verified: true,
      lastUpdate: null,
      heartbeat: 86400,
      isLayerZeroOFT: true
    }
  }),

  // ── Testnets ───────────────────────────────────────────────
  [CHAIN_IDS.ETHEREUM_SEPOLIA]: Object.freeze({
    ETH: {
      address: '0x694AA1769357215DE4FAC081bf1f309aDC325306',
      pair: 'ETH/USD',
      ...PRICE_FEED_METADATA.ETH,
      chainId: CHAIN_IDS.ETHEREUM_SEPOLIA,
      verified: true,
      lastUpdate: null,
      heartbeat: 3600
    },
    BTC: {
      address: '0x1B44F3514812d835EB1BDB0aCB33d3FA3351Ee43',
      pair: 'BTC/USD',
      ...PRICE_FEED_METADATA.BTC,
      chainId: CHAIN_IDS.ETHEREUM_SEPOLIA,
      verified: true,
      lastUpdate: null,
      heartbeat: 3600
    },
    USDC: {
      address: '0xA2F78ab2355fe2f984D808B5CeE7FD0A93D5270E',
      pair: 'USDC/USD',
      ...PRICE_FEED_METADATA.USDC,
      chainId: CHAIN_IDS.ETHEREUM_SEPOLIA,
      verified: true,
      lastUpdate: null,
      heartbeat: 86400
    },
    LINK: {
      address: '0xC59E3633BaAC79493d908E63626716E204A45EdF',
      pair: 'LINK/USD',
      symbol: 'LINK',
      name: 'Chainlink',
      decimals: 8,
      updateFrequency: UPDATE_FREQUENCIES.STANDARD,
      feedType: FEED_TYPES.CHAINLINK,
      category: 'defi',
      isStable: false,
      chainId: CHAIN_IDS.ETHEREUM_SEPOLIA,
      verified: true,
      lastUpdate: null,
      heartbeat: 3600
    }
  }),

  [CHAIN_IDS.ARBITRUM_SEPOLIA]: Object.freeze({
    ETH: {
      address: '0xd30e2101a97dcbAeBCBC04F14C3f624E67A35165',
      pair: 'ETH/USD',
      ...PRICE_FEED_METADATA.ETH,
      chainId: CHAIN_IDS.ARBITRUM_SEPOLIA,
      verified: true,
      lastUpdate: null,
      heartbeat: 3600
    },
    BTC: {
      address: '0x56A43EB56Da12C0dc1D972ACb089C06a5dEF8e69',
      pair: 'BTC/USD',
      ...PRICE_FEED_METADATA.BTC,
      chainId: CHAIN_IDS.ARBITRUM_SEPOLIA,
      verified: true,
      lastUpdate: null,
      heartbeat: 3600
    },
    USDC: {
      address: '0x0153002d20B96532C639313c2d54c3dA09109309',
      pair: 'USDC/USD',
      ...PRICE_FEED_METADATA.USDC,
      chainId: CHAIN_IDS.ARBITRUM_SEPOLIA,
      verified: true,
      lastUpdate: null,
      heartbeat: 86400
    }
  }),

  [CHAIN_IDS.OPTIMISM_SEPOLIA]: Object.freeze({
    ETH: {
      address: '0x61Ec26aA57019C486B10502285c5A3D4A4750AD7',
      pair: 'ETH/USD',
      ...PRICE_FEED_METADATA.ETH,
      chainId: CHAIN_IDS.OPTIMISM_SEPOLIA,
      verified: true,
      lastUpdate: null,
      heartbeat: 3600
    },
    BTC: {
      address: '0xC16679B963CeB52089aD2d95312A5b85E318e9d2',
      pair: 'BTC/USD',
      ...PRICE_FEED_METADATA.BTC,
      chainId: CHAIN_IDS.OPTIMISM_SEPOLIA,
      verified: true,
      lastUpdate: null,
      heartbeat: 3600
    },
    OP: {
      address: '0x95630d5C14EbbD8B8645D3988Ce47Fd9bDa8227b',
      pair: 'OP/USD',
      symbol: 'OP',
      name: 'Optimism',
      decimals: 8,
      updateFrequency: UPDATE_FREQUENCIES.STANDARD,
      feedType: FEED_TYPES.CHAINLINK,
      category: 'governance',
      isStable: false,
      chainId: CHAIN_IDS.OPTIMISM_SEPOLIA,
      verified: true,
      lastUpdate: null,
      heartbeat: 3600
    }
  }),

  [CHAIN_IDS.BSC_TESTNET]: Object.freeze({
    BNB: {
      address: '0x2514895c72f50D8bd4B4F9b1110F0D6bD2c97526',
      pair: 'BNB/USD',
      symbol: 'BNB',
      name: 'Binance Coin',
      decimals: 8,
      updateFrequency: UPDATE_FREQUENCIES.FAST,
      feedType: FEED_TYPES.CHAINLINK,
      category: 'native',
      isStable: false,
      chainId: CHAIN_IDS.BSC_TESTNET,
      verified: true,
      lastUpdate: null,
      heartbeat: 3600
    },
    ETH: {
      address: '0x143dB3CEEfbdfe5631aDD3E50F7614B6ba708BA7',
      pair: 'ETH/USD',
      ...PRICE_FEED_METADATA.ETH,
      chainId: CHAIN_IDS.BSC_TESTNET,
      verified: true,
      lastUpdate: null,
      heartbeat: 3600
    },
    BTC: {
      address: '0x5741306c21795FdCBb9b265Ea0255F499DFe515C',
      pair: 'BTC/USD',
      ...PRICE_FEED_METADATA.BTC,
      chainId: CHAIN_IDS.BSC_TESTNET,
      verified: true,
      lastUpdate: null,
      heartbeat: 3600
    }
  }),

  [CHAIN_IDS.AVALANCHE_FUJI]: Object.freeze({
    AVAX: {
      address: '0x5498BB86BC934c8D34FDA08E81D444153d0D06aD',
      pair: 'AVAX/USD',
      symbol: 'AVAX',
      name: 'Avalanche',
      decimals: 8,
      updateFrequency: UPDATE_FREQUENCIES.FAST,
      feedType: FEED_TYPES.CHAINLINK,
      category: 'native',
      isStable: false,
      chainId: CHAIN_IDS.AVALANCHE_FUJI,
      verified: true,
      lastUpdate: null,
      heartbeat: 3600
    },
    ETH: {
      address: '0x86d67c3D38D2bCeE722E601025C25a575021c6EA',
      pair: 'ETH/USD',
      ...PRICE_FEED_METADATA.ETH,
      chainId: CHAIN_IDS.AVALANCHE_FUJI,
      verified: true,
      lastUpdate: null,
      heartbeat: 3600
    },
    BTC: {
      address: '0x31CF013A08c6Ac228C94551d535d5BAfE19c602a',
      pair: 'BTC/USD',
      ...PRICE_FEED_METADATA.BTC,
      chainId: CHAIN_IDS.AVALANCHE_FUJI,
      verified: true,
      lastUpdate: null,
      heartbeat: 3600
    }
  }),

  [CHAIN_IDS.POLYGON_AMOY]: Object.freeze({
    MATIC: {
      address: '0x001382149eBa3441043c1c66972b4772963f5D43',
      pair: 'MATIC/USD',
      symbol: 'MATIC',
      name: 'Polygon',
      decimals: 8,
      updateFrequency: UPDATE_FREQUENCIES.STANDARD,
      feedType: FEED_TYPES.CHAINLINK,
      category: 'native',
      isStable: false,
      chainId: CHAIN_IDS.POLYGON_AMOY,
      verified: true,
      lastUpdate: null,
      heartbeat: 3600
    },
    ETH: {
      address: '0xF0d50568e3A7e8259E16663972b11910F89BD8e7',
      pair: 'ETH/USD',
      ...PRICE_FEED_METADATA.ETH,
      chainId: CHAIN_IDS.POLYGON_AMOY,
      verified: true,
      lastUpdate: null,
      heartbeat: 3600
    },
    BTC: {
      address: '0xe5Dc0A609Ab8bCF15d3f35cFaa1Ff40f521173Ea',
      pair: 'BTC/USD',
      ...PRICE_FEED_METADATA.BTC,
      chainId: CHAIN_IDS.POLYGON_AMOY,
      verified: true,
      lastUpdate: null,
      heartbeat: 3600
    }
  })
});

// Enhanced utility functions for price feed management
const getPriceFeedsForChain = (chainId) => {
  return PRICE_FEEDS[chainId] || {};
};

const getPriceFeedAddress = (chainId, symbol) => {
  const feeds = PRICE_FEEDS[chainId] || {};
  const feed = feeds[symbol];
  return feed ? feed.address : null;
};

const getPriceFeedMetadata = (chainId, symbol) => {
  const feeds = PRICE_FEEDS[chainId] || {};
  return feeds[symbol] || null;
};

const getStablecoinFeeds = (chainId) => {
  const feeds = PRICE_FEEDS[chainId] || {};
  return Object.entries(feeds)
    .filter(([, feed]) => feed.isStable)
    .reduce((acc, [symbol, feed]) => ({ ...acc, [symbol]: feed }), {});
};

const getCrossChainFeeds = (chainId) => {
  const feeds = PRICE_FEEDS[chainId] || {};
  return Object.entries(feeds)
    .filter(([, feed]) => feed.isLayerZeroOFT)
    .reduce((acc, [symbol, feed]) => ({ ...acc, [symbol]: feed }), {});
};

const getNativeTokenFeed = (chainId) => {
  const feeds = PRICE_FEEDS[chainId] || {};
  return Object.entries(feeds)
    .find(([, feed]) => feed.category === 'native')?.[1] || null;
};

const getFeedsByCategory = (chainId, category) => {
  const feeds = PRICE_FEEDS[chainId] || {};
  return Object.entries(feeds)
    .filter(([, feed]) => feed.category === category)
    .reduce((acc, [symbol, feed]) => ({ ...acc, [symbol]: feed }), {});
};

const getVerifiedFeeds = (chainId) => {
  const feeds = PRICE_FEEDS[chainId] || {};
  return Object.entries(feeds)
    .filter(([, feed]) => feed.verified)
    .reduce((acc, [symbol, feed]) => ({ ...acc, [symbol]: feed }), {});
};

const getAllSupportedSymbols = () => {
  const allSymbols = new Set();
  Object.values(PRICE_FEEDS).forEach(chainFeeds => {
    Object.keys(chainFeeds).forEach(symbol => allSymbols.add(symbol));
  });
  return Array.from(allSymbols).sort();
};

const getSupportedChainsForSymbol = (symbol) => {
  const supportedChains = [];
  Object.entries(PRICE_FEEDS).forEach(([chainId, feeds]) => {
    if (feeds[symbol]) {
      supportedChains.push(Number(chainId));
    }
  });
  return supportedChains;
};

const validatePriceFeed = (chainId, symbol) => {
  const feed = getPriceFeedMetadata(chainId, symbol);
  if (!feed) {
    return { isValid: false, error: 'Price feed not found' };
  }
  
  if (!feed.verified) {
    return { isValid: false, error: 'Price feed not verified' };
  }
  
  return { isValid: true, feed };
};

// Export all configurations and utilities
module.exports = {
  // Core configurations
  PRICE_FEEDS,
  PRICE_FEED_METADATA,
  
  // Constants
  FEED_TYPES,
  UPDATE_FREQUENCIES,
  
  // Utility functions
  getPriceFeedsForChain,
  getPriceFeedAddress,
  getPriceFeedMetadata,
  getStablecoinFeeds,
  getCrossChainFeeds,
  getNativeTokenFeed,
  getFeedsByCategory,
  getVerifiedFeeds,
  getAllSupportedSymbols,
  getSupportedChainsForSymbol,
  validatePriceFeed
};
