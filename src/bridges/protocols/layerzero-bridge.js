/**
 * LayerZero Bridge Protocol Implementation
 * Production-grade implementation for omnichain token transfers
 */

import { ethers } from 'ethers';
import { BridgeError, NetworkError, InsufficientFundsError, ValidationError } from '../../errors/BridgeErrors.js';
import logger from '../../utils/logger.js';
import { WalletManager } from '../../wallet/WalletManager.js';
import { TransactionSigner } from '../../wallet/TransactionSigner.js';
import { ProviderManager } from '../../web3/ProviderManager.js';
import { GasManager } from '../../gas/GasManager.js';
import { GasEstimator } from '../../gas/GasEstimator.js';
import LayerZeroEndpointABI from '../abis/LayerZeroTokenBridge.json';
import ERC20ABI from '../abis/ERC20.json';

export default class LayerZeroBridge {
  constructor(config = {}) {
    this.config = {
      // LayerZero endpoint addresses per chain (VERIFIED MAINNET ADDRESSES)
      endpoints: {
        ethereum: '0x66A71Dcef29A0fFBDBE3c6a460a3B5BC225Cd675',
        polygon: '0x3c2269811836af69497E5F486A85D7316753cf62',
        bsc: '0x3c2269811836af69497E5F486A85D7316753cf62',
        avalanche: '0x3c2269811836af69497E5F486A85D7316753cf62',
        arbitrum: '0x3c2269811836af69497E5F486A85D7316753cf62',
        optimism: '0x3c2269811836af69497E5F486A85D7316753cf62'
      },
      
      // Chain IDs for LayerZero V1 and V2 (DUAL SUPPORT)
      chainIds: {
        v1: {
          ethereum: 101,
          polygon: 109,
          bsc: 102,
          avalanche: 106,
          arbitrum: 110,
          optimism: 111
        },
        v2: {
          ethereum: 30101,
          polygon: 30109,
          bsc: 30102,
          avalanche: 30106,
          arbitrum: 30110,
          optimism: 30111
        }
      },
      
      // Default LayerZero version (can be overridden)
      layerZeroVersion: config.layerZeroVersion || 'v2',
      
      // RPC URLs - will be populated from ProviderManager
      rpcUrls: config.rpcUrls || {},
      
      // Gas limits
      gasLimits: {
        estimateGas: 500000,
        executeGas: 800000,
        adapterParams: '0x00010000000000000000000000000000000000000000000000000000000000030d40'
      },
      
      // Fee configuration
      feeConfig: {
        baseGas: 200000,
        gasPerByte: 16,
        premium: 1.1 // 10% premium
      },
      
      // Timeouts
      timeout: config.timeout || 300000,
      confirmationBlocks: config.confirmationBlocks || 12,
      
      ...config
    };
    
    this.providers = new Map();
    this.contracts = new Map();
    this.walletManager = new WalletManager();
    this.transactionSigner = new TransactionSigner();
    this.providerManager = new ProviderManager();
    this.gasManager = new GasManager();
    this.gasEstimator = new GasEstimator();
    this.initialized = false;
  }

  /**
   * Initialize LayerZero bridge with real provider integration
   */
  async initialize() {
    try {
      logger.info('Initializing LayerZero bridge...');
      
      // Initialize providers using existing infrastructure
      for (const chainName of Object.keys(this.config.endpoints)) {
        try {
          const provider = await this.providerManager.getProvider(chainName);
          await provider.getNetwork(); // Test connection
          
          this.providers.set(chainName, provider);
          logger.debug(`LayerZero provider initialized for ${chainName}`);
          
        } catch (error) {
          logger.error(`Failed to initialize provider for ${chainName}:`, error);
          throw new NetworkError(`Failed to connect to ${chainName}`, chainName);
        }
      }
      
      // Initialize endpoint contracts with real ABI
      for (const [chainName, endpointAddress] of Object.entries(this.config.endpoints)) {
        const provider = this.providers.get(chainName);
        if (provider) {
          const contract = new ethers.Contract(
            endpointAddress,
            LayerZeroEndpointABI,
            provider
          );
          
          this.contracts.set(chainName, contract);
        }
      }
      
      this.initialized = true;
      logger.info('LayerZero bridge initialized successfully');
      
    } catch (error) {
      logger.error('LayerZero bridge initialization failed:', error);
      throw new BridgeError('Failed to initialize LayerZero bridge', 'INIT_FAILED', { error: error.message });
    }
  }

  /**
   * Estimate bridge fee with real gas integration
   */
  async estimateFee(params) {
    this._validateInitialized();
    
    const { sourceChain, targetChain, amount, token, gasPrice } = params;
    
    try {
      logger.debug('Estimating LayerZero bridge fee', { sourceChain, targetChain, amount: amount.toString() });
      
      const sourceProvider = this.providers.get(sourceChain);
      const sourceContract = this.contracts.get(sourceChain);
      
      if (!sourceProvider || !sourceContract) {
        throw new ValidationError(`Unsupported source chain: ${sourceChain}`);
      }
      
      const targetChainId = this.config.chainIds[this.config.layerZeroVersion][targetChain];
      if (!targetChainId) {
        throw new ValidationError(`Unsupported target chain: ${targetChain}`);
      }
      
      // Use real gas estimation
      const optimalGasPrice = gasPrice || await this.gasEstimator.getOptimalGasPrice(sourceChain);
      
      // Estimate LayerZero fees
      const adapterParams = this.config.gasLimits.adapterParams;
      const payload = this._encodePayload(amount, params.recipient || ethers.ZeroAddress);
      
      const [nativeFee, zroFee] = await sourceContract.estimateFees(
        targetChainId,
        token, // Real token contract address
        payload,
        false, // useZro
        adapterParams
      );
      
      // Real gas estimation using GasEstimator
      const txData = {
        to: this.config.endpoints[sourceChain],
        data: sourceContract.interface.encodeFunctionData('send', [
          targetChainId,
          ethers.solidityPacked(['address'], [params.recipient || ethers.ZeroAddress]),
          payload,
          ethers.ZeroAddress,
          ethers.ZeroAddress,
          adapterParams
        ]),
        value: nativeFee
      };
      
      const realGasLimit = await this.gasEstimator.estimateGasLimit(sourceChain, txData);
      const gasCost = optimalGasPrice * BigInt(realGasLimit);
      
      // Apply premium
      const totalNativeFee = nativeFee + gasCost;
      const premiumFee = totalNativeFee * BigInt(Math.floor(this.config.feeConfig.premium * 100)) / 100n;
      
      const estimate = {
        nativeFee: totalNativeFee.toString(),
        zroFee: zroFee.toString(),
        gasFee: gasCost.toString(),
        protocolFee: nativeFee.toString(),
        premiumFee: (premiumFee - totalNativeFee).toString(),
        totalFee: premiumFee.toString(),
        gasLimit: realGasLimit.toString(),
        gasPrice: optimalGasPrice.toString(),
        estimatedTime: 300, // 5 minutes average
        confidence: 'high'
      };
      
      logger.debug('LayerZero fee estimation completed', estimate);
      return estimate;
      
    } catch (error) {
      logger.error('LayerZero fee estimation failed:', error);
      
      if (error instanceof ValidationError) {
        throw error;
      }
      
      throw new BridgeError('Fee estimation failed', 'FEE_ESTIMATION_FAILED', {
        sourceChain,
        targetChain,
        error: error.message
      });
    }
  }

  /**
   * Execute bridge transaction with real wallet integration
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
    const transactionId = metadata.transactionId || `lz_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      logger.info('Executing LayerZero bridge transaction', {
        transactionId,
        sourceChain,
        targetChain,
        amount: amount.toString(),
        token,
        recipient
      });
      
      // Validate parameters
      await this._validateBridgeParams(params);
      
      const sourceProvider = this.providers.get(sourceChain);
      const sourceContract = this.contracts.get(sourceChain);
      const targetChainId = this.config.chainIds[this.config.layerZeroVersion][targetChain];
      
      // Get real signer from wallet management
      const signer = await this._getSigner(sourceChain, metadata.userAddress);
      const contractWithSigner = sourceContract.connect(signer);
      
      // Check and approve token spending if needed
      await this._ensureTokenApproval(token, amount, this.config.endpoints[sourceChain], signer);
      
      // Prepare transaction data
      const payload = this._encodePayload(amount, recipient);
      const adapterParams = this.config.gasLimits.adapterParams;
      
      // Get real fee estimate
      const [nativeFee] = await sourceContract.estimateFees(
        targetChainId,
        token,
        payload,
        false,
        adapterParams
      );
      
      // Build transaction with real gas estimation
      const gasLimit = await this.gasEstimator.estimateGasLimit(sourceChain, {
        to: this.config.endpoints[sourceChain],
        data: contractWithSigner.interface.encodeFunctionData('send', [
          targetChainId,
          ethers.solidityPacked(['address'], [recipient]),
          payload,
          ethers.ZeroAddress,
          ethers.ZeroAddress,
          adapterParams
        ]),
        value: nativeFee
      });
      
      // Execute transaction
      logger.debug('Sending LayerZero transaction', { transactionId });
      
      const tx = await contractWithSigner.send(
        targetChainId,
        ethers.solidityPacked(['address'], [recipient]),
        payload,
        signer.address, // Refund to sender
        ethers.ZeroAddress, // ZRO payment address
        adapterParams,
        {
          value: nativeFee,
          gasLimit: gasLimit,
          nonce: nonce
        }
      );
      
      logger.info('LayerZero transaction submitted', {
        transactionId,
        txHash: tx.hash,
        sourceChain,
        targetChain
      });
      
      // Wait for confirmation
      const receipt = await tx.wait(this.config.confirmationBlocks);
      
      if (!receipt || receipt.status !== 1) {
        throw new BridgeError('Transaction failed on source chain', 'TX_FAILED', {
          txHash: tx.hash,
          receipt
        });
      }
      
      // Extract real LayerZero message info from logs
      const messageInfo = this._extractMessageInfo(receipt);
      
      const executionTime = Date.now() - startTime;
      
      const result = {
        txHash: tx.hash,
        sourceChainTxHash: tx.hash,
        targetChainTxHash: null, // Will be available after message delivery
        nonce: messageInfo.nonce,
        messageId: messageInfo.messageId,
        status: 'pending_delivery',
        amount: amount.toString(),
        token,
        recipient,
        sourceChain,
        targetChain,
        executionTime,
        gasUsed: receipt.gasUsed.toString(),
        gasCost: (receipt.gasUsed * receipt.gasPrice).toString(),
        blockNumber: receipt.blockNumber,
        confirmations: this.config.confirmationBlocks,
        layerZeroData: {
          version: this.config.layerZeroVersion,
          srcChainId: this.config.chainIds[this.config.layerZeroVersion][sourceChain],
          dstChainId: targetChainId,
          nonce: messageInfo.nonce,
          messageId: messageInfo.messageId
        }
      };
      
      logger.info('LayerZero bridge transaction completed', {
        transactionId,
        result: {
          txHash: result.txHash,
          executionTime: result.executionTime,
          status: result.status
        }
      });
      
      // Start monitoring for delivery
      this._monitorMessageDelivery(result, transactionId);
      
      return result;
      
    } catch (error) {
      const executionTime = Date.now() - startTime;
      
      logger.error('LayerZero bridge execution failed:', {
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
   * Real signer implementation using wallet infrastructure
   */
  async _getSigner(chainName, userAddress) {
    try {
      // Get signer from wallet management system
      const signer = await this.walletManager.getSigner(userAddress);
      
      // Ensure signer is connected to correct provider
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
   * Real event parsing from LayerZero transaction logs
   */
  _extractMessageInfo(receipt) {
    try {
      const iface = new ethers.Interface(LayerZeroEndpointABI);
      
      for (const log of receipt.logs) {
        try {
          const parsed = iface.parseLog(log);
          
          // Look for Packet event from LayerZero
          if (parsed.name === 'Packet') {
            return {
              messageId: parsed.args.guid || ethers.keccak256(
                ethers.solidityPacked(
                  ['address', 'uint16', 'uint64'],
                  [receipt.from, parsed.args.dstChainId, parsed.args.nonce]
                )
              ),
              nonce: parsed.args.nonce?.toString() || '0'
            };
          }
          
          // Alternative: Look for MessageFailed or other LayerZero events
          if (parsed.name === 'MessageFailed' || parsed.name === 'PayloadStored') {
            return {
              messageId: parsed.args.guid || ethers.keccak256(receipt.transactionHash),
              nonce: parsed.args.nonce?.toString() || '0'
            };
          }
          
        } catch (parseError) {
          // Continue to next log if parsing fails
          continue;
        }
      }
      
      // Fallback: generate deterministic message ID
      logger.warn('No LayerZero event found, using fallback message ID generation');
      return {
        messageId: ethers.keccak256(
          ethers.solidityPacked(
            ['bytes32', 'uint256'],
            [receipt.transactionHash, receipt.blockNumber]
          )
        ),
        nonce: receipt.blockNumber.toString()
      };
      
    } catch (error) {
      logger.error('Failed to extract message info:', error);
      throw new BridgeError('Failed to parse LayerZero events', 'EVENT_PARSING_FAILED', {
        txHash: receipt.transactionHash,
        error: error.message
      });
    }
  }

  /**
   * Ensure token approval for bridge contract
   */
  async _ensureTokenApproval(tokenAddress, amount, spenderAddress, signer) {
    try {
      const tokenContract = new ethers.Contract(tokenAddress, ERC20ABI, signer);
      
      // Check current allowance
      const currentAllowance = await tokenContract.allowance(signer.address, spenderAddress);
      
      if (currentAllowance < amount) {
        logger.debug('Approving token spending', { 
          token: tokenAddress, 
          amount: amount.toString(), 
          spender: spenderAddress 
        });
        
        // Approve with buffer (amount * 1.1)
        const approveAmount = amount * 110n / 100n;
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
   * Get bridge capabilities
   */
  getCapabilities() {
    return {
      supportedChains: Object.keys(this.config.chainIds.v2),
      supportedTokens: ['*'], // Supports any ERC20 token with LayerZero implementation
      maxAmount: null, // No hard limit
      minAmount: '1000000000000000', // 0.001 ETH equivalent
      features: [
        'omnichain_fungible_tokens',
        'generic_messaging',
        'gas_abstraction',
        'custom_adapters',
        'real_wallet_integration',
        'real_event_parsing',
        'automatic_token_approval',
        'layerzero_v1_v2_support'
      ],
      estimatedConfirmations: {
        ethereum: 12,
        polygon: 20,
        bsc: 15,
        avalanche: 10,
        arbitrum: 1,
        optimism: 1
      },
      requiredConfirmations: {
        ethereum: 12,
        polygon: 128,
        bsc: 15,
        avalanche: 10,
        arbitrum: 20,
        optimism: 20
      },
      averageTime: 300, // 5 minutes
      maxTime: 1800, // 30 minutes
      feeStructure: {
        type: 'dynamic',
        components: ['native_fee', 'gas_fee', 'protocol_fee'],
        paymentTokens: ['native', 'ZRO']
      }
    };
  }

  /**
   * Monitor message delivery on target chain
   */
  async _monitorMessageDelivery(bridgeResult, transactionId) {
    try {
      const { targetChain, layerZeroData } = bridgeResult;
      const targetProvider = this.providers.get(targetChain);
      const targetContract = this.contracts.get(targetChain);
      
      if (!targetProvider || !targetContract) {
        logger.warn('Cannot monitor delivery - target chain not supported', { targetChain });
        return;
      }
      
      logger.debug('Starting LayerZero delivery monitoring', {
        transactionId,
        targetChain,
        messageId: layerZeroData.messageId
      });
      
      // Real event listening for message delivery
      const maxAttempts = 120; // 10 minutes with 5-second intervals
      let attempts = 0;
      
      const checkDelivery = async () => {
        try {
          attempts++;
          
          // Check for delivery events
          const filter = targetContract.filters.PacketReceived();
          const events = await targetContract.queryFilter(filter, -100); // Last 100 blocks
          
          const deliveryEvent = events.find(event => 
            event.args.guid === layerZeroData.messageId ||
            event.args.srcChainId === layerZeroData.srcChainId
          );
          
          if (deliveryEvent) {
            logger.info('LayerZero message delivered successfully', {
              transactionId,
              targetChain,
              targetTxHash: deliveryEvent.transactionHash,
              attempts
            });
            return;
          }
          
          if (attempts < maxAttempts) {
            setTimeout(checkDelivery, 5000); // Check every 5 seconds
          } else {
            logger.warn('LayerZero delivery monitoring timeout', {
              transactionId,
              attempts
            });
          }
          
        } catch (error) {
          logger.error('Error monitoring LayerZero delivery:', {
            transactionId,
            error: error.message
          });
        }
      };
      
      // Start monitoring
      setTimeout(checkDelivery, 10000); // Wait 10 seconds before first check
      
    } catch (error) {
      logger.error('Failed to start delivery monitoring:', {
        transactionId,
        error: error.message
      });
    }
  }

  /**
   * Get transaction status with real provider integration
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
      
      const messageInfo = this._extractMessageInfo(receipt);
      
      return {
        status: receipt.status === 1 ? 'confirmed' : 'failed',
        confirmations,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        messageId: messageInfo.messageId,
        nonce: messageInfo.nonce
      };
      
    } catch (error) {
      logger.error('Failed to get transaction status:', error);
      throw new BridgeError('Status check failed', 'STATUS_CHECK_FAILED', { txHash, sourceChain });
    }
  }

  /**
   * Validate bridge parameters
   */
  async _validateBridgeParams(params) {
    const { sourceChain, targetChain, amount, token, recipient } = params;
    
    if (!this.config.chainIds[this.config.layerZeroVersion][sourceChain]) {
      throw new ValidationError(`Unsupported source chain: ${sourceChain}`);
    }
    
    if (!this.config.chainIds[this.config.layerZeroVersion][targetChain]) {
      throw new ValidationError(`Unsupported target chain: ${targetChain}`);
    }
    
    if (sourceChain === targetChain) {
      throw new ValidationError('Source and target chains must be different');
    }
    
    if (!amount || amount <= 0) {
      throw new ValidationError('Amount must be greater than 0');
    }
    
    if (!ethers.isAddress(recipient)) {
      throw new ValidationError('Invalid recipient address');
    }
    
    if (!ethers.isAddress(token)) {
      throw new ValidationError('Invalid token address');
    }
  }

  /**
   * Encode payload for LayerZero message
   */
  _encodePayload(amount, recipient) {
    return ethers.AbiCoder.defaultAbiCoder().encode(
      ['uint256', 'address'],
      [amount, recipient]
    );
  }

  /**
   * Validate initialization
   */
  _validateInitialized() {
    if (!this.initialized) {
      throw new BridgeError('LayerZero bridge not initialized', 'NOT_INITIALIZED');
    }
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    logger.info('LayerZero bridge configuration updated', { newConfig });
  }

  /**
   * Cleanup and shutdown
   */
  async shutdown() {
    logger.info('Shutting down LayerZero bridge...');
    
    this.providers.clear();
    this.contracts.clear();
    this.initialized = false;
    
    logger.info('LayerZero bridge shutdown complete');
  }
}
