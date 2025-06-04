/*  SendManager.js – v2.2.0  (MIT)
 *  Production-grade multi-chain send engine for Trust Crypto Wallet
 *  — Supports Ethereum, Polygon, BSC, Arbitrum One, Optimism, Avalanche-C
 *  — Handles native & ERC-20 sends, batching, cancellation, rate-limits
 *  — Broadcasting, monitoring, retry logic, webhooks
 *  — Uses ethers v6 BigInt APIs
 *  — Author: Trust Crypto Wallet Team
 */

import { ethers } from 'ethers';
import BigNumber from 'bignumber.js';

export default class SendManager {
  /*------------------------------------------------------------------*/
  /* CONSTRUCTOR / CONFIG                                             */
  /*------------------------------------------------------------------*/
  constructor (opts = {}) {
    this.initialized = false;

    this.config = {
      enableLogging:       opts.enableLogging            ?? false,
      maxTxPerMinute:      opts.maxTransactionsPerMinute ?? 10,
      gasMarginPct:        opts.gasMarginPercent         ?? 20,
      confirmationBlocks:  opts.confirmationBlocks       ?? 3,
      retryAttempts:       opts.retryAttempts            ?? 3,
      retryDelay:          opts.retryDelay               ?? 5_000,
      secureCleanup:       opts.secureCleanup            ?? true,
      enableBroadcasting:  opts.enableBroadcasting       ?? true,
      enableWebhooks:      opts.enableWebhooks           ?? false,
      monitoringInterval:  opts.monitoringInterval       ?? 15_000,
      transactionTimeout:  opts.transactionTimeout       ?? 300_000,
      maxPendingTxs:       opts.maxPendingTxs            ?? 100,
      enableBatchSending:  opts.enableBatchSending       ?? true,
      maxBatchSize:        opts.maxBatchSize             ?? 50,
      ...opts
    };

    /* ---------- Supported networks ---------- */
    this.networks = {
      ethereum: {
        name: 'Ethereum', chainId: 1, native: 'ETH',
        decimals: 18, gasLimit: { transfer: 21_000, erc20: 65_000, contract: 200_000 },
        blockTime: 15_000
      },
      polygon: {
        name: 'Polygon', chainId: 137, native: 'MATIC',
        decimals: 18, gasLimit: { transfer: 21_000, erc20: 65_000, contract: 200_000 },
        blockTime: 2_000
      },
      bsc: {
        name: 'BNB Smart Chain', chainId: 56, native: 'BNB',
        decimals: 18, gasLimit: { transfer: 21_000, erc20: 65_000, contract: 200_000 },
        blockTime: 3_000
      },
      arbitrum: {
        name: 'Arbitrum One', chainId: 42_161, native: 'ETH',
        decimals: 18, gasLimit: { transfer: 21_000, erc20: 100_000, contract: 300_000 },
        blockTime: 1_000
      },
      optimism: {
        name: 'Optimism', chainId: 10, native: 'ETH',
        decimals: 18, gasLimit: { transfer: 21_000, erc20: 80_000, contract: 250_000 },
        blockTime: 2_000
      },
      avalanche: {
        name: 'Avalanche C-Chain', chainId: 43_114, native: 'AVAX',
        decimals: 18, gasLimit: { transfer: 21_000, erc20: 65_000, contract: 200_000 },
        blockTime: 2_000
      }
    };

    /* ---------- State ---------- */
    this.rateLimiter         = new Map();   // clientId -> [ timestamps ]
    this.pendingTransactions = new Map();   // txId     -> { meta … }
    this.completedTransactions = new Map(); // txId     -> { meta … }
    this.failedTransactions  = new Map();   // txId     -> { meta … }
    this.monitoringIntervals = new Map();   // txId     -> intervalId
    this.nonceTracker        = new Map();   // address-network -> nonce
    this.auditLog            = [];          // last 1000 actions

    this.TX_STATUS = {
      PENDING:   'pending',
      SUBMITTED: 'submitted',
      CONFIRMED: 'confirmed',
      FAILED:    'failed',
      REPLACED:  'replaced',
      CANCELLED: 'cancelled'
    };

    this.ERROR_TYPES = {
      INSUFFICIENT_BALANCE: 'insufficient_balance',
      INSUFFICIENT_GAS: 'insufficient_gas',
      INVALID_ADDRESS: 'invalid_address',
      NETWORK_ERROR: 'network_error',
      NONCE_ERROR: 'nonce_error',
      RATE_LIMITED: 'rate_limited'
    };
  }

  /*------------------------------------------------------------------*/
  /* INITIALISATION                                                   */
  /*------------------------------------------------------------------*/
  async initialize (providers = {}, walletManager = null) {
    this.providers = providers;
    this.walletManager = walletManager;
    await this.#verifyNetworkConnections();
    await this.#initializeNonceTracking();
    this.#initRateLimiter();
    this.#initCleanupIntervals();
    this.initialized = true;
    this.#log('SendManager v2.2.0 ready');
    this.#audit('INIT_SUCCESS');
    return true;
  }

  /*------------------------------------------------------------------*/
  /* PUBLIC API – NATIVE SEND                                         */
  /*------------------------------------------------------------------*/
  async sendNative (params) {
    this.#preFlight();
    const p      = this.#validateSendParams(params);
    const netCfg = this.#netCfg(p.network);
    const txId   = this.#makeTxId();

    try {
      await this.#validateAddresses(p.fromAddress, p.toAddress);
      await this.#checkBalance(p.fromAddress, p.amount, null, p.network);

      const gasLimit = p.gasLimit || await this.#estimateGas({
        from: p.fromAddress, to: p.toAddress, value: p.amount, network: p.network
      });

      const gasPrice = p.gasPrice || await this.#optimalGasPrice(p.network);
      const totalCost = this.#totalCost(p.amount, gasLimit, gasPrice);
      await this.#assertNativeFunds(p.fromAddress, totalCost, p.network);

      const nonce = p.nonce ?? await this.#getNextNonce(p.fromAddress, p.network);

      const tx = {
        to:        p.toAddress,
        value:     ethers.parseEther(p.amount.toString()),
        gasLimit:  this.#applyGasMargin(gasLimit),
        gasPrice,
        nonce,
        chainId:   netCfg.chainId
      };

      const txHash = await this.#signAndBroadcast(tx, p.fromAddress, p.network);
      const txData = this.#track(txId, txHash, p.network, { 
        type: 'native', 
        amount: p.amount.toString(), 
        from: p.fromAddress,
        to: p.toAddress,
        gasLimit: tx.gasLimit.toString(),
        gasPrice: tx.gasPrice.toString(),
        ...p 
      });

      // Start monitoring
      await this.#startTransactionMonitoring(txId);

      this.#audit('NATIVE_SENT', { txId, txHash, amount: p.amount.toString() });

      return {
        transactionId: txId, txHash, network: p.network,
        type: 'native', amount: p.amount.toString(),
        from: p.fromAddress, to: p.toAddress,
        gasPrice: tx.gasPrice.toString(), gasLimit: tx.gasLimit.toString(),
        status: this.TX_STATUS.SUBMITTED, timestamp: Date.now(),
        estimatedConfirmation: Date.now() + (netCfg.blockTime * this.config.confirmationBlocks)
      };

    } catch (err) {
      this.#handleTransactionError(txId, err);
      throw err;
    } finally {
      if (this.config.secureCleanup && p.privateKey) this.#scrub(p.privateKey);
    }
  }

  /*------------------------------------------------------------------*/
  /* PUBLIC API – ERC-20 SEND                                         */
  /*------------------------------------------------------------------*/
  async sendToken (params) {
    this.#preFlight();
    const p      = this.#validateTokenParams(params);
    const prov   = this.#prov(p.network);
    const txId   = this.#makeTxId();

    try {
      await this.#validateAddresses(p.fromAddress, p.toAddress);
      await this.#validateTokenAddress(p.tokenAddress, p.network);

      const token = await this.#tokenContract(p.tokenAddress, p.network);
      await this.#checkTokenBalance(p.fromAddress, token, p.amount, p.decimals);

      const gasLimit = p.gasLimit || await this.#estimateTokenGas({
        from: p.fromAddress, to: p.toAddress, token, amount: p.amount, decimals: p.decimals
      });
      const gasPrice = p.gasPrice || await this.#optimalGasPrice(p.network);
      const gasCost  = new BigNumber(String(gasLimit)).times(gasPrice.toString());
      await this.#assertNativeFunds(p.fromAddress, gasCost.div(1e18), p.network);

      const nonce = p.nonce ?? await this.#getNextNonce(p.fromAddress, p.network);

      const txReq = await token.transfer.populateTransaction(
        p.toAddress,
        ethers.parseUnits(p.amount.toString(), p.decimals)
      );
      txReq.gasLimit = this.#applyGasMargin(gasLimit);
      txReq.gasPrice = gasPrice;
      txReq.nonce    = nonce;

      const txHash = await this.#signAndBroadcast(txReq, p.fromAddress, p.network);
      const txData = this.#track(txId, txHash, p.network, { 
        type: 'token', 
        tokenAddress: p.tokenAddress,
        amount: p.amount.toString(),
        decimals: p.decimals,
        from: p.fromAddress,
        to: p.toAddress,
        ...p 
      });

      // Start monitoring
      await this.#startTransactionMonitoring(txId);

      this.#audit('TOKEN_SENT', { txId, txHash, tokenAddress: p.tokenAddress, amount: p.amount.toString() });

      return {
        transactionId: txId, txHash, network: p.network,
        type: 'token', tokenAddress: p.tokenAddress,
        amount: p.amount.toString(), decimals: p.decimals,
        from: p.fromAddress, to: p.toAddress,
        gasPrice: txReq.gasPrice.toString(), gasLimit: txReq.gasLimit.toString(),
        status: this.TX_STATUS.SUBMITTED, timestamp: Date.now(),
        estimatedConfirmation: Date.now() + (this.#netCfg(p.network).blockTime * this.config.confirmationBlocks)
      };

    } catch (err) {
      this.#handleTransactionError(txId, err);
      throw err;
    } finally {
      if (this.config.secureCleanup && p.privateKey) this.#scrub(p.privateKey);
    }
  }

  /*------------------------------------------------------------------*/
  /* PUBLIC API – BATCH SEND                                          */
  /*------------------------------------------------------------------*/
  async sendBatch (transactions) {
    this.#preFlight();

    if (!this.config.enableBatchSending) {
      throw new Error('Batch sending is disabled');
    }

    if (transactions.length > this.config.maxBatchSize) {
      throw new Error(`Batch size exceeds maximum: ${this.config.maxBatchSize}`);
    }

    const batchId = this.#makeBatchId();
    const results = [];

    try {
      this.#log(`Starting batch send: ${batchId} (${transactions.length} transactions)`);
      this.#audit('BATCH_STARTED', { batchId, count: transactions.length });

      // Group by network for optimization
      const groupedTxs = this.#groupTransactionsByNetwork(transactions);

      for (const [network, networkTxs] of Object.entries(groupedTxs)) {
        const networkResults = await this.#processBatchForNetwork(network, networkTxs, batchId);
        results.push(...networkResults);
      }

      this.#audit('BATCH_COMPLETED', {
        batchId,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length
      });

      return results;

    } catch (error) {
      this.#logErr('Batch send failed', error);
      this.#audit('BATCH_FAILED', { batchId, error: error.message });
      throw error;
    }
  }

  /*------------------------------------------------------------------*/
  /* PUBLIC API – TRANSACTION STATUS                                  */
  /*------------------------------------------------------------------*/
  async getTransactionStatus (transactionId) {
    this.#preFlight();

    const transaction = this.pendingTransactions.get(transactionId) ||
                       this.completedTransactions.get(transactionId) ||
                       this.failedTransactions.get(transactionId);

    if (!transaction) {
      throw new Error('Transaction not found');
    }

    try {
      // Update status if still pending
      if (transaction.status === this.TX_STATUS.SUBMITTED && transaction.hash) {
        await this.#updateTransactionStatus(transactionId);
      }

      return {
        transactionId,
        hash: transaction.hash,
        status: transaction.status,
        network: transaction.network,
        type: transaction.type,
        from: transaction.from,
        to: transaction.to,
        amount: transaction.amount,
        tokenAddress: transaction.tokenAddress,
        confirmations: transaction.confirmations || 0,
        created: transaction.created,
        submitted: transaction.submitted,
        confirmed: transaction.confirmed,
        failed: transaction.failed,
        error: transaction.error,
        gasUsed: transaction.gasUsed,
        effectiveGasPrice: transaction.effectiveGasPrice,
        totalCost: transaction.totalCost,
        blockNumber: transaction.blockNumber
      };

    } catch (error) {
      this.#logErr('Transaction status check failed', error);
      throw new Error(`Status check failed: ${error.message}`);
    }
  }

  /*------------------------------------------------------------------*/
  /* PUBLIC API – CANCEL TRANSACTION                                  */
  /*------------------------------------------------------------------*/
  async cancelTransaction (transactionId, options = {}) {
    this.#preFlight();

    const transaction = this.pendingTransactions.get(transactionId);
    
    if (!transaction) {
      throw new Error('Transaction not found or not pending');
    }

    if (transaction.status === this.TX_STATUS.CONFIRMED) {
      throw new Error('Cannot cancel confirmed transaction');
    }

    try {
      const { gasPrice: newGasPrice } = options;
      const currentGasPrice = newGasPrice || (BigInt(transaction.gasPrice) * BigInt(120) / BigInt(100));

      const cancelTx = {
        from: transaction.from,
        to: transaction.from, // Send to self
        value: '0',
        gasLimit: '21000',
        gasPrice: currentGasPrice.toString(),
        nonce: transaction.nonce
      };

      const cancelHash = await this.#signAndBroadcast(cancelTx, transaction.from, transaction.network);

      transaction.status = this.TX_STATUS.CANCELLED;
      transaction.cancelled = Date.now();
      transaction.cancelTxHash = cancelHash;

      this.#moveToCompleted(transactionId);

      this.#audit('TRANSACTION_CANCELLED', { transactionId, cancelHash });

      return {
        success: true,
        transactionId,
        cancelTxHash: cancelHash,
        originalTxHash: transaction.hash,
        status: this.TX_STATUS.CANCELLED
      };

    } catch (error) {
      this.#logErr('Transaction cancellation failed', error);
      throw new Error(`Cancellation failed: ${error.message}`);
    }
  }

  /*------------------------------------------------------------------*/
  /* PUBLIC API – SPEED UP TRANSACTION                                */
  /*------------------------------------------------------------------*/
  async speedUpTransaction (transactionId, options = {}) {
    this.#preFlight();

    const transaction = this.pendingTransactions.get(transactionId);
    
    if (!transaction) {
      throw new Error('Transaction not found or not pending');
    }

    if (transaction.status === this.TX_STATUS.CONFIRMED) {
      throw new Error('Cannot speed up confirmed transaction');
    }

    try {
      const { gasPrice: newGasPrice } = options;
      const currentGasPrice = newGasPrice || (BigInt(transaction.gasPrice) * BigInt(150) / BigInt(100));

      const speedUpTx = {
        ...transaction.originalTx,
        gasPrice: currentGasPrice.toString()
      };

      const speedUpHash = await this.#signAndBroadcast(speedUpTx, transaction.from, transaction.network);

      transaction.status = this.TX_STATUS.REPLACED;
      transaction.replaced = Date.now();
      transaction.replacementHash = speedUpHash;

      const newTransactionId = this.#makeTxId();
      const newTransaction = {
        ...transaction,
        transactionId: newTransactionId,
        hash: speedUpHash,
        status: this.TX_STATUS.SUBMITTED,
        gasPrice: currentGasPrice.toString(),
        originalTransactionId: transactionId,
        isReplacement: true
      };

      this.pendingTransactions.set(newTransactionId, newTransaction);
      this.#moveToCompleted(transactionId);

      await this.#startTransactionMonitoring(newTransactionId);

      this.#audit('TRANSACTION_SPEED_UP', { originalTransactionId: transactionId, newTransactionId, speedUpHash });

      return {
        success: true,
        originalTransactionId: transactionId,
        newTransactionId,
        newTxHash: speedUpHash,
        status: this.TX_STATUS.SUBMITTED
      };

    } catch (error) {
      this.#logErr('Transaction speed up failed', error);
      throw new Error(`Speed up failed: ${error.message}`);
    }
  }

  /*------------------------------------------------------------------*/
  /* PUBLIC API – GAS ESTIMATION                                      */
  /*------------------------------------------------------------------*/
  async estimateGas (params) {
    this.#preFlight();

    const { fromAddress, toAddress, amount, tokenAddress, decimals, network, data = '0x' } = params;

    try {
      const provider = this.#prov(network);
      let gasEstimate;

      if (tokenAddress) {
        const token = await this.#tokenContract(tokenAddress, network);
        const transferAmount = ethers.parseUnits(amount.toString(), decimals || 18);
        gasEstimate = await token.transfer.estimateGas(toAddress, transferAmount);
      } else {
        gasEstimate = await provider.estimateGas({
          from: fromAddress,
          to: toAddress,
          value: ethers.parseEther(amount.toString()),
          data
        });
      }

      const bufferedGas = this.#applyGasMargin(gasEstimate);
      const feeData = await provider.getFeeData();
      const gasPrice = feeData.gasPrice;
      const totalCost = bufferedGas * gasPrice;

      return {
        gasLimit: bufferedGas.toString(),
        gasPrice: gasPrice.toString(),
        estimatedCost: ethers.formatEther(totalCost),
        estimatedCostWei: totalCost.toString(),
        network,
        currency: this.#netCfg(network).native
      };

    } catch (error) {
      this.#logErr('Gas estimation failed', error);
      throw new Error(`Gas estimation failed: ${error.message}`);
    }
  }

  /*------------------------------------------------------------------*/
  /* PUBLIC API – UTILITIES                                           */
  /*------------------------------------------------------------------*/
  getStatistics () {
    return {
      pending: this.pendingTransactions.size,
      completed: this.completedTransactions.size,
      failed: this.failedTransactions.size,
      monitoring: this.monitoringIntervals.size,
      auditLogEntries: this.auditLog.length,
      lastActivity: Math.max(
        ...Array.from(this.pendingTransactions.values()).map(tx => tx.created),
        ...Array.from(this.completedTransactions.values()).map(tx => tx.confirmed || tx.created),
        ...Array.from(this.failedTransactions.values()).map(tx => tx.failed || tx.created),
        0
      )
    };
  }

  getPendingTransactions () {
    return Array.from(this.pendingTransactions.values()).map(tx => ({
      transactionId: tx.transactionId,
      hash: tx.hash,
      network: tx.network,
      type: tx.type,
      from: tx.from,
      to: tx.to,
      amount: tx.amount,
      status: tx.status,
      created: tx.created,
      submitted: tx.submitted
    }));
  }

  async shutdown () {
    this.#log('Shutting down SendManager...');
    
    for (const intervalId of this.monitoringIntervals.values()) {
      clearInterval(intervalId);
    }
    this.monitoringIntervals.clear();

    const pendingCount = this.pendingTransactions.size;
    if (pendingCount > 0) {
      this.#log(`Waiting for ${pendingCount} pending transactions...`);
      
      const maxWait = 30_000;
      const startTime = Date.now();
      
      while (this.pendingTransactions.size > 0 && (Date.now() - startTime) < maxWait) {
        await new Promise(resolve => setTimeout(resolve, 1_000));
      }
    }

    this.initialized = false;
    this.#log('SendManager shutdown complete');
    this.#audit('SHUTDOWN');
  }

  /*------------------------------------------------------------------*/
  /* PRIVATE HELPERS                                                  */
  /*------------------------------------------------------------------*/
  #preFlight () {
    if (!this.initialized) throw new Error('SendManager not initialized');
    if (this.pendingTransactions.size >= this.config.maxPendingTxs) {
      throw new Error('Maximum pending transactions exceeded');
    }
  }

  #validateSendParams (params) {
    const { fromAddress, toAddress, amount, network, gasPrice, gasLimit, nonce, privateKey } = params;

    if (!fromAddress || !ethers.isAddress(fromAddress)) {
      throw new Error('Invalid from address');
    }
    if (!toAddress || !ethers.isAddress(toAddress)) {
      throw new Error('Invalid to address');
    }
    if (!amount || isNaN(amount) || Number(amount) <= 0) {
      throw new Error('Invalid amount');
    }
    if (!network || !this.networks[network]) {
      throw new Error('Invalid or unsupported network');
    }
    if (gasPrice && (isNaN(gasPrice) || Number(gasPrice) <= 0)) {
      throw new Error('Invalid gas price');
    }
    if (gasLimit && (isNaN(gasLimit) || Number(gasLimit) <= 0)) {
      throw new Error('Invalid gas limit');
    }
    if (nonce && (isNaN(nonce) || Number(nonce) < 0)) {
      throw new Error('Invalid nonce');
    }

    return {
      fromAddress: fromAddress.toLowerCase(),
      toAddress: toAddress.toLowerCase(),
      amount: new BigNumber(amount),
      network,
      gasPrice,
      gasLimit,
      nonce,
      privateKey
    };
  }

  #validateTokenParams (params) {
    const baseParams = this.#validateSendParams(params);
    const { tokenAddress, decimals } = params;

    if (!tokenAddress || !ethers.isAddress(tokenAddress)) {
      throw new Error('Invalid token address');
    }
    if (decimals === undefined || isNaN(decimals) || Number(decimals) < 0 || Number(decimals) > 18) {
      throw new Error('Invalid token decimals');
    }

    return {
      ...baseParams,
      tokenAddress: tokenAddress.toLowerCase(),
      decimals: Number(decimals)
    };
  }

  async #validateAddresses (fromAddress, toAddress) {
    if (fromAddress.toLowerCase() === toAddress.toLowerCase()) {
      throw new Error('Cannot send to same address');
    }

    if (this.walletManager) {
      const hasPrivateKey = await this.walletManager.hasPrivateKey(fromAddress);
      if (!hasPrivateKey) {
        throw new Error('Private key not available for from address');
      }
    }
  }

  async #validateTokenAddress (tokenAddress, network) {
    try {
      const provider = this.#prov(network);
      const code = await provider.getCode(tokenAddress);
      
      if (code === '0x') {
        throw new Error('Token address is not a contract');
      }

      const tokenContract = new ethers.Contract(
        tokenAddress,
        ['function symbol() view returns (string)'],
        provider
      );
      await tokenContract.symbol();
      
    } catch (error) {
      throw new Error(`Token validation failed: ${error.message}`);
    }
  }

  async #checkBalance (address, amount, tokenAddr, network) {
    const prov = this.#prov(network);
    const balance = await prov.getBalance(address);
    const balanceEther = ethers.formatEther(balance);
    
    if (new BigNumber(balanceEther).lt(amount)) {
      throw new Error(`${this.ERROR_TYPES.INSUFFICIENT_BALANCE}: ${balanceEther} < ${amount}`);
    }
  }

  async #checkTokenBalance (address, tokenContract, amount, decimals) {
    const balance = await tokenContract.balanceOf(address);
    const balanceFormatted = ethers.formatUnits(balance, decimals);
    
    if (new BigNumber(balanceFormatted).lt(amount)) {
      throw new Error(`${this.ERROR_TYPES.INSUFFICIENT_BALANCE}: ${balanceFormatted} < ${amount}`);
    }
  }

  async #estimateGas (params) {
    const { from, to, value, network } = params;
    const prov = this.#prov(network);
    
    try {
      return await prov.estimateGas({
        from, to, value: ethers.parseEther(value.toString())
      });
    } catch (err) {
      return BigInt(this.#netCfg(network).gasLimit.transfer);
    }
  }

  async #estimateTokenGas (params) {
    const { from, to, token, amount, decimals } = params;
    
    try {
      const transferAmount = ethers.parseUnits(amount.toString(), decimals);
      return await token.transfer.estimateGas(to, transferAmount);
    } catch (err) {
      return BigInt(this.#netCfg(params.network || 'ethereum').gasLimit.erc20);
    }
  }

  async #optimalGasPrice (network) {
    const prov = this.#prov(network);
    const feeData = await prov.getFeeData();
    return feeData.gasPrice;
  }

  #totalCost (amount, gasLimit, gasPrice) {
    const gasCost = new BigNumber(String(gasLimit)).times(gasPrice.toString()).div(1e18);
    return new BigNumber(amount).plus(gasCost);
  }

  async #assertNativeFunds (address, totalNeeded, network) {
    const prov = this.#prov(network);
    const balance = await prov.getBalance(address);
    const balanceEther = new BigNumber(ethers.formatEther(balance));
    
    if (balanceEther.lt(totalNeeded)) {
      throw new Error(`${this.ERROR_TYPES.INSUFFICIENT_GAS}: Need ${totalNeeded}, have ${balanceEther}`);
    }
  }

  async #tokenContract (tokenAddr, network) {
    const prov = this.#prov(network);
    return new ethers.Contract(tokenAddr, [
      'function transfer(address to, uint256 amount) returns (bool)',
      'function balanceOf(address account) view returns (uint256)'
    ], prov);
  }

  async #getNextNonce (address, network) {
    try {
      const provider = this.#prov(network);
      const networkNonce = await provider.getTransactionCount(address, 'pending');
      
      const addressKey = `${address}-${network}`;
      const localNonce = this.nonceTracker.get(addressKey) || networkNonce;
      const nextNonce = Math.max(networkNonce, localNonce);
      
      this.nonceTracker.set(addressKey, nextNonce + 1);
      
      return nextNonce;
    } catch (error) {
      throw new Error(`Nonce retrieval failed: ${error.message}`);
    }
  }

  async #signAndBroadcast (tx, fromAddress, network) {
    try {
      if (this.config.enableBroadcasting) {
        return await this.#broadcastTransaction(tx, fromAddress, network);
      } else {
        return await this.#signAndSend(tx, fromAddress, network);
      }
    } catch (error) {
      if (error.code === 'NONCE_EXPIRED' || error.message.includes('nonce')) {
        throw new Error(`${this.ERROR_TYPES.NONCE_ERROR}: ${error.message}`);
      } else if (error.code === 'INSUFFICIENT_FUNDS') {
        throw new Error(`${this.ERROR_TYPES.INSUFFICIENT_GAS}: ${error.message}`);
      } else if (error.code === 'NETWORK_ERROR') {
        throw new Error(`${this.ERROR_TYPES.NETWORK_ERROR}: ${error.message}`);
      }
      
      throw new Error(`Transaction failed: ${error.message}`);
    }
  }

  async #broadcastTransaction (tx, fromAddress, network) {
    const providers = Array.isArray(this.providers[network]) 
      ? this.providers[network] 
      : [this.providers[network]];

    const signer = await this.walletManager.getSigner(fromAddress, network);
    const signedTx = await signer.signTransaction(tx);

    const promises = providers.map(async (provider, index) => {
      try {
        const response = await provider.broadcastTransaction(signedTx);
        this.#log(`Transaction broadcasted via provider ${index}: ${response.hash}`);
        return response;
      } catch (error) {
        this.#logErr(`Broadcast failed via provider ${index}`, error);
        throw error;
      }
    });

    // Return first successful broadcast
