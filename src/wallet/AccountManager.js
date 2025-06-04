/**
 * AccountManager.js - Real-World Production Implementation
 * Trust Crypto Wallet Extension - Multi-Chain Account Management
 * 
 * Handles HD accounts, balances, tokens, and transactions across multiple blockchains
 * Supports both EVM (Ethereum, Polygon, BSC) and non-EVM (Bitcoin) networks
 */

import { EventEmitter } from 'events';

/**
 * AccountManager - Production-grade multi-chain account management
 * Features: HD wallets, encrypted storage, real-time balance sync, token management
 */
export class AccountManager extends EventEmitter {
  constructor(keyManager, config = {}) {
    super();
    
    this.keyManager = keyManager;
    this.config = {
      // Supported blockchain networks
      supportedChains: ['ethereum', 'bitcoin', 'polygon', 'binance', 'arbitrum', 'optimism'],
      
      // HD wallet derivation paths (BIP44 standard)
      derivationPaths: {
        ethereum: "m/44'/60'/0'/0",
        bitcoin: "m/44'/0'/0'/0",
        polygon: "m/44'/60'/0'/0",
        binance: "m/44'/714'/0'/0",
        arbitrum: "m/44'/60'/0'/0",
        optimism: "m/44'/60'/0'/0"
      },
      
      // Chain metadata and configurations
      chainConfigs: {
        ethereum: {
          name: 'Ethereum',
          symbol: 'ETH',
          decimals: 18,
          chainId: 1,
          isEVM: true,
          rpcUrl: 'https://eth-mainnet.g.alchemy.com/v2/',
          explorerUrl: 'https://etherscan.io',
          gasUnit: 'gwei'
        },
        bitcoin: {
          name: 'Bitcoin',
          symbol: 'BTC',
          decimals: 8,
          chainId: null,
          isEVM: false,
          rpcUrl: 'https://blockstream.info/api',
          explorerUrl: 'https://blockstream.info',
          gasUnit: 'sat/vB'
        },
        polygon: {
          name: 'Polygon',
          symbol: 'MATIC',
          decimals: 18,
          chainId: 137,
          isEVM: true,
          rpcUrl: 'https://polygon-rpc.com',
          explorerUrl: 'https://polygonscan.com',
          gasUnit: 'gwei'
        },
        binance: {
          name: 'Binance Smart Chain',
          symbol: 'BNB',
          decimals: 18,
          chainId: 56,
          isEVM: true,
          rpcUrl: 'https://bsc-dataseed.binance.org',
          explorerUrl: 'https://bscscan.com',
          gasUnit: 'gwei'
        },
        arbitrum: {
          name: 'Arbitrum One',
          symbol: 'ETH',
          decimals: 18,
          chainId: 42161,
          isEVM: true,
          rpcUrl: 'https://arb1.arbitrum.io/rpc',
          explorerUrl: 'https://arbiscan.io',
          gasUnit: 'gwei'
        },
        optimism: {
          name: 'Optimism',
          symbol: 'ETH',
          decimals: 18,
          chainId: 10,
          isEVM: true,
          rpcUrl: 'https://mainnet.optimism.io',
          explorerUrl: 'https://optimistic.etherscan.io',
          gasUnit: 'gwei'
        }
      },
      
      // Account limits and constraints
      maxAccountsPerChain: 50,
      maxTransactionsPerAccount: 2000,
      maxTokensPerAccount: 200,
      
      // Storage and caching settings
      enableEncryption: true,
      cacheTimeout: 300000, // 5 minutes
      autoSyncInterval: 30000, // 30 seconds
      
      // Security settings
      requireConfirmation: true,
      minConfirmations: 3,
      
      ...config
    };

    // Internal state management
    this.accounts = new Map(); // accountId -> account data
    this.balanceCache = new Map(); // accountId -> { balance, timestamp }
    this.transactionCache = new Map(); // accountId -> transactions[]
    this.tokenCache = new Map(); // accountId -> tokens[]
    
    // Operation state
    this.isInitialized = false;
    this.syncInProgress = new Set(); // Track accounts being synced
    this.autoSyncTimer = null;
    
    // Bind methods to preserve context
    this.handleStorageChange = this.handleStorageChange.bind(this);
    this.syncAccountBalance = this.syncAccountBalance.bind(this);
  }

  /**
   * Initialize the AccountManager
   * Sets up storage, loads existing accounts, starts auto-sync
   */
  async initialize() {
    try {
      this.emit('status', { type: 'initializing', message: 'Starting AccountManager...' });

      // Validate keyManager dependency
      if (!this.keyManager || !this.keyManager.isInitialized) {
        throw new Error('KeyManager must be initialized before AccountManager');
      }

      // Load existing accounts from storage
      await this.loadAccountsFromStorage();

      // Start automatic balance synchronization
      this.startAutoSync();

      // Listen for storage changes (multi-tab support)
      if (typeof window !== 'undefined' && window.addEventListener) {
        window.addEventListener('storage', this.handleStorageChange);
      }

      this.isInitialized = true;
      this.emit('initialized', { accountCount: this.accounts.size });
      
      return { success: true, accountCount: this.accounts.size };

    } catch (error) {
      this.emit('error', { type: 'initialization_failed', error: error.message });
      throw new Error(`AccountManager initialization failed: ${error.message}`);
    }
  }

  /**
   * Create a new account for the specified blockchain
   * @param {string} chain - Blockchain identifier (e.g., 'ethereum', 'bitcoin')
   * @param {number} accountIndex - Account index for HD derivation
   * @param {Object} options - Additional account options
   * @returns {Promise<Object>} Created account object
   */
  async createAccount(chain, accountIndex = 0, options = {}) {
    try {
      // Validation
      this.validateInitialized();
      this.validateChain(chain);
      this.validateAccountIndex(accountIndex);
      await this.enforceAccountLimits(chain);

      const chainConfig = this.config.chainConfigs[chain];
      const derivationPath = `${this.config.derivationPaths[chain]}/${accountIndex}`;
      
      // Generate account address using KeyManager
      const { address, publicKey } = await this.keyManager.deriveAddress(derivationPath, chain);
      
      // Create unique account identifier
      const accountId = this.generateAccountId(chain, accountIndex, address);

      // Build account object
      const account = {
        id: accountId,
        chain,
        address,
        publicKey,
        derivationPath,
        accountIndex,
        
        // Balance and asset information
        balance: '0',
        balanceUSD: 0,
        tokens: [],
        nfts: [],
        
        // Transaction history
        transactions: [],
        pendingTransactions: [],
        
        // Chain-specific data
        chainId: chainConfig.chainId,
        symbol: chainConfig.symbol,
        decimals: chainConfig.decimals,
        isEVM: chainConfig.isEVM,
        
        // Account metadata
        name: options.name || `${chainConfig.name} Account ${accountIndex + 1}`,
        description: options.description || '',
        avatar: options.avatar || '',
        tags: options.tags || [],
        
        // Status and timestamps
        isActive: true,
        isWatching: options.isWatching || false,
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
        lastSynced: null,
        
        // Privacy and security
        isHidden: options.isHidden || false,
        requiresPin: options.requiresPin || false,
        
        // Performance tracking
        syncCount: 0,
        errorCount: 0,
        lastError: null
      };

      // Store account securely
      await this.storeAccount(account);
      
      // Add to memory cache
      this.accounts.set(accountId, account);

      // Initialize default tokens for EVM chains
      if (chainConfig.isEVM) {
        await this.initializeDefaultTokens(accountId);
      }

      // Start balance synchronization
      this.syncAccountBalance(accountId);

      this.emit('accountCreated', { account });
      
      return account;

    } catch (error) {
      this.emit('error', { 
        type: 'account_creation_failed', 
        chain, 
        accountIndex, 
        error: error.message 
      });
      throw new Error(`Failed to create ${chain} account: ${error.message}`);
    }
  }

  /**
   * Get account by ID
   * @param {string} accountId - Unique account identifier
   * @returns {Promise<Object|null>} Account object or null if not found
   */
  async getAccount(accountId) {
    try {
      this.validateAccountId(accountId);

      // Check memory cache first
      let account = this.accounts.get(accountId);
      
      if (!account) {
        // Load from storage if not in cache
        account = await this.loadAccountFromStorage(accountId);
        if (account) {
          this.accounts.set(accountId, account);
        }
      }

      return account || null;

    } catch (error) {
      this.emit('error', { type: 'get_account_failed', accountId, error: error.message });
      return null;
    }
  }

  /**
   * Get all accounts for a specific blockchain
   * @param {string} chain - Blockchain identifier
   * @returns {Promise<Array>} Array of account objects
   */
  async getAccountsByChain(chain) {
    try {
      this.validateChain(chain);
      
      const accounts = [];
      
      // Check cached accounts
      for (const account of this.accounts.values()) {
        if (account.chain === chain && account.isActive) {
          accounts.push(account);
        }
      }
      
      // Load any missing accounts from storage
      const storedAccountIds = await this.getStoredAccountIds(chain);
      for (const accountId of storedAccountIds) {
        if (!this.accounts.has(accountId)) {
          const account = await this.loadAccountFromStorage(accountId);
          if (account && account.isActive) {
            accounts.push(account);
            this.accounts.set(accountId, account);
          }
        }
      }
      
      // Sort by account index
      return accounts.sort((a, b) => a.accountIndex - b.accountIndex);

    } catch (error) {
      this.emit('error', { type: 'get_accounts_by_chain_failed', chain, error: error.message });
      return [];
    }
  }

  /**
   * Get all active accounts across all chains
   * @returns {Promise<Array>} Array of all account objects
   */
  async getAllAccounts() {
    try {
      await this.loadAllAccountsFromStorage();
      
      return Array.from(this.accounts.values())
        .filter(account => account.isActive)
        .sort((a, b) => {
          // Sort by chain first, then by account index
          if (a.chain !== b.chain) {
            return a.chain.localeCompare(b.chain);
          }
          return a.accountIndex - b.accountIndex;
        });

    } catch (error) {
      this.emit('error', { type: 'get_all_accounts_failed', error: error.message });
      return [];
    }
  }

  /**
   * Update account balance
   * @param {string} accountId - Account identifier
   * @param {string} balance - New balance value
   * @param {Object} options - Update options (source, block number, etc.)
   * @returns {Promise<Object>} Updated account object
   */
  async updateBalance(accountId, balance, options = {}) {
    try {
      this.validateAccountId(accountId);
      this.validateBalance(balance);

      const account = await this.getAccount(accountId);
      if (!account) {
        throw new Error(`Account not found: ${accountId}`);
      }

      // Normalize balance value
      const normalizedBalance = this.normalizeBalance(balance, account.decimals);
      
      // Update account data
      const previousBalance = account.balance;
      account.balance = normalizedBalance;
      account.lastUpdated = new Date().toISOString();
      account.lastSynced = new Date().toISOString();

      // Add balance update metadata
      if (options.source) {
        account.lastBalanceUpdate = {
          source: options.source,
          timestamp: new Date().toISOString(),
          blockNumber: options.blockNumber || null,
          transactionHash: options.transactionHash || null
        };
      }

      // Calculate USD value if price data available
      if (options.priceUSD) {
        account.balanceUSD = parseFloat(normalizedBalance) * options.priceUSD;
      }

      // Update caches
      this.balanceCache.set(accountId, {
        balance: normalizedBalance,
        timestamp: Date.now()
      });

      // Store updated account
      await this.storeAccount(account);
      this.accounts.set(accountId, account);

      // Emit balance change event
      this.emit('balanceUpdated', {
        accountId,
        chain: account.chain,
        address: account.address,
        previousBalance,
        newBalance: normalizedBalance,
        balanceUSD: account.balanceUSD,
        source: options.source
      });

      return account;

    } catch (error) {
      this.emit('error', { 
        type: 'balance_update_failed', 
        accountId, 
        error: error.message 
      });
      throw new Error(`Balance update failed: ${error.message}`);
    }
  }

  /**
   * Add a token to an account
   * @param {string} accountId - Account identifier
   * @param {Object} tokenInfo - Token information (symbol, contract address, etc.)
   * @returns {Promise<Object>} Updated account object
   */
  async addToken(accountId, tokenInfo) {
    try {
      this.validateAccountId(accountId);
      this.validateTokenInfo(tokenInfo);

      const account = await this.getAccount(accountId);
      if (!account) {
        throw new Error(`Account not found: ${accountId}`);
      }

      // Check if it's an EVM chain (required for tokens)
      if (!account.isEVM) {
        throw new Error(`Tokens not supported on ${account.chain}`);
      }

      // Enforce token limits
      if (account.tokens.length >= this.config.maxTokensPerAccount) {
        throw new Error(`Maximum tokens per account exceeded (${this.config.maxTokensPerAccount})`);
      }

      // Check if token already exists
      const existingToken = account.tokens.find(token => 
        token.contractAddress?.toLowerCase() === tokenInfo.contractAddress?.toLowerCase()
      );

      if (existingToken) {
        throw new Error(`Token ${tokenInfo.symbol} already exists in account`);
      }

      // Create token object
      const token = {
        symbol: tokenInfo.symbol.toUpperCase(),
        name: tokenInfo.name || tokenInfo.symbol,
        contractAddress: tokenInfo.contractAddress.toLowerCase(),
        decimals: tokenInfo.decimals || 18,
        balance: '0',
        balanceUSD: 0,
        
        // Token metadata
        logoUrl: tokenInfo.logoUrl || '',
        coingeckoId: tokenInfo.coingeckoId || '',
        isVerified: tokenInfo.isVerified || false,
        isCustom: tokenInfo.isCustom || true,
        
        // Status and timestamps
        isActive: true,
        addedAt: new Date().toISOString(),
        addedBy: tokenInfo.addedBy || 'user',
        lastUpdated: new Date().toISOString(),
        
        // Performance tracking
        priceChangePercent24h: 0,
        volume24h: 0,
        marketCap: 0
      };

      // Add token to account
      account.tokens.push(token);
      account.lastUpdated = new Date().toISOString();

      // Update token cache
      this.tokenCache.set(accountId, account.tokens);

      // Store updated account
      await this.storeAccount(account);
      this.accounts.set(accountId, account);

      // Start token balance sync
      this.syncTokenBalance(accountId, token.contractAddress);

      this.emit('tokenAdded', {
        accountId,
        token,
        chain: account.chain,
        address: account.address
      });

      return account;

    } catch (error) {
      this.emit('error', { 
        type: 'add_token_failed', 
        accountId, 
        token: tokenInfo?.symbol,
        error: error.message 
      });
      throw new Error(`Add token failed: ${error.message}`);
    }
  }

  /**
   * Update token balance for a specific token
   * @param {string} accountId - Account identifier
   * @param {string} tokenAddress - Token contract address
   * @param {string} balance - New token balance
   * @param {Object} options - Update options
   * @returns {Promise<Object>} Updated token object
   */
  async updateTokenBalance(accountId, tokenAddress, balance, options = {}) {
    try {
      this.validateAccountId(accountId);
      this.validateBalance(balance);

      const account = await this.getAccount(accountId);
      if (!account) {
        throw new Error(`Account not found: ${accountId}`);
      }

      // Find token in account
      const tokenIndex = account.tokens.findIndex(token => 
        token.contractAddress?.toLowerCase() === tokenAddress.toLowerCase()
      );

      if (tokenIndex === -1) {
        throw new Error(`Token not found: ${tokenAddress}`);
      }

      const token = account.tokens[tokenIndex];
      const previousBalance = token.balance;
      
      // Update token balance
      token.balance = this.normalizeBalance(balance, token.decimals);
      token.lastUpdated = new Date().toISOString();

      // Update USD value if price provided
      if (options.priceUSD) {
        token.balanceUSD = parseFloat(token.balance) * options.priceUSD;
        token.priceChangePercent24h = options.priceChangePercent24h || 0;
      }

      // Update account timestamp
      account.lastUpdated = new Date().toISOString();

      // Store updated account
      await this.storeAccount(account);
      this.accounts.set(accountId, account);

      this.emit('tokenBalanceUpdated', {
        accountId,
        token: {
          symbol: token.symbol,
          contractAddress: token.contractAddress,
          previousBalance,
          newBalance: token.balance,
          balanceUSD: token.balanceUSD
        },
        chain: account.chain,
        address: account.address
      });

      return token;

    } catch (error) {
      this.emit('error', { 
        type: 'token_balance_update_failed', 
        accountId, 
        tokenAddress,
        error: error.message 
      });
      throw new Error(`Token balance update failed: ${error.message}`);
    }
  }

  /**
   * Add a transaction to account history
   * @param {string} accountId - Account identifier
   * @param {Object} transaction - Transaction data
   * @returns {Promise<Object>} Updated account object
   */
  async addTransaction(accountId, transaction) {
    try {
      this.validateAccountId(accountId);
      this.validateTransaction(transaction);

      const account = await this.getAccount(accountId);
      if (!account) {
        throw new Error(`Account not found: ${accountId}`);
      }

      // Create transaction object
      const txData = {
        hash: transaction.hash,
        type: transaction.type || 'transfer',
        status: transaction.status || 'pending',
        
        // Amount and fee information
        amount: this.normalizeBalance(transaction.amount, account.decimals),
        fee: transaction.fee || '0',
        gasPrice: transaction.gasPrice || '0',
        gasUsed: transaction.gasUsed || '0',
        
        // Address information
        from: transaction.from,
        to: transaction.to,
        
        // Block information
        blockNumber: transaction.blockNumber || null,
        blockHash: transaction.blockHash || null,
        transactionIndex: transaction.transactionIndex || null,
        confirmations: transaction.confirmations || 0,
        
        // Timestamps
        timestamp: transaction.timestamp || new Date().toISOString(),
        addedAt: new Date().toISOString(),
        
        // Token transfer data (for ERC-20 transactions)
        tokenTransfer: transaction.tokenTransfer || null,
        
        // Transaction metadata
        data: transaction.data || '0x',
        logs: transaction.logs || [],
        
        // UI/UX data
        direction: this.getTransactionDirection(transaction, account.address),
        description: transaction.description || '',
        tags: transaction.tags || []
      };

      // Check for duplicate transactions
      const existingTxIndex = account.transactions.findIndex(tx => tx.hash === txData.hash);
      
      if (existingTxIndex !== -1) {
        // Update existing transaction
        account.transactions[existingTxIndex] = { 
          ...account.transactions[existingTxIndex], 
          ...txData 
        };
      } else {
        // Add new transaction at the beginning (most recent first)
        account.transactions.unshift(txData);
      }

      // Maintain transaction history limit
      if (account.transactions.length > this.config.maxTransactionsPerAccount) {
        account.transactions = account.transactions.slice(0, this.config.maxTransactionsPerAccount);
      }

      // Update account metadata
      account.lastUpdated = new Date().toISOString();

      // Update transaction cache
      this.transactionCache.set(accountId, account.transactions);

      // Store updated account
      await this.storeAccount(account);
      this.accounts.set(accountId, account);

      this.emit('transactionAdded', {
        accountId,
        transaction: txData,
        chain: account.chain,
        address: account.address
      });

      return account;

    } catch (error) {
      this.emit('error', { 
        type: 'add_transaction_failed', 
        accountId, 
        transactionHash: transaction?.hash,
        error: error.message 
      });
      throw new Error(`Add transaction failed: ${error.message}`);
    }
  }

  /**
   * Get total portfolio value across all accounts
   * @param {Object} priceData - Price data for different assets
   * @returns {Promise<Object>} Portfolio summary
   */
  async getTotalPortfolioValue(priceData = {}) {
    try {
      const accounts = await this.getAllAccounts();
      let totalValue = 0;
      const breakdown = {};
      const assetBreakdown = {};

      for (const account of accounts) {
        if (!account.isActive) continue;

        const chainConfig = this.config.chainConfigs[account.chain];
        const nativeSymbol = chainConfig.symbol;
        
        // Initialize chain breakdown
        if (!breakdown[account.chain]) {
          breakdown[account.chain] = {
            name: chainConfig.name,
            symbol: nativeSymbol,
            native: 0,
            tokens: 0,
            total: 0,
            accounts: 0
          };
        }
        
        breakdown[account.chain].accounts++;

        // Calculate native asset value
        const nativeBalance = parseFloat(account.balance || '0');
        const nativePrice = priceData[nativeSymbol] || 0;
        const nativeValue = nativeBalance * nativePrice;
        
        totalValue += nativeValue;
        breakdown[account.chain].native += nativeValue;
        
        // Track asset breakdown
        if (!assetBreakdown[nativeSymbol]) {
          assetBreakdown[nativeSymbol] = { balance: 0, value: 0, price: nativePrice };
        }
        assetBreakdown[nativeSymbol].balance += nativeBalance;
        assetBreakdown[nativeSymbol].value += nativeValue;

        // Calculate token values
        for (const token of account.tokens || []) {
          const tokenBalance = parseFloat(token.balance || '0');
          const tokenPrice = priceData[token.symbol] || 0;
          const tokenValue = tokenBalance * tokenPrice;
          
          totalValue += tokenValue;
          breakdown[account.chain].tokens += tokenValue;
          
          // Track token in asset breakdown
          if (!assetBreakdown[token.symbol]) {
            assetBreakdown[token.symbol] = { balance: 0, value: 0, price: tokenPrice };
          }
          assetBreakdown[token.symbol].balance += tokenBalance;
          assetBreakdown[token.symbol].value += tokenValue;
        }
        
        breakdown[account.chain].total = breakdown[account.chain].native + breakdown[account.chain].tokens;
      }

      return {
        totalValue,
        breakdown,
        assetBreakdown,
        accountCount: accounts.length,
        currency: 'USD',
        updatedAt: new Date().toISOString(),
        priceDataAge: this.getPriceDataAge(priceData)
      };

    } catch (error) {
      this.emit('error', { type: 'portfolio_calculation_failed', error: error.message });
      throw new Error(`Portfolio calculation failed: ${error.message}`);
    }
  }

  /**
   * Sync account balance with blockchain
   * @param {string} accountId - Account identifier
   * @returns {Promise<Object>} Sync result
   */
  async syncAccountBalance(accountId) {
    // Prevent concurrent syncs for the same account
    if (this.syncInProgress.has(accountId)) {
      return { status: 'already_syncing' };
    }

    try {
      this.syncInProgress.add(accountId);
      
      const account = await this.getAccount(accountId);
      if (!account) {
        throw new Error(`Account not found: ${accountId}`);
      }

      this.emit('syncStarted', { accountId, chain: account.chain, address: account.address });

      // This would integrate with actual blockchain RPC calls
      // For now, this is a placeholder that demonstrates the structure
      const balanceResult = await this.fetchBalanceFromBlockchain(account);
      
      if (balanceResult.success) {
        await this.updateBalance(accountId, balanceResult.balance, {
          source: 'blockchain_sync',
          blockNumber: balanceResult.blockNumber
        });

        // Sync token balances for EVM chains
        if (account.isEVM && account.tokens.length > 0) {
          await this.syncTokenBalances(accountId);
        }

        account.syncCount++;
        account.lastError = null;
      } else {
        account.errorCount++;
        account.lastError = balanceResult.error;
      }

      account.lastSynced = new Date().toISOString();
      await this.storeAccount(account);

      this.emit('syncCompleted', { 
        accountId, 
        success: balanceResult.success,
        balance: balanceResult.balance,
        error: balanceResult.error
      });

      return balanceResult;

    } catch (error) {
      this.emit('syncFailed', { accountId, error: error.message });
      
      // Update error tracking
      const account = await this.getAccount(accountId);
      if (account) {
        account.errorCount++;
        account.lastError = error.message;
        await this.storeAccount(account);
      }
      
      throw error;
    } finally {
      this.syncInProgress.delete(accountId);
    }
  }

  /**
   * Remove/deactivate an account
   * @param {string} accountId - Account identifier
   * @param {Object} options - Removal options
   * @returns {Promise<Object>} Removal result
   */
  async removeAccount(accountId, options = {}) {
    try {
      this.validateAccountId(accountId);

      const account = await this.getAccount(accountId);
      if (!account) {
        throw new Error(`Account not found: ${accountId}`);
      }

      // Soft delete by default (mark as inactive)
      const hardDelete = options.hardDelete || false;

      if (hardDelete) {
        // Permanently remove account
        await this.deleteAccountFromStorage(accountId);
        this.accounts.delete(accountId);
        this.balanceCache.delete(accountId);
        this.transactionCache.delete(accountId);
        this.tokenCache.delete(accountId);
      } else {
        // Soft delete (mark as inactive)
        account.isActive = false;
        account.deactivatedAt = new Date().toISOString();
        account.deactivationReason = options.reason || 'user_request';
        account.lastUpdated = new Date().toISOString();

        await this.storeAccount(account);
        this.accounts.set(accountId, account);
      }

      this.emit('accountRemoved', { 
        accountId, 
        chain: account.chain, 
        address: account.address,
        hardDelete 
      });

      return { success: true, hardDelete };

    } catch (error) {
      this.emit('error', { 
        type: 'remove_account_failed', 
        accountId, 
        error: error.message 
      });
      throw new Error(`Remove account failed: ${error.message}`);
    }
  }

  // === PRIVATE HELPER METHODS ===

  /**
   * Validate that AccountManager is initialized
   */
  validateInitialized() {
    if (!this.isInitialized) {
      throw new Error('AccountManager not initialized. Call initialize() first.');
    }
  }

  /**
   * Validate chain identifier
   */
  validateChain(chain) {
    if (!this.config.supportedChains.includes(chain)) {
      throw new Error(`Unsupported chain: ${chain}. Supported: ${this.config.supportedChains.join(', ')}`);
    }
  }

  /**
   * Validate account ID format
   */
  validateAccountId(accountId) {
    if (!accountId || typeof accountId !== 'string' || accountId.length < 10) {
