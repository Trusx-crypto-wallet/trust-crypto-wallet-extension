// src/bridges/utils/bridgeValidator.js
// Production-grade bridge validation utilities
// Uses bridge configuration validation system for comprehensive checks

const { 
  validateBridgeTransfer,
  getBridgeLimits,
  isValidEthereumAddress,
  validateBridgeConfig,
  doesNetworkSupportBridge,
  doesBridgeSupportToken
} = require('../../../config');

const { bridgeConfigLoader } = require('./configLoader');

/**
 * Bridge Validation Utilities
 * Provides comprehensive validation for bridge operations and transactions
 */
class BridgeValidator {
  constructor() {
    this.validationCache = new Map();
    this.securityRules = new Map();
    this.riskAssessments = new Map();
    
    // Initialize security rules
    this.initializeSecurityRules();
  }

  /**
   * Initialize security validation rules
   */
  initializeSecurityRules() {
    // Minimum security scores by bridge type
    this.securityRules.set('minSecurityScores', {
      layerzero: 85,
      wormhole: 80,
      axelar: 85,
      chainlink: 90,
      hyperlane: 80,
      multichain: 70,
      hop: 75,
      across: 80
    });

    // Maximum transfer amounts by network (USD)
    this.securityRules.set('maxTransferAmounts', {
      ethereum: 1000000,
      polygon: 500000,
      bsc: 500000,
      arbitrum: 750000,
      optimism: 750000,
      avalanche: 500000
    });

    // Suspicious amount thresholds
    this.securityRules.set('suspiciousThresholds', {
      singleTransfer: 100000,    // $100k+ requires extra validation
      dailyVolume: 500000,       // $500k+ daily volume
      hourlyFrequency: 10        // 10+ transfers per hour
    });
  }

  /**
   * Comprehensive bridge transfer validation
   * @param {Object} transferRequest - Transfer request to validate
   * @returns {Object} Comprehensive validation result
   */
  async validateTransfer(transferRequest) {
    try {
      const {
        bridgeKey,
        fromNetwork,
        toNetwork,
        tokenSymbol,
        amount,
        fromAddress,
        toAddress,
        userAddress
      } = transferRequest;

      console.log(`🔍 Validating bridge transfer: ${amount} ${tokenSymbol} via ${bridgeKey}`);
      
      const validationResult = {
        isValid: true,
        errors: [],
        warnings: [],
        securityLevel: 'normal',
        riskScore: 0,
        checks: {
          basicValidation: false,
          networkSupport: false,
          tokenSupport: false,
          amountLimits: false,
          addressValidation: false,
          securityValidation: false,
          riskAssessment: false
        },
        metadata: {
          validatedAt: new Date().toISOString(),
          bridgeType: bridgeConfigLoader.getBridgeType(bridgeKey),
          estimatedTime: null,
          estimatedFees: null
        }
      };

      // 1. Basic Configuration Validation
      const basicValidation = this.validateBasicParameters(transferRequest);
      validationResult.checks.basicValidation = basicValidation.isValid;
      if (!basicValidation.isValid) {
        validationResult.errors.push(...basicValidation.errors);
        validationResult.isValid = false;
      }

      // 2. Network Support Validation
      const networkValidation = this.validateNetworkSupport(bridgeKey, fromNetwork, toNetwork);
      validationResult.checks.networkSupport = networkValidation.isValid;
      if (!networkValidation.isValid) {
        validationResult.errors.push(...networkValidation.errors);
        validationResult.isValid = false;
      }

      // 3. Token Support Validation
      const tokenValidation = this.validateTokenSupport(bridgeKey, tokenSymbol);
      validationResult.checks.tokenSupport = tokenValidation.isValid;
      if (!tokenValidation.isValid) {
        validationResult.errors.push(...tokenValidation.errors);
        validationResult.isValid = false;
      }

      // 4. Amount and Limits Validation
      const amountValidation = await this.validateAmountAndLimits(
        bridgeKey, tokenSymbol, fromNetwork, toNetwork, amount
      );
      validationResult.checks.amountLimits = amountValidation.isValid;
      if (!amountValidation.isValid) {
        validationResult.errors.push(...amountValidation.errors);
        validationResult.isValid = false;
      }
      validationResult.warnings.push(...amountValidation.warnings);

      // 5. Address Validation
      const addressValidation = this.validateAddresses(fromAddress, toAddress, userAddress);
      validationResult.checks.addressValidation = addressValidation.isValid;
      if (!addressValidation.isValid) {
        validationResult.errors.push(...addressValidation.errors);
        validationResult.isValid = false;
      }
      validationResult.warnings.push(...addressValidation.warnings);

      // 6. Security Validation
      const securityValidation = await this.validateSecurity(transferRequest);
      validationResult.checks.securityValidation = securityValidation.isValid;
      validationResult.securityLevel = securityValidation.securityLevel;
      if (!securityValidation.isValid) {
        validationResult.errors.push(...securityValidation.errors);
        validationResult.isValid = false;
      }
      validationResult.warnings.push(...securityValidation.warnings);

      // 7. Risk Assessment
      const riskAssessment = await this.assessTransferRisk(transferRequest);
      validationResult.checks.riskAssessment = riskAssessment.riskScore < 80; // Pass if risk < 80%
      validationResult.riskScore = riskAssessment.riskScore;
      validationResult.warnings.push(...riskAssessment.warnings);
      
      if (riskAssessment.riskScore >= 90) {
        validationResult.errors.push('Transfer risk score too high - transaction blocked');
        validationResult.isValid = false;
      }

      // Add metadata
      if (validationResult.isValid) {
        const bridgeConfig = bridgeConfigLoader.getBridgeConfig(bridgeKey);
        if (bridgeConfig) {
          validationResult.metadata.estimatedTime = bridgeConfig.estimatedTime;
          validationResult.metadata.bridgeVersion = bridgeConfig.version;
        }
      }

      // Log validation result
      if (validationResult.isValid) {
        console.log(`✅ Transfer validation passed (risk: ${validationResult.riskScore}%)`);
      } else {
        console.error(`❌ Transfer validation failed:`, validationResult.errors);
      }

      return validationResult;

    } catch (error) {
      console.error('❌ Transfer validation error:', error.message);
      return {
        isValid: false,
        errors: [`Validation system error: ${error.message}`],
        warnings: [],
        securityLevel: 'unknown',
        riskScore: 100,
        checks: {},
        metadata: { validatedAt: new Date().toISOString() }
      };
    }
  }

  /**
   * Validate basic transfer parameters
   * @param {Object} transferRequest - Transfer request
   * @returns {Object} Basic validation result
   */
  validateBasicParameters(transferRequest) {
    const errors = [];
    const {
      bridgeKey,
      fromNetwork,
      toNetwork,
      tokenSymbol,
      amount
    } = transferRequest;

    // Required fields
    if (!bridgeKey) errors.push('Bridge key is required');
    if (!fromNetwork) errors.push('Source network is required');
    if (!toNetwork) errors.push('Destination network is required');
    if (!tokenSymbol) errors.push('Token symbol is required');
    if (!amount) errors.push('Amount is required');

    // Same network check
    if (fromNetwork === toNetwork) {
      errors.push('Source and destination networks cannot be the same');
    }

    // Amount format validation
    if (amount) {
      const amountNum = parseFloat(amount);
      if (isNaN(amountNum) || amountNum <= 0) {
        errors.push('Amount must be a positive number');
      }
      if (amountNum.toString().split('.')[1]?.length > 18) {
        errors.push('Amount precision exceeds maximum (18 decimals)');
      }
    }

    // Use config system validation
    const configValidation = validateBridgeTransfer({
      bridgeKey,
      fromNetwork,
      toNetwork,
      tokenSymbol,
      amount
    });

    errors.push(...configValidation.errors);

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate network support for bridge
   * @param {string} bridgeKey - Bridge identifier
   * @param {string} fromNetwork - Source network
   * @param {string} toNetwork - Destination network
   * @returns {Object} Network validation result
   */
  validateNetworkSupport(bridgeKey, fromNetwork, toNetwork) {
    const errors = [];

    // Check if networks exist in configuration
    const fromNetworkConfig = bridgeConfigLoader.getNetworkConfig(fromNetwork);
    const toNetworkConfig = bridgeConfigLoader.getNetworkConfig(toNetwork);

    if (!fromNetworkConfig) {
      errors.push(`Source network '${fromNetwork}' not found in configuration`);
    }

    if (!toNetworkConfig) {
      errors.push(`Destination network '${toNetwork}' not found in configuration`);
    }

    // Check bridge support for networks
    if (fromNetworkConfig && !doesNetworkSupportBridge(fromNetwork, bridgeKey)) {
      errors.push(`Bridge '${bridgeKey}' does not support source network '${fromNetwork}'`);
    }

    if (toNetworkConfig && !doesNetworkSupportBridge(toNetwork, bridgeKey)) {
      errors.push(`Bridge '${bridgeKey}' does not support destination network '${toNetwork}'`);
    }

    // Check contract addresses
    const fromContract = bridgeConfigLoader.getContractAddress(bridgeKey, fromNetwork);
    const toContract = bridgeConfigLoader.getContractAddress(bridgeKey, toNetwork);

    if (!fromContract) {
      errors.push(`No contract address found for bridge '${bridgeKey}' on source network '${fromNetwork}'`);
    }

    if (!toContract) {
      errors.push(`No contract address found for bridge '${bridgeKey}' on destination network '${toNetwork}'`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate token support for bridge
   * @param {string} bridgeKey - Bridge identifier
   * @param {string} tokenSymbol - Token symbol
   * @returns {Object} Token validation result
   */
  validateTokenSupport(bridgeKey, tokenSymbol) {
    const errors = [];

    // Check if token exists in configuration
    const tokenConfig = bridgeConfigLoader.getTokenConfig(tokenSymbol);
    if (!tokenConfig) {
      errors.push(`Token '${tokenSymbol}' not found in configuration`);
      return { isValid: false, errors };
    }

    // Check if bridge supports token
    if (!doesBridgeSupportToken(bridgeKey, tokenSymbol)) {
      errors.push(`Bridge '${bridgeKey}' does not support token '${tokenSymbol}'`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate amount and bridge limits
   * @param {string} bridgeKey - Bridge identifier
   * @param {string} tokenSymbol - Token symbol
   * @param {string} fromNetwork - Source network
   * @param {string} toNetwork - Destination network
   * @param {string} amount - Transfer amount
   * @returns {Object} Amount validation result
   */
  async validateAmountAndLimits(bridgeKey, tokenSymbol, fromNetwork, toNetwork, amount) {
    const errors = [];
    const warnings = [];

    if (!amount) {
      return { isValid: true, errors, warnings };
    }

    const amountNum = parseFloat(amount);
    
    // Get bridge limits
    const limits = getBridgeLimits(bridgeKey, tokenSymbol, fromNetwork, toNetwork);
    
    // Check minimum amount
    if (amountNum < parseFloat(limits.min)) {
      errors.push(`Amount ${amount} ${tokenSymbol} is below minimum ${limits.min} ${tokenSymbol}`);
    }

    // Check maximum amount
    if (amountNum > parseFloat(limits.max)) {
      errors.push(`Amount ${amount} ${tokenSymbol} exceeds maximum ${limits.max} ${tokenSymbol}`);
    }

    // Check daily limit (warning)
    if (amountNum > parseFloat(limits.daily) * 0.5) {
      warnings.push(`Large transfer: ${amount} ${tokenSymbol} is over 50% of daily limit`);
    }

    // Check suspicious amount thresholds
    const suspiciousThresholds = this.securityRules.get('suspiciousThresholds');
    const maxTransferAmounts = this.securityRules.get('maxTransferAmounts');
    
    // Convert to USD for comparison (simplified - should use real price feeds)
    const estimatedUSDValue = this.estimateUSDValue(tokenSymbol, amountNum);
    
    if (estimatedUSDValue > suspiciousThresholds.singleTransfer) {
      warnings.push(`High-value transfer detected: ~$${estimatedUSDValue.toLocaleString()}`);
    }

    if (estimatedUSDValue > (maxTransferAmounts[fromNetwork] || 100000)) {
      errors.push(`Transfer amount exceeds network security limit for ${fromNetwork}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate Ethereum addresses
   * @param {string} fromAddress - Source address
   * @param {string} toAddress - Destination address
   * @param {string} userAddress - User wallet address
   * @returns {Object} Address validation result
   */
  validateAddresses(fromAddress, toAddress, userAddress) {
    const errors = [];
    const warnings = [];

    // Validate address formats
    if (fromAddress && !isValidEthereumAddress(fromAddress)) {
      errors.push(`Invalid source address format: ${fromAddress}`);
    }

    if (toAddress && !isValidEthereumAddress(toAddress)) {
      errors.push(`Invalid destination address format: ${toAddress}`);
    }

    if (userAddress && !isValidEthereumAddress(userAddress)) {
      errors.push(`Invalid user address format: ${userAddress}`);
    }

    // Check for suspicious addresses (simplified)
    if (fromAddress && toAddress && fromAddress.toLowerCase() === toAddress.toLowerCase()) {
      warnings.push('Source and destination addresses are the same');
    }

    // Check for known problematic addresses (would integrate with real blacklist)
    const blacklistedAddresses = new Set([
      '0x0000000000000000000000000000000000000000',
      '0x000000000000000000000000000000000000dead'
    ]);

    if (fromAddress && blacklistedAddresses.has(fromAddress.toLowerCase())) {
      errors.push(`Source address is blacklisted: ${fromAddress}`);
    }

    if (toAddress && blacklistedAddresses.has(toAddress.toLowerCase())) {
      errors.push(`Destination address is blacklisted: ${toAddress}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate security requirements
   * @param {Object} transferRequest - Transfer request
   * @returns {Object} Security validation result
   */
  async validateSecurity(transferRequest) {
    const errors = [];
    const warnings = [];
    const { bridgeKey, amount, tokenSymbol } = transferRequest;

    // Get bridge configuration
    const bridgeConfig = bridgeConfigLoader.getBridgeConfig(bridgeKey);
    if (!bridgeConfig) {
      errors.push(`Bridge configuration not found for: ${bridgeKey}`);
      return { isValid: false, errors, warnings, securityLevel: 'unknown' };
    }

    // Check minimum security requirements
    const bridgeType = bridgeConfigLoader.getBridgeType(bridgeKey);
    const minSecurityScores = this.securityRules.get('minSecurityScores');
    const requiredSecurity = minSecurityScores[bridgeType] || 70;

    if (bridgeConfig.security < requiredSecurity) {
      errors.push(`Bridge security score ${bridgeConfig.security}% below required ${requiredSecurity}% for ${bridgeType}`);
    }

    // Determine security level
    let securityLevel = 'normal';
    const estimatedUSDValue = this.estimateUSDValue(tokenSymbol, parseFloat(amount || '0'));
    
    if (estimatedUSDValue > 50000) {
      securityLevel = 'high';
      warnings.push('High-value transfer requires enhanced security validation');
    } else if (estimatedUSDValue > 10000) {
      securityLevel = 'medium';
    }

    // Check bridge status (would integrate with real monitoring)
    if (!bridgeConfig.isActive) {
      errors.push(`Bridge ${bridgeKey} is currently inactive or under maintenance`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      securityLevel
    };
  }

  /**
   * Assess transfer risk score
   * @param {Object} transferRequest - Transfer request
   * @returns {Object} Risk assessment result
   */
  async assessTransferRisk(transferRequest) {
    const warnings = [];
    let riskScore = 0;
    
    const {
      bridgeKey,
      fromNetwork,
      toNetwork,
      tokenSymbol,
      amount,
      userAddress
    } = transferRequest;

    // Bridge risk factors
    const bridgeConfig = bridgeConfigLoader.getBridgeConfig(bridgeKey);
    const bridgeType = bridgeConfigLoader.getBridgeType(bridgeKey);
    
    // Bridge type risk
    const bridgeTypeRisk = {
      layerzero: 5,
      chainlink: 3,
      axelar: 7,
      wormhole: 10,
      hyperlane: 12,
      multichain: 20,
      hop: 15,
      across: 10
    };
    riskScore += bridgeTypeRisk[bridgeType] || 25;

    // Security score risk (inverse relationship)
    if (bridgeConfig) {
      riskScore += Math.max(0, 100 - bridgeConfig.security) * 0.3;
    }

    // Amount risk
    const estimatedUSDValue = this.estimateUSDValue(tokenSymbol, parseFloat(amount || '0'));
    if (estimatedUSDValue > 100000) {
      riskScore += 20;
      warnings.push('High-value transfer increases risk score');
    } else if (estimatedUSDValue > 10000) {
      riskScore += 10;
    }

    // Network combination risk
    const networkRisk = {
      ethereum: 0,
      polygon: 2,
      bsc: 5,
      arbitrum: 1,
      optimism: 1,
      avalanche: 3
    };
    riskScore += (networkRisk[fromNetwork] || 10) + (networkRisk[toNetwork] || 10);

    // Cross-chain complexity risk
    if (fromNetwork !== toNetwork) {
      riskScore += 5;
    }

    // Token risk (simplified)
    const tokenRisk = {
      'USDT': 2,
      'USDC': 1,
      'DAI': 3,
      'WETH': 5,
      'WBTC': 7
    };
    riskScore += tokenRisk[tokenSymbol] || 15;

    // User history risk (would integrate with real user analytics)
    if (userAddress) {
      // Simplified user risk assessment
      const userRisk = await this.assessUserRisk(userAddress);
      riskScore += userRisk;
    }

    // Normalize risk score to 0-100
    riskScore = Math.min(100, Math.max(0, riskScore));

    // Add warnings based on risk level
    if (riskScore >= 70) {
      warnings.push('High-risk transfer detected - additional verification may be required');
    } else if (riskScore >= 40) {
      warnings.push('Medium-risk transfer - proceed with caution');
    }

    return {
      riskScore,
      warnings,
      riskFactors: {
        bridgeType: bridgeTypeRisk[bridgeType] || 25,
        security: bridgeConfig ? Math.max(0, 100 - bridgeConfig.security) * 0.3 : 30,
        amount: estimatedUSDValue > 100000 ? 20 : estimatedUSDValue > 10000 ? 10 : 0,
        networks: (networkRisk[fromNetwork] || 10) + (networkRisk[toNetwork] || 10),
        token: tokenRisk[tokenSymbol] || 15,
        crossChain: fromNetwork !== toNetwork ? 5 : 0
      }
    };
  }

  /**
   * Assess user risk based on address history
   * @param {string} userAddress - User wallet address
   * @returns {number} User risk score (0-30)
   */
  async assessUserRisk(userAddress) {
    // Simplified user risk assessment
    // In production, this would integrate with:
    // - Transaction history analysis
    // - Reputation scoring
    // - Blacklist checking
    // - Compliance screening
    
    let userRisk = 0;
    
    // Check if user is cached
    if (this.riskAssessments.has(userAddress)) {
      const cached = this.riskAssessments.get(userAddress);
      if (Date.now() - cached.timestamp < 3600000) { // 1 hour cache
        return cached.risk;
      }
    }
    
    // Simulate risk factors (replace with real analysis)
    const addressLower = userAddress.toLowerCase();
    
    // New address risk
    if (addressLower.endsWith('000') || addressLower.endsWith('111')) {
      userRisk += 10; // Potentially new or generated address
    }
    
    // Pattern-based risk (simplified)
    if (addressLower.includes('dead') || addressLower.includes('null')) {
      userRisk += 20; // Suspicious address pattern
    }
    
    // Cache the result
    this.riskAssessments.set(userAddress, {
      risk: userRisk,
      timestamp: Date.now()
    });
    
    return userRisk;
  }

  /**
   * Estimate USD value of token amount (simplified)
   * @param {string} tokenSymbol - Token symbol
   * @param {number} amount - Token amount
   * @returns {number} Estimated USD value
   */
  estimateUSDValue(tokenSymbol, amount) {
    // Simplified price estimation
    // In production, this would use real price feeds
    const estimatedPrices = {
      'USDT': 1,
      'USDC': 1,
      'DAI': 1,
      'WETH': 2500,
      'ETH': 2500,
      'WBTC': 45000,
      'BTC': 45000,
      'MATIC': 0.8,
      'BNB': 300,
      'AVAX': 25,
      'ARB': 1.2,
      'OP': 2.5
    };
    
    const price = estimatedPrices[tokenSymbol.toUpperCase()] || 1;
    return amount * price;
  }

  /**
   * Validate bridge configuration integrity
   * @param {string} bridgeKey - Bridge identifier
   * @returns {Object} Configuration validation result
   */
  validateBridgeConfiguration(bridgeKey) {
    const errors = [];
    const warnings = [];
    
    // Get bridge configuration
    const bridgeConfig = bridgeConfigLoader.getBridgeConfig(bridgeKey);
    if (!bridgeConfig) {
      errors.push(`Bridge configuration not found: ${bridgeKey}`);
      return { isValid: false, errors, warnings };
    }
    
    // Check required fields
    if (!bridgeConfig.name) {
      errors.push(`Bridge ${bridgeKey} missing name`);
    }
    
    if (!bridgeConfig.version) {
      warnings.push(`Bridge ${bridgeKey} missing version`);
    }
    
    if (!bridgeConfig.contracts || Object.keys(bridgeConfig.contracts).length === 0) {
      errors.push(`Bridge ${bridgeKey} has no contract configurations`);
    }
    
    // Validate contract addresses
    if (bridgeConfig.contracts) {
      for (const [network, contract] of Object.entries(bridgeConfig.contracts)) {
        if (typeof contract === 'object' && contract.endpoint) {
          if (!isValidEthereumAddress(contract.endpoint)) {
            errors.push(`Invalid endpoint address for ${bridgeKey} on ${network}: ${contract.endpoint}`);
          }
        }
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      bridgeConfig
    };
  }

  /**
   * Validate transaction parameters before execution
   * @param {Object} txParams - Transaction parameters
   * @returns {Object} Transaction validation result
   */
  validateTransactionParameters(txParams) {
    const errors = [];
    const warnings = [];
    
    const {
      to,
      from,
      value,
      data,
      gasLimit,
      gasPrice,
      nonce
    } = txParams;
    
    // Validate addresses
    if (to && !isValidEthereumAddress(to)) {
      errors.push(`Invalid 'to' address: ${to}`);
    }
    
    if (from && !isValidEthereumAddress(from)) {
      errors.push(`Invalid 'from' address: ${from}`);
    }
    
    // Validate value
    if (value) {
      const valueNum = parseFloat(value);
      if (isNaN(valueNum) || valueNum < 0) {
        errors.push(`Invalid value: ${value}`);
      }
    }
    
    // Validate gas parameters
    if (gasLimit) {
      const gasLimitNum = parseInt(gasLimit);
      if (isNaN(gasLimitNum) || gasLimitNum <= 0) {
        errors.push(`Invalid gas limit: ${gasLimit}`);
      } else if (gasLimitNum > 10000000) {
        warnings.push(`Very high gas limit: ${gasLimit}`);
      }
    }
    
    if (gasPrice) {
      const gasPriceNum = parseFloat(gasPrice);
      if (isNaN(gasPriceNum) || gasPriceNum <= 0) {
        errors.push(`Invalid gas price: ${gasPrice}`);
      }
    }
    
    // Validate nonce
    if (nonce !== undefined) {
      const nonceNum = parseInt(nonce);
      if (isNaN(nonceNum) || nonceNum < 0) {
        errors.push(`Invalid nonce: ${nonce}`);
      }
    }
    
    // Validate data (if present)
    if (data && typeof data === 'string') {
      if (!data.startsWith('0x')) {
        errors.push(`Transaction data must start with '0x': ${data}`);
      } else if (data.length % 2 !== 0) {
        errors.push(`Transaction data must have even length: ${data}`);
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Pre-flight validation before bridge operation
   * @param {Object} bridgeOperation - Complete bridge operation
   * @returns {Object} Pre-flight validation result
   */
  async preFlightValidation(bridgeOperation) {
    console.log('🛫 Starting pre-flight validation...');
    
    const results = {
      isValid: true,
      errors: [],
      warnings: [],
      checks: {
        transferValidation: false,
        bridgeConfiguration: false,
        networkConnectivity: false,
        contractsAccessible: false,
        gasEstimation: false,
        finalRiskCheck: false
      },
      metadata: {
        validationTime: Date.now(),
        estimatedGas: null,
        recommendedGasPrice: null
      }
    };
    
    try {
      // 1. Transfer validation
      const transferValidation = await this.validateTransfer(bridgeOperation);
      results.checks.transferValidation = transferValidation.isValid;
      if (!transferValidation.isValid) {
        results.errors.push(...transferValidation.errors);
        results.isValid = false;
      }
      results.warnings.push(...transferValidation.warnings);
      
      // 2. Bridge configuration validation
      const configValidation = this.validateBridgeConfiguration(bridgeOperation.bridgeKey);
      results.checks.bridgeConfiguration = configValidation.isValid;
      if (!configValidation.isValid) {
        results.errors.push(...configValidation.errors);
        results.isValid = false;
      }
      results.warnings.push(...configValidation.warnings);
      
      // 3. Network connectivity check (simplified)
      const connectivityCheck = await this.checkNetworkConnectivity(
        bridgeOperation.fromNetwork,
        bridgeOperation.toNetwork
      );
      results.checks.networkConnectivity = connectivityCheck.isValid;
      if (!connectivityCheck.isValid) {
        results.errors.push(...connectivityCheck.errors);
        results.isValid = false;
      }
      
      // 4. Contract accessibility check
      const contractCheck = await this.checkContractAccessibility(bridgeOperation);
      results.checks.contractsAccessible = contractCheck.isValid;
      if (!contractCheck.isValid) {
        results.errors.push(...contractCheck.errors);
        results.isValid = false;
      }
      
      // 5. Gas estimation (simplified)
      const gasEstimation = await this.estimateGasRequirements(bridgeOperation);
      results.checks.gasEstimation = gasEstimation.isValid;
      results.metadata.estimatedGas = gasEstimation.estimatedGas;
      results.metadata.recommendedGasPrice = gasEstimation.recommendedGasPrice;
      if (!gasEstimation.isValid) {
        results.warnings.push(...gasEstimation.warnings);
      }
      
      // 6. Final risk check
      if (transferValidation.riskScore > 80) {
        results.checks.finalRiskCheck = false;
        results.errors.push('Final risk assessment failed - transaction blocked');
        results.isValid = false;
      } else {
        results.checks.finalRiskCheck = true;
      }
      
      console.log(`🛫 Pre-flight validation ${results.isValid ? 'PASSED' : 'FAILED'}`);
      return results;
      
    } catch (error) {
      console.error('❌ Pre-flight validation error:', error.message);
      return {
        isValid: false,
        errors: [`Pre-flight validation system error: ${error.message}`],
        warnings: [],
        checks: {},
        metadata: { validationTime: Date.now() }
      };
    }
  }

  /**
   * Check network connectivity (simplified)
   * @param {string} fromNetwork - Source network
   * @param {string} toNetwork - Destination network
   * @returns {Object} Connectivity check result
   */
  async checkNetworkConnectivity(fromNetwork, toNetwork) {
    // Simplified connectivity check
    // In production, this would ping RPC endpoints
    
    const errors = [];
    
    const fromNetworkConfig = bridgeConfigLoader.getNetworkConfig(fromNetwork);
    const toNetworkConfig = bridgeConfigLoader.getNetworkConfig(toNetwork);
    
    if (!fromNetworkConfig) {
      errors.push(`Source network configuration not found: ${fromNetwork}`);
    }
    
    if (!toNetworkConfig) {
      errors.push(`Destination network configuration not found: ${toNetwork}`);
    }
    
    // Simulate network health check
    const networkHealth = {
      ethereum: true,
      polygon: true,
      bsc: true,
      arbitrum: true,
      optimism: true,
      avalanche: true
    };
    
    if (!networkHealth[fromNetwork]) {
      errors.push(`Source network ${fromNetwork} appears to be down`);
    }
    
    if (!networkHealth[toNetwork]) {
      errors.push(`Destination network ${toNetwork} appears to be down`);
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Check contract accessibility
   * @param {Object} bridgeOperation - Bridge operation
   * @returns {Object} Contract accessibility result
   */
  async checkContractAccessibility(bridgeOperation) {
    const errors = [];
    const { bridgeKey, fromNetwork, toNetwork } = bridgeOperation;
    
    // Check contract addresses exist
    const fromContract = bridgeConfigLoader.getContractAddress(bridgeKey, fromNetwork);
    const toContract = bridgeConfigLoader.getContractAddress(bridgeKey, toNetwork);
    
    if (!fromContract) {
      errors.push(`Source contract not found for ${bridgeKey} on ${fromNetwork}`);
    }
    
    if (!toContract) {
      errors.push(`Destination contract not found for ${bridgeKey} on ${toNetwork}`);
    }
    
    // In production, would check contract bytecode existence
    // For now, assume contracts are accessible if addresses exist
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Estimate gas requirements for bridge operation
   * @param {Object} bridgeOperation - Bridge operation
   * @returns {Object} Gas estimation result
   */
  async estimateGasRequirements(bridgeOperation) {
    const warnings = [];
    
    // Simplified gas estimation
    // In production, would call eth_estimateGas on contract
    
    const { bridgeKey, amount } = bridgeOperation;
    const bridgeType = bridgeConfigLoader.getBridgeType(bridgeKey);
    
    // Base gas estimates by bridge type
    const baseGasEstimates = {
      layerzero: 200000,
      wormhole: 300000,
      axelar: 250000,
      chainlink: 180000,
      hyperlane: 220000,
      multichain: 150000,
      hop: 280000,
      across: 160000
    };
    
    let estimatedGas = baseGasEstimates[bridgeType] || 200000;
    
    // Adjust for amount (larger amounts may need more gas)
    const amountNum = parseFloat(amount || '0');
    if (amountNum > 1000000) {
      estimatedGas += 50000;
      warnings.push('Large transfer amount may require additional gas');
    }
    
    // Recommended gas price (simplified)
    const recommendedGasPrice = '20000000000'; // 20 gwei
    
    return {
      isValid: true,
      warnings,
      estimatedGas,
      recommendedGasPrice
    };
  }

  /**
   * Get validation statistics
   * @returns {Object} Validation statistics
   */
  getValidationStatistics() {
    return {
      cacheSize: this.validationCache.size,
      riskAssessments: this.riskAssessments.size,
      securityRules: this.securityRules.size,
      averageValidationTime: 0, // Would track actual times
      totalValidations: 0,      // Would track validation count
      failureRate: 0            // Would track failure percentage
    };
  }

  /**
   * Clear validation caches
   */
  clearCaches() {
    this.validationCache.clear();
    this.riskAssessments.clear();
    console.log('🧹 Bridge validation caches cleared');
  }

  /**
   * Update security rules (for runtime configuration)
   * @param {string} ruleType - Type of rule to update
   * @param {Object} newRules - New rule configuration
   */
  updateSecurityRules(ruleType, newRules) {
    this.securityRules.set(ruleType, { ...this.securityRules.get(ruleType), ...newRules });
    console.log(`🔧 Updated security rules for: ${ruleType}`);
  }
}

// Create singleton instance
const bridgeValidator = new BridgeValidator();

// Export singleton and class
module.exports = {
  BridgeValidator,
  bridgeValidator,
  
  // Convenience functions
  validateTransfer: (transferRequest) => bridgeValidator.validateTransfer(transferRequest),
  validateBridgeConfiguration: (bridgeKey) => bridgeValidator.validateBridgeConfiguration(bridgeKey),
  validateTransactionParameters: (txParams) => bridgeValidator.validateTransactionParameters(txParams),
  preFlightValidation: (bridgeOperation) => bridgeValidator.preFlightValidation(bridgeOperation),
  getValidationStatistics: () => bridgeValidator.getValidationStatistics(),
  clearValidationCaches: () => bridgeValidator.clearCaches()
};
