// config/priceConfig.js
// Enhanced Production Price Configuration - Price Feeds and DEX Integration

const { CHAINS } = require('./chains.config');
const { BASE_TOKENS } = require('./token.config');

// Price Provider Types
const PRICE_PROVIDERS = {
  CHAINLINK: 'chainlink',
  COINGECKO: 'coingecko',
  DEX: 'dex',
  PYTH: 'pyth',
  BAND: 'band',
  DIA: 'dia',
  BINANCE: 'binance',
  COINBASE: 'coinbase',
  KRAKEN: 'kraken',
  UNISWAP: 'uniswap',
  PANCAKESWAP: 'pancakeswap',
  QUICKSWAP: 'quickswap'
};

// Price Update Intervals (in milliseconds)
const UPDATE_INTERVALS = {
  REAL_TIME: 1000,      // 1 second for critical pairs
  ULTRA_FAST: 5000,     // 5 seconds
  FAST: 30000,          // 30 seconds  
  NORMAL: 60000,        // 1 minute
  SLOW: 300000,         // 5 minutes
  BATCH: 900000,        // 15 minutes
  HOURLY: 3600000       // 1 hour for stable assets
};

// Price Feed Types
const FEED_TYPES = {
  CHAINLINK: 'chainlink',
  DEX_PAIR: 'dex_pair',
  SUBGRAPH: 'subgraph',
  API: 'api',
  ORACLE: 'oracle'
};

// Enhanced DEX Configuration per Chain with more protocols
const DEX_CONFIGS = {
  [CHAINS.ETHEREUM]: {
    uniswap: {
      v2: {
        factory: '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f',
        router: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
        quoter: '0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6',
        subgraph: 'https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v2',
        fee: 0.003 // 0.3%
      },
      v3: {
        factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
        router: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
        quoter: '0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6',
        subgraph: 'https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3',
        fees: [0.0005, 0.003, 0.01] // 0.05%, 0.3%, 1%
      }
    },
    sushiswap: {
      factory: '0xC0AEe478e3658e2610c5F7A4A2E1777cE9e4f2Ac',
      router: '0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F',
      subgraph: 'https://api.thegraph.com/subgraphs/name/sushiswap/exchange',
      fee: 0.003
    },
    curve: {
      registry: '0x90E00ACe148ca3b23Ac1bC8C240C2a7Dd9c2d7f5',
      factory: '0x0959158b6040D32d04c301A72CBFD6b39E21c9AE',
      subgraph: 'https://api.thegraph.com/subgraphs/name/curvefi/curve',
      fee: 0.0004
    },
    balancer: {
      vault: '0xBA12222222228d8Ba445958a75a0704d566BF2C8',
      subgraph: 'https://api.thegraph.com/subgraphs/name/balancer-labs/balancer-v2',
      fee: 0.001
    },
    oneinch: {
      router: '0x1111111254EEB25477B68fb85Ed929f73A960582',
      api: 'https://api.1inch.io/v5.0/1',
      aggregator: true
    }
  },

  [CHAINS.BSC]: {
    pancakeswap: {
      v2: {
        factory: '0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73',
        router: '0x10ED43C718714eb63d5aA57B78B54704E256024E',
        subgraph: 'https://api.thegraph.com/subgraphs/name/pancakeswap/exchange',
        fee: 0.0025
      },
      v3: {
        factory: '0x0BFbCF9fa4f9C56B0F40a671Ad40E0805A091865',
        router: '0x13f4EA83D0bd40E75C8222255bc855a974568Dd4',
        subgraph: 'https://api.thegraph.com/subgraphs/name/pancakeswap/exchange-v3-bsc',
        fees: [0.0001, 0.0005, 0.0025, 0.01]
      }
    },
    biswap: {
      factory: '0x858E3312ed3A876947EA49d572A7C42DE08af7EE',
      router: '0x3a6d8cA21D1CF76F653A67577FA0D27453350dD8',
      fee: 0.001
    },
    mdex: {
      factory: '0x3CD1C46068dAEa5Ebb0d3f55F6915B10648062B8',
      router: '0x0384E9ad329396C3A6A401243Ca71633B2bC4333',
      fee: 0.003
    },
    oneinch: {
      router: '0x1111111254EEB25477B68fb85Ed929f73A960582',
      api: 'https://api.1inch.io/v5.0/56',
      aggregator: true
    }
  },

  [CHAINS.POLYGON]: {
    quickswap: {
      factory: '0x5757371414417b8C6CAad45bAeF941aBc7d3Ab32',
      router: '0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff',
      subgraph: 'https://api.thegraph.com/subgraphs/name/sameepsi/quickswap06',
      fee: 0.003
    },
    sushiswap: {
      factory: '0xc35DADB65012eC5796536bD9864eD8773aBc74C4',
      router: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
      fee: 0.003
    },
    uniswap: {
      v3: {
        factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
        router: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
        fees: [0.0005, 0.003, 0.01]
      }
    },
    curve: {
      registry: '0x094d12e5b541784701FD8d65F11fc0598FBC6332',
      factory: '0x838A8a13cc2265b4b6735f56E71DD4040A8c05a5',
      fee: 0.0004
    },
    oneinch: {
      router: '0x1111111254EEB25477B68fb85Ed929f73A960582',
      api: 'https://api.1inch.io/v5.0/137',
      aggregator: true
    }
  },

  [CHAINS.ARBITRUM]: {
    uniswap: {
      v3: {
        factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
        router: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
        fees: [0.0005, 0.003, 0.01]
      }
    },
    sushiswap: {
      factory: '0xc35DADB65012eC5796536bD9864eD8773aBc74C4',
      router: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
      fee: 0.003
    },
    camelot: {
      factory: '0x6EcCab422D763aC031210895C81787E87B91425',
      router: '0xc873fEcbd354f5A56E00E710B90EF4201db2448d',
      fee: 0.003
    },
    curve: {
      registry: '0x445FE580eF8d70A569bE04B669E7392F26cDA487',
      factory: '0xabC000d88f23Bb679b53bE8E5c0c85cDD80d27C1',
      fee: 0.0004
    },
    oneinch: {
      router: '0x1111111254EEB25477B68fb85Ed929f73A960582',
      api: 'https://api.1inch.io/v5.0/42161',
      aggregator: true
    }
  },

  [CHAINS.OPTIMISM]: {
    uniswap: {
      v3: {
        factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
        router: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
        fees: [0.0005, 0.003, 0.01]
      }
    },
    velodrome: {
      factory: '0x25CbdDb98b35ab1FF77413456B31EC81A6B6B746',
      router: '0x9c12939390052919aF3155f41Bf4160Fd3666A6e',
      fee: 0.002
    },
    curve: {
      registry: '0xC5cfaDA84E902aD92DD40194f0883ad49639b023',
      factory: '0x2db0E83599a91b508Ac268a6197b8B14F5e72840',
      fee: 0.0004
    },
    oneinch: {
      router: '0x1111111254EEB25477B68fb85Ed929f73A960582',
      api: 'https://api.1inch.io/v5.0/10',
      aggregator: true
    }
  },

  [CHAINS.AVALANCHE]: {
    traderjoe: {
      factory: '0x9Ad6C38BE94206cA50bb0d90783181662f0Cfa10',
      router: '0x60aE616a2155Ee3d9A68541Ba4544862310933d4',
      fee: 0.003
    },
    pangolin: {
      factory: '0xefa94DE7a4656D787667C749f7E1223D71E9FD88',
      router: '0xE54Ca86531e17Ef3616d22Ca28b0D458b6C89106',
      fee: 0.003
    },
    curve: {
      registry: '0x8474DdbE98F5aA3179B3B3F5942D724aFcdec9f6',
      factory: '0x0f854EA9F38ceA4B1c2FC79047E9D0134419D5d6',
      fee: 0.0004
    },
    oneinch: {
      router: '0x1111111254EEB25477B68fb85Ed929f73A960582',
      api: 'https://api.1inch.io/v5.0/43114',
      aggregator: true
    }
  },

  [CHAINS.FANTOM]: {
    spookyswap: {
      factory: '0x152eE697f2E276fA89E96742e9bB9aB1F2E61bE3',
      router: '0xF491e7B69E4244ad4002BC14e878a34207E38c29',
      fee: 0.002
    },
    spiritswap: {
      factory: '0xEF45d134b73241eDa7703fa787148D9C9F4950b0',
      router: '0x16327E3FbDaCA3bcF7E38F5Af2599D2DDc33aE52',
      fee: 0.003
    },
    curve: {
      registry: '0x0f854EA9F38ceA4B1c2FC79047E9D0134419D5d6',
      factory: '0x686d67265703D1f5297435f4d63eC842A3C60a0f',
      fee: 0.0004
    }
  },

  [CHAINS.BASE]: {
    uniswap: {
      v3: {
        factory: '0x33128a8fC17869897dcE68Ed026d694621f6FDfD',
        router: '0x2626664c2603336E57B271c5C0b26F421741e481',
        fees: [0.0005, 0.003, 0.01]
      }
    },
    aerodrome: {
      factory: '0x420DD381b31aEf6683db6B902084cB0FFECe40Da',
      router: '0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43',
      fee: 0.0005
    }
  }
};

// Enhanced Price Configuration with more tokens and better fallback strategies
const PRICE_CONFIG = {
  ETH: {
    symbol: 'ETH',
    name: 'Ethereum',
    decimals: 18,
    coingeckoId: 'ethereum',
    category: 'native',
    providers: [
      PRICE_PROVIDERS.CHAINLINK, 
      PRICE_PROVIDERS.COINGECKO, 
      PRICE_PROVIDERS.DEX,
      PRICE_PROVIDERS.BINANCE,
      PRICE_PROVIDERS.COINBASE
    ],
    primaryProvider: PRICE_PROVIDERS.CHAINLINK,
    updateInterval: UPDATE_INTERVALS.FAST,
    priceWeight: {
      [PRICE_PROVIDERS.CHAINLINK]: 0.4,
      [PRICE_PROVIDERS.BINANCE]: 0.3,
      [PRICE_PROVIDERS.COINBASE]: 0.2,
      [PRICE_PROVIDERS.DEX]: 0.1
    },
    
    chains: {
      [CHAINS.ETHEREUM]: {
        address: '0x0000000000000000000000000000000000000000',
        isNative: true,
        chainlinkFeed: '0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419',
        dexPairs: {
          'ETH/USDC': {
            uniswap_v3: {
              address: '0x88e6A0c2dDD26FEEb64F039a2c41296FcB3f5640',
              fee: 0.0005,
              liquidity: 'high'
            },
            uniswap_v2: {
              address: '0xB4e16d0168e52d35CaCD2c6185b44281Ec28C9Dc',
              fee: 0.003,
              liquidity: 'high'
            },
            sushiswap: {
              address: '0x397FF1542f962076d0BFE58eA045FfA2d347ACa0',
              fee: 0.003,
              liquidity: 'medium'
            }
          },
          'ETH/USDT': {
            uniswap_v3: {
              address: '0x4e68Ccd3E89f51C3074ca5072bbAC773960dFa36',
              fee: 0.0005,
              liquidity: 'high'
            },
            uniswap_v2: {
              address: '0x0d4a11d5EEaaC28EC3F61d100daF4d40471f1852',
              fee: 0.003,
              liquidity: 'high'
            }
          }
        }
      },
      [CHAINS.ARBITRUM]: {
        address: '0x0000000000000000000000000000000000000000',
        isNative: true,
        chainlinkFeed: '0x639Fe6ab55C921f74e7fac1ee960C0B6293ba612',
        dexPairs: {
          'ETH/USDC': {
            uniswap_v3: {
              address: '0xC31E54c7a869B9FcBEcc14363CF510d1c41fa443',
              fee: 0.0005,
              liquidity: 'high'
            }
          }
        }
      },
      [CHAINS.OPTIMISM]: {
        address: '0x0000000000000000000000000000000000000000',
        isNative: true,
        chainlinkFeed: '0x13e3Ee699D1909E989722E753853AE30b17e08c5',
        dexPairs: {
          'ETH/USDC': {
            uniswap_v3: {
              address: '0x85149247691df622eaF1a8Bd0CaFd40BC45154a9',
              fee: 0.0005,
              liquidity: 'high'
            }
          }
        }
      },
      [CHAINS.POLYGON]: {
        address: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619',
        isNative: false,
        chainlinkFeed: '0xF9680D99D6C9589e2a93a78A04A279e509205945',
        dexPairs: {
          'ETH/USDC': {
            uniswap_v3: {
              address: '0x45dDa9cb7c25131DF268515131f647d726f50608',
              fee: 0.0005,
              liquidity: 'medium'
            }
          }
        }
      },
      [CHAINS.BASE]: {
        address: '0x0000000000000000000000000000000000000000',
        isNative: true,
        chainlinkFeed: '0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70',
        dexPairs: {
          'ETH/USDC': {
            uniswap_v3: {
              address: '0xd0b53D9277642d899DF5C87A3966A349A798F224',
              fee: 0.0005,
              liquidity: 'medium'
            }
          }
        }
      }
    },
    
    fallback: {
      providers: [PRICE_PROVIDERS.COINGECKO, PRICE_PROVIDERS.BINANCE],
      cacheTimeout: 300000, // 5 minutes
      stalePriceThreshold: 1800000, // 30 minutes
      circuitBreaker: {
        enabled: true,
        threshold: 0.1, // 10% price change
        cooldown: 300000 // 5 minutes
      },
      retryPolicy: {
        maxRetries: 3,
        backoffMultiplier: 2,
        initialDelay: 1000
      }
    }
  },

  BTC: {
    symbol: 'BTC',
    name: 'Bitcoin',
    decimals: 8,
    coingeckoId: 'bitcoin',
    category: 'native',
    providers: [
      PRICE_PROVIDERS.CHAINLINK,
      PRICE_PROVIDERS.COINGECKO,
      PRICE_PROVIDERS.BINANCE,
      PRICE_PROVIDERS.COINBASE
    ],
    primaryProvider: PRICE_PROVIDERS.CHAINLINK,
    updateInterval: UPDATE_INTERVALS.FAST,
    priceWeight: {
      [PRICE_PROVIDERS.CHAINLINK]: 0.4,
      [PRICE_PROVIDERS.BINANCE]: 0.3,
      [PRICE_PROVIDERS.COINBASE]: 0.2,
      [PRICE_PROVIDERS.COINGECKO]: 0.1
    },
    
    chains: {
      [CHAINS.ETHEREUM]: {
        address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', // WBTC
        isNative: false,
        chainlinkFeed: '0xF4030086522a5bEEa4988F8cA5B36dbC97BeE88c',
        dexPairs: {
          'WBTC/USDC': {
            uniswap_v3: {
              address: '0x99ac8cA7087fA4A2A1FB6357269965A2014ABc35',
              fee: 0.0005,
              liquidity: 'high'
            }
          }
        }
      },
      [CHAINS.POLYGON]: {
        address: '0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6', // WBTC
        isNative: false,
        chainlinkFeed: '0xDE31F8bFBD8c84b5360CFacCa3539B938dd78ae6'
      },
      [CHAINS.ARBITRUM]: {
        address: '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f', // WBTC
        isNative: false,
        chainlinkFeed: '0x6ce185860a4963106506C203335A2910413708e9'
      }
    },
    
    fallback: {
      providers: [PRICE_PROVIDERS.COINGECKO, PRICE_PROVIDERS.BINANCE],
      cacheTimeout: 300000,
      stalePriceThreshold: 1800000,
      circuitBreaker: {
        enabled: true,
        threshold: 0.1,
        cooldown: 300000
      }
    }
  },

  BNB: {
    symbol: 'BNB',
    name: 'BNB',
    decimals: 18,
    coingeckoId: 'binancecoin',
    category: 'native',
    providers: [PRICE_PROVIDERS.CHAINLINK, PRICE_PROVIDERS.COINGECKO, PRICE_PROVIDERS.DEX, PRICE_PROVIDERS.BINANCE],
    primaryProvider: PRICE_PROVIDERS.CHAINLINK,
    updateInterval: UPDATE_INTERVALS.FAST,
    
    chains: {
      [CHAINS.BSC]: {
        address: '0x0000000000000000000000000000000000000000',
        isNative: true,
        chainlinkFeed: '0x0567F2323251f0Aab15c8dFb1967E4e8A7D42aeE',
        dexPairs: {
          'BNB/USDT': {
            pancakeswap_v2: {
              address: '0x16b9a82891338f9bA80E2D6970FddA79D1eb0daE',
              fee: 0.0025,
              liquidity: 'high'
            },
            pancakeswap_v3: {
              address: '0x172fcD41E0913e95784454622d1c3724f546f849',
              fee: 0.0025,
              liquidity: 'high'
            }
          },
          'BNB/USDC': {
            pancakeswap_v2: {
              address: '0x58F876857a02D6762E0101bb5C46A8c1ED44Dc16',
              fee: 0.0025,
              liquidity: 'medium'
            }
          }
        }
      },
      [CHAINS.ETHEREUM]: {
        address: '0xB8c77482e45F1F44dE1745F52C74426C631bDD52',
        isNative: false,
        chainlinkFeed: '0x14e613AC84a31f709eadbdF89C6CC390fDc9540A'
      }
    },
    
    fallback: {
      providers: [PRICE_PROVIDERS.COINGECKO, PRICE_PROVIDERS.BINANCE],
      cacheTimeout: 300000,
      stalePriceThreshold: 1800000,
      circuitBreaker: {
        enabled: true,
        threshold: 0.1,
        cooldown: 300000
      }
    }
  },

  MATIC: {
    symbol: 'MATIC',
    name: 'Polygon',
    decimals: 18,
    coingeckoId: 'matic-network',
    category: 'native',
    providers: [PRICE_PROVIDERS.CHAINLINK, PRICE_PROVIDERS.COINGECKO, PRICE_PROVIDERS.DEX],
    primaryProvider: PRICE_PROVIDERS.CHAINLINK,
    updateInterval: UPDATE_INTERVALS.NORMAL,
    
    chains: {
      [CHAINS.ETHEREUM]: {
        address: '0x7D1AfA7B718fb893dB30A3aBc0Cfc608AaCfeBB0',
        isNative: false,
        chainlinkFeed: '0x7bAC85A8a13A4BcD8abb3eB7d6b4d632c5a57676'
      },
      [CHAINS.POLYGON]: {
        address: '0x0000000000000000000000000000000000001010',
        isNative: true,
        chainlinkFeed: '0xAB594600376Ec9fD91F8e885dADF0CE036862dE0',
        dexPairs: {
          'MATIC/USDC': {
            quickswap: {
              address: '0x6e7a5FAFcec6BB1e78bAE2A1F0B612012BF14827',
              fee: 0.003,
              liquidity: 'high'
            },
            uniswap_v3: {
              address: '0xA374094527e1673A86dE625aa59517c5dE346d32',
              fee: 0.003,
              liquidity: 'medium'
            }
          }
        }
      }
    },
    
    fallback: {
      providers: [PRICE_PROVIDERS.COINGECKO],
      cacheTimeout: 300000,
      stalePriceThreshold: 1800000
    }
  },

  AVAX: {
    symbol: 'AVAX',
    name: 'Avalanche',
    decimals: 18,
    coingeckoId: 'avalanche-2',
    category: 'native',
    providers: [PRICE_PROVIDERS.CHAINLINK, PRICE_PROVIDERS.COINGECKO, PRICE_PROVIDERS.DEX],
    primaryProvider: PRICE_PROVIDERS.CHAINLINK,
    updateInterval: UPDATE_INTERVALS.NORMAL,
    
    chains: {
      [CHAINS.ETHEREUM]: {
        address: '0x85f138bfEE4ef8e540890CFb48F620571d67Eda3',
        isNative: false,
        chainlinkFeed: '0xFF3EEb22B5E3dE6e705b44749C2559d704923FD7'
      },
      [CHAINS.AVALANCHE]: {
        address: '0x0000000000000000000000000000000000000000',
        isNative: true,
        chainlinkFeed: '0x0A77230d17318075983913bC2145DB16C7366156',
        dexPairs: {
          'AVAX/USDC': {
            traderjoe: {
              address: '0xf4003F4efBE8691B60249E6afbD307aBE7758adb',
              fee: 0.003,
              liquidity: 'high'
            },
            pangolin: {
              address: '0xd7538cABBf8605BdE1f4901B47B8D42c61DE0367',
              fee: 0.003,
              liquidity: 'medium'
            }
          }
        }
      }
    },
    
    fallback: {
      providers: [PRICE_PROVIDERS.COINGECKO],
      cacheTimeout: 300000,
      stalePriceThreshold: 1800000
    }
  },

  // Stablecoins
  USDC: {
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    coingeckoId: 'usd-coin',
    category: 'stablecoin',
    providers: [PRICE_PROVIDERS.CHAINLINK, PRICE_PROVIDERS.COINGECKO],
    primaryProvider: PRICE_PROVIDERS.CHAINLINK,
    updateInterval: UPDATE_INTERVALS.NORMAL,
    isStable: true,
    
    chains: {
      [CHAINS.ETHEREUM]: {
        address: '0xA0b86a33E6441E6fb7ae73e9bee7D3a8b7A4Cb4',
        isNative: false,
        chainlinkFeed: '0x8fFfFfd4AfB6115b954Bd326cbe7B4BA576818f6'
      },
      [CHAINS.BSC]: {
        address: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
        isNative: false,
        chainlinkFeed: '0x51597f405303C4377E36123cBc172b13269EA163'
      },
      [CHAINS.POLYGON]: {
        address: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
        isNative: false,
        chainlinkFeed: '0xfE4A8cc5b5B2366C1B58Bea3858e81843581b2F7'
      },
      [CHAINS.ARBITRUM]: {
        address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
        isNative: false,
        chainlinkFeed: '0x50834F3163758fcC1Df9973b6e91f0F0F0434aD3'
      },
      [CHAINS.OPTIMISM]: {
        address: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
        isNative: false,
        chainlinkFeed: '0x16a9FA2FDa030272Ce99B29CF780dFA30361E0f3'
      },
      [CHAINS.AVALANCHE]: {
        address: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E',
        isNative: false,
        chainlinkFeed: '0xF096872672F44d6EBA71458D74fe67F9a77419e0'
      },
      [CHAINS.BASE]: {
        address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
        isNative: false,
        chainlinkFeed: '0x7e860098F58bBFC8648a4311b374B1D669a2bc6B'
      }
    },
    
    fallback: {
      providers: [PRICE_PROVIDERS.COINGECKO],
      cacheTimeout: 600000, // 10 minutes for stablecoins
      stalePriceThreshold: 7200000, // 2 hours for stablecoins
      circuitBreaker: {
        enabled: true,
        threshold: 0.05, // 5% for stablecoins
        cooldown: 300000
      }
    }
  },

  USDT: {
    symbol: 'USDT',
    name: 'Tether USD',
    decimals: 6,
    coingeckoId: 'tether',
    category: 'stablecoin',
    providers: [PRICE_PROVIDERS.CHAINLINK, PRICE_PROVIDERS.COINGECKO],
    primaryProvider: PRICE_PROVIDERS.CHAINLINK,
    updateInterval: UPDATE_INTERVALS.NORMAL,
    isStable: true,
    
    chains: {
      [CHAINS.ETHEREUM]: {
        address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
        isNative: false,
        chainlinkFeed: '0x3E7d1eAB13ad0104d2750B8863b489D65364e32D'
      },
      [CHAINS.BSC]: {
        address: '0x55d398326f99059fF775485246999027B3197955',
        isNative: false,
        chainlinkFeed: '0xB97Ad0E74fa7d920791E90258A6E2085088b4320'
      },
      [CHAINS.POLYGON]: {
        address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
        isNative: false,
        chainlinkFeed: '0x0A6513e40db6EB1b165753AD52E80663aeA50545'
      },
      [CHAINS.ARBITRUM]: {
        address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
        isNative: false,
        chainlinkFeed: '0x3f3f5dF88dC9F13eac63DF89EC16ef6e7E25DdE7'
      },
      [CHAINS.AVALANCHE]: {
        address: '0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7',
        isNative: false,
        chainlinkFeed: '0xEBE676ee90Fe1112671f19b6B7459bC678B67e8a'
      }
    },
    
    fallback: {
      providers: [PRICE_PROVIDERS.COINGECKO],
      cacheTimeout: 600000,
      stalePriceThreshold: 7200000,
      circuitBreaker: {
        enabled: true,
        threshold: 0.05,
        cooldown: 300000
      }
    }
  },

  DAI: {
    symbol: 'DAI',
    name: 'Dai Stablecoin',
    decimals: 18,
    coingeckoId: 'dai',
    category: 'stablecoin',
    providers: [PRICE_PROVIDERS.CHAINLINK, PRICE_PROVIDERS.COINGECKO],
    primaryProvider: PRICE_PROVIDERS.CHAINLINK,
    updateInterval: UPDATE_INTERVALS.NORMAL,
    isStable: true,
    
    chains: {
      [CHAINS.ETHEREUM]: {
        address: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
        isNative: false,
        chainlinkFeed: '0xAed0c38402a5d19df6E4c03F4E2DceD6e29c1ee9'
      },
      [CHAINS.POLYGON]: {
        address: '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063',
        isNative: false,
        chainlinkFeed: '0x4746DeC9e833A82EC7C2C1356372CcF2cfcD2F3D'
      },
      [CHAINS.ARBITRUM]: {
        address: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
        isNative: false,
        chainlinkFeed: '0xc5C8E77B397E531B8EC06BFb0048328B30E9eCfB'
      }
    },
    
    fallback: {
      providers: [PRICE_PROVIDERS.COINGECKO],
      cacheTimeout: 600000,
      stalePriceThreshold: 7200000,
      circuitBreaker: {
        enabled: true,
        threshold: 0.05,
        cooldown: 300000
      }
    }
  },

  // Wrapped Bitcoin
  WBTC: {
    symbol: 'WBTC',
    name: 'Wrapped Bitcoin',
    decimals: 8,
    coingeckoId: 'wrapped-bitcoin',
    category: 'wrapped',
    providers: [PRICE_PROVIDERS.CHAINLINK, PRICE_PROVIDERS.COINGECKO, PRICE_PROVIDERS.DEX],
    primaryProvider: PRICE_PROVIDERS.CHAINLINK,
    updateInterval: UPDATE_INTERVALS.FAST,
    
    chains: {
      [CHAINS.ETHEREUM]: {
        address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
        isNative: false,
        chainlinkFeed: '0xF4030086522a5bEEa4988F8cA5B36dbC97BeE88c',
        dexPairs: {
          'WBTC/USDC': {
            uniswap_v3: {
              address: '0x99ac8cA7087fA4A2A1FB6357269965A2014ABc35',
              fee: 0.0005,
              liquidity: 'high'
            },
            uniswap_v2: {
              address: '0xBb2b8038a1640196FbE3e38816F3e67Cba72D940',
              fee: 0.003,
              liquidity: 'medium'
            }
          }
        }
      },
      [CHAINS.POLYGON]: {
        address: '0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6',
        isNative: false,
        chainlinkFeed: '0xDE31F8bFBD8c84b5360CFacCa3539B938dd78ae6'
      },
      [CHAINS.ARBITRUM]: {
        address: '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f',
        isNative: false,
        chainlinkFeed: '0x6ce185860a4963106506C203335A2910413708e9'
      }
    },
    
    fallback: {
      providers: [PRICE_PROVIDERS.COINGECKO, PRICE_PROVIDERS.DEX],
      cacheTimeout: 300000,
      stalePriceThreshold: 1800000,
      circuitBreaker: {
        enabled: true,
        threshold: 0.1,
        cooldown: 300000
      }
    }
  },

  // Cross-Chain USDT (from wallet structure)
  CROSSCHAIN_USDT: {
    symbol: 'CROSS-USDT',
    name: 'Cross-Chain USDT',
    decimals: 6,
    coingeckoId: 'tether',
    category: 'crosschain',
    providers: [PRICE_PROVIDERS.CHAINLINK, PRICE_PROVIDERS.COINGECKO],
    primaryProvider: PRICE_PROVIDERS.CHAINLINK,
    updateInterval: UPDATE_INTERVALS.NORMAL,
    isStable: true,
    
    chains: {
      [CHAINS.ETHEREUM]: {
        address: '0xcc1b99dDAc1a33c201a742A1851662E87BC7f22C',
        isNative: false,
        chainlinkFeed: '0x3E7d1eAB13ad0104d2750B8863b489D65364e32D'
      },
      [CHAINS.BSC]: {
        address: '0xcc1b99dDAc1a33c201a742A1851662E87BC7f22C',
        isNative: false,
        chainlinkFeed: '0xB97Ad0E74fa7d920791E90258A6E2085088b4320'
      },
      [CHAINS.POLYGON]: {
        address: '0xcc1b99dDAc1a33c201a742A1851662E87BC7f22C',
        isNative: false,
        chainlinkFeed: '0x0A6513e40db6EB1b165753AD52E80663aeA50545'
      },
      [CHAINS.ARBITRUM]: {
        address: '0xcc1b99dDAc1a33c201a742A1851662E87BC7f22C',
        isNative: false,
        chainlinkFeed: '0x3f3f5dF88dC9F13eac63DF89EC16ef6e7E25DdE7'
      },
      [CHAINS.OPTIMISM]: {
        address: '0xcc1b99dDAc1a33c201a742A1851662E87BC7f22C',
        isNative: false,
        chainlinkFeed: '0x16a9FA2FDa030272Ce99B29CF780dFA30361E0f3'
      },
      [CHAINS.AVALANCHE]: {
        address: '0xcc1b99dDAc1a33c201a742A1851662E87BC7f22C',
        isNative: false,
        chainlinkFeed: '0xEBE676ee90Fe1112671f19b6B7459bC678B67e8a'
      }
    },
    
    fallback: {
      providers: [PRICE_PROVIDERS.COINGECKO],
      cacheTimeout: 600000,
      stalePriceThreshold: 7200000,
      circuitBreaker: {
        enabled: true,
        threshold: 0.05,
        cooldown: 300000
      }
    }
  }
};

// Price aggregation strategies
const AGGREGATION_STRATEGIES = {
  WEIGHTED_AVERAGE: 'weighted_average',
  MEDIAN: 'median',
  VOLUME_WEIGHTED: 'volume_weighted',
  LIQUIDITY_WEIGHTED: 'liquidity_weighted',
  CHAINLINK_PRIORITY: 'chainlink_priority'
};

// Price validation rules
const PRICE_VALIDATION = {
  maxDeviationPercent: 10, // Max 10% deviation from median
  minProviders: 2, // Minimum 2 providers for validation
  maxStaleness: 1800000, // 30 minutes max staleness
  circuitBreakerThreshold: 0.15, // 15% circuit breaker
  minLiquidity: 10000, // Minimum $10k liquidity for DEX prices
  maxSlippage: 0.05 // 5% max slippage for DEX quotes
};

// Enhanced price feeds configuration
const CHAINLINK_FEEDS = {
  [CHAINS.ETHEREUM]: {
    'ETH/USD': '0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419',
    'BTC/USD': '0xF4030086522a5bEEa4988F8cA5B36dbC97BeE88c',
    'USDC/USD': '0x8fFfFfd4AfB6115b954Bd326cbe7B4BA576818f6',
    'USDT/USD': '0x3E7d1eAB13ad0104d2750B8863b489D65364e32D',
    'DAI/USD': '0xAed0c38402a5d19df6E4c03F4E2DceD6e29c1ee9',
    'MATIC/USD': '0x7bAC85A8a13A4BcD8abb3eB7d6b4d632c5a57676',
    'AVAX/USD': '0xFF3EEb22B5E3dE6e705b44749C2559d704923FD7',
    'BNB/USD': '0x14e613AC84a31f709eadbdF89C6CC390fDc9540A'
  },
  [CHAINS.BSC]: {
    'BNB/USD': '0x0567F2323251f0Aab15c8dFb1967E4e8A7D42aeE',
    'USDT/USD': '0xB97Ad0E74fa7d920791E90258A6E2085088b4320',
    'USDC/USD': '0x51597f405303C4377E36123cBc172b13269EA163',
    'ETH/USD': '0x9ef1B8c0E4F7dc8bF5719Ea496883DC6401d5b2e',
    'BTC/USD': '0x264990fbd0A4796A3E3d8E37C4d5F87a3aCa5Ebf'
  },
  [CHAINS.POLYGON]: {
    'MATIC/USD': '0xAB594600376Ec9fD91F8e885dADF0CE036862dE0',
    'ETH/USD': '0xF9680D99D6C9589e2a93a78A04A279e509205945',
    'USDC/USD': '0xfE4A8cc5b5B2366C1B58Bea3858e81843581b2F7',
    'USDT/USD': '0x0A6513e40db6EB1b165753AD52E80663aeA50545',
    'DAI/USD': '0x4746DeC9e833A82EC7C2C1356372CcF2cfcD2F3D',
    'WBTC/USD': '0xDE31F8bFBD8c84b5360CFacCa3539B938dd78ae6'
  },
  [CHAINS.ARBITRUM]: {
    'ETH/USD': '0x639Fe6ab55C921f74e7fac1ee960C0B6293ba612',
    'USDC/USD': '0x50834F3163758fcC1Df9973b6e91f0F0F0434aD3',
    'USDT/USD': '0x3f3f5dF88dC9F13eac63DF89EC16ef6e7E25DdE7',
    'DAI/USD': '0xc5C8E77B397E531B8EC06BFb0048328B30E9eCfB',
    'WBTC/USD': '0x6ce185860a4963106506C203335A2910413708e9'
  },
  [CHAINS.OPTIMISM]: {
    'ETH/USD': '0x13e3Ee699D1909E989722E753853AE30b17e08c5',
    'USDC/USD': '0x16a9FA2FDa030272Ce99B29CF780dFA30361E0f3'
  },
  [CHAINS.AVALANCHE]: {
    'AVAX/USD': '0x0A77230d17318075983913bC2145DB16C7366156',
    'USDC/USD': '0xF096872672F44d6EBA71458D74fe67F9a77419e0',
    'USDT/USD': '0xEBE676ee90Fe1112671f19b6B7459bC678B67e8a'
  },
  [CHAINS.BASE]: {
    'ETH/USD': '0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70',
    'USDC/USD': '0x7e860098F58bBFC8648a4311b374B1D669a2bc6B'
  }
};

// API endpoints configuration
const API_ENDPOINTS = {
  [PRICE_PROVIDERS.COINGECKO]: {
    baseUrl: 'https://api.coingecko.com/api/v3',
    endpoints: {
      price: '/simple/price',
      history: '/coins/{id}/history',
      market: '/coins/{id}/market_chart'
    },
    rateLimit: {
      requests: 50,
      window: 60000 // 1 minute
    }
  },
  [PRICE_PROVIDERS.BINANCE]: {
    baseUrl: 'https://api.binance.com/api/v3',
    endpoints: {
      ticker: '/ticker/price',
      klines: '/klines',
      depth: '/depth'
    },
    rateLimit: {
      requests: 1200,
      window: 60000
    }
  },
  [PRICE_PROVIDERS.COINBASE]: {
    baseUrl: 'https://api.exchange.coinbase.com',
    endpoints: {
      ticker: '/products/{symbol}/ticker',
      candles: '/products/{symbol}/candles'
    },
    rateLimit: {
      requests: 10,
      window: 1000
    }
  }
};

// Export all configurations
module.exports = {
  PRICE_PROVIDERS,
  UPDATE_INTERVALS,
  FEED_TYPES,
  DEX_CONFIGS,
  PRICE_CONFIG,
  AGGREGATION_STRATEGIES,
  PRICE_VALIDATION,
  CHAINLINK_FEEDS,
  API_ENDPOINTS
};
