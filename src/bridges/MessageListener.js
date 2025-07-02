/**
 * MessageListener - Cross-chain message and event monitoring system
 * Location: src/bridges/MessageListener.js
 * Focus: Real-time event monitoring and message processing
 */

import { EventEmitter } from 'events';
import { ethers } from 'ethers';
import { BridgeError, NetworkError, TimeoutError } from '../errors/BridgeErrors.js';
import logger from '../utils/logger.js';

export default class MessageListener extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.config = {
      // RPC URLs for each supported chain
      rpcUrls: config.rpcUrls || {
        ethereum: process.env.ETHEREUM_RPC_URL,
        polygon: process.env.POLYGON_RPC_URL,
        bsc: process.env.BSC_RPC_URL,
        avalanche: process.env.AVALANCHE_RPC_URL,
        arbitrum: process.env.ARBITRUM_RPC_URL,
        optimism: process.env.OPTIMISM_RPC_URL
      },
      
      // Protocol contract addresses per chain
      protocolContracts: {
        layerzero: {
          ethereum: '0x66A71Dcef29A0fFBDBE3c6a460a3B5BC225Cd675',
          polygon: '0x3c2269811836af69497E5F486A85D7316753cf62',
          bsc: '0x3c2269811836af69497E5F486A85D7316753cf62',
          avalanche: '0x3c2269811836af69497E5F486A85D7316753cf62',
          arbitrum: '0x3c2269811836af69497E5F486A85D7316753cf62',
          optimism: '0x3c2269811836af69497E5F486A85D7316753cf62'
        },
        wormhole: {
          ethereum: '0x3ee18B2214AFF97000D974cf647E7C347E8fa585',
          polygon: '0x5a58505a96D1dbf8dF91cB21B54419FC36e93fdE',
          bsc: '0xB6F6D86a8f9879A9c87f643768d9efc38c1Da6E7',
          avalanche: '0x0e082F06FF657D94310cB8cE8B0D9a04541d8052',
          arbitrum: '0x0b2402144Bb366A632D14B83F244D2e0e21bD39c',
          optimism: '0x1D68124e65faFC907325e3EDbF8c4d84499DAa8b'
        },
        axelar: {
          ethereum: '0x4F4495243837681061C4743b74B3eEdf548D56A5',
          polygon: '0x6f015F16De9fC8791b234eF68D486d2bF203FBA8',
          avalanche: '0x5029C0EFf6C34351a0CEc334542cDb22c7928f78',
          bsc: '0x304acf330bbE08d1e512eefaa92F6a57871fD895'
        }
      },
      
      // Event polling intervals (ms)
      pollingIntervals: {
        ethereum: 15000,  // 15 seconds
        polygon: 5000,    // 5 seconds
        bsc: 5000,        // 5 seconds
        avalanche: 3000,  // 3 seconds
        arbitrum: 2000,   // 2 seconds
        optimism: 2000    // 2 seconds
      },
      
      // Block confirmation requirements
      confirmationBlocks: {
        ethereum: 12,
        polygon: 128,
        bsc: 15,
        avalanche: 10,
        arbitrum: 20,
        optimism: 20
      },
      
      // Event retention settings
      maxEventHistory: config.maxEventHistory || 10000,
      eventRetentionTime: config.eventRetentionTime || 24 * 60 * 60 * 1000, // 24 hours
      
      // Timeout settings
      confirmationTimeout: config.confirmationTimeout || 30 * 60 * 1000, // 30 minutes
      connectionTimeout: config.connectionTimeout || 10000, // 10 seconds
      
      // Retry settings
      maxRetries: config.maxRetries || 3,
      retryDelay: config.retryDelay || 5000,
      
      ...config
    };
    
    // Core state
    this.providers = new Map();
    this.contracts = new Map();
    this.eventFilters = new Map();
    this.subscriptions = new Map();
    this.pollingTimers = new Map();
    this.lastBlockNumbers = new Map();
    
    // Monitoring state
    this.isActive = false;
    this.startTime = null;
    this.eventHistory = new Map();
    this.pendingConfirmations = new Map();
    
    // Statistics
    this.stats = {
      eventsProcessed: 0,
      messagesReceived: 0,
      transactionsConfirmed: 0,
      bridgesCompleted: 0,
      bridgesFailed: 0,
      uptime: 0
    };
    
    logger.info('MessageListener initialized', {
      supportedChains: Object.keys(this.config.rpcUrls),
      supportedProtocols: Object.keys(this.config.protocolContracts)
    });
  }

  /**
   * Start listening to all configured chains and protocols
   */
  async startListening() {
    if (this.isActive) {
      logger.warn('MessageListener is already active');
      return;
    }
    
    try {
      logger.info('Starting MessageListener...');
      this.startTime = Date.now();
      
      // Initialize providers for all chains
      await this._initializeProviders();
      
      // Initialize contracts for all protocols
      await this._initializeContracts();
      
      // Start event monitoring
      await this._startEventMonitoring();
      
      // Start periodic tasks
      this._startPeriodicTasks();
      
      this.isActive = true;
      
      logger.info('MessageListener started successfully', {
        chains: Array.from(this.providers.keys()),
        protocols: Array.from(this.subscriptions.keys())
      });
      
      this.emit('listenerStarted', {
        chains: Array.from(this.providers.keys()),
        protocols: Array.from(this.subscriptions.keys()),
        startTime: this.startTime
      });
      
    } catch (error) {
      logger.error('Failed to start MessageListener:', error);
      await this.stopListening(); // Cleanup on failure
      throw new BridgeError('Failed to start message listener', 'LISTENER_START_FAILED', {
        error: error.message
      });
    }
  }

  /**
   * Stop all listening activities and cleanup
   */
  async stopListening() {
    if (!this.isActive) {
      logger.warn('MessageListener is not active');
      return;
    }
    
    try {
      logger.info('Stopping MessageListener...');
      
      // Stop all polling timers
      this._stopPollingTimers();
      
      // Clear all subscriptions
      await this._clearSubscriptions();
      
      // Clear pending confirmations
      this.pendingConfirmations.clear();
      
      // Update stats
      this.stats.uptime = Date.now() - this.startTime;
      
      this.isActive = false;
      this.startTime = null;
      
      logger.info('MessageListener stopped', {
        uptime: this.stats.uptime,
        stats: this.stats
      });
      
      this.emit('listenerStopped', {
        uptime: this.stats.uptime,
        stats: this.stats
      });
      
    } catch (error) {
      logger.error('Error stopping MessageListener:', error);
      throw new BridgeError('Failed to stop message listener', 'LISTENER_STOP_FAILED', {
        error: error.message
      });
    }
  }

  /**
   * Subscribe to events for specific protocol on given chains
   */
  subscribeToProtocol(protocol, chains) {
    try {
      logger.info(`Subscribing to protocol ${protocol}`, { chains });
      
      if (!this.config.protocolContracts[protocol]) {
        throw new BridgeError(`Unsupported protocol: ${protocol}`);
      }
      
      for (const chain of chains) {
        const contractAddress = this.config.protocolContracts[protocol][chain];
        if (!contractAddress) {
          logger.warn(`Protocol ${protocol} not available on chain ${chain}`);
          continue;
        }
        
        const provider = this.providers.get(chain);
        if (!provider) {
          logger.warn(`Provider not available for chain ${chain}`);
          continue;
        }
        
        // Create contract instance
        const contract = new ethers.Contract(
          contractAddress,
          this._getProtocolABI(protocol),
          provider
        );
        
        const contractKey = `${protocol}_${chain}`;
        this.contracts.set(contractKey, contract);
        
        // Set up event filters
        this._setupEventFilters(protocol, chain, contract);
      }
      
      if (!this.subscriptions.has(protocol)) {
        this.subscriptions.set(protocol, new Set());
      }
      
      chains.forEach(chain => this.subscriptions.get(protocol).add(chain));
      
      logger.info(`Successfully subscribed to protocol ${protocol}`, {
        chains: Array.from(this.subscriptions.get(protocol))
      });
      
    } catch (error) {
      logger.error(`Failed to subscribe to protocol ${protocol}:`, error);
      throw new BridgeError(`Failed to subscribe to protocol ${protocol}`, 'SUBSCRIPTION_FAILED', {
        protocol,
        chains,
        error: error.message
      });
    }
  }

  /**
   * Unsubscribe from protocol events
   */
  unsubscribeFromProtocol(protocol) {
    try {
      logger.info(`Unsubscribing from protocol ${protocol}`);
      
      const subscribedChains = this.subscriptions.get(protocol);
      if (!subscribedChains) {
        logger.warn(`Not subscribed to protocol ${protocol}`);
        return;
      }
      
      // Remove contracts and filters
      for (const chain of subscribedChains) {
        const contractKey = `${protocol}_${chain}`;
        const contract = this.contracts.get(contractKey);
        
        if (contract) {
          // Remove all listeners
          contract.removeAllListeners();
          this.contracts.delete(contractKey);
        }
        
        // Remove event filters
        const filterKey = `${protocol}_${chain}`;
        this.eventFilters.delete(filterKey);
      }
      
      this.subscriptions.delete(protocol);
      
      logger.info(`Successfully unsubscribed from protocol ${protocol}`);
      
    } catch (error) {
      logger.error(`Failed to unsubscribe from protocol ${protocol}:`, error);
      throw new BridgeError(`Failed to unsubscribe from protocol ${protocol}`, 'UNSUBSCRIPTION_FAILED', {
        protocol,
        error: error.message
      });
    }
  }

  /**
   * Get transaction status from specific chain
   */
  async getTransactionStatus(txHash, chain) {
    try {
      const provider = this.providers.get(chain);
      if (!provider) {
        throw new NetworkError(`Provider not available for chain ${chain}`, chain);
      }
      
      logger.debug(`Getting transaction status for ${txHash} on ${chain}`);
      
      const [tx, receipt] = await Promise.all([
        provider.getTransaction(txHash),
        provider.getTransactionReceipt(txHash)
      ]);
      
      if (!tx) {
        return {
          status: 'not_found',
          chain,
          txHash,
          timestamp: Date.now()
        };
      }
      
      const currentBlock = await provider.getBlockNumber();
      const confirmations = receipt ? currentBlock - receipt.blockNumber : 0;
      const requiredConfirmations = this.config.confirmationBlocks[chain] || 12;
      
      const status = {
        txHash,
        chain,
        status: receipt ? (receipt.status === 1 ? 'confirmed' : 'failed') : 'pending',
        blockNumber: receipt?.blockNumber || null,
        confirmations,
        requiredConfirmations,
        isConfirmed: confirmations >= requiredConfirmations,
        gasUsed: receipt?.gasUsed?.toString() || null,
        effectiveGasPrice: receipt?.effectiveGasPrice?.toString() || null,
        timestamp: Date.now()
      };
      
      logger.debug(`Transaction status retrieved`, status);
      return status;
      
    } catch (error) {
      logger.error(`Failed to get transaction status for ${txHash}:`, error);
      throw new BridgeError('Failed to get transaction status', 'STATUS_CHECK_FAILED', {
        txHash,
        chain,
        error: error.message
      });
    }
  }

  /**
   * Wait for transaction confirmation with timeout
   */
  async waitForConfirmation(txHash, chain, confirmations = null) {
    return new Promise((resolve, reject) => {
      const requiredConfirmations = confirmations || this.config.confirmationBlocks[chain] || 12;
      const timeoutMs = this.config.confirmationTimeout;
      const startTime = Date.now();
      
      logger.info(`Waiting for confirmation of ${txHash} on ${chain}`, {
        requiredConfirmations,
        timeoutMs
      });
      
      // Set up timeout
      const timeout = setTimeout(() => {
        this.pendingConfirmations.delete(txHash);
        reject(new TimeoutError(
          `Transaction confirmation timeout after ${timeoutMs}ms`,
          'waitForConfirmation',
          timeoutMs
        ));
      }, timeoutMs);
      
      // Store pending confirmation
      this.pendingConfirmations.set(txHash, {
        chain,
        requiredConfirmations,
        startTime,
        timeout,
        resolve,
        reject
      });
      
      // Start checking immediately
      this._checkTransactionConfirmation(txHash);
      
      // Set up periodic checking
      const checkInterval = setInterval(async () => {
        try {
          await this._checkTransactionConfirmation(txHash);
        } catch (error) {
          clearInterval(checkInterval);
          clearTimeout(timeout);
          this.pendingConfirmations.delete(txHash);
          reject(error);
        }
      }, 5000); // Check every 5 seconds
      
      // Store interval for cleanup
      const pendingData = this.pendingConfirmations.get(txHash);
      if (pendingData) {
        pendingData.checkInterval = checkInterval;
      }
    });
  }

  /**
   * Check if listener is currently active
   */
  isListening() {
    return this.isActive;
  }

  /**
   * Get listener statistics
   */
  getStats() {
    return {
      ...this.stats,
      uptime: this.startTime ? Date.now() - this.startTime : 0,
      isActive: this.isActive,
      activeChains: Array.from(this.providers.keys()),
      activeProtocols: Array.from(this.subscriptions.keys()),
      pendingConfirmations: this.pendingConfirmations.size,
      eventHistorySize: this.eventHistory.size
    };
  }

  // ===== PRIVATE METHODS =====

  /**
   * Initialize Web3 providers for all chains
   */
  async _initializeProviders() {
    logger.info('Initializing providers for all chains...');
    
    const initPromises = Object.entries(this.config.rpcUrls).map(async ([chain, rpcUrl]) => {
      if (!rpcUrl) {
        logger.warn(`No RPC URL configured for chain ${chain}`);
        return;
      }
      
      try {
        const provider = new ethers.JsonRpcProvider(rpcUrl, undefined, {
          staticNetwork: true // Optimize for better performance
        });
        
        // Test connection
        await this._withTimeout(
          provider.getBlockNumber(),
          this.config.connectionTimeout,
          `Connection timeout for ${chain}`
        );
        
        this.providers.set(chain, provider);
        this.lastBlockNumbers.set(chain, await provider.getBlockNumber());
        
        logger.debug(`Provider initialized for ${chain}`);
        
      } catch (error) {
        logger.error(`Failed to initialize provider for ${chain}:`, error);
        throw new NetworkError(`Failed to connect to ${chain}`, chain, rpcUrl);
      }
    });
    
    await Promise.allSettled(initPromises);
    
    if (this.providers.size === 0) {
      throw new BridgeError('No providers successfully initialized');
    }
    
    logger.info(`Providers initialized for ${this.providers.size} chains`);
  }

  /**
   * Initialize contracts for all protocols
   */
  async _initializeContracts() {
    logger.info('Initializing contracts for all protocols...');
    
    for (const [protocol, chainAddresses] of Object.entries(this.config.protocolContracts)) {
      for (const [chain, contractAddress] of Object.entries(chainAddresses)) {
        if (!contractAddress) continue;
        
        const provider = this.providers.get(chain);
        if (!provider) {
          logger.warn(`Provider not available for ${chain}, skipping ${protocol} contract`);
          continue;
        }
        
        try {
          const contract = new ethers.Contract(
            contractAddress,
            this._getProtocolABI(protocol),
            provider
          );
          
          const contractKey = `${protocol}_${chain}`;
          this.contracts.set(contractKey, contract);
          
          logger.debug(`Contract initialized for ${protocol} on ${chain}`);
          
        } catch (error) {
          logger.error(`Failed to initialize contract for ${protocol} on ${chain}:`, error);
        }
      }
    }
    
    logger.info(`Contracts initialized: ${this.contracts.size} total`);
  }

  /**
   * Start event monitoring for all contracts
   */
  async _startEventMonitoring() {
    logger.info('Starting event monitoring...');
    
    // Subscribe to all configured protocols
    for (const protocol of Object.keys(this.config.protocolContracts)) {
      const supportedChains = Object.keys(this.config.protocolContracts[protocol])
        .filter(chain => this.providers.has(chain));
      
      if (supportedChains.length > 0) {
        this.subscribeToProtocol(protocol, supportedChains);
      }
    }
    
    // Start polling for chains that require it
    this._startEventPolling();
    
    logger.info('Event monitoring started');
  }

  /**
   * Set up event filters for a protocol contract
   */
  _setupEventFilters(protocol, chain, contract) {
    try {
      const events = this._getProtocolEvents(protocol);
      
      for (const eventName of events) {
        try {
          const filter = contract.filters[eventName]();
          const filterKey = `${protocol}_${chain}_${eventName}`;
          this.eventFilters.set(filterKey, filter);
          
          // Set up event listener
          contract.on(filter, (...args) => {
            this._handleEvent(protocol, chain, eventName, args);
          });
          
          logger.debug(`Event filter set up for ${protocol}.${eventName} on ${chain}`);
          
        } catch (error) {
          logger.warn(`Failed to set up event filter for ${protocol}.${eventName}:`, error);
        }
      }
      
    } catch (error) {
      logger.error(`Failed to set up event filters for ${protocol} on ${chain}:`, error);
    }
  }

  /**
   * Start event polling for chains that need it
   */
  _startEventPolling() {
    for (const [chain, provider] of this.providers) {
      const interval = this.config.pollingIntervals[chain] || 10000;
      
      const timer = setInterval(async () => {
        try {
          await this._pollChainEvents(chain, provider);
        } catch (error) {
          logger.error(`Event polling failed for ${chain}:`, error);
        }
      }, interval);
      
      this.pollingTimers.set(chain, timer);
      logger.debug(`Event polling started for ${chain} (interval: ${interval}ms)`);
    }
  }

  /**
   * Poll for new events on a specific chain
   */
  async _pollChainEvents(chain, provider) {
    try {
      const currentBlock = await provider.getBlockNumber();
      const lastBlock = this.lastBlockNumbers.get(chain) || currentBlock - 1;
      
      if (currentBlock <= lastBlock) {
        return; // No new blocks
      }
      
      // Limit block range to prevent timeouts
      const fromBlock = Math.max(lastBlock + 1, currentBlock - 100);
      const toBlock = currentBlock;
      
      // Get events for each protocol contract on this chain
      for (const [contractKey, contract] of this.contracts) {
        if (!contractKey.includes(`_${chain}`)) continue;
        
        const [protocol] = contractKey.split('_');
        const events = this._getProtocolEvents(protocol);
        
        for (const eventName of events) {
          try {
            const filter = contract.filters[eventName]();
            const logs = await contract.queryFilter(filter, fromBlock, toBlock);
            
            for (const log of logs) {
              this._handleEvent(protocol, chain, eventName, [log]);
            }
            
          } catch (error) {
            logger.warn(`Failed to query ${eventName} events for ${protocol} on ${chain}:`, error);
          }
        }
      }
      
      this.lastBlockNumbers.set(chain, currentBlock);
      
    } catch (error) {
      logger.error(`Failed to poll events for ${chain}:`, error);
    }
  }

  /**
   * Handle incoming events
   */
  _handleEvent(protocol, chain, eventName, args) {
    try {
      const log = args[args.length - 1]; // Last argument is usually the log
      const eventData = this._parseEventData(protocol, eventName, log);
      
      const standardizedEvent = {
        id: `${chain}_${log.transactionHash}_${log.logIndex}`,
        protocol,
        chain,
        eventName,
        txHash: log.transactionHash,
        blockNumber: log.blockNumber,
        logIndex: log.logIndex,
        timestamp: Date.now(),
        data: eventData
      };
      
      // Store in history
      this._storeEventHistory(standardizedEvent);
      
      // Update statistics
      this.stats.eventsProcessed++;
      
      // Process specific event types
      this._processEventType(standardizedEvent);
      
      logger.debug(`Event processed: ${protocol}.${eventName} on ${chain}`, {
        txHash: log.transactionHash,
        blockNumber: log.blockNumber
      });
      
    } catch (error) {
      logger.error(`Failed to handle event ${protocol}.${eventName}:`, error);
    }
  }

  /**
   * Process specific event types and emit standardized events
   */
  _processEventType(event) {
    const { protocol, eventName, data, chain, txHash } = event;
    
    try {
      switch (eventName) {
        case 'MessageSent':
        case 'Packet':
        case 'LogMessagePublished':
          this.stats.messagesReceived++;
          this.emit('messageReceived', {
            protocol,
            chain,
            txHash,
            messageId: data.messageId || data.nonce || txHash,
            sourceChain: chain,
            targetChain: data.targetChain || data.destinationChain,
            amount: data.amount,
            token: data.token,
            recipient: data.recipient,
            timestamp: event.timestamp
          });
          break;
          
        case 'MessageDelivered':
        case 'PacketReceived':
        case 'LogMessageExecuted':
          this.emit('bridgeCompleted', {
            protocol,
            chain,
            txHash,
            messageId: data.messageId || data.nonce || txHash,
            executedTxHash: txHash,
            timestamp: event.timestamp
          });
          this.stats.bridgesCompleted++;
          break;
          
        case 'MessageFailed':
        case 'PacketFailed':
          this.emit('bridgeFailed', {
            protocol,
            chain,
            txHash,
            messageId: data.messageId || data.nonce || txHash,
            reason: data.reason || 'Unknown error',
            timestamp: event.timestamp
          });
          this.stats.bridgesFailed++;
          break;
          
        default:
          // Generic event emission
          this.emit('eventReceived', event);
      }
      
    } catch (error) {
      logger.error(`Failed to process event type ${eventName}:`, error);
    }
  }

  /**
   * Check transaction confirmation status
   */
  async _checkTransactionConfirmation(txHash) {
    const pendingData = this.pendingConfirmations.get(txHash);
    if (!pendingData) return;
    
    try {
      const status = await this.getTransactionStatus(txHash, pendingData.chain);
      
      if (status.status === 'failed') {
        // Transaction failed
        clearTimeout(pendingData.timeout);
        clearInterval(pendingData.checkInterval);
        this.pendingConfirmations.delete(txHash);
        
        const error = new BridgeError('Transaction failed on blockchain', 'TX_FAILED', { txHash });
        pendingData.reject(error);
        
      } else if (status.confirmations >= pendingData.requiredConfirmations) {
        // Transaction confirmed
        clearTimeout(pendingData.timeout);
        clearInterval(pendingData.checkInterval);
        this.pendingConfirmations.delete(txHash);
        
        this.stats.transactionsConfirmed++;
        this.emit('transactionConfirmed', {
          txHash,
          chain: pendingData.chain,
          confirmations: status.confirmations,
          blockNumber: status.blockNumber,
          timestamp: Date.now()
        });
        
        pendingData.resolve(status);
      }
      
    } catch (error) {
      logger.error(`Error checking confirmation for ${txHash}:`, error);
      // Don't reject here, let timeout handle it
    }
  }

  /**
   * Store event in history with cleanup
   */
  _storeEventHistory(event) {
    this.eventHistory.set(event.id, event);
    
    // Cleanup old events
    if (this.eventHistory.size > this.config.maxEventHistory) {
      const sortedEvents = Array.from(this.eventHistory.entries())
        .sort(([,a], [,b]) => a.timestamp - b.timestamp);
      
      const eventsToDelete = sortedEvents.slice(0, sortedEvents.length - this.config.maxEventHistory);
      for (const [eventId] of eventsToDelete) {
        this.eventHistory.delete(eventId);
      }
    }
  }

  /**
   * Start periodic maintenance tasks
   */
  _startPeriodicTasks() {
    // Clean up old events every hour
    setInterval(() => {
      this._cleanupOldEvents();
    }, 60 * 60 * 1000);
    
    // Update stats every minute
    setInterval(() => {
      this.stats.uptime = this.startTime ? Date.now() - this.startTime : 0;
    }, 60 * 1000);
  }

  /**
   * Clean up old events from history
   */
  _cleanupOldEvents() {
    const cutoffTime = Date.now() - this.config.eventRetentionTime;
    let cleanedCount = 0;
    
    for (const [eventId, event] of this.eventHistory) {
      if (event.timestamp < cutoffTime) {
        this.eventHistory.delete(eventId);
        cleanedCount++;
      }
    }
    
    if (cleanedCount > 0) {
      logger.debug(`Cleaned up ${cleanedCount} old events from history`);
    }
  }

  /**
   * Stop all polling timers
   */
  _stopPollingTimers() {
    for (const [chain, timer] of this.pollingTimers) {
      clearInterval(timer);
      logger.debug(`Stopped polling timer for ${chain}`);
    }
    this.pollingTimers.clear();
  }

  /**
   * Clear all subscriptions and listeners
   */
  async _clearSubscriptions() {
    for (const [contractKey, contract] of this.contracts) {
      try {
        contract.removeAllListeners();
      } catch (error) {
        logger.warn(`Error removing listeners for ${contractKey}:`, error);
      }
    }
    
    this.contracts.clear();
    this.eventFilters.clear();
    this.subscriptions.clear();
  }

  /**
   * Parse event data based on protocol and event type
   */
  _parseEventData(protocol, eventName, log) {
    try {
      const parsedLog = log.args ? log : log; // Handle different log formats
      
      // Basic event data
      const data = {
        txHash: log.transactionHash,
        blockNumber: log.blockNumber,
        logIndex: log.logIndex
      };
      
      // Protocol-specific parsing
      switch (protocol) {
        case 'layerzero':
          return this._parseLayerZeroEvent(eventName, parsedLog, data);
        case 'wormhole':
          return this._parseWormholeEvent(eventName, parsedLog, data);
        case 'axelar':
          return this._parseAxelarEvent(eventName, parsedLog, data);
        default:
          return data;
      }
      
    } catch (error) {
      logger.warn(`Failed to parse event data for ${protocol}.${eventName}:`, error);
      return { txHash: log.transactionHash, blockNumber: log.blockNumber };
    }
  }

  /**
   * Parse LayerZero-specific events
   */
  _parseLayerZeroEvent(eventName, log, data) {
    if (eventName === 'Packet' && log.args) {
      return {
        ...data,
        srcChainId: log.args.srcChainId?.toString(),
        dstChainId: log.args.dstChainId?.toString(),
        nonce: log.args.nonce?.toString(),
        srcAddress: log.args.srcAddress,
        dstAddress: log.args.dstAddress,
        payload: log.args.payload
      };
    }
    return data;
  }

  /**
   * Parse Wormhole-specific events
   */
  _parseWormholeEvent(eventName, log, data) {
    if (eventName === 'LogMessagePublished' && log.args) {
      return {
        ...data,
        sender: log.args.sender,
        sequence: log.args.sequence?.toString(),
        nonce: log.args.nonce?.toString(),
        payload: log.args.payload,
        consistencyLevel: log.args.consistencyLevel
      };
    }
    return data;
  }

  /**
   * Parse Axelar-specific events
   */
  _parseAxelarEvent(eventName, log, data) {
    if (eventName === 'ContractCall' && log.args) {
      return {
        ...data,
        sender: log.args.sender,
        destinationChain: log.args.destinationChain,
        destinationContractAddress: log.args.destinationContractAddress,
        payloadHash: log.args.payloadHash
      };
    }
    return data;
  }

  /**
   * Get protocol-specific ABI
   */
  _getProtocolABI(protocol) {
    const abis = {
      layerzero: [
        "event Packet(bytes payload)",
        "event PacketReceived(uint16 srcChainId, bytes srcAddress, address dstAddress, uint64 nonce, bytes32 payloadHash)"
      ],
      wormhole: [
        "event LogMessagePublished(address indexed sender, uint64 sequence, uint32 nonce, bytes payload, uint8 consistencyLevel)",
        "event LogMessageExecuted(bytes32 indexed messageHash, uint16 emitterChainId, bytes32 emitterAddress)"
      ],
      axelar: [
        "event ContractCall(address indexed sender, string destinationChain, string destinationContractAddress, bytes32 indexed payloadHash, bytes payload)",
        "event ContractCallWithToken(address indexed sender, string destinationChain, string destinationContractAddress, bytes32 indexed payloadHash, bytes payload, string symbol, uint256 amount)"
      ]
    };
    
    return abis[protocol] || [];
  }

  /**
   * Get protocol-specific event names
   */
  _getProtocolEvents(protocol) {
    const events = {
      layerzero: ['Packet', 'PacketReceived'],
      wormhole: ['LogMessagePublished', 'LogMessageExecuted'],
      axelar: ['ContractCall', 'ContractCallWithToken']
    };
    
    return events[protocol] || [];
  }

  /**
   * Utility method for timeouts
   */
  async _withTimeout(promise, timeoutMs, timeoutMessage = 'Operation timeout') {
    return Promise.race([
      promise,
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs)
      )
    ]);
  }

  /**
   * Get event history with filtering options
   */
  getEventHistory(options = {}) {
    const {
      protocol,
      chain,
      eventName,
      txHash,
      limit = 100,
      offset = 0,
      startTime,
      endTime
    } = options;
    
    let events = Array.from(this.eventHistory.values());
    
    // Apply filters
    if (protocol) {
      events = events.filter(event => event.protocol === protocol);
    }
    
    if (chain) {
      events = events.filter(event => event.chain === chain);
    }
    
    if (eventName) {
      events = events.filter(event => event.eventName === eventName);
    }
    
    if (txHash) {
      events = events.filter(event => event.txHash === txHash);
    }
    
    if (startTime) {
      events = events.filter(event => event.timestamp >= startTime);
    }
    
    if (endTime) {
      events = events.filter(event => event.timestamp <= endTime);
    }
    
    // Sort by timestamp (newest first)
    events.sort((a, b) => b.timestamp - a.timestamp);
    
    // Apply pagination
    const total = events.length;
    const paginatedEvents = events.slice(offset, offset + limit);
    
    return {
      events: paginatedEvents,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      }
    };
  }

  /**
   * Get pending confirmations status
   */
  getPendingConfirmations() {
    return Array.from(this.pendingConfirmations.entries()).map(([txHash, data]) => ({
      txHash,
      chain: data.chain,
      requiredConfirmations: data.requiredConfirmations,
      waitingTime: Date.now() - data.startTime,
      timeoutRemaining: data.startTime + this.config.confirmationTimeout - Date.now()
    }));
  }

  /**
   * Force check all pending confirmations
   */
  async checkAllPendingConfirmations() {
    const promises = Array.from(this.pendingConfirmations.keys()).map(txHash => 
      this._checkTransactionConfirmation(txHash).catch(error => 
        logger.warn(`Error checking confirmation for ${txHash}:`, error)
      )
    );
    
    await Promise.allSettled(promises);
  }

  /**
   * Get real-time bridge status for a transaction
   */
  async getBridgeStatus(txHash, sourceChain) {
    try {
      const sourceStatus = await this.getTransactionStatus(txHash, sourceChain);
      
      if (sourceStatus.status === 'not_found') {
        return {
          status: 'not_found',
          sourceChain,
          txHash,
          timestamp: Date.now()
        };
      }
      
      if (sourceStatus.status === 'failed') {
        return {
          status: 'failed',
          sourceChain,
          txHash,
          sourceStatus,
          timestamp: Date.now()
        };
      }
      
      if (sourceStatus.status === 'pending') {
        return {
          status: 'pending_source',
          sourceChain,
          txHash,
          sourceStatus,
          timestamp: Date.now()
        };
      }
      
      // Check if we have any related events for this transaction
      const relatedEvents = this.getEventHistory({ txHash, limit: 50 });
      const bridgeEvents = relatedEvents.events.filter(event => 
        ['MessageSent', 'Packet', 'LogMessagePublished'].includes(event.eventName)
      );
      
      if (bridgeEvents.length === 0) {
        return {
          status: 'confirmed_no_bridge_event',
          sourceChain,
          txHash,
          sourceStatus,
          timestamp: Date.now()
        };
      }
      
      // Check for completion events
      const completionEvents = relatedEvents.events.filter(event => 
        ['MessageDelivered', 'PacketReceived', 'LogMessageExecuted'].includes(event.eventName)
      );
      
      if (completionEvents.length > 0) {
        return {
          status: 'completed',
          sourceChain,
          txHash,
          sourceStatus,
          bridgeEvents,
          completionEvents,
          timestamp: Date.now()
        };
      }
      
      return {
        status: 'pending_destination',
        sourceChain,
        txHash,
        sourceStatus,
        bridgeEvents,
        timestamp: Date.now()
      };
      
    } catch (error) {
      logger.error(`Failed to get bridge status for ${txHash}:`, error);
      throw new BridgeError('Failed to get bridge status', 'BRIDGE_STATUS_FAILED', {
        txHash,
        sourceChain,
        error: error.message
      });
    }
  }

  /**
   * Monitor a specific transaction for completion
   */
  async monitorTransaction(txHash, sourceChain, options = {}) {
    const {
      timeout = this.config.confirmationTimeout,
      checkInterval = 10000,
      targetChain = null
    } = options;
    
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      let isResolved = false;
      
      logger.info(`Starting transaction monitoring for ${txHash}`, {
        sourceChain,
        targetChain,
        timeout
      });
      
      // Set up timeout
      const timeoutTimer = setTimeout(() => {
        if (!isResolved) {
          isResolved = true;
          clearInterval(checkTimer);
          reject(new TimeoutError(
            `Transaction monitoring timeout after ${timeout}ms`,
            'monitorTransaction',
            timeout
          ));
        }
      }, timeout);
      
      // Set up periodic checking
      const checkTimer = setInterval(async () => {
        if (isResolved) return;
        
        try {
          const status = await this.getBridgeStatus(txHash, sourceChain);
          
          if (status.status === 'completed') {
            isResolved = true;
            clearTimeout(timeoutTimer);
            clearInterval(checkTimer);
            
            logger.info(`Transaction monitoring completed for ${txHash}`, {
              duration: Date.now() - startTime,
              status: status.status
            });
            
            resolve(status);
            
          } else if (status.status === 'failed') {
            isResolved = true;
            clearTimeout(timeoutTimer);
            clearInterval(checkTimer);
            
            reject(new BridgeError('Transaction failed', 'TX_FAILED', {
              txHash,
              sourceChain,
              status
            }));
          }
          
        } catch (error) {
          if (!isResolved) {
            isResolved = true;
            clearTimeout(timeoutTimer);
            clearInterval(checkTimer);
            reject(error);
          }
        }
      }, checkInterval);
    });
  }

  /**
   * Get health status of the message listener
   */
  getHealthStatus() {
    const health = {
      status: this.isActive ? 'healthy' : 'stopped',
      timestamp: Date.now(),
      uptime: this.startTime ? Date.now() - this.startTime : 0,
      stats: this.getStats(),
      chains: {},
      protocols: {}
    };
    
    // Check chain health
    for (const [chain, provider] of this.providers) {
      try {
        health.chains[chain] = {
          connected: true,
          lastBlock: this.lastBlockNumbers.get(chain) || 0,
          pollingActive: this.pollingTimers.has(chain)
        };
      } catch (error) {
        health.chains[chain] = {
          connected: false,
          error: error.message,
          pollingActive: false
        };
      }
    }
    
    // Check protocol health
    for (const [protocol, chains] of this.subscriptions) {
      health.protocols[protocol] = {
        subscribedChains: Array.from(chains),
        contractsActive: Array.from(this.contracts.keys())
          .filter(key => key.startsWith(`${protocol}_`)).length
      };
    }
    
    return health;
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.stats = {
      eventsProcessed: 0,
      messagesReceived: 0,
      transactionsConfirmed: 0,
      bridgesCompleted: 0,
      bridgesFailed: 0,
      uptime: 0
    };
    
    logger.info('Statistics reset');
  }

  /**
   * Update configuration dynamically
   */
  updateConfig(newConfig) {
    const oldConfig = { ...this.config };
    this.config = { ...this.config, ...newConfig };
    
    logger.info('Configuration updated', {
      changes: Object.keys(newConfig)
    });
    
    this.emit('configUpdated', {
      oldConfig,
      newConfig: this.config,
      changes: Object.keys(newConfig)
    });
  }

  /**
   * Graceful shutdown with cleanup
   */
  async gracefulShutdown() {
    logger.info('Starting graceful shutdown of MessageListener...');
    
    try {
      // Stop listening
      if (this.isActive) {
        await this.stopListening();
      }
      
      // Clear all pending confirmations
      for (const [txHash, data] of this.pendingConfirmations) {
        try {
          clearTimeout(data.timeout);
          clearInterval(data.checkInterval);
          data.reject(new BridgeError('Listener shutting down', 'SHUTDOWN'));
        } catch (error) {
          logger.warn(`Error cleaning up pending confirmation for ${txHash}:`, error);
        }
      }
      this.pendingConfirmations.clear();
      
      // Clear event history
      this.eventHistory.clear();
      
      // Remove all listeners
      this.removeAllListeners();
      
      logger.info('MessageListener graceful shutdown completed');
      
    } catch (error) {
      logger.error('Error during graceful shutdown:', error);
      throw error;
    }
  }
}
