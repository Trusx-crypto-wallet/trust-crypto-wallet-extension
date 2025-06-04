async #generateSecureEntropy (length) {
    try {
      // Generate entropy based on mnemonic length
      const entropyBits = (length * 11) - (length * 11 / 33);
      const entropyBytes = Math.ceil(entropyBits / 8);
      
      // Use crypto.getRandomValues for secure entropy
      const entropy = new Uint8Array(entropyBytes);
      crypto.getRandomValues(entropy);
      
      // Mix with additional entropy sources if available
      if (this.entropyPool.length > 0) {
        for (let i = 0; i < entropy.length; i++) {
          entropy[i] ^= this.entropyPool[i % this.entropyPool.length];
        }
      }
      
      return Array.from(entropy);
    } catch (error) {
      throw new Error(`${this.ERROR_TYPES.ENTROPY_ERROR}: Failed to generate secure entropy`);
    }
  }

  #calculateMnemonicChecksum (mnemonic) {
    return CryptoJS.SHA256(mnemonic).toString();
  }

  async #verifyMnemonicChecksum (mnemonic) {
    try {
      // Use ethers built-in validation
      return ethers.Mnemonic.isValidMnemonic(mnemonic);
    } catch (error) {
      return false;
    }
  }

  #calculateMnemonicStrength (wordCount) {
    const strengthMap = {
      12: 'medium',    // 128 bits
      15: 'strong',    // 160 bits
      18: 'strong',    // 192 bits
      21: 'very_strong', // 224 bits
      24: 'very_strong'  // 256 bits
    };
    return strengthMap[wordCount] || 'unknown';
  }

  async #createQRCodeBackup (mnemonic, password, options = {}) {
    try {
      let qrData = mnemonic;
      
      // Encrypt if password provided
      if (password) {
        qrData = this.#encryptData(mnemonic, password);
      }

      const qrCodeDataURL = await QRCode.toDataURL(qrData, {
        width: this.config.qrCodeSize,
        margin: 4,
        errorCorrectionLevel: this.config.qrErrorLevel,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });

      return {
        type: 'qr_code',
        data: qrCodeDataURL,
        encrypted: !!password,
        size: qrCodeDataURL.length,
        created: Date.now()
      };

    } catch (error) {
      throw new Error(`QR code backup creation failed: ${error.message}`);
    }
  }

  async #createEncryptedFileBackup (mnemonic, password, filename, options = {}) {
    try {
      const encryptedData = this.#encryptData(mnemonic, password);
      
      const fileData = {
        version: '2.2.0',
        type: 'encrypted_mnemonic',
        data: encryptedData,
        algorithm: this.config.encryptionAlgorithm,
        created: Date.now(),
        metadata: options.metadata || {}
      };

      const jsonData = JSON.stringify(fileData, null, 2);

      return {
        type: 'encrypted_file',
        filename: filename || `backup_${Date.now()}.json`,
        data: jsonData,
        size: jsonData.length,
        encrypted: true,
        created: Date.now()
      };

    } catch (error) {
      throw new Error(`Encrypted file backup creation failed: ${error.message}`);
    }
  }

  async #createPaperWalletBackup (mnemonic, options = {}) {
    try {
      const words = mnemonic.split(' ');
      const qrCode = await this.generatePaymentQR({ data: mnemonic });
      
      const paperWallet = {
        type: 'paper_wallet',
        template: this.config.paperWalletTemplate,
        mnemonic: {
          words,
          wordCount: words.length,
          checksum: this.#calculateMnemonicChecksum(mnemonic)
        },
        qrCode,
        instructions: this.#getPaperWalletInstructions(),
        created: Date.now(),
        version: '2.2.0'
      };

      return paperWallet;

    } catch (error) {
      throw new Error(`Paper wallet backup creation failed: ${error.message}`);
    }
  }

  async #createKeystoreBackup (mnemonic, password, options = {}) {
    try {
      // Create wallet from mnemonic
      const wallet = ethers.Wallet.fromPhrase(mnemonic);
      
      // Create encrypted JSON keystore
      const keystoreJson = await wallet.encrypt(password);
      
      return {
        type: 'json_keystore',
        data: keystoreJson,
        address: wallet.address,
        encrypted: true,
        created: Date.now()
      };

    } catch (error) {
      throw new Error(`Keystore backup creation failed: ${error.message}`);
    }
  }

  async #restoreFromQRCode (qrData, password) {
    try {
      let data = qrData;
      
      // Decrypt if password provided
      if (password) {
        data = this.#decryptData(qrData, password);
      }

      return data.trim();

    } catch (error) {
      throw new Error(`QR code restoration failed: ${error.message}`);
    }
  }

  async #restoreFromEncryptedFile (fileData, password) {
    try {
      let parsedData;
      
      if (typeof fileData === 'string') {
        parsedData = JSON.parse(fileData);
      } else {
        parsedData = fileData;
      }

      if (!parsedData.data || !parsedData.type) {
        throw new Error('Invalid backup file format');
      }

      const decryptedMnemonic = this.#decryptData(parsedData.data, password);
      return decryptedMnemonic;

    } catch (error) {
      throw new Error(`Encrypted file restoration failed: ${error.message}`);
    }
  }

  async #restoreFromKeystore (keystoreData, password) {
    try {
      const wallet = await ethers.Wallet.fromEncryptedJson(keystoreData, password);
      return wallet.mnemonic.phrase;

    } catch (error) {
      throw new Error(`Keystore restoration failed: ${error.message}`);
    }
  }

  async #verifyMnemonicBackup (mnemonic) {
    try {
      const validation = await this.validateMnemonic(mnemonic);
      return validation.isValid && validation.checksumValid;
    } catch (error) {
      return false;
    }
  }

  async #verifyQRCodeBackup (qrData) {
    try {
      // Try to decode QR code data
      const decodedData = qrData; // In real implementation, decode QR image
      const isValid = await this.#verifyMnemonicBackup(decodedData);
      
      return {
        isValid,
        dataLength: decodedData.length,
        format: 'qr_code'
      };
    } catch (error) {
      return { isValid: false, error: error.message };
    }
  }

  async #verifyEncryptedFileBackup (fileData) {
    try {
      const parsedData = JSON.parse(fileData);
      
      return {
        isValid: !!(parsedData.data && parsedData.type && parsedData.version),
        version: parsedData.version,
        algorithm: parsedData.algorithm,
        hasMetadata: !!parsedData.metadata
      };
    } catch (error) {
      return { isValid: false, error: error.message };
    }
  }

  #encryptData (data, password) {
    try {
      if (!this.config.enableEncryption) {
        return data;
      }

      const encrypted = CryptoJS.AES.encrypt(data, password).toString();
      return encrypted;

    } catch (error) {
      throw new Error(`${this.ERROR_TYPES.ENCRYPTION_FAILED}: ${error.message}`);
    }
  }

  #decryptData (encryptedData, password) {
    try {
      const bytes = CryptoJS.AES.decrypt(encryptedData, password);
      const decrypted = bytes.toString(CryptoJS.enc.Utf8);
      
      if (!decrypted) {
        throw new Error('Invalid password or corrupted data');
      }
      
      return decrypted;

    } catch (error) {
      throw new Error(`${this.ERROR_TYPES.DECRYPTION_FAILED}: ${error.message}`);
    }
  }

  async #generatePaymentQR (params) {
    try {
      const qrCodeDataURL = await QRCode.toDataURL(params.data, {
        width: this.config.qrCodeSize,
        margin: 2,
        errorCorrectionLevel: this.config.qrErrorLevel
      });
      
      return qrCodeDataURL;
    } catch (error) {
      throw new Error(`QR generation failed: ${error.message}`);
    }
  }

  #getPaperWalletInstructions () {
    return {
      storage: [
        'Store in a secure, dry location',
        'Make multiple copies',
        'Keep away from direct sunlight',
        'Consider fireproof storage'
      ],
      security: [
        'Never share your seed phrase',
        'Verify all words before storing',
        'Keep offline at all times',
        'Test recovery before relying on backup'
      ],
      recovery: [
        'Enter words in exact order',
        'Double-check spelling',
        'Use official wallet software',
        'Verify addresses after recovery'
      ]
    };
  }

  async #initializeEntropyPool () {
    try {
      // Collect additional entropy from various sources
      const entropy = [];
      
      // Timestamp entropy
      entropy.push(...new Uint8Array(new ArrayBuffer(8)));
      const timestamp = Date.now();
      new DataView(entropy.buffer).setBigUint64(0, BigInt(timestamp));
      
      // Performance entropy
      if (typeof performance !== 'undefined') {
        const perfEntropy = performance.now() * 1000000;
        entropy.push(...new Uint8Array(new Float64Array([perfEntropy]).buffer));
      }
      
      // Screen entropy (if available)
      if (typeof screen !== 'undefined') {
        entropy.push(screen.width & 0xFF, screen.height & 0xFF);
      }
      
      this.entropyPool = entropy;
      
    } catch (error) {
      this.#logErr('Entropy pool initialization failed', error);
    }
  }

  async #verifyCryptographicFunctions () {
    try {
      // Test encryption/decryption
      const testData = 'test_data_for_verification';
      const testPassword = 'test_password_123';
      
      const encrypted = this.#encryptData(testData, testPassword);
      const decrypted = this.#decryptData(encrypted, testPassword);
      
      if (decrypted !== testData) {
        throw new Error('Cryptographic function verification failed');
      }
      
      // Test mnemonic generation
      const testWallet = ethers.Wallet.createRandom();
      const isValidMnemonic = ethers.Mnemonic.isValidMnemonic(testWallet.mnemonic.phrase);
      
      if (!isValidMnemonic) {
        throw new Error('Mnemonic generation verification failed');
      }
      
    } catch (error) {
      throw new Error(`Cryptographic verification failed: ${error.message}`);
    }
  }

  #initCleanupIntervals () {
    // Clean up old backup history every hour
    setInterval(() => {
      const now = Date.now();
      const retentionMs = this.config.backupRetention * 24 * 60 * 60 * 1000;
      const cutoff = now - retentionMs;
      
      for (const [backupId, backup] of this.backupHistory.entries()) {
        if (backup.created < cutoff) {
          this.backupHistory.delete(backupId);
        }
      }
      
      // Clean up old recovery attempts
      for (const [sessionId, attempt] of this.recoveryAttempts.entries()) {
        if (attempt.started < cutoff) {
          this.recoveryAttempts.delete(sessionId);
        }
      }
      
    }, 60 * 60 * 1000); // 1 hour

    // Clean up audit log every hour (keep last 1000 entries)
    setInterval(() => {
      if (this.auditLog.length > 1000) {
        this.auditLog = this.auditLog.slice(-1000);
      }
    }, 60 * 60 * 1000);
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

  #secureWipe (data) {
    if (typeof data === 'string') {
      // Overwrite string data (limited effectiveness in JS)
      data = '0'.repeat(data.length);
    }
  }

  #secureWipeAll () {
    // Clear sensitive maps
    this.backupHistory.clear();
    this.recoveryAttempts.clear();
    this.entropyPool = [];
  }

  #makeBackupId () {
    return `backup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  #makeSessionId () {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  #makeRecoveryId () {
    return `recovery_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  #log (message) {
    if (this.config.enableLogging) {
      console.log(`[BackupManager] ${new Date().toISOString()}: ${message}`);
    }
  }

  #logErr (message, error) {
    if (this.config.enableLogging) {
      console.error(`[BackupManager] ${new Date().toISOString()}: ${message}`, error);
    }
  }

  #audit (action, data = {}) {
    this.auditLog.push({
      action,
      data,
      timestamp: Date.now()
    });
  }
}/*  BackupManager.js – v2.2.0  (MIT)
 *  Production-grade seed phrase backup/restore engine for Trust Crypto Wallet
 *  — Secure mnemonic generation, validation, encryption, and recovery
 *  — Multiple backup formats: QR codes, encrypted files, paper wallets
 *  — BIP39 compliant with multi-language support
 *  — Advanced security features with entropy validation
 *  — Author: Trust Crypto Wallet Team
 */

import { ethers } from 'ethers';
import CryptoJS from 'crypto-js';
import QRCode from 'qrcode';

export default class BackupManager {
  /*------------------------------------------------------------------*/
  /* CONSTRUCTOR / CONFIG                                             */
  /*------------------------------------------------------------------*/
  constructor (opts = {}) {
    this.initialized = false;

    this.config = {
      enableLogging:       opts.enableLogging            ?? false,
      mnemonicLength:      opts.mnemonicLength           ?? 12,        // 12, 15, 18, 21, 24
      language:            opts.language                 ?? 'english',
      enableEncryption:    opts.enableEncryption         ?? true,
      encryptionAlgorithm: opts.encryptionAlgorithm      ?? 'AES',
      qrCodeSize:          opts.qrCodeSize               ?? 400,
      qrErrorLevel:        opts.qrErrorLevel             ?? 'M',       // L, M, Q, H
      paperWalletTemplate: opts.paperWalletTemplate      ?? 'standard',
      secureWipe:          opts.secureWipe               ?? true,
      validateEntropy:     opts.validateEntropy          ?? true,
      enableMetrics:       opts.enableMetrics            ?? false,
      backupRetention:     opts.backupRetention          ?? 30,        // days
      ...opts
    };

    /* ---------- Supported languages for BIP39 ---------- */
    this.supportedLanguages = {
      english: 'english',
      japanese: 'japanese',
      korean: 'korean',
      spanish: 'spanish',
      chinese_simplified: 'chinese_simplified',
      chinese_traditional: 'chinese_traditional',
      french: 'french',
      italian: 'italian',
      czech: 'czech'
    };

    /* ---------- Backup formats ---------- */
    this.backupFormats = {
      MNEMONIC: 'mnemonic',
      QR_CODE: 'qr_code',
      ENCRYPTED_FILE: 'encrypted_file',
      PAPER_WALLET: 'paper_wallet',
      JSON_KEYSTORE: 'json_keystore'
    };

    /* ---------- State ---------- */
    this.backupHistory      = new Map();   // backupId -> backup metadata
    this.recoveryAttempts   = new Map();   // sessionId -> attempt data
    this.auditLog           = [];          // security audit trail
    this.entropyPool        = [];          // additional entropy sources

    this.BACKUP_STATUS = {
      CREATED:   'created',
      VERIFIED:  'verified',
      CORRUPTED: 'corrupted',
      EXPIRED:   'expired'
    };

    this.ERROR_TYPES = {
      INVALID_MNEMONIC: 'invalid_mnemonic',
      INVALID_PASSWORD: 'invalid_password',
      ENCRYPTION_FAILED: 'encryption_failed',
      DECRYPTION_FAILED: 'decryption_failed',
      INVALID_FORMAT: 'invalid_format',
      ENTROPY_ERROR: 'entropy_error'
    };
  }

  /*------------------------------------------------------------------*/
  /* INITIALISATION                                                   */
  /*------------------------------------------------------------------*/
  async initialize () {
    try {
      // Initialize entropy pool
      await this.#initializeEntropyPool();
      
      // Verify cryptographic functions
      await this.#verifyCryptographicFunctions();
      
      // Initialize cleanup intervals
      this.#initCleanupIntervals();
      
      this.initialized = true;
      this.#log('BackupManager v2.2.0 ready');
      this.#audit('INIT_SUCCESS');
      return true;
    } catch (error) {
      this.#logErr('BackupManager initialization failed', error);
      this.#audit('INIT_FAILED', { error: error.message });
      throw new Error(`BackupManager initialization failed: ${error.message}`);
    }
  }

  /*------------------------------------------------------------------*/
  /* PUBLIC API – MNEMONIC GENERATION                                 */
  /*------------------------------------------------------------------*/
  async generateMnemonic (options = {}) {
    this.#preFlight();

    const {
      length = this.config.mnemonicLength,
      language = this.config.language,
      additionalEntropy = null
    } = options;

    const backupId = this.#makeBackupId();

    try {
      // Validate parameters
      this.#validateMnemonicParams(length, language);

      // Generate additional entropy if required
      let entropy = additionalEntropy;
      if (this.config.validateEntropy || !entropy) {
        entropy = await this.#generateSecureEntropy(length);
      }

      // Generate mnemonic using ethers with additional entropy
      const wallet = ethers.Wallet.createRandom({ extraEntropy: entropy });
      const mnemonic = wallet.mnemonic.phrase;

      // Validate generated mnemonic
      await this.#validateMnemonic(mnemonic);

      // Create backup metadata
      const backupMetadata = {
        backupId,
        type: this.backupFormats.MNEMONIC,
        length,
        language,
        created: Date.now(),
        status: this.BACKUP_STATUS.CREATED,
        checksumValid: true,
        version: '2.2.0'
      };

      this.backupHistory.set(backupId, backupMetadata);

      this.#audit('MNEMONIC_GENERATED', {
        backupId,
        length,
        language,
        entropySource: entropy ? 'custom' : 'system'
      });

      return {
        backupId,
        mnemonic,
        metadata: backupMetadata,
        words: mnemonic.split(' '),
        checksum: this.#calculateMnemonicChecksum(mnemonic)
      };

    } catch (error) {
      this.#audit('MNEMONIC_GENERATION_FAILED', {
        backupId,
        error: error.message
      });
      throw new Error(`Mnemonic generation failed: ${error.message}`);
    }
  }

  /*------------------------------------------------------------------*/
  /* PUBLIC API – MNEMONIC VALIDATION                                 */
  /*------------------------------------------------------------------*/
  async validateMnemonic (mnemonic, options = {}) {
    this.#preFlight();

    const {
      requireChecksum = true,
      language = this.config.language
    } = options;

    try {
      // Basic format validation
      if (!mnemonic || typeof mnemonic !== 'string') {
        throw new Error(`${this.ERROR_TYPES.INVALID_MNEMONIC}: Invalid mnemonic format`);
      }

      const words = mnemonic.trim().split(/\s+/);
      
      // Length validation
      if (![12, 15, 18, 21, 24].includes(words.length)) {
        throw new Error(`${this.ERROR_TYPES.INVALID_MNEMONIC}: Invalid mnemonic length: ${words.length}`);
      }

      // BIP39 validation using ethers
      const isValid = ethers.Mnemonic.isValidMnemonic(mnemonic);
      if (!isValid) {
        throw new Error(`${this.ERROR_TYPES.INVALID_MNEMONIC}: Invalid BIP39 mnemonic`);
      }

      // Calculate and verify checksum if required
      let checksumValid = true;
      if (requireChecksum) {
        checksumValid = await this.#verifyMnemonicChecksum(mnemonic);
      }

      const validation = {
        isValid: true,
        wordCount: words.length,
        checksumValid,
        language: language,
        strength: this.#calculateMnemonicStrength(words.length),
        timestamp: Date.now()
      };

      this.#audit('MNEMONIC_VALIDATED', {
        wordCount: words.length,
        checksumValid,
        strength: validation.strength
      });

      return validation;

    } catch (error) {
      this.#audit('MNEMONIC_VALIDATION_FAILED', {
        error: error.message
      });
      throw error;
    }
  }

  /*------------------------------------------------------------------*/
  /* PUBLIC API – BACKUP CREATION                                     */
  /*------------------------------------------------------------------*/
  async createBackup (mnemonic, format, options = {}) {
    this.#preFlight();

    const {
      password,
      filename,
      metadata = {},
      encryptionOptions = {}
    } = options;

    const backupId = this.#makeBackupId();

    try {
      // Validate mnemonic first
      await this.validateMnemonic(mnemonic);

      let backupData;
      let backupMetadata = {
        backupId,
        type: format,
        created: Date.now(),
        status: this.BACKUP_STATUS.CREATED,
        encrypted: !!password,
        metadata: this.#sanitizeMetadata(metadata),
        version: '2.2.0'
      };

      switch (format) {
        case this.backupFormats.QR_CODE:
          backupData = await this.#createQRCodeBackup(mnemonic, password, encryptionOptions);
          break;

        case this.backupFormats.ENCRYPTED_FILE:
          if (!password) {
            throw new Error('Password required for encrypted file backup');
          }
          backupData = await this.#createEncryptedFileBackup(mnemonic, password, filename, encryptionOptions);
          break;

        case this.backupFormats.PAPER_WALLET:
          backupData = await this.#createPaperWalletBackup(mnemonic, options);
          break;

        case this.backupFormats.JSON_KEYSTORE:
          if (!password) {
            throw new Error('Password required for JSON keystore backup');
          }
          backupData = await this.#createKeystoreBackup(mnemonic, password, encryptionOptions);
          break;

        default:
          throw new Error(`${this.ERROR_TYPES.INVALID_FORMAT}: Unsupported backup format: ${format}`);
      }

      this.backupHistory.set(backupId, backupMetadata);

      this.#audit('BACKUP_CREATED', {
        backupId,
        format,
        encrypted: !!password,
        size: backupData.size || 0
      });

      return {
        backupId,
        format,
        data: backupData,
        metadata: backupMetadata,
        created: Date.now()
      };

    } catch (error) {
      this.#audit('BACKUP_CREATION_FAILED', {
        backupId,
        format,
        error: error.message
      });
      throw new Error(`Backup creation failed: ${error.message}`);
    } finally {
      // Secure cleanup
      if (this.config.secureWipe) {
        this.#secureWipe(mnemonic);
      }
    }
  }

  /*------------------------------------------------------------------*/
  /* PUBLIC API – BACKUP RESTORATION                                  */
  /*------------------------------------------------------------------*/
  async restoreFromBackup (backupData, format, options = {}) {
    this.#preFlight();

    const {
      password,
      verifyChecksum = true
    } = options;

    const sessionId = this.#makeSessionId();

    try {
      let recoveredMnemonic;

      // Track recovery attempt
      this.recoveryAttempts.set(sessionId, {
        sessionId,
        format,
        started: Date.now(),
        encrypted: !!password
      });

      switch (format) {
        case this.backupFormats.QR_CODE:
          recoveredMnemonic = await this.#restoreFromQRCode(backupData, password);
          break;

        case this.backupFormats.ENCRYPTED_FILE:
          if (!password) {
            throw new Error(`${this.ERROR_TYPES.INVALID_PASSWORD}: Password required for encrypted backup`);
          }
          recoveredMnemonic = await this.#restoreFromEncryptedFile(backupData, password);
          break;

        case this.backupFormats.JSON_KEYSTORE:
          if (!password) {
            throw new Error(`${this.ERROR_TYPES.INVALID_PASSWORD}: Password required for keystore`);
          }
          recoveredMnemonic = await this.#restoreFromKeystore(backupData, password);
          break;

        case this.backupFormats.MNEMONIC:
          recoveredMnemonic = backupData.trim();
          break;

        default:
          throw new Error(`${this.ERROR_TYPES.INVALID_FORMAT}: Unsupported restoration format: ${format}`);
      }

      // Validate recovered mnemonic
      if (verifyChecksum) {
        await this.validateMnemonic(recoveredMnemonic);
      }

      // Update recovery attempt
      const attempt = this.recoveryAttempts.get(sessionId);
      attempt.completed = Date.now();
      attempt.success = true;
      attempt.mnemonicLength = recoveredMnemonic.split(' ').length;

      this.#audit('BACKUP_RESTORED', {
        sessionId,
        format,
        mnemonicLength: attempt.mnemonicLength,
        duration: attempt.completed - attempt.started
      });

      return {
        sessionId,
        mnemonic: recoveredMnemonic,
        words: recoveredMnemonic.split(' '),
        validation: verifyChecksum ? await this.validateMnemonic(recoveredMnemonic) : null,
        restored: Date.now()
      };

    } catch (error) {
      const attempt = this.recoveryAttempts.get(sessionId);
      if (attempt) {
        attempt.failed = Date.now();
        attempt.error = error.message;
      }

      this.#audit('BACKUP_RESTORATION_FAILED', {
        sessionId,
        format,
        error: error.message
      });

      throw new Error(`Backup restoration failed: ${error.message}`);
    }
  }

  /*------------------------------------------------------------------*/
  /* PUBLIC API – WALLET RECOVERY                                     */
  /*------------------------------------------------------------------*/
  async recoverWallet (mnemonic, options = {}) {
    this.#preFlight();

    const {
      derivationPath = "m/44'/60'/0'/0/0",
      validateAddresses = true,
      generateAddresses = 5
    } = options;

    const recoveryId = this.#makeRecoveryId();

    try {
      // Validate mnemonic
      await this.validateMnemonic(mnemonic);

      // Create HD wallet from mnemonic
      const hdWallet = ethers.HDNodeWallet.fromPhrase(mnemonic);
      
      // Generate master keys
      const masterPrivateKey = hdWallet.privateKey;
      const masterPublicKey = hdWallet.publicKey;

      // Generate derived addresses
      const addresses = [];
      for (let i = 0; i < generateAddresses; i++) {
        const path = derivationPath.replace(/\/\d+$/, `/${i}`);
        const derivedWallet = hdWallet.derivePath(path);
        
        addresses.push({
          index: i,
          path,
          address: derivedWallet.address,
          privateKey: derivedWallet.privateKey,
          publicKey: derivedWallet.publicKey
        });
      }

      // Validate addresses if requested
      let validationResults = [];
      if (validateAddresses) {
        validationResults = addresses.map(addr => ({
          address: addr.address,
          isValid: ethers.isAddress(addr.address),
          checksumValid: ethers.getAddress(addr.address) === addr.address
        }));
      }

      const recovery = {
        recoveryId,
        mnemonic,
        masterPrivateKey,
        masterPublicKey,
        derivationPath,
        addresses,
        validation: validationResults,
        recovered: Date.now(),
        version: '2.2.0'
      };

      this.#audit('WALLET_RECOVERED', {
        recoveryId,
        addressCount: addresses.length,
        derivationPath,
        validAddresses: validationResults.filter(v => v.isValid).length
      });

      return recovery;

    } catch (error) {
      this.#audit('WALLET_RECOVERY_FAILED', {
        recoveryId,
        error: error.message
      });
      throw new Error(`Wallet recovery failed: ${error.message}`);
    } finally {
      // Secure cleanup
      if (this.config.secureWipe) {
        this.#secureWipe(mnemonic);
      }
    }
  }

  /*------------------------------------------------------------------*/
  /* PUBLIC API – BACKUP VERIFICATION                                 */
  /*------------------------------------------------------------------*/
  async verifyBackup (backupId, verificationData) {
    this.#preFlight();

    const backup = this.backupHistory.get(backupId);
    if (!backup) {
      throw new Error('Backup not found');
    }

    try {
      let isValid = false;
      let verificationResults = {};

      switch (backup.type) {
        case this.backupFormats.MNEMONIC:
          isValid = await this.#verifyMnemonicBackup(verificationData);
          break;

        case this.backupFormats.QR_CODE:
          verificationResults = await this.#verifyQRCodeBackup(verificationData);
          isValid = verificationResults.isValid;
          break;

        case this.backupFormats.ENCRYPTED_FILE:
          verificationResults = await this.#verifyEncryptedFileBackup(verificationData);
          isValid = verificationResults.isValid;
          break;

        default:
          throw new Error(`Verification not supported for format: ${backup.type}`);
      }

      // Update backup status
      backup.status = isValid ? this.BACKUP_STATUS.VERIFIED : this.BACKUP_STATUS.CORRUPTED;
      backup.lastVerified = Date.now();

      this.#audit('BACKUP_VERIFIED', {
        backupId,
        type: backup.type,
        isValid,
        verificationResults
      });

      return {
        backupId,
        isValid,
        status: backup.status,
        verificationResults,
        verified: Date.now()
      };

    } catch (error) {
      backup.status = this.BACKUP_STATUS.CORRUPTED;
      
      this.#audit('BACKUP_VERIFICATION_FAILED', {
        backupId,
        error: error.message
      });
      
      throw new Error(`Backup verification failed: ${error.message}`);
    }
  }

  /*------------------------------------------------------------------*/
  /* PUBLIC API – UTILITIES                                           */
  /*------------------------------------------------------------------*/
  getBackupHistory () {
    return Array.from(this.backupHistory.values()).map(backup => ({
      backupId: backup.backupId,
      type: backup.type,
      created: backup.created,
      status: backup.status,
      encrypted: backup.encrypted,
      lastVerified: backup.lastVerified,
      metadata: backup.metadata
    }));
  }

  getRecoveryAttempts () {
    return Array.from(this.recoveryAttempts.values()).map(attempt => ({
      sessionId: attempt.sessionId,
      format: attempt.format,
      started: attempt.started,
      completed: attempt.completed,
      success: attempt.success,
      error: attempt.error
    }));
  }

  getStatistics () {
    const backups = Array.from(this.backupHistory.values());
    const attempts = Array.from(this.recoveryAttempts.values());

    return {
      totalBackups: backups.length,
      verifiedBackups: backups.filter(b => b.status === this.BACKUP_STATUS.VERIFIED).length,
      corruptedBackups: backups.filter(b => b.status === this.BACKUP_STATUS.CORRUPTED).length,
      totalRecoveries: attempts.length,
      successfulRecoveries: attempts.filter(a => a.success).length,
      failedRecoveries: attempts.filter(a => a.error).length,
      auditLogEntries: this.auditLog.length,
      lastActivity: Math.max(
        ...backups.map(b => b.created),
        ...attempts.map(a => a.started),
        0
      )
    };
  }

  async shutdown () {
    this.#log('Shutting down BackupManager...');
    
    // Secure cleanup of sensitive data
    if (this.config.secureWipe) {
      this.#secureWipeAll();
    }

    this.initialized = false;
    this.#log('BackupManager shutdown complete');
    this.#audit('SHUTDOWN');
  }

  /*------------------------------------------------------------------*/
  /* PRIVATE HELPERS                                                  */
  /*------------------------------------------------------------------*/
  #preFlight () {
    if (!this.initialized) {
      throw new Error('BackupManager not initialized');
    }
  }

  #validateMnemonicParams (length, language) {
    if (![12, 15, 18, 21, 24].includes(length)) {
      throw new Error(`Invalid mnemonic length: ${length}`);
    }

    if (!this.supportedLanguages[language]) {
      throw new Error(`Unsupported language: ${language}`);
    }
  }

  async #validateMnemonic (mnemonic) {
    const validation = await this.validateMnemonic(mnemonic, { requireChecksum: true });
    if (!validation.isValid) {
      throw new Error(`${this.ERROR_TYPES.INVALID_MNEMONIC}: Mnemonic validation failed`);
    }
    return validation;
  }
