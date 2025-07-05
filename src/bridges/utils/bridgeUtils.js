// src/utils/bridgeUtils.js
// Production-grade runtime bridge utilities
// Runtime helper functions for bridge operations and cross-chain transfers

const { ethers } = require('ethers');
const { bridgeConfigLoader } = require('../bridges/utils/configLoader');
const { routeSelector } = require('../bridges/utils/routeSelector');
const { bridgeValidator } = require('../bridges/utils/bridgeValidator');

/**
 * Runtime Bridge Utilities
 * Provides helper functions for bridge operations, transaction building, and cross-chain transfers
 */

/**
 * Format bridge transfer amount with proper decimals
 * @param {string|number} amount - Amount to format
 * @param {number} decimals - Token decimals
 * @returns {string} Formatted amount as string
 */
function formatBridgeAmount(amount, decimals = 18) {
  try {
    if (!amount || amount === '0') return '0';
    
    const amountStr = amount.toString();
    const amountBN = ethers.utils.parseUnits(amountStr, decimals);
    
    return amountBN.toString();
  } catch (error) {
    console.error('❌ Error formatting bridge amount:', error.message);
    return '0';
  }
}

/**
 * Parse bridge amount from contract format to human readable
 * @param {string} rawAmount - Raw amount from contract
 * @param {number} decimals - Token decimals
 * @returns {string} Human readable amount
 */
function parseBridgeAmount(rawAmount, decimals = 18) {
  try {
    if (!rawAmount || rawAmount === '0') return '0';
    
    const formatted = ethers.utils.formatUnits(rawAmount, decimals);
    
    // Remove trailing zeros and decimal point if not needed
    return parseFloat(formatted).toString();
  } catch (error) {
    console.error('❌ Error parsing bridge amount:', error.message);
    return '0';
  }
}

/**
 * Calculate bridge transfer fees in user-friendly format
 * @param {string} bridgeKey - Bridge identifier
 * @param {string} fromNetwork - Source network
 * @param {string} toNetwork - Destination network
 * @param {string} amount - Transfer amount
 * @param {string} tokenSymbol - Token symbol
 * @returns {Object} Formatted fee breakdown
 */
async function calculateTransferFees(bridgeKey, fromNetwork, toNetwork, amount, tokenSymbol) {
  try {
    // Get route to access fee calculation
    const route = await routeSelector.getOptimalRoute({
      fromNetwork,
      toNetwork,
      tokenSymbol,
      amount,
      preferences: { preferredBridges: [bridgeKey] }
    });

    if (!route || route.bridgeKey !== bridgeKey) {
      throw new Error(`Unable to calculate fees for ${bridgeKey} route`);
    }

    const fees = route.fees;
    
    return {
      baseFee: {
        amount: fees.baseFee || 0,
        currency: fees.currency || 'USD',
        formatted: `$${(fees.baseFee || 0).toFixed(2)}`
      },
      percentageFee: {
        amount: fees.percentageFee || 0,
        currency: fees.currency || 'USD',
        formatted: `$${(fees.percentageFee || 0).toFixed(2)}`,
        percentage: fees.percentage ? `${fees.percentage}%` : '0%'
      },
      gasFee: {
        amount: fees.gasFee || 0,
        currency: fees.currency || 'USD',
        formatted: `$${(fees.gasFee || 0).toFixed(2)}`
      },
      protocolFee: {
        amount: fees.protocolFee || 0,
        currency: fees.currency || 'USD',
        formatted: `$${(fees.protocolFee || 0).toFixed(2)}`
      },
      total: {
        amount: fees.total || 0,
        currency: fees.currency || 'USD',
        formatted: `$${(fees.total || 0).toFixed(2)}`
      },
      breakdown: `Base: $${(fees.baseFee || 0).toFixed(2)} + Gas: $${(fees.gasFee || 0).toFixed(2)} + Protocol: $${(fees.protocolFee || 0).toFixed(2)}`
    };

  } catch (error) {
    console.error('❌ Error calculating transfer fees:', error.message);
    return {
      baseFee: { amount: 0, currency: 'USD', formatted: '$0.00' },
      percentageFee: { amount: 0, currency: 'USD', formatted: '$0.00', percentage: '0%' },
      gasFee: { amount: 0, currency: 'USD', formatted: '$0.00' },
      protocolFee: { amount: 0, currency: 'USD', formatted: '$0.00' },
      total: { amount: 0, currency: 'USD', formatted: '$0.00' },
      breakdown: 'Fee calculation unavailable',
      error: error.message
    };
  }
}

/**
 * Build bridge transaction data for contract interaction
 * @param {Object} transferParams - Transfer parameters
 * @returns {Object} Transaction data ready for signing
 */
async function buildBridgeTransaction(transferParams) {
  try {
    const {
      bridgeKey,
      fromNetwork,
      toNetwork,
      tokenSymbol,
      amount,
      fromAddress,
      toAddress,
      slippage = 0.5
    } = transferParams;

    // Validate transfer first
    const validation = await bridgeValidator.validateTransfer(transferParams);
    if (!validation.isValid) {
      throw new Error(`Transfer validation failed: ${validation.errors.join(', ')}`);
    }

    // Get bridge configuration
    const bridgeConfig = bridgeConfigLoader.getBridgeConfig(bridgeKey);
    if (!bridgeConfig) {
      throw new Error(`Bridge configuration not found: ${bridgeKey}`);
    }

    // Get contract address
    const contractAddress = bridgeConfigLoader.getContractAddress(bridgeKey, fromNetwork);
    if (!contractAddress) {
      throw new Error(`Contract address not found for ${bridgeKey} on ${fromNetwork}`);
    }

    // Get token configuration
    const tokenConfig = bridgeConfigLoader.getTokenConfig(tokenSymbol);
    if (!tokenConfig) {
      throw new Error(`Token configuration not found: ${tokenSymbol}`);
    }

    // Format amount with proper decimals
    const formattedAmount = formatBridgeAmount(amount, tokenConfig.decimals || 18);

    // Get destination network configuration
    const destNetworkConfig = bridgeConfigLoader.getNetworkConfig(toNetwork);
    const destChainId = destNetworkConfig?.chainId;
    const layerZeroDestChainId = destNetworkConfig?.layerZeroChainId;

    // Build transaction based on bridge type
    const bridgeType = bridgeConfigLoader.getBridgeType(bridgeKey);
    let txData;

    switch (bridgeType) {
      case 'layerzero':
        txData = await buildLayerZeroTransaction({
          contractAddress,
          fromAddress,
          toAddress,
          amount: formattedAmount,
          destChainId: layerZeroDestChainId,
          tokenAddress: tokenConfig.contracts?.[fromNetwork],
          bridgeKey
        });
        break;

      case 'wormhole':
        txData = await buildWormholeTransaction({
          contractAddress,
          fromAddress,
          toAddress,
          amount: formattedAmount,
          destChainId,
          tokenAddress: tokenConfig.contracts?.[fromNetwork]
        });
        break;

      case 'axelar':
        txData = await buildAxelarTransaction({
          contractAddress,
          fromAddress,
          toAddress,
          amount: formattedAmount,
          destChain: toNetwork,
          tokenSymbol
        });
        break;

      default:
        throw new Error(`Unsupported bridge type: ${bridgeType}`);
    }

    // Add common transaction parameters
    const transaction = {
      to: contractAddress,
      from: fromAddress,
      data: txData.data,
      value: txData.value || '0',
      gasLimit: null, // Will be estimated
      gasPrice: null, // Will be set by gas manager
      nonce: null,    // Will be set by transaction manager
      
      // Bridge-specific metadata
      metadata: {
        bridgeKey,
        bridgeType,
        fromNetwork,
        toNetwork,
        tokenSymbol,
        amount: formattedAmount,
        humanAmount: amount,
        destChainId,
        contractAddress,
        validation: validation.isValid,
        estimatedTime: bridgeConfig.estimatedTime || 15,
        slippage,
        createdAt: new Date().toISOString()
      }
    };

    console.log(`✅ Built ${bridgeType} transaction for ${amount} ${tokenSymbol}`);
    return transaction;

  } catch (error) {
    console.error('❌ Error building bridge transaction:', error.message);
    throw error;
  }
}

/**
 * Build LayerZero-specific transaction data
 * @param {Object} params - LayerZero transaction parameters
 * @returns {Object} LayerZero transaction data
 */
async function buildLayerZeroTransaction(params) {
  const {
    contractAddress,
    fromAddress,
    toAddress,
    amount,
    destChainId,
    tokenAddress,
    bridgeKey
  } = params;

  try {
    // LayerZero transaction encoding
    const iface = new ethers.utils.Interface([
      'function sendFrom(address _from, uint16 _dstChainId, bytes _toAddress, uint _amount, address payable _refundAddress, address _zroPaymentAddress, bytes _adapterParams) external payable'
    ]);

    // Encode destination address for LayerZero
    const toAddressBytes = ethers.utils.defaultAbiCoder.encode(['address'], [toAddress]);

    // Build adapter parameters (empty for basic transfer)
    const adapterParams = '0x';

    // Encode transaction data
    const data = iface.encodeFunctionData('sendFrom', [
      fromAddress,
      destChainId,
      toAddressBytes,
      amount,
      fromAddress, // refund address
      ethers.constants.AddressZero, // ZRO payment address
      adapterParams
    ]);

    return {
      data,
      value: '0' // LayerZero fees are calculated separately
    };

  } catch (error) {
    console.error('❌ Error building LayerZero transaction:', error.message);
    throw error;
  }
}

/**
 * Build Wormhole-specific transaction data
 * @param {Object} params - Wormhole transaction parameters
 * @returns {Object} Wormhole transaction data
 */
async function buildWormholeTransaction(params) {
  const {
    contractAddress,
    fromAddress,
    toAddress,
    amount,
    destChainId,
    tokenAddress
  } = params;

  try {
    // Wormhole transaction encoding
    const iface = new ethers.utils.Interface([
      'function transferTokens(address token, uint256 amount, uint16 recipientChain, bytes32 recipient, uint256 arbiterFee, uint32 nonce) external payable'
    ]);

    // Convert address to bytes32 for Wormhole
    const recipientBytes32 = ethers.utils.hexZeroPad(toAddress, 32);

    // Generate nonce
    const nonce = Math.floor(Date.now() / 1000);

    // Encode transaction data
    const data = iface.encodeFunctionData('transferTokens', [
      tokenAddress,
      amount,
      destChainId,
      recipientBytes32,
      0, // arbiter fee
      nonce
    ]);

    return {
      data,
      value: '0' // Wormhole fees are calculated separately
    };

  } catch (error) {
    console.error('❌ Error building Wormhole transaction:', error.message);
    throw error;
  }
}

/**
 * Build Axelar-specific transaction data
 * @param {Object} params - Axelar transaction parameters
 * @returns {Object} Axelar transaction data
 */
async function buildAxelarTransaction(params) {
  const {
    contractAddress,
    fromAddress,
    toAddress,
    amount,
    destChain,
    tokenSymbol
  } = params;

  try {
    // Axelar transaction encoding
    const iface = new ethers.utils.Interface([
      'function sendToken(string memory destinationChain, string memory destinationAddress, string memory symbol, uint256 amount) external'
    ]);

    // Encode transaction data
    const data = iface.encodeFunctionData('sendToken', [
      destChain,
      toAddress,
      tokenSymbol,
      amount
    ]);

    return {
      data,
      value: '0'
    };

  } catch (error) {
    console.error('❌ Error building Axelar transaction:', error.message);
    throw error;
  }
}

/**
 * Estimate gas for bridge transaction
 * @param {Object} transaction - Transaction object
 * @param {Object} provider - Ethereum provider
 * @returns {string} Estimated gas limit
 */
async function estimateBridgeGas(transaction, provider) {
  try {
    if (!provider || !provider.estimateGas) {
      throw new Error('Valid provider required for gas estimation');
    }

    const gasEstimate = await provider.estimateGas({
      to: transaction.to,
      from: transaction.from,
      data: transaction.data,
      value: transaction.value || '0'
    });

    // Add 20% buffer for safety
    const gasWithBuffer = gasEstimate.mul(120).div(100);
    
    console.log(`⛽ Estimated gas: ${gasEstimate.toString()} (with buffer: ${gasWithBuffer.toString()})`);
    return gasWithBuffer.toString();

  } catch (error) {
    console.error('❌ Error estimating bridge gas:', error.message);
    
    // Return default gas estimates based on bridge type
    const bridgeType = transaction.metadata?.bridgeType;
    const defaultGas = {
      layerzero: '300000',
      wormhole: '400000',
      axelar: '350000',
      chainlink: '250000',
      hyperlane: '300000',
      multichain: '200000'
    };
    
    return defaultGas[bridgeType] || '300000';
  }
}

/**
 * Generate bridge transaction ID for tracking
 * @param {Object} transferParams - Transfer parameters
 * @returns {string} Unique transaction ID
 */
function generateBridgeTransactionId(transferParams) {
  const {
    bridgeKey,
    fromNetwork,
    toNetwork,
    tokenSymbol,
    amount,
    fromAddress
  } = transferParams;

  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  
  const id = `${bridgeKey}-${fromNetwork}-${toNetwork}-${tokenSymbol}-${timestamp}-${randomSuffix}`;
  
  return id.toLowerCase();
}

/**
 * Parse bridge transaction receipt for tracking info
 * @param {Object} receipt - Transaction receipt
 * @param {string} bridgeKey - Bridge identifier
 * @returns {Object} Parsed bridge transaction info
 */
function parseBridgeTransactionReceipt(receipt, bridgeKey) {
  try {
    const bridgeType = bridgeConfigLoader.getBridgeType(bridgeKey);
    
    const txInfo = {
      transactionHash: receipt.transactionHash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed?.toString(),
      status: receipt.status === 1 ? 'success' : 'failed',
      bridgeKey,
      bridgeType,
      timestamp: Date.now(),
      logs: []
    };

    // Parse bridge-specific events
    switch (bridgeType) {
      case 'layerzero':
        txInfo.layerZeroData = parseLayerZeroLogs(receipt.logs);
        break;
      case 'wormhole':
        txInfo.wormholeData = parseWormholeLogs(receipt.logs);
        break;
      case 'axelar':
        txInfo.axelarData = parseAxelarLogs(receipt.logs);
        break;
    }

    return txInfo;

  } catch (error) {
    console.error('❌ Error parsing bridge transaction receipt:', error.message);
    return {
      transactionHash: receipt.transactionHash,
      status: 'unknown',
      error: error.message
    };
  }
}

/**
 * Parse LayerZero-specific transaction logs
 * @param {Array} logs - Transaction logs
 * @returns {Object} LayerZero-specific data
 */
function parseLayerZeroLogs(logs) {
  try {
    // LayerZero SendToChain event signature
    const sendToChainTopic = ethers.utils.id('SendToChain(uint16,address,bytes,uint64)');
    
    const layerZeroLogs = logs.filter(log => log.topics[0] === sendToChainTopic);
    
    if (layerZeroLogs.length > 0) {
      const log = layerZeroLogs[0];
      // Parse LayerZero event data
      return {
        destChainId: log.topics[1],
        recipient: log.topics[2],
        nonce: log.data,
        found: true
      };
    }

    return { found: false };

  } catch (error) {
    console.error('❌ Error parsing LayerZero logs:', error.message);
    return { found: false, error: error.message };
  }
}

/**
 * Parse Wormhole-specific transaction logs
 * @param {Array} logs - Transaction logs
 * @returns {Object} Wormhole-specific data
 */
function parseWormholeLogs(logs) {
  try {
    // Wormhole LogMessagePublished event signature
    const messageTopic = ethers.utils.id('LogMessagePublished(address,uint64,uint32,bytes,uint8)');
    
    const wormholeLogs = logs.filter(log => log.topics[0] === messageTopic);
    
    if (wormholeLogs.length > 0) {
      const log = wormholeLogs[0];
      return {
        sender: log.topics[1],
        sequence: log.topics[2],
        nonce: log.topics[3],
        found: true
      };
    }

    return { found: false };

  } catch (error) {
    console.error('❌ Error parsing Wormhole logs:', error.message);
    return { found: false, error: error.message };
  }
}

/**
 * Parse Axelar-specific transaction logs
 * @param {Array} logs - Transaction logs
 * @returns {Object} Axelar-specific data
 */
function parseAxelarLogs(logs) {
  try {
    // Axelar TokenSent event signature
    const tokenSentTopic = ethers.utils.id('TokenSent(address,string,string,string,uint256)');
    
    const axelarLogs = logs.filter(log => log.topics[0] === tokenSentTopic);
    
    if (axelarLogs.length > 0) {
      const log = axelarLogs[0];
      return {
        sender: log.topics[1],
        destinationChain: log.data,
        found: true
      };
    }

    return { found: false };

  } catch (error) {
    console.error('❌ Error parsing Axelar logs:', error.message);
    return { found: false, error: error.message };
  }
}

/**
 * Check if bridge transaction requires approval
 * @param {string} tokenAddress - Token contract address
 * @param {string} bridgeAddress - Bridge contract address
 * @param {string} userAddress - User wallet address
 * @param {string} amount - Transfer amount
 * @param {Object} provider - Ethereum provider
 * @returns {Object} Approval check result
 */
async function checkBridgeApproval(tokenAddress, bridgeAddress, userAddress, amount, provider) {
  try {
    if (!provider) {
      throw new Error('Provider required for approval check');
    }

    // ERC20 contract interface
    const erc20Interface = new ethers.utils.Interface([
      'function allowance(address owner, address spender) view returns (uint256)'
    ]);

    // Get current allowance
    const contract = new ethers.Contract(tokenAddress, erc20Interface, provider);
    const allowance = await contract.allowance(userAddress, bridgeAddress);

    const amountBN = ethers.BigNumber.from(amount);
    const needsApproval = allowance.lt(amountBN);

    return {
      needsApproval,
      currentAllowance: allowance.toString(),
      requiredAmount: amount,
      tokenAddress,
      bridgeAddress,
      userAddress
    };

  } catch (error) {
    console.error('❌ Error checking bridge approval:', error.message);
    return {
      needsApproval: true, // Assume approval needed on error
      error: error.message
    };
  }
}

/**
 * Build token approval transaction for bridge
 * @param {string} tokenAddress - Token contract address
 * @param {string} bridgeAddress - Bridge contract address
 * @param {string} amount - Amount to approve
 * @returns {Object} Approval transaction data
 */
function buildApprovalTransaction(tokenAddress, bridgeAddress, amount) {
  try {
    // ERC20 approve function interface
    const erc20Interface = new ethers.utils.Interface([
      'function approve(address spender, uint256 amount) returns (bool)'
    ]);

    // Use max uint256 for unlimited approval (common practice)
    const approvalAmount = amount === 'unlimited' 
      ? ethers.constants.MaxUint256 
      : ethers.BigNumber.from(amount);

    const data = erc20Interface.encodeFunctionData('approve', [
      bridgeAddress,
      approvalAmount
    ]);

    return {
      to: tokenAddress,
      data,
      value: '0',
      metadata: {
        type: 'token_approval',
        tokenAddress,
        spender: bridgeAddress,
        amount: approvalAmount.toString(),
        isUnlimited: amount === 'unlimited'
      }
    };

  } catch (error) {
    console.error('❌ Error building approval transaction:', error.message);
    throw error;
  }
}

/**
 * Get bridge transaction status and tracking info
 * @param {string} txHash - Transaction hash
 * @param {string} bridgeKey - Bridge identifier
 * @param {Object} provider - Ethereum provider
 * @returns {Object} Transaction status and tracking info
 */
async function getBridgeTransactionStatus(txHash, bridgeKey, provider) {
  try {
    if (!provider) {
      throw new Error('Provider required for transaction status check');
    }

    // Get transaction receipt
    const receipt = await provider.getTransactionReceipt(txHash);
    
    if (!receipt) {
      return {
        status: 'pending',
        txHash,
        bridgeKey,
        confirmations: 0
      };
    }

    // Get current block number for confirmations
    const currentBlock = await provider.getBlockNumber();
    const confirmations = currentBlock - receipt.blockNumber;

    // Parse bridge-specific data
    const bridgeData = parseBridgeTransactionReceipt(receipt, bridgeKey);

    return {
      status: receipt.status === 1 ? 'confirmed' : 'failed',
      txHash,
      bridgeKey,
      blockNumber: receipt.blockNumber,
      confirmations,
      gasUsed: receipt.gasUsed?.toString(),
      bridgeData,
      isComplete: confirmations >= 12, // Consider complete after 12 confirmations
      timestamp: Date.now()
    };

  } catch (error) {
    console.error('❌ Error getting bridge transaction status:', error.message);
    return {
      status: 'error',
      txHash,
      bridgeKey,
      error: error.message
    };
  }
}

module.exports = {
  // Amount formatting
  formatBridgeAmount,
  parseBridgeAmount,
  
  // Fee calculation
  calculateTransferFees,
  
  // Transaction building
  buildBridgeTransaction,
  buildLayerZeroTransaction,
  buildWormholeTransaction,
  buildAxelarTransaction,
  
  // Gas estimation
  estimateBridgeGas,
  
  // Transaction management
  generateBridgeTransactionId,
  parseBridgeTransactionReceipt,
  getBridgeTransactionStatus,
  
  // Approval handling
  checkBridgeApproval,
  buildApprovalTransaction,
  
  // Log parsing
  parseLayerZeroLogs,
  parseWormholeLogs,
  parseAxelarLogs
};
