/*  ReceiveManager.js – v2.2.0  (MIT)
 *  Production-grade multi-chain receive engine for Trust Crypto Wallet
 *  — Supports Ethereum, Polygon, BSC, Arbitrum One, Optimism, Avalanche-C
 *  — Handles native & ERC-20 receives, monitoring, QR generation, invoicing
 *  — Real-time payment tracking with webhooks and confirmation management
 *  — Uses ethers v6 BigInt APIs
 *  — Author: Trust Crypto Wallet Team
 */

import { ethers } from 'ethers';
import BigNumber from 'bignumber.js';
import QRCode from 'qrcode';

export default class ReceiveManager {
  /*------------------------------------------------------------------*/
  /* CONSTRUCTOR / CONFIG                                             */
  /*------------------------------------------------------------------*/
  constructor (opts = {}) {
    this.initialized = false;

    this.config = {
      enableLogging:       opts.enableLogging            ?? false,
      confirmationBlocks:  opts.confirmationBlocks       ?? 3,
      paymentTimeout:      opts.paymentTimeout           ?? 3_600_000, // 1 hour
      monitoringInterval:  opts.monitoringInterval       ?? 15_000,    // 15 seconds
      amountTolerance:     opts.amountTolerance           ?? 0.01,      // 1%
      maxActiveRequests:   opts.maxActiveRequests        ?? 100,
      enableWebhooks:      opts.enableWebhooks           ?? false,
      enableInvoicing:     opts.enableInvoicing          ?? true,
      qrCodeSize:          opts.qrCodeSize               ?? 300,
      cleanupInterval:     opts.cleanupInterval          ?? 300_000,   // 5 minutes
      retentionPeriod:     opts.retentionPeriod          ?? 86_400_000, // 24 hours
      ...opts
    };

    /* ---------- Supported networks ---------- */
    this.networks = {
      ethereum: {
        name: 'Ethereum', chainId: 1, native: 'ETH',
        decimals: 18, blockTime: 15_000, prefix: 'ethereum'
      },
      polygon: {
        name: 'Polygon', chainId: 137, native: 'MATIC',
        decimals: 18, blockTime: 2_000, prefix: 'polygon'
      },
      bsc: {
        name: 'BNB Smart Chain', chainId: 56, native: 'BNB',
        decimals: 18, blockTime: 3_000, prefix: 'bnb'
      },
      arbitrum: {
        name: 'Arbitrum One', chainId: 42_161, native: 'ETH',
        decimals: 18, blockTime: 1_000, prefix: 'arbitrum'
      },
      optimism: {
        name: 'Optimism', chainId: 10, native: 'ETH',
        decimals: 18, blockTime: 2_000, prefix: 'optimism'
      },
      avalanche: {
        name: 'Avalanche C-Chain', chainId: 43_114, native: 'AVAX',
        decimals: 18, blockTime: 2_000, prefix: 'avalanche'
      }
    };

    /* ---------- State ---------- */
    this.activePaymentRequests = new Map();   // requestId -> payment data
    this.completedPayments     = new Map();   // requestId -> completed payment
    this.monitoringIntervals   = new Map();   // requestId -> intervalId
    this.addressMonitors       = new Map();   // monitorId -> monitoring session
    this.invoices              = new Map();   // invoiceId -> invoice data
    this.auditLog              = [];          // last 1000 actions

    this.PAYMENT_STATUS = {
      PENDING:   'pending',
      RECEIVED:  'received',
      CONFIRMED: 'confirmed',
      EXPIRED:   'expired',
      OVERPAID:  'overpaid',
      UNDERPAID: 'underpaid'
    };

    this.ERROR_TYPES = {
      INVALID_ADDRESS: 'invalid_address',
      INVALID_AMOUNT: 'invalid_amount',
      INVALID_NETWORK: 'invalid_network',
      REQUEST_NOT_FOUND: 'request_not_found',
      EXPIRED_REQUEST: 'expired_request',
      NETWORK_ERROR: 'network_error'
    };
  }

  /*------------------------------------------------------------------*/
  /* INITIALISATION                                                   */
  /*------------------------------------------------------------------*/
  async initialize (providers = {}, addressGenerator = null) {
    this.providers = providers;
    this.addressGenerator = addressGenerator;
    
    await this.#verifyNetworkConnections();
    this.#initCleanupIntervals();
    
    this.initialized = true;
    this.#log('ReceiveManager v2.2.0 ready');
    this.#audit('INIT_SUCCESS');
    return true;
  }

  /*------------------------------------------------------------------*/
  /* PUBLIC API – ADDRESS GENERATION                                  */
  /*------------------------------------------------------------------*/
  async generateReceivingAddress (params) {
    this.#preFlight();

    const {
      network,
      derivationPath,
      masterSeed,
      metadata = {}
    } = this.#validateAddressParams(params);

    const addressId = this.#makeAddressId();

    try {
      const addressData = await this.addressGenerator.generateAddress(
        network,
        derivationPath,
        masterSeed
      );

      const receivingAddress = {
        addressId,
        address: addressData.address,
        network,
        derivationPath,
        created: Date.now(),
        used: false,
        metadata: {
          ...this.#sanitizeMetadata(metadata),
          version: '2.2.0'
        }
      };

      this.#audit('ADDRESS_GENERATED', {
        addressId,
        address: addressData.address,
        network
      });

      return receivingAddress;

    } catch (error) {
      this.#audit('ADDRESS_GENERATION_FAILED', {
        addressId,
        error: error.message
      });
      throw new Error(`Address generation failed: ${error.message}`);
    }
  }

  /*------------------------------------------------------------------*/
  /* PUBLIC API – PAYMENT REQUEST                                     */
  /*------------------------------------------------------------------*/
  async createPaymentRequest (params) {
    this.#preFlight();

    if (this.activePaymentRequests.size >= this.config.maxActiveRequests) {
      throw new Error('Maximum active payment requests exceeded');
    }

    const {
      address,
      network,
      amount,
      tokenAddress,
      decimals,
      description,
      expiresIn,
      webhookUrl,
      metadata = {}
    } = this.#validatePaymentParams(params);

    const requestId = this.#makeRequestId();
    const expiresAt = Date.now() + (expiresIn || this.config.paymentTimeout);

    try {
      await this.#validateReceivingAddress(address, network);

      const paymentRequest = {
        requestId,
        address,
        network,
        amount: amount.toString(),
        tokenAddress,
        decimals,
        description,
        status: this.PAYMENT_STATUS.PENDING,
        created: Date.now(),
        expiresAt,
        confirmations: 0,
        webhookUrl,
        metadata: {
          ...this.#sanitizeMetadata(metadata),
          version: '2.2.0'
        }
      };

      // Generate QR code
      const qrCode = await this.#generatePaymentQR(paymentRequest);
      paymentRequest.qrCode = qrCode;

      // Store active request
      this.activePaymentRequests.set(requestId, paymentRequest);

      // Start monitoring
      await this.#startPaymentMonitoring(requestId);

      this.#audit('PAYMENT_REQUEST_CREATED', {
        requestId,
        address,
        network,
        amount: amount.toString(),
        tokenAddress
      });

      return paymentRequest;

    } catch (error) {
      this.#audit('PAYMENT_REQUEST_FAILED', {
        requestId,
        error: error.message
      });
      throw new Error(`Payment request creation failed: ${error.message}`);
    }
  }

  /*------------------------------------------------------------------*/
  /* PUBLIC API – PAYMENT STATUS                                      */
  /*------------------------------------------------------------------*/
  async getPaymentStatus (requestId) {
    this.#preFlight();

    const request = this.activePaymentRequests.get(requestId) || 
                   this.completedPayments.get(requestId);

    if (!request) {
      throw new Error(`${this.ERROR_TYPES.REQUEST_NOT_FOUND}: Payment request not found`);
    }

    try {
      // Check if expired
      if (Date.now() > request.expiresAt && request.status === this.PAYMENT_STATUS.PENDING) {
        request.status = this.PAYMENT_STATUS.EXPIRED;
        this.#moveToCompleted(requestId);
      }

      // Get latest blockchain status if still active
      if (this.activePaymentRequests.has(requestId)) {
        await this.#updatePaymentStatus(requestId);
      }

      return {
        requestId,
        status: request.status,
        amount: request.amount,
        receivedAmount: request.receivedAmount || '0',
        confirmations: request.confirmations || 0,
        txHash: request.txHash,
        isExpired: Date.now() > request.expiresAt,
        timeRemaining: Math.max(0, request.expiresAt - Date.now()),
        created: request.created,
        completed: request.completed,
        network: request.network,
        address: request.address,
        tokenAddress: request.tokenAddress,
        qrCode: request.qrCode
      };

    } catch (error) {
      this.#logErr('Payment status check failed', error);
      throw new Error(`Status check failed: ${error.message}`);
    }
  }

  /*------------------------------------------------------------------*/
  /* PUBLIC API – ADDRESS MONITORING                                  */
  /*------------------------------------------------------------------*/
  async monitorAddress (params) {
    this.#preFlight();

    const {
      address,
      network,
      callback,
      tokenAddress,
      startBlock
    } = this.#validateMonitoringParams(params);

    const monitorId = this.#makeMonitorId();

    try {
      const provider = this.#prov(network);
      const currentBlock = await provider.getBlockNumber();
      const fromBlock = startBlock || currentBlock;

      const monitoringSession = {
        monitorId,
        address,
        network,
        tokenAddress,
        fromBlock,
        lastCheckedBlock: fromBlock,
        callback,
        active: true,
        created: Date.now()
      };

      // Start monitoring loop
      const intervalId = setInterval(async () => {
        try {
          await this.#checkForPayments(monitoringSession);
        } catch (error) {
          this.#logErr('Payment monitoring error', error);
        }
      }, this.config.monitoringInterval);

      this.monitoringIntervals.set(monitorId, intervalId);
      this.addressMonitors.set(monitorId, monitoringSession);

      this.#audit('MONITORING_STARTED', {
        monitorId,
        address,
        network
      });

      return {
        monitorId,
        address,
        network,
        startBlock: fromBlock,
        status: 'active'
      };

    } catch (error) {
      this.#logErr('Address monitoring failed', error);
      throw new Error(`Monitoring failed: ${error.message}`);
    }
  }

  /*------------------------------------------------------------------*/
  /* PUBLIC API – STOP MONITORING                                     */
  /*------------------------------------------------------------------*/
  stopMonitoring (monitorId) {
    const intervalId = this.monitoringIntervals.get(monitorId);
    
    if (intervalId) {
      clearInterval(intervalId);
      this.monitoringIntervals.delete(monitorId);
      this.addressMonitors.delete(monitorId);
      
      this.#audit('MONITORING_STOPPED', { monitorId });
      return true;
    }
    
    return false;
  }

  /*------------------------------------------------------------------*/
  /* PUBLIC API – QR CODE GENERATION                                  */
  /*------------------------------------------------------------------*/
  async generatePaymentQR (params) {
    this.#preFlight();

    const {
      address,
      network,
      amount,
      tokenAddress,
      message
    } = params;

    try {
      let qrData;

      if (tokenAddress) {
        // ERC-20 token payment
        qrData = `ethereum:${tokenAddress}/transfer?address=${address}&uint256=${amount}`;
      } else {
        // Native currency payment
        const networkPrefix = this.#netCfg(network).prefix;
        qrData = `${networkPrefix}:${address}`;
        
        if (amount) {
          qrData += `?amount=${amount}`;
        }
        
        if (message) {
          qrData += `${amount ? '&' : '?'}message=${encodeURIComponent(message)}`;
        }
      }

      const qrCodeDataURL = await QRCode.toDataURL(qrData, {
        width: this.config.qrCodeSize,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });

      this.#log(`QR code generated for ${address}`);
      
      return qrCodeDataURL;

    } catch (error) {
      this.#logErr('QR code generation failed', error);
      throw new Error(`QR code generation failed: ${error.message}`);
    }
  }

  /*------------------------------------------------------------------*/
  /* PUBLIC API – INVOICE GENERATION                                  */
  /*------------------------------------------------------------------*/
  async generateInvoice (params) {
    this.#preFlight();

    if (!this.config.enableInvoicing) {
      throw new Error('Invoicing is disabled');
    }

    const {
      paymentRequest,
      merchantInfo,
      itemDetails,
      dueDate,
      invoiceNumber
    } = params;

    const invoiceId = this.#makeInvoiceId();

    try {
      const invoice = {
        invoiceId,
        invoiceNumber: invoiceNumber || `INV-${Date.now()}`,
        paymentRequestId: paymentRequest.requestId,
        merchantInfo: {
          name: merchantInfo.name,
          address: merchantInfo.address,
          contact: merchantInfo.contact,
          taxId: merchantInfo.taxId,
          ...merchantInfo
        },
        paymentDetails: {
          address: paymentRequest.address,
          network: paymentRequest.network,
          amount: paymentRequest.amount,
          tokenAddress: paymentRequest.tokenAddress,
          currency: this.#getCurrencySymbol(paymentRequest.network, paymentRequest.tokenAddress)
        },
        itemDetails: itemDetails || [],
        dates: {
          issued: Date.now(),
          due: dueDate || paymentRequest.expiresAt,
          expires: paymentRequest.expiresAt
        },
        status: 'pending',
        qrCode: paymentRequest.qrCode,
        metadata: {
          version: '2.2.0',
          generated: Date.now()
        }
      };

      this.invoices.set(invoiceId, invoice);

      this.#audit('INVOICE_GENERATED', {
        invoiceId,
        paymentRequestId: paymentRequest.requestId,
        amount: paymentRequest.amount
      });

      return invoice;

    } catch (error) {
      this.#logErr('Invoice generation failed', error);
      throw new Error(`Invoice generation failed: ${error.message}`);
    }
  }

  /*------------------------------------------------------------------*/
  /* PUBLIC API – CANCEL PAYMENT REQUEST                              */
  /*------------------------------------------------------------------*/
  async cancelPaymentRequest (requestId) {
    this.#preFlight();

    const request = this.activePaymentRequests.get(requestId);
    
    if (!request) {
      throw new Error(`${this.ERROR_TYPES.REQUEST_NOT_FOUND}: Payment request not found or already completed`);
    }

    if (request.status !== this.PAYMENT_STATUS.PENDING) {
      throw new Error('Cannot cancel non-pending payment request');
    }

    try {
      // Stop monitoring
      this.#stopPaymentMonitoring(requestId);

      // Update status
      request.status = 'cancelled';
      request.cancelled = Date.now();

      // Move to completed
      this.#moveToCompleted(requestId);

      this.#audit('PAYMENT_REQUEST_CANCELLED', { requestId });

      return true;

    } catch (error) {
      this.#logErr('Payment request cancellation failed', error);
      throw new Error(`Cancellation failed: ${error.message}`);
    }
  }

  /*------------------------------------------------------------------*/
  /* PUBLIC API – UTILITIES                                           */
  /*------------------------------------------------------------------*/
  getStatistics () {
    return {
      activeRequests: this.activePaymentRequests.size,
      completedPayments: this.completedPayments.size,
      activeMonitors: this.addressMonitors.size,
      invoices: this.invoices.size,
      auditLogEntries: this.auditLog.length,
      lastActivity: Math.max(
        ...Array.from(this.activePaymentRequests.values()).map(req => req.created),
        ...Array.from(this.completedPayments.values()).map(req => req.completed || req.created),
        0
      )
    };
  }

  getActiveRequests () {
    return Array.from(this.activePaymentRequests.values()).map(req => ({
      requestId: req.requestId,
      address: req.address,
      network: req.network,
      amount: req.amount,
      status: req.status,
      created: req.created,
      expiresAt: req.expiresAt,
      timeRemaining: Math.max(0, req.expiresAt - Date.now())
    }));
  }

  async shutdown () {
    this.#log('Shutting down ReceiveManager...');
    
    // Clear all monitoring intervals
    for (const intervalId of this.monitoringIntervals.values()) {
      clearInterval(intervalId);
    }
    this.monitoringIntervals.clear();
    this.addressMonitors.clear();

    this.initialized = false;
    this.#log('ReceiveManager shutdown complete');
    this.#audit('SHUTDOWN');
  }

  /*------------------------------------------------------------------*/
  /* PRIVATE HELPERS                                                  */
  /*------------------------------------------------------------------*/
  #preFlight () {
    if (!this.initialized) {
      throw new Error('ReceiveManager not initialized');
    }
  }

  #validateAddressParams (params) {
    const { network, derivationPath, masterSeed, metadata } = params;

    if (!network || !this.networks[network]) {
      throw new Error(`${this.ERROR_TYPES.INVALID_NETWORK}: Invalid or unsupported network`);
    }

    if (!derivationPath || typeof derivationPath !== 'string') {
      throw new Error('Invalid derivation path');
    }

    if (!masterSeed) {
      throw new Error('Master seed required');
    }

    return {
      network,
      derivationPath,
      masterSeed,
      metadata: metadata || {}
    };
  }

  #validatePaymentParams (params) {
    const {
      address,
      network,
      amount,
      tokenAddress,
      decimals,
      description,
      expiresIn,
      webhookUrl,
      metadata
    } = params;

    if (!address || !ethers.isAddress(address)) {
      throw new Error(`${this.ERROR_TYPES.INVALID_ADDRESS}: Invalid receiving address`);
    }

    if (!network || !this.networks[network]) {
      throw new Error(`${this.ERROR_TYPES.INVALID_NETWORK}: Invalid or unsupported network`);
    }

    if (!amount || isNaN(amount) || Number(amount) <= 0) {
      throw new Error(`${this.ERROR_TYPES.INVALID_AMOUNT}: Invalid amount`);
    }

    if (tokenAddress && !ethers.isAddress(tokenAddress)) {
      throw new Error(`${this.ERROR_TYPES.INVALID_ADDRESS}: Invalid token address`);
    }

    if (tokenAddress && (decimals === undefined || isNaN(decimals) || Number(decimals) < 0)) {
      throw new Error('Invalid token decimals');
    }

    if (expiresIn && (isNaN(expiresIn) || Number(expiresIn) <= 0)) {
      throw new Error('Invalid expiration time');
    }

    return {
      address: address.toLowerCase(),
      network,
      amount: new BigNumber(amount),
      tokenAddress: tokenAddress?.toLowerCase(),
      decimals: tokenAddress ? Number(decimals) : undefined,
      description,
      expiresIn,
      webhookUrl,
      metadata: metadata || {}
    };
  }

  #validateMonitoringParams (params) {
    const { address, network, callback, tokenAddress, startBlock } = params;

    if (!address || !ethers.isAddress(address)) {
      throw new Error(`${this.ERROR_TYPES.INVALID_ADDRESS}: Invalid address`);
    }

    if (!network || !this.networks[network]) {
      throw new Error(`${this.ERROR_TYPES.INVALID_NETWORK}: Invalid network`);
    }

    if (!callback || typeof callback !== 'function') {
      throw new Error('Invalid callback function');
    }

    if (tokenAddress && !ethers.isAddress(tokenAddress)) {
      throw new Error(`${this.ERROR_TYPES.INVALID_ADDRESS}: Invalid token address`);
    }

    if (startBlock && (isNaN(startBlock) || Number(startBlock) < 0)) {
      throw new Error('Invalid start block');
    }

    return {
      address: address.toLowerCase(),
      network,
      callback,
      tokenAddress: tokenAddress?.toLowerCase(),
      startBlock: startBlock ? Number(startBlock) : undefined
    };
  }

  async #validateReceivingAddress (address, network) {
    try {
      const provider = this.#prov(network);
      // Basic connectivity check
      await provider.getBlockNumber();
      
      // Address format already validated in params
      return true;
    } catch (error) {
      throw new Error(`Address validation failed: ${error.message}`);
    }
  }

  async #startPaymentMonitoring (requestId) {
    const request = this.activePaymentRequests.get(requestId);
    if (!request) return;

    const provider = this.#prov(request.network);
    const currentBlock = await provider.getBlockNumber();

    const intervalId = setInterval(async () => {
      try {
        if (!this.activePaymentRequests.has(requestId)) {
          clearInterval(intervalId);
          return;
        }

        await this.#updatePaymentStatus(requestId);
        
        // Check expiration
        const req = this.activePaymentRequests.get(requestId);
        if (req && Date.now() > req.expiresAt && req.status === this.PAYMENT_STATUS.PENDING) {
          req.status = this.PAYMENT_STATUS.EXPIRED;
          this.#moveToCompleted(requestId);
          clearInterval(intervalId);
        }

      } catch (error) {
        this.#logErr('Payment monitoring error', error);
      }
    }, this.config.monitoringInterval);

    this.monitoringIntervals.set(requestId, intervalId);
  }

  async #updatePaymentStatus (requestId) {
    const request = this.activePaymentRequests.get(requestId);
    if (!request) return;

    try {
      const provider = this.#prov(request.network);
      const currentBlock = await provider.getBlockNumber();
      
      let payments;
      
      if (request.tokenAddress) {
        payments = await this.#checkTokenPayments(request, currentBlock);
      } else {
        payments = await this.#checkNativePayments(request, currentBlock);
      }

      if (payments.length > 0) {
        const payment = payments[0]; // Use first payment found
        const receivedAmount = new BigNumber(payment.amount);
        const expectedAmount = new BigNumber(request.amount);
        const tolerance = expectedAmount.multipliedBy(this.config.amountTolerance);

        // Update request with payment info
        request.txHash = payment.txHash;
        request.receivedAmount = receivedAmount.toString();
        request.blockNumber = payment.blockNumber;
        request.confirmations = Math.max(0, currentBlock - payment.blockNumber);

        // Determine status based on amount
        if (receivedAmount.gte(expectedAmount.minus(tolerance))) {
          if (receivedAmount.gt(expectedAmount.plus(tolerance))) {
            request.status = this.PAYMENT_STATUS.OVERPAID;
          } else {
            request.status = this.PAYMENT_STATUS.RECEIVED;
          }
        } else {
          request.status = this.PAYMENT_STATUS.UNDERPAID;
        }

        // Check confirmations
        if (request.confirmations >= this.config.confirmationBlocks) {
          request.status = this.PAYMENT_STATUS.CONFIRMED;
          request.completed = Date.now();
          this.#moveToCompleted(requestId);
        }

        // Trigger webhook if enabled
        if (this.config.enableWebhooks && request.webhookUrl) {
          await this.#triggerWebhook(request);
        }

        this.#audit('PAYMENT_STATUS_UPDATED', {
          requestId,
          status: request.status,
          receivedAmount: receivedAmount.toString(),
          confirmations: request.confirmations
        });
      }

    } catch (error) {
      this.#logErr('Payment status update failed', error);
    }
  }

  async #checkNativePayments (request, currentBlock) {
    const provider = this.#prov(request.network);
    const payments = [];

    try {
      // Get transaction history for address
      const history = await provider.getHistory(request.address);
      
      for (const tx of history) {
        if (tx.blockNumber && tx.blockNumber >= (request.lastCheckedBlock || 0)) {
          if (tx.to && tx.to.toLowerCase() === request.address.toLowerCase()) {
            payments.push({
              txHash: tx.hash,
              amount: ethers.formatEther(tx.value),
              blockNumber: tx.blockNumber,
              from: tx.from,
              to: tx.to
            });
          }
        }
      }

    } catch (error) {
      this.#logErr('Native payment check failed', error);
    }

    return payments;
  }

  async #checkTokenPayments (request, currentBlock) {
    const provider = this.#prov(request.network);
    const payments = [];

    try {
      // Create token contract interface
      const tokenContract = new ethers.Contract(
        request.tokenAddress,
        ['event Transfer(address indexed from, address indexed to, uint256 value)'],
        provider
      );

      // Query transfer events to this address
      const filter = tokenContract.filters.Transfer(null, request.address);
      const fromBlock = request.lastCheckedBlock || (currentBlock - 1000);
      
      const events = await tokenContract.queryFilter(filter, fromBlock, currentBlock);

      for (const event of events) {
        const amount = ethers.formatUnits(event.args.value, request.decimals);
        payments.push({
          txHash: event.transactionHash,
          amount,
          blockNumber: event.blockNumber,
          from: event.args.from,
          to: event.args.to
        });
      }

    } catch (error) {
      this.#logErr('Token payment check failed', error);
    }

    return payments;
  }

  async #checkForPayments (monitoringSession) {
    if (!monitoringSession.active) return;

    const provider = this.#prov(monitoringSession.network);
    const currentBlock = await provider.getBlockNumber();

    if (currentBlock <= monitoringSession.lastCheckedBlock) return;

    try {
      let payments = [];

      if (monitoringSession.tokenAddress) {
        // Check token transfers
        const tokenContract = new ethers.Contract(
          monitoringSession.tokenAddress,
          ['event Transfer(address indexed from, address indexed to, uint256 value)'],
          provider
        );

        const filter = tokenContract.filters.Transfer(null, monitoringSession.address);
        const events = await tokenContract.queryFilter(
          filter,
          monitoringSession.lastCheckedBlock + 1,
          currentBlock
        );

        payments = events.map(event => ({
          type: 'token',
          txHash: event.transactionHash,
          amount: event.args.value.toString(),
          from: event.args.from,
          to: event.args.to,
          blockNumber: event.blockNumber,
          tokenAddress: monitoringSession.tokenAddress
        }));

      } else {
        // Check native currency transactions
        const history = await provider.getHistory(monitoringSession.address);
        
        payments = history
          .filter(tx => 
            tx.blockNumber > monitoringSession.lastCheckedBlock &&
            tx.to && tx.to.toLowerCase() === monitoringSession.address.toLowerCase()
          )
          .map(tx => ({
            type: 'native',
            txHash: tx.hash,
            amount: tx.value.toString(),
            from: tx.from,
            to: tx.to,
            blockNumber: tx.blockNumber
          }));
      }

      // Trigger callback for each payment
      for (const payment of payments) {
        try {
          await monitoringSession.callback(payment);
        } catch (error) {
          this.#logErr('Payment callback error', error);
        }
      }

      monitoringSession.lastCheckedBlock = currentBlock;

    } catch (error) {
      this.#logErr('Payment check error', error);
    }
  }

  async #generatePaymentQR (paymentRequest) {
    return await this.generatePaymentQR({
      address: paymentRequest.address,
      network: paymentRequest.network,
      amount: paymentRequest.amount,
      tokenAddress: paymentRequest.tokenAddress,
      message: paymentRequest.description
    });
  }

  async #triggerWebhook (request) {
    if (!request.webhookUrl) return;

    try {
      const payload = {
        requestId: request.requestId,
        status: request.status,
        address: request.address,
        network: request.network,
        amount: request.amount,
        receivedAmount: request.receivedAmount,
        txHash: request.txHash,
        confirmations: request.confirmations,
        timestamp: Date.now()
      };

      // In production, use fetch or axios
      // await fetch(request.webhookUrl, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(payload)
      // });

      this.#log(`Webhook triggered for ${request.requestId}`);

    } catch (error) {
      this.#logErr('Webhook trigger failed', error);
    }
  }

  #moveToCompleted (requestId) {
    const request = this.activePaymentRequests.get(requestId);
    if (request) {
      this.completedPayments.set(requestId, request);
      this.activePaymentRequests.delete(requestId);
      this.#stopPaymentMonitoring(requestId);
    }
  }

  #stopPaymentMonitoring (requestId) {
    const intervalId = this.monitoringIntervals.get(requestId);
    if (intervalId) {
      clearInterval(intervalId);
      this.monitoringIntervals.delete(requestId);
    }
  }

  #getCurrencySymbol (network, tokenAddress) {
    if (tokenAddress) {
      return 'TOKEN'; // In production, query token contract for symbol
    }
    
    return this.#netCfg(network).native;
  }

  async #verifyNetworkConnections () {
    const networkPromises = Object.keys(this.networks).map(async (network) => {
      try {
        const provider = this.providers[network];
        if (!provider) {
          throw new Error(`Provider not configured for ${network}`);
        }
        
        await provider.getBlockNumber();
        this.#log(`Network connection verified: ${network}`);
        
      } catch (error) {
        this.#logErr(`Network connection failed: ${network}`, error);
        throw error;
      }
    });

    await Promise.all(networkPromises);
  }

  #initCleanupIntervals () {
    // Clean up expired requests every 5 minutes
    setInterval(() => {
      const now = Date.now();
      
      // Check for expired active requests
      for (const [requestId, request] of this.activePaymentRequests.entries()) {
        if (now > request.expiresAt && request.status === this.PAYMENT_STATUS.PENDING) {
          request.status = this.PAYMENT_STATUS.EXPIRED;
          this.#moveToCompleted(requestId);
        }
      }

      // Clean up old completed payments (keep for retention period)
      const cutoff = now - this.config.retentionPeriod;
      for (const [requestId, request] of this.completedPayments.entries()) {
        if ((request.completed || request.created) < cutoff) {
          this.completedPayments.delete(requestId);
        }
      }

      // Clean up old invoices
      for (const [invoiceId, invoice] of this.invoices.entries()) {
        if (invoice.dates.generated < cutoff) {
          this.invoices.delete(invoiceId);
        }
      }

    }, this.config.cleanupInterval);

    // Clean up audit log every hour (keep last 1000 entries)
    setInterval(() => {
      if (this.auditLog.length > 1000) {
        this.auditLog = this.auditLog.slice(-1000);
      }
    }, 60 * 60 * 1000);
  }

  #netCfg (network) {
    const config = this.networks[network];
    if (!config) {
      throw new Error(`Network configuration not found: ${network}`);
    }
    return config;
  }

  #prov (network) {
    const provider = this.providers[network];
    if (!provider) {
      throw new Error(`Provider not configured for network: ${network}`);
    }
    return provider;
  }

  #sanitizeMetadata (metadata) {
    if (!metadata || typeof metadata !== 'object') {
      return {};
    }

    const sanitized = {};
    for (const [key, value] of Object.entries(metadata)) {
      if (typeof key === 'string' && 
          key !== '__proto__' && 
          key !== 'constructor' && 
          key !== 'prototype') {
        
        if (typeof value === 'string' || 
            typeof value === 'number' || 
            typeof value === 'boolean') {
          sanitized[key] = value;
        } else if (typeof value === 'object' && value !== null) {
          sanitized[key] = this.#sanitizeMetadata(value);
        }
      }
    }
    
    return sanitized;
  }

  #makeAddressId () {
    return `addr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  #makeRequestId () {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  #makeMonitorId () {
    return `mon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  #makeInvoiceId () {
    return `inv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  #log (message) {
    if (this.config.enableLogging) {
      console.log(`[ReceiveManager] ${new Date().toISOString()}: ${message}`);
    }
  }

  #logErr (message, error) {
    if (this.config.enableLogging) {
      console.error(`[ReceiveManager] ${new Date().toISOString()}: ${message}`, error);
    }
  }

  #audit (action, data = {}) {
    this.auditLog.push({
      action,
      data,
      timestamp: Date.now()
    });
  }
}
