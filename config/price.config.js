// config/price.config.js
// ------------------------------------------------------------
// Canonical price‑feed configuration for supported chains.
// Imports:
//  * CHAIN_IDS – numeric IDs defined in token.config.js
//  * PRICE_FEEDS – on‑chain feed addresses from priceFeeds.js
// ------------------------------------------------------------

import { CHAIN_IDS }   from './token.config.js';
import { PRICE_FEEDS } from './priceFeeds.js';

// ------------------------------------------------------------
// Per‑chain default token lists (symbols only, order implied priority)
// ------------------------------------------------------------
const DEFAULT_TOKENS = Object.freeze({
  [CHAIN_IDS.ETHEREUM]: [
    'ETH', 'WETH', 'USDC', 'DAI', 'WBTC', 'UNI', 'AAVE', 'USDT'
  ],

  [CHAIN_IDS.POLYGON]: [
    'MATIC', 'WETH', 'USDC', 'DAI'
  ],

  [CHAIN_IDS.BSC]: [
    'BNB', 'WBNB', 'USDC', 'USDT'
  ],

  [CHAIN_IDS.ARBITRUM]: [
    'ARB', 'WETH', 'USDC'
  ],

  [CHAIN_IDS.AVALANCHE]: [
    'AVAX', 'WAVAX', 'USDC'
  ],

  [CHAIN_IDS.OPTIMISM]: [
    'OP', 'WETH', 'USDC'
  ]
});

// ------------------------------------------------------------
// Build PRICE_CONFIG: { chainId: { tokens: [...], feeds: {symbol: address} } }
// Only on‑chain (Chainlink) feeds are included via PRICE_FEEDS.
// ------------------------------------------------------------
export const PRICE_CONFIG = Object.freeze(
  Object.fromEntries(
    Object.entries(DEFAULT_TOKENS).map(([chainId, symbols]) => {
      const feeds = Object.fromEntries(
        symbols.map((s) => [s, PRICE_FEEDS?.[chainId]?.[s] || null])
      );
      return [Number(chainId), { tokens: symbols, feeds }];
    })
  )
);
