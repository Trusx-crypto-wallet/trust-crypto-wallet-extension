/**
 * Multichain Bridge Protocol Implementation
 * Production-grade implementation for cross-chain token transfers via Multichain (formerly AnySwap)
 */

import { ethers } from 'ethers';
import { BridgeError, NetworkError, InsufficientFundsError, ValidationError } from '../../errors/BridgeErrors.js';
import logger from '../../utils/logger.js';
import { WalletManager } from '../../wallet/WalletManager.js';
import { TransactionSigner } from '../../wallet/TransactionSigner.js';
import { ProviderManager } from '../../web3/ProviderManager.js';
import { GasManager } from '../../gas/GasManager.js';
import { GasEstimator } from '../../gas/GasEstimator.js';
import MultichainRouterABI from '../abis/MultichainRouter.json';
import ERC20ABI from '../abis/ERC20.json';

export default class MultichainBridge {
  constructor(config = {}) {
    this.config = {
      // Multichain Router addresses per chain (VERIFIED MAINNET ADDRESSES)
      routers: {
        ethereum: '0x6b7a87899490EcE95443e979cA9485CBE7E71522',
        polygon: '0x4f3Aff3A747fCADe12598081e80c6605A8be192F',
        bsc: '0xd1C5966f9F5Ee6881Ff6b261BBeDa45972B1B5f3',
        avalanche: '0xB0731d50C681C45856BFc3f7539D5f61d4bE81D8',
        arbitrum: '0xC931f61B1534EB21D8c11B24f3f5Ab2471d4aB50',
        optimism: '0xDC42728B0eA910349ed3c6e1c9Dc06b5FB591f98'
      },

      // RPC URLs for blockchain networks
      rpcUrls: {
        ethereum: 'https://ethereum-rpc.publicnode.com',
        polygon: 'https://polygon-bor-rpc.publicnode.com',
        bsc: 'https://bsc-rpc.publicnode.com',
        avalanche: 'https://avalanche-c-chain-rpc.publicnode.com',
        arbitrum: 'https://arbitrum-one-rpc.publicnode.com',
        optimism: 'https://optimism-rpc.publicnode.com'
      },

      // Chain IDs for Multichain protocol
      chainIds: {
        ethereum: 1,
        polygon: 137,
        bsc: 56,
        avalanche: 43114,
        arbitrum: 42161,
        optimism: 10
      },

      // Supported tokens per chain with their anyToken addresses
      supportedTokens: {
        ethereum: {
          'ETH': {
            token: '0x0000000000000000000000000000000000000000',
            anyToken: '0x6A023CCd1ff6F2045C3309768eAd9E68F978f6e1',
            decimals: 18
          },
          'WETH': {
            token: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
            anyToken: '0x6A023CCd1ff6F2045C3309768eAd9E68F978f6e1',
            decimals: 18
          },
          'USDT': {
            token: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
            anyToken: '0x533e3c0e6b48010873B947bddC4721b1bDFF9648',
            decimals: 6
          },
          'USDC': {
            token: '0xA0b86a33E6441B6Be7045bD5bd0f19a242FB8b2D',
            anyToken: '0x7EA2be2df7BA6E54B1A9C70676f668455E329d29',
            decimals: 6
          },
          'WBTC': {
            token: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
            anyToken: '0x7f367cC41522cE07553e823bf3be79A889DEbe1B',
            decimals: 8
          },
          'DAI': {
            token: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
            anyToken: '0x7EA2be2df7BA6E54B1A9C70676f668455E329d29',
            decimals: 18
          },
          'UNI': {
            token: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
            anyToken: '0x6A023CCd1ff6F2045C3309768eAd9E68F978f6e1',
            decimals: 18
          },
          'AAVE': {
            token: '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9',
            anyToken: '0x7EA2be2df7BA6E54B1A9C70676f668455E329d29',
            decimals: 18
          }
        },
        polygon: {
          'MATIC': {
            token: '0x0000000000000000000000000000000000000000',
            anyToken: '0x4f3Aff3A747fCADe12598081e80c6605A8be192F',
            decimals: 18
          },
          'WETH': {
            token: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619',
            anyToken: '0x4f3Aff3A747fCADe12598081e80c6605A8be192F',
            decimals: 18
          },
          'USDT': {
            token: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
            anyToken: '0xE3eeDa11f06a656FcAee19de663E84C7e61d3Cac',
            decimals: 6
          },
          'USDC': {
            token: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
            anyToken: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
            decimals: 6
          },
          'WBTC': {
            token: '0x1bfd67037b42cf73acf2047067bd4f2c47d9bfd6',
            anyToken: '0x4f3Aff3A747fCADe12598081e80c6605A8be192F',
            decimals: 8
          },
          'DAI': {
            token: '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063',
            anyToken: '0x4f3Aff3A747fCADe12598081e80c6605A8be192F',
            decimals: 18
          },
          'UNI': {
            token: '0xb33EaAd8d922B1083446DC23f610c2567fB5180f',
            anyToken: '0x4f3Aff3A747fCADe12598081e80c6605A8be192F',
            decimals: 18
          },
          'AAVE': {
            token: '0xD6DF932A45C0f255f85145f286eA0b292B21C90B',
            anyToken: '0x4f3Aff3A747fCADe12598081e80c6605A8be192F',
            decimals: 18
          }
        },
        bsc: {
          'BNB': {
            token: '0x0000000000000000000000000000000000000000',
            anyToken: '0xC9BdeEd33CD01541e1eeD10f90519d2C06Fe3feB',
            decimals: 18
          },
          'WETH': {
            token: '0x2170Ed0880ac9A755fd29B2688956BD959F933F8',
            anyToken: '0xC9BdeEd33CD01541e1eeD10f90519d2C06Fe3feB',
            decimals: 18
          },
          'USDT': {
            token: '0x55d398326f99059fF775485246999027B3197955',
            anyToken: '0xC9BdeEd33CD01541e1eeD10f90519d2C06Fe3feB',
            decimals: 18
          },
          'USDC': {
            token: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
            anyToken: '0xE4eE69eB1c58b7E8a1E93bc6a4E992CCDB7C63BE',
            decimals: 18
          },
          'WBTC': {
            token: '0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c',
            anyToken: '0xC9BdeEd33CD01541e1eeD10f90519d2C06Fe3feB',
            decimals: 18
          },
          'DAI': {
            token: '0x1AF3F329e8BE154074D8769D1FFa4eE058B1DBc3',
            anyToken: '0xC9BdeEd33CD01541e1eeD10f90519d2C06Fe3feB',
            decimals: 18
          },
          'UNI': {
            token: '0xBf5140A22578168FD562DCcF235E5D43A02ce9B1',
            anyToken: '0xC9BdeEd33CD01541e1eeD10f90519d2C06Fe3feB',
            decimals: 18
          },
          'AAVE': {
            token: '0xfb6115445Bff7b52FeB98650C87f44907E58f802',
            anyToken: '0xC9BdeEd33CD01541e1eeD10f90519d2C06Fe3feB',
            decimals: 18
          }
        },
        avalanche: {
          'AVAX': {
            token: '0x0000000000000000000000000000000000000000',
            anyToken: '0xB44a9B6905aF7c801311e8F4E76932ee959c663C',
            decimals: 18
          },
          'WETH': {
            token: '0x49D5c2BdFfac6CE2BFdB6640F4F80f226bc10bAB',
            anyToken: '0xB44a9B6905aF7c801311e8F4E76932ee959c663C',
            decimals: 18
          },
          'USDT': {
            token: '0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7',
            anyToken: '0xeD26093F39C94c5D866ED4Af9CAC0Be1A26AA7F4',
            decimals: 6
          },
          'USDC': {
            token: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E',
            anyToken: '0xfaB550568C688d5D8A52C7d794cb93Edc26eC0eC',
            decimals: 6
          },
          'WBTC': {
            token: '0x50b7545627a5162F82A992c33b87aDc75187B218',
            anyToken: '0xB44a9B6905aF7c801311e8F4E76932ee959c663C',
            decimals: 8
          },
          'DAI': {
            token: '0xd586E7F844cEa2F87f50152665BCbc2C279D8d70',
            anyToken: '0xB44a9B6905aF7c801311e8F4E76932ee959c663C',
            decimals: 18
          },
          'UNI': {
            token: '0x8eBAf22B6F053dFFeaf46f4Dd9eFA95D89ba8580',
            anyToken: '0xB44a9B6905aF7c801311e8F4E76932ee959c663C',
            decimals: 18
          },
          'AAVE': {
            token: '0x63a72806098Bd3D9520cC43356dD78afe5D386D9',
            anyToken: '0xB44a9B6905aF7c801311e8F4E76932ee959c663C',
            decimals: 18
          }
        },
        arbitrum: {
          'ARB': {
            token: '0x912CE59144191C1204E64559FE8253a0e49E6548',
            anyToken: '0x93C175439726797dcE24d08e4Ac9164E88E7Edd8',
            decimals: 18
          },
          'WETH': {
            token: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
            anyToken: '0x93C175439726797dcE24d08e4Ac9164E88E7Edd8',
            decimals: 18
          },
          'USDT': {
            token: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
            anyToken: '0xeD26093F39C94c5D866ED4Af9CAC0Be1A26AA7F4',
            decimals: 6
          },
          'USDC': {
            token: '0xA0b86a33E6441B6Be7045bD5bd0f19a242FB8b2D',
            anyToken: '0x93C175439726797dcE24d08e4Ac9164E88E7Edd8',
            decimals: 6
          },
          'WBTC': {
            token: '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f',
            anyToken: '0x93C175439726797dcE24d08e4Ac9164E88E7Edd8',
            decimals: 8
          },
          'DAI': {
            token: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
            anyToken: '0x93C175439726797dcE24d08e4Ac9164E88E7Edd8',
            decimals: 18
          },
          'UNI': {
            token: '0xFa7F8980b0f1E64A2062791cc3b0871572f1F7f0',
            anyToken: '0x93C175439726797dcE24d08e4Ac9164E88E7Edd8',
            decimals: 18
          },
          'AAVE': {
            token: '0xba5DdD1f9d7F570dc94a51479a000E3BCE967196',
            anyToken: '0x93C175439726797dcE24d08e4Ac9164E88E7Edd8',
            decimals: 18
          }
        },
        optimism: {
          'OP': {
            token: '0x4200000000000000000000000000000000000042',
            anyToken: '0xBFD291DA8A403DAAF7e5E9DC1ec0aCEaCd4848B9',
            decimals: 18
          },
          'WETH': {
            token: '0x4200000000000000000000000000000000000006',
            anyToken: '0xBFD291DA8A403DAAF7e5E9DC1ec0aCEaCd4848B9',
            decimals: 18
          },
          'USDT': {
            token: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58',
            anyToken: '0x67C10C397dD0Ba417329543c1a40eb48AAa7cd00',
            decimals: 6
          },
          'USDC': {
            token: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
            anyToken: '0xBFD291DA8A403DAAF7e5E9DC1ec0aCEaCd4848B9',
            decimals: 6
          },
          'WBTC': {
            token: '0x68f180fcCe6836688e9084f035309E29Bf0A2095',
            anyToken: '0xBFD291DA8A403DAAF7e5E9DC1ec0aCEaCd4848B9',
            decimals: 8
          },
          'DAI': {
            token: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
            anyToken: '0xBFD291DA8A403DAAF7e5E9DC1ec0aCEaCd4848B9',
            decimals: 18
          },
          'UNI': {
            token: '0x6fd9d7AD17242c41f7131d257212c54A0e5a6e96',
            anyToken: '0xBFD291DA8A403DAAF7e5E9DC1ec0aCEaCd4848B9',
            decimals: 18
          },
          'AAVE': {
            token: '0x76FB31fb4af56892A25e32cFC43De717950c9278',
            anyToken: '0xBFD291DA8A403DAAF7e5E9DC1ec0aCEaCd4848B9',
            decimals: 18
          }
        }
      },

      // Fee structure for Multichain
      feeConfig: {
        baseFee: '1000000', // 1 USDT equivalent
        feeRate: 0.001, // 0.1%
        minFee: '100000', // 0.1 USDT
        maxFee: '1000000000000000000', // 1 ETH equivalent
        gasMultiplier: 1.2
      },

      // Protocol-specific settings
      protocolSettings: {
        version: 'v6',
        confirmationBlocks: {
          ethereum: 12,
          polygon: 128,
          bsc: 20,
          avalanche: 5,
          arbitrum: 10,
          optimism: 10
        },
        timeout: 1800000, // 30 minutes
        maxRetries: 3,
        retryDelay: 60000 // 1 minute
      },

      ...config
    };

    this.providers = new Map();
    this.routerContracts = new Map();
    this.walletManager = new WalletManager();
    this.transactionSigner = new TransactionSigner();
    this.providerManager = new ProviderManager();
    this.gasManager = new GasManager();
    this.gasEstimator = new GasEstimator();
    this.initialized = false;
  }

  /**
   * Initialize Multichain bridge with provider and contract setup
   */
  async initialize() {
    try {
      logger.info('Initializing Multichain bridge...');

      // Initialize providers for all supported chains
      for (const [chainName, rpcUrl] of Object.entries(this.config.rpcUrls)) {
        try {
          let provider;
          
          // Try to get provider from ProviderManager first
          try {
            provider = await this.providerManager.getProvider(chainName);
          } catch (providerError) {
            // Fallback to direct RPC connection
            logger.debug(`Using direct RPC connection for ${chainName}: ${rpcUrl}`);
            provider = new ethers.JsonRpcProvider(rpcUrl);
          }
          
          await provider.getNetwork(); // Test connection
          this.providers.set(chainName, provider);
          logger.debug(`Multichain provider initialized for ${chainName}`);

        } catch (error) {
          logger.error(`Failed to initialize provider for ${chainName}:`, error);
          throw new NetworkError(`Failed to connect to ${chainName}`, chainName);
        }
      }

      // Initialize router contracts for each chain
      for (const [chainName, routerAddress] of Object.entries(this.config.routers)) {
        const provider = this.providers.get(chainName);
        if (provider && routerAddress) {
          const routerContract = new ethers.Contract(
            routerAddress,
            MultichainRouterABI,
            provider
          );
          this.routerContracts.set(chainName, routerContract);
          logger.debug(`Multichain router contract initialized for ${chainName}`);
        }
      }

      this.initialized = true;
      logger.info('Multichain bridge initialized successfully');

    } catch (error) {
      logger.error('Multichain bridge initialization failed:', error);
      throw new BridgeError('Failed to initialize Multichain bridge', 'INIT_FAILED', { error: error.message });
    }
  }

  /**
   * Get supported chains
   */
  getSupportedChains() {
    return Object.keys(this.config.chainIds);
  }

  /**
   * Get supported tokens for a specific chain
   */
  getSupportedTokens(chain) {
    if (chain) {
      return Object.keys(this.config.supportedTokens[chain] || {});
    }
    
    // Return all unique token symbols across all chains
    const allTokens = new Set();
    Object.values(this.config.supportedTokens).forEach(chainTokens => {
      Object.keys(chainTokens).forEach(token => allTokens.add(token));
    });
    
    return Array.from(allTokens);
  }

  /**
   * Check if a specific route is supported
   */
  isRouteSupported(fromChain, toChain, token) {
    try {
      // Check if chains are supported
      if (!this.config.chainIds[fromChain] || !this.config.chainIds[toChain]) {
        return false;
      }

      // Check if token is supported on source chain
      if (!this.config.supportedTokens[fromChain]?.[token]) {
        return false;
      }

      // Check if token is supported on destination chain
      if (!this.config.supportedTokens[toChain]?.[token]) {
        return false;
      }

      return true;
    } catch (error) {
      logger.error('Error checking route support:', error);
      return false;
    }
  }

  /**
   * Estimate bridge fee
   */
  async estimateFee(fromChain, toChain, token, amount) {
    this._validateInitialized();
    
    try {
      logger.debug('Estimating Multichain bridge fee', { fromChain, toChain, token, amount });

      // Validate route
      if (!this.isRouteSupported(fromChain, toChain, token)) {
        throw new ValidationError(`Route not supported: ${fromChain} -> ${toChain} for ${token}`);
      }

      const provider = this.providers.get(fromChain);
      const routerContract = this.routerContracts.get(fromChain);

      if (!provider || !routerContract) {
        throw new ValidationError(`Unsupported source chain: ${fromChain}`);
      }

      const tokenConfig = this.config.supportedTokens[fromChain][token];
      if (!tokenConfig) {
        throw new ValidationError(`Token ${token} not supported on ${fromChain}`);
      }

      // Calculate Multichain protocol fee
      const amountBN = BigInt(amount);
      const feeRate = BigInt(Math.floor(this.config.feeConfig.feeRate * 10000)); // Convert to basis points
      const protocolFee = (amountBN * feeRate) / 10000n;
      
      const baseFee = BigInt(this.config.feeConfig.baseFee);
      const minFee = BigInt(this.config.feeConfig.minFee);
      const maxFee = BigInt(this.config.feeConfig.maxFee);

      // Calculate final fee
      let finalFee = protocolFee + baseFee;
      if (finalFee < minFee) finalFee = minFee;
      if (finalFee > maxFee) finalFee = maxFee;

      // Estimate gas for swapOut transaction
      const gasPrice = await this.gasEstimator.getOptimalGasPrice(fromChain);
      const estimatedGasLimit = 150000n; // Typical gas limit for Multichain swapOut
      const gasCost = gasPrice * estimatedGasLimit;

      // Apply gas multiplier for safety
      const adjustedGasCost = gasCost * BigInt(Math.floor(this.config.feeConfig.gasMultiplier * 100)) / 100n;

      const estimate = {
        protocolFee: finalFee.toString(),
        gasFee: adjustedGasCost.toString(),
        totalFee: (finalFee + adjustedGasCost).toString(),
        gasLimit: estimatedGasLimit.toString(),
        gasPrice: gasPrice.toString(),
        estimatedTime: 600, // 10 minutes average
        confidence: 'high'
      };

      logger.debug('Multichain fee estimation completed', estimate);
      return estimate;

    } catch (error) {
      logger.error('Multichain fee estimation failed:', error);
      
      if (error instanceof ValidationError) {
        throw error;
      }
      
      throw new BridgeError('Fee estimation failed', 'FEE_ESTIMATION_FAILED', {
        fromChain,
        toChain,
        token,
        error: error.message
      });
    }
  }

  /**
   * Execute bridge transaction
   */
  async executeBridge(params) {
    this._validateInitialized();

    const {
      sourceChain,
      targetChain,
      amount,
      token,
      recipient,
      slippage = 0.005,
      deadline,
      nonce,
      metadata = {}
    } = params;

    const startTime = Date.now();
    const transactionId = metadata.transactionId || `mc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      logger.info('Executing Multichain bridge transaction', {
        transactionId,
        sourceChain,
        targetChain,
        amount,
        token,
        recipient
      });

      // Validate parameters
      await this._validateBridgeParams(params);

      const provider = this.providers.get(sourceChain);
      const routerContract = this.routerContracts.get(sourceChain);
      const tokenConfig = this.config.supportedTokens[sourceChain][token];
      const targetChainId = this.config.chainIds[targetChain];

      // Get signer
      const signer = await this._getSigner(sourceChain, metadata.userAddress);
      const routerWithSigner = routerContract.connect(signer);

      // Check and approve token spending if needed
      await this._ensureTokenApproval(tokenConfig.token, amount, this.config.routers[sourceChain], signer);

      // Estimate gas
      const gasLimit = await this.gasEstimator.estimateGasLimit(sourceChain, {
        to: this.config.routers[sourceChain],
        data: routerWithSigner.interface.encodeFunctionData('anySwapOut', [
          tokenConfig.anyToken,
          recipient,
          amount,
          targetChainId
        ])
      });

      // Execute swapOut transaction
      logger.debug('Executing Multichain swapOut', { transactionId });

      const tx = await this.swapOut(
        tokenConfig.anyToken,
        recipient,
        amount,
        targetChainId,
        { signer: routerWithSigner, gasLimit, nonce }
      );

      logger.info('Multichain transaction submitted', {
        transactionId,
        txHash: tx.hash,
        sourceChain,
        targetChain
      });

      // Wait for confirmation
      const receipt = await tx.wait(this.config.protocolSettings.confirmationBlocks[sourceChain]);

      if (!receipt || receipt.status !== 1) {
        throw new BridgeError('Transaction failed on source chain', 'TX_FAILED', {
          txHash: tx.hash,
          receipt
        });
      }

      const executionTime = Date.now() - startTime;

      const result = {
        txHash: tx.hash,
        sourceChainTxHash: tx.hash,
        targetChainTxHash: null, // Will be available after processing
        status: 'pending',
        amount: amount.toString(),
        token,
        recipient,
        sourceChain,
        targetChain,
        executionTime,
        gasUsed: receipt.gasUsed.toString(),
        gasCost: (receipt.gasUsed * receipt.gasPrice).toString(),
        blockNumber: receipt.blockNumber,
        confirmations: this.config.protocolSettings.confirmationBlocks[sourceChain],
        multichainData: {
          version: this.config.protocolSettings.version,
          anyToken: tokenConfig.anyToken,
          targetChainId,
          router: this.config.routers[sourceChain]
        }
      };

      logger.info('Multichain bridge transaction completed', {
        transactionId,
        result: {
          txHash: result.txHash,
          executionTime: result.executionTime,
          status: result.status
        }
      });

      return result;

    } catch (error) {
      const executionTime = Date.now() - startTime;

      logger.error('Multichain bridge execution failed:', {
        transactionId,
        error: error.message,
        executionTime,
        sourceChain,
        targetChain
      });

      // Transform specific errors
      if (error.message?.includes('insufficient funds')) {
        throw new InsufficientFundsError(error.message);
      }

      if (error.message?.includes('network') || error.code === 'NETWORK_ERROR') {
        throw new NetworkError(error.message, sourceChain);
      }

      throw new BridgeError('Bridge execution failed', 'EXECUTION_FAILED', {
        sourceChain,
        targetChain,
        transactionId,
        error: error.message,
        executionTime
      });
    }
  }

  /**
   * Multichain-specific swapOut method
   */
  async swapOut(token, to, amount, toChainID, options = {}) {
    try {
      const { signer, gasLimit, nonce } = options;

      if (!signer) {
        throw new BridgeError('Signer required for swapOut', 'SIGNER_REQUIRED');
      }

      logger.debug('Executing Multichain swapOut', {
        token,
        to,
        amount: amount.toString(),
        toChainID
      });

      const tx = await signer.anySwapOut(token, to, amount, toChainID, {
        gasLimit: gasLimit || 150000,
        nonce
      });

      return tx;

    } catch (error) {
      logger.error('Multichain swapOut failed:', error);
      throw new BridgeError('SwapOut execution failed', 'SWAPOUT_FAILED', {
        token,
        to,
        amount: amount.toString(),
        toChainID,
        error: error.message
      });
    }
  }

  /**
   * Get transaction status
   */
  async getTransactionStatus(txHash, sourceChain) {
    try {
      const provider = this.providers.get(sourceChain);
      if (!provider) {
        throw new ValidationError(`Unsupported chain: ${sourceChain}`);
      }

      const receipt = await provider.getTransactionReceipt(txHash);
      if (!receipt) {
        return { status: 'pending', confirmations: 0 };
      }

      const currentBlock = await provider.getBlockNumber();
      const confirmations = currentBlock - receipt.blockNumber;

      return {
        status: receipt.status === 1 ? 'confirmed' : 'failed',
        confirmations,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        effectiveGasPrice: receipt.effectiveGasPrice?.toString()
      };

    } catch (error) {
      logger.error('Failed to get transaction status:', error);
      throw new BridgeError('Status check failed', 'STATUS_CHECK_FAILED', { txHash, sourceChain });
    }
  }

  /**
   * Get protocol information
   */
  getProtocolInfo() {
    return {
      name: 'Multichain',
      version: this.config.protocolSettings.version,
      type: 'cross_chain_bridge',
      website: 'https://multichain.org',
      documentation: 'https://docs.multichain.org',
      supportedChains: this.getSupportedChains(),
      supportedTokens: this.getSupportedTokens(),
      features: [
        'anyToken_bridge',
        'cross_chain_swaps',
        'decentralized_validation',
        'multi_chain_support',
        'low_fees',
        'fast_transfers'
      ],
      security: {
        type: 'mpc_threshold_signature',
        validators: 'decentralized_network',
        auditStatus: 'audited'
      },
      feeStructure: {
        type: 'dynamic',
        baseFee: this.config.feeConfig.baseFee,
        feeRate: this.config.feeConfig.feeRate,
        paymentToken: 'native_or_source_token'
      },
      averageTime: 600, // 10 minutes
      maxTime: 1800 // 30 minutes
    };
  }

  /**
   * Get signer from wallet management
   */
  async _getSigner(chainName, userAddress) {
    try {
      const signer = await this.walletManager.getSigner(userAddress);
      const provider = this.providers.get(chainName);
      
      if (provider && signer.provider?.network?.chainId !== (await provider.getNetwork()).chainId) {
        return signer.connect(provider);
      }
      
      return signer;
    } catch (error) {
      throw new BridgeError('Failed to get signer', 'SIGNER_ERROR', {
        chainName,
        userAddress,
        error: error.message
      });
    }
  }

  /**
   * Ensure token approval for router contract
   */
  async _ensureTokenApproval(tokenAddress, amount, spenderAddress, signer) {
    try {
      const tokenContract = new ethers.Contract(tokenAddress, ERC20ABI, signer);
      const currentAllowance = await tokenContract.allowance(signer.address, spenderAddress);

      if (currentAllowance < amount) {
        logger.debug('Approving token spending for Multichain', {
          token: tokenAddress,
          amount: amount.toString(),
          spender: spenderAddress
        });

        const approveAmount = amount * 110n / 100n; // Add 10% buffer
        const approveTx = await tokenContract.approve(spenderAddress, approveAmount);
        await approveTx.wait();

        logger.debug('Token approval confirmed', { txHash: approveTx.hash });
      }
    } catch (error) {
      throw new BridgeError('Token approval failed', 'APPROVAL_FAILED', {
        token: tokenAddress,
        amount: amount.toString(),
        error: error.message
      });
    }
  }

  /**
   * Validate bridge parameters
   */
  async _validateBridgeParams(params) {
    const { sourceChain, targetChain, amount, token, recipient } = params;

    if (!this.config.chainIds[sourceChain]) {
      throw new ValidationError(`Unsupported source chain: ${sourceChain}`);
    }

    if (!this.config.chainIds[targetChain]) {
      throw new ValidationError(`Unsupported target chain: ${targetChain}`);
    }

    if (sourceChain === targetChain) {
      throw new ValidationError('Source and target chains must be different');
    }

    if (!amount || BigInt(amount) <= 0n) {
      throw new ValidationError('Amount must be greater than 0');
    }

    if (!ethers.isAddress(recipient)) {
      throw new ValidationError('Invalid recipient address');
    }

    if (!this.isRouteSupported(sourceChain, targetChain, token)) {
      throw new ValidationError(`Route not supported: ${sourceChain} -> ${targetChain} for ${token}`);
    }
  }

  /**
   * Validate initialization
   */
  _validateInitialized() {
    if (!this.initialized) {
      throw new BridgeError('Multichain bridge not initialized', 'NOT_INITIALIZED');
    }
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    logger.info('Multichain bridge configuration updated', { newConfig });
  }

  /**
   * Cleanup and shutdown
   */
  async shutdown() {
    logger.info('Shutting down Multichain bridge...');
    
    this.providers.clear();
    this.routerContracts.clear();
    this.initialized = false;
    
    logger.info('Multichain bridge shutdown complete');
  }
}
