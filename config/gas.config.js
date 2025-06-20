// config/gas.config.js
// ------------------------------------------------------------
// Static gas-policy table the wallet can use before
// it is able to query on-chain gas oracles.
// Units:
//   • gasPrice  → gwei
//   • gasLimits → raw gas units
// ------------------------------------------------------------

import { CHAIN_IDS } from './token.config.js';

export const GAS_CONFIGURATIONS = Object.freeze({
  /* ─────────── Mainnets ─────────── */

  [CHAIN_IDS.ETHEREUM]: {
    gasPrice: { min:  5,  default: 30,  max: 120 },  // EIP-1559 tip not included
    gasLimits: {
      transfer:            21_000,
      tokenTransfer:       65_000,
      contractInteraction: 200_000
    }
  },

  [CHAIN_IDS.POLYGON]: {
    gasPrice: { min:  2,  default: 40,  max: 200 },
    gasLimits: {
      transfer:            21_000,
      tokenTransfer:       55_000,
      contractInteraction: 150_000
    }
  },

  [CHAIN_IDS.BSC]: {
    gasPrice: { min:  3,  default: 5,   max: 30  },
    gasLimits: {
      transfer:            21_000,
      tokenTransfer:       60_000,
      contractInteraction: 180_000
    }
  },

  [CHAIN_IDS.ARBITRUM]: {
    gasPrice: { min:  0.05, default: 0.2, max: 1 },  // Arbitrum uses very low gwei
    gasLimits: {
      transfer:            21_000,
      tokenTransfer:       50_000,
      contractInteraction: 140_000
    }
  },

  [CHAIN_IDS.AVALANCHE]: {
    gasPrice: { min:  25, default: 50, max: 225 },
    gasLimits: {
      transfer:            21_000,
      tokenTransfer:       60_000,
      contractInteraction: 180_000
    }
  },

  [CHAIN_IDS.OPTIMISM]: {
    gasPrice: { min:  0.01, default: 0.1, max: 0.5 },
    gasLimits: {
      transfer:            21_000,
      tokenTransfer:       50_000,
      contractInteraction: 140_000
    }
  },

  /* ─────────── Testnets ─────────── */

  [CHAIN_IDS.ETHEREUM_SEPOLIA]: {
    gasPrice: { min:  1, default: 10, max: 50 },
    gasLimits: {
      transfer:            21_000,
      tokenTransfer:       65_000,
      contractInteraction: 200_000
    }
  },

  [CHAIN_IDS.ARBITRUM_SEPOLIA]: {
    gasPrice: { min: 0.02, default: 0.05, max: 0.3 },
    gasLimits: {
      transfer:            21_000,
      tokenTransfer:       50_000,
      contractInteraction: 140_000
    }
  },

  [CHAIN_IDS.OPTIMISM_SEPOLIA]: {
    gasPrice: { min: 0.005, default: 0.02, max: 0.1 },
    gasLimits: {
      transfer:            21_000,
      tokenTransfer:       50_000,
      contractInteraction: 140_000
    }
  },

  [CHAIN_IDS.BSC_TESTNET]: {
    gasPrice: { min: 1, default: 3, max: 15 },
    gasLimits: {
      transfer:            21_000,
      tokenTransfer:       60_000,
      contractInteraction: 180_000
    }
  },

  [CHAIN_IDS.AVALANCHE_FUJI]: {
    gasPrice: { min: 25, default: 40, max: 150 },
    gasLimits: {
      transfer:            21_000,
      tokenTransfer:       60_000,
      contractInteraction: 180_000
    }
  },

  [CHAIN_IDS.POLYGON_AMOY]: {
    gasPrice: { min: 2, default: 8, max: 40 },
    gasLimits: {
      transfer:            21_000,
      tokenTransfer:       55_000,
      contractInteraction: 150_000
    }
  }
});
