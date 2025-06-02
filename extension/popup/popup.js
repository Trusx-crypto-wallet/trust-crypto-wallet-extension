// Trust Crypto Wallet - Extension Popup Main Script
import Header from './components/Header.js';
import Balance from './components/Balance.js';
import QuickActions from './components/QuickActions.js';
import NetworkSelector from './components/NetworkSelector.js';

class TrustWalletPopup {
    constructor() {
        this.init();
    }

    async init() {
        try {
            await this.loadComponents();
            await this.loadWalletData();
            this.setupEventListeners();
        } catch (error) {
            console.error('Trust Wallet Popup initialization failed:', error);
        }
    }

    async loadComponents() {
        // Initialize popup components
        const headerContainer = document.getElementById('header-container');
        const balanceContainer = document.getElementById('balance-container');
        const quickActionsContainer = document.getElementById('quick-actions-container');
        const networkContainer = document.getElementById('network-selector-container');

        // Render components
        headerContainer.innerHTML = Header.render();
        balanceContainer.innerHTML = Balance.render();
        quickActionsContainer.innerHTML = QuickActions.render();
        networkContainer.innerHTML = NetworkSelector.render();
    }

    async loadWalletData() {
        // Load wallet data from extension storage
        const walletData = await chrome.storage.local.get(['walletAddress', 'selectedNetwork', 'balance']);
        
        if (walletData.walletAddress) {
            Balance.updateBalance(walletData.balance || '0.00');
            NetworkSelector.setSelectedNetwork(walletData.selectedNetwork || 'ethereum');
        } else {
            this.showWalletSetup();
        }
    }

    setupEventListeners() {
        // Setup component event listeners
        Header.setupEvents();
        Balance.setupEvents();
        QuickActions.setupEvents();
        NetworkSelector.setupEvents();
    }

    showWalletSetup() {
        // Redirect to wallet setup if no wallet found
        chrome.tabs.create({ url: chrome.runtime.getURL('setup.html') });
        window.close();
    }
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new TrustWalletPopup();
});
