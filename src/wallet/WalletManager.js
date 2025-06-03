// Trust Crypto Wallet - Main Wallet Orchestrator
import KeyManager from './KeyManager.js';
import AccountManager from './AccountManager.js';
import TransactionSigner from './TransactionSigner.js';
import AddressGenerator from './AddressGenerator.js';
import SendManager from './SendManager.js';
import ReceiveManager from './ReceiveManager.js';
import BackupManager from './BackupManager.js';

class WalletManager {
    constructor() {
        this.isInitialized = false;
        this.isLocked = true;
        this.currentAccount = null;
        this.selectedNetwork = 'ethereum';
        
        // Initialize wallet components
        this.keyManager = new KeyManager();
        this.accountManager = new AccountManager();
        this.transactionSigner = new TransactionSigner();
        this.addressGenerator = new AddressGenerator();
        this.sendManager = new SendManager();
        this.receiveManager = new ReceiveManager();
        this.backupManager = new BackupManager();
        
        this.init();
    }

    async init() {
        try {
            console.log('Trust Crypto Wallet: Initializing wallet manager...');
            
            // Check if wallet exists
            const walletExists = await this.checkWalletExists();
            
            if (walletExists) {
                await this.loadExistingWallet();
            }
            
            this.isInitialized = true;
            console.log('Trust Crypto Wallet: Wallet manager initialized successfully');
        } catch (error) {
            console.error('Trust Crypto Wallet: Failed to initialize wallet manager:', error);
            throw error;
        }
    }

    async checkWalletExists() {
        try {
            return await this.keyManager.hasStoredWallet();
        } catch (error) {
            console.error('Error checking wallet existence:', error);
            return false;
        }
    }

    async createWallet(password, seedPhrase = null) {
        try {
            console.log('Trust Crypto Wallet: Creating new wallet...');
            
            // Generate or use provided seed phrase
            const mnemonic = seedPhrase || await this.keyManager.generateMnemonic();
            
            // Create master key from mnemonic
            await this.keyManager.createWallet(password, mnemonic);
            
            // Create initial accounts for supported networks
            await this.accountManager.createInitialAccounts();
            
            // Set wallet as unlocked
            this.isLocked = false;
            
            // Set first account as current
            this.currentAccount = await this.accountManager.getAccount(0, 'ethereum');
            
            console.log('Trust Crypto Wallet: Wallet created successfully');
            
            return {
                success: true,
                mnemonic: mnemonic,
                address: this.currentAccount.address
            };
        } catch (error) {
            console.error('Trust Crypto Wallet: Failed to create wallet:', error);
            throw error;
        }
    }

    async unlockWallet(password) {
        try {
            console.log('Trust Crypto Wallet: Unlocking wallet...');
            
            // Verify password and load keys
            const isValid = await this.keyManager.unlockWallet(password);
            
            if (!isValid) {
                throw new Error('Invalid password');
            }
            
            // Load existing accounts
            await this.accountManager.loadAccounts();
            
            // Set current account
            this.currentAccount = await this.accountManager.getCurrentAccount();
            
            this.isLocked = false;
            
            console.log('Trust Crypto Wallet: Wallet unlocked successfully');
            
            return {
                success: true,
                address: this.currentAccount?.address
            };
        } catch (error) {
            console.error('Trust Crypto Wallet: Failed to unlock wallet:', error);
            throw error;
        }
    }

    async lockWallet() {
        try {
            console.log('Trust Crypto Wallet: Locking wallet...');
            
            // Clear sensitive data from memory
            await this.keyManager.lockWallet();
            await this.accountManager.clearAccounts();
            
            this.isLocked = true;
            this.currentAccount = null;
            
            console.log('Trust Crypto Wallet: Wallet locked successfully');
            
            return { success: true };
        } catch (error) {
            console.error('Trust Crypto Wallet: Failed to lock wallet:', error);
            throw error;
        }
    }

    async importWallet(password, seedPhrase) {
        try {
            console.log('Trust Crypto Wallet: Importing wallet from seed phrase...');
            
            // Validate seed phrase
            if (!this.keyManager.validateMnemonic(seedPhrase)) {
                throw new Error('Invalid seed phrase');
            }
            
            // Create wallet from existing seed phrase
            await this.keyManager.createWallet(password, seedPhrase);
            
            // Restore accounts
            await this.accountManager.createInitialAccounts();
            
            this.isLocked = false;
            this.currentAccount = await this.accountManager.getAccount(0, 'ethereum');
            
            console.log('Trust Crypto Wallet: Wallet imported successfully');
            
            return {
                success: true,
                address: this.currentAccount.address
            };
        } catch (error) {
            console.error('Trust Crypto Wallet: Failed to import wallet:', error);
            throw error;
        }
    }

    async switchNetwork(networkId) {
        try {
            console.log(`Trust Crypto Wallet: Switching to network ${networkId}`);
            
            if (this.isLocked) {
                throw new Error('Wallet is locked');
            }
            
            this.selectedNetwork = networkId;
            
            // Get account for the new network
            this.currentAccount = await this.accountManager.getAccount(0, networkId);
            
            console.log(`Trust Crypto Wallet: Switched to ${networkId} network`);
            
            return {
                success: true,
                network: networkId,
                address: this.currentAccount.address
            };
        } catch (error) {
            console.error('Trust Crypto Wallet: Failed to switch network:', error);
            throw error;
        }
    }

    async createAccount(accountIndex = null) {
        try {
            if (this.isLocked) {
                throw new Error('Wallet is locked');
            }
            
            const account = await this.accountManager.createAccount(this.selectedNetwork, accountIndex);
            
            console.log('Trust Crypto Wallet: New account created:', account.address);
            
            return {
                success: true,
                account: account
            };
        } catch (error) {
            console.error('Trust Crypto Wallet: Failed to create account:', error);
            throw error;
        }
    }

    async getAccounts(networkId = null) {
        try {
            if (this.isLocked) {
                return { success: false, error: 'Wallet is locked' };
            }
            
            const network = networkId || this.selectedNetwork;
            const accounts = await this.accountManager.getAccounts(network);
            
            return {
                success: true,
                accounts: accounts
            };
        } catch (error) {
            console.error('Trust Crypto Wallet: Failed to get accounts:', error);
            throw error;
        }
    }

    async sendTransaction(transactionParams) {
        try {
            if (this.isLocked) {
                throw new Error('Wallet is locked');
            }
            
            console.log('Trust Crypto Wallet: Sending transaction...');
            
            return await this.sendManager.sendTransaction(
                transactionParams,
                this.currentAccount,
                this.selectedNetwork
            );
        } catch (error) {
            console.error('Trust Crypto Wallet: Failed to send transaction:', error);
            throw error;
        }
    }

    async signMessage(message, address = null) {
        try {
            if (this.isLocked) {
                throw new Error('Wallet is locked');
            }
            
            const account = address ? 
                await this.accountManager.getAccountByAddress(address) : 
                this.currentAccount;
            
            return await this.transactionSigner.signMessage(message, account);
        } catch (error) {
            console.error('Trust Crypto Wallet: Failed to sign message:', error);
            throw error;
        }
    }

    async signTypedData(typedData, address = null) {
        try {
            if (this.isLocked) {
                throw new Error('Wallet is locked');
            }
            
            const account = address ? 
                await this.accountManager.getAccountByAddress(address) : 
                this.currentAccount;
            
            return await this.transactionSigner.signTypedData(typedData, account);
        } catch (error) {
            console.error('Trust Crypto Wallet: Failed to sign typed data:', error);
            throw error;
        }
    }

    async exportPrivateKey(address, password) {
        try {
            if (this.isLocked) {
                throw new Error('Wallet is locked');
            }
            
            // Verify password again for security
            const isValidPassword = await this.keyManager.verifyPassword(password);
            if (!isValidPassword) {
                throw new Error('Invalid password');
            }
            
            const account = await this.accountManager.getAccountByAddress(address);
            return await this.keyManager.exportPrivateKey(account);
        } catch (error) {
            console.error('Trust Crypto Wallet: Failed to export private key:', error);
            throw error;
        }
    }

    async exportSeedPhrase(password) {
        try {
            if (this.isLocked) {
                throw new Error('Wallet is locked');
            }
            
            return await this.backupManager.exportSeedPhrase(password);
        } catch (error) {
            console.error('Trust Crypto Wallet: Failed to export seed phrase:', error);
            throw error;
        }
    }

    async loadExistingWallet() {
        try {
            // Load wallet data without unlocking
            const walletInfo = await this.keyManager.getWalletInfo();
            
            console.log('Trust Crypto Wallet: Existing wallet found');
            
            return walletInfo;
        } catch (error) {
            console.error('Trust Crypto Wallet: Failed to load existing wallet:', error);
            throw error;
        }
    }

    // Getters
    get isWalletInitialized() {
        return this.isInitialized;
    }

    get isWalletLocked() {
        return this.isLocked;
    }

    get currentAddress() {
        return this.currentAccount?.address || null;
    }

    get currentNetwork() {
        return this.selectedNetwork;
    }

    get walletStatus() {
        return {
            initialized: this.isInitialized,
            locked: this.isLocked,
            currentAddress: this.currentAddress,
            currentNetwork: this.selectedNetwork,
            hasAccounts: this.currentAccount !== null
        };
    }
}

export default WalletManager;
