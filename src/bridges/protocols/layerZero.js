/**
 * Production-Grade Transaction Execution with Real Signer Integration
 * Updated _executeTransaction() function for LayerZero Protocol
 */

// Add this to your Enhanced LayerZero Protocol class

/**
 * Execute production transaction with real blockchain interaction
 * @param {Object} transaction - Transaction data
 * @param {ethers.Provider} provider - Blockchain provider
 * @param {Object} signerConfig - Signer configuration
 * @returns {string} Transaction hash
 */
async _executeTransaction(transaction, provider, signerConfig = {}) {
  try {
    console.log('📤 Executing production transaction...');
    
    // Get signer based on configuration
    const signer = await this._getSigner(provider, signerConfig);
    
    if (!signer) {
      throw new Error('No signer available for transaction execution');
    }

    // Validate transaction data
    this._validateTransactionData(transaction);

    // Prepare transaction with nonce management
    const preparedTx = await this._prepareTransactionForExecution(transaction, signer);

    // Log transaction details for debugging
    console.log('🔍 Transaction details:', {
      to: preparedTx.to,
      value: ethers.formatEther(preparedTx.value || 0),
      gasLimit: preparedTx.gasLimit?.toString(),
      gasPrice: preparedTx.gasPrice ? ethers.formatUnits(preparedTx.gasPrice, 'gwei') : 'N/A',
      maxFeePerGas: preparedTx.maxFeePerGas ? ethers.formatUnits(preparedTx.maxFeePerGas, 'gwei') : 'N/A',
      nonce: preparedTx.nonce,
      chainId: preparedTx.chainId
    });

    // Execute the transaction with timeout
    console.log('⏳ Sending transaction to blockchain...');
    const txResponse = await Promise.race([
      signer.sendTransaction(preparedTx),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Transaction submission timeout')), 60000)
      )
    ]);

    console.log(`✅ Transaction submitted successfully: ${txResponse.hash}`);
    console.log(`🔗 Nonce: ${txResponse.nonce}, Gas Limit: ${txResponse.gasLimit?.toString()}`);

    // Store transaction for monitoring
    await this._storeTransactionForMonitoring(txResponse);

    return txResponse.hash;

  } catch (error) {
    console.error('❌ Transaction execution failed:', error);
    
    // Enhanced error handling with specific error types
    const enhancedError = this._enhanceTransactionError(error);
    throw enhancedError;
  }
}

/**
 * Get signer based on configuration and environment
 * @param {ethers.Provider} provider - Blockchain provider
 * @param {Object} signerConfig - Signer configuration
 * @returns {ethers.Signer} Configured signer
 */
async _getSigner(provider, signerConfig = {}) {
  try {
    // Method 1: Private Key Signer (for backend/server environments)
    if (signerConfig.privateKey) {
      console.log('🔐 Using private key signer');
      return new ethers.Wallet(signerConfig.privateKey, provider);
    }

    // Method 2: Browser Wallet Integration (MetaMask, etc.)
    if (typeof window !== 'undefined' && window.ethereum) {
      console.log('🦊 Using browser wallet signer');
      
      // Request account access
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      
      const browserProvider = new ethers.BrowserProvider(window.ethereum);
      return await browserProvider.getSigner();
    }

    // Method 3: WalletConnect or other wallet providers
    if (signerConfig.walletProvider) {
      console.log('🌐 Using external wallet provider');
      return signerConfig.walletProvider.getSigner();
    }

    // Method 4: Hardware Wallet (Ledger, Trezor)
    if (signerConfig.hardwareWallet) {
      console.log('🔒 Using hardware wallet signer');
      return await this._getHardwareWalletSigner(provider, signerConfig.hardwareWallet);
    }

    // Method 5: Environment-based signer (for development/testing)
    if (process.env.PRIVATE_KEY && process.env.NODE_ENV !== 'production') {
      console.log('⚠️ Using environment private key (development only)');
      return new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    }

    // Method 6: Mock signer for testing environments
    if (process.env.NODE_ENV === 'test' || signerConfig.mockMode) {
      console.log('🧪 Using mock signer for testing');
      return this._getMockSigner(provider);
    }

    throw new Error('No suitable signer configuration found');

  } catch (error) {
    console.error('❌ Signer initialization failed:', error);
    throw new Error(`Signer setup failed: ${error.message}`);
  }
}

/**
 * Prepare transaction with proper nonce management and gas settings
 * @param {Object} transaction - Base transaction data
 * @param {ethers.Signer} signer - Transaction signer
 * @returns {Object} Prepared transaction
 */
async _prepareTransactionForExecution(transaction, signer) {
  try {
    const signerAddress = await signer.getAddress();
    console.log(`👤 Preparing transaction for address: ${signerAddress}`);

    // Get current nonce
    const nonce = await signer.getNonce('pending');
    
    // Prepare base transaction
    const preparedTx = {
      ...transaction,
      nonce,
      from: signerAddress
    };

    // Handle gas settings based on transaction type
    if (transaction.maxFeePerGas && transaction.maxPriorityFeePerGas) {
      // EIP-1559 transaction
      preparedTx.type = 2;
      console.log('⛽ Using EIP-1559 gas settings');
    } else if (transaction.gasPrice) {
      // Legacy transaction
      preparedTx.type = 0;
      console.log('⛽ Using legacy gas settings');
    } else {
      // Auto-detect and set gas
      const feeData = await signer.provider.getFeeData();
      if (feeData.maxFeePerGas) {
        preparedTx.type = 2;
        preparedTx.maxFeePerGas = feeData.maxFeePerGas;
        preparedTx.maxPriorityFeePerGas = feeData.maxPriorityFeePerGas;
        console.log('⛽ Auto-detected EIP-1559 gas settings');
      } else {
        preparedTx.type = 0;
        preparedTx.gasPrice = feeData.gasPrice;
        console.log('⛽ Auto-detected legacy gas settings');
      }
    }

    // Estimate gas if not provided
    if (!preparedTx.gasLimit) {
      try {
        const gasEstimate = await signer.estimateGas(preparedTx);
        preparedTx.gasLimit = gasEstimate * 120n / 100n; // Add 20% buffer
        console.log(`⛽ Gas estimated: ${preparedTx.gasLimit.toString()}`);
      } catch (gasError) {
        console.warn('⚠️ Gas estimation failed, using default');
        preparedTx.gasLimit = BigInt(200000); // Default gas limit
      }
    }

    return preparedTx;

  } catch (error) {
    throw new Error(`Transaction preparation failed: ${error.message}`);
  }
}

/**
 * Validate transaction data before execution
 * @param {Object} transaction - Transaction to validate
 */
_validateTransactionData(transaction) {
  // Required fields validation
  if (!transaction.to || !ethers.isAddress(transaction.to)) {
    throw new Error('Invalid or missing transaction recipient address');
  }

  // Value validation
  if (transaction.value && transaction.value < 0) {
    throw new Error('Transaction value cannot be negative');
  }

  // Gas validation
  if (transaction.gasLimit && transaction.gasLimit <= 0) {
    throw new Error('Gas limit must be positive');
  }

  if (transaction.gasPrice && transaction.gasPrice <= 0) {
    throw new Error('Gas price must be positive');
  }

  // Chain ID validation
  if (transaction.chainId && !Number.isInteger(Number(transaction.chainId))) {
    throw new Error('Invalid chain ID');
  }

  console.log('✅ Transaction data validation passed');
}

/**
 * Store transaction for monitoring and tracking
 * @param {Object} txResponse - Transaction response from blockchain
 */
async _storeTransactionForMonitoring(txResponse) {
  try {
    const monitoringData = {
      hash: txResponse.hash,
      nonce: txResponse.nonce,
      gasLimit: txResponse.gasLimit?.toString(),
      gasPrice: txResponse.gasPrice?.toString(),
      maxFeePerGas: txResponse.maxFeePerGas?.toString(),
      maxPriorityFeePerGas: txResponse.maxPriorityFeePerGas?.toString(),
      value: txResponse.value?.toString(),
      to: txResponse.to,
      from: txResponse.from,
      chainId: txResponse.chainId,
      type: txResponse.type,
      submittedAt: Date.now(),
      status: 'submitted'
    };

    // Store in monitoring system (you can integrate with your monitoring service)
    if (this.transactionMonitor) {
      await this.transactionMonitor.trackTransaction(monitoringData);
    }

    // Store locally for debugging
    if (typeof localStorage !== 'undefined') {
      const storageKey = `tx_${txResponse.hash}`;
      localStorage.setItem(storageKey, JSON.stringify(monitoringData));
    }

    console.log(`📊 Transaction stored for monitoring: ${txResponse.hash}`);

  } catch (error) {
    console.warn('⚠️ Failed to store transaction for monitoring:', error.message);
    // Don't throw here - transaction was successful, monitoring is secondary
  }
}

/**
 * Get hardware wallet signer (Ledger, Trezor, etc.)
 * @param {ethers.Provider} provider - Blockchain provider
 * @param {Object} hwConfig - Hardware wallet configuration
 * @returns {ethers.Signer} Hardware wallet signer
 */
async _getHardwareWalletSigner(provider, hwConfig) {
  try {
    // This would integrate with hardware wallet libraries
    // For now, throw an informative error
    throw new Error('Hardware wallet integration not yet implemented. Please use browser wallet or private key.');
    
    // Future implementation might look like:
    // if (hwConfig.type === 'ledger') {
    //   const { LedgerSigner } = await import('@ethersproject/hardware-wallets');
    //   return new LedgerSigner(provider, hwConfig.derivationPath);
    // }
  } catch (error) {
    throw new Error(`Hardware wallet signer failed: ${error.message}`);
  }
}

/**
 * Get mock signer for testing environments
 * @param {ethers.Provider} provider - Blockchain provider
 * @returns {ethers.Signer} Mock signer
 */
_getMockSigner(provider) {
  // Create a mock wallet for testing
  const mockPrivateKey = '0x' + '1'.repeat(64); // Mock private key for testing
  return new ethers.Wallet(mockPrivateKey, provider);
}

/**
 * Enhance transaction errors with specific details
 * @param {Error} error - Original error
 * @returns {Error} Enhanced error with additional context
 */
_enhanceTransactionError(error) {
  let enhancedMessage = `Transaction execution failed: ${error.message}`;
  let errorCode = 'TRANSACTION_FAILED';

  // Categorize specific error types
  if (error.message.includes('insufficient funds')) {
    enhancedMessage = 'Insufficient funds to complete the transaction. Please check your balance.';
    errorCode = 'INSUFFICIENT_FUNDS';
  } else if (error.message.includes('gas')) {
    enhancedMessage = 'Gas-related error. Please check gas price and limit settings.';
    errorCode = 'GAS_ERROR';
  } else if (error.message.includes('nonce')) {
    enhancedMessage = 'Nonce error. Transaction may already be pending or confirmed.';
    errorCode = 'NONCE_ERROR';
  } else if (error.message.includes('timeout')) {
    enhancedMessage = 'Transaction submission timeout. Network may be congested.';
    errorCode = 'TIMEOUT_ERROR';
  } else if (error.message.includes('user denied') || error.message.includes('rejected')) {
    enhancedMessage = 'Transaction was rejected by the user.';
    errorCode = 'USER_REJECTED';
  } else if (error.message.includes('network')) {
    enhancedMessage = 'Network connection error. Please check your internet connection.';
    errorCode = 'NETWORK_ERROR';
  }

  const enhancedError = new Error(enhancedMessage);
  enhancedError.code = errorCode;
  enhancedError.originalError = error;
  enhancedError.timestamp = new Date().toISOString();

  return enhancedError;
}

/**
 * Wait for transaction confirmation with timeout
 * @param {string} txHash - Transaction hash
 * @param {ethers.Provider} provider - Blockchain provider
 * @param {number} confirmations - Required confirmations (default: 1)
 * @param {number} timeout - Timeout in milliseconds (default: 300000 = 5 minutes)
 * @returns {Object} Transaction receipt
 */
async _waitForTransactionConfirmation(txHash, provider, confirmations = 1, timeout = 300000) {
  try {
    console.log(`⏳ Waiting for ${confirmations} confirmation(s) for ${txHash}`);
    
    const receipt = await Promise.race([
      provider.waitForTransaction(txHash, confirmations),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Transaction confirmation timeout')), timeout)
      )
    ]);

    if (receipt.status === 0) {
      throw new Error('Transaction failed on blockchain');
    }

    console.log(`✅ Transaction confirmed with ${confirmations} confirmation(s)`);
    return receipt;

  } catch (error) {
    console.error('❌ Transaction confirmation failed:', error);
    throw error;
  }
}

// Example usage integration with the bridge function:

/**
 * Updated bridge function to use real transaction execution
 */
async bridge(params) {
  const { fromChain, toChain, tokenAddress, amount, recipientAddress, transactionId, onStatusUpdate, signerConfig } = params;

  try {
    // ... existing bridge logic ...

    // Updated transaction execution
    this._updateStatus(onStatusUpdate, {
      status: 'executing',
      message: 'Executing bridge transaction on blockchain',
      step: 5,
      totalSteps: 6
    });

    // Execute with real signer
    const txHash = await this._executeTransaction(transaction, fromProvider, signerConfig);

    // Wait for initial confirmation
    this._updateStatus(onStatusUpdate, {
      status: 'confirming',
      message: 'Waiting for transaction confirmation',
      step: 6,
      totalSteps: 6,
      txHash
    });

    // Optional: Wait for confirmation before returning
    if (params.waitForConfirmation) {
      await this._waitForTransactionConfirmation(txHash, fromProvider, 1, 120000); // 2 minutes timeout
    }

    // ... rest of existing bridge logic ...

    return {
      txHash,
      // ... rest of return object ...
    };

  } catch (error) {
    // ... existing error handling ...
  }
}
