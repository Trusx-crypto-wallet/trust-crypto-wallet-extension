// config/priceFeeds.js
// ------------------------------------------------------------
// Chainlink price-feed proxy contracts organised by chain.
// Keys = CHAIN_IDS (imported from token.config.js)
// Values = { SYMBOL: aggregatorAddress }
// ------------------------------------------------------------

import { CHAIN_IDS } from './token.config.js';

export const PRICE_FEEDS = Object.freeze({
  /* ─────────── Mainnets ─────────── */

  [CHAIN_IDS.ETHEREUM]: Object.freeze({
    ETH:  '0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419', // ETH / USD
    WETH: '0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419', // wrapped = same feed
    BTC:  '0xF4030086522a5bEEa4988F8cA5B36dbC97BeE88c', // BTC / USD
    WBTC: '0xF4030086522a5bEEa4988F8cA5B36dbC97BeE88c',
    USDC: '0x8fFfFfd4AfB6115b954Bd326cbe7B4BA576818f6',
    USDT: '0x3E7d1eAB13ad0104d2750B8863b489D65364e32D',
    DAI:  '0xAed0c38402a5d19df6E4c03F4E2DceD6e29c1ee9',
    UNI:  '0x553303d460EE0afB37EdFf9bE42922D8FF63220e',
    AAVE: '0x547a514d5e3769680Ce22B2361c10Ea13619e8a9',
    LINK: '0x2c1d072e956AFFC0D435Cb7AC38EF18d24d9127c'
  }),

  [CHAIN_IDS.POLYGON]: Object.freeze({
    MATIC:'0xAB594600376Ec9fD91F8e885dadf0ce036862dE0',
    ETH:  '0xF9680D99D6C9589e2a93a78A04A279e509205945',
    WETH: '0xF9680D99D6C9589e2a93a78A04A279e509205945',
    USDC: '0xfE4A8cc5b5B2366C1B58Bea3858e81843581b2F7',
    USDT: '0x0A6513E40Db6EB1B165753Ad52E80663aea50545',
    DAI:  '0x4746DeC9e833A82EC7C2C1356372CcF2cfcD2F3D',
    WBTC: '0xDE31F8bFBD8c84b5360CFACCa3539B938dd78ae6',
    AAVE: '0x72484B12719E23115761D5DA1646945632979bB6'
  }),

  [CHAIN_IDS.BSC]: Object.freeze({
    BNB:  '0x0567F2323251f0Aab15c8dFb1967E4e8A7D42aeE',
    WBNB: '0x0567F2323251f0Aab15c8dFb1967E4e8A7D42aeE',
    ETH:  '0x9ef1B8c0E4F7dc8bF5719Ea496883DC6401d5b2e',
    BTC:  '0x264990fbd0A4796A3E3d8E37C4d5F87a3aCa5Ebf',
    DOGE: '0x3AB0A0d137D4F946fBB19eecc6e92E64660231C8',
    USDC: '0x51597f405303C4377E36123cBc172b13269EA163',
    USDT: '0xB97Ad0E74fa7d920791E90258A6E2085088b4320',
    DAI:  '0x132d3C0B1D2cEa0BC552588063bdBb210FDeecfA',
    LINK: '0xca236E327F629f9Fc2c30A4E95775EbF0B89fac8'
  }),

  [CHAIN_IDS.ARBITRUM]: Object.freeze({
    ETH:  '0x639Fe6ab55C921f74e7fac1ee960C0B6293ba612',
    WETH: '0x639Fe6ab55C921f74e7fac1ee960C0B6293ba612',
    BTC:  '0x6ce185860a4963106506C203335A2910413708e9',
    ARB:  '0xb2A824043730FE05F3DA2efaFa1CBbe83fa548D6',
    USDC: '0x50834F3163758fcC1Df9973b6e91f0F0F0434aD3',
    USDT: '0x3f3f5dF88dC9F13eac63DF89EC16ef6e7E25DdE7',
    DAI:  '0xc5C8E77B397E531B8EC06BFb0048328B30E9eCfB',
    LINK: '0x86E53CF1B870786351Da77A57575e79CB55812CB',
    UNI:  '0x9C917083fDb403ab5ADbEC26Ee294f6EcAda2720'
  }),

  [CHAIN_IDS.AVALANCHE]: Object.freeze({
    AVAX:  '0x0A77230d17318075983913bC2145DB16C7366156',
    WAVAX: '0x0A77230d17318075983913bC2145DB16C7366156',
    ETH:   '0x976B3D034E162d8bD72D6b9C989d545b839003b0',
    BTC:   '0x2779D32d5166BAaa2B2b658333bA7e6Ec0C65743',
    USDC:  '0xF096872672F44d6EBA71458D74fe67F9a77a23B9', // USDC.e
    USDT:  '0xEBE676ee90Fe1112671f19b6B7459bC678B67e8a',
    DAI:   '0x51D7180edA2260cc4F6e4EebB82FEF5c3c2B8300',
    LINK:  '0x49ccd9ca821EfEab2b98c60dC60F518E765EDe9a',
    AAVE:  '0x3CA13391E9fb38a75330fb28f8cc2eB3D9ceceED'
  }),

  [CHAIN_IDS.OPTIMISM]: Object.freeze({
    ETH:  '0x13e3Ee699D1909E989722E753853AE30b17e08c5',
    WETH: '0x13e3Ee699D1909E989722E753853AE30b17e08c5',
    BTC:  '0xD702DD976Fb76Fffc2D3963D037dfDae5b04E593',
    OP:   '0x0D276FC14719f9292D5C1eA2198673d1f4269246',
    USDC: '0x8f58D7bDAafC9dfF6D2C93f99B4654a5A6f93f2C',
    USDT: '0xECef79E109e997bCA29c1c0897ec9d7b03647F5E',
    DAI:  '0x8dBa75e83DA73cc766A7e5a0ee71F656BAb470d6',
    LINK: '0xCc232dcFAAE6354cE191Bd574108c1aD03f86450',
    UNI:  '0x11429eE838cC01071402f21C219870cbAc0a59A0'
  }),

  /* ─────────── Testnets ─────────── */

  [CHAIN_IDS.ETHEREUM_SEPOLIA]: Object.freeze({
    ETH:  '0x694AA1769357215DE4FAC081bf1f309aDC325306',
    BTC:  '0x1B44F3514812d835EB1BDB0aCB33d3FA3351Ee43',
    USDC: '0xA2F78ab2355fe2f984D808B5CeE7FD0A93D5270E',
    LINK: '0xC59E3633BaAC79493d908E63626716E204A45EdF'
  }),

  [CHAIN_IDS.ARBITRUM_SEPOLIA]: Object.freeze({
    ETH:  '0xd30e2101a97dcbAeBCBC04F14C3f624E67A35165',
    BTC:  '0x56A43EB56Da12C0dc1D972ACb089C06a5dEF8e69',
    USDC: '0x0153002d20B96532C639313c2d54c3dA09109309'
  }),

  [CHAIN_IDS.OPTIMISM_SEPOLIA]: Object.freeze({
    ETH:  '0x61Ec26aA57019C486B10502285c5A3D4A4750AD7',
    BTC:  '0xC16679B963CeB52089aD2d95312A5b85E318e9d2',
    OP:   '0x95630d5C14EbbD8B8645D3988Ce47Fd9bDa8227b'
  }),

  [CHAIN_IDS.BSC_TESTNET]: Object.freeze({
    BNB:  '0x2514895c72f50D8bd4B4F9b1110F0D6bD2c97526',
    ETH:  '0x143dB3CEEfbdfe5631aDD3E50F7614B6ba708BA7',
    BTC:  '0x5741306c21795FdCBb9b265Ea0255F499DFe515C'
  }),

  [CHAIN_IDS.AVALANCHE_FUJI]: Object.freeze({
    AVAX: '0x5498BB86BC934c8D34FDA08E81D444153d0D06aD',
    ETH:  '0x86d67c3D38D2bCeE722E601025C25a575021c6EA',
    BTC:  '0x31CF013A08c6Ac228C94551d535d5BAfE19c602a'
  }),

  [CHAIN_IDS.POLYGON_AMOY]: Object.freeze({
    MATIC:'0x001382149eBa3441043c1c66972b4772963f5D43',
    ETH:  '0xF0d50568e3A7e8259E16663972b11910F89BD8e7',
    BTC:  '0xe5Dc0A609Ab8bCF15d3f35cFaa1Ff40f521173Ea'
  })
});
