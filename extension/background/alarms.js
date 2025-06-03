// Trust Crypto Wallet - Scheduled Tasks and Alarms
class AlarmManager {
    constructor() {
        this.init();
    }

    init() {
        this.setupAlarmListeners();
        this.createPeriodicAlarms();
        console.log('Trust Wallet Alarm Manager initialized');
    }

    setupAlarmListeners() {
        // Listen for alarm events
        chrome.alarms.onAlarm.addListener((alarm) => {
            this.handleAlarm(alarm);
        });

        // Setup auto-lock timer when wallet becomes active
        chrome.storage.onChanged.addListener((changes, namespace) => {
            if (namespace === 'local' && changes.lastActivity) {
                this.resetAutoLockTimer();
            }
        });
    }

    async handleAlarm(alarm) {
        console.log('Trust Wallet alarm triggered:', alarm.name);

        switch (alarm.name) {
            case 'autoLock':
                await this.handleAutoLock();
                break;
            case 'balanceRefresh':
                await this.handleBalanceRefresh();
                break;
            case 'priceUpdate':
                await this.handlePriceUpdate();
                break;
            case 'transactionCheck':
                await this.handleTransactionCheck();
                break;
            case 'networkHealthCheck':
                await this.handleNetworkHealthCheck();
                break;
            case 'cleanupStorage':
                await this.handleStorageCleanup();
                break;
            default:
                console.warn('Unknown alarm:', alarm.name);
        }
    }

    // Auto-lock wallet after inactivity
    async handleAutoLock() {
        const settings = await chrome.storage.local.get(['trustWalletSettings', 'walletLocked']);
        
        if (!settings.walletLocked && settings.trustWalletSettings?.autoLock) {
            await chrome.storage.local.set({
                walletLocked: true,
                lockReason: 'auto_timeout'
            });
            
            console.log('Wallet auto-locked due to inactivity');
            
            // Notify popup if open
            chrome.runtime.sendMessage({
                action: 'walletLocked',
                reason: 'auto_timeout'
            }).catch(() => {}); // Ignore if popup not open
        }
    }

    async resetAutoLockTimer() {
        const settings = await chrome.storage.local.get(['trustWalletSettings']);
        const lockTimeout = settings.trustWalletSettings?.lockTimeout || 15; // Default 15 minutes
        
        // Clear existing auto-lock alarm
        chrome.alarms.clear('autoLock');
        
        // Create new auto-lock alarm
        chrome.alarms.create('autoLock', {
            delayInMinutes: lockTimeout
        });
    }

    // Refresh wallet balances periodically
    async handleBalanceRefresh() {
        const settings = await chrome.storage.local.get(['walletCreated', 'walletLocked', 'selectedNetwork']);
        
        if (settings.walletCreated && !settings.walletLocked) {
            console.log('Refreshing wallet balances...');
            
            // Trigger balance refresh via message handler
            chrome.runtime.sendMessage({
                action: 'refreshBalance',
                data: { network: settings.selectedNetwork }
            }).catch(() => {});
        }
    }

    // Update token prices
    async handlePriceUpdate() {
        console.log('Updating token prices...');
        
        try {
            // Mock price update - in real implementation, fetch from API
            const mockPrices = {
                ETH: { price: 2000 + Math.random() * 100, change24h: (Math.random() - 0.5) * 10 },
                BTC: { price: 45000 + Math.random() * 5000, change24h: (Math.random() - 0.5) * 5 },
                BNB: { price: 300 + Math.random() * 50, change24h: (Math.random() - 0.5) * 8 }
            };
            
            await chrome.storage.local.set({
                tokenPrices: mockPrices,
                lastPriceUpdate: Date.now()
            });
            
            // Notify popup about price updates
            chrome.runtime.sendMessage({
                action: 'pricesUpdated',
                data: mockPrices
            }).catch(() => {});
            
        } catch (error) {
            console.error('Price update failed:', error);
        }
    }

    // Check pending transaction statuses
    async handleTransactionCheck() {
        const storage = await chrome.storage.local.get(['pendingTransactions']);
        const pendingTxs = storage.pendingTransactions || [];
        
        if (pendingTxs.length > 0) {
            console.log('Checking pending transactions...');
            
            for (const tx of pendingTxs) {
                // Mock transaction status check
                const isConfirmed = Math.random() > 0.7; // 30% chance of confirmation
                
                if (isConfirmed) {
                    tx.status = 'confirmed';
                    tx.confirmationTime = Date.now();
                    
                    // Notify user of confirmation
                    this.showNotification(`Transaction confirmed: ${tx.hash.substring(0, 10)}...`);
                }
            }
            
            // Update storage with checked transactions
            await chrome.storage.local.set({ pendingTransactions: pendingTxs });
        }
    }

    // Check network health and connectivity
    async handleNetworkHealthCheck() {
        const settings = await chrome.storage.local.get(['selectedNetwork']);
        const network = settings.selectedNetwork || 'ethereum';
        
        console.log(`Checking ${network} network health...`);
        
        try {
            // Mock network health check
            const networkStatus = {
                network: network,
                healthy: Math.random() > 0.1, // 90% uptime
                lastCheck: Date.now(),
                blockNumber: Math.floor(Math.random() * 1000000) + 18000000
            };
            
            await chrome.storage.local.set({
                [`networkHealth_${network}`]: networkStatus
            });
            
            if (!networkStatus.healthy) {
                this.showNotification(`${network} network issues detected`);
            }
            
        } catch (error) {
            console.error('Network health check failed:', error);
        }
    }

    // Clean up old storage data
    async handleStorageCleanup() {
        console.log('Performing storage cleanup...');
        
        const storage = await chrome.storage.local.get();
        const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
        
        // Clean old transaction history
        if (storage.transactionHistory) {
            storage.transactionHistory = storage.transactionHistory.filter(
                tx => tx.timestamp > oneWeekAgo
            );
        }
        
        // Clean old DApp connections
        if (storage.dappConnections) {
            Object.keys(storage.dappConnections).forEach(origin => {
                if (storage.dappConnections[origin].timestamp < oneWeekAgo) {
                    delete storage.dappConnections[origin];
                }
            });
        }
        
        // Clean old network health data
        Object.keys(storage).forEach(key => {
            if (key.startsWith('networkHealth_') && storage[key].lastCheck < oneWeekAgo) {
                delete storage[key];
            }
        });
        
        await chrome.storage.local.set(storage);
        console.log('Storage cleanup completed');
    }

    createPeriodicAlarms() {
        // Balance refresh every 5 minutes
        chrome.alarms.create('balanceRefresh', {
            delayInMinutes: 5,
            periodInMinutes: 5
        });
        
        // Price updates every 2 minutes
        chrome.alarms.create('priceUpdate', {
            delayInMinutes: 2,
            periodInMinutes: 2
        });
        
        // Transaction status check every 30 seconds
        chrome.alarms.create('transactionCheck', {
            delayInMinutes: 0.5,
            periodInMinutes: 0.5
        });
        
        // Network health check every 10 minutes
        chrome.alarms.create('networkHealthCheck', {
            delayInMinutes: 10,
            periodInMinutes: 10
        });
        
        // Storage cleanup once per day
        chrome.alarms.create('cleanupStorage', {
            delayInMinutes: 60, // Start after 1 hour
            periodInMinutes: 24 * 60 // Repeat every 24 hours
        });
        
        console.log('Trust Wallet periodic alarms created');
    }

    showNotification(message) {
        chrome.notifications.create({
            type: 'basic',
            iconUrl: '../public/icons/icon-48.png',
            title: 'Trust Crypto Wallet',
            message: message
        });
    }

    // Manual methods for triggering specific alarms
    async triggerBalanceRefresh() {
        await this.handleBalanceRefresh();
    }

    async triggerPriceUpdate() {
        await this.handlePriceUpdate();
    }

    async clearAllAlarms() {
        chrome.alarms.clearAll();
        console.log('All Trust Wallet alarms cleared');
    }
}

// Export singleton instance
const alarmManager = new AlarmManager();
export default alarmManager;
