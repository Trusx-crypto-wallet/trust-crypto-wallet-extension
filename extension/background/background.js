// Trust Crypto Wallet - Extension Background Script
import messageHandler from './messageHandler.js';

class TrustWalletBackground {
    constructor() {
        this.init();
    }

    init() {
        console.log('Trust Crypto Wallet Background Script initialized');
        this.setupEventListeners();
        this.initializeWallet();
    }

    setupEventListeners() {
        // Extension installation/startup
        chrome.runtime.onInstalled.addListener((details) => {
            this.handleInstallation(details);
        });

        // Message handling from popup/content scripts
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            messageHandler.handleMessage(message, sender, sendResponse);
            return true; // Keep message channel open for async responses
        });

        // Tab updates for DApp detection
        chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
            this.handleTabUpdate(tabId, changeInfo, tab);
        });

        // Network request handling
        chrome.webRequest?.onBeforeRequest?.addListener(
            (details) => this.handleWebRequest(details),
            { urls: ["<all_urls>"] },
            ["requestBody"]
        );
    }

    async handleInstallation(details) {
        console.log('Trust Wallet installation:', details.reason);
        
        if (details.reason === 'install') {
            // First time installation
            await this.setupDefaultSettings();
            this.openWelcomePage();
        } else if (details.reason === 'update') {
            // Extension update
            await this.handleUpdate(details);
        }
    }

    async setupDefaultSettings() {
        const defaultSettings = {
            selectedNetwork: 'ethereum',
            autoLock: true,
            lockTimeout: 15, // minutes
            showTestnets: false,
            currency: 'USD',
            language: 'en',
            notifications: true,
            walletCreated: false
        };

        await chrome.storage.local.set({ trustWalletSettings: defaultSettings });
        console.log('Trust Wallet default settings initialized');
    }

    openWelcomePage() {
        chrome.tabs.create({
            url: chrome.runtime.getURL('welcome.html')
        });
    }

    async handleUpdate(details) {
        console.log('Trust Wallet updated from:', details.previousVersion);
        // Handle any migration logic here
    }

    handleTabUpdate(tabId, changeInfo, tab) {
        if (changeInfo.status === 'complete' && tab.url) {
            // Inject content script for DApp detection
            this.injectContentScript(tabId, tab.url);
        }
    }

    async injectContentScript(tabId, url) {
        try {
            // Only inject on HTTPS pages (security requirement)
            if (url.startsWith('https://')) {
                await chrome.scripting.executeScript({
                    target: { tabId: tabId },
                    files: ['content-scripts/contentScript.js']
                });
            }
        } catch (error) {
            console.log('Content script injection failed:', error);
        }
    }

    handleWebRequest(details) {
        // Monitor for DApp interactions
        if (details.url.includes('eth_') || details.url.includes('web3')) {
            console.log('Web3 request detected:', details.url);
        }
    }

    async initializeWallet() {
        // Check if wallet is already created
        const settings = await chrome.storage.local.get(['trustWalletSettings']);
        if (!settings.trustWalletSettings?.walletCreated) {
            console.log('No wallet found - user needs to create one');
        } else {
            console.log('Trust Wallet initialized successfully');
        }
    }
}

// Initialize background service
new TrustWalletBackground();
