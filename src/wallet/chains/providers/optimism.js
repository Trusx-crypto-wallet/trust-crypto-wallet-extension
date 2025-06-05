export const optimismMainnetConfig = {
  chainId: 10,
  networkName: 'Optimism',
  symbol: 'ETH',
  rpcUrls: [
    'https://mainnet.optimism.io',
    'https://rpc.ankr.com/optimism',
    'https://optimism-mainnet.public.blastapi.io'
  ],
  explorer: {
    baseUrl: 'https://optimistic.etherscan.io',
    txPath: '/tx/',
    addressPath: '/address/'
  }
};

export const optimismTestnetConfig = {
  chainId: 420,
  networkName: 'Optimism Goerli',
  symbol: 'ETH',
  rpcUrls: [
    'https://goerli.optimism.io',
    'https://rpc.ankr.com/optimism_goerli',
    'https://optimism-goerli.public.blastapi.io'
  ],
  explorer: {
    baseUrl: 'https://goerli-optimism.etherscan.io',
    txPath: '/tx/',
    addressPath: '/address/'
  }
};

export function getOptimismRpc(env) {
  if (env === 'mainnet') {
    return optimismMainnetConfig.rpcUrls[0];
  } else if (env === 'testnet') {
    return optimismTestnetConfig.rpcUrls[0];
  } else {
    throw new Error(`Unknown environment: ${env}`);
  }
}
