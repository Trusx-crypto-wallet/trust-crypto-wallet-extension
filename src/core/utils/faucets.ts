import {
  celoAlfajores,
  fantomTestnet,
  filecoinCalibration,
  gnosisChiado,
  immutableZkEvmTestnet,
  lightlinkPegasus,
  lineaSepolia,
  mantaSepoliaTestnet,
  mantleSepoliaTestnet,
  modeTestnet,
  moonbaseAlpha,
  opBNBTestnet,
  palmTestnet,
  polygonZkEvmCardona,
  polygonZkEvmTestnet,
  scrollSepolia,
} from 'viem/chains';

import { useNetworkStore } from '~/core/state/networks/networks';
import { ChainId } from '~/core/types/chains';

/**
 * @deprecated - DO NOT USE THIS DIRECTLY.
 * Use `getFaucetsUrl` instead below.
 */
export const FALLBACK_FAUCETS = {
  [ChainId.sepolia]: 'https://sepoliafaucet.com',
  [ChainId.holesky]: 'https://faucet.quicknode.com/ethereum/holesky',
  [ChainId.optimismSepolia]: 'https://app.optimism.io/faucet',
  [ChainId.bscTestnet]: 'https://bnbchain.org/en/testnet-faucet',
  [ChainId.arbitrumSepolia]: 'https://faucet.quicknode.com/arbitrum/sepolia',
  [ChainId.baseSepolia]: 'https://app.optimism.io/faucet',
  [ChainId.zoraSepolia]: 'https://app.optimism.io/faucet',
  [ChainId.avalancheFuji]: 'https://faucet.quicknode.com/avalanche/fuji',
  [ChainId.blastSepolia]: 'https://faucet.quicknode.com/blast/sepolia',
  [ChainId.polygonAmoy]: 'https://faucet.polygon.technology',
  [ChainId.apechainCurtis]: 'https://curtis.hub.caldera.xyz/',
  [ChainId.inkSepolia]: 'https://inkonchain.com/faucet',
  [ChainId.berachainbArtio]: 'https://bartio.faucet.berachain.com',
  [celoAlfajores.id]: 'https://faucet.celo.org/alfajores',
  [fantomTestnet.id]: 'https://faucet.fantom.network',
  [filecoinCalibration.id]: 'https://beryx.io/faucet',
  [gnosisChiado.id]: 'https://faucet.chiadochain.net',
  [immutableZkEvmTestnet.id]: 'https://hub.immutable.com/faucet',
  [lightlinkPegasus.id]: 'https://faucet.pegasus.lightlink.io',
  [lineaSepolia.id]: 'https://www.infura.io/faucet/linea',
  [mantaSepoliaTestnet.id]:
    'https://pacific-info.sepolia-testnet.manta.network',
  [mantleSepoliaTestnet.id]: 'https://faucet.testnet.mantle.xyz',
  [modeTestnet.id]: 'https://docs.mode.network/tools/testnet-faucets',
  [moonbaseAlpha.id]: 'https://faucet.moonbeam.network',
  [opBNBTestnet.id]: 'https://www.l2faucet.com/opbnb',
  [palmTestnet.id]: 'https://docs.palm.io/get-started/tokens',
  [polygonZkEvmCardona.id]: 'https://faucet.polygon.technology',
  [polygonZkEvmTestnet.id]: 'https://faucet.polygon.technology',
  [ChainId.gravitySepolia]:
    'https://thirdweb.com/gravity-alpha-testnet-sepolia',
  1992: 'https://sanko-arb-sepolia.hub.caldera.xyz', // testnet faucet for sanko
  [scrollSepolia.id]: 'https://faucet.quicknode.com/scroll/sepolia',
  1123: 'https://bsquared.network/faucet',
  28882: 'https://l2faucet.com',
  7701: 'https://cantofaucet.com',
  1918988905: 'https://testnet.rarichain.org/faucet',
  59902: 'https://docs.metis.io/dev/readme/getting-test-tokens',
  686868:
    'https://docs.merlinchain.io/merlin-docs/developers/builder-guides/networks/testnet#testnet-faucet',
  568: 'https://faucet.dogechain.dog',
  2024115: 'https://dogechain-demo.caldera.dev/faucet',
  63: 'https://easy.hebeswap.com/#/faucet',
} as const;

export const getFaucetsUrl = (chainId: number): string | undefined => {
  const backendDrivenFaucet = useNetworkStore
    .getState()
    .getSupportedCustomNetworkTestnetFaucet(chainId);
  if (backendDrivenFaucet) return backendDrivenFaucet;

  return FALLBACK_FAUCETS[chainId];
};
