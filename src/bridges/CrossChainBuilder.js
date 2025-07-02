/**
 * CrossChainBuilder - Pure transaction building and validation logic
 * Location: src/bridges/CrossChainBuilder.js
 * Focus: Prepare bridge transactions without execution
 */

import { ethers } from 'ethers';
import { BridgeError, ValidationError, UnsupportedProtocolError } from '../errors/BridgeErrors.js';
import logger from '../utils/logger.js';

export default class CrossChainBuilder {
  constructor(config = {}) {
    this.config = {
      // Supported protocols with their configurations
      supportedProtocols: {
        layerzero: {
          name: 'LayerZero',
          type: 'messaging',
          chains: ['ethereum', 'polygon', 'bsc', 'avalanche', 'arbitrum', 'optimism'],
          feeStructure: 'dynamic',
          minAmount: '1000000000000000', // 0.001 ETH
          maxAmount: null,
          gasMultiplier: 1.2,
          baseFee: '2000000000000000' // 0.002 ETH
        },
        
        wormhole: {
          name: 'Wormhole',
          type: 'messaging',
          chains: ['ethereum', 'polygon', 'bsc', 'avalanche', 'arbitrum', 'optimism', 'solana'],
          feeStructure: 'fixed',
          minAmount: '1000000000000000',
          maxAmount: null,
          gasMultiplier: 1.3,
          baseFee: '5000000000000000' // 0.005 ETH
        },
        
        axelar: {
          name: 'Axelar',
          type: 'network',
          chains: ['ethereum', 'polygon', 'avalanche', 'moonbeam', 'bsc'],
          feeStructure: 'dynamic',
          minAmount: '5000000000000000', // 0.005 ETH
          maxAmount: null,
          gasMultiplier: 1.4,
          baseFee: '10000000000000000' // 0.01 ETH
        },
        
        hyperlane: {
          name: 'Hyperlane',
          type: 'infrastructure',
          chains: ['ethereum', 'polygon', 'avalanche', 'bsc', 'arbitrum', 'optimism'],
          feeStructure: 'dynamic',
          minAmount: '2000000000000000',
          maxAmount: null,
          gasMultiplier: 1.15,
          baseFee: '3000000000000000'
        },
        
        multichain: {
          name: 'Multichain',
          type: 'bridge',
          chains: ['ethereum', 'bsc', 'polygon', 'avalanche', 'arbitrum', 'optimism'],
          feeStructure: 'percentage',
          minAmount: '10000000000000000', // 0.01 ETH
          maxAmount: '1000000000000000000000', // 1000 ETH
          feeRate: 0.001, // 0.1%
          gasMultiplier: 1.1
        },
        
        chainlink: {
          name: 'Chainlink CCIP',
          type: 'messaging',
          chains: ['ethereum', 'polygon', 'avalanche', 'bsc', 'arbitrum', 'optimism', 'base'],
          feeStructure: 'dynamic',
          minAmount: '5000000000000000',
          maxAmount: null,
          gasMultiplier: 1.2,
          baseFee: '8000000000000000'
        },
        
        hop: {
          name: 'Hop Protocol',
          type: 'bridge',
          chains: ['ethereum', 'polygon', 'arbitrum', 'optimism', 'gnosis'],
          feeStructure: 'amm_based',
          minAmount: '1000000', // 1 USDC (6 decimals)
          maxAmount: null,
          bonderFeeRate: 0.0025,
          gasMultiplier: 1.1
        },
        
        across: {
          name: 'Across Protocol',
          type: 'bridge',
          chains: ['ethereum', 'polygon', 'arbitrum', 'optimism', 'boba'],
          feeStructure: 'dynamic',
          minAmount: '1000000000000000',
          maxAmount: null,
          gasMultiplier: 1.1,
          relayerFeeRate: 0.0025
        }
      },
      
      // Chain configurations
      chainConfigs: {
        ethereum: {
          chainId: 1,
          gasPrice: '20000000000', // 20 gwei
          blockTime: 13,
          confirmations: 12,
          nativeToken: 'ETH'
        },
        polygon: {
          chainId: 137,
          gasPrice: '30000000000', // 30 gwei
          blockTime: 2,
          confirmations: 128,
          nativeToken: 'MATIC'
        },
        bsc: {
          chainId: 56,
          gasPrice: '5000000000', // 5 gwei
          blockTime: 3,
          confirmations: 15,
          nativeToken: 'BNB'
        },
        avalanche: {
          chainId: 43114,
          gasPrice: '25000000000', // 25 gwei
          blockTime: 2,
          confirmations: 10,
          nativeToken: 'AVAX'
        },
        arbitrum: {
          chainId: 42161,
          gasPrice: '1000000000', // 1 gwei
          blockTime: 1,
          confirmations: 20,
          nativeToken: 'ETH'
        },
        optimism: {
          chainId: 10,
          gasPrice: '1000000000', // 1 gwei
          blockTime: 2,
          confirmations: 20,
          nativeToken: 'ETH'
        }
      },
      
      // Token configurations
      commonTokens: {
        ETH: {
          ethereum: '0x0000000000000000000000000000000000000000', // Native ETH
          polygon: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619',
          bsc: '0x2170Ed0880ac9A755fd29B2688956BD959F933F8',
          avalanche: '0x49D5c2BdFfac6CE2BFdB6640F4F80f226bc10bAB',
          arbitrum: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
          optimism: '0x4200000000000000000000000000000000000006'
        },
        USDT: {
          ethereum: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
          polygon: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
          bsc: '0x55d398326f99059fF775485246999027B3197955',
          avalanche: '0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7',
          arbitrum: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
          optimism: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58'
        },
        BNB: {
          ethereum: '0xB8c77482e45F1F44dE1745F52C74426C631bDD52',
          polygon: '0x3BA4c387f786bFEE076A58914F5Bd38d668B42c3',
          bsc: '0x0000000000000000000000000000000000000000', // Native BNB
          avalanche: '0x264c1383EA520f73dd837F915ef3a732e204a493',
          arbitrum: '0xa9004A5421372E1D83fB1f85b0fc986c912f91f3',
          optimism: '0x3e7eF8f50246f725885102E8238CBba33F276747'
        },
        USDC: {
          ethereum: '0xA0b86a33E6441986c0eD0C5e4c1fE15C6E4E8F1d',
          polygon: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
          bsc: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
          avalanche: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E',
          arbitrum: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8',
          optimism: '0x7F5c764cBc14f9669B88837ca1490cCa17c31607'
        },
        MATIC: {
          ethereum: '0x7D1AfA7B718fb893dB30A3aBc0Cfc608AaCfeBB0',
          polygon: '0x0000000000000000000000000000000000000000', // Native MATIC
          bsc: '0xCC42724C6683B7E57334c4E856f4c9965ED682bD',
          avalanche: '0x3B55E45fD6bd7d4724F5c47E0d1bCaEdd059263e',
          arbitrum: '0x561877b6b3DD7651313794e5F2894B2F18bE0766',
          optimism: '0x81ab7E0D570b01411fcC4afd3D50eC8c241cb74b'
        },
        DAI: {
          ethereum: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
          polygon: '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063',
          bsc: '0x1AF3F329e8BE154074D8769D1FFa4eE058B1DBc3',
          avalanche: '0xd586E7F844cEa2F87f50152665BCbc2C279D8d70',
          arbitrum: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
          optimism: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1'
        },
        UNI: {
          ethereum: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
          polygon: '0xb33EaAd8d922B1083446DC23f610c2567fB5180f',
          bsc: '0xBf5140A22578168FD562DCcF235E5D43A02ce9B1',
          avalanche: '0x8eBAf22B6F053dFFeaf46f4Dd9eFA95D89ba8580',
          arbitrum: '0xFa7F8980b0f1E64A2062791cc3b0871572f1F7f0',
          optimism: '0x6fd9d7AD17242c41f7131d257212c54A0e5a6bb8'
        },
        AAVE: {
          ethereum: '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9',
          polygon: '0xD6DF932A45C0f255f85145f286eA0b292B21C90B',
          bsc: '0xfb6115445Bff7b52FeB98650C87f44907E58f802',
          avalanche: '0x63a72806098Bd3D9520cC43356dD78afe5D386D9',
          arbitrum: '0xba5DdD1f9d7F570dc94a51479a000E3BCE967196',
          optimism: '0x76FB31fb4af56892A25e32cFC43De717950c9278'
        },
        AVAX: {
          ethereum: '0x85f138bfEE4ef8e540890CFb48F620571d67Eda3',
          polygon: '0x2C89bbc92BD86F8075d1DEcc58C7F4E0107f286b',
          bsc: '0x1CE0c2827e2eF14D5C4f29a091d735A204794041',
          avalanche: '0x0000000000000000000000000000000000000000', // Native AVAX
          arbitrum: '0x565609fAF65B92F7be02468acF86f8979423e514',
          optimism: '0x7777777777697ef6Ef10EB3e4BFEd1D6DB50B8Dd'
        },
        ARB: {
          ethereum: '0xB50721BCf8d664c30412Cfbc6cf7a15145234ad1',
          polygon: '0x2760E46d9BB43dafCbecaad1F64b93207F9f0eD7',
          bsc: '0x102C776DDB30C754dEd4fDcc77A19230A60d4e75',
          avalanche: '0x3A7Ca11eEcE7CF7b924478d60C0b50aE18dF2756',
          arbitrum: '0x912CE59144191C1204E64559FE8253a0e49E6548',
          optimism: '0xc7557C73e0eCa2E1BF7348bB6874Aee63C7eFF85'
        },
        OP: {
          ethereum: '0x4200000000000000000000000000000000000042',
          polygon: '0x29e7DF7b6A1B2b07b731457f499E1696c60E2C4e',
          bsc: '0x8c15Ef5b4B21951d50E53E4fbdA8298FFAD25057',
          avalanche: '0x6e2dc0F9DB014aE19888F539E59285D2Ea04244C',
          arbitrum: '0x0000000000000000000000000000000000000000', // Not on Arbitrum
          optimism: '0x4200000000000000000000000000000000000042' // Native OP
        },
        WBTC: {
          ethereum: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
          polygon: '0x1bfd67037b42cf73acf2047067bd4f2c47d9bfd6',
          bsc: '0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c',
          avalanche: '0x50b7545627a5162F82A992c33b87aDc75187B218',
          arbitrum: '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f',
          optimism: '0x68f180fcCe6836688e9084f035309E29Bf0A2095'
        },
        WETH: {
          ethereum: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
          polygon: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619',
          bsc: '0x2170Ed0880ac9A755fd29B2688956BD959F933F8',
          avalanche: '0x49D5c2BdFfac6CE2BFdB6640F4F80f226bc10bAB',
          arbitrum: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
          optimism: '0x4200000000000000000000000000000000000006'
        },
        WBNB: {
          ethereum: '0xB8c77482e45F1F44dE1745F52C74426C631bDD52',
          polygon: '0x3BA4c387f786bFEE076A58914F5Bd38d668B42c3',
          bsc: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
          avalanche: '0x264c1383EA520f73dd837F915ef3a732e204a493',
          arbitrum: '0xa9004A5421372E1D83fB1f85b0fc986c912f91f3',
          optimism: '0x3e7eF8f50246f725885102E8238CBba33F276747'
        },
        WAVAX: {
          ethereum: '0x85f138bfEE4ef8e540890CFb48F620571d67Eda3',
          polygon: '0x2C89bbc92BD86F8075d1DEcc58C7F4E0107f286b',
          bsc: '0x1CE0c2827e2eF14D5C4f29a091d735A204794041',
          avalanche: '0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7',
          arbitrum: '0x565609fAF65B92F7be02468acF86f8979423e514',
          optimism: '0x7777777777697ef6Ef10EB3e4BFEd1D6DB50B8Dd'
        }
      },
      
      // Default gas limits for different operations
      gasLimits: {
        layerzero: {
          send: 500000,
          receive: 300000
        },
        wormhole: {
          attest: 200000,
          transfer: 300000,
          complete: 400000
        },
        axelar: {
          callContract: 500000,
          callContractWithToken: 800000
        },
        hyperlane: {
          dispatch: 300000,
          process: 400000
        },
        multichain: {
          anySwapOut: 300000,
          anySwapOutUnderlying: 400000
        },
        chainlink: {
          ccipSend: 500000,
          ccipReceive: 300000
        },
        hop: {
          sendToL2: 400000,
          swapAndSend: 500000
        },
        across: {
          deposit: 300000,
          fillRelay: 400000
        }
      },
      
      // Protocol selection criteria weights
      selectionWeights: {
        security: 0.3,
        speed: 0.25,
        cost: 0.25,
        reliability: 0.2
      },
      
      ...config
    };
    
    // Internal state
    this.protocolRankings = new Map();
    this.feeCache = new Map();
    this.cacheTimeout = 300000; // 5 minutes
    
    logger.info('CrossChainBuilder initialized', {
      supportedProtocols: Object.keys(this.config.supportedProtocols),
      supportedChains: Object.keys(this.config.chainConfigs)
    });
  }

  /**
   * Validate bridge parameters with comprehensive checks
   */
  validateBridgeParams(params) {
    const requiredFields = ['sourceChain', 'targetChain', 'amount', 'token', 'recipient'];
    const missingFields = requiredFields.filter(field => !params[field]);
    
    if (missingFields.length > 0) {
      throw new ValidationError(`Missing required parameters: ${missingFields.join(', ')}`);
    }

    // Sanitize and validate individual parameters
    this._validateChain(params.sourceChain, 'sourceChain');
    this._validateChain(params.targetChain, 'targetChain');
    this._validateAmount(params.amount);
    this._validateToken(params.token);
    this._validateRecipient(params.recipient);
    
    // Cross-parameter validations
    if (params.sourceChain === params.targetChain) {
      throw new ValidationError('Source and target chains cannot be the same');
    }
    
    // Protocol-specific validations
    if (params.protocol) {
      this._validateProtocolSupport(params.protocol, params.sourceChain, params.targetChain);
    }
    
    // Token support validation
    if (!this.validateTokenSupport(params.token, params.sourceChain, params.targetChain)) {
      throw new ValidationError(`Token ${params.token} not supported for ${params.sourceChain} -> ${params.targetChain} bridge`);
    }
    
    // Amount limits validation
    this._validateAmountLimits(params.amount, params.sourceChain, params.targetChain, params.protocol);
    
    // Optional parameter validations
    if (params.slippage !== undefined) {
      this._validateSlippage(params.slippage);
    }
    
    if (params.deadline !== undefined) {
      this._validateDeadline(params.deadline);
    }
    
    logger.debug('Bridge parameters validated successfully', {
      sourceChain: params.sourceChain,
      targetChain: params.targetChain,
      token: params.token,
      amount: params.amount.toString()
    });
  }

  /**
   * Build complete bridge transaction object
   */
  async buildBridgeTransaction(params) {
    try {
      logger.info('Building bridge transaction', {
        sourceChain: params.sourceChain,
        targetChain: params.targetChain,
        protocol: params.protocol
      });
      
      // Validate all parameters
      this.validateBridgeParams(params);
      
      // Select optimal protocol if not specified
      const protocol = params.protocol || this.selectOptimalProtocol(
        params.sourceChain,
        params.targetChain,
        params.criteria
      );
      
      // Prepare protocol-specific bridge data
      const bridgeData = await this.prepareBridgeData({
        ...params,
        protocol
      });
      
      // Calculate fees
      const fees = await this.calculateBridgeFees({
        ...params,
        protocol
      });
      
      // Estimate gas
      const gasEstimate = await this.estimateGasFees(params.sourceChain, params.targetChain, protocol);
      
      // Build final transaction object
      const transaction = {
        protocol,
        sourceChain: params.sourceChain,
        targetChain: params.targetChain,
        amount: params.amount.toString(),
        token: params.token,
        recipient: params.recipient,
        
        // Transaction data
        to: bridgeData.contractAddress,
        data: bridgeData.calldata,
        value: bridgeData.value || '0',
        
        // Gas configuration
        gasLimit: gasEstimate.gasLimit,
        gasPrice: gasEstimate.gasPrice,
        maxFeePerGas: gasEstimate.maxFeePerGas,
        maxPriorityFeePerGas: gasEstimate.maxPriorityFeePerGas,
        
        // Fee breakdown
        fees: {
          ...fees,
          total: fees.totalFee
        },
        
        // Protocol-specific data
        protocolData: bridgeData.protocolData,
        
        // Metadata
        slippage: params.slippage || 0.005,
        deadline: params.deadline || Date.now() + (30 * 60 * 1000), // 30 minutes
        
        // Transaction metadata
        buildTime: Date.now(),
        estimatedTime: this._estimateTransactionTime(protocol, params.sourceChain, params.targetChain),
        riskLevel: this._assessRiskLevel(params, protocol)
      };
      
      logger.info('Bridge transaction built successfully', {
        protocol,
        totalFee: fees.totalFee,
        gasLimit: gasEstimate.gasLimit,
        estimatedTime: transaction.estimatedTime
      });
      
      return transaction;
      
    } catch (error) {
      logger.error('Failed to build bridge transaction:', error);
      throw new BridgeError('Transaction building failed', 'BUILD_FAILED', {
        error: error.message,
        params
      });
    }
  }

  /**
   * Estimate gas fees for bridge transaction
   */
  async estimateGasFees(fromChain, toChain, protocol = null) {
    try {
      const sourceChainConfig = this.config.chainConfigs[fromChain];
      if (!sourceChainConfig) {
        throw new ValidationError(`Unsupported source chain: ${fromChain}`);
      }
      
      // Select protocol if not provided
      const selectedProtocol = protocol || this.selectOptimalProtocol(fromChain, toChain);
      const protocolConfig = this.config.supportedProtocols[selectedProtocol];
      
      if (!protocolConfig) {
        throw new UnsupportedProtocolError(`Protocol ${selectedProtocol} not supported`);
      }
      
      // Get base gas estimates
      const baseGasLimit = this.config.gasLimits[selectedProtocol]?.send || 300000;
      const gasMultiplier = protocolConfig.gasMultiplier || 1.2;
      const estimatedGasLimit = Math.floor(baseGasLimit * gasMultiplier);
      
      // Calculate gas prices
      const baseGasPrice = BigInt(sourceChainConfig.gasPrice);
      const priorityFee = baseGasPrice / 10n; // 10% priority fee
      const maxFeePerGas = baseGasPrice + priorityFee;
      
      const gasEstimate = {
        gasLimit: estimatedGasLimit.toString(),
        gasPrice: baseGasPrice.toString(),
        maxFeePerGas: maxFeePerGas.toString(),
        maxPriorityFeePerGas: priorityFee.toString(),
        estimatedCost: (baseGasPrice * BigInt(estimatedGasLimit)).toString(),
        currency: sourceChainConfig.nativeToken,
        confidence: 'medium'
      };
      
      logger.debug('Gas fees estimated', {
        fromChain,
        protocol: selectedProtocol,
        gasLimit: gasEstimate.gasLimit,
        gasPrice: gasEstimate.gasPrice
      });
      
      return gasEstimate;
      
    } catch (error) {
      logger.error('Gas fee estimation failed:', error);
      throw new BridgeError('Gas estimation failed', 'GAS_ESTIMATION_FAILED', {
        fromChain,
        toChain,
        protocol,
        error: error.message
      });
    }
  }

  /**
   * Calculate comprehensive bridge fees
   */
  async calculateBridgeFees(params) {
    try {
      const { sourceChain, targetChain, amount, protocol } = params;
      const protocolConfig = this.config.supportedProtocols[protocol];
      
      if (!protocolConfig) {
        throw new UnsupportedProtocolError(`Protocol ${protocol} not supported`);
      }
      
      const bridgeAmount = BigInt(amount.toString());
      let fees = {
        protocol: protocol,
        currency: this.config.chainConfigs[sourceChain].nativeToken
      };
      
      // Calculate protocol-specific fees
      switch (protocolConfig.feeStructure) {
        case 'fixed':
          fees.protocolFee = protocolConfig.baseFee;
          break;
          
        case 'percentage':
          const feeRate = protocolConfig.feeRate || 0.001;
          fees.protocolFee = (bridgeAmount * BigInt(Math.floor(feeRate * 10000)) / 10000n).toString();
          break;
          
        case 'dynamic':
          fees.protocolFee = this._calculateDynamicFee(bridgeAmount, protocolConfig, sourceChain, targetChain);
          break;
          
        case 'amm_based':
          fees = { ...fees, ...this._calculateAMMFees(bridgeAmount, protocolConfig) };
          break;
          
        default:
          fees.protocolFee = protocolConfig.baseFee || '1000000000000000';
      }
      
      // Add gas estimates
      const gasEstimate = await this.estimateGasFees(sourceChain, targetChain, protocol);
      fees.gasFee = gasEstimate.estimatedCost;
      
      // Calculate additional fees
      fees.networkFee = this._calculateNetworkFee(sourceChain, targetChain);
      fees.relayerFee = this._calculateRelayerFee(protocolConfig, bridgeAmount);
      
      // Calculate total
      const totalFee = [
        fees.protocolFee,
        fees.gasFee,
        fees.networkFee || '0',
        fees.relayerFee || '0'
      ].reduce((sum, fee) => sum + BigInt(fee), 0n);
      
      fees.totalFee = totalFee.toString();
      fees.feeRate = Number(totalFee * 10000n / bridgeAmount) / 10000; // As percentage
      
      logger.debug('Bridge fees calculated', {
        protocol,
        totalFee: fees.totalFee,
        feeRate: fees.feeRate,
        breakdown: fees
      });
      
      return fees;
      
    } catch (error) {
      logger.error('Fee calculation failed:', error);
      throw new BridgeError('Fee calculation failed', 'FEE_CALCULATION_FAILED', {
        params,
        error: error.message
      });
    }
  }

  /**
   * Select optimal protocol based on criteria
   */
  selectOptimalProtocol(fromChain, toChain, criteria = {}) {
    try {
      const availableProtocols = this._getAvailableProtocols(fromChain, toChain);
      
      if (availableProtocols.length === 0) {
        throw new UnsupportedProtocolError(`No protocols support ${fromChain} -> ${toChain} bridge`);
      }
      
      if (availableProtocols.length === 1) {
        return availableProtocols[0];
      }
      
      // Score protocols based on criteria
      const scoredProtocols = availableProtocols.map(protocol => ({
        protocol,
        score: this._scoreProtocol(protocol, fromChain, toChain, criteria)
      }));
      
      // Sort by score (highest first)
      scoredProtocols.sort((a, b) => b.score - a.score);
      
      const selectedProtocol = scoredProtocols[0].protocol;
      
      logger.debug('Optimal protocol selected', {
        fromChain,
        toChain,
        selectedProtocol,
        alternatives: scoredProtocols.slice(1, 3).map(p => p.protocol),
        criteria
      });
      
      return selectedProtocol;
      
    } catch (error) {
      logger.error('Protocol selection failed:', error);
      throw new BridgeError('Protocol selection failed', 'PROTOCOL_SELECTION_FAILED', {
        fromChain,
        toChain,
        criteria,
        error: error.message
      });
    }
  }

  /**
   * Prepare protocol-specific bridge data
   */
  async prepareBridgeData(params) {
    try {
      const { protocol, sourceChain, targetChain, amount, token, recipient } = params;
      
      logger.debug('Preparing bridge data', { protocol, sourceChain, targetChain });
      
      switch (protocol) {
        case 'layerzero':
          return this._prepareLayerZeroData(params);
          
        case 'wormhole':
          return this._prepareWormholeData(params);
          
        case 'axelar':
          return this._prepareAxelarData(params);
          
        case 'hyperlane':
          return this._prepareHyperlaneData(params);
          
        case 'multichain':
          return this._prepareMultichainData(params);
          
        case 'chainlink':
          return this._prepareChainlinkData(params);
          
        case 'hop':
          return this._prepareHopData(params);
          
        case 'across':
          return this._prepareAcrossData(params);
          
        default:
          throw new UnsupportedProtocolError(`Protocol ${protocol} not supported`);
      }
      
    } catch (error) {
      logger.error('Bridge data preparation failed:', error);
      throw new BridgeError('Bridge data preparation failed', 'DATA_PREPARATION_FAILED', {
        params,
        error: error.message
      });
    }
  }

  /**
   * Validate token support for bridge route
   */
  validateTokenSupport(token, fromChain, toChain) {
    try {
      // Check if token is in common tokens list
      const isCommonToken = Object.values(this.config.commonTokens).some(tokenAddresses => 
        tokenAddresses[fromChain]?.toLowerCase() === token.toLowerCase() &&
        tokenAddresses[toChain] // Target chain has this token
      );
      
      if (isCommonToken) {
        return true;
      }
      
      // Check if token is a valid address
      if (!ethers.isAddress(token)) {
        return false;
      }
      
      // For now, assume any valid address token can be bridged
      // In production, this would check against protocol-specific token lists
      return true;
      
    } catch (error) {
      logger.error('Token support validation failed:', error);
      return false;
    }
  }

  // ===== PRIVATE VALIDATION METHODS =====

  _validateChain(chain, fieldName) {
    if (!chain || typeof chain !== 'string') {
      throw new ValidationError(`${fieldName} must be a valid string`);
    }
    
    if (!this.config.chainConfigs[chain]) {
      throw new ValidationError(`Unsupported chain: ${chain}`);
    }
  }

  _validateAmount(amount) {
    if (!amount) {
      throw new ValidationError('Amount is required');
    }
    
    // Accept string, number, or bigint
    let parsedAmount;
    try {
      parsedAmount = BigInt(amount.toString());
    } catch (error) {
      throw new ValidationError('Amount must be a valid number');
    }
    
    if (parsedAmount <= 0n) {
      throw new ValidationError('Amount must be greater than 0');
    }
    
    // Check for reasonable upper bound (1 billion ETH equivalent)
    const maxAmount = BigInt('1000000000000000000000000000'); // 1B ETH with 18 decimals
    if (parsedAmount > maxAmount) {
      throw new ValidationError('Amount exceeds maximum limit');
    }
  }

  _validateToken(token) {
    if (!token || typeof token !== 'string') {
      throw new ValidationError('Token address is required');
    }
    
    if (!ethers.isAddress(token)) {
      throw new ValidationError('Invalid token address format');
    }
  }

  _validateRecipient(recipient) {
    if (!recipient || typeof recipient !== 'string') {
      throw new ValidationError('Recipient address is required');
    }
    
    if (!ethers.isAddress(recipient)) {
      throw new ValidationError('Invalid recipient address format');
    }
  }

  _validateSlippage(slippage) {
    if (typeof slippage !== 'number') {
      throw new ValidationError('Slippage must be a number');
    }
    
    if (slippage < 0 || slippage > 0.1) {
      throw new ValidationError('Slippage must be between 0% and 10%');
    }
  }

  _validateDeadline(deadline) {
    if (typeof deadline !== 'number') {
      throw new ValidationError('Deadline must be a timestamp');
    }
    
    if (deadline <= Date.now()) {
      throw new ValidationError('Deadline must be in the future');
    }
    
    // Maximum 24 hours from now
    const maxDeadline = Date.now() + (24 * 60 * 60 * 1000);
    if (deadline > maxDeadline) {
      throw new ValidationError('Deadline cannot be more than 24 hours in the future');
    }
  }

  _validateProtocolSupport(protocol, sourceChain, targetChain) {
    const protocolConfig = this.config.supportedProtocols[protocol];
    if (!protocolConfig) {
      throw new UnsupportedProtocolError(`Protocol ${protocol} not supported`);
    }
    
    if (!protocolConfig.chains.includes(sourceChain)) {
      throw new UnsupportedProtocolError(`Protocol ${protocol} does not support source chain ${sourceChain}`);
    }
    
    if (!protocolConfig.chains.includes(targetChain)) {
      throw new UnsupportedProtocolError(`Protocol ${protocol} does not support target chain ${targetChain}`);
    }
  }

  _validateAmountLimits(amount, sourceChain, targetChain, protocol) {
    if (!protocol) return; // Skip if no protocol specified
    
    const protocolConfig = this.config.supportedProtocols[protocol];
    if (!protocolConfig) return;
    
    const bridgeAmount = BigInt(amount.toString());
    
    if (protocolConfig.minAmount) {
      const minAmount = BigInt(protocolConfig.minAmount);
      if (bridgeAmount < minAmount) {
        throw new ValidationError(`Amount below minimum for ${protocol}: ${protocolConfig.minAmount}`);
      }
    }
    
    if (protocolConfig.maxAmount) {
      const maxAmount = BigInt(protocolConfig.maxAmount);
      if (bridgeAmount > maxAmount) {
        throw new ValidationError(`Amount above maximum for ${protocol}: ${protocolConfig.maxAmount}`);
      }
    }
  }

  // ===== PRIVATE UTILITY METHODS =====

  _getAvailableProtocols(fromChain, toChain) {
    return Object.entries(this.config.supportedProtocols)
      .filter(([_, config]) => 
        config.chains.includes(fromChain) && 
        config.chains.includes(toChain)
      )
      .map(([protocol, _]) => protocol);
  }

  _scoreProtocol(protocol, fromChain, toChain, criteria) {
    const protocolConfig = this.config.supportedProtocols[protocol];
    const weights = { ...this.config.selectionWeights, ...criteria };
    
    let score = 0;
    
    // Security score (based on protocol type and maturity)
    const securityScores = {
      'messaging': 0.9,
      'network': 0.95,
      'bridge': 0.8,
      'infrastructure': 0.85
    };
    score += (securityScores[protocolConfig.type] || 0.7) * weights.security;
    
    // Speed score (inverse of estimated time)
    const speedScore = Math.max(0.1, 1 - (this._estimateTransactionTime(protocol, fromChain, toChain) / 3600));
    score += speedScore * weights.speed;
    
    // Cost score (inverse of gas multiplier)
    const costScore = Math.max(0.1, 2 - (protocolConfig.gasMultiplier || 1.2));
    score += costScore * weights.cost;
    
    // Reliability score (based on protocol maturity)
    const reliabilityScores = {
      'layerzero': 0.9,
      'wormhole': 0.85,
      'axelar': 0.8,
      'multichain': 0.75,
      'chainlink': 0.95,
      'hop': 0.8,
      'across': 0.75,
      'hyperlane': 0.8
    };
    score += (reliabilityScores[protocol] || 0.6) * weights.reliability;
    
    return score;
  }

  _estimateTransactionTime(protocol, fromChain, toChain) {
    // Base times in seconds
    const baseTimes = {
      'layerzero': 300,  // 5 minutes
      'wormhole': 900,   // 15 minutes
      'axelar': 600,     // 10 minutes
      'hyperlane': 300,  // 5 minutes
      'multichain': 1200, // 20 minutes
      'chainlink': 600,  // 10 minutes
      'hop': 300,        // 5 minutes
      'across': 180      // 3 minutes
    };
    
    const baseTime = baseTimes[protocol] || 600;
    
    // Adjust based on chain congestion
    const congestionMultipliers = {
      'ethereum': 1.5,
      'polygon': 1.2,
      'bsc': 1.1,
      'avalanche': 1.0,
      'arbitrum': 0.8,
      'optimism': 0.8,
      'fantom': 0.9
    };
    
    const sourceMultiplier = congestionMultipliers[fromChain] || 1.0;
    const targetMultiplier = congestionMultipliers[toChain] || 1.0;
    
    return Math.floor(baseTime * Math.max(sourceMultiplier, targetMultiplier));
  }

  _assessRiskLevel(params, protocol) {
    const protocolRisks = {
      'layerzero': 'low',
      'wormhole': 'medium',
      'axelar': 'low',
      'hyperlane': 'medium',
      'multichain': 'high',
      'chainlink': 'low',
      'hop': 'medium',
      'across': 'medium'
    };
    
    let riskLevel = protocolRisks[protocol] || 'medium';
    
    // Increase risk for high amounts
    const amount = BigInt(params.amount.toString());
    const highAmountThreshold = BigInt('100000000000000000000'); // 100 ETH
    
    if (amount > highAmountThreshold) {
      const riskLevels = ['low', 'medium', 'high'];
      const currentIndex = riskLevels.indexOf(riskLevel);
      if (currentIndex < riskLevels.length - 1) {
        riskLevel = riskLevels[currentIndex + 1];
      }
    }
    
    return riskLevel;
  }

  _calculateDynamicFee(amount, protocolConfig, sourceChain, targetChain) {
    const baseFee = BigInt(protocolConfig.baseFee || '1000000000000000');
    const amountBasedFee = amount * BigInt(25) / 10000n; // 0.25% of amount
    
    // Chain-specific multipliers
    const chainMultipliers = {
      'ethereum': 2.0,
      'polygon': 0.5,
      'bsc': 0.3,
      'avalanche': 0.8,
      'arbitrum': 0.4,
      'optimism': 0.4,
      'fantom': 0.2
    };
    
    const sourceMultiplier = BigInt(Math.floor((chainMultipliers[sourceChain] || 1.0) * 100)) / 100n;
    const adjustedFee = (baseFee + amountBasedFee) * sourceMultiplier;
    
    return adjustedFee.toString();
  }

  _calculateAMMFees(amount, protocolConfig) {
    const bonderFeeRate = protocolConfig.bonderFeeRate || 0.0025;
    const bonderFee = amount * BigInt(Math.floor(bonderFeeRate * 10000)) / 10000n;
    
    return {
      protocolFee: '0',
      bonderFee: bonderFee.toString(),
      destinationTxFee: '5000000000000000' // 0.005 ETH
    };
  }

  _calculateNetworkFee(sourceChain, targetChain) {
    // L1 to L2 or L2 to L1 bridges may have additional network fees
    const l1Chains = ['ethereum'];
    const l2Chains = ['polygon', 'arbitrum', 'optimism'];
    
    if (l1Chains.includes(sourceChain) && l2Chains.includes(targetChain)) {
      return '2000000000000000'; // 0.002 ETH for L1 -> L2
    }
    
    if (l2Chains.includes(sourceChain) && l1Chains.includes(targetChain)) {
      return '5000000000000000'; // 0.005 ETH for L2 -> L1
    }
    
    return '0';
  }

  _calculateRelayerFee(protocolConfig, amount) {
    if (protocolConfig.relayerFeeRate) {
      const relayerFee = amount * BigInt(Math.floor(protocolConfig.relayerFeeRate * 10000)) / 10000n;
      return relayerFee.toString();
    }
    
    return '0';
  }

  // ===== PROTOCOL-SPECIFIC DATA PREPARATION =====

  _prepareLayerZeroData(params) {
    const { sourceChain, targetChain, amount, token, recipient } = params;
    
    // LayerZero chain IDs
    const chainIds = {
      ethereum: 101,
      polygon: 109,
      bsc: 102,
      avalanche: 106,
      arbitrum: 110,
      optimism: 111,
      fantom: 112
    };
    
    const targetChainId = chainIds[targetChain];
    if (!targetChainId) {
      throw new ValidationError(`LayerZero does not support target chain: ${targetChain}`);
    }
    
    // Encode payload
    const payload = ethers.AbiCoder.defaultAbiCoder().encode(
      ['uint256', 'address'],
      [amount, recipient]
    );
    
    // Build calldata for LayerZero send
    const calldata = ethers.AbiCoder.defaultAbiCoder().encode(
      ['uint16', 'bytes', 'bytes', 'address', 'address', 'bytes'],
      [
        targetChainId,
        ethers.zeroPadValue(recipient, 32),
        payload,
        ethers.ZeroAddress, // refund address
        ethers.ZeroAddress, // zro payment address
        '0x00010000000000000000000000000000000000000000000000000000000000030d40' // adapter params
      ]
    );
    
    return {
      contractAddress: '0x66A71Dcef29A0fFBDBE3c6a460a3B5BC225Cd675', // LayerZero Endpoint
      calldata,
      value: '2000000000000000', // 0.002 ETH for fees
      protocolData: {
        targetChainId,
        payload,
        adapterParams: '0x00010000000000000000000000000000000000000000000000000000000000030d40'
      }
    };
  }

  _prepareWormholeData(params) {
    const { sourceChain, targetChain, amount, token, recipient } = params;
    
    // Wormhole chain IDs
    const chainIds = {
      ethereum: 2,
      polygon: 5,
      bsc: 4,
      avalanche: 6,
      arbitrum: 23,
      optimism: 24,
      fantom: 10
    };
    
    const targetChainId = chainIds[targetChain];
    if (!targetChainId) {
      throw new ValidationError(`Wormhole does not support target chain: ${targetChain}`);
    }
    
    // Build calldata for Wormhole transfer
    const calldata = ethers.AbiCoder.defaultAbiCoder().encode(
      ['address', 'uint256', 'uint16', 'bytes32', 'uint256', 'uint32'],
      [
        token,
        amount,
        targetChainId,
        ethers.zeroPadValue(recipient, 32),
        '2000000000000000', // arbiter fee
        Math.floor(Math.random() * 1000000) // nonce
      ]
    );
    
    return {
      contractAddress: '0x3ee18B2214AFF97000D974cf647E7C347E8fa585', // Wormhole Token Bridge
      calldata,
      value: '2000000000000000', // 0.002 ETH for fees
      protocolData: {
        targetChainId,
        arbiterFee: '2000000000000000'
      }
    };
  }

  _prepareAxelarData(params) {
    const { sourceChain, targetChain, amount, token, recipient } = params;
    
    // Axelar chain names
    const chainNames = {
      ethereum: 'Ethereum',
      polygon: 'Polygon',
      avalanche: 'Avalanche',
      fantom: 'Fantom',
      moonbeam: 'Moonbeam',
      bsc: 'binance'
    };
    
    const targetChainName = chainNames[targetChain];
    if (!targetChainName) {
      throw new ValidationError(`Axelar does not support target chain: ${targetChain}`);
    }
    
    // Encode payload
    const payload = ethers.AbiCoder.defaultAbiCoder().encode(
      ['uint256', 'address'],
      [amount, recipient]
    );
    
    // Build calldata for Axelar callContractWithToken
    const calldata = ethers.AbiCoder.defaultAbiCoder().encode(
      ['string', 'string', 'bytes', 'string', 'uint256'],
      [
        targetChainName,
        recipient,
        payload,
        'USDC', // symbol
        amount
      ]
    );
    
    return {
      contractAddress: '0x4F4495243837681061C4743b74B3eEdf548D56A5', // Axelar Gateway
      calldata,
      value: '0',
      protocolData: {
        targetChainName,
        payload,
        symbol: 'USDC'
      }
    };
  }

  _prepareHyperlaneData(params) {
    const { sourceChain, targetChain, amount, token, recipient } = params;
    
    // Hyperlane domain IDs
    const domainIds = {
      ethereum: 1,
      polygon: 137,
      avalanche: 43114,
      bsc: 56,
      arbitrum: 42161,
      optimism: 10
    };
    
    const targetDomainId = domainIds[targetChain];
    if (!targetDomainId) {
      throw new ValidationError(`Hyperlane does not support target chain: ${targetChain}`);
    }
    
    // Encode message body
    const messageBody = ethers.AbiCoder.defaultAbiCoder().encode(
      ['uint256', 'address', 'address'],
      [amount, token, recipient]
    );
    
    // Build calldata for Hyperlane dispatch
    const calldata = ethers.AbiCoder.defaultAbiCoder().encode(
      ['uint32', 'bytes32', 'bytes'],
      [
        targetDomainId,
        ethers.zeroPadValue(recipient, 32),
        messageBody
      ]
    );
    
    return {
      contractAddress: '0xc005dc82818d67AF737725bD4bf75435d065D239', // Hyperlane Mailbox
      calldata,
      value: '0',
      protocolData: {
        targetDomainId,
        messageBody
      }
    };
  }

  _prepareMultichainData(params) {
    const { sourceChain, targetChain, amount, token, recipient } = params;
    
    // Multichain chain IDs
    const chainIds = {
      ethereum: 1,
      bsc: 56,
      polygon: 137,
      fantom: 250,
      avalanche: 43114,
      arbitrum: 42161,
      optimism: 10
    };
    
    const targetChainId = chainIds[targetChain];
    if (!targetChainId) {
      throw new ValidationError(`Multichain does not support target chain: ${targetChain}`);
    }
    
    // Build calldata for Multichain anySwapOut
    const calldata = ethers.AbiCoder.defaultAbiCoder().encode(
      ['address', 'address', 'uint256', 'uint256'],
      [
        token,
        recipient,
        amount,
        targetChainId
      ]
    );
    
    return {
      contractAddress: '0x6b7a87899490EcE95443e979cA9485CBE7E71522', // Multichain Router
      calldata,
      value: '0',
      protocolData: {
        targetChainId
      }
    };
  }

  _prepareChainlinkData(params) {
    const { sourceChain, targetChain, amount, token, recipient } = params;
    
    // Chainlink CCIP chain selectors
    const chainSelectors = {
      ethereum: '5009297550715157269',
      polygon: '4051577828743386545',
      avalanche: '6433500567565415381',
      bsc: '11344663589394136015',
      arbitrum: '4949039107694359620',
      optimism: '3734403246176062136'
    };
    
    const targetChainSelector = chainSelectors[targetChain];
    if (!targetChainSelector) {
      throw new ValidationError(`Chainlink CCIP does not support target chain: ${targetChain}`);
    }
    
    // Encode message data
    const messageData = ethers.AbiCoder.defaultAbiCoder().encode(
      ['uint256', 'address', 'address'],
      [amount, token, recipient]
    );
    
    // Build CCIP message structure
    const message = {
      receiver: ethers.zeroPadValue(recipient, 32),
      data: messageData,
      tokenAmounts: [{
        token: token,
        amount: amount
      }],
      extraArgs: '0x',
      feeToken: ethers.ZeroAddress
    };
    
    // Build calldata for CCIP send
    const calldata = ethers.AbiCoder.defaultAbiCoder().encode(
      ['uint64', 'tuple(bytes32,bytes,tuple(address,uint256)[],address,bytes)'],
      [targetChainSelector, message]
    );
    
    return {
      contractAddress: '0x80226fc0Ee2b096224EeAc085Bb9a8cba1146f7D', // CCIP Router
      calldata,
      value: '5000000000000000', // 0.005 ETH for fees
      protocolData: {
        targetChainSelector,
        message,
        messageData
      }
    };
  }

  _prepareHopData(params) {
    const { sourceChain, targetChain, amount, token, recipient } = params;
    
    // Hop only supports specific chains
    const supportedChains = ['ethereum', 'polygon', 'arbitrum', 'optimism', 'gnosis'];
    if (!supportedChains.includes(targetChain)) {
      throw new ValidationError(`Hop does not support target chain: ${targetChain}`);
    }
    
    // Chain IDs for Hop
    const chainIds = {
      ethereum: 1,
      polygon: 137,
      arbitrum: 42161,
      optimism: 10,
      gnosis: 100
    };
    
    const targetChainId = chainIds[targetChain];
    const bonderFee = BigInt(amount.toString()) * 25n / 10000n; // 0.25%
    
    // Build calldata for Hop bridge
    const calldata = ethers.AbiCoder.defaultAbiCoder().encode(
      ['uint256', 'address', 'uint256', 'uint256', 'uint256', 'uint256'],
      [
        targetChainId,
        recipient,
        amount,
        bonderFee,
        Math.floor(Date.now() / 1000) + 3600, // 1 hour deadline
        0 // amountOutMin
      ]
    );
    
    return {
      contractAddress: '0xb8901acB165ed027E32754E0FFe830802919727f', // Hop Bridge
      calldata,
      value: sourceChain === 'ethereum' ? '5000000000000000' : '0', // 0.005 ETH for L1 -> L2
      protocolData: {
        targetChainId,
        bonderFee: bonderFee.toString(),
        deadline: Math.floor(Date.now() / 1000) + 3600
      }
    };
  }

  _prepareAcrossData(params) {
    const { sourceChain, targetChain, amount, token, recipient } = params;
    
    // Across chain IDs
    const chainIds = {
      ethereum: 1,
      polygon: 137,
      arbitrum: 42161,
      optimism: 10,
      boba: 288
    };
    
    const targetChainId = chainIds[targetChain];
    if (!targetChainId) {
      throw new ValidationError(`Across does not support target chain: ${targetChain}`);
    }
    
    const relayerFeePct = BigInt(250); // 0.25% in basis points
    const quoteTimestamp = Math.floor(Date.now() / 1000);
    
    // Build calldata for Across deposit
    const calldata = ethers.AbiCoder.defaultAbiCoder().encode(
      ['address', 'address', 'uint256', 'uint256', 'uint256', 'uint32'],
      [
        recipient,
        token,
        amount,
        targetChainId,
        relayerFeePct,
        quoteTimestamp
      ]
    );
    
    return {
      contractAddress: '0x4D9079Bb4165aeb4084c526a32695dCfd2F77381', // Across SpokePool
      calldata,
      value: '0',
      protocolData: {
        targetChainId,
        relayerFeePct: relayerFeePct.toString(),
        quoteTimestamp
      }
    };
  }
}
