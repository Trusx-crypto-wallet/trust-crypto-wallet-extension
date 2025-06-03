import * as bip39 from 'bip39';
import * as crypto from 'crypto';
import HDKey from 'hdkey'; // FIXED import

export class KeyManager {
  constructor(config = {}) {
    this.config = {
      mnemonicStrength: 128,
      encryptionAlgorithm: 'aes-256-gcm',
      keyDerivationRounds: 100000,
      ...config
    };

    this.masterKey = null;
    this.encryptedStorage = new Map();
  }

  async initialize() {
    this.validateEnvironment();
    return { success: true };
  }

  validateEnvironment() {
    if (!crypto.randomBytes) {
      throw new Error('Secure random number generation not available');
    }
  }

  async generateSeedPhrase() {
    try {
      return bip39.generateMnemonic(this.config.mnemonicStrength);
    } catch (error) {
      throw new Error(`Seed phrase generation failed: ${error.message}`);
    }
  }

  async validateSeedPhrase(mnemonic) {
    return bip39.validateMnemonic(mnemonic);
  }

  async deriveMasterKey(mnemonic, password = '') {
    try {
      const seed = await bip39.mnemonicToSeed(mnemonic, password);
      this.masterKey = HDKey.fromMasterSeed(seed);
      return this.masterKey;
    } catch (error) {
      throw new Error(`Master key derivation failed: ${error.message}`);
    }
  }

  async derivePrivateKey(path) {
    if (!this.masterKey) {
      throw new Error('Master key not initialized');
    }

    try {
      const derivedKey = this.masterKey.derive(path);
      return derivedKey.privateKey;
    } catch (error) {
      throw new Error(`Private key derivation failed: ${error.message}`);
    }
  }

  async encryptData(data, password) {
    try {
      const salt = crypto.randomBytes(32);
      const iv = crypto.randomBytes(12); // Required for AES-GCM
      const key = crypto.pbkdf2Sync(password, salt, this.config.keyDerivationRounds, 32, 'sha256');

      const cipher = crypto.createCipheriv('aes-256-gcm', key, iv); // ✅ FIXED
      const encrypted = Buffer.concat([
        cipher.update(JSON.stringify(data), 'utf8'),
        cipher.final()
      ]);
      const authTag = cipher.getAuthTag();

      return {
        encrypted: encrypted.toString('hex'),
        salt: salt.toString('hex'),
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex')
      };
    } catch (error) {
      throw new Error(`Encryption failed: ${error.message}`);
    }
  }

  async decryptData(encryptedData, password) {
    try {
      const { encrypted, salt, iv, authTag } = encryptedData;
      const key = crypto.pbkdf2Sync(password, Buffer.from(salt, 'hex'), this.config.keyDerivationRounds, 32, 'sha256');

      const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'hex')); // ✅ FIXED
      decipher.setAuthTag(Buffer.from(authTag, 'hex'));

      const decrypted = Buffer.concat([
        decipher.update(Buffer.from(encrypted, 'hex')),
        decipher.final()
      ]);

      return JSON.parse(decrypted.toString('utf8'));
    } catch (error) {
      throw new Error(`Decryption failed: ${error.message}`);
    }
  }

  clearSensitiveData() {
    this.masterKey = null;
    this.encryptedStorage.clear();
  }
}
