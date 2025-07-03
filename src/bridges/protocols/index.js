/**
 * Protocol exports for cross-chain bridge implementations
 * Provides unified interface for all supported bridge protocols
 */

// Import all protocol implementations
import LayerZeroBridge from './layerzero-bridge.js';
import WormholeBridge from './wormhole-bridge.js';
import AxelarBridge from './axelar-bridge.js';
import HyperlaneBridge from './hyperlane-bridge.js';
import MultichainBridge from './multichain-bridge.js';
import ChainlinkBridge from './chainlink-bridge.js';
import HopBridge from './hop-bridge.js';
import AcrossBridge from './across-bridge.js';

/**
 * Protocol registry with metadata
 */
export const PROTOCOLS = {
  layerzero: {
    name: 'LayerZero',
    class: LayerZeroBridge,
    description: 'Omnichain interoperability protocol',
    website: 'https://layerzero.network',
    documentation: 'https://layerzero.gitbook.io',
    type: 'messaging',
    security: 'oracle_relayer',
    supportedChains: [
      'ethereum', 'polygon', 'bsc', 'avalanche', 'arbitrum', 
      'optimism', 'fantom', 'aptos', 'solana'
    ],
    features: [
      'omnichain_fungible_tokens',
      'omnichain_nft',
      'generic_messaging',
      'gas_abstraction'
    ],
    fees: {
      type: 'dynamic',
      baseFee: true,
      gasOnDestination: true
    },
    trustModel: 'hybrid', // Oracle + Relayer
    maturity: 'production'
  },

  wormhole: {
    name: 'Wormhole',
    class: WormholeBridge,
    description: 'Generic message passing protocol',
    website: 'https://wormhole.com',
    documentation: 'https://docs.wormhole.com',
    type: 'messaging',
    security: 'guardian_network',
    supportedChains: [
      'ethereum', 'solana', 'terra', 'bsc', 'polygon', 
      'avalanche', 'oasis', 'algorand', 'aurora', 'fantom',
      'karura', 'acala', 'klaytn', 'celo', 'near', 'aptos', 'sui'
    ],
    features: [
      'token_bridge',
      'nft_bridge',
      'generic_messaging',
      'cross_chain_governance'
    ],
    fees: {
      type: 'fixed',
      baseFee: true,
      gasOnDestination: false
    },
    trustModel: 'validator_set', // Guardian network
    maturity: 'production'
  },

  axelar: {
    name: 'Axelar',
    class: AxelarBridge,
    description: 'Decentralized cross-chain communication network',
    website: 'https://axelar.network',
    documentation: 'https://docs.axelar.dev',
    type: 'network',
    security: 'proof_of_stake',
    supportedChains: [
      'ethereum', 'polygon', 'avalanche', 'fantom', 'moonbeam',
      'bsc', 'terra', 'cosmos', 'osmosis', 'juno', 'secret',
      'kujira', 'injective', 'crescent', 'kava'
    ],
    features: [
      'general_message_passing',
      'token_transfers',
      'smart_contract_calls',
      'governance'
    ],
    fees: {
      type: 'dynamic',
      baseFee: true,
      gasOnDestination: true,
      executionFee: true
    },
    trustModel: 'proof_of_stake',
    maturity: 'production'
  },

  hyperlane: {
    name: 'Hyperlane',
    class: HyperlaneBridge,
    description: 'Permissionless interoperability layer',
    website: 'https://hyperlane.xyz',
    documentation: 'https://docs.hyperlane.xyz',
    type: 'infrastructure',
    security: 'modular_security',
    supportedChains: [
      'ethereum', 'polygon', 'avalanche', 'bsc', 'arbitrum',
      'optimism', 'gnosis', 'milkomeda', 'moonbeam', 'celo'
    ],
    features: [
      'permissionless_deployment',
      'modular_security',
      'generic_messaging',
      'custom_validation'
    ],
    fees: {
      type: 'dynamic',
      baseFee: true,
      gasOnDestination: true
    },
    trustModel: 'modular', // Configurable security modules
    maturity: 'production'
  },

  multichain: {
    name: 'Multichain',
    class: MultichainBridge,
    description: 'Cross-chain router protocol (formerly Anyswap)',
    website: 'https://multichain.org',
    documentation: 'https://docs.multichain.org',
    type: 'bridge',
    security: 'mpc_network',
    supportedChains: [
      'ethereum', 'bsc', 'polygon', 'fantom', 'avalanche',
      'arbitrum', 'optimism', 'moonriver', 'moonbeam', 'harmony',
      'xdai', 'okex', 'heco', 'kcc', 'cronos', 'boba', 'metis'
    ],
    features: [
      'cross_chain_swaps',
      'liquidity_pools',
      'bridge_aggregation',
      'router_functionality'
    ],
    fees: {
      type: 'percentage',
      baseFee: true,
      liquidityFee: true
    },
    trustModel: 'mpc', // Multi-party computation
    maturity: 'production'
  },

  chainlink: {
    name: 'Chainlink CCIP',
    class: ChainlinkBridge,
    description: 'Cross-Chain Interoperability Protocol',
    website: 'https://chain.link',
    documentation: 'https://docs.chain.link/ccip',
    type: 'messaging',
    security: 'oracle_network',
    supportedChains: [
      'ethereum', 'polygon', 'avalanche', 'bsc', 'arbitrum',
      'optimism', 'base'
    ],
    features: [
      'arbitrary_messaging',
      'token_transfers',
      'programmable_token_transfers',
      'risk_management'
    ],
    fees: {
      type: 'dynamic',
      baseFee: true,
      gasOnDestination: true,
      premiumFee: true
    },
    trustModel: 'oracle_network',
    maturity: 'beta'
  },

  hop: {
    name: 'Hop Protocol',
    class: HopBridge,
    description: 'Scalable rollup-to-rollup general token bridge',
    website: 'https://hop.exchange',
    documentation: 'https://docs.hop.exchange',
    type: 'bridge',
    security: 'optimistic_verification',
    supportedChains: [
      'ethereum', 'polygon', 'arbitrum', 'optimism', 
      'gnosis', 'nova'
    ],
    features: [
      'fast_withdrawals',
      'liquidity_provisioning',
      'amm_based',
      'rollup_native'
    ],
    fees: {
      type: 'dynamic',
      baseFee: true,
      bonderFee: true,
      destinationTxFee: true
    },
    trustModel: 'optimistic', // Bonder + challenge period
    maturity: 'production'
  },

  across: {
    name: 'Across Protocol',
    class: AcrossBridge,
    description: 'Optimistic cross-chain bridge',
    website: 'https://across.to',
    documentation: 'https://docs.across.to',
    type: 'bridge',
    security: 'optimistic_verification',
    supportedChains: [
      'ethereum', 'polygon', 'arbitrum', 'optimism', 'boba'
    ],
    features: [
      'intent_based_bridging',
      'fast_bridging',
      'capital_efficient',
      'uma_optimistic_oracle'
    ],
    fees: {
      type: 'dynamic',
      baseFee: true,
      relayerFee: true,
      lpFee: true
    },
    trustModel: 'optimistic', // UMA oracle + challenge period
    maturity: 'production'
  }
};

/**
 * Get protocol class by name
 */
export function getProtocol(protocolName) {
  const protocol = PROTOCOLS[protocolName.toLowerCase()];
  return protocol ? protocol.class : null;
}

/**
 * Get protocol metadata by name
 */
export function getProtocolMetadata(protocolName) {
  const protocol = PROTOCOLS[protocolName.toLowerCase()];
  if (!protocol) return null;
  
  const { class: _, ...metadata } = protocol;
  return metadata;
}

/**
 * Get all supported protocol names
 */
export function getSupportedProtocols() {
  return Object.keys(PROTOCOLS);
}

/**
 * Get protocols that support specific chain
 */
export function getProtocolsForChain(chainName) {
  return Object.entries(PROTOCOLS)
    .filter(([_, protocol]) => protocol.supportedChains.includes(chainName.toLowerCase()))
    .map(([name, _]) => name);
}

/**
 * Get protocols that support specific chain pair
 */
export function getProtocolsForChainPair(sourceChain, targetChain) {
  return Object.entries(PROTOCOLS)
    .filter(([_, protocol]) => 
      protocol.supportedChains.includes(sourceChain.toLowerCase()) &&
      protocol.supportedChains.includes(targetChain.toLowerCase())
    )
    .map(([name, _]) => name);
}

/**
 * Get protocols by type
 */
export function getProtocolsByType(type) {
  return Object.entries(PROTOCOLS)
    .filter(([_, protocol]) => protocol.type === type)
    .map(([name, _]) => name);
}

/**
 * Get protocols by maturity level
 */
export function getProtocolsByMaturity(maturity) {
  return Object.entries(PROTOCOLS)
    .filter(([_, protocol]) => protocol.maturity === maturity)
    .map(([name, _]) => name);
}

/**
 * Get protocols by trust model
 */
export function getProtocolsByTrustModel(trustModel) {
  return Object.entries(PROTOCOLS)
    .filter(([_, protocol]) => protocol.trustModel === trustModel)
    .map(([name, _]) => name);
}

/**
 * Check if protocol supports specific feature
 */
export function protocolSupportsFeature(protocolName, feature) {
  const protocol = PROTOCOLS[protocolName.toLowerCase()];
  return protocol ? protocol.features.includes(feature) : false;
}

/**
 * Get recommended protocols for chain pair based on various factors
 */
export function getRecommendedProtocols(sourceChain, targetChain, options = {}) {
  const {
    prioritize = 'security', // 'security', 'speed', 'cost', 'decentralization'
    excludeMaturity = [], // ['beta', 'alpha']
    requiredFeatures = [], // ['generic_messaging', 'nft_bridge']
    maxProtocols = 3
  } = options;

  let candidates = getProtocolsForChainPair(sourceChain, targetChain);
  
  // Filter by maturity
  if (excludeMaturity.length > 0) {
    candidates = candidates.filter(protocol => 
      !excludeMaturity.includes(PROTOCOLS[protocol].maturity)
    );
  }
  
  // Filter by required features
  if (requiredFeatures.length > 0) {
    candidates = candidates.filter(protocol => 
      requiredFeatures.every(feature => protocolSupportsFeature(protocol, feature))
    );
  }
  
  // Sort by prioritization criteria
  candidates.sort((a, b) => {
    const protocolA = PROTOCOLS[a];
    const protocolB = PROTOCOLS[b];
    
    switch (prioritize) {
      case 'security':
        // Prefer proof-of-stake over oracle networks over MPC
        const securityScore = { proof_of_stake: 3, oracle_network: 2, mpc: 1, optimistic: 1, hybrid: 2, modular: 2 };
        return (securityScore[protocolB.trustModel] || 0) - (securityScore[protocolA.trustModel] || 0);
      
      case 'speed':
        // Prefer messaging protocols and optimistic bridges
        if (protocolA.type === 'messaging' && protocolB.type !== 'messaging') return -1;
        if (protocolB.type === 'messaging' && protocolA.type !== 'messaging') return 1;
        return 0;
      
      case 'cost':
        // Prefer fixed fees over dynamic fees
        if (protocolA.fees.type === 'fixed' && protocolB.fees.type !== 'fixed') return -1;
        if (protocolB.fees.type === 'fixed' && protocolA.fees.type !== 'fixed') return 1;
        return 0;
      
      case 'decentralization':
        // Prefer proof-of-stake and avoid MPC
        if (protocolA.trustModel === 'proof_of_stake' && protocolB.trustModel !== 'proof_of_stake') return -1;
        if (protocolB.trustModel === 'proof_of_stake' && protocolA.trustModel !== 'proof_of_stake') return 1;
        if (protocolA.trustModel === 'mpc') return 1;
        if (protocolB.trustModel === 'mpc') return -1;
        return 0;
      
      default:
        return 0;
    }
  });
  
  return candidates.slice(0, maxProtocols);
}

/**
 * Export protocol classes for direct import
 */
export {
  LayerZeroBridge as layerzero,
  WormholeBridge as wormhole,
  AxelarBridge as axelar,
  HyperlaneBridge as hyperlane,
  MultichainBridge as multichain,
  ChainlinkBridge as chainlink,
  HopBridge as hop,
  AcrossBridge as across
};

/**
 * Export all protocols as default
 */
export default {
  layerzero: LayerZeroBridge,
  wormhole: WormholeBridge,
  axelar: AxelarBridge,
  hyperlane: HyperlaneBridge,
  multichain: MultichainBridge,
  chainlink: ChainlinkBridge,
  hop: HopBridge,
  across: AcrossBridge
};

/**
 * Protocol validation utilities
 */
export const ProtocolUtils = {
  /**
   * Validate protocol configuration
   */
  validateProtocolConfig(protocolName, config) {
    const protocol = PROTOCOLS[protocolName.toLowerCase()];
    if (!protocol) {
      throw new Error(`Unknown protocol: ${protocolName}`);
    }
    
    // Basic validation - extend based on protocol requirements
    const requiredFields = ['rpcUrls', 'contractAddresses'];
    for (const field of requiredFields) {
      if (!config[field]) {
        throw new Error(`Missing required config field: ${field}`);
      }
    }
    
    return true;
  },

  /**
   * Get optimal protocol for transaction
   */
  getOptimalProtocol(sourceChain, targetChain, amount, token, preferences = {}) {
    const recommended = getRecommendedProtocols(sourceChain, targetChain, preferences);
    
    // Return the top recommendation with reasoning
    if (recommended.length === 0) {
      throw new Error(`No supported protocols found for ${sourceChain} -> ${targetChain}`);
    }
    
    return {
      protocol: recommended[0],
      alternatives: recommended.slice(1),
      reasoning: `Selected based on ${preferences.prioritize || 'security'} prioritization`
    };
  },

  /**
   * Check protocol health status
   */
  async checkProtocolHealth(protocolName) {
    // This would integrate with actual health check endpoints
    // For now, return mock data
    return {
      protocol: protocolName,
      status: 'healthy',
      uptime: 99.9,
      avgResponseTime: 150,
      lastUpdated: new Date().toISOString()
    };
  }
};

/**
 * Export constants
 */
export const PROTOCOL_TYPES = {
  MESSAGING: 'messaging',
  BRIDGE: 'bridge',
  NETWORK: 'network',
  INFRASTRUCTURE: 'infrastructure'
};

export const TRUST_MODELS = {
  PROOF_OF_STAKE: 'proof_of_stake',
  ORACLE_NETWORK: 'oracle_network',
  MPC: 'mpc',
  OPTIMISTIC: 'optimistic',
  HYBRID: 'hybrid',
  MODULAR: 'modular'
};

export const MATURITY_LEVELS = {
  PRODUCTION: 'production',
  BETA: 'beta',
  ALPHA: 'alpha',
  EXPERIMENTAL: 'experimental'
};
