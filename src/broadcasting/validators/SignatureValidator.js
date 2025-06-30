/**
   * Detects potential replay attacks
   */
  async _detectReplayAttacks(transaction, signatureComponents) {
    const signatureHash = this._hashSignature(signatureComponents);
    const now = Date.now();

    if (this.replayTracker.has(signatureHash)) {
      const lastUsed = this.replayTracker.get(signatureHash);
      const timeDiff = now - lastUsed.timestamp;
      
      if (timeDiff < 300000) { // 5 minutes
        throw new RPCError(
          'Potential replay attack: signature recently used',
          SIGNATURE_VALIDATION_ERRORS.REPLAY_ATTACK_DETECTED,
          {
            signatureHash: signatureHash.slice(0, 10) + '...',
            lastUsed: lastUsed.timestamp,
            timeDifference: timeDiff
          }
        );
      }
    }

    this.replayTracker.set(signatureHash, {
      timestamp: now,
      transaction: {
        nonce: transaction.nonce,
        to: transaction.to,
        value: transaction.value
      }
    });

    this._cleanupReplayTracker();
  }

  /**
   * Detects weak signatures using real cryptographic analysis
   */
  async _detectWeakSignatures(signatureComponents) {
    const rNum = BigInt(signatureComponents.r);
    const sNum = BigInt(signatureComponents.s);

    // Check for obviously weak values
    if (rNum === 1n || sNum === 1n) {
      throw new RPCError(
        'Weak signature detected: r or s value is 1',
        SIGNATURE_VALIDATION_ERRORS.WEAK_SIGNATURE,
        { r: signatureComponents.r, s: signatureComponents.s }
      );
    }

    // Check for repeated patterns using real entropy analysis
    const rHex = signatureComponents.r.slice(2);
    const sHex = signatureComponents.s.slice(2);
    
    if (this._hasRepeatingPattern(rHex) || this._hasRepeatingPattern(sHex)) {
      this.logger.warn('Signature with repeating patterns detected', {
        r: signatureComponents.r.slice(0, 10) + '...',
        s: signatureComponents.s.slice(0, 10) + '...'
      });
    }

    // Check for low entropy using real entropy calculation
    if (this._hasLowEntropy(rHex) || this._hasLowEntropy(sHex)) {
      this.logger.warn('Low entropy signature detected', {
        rEntropy: this._calculateEntropy(rHex),
        sEntropy: this._calculateEntropy(sHex)
      });
    }
  }

  /**
   * Detects suspicious signature patterns
   */
  async _detectSuspiciousPatterns(signatureComponents, recoveredAddress) {
    const addressKey = recoveredAddress.toLowerCase();
    
    if (!this.suspiciousPatterns.has(addressKey)) {
      this.suspiciousPatterns.set(addressKey, {
        signatures: [],
        firstSeen: Date.now()
      });
    }

    const patterns = this.suspiciousPatterns.get(addressKey);
    patterns.signatures.push({
      timestamp: Date.now(),
      r: signatureComponents.r,
      s: signatureComponents.s,
      v: signatureComponents.v
    });

    const oneHourAgo = Date.now() - 3600000;
    patterns.signatures = patterns.signatures.filter(sig => sig.timestamp > oneHourAgo);

    if (patterns.signatures.length > 100) {
      throw new RPCError(
        'Suspicious signature pattern: too many signatures from same address',
        SIGNATURE_VALIDATION_ERRORS.SUSPICIOUS_SIGNATURE_PATTERN,
        {
          address: this._maskAddress(recoveredAddress),
          count: patterns.signatures.length,
          timeWindow: '1 hour'
        }
      );
    }

    const uniqueSignatures = new Set(patterns.signatures.map(sig => `${sig.r}${sig.s}`));
    if (uniqueSignatures.size < patterns.signatures.length * 0.5) {
      this.logger.warn('High signature duplication detected', {
        address: this._maskAddress(recoveredAddress),
        totalSignatures: patterns.signatures.length,
        uniqueSignatures: uniqueSignatures.size
      });
    }
  }

  /**
   * Validates signature age
   */
  async _validateSignatureAge(transaction, options) {
    if (!this.config.maxSignatureAge || options.ignoreAge) {
      return;
    }

    const now = Date.now();
    let signatureTime = now;

    if (transaction.timestamp) {
      signatureTime = transaction.timestamp;
    } else if (transaction.createdAt) {
      signatureTime = new Date(transaction.createdAt).getTime();
    }

    const age = now - signatureTime;
    
    if (age > this.config.maxSignatureAge) {
      throw new RPCError(
        'Signature has expired',
        SIGNATURE_VALIDATION_ERRORS.SIGNATURE_EXPIRED,
        {
          age,
          maxAge: this.config.maxSignatureAge,
          ageInMinutes: Math.floor(age / 60000)
        }
      );
    }
  }

  /**
   * Performs pattern analysis for forensic validation
   */
  async _performPatternAnalysis(signatureComponents, recoveredAddress) {
    return {
      repeatingPatterns: {
        rHasPattern: this._hasRepeatingPattern(signatureComponents.r.slice(2)),
        sHasPattern: this._hasRepeatingPattern(signatureComponents.s.slice(2))
      },
      entropy: {
        rEntropy: this._calculateEntropy(signatureComponents.r.slice(2)),
        sEntropy: this._calculateEntropy(signatureComponents.s.slice(2))
      },
      addressPatterns: {
        isKnownAddress: this._isKnownAddress(recoveredAddress),
        addressType: this._classifyAddress(recoveredAddress)
      }
    };
  }

  /**
   * Assesses signature security using real cryptographic metrics
   */
  async _assessSignatureSecurity(signatureComponents, recoveredAddress) {
    const assessment = {
      strength: 'unknown',
      risks: [],
      score: 0
    };

    let score = 100;

    // Check malleability using real secp256k1 parameters
    if (this._isHighS(signatureComponents.s)) {
      assessment.risks.push('signature_malleability');
      score -= 30;
    }

    // Check entropy using real entropy calculation
    const rEntropy = this._calculateEntropy(signatureComponents.r.slice(2));
    const sEntropy = this._calculateEntropy(signatureComponents.s.slice(2));
    
    if (rEntropy < 3.5 || sEntropy < 3.5) {
      assessment.risks.push('low_entropy');
      score -= 20;
    }

    // Check for blacklisted address
    if (this._isBlacklistedSigner(recoveredAddress)) {
      assessment.risks.push('blacklisted_signer');
      score -= 50;
    }

    // Check for weak values
    const rNum = BigInt(signatureComponents.r);
    const sNum = BigInt(signatureComponents.s);
    
    if (rNum < 1000n || sNum < 1000n) {
      assessment.risks.push('weak_values');
      score -= 40;
    }

    assessment.score = Math.max(0, score);
    
    if (assessment.score >= 80) {
      assessment.strength = 'strong';
    } else if (assessment.score >= 60) {
      assessment.strength = 'medium';
    } else if (assessment.score >= 40) {
      assessment.strength = 'weak';
    } else {
      assessment.strength = 'very_weak';
    }

    return assessment;
  }

  /**
   * Performs historical analysis
   */
  async _performHistoricalAnalysis(recoveredAddress) {
    const addressKey = recoveredAddress.toLowerCase();
    const history = this.validationHistory.get(addressKey) || [];
    
    return {
      totalValidations: history.length,
      firstSeen: history.length > 0 ? history[0].timestamp : null,
      lastSeen: history.length > 0 ? history[history.length - 1].timestamp : null,
      averageInterval: this._calculateAverageInterval(history),
      patterns: this._analyzeHistoricalPatterns(history)
    };
  }

  /**
   * Updates tracking data
   */
  async _updateTrackingData(transaction, signatureComponents, validationResult) {
    const now = Date.now();
    const addressKey = validationResult.recoveredAddress?.toLowerCase();

    if (addressKey) {
      if (!this.validationHistory.has(addressKey)) {
        this.validationHistory.set(addressKey, []);
      }

      const history = this.validationHistory.get(addressKey);
      history.push({
        timestamp: now,
        signatureHash: this._hashSignature(signatureComponents),
        strategy: validationResult.strategy,
        status: validationResult.status,
        transactionHash: transaction.hash
      });

      const maxEntries = 1000;
      const maxAge = 86400000; // 24 hours
      
      const filtered = history
        .filter(entry => now - entry.timestamp < maxAge)
        .slice(-maxEntries);
      
      this.validationHistory.set(addressKey, filtered);
    }
  }

  /**
   * Validates multiple signatures (multi-sig) using real cryptography
   */
  async validateMultiSignature(signatures, transaction, options = {}) {
    const startTime = Date.now();
    const validationId = this._generateValidationId();

    try {
      if (!Array.isArray(signatures) || signatures.length === 0) {
        throw new RPCError(
          'Signatures array is required for multi-signature validation',
          SIGNATURE_VALIDATION_ERRORS.MISSING_SIGNATURE
        );
      }

      const threshold = options.threshold || this.config.defaultThreshold;
      const maxSigners = options.maxSigners || this.config.maxSigners;

      if (signatures.length > maxSigners) {
        throw new RPCError(
          `Too many signatures: maximum ${maxSigners} allowed`,
          SIGNATURE_VALIDATION_ERRORS.INVALID_MULTISIG_SETUP,
          { provided: signatures.length, maximum: maxSigners }
        );
      }

      const results = [];
      const recoveredAddresses = new Set();

      // Validate each signature using real cryptography
      for (let i = 0; i < signatures.length; i++) {
        try {
          const sigTransaction = { ...transaction, ...signatures[i] };
          const result = await this.validateSignature(sigTransaction, options);
          
          if (recoveredAddresses.has(result.signature.recoveredAddress)) {
            throw new RPCError(
              'Duplicate signature detected',
              SIGNATURE_VALIDATION_ERRORS.DUPLICATE_SIGNATURE,
              { address: this._maskAddress(result.signature.recoveredAddress) }
            );
          }

          recoveredAddresses.add(result.signature.recoveredAddress);
          results.push({
            index: i,
            valid: true,
            address: result.signature.recoveredAddress,
            result
          });

        } catch (error) {
          results.push({
            index: i,
            valid: false,
            error: error.message,
            errorCode: error.code
          });
        }
      }

      const validSignatures = results.filter(r => r.valid);
      const thresholdMet = validSignatures.length >= threshold;

      if (!thresholdMet) {
        throw new RPCError(
          `Insufficient valid signatures: ${validSignatures.length}/${threshold} required`,
          SIGNATURE_VALIDATION_ERRORS.THRESHOLD_NOT_MET,
          {
            validSignatures: validSignatures.length,
            requiredThreshold: threshold,
            totalSignatures: signatures.length
          }
        );
      }

      return {
        valid: true,
        validationId,
        validationTime: Date.now() - startTime,
        multiSig: {
          totalSignatures: signatures.length,
          validSignatures: validSignatures.length,
          threshold,
          thresholdMet,
          signers: validSignatures.map(v => v.address)
        },
        results,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      throw new RPCError(
        `Multi-signature validation failed: ${error.message}`,
        error.code || SIGNATURE_VALIDATION_ERRORS.INVALID_MULTISIG_SETUP,
        {
          validationId,
          validationTime: Date.now() - startTime,
          originalError: error
        }
      );
    }
  }

  /**
   * Verifies a signature against a specific message using real cryptography
   */
  async verifyMessageSignature(message, signature, expectedAddress) {
    try {
      // Use ethers.js for real message verification
      const messageHash = ethers.hashMessage(message);
      const signatureComponents = this._extractSignatureComponents({ signature: signature.signature || signature });
      
      const recoveredAddress = await this._recoverAddress(messageHash, signatureComponents);
      
      const isValid = recoveredAddress.toLowerCase() === expectedAddress.toLowerCase();
      
      return {
        valid: isValid,
        message,
        recoveredAddress: recoveredAddress.toLowerCase(),
        expectedAddress: expectedAddress.toLowerCase(),
        messageHash,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      throw new RPCError(
        `Message signature verification failed: ${error.message}`,
        SIGNATURE_VALIDATION_ERRORS.SIGNATURE_VERIFICATION_FAILED,
        { originalError: error }
      );
    }
  }

  /**
   * Gets signature information without full validation
   */
  getSignatureInfo(signature) {
    try {
      const components = this._extractSignatureComponents({ signature: signature.signature || signature });
      
      return {
        format: components.format,
        type: components.type,
        components: {
          r: components.r,
          s: components.s,
          v: components.v
        },
        chainId: components.chainId,
        isHighS: this._isHighS(components.s),
        entropy: {
          r: this._calculateEntropy(components.r.slice(2)),
          s: this._calculateEntropy(components.s.slice(2))
        },
        security: this._assessCryptographicStrength(components),
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      throw new RPCError(
        `Failed to extract signature info: ${error.message}`,
        SIGNATURE_VALIDATION_ERRORS.INVALID_SIGNATURE_FORMAT,
        { originalError: error }
      );
    }
  }

  /**
   * Helper methods using real implementations
   */

  _isAuthorizedSigner(address) {
    return this.authorizedSigners.size === 0 || this.authorizedSigners.has(address.toLowerCase());
  }

  _isBlacklistedSigner(address) {
    return this.blacklistedSigners.has(address.toLowerCase());
  }

  _isKnownAddress(address) {
    return this.authorizedSigners.has(address.toLowerCase()) || 
           this.validationHistory.has(address.toLowerCase());
  }

  _classifyAddress(address) {
    if (this.authorizedSigners.has(address.toLowerCase())) {
      return 'authorized';
    }
    if (this.blacklistedSigners.has(address.toLowerCase())) {
      return 'blacklisted';
    }
    if (this.validationHistory.has(address.toLowerCase())) {
      return 'known';
    }
    return 'unknown';
  }

  _normalizeHex(hex) {
    if (!hex) return hex;
    if (typeof hex !== 'string') return hex;
    
    let normalized = hex.toLowerCase();
    if (!normalized.startsWith('0x')) {
      normalized = '0x' + normalized;
    }
    
    return normalized;
  }

  /**
   * Hashes signature for tracking using real keccak256
   */
  _hashSignature(signatureComponents) {
    const combined = `${signatureComponents.r}${signatureComponents.s}${signatureComponents.v}`;
    return '0x' + keccak256(combined);
  }

  /**
   * Checks for repeating patterns in hex string
   */
  _hasRepeatingPattern(hex) {
    if (hex.length < 8) return false;
    
    const pattern2 = hex.slice(0, 2);
    const pattern4 = hex.slice(0, 4);
    
    const repeatedPattern2 = pattern2.repeat(hex.length / 2);
    const repeatedPattern4 = pattern4.repeat(hex.length / 4);
    
    return hex === repeatedPattern2 || hex === repeatedPattern4;
  }

  /**
   * Calculates real entropy of hex string
   */
  _calculateEntropy(hex) {
    const frequencies = {};
    for (let i = 0; i < hex.length; i++) {
      const char = hex[i];
      frequencies[char] = (frequencies[char] || 0) + 1;
    }
    
    let entropy = 0;
    const length = hex.length;
    
    for (const freq of Object.values(frequencies)) {
      const p = freq / length;
      entropy -= p * Math.log2(p);
    }
    
    return entropy;
  }

  _hasLowEntropy(hex) {
    const entropy = this._calculateEntropy(hex);
    return entropy < 3.0;
  }

  _calculateAverageInterval(history) {
    if (history.length < 2) return null;
    
    let totalInterval = 0;
    for (let i = 1; i < history.length; i++) {
      totalInterval += history[i].timestamp - history[i - 1].timestamp;
    }
    
    return totalInterval / (history.length - 1);
  }

  _analyzeHistoricalPatterns(history) {
    return {
      frequency: history.length,
      timeSpan: history.length > 0 ? history[history.length - 1].timestamp - history[0].timestamp : 0,
      successRate: history.filter(h => h.status === 'valid').length / Math.max(history.length, 1),
      strategies: [...new Set(history.map(h => h.strategy))]
    };
  }

  _assessCryptographicStrength(components) {
    let strength = 'medium';
    let score = 70;

    if (this._isHighS(components.s)) {
      score -= 20;
    }

    const rEntropy = this._calculateEntropy(components.r.slice(2));
    const sEntropy = this._calculateEntropy(components.s.slice(2));
    
    if (rEntropy < 3.0 || sEntropy < 3.0) {
      score -= 30;
    } else if (rEntropy > 3.8 && sEntropy > 3.8) {
      score += 10;
    }

    if (this._hasRepeatingPattern(components.r.slice(2)) || 
        this._hasRepeatingPattern(components.s.slice(2))) {
      score -= 25;
    }

    if (score >= 85) strength = 'strong';
    else if (score >= 60) strength = 'medium';
    else if (score >= 40) strength = 'weak';
    else strength = 'very_weak';

    return { strength, score };
  }

  _extractWarnings(validationResult) {
    const warnings = [];
    
    if (validationResult.warnings) {
      warnings.push(...validationResult.warnings);
    }

    if (validationResult.signatureComponents && 
        this._isHighS(validationResult.signatureComponents.s)) {
      warnings.push({
        type: 'signature_malleability',
        message: 'Signature has high S value - potential malleability',
        severity: 'medium'
      });
    }

    return warnings;
  }

  _generateRecommendations(transaction, validationResult) {
    const recommendations = [];

    if (validationResult.signatureComponents && 
        this._isHighS(validationResult.signatureComponents.s)) {
      recommendations.push({
        type: 'signature_malleability',
        message: 'Use canonical signature with low S value to prevent malleability',
        action: 'enforce_canonical_signatures'
      });
    }

    if (!validationResult.signatureComponents?.chainId && this.networkConfig.enforceChainId) {
      recommendations.push({
        type: 'chain_id_enforcement',
        message: 'Use EIP-155 signatures with chain ID for replay protection',
        action: 'enable_eip155'
      });
    }

    return recommendations;
  }

  _cleanupReplayTracker() {
    const now = Date.now();
    const maxAge = 3600000; // 1 hour

    for (const [hash, data] of this.replayTracker.entries()) {
      if (now - data.timestamp > maxAge) {
        this.replayTracker.delete(hash);
      }
    }
  }

  async _checkRateLimits() {
    const now = Date.now();

    if (!this.validationHistory.has('rateLimiting')) {
      this.validationHistory.set('rateLimiting', []);
    }

    const rateLimitHistory = this.validationHistory.get('rateLimiting');
    
    const lastSecond = rateLimitHistory.filter(entry => now - entry.timestamp < 1000);
    if (lastSecond.length >= this.config.maxValidationsPerSecond) {
      throw new RPCError(
        'Rate limit exceeded: too many signature validations per second',
        SIGNATURE_VALIDATION_ERRORS.RATE_LIMIT_EXCEEDED,
        {
          limit: this.config.maxValidationsPerSecond,
          current: lastSecond.length,
          timeWindow: '1 second'
        }
      );
    }

    const lastMinute = rateLimitHistory.filter(entry => now - entry.timestamp < 60000);
    if (lastMinute.length >= this.config.maxValidationsPerMinute) {
      throw new RPCError(
        'Rate limit exceeded: too many signature validations per minute',
        SIGNATURE_VALIDATION_ERRORS.RATE_LIMIT_EXCEEDED,
        {
          limit: this.config.maxValidationsPerMinute,
          current: lastMinute.length,
          timeWindow: '1 minute'
        }
      );
    }

    rateLimitHistory.push({ timestamp: now });
    
    const filtered = rateLimitHistory.filter(entry => now - entry.timestamp < 60000);
    this.validationHistory.set('rateLimiting', filtered);
  }

  _startBackgroundServices() {
    this.services = {
      cleanup: setInterval(() => {
        try {
          this._performCleanup();
        } catch (error) {
          this.logger.warn('Cleanup service failed', { error: error.message });
        }
      }, 300000), // Every 5 minutes

      patternAnalysis: setInterval(() => {
        try {
          this._analyzeGlobalPatterns();
        } catch (error) {
          this.logger.warn('Pattern analysis failed', { error: error.message });
        }
      }, 600000) // Every 10 minutes
    };
  }

  _performCleanup() {
    const now = Date.now();
    const maxAge = 86400000; // 24 hours

    for (const [address, history] of this.validationHistory.entries()) {
      const filtered = history.filter(entry => now - entry.timestamp < maxAge);
      if (filtered.length === 0) {
        this.validationHistory.delete(address);
      } else {
        this.validationHistory.set(address, filtered);
      }
    }

    for (const [address, patterns] of this.suspiciousPatterns.entries()) {
      const filtered = patterns.signatures.filter(sig => now - sig.timestamp < maxAge);
      if (filtered.length === 0) {
        this.suspiciousPatterns.delete(address);
      } else {
        patterns.signatures = filtered;
      }
    }

    this._cleanupReplayTracker();

    for (const [key, cache] of this.signatureCache.entries()) {
      if (now - cache.timestamp > this.config.cacheTimeout) {
        this.signatureCache.delete(key);
      }
    }
  }

  _analyzeGlobalPatterns() {
    const totalAddresses = this.validationHistory.size;
    const suspiciousAddresses = this.suspiciousPatterns.size;
    
    if (totalAddresses > 0) {
      const suspiciousRatio = suspiciousAddresses / totalAddresses;
      
      if (suspiciousRatio > 0.1) {
        this.logger.warn('High ratio of suspicious addresses detected', {
          totalAddresses,
          suspiciousAddresses,
          ratio: suspiciousRatio
        });
      }
    }

    this.logger.debug('Global pattern analysis completed', {
      totalAddresses,
      suspiciousAddresses,
      replayTrackerSize: this.replayTracker.size
    });
  }

  /**
   * Management methods
   */
  addAuthorizedSigners(addresses) {
    addresses.forEach(address => {
      this.authorizedSigners.add(address.toLowerCase());
    });
    
    this.logger.info('Authorized signers added', {
      count: addresses.length,
      totalAuthorized: this.authorizedSigners.size
    });
  }

  removeAuthorizedSigners(addresses) {
    addresses.forEach(address => {
      this.authorizedSigners.delete(address.toLowerCase());
    });
    
    this.logger.info('Authorized signers removed', {
      count: addresses.length,
      totalAuthorized: this.authorizedSigners.size
    });
  }

  addBlacklistedSigners(addresses) {
    addresses.forEach(address => {
      this.blacklistedSigners.add(address.toLowerCase());
    });
    
    this.logger.info('Blacklisted signers added', {
      count: addresses.length,
      totalBlacklisted: this.blacklistedSigners.size
    });
  }

  removeBlacklistedSigners(addresses) {
    addresses.forEach(address => {
      this.blacklistedSigners.delete(address.toLowerCase());
    });
    
    this.logger.info('Blacklisted signers removed', {
      count: addresses.length,
      totalBlacklisted: this.blacklistedSigners.size
    });
  }

  getStats() {
    return {
      validator: 'SignatureValidator',
      version: '1.0.0',
      chainId: this.chainId,
      network: this.networkConfig.name,
      strategy: this.strategy,
      
      tracking: {
        validationHistorySize: this.validationHistory.size,
        suspiciousPatternsSize: this.suspiciousPatterns.size,
        replayTrackerSize: this.replayTracker.size,
        signatureCacheSize: this.signatureCache.size
      },
      
      authorization: {
        authorizedSigners: this.authorizedSigners.size,
        blacklistedSigners: this.blacklistedSigners.size
      },
      
      performance: this.metrics.getStats(),
      uptime: Date.now() - this.startTime,
      timestamp: new Date().toISOString()
    };
  }

  getSignatureHistory(address, limit = 100) {
    const addressKey = address.toLowerCase();
    const history = this.validationHistory.get(addressKey) || [];
    
    return history
      .slice(-limit)
      .map(entry => ({
        timestamp: entry.timestamp,
        status: entry.status,
        strategy: entry.strategy,
        signatureHash: entry.signatureHash?.slice(0, 10) + '...',
        transactionHash: entry.transactionHash
      }));
  }

  getAddressSecurityAnalysis(address) {
    const addressKey = address.toLowerCase();
    
    return {
      address: this._maskAddress(address),
      classification: this._classifyAddress(address),
      isAuthorized: this._isAuthorizedSigner(address),
      isBlacklisted: this._isBlacklistedSigner(address),
      validationCount: (this.validationHistory.get(addressKey) || []).length,
      suspiciousPatterns: this.suspiciousPatterns.has(addressKey),
      firstSeen: this.validationHistory.get(addressKey)?.[0]?.timestamp || null,
      lastSeen: this.validationHistory.get(addressKey)?.slice(-1)[0]?.timestamp || null,
      timestamp: new Date().toISOString()
    };
  }

  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    
    this.logger.info('SignatureValidator configuration updated', {
      updatedFields: Object.keys(newConfig)
    });
  }

  clearData(type = 'all') {
    switch (type) {
      case 'cache':
        this.signatureCache.clear();
        break;
      case 'history':
        this.validationHistory.clear();
        break;
      case 'patterns':
        this.suspiciousPatterns.clear();
        break;
      case 'replay':
        this.replayTracker.clear();
        break;
      case 'all':
      default:
        this.signatureCache.clear();
        this.validationHistory.clear();
        this.suspiciousPatterns.clear();
        this.replayTracker.clear();
        break;
    }
    
    this.logger.debug('Data cleared', { type });
  }

  _maskAddress(address) {
    if (!address || address.length < 10) return address;
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  }

  _generateValidationId() {
    return `sig_val_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async shutdown() {
    this.logger.info('SignatureValidator shutdown initiated');

    Object.values(this.services).forEach(service => {
      if (service) clearInterval(service);
    });

    if (this.metrics) {
      await this.metrics.shutdown();
    }

    this.signatureCache.clear();
    this.validationHistory.clear();
    this.suspiciousPatterns.clear();
    this.replayTracker.clear();

    this.logger.info('SignatureValidator shutdown completed');
  }
}

/**
 * Factory functions
 */
export function createSignatureValidator(config) {
  return new SignatureValidator(config);
}

export async function validateSignature(transaction, chainId, options = {}) {
  const validator = new SignatureValidator({ chainId, ...options });
  
  try {
    return await validator.validateSignature(transaction, options);
  } finally {
    await validator.shutdown();
  }
}

export async function verifyMessageSignature(message, signature, expectedAddress, chainId) {
  const validator = new SignatureValidator({ chainId });
  
  try {
    return await validator.verifyMessageSignature(message, signature, expectedAddress);
  } finally {
    await validator.shutdown();
  }
}

export default SignatureValidator;/**
 * @fileoverview Production Enterprise-grade Signature Validator for Trust Crypto Wallet Extension
 * @version 1.0.0
 * @author Trust Wallet Development Team
 * @license MIT
 * @description PRODUCTION-READY signature validator with real cryptographic functions and enterprise features
 */

import { ethers } from 'ethers';
import { keccak256 } from 'js-sha3';
import { RPCError, RPC_ERROR_CODES } from '../providers/RPCBroadcastProvider.js';
import { SecurityManager } from '../../security/SecurityManager.js';
import { MetricsCollector } from '../../monitoring/MetricsCollector.js';
import { Logger } from '../../utils/Logger.js';

/**
 * Signature validation error codes
 */
export const SIGNATURE_VALIDATION_ERRORS = {
  // Basic validation errors
  INVALID_SIGNATURE: 'SIG_INVALID_SIGNATURE',
  MISSING_SIGNATURE: 'SIG_MISSING_SIGNATURE',
  INVALID_SIGNATURE_FORMAT: 'SIG_INVALID_FORMAT',
  INVALID_SIGNATURE_LENGTH: 'SIG_INVALID_LENGTH',
  
  // Component validation errors
  INVALID_R_VALUE: 'SIG_INVALID_R_VALUE',
  INVALID_S_VALUE: 'SIG_INVALID_S_VALUE',
  INVALID_V_VALUE: 'SIG_INVALID_V_VALUE',
  INVALID_RECOVERY_ID: 'SIG_INVALID_RECOVERY_ID',
  
  // Cryptographic validation errors
  SIGNATURE_VERIFICATION_FAILED: 'SIG_VERIFICATION_FAILED',
  PUBLIC_KEY_RECOVERY_FAILED: 'SIG_RECOVERY_FAILED',
  INVALID_MESSAGE_HASH: 'SIG_INVALID_MESSAGE_HASH',
  CRYPTOGRAPHIC_ERROR: 'SIG_CRYPTOGRAPHIC_ERROR',
  
  // Address validation errors
  ADDRESS_MISMATCH: 'SIG_ADDRESS_MISMATCH',
  INVALID_SIGNER_ADDRESS: 'SIG_INVALID_SIGNER_ADDRESS',
  UNAUTHORIZED_SIGNER: 'SIG_UNAUTHORIZED_SIGNER',
  BLACKLISTED_SIGNER: 'SIG_BLACKLISTED_SIGNER',
  
  // Security validation errors
  WEAK_SIGNATURE: 'SIG_WEAK_SIGNATURE',
  SIGNATURE_MALLEABILITY: 'SIG_MALLEABILITY',
  REPLAY_ATTACK_DETECTED: 'SIG_REPLAY_ATTACK',
  SUSPICIOUS_SIGNATURE_PATTERN: 'SIG_SUSPICIOUS_PATTERN',
  
  // Multi-signature errors
  INSUFFICIENT_SIGNATURES: 'SIG_INSUFFICIENT_SIGNATURES',
  DUPLICATE_SIGNATURE: 'SIG_DUPLICATE_SIGNATURE',
  INVALID_MULTISIG_SETUP: 'SIG_INVALID_MULTISIG_SETUP',
  THRESHOLD_NOT_MET: 'SIG_THRESHOLD_NOT_MET',
  
  // Business logic errors
  SIGNATURE_EXPIRED: 'SIG_SIGNATURE_EXPIRED',
  RATE_LIMIT_EXCEEDED: 'SIG_RATE_LIMIT_EXCEEDED',
  MAINTENANCE_MODE: 'SIG_MAINTENANCE_MODE'
};

/**
 * Signature validation strategies
 */
export const SIGNATURE_STRATEGIES = {
  STRICT: 'strict',
  STANDARD: 'standard',
  PERMISSIVE: 'permissive',
  FORENSIC: 'forensic'
};

/**
 * Signature types and formats
 */
export const SIGNATURE_TYPES = {
  ECDSA: 'ecdsa',
  ECDSA_COMPACT: 'compact',
  MULTISIG: 'multisig',
  TYPED_DATA: 'typed_data',
  MESSAGE: 'message'
};

/**
 * Network-specific signature configurations
 */
export const SIGNATURE_NETWORK_CONFIGS = {
  1: { // Ethereum Mainnet
    name: 'ethereum',
    chainId: 1,
    supportedTypes: [SIGNATURE_TYPES.ECDSA, SIGNATURE_TYPES.TYPED_DATA, SIGNATURE_TYPES.MESSAGE],
    enforceChainId: true,
    allowLegacySignatures: true,
    enableReplayProtection: true,
    maxSignatureAge: 3600000, // 1 hour
    requireStrictS: true
  },
  56: { // BSC
    name: 'bsc',
    chainId: 56,
    supportedTypes: [SIGNATURE_TYPES.ECDSA, SIGNATURE_TYPES.TYPED_DATA],
    enforceChainId: true,
    allowLegacySignatures: false,
    enableReplayProtection: true,
    maxSignatureAge: 1800000, // 30 minutes
    requireStrictS: true
  },
  137: { // Polygon
    name: 'polygon',
    chainId: 137,
    supportedTypes: [SIGNATURE_TYPES.ECDSA, SIGNATURE_TYPES.TYPED_DATA, SIGNATURE_TYPES.MESSAGE],
    enforceChainId: true,
    allowLegacySignatures: true,
    enableReplayProtection: true,
    maxSignatureAge: 1800000, // 30 minutes
    requireStrictS: true
  },
  42161: { // Arbitrum
    name: 'arbitrum',
    chainId: 42161,
    supportedTypes: [SIGNATURE_TYPES.ECDSA, SIGNATURE_TYPES.TYPED_DATA],
    enforceChainId: true,
    allowLegacySignatures: false,
    enableReplayProtection: true,
    maxSignatureAge: 3600000, // 1 hour
    requireStrictS: true
  }
};

/**
 * PRODUCTION Enterprise-grade Signature Validator
 * @class SignatureValidator
 */
export class SignatureValidator {
  constructor({
    chainId,
    strategy = SIGNATURE_STRATEGIES.STANDARD,
    security = {},
    cryptographic = {},
    monitoring = {},
    authorizedSigners = [],
    blacklistedSigners = []
  }) {
    if (!chainId || typeof chainId !== 'number') {
      throw new Error('Valid chain ID is required');
    }

    this.chainId = chainId;
    this.strategy = strategy;
    this.networkConfig = SIGNATURE_NETWORK_CONFIGS[chainId];
    
    if (!this.networkConfig) {
      throw new Error(`Unsupported chain ID: ${chainId}`);
    }

    // Initialize components
    this.logger = new Logger('SignatureValidator');
    this.securityManager = new SecurityManager({
      enableSignatureAnalysis: true,
      enablePatternDetection: true,
      enableReplayDetection: true,
      ...security
    });
    
    this.metrics = new MetricsCollector({
      component: 'signature_validator',
      labels: { chainId: this.chainId, network: this.networkConfig.name },
      ...monitoring
    });

    // Configuration with defaults
    this.config = {
      strategy: this.strategy,
      enforceChainId: this.networkConfig.enforceChainId,
      allowLegacySignatures: this.networkConfig.allowLegacySignatures,
      requireStrictS: this.networkConfig.requireStrictS,
      enableReplayProtection: this.networkConfig.enableReplayProtection,
      enableSecurityChecks: true,
      enablePatternAnalysis: true,
      enableMalleabilityCheck: true,
      detectWeakSignatures: true,
      maxSignatureAge: this.networkConfig.maxSignatureAge,
      enableMultiSig: true,
      maxSigners: 20,
      defaultThreshold: 1,
      enableCaching: true,
      cacheTimeout: 300000, // 5 minutes
      enableParallelVerification: true,
      maxValidationsPerSecond: 100,
      maxValidationsPerMinute: 1000,
      ...cryptographic
    };

    // Initialize data structures
    this.signatureCache = new Map();
    this.validationHistory = new Map();
    this.authorizedSigners = new Set(authorizedSigners.map(addr => addr.toLowerCase()));
    this.blacklistedSigners = new Set(blacklistedSigners.map(addr => addr.toLowerCase()));
    this.suspiciousPatterns = new Map();
    this.replayTracker = new Map();

    this.startTime = Date.now();
    this._startBackgroundServices();

    this.logger.info('Production SignatureValidator initialized', {
      chainId: this.chainId,
      network: this.networkConfig.name,
      strategy: this.strategy
    });
  }

  /**
   * Main validation method - validates transaction signature
   */
  async validateSignature(transaction, options = {}) {
    const startTime = Date.now();
    const validationId = this._generateValidationId();

    try {
      this.logger.debug('Starting signature validation', {
        validationId,
        strategy: this.strategy,
        chainId: this.chainId
      });

      this.metrics.increment('validations_total');

      await this._preValidationChecks(transaction, options);
      const signatureComponents = this._extractSignatureComponents(transaction);
      const validationResult = await this._performSignatureValidation(
        transaction,
        signatureComponents,
        options
      );

      await this._performSecurityAnalysis(transaction, signatureComponents, validationResult, options);
      await this._updateTrackingData(transaction, signatureComponents, validationResult);

      const result = {
        valid: true,
        validationId,
        timestamp: new Date().toISOString(),
        chainId: this.chainId,
        network: this.networkConfig.name,
        strategy: this.strategy,
        validationTime: Date.now() - startTime,
        signature: {
          format: signatureComponents.format,
          type: signatureComponents.type,
          recoveredAddress: validationResult.recoveredAddress,
          isAuthorized: this._isAuthorizedSigner(validationResult.recoveredAddress)
        },
        verification: validationResult,
        warnings: this._extractWarnings(validationResult),
        recommendations: this._generateRecommendations(transaction, validationResult),
        metadata: {
          validator: 'SignatureValidator',
          version: '1.0.0',
          cryptographicStrength: this._assessCryptographicStrength(signatureComponents)
        }
      };

      this.metrics.increment('validations_successful');
      this.metrics.recordTiming('validation_duration', result.validationTime);

      this.logger.info('Signature validation completed successfully', {
        validationId,
        validationTime: result.validationTime,
        recoveredAddress: this._maskAddress(validationResult.recoveredAddress),
        isAuthorized: result.signature.isAuthorized,
        warnings: result.warnings.length
      });

      return result;

    } catch (error) {
      const validationTime = Date.now() - startTime;
      
      this.metrics.increment('validations_failed');
      this.metrics.increment('validation_errors', { errorType: error.code || 'unknown' });

      this.logger.error('Signature validation failed', {
        validationId,
        error: error.message,
        errorCode: error.code,
        validationTime
      });

      throw new RPCError(
        `Signature validation failed: ${error.message}`,
        error.code || SIGNATURE_VALIDATION_ERRORS.INVALID_SIGNATURE,
        {
          validationId,
          originalError: error,
          validationTime,
          chainId: this.chainId,
          strategy: this.strategy
        }
      );
    }
  }

  /**
   * Performs pre-validation checks
   */
  async _preValidationChecks(transaction, options) {
    if (!transaction || typeof transaction !== 'object') {
      throw new RPCError(
        'Transaction object is required',
        SIGNATURE_VALIDATION_ERRORS.INVALID_SIGNATURE
      );
    }

    if (!this._hasSignature(transaction)) {
      throw new RPCError(
        'Transaction signature is required',
        SIGNATURE_VALIDATION_ERRORS.MISSING_SIGNATURE
      );
    }

    if (options.maintenanceMode) {
      throw new RPCError(
        'Signature validation unavailable during maintenance',
        SIGNATURE_VALIDATION_ERRORS.MAINTENANCE_MODE
      );
    }

    await this._checkRateLimits();
  }

  /**
   * Checks if transaction has signature
   */
  _hasSignature(transaction) {
    return (transaction.r && transaction.s && transaction.v !== undefined) ||
           transaction.signature ||
           transaction.sig;
  }

  /**
   * Extracts signature components from transaction
   */
  _extractSignatureComponents(transaction) {
    let r, s, v;
    let format = 'rsv';
    let type = SIGNATURE_TYPES.ECDSA;

    // Extract from r, s, v fields
    if (transaction.r && transaction.s && transaction.v !== undefined) {
      r = this._normalizeHex(transaction.r);
      s = this._normalizeHex(transaction.s);
      v = parseInt(transaction.v, 16) || transaction.v;
      format = 'rsv';
    }
    // Extract from signature field
    else if (transaction.signature) {
      const sig = this._normalizeHex(transaction.signature);
      if (sig.length === 130) { // 65 bytes in hex (without 0x)
        r = '0x' + sig.slice(0, 64);
        s = '0x' + sig.slice(64, 128);
        v = parseInt(sig.slice(128, 130), 16);
        format = 'compact';
      } else {
        throw new RPCError(
          'Invalid signature format',
          SIGNATURE_VALIDATION_ERRORS.INVALID_SIGNATURE_FORMAT,
          { signatureLength: sig.length }
        );
      }
    }
    // Extract from sig field
    else if (transaction.sig) {
      const sig = this._normalizeHex(transaction.sig);
      if (sig.length === 130) {
        r = '0x' + sig.slice(0, 64);
        s = '0x' + sig.slice(64, 128);
        v = parseInt(sig.slice(128, 130), 16);
        format = 'compact';
      }
    }
    else {
      throw new RPCError(
        'No valid signature found in transaction',
        SIGNATURE_VALIDATION_ERRORS.MISSING_SIGNATURE
      );
    }

    this._validateSignatureComponents(r, s, v);

    if (transaction.type === 'typed_data' || transaction.typedData) {
      type = SIGNATURE_TYPES.TYPED_DATA;
    } else if (transaction.type === 'message' || transaction.message) {
      type = SIGNATURE_TYPES.MESSAGE;
    }

    return {
      r,
      s,
      v,
      format,
      type,
      chainId: this._extractChainIdFromV(v),
      raw: transaction.signature || `${r}${s.slice(2)}${v.toString(16).padStart(2, '0')}`
    };
  }

  /**
   * Validates signature components using real crypto validation
   */
  _validateSignatureComponents(r, s, v) {
    // Validate R component
    if (!r || typeof r !== 'string' || !r.startsWith('0x') || r.length !== 66) {
      throw new RPCError(
        'Invalid R component in signature',
        SIGNATURE_VALIDATION_ERRORS.INVALID_R_VALUE,
        { r }
      );
    }

    if (r === '0x0000000000000000000000000000000000000000000000000000000000000000') {
      throw new RPCError(
        'R component cannot be zero',
        SIGNATURE_VALIDATION_ERRORS.INVALID_R_VALUE
      );
    }

    // Validate S component
    if (!s || typeof s !== 'string' || !s.startsWith('0x') || s.length !== 66) {
      throw new RPCError(
        'Invalid S component in signature',
        SIGNATURE_VALIDATION_ERRORS.INVALID_S_VALUE,
        { s }
      );
    }

    if (s === '0x0000000000000000000000000000000000000000000000000000000000000000') {
      throw new RPCError(
        'S component cannot be zero',
        SIGNATURE_VALIDATION_ERRORS.INVALID_S_VALUE
      );
    }

    // Check for signature malleability (high S values) using real secp256k1 curve order
    if (this.config.requireStrictS && this._isHighS(s)) {
      throw new RPCError(
        'High S value detected - potential signature malleability',
        SIGNATURE_VALIDATION_ERRORS.SIGNATURE_MALLEABILITY,
        { s }
      );
    }

    // Validate V component
    if (typeof v !== 'number' || (v !== 27 && v !== 28 && v < 35)) {
      throw new RPCError(
        'Invalid V component in signature',
        SIGNATURE_VALIDATION_ERRORS.INVALID_V_VALUE,
        { v }
      );
    }
  }

  /**
   * Checks if S value is high (malleability risk) using real secp256k1 curve parameters
   */
  _isHighS(s) {
    const sNum = BigInt(s);
    // Real secp256k1 curve order
    const secp256k1_n = BigInt('0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141');
    const halfN = secp256k1_n / 2n;
    
    return sNum > halfN;
  }

  /**
   * Extracts chain ID from V component
   */
  _extractChainIdFromV(v) {
    if (v === 27 || v === 28) {
      return null; // Legacy signature
    }
    
    return Math.floor((v - 35) / 2);
  }

  /**
   * Performs signature validation based on strategy
   */
  async _performSignatureValidation(transaction, signatureComponents, options) {
    const strategy = options.strategy || this.strategy;
    
    // Create message hash using real keccak256
    const messageHash = await this._createMessageHash(transaction, signatureComponents.type);
    
    switch (strategy) {
      case SIGNATURE_STRATEGIES.STRICT:
        return await this._validateStrict(transaction, signatureComponents, messageHash);
      
      case SIGNATURE_STRATEGIES.STANDARD:
        return await this._validateStandard(transaction, signatureComponents, messageHash);
      
      case SIGNATURE_STRATEGIES.PERMISSIVE:
        return await this._validatePermissive(transaction, signatureComponents, messageHash);
      
      case SIGNATURE_STRATEGIES.FORENSIC:
        return await this._validateForensic(transaction, signatureComponents, messageHash);
      
      default:
        throw new RPCError(
          `Unknown validation strategy: ${strategy}`,
          SIGNATURE_VALIDATION_ERRORS.INVALID_SIGNATURE,
          { strategy }
        );
    }
  }

  /**
   * Creates message hash for signature verification using real keccak256
   */
  async _createMessageHash(transaction, signatureType) {
    try {
      switch (signatureType) {
        case SIGNATURE_TYPES.TYPED_DATA:
          return await this._createTypedDataHash(transaction);
        
        case SIGNATURE_TYPES.MESSAGE:
          return await this._createPersonalMessageHash(transaction);
        
        case SIGNATURE_TYPES.ECDSA:
        default:
          return await this._createTransactionHash(transaction);
      }
    } catch (error) {
      throw new RPCError(
        `Failed to create message hash: ${error.message}`,
        SIGNATURE_VALIDATION_ERRORS.INVALID_MESSAGE_HASH,
        { originalError: error, signatureType }
      );
    }
  }

  /**
   * Creates transaction hash using real RLP encoding and keccak256
   */
  async _createTransactionHash(transaction) {
    try {
      // Use ethers.js for proper transaction serialization
      const txData = {
        nonce: transaction.nonce || 0,
        gasPrice: transaction.gasPrice || transaction.maxFeePerGas || 0,
        gasLimit: transaction.gasLimit || transaction.gas || 0,
        to: transaction.to || '0x',
        value: transaction.value || 0,
        data: transaction.data || transaction.input || '0x',
        chainId: this.chainId
      };

      // Use ethers for proper transaction hash calculation
      const serialized = ethers.Transaction.from(txData).unsignedSerialized;
      return '0x' + keccak256(ethers.getBytes(serialized));

    } catch (error) {
      throw new Error(`Transaction hash creation failed: ${error.message}`);
    }
  }

  /**
   * Creates typed data hash (EIP-712) using real implementation
   */
  async _createTypedDataHash(transaction) {
    if (!transaction.typedData) {
      throw new Error('Typed data not found in transaction');
    }
    
    try {
      // Use ethers.js for proper EIP-712 hash calculation
      const domain = transaction.typedData.domain;
      const types = transaction.typedData.types;
      const message = transaction.typedData.message;
      
      return ethers.TypedDataEncoder.hash(domain, types, message);
    } catch (error) {
      throw new Error(`EIP-712 hash creation failed: ${error.message}`);
    }
  }

  /**
   * Creates personal message hash using real implementation
   */
  async _createPersonalMessageHash(transaction) {
    if (!transaction.message) {
      throw new Error('Message not found in transaction');
    }
    
    try {
      // Use ethers.js for proper personal message hash
      return ethers.hashMessage(transaction.message);
    } catch (error) {
      throw new Error(`Personal message hash creation failed: ${error.message}`);
    }
  }

  /**
   * Strict validation - maximum security
   */
  async _validateStrict(transaction, signatureComponents, messageHash) {
    // Validate chain ID if enforced
    if (this.config.enforceChainId && signatureComponents.chainId !== this.chainId) {
      throw new RPCError(
        'Chain ID mismatch in signature',
        SIGNATURE_VALIDATION_ERRORS.INVALID_SIGNATURE,
        {
          expected: this.chainId,
          actual: signatureComponents.chainId
        }
      );
    }

    // Recover public key and address using real cryptography
    const recoveredAddress = await this._recoverAddress(messageHash, signatureComponents);

    // Validate against transaction from field
    if (transaction.from && transaction.from.toLowerCase() !== recoveredAddress.toLowerCase()) {
      throw new RPCError(
        'Signature does not match transaction sender',
        SIGNATURE_VALIDATION_ERRORS.ADDRESS_MISMATCH,
        {
          expected: transaction.from.toLowerCase(),
          recovered: recoveredAddress.toLowerCase()
        }
      );
    }

    // Check authorization
    if (this.authorizedSigners.size > 0 && !this._isAuthorizedSigner(recoveredAddress)) {
      throw new RPCError(
        'Signer not authorized',
        SIGNATURE_VALIDATION_ERRORS.UNAUTHORIZED_SIGNER,
        { signer: this._maskAddress(recoveredAddress) }
      );
    }

    return {
      status: 'valid',
      strategy: 'strict',
      message: 'Signature passed strict validation',
      recoveredAddress: recoveredAddress.toLowerCase(),
      messageHash,
      signatureComponents
    };
  }

  /**
   * Standard validation - production default
   */
  async _validateStandard(transaction, signatureComponents, messageHash) {
    // Recover address using real cryptography
    const recoveredAddress = await this._recoverAddress(messageHash, signatureComponents);

    // Check blacklist
    if (this._isBlacklistedSigner(recoveredAddress)) {
      throw new RPCError(
        'Signer is blacklisted',
        SIGNATURE_VALIDATION_ERRORS.BLACKLISTED_SIGNER,
        { signer: this._maskAddress(recoveredAddress) }
      );
    }

    // Validate chain ID for EIP-155 transactions
    if (signatureComponents.chainId && signatureComponents.chainId !== this.chainId) {
      throw new RPCError(
        'Chain ID mismatch in signature',
        SIGNATURE_VALIDATION_ERRORS.INVALID_SIGNATURE,
        {
          expected: this.chainId,
          actual: signatureComponents.chainId
        }
      );
    }

    const warnings = [];

    // Check address match (warning if mismatch)
    if (transaction.from && transaction.from.toLowerCase() !== recoveredAddress.toLowerCase()) {
      warnings.push({
        type: 'address_mismatch',
        message: 'Recovered address does not match transaction from field',
        expected: transaction.from.toLowerCase(),
        recovered: recoveredAddress.toLowerCase()
      });
    }

    // Check authorization (warning if not authorized)
    if (this.authorizedSigners.size > 0 && !this._isAuthorizedSigner(recoveredAddress)) {
      warnings.push({
        type: 'unauthorized_signer',
        message: 'Signer not in authorized list',
        signer: this._maskAddress(recoveredAddress)
      });
    }

    return {
      status: 'valid',
      strategy: 'standard',
      message: 'Signature passed standard validation',
      recoveredAddress: recoveredAddress.toLowerCase(),
      messageHash,
      signatureComponents,
      warnings
    };
  }

  /**
   * Permissive validation - for testing/development
   */
  async _validatePermissive(transaction, signatureComponents, messageHash) {
    try {
      const recoveredAddress = await this._recoverAddress(messageHash, signatureComponents);
      
      return {
        status: 'valid',
        strategy: 'permissive',
        message: 'Signature passed permissive validation',
        recoveredAddress: recoveredAddress.toLowerCase(),
        messageHash,
        signatureComponents,
        note: 'Permissive validation bypasses most security checks'
      };
    } catch (error) {
      return {
        status: 'invalid',
        strategy: 'permissive',
        message: 'Signature validation failed even in permissive mode',
        error: error.message,
        signatureComponents
      };
    }
  }

  /**
   * Forensic validation - deep analysis
   */
  async _validateForensic(transaction, signatureComponents, messageHash) {
    const analysis = {
      status: 'analyzed',
      strategy: 'forensic',
      timestamp: Date.now()
    };

    try {
      const recoveredAddress = await this._recoverAddress(messageHash, signatureComponents);
      analysis.recoveredAddress = recoveredAddress.toLowerCase();
      analysis.recoverySuccessful = true;

      // Deep cryptographic analysis
      analysis.cryptographicAnalysis = {
        rValue: signatureComponents.r,
        sValue: signatureComponents.s,
        vValue: signatureComponents.v,
        isLowS: !this._isHighS(signatureComponents.s),
        chainIdFromV: signatureComponents.chainId,
        signatureLength: signatureComponents.raw.length
      };

      // Pattern analysis
      analysis.patternAnalysis = await this._performPatternAnalysis(signatureComponents, recoveredAddress);

      // Security assessment
      analysis.securityAssessment = await this._assessSignatureSecurity(signatureComponents, recoveredAddress);

      // Historical analysis
      analysis.historicalAnalysis = await this._performHistoricalAnalysis(recoveredAddress);

      analysis.message = 'Forensic analysis completed';

    } catch (error) {
      analysis.recoverySuccessful = false;
      analysis.error = error.message;
      analysis.message = 'Forensic analysis completed with errors';
    }

    return analysis;
  }

  /**
   * Recovers address from signature using real ECDSA recovery
   */
  async _recoverAddress(messageHash, signatureComponents) {
    try {
      // Use ethers.js for real ECDSA recovery
      const signature = {
        r: signatureComponents.r,
        s: signatureComponents.s,
        v: signatureComponents.v
      };

      // Convert to ethers signature format
      const ethersSignature = ethers.Signature.from({
        r: signature.r,
        s: signature.s,
        v: signature.v
      });

      // Recover address using ethers
      const recoveredAddress = ethers.recoverAddress(messageHash, ethersSignature);
      
      if (!recoveredAddress) {
        throw new Error('Address recovery failed');
      }

      return recoveredAddress;

    } catch (error) {
      throw new RPCError(
        `Public key recovery failed: ${error.message}`,
        SIGNATURE_VALIDATION_ERRORS.PUBLIC_KEY_RECOVERY_FAILED,
        { originalError: error }
      );
    }
  }

  /**
   * Performs security analysis on signature
   */
  async _performSecurityAnalysis(transaction, signatureComponents, validationResult, options) {
    if (!this.config.enableSecurityChecks) {
      return;
    }

    if (this.config.enableReplayProtection) {
      await this._detectReplayAttacks(transaction, signatureComponents);
    }

    if (this.config.detectWeakSignatures) {
      await this._detectWeakSignatures(signatureComponents);
    }

    if (this.config.enablePatternAnalysis) {
      await this._detectSuspiciousPatterns(signatureComponents, validationResult.recoveredAddress);
    }

    await this._validateSignatureAge(transaction, options);
  }

  /**
   * Detects potential replay attacks
   */
  async _detectReplayAttacks(transaction, signatureComponents) {
    const signatureHash = this._hashSignature(signatureComponents);
    const now = Date.now();

    if (this.replayTracker.has(signatureHash)) {
      const lastUsed = this.replayTracker.get(signatureHash);
      const timeDiff = now - lastUsed.timestamp;
      
      if (timeDiff < 300000) { // 5 minutes
        throw new RPCError(
          'Potential replay attack: signature recently used',
          SIGNATURE_VALIDATION_ERRORS.REPLAY_ATTACK_DETECTED,
          {
            signatureHash: signatureHash.slice(
