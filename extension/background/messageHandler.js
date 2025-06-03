// Trust Crypto Wallet - Message Handler
class MessageHandler {
    constructor() {
        this.handlers = {
            // Wallet operations
            'createWallet': this.handleCreateWallet.bind(this),
            'unlockWallet': this.handleUnlockWallet.bind(this),
            'lockWallet': this.handleLockWallet.bind(this),
            'getWalletStatus': this.handleGetWalletStatus.bind(this),
            
            // Network operations
            'networkChanged': this.handleNetworkChange.bind(this),
            'getNetworks': this.handleGetNetworks.bind(this),
            
            // Balance operations
            'refreshBalance': this.handleRefreshBalance.bind(this),
            'getBalance': this.handleGetBalance.bind(this),
            
            // Transaction operations
            'sendTransaction': this.handleSendTransaction.bind(this),
            'getTransactionHistory': this.handleGetTransactionHistory.bind(this),
            
            // DApp operations
            'dappConnect': this.handleDappConnect.bind(this),
            'dappDisconnect': this.handleDappDisconnect.bind(this),
            'dappRequest': this.handleDappRequest.bind(this),
            
            // Settings operations
            'updateSettings': this.handleUpdateSettings.bind(this),
            'getSettings': this.handleGetSettings.bind(this),
            
            // Security operations
            'validatePassword': this.handleValidatePassword.bind(this),
            'exportPrivateKey': this.handleExportPrivateKey.bind(this),
            'importWallet': this.handleImportWallet.bind(this)
        };
    }

    async handleMessage(message, sender, sendResponse) {
        try {
            const { action, data } = message;
            
            console.log('Trust Wallet message received:', action, data);
            
            if (this.handlers[action]) {
                const result = await this.handlers[action](data, sender);
                sendResponse({ success: true, data: result });
            } else {
                console.warn('Unknown message action:', action);
                sendResponse({ success: false, error: 'Unknown action' });
            }
        } catch (error) {
            console.error('Message handling error:', error);
            sendResponse({ success: false, error: error.message });
        }
    }

    // Wallet Operations
    async handleCreateWallet(data) {
        const { password, seedPhrase } = data;
        // Wallet creation logic
        await chrome.storage.local.set({
            walletCreated: true,
            walletLocked: false,
            lastActivity: Date.now()
        });
        return { created: true };
    }

    async handleUnlockWallet(data) {
        const { password } = data;
        // Password validation logic
        await chrome.storage.local.set({
            walletLocked: false,
            lastActivity: Date.now()
        });
        return { unlocked: true };
    }

    async handleLockWallet() {
        await chrome.storage.local.set({
            walletLocked: true,
            lastActivity: Date.now()
        });
        return { locked: true };
    }

    async handleGetWalletStatus() {
        const storage = await chrome.storage.local.get(['walletCreated', 'walletLocked']);
        return {
            created: storage.walletCreated || false,
            locked: storage.walletLocked !== false
        };
    }

    // Network Operations
    async handleNetworkChange(data) {
        const { network } = data;
        await chrome.storage.local.set({ selectedNetwork: network });
        
        // Notify all tabs about network change
        const tabs = await chrome.tabs.query({});
        tabs.forEach(tab => {
            chrome.tabs.sendMessage(tab.id, {
                action: 'networkChanged',
                network: network
            }).catch(() => {}); // Ignore errors for tabs without content scripts
        });
        
        return { networkChanged: network };
    }

    async handleGetNetworks() {
        const networks = [
            { id: 'ethereum', name: 'Ethereum', symbol: 'ETH' },
            { id: 'bsc', name: 'BSC', symbol: 'BNB' },
            { id: 'polygon', name: 'Polygon', symbol: 'MATIC' },
            { id: 'avalanche', name: 'Avalanche', symbol: 'AVAX' },
            { id: 'arbitrum', name: 'Arbitrum', symbol: 'ARB' },
            { id: 'optimism', name: 'Optimism', symbol: 'OP' }
        ];
        return { networks };
    }

    // Balance Operations
    async handleRefreshBalance(data) {
        const { address, network } = data;
        // Mock balance refresh
        const mockBalance = {
            ETH: '1.2345',
            BTC: '0.0567',
            USDC: '1000.00'
        };
        
        await chrome.storage.local.set({ 
            balance: mockBalance,
            lastBalanceUpdate: Date.now()
        });
        
        return { balance: mockBalance };
    }

    async handleGetBalance() {
        const storage = await chrome.storage.local.get(['balance', 'lastBalanceUpdate']);
        return {
            balance: storage.balance || {},
            lastUpdate: storage.lastBalanceUpdate || 0
        };
    }

    // Transaction Operations
    async handleSendTransaction(data) {
        const { to, amount, token, gasPrice } = data;
        // Transaction sending logic
        const txHash = '0x' + Math.random().toString(16).substr(2, 64);
        
        return {
            transactionHash: txHash,
            status: 'pending'
        };
    }

    async handleGetTransactionHistory(data) {
        const { page = 1, limit = 10 } = data;
        // Mock transaction history
        const transactions = [
            {
                hash: '0xabc123...',
                type: 'send',
                amount: '0.5 ETH',
                status: 'confirmed',
                timestamp: Date.now() - 3600000
            }
        ];
        
        return {
            transactions,
            totalCount: transactions.length,
            hasMore: false
        };
    }

    // DApp Operations
    async handleDappConnect(data, sender) {
        const { origin } = data;
        const tabId = sender.tab?.id;
        
        // Store DApp connection
        const connections = await chrome.storage.local.get(['dappConnections']);
        const updatedConnections = {
            ...connections.dappConnections,
            [origin]: {
                connected: true,
                tabId: tabId,
                timestamp: Date.now()
            }
        };
        
        await chrome.storage.local.set({ dappConnections: updatedConnections });
        
        return {
            connected: true,
            accounts: ['0x1234567890123456789012345678901234567890']
        };
    }

    async handleDappDisconnect(data) {
        const { origin } = data;
        const connections = await chrome.storage.local.get(['dappConnections']);
        
        if (connections.dappConnections?.[origin]) {
            delete connections.dappConnections[origin];
            await chrome.storage.local.set({ dappConnections: connections.dappConnections });
        }
        
        return { disconnected: true };
    }

    async handleDappRequest(data) {
        const { method, params } = data;
        
        switch (method) {
            case 'eth_accounts':
                return ['0x1234567890123456789012345678901234567890'];
            case 'eth_chainId':
                return '0x1'; // Ethereum mainnet
            case 'personal_sign':
                return '0xsignature...';
            default:
                throw new Error(`Unsupported method: ${method}`);
        }
    }

    // Settings Operations
    async handleUpdateSettings(data) {
        const currentSettings = await chrome.storage.local.get(['trustWalletSettings']);
        const updatedSettings = {
            ...currentSettings.trustWalletSettings,
            ...data
        };
        
        await chrome.storage.local.set({ trustWalletSettings: updatedSettings });
        return { updated: true, settings: updatedSettings };
    }

    async handleGetSettings() {
        const storage = await chrome.storage.local.get(['trustWalletSettings']);
        return storage.trustWalletSettings || {};
    }

    // Security Operations
    async handleValidatePassword(data) {
        const { password } = data;
        // Password validation logic
        return { valid: true };
    }

    async handleExportPrivateKey(data) {
        const { password } = data;
        // Export private key logic (with password confirmation)
        return { privateKey: '0xprivatekey...' };
    }

    async handleImportWallet(data) {
        const { seedPhrase, password } = data;
        // Import wallet logic
        await chrome.storage.local.set({
            walletCreated: true,
            walletLocked: false
        });
        return { imported: true };
    }
}

// Export singleton instance
const messageHandler = new MessageHandler();
export default messageHandler;
